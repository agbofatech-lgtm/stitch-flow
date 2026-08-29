/**
 * Phase 17 — Measurement Intelligence AI surface.
 *
 * Embedded in the measurement workspace, where "which measurements should I
 * verify?" is a question the tailor actually asks. It never renders unless a
 * profile is selected, and it never fires a request on mount.
 */

import React, { useCallback, useEffect, useState } from 'react';
import AIAdvisoryPanel, { useAIAdvisory } from './AIAdvisoryPanel';
import { aiApi, type AIProviderStatus } from '../../shared/api/ai';

export default function MeasurementAIPanel({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<AIProviderStatus | null>(null);

  // Availability is a cheap, non-AI call: it never contacts a provider.
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

  const request = useCallback(() => aiApi.reviewMeasurements(profileId), [profileId]);
  const { advisory, isLoading, error, run } = useAIAdvisory(request);

  return (
    <AIAdvisoryPanel
      title="Measurement Review"
      actionLabel="Review Measurements"
      advisory={advisory}
      status={status}
      isLoading={isLoading}
      error={error}
      onRequest={run}
    />
  );
}
