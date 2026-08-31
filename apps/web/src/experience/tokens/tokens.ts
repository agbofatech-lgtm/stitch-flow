/**
 * Semantic design tokens. Screens must not hardcode domain math here.
 * Values mirror CSS variables in tokens.css.
 */

export const color = {
  canvas: 'var(--sf-surface-canvas)',
  workspace: 'var(--sf-surface-workspace)',
  panel: 'var(--sf-surface-panel)',
  elevated: 'var(--sf-surface-elevated)',
  textPrimary: 'var(--sf-text-primary)',
  textSecondary: 'var(--sf-text-secondary)',
  textMuted: 'var(--sf-text-muted)',
  textInverse: 'var(--sf-text-inverse)',
  actionPrimary: 'var(--sf-action-primary)',
  actionPrimaryHover: 'var(--sf-action-primary-hover)',
  actionSecondary: 'var(--sf-action-secondary)',
  success: 'var(--sf-status-success)',
  warning: 'var(--sf-status-warning)',
  danger: 'var(--sf-status-danger)',
  info: 'var(--sf-status-info)',
  borderDefault: 'var(--sf-border-default)',
  borderStrong: 'var(--sf-border-strong)',
  focusRing: 'var(--sf-focus-ring)',
} as const;

export const fontFamily = {
  sans: 'var(--sf-font-sans)',
  display: 'var(--sf-font-display)',
  numeric: 'var(--sf-font-numeric)',
} as const;

export const fontSize = {
  display: 'var(--sf-text-display)',
  headingLg: 'var(--sf-text-heading-lg)',
  heading: 'var(--sf-text-heading)',
  headingSm: 'var(--sf-text-heading-sm)',
  body: 'var(--sf-text-body)',
  label: 'var(--sf-text-label)',
  meta: 'var(--sf-text-meta)',
  numeric: 'var(--sf-text-numeric)',
} as const;

export const space = {
  0: '0',
  1: 'var(--sf-space-1)',
  2: 'var(--sf-space-2)',
  3: 'var(--sf-space-3)',
  4: 'var(--sf-space-4)',
  5: 'var(--sf-space-5)',
  6: 'var(--sf-space-6)',
  8: 'var(--sf-space-8)',
  10: 'var(--sf-space-10)',
  12: 'var(--sf-space-12)',
} as const;

export const radius = {
  sm: 'var(--sf-radius-sm)',
  md: 'var(--sf-radius-md)',
  lg: 'var(--sf-radius-lg)',
  workspace: 'var(--sf-radius-workspace)',
  pill: 'var(--sf-radius-pill)',
} as const;

export const elevation = {
  none: 'var(--sf-elevation-none)',
  sm: 'var(--sf-elevation-sm)',
  md: 'var(--sf-elevation-md)',
  lg: 'var(--sf-elevation-lg)',
} as const;

export const zIndex = {
  base: 'var(--sf-z-base)',
  sticky: 'var(--sf-z-sticky)',
  dropdown: 'var(--sf-z-dropdown)',
  overlay: 'var(--sf-z-overlay)',
  modal: 'var(--sf-z-modal)',
  toast: 'var(--sf-z-toast)',
} as const;

export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  workspace: '1440px',
} as const;

export const duration = {
  instant: 'var(--sf-duration-instant)',
  fast: 'var(--sf-duration-fast)',
  base: 'var(--sf-duration-base)',
  slow: 'var(--sf-duration-slow)',
} as const;

export const easing = {
  standard: 'var(--sf-ease-standard)',
  emphasize: 'var(--sf-ease-emphasize)',
  exit: 'var(--sf-ease-exit)',
} as const;
