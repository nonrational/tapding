export interface FontDef {
  id: string;
  label: string;
  family: string;
  sizePx: number;
}

export const FONTS: FontDef[] = [
  { id: "courier", label: "Courier", family: "'Courier New', Courier, monospace", sizePx: 14 },
  { id: "underwood", label: "My Underwood", family: "'My Underwood'", sizePx: 16 },
  { id: "atype", label: "Another Typewriter", family: "'Another Typewriter'", sizePx: 15 },
  { id: "hermes", label: "Hermes", family: "'Hermes'", sizePx: 15 },
  { id: "travel", label: "Traveling Typewriter", family: "'Traveling Typewriter'", sizePx: 15 },
  { id: "erika", label: "Erika Ormig", family: "'Erika Ormig'", sizePx: 15 },
];

export const DEFAULT_FONT = "courier";

export function fontById(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
