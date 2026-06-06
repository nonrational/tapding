const KEY_SOUNDS = [
  "/sfx/key-new-01.mp3",
  "/sfx/key-new-02.mp3",
  "/sfx/key-new-03.mp3",
  "/sfx/key-new-04.mp3",
  "/sfx/key-new-05.mp3",
];

export class Audio_ {
  private keys: HTMLAudioElement[][] = [];
  private bellEl: HTMLAudioElement;
  private returnEl: HTMLAudioElement;
  private spaceEl: HTMLAudioElement;
  private backEl: HTMLAudioElement;
  private poolIdx = 0;
  muted = false;

  constructor() {
    const make = (src: string) => {
      const a = new Audio(src);
      a.preload = "auto";
      return a;
    };
    this.keys = KEY_SOUNDS.map((src) => [make(src), make(src), make(src)]);
    this.bellEl = make("/sfx/return.mp3");
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

  bell(): void {
    this.play(this.bellEl);
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }
}
