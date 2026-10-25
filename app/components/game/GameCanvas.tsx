"use client";
import { useRef, useEffect } from "react";
import { layout, isGround, isTempoBridgeActive, WORLD_WIDTH, FLOOR, EXIT_X, WORLDS, PLATES, LEVEL_0_TUTORIAL_CUES } from "@/lib/levels";
import { PLAYER_HEIGHT, PLAYER_WIDTH, TRAIL_TWISTS, type Player, type Room } from "@/lib/game-types";
import { Hero, type Particle } from "@/app/hooks/useGameLoop";

type Props = {
  index: number;
  room: Room | null;
  heroRef: React.RefObject<Hero>;
  cameraRef: React.RefObject<number>;
  shakeRef: React.RefObject<number>;
  particlesRef: React.RefObject<Particle[]>;
  remotesRef: React.MutableRefObject<Map<number, { x: number; y: number }>>;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = Math.PI / 4 * i - Math.PI / 2; const r = i % 2 ? radius * .28 : radius; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
}
function avatar(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number, name: string, local: boolean, time: number, vx = 0, vy = 0) {
  const palette = [
    { main: "#f5b72e", dark: "#6d3527", light: "#fff0bd" },
    { main: "#ef6f78", dark: "#713442", light: "#fff0d8" },
    { main: "#49c8bd", dark: "#17495a", light: "#e6fff0" },
    { main: "#a98ae8", dark: "#41305f", light: "#fff0ff" },
  ][variant % 4];
  const moving = Math.abs(vx) > 10; const stride = moving ? Math.sin(time * 13 + variant) * 4 : 0; const bob = moving ? Math.abs(Math.sin(time * 13)) * -2 : Math.sin(time * 3 + variant) * .8;
  const airborne = Math.abs(vy) > 30; const facing = vx < -2 ? -1 : 1;
  ctx.save(); ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT + bob); ctx.scale(facing, 1);
  ctx.fillStyle = "#061a2b55"; ctx.beginPath(); ctx.ellipse(0, 1 - bob, airborne ? 13 : 19, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (local) { ctx.strokeStyle = "#fff7bbcc"; ctx.lineWidth = 2; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(0, -23, 27 + Math.sin(time * 4), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }

  ctx.fillStyle = palette.dark; ctx.beginPath(); ctx.moveTo(-9, -23); ctx.quadraticCurveTo(-24 - Math.abs(vx) * .025, -13, -21, -1); ctx.quadraticCurveTo(-7, -8, 4, -4); ctx.closePath(); ctx.fill();
  if (variant === 2) { ctx.globalAlpha = .78; ctx.fillStyle = palette.main; ctx.beginPath(); ctx.ellipse(-12, -17, 12, 22, -.55, 0, 7); ctx.ellipse(12, -17, 12, 22, .55, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = palette.dark; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-12 + stride, airborne ? -1 : -5); ctx.moveTo(7, -10); ctx.lineTo(12 - stride, airborne ? -1 : -5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-7 - stride, airborne ? -1 : 0); ctx.moveTo(6, -2); ctx.lineTo(8 + stride, airborne ? -2 : 0); ctx.stroke();
  roundRect(ctx, -13, -28, 26, 28, 11, palette.main);
  roundRect(ctx, -9, -24, 18, 18, 8, palette.light);

  if (variant === 0) {
    ctx.fillStyle = palette.main; ctx.strokeStyle = palette.dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-11, -27); ctx.quadraticCurveTo(-18, -56, -5, -45); ctx.lineTo(0, -29); ctx.moveTo(6, -29); ctx.quadraticCurveTo(14, -56, 17, -42); ctx.lineTo(11, -24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f18b74"; ctx.beginPath(); ctx.ellipse(-9, -43, 2.5, 8, -.2, 0, 7); ctx.ellipse(12, -43, 2.5, 8, .2, 0, 7); ctx.fill();
  } else if (variant === 1) {
    ctx.fillStyle = palette.main; ctx.strokeStyle = palette.dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -31, 18, Math.PI, 0); ctx.quadraticCurveTo(18, -24, 12, -21); ctx.lineTo(-12, -21); ctx.quadraticCurveTo(-18, -24, -18, -31); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffd8bd"; [-9, 2, 10].forEach((dx, i) => { ctx.beginPath(); ctx.arc(dx, -34 - (i % 2) * 6, i === 1 ? 3 : 2.3, 0, 7); ctx.fill(); });
  } else if (variant === 2) {
    ctx.strokeStyle = palette.light; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -28); ctx.quadraticCurveTo(-13, -43, -18, -39); ctx.moveTo(6, -28); ctx.quadraticCurveTo(13, -43, 18, -39); ctx.stroke();
    star(ctx, -18, -39, 3, "#fff6a8"); star(ctx, 18, -39, 3, "#fff6a8");
  } else {
    ctx.fillStyle = palette.light; [-12, -5, 3, 11].forEach((dx, i) => { ctx.beginPath(); ctx.arc(dx, -31 - (i % 2) * 3, 8, 0, 7); ctx.fill(); });
    ctx.strokeStyle = palette.dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-10, -39, 8, Math.PI * .95, Math.PI * 1.9); ctx.arc(10, -39, 8, Math.PI * 1.1, Math.PI * 2.05); ctx.stroke();
  }
  ctx.fillStyle = "#132d3a"; ctx.beginPath(); ctx.ellipse(-4, -16, 1.8, 3, 0, 0, 7); ctx.ellipse(4, -16, 1.8, 3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#a14d4b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -12, 4, .15, Math.PI - .15); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-4.5, -17, .7, 0, 7); ctx.arc(3.5, -17, .7, 0, 7); ctx.fill();
  if (name || local) { ctx.scale(facing, 1); ctx.font = "800 9px Arial"; ctx.textAlign = "center"; ctx.fillStyle = local ? "#fff4a8" : "#f6fbeb"; ctx.shadowColor = "#071927"; ctx.shadowBlur = 4; ctx.fillText(local ? "YOU" : name.slice(0, 12).toUpperCase(), 0, -58); }
  ctx.restore();
}

export default function GameCanvas({ index, room, heroRef, cameraRef, shakeRef, particlesRef, remotesRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame: number;
    const render = (now: number) => {
      const time = now / 1000;
      const { level, gaps, platforms, shards, hazards, optional, syncBridge, tempoBridge, relaySwitch, trailCrate } = layout(index);
      const world = WORLDS[level.world];
      const twist = room?.trailTwist as keyof typeof TRAIL_TWISTS | undefined;
      const scale = Number(canvas.dataset.pixelRatio || 1);
      const w = canvas.width / scale, h = canvas.height / scale;

      // Apply screen shake
      const shakeX = (Math.random() - 0.5) * shakeRef.current;
      const shakeY = (Math.random() - 0.5) * shakeRef.current;
      const camera = cameraRef.current;
      const hero = heroRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (twist === "moon-hop") {
        ctx.globalAlpha = .32;
        ctx.fillStyle = "#f8ebad";
        ctx.beginPath(); ctx.arc(w * .15, 86, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = world.sky; ctx.beginPath(); ctx.arc(w * .165, 78, 22, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (twist === "crosswind") {
        ctx.save(); ctx.globalAlpha = .22; ctx.strokeStyle = "#e6fff0"; ctx.lineWidth = 2;
        for (let gust = 0; gust < 4; gust++) { const y = 86 + gust * 52; const x = ((time * 70 + gust * 180) % (w + 180)) - 140; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 42, y - 15, x + 75, y + 15, x + 116, y); ctx.stroke(); }
        ctx.restore();
      } else if (twist === "quickstep") {
        ctx.save(); ctx.globalAlpha = .34;
        for (let spark = 0; spark < 12; spark++) star(ctx, (spark * 127 + time * 45) % w, 84 + (spark * 37) % 180, 2.5, world.accent);
        ctx.restore();
      }
      ctx.translate(shakeX, shakeY);

      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, world.sky); sky.addColorStop(.62, world.far); sky.addColorStop(1, world.ground); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * .73, 125, 10, w * .73, 125, 260); glow.addColorStop(0, "#e8ddff50"); glow.addColorStop(.35, `${world.accent}20`); glow.addColorStop(1, "#e9f2c200"); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e8ddff"; ctx.shadowColor = world.accent; ctx.shadowBlur = 28; ctx.beginPath(); ctx.arc(w * .73, 125, 24, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#120d20";
      for (let bat = 0; bat < 7; bat++) { const bx = (bat * 113 + time * (12 + bat % 3 * 4)) % (w + 60) - 30, by = 70 + (bat * 37) % 120 + Math.sin(time * 3 + bat) * 6; ctx.beginPath(); ctx.moveTo(bx - 9, by); ctx.quadraticCurveTo(bx - 4, by - 7, bx, by); ctx.quadraticCurveTo(bx + 5, by - 7, bx + 10, by); ctx.quadraticCurveTo(bx + 4, by + 3, bx, by + 5); ctx.quadraticCurveTo(bx - 4, by + 3, bx - 9, by); ctx.fill(); }
      ctx.globalAlpha = .12; ctx.fillStyle = world.accent; ctx.beginPath(); ctx.ellipse(w * .2, 165, 250, 74, -.18, 0, 7); ctx.ellipse(w * .86, 300, 310, 85, .12, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for(let i=0;i<48;i++){ctx.globalAlpha=.25+(Math.sin(time*.6+i)+1)*.18;ctx.fillStyle=world.accent;ctx.beginPath();ctx.arc(((i*173-camera*.12)%w+w)%w,42+(i*61)%310, i%4===0?1.8:1,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      ctx.save(); ctx.translate(-camera * .23, 0);
      for (let i = -1; i < 14; i++) {
        const x = i * 250 + (i % 3) * 42;
        ctx.fillStyle = world.far; ctx.globalAlpha = .32;
        ctx.beginPath(); ctx.moveTo(x - 165, 430); ctx.quadraticCurveTo(x - 110, 260 - (i % 3) * 35, x - 25, 320); ctx.quadraticCurveTo(x + 65, 190 + (i % 2) * 40, x + 175, 430); ctx.closePath(); ctx.fill();
        if (level.world === 3) { ctx.fillStyle = "#fff"; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(x + 60, 115 + (i % 3) * 34, 50, 16, 0, 0, 7); ctx.fill(); }
      }
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(-camera * .38, 0);
      for (let i = 0; i < 12; i++) {
        const x = i * 230 + 70, bob = Math.sin(time * .8 + i) * 8;
        if (level.world === 0) {
          ctx.strokeStyle = "#20795788"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, 430); ctx.quadraticCurveTo(x - 40, 190, x + 30, 120); ctx.stroke();
          ctx.fillStyle = "#fff36eaa"; ctx.beginPath(); ctx.arc(x + 60, 220 + bob, 6, 0, 7); ctx.fill();
        } else if (level.world === 1) {
          ctx.strokeStyle = "#7d395899"; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(x, 298, 58, 0, 7); ctx.stroke();
          for (let spoke = 0; spoke < 8; spoke++) { const angle = spoke * Math.PI / 4 + time * .12; ctx.beginPath(); ctx.moveTo(x, 298); ctx.lineTo(x + Math.cos(angle) * 58, 298 + Math.sin(angle) * 58); ctx.stroke(); }
          ctx.fillStyle = "#ffe07aaa"; ctx.beginPath(); ctx.moveTo(x - 90, 110); ctx.lineTo(x - 35, 136); ctx.lineTo(x - 90, 150); ctx.fill();
        } else if (level.world === 2) {
          ctx.fillStyle = "#e4ffff77"; for (let bubble = 0; bubble < 4; bubble++) { ctx.beginPath(); ctx.arc(x + bubble * 25, 330 - bubble * 45 + bob, 5 + bubble * 2, 0, 7); ctx.fill(); }
          ctx.strokeStyle = "#297b9299"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, 430); ctx.bezierCurveTo(x - 35, 320, x + 30, 300, x + 5, 210); ctx.stroke();
        } else {
          ctx.fillStyle = "#fff9"; for (let star = 0; star < 3; star++) { const sx = x + star * 38, sy = 100 + star * 45 + bob; ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx + 3, sy - 3); ctx.lineTo(sx + 8, sy); ctx.lineTo(sx + 3, sy + 3); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 3, sy - 3); ctx.lineTo(sx - 8, sy); ctx.lineTo(sx - 3, sy - 3); ctx.fill(); }
          ctx.fillStyle = "#ffffff77"; ctx.beginPath(); ctx.ellipse(x + 40, 360, 80, 19, 0, 0, 7); ctx.fill();
        }
      }
      ctx.restore();
      ctx.save(); ctx.translate(-camera * .57, 0);
      for (let i = -1; i < 21; i++) {
        const x = i * 135;
        ctx.fillStyle = world.near; ctx.globalAlpha = .36;
        if (level.world === 0) { ctx.fillRect(x + 38, 240, 14, 195); ctx.beginPath(); ctx.arc(x + 45, 238, 54, 0, 7); ctx.fill(); }
        else if (level.world === 1) { ctx.beginPath(); ctx.arc(x + 35, 340, 48, 0, 7); ctx.fill(); ctx.fillRect(x + 30, 205, 10, 230); }
        else if (level.world === 2) { ctx.beginPath(); ctx.moveTo(x, 430); ctx.quadraticCurveTo(x + 40, 225, x + 70, 430); ctx.fill(); }
        else { ctx.fillRect(x + 15, 275, 68, 160); ctx.beginPath(); ctx.moveTo(x + 15, 275); ctx.lineTo(x + 49, 225); ctx.lineTo(x + 83, 275); ctx.fill(); }
      }
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.save();
      const fog = ctx.createLinearGradient(0, h * .45, 0, h); fog.addColorStop(0, "#b8a8d818"); fog.addColorStop(.55, `${world.accent}12`); fog.addColorStop(1, "#07040d38"); ctx.fillStyle = fog;
      for (let bank = 0; bank < 5; bank++) { const fx = ((bank * 240 - time * (16 + bank * 3)) % (w + 380)) - 180; ctx.globalAlpha = .25; ctx.beginPath(); ctx.ellipse(fx, 370 + bank * 21, 210, 28, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
      ctx.save(); ctx.translate(-camera, 0);
      for (let x = 0; x < WORLD_WIDTH; x += 20) if (isGround(x + 10, gaps)) {
        ctx.fillStyle = world.ground; ctx.fillRect(x, FLOOR, 21, h - FLOOR);
        ctx.fillStyle = world.near; ctx.fillRect(x, FLOOR, 21, 9);
        ctx.fillStyle = "#c6e7a54d"; ctx.fillRect(x, FLOOR, 21, 2);
        ctx.fillStyle = "#00000020"; ctx.fillRect(x + 5, FLOOR + 19 + (x % 3) * 9, 10, 4);
        ctx.strokeStyle = world.near; ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+6,FLOOR);ctx.lineTo(x+3,FLOOR-7);ctx.moveTo(x+10,FLOOR);ctx.lineTo(x+13,FLOOR-10);ctx.stroke();
      }
      const hauntedVignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .18, w / 2, h / 2, Math.max(w, h) * .72); hauntedVignette.addColorStop(0, "#00000000"); hauntedVignette.addColorStop(1, "#03010875"); ctx.fillStyle = hauntedVignette; ctx.fillRect(camera, 0, w, h);
      for(let i=0;i<34;i++){
        const x=50+i*59;if(!isGround(x,gaps))continue;
        ctx.strokeStyle=world.near;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.quadraticCurveTo(x-8,FLOOR-18,x-4,FLOOR-27);ctx.moveTo(x,FLOOR-8);ctx.quadraticCurveTo(x+9,FLOOR-29,x+13,FLOOR-21);ctx.stroke();
        if(i%3===0){ctx.fillStyle="#b8d0a1";ctx.fillRect(x+19,FLOOR-15,3,15);ctx.fillStyle=level.world===1?"#d69d72":"#88b995";ctx.beginPath();ctx.ellipse(x+20,FLOOR-16,9,5,0,Math.PI,Math.PI*2);ctx.fill();}
      }
      for (const platform of platforms) {
        ctx.fillStyle = "#101f30"; ctx.beginPath(); ctx.moveTo(platform.x + 5, platform.y); ctx.quadraticCurveTo(platform.x + platform.w / 2, platform.y - 7, platform.x + platform.w - 4, platform.y); ctx.lineTo(platform.x + platform.w - 12, platform.y + 25); ctx.quadraticCurveTo(platform.x + platform.w * .55, platform.y + 17, platform.x + 15, platform.y + 27); ctx.closePath(); ctx.fill();
        ctx.fillStyle = platform.spring ? world.accent : world.near; ctx.beginPath(); ctx.ellipse(platform.x + platform.w / 2, platform.y + 2, platform.w / 2, 8, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = .3; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(platform.x + platform.w / 2, platform.y, platform.w * .36, 2, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        for (let root = 0; root < 3; root++) { const rx = platform.x + 18 + root * (platform.w - 36) / 2; ctx.strokeStyle = "#0b1726"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, platform.y + 15); ctx.quadraticCurveTo(rx + (root - 1) * 8, platform.y + 28, rx - 4, platform.y + 35 + root * 3); ctx.stroke(); }
        if (platform.spring) { star(ctx, platform.x + platform.w / 2, platform.y + 3, 7, "#fff8c4"); }
      }
      const syncLinked = !!room?.players?.some((player: Player, playerIndex: number) => {
        if (playerIndex === room.meIndex || player.active === false) return false;
        const remotePos = remotesRef.current.get(playerIndex) || player;
        return Math.hypot(remotePos.x - hero.x, remotePos.y - hero.y) <= 350;
      });
      ctx.save();
      ctx.globalAlpha = syncLinked ? .95 : .2;
      ctx.shadowColor = world.accent;
      ctx.shadowBlur = syncLinked ? 18 : 0;
      ctx.fillStyle = syncLinked ? world.accent : "#a4b9c0";
      ctx.beginPath();
      ctx.moveTo(syncBridge.x + 5, syncBridge.y);
      ctx.quadraticCurveTo(syncBridge.x + syncBridge.w / 2, syncBridge.y - 9, syncBridge.x + syncBridge.w - 5, syncBridge.y);
      ctx.lineTo(syncBridge.x + syncBridge.w - 12, syncBridge.y + 18);
      ctx.quadraticCurveTo(syncBridge.x + syncBridge.w / 2, syncBridge.y + 12, syncBridge.x + 12, syncBridge.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = syncLinked ? .75 : .3;
      ctx.fillStyle = "#ffffff";
      for (let rune = 0; rune < 6; rune++) star(ctx, syncBridge.x + 15 + rune * ((syncBridge.w - 30) / 5), syncBridge.y + 1, 3, "#ffffff");
      ctx.restore();
      ctx.fillStyle = syncLinked ? "#fff4b5" : "#c1d0d2";
      ctx.font = "800 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText(syncLinked ? "SYNC BRIDGE" : "LINK TO REVEAL", syncBridge.x + syncBridge.w / 2, syncBridge.y - 13);
      const tempoActive = syncLinked && !!room?.relayActive && isTempoBridgeActive(tempoBridge, time);
      const tempoPulse = (time % tempoBridge.period) / tempoBridge.period;
      ctx.save();
      ctx.globalAlpha = tempoActive ? .95 : .18;
      ctx.shadowColor = world.accent;
      ctx.shadowBlur = tempoActive ? 16 : 0;
      ctx.fillStyle = tempoActive ? world.accent : "#a4b9c0";
      ctx.beginPath();
      ctx.moveTo(tempoBridge.x + 4, tempoBridge.y);
      ctx.quadraticCurveTo(tempoBridge.x + tempoBridge.w / 2, tempoBridge.y - 7, tempoBridge.x + tempoBridge.w - 4, tempoBridge.y);
      ctx.lineTo(tempoBridge.x + tempoBridge.w - 10, tempoBridge.y + 16);
      ctx.quadraticCurveTo(tempoBridge.x + tempoBridge.w / 2, tempoBridge.y + 11, tempoBridge.x + 10, tempoBridge.y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = tempoActive ? .95 : .35;
      for (let beat = 0; beat < 4; beat++) {
        const size = 3 + Math.max(0, 1 - Math.abs(tempoPulse - beat / 4) * 8) * 2;
        star(ctx, tempoBridge.x + 16 + beat * ((tempoBridge.w - 32) / 3), tempoBridge.y + 1, size, "#ffffff");
      }
      ctx.restore();
      ctx.fillStyle = tempoActive ? "#fff4b5" : "#c1d0d2";
      ctx.font = "800 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText(tempoActive ? "HARMONY STEP · GO!" : !room?.relayActive ? "HARMONY STEP · HOLD RELAY" : syncLinked ? "HARMONY STEP · WAIT FOR BEAT" : "HARMONY STEP · LINK UP", tempoBridge.x + tempoBridge.w / 2, tempoBridge.y - 13);
      for (const x of hazards) {
        const wobble = Math.sin(time * 3 + x) * 2; ctx.save(); ctx.translate(x, FLOOR - 10 + wobble);
        ctx.fillStyle = "#101b2e"; ctx.strokeStyle = world.accent; ctx.lineWidth = 2;
        if (level.world === 1) { ctx.rotate(time * .7); ctx.beginPath(); for (let tooth = 0; tooth < 16; tooth++) { const a = tooth * Math.PI / 8, r = tooth % 2 ? 13 : 21; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (tooth) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = world.accent; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); }
        else if (level.world === 2) { ctx.beginPath(); for (let spike = 0; spike < 20; spike++) { const a = spike * Math.PI / 10, r = spike % 2 ? 13 : 23; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (spike) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#f2e4af"; ctx.beginPath(); ctx.arc(-5, -2, 2, 0, 7); ctx.arc(5, -2, 2, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(-21, 10); ctx.quadraticCurveTo(-12, -15, -6, 5); ctx.quadraticCurveTo(1, -25, 7, 5); ctx.quadraticCurveTo(14, -18, 21, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      }
      shards.forEach((shard, i) => { if (room && (room.collected & (1 << i))) return;
        const pulse = Math.sin(time * 4 + i) * 3;
        ctx.save(); ctx.shadowColor=world.accent;ctx.shadowBlur=22; ctx.translate(shard.x, shard.y + pulse); ctx.fillStyle = "#fff9d9"; ctx.globalAlpha = .72; ctx.beginPath(); ctx.ellipse(-11, 0, 10, 5, -.5, 0, 7); ctx.ellipse(11, 0, 10, 5, .5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; star(ctx, 0, 0, 11, world.accent); star(ctx, 0, 0, 5, "#fffde7"); ctx.restore();
      });

      // Render Optional Collectibles
      optional?.forEach((opt, i) => {
        if (room && (room.optionalCollected & (1 << i))) return;
        const pulse = Math.sin(time * 3 + i) * 4;
        ctx.save();
        ctx.translate(opt.x, opt.y + pulse);
        ctx.fillStyle = "#fde047";
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const crate = room?.crate || { ...trailCrate, carrier: undefined };
      ctx.save();
      ctx.translate(crate.x, crate.y);
      ctx.fillStyle = "#74472d";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeStyle = "#ffd980";
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
      ctx.fillStyle = "#fff0b5"; ctx.font = "800 8px Arial"; ctx.textAlign = "center";
      ctx.fillText(crate.carrier === undefined ? "TRAIL CRATE · E" : "CARRIED", 0, -20);
      ctx.restore();

      const relayHeld = !!room?.relayActive;
      roundRect(ctx, relaySwitch.x - 24, FLOOR - 8, 48, 8, 3, relayHeld ? world.accent : "#b9c2cf");
      ctx.fillStyle = relayHeld ? "#fff4b5" : "#c1d0d2"; ctx.font = "700 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(relayHeld ? "RELAY HELD" : "RELAY", relaySwitch.x, FLOOR - 18);

      PLATES.forEach((x, i) => {
        const on = !!room?.gateOpen || !!room?.players.some((p: Player) => p.active !== false && p.x + 17 > x - 26 && p.x + 17 < x + 26 && p.y > 360);
        roundRect(ctx, x - 26, FLOOR - 8, 52, 8, 3, on ? world.accent : "#b9c2cf");
        ctx.fillStyle = "#e9f0ce"; ctx.font = "700 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(i === 0 ? "A" : "B", x, FLOOR - 17);
      });
      if (!room?.gateOpen) { roundRect(ctx, 1857, 276, 23, 154, 8, "#182333"); roundRect(ctx, 1862, 282, 13, 138, 6, world.accent); ctx.fillStyle="#e9f0ce"; ctx.font="700 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("GATE", 1868, 260); }
      else { ctx.fillStyle=world.accent; ctx.globalAlpha=.28; ctx.fillRect(1846, 270, 45, 165); ctx.globalAlpha=1; ctx.fillStyle="#e9f0ce"; ctx.font="800 11px sans-serif"; ctx.textAlign="center"; ctx.fillText("OPEN", 1868, 260); }
      ctx.strokeStyle = "#10182b"; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(EXIT_X, FLOOR - 46, 37, 58, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = world.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(EXIT_X, FLOOR - 46, 37, 58, 0, 0, 7); ctx.stroke();
      const portal = ctx.createRadialGradient(EXIT_X, FLOOR - 46, 2, EXIT_X, FLOOR - 46, 48); portal.addColorStop(0, "#ffffff"); portal.addColorStop(.5, room?.gateOpen ? world.accent : "#718197"); portal.addColorStop(1, "#16253c"); ctx.fillStyle = portal; ctx.globalAlpha = room?.gateOpen ? .76 + Math.sin(time * 4) * .18 : .75; ctx.beginPath(); ctx.ellipse(EXIT_X, FLOOR - 46, 28, 48, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      for (let rune = 0; rune < 7; rune++) star(ctx, EXIT_X + Math.cos(time * .25 + rune) * 43, FLOOR - 46 + Math.sin(time * .25 + rune) * 64, 3, world.accent);
      ctx.fillStyle = "#f8f3d2"; ctx.font = "800 11px Arial"; ctx.textAlign = "center"; ctx.fillText("ALL TOGETHER", EXIT_X, FLOOR - 119);

      // Render The Sync Link Tether
      if (room && room.phase === "active") {
        room.players.forEach((player: Player, i: number) => {
          if (i === room.meIndex || player.active === false) return;
          const remotePos = remotesRef.current.get(i) || { x: player.x, y: player.y };
          const p1x = hero.x + PLAYER_WIDTH / 2;
          const p1y = hero.y + PLAYER_HEIGHT / 2;
          const p2x = remotePos.x + PLAYER_WIDTH / 2;
          const p2y = remotePos.y + PLAYER_HEIGHT / 2;
          const dist = Math.hypot(p2x - p1x, p2y - p1y);
          const maxDist = 350;

          if (dist < maxDist) {
            const intensity = Math.pow(1 - dist / maxDist, 0.7);
            const midX = (p1x + p2x) / 2;
            const midY = (p1y + p2y) / 2 - 25 * intensity + Math.sin(time * 6 + i) * 8;

            ctx.save();
            // Outer dynamic synergy glow
            ctx.shadowColor = world.accent;
            ctx.shadowBlur = 12 * intensity;
            ctx.strokeStyle = world.accent;
            ctx.globalAlpha = 0.45 * intensity;
            ctx.lineWidth = 4 * intensity;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(midX, midY, p2x, p2y);
            ctx.stroke();

            // Inner energetic core line
            ctx.strokeStyle = "#ffffff";
            ctx.globalAlpha = 0.85 * intensity;
            ctx.lineWidth = 1.5 * intensity;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(midX, midY, p2x, p2y);
            ctx.stroke();

            // Luminous pulsing energy spark flowing along tether
            const t = (time * 1.8 + i * 0.3) % 1;
            const sparkX = (1 - t) * (1 - t) * p1x + 2 * (1 - t) * t * midX + t * t * p2x;
            const sparkY = (1 - t) * (1 - t) * p1y + 2 * (1 - t) * t * midY + t * t * p2y;
            star(ctx, sparkX, sparkY, 3.5 * intensity, "#ffffff");
            ctx.restore();
          }
        });
      }

      if (room) room.players.forEach((player: Player, i: number) => {
        const local = i === room.meIndex;
        if (local) avatar(ctx, hero.x, hero.y, player.avatar ?? i, player.name, true, time, hero.vx, hero.vy);
        else {
          const prev = remotesRef.current.get(i) || { x: player.x, y: player.y };
          const oldX = prev.x;
          prev.x += (player.x - prev.x) * .22;
          prev.y += (player.y - prev.y) * .22;
          remotesRef.current.set(i, prev);
          avatar(ctx, prev.x, prev.y, player.avatar ?? i, player.name, false, time, (prev.x - oldX) * 30, player.y - prev.y);
        }
      });
      else avatar(ctx, 96, 388, 0, "", true, time);
      ctx.restore();

      // Render Particles
      particlesRef.current?.forEach((p: Particle) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.translate(p.x - camera, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        const sz = p.size || 2;

        if (p.shape === "star") {
          star(ctx, 0, 0, sz * 1.5, p.color);
        } else if (p.shape === "leaf") {
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * 1.6, sz * 0.8, 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "spark") {
          ctx.beginPath();
          ctx.moveTo(-sz * 1.5, 0); ctx.lineTo(sz * 1.5, 0);
          ctx.moveTo(0, -sz * 1.5); ctx.lineTo(0, sz * 1.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, sz, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (room && room.phase === "active") {
        room.players.forEach((player: Player, i: number) => {
          if (i === room.meIndex) return;
          const remotePos = remotesRef.current.get(i) || { x: player.x, y: player.y };
          const isOffLeft = remotePos.x < camera + 20;
          const isOffRight = remotePos.x > camera + (canvas.width / Number(canvas.dataset.pixelRatio || 1)) - 20;
          if (isOffLeft || isOffRight) {
            const indX = isOffLeft ? 28 : (canvas.width / Number(canvas.dataset.pixelRatio || 1)) - 28;
            const indY = Math.max(48, Math.min((canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 48, remotePos.y - 10));
            const playerColor = ["#fff172", "#ff8fb0", "#8cf2e4", "#c6a1ff"][i % 4];
            ctx.save();
            ctx.fillStyle = "#0c1b2cd9";
            ctx.strokeStyle = playerColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(isOffLeft ? indX - 16 : indX - 44, indY - 14, 60, 28, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = playerColor;
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            const dist = Math.abs(Math.round((remotePos.x - hero.x) / 20));
            ctx.fillText(`${isOffLeft ? "◀" : ""} ${player.name.slice(0, 4)} ${isOffRight ? "▶" : ""}`, isOffLeft ? indX + 14 : indX - 14, indY + 1);
            ctx.font = "9px sans-serif";
            ctx.fillStyle = "#ccd6cf";
            ctx.fillText(`${dist}m`, isOffLeft ? indX + 14 : indX - 14, indY + 11);
            ctx.restore();
          }
        });
      }

      ctx.save(); ctx.globalAlpha = .48; ctx.fillStyle = "#071826";
      ctx.beginPath(); ctx.ellipse(-18, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 34, 110, 54, -.3, 0, 7); ctx.ellipse((canvas.width / Number(canvas.dataset.pixelRatio || 1)) + 20, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 26, 135, 62, .25, 0, 7); ctx.fill();
      ctx.strokeStyle = "#0b2230"; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-12, (canvas.height / Number(canvas.dataset.pixelRatio || 1))); ctx.quadraticCurveTo(35, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 120, 8, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 200); ctx.moveTo((canvas.width / Number(canvas.dataset.pixelRatio || 1)) + 10, (canvas.height / Number(canvas.dataset.pixelRatio || 1))); ctx.quadraticCurveTo((canvas.width / Number(canvas.dataset.pixelRatio || 1)) - 50, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 90, (canvas.width / Number(canvas.dataset.pixelRatio || 1)) - 18, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) - 160); ctx.stroke(); ctx.restore();
      const vignette = ctx.createRadialGradient((canvas.width / Number(canvas.dataset.pixelRatio || 1)) / 2, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) * .46, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) * .22, (canvas.width / Number(canvas.dataset.pixelRatio || 1)) / 2, (canvas.height / Number(canvas.dataset.pixelRatio || 1)) * .5, (canvas.width / Number(canvas.dataset.pixelRatio || 1)) * .72); vignette.addColorStop(.5, "#0000"); vignette.addColorStop(1, "#02071270"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width / Number(canvas.dataset.pixelRatio || 1), canvas.height / Number(canvas.dataset.pixelRatio || 1));
      const progress = Math.max(0, Math.min(1, hero.x / EXIT_X));
      roundRect(ctx, 20, 18, 170, 10, 5, "#08152699"); roundRect(ctx, 20, 18, Math.max(6, 170 * progress), 10, 5, world.accent); star(ctx, 20 + 170 * progress, 23, 7, "#fff9ce");
      if (twist) {
        ctx.fillStyle = "#071b29d9"; ctx.strokeStyle = world.accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(w - 190, 18, 170, 28, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = world.accent; ctx.font = "800 10px Arial"; ctx.textAlign = "center";
        ctx.fillText(`${TRAIL_TWISTS[twist].icon} TRAIL TWIST · ${TRAIL_TWISTS[twist].label}`, w - 105, 36);
      }

      // Render Level 0 Guided Onboarding Cues
      if (index === 0 && room && room.phase === "active") {
        const activeCue = LEVEL_0_TUTORIAL_CUES.find(c => hero.x >= c.minX && hero.x <= c.maxX);
        if (activeCue) {
          const viewW = canvas.width / Number(canvas.dataset.pixelRatio || 1);
          const bannerW = Math.min(420, viewW - 40);
          const bannerX = (viewW - bannerW) / 2;
          const bannerY = 18;

          ctx.save();
          ctx.fillStyle = "#071b29f0";
          ctx.strokeStyle = world.accent;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = world.accent;
          ctx.shadowBlur = 10;
          roundRect(ctx, bannerX, bannerY, bannerW, 42, 12, "#071b29f0");
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = world.accent;
          ctx.font = "bold 11px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(activeCue.title, bannerX + bannerW / 2, bannerY + 16);

          ctx.fillStyle = "#f8eed3";
          ctx.font = "10px Arial, sans-serif";
          ctx.fillText(activeCue.subtitle, bannerX + bannerW / 2, bannerY + 31);
          ctx.restore();
        }
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [index, room, cameraRef, heroRef, particlesRef, remotesRef, shakeRef]);

  return <canvas ref={canvasRef} width={960} height={540} data-pixel-ratio={1} aria-label="Side-scrolling platform level" />;
}
