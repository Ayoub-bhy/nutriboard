import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, auth } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) { setLoading(false); return; }
    api.me().then(setUser).catch(() => auth.clear()).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    auth.set(token); setUser(user);
  };
  const register = async (email: string, password: string, name?: string) => {
    const { token, user } = await api.register(email, password, name);
    auth.set(token); setUser(user);
  };
  const loginWithGoogle = async (idToken: string) => {
    const { token, user } = await api.loginWithGoogle(idToken);
    auth.set(token); setUser(user);
  };
  const logout = () => { auth.clear(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
