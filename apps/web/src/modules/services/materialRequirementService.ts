/**
 * Phase 16 — Material Requirements Service.
 * Derives material list from garment category, design components, and pattern pieces.
 * All defaults are labeled with source and confidence.
 */

import type { MaterialRequirement, MaterialCategory, MaterialSource } from '../../shared/api/production';
import type { DesignSpecification } from '../../shared/api/design';
import type { PatternModel } from '../../shared/api/pattern';

function generateId(): string {
  return `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mat(
  productionPlanId: string,
  category: MaterialCategory,
  name: string,
  quantity: number,
  unit: string,
  source: MaterialSource,
  confidence: 'high' | 'medium' | 'low',
  required: boolean,
  notes?: string,
): MaterialRequirement {
  return {
    id: generateId(),
    productionPlanId,
    category,
    name,
    quantity,
    unit,
    source,
    confidence,
    required,
    notes: notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Garment category → base materials
// ---------------------------------------------------------------------------

function getGarmentDefaultMaterials(
  planId: string,
  garmentCategory: string,
): MaterialRequirement[] {
  const cat = garmentCategory.toLowerCase();
  const materials: MaterialRequirement[] = [];

  // Thread — always needed
  materials.push(mat(planId, 'thread', 'Sewing thread (main colour)', 2, 'spool',
    'garment_default', 'medium', true, 'Thread requirement: garment production default'));

  // Interfacing — most structured garments
  if (['shirt', 'blouse', 'jacket', 'suit', 'dress', 'gown'].includes(cat)) {
    materials.push(mat(planId, 'interfacing', 'Woven interfacing', 0.5, 'meter',
      'garment_default', 'medium', false, 'Source: garment production default'));
  }

  // Lining
  if (['dress', 'gown', 'jacket', 'suit', 'skirt'].includes(cat)) {
    materials.push(mat(planId, 'lining', 'Lining fabric (contrast or match)', 1.0, 'meter',
      'garment_default', 'low', false, 'Source: garment production default. Quantity may vary.'));
  }

  // Closures
  if (['shirt', 'blouse', 'dress', 'gown', 'jacket', 'suit'].includes(cat)) {
    materials.push(mat(planId, 'button', 'Buttons', 7, 'piece',
      'garment_default', 'low', false, 'Source: garment default. Confirm quantity with design.'));
  }
  if (['trouser', 'skirt', 'dress', 'gown'].includes(cat)) {
    materials.push(mat(planId, 'zipper', 'Invisible zipper', 1, 'piece',
      'garment_default', 'medium', false, 'Source: garment default. Confirm length with design.'));
  }
  if (['trouser', 'skirt'].includes(cat)) {
    materials.push(mat(planId, 'elastic', 'Waistband elastic', 1, 'meter',
      'garment_default', 'medium', false, 'Source: garment default. Only if elastic waistband.'));
  }
  if (['kaftan', 'agbada', 'senator'].includes(cat)) {
    materials.push(mat(planId, 'bias_tape', 'Bias tape / binding', 2, 'meter',
      'garment_default', 'medium', false, 'Source: garment default. Used for neckline finishing.'));
  }

  return materials;
}

// ---------------------------------------------------------------------------
// Design specification → component-driven materials
// ---------------------------------------------------------------------------

function getDesignSpecMaterials(
  planId: string,
  spec: DesignSpecification,
): MaterialRequirement[] {
  const materials: MaterialRequirement[] = [];
  const constructions = spec.constructionDetails ?? [];
  const components = spec.components ?? [];

  // Buttons from construction details
  if (constructions.some((c) => c.toLowerCase().includes('button'))) {
    materials.push(mat(planId, 'button', 'Buttons (design specification)', 8, 'piece',
      'design_specification', 'high', true, 'Specified in construction details'));
  }
  if (constructions.some((c) => c.toLowerCase().includes('zipper'))) {
    materials.push(mat(planId, 'zipper', 'Zipper (design specification)', 1, 'piece',
      'design_specification', 'high', true, 'Specified in construction details'));
  }
  if (constructions.some((c) => c.toLowerCase().includes('lining'))) {
    materials.push(mat(planId, 'lining', 'Lining fabric (design specification)', 1.2, 'meter',
      'design_specification', 'high', true, 'Specified in construction details'));
  }
  if (constructions.some((c) => c.toLowerCase().includes('interfacing'))) {
    materials.push(mat(planId, 'interfacing', 'Interfacing (design specification)', 0.5, 'meter',
      'design_specification', 'high', true, 'Specified in construction details'));
  }
  if (constructions.some((c) => c.toLowerCase().includes('elastic'))) {
    materials.push(mat(planId, 'elastic', 'Elastic (design specification)', 1, 'meter',
      'design_specification', 'high', true, 'Specified in construction details'));
  }

  // Lining from components
  if (components.some((c) => c.type === 'lining')) {
    materials.push(mat(planId, 'lining', 'Lining (component requirement)', 1.0, 'meter',
      'design_specification', 'high', true, 'Required by lining component'));
  }

  return materials;
}

// ---------------------------------------------------------------------------
// Pattern piece → interfacing requirements
// ---------------------------------------------------------------------------

function getPatternMaterials(
  planId: string,
  model: PatternModel,
): MaterialRequirement[] {
  const materials: MaterialRequirement[] = [];

  const hasCollar = model.pieces.some((p) =>
    p.name.toLowerCase().includes('collar') || p.name.toLowerCase().includes('cuff'),
  );
  const hasLining = model.pieces.some((p) =>
    p.name.toLowerCase().includes('lining') || p.name.toLowerCase().includes('facing'),
  );

  if (hasCollar) {
    materials.push(mat(planId, 'interfacing', 'Interfacing for collar/cuff', 0.3, 'meter',
      'pattern_requirement', 'high', true, 'Collar/cuff pieces require interfacing'));
  }
  if (hasLining) {
    materials.push(mat(planId, 'lining', 'Lining (pattern piece requirement)', 0.8, 'meter',
      'pattern_requirement', 'high', true, 'Lining pieces derived from pattern'));
  }

  return materials;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Derive material requirements for a production plan.
 * De-duplicates by category+name (design_specification takes priority over garment_default).
 */
export function deriveMaterialRequirements(
  productionPlanId: string,
  garmentCategory: string,
  spec: DesignSpecification,
  model: PatternModel,
): MaterialRequirement[] {
  const designMats = getDesignSpecMaterials(productionPlanId, spec);
  const patternMats = getPatternMaterials(productionPlanId, model);
  const defaultMats = getGarmentDefaultMaterials(productionPlanId, garmentCategory);

  // Combine — design_specification wins over garment_default for same category
  const all: MaterialRequirement[] = [...designMats, ...patternMats];
  const usedCategories = new Set(all.map((m) => `${m.category}:${m.name.split('(')[0].trim()}`));

  for (const dm of defaultMats) {
    const key = `${dm.category}:${dm.name.split('(')[0].trim()}`;
    if (!usedCategories.has(key)) {
      all.push(dm);
      usedCategories.add(key);
    }
  }

  return all;
}
