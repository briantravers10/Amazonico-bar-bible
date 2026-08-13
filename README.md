# AmazonICO Bar Trainer

A mobile-first web app for memorizing the Amazonico Miami cocktail menu, built as a progressive, game-like learning tool. Source of truth for every recipe is `src/data/cocktails.json`, extracted directly from the AMZ Miami Bar Bible PDF (Bartender Manual).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Zustand (with `persist` middleware → `localStorage`)
- No backend — this is a personal learning tool. The store is structured so a database/account layer could be swapped in later without touching the question-generation or grading logic.

## Data

- `src/data/cocktails.json` — structured recipe data (105 cocktails: 89 Classic, 13 Signature, 3 Mocktails). Each entry carries `flags` documenting anything unclear, incomplete, duplicated, or inconsistent in the source PDF — nothing was silently "fixed" using outside cocktail knowledge.
- `src/data/types.ts` — the `Cocktail`/`Ingredient` schema.
- There is currently no "Favourites" category — the PDF's table of contents lists one, but no such section exists in the document body (see the flags on the Mocktails entries and the dataset review for details).

## How the learning system works

- `src/lib/questionGen.ts` generates all 8 question levels dynamically from the cocktail data — no question is hardcoded.
- `src/lib/grading.ts` grades a submitted answer field-by-field (ingredients / specs / glassware / garnish / method) and always returns the full correct build so the UI can show it on any miss.
- `src/lib/store.ts` tracks per-cocktail level progress, mastery streaks, batch unlocking, XP, streaks, and mistakes, persisted to `localStorage`.
- `src/lib/session.ts` builds the question queue per session mode (Learn / Quick Practice / Weak Spots / Final Exam) and re-inserts missed questions a few slots later (spaced repetition within a session).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Push to GitHub and import the repo on [Vercel](https://vercel.com/new) — no configuration needed, it's a standard Next.js app.
