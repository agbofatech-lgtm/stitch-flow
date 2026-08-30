/**
 * StitchFlow Workspace navigation model — Phase 18 · Stage 6.
 *
 * Single source of truth for shell destinations. View ids are the EXISTING
 * AppContext view ids (zero route/view breakage); only labels/grouping are
 * Stage 6 presentation (Stage 1 IA + Stage 2 §navigation):
 *
 *   PRIMARY (business workflow):  Home · Customers · Orders · Production · Finance
 *   SECONDARY (support):          Materials · Reports · Design Studio* · Settings
 *   CONDITIONAL:                  Control Center (platform role claim) · Developer
 *
 * *Design Studio stays reachable (D2: contextual target; replacement-before-
 *  removal — contextual entry arrives with Stage 8 order workflows).
 * Intelligence surfaces are NEVER primary navigation (Stage 2 §AI verbs /
 * Stage 6 §4): they remain inside the screens that consume them.
 */
import {
  LayoutDashboard, Users, ShoppingBag, KanbanSquare, Wallet, Package,
  BarChart3, Palette, Settings, Code2, ShieldCheck, type LucideIcon,
} from 'lucide-react';
import { getAuthRole, isPlatformRole } from '@shared/utils/api';

export type WorkspaceViewId =
  | 'dashboard' | 'customers' | 'orders' | 'production-board' | 'invoices'
  | 'design-studio' | 'materials' | 'reports' | 'settings' | 'developer' | 'platform';

export interface NavItem {
  id: WorkspaceViewId;
  label: string;
  icon: LucideIcon;
  /** Honest purpose note for the More sheet / future tooltips. */
  hint?: string;
}

/** Primary destinations — the tailor's daily workflow (Stage 6 §12). */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'production-board', label: 'Production', icon: KanbanSquare },
  { id: 'invoices', label: 'Finance', icon: Wallet },
];

/** Secondary destinations — reachable, never primary (Stage 6 §12). */
export const SECONDARY_NAV: NavItem[] = [
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'design-studio', label: 'Design Studio', icon: Palette, hint: 'Legacy entry — becomes contextual from Order → Design (Stage 8)' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** Control Center entry: UX hint from the signed role claim only — the
 *  server independently authorizes every /platform API call (Phase 10
 *  contract, VERIFIED). Visibility is NOT authorization. */
export function controlCenterVisible(): boolean {
  return isPlatformRole(getAuthRole());
}

/**
 * Developer console entry. VERIFIED boundary: all /developers/* APIs require
 * the DEVELOPER_API feature flag + staff JWT (backend requireFeatureFlag);
 * the client has no entitlement signal (featureAccess exposes none), so the
 * entry stays visible exactly as it is today (unconditional secondary item)
 * and unauthorized consoles fail closed server-side. UNRESOLVED (client-side
 * entitlement-gated visibility): needs an entitlement signal to exist first —
 * Stage 6 does not invent one (§20).
 */
export const DEVELOPER_NAV: NavItem = { id: 'developer', label: 'Developer', icon: Code2, hint: 'Console for entitled staff (server-enforced)' };

export function viewTitle(view: string): string {
  const all = [...PRIMARY_NAV, ...SECONDARY_NAV, DEVELOPER_NAV, { id: 'platform', label: 'Platform Control Center' }];
  return all.find((n) => n.id === view)?.label ?? 'Workspace';
}

export const ALL_NAV_IDS: WorkspaceViewId[] = [
  ...PRIMARY_NAV.map((n) => n.id), ...SECONDARY_NAV.map((n) => n.id), 'developer', 'platform',
];
