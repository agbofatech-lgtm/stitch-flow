/**
 * Phase 14 — Inspiration Reference Service.
 * Server-authoritative, workspace-isolated.
 * Source URL is metadata only — never scraped or auto-ingested.
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db';
import { ApiError } from '../../utils/apiError';
import type { InspirationReference, DesignObservation, InspirationSourceType } from './types';

function rowToInspiration(r: Record<string, unknown>): InspirationReference {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    customerId: (r.customer_id as string) ?? null,
    sourceType: r.source_type as InspirationSourceType,
    title: r.title as string,
    sourceUrl: (r.source_url as string) ?? null,
    localAssetId: (r.local_asset_id as string) ?? null,
    notes: (r.notes as string) ?? '',
    observations: (r.observations as DesignObservation[]) ?? [],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listInspirations(
  workspaceId: string,
  customerId?: string,
): Promise<InspirationReference[]> {
  const { rows } = customerId
    ? await pool.query(
        'SELECT * FROM inspiration_references WHERE workspace_id=$1 AND customer_id=$2 ORDER BY created_at DESC',
        [workspaceId, customerId],
      )
    : await pool.query(
        'SELECT * FROM inspiration_references WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200',
        [workspaceId],
      );
  return rows.map((r) => rowToInspiration(r as Record<string, unknown>));
}

export async function getInspiration(
  workspaceId: string,
  id: string,
): Promise<InspirationReference> {
  const { rows } = await pool.query(
    'SELECT * FROM inspiration_references WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Inspiration not found');
  return rowToInspiration(rows[0] as Record<string, unknown>);
}

export interface InspirationInput {
  id?: string;
  customerId?: string | null;
  sourceType: InspirationSourceType;
  title: string;
  sourceUrl?: string | null;
  localAssetId?: string | null;
  notes?: string;
  observations?: DesignObservation[];
}

export async function createInspiration(
  workspaceId: string,
  input: InspirationInput,
): Promise<InspirationReference> {
  const id = input.id || `insp-${randomUUID()}`;
  const { rows } = await pool.query(
    `INSERT INTO inspiration_references
       (id, workspace_id, customer_id, source_type, title, source_url,
        local_asset_id, notes, observations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      id, workspaceId,
      input.customerId ?? null,
      input.sourceType,
      input.title.trim(),
      input.sourceUrl ?? null,
      input.localAssetId ?? null,
      input.notes?.trim() ?? '',
      JSON.stringify(input.observations ?? []),
    ],
  );
  return rowToInspiration(rows[0] as Record<string, unknown>);
}

export interface InspirationUpdate {
  title?: string;
  sourceUrl?: string | null;
  localAssetId?: string | null;
  notes?: string;
  observations?: DesignObservation[];
}

export async function updateInspiration(
  workspaceId: string,
  id: string,
  update: InspirationUpdate,
): Promise<InspirationReference> {
  await getInspiration(workspaceId, id); // asserts ownership
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id, workspaceId];
  let idx = 3;
  if (update.title !== undefined) { sets.push(`title = $${idx++}`); params.push(update.title.trim()); }
  if (update.sourceUrl !== undefined) { sets.push(`source_url = $${idx++}`); params.push(update.sourceUrl); }
  if (update.localAssetId !== undefined) { sets.push(`local_asset_id = $${idx++}`); params.push(update.localAssetId); }
  if (update.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(update.notes.trim()); }
  if (update.observations !== undefined) { sets.push(`observations = $${idx++}`); params.push(JSON.stringify(update.observations)); }
  const { rows } = await pool.query(
    `UPDATE inspiration_references SET ${sets.join(', ')} WHERE id=$1 AND workspace_id=$2 RETURNING *`,
    params,
  );
  return rowToInspiration(rows[0] as Record<string, unknown>);
}

export async function deleteInspiration(workspaceId: string, id: string): Promise<void> {
  await getInspiration(workspaceId, id); // asserts ownership
  await pool.query(
    'DELETE FROM inspiration_references WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
}
