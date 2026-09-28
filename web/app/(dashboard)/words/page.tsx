'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES, THEME_NAMES } from '@/lib/api';
import { Pagination, usePagination } from '@/components/Pagination';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { SelectField } from '@/components/ui/SelectField';
import { SearchIcon, TextInput } from '@/components/ui/TextInput';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { EMOJI_GROUPS, GRID_EMOJI, PickEmoji, emojiNeedle, loadMoreEmoji, searchCurated, searchMore } from '@/lib/emoji-list';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); // 👨‍👩‍👧, 👋🏽 and flags count as one

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'A–Z' },
  { value: 'za', label: 'Z–A' },
];
const THEME_OPTIONS = Object.entries(THEME_NAMES).map(([k, v]) => ({ value: k, label: `${k} — ${v}` }));
const LEVEL_OPTIONS = LEVEL_KEYS.map((l) => ({ value: l, label: LEVEL_NAMES[l] }));

/** Lower-case, without dashes, dots and spaces, so "pa-ru" and "paru" both find paruparo. */
const squash = (s: string) => s.toLowerCase().replace(/[-·\s]+/g, '');

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState(''); // search, debounced
  const [sort, setSort] = useState('newest');
  const [theme, setTheme] = useState('');
  const [level, setLevel] = useState('');
  const [gameType, setGameType] = useState('');
  const [form, setForm] = useState<typeof empty | null>(null);
  const [error, setError] = useState('');
  const [otherEmoji, setOtherEmoji] = useState(''); // text of the "Ibang emoji" box; the picture itself is form.emoji
  const [emojiError, setEmojiError] = useState('');
  const [pictureSearch, setPictureSearch] = useState('');
  const [pictureQ, setPictureQ] = useState(''); // picture search, debounced and trimmed
  const [morePictures, setMorePictures] = useState<PickEmoji[] | null>(null); // null while the full list loads
  const [wordError, setWordError] = useState(''); // e.g. 409: the word is already in the bank
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: number; word: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search, filters and sort run here on the loaded list; pagination runs on the result.
  const shown = useMemo(() => {
    const needle = squash(q);
    const list = words.filter(
      (w) =>
        (!needle || squash(w.filipinoWord).includes(needle) || squash(w.syllables.join('')).includes(needle)) &&
        (!theme || w.theme === theme) &&
        (!level || w.level === level) &&
        (!gameType || w.gameWords?.some((gw: any) => gw.game.gameType === gameType)),
    );
    const byDate = (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id;
    const byWord = (a: any, b: any) => a.filipinoWord.localeCompare(b.filipinoWord, 'fil');
    const order = { newest: (a: any, b: any) => byDate(b, a), oldest: byDate, az: byWord, za: (a: any, b: any) => byWord(b, a) }[sort] ?? byDate;
    return list.sort(order);
  }, [words, q, theme, level, gameType, sort]);
  const pager = usePagination(shown, [q, sort, theme, level, gameType]);
  const filtered = !!(search || theme || level || gameType || sort !== 'newest');

  const load = () =>
    api
      .words()
      .then((ws: any[]) => setWords(ws.filter((w) => w.active))) // deleted words are kept only for past results
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setPictureQ(emojiNeedle(pictureSearch)), 150);
    return () => clearTimeout(t);
  }, [pictureSearch]);

  // The full emoji list is fetched only once the teacher searches for a picture.
  // Only the latest search shows its results, so a slow first load never lands on a newer search.
  const latestPictureQ = useRef('');
  const findMorePictures = () => {
    latestPictureQ.current = pictureQ;
    if (!pictureQ) return;
    const needle = pictureQ;
    setMorePictures(null);
    loadMoreEmoji()
      .then((list) => latestPictureQ.current === needle && setMorePictures(searchMore(list, needle)))
      .catch(() => latestPictureQ.current === needle && setMorePictures([]));
  };

  useEffect(() => {
    findMorePictures();
  }, [pictureQ]);

  const curatedPictures = useMemo(() => (pictureQ ? searchCurated(pictureQ) : EMOJI_GROUPS), [pictureQ]);

  function clearFilters() {
    setSearch('');
    setQ('');
    setSort('newest');
    setTheme('');
    setLevel('');
    setGameType('');
  }

  /** Open the form; a picture that is not in the grid goes into the "Ibang emoji" box. */
  function openForm(f: typeof empty) {
    setForm(f);
    setOtherEmoji(f.emoji !== empty.emoji && !GRID_EMOJI.has(f.emoji) ? f.emoji : '');
    setEmojiError('');
    setWordError('');
    setError('');
    setPictureSearch('');
    setPictureQ('');
  }

  /** Grid and search results pick the picture the same way; the "Ibang emoji" box is cleared. */
  function pickPicture(emoji: string) {
    if (!form) return;
    setForm({ ...form, emoji });
    setOtherEmoji('');
    setEmojiError('');
  }

  const pictureButton = (p: PickEmoji) => (
    <button
      type="button"
      key={p.emoji}
      title={p.name}
      aria-label={p.name}
      className={`h-8 w-8 rounded border hover:bg-[#e6eefb] ${form?.emoji === p.emoji ? 'border-accent bg-[#e6eefb]' : 'border-line'}`}
      onClick={() => pickPicture(p.emoji)}
    >
      {p.emoji}
    </button>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    setError('');
    setWordError('');
    const emoji = form.emoji.trim();
    if (!emoji || emoji === empty.emoji) {
      setEmojiError('Pumili o mag-paste ng larawan (emoji) para sa salita.');
      return;
    }
    if ([...graphemes.segment(emoji)].length > 1) {
      setEmojiError('Isang emoji lang ang puwede.');
      return;
    }
    const body = {
      word: form.word.trim().toLowerCase(),
      syllables: form.syllables.split(/[-·\s]+/).filter(Boolean),
      theme: form.theme,
      level: form.level,
      gameTypes: form.gameTypes,
      emoji,
      imageUrl: form.imageUrl || undefined,
      audioUrl: form.audioUrl || undefined,
    };
    setSaving(true);
    try {
      if (form.id) await api.updateWord(form.id, body);
      else await api.createWord(body);
      toastSuccess(form.id ? 'Word updated' : 'Word added');
      setForm(null);
      load();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) setWordError(err.message);
      else toastError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteWord(toDelete.id);
      toastSuccess('Word deleted');
      setToDelete(null);
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <TextInput
          className="min-w-0 flex-[1_1_16rem]"
          type="search"
          aria-label="Hanapin ang salita"
          placeholder="Hanapin ang salita…"
          icon={<SearchIcon />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField className="w-full sm:w-40" aria-label="Sort" value={sort} onChange={setSort} options={SORTS} />
        <SelectField className="w-full sm:w-52" aria-label="Theme" value={theme} onChange={setTheme} options={[{ value: '', label: 'All themes' }, ...THEME_OPTIONS]} />
        <SelectField className="w-full sm:w-40" aria-label="Level" value={level} onChange={setLevel} options={[{ value: '', label: 'All levels' }, ...LEVEL_OPTIONS]} />
        <SelectField
          className="w-full sm:w-48"
          aria-label="Mini-game"
          value={gameType}
          onChange={setGameType}
          options={[{ value: '', label: 'All mini-games' }, ...GAME_KEYS.map((g) => ({ value: g, label: GAME_NAMES[g] }))]}
        />
        <Button className="w-full sm:ml-auto sm:w-auto" onClick={() => openForm({ ...empty })}>+ Add word</Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="panel overflow-x-auto">
        {loading ? (
          <LoadingState message="Kinukuha ang mga salita…" />
        ) : words.length === 0 ? (
          <EmptyState icon="📚" title="Wala pang salita" message="Idagdag ang unang salita sa Word Bank." action={{ label: '+ Add word', onClick: () => openForm({ ...empty }) }} />
        ) : shown.length === 0 ? (
          <EmptyState icon="🔍" title="Walang tugmang salita" message="Subukan ang ibang salita o filter." action={{ label: 'Clear filters', onClick: clearFilters }} />
        ) : (
        <>
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
                    <span className="h-8 w-8 shrink-0 overflow-hidden whitespace-nowrap text-center text-2xl leading-8">{w.emoji ?? '❓'}</span>
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
                    onClick={() => openForm({
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
                  <button className="btn-ghost" onClick={() => setToDelete({ id: w.id, word: w.filipinoWord })}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pager} />
        </>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title={`Burahin ang "${toDelete?.word ?? ''}"?`}
        message="Mawawala ito sa Word Bank at sa mga laro. Mananatili ang mga nakaraang resulta."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />

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
                  <input
                    className="input"
                    value={form.word}
                    onChange={(e) => {
                      setForm({ ...form, word: e.target.value });
                      setWordError('');
                    }}
                    placeholder="bola"
                    required
                  />
                  {wordError ? <p className="mt-1 text-sm text-red-600">{wordError}</p> : null}
                </div>
                <div>
                  <label className="label">Syllables (dash-separated)</label>
                  <input className="input" value={form.syllables} onChange={(e) => setForm({ ...form, syllables: e.target.value })} placeholder="bo-la" required />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="picture-search">Picture</label>
                <TextInput
                  id="picture-search"
                  className="mb-2"
                  type="search"
                  placeholder="Hanapin ang larawan (hal. goat, kambing)"
                  icon={<SearchIcon />}
                  value={pictureSearch}
                  onChange={(e) => setPictureSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault(); // don't submit the word form
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setPictureSearch('');
                      setPictureQ('');
                    }
                  }}
                />
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-line p-2" aria-live="polite">
                    {curatedPictures.map((g) => (
                      <div key={g.name}>
                        <span className="text-[11px] font-semibold text-ink3">{g.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {g.emoji.map((x) => pictureButton({ emoji: x.emoji, name: x.words[0] }))}
                        </div>
                      </div>
                    ))}
                    {pictureQ ? (
                      morePictures === null ? (
                        <p className="text-xs text-ink3">Hinahanap ang iba pang emoji…</p>
                      ) : morePictures.length > 0 ? (
                        <div>
                          <span className="text-[11px] font-semibold text-ink3">Iba pang emoji</span>
                          <div className="flex flex-wrap gap-1">{morePictures.map(pictureButton)}</div>
                        </div>
                      ) : curatedPictures.length === 0 ? (
                        <EmptyState icon="🔍" title="Walang nakitang larawan" message="Subukan sa English, o i-paste sa Ibang emoji." />
                      ) : null
                    ) : null}
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span
                    className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden whitespace-nowrap rounded-lg bg-ground text-5xl ${[empty.emoji, ''].includes(form.emoji.trim()) ? 'opacity-40' : ''}`}
                    aria-label="Picture preview"
                  >
                    {form.emoji.trim() || empty.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label className="label" htmlFor="other-emoji">Ibang emoji (i-type o i-paste)</label>
                    <input
                      id="other-emoji"
                      className="input"
                      value={otherEmoji}
                      onChange={(e) => {
                        setOtherEmoji(e.target.value);
                        setForm({ ...form, emoji: e.target.value });
                        setEmojiError('');
                      }}
                      placeholder="🦋"
                    />
                    <p className="mt-1 text-xs text-ink3">
                      Kung wala sa listahan, i-paste dito. Ang ilang bagong emoji ay maaaring hindi lumabas sa lumang Android.
                    </p>
                    {emojiError ? <p className="mt-1 text-sm text-red-600">{emojiError}</p> : null}
                  </div>
                </div>
                <input className="input mt-2" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Cloudinary image URL (optional)" />
              </div>

              <div>
                <label className="label">Pronunciation recording</label>
                <input className="input" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} placeholder="Cloudinary audio URL (optional — text-to-speech is used without it)" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Quarterly theme" value={form.theme} onChange={(v) => setForm({ ...form, theme: v })} options={THEME_OPTIONS} />
                <SelectField label="Level" value={form.level} onChange={(v) => setForm({ ...form, level: v })} options={LEVEL_OPTIONS} />
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

            </div>

            <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{form.id ? 'Save changes' : 'Add word'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
