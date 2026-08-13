"use client";

import type { GradeResult } from "@/lib/grading";
import { PrimaryButton } from "@/components/ui/Primitives";

function RowIcon({ status }: { status: "correct" | "wrong" | "missing" | "extra" }) {
  const map = {
    correct: { glyph: "✓", cls: "bg-good-soft text-good" },
    wrong: { glyph: "✕", cls: "bg-bad-soft text-bad" },
    missing: { glyph: "!", cls: "bg-bad-soft text-bad" },
    extra: { glyph: "?", cls: "bg-gold-soft text-gold" },
  } as const;
  const s = map[status];
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${s.cls}`}>{s.glyph}</span>;
}

export function FeedbackPanel({
  grade,
  onNext,
  nextLabel = "Next Question",
}: {
  grade: GradeResult;
  onNext: () => void;
  nextLabel?: string;
}) {
  const correct = grade.isFullyCorrect;
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl px-4 py-3.5 text-center font-display text-xl font-semibold ${
          correct ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
        }`}
      >
        {correct ? "Correct!" : "Not quite"}
      </div>

      {grade.ingredientRows && grade.ingredientRows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {grade.ingredientRows.map((row, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <RowIcon status={row.status} />
              <div className="min-w-0 flex-1 text-[13.5px]">
                {row.status === "missing" ? (
                  <p className="text-text">
                    Missing: <span className="font-semibold">{row.correctSpec}</span>
                  </p>
                ) : row.status === "extra" ? (
                  <p className="text-text-dim">
                    Not in this recipe: <span className="font-medium text-text">{row.userValue}</span>
                  </p>
                ) : (
                  <>
                    <p className="text-text-dim">
                      You: <span className="text-text">{row.userValue || "(blank)"}</span>
                    </p>
                    {row.status === "wrong" && (
                      <p className="text-good">
                        Correct: <span className="font-semibold">{row.correctSpec}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {grade.glass && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <RowIcon status={grade.glass.correct ? "correct" : "wrong"} />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="text-text-dim">
              Glass — you: <span className="text-text">{grade.glass.userValue || "(blank)"}</span>
            </p>
            {!grade.glass.correct && (
              <p className="text-good">
                Correct: <span className="font-semibold">{grade.glass.correctValue}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {grade.garnish && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <RowIcon status={grade.garnish.correct ? "correct" : "wrong"} />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="text-text-dim">
              Garnish — you: <span className="text-text">{grade.garnish.userValue || "(blank)"}</span>
            </p>
            {!grade.garnish.correct && (
              <p className="text-good">
                Correct: <span className="font-semibold">{grade.garnish.correctValue}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {grade.method && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <RowIcon status={grade.method.correct ? "correct" : "wrong"} />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="text-text-dim">Method order</p>
            {!grade.method.correct && (
              <p className="text-good">Correct: {grade.method.correctOrder.map((s, i) => `${i + 1}. ${s}`).join("  ")}</p>
            )}
          </div>
        </div>
      )}

      {!correct && (
        <div className="rounded-2xl border border-gold-soft bg-gold-soft/40 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gold">Full correct build</p>
          <ul className="flex flex-col gap-1 text-[14px] text-text">
            {grade.correctBuild.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <PrimaryButton onClick={onNext}>{nextLabel}</PrimaryButton>
    </div>
  );
}
