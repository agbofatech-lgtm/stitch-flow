/**
 * Phase 14 — Design Specification Service.
 * Server-authoritative, workspace-isolated, versioned.
 * Immutable history: finalized specs create versions before update.
 * Phase 14 does NOT generate patterns or calculate yardage.
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db';
import { ApiError } from '../../utils/apiError';
import { computeReadiness } from './readinessEngine';
import { buildMeasurementContext } from './measurementAdapter';
import type {
  DesignSpecification,
  DesignComponent,
  DesignObservation,
  EaseConfiguration,
  FitType,
  DesignSpecificationStatus,
} from './types';

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToSpec(r: Record<string, unknown>): DesignSpecification {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    customerId: (r.customer_id as string) ?? null,
    name: r.name as string,
    version: Number(r.version),
    parentSpecificationId: (r.parent_specification_id as string) ?? null,
    garment: {
      category: r.garment_category as string,
      subtype: (r.garment_subtype as string) ?? null,
      silhouette: (r.silhouette as string) ?? null,
      fit: (r.fit as FitType) ?? null,
      lengthType: (r.length_type as string) ?? null,
      targetLengthCm: r.target_length_cm != null ? Number(r.target_length_cm) : null,
    },
    sleeves: r.sleeve_type
      ? { type: r.sleeve_type as string, targetLengthCm: r.sleeve_length_cm != null ? Number(r.sleeve_length_cm) : null }
      : null,
    neckline: r.neckline_type ? { type: r.neckline_type as string } : null,
    components: (r.components as DesignComponent[]) ?? [],
    constructionDetails: (r.construction_details as string[]) ?? [],
    easeConfigurations: (r.ease_configurations as EaseConfiguration[]) ?? [],
    observations: (r.observations as DesignObservation[]) ?? [],
    measurementProfileId: (r.measurement_profile_id as string) ?? null,
    measurementContext: (r.measurement_context as DesignSpecification['measurementContext']) ?? null,
    inspirationIds: [],  // populated separately
    fabricProfileIds: [], // populated separately
    notes: (r.notes as string) ?? '',
    status: r.status as DesignSpecificationStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

// Load joined IDs
async function loadLinks(
  specId: string,
): Promise<{ inspirationIds: string[]; fabricProfileIds: string[] }> {
  const [inspRows, fabRows] = await Promise.all([
    pool.query(
      'SELECT inspiration_reference_id FROM design_specification_inspirations WHERE design_specification_id=$1',
      [specId],
    ),
    pool.query(
      'SELECT fabric_profile_id FROM design_specification_fabrics WHERE design_specification_id=$1',
      [specId],
    ),
  ]);
  return {
    inspirationIds: (inspRows.rows as Record<string, unknown>[]).map(
      (r) => r.inspiration_reference_id as string,
    ),
    fabricProfileIds: (fabRows.rows as Record<string, unknown>[]).map(
      (r) => r.fabric_profile_id as string,
    ),
  };
}

async function specWithLinks(spec: DesignSpecification): Promise<DesignSpecification> {
  const links = await loadLinks(spec.id);
  return { ...spec, ...links };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listDesignSpecs(
  workspaceId: string,
  customerId?: string,
): Promise<DesignSpecification[]> {
  const { rows } = customerId
    ? await pool.query(
        'SELECT * FROM design_specifications WHERE workspace_id=$1 AND customer_id=$2 ORDER BY created_at DESC',
        [workspaceId, customerId],
      )
    : await pool.query(
        'SELECT * FROM design_specifications WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200',
        [workspaceId],
      );
  return Promise.all(
    rows.map((r) => specWithLinks(rowToSpec(r as Record<string, unknown>))),
  );
}

export async function getDesignSpec(
  workspaceId: string,
  id: string,
): Promise<DesignSpecification & { readiness: ReturnType<typeof computeReadiness> }> {
  const { rows } = await pool.query(
    'SELECT * FROM design_specifications WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Design specification not found');
  const spec = await specWithLinks(rowToSpec(rows[0] as Record<string, unknown>));

  // Enrich with fabric readiness
  let fabricHasWidth = false;
  if (spec.fabricProfileIds.length > 0) {
    const { rows: fabRows } = await pool.query(
      `SELECT width_original_value FROM fabric_profiles WHERE id = ANY($1) AND workspace_id=$2`,
      [spec.fabricProfileIds, workspaceId],
    );
    fabricHasWidth = (fabRows as Record<string, unknown>[]).some(
      (r) => r.width_original_value != null,
    );
  }

  // Load measurement profile status
  let measurementStatus: string | null = null;
  if (spec.measurementProfileId) {
    const { rows: mpRows } = await pool.query(
      'SELECT status FROM measurement_profiles WHERE id=$1 AND workspace_id=$2',
      [spec.measurementProfileId, workspaceId],
    );
    if (mpRows.length > 0) measurementStatus = (mpRows[0] as Record<string, unknown>).status as string;
  }

  const readiness = computeReadiness(spec, {
    hasMeasurementProfile: !!spec.measurementProfileId,
    measurementProfileStatus: measurementStatus,
    hasInspirations: spec.inspirationIds.length > 0,
    hasFabricProfiles: spec.fabricProfileIds.length > 0,
    fabricHasWidth,
  });

  return { ...spec, readiness };
}

export interface DesignSpecInput {
  id?: string;
  customerId?: string | null;
  name: string;
  garment: {
    category: string;
    subtype?: string | null;
    silhouette?: string | null;
    fit?: FitType | null;
    lengthType?: string | null;
    targetLengthCm?: number | null;
  };
  sleeves?: { type: string; targetLengthCm?: number | null } | null;
  neckline?: { type: string } | null;
  components?: DesignComponent[];
  constructionDetails?: string[];
  easeConfigurations?: EaseConfiguration[];
  observations?: DesignObservation[];
  measurementProfileId?: string | null;
  inspirationIds?: string[];
  fabricProfileIds?: string[];
  notes?: string;
}

export async function createDesignSpec(
  workspaceId: string,
  input: DesignSpecInput,
): Promise<DesignSpecification> {
  const id = input.id || `ds-${randomUUID()}`;

  // Build measurement context snapshot if profile provided
  let contextJson: string | null = null;
  if (input.measurementProfileId) {
    const ctx = await buildMeasurementContext(workspaceId, input.measurementProfileId);
    if (ctx) contextJson = JSON.stringify(ctx);
  }

  const { rows } = await pool.query(
    `INSERT INTO design_specifications
       (id, workspace_id, customer_id, name, garment_category, garment_subtype,
        silhouette, fit, length_type, target_length_cm, sleeve_type, sleeve_length_cm,
        neckline_type, components, construction_details, ease_configurations,
        observations, measurement_profile_id, measurement_context, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'draft')
     RETURNING *`,
    [
      id, workspaceId, input.customerId ?? null, input.name.trim(),
      input.garment.category, input.garment.subtype ?? null,
      input.garment.silhouette ?? null, input.garment.fit ?? null,
      input.garment.lengthType ?? null, input.garment.targetLengthCm ?? null,
      input.sleeves?.type ?? null, input.sleeves?.targetLengthCm ?? null,
      input.neckline?.type ?? null,
      JSON.stringify(input.components ?? []),
      JSON.stringify(input.constructionDetails ?? []),
      JSON.stringify(input.easeConfigurations ?? []),
      JSON.stringify(input.observations ?? []),
      input.measurementProfileId ?? null,
      contextJson,
      input.notes?.trim() ?? '',
    ],
  );
  const spec = rowToSpec(rows[0] as Record<string, unknown>);

  // Link inspirations and fabrics
  await updateLinks(id, workspaceId, input.inspirationIds ?? [], input.fabricProfileIds ?? []);

  return specWithLinks(spec);
}

async function updateLinks(
  specId: string,
  workspaceId: string,
  inspirationIds: string[],
  fabricProfileIds: string[],
): Promise<void> {
  // Remove all existing links then re-insert
  await pool.query(
    'DELETE FROM design_specification_inspirations WHERE design_specification_id=$1',
    [specId],
  );
  await pool.query(
    'DELETE FROM design_specification_fabrics WHERE design_specification_id=$1',
    [specId],
  );

  for (const inspId of inspirationIds) {
    // Verify ownership
    const { rows } = await pool.query(
      'SELECT id FROM inspiration_references WHERE id=$1 AND workspace_id=$2',
      [inspId, workspaceId],
    );
    if (rows.length === 0) continue; // skip unowned
    await pool.query(
      'INSERT INTO design_specification_inspirations (design_specification_id, inspiration_reference_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [specId, inspId],
    );
  }

  for (const fabId of fabricProfileIds) {
    const { rows } = await pool.query(
      'SELECT id FROM fabric_profiles WHERE id=$1 AND workspace_id=$2',
      [fabId, workspaceId],
    );
    if (rows.length === 0) continue;
    await pool.query(
      'INSERT INTO design_specification_fabrics (design_specification_id, fabric_profile_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [specId, fabId],
    );
  }
}

export interface DesignSpecUpdate extends Partial<DesignSpecInput> {
  status?: DesignSpecificationStatus;
}

export async function updateDesignSpec(
  workspaceId: string,
  id: string,
  update: DesignSpecUpdate,
): Promise<DesignSpecification> {
  const existing = await getDesignSpec(workspaceId, id);

  // If moving to validated/ready_for_pattern, snapshot the current version first
  if (
    (update.status === 'validated' || update.status === 'ready_for_pattern') &&
    existing.status !== update.status
  ) {
    await pool.query(
      `INSERT INTO design_specification_versions
         (id, design_specification_id, workspace_id, version, snapshot, reason)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        `dsv-${randomUUID()}`, id, workspaceId,
        existing.version,
        JSON.stringify(existing),
        `Status transition to ${update.status}`,
      ],
    );
  }

  // Rebuild measurement context if profile changed
  let contextParam: string | undefined;
  if (update.measurementProfileId !== undefined) {
    if (update.measurementProfileId) {
      const ctx = await buildMeasurementContext(workspaceId, update.measurementProfileId);
      contextParam = ctx ? JSON.stringify(ctx) : undefined;
    } else {
      contextParam = 'null';
    }
  }

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id, workspaceId];
  let idx = 3;
  const push = (col: string, val: unknown) => { sets.push(`${col} = $${idx++}`); params.push(val); };

  if (update.name !== undefined) push('name', update.name.trim());
  if (update.status !== undefined) push('status', update.status);
  if (update.garment?.category !== undefined) push('garment_category', update.garment.category);
  if (update.garment?.subtype !== undefined) push('garment_subtype', update.garment.subtype);
  if (update.garment?.silhouette !== undefined) push('silhouette', update.garment.silhouette);
  if (update.garment?.fit !== undefined) push('fit', update.garment.fit);
  if (update.garment?.lengthType !== undefined) push('length_type', update.garment.lengthType);
  if (update.garment?.targetLengthCm !== undefined) push('target_length_cm', update.garment.targetLengthCm);
  if (update.sleeves !== undefined) {
    push('sleeve_type', update.sleeves?.type ?? null);
    push('sleeve_length_cm', update.sleeves?.targetLengthCm ?? null);
  }
  if (update.neckline !== undefined) push('neckline_type', update.neckline?.type ?? null);
  if (update.components !== undefined) push('components', JSON.stringify(update.components));
  if (update.constructionDetails !== undefined) push('construction_details', JSON.stringify(update.constructionDetails));
  if (update.easeConfigurations !== undefined) push('ease_configurations', JSON.stringify(update.easeConfigurations));
  if (update.observations !== undefined) push('observations', JSON.stringify(update.observations));
  if (update.measurementProfileId !== undefined) {
    push('measurement_profile_id', update.measurementProfileId ?? null);
    if (contextParam !== undefined) push('measurement_context', contextParam === 'null' ? null : contextParam);
  }
  if (update.notes !== undefined) push('notes', update.notes.trim());

  const { rows } = await pool.query(
    `UPDATE design_specifications SET ${sets.join(', ')} WHERE id=$1 AND workspace_id=$2 RETURNING *`,
    params,
  );
  const spec = rowToSpec(rows[0] as Record<string, unknown>);
  if (update.inspirationIds !== undefined || update.fabricProfileIds !== undefined) {
    await updateLinks(
      id, workspaceId,
      update.inspirationIds ?? existing.inspirationIds,
      update.fabricProfileIds ?? existing.fabricProfileIds,
    );
  }
  return specWithLinks(spec);
}

export async function getDesignSpecHistory(
  workspaceId: string,
  id: string,
): Promise<{ version: number; createdAt: string; reason: string }[]> {
  await getDesignSpec(workspaceId, id); // assert ownership
  const { rows } = await pool.query(
    `SELECT version, created_at, reason
     FROM design_specification_versions
     WHERE design_specification_id=$1 AND workspace_id=$2
     ORDER BY version DESC`,
    [id, workspaceId],
  );
  return rows.map((r) => ({
    version: Number((r as Record<string, unknown>).version),
    createdAt: String((r as Record<string, unknown>).created_at),
    reason: String((r as Record<string, unknown>).reason),
  }));
}
