import {
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Warehouse,
  Scissors,
  TrendingDown,
  ShoppingCart,
  Archive,
  CheckCircle2,
  Boxes,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';

type MaterialFilter = 'all' | 'active' | 'inactive' | 'low_stock';

export function Materials() {
  const {
    fabricRecords,
    materialUsages,
    featureAccess,
    addFabricRecord,
    updateFabricRecord,
    deleteFabricRecord,
    currentWorkspace,
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MaterialFilter>('all');

  const workspaceCurrency = currentWorkspace.defaultCurrency || 'GHS';

  const currentMonthUsage = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return materialUsages.filter((usage) => {
      const usageDate = new Date(usage.createdAt);
      return usageDate.getMonth() === month && usageDate.getFullYear() === year;
    });
  }, [materialUsages]);

  const monthlyUsageByMaterial = useMemo(() => {
    const usageMap = new Map<
      string,
      { quantity: number; usageCount: number; lastUsedAt?: Date }
    >();

    for (const usage of currentMonthUsage) {
      const current = usageMap.get(usage.fabricRecordId) || {
        quantity: 0,
        usageCount: 0,
        lastUsedAt: undefined,
      };

      const usageDate = new Date(usage.createdAt);
      usageMap.set(usage.fabricRecordId, {
        quantity: current.quantity + usage.quantityUsed,
        usageCount: current.usageCount + 1,
        lastUsedAt:
          !current.lastUsedAt || usageDate > current.lastUsedAt
            ? usageDate
            : current.lastUsedAt,
      });
    }

    return usageMap;
  }, [currentMonthUsage]);

  const monthlySummary = useMemo(() => {
    const totalConsumed = currentMonthUsage.reduce(
      (sum, usage) => sum + usage.quantityUsed,
      0
    );

    const totalMaterialCost = currentMonthUsage.reduce((sum, usage) => {
      const material = fabricRecords.find((item) => item.id === usage.fabricRecordId);
      return sum + usage.quantityUsed * (material?.costPerUnit || 0);
    }, 0);

    const uniqueMaterialsUsed = new Set(
      (currentMonthUsage ?? []).map((usage) => usage.fabricRecordId)
    ).size;

    return {
      totalConsumed,
      totalMaterialCost,
      usageCount: currentMonthUsage.length,
      uniqueMaterialsUsed,
    };
  }, [currentMonthUsage, fabricRecords]);

  const lowStockMaterials = useMemo(() => {
    return fabricRecords.filter(
      (item) =>
        item.isActive !== false &&
        typeof item.reorderLevel === 'number' &&
        item.quantityInStock <= item.reorderLevel
    );
  }, [fabricRecords]);

  const reorderSuggestions = useMemo(() => {
    return (lowStockMaterials ?? []).map((material) => {
      const reorderLevel = material.reorderLevel || 0;
      const targetStock = Math.max(reorderLevel * 2, reorderLevel + 5);
      const suggestedQuantity = Math.max(0, targetStock - material.quantityInStock);
      const estimatedCost = suggestedQuantity * (material.costPerUnit || 0);

      return {
        ...material,
        targetStock,
        suggestedQuantity,
        estimatedCost,
      };
    });
  }, [lowStockMaterials]);

  const reorderSummary = useMemo(() => {
    return reorderSuggestions.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalSuggestedQuantity += item.suggestedQuantity;
        acc.totalEstimatedCost += item.estimatedCost;
        return acc;
      },
      {
        totalItems: 0,
        totalSuggestedQuantity: 0,
        totalEstimatedCost: 0,
      }
    );
  }, [reorderSuggestions]);

  const inactiveMaterials = useMemo(
    () => fabricRecords.filter((item) => item.isActive === false),
    [fabricRecords]
  );

  const filteredMaterials = useMemo(() => {
    return fabricRecords.filter((material) => {
      const query = (search ?? "").toLowerCase();
      const matchesSearch =
        (material.name ?? "").toLowerCase().includes(query) ||
        (material.fabricType ?? "").toLowerCase().includes(query) ||
        (material.color ?? "").toLowerCase().includes(query) ||
        (material.supplier || '').toLowerCase().includes(query);

      const isInactive = material.isActive === false;
      const isLowStock =
        material.isActive !== false &&
        typeof material.reorderLevel === 'number' &&
        material.quantityInStock <= material.reorderLevel;

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && !isInactive) ||
        (filter === 'inactive' && isInactive) ||
        (filter === 'low_stock' && isLowStock);

      return matchesSearch && matchesFilter;
    });
  }, [fabricRecords, search, filter]);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-action-secondary px-3 py-1 text-sm font-medium text-action-primary">
            <Warehouse className="h-4 w-4" />
            {BRAND.productName} Materials Inventory
          </div>

          <h1 className="text-2xl font-bold text-ink-primary">Materials</h1>
          <p className="mt-1 text-ink-muted">
            Manage fabric inventory, stock levels, monthly consumption, reorder planning,
            and inactive stock.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={!featureAccess.canManageMaterialInventory.allowed}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors ${
            featureAccess.canManageMaterialInventory.allowed
              ? 'bg-action-primary text-white shadow-sm hover:bg-action-hover'
              : 'cursor-not-allowed bg-action-secondary text-ink-muted'
          }`}
        >
          <Plus className="h-4 w-4" />
          Add Material
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Materials Used This Month"
          value={String(monthlySummary.uniqueMaterialsUsed)}
          subtitle="Unique materials consumed"
          icon={Package}
          tone="brand"
        />
        <SummaryCard
          title="Total Quantity Used"
          value={String(monthlySummary.totalConsumed)}
          subtitle="All material units consumed"
          icon={Scissors}
          tone="sky"
        />
        <SummaryCard
          title="Usage Records"
          value={String(monthlySummary.usageCount)}
          subtitle="Material usage entries"
          icon={TrendingDown}
          tone="slate"
        />
        <SummaryCard
          title="Monthly Material Cost"
          value={formatCurrency(
            monthlySummary.totalMaterialCost,
            safeCurrency(workspaceCurrency)
          )}
          subtitle="Estimated based on unit cost"
          icon={Warehouse}
          tone="amber"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Active Materials"
          value={String(fabricRecords.filter((m) => m.isActive !== false).length)}
          subtitle="Currently available in inventory"
          icon={CheckCircle2}
          tone="brand"
        />
        <SummaryCard
          title="Inactive Materials"
          value={String(inactiveMaterials.length)}
          subtitle="Archived or paused stock"
          icon={Archive}
          tone="slate"
        />
        <SummaryCard
          title="Low Stock"
          value={String(lowStockMaterials.length)}
          subtitle="At or below reorder level"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {reorderSuggestions.length > 0 && (
        <div className="mb-6 rounded-sf-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold text-amber-900">
                  Reorder Suggestions
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  {reorderSummary.totalItems} low-stock material
                  {reorderSummary.totalItems > 1 ? 's need' : ' needs'} attention.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickReorderStat
                label="Suggested Qty"
                value={String(reorderSummary.totalSuggestedQuantity)}
              />
              <QuickReorderStat
                label="Estimated Cost"
                value={formatCurrency(
                  reorderSummary.totalEstimatedCost,
                  safeCurrency(workspaceCurrency)
                )}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(reorderSuggestions ?? []).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-amber-100 bg-surface-panel p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink-primary">{item.name}</h3>
                    <p className="text-sm text-ink-muted">
                      {capitalize(item.fabricType)} • {item.color}
                    </p>
                  </div>

                  <ShoppingCart className="h-5 w-5 text-amber-600" />
                </div>

                <div className="space-y-1 text-sm text-ink-secondary">
                  <p>
                    In stock:{' '}
                    <span className="font-medium">
                      {item.quantityInStock} {item.unit}
                    </span>
                  </p>
                  <p>
                    Reorder level:{' '}
                    <span className="font-medium">
                      {item.reorderLevel} {item.unit}
                    </span>
                  </p>
                  <p>
                    Target stock:{' '}
                    <span className="font-medium">
                      {item.targetStock} {item.unit}
                    </span>
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MiniInfoCard
                    label="Suggested Reorder"
                    value={`${item.suggestedQuantity} ${item.unit}`}
                    tone="amber"
                  />
                  <MiniInfoCard
                    label="Est. Cost"
                    value={formatCurrency(
                      item.estimatedCost,
                      safeCurrency(workspaceCurrency)
                    )}
                    tone="slate"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactiveMaterials.length > 0 && (
        <div className="mb-6 rounded-sf-lg border border-line bg-surface-workspace p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Archive className="mt-0.5 h-5 w-5 text-ink-secondary" />
            <div>
              <h2 className="text-lg font-semibold text-ink-primary">
                Inactive Materials
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {inactiveMaterials.length} material
                {inactiveMaterials.length > 1 ? 's are' : ' is'} currently inactive and
                excluded from low-stock alerts and reorder planning.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-sf-lg border border-line bg-surface-panel p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line py-2.5 pl-10 pr-4 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>
        </div>

        <div className="rounded-sf-lg border border-line bg-surface-panel p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterChip
              label="Active"
              active={filter === 'active'}
              onClick={() => setFilter('active')}
            />
            <FilterChip
              label="Inactive"
              active={filter === 'inactive'}
              onClick={() => setFilter('inactive')}
            />
            <FilterChip
              label="Low Stock"
              active={filter === 'low_stock'}
              onClick={() => setFilter('low_stock')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(filteredMaterials ?? []).map((material) => {
          const usageMeta = monthlyUsageByMaterial.get(material.id);
          const monthlyConsumed = usageMeta?.quantity || 0;
          const monthlyUsageCount = usageMeta?.usageCount || 0;
          const estimatedMonthlyCost = monthlyConsumed * (material.costPerUnit || 0);
          const isLowStock =
            material.isActive !== false &&
            typeof material.reorderLevel === 'number' &&
            material.quantityInStock <= material.reorderLevel;

          const suggestion = reorderSuggestions.find((item) => item.id === material.id);
          const isInactive = material.isActive === false;

          return (
            <div
              key={material.id}
              className={`overflow-hidden rounded-sf-lg border bg-surface-panel shadow-sm ${
                isInactive
                  ? 'border-line opacity-90'
                  : isLowStock
                  ? 'border-amber-200'
                  : 'border-line'
              }`}
            >
              <div
                className={`h-1.5 w-full ${
                  isInactive
                    ? 'bg-slate-300'
                    : isLowStock
                    ? 'bg-amber-400'
                    : 'bg-action-primary'
                }`}
              />

              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink-primary">{material.name}</h3>

                      {isLowStock && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Low Stock
                        </span>
                      )}

                      {isInactive && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-ink-secondary">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-ink-secondary">
                      <span>Type: {capitalize(material.fabricType)}</span>
                      <span>Color: {material.color}</span>
                      <span>
                        Stock: {material.quantityInStock} {material.unit}
                      </span>
                      {material.supplier && <span>Supplier: {material.supplier}</span>}
                    </div>

                    {material.notes && (
                      <p className="mt-3 text-sm text-ink-muted">{material.notes}</p>
                    )}

                    {suggestion && !isInactive && (
                      <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                        Suggested reorder:{' '}
                        <span className="font-semibold">
                          {suggestion.suggestedQuantity} {material.unit}
                        </span>{' '}
                        to reach about{' '}
                        <span className="font-semibold">
                          {suggestion.targetStock} {material.unit}
                        </span>
                        .
                      </div>
                    )}

                    {isInactive && (
                      <div className="mt-3 rounded-2xl bg-action-secondary p-3 text-sm text-ink-secondary">
                        This material is inactive. It is excluded from low-stock alerts and
                        reorder suggestions until reactivated.
                      </div>
                    )}
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-3">
                    <MiniInfoCard
                      label="Consumed This Month"
                      value={`${monthlyConsumed} ${material.unit}`}
                      tone="brand"
                    />
                    <MiniInfoCard
                      label="Usage Records"
                      value={String(monthlyUsageCount)}
                      tone="sky"
                    />
                    <MiniInfoCard
                      label="Monthly Cost"
                      value={formatCurrency(
                        estimatedMonthlyCost,
                        safeCurrency(workspaceCurrency)
                      )}
                      tone="amber"
                    />
                    <MiniInfoCard
                      label="Last Used"
                      value={
                        usageMeta?.lastUsedAt
                          ? format(new Date(usageMeta.lastUsedAt), 'MMM d, yyyy')
                          : 'Not used'
                      }
                      tone="slate"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line-subtle pt-4">
                  <button
                    onClick={() => setEditingMaterialId(material.id)}
                    className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-workspace"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      updateFabricRecord(material.id, { isActive: !material.isActive })
                    }
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      isInactive
                        ? 'border border-green-200 text-green-700 hover:bg-green-50'
                        : 'border border-line text-ink-secondary hover:bg-surface-workspace'
                    }`}
                  >
                    {isInactive ? 'Activate' : 'Mark Inactive'}
                  </button>

                  <button
                    onClick={() => deleteFabricRecord(material.id)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto max-w-md rounded-sf-lg border border-dashed border-line bg-surface-panel p-8">
            <Boxes className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
            <h3 className="text-lg font-semibold text-ink-primary">No materials found</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Add a new material, adjust your search, or change the filter.
            </p>
          </div>
        </div>
      )}

      {showAddModal && (
        <MaterialModal
          title="Add Material"
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => {
            addFabricRecord(data);
            setShowAddModal(false);
          }}
        />
      )}

      {editingMaterialId && (
        <MaterialModal
          title="Edit Material"
          material={fabricRecords.find((item) => item.id === editingMaterialId) || null}
          onClose={() => setEditingMaterialId(null)}
          onSubmit={(data) => {
            updateFabricRecord(editingMaterialId, data);
            setEditingMaterialId(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'brand' | 'sky' | 'slate' | 'amber';
}) {
  const tones = {
    brand: 'bg-action-secondary text-action-primary',
    sky: 'bg-action-secondary text-action-primary',
    slate: 'bg-action-secondary text-ink-secondary',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-sf-lg border border-line bg-surface-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function QuickReorderStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-surface-panel px-4 py-3 text-sm shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        {label}
      </p>
      <p className="mt-1 font-bold text-ink-primary">{value}</p>
    </div>
  );
}

function MiniInfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'sky' | 'amber' | 'slate';
}) {
  const tones = {
    brand: 'bg-action-secondary text-action-primary',
    sky: 'bg-action-secondary text-action-primary',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-action-secondary text-ink-secondary',
  };

  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-action-primary text-white'
          : 'bg-action-secondary text-ink-secondary hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function MaterialModal({
  title,
  material,
  onClose,
  onSubmit,
}: {
  title: string;
  material?: any | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    fabricType: material?.fabricType || 'cotton',
    color: material?.color || '',
    pattern: material?.pattern || '',
    texture: material?.texture || '',
    quantityInStock: material?.quantityInStock?.toString() || '',
    unit: material?.unit || 'yards',
    costPerUnit: material?.costPerUnit?.toString() || '',
    supplier: material?.supplier || '',
    reorderLevel: material?.reorderLevel?.toString() || '5',
    isActive: material?.isActive ?? true,
    notes: material?.notes || '',
    imageUrl: material?.imageUrl || null,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...formData,
      quantityInStock: Number(formData.quantityInStock || 0),
      costPerUnit: Number(formData.costPerUnit || 0),
      reorderLevel: Number(formData.reorderLevel || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-sf-lg bg-surface-panel shadow-xl">
        <div className="h-1.5 w-full bg-action-primary" />

        <div className="border-b border-line p-4">
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Material Name">
              <input
                value={formData.name}
                onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Type">
              <input
                value={formData.fabricType}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, fabricType: e.target.value }))
                }
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Color">
              <input
                value={formData.color}
                onChange={(e) => setFormData((s) => ({ ...s, color: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Pattern">
              <input
                value={formData.pattern}
                onChange={(e) => setFormData((s) => ({ ...s, pattern: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Texture">
              <input
                value={formData.texture}
                onChange={(e) => setFormData((s) => ({ ...s, texture: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Supplier">
              <input
                value={formData.supplier}
                onChange={(e) => setFormData((s) => ({ ...s, supplier: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Quantity In Stock">
              <input
                type="number"
                value={formData.quantityInStock}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, quantityInStock: e.target.value }))
                }
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Unit">
              <input
                value={formData.unit}
                onChange={(e) => setFormData((s) => ({ ...s, unit: e.target.value }))}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Cost Per Unit">
              <input
                type="number"
                value={formData.costPerUnit}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, costPerUnit: e.target.value }))
                }
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>

            <Field label="Reorder Level">
              <input
                type="number"
                value={formData.reorderLevel}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, reorderLevel: e.target.value }))
                }
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Notes">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((s) => ({ ...s, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-line px-3 py-2 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((s) => ({ ...s, isActive: e.target.checked }))
              }
            />
            Active material
          </label>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-action-primary px-4 py-2.5 font-medium text-white hover:bg-action-hover"
            >
              Save Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-secondary">{label}</label>
      {children}
    </div>
  );
}

function capitalize(value: string) {
  if (!value) return 'N/A';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
