/**
 * SQLite cache on the device (Fig. 3.3, "Local Cache").
 *
 *  content  — the downloaded lessons, words and game assignment, so the games
 *             run with no internet.
 *  outbox   — finished rounds waiting to be sent to the API, tagged with the
 *             pupil who played them so a shared tablet never mixes pupils up.
 *  progress — each pupil's stars, highest scores and badges under progress:<pupilId>,
 *             so the home screen works offline without showing another pupil's numbers.
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
          played_at TEXT NOT NULL,
          pupil_id  INTEGER
        );
      `);
      // Installs from before pupil_id: add the column; old rows stay NULL and
      // are sent for whoever is logged in, since they predate the tagging.
      const cols = await d.getAllAsync<{ name: string }>('PRAGMA table_info(outbox)');
      if (!cols.some((c) => c.name === 'pupil_id')) {
        await d.execAsync('ALTER TABLE outbox ADD COLUMN pupil_id INTEGER');
      }
      // Installs from before per-pupil progress kept one shared 'progress' entry;
      // we can't tell whose it was, so drop it rather than show it to the next pupil.
      await d.runAsync("DELETE FROM kv WHERE key = 'progress'");
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

  /**
   * The logged-in pupil's progress: fresh from the API when online, else that
   * pupil's own cached copy, else zeros. Never another pupil's entry.
   */
  async progress(): Promise<Progress> {
    const pupilId = api.currentPupil()?.id;
    if (pupilId == null) return emptyProgress();
    const key = `progress:${pupilId}`;
    try {
      const p = (await api.progress()) as Progress;
      await put(key, p);
      return p;
    } catch {
      return (await get<Progress>(key)) ?? emptyProgress();
    }
  },
};

export interface Progress {
  scores: any[];
  badges: any[];
}

export const emptyProgress = (): Progress => ({ scores: [], badges: [] });

export interface PendingSession {
  clientId: string;
  gameType: string;
  level: string;
  playedAt: string;
  answers: { wordId?: number; prompt: string; given?: string; isCorrect: boolean }[];
}

export const outbox = {
  /** Queues a round for the logged-in pupil. */
  async add(session: PendingSession) {
    const d = await db();
    await d.runAsync(
      'INSERT OR REPLACE INTO outbox (client_id, payload, played_at, pupil_id) VALUES (?, ?, ?, ?)',
      session.clientId,
      JSON.stringify(session),
      session.playedAt,
      api.currentPupil()?.id ?? null,
    );
  },

  /** Rounds waiting for the logged-in pupil (plus untagged rounds from older installs). */
  async count() {
    const pupilId = api.currentPupil()?.id;
    if (pupilId == null) return 0;
    const d = await db();
    const row = await d.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) as n FROM outbox WHERE pupil_id = ? OR pupil_id IS NULL',
      pupilId,
    );
    return row?.n ?? 0;
  },

  async all(): Promise<PendingSession[]> {
    const pupilId = api.currentPupil()?.id;
    if (pupilId == null) return [];
    const d = await db();
    const rows = await d.getAllAsync<{ payload: string }>(
      'SELECT payload FROM outbox WHERE pupil_id = ? OR pupil_id IS NULL ORDER BY played_at ASC',
      pupilId,
    );
    return rows.map((r) => JSON.parse(r.payload));
  },

  /**
   * Sends the logged-in pupil's waiting rounds; other pupils' rounds stay
   * queued until they log in. Each round carries a clientId, so sending twice
   * never creates a duplicate on the server.
   *
   * Never throws: when the request fails (offline, timeout) the rounds stay
   * queued and `ok` is false. A round leaves the queue when the server says
   * ok, duplicate or rejected (a rejected round can never succeed); a round
   * the server failed on stays for the next try.
   */
  async flush(): Promise<FlushResult> {
    const pending = await outbox.all();
    if (!pending.length) return { ok: true, sent: 0, results: {} };

    let res: { results: SyncOutcome[] };
    try {
      res = (await api.syncSessions(pending)) as { results: SyncOutcome[] };
    } catch {
      return { ok: false, sent: 0, results: {} };
    }

    const results: Record<string, SyncResult> = {};
    const done = new Set<string>();
    for (const r of res?.results ?? []) {
      if (r.status === 'ok' || r.status === 'duplicate') {
        results[r.clientId] = r;
        done.add(r.clientId);
      } else if (r.status === 'rejected') {
        console.warn(`[outbox] round ${r.clientId} rejected by server: ${r.reason}`);
        done.add(r.clientId);
      }
    }

    const d = await db();
    for (const p of pending) {
      if (done.has(p.clientId)) await d.runAsync('DELETE FROM outbox WHERE client_id = ?', p.clientId);
    }
    return { ok: true, sent: Object.keys(results).length, results };
  },
};

export interface EarnedBadge {
  key: string;
  name: string;
  description: string;
}

/**
 * The server's scoring of one round (POST /sessions/sync). A duplicate is a
 * round the server already stored: its stored scoring, isNewBest false and no
 * new badges.
 */
export interface SyncResult {
  clientId: string;
  status: 'ok' | 'duplicate';
  sessionId: number;
  stars: number;
  score: number;
  accuracy: number;
  isNewBest: boolean;
  newBadges: EarnedBadge[];
}

/** One entry of the sync response; mirrors SyncOutcome in api/src/sessions/dto.ts. */
type SyncOutcome =
  | SyncResult
  | { clientId: string; status: 'rejected' | 'failed'; reason: string };

export interface FlushResult {
  ok: boolean;
  sent: number;
  results: Record<string, SyncResult>;
}

export function newClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
