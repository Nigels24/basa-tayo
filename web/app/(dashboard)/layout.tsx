'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getTeacher, getToken, logout } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/words', label: 'Word Bank' },
  { href: '/lessons', label: 'Lessons' },
  { href: '/pupils', label: 'Pupils' },
  { href: '/reports', label: 'Progress Reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<any>(null);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setTeacher(getTeacher());
  }, []);

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
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="grid gap-5 p-6">{children}</main>
      </div>
    </div>
  );
}
