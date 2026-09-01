import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-sf-lg border border-dashed border-line bg-surface-panel p-8 text-center shadow-sf-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-sf-lg bg-action-secondary">
        <Icon className="h-7 w-7 text-action-primary" />
      </div>

      <h3 className="font-display text-heading-sm text-ink-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="sf-focus-ring mt-5 rounded-sf bg-action-primary px-4 py-2.5 text-sm font-medium text-ink-inverse transition hover:bg-action-hover"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
