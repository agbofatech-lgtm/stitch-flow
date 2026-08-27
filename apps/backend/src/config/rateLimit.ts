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

export const eventsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});
