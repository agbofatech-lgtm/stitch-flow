/** Phase 11 — one coherent Button system (variant/size/loading/disabled). */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] px-3 py-1.5 text-xs',
  md: 'min-h-[40px] px-4 py-2 text-sm',
  lg: 'min-h-[44px] px-5 py-2.5 text-sm',
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-charcoal text-ivory hover:bg-ink-soft focus-visible:outline-gold',
  gold: 'bg-gold text-charcoal hover:bg-gold-light focus-visible:outline-gold-dark',
  secondary: 'border border-line bg-surface text-ink hover:bg-grey-light/60 focus-visible:outline-gold',
  ghost: 'text-ink-soft hover:bg-grey-light/70 focus-visible:outline-gold',
  danger: 'bg-burgundy text-white hover:bg-[#59262d] focus-visible:outline-burgundy',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className = '', disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`sf-btn-motion inline-flex select-none items-center justify-center gap-2 rounded-btn font-semibold disabled:pointer-events-none disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
