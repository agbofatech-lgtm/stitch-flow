import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AtelierConfidence,
  AtelierPage,
  AtelierThread,
  Badge,
  Button,
  DataTable,
  ExperienceEmptyState,
  Panel,
  Select,
} from '../experience';
import { separateLegacyMeasurementBlob } from '../domain/measurement/separate';
import { persistSeparatedMeasurements } from '../domain/persistence/measurementStore';
import { readMeasurementVersion } from '../domain/persistence/measurementVersionStore';
import { assessPatternInputCompleteness } from '../domain/measurement/completeness';
import { classifyMeasurementRecord } from '../domain/measurement/taxonomy';
import { observeEnginePlausibility } from '../domain/measurement/plausibility';
import type { PatternKind } from '../domain/measurement/fields';
import { executeGovernedPatternFromVersion } from '../application/measurement/t10Integration';
import { freezeLiveBlobToVersion } from '../application/measurement/versionAuthority';
import { getDataAuthorityRuntime } from '../shared/persistence';
import { useWorkflow } from '../workflow/WorkflowContext';
import { evaluateStudioGarmentIntent } from '../application/garment/studioAdapter';
import { freezeStudioGarmentSpecification } from '../application/garment/intelligence';
import { KNOWN_GARMENT_TYPES, type KnownGarmentType } from '../domain/garment/taxonomy';

const PATTERN_KINDS: PatternKind[] = ['bodice', 'shirt', 'trouser', 'skirt', 'kaftan'];

export function MeasurementWorkspace() {
  const { measurementProfiles, customers } = useApp();
  const workflow = useWorkflow();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patternKind, setPatternKind] = useState<PatternKind>('bodice');
  const [frozenLocalId, setFrozenLocalId] = useState<string | null>(null);
  const [garmentType, setGarmentType] = useState<KnownGarmentType | ''>('');

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
        };
      }),
    [customers, measurementProfiles, patternKind, workflow.customerId]
  );

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
      setMessage(
        `MeasurementVersion ${version.id} frozen to T2. Live profile “${row.label}” remains transitional.`
      );
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

  const threadClient = rows[0]?.customer || null;

  if (rows.length === 0) {
    return (
      <AtelierPage
        kicker="Measurement table"
        title="Measurements"
        description="Body, garment, and derived pattern stay separate. Live profiles remain transitional."
        thread={<AtelierThread room="Measurements" />}
        confidence={<AtelierConfidence state="local" detail="Live profiles are not frozen shop snapshots." />}
      >
        <ExperienceEmptyState
          title="No measurement profiles in this workspace"
          description="Profiles still live in the transitional application store. This table does not create a second measurement authority."
        />
      </AtelierPage>
    );
  }

  return (
    <AtelierPage
      kicker="Measurement table"
      title="Measurements"
      description="Body, garment, and derived pattern stay separate. Live profiles remain transitional."
      thread={<AtelierThread room="Measurements" client={threadClient} />}
      confidence={<AtelierConfidence state="local" detail="Live profiles are not frozen shop snapshots." />}
    >
      <Panel>
        <p className="text-label text-action-primary">Measurement workspace</p>
        <h2 className="mt-1 text-heading text-ink-primary">Body, garment, pattern</h2>
        <p className="mt-2 text-body text-ink-secondary">
          Live profiles stay transitional. Pattern values remain derived. Completeness uses T3 required keys and does not apply engine hip/bust defaults. Frozen MeasurementVersion is T2 create-only. Governed T10 execution requires a complete frozen version.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Body</Badge>
          <Badge tone="neutral">Garment</Badge>
          <Badge tone="warning">Pattern derived</Badge>
          <Badge tone="neutral">Profile live</Badge>
          <Badge>Version frozen</Badge>
        </div>
        <label className="mt-4 block text-label text-ink-secondary" htmlFor="p13-pattern-kind">
          Pattern kind for completeness
        </label>
        <Select
          id="p13-pattern-kind"
          className="mt-1 max-w-xs"
          value={patternKind}
          onChange={(event) => setPatternKind(event.target.value as PatternKind)}
        >
          {PATTERN_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </Select>
      </Panel>

      {message ? <p className="text-body text-status-success">{message}</p> : null}
      {error ? <p className="text-body text-status-danger">{error}</p> : null}
      {rows[0] ? (
        <p className="text-meta text-ink-muted">
          Engine range observation for first profile ({patternKind}):{' '}
          {observeEnginePlausibility(rows[0].separated, patternKind).status}. Incomplete sets are not sent to the
          engine.
        </p>
      ) : null}

      <DataTable
        caption="Customer measurement profiles"
        columns={[
          { id: 'label', header: 'Profile', cell: (row) => row.label },
          { id: 'customer', header: 'Customer', cell: (row) => row.customer },
          { id: 'taxonomy', header: 'Authority', cell: (row) => row.taxonomy },
          { id: 'body', header: 'Body fields', cell: (row) => String(row.bodyCount) },
          { id: 'garment', header: 'Garment fields', cell: (row) => String(row.garmentCount) },
          {
            id: 'complete',
            header: `${patternKind} complete`,
            cell: (row) => (row.completeness.complete ? 'yes' : `missing ${row.completeness.missing.join(', ')}`),
          },
        ]}
        rows={rows}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            const result = workflow.freezeMeasurementsOnOrder();
            if (!result.success) setError(result.error || 'Freeze failed');
            else {
              setError(null);
              setMessage('TRANSITIONAL order snapshot frozen. Live profile edits do not silently rewrite it.');
            }
          }}
        >
          Freeze selected profile onto order
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void runGovernedFromFrozenVersion()}>
          Governed pattern from frozen version
        </Button>
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
        {rows.slice(0, 6).map((row) => (
          <span key={row.id} className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void freezeVersionToRepository(row)}>
              Freeze version {row.label}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void snapshotToRepository(row)}>
              Snapshot {row.label}
            </Button>
          </span>
        ))}
      </div>
    </AtelierPage>
  );
}
