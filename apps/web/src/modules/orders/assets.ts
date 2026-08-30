/** Stage 4 garment imagery bindings (manifest: garments/*-card-800.webp, P0 PROVISIONAL). */
export type GarmentImageKey = 'shirt' | 'trouser' | 'kaftan' | 'dress';

const GARMENT_IMAGES: Record<GarmentImageKey, string> = {
  shirt: '/assets/garments/garment-shirt-01-card-800.webp',
  trouser: '/assets/garments/garment-trouser-01-card-800.webp',
  kaftan: '/assets/garments/garment-kaftan-01-card-800.webp',
  dress: '/assets/garments/garment-dress-01-card-800.webp',
};

export function garmentImageSrc(type: string): string | undefined {
  return GARMENT_IMAGES[type as GarmentImageKey];
}
