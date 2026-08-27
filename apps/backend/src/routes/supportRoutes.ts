import crypto from 'crypto';
import { Router } from 'express';
import { query } from '../config/db';
import { auditLogService } from '../services/auditLogService';

/**
 * Phase 7 — Customer Support (Step 40) + Feedback (Step 42), workspace-scoped.
 * Case creation is idempotent via clientMutationId (same sync semantics as
 * the business routes — no second sync engine).
 */
export const supportRoutes = Router();

const CASE_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'WAITING', 'RESOLVED', 'CLOSED'];

supportRoutes.post('/cases', async (req, res) => {
  const ws = req.workspaceId!;
  const clientMutationId = typeof req.body?.clientMutationId === 'string' ? req.body.clientMutationId : null;

  try {
    if (clientMutationId) {
      const dup = await query(
        `SELECT case_id FROM support_cases WHERE workspace_id = $1 AND client_mutation_id = $2`,
        [ws, clientMutationId]
      );
      if (dup.rows.length > 0) {
        return res.status(200).json({ duplicate: true, case: dup.rows[0].case_id });
      }
    }
    const caseId = `case-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const result = await query(
      `INSERT INTO support_cases (case_id, workspace_id, customer_id, reported_by, category, severity, description, client_mutation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        caseId, ws,
        typeof req.body?.customerId === 'string' && req.body.customerId ? req.body.customerId : null,
        req.user!.sub,
        ['BUG', 'SYNC', 'BILLING', 'ACCOUNT', 'ORDER', 'MEASUREMENT', 'FITTING', 'OTHER'].includes(req.body?.category) ? req.body.category : 'OTHER',
        ['low', 'normal', 'high', 'urgent'].includes(req.body?.severity) ? req.body.severity : 'normal',
        String(req.body?.description ?? '').slice(0, 4000) || '(no description)',
        clientMutationId,
      ]
    );
    void auditLogService.log({ workspaceId: ws, action: 'support_case.created', entityType: 'support_case', entityId: caseId, metadata: { category: result.rows[0].category } }).catch(() => undefined);
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Failed to create support case' });
  }
});

supportRoutes.get('/cases', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM support_cases WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.workspaceId!]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list support cases' });
  }
});

supportRoutes.patch('/cases/:id', async (req, res) => {
  try {
    const status = String(req.body?.status ?? '');
    if (!CASE_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const result = await query(
      `UPDATE support_cases SET status = $3, updated_at = NOW()
       WHERE case_id = $1 AND workspace_id = $2 RETURNING *`,
      [req.params.id, req.workspaceId!, status]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Case not found' });
    void auditLogService.log({ workspaceId: req.workspaceId, action: 'support_case.status_changed', entityType: 'support_case', entityId: req.params.id, metadata: { status } }).catch(() => undefined);
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Failed to update case' });
  }
});

supportRoutes.post('/feedback', async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be an integer 1..5' });
    }
    const result = await query(
      `INSERT INTO customer_feedback (workspace_id, customer_id, user_id, rating, category, feature, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING feedback_id, rating, created_at`,
      [
        req.workspaceId!,
        typeof req.body?.customerId === 'string' && req.body.customerId ? req.body.customerId : null,
        req.user!.sub, rating,
        typeof req.body?.category === 'string' ? req.body.category.slice(0, 64) : null,
        typeof req.body?.feature === 'string' ? req.body.feature.slice(0, 64) : null,
        typeof req.body?.message === 'string' ? req.body.message.slice(0, 2000) : null,
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Failed to record feedback' });
  }
});

supportRoutes.get('/feedback', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM customer_feedback WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.workspaceId!]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list feedback' });
  }
});
