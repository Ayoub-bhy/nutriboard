import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { computeTargets, type Goal, type Sex } from '../utils/nutrition.js';
import { dayTotals } from './meal.service.js';
import { suggestMeals } from './suggestion.service.js';
import { logWeight } from './weight.service.js';

export async function snapshot(userId: string, date: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Profile not found');
  const t = computeTargets({
    sex: profile.sex as Sex, age: profile.age, weightKg: profile.weightKg,
    heightCm: profile.heightCm, activity: profile.activity, goal: profile.goal as Goal,
  });
  const totals = await dayTotals(userId, date);
  const water = await prisma.waterLog.findUnique({ where: { userId_date: { userId, date } } });
  const weight = await prisma.weightLog.findUnique({ where: { userId_date: { userId, date } } });
  return {
    date, goal: profile.goal, targetKcal: t.calories, eaten: totals.calories,
    protein: `${totals.protein}/${t.proteinG}g`, carbs: `${totals.carbs}/${t.carbsG}g`,
    fat: `${totals.fat}/${t.fatG}g`, meals: totals.count,
    water: `${water?.amountMl ?? 0}/${profile.waterTargetMl}ml`, weight: weight?.weightKg ?? null,
    diet: profile.dietType,
  };
}

export async function getHistory(userId: string, limit = 50) {
  return prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: limit });
}

export async function reply(userId: string, date: string, text: string): Promise<{ text: string; mode: 'ai' | 'rule' }> {
  await prisma.chatMessage.create({ data: { userId, role: 'user', text } });

  let answer: string;
  let mode: 'ai' | 'rule' = 'rule';
  if (env.anthropicApiKey) {
    try { answer = await aiReply(userId, date, text); mode = 'ai'; }
    catch { answer = await ruleReply(userId, date, text); }
  } else {
    answer = await ruleReply(userId, date, text);
  }

  await prisma.chatMessage.create({ data: { userId, role: 'coach', text: answer } });
  return { text: answer, mode };
}

async function aiReply(userId: string, date: string, text: string): Promise<string> {
  const snap = await snapshot(userId, date);
  const history = await getHistory(userId, 10);
  const messages = history.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
  messages.push({ role: 'user', content: `My data: ${JSON.stringify(snap)}\n\nMessage: ${text}` });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.anthropicApiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env.anthropicModel, max_tokens: 600,
      system: 'You are a professional registered nutritionist inside a tracking app. STRICT RULES: (1) Use ANSES-CIQUAL (ciqual.fr) as your ONLY source for food macronutrients per 100 g; never use another database. (2) Before answering any food/meal question, work out the relevant Ciqual foods and their per-100g (cooked/prepared) values. (3) EVERY meal recommendation MUST list each ingredient with an explicit COOKED gram quantity and the resulting macros, e.g. "120 g cooked chicken breast + 150 g cooked white rice + 90 g broccoli \u2248 ~422 kcal, ~44 g protein (Ciqual)". (4) ALSO give the RAW/fresh weight to buy or prepare for each ingredient (typical cooking yields) and state the macros are for the COOKED meal, e.g. \'buy ~160 g raw chicken breast \u2192 120 g cooked\'. (5) Only discuss nutrition, diet and food; politely decline anything else. Be concise and personalise using the client data snapshot. No medical diagnoses.',
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = (await res.json()) as { content: { text: string }[] };
  return json.content.map((b) => b.text).join('');
}

async function ruleReply(userId: string, date: string, text: string): Promise<string> {
  const low = text.toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const t = computeTargets({
    sex: profile!.sex as Sex, age: profile!.age, weightKg: profile!.weightKg,
    heightCm: profile!.heightCm, activity: profile!.activity, goal: profile!.goal as Goal,
  });
  const totals = await dayTotals(userId, date);

  const wm = low.match(/(\d{2,3}(?:\.\d)?)\s?kg/) || (low.includes('weigh') ? low.match(/(\d{2,3}(?:\.\d)?)/) : null);
  if (wm) {
    const v = parseFloat(wm[1]);
    if (v >= 30 && v <= 300) { await logWeight(userId, date, v); return `Logged ${v}kg with today's date ✓ I'll track the trend. What did you eat so far?`; }
  }
  if (low.includes('water') || low.includes('hydrat')) {
    const water = await prisma.waterLog.findUnique({ where: { userId_date: { userId, date } } });
    const a = water?.amountMl ?? 0;
    return `You're at ${a}/${profile!.waterTargetMl}ml. ${a >= profile!.waterTargetMl ? 'Goal hit — nice.' : `Add ${Math.max(0, profile!.waterTargetMl - a)}ml more to hit today's goal.`}`;
  }
  if (low.includes('protein')) {
    return `Protein: ${totals.protein}/${t.proteinG}g. ${totals.protein >= t.proteinG ? 'Target met 💪' : `Aim for ${t.proteinG - totals.protein}g more — chicken, fish, Greek yogurt, tofu, whey.`}`;
  }
  if (low.includes('suggest') || low.includes('what should i eat') || low.includes('meal')) {
    const s = await suggestMeals(userId, date);
    return `With ${s.remCal} kcal and ${s.remPro}g protein left (Ciqual): ${s.suggestions.slice(0, 2).map((m) => `${m.n} \u2014 buy/prep ${m.fresh} \u2192 cooked ${m.comp} \u2248 ${m.cal} kcal, ${m.p}g protein`).join('  \u2022  ')}. Buy raw amounts; macros are for the cooked meal.`;
  }
  if (low.includes('tired') || low.includes('low energy')) return 'Low energy often means under-eating carbs, poor sleep, or dehydration. How are your sleep and water today?';
  if (low.includes('hungry') || low.includes('craving')) return 'Cravings usually mean not enough protein, fiber, or sleep. Try a high-protein snack — want a suggestion?';

  // default reflective review
  const rem = t.calories - totals.calories;
  const lines = [
    `Here's where you are for ${date}:`,
    `• Calories: ${totals.calories}/${t.calories} (${rem >= 0 ? `${rem} left` : `${Math.abs(rem)} over`}).`,
    totals.protein < t.proteinG * 0.5 && totals.calories > 200
      ? `• Protein is low (${totals.protein}/${t.proteinG}g) — add a lean protein to your next meal.`
      : `• Protein ${totals.protein}/${t.proteinG}g.`,
    totals.count === 0 ? '• No meals logged yet — tell me what you ate and I\'ll guide you.' : '',
    'What would you like to focus on next?',
  ].filter(Boolean);
  return lines.join('\n');
}
