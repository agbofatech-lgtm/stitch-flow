import pino from 'pino';
import { env } from './env';

const defaultLevel =
  env.NODE_ENV === 'production' ? 'info' : env.NODE_ENV === 'test' ? 'silent' : 'debug';

export const logger = pino({
  level: process.env.LOG_LEVEL || defaultLevel
});
