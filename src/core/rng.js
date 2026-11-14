// 시드 기반 난수 (mulberry32) — 협동 판정·재현용
export class RNG {
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.s = seed >>> 0;
  }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) { return (this.next() * n) | 0; }
  pick(arr) { return arr[(this.next() * arr.length) | 0]; }
  chance(p) { return this.next() < p; }
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (this.next() * (i + 1)) | 0;
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
}
