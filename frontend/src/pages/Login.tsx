import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  '1088958164885-4fvjjctb0mhtk3i9v192vb109s5tckfe.apps.googleusercontent.com';

// Minimal typing for the Google Identity Services global.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const gbtn = useRef<HTMLDivElement>(null);

  // Render the Google Identity Services button once the script has loaded.
  useEffect(() => {
    let tries = 0;
    const tick = () => {
      if (window.google?.accounts?.id && gbtn.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            setErr(''); setBusy(true);
            try { await loginWithGoogle(resp.credential); }
            catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
          },
        });
        window.google.accounts.id.renderButton(gbtn.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320 });
        return;
      }
      if (tries++ < 40) setTimeout(tick, 150);
    };
    tick();
  }, [loginWithGoogle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="logo">🥗</div>
          <div><h1>NutriBoard</h1><p>{mode === 'login' ? 'Welcome back' : 'Create your account'}</p></div>
        </div>

        <div ref={gbtn} style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12, fontWeight: 700, margin: '4px 0 14px' }}>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} /> or <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters" />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        {err && <div className="err">{err}</div>}
        <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
          {mode === 'login' ? "No account? " : 'Already registered? '}
          <a onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} style={{ cursor: 'pointer' }}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </a>
        </p>
      </form>
    </div>
  );
}
