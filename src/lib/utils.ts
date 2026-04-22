import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getDayKey(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA", { timeZone: timezone });
}
