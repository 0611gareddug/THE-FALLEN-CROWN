// 협동 로비 (방 만들기 · 코드로 참가) + 협동 왕족 선택
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store } from '../core/storage.js';
import { net } from './net.js';
import { Coop, PROTO } from './coop.js';
import { ROYALS } from '../data/text.js';
import { mascotChip, openMascotPicker } from '../ui/mascotPick.js';
import { MASCOT_DEFS } from '../data/mascots.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { newCoopRun, mascotLevel } from '../run/run.js';
import { nickDialog, getNick } from './nick.js';

export function coopLobbyScene(app) {
  let el, body, codeIn;

  function enter() {
    app.bg.setMode('lobby');
    audio.play('lobby');
    body = h('div.coop-body');
    el = h('div.screen.coop-lobby',
      h('div.select-head.rise', h('div.eyebrow', 'TOGETHER'), h('h2', '함께하기')),
      h('div.coop-card.rise', { style: { animationDelay: '.15s' } }, body),
      h('div.select-go.rise', { style: { animationDelay: '.3s' } },
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); net.close(); app.go('lobby'); } }, '돌아가기')));
    app.ui.appendChild(el);
    menu();
    if (!store().nickAsked) nickDialog(app.ui, { first: true, done: () => menu() });
  }

  function menu(err) {
    codeIn = h('input.code-in', { maxlength: 6, placeholder: '방 코드 6자리', autocomplete: 'off', spellcheck: 'false', inputmode: 'latin' });
    codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    body.replaceChildren(...[
      h('div.note', '친구 1~3명과 한 필드에서 함께 마왕성까지! (2~4인) 금화는 각자, 성벽은 함께 씁니다. 지도 · 사건 · 결말은 다수결로 정하고, 표가 같으면 무작위로 정합니다.'),
      err ? h('div.coop-err', err) : null,
      h('div.nick-line', h('span', '내 닉네임'), h('b', getNick() || '없음'), h('button.btn.sm', { onclick: () => { audio.sfxPlay('click'); nickDialog(app.ui, { first: !getNick(), done: () => menu() }); } }, getNick() ? '바꾸기' : '정하기')),
      h('button.btn.primary.wide', { onclick: create }, '방 만들기'),
      h('div.or', '또는'),
      h('div.join-row', codeIn, h('button.btn', { onclick: join }, '참가')),
      h('div.note.small', '일부 학교·회사 네트워크에서는 P2P 연결이 막힐 수 있습니다.'),
    ].filter(Boolean));
  }

  async function create() {
    audio.sfxPlay('click');
    body.replaceChildren(h('div.note', '방을 만드는 중…'));
    try {
      await net.host();
      start();
    } catch (e) { menu(net.statusMsg || '방을 만들지 못했습니다.'); }
  }

  async function join() {
    const code = codeIn.value.trim();
    if (code.length !== 6) { audio.sfxPlay('deny'); codeIn.focus(); return; }
    audio.sfxPlay('click');
    body.replaceChildren(h('div.waiting', h('i.dot.pulse'), ` ${code} 방에 연결하는 중…`));
    try {
      await net.join(code);
      start();
    } catch (e) { menu(net.statusMsg || e.message); }
  }

  function start() {
    audio.sfxPlay('win');
    app.coop = new Coop(app, net);
    net.send({ t: 'hello', v: PROTO });
    if (app.coop.host) app.go('coopSelect', {});
    else body.replaceChildren(h('div.waiting', h('i.dot.on'), ' 연결되었습니다! 방장을 기다리는 중…'));
  }

  return { enter, exit: () => el && el.remove() };
}

export function coopSelectScene(app) {
  const coop = app.coop;
  let el, offs = [];
  const d = store();
  const owned = d.mascots || ['puru'];
  const mine = () => coop.picks[coop.me];
  const takenBy = (rid) => Object.entries(coop.picks).find(([k, p]) => +k !== coop.me && p && p.royal === rid);
  if (!mine() || !mine().royal) {
    const free = ROYALS.filter((r) => !takenBy(r.id));
    const pref = ['edric', 'seren', 'kyle', 'nix'][coop.me] || 'edric';
    coop.picks[coop.me] = { royal: (free.find((r) => r.id === pref) || free[0] || ROYALS[0]).id, mascot: owned.includes(app.lastMascot) ? app.lastMascot : 'puru', ready: false, lv: 1, nick: getNick() };
  }
  mine().nick = getNick();
  const send = () => {
    const p = mine();
    p.lv = mascotLevel(p.mascot);
    coop.net.send({ t: 'pick', p, who: coop.me });
    if (coop.host) coop.broadcastSeats();
    render();
  };

  function render() {
    if (!el) return;
    const me = mine();
    // 내 용사가 다른 사람과 겹치면 (동시에 고른 경우) 자리 번호가 큰 쪽이 양보
    const clash = takenBy(me.royal);
    if (clash && +clash[0] < coop.me && !me.ready) {
      const free = ROYALS.find((r) => !takenBy(r.id) && r.id !== me.royal);
      if (free) { me.royal = free.id; setTimeout(send, 0); }
    }
    const seats = coop.seats;
    const cards = ROYALS.map((r) => {
      const isMe = me.royal === r.id;
      const t = takenBy(r.id);
      return h('button.royal' + (isMe ? '.sel' : '') + (t ? '.taken' : ''), {
        style: { '--rc': r.color },
        disabled: !!t || me.ready,
        onclick: () => { audio.sfxPlay('hover'); me.royal = r.id; send(); },
      },
      h('img', { src: spriteURL(SPR.royals[r.id], 4), alt: '' }),
      h('div',
        h('div', h('span.rname', { style: { color: r.color } }, r.name), h('span.rtitle', r.title)),
        h('div.rlore', r.lore),
        r.perks.map((p) => h('div.perk', p)),
        isMe ? h('div.tag.me', '나') : null, t ? h('div.tag.them', +t[0] === 0 ? '방장' : `동료 ${t[0]}`) : null));
    });
    const others = seats.filter((i) => i !== coop.me);
    const mNames = others.map((i) => { const p = coop.picks[i]; return `${coop.nameOf(i)}: ${p && p.mascot ? MASCOT_DEFS[p.mascot].name : '고르는 중'}`; }).join(' · ');
    const chip = mascotChip(me.mascot, () => {
      audio.sfxPlay('click');
      openMascotPicker(app.ui, { current: me.mascot, owned, onPick: (id) => { me.mascot = id; send(); },
        note: `${mNames || '동료를 기다리는 중'} · 같은 마스코트도 함께 데려갈 수 있어요.` });
    }, { disabled: me.ready, label: '내 마스코트' });
    const allReady = seats.length >= 2 && seats.every((i) => coop.picks[i] && coop.picks[i].ready);
    const roster = h('div.roster', [0, 1, 2, 3].map((i) => {
      const on = seats.includes(i);
      const p = coop.picks[i];
      const r = p && ROYALS.find((x) => x.id === p.royal);
      return h('div.seat' + (on ? '' : '.empty') + (i === coop.me ? '.me' : '') + (p && p.ready ? '.ready' : ''),
        on && r ? h('img', { src: spriteURL(SPR.royals[r.id], 2), alt: '' }) : h('span.q', on ? '…' : '+'),
        h('b', on ? (p && p.nick ? p.nick : i === coop.me ? '나' : i === 0 ? '방장' : `동료 ${i}`) : '빈 자리'),
        on && i === coop.me && p && p.nick ? h('i.seat-me', '나') : null,
        h('small', on ? (p && p.ready ? '준비됨 ✓' : '고르는 중') : '초대 대기'));
    }));
    const codeBox = coop.host ? h('div.room-mini', h('span', '방 코드'), h('b', coop.net.code), h('button.btn.sm', {
      onclick: (e) => { const b = e.currentTarget; navigator.clipboard && navigator.clipboard.writeText(coop.net.code).then(() => { b.textContent = '복사됨!'; }); },
    }, '복사')) : null;
    el.replaceChildren(...[
      h('div.select-head', h('div.eyebrow', `CHOOSE YOUR HEROES · ${seats.length}/4`), h('h2', '함께 떠날 용사')),
      codeBox,
      roster,
      h('div.royals', cards),
      chip,
      h('div.select-go',
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); coop.leave(true); app.go('lobby'); } }, '나가기'),
        h('button.btn' + (me.ready ? '' : '.primary'), { onclick: () => { audio.sfxPlay('click'); me.ready = !me.ready; send(); } }, me.ready ? '준비 취소' : '준비 완료'),
        coop.host ? h('button.btn.primary', { disabled: !allReady, onclick: startRun }, allReady ? `${seats.length}명 출발` : seats.length < 2 ? '동료 대기 중' : '준비 대기') : null),
    ].filter(Boolean));
  }

  function startRun() {
    audio.sfxPlay('click');
    // 자리 번호를 0..n-1로 정리 (빈 자리 없이)
    const seats = coop.seats.slice().sort();
    const list = seats.map((i, k) => ({ ...coop.picks[i], name: k === 0 ? '방장' : `동료 ${k}` }));
    if (seats.some((s, k) => s !== k)) {
      // 중간 자리가 비면 뒤 사람을 당긴다: 참가자에게 새 자리 번호를 알린다
      seats.forEach((s, k) => { if (s !== k) coop.net.sendTo(s, { t: 'reseat', slot: k }); });
      coop.net.remap && coop.net.remap(seats);
    }
    coop.net.locked = true;
    const run = newCoopRun(list);
    run.me = 0;
    run.mascotLv = list.map((p) => p.lv || 1);
    coop.run = run;
    coop.seats = list.map((_, k) => k);
    app.go('map', { run });
  }

  return {
    enter() {
      app.bg.setMode('lobby');
      el = h('div.screen.coop-select');
      app.ui.appendChild(el);
      offs.push(coop.onLocal('picks', render));
      // 방장: 새로 들어온 사람도 이 화면으로
      if (coop.host) offs.push(coop.net.on('_status', (m) => { if (m.s === 'connected' && m.slot !== undefined && !m.msg) { coop.net.sendTo(m.slot, { t: 'go', name: 'coopSelect', p: {} }); setTimeout(() => coop.broadcastSeats(), 50); } }));
      send();
    },
    exit() { offs.forEach((f) => f()); if (el) el.remove(); },
  };
}
