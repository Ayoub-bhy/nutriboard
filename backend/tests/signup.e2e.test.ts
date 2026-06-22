/**
 * Signup (Apple/Google + email) end-to-end / integration suite.
 * Owner: Delivery & QA. Gates the acquire->log->retain->convert loop.
 *
 * Exercises the REAL Express app + Postgres (the same DB the CI `backend` job
 * provisions) over HTTP for the wired email auth endpoints, and drives the
 * Google sign-in service logic directly with a mocked token-verification fetch
 * (the Google /tokeninfo call is the only external dependency).
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/lib/prisma.ts';
import { loginWithGoogle } from '../src/services/auth.service.ts';

const PREFIX = 'qa_e2e_';
let server: Server;
let base: string;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await cleanup();
  await new Promise<void>((r) => server.close(() => r()));
  await prisma.$disconnect();
});

beforeEach(cleanup);

/** Remove only rows this suite creates (test emails carry a fixed prefix). */
async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.habit.deleteMany({ where: { userId: { in: ids } } });
  await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

const email = (s: string) => `${PREFIX}${s}@example.com`;
async function api(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(base + path, { ...init, headers: { ...headers, ...(init?.headers as object) } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** Run `fn` with global fetch stubbed to a fixed Google /tokeninfo payload. */
async function withGoogleToken(payload: unknown, ok: boolean, fn: () => Promise<void>) {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok, json: async () => payload })) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = real;
  }
}

// ---- email signup (HTTP) -----------------------------------------------------
test('register: new account returns 201 + JWT + public user, no secret leak', async () => {
  const { status, body } = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('new'), password: 'sup3r-secret', name: 'Ayoub' }),
  });
  assert.equal(status, 201);
  assert.ok(typeof body.token === 'string' && body.token.length > 20, 'issues a JWT');
  assert.deepEqual(Object.keys(body.user).sort(), ['email', 'id', 'name']);
  assert.equal(body.user.email, email('new'));
  assert.ok(!('passwordHash' in body.user), 'never leaks passwordHash');
});

test('register: signup bootstraps a profile + default habits (activation prerequisite)', async () => {
  const { body } = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('boot'), password: 'sup3r-secret' }),
  });
  const profile = await prisma.profile.findUnique({ where: { userId: body.user.id } });
  const habits = await prisma.habit.count({ where: { userId: body.user.id } });
  assert.ok(profile, 'profile created on signup');
  assert.ok(habits > 0, 'default habits seeded on signup');
});

test('register: duplicate email is rejected with 409', async () => {
  const payload = JSON.stringify({ email: email('dup'), password: 'sup3r-secret' });
  await api('/api/auth/register', { method: 'POST', body: payload });
  const { status, body } = await api('/api/auth/register', { method: 'POST', body: payload });
  assert.equal(status, 409);
  assert.match(body.error, /already registered/i);
});

test('register: email is normalized so case/whitespace cannot create duplicates', async () => {
  const a = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: `${PREFIX}Case@Example.COM`, password: 'sup3r-secret' }),
  });
  assert.equal(a.status, 201);
  const b = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: `${PREFIX}case@example.com`, password: 'sup3r-secret' }),
  });
  assert.equal(b.status, 409, 'normalized email collides');
});

test('register: invalid email and short password fail validation with 400', async () => {
  const bad1 = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email', password: 'sup3r-secret' }),
  });
  assert.equal(bad1.status, 400);
  const bad2 = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('short'), password: 'short' }),
  });
  assert.equal(bad2.status, 400);
});

test('login: correct credentials succeed; wrong password and unknown email return 401', async () => {
  await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('login'), password: 'sup3r-secret' }),
  });
  const ok = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email('login'), password: 'sup3r-secret' }),
  });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);

  const wrong = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email('login'), password: 'WRONG-pass' }),
  });
  assert.equal(wrong.status, 401);

  const unknown = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email('nope'), password: 'sup3r-secret' }),
  });
  assert.equal(unknown.status, 401);
});

test('session: /auth/me works with a valid JWT, 401 without/with a bad one', async () => {
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('me'), password: 'sup3r-secret' }),
  });
  const ok = await api('/api/auth/me', { token: reg.body.token });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.email, email('me'));

  const none = await api('/api/auth/me');
  assert.equal(none.status, 401);

  const bad = await api('/api/auth/me', { token: 'not.a.valid.jwt' });
  assert.equal(bad.status, 401);
});

// ---- Google sign-in (service logic; token verification mocked) ---------------
test('google: new verified user is created with googleId + bootstrapped', async () => {
  await withGoogleToken(
    { aud: 'test-google-client-id', sub: 'g-sub-new', email: email('gnew'), name: 'G New', email_verified: true },
    true,
    async () => {
      const { token, user } = await loginWithGoogle('fake-id-token');
      assert.ok(token);
      assert.equal(user.email, email('gnew'));
      const db = await prisma.user.findUnique({ where: { id: user.id } });
      assert.equal(db?.googleId, 'g-sub-new');
      assert.ok(await prisma.profile.findUnique({ where: { userId: user.id } }), 'profile bootstrapped');
    },
  );
});

test('google: returning user matches by googleId — no duplicate account', async () => {
  const payload = { aud: 'test-google-client-id', sub: 'g-sub-ret', email: email('gret'), name: 'G Ret', email_verified: true };
  await withGoogleToken(payload, true, async () => {
    const first = await loginWithGoogle('t1');
    const second = await loginWithGoogle('t2');
    assert.equal(first.user.id, second.user.id, 'same account on repeat sign-in');
    const count = await prisma.user.count({ where: { googleId: 'g-sub-ret' } });
    assert.equal(count, 1, 'exactly one account for the google subject');
  });
});

test('google: verified email links to an existing email/password account', async () => {
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: email('link'), password: 'sup3r-secret' }),
  });
  await withGoogleToken(
    { aud: 'test-google-client-id', sub: 'g-sub-link', email: email('link'), email_verified: true },
    true,
    async () => {
      const { user } = await loginWithGoogle('t');
      assert.equal(user.id, reg.body.user.id, 'links to the existing account, no duplicate');
      const db = await prisma.user.findUnique({ where: { id: user.id } });
      assert.equal(db?.googleId, 'g-sub-link', 'googleId linked onto the existing user');
    },
  );
});

test('google: unverified email is rejected (anti-account-takeover)', async () => {
  await withGoogleToken(
    { aud: 'test-google-client-id', sub: 'g-sub-unv', email: email('gunv'), email_verified: false },
    true,
    async () => {
      await assert.rejects(loginWithGoogle('t'), /not verified/i);
    },
  );
});

test('google: audience mismatch is rejected', async () => {
  await withGoogleToken(
    { aud: 'attacker-client-id', sub: 'g-sub-aud', email: email('gaud'), email_verified: true },
    true,
    async () => {
      await assert.rejects(loginWithGoogle('t'), /audience mismatch/i);
    },
  );
});

test('google: an invalid/failed token is rejected', async () => {
  await withGoogleToken({ error: 'invalid_token' }, false, async () => {
    await assert.rejects(loginWithGoogle('t'), /Invalid Google token/i);
  });
});

test('google: token missing subject/email is rejected', async () => {
  await withGoogleToken({ aud: 'test-google-client-id', email_verified: true }, true, async () => {
    await assert.rejects(loginWithGoogle('t'), /missing subject\/email/i);
  });
});
