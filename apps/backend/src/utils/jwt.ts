import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export type TokenPayload = {
  sub: string;
  email: string;
  role: 'user' | 'admin';
  /** Active workspace for tenant scoping (null when the user has none). */
  workspaceId: string | null;
};

// Hardening: fixed algorithm, issuer and audience are enforced on BOTH sign
// and verify. Tokens carry identity/scope claims only — never secrets.
export const JWT_ISSUER = 'stitchflow-api';
export const JWT_AUDIENCE = 'stitchflow-clients';
const JWT_ALGORITHM = 'HS256' as const;

// @types/jsonwebtoken narrows expiresIn to `number | ms.StringValue`.
// Env values are duration strings like "15m"/"7d" (see .env.example), so this
// assertion narrows the config string to the ms.StringValue format jwt expects.
const ACCESS_TOKEN_TTL = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL
  });
}

export function signRefreshToken(payload: TokenPayload) {
  // `jti` makes every refresh token unique even when two tokens are issued
  // for the same user within the same second.
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.REFRESH_TOKEN_SECRET, {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: REFRESH_TOKEN_TTL
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as TokenPayload;
}

/**
 * Refresh tokens are stored HASHED (sha256) so a database leak does not
 * yield replayable credentials. Comparison happens on the hash.
 */
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
