/**
 * Phase 17 — DETERMINISTIC PRECEDENCE (§40).
 *
 * MANDATORY PRINCIPLE:
 *
 *   If AI contradicts deterministic intelligence, THE DETERMINISTIC
 *   RESULT WINS.
 *
 * Example:
 *   Deterministic engine: "Fabric width incompatible" (blocking)
 *   AI:                   "This should fit fine"
 *   Result:               the AI claim is SUPPRESSED, the deterministic
 *                         blocker remains visible, and the conflict is
 *                         recorded.
 *
 * This module is the enforcement point. It is deliberately independent of
 * any provider so it can be unit-tested in isolation and so no provider can
 * bypass it.
 */

import type {
  AIFinding,
  AIRecommendation,
  DeterministicConflict,
} from './types';

/**
 * A deterministic assertion that AI is not permitted to contradict.
 * Built from Phase 13/14/15/16 engine output (blockers, warnings, flags).
 */
export interface DeterministicAssertion {
  /** Stable code, e.g. 'fabric_width_incompatible'. */
  code: string;
  /** Human statement of the deterministic fact. */
  statement: string;
  /**
   * True when this assertion blocks progress. Blocking assertions may
   * never be softened or negated by AI.
   */
  blocking: boolean;
  /**
   * Lowercase keywords that, when an AI statement negates them, indicate a
   * contradiction (e.g. ['width', 'fit']).
   */
  keywords: string[];
}

/**
 * Phrases that indicate an AI statement is dismissing/negating a concern.
 * Deliberately conservative: we only suppress when the model is clearly
 * telling the tailor that something is fine / not a problem.
 */
const DISMISSAL_PATTERNS: RegExp[] = [
  /\bno\s+(?:issue|problem|concern|risk)s?\b/i,
  /\bnot\s+(?:an?\s+)?(?:issue|problem|concern|risk|blocker)\b/i,
  /\bshould\s+(?:be\s+)?fine\b/i,
  /\bwill\s+(?:be\s+)?fine\b/i,
  /\bis\s+fine\b/i,
  /\bsafe\s+to\s+(?:proceed|cut|continue)\b/i,
  /\b(?:can|may)\s+(?:safely\s+)?(?:proceed|cut|continue)\b/i,
  /\bno\s+need\s+to\s+(?:verify|check|confirm)\b/i,
  /\bready\s+to\s+cut\b/i,
  /\bignore\b/i,
  /\bcompatible\b/i,
  /\bsufficient\b/i,
  /\bfits?\s+(?:fine|well|easily)\b/i,
];

function isDismissive(text: string): boolean {
  return DISMISSAL_PATTERNS.some((re) => re.test(text));
}

function mentionsAssertion(text: string, assertion: DeterministicAssertion): boolean {
  const lower = text.toLowerCase();
  return assertion.keywords.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * Detect whether an AI statement contradicts a deterministic assertion.
 *
 * A contradiction requires BOTH:
 *  - the statement refers to the same subject (keyword overlap), and
 *  - the statement dismisses/negates a concern.
 */
export function contradicts(text: string, assertion: DeterministicAssertion): boolean {
  if (!mentionsAssertion(text, assertion)) return false;
  return isDismissive(text);
}

export interface PrecedenceResult {
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  conflicts: DeterministicConflict[];
}

/**
 * Apply deterministic precedence to AI output.
 *
 * Any AI finding or recommendation that contradicts a BLOCKING
 * deterministic assertion is removed from the advisory and recorded as a
 * `DeterministicConflict`. Non-blocking assertions do not suppress, because
 * AI is allowed to offer a differing interpretation of a mere warning — but
 * it may never wave away a blocker.
 *
 * Deterministic findings themselves are never touched here: they are
 * assembled by our own code and are not subject to AI edit.
 */
export function applyDeterministicPrecedence(
  findings: AIFinding[],
  recommendations: AIRecommendation[],
  assertions: DeterministicAssertion[],
): PrecedenceResult {
  const blocking = assertions.filter((a) => a.blocking);
  if (blocking.length === 0) {
    return { findings, recommendations, conflicts: [] };
  }

  const conflicts: DeterministicConflict[] = [];

  const keptFindings = findings.filter((f) => {
    // Deterministic findings are authoritative and always survive.
    if (f.source === 'deterministic') return true;

    const text = `${f.message} ${f.explanation}`;
    const hit = blocking.find((a) => contradicts(text, a));
    if (!hit) return true;

    conflicts.push({
      deterministicCode: hit.code,
      deterministicStatement: hit.statement,
      suppressedAIClaim: f.message,
      reason:
        'AI output contradicted a blocking deterministic result. The deterministic engine is authoritative; the AI claim was suppressed.',
    });
    return false;
  });

  const keptRecommendations = recommendations.filter((r) => {
    const text = `${r.action} ${r.rationale}`;
    const hit = blocking.find((a) => contradicts(text, a));
    if (!hit) return true;

    conflicts.push({
      deterministicCode: hit.code,
      deterministicStatement: hit.statement,
      suppressedAIClaim: r.action,
      reason:
        'AI recommendation contradicted a blocking deterministic result. The deterministic engine is authoritative; the AI recommendation was suppressed.',
    });
    return false;
  });

  return { findings: keptFindings, recommendations: keptRecommendations, conflicts };
}

/**
 * Convert deterministic assertions into first-class advisory findings.
 *
 * These are marked `source: 'deterministic'` and carry `confidence: 'high'`
 * because they are engine output, not interpretation. They are always
 * placed in the advisory ahead of AI findings so the tailor reads fact
 * before interpretation.
 */
export function assertionsToFindings(
  assertions: DeterministicAssertion[],
  category: AIFinding['category'],
): AIFinding[] {
  return assertions.map((a) => ({
    code: a.code,
    category,
    severity: a.blocking ? 'critical' : 'attention',
    message: a.statement,
    explanation: a.blocking
      ? 'Produced by the deterministic StitchFlow engine. This is authoritative and blocks progress until resolved.'
      : 'Produced by the deterministic StitchFlow engine. This is authoritative and flagged for review.',
    source: 'deterministic',
    evidence: [a.code],
    confidence: 'high',
    requiresHumanVerification: a.blocking,
  }));
}
