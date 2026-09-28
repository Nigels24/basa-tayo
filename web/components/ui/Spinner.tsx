const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

/** Animated spinner; screen readers hear "Loading…". */
export function Spinner({ size = 'md', className = '' }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span role="status" className="inline-flex">
      <svg className={`animate-spin ${SIZES[size]} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Loading…</span>
    </span>
  );
}
