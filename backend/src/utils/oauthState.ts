import crypto from 'node:crypto';

/**
 * Signed, expiring OAuth `state` parameter — closes the CSRF / account-injection
 * hole on the public OAuth callback. The state is an HMAC-signed envelope that
 * binds the flow to a userId and a short TTL; the callback re-derives and
 * timing-safe-verifies it before trusting the userId.
 *
 * Format: base64url(payload).base64url(hmac-sha256(payload))
 */
export function signState(userId: string, secret: string, ttlMs = 10 * 60 * 1000): string {
  if (!userId) throw new Error('userId required');
  const payload = { u: userId, n: crypto.randomBytes(8).toString('hex'), e: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string, secret: string): string {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) throw new Error('malformed state');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('bad state signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { u?: string; e?: number };
  if (typeof payload.e !== 'number' || Date.now() > payload.e) throw new Error('state expired');
  if (!payload.u) throw new Error('state missing user');
  return payload.u;
}
