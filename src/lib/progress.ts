import type { CocktailCategory } from "@/data/types";
import { cocktailsByCategory, cocktails } from "@/data/cocktails";
import { MAX_LEVEL, useBarTrainerStore } from "./store";

export function categoryProgressPct(category: CocktailCategory): number {
  const list = cocktailsByCategory(category);
  if (list.length === 0) return 0;
  const state = useBarTrainerStore.getState();
  const sum = list.reduce((acc, c) => {
    const level = state.cocktailState[c.id]?.currentLevel ?? 1;
    return acc + (level - 1) / (MAX_LEVEL - 1);
  }, 0);
  return Math.round((sum / list.length) * 100);
}

export function categoryFrontierLevel(category: CocktailCategory): number {
  const state = useBarTrainerStore.getState();
  const batches = state.getBatches(category);
  const activeBatch = batches.find((b) => b.unlocked && !b.allReachedUnlockLevel) ?? batches[batches.length - 1];
  if (!activeBatch) return 1;
  const levels = activeBatch.cocktailIds.map((id) => state.cocktailState[id]?.currentLevel ?? 1);
  return levels.length ? Math.min(...levels) : 1;
}

export function masteredCount(): number {
  const state = useBarTrainerStore.getState();
  return cocktails.filter((c) => (state.cocktailState[c.id]?.masteredLevels.length ?? 0) >= MAX_LEVEL).length;
}

export function startedCount(): number {
  const state = useBarTrainerStore.getState();
  return cocktails.filter((c) => (state.cocktailState[c.id]?.currentLevel ?? 1) > 1 || (state.cocktailState[c.id]?.totalAnswered ?? 0) > 0).length;
}
