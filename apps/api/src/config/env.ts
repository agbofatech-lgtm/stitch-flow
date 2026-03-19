import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  REFRESH_TOKEN_SECRET: z.string().min(16),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  MAX_PAYLOAD_SIZE: z.string().default('1mb'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  FREE_DEVICE_LIMIT: z.coerce.number().default(1),
  PRO_DEVICE_LIMIT: z.coerce.number().default(2),
  ENTERPRISE_DEVICE_LIMIT: z.coerce.number().default(5),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RENDER_EXTERNAL_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
