"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EXIT_X, FLOOR, isGround, layout, LEVELS, PLATES, WORLD_WIDTH, WORLDS } from "../lib/levels";
import { sounds } from "../lib/audio";
import { NETWORK_POLL_MS, PLAYER_HEIGHT, PLAYER_WIDTH, POSITION_SEND_MS, SPAWN, type Room } from "../lib/game-types";

type Session = { code: string; token: string };
type Hero = { x: number; y: number; vx: number; vy: number; ground: boolean; checkpoint: number; jumpLatch: boolean; jumpBuffer: number; coyote: number; grace: number };
const NEW_HERO = (): Hero => ({ x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, ground: true, checkpoint: SPAWN.x, jumpLatch: false, jumpBuffer: 0, coyote: 0, grace: 0 });
const COLORS = ["#fff172", "#ff8fb0", "#8cf2e4", "#c6a1ff"];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const checkpointFor = (x: number) => (x > 1620 ? 1620 : x > 990 ? 990 : x > 520 ? 520 : 80);
const heroFromPlayer = (player?: { x: number; y: number }): Hero => {
  const hero = NEW_HERO();
  if (!player) return hero;
  hero.x = player.x;
  hero.y = player.y;
  hero.checkpoint = checkpointFor(player.x);
  return hero;
};
const clearSavedSession = () => {
  try { localStorage.removeItem("tandem-session"); } catch { /* ignore */ }
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
function paint(ctx: CanvasRenderingContext2D, index: number, room: Room | null, hero: Hero, remotes: Map<number, {x:number;y:number}>, time: number, camera: number) {
  const { level, gaps, platforms, shards, hazards } = layout(index); const world = WORLDS[level.world];
  const scale = Number(ctx.canvas.dataset.pixelRatio || 1);
  const w = ctx.canvas.width / scale, h = ctx.canvas.height / scale;
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, world.sky); sky.addColorStop(.62, world.far); sky.addColorStop(1, world.ground); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * .73, 125, 10, w * .73, 125, 260); glow.addColorStop(0, "#fff7c25c"); glow.addColorStop(.35, `${world.accent}22`); glow.addColorStop(1, "#e9f2c200"); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff6c9"; ctx.shadowColor = world.accent; ctx.shadowBlur = 28; ctx.beginPath(); ctx.arc(w * .73, 125, 24, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
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
  ctx.save(); ctx.translate(-camera, 0);
  for (let x = 0; x < WORLD_WIDTH; x += 20) if (isGround(x + 10, gaps)) {
    ctx.fillStyle = world.ground; ctx.fillRect(x, FLOOR, 21, h - FLOOR);
    ctx.fillStyle = world.near; ctx.fillRect(x, FLOOR, 21, 9);
    ctx.fillStyle = "#c6e7a54d"; ctx.fillRect(x, FLOOR, 21, 2);
    ctx.fillStyle = "#00000020"; ctx.fillRect(x + 5, FLOOR + 19 + (x % 3) * 9, 10, 4);
    ctx.strokeStyle = world.near; ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+6,FLOOR);ctx.lineTo(x+3,FLOOR-7);ctx.moveTo(x+10,FLOOR);ctx.lineTo(x+13,FLOOR-10);ctx.stroke();
  }
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
  PLATES.forEach((x, i) => {
    const on = !!room?.gateOpen || !!room?.players.some(p => p.active !== false && p.x + 17 > x - 26 && p.x + 17 < x + 26 && p.y > 360);
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
  if (room) room.players.forEach((player, i) => {
    const local = i === room.meIndex;
    if (local) avatar(ctx, hero.x, hero.y, i, player.name, true, time, hero.vx, hero.vy);
    else { const prev = remotes.get(i) || { x: player.x, y: player.y }; const oldX = prev.x; prev.x += (player.x - prev.x) * .22; prev.y += (player.y - prev.y) * .22; remotes.set(i, prev); avatar(ctx, prev.x, prev.y, i, player.name, false, time, (prev.x - oldX) * 30, player.y - prev.y); }
  });
  else avatar(ctx, 96, 388, 0, "", true, time);
  ctx.restore();

  if (room && room.phase === "active") {
    room.players.forEach((player, i) => {
      if (i === room.meIndex) return;
      const remotePos = remotes.get(i) || { x: player.x, y: player.y };
      const isOffLeft = remotePos.x < camera + 20;
      const isOffRight = remotePos.x > camera + w - 20;
      if (isOffLeft || isOffRight) {
        const indX = isOffLeft ? 28 : w - 28;
        const indY = clamp(remotePos.y - 10, 48, h - 48);
        const playerColor = COLORS[i % COLORS.length];
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
  ctx.beginPath(); ctx.ellipse(-18, h - 34, 110, 54, -.3, 0, 7); ctx.ellipse(w + 20, h - 26, 135, 62, .25, 0, 7); ctx.fill();
  ctx.strokeStyle = "#0b2230"; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-12, h); ctx.quadraticCurveTo(35, h - 120, 8, h - 200); ctx.moveTo(w + 10, h); ctx.quadraticCurveTo(w - 50, h - 90, w - 18, h - 160); ctx.stroke(); ctx.restore();
  const vignette = ctx.createRadialGradient(w / 2, h * .46, h * .22, w / 2, h * .5, w * .72); vignette.addColorStop(.5, "#0000"); vignette.addColorStop(1, "#02071270"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  const progress = clamp(hero.x / EXIT_X, 0, 1);
  roundRect(ctx, 20, 18, 170, 10, 5, "#08152699"); roundRect(ctx, 20, 18, Math.max(6, 170 * progress), 10, 5, world.accent); star(ctx, 20 + 170 * progress, 23, 7, "#fff9ce");
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<Room | null>(null); const sessionRef = useRef<Session | null>(null);
  const heroRef = useRef<Hero>(NEW_HERO()); const keysRef = useRef<Set<string>>(new Set()); const touchRef = useRef<Set<string>>(new Set());
  const cameraRef = useRef(0); const pendingRef = useRef<Set<number>>(new Set()); const finishRef = useRef(false);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [busy, setBusy] = useState(false);
  const [state, setState] = useState<Room | null>(null); const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const [muted, setMuted] = useState(sounds.isMuted());
  const [musicVol, setMusicVol] = useState(sounds.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(sounds.getSfxVolume());
  const [menuOpen, setMenuOpen] = useState(false);
  const [secretCode, setSecretCode] = useState(""); const [secretError, setSecretError] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false); const [playerNote, setPlayerNote] = useState("");
  const [editingName, setEditingName] = useState(false); const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false); const [confirmLeave, setConfirmLeave] = useState(false);
  const [isReady, setIsReady] = useState(false); const [connState, setConnState] = useState("disconnected");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [touchLayout, setTouchLayout] = useState("standard");
  const [worldTransition, setWorldTransition] = useState<{world:number, level:number} | null>(null);

  const action = useCallback(async (type: string, payload?: any) => {
    if (!sessionRef.current) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload,
          session: sessionRef.current
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.room) setState(data.room);
      if (data.notice) setNotice(data.notice);
      if (data.error) setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const enter = async (mode: "create" | "join") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode === "create" ? "create" : "join",
          payload: { name, code },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session, room } = await res.json();
      sessionRef.current = session;
      localStorage.setItem("tandem-session", JSON.stringify(session));
      setState(room);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!confirmLeave) { setConfirmLeave(true); setTimeout(() => setConfirmLeave(false), 3000); return; }
    setBusy(true);
    try {
      await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave",
          session: sessionRef.current,
        }),
      });
      sessionRef.current = null;
      localStorage.removeItem("tandem-session");
      setState(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setConfirmLeave(false);
    }
  };

  const share = async (type: "link" | "code") => {
    if (!sessionRef.current || !state) return;
    const val = type === "link" ? `${window.location.origin}/?room=${sessionRef.current.code}` : sessionRef.current.code;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlockSecret = () => {
    if (secretCode === "TRAILBLAZER") {
      setSecretUnlocked(true);
      setSecretError("");
    } else {
      setSecretError("Incorrect code");
    }
  };

  const updatePlayerNote = (val: string) => {
    setPlayerNote(val);
    localStorage.setItem("tandem-player-note", val);
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rename",
          payload: { name: newName },
          session: sessionRef.current,
        }),
      });
      setEditingName(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doAction = async (type: string, payload?: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payload,
          session: sessionRef.current,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.room) setState(data.room);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleTouchLayout = () => setTouchLayout(prev => prev === "standard" ? "left-handed" : "standard");

  useEffect(() => {
    const poll = async () => {
      if (!sessionRef.current) return;
      try {
        const res = await fetch(`/api/trails`, {
          method: "POST",
          headers: { "Content-Hype": "application/json" },
          body: JSON.stringify({
            type: "poll",
            session: sessionRef.current,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { room, latency } = await res.json();
        setState(room);
        setLatencyMs(latency);
        setConnState("connected");
      } catch (e) {
        setConnState("reconnecting");
      }
    };
    const timer = setInterval(poll, NETWORK_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem("tandem-session");
    if (savedSession) {
      sessionRef.current = JSON.parse(savedSession);
      void action("poll");
    }
    const savedNote = localStorage.getItem("tandem-player-note");
    if (savedNote) setPlayerNote(savedNote);
  }, [action]);

  useEffect(() => {
    if (state && state.phase === "active") {
      sounds.startWorldMusic(LEVELS[state.level].world);
    } else {
      sounds.stopWorldMusic();
    }
  }, [state?.phase, state?.level]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.dataset.pixelRatio = String(dpr);
      canvas.width = 960 * dpr;
      canvas.height = 540 * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    let frame: number;
    let last = 0;
    let lastSend = 0, lastCollect = 0;
    const down = (event: KeyboardEvent) => { if (/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName)) return; if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW"].includes(event.code)) { event.preventDefault(); keysRef.current.add(event.code); } };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => { keysRef.current.clear(); touchRef.current.clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    const tick = (now: number) => {
      if (document.hidden) { frame = requestAnimationFrame(tick); return; }
      const dt = Math.min(.04, (now - last) / 1000 || .016); last = now; const room = stateRef.current; const hero = heroRef.current;
      const index = room?.level ?? 0; const levelData = layout(index); const keys = keysRef.current; const touches = touchRef.current;
      if (room?.phase === "active") {
        const gamepad = typeof navigator.getGamepads === "function" ? navigator.getGamepads()[0] : null;
        const padLeft = !!gamepad && gamepad.axes[0] < -0.35;
        const padRight = !!gamepad && gamepad.axes[0] > 0.35;
        const padJump = !!gamepad?.buttons[0]?.pressed || !!gamepad?.buttons[9]?.pressed;
        const left = keys.has("ArrowLeft") || keys.has("KeyA") || touches.has("left") || padLeft; const right = keys.has("ArrowRight") || keys.has("KeyD") || touches.has("right") || padRight;
        const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || touches.has("jump") || padJump;
        const targetVx = (Number(right) - Number(left)) * 280;
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
        hero.x = clamp(hero.x + hero.vx * dt, 0, 1950);
        const oldBottom = hero.y + 42; const gravity = levelData.level.world === 2 && hero.x > 600 && hero.x < 1100 ? 850 : levelData.level.world === 3 && hero.x > 900 && hero.x < 1310 ? 980 : 1500;
        hero.vy += gravity * dt; hero.y += hero.vy * dt; hero.ground = false;
        let landing = Infinity; let spring = false;
        if (isGround(hero.x + 17, levelData.gaps) && oldBottom <= FLOOR + 12 && hero.y + 42 >= FLOOR && hero.vy >= 0) landing = FLOOR;
        for (const platform of levelData.platforms) if (hero.x + 30 > platform.x && hero.x + 4 < platform.x + platform.w && oldBottom <= platform.y + 8 && hero.y + 42 >= platform.y && hero.vy >= 0 && platform.y < landing) { landing = platform.y; spring = platform.spring; }
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
          hero.x = hero.checkpoint; hero.y = 388; hero.vy = 0; hero.grace = now + 1500;
          sounds.playFall();
          void action("fall").catch(() => {});
          setNotice("Back to the last checkpoint");
        }
        if (now - lastSend > POSITION_SEND_MS && sessionRef.current) { lastSend = now; void action("move", { x: Math.round(hero.x), y: Math.round(hero.y) }).catch(() => {}); }
        if (now - lastCollect > 220) { lastCollect = now; levelData.shards.forEach((shard, i) => {
          if ((room.collected & (1 << i)) || pendingRef.current.has(i)) return;
          if (Math.hypot(hero.x + 17 - shard.x, hero.y + 22 - shard.y) < 46) { pendingRef.current.add(i); void action("collect", { shard: i }).catch(() => {}).finally(() => setTimeout(() => pendingRef.current.delete(i), 500)); }
        }); }
        if (room.gateOpen && room.collected === 15 && !finishRef.current) {
          const finishers = room.players.filter((player, index) => index === room.meIndex || player.active !== false);
          const ready = finishers.length >= 2 && finishers.every(player => {
            const index = room.players.indexOf(player);
            const x = index === room.meIndex ? hero.x : player.x;
            return x + 17 >= EXIT_X - 45;
          });
          if (ready) { finishRef.current = true; void action("complete").catch(() => { finishRef.current = false; }); }
        }
      }
      const logicalWidth = ctx.canvas.width / Number(ctx.canvas.dataset.pixelRatio || 1);
      const targetCam = clamp(hero.x - (logicalWidth * 0.35), 0, WORLD_WIDTH - logicalWidth);
      cameraRef.current += (targetCam - cameraRef.current) * 0.12;
      const camera = Math.round(cameraRef.current);
      if (ctx.canvas.width > 0 && performance.now() - now > 24) console.debug("Tandem Trails frame exceeded 24ms");
      paint(ctx, index, room, hero, remotesRef.current, now / 1000, camera); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [action]);

  const active = state?.phase === "active"; const currentLevel = LEVELS[state?.level ?? selected]; const world = WORLDS[currentLevel.world];
  const lightsCollected = state ? [0, 1, 2, 3].filter(index => state.collected & (1 << index)).length : 0;
  const activeCrew = state?.players.filter(player => player.active !== false) ?? [];
  const portalCrew = activeCrew.length >= 2 ? activeCrew : (state?.players ?? []);
  const playersAtPortal = portalCrew.filter(player => player.x + 17 >= EXIT_X - 45 && player.y <= 410).length;
  const portalNeeded = Math.max(portalCrew.length, 0);
  const touchButtons = touchLayout === "standard"
    ? [["left", "←"], ["right", "→"], ["jump", "JUMP"]]
    : [["jump", "JUMP"], ["left", "←"], ["right", "→"]];

  return <main className={`shell ${session ? "in-room" : "at-title"} ${active ? "is-playing" : ""}`}>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Tandem Trails home"><span>✦</span> TANDEM TRAILS</Link>
      <div className="header-right">
        {session && <span className={`conn-indicator ${connState}${latencyMs !== null && latencyMs > 700 && connState === "connected" ? " laggy" : ""}`} title={latencyMs !== null ? `Status: ${connState} · ${latencyMs} ms` : `Status: ${connState}`}>● {connState === "connected" && latencyMs !== null && latencyMs > 700 ? `SLOW ${latencyMs}ms` : connState.toUpperCase()}</span>}
        <button className="audio-toggle-btn" onClick={() => setMuted(sounds.toggleMute())} title={muted ? "Unmute audio" : "Mute audio"}>{muted ? "🔇 SOUND OFF" : "🔊 SOUND ON"}</button>
        <span>4 PAINTED WORLDS</span>
        <strong>2–4 PLAYERS · ONLINE CO-OP</strong>
        <button className="audio-toggle-btn" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}>☰ MENU <kbd>Esc</kbd></button>
      </div>
    </header>
    {menuOpen && <div className="game-menu-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <section className="game-menu modal-box" role="dialog" aria-modal="true" aria-labelledby="game-menu-title">
        <div className="game-menu-heading"><div><p className="panel-tag">TRAIL MENU</p><h2 id="game-menu-title">Pause the adventure</h2></div><button className="btn btn-sm btn-ghost" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button></div>
        <ul className="menu menu-vertical bg-base-200/40 rounded-box">
          <li><button onClick={() => setMenuOpen(false)}>Return to trail</button></li>
          <li><button onClick={() => { setMenuOpen(false); setMuted(sounds.toggleMute()); }}>{muted ? "Turn sound on" : "Mute sound"}</button></li>
          <li className="menu-title">AUDIO SETTINGS</li>
          <li>
            <div className="flex items-center gap-4 w-full py-2">
              <span className="text-xs opacity-70 w-16">MUSIC</span>
              <input type="range" min="0" max="1" step="0.01" value={musicVol} onChange={e => { const v = parseFloat(e.target.value); setMusicVol(v); sounds.setMusicVolume(v); }} className="range range-xs range-primary" />
              <span className="text-xs w-8 text-right">{Math.round(musicVol * 100)}%</span>
            </div>
          </li>
          <li>
            <div className="flex items-center gap-4 w-full py-2">
              <span className="text-xs opacity-70 w-16">SFX</span>
              <input type="range" min="0" max="1" step="0.01" value={sfxVol} onChange={e => { const v = parseFloat(e.target.value); setSfxVol(v); sounds.setSfxVolume(v); }} className="range range-xs range-primary" />
              <span className="text-xs w-8 text-right">{Math.round(sfxVol * 100)}%</span>
            </div>
          </li>
        </ul>
        <div className="secret-panel">
          <label className="panel-tag" htmlFor="secret-code">SECRET TRAIL CODE</label>
          <div className="secret-code-row"><input className="input input-bordered" id="secret-code" type="password" value={secretCode} onChange={event => setSecretCode(event.target.value)} onKeyDown={event => { if (event.key === "Enter") unlockSecret(); }} placeholder="Enter code" autoComplete="off"/><button className="btn btn-primary" onClick={unlockSecret}>Unlock</button></div>
          {secretError && <p className="error" role="alert">{secretError}</p>}
          {secretUnlocked && <div className="note-editor"><label className="panel-tag" htmlFor="player-note">PRIVATE TRAIL NOTE</label><textarea className="textarea textarea-bordered" id="player-note" value={playerNote} onChange={event => updatePlayerNote(event.target.value)} placeholder="Type anything here…"/><small>Saved on this device. It is not sent to the room.</small></div>}
        </div>
      </section>
    </div>}
    <div className="overview"><div className="hero-copy"><p className="eyebrow">AN ORIGINAL CO-OP PLATFORM ADVENTURE</p><h1>Tandem<br/><em>Trails</em><span aria-hidden="true">✦</span></h1><p>Dash through a living storybook.<br/>Nobody gets left behind.</p><div className="hero-chips" aria-label="Game features"><span>16 TRAILS</span><span>4 HEROES</span><span>1 CREW</span></div></div><Image className="cast-art" src="/art/trailblazer-cast.png" width={1918} height={820} priority alt="The four original Tandem Trails adventurers: a rabbit scout, mushroom alchemist, moth glider, and cloud sprite."/></div>
    <div className="main-grid"><section className="stage-card" aria-label="Game stage"><div className="stage-header"><span><i className="status-light"/> {state?.phase === "active" ? "TRAIL IN PROGRESS" : state?.phase === "finished" ? "TRAIL COMPLETE" : "STORYBOOK PREVIEW"}</span><strong>{world.short} <b>·</b> {currentLevel.name.toUpperCase()}</strong></div><div className="canvas-wrap"><canvas ref={canvasRef} width={960} height={540} aria-label={`Side-scrolling platform level: ${currentLevel.name}. Move with arrows or A and D; jump with Space.`}/>{worldTransition && <div className="world-transition" role="status" aria-live="polite"><span className="transition-kicker">WORLD {worldTransition.world + 1} · TRAIL {worldTransition.level + 1}</span><strong>{WORLDS[worldTransition.world].name}</strong><b>{LEVELS[worldTransition.level].name}</b><small>{WORLDS[worldTransition.world].tagline}</small></div>}</div><div className="stage-footer" aria-live="polite"><span>✦ {lightsCollected}/4 LIGHTS</span><span>{state?.gateOpen ? "GATE OPEN · GATHER AT THE PORTAL" : "HOLD SWITCHES A + B TOGETHER"}</span><span>{playersAtPortal}/{portalNeeded} READY · TRAIL {(state?.level ?? selected) + 1}/16</span></div></section>
    <aside className="side-card">
      {!session ? <div className="entry"><h2 className="entry-heading">Create or join an adventure</h2><label htmlFor="player-name">YOUR NAME</label><input className="ui-input" id="player-name" maxLength={20} placeholder="e.g. Pip" value={name} onChange={event => setName(event.target.value)}/><button className="ui-btn main-button" aria-busy={busy} disabled={busy || !name.trim()} onClick={() => void enter("create")}>{busy ? "OPENING ROOM…" : "CREATE A ROOM"} <span>→</span></button><div className="join-row"><input className="ui-input" aria-label="Six-character room code" maxLength={6} placeholder="ROOM CODE" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,""))}/><button aria-busy={busy} disabled={busy || !name.trim() || code.length !== 6} onClick={() => void enter("join")}>{busy ? "JOINING…" : "JOIN A FRIEND →"}</button></div><p className="tiny-note">Share a room code. No account needed.</p></div>:
      <div className="room"><p className="panel-tag">YOUR ROOM</p><div className="room-code">{session.code}</div><div className="share-actions"><button className="copy-button" onClick={() => void share("link")}>{copied ? "SHARED ✓" : "SHARE INVITE ↗"}</button><button className="copy-button" onClick={() => void share("code")}>COPY CODE</button></div>
      <div className="room-status">{state?.phase === "lobby" ? <><strong>{state.playerCount}/4 PLAYERS</strong><span>{state.playerCount < 2 ? "Waiting for teammates: at least 2 players are required to begin." : state.isHost ? "You are the host. Choose a level and launch when everyone is ready." : "Waiting for the host to choose a level and launch."}</span></> : state?.phase === "active" ? `Playing ${currentLevel.name} · ${state.playerCount} adventurers` : state?.phase === "finished" ? (
        <div className="results-modal">
          <div className="results-content">
            <h2 className="results-title">TRAIL CLEAR!</h2>
            <div className="results-stats">
              <div className="stat-item"><span>TIME</span><strong>{state.completion && `${Math.floor(state.completion.seconds / 60)}:${String(state.completion.seconds % 60).padStart(2, "0")}`}</strong></div>
              <div className="stat-item"><span>FALLS</span><strong>{state.completion?.falls ?? 0}</strong></div>
              <div className="stat-item"><span>LIGHTS</span><strong>{state.completion?.lights ?? 0}/4</strong></div>
            </div>
            <div className="results-crew">
              <p className="crew-label">ADVENTURERS</p>
              <div className="crew-list">{state.completion?.players.map(p => <span key={p} className="crew-pill">{p}</span>)}</div>
            </div>
          </div>
        </div>
      ) : "Connecting…"}</div>
      {state?.phase === "lobby" && <div className="room-readiness" role="status" aria-live="polite">
        <button className={`ui-badge ${isReady ? "ui-badge-success" : "ui-badge-warning"}`} onClick={() => setIsReady(!isReady)}>{isReady ? "READY ✓" : "MARK READY"}</button>
        <span className="badge-role">{state.isHost ? "HOST" : "CREW MEMBER"}</span>
      </div>}
      {state?.phase !== "active" && <div className="level-picker"><p className="panel-tag">CHOOSE A LEVEL</p>{WORLDS.map((item, worldIndex) => <div className="world-group" key={item.name}><h3><span>0{worldIndex + 1}</span> {item.name}</h3><div className="level-buttons">{LEVELS.filter(level => level.world === worldIndex).map(level => <button key={level.index} className={selected === level.index ? "selected" : ""} disabled={level.index > (state?.unlocked ?? 0) || !state?.isHost} onClick={() => setSelected(level.index)} title={level.name}>{level.index > (state?.unlocked ?? 0) ? "⌁" : level.stage + 1}</button>)}</div></div>)}<p className="level-briefing"><strong>{LEVELS[selected].name}</strong> · {LEVELS[selected].briefing}</p></div>}
      {state?.isHost && state.phase !== "active" && <button className="ui-btn main-button" aria-busy={busy} disabled={busy || state.playerCount < 2} onClick={() => void doAction("start", { level: selected })} title={state.playerCount < 2 ? "Need at least 2 players to start" : "Start level"}>{busy ? "STARTING…" : state.phase === "finished" ? "NEXT ADVENTURE" : state.playerCount < 2 ? "WAITING FOR 2 PLAYERS…" : "START THE ADVENTURE"}<span>→</span></button>}
      {state?.isHost && state.phase === "active" && <button className="small-button" aria-busy={busy} disabled={busy} onClick={() => void doAction("restart")}>{busy ? "RESTARTING…" : "RESTART THIS LEVEL ↻"}</button>}
      {state?.phase !== "active" && <div className="lobby-actions"><button className={`leave-button ${confirmLeave ? "confirm-active" : ""}`} onClick={() => void leave()}>{confirmLeave ? "Confirm Leave Room?" : "Leave room"}</button></div>}
      {state?.phase === "active" && <div className="objective"><strong>YOUR MISSION · {world.short}</strong><p>{currentLevel.briefing}</p><ol className="mission-steps"><li className={lightsCollected === 4 ? "done" : ""}><span>01</span><div><b>Collect four lights</b><small>{lightsCollected}/4 collected</small></div></li><li className={state.gateOpen ? "done" : ""}><span>02</span><div><b>Open the gate together</b><small>{state.gateOpen ? "Gate open" : "Stand on switches A + B"}</small></div></li><li className={portalNeeded > 0 && playersAtPortal === portalNeeded ? "done" : ""}><span>03</span><div><b>Reach the portal</b><small>{playersAtPortal}/{portalNeeded} active players there</small></div></li></ol></div>}
      <div className="roster"><p className="panel-tag">THE CREW <span className="crew-count">{state?.playerCount ?? 0}/4</span></p>
        {state?.players.map((player, index) => <div className={`crew-row ${player.active === false ? "crew-away" : ""}`} key={index}>
          <i className={`crew-portrait crew-${index % 4}`} style={{background:COLORS[index % COLORS.length]}} title={`Player ${index + 1}`}/>
          <span><strong>P{index + 1}</strong> · {player.name}{index === state.meIndex ? " (YOU)" : ""}</span>
          {index === state.meIndex && !editingName && state.phase === "lobby" && <button className="rename-btn" onClick={() => { setEditingName(true); setNewName(player.name); }} title="Change name">✎</button>}
          <small>{player.active === false ? "AWAY" : player.isHost ? "HOST" : "PLAYER"}</small>
        </div>)}
        {editingName && state?.phase === "lobby" && <div className="rename-form"><input className="ui-input" maxLength={20} value={newName} onChange={e => setNewName(e.target.value)} placeholder="New name"/><button className="copy-button" disabled={busy || !newName.trim()} onClick={() => void handleRename()}>Save</button><button className="leave-button" onClick={() => setEditingName(false)}>Cancel</button></div>}
      </div></div>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && (active || notice.startsWith("Reconnected")) && <p className="notice" role="status">{notice}</p>}
      <div className="sr-only" role="status" aria-live="polite">
        {notice || (state ? `Current state: Trail ${(state.level ?? selected) + 1}, ${lightsCollected} of 4 lights collected, ${state.gateOpen ? "Gate open" : "Switches A and B required"}` : "")}
      </div>
    </aside></div>
    <div className="below"><details className="rules"><summary>HOW TO PLAY <span>+</span></summary><ol><li>Create a room and invite 1–3 people with the link or six-character code.</li><li>Everyone moves at the same time. Use arrows or A/D to run, Space to jump, or the phone buttons.</li><li>Find all four lights. Two different players stand on the marked switches together to open the gate.</li><li>Everyone reaches the portal to clear the level. The host chooses the next unlocked level. Falling or touching a hazard sends you to your last checkpoint.</li></ol></details>
    <div className="controls-hint">← → / A D &nbsp; RUN <b>·</b> SPACE / ↑ &nbsp; JUMP <b>·</b> STAND TOGETHER ON A + B &nbsp;·&nbsp; <button className="pref-toggle-btn" onClick={toggleTouchLayout}>🖐 Touch: {touchLayout === "standard" ? "Standard" : "Left-Handed"}</button></div></div>
    {active && <div className={`touch-controls ${touchLayout}`} aria-label="Touch controls">{touchButtons.map(([key,label]) => <button key={key} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touchRef.current.add(key); }} onPointerUp={() => touchRef.current.delete(key)} onPointerCancel={() => touchRef.current.delete(key)} onLostPointerCapture={() => touchRef.current.delete(key)}>{label}</button>)}</div>}
    <footer><span>AN ORIGINAL COOPERATIVE PLATFORM ADVENTURE</span><span>MADE FOR PLAYING TOGETHER FROM ANYWHERE</span></footer>
  </main>;
}
