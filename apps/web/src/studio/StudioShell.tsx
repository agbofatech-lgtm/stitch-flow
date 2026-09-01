import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Ruler,
  Palette,
  Scissors,
  Briefcase,
  Menu,
  Search,
  PanelRight,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AtelierHome } from '../atelier/AtelierHome';
import { DesignStudioFrame } from '../atelier/DesignStudioFrame';
import { ControlCenter } from '../control/ControlCenter';
import { Customers } from '../components/Customers';
import { Orders } from '../components/Orders';
import { ProductionBoard } from '../components/ProductionBoard';
import { Invoices } from '../components/Invoices';
import { DesignStudio } from '../components/DesignStudio';
import { Materials } from '../components/Materials';
import { Reports } from '../components/Reports';
import { Settings } from '../components/Settings';
import {
  Badge,
  Button,
  CommandMenu,
  IconButton,
  Sheet,
  cn,
} from '../experience';
import { motionOrInstant, motionPresets } from '../experience/motion/motion';
import { getDataAuthorityRuntime } from '../shared/persistence';
import type { ConnectivityState } from '../shared/persistence/types';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { MeasurementWorkspace } from './MeasurementWorkspace';
import {
  BUSINESS_SURFACES,
  STUDIO_WORKSPACES,
  businessSurfaceFromView,
  viewForWorkspace,
  workspaceFromView,
  type BusinessSurface,
  type StudioWorkspaceId,
} from './workspaces';
import { WorkspaceInspector } from './WorkspaceInspector';
import { WorkflowPanel } from '../workflow/WorkflowPanel';

const ICONS: Record<StudioWorkspaceId, typeof LayoutDashboard> = {
  command: LayoutDashboard,
  clients: Users,
  measurements: Ruler,
  design: Palette,
  production: Scissors,
  business: Briefcase,
};

export function StudioShell() {
  const {
    currentView,
    setView,
    currentWorkspace,
    currentMember,
    orders,
    customers,
    dueAlerts,
  } = useApp();

  const [workspace, setWorkspace] = useState<StudioWorkspaceId>(() =>
    workspaceFromView(currentView)
  );
  const [business, setBusiness] = useState<BusinessSurface>(() =>
    businessSurfaceFromView(currentView)
  );
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [connectivity, setConnectivity] = useState<ConnectivityState>('offline');
  const [pendingOps, setPendingOps] = useState(0);

  useEffect(() => {
    if (workspace === 'measurements') return;
    setWorkspace(workspaceFromView(currentView));
    if (workspaceFromView(currentView) === 'business') {
      setBusiness(businessSurfaceFromView(currentView));
    }
  }, [currentView, workspace]);

  useEffect(() => {
    const runtime = getDataAuthorityRuntime();
    if (!runtime) return;
    setConnectivity(runtime.connectivity.getState());
    void runtime.store.listOperations().then((ops) => {
      setPendingOps(ops.filter((op) => op.status === 'pending').length);
    });
    return runtime.connectivity.subscribe(setConnectivity);
  }, []);

  function goTo(next: StudioWorkspaceId, nextBusiness: BusinessSurface = business) {
    setWorkspace(next);
    setNavOpen(false);
    if (next === 'measurements') return;
    if (next === 'business') {
      setBusiness(nextBusiness);
      const view = viewForWorkspace('business', nextBusiness);
      if (view) setView(view);
      return;
    }
    const view = viewForWorkspace(next, nextBusiness);
    if (view) setView(view);
  }

  const meta = STUDIO_WORKSPACES.find((item) => item.id === workspace)!;
  const attention = (dueAlerts?.length || 0) + orders.filter((order) => order.status === 'in_progress').length;

  const canvas = useMemo(() => {
    if (controlOpen) return <ControlCenter onExit={() => setControlOpen(false)} />;
    if (settingsOpen) return <Settings />;
    if (workspace === 'measurements') return <MeasurementWorkspace />;
    if (workspace === 'command') return <AtelierHome />;
    if (workspace === 'clients') return <Customers />;
    if (workspace === 'design') return (
      <DesignStudioFrame>
        <DesignStudio />
      </DesignStudioFrame>
    );
    if (workspace === 'production') return <ProductionBoard />;
    if (business === 'materials') return <Materials />;
    if (business === 'invoices') return <Invoices />;
    if (business === 'reports') return <Reports />;
    return <Orders />;
  }, [business, controlOpen, settingsOpen, workspace]);

  const commands = [
    ...STUDIO_WORKSPACES.map((item) => ({
      id: item.id,
      label: item.label,
      onSelect: () => {
        setControlOpen(false);
        setSettingsOpen(false);
        goTo(item.id);
      },
    })),
    {
      id: 'control-center',
      label: 'Open Control Center',
      onSelect: () => {
        setSettingsOpen(false);
        setControlOpen(true);
      },
    },
  ];

  const motion = motionOrInstant(motionPresets.panel);

  return (
    <div className="flex min-h-screen bg-surface-canvas text-ink-primary">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-overlay bg-ink-primary/35 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-modal flex flex-col border-r border-line bg-surface-panel transition-[width,transform] duration-base ease-standard lg:static lg:translate-x-0',
          navCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          navOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-3 py-4">
          <img src={stitchflowLogo} alt={BRAND.productName} className="h-9 w-auto" />
          {!navCollapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-label text-ink-primary">{BRAND.productName} Atelier</p>
              <p className="truncate text-meta text-ink-muted">{currentWorkspace.name}</p>
            </div>
          ) : null}
        </div>
        <nav aria-label="Studio workspaces" className="flex-1 space-y-1 overflow-y-auto p-2">
          {STUDIO_WORKSPACES.map((item) => {
            const Icon = ICONS[item.id];
            const active = item.id === workspace && !settingsOpen && !controlOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  setControlOpen(false);
                  goTo(item.id);
                }}
                className={cn(
                  'sf-focus-ring flex w-full items-center gap-3 rounded-sf px-3 py-2.5 text-left text-label',
                  active ? 'bg-action-primary text-ink-inverse' : 'text-ink-secondary hover:bg-action-secondary'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!navCollapsed || navOpen ? <span>{item.label}</span> : <span className="sr-only">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="hidden border-t border-line p-2 lg:block">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setNavCollapsed((value) => !value)}>
            {navCollapsed ? '»' : 'Collapse'}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-sticky flex items-center gap-2 border-b border-line bg-surface-elevated px-3 py-2">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setNavOpen(true)}>
            <Menu className="h-4 w-4" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">
              {controlOpen ? 'AGBOFA' : 'Atelier'}
            </p>
            <h1 className="truncate font-display text-heading-sm">
              {controlOpen ? 'Control Center' : settingsOpen ? 'Settings' : meta.label}
            </h1>
          </div>
          {workspace === 'business' && !settingsOpen ? (
            <div className="hidden gap-1 md:flex">
              {BUSINESS_SURFACES.map((surface) => (
                <button
                  key={surface.id}
                  type="button"
                  onClick={() => goTo('business', surface.id)}
                  className={cn(
                    'sf-focus-ring rounded-sf-pill px-3 py-1 text-meta',
                    business === surface.id ? 'bg-action-primary text-ink-inverse' : 'bg-action-secondary text-ink-secondary'
                  )}
                >
                  {surface.label}
                </button>
              ))}
            </div>
          ) : null}
          <IconButton label="Search workspaces" onClick={() => setCommandOpen(true)}>
            <Search className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            onClick={() => setInspectorOpen((value) => !value)}
          >
            <PanelRight className="h-4 w-4" />
          </IconButton>
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => {
              setSettingsOpen(false);
              setControlOpen(true);
            }}
          >
            Control Center
          </Button>
          <IconButton
            label="Workspace settings"
            onClick={() => {
              setControlOpen(false);
              setSettingsOpen(true);
              setView('settings');
            }}
          >
            <SettingsIcon className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${workspace}-${business}-${settingsOpen}-${controlOpen}`}
                {...motion}
                className="min-h-full"
              >
                {canvas}
              </motion.div>
            </AnimatePresence>
          </main>

          {inspectorOpen ? (
            <aside className="hidden w-80 shrink-0 overflow-auto border-l border-line bg-surface-workspace xl:block">
              <WorkflowPanel />
              <WorkspaceInspector
                workspace={workspace}
                business={business}
                customers={customers.length}
                orders={orders.length}
                attention={attention}
                onOpenBusiness={(id) => goTo('business', id)}
              />
            </aside>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface-panel px-3 py-2 text-meta text-ink-muted">
          <span>
            {currentMember.user.fullName} · {currentMember.role}
          </span>
          <span className="flex items-center gap-2">
            <Badge tone={connectivity === 'online' ? 'success' : connectivity === 'offline' ? 'neutral' : 'warning'}>
              {connectivity}
            </Badge>
            T2 sync queue {pendingOps}
          </span>
        </footer>

        <nav
          aria-label="Mobile workspaces"
          className="grid grid-cols-6 border-t border-line bg-surface-elevated lg:hidden"
        >
          {STUDIO_WORKSPACES.map((item) => {
            const Icon = ICONS[item.id];
            const active = item.id === workspace && !settingsOpen;
            return (
              <button
                key={item.id}
                type="button"
                className={cn('sf-focus-ring flex flex-col items-center gap-1 py-2 text-[10px]', active ? 'text-action-primary' : 'text-ink-muted')}
                onClick={() => {
                  setSettingsOpen(false);
                  goTo(item.id);
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="xl:hidden">
        <Sheet open={inspectorOpen} title="Inspector" onClose={() => setInspectorOpen(false)}>
          <WorkspaceInspector
            workspace={workspace}
            business={business}
            customers={customers.length}
            orders={orders.length}
            attention={attention}
            onOpenBusiness={(id) => goTo('business', id)}
          />
        </Sheet>
      </div>

      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} commands={commands} />
    </div>
  );
}
