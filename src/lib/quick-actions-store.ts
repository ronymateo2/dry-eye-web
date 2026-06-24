import { useSyncExternalStore } from "react";

export type QuickActionSheet =
  | "drop" | "sleep" | "obs" | "hygiene" | "therapy"
  | "medication-intake" | "vial" | "symptoms" | null;

type QuickActionState = { sheet: QuickActionSheet; dropTypeId?: string };

let state: QuickActionState = { sheet: null };
const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

const getSnapshot = () => state;

export function openQuickAction(sheet: QuickActionSheet, dropTypeId?: string) {
  state = { sheet, dropTypeId };
  for (const cb of subscribers) cb();
}

export function closeQuickAction() {
  state = { sheet: null };
  for (const cb of subscribers) cb();
}

export function useQuickAction() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
