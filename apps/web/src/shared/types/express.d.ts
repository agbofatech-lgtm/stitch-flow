import 'express';

declare global {
  namespace Express {
    interface UserJwtPayload {
      sub: string;
      role: 'user' | 'admin';
      email: string;
      tenantUserId?: string;
    }

    interface Request {
      user?: UserJwtPayload;
    }
  }
}
