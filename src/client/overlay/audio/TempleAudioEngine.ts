import type { TempleSettings, TtsBroadcastPayload } from '../../../shared/types.ts';

/**
 * TempleAudioEngine (Web Audio API Synthesizer + Priority TTS Player with Dynamic Auto-Ducking)
 * - Synthesizes authentic Vietnamese temple percussion & bells (0dBFS safe):
 *   1. Đại Hồng Chung (4-partial metallic bronze bell with long decay)
 *   2. Mõ Gỗ Tụng Kinh (Bandpass-filtered wooden fish percussion with rate limiting)
 *   3. Chuông Bát Nhã (Singing bowl harmonic chime)
 *   4. Ống Xăm Tre (Bamboo fortune stick shaker)
 *   5. Nhạc Thiền Ngũ Cung (Generative ambient pentatonic zither/bell loop)
 * - Anti-Clipping Master Dynamics Compressor / Limiter.
 * - STRICT Vietnamese-Only TTS Fallback (never falls back to English OS voice; plays incense chime if no Vietnamese voice).
 * - Multi-channel gain mixer (Master, BGM, Bell, Wooden Fish, Ceremony, TTS).
 * - Safe Muted Mode for admin previews (prevents overlapping echo audio).
 */
export class TempleAudioEngine {
  private ctx: AudioContext | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bellGain: GainNode | null = null;
  private woodenFishGain: GainNode | null = null;
  private ceremonyGain: GainNode | null = null;
  private ttsGain: GainNode | null = null;
  private sfxGain: GainNode | null = null; // compatibility alias

  private unlocked = false;
  private isMuted = false;
  private customBgmAudio: HTMLAudioElement | null = null;

  private settings: Pick<
    TempleSettings,
    | 'audioMasterVolume'
    | 'audioMusicVolume'
    | 'audioSfxVolume'
    | 'audioTtsVolume'
    | 'audioBellVolume'
    | 'audioWoodenFishVolume'
    | 'audioCeremonyVolume'
    | 'audioDuckingPercent'
    | 'audioDuckingEnabled'
    | 'ttsEnabled'
    | 'woodenFishRhythmEnabled'
    | 'woodenFishBpm'
  > = {
    audioMasterVolume: 0.9,
    audioMusicVolume: 0.55,
    audioSfxVolume: 0.85,
    audioTtsVolume: 0.95,
    audioBellVolume: 0.9,
    audioWoodenFishVolume: 0.85,
    audioCeremonyVolume: 0.95,
    audioDuckingPercent: 70,
    audioDuckingEnabled: true,
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
  private isAudioLeader = false;
  private currentAudio: HTMLAudioElement | null = null;
  public onPlaybackStarted?: (traceId?: string) => void;
  public onPlaybackFinished?: (traceId?: string) => void;

  public setAudioLeader(isLeader: boolean): void {
    this.isAudioLeader = isLeader;
    if (!isLeader) {
      this.clearTtsQueue();
    }
  }

  public getIsAudioLeader(): boolean {
    return this.isAudioLeader;
  }

  public stopCurrentAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    this.ttsPlaying = false;
    this.setDucking(false);
  }

  public clearTtsQueue(): void {
    this.ttsQueue.length = 0;
    this.stopCurrentAudio();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.settings.audioMasterVolume, now);
    }
    if (muted && this.customBgmAudio) {
      this.customBgmAudio.pause();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public unlock(): boolean {
    if (this.isMuted) return false;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();

        // 1. Master Limiter to prevent clipping / distortion
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(12.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);
        this.limiter.connect(this.ctx.destination);

        // 2. Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.settings.audioMasterVolume;
        this.masterGain.connect(this.limiter);

        // 3. Sub-channels
        this.musicGain = this.ctx.createGain();
        this.bellGain = this.ctx.createGain();
        this.woodenFishGain = this.ctx.createGain();
        this.ceremonyGain = this.ctx.createGain();
        this.ttsGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.gain.value = this.settings.audioMusicVolume;
        this.bellGain.gain.value = this.settings.audioBellVolume ?? 0.9;
        this.woodenFishGain.gain.value = this.settings.audioWoodenFishVolume ?? 0.85;
        this.ceremonyGain.gain.value = this.settings.audioCeremonyVolume ?? 0.95;
        this.ttsGain.gain.value = this.settings.audioTtsVolume;
        this.sfxGain.gain.value = this.settings.audioSfxVolume;

        this.musicGain.connect(this.masterGain);
        this.bellGain.connect(this.masterGain);
        this.woodenFishGain.connect(this.masterGain);
        this.ceremonyGain.connect(this.masterGain);
        this.ttsGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
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
    return this.unlocked && !this.isMuted;
  }

  public applySettings(newSettings: TempleSettings): void {
    this.settings = {
      audioMasterVolume: newSettings.audioMasterVolume,
      audioMusicVolume: newSettings.audioMusicVolume,
      audioSfxVolume: newSettings.audioSfxVolume,
      audioTtsVolume: newSettings.audioTtsVolume,
      audioBellVolume: newSettings.audioBellVolume ?? 0.9,
      audioWoodenFishVolume: newSettings.audioWoodenFishVolume ?? 0.85,
      audioCeremonyVolume: newSettings.audioCeremonyVolume ?? 0.95,
      audioDuckingPercent: newSettings.audioDuckingPercent ?? 70,
      audioDuckingEnabled: newSettings.audioDuckingEnabled ?? true,
      ttsEnabled: newSettings.ttsEnabled,
      woodenFishRhythmEnabled: newSettings.woodenFishRhythmEnabled,
      woodenFishBpm: newSettings.woodenFishBpm
    };

    if (this.ctx && this.masterGain && this.musicGain && this.sfxGain) {
      const now = this.ctx.currentTime;
      if (!this.isMuted) {
        this.masterGain.gain.setTargetAtTime(this.settings.audioMasterVolume, now, 0.08);
      }
      const duckRatio = this.settings.audioDuckingEnabled
        ? Math.max(0.1, (100 - this.settings.audioDuckingPercent) / 100)
        : 1.0;
      const targetMusic = this.ttsPlaying
        ? this.settings.audioMusicVolume * duckRatio
        : this.settings.audioMusicVolume;

      this.musicGain.gain.setTargetAtTime(targetMusic, now, 0.15);
      this.sfxGain.gain.setTargetAtTime(this.settings.audioSfxVolume, now, 0.08);
      if (this.bellGain) this.bellGain.gain.setTargetAtTime(this.settings.audioBellVolume, now, 0.08);
      if (this.woodenFishGain) this.woodenFishGain.gain.setTargetAtTime(this.settings.audioWoodenFishVolume, now, 0.08);
      if (this.ceremonyGain) this.ceremonyGain.gain.setTargetAtTime(this.settings.audioCeremonyVolume, now, 0.08);
      if (this.ttsGain) this.ttsGain.gain.setTargetAtTime(this.settings.audioTtsVolume, now, 0.08);
    }

    this.rescheduleRhythmMo();
  }

  private setDucking(ducked: boolean): void {
    if (!this.ctx || !this.musicGain || !this.settings.audioDuckingEnabled) return;
    const now = this.ctx.currentTime;
    const duckRatio = Math.max(0.1, (100 - this.settings.audioDuckingPercent) / 100);
    const target = ducked
      ? this.settings.audioMusicVolume * duckRatio
      : this.settings.audioMusicVolume;

    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + (ducked ? 0.2 : 0.65));
  }

  private startAmbientLoop(): void {
    if (this.ambientTimer || this.isMuted) return;
    const PENTATONIC_HZ = [196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0];

    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.isMuted || this.settings.audioMusicVolume <= 0.01) return;
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
    if (this.unlocked && !this.isMuted && this.settings.woodenFishRhythmEnabled) {
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
    if (!this.ctx || this.isMuted || (this.settings.audioWoodenFishVolume <= 0.01 && this.settings.audioSfxVolume <= 0.01)) return;
    const nowMs = performance.now();
    if (nowMs - this.lastMoAt < 180) return;
    this.lastMoAt = nowMs;

    try {
      const targetGain = this.woodenFishGain || this.sfxGain || this.masterGain;
      if (!targetGain) return;

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
      gain.connect(targetGain);

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
    if (!this.ctx || this.isMuted || (this.settings.audioBellVolume <= 0.01 && this.settings.audioSfxVolume <= 0.01)) return;
    try {
      const targetGain = this.bellGain || this.sfxGain || this.masterGain;
      if (!targetGain) return;

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
        gain.connect(targetGain);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Chuông Bát Nhã (Incense Singing Bowl Chime)
   */
  public playIncenseChime(): void {
    if (!this.ctx || this.isMuted || (this.settings.audioBellVolume <= 0.01 && this.settings.audioSfxVolume <= 0.01)) return;
    try {
      const targetGain = this.bellGain || this.sfxGain || this.masterGain;
      if (!targetGain) return;

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
        gain.connect(targetGain);
        osc.start(t + idx * 0.11);
        osc.stop(t + idx * 0.11 + 1.15);
      }
    } catch {
      // ignore
    }
  }

  public playFortuneShake(): void {
    if (this.isMuted) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playWoodenFish(1.3 + (i % 2) * 0.15);
      }, i * 115);
    }
  }

  public enqueueTts(payload: TtsBroadcastPayload): void {
    if (!this.settings.ttsEnabled || this.isMuted) return;
    // Only the designated Audio Playback Leader plays TTS audio
    if (!this.isAudioLeader) return;

    if (this.ttsQueue.length >= 15) {
      this.ttsQueue.shift();
    }
    this.ttsQueue.push(payload);
    void this.drainTtsQueue();
  }

  private async drainTtsQueue(): Promise<void> {
    if (this.ttsPlaying || this.ttsQueue.length === 0 || this.isMuted || !this.isAudioLeader) return;
    this.ttsPlaying = true;
    this.setDucking(true);

    try {
      while (this.ttsQueue.length > 0 && !this.isMuted && this.isAudioLeader) {
        const next = this.ttsQueue.shift()!;
        this.onPlaybackStarted?.(next.traceId);

        if (next.audioUrl && this.unlocked) {
          await this.playAudioUrl(next.audioUrl);
        } else {
          // Zero English speech fallback: play gentle sacred singing bowl chime
          this.playIncenseChime();
          await new Promise((r) => setTimeout(r, 1200));
        }

        this.onPlaybackFinished?.(next.traceId);
      }
    } finally {
      this.ttsPlaying = false;
      this.setDucking(false);
    }
  }

  private playAudioUrl(url: string): Promise<void> {
    if (this.isMuted || !this.isAudioLeader) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        this.currentAudio = audio;
        const effectiveVol = Math.max(
          0,
          Math.min(1, this.settings.audioTtsVolume * this.settings.audioMasterVolume)
        );
        audio.volume = effectiveVol;
        const timeout = setTimeout(() => {
          if (this.currentAudio === audio) this.currentAudio = null;
          resolve();
        }, 20000);

        audio.onended = () => {
          clearTimeout(timeout);
          if (this.currentAudio === audio) this.currentAudio = null;
          resolve();
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          if (this.currentAudio === audio) this.currentAudio = null;
          resolve();
        };
        audio.play().catch(() => {
          clearTimeout(timeout);
          if (this.currentAudio === audio) this.currentAudio = null;
          resolve();
        });
      } catch {
        this.currentAudio = null;
        resolve();
      }
    });
  }
}
