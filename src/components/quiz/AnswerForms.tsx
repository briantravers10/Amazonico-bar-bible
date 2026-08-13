"use client";

import { useState } from "react";
import type { Ingredient } from "@/data/types";
import { formatAmount } from "@/lib/format";
import { shuffle } from "@/lib/random";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Primitives";

export function McOptions({
  options,
  onSubmit,
  disabled,
}: {
  options: string[][];
  onSubmit: (index: number) => void;
  disabled: boolean;
}) {
  const letters = ["A", "B", "C", "D"];
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt, i) => (
        <button
          key={i}
          disabled={disabled}
          onClick={() => onSubmit(i)}
          className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-60"
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
            {letters[i]}
          </span>
          <span className="text-[15px] leading-snug text-text">{opt.join(" / ")}</span>
        </button>
      ))}
    </div>
  );
}

export function RecallList({
  labels,
  onSubmit,
  disabled,
  placeholder = "e.g. 0.75 oz",
}: {
  labels: string[];
  onSubmit: (values: string[]) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const [values, setValues] = useState<string[]>(() => labels.map(() => ""));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-3"
    >
      {labels.map((label, i) => (
        <div key={i} className="flex flex-col gap-1">
          <label className="text-[13px] font-medium text-text-dim">{label}</label>
          <input
            disabled={disabled}
            value={values[i]}
            onChange={(e) => setValues((v) => v.map((val, idx) => (idx === i ? e.target.value : val)))}
            placeholder={placeholder}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text outline-none focus:border-accent"
          />
        </div>
      ))}
      <PrimaryButton type="submit" disabled={disabled}>
        Submit answer
      </PrimaryButton>
    </form>
  );
}

export function IngredientRowsForm({
  minRows,
  onSubmit,
  disabled,
}: {
  minRows: number;
  onSubmit: (rows: { name: string; amountRaw: string }[]) => void;
  disabled: boolean;
}) {
  const [rows, setRows] = useState<{ name: string; amountRaw: string }[]>(() =>
    Array.from({ length: Math.max(1, minRows) }, () => ({ name: "", amountRaw: "" }))
  );

  function update(i: number, field: "name" | "amountRaw", value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(rows);
      }}
      className="flex flex-col gap-3"
    >
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input
            disabled={disabled}
            value={row.amountRaw}
            onChange={(e) => update(i, "amountRaw", e.target.value)}
            placeholder="Amount"
            className="w-24 shrink-0 rounded-xl border border-border bg-surface-2 px-3 py-3 text-[16px] text-text outline-none focus:border-accent"
          />
          <input
            disabled={disabled}
            value={row.name}
            onChange={(e) => update(i, "name", e.target.value)}
            placeholder="Ingredient"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-3 text-[16px] text-text outline-none focus:border-accent"
          />
          {!disabled && rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              className="w-9 shrink-0 rounded-xl border border-border text-text-dim"
              aria-label="Remove ingredient"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { name: "", amountRaw: "" }])}
          className="rounded-xl border border-dashed border-border py-2.5 text-[14px] font-medium text-text-dim"
        >
          + Add ingredient
        </button>
      )}
      <PrimaryButton type="submit" disabled={disabled}>
        Submit answer
      </PrimaryButton>
    </form>
  );
}

export function GlassGarnishForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (values: { glass: string; garnish: string }) => void;
  disabled: boolean;
}) {
  const [glass, setGlass] = useState("");
  const [garnish, setGarnish] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ glass, garnish });
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[13px] font-medium text-text-dim">Glass?</label>
        <input
          disabled={disabled}
          value={glass}
          onChange={(e) => setGlass(e.target.value)}
          placeholder="e.g. Coupe"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text outline-none focus:border-accent"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[13px] font-medium text-text-dim">Garnish?</label>
        <input
          disabled={disabled}
          value={garnish}
          onChange={(e) => setGarnish(e.target.value)}
          placeholder="e.g. Dry lime"
          className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-text outline-none focus:border-accent"
        />
      </div>
      <PrimaryButton type="submit" disabled={disabled}>
        Submit answer
      </PrimaryButton>
    </form>
  );
}

export function MethodOrderForm({
  steps,
  onSubmit,
  disabled,
}: {
  steps: string[];
  onSubmit: (order: string[]) => void;
  disabled: boolean;
}) {
  const [shuffled] = useState(() => shuffle(steps));
  const [picked, setPicked] = useState<string[]>([]);

  function pick(step: string) {
    if (disabled || picked.includes(step)) return;
    setPicked((p) => [...p, step]);
  }
  function undo() {
    setPicked((p) => p.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[13px] font-medium text-text-dim">Your build order</p>
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface-2 p-3 min-h-[56px]">
          {picked.length === 0 && <p className="text-[13px] text-text-dim">Tap the steps below in order…</p>}
          {picked.map((step, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[14px]">
              <span className="font-mono text-accent">{i + 1}.</span> {step}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {shuffled
          .filter((s) => !picked.includes(s))
          .map((step) => (
            <button
              key={step}
              disabled={disabled}
              onClick={() => pick(step)}
              className="rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[14px] text-text active:scale-[0.98]"
            >
              {step}
            </button>
          ))}
      </div>
      <div className="flex gap-2">
        <SecondaryButton onClick={undo} disabled={disabled || picked.length === 0}>
          Undo
        </SecondaryButton>
        <PrimaryButton onClick={() => onSubmit(picked)} disabled={disabled || picked.length !== steps.length}>
          Submit order
        </PrimaryButton>
      </div>
    </div>
  );
}

export function ingredientLabel(ing: Ingredient): string {
  return ing.name;
}
export { formatAmount };
