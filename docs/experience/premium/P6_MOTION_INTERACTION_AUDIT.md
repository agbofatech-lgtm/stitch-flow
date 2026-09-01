# P6 — Motion & Interaction Audit

## Motion inventory

- `experience/motion/motion.ts`: fade/panel/modal/dropdown; `prefersReducedMotion`; durations 80–360ms.
- StudioShell: AnimatePresence panel preset.
- SplashScreen: custom keyframes; `reduceMotion` disables spin.
- tokens.css: `.sf-motion-safe` reduced-motion kill.
- Buttons: `transition duration-fast`.
- DesignStudio: almost no motion beyond Tailwind `transition` on buttons.

## Interaction states

Experience `Button` has hover/disabled/loading/focus-visible (`sf-focus-ring`).

Legacy screens: hover yes; loading often absent; focus rings inconsistent (many `outline-none` in DesignStudio).

Toasts exist as primitive; not the primary status path (inline status strings in Studio).

## Verdict

Motion system is **good and underused**. Splash is **excessive relative to the rest**. Reduced-motion **exists for splash + token class**, not guaranteed on every legacy control.
