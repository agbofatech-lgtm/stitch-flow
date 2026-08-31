/**
 * Legacy Design Studio draft persistence.
 * FACT: key `stitchflow:design-studio:drafts` already exists (T0).
 * T7 does not add a new localStorage key and does not delete this one.
 */

export const STUDIO_DRAFT_STORAGE_KEY = 'stitchflow:design-studio:drafts';

export type StudioDraftRecord = {
  garmentType: string;
  measurements: Record<string, number | undefined>;
  selectedInventoryFabricId: string | null;
  selectedMeasurementProfileId: string | null;
  selectedPatternLibraryId: string | null;
  selectedInspirationId: string | null;
  activeTab: 'pattern' | 'fabric' | 'inspiration';
  previewMode: string;
  restoredAt?: string | null;
  savedAt: string;
};

export function getDraftStorageKey(orderId?: string | null) {
  return orderId ? `order:${orderId}` : 'draft:unlinked';
}

export function readStudioDrafts<T = StudioDraftRecord>(): Record<string, T> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, T>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStudioDrafts(drafts: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore storage write failures — same as Design Studio today
  }
}

export function isLegacyStudioDraftKey(key: string) {
  return key === STUDIO_DRAFT_STORAGE_KEY;
}
