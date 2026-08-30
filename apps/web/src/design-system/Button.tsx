/** StitchFlow Design System — actions (Stage 5 §17 hierarchy: exactly one
 *  primary per view region; tertiary is text-only; destructive is
 *  explicitly separate). */
import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

const base =
  'ds-motion-micro inline-flex select-none items-center justify-center gap-2 rounded-lg ' +
  'font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-ds-focus disabled:pointer-events-none disabled:opacity-50 ' +
  'min-h-[var(--ds-touch-min)] sm:min-h-[var(--ds-control-h)] px-4 text-sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ds-accent text-ds-surface hover:bg-ds-accent-hover',
  secondary: 'border border-ds-accent text-ink hover:bg-ds-subtle',
  tertiary: 'text-ink-soft underline-offset-4 hover:text-ink hover:underline px-2',
  destructive: 'bg-ds-danger text-white hover:opacity-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Workflow-specific contextual action (Stage 5 §17) — secondary styling + craft accent. */
  contextual?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', contextual, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      data-variant={contextual ? 'contextual' : variant}
      className={clsx(base, variants[variant], contextual && 'border-[var(--ds-advisory)] text-[var(--ds-advisory)]', className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; variant?: ButtonVariant;
}>(({ label, variant = 'secondary', className, type = 'button', ...rest }, ref) => (
  <button
    ref={ref} type={type} aria-label={label} title={label} data-variant={variant}
    className={clsx(base, variants[variant], 'w-10 px-0', className)} {...rest}
  />
));
IconButton.displayName = 'IconButton';

export const ButtonGroup = ({ children, className, label }: { children: ReactNode; className?: string; label: string }) => (
  <div role="group" aria-label={label} className={clsx('flex flex-wrap items-center gap-2', className)}>
    {children}
  </div>
);

export const Link = ({ className, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    className={clsx(
      'ds-motion-micro text-ink underline decoration-ds-focus decoration-2 underline-offset-4',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
      className,
    )}
    {...rest}
  >
    {children}
  </a>
);
