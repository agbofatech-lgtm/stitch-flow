/**
 * T8 measurement provenance. Field-level metadata for trusted capture.
 * Does not rewrite AppContext blobs.
 */

export type MeasurementCaptureSource =
  | 'body-capture'
  | 'profile'
  | 'order-snapshot'
  | 'studio-session'
  | 'derived-formula'
  | 'legacy-blob';

export type VerificationStatus = 'unverified' | 'verified' | 'rejected';

export type MeasurementProvenance = {
  source: MeasurementCaptureSource;
  capturedBy?: string | null;
  capturedAt: string;
  version: number;
  verification: VerificationStatus;
};

const SOURCES = new Set<MeasurementCaptureSource>([
  'body-capture',
  'profile',
  'order-snapshot',
  'studio-session',
  'derived-formula',
  'legacy-blob',
]);

export function isDerivedSource(source: MeasurementCaptureSource): boolean {
  return source === 'derived-formula';
}

export function createProvenance(input: {
  source: MeasurementCaptureSource;
  capturedBy?: string | null;
  capturedAt?: string;
  version?: number;
  verification?: VerificationStatus;
}): MeasurementProvenance {
  if (!SOURCES.has(input.source)) {
    throw new Error('STOP: unknown measurement source');
  }
  const capturedAt = input.capturedAt || new Date().toISOString();
  if (!capturedAt) {
    throw new Error('STOP: capturedAt is required');
  }
  const version = input.version ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('STOP: measurement version must be a positive integer');
  }
  return {
    source: input.source,
    capturedBy: input.capturedBy ?? null,
    capturedAt,
    version,
    verification: input.verification || 'unverified',
  };
}
