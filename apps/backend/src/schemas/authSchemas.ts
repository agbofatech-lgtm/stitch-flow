import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
    /**
     * Phase 9: optional phone identity. When present it must normalize to a
     * valid E.164 number (Ghana-aware, see utils/phone) — validation of the
     * actual number happens in the service so the error code is specific.
     */
    phone: z.string().trim().max(32).optional().or(z.literal(''))
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

/**
 * Phase 9: single-identifier login — the same field accepts an email OR a
 * phone number; users never choose between separate login screens.
 */
export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(3).max(254),
    password: z.string().min(8)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(3).max(254)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32).max(256),
    password: z.string().min(8)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});
