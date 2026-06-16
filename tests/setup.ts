// Node 26 ships an experimental global `localStorage` that resolves to `undefined`
// unless the process is started with `--localstorage-file`, and it shadows jsdom's
// implementation. Install a minimal in-memory shim so storage tests have a working
// localStorage regardless of the Node flag.
function isUsable(ls: unknown): ls is Storage {
  return !!ls && typeof (ls as Storage).clear === "function";
}

if (!isUsable((globalThis as { localStorage?: unknown }).localStorage)) {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: shim,
  });
}
