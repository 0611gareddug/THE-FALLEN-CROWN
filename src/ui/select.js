// 왕족 · 마스코트 선택
import { h } from './dom.js';
import { audio } from '../core/audio.js';
import { ROYALS, MASCOTS } from '../data/text.js';
import { SPR, spriteURL } from '../gfx/sprites.js';

export function selectScene(app) {
  let el;
  let royal = app.lastRoyal || 'edric';
  const mascot = 'puru';

  function enter() {
    app.bg.setMode('lobby');
    const cards = ROYALS.map((r, i) => {
      const card = h('button.royal.rise' + (r.id === royal ? '.sel' : ''), {
        style: { '--rc': r.color, animationDelay: `${0.1 + i * 0.12}s` },
        onmouseenter: () => audio.sfxPlay('hover'),
        onclick: () => {
          audio.sfxPlay('click');
          royal = r.id;
          cards.forEach((c, j) => c.classList.toggle('sel', ROYALS[j].id === royal));
        },
      },
      h('img', { src: spriteURL(SPR.royals[r.id], 4), alt: '' }),
      h('div',
        h('div', h('span.rname', { style: { color: r.color } }, r.name), h('span.rtitle', r.title)),
        h('div.rlore', r.lore),
        r.perks.map((p) => h('div.perk', p)),
      ));
      return card;
    });

    const m = MASCOTS[0];
    el = h('div.screen',
      h('div.select-head.rise',
        h('div.eyebrow', 'CHOOSE YOUR HEIR'),
        h('h2', '왕족을 선택하라')),
      h('div.royals', cards),
      h('div.mascot-row.rise', { style: { animationDelay: '.5s' } },
        h('div.lbl', '반려 마스코트'),
        h('div.mascots',
          MASCOTS.map((x) => x.locked
            ? h('div.mascot', { title: '잠김' }, h('span.q', '?'))
            : h('div.mascot.sel', h('img', { src: spriteURL(SPR.puru.r, 3), alt: '' })))),
        h('div.mascot-info',
          h('b', { style: { color: 'var(--gold2)', fontWeight: 600 } }, `${m.name}`), ` · ${m.kind} — `,
          `스킬 '${m.skill}' (${m.cd}초): ${m.skillDesc} 패시브: ${m.passive}`)),
      h('div.select-go.rise', { style: { animationDelay: '.6s' } },
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); app.go('lobby'); } }, '돌아가기'),
        h('button.btn.primary', {
          onclick: () => {
            audio.sfxPlay('click');
            app.lastRoyal = royal;
            app.go('battle', { royal, mascot });
          },
        }, '여정 시작')),
    );
    app.ui.appendChild(el);
  }
  return { enter, exit: () => el && el.remove() };
}
