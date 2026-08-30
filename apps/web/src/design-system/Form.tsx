/** StitchFlow Design System — forms (Stage 5 §18).
 *
 * Domain contract (unchanged, protected): canonical measurement units are
 * never hidden or transformed. `unit` renders a persistent suffix; numeric
 * inputs use tabular mono and inputMode for mobile ergonomics (§13/§18).
 * `variant="garment"` marks garment/pattern-derived fields so body vs
 * garment measurements are visually distinguishable — presentation only.
 */
import { clsx } from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
  'ds-motion-micro w-full rounded-md border bg-ds-surface px-3 py-2 text-sm text-ink placeholder:text-ink-mute ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ds-focus ' +
  'disabled:opacity-50 min-h-[var(--ds-touch-min)] sm:min-h-[var(--ds-control-h)]';

export function ValidationMessage({ id, children, tone = 'error' }: { id: string; children: ReactNode; tone?: 'error' | 'hint' }) {
  if (!children) return null;
  return (
    <p id={id} role={tone === 'error' ? 'alert' : undefined}
      className={clsx('text-xs', tone === 'error' ? 'text-ds-danger' : 'text-ink-mute')}>
      {tone === 'error' ? '⚠ ' : ''}{children}
    </p>
  );
}

export function FormField({ label, hint, error, required, optional, unit, children, id }:
  { label: string; hint?: string; error?: string; required?: boolean; optional?: boolean;
    unit?: string; children: (aria: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; className?: string }) => ReactNode; id?: string }) {
  const auto = useId();
  const fieldId = id ?? auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="ds-label">
        {label}
        {required && <span className="ml-1 text-ds-danger" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
        {optional && <span className="ml-1 normal-case tracking-normal text-ink-mute">(optional)</span>}
        {unit && <span className="ml-2 normal-case tracking-normal text-[var(--ds-info)]">[{unit}]</span>}
      </label>
      {children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <ValidationMessage id={hintId!} tone="hint">{hint}</ValidationMessage>}
      {error && <ValidationMessage id={errId!}>{error}</ValidationMessage>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; numeric?: boolean; garment?: boolean }>(
  ({ className, invalid, numeric, garment, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(control, 'ds-motion-micro',
        invalid ? 'border-ds-danger' : 'border-line',
        numeric && 'ds-numeric text-base', garment && 'border-dashed', className)}
      {...(numeric ? { inputMode: 'decimal' as const } : {})}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows}
      className={clsx(control, invalid ? 'border-ds-danger' : 'border-line', className)} {...rest} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...rest }, ref) => (
    <select ref={ref}
      className={clsx(control, invalid ? 'border-ds-danger' : 'border-line', className)} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Checkbox = ({ label, id, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className={clsx('flex items-center gap-2', className)}>
    <input id={id} type="checkbox"
      className="ds-motion-micro size-[18px] accent-[var(--ds-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus"
      {...rest} />
    <label htmlFor={id} className="ds-body text-ink select-none">{label}</label>
  </div>
);

export const Radio = ({ label, id, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div className={clsx('flex items-center gap-2', className)}>
    <input id={id} type="radio"
      className="ds-motion-micro size-[18px] accent-[var(--ds-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus"
      {...rest} />
    <label htmlFor={id} className="ds-body text-ink select-none">{label}</label>
  </div>
);

export const Switch = ({ checked, onCheckedChange, label, disabled }: {
  checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean;
}) => (
  <button
    type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={clsx(
      'ds-motion-micro inline-flex h-6 w-11 items-center rounded-full border px-0.5',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
      checked ? 'justify-end bg-ds-accent border-ds-accent' : 'justify-start bg-ds-subtle border-line',
      disabled && 'opacity-50',
    )}
  >
    <span className="block size-4 rounded-full bg-white shadow-sm" />
  </button>
);
