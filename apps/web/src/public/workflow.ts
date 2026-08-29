/** Phase 12 — the StitchFlow pipeline narrative. Copy states only real,
 *  existing product capabilities (measurements profiles, Design Studio,
 *  Pattern Engine, Production Board, business dashboards). */
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
    id: 'measure',
    index: '01',
    title: 'Measure',
    happens: 'Human measurements become structured measurement data — recorded per customer, consistent every time.',
    matters: 'Paper cards get lost, misread and reordered. Structured measurements make every downstream decision precise.',
    helps: 'StitchFlow gives each customer a clean measurement profile your whole workshop can trust.',
  },
  {
    id: 'design',
    index: '02',
    title: 'Design',
    happens: 'Measurements feed garment creation in the Design Studio — silhouettes, fabrics and details, composed digitally.',
    matters: 'Design intent lives with the measurement it was made for, not on a separate sketchpad.',
    helps: 'StitchFlow’s Design Studio turns a profile into a structured garment design.',
  },
  {
    id: 'pattern',
    index: '03',
    title: 'Pattern',
    happens: 'A design resolves into technical pattern structure — pieces, construction lines and dimensions.',
    matters: 'The pattern is where craft becomes geometry; precision here is precision in the cloth.',
    helps: 'StitchFlow’s Pattern Engine presents the technical structure behind the garment.',
  },
  {
    id: 'produce',
    index: '04',
    title: 'Produce',
    happens: 'Patterns move into a production workflow — orders tracked through stages toward completion.',
    matters: 'Digital planning only matters when it reaches the floor; visibility replaces guesswork.',
    helps: 'StitchFlow’s Production Board carries each order from plan to finished garment.',
  },
  {
    id: 'manage',
    index: '05',
    title: 'Manage Your Business',
    happens: 'Customers, orders, invoices and reports in one operational picture.',
    matters: 'Craft is the product; the business around it must be just as well cut.',
    helps: 'StitchFlow keeps your studio’s day-to-day — customers, production and money — visible and ordered.',
  },
];
