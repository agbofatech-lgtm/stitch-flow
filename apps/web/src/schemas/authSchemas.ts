import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    tier: z.enum(['free', 'pro', 'enterprise']).default('free')
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
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
