/** Phase 11 — toast system: aria-live, enter/exit slide, auto-dismiss. */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  leaving?: boolean;
}

const ToastCtx = createContext<{ push: (tone: ToastTone, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-sky-600" aria-hidden="true" />,
};

const toneBar: Record<ToastTone, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-600',
  warning: 'border-l-amber-500',
  info: 'border-l-sky-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 260);
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2 rounded-card border border-line border-l-4 ${toneBar[t.tone]} bg-surface p-3 shadow-e3 ${t.leaving ? 'sf-toast-exit' : 'sf-toast-enter'}`}
          >
            {toneIcon[t.tone]}
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="rounded-btn p-1 text-ink-mute hover:bg-grey-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
