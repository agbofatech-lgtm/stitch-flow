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
};
