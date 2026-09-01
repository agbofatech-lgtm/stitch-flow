import jwt from 'jsonwebtoken';
import { getAccessTokenTtl, getJwtSecret } from './secrets';
import type { AccessTokenPayload } from './types';

const ISSUER = 'stitchflow-platform';

export function signAccessToken(identityId: string, expiresIn?: string): string {
  const payload: AccessTokenPayload = { sub: identityId, typ: 'access' };
  return jwt.sign(payload, getJwtSecret(), {
    issuer: ISSUER,
    expiresIn: (expiresIn || getAccessTokenTtl()) as jwt.SignOptions['expiresIn'],
  });
}

export type TokenVerifyResult =
  | { ok: true; identityId: string }
  | { ok: false; reason: 'missing' | 'malformed' | 'invalid' | 'expired' };

export function verifyAccessToken(token: string | undefined): TokenVerifyResult {
  if (!token) return { ok: false, reason: 'missing' };
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { issuer: ISSUER });
    if (typeof decoded !== 'object' || decoded === null) {
      return { ok: false, reason: 'malformed' };
    }
    const rec = decoded as jwt.JwtPayload;
    if (rec.typ !== 'access' || typeof rec.sub !== 'string' || rec.sub === '') {
      return { ok: false, reason: 'malformed' };
    }
    if ('plan' in rec || 'billingStatus' in rec || 'permissions' in rec || 'tenantId' in rec) {
      return { ok: false, reason: 'malformed' };
    }
    return { ok: true, identityId: rec.sub };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TokenExpiredError') return { ok: false, reason: 'expired' };
    if (name === 'JsonWebTokenError') {
      if (String(err instanceof Error ? err.message : '').includes('jwt malformed')) {
        return { ok: false, reason: 'malformed' };
      }
      return { ok: false, reason: 'invalid' };
    }
    return { ok: false, reason: 'invalid' };
  }
}

export function parseBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  if (!value || scheme.toLowerCase() !== 'bearer') return undefined;
  return value;
}
