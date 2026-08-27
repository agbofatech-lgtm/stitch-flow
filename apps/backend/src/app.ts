import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { customerRoutes } from './routes/customerRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { materialRoutes } from './routes/materialRoutes';
import { reportRoutes } from './routes/reportRoutes';
import { settingsRoutes } from './routes/settingsRoutes';

/**
 * Canonical StitchFlow Express application.
 *
 * Single execution path: server.ts boots this app. The previous mock server
 * (hardcoded data) has been removed from the runtime path.
 */
export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.get('/', (_req, res) => {
  res.json({
    message: 'StitchFlow backend is running',
  });
});

// Platform routes: auth, licenses, events, feature-requests, sync, admin, health
app.use('/', apiRoutes);

// Business routes (existing StitchFlow modules, preserved as-is)
app.use('/dashboard', dashboardRoutes);
app.use('/customers', customerRoutes);
app.use('/orders', orderRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/payments', paymentRoutes);
app.use('/materials', materialRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);
