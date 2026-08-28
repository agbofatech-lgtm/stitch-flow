import crypto from 'crypto';
import { query } from '../config/db';
import { env } from '../config/env';
import { hashToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { ApiError } from '../utils/apiError';
import { userRepository } from '../repositories/userRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { auditLogService } from './auditLogService';
import { emailService } from './emailService';

/**
 * Phase 9 — secure account recovery.
 *
 * Contract:
 *  - Secrets are 256-bit random (crypto.randomBytes); only their sha256 hash
 *    is stored. Secrets never touch the database, audit log or metrics.
 *  - Tokens are single-use (atomic conditional UPDATE) and expire
 *    (PASSWORD_RESET_TTL_MINUTES, default 15).
 *  - Requesting a reset for an unknown identifier is a silent no-op — the
 *    response never reveals account existence.
 *  - Completing a reset revokes ALL of the user's refresh tokens so stolen
 *    sessions cannot survive a password change.
 *  - Recovery is user-scoped; it never touches workspace data, so it cannot
 *    cross tenant boundaries.
 */

function resetLinkFor(secret: string): string {
  const base = env.AUTH_PUBLIC_BASE_URL.replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(secret)}`;
}

export const passwordResetService = {
  /**
   * Always resolves without revealing whether the account exists.
   */
  async request(identifier: string): Promise<{ ok: true }> {
    const user = await userRepository.findByIdentifier(identifier);
    if (user && user.status === 'active') {
      const secret = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

      // Supersede any outstanding tokens for this user (single live token).
      await query(
        `UPDATE password_reset_tokens SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, hashToken(secret), expiresAt]
      );

      await emailService.sendPasswordResetEmail({
        to: user.email,
        resetLink: resetLinkFor(secret),
      });

      await auditLogService.log({
        userId: user.id,
        action: 'password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        metadata: {}, // never the secret/link
      });
    }
    // Unknown identifier / suspended account: identical outcome, no email.
    return { ok: true };
  },

  /**
   * Consumes the token atomically. Invalid/expired/used → 400 with a single
   * generic code (no enumeration, no oracle).
   */
  async reset(token: string, newPassword: string): Promise<{ ok: true }> {
    const consumed = await query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [hashToken(token)]
    );
    const userId = consumed.rows[0]?.user_id as string | undefined;
    if (!userId) {
      throw new ApiError(400, 'INVALID_RESET_TOKEN', 'Password reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(newPassword);
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      passwordHash,
      userId
    ]);

    // Invalidate every existing session for the account.
    await refreshTokenRepository.revokeAllForUser(userId);

    await auditLogService.log({
      userId,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: userId,
      metadata: {},
    });

    return { ok: true };
  }
};
