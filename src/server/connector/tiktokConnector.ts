import type {
  ConnectorStatus,
  ITikTokConnector,
  NormalizedLiveEvent
} from '../../shared/types.ts';
import { normalizeRawTikTokEvent } from '../router/eventNormalizer.ts';

export interface ReconnectBackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  maxAttempts: number;
}

export const DEFAULT_RECONNECT_CONFIG: ReconnectBackoffConfig = {
  baseDelayMs: 2500,
  maxDelayMs: 60000,
  jitterRatio: 0.25,
  maxAttempts: 25
};

/**
 * Pure function for computing exponential backoff with +/- jitter.
 */
export function computeBackoffWithJitter(
  attempt: number,
  cfg: ReconnectBackoffConfig = DEFAULT_RECONNECT_CONFIG,
  randomFn: () => number = Math.random
): number {
  const safeAttempt = Math.max(0, Math.min(20, Math.floor(attempt)));
  const exp = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(2, safeAttempt));
  const jitter = exp * cfg.jitterRatio * (randomFn() * 2 - 1);
  return Math.max(500, Math.round(exp + jitter));
}

export function normalizeTikTokUniqueId(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const urlMatch = raw.match(/tiktok\.com\/@([^/?#\s]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }
  return raw
    .replace(/^@+/, '')
    .split(/[/?#\s]/)[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 48);
}

/**
 * Pluggable TikTok LIVE Connector Adapter with:
 * - Exponential backoff + jitter
 * - Stale-socket watchdog (60s silence detection)
 * - No TikTok password, cookie, or session ever requested or stored
 */
export class TikTokLiveConnectorAdapter implements ITikTokConnector {
  private status: ConnectorStatus = {
    state: 'idle',
    uniqueId: '',
    roomId: '',
    viewerCount: 0,
    reconnectAttempt: 0,
    nextRetryInMs: 0,
    lastFrameAt: 0,
    lastError: ''
  };

  private readonly backoffCfg: ReconnectBackoffConfig;
  private readonly staleTimeoutMs: number;
  private conn: any = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private manualStop = false;
  private eventHandlers: Array<(event: NormalizedLiveEvent) => void> = [];
  private statusHandlers: Array<(status: ConnectorStatus) => void> = [];

  constructor(options?: {
    backoff?: Partial<ReconnectBackoffConfig>;
    staleTimeoutMs?: number;
  }) {
    this.backoffCfg = { ...DEFAULT_RECONNECT_CONFIG, ...(options?.backoff || {}) };
    this.staleTimeoutMs = options?.staleTimeoutMs ?? 60000;
  }

  public getStatus(): ConnectorStatus {
    return { ...this.status };
  }

  public onEvent(handler: (event: NormalizedLiveEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  public onStatusChange(handler: (status: ConnectorStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  private updateStatus(patch: Partial<ConnectorStatus>): void {
    this.status = { ...this.status, ...patch };
    const snap = this.getStatus();
    for (const fn of this.statusHandlers) {
      fn(snap);
    }
  }

  private emitNormalized(event: NormalizedLiveEvent): void {
    this.status.lastFrameAt = Date.now();
    for (const fn of this.eventHandlers) {
      fn(event);
    }
  }

  public async connect(rawUniqueId: string): Promise<ConnectorStatus> {
    const uniqueId = normalizeTikTokUniqueId(rawUniqueId);
    if (!uniqueId) {
      throw new Error('Vui lòng nhập @username TikTok hợp lệ');
    }

    await this.disconnect();
    this.manualStop = false;
    this.updateStatus({
      state: 'connecting',
      uniqueId,
      roomId: '',
      reconnectAttempt: 0,
      nextRetryInMs: 0,
      lastError: ''
    });

    await this.attemptConnect();
    return this.getStatus();
  }

  private async attemptConnect(): Promise<void> {
    if (this.manualStop || !this.status.uniqueId) return;

    try {
      const lib = await import('tiktok-live-connector');
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } = lib;

      const conn = new TikTokLiveConnection(this.status.uniqueId, {
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        enableExtendedGiftInfo: false,
        ...(process.env.EULER_SIGN_API_KEY ? { signApiKey: process.env.EULER_SIGN_API_KEY } : {})
      });

      this.conn = conn;

      conn.on(ControlEvent.WEBSOCKET_DATA, () => {
        this.status.lastFrameAt = Date.now();
      });

      conn.on(WebcastEvent.CHAT, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('chat', data, 'tiktok'));
      });

      conn.on(WebcastEvent.LIKE, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('like', data, 'tiktok'));
      });

      conn.on(WebcastEvent.GIFT, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('gift', data, 'tiktok'));
      });

      conn.on(WebcastEvent.MEMBER, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('join', data, 'tiktok'));
      });

      conn.on(WebcastEvent.FOLLOW, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('follow', data, 'tiktok'));
      });

      conn.on(WebcastEvent.SHARE, (data: any) => {
        this.emitNormalized(normalizeRawTikTokEvent('share', data, 'tiktok'));
      });

      conn.on(WebcastEvent.ROOM_USER, (data: any) => {
        const evt = normalizeRawTikTokEvent('viewerCount', data, 'tiktok');
        if (evt.viewerCount !== undefined) {
          this.updateStatus({ viewerCount: evt.viewerCount });
        }
        this.emitNormalized(evt);
      });

      conn.on(WebcastEvent.STREAM_END, () => {
        this.manualStop = true;
        this.clearTimers();
        this.updateStatus({
          state: 'offline',
          lastError: 'Phiên phát LIVE đã kết thúc'
        });
      });

      conn.on(ControlEvent.DISCONNECTED, () => {
        if (this.manualStop) return;
        this.scheduleReconnect('Mất kết nối WebSocket với phòng LIVE');
      });

      conn.on(ControlEvent.ERROR, (err: any) => {
        const msg = String(err?.info || err?.message || err || 'Lỗi kết nối TikTok');
        this.updateStatus({ lastError: msg.slice(0, 160) });
      });

      const roomState = await conn.connect();
      this.status.lastFrameAt = Date.now();
      this.updateStatus({
        state: 'connected',
        roomId: String(roomState?.roomId || conn?.roomId || ''),
        reconnectAttempt: 0,
        nextRetryInMs: 0,
        lastError: ''
      });
      this.startWatchdog();
    } catch (err: any) {
      const msg = String(err?.message || err || 'Không kết nối được phòng LIVE');
      const isOffline =
        err?.name === 'UserOfflineError' ||
        msg.toLowerCase().includes('offline') ||
        msg.toLowerCase().includes("isn't online");

      if (isOffline) {
        this.updateStatus({
          state: 'offline',
          lastError: `Kênh @${this.status.uniqueId} hiện chưa phát LIVE`
        });
      } else {
        this.scheduleReconnect(msg.slice(0, 160));
      }
    }
  }

  private scheduleReconnect(reason: string): void {
    if (this.manualStop) return;
    this.clearTimers();

    const attempt = this.status.reconnectAttempt + 1;
    if (attempt > this.backoffCfg.maxAttempts) {
      this.updateStatus({
        state: 'error',
        lastError: `Đã thử kết nối lại ${this.backoffCfg.maxAttempts} lần không thành công: ${reason}`
      });
      return;
    }

    const delayMs = computeBackoffWithJitter(attempt - 1, this.backoffCfg);
    this.updateStatus({
      state: 'reconnecting',
      reconnectAttempt: attempt,
      nextRetryInMs: delayMs,
      lastError: reason
    });

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.attemptConnect();
    }, delayMs);
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.manualStop || this.status.state !== 'connected') return;
      const idleMs = Date.now() - this.status.lastFrameAt;
      if (idleMs > this.staleTimeoutMs) {
        try {
          this.conn?.disconnect();
        } catch {
          // ignore
        }
        this.scheduleReconnect('Kết nối không phản hồi quá 60s (stale socket), đang tự làm mới');
      }
    }, 15000);
  }

  private clearTimers(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public async disconnect(): Promise<void> {
    this.manualStop = true;
    this.clearTimers();
    if (this.conn) {
      try {
        await this.conn.disconnect();
      } catch {
        // ignore
      }
      this.conn = null;
    }
    this.updateStatus({
      state: 'idle',
      roomId: '',
      viewerCount: 0,
      reconnectAttempt: 0,
      nextRetryInMs: 0,
      lastError: ''
    });
  }

  public async verifyRoom(
    uniqueId: string
  ): Promise<{ verified: boolean; uniqueId: string; roomId?: string; message?: string }> {
    const cleanId = normalizeTikTokUniqueId(uniqueId);
    if (!cleanId) {
      return { verified: false, uniqueId: '', message: 'Tên tài khoản TikTok không hợp lệ' };
    }

    try {
      const lib = await import('tiktok-live-connector');
      const { TikTokLiveConnection } = lib;
      const testConn = new TikTokLiveConnection(cleanId, {
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        ...(process.env.EULER_SIGN_API_KEY ? { signApiKey: process.env.EULER_SIGN_API_KEY } : {})
      });
      const isLive = await testConn.fetchIsLive();
      if (!isLive) {
        return {
          verified: false,
          uniqueId: cleanId,
          message: 'Kênh hiện không phát trực tiếp (offline)'
        };
      }
      const roomId = await testConn.fetchRoomId().catch(() => testConn.roomId);
      return {
        verified: true,
        uniqueId: cleanId,
        roomId: roomId ? String(roomId) : undefined,
        message: 'Kênh đang phát trực tiếp!'
      };
    } catch (err: any) {
      return {
        verified: false,
        uniqueId: cleanId,
        message: err?.message || 'Kênh hiện không online hoặc không tìm thấy phòng LIVE'
      };
    }
  }
}
