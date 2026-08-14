"use client";

import { useState } from "react";
import Image from "next/image";
import type { Question } from "@/lib/questionGen";
import type { Answer } from "@/lib/grading";
import { formatAmount } from "@/lib/format";
import { getCocktail } from "@/data/cocktails";
import { Pill } from "@/components/ui/Primitives";
import { McOptions, RecallList, IngredientRowsForm, GlassGarnishForm, MethodOrderForm } from "./AnswerForms";

const CATEGORY_TONE: Record<string, "accent" | "gold" | "good"> = {
  classic: "accent",
  signature: "gold",
  mocktail: "good",
};

// Levels 1-4 test specs/ingredients only, where a photo is a harmless memory aid.
// Levels 5-8 test glass, garnish, and build — a photo there would just hand over
// the answer, so the image is withheld from that point on.
const PHOTO_VISIBLE_THROUGH_LEVEL = 4;

export function QuestionCard({
  question,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (answer: Answer) => void;
  disabled: boolean;
}) {
  const cocktail = getCocktail(question.cocktailId);
  const category = cocktail?.category ?? "classic";
  const showPhoto = question.level <= PHOTO_VISIBLE_THROUGH_LEVEL && !!cocktail?.image;

  return (
    <div className="flex flex-col gap-5">
      {showPhoto && (
        <div className="relative -mx-5 -mt-5 h-44 w-[calc(100%+2.5rem)] overflow-hidden rounded-t-2xl bg-surface-2">
          <Image src={cocktail!.image!} alt={question.cocktailName} fill className="object-cover" priority />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Pill tone={CATEGORY_TONE[category] ?? "accent"}>Level {question.level}</Pill>
        <Pill>{category}</Pill>
      </div>
      <h2 className="-mt-2 font-display text-3xl font-semibold tracking-tight text-text">{question.cocktailName}</h2>

      <Prompt question={question} />

      <AnswerZone question={question} onAnswer={onAnswer} disabled={disabled} />
    </div>
  );
}

// "ONE THE MONKEY BUSINESS!" reads oddly — drop a leading "The" so the bartender
// call still scans naturally for cocktails named that way.
function bartenderCallName(name: string): string {
  return name.replace(/^the\s+/i, "").toUpperCase();
}

function Prompt({ question }: { question: Question }) {
  switch (question.type) {
    case "mc-specs":
      return (
        <ul className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-2 px-4 py-3.5">
          {question.ingredientNames.map((n, i) => (
            <li key={i} className="text-[15px] text-text">
              {n}
            </li>
          ))}
        </ul>
      );
    case "mc-ingredients":
      return (
        <ul className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 font-mono">
          {question.amountStrings.map((a, i) => (
            <li key={i} className="text-[15px] text-text">
              {a}
            </li>
          ))}
        </ul>
      );
    case "recall-specs":
      return (
        <p className="text-[14px] text-text-dim">Enter the exact measurement for each ingredient below.</p>
      );
    case "recall-ingredients":
      return (
        <ul className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 font-mono">
          {question.ingredients.map((ing, i) => (
            <li key={i} className="text-[15px] text-text">
              {formatAmount(ing)}
            </li>
          ))}
        </ul>
      );
    case "full-recipe":
      return <p className="text-[14px] text-text-dim">List every ingredient and its exact measurement. No hints.</p>;
    case "glass-garnish":
      return <p className="text-[14px] text-text-dim">What glass, and what garnish?</p>;
    case "complete-drink":
      return <p className="text-[14px] text-text-dim">Ingredients, specs, glass and garnish — the whole build.</p>;
    case "bartender-build":
      return (
        <div className="rounded-2xl border border-gold-soft bg-gold-soft/50 px-4 py-3.5">
          <p className="font-display text-lg font-semibold text-gold">&ldquo;ONE {bartenderCallName(question.cocktailName)}!&rdquo;</p>
          <p className="mt-1 text-[13px] text-text-dim">Full build: ingredients, specs, glass, garnish and method.</p>
        </div>
      );
  }
}

function AnswerZone({
  question,
  onAnswer,
  disabled,
}: {
  question: Question;
  onAnswer: (answer: Answer) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case "mc-specs":
    case "mc-ingredients":
      return (
        <McOptions
          options={question.options}
          disabled={disabled}
          onSubmit={(index) => onAnswer({ type: "choice", selectedIndex: index })}
        />
      );
    case "recall-specs":
      return (
        <RecallList
          labels={question.ingredients.map((i) => i.name)}
          disabled={disabled}
          placeholder="e.g. 0.75 oz"
          onSubmit={(values) => {
            const record: Record<string, string> = {};
            question.ingredients.forEach((ing, i) => (record[ing.name] = values[i]));
            onAnswer({ type: "recall-specs", values: record });
          }}
        />
      );
    case "recall-ingredients":
      return (
        <RecallList
          labels={question.ingredients.map((i) => formatAmount(i))}
          disabled={disabled}
          placeholder="Ingredient name"
          onSubmit={(values) => onAnswer({ type: "recall-ingredients", values })}
        />
      );
    case "full-recipe":
      return (
        <IngredientRowsForm
          minRows={question.ingredients.length}
          disabled={disabled}
          onSubmit={(rows) => onAnswer({ type: "ingredient-rows", rows })}
        />
      );
    case "glass-garnish":
      return (
        <GlassGarnishForm disabled={disabled} onSubmit={(values) => onAnswer({ type: "glass-garnish", ...values })} />
      );
    case "complete-drink":
      return (
        <CompleteDrinkForm
          ingredientCount={question.ingredients.length}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
    case "bartender-build":
      return (
        <BartenderBuildForm
          ingredientCount={question.ingredients.length}
          method={question.method}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
  }
}

function CompleteDrinkForm({
  ingredientCount,
  disabled,
  onAnswer,
}: {
  ingredientCount: number;
  disabled: boolean;
  onAnswer: (a: Answer) => void;
}) {
  const [rows, setRows] = useState<{ name: string; amountRaw: string }[] | null>(null);
  if (rows === null) {
    return (
      <IngredientRowsForm minRows={ingredientCount} disabled={disabled} onSubmit={(r) => setRows(r)} />
    );
  }
  return (
    <GlassGarnishForm
      disabled={disabled}
      onSubmit={(gg) => onAnswer({ type: "complete-drink", rows, ...gg })}
    />
  );
}

function BartenderBuildForm({
  ingredientCount,
  method,
  disabled,
  onAnswer,
}: {
  ingredientCount: number;
  method: string[];
  disabled: boolean;
  onAnswer: (a: Answer) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [rows, setRows] = useState<{ name: string; amountRaw: string }[]>([]);
  const [glassGarnish, setGlassGarnish] = useState<{ glass: string; garnish: string }>({ glass: "", garnish: "" });

  if (step === 0) {
    return (
      <IngredientRowsForm
        minRows={ingredientCount}
        disabled={disabled}
        onSubmit={(r) => {
          setRows(r);
          setStep(1);
        }}
      />
    );
  }
  if (step === 1) {
    return (
      <GlassGarnishForm
        disabled={disabled}
        onSubmit={(gg) => {
          setGlassGarnish(gg);
          setStep(2);
        }}
      />
    );
  }
  return (
    <MethodOrderForm
      steps={method}
      disabled={disabled}
      onSubmit={(order) =>
        onAnswer({ type: "bartender-build", rows, glass: glassGarnish.glass, garnish: glassGarnish.garnish, methodOrder: order })
      }
    />
  );
}
