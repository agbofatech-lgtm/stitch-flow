import crypto from 'crypto';
import { query } from '../config/db';
import { ApiError } from '../utils/apiError';
import { normalizePhone } from '../utils/phone';
import { userRepository } from '../repositories/userRepository';
import { refreshTokenRepository } from '../repositories/refreshTokenRepository';
import { auditLogService } from './auditLogService';
import { accountProvisioningService } from './accountProvisioningService';
import { passwordResetService } from './passwordResetService';
import { PLATFORM_ROLES, type PlatformRole } from '../middleware/requirePlatformRole';

/**
 * Phase 10 — Developer Control Center backend service.
 *
 * Platform-operator customer/workspace administration built on the EXISTING
 * certified primitives: provisioning pipeline (shared with public
 * registration), users.status lifecycle, refresh-token revocation, and the
 * audit log. All methods are called from /platform routes behind
 * requirePlatformRole — workspace roles never reach this code.
 *
 * Security rules enforced here:
 *  - password_hash and token material are never selected or returned;
 *  - lifecycle changes are server-authoritative single-row conditional
 *    updates (no blind writes);
 *  - every mutation writes an audit record with the acting operator;
 *  - suspension revokes all sessions so the effect is immediate.
 */

/** Columns safe to expose for a user row — never includes password_hash. */
const USER_PUBLIC_COLS = `u.id, u.email, u.phone, u.full_name, u.role, u.status, u.created_at`;

export type CustomerListItem = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  workspace_id: string | null;
  workspace_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  last_activity: string | null;
};

export const platformCustomerService = {
  /**
   * Paginated customer list with search (name/email/phone/workspace id) and
   * status filter. Server-side; never loads the full table.
   */
  async list(params: { search?: string; status?: string; limit: number; offset: number }) {
    const filters: string[] = ['u.deleted_at IS NULL'];
    const args: unknown[] = [];
    if (params.status && ['active', 'suspended'].includes(params.status)) {
      args.push(params.status);
      filters.push(`u.status = $${args.length}`);
    }
    const search = (params.search ?? '').trim();
    if (search) {
      // Phone searches also try the normalized E.164 form so "024…" finds "+23324…".
      const normalized = normalizePhone(search);
      const like = `%${search}%`;
      args.push(like, like, like, like);
      let clause = `(u.full_name ILIKE $${args.length - 3} OR u.email ILIKE $${args.length - 2} OR u.phone ILIKE $${args.length - 1} OR w.id ILIKE $${args.length})`;
      if (normalized.ok) {
        args.push(normalized.e164);
        clause = `(${clause} OR u.phone = $${args.length})`;
      }
      filters.push(clause);
    }
    args.push(Math.min(Math.max(params.limit, 1), 100), Math.max(params.offset, 0));

    const result = await query<CustomerListItem & { total?: number }>(
      `SELECT ${USER_PUBLIC_COLS},
              w.id AS workspace_id, w.name AS workspace_name,
              s.plan_code AS plan, s.status AS subscription_status,
              (SELECT MAX(ue.occurred_at) FROM usage_events ue WHERE ue.workspace_id = w.id) AS last_activity,
              COUNT(*) OVER() AS total
       FROM users u
       LEFT JOIN workspace_users wu ON wu.user_id = u.id
       LEFT JOIN workspaces w ON w.id = wu.workspace_id
       LEFT JOIN subscriptions s ON s.workspace_id = w.id
         AND s.status IN ('trialing','active','past_due','paused')
       WHERE ${filters.join(' AND ')}
       ORDER BY u.created_at DESC
       LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args
    );
    const rows = result.rows.map(({ total: _total, ...rest }) => rest);
    const total = result.rows[0]?.total != null ? Number((result.rows[0] as { total?: number }).total) : 0;
    return { items: rows, total, limit: args[args.length - 2] as number, offset: args[args.length - 1] as number };
  },

  /**
   * Operational customer profile. Identity, workspace, memberships,
   * subscription, usage, developer surface counts and recent audit trail —
   * with zero credential material.
   */
  async detail(customerId: string) {
    const userRes = await query(
      `SELECT ${USER_PUBLIC_COLS} FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [customerId]
    );
    const user = userRes.rows[0];
    if (!user) throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

    const [wsRes, membersRes, subRes, usageRes, keysRes, hooksRes, auditRes] = await Promise.all([
      query(
        `SELECT w.id, w.name, w.created_at FROM workspaces w
         JOIN workspace_users wu ON wu.workspace_id = w.id WHERE wu.user_id = $1
         ORDER BY w.created_at ASC LIMIT 1`,
        [customerId]
      ),
      query(
        `SELECT wu.role, wu.created_at AS joined_at, uu.id AS user_id, uu.email, uu.full_name, uu.status
         FROM workspace_users wu JOIN users uu ON uu.id = wu.user_id
         WHERE wu.workspace_id = (SELECT workspace_id FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)
         ORDER BY wu.created_at ASC`,
        [customerId]
      ),
      query(
        `SELECT s.plan_code, s.status, s.trial_start, s.trial_end, s.current_period_start, s.current_period_end,
                s.cancel_at_period_end, s.cancelled_at
         FROM subscriptions s
         WHERE s.workspace_id = (SELECT workspace_id FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)
         ORDER BY s.created_at DESC LIMIT 1`,
        [customerId]
      ),
      query(
        `SELECT COUNT(*) FILTER (WHERE ue.occurred_at > NOW() - INTERVAL '7 days')::int AS events_7d,
                COUNT(*) FILTER (WHERE ue.occurred_at > NOW() - INTERVAL '30 days')::int AS events_30d,
                COUNT(*) FILTER (WHERE ue.event_name = 'api_request' AND ue.occurred_at > NOW() - INTERVAL '30 days')::int AS api_requests_30d,
                MAX(ue.occurred_at) AS last_activity
         FROM usage_events ue
         WHERE ue.workspace_id = (SELECT workspace_id FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [customerId]
      ),
      query(
        `SELECT COUNT(*)::int AS api_keys, COUNT(*) FILTER (WHERE status = 'active')::int AS active_api_keys
         FROM api_keys
         WHERE workspace_id = (SELECT workspace_id FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [customerId]
      ),
      query(
        `SELECT COUNT(*)::int AS endpoints,
                COUNT(*) FILTER (WHERE status = 'active')::int AS active_endpoints
         FROM webhook_endpoints
         WHERE workspace_id = (SELECT workspace_id FROM workspace_users WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [customerId]
      ),
      query(
        `SELECT action, entity_type, entity_id, created_at FROM audit_logs
         WHERE (user_id::text = $1 OR entity_id = $1) AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
        [customerId]
      )
    ]);

    return {
      user,
      workspace: wsRes.rows[0] ?? null,
      members: membersRes.rows,
      subscription: subRes.rows[0] ?? null,
      usage: usageRes.rows[0] ?? null,
      developer: { ...(keysRes.rows[0] ?? {}), ...(hooksRes.rows[0] ?? {}) },
      recentAudit: auditRes.rows
    };
  },

  /**
   * Platform-side customer creation. Uses the SAME provisioning pipeline as
   * public registration (no duplicate logic). The operator never chooses or
   * receives the customer's password: a cryptographically random password is
   * set, no tokens are issued, and onboarding happens through the existing
   * password-reset flow (optionally triggered here).
   */
  async create(
    input: { email: string; fullName: string; phone?: string; tier?: 'free' | 'pro' | 'enterprise'; sendReset?: boolean },
    actorUserId: string
  ) {
    const randomPassword = crypto.randomBytes(24).toString('base64url');
    const result = await accountProvisioningService.provisionAccount(
      {
        email: input.email,
        password: randomPassword,
        fullName: input.fullName,
        tier: input.tier ?? 'free',
        phone: input.phone
      },
      {
        issueTokens: false, // operator must never receive customer credentials
        audit: {
          action: 'platform.customer_created',
          userId: actorUserId,
          metadata: { customerEmail: input.email.trim().toLowerCase() }
        }
      }
    );

    let resetRequested = false;
    if (input.sendReset !== false) {
      // Reuses the Phase 9 enumeration-proof recovery flow for onboarding.
      await passwordResetService.request(result.user.email);
      resetRequested = true;
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        full_name: (result.user as { full_name?: string }).full_name ?? input.fullName,
        status: (result.user as { status?: string }).status ?? 'active'
      },
      workspace: result.workspace,
      resetRequested
    };
  },

  /** Suspend: blocks sign-in + refresh immediately and revokes all sessions. */
  async suspend(customerId: string, reason: string, actorUserId: string) {
    const res = await query(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL AND status <> 'suspended'
       RETURNING id, email`,
      [customerId]
    );
    const row = res.rows[0];
    if (!row) {
      const exists = await userRepository.findById(customerId);
      if (!exists) throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      throw new ApiError(409, 'ALREADY_SUSPENDED', 'Customer is already suspended');
    }
    await refreshTokenRepository.revokeAllForUser(customerId);
    await auditLogService.log({
      userId: actorUserId,
      action: 'platform.customer_suspended',
      entityType: 'user',
      entityId: customerId,
      metadata: { reason, customerEmail: row.email, sessionsRevoked: true }
    });
    return { id: customerId, status: 'suspended' as const };
  },

  /** Reactivate: restores sign-in. Sessions stay revoked (customer signs in fresh). */
  async reactivate(customerId: string, reason: string, actorUserId: string) {
    const res = await query(
      `UPDATE users SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL AND status <> 'active'
       RETURNING id, email`,
      [customerId]
    );
    const row = res.rows[0];
    if (!row) {
      const exists = await userRepository.findById(customerId);
      if (!exists) throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      throw new ApiError(409, 'ALREADY_ACTIVE', 'Customer is already active');
    }
    await auditLogService.log({
      userId: actorUserId,
      action: 'platform.customer_reactivated',
      entityType: 'user',
      entityId: customerId,
      metadata: { reason, customerEmail: row.email }
    });
    return { id: customerId, status: 'active' as const };
  },

  /** Force-logout: revoke every live refresh token for the customer. */
  async revokeSessions(customerId: string, actorUserId: string) {
    const user = await userRepository.findById(customerId);
    if (!user) throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    await refreshTokenRepository.revokeAllForUser(customerId);
    await auditLogService.log({
      userId: actorUserId,
      action: 'platform.sessions_revoked',
      entityType: 'user',
      entityId: customerId,
      metadata: { customerEmail: user.email }
    });
    return { id: customerId, sessionsRevoked: true };
  },

  /** Send the standard password-reset flow for a customer (no secret returned). */
  async sendPasswordReset(customerId: string, actorUserId: string) {
    const user = await userRepository.findById(customerId);
    if (!user) throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    await passwordResetService.request(user.email);
    await auditLogService.log({
      userId: actorUserId,
      action: 'platform.password_reset_sent',
      entityType: 'user',
      entityId: customerId,
      metadata: { customerEmail: user.email }
    });
    return { id: customerId, resetRequested: true };
  },

  /** Workspace operational detail (cross-workspace visibility = platform role only). */
  async workspaceDetail(workspaceId: string) {
    const wsRes = await query(`SELECT id, name, owner_user_id, created_at FROM workspaces WHERE id = $1`, [workspaceId]);
    const workspace = wsRes.rows[0];
    if (!workspace) throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');

    const [membersRes, subRes, statsRes, ownerRes] = await Promise.all([
      query(
        `SELECT wu.role, wu.created_at AS joined_at, u.id AS user_id, u.email, u.full_name, u.status
         FROM workspace_users wu JOIN users u ON u.id = wu.user_id
         WHERE wu.workspace_id = $1 ORDER BY wu.created_at ASC`,
        [workspaceId]
      ),
      query(
        `SELECT plan_code, status, trial_start, trial_end, current_period_start, current_period_end
         FROM subscriptions WHERE workspace_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [workspaceId]
      ),
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM customers c WHERE c.workspace_id = $1 AND c.deleted_at IS NULL) AS customers,
           (SELECT COUNT(*)::int FROM orders o WHERE o.workspace_id = $1 AND o.deleted_at IS NULL) AS orders,
           (SELECT COUNT(*)::int FROM usage_events ue WHERE ue.workspace_id = $1 AND ue.occurred_at > NOW() - INTERVAL '30 days') AS usage_30d,
           (SELECT COUNT(*)::int FROM usage_events ue WHERE ue.workspace_id = $1 AND ue.event_name = 'api_request' AND ue.occurred_at > NOW() - INTERVAL '30 days') AS api_requests_30d,
           (SELECT COUNT(*)::int FROM api_keys k WHERE k.workspace_id = $1) AS api_keys,
           (SELECT COUNT(*)::int FROM webhook_endpoints we WHERE we.workspace_id = $1) AS webhook_endpoints,
           (SELECT COUNT(*)::int FROM error_records er WHERE er.workspace_id = $1 AND er.occurred_at > NOW() - INTERVAL '7 days') AS errors_7d`,
        [workspaceId]
      ),
      query(`SELECT id, email, full_name, status FROM users WHERE id = $1`, [workspace.owner_user_id])
    ]);

    return {
      workspace,
      owner: ownerRes.rows[0] ?? null,
      members: membersRes.rows,
      subscription: subRes.rows[0] ?? null,
      stats: statsRes.rows[0] ?? null
    };
  },

  /**
   * Grant/change a platform operator role. Owner-level action; an operator
   * cannot change their own role (prevents accidental self-lockout).
   */
  async setOperatorRole(email: string, role: string, actorUserId: string) {
    if (!PLATFORM_ROLES.includes(role as PlatformRole)) {
      throw new ApiError(400, 'INVALID_PLATFORM_ROLE', `Role must be one of: ${PLATFORM_ROLES.join(', ')}`);
    }
    const user = await userRepository.findByEmailLower(email);
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'No user with that email');
    if (user.id === actorUserId) {
      throw new ApiError(400, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own platform role');
    }
    await query(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, [role, user.id]);
    await auditLogService.log({
      userId: actorUserId,
      action: 'platform.operator_role_changed',
      entityType: 'user',
      entityId: user.id,
      metadata: { targetEmail: user.email, role }
    });
    return { id: user.id, email: user.email, role };
  }
};
