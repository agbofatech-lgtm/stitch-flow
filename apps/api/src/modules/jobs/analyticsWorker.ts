import { Worker } from 'bullmq';
import { env } from '../config/env';

new Worker(
  'analytics',
  async job => {
    console.log('Process analytics job', job.data);
  },
  {
    connection: { url: env.REDIS_URL }
  }
);
