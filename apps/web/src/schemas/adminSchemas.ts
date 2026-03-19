import { z } from 'zod';

export const updateLicenseSchema = z.object({
  body: z.object({
    tier: z.enum(['free', 'pro', 'enterprise']),
    maxDevices: z.number().int().min(1).max(100)
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
});
