import { query } from '../config/db';

export const userRepository = {
  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'suspended';
  }) {
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.passwordHash, data.fullName, data.role || 'user', data.status || 'active']
    );
    return result.rows[0];
  },

  async findByEmail(email: string) {
    const result = await query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);
    return result.rows[0] || null;
  },

  async findById(id: string) {
    const result = await query(`SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return result.rows[0] || null;
  },

  async list(limit: number, offset: number, status?: string, role?: string) {
    const filters: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }
    if (role) {
      params.push(role);
      filters.push(`role = $${params.length}`);
    }
    params.push(limit, offset);
    const sql = `
      SELECT * FROM users
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await query(sql, params);
    return result.rows;
  }
};
