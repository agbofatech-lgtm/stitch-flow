import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Badge, Button, DataTable, ExperienceEmptyState, Panel } from '../experience';
import { separateLegacyMeasurementBlob } from '../domain/measurement/separate';
import { persistSeparatedMeasurements } from '../domain/persistence/measurementStore';
import { getDataAuthorityRuntime } from '../shared/persistence';
import { useWorkflow } from '../workflow/WorkflowContext';

export function MeasurementWorkspace() {
  const { measurementProfiles, customers } = useApp();
  const workflow = useWorkflow();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      measurementProfiles
        .filter((profile) => !workflow.customerId || profile.customerId === workflow.customerId)
        .map((profile) => {
        const blob = (profile.measurements || {}) as Record<string, unknown>;
        const separated = separateLegacyMeasurementBlob(blob);
        const customer = customers.find((item) => item.id === profile.customerId);
        return {
          id: profile.id,
          label: profile.label,
          customer: customer?.fullName || profile.customerId,
          bodyCount: Object.keys(separated.body.fields).length,
          garmentCount: Object.keys(separated.garment.fields).length,
          blob,
        };
      }),
    [customers, measurementProfiles, workflow.customerId]
  );

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

  if (rows.length === 0) {
    return (
      <ExperienceEmptyState
        title="No measurement profiles in this workspace"
        description="Profiles still live in the transitional application store. T5 does not create a second measurement authority or localStorage key."
      />
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Panel>
        <p className="text-label text-action-primary">Measurement workspace</p>
        <h1 className="mt-1 text-heading text-ink-primary">Body, garment, pattern</h1>
        <p className="mt-2 text-body text-ink-secondary">
          Pattern values remain a derived projection. Snapshots use T2 repositories only. Freeze writes the existing order measurement snapshot — live profile edits do not silently rewrite history.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Body</Badge>
          <Badge tone="neutral">Garment</Badge>
          <Badge tone="warning">Pattern derived</Badge>
        </div>
      </Panel>

      {message ? <p className="text-body text-status-success">{message}</p> : null}
      {error ? <p className="text-body text-status-danger">{error}</p> : null}

      <DataTable
        caption="Customer measurement profiles"
        columns={[
          { id: 'label', header: 'Profile', cell: (row) => row.label },
          { id: 'customer', header: 'Customer', cell: (row) => row.customer },
          { id: 'body', header: 'Body fields', cell: (row) => String(row.bodyCount) },
          { id: 'garment', header: 'Garment fields', cell: (row) => String(row.garmentCount) },
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
              setMessage('Measurement version frozen onto the selected order.');
            }
          }}
        >
          Freeze selected profile onto order
        </Button>
        {rows.slice(0, 6).map((row) => (
          <Button key={row.id} variant="secondary" size="sm" onClick={() => void snapshotToRepository(row)}>
            Snapshot {row.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
