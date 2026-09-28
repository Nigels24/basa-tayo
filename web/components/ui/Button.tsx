import { Spinner } from './Spinner';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-ghost',
  danger: 'btn bg-red-600 text-white hover:bg-red-700',
  ghost: 'btn text-ink2 hover:bg-ground',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  /** Shows a spinner and disables the button; the label stays in place so the width does not jump. */
  loading?: boolean;
};

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${VARIANTS[variant]} relative justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size="sm" />
        </span>
      ) : null}
    </button>
  );
}
