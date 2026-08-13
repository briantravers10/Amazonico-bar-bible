"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CocktailCategory } from "@/data/types";
import { cocktails, cocktailsByCategory } from "@/data/cocktails";
import type { GradeResult } from "./grading";
import type { Level, WeaknessField } from "./questionGen";

export const MASTERY_STREAK = 2; // consecutive correct answers needed to advance a level
export const MAX_LEVEL: Level = 8;
export const BATCH_UNLOCK_LEVEL: Level = 3; // a batch's cocktails must all reach this level to unlock the next batch
export const MIXED_PRACTICE_UNLOCK_LEVEL: Level = 3; // classic & signature must each have 1 batch past this level

interface FieldStat {
  correct: number;
  wrong: number;
}

export interface MistakeEntry {
  at: number;
  level: Level;
  field: WeaknessField;
  expected: string;
  got: string;
}

export interface CocktailState {
  currentLevel: Level;
  levelStreak: number;
  masteredLevels: Level[];
  fieldStats: Partial<Record<WeaknessField, FieldStat>>;
  missCounters: Record<string, number>;
  mistakes: MistakeEntry[];
  totalAnswered: number;
  totalCorrect: number;
}

interface Stats {
  xp: number;
  streak: number;
  bestStreak: number;
  questionsAnswered: number;
  correctAnswered: number;
}

interface CategorySettings {
  batchSize: number;
}

function defaultCocktailState(): CocktailState {
  return {
    currentLevel: 1,
    levelStreak: 0,
    masteredLevels: [],
    fieldStats: {},
    missCounters: {},
    mistakes: [],
    totalAnswered: 0,
    totalCorrect: 0,
  };
}

interface BarTrainerState {
  cocktailState: Record<string, CocktailState>;
  categorySettings: Record<CocktailCategory, CategorySettings>;
  stats: Stats;
  getCocktailState: (id: string) => CocktailState;
  recordAnswer: (params: {
    cocktailId: string;
    questionLevel: Level;
    isProgressionAttempt: boolean;
    grade: GradeResult;
    fieldsTested: WeaknessField[];
  }) => void;
  setBatchSize: (category: CocktailCategory, size: number) => void;
  getBatches: (category: CocktailCategory) => { index: number; cocktailIds: string[]; unlocked: boolean; allReachedUnlockLevel: boolean }[];
  isMixedPracticeUnlocked: () => boolean;
  resetProgress: () => void;
}

function xpForLevel(level: Level, correct: boolean): number {
  if (!correct) return 1;
  return 8 + level * 4;
}

export const useBarTrainerStore = create<BarTrainerState>()(
  persist(
    (set, get) => ({
      cocktailState: {},
      categorySettings: {
        classic: { batchSize: 5 },
        signature: { batchSize: 5 },
        mocktail: { batchSize: 5 },
      },
      stats: { xp: 0, streak: 0, bestStreak: 0, questionsAnswered: 0, correctAnswered: 0 },

      getCocktailState: (id: string) => {
        return get().cocktailState[id] ?? defaultCocktailState();
      },

      recordAnswer: ({ cocktailId, questionLevel, isProgressionAttempt, grade, fieldsTested }) => {
        set((state) => {
          const prev = state.cocktailState[cocktailId] ?? defaultCocktailState();
          const cs: CocktailState = {
            ...prev,
            fieldStats: { ...prev.fieldStats },
            missCounters: { ...prev.missCounters },
            mistakes: [...prev.mistakes],
          };

          cs.totalAnswered += 1;
          if (grade.isFullyCorrect) cs.totalCorrect += 1;

          for (const field of fieldsTested) {
            const fieldCorrect = grade.fields[field] ?? grade.isFullyCorrect;
            const stat = cs.fieldStats[field] ?? { correct: 0, wrong: 0 };
            if (fieldCorrect) stat.correct += 1;
            else stat.wrong += 1;
            cs.fieldStats[field] = stat;
          }

          if (grade.ingredientRows) {
            for (const row of grade.ingredientRows) {
              if (row.status === "wrong" || row.status === "missing") {
                cs.missCounters[row.name] = (cs.missCounters[row.name] ?? 0) + 1;
                cs.mistakes.unshift({
                  at: Date.now(),
                  level: questionLevel,
                  field: row.amountCorrect === false && row.nameCorrect ? "specs" : "ingredients",
                  expected: row.correctSpec || row.name,
                  got: row.userValue || "(blank)",
                });
              }
            }
          }
          if (grade.glass && !grade.glass.correct) {
            cs.missCounters["Glass"] = (cs.missCounters["Glass"] ?? 0) + 1;
            cs.mistakes.unshift({ at: Date.now(), level: questionLevel, field: "glassware", expected: grade.glass.correctValue, got: grade.glass.userValue || "(blank)" });
          }
          if (grade.garnish && !grade.garnish.correct) {
            cs.missCounters["Garnish"] = (cs.missCounters["Garnish"] ?? 0) + 1;
            cs.mistakes.unshift({ at: Date.now(), level: questionLevel, field: "garnish", expected: grade.garnish.correctValue, got: grade.garnish.userValue || "(blank)" });
          }
          if (grade.method && !grade.method.correct) {
            cs.missCounters["Method"] = (cs.missCounters["Method"] ?? 0) + 1;
            cs.mistakes.unshift({ at: Date.now(), level: questionLevel, field: "method", expected: grade.method.correctOrder.join(" → "), got: grade.method.userOrder.join(" → ") || "(blank)" });
          }
          cs.mistakes = cs.mistakes.slice(0, 40);

          if (isProgressionAttempt && questionLevel === cs.currentLevel) {
            if (grade.isFullyCorrect) {
              cs.levelStreak += 1;
              if (cs.levelStreak >= MASTERY_STREAK) {
                cs.masteredLevels = Array.from(new Set([...cs.masteredLevels, cs.currentLevel]));
                cs.levelStreak = 0;
                if (cs.currentLevel < MAX_LEVEL) {
                  cs.currentLevel = (cs.currentLevel + 1) as Level;
                }
              }
            } else {
              cs.levelStreak = 0;
            }
          }

          const stats = { ...state.stats };
          stats.questionsAnswered += 1;
          if (grade.isFullyCorrect) {
            stats.correctAnswered += 1;
            stats.streak += 1;
            stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
          } else {
            stats.streak = 0;
          }
          stats.xp += xpForLevel(questionLevel, grade.isFullyCorrect);

          return {
            cocktailState: { ...state.cocktailState, [cocktailId]: cs },
            stats,
          };
        });
      },

      setBatchSize: (category, size) => {
        set((state) => ({
          categorySettings: { ...state.categorySettings, [category]: { batchSize: Math.max(1, size) } },
        }));
      },

      getBatches: (category) => {
        const state = get();
        const size = state.categorySettings[category]?.batchSize ?? 5;
        const ids = cocktailsByCategory(category).map((c) => c.id);
        const batches: { index: number; cocktailIds: string[]; unlocked: boolean; allReachedUnlockLevel: boolean }[] = [];
        for (let i = 0; i < ids.length; i += size) {
          const cocktailIds = ids.slice(i, i + size);
          const allReachedUnlockLevel = cocktailIds.every((id) => (state.cocktailState[id]?.currentLevel ?? 1) >= BATCH_UNLOCK_LEVEL);
          batches.push({ index: batches.length, cocktailIds, unlocked: false, allReachedUnlockLevel });
        }
        batches.forEach((b, i) => {
          b.unlocked = i === 0 || batches[i - 1].allReachedUnlockLevel;
        });
        return batches;
      },

      isMixedPracticeUnlocked: () => {
        const state = get();
        const check = (cat: CocktailCategory) => {
          const batches = state.getBatches(cat);
          return batches.some((b) => b.unlocked && b.allReachedUnlockLevel);
        };
        return check("classic") && check("signature");
      },

      resetProgress: () => {
        set({
          cocktailState: {},
          stats: { xp: 0, streak: 0, bestStreak: 0, questionsAnswered: 0, correctAnswered: 0 },
        });
      },
    }),
    {
      name: "amazonico-bar-trainer",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function overallAccuracy(): number {
  const { stats } = useBarTrainerStore.getState();
  if (stats.questionsAnswered === 0) return 0;
  return Math.round((stats.correctAnswered / stats.questionsAnswered) * 100);
}

export function masteredCocktailCount(): number {
  const state = useBarTrainerStore.getState();
  return cocktails.filter((c) => (state.cocktailState[c.id]?.masteredLevels.length ?? 0) >= MAX_LEVEL).length;
}
