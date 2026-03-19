import { query } from '../config/db';

export const refreshTokenRepository = {
  async create(userId: string, token: string, expiresAt: Date) {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  },

  async find(token: string) {
    const result = await query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND revoked_at IS NULL AND deleted_at IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  },

  async revoke(token: string) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
       WHERE token = $1`,
      [token]
    );
  }
};
