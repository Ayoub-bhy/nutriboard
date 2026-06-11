import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import api from './routes/index.js';
import { rateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop so req.ip is the real client behind a load balancer.
  app.set('trust proxy', 1);

  // Security headers + CORS.
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));

  // Body parsing with a sane size cap to blunt large-payload abuse.
  app.use(express.json({ limit: '1mb' }));

  if (env.nodeEnv !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Throttle auth endpoints to slow credential-stuffing / brute force.
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts, slow down.' }));
  // General API ceiling.
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 120 }));

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
