import { describe, it, expect } from 'vitest';
import { bmr, computeTargets, waterBaseMl, GOALS } from '../src/utils/nutrition.js';

describe('Mifflin-St Jeor BMR', () => {
  it('computes male BMR correctly', () => {
    expect(bmr({ sex: 'male', age: 30, weightKg: 78, heightCm: 178 })).toBe(1748);
  });
  it('computes female BMR correctly', () => {
    expect(bmr({ sex: 'female', age: 28, weightKg: 62, heightCm: 165 })).toBe(1350);
  });
});

describe('computeTargets', () => {
  const base = { sex: 'male', age: 30, weightKg: 78, heightCm: 178, activity: 1.55 } as const;

  it('maintain target equals TDEE', () => {
    const t = computeTargets({ ...base, goal: 'maintain' });
    expect(t.tdee).toBe(2709);
    expect(t.calories).toBe(2709);
  });

  it('cut applies a 20% deficit', () => {
    const t = computeTargets({ ...base, goal: 'cut' });
    expect(t.calories).toBe(Math.round(2709 * 0.8));
  });

  it('macro calories reconcile to the calorie target (within rounding)', () => {
    for (const goal of Object.keys(GOALS) as (keyof typeof GOALS)[]) {
      const t = computeTargets({ ...base, goal });
      const macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
      expect(Math.abs(macroKcal - t.calories)).toBeLessThanOrEqual(5);
    }
  });

  it('protein scales with bodyweight per goal', () => {
    const t = computeTargets({ ...base, goal: 'cut' });
    expect(t.proteinG).toBe(Math.round(2.0 * 78));
  });
});

describe('waterBaseMl', () => {
  it('uses ~35 ml/kg', () => expect(waterBaseMl(78)).toBe(2730));
  it('adds 350 ml on training days', () => expect(waterBaseMl(78, true)).toBe(3080));
});
