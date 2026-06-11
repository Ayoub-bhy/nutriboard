import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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
