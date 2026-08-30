/** Phase 11 — design tokens exposed as Tailwind utilities.
 *  The canonical values live as CSS custom properties in src/index.css;
 *  this config maps them so utilities (bg-ivory, text-ink, rounded-card,
 *  shadow-e2, duration-fast, ease-standard, font-display…) stay coherent.
 */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "var(--sf-ivory)",
        charcoal: "var(--sf-charcoal)",
        gold: {
          light: "var(--sf-gold-light)",
          DEFAULT: "var(--sf-gold)",
          dark: "var(--sf-gold-dark)",
        },
        burgundy: "var(--sf-burgundy)",
        grey: {
          light: "var(--sf-grey-light)",
          DEFAULT: "var(--sf-grey)",
        },
        ds: {
          bg: "var(--ds-bg)",
          surface: "var(--ds-surface)",
          subtle: "var(--ds-surface-subtle)",
          raised: "var(--ds-surface-raised)",
          active: "var(--ds-surface-active)",
          accent: "var(--ds-accent)",
          "accent-hover": "var(--ds-accent-hover)",
          focus: "var(--ds-focus)",
          success: "var(--ds-success)",
          warning: "var(--ds-warning)",
          danger: "var(--ds-danger)",
          info: "var(--ds-info)",
          advisory: "var(--ds-advisory)",
        },
        ink: {
          DEFAULT: "var(--sf-ink)",
          soft: "var(--sf-ink-soft)",
          mute: "var(--sf-ink-mute)",
        },
        line: "var(--sf-line)",
        surface: "var(--sf-surface)",
      },
      fontFamily: {
        display: [
          '"Hanken Grotesk Variable"',
          '"Hanken Grotesk"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          '"Geist Variable"',
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono Variable"',
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      borderRadius: {
        input: "var(--sf-radius-input)",
        btn: "var(--sf-radius-btn)",
        card: "var(--sf-radius-card)",
        modal: "var(--sf-radius-modal)",
      },
      boxShadow: {
        e1: "var(--sf-e1)",
        e2: "var(--sf-e2)",
        e3: "var(--sf-e3)",
        e4: "var(--sf-e4)",
      },
      transitionDuration: {
        micro: "150ms",
        fast: "250ms",
        medium: "400ms",
        slow: "600ms",
        cinematic: "800ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        dramatic: "cubic-bezier(0.65, 0, 0.35, 1)",
        sharp: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      zIndex: {
        nav: "100",
        dropdown: "200",
        sticky: "300",
        overlay: "400",
        modal: "500",
        toast: "600",
      },
    },
  },
  plugins: [],
};
