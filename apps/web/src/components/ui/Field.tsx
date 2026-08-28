/** Phase 11 — standardized form controls: label, help, error, focus, height. */
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
      {help && !error && <p className="text-xs text-ink-mute">{help}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-burgundy">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full min-h-[40px] rounded-input border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-mute transition-colors duration-micro ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60';

const controlTone = (invalid?: boolean) => (invalid ? 'border-burgundy' : 'border-line hover:border-grey');

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className = '', ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={`${controlBase} ${controlTone(invalid)} ${className}`} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className = '', ...rest }, ref) {
    return <select ref={ref} aria-invalid={invalid || undefined} className={`${controlBase} ${controlTone(invalid)} ${className}`} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className = '', ...rest }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={`${controlBase} min-h-[80px] ${controlTone(invalid)} ${className}`} {...rest} />;
  },
);
