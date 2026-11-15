// 런(한 판의 여정) 상태 · 지도 생성 · 전투 보정 계산 · 저장
import { RNG } from '../core/rng.js';
import { RELIC, SETS, mergeFx, setCounts } from '../data/relics.js';
import { COMPANIONS } from '../data/companions.js';
import { MASCOT_DEFS } from '../data/mascots.js';
import { store } from '../core/storage.js';

export const ACTS = [
  { name: '잿더미의 길', sub: '무너진 성을 빠져나와 잿빛 평원을 건넌다', boss: 'ogran' },
  { name: '배신의 수도', sub: '재상 모르벤이 지배하는 옛 수도로', boss: 'morven' },
  { name: '왕관의 심장', sub: '얼어붙은 산을 넘어 왕관이 잠든 곳으로', boss: null },
];
export const ROWS = 12;

export const NODE_TYPES = {
  battle: { name: '전투', desc: '3~4웨이브 전투' },
  elite: { name: '정예', desc: '5웨이브 + 정예 적. 유물 확정' },
  event: { name: '사건', desc: '이야기와 선택' },
  shop: { name: '상인', desc: '유물·유닛·행운석 구매' },
  camp: { name: '야영', desc: '회복 · 대화 · 무료 강화' },
  treasure: { name: '보물', desc: '유물 또는 행운석' },
  altar: { name: '운명의 제단', desc: '행운석을 걸고 주사위를 굴린다' },
  boss: { name: '보스', desc: '막 보스' },
  dragon: { name: '용의 둥지', desc: '얼어붙은 용 실바나' },
};

const W_TYPES = [['battle', 38], ['event', 32], ['elite', 10], ['shop', 7], ['camp', 5], ['treasure', 4], ['altar', 4]];

function weighted(rng, list, allow) {
  const f = list.filter(([t]) => allow(t));
  const tot = f.reduce((s, x) => s + x[1], 0);
  let r = rng.next() * tot;
  for (const [t, w] of f) { r -= w; if (r <= 0) return t; }
  return f[0][0];
}

export function genMap(seed, act) {
  const rng = new RNG(seed * 7 + act * 1013);
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let n;
    if (r === ROWS - 1) n = 1;
    else if (act === 3 && r === 6) n = 1;
    else if (r === 0) n = 2 + rng.int(2);
    else if (r === ROWS - 2) n = 2;
    else n = 2 + rng.int(3);
    const row = [];
    for (let i = 0; i < n; i++) {
      const jit = n > 1 ? (rng.next() - 0.5) * 0.12 : 0;
      row.push({ id: `${act}-${r}-${i}`, row: r, i, x: Math.min(0.92, Math.max(0.08, (i + 0.5) / n + jit)), type: 'battle', next: [], done: false });
    }
    rows.push(row);
  }
  // 연결
  for (let r = 0; r < ROWS - 1; r++) {
    const a = rows[r], b = rows[r + 1];
    for (const nd of a) {
      const j = a.length === 1 ? null : Math.round((nd.i * (b.length - 1)) / (a.length - 1));
      if (j === null) { b.forEach((x) => nd.next.push(x.id)); continue; }
      nd.next.push(b[j].id);
      for (const dj of [-1, 1]) if (b[j + dj] && rng.chance(0.35)) nd.next.push(b[j + dj].id);
    }
    for (const t of b) {
      if (!a.some((nd) => nd.next.includes(t.id))) {
        let best = a[0], bd = 9;
        for (const nd of a) { const d = Math.abs(nd.x - t.x); if (d < bd) { bd = d; best = nd; } }
        best.next.push(t.id);
      }
    }
  }
  // 종류
  for (let r = 0; r < ROWS; r++) {
    for (const nd of rows[r]) {
      if (r === 0) nd.type = 'battle';
      else if (r === ROWS - 1) nd.type = 'boss';
      else if (r === ROWS - 2) nd.type = 'camp';
      else if (act === 3 && r === 6) nd.type = 'dragon';
      else nd.type = weighted(rng, W_TYPES, (t) => (t !== 'elite' || r >= 4) && (t !== 'shop' || r >= 3) && (t !== 'camp' || (r >= 5 && r <= 8)) && (t !== 'altar' || r >= 2));
    }
  }
  const force = (rowsRange, type) => {
    const cand = rows.slice(rowsRange[0], rowsRange[1] + 1).flat().filter((n) => ['battle', 'event'].includes(n.type));
    if (!rows.slice(rowsRange[0], rowsRange[1] + 1).flat().some((n) => n.type === type) && cand.length) rng.pick(cand).type = type;
  };
  force([4, 8], 'shop');
  force([5, 9], 'elite');
  force([1, 3], 'event');
  force([5, 8], 'event');
  const nodes = {};
  rows.flat().forEach((n) => (nodes[n.id] = n));
  return { act, rows: rows.map((r) => r.map((n) => n.id)), nodes };
}

export function newRun({ royal, mascot, seed }) {
  const meta = store();
  const perks = (meta.perks || {});
  seed = seed ?? ((Math.random() * 2 ** 31) | 0);
  const wallMax = 100 + (royal === 'edric' ? 20 : 0) + (perks.wall || 0) * 5 + (mascot === 'potato' ? 10 : 0);
  const run = {
    v: 1, seed, royal, mascot, act: 1, pos: null, time: 0,
    map: genMap(seed, 1),
    carry: {
      units: new Array(18).fill(null),
      gold: (royal === 'kyle' ? 150 : 100) + (perks.gold || 0) * 5,
      stones: royal === 'seren' ? 3 : 0,
      wall: wallMax, wallMax, upg: [0, 0, 0], summons: 0, celestial: 0,
    },
    relics: [], rep: { church: 0, cult: 0, tribe: 0, guild: 0 }, bonds: {}, party: [],
    flags: {}, shards: 0, seen: [], log: [], mods: [], autoDiceUsed: 0, eggKills: 0,
    stats: { battles: 0, kills: 0, merges: 0, celestials: 0, fails: 0, gambles: 0, events: 0, rolls: 0, rollWins: 0, lowRollWins: 0 },
    firstFree: perks.free ? 1 : 0,
  };
  if (perks.relic) run.pendingStartRelic = true;
  return run;
}

export function nodeOf(run, id) { return run.map.nodes[id]; }

// ── 협동 여정: 플레이어 2명이 각자 보드·금화·행운석·강화를 갖고, 성벽·유물·평판·동료는 함께 쓴다 ──
export function newCoopRun(players, seed) {
  const a = newRun({ royal: players[0].royal, mascot: players[0].mascot, seed });
  const b = newRun({ royal: players[1].royal, mascot: players[1].mascot, seed: a.seed });
  const wallMax = Math.round(Math.max(a.carry.wallMax, b.carry.wallMax) * 1.5);
  a.carry.wallMax = a.carry.wall = wallMax;
  a.coop = true;
  a.players = [
    { royal: players[0].royal, mascot: players[0].mascot, name: players[0].name || '방장', carry: a.carry },
    { royal: players[1].royal, mascot: players[1].mascot, name: players[1].name || '동료', carry: b.carry },
  ];
  return a;
}
export function hasRoyal(run, r) {
  return run.players ? run.players.some((p) => p.royal === r) : run.royal === r;
}
export function ownerOfRoyal(run, r) {
  if (!run.players) return 0;
  const i = run.players.findIndex((p) => p.royal === r);
  return i < 0 ? 0 : i;
}
// 협동 런을 JSON으로 주고받은 뒤 참조 복원
export function relinkRun(run) {
  if (run.players) run.carry = run.players[0].carry;
  return run;
}

export function available(run) {
  if (!run.pos) return run.map.rows[0];
  const cur = nodeOf(run, run.pos);
  return cur ? cur.next : [];
}

// 전투 보정치 R
export function buildMods(run) {
  const R = {};
  for (const id of run.relics) { const r = RELIC[id]; if (r) mergeFx(R, r.fx); }
  const sc = setCounts(run.relics);
  for (const [k, n] of Object.entries(sc)) {
    if (n >= 2) mergeFx(R, SETS[k].n2.fx);
    if (n >= 3) mergeFx(R, SETS[k].n3.fx);
  }
  for (const id of run.party) {
    const c = COMPANIONS[id];
    const b = run.bonds[id] || 0;
    if (b >= 1 && c.p1.fx) mergeFx(R, c.p1.fx);
    if (b >= 3 && c.p3.fx) mergeFx(R, c.p3.fx);
  }
  for (const m of run.mods) mergeFx(R, m.fx);
  if (run.firstFree) R.firstSummonFree = 1;
  return R;
}

// 런 단위 효과 (주사위 보너스, 상점 등)
export function runFx(run) {
  const o = { dice: 0, autoDice: 0, campHeal: 1, preview: 0, shopPlus: 0, shopDisc: 0, morvenWeak: 0 };
  const add = (x) => { for (const [k, v] of Object.entries(x || {})) o[k] = k === 'campHeal' ? Math.max(o[k], v) : (o[k] || 0) + v; };
  for (const id of run.relics) add(RELIC[id] && RELIC[id].run);
  const sc = setCounts(run.relics);
  for (const [k, n] of Object.entries(sc)) if (n >= 3) add(SETS[k].n3.run);
  for (const id of run.party) if ((run.bonds[id] || 0) >= 3) add(COMPANIONS[id].p3.run);
  if (run.mascot === 'owl') o.dice += 0.05;
  return o;
}

export function mascotLevel(id) {
  const m = store().mascotXp || {};
  const xp = m[id] || 0;
  const T = [0, 3, 8, 15, 25];
  let lv = 1;
  for (let i = 1; i < T.length; i++) if (xp >= T[i]) lv = i + 1;
  return lv;
}

// ── 저장 ──
const KEY = 'tfc_run_v1';
export function saveRun(run) { try { localStorage.setItem(KEY, JSON.stringify(run)); } catch (e) { /* 무시 */ } }
export function loadRun() { try { const r = JSON.parse(localStorage.getItem(KEY)); return r && r.v === 1 ? r : null; } catch (e) { return null; } }
export function clearRun() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }

export function mascotName(id) { return (MASCOT_DEFS[id] || MASCOT_DEFS.puru).name; }
