import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.10:3000/api';
const TOKEN_KEY = 'basatayo.token';
const PUPIL_KEY = 'basatayo.pupil';

export interface Pupil {
  id: number;
  name: string;
  section?: string;
  teacher?: string | null;
}

let token: string | null = null;

export const api = {
  async restore() {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    const raw = await AsyncStorage.getItem(PUPIL_KEY);
    return { token, pupil: raw ? (JSON.parse(raw) as Pupil) : null };
  },

  async loginPupil(code: string) {
    const res = await request('/auth/pupil/login', { method: 'POST', body: { code } });
    token = res.token;
    await AsyncStorage.multiSet([
      [TOKEN_KEY, res.token],
      [PUPIL_KEY, JSON.stringify(res.pupil)],
    ]);
    return res.pupil as Pupil;
  },

  async logout() {
    token = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, PUPIL_KEY]);
  },

  /** Everything needed to play offline. */
  bundle: () => request('/content/bundle'),

  /** The pupil's stars, highest scores and badges. */
  progress: () => request('/content/progress'),

  /** Posts rounds played offline. The server re-checks the answers and scores them. */
  syncSessions: (sessions: any[]) => request('/sessions/sync', { method: 'POST', body: { sessions } }),
};

async function request(path: string, opts: { method?: string; body?: any } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

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
    const res = await fetch(BASE.replace(/\/api$/, '') + '/api/content/bundle', {
      method: 'HEAD',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.status < 500;
  } catch {
    return false;
  }
}
