// 전투 시뮬레이션 (화면과 분리된 순수 로직)
// 한 필드에 보드 여러 개(협동 2인)를 올릴 수 있다. 플레이어별 상태는 this.P[o]에 있고,
// this.cur(현재 주인)를 통해 this.gold 같은 이름으로 접근한다.
import { RNG } from '../core/rng.js';
import { UNITS, UNIT, BY_TIER, TIERS, RECIPES, MAX_CELESTIAL, CLASS_ORDER, upgGroup, upgCost } from '../data/units.js';
import { ENEMIES, TRIAL_WAVES, WAVE_TIME, REST_TIME, BOSS_TIME, LEFTOVER_TIME, hpAt, BOSS_HP } from '../data/enemies.js';
import { MASCOT_DEFS } from '../data/mascots.js';
import { FAIL_LINES } from '../data/text.js';
import { COLS, SOLO } from './layout.js';

const SUMMON_W = [70, 25, 5];
const GAMBLE = [
  { cost: 1, p: 0.6, tier: 2 },
  { cost: 2, p: 0.3, tier: 3 },
  { cost: 3, p: 0.15, tier: 4 },
];
export const PITY_MAX = 10;
// 협동 보정: 적 수 · 보스/정예 체력
export const COOP_COUNT = 2;
export const COOP_BOSS = 3;
export const COOP_HP = 1.6;
const TMP = { x: 0, y: 0, dx: 0, dy: 0 };
export const OWN = ['gold', 'stones', 'badLuck', 'upg', 'summons', 'celestial', 'maxCelestial', 'skillT', 'skillCd', 'cheerT', 'buff', 'buffT',
  'mascot', 'mdef', 'mlv', 'mboost', 'freeSummon', 'syn', 'mods', 'royal', 'deliver', 'eggKills', 'goldFrac', 'stoneWave', 'stats', 'metT'];
const newStats = () => ({ kills: 0, summons: 0, merges: 0, fails: 0, gambles: 0, best: null, celestials: 0, maxField: 0, wallLost: 0, gifts: 0, sent: 0 });

export class Battle {
  constructor(opt = {}) {
    this.rng = new RNG(opt.seed);
    this.L = opt.layout || SOLO;
    this.nCells = this.L.nCells;
    this.coop = this.L.kind === 'coop';
    const pl = opt.players || [{ royal: opt.royal, mascot: opt.mascot, badLuck: opt.badLuck, carry: opt.carry, mascotLv: opt.mascotLv, eggKills: opt.eggKills }];
    this.nP = pl.length;
    this.P = pl.map(() => ({}));
    this.cur = 0;
    this.units = new Array(this.nCells).fill(null);
    this.enemies = [];
    this.epool = [];
    this.projs = [];
    this.ppool = [];
    this.zones = [];
    this.events = [];
    this.uid = 1;

    this.R = opt.mods || {};
    // 지도 칸 구성 (없으면 1단계 시험 전투 10웨이브)
    this.node = opt.node || { L: 1, trial: true, waves: TRIAL_WAVES, kind: 'boss', boss: 'ogran' };
    this.nWaves = this.node.waves.length;
    const c0 = pl[0].carry;
    if (c0) { this.wallMax = c0.wallMax; this.wall = c0.wall; }
    else {
      this.wallMax = Math.round((100 + ((pl[0].royal || 'edric') === 'edric' ? 20 : 0)) * (this.coop ? 1.5 : 1));
      this.wall = this.wallMax;
    }
    for (let o = 0; o < this.nP; o++) {
      this.cur = o;
      const p = pl[o], c = p.carry;
      this.royal = p.royal || 'edric';
      this.mascot = p.mascot || 'puru';
      if (c) { this.gold = c.gold; this.stones = c.stones; }
      else { this.gold = this.royal === 'kyle' ? 150 : 100; this.stones = this.royal === 'seren' ? 3 : 0; }
      this.gold += this.R.battleGold || 0;
      this.badLuck = p.badLuck || 0;
      this.mdef = MASCOT_DEFS[this.mascot] || MASCOT_DEFS.puru;
      this.mlv = Math.max(1, Math.min(5, p.mascotLv || 1));
      this.mboost = 1 + 0.08 * (this.mlv - 1);
      this.upg = c ? c.upg.slice() : [0, 0, 0];
      this.summons = c ? c.summons : 0;
      this.celestial = c ? c.celestial : 0;
      this.maxCelestial = MAX_CELESTIAL + (this.R.celestialMax || 0);
      this.skillT = 0;
      this.skillCd = this.mdef.cd * (1 - 0.04 * (this.mlv - 1));
      this.buffT = 0;
      this.buff = null;
      this.eggKills = p.eggKills || 0;
      this.deliver = 0;
      this.cheerT = 0;
      this.metT = 0;
      this.stoneWave = 0;
      this.goldFrac = 0;
      this.freeSummon = this.R.firstSummonFree ? 1 : 0;
      this.syn = { knight: 0, archer: 0, mage: 0, priest: 0, rogue: 0 };
      this.mods = {};
      this.stats = newStats();
    }
    this.cur = 0;

    this.wave = 0;
    this.phase = 'prep';
    this.timer = this.coop ? 8 : 6;
    this.waveT = 0;
    this.queue = [];
    this.qi = 0;
    this.boss = null;
    this.bossT = 0;

    this.time = 0;
    this.leftT = 0;
    this.gimT = 0;
    this.ashT = 0;
    this.freezeRow = -1;
    this.freezeT = 0;
    this.wallSaves = this.R.bossGuard || 0;
    this.timeStopT = 0;
    this.overflow = false;
    this.result = null;

    this.mergeable = new Array(this.nCells).fill(false);
    this.dirty = true;
    for (let o = 0; o < this.nP; o++) {
      const c = pl[o].carry;
      if (c) c.units.forEach((x, i) => { if (x && UNIT[x.id] && i < 18) this.place(UNIT[x.id], o * 18 + i, x.spent || 0, true); });
    }
  }

  // 전투가 끝난 뒤 다음 칸으로 넘길 상태 (주인별)
  exportCarry(o = this.cur) {
    const P = this.P[o];
    return {
      units: this.units.slice(o * 18, o * 18 + 18).map((u) => (u ? { id: u.def.id, spent: u.spent } : null)),
      gold: P.gold, stones: P.stones, wall: Math.max(0, Math.ceil(this.wall)), wallMax: this.wallMax,
      upg: P.upg.slice(), summons: P.summons, celestial: P.celestial,
    };
  }

  emit(type, data) {
    const e = data || {};
    e.type = type;
    if (e.o === undefined) e.o = this.cur;
    this.events.push(e);
  }

  // 다른 플레이어로 잠시 바꿔서 실행
  as(o, fn) {
    const prev = this.cur;
    this.cur = o;
    try { return fn(); } finally { this.cur = prev; }
  }

  // ───────────────────────── 보드 ─────────────────────────
  ownerOf(cell) { return (cell / 18) | 0; }
  emptyCells(o = this.cur) {
    const out = [];
    for (let i = o * 18, e = i + 18; i < e; i++) if (!this.units[i]) out.push(i);
    return out;
  }
  hasEmpty(o = this.cur) {
    for (let i = o * 18, e = i + 18; i < e; i++) if (!this.units[i]) return true;
    return false;
  }

  place(def, cell, spent = 0, quiet = false) {
    const u = {
      uid: this.uid++, def, cell, o: this.ownerOf(cell), cd: 0.2 + this.rng.next() * 0.4, hits: 0, stacks: 0, lastTgt: 0,
      skT: 0, spent, anim: 0, dealt: 0, born: this.time, corrupt: 0, ice: 0,
      spd: 1, dmgMul: 1, range: def.range, r2: def.range * def.range, splash: 1,
    };
    this.units[cell] = u;
    this.dirty = true;
    if (!quiet) this.emit('unit', { id: def.id });
    return u;
  }

  summonCost() {
    if (this.freeSummon > 0) return 0;
    return Math.max(5, 15 + Math.floor(this.summons / 3) - (this.R.summonCost || 0));
  }

  summon() {
    const cost = this.summonCost();
    if (this.gold < cost || !this.hasEmpty() || this.result) return false;
    const r = this.rng.next() * 100;
    const tier = r < SUMMON_W[0] ? 0 : r < SUMMON_W[0] + SUMMON_W[1] ? 1 : 2;
    if (this.freeSummon > 0) this.freeSummon--;
    this.gold -= cost;
    this.summons++;
    this.stats.summons++;
    // 무한 가챠 부적: 가끔 2명, 가끔 0명
    const dbl = this.R.double;
    let n = 1;
    if (dbl) { const r2 = this.rng.next(); n = r2 < dbl[0] ? 2 : r2 < dbl[0] + dbl[1] ? 0 : 1; }
    if (n === 0) { this.emit('summonZero', {}); return true; }
    for (let k = 0; k < n && this.hasEmpty(); k++) {
      const def = this.pickUnit(k ? 0 : tier, null);
      const cell = this.rng.pick(this.emptyCells());
      this.place(def, cell, k ? 0 : cost);
      this.emit('summon', { cell, tier: k ? 0 : tier });
    }
    return true;
  }

  pickUnit(tier, prefCls) {
    if (this.forceN > 0) { this.forceN--; return UNIT[this.forceUnit]; }
    const pool = BY_TIER[tier];
    if (prefCls) {
      const same = pool.filter((u) => u.cls === prefCls);
      if (same.length) return this.rng.pick(same);
    }
    if (this.royal === 'edric') {
      // 기사 계열 확률 +15%
      let tot = 0;
      for (const u of pool) tot += u.cls === 'knight' ? 1.15 : 1;
      let r = this.rng.next() * tot;
      for (const u of pool) { r -= u.cls === 'knight' ? 1.15 : 1; if (r <= 0) return u; }
    }
    return this.rng.pick(pool);
  }

  gamble(level) {
    const g = GAMBLE[level];
    if (!g || this.stones < g.cost || !this.hasEmpty() || this.result) return false;
    this.stones -= g.cost;
    this.stats.gambles++;
    const rigged = this.forceFail > 0 ? (this.forceFail--, true) : false;
    if (!rigged && this.rng.chance(Math.min(0.95, g.p + (this.R.gamble || 0)))) {
      const def = this.pickUnit(g.tier, null);
      const cell = this.rng.pick(this.emptyCells());
      this.place(def, cell, 0);
      this.emit('gambleWin', { cell, tier: g.tier });
    } else {
      this.badLuck = Math.min(PITY_MAX, this.badLuck + 1);
      this.stats.fails++;
      let consol = this.R.consol || 0;
      if (this.mascot === 'puru' && this.rng.chance(0.2 * this.mboost)) consol += 30;
      if (this.R.gambleRefund && this.rng.chance(0.5)) this.stones += Math.ceil(g.cost / 2);
      this.gold += consol;
      this.emit('gambleFail', { line: this.rng.pick(FAIL_LINES), consol });
    }
    return true;
  }

  pity() {
    if (this.badLuck < PITY_MAX || !this.hasEmpty() || this.result) return false;
    this.badLuck = 0;
    const def = this.pickUnit(3, null);
    const cell = this.rng.pick(this.emptyCells());
    this.place(def, cell, 0);
    this.emit('gambleWin', { cell, tier: 3, pity: true });
    return true;
  }

  mergePartners(cell) {
    const u = this.units[cell];
    if (!u || u.def.tier >= 4) return null;
    const out = [];
    const b0 = u.o * 18;
    for (let i = b0; i < b0 + 18 && out.length < 2; i++) {
      if (i !== cell && this.units[i] && this.units[i].def === u.def) out.push(i);
    }
    return out.length === 2 ? out : null;
  }

  merge(cell) {
    const partners = this.mergePartners(cell);
    if (!partners || this.result || this.ownerOf(cell) !== this.cur) return false;
    const u = this.units[cell];
    for (const p of partners) this.units[p] = null;
    const tier = u.def.tier + 1;
    const def = this.pickUnit(tier, this.rng.chance(0.5) ? u.def.cls : null);
    this.units[cell] = null;
    this.place(def, cell, 0);
    this.stats.merges++;
    this.emit('merge', { cell, tier, from: partners });
    return true;
  }

  sell(cell) {
    const u = this.units[cell];
    if (!u || u.def.tier >= 5 || this.result || u.o !== this.cur) return 0;
    const refund = u.spent ? Math.floor(u.spent * 0.5) : TIERS[u.def.tier].sell;
    this.units[cell] = null;
    this.gold += refund;
    this.dirty = true;
    this.emit('sell', { cell, refund });
    return refund;
  }

  move(from, to) {
    if (from === to || this.result || from < 0 || to < 0 || to >= this.nCells) return false;
    const a = this.units[from], b = this.units[to];
    if (!a || a.o !== this.cur) return false;
    const ot = this.ownerOf(to);
    if (ot !== this.cur) return this.gift(from, to);
    this.units[to] = a; a.cell = to;
    this.units[from] = b; if (b) b.cell = from;
    this.dirty = true;
    return true;
  }

  // ── 협동: 유닛 선물 (동료 보드의 빈 칸으로) ──
  gift(from, to) {
    const a = this.units[from];
    const ot = this.ownerOf(to);
    if (!a || this.units[to] || a.o !== this.cur || ot === this.cur) return false;
    const R = this.P[ot];
    if (a.def.tier >= 5) {
      if (R.celestial >= R.maxCelestial) { this.emit('giftFull', { cell: from }); return false; }
      this.celestial--; R.celestial++;
    }
    this.units[from] = null;
    this.units[to] = a; a.cell = to; a.o = ot; a.spent = 0;
    this.stats.gifts++;
    this.dirty = true;
    this.emit('gift', { from, cell: to, id: a.def.id, to: ot });
    return true;
  }

  // ── 협동: 금화 보내기 ──
  sendGold(v = 20) {
    const ot = 1 - this.cur;
    if (this.nP < 2 || this.gold < v || this.result) return false;
    this.gold -= v;
    this.P[ot].gold += v;
    this.stats.sent += v;
    this.emit('sendGold', { v, to: ot });
    return true;
  }

  recipeState(r) {
    const used = new Set();
    const b0 = this.cur * 18;
    const have = r.mats.map((id) => {
      for (let i = b0; i < b0 + 18; i++) {
        const u = this.units[i];
        if (u && !used.has(i) && u.def.id === id) { used.add(i); return i; }
      }
      return -1;
    });
    return { have, ok: have.every((x) => x >= 0) && this.celestial < this.maxCelestial };
  }

  craft(idx) {
    const r = RECIPES[idx];
    if (!r || this.result) return false;
    const st = this.recipeState(r);
    if (!st.ok) return false;
    for (const c of st.have) this.units[c] = null;
    const cell = st.have[0];
    this.place(UNIT[r.result], cell, 0);
    this.celestial++;
    this.stats.celestials++;
    this.emit('celestial', { cell, id: r.result });
    return true;
  }

  upgradeCost(g) {
    let c = upgCost(g, this.upg[g]) * (1 - (this.R.upgCost || 0));
    if (this.royal === 'kyle') c *= 0.85;
    return Math.round(c);
  }
  upgrade(g) {
    const c = this.upgradeCost(g);
    if (this.gold < c || this.result) return false;
    this.gold -= c;
    this.upg[g]++;
    this.emit('upgrade', { g, lv: this.upg[g] });
    return true;
  }

  skill() {
    if (this.skillT < this.skillCd || this.result || this.phase === 'prep') return false;
    this.skillT = 0;
    const B = this.mboost;
    let extra = {};
    switch (this.mascot) {
      case 'cat': {
        const top = this.enemies.filter((e) => e.alive).sort((a, b) => b.hp - a.hp).slice(0, 5);
        for (const e of top) { e.stunT = Math.max(e.stunT, e.boss ? 0.6 : 2); this.damage(e, this.powerUnit() * 6 * B, 't', null, false); }
        extra.targets = top.map((e) => [e.x, e.y]);
        break;
      }
      case 'mimic': {
        const t = this.randomEnemy();
        const s0 = t ? t.s - 60 : 0;
        let eaten = 0;
        for (const e of this.enemies) {
          if (!e.alive || eaten >= Math.round(12 * B)) continue;
          const PM = this.L.PERIM;
          let rel = (e.s - s0) % PM; if (rel < 0) rel += PM;
          if (rel > 244) continue;
          if (e.boss || e.elite) { this.damage(e, e.maxHp * 0.04, 't', null, false); continue; }
          this.kill(e, null, true); eaten++;
        }
        this.gold += eaten * 3;
        extra = { eaten, x: t ? t.x : 180, y: t ? t.y : 196 };
        break;
      }
      case 'rock': {
        const awake = this.rng.chance(0.01 * B);
        extra.awake = awake;
        if (awake) for (const e of this.enemies) { if (!e.alive) continue; if (e.boss || e.elite) this.damage(e, e.maxHp * 0.1, 't', null, false); else this.kill(e, null); }
        break;
      }
      case 'owl': this.buff = 'owl'; this.buffT = 12; this.dirty = true; break;
      case 'egg': {
        const stage = this.eggStage();
        if (stage < 2) {
          for (const e of this.enemies) if (e.alive && !e.boss) { e.s = Math.max(0, e.s - 60); e.stunT = Math.max(e.stunT, 0.5); }
        } else {
          const t = this.randomEnemy();
          if (t) this.zones.push({ s0: t.s - 160, s1: t.s + 20, t: 2, dur: 2, dps: this.powerUnit() * 10 * B, src: null, def: null, o: this.cur });
        }
        extra.stage = stage;
        break;
      }
      case 'snail': this.deliver = 5; break;
      case 'potato': this.wall = Math.min(this.wallMax, this.wall + 8 * B); break;
      default: this.cheerT = 10;
    }
    this.emit('skill', { id: this.mascot, ...extra });
    return true;
  }

  eggStage() { return this.eggKills >= 800 ? 2 : this.eggKills >= 300 ? 1 : 0; }
  // 마스코트 스킬 위력 기준: 현재 웨이브 적 체력
  powerUnit() { return hpAt(this.curL()) * 0.5; }
  curL() { return this.node.trial ? Math.max(1, this.wave) : this.node.L + Math.max(0, this.wave - 1) * 0.45; }

  cleanse(cell) {
    const u = this.units[cell];
    if (!u) return false;
    if (u.corrupt > 0) { u.corrupt = Math.max(0, u.corrupt - 3); this.emit('cleanse', { cell, done: u.corrupt <= 0 }); return true; }
    if (u.ice > 0) { u.ice = Math.max(0, u.ice - 1.6); this.emit('icebreak', { cell, done: u.ice <= 0 }); return true; }
    return false;
  }

  // ───────────────────────── 보정치 계산 ─────────────────────────
  recalc() {
    this.dirty = false;
    const prev = this.cur;
    for (let o = 0; o < this.nP; o++) { this.cur = o; this.recalcBoard(o * 18); }
    this.cur = prev;
  }

  recalcBoard(b0) {
    const NB = this.L.NB;
    const seen = {};
    const counts = {};
    for (const k of CLASS_ORDER) seen[k] = new Set();
    const units = this.units;
    let saint = false, witch = 0, nameless = false;
    for (let i = b0; i < b0 + 18; i++) {
      const u = units[i];
      if (!u) continue;
      seen[u.def.cls].add(u.def.id);
      counts[u.def.id] = (counts[u.def.id] || 0) + 1;
      if (u.def.globalDmg) saint = true;
      if (u.def.globalSlow) witch = Math.max(witch, u.def.globalSlow);
      if (u.def.goldMul) nameless = true;
    }
    for (const k of CLASS_ORDER) this.syn[k] = seen[k].size;
    const s = this.syn;
    this.mods = {
      knightStun: s.knight >= 3 ? 0.03 : 0,
      knightBoss: s.knight >= 4 ? 0.15 : 0,
      crit: (s.archer >= 4 ? 0.2 : 0),
      critAll: this.R.crit || 0,
      magicMul: (s.mage >= 3 ? 1.1 : 1) * (this.buff === 'owl' ? 1.2 : 1),
      meteor: s.mage >= 4,
      goldMul: (s.priest >= 3 ? 1.1 : 1) * (nameless ? 2 : 1) * (1 + (this.R.goldMul || 0)),
      killGold: (s.rogue >= 2 ? 1 : 0) + (this.R.goldKill || 0),
      stoneMul: (s.rogue >= 3 ? 1.5 : 1) * (1 + (this.R.stoneMul || 0)),
      rogueExec: s.rogue >= 4 ? 0.05 : 0,
      globalSlow: Math.min(0.6, witch + (this.R.slow || 0)),
      saint,
    };
    for (let i = b0; i < b0 + 18; i++) {
      const u = units[i];
      this.mergeable[i] = !!(u && u.def.tier < 4 && counts[u.def.id] >= 3);
      if (!u) continue;
      const d = u.def;
      let spd = 1 + (s.priest >= 2 ? 0.05 : 0);
      let dmg = 1 + (saint ? 0.25 : 0);
      let range = d.range;
      let splash = 1;
      for (const n of NB[i]) {
        const v = units[n];
        if (!v) continue;
        if (v.def.auraSpd) spd += v.def.auraSpd;
        if (v.def.auraDmg) dmg += v.def.auraDmg;
      }
      if (d.cls === 'knight') dmg += s.knight >= 4 ? 0.25 : s.knight >= 2 ? 0.1 : 0;
      if (d.cls === 'archer') {
        if (s.archer >= 2) range += 24;
        if (s.archer >= 3) spd += 0.15;
      }
      if (d.cls === 'mage') {
        if (s.mage >= 2) splash = 1.15;
        if (this.royal === 'seren') spd += 0.1;
      }
      const R = this.R;
      dmg += (R.dmg || 0) + ((R.cls && R.cls[d.cls]) || 0) + ((R.grp && R.grp[upgGroup(d.tier)]) || 0);
      spd += R.spd || 0;
      range += R.range || 0;
      if (this.buff === 'owl' && d.cls === 'mage') dmg += 0.5 * this.mboost;
      u.spd = spd;
      u.dmgMul = dmg;
      u.range = range;
      u.r2 = range * range;
      u.splash = splash;
    }
  }

  upgMul(def) { return 1 + 0.1 * this.upg[upgGroup(def.tier)]; }

  // ───────────────────────── 웨이브 ─────────────────────────
  startWave(w) {
    this.wave = w;
    this.phase = 'wave';
    this.waveT = 0;
    this.stoneWave = 0;
    const list = [];
    const special = [];
    for (const [type, n] of this.node.waves[w - 1]) {
      const d = ENEMIES[type];
      if (d.boss || d.elite) { special.push(type); continue; }
      const m = this.coop ? Math.round(n * COOP_COUNT) : n;
      for (let i = 0; i < m; i++) list.push(type);
    }
    this.rng.shuffle(list);
    const span = WAVE_TIME * 0.9;
    this.queue = list.map((type, i) => ({ type, t: (i / list.length) * span }));
    this.qi = 0;
    for (const type of special) this.queue.push({ type, t: ENEMIES[type].boss ? 2.5 : WAVE_TIME * 0.6 });
    this.queue.sort((a, b) => a.t - b.t);
    const boss = special.find((t) => ENEMIES[t].boss);
    this.emit('wave', { wave: w, of: this.nWaves, boss: boss || null, elite: special.find((t) => ENEMIES[t].elite) || null });
    if (this.R.wallDrain) this.hurtWall(this.R.wallDrain, 'curse');
  }

  waveReward() {
    const w = this.wave;
    const L = this.curL();
    const g0 = Math.round((this.node.trial ? 20 + w * 6 : 16 + L * 4) + (this.R.waveGold || 0));
    const stone = (this.node.trial ? w % 3 === 0 : w === this.nWaves - 1 && this.rng.chance(0.5)) ? 1 : 0;
    const prev = this.cur;
    let g = g0;
    for (let o = 0; o < this.nP; o++) {
      this.cur = o;
      let go = g0;
      if (this.mascot === 'snail') go = Math.round(g0 * (1 + 0.05 * this.mboost));
      this.gold += go;
      this.stones += stone;
      if (o === prev) g = go;
    }
    this.cur = prev;
    let heal = this.R.waveHeal || 0;
    for (const u of this.units) if (u && u.def.waveHeal) heal += u.def.waveHeal;
    if (heal) this.wall = Math.min(this.wallMax, this.wall + heal);
    this.emit('waveClear', { wave: w, gold: g, stone, heal });
  }

  spawn(type, sOff = 0) {
    const def = ENEMIES[type];
    const e = this.epool.pop() || {};
    const L = this.curL();
    let hp;
    if (def.boss) hp = (this.node.trial ? BOSS_HP : hpAt(L) * def.hp) * (1 + (this.R.bossHp || 0)) * (type === 'morven' ? 1 - (this.R.morvenWeak || 0) : 1);
    else hp = hpAt(L) * def.hp * (1 + (this.R.enemyHp || 0));
    if (this.coop) hp *= def.boss || def.elite ? COOP_BOSS : COOP_HP;
    e.uid = this.uid++;
    e.type = type; e.def = def; e.boss = !!def.boss;
    e.hp = e.maxHp = hp;
    e.s = sOff; e.dist = 0; e.lap = 0;
    e.spd = def.spd * (0.94 + this.rng.next() * 0.12);
    e.armor = def.armor; e.mres = def.mres;
    e.slowT = 0; e.slowAmt = 0; e.stunT = 0;
    e.burnT = 0; e.burnDps = 0; e.burnSrc = null; e.boomR = 0; e.boomDmg = 0;
    e.phaseT = def.phase ? this.rng.next() * def.phase[0] : 0; e.invis = false;
    e.flash = 0; e.numT = 0; e.alive = true; e.roarT = def.gimmick === 'roar' ? 9 : 0;
    e.abT = 2 + this.rng.next() * 2; e.raged = false; e.clone = false; e.splits = 0; e.elite = !!def.elite; e.shield = false;
    e.walk = this.rng.next() * 10;
    this.L.path(e.s, TMP); e.x = TMP.x; e.y = TMP.y; e.dx = TMP.dx; e.dy = TMP.dy;
    this.enemies.push(e);
    if (e.boss) { this.boss = e; this.bossT = BOSS_TIME; this.gimT = 6; this.emit('boss', { id: type }); }
    return e;
  }

  // ───────────────────────── 메인 틱 ─────────────────────────
  tick(dt) {
    if (this.result) return;
    if (this.dirty) this.recalc();
    this.time += dt;

    // 웨이브 진행
    if (this.phase === 'prep') {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave(1);
    } else if (this.phase === 'wave') {
      this.waveT += dt;
      while (this.qi < this.queue.length && this.queue[this.qi].t <= this.waveT) {
        const q = this.queue[this.qi++];
        const g = ENEMIES[q.type].group || 1;
        for (let k = 0; k < g; k++) this.spawn(q.type, -k * 9);
      }
      const hasBoss = this.boss && this.boss.alive;
      if (this.waveT >= WAVE_TIME && this.qi >= this.queue.length && !hasBoss) {
        if (this.wave < this.nWaves) {
          this.waveReward();
          this.phase = 'rest';
          this.timer = REST_TIME;
        } else if (!this.boss) {
          this.waveReward();
          this.phase = 'leftover';
          this.leftT = LEFTOVER_TIME;
        }
      }
    } else if (this.phase === 'rest') {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave(this.wave + 1);
    } else if (this.phase === 'leftover') {
      this.leftT -= dt;
      if (!this.enemies.some((e) => e.alive)) this.victory(0);
      else if (this.leftT <= 0) {
        const n = this.enemies.filter((e) => e.alive).length;
        this.hurtWall(Math.min(15, Math.ceil(n * 0.5)), 'escape');
        if (this.wall > 0) this.victory(n);
      }
    }
    if (this.result) return;
    const prev = this.cur;
    for (let o = 0; o < this.nP; o++) {
      this.cur = o;
      if (this.buffT > 0) { this.buffT -= dt; if (this.buffT <= 0) { this.buff = null; this.dirty = true; } }
      if (this.deliver > 0) {
        this.deliver -= dt;
        if (this.deliver <= 0) {
          for (let k = 0; k < 2; k++) {
            if (this.hasEmpty()) { const cell = this.rng.pick(this.emptyCells()); this.place(this.pickUnit(1, null), cell, 0); this.emit('summon', { cell, tier: 1 }); }
            else this.gold += 25;
          }
          this.emit('delivered', {});
        }
      }
      if (this.phase !== 'prep') this.skillT = Math.min(this.skillCd, this.skillT + dt);
      if (this.cheerT > 0) this.cheerT -= dt;
    }
    this.cur = prev;
    if (this.freezeT > 0) { this.freezeT -= dt; if (this.freezeT <= 0) this.freezeRow = -1; }
    if (this.ashT > 0) this.ashT -= dt;
    if (this.timeStopT > 0) this.timeStopT -= dt;

    if (this.boss && this.boss.alive) {
      this.bossT -= dt;
      if (this.bossT <= 0) {
        this.bossT = BOSS_TIME;
        this.hurtWall(25, 'timeout');
      }
      this.bossGimmick(dt);
    }

    this.updateEnemies(dt);
    this.updateUnits(dt);
    this.updateProjs(dt);
    this.updateZones(dt);

    for (let o = 0; o < this.nP; o++) {
      this.cur = o;
      if (!this.mods.meteor) continue;
      this.metT += dt;
      if (this.metT >= 3) {
        this.metT = 0;
        const t = this.randomEnemy();
        if (t) this.fireMeteor(null, t, hpAt(this.curL()) * 1.2, 30, true);
      }
    }
    this.cur = prev;

    // 필드 한도
    const n = this.enemies.length;
    for (const P of this.P) if (n > P.stats.maxField) P.stats.maxField = n;
    const FL = this.L.fieldLimit;
    this.overflow = n > FL;
    if (this.overflow) this.hurtWall((n - FL) * 0.08 * dt, null);

    // 정리
    const arr = this.enemies;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i].alive) {
        this.epool.push(arr[i]);
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }

    this.cur = prev;
    if (this.wall <= 0 && !this.result) {
      this.wall = 0;
      this.result = 'defeat';
      this.emit('defeat', {});
    }
  }

  hurtWall(v, why) {
    if ((why === 'bossLap' || why === 'timeout') && this.wallSaves > 0) {
      this.wallSaves--;
      v *= 0.5;
      this.emit('guarded', {});
    }
    this.wall -= v;
    for (const P of this.P) P.stats.wallLost += v;
    if (why) this.emit('wallHit', { v, why });
  }

  // ── 보스 고유 기믹 ──
  bossGimmick(dt) {
    const b = this.boss;
    const g = b.def.gimmick;
    this.gimT -= dt;
    if (g === 'split') {
      const ratio = b.hp / b.maxHp;
      if ((b.splits === 0 && ratio < 0.66) || (b.splits === 1 && ratio < 0.33)) {
        b.splits++;
        for (let k = 0; k < 2; k++) {
          const c = this.spawn('shadow', b.s - 30 - k * 30);
          c.boss = false; c.clone = true; c.elite = true;
          c.hp = c.maxHp = b.maxHp * 0.14;
          c.spd = b.spd * 1.3;
        }
        this.boss = b;
        this.emit('split', { x: b.x, y: b.y });
      }
      b.shield = this.enemies.some((e) => e.alive && e.clone);
      return;
    }
    if (this.gimT > 0) return;
    if (g === 'corrupt') {
      this.gimT = 12;
      const cand = this.units.filter((u) => u && u.def.tier < 5 && !(u.corrupt > 0));
      if (cand.length) {
        const u = this.rng.pick(cand);
        u.corrupt = 9;
        this.emit('corrupt', { cell: u.cell });
      }
    } else if (g === 'freeze') {
      this.gimT = 14;
      const row = this.rng.int(3);
      this.freezeRow = row;
      this.freezeT = 7;
      for (let o = 0; o < this.nP; o++) for (let c = 0; c < COLS; c++) { const u = this.units[o * 18 + row * COLS + c]; if (u) u.ice = 7; }
      this.emit('freeze', { row });
    } else if (g === 'steal') {
      this.gimT = 10;
      let took = 0;
      for (const P of this.P) { const t = Math.min(P.gold, Math.max(10, Math.floor(P.gold * 0.12))); P.gold -= t; took += t; }
      this.emit('steal', { v: took, x: b.x, y: b.y });
    } else if (g === 'ashrain') {
      this.gimT = 11;
      this.ashT = 5;
      for (let k = 0; k < 4; k++) this.spawn('cultist', b.s - 20 - k * 12);
      this.emit('ashrain', {});
    } else this.gimT = 99;
  }

  updateEnemies(dt) {
    const stop = this.timeStopT > 0;
    const gslow = 1 - this.mods.globalSlow;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.cur = e.burnO || 0;
        this.damage(e, e.burnDps * dt, 'm', e.burnSrc, true);
        if (!e.alive) continue;
      }
      if (e.def.phase) {
        e.phaseT += dt;
        const [cyc, dur] = e.def.phase;
        if (e.phaseT >= cyc) e.phaseT -= cyc;
        e.invis = e.phaseT < dur;
      }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      if (stop) continue;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      const v = e.spd * (1 - e.slowAmt) * gslow * dt;
      e.s += v; e.dist += v; e.walk += v * 0.08;
      if (e.s >= this.L.PERIM) {
        e.s -= this.L.PERIM;
        if (e.boss) this.hurtWall(15, 'bossLap');
      }
      this.L.path(e.s, TMP);
      e.x = TMP.x; e.y = TMP.y; e.dx = TMP.dx; e.dy = TMP.dy;
      if (e.def.gimmick === 'roar' && e.boss) {
        e.roarT -= dt;
        if (e.roarT <= 0) {
          e.roarT = 9;
          for (let k = 0; k < 4; k++) {
            const m = this.spawn('rat', e.s - 16 - k * 10);
            m.hp = m.maxHp = hpAt(this.node.trial ? 10 : this.curL()) * 0.6;
          }
          this.emit('roar', { x: e.x, y: e.y });
        }
      }
      if (e.elite && !e.clone) this.eliteAbility(e, dt);
    }
  }

  eliteAbility(e, dt) {
    const d = e.def;
    if (d.enrage && !e.raged && e.hp < e.maxHp * d.enrage) { e.raged = true; e.spd *= 1.5; this.emit('enrage', { x: e.x, y: e.y }); }
    e.abT -= dt;
    if (e.abT > 0) return;
    if (d.heal) {
      e.abT = d.heal[0];
      const r2 = d.heal[2] * d.heal[2];
      for (const o of this.enemies) {
        if (!o.alive || o.boss) continue;
        const dx = o.x - e.x, dy = o.y - e.y;
        if (dx * dx + dy * dy <= r2) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * d.heal[1]);
      }
      this.emit('heal', { x: e.x, y: e.y, r: d.heal[2] });
    } else if (d.summon) {
      e.abT = d.summon[0];
      for (let k = 0; k < d.summon[2]; k++) this.spawn(d.summon[1], e.s - 14 - k * 10);
      this.emit('raise', { x: e.x, y: e.y });
    } else e.abT = 99;
  }

  // ───────────────────────── 유닛 공격 ─────────────────────────
  findTarget(x, y, r2, snipe, exclude) {
    let best = null, bv = -1;
    for (const e of this.enemies) {
      if (!e.alive || e.invis || e === exclude) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy > r2) continue;
      const v = snipe ? e.hp : e.dist;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }

  randomEnemy() {
    const n = this.enemies.length;
    if (!n) return null;
    for (let k = 0; k < 6; k++) {
      const e = this.enemies[this.rng.int(n)];
      if (e.alive && !e.invis) return e;
    }
    return null;
  }

  updateUnits(dt) {
    const CX = this.L.CX, CY = this.L.CY;
    let co = -1, cheer = 0;
    for (let i = 0, n = this.nCells; i < n; i++) {
      const u = this.units[i];
      if (!u) continue;
      if (u.o !== co) {
        co = u.o; this.cur = co;
        cheer = (this.cheerT > 0 ? 0.3 * this.mboost : 0) - (this.ashT > 0 ? 0.35 : 0);
      }
      if (u.anim > 0) u.anim -= dt;
      if (u.corrupt > 0) { u.corrupt -= dt; continue; }
      if (u.ice > 0) { u.ice -= dt; continue; }
      const d = u.def;
      const x = CX[i], y = CY[i];

      // 주기 스킬
      if (d.rain || d.dash || d.meteor || d.judgment || d.timeStop) {
        u.skT += dt;
        this.unitSkill(u, x, y);
      }

      u.cd -= dt * Math.max(0.2, u.spd + cheer);
      if (u.cd > 0) continue;
      const tgt = this.findTarget(x, y, u.r2, d.snipe, null);
      if (!tgt) { u.cd = 0; continue; }
      u.cd += 1 / d.rate;
      u.anim = 0.12;
      u.face = tgt.x < x ? -1 : 1;
      this.attack(u, tgt, x, y);
    }
  }

  unitDmg(u) { return u.def.dmg * (1 + 0.1 * this.P[u.o].upg[upgGroup(u.def.tier)]) * u.dmgMul; }

  attack(u, tgt, x, y) {
    const d = u.def;
    let dmg = this.unitDmg(u);
    if (d.duel) {
      if (u.lastTgt === tgt.uid) u.stacks = Math.min(d.duel[1], u.stacks + 1);
      else u.stacks = 0;
      u.lastTgt = tgt.uid;
      dmg *= 1 + d.duel[0] * u.stacks;
    }
    switch (d.proj) {
      case 'melee': {
        u.hits++;
        this.emit('slash', { x: tgt.x, y: tgt.y, tier: d.tier, big: d.every3 && u.hits % 3 === 0 });
        if (d.every3 && u.hits % 3 === 0) this.splash(tgt.x, tgt.y, d.every3, dmg, d, u, null);
        else this.applyHit(tgt, dmg, d, u, x, y);
        break;
      }
      case 'beam': {
        this.beam(u, tgt, x, y, dmg);
        break;
      }
      case 'zap': {
        const pts = [x, y - 8];
        let cur = tgt, mul = 1;
        const hit = [];
        for (let k = 0; k < d.chain && cur; k++) {
          pts.push(cur.x, cur.y);
          hit.push(cur);
          this.applyHit(cur, dmg * mul, d, u, x, y);
          mul *= 0.85;
          let nb = null, nd = 64 * 64;
          for (const e of this.enemies) {
            if (!e.alive || e.invis || hit.includes(e)) continue;
            const dx = e.x - cur.x, dy = e.y - cur.y, dd = dx * dx + dy * dy;
            if (dd < nd) { nd = dd; nb = e; }
          }
          cur = nb;
        }
        this.emit('zap', { pts });
        break;
      }
      default: {
        this.fire(u, tgt, x, y, dmg);
        if (d.multi) {
          const t2 = this.findTarget(x, y, u.r2, false, tgt);
          if (t2) this.fire(u, t2, x, y, dmg);
        }
      }
    }
  }

  fire(u, tgt, x, y, dmg) {
    const p = this.ppool.pop() || {};
    const k = u.def.proj;
    p.kind = k; p.x = x; p.y = y - 8; p.tgt = tgt; p.tid = tgt.uid;
    p.tx = tgt.x; p.ty = tgt.y;
    p.spd = k === 'snipe' ? 900 : k === 'arrow' || k === 'bolt' || k === 'dagger' ? 420 : 300;
    p.dmg = dmg; p.def = u.def; p.src = u; p.ux = x; p.uy = y;
    p.splash = u.def.splash ? u.def.splash * u.splash : 0;
    p.fall = false; p.life = 3; p.o = this.cur;
    this.projs.push(p);
  }

  fireMeteor(u, tgt, dmg, r, small) {
    const p = this.ppool.pop() || {};
    p.kind = small ? 'mini' : 'meteor';
    p.tgt = null; p.tid = 0;
    p.tx = tgt.x; p.ty = tgt.y;
    p.x = tgt.x + 40; p.y = tgt.y - 150;
    p.spd = 340; p.dmg = dmg; p.def = u ? u.def : null; p.src = u;
    p.splash = r; p.fall = true; p.life = 3; p.ux = p.x; p.uy = p.y; p.o = this.cur;
    this.projs.push(p);
  }

  unitSkill(u, x, y) {
    const d = u.def;
    if (d.rain && u.skT >= d.rain[0]) {
      u.skT = 0;
      const dmg = this.unitDmg(u) * d.rain[2];
      for (let k = 0; k < d.rain[1]; k++) {
        const t = this.randomEnemy();
        if (!t) break;
        const p = this.ppool.pop() || {};
        p.kind = 'rain'; p.tgt = t; p.tid = t.uid; p.tx = t.x; p.ty = t.y;
        p.x = t.x - 30 + k * 6; p.y = t.y - 140 - k * 12; p.spd = 380;
        p.dmg = dmg; p.def = d; p.src = u; p.splash = 0; p.fall = false; p.life = 3; p.ux = x; p.uy = y; p.o = this.cur;
        this.projs.push(p);
      }
      this.emit('rain', { x, y });
    } else if (d.dash && u.skT >= d.dash[0]) {
      const t = this.findTarget(x, y, (u.range + 40) ** 2, false, null);
      if (!t) return;
      u.skT = 0;
      const [, len, dur, mul] = d.dash;
      this.zones.push({ s0: t.s - len, s1: t.s + 10, t: dur, dur, dps: this.unitDmg(u) * mul, src: u, def: d, o: this.cur });
      this.emit('dash', { x, y, tx: t.x, ty: t.y });
    } else if (d.meteor && u.skT >= d.meteor[0]) {
      u.skT = 0;
      const dmg = this.unitDmg(u) * d.meteor[2];
      for (let k = 0; k < d.meteor[1]; k++) {
        const t = this.randomEnemy();
        if (t) this.fireMeteor(u, t, dmg, d.meteor[3], false);
      }
    } else if (d.judgment && u.skT >= d.judgment[0]) {
      if (!this.enemies.length) return;
      u.skT = 0;
      const dmg = this.unitDmg(u) * d.judgment[1];
      for (const e of this.enemies) {
        if (!e.alive) continue;
        e.stunT = Math.max(e.stunT, e.boss ? 0.5 : d.judgment[2]);
        this.damage(e, dmg * (1 - e.armor), 't', u, false);
      }
      this.emit('judgment', { x, y });
    } else if (d.timeStop && u.skT >= d.timeStop[0]) {
      if (!this.enemies.length) return;
      u.skT = 0;
      this.timeStopT = d.timeStop[1];
      this.emit('timeStop', { x, y });
    }
  }

  beam(u, tgt, x, y, dmg) {
    const d = u.def;
    let dx = tgt.x - x, dy = tgt.y - y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const L = 520;
    const w2 = d.beam * d.beam;
    for (const e of this.enemies) {
      if (!e.alive || e.invis) continue;
      const ex = e.x - x, ey = e.y - y;
      const t = ex * dx + ey * dy;
      if (t < 0 || t > L) continue;
      const px = ex - dx * t, py = ey - dy * t;
      if (px * px + py * py <= w2) this.applyHit(e, dmg, d, u, x, y);
    }
    this.emit('beam', { x, y: y - 8, x2: x + dx * L, y2: y + dy * L });
  }

  splash(cx, cy, r, dmg, def, u, primary) {
    const r2 = r * r;
    if (primary && primary.alive) this.applyHit(primary, dmg, def, u, cx, cy);
    for (const e of this.enemies) {
      if (!e.alive || e === primary) continue;
      const dx = e.x - cx, dy = e.y - cy;
      if (dx * dx + dy * dy <= r2) this.applyHit(e, dmg * 0.6, def, u, cx, cy, true);
    }
    this.emit('boom', { x: cx, y: cy, r, kind: def ? def.proj : 'mini' });
  }

  applyHit(e, dmg, def, u, ux, uy, secondary) {
    if (!e.alive) return;
    let d = dmg;
    let crit = false;
    if (def) {
      if (def.backstab && e.dx * (e.x - ux) + e.dy * (e.y - uy) > 0) { d *= def.backstab; crit = true; }
      if (def.bossBonus && e.boss) d *= 1 + def.bossBonus;
      if (def.cls === 'knight' && e.boss && this.mods.knightBoss) d *= 1 + this.mods.knightBoss;
      if (e.boss && this.R.bossDmg) d *= 1 + this.R.bossDmg;
      const cp = (def.cls === 'archer' ? this.mods.crit : 0) + this.mods.critAll;
      if (cp && this.rng.chance(cp)) { d *= 2; crit = true; }
      if (!e.boss && !e.elite && !secondary) {
        const ex = (def.execute || 0) + (def.cls === 'rogue' ? this.mods.rogueExec : 0) + (this.R.execute || 0);
        if (ex && this.rng.chance(ex)) {
          this.emit('execute', { x: e.x, y: e.y });
          this.damage(e, e.hp + 1, 't', u, false, true);
          return;
        }
      }
    }
    this.damage(e, d, def ? def.dtype : 'm', u, false, crit);
    if (!def) return;
    if (def.slow) { e.slowAmt = Math.max(e.slowAmt, def.slow[0]); e.slowT = def.slow[1]; }
    const stunP = (def.stun ? def.stun[0] : 0) + (def.cls === 'knight' ? this.mods.knightStun : 0);
    if (stunP && e.alive && this.rng.chance(stunP)) e.stunT = Math.max(e.stunT, def.stun ? def.stun[1] : 0.5);
    if (def.burn && e.alive) {
      e.burnT = def.burn[0]; e.burnDps = Math.max(e.burnDps, dmg * def.burn[1]); e.burnSrc = u; e.burnO = this.cur;
      e.boomR = def.boom[0]; e.boomDmg = dmg * def.boom[1];
    }
    if (def.bossPct && e.boss && e.alive) this.damage(e, e.maxHp * def.bossPct, 't', u, true);
  }

  damage(e, raw, dtype, u, quiet, crit) {
    if (!e.alive) return 0;
    if (e.shield) { if (!quiet && this.time - (e.numT || 0) > 0.5) { e.numT = this.time; this.emit('immune', { x: e.x, y: e.y - 20 }); } return 0; }
    let d = raw;
    if (dtype === 'p') d *= 1 - e.armor;
    else if (dtype === 'm') d *= (1 - e.mres) * this.mods.magicMul;
    if (d <= 0) return 0;
    e.hp -= d;
    if (u) u.dealt += d;
    if (!quiet) {
      e.flash = 0.08;
      // 숫자는 큰 피해·치명타만, 같은 적에게는 0.25초마다 한 번만 표시
      if (crit || d >= e.maxHp * 0.2 || this.time - (e.numT || 0) > 0.25) {
        e.numT = this.time;
        this.emit('dmg', { x: e.x, y: e.y - 10, v: d, crit: !!crit });
      }
    }
    if (e.hp <= 0) this.kill(e, u);
    return d;
  }

  kill(e, u, eaten) {
    e.alive = false;
    e.hp = 0;
    this.stats.kills++;
    this.eggKills++;
    const def = u ? u.def : null;
    if (e.boss) {
      this.emit('kill', { x: e.x, y: e.y, type: e.type, boss: true });
      for (const P of this.P) P.stones += 3;
      this.victory(0);
      return;
    }
    if (e.elite && !e.clone) { this.stones += 1; this.gold += 30; this.emit('eliteDown', { x: e.x, y: e.y }); }
    let g = 2 + this.mods.killGold + (def && def.killGold ? def.killGold : 0);
    if (this.mascot === 'mimic' && this.rng.chance(0.05 * this.mboost)) g *= 2;
    this.goldFrac += g * this.mods.goldMul;
    const whole = Math.floor(this.goldFrac);
    this.gold += whole; this.goldFrac -= whole;
    if (eaten) { this.emit('eat', { x: e.x, y: e.y }); }
    let stoneP = (0.0035 + (this.R.stone || 0)) * this.mods.stoneMul;
    if (def && def.stoneOnKill && this.stoneWave < 1) stoneP += def.stoneOnKill;
    if (this.rng.chance(stoneP)) {
      this.stones++;
      if (def && def.stoneOnKill) this.stoneWave++;
      this.emit('stone', { x: e.x, y: e.y });
    }
    this.emit('kill', { x: e.x, y: e.y, type: e.type });
    if (e.def.split) {
      for (let k = 0; k < e.def.split; k++) {
        const m = this.spawn('mini', e.s - k * 8);
        m.hp = m.maxHp = hpAt(this.curL()) * ENEMIES.mini.hp;
        m.dist = e.dist - k * 8;
      }
    }
    if (e.burnT > 0 && e.boomR) {
      const r2 = e.boomR * e.boomR;
      for (const o of this.enemies) {
        if (!o.alive) continue;
        const dx = o.x - e.x, dy = o.y - e.y;
        if (dx * dx + dy * dy <= r2) this.damage(o, e.boomDmg, 'm', e.burnSrc, false);
      }
      this.emit('boom', { x: e.x, y: e.y, r: e.boomR, kind: 'flask' });
    }
    if (def && def.shadow && this.rng.chance(def.shadow)) {
      const t = this.findTarget(e.x, e.y, 120 * 120, false, e);
      if (t) {
        const p = this.ppool.pop() || {};
        p.kind = 'shadow'; p.x = e.x; p.y = e.y; p.tgt = t; p.tid = t.uid; p.tx = t.x; p.ty = t.y;
        p.spd = 260; p.dmg = this.unitDmg(u) * 2; p.def = null; p.src = u; p.splash = 0; p.fall = false; p.life = 3; p.o = this.cur;
        p.ux = e.x; p.uy = e.y;
        this.projs.push(p);
      }
    }
  }

  victory(escaped = 0) {
    for (const e of this.enemies) if (e.alive) { e.alive = false; this.emit('ash', { x: e.x, y: e.y }); }
    this.result = 'victory';
    this.emit('victory', { escaped });
  }

  updateProjs(dt) {
    const arr = this.projs;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      let done = false;
      p.life -= dt;
      if (p.tgt) {
        if (p.tgt.alive && p.tgt.uid === p.tid) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
        else p.tgt = null;
      }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.spd * dt;
      if (dist <= step + 3 || p.life <= 0) {
        p.x = p.tx; p.y = p.ty;
        this.cur = p.o || 0;
        this.impact(p);
        done = true;
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.ang = Math.atan2(dy, dx);
      }
      if (done) {
        p.tgt = null; p.src = null; p.def = null;
        this.ppool.push(p);
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }
  }

  impact(p) {
    const def = p.def;
    if (p.fall) {
      this.splash(p.tx, p.ty, p.splash, p.dmg, def, p.src, null);
      return;
    }
    const t = p.tgt;
    if (p.kind === 'shadow') {
      if (t) this.damage(t, p.dmg, 't', p.src, false);
      this.emit('boom', { x: p.tx, y: p.ty, r: 14, kind: 'shadow' });
      return;
    }
    if (p.splash) {
      this.splash(p.tx, p.ty, p.splash, p.dmg, def, p.src, t && !t.invis ? t : null);
      return;
    }
    if (!t || t.invis) { this.emit('miss', { x: p.tx, y: p.ty }); return; }
    this.applyHit(t, p.dmg, def, p.src, p.ux, p.uy);
    if (def && def.pierce) {
      let nb = null, nd = 36 * 36;
      for (const e of this.enemies) {
        if (!e.alive || e === t || e.invis) continue;
        const dx = e.x - t.x, dy = e.y - t.y, dd = dx * dx + dy * dy;
        if (dd < nd) { nd = dd; nb = e; }
      }
      if (nb) this.applyHit(nb, p.dmg * 0.7, def, p.src, p.ux, p.uy, true);
    }
    this.emit('hit', { x: p.tx, y: p.ty, kind: p.kind });
  }

  updateZones(dt) {
    const z = this.zones;
    for (let i = z.length - 1; i >= 0; i--) {
      const zn = z[i];
      zn.t -= dt;
      if (zn.t <= 0) { z[i] = z[z.length - 1]; z.pop(); continue; }
      const span = zn.s1 - zn.s0;
      const PM = this.L.PERIM;
      this.cur = zn.o || 0;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        // 순환 경로: 구간 시작점 기준 상대 위치
        let rel = (e.s - zn.s0) % PM;
        if (rel < 0) rel += PM;
        if (rel <= span) this.damage(e, zn.dps * dt, 'p', zn.src, true);
      }
    }
  }

  // HUD용
  liveCount() { return this.enemies.length; }
  bossInfo() { return this.boss && this.boss.alive ? this.boss : null; }

  // 협동 HUD용: 모든 주인 합계
  totalStat(k) { let t = 0; for (const P of this.P) t += P.stats[k] || 0; return t; }

  ashReward() {
    return Math.round(this.wave * 3 + this.stats.kills / 25 + (this.result === 'victory' ? 30 : 0));
  }
}

// 플레이어별 상태를 this.gold 같은 이름으로 읽고 쓰게 한다 (거울 보드도 같이 씀)
export function defineOwned(Cls) {
  for (const k of OWN) {
    Object.defineProperty(Cls.prototype, k, {
      get() { return this.P[this.cur][k]; },
      set(v) { this.P[this.cur][k] = v; },
      configurable: true,
    });
  }
}
defineOwned(Battle);
