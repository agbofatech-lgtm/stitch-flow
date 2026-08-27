import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

type TokenPayload = {
  sub: string;
  email: string;
  role: 'user' | 'admin';
};

// @types/jsonwebtoken narrows expiresIn to `number | ms.StringValue`.
// Env values are duration strings like "15m"/"7d" (see .env.example), so this
// assertion narrows the config string to the ms.StringValue format jwt expects.
const ACCESS_TOKEN_TTL = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'];

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;
}
