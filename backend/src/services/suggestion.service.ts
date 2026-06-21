import { computeTargets, type Goal, type Sex } from '../utils/nutrition.js';
import { dayTotals } from './meal.service.js';
import { prisma } from '../lib/prisma.js';
import { FOODS, type Food } from '../utils/foods.js';

export async function suggestMeals(userId: string, date: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Profile not found');
  const t = computeTargets({
    sex: profile.sex as Sex, age: profile.age, weightKg: profile.weightKg,
    heightCm: profile.heightCm, activity: profile.activity, goal: profile.goal as Goal,
  });
  const totals = await dayTotals(userId, date);
  const remCal = Math.max(0, t.calories - totals.calories);
  const remPro = Math.max(0, t.proteinG - totals.protein);

  const diet = profile.dietType;
  const avoid = `${profile.allergies},${profile.dislikes}`.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

  let pool = FOODS.filter((food) => {
    if (diet !== 'omnivore' && !food.tags.includes(diet)) return false;
    if (avoid.some((a) => a && food.n.toLowerCase().includes(a))) return false;
    return true;
  });
  pool = pool.sort((a, b) => b.p / b.cal - a.p / a.cal);

  const want = remCal > 900 ? ['Breakfast', 'Lunch', 'Dinner', 'Snack'] : remCal > 500 ? ['Lunch', 'Dinner', 'Snack'] : ['Snack', 'Lunch'];
  const out: Food[] = [];
  const used = new Set<string>();
  for (const type of want) {
    const m = pool.find((f) => f.type === type && !used.has(f.n) && f.cal <= remCal + 200);
    if (m) { out.push(m); used.add(m.n); }
  }
  for (const f of pool) { if (out.length >= 4) break; if (!used.has(f.n)) { out.push(f); used.add(f.n); } }

  return { remCal, remPro, diet, suggestions: out.slice(0, 4) };
}
