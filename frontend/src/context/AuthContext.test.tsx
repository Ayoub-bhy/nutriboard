import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { api, auth } from '../api/client';
import type { User } from '../api/types';

const u: User = { id: 'u1', email: 'a@b.com', name: 'A' } as User;
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within AuthProvider/);
  });

  it('login stores the token and sets the user', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ token: 'tkn', user: u });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.login('a@b.com', 'secret');
    });
    expect(result.current.user?.email).toBe('a@b.com');
    expect(auth.token).toBe('tkn');
  });

  it('logout clears the user and the stored token', async () => {
    auth.set('existing');
    vi.spyOn(api, 'me').mockResolvedValue(u);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.email).toBe('a@b.com'));
    act(() => {
      result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(auth.token).toBeNull();
  });
});
