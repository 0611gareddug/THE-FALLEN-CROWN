// 프롤로그: 왕국이 무너진 밤
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { place, portrait, CAST } from '../gfx/art2.js';

const PART1 = [
  ['narr', '', '300년 동안 이어진 왕국. 그 밤, 왕관이 울었다.'],
  ['narr', '', '왕관에 봉인되어 있던 저주가 풀리자, 하늘에서 재가 내리기 시작했다.'],
  ['ghost', 'sad', '…아이들아. 도망쳐라. 왕관이 너희를 찾기 전에.'],
  ['bran', 'shock', '폐하! 성문이 뚫렸습니다! 재를 맞은 자들이… 괴물이 되어 몰려옵니다!'],
  ['edric', 'angry', '브란, 병사들을 불러! 여기서 버틴다!'],
  ['bran', 'neutral', '…병사들은 이미 다 도망쳤습니다. 대신 이걸 쓰십시오. 왕실 소환진입니다.'],
  ['bran', 'smug', '무엇이 나올지는 아무도 모릅니다. 운명에 맡기십시오. (진지)'],
];
const PART2 = [
  ['narr', '', '첫 밤을 버텼다. 하지만 성은 이미 잿더미였다.'],
  ['bran', 'sad', '폐하… 아니, 왕족 여러분. 살아남은 왕족은 셋입니다. 누가 이 잿더미를 건너시겠습니까.'],
  ['narr', '', '흩어진 왕관 조각을 모아 저주를 끝내거나, 혹은 저주를 손에 넣거나, 왕관을 영원히 부숴야 한다.'],
  ['narr', '', '선택은 당신의 몫이다. 운도 당신의 몫이다. 주로 운이.'],
];
const PART3 = [
  ['bran', 'sad', '…괜찮습니다, 폐하. 처음엔 다 그렇습니다. 저도 허리를 다쳤었지요.'],
  ['narr', '', '프롤로그는 언제든 다시 할 수 있다. 이번엔 바로 여정을 시작해 보자.'],
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
      bg.getContext('2d').drawImage(place(part === 1 ? 'hall' : 'ruins'), 0, 0);
      el = h('div.screen.event', { onpointerdown: (e) => { if (!e.target.closest('button')) step(); } },
        bg,
        h('div.ev-head', h('div.eyebrow', part === 1 ? 'PROLOGUE' : 'THE JOURNEY BEGINS'), h('div.ev-title', part === 1 ? '왕국이 무너진 밤' : '잿더미 위에서')),
        por,
        h('div.ev-box', nm, txt, h('div.ev-choices', h('button.ev-choice.go', { onclick: step, 'data-nolock': '' }, h('span.t', '계속')), part === 1 ? h('button.ev-choice', { onclick: () => { store().prologue = true; save(); app.go('select'); } }, h('span.t', '프롤로그 건너뛰기')) : null)));
      app.ui.appendChild(el);
      step();
    },
    exit: () => el && el.remove(),
  };
}
