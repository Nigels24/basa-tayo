'use client';

import { Toaster as Sonner } from 'sonner';

/** Mounted once in the root layout. */
export function Toaster() {
  return <Sonner position="top-right" richColors closeButton />;
}
