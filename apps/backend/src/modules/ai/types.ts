/**
 * Phase 17 — AI Tailoring Intelligence domain contracts.
 *
 * These contracts EXTEND the Phase 7 provider foundation
 * (`src/providers/contracts.ts`). They do not replace it and they do not
 * create a competing provider architecture: `AIProvider`, `AIRequest`,
 * `AIResponse` and `providerRegistry` remain the transport-level boundary.
 * This module adds the TAILORING-DOMAIN layer on top of that transport.
 *
 * NON-NEGOTIABLE PRINCIPLES ENCODED HERE
 * --------------------------------------
 * 1. AI is ADVISORY. Every advisory carries `advisory: true` and
 *    `aiGenerated`, mirroring the Phase 7 `DiagnosticOutput` precedent.
 * 2. AI NEVER becomes the source of truth for measurements, pattern
 *    geometry, fabric consumption, production state, QC or money. Those
 *    remain the deterministic Phase 13/14/15/16 engines.
 * 3. Evidence is CLASSIFIED. A statement is either a deterministic FACT,
 *    an AI INFERENCE, a RECOMMENDATION or explicitly UNKNOWN. These are
 *    never blended invisibly (§30 traceability).
 * 4. DETERMINISTIC PRECEDENCE (§40): if AI contradicts a deterministic
 *    blocker, the deterministic result wins and the contradiction is
 *    recorded — never silently dropped.
 * 5. Context is PURPOSE-SCOPED and allowlisted (§15/§22). No raw records.
 */

// ---------------------------------------------------------------------------
// AI purposes — the closed set of things Phase 17 AI is allowed to do
// ---------------------------------------------------------------------------

/**
 * Every AI interaction must declare a purpose from this closed set.
 * A purpose determines: the allowed context fields, the system role, the
 * expected output schema, and the audit classification.
 *
 * There is deliberately NO "general chat" purpose (§28).
 */
export const AI_PURPOSES = [
  'measurement_review',
  'design_review',
  'fabric_review',
  'production_review',
  'customer_explanation',
] as const;

export type AIPurpose = (typeof AI_PURPOSES)[number];

export function isAIPurpose(value: unknown): value is AIPurpose {
  return typeof value === 'string' && (AI_PURPOSES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Evidence classification — FACT vs INFERENCE vs RECOMMENDATION vs UNKNOWN
// ---------------------------------------------------------------------------

/**
 * §17/§30. Never allow AI confidence to masquerade as deterministic certainty.
 *
 * - `deterministic` — produced by a Phase 13/14/15/16 engine. Authoritative.
 * - `ai_inference`  — model interpretation of deterministic evidence. Advisory.
 * - `recommendation`— a suggested HUMAN action. Never auto-executed.
 * - `unknown`       — insufficient evidence. The honest answer.
 * - `human_input`   — supplied by the tailor.
 */
export type EvidenceSource =
  | 'deterministic'
  | 'ai_inference'
  | 'recommendation'
  | 'unknown'
  | 'human_input';

export type AISeverity = 'info' | 'advisory' | 'attention' | 'critical';

export type AIFindingCategory =
  | 'measurement'
  | 'design'
  | 'fabric'
  | 'pattern'
  | 'layout'
  | 'materials'
  | 'workflow'
  | 'quality'
  | 'fit_risk'
  | 'communication';

/**
 * Confidence is a coarse band, never a false-precision percentage.
 * `none` is required when the source is `unknown`.
 */
export type AIConfidence = 'none' | 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// Findings / recommendations / limitations
// ---------------------------------------------------------------------------

/**
 * A single advisory statement.
 *
 * `source` is mandatory so the UI can visibly separate deterministic fact
 * from AI interpretation. `evidence` points back at the deterministic
 * artefact that justified the statement (e.g. a blocker code, a definition
 * code) so a tailor can audit the claim.
 */
export interface AIFinding {
  /** Stable identifier for UI keys and tests. */
  code: string;
  category: AIFindingCategory;
  severity: AISeverity;
  /** What the tailor is being told. */
  message: string;
  /** WHY — the reasoning or the deterministic rule behind the message. */
  explanation: string;
  /** Where this came from — never blend sources invisibly (§30). */
  source: EvidenceSource;
  /**
   * References to the deterministic evidence that justified this finding:
   * blocker codes, measurement definition codes, allowance names, etc.
   */
  evidence: string[];
  confidence: AIConfidence;
  /** True when a human must physically verify before acting. */
  requiresHumanVerification: boolean;
}

export interface AIRecommendation {
  code: string;
  category: AIFindingCategory;
  /** The suggested HUMAN action. Never executed automatically (§18). */
  action: string;
  rationale: string;
  /** Ordering hint for the tailor's attention. 1 = do this first. */
  priority: number;
  source: EvidenceSource;
  evidence: string[];
  confidence: AIConfidence;
}

/**
 * An explicit statement of what the advisory could NOT determine.
 * Surfacing limitations is mandatory (§27) — silence implies false certainty.
 */
export interface AILimitation {
  code: string;
  description: string;
  /** What would resolve it (e.g. "record chest_circumference"). */
  resolution: string;
}

// ---------------------------------------------------------------------------
// Provenance — auditability of every advisory
// ---------------------------------------------------------------------------

/**
 * How the advisory was produced. `provider` is the transport that answered;
 * `deterministicInputs` names the engines whose output fed the context.
 */
export interface AIProvenance {
  purpose: AIPurpose;
  /** Provider name, or 'none' when no provider answered. */
  provider: string;
  model: string | null;
  /** Which deterministic engines supplied the evidence. */
  deterministicInputs: string[];
  /** Correlation id shared with audit_logs / X-Request-Id. */
  requestId: string | null;
  workspaceId: string;
  generatedAt: string;
  /** True when the result came from deterministic fallback, not a model. */
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// Deterministic precedence (§40)
// ---------------------------------------------------------------------------

/**
 * Recorded when an AI statement contradicts a deterministic blocker.
 * The deterministic side ALWAYS wins; the AI claim is suppressed but the
 * conflict is preserved so the behaviour is inspectable rather than silent.
 */
export interface DeterministicConflict {
  /** The deterministic finding that takes precedence. */
  deterministicCode: string;
  deterministicStatement: string;
  /** The AI claim that was suppressed. */
  suppressedAIClaim: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// The advisory — the single structured output of the Phase 17 AI layer
// ---------------------------------------------------------------------------

export type AIAdvisoryStatus =
  /** A provider produced a validated advisory. */
  | 'ok'
  /** Deterministic-only advisory: no provider, or provider failed. */
  | 'degraded'
  /** Nothing could be produced (should be rare; still non-throwing). */
  | 'unavailable';

/**
 * The ONLY shape the Phase 17 AI layer returns to callers/UI.
 *
 * Note there is no free-form "text" field at the top level: Phase 17 is
 * built on structured advisories, not prose blobs (§17). `summary` is a
 * short human sentence, but the substance lives in typed collections.
 */
export interface AIAdvisory {
  purpose: AIPurpose;
  status: AIAdvisoryStatus;
  /** Short human-readable headline. Always safe to display. */
  summary: string;
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  /** Deterministic risks preserved verbatim — AI cannot remove these. */
  risks: AIFinding[];
  limitations: AILimitation[];
  /** Overall confidence in the ADVISORY (never in the deterministic facts). */
  confidence: AIConfidence;
  /** Always true in Phase 17. AI never has mutation authority (§18). */
  advisory: true;
  /** True when model output contributed. False for deterministic fallback. */
  aiGenerated: boolean;
  /** True when a human must review before any action is taken. */
  requiresHumanReview: boolean;
  /** Conflicts where deterministic evidence overrode an AI claim (§40). */
  deterministicConflicts: DeterministicConflict[];
  provenance: AIProvenance;
}

// ---------------------------------------------------------------------------
// Provider status / failure taxonomy (§26)
// ---------------------------------------------------------------------------

/**
 * The complete set of AI failure modes Phase 17 must survive gracefully.
 * Every one of these must degrade to a deterministic advisory rather than
 * throwing into the request pipeline.
 */
export const AI_FAILURE_REASONS = [
  'NO_PROVIDER',
  'PROVIDER_DISABLED',
  'INVALID_API_CONFIGURATION',
  'TIMEOUT',
  'RATE_LIMIT',
  'NETWORK_FAILURE',
  'MALFORMED_RESPONSE',
  'SCHEMA_VALIDATION_FAILURE',
  'PROVIDER_ERROR',
  'EMPTY_RESPONSE',
] as const;

export type AIFailureReason = (typeof AI_FAILURE_REASONS)[number];

export interface AIProviderStatus {
  /** Is any provider registered at all? */
  configured: boolean;
  /** Is the AI feature enabled for this workspace/deployment? */
  enabled: boolean;
  /** Provider name when configured, else null. */
  provider: string | null;
  /** Why AI is not usable, when it is not. */
  reason: AIFailureReason | null;
}

// ---------------------------------------------------------------------------
// Purpose-scoped context (§15/§22)
// ---------------------------------------------------------------------------

/**
 * A purpose-scoped, allowlisted projection of tenant data.
 *
 * `data` is built by a purpose-specific context builder that explicitly
 * selects fields. Raw application objects and raw DB rows must never be
 * assigned here.
 *
 * `allowlist` records WHICH keys were permitted for this purpose, so every
 * request can answer: why was this data included?
 */
export interface AIContext {
  purpose: AIPurpose;
  workspaceId: string;
  /** Pseudonymous reference — never a customer name (§15). */
  subjectRef: string;
  /** The explicitly selected, non-sensitive projection. */
  data: Record<string, unknown>;
  /** The field names permitted for this purpose. */
  allowlist: string[];
  /** Deterministic engines that produced `data`. */
  deterministicInputs: string[];
  /** Known gaps in the context, surfaced as advisory limitations. */
  limitations: AILimitation[];
}

// ---------------------------------------------------------------------------
// Gateway request
// ---------------------------------------------------------------------------

/**
 * A domain-level AI request. The gateway converts this into the Phase 7
 * transport-level `AIRequest`. Callers never construct an `AIRequest`
 * directly and never touch a provider (§13).
 */
export interface AIAdvisoryRequest {
  purpose: AIPurpose;
  /** Server-derived. Never taken from the client body (§16). */
  workspaceId: string;
  actorId: string | null;
  requestId: string | null;
  context: AIContext;
}
