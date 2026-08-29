/**
 * Phase 14 — Fabric Profile Form.
 * Records the actual fabric brought by the customer.
 * Available quantity ≠ required quantity (no yardage calculation in Phase 14).
 * Width and quantity stored with original units + canonical cm normalized.
 */
import { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { FabricProfile, FabricWidthUnit, FabricLengthUnit } from '../../shared/api/design';
import { FABRIC_TYPE_LABELS, widthToCm } from '../../shared/api/design';
import { storeLocalAsset } from '../../modules/services/localAssetStore';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { Loading } from '../ui/Feedback';

type FabricFormState = {
  name: string;
  fabricType: string;
  localAssetId: string | null;
  thumbnailDataUrl: string | null;
  widthValue: string;
  widthUnit: FabricWidthUnit;
  lengthValue: string;
  lengthUnit: FabricLengthUnit;
  directional: boolean | null;
  patternRepeat: boolean | null;
  patternRepeatSizeCm: string;
  requiresMatching: boolean | null;
  stretch: FabricProfile['properties']['stretch'] | '';
  transparency: FabricProfile['properties']['transparency'] | '';
  notes: string;
};

function createInitialState(): FabricFormState {
  return {
    name: '',
    fabricType: '',
    localAssetId: null,
    thumbnailDataUrl: null,
    widthValue: '',
    widthUnit: 'inch',
    lengthValue: '',
    lengthUnit: 'yard',
    directional: null,
    patternRepeat: null,
    patternRepeatSizeCm: '',
    requiresMatching: null,
    stretch: '',
    transparency: '',
    notes: '',
  };
}

function fromExisting(profile: FabricProfile): FabricFormState {
  return {
    name: profile.name,
    fabricType: profile.fabricType ?? '',
    localAssetId: profile.localAssetId ?? null,
    thumbnailDataUrl: null,
    widthValue: profile.width?.value?.toString() ?? '',
    widthUnit: profile.width?.unit ?? 'inch',
    lengthValue: profile.availableLength?.value?.toString() ?? '',
    lengthUnit: profile.availableLength?.unit ?? 'yard',
    directional: profile.properties.directional ?? null,
    patternRepeat: profile.properties.patternRepeat ?? null,
    patternRepeatSizeCm: profile.properties.patternRepeatSizeCm?.toString() ?? '',
    requiresMatching: profile.properties.requiresMatching ?? null,
    stretch: profile.properties.stretch ?? '',
    transparency: profile.properties.transparency ?? '',
    notes: profile.notes ?? '',
  };
}

function toApiData(s: FabricFormState): Omit<FabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'> {
  const widthNum = parseFloat(s.widthValue);
  const lengthNum = parseFloat(s.lengthValue);
  return {
    name: s.name.trim(),
    fabricType: s.fabricType || null,
    localAssetId: s.localAssetId,
    width: isFinite(widthNum) && widthNum > 0 ? { value: widthNum, unit: s.widthUnit } : null,
    availableLength: isFinite(lengthNum) && lengthNum > 0 ? { value: lengthNum, unit: s.lengthUnit } : null,
    properties: {
      directional: s.directional ?? undefined,
      patternRepeat: s.patternRepeat ?? undefined,
      patternRepeatSizeCm: s.patternRepeatSizeCm ? parseFloat(s.patternRepeatSizeCm) : null,
      requiresMatching: s.requiresMatching ?? undefined,
      stretch: s.stretch || undefined,
      transparency: s.transparency || undefined,
    },
    notes: s.notes.trim() || null,
  };
}

function TriStateButton({
  label, value, onChange,
}: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 text-xs text-ink-soft">{label}</span>
      {(['yes', 'no', '—'] as const).map((opt) => {
        const boolVal = opt === 'yes' ? true : opt === 'no' ? false : null;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(boolVal)}
            aria-pressed={value === boolVal}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
              value === boolVal
                ? 'bg-charcoal text-ivory'
                : 'border border-line text-ink-soft hover:bg-grey-light'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Fabric Readiness indicator — checks what information is present. */
function FabricReadiness({ state }: { state: FabricFormState }) {
  const items: { label: string; ok: boolean; warn?: string }[] = [
    { label: 'Fabric photo', ok: !!state.localAssetId },
    { label: 'Fabric type', ok: !!state.fabricType },
    { label: 'Width', ok: !!state.widthValue && parseFloat(state.widthValue) > 0 },
    { label: 'Available quantity', ok: !!state.lengthValue && parseFloat(state.lengthValue) > 0 },
    { label: 'Directionality', ok: state.directional !== null, warn: 'Needed for Phase 16 cutting layout' },
    {
      label: 'Pattern repeat',
      ok: state.patternRepeat !== null,
      warn: state.patternRepeat === true && !state.requiresMatching ? 'Matching requirement not specified' : undefined,
    },
  ];

  return (
    <div className="rounded-md border border-line bg-grey-light/20 p-3">
      <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Fabric Readiness</h5>
      <ul className="space-y-1" aria-label="Fabric readiness checklist">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-xs">
            {item.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-mute" aria-hidden="true" />
            )}
            <span className={item.ok ? 'text-ink' : 'text-ink-soft'}>
              {item.label}
              {item.warn && <span className="ml-1 text-amber-700">— {item.warn}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-mute">
        Available quantity ≠ required quantity. Yardage calculation is Phase 16.
      </p>
    </div>
  );
}

export function FabricProfileForm({
  workspaceId,
  initialProfile,
  onSave,
  onCancel,
  saving = false,
}: {
  workspaceId: string;
  initialProfile?: FabricProfile;
  onSave: (data: Omit<FabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [state, setState] = useState<FabricFormState>(
    initialProfile ? fromExisting(initialProfile) : createInitialState(),
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (updates: Partial<FabricFormState>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { id, thumbnailDataUrl } = await storeLocalAsset(workspaceId, file, file.name);
      patch({ localAssetId: id, thumbnailDataUrl });
      if (!state.name) patch({ name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') });
    } finally {
      setUploading(false);
    }
  };

  // Show width in both units
  const widthNum = parseFloat(state.widthValue);
  const widthCm = isFinite(widthNum) && state.widthValue ? widthToCm(widthNum, state.widthUnit) : null;

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-e1 sf-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-ink">
          {initialProfile ? 'Edit Fabric Profile' : 'New Fabric Profile'}
        </h4>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="text-ink-mute hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fabric photo */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Fabric Photo</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          aria-label="Select fabric photo"
        />
        {uploading ? (
          <Loading label="Processing fabric photo…" />
        ) : state.localAssetId ? (
          <div className="flex items-center gap-3">
            {state.thumbnailDataUrl && (
              <div className="h-20 w-20 overflow-hidden rounded-lg border border-line">
                <img src={state.thumbnailDataUrl} alt="Fabric" className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <Badge tone="success">Photo stored locally</Badge>
              <button type="button" onClick={() => patch({ localAssetId: null, thumbnailDataUrl: null })}
                className="mt-1 block text-xs text-burgundy hover:underline focus-visible:outline-none">
                Remove photo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-line py-5 text-sm text-ink-soft hover:border-grey hover:bg-grey-light/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <Upload className="h-5 w-5" />
            Upload fabric photo
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="fab-name" label="Fabric Name *">
          <Input id="fab-name" value={state.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Gold Ankara" maxLength={200} />
        </Field>
        <Field id="fab-type" label="Fabric Type">
          <Select id="fab-type" value={state.fabricType} onChange={(e) => patch({ fabricType: e.target.value })}>
            <option value="">— select —</option>
            {Object.entries(FABRIC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Width */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Width</p>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={state.widthValue}
            onChange={(e) => patch({ widthValue: e.target.value })}
            placeholder="e.g. 45"
            aria-label="Fabric width value"
            className="flex-1"
          />
          <Select
            value={state.widthUnit}
            onChange={(e) => patch({ widthUnit: e.target.value as FabricWidthUnit })}
            aria-label="Fabric width unit"
            className="!min-w-[80px]"
          >
            <option value="inch">inch</option>
            <option value="cm">cm</option>
          </Select>
        </div>
        {widthCm !== null && state.widthUnit === 'inch' && (
          <p className="mt-1 text-xs text-ink-mute">≈ {widthCm.toFixed(1)} cm</p>
        )}
      </div>

      {/* Available length */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          Available Quantity <span className="text-ink-mute font-normal">(what customer brought — not required amount)</span>
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={state.lengthValue}
            onChange={(e) => patch({ lengthValue: e.target.value })}
            placeholder="e.g. 6"
            aria-label="Available fabric quantity"
            className="flex-1"
          />
          <Select
            value={state.lengthUnit}
            onChange={(e) => patch({ lengthUnit: e.target.value as FabricLengthUnit })}
            aria-label="Fabric length unit"
            className="!min-w-[88px]"
          >
            <option value="yard">yard</option>
            <option value="meter">meter</option>
            <option value="cm">cm</option>
          </Select>
        </div>
      </div>

      {/* Physical properties */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Physical Properties (user-confirmed)</p>
        <TriStateButton label="Directional" value={state.directional} onChange={(v) => patch({ directional: v })} />
        <TriStateButton label="Pattern Repeat" value={state.patternRepeat} onChange={(v) => patch({ patternRepeat: v })} />
        {state.patternRepeat === true && (
          <div className="ml-[136px]">
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={state.patternRepeatSizeCm}
              onChange={(e) => patch({ patternRepeatSizeCm: e.target.value })}
              placeholder="Repeat size in cm"
              aria-label="Pattern repeat size in cm"
            />
          </div>
        )}
        <TriStateButton label="Matching Required" value={state.requiresMatching} onChange={(v) => patch({ requiresMatching: v })} />

        <div className="flex items-center gap-2">
          <span className="w-32 text-xs text-ink-soft">Stretch</span>
          <Select value={state.stretch} onChange={(e) => patch({ stretch: e.target.value as FabricFormState['stretch'] })} aria-label="Fabric stretch">
            <option value="">— not specified —</option>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-32 text-xs text-ink-soft">Transparency</span>
          <Select value={state.transparency} onChange={(e) => patch({ transparency: e.target.value as FabricFormState['transparency'] })} aria-label="Fabric transparency">
            <option value="">— not specified —</option>
            <option value="opaque">Opaque</option>
            <option value="semi-sheer">Semi-sheer</option>
            <option value="sheer">Sheer</option>
          </Select>
        </div>
      </div>

      <Field id="fab-notes" label="Notes">
        <Textarea id="fab-notes" value={state.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Any additional notes about this fabric…" maxLength={2000} />
      </Field>

      <FabricReadiness state={state} />

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onSave(toApiData(state))} disabled={!state.name.trim()} loading={saving}>
          Save Fabric Profile
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function FabricProfileCard({
  profile,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  profile: FabricProfile;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const widthDisplay = profile.width
    ? `${profile.width.value} ${profile.width.unit}`
    : null;
  const lengthDisplay = profile.availableLength
    ? `${profile.availableLength.value} ${profile.availableLength.unit}`
    : null;

  return (
    <div
      className={`rounded-card border p-3 shadow-e1 transition-shadow sf-fade-in ${selected ? 'border-charcoal' : 'border-line bg-surface hover:shadow-e2'}`}
      role={onSelect ? 'button' : undefined}
      onClick={onSelect}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect() : undefined}
      aria-pressed={onSelect ? selected : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-ink truncate">{profile.name}</span>
            {profile.fabricType && (
              <Badge tone="neutral">{FABRIC_TYPE_LABELS[profile.fabricType] ?? profile.fabricType}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-mute">
            {widthDisplay && <span>Width: {widthDisplay}</span>}
            {lengthDisplay && <span>Available: {lengthDisplay}</span>}
            {profile.properties.directional && <span>Directional</span>}
            {profile.properties.requiresMatching && <span>Matching required</span>}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onEdit && <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>}
            {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Remove</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
