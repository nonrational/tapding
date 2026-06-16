const KEY_SOUNDS = [
  "/sfx/key-new-01.mp3",
  "/sfx/key-new-02.mp3",
  "/sfx/key-new-03.mp3",
  "/sfx/key-new-04.mp3",
  "/sfx/key-new-05.mp3",
];

export class Audio_ {
  private keys: HTMLAudioElement[][] = [];
  private returnEl: HTMLAudioElement;
  private spaceEl: HTMLAudioElement;
  private backEl: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private poolIdx = 0;
  muted = false;

  constructor() {
    const make = (src: string) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    };
    this.keys = KEY_SOUNDS.map((src) => [make(src), make(src), make(src)]);
    this.returnEl = make("/sfx/return.mp3");
    this.spaceEl = make("/sfx/space.mp3");
    this.backEl = make("/sfx/backspace.mp3");
  }

  private play(el: HTMLAudioElement): void {
    if (this.muted) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }

  key(): void {
    if (this.muted) return;
    const set = this.keys[Math.floor(Math.random() * this.keys.length)];
    const el = set[this.poolIdx % set.length];
    this.poolIdx++;
    this.play(el);
  }

  space(): void {
    this.play(this.spaceEl);
  }

  back(): void {
    this.play(this.backEl);
  }

  ret(): void {
    this.play(this.returnEl);
  }

  // The margin bell is a short brass "ting" — not the carriage-return clip.
  // Synthesised so it stays distinct from ret(): a real typewriter rings while
  // you keep typing toward the right edge, it doesn't slam the carriage.
  bell(): void {
    if (this.muted) return;
    if (!this.ctx) this.ctx = new AudioContext();
    const ctx = this.ctx;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.4, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    env.connect(ctx.destination);

    // Fundamental plus an inharmonic partial give the little metallic shimmer.
    for (const [freq, level] of [[1180, 1], [3100, 0.35]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const mix = ctx.createGain();
      mix.gain.value = level;
      osc.connect(mix).connect(env);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }
}
