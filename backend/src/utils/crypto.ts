import crypto from 'node:crypto';

/**
 * Authenticated symmetric encryption for secrets at rest (e.g. OAuth tokens).
 * Format: "iv.tag.ciphertext", each segment base64url. AES-256-GCM.
 *
 * The key is derived from the app secret with SHA-256, so any string secret works.
 * Pass the secret explicitly (keeps this module pure and unit-testable).
 */
const ALG = 'aes-256-gcm';

function keyFrom(secret: string): Buffer {
  if (!secret) throw new Error('encryption secret is required');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(plain: string | null | undefined, secret: string): string | null {
  if (plain == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, keyFrom(secret), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ct].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string | null | undefined, secret: string): string | null {
  if (payload == null) return null;
  const [ivB, tagB, ctB] = String(payload).split('.');
  if (!ivB || !tagB || !ctB) throw new Error('malformed ciphertext');
  const decipher = crypto.createDecipheriv(ALG, keyFrom(secret), Buffer.from(ivB, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8');
}
