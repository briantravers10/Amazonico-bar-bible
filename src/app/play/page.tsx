"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { CocktailCategory } from "@/data/types";
import type { SessionMode } from "@/lib/session";

// QuizRunner builds its question queue with randomness and reads localStorage-backed
// progress on first render — neither can match between server and client, so it must
// never be server-rendered (avoids a hydration mismatch on every session).
const QuizRunner = dynamic(() => import("@/components/quiz/QuizRunner").then((m) => m.QuizRunner), { ssr: false });

function PlayInner() {
  const params = useSearchParams();
  const mode = (params.get("mode") ?? "learn") as SessionMode;
  const category = (params.get("category") ?? "classic") as CocktailCategory | "mixed";
  return <QuizRunner key={`${mode}-${category}-${params.toString()}`} mode={mode} category={category} />;
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}
