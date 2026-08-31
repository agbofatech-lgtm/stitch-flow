export const motionDuration = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
} as const;

export const motionEase = {
  standard: [0.2, 0, 0, 1] as const,
  emphasize: [0.2, 0, 0, 1.2] as const,
  exit: [0.4, 0, 1, 1] as const,
};

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
  modal: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: motionDuration.fast, ease: motionEase.emphasize },
  },
  dropdown: {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: motionDuration.fast, ease: motionEase.standard },
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionOrInstant<T extends { transition?: { duration?: number } }>(
  preset: T
): T {
  if (!prefersReducedMotion()) return preset;
  return {
    ...preset,
    initial: false,
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
  } as T;
}
