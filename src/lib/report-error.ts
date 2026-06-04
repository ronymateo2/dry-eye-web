const BASE = import.meta.env.VITE_API_URL ?? "/api";
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

const recent = new Set<string>();

export function reportError(error: unknown, context?: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = context ? `${context}: ${err.message}` : err.message;

  const sig = `${message}|${err.stack?.slice(0, 120) ?? ""}`;
  if (recent.has(sig)) return;
  recent.add(sig);
  setTimeout(() => recent.delete(sig), 30_000);

  const token = localStorage.getItem("weqe_token");
  void fetch(`${BASE}/errors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message: message.slice(0, 500),
      stack: err.stack?.slice(0, 4000),
      url: location.href,
      appVersion: APP_VERSION,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function installGlobalErrorReporting(): void {
  window.addEventListener("error", (e) => reportError(e.error ?? e.message, "window.onerror"));
  window.addEventListener("unhandledrejection", (e) =>
    reportError(e.reason, "unhandledrejection"),
  );
}
