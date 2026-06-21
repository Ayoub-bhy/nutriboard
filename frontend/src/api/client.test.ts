import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, auth } from './client';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('auth token store', () => {
  it('set / get / clear via localStorage', () => {
    expect(auth.token).toBeNull();
    auth.set('jwt-123');
    expect(auth.token).toBe('jwt-123');
    expect(localStorage.getItem('nutriboard.token')).toBe('jwt-123');
    auth.clear();
    expect(auth.token).toBeNull();
  });
});

describe('api client req()', () => {
  it('login posts credentials and returns token + user', async () => {
    const fn = mockFetch(200, { token: 't', user: { id: 'u1', email: 'a@b.com', name: null } });
    const out = await api.login('a@b.com', 'secret');
    expect(out.token).toBe('t');
    const [url, opts] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(String(opts.body))).toEqual({ email: 'a@b.com', password: 'secret' });
  });

  it('attaches the Authorization header when a token is stored', async () => {
    auth.set('jwt-xyz');
    const fn = mockFetch(200, { id: 'u1', email: 'a@b.com', name: null });
    await api.me();
    const [, opts] = fn.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer jwt-xyz');
  });

  it('throws the server error message on a non-2xx response', async () => {
    mockFetch(401, { error: 'Invalid credentials' });
    await expect(api.login('a@b.com', 'wrong')).rejects.toThrow(/Invalid credentials/);
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetch(204, {});
    const out = await api.deleteMeal('meal-1');
    expect(out).toBeUndefined();
  });

  it('hits the barcode endpoint with the scanned code', async () => {
    const fn = mockFetch(200, { food: { name: 'Cola' } });
    await api.foodByBarcode('5449000000996');
    expect((fn.mock.calls[0] as [string])[0]).toBe('/api/foods/barcode/5449000000996');
  });
});
