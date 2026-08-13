"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { cocktails, CATEGORY_LABELS } from "@/data/cocktails";
import type { Cocktail, CocktailCategory } from "@/data/types";
import { formatAmount } from "@/lib/format";
import { Card, Pill } from "@/components/ui/Primitives";

type FilterTab = "all" | CocktailCategory;

export default function StudyPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cocktails.filter((c) => {
      if (tab !== "all" && c.category !== tab) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.ingredients.some((i) => i.name.toLowerCase().includes(q));
    });
  }, [query, tab]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-14 pt-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-[13px] font-medium text-text-dim">
          ← Home
        </Link>
      </header>
      <h1 className="font-display text-3xl font-semibold text-text">Study Library</h1>
      <p className="-mt-2 text-[13px] text-text-dim">The official Amazonico recipe for every cocktail. Browsing here doesn&rsquo;t affect quiz scoring.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cocktail or ingredient…"
        className="rounded-full border border-border bg-surface px-4 py-3 text-[15px] text-text outline-none focus:border-accent"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "classic", "signature", "mocktail"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${
              tab === t ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text-dim"
            }`}
          >
            {t === "all" ? "All" : CATEGORY_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map((c) => (
          <CocktailEntry key={c.id} cocktail={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} />
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-[14px] text-text-dim">No cocktails match your search.</p>}
      </div>
    </div>
  );
}

function CocktailEntry({ cocktail, open, onToggle }: { cocktail: Cocktail; open: boolean; onToggle: () => void }) {
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="font-display text-[17px] font-semibold text-text">{cocktail.name}</span>
        <Pill tone={cocktail.category === "signature" ? "gold" : cocktail.category === "mocktail" ? "good" : "accent"}>{cocktail.category}</Pill>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <FieldBlock label="Ingredients">
            <ul className="flex flex-col gap-1">
              {cocktail.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between text-[14px] text-text">
                  <span>{ing.name}</span>
                  <span className="font-mono text-accent">{formatAmount(ing)}</span>
                </li>
              ))}
            </ul>
          </FieldBlock>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {cocktail.glass && <MiniField label="Glass" value={cocktail.glass} />}
            {cocktail.garnish && <MiniField label="Garnish" value={cocktail.garnish} />}
            {cocktail.ice && <MiniField label="Ice" value={cocktail.ice} />}
            {cocktail.batch && <MiniField label="Batch" value={cocktail.batch} />}
            {cocktail.style && <MiniField label="Style" value={cocktail.style} />}
            {cocktail.flavour && <MiniField label="Flavour" value={cocktail.flavour} />}
          </div>
          {cocktail.method && cocktail.method.length > 0 && (
            <FieldBlock label="Method" className="mt-3">
              <ol className="flex flex-col gap-1 list-decimal pl-4">
                {cocktail.method.map((step, i) => (
                  <li key={i} className="text-[14px] text-text">
                    {step}
                  </li>
                ))}
              </ol>
            </FieldBlock>
          )}
        </div>
      )}
    </Card>
  );
}

function FieldBlock({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
      {children}
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-dim">{label}</p>
      <p className="text-[13.5px] text-text">{value}</p>
    </div>
  );
}
