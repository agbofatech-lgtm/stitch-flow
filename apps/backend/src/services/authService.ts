import { userRepository } from '../repositories/userRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { ApiError } from '../utils/apiError';
import { comparePassword } from '../utils/password';
import { isEmailIdentifier } from '../utils/phone';
import { metrics } from '../config/observability/metrics';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { auditLogService } from './auditLogService';
import { accountProvisioningService } from './accountProvisioningService';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    tier: 'free' | 'pro' | 'enterprise';
    phone?: string;
  }) {
    // Phase 10: provisioning (identity rules → user → license → workspace →
    // owner membership → trial) lives in the shared pipeline used by both
    // public registration and platform-side customer creation. Public
    // registration issues tokens for the new user and audits user_registered.
    const result = await accountProvisioningService.provisionAccount(data, {
      issueTokens: true,
      audit: { action: 'user_registered' }
    });
    return {
      user: result.user,
      license: result.license,
      workspace: result.workspace,
      accessToken: result.accessToken as string,
      refreshToken: result.refreshToken as string
    };
  },

  /**
   * Phase 9: identifier-based login — one field accepts an email OR a phone
   * number (Ghana-aware normalization). Failures are uniform: an invalid
   * phone format is indistinguishable from a wrong password (no account or
   * format oracle). Audit records which identifier TYPE was used, never the
   * credential itself.
   */
  async login(data: { identifier: string; password: string }) {
    const identifier = data.identifier.trim();
    const method: 'email' | 'phone' = isEmailIdentifier(identifier) ? 'email' : 'phone';
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
      metrics.authFailures.inc();
      void auditLogService
        .log({ action: 'user_login_failed', entityType: 'user', metadata: { method, reason: 'unknown_identifier' } })
        .catch(() => undefined);
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status !== 'active') {
      metrics.authFailures.inc();
      void auditLogService
        .log({ userId: user.id, action: 'user_login_blocked', entityType: 'user', entityId: user.id, metadata: { method, reason: 'suspended' } })
        .catch(() => undefined);
      throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is not active');
    }

    const match = await comparePassword(data.password, user.password_hash);
    if (!match) {
      metrics.authFailures.inc();
      void auditLogService
        .log({ userId: user.id, action: 'user_login_failed', entityType: 'user', entityId: user.id, metadata: { method, reason: 'bad_password' } })
        .catch(() => undefined);
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const membership = await workspaceRepository.firstMembershipForUser(user.id);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: (membership?.workspace_id as string | undefined) ?? null
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create(user.id, refreshToken, expiresAt);
    await auditLogService.log({
      userId: user.id,
      action: 'user_logged_in',
      entityType: 'user',
      entityId: user.id,
      metadata: { method }
    });

    return { user, accessToken, refreshToken };
  },

  /** Phase 9: account recovery — enumeration-proof by design (see service). */
  async forgotPassword(identifier: string) {
    // Lazy require avoids a module cycle (passwordResetService -> repositories only).
    const { passwordResetService } = await import('./passwordResetService');
    return passwordResetService.request(identifier);
  },

  /** Phase 9: complete recovery with a single-use token. */
  async resetPassword(token: string, password: string) {
    const { passwordResetService } = await import('./passwordResetService');
    return passwordResetService.reset(token, password);
  },

  async refresh(refreshToken: string) {
    // Signature/expiry/issuer/audience checked BEFORE touching storage.
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    // Rotation with SINGLE-USE guarantee: consume() atomically revokes the
    // presented token; under concurrent refresh exactly one request wins and
    // every other receives 401 (replay-safe).
    const stored = await refreshTokenRepository.consume(refreshToken);
    if (!stored) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    const membership = await workspaceRepository.firstMembershipForUser(user.id);
    const newPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: (membership?.workspace_id as string | undefined) ?? null
    };
    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.create(user.id, newRefreshToken, expiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    const stored = await refreshTokenRepository.find(refreshToken);
    if (stored) {
      await refreshTokenRepository.revoke(refreshToken);
      await auditLogService.log({
        userId: stored.user_id,
        action: 'user_logged_out',
        entityType: 'user',
        entityId: stored.user_id
      });
    }

    // Idempotent: logging out an unknown/already-revoked token is a no-op.
    return { success: true };
  }
};
