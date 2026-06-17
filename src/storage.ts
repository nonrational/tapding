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

const PREFS_KEY = "tapding:prefs";

// Control-pill preferences, kept apart from the document. An object so future
// toggles can join without reshaping callers.
export interface Prefs {
  allowRepeat: boolean;
}

const DEFAULT_PREFS: Prefs = { allowRepeat: false };

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // unavailable or malformed — fall back to defaults
  }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // quota or unavailable — preference simply won't persist
  }
}
