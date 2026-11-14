// 공용 패널: 설정 · 연대기 · 안내
import { h } from './dom.js';
import { store, save, reset } from '../core/storage.js';
import { audio } from '../core/audio.js';
import { UNITS, TIERS, CLASSES } from '../data/units.js';
import { SPR, spriteURL, silhouetteURL } from '../gfx/sprites.js';

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
  const seen = new Set(store().seen);
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
            detail.replaceChildren(
              known
                ? h('div',
                    h('div', { style: { fontSize: '12px', fontWeight: 600, color: tier === 5 ? '#ff9ad9' : t.color } }, u.name),
                    h('div', { style: { color: 'var(--dim)', fontSize: '9px' } }, `${t.name} · ${CLASSES[u.cls].name}`),
                    h('div', u.desc),
                    h('div.q', `“${u.quip}”`))
                : h('div', { style: { color: 'var(--dim)' } }, '아직 만나지 못한 유닛입니다. 잿더미 어딘가에 있을지도.'),
            );
          },
        }, h('img', { src: known ? spriteURL(SPR.units[u.id].r, 3) : silhouetteURL(SPR.units[u.id].r, 3), alt: '' }));
        return cell;
      })),
    ];
  });
  const total = UNITS.filter((u) => seen.has(u.id)).length;
  return sheet(root,
    h('h2', 'CHRONICLE'),
    h('div.sub', `연대기 · 유닛 수집 ${total}/${UNITS.length} (${Math.round((total / UNITS.length) * 100)}%)`),
    ...sections.flat(),
    detail,
  );
}
