import type { Cocktail, Ingredient } from "@/data/types";
import { cocktails } from "@/data/cocktails";
import { classifyIngredient } from "@/data/ingredientTaxonomy";
import { formatAmount } from "./format";
import { pickRandom, shuffle } from "./random";

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LEVEL_META: Record<Level, { title: string; subtitle: string }> = {
  1: { title: "Level 1", subtitle: "Multiple Choice — Specs" },
  2: { title: "Level 2", subtitle: "Multiple Choice — Ingredients" },
  3: { title: "Level 3", subtitle: "Recall Specs" },
  4: { title: "Level 4", subtitle: "Recall Ingredients" },
  5: { title: "Level 5", subtitle: "Full Recipe" },
  6: { title: "Level 6", subtitle: "Glass & Garnish" },
  7: { title: "Level 7", subtitle: "Complete Drink" },
  8: { title: "Level 8", subtitle: "Full Bartender Build" },
};

export type WeaknessField = "ingredients" | "specs" | "glassware" | "garnish" | "method";

interface BaseQuestion {
  qid: string;
  level: Level;
  cocktailId: string;
  cocktailName: string;
}

export interface McSpecsQuestion extends BaseQuestion {
  type: "mc-specs";
  ingredientNames: string[];
  options: string[][]; // each option: amount strings aligned to ingredientNames
  correctIndex: number;
}

export interface McIngredientsQuestion extends BaseQuestion {
  type: "mc-ingredients";
  amountStrings: string[];
  options: string[][]; // each option: ingredient names aligned to amountStrings
  correctIndex: number;
}

export interface RecallSpecsQuestion extends BaseQuestion {
  type: "recall-specs";
  ingredients: Ingredient[];
}

export interface RecallIngredientsQuestion extends BaseQuestion {
  type: "recall-ingredients";
  ingredients: Ingredient[]; // amounts shown, names hidden
}

export interface FullRecipeQuestion extends BaseQuestion {
  type: "full-recipe";
  ingredients: Ingredient[];
}

export interface GlassGarnishQuestion extends BaseQuestion {
  type: "glass-garnish";
  glass: string;
  garnish: string;
}

export interface CompleteDrinkQuestion extends BaseQuestion {
  type: "complete-drink";
  ingredients: Ingredient[];
  glass: string;
  garnish: string;
}

export interface BartenderBuildQuestion extends BaseQuestion {
  type: "bartender-build";
  ingredients: Ingredient[];
  glass: string;
  garnish: string;
  method: string[];
}

export type Question =
  | McSpecsQuestion
  | McIngredientsQuestion
  | RecallSpecsQuestion
  | RecallIngredientsQuestion
  | FullRecipeQuestion
  | GlassGarnishQuestion
  | CompleteDrinkQuestion
  | BartenderBuildQuestion;

function numericIngredients(c: Cocktail): Ingredient[] {
  return c.ingredients.filter((i) => i.amount !== null);
}

function makeQid(level: Level, cocktailId: string): string {
  return `${cocktailId}-L${level}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- Amount distractor pools --------------------------------------------

const AMOUNT_POOL_BY_UNIT: Record<string, number[]> = {};
for (const c of cocktails) {
  for (const ing of c.ingredients) {
    if (ing.amount === null) continue;
    const pool = (AMOUNT_POOL_BY_UNIT[ing.unit] ??= []);
    if (!pool.includes(ing.amount)) pool.push(ing.amount);
  }
}
for (const unit of Object.keys(AMOUNT_POOL_BY_UNIT)) {
  AMOUNT_POOL_BY_UNIT[unit].sort((a, b) => a - b);
}

function nearbyAmount(amount: number, unit: string, exclude: number[]): number {
  const pool = AMOUNT_POOL_BY_UNIT[unit] ?? [amount];
  const candidates = pool
    .filter((v) => !exclude.includes(v))
    .sort((a, b) => Math.abs(a - amount) - Math.abs(b - amount));
  if (candidates.length > 0) return candidates[0];
  // Fall back to a small synthetic offset in a realistic bar increment.
  const increments = unit === "oz" ? [0.25, 0.5, 0.75] : [1, 1, 2];
  const delta = pickRandom(increments) * (Math.random() < 0.5 ? -1 : 1);
  return Math.max(0.1, Math.round((amount + delta) * 100) / 100);
}

function amountVectorKey(amounts: number[]): string {
  return amounts.join("|");
}

// ---- Level 1: Multiple Choice Specs --------------------------------------

export function genMcSpecs(c: Cocktail): McSpecsQuestion | null {
  const numeric = numericIngredients(c);
  if (numeric.length < 2) return null;

  const correctVec = numeric.map((i) => i.amount as number);
  const seen = new Set([amountVectorKey(correctVec)]);
  const vectors: number[][] = [correctVec];

  let attempts = 0;
  while (vectors.length < 4 && attempts < 40) {
    attempts++;
    const variant = [...correctVec];
    const perturbCount = Math.random() < 0.5 ? 1 : 2;
    const indices = shuffle(numeric.map((_, i) => i)).slice(0, Math.min(perturbCount, numeric.length));
    for (const idx of indices) {
      variant[idx] = nearbyAmount(correctVec[idx], numeric[idx].unit, [correctVec[idx]]);
    }
    const key = amountVectorKey(variant);
    if (!seen.has(key)) {
      seen.add(key);
      vectors.push(variant);
    }
  }
  // If we still don't have 4, try a straight shuffle of the correct order.
  if (vectors.length < 4 && numeric.length >= 2) {
    const permuted = shuffle(correctVec);
    const key = amountVectorKey(permuted);
    if (!seen.has(key)) vectors.push(permuted);
  }
  while (vectors.length < 4) {
    // last resort: pad with a full random reshuffle of amount pools
    const variant = correctVec.map((amt, i) => nearbyAmount(amt, numeric[i].unit, []));
    const key = amountVectorKey(variant);
    if (!seen.has(key)) {
      seen.add(key);
      vectors.push(variant);
    } else break;
  }

  const shuffledVectors = shuffle(vectors);
  const correctIndex = shuffledVectors.findIndex((v) => amountVectorKey(v) === amountVectorKey(correctVec));

  return {
    qid: makeQid(1, c.id),
    type: "mc-specs",
    level: 1,
    cocktailId: c.id,
    cocktailName: c.name,
    ingredientNames: numeric.map((i) => i.name),
    options: shuffledVectors.map((vec) => vec.map((amt, i) => formatAmount({ ...numeric[i], amount: amt }))),
    correctIndex,
  };
}

// ---- Level 2: Multiple Choice Ingredients --------------------------------

const ALL_INGREDIENT_NAMES = Array.from(new Set(cocktails.flatMap((c) => c.ingredients.map((i) => i.name))));

function namesByBucket(name: string): string[] {
  const bucket = classifyIngredient(name);
  return ALL_INGREDIENT_NAMES.filter((n) => n !== name && classifyIngredient(n) === bucket);
}

export function genMcIngredients(c: Cocktail): McIngredientsQuestion | null {
  const numeric = numericIngredients(c);
  if (numeric.length < 2) return null;

  const correctNames = numeric.map((i) => i.name);
  const seen = new Set([correctNames.join("|")]);
  const combos: string[][] = [correctNames];

  let attempts = 0;
  while (combos.length < 4 && attempts < 40) {
    attempts++;
    const variant = [...correctNames];
    const swapCount = Math.random() < 0.5 ? 1 : 2;
    const indices = shuffle(numeric.map((_, i) => i)).slice(0, Math.min(swapCount, numeric.length));
    for (const idx of indices) {
      const candidates = namesByBucket(correctNames[idx]).filter((n) => !variant.includes(n));
      if (candidates.length > 0) variant[idx] = pickRandom(candidates);
    }
    const key = variant.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      combos.push(variant);
    }
  }
  while (combos.length < 4) {
    const variant = correctNames.map((n) => {
      const candidates = namesByBucket(n);
      return candidates.length > 0 ? pickRandom(candidates) : n;
    });
    const key = variant.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      combos.push(variant);
    } else break;
  }

  const shuffledCombos = shuffle(combos);
  const correctIndex = shuffledCombos.findIndex((v) => v.join("|") === correctNames.join("|"));

  return {
    qid: makeQid(2, c.id),
    type: "mc-ingredients",
    level: 2,
    cocktailId: c.id,
    cocktailName: c.name,
    amountStrings: numeric.map((i) => formatAmount(i)),
    options: shuffledCombos,
    correctIndex,
  };
}

// ---- Levels 3-8: straightforward passthrough questions -------------------

export function genRecallSpecs(c: Cocktail): RecallSpecsQuestion {
  return { qid: makeQid(3, c.id), type: "recall-specs", level: 3, cocktailId: c.id, cocktailName: c.name, ingredients: c.ingredients };
}

export function genRecallIngredients(c: Cocktail): RecallIngredientsQuestion {
  return { qid: makeQid(4, c.id), type: "recall-ingredients", level: 4, cocktailId: c.id, cocktailName: c.name, ingredients: c.ingredients };
}

export function genFullRecipe(c: Cocktail): FullRecipeQuestion {
  return { qid: makeQid(5, c.id), type: "full-recipe", level: 5, cocktailId: c.id, cocktailName: c.name, ingredients: c.ingredients };
}

export function genGlassGarnish(c: Cocktail): GlassGarnishQuestion | null {
  if (!c.glass || !c.garnish) return null;
  return { qid: makeQid(6, c.id), type: "glass-garnish", level: 6, cocktailId: c.id, cocktailName: c.name, glass: c.glass, garnish: c.garnish };
}

export function genCompleteDrink(c: Cocktail): CompleteDrinkQuestion | null {
  if (!c.glass || !c.garnish) return null;
  return {
    qid: makeQid(7, c.id),
    type: "complete-drink",
    level: 7,
    cocktailId: c.id,
    cocktailName: c.name,
    ingredients: c.ingredients,
    glass: c.glass,
    garnish: c.garnish,
  };
}

export function genBartenderBuild(c: Cocktail): BartenderBuildQuestion | null {
  if (!c.glass || !c.garnish || !c.method || c.method.length === 0) return null;
  return {
    qid: makeQid(8, c.id),
    type: "bartender-build",
    level: 8,
    cocktailId: c.id,
    cocktailName: c.name,
    ingredients: c.ingredients,
    glass: c.glass,
    garnish: c.garnish,
    method: c.method,
  };
}

export function generateQuestion(level: Level, c: Cocktail): Question | null {
  switch (level) {
    case 1:
      return genMcSpecs(c);
    case 2:
      return genMcIngredients(c);
    case 3:
      return genRecallSpecs(c);
    case 4:
      return genRecallIngredients(c);
    case 5:
      return genFullRecipe(c);
    case 6:
      return genGlassGarnish(c);
    case 7:
      return genCompleteDrink(c);
    case 8:
      return genBartenderBuild(c);
  }
}

export const FIELDS_TESTED_BY_LEVEL: Record<Level, WeaknessField[]> = {
  1: ["specs"],
  2: ["ingredients"],
  3: ["specs"],
  4: ["ingredients"],
  5: ["ingredients", "specs"],
  6: ["glassware", "garnish"],
  7: ["ingredients", "specs", "glassware", "garnish"],
  8: ["ingredients", "specs", "glassware", "garnish", "method"],
};
