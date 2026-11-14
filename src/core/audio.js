// 칩튠 사운드 엔진: 외부 음원 없이 Web Audio로 실시간 합성
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.5;
    this.sfxVol = 0.7;
    this.track = null;
    this.want = null;
    this.step = 0;
    this.nextT = 0;
    this.timer = 0;
    this.lastHit = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.mus = ctx.createGain();
    this.sfx = ctx.createGain();
    this.mus.connect(this.master);
    this.sfx.connect(this.master);
    // 공간감용 딜레이
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.mus);
    this.applyVol();
    // 25% 펄스파
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    this.pulse = ctx.createPeriodicWave(re, im);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.want) this.play(this.want, true);
  }

  resume() {
    if (!this.ctx) this.init();
    else if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }

  setVol(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVol();
  }
  applyVol() {
    if (!this.ctx) return;
    this.mus.gain.value = this.musicVol * 0.55;
    this.sfx.gain.value = this.sfxVol * 0.8;
  }

  // ── 음 하나 ──
  tone(t, freq, dur, type, vol, dest, opt = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulse);
    else o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
    if (opt.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 5.5; lg.gain.value = freq * 0.012;
      l.connect(lg).connect(o.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    const g = ctx.createGain();
    const a = opt.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    if (opt.echo) g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseHit(t, dur, vol, freq, dest, type = 'highpass') {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  kick(t, vol) { this.tone(t, 150, 0.16, 'sine', vol, this.mus, { slide: 40 }); }

  // ── 음악 ──
  play(name, force) {
    this.want = name;
    if (!this.ctx) return;
    if (this.track && this.track.name === name && !force) return;
    this.track = TRACKS[name] ? { name, ...TRACKS[name] } : null;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() { this.track = null; this.want = null; }

  schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.track || ctx.state !== 'running') return;
    const tr = this.track;
    const sp = 60 / tr.bpm / 4; // 16분음표
    while (this.nextT < ctx.currentTime + 0.12) {
      tr.fn(this, this.step, this.nextT, sp);
      this.step++;
      this.nextT += sp;
    }
  }

  // ── 효과음 ──
  sfxPlay(name, arg) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.sfxVol <= 0) return;
    const t = ctx.currentTime + 0.005;
    const d = this.sfx;
    switch (name) {
      case 'click':
        this.tone(t, 1568, 0.35, 'sine', 0.12, d, { echo: true });
        this.tone(t, 3136, 0.2, 'sine', 0.04, d);
        break;
      case 'hover': this.tone(t, 2093, 0.08, 'sine', 0.03, d); break;
      case 'summon':
        [0, 4, 7].forEach((n, i) => this.tone(t + i * 0.045, mtof(72 + n), 0.12, 'pulse', 0.09, d));
        break;
      case 'rare': {
        const tier = arg || 2;
        const base = 72 + tier * 2;
        [0, 4, 7, 12, 16, 19].slice(0, 3 + tier).forEach((n, i) => this.tone(t + i * 0.06, mtof(base + n), 0.3, 'pulse', 0.09, d, { echo: true }));
        if (tier >= 4) this.tone(t + 0.4, mtof(base + 24), 0.8, 'triangle', 0.12, d, { echo: true, vib: true });
        break;
      }
      case 'merge':
        this.noiseHit(t, 0.15, 0.12, 3000, d);
        [0, 7, 12].forEach((n, i) => this.tone(t + 0.05 + i * 0.05, mtof(76 + (arg || 0) * 2 + n), 0.18, 'square', 0.06, d));
        break;
      case 'celestial':
        [0, 4, 7, 11, 14, 19, 24].forEach((n, i) => this.tone(t + i * 0.08, mtof(67 + n), 1.2, 'triangle', 0.1, d, { echo: true }));
        [0, 4, 7].forEach((n) => this.tone(t + 0.6, mtof(55 + n), 1.6, 'pulse', 0.05, d, { attack: 0.1 }));
        break;
      case 'fail':
        this.tone(t, 392, 0.5, 'square', 0.07, d, { slide: 98 });
        this.noiseHit(t + 0.05, 0.6, 0.12, 900, d, 'lowpass');
        this.tone(t + 0.45, 98, 0.25, 'triangle', 0.1, d);
        break;
      case 'coin':
        this.tone(t, 1319, 0.06, 'square', 0.05, d);
        this.tone(t + 0.06, 1760, 0.14, 'square', 0.05, d);
        break;
      case 'stone':
        [0, 7, 12, 19].forEach((n, i) => this.tone(t + i * 0.05, mtof(84 + n), 0.2, 'sine', 0.08, d));
        break;
      case 'hit': {
        if (t - this.lastHit < 0.045) return;
        this.lastHit = t;
        this.noiseHit(t, 0.04, 0.05, 2500, d);
        break;
      }
      case 'kill': {
        if (t - this.lastHit < 0.03) return;
        this.lastHit = t;
        this.tone(t, 220 + Math.random() * 60, 0.06, 'square', 0.035, d, { slide: 80 });
        break;
      }
      case 'boom':
        this.noiseHit(t, 0.35, 0.18, 600, d, 'lowpass');
        this.tone(t, 110, 0.3, 'sine', 0.12, d, { slide: 40 });
        break;
      case 'zap': this.noiseHit(t, 0.12, 0.08, 4000, d, 'bandpass'); break;
      case 'wave':
        this.tone(t, mtof(62), 0.18, 'pulse', 0.08, d);
        this.tone(t + 0.18, mtof(69), 0.35, 'pulse', 0.08, d, { echo: true });
        break;
      case 'boss':
        for (let i = 0; i < 3; i++) this.tone(t + i * 0.32, mtof(38), 0.28, 'square', 0.12, d, { slide: mtof(36) });
        this.noiseHit(t, 1.2, 0.08, 300, d, 'lowpass');
        break;
      case 'alarm': this.tone(t, 880, 0.12, 'square', 0.05, d); this.tone(t + 0.15, 660, 0.12, 'square', 0.05, d); break;
      case 'wall': this.noiseHit(t, 0.3, 0.16, 400, d, 'lowpass'); this.tone(t, 80, 0.3, 'square', 0.08, d, { slide: 40 }); break;
      case 'upgrade': [0, 4, 7, 12].forEach((n, i) => this.tone(t + i * 0.04, mtof(79 + n), 0.12, 'square', 0.05, d)); break;
      case 'skill':
        [0, 2, 4, 7, 9, 12].forEach((n, i) => this.tone(t + i * 0.04, mtof(81 + n), 0.1, 'pulse', 0.06, d));
        break;
      case 'judgment':
        this.tone(t, mtof(48), 0.9, 'square', 0.1, d, { slide: mtof(36) });
        [0, 7, 12].forEach((n) => this.tone(t + 0.05, mtof(72 + n), 0.8, 'triangle', 0.07, d, { echo: true }));
        break;
      case 'timestop': this.tone(t, 1760, 0.6, 'sine', 0.08, d, { slide: 220, echo: true }); break;
      case 'sell': this.tone(t, 988, 0.08, 'square', 0.05, d); this.tone(t + 0.08, 784, 0.12, 'square', 0.05, d); break;
      case 'deny': this.tone(t, 150, 0.12, 'square', 0.06, d); break;
      case 'victory': {
        const m = [67, 72, 76, 79, 84];
        m.forEach((n, i) => this.tone(t + i * 0.12, mtof(n), 0.4, 'pulse', 0.09, d, { echo: true }));
        [60, 64, 67, 72].forEach((n) => this.tone(t + 0.65, mtof(n), 1.6, 'triangle', 0.08, d, { attack: 0.05 }));
        break;
      }
      case 'defeat': {
        [67, 63, 60, 55].forEach((n, i) => this.tone(t + i * 0.35, mtof(n), 0.5, 'triangle', 0.1, d, { echo: true, vib: true }));
        break;
      }
    }
  }
}

// ── 곡 (16분음표 단위 스텝 함수) ──
const N = (s) => s.split(' ').map((x) => (x === '.' ? -1 : +x));

const LOBBY_CH = [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]]; // Dm Bb F C
const LOBBY_MEL = N('74 . . . . . 72 . 69 . . . . . . . 70 . . . 69 . 67 . 65 . . . . . . . 69 . . . 72 . . . 74 . 72 . 69 . . . 67 . . . . . . . . . . . . . . .');

const BATTLE_CH = [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]]; // Am F C G
const BATTLE_MEL = N('69 . 72 . 76 . 74 72 . . 69 . 67 . 69 . 65 . 69 . 72 . 74 . 72 . . . 69 . . . 67 . 72 . 76 . 79 . 77 76 . 74 . 72 . 74 . 71 . 74 . 79 . 77 . 74 . . . 71 . . .');

const BOSS_CH = [[38, 45, 50, 53], [34, 41, 46, 50], [43, 50, 55, 58], [45, 52, 57, 61]]; // Dm Bb Gm A
const BOSS_MEL = N('74 . 74 77 . 74 . 72 74 . . . 69 . 70 . 72 . 72 74 . 72 . 70 69 . . . 65 . 67 . 67 . 67 70 . 74 . 77 79 . 77 . 74 . 70 . 69 . 69 73 . 76 . 81 . 79 . 77 . 76 . 73 .');

const TRACKS = {
  lobby: {
    bpm: 66,
    fn(a, step, t, sp) {
      const bar = ((step / 16) | 0) % 4, s = step % 16;
      const ch = LOBBY_CH[bar];
      if (s % 2 === 0) {
        const n = ch[[0, 1, 2, 3, 2, 1, 3, 2][(s / 2) | 0]];
        a.tone(t, mtof(n + 12), sp * 3.5, 'triangle', 0.07, a.mus, { echo: true });
      }
      if (s === 0) a.tone(t, mtof(ch[0] - 12), sp * 15, 'triangle', 0.09, a.mus, { attack: 0.2 });
      const m = LOBBY_MEL[step % LOBBY_MEL.length];
      if (m > 0 && ((step / 64) | 0) % 2 === 1) a.tone(t, mtof(m), sp * 6, 'pulse', 0.035, a.mus, { echo: true, vib: true, attack: 0.03 });
    },
  },
  battle: {
    bpm: 138,
    fn(a, step, t, sp) {
      const bar = ((step / 16) | 0) % 4, s = step % 16;
      const ch = BATTLE_CH[bar];
      if (s % 2 === 0) a.tone(t, mtof(ch[0] - 12 + (s % 4 === 2 ? 12 : 0)), sp * 1.6, 'triangle', 0.16, a.mus);
      a.tone(t, mtof(ch[1 + (s % 3)] + 12), sp * 0.9, 'square', 0.022, a.mus);
      if (s % 4 === 0) a.kick(t, 0.22);
      if (s % 8 === 4) a.noiseHit(t, 0.12, 0.09, 1800, a.mus, 'bandpass');
      if (s % 2 === 1) a.noiseHit(t, 0.03, 0.03, 8000, a.mus);
      const sec = ((step / 64) | 0) % 2;
      const m = BATTLE_MEL[(step % 64)];
      if (sec === 1 && m > 0) a.tone(t, mtof(m), sp * 1.8, 'pulse', 0.05, a.mus, { vib: true });
    },
  },
  boss: {
    bpm: 156,
    fn(a, step, t, sp) {
      const bar = ((step / 16) | 0) % 4, s = step % 16;
      const ch = BOSS_CH[bar];
      a.tone(t, mtof(ch[0] - 12 + (s % 2 ? 12 : 0)), sp * 0.9, 'square', 0.05, a.mus);
      if (s % 4 === 0 || s === 10) a.kick(t, 0.26);
      if (s % 8 === 4) a.noiseHit(t, 0.14, 0.11, 1600, a.mus, 'bandpass');
      a.noiseHit(t, 0.02, 0.025, 9000, a.mus);
      const m = BOSS_MEL[step % 64];
      if (m > 0) a.tone(t, mtof(m), sp * 1.7, 'pulse', 0.045, a.mus, { vib: true });
      if (s % 4 === 2) a.tone(t, mtof(ch[2] + 12), sp * 0.8, 'triangle', 0.04, a.mus);
    },
  },
};

export const audio = new Audio();
