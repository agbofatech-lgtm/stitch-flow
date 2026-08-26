const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type ApiFabricRecord = {
  id: string;
  workspaceId: string | null;
  name: string;
  fabricType: string;
  color: string | null;
  unit: string;
  quantityInStock: number;
  reorderLevel: number | null;
  costPerUnit: number | null;
  supplierName: string | null;
  supplierContact: string | null;
  notes: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiMaterialUsage = {
  id: string;
  orderId: string;
  fabricRecordId: string;
  quantityUsed: number;
  unit: string;
  notes: string | null;
  createdAt: string;
};

export async function fetchFabricRecords(): Promise<ApiFabricRecord[]> {
  const response = await fetch(`${API_BASE}/materials/fabrics`);

  if (!response.ok) {
    throw new Error('Failed to fetch fabric records');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; }), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)) ]);
}

export async function createFabricRecord(payload: {
  workspaceId?: string | null;
  name: string;
  fabricType: string;
  color?: string | null;
  unit: string;
  quantityInStock: number;
  reorderLevel?: number | null;
  costPerUnit?: number | null;
  supplierName?: string | null;
  supplierContact?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}): Promise<ApiFabricRecord> {
  const response = await fetch(`${API_BASE}/materials/fabrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to create fabric record');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function updateFabricRecordApi(
  id: string,
  payload: Partial<{
    workspaceId: string | null;
    name: string;
    fabricType: string;
    color: string | null;
    unit: string;
    quantityInStock: number;
    reorderLevel: number | null;
    costPerUnit: number | null;
    supplierName: string | null;
    supplierContact: string | null;
    notes: string | null;
    imageUrl: string | null;
    metadata: Record<string, unknown> | null;
    isActive: boolean;
  }>
): Promise<ApiFabricRecord> {
  const response = await fetch(`${API_BASE}/materials/fabrics/${encodeURIComponent(id);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to update fabric record');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function deleteFabricRecordApi(id: string): Promise<{ success: true }> {
  const response = await fetch(`${API_BASE}/materials/fabrics/${encodeURIComponent(id);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete fabric record');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function fetchMaterialUsagesByOrder(orderId: string): Promise<ApiMaterialUsage[]> {
  const response = await fetch(
    `${API_BASE}/materials/usages/order/${encodeURIComponent(orderId);

  if (!response.ok) {
    throw new Error('Failed to fetch material usages');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function createMaterialUsage(payload: {
  orderId: string;
  fabricRecordId: string;
  quantityUsed: number;
  unit: string;
  notes?: string | null;
}), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)) ]): Promise<ApiMaterialUsage> {
  const response = await fetch(`${API_BASE}/materials/usages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to create material usage');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function deleteMaterialUsageApi(id: string): Promise<{ success: true }> {
  const response = await fetch(`${API_BASE}/materials/usages/${encodeURIComponent(id);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete material usage');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; });
}

export async function fetchLowStockFabrics(): Promise<ApiFabricRecord[]> {
  const response = await fetch(`${API_BASE}/materials/fabrics/low-stock`);

  if (!response.ok) {
    throw new Error('Failed to fetch low stock fabrics');
  }

  return response.json().catch(e => { console.warn("API error", e); return []; }), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)) ]);
}
