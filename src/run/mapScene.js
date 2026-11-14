// 지도 화면: 밤하늘에 금색 선으로 그린 별자리 지도
import { h, svg, ICON } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { ACTS, NODE_TYPES, ROWS, available, nodeOf, runFx, saveRun, clearRun } from './run.js';
import { enterNode, endRun } from './flow.js';
import { iconURL } from '../gfx/icons.js';
import { portrait } from '../gfx/art2.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { RELIC, SETS, GRADE, setCounts } from '../data/relics.js';
import { COMPANIONS } from '../data/companions.js';
import { UNIT, TIERS, UPG_NAMES } from '../data/units.js';
import { sheet, settingsPanel } from '../ui/panels.js';
import { pickEvent, EVENTS } from './events.js';
import { ROYALS } from '../data/text.js';

const ROMAN = ['I', 'II', 'III'];
export const FACTIONS = {
  church: { name: '빛의 교회', color: '#f1e3a6' },
  cult: { name: '재의 교단', color: '#e0663a' },
  tribe: { name: '숲의 부족', color: '#7fbf6a' },
  guild: { name: '떠돌이 길드', color: '#e8c25a' },
};
const TYPE_COL = { battle: '#d9d4c7', elite: '#ff8a7a', event: '#9fc8ff', shop: '#e8c25a', camp: '#ff9a5a', treasure: '#ffe36b', altar: '#c99bff', boss: '#ff6b6b', dragon: '#a8e4ff' };

export function mapScene(app, { run }) {
  let el, info, sel = null;

  function geom() {
    return app.land ? { x0: 290, x1: 670, y0: 488, y1: 64 } : { x0: 26, x1: 334, y0: 530, y1: 120 };
  }
  function pos(nd) {
    const g = geom();
    return [g.x0 + (g.x1 - g.x0) * nd.x, g.y0 + ((g.y1 - g.y0) * nd.row) / (ROWS - 1)];
  }

  function enter() {
    app.bg.setMode('lobby');
    audio.play('map');
    build();
  }

  function build() {
    if (el) el.remove();
    const avail = new Set(available(run));
    const nodes = Object.values(run.map.nodes);
    const g = geom();
    const W = app.land ? 960 : 360, Hh = app.land ? 540 : 640;
    // 선
    let lines = '';
    for (const nd of nodes) {
      const [x1, y1] = pos(nd);
      for (const nid of nd.next) {
        const t = nodeOf(run, nid);
        const [x2, y2] = pos(t);
        const walked = nd.done && t.done;
        const open = nd.id === run.pos && avail.has(nid);
        const col = walked ? '#c9a85c' : open ? '#e8c25a' : 'rgba(170,163,149,0.22)';
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${walked ? 1.6 : 1}" ${open ? 'stroke-dasharray="3 4" class="march"' : ''}/>`;
      }
    }
    if (!run.pos) for (const id of run.map.rows[0]) {
      const [x, y] = pos(nodeOf(run, id));
      lines += `<line x1="${x}" y1="${y + 26}" x2="${x}" y2="${y + 10}" stroke="#e8c25a" stroke-dasharray="3 4" class="march"/>`;
    }
    const lineSvg = svg(lines, `0 0 ${W} ${Hh}`);
    lineSvg.classList.add('map-lines');

    const fx = runFx(run);
    const nodeEls = nodes.map((nd) => {
      const [x, y] = pos(nd);
      const isAvail = avail.has(nd.id);
      const cur = nd.id === run.pos;
      const cls = ['node', nd.type, nd.done ? 'done' : '', isAvail ? 'avail' : '', cur ? 'cur' : '', nd.type === 'boss' || nd.type === 'dragon' ? 'big' : ''].filter(Boolean).join('.');
      const b = h('button.' + cls, {
        style: { left: x + 'px', top: y + 'px' },
        'aria-label': NODE_TYPES[nd.type].name,
        onclick: () => choose(nd, isAvail),
        onmouseenter: () => { if (isAvail) audio.sfxPlay('hover'); },
      }, h('img', { src: iconURL(nd.type, nd.done ? '#7a6a40' : isAvail || cur ? TYPE_COL[nd.type] : '#5a5650', 2), alt: '' }));
      if (fx.preview && nd.type === 'event' && isAvail) {
        if (!nd.eventId) nd.eventId = pickEvent(run, nd.id);
        const ev = EVENTS[nd.eventId];
        if (ev) b.appendChild(h('span.peek', ev.title));
      }
      return b;
    });

    const c = run.carry;
    const royal = ROYALS.find((r) => r.id === run.royal);
    const head = h('div.map-head',
      h('div.eyebrow', `ACT ${ROMAN[run.act - 1]}`),
      h('div.map-title', ACTS[run.act - 1].name),
      h('div.map-res',
        h('span', h('i.ic.gold'), c.gold),
        h('span', h('i.ic.stone'), c.stones),
        h('span.wallv', '성벽 ', h('b', `${c.wall}/${c.wallMax}`)),
        h('span.shard', h('img', { src: iconURL('shard', '#e8c25a', 1), alt: '' }), `${run.shards}/5`)),
      h('div.reps', Object.entries(FACTIONS).map(([k, f]) => {
        const v = run.rep[k] || 0;
        return h('div.rep', { title: `${f.name} 평판 ${v}`, style: { '--fc': f.color } },
          h('span', f.name.split(' ').pop()), h('b', (v > 0 ? '+' : '') + v),
          h('i', { style: { width: Math.abs(v) * 5 + '%', left: v < 0 ? 50 - Math.abs(v) * 5 + '%' : '50%', background: v < 0 ? '#e0463a' : f.color } }));
      })),
      h('div.party',
        h('img.me', { src: spriteURL(SPR.royals[run.royal], 2), alt: royal.name, title: royal.name }),
        run.party.map((id) => h('div.pm', { title: `${COMPANIONS[id].name} · 인연 ${run.bonds[id] || 0}` },
          h('img', { src: portraitURL(id), alt: '' }), h('b', '♥'.repeat(run.bonds[id] || 0) || '·')))),
    );
    info = h('div.map-info');
    const foot = h('div.map-foot',
      h('button.btn', { onclick: () => { audio.sfxPlay('click'); boardPanel(); } }, '보드 · 유물 ', h('small', `${run.relics.length}`)),
      h('button.btn', { onclick: () => { audio.sfxPlay('click'); menu(); } }, '메뉴'));
    el = h('div.screen.map', lineSvg, nodeEls, head, info, foot);
    app.ui.appendChild(el);
    if (!run.pos) showInfo(null, '길을 고르세요. 아래쪽 반짝이는 별에서 여정이 시작됩니다.');
    else showInfo(null, '다음으로 갈 별을 고르세요.');
  }

  function showInfo(nd, text) {
    if (!nd) { info.replaceChildren(h('div.hint', text)); return; }
    const t = NODE_TYPES[nd.type];
    let title = t.name, desc = t.desc;
    if (nd.type === 'boss') {
      const bossId = run.act < 3 ? ACTS[run.act - 1].boss : null;
      title = bossId === 'ogran' ? '보스 · 잿불 거인 오그란' : bossId === 'morven' ? '보스 · 배신의 재상 모르벤' : '최종 보스 · ???';
    }
    info.replaceChildren(
      h('img', { src: iconURL(nd.type, TYPE_COL[nd.type], 3), alt: '' }),
      h('div', h('b', title), h('div', desc)),
      h('button.btn.primary', { onclick: () => go(nd) }, '들어가기'));
  }

  function choose(nd, isAvail) {
    if (!isAvail) {
      audio.sfxPlay('deny');
      showInfo(null, nd.done ? '이미 지나온 곳입니다.' : '지금은 갈 수 없는 곳입니다. 선으로 이어진 별만 갈 수 있어요.');
      return;
    }
    audio.sfxPlay('click');
    if (sel === nd.id) { go(nd); return; }
    sel = nd.id;
    el.querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
    const btn = [...el.querySelectorAll('.node')].find((b) => b.style.left === pos(nd)[0] + 'px' && b.style.top === pos(nd)[1] + 'px');
    if (btn) btn.classList.add('sel');
    showInfo(nd);
  }

  function go(nd) {
    audio.sfxPlay('click');
    enterNode(app, run, nd.id);
  }

  function boardPanel() {
    const c = run.carry;
    const sc = setCounts(run.relics);
    sheet(app.ui,
      h('h2', 'BOARD & RELICS'),
      h('div.sub', `강화 ${c.upg.map((v, i) => `${UPG_NAMES[i]} Lv.${v}`).join(' · ')}`),
      h('div.mini-board', c.units.map((u) => h('div.mb', u ? h('img', { src: spriteURL(SPR.units[u.id].r, 2), alt: UNIT[u.id].name, title: UNIT[u.id].name, style: { outline: `1px solid ${u && UNIT[u.id].tier === 5 ? '#ff9ad9' : TIERS[UNIT[u.id].tier].color}` } }) : null))),
      h('div.chron-tier', { style: { color: 'var(--gold2)' } }, `유물 ${run.relics.length}`),
      run.relics.length ? h('div.relic-list', run.relics.map((id) => relicRow(id))) : h('div.note', '아직 유물이 없습니다. 정예와 보물, 상인, 사건에서 얻을 수 있어요.'),
      Object.keys(sc).length ? h('div', { style: { marginTop: '12px' } }, Object.entries(sc).map(([k, n]) => h('div.note', `◆ ${SETS[k].name} ${n}/3 — 2개: ${SETS[k].n2.text} · 3개: ${SETS[k].n3.text}`))) : null,
    );
  }

  function menu() {
    const s = sheet(app.ui,
      h('h2', 'MENU'),
      h('div.sub', '여정은 지도 화면에 올 때마다 자동 저장됩니다.'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('button.btn', { onclick: () => settingsPanel(app.ui, app) }, '설정'),
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); s.close(); app.go('lobby'); } }, '저장하고 로비로'),
        h('button.btn.danger', {
          onclick: (e) => {
            const b = e.currentTarget;
            if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = '정말 포기할까요? 한 번 더'; return; }
            endRun(run, 'defeat');
            clearRun();
            s.close();
            app.go('lobby');
          },
        }, '여정 포기')));
  }

  return { enter, exit: () => el && el.remove(), resize: () => { if (el) build(); } };
}

export function relicRow(id) {
  const r = RELIC[id];
  if (!r) return null;
  return h('div.relic-row', { style: { '--gc': GRADE[r.g].color } },
    h('b', r.name), h('span.gr', GRADE[r.g].name + (r.set ? ` · ${SETS[r.set].name}` : '')),
    h('div', r.desc), h('div.fl', `“${r.flavor}”`));
}

const pcache = new Map();
export function portraitURL(who, face = 'neutral', scale = 1) {
  const k = who + face + scale;
  if (!pcache.has(k)) { const p = portrait(who, face); pcache.set(k, p ? spriteURL(p, scale) : ''); }
  return pcache.get(k);
}

export { saveRun };
