import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

export const metadata: Metadata = {
  title: 'Basa Tayo! Teacher Module',
  description: 'Word bank, lessons, pupil accounts and progress reports for Grade 1 Filipino literacy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
