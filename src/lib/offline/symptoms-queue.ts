import { get, set } from "idb-keyval";
import type { SaveSymptomEntryInput } from "@/types/domain";

const KEY = "weqe_pending_symptom_entries";

export async function queueSymptomEntry(input: SaveSymptomEntryInput): Promise<void> {
  try {
    const current = (await get<SaveSymptomEntryInput[]>(KEY)) ?? [];
    await set(KEY, [...current.filter((d) => d.id !== input.id), input]);
  } catch (err) {
    console.warn("Failed to queue symptom entry offline", err);
  }
}

export async function getPendingSymptomEntries(): Promise<SaveSymptomEntryInput[]> {
  try {
    return (await get<SaveSymptomEntryInput[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function removePendingSymptomEntry(id: string): Promise<void> {
  try {
    const current = (await get<SaveSymptomEntryInput[]>(KEY)) ?? [];
    await set(KEY, current.filter((d) => d.id !== id));
  } catch (err) {
    console.warn("Failed to remove pending symptom entry", err);
  }
}
