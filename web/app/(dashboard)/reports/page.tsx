'use client';

import { Fragment, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES } from '@/lib/api';
import { Pagination, usePagination } from '@/components/Pagination';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { SelectField } from '@/components/ui/SelectField';

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const params = useSearchParams();
  const router = useRouter();
  const pupilId = params.get('pupil');
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const [pupils, setPupils] = useState<any[]>([]);
  const [klass, setKlass] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportError, setReportError] = useState('');
  const [classLoading, setClassLoading] = useState(true);

  useEffect(() => {
    api.pupils().then(setPupils).catch(() => {});
  }, []);

  useEffect(() => {
    let stale = false;
    setReport(null);
    setReportError('');
    if (pupilId) {
      if (from && to && from > to) {
        setReportError('Ang "From" na petsa ay dapat bago o kapareho ng "To". (From must not be after To.)');
        return;
      }
      api
        .pupilReport(Number(pupilId), rangeQuery(from, to))
        .then((r) => {
          if (stale) return;
          if (r) setReport(r);
          else setReportError('Hindi mahanap ang pupil na ito.');
        })
        .catch((e) => !stale && setReportError(e?.status === 400 ? e.message : 'Subukan muli, o pumili ng ibang pupil.'));
    } else {
      Promise.all([
        api.classScores().then(setKlass).catch(() => {}),
        api.missed(10).then(setMissed).catch(() => {}),
      ]).finally(() => setClassLoading(false));
    }
    return () => {
      stale = true;
    };
  }, [pupilId, from, to]);

  /** Change the pupil and/or dates in the URL, so a refresh or shared link keeps them. */
  function go(next: { pupil?: string; from?: string; to?: string }) {
    const q = new URLSearchParams();
    const p = next.pupil ?? pupilId ?? '';
    if (p) {
      q.set('pupil', p);
      const f = next.from ?? from;
      const t = next.to ?? to;
      if (f) q.set('from', f);
      if (t) q.set('to', t);
    }
    const qs = q.toString();
    router.push(qs ? `/reports?${qs}` : '/reports');
  }

  const pupilOptions = pupils.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          className="w-full sm:w-64"
          label="Show report for"
          value={pupilId ?? ''}
          onChange={(v) => (v ? go({ pupil: v }) : router.push('/reports'))}
          options={[{ value: '', label: 'Whole class' }, ...pupilOptions]}
        />
        {pupilId ? (
          <>
            <div>
              <label className="label" htmlFor="report-from">From</label>
              <input id="report-from" type="date" className="input w-auto" value={from} max={to || undefined} onChange={(e) => go({ from: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="report-to">To</label>
              <input id="report-to" type="date" className="input w-auto" value={to} min={from || undefined} onChange={(e) => go({ to: e.target.value })} />
            </div>
            {from || to ? (
              <Button variant="secondary" onClick={() => go({ from: '', to: '' })}>Lahat ng petsa</Button>
            ) : null}
            <Link className="btn-ghost" href="/reports">Whole class</Link>
          </>
        ) : null}
      </div>

      {pupilId ? (
        reportError ? (
          <section className="panel">
            <EmptyState
              icon="⚠️"
              title="Hindi ma-load ang report"
              message={reportError}
              action={from || to ? { label: 'Lahat ng petsa', onClick: () => go({ from: '', to: '' }) } : undefined}
            />
          </section>
        ) : (
          <PupilReport report={report} rangeLabel={rangeLabel(from, to)} ranged={!!(from || to)} />
        )
      ) : classLoading ? (
        <section className="panel"><LoadingState message="Kinukuha ang report…" /></section>
      ) : (
        <ClassReport klass={klass} missed={missed} />
      )}

      <ExportCsv pupilOptions={pupilOptions} />
    </>
  );
}

function rangeQuery(from: string, to: string) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

/** "Oct 1 – Oct 9, 2026", "From Oct 1, 2026", "Until Oct 9, 2026" or "All dates". */
function rangeLabel(from: string, to: string) {
  const fmt = (d: string, withYear = true) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
  if (from && to) return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return 'All dates';
}

/** Research data for Chapter 4 — raw rounds and answers as Excel-ready CSV. */
function ExportCsv({ pupilOptions }: { pupilOptions: { value: string; label: string }[] }) {
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
          <SelectField
            className="w-full sm:w-56"
            label="Pupil"
            value={pupil}
            onChange={setPupil}
            options={[{ value: '', label: 'All pupils' }, ...pupilOptions]}
          />
          <label className="flex items-center gap-2 pb-2 text-sm text-ink2">
            <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} />
            Anonymize names
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button loading={busy === 'sessions'} disabled={!!busy} onClick={() => save('sessions')}>
            Download rounds
          </Button>
          <Button variant="secondary" loading={busy === 'answers'} disabled={!!busy} onClick={() => save('answers')}>
            Download answers
          </Button>
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
            {klass.length === 0 ? (
              <tr><td colSpan={2 + GAME_KEYS.length * LEVEL_KEYS.length}><EmptyState icon="🧒" title="Wala pang pupil" message="Mag-register ng pupil sa Pupils page." /></td></tr>
            ) : null}
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
          {missed.length === 0 ? <EmptyState icon="✅" title="No missed items yet." /> : null}
        </div>
      </section>
    </>
  );
}

function PupilReport({ report, rangeLabel, ranged }: { report: any; rangeLabel: string; ranged: boolean }) {
  const pager = usePagination<any>(report?.history ?? [], [report?.id, rangeLabel]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  if (!report) return <section className="panel"><LoadingState message="Kinukuha ang report…" /></section>;

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <p className="text-sm text-ink2">
        <span className="font-semibold text-ink">{report.name}</span> · Petsa: <span className="pill bg-ground text-ink2">{rangeLabel}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Rounds played</span><b className="block text-3xl">{report.rounds ?? report.history.length}</b></div>
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Average accuracy</span><b className="block text-3xl">{report.avgAccuracy}%</b></div>
        <div className="panel p-4"><span className="text-xs font-semibold text-ink3">Stars</span><b className="block text-3xl">{report.stars}</b></div>
        <div className="panel p-4">
          <span className="text-xs font-semibold text-ink3">Badges{ranged ? ' (all time)' : ''}</span>
          <b className="block text-3xl">{report.badges.length}</b>
          <small className="text-xs text-ink2">{report.badges.map((b: any) => b.name).join(', ') || 'none yet'}</small>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel overflow-x-auto self-start">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold">Highest score per mini-game and level</h2>
            {ranged ? <p className="text-xs text-ink3">Best round within {rangeLabel}</p> : null}
          </div>
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

        <MissedWords groups={report.missedByCategory ?? []} />
      </div>

      <section className="panel overflow-x-auto">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">Round history</h2>
          <p className="text-xs text-ink3">Pindutin ang ▸ para makita ang mga sagot sa round.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th w-10"><span className="sr-only">Answers</span></th>
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
            {pager.rows.map((h: any) => {
              const isOpen = open.has(h.id);
              return (
                <Fragment key={h.id}>
                  <tr>
                    <td className="td">
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Itago ang mga sagot' : 'Ipakita ang mga sagot'}
                        onClick={() => toggle(h.id)}
                      >
                        <span className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                      </button>
                    </td>
                    <td className="td">{new Date(h.playedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td className="td">{GAME_NAMES[h.gameType]}</td>
                    <td className="td">{LEVEL_NAMES[h.level]}</td>
                    <td className="td text-right tabular-nums">{h.correct}/{h.items}</td>
                    <td className="td text-right tabular-nums">{h.accuracy}%</td>
                    <td className="td">{'⭐'.repeat(h.stars) || '—'}</td>
                    <td className="td text-right tabular-nums">{h.score}</td>
                  </tr>
                  {isOpen ? (
                    <tr>
                      <td colSpan={8} className="bg-ground px-5 py-3">
                        <RoundAnswers answers={h.answers ?? []} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {report.history.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon="🎮" title={ranged ? 'Walang round sa petsang ito.' : 'No rounds synced yet.'} message={ranged ? 'Pumili ng ibang petsa, o tingnan ang lahat ng petsa.' : undefined} /></td></tr>
            ) : null}
          </tbody>
        </table>
        <Pagination {...pager} />
      </section>
    </>
  );
}

/** Wrong words grouped by mini-game, then level. */
function MissedWords({ groups }: { groups: any[] }) {
  const games = GAME_KEYS.map((g) => ({ gameType: g, levels: groups.filter((x) => x.gameType === g) })).filter((g) => g.levels.length > 0);

  return (
    <section className="panel self-start">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold">Mga salitang mali</h2>
        <p className="text-xs text-ink3">Words answered wrong, per mini-game and level</p>
      </div>
      {games.length === 0 ? (
        <EmptyState icon="✅" title="Walang maling sagot." message="No wrong answers in these rounds." />
      ) : (
        <div className="grid gap-5 p-5">
          {games.map((g) => (
            <div key={g.gameType} className="grid gap-3">
              <h3 className="text-sm font-bold">{GAME_NAMES[g.gameType]}</h3>
              {g.levels.map((lv: any) => (
                <div key={lv.level} className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink3">{LEVEL_NAMES[lv.level]}</span>
                  {lv.words.map((w: any) => (
                    <div key={w.prompt} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 text-sm">
                      <span className="text-xl" aria-hidden="true">{w.emoji ?? '❓'}</span>
                      <b>{w.prompt}</b>
                      <span className="whitespace-nowrap text-xs text-ink2">
                        <span className="font-semibold text-red-600">{w.wrong} mali</span> / {w.total} beses
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** One round's answers, in the order they were played. */
function RoundAnswers({ answers }: { answers: any[] }) {
  if (answers.length === 0) return <p className="text-sm text-ink3">Walang naitalang sagot para sa round na ito.</p>;

  return (
    <ol className="grid gap-1.5 text-sm">
      {answers.map((a, i) => (
        <li key={i} className="grid grid-cols-[24px_28px_1fr] items-baseline gap-2">
          <span aria-label={a.isCorrect ? 'Tama' : 'Mali'}>{a.isCorrect ? '✅' : '❌'}</span>
          <span aria-hidden="true">{a.emoji ?? ''}</span>
          <span>
            <b>{a.prompt}</b>
            {!a.isCorrect && (a.given || a.expected) ? (
              <span className="ml-2 text-xs text-ink2">
                Sagot: <span className="font-semibold text-red-600">{a.given ?? '—'}</span>
                {a.expected ? <> · Tama: <span className="font-semibold text-green-700">{a.expected}</span></> : null}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
