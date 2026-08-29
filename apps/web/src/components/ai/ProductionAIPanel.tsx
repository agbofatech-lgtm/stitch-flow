/**
 * Phase 17 — Production & Fabric Intelligence AI surfaces.
 *
 * Embedded in the production workspace where the tailor asks
 * "what is blocking me?" and "why is this much fabric needed?".
 */

import React, { useCallback, useEffect, useState } from 'react';
import AIAdvisoryPanel, { useAIAdvisory } from './AIAdvisoryPanel';
import { aiApi, type AIProviderStatus } from '../../shared/api/ai';

function useProviderStatus(): AIProviderStatus | null {
  const [status, setStatus] = useState<AIProviderStatus | null>(null);
  useEffect(() => {
    let active = true;
    aiApi
      .status()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        if (active) {
          setStatus({ configured: false, enabled: false, provider: null, reason: 'NO_PROVIDER' });
        }
      });
    return () => {
      active = false;
    };
  }, []);
  return status;
}

export function ProductionAIPanel({ planId }: { planId: string }) {
  const status = useProviderStatus();
  const request = useCallback(() => aiApi.reviewProduction(planId), [planId]);
  const { advisory, isLoading, error, run } = useAIAdvisory(request);

  return (
    <AIAdvisoryPanel
      title="Production Readiness Review"
      actionLabel="Explain Production Blockers"
      advisory={advisory}
      status={status}
      isLoading={isLoading}
      error={error}
      onRequest={run}
    />
  );
}

export function FabricAIPanel({ planId }: { planId: string }) {
  const status = useProviderStatus();
  const request = useCallback(() => aiApi.reviewFabric(planId), [planId]);
  const { advisory, isLoading, error, run } = useAIAdvisory(request);

  return (
    <AIAdvisoryPanel
      title="Fabric Considerations"
      actionLabel="Review Fabric"
      advisory={advisory}
      status={status}
      isLoading={isLoading}
      error={error}
      onRequest={run}
    />
  );
}

export default ProductionAIPanel;
