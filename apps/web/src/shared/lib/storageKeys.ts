export const STORAGE_NAMESPACE = 'stitchflow';
export const STORAGE_VERSION = '2026-03-15.1';

export const STORAGE_KEYS = {
  version: `${STORAGE_NAMESPACE}:meta:version`,

  currentWorkspaceId: `${STORAGE_NAMESPACE}:session:currentWorkspaceId`,
  currentMemberId: `${STORAGE_NAMESPACE}:session:currentMemberId`,
  tierSimulation: `${STORAGE_NAMESPACE}:session:tierSimulation`,

  customers: `${STORAGE_NAMESPACE}:data:customers`,
  orders: `${STORAGE_NAMESPACE}:data:orders`,
  invoices: `${STORAGE_NAMESPACE}:data:invoices`,
  payments: `${STORAGE_NAMESPACE}:data:payments`,
  dueAlerts: `${STORAGE_NAMESPACE}:data:dueAlerts`,

  designInspirations: `${STORAGE_NAMESPACE}:studio:designInspirations`,
  fabricRecords: `${STORAGE_NAMESPACE}:studio:fabricRecords`,
  materialUsages: `${STORAGE_NAMESPACE}:studio:materialUsages`,
  patternLibrary: `${STORAGE_NAMESPACE}:studio:patternLibrary`,
  measurementProfiles: `${STORAGE_NAMESPACE}:studio:measurementProfiles`,
  studioSession: `${STORAGE_NAMESPACE}:studio:session`,
} as const;
