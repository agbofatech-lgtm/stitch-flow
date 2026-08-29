/**
 * Phase 17 — AI Tailoring Intelligence certification suite.
 *
 * NO TEST HERE REQUIRES: an API key, network access, or a live model.
 * Everything runs against the mandatory deterministic provider (§14).
 */

import { providerRegistry } from '../src/providers/contracts';
import {
  requestAdvisory,
  getProviderStatus,
  isAIEnabled,
  buildDeterministicAdvisory,
} from '../src/modules/ai/aiGateway';
import {
  createDeterministicAIProvider,
  type SimulatedFailure,
} from '../src/modules/ai/providers/DeterministicAIProvider';
import { configuredProviderKind, buildConfiguredProvider } from '../src/modules/ai/providers';
import {
  parseProviderAdvisory,
  normalizeFindings,
} from '../src/modules/ai/advisorySchema';
import {
  applyDeterministicPrecedence,
  assertionsToFindings,
  contradicts,
  type DeterministicAssertion,
} from '../src/modules/ai/deterministicPrecedence';
import {
  buildMeasurementReviewContext,
  buildFabricReviewContext,
  buildProductionReviewContext,
  buildDesignReviewContext,
  measurementAssertions,
  fabricAssertions,
  productionAssertions,
  pseudonymize,
  applyAllowlist,
  type MeasurementReviewInput,
  type FabricReviewInput,
  type ProductionReviewInput,
} from '../src/modules/ai/contextBuilders';
import { AI_PURPOSES, isAIPurpose, type AIAdvisoryRequest } from '../src/modules/ai/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE = 'ws-phase17';

function useProvider(failure: SimulatedFailure = 'none'): void {
  providerRegistry.register('ai', createDeterministicAIProvider({ failure }));
  process.env.AI_ENABLED = 'true';
}

function clearProvider(): void {
  (providerRegistry as unknown as { register: (k: string, v: unknown) => void }).register(
    'ai',
    null,
  );
  delete process.env.AI_ENABLED;
}

function measurementInput(overrides: Partial<MeasurementReviewInput> = {}): MeasurementReviewInput {
  return {
    workspaceId: WORKSPACE,
    customerId: 'cust-1',
    garmentType: 'shirt',
    unit: 'cm',
    level1Passed: true,
    valueCount: 8,
    profileStatus: 'DRAFT',
    completeness: [{ garmentType: 'shirt', state: 'PARTIAL' }],
    missingDefinitions: ['sleeve_length'],
    presentDefinitions: ['chest_circumference'],
    relationalFindings: [
      { code: 'calf<=thigh', result: 'WARNING', message: 'Calf larger than thigh is unusual.' },
    ],
    anomalies: [
      {
        definitionCode: 'waist_circumference',
        state: 'FLAGGED',
        changePercent: 12.5,
        explanation: '12.5% away from historical average',
      },
    ],
    ...overrides,
  };
}

function fabricInput(overrides: Partial<FabricReviewInput> = {}): FabricReviewInput {
  return {
    workspaceId: WORKSPACE,
    fabricConsumptionId: 'fc-1',
    fabricType: 'ankara',
    widthCm: 115,
    stretch: 'none',
    transparency: 'opaque',
    isDirectional: true,
    requiresPatternMatching: true,
    patternMatchingVerification: 'manual_verification_required',
    layoutEnvelopeCm: 220,
    fabricRequiredCm: 268,
    fabricRequiredMeters: 2.68,
    consumptionBreakdown: { layoutEnvelopeCm: 220, afterShrinkageCm: 226.6 },
    allowanceSources: [{ allowance: 'shrinkage', source: 'fabric_type_default' }],
    consumptionConfidence: 'medium',
    assumptions: ['Shrinkage estimated from fabric type'],
    manualVerificationRequired: true,
    widthCompatible: false,
    ...overrides,
  };
}

function productionInput(overrides: Partial<ProductionReviewInput> = {}): ProductionReviewInput {
  return {
    workspaceId: WORKSPACE,
    productionPlanId: 'plan-1',
    overallStatus: 'blocked',
    readinessFlags: { designReady: true, fabricReady: false },
    blockers: [
      {
        code: 'fabric_short',
        category: 'fabric',
        severity: 'blocking',
        message: 'Insufficient fabric for the cutting layout.',
        resolution: 'Purchase additional fabric.',
      },
      {
        code: 'qc_pending',
        category: 'quality',
        severity: 'warning',
        message: 'Pre-cut quality checkpoint not yet completed.',
        resolution: 'Complete the checkpoint.',
      },
    ],
    warnings: ['Thread colour not confirmed'],
    operationSummary: { total: 6, completed: 1, blocked: 2, inProgress: 1 },
    blockedOperations: [{ code: 'op-cut', name: 'Cut fabric', reason: 'Awaiting fabric' }],
    qualityCheckpoints: [{ code: 'qc-1', phase: 'pre_cut', status: 'pending' }],
    materialShortages: [{ material: 'lining', shortfall: '0.5m' }],
    ...overrides,
  };
}

function makeRequest(purpose: AIAdvisoryRequest['purpose'], context: AIAdvisoryRequest['context']): AIAdvisoryRequest {
  return {
    purpose,
    workspaceId: WORKSPACE,
    actorId: 'user-1',
    requestId: 'req-1',
    context,
  };
}

afterEach(() => {
  clearProvider();
});

// ---------------------------------------------------------------------------
// A. Contracts
// ---------------------------------------------------------------------------

describe('Phase 17 — AI domain contracts', () => {
  it('P17-A1: exposes a closed purpose set with no general-purpose chat', () => {
    expect(AI_PURPOSES).toEqual([
      'measurement_review',
      'design_review',
      'fabric_review',
      'production_review',
      'customer_explanation',
    ]);
    expect(isAIPurpose('chat')).toBe(false);
    expect(isAIPurpose('measurement_review')).toBe(true);
  });

  it('P17-A2: rejects an invalid purpose and still returns a usable advisory', async () => {
    useProvider();
    const ctx = buildMeasurementReviewContext(measurementInput());
    const req = makeRequest('not_a_purpose' as never, ctx);
    const advisory = await requestAdvisory(req);
    expect(advisory.status).toBe('degraded');
    expect(advisory.advisory).toBe(true);
    expect(advisory.aiGenerated).toBe(false);
  });

  it('P17-A3: every advisory is labelled advisory:true', async () => {
    useProvider();
    for (const purpose of AI_PURPOSES) {
      const ctx = buildMeasurementReviewContext(measurementInput());
      const advisory = await requestAdvisory({ ...makeRequest(purpose, { ...ctx, purpose }) });
      expect(advisory.advisory).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// B. Output validation (§39)
// ---------------------------------------------------------------------------

describe('Phase 17 — provider output validation', () => {
  it('P17-B1: rejects malformed (non-JSON) provider output', () => {
    const r = parseProviderAdvisory('the garment looks fine to me');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('MALFORMED_RESPONSE');
  });

  it('P17-B2: rejects empty provider output', () => {
    expect(parseProviderAdvisory('').ok).toBe(false);
    expect(parseProviderAdvisory(null).ok).toBe(false);
  });

  it('P17-B3: rejects valid JSON that violates the schema', () => {
    const r = parseProviderAdvisory(JSON.stringify({ purpose: 'nope', summary: 42 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('SCHEMA_VALIDATION_FAILURE');
  });

  it('P17-B4: extracts JSON wrapped in markdown fences and prose', () => {
    const payload = {
      purpose: 'measurement_review',
      summary: 'ok',
      findings: [],
      recommendations: [],
      limitations: [],
      confidence: 'low',
    };
    const r = parseProviderAdvisory('Here you go:\n```json\n' + JSON.stringify(payload) + '\n```');
    expect(r.ok).toBe(true);
  });

  it('P17-B5: a provider may NOT self-label output as deterministic', () => {
    const r = parseProviderAdvisory(
      JSON.stringify({
        purpose: 'measurement_review',
        summary: 'x',
        findings: [
          {
            code: 'f1',
            category: 'measurement',
            severity: 'info',
            message: 'm',
            explanation: 'e',
            source: 'deterministic',
            evidence: [],
            confidence: 'high',
            requiresHumanVerification: false,
          },
        ],
        recommendations: [],
        limitations: [],
        confidence: 'high',
      }),
    );
    expect(r.ok).toBe(false);
  });

  it('P17-B6: downgrades high confidence asserted without evidence', () => {
    const normalized = normalizeFindings([
      {
        code: 'f1',
        category: 'fabric',
        severity: 'info',
        message: 'm',
        explanation: 'e',
        source: 'ai_inference',
        evidence: [],
        confidence: 'high',
        requiresHumanVerification: false,
      },
    ]);
    expect(normalized[0].confidence).toBe('medium');
    expect(normalized[0].requiresHumanVerification).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C. Deterministic precedence (§40)
// ---------------------------------------------------------------------------

describe('Phase 17 — deterministic precedence', () => {
  const widthBlocker: DeterministicAssertion = {
    code: 'fabric_width_incompatible',
    statement: 'Fabric width is incompatible with the cutting layout.',
    blocking: true,
    keywords: ['width', 'fabric', 'compatible', 'fit'],
  };

  it('P17-C1: detects an AI claim contradicting a blocking result', () => {
    expect(contradicts('The fabric width is compatible and should be fine.', widthBlocker)).toBe(true);
    expect(contradicts('Check the thread colour before sewing.', widthBlocker)).toBe(false);
  });

  it('P17-C2: suppresses the contradicting AI finding and records the conflict', () => {
    const result = applyDeterministicPrecedence(
      [
        {
          code: 'ai_all_clear',
          category: 'fabric',
          severity: 'info',
          message: 'The fabric width is compatible, this should be fine.',
          explanation: 'No concerns.',
          source: 'ai_inference',
          evidence: [],
          confidence: 'high',
          requiresHumanVerification: false,
        },
      ],
      [],
      [widthBlocker],
    );
    expect(result.findings).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].deterministicCode).toBe('fabric_width_incompatible');
  });

  it('P17-C3: deterministic findings are never suppressed', () => {
    const det = assertionsToFindings([widthBlocker], 'fabric');
    const result = applyDeterministicPrecedence(det, [], [widthBlocker]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].source).toBe('deterministic');
  });

  it('P17-C4: end-to-end — a dismissive model cannot override a blocker', async () => {
    useProvider('contradicts_deterministic');
    const input = fabricInput();
    const advisory = await requestAdvisory(
      makeRequest('fabric_review', buildFabricReviewContext(input)),
      { assertions: fabricAssertions(input) },
    );

    // The blocker survives...
    const blocker = advisory.findings.find((f) => f.code === 'fabric_width_incompatible');
    expect(blocker).toBeDefined();
    expect(blocker?.source).toBe('deterministic');
    // ...and the AI's "all clear" was suppressed and recorded.
    expect(advisory.findings.some((f) => f.code === 'ai_all_clear')).toBe(false);
    expect(advisory.deterministicConflicts.length).toBeGreaterThan(0);
    expect(advisory.requiresHumanReview).toBe(true);
  });

  it('P17-C5: non-blocking assertions do not suppress AI interpretation', () => {
    const warning: DeterministicAssertion = {
      code: 'directional_fabric',
      statement: 'Fabric is directional.',
      blocking: false,
      keywords: ['directional'],
    };
    const result = applyDeterministicPrecedence(
      [
        {
          code: 'ai_note',
          category: 'fabric',
          severity: 'info',
          message: 'Directional fabric is no problem here.',
          explanation: 'e',
          source: 'ai_inference',
          evidence: [],
          confidence: 'low',
          requiresHumanVerification: true,
        },
      ],
      [],
      [warning],
    );
    expect(result.findings).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// D. Provider gateway + resilience (§26)
// ---------------------------------------------------------------------------

describe('Phase 17 — gateway resilience', () => {
  it('P17-D1: NO_PROVIDER — degrades to a deterministic advisory', async () => {
    clearProvider();
    const status = getProviderStatus();
    expect(status.configured).toBe(false);
    expect(status.reason).toBe('NO_PROVIDER');

    const input = fabricInput();
    const advisory = await requestAdvisory(
      makeRequest('fabric_review', buildFabricReviewContext(input)),
      { assertions: fabricAssertions(input) },
    );
    expect(advisory.status).toBe('degraded');
    expect(advisory.aiGenerated).toBe(false);
    // Deterministic value is still delivered.
    expect(advisory.findings.length).toBeGreaterThan(0);
  });

  it('P17-D2: PROVIDER_DISABLED — configured but AI_ENABLED not set', async () => {
    providerRegistry.register('ai', createDeterministicAIProvider());
    delete process.env.AI_ENABLED;
    expect(isAIEnabled()).toBe(false);
    expect(getProviderStatus().reason).toBe('PROVIDER_DISABLED');

    const input = measurementInput();
    const advisory = await requestAdvisory(
      makeRequest('measurement_review', buildMeasurementReviewContext(input)),
      { assertions: measurementAssertions(input) },
    );
    expect(advisory.aiGenerated).toBe(false);
    expect(advisory.status).toBe('degraded');
  });

  const failureCases: Array<[SimulatedFailure, string]> = [
    ['rate_limit', 'RATE_LIMIT'],
    ['network', 'NETWORK_FAILURE'],
    ['provider_error', 'PROVIDER_ERROR'],
    ['malformed', 'MALFORMED_RESPONSE'],
    ['empty', 'EMPTY_RESPONSE'],
    ['schema_violation', 'SCHEMA_VALIDATION_FAILURE'],
  ];

  it.each(failureCases)(
    'P17-D3: %s failure degrades gracefully without throwing',
    async (failure) => {
      useProvider(failure);
      const input = measurementInput();
      const advisory = await requestAdvisory(
        makeRequest('measurement_review', buildMeasurementReviewContext(input)),
        { assertions: measurementAssertions(input) },
      );
      expect(advisory.status).toBe('degraded');
      expect(advisory.aiGenerated).toBe(false);
      expect(advisory.advisory).toBe(true);
      // Deterministic evidence survives every failure mode.
      expect(advisory.findings.some((f) => f.source === 'deterministic')).toBe(true);
    },
  );

  it('P17-D4: TIMEOUT — a hanging provider cannot stall the workflow', async () => {
    useProvider('timeout');
    const input = measurementInput();
    const started = Date.now();
    const advisory = await requestAdvisory(
      makeRequest('measurement_review', buildMeasurementReviewContext(input)),
      { assertions: measurementAssertions(input), timeoutMs: 150 },
    );
    expect(Date.now() - started).toBeLessThan(5000);
    expect(advisory.status).toBe('degraded');
    expect(advisory.limitations.some((l) => l.code === 'ai_timeout')).toBe(true);
  });

  it('P17-D5: a healthy provider produces an AI-generated advisory', async () => {
    useProvider();
    const input = measurementInput();
    const advisory = await requestAdvisory(
      makeRequest('measurement_review', buildMeasurementReviewContext(input)),
      { assertions: measurementAssertions(input) },
    );
    expect(advisory.status).toBe('ok');
    expect(advisory.aiGenerated).toBe(true);
    expect(advisory.provenance.provider).toBe('deterministic-test');
    expect(advisory.findings.some((f) => f.source === 'ai_inference')).toBe(true);
  });

  it('P17-D6: requestAdvisory never rejects, for any failure mode', async () => {
    const modes: SimulatedFailure[] = [
      'none',
      'rate_limit',
      'network',
      'provider_error',
      'malformed',
      'empty',
      'schema_violation',
      'contradicts_deterministic',
    ];
    for (const mode of modes) {
      useProvider(mode);
      const input = fabricInput();
      await expect(
        requestAdvisory(makeRequest('fabric_review', buildFabricReviewContext(input)), {
          assertions: fabricAssertions(input),
        }),
      ).resolves.toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// E. Provider selection
// ---------------------------------------------------------------------------

describe('Phase 17 — provider selection', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('P17-E1: defaults to no provider', () => {
    delete process.env.AI_PROVIDER;
    expect(configuredProviderKind()).toBe('none');
    expect(buildConfiguredProvider()).toBeNull();
  });

  it('P17-E2: a vendor selected without its API key yields no provider', () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    expect(configuredProviderKind()).toBe('openai');
    expect(buildConfiguredProvider()).toBeNull();
  });

  it('P17-E3: each vendor is selectable and swappable by config alone', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    expect(buildConfiguredProvider()?.name).toBe('openai');

    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    expect(buildConfiguredProvider()?.name).toBe('gemini');

    process.env.AI_PROVIDER = 'claude';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(buildConfiguredProvider()?.name).toBe('claude');
  });

  it('P17-E4: the deterministic provider needs no key and no network', async () => {
    process.env.AI_PROVIDER = 'deterministic';
    const provider = buildConfiguredProvider();
    expect(provider).not.toBeNull();
    const res = await provider!.generate({
      purpose: 'measurement_review',
      workspaceId: WORKSPACE,
      actorId: null,
      requestId: null,
      inputClassification: 'pseudonymized',
      prompt: 'x',
      context: { deterministicFindings: [] },
    });
    expect(res.costMetadata?.estimatedCostUsd).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// F. Data governance & tenant isolation (§15/§16)
// ---------------------------------------------------------------------------

describe('Phase 17 — data governance and tenant isolation', () => {
  it('P17-F1: context is allowlisted — unlisted keys are dropped', () => {
    const projected = applyAllowlist(
      { garmentType: 'shirt', passwordHash: 'secret', email: 'a@b.c' },
      ['garmentType'],
    );
    expect(projected).toEqual({ garmentType: 'shirt' });
    expect(projected.passwordHash).toBeUndefined();
  });

  it('P17-F2: no PII reaches the measurement context', () => {
    const ctx = buildMeasurementReviewContext(measurementInput());
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain('cust-1');
    expect(ctx.subjectRef).toMatch(/^customer#[a-f0-9]{12}$/);
    for (const key of Object.keys(ctx.data)) {
      expect(ctx.allowlist).toContain(key);
    }
  });

  it('P17-F3: pseudonyms are stable per tenant and differ across tenants', () => {
    const a = pseudonymize('ws-1', 'cust-1', 'customer');
    const b = pseudonymize('ws-1', 'cust-1', 'customer');
    const c = pseudonymize('ws-2', 'cust-1', 'customer');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('P17-F4: a tenant mismatch between request and context is refused', async () => {
    useProvider();
    const ctx = buildMeasurementReviewContext(measurementInput());
    const advisory = await requestAdvisory({
      purpose: 'measurement_review',
      workspaceId: 'ws-attacker',
      actorId: 'user-x',
      requestId: 'req-x',
      context: ctx, // built for ws-phase17
    });
    expect(advisory.aiGenerated).toBe(false);
    expect(advisory.status).toBe('degraded');
    expect(advisory.summary).toMatch(/tenant verification/i);
  });

  it('P17-F5: a missing workspace is refused rather than best-effort', async () => {
    useProvider();
    const ctx = buildMeasurementReviewContext(measurementInput());
    const advisory = await requestAdvisory({
      purpose: 'measurement_review',
      workspaceId: '',
      actorId: null,
      requestId: null,
      context: { ...ctx, workspaceId: '' },
    });
    expect(advisory.aiGenerated).toBe(false);
  });

  it('P17-F6: every context records its deterministic provenance', () => {
    expect(buildMeasurementReviewContext(measurementInput()).deterministicInputs).toContain(
      'phase13.validationService',
    );
    expect(buildFabricReviewContext(fabricInput()).deterministicInputs).toContain(
      'phase16.fabricConsumptionService',
    );
    expect(buildProductionReviewContext(productionInput()).deterministicInputs).toContain(
      'phase16.productionService',
    );
  });
});

// ---------------------------------------------------------------------------
// G. Domain intelligence — AI consumes, never replaces
// ---------------------------------------------------------------------------

describe('Phase 17 — measurement intelligence', () => {
  it('P17-G1: deterministic anomalies are preserved verbatim', async () => {
    useProvider();
    const input = measurementInput();
    const advisory = await requestAdvisory(
      makeRequest('measurement_review', buildMeasurementReviewContext(input)),
      { assertions: measurementAssertions(input) },
    );
    const anomaly = advisory.findings.find((f) => f.code === 'anomaly_waist_circumference');
    expect(anomaly).toBeDefined();
    expect(anomaly?.source).toBe('deterministic');
    expect(anomaly?.message).toContain('12.5%');
  });

  it('P17-G2: AI cannot mutate measurement truth — no values in context', () => {
    const ctx = buildMeasurementReviewContext(measurementInput());
    // Findings travel, raw measurement values do not.
    expect(ctx.data).not.toHaveProperty('values');
    expect(ctx.data).not.toHaveProperty('canonicalValueCm');
  });

  it('P17-G3: incomplete measurements are a blocking deterministic assertion', () => {
    const assertions = measurementAssertions(measurementInput());
    const incomplete = assertions.find((a) => a.code === 'measurements_incomplete');
    expect(incomplete?.blocking).toBe(true);
  });
});

describe('Phase 17 — fabric intelligence', () => {
  it('P17-G4: width incompatibility is blocking and survives AI', () => {
    const assertions = fabricAssertions(fabricInput());
    expect(assertions.find((a) => a.code === 'fabric_width_incompatible')?.blocking).toBe(true);
  });

  it('P17-G5: pattern matching is never claimed auto-solved', () => {
    const assertions = fabricAssertions(fabricInput());
    const pm = assertions.find((a) => a.code === 'pattern_matching_required');
    expect(pm).toBeDefined();
    expect(pm?.statement).toMatch(/never auto-solved/i);
  });

  it('P17-G6: consumption numbers are deterministic inputs, not AI outputs', async () => {
    useProvider();
    const input = fabricInput({ widthCompatible: true });
    const advisory = await requestAdvisory(
      makeRequest('fabric_review', buildFabricReviewContext(input)),
      { assertions: fabricAssertions(input) },
    );
    // AI never emits a fabricRequiredCm; it only interprets.
    for (const f of advisory.findings) {
      expect(f).not.toHaveProperty('fabricRequiredCm');
    }
    expect(buildFabricReviewContext(input).data.fabricRequiredCm).toBe(268);
  });
});

describe('Phase 17 — production intelligence', () => {
  it('P17-G7: blockers are explained without mutating workflow state', async () => {
    useProvider();
    const input = productionInput();
    const advisory = await requestAdvisory(
      makeRequest('production_review', buildProductionReviewContext(input)),
      { assertions: productionAssertions(input) },
    );
    expect(advisory.findings.some((f) => f.code === 'production_fabric_short')).toBe(true);
    expect(advisory.requiresHumanReview).toBe(true);
    // The advisory carries no mutation instruction of any kind.
    expect(advisory).not.toHaveProperty('stateTransition');
  });

  it('P17-G8: severity maps blocking -> critical, warning -> attention', () => {
    const assertions = productionAssertions(productionInput());
    const findings = assertionsToFindings(assertions, 'workflow');
    expect(findings.find((f) => f.code === 'production_fabric_short')?.severity).toBe('critical');
    expect(findings.find((f) => f.code === 'production_qc_pending')?.severity).toBe('attention');
  });
});

describe('Phase 17 — design intelligence', () => {
  it('P17-G9: design readiness is consumed, specifications are not mutated', () => {
    const ctx = buildDesignReviewContext({
      workspaceId: WORKSPACE,
      designSpecificationId: 'ds-1',
      garmentType: 'kaftan',
      fitType: 'relaxed',
      designStatus: 'DRAFT',
      components: [{ type: 'sleeve', label: 'Long sleeve' }],
      easeConfiguration: [{ area: 'chest', easeCm: 6, source: 'default' }],
      readinessItems: [{ code: 'measurements', status: 'blocked', message: 'Measurements incomplete' }],
      hasInspiration: false,
      observationCount: 0,
    });
    expect(ctx.subjectRef).toMatch(/^design#/);
    expect(ctx.limitations.some((l) => l.code === 'no_inspiration')).toBe(true);
    expect(ctx.data).not.toHaveProperty('id');
  });
});

// ---------------------------------------------------------------------------
// H. Offline / core-workflow independence (§19)
// ---------------------------------------------------------------------------

describe('Phase 17 — offline and core independence', () => {
  it('P17-H1: a deterministic advisory is useful with zero AI involvement', () => {
    const input = fabricInput();
    const advisory = buildDeterministicAdvisory(
      makeRequest('fabric_review', buildFabricReviewContext(input)),
      fabricAssertions(input),
      'NO_PROVIDER',
    );
    expect(advisory.findings.length).toBeGreaterThan(0);
    expect(advisory.findings.every((f) => f.source === 'deterministic')).toBe(true);
    expect(advisory.aiGenerated).toBe(false);
    expect(advisory.advisory).toBe(true);
  });

  it('P17-H2: the AI module imports no vendor SDK', () => {
    const pkg = require('../package.json');
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps).not.toHaveProperty('openai');
    expect(deps).not.toHaveProperty('@anthropic-ai/sdk');
    expect(deps).not.toHaveProperty('@google/generative-ai');
  });

  it('P17-H3: provider status is reportable without any network call', () => {
    clearProvider();
    const status = getProviderStatus();
    expect(status).toEqual({
      configured: false,
      enabled: false,
      provider: null,
      reason: 'NO_PROVIDER',
    });
  });
});
