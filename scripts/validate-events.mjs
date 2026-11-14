// 사건 데이터 자동 검사: 화자 · 배경 · 유물 · 유닛 · 플래그 · 결말 도달 가능성
import { EVENT_DATA } from '../src/data/events.js';
import { RELIC } from '../src/data/relics.js';
import { UNIT } from '../src/data/units.js';
import { CAST, PLACES } from '../src/gfx/art2.js';
import { COMPANIONS } from '../src/data/companions.js';
import { ACH } from '../src/meta/achievements.js';

let errors = 0, warns = 0;
const err = (m) => { errors++; console.log('✗', m); };
const warn = (m) => { warns++; console.log('!', m); };
const setFlags = new Set(['siblingSeen', 'brotherBond', 'brotherRoute', 'ashRite']);
const usedFlags = [];
const repMax = { church: 0, cult: 0, tribe: 0, guild: 0 };
const checkLines = (id, lines) => (lines || []).forEach(([who]) => { if (who !== 'narr' && who !== '@q' && !CAST[who]) err(`${id}: 알 수 없는 화자 ${who}`); });
const checkFx = (id, fx) => {
  if (!fx) return;
  if (fx.relic && !String(fx.relic).startsWith('random') && !RELIC[fx.relic]) err(`${id}: 없는 유물 ${fx.relic}`);
  if (fx.unit && !String(fx.unit).startsWith('random') && !UNIT[fx.unit]) err(`${id}: 없는 유닛 ${fx.unit}`);
  if (fx.join && !COMPANIONS[fx.join]) err(`${id}: 없는 동료 ${fx.join}`);
  if (fx.flag) setFlags.add(fx.flag);
  if (fx.flag2) setFlags.add(fx.flag2);
  if (fx.ach && !ACH[fx.ach]) warn(`${id}: 업적 정의 없음 '${fx.ach}' (무시됨)`);
  if (fx.rep) for (const [k, v] of Object.entries(fx.rep)) { if (!(k in repMax)) err(`${id}: 없는 진영 ${k}`); }
};
const ids = Object.keys(EVENT_DATA);
for (const id of ids) {
  const e = EVENT_DATA[id];
  if (!e.title) err(`${id}: 제목 없음`);
  if (!PLACES[e.bg]) err(`${id}: 없는 배경 ${e.bg}`);
  if (!e.special && (!e.act || !e.act.every((a) => a >= 1 && a <= 3))) err(`${id}: act 오류`);
  checkLines(id, e.intro);
  if (!e.choices || e.choices.length < 2) err(`${id}: 선택지 2개 미만`);
  if (e.cond && e.cond.flag) usedFlags.push([id, e.cond.flag]);
  // 진영별 이 사건에서 얻을 수 있는 최대 평판
  const best = { church: 0, cult: 0, tribe: 0, guild: 0 };
  for (const c of e.choices) {
    if (c.cond && c.cond.flag) usedFlags.push([id, c.cond.flag]);
    const outs = c.roll ? [c.win, c.lose] : [{ fx: c.fx, r: c.r }];
    if (c.roll && (!c.win || !c.lose)) err(`${id}: 판정 선택지에 win/lose 없음`);
    for (const o of outs) {
      if (!o) continue;
      checkLines(id, o.r);
      checkFx(id, o.fx);
      if (o.fx && o.fx.rep) for (const [k, v] of Object.entries(o.fx.rep)) best[k] = Math.max(best[k], v);
    }
  }
  for (const k in best) repMax[k] += best[k];
}
for (const [id, f] of usedFlags) if (!setFlags.has(f)) err(`${id}: 조건 플래그 '${f}'를 설정하는 사건이 없음`);
console.log('\n진영별 이론상 최대 평판 (결말 조건 7):', repMax);
for (const [k, v] of Object.entries(repMax)) if (v < 10) warn(`${k} 평판 최대치 ${v}: 결말(7) 도달이 빠듯함`);
const kinds = {};
for (const e of Object.values(EVENT_DATA)) if (!e.special) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
console.log('사건 수:', Object.values(EVENT_DATA).filter((e) => !e.special).length, kinds);
console.log(`\n오류 ${errors}개 · 경고 ${warns}개`);
process.exit(errors ? 1 : 0);
