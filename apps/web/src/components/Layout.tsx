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
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'production-board', label: 'Production Board', icon: KanbanSquare },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'design-studio', label: 'Design Studio', icon: Palette },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
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

  const tierBadgeClass =
    tierSimulation === 'STUDIO'
      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      : tierSimulation === 'PRO'
      ? 'bg-action-primary text-white'
      : 'bg-action-secondary text-ink-secondary';

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-canvas via-surface-panel to-surface-workspace">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/80 bg-surface-panel/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2 text-ink-secondary transition hover:bg-action-secondary"
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
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 grid h-full w-72 transform grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-line bg-surface-panel shadow-2xl transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-1.5 w-full bg-action-primary" />

          <div className="border-b border-line px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <img
                  src={stitchflowLogo}
                  alt={`${BRAND.productName} logo`}
                  className="h-12 w-auto"
                />
                <p className="mt-3 truncate text-sm font-semibold text-ink-primary">
                  {currentWorkspace.name || BRAND.productName}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                  by {BRAND.parentName}
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl p-2 text-ink-muted transition hover:bg-action-secondary lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-surface-workspace/80 p-3">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${tierBadgeClass}`}>
                {tierSimulation !== 'BASIC' && <Crown className="h-4 w-4" />}
                <span className="text-sm font-medium">{tierSimulation} Plan</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {(navItems ?? []).map((item) => {
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
                  className={`group w-full rounded-2xl px-4 py-2.5 text-left transition-all ${
                    isActive
                      ? 'bg-action-primary text-white shadow-sm'
                      : 'text-ink-secondary hover:bg-action-secondary hover:text-ink-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-surface-panel/15 text-white'
                          : 'bg-surface-panel text-ink-muted ring-1 ring-line group-hover:bg-surface-workspace'
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
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-workspace/70 p-3 transition hover:bg-action-secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-action-primary shadow-sm">
                <span className="text-sm font-medium text-white">
                  {currentMember.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink-primary">
                  {currentWorkspace.ownerName || currentMember.user.fullName || 'Owner'}
                </p>
                <p className="text-xs capitalize text-ink-muted">{currentMember.role}</p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-ink-muted transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-2xl border border-line bg-surface-panel shadow-2xl">
                <div className="border-b border-line p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Switch Role
                  </p>

                  <button
                    onClick={() => {
                      switchRole('owner');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      currentMember.role === 'owner'
                        ? 'bg-action-primary text-white'
                        : 'text-ink-secondary hover:bg-action-secondary'
                    }`}
                  >
                    Owner
                  </button>

                  <button
                    onClick={() => {
                      switchRole('assistant');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      currentMember.role === 'assistant'
                        ? 'bg-action-primary text-white'
                        : 'text-ink-secondary hover:bg-action-secondary'
                    }`}
                  >
                    Assistant
                  </button>
                </div>

                <div className="p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Simulate Tier
                  </p>

                  <button
                    onClick={() => {
                      simulateTier('BASIC');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      tierSimulation === 'BASIC'
                        ? 'bg-action-primary text-white'
                        : 'text-ink-secondary hover:bg-action-secondary'
                    }`}
                  >
                    Basic Plan
                  </button>

                  <button
                    onClick={() => {
                      simulateTier('PRO');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      tierSimulation === 'PRO'
                        ? 'bg-action-primary text-white'
                        : 'text-ink-secondary hover:bg-action-secondary'
                    }`}
                  >
                    Pro Plan
                  </button>

                  <button
                    onClick={() => {
                      simulateTier('STUDIO');
                      setDropdownOpen(false);
                    }}
                    className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      tierSimulation === 'STUDIO'
                        ? 'bg-action-primary text-white'
                        : 'text-ink-secondary hover:bg-action-secondary'
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

      <main className="min-h-screen lg:ml-72">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}






