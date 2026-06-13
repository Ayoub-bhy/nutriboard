import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/http.js';
import { env } from '../config/env.js';
import { verifyState } from '../utils/oauthState.js';
import * as svc from '../services/integration.service.js';

const router = Router();
const uid = (req: any): string => req.auth!.userId;

// List connected providers (auth required).
router.get('/integrations', requireAuth, h(async (req, res) => {
  res.json(await svc.listIntegrations(uid(req)));
}));

// Merged imported metrics for a date (auth required) — the app reads this to fill activity.
router.get('/integrations/metrics', requireAuth, h(async (req, res) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  res.json(await svc.metricsForDate(uid(req), date));
}));

// Begin OAuth — returns the provider's authorize URL for the client to open (auth required).
router.get('/integrations/:provider/connect', requireAuth, h(async (req, res) => {
  res.json({ url: svc.authUrl(req.params.provider, uid(req)) });
}));

// Force a sync now (auth required).
router.post('/integrations/:provider/sync', requireAuth, h(async (req, res) => {
  res.json(await svc.sync(req.params.provider, uid(req)));
}));

// Disconnect (auth required).
router.delete('/integrations/:provider', requireAuth, h(async (req, res) => {
  res.json(await svc.disconnect(req.params.provider, uid(req)));
}));

// OAuth callback — public (the provider redirects the browser here with code + signed state).
// The state is HMAC-verified and must not be expired before we trust the userId it carries.
router.get('/integrations/:provider/callback', h(async (req, res) => {
  const code = String(req.query.code || '');
  const rawState = String(req.query.state || '');
  if (!code || !rawState) { res.status(400).send('Missing code/state'); return; }
  let userId: string;
  try {
    userId = verifyState(rawState, env.jwtSecret);
  } catch {
    res.status(400).send('Invalid or expired state');
    return;
  }
  try {
    await svc.handleCallback(req.params.provider, code, userId);
    res.redirect(`${env.frontendUrl}/?connected=${req.params.provider}`);
  } catch {
    res.redirect(`${env.frontendUrl}/?connect_error=${req.params.provider}`);
  }
}));

export default router;
