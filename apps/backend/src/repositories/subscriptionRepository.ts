import { query, pool, type Queryable } from '../config/db';
import type { PoolClient } from 'pg';
import type { PlanCode } from '../billing/plans';
import type { SubscriptionStatus } from '../billing/subscriptionStateMachine';

export type SubscriptionRow = {
  id: string;
  workspace_id: string;
  plan_code: PlanCode;
  status: SubscriptionStatus;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = `
  id, workspace_id, plan_code, status, provider,
  provider_customer_id, provider_subscription_id,
  current_period_start, current_period_end,
  trial_start, trial_end, cancel_at_period_end, cancelled_at,
  last_event_at, created_at, updated_at
`;

export const subscriptionRepository = {
  /**
   * The latest subscription for a workspace (live one first, else the most
   * recently updated terminal one).
   */
  async findLatestForWorkspace(
    workspaceId: string,
    client?: Queryable
  ): Promise<SubscriptionRow | null> {
    const runner = client ?? { query };
    const result = await runner.query(
      `SELECT ${SELECT_COLUMNS}
       FROM subscriptions
       WHERE workspace_id = $1
       ORDER BY
         (status IN ('trialing','active','past_due','paused')) DESC,
         updated_at DESC
       LIMIT 1`,
      [workspaceId]
    );
    return (result.rows[0] as SubscriptionRow | undefined) ?? null;
  },

  /** Same as findLatestForWorkspace but takes a row lock (webhook path). */
  async lockLatestForWorkspace(
    client: PoolClient,
    workspaceId: string
  ): Promise<SubscriptionRow | null> {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM subscriptions
       WHERE workspace_id = $1
       ORDER BY
         (status IN ('trialing','active','past_due','paused')) DESC,
         updated_at DESC
       LIMIT 1
       FOR UPDATE`,
      [workspaceId]
    );
    return (result.rows[0] as SubscriptionRow | undefined) ?? null;
  },

  async findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
    client?: Queryable
  ): Promise<SubscriptionRow | null> {
    const runner = client ?? { query };
    const result = await runner.query(
      `SELECT ${SELECT_COLUMNS}
       FROM subscriptions
       WHERE provider = $1 AND provider_subscription_id = $2
       LIMIT 1`,
      [provider, providerSubscriptionId]
    );
    return (result.rows[0] as SubscriptionRow | undefined) ?? null;
  },

  async createTrial(
    data: {
      workspaceId: string;
      planCode: PlanCode;
      trialStart: Date;
      trialEnd: Date;
    },
    client?: Queryable
  ): Promise<SubscriptionRow> {
    const runner = client ?? { query };
    const result = await runner.query(
      `INSERT INTO subscriptions
         (workspace_id, plan_code, status, provider, trial_start, trial_end)
       VALUES ($1, $2, 'trialing', 'none', $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [data.workspaceId, data.planCode, data.trialStart, data.trialEnd]
    );
    return result.rows[0] as SubscriptionRow;
  },

  /**
   * Persist a transition. Callers are responsible for state-machine
   * validation (subscriptionService.applyTransition).
   */
  async update(
    client: Queryable,
    id: string,
    patch: {
      planCode?: PlanCode;
      status?: SubscriptionStatus;
      provider?: string;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      cancelledAt?: Date | null;
      lastEventAt?: Date | null;
    }
  ): Promise<SubscriptionRow> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [id];
    const push = (fragment: string, value: unknown) => {
      params.push(value);
      sets.push(`${fragment} = $${params.length}`);
    };

    if (patch.planCode !== undefined) push('plan_code', patch.planCode);
    if (patch.status !== undefined) push('status', patch.status);
    if (patch.provider !== undefined) push('provider', patch.provider);
    if (patch.providerCustomerId !== undefined)
      push('provider_customer_id', patch.providerCustomerId);
    if (patch.providerSubscriptionId !== undefined)
      push('provider_subscription_id', patch.providerSubscriptionId);
    if (patch.currentPeriodStart !== undefined)
      push('current_period_start', patch.currentPeriodStart);
    if (patch.currentPeriodEnd !== undefined)
      push('current_period_end', patch.currentPeriodEnd);
    if (patch.cancelAtPeriodEnd !== undefined)
      push('cancel_at_period_end', patch.cancelAtPeriodEnd);
    if (patch.cancelledAt !== undefined) push('cancelled_at', patch.cancelledAt);
    if (patch.lastEventAt !== undefined) push('last_event_at', patch.lastEventAt);

    const result = await client.query(
      `UPDATE subscriptions SET ${sets.join(', ')}
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      params
    );
    return result.rows[0] as SubscriptionRow;
  },
};

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
