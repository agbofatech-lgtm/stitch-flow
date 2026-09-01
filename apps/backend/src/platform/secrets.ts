import dotenv from 'dotenv';

dotenv.config();

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test') {
    return secret && secret !== '' ? secret : 'p19-test-jwt-secret';
  }
  if (!secret || secret === '') {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  return secret;
}

export function getAccessTokenTtl(): string {
  return process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
}

export function getBcryptRounds(): number {
  if (process.env.NODE_ENV === 'test') return 4;
  const raw = process.env.BCRYPT_ROUNDS;
  const n = raw ? Number(raw) : 12;
  return Number.isFinite(n) && n >= 4 ? n : 12;
}
