/**
 * Entitlement port — interface preparation only (STOP-P19-IDENTITY-L).
 * This slice does NOT evaluate plans, prices, or subscriptions.
 */
export type EntitlementPort = {
  /**
   * Future: tenant-scoped capability grant.
   * Must not be called as authorization in P19.2/P19.3.
   */
  isEntitled?(tenantId: string, capability: string): Promise<boolean>;
};

export const entitlementPortDeferred: EntitlementPort = {};
