'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES } from '@/lib/api';
import { Pagination, usePagination } from '@/components/Pagination';

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink3">Loading…</p>}>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const params = useSearchParams();
  const router = useRouter();
  const pupilId = params.get('pupil');

  const [pupils, setPupils] = useState<any[]>([]);
  const [klass, setKlass] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.pupils().then(setPupils).catch(() => {});
  }, []);

  useEffect(() => {
    if (pupilId) {
      api.pupilReport(Number(pupilId)).then(setReport).catch(() => setReport(null));
    } else {
      setReport(null);
      api.classScores().then(setKlass).catch(() => {});
      api.missed(10).then(setMissed).catch(() => {});
    }
  }, [pupilId]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-ink2">Show report for</label>
        <select
          className="input w-auto"
          value={pupilId ?? ''}
          onChange={(e) => router.push(e.target.value ? `/reports?pupil=${e.target.value}` : '/reports')}
        >
          <option value="">Whole class</option>
          {pupils.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {pupilId ? <Link className="btn-ghost" href="/reports">Whole class</Link> : null}
      </div>

      {pupilId ? <PupilReport report={report} /> : <ClassReport klass={klass} missed={missed} />}

      <ExportCsv pupils={pupils} />
    </>
  );
}

/** Research data for Chapter 4 — raw rounds and answers as Excel-ready CSV. */
function ExportCsv({ pupils }: { pupils: any[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pupil, setPupil] = useState('');
  const [anonymize, setAnonymize] = useState(true);
  const [busy, setBusy] = useState<'' | 'sessions' | 'answers'>('');
  const [error, setError] = useState('');

  async function save(kind: 'sessions' | 'answers') {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (pupil) q.set('pupilId', pupil);
    if (anonymize) q.set('anonymize', 'true');

    setBusy(kind);
    setError('');
    try {
      const qs = q.toString();
      await api.exportCsv(kind, qs ? `?${qs}` : '');
    } catch (e: any) {
      setError(`Could not download the file. ${e.message ?? ''}`.trim());
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="panel">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold">Export CSV</h2>
        <p className="text-xs text-ink3">Raw rounds and answers for analysis in Excel. Leave the dates empty to export everything.</p>
      </div>
      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-auto" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-auto" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Pupil</label>
            <select className="input w-auto" value={pupil} onChange={(e) => setPupil(e.target.value)}>
              <option value="">All pupils</option>
              {pupils.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink2">
            <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
            Anonymize names
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary disabled:opacity-60" disabled={!!busy} onClick={() => save('sessions')}>
            {busy === 'sessions' ? 'Preparing…' : 'Download rounds'}
          </button>
          <button className="btn-ghost disabled:opacity-60" disabled={!!busy} onClick={() => save('answers')}>
            {busy === 'answers' ? 'Preparing…' : 'Download answers'}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}

function ClassReport({ klass, missed }: { klass: any[]; missed: any[] }) {
  const maxWrong = Math.max(1, ...missed.map((m) => m.wrong));
  const pager = usePagination(klass);

  return (
    <>
      <section className="panel overflow-x-auto">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">Highest scores — whole class</h2>
          <p className="text-xs text-ink3">Best points per mini-game and level (only the highest score is kept)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th" rowSpan={2}>Pupil</th>
              {GAME_KEYS.map((g) => <th key={g} className="th text-center" colSpan={LEVEL_KEYS.length}>{GAME_NAMES[g]}</th>)}
              <th className="th text-right" rowSpan={2}>Rounds</th>
            </tr>
            <tr>
              {GAME_KEYS.map((g) => LEVEL_KEYS.map((l) => <th key={g + l} className="th text-center">{l.slice(0, 3)}</th>))}
            </tr>
          </thead>
          <tbody>
            {pager.rows.map((p) => (
              <tr key={p.id}>
                <td className="td font-semibold">
                  <Link href={`/reports?pupil=${p.id}`} className="text-accent">{p.name}</Link>
                </td>
                {GAME_KEYS.map((g) =>
                  LEVEL_KEYS.map((l) => {
                    const best = p.scores.find((s: any) => s.gameType === g && s.level === l);
                    return (
                      <td key={g + l} className="td text-center">
                        {best ? (
                          <span className="grid justify-items-center">
                            <b className="tabular-nums">{best.highestScore}</b>
                            <small>{'⭐'.repeat(best.stars)}</small>
                          </span>
                        ) : <span className="text-ink3">—</span>}
                      </td>
                    );
                  }),
                )}
                <td className="td text-right tabular-nums">{p.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pager} />
      </section>

      <section className="panel">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">Items most frequently answered incorrectly</h2>
        </div>
        <div className="grid gap-3 p-5">
          {missed.map((m) => (
            <div key={m.gameType + m.prompt} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
              <span className="text-2xl">{m.emoji ?? '❓'}</span>
              <div>
                <span className="text-sm font-bold">{m.prompt}</span>{' '}
                <span className="pill bg-ground text-ink2">{GAME_NAMES[m.gameType]}</span>
                <div className="mt-1 h-2 rounded bg-[#eef1f6]">
                  <div className="h-full rounded bg-red-400" style={{ width: `${(m.wrong / maxWrong) * 100}%` }} />
                </div>
              </div>
              <span className="whitespace-nowrap text-xs text-ink2">{m.wrong} wrong / {m.total}</span>
            </div>
          ))}
          {missed.length === 0 ? <p className="py-6 text-center text-sm text-ink3">No missed items yet.</p> : null}
        </div>
      </section>
    </>
  );
}

function PupilReport({ report }: { report: any }) {
  const pager = usePagination<any>(report?.history ?? [], [report?.id]);
  if (!report) return <p className="text-sm text-ink3">Loading…</p>;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Rounds played</span><b className="block text-3xl">{report.history.length}</b></div>
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Average accuracy</span><b className="block text-3xl">{report.avgAccuracy}%</b></div>
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Stars</span><b className="block text-3xl">{report.stars}</b></div>
        <div className="panel p-4">
          <span className="text-xs font-semibold text-ink3">Badges</span>
          <b className="block text-3xl">{report.badges.length}</b>
          <small className="text-xs text-ink2">{report.badges.map((b: any) => b.name).join(', ') || 'none yet'}</small>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel overflow-x-auto">
          <div className="border-b border-line px-5 py-3"><h2 className="text-sm font-bold">Highest score per mini-game and level</h2></div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="th">Mini-game</th>
                {LEVEL_KEYS.map((l) => <th key={l} className="th text-center">{LEVEL_NAMES[l]}</th>)}
              </tr>
            </thead>
            <tbody>
              {GAME_KEYS.map((g) => (
                <tr key={g}>
                  <td className="td font-semibold">{GAME_NAMES[g]}</td>
                  {LEVEL_KEYS.map((l) => {
                    const best = report.scores.find((s: any) => s.gameType === g && s.level === l);
                    return (
                      <td key={l} className="td text-center">
                        {best ? <span className="grid justify-items-center"><b>{best.highestScore}</b><small>{'⭐'.repeat(best.stars)}</small></span> : <span className="text-ink3">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold">Items {report.name.split(' ')[0]} misses most</h2>
          </div>
          <div className="grid gap-3 p-5">
            {report.missed.map((m: any) => (
              <div key={m.gameType + m.prompt} className="flex items-center justify-between gap-3 text-sm">
                <span><b>{m.prompt}</b> <span className="pill bg-ground text-ink2">{GAME_NAMES[m.gameType]}</span></span>
                <span className="text-xs text-ink2">{m.wrong} / {m.total}</span>
              </div>
            ))}
            {report.missed.length === 0 ? <p className="py-6 text-center text-sm text-ink3">Nothing missed yet.</p> : null}
          </div>
        </section>
      </div>

      <section className="panel overflow-x-auto">
        <div className="border-b border-line px-5 py-3"><h2 className="text-sm font-bold">Round history</h2></div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Mini-game</th>
              <th className="th">Level</th>
              <th className="th text-right">Correct</th>
              <th className="th text-right">Accuracy</th>
              <th className="th">Stars</th>
              <th className="th text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {pager.rows.map((h: any) => (
              <tr key={h.id}>
                <td className="td">{new Date(h.playedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                <td className="td">{GAME_NAMES[h.gameType]}</td>
                <td className="td">{LEVEL_NAMES[h.level]}</td>
                <td className="td text-right tabular-nums">{h.correct}/{h.items}</td>
                <td className="td text-right tabular-nums">{h.accuracy}%</td>
                <td className="td">{'⭐'.repeat(h.stars) || '—'}</td>
                <td className="td text-right tabular-nums">{h.score}</td>
              </tr>
            ))}
            {report.history.length === 0 ? <tr><td className="td py-8 text-center text-ink3" colSpan={7}>No rounds synced yet.</td></tr> : null}
          </tbody>
        </table>
        <Pagination {...pager} />
      </section>
    </>
  );
}
