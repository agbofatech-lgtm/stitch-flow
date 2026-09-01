import type { TrustedPlatformContext } from '../platform/types';

declare global {
  namespace Express {
    interface Request {
      platformIdentityId?: string;
      platformContext?: TrustedPlatformContext;
    }
  }
}

export {};
