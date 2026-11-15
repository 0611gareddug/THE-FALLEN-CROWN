// 놀이 천막: 행운 룰렛 · 카드 짝 맞추기 · 주사위 하이로우
// 솔로와 협동이 같은 게임 판을 쓴다. 협동에서는 각자 자기 화면에서 따로 하고, 결과(보상)만 방장에게 보낸다.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { RNG } from '../core/rng.js';
import { RELIC } from '../data/relics.js';
import { randomRelic, addRelic } from './events.js';
import { frame, resBar } from './nodeScenes.js';
import { finishNode } from './flow.js';
import { saveRun } from './run.js';

export const GAMES = {
  roulette: { name: '행운 룰렛', eyebrow: 'WHEEL OF FORTUNE', bg: 'market', desc: '금화를 걸고 돌림판을 돌린다. 많이 걸수록 보상도 크다.' },
  memory: { name: '카드 짝 맞추기', eyebrow: 'MEMORY CARDS', bg: 'camp', desc: '뒤집힌 카드 12장. 같은 그림 두 장을 맞히면 그 보상을 받는다. 기회는 6번.' },
  hilo: { name: '주사위 하이로우', eyebrow: 'HIGH OR LOW', bg: 'temple', desc: '다음 주사위가 높을까, 낮을까? 맞힐 때마다 상금이 두 배. 틀리면 전부 잃는다.' },
};
export const GAME_IDS = Object.keys(GAMES);

// 이 칸에서 할 게임 (지도 칸마다 고정)
export function gameOf(run) {
  const key = String(run.pos || 's');
  let s = run.seed + run.act * 31;
  for (const c of key) s = (s * 33 + c.charCodeAt(0)) % 1000003;
  return GAME_IDS[s % GAME_IDS.length];
}

// ─────────────── 행운 룰렛 ───────────────
// 8칸: 같은 확률. ×2 · ×3 은 건 금화의 배수로 돌려받는다.
const WHEEL = [
  { k: 'none', t: '꽝', col: '#2a2a36' },
  { k: 'x2', t: '×2', col: '#8a6a2a' },
  { k: 'stone', t: '행운석', col: '#5a3a8a' },
  { k: 'none', t: '꽝', col: '#2a2a36' },
  { k: 'x2', t: '×2', col: '#8a6a2a' },
  { k: 'relic', t: '유물', col: '#2f6f8a' },
  { k: 'curse', t: '저주', col: '#7a2a2a' },
  { k: 'x3', t: '×3', col: '#b88a2a' },
];
const BETS = [20, 50, 100];

// ─────────────── 카드 짝 맞추기 ───────────────
const CARDS = [
  { k: 'gold', icon: '◎', t: '금화 +40', col: '#e8c25a' },
  { k: 'stone', icon: '◆', t: '행운석 +1', col: '#c99bff' },
  { k: 'wall', icon: '▣', t: '성벽 +15', col: '#7fbf6a' },
  { k: 'relic', icon: '✦', t: '유물', col: '#6ab0e8' },
  { k: 'jackpot', icon: '★', t: '금화 +100', col: '#ffd36b' },
  { k: 'skull', icon: '☠', t: '성벽 -10', col: '#e0463a' },
];
const MEM_TRIES = 6;

// 보상 묶음 → 실제 적용(apply)과 문구
// delta: { gold, stones, wall, relic }
export function describe(d) {
  const out = [];
  if (d.gold) out.push(`금화 ${d.gold > 0 ? '+' : ''}${d.gold}`);
  if (d.stones) out.push(`행운석 ${d.stones > 0 ? '+' : ''}${d.stones}`);
  if (d.wall) out.push(`성벽 ${d.wall > 0 ? '+' : ''}${d.wall}`);
  if (d.relic && RELIC[d.relic]) out.push(`유물 ${RELIC[d.relic].name}`);
  return out.length ? out.join(' · ') : '아무것도 얻지 못했다';
}

/**
 * 게임 판 하나를 그린다.
 * env: { run, carry() → 지금 내 금화/행운석/성벽, salt, onDelta(delta) 보상 즉시 적용, onDone(total), onStatus(text) }
 */
export function mountGame(id, root, env) {
  const rng = new RNG((env.run.seed + env.run.act * 977 + (env.run.stats.battles + 1) * 131 + (env.salt || 0)) >>> 0);
  const total = { gold: 0, stones: 0, wall: 0, relic: null };
  const add = (d) => {
    for (const k of ['gold', 'stones', 'wall']) total[k] += d[k] || 0;
    if (d.relic) total.relic = d.relic;
    env.onDelta(d);
  };
  const finish = (msg) => { env.onDone(total, msg); };

  if (id === 'roulette') return roulette();
  if (id === 'memory') return memory();
  return hilo();

  // ── 룰렛 ──
  function roulette() {
    const N = WHEEL.length, seg = 360 / N;
    const stops = WHEEL.map((w, i) => `${w.col} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
    const disc = h('div.wheel-disc', { style: { background: `conic-gradient(${stops})` } },
      ...WHEEL.map((w, i) => h('span.wheel-lbl', { style: { transform: `rotate(${i * seg + seg / 2}deg) translateY(-62px)` } }, w.t)));
    const wheel = h('div.wheel', disc, h('div.wheel-pin'), h('div.wheel-hub'));
    const msg = h('div.mg-msg', '얼마를 걸까?');
    const btns = h('div.mg-btns');
    let spun = false, angle = 0;
    const draw = () => {
      const c = env.carry();
      btns.replaceChildren(
        ...BETS.map((b) => h('button.btn.mg-bet.mg-lock', { disabled: spun || c.gold < b, onclick: () => spin(b) }, `금화 ${b}`)),
        h('button.btn', { disabled: spun, onclick: () => { audio.sfxPlay('click'); finish('룰렛을 돌리지 않고 지나갔다.'); } }, spun ? '…' : '그만두기'),
      );
    };
    function spin(bet) {
      if (spun) return;
      spun = true;
      audio.sfxPlay('dice');
      env.onDelta({ gold: -bet }); total.gold -= bet;
      draw();
      const pick = rng.int(N);
      // 바늘은 위쪽(0도). 칸 가운데가 위로 오도록 돌린다 + 4~5바퀴
      const target = 360 * (4 + rng.int(2)) + (360 - (pick * seg + seg / 2)) + (rng.next() - 0.5) * seg * 0.6;
      angle += target - (angle % 360);
      disc.style.transform = `rotate(${angle}deg)`;
      env.onStatus && env.onStatus(`룰렛에 금화 ${bet}을 걸었다…`);
      let ticks = 0;
      const tk = setInterval(() => { audio.sfxPlay('page'); if (++ticks > 14) clearInterval(tk); }, 140);
      setTimeout(() => {
        clearInterval(tk);
        const w = WHEEL[pick];
        const d = {};
        let line;
        if (w.k === 'x2') { d.gold = bet * 2; line = `×2! 금화 ${bet * 2}을 돌려받았다.`; }
        else if (w.k === 'x3') { d.gold = bet * 3; line = `×3!! 금화 ${bet * 3}이 쏟아졌다.`; }
        else if (w.k === 'stone') { d.stones = bet >= 100 ? 3 : bet >= 50 ? 2 : 1; line = `행운석 ${d.stones}개가 굴러 나왔다.`; }
        else if (w.k === 'relic') { d.relic = randomRelic(env.run, bet >= 100 ? 'rare' : null); line = d.relic ? `유물 '${RELIC[d.relic].name}'이(가) 튀어나왔다!` : '유물 칸… 인데 비어 있다. 금화 2배로 대신.'; if (!d.relic) d.gold = bet * 2; }
        else if (w.k === 'curse') { d.wall = -Math.round(5 + bet / 10); line = `저주! 돌림판이 성벽을 걷어찼다. 성벽 ${d.wall}`; }
        else line = '꽝. 돌림판이 혀를 내밀었다.';
        add(d);
        audio.sfxPlay(['x2', 'x3', 'stone', 'relic'].includes(w.k) ? 'win' : 'fail');
        msg.textContent = line;
        env.onStatus && env.onStatus(`룰렛: ${line}`);
        btns.replaceChildren(h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); finish(line); } }, '확인'));
      }, 2600);
    }
    draw();
    root.append(h('div.mg-wheel-wrap', wheel), msg, btns);
    return { refresh: () => { if (!spun) draw(); } };
  }

  // ── 카드 짝 맞추기 ──
  function memory() {
    const deck = rng.shuffle([...CARDS, ...CARDS].map((c, i) => ({ ...c, i })));
    let tries = MEM_TRIES, open = [], busy = true, matched = 0, done = false;
    const info = h('div.mg-msg', '카드를 잘 봐 두세요…');
    const left = h('div.mg-tries');
    const setLeft = () => left.replaceChildren(h('span', '남은 기회 '), h('b', '●'.repeat(tries) + '○'.repeat(MEM_TRIES - tries)));
    const els = deck.map((c, idx) => {
      const el = h('button.mcard2.up', { onclick: () => flip(idx) },
        h('div.mc2-in', h('div.mc2-back', '?'), h('div.mc2-face', { style: { '--cc': c.col } }, h('i', c.icon), h('small', c.t))));
      return el;
    });
    const grid = h('div.mem-grid', els);
    const end = h('div.mg-btns');
    setLeft();
    // 처음 1.6초 동안 모두 보여 준다
    setTimeout(() => { els.forEach((e) => e.classList.remove('up')); busy = false; info.textContent = '같은 그림 두 장을 찾으세요.'; }, 1600);
    function flip(idx) {
      if (busy || done) return;
      const el = els[idx];
      if (el.classList.contains('up') || el.classList.contains('got')) return;
      audio.sfxPlay('page');
      el.classList.add('up');
      open.push(idx);
      if (open.length < 2) return;
      busy = true;
      const [a, b] = open;
      open = [];
      tries--;
      setLeft();
      const ok = deck[a].k === deck[b].k;
      setTimeout(() => {
        if (ok) {
          els[a].classList.add('got'); els[b].classList.add('got');
          matched++;
          const c = deck[a];
          const d = c.k === 'gold' ? { gold: 40 } : c.k === 'jackpot' ? { gold: 100 } : c.k === 'stone' ? { stones: 1 } : c.k === 'wall' ? { wall: 15 } : c.k === 'skull' ? { wall: -10 } : { relic: randomRelic(env.run, null) };
          add(d);
          audio.sfxPlay(c.k === 'skull' ? 'fail' : 'win');
          info.textContent = c.k === 'skull' ? '해골 짝! 성벽이 덜컹거렸다. (성벽 -10)' : `짝! ${describe(d)}`;
          env.onStatus && env.onStatus(`짝 맞추기: ${info.textContent}`);
        } else {
          els[a].classList.remove('up'); els[b].classList.remove('up');
          audio.sfxPlay('deny');
        }
        busy = false;
        if (!tries || matched === CARDS.length) over();
      }, ok ? 350 : 750);
    }
    function over() {
      done = true;
      els.forEach((e) => e.classList.add('up'));
      const line = matched ? `${matched}쌍을 맞혔다. ${describe(total)}` : '하나도 못 맞혔다. 카드들이 키득거린다.';
      info.textContent = line;
      end.replaceChildren(h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); finish(line); } }, '확인'));
    }
    root.append(left, grid, info, end);
    return { refresh() {} };
  }

  // ── 주사위 하이로우 ──
  function hilo() {
    const base = 15 + env.run.act * 10;
    let pot = base, cur = 1 + rng.int(6), streak = 0, done = false;
    const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const die = h('div.hl-die', FACES[cur - 1]);
    const potEl = h('div.hl-pot');
    const msg = h('div.mg-msg', `지금 주사위는 ${cur}. 다음은 더 높을까, 낮을까? (같으면 다시 굴린다)`);
    const btns = h('div.mg-btns');
    const drawPot = () => potEl.replaceChildren(h('span', '상금 '), h('b', `금화 ${pot}`), h('small', streak ? `  ${streak}연속 성공` : '  (공짜 판돈)'));
    let first = true;
    const draw = () => { const L = first ? '.mg-lock' : ''; first = false; btns.replaceChildren(
      h('button.btn.primary' + L, { disabled: done || cur === 6, onclick: () => guess(1) }, '▲ 높다'),
      h('button.btn.primary' + L, { disabled: done || cur === 1, onclick: () => guess(-1) }, '▼ 낮다'),
      h('button.btn', { disabled: done, onclick: stop }, `그만 · 금화 ${pot} 받기`),
    ); };
    function guess(dir) {
      if (done) return;
      done = true; draw();
      audio.sfxPlay('dice');
      let n = 0;
      die.classList.add('roll');
      const iv = setInterval(() => { die.textContent = FACES[rng.int(6)]; if (++n > 8) clearInterval(iv); }, 70);
      setTimeout(() => {
        clearInterval(iv);
        die.classList.remove('roll');
        let nx = 1 + rng.int(6);
        while (nx === cur) nx = 1 + rng.int(6);
        die.textContent = FACES[nx - 1];
        const ok = dir > 0 ? nx > cur : nx < cur;
        cur = nx;
        if (ok) {
          streak++; pot *= 2;
          audio.sfxPlay('win');
          msg.textContent = streak >= 5 ? `${streak}연속! 주사위가 더는 못 하겠다며 상금을 내놓았다.` : `맞혔다! 지금 주사위는 ${cur}. 계속할까?`;
          env.onStatus && env.onStatus(`하이로우 ${streak}연속 · 상금 금화 ${pot}`);
          drawPot();
          if (streak >= 5) { stop(); return; }
          done = false; draw();
        } else {
          audio.sfxPlay('fail');
          const line = `${cur}! 틀렸다. 상금 금화 ${pot}이 주사위 속으로 사라졌다.`;
          pot = 0; drawPot();
          msg.textContent = line;
          env.onStatus && env.onStatus(`하이로우: ${line}`);
          btns.replaceChildren(h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); finish(line); } }, '확인'));
        }
      }, 700);
    }
    function stop() {
      done = true;
      add({ gold: pot });
      audio.sfxPlay('coin');
      const line = `상금 금화 ${pot}을 챙겼다.${streak ? ` (${streak}연속 성공)` : ''}`;
      msg.textContent = line;
      env.onStatus && env.onStatus(`하이로우: ${line}`);
      btns.replaceChildren(h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); finish(line); } }, '확인'));
    }
    drawPot(); draw();
    root.append(h('div.hl-row', die, potEl), msg, btns);
    return { refresh() {} };
  }
}

// ─────────────── 화면: 솔로 ───────────────

export function applyDelta(run, carry, d) {
  if (d.gold) carry.gold = Math.max(0, carry.gold + d.gold);
  if (d.stones) carry.stones = Math.max(0, carry.stones + d.stones);
  if (d.wall) carry.wall = Math.max(1, Math.min(carry.wallMax, carry.wall + d.wall));
  if (d.relic) addRelic(run, d.relic, []);
}

export function minigameScene(app, { run }) {
  if (run.coop && app.coop) return coopMinigameScene(app, arguments[1]);
  const id = gameOf(run);
  const G = GAMES[id];
  let el, res, game;
  const redrawRes = () => { const n = resBar(run); res.replaceWith(n); res = n; };
  function render() {
    const board = h('div.mg-board');
    res = resBar(run);
    el = frame(app, G.bg, `PLAY TENT · ${G.eyebrow}`, `놀이 천막 — ${G.name}`, res, h('div.note', G.desc), board);
    game = mountGame(id, board, {
      run, carry: () => run.carry,
      onDelta: (d) => { applyDelta(run, run.carry, d); redrawRes(); game && game.refresh(); },
      onDone: () => { run.stats.minigames = (run.stats.minigames || 0) + 1; saveRun(run); finishNode(app, run); },
    });
  }
  return { enter: () => { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ─────────────── 화면: 협동 (각자 따로, 결과만 방장에게) ───────────────
export function coopMinigameScene(app, { run }) {
  const coop = app.coop;
  const id = gameOf(run);
  const G = GAMES[id];
  let el, res, game, offs = [], doneMine = false;
  const partner = h('div.mg-partner', `${coop.partnerName}: 놀이 중…`);
  const goBox = h('div.ev-choices');
  const mine = () => coop.myCarry(coop.run || run);
  const redrawRes = () => { const n = resBar(Object.assign({}, coop.run || run, { carry: mine() })); res.replaceWith(n); res = n; };
  // 방장이 보상을 적용한다 (내 것이든 동료 것이든)
  const hostApply = (who, d) => { const r = coop.run || run; applyDelta(r, r.players[who].carry, d); r.carry = r.players[0].carry; coop.sendRun(); };
  function render() {
    const board = h('div.mg-board');
    res = h('div');
    el = frame(app, G.bg, `PLAY TENT · ${G.eyebrow}`, `놀이 천막 — ${G.name}`, res, h('div.note', G.desc + ' (각자 자기 금화로 따로 합니다)'), partner, board, goBox);
    redrawRes();
    game = mountGame(id, board, {
      run: coop.run || run, salt: coop.me * 7919, carry: mine,
      onDelta: (d) => {
        if (coop.host) hostApply(0, d); else coop.net.send({ t: 'mgd', d });
        // 화면에 바로 반영 (방장이 확정본을 다시 보내 준다)
        if (!coop.host) { const c = mine(); if (d.gold) c.gold = Math.max(0, c.gold + d.gold); if (d.stones) c.stones = Math.max(0, c.stones + d.stones); }
        redrawRes(); game && game.refresh();
      },
      onStatus: (text) => coop.net.send({ t: 'mgs', text }),
      onDone: (total, msg) => {
        doneMine = true;
        board.replaceChildren(h('div.ev-text', `${msg}\n${describe(total)}`));
        coop.net.send({ t: 'mgs', text: `끝! ${describe(total)}`, done: true });
        goBox.replaceChildren();
        voteDone();
      },
    });
  }
  // 둘 다 끝내면 넘어간다. 한 명이 먼저 끝내면 상대에게 20초.
  function voteDone() {
    const key = `mg:${run.act}:${run.pos}`;
    coop.openVote(key, { options: [true], timeout: 180, afterFirst: 20 });
    coop.vote(key, true);
    goBox.append(coop.voteBar(key, () => '다음으로'));
    coop.whenDecided(key, () => {
      coop.handled = coop.handled || new Set();
      if (coop.handled.has(key)) return;
      coop.handled.add(key);
      if (coop.host) { const r = coop.run || run; r.stats.minigames = (r.stats.minigames || 0) + 1; coop.sendRun(); finishNode(app, r); }
    });
  }
  return {
    enter() {
      app.bg.setMode('game');
      audio.play('event');
      if (coop.host) offs.push(coop.net.on('mgd', (m) => hostApply(1, m.d || {})));
      offs.push(coop.net.on('mgs', (m) => { partner.textContent = `${coop.partnerName}: ${m.text}`; partner.classList.toggle('done', !!m.done); if (m.done && !doneMine) partner.textContent += ' — 끝나면 함께 넘어갑니다 (먼저 끝낸 사람 기준 20초)'; }));
      offs.push(coop.onLocal('run', () => { if (el) redrawRes(); }));
      render();
    },
    exit() { offs.forEach((f) => f()); if (el) el.remove(); },
  };
}
