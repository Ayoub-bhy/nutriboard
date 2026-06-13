import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`🥗 NutriBoard API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully…`);
  // Force-exit if connections refuse to drain within 10s, so orchestrators don't hang.
  const force = setTimeout(() => { console.error('Forced shutdown after timeout'); process.exit(1); }, 10_000);
  force.unref();
  server.close(async () => {
    try { await prisma.$disconnect(); } finally { clearTimeout(force); process.exit(0); }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Don't die silently on a stray rejection/exception — log, then let the orchestrator restart us.
process.on('unhandledRejection', (reason) => { console.error('Unhandled promise rejection:', reason); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); shutdown('uncaughtException'); });
