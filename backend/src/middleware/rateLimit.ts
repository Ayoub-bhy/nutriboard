import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal, dependency-free in-memory rate limiter.
 * Suitable for a single-instance deployment; swap for a Redis-backed limiter
 * (e.g. rate-limiter-flexible) when running multiple instances.
 */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodically evict stale buckets so the map can't grow unbounded.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) if (now > rec.resetAt) hits.delete(key);
  }, opts.windowMs);
  sweeper.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const rec = hits.get(key);

    if (!rec || now > rec.resetAt) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    if (rec.count >= opts.max) {
      res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
      res.status(429).json({ error: opts.message ?? 'Too many requests, please try again later.' });
      return;
    }
    rec.count += 1;
    next();
  };
}
