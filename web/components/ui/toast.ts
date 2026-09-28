import { toast } from 'sonner';
import { ApiError } from '@/lib/api';

export function toastSuccess(message: string) {
  toast.success(message);
}

/** Shows the API's own message when there is one, otherwise a generic Filipino message. */
export function toastError(err: unknown) {
  toast.error(err instanceof ApiError ? err.message : 'May problema. Subukan muli.');
}
