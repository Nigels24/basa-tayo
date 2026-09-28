'use client';

import { useId } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  /** Shown inside the field on the left, e.g. a search icon. */
  icon?: React.ReactNode;
};

export function TextInput({ label, error, icon, id, className = '', ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      {label ? <label className="label" htmlFor={inputId}>{label}</label> : null}
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink3">{icon}</span> : null}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`input ${icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        />
      </div>
      {error ? <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" strokeLinecap="round" />
    </svg>
  );
}
