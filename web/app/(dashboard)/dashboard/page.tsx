'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, GAME_NAMES, LEVEL_NAMES } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [missed, setMissed] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.summary(), api.missed(7), api.recent()])
      .then(([s, m, r]) => {
        setSummary(s);
        setMissed(m);
        setRecent(r);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!summary) return <section className="panel"><LoadingState message="Kinukuha ang dashboard…" /></section>;

  const maxWrong = Math.max(1, ...missed.map((m) => m.wrong));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active pupils" value={summary.pupils} />
        <Kpi label="Words in word bank" value={summary.words} />
        <Kpi label="Rounds played (7 days)" value={summary.roundsThisWeek} note={`${summary.totalRounds} total`} />
        <Kpi label="Average accuracy" value={`${summary.avgAccuracy}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div>
              <h2 className="text-sm font-bold">Most-missed items</h2>
              <p className="text-xs text-ink3">Class-wide — use these to plan reteaching</p>
            </div>
            <Link className="btn-ghost" href="/reports">Full report</Link>
          </div>
          <div className="grid gap-3 p-5">
            {missed.length === 0 ? <EmptyState icon="✅" title="No missed items yet." /> : null}
            {missed.map((m) => (
              <div key={m.gameType + m.prompt} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
                <span className="text-2xl">{m.emoji ?? '❓'}</span>
                <div className="min-w-0">
                  <span className="text-sm font-bold">{m.prompt}</span>{' '}
                  <span className="pill bg-ground text-ink2">{GAME_NAMES[m.gameType]}</span>
                  <div className="mt-1 h-2 rounded bg-[#eef1f6]">
                    <div className="h-full rounded bg-red-400" style={{ width: `${(m.wrong / maxWrong) * 100}%` }} />
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-ink2">{m.wrong} wrong / {m.total}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold">Recent activity</h2>
          </div>
          <div className="px-5">
            {recent.length === 0 ? <EmptyState icon="🎮" title="No rounds played yet." /> : null}
            {recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-[#eef1f6] py-3 text-sm last:border-0">
                <div>
                  <strong>{r.pupil}</strong> · {GAME_NAMES[r.gameType]}
                  <small className="block text-xs text-ink3">
                    {LEVEL_NAMES[r.level]} · {new Date(r.playedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </small>
                </div>
                <div className="text-right">
                  <span>{'⭐'.repeat(r.stars) || '—'}</span>
                  <small className="block text-xs text-ink3">{r.correct}/{r.items} correct</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: any; note?: string }) {
  return (
    <div className="panel p-4">
      <span className="text-xs font-semibold text-ink3">{label}</span>
      <b className="block text-3xl font-bold tabular-nums">{value}</b>
      {note ? <small className="text-xs text-ink2">{note}</small> : null}
    </div>
  );
}
