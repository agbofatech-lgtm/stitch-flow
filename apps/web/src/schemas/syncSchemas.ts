import { z } from 'zod';

export const pushSyncSchema = z.object({
  body: z.object({
    changes: z.array(
      z.object({
        table: z.enum(['orders', 'customers']),
        operation: z.enum(['insert', 'update', 'delete']),
        data: z.record(z.any()),
        clientId: z.string().uuid(),
        timestamp: z.string().datetime()
      })
    ).max(500)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

export const pullSyncSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    since: z.string().datetime(),
    tables: z.string()
  }),
  params: z.object({}).optional()
});
