const BASE = import.meta.env.VITE_API_URL ?? "/api";

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn("[http] VITE_API_URL no definido en producción — usando /api");
}

function getToken(): string | null {
  return localStorage.getItem("weqe_token");
}

export function setToken(token: string): void {
  localStorage.setItem("weqe_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("weqe_token");
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/";
    }
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, text || res.statusText);
  }

  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
