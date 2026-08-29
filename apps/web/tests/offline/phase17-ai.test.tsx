/**
 * Phase 17 — AI Tailoring Intelligence frontend certification.
 *
 * Real-DOM tests (jsdom). No network, no API key, no live model.
 * Verifies that the UI visibly separates deterministic fact from AI
 * interpretation, surfaces limitations, and degrades safely.
 */

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AIAdvisoryPanel from '../../src/components/ai/AIAdvisoryPanel';
import {
  sourceLabel,
  unavailableMessage,
  type AIAdvisory,
  type AIProviderStatus,
} from '../../src/shared/api/ai';

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function render(ui: React.ReactElement): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function makeAdvisory(overrides: Partial<AIAdvisory> = {}): AIAdvisory {
  return {
    purpose: 'fabric_review',
    status: 'ok',
    summary: 'Reviewed the fabric requirement.',
    findings: [
      {
        code: 'fabric_width_incompatible',
        category: 'fabric',
        severity: 'critical',
        message: 'Fabric width is incompatible with the cutting layout.',
        explanation: 'Produced by the deterministic StitchFlow engine.',
        source: 'deterministic',
        evidence: ['fabric_width_incompatible'],
        confidence: 'high',
        requiresHumanVerification: true,
      },
      {
        code: 'interp_width',
        category: 'fabric',
        severity: 'attention',
        message: 'Consider a wider roll or a re-nested layout.',
        explanation: 'Interpretation of the deterministic finding.',
        source: 'ai_inference',
        evidence: ['fabric_width_incompatible'],
        confidence: 'medium',
        requiresHumanVerification: true,
      },
    ],
    recommendations: [
      {
        code: 'act_width',
        category: 'fabric',
        action: 'Verify the fabric width against the layout before cutting.',
        rationale: 'The deterministic engine flagged an incompatibility.',
        priority: 1,
        source: 'recommendation',
        evidence: ['fabric_width_incompatible'],
        confidence: 'medium',
      },
    ],
    risks: [],
    limitations: [
      {
        code: 'no_fabric_profile',
        description: 'No fabric profile is linked.',
        resolution: 'Link a fabric profile to enable fabric-specific review.',
      },
    ],
    confidence: 'medium',
    advisory: true,
    aiGenerated: true,
    requiresHumanReview: true,
    deterministicConflicts: [],
    provenance: {
      purpose: 'fabric_review',
      provider: 'deterministic-test',
      model: null,
      deterministicInputs: ['phase16.fabricConsumptionService'],
      requestId: 'req-1',
      workspaceId: 'ws-1',
      generatedAt: new Date().toISOString(),
      degraded: false,
    },
    ...overrides,
  };
}

const noop = () => {};

// ---------------------------------------------------------------------------
// F1 — Advisory labelling
// ---------------------------------------------------------------------------

describe('Phase 17 UI — advisory labelling', () => {
  it('P17-UI1: always labels output as advisory, never as a decision', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric Intelligence"
        actionLabel="Review Fabric"
        advisory={makeAdvisory()}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    const label = container.querySelector('[data-testid="ai-advisory-label"]');
    expect(label?.textContent).toMatch(/advisory only/i);
    expect(container.textContent).not.toMatch(/AI decision/i);
    unmount();
  });

  it('P17-UI2: distinguishes deterministic fact from AI interpretation', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric Intelligence"
        actionLabel="Review Fabric"
        advisory={makeAdvisory()}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    const badges = Array.from(
      container.querySelectorAll('[data-testid="ai-source-badge"]'),
    ).map((b) => b.textContent);
    expect(badges).toContain('Verified by StitchFlow');
    expect(badges).toContain('AI interpretation');
    unmount();
  });

  it('P17-UI3: shows the human-review requirement', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={makeAdvisory()}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    expect(container.querySelector('[data-testid="ai-human-review"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="ai-verify-flag"]').length).toBeGreaterThan(0);
    unmount();
  });

  it('P17-UI4: limitations are visible', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={makeAdvisory()}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    const lim = container.querySelector('[data-testid="ai-limitations"]');
    expect(lim?.textContent).toMatch(/No fabric profile is linked/);
    unmount();
  });
});

// ---------------------------------------------------------------------------
// F2 — States
// ---------------------------------------------------------------------------

describe('Phase 17 UI — states', () => {
  it('P17-UI5: loading state is shown', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={null}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading
        error={null}
        onRequest={noop}
      />,
    );
    expect(container.querySelector('[data-testid="ai-loading"]')).not.toBeNull();
    unmount();
  });

  it('P17-UI6: unavailable state reassures that StitchFlow still works', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={null}
        status={{ configured: false, enabled: false, provider: null, reason: 'NO_PROVIDER' }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    const el = container.querySelector('[data-testid="ai-unavailable"]');
    expect(el?.textContent).toMatch(/continue to work normally/i);
    unmount();
  });

  it('P17-UI7: error state never implies data loss', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={null}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error="AI assistance could not be reached."
        onRequest={noop}
      />,
    );
    const el = container.querySelector('[data-testid="ai-error"]');
    expect(el?.textContent).toMatch(/tailoring data is unaffected/i);
    unmount();
  });

  it('P17-UI8: a degraded advisory still renders deterministic findings', () => {
    const degraded = makeAdvisory({
      status: 'degraded',
      aiGenerated: false,
      findings: [
        {
          code: 'fabric_width_incompatible',
          category: 'fabric',
          severity: 'critical',
          message: 'Fabric width is incompatible with the cutting layout.',
          explanation: 'Deterministic engine result.',
          source: 'deterministic',
          evidence: ['fabric_width_incompatible'],
          confidence: 'high',
          requiresHumanVerification: true,
        },
      ],
      recommendations: [],
    });
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={degraded}
        status={{ configured: false, enabled: false, provider: null, reason: 'NO_PROVIDER' }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    expect(container.querySelector('[data-testid="ai-deterministic-label"]')?.textContent).toMatch(
      /no AI was used/i,
    );
    expect(container.querySelectorAll('[data-testid="ai-finding"]').length).toBe(1);
    unmount();
  });
});

// ---------------------------------------------------------------------------
// F3 — Deterministic precedence made visible
// ---------------------------------------------------------------------------

describe('Phase 17 UI — deterministic precedence', () => {
  it('P17-UI9: suppressed AI claims are shown, not hidden', () => {
    const withConflict = makeAdvisory({
      deterministicConflicts: [
        {
          deterministicCode: 'fabric_width_incompatible',
          deterministicStatement: 'Fabric width is incompatible with the cutting layout.',
          suppressedAIClaim: 'The fabric width is compatible and should be fine.',
          reason: 'AI contradicted a blocking deterministic result.',
        },
      ],
    });
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={withConflict}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    const conflicts = container.querySelector('[data-testid="ai-conflicts"]');
    expect(conflicts?.textContent).toMatch(/overruled the AI/i);
    expect(conflicts?.textContent).toMatch(/was suppressed/i);
    unmount();
  });

  it('P17-UI10: recommendations state that nothing is auto-applied', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={makeAdvisory()}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={noop}
      />,
    );
    expect(container.querySelector('[data-testid="ai-recommendations"]')?.textContent).toMatch(
      /Nothing is applied until you choose to act/i,
    );
    unmount();
  });
});

// ---------------------------------------------------------------------------
// F4 — Explicit user action (§25)
// ---------------------------------------------------------------------------

describe('Phase 17 UI — intentional invocation', () => {
  it('P17-UI11: no AI request fires on render; only on user action', () => {
    let calls = 0;
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review Fabric"
        advisory={null}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading={false}
        error={null}
        onRequest={() => {
          calls += 1;
        }}
      />,
    );
    expect(calls).toBe(0);

    const button = container.querySelector<HTMLButtonElement>('[data-testid="ai-request-button"]');
    expect(button?.textContent).toMatch(/Review Fabric/);
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(calls).toBe(1);
    unmount();
  });

  it('P17-UI12: the action is disabled while loading', () => {
    const { container, unmount } = render(
      <AIAdvisoryPanel
        title="Fabric"
        actionLabel="Review"
        advisory={null}
        status={{ configured: true, enabled: true, provider: 'x', reason: null }}
        isLoading
        error={null}
        onRequest={noop}
      />,
    );
    const button = container.querySelector<HTMLButtonElement>('[data-testid="ai-request-button"]');
    expect(button?.disabled).toBe(true);
    unmount();
  });
});

// ---------------------------------------------------------------------------
// F5 — Client helpers and secret hygiene
// ---------------------------------------------------------------------------

describe('Phase 17 UI — client contract', () => {
  it('P17-UI13: source labels never present AI output as verified fact', () => {
    expect(sourceLabel('deterministic')).toBe('Verified by StitchFlow');
    expect(sourceLabel('ai_inference')).toBe('AI interpretation');
    expect(sourceLabel('unknown')).toBe('Insufficient evidence');
  });

  it('P17-UI14: unavailable messaging always reassures about core workflows', () => {
    const reasons: AIProviderStatus[] = [
      { configured: false, enabled: false, provider: null, reason: 'NO_PROVIDER' },
      { configured: true, enabled: false, provider: 'openai', reason: 'PROVIDER_DISABLED' },
      { configured: true, enabled: false, provider: 'openai', reason: 'TIMEOUT' },
    ];
    for (const r of reasons) {
      expect(unavailableMessage(r)).toMatch(/continue to work normally/i);
    }
  });
});
