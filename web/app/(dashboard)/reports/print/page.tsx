'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getTeacher, GAME_KEYS, GAME_NAMES, LEVEL_KEYS, LEVEL_NAMES } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { rangeError, rangeLabel, rangeQuery, todayIso } from '@/lib/report-dates';

const TITLE = 'Ulat ng Pag-unlad sa Pagbasa (Basa Tayo!)';
const MAX_STARS = 3;

/**
 * Printable progress report — /reports/print?scope=class|pupil&pupil=<id>&from=&to=&details=1
 * The dashboard layout checks the login but leaves out its sidebar and header here;
 * the browser's Print / Save as PDF does the rest (styles in globals.css, .report).
 */
export default function PrintPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PrintReport />
    </Suspense>
  );
}

function PrintReport() {
  const params = useSearchParams();
  const router = useRouter();
  const scope = params.get('scope') === 'pupil' ? 'pupil' : 'class';
  const pupilId = params.get('pupil') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const details = params.get('details') === '1';

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    setData(null);
    setError('');
    const bad = scope === 'pupil' && !pupilId ? 'Walang napiling pupil.' : rangeError(from, to);
    if (bad) {
      setError(bad);
      return;
    }
    const failed = (e: any) =>
      !stale && setError(e?.status === 400 ? e.message : e?.status === 404 ? 'Hindi mahanap ang pupil na ito.' : 'Hindi ma-load ang report. Subukan muli mamaya.');
    const load =
      scope === 'pupil'
        ? api.pupilReport(Number(pupilId), rangeQuery(from, to))
        : api.classReport(rangeQuery(from, to, details ? { details: '1' } : {}));
    load
      .then((r) => {
        if (stale) return;
        if (r) setData(r);
        else setError('Hindi mahanap ang pupil na ito.');
      })
      .catch(failed);
    return () => {
      stale = true;
    };
  }, [scope, pupilId, from, to, details]);

  // Save as PDF suggests the document title as the file name.
  useEffect(() => {
    if (!data) return;
    const previous = document.title;
    const who = scope === 'pupil' ? slug(data.name) : 'Buong-Klase';
    const when = from || to ? `${from || 'simula'}_${to || todayIso()}` : 'Lahat';
    document.title = `Basa-Tayo-Ulat-${who}-${when}`;
    return () => {
      document.title = previous;
    };
  }, [data, scope, from, to]);

  const backHref = '/reports' + rangeQuery(from, to, scope === 'pupil' && pupilId ? { pupil: pupilId } : {});
  const me = getTeacher(); // kept fresh by the dashboard layout
  const teacher = me?.name ?? '';
  const header = { teacher, school: me?.school ?? '', section: me?.section ?? '', coverage: from || to ? `Petsa: ${rangeLabel(from, to)}` : 'Lahat ng petsa' };
  const ranged = !!(from || to);

  return (
    <div className="min-h-screen bg-ground py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-3 px-4 print:hidden">
        <Button onClick={() => window.print()} disabled={!data}>🖨️ I-print / Save as PDF</Button>
        <Link className="btn-ghost" href={backHref}>Bumalik</Link>
        {data ? <span className="self-center text-xs text-ink3">Sa print dialog, piliin ang A4 at &quot;Save as PDF&quot; kung PDF ang kailangan.</span> : null}
      </div>

      <div className="report mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {error ? (
          <EmptyState icon="⚠️" title="Hindi ma-load ang report" message={error} action={{ label: 'Bumalik', onClick: () => router.push(backHref) }} />
        ) : !data ? (
          <LoadingState message={details ? 'Inihahanda ang report ng buong klase at bawat pupil…' : 'Inihahanda ang report…'} />
        ) : scope === 'pupil' ? (
          <>
            <ReportHeader {...header} />
            <PupilSection report={data} ranged={ranged} />
            <Signatures teacher={teacher} />
          </>
        ) : (
          <>
            <ReportHeader {...header} />
            <ClassSection report={data} />
            {(data.reports ?? []).map((r: any) => (
              <section key={r.id} className="new-page">
                <ReportHeader {...header} />
                <PupilSection report={r} ranged={ranged} />
              </section>
            ))}
            <Signatures teacher={teacher} />
          </>
        )}
      </div>
    </div>
  );
}

function slug(name: string) {
  return name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

function starText(n: number) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, MAX_STARS - n));
}

function playedAt(d: string) {
  return new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ReportHeader({ teacher, school, section, coverage }: { teacher: string; school: string; section: string; coverage: string }) {
  const prepared = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <header className="keep mb-4 border-b-2 border-black pb-2 text-center">
      {school ? <p className="text-[10pt] font-bold uppercase tracking-wide">{school}</p> : null}
      <h1 className="text-[15pt] font-bold">{TITLE}</h1>
      <p className="text-[10pt]">Grade 1{section ? ` – ${section}` : ''} · Guro: {teacher || '—'}</p>
      <p className="text-[10pt]">{coverage} · Inihanda noong: {prepared}</p>
    </header>
  );
}

function ClassSection({ report }: { report: any }) {
  const { summary, pupils, missed } = report;
  return (
    <>
      <h2>Buod ng Klase</h2>
      <table>
        <thead>
          <tr><th>Bilang ng pupil</th><th>Kabuuang round</th><th>Average accuracy ng klase</th></tr>
        </thead>
        <tbody>
          <tr><td>{summary.pupils}</td><td>{summary.rounds}</td><td>{summary.avgAccuracy}%</td></tr>
        </tbody>
      </table>

      <h2>Pinakamataas na score ng bawat pupil</h2>
      <p className="note">Bawat mini-game at level: puntos at bituin. B = Beginner, I = Intermediate, A = Advanced.</p>
      <table className="compact">
        <thead>
          <tr>
            <th rowSpan={2}>Pupil</th>
            {GAME_KEYS.map((g) => <th key={g} colSpan={LEVEL_KEYS.length} className="center">{GAME_NAMES[g]}</th>)}
            <th rowSpan={2} className="right">Rounds</th>
            <th rowSpan={2} className="right">Acc.</th>
          </tr>
          <tr>{GAME_KEYS.map((g) => LEVEL_KEYS.map((l) => <th key={g + l} className="center">{l[0]}</th>))}</tr>
        </thead>
        <tbody>
          {pupils.map((p: any) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {GAME_KEYS.map((g) =>
                LEVEL_KEYS.map((l) => {
                  const best = p.scores.find((s: any) => s.gameType === g && s.level === l);
                  return (
                    <td key={g + l} className="center">
                      {best ? <>{best.highestScore}<br /><span className="stars">{starText(best.stars)}</span></> : '—'}
                    </td>
                  );
                }),
              )}
              <td className="right">{p.rounds}</td>
              <td className="right">{p.rounds ? `${p.avgAccuracy}%` : '—'}</td>
            </tr>
          ))}
          {pupils.length === 0 ? <tr><td colSpan={3 + GAME_KEYS.length * LEVEL_KEYS.length}>Wala pang pupil.</td></tr> : null}
        </tbody>
      </table>

      <h2>Mga salitang madalas mali (Top 10)</h2>
      {missed.length === 0 ? (
        <p>Walang maling sagot.</p>
      ) : (
        <table>
          <thead>
            <tr><th className="right">#</th><th>Salita</th><th>Mini-game</th><th>Resulta</th></tr>
          </thead>
          <tbody>
            {missed.map((m: any, i: number) => (
              <tr key={m.gameType + m.prompt}>
                <td className="right">{i + 1}</td>
                <td>{m.prompt}</td>
                <td>{GAME_NAMES[m.gameType]}</td>
                <td>{m.wrong} mali / {m.total} beses</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function PupilSection({ report, ranged }: { report: any; ranged: boolean }) {
  const heading = (
    <div className="keep mb-2">
      <h2 className="!mt-0 text-[13pt]">{report.name}</h2>
      <p className="text-[10pt]">Section: {report.section || '—'}</p>
    </div>
  );

  if (report.history.length === 0) {
    return (
      <>
        {heading}
        <p>{ranged ? 'Walang nalarong round sa petsang ito.' : 'Wala pang nalarong round.'}</p>
      </>
    );
  }

  const groups: any[] = report.missedByCategory ?? [];

  return (
    <>
      {heading}

      <h3>Buod</h3>
      <table>
        <thead>
          <tr><th>Rounds</th><th>Average accuracy</th><th>Kabuuang bituin</th><th>Badges (lahat ng panahon)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{report.rounds ?? report.history.length}</td>
            <td>{report.avgAccuracy}%</td>
            <td>{report.stars}</td>
            <td>{report.badges.length}{report.badges.length ? ` — ${report.badges.map((b: any) => b.name).join(', ')}` : ''}</td>
          </tr>
        </tbody>
      </table>

      <h3>Pinakamataas na score bawat mini-game at level</h3>
      <table>
        <thead>
          <tr>
            <th>Mini-game</th>
            {LEVEL_KEYS.map((l) => <th key={l} className="center">{LEVEL_NAMES[l]}</th>)}
          </tr>
        </thead>
        <tbody>
          {GAME_KEYS.map((g) => (
            <tr key={g}>
              <td>{GAME_NAMES[g]}</td>
              {LEVEL_KEYS.map((l) => {
                const best = report.scores.find((s: any) => s.gameType === g && s.level === l);
                return <td key={l} className="center">{best ? <>{best.highestScore} <span className="stars">{starText(best.stars)}</span></> : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Mga salitang mali</h3>
      {groups.length === 0 ? (
        <p>Walang maling sagot.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Salita</th><th>Resulta</th></tr>
          </thead>
          {GAME_KEYS.flatMap((g) => groups.filter((x) => x.gameType === g)).map((grp) => (
            <tbody key={grp.gameType + grp.level} className="keep">
              <tr><td colSpan={2} className="group">{GAME_NAMES[grp.gameType]} — {LEVEL_NAMES[grp.level]}</td></tr>
              {grp.words.map((w: any) => (
                <tr key={w.prompt}>
                  <td>{w.prompt}</td>
                  <td>{w.wrong} mali / {w.total} beses</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}

      <h3>Kasaysayan ng mga round</h3>
      <table className="compact">
        <thead>
          <tr>
            <th>Petsa</th><th>Mini-game</th><th>Level</th>
            <th className="right">Tama</th><th className="right">Accuracy</th><th>Bituin</th><th className="right">Puntos</th>
          </tr>
        </thead>
        {report.history.map((h: any) => (
          <tbody key={h.id} className="keep">
            <tr>
              <td>{playedAt(h.playedAt)}</td>
              <td>{GAME_NAMES[h.gameType]}</td>
              <td>{LEVEL_NAMES[h.level]}</td>
              <td className="right">{h.correct}/{h.items}</td>
              <td className="right">{h.accuracy}%</td>
              <td><span className="stars">{starText(h.stars)}</span></td>
              <td className="right">{h.score}</td>
            </tr>
            {h.answers?.length ? (
              <tr>
                <td colSpan={7} className="answers">
                  {h.answers.map((a: any, i: number) => (
                    <span key={i} className="mr-3 inline-block whitespace-nowrap">
                      {a.isCorrect ? '✓' : '✗'} {a.word ?? a.prompt}
                      {!a.isCorrect && (a.given || a.expected) ? ` (Sagot: ${a.given ?? '—'}${a.expected ? ` · Tama: ${a.expected}` : ''})` : ''}
                    </span>
                  ))}
                </td>
              </tr>
            ) : null}
          </tbody>
        ))}
      </table>
    </>
  );
}

function Signatures({ teacher }: { teacher: string }) {
  return (
    <footer className="keep mt-10 grid grid-cols-2 gap-10 text-[10pt]">
      <div>
        <p>Inihanda ni:</p>
        <p className="mt-8 border-b border-black" />
        <p className="text-center">{teacher || ' '}, Guro</p>
      </div>
      <div>
        <p>Binigyang-pansin ni:</p>
        <p className="mt-8 border-b border-black" />
        <p className="text-center">Punong-guro</p>
      </div>
    </footer>
  );
}
