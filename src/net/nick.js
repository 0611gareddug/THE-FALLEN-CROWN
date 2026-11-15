// 협동 닉네임: 처음 협동에 들어갈 때 한 번 묻고, 이 기기에 저장한다. 화면에는 '레오(닉네임)'처럼 나온다.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { cleanText } from './chat.js';

export const NICK_MAX = 12;
export const cleanNick = (s) => [...cleanText(s)].slice(0, NICK_MAX).join('');
export const getNick = () => cleanNick(store().nick || '');

// 닉네임 정하기 창. done(nick)은 저장 뒤 불린다.
export function nickDialog(root, { first = false, done } = {}) {
  const d = store();
  const input = h('input.nick-in', { type: 'text', maxLength: NICK_MAX, value: d.nick || '', placeholder: `닉네임 (최대 ${NICK_MAX}자)`, autocomplete: 'off', spellcheck: 'false' });
  const cnt = h('span.nick-cnt');
  const prev = h('div.nick-prev');
  const warn = h('div.nick-warn');
  const upd = () => {
    const v = cleanNick(input.value);
    cnt.textContent = `${[...input.value].length}/${NICK_MAX}`;
    prev.replaceChildren(h('span', '이렇게 보여요: '), h('b', `레오(${v || '닉네임'})`));
  };
  const finish = (v) => {
    d.nick = v; d.nickAsked = true; save();
    s.remove();
    done && done(v);
  };
  const ok = () => {
    const v = cleanNick(input.value);
    const bad = v.includes('○') && !input.value.includes('○');
    warn.textContent = bad ? '쓸 수 없는 말이 들어 있어요. 다른 닉네임을 정해 주세요.' : '';
    if (!v || bad) { audio.sfxPlay('deny'); input.focus(); input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); return; }
    audio.sfxPlay('click');
    finish(v);
  };
  // 입력 중에는 게임 단축키가 눌리지 않게 (창에 붙은 단축키는 버블 단계에서 받는다)
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.isComposing) ok(); });
  input.addEventListener('input', upd);
  const s = h('div.sheet.nick-sheet',
    h('div.panel',
      h('h2', first ? '협동 닉네임 정하기' : '협동 닉네임 바꾸기'),
      h('div.sub', '함께하는 친구들에게 영웅 이름 옆에 붙어 보여요. 이 기기에 저장되고, 설정에서 언제든 바꿀 수 있어요.'),
      h('div.nick-row', input, cnt),
      prev, warn,
      h('div.nick-btns',
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); if (first) finish(''); else s.remove(); } }, first ? '나중에' : '취소'),
        h('button.btn.primary', { onclick: ok }, '정하기'))));
  root.appendChild(s);
  upd();
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => input.focus(), 50);
  return s;
}
