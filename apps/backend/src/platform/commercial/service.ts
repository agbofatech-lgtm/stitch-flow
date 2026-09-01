import { newId, nowIso, type PlatformStore } from '../store';
import { PlatformError } from '../errors';
import { knownCapability, seedPlanCatalog, seedPriceCatalog } from './catalog';
import { verifyBillingSignature } from './webhook';
import type {
  AccessDecision,
  CommercialAudit,
  Entitlement,
  PlanDefinition,
  SaasPayment,
  Subscription,
} from './types';
import type { TrustedPlatformContext } from '../types';

export function seedCommercialCatalog(store: PlatformStore): void {
  if (store.plans.size > 0) return;
  for (const plan of seedPlanCatalog()) store.plans.set(plan.code, plan);
  for (const price of seedPriceCatalog()) store.prices.set(price.id, price);
}

function audit(store: PlatformStore, row: Omit<CommercialAudit, 'id' | 'timestamp'>): void {
  store.commercialAudit.push({
    id: newId(),
    timestamp: nowIso(),
    ...row,
  });
}

function subscriptionForTenant(store: PlatformStore, tenantId: string): Subscription | undefined {
  return [...store.subscriptions.values()].find((s) => s.tenantId === tenantId);
}

function effectiveStatus(sub: Subscription, now: Date): Subscription['status'] {
  if (sub.status === 'CANCELLED') return 'CANCELLED';
  if (sub.expiresAt && new Date(sub.expiresAt) <= now) return 'EXPIRED';
  return sub.status;
}

export function deriveEntitlements(
  store: PlatformStore,
  tenantId: string,
  now = new Date()
): Entitlement[] {
  const sub = subscriptionForTenant(store, tenantId);
  if (!sub) return [];
  const status = effectiveStatus(sub, now);
  if (status !== 'ACTIVE') return [];
  const plan = store.plans.get(sub.planCode);
  if (!plan) return [];
  return plan.capabilities.map((capability) => ({
    capability,
    granted: true,
    limit: plan.limits[capability],
    source: 'SUBSCRIPTION' as const,
    status: 'ACTIVE' as const,
    planCode: plan.code,
    effectiveFrom: sub.activatedAt,
    effectiveUntil: sub.expiresAt ?? null,
  }));
}

export function decideAccess(
  store: PlatformStore,
  tenantId: string,
  capability: string,
  now = new Date()
): AccessDecision {
  if (!knownCapability(capability)) {
    return {
      capability,
      allowed: false,
      entitled: false,
      reason: 'UNKNOWN_CAPABILITY',
    };
  }
  const sub = subscriptionForTenant(store, tenantId);
  const status = sub ? effectiveStatus(sub, now) : null;
  const entitlements = deriveEntitlements(store, tenantId, now);
  const hit = entitlements.find((e) => e.capability === capability && e.granted);
  if (!hit) {
    return {
      capability,
      allowed: false,
      entitled: false,
      reason: sub && status && status !== 'ACTIVE' ? `SUBSCRIPTION_${status}` : 'NOT_ENTITLED',
      planCode: sub?.planCode ?? null,
      subscriptionStatus: status,
    };
  }
  return {
    capability,
    allowed: true,
    entitled: true,
    reason: 'ENTITLED',
    planCode: hit.planCode,
    subscriptionStatus: status,
  };
}

export function createCommercialService(store: PlatformStore) {
  seedCommercialCatalog(store);

  function requirePlan(planCode: string): PlanDefinition {
    const plan = store.plans.get(planCode);
    if (!plan) {
      throw new PlatformError(400, 'UNKNOWN_PLAN', 'Unknown plan code');
    }
    return plan;
  }

  function createCheckout(ctx: TrustedPlatformContext, planCode: string): SaasPayment {
    requirePlan(planCode);
    const existing = subscriptionForTenant(store, ctx.tenant.id);
    if (existing && effectiveStatus(existing, new Date()) === 'ACTIVE') {
      throw new PlatformError(409, 'SUBSCRIPTION_ACTIVE', 'Tenant already has an active subscription');
    }
    const ts = nowIso();
    const payment: SaasPayment = {
      id: newId(),
      tenantId: ctx.tenant.id,
      checkoutId: newId(),
      planCode,
      status: 'PAYMENT_PENDING',
      adapter: 'test',
      createdAt: ts,
      updatedAt: ts,
    };
    store.payments.set(payment.id, payment);
    audit(store, {
      tenantId: ctx.tenant.id,
      actorId: ctx.identity.id,
      eventId: null,
      source: 'checkout',
      previousState: 'none',
      newState: 'PAYMENT_PENDING',
    });
    return payment;
  }

  function getPayment(ctx: TrustedPlatformContext, paymentId: string): SaasPayment {
    const payment = store.payments.get(paymentId);
    if (!payment || payment.tenantId !== ctx.tenant.id) {
      throw new PlatformError(403, 'TENANT_ISOLATION', 'Payment is not visible in this tenant');
    }
    return payment;
  }

  function getSubscription(ctx: TrustedPlatformContext): Subscription | null {
    const sub = subscriptionForTenant(store, ctx.tenant.id);
    if (!sub) return null;
    return { ...sub, status: effectiveStatus(sub, new Date()) };
  }

  function cancelSubscription(ctx: TrustedPlatformContext): Subscription {
    const sub = subscriptionForTenant(store, ctx.tenant.id);
    if (!sub) {
      throw new PlatformError(404, 'SUBSCRIPTION_MISSING', 'No subscription');
    }
    const prev = sub.status;
    sub.status = 'CANCELLED';
    sub.cancelledAt = nowIso();
    sub.updatedAt = sub.cancelledAt;
    audit(store, {
      tenantId: ctx.tenant.id,
      actorId: ctx.identity.id,
      eventId: null,
      source: 'cancel',
      previousState: prev,
      newState: 'CANCELLED',
    });
    return sub;
  }

  function handleTestWebhook(input: {
    adapter: string;
    rawBody: string;
    signature: string | undefined;
    eventId: string;
    type: string;
    checkoutId: string;
  }): { duplicate: boolean; payment: SaasPayment; subscription: Subscription | null } {
    if (input.adapter !== 'test') {
      throw new PlatformError(
        400,
        'PROVIDER_DEFERRED',
        'Payment provider is not selected; only the test port is available'
      );
    }
    if (!verifyBillingSignature(input.rawBody, input.signature)) {
      throw new PlatformError(401, 'WEBHOOK_UNVERIFIED', 'Billing webhook signature is invalid');
    }
    if (!input.eventId) {
      throw new PlatformError(400, 'EVENT_ID_REQUIRED', 'eventId is required');
    }
    const existingEvent = store.billingEvents.get(input.eventId);
    if (existingEvent) {
      const payment = store.payments.get(existingEvent.paymentId);
      if (!payment) {
        throw new PlatformError(500, 'PAYMENT_MISSING', 'Idempotent event refers to missing payment');
      }
      return {
        duplicate: true,
        payment,
        subscription: subscriptionForTenant(store, payment.tenantId) ?? null,
      };
    }

    const payment = [...store.payments.values()].find((p) => p.checkoutId === input.checkoutId);
    if (!payment) {
      throw new PlatformError(404, 'CHECKOUT_MISSING', 'Checkout not found');
    }

    const prevPay = payment.status;
    if (input.type === 'payment.confirmed') {
      payment.status = 'PAYMENT_CONFIRMED';
      payment.updatedAt = nowIso();
      let sub = subscriptionForTenant(store, payment.tenantId);
      const prevSub = sub?.status ?? 'none';
      if (!sub) {
        sub = {
          id: newId(),
          tenantId: payment.tenantId,
          planCode: payment.planCode,
          status: 'ACTIVE',
          priceId: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          activatedAt: nowIso(),
          expiresAt: null,
        };
        store.subscriptions.set(sub.id, sub);
      } else {
        sub.planCode = payment.planCode;
        sub.status = 'ACTIVE';
        sub.activatedAt = nowIso();
        sub.updatedAt = nowIso();
        sub.cancelledAt = null;
      }
      audit(store, {
        tenantId: payment.tenantId,
        actorId: null,
        eventId: input.eventId,
        source: 'webhook',
        previousState: `${prevPay}/${prevSub}`,
        newState: 'PAYMENT_CONFIRMED/ACTIVE',
      });
      store.billingEvents.set(input.eventId, {
        eventId: input.eventId,
        tenantId: payment.tenantId,
        paymentId: payment.id,
        type: input.type,
        processedAt: nowIso(),
      });
      return { duplicate: false, payment, subscription: sub };
    }

    if (input.type === 'payment.failed' || input.type === 'payment.cancelled') {
      payment.status = input.type === 'payment.failed' ? 'PAYMENT_FAILED' : 'PAYMENT_CANCELLED';
      payment.updatedAt = nowIso();
      const sub = subscriptionForTenant(store, payment.tenantId);
      if (sub && sub.status === 'ACTIVE') {
        sub.status = 'PAST_DUE';
        sub.updatedAt = nowIso();
      }
      audit(store, {
        tenantId: payment.tenantId,
        actorId: null,
        eventId: input.eventId,
        source: 'webhook',
        previousState: prevPay,
        newState: payment.status,
      });
      store.billingEvents.set(input.eventId, {
        eventId: input.eventId,
        tenantId: payment.tenantId,
        paymentId: payment.id,
        type: input.type,
        processedAt: nowIso(),
      });
      return { duplicate: false, payment, subscription: sub ?? null };
    }

    throw new PlatformError(400, 'UNKNOWN_EVENT', 'Unsupported billing event type');
  }

  return {
    createCheckout,
    getPayment,
    getSubscription,
    cancelSubscription,
    handleTestWebhook,
    deriveEntitlements: (tenantId: string) => deriveEntitlements(store, tenantId),
    decideAccess: (tenantId: string, capability: string) => decideAccess(store, tenantId, capability),
    listPlans: () => [...store.plans.values()].map((p) => ({ code: p.code, displayName: p.displayName })),
  };
}

export type CommercialService = ReturnType<typeof createCommercialService>;
