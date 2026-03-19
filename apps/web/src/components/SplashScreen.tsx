import { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';

type SplashScreenProps = {
  onComplete?: () => void;
  isReady?: boolean;
  progress?: number;
  message?: string;
  minDuration?: number;
  maxDuration?: number;
  exitDuration?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function SplashScreen({
  onComplete,
  isReady = false,
  progress,
  message,
  minDuration = 1400,
  maxDuration = 9000,
  exitDuration = 420,
}: SplashScreenProps) {
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [internalProgress, setInternalProgress] = useState(12);
  const [canExit, setCanExit] = useState(false);
  const [forcedReady, setForcedReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const completeCalledRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    updatePreference();

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    const minTimer = window.setTimeout(() => {
      setCanExit(true);
    }, minDuration);

    return () => window.clearTimeout(minTimer);
  }, [minDuration]);

  useEffect(() => {
    const maxTimer = window.setTimeout(() => {
      setForcedReady(true);
    }, maxDuration);

    return () => window.clearTimeout(maxTimer);
  }, [maxDuration]);

  const ready = isReady || forcedReady;

  useEffect(() => {
    if (typeof progress === 'number') return;

    if (ready) {
      setInternalProgress(100);
      return;
    }

    const timer = window.setInterval(() => {
      setInternalProgress((current) => {
        if (current >= 93) return current;

        if (current < 35) return current + 7;
        if (current < 60) return current + 4;
        if (current < 82) return current + 2.2;

        return current + 1.1;
      });
    }, 140);

    return () => window.clearInterval(timer);
  }, [progress, ready]);

  const targetProgress = useMemo(() => {
    if (typeof progress === 'number') {
      return ready ? 100 : clamp(progress, 0, 95);
    }

    return ready ? 100 : clamp(internalProgress, 0, 95);
  }, [progress, internalProgress, ready]);

  const statusText = useMemo(() => {
    if (message) return message;
    if (targetProgress < 25) return 'Restoring session...';
    if (targetProgress < 55) return 'Loading your workspace...';
    if (targetProgress < 85) return 'Syncing preferences...';
    if (targetProgress < 100) return 'Finalizing experience...';
    return 'Ready';
  }, [message, targetProgress]);

  useEffect(() => {
    if (!ready || !canExit || completeCalledRef.current) return;

    const exitDelay = reduceMotion ? 0 : 180;

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, exitDelay);

    const completeTimer = window.setTimeout(() => {
      completeCalledRef.current = true;
      onComplete?.();
    }, exitDelay + (reduceMotion ? 0 : exitDuration));

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [ready, canExit, reduceMotion, exitDuration, onComplete]);

  const motionClass = reduceMotion
    ? ''
    : 'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      aria-label={`${BRAND.productName} is loading`}
      className={[
        'relative flex min-h-screen items-center justify-center overflow-hidden px-6',
        'bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#ecfeff_100%)]',
        motionClass,
        isExiting ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100',
      ].join(' ')}
    >
      <div className="absolute inset-0">
        <div
          className={[
            'absolute -left-16 top-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl',
            reduceMotion ? '' : 'animate-[pulse_8s_ease-in-out_infinite]',
          ].join(' ')}
        />
        <div
          className={[
            'absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl',
            reduceMotion ? '' : 'animate-[pulse_10s_ease-in-out_infinite]',
          ].join(' ')}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,110,140,0.09),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(15,110,140,0.08),transparent_28%)]" />
      </div>

      <div
        className={[
          'relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/70 bg-white/78 px-8 py-10 text-center shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl',
          motionClass,
          mounted && !isExiting
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-3 opacity-0 scale-[0.985]',
        ].join(' ')}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/80 to-transparent" />

        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-[-16px] rounded-[28px] bg-[#0F6E8C]/5 blur-xl" />
            <div
              className={[
                'relative flex items-center justify-center rounded-3xl border border-white/70 bg-white/70 px-5 py-4 shadow-lg',
                motionClass,
                mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
              ].join(' ')}
            >
              <img
                src={stitchflowLogo}
                alt={`${BRAND.productName} logo`}
                className="h-14 w-auto sm:h-16"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>

        <h1
          className={[
            'text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl',
            motionClass,
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
          style={{ transitionDelay: reduceMotion ? '0ms' : '60ms' }}
        >
          {BRAND.productName}
        </h1>

        <p
          className={[
            'mt-3 text-sm font-medium text-[#0F6E8C] sm:text-base',
            motionClass,
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
          style={{ transitionDelay: reduceMotion ? '0ms' : '120ms' }}
        >
          {BRAND.tagline}
        </p>

        <p
          className={[
            'mt-6 text-xs uppercase tracking-[0.24em] text-slate-500',
            motionClass,
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
          style={{ transitionDelay: reduceMotion ? '0ms' : '180ms' }}
        >
          by {BRAND.parentName}
        </p>

        <div
          className={[
            'mt-8',
            motionClass,
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
          style={{ transitionDelay: reduceMotion ? '0ms' : '240ms' }}
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span
              className={[
                'h-2 w-2 rounded-full bg-[#0F6E8C]',
                reduceMotion ? '' : 'animate-pulse',
              ].join(' ')}
            />
            <span>{statusText}</span>
          </div>

          <div
            className="relative mx-auto h-2.5 w-full max-w-[260px] overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-slate-200/70"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-sky-600 to-[#0F6E8C] transition-[width] duration-500 ease-out"
              style={{ width: `${targetProgress}%` }}
            />
            {!reduceMotion && targetProgress < 100 && (
              <div className="absolute inset-0 animate-[pulse_1.6s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_45%,transparent_100%)]" />
            )}
          </div>

          <div className="mt-3 text-[11px] font-medium tracking-wide text-slate-400">
            {Math.round(targetProgress)}%
          </div>
        </div>
      </div>
    </div>
  );
}
