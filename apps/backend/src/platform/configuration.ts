export type ConfigClassification =
  | 'AUTHORITATIVE'
  | 'TRANSITIONAL_DEFAULT'
  | 'UNKNOWN'
  | 'DEFERRED'
  | 'LEGACY';

export type ConfigEntry = {
  key: string;
  value: unknown;
  classification: ConfigClassification;
  description: string;
};

export type PlatformConfiguration = Record<string, ConfigEntry>;

export function defaultPlatformConfiguration(): PlatformConfiguration {
  return {
    'persistence.driver': {
      key: 'persistence.driver',
      value: 'memory',
      classification: 'TRANSITIONAL_DEFAULT',
      description: 'Runtime IAM/commercial store. Postgres schema exists but is not applied (DB not-verified).',
    },
    'billing.provider': {
      key: 'billing.provider',
      value: null,
      classification: 'DEFERRED',
      description: 'No live PSP. Test HMAC adapter only until P19.8.',
    },
    'subscription.cancelledAccess': {
      key: 'subscription.cancelledAccess',
      value: 'IMMEDIATE',
      classification: 'TRANSITIONAL_DEFAULT',
      description: 'Owner has not set period-end vs immediate. Runtime uses IMMEDIATE (no entitlements when CANCELLED).',
    },
    'subscription.pastDueAccess': {
      key: 'subscription.pastDueAccess',
      value: 'NONE',
      classification: 'TRANSITIONAL_DEFAULT',
      description: 'No grace period invented. PAST_DUE is not entitled.',
    },
    'offline.entitlementPolicy': {
      key: 'offline.entitlementPolicy',
      value: 'UNKNOWN',
      classification: 'UNKNOWN',
      description: 'No offline commercial grace. Product work must not corrupt trusted records if commercial is down.',
    },
    'pricing.amountsAuthoritative': {
      key: 'pricing.amountsAuthoritative',
      value: false,
      classification: 'AUTHORITATIVE',
      description: 'USD 29/79 and GHS 45/90 remain simulation. Control Center cannot promote them here.',
    },
    'featureGate.authority': {
      key: 'featureGate.authority',
      value: 'UX_ONLY',
      classification: 'AUTHORITATIVE',
      description: 'FeatureGate is not commercial law. Server can(capability) is.',
    },
    'disabledCapabilities': {
      key: 'disabledCapabilities',
      value: [] as string[],
      classification: 'TRANSITIONAL_DEFAULT',
      description: 'Operational kill-switch list. Empty by default.',
    },
  };
}

export const MUTABLE_CONTROL_KEYS = new Set(['disabledCapabilities']);
