import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  AtelierConfidence,
  AtelierMilestone,
  AtelierStage,
  AtelierThread,
  AtelierWorkroom,
  Badge,
  Button,
  ExperienceEmptyState,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from '../experience';
import { goAtelierRoom } from '../experience/atelier/navigate';
import { motionOrInstant, motionPresets } from '../experience/motion/motion';
import { separateLegacyMeasurementBlob } from '../domain/measurement/separate';
import { persistSeparatedMeasurements } from '../domain/persistence/measurementStore';
import { readMeasurementVersion } from '../domain/persistence/measurementVersionStore';
import { assessPatternInputCompleteness } from '../domain/measurement/completeness';
import { classifyMeasurementRecord } from '../domain/measurement/taxonomy';
import { observeEnginePlausibility } from '../domain/measurement/plausibility';
import {
  BODY_MEASUREMENT_FIELDS,
  GARMENT_MEASUREMENT_FIELDS,
  PATTERN_INPUT_FIELDS,
  type PatternKind,
} from '../domain/measurement/fields';
import { executeGovernedPatternFromVersion } from '../application/measurement/t10Integration';
import { freezeLiveBlobToVersion } from '../application/measurement/versionAuthority';
import { getDataAuthorityRuntime } from '../shared/persistence';
import { useWorkflow } from '../workflow/WorkflowContext';
import { evaluateStudioGarmentIntent } from '../application/garment/studioAdapter';
import { freezeStudioGarmentSpecification } from '../application/garment/intelligence';
import { KNOWN_GARMENT_TYPES, type KnownGarmentType } from '../domain/garment/taxonomy';
import type { GarmentMeasurements } from '../shared/types';

const PATTERN_KINDS: PatternKind[] = ['bodice', 'shirt', 'trouser', 'skirt', 'kaftan'];

function fieldLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function captureKeys(kind: PatternKind, present: string[], catalog: readonly string[]) {
  const required = PATTERN_INPUT_FIELDS[kind];
  return catalog.filter((key) => key !== 'notes' && (present.includes(key) || required.includes(key)));
}

function formatCm(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return String(value);
}

export function MeasurementWorkspace() {
  const { measurementProfiles, customers, currentWorkspace, addCustomerMeasurementProfile, updateCustomerMeasurementProfile } =
    useApp();
  const workflow = useWorkflow();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patternKind, setPatternKind] = useState<PatternKind>('bodice');
  const [frozenLocalId, setFrozenLocalId] = useState<string | null>(null);
  const [garmentType, setGarmentType] = useState<KnownGarmentType | ''>('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [listOpen, setListOpen] = useState(() => !workflow.profileId);

  const selectedCustomer = workflow.customerId
    ? customers.find((customer) => customer.id === workflow.customerId) || null
    : null;

  const rows = useMemo(
    () =>
      measurementProfiles
        .filter((profile) => !workflow.customerId || profile.customerId === workflow.customerId)
        .map((profile) => {
          const blob = (profile.measurements || {}) as Record<string, unknown>;
          const separated = separateLegacyMeasurementBlob(blob, patternKind);
          const completeness = assessPatternInputCompleteness(separated, patternKind);
          const taxonomy = classifyMeasurementRecord({ isLiveProfile: true });
          const customer = customers.find((item) => item.id === profile.customerId);
          return {
            id: profile.id,
            label: profile.label,
            customer: customer?.fullName || profile.customerId,
            bodyCount: Object.keys(separated.body.fields).length,
            garmentCount: Object.keys(separated.garment.fields).length,
            completeness,
            taxonomy: taxonomy.authority,
            blob,
            customerId: profile.customerId,
            separated,
            notes: typeof blob.notes === 'string' ? blob.notes : separated.garment.notes || '',
            measurements: profile.measurements || {},
          };
        }),
    [customers, measurementProfiles, patternKind, workflow.customerId]
  );

  const selectedRow = rows.find((row) => row.id === workflow.profileId) || null;

  useEffect(() => {
    if (!selectedRow) {
      setDraft({});
      return;
    }
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(selectedRow.separated.body.fields)) {
      next[key] = formatCm(value);
    }
    for (const [key, value] of Object.entries(selectedRow.separated.garment.fields)) {
      next[key] = formatCm(value);
    }
    next.notes = selectedRow.notes || '';
    setDraft(next);
  }, [selectedRow?.id, selectedRow?.measurements, patternKind]);

  async function freezeVersionToRepository(row: (typeof rows)[number]) {
    setError(null);
    setMessage(null);
    const runtime = getDataAuthorityRuntime();
    if (!runtime) {
      setError('T2 data authority runtime is not started. Measurement version was not written to a new store.');
      return;
    }
    try {
      const { record, version } = await freezeLiveBlobToVersion(runtime.repositories.measurement, {
        blob: row.blob,
        patternKind,
        customerId: row.customerId,
        profileId: row.id,
        source: 'profile',
      });
      setFrozenLocalId(record.metadata.localId);
      setMessage(`MeasurementVersion ${version.id} frozen to T2. Live profile “${row.label}” remains transitional.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Version freeze failed');
    }
  }

  async function runGovernedFromFrozenVersion() {
    setError(null);
    setMessage(null);
    const runtime = getDataAuthorityRuntime();
    if (!runtime || !frozenLocalId) {
      setError('Freeze a MeasurementVersion to T2 before governed execution.');
      return;
    }
    try {
      const version = await readMeasurementVersion(runtime.repositories.measurement, frozenLocalId);
      if (!version) {
        setError('Frozen measurement version was not found.');
        return;
      }
      const executed = executeGovernedPatternFromVersion(version, patternKind);
      setMessage(
        `Governed ${patternKind} fingerprint ${executed.fingerprint.value} (version ${version.id}). Engine not rewritten.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Governed execution failed');
    }
  }

  async function snapshotToRepository(row: (typeof rows)[number]) {
    setError(null);
    setMessage(null);
    const runtime = getDataAuthorityRuntime();
    if (!runtime) {
      setError('T2 data authority runtime is not started. Measurement store was not bypassed.');
      return;
    }
    try {
      await persistSeparatedMeasurements(runtime.repositories.measurement, {
        blob: row.blob,
        customerId: measurementProfiles.find((item) => item.id === row.id)?.customerId,
      });
      setMessage(`Snapshot of “${row.label}” written to the T2 measurement repository.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository write failed');
    }
  }

  function commitField(key: string, raw: string) {
    if (!selectedRow) return;
    const measurements: GarmentMeasurements = { ...selectedRow.measurements };
    if (key === 'notes') {
      measurements.notes = raw.trim() || undefined;
      updateCustomerMeasurementProfile(selectedRow.id, { measurements });
      return;
    }
    const parsed = raw.trim() === '' ? NaN : Number(raw);
    if (raw.trim() === '') {
      delete measurements[key as keyof GarmentMeasurements];
    } else if (Number.isFinite(parsed)) {
      (measurements as Record<string, number | string | undefined>)[key] = parsed;
    } else {
      return;
    }
    updateCustomerMeasurementProfile(selectedRow.id, { measurements });
  }

  function beginLiveProfile() {
    if (!workflow.customerId) {
      setError('Select a client before beginning a live profile.');
      return;
    }
    const id = addCustomerMeasurementProfile({
      workspaceId: currentWorkspace.id,
      customerId: workflow.customerId,
      label: 'Live profile',
      profileType: 'custom',
      measurements: {},
      isDefault: true,
      notes: '',
    });
    workflow.selectProfile(id);
    setListOpen(false);
    setError(null);
    setMessage('Live profile opened. Values stay transitional until frozen.');
  }

  const workroomProps = {
    place: 'Measurement table',
    title: 'Measurements',
    purpose: 'Body, garment, and derived pattern stay separate. Capture is precise. Live profiles remain transitional.',
    thread: <AtelierThread room="Measurement table" client={selectedCustomer?.fullName || null} />,
    confidence: <AtelierConfidence state="local" detail="Live profiles are not frozen shop snapshots." />,
    primaryAction: (
      <Button variant="primary" onClick={() => goAtelierRoom('design')}>
        Continue to design
      </Button>
    ),
  };

  const bodyKeys = selectedRow
    ? captureKeys(patternKind, Object.keys(selectedRow.separated.body.fields), BODY_MEASUREMENT_FIELDS)
    : [];
  const garmentKeys = selectedRow
    ? captureKeys(patternKind, Object.keys(selectedRow.separated.garment.fields), GARMENT_MEASUREMENT_FIELDS)
    : [];

  return (
    <AtelierWorkroom {...workroomProps}>
      <div className="grid items-start gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <section
          data-profile-list="true"
          className={selectedRow && !listOpen ? 'hidden xl:block' : selectedRow ? 'order-2 xl:order-1' : undefined}
        >
          <p className="text-meta text-ink-muted">Live profiles</p>
          {selectedCustomer ? (
            <p className="mt-1 text-label text-ink-primary">{selectedCustomer.fullName}</p>
          ) : (
            <p className="mt-1 text-body text-ink-secondary">No client selected. Showing every live profile in this workspace.</p>
          )}
          {rows.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title={
                  selectedCustomer ? 'No live profile for this client' : 'No measurement profiles in this workspace'
                }
                description={
                  selectedCustomer
                    ? 'Begin a live profile to capture body and garment. This table does not create a second measurement authority.'
                    : 'Profiles still live in the transitional application store. Open the client room, then begin a live profile here.'
                }
                action={
                  selectedCustomer ? (
                    <Button size="md" onClick={beginLiveProfile}>
                      Begin a live profile
                    </Button>
                  ) : (
                    <Button size="md" variant="secondary" onClick={() => goAtelierRoom('clients')}>
                      Open client room
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
              {rows.map((row) => {
                const current = row.id === selectedRow?.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-current={current ? 'true' : undefined}
                      onClick={() => {
                        workflow.selectProfile(row.id);
                        setListOpen(false);
                      }}
                      className="sf-focus-ring sf-micro-press flex min-h-11 w-full flex-col items-start py-3 text-left"
                    >
                      <span className="text-label text-ink-primary">{row.label}</span>
                      <span className="font-numeric text-meta text-ink-muted">
                        {row.customer}
                        <span aria-hidden="true"> · </span>
                        {row.bodyCount} body
                        <span aria-hidden="true"> · </span>
                        {row.garmentCount} garment
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedCustomer && rows.length > 0 ? (
            <div className="mt-4">
              <Button variant="secondary" className="w-full" onClick={beginLiveProfile}>
                Begin a live profile
              </Button>
            </div>
          ) : null}
        </section>

        <section data-measurement-canvas="true" className={selectedRow ? 'order-1 xl:order-2' : undefined}>
          {selectedRow ? (
            <motion.div
              key={selectedRow.id}
              data-motion-category="contextual"
              {...motionOrInstant(motionPresets.contextual)}
            >
              <AtelierStage>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-meta text-ink-muted">Precision capture</p>
                    <h2 className="mt-1 font-display text-heading text-ink-primary">{selectedRow.label}</h2>
                    <p className="mt-1 text-meta text-ink-muted">
                      {selectedRow.customer}
                      <span aria-hidden="true"> · </span>
                      {selectedRow.taxonomy}
                      <span aria-hidden="true"> · </span>
                      centimetres
                    </p>
                  </div>
                  <Button variant="ghost" className="xl:hidden" onClick={() => setListOpen(true)}>
                    All profiles
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-[12rem]">
                    <label className="block text-label text-ink-secondary" htmlFor="pattern-kind">
                      Pattern kind
                    </label>
                    <Select
                      id="pattern-kind"
                      className="mt-1"
                      value={patternKind}
                      onChange={(event) => setPatternKind(event.target.value as PatternKind)}
                    >
                      {PATTERN_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {selectedRow.completeness.complete ? (
                    <Badge tone="success">{patternKind} is complete</Badge>
                  ) : (
                    <Badge tone="warning">
                      Missing {selectedRow.completeness.missing.join(', ') || 'required fields'}
                    </Badge>
                  )}
                </div>

                <p className="mt-3 text-meta text-ink-muted">
                  Engine range observation ({patternKind}):{' '}
                  {observeEnginePlausibility(selectedRow.separated, patternKind).status}. Incomplete sets are not sent
                  to the engine.
                </p>
              </AtelierStage>

              <AtelierMilestone active={Boolean(message && /frozen|fingerprint/i.test(message))}>
                {message}
              </AtelierMilestone>
              {message && !/frozen|fingerprint/i.test(message) ? (
                <p className="text-body text-status-success">{message}</p>
              ) : null}
              {error ? (
                <p role="alert" className="text-body text-status-danger">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section data-measurement-class="body">
                  <h3 className="font-display text-heading-sm text-ink-primary">Body</h3>
                  <p className="mt-1 text-meta text-ink-muted">The person. Not ease, not garment length.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {bodyKeys.map((key) => (
                      <Field
                        key={key}
                        label={fieldLabel(key)}
                        htmlFor={`body-${key}`}
                        hint={PATTERN_INPUT_FIELDS[patternKind].includes(key) ? 'Required for this kind' : undefined}
                      >
                        <Input
                          id={`body-${key}`}
                          inputMode="decimal"
                          className="font-numeric"
                          value={draft[key] ?? ''}
                          onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                          onBlur={(event) => commitField(key, event.target.value)}
                          aria-invalid={
                            PATTERN_INPUT_FIELDS[patternKind].includes(key) && !draft[key] ? true : undefined
                          }
                        />
                      </Field>
                    ))}
                  </div>
                </section>

                <section data-measurement-class="garment">
                  <h3 className="font-display text-heading-sm text-ink-primary">Garment</h3>
                  <p className="mt-1 text-meta text-ink-muted">Finished lengths and openings. Derived pattern is not captured here.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {garmentKeys.map((key) => (
                      <Field
                        key={key}
                        label={fieldLabel(key)}
                        htmlFor={`garment-${key}`}
                        hint={PATTERN_INPUT_FIELDS[patternKind].includes(key) ? 'Required for this kind' : undefined}
                      >
                        <Input
                          id={`garment-${key}`}
                          inputMode="decimal"
                          className="font-numeric"
                          value={draft[key] ?? ''}
                          onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                          onBlur={(event) => commitField(key, event.target.value)}
                          aria-invalid={
                            PATTERN_INPUT_FIELDS[patternKind].includes(key) && !draft[key] ? true : undefined
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Field label="Notes" htmlFor="garment-notes">
                      <Textarea
                        id="garment-notes"
                        value={draft.notes ?? ''}
                        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                        onBlur={(event) => commitField('notes', event.target.value)}
                      />
                    </Field>
                  </div>
                </section>
              </div>

              <section className="mt-6" data-measurement-class="pattern">
                <h3 className="font-display text-heading-sm text-ink-primary">Pattern (derived)</h3>
                <p className="mt-1 text-meta text-ink-muted">
                  Projection from body + garment for {patternKind}. Not a third vocabulary. Not editable.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {PATTERN_INPUT_FIELDS[patternKind].map((key) => {
                    const value = selectedRow.separated.pattern?.fields[key];
                    return (
                      <li key={key}>
                        <Badge tone={typeof value === 'number' ? 'info' : 'warning'}>
                          {fieldLabel(key)}{' '}
                          <span className="font-numeric">{typeof value === 'number' ? `${value} cm` : '—'}</span>
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const result = workflow.freezeMeasurementsOnOrder();
                    if (!result.success) setError(result.error || 'Freeze failed');
                    else {
                      setError(null);
                      setMessage('TRANSITIONAL order snapshot frozen. Live profile edits do not silently rewrite it.');
                    }
                  }}
                >
                  Freeze onto order
                </Button>
                <Button variant="secondary" onClick={() => void freezeVersionToRepository(selectedRow)}>
                  Freeze version to T2
                </Button>
                <Button variant="secondary" onClick={() => void runGovernedFromFrozenVersion()}>
                  Governed pattern from frozen version
                </Button>
                <Button variant="ghost" onClick={() => void snapshotToRepository(selectedRow)}>
                  Snapshot to T2
                </Button>
              </div>

              <Panel className="mt-6">
                <p className="text-label text-ink-primary">Garment specification</p>
                <p className="mt-1 text-meta text-ink-muted">
                  Studio intent only. Not pattern geometry. Live type remains mutable until frozen.
                </p>
                <label className="mt-3 block text-label text-ink-secondary" htmlFor="garment-spec-type">
                  Garment type
                </label>
                <Select
                  id="garment-spec-type"
                  className="mt-1 max-w-xs"
                  value={garmentType}
                  onChange={(event) => setGarmentType(event.target.value as KnownGarmentType | '')}
                >
                  <option value="">Unset</option>
                  {KNOWN_GARMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setError(null);
                      const evaluated = evaluateStudioGarmentIntent({
                        garmentType: garmentType || undefined,
                        orderId: workflow.orderId,
                        customerId: workflow.customerId,
                      });
                      setMessage(
                        `Garment specification ${evaluated.completeness}. Type ${evaluated.canonical.garmentTypeStatus}. Optional absent: ${evaluated.optionalAbsent.join(', ') || 'none'}. Not pattern geometry.`
                      );
                    }}
                  >
                    Evaluate garment specification
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void (async () => {
                        setError(null);
                        setMessage(null);
                        const runtime = getDataAuthorityRuntime();
                        if (!runtime) {
                          setError('T2 data authority runtime is not started. Specification was not written to a new store.');
                          return;
                        }
                        try {
                          const frozen = await freezeStudioGarmentSpecification(runtime.repositories.garment, {
                            garmentType: garmentType || undefined,
                            orderId: workflow.orderId,
                            customerId: workflow.customerId,
                          });
                          setMessage(
                            `GarmentSpecificationVersion ${frozen.version.id} frozen. Live Studio/Order type remains mutable. Fingerprint ${frozen.version.fingerprint.value}.`
                          );
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Specification freeze failed');
                        }
                      })();
                    }}
                  >
                    Freeze garment specification
                  </Button>
                </div>
              </Panel>
            </motion.div>
          ) : rows.length === 0 ? null : (
            <ExperienceEmptyState
              title="Select a live profile"
              description="Choose a live profile to capture body and garment. The thread does not borrow the first row."
            />
          )}
        </section>
      </div>
    </AtelierWorkroom>
  );
}
