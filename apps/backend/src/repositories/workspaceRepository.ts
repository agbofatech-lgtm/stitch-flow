import { query } from '../config/db';

export const workspaceRepository = {
  async create(data: { id: string; name: string; ownerUserId: string }) {
    const result = await query(
      `INSERT INTO workspaces (id, name, owner_user_id) VALUES ($1, $2, $3) RETURNING *`,
      [data.id, data.name, data.ownerUserId]
    );
    return result.rows[0];
  },

  async addMember(workspaceId: string, userId: string, role: 'owner' | 'admin' | 'assistant') {
    const result = await query(
      `INSERT INTO workspace_users (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [workspaceId, userId, role]
    );
    return result.rows[0];
  },

  async findMembership(workspaceId: string, userId: string) {
    const result = await query(
      `SELECT * FROM workspace_users WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    return result.rows[0] || null;
  },

  async firstMembershipForUser(userId: string) {
    const result = await query(
      `SELECT * FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }
};
