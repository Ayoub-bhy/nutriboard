import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';
import { conflict, unauthorized } from '../utils/http.js';
import { waterBaseMl } from '../utils/nutrition.js';

const DEFAULT_HABITS = ['8h sleep', '10k steps', '5 veg servings', 'No late-night snacking', 'Protein at every meal'];

async function bootstrapUser(userId: string, weightKg = 78) {
  const base = waterBaseMl(weightKg);
  await prisma.profile.create({ data: { userId, weightKg, waterBaseMl: base, waterTargetMl: base } });
  await prisma.habit.createMany({ data: DEFAULT_HABITS.map((name) => ({ userId, name })) });
}

export async function register(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('Email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  await bootstrapUser(user.id);
  return { token: signToken({ userId: user.id, email }), user: publicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');
  return { token: signToken({ userId: user.id, email }), user: publicUser(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? publicUser(user) : null;
}

function publicUser(u: { id: string; email: string; name: string | null }) {
  return { id: u.id, email: u.email, name: u.name };
}
