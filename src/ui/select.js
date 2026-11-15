// 용사 · 마스코트 선택
import { h } from './dom.js';
import { audio } from '../core/audio.js';
import { ROYALS } from '../data/text.js';
import { store } from '../core/storage.js';
import { newRun, saveRun } from '../run/run.js';
import { RELICS, RELIC, GRADE } from '../data/relics.js';
import { addRelic } from '../run/events.js';
import { RNG } from '../core/rng.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { mascotChip, openMascotPicker } from './mascotPick.js';

export function selectScene(app) {
  let el;
  let royal = app.lastRoyal || 'edric';
  let mascot = app.lastMascot || 'puru';

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

    const owned = store().mascots || ['puru'];
    if (!owned.includes(mascot)) mascot = 'puru';
    const chipWrap = h('div');
    const pick = (confirm) => openMascotPicker(app.ui, {
      current: mascot, owned,
      onPick: (id) => { mascot = id; drawChip(); },
      confirm: confirm ? '여정 시작' : null,
      onConfirm: (id) => { mascot = id; app.lastRoyal = royal; app.lastMascot = mascot; start(); },
    });
    const drawChip = () => chipWrap.replaceChildren(mascotChip(mascot, () => { audio.sfxPlay('click'); pick(false); }, { rise: true }));
    drawChip();
    el = h('div.screen.select-screen',
      h('div.select-head.rise',
        h('div.eyebrow', 'CHOOSE YOUR HERO'),
        h('h2', '용사를 선택하라')),
      h('div.royals', cards),
      chipWrap,
      h('div.select-go.rise', { style: { animationDelay: '.6s' } },
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); app.go('lobby'); } }, '돌아가기'),
        h('button.btn.primary', {
          onclick: () => { audio.sfxPlay('click'); app.lastRoyal = royal; pick(true); },
        }, '다음 · 마스코트')),
    );
    app.ui.appendChild(el);
  }
  function start() {
    const run = newRun({ royal, mascot });
    run.carry.stones += (store().perks || {}).stone || 0;
    if (!run.pendingStartRelic) { saveRun(run); app.go('map', { run }); return; }
    // 유산 상자: 유물 3개 중 1개
    const rng = new RNG(run.seed);
    const pool = RELICS.filter((r) => r.g === 'common' || r.g === 'rare');
    const picks = rng.shuffle(pool.slice()).slice(0, 3);
    const box = h('div.sheet', h('div.panel',
      h('h2', 'HEIRLOOM'), h('div.sub', '유산 상자에서 하나를 고르세요.'),
      ...picks.map((r) => h('button.pick', {
        onclick: () => { audio.sfxPlay('win'); addRelic(run, r.id, []); run.pendingStartRelic = false; saveRun(run); box.remove(); app.go('map', { run }); },
      }, h('div.rcard', { style: { '--gc': GRADE[r.g].color } }, h('div.rg', GRADE[r.g].name), h('b', r.name), h('div.rd', r.desc), h('div.rf', `“${r.flavor}”`))))));
    app.ui.appendChild(box);
  }
  return { enter, exit: () => el && el.remove() };
}
