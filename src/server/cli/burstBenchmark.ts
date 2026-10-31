import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PriorityTtsService } from '../audio/ttsService.ts';
import { SqlitePersistenceStore } from '../persistence/sqliteStore.ts';
import { OfflineEventSimulator } from '../simulator/offlineSimulator.ts';
import { TempleStateEngine } from '../state/templeStateEngine.ts';
import type { ConnectorStatus } from '../../shared/types.ts';

const IDLE_CONNECTOR_STATUS: ConnectorStatus = {
  state: 'idle',
  uniqueId: '',
  roomId: '',
  viewerCount: 0,
  reconnectAttempt: 0,
  nextRetryInMs: 0,
  lastFrameAt: 0,
  lastError: ''
};

async function runBurstBench(): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temple-burst-bench-'));
  const ttsCacheDir = path.join(tmpDir, 'tts');

  const store = new SqlitePersistenceStore(tmpDir);
  const tts = new PriorityTtsService({
    cacheDir: ttsCacheDir,
    maxQueueSize: 50,
    synthesizeEnabled: false,
    onReadyToBroadcast: () => {}
  });

  let dispatchedRitualsCount = 0;
  let likeBatchesCount = 0;

  const engine = new TempleStateEngine({
    store,
    tts,
    onRitual: () => {
      dispatchedRitualsCount += 1;
    },
    onLikeBatch: () => {
      likeBatchesCount += 1;
    },
    onStreakProgress: () => {},
    onStateChanged: () => {}
  });

  const simulator = new OfflineEventSimulator((evt) => {
    engine.ingestEvent(evt);
  });

  const memBefore = process.memoryUsage();
  console.log('=== TEMPLE LIVE STUDIO — BURST & STRESS BENCHMARK ===');
  console.log(
    `Initial RSS: ${(memBefore.rss / (1024 * 1024)).toFixed(2)} MB | HeapUsed: ${(memBefore.heapUsed / (1024 * 1024)).toFixed(2)} MB`
  );

  // Phase A: 250-event burst
  const r250 = simulator.runBurst(250);
  const snap250 = engine.getSnapshot(IDLE_CONNECTOR_STATUS, simulator.getStatus());
  console.log(
    `[Burst 250] Completed in ${r250.durationMs} ms (${((250 / Math.max(0.1, r250.durationMs)) * 1000).toFixed(0)} events/sec) | Active Visitors: ${snap250.seatedViewers.length}/${snap250.seatCapacity}`
  );

  // Phase B: 1,000-event high-concurrency burst
  const r1000 = simulator.runBurst(1000);
  const snap1000 = engine.getSnapshot(IDLE_CONNECTOR_STATUS, simulator.getStatus());
  const memAfter = process.memoryUsage();

  console.log(
    `[Burst 1000] Completed in ${r1000.durationMs} ms (${((1000 / Math.max(0.1, r1000.durationMs)) * 1000).toFixed(0)} events/sec)`
  );
  console.log(
    `[State Metrics] Dispatched Rituals: ${dispatchedRitualsCount} | Like Batches: ${likeBatchesCount} | Seated Visitors: ${snap1000.seatedViewers.length}/${snap1000.seatCapacity}`
  );
  console.log(
    `[Queue Metrics] Accepted: ${snap1000.metrics.eventsAcceptedTotal} | Deduplicated: ${snap1000.metrics.eventsDeduplicatedTotal} | Rate-Limited: ${snap1000.metrics.eventsRateLimitedTotal} | Moderated: ${snap1000.metrics.eventsModeratedTotal}`
  );
  console.log(
    `[Memory After 1,250 Events] RSS: ${(memAfter.rss / (1024 * 1024)).toFixed(2)} MB | HeapUsed: ${(memAfter.heapUsed / (1024 * 1024)).toFixed(2)} MB`
  );

  engine.shutdown();
  store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

runBurstBench().catch((err) => {
  console.error('Burst benchmark failed:', err);
  process.exit(1);
});
