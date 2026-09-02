import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Ruler,
  Palette,
  Scissors,
  Briefcase,
  ClipboardList,
  Warehouse,
  Receipt,
  BarChart3,
  Menu,
  Search,
  PanelRight,
  Settings as SettingsIcon,
  Shield,
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
  AtelierConfidence,
  AtelierNavigation,
  AtelierShell,
  AtelierThread,
  Badge,
  Button,
  CommandPalette,
  ContextBar,
  IconButton,
  InspectorPanel,
  Sheet,
  StatusBar,
  ToastRegion,
  WorkspaceCanvas,
  WorkspaceHeader,
  cn,
  type CommandEntry,
  type ConfidenceState,
  type NavSection,
  type ToastMessage,
} from '../experience';
import { motionOrInstant, workspacePreset } from '../experience/motion/motion';
import { registerAtelierRoomHandler } from '../experience/atelier/navigate';
import { getDataAuthorityRuntime } from '../shared/persistence';
import type { ConnectivityState } from '../shared/persistence/types';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { MeasurementWorkspace } from './MeasurementWorkspace';
import {
  BUSINESS_SURFACES,
  NAV_SECTIONS,
  STUDIO_WORKSPACES,
  businessSurfaceFromView,
  viewForWorkspace,
  workspaceFromView,
  type BusinessSurface,
  type StudioWorkspaceId,
} from './workspaces';
import { ATELIER_PLACES, ledgerStationTitle } from './atelierGrammar';
import { WorkspaceInspector } from './WorkspaceInspector';
import { WorkflowPanel } from '../workflow/WorkflowPanel';

const ICONS: Record<string, typeof LayoutDashboard> = {
  command: LayoutDashboard,
  clients: Users,
  measurements: Ruler,
  design: Palette,
  production: Scissors,
  business: Briefcase,
  'business:orders': ClipboardList,
  'business:materials': Warehouse,
  'business:invoices': Receipt,
  'business:reports': BarChart3,
  settings: SettingsIcon,
  control: Shield,
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
    selectOrder,
    selectedOrderId,
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [journeyFrom, setJourneyFrom] = useState(workspace);

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
    return runtime.connectivity.subscribe((next) => {
      setConnectivity(next);
      setToasts((current) => [
        ...current.slice(-2),
        {
          id: `sync-${Date.now()}`,
          tone: next === 'offline' ? 'warning' : 'info',
          children:
            next === 'offline'
              ? 'Workspace is offline. Local work remains.'
              : 'Workspace probe reachable. UI store is still local.',
        },
      ]);
    });
  }, []);

  useEffect(() => registerAtelierRoomHandler((room) => goTo(room)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function goTo(next: StudioWorkspaceId, nextBusiness: BusinessSurface = business) {
    setJourneyFrom(workspace);
    setWorkspace(next);
    setNavOpen(false);
    setSettingsOpen(false);
    setControlOpen(false);
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

  function selectNav(id: string) {
    if (id === 'settings') {
      setControlOpen(false);
      setSettingsOpen(true);
      setView('settings');
      setNavOpen(false);
      return;
    }
    if (id === 'control') {
      setSettingsOpen(false);
      setControlOpen(true);
      setNavOpen(false);
      return;
    }
    if (id.startsWith('business:')) {
      goTo('business', id.replace('business:', '') as BusinessSurface);
      return;
    }
    goTo(id as StudioWorkspaceId);
  }

  const attention = (dueAlerts?.length || 0) + orders.filter((order) => order.status === 'in_progress').length;
  const plane = controlOpen ? 'control' : 'atelier';
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const threadClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) || null;
  const floorConfidence: ConfidenceState =
    connectivity === 'offline'
      ? 'offline'
      : connectivity === 'syncing'
        ? 'syncing'
        : pendingOps > 0
          ? 'queued'
          : 'local';

  const canvas = useMemo(() => {
    if (controlOpen) return <ControlCenter onExit={() => setControlOpen(false)} />;
    if (settingsOpen) return <Settings />;
    if (workspace === 'measurements') return <MeasurementWorkspace />;
    if (workspace === 'command') return <AtelierHome />;
    if (workspace === 'clients') return <Customers />;
    if (workspace === 'design') return (
      <DesignStudioFrame client={threadClient} order={selectedOrder?.orderNumber}>
        <DesignStudio />
      </DesignStudioFrame>
    );
    if (workspace === 'production') return <ProductionBoard />;
    if (business === 'materials') return <Materials />;
    if (business === 'invoices') return <Invoices />;
    if (business === 'reports') return <Reports />;
    return <Orders />;
  }, [business, controlOpen, settingsOpen, workspace, threadClient, selectedOrder]);

  const place = controlOpen
    ? ATELIER_PLACES.control
    : settingsOpen
      ? ATELIER_PLACES.settings
      : ATELIER_PLACES[workspace];
  const headerCopy = {
    kicker: place.kicker,
    title: workspace === 'business' && !settingsOpen && !controlOpen ? ledgerStationTitle(business) : place.title,
    description: place.purpose,
  };

  function runPlaceNext() {
    const next = place.next;
    if (!next) return;
    if ('exit' in next) {
      if (next.exit === 'control') setControlOpen(false);
      else setSettingsOpen(false);
      goTo('command');
      return;
    }
    goTo(next.room);
  }

  const commands: CommandEntry[] = [
    ...STUDIO_WORKSPACES.map((item) => ({
      id: item.id,
      label: item.label,
      group: 'Rooms',
      keywords: item.purpose,
      onSelect: () => goTo(item.id),
    })),
    ...BUSINESS_SURFACES.map((surface) => ({
      id: `business:${surface.id}`,
      label: surface.label,
      group: 'Ledger',
      onSelect: () => goTo('business', surface.id),
    })),
    ...customers.slice(0, 8).map((customer) => ({
      id: `client-${customer.id}`,
      label: customer.fullName,
      group: 'Work',
      keywords: `${customer.phone || ''} ${customer.email || ''}`,
      onSelect: () => goTo('clients'),
    })),
    ...orders.slice(0, 8).map((order) => ({
      id: `order-${order.id}`,
      label: order.orderNumber,
      group: 'Orders',
      keywords: order.orderType,
      onSelect: () => {
        selectOrder(order.id);
        goTo('business', 'orders');
      },
    })),
    {
      id: 'settings',
      label: 'Workspace settings',
      group: 'Account',
      onSelect: () => selectNav('settings'),
    },
    {
      id: 'control-center',
      label: 'Open Control Center',
      group: 'Operator',
      onSelect: () => selectNav('control'),
    },
  ];

  const navSections: NavSection[] = NAV_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items.map((item) => {
      const Icon = ICONS[item.id] || LayoutDashboard;
      const current =
        item.id === 'control'
          ? controlOpen
          : item.id === 'settings'
            ? settingsOpen
            : item.workspace === 'business'
              ? !settingsOpen && !controlOpen && workspace === 'business' && business === item.business
              : !settingsOpen && !controlOpen && workspace === item.workspace;
      return {
        id: item.id,
        label: item.label,
        current,
        icon: <Icon className="h-4 w-4" />,
      };
    }),
  }));

  const motionPreset = motionOrInstant(workspacePreset(journeyFrom, workspace));

  return (
    <AtelierShell
      plane={plane}
      placeId={place.id}
      navigation={
        <AtelierNavigation
          brand={
            <>
              <img src={stitchflowLogo} alt={BRAND.productName} className="h-9 w-auto" />
              {!navCollapsed || navOpen ? (
                <div className="min-w-0">
                  <p className="truncate font-display text-label text-ink-primary">{BRAND.productName} Atelier</p>
                  <p className="truncate text-meta text-ink-muted">{currentWorkspace.name}</p>
                </div>
              ) : null}
            </>
          }
          workspaceName={currentWorkspace.name}
          sections={navSections}
          collapsed={navCollapsed}
          mobileOpen={navOpen}
          onCloseMobile={() => setNavOpen(false)}
          onSelect={selectNav}
          footer={
            <div className="hidden lg:block">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setNavCollapsed((value) => !value)}>
                {navCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          }
        />
      }
      header={
        <WorkspaceHeader
          kicker={headerCopy.kicker}
          title={headerCopy.title}
          description={headerCopy.description}
          state={
            <>
              <div className="hidden max-w-xs lg:block">
                <AtelierThread
                  room={headerCopy.title}
                  client={threadClient}
                  order={selectedOrder?.orderNumber}
                />
              </div>
              {workspace === 'clients' ? (
                <Badge tone="neutral">{customers.length} clients</Badge>
              ) : null}
              {workspace === 'business' ? (
                <Badge tone="neutral">{orders.length} orders</Badge>
              ) : null}
              {attention > 0 && workspace === 'command' ? (
                <Badge tone="warning">{attention} needing attention</Badge>
              ) : null}
            </>
          }
          actions={
            <>
              <IconButton label="Open navigation" className="lg:hidden" onClick={() => setNavOpen(true)}>
                <Menu className="h-4 w-4" />
              </IconButton>
              <IconButton label="Search workspaces" onClick={() => setCommandOpen(true)}>
                <Search className="h-4 w-4" />
              </IconButton>
              {place.next ? (
                <Button variant="primary" size="md" className="hidden sm:inline-flex" onClick={runPlaceNext}>
                  {place.next.label}
                </Button>
              ) : null}
              <IconButton
                label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
                onClick={() => setInspectorOpen((value) => !value)}
              >
                <PanelRight className="h-4 w-4" />
              </IconButton>
              <Button
                variant="ghost"
                size="md"
                className="hidden md:inline-flex"
                onClick={() => selectNav('control')}
              >
                Operator plane
              </Button>
              <IconButton label="Workspace settings" onClick={() => selectNav('settings')}>
                <SettingsIcon className="h-4 w-4" />
              </IconButton>
            </>
          }
        />
      }
      toolbar={
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-surface-panel px-3 py-2">
            <AtelierThread
              room={headerCopy.title}
              client={threadClient}
              order={selectedOrder?.orderNumber}
            />
            {place.next ? (
              <Button variant="secondary" size="md" className="sm:hidden" onClick={runPlaceNext}>
                {place.next.label}
              </Button>
            ) : null}
          </div>
          {workspace === 'business' && !settingsOpen && !controlOpen ? (
            <ContextBar>
              {BUSINESS_SURFACES.map((surface) => (
                <button
                  key={surface.id}
                  type="button"
                  onClick={() => goTo('business', surface.id)}
                  className={cn(
                    'sf-focus-ring min-h-11 rounded-sf-pill px-3 text-meta',
                    business === surface.id
                      ? 'bg-action-primary text-ink-inverse'
                      : 'bg-action-secondary text-ink-secondary'
                  )}
                >
                  {surface.label}
                </button>
              ))}
            </ContextBar>
          ) : null}
        </>
      }
      inspector={
        inspectorOpen && !controlOpen ? (
          <InspectorPanel>
            <WorkflowPanel />
            <WorkspaceInspector
              workspace={workspace}
              business={business}
              customers={customers.length}
              orders={orders.length}
              attention={attention}
              onOpenBusiness={(id) => goTo('business', id)}
            />
          </InspectorPanel>
        ) : undefined
      }
      statusBar={
        <StatusBar>
          <span>
            {currentMember.user.fullName} · {currentMember.role}
          </span>
          <span className="flex items-center gap-2">
            <AtelierConfidence
              state={floorConfidence}
              detail={pendingOps > 0 ? `${pendingOps} outbox` : 'Remote sync is not claimed'}
            />
          </span>
        </StatusBar>
      }
      mobileNav={
        <nav aria-label="Mobile workspaces" className="grid grid-cols-6 border-t border-line bg-surface-elevated lg:hidden">
          {STUDIO_WORKSPACES.map((item) => {
            const Icon = ICONS[item.id] || LayoutDashboard;
            const active = item.id === workspace && !settingsOpen && !controlOpen;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'sf-focus-ring flex min-h-12 min-w-11 flex-col items-center justify-center gap-1 px-1 text-[10px]',
                  active ? 'text-action-primary' : 'text-ink-muted'
                )}
                onClick={() => goTo(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      }
      toasts={<ToastRegion toasts={toasts.slice(-3)} />}
    >
      <WorkspaceCanvas>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${workspace}-${business}-${settingsOpen}-${controlOpen}`}
            data-motion-category="workspace"
            {...motionPreset}
            className="min-h-full"
          >
            {canvas}
          </motion.div>
        </AnimatePresence>
      </WorkspaceCanvas>
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
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} commands={commands} />
    </AtelierShell>
  );
}
