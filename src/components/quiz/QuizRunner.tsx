"use client";

import { useState } from "react";
import Link from "next/link";
import type { CocktailCategory } from "@/data/types";
import { getCocktail } from "@/data/cocktails";
import {
  learnQueue,
  mixedQueue,
  quickPracticeQueue,
  weakSpotsQueue,
  examQueue,
  resolveQuestionWithFallback,
  requeueOffset,
  type QueueEntry,
  type SessionMode,
} from "@/lib/session";
import { gradeQuestion, type Answer, type GradeResult } from "@/lib/grading";
import { FIELDS_TESTED_BY_LEVEL, type Level, type Question, type WeaknessField } from "@/lib/questionGen";
import { useBarTrainerStore } from "@/lib/store";
import { QuestionCard } from "./QuestionCard";
import { FeedbackPanel } from "./FeedbackPanel";
import { Card, PrimaryButton, ProgressBar, SecondaryButton, StatChip } from "@/components/ui/Primitives";

const MODE_TITLES: Record<SessionMode, string> = {
  learn: "Learn",
  quick: "Quick Practice",
  weak: "Weak Spots",
  exam: "Final Exam",
};

const FIELD_LABELS: Record<WeaknessField, string> = {
  ingredients: "Ingredients",
  specs: "Specs",
  glassware: "Glassware",
  garnish: "Garnishes",
  method: "Methods",
};

interface ExamTally {
  correct: number;
  total: number;
}

interface ExamAccum {
  fields: Partial<Record<WeaknessField, ExamTally>>;
  categories: Partial<Record<CocktailCategory, ExamTally>>;
  cocktailWrong: Record<string, number>;
  mistakes: { cocktailName: string; field: WeaknessField; expected: string; got: string }[];
}

function buildQueue(mode: SessionMode, category: CocktailCategory | "mixed"): QueueEntry[] {
  if (mode === "exam") return examQueue(20);
  if (mode === "weak") return weakSpotsQueue(15);
  if (mode === "quick") return quickPracticeQueue(category, 15);
  // learn
  return category === "mixed" ? mixedQueue() : learnQueue(category);
}

export function QuizRunner({ mode, category }: { mode: SessionMode; category: CocktailCategory | "mixed" }) {
  const [queue, setQueue] = useState<QueueEntry[]>(() => buildQueue(mode, category));
  const [pointer, setPointer] = useState(0);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [examAccum, setExamAccum] = useState<ExamAccum>({ fields: {}, categories: {}, cocktailWrong: {}, mistakes: [] });
  const recordAnswer = useBarTrainerStore((s) => s.recordAnswer);
  const globalStats = useBarTrainerStore((s) => s.stats);

  let resolved: { question: Question; level: Level; idx: number } | null = null;
  for (let i = pointer; i < queue.length; i++) {
    const r = resolveQuestionWithFallback(queue[i]);
    if (r) {
      resolved = { ...r, idx: i };
      break;
    }
  }

  if (queue.length === 0 || !resolved) {
    return <SessionSummary mode={mode} category={category} sessionStats={sessionStats} examAccum={examAccum} />;
  }

  const question: Question = resolved.question;
  const effectiveLevel = resolved.level;

  function handleAnswer(answer: Answer) {
    const g = gradeQuestion(question, answer);
    setGrade(g);

    const fieldsTested = FIELDS_TESTED_BY_LEVEL[effectiveLevel];
    const isProgression = mode === "learn" && effectiveLevel === queue[resolved!.idx].level;
    recordAnswer({ cocktailId: question.cocktailId, questionLevel: effectiveLevel, isProgressionAttempt: isProgression, grade: g, fieldsTested });

    setSessionStats((s) => ({ correct: s.correct + (g.isFullyCorrect ? 1 : 0), total: s.total + 1 }));

    if (mode === "exam") {
      const cat = getCocktail(question.cocktailId)?.category ?? "classic";
      setExamAccum((prev) => {
        const next: ExamAccum = {
          fields: { ...prev.fields },
          categories: { ...prev.categories },
          cocktailWrong: { ...prev.cocktailWrong },
          mistakes: [...prev.mistakes],
        };
        for (const field of fieldsTested) {
          const fieldCorrect = g.fields[field] ?? g.isFullyCorrect;
          const t = next.fields[field] ?? { correct: 0, total: 0 };
          next.fields[field] = { correct: t.correct + (fieldCorrect ? 1 : 0), total: t.total + 1 };
        }
        const ct = next.categories[cat] ?? { correct: 0, total: 0 };
        next.categories[cat] = { correct: ct.correct + (g.isFullyCorrect ? 1 : 0), total: ct.total + 1 };
        if (!g.isFullyCorrect) {
          next.cocktailWrong[question.cocktailName] = (next.cocktailWrong[question.cocktailName] ?? 0) + 1;
          if (g.ingredientRows) {
            for (const row of g.ingredientRows) {
              if (row.status === "wrong" || row.status === "missing") {
                next.mistakes.push({ cocktailName: question.cocktailName, field: "specs", expected: row.correctSpec, got: row.userValue || "(blank)" });
              }
            }
          }
        }
        return next;
      });
    }

    if (!g.isFullyCorrect && mode !== "exam") {
      const idx = resolved!.idx;
      setQueue((q) => {
        const copy = [...q];
        const insertAt = Math.min(copy.length, idx + requeueOffset());
        copy.splice(insertAt, 0, { cocktailId: question.cocktailId, level: queue[idx].level, isProgressionAttempt: isProgression });
        return copy;
      });
    }
  }

  function handleNext() {
    setGrade(null);
    setPointer(resolved!.idx + 1);
  }

  const total = queue.length;
  const progressPct = Math.round((pointer / Math.max(1, total)) * 100);
  const accuracy = sessionStats.total ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-[13px] font-medium text-text-dim">
          ← Exit
        </Link>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-dim">
          {MODE_TITLES[mode]} · {category === "mixed" ? "Mixed" : category}
        </p>
      </header>

      <ProgressBar value={progressPct} className="mb-3" />

      <div className="mb-4 grid grid-cols-4 gap-2">
        <StatChip label="Score" value={`${sessionStats.correct}/${sessionStats.total}`} />
        <StatChip label="Accuracy" value={`${accuracy}%`} />
        <StatChip label="Streak" value={globalStats.streak} />
        <StatChip label="XP" value={globalStats.xp} />
      </div>

      <Card className="flex-1 p-5">
        {grade ? (
          <FeedbackPanel grade={grade} onNext={handleNext} nextLabel={pointer + 1 >= queue.length ? "Finish" : "Next Question"} />
        ) : (
          <QuestionCard question={question} onAnswer={handleAnswer} disabled={false} />
        )}
      </Card>
    </div>
  );
}

function SessionSummary({
  mode,
  category,
  sessionStats,
  examAccum,
}: {
  mode: SessionMode;
  category: CocktailCategory | "mixed";
  sessionStats: { correct: number; total: number };
  examAccum: ExamAccum;
}) {
  const accuracy = sessionStats.total ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

  if (sessionStats.total === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-2xl font-semibold">Nothing to train yet</p>
        <p className="text-[14px] text-text-dim">
          There aren&rsquo;t enough unlocked cocktails for {MODE_TITLES[mode].toLowerCase()} in this category yet. Head back and unlock a batch first.
        </p>
        <Link href="/" className="w-full">
          <SecondaryButton>Back home</SecondaryButton>
        </Link>
      </div>
    );
  }

  if (mode === "exam") {
    return <ExamSummary sessionStats={sessionStats} accuracy={accuracy} examAccum={examAccum} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-text-dim">{MODE_TITLES[mode]} session complete</p>
      <p className="font-display text-4xl font-semibold">
        {sessionStats.correct} / {sessionStats.total}
      </p>
      <p className="font-display text-2xl text-accent">{accuracy}% accuracy</p>
      <div className="flex w-full gap-3">
        <Link href="/" className="flex-1">
          <SecondaryButton>Home</SecondaryButton>
        </Link>
        <Link href={`/play?mode=${mode}&category=${category}`} className="flex-1">
          <PrimaryButton>Go again</PrimaryButton>
        </Link>
      </div>
    </div>
  );
}

function ExamSummary({
  sessionStats,
  accuracy,
  examAccum,
}: {
  sessionStats: { correct: number; total: number };
  accuracy: number;
  examAccum: ExamAccum;
}) {
  const weakest = Object.entries(examAccum.cocktailWrong)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <div className="text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-gold">Final Score</p>
        <p className="font-display text-5xl font-semibold">
          {sessionStats.correct} / {sessionStats.total}
        </p>
        <p className="mt-1 font-display text-2xl text-accent">{accuracy}%</p>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-dim">By skill</p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(examAccum.fields).map(([field, t]) => (
            <BreakdownRow key={field} label={FIELD_LABELS[field as WeaknessField]} tally={t} />
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-dim">By category</p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(examAccum.categories).map(([cat, t]) => (
            <BreakdownRow key={cat} label={`${cat[0].toUpperCase()}${cat.slice(1)} Cocktails`} tally={t} />
          ))}
        </div>
      </Card>

      {weakest.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-dim">Weakest cocktails</p>
          <div className="flex flex-col gap-1">
            {weakest.map(([name, count]) => (
              <p key={name} className="text-[14px] text-text">
                {name} <span className="text-text-dim">— {count} miss{count > 1 ? "es" : ""}</span>
              </p>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/" className="flex-1">
          <SecondaryButton>Home</SecondaryButton>
        </Link>
        <Link href="/mistakes" className="flex-1">
          <PrimaryButton>Review mistakes</PrimaryButton>
        </Link>
      </div>
    </div>
  );
}

function BreakdownRow({ label, tally }: { label: string; tally: ExamTally }) {
  const pct = tally.total ? Math.round((tally.correct / tally.total) * 100) : 0;
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span className="text-text">{label}</span>
      <span className="font-mono font-semibold text-accent">{pct}%</span>
    </div>
  );
}
