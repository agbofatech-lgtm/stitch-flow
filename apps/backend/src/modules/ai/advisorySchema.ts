/**
 * Phase 17 — AI output validation (§39).
 *
 * NEVER TRUST PROVIDER OUTPUT.
 *
 * Pipeline: provider response -> parse -> schema validation -> normalize
 *           -> attach provenance -> mark advisory -> return.
 *
 * A malformed provider response must NEVER reach the UI and must NEVER
 * throw into the request pipeline. Validation failure is a controlled
 * outcome (`SCHEMA_VALIDATION_FAILURE`) that degrades to the deterministic
 * advisory instead.
 */

import { z } from 'zod';
import {
  AI_PURPOSES,
  type AIFinding,
  type AILimitation,
  type AIRecommendation,
} from './types';

// ---------------------------------------------------------------------------
// Primitive enums — kept in lockstep with types.ts
// ---------------------------------------------------------------------------

const severitySchema = z.enum(['info', 'advisory', 'attention', 'critical']);

const categorySchema = z.enum([
  'measurement',
  'design',
  'fabric',
  'pattern',
  'layout',
  'materials',
  'workflow',
  'quality',
  'fit_risk',
  'communication',
]);

const confidenceSchema = z.enum(['none', 'low', 'medium', 'high']);

/**
 * A provider may only ever claim `ai_inference`, `recommendation` or
 * `unknown`. It must NOT be able to label its own output `deterministic` —
 * that would let a model masquerade as the authoritative engine (§17).
 * Deterministic findings are attached by our own code, never parsed.
 */
const providerSourceSchema = z.enum(['ai_inference', 'recommendation', 'unknown']);

// ---------------------------------------------------------------------------
// Bounds — defensive limits against oversized/abusive model output
// ---------------------------------------------------------------------------

const MAX_ITEMS = 20;
const MAX_TEXT = 2000;
const MAX_CODE = 120;

const boundedText = z.string().trim().min(1).max(MAX_TEXT);
const boundedCode = z.string().trim().min(1).max(MAX_CODE);

// ---------------------------------------------------------------------------
// Element schemas
// ---------------------------------------------------------------------------

const findingSchema = z.object({
  code: boundedCode,
  category: categorySchema,
  severity: severitySchema,
  message: boundedText,
  explanation: boundedText,
  source: providerSourceSchema,
  evidence: z.array(boundedCode).max(MAX_ITEMS).default([]),
  confidence: confidenceSchema,
  requiresHumanVerification: z.boolean().default(true),
});

const recommendationSchema = z.object({
  code: boundedCode,
  category: categorySchema,
  action: boundedText,
  rationale: boundedText,
  priority: z.number().int().min(1).max(99).default(50),
  source: providerSourceSchema,
  evidence: z.array(boundedCode).max(MAX_ITEMS).default([]),
  confidence: confidenceSchema,
});

const limitationSchema = z.object({
  code: boundedCode,
  description: boundedText,
  resolution: boundedText,
});

/**
 * The shape a provider is instructed to return.
 * Unknown keys are stripped (Zod default), so a provider cannot smuggle
 * extra fields through into our domain objects.
 */
export const providerAdvisorySchema = z.object({
  purpose: z.enum(AI_PURPOSES),
  summary: boundedText,
  findings: z.array(findingSchema).max(MAX_ITEMS).default([]),
  recommendations: z.array(recommendationSchema).max(MAX_ITEMS).default([]),
  limitations: z.array(limitationSchema).max(MAX_ITEMS).default([]),
  confidence: confidenceSchema,
});

export type ProviderAdvisory = z.infer<typeof providerAdvisorySchema>;

// ---------------------------------------------------------------------------
// Controlled parse
// ---------------------------------------------------------------------------

export type ParseOutcome =
  | { ok: true; value: ProviderAdvisory }
  | { ok: false; reason: 'MALFORMED_RESPONSE' | 'SCHEMA_VALIDATION_FAILURE' | 'EMPTY_RESPONSE'; detail: string };

/**
 * Parse and validate raw provider text.
 *
 * Total function: it never throws, whatever the provider returns.
 * Handles the common real-world case of a model wrapping JSON in prose or
 * markdown fences by extracting the outermost JSON object.
 */
export function parseProviderAdvisory(raw: unknown): ParseOutcome {
  if (raw === null || raw === undefined) {
    return { ok: false, reason: 'EMPTY_RESPONSE', detail: 'Provider returned no content' };
  }

  let candidate: unknown = raw;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return { ok: false, reason: 'EMPTY_RESPONSE', detail: 'Provider returned empty text' };
    }

    const json = extractJsonObject(trimmed);
    if (json === null) {
      return { ok: false, reason: 'MALFORMED_RESPONSE', detail: 'No JSON object found in provider output' };
    }

    try {
      candidate = JSON.parse(json);
    } catch {
      return { ok: false, reason: 'MALFORMED_RESPONSE', detail: 'Provider output is not valid JSON' };
    }
  }

  const result = providerAdvisorySchema.safeParse(candidate);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      reason: 'SCHEMA_VALIDATION_FAILURE',
      detail: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Schema validation failed',
    };
  }

  return { ok: true, value: result.data };
}

/**
 * Extract the outermost balanced JSON object from a string, tolerating
 * markdown fences and surrounding prose. Brace counting is string-aware so
 * braces inside JSON string literals do not break balancing.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalisation into domain objects
// ---------------------------------------------------------------------------

/**
 * Convert validated provider output into domain findings.
 *
 * Any finding claiming certainty without evidence is downgraded: a model
 * may not assert `high` confidence with no deterministic reference behind
 * it (§23 — do not claim certainty without deterministic evidence).
 */
export function normalizeFindings(items: ProviderAdvisory['findings']): AIFinding[] {
  return items.map((f) => {
    const hasEvidence = f.evidence.length > 0;
    const confidence = !hasEvidence && f.confidence === 'high' ? 'medium' : f.confidence;
    return {
      code: f.code,
      category: f.category,
      severity: f.severity,
      message: f.message,
      explanation: f.explanation,
      source: f.source,
      evidence: f.evidence,
      confidence: f.source === 'unknown' ? 'none' : confidence,
      // AI-sourced findings always require human verification.
      requiresHumanVerification: true,
    };
  });
}

export function normalizeRecommendations(
  items: ProviderAdvisory['recommendations'],
): AIRecommendation[] {
  return items
    .map((r) => ({
      code: r.code,
      category: r.category,
      action: r.action,
      rationale: r.rationale,
      priority: r.priority,
      source: r.source,
      evidence: r.evidence,
      confidence: r.source === 'unknown' ? ('none' as const) : r.confidence,
    }))
    .sort((a, b) => a.priority - b.priority);
}

export function normalizeLimitations(items: ProviderAdvisory['limitations']): AILimitation[] {
  return items.map((l) => ({
    code: l.code,
    description: l.description,
    resolution: l.resolution,
  }));
}
