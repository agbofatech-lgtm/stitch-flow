/**
 * SAC-2 entity classification and dual-read precedence.
 * AppContext/localStorage remains product UI SoT. T2 is an additive local mirror.
 */

export const SHOP_DATA_PRECEDENCE = {
  uiSourceOfTruth: 'appcontext-localstorage',
  t2Role: 'additive-local-mirror',
  remoteSync: 'blocked',
} as const;

export type ShopEntityClass = 'A' | 'B' | 'C' | 'D' | 'E';

export const SHOP_ENTITY_CLASSIFICATION: Record<
  string,
  { class: ShopEntityClass; t2Entity: string | null; mirrored: boolean; note: string }
> = {
  fabricRecords: {
    class: 'A',
    t2Entity: 'material',
    mirrored: true,
    note: 'AppContext fabrics only. Materials.tsx is local.',
  },
  designInspirations: {
    class: 'A',
    t2Entity: 'design',
    mirrored: true,
    note: 'AppContext studio inspirations.',
  },
  measurementProfiles: {
    class: 'B',
    t2Entity: 'measurement',
    mirrored: true,
    note: 'Live profiles. Distinct from frozen MeasurementVersion (Class D).',
  },
  orders: {
    class: 'B',
    t2Entity: 'order',
    mirrored: true,
    note: 'AppContext Orders.tsx population only. Production Board HTTP is Class C.',
  },
  customersAppContext: {
    class: 'C',
    t2Entity: null,
    mirrored: false,
    note: 'Split vs HTTP Customers screen. Not mirrored in SAC-2.',
  },
  customersHttp: {
    class: 'C',
    t2Entity: null,
    mirrored: false,
    note: 'Unmounted /customers. Deferred SAC-3.',
  },
  invoices: {
    class: 'C',
    t2Entity: null,
    mirrored: false,
    note: 'HTTP Invoices screen vs unused AppContext seed.',
  },
  productionStages: {
    class: 'C',
    t2Entity: null,
    mirrored: false,
    note: 'Local order array vs unmounted stage API.',
  },
  trustedArtifacts: {
    class: 'D',
    t2Entity: 'production',
    mirrored: false,
    note: 'Append-only SAC-1 records. Not generic CRUD.',
  },
  payments: {
    class: 'E',
    t2Entity: null,
    mirrored: false,
    note: 'Requires SAC-3 contracts.',
  },
};

export const LIVE_PROFILE_KIND = 'LiveMeasurementProfile' as const;
export const FABRIC_KIND = 'FabricRecord' as const;
export const DESIGN_KIND = 'DesignInspiration' as const;
export const SHOP_ORDER_KIND = 'ShopOrder' as const;
