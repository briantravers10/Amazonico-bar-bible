import type { CocktailCategory } from "@/data/types";
import { cocktails, cocktailsByCategory, getCocktail } from "@/data/cocktails";
import { generateQuestion, type Level, type Question } from "./questionGen";
import { useBarTrainerStore } from "./store";
import { shuffle, randInt, pickRandom } from "./random";

export type SessionMode = "learn" | "quick" | "weak" | "exam";

export interface QueueEntry {
  cocktailId: string;
  level: Level;
  isProgressionAttempt: boolean;
}

function unlockedCocktailIds(category: CocktailCategory): string[] {
  const batches = useBarTrainerStore.getState().getBatches(category);
  return batches.filter((b) => b.unlocked).flatMap((b) => b.cocktailIds);
}

export function learnQueue(category: CocktailCategory): QueueEntry[] {
  const ids = unlockedCocktailIds(category);
  const entries: QueueEntry[] = [];
  for (const id of ids) {
    entries.push({ cocktailId: id, level: currentLevelOf(id), isProgressionAttempt: true });
    entries.push({ cocktailId: id, level: currentLevelOf(id), isProgressionAttempt: true });
  }
  return spaceOut(shuffle(entries));
}

export function mixedQueue(): QueueEntry[] {
  const ids = [...unlockedCocktailIds("classic"), ...unlockedCocktailIds("signature")];
  const entries: QueueEntry[] = ids.flatMap((id) => [
    { cocktailId: id, level: currentLevelOf(id), isProgressionAttempt: false },
  ]);
  return spaceOut(shuffle(entries));
}

export function quickPracticeQueue(category: CocktailCategory | "mixed", length = 15): QueueEntry[] {
  const ids = category === "mixed" ? [...unlockedCocktailIds("classic"), ...unlockedCocktailIds("signature")] : unlockedCocktailIds(category);
  const pool = ids.length > 0 ? ids : cocktailsByCategory(category === "mixed" ? "classic" : category).slice(0, 5).map((c) => c.id);
  const entries: QueueEntry[] = [];
  for (let i = 0; i < length; i++) {
    const id = pickRandom(pool);
    const cs = useBarTrainerStore.getState().getCocktailState(id);
    const level = Math.random() < 0.2 && cs.currentLevel > 1 ? (randInt(1, cs.currentLevel) as Level) : cs.currentLevel;
    entries.push({ cocktailId: id, level, isProgressionAttempt: false });
  }
  return spaceOut(entries);
}

export function weakSpotsQueue(length = 15): QueueEntry[] {
  const state = useBarTrainerStore.getState();
  const weighted: { id: string; weight: number }[] = [];
  for (const c of cocktails) {
    const cs = state.cocktailState[c.id];
    if (!cs) continue;
    const wrongTotal = Object.values(cs.fieldStats).reduce((sum, f) => sum + (f?.wrong ?? 0), 0);
    if (wrongTotal > 0) weighted.push({ id: c.id, weight: wrongTotal });
  }
  if (weighted.length === 0) return quickPracticeQueue("mixed", length);
  weighted.sort((a, b) => b.weight - a.weight);
  const top = weighted.slice(0, 15);
  const entries: QueueEntry[] = [];
  for (let i = 0; i < length; i++) {
    const pick = top[i % top.length];
    const cs = state.getCocktailState(pick.id);
    entries.push({ cocktailId: pick.id, level: cs.currentLevel, isProgressionAttempt: false });
  }
  return spaceOut(shuffle(entries));
}

export function examQueue(length = 20): QueueEntry[] {
  const state = useBarTrainerStore.getState();
  const started = cocktails.filter((c) => (state.cocktailState[c.id]?.currentLevel ?? 1) > 1);
  const pool = started.length >= 5 ? started : cocktails.slice(0, 10);
  const entries: QueueEntry[] = [];
  for (let i = 0; i < length; i++) {
    const c = pickRandom(pool);
    const cs = state.getCocktailState(c.id);
    const maxLevel = Math.max(1, cs.currentLevel);
    const level = (Math.random() < 0.6 ? randInt(Math.ceil(maxLevel / 2), maxLevel) : randInt(1, maxLevel)) as Level;
    entries.push({ cocktailId: c.id, level, isProgressionAttempt: false });
  }
  return entries;
}

function currentLevelOf(id: string): Level {
  return useBarTrainerStore.getState().getCocktailState(id).currentLevel;
}

// Ensure no two consecutive entries reference the same cocktail (basic spaced-repetition hygiene).
function spaceOut(entries: QueueEntry[]): QueueEntry[] {
  const arr = [...entries];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].cocktailId === arr[i - 1].cocktailId) {
      const swapIdx = arr.findIndex((e, j) => j > i && e.cocktailId !== arr[i - 1].cocktailId);
      if (swapIdx !== -1) [arr[i], arr[swapIdx]] = [arr[swapIdx], arr[i]];
    }
  }
  return arr;
}

export function resolveQuestion(entry: QueueEntry): Question | null {
  const cocktail = getCocktail(entry.cocktailId);
  if (!cocktail) return null;
  return generateQuestion(entry.level, cocktail);
}

// Some cocktails lack a garnish/method entry and can't support every level (e.g. level 6+).
// Fall back to the nearest higher level that can actually generate a question so a session
// never gets stuck on an unresolvable entry.
export function resolveQuestionWithFallback(entry: QueueEntry): { question: Question; level: Level } | null {
  const cocktail = getCocktail(entry.cocktailId);
  if (!cocktail) return null;
  for (let level = entry.level; level <= 8; level++) {
    const q = generateQuestion(level as Level, cocktail);
    if (q) return { question: q, level: level as Level };
  }
  for (let level = entry.level - 1; level >= 1; level--) {
    const q = generateQuestion(level as Level, cocktail);
    if (q) return { question: q, level: level as Level };
  }
  return null;
}

export function requeueOffset(): number {
  return randInt(3, 6);
}
