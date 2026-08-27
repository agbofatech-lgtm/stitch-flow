import { Router } from 'express';
import { query } from '../config/db';

const settingsRoutes = Router();

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  can_manage_customers: boolean;
  can_manage_orders: boolean;
  can_manage_payments: boolean;
  joined_at: string;
};

function mapWorkspaceMember(row: WorkspaceMemberRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    user: {
      id: row.id,
      fullName: row.full_name,
      email: row.email || '',
      phone: row.phone || '',
    },
    role: row.role,
    canManageCustomers: row.can_manage_customers,
    canManageOrders: row.can_manage_orders,
    canManagePayments: row.can_manage_payments,
    joinedAt: row.joined_at,
  };
}

settingsRoutes.get('/', async (req, res) => {
  try {
    const result = await query(
      `
      SELECT key, value
      FROM app_settings
      WHERE workspace_id = $1
    `,
      [req.workspaceId]
    );

    const settings: Record<string, unknown> = {};

    result.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

settingsRoutes.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body ?? {};

    if (!key) {
      return res.status(400).json({ message: 'Missing key' });
    }

    await query(
      `
      INSERT INTO app_settings (workspace_id, key, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (workspace_id, key)
      DO UPDATE SET value = EXCLUDED.value
      `,
      [req.workspaceId, key, JSON.stringify(value)]
    );

    res.json({ key, value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update setting' });
  }
});

settingsRoutes.get('/workspace-members', async (req, res) => {
  try {
    // The authenticated workspace is authoritative; the legacy query
    // parameter is no longer trusted for authorization.
    const workspaceId = req.workspaceId!;

    const result = await query<WorkspaceMemberRow>(
      `
      SELECT *
      FROM workspace_members
      WHERE workspace_id = $1
      ORDER BY joined_at ASC
      `,
      [workspaceId]
    );

    res.json(result.rows.map(mapWorkspaceMember));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch workspace members' });
  }
});

settingsRoutes.post('/workspace-members', async (req, res) => {
  try {
    const {
      fullName,
      email = '',
      phone = '',
      role = 'assistant',
      canManageCustomers = false,
      canManageOrders = false,
      canManagePayments = false,
    } = req.body ?? {};

    // Server-authoritative tenant: the body's workspaceId is ignored.
    const workspaceId = req.workspaceId!;

    if (!workspaceId || !fullName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!String(email).trim() && !String(phone).trim()) {
      return res.status(400).json({ message: 'Provide email or phone number' });
    }

    if (String(email).trim()) {
      const existing = await query<WorkspaceMemberRow>(
        `
        SELECT *
        FROM workspace_members
        WHERE workspace_id = $1
          AND LOWER(email) = LOWER($2)
        LIMIT 1
        `,
        [workspaceId, email]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Member with this email already exists' });
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await query<WorkspaceMemberRow>(
      `
      INSERT INTO workspace_members (
        id,
        workspace_id,
        full_name,
        email,
        phone,
        role,
        can_manage_customers,
        can_manage_orders,
        can_manage_payments
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        id,
        workspaceId,
        fullName,
        String(email).trim() || null,
        String(phone).trim() || null,
        role,
        Boolean(canManageCustomers),
        Boolean(canManageOrders),
        Boolean(canManagePayments),
      ]
    );

    res.status(201).json(mapWorkspaceMember(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add workspace member' });
  }
});

settingsRoutes.put('/workspace-members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email = '',
      phone = '',
      role = 'assistant',
      canManageCustomers = false,
      canManageOrders = false,
      canManagePayments = false,
    } = req.body ?? {};

    const result = await query<WorkspaceMemberRow>(
      `
      UPDATE workspace_members
      SET
        full_name = $2,
        email = $3,
        phone = $4,
        role = $5,
        can_manage_customers = $6,
        can_manage_orders = $7,
        can_manage_payments = $8
      WHERE id = $1 AND workspace_id = $9
      RETURNING *
      `,
      [
        id,
        fullName,
        String(email).trim() || null,
        String(phone).trim() || null,
        role,
        Boolean(canManageCustomers),
        Boolean(canManageOrders),
        Boolean(canManagePayments),
        req.workspaceId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Workspace member not found' });
    }

    res.json(mapWorkspaceMember(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update workspace member' });
  }
});

settingsRoutes.delete('/workspace-members/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query<WorkspaceMemberRow>(
      `
      DELETE FROM workspace_members
      WHERE id = $1 AND workspace_id = $2
      RETURNING *
      `,
      [id, req.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Workspace member not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete workspace member' });
  }
});

export { settingsRoutes };
