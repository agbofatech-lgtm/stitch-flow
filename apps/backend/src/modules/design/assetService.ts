/**
 * Phase 14 — Local Asset Service.
 * Manages asset metadata server-side (thumbnail, mime type, size).
 * Binary data is stored client-side in Dexie localAssetsV14.
 * Server receives thumbnail + metadata only (no full-size binary required).
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db';

export interface AssetInput {
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  widthPx?: number;
  heightPx?: number;
  thumbnailDataUrl?: string;
}

export interface AssetRecord {
  id: string;
  workspaceId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  thumbnailDataUrl: string | null;
  createdAt: string;
}

function rowToAsset(r: Record<string, unknown>): AssetRecord {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    filename: r.filename as string,
    mimeType: r.mime_type as string,
    sizeBytes: Number(r.size_bytes),
    widthPx: r.width_px != null ? Number(r.width_px) : null,
    heightPx: r.height_px != null ? Number(r.height_px) : null,
    thumbnailDataUrl: (r.thumbnail_data_url as string) ?? null,
    createdAt: String(r.created_at),
  };
}

export async function registerAsset(
  workspaceId: string,
  input: AssetInput,
  idHint?: string,
): Promise<AssetRecord> {
  const id = idHint || `asset-${randomUUID()}`;
  const { rows } = await pool.query(
    `INSERT INTO local_assets
       (id, workspace_id, filename, mime_type, size_bytes, width_px, height_px, thumbnail_data_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       filename = EXCLUDED.filename,
       mime_type = EXCLUDED.mime_type,
       size_bytes = EXCLUDED.size_bytes,
       width_px = EXCLUDED.width_px,
       height_px = EXCLUDED.height_px,
       thumbnail_data_url = EXCLUDED.thumbnail_data_url
     RETURNING *`,
    [
      id, workspaceId,
      input.filename, input.mimeType,
      input.sizeBytes ?? 0,
      input.widthPx ?? null, input.heightPx ?? null,
      input.thumbnailDataUrl ?? null,
    ],
  );
  return rowToAsset(rows[0] as Record<string, unknown>);
}

export async function getAsset(
  workspaceId: string,
  assetId: string,
): Promise<AssetRecord | null> {
  const { rows } = await pool.query(
    'SELECT * FROM local_assets WHERE id=$1 AND workspace_id=$2',
    [assetId, workspaceId],
  );
  return rows.length > 0 ? rowToAsset(rows[0] as Record<string, unknown>) : null;
}
