"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EXIT_X, FLOOR, isGround, layout, LEVELS, PLATES, WORLD_WIDTH, WORLDS } from "../lib/levels";

type Player = { name: string; x: number; y: number; color: number; isHost: boolean };
type Room = { code: string; phase: "lobby" | "active" | "finished"; level: number; unlocked: number; run: number; collected: number; gateOpen: boolean; isHost: boolean; meIndex: number; playerCount: number; players: Player[] };
type Session = { code: string; token: string };
type Hero = { x: number; y: number; vx: number; vy: number; ground: boolean; checkpoint: number; jumpLatch: boolean; grace: number };
const NEW_HERO = (): Hero => ({ x: 80, y: 388, vx: 0, vy: 0, ground: true, checkpoint: 80, jumpLatch: false, grace: 0 });
const COLORS = ["#fff172", "#ff8fb0", "#8cf2e4", "#c6a1ff"];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function avatar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string, local: boolean) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#182333"; ctx.beginPath(); ctx.ellipse(17, 37, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, 4, 4, 28, 33, 13, "#182333"); roundRect(ctx, 7, 6, 22, 26, 10, color);
  ctx.fillStyle = "#182333"; ctx.beginPath(); ctx.arc(14, 17, 2.3, 0, 7); ctx.arc(23, 17, 2.3, 0, 7); ctx.fill();
  ctx.strokeStyle = "#182333"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(18, 20, 6, .1, Math.PI - .1); ctx.stroke();
  roundRect(ctx, 2, 32, 12, 7, 4, "#182333"); roundRect(ctx, 22, 32, 12, 7, 4, "#182333");
  ctx.font = "700 12px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#152237"; ctx.fillText(local ? "YOU" : name.slice(0, 12), 17, -8);
  ctx.restore();
}
function paint(ctx: CanvasRenderingContext2D, index: number, room: Room | null, hero: Hero, remotes: Map<number, {x:number;y:number}>, time: number) {
  const { level, gaps, platforms, shards, hazards } = layout(index); const world = WORLDS[level.world];
  const w = ctx.canvas.width, h = ctx.canvas.height; const camera = clamp(hero.x - 310, 0, WORLD_WIDTH - w);
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = world.sky; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(-camera * .23, 0);
  for (let i = -1; i < 14; i++) {
    const x = i * 250 + (i % 3) * 42;
    ctx.fillStyle = world.far; ctx.globalAlpha = .32;
    ctx.beginPath(); ctx.arc(x, 390, 135 + (i % 3) * 20, Math.PI, 0); ctx.lineTo(x + 155, 430); ctx.lineTo(x - 155, 430); ctx.fill();
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
      ctx.fillStyle = "#fff9"; for (let star = 0; star < 3; star++) { const sx = x + star * 38, sy = 100 + star * 45 + bob; ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx + 3, sy - 3); ctx.lineTo(sx + 8, sy); ctx.lineTo(sx + 3, sy + 3); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 3, sy + 3); ctx.lineTo(sx - 8, sy); ctx.lineTo(sx - 3, sy - 3); ctx.fill(); }
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
  ctx.save(); ctx.translate(-camera, 0);
  for (let x = 0; x < WORLD_WIDTH; x += 20) if (isGround(x + 10, gaps)) {
    ctx.fillStyle = world.ground; ctx.fillRect(x, FLOOR, 21, h - FLOOR);
    ctx.fillStyle = world.near; ctx.fillRect(x, FLOOR, 21, 12);
  }
  for (const platform of platforms) {
    roundRect(ctx, platform.x, platform.y, platform.w, 18, 8, "#192a3b");
    roundRect(ctx, platform.x + 3, platform.y + 2, platform.w - 6, 9, 6, platform.spring ? world.accent : world.near);
    if (platform.spring) { ctx.fillStyle = "#192a3b"; ctx.font = "bold 14px sans-serif"; ctx.fillText("✦", platform.x + platform.w / 2, platform.y + 14); }
  }
  for (const x of hazards) {
    ctx.fillStyle = "#182333"; ctx.beginPath(); ctx.moveTo(x - 19, FLOOR); ctx.lineTo(x - 8, FLOOR - 25); ctx.lineTo(x, FLOOR - 6); ctx.lineTo(x + 9, FLOOR - 31); ctx.lineTo(x + 21, FLOOR); ctx.fill();
    ctx.fillStyle = world.accent; ctx.beginPath(); ctx.arc(x, FLOOR - 8, 3, 0, 7); ctx.fill();
  }
  shards.forEach((shard, i) => { if (room && (room.collected & (1 << i))) return;
    const pulse = Math.sin(time * 4 + i) * 3;
    ctx.save(); ctx.translate(shard.x, shard.y + pulse); ctx.rotate(Math.PI / 4); roundRect(ctx, -13, -13, 26, 26, 5, "#fff"); roundRect(ctx, -9, -9, 18, 18, 3, world.accent); ctx.restore();
  });
  PLATES.forEach((x, i) => {
    const on = !!room?.gateOpen || !!room?.players.some(p => p.x + 17 > x - 26 && p.x + 17 < x + 26 && p.y > 360);
    roundRect(ctx, x - 26, FLOOR - 8, 52, 8, 3, on ? world.accent : "#b9c2cf");
    ctx.fillStyle = "#162334"; ctx.font = "700 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(i === 0 ? "A" : "B", x, FLOOR - 17);
  });
  if (!room?.gateOpen) { roundRect(ctx, 1857, 276, 23, 154, 8, "#182333"); roundRect(ctx, 1862, 282, 13, 138, 6, world.accent); }
  ctx.fillStyle = "#182333"; ctx.beginPath(); ctx.ellipse(EXIT_X, FLOOR - 46, 36, 56, 0, 0, 7); ctx.fill();
  ctx.fillStyle = room?.gateOpen ? "#b6fff2" : "#9ba8bd"; ctx.beginPath(); ctx.ellipse(EXIT_X, FLOOR - 46, 27, 47, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#182333"; ctx.font = "800 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText("EXIT", EXIT_X, FLOOR - 114);
  if (room) room.players.forEach((player, i) => {
    const local = i === room.meIndex;
    if (local) avatar(ctx, hero.x, hero.y, COLORS[i % COLORS.length], player.name, true);
    else { const prev = remotes.get(i) || { x: player.x, y: player.y }; prev.x += (player.x - prev.x) * .18; prev.y += (player.y - prev.y) * .18; remotes.set(i, prev); avatar(ctx, prev.x, prev.y, COLORS[i % COLORS.length], player.name, false); }
  });
  else avatar(ctx, 96, 388, COLORS[0], "", true);
  ctx.restore();
  const progress = clamp(hero.x / EXIT_X, 0, 1);
  roundRect(ctx, 18, 18, 160, 9, 5, "#20324877"); roundRect(ctx, 18, 18, Math.max(4, 160 * progress), 9, 5, world.accent);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<Room | null>(null); const sessionRef = useRef<Session | null>(null);
  const heroRef = useRef<Hero>(NEW_HERO()); const keysRef = useRef<Set<string>>(new Set()); const touchRef = useRef<Set<string>>(new Set());
  const remotesRef = useRef<Map<number,{x:number;y:number}>>(new Map()); const pendingRef = useRef<Set<number>>(new Set());
  const finishRef = useRef(false); const runRef = useRef(-1); const pollingRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null); const [state, setState] = useState<Room | null>(null);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const refresh = useCallback(async (current: Session) => {
    if (pollingRef.current) return; pollingRef.current = true;
    try {
      const response = await fetch(`/api/trails?code=${encodeURIComponent(current.code)}`, { cache: "no-store", headers: { "X-Trail-Token": current.token } });
      const data = await response.json() as Room & { error?: string };
      if (!response.ok) throw Error(data.error || "Room unavailable");
      setState(data); setError("");
    } catch (problem) { setError((problem as Error).message); }
    finally { pollingRef.current = false; }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const invite = new URL(location.href).searchParams.get("room")?.toUpperCase() || "";
      const savedName = localStorage.getItem("tandem-name") || ""; setName(savedName); setCode(invite);
      try { const saved = JSON.parse(localStorage.getItem("tandem-session") || "null") as Session | null;
        if (saved?.code && saved?.token && (!invite || invite === saved.code)) setSession(saved);
      } catch { localStorage.removeItem("tandem-session"); }
    });
  }, []);
  useEffect(() => { if (!session) return; queueMicrotask(() => void refresh(session)); const timer = setInterval(() => void refresh(session), 220); return () => clearInterval(timer); }, [session, refresh]);
  useEffect(() => {
    if (state?.phase === "active" && state.run !== runRef.current) { runRef.current = state.run; heroRef.current = NEW_HERO(); remotesRef.current.clear(); pendingRef.current.clear(); finishRef.current = false; queueMicrotask(() => setNotice(`LEVEL ${state.level + 1} · GO!`)); }
    if (state?.phase === "finished") { finishRef.current = false; queueMicrotask(() => setSelected(state.level < 15 ? state.level + 1 : 0)); }
  }, [state?.phase, state?.run, state?.level]);
  const action = useCallback(async (kind: string, extra: Record<string, unknown> = {}) => {
    const current = sessionRef.current;
    const response = await fetch("/api/trails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: kind, ...current, ...extra }) });
    const data = await response.json() as (Room & { error?: string; token?: string; left?: boolean });
    if (!response.ok) throw Error(data.error || "Please try again");
    if (data.phase) { setState(data); stateRef.current = data; }
    return data;
  }, []);
  const enter = async (kind: "create" | "join") => {
    if (!name.trim()) { setError("Enter your name first."); return; }
    setBusy(true); setError("");
    try { const data = await action(kind, { name: name.trim(), code }); if (!data.token || !data.code) throw Error("Room did not open");
      const next = { code: data.code, token: data.token }; localStorage.setItem("tandem-session", JSON.stringify(next)); localStorage.setItem("tandem-name", name.trim());
      history.replaceState(null, "", `?room=${data.code}`); setSession(next); sessionRef.current = next; await refresh(next);
    } catch (problem) { setError((problem as Error).message); } finally { setBusy(false); }
  };
  const doAction = async (kind: string, extra: Record<string, unknown> = {}) => { setBusy(true); setError(""); try { await action(kind, extra); } catch (problem) { setError((problem as Error).message); } finally { setBusy(false); } };
  const leave = async () => { try { await action("leave"); localStorage.removeItem("tandem-session"); history.replaceState(null, "", location.pathname); setSession(null); setState(null); setCode(""); runRef.current = -1; } catch (problem) { setError((problem as Error).message); } };
  const share = async () => { if (!session) return; try { await navigator.clipboard.writeText(`${location.origin}/?room=${session.code}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setNotice(`Share room code ${session.code}`); } };
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = innerWidth <= 640 ? 720 : 960; canvas.height = 540; };
    resize(); window.addEventListener("resize", resize);
    let frame = 0, last = 0, lastSend = 0, lastCollect = 0;
    const down = (event: KeyboardEvent) => { if (/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return; if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW"].includes(event.code)) { event.preventDefault(); keysRef.current.add(event.code); } };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => { keysRef.current.clear(); touchRef.current.clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    const tick = (now: number) => {
      const dt = Math.min(.04, (now - last) / 1000 || .016); last = now; const room = stateRef.current; const hero = heroRef.current;
      const index = room?.level ?? 0; const levelData = layout(index); const keys = keysRef.current; const touches = touchRef.current;
      if (room?.phase === "active") {
        const left = keys.has("ArrowLeft") || keys.has("KeyA") || touches.has("left"); const right = keys.has("ArrowRight") || keys.has("KeyD") || touches.has("right");
        const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || touches.has("jump");
        hero.vx = (Number(right) - Number(left)) * 275;
        if (jump && hero.ground && !hero.jumpLatch) { hero.vy = -610; hero.ground = false; } hero.jumpLatch = jump;
        if (levelData.level.world === 1 && hero.ground && hero.x > 620 && hero.x < 1120) hero.x += 48 * dt;
        if (levelData.level.world === 3 && hero.x > 900 && hero.x < 1310) hero.x += 44 * dt;
        hero.x = clamp(hero.x + hero.vx * dt, 0, 1950);
        const oldBottom = hero.y + 42; const gravity = levelData.level.world === 2 && hero.x > 600 && hero.x < 1100 ? 850 : levelData.level.world === 3 && hero.x > 900 && hero.x < 1310 ? 980 : 1500;
        hero.vy += gravity * dt; hero.y += hero.vy * dt; hero.ground = false;
        let landing = Infinity; let spring = false;
        if (isGround(hero.x + 17, levelData.gaps) && oldBottom <= FLOOR + 12 && hero.y + 42 >= FLOOR && hero.vy >= 0) landing = FLOOR;
        for (const platform of levelData.platforms) if (hero.x + 30 > platform.x && hero.x + 4 < platform.x + platform.w && oldBottom <= platform.y + 8 && hero.y + 42 >= platform.y && hero.vy >= 0 && platform.y < landing) { landing = platform.y; spring = platform.spring; }
        if (landing < Infinity) { hero.y = landing - 42; hero.vy = spring ? -730 : 0; hero.ground = !spring; }
        if (hero.x > 520 && hero.checkpoint < 520) hero.checkpoint = 520;
        if (hero.x > 990 && hero.checkpoint < 990) hero.checkpoint = 990;
        if (hero.x > 1620 && hero.checkpoint < 1620) hero.checkpoint = 1620;
        if (hero.y > 545 || (now > hero.grace && levelData.hazards.some(x => Math.abs(hero.x + 17 - x) < 20 && hero.y + 42 > FLOOR - 24))) { hero.x = hero.checkpoint; hero.y = 388; hero.vy = 0; hero.grace = now + 1500; setNotice("Back to the last checkpoint"); }
        if (now - lastSend > 150 && sessionRef.current) { lastSend = now; void action("move", { x: Math.round(hero.x), y: Math.round(hero.y) }).catch(() => {}); }
        if (now - lastCollect > 220) { lastCollect = now; levelData.shards.forEach((shard, i) => {
          if ((room.collected & (1 << i)) || pendingRef.current.has(i)) return;
          if (Math.hypot(hero.x + 17 - shard.x, hero.y + 22 - shard.y) < 46) { pendingRef.current.add(i); void action("collect", { shard: i }).catch(() => {}).finally(() => setTimeout(() => pendingRef.current.delete(i), 500)); }
        }); }
        if (room.gateOpen && room.collected === 15 && !finishRef.current && room.players.every((p,i) => (i === room.meIndex ? hero.x : p.x) + 17 >= EXIT_X - 45)) { finishRef.current = true; void action("complete").catch(() => { finishRef.current = false; }); }
      }
      paint(ctx, index, room, hero, remotesRef.current, now / 1000); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [action]);
  const active = state?.phase === "active"; const currentLevel = LEVELS[state?.level ?? selected]; const world = WORLDS[currentLevel.world];
  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/" aria-label="Tandem Trails home"><span className="brand-glyph">✦</span> TANDEM<span>TRAILS</span></Link><div className="header-right"><span className="live-dot"/> LIVE CO-OP ADVENTURE <strong>2–4 PLAYERS</strong></div></header>
    <div className="overview"><div><p className="eyebrow">FOUR WORLDS · SIXTEEN LEVELS · ONE TEAM</p><h1>GO FARTHER <em>TOGETHER.</em></h1></div><p>Run, leap, gather four lights, and stand on both switches to open the way. Everyone must reach the portal.</p></div>
    <div className="main-grid"><section className="stage-card" aria-label="Game stage"><div className="stage-header"><span><i className="status-light"/> {state?.phase === "active" ? "LIVE LEVEL" : state?.phase === "finished" ? "LEVEL CLEAR" : "ADVENTURE PREVIEW"}</span><strong>{world.short} / {currentLevel.name.toUpperCase()}</strong></div><canvas ref={canvasRef} width={960} height={540} aria-label={`Side-scrolling platform level: ${currentLevel.name}. Move with arrows or A and D; jump with Space.`}/><div className="stage-footer"><span>✦ {state ? [0,1,2,3].filter(i => state.collected & (1 << i)).length : 0}/4 LIGHTS</span><span>{state?.gateOpen ? "GATE OPEN · REACH THE PORTAL" : "TWO SWITCHES OPEN THE GATE"}</span><span>LEVEL {(state?.level ?? selected) + 1}/16</span></div></section>
    <aside className="side-card">
      {!session ? <div className="entry"><p className="panel-tag">THE TRAILHEAD</p><h2>Bring your<br/>crew<span>.</span></h2><p>Start a room, share its code, and play together from different devices. No account or install.</p><label htmlFor="player-name">YOUR TRAIL NAME</label><input id="player-name" maxLength={20} placeholder="What should we call you?" value={name} onChange={event => setName(event.target.value)}/><button className="main-button" disabled={busy || !name.trim()} onClick={() => void enter("create")}>CREATE A ROOM <span>↗</span></button><div className="join-row"><input aria-label="Six-character room code" maxLength={6} placeholder="ROOM CODE" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,""))}/><button disabled={busy || !name.trim() || code.length !== 6} onClick={() => void enter("join")}>JOIN →</button></div><p className="tiny-note">2–4 players · 16 original levels · phones or laptops</p></div>:
      <div className="room"><p className="panel-tag">YOUR ROOM</p><div className="room-code">{session.code}</div><button className="copy-button" onClick={() => void share()}>{copied ? "LINK COPIED ✓" : "COPY INVITE LINK ↗"}</button><div className="room-status">{state?.phase === "lobby" ? `${state.playerCount}/4 players here · ${state.playerCount < 2 ? "invite a teammate" : "ready to start"}` : state?.phase === "active" ? `Playing ${currentLevel.name} · ${state.playerCount} adventurers` : state?.phase === "finished" ? `Level clear! ${state.unlocked}/16 levels unlocked` : "Connecting…"}</div>
      {state?.phase !== "active" && <div className="level-picker"><p className="panel-tag">CHOOSE A LEVEL</p>{WORLDS.map((item, worldIndex) => <div className="world-group" key={item.name}><h3><span>0{worldIndex + 1}</span> {item.name}</h3><div className="level-buttons">{LEVELS.filter(level => level.world === worldIndex).map(level => <button key={level.index} className={selected === level.index ? "selected" : ""} disabled={level.index > (state?.unlocked ?? 0) || !state?.isHost} onClick={() => setSelected(level.index)} title={level.name}>{level.index > (state?.unlocked ?? 0) ? "⌁" : level.stage + 1}</button>)}</div></div>)}</div>}
      {state?.isHost && state.phase !== "active" && <button className="main-button" disabled={busy || state.playerCount < 2} onClick={() => void doAction("start", { level: selected })}>{state.phase === "finished" ? "NEXT ADVENTURE" : "START THE ADVENTURE"}<span>→</span></button>}
      {state?.isHost && state.phase === "active" && <button className="small-button" disabled={busy} onClick={() => void doAction("restart")}>RESTART THIS LEVEL ↻</button>}
      {state?.phase !== "active" && <button className="leave-button" onClick={() => void leave()}>Leave room</button>}
      {state?.phase === "active" && <div className="objective"><strong>YOUR MISSION · {world.short}</strong><p>{world.tagline}</p><ol><li>Collect the four glowing lights.</li><li>Two players stand on switches A and B at the same time.</li><li>Everybody enters the portal on the right.</li></ol></div>}
      <div className="roster"><p className="panel-tag">THE CREW</p>{state?.players.map((player, index) => <div className="crew-row" key={index}><i style={{background:COLORS[index % COLORS.length]}}/><span>{player.name}{index === state.meIndex ? " · YOU" : ""}</span><small>{player.isHost ? "HOST" : "PLAYER"}</small></div>)}</div></div>}
      {error && <p className="error" role="alert">{error}</p>}{notice && active && <p className="notice" role="status">{notice}</p>}
    </aside></div>
    <div className="below"><details className="rules"><summary>HOW TO PLAY <span>+</span></summary><ol><li>Create a room and invite 1–3 people with the link or six-character code.</li><li>Everyone moves at the same time. Use arrows or A/D to run, Space to jump, or the phone buttons.</li><li>Find all four lights. Two different players stand on the marked switches together to open the gate.</li><li>Everyone reaches the portal to clear the level. The host chooses the next unlocked level. Falling or touching a hazard sends you to your last checkpoint.</li></ol></details><div className="controls-hint">← → / A D &nbsp; RUN <b>·</b> SPACE / ↑ &nbsp; JUMP <b>·</b> STAND TOGETHER ON A + B</div></div>
    {active && <div className="touch-controls" aria-label="Touch controls">{[["left","←"],["right","→"],["jump","JUMP"]].map(([key,label]) => <button key={key} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchRef.current.add(key); }} onPointerUp={() => touchRef.current.delete(key)} onPointerCancel={() => touchRef.current.delete(key)} onLostPointerCapture={() => touchRef.current.delete(key)}>{label}</button>)}</div>}
    <footer><span>AN ORIGINAL COOPERATIVE PLATFORM ADVENTURE</span><span>MADE FOR PLAYING TOGETHER FROM ANYWHERE</span></footer>
  </main>;
}
