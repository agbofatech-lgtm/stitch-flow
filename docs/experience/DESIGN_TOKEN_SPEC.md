# Design Token Spec

Source of truth: `apps/web/src/experience/tokens/tokens.css`.

Light values are taken from `BRAND.colors` (FACT: `#0F6E8C` primary, `#F8FBFC` workspace, `#1E2933` charcoal).

| Semantic | CSS variable | Light |
|---|---|---|
| surface.canvas | `--sf-surface-canvas` | `#f4f8fa` |
| surface.workspace | `--sf-surface-workspace` | `#f8fbfc` |
| surface.panel | `--sf-surface-panel` | `#ffffff` |
| surface.elevated | `--sf-surface-elevated` | `#ffffff` |
| text.primary | `--sf-text-primary` | `#1e2933` |
| text.secondary | `--sf-text-secondary` | `#334155` |
| text.muted | `--sf-text-muted` | `#64748b` |
| action.primary | `--sf-action-primary` | `#0f6e8c` |
| action.secondary | `--sf-action-secondary` | `#e8f2f6` |
| status.success | `--sf-status-success` | `#16a34a` |
| status.warning | `--sf-status-warning` | `#d97706` |
| status.danger | `--sf-status-danger` | `#dc2626` |
| status.info | `--sf-status-info` | `#0284c7` |
| border.default | `--sf-border-default` | `#d9e5ea` |
| focus.ring | `--sf-focus-ring` | `#0f6e8c` |

Dark theme is tokenized on `[data-theme='dark']`. Product app does not switch yet; the foundation preview does.

Breakpoints: Tailwind defaults plus `workspace` = 1440px.
