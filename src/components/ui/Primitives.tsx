import type { ReactNode } from "react";

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2.5 w-full rounded-full bg-border/60 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "gold" | "good" | "bad" }) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-surface-2 text-text-dim border-border",
    accent: "bg-accent-soft text-accent border-transparent",
    gold: "bg-gold-soft text-gold border-transparent",
    good: "bg-good-soft text-good border-transparent",
    bad: "bg-bad-soft text-bad border-transparent",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.15)] ${className}`}>
      {children}
    </div>
  );
}

export function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface-2 border border-border px-3 py-2.5 min-w-[76px]">
      <span className="font-display text-lg font-semibold tabular-nums text-text">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-text-dim">{label}</span>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl bg-btn px-5 py-4 text-center text-[15px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border border-border bg-surface px-5 py-4 text-center text-[15px] font-semibold text-text transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
