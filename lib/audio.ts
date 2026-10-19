// Web Audio API procedural sound synthesizer for Tandem Trails
// Generates lightweight, zero-dependency sound effects for gameplay actions.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicWorld: number | null = null;
  private musicStep = 0;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tandem-audio-muted");
        this.muted = saved === "true";
      } catch {}
    }
  }

  private initCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureMusicGain(ctx: AudioContext): GainNode {
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.muted ? 0 : 0.045;
      this.musicGain.connect(ctx.destination);
    }
    return this.musicGain;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(muted ? 0 : 0.045, this.ctx?.currentTime ?? 0, 0.03);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tandem-audio-muted", String(muted));
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public startWorldMusic(world: number): void {
    if (this.musicWorld === world && this.musicTimer !== null) return;
    this.stopWorldMusic();
    const ctx = this.initCtx();
    if (!ctx) return;
    this.musicWorld = world;
    this.musicStep = 0;
    this.ensureMusicGain(ctx);
    const playStep = () => {
      if (this.musicWorld !== world || !this.ctx || !this.musicGain) return;
      const patterns = [
        [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
        [146.83, 185, 220, 246.94, 164.81, 207.65, 246.94, 220],
        [220, 277.18, 329.63, 369.99, 246.94, 311.13, 369.99, 329.63],
        [392, 493.88, 587.33, 659.25, 440, 554.37, 659.25, 739.99],
      ] as const;
      const notes = patterns[world % patterns.length];
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = world === 1 ? "triangle" : world === 2 ? "sine" : "sine";
      osc.frequency.setValueAtTime(notes[this.musicStep % notes.length], now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.44);
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 480);
  }

  public stopWorldMusic(): void {
    if (this.musicTimer !== null && typeof window !== "undefined") window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicWorld = null;
  }

  public playJump(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playLand(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playCollect(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.045;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch {}
  }

  public playSwitch(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(440, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playGate(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const chords = [392.0, 523.25, 659.25]; // G4, C5, E5
      chords.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.46);
      });
    } catch {}
  }

  public playComplete(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const melody = [
        { f: 523.25, d: 0.1 },  // C5
        { f: 659.25, d: 0.1 },  // E5
        { f: 783.99, d: 0.1 },  // G5
        { f: 1046.5, d: 0.28 }, // C6
      ];
      let offset = 0;
      melody.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + offset;

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.f, start);

        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + note.d + 0.05);
        offset += note.d * 0.85;
      });
    } catch {}
  }

  public playFall(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }

  public playNotify(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(587.33, now + 0.07);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }
}

export const sounds = new SoundManager();
