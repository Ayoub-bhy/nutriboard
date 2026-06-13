import 'dotenv/config';
import { validateProdEnv } from '../utils/envValidate.js';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

function required(name: string, fallback?: string): string {
  // In production, do NOT fall back to insecure defaults — fail loudly instead.
  const v = process.env[name] ?? (isProd ? undefined : fallback);
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// Hard-fail the boot if production is misconfigured (weak/default JWT secret, missing DB).
const _envErrors = validateProdEnv({ nodeEnv, jwtSecret: process.env.JWT_SECRET, databaseUrl: process.env.DATABASE_URL });
if (_envErrors.length) throw new Error(`Invalid production configuration:\n - ${_envErrors.join('\n - ')}`);

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgresql://nutriboard:nutriboard@localhost:5432/nutriboard?schema=public'),
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  // Dedicated key for encrypting secrets at rest (OAuth tokens). Falls back to JWT secret.
  encryptionKey: process.env.ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // How many proxy hops to trust for client IP (set to your infra's hop count in prod).
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  adminEmails: process.env.ADMIN_EMAILS ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  isProd,

  // Device-sync OAuth — base URL for callbacks + where to send the user after connecting.
  oauthRedirectBase: process.env.OAUTH_REDIRECT_BASE ?? 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  fitbitClientId: process.env.FITBIT_CLIENT_ID ?? '',
  fitbitClientSecret: process.env.FITBIT_CLIENT_SECRET ?? '',
  stravaClientId: process.env.STRAVA_CLIENT_ID ?? '',
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
  garminClientId: process.env.GARMIN_CLIENT_ID ?? '',
  garminClientSecret: process.env.GARMIN_CLIENT_SECRET ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
};
