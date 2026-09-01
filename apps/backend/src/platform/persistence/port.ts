/**
 * Commercial persistence port.
 * FACT: createApp does not open Postgres (`/ready` database: not-verified).
 * Runtime adapter: memory (TRANSITIONAL).
 * SQL schema: migrations/006_platform_commercial.sql — not applied this slice.
 */
export type PersistenceDriver = 'memory' | 'postgres';

export type PersistenceStatus = {
  driver: PersistenceDriver;
  classification: 'TRANSITIONAL' | 'AUTHORITATIVE';
  postgresApplied: false;
};
