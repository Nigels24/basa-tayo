'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError, setTeacher, Teacher } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { TextInput } from '@/components/ui/TextInput';
import { toastError, toastSuccess } from '@/components/ui/toast';
import { nameError, onlyErrors, passwordError, repeatError, schoolError, sectionError } from '@/lib/account-rules';

type ProfileField = 'fullName' | 'school' | 'section';
type PasswordField = 'currentPassword' | 'newPassword' | 'repeat';

/** Aking Account — the teacher's own name, school, section and password. */
export default function AccountPage() {
  const [me, setMe] = useState<Teacher | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let stale = false;
    api
      .me()
      .then((t) => {
        if (stale) return;
        setMe(t);
        setTeacher(t);
      })
      .catch(() => !stale && setLoadError('Hindi ma-load ang account. Subukan muli mamaya.'));
    return () => {
      stale = true;
    };
  }, []);

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!me) return <LoadingState message="Kinukuha ang account…" />;

  return (
    <div className="grid max-w-2xl gap-5">
      <ProfileForm me={me} onSaved={setMe} />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({ me, onSaved }: { me: Teacher; onSaved: (t: Teacher) => void }) {
  const [form, setForm] = useState<Record<ProfileField, string>>({ fullName: me.name, school: me.school ?? '', section: me.section ?? '' });
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: ProfileField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = onlyErrors({ fullName: nameError(form.fullName), school: schoolError(form.school), section: sectionError(form.section) });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const t = await api.updateMe({ fullName: form.fullName.trim(), school: form.school.trim(), section: form.section.trim() });
      setTeacher(t);
      onSaved(t);
      setForm({ fullName: t.name, school: t.school ?? '', section: t.section ?? '' });
      toastSuccess('Na-save ang account');
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="panel" noValidate>
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-bold">Impormasyon</h2>
        <p className="text-sm text-ink3">
          Username: <code className="font-semibold text-ink">{me.username}</code> · Ang pangalan at paaralan ay lalabas sa mga naka-print na report.
        </p>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <TextInput className="sm:col-span-2" label="Buong pangalan" value={form.fullName} onChange={set('fullName')} error={errors.fullName} maxLength={80} />
        <TextInput label="Paaralan" value={form.school} onChange={set('school')} error={errors.school} maxLength={120} />
        <TextInput label="Seksyon (opsyonal)" value={form.section} onChange={set('section')} error={errors.section} maxLength={60} />
      </div>
      <footer className="flex justify-end border-t border-line px-5 py-4">
        <Button type="submit" loading={saving}>I-save</Button>
      </footer>
    </form>
  );
}

function PasswordForm() {
  const empty = { currentPassword: '', newPassword: '', repeat: '' };
  const [form, setForm] = useState<Record<PasswordField, string>>(empty);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const set = (field: PasswordField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const found = onlyErrors({
      currentPassword: form.currentPassword ? '' : 'Ilagay ang kasalukuyang password',
      newPassword: passwordError(form.newPassword) || (form.newPassword === form.currentPassword ? 'Ang bagong password ay dapat iba sa kasalukuyan' : ''),
      repeat: repeatError(form.newPassword, form.repeat),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    submitting.current = true;
    setSaving(true);
    try {
      await api.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      toastSuccess('Napalitan ang password');
    } catch (err) {
      if (err instanceof ApiError && /kasalukuyang/i.test(err.message)) setErrors({ currentPassword: err.message });
      else toastError(err);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="panel" noValidate>
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-bold">Palitan ang password</h2>
      </header>
      <div className="grid gap-4 p-5">
        <PasswordInput label="Kasalukuyang password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} autoComplete="current-password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput label="Bagong password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="Hindi bababa sa 8 character, may letra at numero" autoComplete="new-password" />
          <PasswordInput label="Ulitin ang bagong password" value={form.repeat} onChange={set('repeat')} error={errors.repeat} autoComplete="new-password" />
        </div>
      </div>
      <footer className="flex justify-end border-t border-line px-5 py-4">
        <Button type="submit" loading={saving}>Palitan ang password</Button>
      </footer>
    </form>
  );
}
