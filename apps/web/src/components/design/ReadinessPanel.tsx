/**
 * Phase 14 — Design Readiness Panel.
 * Deterministic summary of what information is present for a Design Specification.
 * Shows: customer, measurements, inspiration, design details, fabric.
 * Tailor is always authoritative — this is informational, not blocking.
 */
import { CheckCircle2, AlertCircle, XCircle, Zap } from 'lucide-react';
import type { DesignReadiness, DesignSpecification } from '../../shared/api/design';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'neutral',
  partial: 'warning',
  ready_for_design: 'success',
  validated: 'gold',
  ready_for_pattern: 'info',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  partial: 'Partial',
  ready_for_design: 'Ready for Design',
  validated: 'Validated',
  ready_for_pattern: 'Ready for Pattern',
};

export function ReadinessPanel({
  readiness,
  spec,
  onOpenDesignStudio,
}: {
  readiness: DesignReadiness;
  spec: DesignSpecification;
  onOpenDesignStudio?: () => void;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-e1" aria-label="Design readiness">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">Design Readiness</h4>
        <Badge tone={STATUS_TONE[readiness.status]}>{STATUS_LABEL[readiness.status]}</Badge>
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-md bg-grey-light/30 p-3 text-sm">
        <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-[11px] text-ink-mute">Garment</dt>
            <dd className="font-medium capitalize text-ink">
              {spec.garment.category || '—'}
              {spec.garment.silhouette && ` · ${spec.garment.silhouette}`}
              {spec.garment.fit && ` · ${spec.garment.fit}`}
            </dd>
          </div>
          {spec.garment.lengthType && (
            <div className="flex flex-col">
              <dt className="text-[11px] text-ink-mute">Length</dt>
              <dd className="font-medium capitalize text-ink">
                {spec.garment.lengthType}
                {spec.garment.targetLengthCm && ` — ${spec.garment.targetLengthCm} cm`}
              </dd>
            </div>
          )}
          {spec.sleeves && (
            <div className="flex flex-col">
              <dt className="text-[11px] text-ink-mute">Sleeves</dt>
              <dd className="font-medium capitalize text-ink">
                {spec.sleeves.type}
                {spec.sleeves.targetLengthCm && ` (${spec.sleeves.targetLengthCm} cm)`}
              </dd>
            </div>
          )}
          {spec.neckline && (
            <div className="flex flex-col">
              <dt className="text-[11px] text-ink-mute">Neckline</dt>
              <dd className="font-medium capitalize text-ink">{spec.neckline.type}</dd>
            </div>
          )}
          {spec.components.length > 0 && (
            <div className="flex flex-col sm:col-span-2">
              <dt className="text-[11px] text-ink-mute">Components</dt>
              <dd className="text-ink">{spec.components.map((c) => c.type.replace(/_/g, ' ')).join(', ')}</dd>
            </div>
          )}
          {spec.inspirationIds.length > 0 && (
            <div className="flex flex-col">
              <dt className="text-[11px] text-ink-mute">Inspiration</dt>
              <dd className="text-ink">{spec.inspirationIds.length} reference{spec.inspirationIds.length !== 1 ? 's' : ''}</dd>
            </div>
          )}
          {spec.fabricProfileIds.length > 0 && (
            <div className="flex flex-col">
              <dt className="text-[11px] text-ink-mute">Fabric</dt>
              <dd className="text-ink">{spec.fabricProfileIds.length} profile{spec.fabricProfileIds.length !== 1 ? 's' : ''}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Checklist */}
      <ul className="space-y-1.5" aria-label="Readiness checklist">
        {readiness.items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-sm">
            {item.satisfied ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : item.warning ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
            )}
            <span>
              <span className={item.satisfied ? 'text-ink' : 'text-ink-soft'}>{item.label}</span>
              {item.warning && (
                <span className="ml-1 text-xs text-amber-700">— {item.warning}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Open Design Studio */}
      {readiness.canOpenDesignStudio && onOpenDesignStudio && (
        <div className="mt-4 border-t border-line pt-4">
          <Button
            variant="gold"
            size="md"
            onClick={onOpenDesignStudio}
            icon={<Zap className="h-4 w-4" />}
          >
            Open Design Studio
          </Button>
          <p className="mt-1.5 text-xs text-ink-mute">
            Measurement context and design details will be loaded into Design Studio.
          </p>
        </div>
      )}
    </div>
  );
}
