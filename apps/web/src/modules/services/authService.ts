import { userRepository } from '@modules/repositories/userRepository';
import { licenseRepository } from '@modules/repositories/licenseRepository';
import { refreshTokenRepository } from '@modules/repositories/refreshTokenRepository';
import { ApiError } from '@shared/utils/apiError';
import { comparePassword, hashPassword } from '@shared/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@shared/utils/jwt';
import { generateLicenseKey } from '@shared/utils/license';
import { auditLogService } from './auditLogService';
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

    const payload = { sub: user.id, email: user.email, role: user.role };
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

    return { user, license, accessToken, refreshToken };
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

    const payload = { sub: user.id, email: user.email, role: user.role };
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
    const stored = await refreshTokenRepository.find(refreshToken);
    if (!stored) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return { accessToken };
  }
};
