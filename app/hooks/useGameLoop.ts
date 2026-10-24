import { useEffect, useRef } from "react";
import { layout, isGround, isTempoBridgeActive, WORLD_WIDTH, FLOOR, EXIT_X, WORLDS, LEVEL_0_TUTORIAL_CUES, PLATES } from "@/lib/levels";
import { sounds } from "@/lib/audio";
import { POSITION_SEND_MS, SPAWN, type Player, type Room } from "@/lib/game-types";

export type Hero = { x: number; y: number; vx: number; vy: number; ground: boolean; checkpoint: number; jumpLatch: boolean; jumpBuffer: number; coyote: number; grace: number; downed: boolean; downedAt: number };
export const NEW_HERO = (): Hero => ({ x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, ground: true, checkpoint: SPAWN.x, jumpLatch: false, jumpBuffer: 0, coyote: 0, grace: 0, downed: false, downedAt: 0 });

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size?: number;
  shape?: "circle" | "spark" | "leaf" | "star";
  rotation?: number;
  vRot?: number;
};

export function useGameLoop(
  room: Room | null,
  onMove: (x: number, y: number) => void,
  onCollect: (shard: number) => void,
  onCollectOptional: (index: number) => void,
  onComplete: () => void,
  onFall: () => void,
  onCarry: () => void,
  onRescue: (targetIndex: number) => void,
  setAnnouncement: (msg: string) => void
) {
  const heroRef = useRef<Hero>(NEW_HERO());
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<Set<string>>(new Set());
  const cameraRef = useRef(0);
  const shakeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const pendingCollections = useRef<Set<number>>(new Set());
  const pendingOptionals = useRef<Set<number>>(new Set());
  const finishRef = useRef(false);
  const lastCueIdRef = useRef<string | null>(null);
  const platesStateRef = useRef<{ a: boolean; b: boolean; timeA: number; timeB: number; syncedChime: boolean }>({ a: false, b: false, timeA: 0, timeB: 0, syncedChime: false });
  const onCarryRef = useRef(onCarry);
  const onRescueRef = useRef(onRescue);

  useEffect(() => { onCarryRef.current = onCarry; }, [onCarry]);
  useEffect(() => { onRescueRef.current = onRescue; }, [onRescue]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return;
      if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyE","KeyR"].includes(event.code)) {
        event.preventDefault();
        keysRef.current.add(event.code);
      }
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => { keysRef.current.clear(); touchRef.current.clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  useEffect(() => {
    let frame: number;
    let last = 0;
    let lastSend = 0, lastCollect = 0;
    let carryLatch = false, rescueLatch = false;

    const tick = (now: number) => {
      if (document.hidden) { frame = requestAnimationFrame(tick); return; }
      const dt = Math.min(.04, (now - last) / 1000 || .016);
      last = now;

      // Decay screen shake
      if (shakeRef.current > 0) {
        shakeRef.current -= dt * 10;
        if (shakeRef.current < 0) shakeRef.current = 0;
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.shape === "leaf" ? 4 : 12; // gentle float for leaves
        if (p.vRot) p.rotation = (p.rotation || 0) + p.vRot * dt;
        p.life -= dt;
        return p.life > 0;
      });

      if (room?.phase === "active") {
        const hero = heroRef.current;
        const index = room.level ?? 0;
        const levelData = layout(index);
        const keys = keysRef.current;
        const touches = touchRef.current;

        const self = room.players[room.meIndex];
        if (hero.downed) {
          if (now - hero.downedAt > 500 && !self?.downedUntil) {
            hero.downed = false;
            hero.x = self?.x ?? SPAWN.x;
            hero.y = self?.y ?? SPAWN.y;
            hero.vx = 0;
            hero.vy = 0;
            hero.grace = now + 1500;
            setAnnouncement("Back on the trail!");
          }
          frame = requestAnimationFrame(tick);
          return;
        }

        const gamepad = typeof navigator.getGamepads === "function" ? navigator.getGamepads()[0] : null;
        const padLeft = !!gamepad && gamepad.axes[0] < -0.35;
        const padRight = !!gamepad && gamepad.axes[0] > 0.35;
        const padJump = !!gamepad?.buttons[0]?.pressed || !!gamepad?.buttons[9]?.pressed;

        const left = keys.has("ArrowLeft") || keys.has("KeyA") || touches.has("left") || padLeft;
        const right = keys.has("ArrowRight") || keys.has("KeyD") || touches.has("right") || padRight;
        const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || touches.has("jump") || padJump;
        const carry = keys.has("KeyE");
        const rescue = keys.has("KeyR");

        const twist = room.trailTwist;
        const targetVx = (Number(right) - Number(left)) * (twist === "quickstep" ? 325 : 280);
        const accel = hero.ground ? 18 : 12;
        hero.vx += (targetVx - hero.vx) * Math.min(1, dt * accel);
        if (Math.abs(hero.vx) < 1 && targetVx === 0) hero.vx = 0;

        if (jump && !hero.jumpLatch) hero.jumpBuffer = 0.12;
        hero.jumpBuffer = Math.max(0, hero.jumpBuffer - dt);
        hero.coyote = hero.ground ? 0.1 : Math.max(0, hero.coyote - dt);
        if (hero.jumpBuffer > 0 && (hero.ground || hero.coyote > 0)) {
          hero.vy = -610; hero.ground = false; hero.coyote = 0; hero.jumpBuffer = 0;
          sounds.playJump();
        }
        if (!jump && hero.vy < -240) hero.vy *= 0.88;
        hero.jumpLatch = jump;

        if (levelData.level.world === 1 && hero.ground && hero.x > 620 && hero.x < 1120) hero.x += 48 * dt;
        if (levelData.level.world === 3 && hero.x > 900 && hero.x < 1310) hero.x += 44 * dt;

        hero.x = Math.max(0, Math.min(1950, hero.x + hero.vx * dt));

        const oldBottom = hero.y + 42;
        const baseGravity = levelData.level.world === 2 && hero.x > 600 && hero.x < 1100 ? 850 : levelData.level.world === 3 && hero.x > 900 && hero.x < 1310 ? 980 : 1500;
        const gravity = baseGravity * (twist === "moon-hop" ? .72 : 1);
        hero.vy += gravity * dt;
        if (twist === "crosswind" && !hero.ground) hero.vx += Math.sin(now / 420) * 30 * dt;
        hero.y += hero.vy * dt;
        hero.ground = false;

        let landing = Infinity;
        let spring = false;
        if (isGround(hero.x + 17, levelData.gaps) && oldBottom <= FLOOR + 12 && hero.y + 42 >= FLOOR && hero.vy >= 0) {
          landing = FLOOR;
        }
        const syncLinked = room.players.some((player: Player, playerIndex: number) => {
          if (playerIndex === room.meIndex || player.active === false) return false;
          return Math.hypot(player.x - hero.x, player.y - hero.y) <= 350;
        });
        const tempoActive = syncLinked && room.relayActive && isTempoBridgeActive(levelData.tempoBridge, now / 1000);
        const collisionPlatforms = [
          ...levelData.platforms,
          ...(syncLinked ? [{ ...levelData.syncBridge, spring: false }] : []),
          ...(tempoActive ? [{ ...levelData.tempoBridge, spring: false }] : []),
        ];
        for (const platform of collisionPlatforms) {
          if (hero.x + 30 > platform.x && hero.x + 4 < platform.x + platform.w && oldBottom <= platform.y + 8 && hero.y + 42 >= platform.y && hero.vy >= 0 && platform.y < landing) {
            landing = platform.y;
            spring = platform.spring;
          }
        }

        if (landing < Infinity) {
          if (!hero.ground && hero.vy > 120 && !spring) sounds.playLand();
          hero.y = landing - 42;
          hero.vy = spring ? -730 : 0;
          if (spring) sounds.playJump();
          hero.ground = !spring;
        }

        if (hero.x > 520 && hero.checkpoint < 520) hero.checkpoint = 520;
        if (hero.x > 990 && hero.checkpoint < 990) hero.checkpoint = 990;
        if (hero.x > 1620 && hero.checkpoint < 1620) hero.checkpoint = 1620;

        if (hero.y > 545 || (now > hero.grace && levelData.hazards.some(x => Math.abs(hero.x + 17 - x) < 20 && hero.y + 42 > FLOOR - 24))) {
          hero.downed = true;
          hero.downedAt = now;
          hero.vx = 0;
          hero.vy = 0;
          sounds.playFall();
          shakeRef.current = 5;
          onFall();
          setAnnouncement("You are down! A teammate can stand nearby and press R to rescue you.");
        }

        if (carry && !carryLatch && room.crate && Math.hypot(hero.x + 17 - room.crate.x, hero.y + 22 - room.crate.y) < 80) onCarryRef.current();
        carryLatch = carry;
        const rescueTarget = room.players.findIndex((player, playerIndex) => playerIndex !== room.meIndex && player.downedUntil && Math.hypot(hero.x - player.x, hero.y - player.y) < 80);
        if (rescue && !rescueLatch && rescueTarget >= 0) onRescueRef.current(rescueTarget);
        rescueLatch = rescue;

        if (now - lastSend > POSITION_SEND_MS) {
          lastSend = now;
          onMove(Math.round(hero.x), Math.round(hero.y));
        }

        if (now - lastCollect > 220) {
          lastCollect = now;
          levelData.shards.forEach((shard, i) => {
            if ((room.collected & (1 << i)) || pendingCollections.current.has(i)) return;
            if (Math.hypot(hero.x + 17 - shard.x, hero.y + 22 - shard.y) < 46) {
              pendingCollections.current.add(i);
              onCollect(i);
              setAnnouncement("Light collected!");

              // Particle burst
              const color = WORLDS[levelData.level.world].accent;
              for(let p=0; p<15; p++) {
                particlesRef.current.push({
                  x: shard.x, y: shard.y,
                  vx: (Math.random() - 0.5) * 100,
                  vy: (Math.random() - 0.5) * 100,
                  life: 0.5 + Math.random() * 0.5,
                  maxLife: 1,
                  color
                });
              }
            }
          });

          levelData.optional?.forEach((opt, i) => {
            if ((room.optionalCollected & (1 << i)) || pendingOptionals.current.has(i)) return;
            if (Math.hypot(hero.x + 17 - opt.x, hero.y + 22 - opt.y) < 46) {
              pendingOptionals.current.add(i);
              onCollectOptional(i);
              setAnnouncement("Found a firefly!");

              // Particle burst
              for(let p=0; p<15; p++) {
                particlesRef.current.push({
                  x: opt.x, y: opt.y,
                  vx: (Math.random() - 0.5) * 100,
                  vy: (Math.random() - 0.5) * 100,
                  life: 0.5 + Math.random() * 0.5,
                  maxLife: 1,
                  color: "#fde047"
                });
              }
            }
          });
        }

        if (room.gateOpen && room.collected === 15 && !finishRef.current) {
          const finishers = room.players.filter((player: Player, index: number) => index === room.meIndex || player.active !== false);
          const ready = finishers.length >= 2 && finishers.every((player: Player) => {
            const index = room.players.indexOf(player);
            const x = index === room.meIndex ? hero.x : player.x;
            return x + 17 >= 1857 - 45;
          });
          if (ready) {
            finishRef.current = true;
            shakeRef.current = 12;
            sounds.playVictoryFanfare(levelData.level.world);
            setAnnouncement("Trail complete! Outstanding teamwork!");

            // Celebration Engine: Generates world-themed particle palettes
            const worldPalettes: Record<number, { colors: string[]; shapes: ("circle" | "spark" | "leaf" | "star")[] }> = {
              0: { colors: ["#8ce7aa", "#ffd85e", "#59d8c5", "#ffffff", "#40776d"], shapes: ["leaf", "star", "circle"] },
              1: { colors: ["#ffcf68", "#f27d79", "#ffe07a", "#ff8d82", "#ffffff"], shapes: ["spark", "circle", "star"] },
              2: { colors: ["#76c9ee", "#8cf2e4", "#ffffff", "#328e9a", "#e6fff0"], shapes: ["circle", "star", "spark"] },
              3: { colors: ["#c6a1ff", "#ffd85e", "#777db3", "#ffffff", "#e0b0ff"], shapes: ["star", "spark", "circle"] },
            };
            const theme = worldPalettes[levelData.level.world] || worldPalettes[0];

            for (let i = 0; i < 75; i++) {
              const angle = (Math.PI * 2 * i) / 75 + (Math.random() - 0.5) * 0.4;
              const speed = 80 + Math.random() * 260;
              const color = theme.colors[Math.floor(Math.random() * theme.colors.length)];
              const shape = theme.shapes[Math.floor(Math.random() * theme.shapes.length)];
              particlesRef.current.push({
                x: EXIT_X,
                y: FLOOR - 46,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                life: 1.2 + Math.random() * 0.8,
                maxLife: 2.0,
                color,
                size: 2 + Math.random() * 4,
                shape,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 8,
              });
            }
            onComplete();
          }
        }

        const logicalWidth = 960;
        const targetCam = Math.max(0, Math.min(WORLD_WIDTH - logicalWidth, hero.x - (logicalWidth * 0.35)));
        cameraRef.current += (targetCam - cameraRef.current) * 0.12;

        // Level 0 Guided Onboarding Audio/ARIA updates
        if (index === 0) {
          const cue = LEVEL_0_TUTORIAL_CUES.find(c => hero.x >= c.minX && hero.x <= c.maxX);
          if (cue && cue.id !== lastCueIdRef.current) {
            lastCueIdRef.current = cue.id;
            setAnnouncement(`${cue.title}: ${cue.subtitle}`);
          }
        }

        // Cooperative Switch Synchronization Detection
        const onA = hero.x + 17 > PLATES[0] - 26 && hero.x + 17 < PLATES[0] + 26 && hero.y > 360;
        const onB = hero.x + 17 > PLATES[1] - 26 && hero.x + 17 < PLATES[1] + 26 && hero.y > 360;
        let remoteOnA = false, remoteOnB = false;
        if (room?.players) {
          room.players.forEach((p: Player, i: number) => {
            if (i !== room.meIndex && p.active !== false) {
              if (p.x + 17 > PLATES[0] - 26 && p.x + 17 < PLATES[0] + 26 && p.y > 360) remoteOnA = true;
              if (p.x + 17 > PLATES[1] - 26 && p.x + 17 < PLATES[1] + 26 && p.y > 360) remoteOnB = true;
            }
          });
        }
        const plateAActive = onA || remoteOnA;
        const plateBActive = onB || remoteOnB;

        if (plateAActive && !platesStateRef.current.a) platesStateRef.current.timeA = now;
        if (plateBActive && !platesStateRef.current.b) platesStateRef.current.timeB = now;
        platesStateRef.current.a = plateAActive;
        platesStateRef.current.b = plateBActive;

        if (plateAActive && plateBActive && !platesStateRef.current.syncedChime) {
          const diff = Math.abs(platesStateRef.current.timeA - platesStateRef.current.timeB);
          if (diff < 2500) {
            platesStateRef.current.syncedChime = true;
            sounds.playSyncChime();
            setAnnouncement("Dual switches synchronized! Gate unlocked!");
            for (let p = 0; p < 25; p++) {
              particlesRef.current.push({
                x: 1860 + (Math.random() - 0.5) * 30,
                y: 350 + (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                life: 0.8 + Math.random() * 0.4,
                maxLife: 1.2,
                color: "#ffe07a",
                shape: "spark",
                size: 3,
              });
            }
          }
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [room, onMove, onCollect, onCollectOptional, onComplete, onFall, setAnnouncement]);

  return {
    heroRef,
    keysRef,
    touchRef,
    cameraRef,
    shakeRef,
    particlesRef,
    finishRef
  };
}
