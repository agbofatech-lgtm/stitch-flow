/** Stage 11 — public landing image with provenance-governed assets only
 *  (VISUAL_ASSET_MANIFEST VA-LDR/VA-CFT/VA-FAB/VA-PRD entries; no runtime
 *  remote photography, ever). AVIF+WebP picture, intrinsic dimensions (no
 *  layout shift), lazy below the fold. */
import { useInView } from '../hooks/useInView';

export interface LandingImageAsset {
  /** e.g. /assets/landing/hero/hero-craft-workshop-01-hero */
  base: string;
  width: number;
  height: number;
  alt: string;
  variants?: Array<'1280.avif' | '1280.webp' | '768.webp' | 'card-800.webp'>;
}

export function LandingImage({
  asset, eager = false, className = '', reveal = true,
}: { asset: LandingImageAsset; eager?: boolean; className?: string; reveal?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>('0px');
  const variants = asset.variants ?? ['1280.avif', '1280.webp'];
  const avif = variants.find((v) => v.endsWith('.avif'));
  const webp = variants.find((v) => v.endsWith('.webp'));
  const mobile = variants.find((v) => v === '768.webp');
  return (
    <div ref={ref} className={`overflow-hidden rounded-card border border-line bg-surface shadow-e1 ${reveal && !inView ? 'opacity-0' : ''} ${reveal && inView ? 'sf-rise-enter' : ''} ${className}`}>
      <picture>
        {mobile && <source media="(max-width: 767px)" srcSet={`${asset.base}-${mobile}`} type="image/webp" />}
        {avif && <source srcSet={`${asset.base}-${avif}`} type="image/avif" />}
        {webp && <source srcSet={`${asset.base}-${webp}`} type="image/webp" />}
        <img
          src={`${asset.base}-${webp ?? '1280.webp'}`}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          {...(eager ? { fetchPriority: 'high' } : {})}
          className="h-auto w-full object-cover"
        />
      </picture>
    </div>
  );
}
