import { prisma } from '../lib/prisma.js';

/** Record a timestamped change to any user-editable field. */
export async function recordChange(
  userId: string,
  field: string,
  fromValue: unknown,
  toValue: unknown,
): Promise<void> {
  const from = fmt(fromValue);
  const to = fmt(toValue);
  if (from === to) return;
  await prisma.changeHistory.create({ data: { userId, field, fromValue: from, toValue: to } });
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export function listChanges(userId: string, limit = 100) {
  return prisma.changeHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
