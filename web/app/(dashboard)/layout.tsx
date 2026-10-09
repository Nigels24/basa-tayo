'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, getTeacher, getToken, logout, setTeacher as storeTeacher, Teacher, TEACHER_EVENT } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/words', label: 'Word Bank' },
  { href: '/lessons', label: 'Lessons' },
  { href: '/pupils', label: 'Pupils' },
  { href: '/reports', label: 'Progress Reports' },
  { href: '/account', label: 'Aking Account' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setTeacher(getTeacher());
    setSignedIn(true);

    // The header follows the Aking Account page, and a fresh copy replaces what was saved at login.
    const follow = () => setTeacher(getTeacher());
    window.addEventListener(TEACHER_EVENT, follow);
    api
      .me()
      .then(storeTeacher)
      .catch(() => {});
    return () => window.removeEventListener(TEACHER_EVENT, follow);
  }, []);

  // The printable report uses the same login check but none of the dashboard chrome.
  if (pathname.startsWith('/reports/print')) return signedIn ? <>{children}</> : null;

  return (
    <div className="grid min-h-screen md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 bg-ink p-4 text-[#c9d2df] md:sticky md:top-0 md:h-screen">
        <div className="flex items-center gap-3 border-b border-[#2d3a4e] pb-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-mango text-lg font-bold text-ink">Aa</span>
          <div>
            <strong className="block text-white">Basa Tayo!</strong>
            <small className="text-xs text-[#8f9bb0]">Teacher Module</small>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 md:flex-col">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#26324a] hover:text-white ${
                pathname.startsWith(n.href) ? 'bg-[#2f3f5c] text-white shadow-[inset_3px_0_0_#ffc53d]' : ''
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-6 py-4">
          <h1 className="text-xl font-bold">{NAV.find((n) => pathname.startsWith(n.href))?.label ?? 'Teacher Module'}</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <strong className="block text-sm">{teacher?.name ?? ''}</strong>
              <small className="text-xs text-ink3">{teacher?.school ?? ''}</small>
            </div>
            <button className="btn-ghost" onClick={() => setConfirmLogout(true)}>
              Log out
            </button>
          </div>
        </header>

        <main className="grid gap-5 p-6">{children}</main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Mag-log out?"
        message="Kailangan mong mag-log in muli para magamit ang Teacher Module."
        confirmLabel="Log out"
        variant="primary"
        loading={leaving}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setLeaving(true); // stays loading until the login page replaces this layout
          logout();
          router.replace('/login');
        }}
      />
    </div>
  );
}
