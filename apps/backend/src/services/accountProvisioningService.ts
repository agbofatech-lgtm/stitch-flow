import crypto from 'crypto';
import { userRepository } from '../repositories/userRepository';
import { licenseRepository } from '../repositories/licenseRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { workspaceRepository } from '../repositories/workspaceRepository';
import { ApiError } from '../utils/apiError';
import { hashPassword } from '../utils/password';
import { normalizePhone } from '../utils/phone';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { generateLicenseKey } from '../utils/license';
import { auditLogService } from './auditLogService';
import { subscriptionService } from './subscriptionService';
import { env } from '../config/env';

/**
 * Phase 10 — single account-provisioning pipeline.
 *
 * Extracted verbatim from the Phase 9 registration flow so that BOTH public
 * registration and platform-side customer creation execute the SAME rules:
 *   identity normalization + duplicate detection → user → license →
 *   workspace → owner membership → server-authoritative trial.
 *
 * There is deliberately no second provisioning implementation. Differences
 * between the two callers are expressed only through `opts`:
 *  - public registration issues tokens for the new user and audits
 *    `user_registered`;
 *  - platform creation NEVER issues or returns tokens (the operator must not
 *    receive the customer's credentials), audits `platform.customer_created`
 *    with the acting operator, and onboards via the password-reset flow.
 */

function getMaxDevices(tier: 'free' | 'pro' | 'enterprise') {
  if (tier === 'pro') return env.PRO_DEVICE_LIMIT;
  if (tier === 'enterprise') return env.ENTERPRISE_DEVICE_LIMIT;
  return env.FREE_DEVICE_LIMIT;
}

export type ProvisionInput = {
  email: string;
  password: string;
  fullName: string;
  tier: 'free' | 'pro' | 'enterprise';
  phone?: string;
};

export type ProvisionResult = {
  user: { id: string; email: string; [key: string]: unknown };
  license: { id: string; license_key: string; [key: string]: unknown };
  workspace: { id: string; name: string; [key: string]: unknown };
  accessToken?: string;
  refreshToken?: string;
};

export const accountProvisioningService = {
  async provisionAccount(
    data: ProvisionInput,
    opts: {
      issueTokens: boolean;
      audit: { action: string; userId?: string | null; metadata?: Record<string, unknown> };
    }
  ): Promise<ProvisionResult> {
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

    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    if (opts.issueTokens) {
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        workspaceId: workspace.id as string | null
      };
      accessToken = signAccessToken(payload);
      refreshToken = signRefreshToken(payload);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await refreshTokenRepository.create(user.id, refreshToken, expiresAt);
    }

    await auditLogService.log({
      userId: opts.audit.userId ?? user.id,
      action: opts.audit.action,
      entityType: 'user',
      entityId: user.id,
      metadata: opts.audit.metadata ?? {}
    });

    return {
      user: user as ProvisionResult['user'],
      license: license as ProvisionResult['license'],
      workspace: workspace as ProvisionResult['workspace'],
      accessToken,
      refreshToken
    };
  }
};
