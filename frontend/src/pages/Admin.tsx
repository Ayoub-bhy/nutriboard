import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { WeeklyDay } from '../api/types';

/**
 * Lightweight admin/insights panel. Platform-wide admin metrics (DAU/WAU/MAU,
 * signups-by-day) require a dedicated, access-controlled backend endpoint
 * (/admin/stats) that is not wired yet — that work is owned by ENG/SEC and
 * gated by SEC sign-off. Until then this shows the signed-in user's own
 * 7-day logging activity from existing endpoints.
 */
export default function Admin() {
  const [days, setDays] = useState<WeeklyDay[]>([]);
  const [streak, setStreak] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getWeekly().then((w) => setDays(w.days)).catch((e) => setErr((e as Error).message));
    api.getStreaks().then((s) => setStreak(s.logStreak)).catch(() => undefined);
  }, []);

  const loggedDays = days.filter((d) => d.logged).length;

  return (
    <div className="card">
      <h2>📈 Activity</h2>
      <p className="hint" style={{ marginTop: 4 }}>
        Personal activity overview. Org-wide admin analytics need the access-controlled
        <code> /admin/stats </code> endpoint (pending ENG + SEC sign-off).
      </p>

      {err && <div className="err">{err}</div>}

      <div style={{ display: 'flex', gap: 16, margin: '14px 0' }}>
        <div className="pill">🔥 {streak}-day streak</div>
        <div className="pill">✅ {loggedDays}/{days.length || 7} days logged</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th align="left">Date</th><th align="right">kcal</th><th align="right">Protein</th><th align="right">Water</th><th align="right">Logged</th></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td align="right">{d.calories}</td>
              <td align="right">{d.protein}g</td>
              <td align="right">{d.water}ml</td>
              <td align="right">{d.logged ? '✓' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
