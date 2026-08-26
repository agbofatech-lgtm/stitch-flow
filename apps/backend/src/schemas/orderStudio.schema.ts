import { z } from 'zod';

export const productionStageStatusSchema = z.enum([
  'pending',
  'active',
  'completed',
  'skipped',
]);

export const productionStageCodeSchema = z.enum([
  'measurement',
  'cutting',
  'sewing',
  'embroidery',
  'first_fitting',
  'second_fitting',
  'final_press',
  'ready',
  'delivered',
]);

export const productionStageSchema = z.object({
  code: productionStageCodeSchema,
  label: z.string().min(1),
  status: productionStageStatusSchema,
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  skippedAt: z.string().datetime().nullable().optional(),
  reopenedAt: z.string().datetime().nullable().optional(),
  notes: z.string().optional().default(''),
  assignedTo: z.string().nullable().optional(),
  expectedCompletionDate: z.string().datetime().nullable().optional(),
});

export const measurementSnapshotSchema = z
  .object({
    bust: z.number().optional(),
    chest: z.number().optional(),
    waist: z.number().optional(),
    hip: z.number().optional(),
    neck: z.number().optional(),
    shoulder: z.number().optional(),
    sleeve: z.number().optional(),
    sleeveLength: z.number().optional(),
    aroundArm: z.number().optional(),
    aroundWrist: z.number().optional(),
    backLength: z.number().optional(),
    bustSpan: z.number().optional(),
    armholeDepth: z.number().optional(),
    shoulderToWaist: z.number().optional(),
    shoulderToHip: z.number().optional(),
    shoulderToNipple: z.number().optional(),
    nippleToNipple: z.number().optional(),
    napeToWaist: z.number().optional(),
    underBust: z.number().optional(),
    shoulderToUnderBust: z.number().optional(),
    acrossChest: z.number().optional(),
    acrossBack: z.number().optional(),
    thigh: z.number().optional(),
    knee: z.number().optional(),
    ankle: z.number().optional(),
    aroundAnkle: z.number().optional(),
    trouserLength: z.number().optional(),
    skirtLength: z.number().optional(),
    slitLength: z.number().optional(),
    dressLength: z.number().optional(),
    kabaLength: z.number().optional(),
    shirtLength: z.number().optional(),
    fullLength: z.number().optional(),
    inseam: z.number().optional(),
    crotchDepth: z.number().optional(),
    waistToHip: z.number().optional(),
    sleeveOpening: z.number().optional(),
    bicep: z.number().optional(),
    notes: z.string().optional(),

    profileId: z.string().nullable().optional(),
    profileLabel: z.string().nullable().optional(),
    profileType: z.string().nullable().optional(),
    capturedAt: z.string().datetime().nullable().optional(),

    metadata: z.record(z.any()).optional(),
    profileMetadata: z.record(z.any()).optional(),
    measurements: z.record(z.any()).optional(),
  })
  .passthrough();

export const garmentMeasurementsSchema = z
  .object({
    bust: z.number().optional(),
    chest: z.number().optional(),
    waist: z.number().optional(),
    hip: z.number().optional(),
    neck: z.number().optional(),
    shoulder: z.number().optional(),
    sleeve: z.number().optional(),
    sleeveLength: z.number().optional(),
    aroundArm: z.number().optional(),
    aroundWrist: z.number().optional(),
    backLength: z.number().optional(),
    bustSpan: z.number().optional(),
    armholeDepth: z.number().optional(),
    shoulderToWaist: z.number().optional(),
    shoulderToHip: z.number().optional(),
    shoulderToNipple: z.number().optional(),
    nippleToNipple: z.number().optional(),
    napeToWaist: z.number().optional(),
    underBust: z.number().optional(),
    shoulderToUnderBust: z.number().optional(),
    acrossChest: z.number().optional(),
    acrossBack: z.number().optional(),
    thigh: z.number().optional(),
    knee: z.number().optional(),
    ankle: z.number().optional(),
    aroundAnkle: z.number().optional(),
    trouserLength: z.number().optional(),
    skirtLength: z.number().optional(),
    slitLength: z.number().optional(),
    dressLength: z.number().optional(),
    kabaLength: z.number().optional(),
    shirtLength: z.number().optional(),
    fullLength: z.number().optional(),
    inseam: z.number().optional(),
    crotchDepth: z.number().optional(),
    waistToHip: z.number().optional(),
    sleeveOpening: z.number().optional(),
    bicep: z.number().optional(),
    notes: z.string().optional(),
    measurements: z.record(z.any()).optional(),
  })
  .passthrough();

export const fabricEstimateSchema = z
  .object({
    mainFabricQty: z.number(),
    unit: z.string(),
    fabricType: z.string(),
    liningQty: z.number().optional(),
    interfacingQty: z.number().optional(),
  })
  .passthrough();

export const cuttingListItemSchema = z
  .object({
    name: z.string(),
    quantity: z.number(),
    notes: z.string().optional(),
  })
  .passthrough();

export const sewingChecklistItemSchema = z
  .object({
    step: z.string(),
    notes: z.string().optional(),
  })
  .passthrough();

export const fitRiskSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']).optional(),
    recommendation: z.string().optional(),
  })
  .passthrough();

export const productionPlanSchema = z
  .object({
    garmentType: z.string(),
    fabricEstimate: fabricEstimateSchema,
    cuttingList: z.array(cuttingListItemSchema).default([]),
    sewingChecklist: z.array(sewingChecklistItemSchema).default([]),
    fitRisks: z.array(fitRiskSchema).default([]),
  })
  .passthrough();

export const inspirationAnalysisSchema = z
  .object({
    suggestedGarmentType: z.string().optional(),
    complexityLevel: z.string().optional(),
    recommendedFabricTypes: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
  })
  .passthrough();

export const updateOrderStudioSchema = z.object({
  garmentType: z.string().nullable().optional(),
  fitType: z.string().nullable().optional(),
  styleNotes: z.string().nullable().optional(),
  measurementSnapshot: measurementSnapshotSchema.nullable().optional(),
  garmentMeasurements: garmentMeasurementsSchema.nullable().optional(),
  productionPlan: productionPlanSchema.nullable().optional(),
  productionStages: z.array(productionStageSchema).nullable().optional(),
  inspirationAnalysis: inspirationAnalysisSchema.nullable().optional(),
  selectedFabricId: z.string().nullable().optional(),
  designInspirationId: z.string().nullable().optional(),
  selectedPatternId: z.string().nullable().optional(),
  selectedMeasurementProfileId: z.string().nullable().optional(),
});

export type UpdateOrderStudioInput = z.infer<typeof updateOrderStudioSchema>;
