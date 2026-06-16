import { FONTS } from "./fonts";

export interface UI {
  feed: HTMLElement;
  fontSelect: HTMLSelectElement;
  muteBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  printBtn: HTMLButtonElement;
  inkBtn: HTMLButtonElement;
  setRibbon: (color: "black" | "red") => void;
  flashActivity: () => void;
}

export function buildUI(mount: HTMLElement): UI {
  mount.innerHTML = "";
  mount.className = "desk";

  const feed = document.createElement("div");
  feed.id = "feed";

  const controls = document.createElement("div");
  controls.className = "controls";

  const fontSelect = document.createElement("select");
  fontSelect.className = "font-select";
  for (const f of FONTS) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fontSelect.appendChild(opt);
  }

  const inkBtn = document.createElement("button");
  inkBtn.className = "ctl ctl-ink";
  inkBtn.type = "button";
  const inkSwatch = document.createElement("span");
  inkSwatch.className = "ink-swatch";
  const inkLabel = document.createElement("span");
  inkBtn.append(inkSwatch, inkLabel);

  const setRibbon = (color: "black" | "red") => {
    inkSwatch.dataset.color = color;
    inkLabel.textContent = color;
  };
  setRibbon("black");

  const muteBtn = button("mute", "sound");
  const clearBtn = button("clear", "clear");
  const printBtn = button("print", "print");

  const source = document.createElement("a");
  source.className = "ctl ctl-source";
  source.href = "https://github.com/nonrational/tapding";
  source.target = "_blank";
  source.rel = "noopener";
  source.title = "source";
  source.setAttribute("aria-label", "View source on GitHub");
  source.innerHTML =
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38' +
    " 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53" +
    ".63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95" +
    " 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27" +
    "1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48" +
    " 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z\"/></svg>";

  controls.append(inkBtn, fontSelect, muteBtn, clearBtn, printBtn, source);
  mount.append(feed, controls);

  let idle: ReturnType<typeof setTimeout> | undefined;
  const flashActivity = () => {
    mount.classList.add("typing");
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => mount.classList.remove("typing"), 1500);
  };

  return { feed, fontSelect, muteBtn, clearBtn, printBtn, inkBtn, setRibbon, flashActivity };
}

function button(cls: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `ctl ctl-${cls}`;
  b.type = "button";
  b.textContent = label;
  return b;
}
