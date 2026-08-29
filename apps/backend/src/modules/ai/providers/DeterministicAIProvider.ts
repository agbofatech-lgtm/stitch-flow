/**
 * Phase 17 — Deterministic AI provider (§14). MANDATORY test double.
 *
 * Requires no API key. Makes no network request. Costs nothing.
 * The same input always produces the same output.
 *
 * It implements the Phase 7 `AIProvider` interface so it is a drop-in
 * substitute for a real model anywhere in the system, and it supports
 * explicit failure simulation so every branch of the §26 failure taxonomy
 * is testable without touching a live API.
 */

import type { AIProvider, AIRequest, AIResponse } from '../../../providers/contracts';
import type { AIPurpose } from '../types';

/** Failure modes this provider can simulate on demand. */
export type SimulatedFailure =
  | 'none'
  | 'timeout'
  | 'rate_limit'
  | 'network'
  | 'provider_error'
  | 'malformed'
  | 'empty'
  | 'schema_violation'
  /** Simulates a model that dismisses a deterministic blocker (§40). */
  | 'contradicts_deterministic';

export interface DeterministicProviderOptions {
  failure?: SimulatedFailure;
  /** Artificial latency in ms (used with the gateway timeout). */
  latencyMs?: number;
  name?: string;
}

/** Error carrying a machine-readable kind so the gateway can classify it. */
export class SimulatedProviderError extends Error {
  kind: SimulatedFailure;
  constructor(kind: SimulatedFailure, message: string) {
    super(message);
    this.name = 'SimulatedProviderError';
    this.kind = kind;
  }
}

/**
 * Build a valid, purpose-appropriate advisory payload from the structured
 * context. This is rule-based interpretation — not a model — so results are
 * fully predictable and safe to assert on in tests.
 */
function buildAdvisory(purpose: AIPurpose, context: Record<string, unknown>): string {
  const findings: unknown[] = [];
  const recommendations: unknown[] = [];
  const limitations: unknown[] = [];

  const det = Array.isArray(context.deterministicFindings)
    ? (context.deterministicFindings as Array<Record<string, unknown>>)
    : [];

  // Interpret the deterministic evidence we were given, in priority order.
  det.slice(0, 5).forEach((d, i) => {
    const code = String(d.code ?? `finding_${i}`);
    findings.push({
      code: `interp_${code}`,
      category: String(d.category ?? categoryForPurpose(purpose)),
      severity: d.blocking === true ? 'critical' : 'attention',
      message: `Review required: ${String(d.statement ?? code)}`,
      explanation:
        'Interpretation of a deterministic StitchFlow finding. The deterministic engine remains authoritative for the underlying values.',
      source: 'ai_inference',
      evidence: [code],
      confidence: 'medium',
      requiresHumanVerification: true,
    });
    recommendations.push({
      code: `act_${code}`,
      category: String(d.category ?? categoryForPurpose(purpose)),
      action: `Verify "${String(d.statement ?? code)}" before proceeding.`,
      rationale: 'Deterministic evidence flagged this item; a human check resolves it.',
      priority: d.blocking === true ? 1 : 10 + i,
      source: 'recommendation',
      evidence: [code],
      confidence: 'medium',
    });
  });

  if (det.length === 0) {
    limitations.push({
      code: 'no_deterministic_evidence',
      description: 'No deterministic findings were supplied for this subject.',
      resolution: 'Record the relevant measurement, design, fabric or production data, then request the review again.',
    });
  }

  const summary =
    det.length === 0
      ? 'No deterministic findings were available, so no interpretation could be offered.'
      : `Reviewed ${det.length} deterministic finding(s) and prioritised the items needing human verification.`;

  return JSON.stringify({
    purpose,
    summary,
    findings,
    recommendations,
    limitations,
    confidence: det.length === 0 ? 'none' : 'medium',
  });
}

function categoryForPurpose(purpose: AIPurpose): string {
  switch (purpose) {
    case 'measurement_review':
      return 'measurement';
    case 'design_review':
      return 'design';
    case 'fabric_review':
      return 'fabric';
    case 'production_review':
      return 'workflow';
    case 'customer_explanation':
      return 'communication';
    default:
      return 'measurement';
  }
}

export function createDeterministicAIProvider(
  options: DeterministicProviderOptions = {},
): AIProvider {
  const failure: SimulatedFailure = options.failure ?? 'none';
  const name = options.name ?? 'deterministic-test';

  async function respond(req: AIRequest): Promise<AIResponse> {
    if (options.latencyMs && options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, options.latencyMs));
    }

    switch (failure) {
      case 'timeout':
        // Never settles within any sane gateway timeout. `unref()` keeps the
        // pending timer from holding the Node event loop open, so a timed-out
        // provider cannot stall process exit (or a Jest run).
        await new Promise((r) => {
          const t = setTimeout(r, 60_000);
          if (typeof t === 'object' && typeof t.unref === 'function') t.unref();
        });
        break;
      case 'rate_limit':
        throw new SimulatedProviderError('rate_limit', 'Rate limit exceeded (429)');
      case 'network':
        throw new SimulatedProviderError('network', 'ECONNREFUSED: network failure');
      case 'provider_error':
        throw new SimulatedProviderError('provider_error', 'Provider returned 500');
      case 'malformed':
        return { text: 'I think the garment looks fine, honestly.', provider: name };
      case 'empty':
        return { text: '', provider: name };
      case 'schema_violation':
        // Valid JSON, invalid shape (missing required keys, bad enum).
        return {
          text: JSON.stringify({ purpose: 'not_a_real_purpose', summary: 42 }),
          provider: name,
        };
      case 'contradicts_deterministic':
        return {
          text: JSON.stringify({
            purpose: (req.purpose as AIPurpose) ?? 'fabric_review',
            summary: 'Everything looks good.',
            findings: [
              {
                code: 'ai_all_clear',
                category: 'fabric',
                severity: 'info',
                message: 'The fabric width is compatible and this should be fine.',
                explanation: 'No concerns identified; safe to proceed with cutting.',
                source: 'ai_inference',
                evidence: [],
                confidence: 'high',
                requiresHumanVerification: false,
              },
            ],
            recommendations: [],
            limitations: [],
            confidence: 'high',
          }),
          provider: name,
        };
      default:
        break;
    }

    const purpose = (req.purpose as AIPurpose) ?? 'measurement_review';
    return {
      text: buildAdvisory(purpose, req.context ?? {}),
      provider: name,
      model: 'deterministic-rules-v1',
      costMetadata: { estimatedCostUsd: 0, tokensIn: 0, tokensOut: 0 },
    };
  }

  return {
    name,
    async generate(req) {
      return respond(req);
    },
    async analyze(req) {
      const res = await respond(req);
      return { text: res.text };
    },
    async classify(_req, labels) {
      return { label: labels[0] ?? 'unknown', confidence: 0.5 };
    },
    async summarize(req) {
      const res = await respond(req);
      return res.text;
    },
  };
}

/** Convenience: the default zero-config deterministic provider. */
export const deterministicAIProvider: AIProvider = createDeterministicAIProvider();
