import type { Ingredient } from "@/data/types";
import type {
  Question,
  WeaknessField,
} from "./questionGen";
import { formatAmount, formatSpec, isFillUnit, parseAmountGuess } from "./format";
import { fuzzyNameMatch, normalize, tokenOverlap } from "./textMatch";

export interface IngredientRowResult {
  name: string;
  correctSpec: string;
  userValue: string;
  nameCorrect: boolean;
  amountCorrect: boolean;
  status: "correct" | "wrong" | "missing" | "extra";
}

export interface GradeResult {
  isFullyCorrect: boolean;
  fields: Partial<Record<WeaknessField, boolean>>;
  ingredientRows?: IngredientRowResult[];
  glass?: { correct: boolean; userValue: string; correctValue: string };
  garnish?: { correct: boolean; userValue: string; correctValue: string };
  method?: { correct: boolean; userOrder: string[]; correctOrder: string[] };
  correctBuild: string[]; // lines describing the full correct answer, for reveal
}

const FILL_KEYWORDS: Record<string, string[]> = {
  top: ["top", "fill", "full"],
  splash: ["splash"],
  shot: ["shot"],
  rinse: ["rinse"],
  bottom: ["bottom", "first"],
};

function gradeAmount(ing: Ingredient, userText: string): boolean {
  if (ing.amount === null || isFillUnit(ing.unit)) {
    const kws = FILL_KEYWORDS[ing.unit] ?? [ing.unit];
    const lower = userText.toLowerCase();
    return kws.some((k) => lower.includes(k));
  }
  const { amount } = parseAmountGuess(userText);
  if (amount === null) return false;
  return Math.abs(amount - ing.amount) < 0.01;
}

function buildCorrectLines(ingredients: Ingredient[], glass?: string | null, garnish?: string | null, method?: string[]): string[] {
  const lines = ingredients.map((i) => formatSpec(i));
  if (glass) lines.push(`Glass: ${glass}`);
  if (garnish) lines.push(`Garnish: ${garnish}`);
  if (method && method.length) lines.push(...method.map((m, i) => `${i + 1}. ${m}`));
  return lines;
}

function gradeIngredientSet(
  correctIngredients: Ingredient[],
  userRows: { name: string; amountRaw: string }[]
): { rows: IngredientRowResult[]; ingredientsOk: boolean; specsOk: boolean } {
  const usedUserIdx = new Set<number>();
  const rows: IngredientRowResult[] = [];

  for (const correct of correctIngredients) {
    let matchIdx = -1;
    for (let i = 0; i < userRows.length; i++) {
      if (usedUserIdx.has(i)) continue;
      if (fuzzyNameMatch(userRows[i].name, correct.name)) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx === -1) {
      rows.push({
        name: correct.name,
        correctSpec: formatSpec(correct),
        userValue: "",
        nameCorrect: false,
        amountCorrect: false,
        status: "missing",
      });
      continue;
    }
    usedUserIdx.add(matchIdx);
    const amountCorrect = gradeAmount(correct, userRows[matchIdx].amountRaw);
    rows.push({
      name: correct.name,
      correctSpec: formatSpec(correct),
      userValue: `${userRows[matchIdx].amountRaw} ${userRows[matchIdx].name}`.trim(),
      nameCorrect: true,
      amountCorrect,
      status: amountCorrect ? "correct" : "wrong",
    });
  }

  userRows.forEach((row, i) => {
    if (!usedUserIdx.has(i) && (row.name.trim() || row.amountRaw.trim())) {
      rows.push({
        name: row.name || "(unknown)",
        correctSpec: "",
        userValue: `${row.amountRaw} ${row.name}`.trim(),
        nameCorrect: false,
        amountCorrect: false,
        status: "extra",
      });
    }
  });

  const ingredientsOk = rows.every((r) => r.status !== "missing" && r.status !== "extra");
  const specsOk = ingredientsOk && rows.every((r) => r.amountCorrect);
  return { rows, ingredientsOk, specsOk };
}

function gradeGlass(correctGlass: string, userGlass: string) {
  const correct = normalize(userGlass) === normalize(correctGlass) || tokenOverlap(correctGlass, userGlass) >= 0.8;
  return { correct, userValue: userGlass, correctValue: correctGlass };
}

function gradeGarnish(correctGarnish: string, userGarnish: string) {
  const correct = tokenOverlap(correctGarnish, userGarnish) >= 0.6;
  return { correct, userValue: userGarnish, correctValue: correctGarnish };
}

export type Answer =
  | { type: "choice"; selectedIndex: number }
  | { type: "recall-specs"; values: Record<string, string> }
  | { type: "recall-ingredients"; values: string[] }
  | { type: "ingredient-rows"; rows: { name: string; amountRaw: string }[] }
  | { type: "glass-garnish"; glass: string; garnish: string }
  | {
      type: "complete-drink";
      rows: { name: string; amountRaw: string }[];
      glass: string;
      garnish: string;
    }
  | {
      type: "bartender-build";
      rows: { name: string; amountRaw: string }[];
      glass: string;
      garnish: string;
      methodOrder: string[];
    };

export function gradeQuestion(question: Question, answer: Answer): GradeResult {
  switch (question.type) {
    case "mc-specs": {
      if (answer.type !== "choice") throw new Error("answer/question mismatch");
      const correct = answer.selectedIndex === question.correctIndex;
      const correctOption = question.options[question.correctIndex];
      return {
        isFullyCorrect: correct,
        fields: { specs: correct },
        correctBuild: question.ingredientNames.map((name, i) => `${correctOption[i]} ${name}`),
      };
    }
    case "mc-ingredients": {
      if (answer.type !== "choice") throw new Error("answer/question mismatch");
      const correct = answer.selectedIndex === question.correctIndex;
      const correctOption = question.options[question.correctIndex];
      return {
        isFullyCorrect: correct,
        fields: { ingredients: correct },
        correctBuild: question.amountStrings.map((amt, i) => `${amt} ${correctOption[i]}`),
      };
    }
    case "recall-specs": {
      if (answer.type !== "recall-specs") throw new Error("answer/question mismatch");
      const rows: IngredientRowResult[] = question.ingredients.map((ing) => {
        const userValue = answer.values[ing.name] ?? "";
        const amountCorrect = gradeAmount(ing, userValue);
        return {
          name: ing.name,
          correctSpec: formatSpec(ing),
          userValue,
          nameCorrect: true,
          amountCorrect,
          status: amountCorrect ? "correct" : "wrong",
        };
      });
      const specsOk = rows.every((r) => r.amountCorrect);
      return {
        isFullyCorrect: specsOk,
        fields: { specs: specsOk },
        ingredientRows: rows,
        correctBuild: buildCorrectLines(question.ingredients),
      };
    }
    case "recall-ingredients": {
      if (answer.type !== "recall-ingredients") throw new Error("answer/question mismatch");
      const rows: IngredientRowResult[] = question.ingredients.map((ing, i) => {
        const userValue = answer.values[i] ?? "";
        const nameCorrect = fuzzyNameMatch(userValue, ing.name);
        return {
          name: ing.name,
          correctSpec: formatSpec(ing),
          userValue,
          nameCorrect,
          amountCorrect: true,
          status: nameCorrect ? "correct" : "wrong",
        };
      });
      const ingredientsOk = rows.every((r) => r.nameCorrect);
      return {
        isFullyCorrect: ingredientsOk,
        fields: { ingredients: ingredientsOk },
        ingredientRows: rows,
        correctBuild: buildCorrectLines(question.ingredients),
      };
    }
    case "full-recipe": {
      if (answer.type !== "ingredient-rows") throw new Error("answer/question mismatch");
      const { rows, ingredientsOk, specsOk } = gradeIngredientSet(question.ingredients, answer.rows);
      return {
        isFullyCorrect: ingredientsOk && specsOk,
        fields: { ingredients: ingredientsOk, specs: specsOk },
        ingredientRows: rows,
        correctBuild: buildCorrectLines(question.ingredients),
      };
    }
    case "glass-garnish": {
      if (answer.type !== "glass-garnish") throw new Error("answer/question mismatch");
      const glass = gradeGlass(question.glass, answer.glass);
      const garnish = gradeGarnish(question.garnish, answer.garnish);
      return {
        isFullyCorrect: glass.correct && garnish.correct,
        fields: { glassware: glass.correct, garnish: garnish.correct },
        glass,
        garnish,
        correctBuild: [`Glass: ${question.glass}`, `Garnish: ${question.garnish}`],
      };
    }
    case "complete-drink": {
      if (answer.type !== "complete-drink") throw new Error("answer/question mismatch");
      const { rows, ingredientsOk, specsOk } = gradeIngredientSet(question.ingredients, answer.rows);
      const glass = gradeGlass(question.glass, answer.glass);
      const garnish = gradeGarnish(question.garnish, answer.garnish);
      return {
        isFullyCorrect: ingredientsOk && specsOk && glass.correct && garnish.correct,
        fields: { ingredients: ingredientsOk, specs: specsOk, glassware: glass.correct, garnish: garnish.correct },
        ingredientRows: rows,
        glass,
        garnish,
        correctBuild: buildCorrectLines(question.ingredients, question.glass, question.garnish),
      };
    }
    case "bartender-build": {
      if (answer.type !== "bartender-build") throw new Error("answer/question mismatch");
      const { rows, ingredientsOk, specsOk } = gradeIngredientSet(question.ingredients, answer.rows);
      const glass = gradeGlass(question.glass, answer.glass);
      const garnish = gradeGarnish(question.garnish, answer.garnish);
      const methodOk =
        answer.methodOrder.length === question.method.length &&
        answer.methodOrder.every((step, i) => step === question.method[i]);
      return {
        isFullyCorrect: ingredientsOk && specsOk && glass.correct && garnish.correct && methodOk,
        fields: {
          ingredients: ingredientsOk,
          specs: specsOk,
          glassware: glass.correct,
          garnish: garnish.correct,
          method: methodOk,
        },
        ingredientRows: rows,
        glass,
        garnish,
        method: { correct: methodOk, userOrder: answer.methodOrder, correctOrder: question.method },
        correctBuild: buildCorrectLines(question.ingredients, question.glass, question.garnish, question.method),
      };
    }
  }
}

export { formatAmount };
