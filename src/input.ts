import type { Doc } from "./doc";
import type { Audio_ } from "./audio";

export interface InputDeps {
  doc: Doc;
  audio: Audio_;
  onActivity: () => void;
}

export function attachInput(deps: InputDeps): () => void {
  const { doc, audio, onActivity } = deps;

  const handler = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // let browser shortcuts through

    if (e.key === "Backspace") {
      e.preventDefault();
      doc.carriageBack();
      audio.back();
      onActivity();
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault(); // no deletion, ever
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doc.carriageReturn();
      audio.ret();
      onActivity();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      doc.tab();
      audio.key();
      onActivity();
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      doc.space();
      audio.space();
      onActivity();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      doc.strike(e.key);
      audio.key();
      onActivity();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
