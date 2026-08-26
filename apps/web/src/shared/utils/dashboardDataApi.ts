import { fetchOrders, type ApiOrder } from '@shared/api/orders';
import { fetchInvoices, type ApiInvoice } from '@shared/api/invoices';

export type DashboardDataBundle = {
  orders: ApiOrder[];
  invoices: ApiInvoice[];
};

export async function getDashboardDataBundle(): Promise<DashboardDataBundle> {
  const [orders, invoices] = await Promise.all([
    fetchOrders(),
    fetchInvoices(),
  ]);

  return { orders, invoices };
}
