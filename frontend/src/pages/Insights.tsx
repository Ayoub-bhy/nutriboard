const TIPS: [string, string][] = [
  ['Log in the moment', 'Logging food as you eat it — not at night from memory — is the biggest predictor of accuracy. Memory under-counts by 20–40%.'],
  ['Weigh under the same conditions', 'First thing in the morning, after the bathroom, before eating. Judge the weekly average, not single days — daily swings are water.'],
  ['Protein first, every meal', 'Anchor each meal with 25–40g protein. It is the most satiating macro and protects muscle in a deficit.'],
  ['Use a food scale for two weeks', 'Weigh staples (rice, oil, nut butter, meat) to recalibrate your eye, then estimate confidently.'],
  ['Plan tomorrow tonight', 'Pre-logging your day turns tracking from reactive guilt into a simple checklist.'],
  ['Consistency beats perfection', 'Hitting targets 80% of days for months beats a perfect week then burnout.'],
];
const IDEAS: [string, string, string][] = [
  ['🎯', 'Protein-per-meal distribution', 'Spread protein evenly across meals (~0.4g/kg each) for better muscle protein synthesis.'],
  ['🌙', 'Fasting / eating-window timer', 'Track the gap between dinner and breakfast; a 12–14h overnight fast aids appetite control.'],
  ['🥦', 'Fiber & veg-servings target', 'Add a 25–35g fiber goal and 5-veg habit — the strongest predictor of fullness and health.'],
  ['🔁', 'Adaptive targets', 'Recalculate TDEE every 3–4 weeks from your real weight trend vs. intake, not just the formula.'],
  ['🧊', 'Refeed / diet-break logic', 'After 8–12 weeks of deficit, a planned maintenance week restores hormones and adherence.'],
  ['😴', 'Sleep-aware coaching', 'Under 6h sleep spikes hunger hormones; the coach can ease targets on low-sleep days.'],
];

export default function Insights() {
  return (
    <div className="grid">
      <section className="card col-7">
        <h2>📚 Best Practices — How to Track Well</h2>
        {TIPS.map(([t, d]) => <div key={t} className="tip"><b>{t}.</b> {d}</div>)}
      </section>
      <section className="card col-5">
        <h2>🧠 Genius Coach Ideas</h2>
        {IDEAS.map(([ic, t, d]) => (
          <div key={t} className="habit" style={{ alignItems: 'flex-start' }}>
            <div style={{ fontSize: 22 }}>{ic}</div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div className="hint" style={{ margin: '3px 0 0' }}>{d}</div></div>
          </div>
        ))}
      </section>
    </div>
  );
}
