// 사건 엔진: 조건 검사 · 사건 고르기 · 효과 적용
import { EVENT_DATA } from '../data/events.js';
import { RNG } from '../core/rng.js';
import { RELIC, RELICS } from '../data/relics.js';
import { UNIT, BY_TIER, TIERS } from '../data/units.js';
import { COMPANIONS, PARTY_MAX } from '../data/companions.js';
import { runFx } from './run.js';
import { store, save } from '../core/storage.js';

export const EVENTS = EVENT_DATA;
// 유물 획득 등으로 생긴 업적 (화면 쪽에서 비운다)
export const achQueue = [];
const FNAME = { church: '빛의 교회', cult: '재의 교단', tribe: '숲의 부족', guild: '떠돌이 길드' };

export function condOk(run, c) {
  if (!c) return true;
  if (c.royal && run.royal !== c.royal) return false;
  if (c.flag && !run.flags[c.flag]) return false;
  if (c.noFlag && run.flags[c.noFlag]) return false;
  if (c.goldMin && run.carry.gold < c.goldMin) return false;
  if (c.stonesMin && run.carry.stones < c.stonesMin) return false;
  if (c.relic && !run.relics.includes(c.relic)) return false;
  if (c.party && !run.party.includes(c.party)) return false;
  if (c.repMin) for (const [k, v] of Object.entries(c.repMin)) if ((run.rep[k] || 0) < v) return false;
  if (c.bondMin) for (const [k, v] of Object.entries(c.bondMin)) if (!run.party.includes(k) || (run.bonds[k] || 0) < v) return false;
  return true;
}

export function condText(c) {
  if (!c) return '';
  const out = [];
  if (c.goldMin) out.push(`금화 ${c.goldMin} 필요`);
  if (c.stonesMin) out.push(`행운석 ${c.stonesMin} 필요`);
  if (c.relic) out.push(`유물 '${RELIC[c.relic].name}' 필요`);
  if (c.repMin) for (const [k, v] of Object.entries(c.repMin)) out.push(`${FNAME[k]} 평판 ${v} 필요`);
  if (c.bondMin) for (const [k, v] of Object.entries(c.bondMin)) out.push(`${COMPANIONS[k].name} 인연 ${v} 필요`);
  if (c.flag) out.push('조건 미충족');
  return out.join(' · ');
}

export function eligible(run, ev) {
  if (ev.special) return false;
  if (ev.act && !ev.act.includes(run.act)) return false;
  if (!ev.repeat && run.seen.includes(ev.id)) return false;
  if (ev.royal && ev.royal !== run.royal) return false;
  if (ev.comp) {
    if (ev.recruit) {
      if (run.party.includes(ev.comp) || run.flags['met_' + ev.comp]) return false;
    } else if (!run.party.includes(ev.comp)) return false;
  }
  if (!condOk(run, ev.cond)) return false;
  return true;
}

export function pickEvent(run, salt = '') {
  const rng = new RNG(run.seed + run.stats.events * 97 + run.act * 13 + [...String(salt)].reduce((a, c) => a + c.charCodeAt(0), 0));
  const cand = Object.values(EVENTS).filter((e) => eligible(run, e));
  if (!cand.length) return 'pebble';
  let tot = 0;
  const w = cand.map((e) => {
    let x = e.weight || 1;
    if (e.kind === 'bond') x = e.recruit ? (run.party.length < PARTY_MAX ? 1.6 : 0.6) : 2.5;
    if (e.kind === 'royal') x = 2.2;
    if (e.kind === 'faction') x = e.cond ? 2 : 1.2;
    tot += x;
    return x;
  });
  let r = rng.next() * tot;
  for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) return cand[i].id; }
  return cand[0].id;
}

// 주사위 성공 확률
export function rollChance(run, choice) {
  let p = choice.roll;
  const fx = runFx(run);
  p += fx.dice;
  if (choice.royalBonus && choice.royalBonus[run.royal]) p += choice.royalBonus[run.royal];
  if (run.flags.blessed3 > 0) p += 0.25;
  if (choice.bondAuto) for (const [k, v] of Object.entries(choice.bondAuto)) if ((run.bonds[k] || 0) >= v) p = 1;
  return Math.max(0.01, Math.min(p >= 1 ? 1 : 0.95, p));
}

function rng(run) { return new RNG(run.seed * 31 + run.stats.events * 7 + run.stats.rolls * 3 + run.relics.length); }

export function randomRelic(run, grade) {
  const r = rng(run);
  let pool = RELICS.filter((x) => !run.relics.includes(x.id));
  if (grade && grade !== 'any') pool = pool.filter((x) => x.g === grade);
  else {
    const roll = r.next();
    const g = roll < 0.5 ? 'common' : roll < 0.75 ? 'set' : roll < 0.93 ? 'rare' : 'legend';
    const sub = pool.filter((x) => x.g === g);
    if (sub.length) pool = sub;
    pool = pool.filter((x) => x.g !== 'curse');
  }
  return pool.length ? r.pick(pool).id : null;
}

export function addRelic(run, id, out) {
  if (!id || run.relics.includes(id)) { run.carry.gold += 50; out && out.push('금화 +50 (유물 대신)'); return; }
  run.relics.push(id);
  const d = store();
  d.relicsSeen = d.relicsSeen || [];
  if (!d.relicsSeen.includes(id)) { d.relicsSeen.push(id); save(); }
  const r = RELIC[id];
  if (r.onGet) {
    if (r.onGet.wallMax) { run.carry.wallMax += r.onGet.wallMax; run.carry.wall = Math.max(1, Math.min(run.carry.wallMax, run.carry.wall + Math.max(0, r.onGet.wallMax))); }
    if (r.onGet.stones) run.carry.stones += r.onGet.stones;
  }
  out && out.push(`유물 획득: ${r.name}`);
  if (run.relics.filter((x) => RELIC[x].g === 'curse').length >= 2) achQueue.push('cursed2');
  if (r.set && run.relics.filter((x) => RELIC[x].set === r.set).length >= 3) achQueue.push('set3');
  if (run.relics.length >= 10) achQueue.push('relic10');
}

export function addUnit(run, spec, out) {
  let def = null;
  if (UNIT[spec]) def = UNIT[spec];
  else {
    const [, t, cls] = spec.split(':');
    const pool = BY_TIER[+t].filter((u) => !cls || u.cls === cls);
    def = rng(run).pick(pool.length ? pool : BY_TIER[+t]);
  }
  const empty = run.carry.units.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) {
    const g = TIERS[def.tier].sell * 2;
    run.carry.gold += g;
    out && out.push(`보드가 가득 차 ${def.name} 대신 금화 +${g}`);
    return;
  }
  const cell = rng(run).pick(empty);
  run.carry.units[cell] = { id: def.id, spent: 0 };
  out && out.push(`유닛 합류: ${def.name} (${TIERS[def.tier].name})`);
  return def.id;
}

// 효과 적용 → 표시용 문자열 목록
export function applyFx(run, fx, meta) {
  const out = [];
  if (!fx) return out;
  const c = run.carry;
  if (fx.gold) { c.gold = Math.max(0, c.gold + fx.gold); out.push(`금화 ${fx.gold > 0 ? '+' : ''}${fx.gold}`); }
  if (fx.stones) { c.stones = Math.max(0, c.stones + fx.stones); out.push(`행운석 ${fx.stones > 0 ? '+' : ''}${fx.stones}`); }
  if (fx.wallMax) { c.wallMax = Math.max(30, c.wallMax + fx.wallMax); c.wall = Math.min(c.wallMax, fx.wallMax > 0 ? c.wall + fx.wallMax : c.wall); out.push(`성벽 최대 ${fx.wallMax > 0 ? '+' : ''}${fx.wallMax}`); }
  if (fx.wall) { c.wall = Math.max(1, Math.min(c.wallMax, c.wall + fx.wall)); out.push(`성벽 ${fx.wall > 0 ? '+' : ''}${fx.wall}`); }
  if (fx.heal) { const v = Math.round(c.wallMax * fx.heal); c.wall = Math.min(c.wallMax, c.wall + v); out.push(`성벽 +${v}`); }
  if (fx.rep) for (const [k, v] of Object.entries(fx.rep)) { run.rep[k] = Math.max(-10, Math.min(10, (run.rep[k] || 0) + v)); out.push(`${FNAME[k]} ${v > 0 ? '+' : ''}${v}`); }
  if (fx.join) {
    run.flags['met_' + fx.join] = 1;
    if (run.party.length >= PARTY_MAX) { meta && (meta.needLeave = fx.join); }
    else { run.party.push(fx.join); out.push(`${COMPANIONS[fx.join].name} 합류`); const j = COMPANIONS[fx.join].p1.join; if (j && j.wallMax) { c.wallMax += j.wallMax; c.wall += j.wallMax; } }
  }
  if (fx.bond) for (const [k, v] of Object.entries(fx.bond)) {
    if (!run.party.includes(k) && !(meta && meta.needLeave === k)) continue;
    run.bonds[k] = Math.max(0, Math.min(5, (run.bonds[k] || 0) + v));
    out.push(`${COMPANIONS[k].name} 인연 ${v > 0 ? '+' : ''}${v} (${run.bonds[k]})`);
  }
  if (fx.leave) { run.party = run.party.filter((x) => x !== fx.leave); out.push(`${COMPANIONS[fx.leave].name} 떠남`); }
  if (fx.relic) {
    const [k, g] = String(fx.relic).split(':');
    addRelic(run, k === 'random' ? randomRelic(run, g || null) : fx.relic, out);
  }
  if (fx.unit) addUnit(run, fx.unit, out);
  if (fx.sellBest) {
    let best = -1;
    c.units.forEach((u, i) => { if (u && UNIT[u.id].tier < 5 && (best < 0 || UNIT[u.id].tier > UNIT[c.units[best].id].tier)) best = i; });
    if (best >= 0) { const d = UNIT[c.units[best].id]; const g = TIERS[d.tier].sell * 3; c.units[best] = null; c.gold += g; out.push(`${d.name} 경매 낙찰 · 금화 +${g}`); }
  }
  if (fx.loseUnit) {
    const idx = c.units.map((u, i) => (u && UNIT[u.id].tier < 5 ? i : -1)).filter((i) => i >= 0);
    if (idx.length) { const i = rng(run).pick(idx); out.push(`${UNIT[c.units[i].id].name}을(를) 잃었다`); c.units[i] = null; }
  }
  if (fx.shard) { run.shards = Math.min(5, run.shards + fx.shard); out.push(`왕관 조각 +${fx.shard} (${run.shards}/5)`); }
  if (fx.flag) run.flags[fx.flag] = fx.flag === 'blessed3' ? 3 : 1;
  if (fx.flag2) run.flags[fx.flag2] = 1;
  if (fx.flagInc) {
    run.flags[fx.flagInc] = (run.flags[fx.flagInc] || 0) + 1;
    if (fx.flagInc === 'plane') { const d = store(); d.planes = (d.planes || 0) + 1; save(); if (d.planes >= 5 && meta) meta.ach = (meta.ach || []).concat('plane5'); }
  }
  if (fx.mod) { run.mods.push({ ...fx.mod }); out.push(`${fx.mod.name}${fx.mod.battles >= 99 ? ' (영구)' : ` (${fx.mod.battles}전투)`}`); }
  if (fx.mascot) { meta && (meta.unlockMascot = fx.mascot); }
  if (fx.ach) { meta && (meta.ach = (meta.ach || []).concat(fx.ach)); }
  if (fx.skipBattle) meta && (meta.skipBattle = true);
  return out;
}

// 전투가 끝날 때마다 기한 있는 보정 소모
export function tickMods(run, wasBoss) {
  run.mods = run.mods.filter((m) => {
    if (m.boss && !wasBoss) return true;
    m.battles--;
    return m.battles > 0;
  });
}
