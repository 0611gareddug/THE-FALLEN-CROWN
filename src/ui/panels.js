// 공용 패널: 설정 · 연대기 · 안내
import { h } from './dom.js';
import { store, save, reset } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { UNITS, TIERS, CLASSES } from '../data/units.js';
import { SPR, spriteURL, silhouetteURL } from '../gfx/sprites.js';
import { RELICS, ROYAL_RELICS, GRADE, SETS } from '../data/relics.js';
import { EVENT_DATA } from '../data/events.js';
import { ENDINGS, ENDING_ORDER } from '../data/endings.js';
import { ACHS, PERKS } from '../meta/achievements.js';
import { MASCOT_DEFS, MASCOT_ORDER } from '../data/mascots.js';

export function sheet(root, ...content) {
  const close = () => { audio.sfxPlay('click'); s.remove(); };
  const s = h('div.sheet', { onpointerdown: (e) => { if (e.target === s) close(); } },
    h('div.panel', h('button.close', { onclick: close, 'aria-label': '닫기' }, '×'), ...content));
  root.appendChild(s);
  return { el: s, close };
}

export function notice(root, title, sub, body) {
  return sheet(root, h('h2', title), h('div.sub', sub), body ? h('div.note', { html: body }) : null);
}

function toggleRow(label, key, onChange) {
  const st = store().settings;
  const t = h('button.toggle' + (st[key] ? '.on' : ''), {
    'aria-label': label,
    onclick: () => {
      st[key] = !st[key];
      t.classList.toggle('on', st[key]);
      save();
      audio.sfxPlay('click');
      onChange && onChange(st[key]);
    },
  });
  return h('div.row', h('span', label), t);
}

function sliderRow(label, key) {
  const st = store().settings;
  const r = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st[key] });
  r.addEventListener('input', () => {
    st[key] = +r.value;
    audio.setVol(st.music, st.sfx);
  });
  r.addEventListener('change', () => { save(); audio.sfxPlay('click'); });
  return h('div.row', h('span', label), r);
}

export function settingsPanel(root, app) {
  const s = sheet(root,
    h('h2', 'SETTINGS'),
    h('div.sub', '설정은 이 브라우저에 저장됩니다.'),
    sliderRow('배경음', 'music'),
    sliderRow('효과음', 'sfx'),
    toggleRow('화면 흔들림', 'shake'),
    toggleRow('데미지 숫자', 'dmgNums'),
    toggleRow('저사양 모드', 'low', () => app.applyQuality()),
    h('div.row', h('span', '저장 데이터'),
      h('button.btn.danger', {
        style: { height: '28px', fontSize: '10px', padding: '0 10px' },
        onclick: (e) => {
          const b = e.currentTarget;
          if (b.dataset.sure) {
            reset();
            audio.setVol(store().settings.music, store().settings.sfx);
            b.textContent = '초기화됨';
            return;
          }
          b.dataset.sure = '1';
          b.textContent = '정말요? 한 번 더';
        },
      }, '초기화')),
    h('div.note', { style: { marginTop: '12px' } }, '저사양 모드는 입자 수를 줄이고 배경 연출을 가볍게 합니다.'),
  );
  return s;
}

export function chroniclePanel(root) {
  const d = store();
  const seen = new Set(d.seen);
  const body = h('div');
  const tabs = [['유닛', unitsTab], ['유물', relicsTab], ['사건', eventsTab], ['결말', endingsTab], ['업적', achTab]];
  const bar = h('div.tabs', tabs.map(([n, fn], i) => h('button.tab' + (i ? '' : '.on'), {
    onclick: (e) => { audio.sfxPlay('hover'); bar.querySelectorAll('.tab').forEach((t) => t.classList.remove('on')); e.currentTarget.classList.add('on'); body.replaceChildren(fn()); },
  }, n)));
  body.appendChild(unitsTab());
  const unitPct = Math.round((UNITS.filter((u) => seen.has(u.id)).length / UNITS.length) * 100);
  return sheet(root, h('h2', 'CHRONICLE'), h('div.sub', `연대기 · 유닛 ${unitPct}% · 결말 ${(d.endings || []).length}/8 · 업적 ${(d.ach || []).length}/${ACHS.length}`), bar, body);

  function unitsTab() {
    const detail = h('div.chron-detail', h('span', { style: { color: 'var(--dim)' } }, '유닛을 눌러 기록을 확인하세요.'));
    let selCell = null;
    const sections = TIERS.map((t, tier) => {
      const list = UNITS.filter((u) => u.tier === tier);
      return [
        h('div.chron-tier', { style: { color: tier === 5 ? '#ff9ad9' : t.color } }, `${t.name}  ·  ${list.filter((u) => seen.has(u.id)).length}/${list.length}`),
        h('div.chron-grid', list.map((u) => {
          const known = seen.has(u.id);
          const cell = h('button.chron-cell', {
            'aria-label': known ? u.name : '미발견',
            onclick: () => {
              audio.sfxPlay('hover');
              if (selCell) selCell.classList.remove('sel');
              cell.classList.add('sel');
              selCell = cell;
              detail.replaceChildren(known
                ? h('div', h('div', { style: { fontSize: '13px', fontWeight: 600, color: tier === 5 ? '#ff9ad9' : t.color } }, u.name), h('div', { style: { color: 'var(--dim)', fontSize: '10.5px' } }, `${t.name} · ${CLASSES[u.cls].name}`), h('div', u.desc), h('div.q', `“${u.quip}”`))
                : h('div', { style: { color: 'var(--dim)' } }, '아직 만나지 못한 유닛입니다. 들판 어딘가에 있을지도.'));
            },
          }, h('img', { src: known ? spriteURL(SPR.units[u.id].r, 3) : silhouetteURL(SPR.units[u.id].r, 3), alt: '' }));
          return cell;
        })),
      ];
    });
    return h('div', ...sections.flat(), detail);
  }
  function relicsTab() {
    const got = new Set(d.relicsSeen || []);
    const row = (r) => (got.has(r.id)
      ? h('div.relic-row', { style: { '--gc': GRADE[r.g].color } }, h('b', r.name), h('span.gr', GRADE[r.g].name + (r.set ? ` · ${SETS[r.set].name}` : '')), h('div', r.desc), h('div.fl', `“${r.flavor}”`))
      : h('div.relic-row.unk', h('b', '???'), h('span.gr', GRADE[r.g].name)));
    const ROY = { edric: '레오', seren: '미나', kyle: '피크' };
    return h('div', h('div.note', `만난 유물 ${RELICS.filter((r) => got.has(r.id)).length}/${RELICS.length}`),
      ...RELICS.map(row),
      ...Object.entries(ROY).map(([k, nm]) => {
        const list = ROYAL_RELICS.filter((r) => r.royal === k);
        return h('div', h('div.chron-tier', { style: { color: 'var(--gold2)' } }, `${nm} · 운명의 장 유물 ${list.filter((r) => got.has(r.id)).length}/${list.length}`), ...list.map(row));
      }));
  }
  function eventsTab() {
    const got = new Set(d.eventsSeen || []);
    const list = Object.values(EVENT_DATA).filter((e) => !e.special);
    return h('div', h('div.note', `겪은 사건 ${list.filter((e) => got.has(e.id)).length}/${list.length}`),
      h('div.ev-list', list.map((e) => h('div.ev-li' + (got.has(e.id) ? '' : '.unk'), got.has(e.id) ? e.title : '???', h('small', e.kind === 'bond' ? '동료' : e.kind === 'faction' ? '진영' : e.kind === 'royal' ? '왕족' : `${(e.act || []).join('·')}막`)))));
  }
  function endingsTab() {
    const got = new Set(d.endings || []);
    return h('div', ...ENDING_ORDER.map((id) => h('div.relic-row' + (got.has(id) ? '' : '.unk'), { style: { '--gc': got.has(id) ? 'var(--gold2)' : '#555' } },
      h('b', got.has(id) ? `결말 ${ENDINGS[id].no} · ${ENDINGS[id].title}` : `결말 ${ENDINGS[id].no} · ???`),
      got.has(id) ? h('div.fl', ENDINGS[id].lines[0][2]) : null)));
  }
  function achTab() {
    const got = new Set(d.ach || []);
    const cats = [...new Set(ACHS.map((a) => a.cat))];
    return h('div', ...cats.map((c) => [
      h('div.chron-tier', { style: { color: 'var(--gold2)' } }, c),
      ...ACHS.filter((a) => a.cat === c).map((a) => h('div.ach' + (got.has(a.id) ? '.on' : ''),
        h('b', a.hidden && !got.has(a.id) ? '???' : a.name), h('span', `+${a.ash}`), h('div', a.hidden && !got.has(a.id) ? '숨겨진 업적' : a.desc))),
    ]).flat());
  }
}

export function treasuryPanel(root) {
  const d = store();
  d.perks = d.perks || {};
  d.mascots = d.mascots || ['puru'];
  const body = h('div');
  const render = () => {
    body.replaceChildren(
      h('div.chron-tier', { style: { color: 'var(--gold2)' } }, '영구 강화'),
      ...PERKS.map((p) => {
        const lv = d.perks[p.id] || 0;
        const max = lv >= p.max;
        const cost = max ? 0 : p.cost(lv);
        return h('div.perk-row',
          h('div', h('b', `${p.name} `), h('small', `Lv.${lv}/${p.max}`), h('div', p.desc)),
          h('button.btn' + (!max && d.ash >= cost ? '.primary' : ''), {
            disabled: max || d.ash < cost,
            onclick: () => { d.ash -= cost; d.perks[p.id] = lv + 1; save(); audio.sfxPlay('upgrade'); render(); },
          }, max ? '완료' : `${cost}`));
      }),
      h('div.chron-tier', { style: { color: 'var(--gold2)' } }, '마스코트 입양'),
      ...MASCOT_ORDER.filter((id) => MASCOT_DEFS[id].cost).map((id) => {
        const m = MASCOT_DEFS[id];
        const has = d.mascots.includes(id);
        return h('div.perk-row',
          h('div', h('b', `${m.name} `), h('small', m.kind), h('div', `${m.skill}: ${m.skillDesc}`)),
          h('button.btn' + (!has && d.ash >= m.cost ? '.primary' : ''), {
            disabled: has || d.ash < m.cost,
            onclick: () => { d.ash -= m.cost; d.mascots.push(id); save(); audio.sfxPlay('win'); render(); },
          }, has ? '함께함' : `${m.cost}`));
      }),
      h('div.note', { style: { marginTop: '10px' } }, '다른 마스코트는 사건, 동료 인연, 업적, 연대기 수집으로 해금됩니다.'),
    );
    sub.textContent = `별가루 ${d.ash}개 · 창고 문은 삐걱거리지만 잘 열립니다. 외상 장부도 있습니다.`;
  };
  const sub = h('div.sub');
  render();
  return sheet(root, h('h2', 'TREASURY'), sub, body);
}
