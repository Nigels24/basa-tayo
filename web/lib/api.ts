'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const TOKEN_KEY = 'basatayo.teacher.token';
const NAME_KEY = 'basatayo.teacher';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getTeacher() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(NAME_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function login(username: string, password: string) {
  const res = await request('/auth/teacher/login', { method: 'POST', body: { username, password } });
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(NAME_KEY, JSON.stringify(res.teacher));
  return res.teacher;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

/** An error response from the API; status lets a form react to e.g. 409 Conflict. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request(path: string, opts: { method?: string; body?: any } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Please log in again');
  }
  if (!res.ok) {
    let message = 'Something went wrong';
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message[0] : data.message ?? message;
    } catch {}
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? null : res.json();
}

/** Fetch a file with the teacher's token (a plain link would not send it) and save it. */
export async function download(path: string, fallbackName: string) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Please log in again');
  }
  if (!res.ok) {
    let message = 'The download failed. Please try again.';
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message[0] : data.message ?? message;
    } catch {}
    throw new ApiError(message, res.status);
  }

  const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari needs the URL a moment after click
}

export const api = {
  // word bank
  words: (query = '') => request('/words' + query),
  createWord: (body: any) => request('/words', { method: 'POST', body }),
  updateWord: (id: number, body: any) => request(`/words/${id}`, { method: 'PATCH', body }),
  deleteWord: (id: number) => request(`/words/${id}`, { method: 'DELETE' }),
  mediaSignature: (kind: 'image' | 'audio') => request('/media/signature', { method: 'POST', body: { kind } }),

  // lessons
  lessons: () => request('/lessons'),
  competencies: () => request('/lessons/competencies'),
  createLesson: (body: any) => request('/lessons', { method: 'POST', body }),
  updateLesson: (id: number, body: any) => request(`/lessons/${id}`, { method: 'PATCH', body }),
  deleteLesson: (id: number) => request(`/lessons/${id}`, { method: 'DELETE' }),

  // pupils
  pupils: () => request('/pupils'),
  newCode: () => request('/pupils/new-code'),
  createPupil: (body: any) => request('/pupils', { method: 'POST', body }),
  updatePupil: (id: number, body: any) => request(`/pupils/${id}`, { method: 'PATCH', body }),

  // reports
  summary: () => request('/reports/summary'),
  classScores: () => request('/reports/class'),
  recent: () => request('/reports/recent'),
  missed: (limit = 8) => request(`/reports/missed?limit=${limit}`),
  /** query is '' or '?from=YYYY-MM-DD&to=YYYY-MM-DD' (either date may be left out). */
  pupilReport: (id: number, query = '') => request(`/reports/pupil/${id}${query}`),
  exportCsv: (kind: 'sessions' | 'answers', query: string) =>
    download(`/reports/export/${kind}.csv${query}`, `basa-tayo-${kind}.csv`),
};

export const GAME_NAMES: Record<string, string> = {
  TITIK: 'Pagbigkas ng Titik',
  LARAWAN: 'Larawan at Salita',
  BUUIN: 'Buuin ang Salita',
};

export const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const THEME_NAMES: Record<string, string> = {
  Q1: 'Sarili at Pamilya',
  Q2: 'Paaralan',
  Q3: 'Komunidad',
  Q4: 'Kapaligiran',
};

export const GAME_KEYS = Object.keys(GAME_NAMES);
export const LEVEL_KEYS = Object.keys(LEVEL_NAMES);
