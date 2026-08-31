/**
 * T10.1 default inventory. Values are recorded, not applied, not reconciled.
 */

export type DefaultClassification =
  | 'ENGINE_INVARIANT'
  | 'DOMAIN_CONFIGURATION'
  | 'UI_DEFAULT'
  | 'LEGACY_DUPLICATE'
  | 'UNKNOWN';

export type DefaultInventoryEntry = {
  field: string;
  location: string;
  value: string | number;
  classification: DefaultClassification;
};

export const DEFAULT_AUTHORITY_INVENTORY: DefaultInventoryEntry[] = [
  { field: 'hip', location: 'patternEngine.MEASUREMENT_RANGES', value: 98, classification: 'ENGINE_INVARIANT' },
  { field: 'hip', location: 'jobSheetExport.getPatternMeasurements', value: 100, classification: 'LEGACY_DUPLICATE' },
  { field: 'hip', location: 'DesignStudio.buildInitialMeasurements', value: 100, classification: 'UI_DEFAULT' },
  { field: 'hip', location: 'productionAssistant.estimateFabricRequirement', value: 102, classification: 'ENGINE_INVARIANT' },
  { field: 'bust', location: 'patternEngine.MEASUREMENT_RANGES', value: 90, classification: 'ENGINE_INVARIANT' },
  { field: 'chest', location: 'patternEngine.MEASUREMENT_RANGES', value: 96, classification: 'ENGINE_INVARIANT' },
  { field: 'bust', location: 'productionAssistant.estimateFabricRequirement', value: 96, classification: 'ENGINE_INVARIANT' },
  { field: 'seamAllowanceCm', location: 'patternEngine generic drafts', value: 1.5, classification: 'ENGINE_INVARIANT' },
  { field: 'fabricUnit', location: 'productionAssistant.DEFAULT_FABRIC_UNIT', value: 'yards', classification: 'ENGINE_INVARIANT' },
  { field: 'CM_PER_INCH', location: 'domain/measurement/units', value: 2.54, classification: 'DOMAIN_CONFIGURATION' },
];

export const HIP_DEFAULT_CONFLICT = {
  values: [98, 100, 102],
  reconciled: false,
  action: 'STOP — do not pick a winner in T10.1',
} as const;
