import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Phase 8 — AES-256-GCM secret envelope (webhook signing secrets).
 *
 * Outgoing-signing secrets must be RETRIEVABLE to sign each delivery (a
 * one-way hash cannot sign). This envelope keeps them non-plaintext at
 * rest: authenticated encryption + random IV; tampering fails the auth tag.
 *
 * Key source: WEBHOOK_ENCRYPTION_KEY if set, else derived from JWT_SECRET
 * (documented fallback for deployments that have not provisioned a
 * dedicated key; rotating either key invalidates stored envelopes).
 */
function encryptionKey(): Buffer {
  const material = env.WEBHOOK_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(`webhook-secretbox:${material}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ct.toString('base64url')}`;
}

export function decryptSecret(envelope: string): string {
  const parts = envelope.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('malformed secret envelope');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(parts[1], 'base64url'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}
