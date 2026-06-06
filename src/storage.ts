import type { Doc, DocState } from "./doc";

const KEY = "tapding:doc";
let timer: ReturnType<typeof setTimeout> | undefined;

export function saveDoc(doc: Doc, delay = 400): void {
  if (timer) clearTimeout(timer);
  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(doc.toState()));
    } catch {
      // quota or unavailable — autosave silently disabled
    }
  };
  if (delay <= 0) write();
  else timer = setTimeout(write, delay);
}

export function loadDoc(): DocState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DocState;
  } catch {
    return null;
  }
}

export function clearDoc(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
