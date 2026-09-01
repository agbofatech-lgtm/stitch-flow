import type {
  ProductionStageCode,
  ProductionStageStatus,
  StageAction,
} from '../services/productionStageService';

export type ShopCustomer = {
  id: string;
  tenantId: string;
  workspaceId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
};

export type ShopStage = {
  id: string;
  code: ProductionStageCode;
  label: string;
  sequence: number;
  status: ProductionStageStatus;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  reopenedAt: string | null;
  notes: string;
};

export type ShopOrder = {
  id: string;
  tenantId: string;
  workspaceId: string;
  customerId: string;
  orderNumber: string;
  status: 'draft' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  garmentType: string | null;
  notes: string;
  measurementSnapshot: Record<string, unknown> | null;
  productionStages: ShopStage[];
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
};

export type ShopTrustedArtifact = {
  id: string;
  tenantId: string;
  workspaceId: string;
  orderId: string | null;
  frozen: true;
  fingerprint: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ShopStore = {
  customers: Map<string, ShopCustomer>;
  orders: Map<string, ShopOrder>;
  artifacts: Map<string, ShopTrustedArtifact>;
};

export type { ProductionStageCode, StageAction };
