/**
 * Phase 14 Studio specification adapter.
 * Extracts semantic intent from Studio-like objects. Does not rewrite DesignStudio.
 * Drafts remain transitional. Measurements are not copied (Phase 13).
 */

import type { GarmentIntentInput } from '../../domain/garment/contract';
import { UI_ONLY_SPEC_KEYS } from '../../domain/garment/contract';
import { evaluateGarmentSpecification, type GarmentSpecificationEvaluation } from '../../domain/garment/evaluate';
import { STUDIO_DRAFT_STORAGE_KEY } from '../design/draftStore';

const INTENT_KEYS = [
  'garmentType',
  'fitType',
  'sleeveStyle',
  'collarStyle',
  'neckline',
  'lengthType',
  'pocketStyle',
  'fabricType',
  'designCategory',
  'notes',
  'customerId',
  'orderId',
  'measurementVersionId',
] as const;

const UI_SET = new Set<string>(UI_ONLY_SPEC_KEYS);

export function extractStudioGarmentIntent(source: Record<string, unknown>): GarmentIntentInput {
  const intent: GarmentIntentInput = {};
  for (const key of INTENT_KEYS) {
    if (source[key] !== undefined) {
      (intent as Record<string, unknown>)[key] = source[key];
    }
  }
  return intent;
}

export function evaluateStudioGarmentIntent(
  source: Record<string, unknown>
): GarmentSpecificationEvaluation {
  for (const key of Object.keys(source)) {
    if (UI_SET.has(key)) {
      // UI keys are ignored, not copied — Studio chrome is not specification.
      continue;
    }
  }
  const intent = extractStudioGarmentIntent(source);
  return evaluateGarmentSpecification(intent, {
    source: 'studio',
    extractionPath: 'studio-adapter',
  });
}

export function studioDraftsRemainTransitional(): string {
  return STUDIO_DRAFT_STORAGE_KEY;
}
