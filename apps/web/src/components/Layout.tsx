import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  KanbanSquare,
  FileText,
  Palette,
  Settings,
  Menu,
  X,
  Crown,
  ChevronDown,
  Package,
  BarChart3,
  Code2,
  ShieldCheck,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { getAuthRole, isPlatformRole } from '@shared/utils/api';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'production-board', label: 'Production Board', icon: KanbanSquare },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'design-studio', label: 'Design Studio', icon: Palette },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'developer', label: 'Developer', icon: Code2 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const {
    currentView,
    setView,
    currentWorkspace,
    currentMember,
    tierSimulation,
    simulateTier,
    switchRole,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Phase 10: the Control Center nav entry is a UX hint from the signed role
  // claim — the server independently authorizes every /platform API call, so
  // hiding/showing this item can never grant or leak access.
  const showPlatformNav = isPlatformRole(getAuthRole());
  const visibleNavItems = showPlatformNav
    ? [
        ...navItems.slice(0, 9), // …through 'developer'
        { id: 'platform', label: 'Control Center', icon: ShieldCheck },
        ...navItems.slice(9), // 'settings'
      ]
    : navItems;

  const tierBadgeClass =
    tierSimulation === 'STUDIO'
      ? 'bg-gradient-to-r from-gold to-gold-dark text-charcoal'
      : tierSimulation === 'PRO'
        ? 'bg-charcoal text-ivory'
        : 'bg-grey-light text-ink-soft';

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-sticky flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 shadow-e1 backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="sf-btn-motion rounded-btn p-2 text-ink-soft transition-colors hover:bg-grey-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <img
          src={stitchflowLogo}
          alt={`${BRAND.productName} logo`}
          className="h-11 w-auto"
        />

        <div className="w-9" />
      </header>

      {sidebarOpen && (
        <div
          className="sf-backdrop-enter fixed inset-0 z-overlay bg-charcoal/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-modal grid h-full w-72 transform grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-line bg-surface shadow-e3 transition-transform duration-fast ease-standard lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-1.5 w-full bg-gold" />

          <div className="border-b border-line px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <img
                  src={stitchflowLogo}
                  alt={`${BRAND.productName} logo`}
                  className="h-12 w-auto"
                />
                <p className="mt-3 truncate font-display text-sm font-semibold text-ink">
                  {currentWorkspace.name || BRAND.productName}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-mute">
                  by {BRAND.parentName}
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-btn p-2 text-ink-mute transition-colors hover:bg-grey-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-card border border-line bg-ivory p-3">
              <div className={`flex items-center gap-2 rounded-btn px-3 py-2 ${tierBadgeClass}`}>
                {tierSimulation !== 'BASIC' && <Crown className="h-4 w-4" />}
                <span className="text-sm font-medium">{tierSimulation} Plan</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="overflow-y-auto px-3 py-3" aria-label="Primary">
          <div className="space-y-1.5">
            {(visibleNavItems ?? []).map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id as Parameters<typeof setView>[0]);
                    setSidebarOpen(false);
                    setDropdownOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group w-full rounded-btn px-4 py-2.5 text-left transition-colors duration-micro ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    isActive
                      ? 'bg-charcoal text-ivory shadow-e1'
                      : 'text-ink-soft hover:bg-grey-light/70 hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-btn transition-colors duration-micro ${
                        isActive
                          ? 'bg-gold/20 text-gold-light'
                          : 'bg-surface text-ink-mute ring-1 ring-line group-hover:bg-grey-light/50'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-line p-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              className="flex w-full items-center gap-3 rounded-card border border-line bg-ivory p-3 transition-colors duration-micro hover:bg-grey-light/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal shadow-e1">
                <span className="text-sm font-medium text-gold-light">
                  {currentMember.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink">
                  {currentWorkspace.ownerName || currentMember.user.fullName || 'Owner'}
                </p>
                <p className="text-xs capitalize text-ink-mute">{currentMember.role}</p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-ink-mute transition-transform duration-micro ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="sf-rise-enter absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-card border border-line bg-surface shadow-e4">
                <div className="border-b border-line p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-mute">
                    Switch Role
                  </p>

                  <button
                    onClick={() => {
                      switchRole('owner');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-btn px-3 py-2 text-left text-sm transition-colors duration-micro ${
                      currentMember.role === 'owner'
                        ? 'bg-charcoal text-ivory'
                        : 'text-ink-soft hover:bg-grey-light/70'
                    }`}
                  >
                    Owner
                  </button>

                  <button
                    onClick={() => {
                      switchRole('assistant');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-btn px-3 py-2 text-left text-sm transition-colors duration-micro ${
                      currentMember.role === 'assistant'
                        ? 'bg-charcoal text-ivory'
                        : 'text-ink-soft hover:bg-grey-light/70'
                    }`}
                  >
                    Assistant
                  </button>
                </div>

                <div className="p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-mute">
                    Simulate Tier
                  </p>

                  <button
                    onClick={() => {
                      simulateTier('BASIC');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-btn px-3 py-2 text-left text-sm transition-colors duration-micro ${
                      tierSimulation === 'BASIC'
                        ? 'bg-charcoal text-ivory'
                        : 'text-ink-soft hover:bg-grey-light/70'
                    }`}
                  >
                    Basic Plan
                  </button>

                  <button
                    onClick={() => {
                      simulateTier('PRO');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-btn px-3 py-2 text-left text-sm transition-colors duration-micro ${
                      tierSimulation === 'PRO'
                        ? 'bg-charcoal text-ivory'
                        : 'text-ink-soft hover:bg-grey-light/70'
                    }`}
                  >
                    Pro Plan
                  </button>

                  <button
                    onClick={() => {
                      simulateTier('STUDIO');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-btn px-3 py-2 text-left text-sm transition-colors duration-micro ${
                      tierSimulation === 'STUDIO'
                        ? 'bg-charcoal text-ivory'
                        : 'text-ink-soft hover:bg-grey-light/70'
                    }`}
                  >
                    Studio Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-72">{children}</main>
    </div>
  );
}
