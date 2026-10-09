/** Date range helpers shared by the reports page and the printable report. */

export const MIN_DATE = '2025-01-01';

/** Today as YYYY-MM-DD in the browser's time zone (the teacher is in Manila). */
export function todayIso() {
  return new Date().toLocaleDateString('en-CA');
}

/** A friendly message when ?from= / ?to= cannot be used, or '' when they are fine. */
export function rangeError(from: string, to: string) {
  const today = todayIso();
  for (const [name, d] of [['From', from], ['To', to]] as const) {
    if (!d) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(new Date(`${d}T00:00:00Z`).getTime())) {
      return `Mali ang petsa sa "${name}" (${d}). Gamitin ang kalendaryo para pumili.`;
    }
    if (d < MIN_DATE || d > today) {
      return `Ang petsa sa "${name}" (${d}) ay dapat mula Jan 1, 2025 hanggang ngayong araw.`;
    }
  }
  if (from && to && from > to) return 'Ang "From" na petsa ay dapat bago o kapareho ng "To". (From must not be after To.)';
  return '';
}

/** '' or '?from=…&to=…' for the API. */
export function rangeQuery(from: string, to: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams(extra);
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

/** "Oct 1 – Oct 9, 2026", "From Oct 1, 2026", "Until Oct 9, 2026" or "All dates". */
export function rangeLabel(from: string, to: string, all = 'All dates') {
  const fmt = (d: string, withYear = true) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
  if (from && to) return `${fmt(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return all;
}
