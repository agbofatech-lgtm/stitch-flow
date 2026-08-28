/**
 * Phase 11 — motion primitives. CSS-driven (transform/opacity only),
 * reduced-motion aware via the global media query in index.css, no loops,
 * nothing to clean up on unmount.
 *
 * PageTransition is enter-only by design (§23: never delay navigation): the
 * state-driven router unmounts the previous view immediately, so an exit
 * animation would require holding the old view alive and deferring the
 * switch — rejected. Enter keyframes communicate continuity instead.
 */
import type { ReactNode } from 'react';

export function PageTransition({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  return (
    <div key={viewKey} className="sf-page-enter">
      {children}
    </div>
  );
}

export function Fade({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sf-fade-enter ${className}`}>{children}</div>;
}

export function Rise({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sf-rise-enter ${className}`}>{children}</div>;
}

/** 80ms staggered reveal for card grids. */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sf-stagger ${className}`}>{children}</div>;
}
