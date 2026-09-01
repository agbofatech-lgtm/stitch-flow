export type PlanCode = string;

export type CapabilityCode = string;

export type PlanDefinition = {
  code: PlanCode;
  displayName: string;
  capabilities: CapabilityCode[];
  limits: Record<string, number | null>;
  classification: 'legacy-seed';
};

export type PriceDefinition = {
  id: string;
  planCode: PlanCode;
  currency: 'GHS' | 'USD' | 'NGN' | 'GBP';
  interval: 'month' | 'year';
  /** null = amount not commercially set (simulation numbers are not law). */
  amountMinor: number | null;
  classification: 'simulation-not-law';
};

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaymentStatus =
  | 'CHECKOUT_CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED';

export type EntitlementSource = 'SUBSCRIPTION';

export type Entitlement = {
  capability: CapabilityCode;
  granted: boolean;
  limit?: number | null;
  source: EntitlementSource;
  status: 'ACTIVE' | 'INACTIVE';
  planCode?: PlanCode;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
};

export type Subscription = {
  id: string;
  tenantId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  priceId: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  expiresAt?: string | null;
  cancelledAt?: string | null;
};

export type SaasPayment = {
  id: string;
  tenantId: string;
  checkoutId: string;
  planCode: PlanCode;
  status: PaymentStatus;
  adapter: 'test';
  createdAt: string;
  updatedAt: string;
};

export type ProcessedBillingEvent = {
  eventId: string;
  tenantId: string;
  paymentId: string;
  type: string;
  processedAt: string;
};

export type CommercialAudit = {
  id: string;
  tenantId: string;
  actorId: string | null;
  eventId: string | null;
  source: string;
  previousState: string;
  newState: string;
  timestamp: string;
};

export type AccessDecision = {
  capability: CapabilityCode;
  allowed: boolean;
  entitled: boolean;
  reason: string;
  planCode?: PlanCode | null;
  subscriptionStatus?: SubscriptionStatus | null;
};
