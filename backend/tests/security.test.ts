import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../src/utils/crypto.ts';
import { signState, verifyState } from '../src/utils/oauthState.ts';
import { normalizeEmail } from '../src/utils/email.ts';
import { validateProdEnv } from '../src/utils/envValidate.ts';

const SECRET = 'a'.repeat(40);

test('crypto: round-trips and is non-deterministic', () => {
  const ct1 = encrypt('fitbit-access-token-123', SECRET)!;
  const ct2 = encrypt('fitbit-access-token-123', SECRET)!;
  assert.notEqual(ct1, ct2, 'random IV → different ciphertext each time');
  assert.equal(decrypt(ct1, SECRET), 'fitbit-access-token-123');
  assert.equal(decrypt(ct2, SECRET), 'fitbit-access-token-123');
});
test('crypto: null passes through', () => {
  assert.equal(encrypt(null, SECRET), null);
  assert.equal(decrypt(null, SECRET), null);
});
test('crypto: tampered ciphertext or wrong key fails (GCM auth)', () => {
  const ct = encrypt('secret', SECRET)!;
  assert.throws(() => decrypt(ct, 'b'.repeat(40)));
  const parts = ct.split('.'); parts[2] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decrypt(parts.join('.'), SECRET));
});

test('oauth state: signs and verifies, returns userId', () => {
  const s = signState('user_abc', SECRET);
  assert.equal(verifyState(s, SECRET), 'user_abc');
});
test('oauth state: rejects forged/tampered/wrong-secret state', () => {
  const s = signState('user_abc', SECRET);
  assert.throws(() => verifyState(s, 'other-secret'));
  assert.throws(() => verifyState('not-a-state', SECRET));
  const [body] = s.split('.');
  assert.throws(() => verifyState(body + '.deadbeef', SECRET));
});
test('oauth state: rejects expired state', () => {
  const s = signState('user_abc', SECRET, -1); // already expired
  assert.throws(() => verifyState(s, SECRET), /expired/);
});

test('email normalization', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail(''), '');
});

test('prod env guard: passes in dev, blocks weak prod config', () => {
  assert.deepEqual(validateProdEnv({ nodeEnv: 'development', jwtSecret: 'dev' }), []);
  assert.equal(validateProdEnv({ nodeEnv: 'production', jwtSecret: 'a'.repeat(40), databaseUrl: 'postgres://x' }).length, 0);
  assert.ok(validateProdEnv({ nodeEnv: 'production', jwtSecret: 'ci-test-secret', databaseUrl: 'postgres://x' }).length > 0);
  assert.ok(validateProdEnv({ nodeEnv: 'production', jwtSecret: 'short', databaseUrl: 'postgres://x' }).length > 0);
  assert.ok(validateProdEnv({ nodeEnv: 'production', jwtSecret: 'a'.repeat(40) }).some((m) => m.includes('DATABASE_URL')));
});
