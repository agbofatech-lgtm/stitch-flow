/**
 * T3 domain ownership. FACT assignments only.
 * Unassignable capabilities must STOP — do not guess (T3 stop condition).
 */

export type DomainOwner =
  | 'pattern-engine'
  | 'production-assistant'
  | 'production-stage-service'
  | 'measurement-domain'
  | 'order-domain'
  | 'production-domain'
  | 'experience-not-domain'
  | 't2-persistence'
  | 'intelligence-application'
  | 'unassignable';

export type OwnershipRecord = {
  capability: string;
  owner: DomainOwner;
  layer: 'DOMAIN' | 'APPLICATION' | 'EXPERIENCE' | 'INFRASTRUCTURE' | 'LOCKED';
  fact: string;
  assignable: boolean;
};

export class DomainUnassignableError extends Error {
  constructor(public capability: string) {
    super(
      `STOP: domain ownership for "${capability}" is unassignable. Do not guess. T3 stop condition.`
    );
    this.name = 'DomainUnassignableError';
  }
}

export const DOMAIN_OWNERSHIP: OwnershipRecord[] = [
  {
    capability: 'pattern-draft-generation',
    owner: 'pattern-engine',
    layer: 'DOMAIN',
    fact: 'apps/web/src/modules/services/patternEngine.ts — protected pure functions',
    assignable: true,
  },
  {
    capability: 'production-plan-heuristics',
    owner: 'production-assistant',
    layer: 'DOMAIN',
    fact: 'apps/web/src/modules/services/productionAssistant.ts — protected heuristics, not ML',
    assignable: true,
  },
  {
    capability: 'production-stage-codes',
    owner: 'production-stage-service',
    layer: 'DOMAIN',
    fact: 'apps/backend/src/services/productionStageService.ts — protected, unmounted under npm scripts',
    assignable: true,
  },
  {
    capability: 'body-measurement',
    owner: 'measurement-domain',
    layer: 'DOMAIN',
    fact: 'Body-taken dimensions. Canonical BodyMeasurement. Legacy mixed in GarmentMeasurements blob.',
    assignable: true,
  },
  {
    capability: 'garment-measurement',
    owner: 'measurement-domain',
    layer: 'DOMAIN',
    fact: 'Garment-oriented lengths and notes. Distinct from body-taken fields.',
    assignable: true,
  },
  {
    capability: 'pattern-measurement',
    owner: 'pattern-engine',
    layer: 'DOMAIN',
    fact: 'Derived projection of body+garment into engine input keys. Not an independent store.',
    assignable: true,
  },
  {
    capability: 'order-job',
    owner: 'order-domain',
    layer: 'DOMAIN',
    fact: 'Order is the customer job. AppContext localStorage remains TRANSITIONAL SoT.',
    assignable: true,
  },
  {
    capability: 'production-plan-record',
    owner: 'production-domain',
    layer: 'DOMAIN',
    fact: 'Heuristic plan attached to Order. Derived; regenerate rather than invent geometry.',
    assignable: true,
  },
  {
    capability: 'local-persistence',
    owner: 't2-persistence',
    layer: 'INFRASTRUCTURE',
    fact: 'T2 repositories / IndexedDB / MemoryStore. No new localStorage in T3.',
    assignable: true,
  },
  {
    capability: 'design-studio-canvas-silhouettes',
    owner: 'experience-not-domain',
    layer: 'EXPERIENCE',
    fact: 'buildUpperGarmentShape / skirt / trouser in DesignStudio.tsx — not pattern geometry',
    assignable: true,
  },
  {
    capability: 'ai-advisory',
    owner: 'intelligence-application',
    layer: 'APPLICATION',
    fact: 'Phase 17 read-only advisory (ADR-004). Must not mutate P13–P16 authorities. productionAssistant remains a heuristic, not an LLM.',
    assignable: true,
  },
  {
    capability: '3d-fitting',
    owner: 'unassignable',
    layer: 'LOCKED',
    fact: 'ADR-005. Not authorized in T3.',
    assignable: false,
  },
  {
    capability: 'saas-billing',
    owner: 'unassignable',
    layer: 'LOCKED',
    fact: 'ADR-006. Commercial platform locked.',
    assignable: false,
  },
  {
    capability: 'agbofa-control-center',
    owner: 'unassignable',
    layer: 'LOCKED',
    fact: 'ADR-007. Does not exist in this repository.',
    assignable: false,
  },
];

export function requireOwner(capability: string): OwnershipRecord {
  const record = DOMAIN_OWNERSHIP.find((item) => item.capability === capability);
  if (!record) {
    throw new DomainUnassignableError(capability);
  }
  if (!record.assignable) {
    throw new DomainUnassignableError(capability);
  }
  return record;
}
