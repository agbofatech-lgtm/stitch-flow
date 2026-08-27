import 'express';

declare global {
  namespace Express {
    interface UserJwtPayload {
      sub: string;
      email: string;
      role: 'user' | 'admin';
      workspaceId?: string | null;
      tenantUserId?: string;
    }

    interface Request {
      user?: UserJwtPayload;
      /** Set by requireWorkspace after membership verification. */
      workspaceId?: string;
      /** Workspace-level role of the authenticated user. */
      workspaceRole?: 'owner' | 'admin' | 'assistant';
      /** Raw request body captured for webhook signature verification (Phase 5). */
      rawBody?: Buffer;
      /** Correlation id (Phase 6) — set by requestCorrelation middleware. */
      id?: string;
    }
  }
}

export {};
