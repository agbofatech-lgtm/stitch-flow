import crypto from 'crypto';
import type {
  DiagnosticProvider,
  DiagnosticInput,
  DiagnosticOutput,
} from './contracts';

/**
 * Deterministic, dependency-free diagnostic placeholder (Step 33).
 *
 * Produces rule-based advisory output from observed patterns — the same
 * incident always yields the same diagnosis. No network, no model, no
 * cost. A future AI-backed provider can replace it behind the same
 * interface without touching callers.
 */
function ruleFor(input: DiagnosticInput): DiagnosticOutput {
  const suggestions: string[] = [];
  const tests: string[] = [];
  let cause: string;

  const msg = (input.recentErrors[0]?.message ?? '').toLowerCase();

  if (msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('53300') || msg.includes('connection')) {
    cause = 'A dependency (most likely PostgreSQL) was unreachable or saturated when the errors occurred.';
    suggestions.push('Check /health/ready history for database readiness dips at the same time.');
    suggestions.push('Compare database.errors metric spikes with incident occurrence timestamps.');
    tests.push('Verify the application stays alive (live 200) while ready reports 503 during a DB outage.');
  } else if (msg.includes('duplicate key') || msg.includes('23505')) {
    cause = 'A uniqueness constraint rejected a write — usually a replayed mutation hitting idempotency protection.';
    suggestions.push('Inspect the client mutation id of the failing rows for replay behavior.');
    tests.push('Replay the same clientMutationId twice and assert exactly one business object is created.');
  } else if (msg.includes('jwt') || msg.includes('401') || msg.includes('token')) {
    cause = 'Authentication failure pattern — expired/invalid credentials or a rejected refresh replay.';
    suggestions.push('Check auth.failures metric for credential-stuffing bursts.');
    tests.push('Verify expired and malformed tokens are rejected with 401 INVALID_TOKEN.');
  } else if (input.occurrenceCount > 50) {
    cause = 'High-frequency recurrence suggests a systematic fault (deployment, schema drift, or upstream change) rather than user-specific conditions.';
    suggestions.push('Correlate first occurrence time with the release timeline (/health/version history).');
    tests.push('Run the full regression battery against the version active when the spike began.');
  } else {
    cause = 'No deterministic rule matched; inspect the most recent raw occurrences for a shared signature.';
    suggestions.push('Group occurrences by requestId and inspect correlated audit rows.');
    tests.push('Reproduce the failing route with the recorded (redacted) metadata.');
  }

  return {
    source: 'rule-based',
    aiGenerated: false, // deterministic rules, not model output
    severity: input.occurrenceCount > 50 ? 'fatal' : 'error',
    probableCause: cause,
    confidence: input.occurrenceCount > 10 ? 0.8 : 0.5,
    reproductionSteps: suggestions,
    suggestedTests: tests,
    suggestedRemediation: ['Review the suggested reproduction path, then decide a fix — human approval required before any change.'],
    advisory: true,
  };
}

export const ruleBasedDiagnosticProvider: DiagnosticProvider = {
  name: 'rule-based',
  analyzeIncident(input: DiagnosticInput): Promise<DiagnosticOutput> {
    return Promise.resolve(ruleFor(input));
  },
};

/** Deterministic error fingerprint (Step 31): safe characteristics only. */
export function fingerprintError(params: {
  errorCode: string;
  route?: string | null;
  feature?: string | null;
  errorType?: string | null;
}): string {
  const normalizedType = (params.errorType ?? '').toLowerCase().replace(/\s+/g, '-');
  const basis = [params.errorCode, params.route ?? '', params.feature ?? '', normalizedType]
    .map((part) => String(part).trim().toLowerCase())
    .join('|');
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}
