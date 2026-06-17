import { FONTS } from "./fonts";

export interface UI {
  feed: HTMLElement;
  fontSelect: HTMLSelectElement;
  muteBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  printBtn: HTMLButtonElement;
  inkBtn: HTMLButtonElement;
  setRibbon: (color: "black" | "red") => void;
  setMuted: (muted: boolean) => void;
  flashActivity: () => void;
}

// Phosphor icons (regular weight, MIT) rendered at 16px with fill=currentColor.
const phosphor = (path: string) =>
  `<svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true">${path}</svg>`;

const SPEAKER_ON = phosphor(
  '<path d="M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z"/>',
);

const SPEAKER_MUTED = phosphor(
  '<path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L73.55,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V175.09l42.08,46.29a8,8,0,1,0,11.84-10.76ZM32,96H72v64H32ZM144,207.64,88,164.09V95.89l56,61.6Zm42-63.77a24,24,0,0,0,0-31.72,8,8,0,1,1,12-10.57,40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.59Zm-80.16-76a8,8,0,0,1,1.4-11.23l39.85-31A8,8,0,0,1,160,32v74.83a8,8,0,0,1-16,0V48.36l-26.94,21A8,8,0,0,1,105.84,67.91ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z"/>',
);

const NEW_PAGE = phosphor(
  '<path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-40-64a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V160H104a8,8,0,0,1,0-16h16V128a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,152Z"/>',
);

const PRINTER = phosphor(
  '<path d="M214.67,72H200V40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V72H41.33C27.36,72,16,82.77,16,96v80a8,8,0,0,0,8,8H56v32a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8V184h32a8,8,0,0,0,8-8V96C240,82.77,228.64,72,214.67,72ZM72,48H184V72H72ZM184,208H72V160H184Zm40-40H200V152a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8v16H32V96c0-4.41,4.19-8,9.33-8H214.67c5.14,0,9.33,3.59,9.33,8Zm-24-52a12,12,0,1,1-12-12A12,12,0,0,1,200,116Z"/>',
);

const FONT_MARK = phosphor(
  '<path d="M87.24,52.59a8,8,0,0,0-14.48,0l-64,136a8,8,0,1,0,14.48,6.81L39.9,160h80.2l16.66,35.4a8,8,0,1,0,14.48-6.81ZM47.43,144,80,74.79,112.57,144ZM200,96c-12.76,0-22.73,3.47-29.63,10.32a8,8,0,0,0,11.26,11.36c3.8-3.77,10-5.68,18.37-5.68,13.23,0,24,9,24,20v3.22A42.76,42.76,0,0,0,200,128c-22.06,0-40,16.15-40,36s17.94,36,40,36a42.73,42.73,0,0,0,24-7.25,8,8,0,0,0,16-.75V132C240,112.15,222.06,96,200,96Zm0,88c-13.23,0-24-9-24-20s10.77-20,24-20,24,9,24,20S213.23,184,200,184Z"/>',
);

const SOURCE_MARK = phosphor(
  '<path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z"/>',
);

export function buildUI(mount: HTMLElement): UI {
  mount.innerHTML = "";
  mount.className = "desk";

  const feed = document.createElement("div");
  feed.id = "feed";

  const controls = document.createElement("div");
  controls.className = "controls";

  const fontSelect = document.createElement("select");
  fontSelect.className = "font-select";
  fontSelect.setAttribute("aria-label", "Typeface");
  for (const f of FONTS) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fontSelect.appendChild(opt);
  }

  const fontPicker = document.createElement("label");
  fontPicker.className = "font-picker";
  fontPicker.title = "Typeface";
  const typeMark = document.createElement("span");
  typeMark.className = "type-mark";
  typeMark.innerHTML = FONT_MARK;
  typeMark.setAttribute("aria-hidden", "true");
  fontPicker.append(typeMark, fontSelect);

  const inkBtn = document.createElement("button");
  inkBtn.className = "ctl ctl-ink";
  inkBtn.type = "button";
  const inkSwatch = document.createElement("span");
  inkSwatch.className = "ink-swatch";
  inkBtn.append(inkSwatch);

  const setRibbon = (color: "black" | "red") => {
    inkSwatch.dataset.color = color;
    inkBtn.title = `Ribbon: ${color}`;
    inkBtn.setAttribute("aria-label", `Ribbon: ${color}`);
  };
  setRibbon("black");

  const muteBtn = glyphButton("mute", SPEAKER_ON, "Mute");
  const clearBtn = glyphButton("clear", NEW_PAGE, "New page");
  const printBtn = glyphButton("print", PRINTER, "Print");

  const setMuted = (muted: boolean) => {
    muteBtn.innerHTML = muted ? SPEAKER_MUTED : SPEAKER_ON;
    const label = muted ? "Unmute" : "Mute";
    muteBtn.title = label;
    muteBtn.setAttribute("aria-label", label);
  };

  const source = document.createElement("a");
  source.className = "ctl ctl-source";
  source.href = "https://github.com/nonrational/tapding";
  source.target = "_blank";
  source.rel = "noopener";
  source.title = "Source";
  source.setAttribute("aria-label", "View source on GitHub");
  source.innerHTML = SOURCE_MARK;

  controls.append(inkBtn, fontPicker, muteBtn, clearBtn, printBtn, source);
  mount.append(feed, controls);

  let idle: ReturnType<typeof setTimeout> | undefined;
  const flashActivity = () => {
    mount.classList.add("typing");
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => mount.classList.remove("typing"), 1500);
  };

  return { feed, fontSelect, muteBtn, clearBtn, printBtn, inkBtn, setRibbon, setMuted, flashActivity };
}

function glyphButton(cls: string, svg: string, label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `ctl ctl-${cls}`;
  b.type = "button";
  b.innerHTML = svg;
  b.title = label;
  b.setAttribute("aria-label", label);
  return b;
}
