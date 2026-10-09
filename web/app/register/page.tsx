'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, registerTeacher } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { TextInput } from '@/components/ui/TextInput';
import { toastSuccess } from '@/components/ui/toast';
import {
  DEFAULT_SCHOOL,
  nameError,
  onlyErrors,
  passwordError,
  repeatError,
  schoolError,
  sectionError,
  usernameError,
} from '@/lib/account-rules';

type Field = 'fullName' | 'school' | 'section' | 'username' | 'password' | 'repeat' | 'registrationCode';

/** Teacher sign-up — needs the registration code the researchers give at orientation. */
export default function RegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'open' | 'closed' | 'error'>('loading');
  const [form, setForm] = useState<Record<Field, string>>({
    fullName: '',
    school: DEFAULT_SCHOOL,
    section: '',
    username: '',
    password: '',
    repeat: '',
    registrationCode: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false); // guards a double click before the busy state renders

  useEffect(() => {
    let stale = false;
    api
      .registrationStatus()
      .then((s) => !stale && setStatus(s.open ? 'open' : 'closed'))
      .catch(() => !stale && setStatus('error'));
    return () => {
      stale = true;
    };
  }, []);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    setFormError('');

    const found = onlyErrors({
      fullName: nameError(form.fullName),
      school: schoolError(form.school),
      section: sectionError(form.section),
      username: usernameError(form.username),
      password: passwordError(form.password),
      repeat: repeatError(form.password, form.repeat),
      registrationCode: form.registrationCode.trim() ? '' : 'Ilagay ang registration code',
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    submitting.current = true;
    setBusy(true);
    try {
      const teacher = await registerTeacher({
        fullName: form.fullName.trim(),
        school: form.school.trim(),
        section: form.section.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
        registrationCode: form.registrationCode.trim(),
      });
      toastSuccess(`Maligayang pagdating, ${teacher.name}!`);
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Hindi maabot ang server. Subukan muli.';
      if (err instanceof ApiError && err.status === 409) setErrors({ username: message });
      else if (err instanceof ApiError && err.status === 403 && /sarado/i.test(message)) setStatus('closed');
      else if (err instanceof ApiError && err.status === 403) setErrors({ registrationCode: message });
      else setFormError(message);
      submitting.current = false;
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return (
      <AuthShell>
        <LoadingState />
      </AuthShell>
    );
  }

  if (status !== 'open') {
    return (
      <AuthShell>
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold">Gumawa ng account</h1>
          <p className="rounded-lg bg-[#e6eefb] p-4 text-sm text-[#264a8a]">
            {status === 'closed'
              ? 'Sarado pa ang pag-register ng bagong account. Makipag-ugnayan sa mga researcher kung kailangan mo ng account.'
              : 'Hindi maabot ang server ngayon. Subukan muli mamaya.'}
          </p>
          <Link href="/login" className="btn-ghost w-full justify-center">
            Bumalik sa Log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 py-4" noValidate>
        <div>
          <h1 className="text-2xl font-bold">Gumawa ng account</h1>
          <p className="mt-1 text-sm text-ink2">Para sa mga guro ng Grade 1 na kasali sa pag-aaral.</p>
        </div>

        <TextInput label="Buong pangalan" value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" maxLength={80} required />
        <TextInput label="Paaralan" value={form.school} onChange={set('school')} error={errors.school} autoComplete="organization" maxLength={120} required />
        <TextInput label="Seksyon (opsyonal)" value={form.section} onChange={set('section')} error={errors.section} placeholder="hal. Sampaguita" maxLength={60} />

        <div>
          <TextInput
            label="Username"
            value={form.username}
            onChange={(e) => {
              setForm({ ...form, username: e.target.value.toLowerCase() });
              if (errors.username) setErrors({ ...errors, username: undefined });
            }}
            error={errors.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            required
          />
          {!errors.username ? <p className="mt-1 text-xs text-ink3">4–30 maliliit na letra, numero, tuldok (.) o underscore (_), hal. liza.ramos</p> : null}
        </div>

        <PasswordInput label="Password" value={form.password} onChange={set('password')} error={errors.password} hint="Hindi bababa sa 8 character, may letra at numero" autoComplete="new-password" required />
        <PasswordInput label="Ulitin ang password" value={form.repeat} onChange={set('repeat')} error={errors.repeat} autoComplete="new-password" required />

        <div>
          <TextInput label="Registration code" value={form.registrationCode} onChange={set('registrationCode')} error={errors.registrationCode} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
          {!errors.registrationCode ? <p className="mt-1 text-xs text-ink3">Ibinigay ng mga researcher sa orientation</p> : null}
        </div>

        {formError ? <p className="text-sm font-medium text-red-600" role="alert">{formError}</p> : null}

        <Button type="submit" className="w-full" loading={busy}>
          Gumawa ng account
        </Button>

        <p className="text-center text-sm text-ink2">
          May account na?{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
