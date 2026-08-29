/**
 * Phase 13 — Profile Detail.
 * Editing/review view for a single measurement profile.
 * Shows: name/date/notes header, MeasurementForm (DRAFT only),
 * ValidationPanel, lifecycle actions (validate, activate, archive),
 * and read-only value display for non-draft profiles.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Zap,
  Archive,
  Save,
  Pencil,
  Lock,
} from 'lucide-react';
import type {
  ApiMeasurementDefinition,
  ApiMeasurementSet,
  ApiValidationResult,
} from './MeasurementTypes';
import {
  STATUS_LABEL,
  STATUS_TONE,
  KNOWN_GARMENT_TYPES,
} from './MeasurementTypes';
import { MeasurementForm, buildInitialFormState, formStateToSets } from './MeasurementForm';
import type { MeasurementFormState } from './MeasurementForm';
import { ValidationPanel } from './ValidationPanel';
import type { SuggestionItem } from './ValidationPanel';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Field';
import { Loading, ErrorState } from '../ui/Feedback';
import type { ApiMeasurementProfile, ApiProfileFull } from './MeasurementTypes';

function ReadOnlySet({ set }: { set: ApiMeasurementSet }) {
  if (set.values.length === 0) return null;
  return (
    <div className="rounded-md border border-line p-3">
      <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft capitalize">
        {set.category === 'garment' ? `${set.garmentType ?? 'Garment'} measurements` : 'Body measurements'}
      </h5>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {set.values.map((v) => (
          <div key={v.id} className="flex flex-col">
            <dt className="text-[11px] text-ink-mute capitalize">
              {v.definitionCode.replace(/_/g, ' ')}
            </dt>
            <dd className="font-medium tabular-nums text-sm text-ink">
              {v.originalValue} {v.originalUnit}
              {v.originalUnit !== 'cm' && (
                <span className="ml-1 text-xs text-ink-mute">
                  ({v.canonicalValueCm.toFixed(1)} cm)
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ProfileDetail({
  profile,
  sets,
  validation,
  bodyDefs,
  garmentDefsMap,
  suggestions,
  saving,
  validating,
  activating,
  archiving,
  error,
  onBack,
  onSaveDraft,
  onValidate,
  onActivate,
  onArchive,
  onUseSuggestion,
}: {
  profile: ApiMeasurementProfile;
  sets: ApiMeasurementSet[];
  validation: ApiValidationResult;
  bodyDefs: ApiMeasurementDefinition[];
  garmentDefsMap: Record<string, ApiMeasurementDefinition[]>;
  suggestions: SuggestionItem[];
  saving: boolean;
  validating: boolean;
  activating: boolean;
  archiving: boolean;
  error: string | null;
  onBack: () => void;
  onSaveDraft: (data: {
    name: string;
    dateTaken: string;
    notes: string;
    observations: { code: string; value: string }[];
    sets: ReturnType<typeof formStateToSets>;
  }) => void;
  onValidate: () => void;
  onActivate: () => void;
  onArchive: () => void;
  onUseSuggestion: (code: string, valueCm: number) => void;
}) {
  const isDraft = profile.status === 'DRAFT';
  const isValidated = profile.status === 'VALIDATED';
  const isActive = profile.status === 'ACTIVE';
  const isReadOnly = !isDraft;

  // Header draft
  const [name, setName] = useState(profile.name);
  const [dateTaken, setDateTaken] = useState(profile.dateTaken);
  const [notes, setNotes] = useState(profile.notes);

  // Measurement form state (only relevant when draft)
  const [formState, setFormState] = useState<MeasurementFormState>(() =>
    buildInitialFormState(
      bodyDefs,
      sets.map((s) => ({
        category: s.category,
        garmentType: s.garmentType,
        values: s.values.map((v) => ({
          definitionCode: v.definitionCode,
          originalValue: v.originalValue,
          originalUnit: v.originalUnit,
          notes: v.notes,
        })),
      })),
    ),
  );

  // When a suggestion is used, inject value into body fields
  const handleUseSuggestion = useCallback(
    (code: string, valueCm: number) => {
      setFormState((prev) => ({
        ...prev,
        bodyFields: {
          ...prev.bodyFields,
          [code]: {
            value: String(valueCm.toFixed(1)),
            unit: 'cm',
            notes: 'Applied from suggestion (previous verified measurement). Verify before activating.',
          },
        },
      }));
      onUseSuggestion(code, valueCm);
    },
    [onUseSuggestion],
  );

  const handleSave = () => {
    const apiSets = formStateToSets(formState, bodyDefs, garmentDefsMap);
    onSaveDraft({
      name: name.trim() || `Profile v${profile.version}`,
      dateTaken,
      notes,
      observations: formState.observations,
      sets: apiSets,
    });
  };

  return (
    <div className="space-y-4 sf-page-in">
      {/* Back + header */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
          Profiles
        </Button>
        <span className="text-ink-mute">/</span>
        <h3 className="font-display text-sm font-semibold text-ink">{profile.name || `Profile v${profile.version}`}</h3>
        <Badge tone={STATUS_TONE[profile.status] as BadgeTone}>{STATUS_LABEL[profile.status]}</Badge>
        {profile.version > 1 && <Badge tone="info">v{profile.version}</Badge>}
        {isReadOnly && (
          <span className="ml-auto flex items-center gap-1 text-xs text-ink-mute">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Read-only
          </span>
        )}
      </div>

      {error && <ErrorState message={error} />}

      {/* Profile header fields */}
      {isDraft ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="pd-name" label="Profile Name">
            <Input
              id="pd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Profile v${profile.version}`}
              maxLength={120}
            />
          </Field>
          <Field id="pd-date" label="Date Taken">
            <Input
              id="pd-date"
              type="date"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="pd-notes" label="Notes">
              <Textarea
                id="pd-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the tailor…"
                maxLength={2000}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 rounded-md bg-grey-light/30 p-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-xs text-ink-mute">Date Taken</span>
            <p className="font-medium text-ink">{profile.dateTaken}</p>
          </div>
          {profile.notes && (
            <div className="sm:col-span-2">
              <span className="text-xs text-ink-mute">Notes</span>
              <p className="text-ink-soft">{profile.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Lifecycle actions */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {isDraft && (
          <Button
            size="md"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Save Draft
          </Button>
        )}
        {(isDraft || isValidated) && (
          <Button
            size="md"
            variant="secondary"
            onClick={onValidate}
            loading={validating}
            disabled={!validation.canValidate && isDraft}
            icon={<CheckCircle2 className="h-4 w-4" />}
            title={!validation.canValidate ? 'Complete all required measurements to validate' : undefined}
          >
            {isDraft ? 'Save & Validate' : 'Re-validate'}
          </Button>
        )}
        {isValidated && (
          <Button
            size="md"
            variant="gold"
            onClick={onActivate}
            loading={activating}
            icon={<Zap className="h-4 w-4" />}
          >
            Activate Profile
          </Button>
        )}
        {(isDraft || isValidated || isActive) && (
          <Button
            size="md"
            variant="ghost"
            onClick={onArchive}
            loading={archiving}
            icon={<Archive className="h-4 w-4" />}
          >
            Archive
          </Button>
        )}
      </div>

      {/* Measurement entry (DRAFT only) */}
      {isDraft && (
        <MeasurementForm
          bodyDefs={bodyDefs}
          garmentDefsMap={garmentDefsMap}
          state={formState}
          onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
          l1Errors={validation.level1.errors}
          disabled={saving}
        />
      )}

      {/* Read-only value display */}
      {isReadOnly && sets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Measurements
          </h4>
          {sets.map((s) => (
            <ReadOnlySet key={s.id} set={s} />
          ))}
        </div>
      )}

      {/* Qualitative observations (read-only for non-draft) */}
      {isReadOnly && profile.qualitativeObservations?.length > 0 && (
        <div className="rounded-md border border-line p-3">
          <h5 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Qualitative Observations
          </h5>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 text-sm">
            {profile.qualitativeObservations.map((o) => (
              <div key={o.code} className="flex flex-col">
                <dt className="text-[11px] text-ink-mute capitalize">{o.code.replace(/_/g, ' ')}</dt>
                <dd className="font-medium text-ink capitalize">{o.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Validation panel */}
      <div className="rounded-card border border-line bg-surface p-4 shadow-e1">
        <h4 className="mb-3 font-display text-sm font-semibold text-ink">Validation</h4>
        <ValidationPanel
          validation={validation}
          suggestions={isDraft ? suggestions : []}
          onUseSuggestion={isDraft ? handleUseSuggestion : undefined}
        />
      </div>
    </div>
  );
}
