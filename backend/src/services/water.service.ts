import { prisma } from '../lib/prisma.js';
import { waterBaseMl } from '../utils/nutrition.js';
import { recordChange } from './audit.service.js';

function todayISO() { return new Date().toISOString().slice(0, 10); }
function last7(date: string): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(date); d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Adaptive hydration: streak + progressive overload. If the user hit goal on
 * 5+ of the last 7 days (and we haven't leveled up today), bump target +250 ml.
 */
export async function evaluateWater(userId: string, date: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Profile not found');

  let base = profile.waterBaseMl || waterBaseMl(profile.weightKg);
  let target = profile.waterTargetMl || base;

  const dates = last7(date);
  const logs = await prisma.waterLog.findMany({ where: { userId, date: { in: dates } } });
  const byDate = new Map(logs.map((l) => [l.date, l.amountMl]));

  let hit = 0, streak = 0;
  for (const d of dates) if ((byDate.get(d) ?? 0) >= target) hit++;
  for (let i = dates.length - 1; i >= 0; i--) {
    if ((byDate.get(dates[i]) ?? 0) >= target) streak++; else break;
  }

  let leveledUp = false;
  if (hit >= 5 && profile.waterLastEval !== todayISO()) {
    target += 250;
    leveledUp = true;
    await recordChange(userId, 'Water target', `${profile.waterTargetMl} ml`, `${target} ml (leveled up)`);
  }

  await prisma.profile.update({
    where: { userId },
    data: { waterBaseMl: base, waterTargetMl: target, waterStreak: streak, waterLastEval: leveledUp ? todayISO() : profile.waterLastEval },
  });

  const todayLog = byDate.get(date) ?? 0;
  return { date, amountMl: todayLog, targetMl: target, baseMl: base, streak, leveledUp };
}

export async function setWater(userId: string, date: string, amountMl: number) {
  await prisma.waterLog.upsert({
    where: { userId_date: { userId, date } },
    update: { amountMl },
    create: { userId, date, amountMl },
  });
  return evaluateWater(userId, date);
}
