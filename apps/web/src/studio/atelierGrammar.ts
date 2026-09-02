import type { BusinessSurface, StudioWorkspaceId } from './workspaces';

export type AtelierPlaceId = StudioWorkspaceId | 'control' | 'settings';

export type AtelierPlace = {
  id: AtelierPlaceId;
  title: string;
  kicker: string;
  purpose: string;
  next?: { label: string; room: StudioWorkspaceId } | { label: string; exit: 'control' | 'settings' };
};

export const ATELIER_PLACES: Record<AtelierPlaceId, AtelierPlace> = {
  command: {
    id: 'command',
    title: 'Floor',
    kicker: 'Atelier',
    purpose: 'Orient. See what needs a human.',
    next: { label: 'Open client room', room: 'clients' },
  },
  clients: {
    id: 'clients',
    title: 'Client room',
    kicker: 'Atelier',
    purpose: 'The person you are dressing.',
    next: { label: 'Continue to measurements', room: 'measurements' },
  },
  measurements: {
    id: 'measurements',
    title: 'Measurement table',
    kicker: 'Atelier',
    purpose: 'Body, garment, and pattern stay separate.',
    next: { label: 'Continue to design', room: 'design' },
  },
  design: {
    id: 'design',
    title: 'Design table',
    kicker: 'Atelier',
    purpose: 'Protected studio. Geometry stays inside.',
    next: { label: 'Open production floor', room: 'production' },
  },
  production: {
    id: 'production',
    title: 'Production floor',
    kicker: 'Atelier',
    purpose: 'The garment is made here. Stages come from the order record.',
    next: { label: 'Open ledger', room: 'business' },
  },
  business: {
    id: 'business',
    title: 'Ledger',
    kicker: 'Atelier',
    purpose: 'Orders, materials, invoices, and reports as stations.',
    next: { label: 'Return to floor', room: 'command' },
  },
  settings: {
    id: 'settings',
    title: 'Workspace settings',
    kicker: 'Workspace',
    purpose: 'Configuration. Not commercial authority.',
    next: { label: 'Return to floor', exit: 'settings' },
  },
  control: {
    id: 'control',
    title: 'Control Center',
    kicker: 'Operator plane',
    purpose: 'Same building, denser operations. Not the atelier floor.',
    next: { label: 'Return to atelier', exit: 'control' },
  },
};

export function ledgerStationTitle(station: BusinessSurface) {
  const labels: Record<BusinessSurface, string> = {
    orders: 'Orders station',
    materials: 'Materials station',
    invoices: 'Invoices station',
    reports: 'Reports station',
  };
  return labels[station];
}
