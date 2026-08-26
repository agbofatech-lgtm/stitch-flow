const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type ReportSummary = {
  totalRevenue: number;
  totalPaid: number;
  pendingBalances: number;
  invoiceCount: number;
  paymentCount: number;
  totalOrders: number;
  deliveredOrders: number;
  activeOrders: number;
  overdueOrders: number;
  totalOrderValue: number;
  totalCustomers: number;
  lowStockCount: number;
};

export type OrderStatusReportItem = {
  status: string;
  count: number;
};

export type MonthlyRevenueReportItem = {
  month: string;
  revenue: number;
};

export type OverdueOrderReportItem = {
  id: string;
  customerId: string;
  orderNumber: string;
  status: string;
  orderType: string;
  garmentType?: string | null;
  dueDate?: string | null;
  totalAmount: number;
  currency?: string;
  createdAt?: string;
};

export type LowStockMaterialReportItem = {
  id: string;
  workspaceId?: string | null;
  name: string;
  fabricType?: string | null;
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
  createdAt?: string;
  updatedAt?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const data = (await response.json().catch(e => { console.warn("API error", e); return []; })) as { message?: string };
      if (data?.message) {
        message = data.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
      }
    }

    throw new Error(message);
  }

  return response.json().catch(e => { console.warn("API error", e); return []; }) as Promise<T>;
}

export async function fetchReportSummary(): Promise<ReportSummary> {
  const res = await fetch(`${API_BASE_URL}/reports/summary`);
  return parseJson<ReportSummary>(res);
}

export async function fetchOrderStatusReport(): Promise<OrderStatusReportItem[]> {
  const res = await fetch(`${API_BASE_URL}/reports/order-status`);
  return parseJson<OrderStatusReportItem[]>(res);
}

export async function fetchMonthlyRevenueReport(): Promise<MonthlyRevenueReportItem[]> {
  const res = await fetch(`${API_BASE_URL}/reports/monthly-revenue`);
  return parseJson<MonthlyRevenueReportItem[]>(res);
}

export async function fetchOverdueOrdersReport(): Promise<OverdueOrderReportItem[]> {
  const res = await fetch(`${API_BASE_URL}/reports/overdue-orders`);
  return parseJson<OverdueOrderReportItem[]>(res);
}

export async function fetchLowStockMaterialsReport(): Promise<LowStockMaterialReportItem[]> {
  const res = await fetch(`${API_BASE_URL}/reports/low-stock-materials`);
  return parseJson<LowStockMaterialReportItem[]>(res), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)) ]);
}

