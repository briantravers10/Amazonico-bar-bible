import raw from "./cocktails.json";
import type { Cocktail } from "./types";

export const cocktails = raw as unknown as Cocktail[];

export const cocktailsById: Record<string, Cocktail> = Object.fromEntries(
  cocktails.map((c) => [c.id, c])
);

export function getCocktail(id: string): Cocktail | undefined {
  return cocktailsById[id];
}

export function cocktailsByCategory(category: Cocktail["category"]): Cocktail[] {
  return cocktails.filter((c) => c.category === category);
}

export const CATEGORY_LABELS: Record<Cocktail["category"], string> = {
  classic: "Classic Cocktails",
  signature: "Signature Cocktails",
  mocktail: "Mocktails",
};
