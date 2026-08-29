/**
 * Phase 16 — Production Intelligence Service (backend).
 *
 * Backend service for Production Plans, Fabric Consumption, and related entities.
 * The backend stores and validates results produced by the frontend services.
 * Core calculations run on the frontend (offline-capable).
 *
 * productionAssistant.ts NEVER called — ZERO DIFF.
 * patternEngine.ts NEVER called — ZERO DIFF.
 */

import type { Pool } from 'pg';
import type { ProductionPlan, FabricConsumption, PurchasingRecommendation } from './types';

// ---------------------------------------------------------------------------
// Production Plan CRUD
// ---------------------------------------------------------------------------

export async function createProductionPlan(
  pool: Pool,
  workspaceId: string,
  data: ProductionPlan,
): Promise<ProductionPlan> {
  const now = new Date().toISOString();

  // Insert fabric consumption first
  await pool.query(
    `INSERT INTO fabric_consumptions
       (id, workspace_id, customer_id, design_specification_id, pattern_model_id,
        cutting_layout_id, fabric_profile_id,
        layout_envelope_cm, layout_fabric_width_cm, width_profile,
        shrinkage_percentage, shrinkage_allowance_cm, shrinkage_source, shrinkage_confidence,
        pattern_matching_percentage, pattern_matching_allowance_cm, pattern_matching_required,
        pattern_matching_verification,
        directional_percentage, directional_allowance_cm, directional_required,
        handling_waste_percentage, handling_waste_allowance_cm,
        safety_buffer_percentage, safety_buffer_cm,
        breakdown, fabric_required_cm, fabric_required_meters, fabric_required_yards,
        confidence, assumptions, manual_verification_required, calculation_version,
        is_stale, stale_reason, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
             $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
     ON CONFLICT (id) DO NOTHING`,
    [
      data.fabricConsumption.id,
      workspaceId,
      data.customerId,
      data.fabricConsumption.designSpecificationId,
      data.fabricConsumption.patternModelId,
      data.fabricConsumption.cuttingLayoutId,
      data.fabricConsumption.fabricProfileId,
      data.fabricConsumption.layoutEnvelopeCm,
      data.fabricConsumption.layoutFabricWidthCm,
      JSON.stringify(data.fabricConsumption.widthProfile),
      data.fabricConsumption.shrinkage.percentage,
      data.fabricConsumption.shrinkage.valueCm,
      data.fabricConsumption.shrinkage.source,
      data.fabricConsumption.shrinkage.confidence,
      data.fabricConsumption.patternMatching.allowancePercentage,
      data.fabricConsumption.patternMatching.allowanceCm,
      data.fabricConsumption.patternMatching.required,
      data.fabricConsumption.patternMatching.automatedVerification,
      data.fabricConsumption.directional.allowancePercentage,
      data.fabricConsumption.directional.allowanceCm,
      data.fabricConsumption.directional.required,
      data.fabricConsumption.handlingWaste.percentage,
      data.fabricConsumption.handlingWaste.valueCm,
      data.fabricConsumption.safetyBuffer.percentage,
      data.fabricConsumption.safetyBuffer.valueCm,
      JSON.stringify(data.fabricConsumption.breakdown),
      data.fabricConsumption.fabricRequiredCm,
      data.fabricConsumption.fabricRequiredMeters,
      data.fabricConsumption.fabricRequiredYards,
      data.fabricConsumption.confidence,
      JSON.stringify(data.fabricConsumption.assumptions),
      data.fabricConsumption.manualVerificationRequired,
      data.fabricConsumption.calculationVersion,
      data.fabricConsumption.isStale,
      data.fabricConsumption.staleReason ?? null,
      now, now,
    ],
  );

  // Insert production plan
  await pool.query(
    `INSERT INTO production_plans
       (id, workspace_id, customer_id, design_specification_id, pattern_model_id,
        cutting_layout_id, fabric_consumption_id,
        estimated_total_time_min, estimated_total_time_expected, estimated_total_time_max,
        status, readiness, traceability, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      data.id, workspaceId, data.customerId, data.designSpecificationId,
      data.patternModelId ?? null, data.cuttingLayoutId, data.fabricConsumption.id,
      data.estimatedTotalTimeMinMinutes, data.estimatedTotalTimeExpectedMinutes,
      data.estimatedTotalTimeMaxMinutes,
      data.status, JSON.stringify(data.readiness), JSON.stringify(data.traceability),
      data.notes ?? null, now, now,
    ],
  );

  // Insert materials
  for (let i = 0; i < data.materials.length; i++) {
    const m = data.materials[i];
    await pool.query(
      `INSERT INTO production_materials
         (id, production_plan_id, workspace_id, category, name, quantity, unit, source, confidence, required, notes, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [m.id, data.id, workspaceId, m.category, m.name, m.quantity, m.unit, m.source, m.confidence, m.required, m.notes ?? null, i],
    );
  }

  // Insert cutting steps
  for (const step of data.cuttingExecutionPlan) {
    await pool.query(
      `INSERT INTO cutting_execution_steps
         (id, production_plan_id, workspace_id, step_order, code, title, description, required, verification_required, related_piece_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        `ces-${data.id}-${step.order}`, data.id, workspaceId,
        step.order, step.code, step.title, step.description,
        step.required, step.verificationRequired,
        JSON.stringify(step.relatedPatternPieceIds ?? []),
      ],
    );
  }

  // Insert operations
  for (const op of data.operations) {
    await pool.query(
      `INSERT INTO production_operations
         (id, production_plan_id, workspace_id, code, name, description, op_order,
          time_min_minutes, time_expected_minutes, time_max_minutes, time_confidence, time_factors,
          dependencies, required_skills, requires_customer, status, blocking_reason, source, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        op.id, data.id, workspaceId, op.code, op.name, op.description, op.order,
        op.timeEstimate.minimumMinutes, op.timeEstimate.expectedMinutes, op.timeEstimate.maximumMinutes,
        op.timeEstimate.confidence, JSON.stringify(op.timeEstimate.factors),
        JSON.stringify(op.dependencies), JSON.stringify(op.requiredSkills),
        op.requiresCustomer, op.status, op.blockingReason ?? null, op.source, op.notes ?? null,
      ],
    );
  }

  // Insert quality checkpoints
  for (const qc of data.qualityCheckpoints) {
    await pool.query(
      `INSERT INTO quality_checkpoints
         (id, production_plan_id, workspace_id, operation_id, phase, code, name, description, required, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [qc.id, data.id, workspaceId, qc.operationId ?? null, qc.phase, qc.code, qc.name, qc.description, qc.required, qc.status],
    );
  }

  // Insert purchasing recommendation if present
  if (data.purchasingRecommendation) {
    const pr = data.purchasingRecommendation;
    await pool.query(
      `INSERT INTO purchasing_recommendations
         (id, fabric_consumption_id, workspace_id, status, required_cm, available_cm,
          shortage_cm, excess_cm, raw_purchase_needed_cm, recommended_purchase_cm,
          recommended_purchase_meters, recommended_purchase_yards, purchase_rounding_reason,
          purchase_policy, estimated_cost, currency, reasons, assumptions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        pr.id, data.fabricConsumption.id, workspaceId,
        pr.status, pr.requiredCm, pr.availableCm ?? null,
        pr.shortageCm ?? null, pr.excessCm ?? null, pr.rawPurchaseNeededCm ?? null,
        pr.recommendedPurchaseCm ?? null, pr.recommendedPurchaseMeters ?? null,
        pr.recommendedPurchaseYards ?? null, pr.purchaseRoundingReason ?? null,
        JSON.stringify(pr.purchasePolicy), pr.estimatedCost ?? null, pr.currency ?? null,
        JSON.stringify(pr.reasons), JSON.stringify(pr.assumptions),
      ],
    );
  }

  return { ...data, createdAt: now, updatedAt: now };
}

export async function getProductionPlan(
  pool: Pool,
  workspaceId: string,
  id: string,
): Promise<ProductionPlan | null> {
  const result = await pool.query(
    'SELECT * FROM production_plans WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (!result.rows[0]) return null;
  return deserializeProductionPlan(pool, workspaceId, result.rows[0]);
}

export async function listProductionPlans(
  pool: Pool,
  workspaceId: string,
  customerId: string,
): Promise<ProductionPlan[]> {
  const result = await pool.query(
    'SELECT * FROM production_plans WHERE workspace_id=$1 AND customer_id=$2 ORDER BY created_at DESC',
    [workspaceId, customerId],
  );
  const plans: ProductionPlan[] = [];
  for (const row of result.rows) {
    const plan = await deserializeProductionPlan(pool, workspaceId, row);
    plans.push(plan);
  }
  return plans;
}

export async function updateOperationStatus(
  pool: Pool,
  workspaceId: string,
  planId: string,
  operationId: string,
  status: string,
  notes?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE production_operations SET status=$1, notes=COALESCE($2,notes),
       started_at=CASE WHEN $1='in_progress' AND started_at IS NULL THEN $3 ELSE started_at END,
       completed_at=CASE WHEN $1='completed' THEN $3 ELSE completed_at END
     WHERE id=$4 AND production_plan_id=$5 AND workspace_id=$6`,
    [status, notes ?? null, now, operationId, planId, workspaceId],
  );
  await pool.query(
    'UPDATE production_plans SET updated_at=$1 WHERE id=$2 AND workspace_id=$3',
    [now, planId, workspaceId],
  );
}

export async function updateQualityCheckpoint(
  pool: Pool,
  workspaceId: string,
  planId: string,
  checkpointId: string,
  status: string,
  failureReason?: string,
  notes?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE quality_checkpoints SET status=$1, failure_reason=COALESCE($2,failure_reason),
       notes=COALESCE($3,notes), checked_at=CASE WHEN $1 IN ('passed','failed') THEN $4 ELSE checked_at END
     WHERE id=$5 AND production_plan_id=$6 AND workspace_id=$7`,
    [status, failureReason ?? null, notes ?? null, now, checkpointId, planId, workspaceId],
  );
}

// ---------------------------------------------------------------------------
// Deserialization helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deserializeProductionPlan(pool: Pool, workspaceId: string, row: Record<string, any>): Promise<ProductionPlan> {
  const parseJson = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);
  const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string));

  // Load fabric consumption
  const fcResult = await pool.query(
    'SELECT * FROM fabric_consumptions WHERE id=$1 AND workspace_id=$2',
    [row.fabric_consumption_id, workspaceId],
  );
  const fcRow = fcResult.rows[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc: FabricConsumption = fcRow ? deserializeFabricConsumption(fcRow) : ({} as FabricConsumption);

  // Load materials
  const matResult = await pool.query(
    'SELECT * FROM production_materials WHERE production_plan_id=$1 ORDER BY display_order',
    [row.id],
  );

  // Load cutting steps
  const cesResult = await pool.query(
    'SELECT * FROM cutting_execution_steps WHERE production_plan_id=$1 ORDER BY step_order',
    [row.id],
  );

  // Load operations
  const opResult = await pool.query(
    'SELECT * FROM production_operations WHERE production_plan_id=$1 ORDER BY op_order',
    [row.id],
  );

  // Load QC
  const qcResult = await pool.query(
    'SELECT * FROM quality_checkpoints WHERE production_plan_id=$1 ORDER BY phase',
    [row.id],
  );

  // Load purchasing recommendation
  const prResult = await pool.query(
    'SELECT * FROM purchasing_recommendations WHERE fabric_consumption_id=$1 LIMIT 1',
    [row.fabric_consumption_id],
  );

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id,
    designSpecificationId: row.design_specification_id,
    patternModelId: row.pattern_model_id ?? null,
    cuttingLayoutId: row.cutting_layout_id,
    fabricConsumption: fc,
    purchasingRecommendation: prResult.rows[0] ? deserializePurchasingRec(prResult.rows[0]) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materials: matResult.rows.map((m: any) => ({
      id: m.id, productionPlanId: m.production_plan_id, category: m.category,
      name: m.name, quantity: Number(m.quantity), unit: m.unit, source: m.source,
      confidence: m.confidence, required: m.required, notes: m.notes,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cuttingExecutionPlan: cesResult.rows.map((s: any) => ({
      order: s.step_order, code: s.code, title: s.title, description: s.description,
      required: s.required, verificationRequired: s.verification_required,
      relatedPatternPieceIds: parseJson(s.related_piece_ids) ?? [],
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    operations: opResult.rows.map((o: any) => ({
      id: o.id, productionPlanId: o.production_plan_id, code: o.code, name: o.name,
      description: o.description, order: o.op_order,
      timeEstimate: { minimumMinutes: o.time_min_minutes, expectedMinutes: o.time_expected_minutes,
        maximumMinutes: o.time_max_minutes, confidence: o.time_confidence, factors: parseJson(o.time_factors) },
      dependencies: parseJson(o.dependencies), requiredSkills: parseJson(o.required_skills),
      requiresCustomer: o.requires_customer, status: o.status, blockingReason: o.blocking_reason,
      source: o.source, notes: o.notes, startedAt: o.started_at ? toIso(o.started_at) : null,
      completedAt: o.completed_at ? toIso(o.completed_at) : null,
    })),
    estimatedTotalTimeMinMinutes: row.estimated_total_time_min,
    estimatedTotalTimeExpectedMinutes: row.estimated_total_time_expected,
    estimatedTotalTimeMaxMinutes: row.estimated_total_time_max,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qualityCheckpoints: qcResult.rows.map((q: any) => ({
      id: q.id, productionPlanId: q.production_plan_id, operationId: q.operation_id,
      phase: q.phase, code: q.code, name: q.name, description: q.description,
      required: q.required, status: q.status, failureReason: q.failure_reason,
      notes: q.notes, checkedBy: q.checked_by, checkedAt: q.checked_at ? toIso(q.checked_at) : null,
    })),
    readiness: parseJson(row.readiness),
    status: row.status,
    traceability: parseJson(row.traceability),
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeFabricConsumption(row: Record<string, any>): FabricConsumption {
  const parseJson = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);
  const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string));
  return {
    id: row.id, workspaceId: row.workspace_id, customerId: row.customer_id,
    designSpecificationId: row.design_specification_id, patternModelId: row.pattern_model_id,
    cuttingLayoutId: row.cutting_layout_id, fabricProfileId: row.fabric_profile_id,
    layoutEnvelopeCm: Number(row.layout_envelope_cm), layoutFabricWidthCm: Number(row.layout_fabric_width_cm),
    widthProfile: parseJson(row.width_profile),
    shrinkage: { percentage: Number(row.shrinkage_percentage), valueCm: Number(row.shrinkage_allowance_cm),
      source: row.shrinkage_source, confidence: row.shrinkage_confidence, fabricType: null },
    patternMatching: { required: row.pattern_matching_required, automatedVerification: row.pattern_matching_verification,
      allowancePercentage: Number(row.pattern_matching_percentage), allowanceCm: Number(row.pattern_matching_allowance_cm),
      repeatSizeCm: null, source: 'system_default', notes: [] },
    directional: { required: row.directional_required, allowancePercentage: Number(row.directional_percentage),
      allowanceCm: Number(row.directional_allowance_cm), source: 'system_default', notes: [] },
    handlingWaste: { percentage: Number(row.handling_waste_percentage), valueCm: Number(row.handling_waste_allowance_cm), source: 'system_default' },
    safetyBuffer: { percentage: Number(row.safety_buffer_percentage), valueCm: Number(row.safety_buffer_cm), source: 'system_default' },
    breakdown: parseJson(row.breakdown),
    fabricRequiredCm: Number(row.fabric_required_cm), fabricRequiredMeters: Number(row.fabric_required_meters),
    fabricRequiredYards: Number(row.fabric_required_yards), confidence: row.confidence,
    assumptions: parseJson(row.assumptions) ?? [], manualVerificationRequired: row.manual_verification_required,
    calculationVersion: row.calculation_version, isStale: row.is_stale, staleReason: row.stale_reason,
    createdAt: toIso(row.created_at), updatedAt: toIso(row.updated_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializePurchasingRec(row: Record<string, any>): PurchasingRecommendation {
  const parseJson = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);
  return {
    id: row.id, fabricConsumptionId: row.fabric_consumption_id, status: row.status,
    requiredCm: Number(row.required_cm), availableCm: row.available_cm ? Number(row.available_cm) : null,
    shortageCm: row.shortage_cm ? Number(row.shortage_cm) : null,
    excessCm: row.excess_cm ? Number(row.excess_cm) : null,
    rawPurchaseNeededCm: row.raw_purchase_needed_cm ? Number(row.raw_purchase_needed_cm) : null,
    recommendedPurchaseCm: row.recommended_purchase_cm ? Number(row.recommended_purchase_cm) : null,
    recommendedPurchaseMeters: row.recommended_purchase_meters ? Number(row.recommended_purchase_meters) : null,
    recommendedPurchaseYards: row.recommended_purchase_yards ? Number(row.recommended_purchase_yards) : null,
    purchaseRoundingReason: row.purchase_rounding_reason,
    purchasePolicy: parseJson(row.purchase_policy),
    estimatedCost: row.estimated_cost ? Number(row.estimated_cost) : null,
    currency: row.currency,
    reasons: parseJson(row.reasons) ?? [],
    assumptions: parseJson(row.assumptions) ?? [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
