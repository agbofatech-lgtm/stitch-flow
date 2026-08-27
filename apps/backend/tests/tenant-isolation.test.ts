import request from 'supertest';
import { app } from '../src/app';
import { registerUser, asUser, type AuthSession } from './helpers';

/**
 * Mandatory Phase 3 gate: Workspace A and Workspace B are fully populated;
 * every cross-tenant read/update/delete must be rejected — via real HTTP.
 */
describe('Tenant isolation (Workspace A vs Workspace B)', () => {
  let a: AuthSession;
  let b: AuthSession;
  let apiA: ReturnType<typeof asUser>;
  let apiB: ReturnType<typeof asUser>;
  let dataA: { customerId: string; orderId: string; invoiceId: string; fabricId: string; usageId: string };

  async function populate(api: ReturnType<typeof asUser>, tag: string) {
    const customer = await api.post('/customers').send({ fullName: `Customer ${tag}`, phone: '+233200000010' });
    expect(customer.status).toBe(201);
    const order = await api.post('/orders').send({
      customerId: customer.body.id,
      orderNumber: `ORD-${tag}`,
      orderType: 'custom',
      totalAmount: 100,
    });
    expect(order.status).toBe(201);
    const invoice = await api.post('/invoices').send({
      customerId: customer.body.id,
      invoiceNumber: `INV-${tag}`,
      totalAmount: 100,
    });
    expect(invoice.status).toBe(201);
    const fabric = await api.post('/materials/fabrics').send({
      name: `Fabric ${tag}`,
      fabricType: 'cotton',
      unit: 'yards',
      quantityInStock: 50,
    });
    expect(fabric.status).toBe(201);
    const usage = await api.post('/materials/usages').send({
      orderId: order.body.id,
      fabricRecordId: fabric.body.id,
      quantityUsed: 5,
      unit: 'yards',
    });
    expect(usage.status).toBe(201);
    return {
      customerId: customer.body.id,
      orderId: order.body.id,
      invoiceId: invoice.body.id,
      fabricId: fabric.body.id,
      usageId: usage.body.id,
    };
  }

  beforeEach(async () => {
    a = await registerUser('tenant-a@example.com');
    b = await registerUser('tenant-b@example.com');
    apiA = asUser(a);
    apiB = asUser(b);
    dataA = await populate(apiA, 'A');
    await populate(apiB, 'B');
  });

  it('list endpoints only return the caller workspace data', async () => {
    for (const [path, expectName] of [
      ['/customers', 'Customer B'],
      ['/orders', undefined],
      ['/invoices', undefined],
      ['/materials/fabrics', 'Fabric B'],
      ['/payments', undefined],
    ] as const) {
      const res = await apiB.get(path);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(path === '/payments' ? 0 : 1);
      if (expectName && res.body[0]) {
        expect(res.body[0].fullName ?? res.body[0].name).toBe(expectName);
      }
    }
  });

  it('B cannot READ A: order by id, customer orders, usages, production stages', async () => {
    expect((await apiB.get(`/orders/${dataA.orderId}`)).status).toBe(404);
    const custOrders = await apiB.get(`/customers/${dataA.customerId}/orders`);
    expect(custOrders.body).toHaveLength(0);
    const usages = await apiB.get(`/materials/usages/order/${dataA.orderId}`);
    expect(usages.body).toHaveLength(0);
    expect((await apiB.get(`/orders/${dataA.orderId}/production-stages`)).status).toBe(404);
    const payments = await apiB.get(`/payments/invoice/${dataA.invoiceId}`);
    expect(payments.body).toHaveLength(0);
  });

  it('B cannot UPDATE A: customers, orders, invoices, fabrics', async () => {
    expect(
      (await apiB.put(`/customers/${dataA.customerId}`).send({ fullName: 'Hacked', phone: 'x' })).status
    ).toBe(404);
    expect(
      (await apiB.put(`/orders/${dataA.orderId}`).send({
        customerId: dataA.customerId,
        orderNumber: 'HACK',
        orderType: 'custom',
      })).status
    ).toBe(404);
    expect(
      (await apiB.put(`/invoices/${dataA.invoiceId}`).send({
        customerId: dataA.customerId,
        invoiceNumber: 'HACK',
        totalAmount: 1,
      })).status
    ).toBe(404);
    expect(
      (await apiB.put(`/materials/fabrics/${dataA.fabricId}`).send({
        name: 'Hacked',
        fabricType: 'cotton',
        unit: 'yards',
        quantityInStock: 0,
      })).status
    ).toBe(404);

    // A's data is untouched
    const customers = await apiA.get('/customers');
    expect(customers.body[0].fullName).toBe('Customer A');
  });

  it('B cannot DELETE A: fabrics and usages', async () => {
    expect((await apiB.delete(`/materials/fabrics/${dataA.fabricId}`)).status).toBe(404);
    expect((await apiB.delete(`/materials/usages/${dataA.usageId}`)).status).toBe(404);

    const fabrics = await apiA.get('/materials/fabrics');
    expect(fabrics.body).toHaveLength(1);
  });

  it('B cannot create payments against A invoices', async () => {
    const res = await apiB.post('/payments').send({
      invoiceId: dataA.invoiceId,
      customerId: dataA.customerId,
      amount: 50,
      method: 'Cash',
      referenceCode: 'PAY-HACK',
    });
    expect(res.status).toBe(404);
  });

  it('dashboard/report aggregates are tenant-scoped', async () => {
    const dashA = await apiA.get('/dashboard/summary');
    expect(dashA.body.totalCustomers).toBe(1);
    const dashB = await apiB.get('/dashboard/summary');
    expect(dashB.body.totalCustomers).toBe(1);
  });

  it('workspace membership is enforced (forged workspace claim fails closed)', async () => {
    // A token names A's workspace; membership is re-verified server-side.
    // Registering never grants membership of B's workspace to A:
    const jwt = await import('jsonwebtoken');
    const { JWT_ISSUER, JWT_AUDIENCE } = await import('../src/utils/jwt');
    const forged = jwt.sign(
      { sub: a.userId, email: a.email, role: 'user', workspaceId: b.workspaceId },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );
    const res = await request(app)
      .get('/customers')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_A_MEMBER');
  });
});
