import { Worker } from 'bullmq';
import { env } from '../config/env';

new Worker(
  'sync-retry',
  async job => {
    console.log('Retry sync job', job.data);
  },
  {
    connection: { url: env.REDIS_URL }
  }
);
