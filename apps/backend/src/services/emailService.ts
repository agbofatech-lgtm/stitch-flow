import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Phase 9 — email delivery contract for account recovery.
 *
 * EXTERNAL DEPENDENCY (documented, not faked): production email delivery
 * requires an SMTP/ESP integration (EMAIL_TRANSPORT=smtp + SMTP_* settings).
 * That integration is intentionally NOT implemented in Phase 9 — this module
 * defines the secure contract every future transport must satisfy:
 *
 *   sendPasswordResetEmail({ to, resetLink }) → { delivered }
 *
 * Transports:
 *  - 'console' (default; development/test ONLY): writes the delivery payload
 *    to the server log so the flow can be exercised end-to-end locally. The
 *    reset link appears in server logs BY DESIGN in non-production only; in
 *    production this transport refuses to deliver (delivered:false) so a
 *    misconfigured deployment can never leak reset secrets into logs.
 *  - 'smtp': not yet implemented — selecting it without the integration
 *    yields delivered:false + an error log (fails safe, never throws to the
 *    caller; the endpoint response stays enumeration-proof either way).
 *
 * Secrets policy: transports receive the reset LINK (which embeds the secret)
 * and must treat it as a credential — never log it in production, never
 * persist it. The calling service stores only the sha256 hash of the secret.
 */

export type PasswordResetMail = {
  to: string;
  /** Absolute URL of the form {AUTH_PUBLIC_BASE_URL}/reset-password?token=… */
  resetLink: string;
};

export type EmailTransport = {
  readonly name: string;
  send(mail: PasswordResetMail): Promise<boolean>;
};

const consoleTransport: EmailTransport = {
  name: 'console',
  async send(mail) {
    if (env.NODE_ENV === 'production') {
      logger.error('email: console transport refused in production — configure SMTP');
      return false;
    }
    // Development/test only: full payload including link (see module docs).
    logger.info({ to: mail.to, resetLink: mail.resetLink }, 'email(console): password reset delivery');
    return true;
  }
};

const smtpTransport: EmailTransport = {
  name: 'smtp',
  async send() {
    // SMTP integration is a documented external dependency of a later phase.
    logger.error('email: SMTP transport selected but not implemented (Phase 9 scope) — delivery skipped');
    return false;
  }
};

let transportOverride: EmailTransport | null = null;

/** Test hook: capture deliveries in integration tests (mirrors billing's reset hook pattern). */
export function setEmailTransportForTests(transport: EmailTransport | null): void {
  transportOverride = transport;
}

function activeTransport(): EmailTransport {
  if (transportOverride) return transportOverride;
  return env.EMAIL_TRANSPORT === 'smtp' ? smtpTransport : consoleTransport;
}

export const emailService = {
  /**
   * Best-effort delivery. NEVER throws: the forgot-password endpoint must
   * return the same response whether or not the account/delivery exists
   * (account-existence is not revealed).
   */
  async sendPasswordResetEmail(mail: PasswordResetMail): Promise<{ delivered: boolean }> {
    try {
      const delivered = await activeTransport().send(mail);
      return { delivered };
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'email: transport failure');
      return { delivered: false };
    }
  }
};
