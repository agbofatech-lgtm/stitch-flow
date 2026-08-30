/** Stage 11 — the StitchFlow journey narrative. Copy states only real,
 *  implemented capabilities, each traceable to an accepted stage:
 *    01 Know the customer  — Stage 7 customer & workspace experience
 *    02 Define the garment — Stage 8 order creation workflow
 *    03 Understand the context — Stage 9 contextual intelligence (advisory)
 *    04 Follow the work    — Stage 10 production lifecycle (canonical 9)
 *    05 Close the loop     — Stage 10 financial operations
 *  No claim beyond implementation (Phase 18 capability matrix, Stage 11 doc). */
export interface WorkflowStage {
  id: string;
  index: string;
  title: string;
  happens: string;
  matters: string;
  helps: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'customer',
    index: '01',
    title: 'Know the customer',
    happens: 'Every order starts with a person — their details, their measurement profiles, their order history, one workspace.',
    matters: 'A measurement retaken is a garment re-cut. Context kept per customer keeps every later decision grounded.',
    helps: 'StitchFlow gives each customer a workspace — profiles, orders and history in one place.',
  },
  {
    id: 'garment',
    index: '02',
    title: 'Define the garment',
    happens: 'Garment, measurements, design reference and fabric walk through one ordered flow to a confirmed order.',
    matters: 'Choices scattered across chats and phone calls become mistakes at the machine. An ordered flow makes the brief unambiguous.',
    helps: 'The StitchFlow order workflow carries a garment from first choice to a confirmed, snapshotted brief.',
  },
  {
    id: 'context',
    index: '03',
    title: 'Understand the context',
    happens: 'Each order carries its own measurement snapshot, readiness checks and fit-risk advisory — explainable, never silent.',
    matters: 'Confidence comes from knowing what is known: what is measured, what is missing, what changed since confirmation.',
    helps: 'Contextual intelligence reads the order and explains itself — and leaves every decision with you.',
  },
  {
    id: 'production',
    index: '04',
    title: 'Follow the work',
    happens: 'Confirmed orders move through a disciplined nine-stage lifecycle, from measurement to delivered, with a trail of notes.',
    matters: '“In progress” hides the truth. A visible lifecycle shows exactly where every garment stands and what it still needs.',
    helps: 'The production board follows each order through the canonical stages of the craft.',
  },
  {
    id: 'finance',
    index: '05',
    title: 'Close the loop',
    happens: 'Invoices, payments and balances tracked per order — production and money related, but never confused.',
    matters: 'A finished garment and a settled balance are two different facts. Both need a clear home.',
    helps: 'StitchFlow keeps the financial loop visible — invoice to payment to balance.',
  },
];
