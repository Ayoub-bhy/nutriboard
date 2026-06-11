import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Profile, Meal, Water, Weight, Habit, HabitLog, Goal, MealType } from '../api/types';

const GOAL_META: Record<Goal, { ic: string; t: string; s: string }> = {
  cut: { ic: '📉', t: 'Fat Loss', s: '−20%' },
  recomp: { ic: '🔄', t: 'Recomp', s: '−10%' },
  maintain: { ic: '⚖️', t: 'Maintain', s: 'TDEE' },
  bulk: { ic: '📈', t: 'Muscle Gain', s: '+10%' },
};
const today = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [date] = useState(today());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [water, setWater] = useState<Water | null>(null);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [form, setForm] = useState({ name: '', type: 'Breakfast' as MealType, calories: '', protein: '', carbs: '', fat: '' });
  const [wInput, setWInput] = useState('');

  const load = useCallback(async () => {
    const [p, m, w, wl, h] = await Promise.all([
      api.getProfile(), api.listMeals(date), api.getWater(date), api.listWeights(), api.listHabits(date),
    ]);
    setProfile(p); setMeals(m); setWater(w); setWeights(wl); setHabits(h.habits); setLogs(h.logs);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  if (!profile || !water) return <div className="card">Loading…</div>;

  const t = profile.targets;
  const totals = meals.reduce((a, m) => ({ cal: a.cal + m.calories, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat }), { cal: 0, p: 0, c: 0, f: 0 });
  const rem = t.calories - totals.cal;
  const frac = Math.min(1, totals.cal / t.calories || 0);

  const setGoal = async (goal: Goal) => { setProfile(await api.updateProfile({ goal })); };
  const addMeal = async () => {
    if (!form.name.trim()) return;
    await api.addMeal({ date, name: form.name, type: form.type, calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0 });
    setForm({ name: '', type: form.type, calories: '', protein: '', carbs: '', fat: '' });
    setMeals(await api.listMeals(date));
  };
  const delMeal = async (id: string) => { await api.deleteMeal(id); setMeals(await api.listMeals(date)); };
  const addGlass = async () => setWater(await api.setWater(date, water.amountMl + 250));
  const subGlass = async () => setWater(await api.setWater(date, Math.max(0, water.amountMl - 250)));
  const logWeight = async () => { if (!+wInput) return; await api.logWeight(date, +wInput); setWInput(''); setWeights(await api.listWeights()); setProfile(await api.getProfile()); };
  const toggleHabit = async (id: string) => {
    const done = !logs.find((l) => l.habitId === id)?.done;
    await api.setHabitLog(id, date, done);
    setLogs((await api.listHabits(date)).logs);
  };

  const glasses = Math.ceil(water.targetMl / 250);
  const filled = Math.round(water.amountMl / 250);
  const latest = weights.at(-1);

  return (
    <div className="grid">
      <section className="card col-5">
        <h2>🎯 Goal</h2>
        <div className="goals">
          {(Object.keys(GOAL_META) as Goal[]).map((k) => (
            <div key={k} className={'goal' + (profile.goal === k ? ' on' : '')} onClick={() => setGoal(k)}>
              <div className="ic">{GOAL_META[k].ic}</div><div className="t">{GOAL_META[k].t}</div><div className="s">{GOAL_META[k].s}</div>
            </div>
          ))}
        </div>
        <div className="kpi" style={{ marginTop: 16 }}>
          <div className="k"><div className="n">{t.bmr}</div><div className="l">BMR</div></div>
          <div className="k"><div className="n">{t.tdee}</div><div className="l">TDEE</div></div>
          <div className="k"><div className="n">{t.calories}</div><div className="l">Target kcal</div></div>
        </div>
      </section>

      <section className="card col-7">
        <h2>🔥 Energy &amp; Macros</h2>
        <div className="ringwrap">
          <div className="ring">
            <svg width="160" height="160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--panel-2)" strokeWidth="13" />
              <circle cx="80" cy="80" r="68" fill="none" stroke="#3ddc97" strokeWidth="13" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - frac)} />
            </svg>
            <div className="center"><div className="big">{Math.round(totals.cal)}</div><div className="lbl">of {t.calories} kcal</div>
              <div className="rem" style={{ color: rem >= 0 ? 'var(--accent)' : 'var(--bad)' }}>{rem >= 0 ? `${rem} left` : `${Math.abs(rem)} over`}</div></div>
          </div>
          <div className="stats">
            <MacroBar label="Protein" now={totals.p} goal={t.proteinG} cls="b-pro" />
            <MacroBar label="Carbs" now={totals.c} goal={t.carbsG} cls="b-carb" />
            <MacroBar label="Fat" now={totals.f} goal={t.fatG} cls="b-fat" />
            <div className="summary-row"><span className="pill">🍽️ Meals: <b>{meals.length}</b></span></div>
          </div>
        </div>
      </section>

      <section className="card col-8">
        <h2>🍽️ Meal Log</h2>
        <div className="row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', alignItems: 'end', marginBottom: 14 }}>
          <div><label>Food</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken & rice" /></div>
          <div><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MealType })}>{['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><label>kcal</label><input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></div>
          <div><label>P</label><input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} /></div>
          <div><label>C</label><input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}><input type="number" placeholder="F" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} style={{ width: 58 }} /><button className="btn" onClick={addMeal}>+</button></div>
        </div>
        <table>
          <thead><tr><th>Meal</th><th>Type</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>Logged</th><th></th></tr></thead>
          <tbody>
            {meals.length === 0 && <tr><td colSpan={8} className="empty">No meals logged yet.</td></tr>}
            {meals.map((m) => (
              <tr key={m.id}><td>{m.name}</td><td><span className="tag">{m.type}</span></td><td>{m.calories}</td><td>{m.protein}</td><td>{m.carbs}</td><td>{m.fat}</td>
                <td className="hint" style={{ margin: 0 }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td><button className="del" onClick={() => delMeal(m.id)}>✕</button></td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={2}>Total</td><td>{Math.round(totals.cal)}</td><td>{totals.p}</td><td>{totals.c}</td><td>{totals.f}</td><td colSpan={2}></td></tr></tfoot>
        </table>
      </section>

      <section className="card col-4">
        <h2>💧 Hydration {water.streak > 0 && <span className="pill">🔥 {water.streak}d</span>}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div><span style={{ fontSize: 28, fontWeight: 800 }}>{water.amountMl}</span> ml</div>
          <div className="hint" style={{ margin: 0 }}>Goal: <b>{water.targetMl}</b> ml</div>
        </div>
        <div className="bar"><i style={{ width: `${Math.min(100, water.amountMl / water.targetMl * 100)}%`, background: 'linear-gradient(90deg,#4aa8ff,#2a6cff)' }} /></div>
        <div className="glasses">{Array.from({ length: glasses }).map((_, i) => <div key={i} className={'glass' + (i < filled ? ' full' : '')} onClick={() => api.setWater(date, (i < filled ? i : i + 1) * 250).then(setWater)} />)}</div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn sm" onClick={addGlass}>+1 glass</button><button className="btn ghost sm" onClick={subGlass}>−1</button></div>
        <div className="motiv">{water.amountMl >= water.targetMl ? '✅ Goal hit! Stay consistent and I’ll raise the target.' : `💧 ${Math.round(water.amountMl / water.targetMl * 100)}% there — keep sipping.`}</div>
      </section>

      <section className="card col-5">
        <h2>✅ Daily Habits</h2>
        {habits.length === 0 && <p className="empty">No habits yet.</p>}
        {habits.map((hb) => {
          const done = !!logs.find((l) => l.habitId === hb.id)?.done;
          return <div key={hb.id} className={'habit' + (done ? ' done' : '')}><div className={'chk' + (done ? ' on' : '')} onClick={() => toggleHabit(hb.id)}>✓</div><div className="nm" onClick={() => toggleHabit(hb.id)}>{hb.name}</div></div>;
        })}
      </section>

      <section className="card col-7">
        <h2>📈 Body Weight Trend</h2>
        <div className="row" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', marginBottom: 12 }}>
          <div><label>Log today's weight (kg)</label><input type="number" step="0.1" value={wInput} onChange={(e) => setWInput(e.target.value)} placeholder="e.g. 78.4" /></div>
          <button className="btn" onClick={logWeight}>Log</button>
        </div>
        <WeightChart weights={weights} />
        <div className="summary-row"><span className="pill">Latest: <b>{latest ? `${latest.weightKg} kg` : '—'}</b></span><span className="pill">Entries: <b>{weights.length}</b></span></div>
      </section>
    </div>
  );
}

function MacroBar({ label, now, goal, cls }: { label: string; now: number; goal: number; cls: string }) {
  return (
    <div className="macro">
      <div className="head"><b>{label}</b><span>{Math.round(now)} / {goal} g</span></div>
      <div className={`bar ${cls}`}><i style={{ width: `${Math.min(100, now / goal * 100 || 0)}%` }} /></div>
    </div>
  );
}

function WeightChart({ weights }: { weights: Weight[] }) {
  if (weights.length < 2) return <div className="empty">Log at least two days to see your trend.</div>;
  const vals = weights.map((w) => w.weightKg);
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const W = 560, H = 160, pad = 24;
  const x = (i: number) => pad + (i / (weights.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const d = weights.map((w, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(w.weightKg)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
      <path d={d} fill="none" stroke="#3ddc97" strokeWidth="2.5" />
      {weights.map((w, i) => <circle key={w.id} cx={x(i)} cy={y(w.weightKg)} r="3.5" fill="#4aa8ff" />)}
    </svg>
  );
}
