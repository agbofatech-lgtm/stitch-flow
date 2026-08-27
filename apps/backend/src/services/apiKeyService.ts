import crypto from 'crypto';
import { query } from '../config/db';
import { API_KEY_PREFIX_HEADER, isValidScopeList } from '../security/apiScopes';

/**
 * Phase 8 — API-key lifecycle (§12).
 *
 * Secret handling:
 * - generated server-side: 256 bits of entropy, base64url → `sf_live_…`
 * - persisted: SHA-256 hash only; raw secret returned ONCE at creation
 * - lookup: prefix-indexed; hash compared with timingSafeEqual
 * - revocation + expiration + (throttled) last-used tracking
 */
export interface ApiKeyRow {
  id: string;
  workspace_id: string;
  created_by: string | null;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  request_count: string | number;
  created_at: string;
  revoked_at: string | null;
}

export type CreateKeyResult =
  | { ok: true; key: ApiKeyRow; secret: string }
  | { ok: false; code: 'INVALID_SCOPES' | 'INVALID_EXPIRATION' };

function generateSecret() {
  const body = crypto.randomBytes(32).toString('base64url'); // 43 chars, 256-bit
  const secret = `${API_KEY_PREFIX_HEADER}${body}`;
  const prefix = secret.slice(0, API_KEY_PREFIX_HEADER.length + 8);
  const hash = crypto.createHash('sha256').update(secret).digest('hex');
  return { secret, prefix, hash };
}

/** SHA-256 of a presented secret, for timing-safe comparison. */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export const apiKeyService = {
  async create(input: {
    workspaceId: string;
    createdBy: string;
    name: string;
    scopes: unknown;
    expiresAt?: unknown;
  }): Promise<CreateKeyResult> {
    if (!isValidScopeList(input.scopes)) {
      return { ok: false, code: 'INVALID_SCOPES' };
    }
    let expiresAt: Date | null = null;
    if (typeof input.expiresAt === 'string' && input.expiresAt.trim() !== '') {
      const parsed = new Date(input.expiresAt);
      if (Number.isNaN(parsed.getTime())) return { ok: false, code: 'INVALID_EXPIRATION' };
      expiresAt = parsed;
    } else if (input.expiresAt !== undefined && input.expiresAt !== null) {
      return { ok: false, code: 'INVALID_EXPIRATION' };
    }
    const name = String(input.name ?? '').trim().slice(0, 100);
    if (!name) return { ok: false, code: 'INVALID_SCOPES' }; // caller validates name first

    const { secret, prefix, hash } = generateSecret();
    const result = await query<ApiKeyRow>(
      `INSERT INTO api_keys (workspace_id, created_by, name, key_prefix, secret_hash, scopes, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, workspace_id, created_by, name, key_prefix, scopes, status,
                 expires_at, last_used_at, request_count, created_at, revoked_at`,
      [input.workspaceId, input.createdBy, name, prefix, hash, input.scopes, expiresAt]
    );
    return { ok: true, key: result.rows[0], secret };
  },

  /** List for a workspace. NEVER returns secret_hash. */
  async list(workspaceId: string): Promise<ApiKeyRow[]> {
    const result = await query<ApiKeyRow>(
      `SELECT id, workspace_id, created_by, name, key_prefix, scopes, status,
              expires_at, last_used_at, request_count, created_at, revoked_at
       FROM api_keys WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId]
    );
    return result.rows;
  },

  async revoke(workspaceId: string, keyId: string, revokedBy: string): Promise<'revoked' | 'not_found' | 'already_revoked'> {
    const result = await query(
      `UPDATE api_keys SET status = 'revoked', revoked_at = NOW(), revoked_by = $3
       WHERE id = $1 AND workspace_id = $2 AND status = 'active'
       RETURNING id`,
      [keyId, workspaceId, revokedBy]
    );
    if (result.rows.length > 0) return 'revoked';
    const existing = await query(`SELECT status FROM api_keys WHERE id = $1 AND workspace_id = $2`, [keyId, workspaceId]);
    if (existing.rows.length === 0) return 'not_found';
    return 'already_revoked';
  },

  async setScopes(workspaceId: string, keyId: string, scopes: unknown): Promise<'updated' | 'not_found' | 'not_active' | 'invalid'> {
    if (!isValidScopeList(scopes)) return 'invalid';
    const result = await query(
      `UPDATE api_keys SET scopes = $3 WHERE id = $1 AND workspace_id = $2 AND status = 'active'
       RETURNING id`,
      [keyId, workspaceId, scopes]
    );
    if (result.rows.length > 0) return 'updated';
    const existing = await query(`SELECT status FROM api_keys WHERE id = $1 AND workspace_id = $2`, [keyId, workspaceId]);
    if (existing.rows.length === 0) return 'not_found';
    return 'not_active';
  },

  /**
   * Verify a presented secret. Returns the key row (without secret_hash) on
   * success, or a precise failure code. Never distinguishes unknown prefix
   * from wrong secret in the response body.
   */
  async verify(presented: string): Promise<{ ok: true; key: ApiKeyRow } | { ok: false; code: 'INVALID' | 'REVOKED' | 'EXPIRED' }> {
    if (!presented.startsWith(API_KEY_PREFIX_HEADER) || presented.length < API_KEY_PREFIX_HEADER.length + 20) {
      return { ok: false, code: 'INVALID' };
    }
    const prefix = presented.slice(0, API_KEY_PREFIX_HEADER.length + 8);
    const result = await query<{ id: string; secret_hash: string; scopes: string[]; status: string; expires_at: string | null; workspace_id: string; name: string; key_prefix: string; created_by: string | null; last_used_at: string | null; request_count: string | number; created_at: string; revoked_at: string | null }>(
      `SELECT id, workspace_id, created_by, name, key_prefix, secret_hash, scopes, status,
              expires_at, last_used_at, request_count, created_at, revoked_at
       FROM api_keys WHERE key_prefix = $1`,
      [prefix]
    );
    const row = result.rows[0];
    if (!row || !safeEqualHex(hashSecret(presented), row.secret_hash)) {
      return { ok: false, code: 'INVALID' };
    }
    if (row.status === 'revoked') return { ok: false, code: 'REVOKED' };
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      // Lazy expiration: flip status once, then reject.
      void query(`UPDATE api_keys SET status = 'expired' WHERE id = $1 AND status = 'active'`, [row.id]).catch(() => undefined);
      return { ok: false, code: 'EXPIRED' };
    }
    if (row.status === 'expired') return { ok: false, code: 'EXPIRED' };
    const { secret_hash, ...safe } = row;
    void secret_hash;
    return { ok: true, key: safe as ApiKeyRow };
  },

  /**
   * Throttled last-used tracking: at most one UPDATE per key per 30s window
   * (avoids a write per request); request_count increments on the same beat.
   */
  touch(keyId: string): void {
    void query(
      `UPDATE api_keys
       SET last_used_at = NOW(), request_count = request_count + 1
       WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '30 seconds')`,
      [keyId]
    ).catch(() => undefined);
  },
};
