import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ConfigBundleExportSchema,
  EventActionRuleSchema,
  SimEventTriggerSchema,
  TempleSettingsPartialSchema
} from '../shared/schemas.ts';
import type {
  ITikTokConnector,
  ServerToClientWsMessage,
  TempleStateSnapshot
} from '../shared/types.ts';
import { PriorityTtsService } from './audio/ttsService.ts';
import { TikTokLiveConnectorAdapter } from './connector/tiktokConnector.ts';
import { SqlitePersistenceStore } from './persistence/sqliteStore.ts';
import { normalizeRawTikTokEvent } from './router/eventNormalizer.ts';
import { OfflineEventSimulator } from './simulator/offlineSimulator.ts';
import { TempleStateEngine } from './state/templeStateEngine.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon'
};

interface ExtendedWebSocket extends WebSocket {
  role: 'overlay' | 'admin';
  clientId: string;
}

export interface StudioServerInstance {
  server: http.Server;
  port: number;
  host: string;
  adminToken: string;
  engine: TempleStateEngine;
  simulator: OfflineEventSimulator;
  connector: ITikTokConnector;
  store: SqlitePersistenceStore;
  close: () => Promise<void>;
}

export function isAllowedLocalHostHeader(hostHeader: string | undefined, port: number): boolean {
  if (!hostHeader) return false;
  const h = hostHeader.trim().toLowerCase();
  return (
    h === `localhost:${port}` ||
    h === `127.0.0.1:${port}` ||
    h === `[::1]:${port}` ||
    h === 'localhost' ||
    h === '127.0.0.1'
  );
}

export function isAllowedOriginHeader(originHeader: string | undefined, port: number): boolean {
  if (!originHeader) return true; // Non-browser local client or OBS Browser Source without Origin
  try {
    const parsed = new URL(originHeader);
    return isAllowedLocalHostHeader(parsed.host, port);
  } catch {
    return false;
  }
}

export function safeResolveFileWithinRoot(rootDir: string, relativeUrlPath: string): string | null {
  if (!relativeUrlPath || relativeUrlPath.includes('\0')) return null;
  const normalizedUrl = relativeUrlPath.replace(/^[/\\]+/, '');
  const segments = normalizedUrl.split(/[/\\]+/);
  if (segments.some((s) => s.startsWith('.') || s === 'node_modules')) {
    return null;
  }

  const candidate = path.resolve(rootDir, normalizedUrl);
  const rel = path.relative(rootDir, candidate);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    return null;
  }

  if (!fs.existsSync(candidate)) return null;
  try {
    const realRoot = fs.realpathSync(rootDir);
    const realCandidate = fs.realpathSync(candidate);
    const realRel = path.relative(realRoot, realCandidate);
    if (realRel === '..' || realRel.startsWith('..' + path.sep) || path.isAbsolute(realRel)) {
      return null;
    }
    const stat = fs.statSync(realCandidate);
    if (!stat.isFile()) return null;
    return realCandidate;
  } catch {
    return null;
  }
}

export async function createStudioServer(options?: {
  port?: number;
  host?: string;
  dataDir?: string;
  adminToken?: string;
  synthesizeTtsEnabled?: boolean;
  connector?: ITikTokConnector;
}): Promise<StudioServerInstance> {
  const host = options?.host || process.env.HOST || '127.0.0.1';
  const requestedPort = options?.port ?? Number(process.env.PORT || 3000);
  const dataDir = options?.dataDir || path.join(PROJECT_ROOT, 'data');
  const ttsCacheDir = path.join(dataDir, 'tts-cache');
  const clientDistDir = path.join(PROJECT_ROOT, 'dist', 'client');
  const publicDir = path.join(PROJECT_ROOT, 'public');

  const adminToken =
    options?.adminToken ||
    process.env.TEMPLE_ADMIN_TOKEN ||
    crypto.randomBytes(24).toString('hex');

  const store = new SqlitePersistenceStore(dataDir);

  let wss: WebSocketServer;
  let stateFlushTimer: ReturnType<typeof setTimeout> | null = null;

  function broadcastWs(msg: ServerToClientWsMessage, roleFilter?: 'overlay' | 'admin'): void {
    if (!wss || wss.clients.size === 0) return;
    const raw = JSON.stringify(msg);
    for (const c of wss.clients) {
      const ext = c as ExtendedWebSocket;
      if (ext.readyState === WebSocket.OPEN && (!roleFilter || ext.role === roleFilter)) {
        try {
          ext.send(raw);
        } catch {
          // ignore dead socket
        }
      }
    }
  }

  function scheduleSnapshotBroadcast(): void {
    if (stateFlushTimer) return;
    stateFlushTimer = setTimeout(() => {
      stateFlushTimer = null;
      broadcastWs({
        type: 'snapshot',
        snapshot: getFullSnapshot()
      });
    }, 300);
  }

  const tts = new PriorityTtsService({
    cacheDir: ttsCacheDir,
    synthesizeEnabled: options?.synthesizeTtsEnabled ?? true,
    onReadyToBroadcast: (ttsPayload) => {
      broadcastWs({
        type: 'tts',
        tts: ttsPayload
      });
    }
  });

  const engine = new TempleStateEngine({
    store,
    tts,
    onRitual: (ritual, totals, communityGoal) => {
      broadcastWs({
        type: 'ritual',
        ritual,
        totals,
        communityGoal
      });
      scheduleSnapshotBroadcast();
    },
    onLikeBatch: (batch) => {
      broadcastWs({
        type: 'likeBatch',
        ...batch
      });
    },
    onStreakProgress: (info) => {
      broadcastWs({
        type: 'giftStreakProgress',
        ...info
      });
    },
    onPrayer: (prayer) => {
      broadcastWs({
        type: 'prayer',
        prayer
      });
      scheduleSnapshotBroadcast();
    },
    onStateChanged: () => {
      scheduleSnapshotBroadcast();
    }
  });

  const simulator = new OfflineEventSimulator((evt) => {
    engine.ingestEvent(evt);
  });

  const connector: ITikTokConnector = options?.connector ?? new TikTokLiveConnectorAdapter();
  connector.onEvent((evt) => {
    engine.ingestEvent(evt);
  });
  connector.onStatusChange((st) => {
    broadcastWs({
      type: 'Log' as any,
      level: st.state === 'error' ? 'error' : 'info',
      message: `TikTok [${st.state}] @${st.uniqueId || '-'} ${st.lastError || ''}`,
      timestamp: new Date().toISOString()
    } as ServerToClientWsMessage);
    scheduleSnapshotBroadcast();
  });

  function getFullSnapshot(): TempleStateSnapshot {
    return engine.getSnapshot(connector.getStatus(), simulator.getStatus());
  }

  let activePort = requestedPort;

  const server = http.createServer(async (req, res) => {
    // Security headers on every response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (!isAllowedLocalHostHeader(req.headers.host, activePort)) {
      res.writeHead(421, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Forbidden Host header (DNS rebinding guard)' }));
      return;
    }

    if (!isAllowedOriginHeader(req.headers.origin, activePort)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Forbidden Origin header' }));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${activePort}`);
    } catch {
      res.writeHead(400).end('Bad URL');
      return;
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(parsedUrl.pathname);
    } catch {
      res.writeHead(400).end('Malformed URI');
      return;
    }

    if (pathname.includes('\0')) {
      res.writeHead(400).end('Null byte rejected');
      return;
    }

    // 1. Public Read-Only Health & State Endpoints
    if (req.method === 'GET' && pathname === '/api/health') {
      const snap = getFullSnapshot();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          ok: true,
          status: 'healthy',
          uptimeSec: snap.uptimeSec,
          connector: snap.connector.state,
          simulatorRunning: snap.simulator.running,
          seatedCount: snap.seatedViewers.length,
          metrics: snap.metrics
        })
      );
      return;
    }

    if (req.method === 'GET' && pathname === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, snapshot: getFullSnapshot() }));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/config/export') {
      const snap = getFullSnapshot();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="temple-live-config.json"'
      });
      res.end(
        JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: snap.settings,
            rules: snap.rules
          },
          null,
          2
        )
      );
      return;
    }

    // 2. Protected Admin Endpoints
    if (pathname.startsWith('/api/admin/')) {
      if (req.method !== 'POST') {
        res.writeHead(405).end('Method Not Allowed');
        return;
      }

      const headerToken = String(req.headers['x-admin-token'] || '');
      if (headerToken !== adminToken) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: thiếu hoặc sai X-Admin-Token' }));
        return;
      }

      let body: Record<string, any> = {};
      try {
        body = await readJsonBody(req, 256 * 1024);
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Invalid JSON body' }));
        return;
      }

      try {
        const result = await handleAdminAction(pathname, body, {
          engine,
          simulator,
          connector,
          getFullSnapshot
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
      }
      return;
    }

    // 3. Static Serving (/tts-cache/*, /overlay, /admin, /assets/*)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end('Method Not Allowed');
      return;
    }

    if (pathname === '/favicon.ico') {
      const lotusSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#2A0B05" stroke="#F6C86A" stroke-width="3"/><path d="M32 12 C24 24 22 36 32 48 C42 36 40 24 32 12 Z" fill="#FF9EB5" stroke="#F6C86A" stroke-width="1.5"/></svg>';
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(lotusSvg);
      return;
    }

    if (pathname.startsWith('/tts-cache/')) {
      const rel = pathname.slice('/tts-cache/'.length);
      if (!rel.endsWith('.mp3') && !rel.endsWith('.wav')) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const resolved = safeResolveFileWithinRoot(ttsCacheDir, rel);
      if (!resolved) {
        res.writeHead(404).end('Not found');
        return;
      }
      serveStaticFile(req, res, resolved);
      return;
    }

    // Route aliases
    let routePath = pathname;
    if (routePath === '/' || routePath === '/overlay') {
      routePath = '/overlay.html';
    } else if (routePath === '/admin') {
      routePath = '/admin.html';
    }

    // Serve /admin.html with injected local session admin token meta tag so local admin UI works out of the box
    if (routePath === '/admin.html') {
      const adminHtmlPath =
        safeResolveFileWithinRoot(clientDistDir, 'admin.html') ||
        safeResolveFileWithinRoot(path.join(PROJECT_ROOT, 'src/client'), 'admin.html');
      if (!adminHtmlPath) {
        res.writeHead(404).end('admin.html not found (run npm run build first)');
        return;
      }
      const html = fs
        .readFileSync(adminHtmlPath, 'utf8')
        .replace('__TEMPLE_ADMIN_TOKEN__', adminToken);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(req.method === 'HEAD' ? undefined : html);
      return;
    }

    const resolvedDist =
      safeResolveFileWithinRoot(clientDistDir, routePath) ||
      safeResolveFileWithinRoot(publicDir, routePath);
    if (!resolvedDist) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    serveStaticFile(req, res, resolvedDist);
  });

  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 64 * 1024,
    verifyClient: ({ origin, req }: { origin: string; req: http.IncomingMessage }) => {
      if (!isAllowedLocalHostHeader(req.headers.host, activePort)) return false;
      if (!isAllowedOriginHeader(origin, activePort)) return false;
      return true;
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const ext = ws as ExtendedWebSocket;
    const url = new URL(req.url || '/ws', `http://127.0.0.1:${activePort}`);
    const requestedRole = url.searchParams.get('role');
    const tokenParam = url.searchParams.get('token');

    ext.role =
      requestedRole === 'admin' && tokenParam === adminToken ? 'admin' : 'overlay';
    ext.clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    ext.send(
      JSON.stringify({
        type: 'snapshot',
        snapshot: getFullSnapshot()
      } satisfies ServerToClientWsMessage)
    );

    ext.on('message', async (rawBuf) => {
      try {
        const msg = JSON.parse(rawBuf.toString('utf8'));
        if (!msg || typeof msg !== 'object') return;

        // Overlay clients can only report lightweight performance telemetry
        if (msg.type === 'perf' && msg.report) {
          engine.recordClientPerf({
            clientId: ext.clientId,
            fps: Number(msg.report.fps) || 0,
            frameTimeMs: Number(msg.report.frameTimeMs) || 0,
            droppedFrames: Number(msg.report.droppedFrames) || 0,
            activeActors: Number(msg.report.activeActors) || 0,
            activeParticles: Number(msg.report.activeParticles) || 0,
            rendererType: String(msg.report.rendererType || 'canvas').slice(0, 32),
            jsHeapMb: Number(msg.report.jsHeapMb) || 0,
            reportedAt: Date.now()
          });
          return;
        }
      } catch {
        // ignore invalid message
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, host, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        activePort = addr.port;
      }
      resolve();
    });
  });

  async function close(): Promise<void> {
    if (stateFlushTimer) clearTimeout(stateFlushTimer);
    simulator.stop();
    await connector.disconnect();
    engine.shutdown();
    for (const c of wss.clients) {
      try {
        c.close();
      } catch {
        // ignore
      }
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }

  return {
    server,
    port: activePort,
    host,
    adminToken,
    engine,
    simulator,
    connector,
    store,
    close
  };
}

async function handleAdminAction(
  pathname: string,
  body: Record<string, any>,
  ctx: {
    engine: TempleStateEngine;
    simulator: OfflineEventSimulator;
    connector: ITikTokConnector;
    getFullSnapshot: () => TempleStateSnapshot;
  }
): Promise<Record<string, any>> {
  switch (pathname) {
    case '/api/admin/settings': {
      const parsed = TempleSettingsPartialSchema.parse(body);
      const settings = ctx.engine.updateSettings(parsed);
      return { settings, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/rules/upsert': {
      const rule = EventActionRuleSchema.parse(body);
      const rules = ctx.engine.upsertRule(rule);
      return { rules, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/rules/delete': {
      const ruleId = String(body.id || '').trim();
      if (!ruleId) throw new Error('Thiếu rule id cần xóa');
      const rules = ctx.engine.deleteRule(ruleId);
      return { rules, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/config/import': {
      const bundle = ConfigBundleExportSchema.parse(body);
      ctx.engine.importConfigBundle(bundle);
      return { snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/sim/event': {
      const payload = SimEventTriggerSchema.parse(body);
      const raw: Record<string, any> = {
        user: {
          uniqueId: payload.uniqueId || 'phat_tu_demo',
          nickname: payload.nickname || 'Phật Tử Minh Tâm'
        },
        comment: payload.comment,
        likeCount: payload.likeCount,
        giftName: payload.giftName,
        diamondCount: payload.diamondCount,
        repeatCount: payload.repeatCount,
        repeatEnd: payload.repeatEnd ?? true,
        giftType: payload.giftType ?? 0,
        groupId: payload.groupId
      };
      const evt = normalizeRawTikTokEvent(payload.type, raw, 'admin');
      const ritual = ctx.engine.ingestEvent(evt);
      return { ritual, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/sim/auto': {
      const enabled = Boolean(body.enabled);
      const scenario =
        body.scenario === 'busy' || body.scenario === 'grand_festival'
          ? body.scenario
          : 'serene';
      const intervalMs = body.intervalMs ? Number(body.intervalMs) : undefined;
      const status = enabled
        ? ctx.simulator.start(scenario, intervalMs)
        : ctx.simulator.stop();
      return { simulator: status, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/sim/burst': {
      const count = Math.max(10, Math.min(2500, Number(body.count) || 200));
      const res = ctx.simulator.runBurst(count);
      return { burst: res, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/congregation/fill': {
      const count = Math.max(1, Math.min(100, Number(body.count) || 24));
      ctx.engine.seedDemoCongregation(count);
      return { snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/congregation/clear': {
      ctx.engine.clearDemoCongregation();
      return { snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/ritual/chant': {
      const ritual = ctx.engine.triggerPeriodicChant();
      return { ritual, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/ritual/flowers': {
      const ritual = ctx.engine.ingestEvent({
        eventId: `admin_flower_${Date.now()}`,
        type: 'chat',
        timestamp: Date.now(),
        source: 'admin',
        user: { id: 'admin_user', uniqueId: 'admin_user', nickname: 'Phật Tử Tại Gia', avatarUrl: '' },
        comment: 'Con thành tâm dâng mâm hoa sen tươi cúng dường Tam Bảo'
      });
      return { ritual, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/ritual/serene': {
      const ritual = ctx.engine.triggerSereneIdleAction();
      return { ritual, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/session/reset': {
      ctx.engine.resetSession();
      return { snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/tiktok/connect': {
      const uniqueId = String(body.uniqueId || '').trim();
      const status = await ctx.connector.connect(uniqueId);
      return { connector: status, snapshot: ctx.getFullSnapshot() };
    }

    case '/api/admin/tiktok/disconnect': {
      await ctx.connector.disconnect();
      return { connector: ctx.connector.getStatus(), snapshot: ctx.getFullSnapshot() };
    }

    default:
      throw new Error(`Không tìm thấy endpoint quản trị: ${pathname}`);
  }
}

function readJsonBody(req: http.IncomingMessage, maxBytes: number): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new Error('Payload vượt quá giới hạn cho phép'));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Dữ liệu JSON không hợp lệ'));
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string
): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}
