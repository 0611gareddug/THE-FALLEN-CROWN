// 협동용 비전투 칸: 상점(각자 구매) · 야영 · 보물 · 제단 · 보상 · 막 전환 · 결말 (투표)
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { RNG } from '../core/rng.js';
import { RELIC, RELICS } from '../data/relics.js';
import { UNIT, TIERS, UPG_NAMES } from '../data/units.js';
import { COMPANIONS } from '../data/companions.js';
import { ACTS, runFx } from '../run/run.js';
import { finishNode } from '../run/flow.js';
import { addRelic, addUnit, randomRelic, applyFxAll } from '../run/events.js';
import { frame, resBar, relicCard, makeShopStock, endingScene } from '../run/nodeScenes.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { VOTE_SEC } from './coop.js';
import { portraitURL } from '../run/mapScene.js';
import { battleCard } from '../run/battleStats.js';

const keyOf = (run, tag) => `${tag}:${run.act}:${run.pos || 's'}:${run.stats.battles}:${run.stats.events}`;

// 선택 블록: 버튼들 + 상대 선택 표시. 모두 10초 투표 (갈리면 무작위, 한 명만 골랐으면 그 선택).
function voteBlock(coop, root, host, key, items, opts = {}) {
  const label = (v) => { const it = items.find((x) => x.v === v); return it ? it.t : '?'; };
  coop.openVote(key, { options: items.filter((x) => !x.disabled).map((x) => x.v), extra: opts.extra, timeout: opts.timeout || VOTE_SEC, afterFirst: opts.afterFirst });
  const btns = items.map((it) => h('button.ev-choice', {
    'data-v': String(it.v), disabled: !!it.disabled,
    onclick: () => { audio.sfxPlay('click'); coop.vote(key, it.v); mark(); },
  }, it.img ? h('img.mini', { src: it.img, alt: '' }) : null, it.card || h('span.t', it.t), it.sub ? h('small', it.sub) : null));
  const mark = () => {
    const v = coop.votes[key] || [];
    btns.forEach((b, i) => coop.markBtn(b, key, items[i].v));
  };
  host.append(...btns, coop.voteBar(key, label));
  const offs = [coop.onLocal('vote', (m) => { if (m.key === key) mark(); })];
  // 결정은 한 번만 처리한다 (화면을 다시 그리면 같은 결정이 또 들어올 수 있다: 상점 무한 반복 방지)
  coop.whenDecided(key, (v, extra) => {
    coop.handled = coop.handled || new Set();
    if (coop.handled.has(key)) return;
    coop.handled.add(key);
    offs.forEach((f) => f());
    if (coop.host) coop.sendRun();
    opts.done && opts.done(v, extra);
  });
  mark();
}

// 계속: 모두 누르면 넘어간다 (10초가 지나면 자동). 상점은 모두 누르거나 누군가 누르고 5초 뒤.
function continueBlock(coop, root, host, run, tag, after) {
  const shop = tag === 'shop';
  voteBlock(coop, root, host, keyOf(run, tag), [{ v: true, t: shop ? '상점 떠나기' : '계속' }], shop ? { timeout: 90, afterFirst: 5, done: after } : { timeout: VOTE_SEC, done: after });
}

// ───────── 상점: 공용 진열대, 각자 자기 금화로 ─────────
export function coopShopScene(app, { run }) {
  const coop = app.coop;
  let el, offs = [];
  if (coop.host && (!run.shop || run.shop.pos !== run.pos)) {
    run.shop = { pos: run.pos, items: makeShopStock(run), sold: [] };
  }
  const buy = (who, i) => {
    const it = run.shop.items[i];
    const c = run.players[who].carry;
    if (!it || run.shop.sold.includes(i) || c.gold < it.cost) return;
    if (it.kind === 'unit' && !c.units.includes(null)) return;
    c.gold -= it.cost;
    run.shop.sold.push(i);
    if (it.kind === 'relic') addRelic(run, it.id, []);
    else if (it.kind === 'unit') { run.carry = c; addUnit(run, it.id, []); run.carry = run.players[0].carry; }
    else if (it.kind === 'stone') c.stones++;
    else run.players[0].carry.wall = Math.min(run.players[0].carry.wallMax, run.players[0].carry.wall + 25);
    it.by = who;
    coop.sendRun();
    render();
  };
  function render() {
    run = coop.run || run;
    if (el) el.remove();
    if (!run.shop) { el = frame(app, 'market', 'WANDERING MERCHANT', '떠돌이 상인', h('div.note', '상인을 부르는 중…')); return; }
    const mine = coop.myCarry(run);
    const items = run.shop.items.map((it, i) => {
      const sold = run.shop.sold.includes(i);
      const can = !sold && mine.gold >= it.cost && (it.kind !== 'unit' || mine.units.includes(null));
      let body;
      if (it.kind === 'relic') body = relicCard(it.id);
      else if (it.kind === 'unit') { const d = UNIT[it.id]; body = h('div.rcard', { style: { '--gc': TIERS[d.tier].color } }, h('div.rg', `${TIERS[d.tier].name} 유닛 · 내 보드로`), h('div.uimg', h('img', { src: spriteURL(SPR.units[d.id].r, 2), alt: '' }), h('b', d.name)), h('div.rd', d.desc)); }
      else if (it.kind === 'stone') body = h('div.rcard', { style: { '--gc': '#c99bff' } }, h('div.rg', '소모품 · 나에게'), h('b', '행운석 1개'));
      else body = h('div.rcard', { style: { '--gc': '#ff9a5a' } }, h('div.rg', '서비스 · 공용'), h('b', '성벽 수리 +25'));
      return h('button.shop-item' + (sold ? '.sold' : ''), {
        disabled: !can,
        onclick: () => { audio.sfxPlay('coin'); if (coop.host) buy(0, i); else coop.net.send({ t: 'buy', i }); },
      }, body, h('div.cost', sold ? `판매 완료${it.by !== undefined ? ` · ${run.players[it.by].name}` : ''}` : `${it.cost} 금화`));
    });
    const go = h('div.ev-choices');
    el = frame(app, 'market', 'WANDERING MERCHANT', '떠돌이 상인',
      resBar(run), h('div.note', '진열대는 함께 쓰고, 금화는 각자 냅니다. 유물과 성벽 수리는 공용, 유닛과 행운석은 산 사람 것.'),
      h('div.shop', items), go);
    continueBlock(coop, el, go, run, 'shop', () => { if (coop.host) { if (run.flags.guildDebt) run.flags.guildDebt = 0; finishNode(app, run); } });
  }
  return {
    enter() {
      app.bg.setMode('game');
      audio.play('map');
      if (coop.host) { offs.push(coop.net.on('buy', (m) => buy(m.from, m.i))); coop.sendRun(); }
      offs.push(coop.onLocal('run', () => { const g = el && el.querySelector('.ev-choices'); if (g) { const keep = g; render(); } else render(); }));
      render();
    },
    exit() { offs.forEach((f) => f()); if (el) el.remove(); },
  };
}

// ───────── 야영 ─────────
export function coopCampScene(app, { run }) {
  const coop = app.coop;
  let el;
  const fx = runFx(run);
  const heal = Math.round(run.carry.wallMax * 0.3 * fx.campHeal);
  function render(msg) {
    if (el) el.remove();
    const box = h('div.ev-choices');
    el = frame(app, 'camp', 'CAMPFIRE', '야영지', resBar(coop.run || run), msg ? h('div.ev-text', msg) : h('div.note', '모닥불 앞에서 하나만 할 수 있습니다. (투표)'), box);
    if (msg) { continueBlock(coop, el, box, run, 'camp-go', () => { if (coop.host) finishNode(app, run); }); return; }
    voteBlock(coop, el, box, keyOf(run, 'camp'), [
      { v: 'rest', t: '쉰다', sub: `공용 성벽 +${heal}` },
      { v: 'talk', t: '동료와 대화한다', sub: '인연 +1', disabled: !run.party.length },
      { v: 'upgrade', t: '장비를 손본다', sub: '모두 강화 1단계 무료' },
    ], {
      extra: (v) => {
        if (v === 'rest') { const c = run.players[0].carry; c.wall = Math.min(c.wallMax, c.wall + heal); }
        return null;
      },
      done: (v) => {
        if (v === 'rest') { audio.sfxPlay('win'); render(`푹 쉬었다. 성벽 +${heal}.`); }
        else if (v === 'talk') sub('talk');
        else sub('upgrade');
      },
    });
  }
  function sub(kind) {
    el.remove();
    const box = h('div.ev-choices');
    el = frame(app, 'camp', 'CAMPFIRE', '야영지', resBar(coop.run || run), h('div.note', kind === 'talk' ? '누구와 이야기할까?' : '어느 쪽을 손볼까?'), box);
    const items = kind === 'talk'
      ? run.party.map((id) => ({ v: id, t: COMPANIONS[id].name, sub: `인연 ${run.bonds[id] || 0} → ${Math.min(5, (run.bonds[id] || 0) + 1)}`, img: portraitURL(id, 'happy') }))
      : [0, 1, 2].map((g) => ({ v: g, t: UPG_NAMES[g], sub: '모두 +1' }));
    voteBlock(coop, el, box, keyOf(run, 'camp-' + kind), items, {
      extra: (v) => {
        if (kind === 'talk') run.bonds[v] = Math.min(5, (run.bonds[v] || 0) + 1);
        else run.players.forEach((p) => p.carry.upg[v]++);
        return null;
      },
      done: (v) => {
        audio.sfxPlay('win');
        run = coop.run || run;
        if (kind === 'talk') { const q = COMPANIONS[v].quips; render(`${COMPANIONS[v].name}: "${q[(run.bonds[v] + run.act) % q.length]}" — 인연 ${run.bonds[v]}`); }
        else render(`${UPG_NAMES[v]} 강화 +1 (모두)`);
      },
    });
  }
  return { enter() { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 보물 ─────────
export function coopTreasureScene(app, { run }) {
  const coop = app.coop;
  let el;
  const id = randomRelic(run, null);
  function render(msg) {
    if (el) el.remove();
    const box = h('div.ev-choices');
    el = frame(app, 'crypt', 'TREASURE', '잊힌 보물', resBar(coop.run || run), msg ? h('div.ev-text', msg) : h('div.note', '상자 두 개 중 하나만. (투표)'), box);
    if (msg) { continueBlock(coop, el, box, run, 'tr-go', () => { if (coop.host) finishNode(app, run); }); return; }
    voteBlock(coop, el, box, keyOf(run, 'tr'), [
      ...(id ? [{ v: 'relic', t: RELIC[id].name, card: relicCard(id) }] : []),
      { v: 'stones', t: '행운석 2개 (모두)' },
    ], {
      extra: (v) => { if (v === 'relic') addRelic(run, id, []); else run.players.forEach((p) => (p.carry.stones += 2)); return null; },
      done: (v) => { audio.sfxPlay('win'); render(v === 'relic' ? `${RELIC[id].name}을(를) 얻었다.` : '모두 행운석 2개를 얻었다.'); },
    });
  }
  return { enter() { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 운명의 제단: 거는 수를 투표, 결과는 함께 ─────────
export function coopAltarScene(app, { run }) {
  const coop = app.coop;
  let el;
  function render(msg) {
    if (el) el.remove();
    const box = h('div.ev-choices');
    el = frame(app, 'temple', 'ALTAR OF FATE', '운명의 제단', resBar(coop.run || run),
      h('div.note', '모두 같은 수의 행운석을 걸고 주사위 하나를 굴린다. 결과는 모두 받는다.'),
      h('div.altar-table', ['⚀⚁ 건 행운석을 잃는다', '⚂⚃ 돌려받고 +1', '⚄ 유물 1개', '⚅ 영웅 유닛 (3개면 전설) + 반환'].map((t) => h('div', t))),
      msg ? h('div.ev-text', msg) : null, box);
    if (msg) { continueBlock(coop, el, box, run, 'alt-go', () => { if (coop.host) finishNode(app, run); }); return; }
    voteBlock(coop, el, box, keyOf(run, 'alt'), [0, 1, 2, 3].map((n) => ({ v: n, t: n ? `행운석 ${n}개씩 건다` : '그냥 지나간다' })), {
      extra: (n) => {
        if (!n) return { f: 0 };
        const f = 1 + new RNG(run.seed + run.stats.rolls * 17 + 3).int(6);
        run.stats.rolls++;
        const paid = run.players.map((p) => { const x = Math.min(n, p.carry.stones); p.carry.stones -= x; return x; });
        let relic = null;
        run.players.forEach((p, i) => {
          if (f >= 3 && f <= 4) p.carry.stones += paid[i] + 1;
          if (f === 6) { p.carry.stones += paid[i]; run.carry = p.carry; addUnit(run, n >= 3 ? 'random:4' : 'random:3', []); run.carry = run.players[0].carry; }
        });
        if (f === 5) { relic = randomRelic(run, n >= 2 ? 'rare' : null); addRelic(run, relic, []); }
        return { f, relic };
      },
      done: (n, out) => {
        if (!n) { if (coop.host) finishNode(app, run); return; }
        const f = out.f;
        audio.sfxPlay(f >= 3 ? 'win' : 'fail');
        render(f <= 2 ? `${f}. 제단이 행운석을 삼켰다.` : f <= 4 ? `${f}. 행운석이 이자를 붙여 돌아왔다.` : f === 5 ? `5. ${out.relic ? RELIC[out.relic].name : '금화'}이(가) 솟아올랐다.` : '6! 두 보드에 강한 유닛이 내려왔다.');
      },
    });
  }
  return { enter() { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 전투 보상 ─────────
export function coopRewardScene(app, { run, kind, escaped }) {
  const coop = app.coop;
  let el;
  const rng = new RNG(run.seed + run.stats.battles * 17);
  const picks = [];
  if (kind === 'elite' || kind === 'boss' || kind === 'dragon') {
    for (let i = 0; i < 3; i++) {
      const pool = RELICS.filter((r) => !run.relics.includes(r.id) && !picks.includes(r.id) && r.g !== 'curse' && (kind === 'elite' ? r.g !== 'legend' : true));
      if (!pool.length) break;
      picks.push(rng.pick(pool).id);
    }
  }
  function render(done) {
    if (el) el.remove();
    const box = h('div.ev-choices');
    const title = kind === 'boss' ? '보스 격파' : kind === 'elite' ? '정예 격파' : kind === 'dragon' ? '용의 둥지' : '전투 승리';
    el = frame(app, kind === 'boss' ? 'hall' : 'road', 'VICTORY', title, resBar(coop.run || run), done ? null : battleCard(coop.run || run),
      escaped ? h('div.note', `도망친 적 ${escaped}마리가 성벽을 할퀴고 갔다.`) : null,
      (kind === 'boss' || kind === 'dragon') ? h('div.note', { style: { color: 'var(--gold2)' } }, '무지개 조각을 손에 넣었다!') : null,
      box);
    if (done) { continueBlock(coop, el, box, run, 'rw-go', () => { if (coop.host) finishNode(app, run); }); return; }
    if (picks.length) {
      voteBlock(coop, el, box, keyOf(run, 'rw'), [...picks.map((id) => ({ v: id, t: RELIC[id].name, card: relicCard(id) })), { v: 'skip', t: '건너뛴다' }], {
        extra: (v) => { if (v !== 'skip') addRelic(run, v, []); return null; },
        done: () => { audio.sfxPlay('win'); render(true); },
      });
    } else {
      const g = 20 + run.act * 15;
      voteBlock(coop, el, box, keyOf(run, 'rw'), [
        { v: 'gold', t: `금화 +${g} (모두)` },
        { v: 'wall', t: '공용 성벽 +18' },
        { v: 'stone', t: '행운석 +1 (모두)' },
      ], {
        extra: (v) => {
          if (v === 'gold') run.players.forEach((p) => (p.carry.gold += g));
          else if (v === 'wall') { const c = run.players[0].carry; c.wall = Math.min(c.wallMax, c.wall + 18); }
          else run.players.forEach((p) => p.carry.stones++);
          return null;
        },
        done: () => { audio.sfxPlay('coin'); render(true); },
      });
    }
  }
  return { enter() { app.bg.setMode('game'); render(false); }, exit: () => el && el.remove() };
}

// ───────── 막 전환 ─────────
export function coopActIntroScene(app, { run }) {
  const coop = app.coop;
  let el;
  return {
    enter() {
      app.bg.setMode('lobby');
      audio.play('lobby');
      const a = ACTS[run.act - 1];
      const box = h('div.ev-choices', { style: { width: '100%', maxWidth: '420px' } });
      el = h('div.screen.act-intro',
        h('div.eyebrow.rise', `ACT ${['I', 'II', 'III', 'IV'][run.act - 1]}`),
        h('h1.rise', { style: { animationDelay: '.2s' } }, a.name),
        h('div.sub.rise', { style: { animationDelay: '.5s' } }, a.sub),
        h('div.note.rise', { style: { animationDelay: '.8s' } }, `막 사이 휴식: 공용 성벽 30% 회복 (${run.carry.wall}/${run.carry.wallMax})`), box);
      app.ui.appendChild(el);
      continueBlock(coop, el, box, run, 'act', () => { if (coop.host) app.go('map', { run }); });
    },
    exit: () => el && el.remove(),
  };
}

// ───────── 결말: 마왕성의 운명을 투표 ─────────
export function coopEndingScene(app, params) {
  const coop = app.coop;
  const { run, defeat } = params;
  let el, inner = null;
  function options() {
    const r = run.rep;
    const trueOk = run.shards >= 5 && (run.bonds.aila || 0) >= 5 && (run.bonds.bran || 0) >= 5 && run.stats.celestials > 0;
    const list = [
      { v: 'dawn', t: '다섯 무지개 조각으로 다리를 놓아 저주를 끝낸다', ok: trueOk, need: '무지개 조각 5 · 바르톨과 에일라 인연 5 · 천상 유닛' },
      { v: 'rebuild', t: '마왕을 물리치고 마을로 돌아간다', ok: true },
      { v: 'saint', t: '구름 수도원과 함께 마왕의 힘을 봉인한다', ok: (r.church || 0) >= 7, need: '구름 수도원 평판 7' },
      { v: 'ash', t: '들판 요정들과 마왕성을 꽃밭으로 바꾼다', ok: (r.cult || 0) >= 7, need: '들판 요정 평판 7' },
      { v: 'forest', t: '숲 동물들과 마왕성을 숲으로 돌려보낸다', ok: (r.tribe || 0) >= 7, need: '숲 동물 마을 평판 7' },
      { v: 'republic', t: '항구 상인회와 마왕성을 관광지로 만든다', ok: (r.guild || 0) >= 7, need: '항구 상인회 평판 7' },
    ];
    return list;
  }
  return {
    enter() {
      app.bg.setMode('lobby');
      audio.play('lobby');
      if (defeat) { inner = endingScene(app, { ...params, noCoop: true }); inner.enter(); return; }
      audio.sfxPlay('victory');
      const box = h('div.ev-choices', { style: { width: '100%', maxWidth: '440px' } });
      el = h('div.screen.act-intro',
        h('div.eyebrow.rise', 'THE DEMON CASTLE'),
        h('h1.rise', '마왕성 꼭대기에서'),
        h('div.sub.rise', '모두 함께 정한다. 마왕성의 운명을.'), box);
      app.ui.appendChild(el);
      voteBlock(coop, el, box, `end:${run.seed}`, options().map((o) => ({ v: o.v, t: o.t, sub: o.ok ? '' : o.need, disabled: !o.ok })), {
        vote: true,
        done: (id) => { el.remove(); el = null; inner = endingScene(app, { ...params, forced: id, noCoop: true }); inner.enter(); },
      });
    },
    exit() { if (el) el.remove(); if (inner) inner.exit(); },
  };
}
