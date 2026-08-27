import { Router } from 'express';
import { query, pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { auditLogService } from '../services/auditLogService';
import { timelineService } from '../services/timelineService';
import { recordSyncChange } from '../services/syncChangeLog';

/**
 * Phase 7 — referral engine. Provider-neutral foundation: attribution is
 * tenant-isolated, idempotent (clientMutationId + code uniqueness) and
 * auditable; timestamps record the state history. Financial rewards are a
 * FUTURE capability (status REWARDED exists; no reward logic here).
 */
export const referralRoutes = Router();

const TRANSITIONS: Record<string, string[]> = {
  CREATED: ['INVITED', 'REGISTERED', 'CANCELLED'],
  INVITED: ['REGISTERED', 'CANCELLED'],
  REGISTERED: ['CONVERTED', 'CANCELLED'],
  CONVERTED: ['REWARDED', 'CANCELLED'],
  REWARDED: [],
  CANCELLED: [],
};

const EVENT_FOR: Record<string, string> = {
  REGISTERED: 'registered_at',
  CONVERTED: 'converted_at',
  REWARDED: 'rewarded_at',
  CANCELLED: 'cancelled_at',
  INVITED: 'invited_at',
};

function makeCode() {
  return `SF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

referralRoutes.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      referrerCustomerId,
      referredCustomerId = null,
      referralCode = makeCode(),
      clientMutationId = null,
    } = req.body ?? {};
    if (!referrerCustomerId) {
      return res.status(400).json({ message: 'referrerCustomerId is required' });
    }

    await client.query('BEGIN');

    // Tenant guard: referrer (and referred, if supplied) must belong to THIS workspace.
    const referrer = await client.query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [referrerCustomerId, req.workspaceId]
    );
    if (referrer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Referrer customer not found' });
    }
    if (referredCustomerId) {
      const referred = await client.query(
        `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
        [referredCustomerId, req.workspaceId]
      );
      if (referred.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Referred customer not found in this workspace' });
      }
    }

    // Idempotency: replayed clientMutationId returns the original referral.
    if (clientMutationId) {
      const existing = await client.query(
        `SELECT * FROM referrals WHERE workspace_id = $1 AND client_mutation_id = $2`,
        [req.workspaceId, clientMutationId]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(200).json({ ...existing.rows[0], duplicate: true });
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await client.query(
      `INSERT INTO referrals (id, workspace_id, referrer_customer_id, referred_customer_id, referral_code, client_mutation_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.workspaceId, referrerCustomerId, referredCustomerId, referralCode, clientMutationId]
    );
    await recordSyncChange({
      workspaceId: req.workspaceId!, userId: req.user!.sub,
      entity: 'referrals', entityId: id, operation: 'insert',
      payload: { id, referrerCustomerId, referredCustomerId, referralCode, status: 'CREATED' },
      clientMutationId,
    });
    await auditLogService.logTx(client, {
      userId: req.user!.sub, workspaceId: req.workspaceId,
      action: 'REFERRAL_CREATED', entityType: 'referral', entityId: id,
      metadata: { referralCode, referrerCustomerId },
    });
    await client.query('COMMIT');

    void timelineService.record({
      workspaceId: req.workspaceId!, customerId: referrerCustomerId,
      eventType: 'REFERRAL_CREATED', actorUserId: req.user!.sub,
      entityType: 'referral', entityId: id, metadata: { referralCode },
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (err instanceof ApiError) return next(err);
    console.error('Failed to create referral:', err);
    res.status(500).json({ message: 'Failed to create referral' });
  } finally {
    // ALWAYS release: a leaked client would starve the pool (and hang
    // graceful shutdown / pool.end()).
    client.release();
  }
});

referralRoutes.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const result = await query(
      `SELECT * FROM referrals
       WHERE workspace_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY created_at DESC LIMIT 200`,
      [req.workspaceId, status ?? null]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list referrals' });
  }
});

referralRoutes.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM referrals WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, req.workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Referral not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Failed to load referral' });
  }
});

// State transition: /register, /convert, /reward, /cancel, /invite
for (const target of ['invite', 'register', 'convert', 'reward', 'cancel'] as const) {
  const STATUS = ({ invite: 'INVITED', register: 'REGISTERED', convert: 'CONVERTED', reward: 'REWARDED', cancel: 'CANCELLED' } as const)[target];
  referralRoutes.post(`/:id/${target}`, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT * FROM referrals WHERE id = $1 AND workspace_id = $2 FOR UPDATE`,
        [req.params.id, req.workspaceId]
      );
      if (current.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Referral not found' });
      }
      const from = current.rows[0].status as string;
      if (!TRANSITIONS[from]?.includes(STATUS)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: {
            code: 'INVALID_REFERRAL_STATE',
            message: `Cannot transition referral from ${from} to ${STATUS}`,
          },
        });
      }
      const tsColumn = EVENT_FOR[STATUS];
      const result = await client.query(
        `UPDATE referrals SET status = $3, ${tsColumn} = NOW(), updated_at = NOW()
         WHERE id = $1 AND workspace_id = $2 RETURNING *`,
        [req.params.id, req.workspaceId, STATUS]
      );
      await auditLogService.logTx(client, {
        userId: req.user!.sub, workspaceId: req.workspaceId,
        action: 'REFERRAL_STATUS_CHANGED', entityType: 'referral', entityId: req.params.id,
        metadata: { from, to: STATUS },
      });
      await client.query('COMMIT');

      if (STATUS === 'CONVERTED' && current.rows[0].referrer_customer_id) {
        void timelineService.record({
          workspaceId: req.workspaceId!, customerId: current.rows[0].referrer_customer_id,
          eventType: 'REFERRAL_CONVERTED', actorUserId: req.user!.sub,
          entityType: 'referral', entityId: req.params.id,
        });
      }
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Failed to transition referral:', err);
      res.status(500).json({ message: 'Failed to transition referral' });
    } finally {
      client.release();
    }
  });
}
