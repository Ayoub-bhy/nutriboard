/**
 * Production env guard. In production a missing/weak JWT secret or missing
 * database URL must hard-fail the boot rather than silently using an insecure
 * default. Pure function so it is unit-testable without importing process.env.
 */
const INSECURE = new Set([
  'dev-insecure-secret-change-me', 'change-me', 'changeme', 'secret', 'password', 'dev', 'test', 'ci-test-secret',
]);

export function validateProdEnv(e: { nodeEnv?: string; jwtSecret?: string; databaseUrl?: string }): string[] {
  const errors: string[] = [];
  if (e.nodeEnv !== 'production') return errors;
  if (!e.jwtSecret || INSECURE.has(e.jwtSecret) || e.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be a strong, non-default value of at least 32 characters in production');
  }
  if (!e.databaseUrl) errors.push('DATABASE_URL must be set in production');
  return errors;
}
