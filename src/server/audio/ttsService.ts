import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { TtsBroadcastPayload } from '../../shared/types.ts';

export interface QueuedTtsItem {
  id: string;
  userId?: string;
  text: string;
  voice: 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural' | string;
  ratePercent?: number;
  pitchHz?: number;
  priority: number;
  ttlMs?: number;
  enqueuedAt: number;
  ritualId?: string;
  traceId?: string;
}

/**
 * Priority + TTL TTS Queue with per-user pending comment replacement,
 * SHA-256 disk audio cache, and non-blocking synthesis.
 */
export class PriorityTtsService {
  private readonly cacheDir: string;
  private readonly maxQueueSize: number;
  private readonly maxCacheFiles: number;
  private readonly queue: QueuedTtsItem[] = [];
  private readonly onReadyToBroadcast: (payload: TtsBroadcastPayload) => void;
  private processing = false;
  private seq = 0;
  private droppedTotal = 0;
  private processedTotal = 0;
  private cacheHitsTotal = 0;
  private synthesizeEnabled = true;

  constructor(options: {
    cacheDir: string;
    maxQueueSize?: number;
    maxCacheFiles?: number;
    synthesizeEnabled?: boolean;
    onReadyToBroadcast?: (payload: TtsBroadcastPayload) => void;
  }) {
    this.cacheDir = options.cacheDir;
    this.maxQueueSize = options.maxQueueSize ?? 20;
    this.maxCacheFiles = options.maxCacheFiles ?? 80;
    this.synthesizeEnabled = options.synthesizeEnabled ?? true;
    this.onReadyToBroadcast = options.onReadyToBroadcast || (() => {});
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  public sanitizeVoice(voice?: string): string {
    const raw = String(voice || '').trim();
    if (raw.startsWith('vi-VN-')) {
      return raw;
    }
    return 'vi-VN-HoaiMyNeural';
  }

  public enqueue(item: Omit<QueuedTtsItem, 'id' | 'enqueuedAt'>): boolean {
    const cleanText = String(item.text || '').trim().slice(0, 360);
    if (!cleanText) return false;

    const now = Date.now();
    this.evictExpired(now);

    // If same user already has a lower/equal-priority non-gift item waiting, replace it in place
    if (item.priority < 90 && item.userId) {
      const existingIdx = this.queue.findIndex(
        (q) => q.userId === item.userId && q.priority < 90
      );
      if (existingIdx >= 0) {
        this.queue.splice(existingIdx, 1);
      }
    }

    if (this.queue.length >= this.maxQueueSize) {
      // Find lowest priority item
      let lowestIdx = 0;
      for (let i = 1; i < this.queue.length; i++) {
        if (this.queue[i].priority < this.queue[lowestIdx].priority) {
          lowestIdx = i;
        }
      }
      if (this.queue[lowestIdx].priority >= item.priority) {
        this.droppedTotal++;
        return false;
      }
      this.queue.splice(lowestIdx, 1);
      this.droppedTotal++;
    }

    this.queue.push({
      ...item,
      text: cleanText,
      voice: this.sanitizeVoice(item.voice),
      ratePercent: item.ratePercent ?? -10,
      pitchHz: item.pitchHz ?? -4,
      ttlMs: item.ttlMs ?? 60_000,
      id: `tts_${now}_${++this.seq}`,
      enqueuedAt: now
    });

    this.pump();
    return true;
  }

  public clearQueue(): number {
    const count = this.queue.length;
    this.queue.length = 0;
    return count;
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }

  public evictExpired(now = Date.now()): number {
    let removed = 0;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      const ttl = q.ttlMs ?? 60_000;
      if (ttl > 0 && now - q.enqueuedAt > ttl) {
        this.queue.splice(i, 1);
        this.droppedTotal++;
        removed++;
      }
    }
    return removed;
  }

  public pickNextIndex(): number {
    if (this.queue.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const a = this.queue[i];
      const b = this.queue[best];
      if (a.priority > b.priority || (a.priority === b.priority && a.enqueuedAt < b.enqueuedAt)) {
        best = i;
      }
    }
    return best;
  }

  private pump(): void {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    setImmediate(async () => {
      try {
        while (this.queue.length > 0) {
          this.evictExpired(Date.now());
          const idx = this.pickNextIndex();
          if (idx < 0) break;
          const next = this.queue.splice(idx, 1)[0];
          const audioUrl = await this.synthesizeOrGetCached(next);
          this.processedTotal++;
          this.onReadyToBroadcast({
            id: next.id,
            text: next.text,
            audioUrl,
            voice: next.voice,
            priority: next.priority,
            ritualId: next.ritualId,
            traceId: next.traceId
          });
        }
      } finally {
        this.processing = false;
      }
    });
  }

  public async synthesize(options: {
    text: string;
    voice?: 'vi-VN-NamMinhNeural' | 'vi-VN-HoaiMyNeural' | string;
    ratePercent?: number;
    pitchHz?: number;
  }): Promise<string | null> {
    const cleanText = String(options.text || '').trim().slice(0, 360);
    if (!cleanText) return null;

    // STRICT VIETNAMESE ONLY: Never synthesize or accept any non-vi-VN voice
    const voice = this.sanitizeVoice(options.voice);

    const ratePercent = options.ratePercent ?? -10;
    const pitchHz = options.pitchHz ?? -4;

    const hash = crypto
      .createHash('sha256')
      .update(`${voice}|${ratePercent}|${pitchHz}|${cleanText}`)
      .digest('hex')
      .slice(0, 24);
    const fileName = `tts_v2_${hash}.mp3`;
    const filePath = path.join(this.cacheDir, fileName);

    if (fs.existsSync(filePath)) {
      this.cacheHitsTotal++;
      return `/tts-cache/${fileName}`;
    }

    try {
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const xmlSafeText = cleanText.replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case '"':
            return '&quot;';
          default:
            return '&apos;';
        }
      });

      const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
      const rateStr = `${ratePercent >= 0 ? '+' : ''}${ratePercent}%`;
      const { audioStream } = tts.toStream(xmlSafeText, {
        pitch: pitchStr,
        rate: rateStr
      });

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Edge TTS timeout')), 7000);
        audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        audioStream.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
        audioStream.on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      try {
        tts.close();
      } catch {
        // ignore
      }

      if (chunks.length > 0) {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        this.pruneCacheFiles();
        return `/tts-cache/${fileName}`;
      }
    } catch {
      // Offline or Edge TTS unavailable
    }
    return null;
  }

  private async synthesizeOrGetCached(item: QueuedTtsItem): Promise<string | null> {
    if (!this.synthesizeEnabled) {
      return null;
    }
    return this.synthesize({
      text: item.text,
      voice: item.voice,
      ratePercent: item.ratePercent,
      pitchHz: item.pitchHz
    });
  }

  private pruneCacheFiles(): void {
    try {
      const files = fs
        .readdirSync(this.cacheDir)
        .filter((f) => f.endsWith('.mp3'))
        .map((f) => ({
          name: f,
          mtime: fs.statSync(path.join(this.cacheDir, f)).mtimeMs
        }))
        .sort((a, b) => a.mtime - b.mtime);

      while (files.length > this.maxCacheFiles) {
        const oldest = files.shift();
        if (oldest) {
          fs.unlinkSync(path.join(this.cacheDir, oldest.name));
        }
      }
    } catch {
      // ignore
    }
  }

  public getMetrics(): {
    ttsQueueDepth: number;
    ttsDroppedTotal: number;
    ttsProcessedTotal: number;
    ttsCacheHits: number;
  } {
    return {
      ttsQueueDepth: this.queue.length,
      ttsDroppedTotal: this.droppedTotal,
      ttsProcessedTotal: this.processedTotal,
      ttsCacheHits: this.cacheHitsTotal
    };
  }
}
