import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getDayKey(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleDateString("en-CA", { timeZone: timezone });
}

export function formatLoggedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `hoy, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `ayer, ${time}`;
  return d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }) + `, ${time}`;
}

export function formatTimeAgo(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  return diffDays === 1 ? "hace 1 dia" : `hace ${diffDays} dias`;
}
