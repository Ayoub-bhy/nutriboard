import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SuggestionResult } from '../api/types';

const today = () => new Date().toISOString().slice(0, 10);

export default function Suggestions() {
  const [date] = useState(today());
  const [data, setData] = useState<SuggestionResult | null>(null);

  const load = async () => setData(await api.getSuggestions(date));
  useEffect(() => { load(); }, []);

  const add = async (s: SuggestionResult['suggestions'][number]) => {
    await api.addMeal({ date, name: s.n, type: s.type, calories: s.cal, protein: s.p, carbs: s.c, fat: s.f });
    await load();
  };

  if (!data) return <div className="card">Loading…</div>;

  return (
    <div className="grid">
      <section className="card col-12">
        <h2>🍳 Today's Suggested Meals</h2>
        <p className="hint" style={{ marginTop: 0 }}>Built from your goal, remaining daily budget, and your diet preferences. Macros per 100 g from ANSES-CIQUAL. We show the <b>raw weight to buy/prepare</b> 🛒 and the <b>cooked</b> macros target. Tap “Add” to log it.</p>
        <div className="summary-row" style={{ margin: '14px 0' }}>
          <button className="btn ghost sm" onClick={load}>↻ Refresh</button>
          <span className="pill">Remaining: <b>{data.remCal}</b> kcal</span>
          <span className="pill">Protein left: <b>{data.remPro}</b> g</span>
          <span className="pill">Diet: <b>{data.diet}</b></span>
        </div>
        <div className="sug">
          {data.suggestions.length === 0 && <p className="empty">No suggestions fit your filters — try relaxing diet/allergy settings.</p>}
          {data.suggestions.map((s) => (
            <div key={s.n} className="sugcard">
              <div className="nm">{s.n}</div>
              <div className="meta">{s.type} • {s.cal} kcal</div>
              <div style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, margin: '2px 0 8px', lineHeight: 1.45 }} title={`Buy/prepare these raw amounts. Cooked: ${s.comp}. Macros are for the cooked meal.`}>🛒 {s.fresh} <span style={{ cursor: 'help', color: 'var(--muted)' }}>ⓘ</span></div>
              <div className="mac"><span>P {s.p}g</span><span>C {s.c}g</span><span>F {s.f}g</span><span title={`Cooked: ${s.comp}`}>cooked target</span></div>
              <button className="btn sm" onClick={() => add(s)}>+ Add to today's log</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
