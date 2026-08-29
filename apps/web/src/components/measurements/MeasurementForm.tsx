/**
 * Phase 13 — Measurement Form.
 * Tabbed interface: Body | Garment (per type) | Qualitative observations.
 * Definition-driven: field list comes from definition registry.
 * Unit toggle (cm/inch) converts display only — canonical value stored in cm.
 * Never auto-corrects or auto-fills values without explicit tailor action.
 */
import { useState, useCallback } from 'react';
import { Scale } from 'lucide-react';
import type {
  ApiMeasurementDefinition,
  MeasurementUnit,
  SetInput,
  ValueInput,
} from './MeasurementTypes';
import {
  KNOWN_GARMENT_TYPES,
  OBSERVATION_CODES,
  OBSERVATION_OPTIONS,
  OBSERVATION_LABELS,
  inchToCm,
  cmToInch,
} from './MeasurementTypes';
import { Field, Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';

/** Internal per-field draft state (string so user can type freely). */
type FieldDraft = {
  value: string;
  unit: MeasurementUnit;
  notes: string;
};

export type ObservationDraft = {
  code: string;
  value: string;
};

export type MeasurementFormState = {
  bodyFields: Record<string, FieldDraft>;
  garmentFields: Record<string, Record<string, FieldDraft>>; // garmentType → code → draft
  selectedGarmentTypes: string[];
  observations: ObservationDraft[];
  unit: MeasurementUnit; // global display unit
};

export function buildInitialFormState(
  bodyDefs: ApiMeasurementDefinition[],
  existingSets?: {
    category: string;
    garmentType?: string | null;
    values: { definitionCode: string; originalValue: number; originalUnit: MeasurementUnit; notes: string }[];
  }[],
  globalUnit: MeasurementUnit = 'cm',
): MeasurementFormState {
  const bodyFields: Record<string, FieldDraft> = {};
  for (const def of bodyDefs) {
    bodyFields[def.code] = { value: '', unit: globalUnit, notes: '' };
  }

  // Populate from existing sets
  if (existingSets) {
    for (const set of existingSets) {
      if (set.category === 'body') {
        for (const v of set.values) {
          const displayVal =
            globalUnit === 'inch' && v.originalUnit === 'cm'
              ? cmToInch(v.originalValue).toFixed(2)
              : globalUnit === 'cm' && v.originalUnit === 'inch'
                ? inchToCm(v.originalValue).toFixed(1)
                : String(v.originalValue);
          bodyFields[v.definitionCode] = {
            value: displayVal,
            unit: globalUnit,
            notes: v.notes,
          };
        }
      }
    }
  }

  const garmentFields: Record<string, Record<string, FieldDraft>> = {};
  const selectedGarmentTypes: string[] = [];

  if (existingSets) {
    for (const set of existingSets) {
      if (set.category === 'garment' && set.garmentType) {
        const gt = set.garmentType;
        if (!selectedGarmentTypes.includes(gt)) selectedGarmentTypes.push(gt);
        garmentFields[gt] = garmentFields[gt] ?? {};
        for (const v of set.values) {
          const displayVal =
            globalUnit === 'inch' && v.originalUnit === 'cm'
              ? cmToInch(v.originalValue).toFixed(2)
              : globalUnit === 'cm' && v.originalUnit === 'inch'
                ? inchToCm(v.originalValue).toFixed(1)
                : String(v.originalValue);
          garmentFields[gt][v.definitionCode] = {
            value: displayVal,
            unit: globalUnit,
            notes: v.notes,
          };
        }
      }
    }
  }

  return {
    bodyFields,
    garmentFields,
    selectedGarmentTypes,
    observations: [],
    unit: globalUnit,
  };
}

/** Convert a form state to SetInput[] for the API. */
export function formStateToSets(
  state: MeasurementFormState,
  bodyDefs: ApiMeasurementDefinition[],
  garmentDefsMap: Record<string, ApiMeasurementDefinition[]>,
): SetInput[] {
  const sets: SetInput[] = [];

  // Body set
  const bodyValues: ValueInput[] = [];
  for (const def of bodyDefs) {
    const draft = state.bodyFields[def.code];
    if (!draft || draft.value.trim() === '') continue;
    const num = parseFloat(draft.value);
    if (!isFinite(num) || num <= 0) continue;
    const canonicalCm = draft.unit === 'inch' ? inchToCm(num) : num;
    bodyValues.push({
      definitionCode: def.code,
      originalValue: num,
      originalUnit: draft.unit,
      source: 'manual',
      confidence: 'verified',
      notes: draft.notes,
    });
    void canonicalCm; // canonical stored server-side
  }
  if (bodyValues.length > 0) {
    sets.push({ category: 'body', values: bodyValues });
  }

  // Garment sets
  for (const gt of state.selectedGarmentTypes) {
    const defs = garmentDefsMap[gt] ?? [];
    const gtFields = state.garmentFields[gt] ?? {};
    const values: ValueInput[] = [];
    for (const def of defs) {
      const draft = gtFields[def.code];
      if (!draft || draft.value.trim() === '') continue;
      const num = parseFloat(draft.value);
      if (!isFinite(num) || num <= 0) continue;
      values.push({
        definitionCode: def.code,
        originalValue: num,
        originalUnit: draft.unit,
        source: 'manual',
        confidence: 'verified',
        notes: draft.notes,
      });
    }
    if (values.length > 0) {
      sets.push({ category: 'garment', garmentType: gt, values });
    }
  }

  return sets;
}

type Tab = 'body' | 'garment' | 'observations';

function MeasurementRow({
  def,
  draft,
  unit,
  onChange,
  errorCode,
}: {
  def: ApiMeasurementDefinition;
  draft: FieldDraft;
  unit: MeasurementUnit;
  onChange: (code: string, patch: Partial<FieldDraft>) => void;
  errorCode?: string | null;
}) {
  const id = `mf-${def.code}`;
  const hasError = !!errorCode;

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[2fr_1fr_auto]">
      <Field id={id} label={def.label} error={errorCode}>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          value={draft.value}
          onChange={(e) => onChange(def.code, { value: e.target.value })}
          placeholder={`e.g. ${unit === 'cm' ? '96' : '38'}`}
          invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft opacity-0" aria-hidden="true">
          Unit
        </label>
        <Select
          value={draft.unit}
          onChange={(e) => onChange(def.code, { unit: e.target.value as MeasurementUnit })}
          aria-label={`Unit for ${def.label}`}
          className="min-w-[72px]"
        >
          <option value="cm">cm</option>
          <option value="inch">inch</option>
        </Select>
      </div>
      <button
        type="button"
        onClick={() => onChange(def.code, { value: '' })}
        className="mt-6 text-xs text-ink-mute hover:text-burgundy focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        aria-label={`Clear ${def.label}`}
        tabIndex={draft.value ? 0 : -1}
      >
        ✕
      </button>
    </div>
  );
}

function BodyTab({
  bodyDefs,
  state,
  onChange,
  l1Errors,
}: {
  bodyDefs: ApiMeasurementDefinition[];
  state: MeasurementFormState;
  onChange: (patch: Partial<MeasurementFormState>) => void;
  l1Errors: string[];
}) {
  const handleField = useCallback(
    (code: string, patch: Partial<FieldDraft>) => {
      onChange({
        bodyFields: {
          ...state.bodyFields,
          [code]: { ...state.bodyFields[code], ...patch, unit: patch.unit ?? state.bodyFields[code]?.unit ?? state.unit },
        },
      });
    },
    [state.bodyFields, state.unit, onChange],
  );

  const errorFor = (code: string): string | null => {
    const match = l1Errors.find((e) => e.startsWith(code + ':'));
    return match ? match.slice(code.length + 2).trim() : null;
  };

  // Apply global unit to all blank fields when unit changes
  const handleGlobalUnit = (unit: MeasurementUnit) => {
    const nextBody: Record<string, FieldDraft> = {};
    for (const [code, draft] of Object.entries(state.bodyFields)) {
      nextBody[code] = { ...draft, unit };
    }
    onChange({ unit, bodyFields: nextBody });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-soft">Enter all relevant body measurements. Required fields are marked.</p>
        <div className="flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-ink-mute" aria-hidden="true" />
          <span className="text-xs text-ink-soft">Default unit:</span>
          <Select
            value={state.unit}
            onChange={(e) => handleGlobalUnit(e.target.value as MeasurementUnit)}
            className="!min-h-[28px] !py-0.5 !text-xs w-20"
            aria-label="Default measurement unit"
          >
            <option value="cm">cm</option>
            <option value="inch">inch</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {bodyDefs.map((def) => (
          <MeasurementRow
            key={def.code}
            def={def}
            draft={state.bodyFields[def.code] ?? { value: '', unit: state.unit, notes: '' }}
            unit={state.unit}
            onChange={handleField}
            errorCode={errorFor(def.code)}
          />
        ))}
      </div>
    </div>
  );
}

function GarmentTab({
  garmentDefsMap,
  state,
  onChange,
  l1Errors,
}: {
  garmentDefsMap: Record<string, ApiMeasurementDefinition[]>;
  state: MeasurementFormState;
  onChange: (patch: Partial<MeasurementFormState>) => void;
  l1Errors: string[];
}) {
  const [activeGarment, setActiveGarment] = useState<string>(
    state.selectedGarmentTypes[0] ?? '',
  );

  const addGarmentType = (gt: string) => {
    if (state.selectedGarmentTypes.includes(gt)) return;
    onChange({ selectedGarmentTypes: [...state.selectedGarmentTypes, gt] });
    setActiveGarment(gt);
  };

  const removeGarmentType = (gt: string) => {
    const next = state.selectedGarmentTypes.filter((g) => g !== gt);
    const nextFields = { ...state.garmentFields };
    delete nextFields[gt];
    onChange({ selectedGarmentTypes: next, garmentFields: nextFields });
    setActiveGarment(next[0] ?? '');
  };

  const handleField = (gt: string, code: string, patch: Partial<FieldDraft>) => {
    const current = state.garmentFields[gt] ?? {};
    onChange({
      garmentFields: {
        ...state.garmentFields,
        [gt]: { ...current, [code]: { ...current[code], ...patch, unit: patch.unit ?? current[code]?.unit ?? state.unit } },
      },
    });
  };

  const errorFor = (code: string): string | null => {
    const match = l1Errors.find((e) => e.startsWith(code + ':'));
    return match ? match.slice(code.length + 2).trim() : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-soft">Garment type:</span>
        {KNOWN_GARMENT_TYPES.map((gt) => (
          <button
            key={gt.value}
            type="button"
            onClick={() =>
              state.selectedGarmentTypes.includes(gt.value)
                ? setActiveGarment(gt.value)
                : addGarmentType(gt.value)
            }
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
              state.selectedGarmentTypes.includes(gt.value)
                ? 'bg-charcoal text-ivory'
                : 'border border-line text-ink hover:bg-grey-light'
            }`}
          >
            {gt.label}
            {state.selectedGarmentTypes.includes(gt.value) && (
              <span
                onClick={(e) => { e.stopPropagation(); removeGarmentType(gt.value); }}
                className="ml-1.5 text-ivory/70 hover:text-ivory"
                role="button"
                aria-label={`Remove ${gt.label}`}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      {state.selectedGarmentTypes.length === 0 && (
        <p className="py-6 text-center text-sm text-ink-mute">
          Select a garment type above to enter garment measurements.
        </p>
      )}

      {state.selectedGarmentTypes.length > 1 && (
        <div className="flex gap-1 border-b border-line pb-1">
          {state.selectedGarmentTypes.map((gt) => (
            <button
              key={gt}
              type="button"
              onClick={() => setActiveGarment(gt)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                activeGarment === gt
                  ? 'border-b-2 border-charcoal text-ink'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {gt}
            </button>
          ))}
        </div>
      )}

      {activeGarment && garmentDefsMap[activeGarment] && (
        <div className="space-y-3">
          {garmentDefsMap[activeGarment].map((def) => (
            <MeasurementRow
              key={def.code}
              def={def}
              draft={
                state.garmentFields[activeGarment]?.[def.code] ?? {
                  value: '',
                  unit: state.unit,
                  notes: '',
                }
              }
              unit={state.unit}
              onChange={(code, patch) => handleField(activeGarment, code, patch)}
              errorCode={errorFor(def.code)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ObservationsTab({
  state,
  onChange,
}: {
  state: MeasurementFormState;
  onChange: (patch: Partial<MeasurementFormState>) => void;
}) {
  const setObs = (code: string, value: string) => {
    const next = state.observations.filter((o) => o.code !== code);
    if (value) next.push({ code, value });
    onChange({ observations: next });
  };

  const getObs = (code: string) =>
    state.observations.find((o) => o.code === code)?.value ?? '';

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft">
        Qualitative observations are optional notes for the tailor. They do not affect validation.
      </p>
      {OBSERVATION_CODES.map((code) => (
        <Field key={code} id={`obs-${code}`} label={OBSERVATION_LABELS[code]}>
          <Select
            id={`obs-${code}`}
            value={getObs(code)}
            onChange={(e) => setObs(code, e.target.value)}
          >
            <option value="">— not recorded —</option>
            {OBSERVATION_OPTIONS[code].map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      ))}
    </div>
  );
}

export function MeasurementForm({
  bodyDefs,
  garmentDefsMap,
  state,
  onChange,
  l1Errors = [],
  disabled = false,
}: {
  bodyDefs: ApiMeasurementDefinition[];
  garmentDefsMap: Record<string, ApiMeasurementDefinition[]>;
  state: MeasurementFormState;
  onChange: (patch: Partial<MeasurementFormState>) => void;
  l1Errors?: string[];
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('body');

  return (
    <div
      className={disabled ? 'pointer-events-none opacity-60' : ''}
      aria-disabled={disabled}
    >
      {/* Tab bar */}
      <div className="mb-4 flex gap-0 border-b border-line" role="tablist" aria-label="Measurement sections">
        {(['body', 'garment', 'observations'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`mtab-${t}`}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
              tab === t
                ? 'border-b-2 border-charcoal text-ink'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t === 'observations' ? 'Observations' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'body' && l1Errors.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-burgundy text-[10px] text-white">
                {l1Errors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id="mtab-body"
        role="tabpanel"
        aria-labelledby="tab-body"
        className={tab !== 'body' ? 'hidden' : ''}
      >
        <BodyTab
          bodyDefs={bodyDefs}
          state={state}
          onChange={onChange}
          l1Errors={l1Errors}
        />
      </div>
      <div
        id="mtab-garment"
        role="tabpanel"
        aria-labelledby="tab-garment"
        className={tab !== 'garment' ? 'hidden' : ''}
      >
        <GarmentTab
          garmentDefsMap={garmentDefsMap}
          state={state}
          onChange={onChange}
          l1Errors={l1Errors}
        />
      </div>
      <div
        id="mtab-observations"
        role="tabpanel"
        aria-labelledby="tab-observations"
        className={tab !== 'observations' ? 'hidden' : ''}
      >
        <ObservationsTab state={state} onChange={onChange} />
      </div>
    </div>
  );
}
