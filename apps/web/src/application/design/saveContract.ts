/**
 * T7 save-path contract.
 * FACT: two existing operations. They are not silently merged.
 */

export const STUDIO_SAVE_PATHS = {
  studioOrderCommit: 'studio-order-commit',
  contextSessionSave: 'context-studio-session',
} as const;

export type StudioSavePath = (typeof STUDIO_SAVE_PATHS)[keyof typeof STUDIO_SAVE_PATHS];

export type StudioSavePathRecord = {
  path: StudioSavePath;
  owner: 'DesignStudio.handleSaveToOrder' | 'AppContext.saveStudioOutputToOrder';
  writes: string[];
  distinctBecause: string;
};

export function describeStudioSavePaths(): StudioSavePathRecord[] {
  return [
    {
      path: STUDIO_SAVE_PATHS.studioOrderCommit,
      owner: 'DesignStudio.handleSaveToOrder',
      writes: [
        'order.garmentType',
        'order.garmentMeasurements',
        'order.measurementSnapshot (studio metadata/profileMetadata nests)',
        'order.productionPlan (from live studio measurements + selected fabric)',
        'order.designInspirationId',
        'order.selectedFabricId',
        'order.selectedPatternId',
        'order.selectedMeasurementProfile*',
      ],
      distinctBecause:
        'Uses the live Design Studio session, inventory fabric, and studio snapshot shape.',
    },
    {
      path: STUDIO_SAVE_PATHS.contextSessionSave,
      owner: 'AppContext.saveStudioOutputToOrder',
      writes: [
        'order.garmentType',
        'order.garmentMeasurements (designStudioGarmentMeasurements)',
        'order.measurementSnapshot (AppContext freeze shape)',
        'order.productionPlan (from AppContext studio session)',
        'order.designInspirationId',
      ],
      distinctBecause:
        'Uses AppContext session fields, not Design Studio local measurement/fabric state.',
    },
  ];
}

export function assertSavePathsRemainDistinct(): void {
  const paths = describeStudioSavePaths();
  if (paths[0].path === paths[1].path) {
    throw new Error('STOP: studio save paths collapsed into one without owner authorization');
  }
  if (paths[0].owner === paths[1].owner) {
    throw new Error('STOP: both save paths attributed to the same owner without mapping');
  }
}
