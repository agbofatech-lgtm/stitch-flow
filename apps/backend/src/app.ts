import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { customerRoutes } from './routes/customerRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { materialRoutes } from './routes/materialRoutes';
import { reportRoutes } from './routes/reportRoutes';
import { settingsRoutes } from './routes/settingsRoutes';

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '10mb' }));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    console.log(
      '[API]',
      req.method,
      req.originalUrl,
      '->',
      res.statusCode,
      '(' + (Date.now() - startedAt) + 'ms)',
      'origin=' + (req.headers.origin || '-'),
      'ua=' + (req.headers['user-agent'] || '-')
    );
  });

  next();
});

app.get('/', (_req, res) => {
  res.json({
    message: 'StitchFlow backend is running',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

app.use('/dashboard', dashboardRoutes);
app.use('/customers', customerRoutes);
app.use('/orders', orderRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/payments', paymentRoutes);
app.use('/materials', materialRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingsRoutes);
