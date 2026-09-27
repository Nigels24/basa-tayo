'use client';

import { useEffect, useState } from 'react';
import { api, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES, THEME_NAMES } from '@/lib/api';
import { Pagination, usePagination } from '@/components/Pagination';

// Picture choices for Grade 1 nouns. Mostly older emoji that every Android tablet
// shows; the newer ones (🦷 🧹 Android 9+, 🧊 Android 10+, 🪨 🪴 🪟 Android 11+)
// can show as a blank box on old devices — upload an image URL for those if needed.
const EMOJI_GROUPS: { name: string; emoji: string[] }[] = [
  { name: 'Animals', emoji: ['🐕','🐈','🐟','🐓','🦆','🐻','🐘','🐃','🐎','🐖','🐐','🐸'] },
  { name: 'Food', emoji: ['🍌','🍅','🌽','🍇','🍎','🍍','🥚','🍚','🥛','☕'] },
  { name: 'Home and school', emoji: ['🏠','🏫','🚪','🪟','🛏️','🔑','🧹','⌚','☂️','👟','📕','📄','✏️','✂️','⚽','🎈'] },
  { name: 'People and body', emoji: ['👨','👩','🧒','👩‍🏫','👁️','👃','👂','👄','✋','🦷'] },
  { name: 'Nature', emoji: ['🌳','🌸','🪴','🍃','☀️','🌙','⭐','☁️','🌧️','💧','🪨','🧊'] },
];

const empty = {
  id: 0,
  word: '',
  syllables: '',
  theme: 'Q1',
  level: 'BEGINNER',
  gameTypes: [...GAME_KEYS],
  emoji: '❓',
  imageUrl: '',
  audioUrl: '',
};

export default function WordsPage() {
  const [words, setWords] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [gameType, setGameType] = useState('');
  const [form, setForm] = useState<typeof empty | null>(null);
  const [error, setError] = useState('');
  const pager = usePagination(words, [q, level, gameType]);

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (level) params.set('level', level);
    if (gameType) params.set('gameType', gameType);
    const query = params.toString();
    api.words(query ? `?${query}` : '').then(setWords).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [q, level, gameType]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError('');
    const body = {
      word: form.word.trim().toLowerCase(),
      syllables: form.syllables.split(/[-·\s]+/).filter(Boolean),
      theme: form.theme,
      level: form.level,
      gameTypes: form.gameTypes,
      emoji: form.emoji,
      imageUrl: form.imageUrl || undefined,
      audioUrl: form.audioUrl || undefined,
    };
    try {
      if (form.id) await api.updateWord(form.id, body);
      else await api.createWord(body);
      setForm(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: number, word: string) {
    if (!confirm(`Remove "${word}" from the word bank? Past results are kept.`)) return;
    await api.deleteWord(id);
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input className="input max-w-xs" placeholder="Search words" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={gameType} onChange={(e) => setGameType(e.target.value)}>
          <option value="">All mini-games</option>
          {GAME_KEYS.map((g) => <option key={g} value={g}>{GAME_NAMES[g]}</option>)}
        </select>
        <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          {LEVEL_KEYS.map((l) => <option key={l} value={l}>{LEVEL_NAMES[l]}</option>)}
        </select>
        <button className="btn-primary ml-auto" onClick={() => setForm({ ...empty })}>+ Add word</button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Word</th>
              <th className="th">Syllables</th>
              <th className="th">Theme</th>
              <th className="th">Level</th>
              <th className="th">Mini-games</th>
              <th className="th">Audio</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {pager.rows.map((w) => (
              <tr key={w.id}>
                <td className="td">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{w.emoji ?? '❓'}</span>
                    <b className="text-base">{w.filipinoWord}</b>
                  </span>
                </td>
                <td className="td text-ink2">{w.syllables.join(' · ')}</td>
                <td className="td"><span className="pill bg-ground text-ink2">{w.theme} · {THEME_NAMES[w.theme]}</span></td>
                <td className="td">{LEVEL_NAMES[w.level]}</td>
                <td className="td">
                  <span className="flex flex-wrap gap-1">
                    {[...new Set(w.gameWords?.map((gw: any) => gw.game.gameType) ?? [])].map((g: any) => (
                      <span key={g} className="pill bg-ground text-ink2">{GAME_NAMES[g]}</span>
                    ))}
                  </span>
                </td>
                <td className="td text-ink3">{w.audioUrl ? 'Recording' : 'Text-to-speech'}</td>
                <td className="td text-right whitespace-nowrap">
                  <button
                    className="btn-ghost mr-2"
                    onClick={() => setForm({
                      id: w.id,
                      word: w.filipinoWord,
                      syllables: w.syllables.join('-'),
                      theme: w.theme,
                      level: w.level,
                      gameTypes: [...new Set(w.gameWords?.map((gw: any) => gw.game.gameType) ?? GAME_KEYS)] as string[],
                      emoji: w.emoji ?? '❓',
                      imageUrl: w.imageUrl ?? '',
                      audioUrl: w.audioUrl ?? '',
                    })}
                  >
                    Edit
                  </button>
                  <button className="btn-ghost" onClick={() => remove(w.id, w.filipinoWord)}>Delete</button>
                </td>
              </tr>
            ))}
            {words.length === 0 ? (
              <tr><td className="td py-8 text-center text-ink3" colSpan={7}>No words match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
        <Pagination {...pager} />
      </section>

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white">
            <header className="border-b border-line px-5 py-4">
              <h3 className="font-bold">{form.id ? `Edit "${form.word}"` : 'Add word'}</h3>
            </header>

            <div className="grid gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Filipino word</label>
                  <input className="input" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="bola" required />
                </div>
                <div>
                  <label className="label">Syllables (dash-separated)</label>
                  <input className="input" value={form.syllables} onChange={(e) => setForm({ ...form, syllables: e.target.value })} placeholder="bo-la" required />
                </div>
              </div>

              <div>
                <label className="label">Picture</label>
                <div className="flex items-start gap-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-ground text-3xl">{form.emoji}</span>
                  <div className="grid max-h-48 min-w-0 flex-1 gap-2 overflow-y-auto rounded-lg border border-line p-2">
                    {EMOJI_GROUPS.map((g) => (
                      <div key={g.name}>
                        <span className="text-[11px] font-semibold text-ink3">{g.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {g.emoji.map((e) => (
                            <button
                              type="button"
                              key={e}
                              className={`h-8 w-8 rounded border hover:bg-[#e6eefb] ${form.emoji === e ? 'border-accent bg-[#e6eefb]' : 'border-line'}`}
                              onClick={() => setForm({ ...form, emoji: e })}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <input className="input mt-2" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Cloudinary image URL (optional)" />
              </div>

              <div>
                <label className="label">Pronunciation recording</label>
                <input className="input" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} placeholder="Cloudinary audio URL (optional — text-to-speech is used without it)" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Quarterly theme</label>
                  <select className="input" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                    {Object.entries(THEME_NAMES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
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
                <label className="label">Use in mini-games</label>
                <div className="flex flex-wrap gap-2">
                  {GAME_KEYS.map((g) => (
                    <label key={g} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${form.gameTypes.includes(g) ? 'border-[#b9ccef] bg-[#e6eefb]' : 'border-line'}`}>
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={form.gameTypes.includes(g)}
                        onChange={(e) =>
                          setForm({ ...form, gameTypes: e.target.checked ? [...form.gameTypes, g] : form.gameTypes.filter((x) => x !== g) })
                        }
                      />
                      {GAME_NAMES[g]}
                    </label>
                  ))}
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>

            <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary">{form.id ? 'Save changes' : 'Add word'}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
