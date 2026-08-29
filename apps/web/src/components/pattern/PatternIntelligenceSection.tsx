/**
 * Phase 15 — Pattern Intelligence Section for CustomerDetail.
 *
 * Loads the customer's design specifications and fabric profiles,
 * then renders PatternIntelligence for the selected (latest ready) spec.
 * Offline-first: reads from Dexie v5 when offline.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Scissors } from 'lucide-react';
import { listDesignSpecs } from '../../shared/api/design';
import { db } from '../../db/database';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import PatternIntelligence from './PatternIntelligence';

interface PatternIntelligenceSectionProps {
  customerId: string;
  workspaceId: string;
}

export default function PatternIntelligenceSection({
  customerId,
  workspaceId,
}: PatternIntelligenceSectionProps) {
  const [designSpecs, setDesignSpecs] = useState<DesignSpecification[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [fabricProfiles, setFabricProfiles] = useState<FabricProfile[]>([]);
  const [selectedFabricId, setSelectedFabricId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load design specs
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Online: fetch from server
      const specs = await listDesignSpecs(customerId);
      setDesignSpecs(specs);
      // Pre-select the most recent ready spec
      const ready = specs.find(
        (s) => s.status === 'ready_for_pattern' || s.status === 'validated' || s.status === 'ready_for_design',
      ) ?? specs[0] ?? null;
      if (ready && !selectedSpecId) setSelectedSpecId(ready.id);

      // Also load fabric profiles associated with ready spec
      if (ready?.fabricProfileIds?.length) {
        const localFabrics = await db.fabricProfilesV14
          .where('workspaceId')
          .equals(workspaceId)
          .toArray();
        const linked = (localFabrics as unknown as FabricProfile[]).filter(
          (f) => ready.fabricProfileIds.includes(f.id),
        );
        setFabricProfiles(linked);
        if (linked.length > 0 && !selectedFabricId) setSelectedFabricId(linked[0].id);
      }
    } catch {
      // Offline fallback: read from Dexie
      try {
        const rows = await db.designSpecsV14.where('workspaceId').equals(workspaceId).toArray();
        const specs = (rows as unknown as Array<DesignSpecification & { customerId?: string; deletedAt?: string | null }>)
          .filter((s) => s.customerId === customerId && !s.deletedAt);
        setDesignSpecs(specs);
        if (specs.length > 0 && !selectedSpecId) setSelectedSpecId(specs[0].id);
      } catch {
        setError('Could not load design specifications. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId, workspaceId, selectedSpecId, selectedFabricId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, workspaceId]);

  const selectedSpec = designSpecs.find((s) => s.id === selectedSpecId);
  const selectedFabric = fabricProfiles.find((f) => f.id === selectedFabricId) ?? null;

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Scissors className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Pattern & Cutting Intelligence</h2>
        <span className="ml-auto text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
          Phase 15
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-sm text-gray-500 animate-pulse">Loading design specifications…</div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* No specs */}
      {!isLoading && !error && designSpecs.length === 0 && (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">
            No Design Specification found. Create a Design Specification in the Design Intelligence section above.
          </p>
        </div>
      )}

      {/* Spec selector */}
      {!isLoading && designSpecs.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="pattern-spec-select"
              className="text-xs font-medium text-gray-600"
            >
              Design Spec:
            </label>
            <select
              id="pattern-spec-select"
              value={selectedSpecId ?? ''}
              onChange={(e) => setSelectedSpecId(e.target.value || null)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— Select —</option>
              {designSpecs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.garment?.category} (v{s.version}) · {s.status}
                </option>
              ))}
            </select>
          </div>

          {fabricProfiles.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="pattern-fabric-select"
                className="text-xs font-medium text-gray-600"
              >
                Fabric:
              </label>
              <select
                id="pattern-fabric-select"
                value={selectedFabricId ?? ''}
                onChange={(e) => setSelectedFabricId(e.target.value || null)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— None —</option>
                {fabricProfiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.width?.value ? ` (${f.width.value} ${f.width.unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Main PatternIntelligence orchestrator */}
      {!isLoading && selectedSpec && (
        <PatternIntelligence
          key={selectedSpec.id}
          customerId={customerId}
          workspaceId={workspaceId}
          designSpec={selectedSpec}
          fabricProfile={selectedFabric}
        />
      )}
    </div>
  );
}
