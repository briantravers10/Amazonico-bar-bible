"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// Zustand's persisted store only reflects localStorage after the client mounts.
// Gate any UI that reads persisted state behind this so SSR and first client
// render match exactly (avoids hydration warnings + a flash of stale numbers).
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
