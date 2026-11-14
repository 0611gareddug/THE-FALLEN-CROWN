// 전투 화면 렌더러
import { SPR } from './sprites.js';
import { drawNum, fmtNum } from './pixelfont.js';
import { TIERS, RECIPES } from '../data/units.js';

// 진화 표식 ▲▲ (색별로 한 번만 굽는다)
const EVO = [
  '...ooo...',
  '..oyyyo..',
  '.oyyyyyo.',
  'oyyoooyyo',
  'ooo...ooo',
  '...ooo...',
  '..oyyyo..',
  '.oyyyyyo.',
  'oyyoooyyo',
  'ooo...ooo',
];
const evoCache = new Map();
function evoBadge(col) {
  let c = evoCache.get(col);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 9; c.height = 10;
  const g = c.getContext('2d');
  EVO.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = ch === 'o' ? '#1b1622' : y % 5 === 1 ? '#ffffff' : col;
    g.fillRect(x, y, 1, 1);
  }));
  evoCache.set(col, c);
  return c;
}
import { W, H, COLS, ROWS, CELL, BX, BY, PL, PR, PT, PB, PERIM, cellX, cellY, pathPos } from '../game/layout.js';

const RAINBOW = ['#ff6b6b', '#ffb36b', '#ffe36b', '#7fe08a', '#6bc8ff', '#c99bff'];
const PCOL = {
  arrow: '#e8d8b0', bolt: '#c0c8d8', fire: '#ff8a3a', ice: '#a8e4ff', holy: '#fff2a8', dagger: '#d8dce8',
  flask: '#9be08a', star: '#ffe36b', snipe: '#ffb070', clock: '#c99bff', meteor: '#ff7a2a', mini: '#ff9a4a',
  rain: '#e0f0ff', shadow: '#8a5ad0',
};
const BOOM_COL = { fire: ['#ff8a3a', '#ffe36b'], flask: ['#9be08a', '#e0ffd0'], meteor: ['#ff7a2a', '#ffe36b'], star: ['#ffe36b', '#ffffff'], mini: ['#ff9a4a', '#ffd08a'], melee: ['#ffffff', '#c9a85c'], shadow: ['#8a5ad0', '#1a1020'] };
const TMP = { x: 0, y: 0, dx: 0, dy: 0 };

export class Renderer {
  constructor(canvas, settings) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.settings = settings;
    this.parts = [];
    this.ppool = [];
    this.nums = [];
    this.npool = [];
    this.fx = [];
    this.shake = 0;
    this.flash = null;
    this.t = 0;
    this.drag = null;
    this.selected = -1;
    this.scale = 1;
    this.view = { x: 0, y: 0, w: W, h: H };
    this._readyT = 0;
    this._ready = new Set();
    this.buildStatic();
  }

  // 보여줄 영역(논리 좌표)과 배율. 가로 화면에서는 전장만 잘라 크게 보여준다.
  resize(scale, view) {
    this.scale = scale;
    this.view = view || { x: 0, y: 0, w: W, h: H };
    this.cv.width = Math.round(this.view.w * scale);
    this.cv.height = Math.round(this.view.h * scale);
  }

  // ── 정적 배경 (아트 해상도 180×320) ──
  buildStatic() {
    const c = document.createElement('canvas');
    c.width = W / 2; c.height = H / 2;
    const g = c.getContext('2d');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#0d0f15';
    g.fillRect(0, 0, c.width, c.height);
    // 필드 바닥
    const fx0 = 4, fy0 = 48, fx1 = 176, fy1 = 148;
    g.fillStyle = '#171920';
    g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    for (let i = 0; i < 700; i++) {
      const x = fx0 + ((rnd() * (fx1 - fx0)) | 0), y = fy0 + ((rnd() * (fy1 - fy0)) | 0);
      g.fillStyle = rnd() < 0.5 ? '#1c1e26' : '#13151b';
      g.fillRect(x, y, 1, 1);
    }
    // 길 (중심선 기준 폭 14 아트 px)
    const lane = (x, y, w, h) => {
      g.fillStyle = '#2b2830';
      g.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 3)
        for (let xx = x + ((yy / 3) % 2 ? 2 : 0); xx < x + w; xx += 4) {
          g.fillStyle = rnd() < 0.5 ? '#36323c' : '#312d37';
          g.fillRect(xx, yy, 3, 2);
        }
    };
    const l = PL / 2 - 7, r = PR / 2 - 7, t = PT / 2 - 7, b = PB / 2 - 7;
    lane(l, t, r - l + 14, 14);
    lane(l, b, r - l + 14, 14);
    lane(l, t, 14, b - t + 14);
    lane(r, t, 14, b - t + 14);
    // 길 가장자리
    g.fillStyle = '#0b0c10';
    g.fillRect(l, t, r - l + 14, 1); g.fillRect(l, b + 13, r - l + 14, 1);
    g.fillRect(l, t, 1, b - t + 14); g.fillRect(r + 13, t, 1, b - t + 14);
    g.fillStyle = '#4a4552';
    g.fillRect(l + 14, t + 14, r - l - 14, 1); g.fillRect(l + 14, b - 1, r - l - 14, 1);
    g.fillRect(l + 14, t + 14, 1, b - t - 14); g.fillRect(r - 1, t + 14, 1, b - t - 14);
    // 보드 칸
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = (BX + (i % COLS) * CELL) / 2, y = (BY + ((i / COLS) | 0) * CELL) / 2;
      g.fillStyle = '#101118';
      g.fillRect(x + 1, y + 1, 22, 22);
      g.fillStyle = '#1d1f29';
      g.fillRect(x + 2, y + 2, 20, 20);
      g.fillStyle = '#252836';
      g.fillRect(x + 2, y + 2, 20, 1); g.fillRect(x + 2, y + 2, 1, 20);
      g.fillStyle = '#14151c';
      g.fillRect(x + 2, y + 21, 20, 1); g.fillRect(x + 21, y + 2, 1, 20);
      // 바닥 문양
      g.fillStyle = '#20232e';
      g.fillRect(x + 11, y + 10, 2, 4); g.fillRect(x + 10, y + 11, 4, 2);
    }
    // 시작 지점 (무너진 문)
    g.fillStyle = '#0a0a0e';
    g.fillRect(l - 1, t - 4, 16, 18);
    g.fillStyle = '#3a3542';
    g.fillRect(l - 3, t - 6, 3, 20); g.fillRect(l + 14, t - 6, 3, 20); g.fillRect(l - 3, t - 7, 20, 3);
    g.fillStyle = '#5a2a22';
    g.fillRect(l + 2, t - 2, 10, 2);
    this.bg = c;
  }

  // ── 파티클 ──
  part(x, y, vx, vy, life, col, size = 2, grav = 0) {
    if (this.parts.length > (this.settings.low ? 120 : 480)) return;
    const p = this.ppool.pop() || {};
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.col = col; p.size = size; p.g = grav;
    this.parts.push(p);
  }
  burst(x, y, n, cols, spd = 60, life = 0.5, size = 2, grav = 0) {
    if (this.settings.low) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), cols[i % cols.length], size, grav);
    }
  }
  num(x, y, v, crit) {
    if (!this.settings.dmgNums) return;
    if (this.nums.length >= 28) { const old = this.nums.shift(); this.npool.push(old); }
    const n = this.npool.pop() || {};
    n.x = x + (Math.random() * 8 - 4); n.y = y; n.s = typeof v === 'string' ? v : fmtNum(v); n.t = 0; n.crit = crit;
    this.nums.push(n);
  }
  addFx(o) { this.fx.push(o); }
  doShake(v) { if (this.settings.shake) this.shake = Math.max(this.shake, v); }

  // ── 이벤트 처리 ──
  handle(ev, battle) {
    switch (ev.type) {
      case 'dmg': this.num(ev.x, ev.y, ev.v, ev.crit); break;
      case 'summon': case 'gambleWin': case 'merge': {
        const x = cellX(ev.cell), y = cellY(ev.cell);
        const col = TIERS[ev.tier].glow;
        this.burst(x, y + 6, 10 + ev.tier * 6, [col, '#ffffff'], 50 + ev.tier * 15, 0.6, 2, -40);
        if (ev.tier >= 2) this.addFx({ k: 'pillar', x, y, col: TIERS[ev.tier].color, t: 0, d: 0.9 + ev.tier * 0.15, w: 10 + ev.tier * 3 });
        if (ev.tier >= 4) this.doShake(5);
        if (ev.type === 'merge') for (const c of ev.from) this.burst(cellX(c), cellY(c), 8, ['#c8c8d8', '#6a6a7a'], 40, 0.4);
        break;
      }
      case 'celestial': {
        const x = cellX(ev.cell), y = cellY(ev.cell);
        this.addFx({ k: 'pillar', x, y, col: '#ffffff', t: 0, d: 2, w: 26, rainbow: true });
        this.addFx({ k: 'ring', x, y, r0: 4, r1: 260, t: 0, d: 1.2, col: '#ffffff', rainbow: true });
        this.burst(x, y, 60, RAINBOW, 160, 1.2, 2, -20);
        this.doShake(8);
        break;
      }
      case 'gambleFail': {
        // 잿더미가 흩날리는 꽝 연출
        const x = W / 2, y = 196;
        this.burst(x, y, 40, ['#6a6470', '#3a3540', '#9a94a0'], 90, 1.2, 2, 30);
        break;
      }
      case 'sell': this.burst(cellX(ev.cell), cellY(ev.cell), 10, ['#e8c25a', '#a87a2a'], 50, 0.5, 2, 60); break;
      case 'slash': this.addFx({ k: 'slash', x: ev.x, y: ev.y, t: 0, d: 0.14, big: ev.big, col: ev.tier >= 4 ? '#ffe36b' : '#ffffff', a: Math.random() * 6 }); break;
      case 'zap': this.addFx({ k: 'zap', pts: ev.pts, t: 0, d: 0.12 }); break;
      case 'beam': this.addFx({ k: 'beam', x: ev.x, y: ev.y, x2: ev.x2, y2: ev.y2, t: 0, d: 0.28 }); this.doShake(2); break;
      case 'boom': {
        const cols = BOOM_COL[ev.kind] || ['#ffffff', '#c0c0c0'];
        this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 2, r1: ev.r, t: 0, d: 0.25, col: cols[0] });
        this.burst(ev.x, ev.y, Math.min(16, 4 + ev.r / 4), cols, ev.r * 2.2, 0.4);
        if (ev.kind === 'meteor') this.doShake(3);
        break;
      }
      case 'hit': if (!this.settings.low) this.burst(ev.x, ev.y, 2, [PCOL[ev.kind] || '#fff'], 40, 0.18, 1); break;
      case 'miss': this.num(ev.x, ev.y - 4, '0', false); break;
      case 'kill': {
        if (ev.boss) {
          this.burst(ev.x, ev.y, 80, ['#ff8a3a', '#ffe36b', '#5a4a46', '#ffffff'], 180, 1.4, 3, 20);
          this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 4, r1: 300, t: 0, d: 1, col: '#ffe36b' });
          this.doShake(10);
        } else this.burst(ev.x, ev.y, 6, ['#5a5560', '#8a8490', '#2a2630'], 40, 0.5, 2, 20);
        break;
      }
      case 'ash': this.burst(ev.x, ev.y, 5, ['#8a8490', '#3a3540'], 30, 1, 2, -10); break;
      case 'execute': this.num(ev.x, ev.y - 14, '!!', true); break;
      case 'stone': this.addFx({ k: 'stone', x: ev.x, y: ev.y, t: 0, d: 1 }); break;
      case 'judgment':
        this.flash = { col: '#ffe36b', t: 0, d: 0.35, a: 0.35 };
        this.doShake(6);
        for (const e of battle.enemies) if (e.alive) this.addFx({ k: 'slash', x: e.x, y: e.y, t: 0, d: 0.25, big: true, col: '#ffe36b', a: 0 });
        break;
      case 'timeStop': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 4, r1: 320, t: 0, d: 0.6, col: '#c99bff' }); break;
      case 'roar': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 6, r1: 70, t: 0, d: 0.4, col: '#ff8a3a' }); this.doShake(3); break;
      case 'wallHit': this.flash = { col: '#e0463a', t: 0, d: 0.4, a: ev.why === 'timeout' ? 0.35 : 0.22 }; this.doShake(ev.why ? 6 : 0); break;
      case 'skill': {
        this.flash = { col: ev.awake ? '#ffffff' : '#ffe36b', t: 0, d: ev.awake ? 0.8 : 0.3, a: ev.awake ? 0.7 : 0.15 };
        if (ev.targets) for (const [x, y] of ev.targets) this.addFx({ k: 'slash', x, y, t: 0, d: 0.3, big: true, col: '#ffb070', a: 0 });
        if (ev.eaten !== undefined) { this.burst(ev.x, ev.y, 24, ['#8a5a2a', '#e8c25a', '#ffffff'], 120, 0.6); this.doShake(4); }
        if (ev.awake) this.doShake(12);
        break;
      }
      case 'corrupt': this.burst(cellX(ev.cell), cellY(ev.cell), 16, ['#c99bff', '#5a2a6a'], 70, 0.6); break;
      case 'cleanse': if (ev.done) this.burst(cellX(ev.cell), cellY(ev.cell), 18, ['#ffffff', '#fff2a8'], 90, 0.6, 2, -40); break;
      case 'freeze': this.flash = { col: '#a8e4ff', t: 0, d: 0.5, a: 0.25 }; this.doShake(4); break;
      case 'icebreak': if (ev.done) this.burst(cellX(ev.cell), cellY(ev.cell), 14, ['#a8e4ff', '#ffffff'], 90, 0.5, 2, 60); break;
      case 'steal': this.burst(ev.x, ev.y - 10, 18, ['#e8c25a', '#a87a2a'], 80, 0.7, 2, 40); break;
      case 'ashrain': this.flash = { col: '#6a6470', t: 0, d: 0.6, a: 0.3 }; break;
      case 'split': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 6, r1: 90, t: 0, d: 0.6, col: '#c99bff' }); this.doShake(5); break;
      case 'heal': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 4, r1: ev.r, t: 0, d: 0.5, col: '#9be08a' }); break;
      case 'raise': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 4, r1: 40, t: 0, d: 0.5, col: '#c99bff' }); break;
      case 'enrage': this.addFx({ k: 'ring', x: ev.x, y: ev.y, r0: 4, r1: 50, t: 0, d: 0.5, col: '#ff6b6b' }); this.doShake(3); break;
      case 'eliteDown': this.burst(ev.x, ev.y, 30, ['#ffe36b', '#c99bff', '#ffffff'], 120, 0.8, 2, 20); break;
      case 'eat': this.burst(ev.x, ev.y, 4, ['#8a5a2a'], 40, 0.3); break;
      case 'immune': this.num(ev.x, ev.y, '0', false); break;
      case 'upgrade': {
        for (let i = 0; i < COLS * ROWS; i++) {
          const u = battle.units[i];
          if (u && Math.min(2, u.def.tier <= 1 ? 0 : u.def.tier <= 3 ? 1 : 2) === ev.g)
            this.burst(cellX(i), cellY(i) + 8, 4, ['#ffe36b', '#ffffff'], 30, 0.5, 1, -60);
        }
        break;
      }
    }
  }

  // ── 그리기 ──
  draw(battle, dt) {
    const ctx = this.ctx;
    const S = this.scale;
    this.t += dt;
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 30);
      sx = (Math.random() * 2 - 1) * this.shake;
      sy = (Math.random() * 2 - 1) * this.shake;
    }
    const v = this.view;
    ctx.setTransform(S, 0, 0, S, Math.round((sx - v.x) * S), Math.round((sy - v.y) * S));
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.bg, 0, 0, W, H);

    this.drawTorches(ctx);
    this.drawZones(ctx, battle);
    this.drawCellHints(ctx, battle);
    this.drawUnits(ctx, battle);
    this.drawEnemies(ctx, battle);
    this.drawProjs(ctx, battle);
    this.drawFx(ctx, dt);
    this.drawParts(ctx, dt);
    this.drawNums(ctx, dt);
    this.drawDrag(ctx, battle);

    if (battle.ashT > 0 && !this.settings.low) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#4a4550';
      ctx.fillRect(0, 90, W, 210);
      ctx.globalAlpha = 1;
      if (Math.random() < 0.8) this.part(Math.random() * W, 92, (Math.random() - 0.5) * 20, 60 + Math.random() * 40, 2.5, Math.random() < 0.2 ? '#ff8a3a' : '#8a8490', 2);
    }
    if (battle.timeStopT > 0) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#7a5ad0';
      ctx.fillRect(0, 90, W, 210);
    }
    if (this.flash) {
      const f = this.flash;
      f.t += dt;
      if (f.t >= f.d) this.flash = null;
      else {
        ctx.globalAlpha = f.a * (1 - f.t / f.d);
        ctx.fillStyle = f.col;
        ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTorches(ctx) {
    const pts = [[8, 92], [346, 92], [8, 294], [346, 294]];
    for (let i = 0; i < 4; i++) {
      const [x, y] = pts[i];
      ctx.fillStyle = '#3a3542';
      ctx.fillRect(x, y, 6, 10);
      const f = ((this.t * 9 + i * 3) | 0) % 3;
      ctx.fillStyle = '#ff8a3a';
      ctx.fillRect(x + 1, y - 4 - f, 4, 4 + f);
      ctx.fillStyle = '#ffe36b';
      ctx.fillRect(x + 2, y - 2 - (f > 1 ? 1 : 0), 2, 2);
      if (!this.settings.low) {
        ctx.globalAlpha = 0.08 + f * 0.02;
        ctx.fillStyle = '#ff8a3a';
        ctx.fillRect(x - 8, y - 14, 22, 22);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawZones(ctx, b) {
    for (const z of b.zones) {
      const a = Math.min(1, z.t / 0.5);
      const step = 8;
      for (let s = z.s0; s <= z.s1; s += step) {
        pathPos(s, TMP);
        const f = ((this.t * 12 + s) | 0) % 3;
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = f ? '#ff8a3a' : '#ffe36b';
        ctx.fillRect(TMP.x - 3, TMP.y - 2 - f * 2, 6, 6 + f * 2);
        ctx.fillStyle = '#e0463a';
        ctx.fillRect(TMP.x - 4, TMP.y + 3, 8, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawUnits(ctx, b) {
    const t = this.t;
    for (let i = 0; i < COLS * ROWS; i++) {
      const u = b.units[i];
      const cx = BX + (i % COLS) * CELL, cy = BY + ((i / COLS) | 0) * CELL;
      if (i === this.selected) {
        ctx.fillStyle = '#c9a85c';
        const L = 8;
        ctx.fillRect(cx + 2, cy + 2, L, 2); ctx.fillRect(cx + 2, cy + 2, 2, L);
        ctx.fillRect(cx + CELL - 2 - L, cy + 2, L, 2); ctx.fillRect(cx + CELL - 4, cy + 2, 2, L);
        ctx.fillRect(cx + 2, cy + CELL - 4, L, 2); ctx.fillRect(cx + 2, cy + CELL - 2 - L, 2, L);
        ctx.fillRect(cx + CELL - 2 - L, cy + CELL - 4, L, 2); ctx.fillRect(cx + CELL - 4, cy + CELL - 2 - L, 2, L);
        if (u) {
          ctx.globalAlpha = 0.1;
          ctx.strokeStyle = '#c9a85c';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx + 24, cy + 24, u.range, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = '#c9a85c';
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (!u) continue;
      if (this.drag && this.drag.from === i && this.drag.moved) { ctx.globalAlpha = 0.3; }
      const tier = u.def.tier;
      const spr = SPR.units[u.def.id];
      const left = u.face === -1;
      const bob = ((t * 2 + u.uid * 0.37) % 2) < 1 ? 0 : -2;
      const lunge = u.anim > 0 ? (left ? -2 : 2) : 0;
      const x = cx + 8 + lunge, y = cy + 8 + bob;
      // 받침 발광
      if (tier >= 3) {
        ctx.globalAlpha = (this.drag && this.drag.from === i && this.drag.moved ? 0.1 : 0.22) + Math.sin(t * 3 + i) * 0.06;
        ctx.fillStyle = tier === 5 ? RAINBOW[((t * 6) | 0) % 6] : TIERS[tier].color;
        ctx.fillRect(cx + 10, cy + 38, 28, 4);
        ctx.fillRect(cx + 14, cy + 36, 20, 8);
        ctx.globalAlpha = this.drag && this.drag.from === i && this.drag.moved ? 0.3 : 1;
      }
      if (tier >= 1) {
        const gi = tier === 5 ? 5 + (((t * 6) | 0) % 6) : tier;
        const gl = spr.glow[gi];
        if (gl) ctx.drawImage(left ? gl[1] : gl[0], x - 2, y - 2, 36, 36);
      }
      ctx.drawImage(left ? spr.l : spr.r, x, y, 32, 32);
      if (u.corrupt > 0) {
        ctx.globalAlpha = 0.45 + Math.sin(t * 8) * 0.15;
        ctx.fillStyle = '#5a2a6a';
        ctx.fillRect(cx + 4, cy + 4, CELL - 8, CELL - 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#c99bff';
        for (let k = 0; k < 3; k++) ctx.fillRect(cx + 10 + k * 12, cy + 10 + ((t * 20 + k * 7) % 24), 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 22, cy + 2, 4, 2);
        ctx.fillRect(cx + 23, cy, 2, 6);
      } else if (u.ice > 0) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#a8e4ff';
        ctx.fillRect(cx + 4, cy + 4, CELL - 8, CELL - 8);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 6, cy + 6, CELL - 12, 2);
        ctx.fillRect(cx + 6, cy + 6, 2, 14);
        const cracks = Math.max(0, 7 - u.ice) | 0;
        ctx.fillStyle = '#4f86d6';
        for (let k = 0; k < cracks; k++) ctx.fillRect(cx + 12 + ((k * 13) % 24), cy + 12 + ((k * 7) % 22), 6, 2);
        ctx.globalAlpha = 1;
      }
      if (tier >= 4 && !this.settings.low && Math.random() < 0.08) {
        this.part(cx + 10 + Math.random() * 28, cy + 36, 0, -20 - Math.random() * 20, 0.8, tier === 5 ? RAINBOW[(Math.random() * 6) | 0] : TIERS[tier].glow, 1);
      }
      ctx.globalAlpha = 1;
      // 진화 가능: 다음 등급 색 반짝이 + 통통 튀는 ▲▲ 표식
      if (b.mergeable[i]) {
        const next = tier + 1;
        if (!this.settings.low && Math.random() < 0.12)
          this.part(cx + 8 + Math.random() * 32, cy + 40, 0, -24 - Math.random() * 16, 0.7, TIERS[next].glow, 2);
        const hop = Math.abs(Math.sin(t * 5 + i)) * 4;
        ctx.drawImage(evoBadge(TIERS[next].color), cx + CELL - 15, cy - 7 - hop, 18, 20);
      }
    }
  }

  // 칸 테두리 강조 (유닛 아래에 그린다)
  drawCellHints(ctx, b) {
    const t = this.t;
    const pulse = 0.55 + Math.sin(t * 5) * 0.35;
    // 천상 조합 준비 완료 재료
    const ready = this.readyCells(b);
    // 선택한 유닛의 진화 재료
    const sel = this.selected;
    const partners = sel >= 0 && b.mergeable[sel] ? b.mergePartners(sel) : null;
    for (let i = 0; i < COLS * ROWS; i++) {
      const u = b.units[i];
      if (!u) continue;
      const cx = BX + (i % COLS) * CELL, cy = BY + ((i / COLS) | 0) * CELL;
      let col = null, a = 0;
      if (ready.has(i)) { col = RAINBOW[((t * 8 + i) | 0) % 6]; a = 0.9; }
      else if (b.mergeable[i]) { col = TIERS[u.def.tier + 1].color; a = pulse; }
      if (!col) continue;
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = col;
      ctx.fillRect(cx + 3, cy + 3, CELL - 6, CELL - 6);
      ctx.globalAlpha = a;
      ctx.fillRect(cx + 2, cy + 2, CELL - 4, 2);
      ctx.fillRect(cx + 2, cy + CELL - 4, CELL - 4, 2);
      ctx.fillRect(cx + 2, cy + 2, 2, CELL - 4);
      ctx.fillRect(cx + CELL - 4, cy + 2, 2, CELL - 4);
    }
    if (partners) {
      const x0 = cellX(sel), y0 = cellY(sel);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffe36b';
      for (const p of partners) {
        const x1 = cellX(p), y1 = cellY(p);
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6));
        const off = (t * 3) % 1;
        for (let k = 0; k < n; k++) {
          const f = (k + off) / n;
          ctx.fillRect(Math.round(x0 + (x1 - x0) * f) - 1, Math.round(y0 + (y1 - y0) * f) - 1, 3, 3);
        }
        const cx = BX + (p % COLS) * CELL, cy = BY + ((p / COLS) | 0) * CELL;
        ctx.fillRect(cx + 1, cy + 1, CELL - 2, 3);
        ctx.fillRect(cx + 1, cy + CELL - 4, CELL - 2, 3);
        ctx.fillRect(cx + 1, cy + 1, 3, CELL - 2);
        ctx.fillRect(cx + CELL - 4, cy + 1, 3, CELL - 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  readyCells(b) {
    if (this._readyT > this.t) return this._ready;
    this._readyT = this.t + 0.25;
    const set = new Set();
    for (const r of RECIPES) {
      const st = b.recipeState(r);
      if (st.ok) for (const c of st.have) set.add(c);
    }
    this._ready = set;
    return set;
  }

  drawEnemies(ctx, b) {
    const low = this.settings.low;
    for (const e of b.enemies) {
      if (!e.alive) continue;
      const left = e.dx < 0;
      let spr, size;
      spr = SPR.enemies[e.type] || SPR.boss;
      size = e.def.boss ? 48 : e.def.size || 24;
      if (e.type === 'ogran') spr = SPR.boss;
      if (e.clone) size = 32;
      const bob = (e.walk | 0) % 2 ? -2 : 0;
      const x = Math.round(e.x - size / 2), y = Math.round(e.y - size + 8 + bob);
      if (e.invis) ctx.globalAlpha = 0.25;
      const img = e.flash > 0 ? (left ? spr.fl : spr.fr) : left ? spr.l : spr.r;
      if (e.shield) { ctx.globalAlpha = 0.35 + Math.sin(this.t * 10) * 0.15; ctx.fillStyle = '#c99bff'; ctx.fillRect(x - 3, y - 3, size + 6, size + 6); ctx.globalAlpha = e.invis ? 0.25 : 1; }
      ctx.drawImage(img, x, y, size, size);
      ctx.globalAlpha = 1;
      if (e.slowAmt > 0) {
        ctx.fillStyle = '#a8e4ff';
        ctx.fillRect(x + 4, y + size - 4, 3, 2);
        ctx.fillRect(x + size - 8, y + size - 4, 3, 2);
      }
      if (e.stunT > 0) {
        const a = this.t * 8;
        ctx.fillStyle = '#ffe36b';
        ctx.fillRect(e.x + Math.cos(a) * 8 - 1, y - 4 + Math.sin(a) * 2, 2, 2);
        ctx.fillRect(e.x + Math.cos(a + 3) * 8 - 1, y - 4 + Math.sin(a + 3) * 2, 2, 2);
      }
      if (e.burnT > 0 && !low && Math.random() < 0.15) this.part(e.x + Math.random() * 10 - 5, e.y - 6, 0, -30, 0.4, '#ff8a3a', 2);
      if (e.hp < e.maxHp) {
        const bw = e.boss ? 44 : e.elite ? 28 : 18;
        const bx = Math.round(e.x - bw / 2), by = y - 4;
        ctx.fillStyle = '#1b1622';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#4a1a1a';
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = e.boss ? '#ff8a3a' : '#e0463a';
        ctx.fillRect(bx, by, Math.max(1, Math.round((bw * e.hp) / e.maxHp)), 2);
      }
    }
  }

  drawProjs(ctx, b) {
    for (const p of b.projs) {
      const col = PCOL[p.kind] || '#fff';
      ctx.fillStyle = col;
      const x = p.x, y = p.y;
      switch (p.kind) {
        case 'arrow': case 'bolt': case 'snipe': case 'dagger': case 'rain': {
          const a = p.kind === 'rain' ? Math.atan2(p.ty - p.y, p.tx - p.x) : p.ang || 0;
          const len = p.kind === 'snipe' ? 12 : p.kind === 'bolt' ? 5 : p.kind === 'dagger' ? 4 : 7;
          const cx = Math.cos(a), cy = Math.sin(a);
          for (let k = 0; k < len; k += 1.5) ctx.fillRect((x - cx * k) | 0, (y - cy * k) | 0, 2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x | 0, y | 0, 2, 2);
          break;
        }
        case 'meteor': case 'mini': {
          const r = p.kind === 'meteor' ? 4 : 3;
          ctx.fillRect((x - r) | 0, (y - r) | 0, r * 2, r * 2);
          ctx.fillStyle = '#ffe36b';
          ctx.fillRect((x - r / 2) | 0, (y - r / 2) | 0, r, r);
          if (!this.settings.low) this.part(x, y, Math.random() * 10 - 5, -10, 0.35, Math.random() < 0.5 ? '#ff7a2a' : '#5a4a46', 2);
          break;
        }
        case 'clock': case 'shadow': {
          ctx.fillRect((x - 3) | 0, (y - 3) | 0, 6, 6);
          ctx.fillStyle = '#1b1622';
          ctx.fillRect((x - 1) | 0, (y - 1) | 0, 2, 2);
          break;
        }
        default: {
          ctx.fillRect((x - 2) | 0, (y - 2) | 0, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect((x - 1) | 0, (y - 1) | 0, 2, 2);
          if (p.kind === 'fire' && !this.settings.low && Math.random() < 0.4) this.part(x, y, 0, -10, 0.25, '#ff8a3a', 2);
        }
      }
    }
  }

  drawFx(ctx, dt) {
    const fx = this.fx;
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      const k = f.t / f.d;
      if (k >= 1) { fx[i] = fx[fx.length - 1]; fx.pop(); continue; }
      switch (f.k) {
        case 'pillar': {
          const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
          const w = f.w * (1 - k * 0.5);
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = f.rainbow ? RAINBOW[((this.t * 10) | 0) % 6] : f.col;
          ctx.fillRect(f.x - w / 2, 0, w, f.y + 16);
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(f.x - w / 6, 0, w / 3, f.y + 16);
          break;
        }
        case 'ring': {
          const r = f.r0 + (f.r1 - f.r0) * (1 - (1 - k) * (1 - k));
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = f.rainbow ? RAINBOW[((this.t * 10) | 0) % 6] : f.col;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'slash': {
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = f.col;
          const r = f.big ? 14 : 9;
          for (let j = 0; j < 5; j++) {
            const a = f.a + k * 3 + j * 0.35;
            ctx.fillRect((f.x + Math.cos(a) * r) | 0, (f.y - 6 + Math.sin(a) * r) | 0, 2, 2);
          }
          break;
        }
        case 'zap': {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#ffe36b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const p = f.pts;
          ctx.moveTo(p[0], p[1]);
          for (let j = 2; j < p.length; j += 2) {
            const mx = (p[j - 2] + p[j]) / 2 + (Math.random() * 10 - 5), my = (p[j - 1] + p[j + 1]) / 2 + (Math.random() * 10 - 5);
            ctx.lineTo(mx, my);
            ctx.lineTo(p[j], p[j + 1] - 6);
          }
          ctx.stroke();
          break;
        }
        case 'beam': {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#7ad0ff';
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          break;
        }
        case 'stone': {
          ctx.globalAlpha = 1 - k;
          const y = f.y - 10 - k * 24;
          ctx.fillStyle = '#c99bff';
          ctx.fillRect(f.x - 3, y - 3, 6, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(f.x - 1, y - 2, 2, 2);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawParts(ctx, dt) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { this.ppool.push(p); ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawNums(ctx, dt) {
    const ns = this.nums;
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      n.t += dt;
      if (n.t > 0.7) { this.npool.push(n); ns.splice(i, 1); continue; }
      const k = n.t / 0.7;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const y = n.y - 10 * Math.min(1, n.t * 4) - k * 6;
      drawNum(ctx, n.s, n.x, y, n.crit ? '#ffe36b' : '#e8e2d4', 1);
    }
    ctx.globalAlpha = 1;
  }

  drawDrag(ctx, b) {
    const d = this.drag;
    if (!d || !d.moved) return;
    const u = b.units[d.from];
    if (!u) return;
    const c = d.over;
    if (c >= 0) {
      const cx = BX + (c % COLS) * CELL, cy = BY + ((c / COLS) | 0) * CELL;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#c9a85c';
      ctx.fillRect(cx + 2, cy + 2, CELL - 4, CELL - 4);
      ctx.globalAlpha = 1;
    }
    const spr = SPR.units[u.def.id];
    ctx.drawImage(spr.r, Math.round(d.x - 16), Math.round(d.y - 28), 32, 32);
  }
}
