import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: Number(getEnv('PORT', '3000')),
  DATABASE_URL: getEnv('DATABASE_URL'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
  REDIS_URL: getEnv('REDIS_URL', 'redis://redis:6379'),

  JWT_SECRET: getEnv('JWT_SECRET'),
  REFRESH_TOKEN_SECRET: getEnv('REFRESH_TOKEN_SECRET'),
  ACCESS_TOKEN_EXPIRES_IN: getEnv('ACCESS_TOKEN_EXPIRES_IN', '15m'),
  REFRESH_TOKEN_EXPIRES_IN: getEnv('REFRESH_TOKEN_EXPIRES_IN', '7d'),

  BCRYPT_ROUNDS: Number(getEnv('BCRYPT_ROUNDS', '12')),

  FREE_DEVICE_LIMIT: Number(getEnv('FREE_DEVICE_LIMIT', '1')),
  PRO_DEVICE_LIMIT: Number(getEnv('PRO_DEVICE_LIMIT', '2')),
  ENTERPRISE_DEVICE_LIMIT: Number(getEnv('ENTERPRISE_DEVICE_LIMIT', '5')),
};
