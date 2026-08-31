import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const control =
  'sf-focus-ring w-full rounded-sf border border-line bg-surface-panel px-3 py-2 text-body text-ink-primary placeholder:text-ink-muted disabled:cursor-not-allowed disabled:bg-surface-workspace read-only:bg-surface-workspace';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-label text-ink-secondary">
        {label}
        {required ? (
          <span className="ml-1 text-status-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-meta text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-meta text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} className={cn(control, rest['aria-invalid'] && 'border-status-danger', className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-[6rem]', className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 text-body text-ink-primary', className)}>
      <input
        id={id}
        type="checkbox"
        className="sf-focus-ring h-4 w-4 rounded-sf-sm border-line text-action-primary"
        {...rest}
      />
      {label}
    </label>
  );
}

export function Radio({
  label,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label htmlFor={id} className={cn('inline-flex items-center gap-2 text-body text-ink-primary', className)}>
      <input id={id} type="radio" className="sf-focus-ring h-4 w-4 border-line text-action-primary" {...rest} />
      {label}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'sf-focus-ring relative h-6 w-11 rounded-sf-pill transition',
        checked ? 'bg-action-primary' : 'bg-line',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-surface-elevated shadow-sf-sm transition',
          checked ? 'left-5' : 'left-0.5'
        )}
      />
    </button>
  );
}
