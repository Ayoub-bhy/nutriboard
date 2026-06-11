import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h, badRequest, notFound } from '../utils/http.js';
import { computeTargets, type Goal, type Sex } from '../utils/nutrition.js';

const router = Router();
router.use(requireAuth);
const uid = (req: any): string => req.auth!.userId;

/* ---------------- Pattern 2: Onboarding ---------------- */
const onboardingSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().int().min(14).max(100),
  weightKg: z.number().min(30).max(400),
  heightCm: z.number().min(120).max(250),
  activity: z.number().min(1.2).max(1.9),
  goal: z.enum(['cut', 'recomp', 'maintain', 'bulk']),
  dietType: z.string().optional(),
});
router.post('/onboarding', h(async (req, res) => {
  const d = onboardingSchema.parse(req.body);
  const profile = await prisma.profile.update({
    where: { userId: uid(req) },
    data: { ...d, onboardingCompleted: true },
  });
  res.json({ profile, targets: targetsFor(profile) });
}));

/* ---------------- Pattern 4: Streaks & weekly ---------------- */
router.get('/stats/streaks', h(async (req, res) => {
  const meals = await prisma.meal.findMany({ where: { userId: uid(req) }, select: { date: true } });
  const days = new Set(meals.map((m) => m.date));
  let streak = 0; const d = new Date();
  for (let i = 0; i < 400; i++) {
    const k = d.toISOString().slice(0, 10);
    if (days.has(k)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  res.json({ logStreak: streak, daysLogged: days.size });
}));

router.get('/stats/weekly', h(async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: uid(req) } });
  if (!profile) throw notFound('Profile not found');
  const t = targetsFor(profile);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().slice(0, 10)); }
  const days = [];
  for (const date of dates) {
    const meals = await prisma.meal.findMany({ where: { userId: uid(req), date } });
    const water = await prisma.waterLog.findUnique({ where: { userId_date: { userId: uid(req), date } } });
    days.push({
      date,
      calories: meals.reduce((s, m) => s + m.calories, 0),
      protein: meals.reduce((s, m) => s + m.protein, 0),
      water: water?.amountMl ?? 0,
      logged: meals.length > 0,
    });
  }
  res.json({ days, targets: t });
}));

/* ---------------- Patterns 1 & 8: Food search + quality (Open Food Facts) ---------------- */
const UA = { 'User-Agent': 'NutriBoard/1.0 (github.com/Ayoub-bhy/nutriboard)' };

function densityClass(kcalPer100: number): 'green' | 'yellow' | 'red' {
  if (kcalPer100 <= 120) return 'green';
  if (kcalPer100 <= 275) return 'yellow';
  return 'red';
}
function normalize(p: any) {
  const name = p.product_name || p.product_name_en;
  if (!name) return null;
  const n = p.nutriments || {};
  const kcal100 = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  return {
    name: String(name).slice(0, 80),
    brand: (p.brands || '').split(',')[0] || '',
    barcode: p.code || '',
    serving: p.serving_size || '100 g',
    calories: Math.round(kcal100),
    protein: Math.round(Number(n.proteins_100g ?? 0)),
    carbs: Math.round(Number(n.carbohydrates_100g ?? 0)),
    fat: Math.round(Number(n.fat_100g ?? 0)),
    densityClass: densityClass(kcal100),
  };
}
router.get('/foods/search', h(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw badRequest('Query too short');
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,code,serving_size,nutriments`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw badRequest('Food service unavailable');
  const j = (await r.json()) as any;
  const foods = (j.products || []).map(normalize).filter(Boolean).slice(0, 12);
  res.json({ query: q, foods });
}));
router.get('/foods/barcode/:code', h(async (req, res) => {
  const code = req.params.code.replace(/\D/g, '');
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,code,serving_size,nutriments`, { headers: UA });
  const j = (await r.json()) as any;
  if (j.status !== 1 || !j.product) throw notFound('Product not found for that barcode');
  res.json({ food: normalize(j.product) });
}));

function targetsFor(p: any) {
  return computeTargets({ sex: p.sex as Sex, age: p.age, weightKg: p.weightKg, heightCm: p.heightCm, activity: p.activity, goal: p.goal as Goal });
}

export default router;
