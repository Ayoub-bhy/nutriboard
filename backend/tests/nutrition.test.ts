import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmr, computeTargets, waterBaseMl, GOALS, type Goal } from '../src/utils/nutrition.ts';

test('Mifflin-St Jeor BMR — male', () => {
  assert.equal(bmr({ sex: 'male', age: 30, weightKg: 78, heightCm: 178 }), 1748);
});

test('Mifflin-St Jeor BMR — female', () => {
  assert.equal(bmr({ sex: 'female', age: 28, weightKg: 62, heightCm: 165 }), 1350);
});

const base = { sex: 'male', age: 30, weightKg: 78, heightCm: 178, activity: 1.55 } as const;

test('maintain target equals TDEE', () => {
  const t = computeTargets({ ...base, goal: 'maintain' });
  assert.equal(t.tdee, 2709);
  assert.equal(t.calories, 2709);
});

test('cut applies a 20% deficit', () => {
  const t = computeTargets({ ...base, goal: 'cut' });
  assert.equal(t.calories, Math.round(2709 * 0.8));
});

test('bulk applies a 10% surplus', () => {
  const t = computeTargets({ ...base, goal: 'bulk' });
  assert.equal(t.calories, Math.round(2709 * 1.1));
});

test('macro calories reconcile to the calorie target (within rounding)', () => {
  for (const goal of Object.keys(GOALS) as Goal[]) {
    const t = computeTargets({ ...base, goal });
    const macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    assert.ok(Math.abs(macroKcal - t.calories) <= 5, `${goal}: ${macroKcal} vs ${t.calories}`);
  }
});

test('protein scales with bodyweight per goal', () => {
  assert.equal(computeTargets({ ...base, goal: 'cut' }).proteinG, Math.round(2.0 * 78));
  assert.equal(computeTargets({ ...base, goal: 'recomp' }).proteinG, Math.round(2.2 * 78));
});

test('carbs never go negative on an aggressive cut for a light person', () => {
  const t = computeTargets({ sex: 'female', age: 40, weightKg: 95, heightCm: 160, activity: 1.2, goal: 'cut' });
  assert.ok(t.carbsG >= 0);
});

test('waterBaseMl uses ~35 ml/kg and adds 350 on training days', () => {
  assert.equal(waterBaseMl(78), 2730);
  assert.equal(waterBaseMl(78, true), 3080);
});

test('every goal has a valid config', () => {
  for (const g of Object.keys(GOALS) as Goal[]) {
    assert.ok(GOALS[g].label.length > 0);
    assert.ok(GOALS[g].proteinPerKg > 0);
  }
});
