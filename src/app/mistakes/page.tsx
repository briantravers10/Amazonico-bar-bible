"use client";

import Link from "next/link";
import { cocktails } from "@/data/cocktails";
import { useBarTrainerStore, type CocktailState } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Card, Pill, PrimaryButton } from "@/components/ui/Primitives";
import type { WeaknessField } from "@/lib/questionGen";

const FIELD_LABELS: Record<WeaknessField, string> = {
  ingredients: "Ingredients",
  specs: "Specs",
  glassware: "Glassware",
  garnish: "Garnish",
  method: "Method",
};

function weakestField(cs: CocktailState): WeaknessField | null {
  let worst: WeaknessField | null = null;
  let worstRate = 0;
  for (const [field, tally] of Object.entries(cs.fieldStats)) {
    if (!tally || tally.wrong === 0) continue;
    const rate = tally.wrong / (tally.correct + tally.wrong);
    if (rate >= worstRate) {
      worstRate = rate;
      worst = field as WeaknessField;
    }
  }
  return worst;
}

export default function MistakesPage() {
  const hydrated = useHydrated();
  const cocktailState = useBarTrainerStore((s) => s.cocktailState);

  const entries = cocktails
    .map((c) => ({ cocktail: c, cs: cocktailState[c.id] }))
    .filter((e) => e.cs && Object.keys(e.cs.missCounters).length > 0)
    .sort((a, b) => totalMisses(b.cs!) - totalMisses(a.cs!));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-14 pt-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-[13px] font-medium text-text-dim">
          ← Home
        </Link>
      </header>
      <h1 className="font-display text-3xl font-semibold text-text">Mistakes</h1>
      <p className="-mt-2 text-[13px] text-text-dim">Cocktails you&rsquo;ve struggled with, and exactly why.</p>

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface-2" />
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[14px] text-text-dim">No mistakes logged yet — nice. Once you miss something, it&rsquo;ll show up here.</p>
        </Card>
      ) : (
        <>
          <Link href="/play?mode=weak&category=mixed">
            <PrimaryButton>Practice weak spots</PrimaryButton>
          </Link>
          <div className="flex flex-col gap-2.5">
            {entries.map(({ cocktail, cs }) => (
              <MistakeCard key={cocktail.id} name={cocktail.name} cs={cs!} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function totalMisses(cs: CocktailState): number {
  return Object.values(cs.missCounters).reduce((a, b) => a + b, 0);
}

function MistakeCard({ name, cs }: { name: string; cs: CocktailState }) {
  const weak = weakestField(cs);
  const topMissed = Object.entries(cs.missCounters).sort((a, b) => b[1] - a[1])[0];
  const recentMistake = cs.mistakes[0];

  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-text">{name}</h3>
        <span className="text-[13px] font-mono text-bad">{totalMisses(cs)} miss{totalMisses(cs) !== 1 ? "es" : ""}</span>
      </div>
      {weak && <Pill tone="bad">Weakness: {FIELD_LABELS[weak]}</Pill>}
      {topMissed && recentMistake && (
        <div className="mt-2.5 rounded-xl bg-bad-soft/60 px-3 py-2.5 text-[13.5px]">
          <p className="text-text-dim">Most missed:</p>
          <p className="text-text">
            {recentMistake.got !== "(blank)" ? `${recentMistake.got} → ` : ""}
            correct answer <span className="font-semibold">{recentMistake.expected}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
