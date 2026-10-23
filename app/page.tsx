"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LEVELS, WORLDS, calculateMedal, getMedalThresholds } from "@/lib/levels";
import { sounds } from "@/lib/audio";
import { useGameSession } from "@/app/hooks/useGameSession";
import { useGameLoop } from "@/app/hooks/useGameLoop";
import GameCanvas from "@/app/components/game/GameCanvas";
import CampaignMap, { LevelRecord } from "@/app/components/campaign/CampaignMap";
import { TRAIL_TWISTS } from "@/lib/game-types";

export default function Home() {
  const {
    state, busy, error, setError, notice,
    connState, latencyMs, session, action, enter, leave
  } = useGameSession();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState(0);
  const [muted, setMuted] = useState(sounds.isMuted());
  const [musicVol, setMusicVol] = useState(sounds.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(sounds.getSfxVolume());
  const [menuOpen, setMenuOpen] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [secretError, setSecretError] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [playerNote, setPlayerNote] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [touchLayout, setTouchLayout] = useState("standard");
  const [announcement, setAnnouncement] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [records, setRecords] = useState<Record<number, LevelRecord>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("tandem_level_records") || "{}"); } catch { return {}; }
  });
  const [lastRunRecord, setLastRunRecord] = useState<{ isNewBest: boolean; medal: "gold" | "silver" | "bronze" | "cleared"; seconds: number } | null>(null);

  const remotesRef = useRef(new Map<number, { x: number; y: number }>());
  const startTimeRef = useRef<number | null>(null);

  const { heroRef, touchRef, cameraRef, shakeRef, particlesRef } = useGameLoop(
    state,
    (x: number, y: number) => void action("move", { x, y }),
    (shard: number) => void action("collect", { shard }),
    (index: number) => void action("collectOptional", { index }),
    () => void action("complete", { seconds: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : Math.max(1, elapsed) }),
    () => void action("fall"),
    setAnnouncement
  );

  useEffect(() => {
    let timer: number | undefined;
    let resetTimer: number | undefined;
    if (state?.phase === "active") {
      const startedAt = Date.now();
      startTimeRef.current = startedAt;
      timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    } else {
      startTimeRef.current = null;
      resetTimer = window.setTimeout(() => setElapsed(0), 0);
    }
    return () => { if (timer) window.clearInterval(timer); if (resetTimer) window.clearTimeout(resetTimer); };
  }, [state?.phase]);

  useEffect(() => {
    const updateTimer = window.setTimeout(() => {
      if (state?.phase === "finished" && state.completion) {
      const lvl = state.level ?? selected;
      const secs = state.completion.seconds || elapsed || 1;
      const medal = calculateMedal(lvl, secs);
      const existing = records[lvl];
      const isNewBest = !existing || secs < existing.bestTimeSeconds;
      const nextRecords = { ...records, [lvl]: { bestTimeSeconds: isNewBest ? secs : existing.bestTimeSeconds, medal: isNewBest ? medal : existing.medal } };
      try { localStorage.setItem("tandem_level_records", JSON.stringify(nextRecords)); } catch {}
      setRecords(nextRecords);
      setLastRunRecord({ isNewBest, medal, seconds: secs });
      } else if (state?.phase === "active") {
        setLastRunRecord(null);
      }
    }, 0);
    return () => window.clearTimeout(updateTimer);
  }, [state?.phase, state?.completion, state?.level, selected, elapsed, records]);

  const handleEnter = async (mode: "create" | "join") => {
    try {
      await enter(mode, { name, code });
    } catch {
      setError("Failed to enter trail");
    }
  };

  const handleLeave = async () => {
    if (!confirmLeave) { setConfirmLeave(true); setTimeout(() => setConfirmLeave(false), 3000); return; }
    try {
      await leave();
    } catch {
      setError("Failed to leave trail");
    } finally {
      setConfirmLeave(false);
    }
  };

  const handleShare = async (type: "link" | "code") => {
    if (!session) return;
    const val = type === "link" ? `${window.location.origin}/?room=${session.code}` : session.code;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlockSecret = () => {
    if (secretCode === "TRAILBLAZER") {
      setSecretUnlocked(true);
      setSecretError("");
    } else {
      setSecretError("Incorrect code");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await action("rename", { name: newName });
      setEditingName(false);
    } catch {
      setError("Failed to rename player");
    }
  };

  const currentLevel = LEVELS[state?.level ?? selected];
  const world = WORLDS[currentLevel.world];
  const lightsCollected = state ? [0, 1, 2, 3].filter(index => state.collected & (1 << index)).length : 0;
  const optionalsCollected = state ? [0, 1, 2, 3].filter(index => state.optionalCollected & (1 << index)).length : 0;
  const activeCrew = state?.players.filter(player => player.active !== false) ?? [];
  const portalCrew = activeCrew.length >= 2 ? activeCrew : (state?.players ?? []);
  const playersAtPortal = portalCrew.filter(player => player.x + 17 >= 1857 - 45 && player.y <= 410).length;
  const portalNeeded = Math.max(portalCrew.length, 0);
  const syncLinked = !!state?.players.some((player, index) => {
    const local = state.players[state.meIndex];
    return index !== state.meIndex && player.active !== false && local && Math.hypot(player.x - local.x, player.y - local.y) <= 350;
  });
  const trailTwist = state?.trailTwist ? TRAIL_TWISTS[state.trailTwist] : null;

  const touchButtons = touchLayout === "standard"
    ? [["left", "←"], ["right", "→"], ["jump", "JUMP"]]
    : [["jump", "JUMP"], ["left", "←"], ["right", "→"]];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <main className={`shell ${session ? "in-room" : "at-title"} ${state?.phase === "active" ? "is-playing" : ""}`}>
      <header className="topbar">
        <Link className="brand" href="/"><span>✦</span> TANDEM TRAILS</Link>
        <div className="header-right">
          <Link href="/trail-journal" className="nav-link">JOURNAL</Link>
          <Link href="/bio" className="nav-link">BIO</Link>
          <Link href="/account" className="nav-link">ACCOUNT</Link>
          {session && <span className={`conn-indicator ${connState}${latencyMs !== null && latencyMs > 700 && connState === "connected" ? " laggy" : ""}`}>● {connState.toUpperCase()}</span>}
          <button className="audio-toggle-btn" onClick={() => setMuted(sounds.toggleMute())}>{muted ? "🔇 SOUND OFF" : "🔊 SOUND ON"}</button>
          <span>4 PAINTED WORLDS</span>
          <strong>2–4 PLAYERS · ONLINE CO-OP</strong>
          <button className="audio-toggle-btn" onClick={() => setMenuOpen(true)}>☰ MENU <kbd>Esc</kbd></button>
        </div>
      </header>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      {menuOpen && (
        <div className="game-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <section className="game-menu modal-box" onClick={e => e.stopPropagation()}>
            <div className="game-menu-heading">
              <div><p className="panel-tag">TRAIL MENU</p><h2>Pause the adventure</h2></div>
              <button className="btn btn-sm btn-ghost" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <ul className="menu menu-vertical bg-base-200/40 rounded-box">
              <li><button onClick={() => setMenuOpen(false)}>Return to trail</button></li>
              <li><Link href="/trail-journal" onClick={() => setMenuOpen(false)}>The Trail Journal & Lore ↗</Link></li>
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
              <div className="secret-code-row">
                <input className="input input-bordered" id="secret-code" type="password" value={secretCode} onChange={e => setSecretCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUnlockSecret()} placeholder="Enter code" />
                <button className="btn btn-primary" onClick={handleUnlockSecret}>Unlock</button>
              </div>
              {secretError && <p className="error">{secretError}</p>}
              {secretUnlocked && (
                <div className="note-editor">
                  <label className="panel-tag" htmlFor="player-note">PRIVATE TRAIL NOTE</label>
                  <textarea className="textarea textarea-bordered" id="player-note" value={playerNote} onChange={e => setPlayerNote(e.target.value)} placeholder="Type anything here…" />
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="overview">
        <div className="hero-copy">
          <p className="eyebrow">AN ORIGINAL CO-OP PLATFORM ADVENTURE</p>
          <h1>Tandem<br/><em>Trails</em><span aria-hidden="true">✦</span></h1>
          <p>Dash through a living storybook.<br/>Nobody gets left behind.</p>
          <div className="hero-chips"><span>16 TRAILS</span><span>4 HEROES</span><span>1 CREW</span></div>
        </div>
        <Image className="cast-art" src="/art/trailblazer-cast.png" width={1918} height={820} priority alt="Cast art" />
      </div>

      <div className="main-grid">
        <section className="stage-card">
          <div className="stage-header">
            <span><i className="status-light"/> {state?.phase === "active" ? "TRAIL IN PROGRESS" : state?.phase === "finished" ? "TRAIL COMPLETE" : "STORYBOOK PREVIEW"}</span>
            <strong>{world.short} · {currentLevel.name.toUpperCase()}</strong>
          </div>
          <div className="canvas-wrap">
            <GameCanvas
              index={state?.level ?? selected}
              room={state}
              heroRef={heroRef}
              cameraRef={cameraRef}
              shakeRef={shakeRef}
              particlesRef={particlesRef}
              remotesRef={remotesRef}
            />
          </div>
          <div className="stage-footer">
            <span>✦ {lightsCollected}/4 LIGHTS</span>
            <span style={{ marginLeft: '1rem', color: world.accent }}>✨ {optionalsCollected} COLLECTED</span>
            <span style={{ marginLeft: '1rem', fontWeight: 'bold', color: '#fff' }}>⏱ {formatTime(elapsed)}</span>
            <span className={`sync-status ${syncLinked ? "linked" : ""}`}>⚡ SYNC LINK · {syncLinked ? "BRIDGE LIVE" : "STAY CLOSE"}</span>
            {trailTwist && <span className="ui-badge ui-badge-outline ui-badge-sm trail-twist-status">{trailTwist.icon} TWIST · {trailTwist.label}</span>}
            <span style={{ marginLeft: '1rem' }}>{state?.gateOpen ? "GATE OPEN · GATHER AT THE PORTAL" : "HOLD SWITCHES A + B TOGETHER"}</span>
            <span style={{ marginLeft: '1rem' }}>{playersAtPortal}/{portalNeeded} READY · TRAIL {(state?.level ?? selected) + 1}/16</span>
          </div>
        </section>

        <aside className="side-card">
          {!session ? (
            <div className="entry">
              <h2 className="entry-heading">Create or join an adventure</h2>
              <label htmlFor="player-name">YOUR NAME</label>
              <input className="ui-input" id="player-name" maxLength={20} value={name} onChange={e => setName(e.target.value)} />
              <button className="ui-btn main-button" disabled={busy || !name.trim()} onClick={() => handleEnter("create")}>
                {busy ? "OPENING ROOM…" : "CREATE A ROOM"} →
              </button>
              <div className="join-row">
                <input className="ui-input" maxLength={6} placeholder="ROOM CODE" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
                <button disabled={busy || !name.trim() || code.length !== 6} onClick={() => handleEnter("join")}>
                  {busy ? "JOINING…" : "JOIN A FRIEND →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="room">
              <p className="panel-tag">YOUR ROOM</p>
              <div className="room-code">{session.code}</div>
              <div className="share-actions">
                <button className="copy-button" onClick={() => handleShare("link")}>{copied ? "SHARED ✓" : "SHARE INVITE ↗"}</button>
                <button className="copy-button" onClick={() => handleShare("code")}>COPY CODE</button>
              </div>
              <div className="room-status">
                {state?.phase === "lobby" ? (
                  <><strong>{state.playerCount}/4 PLAYERS</strong><span>{state.playerCount < 2 ? "Waiting for teammates..." : "Ready to launch."}</span></>
                ) : state?.phase === "active" ? (
                  `Playing ${currentLevel.name}`
                ) : (
                  <div className="results-modal">
                    <div className="results-content">
                      <h2 className="results-title">TRAIL CLEAR!</h2>
                      {lastRunRecord?.isNewBest && (
                        <div className="new-record-callout" style={{ color: "#ffd85e", fontSize: "11px", fontWeight: 800, marginBottom: "8px", letterSpacing: "1px" }}>
                          ⚡ NEW PERSONAL BEST!
                        </div>
                      )}
                      <div className="results-stats">
                        <div className="stat-item"><span>TIME</span><strong>{state?.completion ? formatTime(state.completion.seconds) : "--:--"}</strong></div>
                        <div className="stat-item"><span>FALLS</span><strong>{state?.completion?.falls ?? 0}</strong></div>
                        <div className="stat-item"><span>MEDAL</span><strong>{lastRunRecord?.medal === "gold" ? "🥇 GOLD" : lastRunRecord?.medal === "silver" ? "🥈 SILVER" : lastRunRecord?.medal === "bronze" ? "🥉 BRONZE" : "✓ CLEAR"}</strong></div>
                      </div>
                      <div className="medal-thresholds" style={{ fontSize: "10px", color: "#aee9cd", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: "8px", marginTop: "10px", textAlign: "center" }}>
                        <span>Target Gold: ≤{getMedalThresholds(state?.level ?? selected).gold}s · Silver: ≤{getMedalThresholds(state?.level ?? selected).silver}s</span>
                      </div>
                      <div className="challenge-ribbons" aria-label="Run challenges">
                        {(state?.completion?.falls ?? 0) === 0 && <span>✦ FLAWLESS RUN</span>}
                        {(state?.completion?.fireflies ?? 0) === 3 && <span>✦ LANTERN KEEPER</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {state?.phase === "lobby" && (
                <div className="room-readiness">
                  <button className={`ui-badge ${isReady ? "ui-badge-success" : "ui-badge-warning"}`} onClick={() => setIsReady(!isReady)}>{isReady ? "READY ✓" : "MARK READY"}</button>
                  <span className="badge-role">{state.isHost ? "HOST" : "CREW MEMBER"}</span>
                </div>
              )}
              {state?.phase !== "active" && (
                <div className="level-picker">
                  <p className="panel-tag">CAMPAIGN MAP</p>
                  <CampaignMap
                    unlockedLevel={state?.unlocked ?? 0}
                    completedLevels={Object.keys(records).map(Number)}
                    records={records}
                    selectedLevel={selected}
                    onSelectLevel={setSelected}
                    isHost={state?.isHost ?? false}
                  />
                </div>
              )}
              {state?.isHost && state.phase !== "active" && (
                <button className="ui-btn main-button" disabled={busy || state.playerCount < 2} onClick={() => void action("start", { level: selected })}>
                  {busy ? "STARTING…" : "START THE ADVENTURE"} →
                </button>
              )}
              {state?.phase !== "active" && (
                <div className="lobby-actions">
                  <button className={`leave-button ${confirmLeave ? "confirm-active" : ""}`} onClick={handleLeave}>{confirmLeave ? "Confirm Leave?" : "Leave room"}</button>
                </div>
              )}
              {state?.phase === "active" && (
                <div className="objective">
                  <strong>YOUR MISSION · {world.short}</strong>
                  <p>{currentLevel.briefing}</p>
                  <ol className="mission-steps">
                    <li className={lightsCollected === 4 ? "done" : ""}><span>01</span><div><b>Collect four lights</b></div></li>
                    <li className={state.gateOpen ? "done" : ""} ><span>02</span><div><b>Open the gate together</b></div></li>
                    <li className={playersAtPortal === portalNeeded ? "done" : ""} ><span>03</span><div><b>Reach the portal</b></div></li>
                  </ol>
                </div>
              )}
              <div className="roster">
                <p className="panel-tag">THE CREW <span>{state?.playerCount ?? 0}/4</span></p>
                {state?.players.map((player, index) => (
                  <div className={`crew-row ${player.active === false ? "crew-away" : ""}`} key={index}>
                    <i className={`crew-portrait crew-${index % 4}`} style={{background: ["#fff172", "#ff8fb0", "#8cf2e4", "#c6a1ff"][index % 4]}} />
                    <span><strong>P{index + 1}</strong> · {player.name}</span>
                    {index === state.meIndex && !editingName && state.phase === "lobby" && <button className="rename-btn" onClick={() => { setEditingName(true); setNewName(player.name); }}>✎</button>}
                    <small>{player.active === false ? "AWAY" : player.isHost ? "HOST" : "PLAYER"}</small>
                  </div>
                ))}
                {editingName && state?.phase === "lobby" && (
                  <div className="rename-form">
                    <input className="ui-input" value={newName} onChange={e => setNewName(e.target.value)} />
                    <button className="copy-button" onClick={handleRename}>Save</button>
                    <button className="leave-button" onClick={() => setEditingName(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {notice && <p className="notice">{notice}</p>}
        </aside>
      </div>

      <div className="below">
        <div className="social-links">
          <Link href="/trail-journal" className="social-btn">TRAIL JOURNAL ↗</Link>
          <Link href="/trail-journal#worlds-heading" className="social-btn">WORLD LORE ↗</Link>
          <Link href="/trail-journal#mechanics-heading" className="social-btn">MECHANICS GUIDE ↗</Link>
        </div>
        <details className="rules"><summary>HOW TO PLAY <span>+</span></summary><ol><li>Create a room and invite 1–3 people.</li><li>Move with arrows/A D; jump with Space.</li><li>Find four lights and open the gate together.</li><li>Everyone reach the portal to clear.</li></ol></details>
        <div className="controls-hint">← → / A D RUN · SPACE / ↑ JUMP · <button className="pref-toggle-btn" onClick={() => setTouchLayout(t => t === "standard" ? "left-handed" : "standard")}>🖐 Touch: {touchLayout}</button></div>
      </div>
      {state?.phase === "active" && (
        <div className={`touch-controls ${touchLayout}`}>
          {touchButtons.map(([key, label]) => (
            <button key={key} onPointerDown={e => { e.preventDefault(); touchRef.current.add(key); }} onPointerUp={() => touchRef.current.delete(key)}>{label}</button>
          ))}
        </div>
      )}
      <footer><span>AN ORIGINAL COOPERATIVE PLATFORM ADVENTURE</span><span>MADE FOR PLAYING TOGETHER FROM ANYWHERE</span></footer>
    </main>
  );
}
