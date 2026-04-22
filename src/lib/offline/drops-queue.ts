import { get, set } from "idb-keyval";
import type { SaveDropInput } from "@/types/domain";

const KEY = "weqe_pending_drops";

export async function queueDrop(input: SaveDropInput): Promise<void> {
  try {
    const current = (await get<SaveDropInput[]>(KEY)) ?? [];
    await set(KEY, [...current.filter((d) => d.id !== input.id), input]);
  } catch (err) {
    console.warn("Failed to queue drop offline", err);
  }
}

export async function getPendingDrops(): Promise<SaveDropInput[]> {
  try {
    return (await get<SaveDropInput[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function removePendingDrop(id: string): Promise<void> {
  try {
    const current = (await get<SaveDropInput[]>(KEY)) ?? [];
    await set(KEY, current.filter((d) => d.id !== id));
  } catch (err) {
    console.warn("Failed to remove pending drop", err);
  }
}

export async function getPendingDropsCount(): Promise<number> {
  return (await getPendingDrops()).length;
}
