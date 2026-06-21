import type { Request, Response } from 'express';
import * as authSvc from '../services/auth.service.js';
import * as profileSvc from '../services/profile.service.js';
import * as mealSvc from '../services/meal.service.js';
import * as waterSvc from '../services/water.service.js';
import * as weightSvc from '../services/weight.service.js';
import * as habitSvc from '../services/habit.service.js';
import * as coachSvc from '../services/coach.service.js';
import * as auditSvc from '../services/audit.service.js';
import { suggestMeals } from '../services/suggestion.service.js';
import {
  registerSchema, loginSchema, profileSchema, mealSchema, waterSchema,
  weightSchema, habitSchema, habitLogSchema, chatSchema,
} from '../validators/schemas.js';
import { notFound } from '../utils/http.js';

const uid = (req: Request) => req.auth!.userId;

// --- auth ---
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = registerSchema.parse(req.body);
  res.status(201).json(await authSvc.register(email, password, name));
};
export const login = async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  res.json(await authSvc.login(email, password));
};
export const google = async (req: Request, res: Response) => {
  const idToken = String((req.body ?? {}).idToken ?? '');
  res.json(await authSvc.loginWithGoogle(idToken));
};
export const me = async (req: Request, res: Response) => res.json(await authSvc.me(uid(req)));

// --- profile ---
export const getProfile = async (req: Request, res: Response) => res.json(await profileSvc.getProfile(uid(req)));
export const updateProfile = async (req: Request, res: Response) =>
  res.json(await profileSvc.updateProfile(uid(req), profileSchema.parse(req.body)));

// --- meals ---
export const listMeals = async (req: Request, res: Response) =>
  res.json(await mealSvc.listMeals(uid(req), String(req.query.date)));
export const addMeal = async (req: Request, res: Response) =>
  res.status(201).json(await mealSvc.addMeal(uid(req), mealSchema.parse(req.body)));
export const deleteMeal = async (req: Request, res: Response) => {
  const ok = await mealSvc.deleteMeal(uid(req), req.params.id);
  if (!ok) throw notFound('Meal not found');
  res.status(204).end();
};

// --- water ---
export const getWater = async (req: Request, res: Response) =>
  res.json(await waterSvc.evaluateWater(uid(req), String(req.query.date)));
export const setWater = async (req: Request, res: Response) => {
  const { date, amountMl } = waterSchema.parse(req.body);
  res.json(await waterSvc.setWater(uid(req), date, amountMl));
};

// --- weight ---
export const listWeights = async (req: Request, res: Response) => res.json(await weightSvc.listWeights(uid(req)));
export const logWeight = async (req: Request, res: Response) => {
  const { date, weightKg } = weightSchema.parse(req.body);
  res.json(await weightSvc.logWeight(uid(req), date, weightKg));
};

// --- habits ---
export const listHabits = async (req: Request, res: Response) => {
  const [habits, logs] = await Promise.all([
    habitSvc.listHabits(uid(req)),
    habitSvc.habitLogsForDate(uid(req), String(req.query.date)),
  ]);
  res.json({ habits, logs });
};
export const addHabit = async (req: Request, res: Response) =>
  res.status(201).json(await habitSvc.addHabit(uid(req), habitSchema.parse(req.body).name));
export const removeHabit = async (req: Request, res: Response) => {
  const ok = await habitSvc.removeHabit(uid(req), req.params.id);
  if (!ok) throw notFound('Habit not found');
  res.status(204).end();
};
export const setHabitLog = async (req: Request, res: Response) => {
  const { date, done } = habitLogSchema.parse(req.body);
  res.json(await habitSvc.setHabitLog(uid(req), req.params.id, date, done));
};

// --- suggestions ---
export const getSuggestions = async (req: Request, res: Response) =>
  res.json(await suggestMeals(uid(req), String(req.query.date)));

// --- coach ---
export const coachHistory = async (req: Request, res: Response) =>
  res.json({ snapshot: await coachSvc.snapshot(uid(req), String(req.query.date)), messages: await coachSvc.getHistory(uid(req)) });
export const coachChat = async (req: Request, res: Response) => {
  const { text } = chatSchema.parse(req.body);
  res.json(await coachSvc.reply(uid(req), String(req.query.date), text));
};

// --- audit ---
export const listChanges = async (req: Request, res: Response) => res.json(await auditSvc.listChanges(uid(req)));
