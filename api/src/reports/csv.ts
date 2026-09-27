/** CSV helpers for the research exports — Excel-friendly RFC 4180 output. */

type Cell = string | number | boolean | null | undefined;

/** Quote a field only when needed; embedded quotes are doubled (RFC 4180). */
function field(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM + header + rows, CRLF line endings, so Excel opens Filipino text correctly. */
export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(field).join(',')).join('\r\n') + '\r\n';
}

const MANILA_OFFSET_MS = 8 * 3600000; // Asia/Manila is UTC+8 all year (no DST)

/** 2026-09-27 21:15:00 in Asia/Manila time. */
export function manilaDateTime(d: Date): string {
  return new Date(d.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
}

/** Today's date in Asia/Manila, for file names. */
export function manilaToday(): string {
  return manilaDateTime(new Date()).slice(0, 10);
}

/** Start of a YYYY-MM-DD day in Asia/Manila, or null if the string is not a valid date. */
export function manilaDayStart(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T00:00:00+08:00`);
  return isNaN(d.getTime()) || manilaDateTime(d).slice(0, 10) !== day ? null : d;
}
