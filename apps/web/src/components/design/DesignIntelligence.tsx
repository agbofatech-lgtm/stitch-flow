/**
 * Phase 14 — Design Intelligence main container.
 * Orchestrates: Inspiration → Fabric → Design Specification → Design Studio.
 * State-driven navigation — no React Router.
 * Preserves offline-first architecture; Phase 13 measurements untouched.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, Images, Package, FileText, ChevronRight, ArrowLeft, Plus,
} from 'lucide-react';
import type { InspirationReference, FabricProfile, DesignSpecification } from '../../shared/api/design';
import { GARMENT_CATEGORY_LABELS, SILHOUETTE_OPTIONS, LENGTH_OPTIONS, SLEEVE_OPTIONS, NECKLINE_OPTIONS, COMPONENT_OPTIONS, CONSTRUCTION_OPTIONS } from '../../shared/api/design';
import * as svc from '../../modules/services/designService';
import { InspirationCapture, InspirationCard } from './InspirationCapture';
import { FabricProfileForm, FabricProfileCard } from './FabricProfileForm';
import { ReadinessPanel } from './ReadinessPanel';
import { loadSpecWithFabricIntoDesignStudio } from './DesignStudioAdapter';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { Loading, ErrorState } from '../ui/Feedback';
import { Card } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import type { AppView } from '../../shared/types/index';

type View = 'list' | 'editor' | 'inspiration' | 'fabric';

export function DesignIntelligence({
  customerId,
  workspaceId,
}: {
  customerId: string;
  workspaceId: string;
}) {
  const { setDesignMeasurements, setGarmentMeasurements, setFabricImage, setView: setAppView } = useApp();

  const [view, setView] = useState<View>('list');
  const [activeSpecId, setActiveSpecId] = useState<string | null>(null);

  // Design specs
  const [specs, setSpecs] = useState<DesignSpecification[]>([]);
  const [specsLoading, setSpecsLoading] = useState(true);
  const [specsError, setSpecsError] = useState<string | null>(null);

  // Active spec detail
  const [spec, setSpec] = useState<DesignSpecification | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);

  // Inspirations
  const [inspirations, setInspirations] = useState<InspirationReference[]>([]);
  const [inspLoading, setInspLoading] = useState(false);
  const [showInspirationCapture, setShowInspirationCapture] = useState(false);

  // Fabric profiles
  const [fabricProfiles, setFabricProfiles] = useState<FabricProfile[]>([]);
  const [fabLoading, setFabLoading] = useState(false);
  const [showFabricForm, setShowFabricForm] = useState(false);
  const [editingFabricId, setEditingFabricId] = useState<string | null>(null);

  // Saving
  const [saving, setSaving] = useState(false);
  const [adapterWarnings, setAdapterWarnings] = useState<string[]>([]);

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Load spec list
  const loadSpecs = useCallback(async () => {
    setSpecsLoading(true);
    setSpecsError(null);
    try {
      const list = await svc.listDesignSpecs(customerId, workspaceId);
      if (mounted.current) setSpecs(list);
    } catch {
      if (mounted.current) setSpecsError('Failed to load design specifications.');
    } finally {
      if (mounted.current) setSpecsLoading(false);
    }
  }, [customerId, workspaceId]);

  useEffect(() => { loadSpecs(); }, [loadSpecs]);

  // Load inspirations for customer
  const loadInspirations = useCallback(async () => {
    setInspLoading(true);
    try {
      const list = await svc.listInspirations(customerId, workspaceId);
      if (mounted.current) setInspirations(list);
    } finally {
      if (mounted.current) setInspLoading(false);
    }
  }, [customerId, workspaceId]);

  // Load fabric profiles
  const loadFabricProfiles = useCallback(async () => {
    setFabLoading(true);
    try {
      const list = await svc.listFabricProfiles(workspaceId);
      if (mounted.current) setFabricProfiles(list);
    } finally {
      if (mounted.current) setFabLoading(false);
    }
  }, [workspaceId]);

  // Load active spec
  const loadSpec = useCallback(async (id: string) => {
    setSpecLoading(true);
    setSpecError(null);
    setSpec(null);
    try {
      const s = await svc.getDesignSpec(customerId, id, workspaceId);
      if (mounted.current) setSpec(s);
    } catch {
      if (mounted.current) setSpecError('Failed to load design specification.');
    } finally {
      if (mounted.current) setSpecLoading(false);
    }
  }, [customerId, workspaceId]);

  const openSpec = useCallback(async (id: string) => {
    setActiveSpecId(id);
    setView('editor');
    await Promise.all([loadSpec(id), loadInspirations(), loadFabricProfiles()]);
  }, [loadSpec, loadInspirations, loadFabricProfiles]);

  const handleCreateSpec = async () => {
    try {
      const created = await svc.createDesignSpec(customerId, workspaceId, {
        name: 'New Design',
        garment: { category: 'dress' },
        components: [],
        constructionDetails: [],
        easeConfigurations: [],
        observations: [],
        inspirationIds: [],
        fabricProfileIds: [],
      });
      setSpecs((prev) => [created, ...prev]);
      await openSpec(created.id);
    } catch {
      setSpecsError('Failed to create design specification.');
    }
  };

  // Save spec field updates
  const saveSpec = useCallback(async (updates: Partial<DesignSpecification>) => {
    if (!activeSpecId) return;
    setSaving(true);
    setSpecError(null);
    try {
      const updated = await svc.updateDesignSpec(customerId, activeSpecId, workspaceId, updates);
      if (mounted.current) {
        setSpec(updated);
        setSpecs((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      }
    } catch (e) {
      if (mounted.current) setSpecError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [activeSpecId, customerId, workspaceId]);

  // Handle inspiration save
  const handleSaveInspiration = async (data: Parameters<typeof svc.createInspiration>[2]) => {
    try {
      const created = await svc.createInspiration(customerId, workspaceId, data);
      setInspirations((prev) => [created, ...prev]);
      setShowInspirationCapture(false);
      // Link to current spec
      if (spec) {
        await saveSpec({ inspirationIds: [...spec.inspirationIds, created.id] });
      }
    } catch {
      setSpecError('Failed to save inspiration.');
    }
  };

  // Link/unlink existing inspiration
  const toggleInspirationLink = async (inspId: string) => {
    if (!spec) return;
    const linked = spec.inspirationIds.includes(inspId);
    const next = linked
      ? spec.inspirationIds.filter((id) => id !== inspId)
      : [...spec.inspirationIds, inspId];
    await saveSpec({ inspirationIds: next });
  };

  // Handle fabric save
  const handleSaveFabric = async (data: Parameters<typeof svc.createFabricProfile>[1]) => {
    setSaving(true);
    try {
      if (editingFabricId) {
        const updated = await svc.updateFabricProfile(editingFabricId, workspaceId, data);
        setFabricProfiles((prev) => prev.map((f) => f.id === editingFabricId ? updated : f));
      } else {
        const created = await svc.createFabricProfile(workspaceId, data);
        setFabricProfiles((prev) => [created, ...prev]);
        if (spec) {
          await saveSpec({ fabricProfileIds: [...spec.fabricProfileIds, created.id] });
        }
      }
      setShowFabricForm(false);
      setEditingFabricId(null);
    } catch {
      setSpecError('Failed to save fabric profile.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle fabric link
  const toggleFabricLink = async (fabId: string) => {
    if (!spec) return;
    const linked = spec.fabricProfileIds.includes(fabId);
    const next = linked
      ? spec.fabricProfileIds.filter((id) => id !== fabId)
      : [...spec.fabricProfileIds, fabId];
    await saveSpec({ fabricProfileIds: next });
  };

  // Open Design Studio via adapter
  const handleOpenDesignStudio = async () => {
    if (!spec) return;
    setAdapterWarnings([]);
    const result = await loadSpecWithFabricIntoDesignStudio(spec, fabricProfiles, {
      setDesignMeasurements,
      setGarmentMeasurements,
      setFabricImage,
      setView: (v: string) => setAppView(v as AppView),
    });
    if (result.warnings.length > 0) {
      setAdapterWarnings(result.warnings);
    }
  };

  // ---- RENDER ----

  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ink-mute" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-ink">Design Intelligence</h2>
            {specs.length > 0 && (
              <span className="text-xs text-ink-mute">{specs.length} specification{specs.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <Button size="sm" variant="primary" onClick={handleCreateSpec} icon={<Plus className="h-3.5 w-3.5" />}>
            New Specification
          </Button>
        </div>

        {specsLoading && <Loading label="Loading design specifications…" />}
        {specsError && <ErrorState message={specsError} />}

        {!specsLoading && specs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line py-10 text-center">
            <Sparkles className="h-8 w-8 text-ink-mute" aria-hidden="true" />
            <p className="text-sm text-ink-soft">No design specifications yet.</p>
            <Button size="sm" variant="secondary" onClick={handleCreateSpec} icon={<Plus className="h-3.5 w-3.5" />}>
              Create First Specification
            </Button>
          </div>
        )}

        <div className="space-y-2 sf-stagger">
          {specs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSpec(s.id)}
              className="w-full rounded-card border border-line bg-surface p-4 text-left shadow-e1 transition-shadow hover:shadow-e2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sf-fade-in"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold text-ink">{s.name}</span>
                    <Badge tone={
                      s.status === 'ready_for_design' || s.status === 'validated' ? 'success' :
                      s.status === 'partial' ? 'warning' : 'neutral'
                    }>
                      {s.status.replace(/_/g, ' ')}
                    </Badge>
                    {s.version > 1 && <Badge tone="info">v{s.version}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-mute capitalize">
                    {GARMENT_CATEGORY_LABELS[s.garment.category] ?? s.garment.category}
                    {s.garment.silhouette && ` · ${s.garment.silhouette}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'editor' && spec) {
    return (
      <DesignSpecEditor
        spec={spec}
        inspirations={inspirations}
        fabricProfiles={fabricProfiles}
        saving={saving}
        specError={specError}
        adapterWarnings={adapterWarnings}
        showInspirationCapture={showInspirationCapture}
        showFabricForm={showFabricForm}
        editingFabricId={editingFabricId}
        inspLoading={inspLoading}
        fabLoading={fabLoading}
        customerId={customerId}
        workspaceId={workspaceId}
        onBack={() => { setView('list'); setSpec(null); setActiveSpecId(null); }}
        onSave={saveSpec}
        onSaveInspiration={handleSaveInspiration}
        onToggleInspiration={toggleInspirationLink}
        onShowInspirationCapture={setShowInspirationCapture}
        onSaveFabric={handleSaveFabric}
        onToggleFabric={toggleFabricLink}
        onShowFabricForm={setShowFabricForm}
        onEditFabric={(id) => { setEditingFabricId(id); setShowFabricForm(true); }}
        onOpenDesignStudio={handleOpenDesignStudio}
      />
    );
  }

  if (view === 'editor' && specLoading) {
    return <Loading label="Loading design specification…" />;
  }

  if (view === 'editor' && specError && !spec) {
    return <ErrorState message={specError} />;
  }

  return null;
}

// ---------------------------------------------------------------------------
// DesignSpecEditor — the detail editing view
// ---------------------------------------------------------------------------

function DesignSpecEditor({
  spec, inspirations, fabricProfiles, saving, specError, adapterWarnings,
  showInspirationCapture, showFabricForm, editingFabricId,
  inspLoading, fabLoading, customerId, workspaceId,
  onBack, onSave, onSaveInspiration, onToggleInspiration, onShowInspirationCapture,
  onSaveFabric, onToggleFabric, onShowFabricForm, onEditFabric, onOpenDesignStudio,
}: {
  spec: DesignSpecification;
  inspirations: InspirationReference[];
  fabricProfiles: FabricProfile[];
  saving: boolean;
  specError: string | null;
  adapterWarnings: string[];
  showInspirationCapture: boolean;
  showFabricForm: boolean;
  editingFabricId: string | null;
  inspLoading: boolean;
  fabLoading: boolean;
  customerId: string;
  workspaceId: string;
  onBack: () => void;
  onSave: (updates: Partial<DesignSpecification>) => void;
  onSaveInspiration: (data: Omit<InspirationReference, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt'>) => void;
  onToggleInspiration: (id: string) => void;
  onShowInspirationCapture: (show: boolean) => void;
  onSaveFabric: (data: Omit<FabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => void;
  onToggleFabric: (id: string) => void;
  onShowFabricForm: (show: boolean) => void;
  onEditFabric: (id: string) => void;
  onOpenDesignStudio: () => void;
}) {
  // Local field state for immediate feedback
  const [name, setName] = useState(spec.name);
  const [category, setCategory] = useState(spec.garment.category);
  const [silhouette, setSilhouette] = useState(spec.garment.silhouette ?? '');
  const [fit, setFit] = useState(spec.garment.fit ?? '');
  const [lengthType, setLengthType] = useState(spec.garment.lengthType ?? '');
  const [targetLengthCm, setTargetLengthCm] = useState(spec.garment.targetLengthCm?.toString() ?? '');
  const [sleeveType, setSleeveType] = useState(spec.sleeves?.type ?? '');
  const [necklineType, setNecklineType] = useState(spec.neckline?.type ?? '');
  const [selectedComponents, setSelectedComponents] = useState<string[]>(
    spec.components.map((c) => c.type),
  );
  const [selectedConstruction, setSelectedConstruction] = useState<string[]>(
    spec.constructionDetails,
  );
  const [notes, setNotes] = useState(spec.notes ?? '');

  const handleSaveGarment = () => {
    onSave({
      name: name.trim() || spec.name,
      garment: {
        category,
        silhouette: silhouette || null,
        fit: (fit as DesignSpecification['garment']['fit']) || null,
        lengthType: lengthType || null,
        targetLengthCm: parseFloat(targetLengthCm) || null,
      },
      sleeves: sleeveType ? { type: sleeveType } : null,
      neckline: necklineType ? { type: necklineType } : null,
      components: selectedComponents.map((t) => ({ type: t })),
      constructionDetails: selectedConstruction,
      notes: notes.trim() || null,
    });
  };

  const toggleComponent = (t: string) =>
    setSelectedComponents((prev) =>
      prev.includes(t) ? prev.filter((c) => c !== t) : [...prev, t],
    );

  const toggleConstruction = (t: string) =>
    setSelectedConstruction((prev) =>
      prev.includes(t) ? prev.filter((c) => c !== t) : [...prev, t],
    );

  return (
    <div className="space-y-4 sf-page-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
          Specifications
        </Button>
        <span className="text-ink-mute">/</span>
        <h3 className="font-display text-sm font-semibold text-ink">{spec.name}</h3>
        <Badge tone={spec.status === 'ready_for_design' ? 'success' : spec.status === 'partial' ? 'warning' : 'neutral'}>
          {spec.status.replace(/_/g, ' ')}
        </Badge>
        {spec.version > 1 && <Badge tone="info">v{spec.version}</Badge>}
      </div>

      {specError && <ErrorState message={specError} />}

      {adapterWarnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Design Studio adapter notes:</p>
          <ul className="space-y-1">{adapterWarnings.map((w, i) => <li key={i} className="text-xs text-amber-700">• {w}</li>)}</ul>
        </div>
      )}

      {/* Garment Classification */}
      <Card title="Garment Classification" actions={
        <Button size="sm" variant="secondary" onClick={handleSaveGarment} loading={saving}>Save</Button>
      }>
        <div className="space-y-3">
          <Field id="ds-name" label="Specification Name">
            <Input id="ds-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ama Wedding Kaftan" maxLength={200} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ds-cat" label="Garment Category *">
              <Select id="ds-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(GARMENT_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field id="ds-sil" label="Silhouette">
              <Select id="ds-sil" value={silhouette} onChange={(e) => setSilhouette(e.target.value)}>
                <option value="">— not specified —</option>
                {SILHOUETTE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field id="ds-fit" label="Fit">
              <Select id="ds-fit" value={fit} onChange={(e) => setFit(e.target.value)}>
                <option value="">— not specified —</option>
                {['fitted','slim','regular','relaxed','loose','oversized','custom'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field id="ds-len" label="Length">
              <Select id="ds-len" value={lengthType} onChange={(e) => setLengthType(e.target.value)}>
                <option value="">— not specified —</option>
                {LENGTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field id="ds-lcm" label="Target Length (cm)" help="Precise measurement — not inferred from photo">
              <Input id="ds-lcm" type="number" inputMode="decimal" step="0.5" min="0" value={targetLengthCm} onChange={(e) => setTargetLengthCm(e.target.value)} placeholder="e.g. 142" />
            </Field>
            <Field id="ds-sleeve" label="Sleeve Type">
              <Select id="ds-sleeve" value={sleeveType} onChange={(e) => setSleeveType(e.target.value)}>
                <option value="">— not specified —</option>
                {SLEEVE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field id="ds-neck" label="Neckline / Collar">
              <Select id="ds-neck" value={necklineType} onChange={(e) => setNecklineType(e.target.value)}>
                <option value="">— not specified —</option>
                {NECKLINE_OPTIONS.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
          </div>

          {/* Components */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Components</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Garment components">
              {COMPONENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={selectedComponents.includes(opt)}
                  onClick={() => toggleComponent(opt)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                    selectedComponents.includes(opt)
                      ? 'bg-charcoal text-ivory'
                      : 'border border-line text-ink-soft hover:bg-grey-light'
                  }`}
                >
                  {opt.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Construction */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Construction Details</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Construction details">
              {CONSTRUCTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={selectedConstruction.includes(opt)}
                  onClick={() => toggleConstruction(opt)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                    selectedConstruction.includes(opt)
                      ? 'bg-charcoal text-ivory'
                      : 'border border-line text-ink-soft hover:bg-grey-light'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <Field id="ds-notes" label="Notes">
            <Textarea id="ds-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional tailor notes…" maxLength={2000} />
          </Field>
        </div>
      </Card>

      {/* Style Inspiration */}
      <Card
        title={`Style Inspiration (${spec.inspirationIds.length})`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => onShowInspirationCapture(true)} icon={<Plus className="h-3.5 w-3.5" />}>
            Add
          </Button>
        }
      >
        {showInspirationCapture && (
          <div className="mb-4">
            <InspirationCapture
              customerId={customerId}
              workspaceId={workspaceId}
              onSave={onSaveInspiration as never}
              onCancel={() => onShowInspirationCapture(false)}
            />
          </div>
        )}
        {inspLoading && <Loading label="Loading inspirations…" />}
        <div className="space-y-2">
          {inspirations.map((insp) => {
            const linked = spec.inspirationIds.includes(insp.id);
            return (
              <div key={insp.id} className="relative">
                <InspirationCard
                  inspiration={insp}
                  onEdit={undefined}
                  onDelete={linked ? () => onToggleInspiration(insp.id) : undefined}
                />
                {!linked && (
                  <button
                    type="button"
                    onClick={() => onToggleInspiration(insp.id)}
                    className="absolute right-3 top-3 text-xs font-semibold text-gold hover:text-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    + Link
                  </button>
                )}
                {linked && <span className="absolute right-3 top-3"><Badge tone="success">Linked</Badge></span>}
              </div>
            );
          })}
          {inspirations.length === 0 && !inspLoading && (
            <p className="py-4 text-center text-sm text-ink-mute">No inspirations yet — add a style reference.</p>
          )}
        </div>
      </Card>

      {/* Fabric Profiles */}
      <Card
        title={`Exact Fabric (${spec.fabricProfileIds.length})`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => { onShowFabricForm(true); }} icon={<Plus className="h-3.5 w-3.5" />}>
            Add Fabric
          </Button>
        }
      >
        {showFabricForm && (
          <div className="mb-4">
            <FabricProfileForm
              workspaceId={workspaceId}
              initialProfile={editingFabricId ? fabricProfiles.find((f) => f.id === editingFabricId) : undefined}
              onSave={onSaveFabric as never}
              onCancel={() => { onShowFabricForm(false); }}
              saving={saving}
            />
          </div>
        )}
        {fabLoading && <Loading label="Loading fabric profiles…" />}
        <div className="space-y-2">
          {fabricProfiles.map((fab) => {
            const linked = spec.fabricProfileIds.includes(fab.id);
            return (
              <div key={fab.id} className="relative">
                <FabricProfileCard
                  profile={fab}
                  selected={linked}
                  onSelect={() => onToggleFabric(fab.id)}
                  onEdit={() => onEditFabric(fab.id)}
                />
              </div>
            );
          })}
          {fabricProfiles.length === 0 && !fabLoading && (
            <p className="py-4 text-center text-sm text-ink-mute">No fabric profiles — add the customer's fabric.</p>
          )}
        </div>
      </Card>

      {/* Readiness Panel */}
      {spec.readiness && (
        <ReadinessPanel
          readiness={spec.readiness}
          spec={spec}
          onOpenDesignStudio={spec.readiness.canOpenDesignStudio ? onOpenDesignStudio : undefined}
        />
      )}
    </div>
  );
}
