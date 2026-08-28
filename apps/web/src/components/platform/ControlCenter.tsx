/**
 * Phase 10 — Developer Control Center shell.
 *
 * Platform operators run the product from here. Two hard rules shape this UI:
 *  1. The role check that MATTERS is server-side (every /platform API call is
 *     authorized against the signed role claim minted from the database at
 *     login). The client-side hint below only avoids showing operator chrome
 *     to workspace users; a revoked role surfaces as a per-section 403.
 *  2. No fake controls: every section renders real backend data and every
 *     action calls a real endpoint.
 *
 * Sections mount lazily (only the active one renders), so heavy lists are not
 * fetched until visited.
 */
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getAuthRole, isPlatformRole } from '@shared/utils/api';
import { OverviewSection } from './OverviewSection';
import { CustomersSection } from './CustomersSection';
import { WorkspacesSection } from './WorkspacesSection';
import { UsageSection } from './UsageSection';
import { ObservabilitySection } from './ObservabilitySection';
import { FlagsSection } from './FlagsSection';
import { WebhooksSection } from './WebhooksSection';
import { AuditSection } from './AuditSection';
import { OperatorsSection } from './OperatorsSection';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'customers', label: 'Customers' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'usage', label: 'Usage' },
  { id: 'signals', label: 'Signals & Errors' },
  { id: 'flags', label: 'Feature Flags' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'operators', label: 'Operators' },
] as const;

export type PlatformSectionId = (typeof SECTIONS)[number]['id'];

export function ControlCenter() {
  const [section, setSection] = useState<PlatformSectionId>('overview');
  const hasRoleHint = isPlatformRole(getAuthRole());

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-[#0F6E8C]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-slate-900">Developer Control Center</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Platform operations — customers, workspaces, telemetry and privileged actions.
        </p>
      </header>

      {!hasRoleHint ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold">Platform access required</p>
          <p className="mt-1">
            This area is for platform operators. Your account does not carry a platform role, so
            operator data is not available here. If you believe you should have access, ask a
            platform owner to grant you an operator role — it takes effect at your next sign-in.
          </p>
        </div>
      ) : (
        <>
          <nav aria-label="Control Center sections" className="mb-5 flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C] ${
                  section === s.id
                    ? 'bg-[#0F6E8C] text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Lazy sections: unmounting inactive sections keeps the console light
              and guarantees fresh data on every visit. */}
          {section === 'overview' && <OverviewSection />}
          {section === 'customers' && <CustomersSection />}
          {section === 'workspaces' && <WorkspacesSection />}
          {section === 'usage' && <UsageSection />}
          {section === 'signals' && <ObservabilitySection />}
          {section === 'flags' && <FlagsSection />}
          {section === 'webhooks' && <WebhooksSection />}
          {section === 'audit' && <AuditSection />}
          {section === 'operators' && <OperatorsSection />}
        </>
      )}
    </div>
  );
}
