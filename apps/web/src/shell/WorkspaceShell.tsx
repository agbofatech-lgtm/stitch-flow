/**
 * StitchFlow Workspace Shell — Phase 18 · Stage 6.
 *
 * Structural shell around the UNCHANGED view switcher (AuthenticatedApp):
 * desktop sidebar + header, mobile bottom navigation + More sheet, account
 * menu, honest offline indicator. Built from Stage 5 primitives/tokens only.
 *
 * Contracts (Stage 6 mandate):
 * - Navigation exposes business intent; intelligence is never a destination.
 * - aria-current="page" + non-colour active states; landmarks banner/nav/main.
 * - Mobile: max 5 primary destinations, 44px targets, safe-area aware.
 * - Offline: navigation never requires connectivity; the indicator reports
 *   Offline only from navigator.onLine evidence and NEVER claims sync state
 *   (no shell-level sync store exists — documented gap, Stage 6 §27).
 * - Demo controls (Switch Role / Simulate Tier) are PRESERVED functionality
 *   (relocated into the account menu); their removal is an owner decision.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown, Crown, MoreHorizontal, RefreshCw, LogOut, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { navigate } from '@shared/router';
import { logout } from '@shared/api/auth';
import {
  PRIMARY_NAV, SECONDARY_NAV, DEVELOPER_NAV, controlCenterVisible, viewTitle,
  type NavItem, type WorkspaceViewId,
} from './navigation';
import { Drawer, useModalBehaviour } from '../design-system/Overlay';
import { Label } from '../design-system/primitives';

/* ── Honest offline indicator (Online → quiet; Offline → amber pill) ────── */
function OfflineIndicator() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <span data-shell="offline" role="status"
      className="inline-flex min-h-[var(--ds-touch-min)] sm:min-h-8 items-center gap-1.5 rounded-full border border-ds-warning bg-ds-warning-surface px-3 text-xs font-medium text-ds-warning">
      <span aria-hidden="true">⚠</span> Offline — work continues locally
    </span>
  );
}

/* ── Navigation item (shared by sidebar and More sheet) ─────────────────── */
function NavButton({ item, active, onNavigate, className, showHint }: {
  item: NavItem; active: boolean; onNavigate: () => void; className?: string; showHint?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-nav={item.id}
      title={showHint ? undefined : item.hint}
      className={clsx(
        'ds-motion-micro flex w-full items-center gap-3 rounded-lg px-3 text-left text-sm min-h-[var(--ds-touch-min)] sm:min-h-10',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
        active ? 'bg-ds-accent font-semibold text-ds-surface shadow-[var(--sf-e1)]' : 'font-medium text-ink-soft hover:bg-ds-subtle hover:text-ink',
        className,
      )}
    >
      <Icon className={clsx('h-4.5 w-4.5 shrink-0', active ? 'text-gold-light' : 'text-ink-mute')} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {showHint && item.hint && <span className="text-[10px] font-normal text-ink-mute">legacy</span>}
    </button>
  );
}

/* ── Account menu (anchored popover; DS modal-behaviour reuse) ──────────── */
function AccountMenu({ onOpenSettings, onOpenDeveloper, onOpenPlatform, developerVisible, platformVisible }: {
  onOpenSettings: () => void; onOpenDeveloper: () => void; onOpenPlatform: () => void;
  developerVisible: boolean; platformVisible: boolean;
}) {
  const { currentMember, currentWorkspace, tierSimulation, simulateTier, switchRole } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useModalBehaviour(open, () => setOpen(false));
  const initials = (currentMember.user.fullName || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2);
  const entry = (label: string, action: () => void, hint?: string) => (
    <button type="button" onClick={() => { setOpen(false); action(); }}
      className={clsx('ds-motion-micro flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm',
        'font-medium text-ink-soft hover:bg-ds-subtle hover:text-ink',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus')}>
      {label}{hint ? <span className="text-[10px] font-normal uppercase tracking-wide text-ink-mute">{hint}</span> : null}
    </button>
  );
  return (
    <div className="relative">
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        data-shell="account-button"
        className={clsx('ds-motion-micro flex min-h-[var(--ds-touch-min)] sm:min-h-10 items-center gap-2 rounded-full border border-line bg-ds-surface pl-1 pr-3',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus')}
      >
        <span className="grid size-8 place-items-center rounded-full bg-ds-accent text-xs font-semibold text-gold-light" aria-hidden="true">{initials}</span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:block">{currentMember.user.fullName || 'Member'}</span>
        <ChevronDown className={clsx('h-4 w-4 text-ink-mute transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div ref={ref} role="menu" aria-label="Account" data-shell="account-menu"
          className="ds-motion-fast absolute right-0 top-[calc(100%+0.5rem)] z-[var(--sf-z-dropdown)] w-72 overflow-hidden rounded-2xl border border-line bg-ds-raised shadow-[var(--sf-e4)]">
          <div className="border-b border-line p-4">
            <p className="truncate text-sm font-semibold text-ink">{currentWorkspace.name || BRAND.productName}</p>
            <p className="text-xs capitalize text-ink-mute">{currentMember.role} · {tierSimulation} plan</p>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {entry('Settings', onOpenSettings)}
            {developerVisible && entry('Developer console', onOpenDeveloper, 'staff')}
            {platformVisible && entry('Platform Control Center', onOpenPlatform, 'admin')}
          </div>
          {/* Demo tooling (Phase 12 simulation) — preserved, clearly labelled */}
          <div className="border-t border-line p-2">
            <Label className="px-3">Demo tools</Label>
            <div className="mt-1 flex flex-wrap gap-1 px-1">
              {(['owner', 'assistant'] as const).map((r) => (
                <button key={r} type="button" onClick={() => switchRole(r)}
                  className={clsx('ds-motion-micro min-h-8 rounded-full border px-3 text-xs font-medium capitalize',
                    currentMember.role === r ? 'border-ds-accent bg-ds-accent text-ds-surface' : 'border-line text-ink-soft hover:bg-ds-subtle')}>
                  {r}
                </button>
              ))}
              {(['BASIC', 'PRO', 'STUDIO'] as const).map((t) => (
                <button key={t} type="button" onClick={() => simulateTier(t)}
                  className={clsx('ds-motion-micro min-h-8 inline-flex items-center gap-1 rounded-full border px-3 text-xs font-medium',
                    tierSimulation === t ? 'border-ds-accent bg-ds-accent text-ds-surface' : 'border-line text-ink-soft hover:bg-ds-subtle')}>
                  {t === 'STUDIO' && <Crown className="h-3 w-3" aria-hidden="true" />}{t}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-line p-2">
            <button type="button" data-shell="sign-out" onClick={() => { void logout(); navigate('/login', { replace: true }); }}
              className={clsx('ds-motion-micro flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-ds-danger',
                'hover:bg-ds-danger-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus')}>
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── The shell ──────────────────────────────────────────────────────────── */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { currentView, setView, currentWorkspace } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const platformVisible = controlCenterVisible();
  const developerVisible = true; // VERIFIED: server-enforced boundary; see navigation.ts (UNRESOLVED client gate)

  const go = (id: WorkspaceViewId) => { setView(id as Parameters<typeof setView>[0]); setMoreOpen(false); };

  const secondaryBlock = (inSheet: boolean) => (
    <nav aria-label={inSheet ? 'More destinations' : 'Secondary'} className="flex flex-col gap-1">
      {SECONDARY_NAV.map((item) => (
        <NavButton key={item.id} item={item} active={currentView === item.id}
          onNavigate={() => go(item.id)} showHint={inSheet} />
      ))}
      <NavButton item={DEVELOPER_NAV} active={currentView === 'developer'} onNavigate={() => go('developer')} showHint={inSheet} />
      {platformVisible && (
        <NavButton item={{ id: 'platform', label: 'Control Center', icon: ShieldCheck }} active={currentView === 'platform'} onNavigate={() => go('platform')} />
      )}
    </nav>
  );

  return (
    <div className="ds min-h-dvh bg-ds-bg" data-shell="workspace">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--sf-z-toast)] focus:rounded-lg focus:bg-ds-accent focus:px-4 focus:py-2 focus:text-ds-surface">
        Skip to content
      </a>

      {/* Header (all sizes) */}
      <header role="banner" data-shell="header"
        className="sticky top-0 z-[var(--sf-z-sticky)] flex min-h-14 items-center justify-between gap-3 border-b border-line bg-ds-surface/95 px-4 py-2 shadow-[var(--sf-e1)] backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="h-8 w-auto lg:hidden" />
          <div className="min-w-0">
            <p className="ds-label hidden lg:block">{currentWorkspace.name || BRAND.productName}</p>
            <h1 className="truncate font-display text-base font-semibold text-ink" data-shell="view-title">{viewTitle(currentView)}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <AccountMenu
            developerVisible={developerVisible}
            platformVisible={platformVisible}
            onOpenSettings={() => go('settings')}
            onOpenDeveloper={() => go('developer')}
            onOpenPlatform={() => go('platform')}
          />
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside data-shell="sidebar" aria-label="Workspace sidebar"
        className="fixed bottom-0 left-0 top-14 hidden w-72 flex-col border-r border-line bg-ds-surface lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="h-10 w-auto" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">{currentWorkspace.name || BRAND.productName}</p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">by {BRAND.parentName}</p>
          </div>
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {PRIMARY_NAV.map((item) => (
            <NavButton key={item.id} item={item} active={currentView === item.id} onNavigate={() => go(item.id)} />
          ))}
          <div className="my-2 h-px bg-line" role="separator" aria-label="Secondary destinations" />
          {secondaryBlock(false)}
        </nav>
      </aside>

      {/* Content */}
      <main id="main-content" ref={mainRef} tabIndex={-1} role="main" data-shell="main"
        className="min-h-[calc(100dvh-3.5rem)] px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:ml-72 lg:pb-6">
        {children}
      </main>

      {/* Mobile bottom navigation — 5 destinations max (Stage 6 §13) */}
      <nav aria-label="Primary" data-shell="bottom-nav"
        className={clsx('ds-motion-none fixed inset-x-0 bottom-0 z-[var(--sf-z-nav)] grid grid-cols-5 border-t border-line bg-ds-surface/95',
          'pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden')}>
        {PRIMARY_NAV.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button key={item.id} type="button" onClick={() => go(item.id)} aria-current={active ? 'page' : undefined}
              data-nav={item.id}
              className={clsx('ds-motion-micro flex min-h-[56px] flex-col items-center justify-center gap-1 border-t-2 px-1 text-[11px]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-focus',
                active ? 'border-ds-focus font-semibold text-ink' : 'border-transparent font-medium text-ink-mute')}>
              <Icon className={clsx('h-5 w-5', active && 'text-gold-dark')} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" data-nav="more"
          className={clsx('ds-motion-micro flex min-h-[56px] flex-col items-center justify-center gap-1 border-t-2 px-1 text-[11px] font-medium',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-focus',
            !PRIMARY_NAV.slice(0, 4).some((n) => n.id === currentView) ? 'border-ds-focus font-semibold text-ink' : 'border-transparent text-ink-mute')}>
          <MoreHorizontal className={clsx('h-5 w-5', !PRIMARY_NAV.slice(0, 4).some((n) => n.id === currentView) && 'text-gold-dark')} aria-hidden="true" />
          More
        </button>
      </nav>

      {/* Mobile More sheet (DS Drawer primitive: focus trap, Escape, restore) */}
      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="More"
        footer={
          <p className="px-1 text-xs text-ink-mute">
            {currentWorkspace.name || BRAND.productName} · <RefreshCw className="inline h-3 w-3" aria-hidden="true" /> offline-first
          </p>
        }>
        <div className="flex flex-col gap-4">
          {/* Stage 10 §49: primary destinations beyond the bottom bar's four
              slots (currently Finance) must stay reachable on mobile. */}
          {PRIMARY_NAV.slice(4).length > 0 && (
            <div>
              <Label className="mb-2 px-1">Workspace</Label>
              <nav aria-label="More workspace destinations" className="flex flex-col gap-1">
                {PRIMARY_NAV.slice(4).map((item) => (
                  <NavButton key={item.id} item={item} active={currentView === item.id} onNavigate={() => go(item.id)} showHint />
                ))}
              </nav>
            </div>
          )}
          <div>
            <Label className="mb-2 px-1">Tools</Label>
            {secondaryBlock(true)}
          </div>
          <p className="px-1 text-xs text-ink-mute">
            Destinations beyond the bottom bar's four slots live here, with materials, reports, the Design Studio legacy entry and console tools.
          </p>
        </div>
      </Drawer>
    </div>
  );
}
