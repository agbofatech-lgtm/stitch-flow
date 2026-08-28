import { z } from 'zod';
import { PLATFORM_ROLES } from '../middleware/requirePlatformRole';

/**
 * Phase 10 — request validation for the Developer Control Center endpoints.
 * Write endpoints never trust client shape; every field is validated before
 * the service layer runs. Same {body,query,params} wrapper convention as
 * authSchemas so the shared validate middleware can consume them.
 */

export const createCustomerSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email').max(255),
    fullName: z.string().min(2, 'Full name is required').max(120),
    phone: z.string().trim().max(32).optional().or(z.literal('')),
    tier: z.enum(['free', 'pro', 'enterprise']).optional(),
    sendReset: z.boolean().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const customerLifecycleSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3, 'A reason is required (min 3 characters)').max(500)
  }),
  query: z.object({}).optional(),
  // validate() REPLACES req.params with the parsed value — :id must be
  // declared or the route param is stripped away.
  params: z.object({ id: z.string().uuid('Invalid customer id') })
});

export const operatorRoleSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email').max(255),
    role: z.enum(PLATFORM_ROLES)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const auditLogQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    action: z.string().trim().max(80).optional(),
    entityType: z.string().trim().max(40).optional(),
    entityId: z.string().trim().max(64).optional()
  }).optional()
});
