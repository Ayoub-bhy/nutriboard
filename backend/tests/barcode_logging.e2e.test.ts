/**
 * Barcode logging end-to-end suite (#1 retention path).
 * Owner: Delivery & QA. Covers the scan -> lookup -> log -> retain flow.
 *
 * Drives the REAL Express app + Postgres over HTTP. The only external dep is the
 * Open Food Facts lookup (a global fetch), which is stubbed per-case. Auth is via
 * a directly-minted JWT (no register), so this suite is independent of the signup
 * path and stays green on a clean main.
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/lib/prisma.ts';
import { signToken } from '../src/middleware/auth.ts';

const PREFIX = 'qa_bc_';
let server: Server;
let base: string;
let lastFetchUrl = '';

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

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.meal.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

/** Mint an authenticated test user directly (no register -> no signup-path coupling). */
async function makeUser() {
  const user = await prisma.user.create({ data: { email: `${PREFIX}${Date.now()}_${Math.random().toString(36).slice(2)}@example.com` } });
  return { id: user.id, token: signToken({ userId: user.id, email: user.email }) };
}

async function api(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(base + path, { ...init, headers: { ...headers, ...(init?.headers as object) } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** Stub the Open Food Facts fetch; records the requested URL for assertions. */
async function withOFF(payload: unknown, ok: boolean, fn: () => Promise<void>) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, opts?: RequestInit) => {
    const u = String(url);
    if (u.includes('openfoodfacts.org')) {
      lastFetchUrl = u;
      return { ok, status: ok ? 200 : 500, json: async () => payload };
    }
    return real(url as any, opts); // pass through (the test's own HTTP calls to the in-process server)
  }) as unknown as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = real;
  }
}

const offProduct = (over: Record<string, unknown> = {}, kcal = 42) => ({
  status: 1,
  product: {
    product_name: 'Test Cola',
    brands: 'TestBrand',
    code: '5449000000996',
    serving_size: '330 ml',
    nutriments: { 'energy-kcal_100g': kcal, proteins_100g: 0, carbohydrates_100g: 11, fat_100g: 0 },
    ...over,
  },
});

// 1. scan HIT
test('barcode lookup: known product returns normalized food + macros', async () => {
  const { token } = await makeUser();
  await withOFF(offProduct(), true, async () => {
    const { status, body } = await api('/api/foods/barcode/5449000000996', { token });
    assert.equal(status, 200);
    assert.ok(body.food.name);
    assert.equal(body.food.barcode, '5449000000996');
    assert.equal(body.food.calories, 42);
    assert.equal(typeof body.food.protein, 'number');
    assert.equal(body.food.densityClass, 'green'); // 42 <= 120
  });
});

// 2. scan MISS / fallback
test('barcode lookup: unknown product returns 404 (fallback to manual)', async () => {
  const { token } = await makeUser();
  await withOFF({ status: 0 }, true, async () => {
    const { status, body } = await api('/api/foods/barcode/0000000000000', { token });
    assert.equal(status, 404);
    assert.match(body.error, /not found/i);
  });
});

// 3. input sanitization (scanner noise -> digits only)
test('barcode lookup: non-digit characters are stripped before lookup', async () => {
  const { token } = await makeUser();
  await withOFF(offProduct(), true, async () => {
    await api('/api/foods/barcode/abc-549x4900', { token });
    assert.match(lastFetchUrl, /\/product\/5494900\.json/);
  });
});

// 4. auth required
test('barcode lookup requires authentication', async () => {
  const { status } = await api('/api/foods/barcode/5449000000996');
  assert.equal(status, 401);
});

// 5. END-TO-END: scan -> log -> retain (the #1 retention path)
test('scan -> log -> retain: looked-up food is logged and shows up in the day log', async () => {
  const { token } = await makeUser();
  let food: any;
  await withOFF(offProduct({}, 250), true, async () => {
    const r = await api('/api/foods/barcode/5449000000996', { token });
    food = r.body.food;
  });
  const date = '2026-06-16';
  const add = await api('/api/meals', {
    method: 'POST',
    token,
    body: JSON.stringify({ date, name: food.name, type: 'Snack', calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat }),
  });
  assert.equal(add.status, 201);
  const list = await api(`/api/meals?date=${date}`, { token });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body));
  const logged = list.body.find((m: any) => m.name === food.name);
  assert.ok(logged, 'scanned food appears in the day log');
  assert.equal(logged.calories, food.calories);
});

// 6. energy-density traffic light
test('barcode lookup: density class maps green / yellow / red by kcal/100g', async () => {
  const { token } = await makeUser();
  for (const [kcal, cls] of [[90, 'green'], [200, 'yellow'], [400, 'red']] as const) {
    await withOFF(offProduct({}, kcal), true, async () => {
      const { body } = await api('/api/foods/barcode/5449000000996', { token });
      assert.equal(body.food.densityClass, cls, `${kcal} kcal -> ${cls}`);
    });
  }
});

// 7. food text search (manual fallback when no barcode)
test('food search: rejects too-short queries and returns normalized results', async () => {
  const { token } = await makeUser();
  const short = await api('/api/foods/search?q=a', { token });
  assert.equal(short.status, 400);
  await withOFF({ products: [offProduct().product] }, true, async () => {
    const { status, body } = await api('/api/foods/search?q=cola', { token });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.foods) && body.foods.length > 0);
    assert.ok(body.foods[0].name);
  });
});
