import { Spinner } from './Spinner';

/** Centered spinner for a page or panel that is still fetching. */
export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-12 text-ink3">
      <Spinner size="lg" className="text-accent" />
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
