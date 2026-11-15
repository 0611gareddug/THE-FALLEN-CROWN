// 협동 전투 동기화 (한 필드 · 8자 길)
// 방장이 필드 전체를 압축해 보내고, 참가자는 위아래를 뒤집은 거울 필드(MirrorBattle)로 그린다.
// 참가자 화면에서는 자기 보드가 항상 아래(주인 0)에 온다.
import { UNITS, UNIT, CLASS_ORDER } from '../data/units.js';
import { ENEMIES } from '../data/enemies.js';
import { COOP, mirrorCell } from '../game/layout.js';
import { defineOwned } from '../game/battle.js';

const UNIT_IDS = UNITS.map((u) => u.id);
const ENEMY_IDS = Object.keys(ENEMIES);
const PROJ = ['arrow', 'bolt', 'fire', 'ice', 'holy', 'dagger', 'flask', 'star', 'snipe', 'clock', 'meteor', 'mini', 'rain', 'shadow'];
const PHASES = ['prep', 'wave', 'rest', 'leftover'];
const E_STRIDE = 8;
const P_STRIDE = 4;
const r1 = (v) => Math.round(v * 10) / 10;

// ── 방장: 필드 전체 압축 (좌표 · 칸 · 주인은 방장 기준 그대로) ──
export function packField(b, evs) {
  const h = [b.wave, b.nWaves, PHASES.indexOf(b.phase), r1(b.timer), r1(b.waveT), r1(b.bossT), r1(b.leftT), r1(b.timeStopT), r1(b.ashT), b.overflow ? 1 : 0, b.freezeRow, r1(b.wall), b.wallMax, r1(b.cloudT || 0)];
  const pp = [0, 1].map((o) => b.as(o, () => [
    b.gold, b.stones, b.badLuck, r1(b.skillT), r1(b.skillCd), b.celestial, b.maxCelestial, b.summonCost(), r1(b.cheerT),
    b.upg[0], b.upg[1], b.upg[2], b.upgradeCost(0), b.upgradeCost(1), b.upgradeCost(2), b.hasEmpty() ? 1 : 0, b.stats.kills, b.freeSummon,
    ...CLASS_ORDER.map((k) => b.syn[k]),
  ]));
  const units = b.units.map((u) => (u ? [UNIT_IDS.indexOf(u.def.id), u.uid & 0xffff, u.face === -1 ? -1 : 1, u.anim > 0 ? 1 : 0, Math.ceil(u.corrupt || 0), Math.ceil(u.ice || 0), Math.round(b.unitDmg(u)), Math.round((u.spd || 1) * 100), Math.round(u.range || 0), u.spent || 0] : 0));
  const live = b.enemies.filter((e) => e.alive);
  const e = new Int16Array(live.length * E_STRIDE);
  live.forEach((x, i) => {
    const o = i * E_STRIDE;
    const f = (x.boss ? 1 : 0) | (x.elite ? 2 : 0) | (x.invis ? 4 : 0) | (x.flash > 0 ? 8 : 0) | (x.shield ? 16 : 0) | (x.slowAmt > 0 ? 32 : 0) | (x.stunT > 0 ? 64 : 0) | (x.burnT > 0 ? 128 : 0) | (x.clone ? 256 : 0);
    e[o] = x.uid & 0x7fff; e[o + 1] = ENEMY_IDS.indexOf(x.type); e[o + 2] = Math.round(x.x * 8); e[o + 3] = Math.round(x.y * 8);
    e[o + 4] = x.dx < 0 ? -1 : 1; e[o + 5] = Math.round((x.hp / x.maxHp) * 1000); e[o + 6] = f; e[o + 7] = Math.round(x.walk * 10) % 30000;
  });
  const pr = new Int16Array(b.projs.length * P_STRIDE);
  b.projs.forEach((p, i) => { const o = i * P_STRIDE; pr[o] = PROJ.indexOf(p.kind); pr[o + 1] = Math.round(p.x * 8); pr[o + 2] = Math.round(p.y * 8); pr[o + 3] = Math.round((p.ang || Math.atan2(p.ty - p.y, p.tx - p.x)) * 1000); });
  const boss = b.boss && b.boss.alive ? [ENEMY_IDS.indexOf(b.boss.type), Math.round(b.boss.hp), Math.round(b.boss.maxHp), b.boss.shield ? 1 : 0] : null;
  // 데미지 숫자는 너무 많으면 줄인다
  let dmg = 0;
  const ev = evs.filter((x) => x.type !== 'hit' && (x.type !== 'dmg' || dmg++ < 16));
  return {
    h, pp, u: units, m: b.mergeable.map((x) => (x ? 1 : 0)).join(''),
    e: e.buffer, p: pr.buffer, z: b.zones.map((z) => [Math.round(z.s0), Math.round(z.s1), r1(z.t), z.fox ? 1 : 0]), boss, ev, res: b.result || null,
  };
}

// 이벤트를 참가자 화면 기준으로 뒤집기
function mirrorEv(ev, M) {
  if (ev.o !== undefined) ev.o = 1 - ev.o;
  if (ev.to !== undefined) ev.to = 1 - ev.to;
  if (typeof ev.cell === 'number') ev.cell = mirrorCell(ev.cell);
  if (Array.isArray(ev.from)) ev.from = ev.from.map(mirrorCell);
  else if (typeof ev.from === 'number') ev.from = mirrorCell(ev.from);
  if (typeof ev.y === 'number') ev.y = M - ev.y;
  if (typeof ev.y2 === 'number') ev.y2 = M - ev.y2;
  if (typeof ev.ty === 'number') ev.ty = M - ev.ty;
  if (ev.pts) for (let i = 1; i < ev.pts.length; i += 2) ev.pts[i] = M - ev.pts[i];
  if (ev.targets) ev.targets = ev.targets.map(([x, y]) => [x, M - y]);
  if (ev.type === 'freeze') ev.row = 2 - ev.row;
  return ev;
}

const newP = () => ({
  gold: 0, stones: 0, badLuck: 0, skillT: 0, skillCd: 60, celestial: 0, maxCelestial: 2, sc: 15, cheerT: 0,
  upg: [0, 0, 0], uc: [0, 0, 0], he: true, freeSummon: 0, buff: null, buffT: 0, mascot: 'puru', royal: 'edric',
  syn: { knight: 0, archer: 0, mage: 0, priest: 0, rogue: 0 }, mods: {},
  stats: { kills: 0, summons: 0, merges: 0, fails: 0, gambles: 0, celestials: 0, maxField: 0, wallLost: 0 },
});

// ── 참가자: 거울 필드 ──
export class MirrorBattle {
  constructor(send) {
    this.send = send;
    this.L = COOP;
    this.M = COOP.mirrorY;
    this.nCells = COOP.nCells;
    this.coop = true;
    this.nP = 2;
    this.P = [newP(), newP()];
    this.cur = 0;
    this.units = new Array(this.nCells).fill(null);
    this.mergeable = new Array(this.nCells).fill(false);
    this.enemies = [];
    this.emap = new Map();
    this.projs = [];
    this.zones = [];
    this.events = [];
    this.wave = 0; this.nWaves = 1; this.phase = 'prep'; this.timer = 8; this.waveT = 0; this.bossT = 0; this.leftT = 0;
    this.timeStopT = 0; this.ashT = 0; this.overflow = false; this.freezeRow = -1;
    this.wall = 100; this.wallMax = 100;
    this.boss = null;
    this.result = null;
    this.time = 0;
    this.t0 = 0; this.t1 = 0;
  }

  apply(s, now) {
    const M = this.M;
    const H = s.h;
    this.wave = H[0]; this.nWaves = H[1]; this.phase = PHASES[H[2]] || 'wave';
    [this.timer, this.waveT, this.bossT, this.leftT, this.timeStopT, this.ashT] = H.slice(3, 9);
    this.overflow = !!H[9]; this.freezeRow = H[10] < 0 ? -1 : 2 - H[10]; this.wall = H[11]; this.wallMax = H[12]; this.cloudT = H[13] || 0;
    for (let ho = 0; ho < 2; ho++) {
      const P = this.P[1 - ho], a = s.pp[ho];
      [P.gold, P.stones, P.badLuck, P.skillT, P.skillCd, P.celestial, P.maxCelestial, P.sc, P.cheerT] = a;
      P.upg = [a[9], a[10], a[11]]; P.uc = [a[12], a[13], a[14]]; P.he = !!a[15]; P.stats.kills = a[16]; P.freeSummon = a[17];
      CLASS_ORDER.forEach((k, i) => (P.syn[k] = a[18 + i]));
    }
    for (let hi = 0; hi < this.nCells; hi++) {
      const i = mirrorCell(hi);
      this.mergeable[i] = s.m[hi] === '1';
      const x = s.u[hi];
      if (!x) { this.units[i] = null; continue; }
      const def = UNIT[UNIT_IDS[x[0]]];
      let u = this.units[i];
      if (!u || u.uid !== x[1] || u.def !== def) u = this.units[i] = { def, uid: x[1], cell: i, o: (i / 18) | 0 };
      u.cell = i; u.o = (i / 18) | 0;
      u.face = x[2]; u.anim = x[3] ? 0.1 : 0; u.corrupt = x[4]; u.ice = x[5]; u.dmgV = x[6]; u.spd = x[7] / 100; u.range = x[8]; u.r2 = u.range * u.range; u.spent = x[9];
    }
    // 적: 이전 위치에서 새 위치로 보간
    const e = new Int16Array(s.e);
    const seen = new Set();
    const list = [];
    for (let o = 0; o < e.length; o += E_STRIDE) {
      const uid = e[o];
      seen.add(uid);
      let x = this.emap.get(uid);
      const type = ENEMY_IDS[e[o + 1]];
      const nx = e[o + 2] / 8, ny = M - e[o + 3] / 8;
      if (!x || x.type !== type) { x = { uid, type, def: ENEMIES[type], px: nx, py: ny, x: nx, y: ny, alive: true }; this.emap.set(uid, x); }
      else { x.px = x.x; x.py = x.y; }
      x.nx = nx; x.ny = ny;
      x.dx = e[o + 4]; x.dy = 0;
      const f = e[o + 6];
      x.boss = !!(f & 1); x.elite = !!(f & 2); x.invis = !!(f & 4); x.flash = f & 8 ? 0.05 : 0; x.shield = !!(f & 16);
      x.slowAmt = f & 32 ? 0.2 : 0; x.stunT = f & 64 ? 0.2 : 0; x.burnT = f & 128 ? 0.2 : 0; x.clone = !!(f & 256);
      x.maxHp = 1000; x.hp = e[o + 5]; x.walk = e[o + 7] / 10;
      list.push(x);
    }
    for (const k of [...this.emap.keys()]) if (!seen.has(k)) this.emap.delete(k);
    this.enemies = list;
    const p = new Int16Array(s.p);
    this.projs = [];
    for (let o = 0; o < p.length; o += P_STRIDE) {
      const ang = -p[o + 3] / 1000, px = p[o + 1] / 8, py = M - p[o + 2] / 8;
      this.projs.push({ kind: PROJ[p[o]], x: px, y: py, ang, tx: px + Math.cos(ang) * 10, ty: py + Math.sin(ang) * 10 });
    }
    this.zones = s.z.map(([s0, s1, t, fox]) => ({ s0, s1, t, dur: 3, fox: !!fox }));
    this.boss = s.boss ? { alive: true, type: ENEMY_IDS[s.boss[0]], def: ENEMIES[ENEMY_IDS[s.boss[0]]], hp: s.boss[1], maxHp: s.boss[2], shield: !!s.boss[3] } : null;
    for (const ev of s.ev) this.events.push(mirrorEv(ev, M));
    if (s.res) this.result = s.res;
    this.t0 = this.t1 || now; this.t1 = now;
  }

  // 그리기 직전: 두 스냅샷 사이를 보간
  interp(now) {
    const span = Math.max(30, this.t1 - this.t0);
    const a = Math.min(1, (now - this.t1) / span);
    for (const x of this.enemies) {
      if (x.nx === undefined) continue;
      x.x = x.px + (x.nx - x.px) * a;
      x.y = x.py + (x.ny - x.py) * a;
    }
  }

  // ── HUD가 쓰는 조회 (cur 기준) ──
  as(o, fn) { const prev = this.cur; this.cur = o; try { return fn(); } finally { this.cur = prev; } }
  ownerOf(c) { return (c / 18) | 0; }
  summonCost() { return this.P[this.cur].sc; }
  hasEmpty(o = this.cur) { return this.P[o].he; }
  liveCount() { return this.enemies.length; }
  upgradeCost(g) { return this.P[this.cur].uc[g]; }
  unitDmg(u) { return u.dmgV || 0; }
  bossInfo() { return this.boss; }
  totalStat(k) { return this.P[0].stats[k] + this.P[1].stats[k]; }
  mergePartners(cell) {
    const u = this.units[cell];
    if (!u || u.def.tier >= 4) return null;
    const out = [];
    const b0 = u.o * 18;
    for (let i = b0; i < b0 + 18 && out.length < 2; i++) if (i !== cell && this.units[i] && this.units[i].def === u.def) out.push(i);
    return out.length === 2 ? out : null;
  }
  recipeState(r) {
    const used = new Set();
    const b0 = this.cur * 18;
    const have = r.mats.map((id) => {
      for (let i = b0; i < b0 + 18; i++) { const u = this.units[i]; if (u && !used.has(i) && u.def.id === id) { used.add(i); return i; } }
      return -1;
    });
    return { have, ok: have.every((x) => x >= 0) && this.celestial < this.maxCelestial };
  }

  // ── 입력: 방장에게 보낸다 (칸은 방장 기준으로 되돌려서) ──
  act(a, extra) { if (this.result) return false; this.send({ t: 'in', a, ...extra }); return true; }
  summon() { if (this.gold < this.summonCost() || !this.hasEmpty()) return false; return this.act('summon'); }
  gamble(level) { return this.act('gamble', { g: level }); }
  pity() { return this.act('pity'); }
  merge(cell) { if (!this.mergePartners(cell) || this.ownerOf(cell) !== 0) return false; return this.act('merge', { c: mirrorCell(cell) }); }
  sell(cell) { if (this.ownerOf(cell) !== 0) return 0; return this.act('sell', { c: mirrorCell(cell) }); }
  move(from, to) {
    if (from === to || this.ownerOf(from) !== 0) return false;
    const a = this.units[from], b = this.units[to];
    if (!a) return false;
    if (this.ownerOf(to) !== 0) { if (b) return false; }
    else { this.units[to] = a; this.units[from] = b; } // 즉시 반영해 손맛을 살린다
    return this.act('move', { f: mirrorCell(from), c: mirrorCell(to) });
  }
  craft(i) { return this.act('craft', { i }); }
  upgrade(g) { if (this.gold < this.upgradeCost(g)) return false; return this.act('upgrade', { g }); }
  skill() { if (this.skillT < this.skillCd || this.phase === 'prep') return false; return this.act('skill'); }
  cleanse(c) { return this.act('cleanse', { c: mirrorCell(c) }); }
  sendGold(v = 20) { if (this.gold < v) return false; return this.act('gold', { v }); }
}
defineOwned(MirrorBattle);
// 거울 필드는 sc/uc/he를 따로 쓰므로 OWN 목록 밖의 값은 P에서 직접 읽는다

// ── 방장: 참가자(주인 1) 입력 적용 ──
export function applyInput(b, m) {
  return b.as(1, () => {
    switch (m.a) {
      case 'summon': return b.summon();
      case 'gamble': return b.gamble(m.g);
      case 'pity': return b.pity();
      case 'merge': return b.merge(m.c);
      case 'sell': return b.sell(m.c);
      case 'move': return b.move(m.f, m.c);
      case 'craft': return b.craft(m.i);
      case 'upgrade': return b.upgrade(m.g);
      case 'skill': return b.skill();
      case 'cleanse': return b.cleanse(m.c);
      case 'gold': return b.sendGold(20);
    }
    return false;
  });
}
