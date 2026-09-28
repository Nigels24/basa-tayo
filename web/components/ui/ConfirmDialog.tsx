'use client';

import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from './Button';

type Props = {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** danger for deletes (default); primary for non-destructive actions such as logging out. */
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirmation dialog. Esc or Cancel closes it; Cancel gets the first focus and focus stays inside while open. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', loading = false, variant = 'danger', onConfirm, onClose }: Props) {
  return (
    <Dialog open={open} onClose={() => !loading && onClose()} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 grid place-items-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white">
          <div className="grid gap-2 p-5">
            <DialogTitle className="font-bold">{title}</DialogTitle>
            {message ? <Description className="text-sm text-ink2">{message}</Description> : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button variant="secondary" onClick={onClose} disabled={loading} data-autofocus>{cancelLabel}</Button>
            <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
