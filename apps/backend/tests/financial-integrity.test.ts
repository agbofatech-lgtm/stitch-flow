import crypto from 'crypto';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';

describe('Financial & inventory integrity', () => {
  let session: AuthSession;
  let api: ReturnType<typeof asUser>;
  let customerId: string;
  let invoiceId: string;

  beforeEach(async () => {
    session = await registerUser('fin-owner@example.com');
    api = asUser(session);
    const customer = await api
      .post('/customers')
      .send({ fullName: 'Fin Customer', phone: '+233200000020' });
    customerId = customer.body.id;
    const invoice = await api.post('/invoices').send({
      customerId,
      invoiceNumber: 'INV-FIN',
      totalAmount: 1000,
    });
    invoiceId = invoice.body.id;
  });

  function payment(amount: number, cmid?: string) {
    return {
      invoiceId,
      customerId,
      amount,
      method: 'Cash',
      referenceCode: `PAY-${crypto.randomUUID().slice(0, 8)}`,
      clientMutationId: cmid ?? crypto.randomUUID(),
    };
  }

  it('duplicate payment (same clientMutationId twice) -> exactly one payment, correct balance', async () => {
    const p = payment(400, crypto.randomUUID());

    const first = await api.post('/payments').send(p);
    expect(first.status).toBe(201);

    const replay = await api.post('/payments').send(p);
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
    expect(replay.body.id).toBe(first.body.id);

    const payments = await api.get(`/payments/invoice/${invoiceId}`);
    expect(payments.body).toHaveLength(1);

    const invoices = await api.get('/invoices');
    const inv = invoices.body.find((row: any) => row.id === invoiceId);
    expect(inv.amountPaid).toBe(400);
    expect(inv.balanceDue).toBe(600);
    expect(inv.status).toBe('partial');
  });

  it('concurrent legitimate payments from two devices BOTH survive (event preservation, not LWW)', async () => {
    const [resA, resB] = await Promise.all([
      api.post('/payments').send(payment(100)),
      api.post('/payments').send(payment(150)),
    ]);
    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);

    const payments = await api.get(`/payments/invoice/${invoiceId}`);
    expect(payments.body).toHaveLength(2);

    const invoices = await api.get('/invoices');
    const inv = invoices.body.find((row: any) => row.id === invoiceId);
    // invoice.total - sum(payments) = balance
    expect(inv.amountPaid).toBe(250);
    expect(inv.balanceDue).toBe(750);
  });

  it('invoice balance stays mathematically correct across multiple payments', async () => {
    await api.post('/payments').send(payment(300));
    await api.post('/payments').send(payment(300));
    await api.post('/payments').send(payment(400));

    const invoices = await api.get('/invoices');
    const inv = invoices.body.find((row: any) => row.id === invoiceId);
    expect(inv.amountPaid).toBe(1000);
    expect(inv.balanceDue).toBe(0);
    expect(inv.status).toBe('paid');

    const payments = await api.get(`/payments/invoice/${invoiceId}`);
    const sum = payments.body.reduce((acc: number, row: any) => acc + row.amount, 0);
    expect(inv.totalAmount - sum).toBe(inv.balanceDue);
  });

  it('over-payment is rejected and leaves invoice + sync log unchanged', async () => {
    const before = await api.get('/sync/changes?cursor=0');
    const res = await api.post('/payments').send(payment(5000));
    expect(res.status).toBe(400);

    const invoices = await api.get('/invoices');
    const inv = invoices.body.find((row: any) => row.id === invoiceId);
    expect(inv.amountPaid).toBe(0);

    // no payment sync event escaped the rolled-back transaction
    const after = await api.get('/sync/changes?cursor=0');
    const paymentEvents = (list: any) =>
      list.body.changes.filter((c: any) => c.entity === 'payments').length;
    expect(paymentEvents(after)).toBe(paymentEvents(before));
  });

  it('payment success emits the payment + invoice sync events atomically', async () => {
    const res = await api.post('/payments').send(payment(200));
    expect(res.status).toBe(201);

    const pull = await api.get('/sync/changes?cursor=0');
    const entities = pull.body.changes.map((c: any) => `${c.entity}:${c.operation}`);
    expect(entities).toContain('payments:insert');
    expect(entities).toContain('invoices:update');
  });

  describe('inventory', () => {
    let orderId: string;
    let fabricId: string;

    beforeEach(async () => {
      const order = await api.post('/orders').send({
        customerId,
        orderNumber: 'ORD-INV',
        orderType: 'custom',
        totalAmount: 100,
      });
      orderId = order.body.id;
      const fabric = await api.post('/materials/fabrics').send({
        name: 'Integrity Cotton',
        fabricType: 'cotton',
        unit: 'yards',
        quantityInStock: 10,
      });
      fabricId = fabric.body.id;
    });

    function usage(qty: number, cmid?: string) {
      return {
        orderId,
        fabricRecordId: fabricId,
        quantityUsed: qty,
        unit: 'yards',
        clientMutationId: cmid ?? crypto.randomUUID(),
      };
    }

    async function stock() {
      const res = await api.get('/materials/fabrics');
      return res.body.find((row: any) => row.id === fabricId).quantityInStock;
    }

    it('usage deducts stock atomically and emits sync events', async () => {
      const res = await api.post('/materials/usages').send(usage(4));
      expect(res.status).toBe(201);
      expect(await stock()).toBe(6);

      const pull = await api.get('/sync/changes?cursor=0');
      const ops = pull.body.changes.map((c: any) => `${c.entity}:${c.operation}`);
      expect(ops).toContain('order_material_usages:insert');
    });

    it('duplicate usage mutation deducts stock exactly once', async () => {
      const u = usage(4, crypto.randomUUID());
      const first = await api.post('/materials/usages').send(u);
      expect(first.status).toBe(201);
      const replay = await api.post('/materials/usages').send(u);
      expect(replay.status).toBe(200);
      expect(replay.body.duplicate).toBe(true);

      expect(await stock()).toBe(6);
      const usages = await api.get(`/materials/usages/order/${orderId}`);
      expect(usages.body).toHaveLength(1);
    });

    it('over-usage beyond stock is rejected (409) and stock is unchanged', async () => {
      const res = await api.post('/materials/usages').send(usage(50));
      expect(res.status).toBe(409);
      expect(await stock()).toBe(10);
    });

    it('concurrent legitimate usages cannot oversell stock (row lock + CHECK constraint)', async () => {
      const [r1, r2, r3] = await Promise.all([
        api.post('/materials/usages').send(usage(6)),
        api.post('/materials/usages').send(usage(6)),
        api.post('/materials/usages').send(usage(6)),
      ]);
      const statuses = [r1.status, r2.status, r3.status].sort();
      // exactly one can succeed with 10 in stock
      expect(statuses.filter((code) => code === 201)).toHaveLength(1);
      expect(await stock()).toBe(4);

      const dbStock = await query(
        `SELECT quantity_in_stock FROM fabric_records WHERE id = $1`,
        [fabricId]
      );
      expect(Number(dbStock.rows[0].quantity_in_stock)).toBeGreaterThanOrEqual(0);
    });

    it('usage deletion restores stock and emits a tombstone, atomically', async () => {
      const created = await api.post('/materials/usages').send(usage(4));
      expect(await stock()).toBe(6);

      const del = await api.delete(`/materials/usages/${created.body.id}`);
      expect(del.status).toBe(200);
      expect(await stock()).toBe(10);

      const pull = await api.get('/sync/changes?cursor=0');
      const tombstones = pull.body.changes.filter(
        (c: any) => c.entity === 'order_material_usages' && c.operation === 'delete'
      );
      expect(tombstones).toHaveLength(1);
    });
  });
});
