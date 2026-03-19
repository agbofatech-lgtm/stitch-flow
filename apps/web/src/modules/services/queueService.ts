import { Queue } from 'bullmq';
import { env } from '../config/env';

export const analyticsQueue = new Queue('analytics', {
  connection: { url: env.REDIS_URL }
});

export const syncRetryQueue = new Queue('sync-retry', {
  connection: { url: env.REDIS_URL }
});
