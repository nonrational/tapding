import type { Doc } from "./doc";
import type { Audio_ } from "./audio";
import { createJam } from "./jam";

export interface InputDeps {
  doc: Doc;
  audio: Audio_;
  onActivity: () => void;
  // Fired when two adjacent keys clash — the visual jam cue lives in the renderer.
  onJam: () => void;
  // Read live so the control-pill toggle takes effect without re-attaching.
  allowRepeat: () => boolean;
  now?: () => number;
}

export function attachInput(deps: InputDeps): () => void {
  const { doc, audio, onActivity, onJam, allowRepeat } = deps;
  const now = deps.now ?? (() => performance.now());
  const jam = createJam();

  const handler = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // let browser shortcuts through

    // A held key auto-repeats; a real typewriter doesn't, unless the typist opts in.
    if (e.repeat && !allowRepeat()) {
      e.preventDefault();
      return;
    }

    const t = now();
    // While the hammers are jammed, the keyboard is locked.
    if (jam.isJammed(t)) {
      e.preventDefault();
      return;
    }

    // Anything that isn't a printable character breaks the typebar timing chain.
    if (e.key.length !== 1 || e.key === " ") jam.reset();

    if (e.key === "Escape") {
      e.preventDefault();
      doc.toggleRibbon();
      onActivity();
      return;
    }
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
      if (jam.offer(e.key, t) === "jam") {
        onJam();
        onActivity();
        return;
      }
      doc.strike(e.key);
      audio.key();
      onActivity();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
