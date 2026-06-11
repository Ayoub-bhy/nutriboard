import { prisma } from '../lib/prisma.js';
import { recordChange } from './audit.service.js';

export function listWeights(userId: string) {
  return prisma.weightLog.findMany({ where: { userId }, orderBy: { date: 'asc' } });
}

export async function logWeight(userId: string, date: string, weightKg: number) {
  const existing = await prisma.weightLog.findUnique({ where: { userId_date: { userId, date } } });
  await recordChange(userId, 'Weight', existing ? `${existing.weightKg} kg` : '', `${weightKg} kg`);
  // Keep the profile's current weight in sync so targets follow the latest measurement.
  await prisma.profile.update({ where: { userId }, data: { weightKg } }).catch(() => undefined);
  return prisma.weightLog.upsert({
    where: { userId_date: { userId, date } },
    update: { weightKg },
    create: { userId, date, weightKg },
  });
}
