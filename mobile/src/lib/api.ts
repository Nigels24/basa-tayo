import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * EXPO_PUBLIC_API_URL is baked into the app when it is bundled, not read on the phone.
 * - Expo Go: .env holds the computer's LAN IP (the phone shares its Wi-Fi).
 * - APK (eas build): EAS does not upload the gitignored .env, so the deployed
 *   https API URL must be set as an EAS environment variable for the profile
 *   (see README, "APK for the defense"). Never a LAN IP or localhost: the phone
 *   won't be on this Wi-Fi, and release builds block plain http.
 * The fallback below only works on the developer's Wi-Fi.
 */
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.10:3000/api';
const TOKEN_KEY = 'basatayo.token';
const PUPIL_KEY = 'basatayo.pupil';

/** How long a request may take before it counts as offline. */
const TIMEOUT_MS = 10_000;
const SYNC_TIMEOUT_MS = 20_000;

export interface Pupil {
  id: number;
  name: string;
  section?: string;
  teacher?: string | null;
}

let token: string | null = null;
let pupil: Pupil | null = null;

export const api = {
  async restore() {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    const raw = await AsyncStorage.getItem(PUPIL_KEY);
    pupil = raw ? (JSON.parse(raw) as Pupil) : null;
    return { token, pupil };
  },

  /** The logged-in pupil, or null. The outbox uses this to tag and pick rounds. */
  currentPupil: () => pupil,

  async loginPupil(code: string) {
    const res = await request('/auth/pupil/login', { method: 'POST', body: { code } });
    token = res.token;
    pupil = res.pupil as Pupil;
    await AsyncStorage.multiSet([
      [TOKEN_KEY, res.token],
      [PUPIL_KEY, JSON.stringify(res.pupil)],
    ]);
    return res.pupil as Pupil;
  },

  async logout() {
    token = null;
    pupil = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, PUPIL_KEY]);
  },

  /** Everything needed to play offline. */
  bundle: () => request('/content/bundle'),

  /** The pupil's stars, highest scores and badges. */
  progress: () => request('/content/progress'),

  /** Posts rounds played offline. The server re-checks the answers and scores them. */
  syncSessions: (sessions: unknown[]) => request('/sessions/sync', { method: 'POST', body: { sessions }, timeoutMs: SYNC_TIMEOUT_MS }),
};

/** fetch that gives up after `ms`; a timeout rejects like any network failure. */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error('Walang sagot ang server. Subukan muli mamaya.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function request(path: string, opts: { method?: string; body?: any; timeoutMs?: number } = {}) {
  const res = await fetchWithTimeout(
    BASE + path,
    {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    },
    opts.timeoutMs ?? TIMEOUT_MS,
  );

  if (!res.ok) {
    let message = 'May problema sa koneksyon.';
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message[0] : data.message ?? message;
    } catch {}
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

/** Quick check used by the sync banner. */
export async function isOnline() {
  try {
    const res = await fetchWithTimeout(
      BASE.replace(/\/api$/, '') + '/api/content/bundle',
      { method: 'HEAD', headers: token ? { Authorization: `Bearer ${token}` } : {} },
      TIMEOUT_MS,
    );
    return res.status < 500;
  } catch {
    return false;
  }
}
