import { Doc } from "./doc";
import { Renderer } from "./render";
import { Audio_ } from "./audio";
import { attachInput } from "./input";
import { buildUI } from "./ui";
import { DEFAULT_FONT } from "./fonts";
import { saveDoc, loadDoc, clearDoc } from "./storage";

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

  let doc = makeDoc();
  ui.fontSelect.value = doc.font;
  ui.setRibbon(doc.ribbon);
  renderer.attach(doc);

  const wireDoc = (d: Doc) => {
    d.on((e) => {
      if (e === "bell") audio.bell();
      if (e === "ribbon") ui.setRibbon(d.ribbon);
      saveDoc(d);
    });
  };
  wireDoc(doc);

  let detach = attachInput({ doc, audio, onActivity: ui.flashActivity });

  ui.fontSelect.addEventListener("change", () => {
    doc.font = ui.fontSelect.value;
    renderer.renderAll();
    saveDoc(doc, 0);
  });

  ui.muteBtn.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    ui.muteBtn.textContent = audio.muted ? "muted" : "sound";
  });

  ui.clearBtn.addEventListener("click", () => {
    clearDoc();
    detach();
    doc = new Doc(newSeed(), doc.font);
    wireDoc(doc);
    renderer.attach(doc);
    ui.setRibbon(doc.ribbon);
    detach = attachInput({ doc, audio, onActivity: ui.flashActivity });
  });

  ui.inkBtn.addEventListener("click", () => {
    doc.toggleRibbon();
    ui.flashActivity();
  });

  ui.printBtn.addEventListener("click", () => window.print());
}

boot();
