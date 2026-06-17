// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { Doc } from "../src/doc";
import { saveDoc, loadDoc, clearDoc, loadPrefs, savePrefs } from "../src/storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadDoc()).toBeNull();
  });

  it("saves and restores a document state", () => {
    const d = new Doc(7, "underwood");
    d.strike("h");
    d.strike("i");
    saveDoc(d, 0); // 0 = no debounce delay
    const restored = loadDoc();
    expect(restored).not.toBeNull();
    expect(restored!.seed).toBe(7);
    expect(restored!.font).toBe("underwood");
    expect(restored!.strikes).toHaveLength(2);
  });

  it("clears stored state", () => {
    const d = new Doc(7, "courier");
    saveDoc(d, 0);
    clearDoc();
    expect(loadDoc()).toBeNull();
  });

  it("defaults prefs to repeat-suppressed when nothing is stored", () => {
    expect(loadPrefs()).toEqual({ allowRepeat: false });
  });

  it("round-trips the key-repeat preference", () => {
    savePrefs({ allowRepeat: true });
    expect(loadPrefs()).toEqual({ allowRepeat: true });
  });
});
