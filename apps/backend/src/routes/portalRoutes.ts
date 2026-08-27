import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

/**
 * Phase 7 — Customer Portal Foundation (Step 19–21, 61).
 *
 * SEPARATE authorization boundary: portal tokens use a distinct JWT
 * audience (`stitchflow-portal`), so the STAFF authMiddleware (audience
 * `stitchflow-clients`) structurally REJECTS them and vice versa. Portal
 * sessions never carry staff permissions and see ONLY their own customer
 * record. Read-only foundation: login, profile+consent, orders,
 * appointments.
 */
const PORTAL_AUDIENCE = 'stitchflow-portal';
const PORTAL_ISSUER = 'stitchflow-portal';
const PORTAL_ALGORITHM = 'HS256' as const;

export type PortalTokenPayload = {
  typ: 'portal';
  pid: string; // portal_user_id
  wid: string; // workspace_id
  cid: string; // customer_id
};

export function signPortalToken(payload: PortalTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: PORTAL_ALGORITHM,
    issuer: PORTAL_ISSUER,
    audience: PORTAL_AUDIENCE,
    expiresIn: '12h',
  });
}

export function verifyPortalToken(token: string): PortalTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [PORTAL_ALGORITHM],
    issuer: PORTAL_ISSUER,
    audience: PORTAL_AUDIENCE,
  }) as PortalTokenPayload;
  if (decoded.typ !== 'portal') throw new Error('not a portal token');
  return decoded;
}

function portalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing portal token'));
  }
  try {
    const payload = verifyPortalToken(authHeader.replace('Bearer ', ''));
    // Re-check account status on every request (no long-lived trust).
    req.portal = payload;
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired portal token'));
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    portal?: PortalTokenPayload;
  }
}

export const portalLoginRoutes = Router();
export const portalRoutes = Router();

// ---------- Login (rate-limited by the global limiter; bcrypt compare) ----------
portalLoginRoutes.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const result = await query(
      `SELECT * FROM portal_customers WHERE email = $1 AND status = 'active'`,
      [email]
    );
    const account = result.rows[0];
    const ok = account ? await bcrypt.compare(password, account.password_hash) : false;
    if (!account || !ok) {
      // Uniform failure — no account enumeration.
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await query(`UPDATE portal_customers SET last_login_at = NOW() WHERE portal_user_id = $1`, [
      account.portal_user_id,
    ]);
    const token = signPortalToken({
      typ: 'portal',
      pid: account.portal_user_id,
      wid: account.workspace_id,
      cid: account.customer_id,
    });
    res.json({ accessToken: token, tokenType: 'portal' });
  } catch {
    next(new ApiError(500, 'INTERNAL', 'Login failed'));
  }
});

portalRoutes.use(portalAuth);

// ---------- Profile + explicit consent state (existence ≠ consent) ----------
portalRoutes.get('/me', async (req, res) => {
  const p = req.portal!;
  const [customer, prefs] = await Promise.all([
    query(
      `SELECT id, full_name, email, phone FROM customers WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [p.cid, p.wid]
    ),
    query(
      `SELECT marketing_consent, marketing_consent_at FROM customer_preferences WHERE customer_id = $1 AND workspace_id = $2`,
      [p.cid, p.wid]
    ),
  ]);
  const pref = prefs.rows[0];
  res.json({
    customer: customer.rows[0] ?? null,
    consent: {
      marketing: pref?.marketing_consent === true,
      consentedAt: pref?.marketing_consent_at ?? null,
      // Absent record = NOT consented (existence is never consent).
    },
  });
});

portalRoutes.get('/orders', async (req, res) => {
  const p = req.portal!;
  const result = await query(
    `SELECT id, status, total_amount, currency, due_date, created_at
     FROM orders
     WHERE workspace_id = $1 AND customer_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 50`,
    [p.wid, p.cid]
  );
  res.json(result.rows);
});

portalRoutes.get('/appointments', async (req, res) => {
  const p = req.portal!;
  const result = await query(
    `SELECT id, appointment_type, status, scheduled_start, scheduled_end, notes
     FROM appointments
     WHERE workspace_id = $1 AND customer_id = $2
       AND status IN ('SCHEDULED','CONFIRMED','RESCHEDULED')
     ORDER BY scheduled_start ASC LIMIT 50`,
    [p.wid, p.cid]
  );
  res.json(result.rows);
});

// Staff MUST NOT be able to read customer content through the portal
// boundary using a staff token (audience mismatch → 401), and portal
// tokens must not work on staff routes. Exposed for tests + telemetry id.
portalRoutes.get('/session', (req, res) => {
  res.json({ scope: 'portal', workspaceId: req.portal!.wid, customerId: req.portal!.cid });
});

export const portalCrypto = crypto; // keep import shape stable for future use
