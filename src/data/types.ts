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
}
