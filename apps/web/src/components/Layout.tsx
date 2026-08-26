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
      ? 'bg-[#0F6E8C] text-white'
      : 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100"
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
        className={`fixed left-0 top-0 z-50 grid h-full w-72 transform grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-1.5 w-full bg-[#0F6E8C]" />

          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <img
                  src={stitchflowLogo}
                  alt={`${BRAND.productName} logo`}
                  className="h-12 w-auto"
                />
                <p className="mt-3 truncate text-sm font-semibold text-slate-900">
                  {currentWorkspace.name || BRAND.productName}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  by {BRAND.parentName}
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
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
                      ? 'bg-[#0F6E8C] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200 group-hover:bg-slate-50'
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

        <div className="border-t border-slate-200 p-4">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F6E8C] shadow-sm">
                <span className="text-sm font-medium text-white">
                  {currentMember.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-slate-900">
                  {currentWorkspace.ownerName || currentMember.user.fullName || 'Owner'}
                </p>
                <p className="text-xs capitalize text-slate-500">{currentMember.role}</p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-200 p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Switch Role
                  </p>

                  <button
                    onClick={() => {
                      switchRole('owner');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      currentMember.role === 'owner'
                        ? 'bg-[#0F6E8C] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
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
                        ? 'bg-[#0F6E8C] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Assistant
                  </button>
                </div>

                <div className="p-3">
                  <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Simulate Tier
                  </p>

                  <button
                    onClick={() => {
                      simulateTier('BASIC');
                      setDropdownOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      tierSimulation === 'BASIC'
                        ? 'bg-[#0F6E8C] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
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
                        ? 'bg-[#0F6E8C] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
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
                        ? 'bg-[#0F6E8C] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
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






