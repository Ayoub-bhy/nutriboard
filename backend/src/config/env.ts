import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', 'postgresql://nutriboard:nutriboard@localhost:5432/nutriboard?schema=public'),
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
  isProd: process.env.NODE_ENV === 'production',
};
