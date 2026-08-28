import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { licenseRepository } from '../repositories/licenseRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { ApiError } from '../utils/apiError';
import { comparePassword, hashPassword } from '../utils/password';
import { isEmailIdentifier, normalizePhone } from '../utils/phone';
import { metrics } from '../config/observability/metrics';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateLicenseKey } from '../utils/license';
import { auditLogService } from './auditLogService';
import { subscriptionService } from './subscriptionService';
import { env } from '../config/env';

function getMaxDevices(tier: 'free' | 'pro' | 'enterprise') {
  if (tier === 'pro') return env.PRO_DEVICE_LIMIT;
  if (tier === 'enterprise') return env.ENTERPRISE_DEVICE_LIMIT;
  return env.FREE_DEVICE_LIMIT;
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    tier: 'free' | 'pro' | 'enterprise';
    phone?: string;
  }) {
    // Phase 9: email identity is case-insensitive — normalize before both the
    // duplicate check and persistence so "EMAIL@X.COM" can never register
    // twice or split from "email@x.com".
    const email = data.email.trim().toLowerCase();
    const existing = await userRepository.findByEmailLower(email);
    if (existing) {
      throw new ApiError(409, 'EMAIL_IN_USE', 'Email already exists');
    }

    // Phase 9: optional phone identity, stored canonical (E.164) and unique.
    let phone: string | null = null;
    const rawPhone = (data.phone ?? '').trim();
    if (rawPhone) {
      const normalized = normalizePhone(rawPhone);
      if (!normalized.ok) {
        throw new ApiError(400, 'INVALID_PHONE_NUMBER', 'Enter a valid phone number (e.g. 0241234567 or +233241234567)');
      }
      const phoneOwner = await userRepository.findByPhone(normalized.e164);
      if (phoneOwner) {
        throw new ApiError(409, 'PHONE_IN_USE', 'Phone number already exists');
      }
      phone = normalized.e164;
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      email,
      passwordHash,
      fullName: data.fullName,
      role: 'user',
      status: 'active',
      phone
    });

    const license = await licenseRepository.create({
      userId: user.id,
      licenseKey: generateLicenseKey(),
      tier: data.tier,
      maxDevices: getMaxDevices(data.tier)
    });

    // Every account gets a workspace; the creator is its owner. This is the
    // tenancy anchor for all business data.
    const workspace = await workspaceRepository.create({
      id: `ws-${crypto.randomUUID()}`,
      name: `${data.fullName}'s Workspace`,
      ownerUserId: user.id
    });
    await workspaceRepository.addMember(workspace.id, user.id, 'owner');

    // Phase 5: server-authoritative trial — every new workspace starts a
    // trialing subscription (duration/plan from TRIAL_DAYS/TRIAL_PLAN_CODE).
    // The client can display trial state; it cannot define it.
    await subscriptionService.createTrialForWorkspace(workspace.id, user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: workspace.id as string | null
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create(user.id, refreshToken, expiresAt);
    await auditLogService.log({
      userId: user.id,
      action: 'user_registered',
      entityType: 'user',
      entityId: user.id
    });

    return { user, license, workspace, accessToken, refreshToken };
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
