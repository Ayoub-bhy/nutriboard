import { computeTargets, type Goal, type Sex } from '../utils/nutrition.js';
import { dayTotals } from './meal.service.js';
import { prisma } from '../lib/prisma.js';

interface Food { n: string; cal: number; p: number; c: number; f: number; type: string; tags: string[]; }

const FOODS: Food[] = [
  { n: 'Greek yogurt + berries + honey', cal: 240, p: 22, c: 28, f: 4, type: 'Breakfast', tags: ['vegetarian', 'mediterranean'] },
  { n: '3-egg veggie omelette', cal: 320, p: 24, c: 6, f: 22, type: 'Breakfast', tags: ['vegetarian', 'keto', 'halal'] },
  { n: 'Oats, whey & banana', cal: 380, p: 30, c: 50, f: 8, type: 'Breakfast', tags: ['vegetarian'] },
  { n: 'Tofu scramble + avocado toast', cal: 400, p: 22, c: 38, f: 18, type: 'Breakfast', tags: ['vegan', 'vegetarian'] },
  { n: 'Grilled chicken, rice & broccoli', cal: 520, p: 45, c: 55, f: 12, type: 'Lunch', tags: ['halal', 'mediterranean'] },
  { n: 'Salmon, quinoa & greens', cal: 560, p: 40, c: 42, f: 24, type: 'Lunch', tags: ['pescatarian', 'mediterranean'] },
  { n: 'Lentil & chickpea bowl', cal: 480, p: 24, c: 70, f: 10, type: 'Lunch', tags: ['vegan', 'vegetarian'] },
  { n: 'Turkey & hummus wrap', cal: 430, p: 34, c: 40, f: 14, type: 'Lunch', tags: ['halal', 'mediterranean'] },
  { n: 'Beef stir-fry & veg', cal: 540, p: 42, c: 30, f: 26, type: 'Dinner', tags: ['halal', 'keto'] },
  { n: 'Baked cod, potatoes & salad', cal: 500, p: 42, c: 48, f: 14, type: 'Dinner', tags: ['pescatarian', 'mediterranean'] },
  { n: 'Tempeh curry & brown rice', cal: 520, p: 28, c: 62, f: 16, type: 'Dinner', tags: ['vegan', 'vegetarian'] },
  { n: 'Steak, sweet potato & asparagus', cal: 580, p: 46, c: 40, f: 24, type: 'Dinner', tags: ['halal', 'keto'] },
  { n: 'Cottage cheese & pineapple', cal: 180, p: 24, c: 14, f: 2, type: 'Snack', tags: ['vegetarian'] },
  { n: 'Apple & peanut butter', cal: 230, p: 7, c: 28, f: 11, type: 'Snack', tags: ['vegan', 'vegetarian'] },
  { n: 'Protein shake & almonds', cal: 260, p: 30, c: 10, f: 12, type: 'Snack', tags: ['vegetarian', 'keto'] },
  { n: 'Edamame & sea salt', cal: 190, p: 18, c: 15, f: 8, type: 'Snack', tags: ['vegan', 'vegetarian'] },
  { n: 'Hard-boiled eggs & cucumber', cal: 160, p: 13, c: 3, f: 10, type: 'Snack', tags: ['vegetarian', 'keto', 'halal'] },
];

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
