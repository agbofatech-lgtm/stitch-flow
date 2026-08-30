/** Stage 11 — Stage 4 manifest-governed public imagery constants.
 *  Every entry traces to docs/VISUAL_ASSET_MANIFEST.md (all imagery is
 *  AI-generated library material — status VISUALLY_PROVISIONAL; alt text
 *  describes the scene, captions never imply documentary photography). */
import type { LandingImageAsset } from './LandingImage';

export const HERO_IMAGE: LandingImageAsset = {
  base: '/assets/landing/hero/hero-craft-workshop-01-hero',
  width: 1376, height: 768,
  alt: 'A tailor’s workbench with shears, measuring tape, chalk and folded cloth, lit warm and quiet',
  variants: ['1280.avif', '1280.webp', '768.webp'],
};

export const CRAFT_IMAGES: Array<LandingImageAsset & { caption: string }> = [
  { base: '/assets/landing/craftsmanship/craft-measurement-01', width: 800, height: 1000,
    alt: 'Hands taking a body measurement with a tape measure against a plain backdrop',
    caption: 'Measuring — the first fact of the garment', variants: ['card-800.webp'] },
  { base: '/assets/landing/craftsmanship/craft-cutting-01', width: 800, height: 1000,
    alt: 'Tailor’s chalk marking a cutting line on patterned cloth before shears',
    caption: 'Marking — where a decision becomes geometry', variants: ['card-800.webp'] },
  { base: '/assets/landing/craftsmanship/craft-fitting-01', width: 800, height: 1000,
    alt: 'A fitting in progress, pins and adjustments noted on a garment',
    caption: 'Fitting — the garment answers back', variants: ['card-800.webp'] },
];

export const MATERIAL_IMAGES: Array<LandingImageAsset & { label: string }> = [
  { base: '/assets/fabrics/fabric-kente-macro-01', width: 800, height: 1000,
    alt: 'Close-up of woven kente cloth with its bold geometric bands', label: 'Woven structure', variants: ['card-800.webp'] },
  { base: '/assets/fabrics/fabric-ankara-macro-01', width: 800, height: 1000,
    alt: 'Close-up of ankara print fabric with repeating pattern motifs', label: 'Print repeat', variants: ['card-800.webp'] },
  { base: '/assets/fabrics/fabric-silk-drape-01', width: 800, height: 1000,
    alt: 'Silk fabric falling in soft folds, light catching the drape', label: 'Drape', variants: ['card-800.webp'] },
  { base: '/assets/fabrics/fabric-denim-drape-01', width: 800, height: 1000,
    alt: 'Stiff denim cloth holding a folded edge, its weave visible', label: 'Body & direction', variants: ['card-800.webp'] },
];

export const PRODUCTION_IMAGE: LandingImageAsset = {
  base: '/assets/production/production-fitting-01',
  width: 800, height: 1000,
  alt: 'A garment on a dress form mid-production, one stage of many before it is worn',
  variants: ['card-800.webp'],
};
