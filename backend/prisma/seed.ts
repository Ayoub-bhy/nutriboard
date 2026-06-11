import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { waterBaseMl } from '../src/utils/nutrition.js';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@nutriboard.app';
  const passwordHash = await bcrypt.hash('demodemo', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User', passwordHash },
  });

  const base = waterBaseMl(78);
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, goal: 'cut', dietType: 'mediterranean', waterBaseMl: base, waterTargetMl: base },
  });

  const habits = ['8h sleep', '10k steps', '5 veg servings', 'Protein at every meal'];
  for (const name of habits) {
    await prisma.habit.create({ data: { userId: user.id, name } }).catch(() => undefined);
  }

  const today = new Date().toISOString().slice(0, 10);
  await prisma.meal.create({
    data: { userId: user.id, date: today, name: 'Greek yogurt + berries', type: 'Breakfast', calories: 240, protein: 22, carbs: 28, fat: 4 },
  }).catch(() => undefined);

  console.log(`Seeded demo user: ${email} / demodemo`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
