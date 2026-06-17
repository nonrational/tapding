// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Doc } from "../src/doc";
import { attachInput } from "../src/input";

const stubAudio = () =>
  ({ key() {}, space() {}, back() {}, ret() {}, bell() {} }) as never;

function press(key: string, opts: { repeat?: boolean } = {}): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, repeat: !!opts.repeat, cancelable: true }));
}

describe("attachInput key repeat", () => {
  it("suppresses auto-repeat strikes when repeat is disallowed", () => {
    const doc = new Doc(1, "courier");
    const detach = attachInput({
      doc, audio: stubAudio(), onActivity: () => {}, onJam: () => {}, allowRepeat: () => false,
    });
    press("a"); // genuine press -> strikes
    press("a", { repeat: true }); // auto-repeat -> ignored
    press("a", { repeat: true });
    expect(doc.strikes).toHaveLength(1);
    detach();
  });

  it("lets auto-repeat through when repeat is allowed", () => {
    const doc = new Doc(1, "courier");
    const detach = attachInput({
      doc, audio: stubAudio(), onActivity: () => {}, onJam: () => {}, allowRepeat: () => true,
    });
    press("a");
    press("a", { repeat: true });
    expect(doc.strikes).toHaveLength(2);
    detach();
  });
});

describe("attachInput typebar jam", () => {
  it("swallows the second adjacent key, fires onJam, then locks input", () => {
    const doc = new Doc(1, "courier");
    let t = 1000;
    let jams = 0;
    const detach = attachInput({
      doc,
      audio: stubAudio(),
      onActivity: () => {},
      onJam: () => {
        jams++;
      },
      allowRepeat: () => false,
      now: () => t,
    });
    press("r"); // prints
    t = 1010;
    press("t"); // adjacent within window -> jam, nothing prints
    expect(doc.strikes).toHaveLength(1);
    expect(jams).toBe(1);
    t = 1500; // still within the lock window
    press("y");
    expect(doc.strikes).toHaveLength(1);
    detach();
  });

  it("does not jam two adjacent keys separated by a space", () => {
    const doc = new Doc(1, "courier");
    let t = 1000;
    let jams = 0;
    const detach = attachInput({
      doc, audio: stubAudio(), onActivity: () => {},
      onJam: () => { jams++; }, allowRepeat: () => false, now: () => t,
    });
    press("r");
    t = 1005;
    press(" "); // breaks the timing chain
    t = 1010;
    press("t");
    expect(jams).toBe(0);
    expect(doc.strikes).toHaveLength(2); // r and t both printed
    detach();
  });
});
