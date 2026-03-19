import type {
  BodyMeasurements,
  Customer,
  CustomerMeasurementProfile,
  DesignInspiration,
  DueAlert,
  FabricRecord,
  GarmentMeasurements,
  GarmentType,
  InspirationAnalysis,
  Invoice,
  MaterialUnit,
  Order,
  OrderMaterialUsage,
  PatternLibraryItem,
  Payment,
  ProductionPlan,
  TierCode,
} from '../types';
import {
  customers,
  dueAlerts,
  invoices,
  orders,
  payments,
  workspaceMembers,
  workspaces,
} from '@data/mockData';
import { cloneWithDates } from './serializers';

export interface StudioSessionState {
  selectedGarmentType: GarmentType;
  selectedInspirationId: string | null;
  currentInspirationAnalysis: InspirationAnalysis | null;
  generatedProductionPlan: ProductionPlan | null;
  designStudioMeasurements: BodyMeasurements;
  designStudioGarmentMeasurements: GarmentMeasurements;
  fabricImage: string | null;
  selectedOrderId: string | null;
}

export interface PersistedAppData {
  currentWorkspaceId: string;
  currentMemberId: string;
  tierSimulation: TierCode;

  customers: Customer[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  dueAlerts: DueAlert[];

  designInspirations: DesignInspiration[];
  fabricRecords: FabricRecord[];
  materialUsages: OrderMaterialUsage[];
  patternLibrary: PatternLibraryItem[];
  measurementProfiles: CustomerMeasurementProfile[];

  studioSession: StudioSessionState;
}

export const DEFAULT_BODY_MEASUREMENTS: BodyMeasurements = {
  bust: 90,
  waist: 72,
  neck: 36,
  shoulder: 12,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
};

export const DEFAULT_GARMENT_MEASUREMENTS: GarmentMeasurements = {
  bust: 90,
  chest: 90,
  waist: 72,
  hip: 100,
  neck: 36,
  shoulder: 12,
  sleeve: 24,
  backLength: 40,
  bustSpan: 11,
  armholeDepth: 22,
  thigh: 58,
  knee: 42,
  ankle: 28,
  trouserLength: 108,
  skirtLength: 75,
  fullLength: 135,
};

export const DEFAULT_STUDIO_SESSION: StudioSessionState = {
  selectedGarmentType: 'dress',
  selectedInspirationId: null,
  currentInspirationAnalysis: null,
  generatedProductionPlan: null,
  designStudioMeasurements: DEFAULT_BODY_MEASUREMENTS,
  designStudioGarmentMeasurements: DEFAULT_GARMENT_MEASUREMENTS,
  fabricImage: null,
  selectedOrderId: null,
};

function createStarterFabricRecords(workspaceId: string): FabricRecord[] {
  const now = new Date();

  return [
    {
      id: crypto.randomUUID(),
      workspaceId,
      name: 'Premium Burgundy Cotton',
      fabricType: 'cotton',
      color: 'Burgundy',
      pattern: 'Solid',
      texture: 'Soft smooth finish',
      quantityInStock: 18,
      unit: 'yards' as MaterialUnit,
      costPerUnit: 25,
      supplier: 'Main Fabric Market',
      reorderLevel: 5,
      isActive: true,
      notes: 'Good for senator and fitted native wear',
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      workspaceId,
      name: 'Luxury Cream Linen',
      fabricType: 'linen',
      color: 'Cream',
      pattern: 'Plain',
      texture: 'Light breathable',
      quantityInStock: 12,
      unit: 'yards' as MaterialUnit,
      costPerUnit: 30,
      supplier: 'Premium Textile House',
      reorderLevel: 4,
      isActive: true,
      notes: 'Excellent for kaftan and agbada',
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createSeedData(): PersistedAppData {
  const currentWorkspace = workspaces[0];
  const currentMember =
    workspaceMembers.find(
      (member) =>
        member.workspaceId === currentWorkspace.id && member.role === 'owner'
    ) || workspaceMembers[0];

  return {
    currentWorkspaceId: currentWorkspace.id,
    currentMemberId: currentMember.id,
    tierSimulation: currentWorkspace.tier.code,

    customers: cloneWithDates(customers),
    orders: cloneWithDates(orders),
    invoices: cloneWithDates(invoices),
    payments: cloneWithDates(payments),
    dueAlerts: cloneWithDates(dueAlerts),

    designInspirations: [],
    fabricRecords: createStarterFabricRecords(currentWorkspace.id),
    materialUsages: [],
    patternLibrary: [],
    measurementProfiles: [],

    studioSession: cloneWithDates(DEFAULT_STUDIO_SESSION),
  };
}

