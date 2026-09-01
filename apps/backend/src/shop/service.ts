import { randomUUID } from 'crypto';
import { PlatformError } from '../platform/errors';
import type { TrustedPlatformContext } from '../platform/types';
import type { ProductionStageCode, StageAction } from '../services/productionStageService';
import { applyStageAction, deriveOrderStatusFromStages, seedDraftStages } from './stageMachine';
import type { ShopCustomer, ShopOrder, ShopStore, ShopTrustedArtifact } from './types';

export function createShopStore(): ShopStore {
  return {
    customers: new Map(),
    orders: new Map(),
    artifacts: new Map(),
  };
}

export function createShopService(store: ShopStore = createShopStore()) {
  function assertScope(record: { tenantId: string; workspaceId: string }, ctx: TrustedPlatformContext, workspaceId: string) {
    if (record.tenantId !== ctx.tenant.id || record.workspaceId !== workspaceId) {
      throw new PlatformError(403, 'SHOP_SCOPE', 'Record is outside the authorized shop scope');
    }
  }

  function createCustomer(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: { fullName?: string; phone?: string; email?: string; address?: string; notes?: string; tenantId?: string; workspaceId?: string; id?: string }
  ): ShopCustomer {
    void input.tenantId;
    void input.workspaceId;
    void input.id;
    const fullName = String(input.fullName || '').trim();
    if (!fullName) {
      throw new PlatformError(400, 'INVALID_CUSTOMER', 'fullName is required');
    }
    const now = new Date().toISOString();
    const row: ShopCustomer = {
      id: randomUUID(),
      tenantId: ctx.tenant.id,
      workspaceId,
      fullName,
      phone: String(input.phone || ''),
      email: String(input.email || ''),
      address: String(input.address || ''),
      notes: String(input.notes || ''),
      createdAt: now,
      updatedAt: now,
    };
    store.customers.set(row.id, row);
    return row;
  }

  function listCustomers(ctx: TrustedPlatformContext, workspaceId: string) {
    return [...store.customers.values()].filter(
      (row) => row.tenantId === ctx.tenant.id && row.workspaceId === workspaceId
    );
  }

  function getCustomer(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const row = store.customers.get(id);
    if (!row) throw new PlatformError(404, 'CUSTOMER_MISSING', 'Customer not found');
    assertScope(row, ctx, workspaceId);
    return row;
  }

  function createOrder(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: {
      customerId?: string;
      notes?: string;
      garmentType?: string;
      tenantId?: string;
      workspaceId?: string;
      id?: string;
    }
  ): ShopOrder {
    void input.tenantId;
    void input.workspaceId;
    void input.id;
    const customer = getCustomer(ctx, workspaceId, String(input.customerId || ''));
    const now = new Date().toISOString();
    const stages = seedDraftStages();
    const row: ShopOrder = {
      id: randomUUID(),
      tenantId: ctx.tenant.id,
      workspaceId,
      customerId: customer.id,
      orderNumber: `SF-${now.slice(0, 10)}-${randomUUID().slice(0, 4)}`,
      status: deriveOrderStatusFromStages(stages),
      garmentType: input.garmentType ? String(input.garmentType) : null,
      notes: String(input.notes || ''),
      measurementSnapshot: null,
      productionStages: stages,
      createdAt: now,
      updatedAt: now,
    };
    store.orders.set(row.id, row);
    return row;
  }

  function listOrders(ctx: TrustedPlatformContext, workspaceId: string) {
    return [...store.orders.values()].filter(
      (row) => row.tenantId === ctx.tenant.id && row.workspaceId === workspaceId
    );
  }

  function getOrder(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const row = store.orders.get(id);
    if (!row) throw new PlatformError(404, 'ORDER_MISSING', 'Order not found');
    assertScope(row, ctx, workspaceId);
    return row;
  }

  function putMeasurementSnapshot(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    snapshot: Record<string, unknown>
  ) {
    const order = getOrder(ctx, workspaceId, orderId);
    order.measurementSnapshot = snapshot && typeof snapshot === 'object' ? { ...snapshot } : null;
    order.updatedAt = new Date().toISOString();
    store.orders.set(order.id, order);
    return order;
  }

  function transitionStage(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    stageCode: ProductionStageCode,
    action: StageAction
  ) {
    const order = getOrder(ctx, workspaceId, orderId);
    try {
      order.productionStages = applyStageAction(order.productionStages, stageCode, action);
    } catch (err) {
      throw new PlatformError(409, 'STAGE_GUARD', err instanceof Error ? err.message : 'Stage transition refused');
    }
    order.status = deriveOrderStatusFromStages(order.productionStages);
    order.updatedAt = new Date().toISOString();
    store.orders.set(order.id, order);
    return order;
  }

  function appendTrustedArtifact(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: { orderId?: string | null; fingerprint?: string; payload?: Record<string, unknown> }
  ): ShopTrustedArtifact {
    const fingerprint = String(input.fingerprint || '').trim();
    if (!fingerprint) {
      throw new PlatformError(400, 'INVALID_ARTIFACT', 'fingerprint is required');
    }
    if (input.orderId) getOrder(ctx, workspaceId, input.orderId);
    const row: ShopTrustedArtifact = {
      id: randomUUID(),
      tenantId: ctx.tenant.id,
      workspaceId,
      orderId: input.orderId || null,
      frozen: true,
      fingerprint,
      payload: input.payload && typeof input.payload === 'object' ? { ...input.payload } : {},
      createdAt: new Date().toISOString(),
    };
    store.artifacts.set(row.id, row);
    return row;
  }

  function getTrustedArtifact(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const row = store.artifacts.get(id);
    if (!row) throw new PlatformError(404, 'ARTIFACT_MISSING', 'Trusted artifact not found');
    assertScope(row, ctx, workspaceId);
    return row;
  }

  return {
    store,
    createCustomer,
    listCustomers,
    getCustomer,
    createOrder,
    listOrders,
    getOrder,
    putMeasurementSnapshot,
    transitionStage,
    appendTrustedArtifact,
    getTrustedArtifact,
  };
}

export type ShopService = ReturnType<typeof createShopService>;
