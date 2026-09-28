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
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirmation for destructive actions. Esc or Cancel closes it; focus stays inside while open. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', loading = false, onConfirm, onClose }: Props) {
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
            <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
            <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
