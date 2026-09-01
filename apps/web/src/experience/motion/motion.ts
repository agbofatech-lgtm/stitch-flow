export const motionDuration = {
  instant: 0.08,
  micro: 0.1,
  fast: 0.14,
  base: 0.22,
  slow: 0.28,
  milestone: 0.32,
} as const;

export const motionEase = {
  standard: [0.2, 0, 0, 1] as const,
  enter: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  emphasize: [0.2, 0, 0, 1.2] as const,
};

export type MotionCategory = 'micro' | 'contextual' | 'workspace' | 'milestone';

export const ATELIER_JOURNEY = [
  'command',
  'clients',
  'measurements',
  'design',
  'production',
  'business',
] as const;

export function journeyIndex(room: string) {
  const index = ATELIER_JOURNEY.indexOf(room as (typeof ATELIER_JOURNEY)[number]);
  return index === -1 ? 0 : index;
}

export const motionPresets = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motionDuration.base, ease: motionEase.standard },
  },
  panel: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: motionDuration.base, ease: motionEase.standard },
  },
  contextual: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: motionDuration.fast, ease: motionEase.enter },
  },
  modal: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: motionDuration.fast, ease: motionEase.enter },
  },
  sheet: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
    transition: { duration: motionDuration.base, ease: motionEase.standard },
  },
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motionDuration.fast, ease: motionEase.standard },
  },
  empty: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: motionDuration.fast, ease: motionEase.standard },
  },
  milestone: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDuration.milestone, ease: motionEase.enter },
  },
  dropdown: {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: motionDuration.fast, ease: motionEase.standard },
  },
};

export function workspacePreset(fromRoom: string, toRoom: string) {
  const delta = journeyIndex(toRoom) - journeyIndex(fromRoom);
  const x = delta === 0 ? 0 : delta > 0 ? 16 : -16;
  return {
    initial: { opacity: 0, x },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -x },
    transition: { duration: motionDuration.base, ease: motionEase.standard },
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionOrInstant<T extends { initial?: unknown; animate?: unknown; exit?: unknown; transition?: { duration?: number } }>(
  preset: T
): T {
  if (!prefersReducedMotion()) return preset;
  return {
    ...preset,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motionDuration.instant, ease: motionEase.standard },
  } as T;
}
