export type Sex = 'male' | 'female';
export type Goal = 'cut' | 'recomp' | 'maintain' | 'bulk';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface User { id: string; email: string; name: string | null; }

export interface Targets { bmr: number; tdee: number; calories: number; proteinG: number; carbsG: number; fatG: number; }

export interface Profile {
  sex: Sex; age: number; weightKg: number; heightCm: number; activity: number; goal: Goal;
  dietType: string; allergies: string; dislikes: string;
  wakeTime: string; sleepTime: string; breakfastTime: string; lunchTime: string; dinnerTime: string;
  trainingDays: string; routineNotes: string;
  waterBaseMl: number; waterTargetMl: number; waterStreak: number;
  onboardingCompleted: boolean;
  targets: Targets;
}

export interface Meal { id: string; date: string; name: string; type: MealType; calories: number; protein: number; carbs: number; fat: number; createdAt: string; }
export interface Water { date: string; amountMl: number; targetMl: number; baseMl: number; streak: number; leveledUp: boolean; }
export interface Weight { id: string; date: string; weightKg: number; createdAt: string; }
export interface Habit { id: string; name: string; }
export interface HabitLog { habitId: string; date: string; done: boolean; }
export interface Suggestion { n: string; cal: number; p: number; c: number; f: number; type: MealType; comp: string; fresh: string; }
export interface SuggestionResult { remCal: number; remPro: number; diet: string; suggestions: Suggestion[]; }
export interface ChatMessage { id?: string; role: 'user' | 'coach'; text: string; createdAt?: string; }
export interface Change { id: string; field: string; fromValue: string; toValue: string; createdAt: string; }

export interface FoodResult { name: string; brand: string; barcode: string; serving: string; calories: number; protein: number; carbs: number; fat: number; densityClass: 'green' | 'yellow' | 'red'; }
export interface WeeklyDay { date: string; calories: number; protein: number; water: number; logged: boolean; }
export interface OnboardingInput { sex: Sex; age: number; weightKg: number; heightCm: number; activity: number; goal: Goal; dietType?: string; }

export interface AdminStats {
  totalUsers: number;
  bySignInMethod: { google: number; email: number };
  newLast7Days: number;
  activeUsers: { dau: number; wau: number; mau: number };
  signupsByDay: { date: string; count: number }[];
}
