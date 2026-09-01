import type { ReactNode } from 'react';
import { Toast } from '../primitives/feedback';

export type ToastMessage = {
  id: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
};

export function ToastRegion({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-16 right-4 z-toast flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast tone={toast.tone}>{toast.children}</Toast>
        </div>
      ))}
    </div>
  );
}
