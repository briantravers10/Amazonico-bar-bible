import type { Ingredient, IngredientUnit } from "@/data/types";
import { FILL_UNITS } from "@/data/types";

const FILL_LABELS: Record<string, string> = {
  top: "Top up",
  splash: "Splash",
  shot: "Shot",
  rinse: "Rinse",
  bottom: "Bottom",
};

const UNIT_LABELS: Record<IngredientUnit, string> = {
  oz: "oz",
  dash: "dash",
  drop: "drop",
  piece: "pcs",
  barspoon: "bsp",
  tbsp: "tbsp",
  spray: "spray",
  cube: "cube",
  ml: "ml",
  top: "top",
  splash: "splash",
  shot: "shot",
  rinse: "rinse",
  bottom: "bottom",
};

export function isFillUnit(unit: IngredientUnit): boolean {
  return FILL_UNITS.includes(unit);
}

export function formatAmount(ing: Ingredient): string {
  if (ing.amount === null || isFillUnit(ing.unit)) {
    return FILL_LABELS[ing.unit] ?? ing.unit;
  }
  const amt = Number.isInteger(ing.amount) ? String(ing.amount) : String(ing.amount);
  return `${amt} ${UNIT_LABELS[ing.unit] ?? ing.unit}`;
}

export function formatSpec(ing: Ingredient): string {
  return `${formatAmount(ing)} ${ing.name}`;
}

export function parseAmountGuess(input: string): { amount: number | null; unitGuess: string } {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { amount: null, unitGuess: "" };
  const match = trimmed.match(/-?\d+(\.\d+)?/);
  const amount = match ? parseFloat(match[0]) : null;
  const unitGuess = trimmed.replace(match?.[0] ?? "", "").trim();
  return { amount, unitGuess };
}
