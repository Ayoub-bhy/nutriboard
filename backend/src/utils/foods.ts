/** Pure food-suggestion + food-quality logic (no I/O — fully unit-tested). */

export interface Food { n: string; cal: number; p: number; c: number; f: number; type: string; tags: string[]; comp: string; fresh: string; }

export const FOODS: Food[] = [
// Macros per 100 g from ANSES-CIQUAL (cooked); `comp` = cooked weights, `fresh` = raw buy/prep weights.
  { n: "Greek yogurt, berries & honey", cal: 193, p: 18, c: 28, f: 1, type: "Breakfast", comp: "170 g Greek yogurt, plain + 80 g mixed berries + 15 g honey", fresh: "~170 g Greek yogurt, plain + ~80 g mixed berries + ~15 g honey", tags: ["vegetarian","mediterranean"] },
  { n: "3-egg omelette & greens", cal: 243, p: 20, c: 3, f: 17, type: "Breakfast", comp: "150 g egg, cooked + 60 g mixed leaf salad", fresh: "~150 g egg + ~60 g mixed leaf salad", tags: ["vegetarian","keto","halal"] },
  { n: "Oat porridge, whey & banana", cal: 382, p: 31, c: 52, f: 6, type: "Breakfast", comp: "250 g oat porridge, cooked + 30 g whey protein powder + 100 g banana", fresh: "~50 g oat porridge (raw) + ~30 g whey protein powder + ~100 g banana", tags: ["vegetarian"] },
  { n: "Tofu scramble & avocado", cal: 281, p: 19, c: 4, f: 20, type: "Breakfast", comp: "150 g tofu, cooked + 60 g avocado", fresh: "~150 g tofu + ~60 g avocado", tags: ["vegan","vegetarian"] },
  { n: "Chicken, rice & broccoli", cal: 422, p: 44, c: 46, f: 5, type: "Lunch", comp: "120 g chicken breast, cooked + 150 g white rice, cooked + 90 g broccoli, cooked", fresh: "~160 g chicken breast (raw) + ~56 g white rice (raw) + ~100 g broccoli (raw)", tags: ["halal","mediterranean"] },
  { n: "Salmon, quinoa & greens", cal: 437, p: 34, c: 33, f: 19, type: "Lunch", comp: "120 g salmon, cooked + 150 g quinoa, cooked + 60 g mixed leaf salad", fresh: "~150 g salmon (raw) + ~56 g quinoa (raw) + ~60 g mixed leaf salad", tags: ["pescatarian","mediterranean"] },
  { n: "Lentil & chickpea bowl", cal: 323, p: 22, c: 49, f: 3, type: "Lunch", comp: "150 g lentils, cooked + 100 g chickpeas, cooked + 60 g mixed leaf salad", fresh: "~63 g lentils (raw) + ~42 g chickpeas (raw) + ~60 g mixed leaf salad", tags: ["vegan","vegetarian"] },
  { n: "Turkey & hummus plate", cal: 246, p: 40, c: 8, f: 5, type: "Lunch", comp: "120 g turkey breast, cooked + 40 g hummus + 80 g mixed leaf salad", fresh: "~160 g turkey breast (raw) + ~40 g hummus + ~80 g mixed leaf salad", tags: ["halal","mediterranean"] },
  { n: "Beef stir-fry, rice & veg", cal: 451, p: 38, c: 38, f: 15, type: "Dinner", comp: "120 g lean beef, cooked + 120 g white rice, cooked + 100 g broccoli, cooked", fresh: "~160 g lean beef (raw) + ~44 g white rice (raw) + ~111 g broccoli (raw)", tags: ["halal"] },
  { n: "Cod, potatoes & salad", cal: 328, p: 39, c: 38, f: 2, type: "Dinner", comp: "150 g cod, cooked + 180 g potato, boiled + 80 g mixed leaf salad", fresh: "~188 g cod (raw) + ~180 g potato + ~80 g mixed leaf salad", tags: ["pescatarian","mediterranean"] },
  { n: "Tempeh curry & brown rice", cal: 405, p: 28, c: 44, f: 15, type: "Dinner", comp: "120 g tempeh, cooked + 150 g brown rice, cooked", fresh: "~120 g tempeh + ~58 g brown rice (raw)", tags: ["vegan","vegetarian"] },
  { n: "Steak, sweet potato & greens", cal: 474, p: 44, c: 32, f: 18, type: "Dinner", comp: "150 g lean beef, cooked + 150 g sweet potato, cooked + 80 g mixed leaf salad", fresh: "~200 g lean beef (raw) + ~150 g sweet potato + ~80 g mixed leaf salad", tags: ["halal","keto"] },
  { n: "Cottage cheese & pineapple", cal: 187, p: 17, c: 16, f: 7, type: "Snack", comp: "150 g cottage cheese + 80 g pineapple", fresh: "~150 g cottage cheese + ~80 g pineapple", tags: ["vegetarian"] },
  { n: "Apple & peanut butter", cal: 188, p: 5, c: 21, f: 10, type: "Snack", comp: "130 g apple + 20 g peanut butter", fresh: "~130 g apple + ~20 g peanut butter", tags: ["vegan","vegetarian"] },
  { n: "Protein shake & almonds", cal: 228, p: 28, c: 4, f: 12, type: "Snack", comp: "30 g whey protein powder + 20 g almonds", fresh: "~30 g whey protein powder + ~20 g almonds", tags: ["vegetarian","keto"] },
  { n: "Edamame", cal: 182, p: 18, c: 14, f: 8, type: "Snack", comp: "150 g edamame, cooked", fresh: "~150 g edamame", tags: ["vegan","vegetarian"] },
  { n: "Boiled eggs & cucumber", cal: 173, p: 14, c: 5, f: 11, type: "Snack", comp: "100 g egg, cooked + 120 g cucumber", fresh: "~100 g egg + ~120 g cucumber", tags: ["vegetarian","keto","halal"] },
];

/** Turn allergy + dislike strings into a clean lower-cased avoid list. */
export function parseAvoid(allergies: string, dislikes: string): string[] {
  return `${allergies},${dislikes}`.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
}

/** Filter by diet tag (omnivore = all) and remove anything matching an avoid term. */
export function filterFoods(foods: Food[], diet: string, avoid: string[]): Food[] {
  return foods.filter((food) => {
    if (diet !== 'omnivore' && !food.tags.includes(diet)) return false;
    if (avoid.some((a) => a !== '' && food.n.toLowerCase().includes(a))) return false;
    return true;
  });
}

/** Rank by protein-per-calorie, highest first (does not mutate input). */
export function rankByProteinDensity(foods: Food[]): Food[] {
  return [...foods].sort((a, b) => b.p / b.cal - a.p / a.cal);
}

/** Pick up to 4 meals across a sensible spread of meal types for the remaining budget. */
export function pickSuggestions(pool: Food[], remCal: number): Food[] {
  const ranked = rankByProteinDensity(pool);
  const want = remCal > 900 ? ['Breakfast', 'Lunch', 'Dinner', 'Snack'] : remCal > 500 ? ['Lunch', 'Dinner', 'Snack'] : ['Snack', 'Lunch'];
  const out: Food[] = [];
  const used = new Set<string>();
  for (const type of want) {
    const m = ranked.find((f) => f.type === type && !used.has(f.n) && f.cal <= remCal + 200);
    if (m) { out.push(m); used.add(m.n); }
  }
  for (const f of ranked) {
    if (out.length >= 4) break;
    if (!used.has(f.n)) { out.push(f); used.add(f.n); }
  }
  return out.slice(0, 4);
}

/* ---- Food-quality colour system (Pattern 8) + Open Food Facts normalisation ---- */
export type DensityClass = 'green' | 'yellow' | 'red';

export function densityClass(kcalPer100: number): DensityClass {
  if (kcalPer100 <= 120) return 'green';
  if (kcalPer100 <= 275) return 'yellow';
  return 'red';
}

export interface NormalizedFood {
  name: string; brand: string; barcode: string; serving: string;
  calories: number; protein: number; carbs: number; fat: number; densityClass: DensityClass;
}

/** Normalise one Open Food Facts product to our shape (null if it has no name). */
export function normalizeOff(p: any): NormalizedFood | null {
  const name = p.product_name || p.product_name_en;
  if (!name) return null;
  const n = p.nutriments || {};
  const kcal100 = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  return {
    name: String(name).slice(0, 80),
    brand: (p.brands || '').split(',')[0] || '',
    barcode: p.code || '',
    serving: p.serving_size || '100 g',
    calories: Math.round(kcal100),
    protein: Math.round(Number(n.proteins_100g ?? 0)),
    carbs: Math.round(Number(n.carbohydrates_100g ?? 0)),
    fat: Math.round(Number(n.fat_100g ?? 0)),
    densityClass: densityClass(kcal100),
  };
}
