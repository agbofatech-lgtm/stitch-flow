import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-ink-inverse hover:bg-action-hover disabled:bg-line disabled:text-ink-muted',
  secondary:
    'bg-action-secondary text-ink-primary hover:bg-surface-workspace disabled:text-ink-muted',
  ghost: 'bg-transparent text-ink-primary hover:bg-action-secondary disabled:text-ink-muted',
  danger: 'bg-status-danger text-ink-inverse hover:opacity-90 disabled:bg-line disabled:text-ink-muted',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-label',
  md: 'min-h-11 px-4 text-body',
  lg: 'min-h-12 px-5 text-heading-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      className={cn(
        'sf-focus-ring inline-flex items-center justify-center gap-2 rounded-sf font-semibold transition duration-fast ease-standard sf-motion-safe',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="text-meta">Loading</span> : children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'sf-focus-ring inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-sf text-ink-secondary transition hover:bg-action-secondary disabled:cursor-not-allowed disabled:text-ink-muted',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
