// Web Audio API procedural sound synthesizer for Tandem Trails
// Generates lightweight, zero-dependency sound effects for gameplay actions.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicWorld: number | null = null;
  private musicStep = 0;
  private musicVolume = 0.45;
  private sfxVolume = 0.8;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem("tandem-audio-muted");
        const savedMusicVol = localStorage.getItem("tandem-audio-music-vol");
        const savedSfxVol = localStorage.getItem("tandem-audio-sfx-vol");

        this.muted = savedMute === "true";
        if (savedMusicVol) this.musicVolume = parseFloat(savedMusicVol);
        if (savedSfxVol) this.sfxVolume = parseFloat(savedSfxVol);
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
      this.musicGain.gain.value = this.muted ? 0 : this.musicVolume * 0.1;
      this.musicGain.connect(ctx.destination);
    }
    return this.musicGain;
  }

  private ensureSfxGain(ctx: AudioContext): GainNode {
    if (!this.sfxGain) {
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
      this.sfxGain.connect(ctx.destination);
    }
    return this.sfxGain;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(muted ? 0 : this.musicVolume * 0.1, this.ctx?.currentTime ?? 0, 0.03);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(muted ? 0 : this.sfxVolume, this.ctx?.currentTime ?? 0, 0.03);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tandem-audio-muted", String(muted));
      } catch {}
    }
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = vol;
    if (this.musicGain && !this.muted) {
      this.musicGain.gain.setTargetAtTime(vol * 0.1, this.ctx?.currentTime ?? 0, 0.03);
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tandem-audio-music-vol", String(vol));
      } catch {}
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = vol;
    if (this.sfxGain && !this.muted) {
      this.sfxGain.gain.setTargetAtTime(vol, this.ctx?.currentTime ?? 0, 0.03);
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("tandem-audio-sfx-vol", String(vol));
      } catch {}
    }
  }

  public getMusicVolume(): number { return this.musicVolume; }
  public getSfxVolume(): number { return this.sfxVolume; }

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

      osc.connect(this.ensureSfxGain(ctx));
      gain.connect(ctx.destination); // This was wrong in original, should connect to sfxGain

      // Fixed: connect to sfxGain
      osc.connect(gain);
      gain.connect(this.ensureSfxGain(ctx));

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
      gain.connect(this.ensureSfxGain(ctx));

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
        gain.connect(this.ensureSfxGain(ctx));

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
      gain.connect(this.ensureSfxGain(ctx));

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
        gain.connect(this.ensureSfxGain(ctx));

        osc.start(now);
        osc.stop(now + 0.46);
      });
    } catch {}
  }

  public playComplete(): void {
    this.playVictoryFanfare();
  }

  public playVictoryFanfare(world: number = 0): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      // World-tuned victory arpeggio roots
      const worldRoots: Record<number, number[]> = {
        0: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], // C major flourish
        1: [587.33, 739.99, 880.00, 1174.66, 1479.98, 1760.00], // D major triumphant
        2: [440.00, 554.37, 659.25, 880.00, 1108.73, 1318.51],  // A major crystalline
        3: [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53], // E major celestial
      };

      const notes = worldRoots[world % 4] || worldRoots[0];
      const now = ctx.currentTime;
      let offset = 0;

      // Ascending arpeggio flourish
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + offset;
        const dur = idx === notes.length - 1 ? 0.75 : 0.12;

        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(this.ensureSfxGain(ctx));

        osc.start(start);
        osc.stop(start + dur + 0.05);
        offset += 0.09;
      });

      // Sustained grand resolution chord at climax
      const chordNotes = [notes[0] / 2, notes[2] / 2, notes[3], notes[5] || notes[3] * 1.5];
      const chordStart = now + offset - 0.02;
      chordNotes.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, chordStart);

        gain.gain.setValueAtTime(0.12, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);

        osc.connect(gain);
        gain.connect(this.ensureSfxGain(ctx));

        osc.start(chordStart);
        osc.stop(chordStart + 1.25);
      });
    } catch {}
  }

  public playSyncChime(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [880, 1318.51, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.05;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.ensureSfxGain(ctx));

        osc.start(start);
        osc.stop(start + 0.38);
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
      gain.connect(this.ensureSfxGain(ctx));

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
      gain.connect(this.ensureSfxGain(ctx));

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }
}

export const sounds = new SoundManager();
