import type { AccessDecision } from './commercial/types';

/** Entitlement port — P19.4 implements server-side can(capability). */
export type EntitlementPort = {
  decideAccess(tenantId: string, capability: string): AccessDecision;
};
