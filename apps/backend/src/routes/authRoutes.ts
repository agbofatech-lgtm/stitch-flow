import { Router } from 'express';
import { requireIdentity } from '../middleware/auth';
import { PlatformError, type PlatformRuntime } from '../platform/runtime';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res, next) => {
  try {
    const runtime = req.app.locals.platform as PlatformRuntime;
    const result = await runtime.register({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
      displayName: String(req.body?.displayName || ''),
      tenantName: req.body?.tenantName ? String(req.body.tenantName) : undefined,
    });
    res.status(201).json({
      identity: result.identity,
      tenant: result.tenant,
      workspace: result.workspace,
      accessToken: result.accessToken,
    });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});

authRoutes.post('/login', async (req, res, next) => {
  try {
    const runtime = req.app.locals.platform as PlatformRuntime;
    const result = await runtime.login({
      email: String(req.body?.email || ''),
      password: String(req.body?.password || ''),
    });
    res.json({ identity: result.identity, accessToken: result.accessToken });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});

authRoutes.get('/me', requireIdentity, (req, res, next) => {
  try {
    const runtime = req.app.locals.platform as PlatformRuntime;
    const identity = runtime.getIdentity(req.platformIdentityId as string);
    res.json({ identity: runtime.publicIdentity(identity) });
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
});
