import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Basa Tayo! Teacher Module',
  description: 'Word bank, lessons, pupil accounts and progress reports for Grade 1 Filipino literacy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
