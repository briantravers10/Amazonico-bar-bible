"use client";

import Link from "next/link";
import { useState } from "react";
import type { CocktailCategory } from "@/data/types";
import { cocktailsByCategory, CATEGORY_LABELS } from "@/data/cocktails";
import { useBarTrainerStore } from "@/lib/store";
import { categoryProgressPct, categoryFrontierLevel, masteredCount, startedCount } from "@/lib/progress";
import { useHydrated } from "@/lib/useHydrated";
import { Card, Pill, PrimaryButton, ProgressBar, SecondaryButton, StatChip } from "@/components/ui/Primitives";

export default function Home() {
  const hydrated = useHydrated();
  const stats = useBarTrainerStore((s) => s.stats);
  const mixedUnlocked = useBarTrainerStore((s) => s.isMixedPracticeUnlocked());

  const accuracy = stats.questionsAnswered ? Math.round((stats.correctAnswered / stats.questionsAnswered) * 100) : 0;
  const totalCocktails = cocktailsByCategory("classic").length + cocktailsByCategory("signature").length + cocktailsByCategory("mocktail").length;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-14 pt-8">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold">Amazonico Miami · Bar Bible</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-text">AmazonICO Bar Trainer</h1>
      </header>

      {hydrated ? (
        <div className="grid grid-cols-4 gap-2">
          <StatChip label="Accuracy" value={`${accuracy}%`} />
          <StatChip label="Streak" value={stats.streak} />
          <StatChip label="XP" value={stats.xp} />
          <StatChip label="Mastered" value={`${masteredCount()}/${totalCocktails}`} />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl border border-border bg-surface-2" />
          ))}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <CategoryCard category="classic" hydrated={hydrated} />
        <CategoryCard category="signature" hydrated={hydrated} />
        <CategoryCard category="mocktail" hydrated={hydrated} compact />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-text">Practice modes</h2>
        <div className="grid grid-cols-2 gap-3">
          <ModeCard href="/play?mode=quick&category=mixed" title="Quick Practice" desc="Random questions from what you've unlocked." />
          <ModeCard href="/play?mode=weak&category=mixed" title="Weak Spots" desc="Extra reps on what trips you up." />
        </div>
        <ModeCard
          href="/play?mode=learn&category=mixed"
          title="Mixed Practice"
          desc={hydrated && mixedUnlocked ? "Classics and Signatures together." : "Unlocks once you've progressed in both Classic and Signature."}
          locked={hydrated && !mixedUnlocked}
        />
        <ModeCard href="/play?mode=exam&category=mixed" title="Final Exam" desc="Everything you've unlocked, no assistance, full breakdown." gold />
      </section>

      <section className="flex gap-3">
        <Link href="/study" className="flex-1">
          <SecondaryButton>📖 Study Library</SecondaryButton>
        </Link>
        <Link href="/mistakes" className="flex-1">
          <SecondaryButton>🎯 Mistakes</SecondaryButton>
        </Link>
      </section>

      {hydrated && <BatchSizeSettings />}

      {hydrated && <p className="text-center text-[12px] text-text-dim">{startedCount()} of {totalCocktails} cocktails started</p>}
    </div>
  );
}

function CategoryCard({ category, hydrated, compact = false }: { category: CocktailCategory; hydrated: boolean; compact?: boolean }) {
  const count = cocktailsByCategory(category).length;
  const pct = hydrated ? categoryProgressPct(category) : 0;
  const level = hydrated ? categoryFrontierLevel(category) : 1;

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`font-display font-semibold text-text ${compact ? "text-base" : "text-xl"}`}>{CATEGORY_LABELS[category]}</h3>
        <Pill tone={category === "signature" ? "gold" : category === "mocktail" ? "good" : "accent"}>{count} drinks</Pill>
      </div>
      {!compact && (
        <>
          <ProgressBar value={pct} className="mb-2" />
          <div className="mb-3 flex items-center justify-between text-[13px] text-text-dim">
            <span>Progress: {hydrated ? pct : "–"}%</span>
            <span>Current Level: {hydrated ? level : "–"}</span>
          </div>
        </>
      )}
      <Link href={`/play?mode=learn&category=${category}`}>
        <PrimaryButton className={compact ? "py-2.5 text-[13px]" : ""}>{compact ? "Practice Mocktails" : "Continue Training"}</PrimaryButton>
      </Link>
    </Card>
  );
}

function ModeCard({ href, title, desc, locked, gold }: { href: string; title: string; desc: string; locked?: boolean; gold?: boolean }) {
  const content = (
    <Card className={`p-4 h-full ${locked ? "opacity-50" : ""} ${gold ? "border-gold-soft" : ""}`}>
      <h3 className="font-display text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 text-[12.5px] text-text-dim">{desc}</p>
    </Card>
  );
  if (locked) return content;
  return <Link href={href}>{content}</Link>;
}

function BatchSizeSettings() {
  const settings = useBarTrainerStore((s) => s.categorySettings);
  const setBatchSize = useBarTrainerStore((s) => s.setBatchSize);
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[13px] font-semibold text-text-dim">Batch size settings</span>
        <span className="text-text-dim">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {(["classic", "signature", "mocktail"] as CocktailCategory[]).map((cat) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-[13px] text-text">{CATEGORY_LABELS[cat]}</span>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-lg border border-border text-text"
                  onClick={() => setBatchSize(cat, Math.max(2, (settings[cat]?.batchSize ?? 5) - 1))}
                >
                  −
                </button>
                <span className="w-6 text-center font-mono text-text">{settings[cat]?.batchSize ?? 5}</span>
                <button
                  className="h-8 w-8 rounded-lg border border-border text-text"
                  onClick={() => setBatchSize(cat, Math.min(15, (settings[cat]?.batchSize ?? 5) + 1))}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
