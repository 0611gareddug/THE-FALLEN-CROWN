// 전투 시뮬레이션 (화면과 분리된 순수 로직)
import { RNG } from '../core/rng.js';
import { UNITS, UNIT, BY_TIER, TIERS, RECIPES, MAX_CELESTIAL, CLASS_ORDER, upgGroup, upgCost } from '../data/units.js';
import { ENEMIES, WAVES, WAVE_TIME, REST_TIME, BOSS_TIME, FIELD_LIMIT, baseHp, BOSS_HP, BOSS_WAVE } from '../data/enemies.js';
import { FAIL_LINES } from '../data/text.js';
import { COLS, ROWS, PERIM, cellX, cellY, pathPos, NEIGHBORS } from './layout.js';

const N_CELLS = COLS * ROWS;
const SUMMON_W = [70, 25, 5];
const GAMBLE = [
  { cost: 1, p: 0.6, tier: 2 },
  { cost: 2, p: 0.3, tier: 3 },
  { cost: 3, p: 0.15, tier: 4 },
];
export const PITY_MAX = 10;
const TMP = { x: 0, y: 0, dx: 0, dy: 0 };

export class Battle {
  constructor(opt = {}) {
    this.rng = new RNG(opt.seed);
    this.royal = opt.royal || 'edric';
    this.mascot = opt.mascot || 'puru';
    this.units = new Array(N_CELLS).fill(null);
    this.enemies = [];
    this.epool = [];
    this.projs = [];
    this.ppool = [];
    this.zones = [];
    this.events = [];
    this.uid = 1;

    this.gold = this.royal === 'kyle' ? 150 : 100;
    this.stones = this.royal === 'seren' ? 3 : 0;
    this.wallMax = 100 + (this.royal === 'edric' ? 20 : 0);
    this.wall = this.wallMax;
    this.badLuck = opt.badLuck || 0;

    this.wave = 0;
    this.phase = 'prep';
    this.timer = 6;
    this.waveT = 0;
    this.queue = [];
    this.qi = 0;
    this.boss = null;
    this.bossT = 0;

    this.upg = [0, 0, 0];
    this.summons = 0;
    this.celestial = 0;
    this.time = 0;
    this.skillT = 0;
    this.skillCd = 60;
    this.cheerT = 0;
    this.timeStopT = 0;
    this.metT = 0;
    this.stoneWave = 0;
    this.goldFrac = 0;
    this.overflow = false;
    this.result = null;

    this.syn = { knight: 0, archer: 0, mage: 0, priest: 0, rogue: 0 };
    this.mods = {};
    this.mergeable = new Array(N_CELLS).fill(false);
    this.dirty = true;
    this.stats = { kills: 0, summons: 0, merges: 0, fails: 0, gambles: 0, best: null };
  }

  emit(type, data) {
    const e = data || {};
    e.type = type;
    this.events.push(e);
  }

  // ───────────────────────── 보드 ─────────────────────────
  emptyCells() {
    const out = [];
    for (let i = 0; i < N_CELLS; i++) if (!this.units[i]) out.push(i);
    return out;
  }
  hasEmpty() { return this.units.includes(null); }

  place(def, cell, spent = 0) {
    const u = {
      uid: this.uid++, def, cell, cd: 0.2 + this.rng.next() * 0.4, hits: 0, stacks: 0, lastTgt: 0,
      skT: 0, spent, anim: 0, dealt: 0, born: this.time,
    };
    this.units[cell] = u;
    this.dirty = true;
    this.emit('unit', { id: def.id });
    return u;
  }

  summonCost() { return 15 + Math.floor(this.summons / 3); }

  summon() {
    const cost = this.summonCost();
    if (this.gold < cost || !this.hasEmpty() || this.result) return false;
    const r = this.rng.next() * 100;
    const tier = r < SUMMON_W[0] ? 0 : r < SUMMON_W[0] + SUMMON_W[1] ? 1 : 2;
    const def = this.pickUnit(tier, null);
    const cell = this.rng.pick(this.emptyCells());
    this.gold -= cost;
    this.summons++;
    this.stats.summons++;
    this.place(def, cell, cost);
    this.emit('summon', { cell, tier });
    return true;
  }

  pickUnit(tier, prefCls) {
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
    if (this.rng.chance(g.p)) {
      const def = this.pickUnit(g.tier, null);
      const cell = this.rng.pick(this.emptyCells());
      this.place(def, cell, 0);
      this.emit('gambleWin', { cell, tier: g.tier });
    } else {
      this.badLuck = Math.min(PITY_MAX, this.badLuck + 1);
      this.stats.fails++;
      let consol = 0;
      if (this.mascot === 'puru' && this.rng.chance(0.2)) { consol = 30; this.gold += 30; }
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
    for (let i = 0; i < N_CELLS && out.length < 2; i++) {
      if (i !== cell && this.units[i] && this.units[i].def === u.def) out.push(i);
    }
    return out.length === 2 ? out : null;
  }

  merge(cell) {
    const partners = this.mergePartners(cell);
    if (!partners || this.result) return false;
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
    if (!u || u.def.tier >= 5 || this.result) return 0;
    const refund = u.spent ? Math.floor(u.spent * 0.5) : TIERS[u.def.tier].sell;
    this.units[cell] = null;
    this.gold += refund;
    this.dirty = true;
    this.emit('sell', { cell, refund });
    return refund;
  }

  move(from, to) {
    if (from === to || this.result) return false;
    const a = this.units[from], b = this.units[to];
    if (!a) return false;
    this.units[to] = a; a.cell = to;
    this.units[from] = b; if (b) b.cell = from;
    this.dirty = true;
    return true;
  }

  recipeState(r) {
    const used = new Set();
    const have = r.mats.map((id) => {
      for (let i = 0; i < N_CELLS; i++) {
        const u = this.units[i];
        if (u && !used.has(i) && u.def.id === id) { used.add(i); return i; }
      }
      return -1;
    });
    return { have, ok: have.every((x) => x >= 0) && this.celestial < MAX_CELESTIAL };
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
    this.emit('celestial', { cell, id: r.result });
    return true;
  }

  upgradeCost(g) {
    const c = upgCost(g, this.upg[g]);
    return this.royal === 'kyle' ? Math.round(c * 0.85) : c;
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
    this.cheerT = 10;
    this.emit('skill', { id: this.mascot });
    return true;
  }

  // ───────────────────────── 보정치 계산 ─────────────────────────
  recalc() {
    this.dirty = false;
    const seen = {};
    const counts = {};
    for (const k of CLASS_ORDER) seen[k] = new Set();
    const units = this.units;
    let saint = false, witch = 0, nameless = false;
    for (const u of units) {
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
      crit: s.archer >= 4 ? 0.2 : 0,
      magicMul: s.mage >= 3 ? 1.1 : 1,
      meteor: s.mage >= 4,
      goldMul: (s.priest >= 3 ? 1.1 : 1) * (nameless ? 2 : 1),
      killGold: s.rogue >= 2 ? 1 : 0,
      stoneMul: s.rogue >= 3 ? 1.5 : 1,
      rogueExec: s.rogue >= 4 ? 0.05 : 0,
      globalSlow: witch,
      saint,
    };
    for (let i = 0; i < N_CELLS; i++) {
      const u = units[i];
      this.mergeable[i] = !!(u && u.def.tier < 4 && counts[u.def.id] >= 3);
      if (!u) continue;
      const d = u.def;
      let spd = 1 + (s.priest >= 2 ? 0.05 : 0);
      let dmg = 1 + (saint ? 0.25 : 0);
      let range = d.range;
      let splash = 1;
      for (const n of NEIGHBORS[i]) {
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
    for (const [type, n] of WAVES[w - 1]) {
      if (ENEMIES[type].boss) continue;
      for (let i = 0; i < n; i++) list.push(type);
    }
    this.rng.shuffle(list);
    const span = WAVE_TIME * 0.9;
    this.queue = list.map((type, i) => ({ type, t: (i / list.length) * span }));
    this.qi = 0;
    if (w === BOSS_WAVE) {
      this.queue.push({ type: 'ogran', t: 2.5 });
      this.queue.sort((a, b) => a.t - b.t);
    }
    this.emit('wave', { wave: w, boss: w === BOSS_WAVE });
  }

  waveReward() {
    const w = this.wave;
    const g = 20 + w * 6;
    this.gold += g;
    let stone = 0;
    if (w % 3 === 0) { this.stones++; stone = 1; }
    let heal = 0;
    for (const u of this.units) if (u && u.def.waveHeal) heal += u.def.waveHeal;
    if (heal) this.wall = Math.min(this.wallMax, this.wall + heal);
    this.emit('waveClear', { wave: w, gold: g, stone, heal });
  }

  spawn(type, sOff = 0) {
    const def = ENEMIES[type];
    const e = this.epool.pop() || {};
    const hp = def.boss ? BOSS_HP : baseHp(Math.max(1, this.wave)) * def.hp;
    e.uid = this.uid++;
    e.type = type; e.def = def; e.boss = !!def.boss;
    e.hp = e.maxHp = hp;
    e.s = sOff; e.dist = 0; e.lap = 0;
    e.spd = def.spd * (0.94 + this.rng.next() * 0.12);
    e.armor = def.armor; e.mres = def.mres;
    e.slowT = 0; e.slowAmt = 0; e.stunT = 0;
    e.burnT = 0; e.burnDps = 0; e.burnSrc = null; e.boomR = 0; e.boomDmg = 0;
    e.phaseT = def.phase ? this.rng.next() * def.phase[0] : 0; e.invis = false;
    e.flash = 0; e.numT = 0; e.alive = true; e.roarT = def.roar ? def.roar[0] : 0;
    e.walk = this.rng.next() * 10;
    pathPos(e.s, TMP); e.x = TMP.x; e.y = TMP.y; e.dx = TMP.dx; e.dy = TMP.dy;
    this.enemies.push(e);
    if (e.boss) { this.boss = e; this.bossT = BOSS_TIME; this.emit('boss', {}); }
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
      if (this.waveT >= WAVE_TIME && this.qi >= this.queue.length && this.wave < BOSS_WAVE) {
        this.waveReward();
        this.phase = 'rest';
        this.timer = REST_TIME;
      }
    } else if (this.phase === 'rest') {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave(this.wave + 1);
    }

    if (this.phase !== 'prep') this.skillT = Math.min(this.skillCd, this.skillT + dt);
    if (this.cheerT > 0) this.cheerT -= dt;
    if (this.timeStopT > 0) this.timeStopT -= dt;

    if (this.boss && this.boss.alive) {
      this.bossT -= dt;
      if (this.bossT <= 0) {
        this.bossT = BOSS_TIME;
        this.hurtWall(25, 'timeout');
      }
    }

    this.updateEnemies(dt);
    this.updateUnits(dt);
    this.updateProjs(dt);
    this.updateZones(dt);

    if (this.mods.meteor) {
      this.metT += dt;
      if (this.metT >= 3) {
        this.metT = 0;
        const t = this.randomEnemy();
        if (t) this.fireMeteor(null, t, baseHp(Math.max(1, this.wave)) * 1.2, 30, true);
      }
    }

    // 필드 한도
    const n = this.enemies.length;
    this.overflow = n > FIELD_LIMIT;
    if (this.overflow) this.hurtWall((n - FIELD_LIMIT) * 0.08 * dt, null);

    // 정리
    const arr = this.enemies;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i].alive) {
        this.epool.push(arr[i]);
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }

    if (this.wall <= 0 && !this.result) {
      this.wall = 0;
      this.result = 'defeat';
      this.emit('defeat', {});
    }
  }

  hurtWall(v, why) {
    this.wall -= v;
    if (why) this.emit('wallHit', { v, why });
  }

  updateEnemies(dt) {
    const stop = this.timeStopT > 0;
    const gslow = 1 - this.mods.globalSlow;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
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
      if (e.s >= PERIM) {
        e.s -= PERIM;
        if (e.boss) this.hurtWall(15, 'bossLap');
      }
      pathPos(e.s, TMP);
      e.x = TMP.x; e.y = TMP.y; e.dx = TMP.dx; e.dy = TMP.dy;
      if (e.def.roar) {
        e.roarT -= dt;
        if (e.roarT <= 0) {
          e.roarT = e.def.roar[0];
          for (let k = 0; k < e.def.roar[1]; k++) {
            const m = this.spawn('rat', e.s - 16 - k * 10);
            m.hp = m.maxHp = baseHp(BOSS_WAVE) * 0.6;
          }
          this.emit('roar', { x: e.x, y: e.y });
        }
      }
    }
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
    const cheer = this.cheerT > 0 ? 0.3 : 0;
    for (let i = 0; i < N_CELLS; i++) {
      const u = this.units[i];
      if (!u) continue;
      if (u.anim > 0) u.anim -= dt;
      const d = u.def;
      const x = cellX(i), y = cellY(i);

      // 주기 스킬
      if (d.rain || d.dash || d.meteor || d.judgment || d.timeStop) {
        u.skT += dt;
        this.unitSkill(u, x, y);
      }

      u.cd -= dt * (u.spd + cheer);
      if (u.cd > 0) continue;
      const tgt = this.findTarget(x, y, u.r2, d.snipe, null);
      if (!tgt) { u.cd = 0; continue; }
      u.cd += 1 / d.rate;
      u.anim = 0.12;
      u.face = tgt.x < x ? -1 : 1;
      this.attack(u, tgt, x, y);
    }
  }

  unitDmg(u) { return u.def.dmg * this.upgMul(u.def) * u.dmgMul; }

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
    p.fall = false; p.life = 3;
    this.projs.push(p);
  }

  fireMeteor(u, tgt, dmg, r, small) {
    const p = this.ppool.pop() || {};
    p.kind = small ? 'mini' : 'meteor';
    p.tgt = null; p.tid = 0;
    p.tx = tgt.x; p.ty = tgt.y;
    p.x = tgt.x + 40; p.y = tgt.y - 150;
    p.spd = 340; p.dmg = dmg; p.def = u ? u.def : null; p.src = u;
    p.splash = r; p.fall = true; p.life = 3; p.ux = p.x; p.uy = p.y;
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
        p.dmg = dmg; p.def = d; p.src = u; p.splash = 0; p.fall = false; p.life = 3; p.ux = x; p.uy = y;
        this.projs.push(p);
      }
      this.emit('rain', { x, y });
    } else if (d.dash && u.skT >= d.dash[0]) {
      const t = this.findTarget(x, y, (u.range + 40) ** 2, false, null);
      if (!t) return;
      u.skT = 0;
      const [, len, dur, mul] = d.dash;
      this.zones.push({ s0: t.s - len, s1: t.s + 10, t: dur, dur, dps: this.unitDmg(u) * mul, src: u, def: d });
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
      if (def.cls === 'archer' && this.mods.crit && this.rng.chance(this.mods.crit)) { d *= 2; crit = true; }
      if (!e.boss && !secondary) {
        const ex = (def.execute || 0) + (def.cls === 'rogue' ? this.mods.rogueExec : 0);
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
      e.burnT = def.burn[0]; e.burnDps = Math.max(e.burnDps, dmg * def.burn[1]); e.burnSrc = u;
      e.boomR = def.boom[0]; e.boomDmg = dmg * def.boom[1];
    }
    if (def.bossPct && e.boss && e.alive) this.damage(e, e.maxHp * def.bossPct, 't', u, true);
  }

  damage(e, raw, dtype, u, quiet, crit) {
    if (!e.alive) return 0;
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

  kill(e, u) {
    e.alive = false;
    e.hp = 0;
    this.stats.kills++;
    const def = u ? u.def : null;
    if (e.boss) {
      this.emit('kill', { x: e.x, y: e.y, type: e.type, boss: true });
      this.stones += 3;
      this.victory();
      return;
    }
    let g = 2 + this.mods.killGold + (def && def.killGold ? def.killGold : 0);
    this.goldFrac += g * this.mods.goldMul;
    const whole = Math.floor(this.goldFrac);
    this.gold += whole; this.goldFrac -= whole;
    let stoneP = 0.0035 * this.mods.stoneMul;
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
        m.hp = m.maxHp = baseHp(Math.max(1, this.wave)) * ENEMIES.mini.hp;
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
        p.spd = 260; p.dmg = this.unitDmg(u) * 2; p.def = null; p.src = u; p.splash = 0; p.fall = false; p.life = 3;
        p.ux = e.x; p.uy = e.y;
        this.projs.push(p);
      }
    }
  }

  victory() {
    for (const e of this.enemies) if (e.alive) { e.alive = false; this.emit('ash', { x: e.x, y: e.y }); }
    this.result = 'victory';
    this.emit('victory', {});
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
      for (const e of this.enemies) {
        if (!e.alive) continue;
        // 원형 경로: 구간 시작점 기준 상대 위치
        let rel = (e.s - zn.s0) % PERIM;
        if (rel < 0) rel += PERIM;
        if (rel <= span) this.damage(e, zn.dps * dt, 'p', zn.src, true);
      }
    }
  }

  // HUD용
  liveCount() { return this.enemies.length; }
  ashReward() {
    return Math.round(this.wave * 3 + this.stats.kills / 25 + (this.result === 'victory' ? 30 : 0));
  }
}
