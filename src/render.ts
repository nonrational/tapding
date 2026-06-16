import type { Doc, Strike } from "./doc";
import { PAGE, SHEET_W, SHEET_H, pageSkew } from "./geometry";
import { fontById } from "./fonts";

export class Renderer {
  private root: HTMLElement;
  private cursor: HTMLElement;
  private sheets: HTMLElement[] = [];
  private doc!: Doc;

  constructor(root: HTMLElement) {
    this.root = root;
    this.cursor = document.createElement("div");
    this.cursor.className = "cursor";
  }

  attach(doc: Doc): void {
    this.doc = doc;
    this.renderAll();
    doc.on((e) => {
      if (e === "strike") this.appendStrike(this.doc.strikes[this.doc.strikes.length - 1]);
      else if (e === "newpage") this.ensureSheets();
      this.positionCursor();
    });
  }

  renderAll(): void {
    this.root.innerHTML = "";
    this.sheets = [];
    const font = fontById(this.doc.font);
    this.root.style.setProperty("--type-family", font.family);
    this.root.style.setProperty("--type-size", `${font.sizePx}px`);
    this.ensureSheets();
    for (const s of this.doc.strikes) this.appendStrike(s);
    this.positionCursor();
  }

  private ensureSheets(): void {
    const want = Math.max(this.doc.pageCount(), this.sheets.length);
    while (this.sheets.length < want) this.addSheet();
  }

  private addSheet(): void {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.style.width = `${SHEET_W}px`;
    sheet.style.height = `${SHEET_H}px`;
    const page = this.sheets.length;
    sheet.style.transformOrigin = "center";
    sheet.style.transform = `rotate(${pageSkew(this.doc.seed, page)}deg)`;
    this.root.appendChild(sheet);
    this.sheets.push(sheet);
  }

  private appendStrike(s: Strike): void {
    while (this.sheets.length <= s.page) this.addSheet();
    const el = document.createElement("span");
    el.className = "glyph";
    if (s.ribbon === "red") el.classList.add("ink-red");
    el.textContent = s.char;
    el.style.left = `${PAGE.marginX + s.col * PAGE.colWidth}px`;
    el.style.top = `${PAGE.marginY + s.row * PAGE.rowHeight}px`;
    el.style.opacity = String(s.jitter.ink);
    el.style.transform = `translate(${s.jitter.dx}px, ${s.jitter.dy}px) rotate(${s.jitter.rot}deg)`;
    this.sheets[s.page].appendChild(el);
  }

  private positionCursor(): void {
    const c = this.doc.carriage;
    while (this.sheets.length <= c.page) this.addSheet();
    this.sheets[c.page].appendChild(this.cursor);
    const displayCol = Math.min(c.col, PAGE.cols - 1);
    this.cursor.style.left = `${PAGE.marginX + displayCol * PAGE.colWidth}px`;
    this.cursor.style.top = `${PAGE.marginY + c.row * PAGE.rowHeight}px`;
    this.cursor.style.width = `${PAGE.colWidth}px`;
    this.cursor.style.height = `${PAGE.rowHeight}px`;
    this.cursor.scrollIntoView?.({ block: "nearest" });
  }
}
