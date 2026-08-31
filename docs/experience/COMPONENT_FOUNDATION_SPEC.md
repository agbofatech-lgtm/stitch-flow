# Component Foundation Spec

All components live under `apps/web/src/experience/primitives/` and consume semantic tokens.

| Component | States covered | A11y notes |
|---|---|---|
| Button | default, hover, focus-visible, disabled, loading, danger | `aria-busy` when loading |
| IconButton | default, hover, disabled | required `aria-label` |
| Input / Textarea / Select | default, disabled, read-only, invalid | used inside Field |
| Field | required, hint, error | `label[for]`, `role=alert` on error |
| Checkbox / Radio | checked, disabled | labeled |
| Switch | on/off, disabled | `role=switch` `aria-checked` |
| Badge | info/success/warning/danger/neutral | text only |
| Tooltip | hover/focus-within | `role=tooltip` |
| Dialog / Sheet | open/closed | `aria-modal`, Escape, overlay click, focus restore |
| Dropdown / Menu | open/closed | `role=menu` / `menuitem` |
| Combobox | filter | `role=combobox` / `listbox` |
| Tabs | selected | `tablist` / `tab` / `tabpanel` |
| Breadcrumb | current page | `aria-current` |
| Command Menu | filter | dialog + labeled input |
| DataTable | empty / rows | caption, `scope=col`, overflow-x |
| Empty / Loading / Error / Skeleton / Toast / Pagination | — | status/alert roles |

Layout primitives: Stack, Inline, Grid, Panel, Section, Container, SplitPane, ScrollArea, ResponsiveRegion.

Existing `components/ui/EmptyState.tsx` is **not** deleted (ADAPT). New canonical empty state is `ExperienceEmptyState`.
