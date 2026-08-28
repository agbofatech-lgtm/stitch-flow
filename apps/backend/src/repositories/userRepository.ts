import { query } from '../config/db';
import { isEmailIdentifier, normalizePhone } from '../utils/phone';

export const userRepository = {
  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'suspended';
    phone?: string | null;
  }) {
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, status, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.email, data.passwordHash, data.fullName, data.role || 'user', data.status || 'active', data.phone ?? null]
    );
    return result.rows[0];
  },

  async findByEmail(email: string) {
    const result = await query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);
    return result.rows[0] || null;
  },

  /** Phase 9: case-insensitive email identity lookup. */
  async findByEmailLower(email: string) {
    const result = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0] || null;
  },

  /** Phase 9: phone identity lookup — `phone` MUST already be canonical E.164. */
  async findByPhone(e164: string) {
    const result = await query(`SELECT * FROM users WHERE phone = $1 AND deleted_at IS NULL`, [e164]);
    return result.rows[0] || null;
  },

  /**
   * Phase 9: single-identifier resolution for login/recovery. Accepts an
   * email (case-insensitive) or a phone number in any supported
   * representation; unnormalizable phone input simply resolves to null
   * (callers answer with a generic authentication failure).
   */
  async findByIdentifier(identifier: string) {
    const value = typeof identifier === 'string' ? identifier.trim() : '';
    if (!value) return null;
    if (isEmailIdentifier(value)) return this.findByEmailLower(value);
    const normalized = normalizePhone(value);
    if (!normalized.ok) return null;
    return this.findByPhone(normalized.e164);
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
