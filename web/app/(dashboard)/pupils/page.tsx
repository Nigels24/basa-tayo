'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getTeacher } from '@/lib/api';
import { Pagination, usePagination } from '@/components/Pagination';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toastError, toastSuccess } from '@/components/ui/toast';

export default function PupilsPage() {
  const [pupils, setPupils] = useState<any[]>([]);
  const [form, setForm] = useState<{ id: number; name: string; section: string; loginCode: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const pager = usePagination(pupils);

  const load = () =>
    api
      .pupils()
      .then(setPupils)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  async function openNew() {
    setOpening(true);
    try {
      const { code } = await api.newCode();
      setForm({ id: 0, name: '', section: getTeacher()?.section ?? '', loginCode: code });
    } catch (err) {
      toastError(err);
    } finally {
      setOpening(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    try {
      const body = { name: form.name.trim(), section: form.section, loginCode: form.loginCode };
      if (form.id) await api.updatePupil(form.id, body);
      else await api.createPupil(body);
      toastSuccess(form.id ? 'Pupil updated' : 'Pupil added');
      setForm(null);
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: any) {
    setToggling(p.id);
    try {
      await api.updatePupil(p.id, { name: p.name, active: !p.active });
      toastSuccess(p.active ? 'Pupil deactivated' : 'Pupil activated');
      await load();
    } catch (err) {
      toastError(err);
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink3">
          {pupils.filter((p) => p.active).length} active pupils. Deactivated pupils can&apos;t log in, but their results are kept.
        </p>
        <Button onClick={openNew} loading={opening}>+ Register pupil</Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="panel overflow-x-auto">
        {loading ? (
          <LoadingState message="Kinukuha ang mga pupil…" />
        ) : pupils.length === 0 ? (
          <EmptyState icon="🧒" title="Wala pang pupil" message="Mag-register ng pupil para makapag-log in siya sa tablet." action={{ label: '+ Register pupil', onClick: openNew }} />
        ) : (
        <>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Pupil</th>
              <th className="th">Log-in code</th>
              <th className="th">Section</th>
              <th className="th text-right">Rounds</th>
              <th className="th text-right">Stars</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {pager.rows.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'opacity-60'}>
                <td className="td font-semibold">{p.name}</td>
                <td className="td"><code className="rounded bg-ground px-2 py-1 font-bold tracking-widest">{p.loginCode}</code></td>
                <td className="td">{p.section}</td>
                <td className="td text-right tabular-nums">{p.sessions}</td>
                <td className="td text-right tabular-nums">{p.stars}</td>
                <td className="td">
                  <span className={`pill ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-ink3'}`}>
                    {p.active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="td whitespace-nowrap text-right">
                  <Link className="btn-ghost mr-1" href={`/reports?pupil=${p.id}`}>Report</Link>
                  <button className="btn-ghost mr-1" onClick={() => setForm({ id: p.id, name: p.name, section: p.section ?? '', loginCode: p.loginCode })}>Edit</button>
                  <Button variant="secondary" loading={toggling === p.id} disabled={toggling !== null} onClick={() => toggle(p)}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pager} />
        </>
        )}
      </section>

      {form ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={save} className="w-full max-w-md rounded-xl bg-white">
            <header className="border-b border-line px-5 py-4">
              <h3 className="font-bold">{form.id ? `Edit ${form.name}` : 'Register pupil'}</h3>
            </header>

            <div className="grid gap-4 p-5">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Section</label>
                <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </div>
              <div>
                <label className="label">Pupil log-in code</label>
                <div className="flex items-center gap-3">
                  <code className="rounded bg-ground px-3 py-2 text-xl font-bold tracking-widest">{form.loginCode}</code>
                  <button type="button" className="btn-ghost" onClick={async () => setForm({ ...form, loginCode: (await api.newCode()).code })}>
                    New code
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink3">The pupil types this code on the tablet. Write it on their name tag.</p>
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{form.id ? 'Save' : 'Register'}</Button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
