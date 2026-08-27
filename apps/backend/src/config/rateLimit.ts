import rateLimit from 'express-rate-limit';
import { env } from './env';

// Rate limits are relaxed under test so the suite can exercise endpoints
// repeatedly without tripping 429s.
const testing = env.NODE_ENV === 'test';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: testing ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false
});

export const licenseRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: testing ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false
});

export const syncRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: testing ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Lenient general limiter for business/API routes: protects against request
 * storms without making legitimate offline sync bursts unreliable.
 */
export const apiRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: testing ? 100000 : 2000,
  standardHeaders: true,
  legacyHeaders: false
});

export const eventsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Phase 5: commercial API limiter — protects plan/entitlement/checkout
 * endpoints from abuse without hampering normal client refreshes.
 */
export const billingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: testing ? 10000 : 120,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Phase 5: webhook limiter — deliberately lenient so legitimate provider
 * retries and duplicate deliveries are never broken (Step 29); the
 * signature check is the authenticity gate, this only caps request storms.
 */
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: testing ? 10000 : 600,
  standardHeaders: true,
  legacyHeaders: false
});
