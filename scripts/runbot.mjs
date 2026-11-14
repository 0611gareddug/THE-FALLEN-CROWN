// 3막 전체 여정 자동 플레이: 막별 도달률 · 승률 · 성벽 흐름 점검
import { Battle } from '../src/game/battle.js';
import { RECIPES, UNIT } from '../src/data/units.js';
import { makeBattle } from '../src/data/enemies.js';
import { newRun, available, nodeOf, buildMods, runFx, genMap, ACTS } from '../src/run/run.js';
import { finalBoss } from '../src/run/flow.js';
import { EVENTS, pickEvent, condOk, applyFx, rollChance, tickMods, addRelic, randomRelic, addUnit } from '../src/run/events.js';
import { RNG } from '../src/core/rng.js';

const RUNS = +(process.argv[2] || 30);

function botTick(b, t) {
  for (let i = 0; i < 18; i++) if (b.mergeable[i] && b.merge(i)) return;
  for (let r = 0; r < RECIPES.length; r++) if (b.craft(r)) return;
  if (b.badLuck >= 10) b.pity();
  for (let i = 0; i < 18; i++) { const u = b.units[i]; if (u && (u.corrupt > 0 || u.ice > 0)) b.cleanse(i); }
  if (b.stones >= 2 && b.hasEmpty() && t > 20) b.gamble(b.stones >= 4 ? 1 : 0);
  if (b.hasEmpty()) { if (b.gold >= b.summonCost()) b.summon(); }
  else {
    const g = b.upg[0] <= b.upg[1] ? 0 : 1;
    if (b.gold >= b.upgradeCost(g)) b.upgrade(g);
    else if (b.gold >= b.upgradeCost(2) && b.upg[2] < b.upg[1]) b.upgrade(2);
    else {
      // 가장 약한 유닛 정리 (진화 불가한 견습)
      let worst = -1;
      for (let i = 0; i < 18; i++) { const u = b.units[i]; if (u && u.def.tier === 0 && !b.mergeable[i]) { worst = i; break; } }
      if (worst >= 0 && b.gold < b.summonCost()) b.sell(worst);
    }
  }
  if (b.gold > 300) { const g = [0, 1, 2].sort((x, y) => b.upg[x] - b.upg[y])[0]; b.upgrade(g); }
  b.skill();
}

function fight(run, nd, rng) {
  let kind = nd.type === 'dragon' ? 'boss' : nd.type;
  let boss = null;
  if (nd.type === 'boss') boss = run.act < 3 ? ACTS[run.act - 1].boss : (run.finalBoss = finalBoss(run));
  if (nd.type === 'dragon') boss = 'silvana';
  const cfg = makeBattle(rng, run.act, nd.row, kind, boss);
  const mods = buildMods(run); mods.morvenWeak = runFx(run).morvenWeak;
  const b = new Battle({ seed: rng.int(1e9), royal: run.royal, mascot: run.mascot, carry: run.carry, node: cfg, mods });
  let t = 0, acc = 0;
  while (!b.result && t < 1200) { b.tick(1 / 60); t += 1 / 60; acc += 1 / 60; if (acc > 0.5) { acc = 0; botTick(b, t); } b.events.length = 0; }
  if (b.result !== 'victory') { deaths[`${run.act}막 ${nd.type}`] = (deaths[`${run.act}막 ${nd.type}`] || 0) + 1; return false; }
  run.carry = b.exportCarry();
  run.stats.kills += b.stats.kills;
  tickMods(run, kind === 'boss');
  if ((nd.type === 'boss' && run.act < 3) || nd.type === 'dragon') run.shards++;
  if (nd.type === 'elite' || nd.type === 'boss' || nd.type === 'dragon') addRelic(run, randomRelic(run, null), []);
  else run.carry.gold += 20 + run.act * 15;
  return true;
}

function event(run, rng) {
  const ev = EVENTS[pickEvent(run, 'bot' + run.stats.events)];
  const opts = ev.choices.filter((c) => condOk(run, c.cond));
  const c = rng.pick(opts);
  let fx = c.fx;
  if (c.roll) fx = rng.next() < rollChance(run, c) ? c.win.fx : c.lose.fx;
  const meta = {};
  applyFx(run, fx, meta);
  if (meta.needLeave) { run.party.shift(); run.party.push(meta.needLeave); }
  run.seen.push(ev.id); run.stats.events++;
}

const reach = [0, 0, 0, 0];
const deaths = {};
let wins = 0;
const wallAtBoss = [[], [], []];
const t0 = Date.now();
for (let r = 0; r < RUNS; r++) {
  const royal = ['edric', 'seren', 'kyle'][r % 3];
  const run = newRun({ royal, mascot: 'puru', seed: 5000 + r });
  const rng = new RNG(9000 + r);
  let alive = true;
  while (alive) {
    const av = available(run);
    if (!av.length) break;
    const pref = (id) => ({ battle: 3, event: 3, elite: 1, shop: 2, camp: 2, treasure: 3, altar: 1, boss: 9, dragon: 9 })[nodeOf(run, id).type];
    const id = av.slice().sort((a, b) => pref(b) - pref(a) + (rng.next() - 0.5) * 2)[0];
    const nd = nodeOf(run, id);
    run.pos = id; nd.done = true;
    if (nd.type === 'boss') wallAtBoss[run.act - 1].push(run.carry.wall);
    switch (nd.type) {
      case 'battle': case 'elite': case 'boss': case 'dragon': alive = fight(run, nd, rng); break;
      case 'event': event(run, rng); break;
      case 'shop': if (run.carry.gold >= 100 && run.carry.units.includes(null)) { run.carry.gold -= 100; addUnit(run, 'random:2', []); } break;
      case 'camp': if (run.carry.wall < run.carry.wallMax * 0.6) run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + Math.round(run.carry.wallMax * 0.3)); else run.carry.upg[0]++; break;
      case 'treasure': addRelic(run, randomRelic(run, null), []); break;
      default: break;
    }
    if (!alive) break;
    if (nd.type === 'boss') {
      reach[run.act]++;
      if (run.act === 3) { wins++; break; }
      run.act++; run.pos = null; run.map = genMap(run.seed, run.act);
      run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + Math.round(run.carry.wallMax * 0.3));
    }
  }
  if (r < 8) {
    const tiers = [0, 0, 0, 0, 0, 0]; for (const u of run.carry.units) if (u) tiers[UNIT[u.id].tier]++;
    console.log(`#${r} ${royal} ${alive ? '클리어' : '패배'} ${run.act}막 성벽 ${run.carry.wall}/${run.carry.wallMax} 유물 ${run.relics.length} 조각 ${run.shards} 유닛 ${tiers.join('/')} 강화 ${run.carry.upg.join('/')} 사건 ${run.stats.events}`);
  }
}
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) : '-');
console.log(`\n${RUNS}판: 1막 클리어 ${reach[1]} · 2막 클리어 ${reach[2]} · 최종 클리어 ${wins} (${((wins / RUNS) * 100).toFixed(0)}%)`);
console.log('패배 지점:', deaths);
console.log(`보스 직전 평균 성벽: 1막 ${avg(wallAtBoss[0])} · 2막 ${avg(wallAtBoss[1])} · 3막 ${avg(wallAtBoss[2])}  (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
