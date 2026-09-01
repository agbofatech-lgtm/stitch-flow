/**
 * SAC-5 selected-domain local-first facade.
 * Does not replace AppContext screens. Writes T2 then outbox, then optional sync.
 */

import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import type { StoredRecord } from '../../shared/persistence/types';

const AUTH_CUSTOMER = 'AuthenticatedShopCustomer';
const AUTH_ORDER = 'AuthenticatedShopOrder';
const AUTH_ARTIFACT = 'AuthenticatedShopArtifact';

function repos() {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) throw new Error('T2 runtime is not started');
  return runtime.repositories;
}

export async function createShopCustomerLocal(
  input: { fullName: string; phone?: string; email?: string; address?: string; notes?: string },
  operationId?: string
): Promise<StoredRecord> {
  const record = await repos().customer.create(
    { kind: AUTH_CUSTOMER, ...input },
    operationId
  );
  if (!record) throw new Error('customer create failed');
  return record;
}

export async function createShopOrderLocal(
  input: { customerId: string; notes?: string; garmentType?: string },
  operationId?: string
): Promise<StoredRecord> {
  const record = await repos().order.create({ kind: AUTH_ORDER, ...input }, operationId);
  if (!record) throw new Error('order create failed');
  return record;
}

export async function putMeasurementSnapshotLocal(
  orderLocalId: string,
  snapshot: Record<string, unknown>,
  operationId?: string
): Promise<StoredRecord> {
  const current = await repos().order.get(orderLocalId);
  if (!current) throw new Error('order not found');
  return (await repos().order.update(
    orderLocalId,
    {
      ...(current.payload as Record<string, unknown>),
      kind: 'measurement_snapshot',
      snapshot,
    },
    operationId
  )) as StoredRecord;
}

export async function transitionProductionLocal(
  orderLocalId: string,
  stageCode: string,
  action: string,
  operationId?: string
): Promise<StoredRecord> {
  const current = await repos().order.get(orderLocalId);
  if (!current) throw new Error('order not found');
  return (await repos().order.update(
    orderLocalId,
    {
      ...(current.payload as Record<string, unknown>),
      kind: 'production_transition',
      stageCode,
      action,
    },
    operationId
  )) as StoredRecord;
}

export async function appendTrustedArtifactLocal(
  input: { fingerprint: string; payload?: Record<string, unknown>; orderId?: string | null },
  operationId?: string
): Promise<StoredRecord> {
  const record = await repos().trustedArtifact.create(
    { kind: AUTH_ARTIFACT, frozen: true, ...input },
    operationId
  );
  if (!record) throw new Error('artifact create failed');
  return record;
}
