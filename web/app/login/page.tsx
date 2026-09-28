'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { Button } from '@/components/ui/Button';

const LETTERS = ['Aa', 'Bb', 'Kk', 'Dd', 'Ee', 'Gg', 'Hh', 'Ii', 'Ll', 'Mm', 'Nn', 'Ng', 'Oo', 'Pp', 'Rr', 'Ss', 'Tt', 'Uu', 'Ww', 'Yy'];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between gap-6 bg-ink p-12 text-white md:flex">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-6xl font-bold leading-none">
          {LETTERS.map((l, i) => (
            <span key={l} className={['text-mango', 'text-[#ff8a65]', 'text-[#7fb8f0]'][i % 3]}>
              {l}
            </span>
          ))}
        </div>
        <div>
          <h2 className="max-w-sm text-4xl font-extrabold leading-tight">Basa Tayo! Teacher Module</h2>
          <p className="mt-3 max-w-md text-[#aab5c7]">
            Manage the Filipino word bank, lessons tied to MATATAG competencies, pupil accounts and
            progress reports for your Grade 1 class.
          </p>
        </div>
      </div>

      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Log in</h1>
          <p className="text-sm text-ink2">Dumingag Central Elementary School</p>

          <div>
            <label className="label" htmlFor="username">Username</label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" loading={busy}>
            Log in
          </Button>

          <p className="rounded-lg bg-[#e6eefb] p-3 text-xs text-[#264a8a]">
            Demo account — username <code className="font-bold">teacher</code>, password{' '}
            <code className="font-bold">guro123</code>
          </p>
        </form>
      </div>
    </div>
  );
}
