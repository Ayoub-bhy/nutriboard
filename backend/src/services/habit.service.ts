import { prisma } from '../lib/prisma.js';

export function listHabits(userId: string) {
  return prisma.habit.findMany({ where: { userId, active: true }, orderBy: { createdAt: 'asc' } });
}

export function addHabit(userId: string, name: string) {
  return prisma.habit.create({ data: { userId, name } });
}

export async function removeHabit(userId: string, id: string) {
  const r = await prisma.habit.updateMany({ where: { id, userId }, data: { active: false } });
  return r.count > 0;
}

export function habitLogsForDate(userId: string, date: string) {
  return prisma.habitLog.findMany({ where: { userId, date } });
}

export async function setHabitLog(userId: string, habitId: string, date: string, done: boolean) {
  return prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    update: { done },
    create: { userId, habitId, date, done },
  });
}
