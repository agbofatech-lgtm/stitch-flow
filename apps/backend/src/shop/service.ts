import { randomUUID } from 'crypto';
import { PlatformError } from '../platform/errors';
import type { TrustedPlatformContext } from '../platform/types';
import type { ProductionStageCode, StageAction } from '../services/productionStageService';
import { applyStageAction, deriveOrderStatusFromStages, seedDraftStages } from './stageMachine';
import type { ShopCustomer, ShopOrder, ShopTrustedArtifact } from './types';
import type { ShopRepository, ShopScope } from './repository';
import { createMemoryShopRepository } from './memoryRepository';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShopSyncEnvelope = {
  operationId?: string;
  entityType?: string;
  entityId?: string;
  operationType?: string;
  expectedVersion?: number;
  clientTimestamp?: string;
  payload?: Record<string, unknown>;
  schemaVersion?: number;
  tenantId?: string;
  workspaceId?: string;
};

export type ShopSyncAck = {
  operationId: string;
  status: 'acknowledged' | 'conflict' | 'rejected';
  entityId: string;
  serverVersion: number;
  serverTimestamp: string;
  result?: unknown;
};

function scopeOf(ctx: TrustedPlatformContext, workspaceId: string): ShopScope {
  return { tenantId: ctx.tenant.id, workspaceId };
}

function requireUuid(id: string, label: string) {
  if (!UUID_RE.test(id)) {
    throw new PlatformError(400, 'INVALID_ID', `${label} must be a UUID`);
  }
  return id;
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
    input: {
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
      tenantId?: string;
      workspaceId?: string;
      id?: string;
    },
    persistId?: string
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
      id: persistId || randomUUID(),
      tenantId: ctx.tenant.id,
      workspaceId,
      fullName,
      phone: String(input.phone || ''),
      email: String(input.email || ''),
      address: String(input.address || ''),
      notes: String(input.notes || ''),
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
    };
    try {
      await repo.insertCustomer(row);
      return row;
    } catch (err) {
      const existing = await repo.getCustomer(scopeOf(ctx, workspaceId), row.id);
      if (existing) return existing;
      throw err;
    }
  }

  async function listCustomers(ctx: TrustedPlatformContext, workspaceId: string) {
    return repo.listCustomers(scopeOf(ctx, workspaceId));
  }

  async function getCustomer(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    const row = await requireScoped(await repo.getCustomer(scope, id), () => repo.existsCustomer(id), {
      status: 404,
      code: 'CUSTOMER_MISSING',
      message: 'Customer not found',
    });
    if (row.deletedAt) throw new PlatformError(404, 'CUSTOMER_MISSING', 'Customer not found');
    return row;
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
    },
    persistId?: string
  ): Promise<ShopOrder> {
    void input.tenantId;
    void input.workspaceId;
    void input.id;
    const customer = await getCustomer(ctx, workspaceId, String(input.customerId || ''));
    const now = new Date().toISOString();
    const stages = seedDraftStages();
    const row: ShopOrder = {
      id: persistId || randomUUID(),
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
      version: 1,
      deletedAt: null,
    };
    try {
      await repo.insertOrder(row);
      return row;
    } catch (err) {
      const existing = await repo.getOrder(scopeOf(ctx, workspaceId), row.id);
      if (existing) return existing;
      throw err;
    }
  }

  async function listOrders(ctx: TrustedPlatformContext, workspaceId: string) {
    return repo.listOrders(scopeOf(ctx, workspaceId));
  }

  async function getOrder(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    const row = await requireScoped(await repo.getOrder(scope, id), () => repo.existsOrder(id), {
      status: 404,
      code: 'ORDER_MISSING',
      message: 'Order not found',
    });
    if (row.deletedAt) throw new PlatformError(404, 'ORDER_MISSING', 'Order not found');
    return row;
  }

  async function putMeasurementSnapshot(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    snapshot: Record<string, unknown>,
    expectedVersion?: number
  ) {
    const order = await getOrder(ctx, workspaceId, orderId);
    const currentVersion = order.version;
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new PlatformError(409, 'CONFLICT', 'Order version mismatch');
    }
    const next: ShopOrder = {
      ...order,
      productionStages: order.productionStages.map((stage) => ({ ...stage })),
      measurementSnapshot: snapshot && typeof snapshot === 'object' ? { ...snapshot } : null,
      updatedAt: new Date().toISOString(),
      version: currentVersion + 1,
    };
    const saved = await repo.updateOrder(scopeOf(ctx, workspaceId), next, expectedVersion);
    if (!saved) throw new PlatformError(409, 'CONFLICT', 'Order version mismatch');
    return saved;
  }

  async function transitionStage(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    orderId: string,
    stageCode: ProductionStageCode,
    action: StageAction,
    expectedVersion?: number
  ) {
    const order = await getOrder(ctx, workspaceId, orderId);
    const currentVersion = order.version;
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      throw new PlatformError(409, 'CONFLICT', 'Order version mismatch');
    }
    let stages;
    try {
      stages = applyStageAction(order.productionStages, stageCode, action);
    } catch (err) {
      throw new PlatformError(409, 'STAGE_GUARD', err instanceof Error ? err.message : 'Stage transition refused');
    }
    const next: ShopOrder = {
      ...order,
      productionStages: stages,
      status: deriveOrderStatusFromStages(stages),
      updatedAt: new Date().toISOString(),
      version: currentVersion + 1,
    };
    const saved = await repo.updateOrder(scopeOf(ctx, workspaceId), next, expectedVersion);
    if (!saved) throw new PlatformError(409, 'CONFLICT', 'Order version mismatch');
    return saved;
  }

  async function appendTrustedArtifact(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    input: { orderId?: string | null; fingerprint?: string; payload?: Record<string, unknown>; id?: string },
    persistId?: string
  ): Promise<ShopTrustedArtifact> {
    void input.id;
    const fingerprint = String(input.fingerprint || '').trim();
    if (!fingerprint) {
      throw new PlatformError(400, 'INVALID_ARTIFACT', 'fingerprint is required');
    }
    if (input.orderId) await getOrder(ctx, workspaceId, input.orderId);
    const row: ShopTrustedArtifact = {
      id: persistId || randomUUID(),
      tenantId: ctx.tenant.id,
      workspaceId,
      orderId: input.orderId || null,
      frozen: true,
      fingerprint,
      payload: input.payload && typeof input.payload === 'object' ? { ...input.payload } : {},
      createdAt: new Date().toISOString(),
    };
    try {
      await repo.insertArtifact(row);
      return row;
    } catch (err) {
      const existing = await repo.getArtifact(scopeOf(ctx, workspaceId), row.id);
      if (existing) return existing;
      throw err;
    }
  }

  async function getTrustedArtifact(ctx: TrustedPlatformContext, workspaceId: string, id: string) {
    const scope = scopeOf(ctx, workspaceId);
    return requireScoped(await repo.getArtifact(scope, id), () => repo.existsArtifact(id), {
      status: 404,
      code: 'ARTIFACT_MISSING',
      message: 'Trusted artifact not found',
    });
  }

  async function recordChange(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    entityType: string,
    entityId: string,
    operationType: string,
    version: number,
    payload: Record<string, unknown>
  ) {
    await repo.insertChange({
      tenantId: ctx.tenant.id,
      workspaceId,
      entityType,
      entityId,
      operationType,
      version,
      payload,
    });
  }

  async function applySyncOperation(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    envelope: ShopSyncEnvelope
  ): Promise<ShopSyncAck> {
    void envelope.tenantId;
    void envelope.workspaceId;
    const operationId = String(envelope.operationId || '').trim();
    const entityType = String(envelope.entityType || '').trim();
    const entityId = String(envelope.entityId || '').trim();
    const operationType = String(envelope.operationType || '').trim();
    if (!operationId || !entityType || !entityId || !operationType) {
      throw new PlatformError(400, 'INVALID_SYNC', 'operationId, entityType, entityId, and operationType are required');
    }
    requireUuid(operationId, 'operationId');
    requireUuid(entityId, 'entityId');

    const scope = scopeOf(ctx, workspaceId);
    const existing = await repo.getSyncOperation(scope, operationId);
    if (existing) {
      return existing.result as unknown as ShopSyncAck;
    }

    const payload = envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : {};
    const now = new Date().toISOString();
    let ack: ShopSyncAck;

    try {
      if (entityType === 'customer' && operationType === 'create') {
        const row = await createCustomer(ctx, workspaceId, payload, entityId);
        await recordChange(ctx, workspaceId, 'customer', row.id, 'create', row.version, { customer: row });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: row.id,
          serverVersion: row.version,
          serverTimestamp: now,
          result: { customer: row },
        };
      } else if (entityType === 'customer' && operationType === 'update') {
        const current = await getCustomer(ctx, workspaceId, entityId);
        const expected = Number(envelope.expectedVersion);
        if (!Number.isFinite(expected) || current.version !== expected) {
          throw new PlatformError(409, 'CONFLICT', 'Customer version mismatch');
        }
        const next: ShopCustomer = {
          ...current,
          fullName: String(payload.fullName || current.fullName).trim() || current.fullName,
          phone: payload.phone !== undefined ? String(payload.phone) : current.phone,
          email: payload.email !== undefined ? String(payload.email) : current.email,
          address: payload.address !== undefined ? String(payload.address) : current.address,
          notes: payload.notes !== undefined ? String(payload.notes) : current.notes,
          updatedAt: now,
          version: current.version + 1,
        };
        const saved = await repo.updateCustomer(scope, next, expected);
        if (!saved) throw new PlatformError(409, 'CONFLICT', 'Customer version mismatch');
        await recordChange(ctx, workspaceId, 'customer', saved.id, 'update', saved.version, { customer: saved });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: saved.id,
          serverVersion: saved.version,
          serverTimestamp: now,
          result: { customer: saved },
        };
      } else if (entityType === 'customer' && operationType === 'delete') {
        const current = await getCustomer(ctx, workspaceId, entityId);
        const expected = Number(envelope.expectedVersion);
        if (!Number.isFinite(expected) || current.version !== expected) {
          throw new PlatformError(409, 'CONFLICT', 'Customer version mismatch');
        }
        const next: ShopCustomer = {
          ...current,
          deletedAt: now,
          updatedAt: now,
          version: current.version + 1,
        };
        const saved = await repo.updateCustomer(scope, next, expected);
        if (!saved) throw new PlatformError(409, 'CONFLICT', 'Customer version mismatch');
        await recordChange(ctx, workspaceId, 'customer', saved.id, 'delete', saved.version, { tombstone: true });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: saved.id,
          serverVersion: saved.version,
          serverTimestamp: now,
          result: { tombstone: true },
        };
      } else if (entityType === 'order' && operationType === 'create') {
        const row = await createOrder(ctx, workspaceId, payload, entityId);
        await recordChange(ctx, workspaceId, 'order', row.id, 'create', row.version, { order: row });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: row.id,
          serverVersion: row.version,
          serverTimestamp: now,
          result: { order: row },
        };
      } else if (entityType === 'measurement_snapshot' && (operationType === 'update' || operationType === 'snapshot')) {
        const snapshot =
          payload.snapshot && typeof payload.snapshot === 'object'
            ? (payload.snapshot as Record<string, unknown>)
            : payload;
        const expected = Number(envelope.expectedVersion);
        const row = await putMeasurementSnapshot(
          ctx,
          workspaceId,
          entityId,
          snapshot,
          Number.isFinite(expected) ? expected : undefined
        );
        await recordChange(ctx, workspaceId, 'order', row.id, 'snapshot', row.version, {
          measurementSnapshot: row.measurementSnapshot,
        });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: row.id,
          serverVersion: row.version,
          serverTimestamp: now,
          result: { order: row },
        };
      } else if (entityType === 'production_transition' && (operationType === 'update' || operationType === 'transition')) {
        const expected = Number(envelope.expectedVersion);
        const row = await transitionStage(
          ctx,
          workspaceId,
          entityId,
          String(payload.stageCode || '') as ProductionStageCode,
          String(payload.action || '') as StageAction,
          Number.isFinite(expected) ? expected : undefined
        );
        await recordChange(ctx, workspaceId, 'order', row.id, 'transition', row.version, {
          productionStages: row.productionStages,
          status: row.status,
        });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: row.id,
          serverVersion: row.version,
          serverTimestamp: now,
          result: { order: row },
        };
      } else if (entityType === 'trusted_artifact' && operationType === 'create') {
        const row = await appendTrustedArtifact(
          ctx,
          workspaceId,
          {
            orderId: payload.orderId ? String(payload.orderId) : null,
            fingerprint: payload.fingerprint ? String(payload.fingerprint) : undefined,
            payload: (payload.payload as Record<string, unknown>) || payload,
          },
          entityId
        );
        await recordChange(ctx, workspaceId, 'trusted_artifact', row.id, 'create', 1, { artifact: row });
        ack = {
          operationId,
          status: 'acknowledged',
          entityId: row.id,
          serverVersion: 1,
          serverTimestamp: now,
          result: { artifact: row },
        };
      } else if (entityType === 'trusted_artifact' && (operationType === 'update' || operationType === 'delete')) {
        throw new PlatformError(405, 'ARTIFACT_IMMUTABLE', 'Trusted artifacts are append-only');
      } else {
        throw new PlatformError(400, 'INVALID_SYNC', `Unsupported sync operation ${entityType}:${operationType}`);
      }
    } catch (err) {
      if (err instanceof PlatformError && err.code === 'CONFLICT') {
        ack = {
          operationId,
          status: 'conflict',
          entityId,
          serverVersion: Number(envelope.expectedVersion || 0),
          serverTimestamp: now,
        };
        await repo.putSyncOperation({
          tenantId: ctx.tenant.id,
          workspaceId,
          operationId,
          entityType,
          entityId,
          operationType,
          status: 'conflict',
          result: ack as unknown as Record<string, unknown>,
          processedAt: now,
        });
        throw err;
      }
      throw err;
    }

    await repo.putSyncOperation({
      tenantId: ctx.tenant.id,
      workspaceId,
      operationId,
      entityType,
      entityId,
      operationType,
      status: ack.status,
      result: ack as unknown as Record<string, unknown>,
      processedAt: now,
    });
    return ack;
  }

  async function listSyncChanges(
    ctx: TrustedPlatformContext,
    workspaceId: string,
    cursor: string | undefined,
    limit = 100
  ) {
    const afterSeq = Number(cursor || 0);
    const safe = Number.isFinite(afterSeq) && afterSeq >= 0 ? afterSeq : 0;
    const changes = await repo.listChanges(scopeOf(ctx, workspaceId), safe, Math.min(limit, 200));
    const nextCursor = changes.length ? String(changes[changes.length - 1].seq) : String(safe);
    return { changes, nextCursor };
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
    applySyncOperation,
    listSyncChanges,
  };
}

export type ShopService = ReturnType<typeof createShopService>;
export { createShopStore } from './store';
