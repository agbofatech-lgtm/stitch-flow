import pino from 'pino';
import { env } from './env';

const defaultLevel =
  env.NODE_ENV === 'production' ? 'info' : env.NODE_ENV === 'test' ? 'silent' : 'debug';

/**
 * Structured logging (Phase 6):
 * - JSON to stdout (shipper-friendly), level env-driven (LOG_LEVEL).
 * - Standard redaction paths so request logs can never persist credential
 *   material carried in headers/bodies (defense in depth on top of the
 *   recursive redaction utility used by audit/error paths).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || defaultLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.token',
      'req.body.refreshToken',
      'req.body.secret',
      'res.headers.authorization',
      'err.config.headers.Authorization',
      'password',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },
});
