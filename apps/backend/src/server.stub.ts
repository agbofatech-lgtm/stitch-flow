/**
 * RETIRED T0 stub runtime — NOT started by npm scripts.
 *
 * Preserved so T1 does not destroy evidence of the previous fake API.
 * Do not import this file from server.ts.
 *
 * Historical behavior: hardcoded JSON on port 5000, no app.ts, no database.
 */
import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://192.168.100.4:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

const PORT = 5000;

app.get('/', (_req, res) => {
  res.send('API running');
});

app.get('/dashboard/summary', (_req, res) => {
  res.json({ totalRevenue: 125000, totalOrders: 342, totalCustomers: 89 });
});

app.get('/orders', (_req, res) => {
  res.json([{ id: 'ORD-001', amount: 1250, status: 'delivered', date: '2025-05-01' }]);
});

app.get('/invoices', (_req, res) => {
  res.json([{ id: 'INV-001', amount: 1200, status: 'paid', date: '2025-05-01' }]);
});

app.get('/dashboard/payments-analytics', (_req, res) => {
  res.json({ totalPaid: 98500, totalPending: 15400, weeklyData: [12500, 14200] });
});

app.get('/settings/workspace-members', (_req, res) => {
  res.json([]);
});

app.get('/customers', (_req, res) => {
  res.json([]);
});

app.get('/settings', (_req, res) => {
  res.json({ workspace_profile: { name: 'Stitch Flow', defaultCurrency: 'GHS' } });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RETIRED stub listening on http://0.0.0.0:${PORT} — not the T1 runtime`);
  });
}

export { app as retiredStubApp };
