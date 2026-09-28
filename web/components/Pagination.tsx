'use client';

import { useEffect, useState } from 'react';
import { SelectField } from './ui/SelectField';

const PAGE_SIZES = [10, 20, 30];

/**
 * Client-side paging over an already filtered list. Goes back to page 1 when
 * anything in resetOn changes, and steps back when the current page empties
 * (e.g. after deleting the last row of the last page).
 */
export function usePagination<T>(items: T[], resetOn: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const resetKey = JSON.stringify(resetOn);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return {
    rows: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
    pageSize,
    total,
    setPage,
    setPageSize,
  };
}

/** 1 … 4 5 6 … 12 — first, last and the current page's neighbours. */
function pageNumbers(page: number, pageCount: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) out.push(n);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

export function Pagination({ page, pageCount, pageSize, total, setPage, setPageSize }: ReturnType<typeof usePagination<unknown>>) {
  if (total <= PAGE_SIZES[0]) return null; // everything fits on one page

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 text-sm">
      <span className="text-ink2">Showing {first}–{last} of {total}</span>
      <SelectField
        className="w-36"
        aria-label="Rows per page"
        value={String(pageSize)}
        onChange={(v) => setPageSize(Number(v))}
        options={PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }))}
      />
      {pageCount > 1 ? (
        <nav className="ml-auto flex flex-wrap items-center gap-1" aria-label="Pages">
          <button type="button" className="btn-ghost px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          {pageNumbers(page, pageCount).map((n, i) =>
            n === '…' ? (
              <span key={`gap${i}`} className="px-1 text-ink3">…</span>
            ) : (
              <button
                type="button"
                key={n}
                className={n === page ? 'btn-primary px-3 py-1' : 'btn-ghost px-3 py-1'}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" className="btn-ghost px-3 py-1 disabled:opacity-50" disabled={page === pageCount} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
