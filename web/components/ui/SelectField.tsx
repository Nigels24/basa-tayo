'use client';

import { Field, Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';

export type SelectOption = { value: string; label: string };

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** For a field without a visible label. */
  'aria-label'?: string;
};

/**
 * Styled replacement for <select>. Headless UI's Listbox gives the keyboard
 * behaviour: arrows, Home/End, Enter/Space, Esc and type-ahead.
 */
export function SelectField({ label, value, onChange, options, placeholder = 'Pumili…', error, disabled, id, className = '', ...aria }: Props) {
  const selected = options.find((o) => o.value === value);

  return (
    <Field disabled={disabled} className={className}>
      {label ? <Label className="label">{label}</Label> : null}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <ListboxButton
          id={id}
          aria-label={aria['aria-label']}
          className={`input flex items-center justify-between gap-2 bg-white text-left data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''
          }`}
        >
          <span className={`truncate ${selected ? '' : 'text-ink3'}`}>{selected?.label ?? placeholder}</span>
          <svg className="h-4 w-4 shrink-0 text-ink3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.2 7.7a.75.75 0 0 1 1.06.02L10 11.6l3.74-3.88a.75.75 0 1 1 1.08 1.04l-4.28 4.44a.75.75 0 0 1-1.08 0L5.18 8.76a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          className="z-[60] max-h-64 w-[var(--button-width)] min-w-40 overflow-y-auto rounded-lg border border-line bg-white p-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none"
        >
          {options.map((o) => (
            <ListboxOption
              key={o.value}
              value={o.value}
              className="group flex cursor-pointer select-none items-start gap-2 rounded-md px-2 py-1.5 text-ink data-[focus]:bg-[#e6eefb] data-[selected]:font-semibold"
            >
              <svg className="invisible mt-0.5 h-4 w-4 shrink-0 text-accent group-data-[selected]:visible" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z" />
              </svg>
              <span>{o.label}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </Field>
  );
}
