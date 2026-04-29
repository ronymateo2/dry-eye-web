const STORAGE_KEY = "weqe_last_drop";

export interface LastDropData {
  id: string;
  logged_at: string;
  quantity: number;
  eye: string;
  drop_type_name: string;
  drop_type_id: string;
}

type Listener = () => void;

function readFromStorage(): LastDropData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastDropData) : null;
  } catch {
    return null;
  }
}

let _data: LastDropData | null = readFromStorage();
const _listeners = new Set<Listener>();

export function subscribeLastDrop(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getLastDropSnapshot(): LastDropData | null {
  return _data;
}

export function setLastDrop(data: LastDropData | null): void {
  _data = data;
  try {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  _listeners.forEach((l) => l());
}
