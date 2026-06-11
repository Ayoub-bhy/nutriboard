/**
 * Core nutrition math — Mifflin-St Jeor BMR, TDEE, and goal-based macro targets.
 * Pure functions, fully unit-tested (see tests/nutrition.test.ts).
 */
export type Sex = 'male' | 'female';
export type Goal = 'cut' | 'recomp' | 'maintain' | 'bulk';

export interface GoalConfig {
  label: string;
  adj: number;        // calorie adjustment vs TDEE
  proteinPerKg: number;
  fatPerKg: number;
  description: string;
}

export const GOALS: Record<Goal, GoalConfig> = {
  cut:      { label: 'Fat Loss',    adj: -0.20, proteinPerKg: 2.0, fatPerKg: 0.8, description: 'Calorie deficit with high protein to preserve muscle while losing fat.' },
  recomp:   { label: 'Recomp',      adj: -0.10, proteinPerKg: 2.2, fatPerKg: 0.9, description: 'Near-maintenance with very high protein to build muscle and lose fat at once.' },
  maintain: { label: 'Maintain',    adj:  0.00, proteinPerKg: 1.6, fatPerKg: 1.0, description: 'Eat at maintenance for stable weight, energy and general health.' },
  bulk:     { label: 'Muscle Gain', adj:  0.10, proteinPerKg: 1.8, fatPerKg: 1.0, description: 'Modest surplus to build muscle while limiting fat gain.' },
};

export const ACTIVITY_MULTIPLIERS = [1.2, 1.375, 1.55, 1.725, 1.9] as const;

export interface ProfileInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: number;
  goal: Goal;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(p: Pick<ProfileInput, 'sex' | 'age' | 'weightKg' | 'heightCm'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === 'male' ? 5 : -161));
}

export function computeTargets(p: ProfileInput): Targets {
  const b = bmr(p);
  const tdee = Math.round(b * p.activity);
  const g = GOALS[p.goal];
  const calories = Math.round(tdee * (1 + g.adj));
  const proteinG = Math.round(g.proteinPerKg * p.weightKg);
  const fatG = Math.round(g.fatPerKg * p.weightKg);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { bmr: b, tdee, calories, proteinG, carbsG, fatG };
}

/** Adaptive hydration goal: ~35 ml/kg, +350 ml on training days. */
export function waterBaseMl(weightKg: number, isTrainingDay = false): number {
  return Math.round(weightKg * 35) + (isTrainingDay ? 350 : 0);
}
