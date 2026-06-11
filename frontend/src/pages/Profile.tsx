import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Profile as ProfileT, Change, Sex } from '../api/types';

export default function Profile() {
  const [p, setP] = useState<ProfileT | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [saved, setSaved] = useState('');

  const load = async () => { setP(await api.getProfile()); setChanges(await api.listChanges()); };
  useEffect(() => { load(); }, []);
  if (!p) return <div className="card">Loading…</div>;

  const set = (patch: Partial<ProfileT>) => setP({ ...p, ...patch } as ProfileT);
  const save = async (fields: (keyof ProfileT)[], label: string) => {
    const patch: Partial<ProfileT> = {};
    fields.forEach((f) => { (patch as Record<string, unknown>)[f] = p[f]; });
    setP(await api.updateProfile(patch));
    setChanges(await api.listChanges());
    setSaved(label); setTimeout(() => setSaved(''), 1800);
  };

  return (
    <div className="grid">
      <section className="card col-6">
        <h2>👤 My Details {saved === 'details' && <span className="pill">Saved ✓</span>}</h2>
        <div className="row c2">
          <div><label>Sex</label><select value={p.sex} onChange={(e) => set({ sex: e.target.value as Sex })}><option value="male">Male</option><option value="female">Female</option></select></div>
          <div><label>Age</label><input type="number" value={p.age} onChange={(e) => set({ age: +e.target.value })} /></div>
        </div>
        <div className="row c2" style={{ marginTop: 12 }}>
          <div><label>Weight (kg)</label><input type="number" step="0.1" value={p.weightKg} onChange={(e) => set({ weightKg: +e.target.value })} /></div>
          <div><label>Height (cm)</label><input type="number" value={p.heightCm} onChange={(e) => set({ heightCm: +e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 12 }}><label>Activity</label>
          <select value={p.activity} onChange={(e) => set({ activity: +e.target.value })}>
            <option value={1.2}>Sedentary</option><option value={1.375}>Light (1–3 days)</option><option value={1.55}>Moderate (3–5 days)</option><option value={1.725}>Very active (6–7 days)</option><option value={1.9}>Athlete</option>
          </select>
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => save(['sex', 'age', 'weightKg', 'heightCm', 'activity'], 'details')}>Save details</button>
      </section>

      <section className="card col-6">
        <h2>🍱 Diet Preferences {saved === 'prefs' && <span className="pill">Saved ✓</span>}</h2>
        <div><label>Diet type</label>
          <select value={p.dietType} onChange={(e) => set({ dietType: e.target.value })}>
            {['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'keto', 'mediterranean'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 12 }}><label>Allergies / avoid</label><input value={p.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="e.g. nuts, shellfish" /></div>
        <div style={{ marginTop: 12 }}><label>Dislikes</label><input value={p.dislikes} onChange={(e) => set({ dislikes: e.target.value })} placeholder="e.g. mushrooms" /></div>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => save(['dietType', 'allergies', 'dislikes'], 'prefs')}>Save preferences</button>
      </section>

      <section className="card col-6">
        <h2>⏰ Daily Routine {saved === 'routine' && <span className="pill">Saved ✓</span>}</h2>
        <div className="row c2">
          <div><label>Wake</label><input type="time" value={p.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} /></div>
          <div><label>Sleep</label><input type="time" value={p.sleepTime} onChange={(e) => set({ sleepTime: e.target.value })} /></div>
        </div>
        <div className="row c3" style={{ marginTop: 12 }}>
          <div><label>Breakfast</label><input type="time" value={p.breakfastTime} onChange={(e) => set({ breakfastTime: e.target.value })} /></div>
          <div><label>Lunch</label><input type="time" value={p.lunchTime} onChange={(e) => set({ lunchTime: e.target.value })} /></div>
          <div><label>Dinner</label><input type="time" value={p.dinnerTime} onChange={(e) => set({ dinnerTime: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 12 }}><label>Training days</label><input value={p.trainingDays} onChange={(e) => set({ trainingDays: e.target.value })} placeholder="Mon, Wed, Fri" /></div>
        <div style={{ marginTop: 12 }}><label>Notes for your coach</label><textarea rows={2} value={p.routineNotes} onChange={(e) => set({ routineNotes: e.target.value })} /></div>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => save(['wakeTime', 'sleepTime', 'breakfastTime', 'lunchTime', 'dinnerTime', 'trainingDays', 'routineNotes'], 'routine')}>Save routine</button>
      </section>

      <section className="card col-6">
        <h2>🕓 Change History</h2>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {changes.length === 0 && <p className="empty">No changes yet. Edits are timestamped here.</p>}
          {changes.map((c) => (
            <div key={c.id} className="histrow">
              <div><b>{c.field}</b> <span className="hint" style={{ margin: 0 }}>{c.fromValue} → {c.toValue}</span></div>
              <div className="when">{new Date(c.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
