/**
 * In-process observability registry (Phase 6).
 *
 * Dependency-free counters and histograms with a JSON-safe snapshot.
 * Scope: operational signals only (request counts, latency, failure
 * classes). No personal data, no payloads, no identifiers beyond coarse
 * route classes — safe for future export to a control plane / AI
 * diagnostics layer without privacy review.
 */

interface HistogramSummary {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

class Counter {
  private value = 0;
  inc(n = 1): void {
    this.value += n;
  }
  get(): number {
    return this.value;
  }
}

class Histogram {
  private samples: number[] = [];
  observe(value: number): void {
    // Ring-buffer semantics: cap memory while keeping recent-window accuracy.
    if (this.samples.length >= 5000) this.samples.shift();
    this.samples.push(value);
  }
  summary(): HistogramSummary {
    if (this.samples.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    // Nearest-rank percentiles (deterministic, matches common dashboards).
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
    return {
      count: sorted.length,
      sum: sorted.reduce((a, b) => a + b, 0),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: at(0.5),
      p95: at(0.95),
      p99: at(0.99),
    };
  }
}

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();

function counter(name: string): Counter {
  let c = counters.get(name);
  if (!c) {
    c = new Counter();
    counters.set(name, c);
  }
  return c;
}

function histogram(name: string): Histogram {
  let h = histograms.get(name);
  if (!h) {
    h = new Histogram();
    histograms.set(name, h);
  }
  return h;
}

export function metricsSnapshot(): {
  generatedAt: string;
  counters: Record<string, number>;
  histograms: Record<string, HistogramSummary>;
} {
  const c: Record<string, number> = {};
  for (const [name, ctr] of counters) c[name] = ctr.get();
  const h: Record<string, HistogramSummary> = {};
  for (const [name, hist] of histograms) h[name] = hist.summary();
  return { generatedAt: new Date().toISOString(), counters: c, histograms: h };
}

/**
 * Canonical metric names (kept central so dashboards stay stable):
 * http.requests / http.responses / http.4xx / http.5xx / http.latency_ms
 * auth.failures · sync.failures · payment.failures · webhook.failures · database.errors
 *
 * seedCanonicalMetrics() re-registers these names so the exported handles
 * below always refer to live registry entries — including after
 * resetMetrics() (which would otherwise orphan them).
 */
function seedCanonicalMetrics(): void {
  counter('http.requests');
  counter('http.responses');
  counter('http.4xx');
  counter('http.5xx');
  counter('auth.failures');
  counter('sync.failures');
  counter('payment.failures');
  counter('webhook.failures');
  counter('database.errors');
  histogram('http.latency_ms');
}

export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
  seedCanonicalMetrics();
}

seedCanonicalMetrics();

/**
 * Live accessors: each property access resolves the CURRENT registry entry,
 * so handles can never go stale across resetMetrics().
 */
export const metrics = {
  get requests() {
    return counter('http.requests');
  },
  get responses() {
    return counter('http.responses');
  },
  get http4xx() {
    return counter('http.4xx');
  },
  get http5xx() {
    return counter('http.5xx');
  },
  get authFailures() {
    return counter('auth.failures');
  },
  get syncFailures() {
    return counter('sync.failures');
  },
  get paymentFailures() {
    return counter('payment.failures');
  },
  get webhookFailures() {
    return counter('webhook.failures');
  },
  get databaseErrors() {
    return counter('database.errors');
  },
  get latency() {
    return histogram('http.latency_ms');
  },
};
