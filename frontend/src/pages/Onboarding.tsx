import { useState } from 'react';
import { api } from '../api/client';
import type { Goal, Sex, OnboardingInput } from '../api/types';

const ACTIVITY: { label: string; value: number }[] = [
  { label: 'Sedentary (little/no exercise)', value: 1.2 },
  { label: 'Light (1–3 days/week)', value: 1.375 },
  { label: 'Moderate (3–5 days/week)', value: 1.55 },
  { label: 'Active (6–7 days/week)', value: 1.725 },
  { label: 'Very active (physical job/2x training)', value: 1.9 },
];
const GOALS: { label: string; value: Goal }[] = [
  { label: 'Lose fat (cut)', value: 'cut' },
  { label: 'Recomposition', value: 'recomp' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Build muscle (bulk)', value: 'bulk' },
];
const DIETS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'halal', 'mediterranean'];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState(30);
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState<Goal>('maintain');
  const [dietType, setDietType] = useState('omnivore');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const input: OnboardingInput = { sex, age, weightKg, heightCm, activity, goal, dietType };
    try {
      await api.completeOnboarding(input);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="logo">🥗</div>
          <div><h1>Welcome to NutriBoard</h1><p>Let’s set your targets</p></div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Sex</label>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Age</label>
            <input type="number" min={13} max={100} value={age} onChange={(e) => setAge(Number(e.target.value))} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Weight (kg)</label>
            <input type="number" min={30} max={300} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Height (cm)</label>
            <input type="number" min={120} max={230} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} required />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Activity level</label>
          <select value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
            {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Goal</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Diet</label>
          <select value={dietType} onChange={(e) => setDietType(e.target.value)}>
            {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <button className="btn" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Saving…' : 'Create my plan'}
        </button>
        {err && <div className="err">{err}</div>}
        <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
          Targets use the Mifflin–St Jeor equation — educational estimates, not medical advice.
        </p>
      </form>
    </div>
  );
}
