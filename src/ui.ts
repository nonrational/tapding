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

  controls.append(inkBtn, fontSelect, muteBtn, clearBtn, printBtn);
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
