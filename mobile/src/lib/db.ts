/**
 * SQLite cache on the device (Fig. 3.3, "Local Cache").
 *
 *  content  — the downloaded lessons, words and game assignment, so the games
 *             run with no internet.
 *  outbox   — finished rounds waiting to be sent to the API.
 *  progress — the pupil's stars and highest scores, so the home screen works offline.
 */
import * as SQLite from 'expo-sqlite';
import { api } from './api';

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;

function db() {
  if (!dbp) {
    dbp = SQLite.openDatabaseAsync('basatayo.db').then(async (d) => {
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS outbox (
          client_id TEXT PRIMARY KEY NOT NULL,
          payload   TEXT NOT NULL,
          played_at TEXT NOT NULL
        );
      `);
      return d;
    });
  }
  return dbp;
}

async function put(key: string, value: unknown) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

async function get<T>(key: string): Promise<T | null> {
  const d = await db();
  const row = await d.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export interface CachedWord {
  id: number;
  word: string;
  syllables: string[];
  theme: string;
  level: string;
  emoji?: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface CachedLesson {
  id: number;
  competencyCode: string;
  title: string;
  target: string;
  body: string;
  say?: string;
  exampleWordId?: number;
  gameType: string;
  level: string;
}

export interface CachedGame {
  id: number;
  gameType: string;
  level: string;
  lessonId: number | null;
  wordIds: number[];
}

export interface Bundle {
  version: string;
  games: CachedGame[];
  lessons: CachedLesson[];
  words: CachedWord[];
}

export const cache = {
  /** Download the content and keep it for offline play. Falls back to what's stored. */
  async refresh(): Promise<Bundle | null> {
    try {
      const bundle = (await api.bundle()) as Bundle;
      await put('bundle', bundle);
      return bundle;
    } catch {
      return get<Bundle>('bundle');
    }
  },

  bundle: () => get<Bundle>('bundle'),

  async progress() {
    try {
      const p = await api.progress();
      await put('progress', p);
      return p;
    } catch {
      return (await get<any>('progress')) ?? { scores: [], badges: [] };
    }
  },

  saveProgress: (p: unknown) => put('progress', p),
};

export interface PendingSession {
  clientId: string;
  gameType: string;
  level: string;
  playedAt: string;
  answers: { wordId?: number; prompt: string; given?: string; isCorrect: boolean }[];
}

export const outbox = {
  async add(session: PendingSession) {
    const d = await db();
    await d.runAsync(
      'INSERT OR REPLACE INTO outbox (client_id, payload, played_at) VALUES (?, ?, ?)',
      session.clientId,
      JSON.stringify(session),
      session.playedAt,
    );
  },

  async count() {
    const d = await db();
    const row = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM outbox');
    return row?.n ?? 0;
  },

  async all(): Promise<PendingSession[]> {
    const d = await db();
    const rows = await d.getAllAsync<{ payload: string }>('SELECT payload FROM outbox ORDER BY played_at ASC');
    return rows.map((r) => JSON.parse(r.payload));
  },

  /**
   * Sends everything waiting. Each round carries a clientId, so sending twice
   * never creates a duplicate on the server.
   *
   * Never throws: when offline (or the server refuses) the rounds stay queued
   * and `ok` is false. Only rounds the server answered for are removed.
   */
  async flush(): Promise<FlushResult> {
    const pending = await outbox.all();
    if (!pending.length) return { ok: true, sent: 0, results: {} };

    let res: { results: SyncResult[] };
    try {
      res = (await api.syncSessions(pending)) as { results: SyncResult[] };
    } catch {
      return { ok: false, sent: 0, results: {} };
    }

    const results: Record<string, SyncResult> = {};
    for (const r of res?.results ?? []) results[r.clientId] = r;

    const d = await db();
    for (const p of pending) {
      if (results[p.clientId]) await d.runAsync('DELETE FROM outbox WHERE client_id = ?', p.clientId);
    }
    return { ok: true, sent: Object.keys(results).length, results };
  },
};

export interface EarnedBadge {
  key: string;
  name: string;
  description: string;
}

/** The server's scoring of one round (POST /sessions/sync). */
export interface SyncResult {
  clientId: string;
  sessionId: number;
  /** true when the server already had this round; then accuracy is omitted and newBadges is empty. */
  duplicate: boolean;
  stars: number;
  score: number;
  accuracy?: number;
  isNewBest: boolean;
  newBadges: EarnedBadge[];
}

export interface FlushResult {
  ok: boolean;
  sent: number;
  results: Record<string, SyncResult>;
}

export function newClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
