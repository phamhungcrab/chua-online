import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_EVENT_RULES, DEFAULT_SETTINGS } from '../../shared/constants.ts';
import type {
  DispatchedRitual,
  EventActionRule,
  OfferingKind,
  SeatedViewer,
  TempleSettings
} from '../../shared/types.ts';

export interface PersistedTotals {
  meritPoints: number;
  incenseBurned: number;
  woodenFishHits: number;
  bellRings: number;
  lanternsReleased: number;
  fortunesDrawn: number;
  offerings: Record<OfferingKind, number>;
}

const DEFAULT_TOTALS: PersistedTotals = {
  meritPoints: 108,
  incenseBurned: 27,
  woodenFishHits: 108,
  bellRings: 12,
  lanternsReleased: 9,
  fortunesDrawn: 6,
  offerings: {
    lotus: 3,
    lamp: 2,
    fruit: 1,
    dragon: 0
  }
};

export class SqlitePersistenceStore {
  private readonly dbPath: string;
  private readonly backupDir: string;
  private readonly db: DatabaseSync;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.backupDir = path.join(dataDir, 'backups');
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.dbPath = path.join(dataDir, 'temple-studio.sqlite');
    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS viewers (
        id TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        skin TEXT NOT NULL,
        merit_points INTEGER NOT NULL DEFAULT 0,
        incense_count INTEGER NOT NULL DEFAULT 0,
        gifts_count INTEGER NOT NULL DEFAULT 0,
        diamonds_total INTEGER NOT NULL DEFAULT 0,
        last_wish TEXT NOT NULL DEFAULT '',
        joined_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ritual_logs (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        merit_awarded INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  public loadSettings(): TempleSettings {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('settings') as { value_json: string } | undefined;
    if (!row) {
      this.saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(settings: TempleSettings): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('settings', JSON.stringify(settings), Date.now());
  }

  public loadRules(): EventActionRule[] {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('rules') as { value_json: string } | undefined;
    if (!row) {
      const defaults = [...DEFAULT_EVENT_RULES];
      this.saveRules(defaults);
      return defaults;
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_EVENT_RULES];
    } catch {
      return [...DEFAULT_EVENT_RULES];
    }
  }

  public saveRules(rules: EventActionRule[]): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('rules', JSON.stringify(rules), Date.now());
  }

  public loadTotals(): PersistedTotals {
    const row = this.db
      .prepare('SELECT value_json FROM kv_store WHERE key = ?')
      .get('totals') as { value_json: string } | undefined;
    if (!row) {
      this.saveTotals(DEFAULT_TOTALS);
      return JSON.parse(JSON.stringify(DEFAULT_TOTALS));
    }
    try {
      const parsed = JSON.parse(row.value_json);
      return {
        ...DEFAULT_TOTALS,
        ...parsed,
        offerings: { ...DEFAULT_TOTALS.offerings, ...(parsed.offerings || {}) }
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_TOTALS));
    }
  }

  public saveTotals(totals: PersistedTotals): void {
    this.db
      .prepare(
        'INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at'
      )
      .run('totals', JSON.stringify(totals), Date.now());
  }

  public upsertViewer(v: SeatedViewer): void {
    this.db
      .prepare(
        `INSERT INTO viewers (
          id, unique_id, nickname, avatar_url, skin, merit_points, incense_count,
          gifts_count, diamonds_total, last_wish, joined_at, last_active_at, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          unique_id = excluded.unique_id,
          nickname = excluded.nickname,
          avatar_url = excluded.avatar_url,
          skin = excluded.skin,
          merit_points = excluded.merit_points,
          incense_count = excluded.incense_count,
          gifts_count = excluded.gifts_count,
          diamonds_total = excluded.diamonds_total,
          last_wish = excluded.last_wish,
          last_active_at = excluded.last_active_at,
          is_demo = excluded.is_demo`
      )
      .run(
        v.id,
        v.uniqueId,
        v.nickname,
        v.avatarUrl,
        v.skin,
        v.meritPoints,
        v.incenseCount,
        v.giftsCount,
        v.diamondsTotal,
        v.lastWish,
        v.joinedAt,
        v.lastActiveAt,
        v.isDemo ? 1 : 0
      );
  }

  public loadTopViewers(limit = 64): SeatedViewer[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM viewers WHERE is_demo = 0 ORDER BY merit_points DESC, last_active_at DESC LIMIT ?`
      )
      .all(limit) as Array<Record<string, any>>;

    return rows.map((r, idx) => ({
      id: String(r.id),
      uniqueId: String(r.unique_id),
      nickname: String(r.nickname),
      avatarUrl: String(r.avatar_url),
      skin: r.skin,
      seatIndex: idx,
      isVip: idx < 6 && Number(r.merit_points) > 0,
      vipRank: idx < 6 && Number(r.merit_points) > 0 ? idx + 1 : 0,
      meritPoints: Number(r.merit_points),
      incenseCount: Number(r.incense_count),
      giftsCount: Number(r.gifts_count),
      diamondsTotal: Number(r.diamonds_total),
      lastWish: String(r.last_wish),
      joinedAt: Number(r.joined_at),
      lastActiveAt: Number(r.last_active_at),
      isDemo: Boolean(r.is_demo)
    }));
  }

  public logRitual(ritual: DispatchedRitual): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ritual_logs (id, action_type, user_id, nickname, merit_awarded, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ritual.id,
        ritual.actionType,
        ritual.user.id,
        ritual.user.nickname,
        ritual.meritAwarded,
        JSON.stringify(ritual),
        ritual.timestamp
      );

    // Keep table bounded to last 500 records
    this.db.exec(`
      DELETE FROM ritual_logs WHERE id NOT IN (
        SELECT id FROM ritual_logs ORDER BY created_at DESC LIMIT 500
      );
    `);
  }

  public resetSessionData(): PersistedTotals {
    this.db.exec(`DELETE FROM viewers; DELETE FROM ritual_logs;`);
    const fresh: PersistedTotals = {
      meritPoints: 0,
      incenseBurned: 9,
      woodenFishHits: 0,
      bellRings: 0,
      lanternsReleased: 0,
      fortunesDrawn: 0,
      offerings: { lotus: 1, lamp: 1, fruit: 1, dragon: 0 }
    };
    this.saveTotals(fresh);
    return fresh;
  }

  public createBackupSnapshot(): string {
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.loadSettings(),
      rules: this.loadRules(),
      totals: this.loadTotals()
    };
    const fileName = `backup_${Date.now()}.json`;
    const fullPath = path.join(this.backupDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(bundle, null, 2), 'utf8');

    // Keep last 15 backups
    const files = fs.readdirSync(this.backupDir).sort();
    while (files.length > 15) {
      const old = files.shift();
      if (old) {
        try {
          fs.unlinkSync(path.join(this.backupDir, old));
        } catch {
          // ignore
        }
      }
    }
    return fileName;
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}
