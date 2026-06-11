import { prisma } from '../lib/prisma.js';
import type { MealType } from '@prisma/client';

export interface MealInput {
  date: string; name: string; type: MealType;
  calories: number; protein: number; carbs: number; fat: number;
}

export function listMeals(userId: string, date: string) {
  return prisma.meal.findMany({ where: { userId, date }, orderBy: { createdAt: 'asc' } });
}

export function addMeal(userId: string, input: MealInput) {
  return prisma.meal.create({ data: { userId, ...input } });
}

export async function deleteMeal(userId: string, id: string) {
  const result = await prisma.meal.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export async function dayTotals(userId: string, date: string) {
  const meals = await listMeals(userId, date);
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      count: acc.count + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
  );
}
