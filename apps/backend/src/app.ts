import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';
import { authMiddleware } from './middleware/auth';
import { requireWorkspace } from './middleware/workspace';
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

// Business routes: authenticated + tenant-scoped (Phase 3).
// JWT -> user -> workspace membership -> req.workspaceId -> scoped SQL.
app.use('/dashboard', authMiddleware, requireWorkspace, dashboardRoutes);
app.use('/customers', authMiddleware, requireWorkspace, customerRoutes);
app.use('/orders', authMiddleware, requireWorkspace, orderRoutes);
app.use('/invoices', authMiddleware, requireWorkspace, invoiceRoutes);
app.use('/payments', authMiddleware, requireWorkspace, paymentRoutes);
app.use('/materials', authMiddleware, requireWorkspace, materialRoutes);
app.use('/reports', authMiddleware, requireWorkspace, reportRoutes);
app.use('/settings', authMiddleware, requireWorkspace, settingsRoutes);

app.use(notFound);
app.use(errorHandler);
