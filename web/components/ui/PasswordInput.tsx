'use client';

import { useId, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Password field with a Ipakita / Itago toggle. */
export function PasswordInput({ label, error, hint, id, className = '', ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const [shown, setShown] = useState(false);

  return (
    <div className={className}>
      <label className="label" htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          type={shown ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={`input pr-20 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs font-semibold text-accent hover:bg-[#e6eefb]"
          onClick={() => setShown(!shown)}
          aria-pressed={shown}
          aria-controls={inputId}
        >
          {shown ? 'Itago' : 'Ipakita'}
        </button>
      </div>
      {error ? (
        <p id={noteId} className="mt-1 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={noteId} className="mt-1 text-xs text-ink3">{hint}</p>
      ) : null}
    </div>
  );
}
