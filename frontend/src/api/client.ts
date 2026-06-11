import type {
  User, Profile, Meal, Water, Weight, Habit, HabitLog,
  SuggestionResult, ChatMessage, Change, MealType,
  Targets, OnboardingInput, WeeklyDay, FoodResult,
} from './types';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';
const TOKEN_KEY = 'nutriboard.token';

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  set(token: string) { localStorage.setItem(TOKEN_KEY, token); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    req<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req<User>('/auth/me'),

  getProfile: () => req<Profile>('/profile'),
  updateProfile: (patch: Partial<Profile>) => req<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(patch) }),

  listMeals: (date: string) => req<Meal[]>(`/meals?date=${date}`),
  addMeal: (m: { date: string; name: string; type: MealType; calories: number; protein: number; carbs: number; fat: number }) =>
    req<Meal>('/meals', { method: 'POST', body: JSON.stringify(m) }),
  deleteMeal: (id: string) => req<void>(`/meals/${id}`, { method: 'DELETE' }),

  getWater: (date: string) => req<Water>(`/water?date=${date}`),
  setWater: (date: string, amountMl: number) => req<Water>('/water', { method: 'PUT', body: JSON.stringify({ date, amountMl }) }),

  listWeights: () => req<Weight[]>('/weights'),
  logWeight: (date: string, weightKg: number) => req<Weight>('/weights', { method: 'POST', body: JSON.stringify({ date, weightKg }) }),

  listHabits: (date: string) => req<{ habits: Habit[]; logs: HabitLog[] }>(`/habits?date=${date}`),
  addHabit: (name: string) => req<Habit>('/habits', { method: 'POST', body: JSON.stringify({ name }) }),
  removeHabit: (id: string) => req<void>(`/habits/${id}`, { method: 'DELETE' }),
  setHabitLog: (id: string, date: string, done: boolean) => req<HabitLog>(`/habits/${id}/log`, { method: 'PUT', body: JSON.stringify({ date, done }) }),

  getSuggestions: (date: string) => req<SuggestionResult>(`/suggestions?date=${date}`),

  getCoach: (date: string) => req<{ snapshot: Record<string, unknown>; messages: ChatMessage[] }>(`/coach?date=${date}`),
  sendCoach: (date: string, text: string) => req<{ text: string; mode: 'ai' | 'rule' }>(`/coach?date=${date}`, { method: 'POST', body: JSON.stringify({ text }) }),

  listChanges: () => req<Change[]>('/history'),

  // Phase 1
  completeOnboarding: (d: OnboardingInput) => req<{ profile: Profile; targets: Targets }>('/onboarding', { method: 'POST', body: JSON.stringify(d) }),
  getStreaks: () => req<{ logStreak: number; daysLogged: number }>('/stats/streaks'),
  getWeekly: () => req<{ days: WeeklyDay[]; targets: Targets }>('/stats/weekly'),
  searchFood: (q: string) => req<{ query: string; foods: FoodResult[] }>(`/foods/search?q=${encodeURIComponent(q)}`),
  foodByBarcode: (code: string) => req<{ food: FoodResult }>(`/foods/barcode/${code}`),
};
