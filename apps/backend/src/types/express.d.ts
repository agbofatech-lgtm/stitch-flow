import 'express';

declare global {
  namespace Express {
    interface UserJwtPayload {
      sub: string;
      email?: string;
      role?: string;
    }

    interface Request {
      user?: UserJwtPayload;
    }
  }
}

export {};
