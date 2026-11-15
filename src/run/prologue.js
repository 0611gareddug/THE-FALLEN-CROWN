// 프롤로그: 마왕군이 마을에 쳐들어온 날
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { place, portrait, CAST } from '../gfx/art2.js';

const PART1 = [
  ['narr', '', '햇살 좋은 풀숲 마을. 오늘은 1년에 한 번 열리는 용사단 제비뽑기 날이다.'],
  ['narr', '', '그때, 지평선 끝 마왕성에서 보랏빛 구름이 몰려왔다. 마왕 녹스가 다시 깨어난 것이다.'],
  ['bran', 'shock', '고블린 떼다! 마을 울타리가 뚫렸어! 아이들은 회관으로!'],
  ['edric', 'shock', '저, 저기요 할아버지! 제비뽑기에서 제 이름이 나왔는데요?!'],
  ['bran', 'neutral', '축하하네, 용사단. 병사들은 다 밭에 나갔으니, 이걸 쓰게. 마을 소환진이네.'],
  ['bran', 'smug', '누가 나올지는 아무도 모르네. 운에 맡기게. (진지)'],
];
const PART2 = [
  ['narr', '', '첫 고블린 떼를 막아냈다. 마을 사람들이 박수를 쳤다. 한 명은 이장님이다.'],
  ['bran', 'neutral', '이번 용사단은 셋이네. 견습 기사 레오, 꼬마 마법사 미나, 떠돌이 궁수 피크.'],
  ['narr', '', '풀숲을 지나 해변 마을, 구름 산을 넘어 마왕성까지. 1년 전 끌려간 친구 노아도 그곳 어딘가에 있다.'],
  ['narr', '', '무지개 조각을 모아 마왕을 혼내 주자. 운도 당신의 몫이다. 주로 운이.'],
];
const PART3 = [
  ['bran', 'sad', '…괜찮네. 처음엔 다 그래. 나도 첫 싸움에서 허리를 다쳤지.'],
  ['narr', '', '프롤로그는 언제든 다시 할 수 있다. 이번엔 바로 모험을 떠나 보자.'],
];

export function prologueScene(app, params) {
  const part = params.part || 1;
  let el, i = 0;
  const lines = part === 1 ? PART1 : part === 2 ? PART2 : PART3;
  const por = h('canvas.ev-por', { width: 32, height: 32 });
  const nm = h('div.ev-name');
  const txt = h('div.ev-text');
  function step() {
    audio.sfxPlay('page');
    if (i >= lines.length) {
      if (part === 1) app.go('battle', { tutorial: true });
      else { store().prologue = true; save(); app.go('select'); }
      return;
    }
    const [who, face, text] = lines[i++];
    const p = who !== 'narr' ? portrait(who, face || 'neutral') : null;
    const g = por.getContext('2d'); g.clearRect(0, 0, 32, 32); if (p) g.drawImage(p, 0, 0);
    por.style.visibility = p ? 'visible' : 'hidden';
    nm.textContent = CAST[who] ? CAST[who].name : '';
    txt.textContent = text;
    txt.classList.toggle('narr', !p);
  }
  return {
    enter() {
      app.bg.setMode('game');
      audio.play(part === 1 ? 'event' : 'lobby');
      const bg = h('canvas.ev-bg', { width: 240, height: 135 });
      bg.getContext('2d').drawImage(place('ruins'), 0, 0);
      el = h('div.screen.event', { onpointerdown: (e) => { if (!e.target.closest('button')) step(); } },
        bg,
        h('div.ev-head', h('div.eyebrow', part === 1 ? 'PROLOGUE' : 'THE JOURNEY BEGINS'), h('div.ev-title', part === 1 ? '마왕군이 쳐들어온 날' : '모험의 시작')),
        por,
        h('div.ev-box', nm, txt, h('div.ev-choices', h('button.ev-choice.go', { onclick: step, 'data-nolock': '' }, h('span.t', '계속')), part === 1 ? h('button.ev-choice', { onclick: () => { store().prologue = true; save(); app.go('select'); } }, h('span.t', '프롤로그 건너뛰기')) : null)));
      app.ui.appendChild(el);
      step();
    },
    exit: () => el && el.remove(),
  };
}
