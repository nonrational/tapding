const KEY_SOUNDS = [
  "/sfx/key-new-01.mp3",
  "/sfx/key-new-02.mp3",
  "/sfx/key-new-03.mp3",
  "/sfx/key-new-04.mp3",
  "/sfx/key-new-05.mp3",
];
const BELL = "/sfx/bell.mp3";
const RETURN = "/sfx/carriage_return.mp3";
const SPACE = "/sfx/space.mp3";
const BACK = "/sfx/backspace.mp3";

export interface AudioDeps {
  // Injected in tests; in the browser we create a real AudioContext.
  context?: AudioContext | null;
  // Injected in tests; defaults to fetch + decodeAudioData.
  load?: (ctx: AudioContext, src: string) => Promise<AudioBuffer>;
}

// Sound effects through the Web Audio API. Each clip is decoded once into an
// AudioBuffer; every cue spawns a fresh, fire-and-forget AudioBufferSourceNode.
// Source nodes are cheap and overlap freely, so rapid typing stays crisp — unlike
// a pooled HTMLAudioElement, which has to seek-restart a still-playing clip and
// serializes the calls, lagging and batching the clicks.
export class Audio_ {
  muted = false;
  // Resolves once every clip is decoded; tests await it, the app ignores it.
  ready: Promise<void>;
  private ctx: AudioContext | null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();

  constructor(deps: AudioDeps = {}) {
    this.ctx = deps.context ?? createContext();
    if (!this.ctx) {
      this.ready = Promise.resolve();
      return;
    }
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const load = deps.load ?? defaultLoad;
    const sources = [...KEY_SOUNDS, BELL, RETURN, SPACE, BACK];
    this.ready = Promise.all(
      sources.map((src) =>
        load(this.ctx!, src)
          .then((buf) => void this.buffers.set(src, buf))
          .catch(() => {}), // a missing clip just stays silent
      ),
    ).then(() => {});
  }

  private play(src: string): void {
    if (this.muted || !this.ctx || !this.master) return;
    const buf = this.buffers.get(src);
    if (!buf) return; // not decoded yet — skip rather than stall
    // The context starts suspended (created before any gesture); the first keystroke
    // is itself a gesture, so resuming here satisfies the autoplay policy.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const node = this.ctx.createBufferSource();
    node.buffer = buf;
    node.connect(this.master);
    node.start();
  }

  key(): void {
    this.play(KEY_SOUNDS[Math.floor(Math.random() * KEY_SOUNDS.length)]);
  }

  space(): void {
    this.play(SPACE);
  }

  back(): void {
    this.play(BACK);
  }

  ret(): void {
    this.play(RETURN);
  }

  bell(): void {
    this.play(BELL);
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }
}

function createContext(): AudioContext | null {
  const Ctor =
    (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

async function defaultLoad(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  const res = await fetch(src);
  const data = await res.arrayBuffer();
  return await ctx.decodeAudioData(data);
}
