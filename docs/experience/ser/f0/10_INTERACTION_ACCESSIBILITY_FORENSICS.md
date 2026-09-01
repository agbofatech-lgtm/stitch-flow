# Interaction and accessibility forensics

Not a WCAG certification.

## Keyboard

| Item | Evidence |
|---|---|
| Skip link | AtelierShell `.sf-skip-link` |
| Cmd/Ctrl+K | StudioShell |
| Escape + focus trap | shared `Dialog` in `overlays.tsx` |
| Local modals (Orders/Materials/Invoices) | custom; trap/Escape **not uniformly evidenced** |
| Tab order | NOT VERIFIED |
| Focus visible | `:focus-visible` token ring in `index.css` |

## Dialog implementations

| Kind | Where |
|---|---|
| Shared Dialog | Customers; DesignStudio trusted finalize |
| ConfirmationDialog | exported; usage not dominant |
| Local overlay components | OrderFormModal, AddMaterialToOrderModal, MaterialModal, InvoiceModal, PaymentModal |
| Browser native | not primary |
| Nested ModalShell | **product Customers no longer**; nested `stitch-flow/` still has it |

## States

Loading/empty/error primitives exist and are used on HTTP screens. Offline is a **badge**, not a blocking experience. Sync pending is a count. No product-wide retry choreography.

## Reduced motion

Splash and `motionOrInstant` respect `prefers-reduced-motion`. Local CSS keyframes in Splash are gated. Design Studio internals NOT VERIFIED.

## Accessibility debt

- HTTP error screens may be the first “accessible” thing a user hits (alert role used in WorkflowPanel errors).
- Control Center JSON dumps are not operable documents.
- Manifest/theme mismatch.
- No lab: screen reader, contrast, target size — NOT VERIFIED.
