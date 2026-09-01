import type { AppView } from '../shared/types';

export type StudioWorkspaceId =
  | 'command'
  | 'clients'
  | 'measurements'
  | 'design'
  | 'production'
  | 'business';

export type BusinessSurface = 'orders' | 'materials' | 'invoices' | 'reports';

export type StudioWorkspace = {
  id: StudioWorkspaceId;
  label: string;
  purpose: string;
  legacyView?: AppView;
};

export const STUDIO_WORKSPACES: StudioWorkspace[] = [
  {
    id: 'command',
    label: 'Atelier Home',
    purpose: 'Work requiring attention',
    legacyView: 'dashboard',
  },
  {
    id: 'clients',
    label: 'Client Studio',
    purpose: 'Customer identity and history',
    legacyView: 'customers',
  },
  {
    id: 'measurements',
    label: 'Measurements',
    purpose: 'Body / garment / pattern boundary',
  },
  {
    id: 'design',
    label: 'Design',
    purpose: 'Host protected Design Studio',
    legacyView: 'design-studio',
  },
  {
    id: 'production',
    label: 'Production',
    purpose: 'Cutting through delivery',
    legacyView: 'production-board',
  },
  {
    id: 'business',
    label: 'Business',
    purpose: 'Orders, materials, invoices, reports',
    legacyView: 'orders',
  },
];

export const BUSINESS_SURFACES: Array<{ id: BusinessSurface; label: string; view: AppView }> = [
  { id: 'orders', label: 'Orders', view: 'orders' },
  { id: 'materials', label: 'Materials', view: 'materials' },
  { id: 'invoices', label: 'Invoices', view: 'invoices' },
  { id: 'reports', label: 'Reports', view: 'reports' },
];

export function workspaceFromView(view: AppView): StudioWorkspaceId {
  switch (view) {
    case 'dashboard':
      return 'command';
    case 'customers':
      return 'clients';
    case 'design-studio':
      return 'design';
    case 'production-board':
      return 'production';
    case 'orders':
    case 'materials':
    case 'invoices':
    case 'reports':
      return 'business';
    case 'settings':
      return 'command';
    default:
      return 'command';
  }
}

export function businessSurfaceFromView(view: AppView): BusinessSurface {
  if (view === 'materials' || view === 'invoices' || view === 'reports') return view;
  return 'orders';
}

export function viewForWorkspace(
  workspace: StudioWorkspaceId,
  business: BusinessSurface
): AppView | null {
  if (workspace === 'measurements') return null;
  if (workspace === 'business') {
    return BUSINESS_SURFACES.find((item) => item.id === business)?.view || 'orders';
  }
  return STUDIO_WORKSPACES.find((item) => item.id === workspace)?.legacyView || 'dashboard';
}
