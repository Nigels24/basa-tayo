'use client';

import { useEffect, useState } from 'react';
import { api, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES } from '@/lib/api';

const empty = {
  id: 0,
  gameType: 'TITIK',
  level: 'BEGINNER',
  competencyCode: '',
  title: '',
  target: '',
  say: '',
  body: '',
  exampleWordId: '' as string | number,
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [words, setWords] = useState<any[]>([]);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [error, setError] = useState('');

  const load = () => api.lessons().then(setLessons).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api.competencies().then(setCompetencies).catch(() => {});
    api.words().then(setWords).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = {
      gameType: form.gameType,
      level: form.level,
      competencyCode: form.competencyCode || competencies.find((c) => c.game === form.gameType)?.code || 'RL1PWS-I-2',
      title: form.title,
      target: form.target,
      say: form.say,
      body: form.body,
      exampleWordId: form.exampleWordId ? Number(form.exampleWordId) : undefined,
    };
    try {
      if (form.id) await api.updateLesson(form.id, body);
      else await api.createLesson(body);
      setForm(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this lesson? Pupils will see the next older one, or go straight to the game.')) return;
    await api.deleteLesson(id);
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink3">
          A lesson screen appears before every round, linked to a Grade 1 Reading and Literacy competency.
          When a game and level have several lessons, pupils see the newest one.
        </p>
        <button className="btn-primary" onClick={() => setForm({ ...empty })}>+ Add lesson</button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {GAME_KEYS.map((g) => (
        <section key={g} className="grid gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink3">{GAME_NAMES[g]}</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {LEVEL_KEYS.map((lv) => {
              const list = lessons.filter((l) => l.gameType === g && l.level === lv);
              if (!list.length) {
                return (
                  <div key={lv} className="panel grid content-start gap-2 p-4">
                    <span className="pill w-fit bg-ground text-ink2">{LEVEL_NAMES[lv]}</span>
                    <p className="text-sm text-ink3">No lesson yet — pupils go straight to the game.</p>
                    <button className="btn-ghost w-fit" onClick={() => setForm({ ...empty, gameType: g, level: lv })}>+ Add lesson</button>
                  </div>
                );
              }
              return list.map((l, i) => (
                <div key={l.id} className={`panel grid content-start gap-2 p-4 ${i ? 'opacity-70' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex flex-wrap gap-1">
                      <span className="pill bg-ground text-ink2">{LEVEL_NAMES[lv]}</span>
                      <span className={`pill ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-ink3'}`}>
                        {i === 0 ? 'Shown to pupils' : 'Older'}
                      </span>
                    </span>
                    <span className="whitespace-nowrap">
                      <button
                        className="btn-ghost mr-1"
                        onClick={() =>
                          setForm({
                            id: l.id,
                            gameType: l.gameType,
                            level: l.level,
                            competencyCode: l.competencyCode,
                            title: l.title,
                            target: l.target,
                            say: l.say ?? '',
                            body: l.body,
                            exampleWordId: l.exampleWordId ?? '',
                          })
                        }
                      >
                        Edit
                      </button>
                      <button className="btn-ghost" onClick={() => remove(l.id)}>Delete</button>
                    </span>
                  </div>
                  <h3 className="font-bold">{l.title}</h3>
                  <div className="w-fit rounded bg-[#fffbea] px-3 py-1 text-2xl font-bold text-titik">{l.target || '—'}</div>
                  <p className="line-clamp-3 text-sm text-ink2">{l.body}</p>
                  <span className="text-xs text-ink3">{l.competencyCode}</span>
                </div>
              ));
            })}
          </div>
        </section>
      ))}

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={save} className="w-full max-w-xl rounded-xl bg-white">
            <header className="border-b border-line px-5 py-4">
              <h3 className="font-bold">{form.id ? 'Edit lesson' : 'Add lesson'}</h3>
            </header>

            <div className="grid gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Mini-game</label>
                  <select className="input" value={form.gameType} onChange={(e) => setForm({ ...form, gameType: e.target.value, competencyCode: '' })}>
                    {GAME_KEYS.map((g) => <option key={g} value={g}>{GAME_NAMES[g]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Level</label>
                  <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    {LEVEL_KEYS.map((l) => <option key={l} value={l}>{LEVEL_NAMES[l]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">MATATAG competency</label>
                <select className="input" value={form.competencyCode} onChange={(e) => setForm({ ...form, competencyCode: e.target.value })}>
                  {competencies.filter((c) => c.game === form.gameType).map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.text}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Lesson title (shown to pupils)</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Big text on the lesson screen</label>
                  <input className="input" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Mm  Ss  Aa" />
                </div>
                <div>
                  <label className="label">Sample word</label>
                  <select className="input" value={form.exampleWordId} onChange={(e) => setForm({ ...form, exampleWordId: e.target.value })}>
                    <option value="">— none —</option>
                    {words.map((w) => <option key={w.id} value={w.id}>{w.emoji} {w.filipinoWord}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">What the &quot;Pakinggan&quot; button says</label>
                <input className="input" value={form.say} onChange={(e) => setForm({ ...form, say: e.target.value })} placeholder="m, s, a" />
              </div>

              <div>
                <label className="label">Short explanation (Filipino)</label>
                <textarea className="input min-h-24" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary">{form.id ? 'Save lesson' : 'Add lesson'}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
