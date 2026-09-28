import { Button } from './Button';

type Props = {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};

/** For empty lists and "no results". */
export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
      {icon ? <span className="text-4xl" aria-hidden="true">{icon}</span> : null}
      <p className="font-semibold text-ink">{title}</p>
      {message ? <p className="max-w-sm text-sm text-ink3">{message}</p> : null}
      {action ? (
        <Button variant="secondary" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
