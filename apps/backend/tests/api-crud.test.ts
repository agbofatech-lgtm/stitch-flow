import request from 'supertest';
import { app } from '../src/app';

describe('API smoke + representative CRUD', () => {
  it('GET /health responds ok (frontend health check contract)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns structured 404s for unknown routes', async () => {
    const res = await request(app).get('/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  describe('customers CRUD', () => {
    it('creates, lists, fetches and updates a customer', async () => {
      const created = await request(app).post('/customers').send({
        fullName: 'Akosua Boateng',
        phone: '+233201234567',
        email: 'akosua@example.com',
        address: 'Osu, Accra',
        notes: 'Prefers slim fit',
      });
      expect(created.status).toBe(201);
      const id = created.body.id;
      expect(created.body.fullName).toBe('Akosua Boateng');

      const list = await request(app).get('/customers');
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);

      // The customer surface exposes /:id/orders (no bare /:id route).
      const orders = await request(app).get(`/customers/${id}/orders`);
      expect(orders.status).toBe(200);
      expect(Array.isArray(orders.body)).toBe(true);

      const updated = await request(app).put(`/customers/${id}`).send({
        fullName: 'Akosua B. Mensah',
        phone: '+233201234567',
        email: 'akosua@example.com',
        address: 'Osu, Accra',
        notes: '',
      });
      expect(updated.status).toBe(200);
      expect(updated.body.fullName).toBe('Akosua B. Mensah');
    });

    it('rejects a customer without a name', async () => {
      const res = await request(app).post('/customers').send({ fullName: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('invoice + payment flow', () => {
    it('creates an invoice with items and settles it with a payment', async () => {
      const customer = await request(app)
        .post('/customers')
        .send({ fullName: 'Invoice Customer', phone: '+233200000001' });
      expect(customer.status).toBe(201);
      const customerId = customer.body.id;

      const invoice = await request(app).post('/invoices').send({
        customerId,
        invoiceNumber: 'INV-100',
        totalAmount: 500,
        amountPaid: 0,
        currency: 'GHS',
        notes: 'Bridal gown deposit',
        items: [{ description: 'Gown', quantity: 1, unitPrice: 500, total: 500 }],
      });
      expect(invoice.status).toBe(201);
      expect(invoice.body.balanceDue).toBe(500);
      expect(invoice.body.status).toBe('pending');
      expect(invoice.body.items).toHaveLength(1);

      const payment = await request(app).post('/payments').send({
        invoiceId: invoice.body.id,
        customerId,
        amount: 500,
        method: 'Cash',
        referenceCode: 'PAY-TEST-1',
        paymentStatus: 'captured',
        notes: '',
      });
      expect(payment.status).toBe(201);

      // No GET /invoices/:id route exists (pre-existing surface); verify via list.
      const list = await request(app).get('/invoices');
      const settled = list.body.find((row: { id: string }) => row.id === invoice.body.id);
      expect(settled.amountPaid).toBe(500);
      expect(settled.balanceDue).toBe(0);
      expect(settled.status).toBe('paid');
    });
  });

  describe('dashboard', () => {
    it('aggregates summary numbers from real tables', async () => {
      const res = await request(app).get('/dashboard/summary');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('totalOrders');
      expect(res.body).toHaveProperty('totalCustomers');
    });
  });
});
