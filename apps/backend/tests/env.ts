/**
 * Loaded before any module (jest setupFiles): provides the environment the
 * backend requires. The embedded Postgres instance is booted by
 * globalSetup.js on the fixed port below.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@127.0.0.1:5541/stitchflow_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.BCRYPT_ROUNDS = '4';
