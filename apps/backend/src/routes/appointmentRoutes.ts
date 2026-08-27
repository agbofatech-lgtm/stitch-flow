import { Router } from 'express';
import { query, pool } from '../config/db';
import { auditLogService } from '../services/auditLogService';
import { timelineService } from '../services/timelineService';
import { outboxService } from '../services/platformServices';
import { recordSyncChange, recordSyncChangeTx } from '../services/syncChangeLog';

/**
 * Phase 7 — appointments + fittings + fit observations.
 * Idempotent creation (clientMutationId), overlap detection for the same
 * staff member, tenant-scoped throughout. Extensible types via CHECK list
 * (migration 013) — new types are a migration away, not a code change.
 */
export const appointmentRoutes = Router();

const APPOINTMENT_TYPES = new Set([
  'CONSULTATION', 'MEASUREMENT', 'FITTING', 'PICKUP', 'DELIVERY', 'ALTERATION', 'OTHER',
]);
const STATUS_FLOW: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
  CONFIRMED: ['RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

appointmentRoutes.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customerId,
      assignedMemberId = null,
      appointmentType = 'OTHER',
      startAt,
      endAt,
      location = null,
      notes = null,
      clientMutationId = null,
    } = req.body ?? {};

    if (!customerId || !startAt || !endAt) {
      client.release();
      return res.status(400).json({ message: 'customerId, startAt and endAt are required' });
    }
    if (!APPOINTMENT_TYPES.has(appointmentType)) {
      client.release();
      return res.status(400).json({ message: 'Invalid appointment type' });
    }
    if (new Date(endAt) <= new Date(startAt)) {
      client.release();
      return res.status(400).json({ message: 'endAt must be after startAt' });
    }

    await client.query('BEGIN');

    const owner = await client.query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [customerId, req.workspaceId]
    );
    if (owner.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (clientMutationId) {
      const existing = await client.query(
        `SELECT * FROM appointments WHERE workspace_id = $1 AND client_mutation_id = $2`,
        [req.workspaceId, clientMutationId]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(200).json({ ...existing.rows[0], duplicate: true });
      }
    }

    // Conflict detection: same staff member, overlapping time, live statuses.
    if (assignedMemberId) {
      const clash = await client.query(
        `SELECT id FROM appointments
         WHERE workspace_id = $1 AND assigned_member_id = $2
           AND status IN ('SCHEDULED','CONFIRMED','RESCHEDULED')
           AND tstzrange(start_at, end_at) && tstzrange($3::timestamptz, $4::timestamptz)
         LIMIT 1`,
        [req.workspaceId, assignedMemberId, startAt, endAt]
      );
      if (clash.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({
          error: { code: 'APPOINTMENT_CONFLICT', message: 'Staff member already has an appointment in this time window' },
        });
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await client.query(
      `INSERT INTO appointments
         (id, workspace_id, customer_id, assigned_member_id, appointment_type, start_at, end_at, location, notes, client_mutation_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, req.workspaceId, customerId, assignedMemberId, appointmentType, startAt, endAt, location, notes, clientMutationId, req.user!.sub]
    );
    await recordSyncChangeTx(client, {
      workspaceId: req.workspaceId!, userId: req.user!.sub,
      entity: 'appointments', entityId: id, operation: 'insert',
      payload: { id, customerId, appointmentType, startAt, endAt, status: 'SCHEDULED' },
      clientMutationId,
    });
    await auditLogService.logTx(client, {
      userId: req.user!.sub, workspaceId: req.workspaceId,
      action: 'APPOINTMENT_CREATED', entityType: 'appointment', entityId: id,
      metadata: { customerId, appointmentType, startAt },
    });
    await client.query('COMMIT');
    client.release();

    void timelineService.record({
      workspaceId: req.workspaceId!, customerId,
      eventType: 'APPOINTMENT_CREATED', actorUserId: req.user!.sub,
      entityType: 'appointment', entityId: id, metadata: { appointmentType },
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    console.error('Failed to create appointment:', err);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

appointmentRoutes.get('/', async (req, res) => {
  try {
    const { from, to, customerId, status } = req.query;
    const result = await query(
      `SELECT * FROM appointments
       WHERE workspace_id = $1 AND deleted_at IS NULL
         AND ($2::timestamptz IS NULL OR start_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR start_at <  $3::timestamptz)
         AND ($4::text IS NULL OR customer_id = $4)
         AND ($5::text IS NULL OR status = $5)
       ORDER BY start_at ASC LIMIT 500`,
      [req.workspaceId, (from as string) ?? null, (to as string) ?? null, (customerId as string) ?? null, (status as string) ?? null]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list appointments' });
  }
});

appointmentRoutes.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM appointments WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Appointment not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: 'Failed to load appointment' });
  }
});

// Transition (confirm/complete/cancel/no-show) or reschedule (new start/end).
appointmentRoutes.patch('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { status = null, startAt = null, endAt = null, notes = null } = req.body ?? {};
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT * FROM appointments WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id, req.workspaceId]
    );
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Appointment not found' });
    }
    const appt = current.rows[0];
    let newStatus = appt.status as string;
    let rescheduled = false;

    if (startAt || endAt) {
      const s = startAt ?? appt.start_at;
      const e = endAt ?? appt.end_at;
      if (new Date(e) <= new Date(s)) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ message: 'endAt must be after startAt' });
      }
      if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status)) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ message: `Cannot reschedule a ${appt.status} appointment` });
      }
      rescheduled = true;
      newStatus = 'RESCHEDULED';
    }

    if (status && status !== appt.status) {
      if (!STATUS_FLOW[appt.status]?.includes(status)) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({
          error: { code: 'INVALID_APPOINTMENT_STATE', message: `Cannot transition from ${appt.status} to ${status}` },
        });
      }
      newStatus = status;
    }

    const result = await client.query(
      `UPDATE appointments
       SET start_at = COALESCE($3::timestamptz, start_at),
           end_at = COALESCE($4::timestamptz, end_at),
           status = $5, notes = COALESCE($6, notes), updated_by = $7, updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 RETURNING *`,
      [req.params.id, req.workspaceId, startAt, endAt, newStatus, notes, req.user!.sub]
    );
    await auditLogService.logTx(client, {
      userId: req.user!.sub, workspaceId: req.workspaceId,
      action: rescheduled ? 'APPOINTMENT_RESCHEDULED' : 'APPOINTMENT_STATUS_CHANGED',
      entityType: 'appointment', entityId: req.params.id,
      metadata: { from: appt.status, to: newStatus },
    });
    await client.query('COMMIT');
    client.release();

    const timelineEvent =
      newStatus === 'COMPLETED' ? 'APPOINTMENT_COMPLETED'
      : rescheduled ? 'APPOINTMENT_RESCHEDULED'
      : null;
    if (timelineEvent === 'APPOINTMENT_COMPLETED') {
      void outboxService.record({ workspaceId: req.workspaceId!, eventType: 'APPOINTMENT_COMPLETED', entityType: 'appointment', entityId: req.params.id, payload: { completedAt: new Date().toISOString() } }).catch(() => undefined);
    }
    if (timelineEvent) {
      void timelineService.record({
        workspaceId: req.workspaceId!, customerId: appt.customer_id,
        eventType: timelineEvent, actorUserId: req.user!.sub,
        entityType: 'appointment', entityId: req.params.id,
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    console.error('Failed to update appointment:', err);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

// ================= Fittings =================
appointmentRoutes.post('/fittings', async (req, res) => {
  try {
    const {
      customerId, orderId = null, appointmentId = null, assignedMemberId = null,
    } = req.body ?? {};
    if (!customerId) return res.status(400).json({ message: 'customerId is required' });

    const owner = await query(
      `SELECT id FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [customerId, req.workspaceId]
    );
    if (owner.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    if (orderId) {
      const ord = await query(
        `SELECT id FROM orders WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
        [orderId, req.workspaceId]
      );
      if (ord.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await query(
      `INSERT INTO fittings (id, workspace_id, appointment_id, order_id, customer_id, assigned_member_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.workspaceId, appointmentId, orderId, customerId, assignedMemberId]
    );
    await recordSyncChange({
      workspaceId: req.workspaceId!, userId: req.user!.sub,
      entity: 'fittings', entityId: id, operation: 'insert',
      payload: { id, customerId, orderId, status: 'PENDING' },
    });
    await auditLogService.log({
      userId: req.user!.sub, workspaceId: req.workspaceId,
      action: 'FITTING_CREATED', entityType: 'fitting', entityId: id,
      metadata: { customerId, orderId },
    });
    void timelineService.record({
      workspaceId: req.workspaceId!, customerId,
      eventType: 'FITTING_CREATED', actorUserId: req.user!.sub,
      entityType: 'fitting', entityId: id,
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create fitting:', err);
    res.status(500).json({ message: 'Failed to create fitting' });
  }
});

appointmentRoutes.get('/fittings', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM fittings
       WHERE workspace_id = $1 AND deleted_at IS NULL
         AND ($2::text IS NULL OR customer_id = $2)
         AND ($3::text IS NULL OR status = $3)
       ORDER BY created_at DESC LIMIT 300`,
      [req.workspaceId, (req.query.customerId as string) ?? null, (req.query.status as string) ?? null]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list fittings' });
  }
});

const FITTING_FLOW: Record<string, string[]> = {
  PENDING: ['IN_FITTING', 'READY'],
  IN_FITTING: ['ALTERATIONS_REQUIRED', 'READY'],
  ALTERATIONS_REQUIRED: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
};

appointmentRoutes.patch('/fittings/:id/status', async (req, res) => {
  try {
    const { status, alterationsNotes = null } = req.body ?? {};
    if (!status) return res.status(400).json({ message: 'status is required' });
    const current = await query(
      `SELECT * FROM fittings WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.workspaceId]
    );
    if (current.rows.length === 0) return res.status(404).json({ message: 'Fitting not found' });
    const from = current.rows[0].status as string;
    if (!FITTING_FLOW[from]?.includes(status)) {
      return res.status(409).json({
        error: { code: 'INVALID_FITTING_STATE', message: `Cannot transition fitting from ${from} to ${status}` },
      });
    }
    const result = await query(
      `UPDATE fittings
       SET status = $3,
           alterations_required = $4,
           alterations_notes = COALESCE($5, alterations_notes),
           completed_at = CASE WHEN $3 = 'COMPLETED' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 RETURNING *`,
      [req.params.id, req.workspaceId, status, status === 'ALTERATIONS_REQUIRED', alterationsNotes]
    );
    await auditLogService.log({
      userId: req.user!.sub, workspaceId: req.workspaceId,
      action: 'FITTING_STATUS_CHANGED', entityType: 'fitting', entityId: req.params.id,
      metadata: { from, to: status },
    });
    if (status === 'COMPLETED') {
      void timelineService.record({
        workspaceId: req.workspaceId!, customerId: current.rows[0].customer_id,
        eventType: 'FITTING_COMPLETED', actorUserId: req.user!.sub,
        entityType: 'fitting', entityId: req.params.id,
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update fitting:', err);
    res.status(500).json({ message: 'Failed to update fitting' });
  }
});

const OBSERVATION_CODES = new Set([
  'tight_chest', 'loose_waist', 'short_sleeve', 'long_sleeve', 'shoulder_issue',
  'collar_issue', 'trouser_length', 'seat_issue', 'rise_issue', 'other',
]);

// Structured fit observations (observed business data, not AI predictions).
appointmentRoutes.post('/fittings/:id/observations', async (req, res) => {
  try {
    const { observationCode, severity = 'minor', note = null } = req.body ?? {};
    if (!observationCode || !OBSERVATION_CODES.has(observationCode)) {
      return res.status(400).json({ message: 'Invalid observationCode' });
    }
    if (!['minor', 'moderate', 'major'].includes(severity)) {
      return res.status(400).json({ message: 'severity must be minor|moderate|major' });
    }
    const fitting = await query(
      `SELECT id FROM fittings WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.workspaceId]
    );
    if (fitting.rows.length === 0) return res.status(404).json({ message: 'Fitting not found' });

    const result = await query(
      `INSERT INTO fit_observations (workspace_id, fitting_id, observation_code, severity, note, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.workspaceId, req.params.id, observationCode, severity, note, req.user!.sub]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to record observation:', err);
    res.status(500).json({ message: 'Failed to record observation' });
  }
});

appointmentRoutes.get('/fittings/:id/observations', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM fit_observations WHERE workspace_id = $1 AND fitting_id = $2 ORDER BY created_at DESC`,
      [req.workspaceId, req.params.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to list observations' });
  }
});
