import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/** Optional variable: empty string means "not configured" (no throw). */
function getOptionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
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

  // --- Phase 6: database pool reliability (DEPLOYMENT-ONLY, safe defaults) --
  DB_POOL_MAX: Number(getEnv('DB_POOL_MAX', '10')),
  DB_IDLE_TIMEOUT_MS: Number(getEnv('DB_IDLE_TIMEOUT_MS', '30000')),
  DB_CONNECTION_TIMEOUT_MS: Number(getEnv('DB_CONNECTION_TIMEOUT_MS', '5000')),
  DB_STATEMENT_TIMEOUT_MS: Number(getEnv('DB_STATEMENT_TIMEOUT_MS', '15000')),

  BCRYPT_ROUNDS: Number(getEnv('BCRYPT_ROUNDS', '12')),

  // --- Phase 9: commercial identity & account recovery (SERVER-ONLY) ------
  /** Email delivery transport: 'console' (dev/test) | 'smtp' (later phase). */
  EMAIL_TRANSPORT: getOptionalEnv('EMAIL_TRANSPORT', 'console'),
  /** Public web origin used to build password-reset links. */
  AUTH_PUBLIC_BASE_URL: getEnv('AUTH_PUBLIC_BASE_URL', 'http://localhost:5173'),
  /** Password-reset token lifetime in minutes (single-use regardless). */
  PASSWORD_RESET_TTL_MINUTES: Number(getEnv('PASSWORD_RESET_TTL_MINUTES', '15')),

  FREE_DEVICE_LIMIT: Number(getEnv('FREE_DEVICE_LIMIT', '1')),
  PRO_DEVICE_LIMIT: Number(getEnv('PRO_DEVICE_LIMIT', '2')),
  ENTERPRISE_DEVICE_LIMIT: Number(getEnv('ENTERPRISE_DEVICE_LIMIT', '5')),

  // --- Phase 5: commercial configuration (SERVER-ONLY) ------------------
  /** Trial length in days for new workspaces (business configuration). */
  TRIAL_DAYS: getEnv('TRIAL_DAYS', '14'),
  /** Plan whose features a trial grants (BASIC | PRO | STUDIO). */
  TRIAL_PLAN_CODE: getEnv('TRIAL_PLAN_CODE', 'STUDIO'),
  /** Billing provider selection: 'paystack' | 'none'. Tests always use the test provider. */
  BILLING_PROVIDER: getOptionalEnv('BILLING_PROVIDER', 'none'),
  /** Paystack secret key — SERVER-ONLY, never VITE_*, never committed. */
  PAYSTACK_SECRET_KEY: getOptionalEnv('PAYSTACK_SECRET_KEY'),
  /** Deterministic signing secret for the test billing provider (test fixture, not a credential). */
  TEST_BILLING_SECRET: getOptionalEnv('TEST_BILLING_SECRET', 'stitchflow-test-billing-secret'),

  // --- Phase 8: webhook delivery configuration (SERVER-ONLY) -------------
  /** AES key material for webhook-signing-secret envelopes; falls back to JWT_SECRET. */
  WEBHOOK_ENCRYPTION_KEY: getOptionalEnv('WEBHOOK_ENCRYPTION_KEY'),
  /** Per-request delivery timeout (ms). Read at call time so tests can override. */
  WEBHOOK_DELIVERY_TIMEOUT_MS: Number(getEnv('WEBHOOK_DELIVERY_TIMEOUT_MS', '10000')),
  /** Allow private/loopback destinations (local receivers); never enable in production. */
  WEBHOOK_ALLOW_PRIVATE_DESTINATIONS: getOptionalEnv('WEBHOOK_ALLOW_PRIVATE_DESTINATIONS', 'false'),
};
