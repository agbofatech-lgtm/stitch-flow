/** Stage 4 asset bindings for Stage 7 surfaces (manifest-registered runtime derivatives only). */
export type EmptyStateKey = 'no-customers' | 'no-orders' | 'no-results';

const BASE = '/assets/illustrations/empty-states';
const SOURCES: Record<EmptyStateKey, string> = {
  'no-customers': `${BASE}/empty-state-no-customers-01-card-800.webp`,
  'no-orders': `${BASE}/empty-state-no-orders-01-card-800.webp`,
  'no-results': `${BASE}/empty-state-no-results-01-card-800.webp`,
};

export function emptyStateSrc(key: EmptyStateKey): string {
  return SOURCES[key];
}
