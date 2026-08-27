import { Router } from 'express';
import { query } from '../config/db';
import { ApiError } from '../utils/apiError';
import { auditLogService } from '../services/auditLogService';
import { timelineService } from '../services/timelineService';

/**
 * Phase 7 — CRM foundation: structured notes, extensible preferences,
 * derived segments, customer timeline. All endpoints are authenticated +
 * workspace-scoped by app.ts mounting (authMiddleware + requireWorkspace).
 */
export const crmRoutes = Router();

const NOTE_CATEGORIES = new Set([
  'GENERAL', 'MEASUREMENT', 'FIT', 'STYLE', 'COMMUNICATION', 'ORDER', 'FITTING', 'SERVICE',
]);

// ---------- Notes ----------
crmRoutes.post('/notes', async (req, res) => {
  try {
    const { customerId, note, category = 'GENERAL', visibility = 'staff' } = req.body ?? {};
    if (!customerId || !note?.trim()) {
      return res.status(400).json({ message: 'customerId and note are required' });
    }
    if (!NOTE_CATEGORIES.has(category)) {
      return res.status(400).json({ message: `category must be one of ${[...NOTE_CATEGORIES].join(', ')}` });
    }
    if (!['staff', 'all'].includes(visibility)) {
      return res.status(400).json({ message: 'visibility must be staff|all' });
    }
    const owner = await query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [customerId, req.workspaceId]
    );
    if (owner.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await query(
      `INSERT INTO customer_notes (id, workspace_id, customer_id, author_user_id, category, note, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.workspaceId, customerId, req.user!.sub, category, note.trim(), visibility]
    );
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'CUSTOMER_NOTE_CREATED',
      entityType: 'customer_note',
      entityId: id,
      metadata: { customerId, category },
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create note:', err);
    res.status(500).json({ message: 'Failed to create note' });
  }
});

crmRoutes.get('/notes/:customerId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM customer_notes
       WHERE workspace_id = $1 AND customer_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 200`,
      [req.workspaceId, req.params.customerId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list notes' });
  }
});

crmRoutes.delete('/notes/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE customer_notes SET deleted_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL RETURNING id, customer_id`,
      [req.params.id, req.workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Note not found' });
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'CUSTOMER_NOTE_DELETED',
      entityType: 'customer_note',
      entityId: req.params.id,
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to delete note' });
  }
});

// ---------- Preferences ----------
crmRoutes.get('/preferences/:customerId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM customer_preferences WHERE workspace_id = $1 AND customer_id = $2`,
      [req.workspaceId, req.params.customerId]
    );
    // Default (all-false consent) rather than 404: absence = no consent.
    res.json(result.rows[0] ?? { customerId: req.params.customerId, marketingConsent: false });
  } catch {
    res.status(500).json({ message: 'Failed to load preferences' });
  }
});

crmRoutes.put('/preferences/:customerId', async (req, res) => {
  try {
    const {
      preferredLanguage = null,
      preferredContactMethod = null,
      preferredAppointmentTimes = null,
      stylePreferences = {},
      communicationPreferences = {},
      marketingConsent = false,
    } = req.body ?? {};
    if (preferredContactMethod && !['phone', 'email', 'whatsapp', 'sms', 'none'].includes(preferredContactMethod)) {
      return res.status(400).json({ message: 'invalid preferredContactMethod' });
    }
    const owner = await query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.customerId, req.workspaceId]
    );
    if (owner.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await query(
      `INSERT INTO customer_preferences
         (id, workspace_id, customer_id, preferred_language, preferred_contact_method,
          preferred_appointment_times, style_preferences, communication_preferences,
          marketing_consent, marketing_consent_at, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11)
       ON CONFLICT (workspace_id, customer_id) DO UPDATE SET
         preferred_language = EXCLUDED.preferred_language,
         preferred_contact_method = EXCLUDED.preferred_contact_method,
         preferred_appointment_times = EXCLUDED.preferred_appointment_times,
         style_preferences = EXCLUDED.style_preferences,
         communication_preferences = EXCLUDED.communication_preferences,
         marketing_consent = EXCLUDED.marketing_consent,
         marketing_consent_at = CASE WHEN EXCLUDED.marketing_consent THEN NOW() ELSE NULL END,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [
        id, req.workspaceId, req.params.customerId, preferredLanguage, preferredContactMethod,
        preferredAppointmentTimes, JSON.stringify(stylePreferences), JSON.stringify(communicationPreferences),
        Boolean(marketingConsent), Boolean(marketingConsent) ? new Date().toISOString() : null, req.user!.sub,
      ]
    );
    await auditLogService.log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId,
      action: 'CUSTOMER_PREFERENCES_UPDATED',
      entityType: 'customer_preferences',
      entityId: req.params.customerId,
      metadata: { marketingConsent: Boolean(marketingConsent) },
    });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to save preferences:', err);
    res.status(500).json({ message: 'Failed to save preferences' });
  }
});

// ---------- Timeline ----------
crmRoutes.get('/timeline/:customerId', async (req, res) => {
  try {
    const entries = await timelineService.list(
      req.workspaceId!,
      req.params.customerId,
      Number(req.query.limit) || 100,
      (req.query.before as string) || undefined
    );
    res.json({ entries });
  } catch {
    res.status(500).json({ message: 'Failed to load timeline' });
  }
});

// ---------- Segments (derived — never stored; Step 11) ----------
crmRoutes.get('/segments', async (req, res) => {
  try {
    const result = await query(
      `WITH ord AS (
         SELECT customer_id,
                COUNT(*)::int AS order_count,
                MAX(created_at) AS last_order_at
         FROM orders WHERE workspace_id = $1 AND deleted_at IS NULL GROUP BY customer_id
       ),
       pay AS (
         SELECT p.customer_id, SUM(p.amount) AS total_paid, MAX(p.paid_at) AS last_payment_at
         FROM payments p WHERE p.workspace_id = $1 GROUP BY p.customer_id
       ),
       appt AS (
         SELECT customer_id, MIN(start_at) AS next_appointment
         FROM appointments
         WHERE workspace_id = $1 AND status IN ('SCHEDULED','CONFIRMED','RESCHEDULED')
           AND start_at >= NOW()
         GROUP BY customer_id
       ),
       fit AS (
         SELECT DISTINCT customer_id FROM fittings
         WHERE workspace_id = $1 AND status IN ('PENDING','IN_FITTING','ALTERATIONS_REQUIRED')
       )
       SELECT c.id, c.full_name,
         (c.created_at > NOW() - INTERVAL '14 days') AS seg_new,
         COALESCE(o.order_count, 0) >= 2 AS seg_repeat,
         (o.last_order_at > NOW() - INTERVAL '30 days') AS seg_active,
         (o.last_order_at < NOW() - INTERVAL '45 days' AND o.order_count >= 1) AS seg_at_risk,
         (COALESCE(p.total_paid, 0) >= 500) AS seg_high_value,
         (COALESCE(p.total_paid, 0) >= 1000) AS seg_vip,
         (p.last_payment_at > NOW() - INTERVAL '14 days') AS seg_recent_purchase,
         (c.created_at < NOW() - INTERVAL '90 days' AND (o.last_order_at IS NULL OR o.last_order_at < NOW() - INTERVAL '90 days')) AS seg_inactive,
         (a.next_appointment IS NOT NULL AND a.next_appointment < NOW() + INTERVAL '7 days') AS seg_appointment_due,
         (f.customer_id IS NOT NULL) AS seg_fitting_due
       FROM customers c
       LEFT JOIN ord o ON o.customer_id = c.id
       LEFT JOIN pay p ON p.customer_id = c.id
       LEFT JOIN appt a ON a.customer_id = c.id
       LEFT JOIN fit f ON f.customer_id = c.id
       WHERE c.workspace_id = $1 AND c.deleted_at IS NULL`,
      [req.workspaceId]
    );
    // Thresholds documented in PHASE7_CRM.md (repeat≥2 orders, high-value≥GHS500,
    // vip≥GHS1000, risk=45d, inactive=90d, new=14d, recent=14d, due=7d).
    res.json({
      thresholds: {
        highValueGhs: 500, vipGhs: 1000, newDays: 14, activeDays: 30,
        atRiskDays: 45, inactiveDays: 90, recentPurchaseDays: 14, appointmentDueDays: 7,
      },
      customers: result.rows,
    });
  } catch (err) {
    console.error('Failed to compute segments:', err);
    res.status(500).json({ message: 'Failed to compute segments' });
  }
});
