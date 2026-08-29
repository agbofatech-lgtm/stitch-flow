/**
 * Phase 14 — Design Readiness Engine.
 * Deterministic computation of DesignReadinessReport from a DesignSpecification.
 * Pure function — no side effects, no database access.
 */
import type {
  DesignSpecification,
  DesignReadinessReport,
  DesignSpecificationStatus,
  ReadinessItem,
} from './types';

export function computeReadiness(
  spec: Omit<DesignSpecification, 'readiness'>,
  opts: {
    hasMeasurementProfile: boolean;
    measurementProfileStatus?: string | null;
    hasInspirations: boolean;
    hasFabricProfiles: boolean;
    fabricHasWidth: boolean;
  },
): DesignReadinessReport {
  const items: ReadinessItem[] = [
    {
      key: 'garment_category',
      label: 'Garment classified',
      satisfied: !!spec.garment?.category,
    },
    {
      key: 'garment_silhouette',
      label: 'Silhouette defined',
      satisfied: !!spec.garment?.silhouette,
      warning: !spec.garment?.silhouette ? 'Silhouette helps with pattern generation in Phase 15' : undefined,
    },
    {
      key: 'measurement_profile',
      label: 'Measurement profile selected',
      satisfied: opts.hasMeasurementProfile,
    },
    {
      key: 'measurement_validated',
      label: 'Measurement profile validated',
      satisfied:
        opts.hasMeasurementProfile &&
        (opts.measurementProfileStatus === 'VALIDATED' ||
          opts.measurementProfileStatus === 'ACTIVE'),
      warning:
        opts.hasMeasurementProfile &&
        opts.measurementProfileStatus === 'DRAFT'
          ? 'Measurement profile is still in DRAFT — validate before opening Design Studio'
          : undefined,
    },
    {
      key: 'inspiration',
      label: 'Inspiration attached',
      satisfied: opts.hasInspirations,
      warning: !opts.hasInspirations ? 'Add a style reference or photo' : undefined,
    },
    {
      key: 'design_details',
      label: 'Design observations captured',
      satisfied: spec.observations.length > 0 || spec.components.length > 0,
      warning:
        spec.observations.length === 0 && spec.components.length === 0
          ? 'Record at least one observation or component'
          : undefined,
    },
    {
      key: 'fabric_attached',
      label: 'Fabric profile attached',
      satisfied: opts.hasFabricProfiles,
      warning: !opts.hasFabricProfiles ? 'Attach a fabric profile to enable Phase 16 yardage intelligence' : undefined,
    },
    {
      key: 'fabric_width',
      label: 'Fabric width specified',
      satisfied: opts.hasFabricProfiles && opts.fabricHasWidth,
      warning:
        opts.hasFabricProfiles && !opts.fabricHasWidth
          ? 'Fabric width is required for Phase 16 cutting layout'
          : undefined,
    },
  ];

  const criticalItems = ['garment_category', 'measurement_profile', 'measurement_validated'];
  const designItems = ['garment_category', 'measurement_profile'];

  const allCriticalSatisfied = criticalItems.every((k) =>
    items.find((i) => i.key === k)?.satisfied,
  );
  const designMinimumSatisfied = designItems.every((k) =>
    items.find((i) => i.key === k)?.satisfied,
  );

  let status: DesignSpecificationStatus;
  if (!spec.garment?.category) {
    status = 'draft';
  } else if (!designMinimumSatisfied) {
    status = 'partial';
  } else if (!allCriticalSatisfied) {
    status = 'partial';
  } else if (
    allCriticalSatisfied &&
    opts.hasInspirations &&
    (spec.observations.length > 0 || spec.components.length > 0)
  ) {
    // All critical + inspiration + at least one observation
    if (
      opts.hasFabricProfiles &&
      opts.fabricHasWidth &&
      (opts.measurementProfileStatus === 'VALIDATED' ||
        opts.measurementProfileStatus === 'ACTIVE')
    ) {
      status = 'ready_for_design';
    } else {
      status = 'ready_for_design';
    }
  } else {
    status = 'partial';
  }

  // Override: if status on spec is 'validated' and we computed ≥ ready_for_design, keep validated
  const effectiveStatus =
    spec.status === 'validated' && status !== 'draft' ? 'validated' : status;

  // Phase 15 reservation — only set externally
  const finalStatus: DesignSpecificationStatus =
    spec.status === 'ready_for_pattern' ? 'ready_for_pattern' : effectiveStatus;

  const canOpenDesignStudio =
    finalStatus === 'ready_for_design' ||
    finalStatus === 'validated' ||
    finalStatus === 'ready_for_pattern';

  return { status: finalStatus, items, canOpenDesignStudio };
}
