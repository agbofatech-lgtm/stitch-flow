/**
 * Phase 14 — Inspiration Capture.
 * Supports: image upload, camera (where supported), existing garment,
 * reference URL (metadata only — never scraped), screenshot, manual.
 * Images stored in Dexie localAssetsV14 (binary blob — not localStorage).
 * Tailor remains authoritative — no auto-analysis.
 */
import { useState, useRef, useCallback } from 'react';
import {
  Upload, Camera, Link, FileImage, Shirt, PenLine,
  Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { InspirationReference, DesignObservation, InspirationSourceType } from '../../shared/api/design';
import { OBSERVATION_CATEGORIES } from '../../shared/api/design';
import { storeLocalAsset } from '../../modules/services/localAssetStore';
import { Button } from '../ui/Button';
import { Field, Input, Textarea, Select } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { Loading } from '../ui/Feedback';

const SOURCE_CONFIG: Record<InspirationSourceType, { label: string; icon: React.ReactNode; description: string }> = {
  image_upload: { label: 'Upload Image', icon: <Upload className="h-4 w-4" />, description: 'Upload a style photo from your device' },
  camera_capture: { label: 'Camera', icon: <Camera className="h-4 w-4" />, description: 'Capture using device camera' },
  existing_garment: { label: 'Existing Garment', icon: <Shirt className="h-4 w-4" />, description: 'Photo or note of a garment the customer owns' },
  reference_url: { label: 'Reference URL', icon: <Link className="h-4 w-4" />, description: 'Store a URL reference (never auto-scraped)' },
  screenshot: { label: 'Screenshot', icon: <FileImage className="h-4 w-4" />, description: 'Screenshot of a style reference' },
  manual: { label: 'Manual Notes', icon: <PenLine className="h-4 w-4" />, description: 'Written description or tailor observations only' },
};

function ObservationEditor({
  observations,
  onChange,
}: {
  observations: DesignObservation[];
  onChange: (obs: DesignObservation[]) => void;
}) {
  const [cat, setCat] = useState<DesignObservation['category']>('garment');
  const [val, setVal] = useState('');
  const [notes, setNotes] = useState('');

  const add = () => {
    if (!val.trim()) return;
    onChange([...observations, { category: cat, value: val.trim(), confidence: 'manual', notes: notes.trim() || undefined }]);
    setVal('');
    setNotes('');
  };

  return (
    <div className="space-y-3">
      <h5 className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Design Observations</h5>
      <div className="flex flex-wrap gap-2">
        {observations.map((obs, i) => (
          <div key={i} className="flex items-center gap-1 rounded-full bg-grey-light px-2.5 py-1 text-xs">
            <span className="text-ink-soft capitalize">{obs.category}:</span>
            <span className="font-medium text-ink">{obs.value}</span>
            <button
              type="button"
              onClick={() => onChange(observations.filter((_, j) => j !== i))}
              className="ml-0.5 text-ink-mute hover:text-burgundy focus-visible:outline-none"
              aria-label={`Remove observation: ${obs.value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {observations.length === 0 && (
          <p className="text-xs text-ink-mute">No observations yet — add below.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
        <Select
          value={cat}
          onChange={(e) => setCat(e.target.value as DesignObservation['category'])}
          aria-label="Observation category"
          className="!min-w-[120px]"
        >
          {OBSERVATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </Select>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g. flowing, ankle, wide sleeve…"
          aria-label="Observation value"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button size="sm" variant="secondary" onClick={add} icon={<Plus className="h-3.5 w-3.5" />}>
          Add
        </Button>
      </div>
      {notes !== undefined && (
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note for this observation…"
          aria-label="Observation note"
        />
      )}
    </div>
  );
}

function ThumbnailPreview({ thumbnailDataUrl, assetId }: { thumbnailDataUrl?: string | null; assetId?: string | null }) {
  if (!thumbnailDataUrl && !assetId) return null;
  return (
    <div className="mt-2 h-24 w-24 overflow-hidden rounded-lg border border-line bg-grey-light/30">
      {thumbnailDataUrl ? (
        <img src={thumbnailDataUrl} alt="Style reference thumbnail" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-mute">
          <FileImage className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

export function InspirationCapture({
  customerId,
  workspaceId,
  onSave,
  onCancel,
}: {
  customerId: string;
  workspaceId: string;
  onSave: (data: {
    sourceType: InspirationSourceType;
    title: string;
    sourceUrl?: string | null;
    localAssetId?: string | null;
    notes?: string;
    observations: DesignObservation[];
  }) => void;
  onCancel: () => void;
}) {
  const [sourceType, setSourceType] = useState<InspirationSourceType>('image_upload');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [observations, setObservations] = useState<DesignObservation[]>([]);
  const [localAssetId, setLocalAssetId] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showObs, setShowObs] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const { id, thumbnailDataUrl: thumb } = await storeLocalAsset(workspaceId, file, file.name);
        setLocalAssetId(id);
        if (thumb) setThumbnailDataUrl(thumb);
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, title],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      sourceType,
      title: title.trim(),
      sourceUrl: sourceUrl.trim() || null,
      localAssetId,
      notes: notes.trim() || undefined,
      observations,
    });
  };

  const needsFile = sourceType === 'image_upload' || sourceType === 'camera_capture' ||
    sourceType === 'existing_garment' || sourceType === 'screenshot';
  const needsUrl = sourceType === 'reference_url';

  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-4 shadow-e1 sf-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">Add Inspiration Reference</h4>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="text-ink-mute hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Source type selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Inspiration source type">
        {(Object.entries(SOURCE_CONFIG) as [InspirationSourceType, typeof SOURCE_CONFIG[InspirationSourceType]][]).map(([type, cfg]) => (
          <button
            key={type}
            role="radio"
            aria-checked={sourceType === type}
            type="button"
            onClick={() => setSourceType(type)}
            className={`flex items-center gap-2 rounded-md border p-2 text-left text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
              sourceType === type
                ? 'border-charcoal bg-charcoal text-ivory'
                : 'border-line bg-surface text-ink hover:bg-grey-light/60'
            }`}
          >
            {cfg.icon}
            {cfg.label}
          </button>
        ))}
      </div>

      <Field id="insp-title" label="Title *" error={!title.trim() ? undefined : undefined}>
        <Input id="insp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Customer Style Photo #1" maxLength={200} />
      </Field>

      {/* File upload area */}
      {needsFile && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Select image file"
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Capture with camera"
          />
          {uploading ? (
            <Loading label="Processing image…" />
          ) : localAssetId ? (
            <div className="flex items-center gap-3">
              <ThumbnailPreview thumbnailDataUrl={thumbnailDataUrl} assetId={localAssetId} />
              <div>
                <Badge tone="success">Image stored locally</Badge>
                <p className="mt-1 text-xs text-ink-mute">Stored offline in device database</p>
                <button type="button" onClick={() => { setLocalAssetId(null); setThumbnailDataUrl(null); }} className="mt-1 text-xs text-burgundy hover:underline focus-visible:outline-none">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sourceType === 'camera_capture' ? cameraRef.current?.click() : fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-line py-6 text-sm text-ink-soft hover:border-grey hover:bg-grey-light/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              {sourceType === 'camera_capture' ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              {sourceType === 'camera_capture' ? 'Open Camera' : 'Choose Image'}
            </button>
          )}
        </div>
      )}

      {/* URL reference */}
      {needsUrl && (
        <Field id="insp-url" label="Reference URL" help="URL is stored as metadata only — never auto-scraped or downloaded">
          <Input id="insp-url" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" maxLength={2000} />
        </Field>
      )}

      {/* Notes */}
      <Field id="insp-notes" label="Notes">
        <Textarea id="insp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the style, what the customer liked…" maxLength={2000} />
      </Field>

      {/* Observations (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowObs((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          aria-expanded={showObs}
        >
          Design Observations ({observations.length})
          {showObs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showObs && (
          <div className="mt-3">
            <ObservationEditor observations={observations} onChange={setObservations} />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!title.trim()}
        >
          Save Inspiration
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function InspirationCard({
  inspiration,
  onEdit,
  onDelete,
}: {
  inspiration: InspirationReference;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const cfg = SOURCE_CONFIG[inspiration.sourceType];

  return (
    <div className="rounded-card border border-line bg-surface p-3 shadow-e1 sf-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-mute" aria-hidden="true">{cfg.icon}</span>
            <span className="font-display text-sm font-semibold text-ink truncate">{inspiration.title}</span>
            <Badge tone="neutral">{cfg.label}</Badge>
          </div>
          {inspiration.sourceUrl && (
            <p className="mt-1 truncate text-xs text-ink-mute">
              <span className="text-ink-soft">URL:</span> {inspiration.sourceUrl}
            </p>
          )}
          {inspiration.notes && (
            <p className="mt-1 text-xs text-ink-soft line-clamp-2">{inspiration.notes}</p>
          )}
          {inspiration.observations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {inspiration.observations.map((obs, i) => (
                <span key={i} className="rounded-full bg-grey-light/70 px-2 py-0.5 text-[11px] text-ink-soft">
                  <span className="capitalize">{obs.category}</span>: {obs.value}
                </span>
              ))}
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1.5">
            {onEdit && <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>}
            {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Remove</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
