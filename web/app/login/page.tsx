'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, login } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    let stale = false;
    api
      .registrationStatus()
      .then((s) => !stale && setRegistrationOpen(s.open))
      .catch(() => {}); // no link if the API cannot say
    return () => {
      stale = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
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
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="text-sm text-ink2">Para sa mga guro ng Grade 1</p>

        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>

        <PasswordInput id="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

        {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}

        <Button type="submit" className="w-full" loading={busy}>
          Log in
        </Button>

        {registrationOpen ? (
          <p className="text-center text-sm text-ink2">
            Wala pang account?{' '}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Gumawa ng account
            </Link>
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
