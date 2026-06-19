import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<() => void>();

function tick() {
  now = Date.now();
  for (const cb of subscribers) cb();
}

function onVisible() {
  if (!document.hidden) tick();
}

function start() {
  if (timer !== null) return;
  timer = setInterval(() => { if (!document.hidden) tick(); }, TICK_MS);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", tick);
}

function stop() {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("focus", tick);
}

function subscribe(cb: () => void) {
  now = Date.now();
  subscribers.add(cb);
  if (subscribers.size === 1) start();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0) stop();
  };
}

const getSnapshot = () => now;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
