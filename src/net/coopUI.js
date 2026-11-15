// 협동 로비 (방 만들기 · 코드로 참가) + 협동 왕족 선택
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store } from '../core/storage.js';
import { net } from './net.js';
import { Coop, PROTO } from './coop.js';
import { ROYALS } from '../data/text.js';
import { MASCOT_DEFS, MASCOT_ORDER } from '../data/mascots.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { newCoopRun, mascotLevel } from '../run/run.js';

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
  }

  function menu(err) {
    codeIn = h('input.code-in', { maxlength: 6, placeholder: '방 코드 6자리', autocomplete: 'off', spellcheck: 'false', inputmode: 'latin' });
    codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    body.replaceChildren(
      h('div.note', '친구와 각자의 보드를 지키며 성벽을 함께 씁니다. 지도와 사건은 투표로, 의견이 갈리면 운명의 주사위로 정합니다.'),
      err ? h('div.coop-err', err) : null,
      h('button.btn.primary.wide', { onclick: create }, '방 만들기'),
      h('div.or', '또는'),
      h('div.join-row', codeIn, h('button.btn', { onclick: join }, '참가')),
      h('div.note.small', '일부 학교·회사 네트워크에서는 P2P 연결이 막힐 수 있습니다.'));
  }

  async function create() {
    audio.sfxPlay('click');
    body.replaceChildren(h('div.note', '방을 만드는 중…'));
    try {
      const code = await net.host();
      const copy = h('button.btn', {
        onclick: () => { navigator.clipboard && navigator.clipboard.writeText(code).then(() => { copy.textContent = '복사됨!'; }); },
      }, '코드 복사');
      body.replaceChildren(
        h('div.note', '친구에게 이 코드를 알려주세요.'),
        h('div.room-code', code.split('').map((c) => h('span', c))),
        h('div.join-row', copy),
        h('div.waiting', h('i.dot.pulse'), ' 친구를 기다리는 중…'));
      const off = net.on('_status', (m) => {
        if (m.s === 'connected') { off(); start(); }
        if (m.s === 'error') { off(); menu(m.msg); }
      });
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
  let el, offPick;
  const d = store();
  const owned = d.mascots || ['puru'];
  const mine = () => coop.picks[coop.me];
  const theirs = () => coop.picks[1 - coop.me];
  if (!mine().royal) {
    const taken = theirs().royal;
    coop.picks[coop.me] = { royal: ROYALS.find((r) => r.id !== taken && r.id === (coop.host ? 'edric' : 'seren')) ? (coop.host ? 'edric' : 'seren') : ROYALS.find((r) => r.id !== taken).id, mascot: owned.includes(app.lastMascot) ? app.lastMascot : 'puru', ready: false, lv: 1 };
  }
  const send = () => { const p = mine(); p.lv = mascotLevel(p.mascot); coop.net.send({ t: 'pick', p }); render(); };

  function render() {
    if (!el) return;
    const me = mine(), them = theirs();
    const cards = ROYALS.map((r) => {
      const isMe = me.royal === r.id, isThem = them.royal === r.id;
      return h('button.royal' + (isMe ? '.sel' : '') + (isThem ? '.taken' : ''), {
        style: { '--rc': r.color },
        disabled: isThem || me.ready,
        onclick: () => { audio.sfxPlay('hover'); me.royal = r.id; send(); },
      },
      h('img', { src: spriteURL(SPR.royals[r.id], 4), alt: '' }),
      h('div',
        h('div', h('span.rname', { style: { color: r.color } }, r.name), h('span.rtitle', r.title)),
        h('div.rlore', r.lore),
        r.perks.map((p) => h('div.perk', p)),
        isMe ? h('div.tag.me', '나') : null, isThem ? h('div.tag.them', coop.partnerName) : null));
    });
    const mBtns = MASCOT_ORDER.map((id) => {
      const has = owned.includes(id);
      return h('button.mascot' + (id === me.mascot ? '.sel' : ''), {
        disabled: me.ready,
        title: has ? MASCOT_DEFS[id].name : `잠김 · ${MASCOT_DEFS[id].unlock}`,
        onclick: () => { if (!has) { audio.sfxPlay('deny'); return; } audio.sfxPlay('hover'); me.mascot = id; send(); },
      }, has ? h('img', { src: spriteURL(SPR.mascots[id].r, 3), alt: '' }) : h('span.q', '?'));
    });
    const both = me.ready && them.ready && me.royal !== them.royal;
    el.replaceChildren(
      h('div.select-head', h('div.eyebrow', 'CHOOSE YOUR HEIRS'), h('h2', '함께할 왕족')),
      h('div.royals', cards),
      h('div.mascot-row',
        h('div.lbl', `내 마스코트 · ${coop.partnerName}: ${them.mascot ? MASCOT_DEFS[them.mascot].name : '고르는 중'}`),
        h('div.mascots', mBtns),
        h('div.mascot-info', h('b', { style: { color: 'var(--gold2)' } }, MASCOT_DEFS[me.mascot].name), ` — ${MASCOT_DEFS[me.mascot].skill}: ${MASCOT_DEFS[me.mascot].skillDesc}`)),
      h('div.select-go',
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); coop.leave(true); app.go('lobby'); } }, '나가기'),
        h('button.btn' + (me.ready ? '' : '.primary'), { onclick: () => { audio.sfxPlay('click'); me.ready = !me.ready; send(); } }, me.ready ? '준비 취소' : '준비 완료'),
        coop.host ? h('button.btn.primary', { disabled: !both, onclick: startRun }, both ? '여정 시작' : `${coop.partnerName} 준비 대기`) : null),
    );
  }

  function startRun() {
    audio.sfxPlay('click');
    const run = newCoopRun([{ ...coop.picks[0], name: '방장' }, { ...coop.picks[1], name: '참가자' }]);
    run.me = 0;
    run.mascotLv = [coop.picks[0].lv || 1, coop.picks[1].lv || 1];
    coop.run = run;
    app.go('map', { run });
  }

  return {
    enter() {
      app.bg.setMode('lobby');
      el = h('div.screen.coop-select');
      app.ui.appendChild(el);
      offPick = coop.onLocal('picks', render);
      send();
    },
    exit() { if (offPick) offPick(); if (el) el.remove(); },
  };
}
