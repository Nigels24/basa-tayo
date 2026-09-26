'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function PupilsPage() {
  const [pupils, setPupils] = useState<any[]>([]);
  const [form, setForm] = useState<{ id: number; name: string; section: string; loginCode: string } | null>(null);
  const [error, setError] = useState('');

  const load = () => api.pupils().then(setPupils).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function openNew() {
    const { code } = await api.newCode();
    setForm({ id: 0, name: '', section: 'Sampaguita', loginCode: code });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      const body = { name: form.name.trim(), section: form.section, loginCode: form.loginCode };
      if (form.id) await api.updatePupil(form.id, body);
      else await api.createPupil(body);
      setForm(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggle(p: any) {
    await api.updatePupil(p.id, { name: p.name, active: !p.active });
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink3">
          {pupils.filter((p) => p.active).length} active pupils. Deactivated pupils can&apos;t log in, but their results are kept.
        </p>
        <button className="btn-primary" onClick={openNew}>+ Register pupil</button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="panel overflow-x-auto">
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
            {pupils.map((p) => (
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
                  <button className="btn-ghost" onClick={() => toggle(p)}>{p.active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
            {pupils.length === 0 ? <tr><td className="td py-8 text-center text-ink3" colSpan={7}>No pupils registered yet.</td></tr> : null}
          </tbody>
        </table>
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
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary">{form.id ? 'Save' : 'Register'}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
