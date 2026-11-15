// 협동 전투 동기화: 방장이 보드 상태를 압축해 보내고, 참가자는 거울 보드(MirrorBattle)로 그린다.
import { UNITS, UNIT, RECIPES, CLASS_ORDER } from '../data/units.js';
import { ENEMIES } from '../data/enemies.js';

const UNIT_IDS = UNITS.map((u) => u.id);
const ENEMY_IDS = Object.keys(ENEMIES);
const PROJ = ['arrow', 'bolt', 'fire', 'ice', 'holy', 'dagger', 'flask', 'star', 'snipe', 'clock', 'meteor', 'mini', 'rain', 'shadow'];
const PHASES = ['prep', 'wave', 'rest', 'leftover'];
const SKIP_EV = new Set(['dmg', 'hit', 'unit']);
const E_STRIDE = 9;
const P_STRIDE = 4;

// ── 방장: 보드 하나를 압축 ──
export function packBoard(b, forPartner) {
  const h = [
    b.wave, b.nWaves, PHASES.indexOf(b.phase), b.timer, b.waveT, b.bossT, b.leftT, b.gold, b.stones, b.badLuck,
    b.skillT, b.skillCd, b.celestial, b.maxCelestial, b.timeStopT, b.ashT, b.summonCost(), b.overflow ? 1 : 0, b.freezeRow, b.cheerT,
  ];
  const units = b.units.map((u) => (u ? [UNIT_IDS.indexOf(u.def.id), u.uid & 0xffff, u.face === -1 ? -1 : 1, u.anim > 0 ? 1 : 0, Math.ceil(u.corrupt || 0), Math.ceil(u.ice || 0), Math.round(b.unitDmg(u)), Math.round((u.spd || 1) * 100), Math.round(u.range || 0), u.spent || 0] : 0));
  const live = b.enemies.filter((e) => e.alive);
  const e = new Int16Array(live.length * E_STRIDE);
  live.forEach((x, i) => {
    const o = i * E_STRIDE;
    const f = (x.boss ? 1 : 0) | (x.elite ? 2 : 0) | (x.invis ? 4 : 0) | (x.flash > 0 ? 8 : 0) | (x.shield ? 16 : 0) | (x.slowAmt > 0 ? 32 : 0) | (x.stunT > 0 ? 64 : 0) | (x.burnT > 0 ? 128 : 0) | (x.clone ? 256 : 0);
    e[o] = x.uid & 0x7fff; e[o + 1] = ENEMY_IDS.indexOf(x.type); e[o + 2] = Math.round(x.x * 8); e[o + 3] = Math.round(x.y * 8);
    e[o + 4] = x.dx < 0 ? -1 : 1; e[o + 5] = Math.round((x.hp / x.maxHp) * 1000); e[o + 6] = f; e[o + 7] = Math.round(x.walk * 10) % 30000; e[o + 8] = 0;
  });
  const pr = new Int16Array(b.projs.length * P_STRIDE);
  b.projs.forEach((p, i) => { const o = i * P_STRIDE; pr[o] = PROJ.indexOf(p.kind); pr[o + 1] = Math.round(p.x * 8); pr[o + 2] = Math.round(p.y * 8); pr[o + 3] = Math.round((p.ang || Math.atan2(p.ty - p.y, p.tx - p.x)) * 1000); });
  const boss = b.boss && b.boss.alive ? [ENEMY_IDS.indexOf(b.boss.type), Math.round(b.boss.hp), Math.round(b.boss.maxHp), b.boss.shield ? 1 : 0] : null;
  let ev = b.events.filter((x) => !(forPartner && SKIP_EV.has(x.type)));
  // 데미지 숫자는 너무 많으면 줄인다
  let dmg = 0;
  ev = ev.filter((x) => x.type !== 'dmg' || dmg++ < 20);
  return {
    h, u: units, m: b.mergeable.map((x) => (x ? 1 : 0)).join(''), syn: CLASS_ORDER.map((k) => b.syn[k]),
    upg: b.upg, uc: [0, 1, 2].map((g) => b.upgradeCost(g)), he: b.hasEmpty() ? 1 : 0,
    e: e.buffer, p: pr.buffer, z: b.zones.map((z) => [z.s0, z.s1, z.t]), boss, ev, res: b.result || null,
  };
}

// ── 참가자: 거울 보드 ──
export class MirrorBattle {
  constructor(send, idx) {
    this.send = send;
    this.idx = idx;
    this.units = new Array(18).fill(null);
    this.enemies = [];
    this.emap = new Map();
    this.projs = [];
    this.zones = [];
    this.events = [];
    this.mergeable = new Array(18).fill(false);
    this.syn = { knight: 0, archer: 0, mage: 0, priest: 0, rogue: 0 };
    this.upg = [0, 0, 0];
    this.uc = [0, 0, 0];
    this.wave = 0; this.nWaves = 1; this.phase = 'prep'; this.timer = 6; this.waveT = 0; this.bossT = 0; this.leftT = 0;
    this.gold = 0; this.stones = 0; this.badLuck = 0; this.skillT = 0; this.skillCd = 60; this.celestial = 0; this.maxCelestial = 2;
    this.timeStopT = 0; this.ashT = 0; this.sc = 15; this.overflow = false; this.he = true;
    this.wall = 100; this.wallMax = 100;
    this.boss = null;
    this.result = null;
    this.stats = { kills: 0, summons: 0, merges: 0, fails: 0, gambles: 0 };
    this.t0 = 0; this.t1 = 0;
  }

  apply(s, now) {
    const H = s.h;
    [this.wave, this.nWaves] = [H[0], H[1]];
    this.phase = PHASES[H[2]] || 'wave';
    [this.timer, this.waveT, this.bossT, this.leftT, this.gold, this.stones, this.badLuck, this.skillT, this.skillCd, this.celestial, this.maxCelestial, this.timeStopT, this.ashT, this.sc] = H.slice(3, 17);
    this.overflow = !!H[17]; this.freezeRow = H[18]; this.cheerT = H[19];
    this.he = !!s.he;
    this.upg = s.upg; this.uc = s.uc;
    CLASS_ORDER.forEach((k, i) => (this.syn[k] = s.syn[i]));
    for (let i = 0; i < 18; i++) {
      this.mergeable[i] = s.m[i] === '1';
      const x = s.u[i];
      if (!x) { this.units[i] = null; continue; }
      const def = UNIT[UNIT_IDS[x[0]]];
      let u = this.units[i];
      if (!u || u.uid !== x[1] || u.def !== def) u = this.units[i] = { def, uid: x[1], cell: i };
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
      const nx = e[o + 2] / 8, ny = e[o + 3] / 8;
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
    for (let o = 0; o < p.length; o += P_STRIDE) this.projs.push({ kind: PROJ[p[o]], x: p[o + 1] / 8, y: p[o + 2] / 8, ang: p[o + 3] / 1000, tx: p[o + 1] / 8 + Math.cos(p[o + 3] / 1000) * 10, ty: p[o + 2] / 8 + Math.sin(p[o + 3] / 1000) * 10 });
    this.zones = s.z.map(([s0, s1, t]) => ({ s0, s1, t, dur: 3 }));
    this.boss = s.boss ? { alive: true, type: ENEMY_IDS[s.boss[0]], def: ENEMIES[ENEMY_IDS[s.boss[0]]], hp: s.boss[1], maxHp: s.boss[2], shield: !!s.boss[3] } : null;
    for (const ev of s.ev) this.events.push(ev);
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

  // ── HUD가 쓰는 조회 ──
  summonCost() { return this.sc; }
  hasEmpty() { return this.units.includes(null); }
  liveCount() { return this.enemies.length; }
  upgradeCost(g) { return this.uc[g]; }
  unitDmg(u) { return u.dmgV || 0; }
  bossInfo() { return this.boss; }
  mergePartners(cell) {
    const u = this.units[cell];
    if (!u || u.def.tier >= 4) return null;
    const out = [];
    for (let i = 0; i < 18 && out.length < 2; i++) if (i !== cell && this.units[i] && this.units[i].def === u.def) out.push(i);
    return out.length === 2 ? out : null;
  }
  recipeState(r) {
    const used = new Set();
    const have = r.mats.map((id) => {
      for (let i = 0; i < 18; i++) { const u = this.units[i]; if (u && !used.has(i) && u.def.id === id) { used.add(i); return i; } }
      return -1;
    });
    return { have, ok: have.every((x) => x >= 0) && this.celestial < this.maxCelestial };
  }

  // ── 입력: 방장에게 보낸다 (반응은 다음 스냅샷으로) ──
  act(a, extra) { if (this.result) return false; this.send({ t: 'in', a, ...extra }); return true; }
  summon() { if (this.gold < this.sc || !this.hasEmpty()) return false; return this.act('summon'); }
  gamble(level) { return this.act('gamble', { g: level }); }
  pity() { return this.act('pity'); }
  merge(cell) { if (!this.mergePartners(cell)) return false; return this.act('merge', { c: cell }); }
  sell(cell) { return this.act('sell', { c: cell }); }
  move(from, to) {
    if (from === to) return false;
    const a = this.units[from], b = this.units[to];
    this.units[to] = a; this.units[from] = b; // 즉시 반영해 손맛을 살린다
    return this.act('move', { f: from, c: to });
  }
  craft(i) { return this.act('craft', { i }); }
  upgrade(g) { if (this.gold < this.uc[g]) return false; return this.act('upgrade', { g }); }
  skill() { if (this.skillT < this.skillCd) return false; return this.act('skill'); }
  cleanse(c) { return this.act('cleanse', { c }); }
}

// ── 방장: 참가자 입력 적용 ──
export function applyInput(b, m) {
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
  }
  return false;
}
