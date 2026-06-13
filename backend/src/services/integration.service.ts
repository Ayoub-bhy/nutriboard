import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { badRequest, notFound } from '../utils/http.js';
import { signState } from '../utils/oauthState.js';
import { encrypt, decrypt } from '../utils/crypto.js';

/**
 * Real OAuth2 device-sync service.
 *
 * Supported providers: Fitbit & Strava (full OAuth + data pull), Garmin & Google
 * (config present; Garmin needs partner approval, Google Health Connect is on-device
 * so it syncs from the mobile client). A Terra/Open-Wearables unified webhook can be
 * layered on top using the same ImportedMetric store.
 *
 * To enable a provider, register an OAuth app and set its client id/secret in env.
 */
export type Provider = 'fitbit' | 'strava' | 'garmin' | 'google';

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: () => string;
  clientSecret: () => string;
  /** Basic-auth the token request (Fitbit) vs body params (Strava). */
  basicAuth: boolean;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  fitbit: {
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    scope: 'activity heartrate sleep profile',
    clientId: () => env.fitbitClientId,
    clientSecret: () => env.fitbitClientSecret,
    basicAuth: true,
  },
  strava: {
    authUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    scope: 'activity:read_all',
    clientId: () => env.stravaClientId,
    clientSecret: () => env.stravaClientSecret,
    basicAuth: false,
  },
  garmin: {
    authUrl: 'https://connect.garmin.com/oauthConfirm',
    tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
    scope: '',
    clientId: () => env.garminClientId,
    clientSecret: () => env.garminClientSecret,
    basicAuth: true,
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read',
    clientId: () => env.googleClientId,
    clientSecret: () => env.googleClientSecret,
    basicAuth: false,
  },
};

function cfg(provider: string): ProviderConfig {
  const c = PROVIDERS[provider as Provider];
  if (!c) throw badRequest(`Unknown provider: ${provider}`);
  if (!c.clientId() || !c.clientSecret()) throw badRequest(`${provider} is not configured (missing client id/secret)`);
  return c;
}

function redirectUri(provider: string): string {
  return `${env.oauthRedirectBase}/api/integrations/${provider}/callback`;
}

/** Step 1 — build the provider authorize URL. State is an HMAC-signed, expiring
 * envelope binding the flow to this user (CSRF / account-injection protection). */
export function authUrl(provider: string, userId: string): string {
  const c = cfg(provider);
  const p = new URLSearchParams({
    client_id: c.clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(provider),
    scope: c.scope,
    state: signState(userId, env.jwtSecret),
  });
  if (provider === 'strava') p.set('approval_prompt', 'auto');
  return `${c.authUrl}?${p.toString()}`;
}

/** Step 2 — exchange the auth code for tokens and persist the integration. */
export async function handleCallback(provider: string, code: string, userId: string) {
  const c = cfg(provider);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(provider),
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (c.basicAuth) {
    headers.Authorization = 'Basic ' + Buffer.from(`${c.clientId()}:${c.clientSecret()}`).toString('base64');
  } else {
    body.set('client_id', c.clientId());
    body.set('client_secret', c.clientSecret());
  }
  const res = await fetch(c.tokenUrl, { method: 'POST', headers, body });
  if (!res.ok) throw badRequest(`${provider} token exchange failed (${res.status})`);
  const tok = (await res.json()) as any;
  await saveTokens(provider, userId, tok);
  return { provider, connected: true };
}

async function saveTokens(provider: string, userId: string, tok: any) {
  const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : null;
  const data = {
    // Encrypt provider tokens at rest (AES-256-GCM) so a DB/backup leak can't replay them.
    accessToken: encrypt(tok.access_token, env.encryptionKey) ?? '',
    refreshToken: encrypt(tok.refresh_token ?? null, env.encryptionKey),
    expiresAt,
    scope: tok.scope ?? '',
    externalUserId: tok.user_id ? String(tok.user_id) : tok.athlete?.id ? String(tok.athlete.id) : null,
  };
  await prisma.integration.upsert({
    where: { userId_provider: { userId, provider } },
    update: data,
    create: { userId, provider, ...data },
  });
}

/** Refresh an expired access token. */
async function freshToken(provider: string, userId: string): Promise<string> {
  const integ = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider } } });
  if (!integ) throw notFound(`${provider} not connected`);
  const access = decrypt(integ.accessToken, env.encryptionKey) ?? '';
  if (integ.expiresAt && integ.expiresAt.getTime() > Date.now() + 60_000) return access;
  const refresh = decrypt(integ.refreshToken, env.encryptionKey);
  if (!refresh) return access;

  const c = cfg(provider);
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (c.basicAuth) headers.Authorization = 'Basic ' + Buffer.from(`${c.clientId()}:${c.clientSecret()}`).toString('base64');
  else { body.set('client_id', c.clientId()); body.set('client_secret', c.clientSecret()); }

  const res = await fetch(c.tokenUrl, { method: 'POST', headers, body });
  if (!res.ok) throw badRequest(`${provider} token refresh failed (${res.status})`);
  const tok = (await res.json()) as any;
  await saveTokens(provider, userId, { ...tok, refresh_token: tok.refresh_token ?? refresh });
  return tok.access_token as string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Step 3 — pull today's metrics from the provider and store them. */
export async function sync(provider: string, userId: string) {
  const token = await freshToken(provider, userId);
  const date = today();
  let metric: { steps: number; activeKcal: number; restingHr?: number; sleepMinutes?: number; distanceM?: number };

  if (provider === 'fitbit') metric = await fetchFitbit(token, date);
  else if (provider === 'strava') metric = await fetchStrava(token, date);
  else throw badRequest(`Live sync for ${provider} runs from the mobile client / partner API`);

  const saved = await prisma.importedMetric.upsert({
    where: { userId_provider_date: { userId, provider, date } },
    update: metric,
    create: { userId, provider, date, ...metric },
  });
  await prisma.integration.update({ where: { userId_provider: { userId, provider } }, data: { lastSyncAt: new Date() } });
  return saved;
}

async function fetchFitbit(token: string, date: string) {
  const h = { Authorization: `Bearer ${token}` };
  const day = (await (await fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, { headers: h })).json()) as any;
  const hr = (await (await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${date}/1d.json`, { headers: h })).json()) as any;
  const s = day.summary ?? {};
  return {
    steps: Number(s.steps ?? 0),
    activeKcal: Number(s.activityCalories ?? s.caloriesOut ?? 0),
    restingHr: hr['activities-heart']?.[0]?.value?.restingHeartRate ?? undefined,
    distanceM: Math.round((s.distances?.find((d: any) => d.activity === 'total')?.distance ?? 0) * 1000),
  };
}

async function fetchStrava(token: string, date: string) {
  const acts = (await (await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', { headers: { Authorization: `Bearer ${token}` } })).json()) as any[];
  const todays = (acts || []).filter((a) => typeof a.start_date_local === 'string' && a.start_date_local.startsWith(date));
  return {
    steps: 0,
    activeKcal: Math.round(todays.reduce((s, a) => s + (a.calories ?? a.kilojoules ?? 0), 0)),
    distanceM: Math.round(todays.reduce((s, a) => s + (a.distance ?? 0), 0)),
  };
}

export function listIntegrations(userId: string) {
  return prisma.integration.findMany({
    where: { userId },
    select: { provider: true, scope: true, lastSyncAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function disconnect(provider: string, userId: string) {
  await prisma.integration.deleteMany({ where: { userId, provider } });
  return { provider, connected: false };
}

/** Merge all providers' imported metrics for a date (for the app to read). */
export async function metricsForDate(userId: string, date: string) {
  const rows = await prisma.importedMetric.findMany({ where: { userId, date } });
  return rows.reduce(
    (acc, m) => ({
      steps: Math.max(acc.steps, m.steps),
      activeKcal: acc.activeKcal + m.activeKcal,
      restingHr: m.restingHr ?? acc.restingHr,
      distanceM: acc.distanceM + (m.distanceM ?? 0),
      sources: [...acc.sources, m.provider],
    }),
    { steps: 0, activeKcal: 0, restingHr: null as number | null, distanceM: 0, sources: [] as string[] },
  );
}
