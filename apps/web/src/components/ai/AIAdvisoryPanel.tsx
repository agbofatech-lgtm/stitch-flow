/**
 * Phase 17 — AI Advisory Panel.
 *
 * A CONTEXTUAL intelligence surface, not a chatbot (§28). It is embedded in
 * the workspace where the question naturally arises, and it always makes
 * three things visible:
 *
 *   1. WHAT IS FACT   — deterministic findings, labelled "Verified by StitchFlow"
 *   2. WHAT IS AI     — interpretation, labelled "AI interpretation"
 *   3. WHAT IS UNKNOWN— limitations, stated plainly
 *
 * The panel renders deterministic content even when AI is unavailable, so
 * the tailor never loses information because a provider is down.
 */

import React, { useCallback, useState } from 'react';
import {
  sourceLabel,
  unavailableMessage,
  type AIAdvisory,
  type AIConfidence,
  type AIFinding,
  type AIProviderStatus,
} from '../../shared/api/ai';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-50 border-red-300 text-red-900',
  attention: 'bg-amber-50 border-amber-300 text-amber-900',
  advisory: 'bg-blue-50 border-blue-200 text-blue-900',
  info: 'bg-gray-50 border-gray-200 text-gray-800',
};

const SOURCE_BADGE: Record<string, string> = {
  deterministic: 'bg-green-100 text-green-800 border-green-300',
  ai_inference: 'bg-violet-100 text-violet-800 border-violet-300',
  recommendation: 'bg-blue-100 text-blue-800 border-blue-300',
  unknown: 'bg-gray-100 text-gray-700 border-gray-300',
  human_input: 'bg-slate-100 text-slate-700 border-slate-300',
};

function confidenceLabel(c: AIConfidence): string {
  switch (c) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Moderate confidence';
    case 'low':
      return 'Low confidence';
    case 'none':
    default:
      return 'Not enough evidence';
  }
}

function FindingCard({ finding }: { finding: AIFinding }) {
  const style = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.info;
  return (
    <li className={`rounded-lg border px-3 py-2 ${style}`} data-testid="ai-finding">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{finding.message}</p>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            SOURCE_BADGE[finding.source] ?? SOURCE_BADGE.unknown
          }`}
          data-testid="ai-source-badge"
        >
          {sourceLabel(finding.source)}
        </span>
      </div>
      <p className="mt-1 text-xs opacity-90">{finding.explanation}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-80">
        <span>{confidenceLabel(finding.confidence)}</span>
        {finding.requiresHumanVerification && (
          <span className="font-semibold" data-testid="ai-verify-flag">
            Requires your verification
          </span>
        )}
        {finding.evidence.length > 0 && <span>Based on: {finding.evidence.join(', ')}</span>}
      </div>
    </li>
  );
}

export interface AIAdvisoryPanelProps {
  title: string;
  /** Button label — the AI call is always an explicit user action. */
  actionLabel: string;
  advisory: AIAdvisory | null;
  status: AIProviderStatus | null;
  isLoading: boolean;
  error: string | null;
  onRequest: () => void;
}

export default function AIAdvisoryPanel({
  title,
  actionLabel,
  advisory,
  status,
  isLoading,
  error,
  onRequest,
}: AIAdvisoryPanelProps) {
  const aiUnavailable = status !== null && !status.enabled;

  return (
    <section aria-label={title} className="space-y-3" data-testid="ai-advisory-panel">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-[11px] text-gray-500">
            AI-Assisted Advisory · StitchFlow calculations remain authoritative
          </p>
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={isLoading}
          data-testid="ai-request-button"
          className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isLoading ? 'Analyzing…' : actionLabel}
        </button>
      </header>

      {/* Unavailable state — reassuring, never alarming */}
      {aiUnavailable && !advisory && (
        <p
          className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
          data-testid="ai-unavailable"
        >
          {unavailableMessage(status!)}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <p className="text-xs text-gray-500" data-testid="ai-loading">
          Reviewing deterministic results…
        </p>
      )}

      {/* Error state — never blocks the workflow */}
      {error && !isLoading && (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="ai-error"
        >
          {error} Your tailoring data is unaffected.
        </p>
      )}

      {advisory && !isLoading && (
        <div className="space-y-3" data-testid="ai-advisory-result">
          {/* Provenance banner */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="rounded border border-violet-300 bg-violet-100 px-1.5 py-0.5 font-bold uppercase text-violet-800"
              data-testid="ai-advisory-label"
            >
              Advisory only
            </span>
            {advisory.aiGenerated ? (
              <span className="text-gray-600" data-testid="ai-generated-label">
                Includes AI interpretation ({advisory.provenance.provider})
              </span>
            ) : (
              <span className="text-gray-600" data-testid="ai-deterministic-label">
                Deterministic results only — no AI was used
              </span>
            )}
            {advisory.requiresHumanReview && (
              <span className="font-semibold text-amber-800" data-testid="ai-human-review">
                Human review required
              </span>
            )}
          </div>

          <p className="text-sm text-gray-800">{advisory.summary}</p>

          {/* Suppressed AI claims — deterministic precedence made visible */}
          {advisory.deterministicConflicts.length > 0 && (
            <div
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2"
              data-testid="ai-conflicts"
            >
              <p className="text-xs font-bold text-red-900">
                StitchFlow overruled the AI on {advisory.deterministicConflicts.length} point(s)
              </p>
              <ul className="mt-1 space-y-1">
                {advisory.deterministicConflicts.map((c, i) => (
                  <li key={i} className="text-[11px] text-red-800">
                    “{c.suppressedAIClaim}” was suppressed — {c.deterministicStatement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advisory.findings.length > 0 && (
            <ul className="space-y-2">
              {advisory.findings.map((f, i) => (
                <FindingCard key={`${f.code}-${i}`} finding={f} />
              ))}
            </ul>
          )}

          {advisory.recommendations.length > 0 && (
            <div data-testid="ai-recommendations">
              <p className="text-xs font-bold text-gray-900">Suggested next steps</p>
              <ol className="mt-1 space-y-1">
                {advisory.recommendations.map((r, i) => (
                  <li key={`${r.code}-${i}`} className="text-xs text-gray-700">
                    <span className="font-semibold">{r.action}</span> — {r.rationale}
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-[11px] italic text-gray-500">
                Suggestions only. Nothing is applied until you choose to act.
              </p>
            </div>
          )}

          {/* Limitations are mandatory — silence would imply false certainty */}
          {advisory.limitations.length > 0 && (
            <div data-testid="ai-limitations">
              <p className="text-xs font-bold text-gray-900">What this review could not determine</p>
              <ul className="mt-1 space-y-1">
                {advisory.limitations.map((l, i) => (
                  <li key={`${l.code}-${i}`} className="text-[11px] text-gray-600">
                    {l.description} <span className="italic">{l.resolution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hook — encapsulates the request lifecycle so surfaces stay declarative
// ---------------------------------------------------------------------------

export function useAIAdvisory(request: () => Promise<AIAdvisory>) {
  const [advisory, setAdvisory] = useState<AIAdvisory | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAdvisory(await request());
    } catch {
      // An AI failure is never fatal to the surrounding workflow.
      setError('AI assistance could not be reached.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  return { advisory, isLoading, error, run };
}
