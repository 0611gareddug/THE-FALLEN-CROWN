// 전투 기록: 유닛별 피해량 막대그래프 · MVP · 여정 통계 · 도감(적 처치 수) 기록
import { h } from '../ui/dom.js';
import { store, save } from '../core/storage.js';
import { UNIT, TIERS } from '../data/units.js';
import { MASCOT_DEFS } from '../data/mascots.js';
import { ROYALS } from '../data/text.js';
import { SPR, spriteURL } from '../gfx/sprites.js';

const IMG = {};
const unitImg = (id) => IMG[id] || (IMG[id] = spriteURL(SPR.units[id].r, 2));
const mascotImg = (id) => IMG['m_' + id] || (IMG['m_' + id] = spriteURL(SPR.mascots[id].r, 2));

export const fmt = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(Math.round(v)));

// 도감: 이 기기에서 한 번만 기록 (협동 참가자는 보상 화면에서 기록)
const done = new Set();
export function recordBattle(run) {
  const lb = run.lastBattle;
  if (!lb) return;
  const key = `${run.seed}:${lb.n}:${lb.act}`;
  if (done.has(key)) return;
  done.add(key);
  const d = store();
  d.bestiary = d.bestiary || {};
  for (const [t, n] of Object.entries(lb.killT || {})) d.bestiary[t] = (d.bestiary[t] || 0) + n;
  save();
}

function who(run, o) {
  if (!run.players || !run.players[o]) return '';
  const r = ROYALS.find((x) => x.id === run.players[o].royal);
  return (o === (run.me || 0) ? '나 · ' : '') + (r ? r.name : run.players[o].name);
}
function labelOf(run, o, id) {
  if (id === '@m') {
    const m = run.players ? run.players[o].mascot : run.mascot;
    return { name: `${(MASCOT_DEFS[m] || MASCOT_DEFS.puru).name} (마스코트)`, img: mascotImg(m in SPR.mascots ? m : 'puru'), col: '#ffd36b' };
  }
  const u = UNIT[id];
  if (!u) return { name: id, img: null, col: '#ccc' };
  return { name: u.name, img: unitImg(id), col: u.tier === 5 ? '#ff9ad9' : TIERS[u.tier].color };
}

// 막대 목록: rows = [[o, id, dmg]]
function bars(run, rows, opts = {}) {
  const max = Math.max(1, ...rows.map((r) => r[2]));
  const me = run.me || 0;
  return h('div.bstat-bars', rows.map(([o, id, v], i) => {
    const L = labelOf(run, o, id);
    return h('div.bstat-row' + (i === 0 && opts.mvp ? '.mvp' : '') + (run.players ? (o === me ? '.mine' : '.theirs') : ''),
      L.img ? h('img', { src: L.img, alt: '' }) : h('span.bstat-noimg'),
      h('div.bstat-mid',
        h('div.bstat-name', h('span', { style: { color: L.col } }, L.name), run.players ? h('small', ` · ${who(run, o)}`) : null, i === 0 && opts.mvp ? h('b.bstat-mvp', 'MVP') : null),
        h('div.bstat-track', h('div.bstat-fill', { style: { width: `${Math.max(2, (v / max) * 100)}%` } }))),
      h('div.bstat-v', fmt(v)));
  }));
}

// 보상 화면 위에 붙는 '전투 기록' 카드 (접어 둘 수 있다)
export function battleCard(run) {
  const lb = run.lastBattle;
  if (!lb || !lb.top || !lb.top.length) return null;
  recordBattle(run);
  const open = store().settings.bstatOpen !== false;
  const body = h('div.bstat-body', { style: { display: open ? '' : 'none' } },
    run.players
      ? h('div.bstat-vs' + (run.players.length > 2 ? '.many' : ''), run.players.map((_, o) => o).map((o) => h('div' + (o === (run.me || 0) ? '.mine' : '.theirs'), h('b', who(run, o)), h('span', `피해 ${fmt(lb.tot[o] || 0)} · 처치 ${lb.kills[o] || 0}`))))
      : h('div.bstat-sub', `총 피해 ${fmt(lb.tot[0] || 0)} · 처치 ${lb.kills[0] || 0} · ${lb.t}초`),
    bars(run, lb.top.slice(0, 5), { mvp: true }));
  const head = h('button.bstat-head', {
    onclick: () => {
      const st = store().settings;
      const on = body.style.display === 'none';
      body.style.display = on ? '' : 'none';
      st.bstatOpen = on; save();
      head.querySelector('i').textContent = on ? '▾' : '▸';
    },
  }, h('span', '전투 기록'), h('i', open ? '▾' : '▸'));
  return h('div.bstat', head, body);
}

// 결말 화면: 여정 전체 통계
export function runStatsBlock(run) {
  const s = run.stats;
  if (!s.dmg) return null;
  const rows = [];
  s.dmg.forEach((m, o) => { if (!run.players && o) return; for (const [id, v] of Object.entries(m)) rows.push([o, id, v]); });
  if (!rows.length) return null;
  rows.sort((a, b) => b[2] - a[2]);
  const tot = s.dmg.map((m) => Object.values(m).reduce((x, y) => x + y, 0));
  return h('div.bstat.run',
    h('div.bstat-head.static', h('span', '여정 기록 · 가장 많이 싸운 유닛')),
    run.players
      ? h('div.bstat-vs' + (run.players.length > 2 ? '.many' : ''), run.players.map((_, o) => o).map((o) => h('div' + (o === (run.me || 0) ? '.mine' : '.theirs'), h('b', who(run, o)), h('span', `피해 ${fmt(tot[o])} · 처치 ${(s.killsO || [])[o] || 0}`))))
      : h('div.bstat-sub', `전투 ${s.battles} · 총 피해 ${fmt(tot[0])} · 처치 ${s.kills}`),
    bars(run, rows.slice(0, 5), { mvp: true }));
}
