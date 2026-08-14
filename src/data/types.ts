export type CocktailCategory = "classic" | "signature" | "mocktail";

export type IngredientUnit =
  | "oz"
  | "dash"
  | "drop"
  | "piece"
  | "barspoon"
  | "tbsp"
  | "spray"
  | "cube"
  | "ml"
  | "top"
  | "splash"
  | "shot"
  | "rinse"
  | "bottom";

// Units that don't carry a meaningful numeric amount (e.g. "Top up Soda Water").
export const FILL_UNITS: IngredientUnit[] = ["top", "splash", "shot", "rinse", "bottom"];

export interface Ingredient {
  name: string;
  amount: number | null;
  unit: IngredientUnit;
  notes?: string;
}

// The detailed, fully-broken-out build for a cocktail whose day-to-day spec sheet
// collapses several pre-batched components into one "Batch" line. Only present when
// it differs from the top-level (quick-reference) recipe. Used by the last quiz level
// and shown as a secondary "full build" section in the Study Library.
export interface RecipeVariant {
  ingredients: Ingredient[];
  glass?: string | null;
  garnish?: string | null;
  ice?: string | null;
  batch?: string | null;
  style?: string | null;
  flavour?: string | null;
  method?: string[];
}

export interface Cocktail {
  id: string;
  name: string;
  category: CocktailCategory;
  sourcePages: number[];
  ingredients: Ingredient[];
  glass?: string | null;
  garnish?: string | null;
  ice?: string | null;
  batch?: string | null;
  style?: string | null;
  flavour?: string | null;
  method?: string[];
  notes?: string;
  flags?: string[];
  image?: string | null;
  fullRecipe?: RecipeVariant;
}
