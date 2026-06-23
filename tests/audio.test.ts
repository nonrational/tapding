import { describe, it, expect } from "vitest";
import { Audio_ } from "../src/audio";

// A minimal Web Audio stand-in: records every source node it hands out so we can
// assert each sound gets its own, fire-and-forget node (the whole point of the fix).
class FakeSource {
  buffer: unknown = null;
  started = 0;
  connect(): void {}
  start(): void {
    this.started++;
  }
}
class FakeCtx {
  state: "suspended" | "running" = "suspended";
  destination = {};
  created: FakeSource[] = [];
  createGain() {
    return { connect() {}, gain: { value: 1 } };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.created.push(s);
    return s;
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

const make = () => {
  const ctx = new FakeCtx();
  const audio = new Audio_({
    context: ctx as unknown as AudioContext,
    load: (_ctx, src) => Promise.resolve({ src } as unknown as AudioBuffer),
  });
  return { ctx, audio };
};

describe("Audio_ (Web Audio)", () => {
  it("plays each keystroke on its own source node, no reuse", async () => {
    const { ctx, audio } = make();
    await audio.ready;
    audio.key();
    audio.key();
    expect(ctx.created).toHaveLength(2);
    expect(ctx.created[0]).not.toBe(ctx.created[1]); // overlapping, not a reused element
    expect(ctx.created.every((s) => s.started === 1)).toBe(true);
  });

  it("resumes a suspended context on the first sound (autoplay policy)", async () => {
    const { ctx, audio } = make();
    await audio.ready;
    expect(ctx.state).toBe("suspended");
    audio.key();
    expect(ctx.state).toBe("running");
  });

  it("makes no sound while muted", async () => {
    const { ctx, audio } = make();
    await audio.ready;
    audio.setMuted(true);
    audio.key();
    audio.space();
    audio.bell();
    audio.ret();
    audio.back();
    expect(ctx.created).toHaveLength(0);
  });

  it("routes every cue through the Web Audio graph", async () => {
    const { ctx, audio } = make();
    await audio.ready;
    audio.space();
    audio.back();
    audio.ret();
    audio.bell();
    expect(ctx.created).toHaveLength(4);
  });
});
