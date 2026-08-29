/**
 * Phase 14 — Local Asset Store.
 * Manages binary image data in Dexie (localAssetsV14) to avoid base64 in localStorage.
 * Thumbnails (≤10KB) stored alongside metadata for offline display.
 * Full binary stays local; only metadata + thumbnail sent to server.
 */
import { db } from '../../db/database';

export interface LocalAsset {
  id: string;
  workspaceId: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  thumbnailDataUrl?: string;
  createdAt: string;
}

/** Store a File/Blob in Dexie, returning the asset ID for reference. */
export async function storeLocalAsset(
  workspaceId: string,
  file: File | Blob,
  filename: string,
  idHint?: string,
): Promise<{ id: string; thumbnailDataUrl: string | null }> {
  const id = idHint || `la-${crypto.randomUUID()}`;
  const mimeType = file instanceof File ? file.type : (file as Blob).type;

  // Generate compact thumbnail (≤ ~8KB at quality 0.3)
  const thumbnailDataUrl = await generateThumbnail(file, 120, 120, 0.3);

  await db.localAssetsV14.put({
    id,
    workspaceId,
    blob: file instanceof Blob ? file : new Blob([file], { type: mimeType }),
    mimeType,
    filename,
    thumbnailDataUrl: thumbnailDataUrl ?? undefined,
    createdAt: new Date().toISOString(),
  });

  return { id, thumbnailDataUrl };
}

/** Retrieve a local asset for display. */
export async function getLocalAsset(id: string): Promise<LocalAsset | null> {
  return (await db.localAssetsV14.get(id)) as LocalAsset | null;
}

/** Get an object URL for a stored asset (caller must revoke after use). */
export async function getLocalAssetObjectUrl(id: string): Promise<string | null> {
  const asset = await db.localAssetsV14.get(id);
  if (!asset) return null;
  return URL.createObjectURL(asset.blob);
}

/** Delete a local asset. */
export async function deleteLocalAsset(id: string): Promise<void> {
  await db.localAssetsV14.delete(id);
}

/** Generate a compact thumbnail as a data URL. Falls back gracefully. */
async function generateThumbnail(
  file: File | Blob,
  maxW: number,
  maxH: number,
  quality: number,
): Promise<string | null> {
  try {
    if (typeof createImageBitmap === 'undefined') return null;
    const bitmap = await createImageBitmap(file, { resizeWidth: maxW, resizeHeight: maxH, resizeQuality: 'medium' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

/**
 * Read a File as data URL (for immediate preview before network call).
 * Used only for in-memory display — do NOT store data URLs in localStorage.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
