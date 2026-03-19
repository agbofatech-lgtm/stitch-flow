import { z } from 'zod';

export const validateLicenseSchema = z.object({
  body: z.object({
    licenseKey: z.string().min(5),
    deviceFingerprint: z.string().min(5)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const deactivateDeviceSchema = z.object({
  body: z.object({
    deviceFingerprint: z.string().min(5)
  }),
  query: z.object({}).optional(),
  params: z.object({
    licenseId: z.string().uuid()
  })
});
