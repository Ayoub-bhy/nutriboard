import { prisma } from '../lib/prisma.js';
import { computeTargets, waterBaseMl, type Goal, type Sex } from '../utils/nutrition.js';
import { recordChange } from './audit.service.js';

const TRACKED: Record<string, string> = {
  sex: 'Sex', age: 'Age', weightKg: 'Weight', heightCm: 'Height',
  activity: 'Activity', goal: 'Goal', dietType: 'Diet type',
  wakeTime: 'Wake time', sleepTime: 'Sleep time', trainingDays: 'Training days',
};

export async function getProfile(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;
  return withTargets(profile);
}

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  const current = await prisma.profile.findUnique({ where: { userId } });
  if (!current) throw new Error('Profile not found');

  // Audit every tracked field that actually changes.
  for (const [key, label] of Object.entries(TRACKED)) {
    if (key in patch && (current as any)[key] !== patch[key]) {
      await recordChange(userId, label, (current as any)[key], patch[key]);
    }
  }

  // If body stats changed, recompute the hydration baseline.
  const data: Record<string, unknown> = { ...patch };
  if ('weightKg' in patch) {
    const base = waterBaseMl(Number(patch.weightKg));
    data.waterBaseMl = base;
    if (!current.waterTargetMl) data.waterTargetMl = base;
  }

  const updated = await prisma.profile.update({ where: { userId }, data });
  return withTargets(updated);
}

function withTargets(profile: any) {
  const targets = computeTargets({
    sex: profile.sex as Sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    activity: profile.activity,
    goal: profile.goal as Goal,
  });
  return { ...profile, targets };
}
