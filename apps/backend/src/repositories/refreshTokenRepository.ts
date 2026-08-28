import { query } from '../config/db';
import { hashToken } from '../utils/jwt';

/**
 * Refresh tokens are persisted as sha256 hashes: a database leak does not
 * yield replayable refresh credentials. All lookups hash the presented token.
 */
export const refreshTokenRepository = {
  async create(userId: string, token: string, expiresAt: Date) {
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt]
    );
  },

  async find(token: string) {
    const result = await query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND revoked_at IS NULL AND deleted_at IS NULL
         AND expires_at > NOW()`,
      [hashToken(token)]
    );
    return result.rows[0] || null;
  },

  /**
   * Atomically consumes (revokes) a live token and returns it, or null if it
   * was already used/revoked/expired. Guarantees SINGLE USE even under
   * concurrent refresh attempts: exactly one caller wins the UPDATE.
   */
  async consume(token: string) {
    const result = await query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), updated_at = NOW()
       WHERE token = $1 AND revoked_at IS NULL AND deleted_at IS NULL
         AND expires_at > NOW()
       RETURNING *`,
      [hashToken(token)]
    );
    return result.rows[0] || null;
  },

  async revoke(token: string) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
       WHERE token = $1`,
      [hashToken(token)]
    );
  },

  /**
   * Phase 9: revoke every live session for a user (used after a completed
   * password reset so existing sessions cannot survive the credential change).
   */
  async revokeAllForUser(userId: string) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }
};
