// 자동 밸런스 점검: 간단한 봇이 여러 판을 돌려 승률과 진행도를 확인한다.
import { Battle } from '../src/game/battle.js';
import { RECIPES } from '../src/data/units.js';

const RUNS = +(process.argv[2] || 60);
const STYLE = process.argv[3] || 'normal'; // normal | lazy

function bot(b, t) {
  // 합성 우선
  for (let i = 0; i < 18; i++) if (b.mergeable[i] && b.merge(i)) return;
  for (let r = 0; r < RECIPES.length; r++) if (b.craft(r)) return;
  if (b.badLuck >= 10) b.pity();
  // 근거리 유닛을 가장자리로
  if (STYLE !== 'lazy') {
    for (let i = 7; i <= 10; i++) {
      const u = b.units[i];
      if (u && u.def.range < 100) {
        for (const c of [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 6, 11]) {
          const v = b.units[c];
          if (!v || v.def.range >= 120) { b.move(i, c); break; }
        }
      }
    }
  }
  if (b.stones >= 1 && b.hasEmpty() && t > 30) b.gamble(b.stones >= 3 ? 2 : 0);
  // 강화와 소환 균형
  const g = b.upg[0] <= b.upg[1] ? 0 : 1;
  const ucost = b.upgradeCost(g);
  if (b.hasEmpty()) {
    if (b.gold >= b.summonCost()) b.summon();
  } else {
    // 보드가 가득 차면: 가장 약한 유닛 판매(합성 불가 견습) 또는 강화
    if (b.gold >= ucost) b.upgrade(g);
    else if (b.gold >= b.upgradeCost(2) && b.upg[2] < b.upg[1]) b.upgrade(2);
  }
  if (b.gold > 400 && b.gold >= ucost) b.upgrade(g);
  b.skill();
}

let wins = 0;
const waves = [];
const wallLeft = [];
const bossHpLeft = [];
const t0 = Date.now();
for (let r = 0; r < RUNS; r++) {
  const royal = ['edric', 'seren', 'kyle'][r % 3];
  const b = new Battle({ royal, seed: 1000 + r });
  let t = 0, acc = 0;
  let maxField = 0;
  while (!b.result && t < 900) {
    b.tick(1 / 60);
    t += 1 / 60;
    acc += 1 / 60;
    if (acc > 0.5) { acc = 0; bot(b, t); }
    b.events.length = 0;
    maxField = Math.max(maxField, b.enemies.length);
  }
  if (b.result === 'victory') wins++;
  waves.push(b.wave);
  wallLeft.push(Math.round(b.wall));
  if (b.boss) bossHpLeft.push(Math.round((b.boss.hp / b.boss.maxHp) * 100));
  if (r < 6) {
    const tiers = [0, 0, 0, 0, 0, 0];
    for (const u of b.units) if (u) tiers[u.def.tier]++;
    console.log(`#${r} ${royal} ${b.result} wave ${b.wave} wall ${Math.round(b.wall)} t=${t.toFixed(0)}s maxField ${maxField} tiers ${tiers.join('/')} upg ${b.upg.join('/')} gold ${b.gold} kills ${b.stats.kills}`);
  }
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / (a.length || 1)).toFixed(1);
console.log(`\n${RUNS}판, 스타일 ${STYLE}: 승률 ${((wins / RUNS) * 100).toFixed(0)}%, 평균 도달 웨이브 ${avg(waves)}, 평균 남은 성벽 ${avg(wallLeft)}, 보스 남은 체력% ${avg(bossHpLeft)}  (${Date.now() - t0}ms)`);
