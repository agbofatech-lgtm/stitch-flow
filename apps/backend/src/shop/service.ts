import { randomUUID } from 'crypto';
import { PlatformError } from '../platform/errors';
import type { TrustedPlatformContext } from '../platform/types';
import type { ProductionStageCode, StageAction } from '../services/productionStageService';
import { applyStageAction, deriveOrderStatusFromStages, seedDraftStages } from './stageMachine';
import type { ShopCustomer, ShopOrder, ShopTrustedArtifact } from './types';
import type { ShopRepository, ShopScope } from './repository';
import { createMemoryShopRepository } from './memoryRepository';

function scopeOf(ctx: TrustedPlatformContext, workspaceId: string): ShopScope {
  return { tenantId: ctx.tenant.id, workspaceId };
}

async function requireScoped<T>(
  row: T | null,
  exists: () => Promise<boolean>,
  missing: { status: number; code: string; message: string }
): Promise<T> {
  if (row) return row;
  if (await exists()) {
    throw new PlatformError(403, 'SHOP_SCOPE', 'Record is outside the authorized shop scope');
  }
  throw new PlatformError(missing.status, missing.code, missing.message);
}

export function createShopService(repo: ShopRepository = createMemoryShopRepository()) {
  async function createCustomer(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: { fullName?: string; phone?: string; email?: string; address?: string; notes?: string; tenantId?: string; workspaceId?: string; id?: string }
  ): Promise<ShopCustomer> {
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
    await repo.insertCustomer(row);
    return row;
  }

  async function listCustomers(ctx: TrustedPlatformContext, workspaceId: string) {
    return repo.listCustomers(scopeOf(ctx, workspaceId));
  }

  async function getCustomer(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    return requireScoped(await repo.getCustomer(scope, id), () => repo.existsCustomer(id), {
      status: 404,
      code: 'CUSTOMER_MISSING',
      message: 'Customer not found',
    });
  }

  async function createOrder(
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
  ): Promise<ShopOrder> {
    void input.tenantId;
    void input.workspaceId;
    void input.id;
    const customer = await getCustomer(ctx, workspaceId, String(input.customerId || ''));
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
    await repo.insertOrder(row);
    return row;
  }

  async function listOrders(ctx: TrustedPlatformContext, workspaceId: string) {
    return repo.listOrders(scopeOf(ctx, workspaceId));
  }

  async function getOrder(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    return requireScoped(await repo.getOrder(scope, id), () => repo.existsOrder(id), {
      status: 404,
      code: 'ORDER_MISSING',
      message: 'Order not found',
    });
  }

  async function putMeasurementSnapshot(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    snapshot: Record<string, unknown>
  ) {
    const order = await getOrder(ctx, workspaceId, orderId);
    order.measurementSnapshot = snapshot && typeof snapshot === 'object' ? { ...snapshot } : null;
    order.updatedAt = new Date().toISOString();
    await repo.updateOrder(scopeOf(ctx, workspaceId), order);
    return order;
  }

  async function transitionStage(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    stageCode: ProductionStageCode,
    action: StageAction
  ) {
    const order = await getOrder(ctx, workspaceId, orderId);
    try {
      order.productionStages = applyStageAction(order.productionStages, stageCode, action);
    } catch (err) {
      throw new PlatformError(409, 'STAGE_GUARD', err instanceof Error ? err.message : 'Stage transition refused');
    }
    order.status = deriveOrderStatusFromStages(order.productionStages);
    order.updatedAt = new Date().toISOString();
    await repo.updateOrder(scopeOf(ctx, workspaceId), order);
    return order;
  }

  async function appendTrustedArtifact(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: { orderId?: string | null; fingerprint?: string; payload?: Record<string, unknown> }
  ): Promise<ShopTrustedArtifact> {
    const fingerprint = String(input.fingerprint || '').trim();
    if (!fingerprint) {
      throw new PlatformError(400, 'INVALID_ARTIFACT', 'fingerprint is required');
    }
    if (input.orderId) await getOrder(ctx, workspaceId, input.orderId);
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
    await repo.insertArtifact(row);
    return row;
  }

  async function getTrustedArtifact(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    return requireScoped(await repo.getArtifact(scope, id), () => repo.existsArtifact(id), {
      status: 404,
      code: 'ARTIFACT_MISSING',
      message: 'Trusted artifact not found',
    });
  }

  return {
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
export { createShopStore } from './store';
