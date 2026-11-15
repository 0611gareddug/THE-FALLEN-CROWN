// 마스코트 선택창: 카드마다 그림 · 이름 · 스킬 · 쿨타임 · 설명 · 패시브 · 친밀도
import { h } from './dom.js';
import { audio } from '../core/audio.js';
import { MASCOT_DEFS, MASCOT_ORDER } from '../data/mascots.js';
import { mascotLevel } from '../run/run.js';
import { SPR, spriteURL } from '../gfx/sprites.js';

// 같은 그림을 여러 번 만들지 않도록 data URL을 기억해 둔다
const URL_CACHE = {};
const icon = (id) => URL_CACHE[id] || (URL_CACHE[id] = spriteURL(SPR.mascots[id].r, 4));

// 현재 마스코트를 보여 주는 작은 버튼 (누르면 선택창)
export function mascotChip(id, onClick, opts = {}) {
  const m = MASCOT_DEFS[id] || MASCOT_DEFS.puru;
  return h('button.mchip' + (opts.rise ? '.rise' : ''), { onclick: onClick, disabled: !!opts.disabled, style: opts.rise ? { animationDelay: '.5s' } : null },
    h('img', { src: icon(id), alt: '' }),
    h('div.mchip-t',
      h('div.mchip-l', opts.label || '반려 마스코트'),
      h('div', h('b', m.name), h('span', ` Lv.${mascotLevel(id)} · ${m.skill.split(' / ')[0]}`))),
    h('span.mchip-go', '변경 ›'));
}

// 선택창. owned: 해금한 id 목록 · onPick(id) · confirm: 하단 확정 버튼 문구(없으면 고르는 즉시 닫힘)
export function openMascotPicker(root, { current, owned, onPick, confirm, onConfirm, note }) {
  let sel = owned.includes(current) ? current : 'puru';
  const close = () => { s.remove(); };
  const cards = MASCOT_ORDER.map((id) => {
    const m = MASCOT_DEFS[id];
    const has = owned.includes(id);
    const lv = has ? mascotLevel(id) : 0;
    const card = h('button.mcard' + (has ? '' : '.locked') + (id === sel ? '.sel' : ''), {
      onclick: () => {
        if (!has) { audio.sfxPlay('deny'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; }
        audio.sfxPlay('hover');
        sel = id;
        cards.forEach((c, j) => c.classList.toggle('sel', MASCOT_ORDER[j] === sel));
        onPick && onPick(id);
        if (!confirm) close();
      },
    },
    h('div.mc-top',
      h('div.mc-img', h('img', { src: icon(id), alt: '' })),
      h('div.mc-name',
        h('b', has ? m.name : '???'),
        h('div.mc-kind', has ? m.kind : '아직 만나지 못했다'),
        has ? h('div.mc-lv', '♥'.repeat(lv) + '♡'.repeat(5 - lv), h('span', ` Lv.${lv}`)) : null)),
    has
      ? [
        h('div.mc-skill', h('b', m.skill), h('span.mc-cd', `${m.cd}초`)),
        h('div.mc-desc', m.skillDesc),
        h('div.mc-pas', h('span', '패시브'), ` ${m.passive}`),
      ]
      : h('div.mc-lock', h('span', '해금'), ` ${m.unlock}${m.cost ? ` (별가루 ${m.cost})` : ''}`));
    return card;
  });
  const n = owned.filter((id) => MASCOT_DEFS[id]).length;
  const s = h('div.sheet.mpick-sheet', { onpointerdown: (e) => { if (e.target === s) { audio.sfxPlay('click'); close(); } } },
    h('div.panel.mpick',
      h('button.close', { onclick: () => { audio.sfxPlay('click'); close(); }, 'aria-label': '닫기' }, '×'),
      h('div.eyebrow', 'CHOOSE YOUR MASCOT'),
      h('h2', '반려 마스코트'),
      h('div.sub', note || `함께할 마스코트를 고르세요. 만난 마스코트 ${n} / ${MASCOT_ORDER.length}`),
      h('div.mgrid', cards),
      confirm ? h('div.mpick-go',
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); close(); } }, '뒤로'),
        h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); close(); onConfirm && onConfirm(sel); } }, confirm)) : null));
  root.appendChild(s);
  return { close };
}
