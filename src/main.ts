import { Doc } from "./doc";
import { Renderer } from "./render";
import { Audio_ } from "./audio";
import { attachInput } from "./input";
import { attachWhiteout } from "./whiteout";
import { buildUI } from "./ui";
import { DEFAULT_FONT } from "./fonts";
import { saveDoc, loadDoc, clearDoc, loadPrefs, savePrefs } from "./storage";

function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function makeDoc(): Doc {
  const saved = loadDoc();
  return saved ? Doc.fromState(saved) : new Doc(newSeed(), DEFAULT_FONT);
}

function boot(): void {
  const mount = document.getElementById("app")!;
  const ui = buildUI(mount);
  const audio = new Audio_();
  const renderer = new Renderer(ui.feed);

  let allowRepeat = loadPrefs().allowRepeat;

  let doc = makeDoc();
  ui.fontSelect.value = doc.font;
  ui.setRibbon(doc.ribbon);
  ui.setMuted(audio.muted);
  ui.setRepeat(allowRepeat);
  renderer.attach(doc);

  const wireDoc = (d: Doc) => {
    d.on((e) => {
      if (e === "bell") audio.bell();
      if (e === "ribbon") ui.setRibbon(d.ribbon);
      saveDoc(d);
    });
  };
  wireDoc(doc);

  const inputDeps = () => ({
    doc,
    audio,
    onActivity: ui.flashActivity,
    onJam: () => renderer.flashJam(),
    allowRepeat: () => allowRepeat,
  });
  let detach = attachInput(inputDeps());
  let detachWhiteout = attachWhiteout({ doc, renderer, feed: ui.feed, onActivity: ui.flashActivity });

  ui.repeatBtn.addEventListener("click", () => {
    allowRepeat = !allowRepeat;
    ui.setRepeat(allowRepeat);
    savePrefs({ allowRepeat });
  });

  ui.fontSelect.addEventListener("change", () => {
    doc.font = ui.fontSelect.value;
    renderer.renderAll();
    saveDoc(doc, 0);
  });

  ui.muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.setMuted(audio.muted);
  });

  ui.clearBtn.addEventListener("click", () => {
    clearDoc();
    detach();
    detachWhiteout();
    doc = new Doc(newSeed(), doc.font);
    wireDoc(doc);
    renderer.attach(doc);
    ui.setRibbon(doc.ribbon);
    detach = attachInput(inputDeps());
    detachWhiteout = attachWhiteout({ doc, renderer, feed: ui.feed, onActivity: ui.flashActivity });
  });

  ui.inkBtn.addEventListener("click", () => {
    doc.toggleRibbon();
    ui.flashActivity();
  });

  ui.printBtn.addEventListener("click", () => window.print());
}

boot();
