// /components/SplashScreen.tsx
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
  const [logoIntroActive, setLogoIntroActive] = useState(false);

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

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setLogoIntroActive(false);
      return;
    }

    setLogoIntroActive(true);

    const timer = window.setTimeout(() => {
      setLogoIntroActive(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

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
    if (targetProgress < 25) return 'Threading your workspace...';
    if (targetProgress < 55) return 'Stitching your dashboard...';
    if (targetProgress < 85) return 'Sewing everything together...';
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

  const logoIntroClass =
    reduceMotion || !logoIntroActive
      ? ''
      : 'animate-[splashLogoSpinGrow_1350ms_cubic-bezier(0.22,1,0.36,1)_both]';

  const nameIntroClass =
    reduceMotion
      ? ''
      : mounted
        ? 'animate-[brandNameEnter_900ms_cubic-bezier(0.22,1,0.36,1)_both]'
        : '';

  const sewingIntroClass =
    reduceMotion
      ? ''
      : mounted
        ? 'animate-[sewingReveal_1000ms_cubic-bezier(0.22,1,0.36,1)_both]'
        : '';

  return (
    <>
      <style>
        {`
          @keyframes splashLogoSpinGrow {
            0% {
              opacity: 0;
              transform: scale(0.18) rotate(0deg);
              filter: blur(8px);
            }
            18% {
              opacity: 1;
              transform: scale(0.34) rotate(120deg);
              filter: blur(4px);
            }
            42% {
              opacity: 1;
              transform: scale(0.68) rotate(260deg);
              filter: blur(2px);
            }
            62% {
              opacity: 1;
              transform: scale(1.06) rotate(360deg);
              filter: blur(0);
            }
            78% {
              opacity: 1;
              transform: scale(1.14) rotate(360deg);
              filter: blur(0);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(360deg);
              filter: blur(0);
            }
          }

          @keyframes brandNameEnter {
            0% {
              opacity: 0;
              transform: translateY(16px) scale(0.9);
              letter-spacing: 0.28em;
              filter: blur(6px);
            }
            60% {
              opacity: 1;
              transform: translateY(0) scale(1.06);
              letter-spacing: 0.08em;
              filter: blur(0);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
              letter-spacing: 0.02em;
              filter: blur(0);
            }
          }

          @keyframes sewingReveal {
            0% {
              opacity: 0;
              transform: translateY(10px) scale(0.96);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes sewingMachineDrive {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(176px);
            }
          }

          @keyframes sewingNeedle {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(5px);
            }
          }

          @keyframes stitchDraw {
            0% {
              stroke-dashoffset: 220;
              opacity: 0.4;
            }
            100% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
          }

          @keyframes stitchGlow {
            0%, 100% {
              opacity: 0.45;
            }
            50% {
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        role="status"
        aria-live="polite"
        aria-busy={!ready}
        aria-label={`${BRAND.productName} is loading`}
        className={[
          'relative flex min-h-screen items-center justify-center overflow-hidden px-6',
          'bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.16),transparent_32%),linear-gradient(135deg,#F7F5F0_0%,#FFFDF9_48%,#E8E5DF_100%)]',
          motionClass,
          isExiting ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100',
        ].join(' ')}
      >
        <div className="absolute inset-0">
          <div
            className={[
              'absolute -left-16 top-10 h-64 w-64 rounded-full bg-gold/10 blur-3xl',
              reduceMotion ? '' : 'animate-[pulse_8s_ease-in-out_infinite]',
            ].join(' ')}
          />
          <div
            className={[
              'absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-gold-dark/10 blur-3xl',
              reduceMotion ? '' : 'animate-[pulse_10s_ease-in-out_infinite]',
            ].join(' ')}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.05),transparent_28%)]" />
        </div>

        <div
          className={[
            'relative w-full max-w-md overflow-hidden rounded-[32px] border border-line bg-surface/80 px-8 py-10 text-center shadow-e4 backdrop-blur-2xl',
            motionClass,
            mounted && !isExiting
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-3 opacity-0 scale-[0.985]',
          ].join(' ')}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />

          <div className="mb-7 flex justify-center">
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-[32px] bg-gold/20 blur-2xl" />
              <div
                className={[
                  'relative flex items-center justify-center rounded-3xl border border-white/70 bg-white/70 px-5 py-4 shadow-lg',
                  motionClass,
                  logoIntroClass,
                  mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
                ].join(' ')}
                style={{ transformOrigin: 'center center' }}
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
              'text-3xl font-semibold tracking-tight text-ink sm:text-4xl font-display',
              motionClass,
              nameIntroClass,
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
            style={{ transitionDelay: reduceMotion ? '0ms' : '160ms' }}
          >
            {BRAND.productName}
          </h1>

          <div
            className={[
              'mx-auto mt-4 w-full max-w-[280px]',
              sewingIntroClass,
            ].join(' ')}
            aria-hidden="true"
          >
            <div className="relative h-10 overflow-hidden">
              <svg
                viewBox="0 0 280 40"
                className="absolute inset-0 h-full w-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M58 24 C85 24, 102 24, 122 24 S160 24, 184 24 S220 24, 244 24"
                  stroke="#A88950"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="8 8"
                  strokeDashoffset="220"
                  style={{
                    animation: reduceMotion
                      ? 'none'
                      : 'stitchDraw 1.4s ease-out 320ms both, stitchGlow 1.8s ease-in-out 1.1s infinite',
                  }}
                />
              </svg>

              <div
                className="absolute left-0 top-[1px]"
                style={{
                  animation: reduceMotion
                    ? 'none'
                    : 'sewingMachineDrive 1.4s cubic-bezier(0.22,1,0.36,1) 260ms both',
                }}
              >
                <svg
                  width="56"
                  height="36"
                  viewBox="0 0 56 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-sm"
                >
                  <rect x="10" y="20" width="24" height="7" rx="2.5" fill="#18181B" />
                  <path d="M18 11C18 8.8 19.8 7 22 7H31C34.3 7 37 9.7 37 13V20H18V11Z" fill="#18181B" />
                  <rect x="31" y="10" width="8" height="4" rx="1.5" fill="#C9A96E" />
                  <rect x="12" y="27" width="30" height="3" rx="1.5" fill="#1E293B" opacity="0.85" />
                  <rect x="40" y="18" width="2.5" height="10" rx="1.25" fill="#1E293B" />
                  <rect
                    x="39.8"
                    y="19"
                    width="3"
                    height="10"
                    rx="1.5"
                    fill="#1E293B"
                    style={{
                      transformOrigin: '41.3px 24px',
                      animation: reduceMotion ? 'none' : 'sewingNeedle 260ms ease-in-out infinite',
                    }}
                  />
                  <circle cx="14" cy="17" r="1.6" fill="#E2E8F0" />
                  <circle cx="18" cy="17" r="1.2" fill="#E2E8F0" />
                </svg>
              </div>
            </div>
          </div>

          <p
            className={[
              'mt-3 text-sm font-medium text-gold-dark sm:text-base',
              motionClass,
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
            style={{ transitionDelay: reduceMotion ? '0ms' : '260ms' }}
          >
            {BRAND.tagline}
          </p>

          <p
            className={[
              'mt-6 text-xs uppercase tracking-[0.24em] text-slate-500',
              motionClass,
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
            style={{ transitionDelay: reduceMotion ? '0ms' : '320ms' }}
          >
            by {BRAND.parentName}
          </p>

          <div
            className={[
              'mt-8',
              motionClass,
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
            style={{ transitionDelay: reduceMotion ? '0ms' : '380ms' }}
          >
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span
                className={[
                  'h-2 w-2 rounded-full bg-gold',
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
                className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-[width] duration-500 ease-out"
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
    </>
  );
}
