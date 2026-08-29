/**
 * Phase 14 — Design Studio Adapter.
 * External adapter — never modifies DesignStudio.tsx, patternEngine.ts, or productionAssistant.ts.
 * Maps DesignSpecification → AppContext setters that DesignStudio already reads.
 *
 * Integration path (forensically determined from DesignStudio.tsx lines 1544-1630):
 *   setDesignMeasurements(Partial<BodyMeasurements>)  — merges body measurements
 *   setGarmentMeasurements(Partial<GarmentMeasurements>) — merges garment measurements
 *   setFabricImage(dataUrl: string) — sets fabric preview
 *   setView('design-studio')        — navigates to DesignStudio view
 *
 * The adapter preserves provenance and fails safely — unsupported fields are
 * stored in the DesignSpecification and ignored here (not lost, not errored).
 */
import type { DesignSpecification } from '../../shared/api/design';
import type { BodyMeasurements, GarmentMeasurements } from '../../shared/types/index';
import { getLocalAssetObjectUrl } from '../../modules/services/localAssetStore';

/**
 * Map canonical body measurement codes (Phase 13) → BodyMeasurements keys (DesignStudio).
 * Only maps codes that DesignStudio actually reads. Others are preserved in DesignSpec.
 */
type NumericMeasurementKey = {
  [K in keyof GarmentMeasurements]: GarmentMeasurements[K] extends number | undefined ? K : never;
}[keyof GarmentMeasurements];

const BODY_CODE_MAP: Record<string, NumericMeasurementKey> = {
  bust_circumference: 'bust',
  waist_circumference: 'waist',
  hip_circumference: 'hip',
  neck_circumference: 'neck',
  shoulder_width: 'shoulder',
  sleeve_length: 'sleeve',
  inseam_length: 'inseam',
  outseam_length: 'trouserLength',
  front_length: 'shoulderToWaist',
  back_length: 'backLength',
  thigh_circumference: 'thigh',
  knee_circumference: 'knee',
  ankle_circumference: 'ankle',
  bicep_circumference: 'bicep',
};

/**
 * Map Phase 14 garment category → DesignStudio supported garment types.
 * DesignStudio supports: bodice|shirt|trouser|skirt|kaftan|dress|gown|blouse|senator|agbada|custom
 */
const GARMENT_CATEGORY_MAP: Record<string, string> = {
  shirt: 'shirt',
  blouse: 'blouse',
  trousers: 'trouser',
  skirt: 'skirt',
  dress: 'dress',
  jacket: 'custom',
  suit: 'senator',
  kaftan: 'kaftan',
  agbada: 'agbada',
  traditional: 'agbada',
  gown: 'gown',
  custom: 'custom',
};

export interface AdapterResult {
  ok: boolean;
  warnings: string[];
  mappedGarmentType: string | null;
}

/**
 * Load a DesignSpecification into the Design Studio via AppContext setters.
 * NEVER touches DesignStudio.tsx, patternEngine.ts, or productionAssistant.ts.
 */
export async function loadSpecIntoDesignStudio(
  spec: DesignSpecification,
  appContextSetters: {
    setDesignMeasurements: (updates: Partial<BodyMeasurements>) => void;
    setGarmentMeasurements: (updates: Partial<GarmentMeasurements>) => void;
    setFabricImage: (url: string) => void;
    setView: (view: string) => void;
  },
): Promise<AdapterResult> {
  const warnings: string[] = [];

  // 1. Map measurements from Design Measurement Context
  if (spec.measurementContext) {
    const ctx = spec.measurementContext;
    const bodyUpdates: Partial<GarmentMeasurements> = {};

    for (const [code, valueCm] of Object.entries(ctx.body)) {
      const key = BODY_CODE_MAP[code];
      if (key) {
        bodyUpdates[key] = valueCm;
      }
      // Unmapped codes are preserved in DesignSpec — not lost, not errored.
    }

    if (ctx.validation.status === 'DRAFT') {
      warnings.push('Measurement profile is in DRAFT status — consider validating first.');
    }

    if (Object.keys(bodyUpdates).length > 0) {
      appContextSetters.setDesignMeasurements(bodyUpdates as Partial<BodyMeasurements>);
    }

    // Map garment measurements if available
    if (ctx.garment && Object.keys(ctx.garment).length > 0) {
      const garmentUpdates: Partial<GarmentMeasurements> = {};
      for (const [code, valueCm] of Object.entries(ctx.garment)) {
        const key = BODY_CODE_MAP[code];
        if (key) garmentUpdates[key] = valueCm;
      }
      if (Object.keys(garmentUpdates).length > 0) {
        appContextSetters.setGarmentMeasurements(garmentUpdates);
      }
    }
  } else if (spec.measurementProfileId) {
    warnings.push(
      'Measurement context snapshot not available — measurements were not loaded into Design Studio. ' +
      'Refresh the specification to rebuild the context.',
    );
  }

  // 2. Load fabric image (from local Dexie asset store)
  let fabricLoaded = false;
  for (const fabId of spec.fabricProfileIds) {
    // The adapter only loads the first fabric's image into Design Studio (existing interface supports one)
    // Future: when Design Studio supports multiple fabrics, extend here.
    const assetKey = `fab-asset-${fabId}`;
    // We don't have localAssetId here — the fabric profile's localAssetId is needed.
    // This is a limitation: the adapter receives IDs, not full profiles.
    // Callers should pass fabricProfiles alongside spec for full asset loading.
    void assetKey; // reserved for future extension
    fabricLoaded = false;
    break;
  }
  if (spec.fabricProfileIds.length > 0 && !fabricLoaded) {
    warnings.push('Fabric image loading requires fabric profiles to be pre-fetched. Pass fabricProfiles to the adapter for full asset loading.');
  }

  // 3. Map garment category
  const mappedGarmentType = GARMENT_CATEGORY_MAP[spec.garment.category] ?? 'custom';
  if (!GARMENT_CATEGORY_MAP[spec.garment.category]) {
    warnings.push(`Garment category '${spec.garment.category}' mapped to 'custom' in Design Studio.`);
  }

  // 4. Navigate to Design Studio
  appContextSetters.setView('design-studio');

  return { ok: true, warnings, mappedGarmentType };
}

/**
 * Extended adapter with full fabric profile data (including localAssetId).
 */
export async function loadSpecWithFabricIntoDesignStudio(
  spec: DesignSpecification,
  fabricProfiles: import('../../shared/api/design').FabricProfile[],
  appContextSetters: {
    setDesignMeasurements: (updates: Partial<BodyMeasurements>) => void;
    setGarmentMeasurements: (updates: Partial<GarmentMeasurements>) => void;
    setFabricImage: (url: string) => void;
    setView: (view: string) => void;
  },
): Promise<AdapterResult> {
  const base = await loadSpecIntoDesignStudio(spec, appContextSetters);

  // Load first fabric image from Dexie
  for (const fabId of spec.fabricProfileIds) {
    const fabProfile = fabricProfiles.find((f) => f.id === fabId);
    if (fabProfile?.localAssetId) {
      const objectUrl = await getLocalAssetObjectUrl(fabProfile.localAssetId);
      if (objectUrl) {
        appContextSetters.setFabricImage(objectUrl);
        // Note: object URLs should be revoked after use; Design Studio manages this.
        break;
      }
    }
  }

  return base;
}
