// 협동 채팅: 직접 입력 + 빠른 문구 · 말풍선 + 기록창 · 욕설 가리기 · 연타 방지 · 알림음 · 채팅 끄기
// 메시지는 { t: 'chat', text } 로 보낸다. 방장이 받으면 다시 거르고(욕설 · 연타) 나머지에게 전달한다.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { ROYALS } from '../data/text.js';
import { portraitURL } from '../run/mapScene.js';

export const CHAT_MAX = 60; // 글자 수
const LOG_MAX = 50; // 기록 줄 수
const RATE_N = 3, RATE_WIN = 3000, RATE_BLOCK = 5000; // 3초에 3번까지, 넘으면 5초 막기
const POP_MS = 4000; // 말풍선 시간
export const QUICK_DEFAULT = ['안녕!', '좋아!', '도와줘!', '금화 좀 줘', '고마워!', '기다려 줘', '여기로 가자', 'ㅠㅠ'];

// ── 욕설 가리기 ──
// 글자 사이에 띄어쓰기 · 기호 · 숫자를 끼워 넣어도 잡는다 (한글 · 영문 사이 0~2자)
const BAD = [
  '씨발', '시발', '씨팔', '시팔', '씨빨', '시빨', '쉬발', '쓰발', '싀발', '씌발', '씨바', '씨빠', 'ㅅㅂ', 'ㅆㅂ', 'ㅅㅃ', '시1발', '씨1발',
  '병신', '븅신', '빙신', '병쉰', 'ㅂㅅ', 'ㅄ', '등신',
  '개새끼', '개새기', '개색기', '개색끼', '개쉐이', '개쉑', '새끼', '쌔끼', '색히', 'ㅅㄲ',
  '좆', '존나', '졸라', '좃나', 'ㅈㄴ', '좆나', '좆같', '좃같', 'ㅈ같',
  '미친놈', '미친년', '미친새', 'ㅁㅊ', '미췬', '또라이', '돌아이',
  '지랄', 'ㅈㄹ', '염병', '옘병', '썅', '쌍년', '쌍놈', '걸레', '창녀', '엠창', '느금', '느그엄', '니애미', '니미', '애미뒤', '애비뒤', '니엄마', '느금마',
  '닥쳐', '꺼져', '뒤질래', '디질', '닥치',
  '섹스', '야동',
  '한남충', '한녀', '틀딱', '급식충', '맘충', '김치녀', '장애인새',
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'nigger', 'nigga', 'motherfucker', 'wtf',
];
const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const GAP = '[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z]{0,2}';
const BAD_RE = new RegExp(BAD.sort((a, b) => b.length - a.length).map((w) => [...w].map(esc).join(GAP)).join('|'), 'gi');
export function cleanText(s) {
  s = String(s || '')
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = [...s].slice(0, CHAT_MAX).join('');
  return s.replace(BAD_RE, (m) => '○'.repeat(Math.min(4, Math.max(2, m.replace(/[^가-힣ㄱ-ㅎa-zA-Z]/g, '').length))));
}

// 연타 방지: 최근 보낸 시각 목록 → 지금 보낼 수 있는지 (막혔으면 남은 ms)
function rateCheck(st, now) {
  if (st.until > now) return st.until - now;
  st.ts = st.ts.filter((t) => now - t < RATE_WIN);
  if (st.ts.length >= RATE_N) { st.until = now + RATE_BLOCK; st.ts = []; return RATE_BLOCK; }
  st.ts.push(now);
  return 0;
}

const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 6a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 7 10zm5 0a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 12 10zm5 0a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 17 10z"/></svg>';

export class Chat {
  constructor(coop) {
    this.coop = coop;
    this.log = [];
    this.unread = 0;
    this.open = false;
    this.mine = { ts: [], until: 0 }; // 내 연타 상태
    this.peers = {}; // 방장: 자리별 연타 상태
    this.pops = {}; // 화면 위쪽 말풍선 (보낸 사람마다 하나)
    this.bubble = null; // 전투 화면이 넣어 주는 초상 말풍선 함수 (from, text) => bool
    const st = store().settings;
    if (st.chatSound === undefined) st.chatSound = true;
    if (st.chatMute === undefined) st.chatMute = false;
    this.build();
    this.offs = [coop.net.on('chat', (m) => this.onNet(m))];
    this.onKey = (e) => this.key(e);
    window.addEventListener('keydown', this.onKey, true);
    this.onResize = () => { clearTimeout(this.rzT); this.rzT = setTimeout(() => this.relayout(), 120); };
    window.addEventListener('resize', this.onResize);
    this.relayout();
  }

  get quick() {
    const q = store().settings.chatQuick;
    return Array.isArray(q) && q.length === 8 ? q : QUICK_DEFAULT;
  }

  // ── 화면 요소 (한 번만 만들고 다시 쓴다) ──
  build() {
    const stage = document.getElementById('stage');
    this.badge = h('span.chat-badge');
    this.btn = h('button.chat-btn', { 'aria-label': '채팅 열기', onclick: (e) => { e.stopPropagation(); this.toggle(); } });
    this.btn.innerHTML = ICON;
    this.btn.appendChild(this.badge);
    this.list = h('div.chat-log');
    this.quickRow = h('div.chat-quick');
    this.input = h('input.chat-in', { type: 'text', maxLength: CHAT_MAX, placeholder: '메시지 입력 (최대 60자)', enterKeyHint: 'send', autocomplete: 'off' });
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.sendInput(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    this.input.addEventListener('keyup', (e) => e.stopPropagation());
    this.input.addEventListener('input', () => this.updateCount());
    this.count = h('span.chat-count', `0/${CHAT_MAX}`);
    this.sendBtn = h('button.chat-send', { onclick: () => this.sendInput() }, '보내기');
    this.note = h('div.chat-note');
    this.setView = h('div.chat-set');
    this.body = h('div.chat-body', this.list, this.quickRow, h('div.chat-form', this.input, this.count, this.sendBtn), this.note);
    this.gearBtn = h('button.chat-gear', { 'aria-label': '채팅 설정', onclick: () => this.toggleSettings() }, '설정');
    this.panel = h('div.chat-panel',
      h('div.chat-head', h('b', '채팅'), h('span.chat-who'), this.gearBtn, h('button.chat-x', { 'aria-label': '닫기', onclick: () => this.close() }, '✕')),
      this.body, this.setView);
    // 패널 안의 누름이 아래 화면(사건 넘기기 등)으로 새지 않게
    for (const ev of ['pointerdown', 'click', 'wheel', 'touchstart']) this.panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.popWrap = h('div.chat-pops');
    stage.append(this.btn, this.panel, this.popWrap);
    this.renderQuick();
    this.updateBadge();
  }

  renderQuick() {
    this.quickRow.replaceChildren(...this.quick.map((q) => h('button.chat-q', { onclick: () => this.send(q) }, q)));
  }

  updateCount() {
    const n = [...this.input.value].length;
    this.count.textContent = `${n}/${CHAT_MAX}`;
    this.count.classList.toggle('full', n >= CHAT_MAX);
  }

  // 지금 화면에 맞게 버튼 자리를 바꾼다
  place(name) {
    if (name !== this.scene) for (const p of Object.values(this.pops)) { clearTimeout(p.t); p.el.classList.remove('show'); }
    this.scene = name;
    this.btn.classList.toggle('battle', name === 'battle');
    this.btn.classList.toggle('select', name === 'coopSelect' || name === 'map');
    this.relayout();
  }
  // 화면 위아래에 빈 공간(휴대폰 세로)이 있으면 버튼을 그쪽으로 빼서 아무것도 가리지 않게 한다
  relayout() {
    const stage = document.getElementById('stage');
    const r = stage.getBoundingClientRect();
    const free = innerHeight - r.bottom;
    const out = free >= 52;
    if (out) {
      if (this.btn.parentNode !== document.body) document.body.appendChild(this.btn);
      this.btn.classList.add('out');
      const size = 44;
      this.btn.style.bottom = Math.max(4, Math.round((free - size) / 2)) + 'px';
      this.btn.style.right = Math.max(12, Math.round(innerWidth - r.right + 12)) + 'px';
    } else {
      if (this.btn.parentNode !== stage) stage.appendChild(this.btn);
      this.btn.classList.remove('out');
      this.btn.style.bottom = this.btn.style.right = '';
    }
  }

  toggle() { if (this.open) this.close(); else this.show(); }
  show(focus = true) {
    this.open = true;
    this.panel.classList.add('on');
    this.btn.classList.add('on');
    this.unread = 0;
    this.updateBadge();
    this.list.scrollTop = this.list.scrollHeight;
    // 휴대폰에서는 자판이 화면을 가리므로 저절로 열지 않는다
    if (focus && !matchMedia('(pointer: coarse)').matches) setTimeout(() => this.input.focus(), 30);
    audio.sfxPlay('click');
  }
  close() {
    this.open = false;
    this.panel.classList.remove('on');
    this.btn.classList.remove('on');
    this.input.blur();
    if (this.setView.classList.contains('on')) this.toggleSettings();
  }

  // PC: Enter로 열기 · Esc로 닫기
  key(e) {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') { if (this.open) { e.stopImmediatePropagation(); e.preventDefault(); this.close(); } return; }
    if (e.isComposing) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (!this.open) this.show(true);
    else this.input.focus();
  }

  updateBadge() {
    this.badge.textContent = this.unread > 9 ? '9+' : String(this.unread);
    this.badge.style.display = this.unread ? '' : 'none';
  }

  // ── 보내기 ──
  sendInput() {
    const v = this.input.value;
    if (!v.trim()) return;
    if (this.send(v)) { this.input.value = ''; this.updateCount(); }
  }
  send(raw) {
    const text = cleanText(raw);
    if (!text) return false;
    const left = rateCheck(this.mine, performance.now());
    if (left) { this.warn(left); audio.sfxPlay('deny'); return false; }
    this.coop.net.send({ t: 'chat', text });
    this.add({ from: this.coop.me, text });
    audio.sfxPlay('click');
    return true;
  }
  warn(ms) {
    clearInterval(this.warnT);
    const end = performance.now() + ms;
    const tick = () => {
      const s = Math.ceil((end - performance.now()) / 1000);
      if (s <= 0) { clearInterval(this.warnT); this.note.textContent = ''; this.note.classList.remove('on'); this.sendBtn.disabled = false; return; }
      this.note.textContent = `너무 빨리 보내고 있어요. ${s}초 뒤에 다시 보낼 수 있어요.`;
    };
    this.note.classList.add('on');
    this.sendBtn.disabled = true;
    tick();
    this.warnT = setInterval(tick, 250);
  }

  // 방장만: 모두에게 알리는 회색 줄 (입장 · 퇴장 · AI 대리)
  sys(text) {
    if (!this.coop.host) return;
    this.coop.net.send({ t: 'chat', sys: true, text });
    this.add({ sys: true, text });
  }

  onNet(m) {
    const c = this.coop;
    if (m.sys) { if (!c.host) this.add({ sys: true, text: String(m.text || '').slice(0, 80) }); return; }
    const from = m.from;
    if (from === c.me || c.ai.has(from)) return;
    const text = cleanText(m.text); // 받는 쪽에서도 한 번 더 거른다
    if (!text) return;
    if (c.host) {
      // 방장이 연타를 다시 확인하고 나머지에게 전달
      const st = this.peers[from] || (this.peers[from] = { ts: [], until: 0 });
      if (rateCheck(st, performance.now())) return;
      c.net.send({ t: 'chat', text, from }, from);
    }
    this.add({ from, text });
  }

  // ── 기록 · 말풍선 ──
  add(e) {
    const c = this.coop;
    const other = !e.sys && e.from !== c.me;
    if (other && store().settings.chatMute) return;
    this.log.push(e);
    const row = this.row(e);
    this.list.appendChild(row);
    while (this.log.length > LOG_MAX) { this.log.shift(); this.list.firstElementChild && this.list.firstElementChild.remove(); }
    const nearBottom = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 80;
    if (this.open && (nearBottom || !other)) this.list.scrollTop = this.list.scrollHeight;
    if (!other) return;
    if (!this.open) { this.unread++; this.updateBadge(); this.btn.classList.remove('ping'); void this.btn.offsetWidth; this.btn.classList.add('ping'); }
    if (store().settings.chatSound) audio.sfxPlay('chat');
    if (!(this.bubble && this.bubble(e.from, e.text, POP_MS))) this.pop(e);
  }

  who(from) {
    const c = this.coop;
    const p = c.run && c.run.players ? c.run.players[from] : c.picks[from];
    const r = p && ROYALS.find((x) => x.id === p.royal);
    return { name: c.nameOf(from), color: c.colorOf(from), img: r ? portraitURL(r.id, 'neutral', 2) : null };
  }

  row(e) {
    if (e.sys) return h('div.chat-row.sys', e.text);
    const w = this.who(e.from);
    const me = e.from === this.coop.me;
    return h('div.chat-row' + (me ? '.me' : ''),
      w.img ? h('img.chat-face', { src: w.img, alt: '' }) : h('span.chat-face.none'),
      h('div.chat-msg', h('b', { style: { color: w.color } }, me ? `${w.name} (나)` : w.name), h('span', e.text)));
  }

  // 초상이 없는 화면: 위쪽에 작은 말풍선 (보낸 사람마다 하나만, 새 말이 오면 그 자리에서 바꾼다)
  pop(e) {
    const w = this.who(e.from);
    let p = this.pops[e.from];
    if (!p) {
      p = this.pops[e.from] = { el: h('div.chat-pop'), img: h('img', { alt: '' }), nm: h('b'), tx: h('span') };
      p.el.append(p.img, h('div', p.nm, p.tx));
      p.el.addEventListener('click', () => this.show(false));
      this.popWrap.appendChild(p.el);
    }
    if (w.img) p.img.src = w.img;
    p.img.style.display = w.img ? '' : 'none';
    p.nm.textContent = w.name;
    p.nm.style.color = w.color;
    p.tx.textContent = e.text;
    p.el.classList.remove('show'); void p.el.offsetWidth; p.el.classList.add('show');
    clearTimeout(p.t);
    p.t = setTimeout(() => p.el.classList.remove('show'), POP_MS);
  }

  // ── 채팅 설정 (알림음 · 남의 채팅 끄기 · 빠른 문구 고치기) ──
  toggleSettings() {
    const on = !this.setView.classList.contains('on');
    this.setView.classList.toggle('on', on);
    this.body.style.display = on ? 'none' : '';
    this.gearBtn.textContent = on ? '돌아가기' : '설정';
    if (on) this.renderSettings();
    else this.renderQuick();
  }
  renderSettings() {
    const st = store().settings;
    const tog = (label, key, desc) => {
      const b = h('button.toggle' + (st[key] ? '.on' : ''), {
        'aria-label': label,
        onclick: () => { st[key] = !st[key]; b.classList.toggle('on', st[key]); save(); audio.sfxPlay('click'); },
      });
      return h('div.chat-srow', h('div', h('span', label), h('small', desc)), b);
    };
    const inputs = this.quick.map((q) => {
      const i = h('input.chat-qin', { type: 'text', maxLength: 12, value: q });
      i.addEventListener('keydown', (e) => e.stopPropagation());
      i.addEventListener('change', commit);
      return i;
    });
    function commit() {
      const list = inputs.map((i, k) => cleanText(i.value).slice(0, 12) || QUICK_DEFAULT[k]);
      inputs.forEach((i, k) => (i.value = list[k]));
      st.chatQuick = list; save();
    }
    this.setView.replaceChildren(
      tog('알림음', 'chatSound', '새 말이 오면 짧은 소리'),
      tog('남의 채팅 끄기', 'chatMute', '말풍선 · 소리 · 숫자가 모두 사라져요'),
      h('div.chat-sub', '빠른 문구 (최대 12자)'),
      h('div.chat-qgrid', ...inputs),
      h('button.btn.chat-reset', { onclick: () => { st.chatQuick = null; save(); inputs.forEach((i, k) => (i.value = QUICK_DEFAULT[k])); audio.sfxPlay('click'); } }, '기본 문구로 되돌리기'));
  }

  destroy() {
    this.offs.forEach((f) => f());
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.rzT);
    clearInterval(this.warnT);
    for (const p of Object.values(this.pops)) clearTimeout(p.t);
    this.btn.remove(); this.panel.remove(); this.popWrap.remove();
  }
}
