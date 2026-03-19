import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type TokenPayload = {
  sub: string;
  email: string;
  role: 'user' | 'admin';
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN
  });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;
}
