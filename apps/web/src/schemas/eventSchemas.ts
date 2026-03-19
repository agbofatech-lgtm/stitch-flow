import { z } from 'zod';

export const eventBatchSchema = z.object({
  body: z.object({
    events: z.array(
      z.object({
        userId: z.string().uuid().nullable().optional(),
        deviceId: z.string().min(1),
        eventType: z.string().min(1),
        metadata: z.record(z.any()).default({}),
        timestamp: z.string().datetime()
      })
    ).min(1).max(50)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});
