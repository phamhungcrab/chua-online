import type { EventTraceItem, NormalizedLiveEvent, TraceStage } from '../../shared/types.ts';

export class LiveEventDebugger {
  private readonly maxTraces: number;
  private readonly traces: EventTraceItem[] = [];
  private readonly traceMap: Map<string, EventTraceItem> = new Map();
  private onTraceUpdateCallback?: (trace: EventTraceItem) => void;

  constructor(maxTraces = 80) {
    this.maxTraces = maxTraces;
  }

  public onTraceUpdate(cb: (trace: EventTraceItem) => void): void {
    this.onTraceUpdateCallback = cb;
  }

  public trackReceived(event: NormalizedLiveEvent): EventTraceItem {
    const now = Date.now();
    const traceId = `tr_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const rawContent =
      event.type === 'chat'
        ? event.comment || ''
        : event.type === 'gift'
          ? `${event.gift?.giftName || 'Quà'} ×${event.gift?.repeatCount || 1} (${event.gift?.totalDiamonds || 0} xu)`
          : event.type;

    const item: EventTraceItem = {
      traceId,
      eventId: event.eventId,
      timestamp: event.timestamp || now,
      receivedAt: now,
      source: event.source,
      type: event.type,
      user: {
        id: event.user.id,
        nickname: event.user.nickname,
        uniqueId: event.user.uniqueId
      },
      rawContent,
      stage: 'RECEIVED',
      reason: 'Đã nhận từ connector / nguồn sự kiện',
      updatedAt: now
    };

    this.traces.unshift(item);
    this.traceMap.set(traceId, item);
    this.traceMap.set(event.eventId, item);

    if (this.traces.length > this.maxTraces) {
      const popped = this.traces.pop();
      if (popped) {
        this.traceMap.delete(popped.traceId);
        this.traceMap.delete(popped.eventId);
      }
    }

    this.notify(item);
    return item;
  }

  public updateStage(
    traceIdOrEventId: string,
    stage: TraceStage,
    updates?: Partial<Omit<EventTraceItem, 'traceId' | 'eventId' | 'stage'>>
  ): EventTraceItem | null {
    const item = this.traceMap.get(traceIdOrEventId);
    if (!item) return null;

    item.stage = stage;
    item.updatedAt = Date.now();
    if (updates?.reason !== undefined) item.reason = updates.reason;
    if (updates?.ttsVoice !== undefined) item.ttsVoice = updates.ttsVoice;
    if (updates?.ttsText !== undefined) item.ttsText = updates.ttsText;
    if (updates?.audioUrl !== undefined) item.audioUrl = updates.audioUrl;
    if (updates?.leaderClientId !== undefined) item.leaderClientId = updates.leaderClientId;
    if (updates?.latencyMs !== undefined) {
      item.latencyMs = updates.latencyMs;
    } else {
      item.latencyMs = item.updatedAt - item.receivedAt;
    }

    this.notify(item);
    return item;
  }

  public markDropped(traceIdOrEventId: string, reason: string): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'DROPPED', { reason });
  }

  public markAccepted(traceIdOrEventId: string, detail?: string): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'ACCEPTED', {
      reason: detail || 'Đã chấp nhận và xếp chỗ'
    });
  }

  public markQueued(
    traceIdOrEventId: string,
    ttsVoice: string,
    ttsText: string,
    queuePosition: number
  ): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'QUEUED', {
      ttsVoice,
      ttsText,
      reason: `Đã đưa vào hàng đợi đọc TTS (vị trí #${queuePosition})`
    });
  }

  public markSynthesized(
    traceIdOrEventId: string,
    audioUrl: string | null
  ): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'SYNTHESIZED', {
      audioUrl,
      reason: audioUrl ? 'Đã tổng hợp file âm thanh MP3 thuần Việt' : 'Không có âm thanh (dùng chuông dự phòng)'
    });
  }

  public markPlaying(
    traceIdOrEventId: string,
    leaderClientId: string | null
  ): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'PLAYING', {
      leaderClientId,
      reason: `Đang phát âm thanh trên Playback Leader [${leaderClientId || 'OBS'}]`
    });
  }

  public markCompleted(traceIdOrEventId: string): EventTraceItem | null {
    return this.updateStage(traceIdOrEventId, 'COMPLETED', {
      reason: 'Đã hoàn thành phát âm thanh'
    });
  }

  public getRecentTraces(limit = 50): EventTraceItem[] {
    return this.traces.slice(0, limit);
  }

  public getTrace(traceIdOrEventId: string): EventTraceItem | undefined {
    return this.traceMap.get(traceIdOrEventId);
  }

  public clear(): void {
    this.traces.length = 0;
    this.traceMap.clear();
  }

  private notify(item: EventTraceItem): void {
    if (this.onTraceUpdateCallback) {
      try {
        this.onTraceUpdateCallback({ ...item });
      } catch {
        // ignore
      }
    }
  }
}
