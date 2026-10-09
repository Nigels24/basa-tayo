'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const TOKEN_KEY = 'basatayo.teacher.token';
const NAME_KEY = 'basatayo.teacher';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getTeacher(): Teacher | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(NAME_KEY);
  return raw ? JSON.parse(raw) : null;
}

export type Teacher = { id: number; name: string; username: string; school: string | null; section: string | null };

/** Fired on window when the stored teacher changes, so the header follows the Aking Account page. */
export const TEACHER_EVENT = 'basatayo:teacher';

export function setTeacher(teacher: Teacher) {
  localStorage.setItem(NAME_KEY, JSON.stringify(teacher));
  window.dispatchEvent(new Event(TEACHER_EVENT));
}

function startSession(res: { token: string; teacher: Teacher }) {
  localStorage.setItem(TOKEN_KEY, res.token);
  setTeacher(res.teacher);
  return res.teacher;
}

export async function login(username: string, password: string) {
  return startSession(await request('/auth/teacher/login', { method: 'POST', body: { username, password }, public: true }));
}

/** Sign-up returns the same payload as login, so she is signed in right away. */
export async function registerTeacher(body: {
  fullName: string;
  school: string;
  section?: string;
  username: string;
  password: string;
  registrationCode: string;
}) {
  return startSession(await request('/auth/register-teacher', { method: 'POST', body, public: true }));
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

/**
 * opts.public: a call made without being signed in (log in, sign up), where a
 * 401/403 is a wrong password or registration code to show, not a lost session.
 */
export async function request(path: string, opts: { method?: string; body?: any; public?: boolean } = {}) {
  const token = opts.public ? null : getToken();
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!opts.public && (res.status === 401 || res.status === 403)) {
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
  // account
  registrationStatus: (): Promise<{ open: boolean }> => request('/auth/registration-status', { public: true }),
  me: (): Promise<Teacher> => request('/auth/me'),
  updateMe: (body: { fullName: string; school: string; section: string }): Promise<Teacher> =>
    request('/auth/me', { method: 'PATCH', body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request('/auth/change-password', { method: 'POST', body }),

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
  classScores: (query = '') => request(`/reports/class${query}`),
  classReport: (query = '') => request(`/reports/class-report${query}`),
  recent: () => request('/reports/recent'),
  /** query is '' or '?from=…&to=…', as for pupilReport. */
  missed: (limit = 8, query = '') => request(`/reports/missed?limit=${limit}${query.replace('?', '&')}`),
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
