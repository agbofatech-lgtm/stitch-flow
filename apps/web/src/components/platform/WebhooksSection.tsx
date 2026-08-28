/**
 * Phase 10 — Webhook operations.
 *
 * The only real platform-side webhook operation today is the manual outbox
 * dispatch (which drains pending deliveries in the same pass) — that is what
 * this section exposes. Per-endpoint retry/disable/replay at platform level
 * is NOT available yet; rather than faking controls, that is stated
 * explicitly. Webhook secrets are never shown here (write-once at creation,
 * Phase 8 semantics preserved).
 */
import { useState } from 'react';
import { platformApi } from '@shared/api/platform';
import { Card, ConfirmAction, describeApiError } from './ui';

export function WebhooksSection() {
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card title="Delivery queue operations">
        <p className="text-sm text-slate-600">
          Dispatches every pending webhook in the platform outbox and drains the delivery queue in
          one pass (the same pipeline that runs on schedule). Requires the platform operate role.
        </p>
        {failure && (
          <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {failure}
          </p>
        )}
        <div className="mt-3">
          <ConfirmAction
            label="Dispatch pending webhooks now"
            confirmLabel="Dispatch and drain now"
            onConfirm={async () => {
              setFailure(null);
              try {
                const out = await platformApi.dispatchWebhooks();
                const summary = `dispatch ${JSON.stringify(out.dispatch)} · drain ${JSON.stringify(out.drain)}`;
                setLastRun(summary);
                return 'Dispatch + drain completed.';
              } catch (e) {
                setFailure(describeApiError(e).message);
                throw e;
              }
            }}
          />
        </div>
        {lastRun && (
          <p role="status" className="mt-3 break-words text-xs text-slate-600">
            Last run result: {lastRun}
          </p>
        )}
      </Card>

      <Card title="Not available in this phase (documented gaps)">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Platform-level per-endpoint retry / disable / enable — manage endpoints in the workspace Developer console (Phase 8).</li>
          <li>Delivery replay from the platform console — planned for a later phase.</li>
          <li>Secret rotation/display — by design never available after creation (Phase 8 security rule preserved).</li>
        </ul>
      </Card>
    </div>
  );
}
