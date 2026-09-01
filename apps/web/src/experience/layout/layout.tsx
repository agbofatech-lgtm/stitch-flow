import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8;

const gapClass: Record<Gap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
};

export function Stack({
  gap = 4,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { gap?: Gap }) {
  return (
    <div className={cn('flex flex-col', gapClass[gap], className)} {...rest}>
      {children}
    </div>
  );
}

export function Inline({
  gap = 2,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { gap?: Gap }) {
  return (
    <div className={cn('flex flex-wrap items-center', gapClass[gap], className)} {...rest}>
      {children}
    </div>
  );
}

export function Grid({
  columns = 2,
  gap = 4,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { columns?: 1 | 2 | 3 | 4; gap?: Gap }) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  }[columns];
  return (
    <div className={cn('grid', cols, gapClass[gap], className)} {...rest}>
      {children}
    </div>
  );
}

export function Panel({
  className,
  children,
  elevated = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-sf-lg border border-line bg-surface-panel p-5 text-ink-primary',
        elevated ? 'shadow-sf-md' : 'shadow-sf-sm',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <header>
        <h2 className="font-display text-heading text-ink-primary">{title}</h2>
        {description ? <p className="mt-1 text-body text-ink-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Container({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...rest}>
      {children}
    </div>
  );
}

export function SplitPane({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]', className)}>
      <div>{primary}</div>
      <div>{secondary}</div>
    </div>
  );
}

export function ScrollArea({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-auto', className)} {...rest}>
      {children}
    </div>
  );
}

export function AtelierCanvas({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-h-full bg-surface-canvas text-ink-primary', className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? (
          <p className="text-meta uppercase tracking-[0.18em] text-ink-muted">{kicker}</p>
        ) : null}
        <h1 className="mt-1 font-display text-heading-lg text-ink-primary">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-body text-ink-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Workroom({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8', className)} {...rest}>
      {children}
    </div>
  );
}

export function ResponsiveRegion({
  className,
  children,
  minHeight,
}: {
  className?: string;
  children: ReactNode;
  minHeight?: CSSProperties['minHeight'];
}) {
  return (
    <div
      className={cn('min-w-0 w-full', className)}
      style={minHeight ? { minHeight } : undefined}
    >
      {children}
    </div>
  );
}
