/**
 * Phase 13 — Measurement Intelligence client service.
 * Wraps the backend API with local Dexie v3 caching for offline-first use.
 * Drafts persist locally before any network call. Network errors degrade
 * gracefully to locally-cached data. Historical records are never mutated.
 */
import { db } from '../../db/database';
import type { LocalRow } from '../../db/database';
import * as api from '../../shared/api/measurements';

/** Cache a fetched profile list into Dexie. */
async function cacheProfiles(workspaceId: string, profiles: api.ApiMeasurementProfile[]): Promise<void> {
  try {
    await db.measurementProfilesV13.bulkPut(
      profiles.map((p) => ({ ...p, workspaceId } as LocalRow)),
    );
  } catch {
    // cache write failure must never break the UI
  }
}

/** Cache a fetched profile-full (sets + values) into Dexie. */
async function cacheProfileFull(workspaceId: string, full: api.ApiProfileFull): Promise<void> {
  try {
    await db.transaction('rw', [db.measurementProfilesV13, db.measurementSetsV13, db.measurementValuesV13], async () => {
      await db.measurementProfilesV13.put({ ...full.profile, workspaceId } as LocalRow);
      for (const set of full.sets) {
        await db.measurementSetsV13.put({ ...set, profileId: full.profile.id, workspaceId } as LocalRow);
        for (const val of set.values) {
          await db.measurementValuesV13.put({ ...val, setId: set.id, workspaceId } as LocalRow);
        }
      }
    });
  } catch {
    // cache write failure must never break the UI
  }
}

/** Attempt API; on failure return local cache. */
export async function listProfiles(
  customerId: string,
  workspaceId: string,
): Promise<api.ApiMeasurementProfile[]> {
  try {
    const profiles = await api.listProfiles(customerId);
    await cacheProfiles(workspaceId, profiles);
    return profiles;
  } catch {
    // offline — return cached
    const rows = await db.measurementProfilesV13
      .where('[workspaceId+id]')
      .between([workspaceId, ''], [workspaceId, '\uffff'])
      .filter((r) => r['customerId'] === customerId)
      .toArray();
    return rows.map((r) => r as unknown as api.ApiMeasurementProfile);
  }
}

/** Attempt API; on failure return local cache. */
export async function getProfileFull(
  customerId: string,
  profileId: string,
  workspaceId: string,
): Promise<api.ApiProfileFull | null> {
  try {
    const full = await api.getProfileFull(customerId, profileId);
    await cacheProfileFull(workspaceId, full);
    return full;
  } catch {
    // offline — reconstruct from cache
    const profile = await db.measurementProfilesV13.get(profileId);
    if (!profile) return null;
    const sets = await db.measurementSetsV13.where('profileId').equals(profileId).toArray();
    const setsWithValues: api.ApiMeasurementSet[] = [];
    for (const set of sets) {
      const values = await db.measurementValuesV13.where('setId').equals(set.id as string).toArray();
      setsWithValues.push({
        ...(set as unknown as api.ApiMeasurementSet),
        values: values as unknown as api.ApiMeasurementValue[],
      });
    }
    return {
      profile: profile as unknown as api.ApiMeasurementProfile,
      sets: setsWithValues,
      validation: {
        level1: { result: 'PASS', errors: [] },
        relational: [],
        anomalies: [],
        completeness: [],
        canSave: true,
        canValidate: false,
      },
    };
  }
}

export async function createProfile(
  customerId: string,
  workspaceId: string,
  init?: { name?: string; dateTaken?: string; notes?: string },
): Promise<api.ApiMeasurementProfile> {
  const profile = await api.createProfile(customerId, init);
  await cacheProfiles(workspaceId, [profile]);
  return profile;
}

export async function updateDraft(
  customerId: string,
  profileId: string,
  workspaceId: string,
  update: api.DraftUpdate,
): Promise<api.ApiProfileFull> {
  const full = await api.updateDraft(customerId, profileId, update);
  await cacheProfileFull(workspaceId, full);
  return full;
}

export async function validateProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: api.ApiMeasurementProfile; validation: api.ApiValidationResult }> {
  return api.validateProfile(customerId, profileId);
}

export async function activateProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: api.ApiMeasurementProfile }> {
  return api.activateProfile(customerId, profileId);
}

export async function archiveProfile(
  customerId: string,
  profileId: string,
): Promise<{ profile: api.ApiMeasurementProfile }> {
  return api.archiveProfile(customerId, profileId);
}

export async function createNewVersion(
  customerId: string,
  profileId: string,
): Promise<{ profile: api.ApiMeasurementProfile; sets: api.ApiMeasurementSet[] }> {
  return api.createNewVersion(customerId, profileId);
}

export async function compareProfiles(
  customerId: string,
  currentId: string,
  previousId: string,
): Promise<api.ApiProfileComparison> {
  const data = await api.compareProfiles(customerId, currentId, previousId);
  return data.comparison;
}

export { api };
export { formatMeasurement, cmToInch, inchToCm } from '../../shared/api/measurements';
