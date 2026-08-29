/**
 * Phase 16 — Production Intelligence Section for CustomerDetail.
 * Loads pattern models and cutting layouts, then renders ProductionIntelligence.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { listDesignSpecs } from '../../shared/api/design';
import { db } from '../../db/database';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import type { CuttingLayout, PatternModel } from '../../shared/api/pattern';
import ProductionIntelligence from './ProductionIntelligence';

interface ProductionIntelligenceSectionProps {
  customerId: string;
  workspaceId: string;
}

export default function ProductionIntelligenceSection({
  customerId,
  workspaceId,
}: ProductionIntelligenceSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designSpecs, setDesignSpecs] = useState<DesignSpecification[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [patternModel, setPatternModel] = useState<PatternModel | null>(null);
  const [cuttingLayout, setCuttingLayout] = useState<CuttingLayout | null>(null);
  const [fabricProfile, setFabricProfile] = useState<FabricProfile | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load design specs
      let specs: DesignSpecification[] = [];
      try {
        specs = await listDesignSpecs(customerId);
      } catch {
        const rows = await db.designSpecsV14.where('workspaceId').equals(workspaceId).toArray();
        specs = (rows as unknown as Array<DesignSpecification & { customerId?: string; deletedAt?: string | null }>)
          .filter((s) => s.customerId === customerId && !s.deletedAt);
      }
      setDesignSpecs(specs);
      const ready = specs.find((s) => ['ready_for_pattern', 'validated', 'ready_for_design'].includes(s.status)) ?? specs[0] ?? null;
      if (ready && !selectedSpecId) setSelectedSpecId(ready.id);

      // Load pattern models
      const pmRows = await db.patternModelsV15.where('workspaceId').equals(workspaceId).toArray();
      const pm = (pmRows as unknown as Array<PatternModel & { customerId?: string; designSpecificationId?: string; deletedAt?: string | null }>)
        .find((r) => r.customerId === customerId && !r.deletedAt && r.status !== 'superseded');
      setPatternModel(pm ?? null);

      // Load cutting layouts
      if (pm) {
        const clRows = await db.cuttingLayoutsV15.where('workspaceId').equals(workspaceId).toArray();
        const cl = (clRows as unknown as Array<CuttingLayout & { deletedAt?: string | null }>)
          .find((r) => r.patternModelId === pm.id && !r.deletedAt);
        setCuttingLayout(cl ?? null);

        // Load fabric profile for the spec
        if (ready?.fabricProfileIds?.length) {
          const fpRows = await db.fabricProfilesV14.where('workspaceId').equals(workspaceId).toArray();
          const fp = (fpRows as unknown as Array<FabricProfile & { deletedAt?: string | null }>)
            .find((r) => ready.fabricProfileIds.includes(r.id) && !r.deletedAt);
          setFabricProfile(fp ?? null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, workspaceId, selectedSpecId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, workspaceId]);

  const selectedSpec = designSpecs.find((s) => s.id === selectedSpecId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Fabric & Production Intelligence</h2>
        <span className="ml-auto text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
          Phase 16
        </span>
      </div>

      {isLoading && <div className="text-sm text-gray-500 animate-pulse">Loading production data…</div>}
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>}

      {!isLoading && !selectedSpec && (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">
            No Design Specification found. Create one in Design Intelligence, then derive a Pattern in Pattern Intelligence.
          </p>
        </div>
      )}

      {!isLoading && selectedSpec && !cuttingLayout && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            No cutting layout found. Derive a pattern and compute a cutting layout in the Pattern & Cutting Intelligence section above.
          </p>
        </div>
      )}

      {!isLoading && selectedSpec && cuttingLayout && (
        <ProductionIntelligence
          key={`${selectedSpec.id}-${cuttingLayout.id}`}
          customerId={customerId}
          workspaceId={workspaceId}
          designSpec={selectedSpec}
          patternModel={patternModel}
          cuttingLayout={cuttingLayout}
          fabricProfile={fabricProfile}
        />
      )}
    </div>
  );
}
