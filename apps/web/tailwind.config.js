module.exports = {
  content: [
    "./index.html",
    "./experience-preview.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: "var(--sf-surface-canvas)",
          workspace: "var(--sf-surface-workspace)",
          panel: "var(--sf-surface-panel)",
          elevated: "var(--sf-surface-elevated)",
        },
        ink: {
          primary: "var(--sf-text-primary)",
          secondary: "var(--sf-text-secondary)",
          muted: "var(--sf-text-muted)",
          inverse: "var(--sf-text-inverse)",
        },
        action: {
          primary: "var(--sf-action-primary)",
          hover: "var(--sf-action-primary-hover)",
          secondary: "var(--sf-action-secondary)",
        },
        status: {
          success: "var(--sf-status-success)",
          warning: "var(--sf-status-warning)",
          danger: "var(--sf-status-danger)",
          info: "var(--sf-status-info)",
        },
        line: {
          DEFAULT: "var(--sf-border-default)",
          strong: "var(--sf-border-strong)",
        },
        ring: {
          focus: "var(--sf-focus-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--sf-font-sans)"],
        display: ["var(--sf-font-display)"],
        numeric: ["var(--sf-font-numeric)"],
      },
      fontSize: {
        display: ["var(--sf-text-display)", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-lg": ["var(--sf-text-heading-lg)", { lineHeight: "1.25", fontWeight: "700" }],
        heading: ["var(--sf-text-heading)", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["var(--sf-text-heading-sm)", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["var(--sf-text-body)", { lineHeight: "1.5" }],
        label: ["var(--sf-text-label)", { lineHeight: "1.4", fontWeight: "600" }],
        meta: ["var(--sf-text-meta)", { lineHeight: "1.4" }],
        numeric: ["var(--sf-text-numeric)", { lineHeight: "1.4", fontFeatureSettings: '"tnum"' }],
      },
      borderRadius: {
        sf: "var(--sf-radius-md)",
        "sf-sm": "var(--sf-radius-sm)",
        "sf-lg": "var(--sf-radius-lg)",
        "sf-workspace": "var(--sf-radius-workspace)",
        "sf-pill": "var(--sf-radius-pill)",
      },
      boxShadow: {
        "sf-sm": "var(--sf-elevation-sm)",
        "sf-md": "var(--sf-elevation-md)",
        "sf-lg": "var(--sf-elevation-lg)",
      },
      zIndex: {
        sticky: "20",
        dropdown: "40",
        overlay: "50",
        modal: "60",
        toast: "70",
      },
      transitionDuration: {
        instant: "80ms",
        fast: "140ms",
        base: "220ms",
        slow: "360ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasize: "cubic-bezier(0.2, 0, 0, 1.2)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      screens: {
        workspace: "1440px",
      },
    },
  },
  plugins: [],
};
