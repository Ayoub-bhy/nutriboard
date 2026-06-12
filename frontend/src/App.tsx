import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './api/client';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Coach from './pages/Coach';
import Suggestions from './pages/Suggestions';
import Profile from './pages/Profile';
import Insights from './pages/Insights';
import Admin from './pages/Admin';

type Tab = 'today' | 'coach' | 'meals' | 'profile' | 'insights' | 'admin';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: '📊 Today' },
  { id: 'coach', label: '💬 Coach' },
  { id: 'meals', label: '🍳 Suggested Meals' },
  { id: 'profile', label: '👤 Profile' },
  { id: 'insights', label: '💡 Insights' },
  { id: 'admin', label: '📈 Admin' },
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);

  // Once authenticated, decide whether to show onboarding, and load the streak.
  useEffect(() => {
    if (!user) return;
    api.getProfile().then((p) => setOnboarded(p.onboardingCompleted)).catch(() => setOnboarded(true));
    api.getStreaks().then((s) => setStreak(s.logStreak)).catch(() => undefined);
  }, [user]);

  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Login />;
  if (onboarded === null) return <div className="center-screen">Loading your plan…</div>;
  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">🥗</div>
          <div><h1>NutriBoard</h1><p>Nutrition coach &amp; habit tracker</p></div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {streak > 0 && <span className="pill">🔥 {streak}-day streak</span>}
          <div className="who">{user.name ?? user.email}</div>
          <button className="btn ghost sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => <div key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>{t.label}</div>)}
      </nav>

      {tab === 'today' && <Dashboard />}
      {tab === 'coach' && <Coach />}
      {tab === 'meals' && <Suggestions />}
      {tab === 'profile' && <Profile />}
      {tab === 'insights' && <Insights />}
      {tab === 'admin' && <Admin />}

      <p className="hint" style={{ textAlign: 'center', marginTop: 24 }}>
        Targets use the Mifflin-St Jeor equation — educational estimates, not medical advice.
      </p>
    </div>
  );
}
