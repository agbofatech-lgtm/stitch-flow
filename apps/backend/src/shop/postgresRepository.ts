import type { Pool } from 'pg';
import type { ShopCustomer, ShopOrder, ShopStage, ShopTrustedArtifact } from './types';
import type { ShopChange, ShopRepository, ShopScope, ShopSyncOpRow } from './repository';

async function existsById(pool: Pool, table: 'shop_customers' | 'shop_orders' | 'shop_trusted_artifacts', id: string) {
  try {
    const result = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

function mapCustomer(row: Record<string, unknown>): ShopCustomer {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workspaceId: String(row.workspace_id),
    fullName: String(row.full_name),
    phone: String(row.phone),
    email: String(row.email),
    address: String(row.address),
    notes: String(row.notes),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    version: Number(row.version || 1),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
  };
}

function mapOrder(row: Record<string, unknown>): ShopOrder {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workspaceId: String(row.workspace_id),
    customerId: String(row.customer_id),
    orderNumber: String(row.order_number),
    status: row.status as ShopOrder['status'],
    garmentType: row.garment_type ? String(row.garment_type) : null,
    notes: String(row.notes),
    measurementSnapshot: (row.measurement_snapshot as Record<string, unknown> | null) || null,
    productionStages: (row.production_stages as ShopStage[]) || [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    version: Number(row.version || 1),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
  };
}

function mapArtifact(row: Record<string, unknown>): ShopTrustedArtifact {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    workspaceId: String(row.workspace_id),
    orderId: row.order_id ? String(row.order_id) : null,
    frozen: true,
    fingerprint: String(row.fingerprint),
    payload: (row.payload as Record<string, unknown>) || {},
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapChange(row: Record<string, unknown>): ShopChange {
  return {
    seq: Number(row.seq),
    tenantId: String(row.tenant_id),
    workspaceId: String(row.workspace_id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    operationType: String(row.operation_type),
    version: Number(row.version || 1),
    payload: (row.payload as Record<string, unknown>) || {},
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
  };
}

export function createPostgresShopRepository(pool: Pool): ShopRepository {
  return {
    async insertCustomer(row) {
      await pool.query(
        `INSERT INTO shop_customers (id, tenant_id, workspace_id, full_name, phone, email, address, notes, created_at, updated_at, version, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.id,
          row.tenantId,
          row.workspaceId,
          row.fullName,
          row.phone,
          row.email,
          row.address,
          row.notes,
          row.createdAt,
          row.updatedAt,
          row.version,
          row.deletedAt,
        ]
      );
    },
    async listCustomers(scope) {
      const result = await pool.query(
        `SELECT * FROM shop_customers WHERE tenant_id = $1 AND workspace_id = $2 AND deleted_at IS NULL ORDER BY created_at`,
        [scope.tenantId, scope.workspaceId]
      );
      return result.rows.map(mapCustomer);
    },
    async getCustomer(scope, id) {
      const result = await pool.query(
        `SELECT * FROM shop_customers WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3`,
        [id, scope.tenantId, scope.workspaceId]
      );
      return result.rows[0] ? mapCustomer(result.rows[0]) : null;
    },
    async existsCustomer(id) {
      return existsById(pool, 'shop_customers', id);
    },
    async updateCustomer(scope, row, expectedVersion) {
      const result = await pool.query(
        `UPDATE shop_customers SET
           full_name = $4, phone = $5, email = $6, address = $7, notes = $8,
           updated_at = $9, version = $10, deleted_at = $11
         WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3 AND version = $12
         RETURNING *`,
        [
          row.id,
          scope.tenantId,
          scope.workspaceId,
          row.fullName,
          row.phone,
          row.email,
          row.address,
          row.notes,
          row.updatedAt,
          row.version,
          row.deletedAt,
          expectedVersion,
        ]
      );
      return result.rows[0] ? mapCustomer(result.rows[0]) : null;
    },
    async insertOrder(row) {
      await pool.query(
        `INSERT INTO shop_orders (id, tenant_id, workspace_id, customer_id, order_number, status, garment_type, notes, measurement_snapshot, production_stages, created_at, updated_at, version, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          row.id,
          row.tenantId,
          row.workspaceId,
          row.customerId,
          row.orderNumber,
          row.status,
          row.garmentType,
          row.notes,
          row.measurementSnapshot ? JSON.stringify(row.measurementSnapshot) : null,
          JSON.stringify(row.productionStages),
          row.createdAt,
          row.updatedAt,
          row.version,
          row.deletedAt,
        ]
      );
    },
    async listOrders(scope) {
      const result = await pool.query(
        `SELECT * FROM shop_orders WHERE tenant_id = $1 AND workspace_id = $2 AND deleted_at IS NULL ORDER BY created_at`,
        [scope.tenantId, scope.workspaceId]
      );
      return result.rows.map(mapOrder);
    },
    async getOrder(scope, id) {
      const result = await pool.query(
        `SELECT * FROM shop_orders WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3`,
        [id, scope.tenantId, scope.workspaceId]
      );
      return result.rows[0] ? mapOrder(result.rows[0]) : null;
    },
    async existsOrder(id) {
      return existsById(pool, 'shop_orders', id);
    },
    async updateOrder(scope, row, expectedVersion) {
      const params = [
        row.id,
        scope.tenantId,
        scope.workspaceId,
        row.status,
        row.garmentType,
        row.notes,
        row.measurementSnapshot ? JSON.stringify(row.measurementSnapshot) : null,
        JSON.stringify(row.productionStages),
        row.updatedAt,
        row.version,
        row.deletedAt,
      ];
      const versionClause = expectedVersion === undefined ? '' : ' AND version = $12';
      if (expectedVersion !== undefined) params.push(expectedVersion);
      const result = await pool.query(
        `UPDATE shop_orders SET
           status = $4, garment_type = $5, notes = $6, measurement_snapshot = $7,
           production_stages = $8, updated_at = $9, version = $10, deleted_at = $11
         WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3${versionClause}
         RETURNING *`,
        params
      );
      return result.rows[0] ? mapOrder(result.rows[0]) : null;
    },
    async insertArtifact(row) {
      await pool.query(
        `INSERT INTO shop_trusted_artifacts (id, tenant_id, workspace_id, order_id, frozen, fingerprint, payload, created_at)
         VALUES ($1,$2,$3,$4, TRUE, $5, $6, $7)`,
        [row.id, row.tenantId, row.workspaceId, row.orderId, row.fingerprint, JSON.stringify(row.payload), row.createdAt]
      );
    },
    async getArtifact(scope, id) {
      const result = await pool.query(
        `SELECT * FROM shop_trusted_artifacts WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3`,
        [id, scope.tenantId, scope.workspaceId]
      );
      return result.rows[0] ? mapArtifact(result.rows[0]) : null;
    },
    async existsArtifact(id) {
      return existsById(pool, 'shop_trusted_artifacts', id);
    },
    async getSyncOperation(scope, operationId) {
      const result = await pool.query(
        `SELECT * FROM shop_sync_operations WHERE tenant_id = $1 AND workspace_id = $2 AND operation_id = $3`,
        [scope.tenantId, scope.workspaceId, operationId]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        tenantId: String(row.tenant_id),
        workspaceId: String(row.workspace_id),
        operationId: String(row.operation_id),
        entityType: String(row.entity_type),
        entityId: String(row.entity_id),
        operationType: String(row.operation_type),
        status: String(row.status),
        result: (row.result as Record<string, unknown>) || {},
        processedAt: new Date(String(row.processed_at)).toISOString(),
      } satisfies ShopSyncOpRow;
    },
    async putSyncOperation(row) {
      await pool.query(
        `INSERT INTO shop_sync_operations
           (tenant_id, workspace_id, operation_id, entity_type, entity_id, operation_type, status, result, processed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (tenant_id, workspace_id, operation_id) DO NOTHING`,
        [
          row.tenantId,
          row.workspaceId,
          row.operationId,
          row.entityType,
          row.entityId,
          row.operationType,
          row.status,
          JSON.stringify(row.result),
          row.processedAt,
        ]
      );
    },
    async insertChange(row) {
      const result = await pool.query(
        `INSERT INTO shop_change_log
           (tenant_id, workspace_id, entity_type, entity_id, operation_type, version, payload, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          row.tenantId,
          row.workspaceId,
          row.entityType,
          row.entityId,
          row.operationType,
          row.version,
          JSON.stringify(row.payload),
          row.occurredAt || new Date().toISOString(),
        ]
      );
      return mapChange(result.rows[0]);
    },
    async listChanges(scope, afterSeq, limit) {
      const result = await pool.query(
        `SELECT * FROM shop_change_log
         WHERE tenant_id = $1 AND workspace_id = $2 AND seq > $3
         ORDER BY seq ASC
         LIMIT $4`,
        [scope.tenantId, scope.workspaceId, afterSeq, limit]
      );
      return result.rows.map(mapChange);
    },
  };
}
