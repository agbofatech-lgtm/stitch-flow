import { z } from 'zod';

export const createFeatureRequestSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(5),
    status: z.enum(['open', 'planned', 'in_progress', 'done']).default('open')
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});
