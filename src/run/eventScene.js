// 사건 화면: 장소 배경 + 인물 초상 + 한 글자씩 대사 + 선택지 + 주사위 판정
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { EVENTS, condOk, condText, rollChance, applyFx, applyFxAll, achQueue } from './events.js';
import { finishNode, resumeNode } from './flow.js';
import { saveRun, runFx, nodeOf, ownerOfRoyal } from './run.js';
import { RNG } from '../core/rng.js';
import { place, portrait, CAST, PLACES } from '../gfx/art2.js';
import { COMPANIONS } from '../data/companions.js';
import { unlockAch } from '../meta/achievements.js';

function pickSpeaker(run, who) {
  if (who !== '@q') return who;
  if (!run.party.length) return null;
  return run.party[(run.stats.events + run.party.length) % run.party.length];
}

export function eventScene(app, { run, eventId }) {
  const ev = EVENTS[eventId] || EVENTS.pebble;
  let el, bgCv, por, nameEl, textEl, choicesEl, typing = null, queue = [], onDone = null, meta = {}, changes = [];
  const coop = run.coop && app.coop ? app.coop : null;
  const base = `ev:${eventId}:${run.stats.events}:${run.stats.battles}`;
  const offs = [];
  let stage = 0;
  // 협동: 방장이 결과(주사위 · 효과)를 정해 알린다
  function hostOutcome(c) {
    let r = null, win = null, o = { fx: c.fx, r: c.r };
    if (c.roll) {
      const p = rollChance(run, c);
      r = 1 + new RNG(run.seed + run.stats.rolls * 131 + run.stats.events).int(100);
      win = r <= Math.round(p * 100);
      run.stats.rolls++;
      if (run.flags.blessed3 > 0) run.flags.blessed3--;
      o = win ? c.win : c.lose;
    }
    const m = {};
    const ch = applyFxAll(run, o.fx, m);
    return { r, win, changes: ch, needLeave: m.needLeave || null, unlockMascot: m.unlockMascot || null, ach: m.ach || null, skipBattle: !!m.skipBattle };
  }

  function enter() {
    app.bg.setMode('game');
    audio.play('event');
    el = h('div.screen.event');
    bgCv = h('canvas.ev-bg', { width: 240, height: 135 });
    bgCv.getContext('2d').drawImage(place(ev.bg), 0, 0);
    por = h('canvas.ev-por', { width: 32, height: 32 });
    nameEl = h('div.ev-name');
    textEl = h('div.ev-text');
    choicesEl = h('div.ev-choices');
    const box = h('div.ev-box', nameEl, textEl, choicesEl);
    el.append(
      bgCv,
      h('div.ev-head', h('div.eyebrow', PLACES[ev.bg] || ''), h('div.ev-title', ev.title)),
      por, box,
    );
    el.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) advance(); });
    app.ui.appendChild(el);
    window.addEventListener('keydown', onKey);
    play(ev.intro, showChoices);
  }

  function onKey(e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
    const n = +e.key;
    if (n >= 1 && n <= 4) { const b = choicesEl.querySelectorAll('button:not(:disabled)')[n - 1]; if (b) b.click(); }
  }

  // ── 대사 재생 ──
  function play(lines, done) {
    queue = lines.filter((l) => pickSpeaker(run, l[0]) !== null).map((l) => [pickSpeaker(run, l[0]), l[1], l[2]]);
    onDone = done;
    choicesEl.replaceChildren();
    next();
  }
  function next() {
    if (!queue.length) { const d = onDone; onDone = null; d && d(); return; }
    const [who, face, text] = queue.shift();
    setSpeaker(who, face);
    typeText(text);
  }
  function setSpeaker(who, face) {
    const g = por.getContext('2d');
    g.clearRect(0, 0, 32, 32);
    const img = who && who !== 'narr' ? portrait(who, face || 'neutral') : null;
    por.style.visibility = img ? 'visible' : 'hidden';
    if (img) g.drawImage(img, 0, 0);
    const c = CAST[who];
    nameEl.textContent = c ? c.name : '';
    nameEl.style.color = COMPANIONS[who] ? COMPANIONS[who].color : who === run.royal ? 'var(--gold2)' : '';
    textEl.classList.toggle('narr', !c);
    por.classList.remove('bump');
    void por.offsetWidth;
    if (img) por.classList.add('bump');
    typing = { who, voice: c && c.voice };
  }
  function typeText(text) {
    textEl.textContent = '';
    const chars = [...text];
    let i = 0, wait = 0;
    if (/[!！]|ㄹㅇ|실화냐|크아/.test(text) && store().settings.shake) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    typing.full = text;
    typing.timer = setInterval(() => {
      if (wait > 0) { wait--; return; }
      if (i >= chars.length) { finishTyping(); return; }
      const ch = chars[i++];
      textEl.textContent += ch;
      if (typing.voice && ch.trim() && i % 2 === 0) audio.blip(typing.voice[0], typing.voice[1]);
      if (ch === '…') wait = 8; else if ('.?!'.includes(ch)) wait = 4;
    }, 26);
  }
  function finishTyping() {
    if (!typing) return;
    clearInterval(typing.timer);
    textEl.textContent = typing.full;
    typing.doneAt = performance.now();
    typing.done = true;
    textEl.appendChild(h('span.ev-more', queue.length || onDone ? '▼' : ''));
  }
  function advance() {
    if (!typing) return;
    if (!typing.done) { finishTyping(); return; }
    if (choicesEl.childElementCount) return;
    audio.sfxPlay('page');
    next();
  }

  // ── 선택지 ──
  function showChoices() {
    const list = ev.choices.filter((c) => !(c.hide && !condOk(run, c.cond)));
    if (coop) {
      const key = `${base}:choose`;
      const owner = ev.royal ? ownerOfRoyal(run, ev.royal) : null;
      const allowed = ev.choices.map((c, i) => i).filter((i) => list.includes(ev.choices[i]) && condOk(run, ev.choices[i].cond));
      coop.openVote(key, { options: allowed, owner, extra: (idx) => hostOutcome(ev.choices[idx]) });
      offs.push(coop.onLocal('vote', (m) => { if (m.key === key) markVotes(key); }));
      offs.push(coop.onLocal('tie', (m) => { if (m.key === key) coop.tieOverlay(el, key, (i) => (ev.choices[i] ? ev.choices[i].t.slice(0, 14) : '?')); }));
      coop.whenDecided(key, (idx, out) => { if (coop.host) coop.sendRun(); present(ev.choices[idx], out); });
      if (owner !== null && owner !== coop.me) {
        choicesEl.replaceChildren(h('div.note', `${run.players[owner].name}의 왕족 사건입니다. 선택을 기다리는 중…`), coop.voteBar(key, (i) => ev.choices[i].t));
        return;
      }
    }
    choicesEl.replaceChildren(...list.map((c, i) => {
      const ok = condOk(run, c.cond);
      const p = c.roll ? rollChance(run, c) : null;
      return h('button.ev-choice' + (ok ? '' : '.locked'), {
        disabled: !ok,
        onmouseenter: () => ok && audio.sfxPlay('hover'),
        'data-i': ev.choices.indexOf(c),
        onclick: () => { audio.sfxPlay('click'); choose(c); },
      },
      h('span.t', c.t, p !== null ? h('em.pct', ` (성공 ${Math.round(p * 100)}%)`) : null),
      c.sub || !ok ? h('small', ok ? c.sub.replace(/성공 \d+%(\s*\([^)]*\))?\s*·?\s*/g, '') : condText(c.cond)) : null);
    }));
    if (coop) choicesEl.append(coop.voteBar(`${base}:choose`, (i) => (ev.choices[i] ? ev.choices[i].t : '?')));
  }
  function markVotes(key) {
    const v = coop.votes[key] || [];
    choicesEl.querySelectorAll('.ev-choice').forEach((b) => {
      const i = +b.dataset.i;
      b.classList.toggle('v-me', i === v[coop.me]);
      b.classList.toggle('v-them', i === v[1 - coop.me]);
    });
  }
  // 협동: 결정된 결과를 보여준다 (효과는 이미 방장이 적용)
  function present(c, out) {
    run = coop.run || run;
    choicesEl.replaceChildren();
    const show = () => {
      changes = out.changes;
      meta = { needLeave: out.needLeave, unlockMascot: out.unlockMascot, ach: out.ach, skipBattle: out.skipBattle };
      const o = c.roll ? (out.win ? c.win : c.lose) : { r: c.r };
      play(o.r || [], () => {
        if (changes.length) choicesEl.append(h('div.ev-changes', changes.map((x) => h('span', x))));
        if (meta.needLeave) { coopLeave(); return; }
        coopContinue();
      });
    };
    if (!c.roll) { show(); return; }
    const ov = h('div.dice');
    const num = h('div.dice-num', '??');
    const lbl = h('div.dice-need', `${Math.round(rollChance(run, c) * 100)} 이하가 나오면 성공`);
    ov.append(h('div.dice-card', h('div.eyebrow', 'ROLL OF FATE'), num, lbl));
    el.appendChild(ov);
    audio.sfxPlay('dice');
    let k = 0;
    const spin = setInterval(() => {
      num.textContent = String(1 + Math.floor(Math.random() * 100)).padStart(2, '0');
      if (++k > 16) {
        clearInterval(spin);
        num.textContent = String(out.r).padStart(2, '0');
        num.classList.add(out.win ? 'win' : 'lose');
        lbl.textContent = out.win ? '성공!' : '실패…';
        audio.sfxPlay(out.win ? 'win' : 'fail');
        if (out.win && c.roll <= 0.1) unlockAch('lowroll');
        setTimeout(() => { ov.remove(); show(); }, 900);
      }
    }, 70);
  }
  function coopLeave() {
    const key = `${base}:leave`;
    const newbie = meta.needLeave;
    const opts = run.party.concat(['none']);
    coop.openVote(key, {
      options: opts,
      extra: (pick) => {
        if (pick !== 'none') { run.party = run.party.filter((x) => x !== pick); run.party.push(newbie); }
        return { pick };
      },
    });
    choicesEl.append(h('div.note', { style: { margin: '6px 0' } }, `동료가 가득 찼습니다. ${COMPANIONS[newbie].name}을(를) 데려가려면 한 명과 헤어져야 합니다. (투표)`),
      ...opts.map((id) => h('button.ev-choice', { 'data-i': id, onclick: () => { audio.sfxPlay('click'); coop.vote(key, id); } }, h('span.t', id === 'none' ? `${COMPANIONS[newbie].name}은(는) 데려가지 않는다` : `${COMPANIONS[id].name}와 헤어진다`))),
      coop.voteBar(key, (id) => (id === 'none' ? '데려가지 않음' : COMPANIONS[id].name)));
    offs.push(coop.onLocal('tie', (m) => { if (m.key === key) coop.tieOverlay(el, key, (id) => (id === 'none' ? '데려가지 않음' : COMPANIONS[id].name)); }));
    coop.whenDecided(key, () => { if (coop.host) coop.sendRun(); meta.needLeave = null; choicesEl.replaceChildren(); coopContinue(); });
  }
  function coopContinue() {
    const key = `${base}:done`;
    coop.openVote(key, { options: [true], timeout: 30 });
    const btn = h('button.ev-choice.go', { onclick: () => { btn.disabled = true; audio.sfxPlay('click'); coop.vote(key, true); } }, h('span.t', '계속'));
    choicesEl.append(btn, coop.voteBar(key, () => '계속'));
    coop.whenDecided(key, () => done());
  }

  function choose(c) {
    if (coop) { coop.vote(`${base}:choose`, ev.choices.indexOf(c)); markVotes(`${base}:choose`); return; }
    choicesEl.replaceChildren();
    run.log.push(`${ev.title}: ${c.t}`);
    if (c.roll) { dice(c); return; }
    resolve(c.fx, c.r);
  }

  // ── 주사위 ──
  function dice(c, rerolled) {
    const fx = runFx(run);
    const p = rollChance(run, c);
    const need = Math.round(p * 100);
    const auto = fx.autoDice > (run.autoDiceUsed || 0) && p < 1;
    const ov = h('div.dice');
    const num = h('div.dice-num', '??');
    const lbl = h('div.dice-need', `${need} 이하가 나오면 성공`);
    const btns = h('div.dice-btns',
      h('button.btn.primary', { onclick: () => roll(false) }, '굴린다'),
      auto ? h('button.btn', { onclick: () => roll(true) }, '신의 주사위 (복제품) 사용') : null);
    ov.append(h('div.dice-card', h('div.eyebrow', 'ROLL OF FATE'), num, lbl, btns));
    el.appendChild(ov);
    function roll(useAuto) {
      btns.replaceChildren();
      if (useAuto) run.autoDiceUsed = (run.autoDiceUsed || 0) + 1;
      run.stats.rolls++;
      if (run.flags.blessed3 > 0) run.flags.blessed3--;
      const r = useAuto ? 1 : 1 + Math.floor(Math.random() * 100);
      const win = r <= need;
      audio.sfxPlay('dice');
      let k = 0;
      const spin = setInterval(() => {
        num.textContent = String(1 + Math.floor(Math.random() * 100)).padStart(2, '0');
        if (++k > 16) {
          clearInterval(spin);
          num.textContent = String(r).padStart(2, '0');
          num.classList.add(win ? 'win' : 'lose');
          lbl.textContent = win ? '성공!' : '실패…';
          audio.sfxPlay(win ? 'win' : 'fail');
          if (win) { run.stats.rollWins++; if (c.roll <= 0.1 && !useAuto) { run.stats.lowRollWins++; unlockAch('lowroll'); } }
          setTimeout(() => {
            if (!win && !rerolled && run.carry.stones >= 1 && !useAuto) {
              btns.replaceChildren(
                h('button.btn', { onclick: () => { run.carry.stones--; ov.remove(); dice(c, true); } }, '행운석 1개로 다시 굴리기'),
                h('button.btn.primary', { onclick: () => { ov.remove(); resolve(c.lose.fx, c.lose.r); } }, '받아들인다'));
            } else {
              ov.remove();
              const o = win ? c.win : c.lose;
              resolve(o.fx, o.r);
            }
          }, 750);
        }
      }, 70);
    }
  }

  // ── 결과 ──
  function resolve(fx, lines) {
    changes = applyFx(run, fx, meta);
    play(lines || [], () => {
      if (changes.length) choicesEl.append(h('div.ev-changes', changes.map((x) => h('span', x))));
      if (meta.needLeave) { leaveChoice(); return; }
      choicesEl.append(h('button.ev-choice.go', { onclick: done }, h('span.t', '계속')));
    });
  }

  function leaveChoice() {
    const newbie = meta.needLeave;
    choicesEl.append(h('div.note', { style: { margin: '6px 0' } }, `동료가 가득 찼습니다 (최대 3명). ${COMPANIONS[newbie].name}을(를) 데려가려면 한 명과 헤어져야 합니다.`));
    const opts = run.party.map((id) => h('button.ev-choice', {
      onclick: () => {
        run.party = run.party.filter((x) => x !== id);
        run.party.push(newbie);
        changes.push(`${COMPANIONS[id].name}와 헤어짐`, `${COMPANIONS[newbie].name} 합류`);
        meta.needLeave = null;
        done();
      },
    }, h('span.t', `${COMPANIONS[id].name}와 헤어진다`), h('small', `인연 ${run.bonds[id] || 0}`)));
    opts.push(h('button.ev-choice', { onclick: () => { meta.needLeave = null; done(); } }, h('span.t', `${COMPANIONS[newbie].name}은(는) 데려가지 않는다`)));
    choicesEl.append(...opts);
  }

  function done() {
    audio.sfxPlay('click');
    if (coop && !coop.host) { recordMeta(); return; }
    if (!ev.special) { run.seen.push(ev.id); run.stats.events++; }
    recordMeta();
    if (ev.id === 'dragon_talk') {
      run.inNode.talked = true;
      if (meta.skipBattle) { finishNode(app, run); return; }
      if (!run.coop) saveRun(run);
      app.go('battle', { run, nodeId: run.inNode.id });
      return;
    }
    finishNode(app, run);
  }
  function recordMeta() {
    const d = store();
    if (meta.unlockMascot) { d.mascots = d.mascots || ['puru']; if (!d.mascots.includes(meta.unlockMascot)) d.mascots.push(meta.unlockMascot); }
    if (meta.ach) meta.ach.forEach((a) => unlockAch(a));
    if (run.party.length >= 3) unlockAch('party3');
    if (Object.values(run.bonds).some((b) => b >= 5)) unlockAch('bond5');
    if (run.shards >= 5) unlockAch('shards5');
    if (run.party.includes('bork') && (run.bonds.bork || 0) >= 5 && !(d.mascots || []).includes('egg')) { d.mascots = (d.mascots || ['puru']).concat('egg'); }
    d.eventsSeen = d.eventsSeen || [];
    if (!d.eventsSeen.includes(ev.id)) d.eventsSeen.push(ev.id);
    save();
  }

  function exit() {
    offs.forEach((f) => f());
    if (typing) clearInterval(typing.timer);
    window.removeEventListener('keydown', onKey);
    if (el) el.remove();
  }
  return { enter, exit };
}
