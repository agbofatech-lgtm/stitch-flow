import type { Pool } from 'pg';
import type { ShopCustomer, ShopOrder, ShopStage, ShopTrustedArtifact } from './types';
import type { ShopRepository, ShopScope } from './repository';

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

export function createPostgresShopRepository(pool: Pool): ShopRepository {
  return {
    async insertCustomer(row) {
      await pool.query(
        `INSERT INTO shop_customers (id, tenant_id, workspace_id, full_name, phone, email, address, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [row.id, row.tenantId, row.workspaceId, row.fullName, row.phone, row.email, row.address, row.notes, row.createdAt, row.updatedAt]
      );
    },
    async listCustomers(scope) {
      const result = await pool.query(
        `SELECT * FROM shop_customers WHERE tenant_id = $1 AND workspace_id = $2 ORDER BY created_at`,
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
    async insertOrder(row) {
      await pool.query(
        `INSERT INTO shop_orders (id, tenant_id, workspace_id, customer_id, order_number, status, garment_type, notes, measurement_snapshot, production_stages, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
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
        ]
      );
    },
    async listOrders(scope) {
      const result = await pool.query(
        `SELECT * FROM shop_orders WHERE tenant_id = $1 AND workspace_id = $2 ORDER BY created_at`,
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
    async updateOrder(scope, row) {
      await pool.query(
        `UPDATE shop_orders SET
           status = $4,
           garment_type = $5,
           notes = $6,
           measurement_snapshot = $7,
           production_stages = $8,
           updated_at = $9
         WHERE id = $1 AND tenant_id = $2 AND workspace_id = $3`,
        [
          row.id,
          scope.tenantId,
          scope.workspaceId,
          row.status,
          row.garmentType,
          row.notes,
          row.measurementSnapshot ? JSON.stringify(row.measurementSnapshot) : null,
          JSON.stringify(row.productionStages),
          row.updatedAt,
        ]
      );
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
  };
}
