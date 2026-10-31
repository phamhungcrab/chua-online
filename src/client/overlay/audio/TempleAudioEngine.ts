import type { TempleSettings, TtsBroadcastPayload } from '../../../shared/types.ts';

/**
 * TempleAudioEngine (Web Audio API Synthesizer + Priority TTS Player with Auto-Ducking)
 * - Synthesizes authentic Vietnamese temple percussion & bells (0dBFS safe):
 *   1. Đại Hồng Chung (4-partial metallic bronze bell with long decay)
 *   2. Mõ Gỗ Tụng Kinh (Bandpass-filtered wooden fish percussion with rate limiting)
 *   3. Chuông Bát Nhã (Singing bowl harmonic chime)
 *   4. Ống Xăm Tre (Bamboo fortune stick shaker)
 *   5. Nhạc Thiền Ngũ Cung (Generative ambient pentatonic zither/bell loop)
 * - Plays server-generated Neural TTS MP3s or gracefully falls back to Vietnamese Web Speech API
 *   with smooth background music auto-ducking.
 */
export class TempleAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private unlocked = false;
  private settings: Pick<
    TempleSettings,
    | 'audioMasterVolume'
    | 'audioMusicVolume'
    | 'audioSfxVolume'
    | 'audioTtsVolume'
    | 'ttsEnabled'
    | 'woodenFishRhythmEnabled'
    | 'woodenFishBpm'
  > = {
    audioMasterVolume: 0.9,
    audioMusicVolume: 0.55,
    audioSfxVolume: 0.85,
    audioTtsVolume: 0.95,
    ttsEnabled: true,
    woodenFishRhythmEnabled: true,
    woodenFishBpm: 52
  };

  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private rhythmMoTimer: ReturnType<typeof setInterval> | null = null;
  private ambientNoteStep = 0;
  private lastMoAt = 0;

  private readonly ttsQueue: TtsBroadcastPayload[] = [];
  private ttsPlaying = false;

  public unlock(): boolean {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.masterGain.gain.value = this.settings.audioMasterVolume;
        this.musicGain.gain.value = this.settings.audioMusicVolume;
        this.sfxGain.gain.value = this.settings.audioSfxVolume;

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.unlocked = true;
      this.startAmbientLoop();
      this.rescheduleRhythmMo();
      return true;
    } catch {
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public applySettings(newSettings: TempleSettings): void {
    this.settings = {
      audioMasterVolume: newSettings.audioMasterVolume,
      audioMusicVolume: newSettings.audioMusicVolume,
      audioSfxVolume: newSettings.audioSfxVolume,
      audioTtsVolume: newSettings.audioTtsVolume,
      ttsEnabled: newSettings.ttsEnabled,
      woodenFishRhythmEnabled: newSettings.woodenFishRhythmEnabled,
      woodenFishBpm: newSettings.woodenFishBpm
    };

    if (this.ctx && this.masterGain && this.musicGain && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.settings.audioMasterVolume, now, 0.08);
      const targetMusic = this.ttsPlaying
        ? this.settings.audioMusicVolume * 0.28
        : this.settings.audioMusicVolume;
      this.musicGain.gain.setTargetAtTime(targetMusic, now, 0.15);
      this.sfxGain.gain.setTargetAtTime(this.settings.audioSfxVolume, now, 0.08);
    }

    this.rescheduleRhythmMo();
  }

  private setDucking(ducked: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const target = ducked
      ? this.settings.audioMusicVolume * 0.25
      : this.settings.audioMusicVolume;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + 0.35);
  }

  private startAmbientLoop(): void {
    if (this.ambientTimer) return;
    const PENTATONIC_HZ = [196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0];

    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.settings.audioMusicVolume <= 0.01) return;
      try {
        const now = this.ctx.currentTime;
        const freq = PENTATONIC_HZ[this.ambientNoteStep++ % PENTATONIC_HZ.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.4);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 4.5);
      } catch {
        // ignore
      }
    };

    playNote();
    this.ambientTimer = setInterval(playNote, 3800);
  }

  private rescheduleRhythmMo(): void {
    if (this.rhythmMoTimer) {
      clearInterval(this.rhythmMoTimer);
      this.rhythmMoTimer = null;
    }
    if (this.unlocked && this.settings.woodenFishRhythmEnabled) {
      const intervalMs = Math.round(60000 / Math.max(20, Math.min(120, this.settings.woodenFishBpm)));
      this.rhythmMoTimer = setInterval(() => {
        if (!this.ttsPlaying) {
          this.playWoodenFish(0.95);
        }
      }, intervalMs);
    }
  }

  /**
   * Wooden Fish Percussion (Mõ Gỗ) — rate-limited to max 5 hits/sec to prevent clipping.
   */
  public playWoodenFish(pitchScale = 1.0): void {
    if (!this.ctx || !this.sfxGain || this.settings.audioSfxVolume <= 0.01) return;
    const nowMs = performance.now();
    if (nowMs - this.lastMoAt < 180) return;
    this.lastMoAt = nowMs;

    try {
      const t = this.ctx.currentTime;
      const baseFreq = 610 * pitchScale * (0.98 + Math.random() * 0.04);

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 1.38, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.018);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, t + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.12, t);
      filter.Q.setValueAtTime(3.8, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {
      // ignore
    }
  }

  /**
   * Temple Bronze Bell (Đại Hồng Chung) — 4 harmonic partials with warm metallic resonance.
   */
  public playTempleBell(intensity = 1.0): void {
    if (!this.ctx || !this.sfxGain || this.settings.audioSfxVolume <= 0.01) return;
    try {
      const t = this.ctx.currentTime;
      const k = Math.max(0.5, Math.min(1.5, intensity));
      const partials: ReadonlyArray<[number, number, number]> = [
        [174, 0.34, 4.8],
        [348, 0.24, 3.6],
        [524, 0.12, 2.4],
        [870, 0.06, 1.6]
      ];

      for (const [freq, amp, decay] of partials) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(amp * k, t + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
    } catch {
      // ignore
    }
  }

  public playIncenseChime(): void {
    if (!this.ctx || !this.sfxGain || this.settings.audioSfxVolume <= 0.01) return;
    try {
      const t = this.ctx.currentTime;
      for (const [idx, freq] of [528, 660].entries()) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.11);

        gain.gain.setValueAtTime(0.0001, t + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.14, t + idx * 0.11 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.11 + 1.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.11);
        osc.stop(t + idx * 0.11 + 1.15);
      }
    } catch {
      // ignore
    }
  }

  public playFortuneShake(): void {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playWoodenFish(1.3 + (i % 2) * 0.15);
      }, i * 115);
    }
  }

  public enqueueTts(payload: TtsBroadcastPayload): void {
    if (!this.settings.ttsEnabled) return;
    if (this.ttsQueue.length >= 12) {
      this.ttsQueue.shift();
    }
    this.ttsQueue.push(payload);
    void this.drainTtsQueue();
  }

  private async drainTtsQueue(): Promise<void> {
    if (this.ttsPlaying || this.ttsQueue.length === 0) return;
    this.ttsPlaying = true;
    this.setDucking(true);

    try {
      while (this.ttsQueue.length > 0) {
        const next = this.ttsQueue.shift()!;
        if (next.audioUrl && this.unlocked) {
          await this.playAudioUrl(next.audioUrl);
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.unlocked) {
          await this.playBrowserSpeechFallback(next.text);
        }
      }
    } finally {
      this.ttsPlaying = false;
      this.setDucking(false);
    }
  }

  private playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, this.settings.audioTtsVolume * this.settings.audioMasterVolume));
        const timeout = setTimeout(() => resolve(), 18000);
        audio.onended = () => {
          clearTimeout(timeout);
          resolve();
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
        audio.play().catch(() => {
          clearTimeout(timeout);
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  private playBrowserSpeechFallback(text: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.rate = 0.92;
        utter.volume = Math.max(0, Math.min(1, this.settings.audioTtsVolume));
        const timeout = setTimeout(() => resolve(), 10000);
        utter.onend = () => {
          clearTimeout(timeout);
          resolve();
        };
        utter.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
        synth.speak(utter);
      } catch {
        resolve();
      }
    });
  }
}
