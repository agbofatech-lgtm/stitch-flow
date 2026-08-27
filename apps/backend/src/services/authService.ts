import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { licenseRepository } from '../repositories/licenseRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { ApiError } from '../utils/apiError';
import { comparePassword, hashPassword } from '../utils/password';
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
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ApiError(409, 'EMAIL_IN_USE', 'Email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: 'user',
      status: 'active'
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

  async login(data: { email: string; password: string }) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is not active');
    }

    const match = await comparePassword(data.password, user.password_hash);
    if (!match) {
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
      entityId: user.id
    });

    return { user, accessToken, refreshToken };
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
