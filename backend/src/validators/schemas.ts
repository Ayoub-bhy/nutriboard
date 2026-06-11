import { z } from 'zod';

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  sex: z.enum(['male', 'female']).optional(),
  age: z.number().int().min(14).max(100).optional(),
  weightKg: z.number().min(30).max(400).optional(),
  heightCm: z.number().min(120).max(250).optional(),
  activity: z.number().min(1.2).max(1.9).optional(),
  goal: z.enum(['cut', 'recomp', 'maintain', 'bulk']).optional(),
  dietType: z.string().optional(),
  allergies: z.string().optional(),
  dislikes: z.string().optional(),
  wakeTime: z.string().optional(),
  sleepTime: z.string().optional(),
  breakfastTime: z.string().optional(),
  lunchTime: z.string().optional(),
  dinnerTime: z.string().optional(),
  trainingDays: z.string().optional(),
  routineNotes: z.string().optional(),
});

export const mealSchema = z.object({
  date: dateStr,
  name: z.string().min(1),
  type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  calories: z.number().int().min(0).default(0),
  protein: z.number().int().min(0).default(0),
  carbs: z.number().int().min(0).default(0),
  fat: z.number().int().min(0).default(0),
});

export const waterSchema = z.object({
  date: dateStr,
  amountMl: z.number().int().min(0).max(20000),
});

export const weightSchema = z.object({
  date: dateStr,
  weightKg: z.number().min(30).max(400),
});

export const habitSchema = z.object({ name: z.string().min(1) });
export const habitLogSchema = z.object({ date: dateStr, done: z.boolean() });

export const chatSchema = z.object({ text: z.string().min(1).max(2000) });
