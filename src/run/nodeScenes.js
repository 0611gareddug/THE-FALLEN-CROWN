// 비전투 칸 화면: 상인 · 야영 · 보물 · 운명의 제단 · 전투 보상 · 막 전환 · 결말
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { RNG } from '../core/rng.js';
import { RELIC, RELICS, GRADE, SETS } from '../data/relics.js';
import { UNIT, BY_TIER, TIERS, UPG_NAMES } from '../data/units.js';
import { COMPANIONS } from '../data/companions.js';
import { ROYALS } from '../data/text.js';
import { ENDINGS } from '../data/endings.js';
import { royalEnding } from '../data/fate.js';
import { place, portrait, CAST } from '../gfx/art2.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { iconURL } from '../gfx/icons.js';
import { ACTS, runFx, saveRun, clearRun } from './run.js';
import { finishNode, endRun } from './flow.js';
import { addRelic, addUnit, randomRelic } from './events.js';
import { relicRow, portraitURL } from './mapScene.js';
import { unlockAch } from '../meta/achievements.js';
import { coopShopScene, coopCampScene, coopTreasureScene, coopAltarScene, coopRewardScene, coopActIntroScene, coopEndingScene } from '../net/coopNodes.js';

export const PRICE = { common: 60, rare: 110, legend: 190, set: 80, curse: 45 };

export function frame(app, bg, eyebrow, title, ...body) {
  const cv = h('canvas.ev-bg', { width: 240, height: 135 });
  cv.getContext('2d').drawImage(place(bg), 0, 0);
  const el = h('div.screen.nodescr',
    cv,
    h('div.ev-head', h('div.eyebrow', eyebrow), h('div.ev-title', title)),
    h('div.node-panel', ...body));
  app.ui.appendChild(el);
  return el;
}

export function resBar(run) {
  const c = run.carry;
  return h('div.node-res',
    h('span', h('i.ic.gold'), c.gold), h('span', h('i.ic.stone'), c.stones),
    h('span', '성벽 ', h('b', `${c.wall}/${c.wallMax}`)));
}

export function relicCard(id, extra) {
  const r = RELIC[id];
  return h('div.rcard', { style: { '--gc': GRADE[r.g].color } },
    h('div.rg', GRADE[r.g].name + (r.set ? ` · ${SETS[r.set].name}` : '')),
    h('b', r.name), h('div.rd', r.desc), h('div.rf', `“${r.flavor}”`), extra || null);
}

// ───────── 상인 ─────────
export function makeShopStock(run) {
  const rng = new RNG(run.seed * 3 + run.act * 101 + (run.pos ? run.pos.length * 7 + [...run.pos].reduce((a, c) => a + c.charCodeAt(0), 0) : 0));
  const fx = runFx(run);
  let mult = 1 - fx.shopDisc;
  if ((run.rep.guild || 0) >= 3) mult -= 0.1;
  if ((run.rep.guild || 0) <= -3) mult += 0.2;
  if (run.flags.guildDebt) mult += 0.2;
  const price = (v) => Math.round(v * mult);
  const nRelic = 3 + Math.min(2, fx.shopPlus);
  const stock = [];
  const owned = new Set(run.relics);
  for (let i = 0; i < nRelic; i++) {
    const pool = RELICS.filter((r) => !owned.has(r.id) && !stock.some((s) => s.id === r.id));
    if (!pool.length) break;
    const roll = rng.next();
    const g = roll < 0.45 ? 'common' : roll < 0.7 ? 'set' : roll < 0.88 ? 'rare' : roll < 0.95 ? 'curse' : 'legend';
    const sub = pool.filter((r) => r.g === g);
    const r = rng.pick(sub.length ? sub : pool);
    stock.push({ kind: 'relic', id: r.id, cost: price(PRICE[r.g]) });
  }
  const t1 = rng.pick(BY_TIER[1]), t2 = rng.pick(BY_TIER[2]);
  stock.push({ kind: 'unit', id: t1.id, cost: price(45) }, { kind: 'unit', id: t2.id, cost: price(100) });
  stock.push({ kind: 'stone', cost: price(50) }, { kind: 'heal', cost: price(40) });
  if (fx.shopPlus) stock.push({ kind: 'stone', cost: price(50) });
  return stock;
}

export function shopScene(app, { run }) {
  if (run.coop && app.coop) return coopShopScene(app, { run });
  let el;
  const stock = makeShopStock(run);

  function render() {
    if (el) el.remove();
    const greet = run.party.includes('toto') ? '토토: "이 가게 사장님 제 사촌이에요. 할인 받아드림!"' : run.flags.guildDebt ? '상인: "상인회 계약서에 서명하셨죠? 가격이 좀… 올랐습니다."' : '상인: "어서 오세요! 들판 특가! 환불은 안 됩니다."';
    el = frame(app, 'market', 'WANDERING MERCHANT', '떠돌이 상인',
      resBar(run),
      h('div.note', { style: { marginBottom: '8px' } }, greet),
      h('div.shop', stock.map((it, i) => item(it, i))),
      h('div.node-go', h('button.btn.primary', { onclick: leave }, '떠난다')));
  }
  function item(it, i) {
    const sold = it.sold;
    const can = !sold && run.carry.gold >= it.cost && (it.kind !== 'unit' || run.carry.units.includes(null));
    let body;
    if (it.kind === 'relic') body = relicCard(it.id);
    else if (it.kind === 'unit') { const d = UNIT[it.id]; body = h('div.rcard', { style: { '--gc': TIERS[d.tier].color } }, h('div.rg', `${TIERS[d.tier].name} 유닛`), h('div.uimg', h('img', { src: spriteURL(SPR.units[d.id].r, 2), alt: '' }), h('b', d.name)), h('div.rd', d.desc)); }
    else if (it.kind === 'stone') body = h('div.rcard', { style: { '--gc': '#c99bff' } }, h('div.rg', '소모품'), h('b', '행운석 1개'), h('div.rd', '도박 소환, 주사위 재굴림에 쓴다.'));
    else body = h('div.rcard', { style: { '--gc': '#ff9a5a' } }, h('div.rg', '서비스'), h('b', '성벽 수리 +25'), h('div.rd', '튼튼한 통나무로 땜질한다.'));
    return h('button.shop-item' + (sold ? '.sold' : ''), {
      disabled: !can,
      onclick: () => {
        if (!can) return;
        run.carry.gold -= it.cost;
        it.sold = true;
        if (it.kind === 'relic') addRelic(run, it.id, []);
        else if (it.kind === 'unit') addUnit(run, it.id, []);
        else if (it.kind === 'stone') run.carry.stones++;
        else run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + 25);
        audio.sfxPlay('coin');
        render();
      },
    }, body, h('div.cost', sold ? '판매 완료' : `${it.cost} 금화`));
  }
  function leave() {
    audio.sfxPlay('click');
    if (run.flags.guildDebt) run.flags.guildDebt = 0;
    if (run.carry.gold === 0) unlockAch('broke');
    finishNode(app, run);
  }
  return { enter: () => { app.bg.setMode('game'); audio.play('map'); render(); }, exit: () => el && el.remove() };
}

// ───────── 야영 ─────────
export function campScene(app, { run }) {
  if (run.coop && app.coop) return coopCampScene(app, arguments[1]);
  let el;
  const fx = runFx(run);
  const heal = Math.round(run.carry.wallMax * 0.3 * fx.campHeal);
  function render(msg) {
    if (el) el.remove();
    const opts = msg ? [h('div.ev-text', msg), h('div.node-go', h('button.btn.primary', { onclick: () => finishNode(app, run) }, '출발한다'))] : [
      h('div.note', '모닥불 앞에서 하나만 할 수 있습니다.'),
      h('button.ev-choice', { onclick: () => { run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + heal); audio.sfxPlay('win'); render(`푹 쉬었다. 성벽 +${heal}. 꿈에 뿌루가 나왔다.`); } }, h('span.t', '쉰다'), h('small', `성벽 +${heal}`)),
      h('button.ev-choice', { disabled: !run.party.length, onclick: talk }, h('span.t', '동료와 대화한다'), h('small', run.party.length ? '인연 +1 (한 명)' : '함께하는 동료가 없다')),
      h('button.ev-choice', { onclick: upgrade }, h('span.t', '장비를 손본다'), h('small', '강화 1단계 무료')),
    ];
    el = frame(app, 'camp', 'CAMPFIRE', '야영지', resBar(run), ...opts);
  }
  function talk() {
    audio.sfxPlay('click');
    el.querySelector('.node-panel').replaceChildren(resBar(run), h('div.note', '누구와 이야기할까?'),
      ...run.party.map((id) => h('button.ev-choice', {
        onclick: () => {
          run.bonds[id] = Math.min(5, (run.bonds[id] || 0) + 1);
          if (run.bonds[id] >= 5) unlockAch('bond5');
          if (id === 'bork' && run.bonds[id] >= 5) { const d = store(); d.mascots = d.mascots || ['puru']; if (!d.mascots.includes('egg')) { d.mascots.push('egg'); save(); } }
          audio.sfxPlay('win');
          const q = COMPANIONS[id].quips;
          render(`${COMPANIONS[id].name}: "${q[(run.bonds[id] + run.act) % q.length]}" — 인연 ${run.bonds[id]}`);
        },
      }, h('img.mini', { src: portraitURL(id, 'happy'), alt: '' }), h('span.t', COMPANIONS[id].name), h('small', `인연 ${run.bonds[id] || 0} → ${Math.min(5, (run.bonds[id] || 0) + 1)}`))));
  }
  function upgrade() {
    audio.sfxPlay('click');
    el.querySelector('.node-panel').replaceChildren(resBar(run), h('div.note', '어느 쪽을 손볼까?'),
      ...[0, 1, 2].map((g) => h('button.ev-choice', { onclick: () => { run.carry.upg[g]++; audio.sfxPlay('upgrade'); render(`${UPG_NAMES[g]} 강화 Lv.${run.carry.upg[g]}`); } }, h('span.t', UPG_NAMES[g]), h('small', `Lv.${run.carry.upg[g]} → ${run.carry.upg[g] + 1}`))));
  }
  return { enter: () => { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 보물 ─────────
export function treasureScene(app, { run }) {
  if (run.coop && app.coop) return coopTreasureScene(app, arguments[1]);
  let el;
  const id = randomRelic(run, null);
  function render(msg) {
    if (el) el.remove();
    el = frame(app, 'crypt', 'TREASURE', '잊힌 보물',
      resBar(run),
      ...(msg ? [h('div.ev-text', msg), h('div.node-go', h('button.btn.primary', { onclick: () => finishNode(app, run) }, '계속'))] : [
        h('div.note', '먼지 쌓인 상자 두 개. 하나만 가져갈 수 있다.'),
        id ? h('button.pick', { onclick: () => { addRelic(run, id, []); audio.sfxPlay('win'); render(`${RELIC[id].name}을(를) 얻었다.`); } }, relicCard(id)) : null,
        h('button.pick', { onclick: () => { run.carry.stones += 2; audio.sfxPlay('stone'); render('행운석 2개를 얻었다. 반짝인다.'); } }, h('div.rcard', { style: { '--gc': '#c99bff' } }, h('div.rg', '소모품'), h('b', '행운석 2개'), h('div.rd', '확실한 게 좋을 때도 있다.'))),
      ]));
  }
  return { enter: () => { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 운명의 제단 ─────────
export function altarScene(app, { run }) {
  if (run.coop && app.coop) return coopAltarScene(app, arguments[1]);
  let el;
  const TABLE = ['⚀ 행운석을 잃는다', '⚁ 행운석을 잃는다', '⚂ 건 만큼 돌려받고 +1', '⚃ 건 만큼 돌려받고 +1', '⚄ 유물 1개', '⚅ 영웅 유닛 + 건 행운석 반환'];
  function render(msg) {
    if (el) el.remove();
    el = frame(app, 'temple', 'ALTAR OF FATE', '운명의 제단',
      resBar(run),
      h('div.note', '주사위 하나. 행운석을 걸고 굴린다. 많이 걸수록 보상도 커진다.'),
      h('div.altar-table', TABLE.map((t) => h('div', t))),
      ...(msg ? [h('div.ev-text', msg), h('div.node-go', h('button.btn.primary', { onclick: () => finishNode(app, run) }, '떠난다'))] : [
        ...[1, 2, 3].map((n) => h('button.ev-choice', { disabled: run.carry.stones < n, onclick: () => roll(n) }, h('span.t', `행운석 ${n}개를 건다`), h('small', n === 3 ? '6이 나오면 전설 유닛' : ''))),
        h('button.ev-choice', { onclick: () => finishNode(app, run) }, h('span.t', '그냥 지나간다')),
      ]));
  }
  function roll(n) {
    run.carry.stones -= n;
    audio.sfxPlay('dice');
    const f = 1 + Math.floor(Math.random() * 6);
    run.stats.rolls++;
    let msg;
    if (f <= 2) msg = `${f}. 제단이 행운석 ${n}개를 삼켰다. 트림 소리가 났다.`;
    else if (f <= 4) { run.carry.stones += n + 1; msg = `${f}. 행운석 ${n + 1}개가 돌아왔다. 이자가 붙었다.`; }
    else if (f === 5) { const id = randomRelic(run, n >= 2 ? 'rare' : null); addRelic(run, id, []); msg = `${f}. 제단에서 ${id ? RELIC[id].name : '금화'}이(가) 솟아올랐다.`; }
    else { run.carry.stones += n; const out = []; addUnit(run, n >= 3 ? 'random:4' : 'random:3', out); msg = `6! 제단이 빛난다. ${out.join(', ')}`; }
    setTimeout(() => { audio.sfxPlay(f >= 3 ? 'win' : 'fail'); render(msg); }, 700);
  }
  return { enter: () => { app.bg.setMode('game'); audio.play('event'); render(); }, exit: () => el && el.remove() };
}

// ───────── 전투 보상 ─────────
export function rewardScene(app, { run, kind, gold, escaped }) {
  if (run.coop && app.coop) return coopRewardScene(app, arguments[1]);
  let el;
  const rng = new RNG(run.seed + run.stats.battles * 17);
  const picks = [];
  if (kind === 'elite' || kind === 'boss' || kind === 'dragon') {
    const owned = new Set(run.relics);
    for (let i = 0; i < 3; i++) {
      const pool = RELICS.filter((r) => !owned.has(r.id) && !picks.includes(r.id) && r.g !== 'curse' && (kind === 'elite' ? r.g !== 'legend' : true));
      if (!pool.length) break;
      picks.push(rng.pick(pool).id);
    }
  }
  function render(done) {
    if (el) el.remove();
    const title = kind === 'boss' ? '보스 격파' : kind === 'elite' ? '정예 격파' : kind === 'dragon' ? '용의 둥지' : '전투 승리';
    const body = [];
    body.push(resBar(run));
    if (escaped) body.push(h('div.note', `도망친 적 ${escaped}마리가 성벽을 할퀴고 갔다.`));
    if (kind === 'boss' || kind === 'dragon') body.push(h('div.note', { style: { color: 'var(--gold2)' } }, '무지개 조각을 손에 넣었다!'));
    if (picks.length && !done) {
      body.push(h('div.note', '유물 하나를 고르세요.'));
      body.push(h('div.picks', picks.map((id) => h('button.pick', { onclick: () => { addRelic(run, id, []); audio.sfxPlay('win'); render(true); } }, relicCard(id)))));
      body.push(h('div.node-go', h('button.btn', { onclick: () => render(true) }, '건너뛴다')));
    } else if (!picks.length && !done) {
      body.push(h('div.note', '전리품을 하나 고르세요.'));
      const g = 20 + run.act * 15;
      body.push(
        h('button.ev-choice', { onclick: () => { run.carry.gold += g; audio.sfxPlay('coin'); render(true); } }, h('span.t', `금화 +${g}`)),
        h('button.ev-choice', { onclick: () => { run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + 12); audio.sfxPlay('win'); render(true); } }, h('span.t', '성벽 +12')),
        h('button.ev-choice', { disabled: run.carry.stones >= 99, onclick: () => { if (rng.chance(0.5)) run.carry.stones++; else run.carry.gold += 5; audio.sfxPlay('stone'); render(true); } }, h('span.t', '전장 뒤지기'), h('small', '50% 행운석 1개 / 50% 금화 5')));
    } else {
      body.push(h('div.node-go', h('button.btn.primary', { onclick: () => finishNode(app, run) }, '지도로')));
    }
    el = frame(app, kind === 'boss' ? 'hall' : kind === 'dragon' ? 'mountain' : 'road', 'VICTORY', title, ...body);
  }
  return { enter: () => { app.bg.setMode('game'); render(false); }, exit: () => el && el.remove() };
}

// ───────── 막 전환 ─────────
export function actIntroScene(app, { run }) {
  if (run.coop && app.coop) return coopActIntroScene(app, arguments[1]);
  let el;
  return {
    enter() {
      app.bg.setMode('lobby');
      audio.play('lobby');
      const a = ACTS[run.act - 1];
      el = h('div.screen.act-intro',
        h('div.eyebrow.rise', `ACT ${['I', 'II', 'III', 'IV'][run.act - 1]}`),
        h('h1.rise', { style: { animationDelay: '.2s' } }, a.name),
        h('div.sub.rise', { style: { animationDelay: '.5s' } }, a.sub),
        h('div.note.rise', { style: { animationDelay: '.8s' } }, `막 사이 휴식: 성벽 30% 회복 (${run.carry.wall}/${run.carry.wallMax})`),
        h('button.btn.primary.rise', { style: { animationDelay: '1.1s' }, onclick: () => { audio.sfxPlay('click'); app.go('map', { run }); } }, '여정을 계속한다'));
      app.ui.appendChild(el);
    },
    exit: () => el && el.remove(),
  };
}

// ───────── 결말 ─────────
export function endingScene(app, { run, defeat, forced, noCoop }) {
  if (run.coop && app.coop && !noCoop) return coopEndingScene(app, arguments[1]);
  let el;
  function options() {
    const r = run.rep;
    const trueOk = run.shards >= 5 && (run.bonds.aila || 0) >= 5 && (run.bonds.bran || 0) >= 5 && run.stats.celestials > 0;
    const list = [
      { id: 'rebuild', t: '마왕을 물리치고 마을로 돌아간다', ok: true },
      { id: 'saint', t: '구름 수도원과 함께 마왕의 힘을 봉인한다', ok: (r.church || 0) >= 7, need: '구름 수도원 평판 7' },
      { id: 'ash', t: '들판 요정들과 마왕성을 꽃밭으로 바꾼다', ok: (r.cult || 0) >= 7, need: '들판 요정 평판 7' },
      { id: 'forest', t: '숲 동물들과 마왕성을 숲으로 돌려보낸다', ok: (r.tribe || 0) >= 7, need: '숲 동물 마을 평판 7' },
      { id: 'republic', t: '항구 상인회와 마왕성을 관광지로 만든다', ok: (r.guild || 0) >= 7, need: '항구 상인회 평판 7' },
    ];
    if (run.finalBoss === 'shadow') list.splice(1, 0, { id: 'brother', t: '마왕의 그림자 속 노아에게 손을 내민다', ok: !!run.flags.brotherBond, need: '친구와의 추억 (용사 사건)' });
    list.unshift({ id: 'dawn', t: '다섯 무지개 조각으로 다리를 놓아 저주를 끝낸다', ok: trueOk, need: '무지개 조각 5 · 바르톨과 에일라 인연 5 · 천상 유닛', hidden: !trueOk && run.shards < 3 });
    return list.filter((x) => !x.hidden);
  }
  function choose() {
    el = h('div.screen.act-intro',
      h('div.eyebrow.rise', 'THE DEMON CASTLE'),
      h('h1.rise', '마왕성 꼭대기에서'),
      h('div.sub.rise', '쓰러진 마왕 뒤로 보랏빛 왕관이 굴러다닌다. 이제 정해야 한다.'),
      h('div.end-opts.rise', { style: { animationDelay: '.4s' } }, options().map((o) => h('button.ev-choice' + (o.ok ? '' : '.locked'), { disabled: !o.ok, onclick: () => { audio.sfxPlay('click'); el.remove(); play(o.id); } }, h('span.t', o.t), o.ok ? null : h('small', o.need)))));
    app.ui.appendChild(el);
  }
  // forced가 배열이면 차례로 재생 (협동: 두 왕족의 결말)
  const queue = Array.isArray(forced) ? forced.slice() : null;
  const played = [];
  function play(id) {
    played.push(id);
    const E = ENDINGS[id];
    const lines = E.lines.filter((l) => l[0] !== '@q' || run.party.length).map((l) => [l[0] === '@q' ? run.party[0] : l[0], l[1], l[2]]).filter((l) => l[0] === 'narr' || l[0] === run.royal || CAST[l[0]]);
    let i = 0;
    const por = h('canvas.ev-por.end', { width: 32, height: 32 });
    const txt = h('div.end-text');
    const nm = h('div.ev-name');
    el = h('div.screen.ending',
      h('div.eyebrow', E.eyebrow), h('h1', `결말 ${E.no} · ${E.title}`), por, h('div.end-box', nm, txt),
      h('button.btn.primary.end-next', { onclick: step }, '다음'));
    app.ui.appendChild(el);
    step();
    function step() {
      audio.sfxPlay('page');
      if (i >= lines.length) { el.remove(); if (queue && queue.length) { play(queue.shift()); return; } summary(id); return; }
      const [who, face, text] = lines[i++];
      const p = who !== 'narr' ? portrait(who, face || 'neutral') : null;
      const g = por.getContext('2d'); g.clearRect(0, 0, 32, 32); if (p) g.drawImage(p, 0, 0);
      por.style.visibility = p ? 'visible' : 'hidden';
      nm.textContent = CAST[who] ? CAST[who].name : '';
      txt.textContent = text;
    }
  }
  function summary(id) {
    const xp = endRun(run, played[0] || id);
    // 여러 결말(협동)도 모두 기록
    { const dd = store(); dd.endings = dd.endings || []; for (const x of played) if (!dd.endings.includes(x)) dd.endings.push(x); save(); }
    for (const x of played) {
      if (!ENDINGS[x].royal) continue;
      unlockAch(x.endsWith('light') ? 'fateLight' : 'fateDark');
    }
    { const got = store().endings || []; if (['edric', 'seren', 'kyle'].every((r) => got.some((x) => x.startsWith(r + '_')))) unlockAch('fateAll'); }
    const ash = Math.round(run.act * 20 + run.stats.kills / 30 + (id === 'defeat' ? 0 : 60) + run.shards * 5);
    const d = store(); d.ash += ash; save();
    if (id !== 'defeat') {
      unlockAch('finish');
      unlockAch({ edric: 'edricWin', seren: 'serenWin', kyle: 'kyleWin' }[run.royal]);
      if (id === 'dawn') { unlockAch('trueEnd'); if (run.mascot === 'rock') unlockAch('rockEnd'); }
      if (id === 'ash') unlockAch('darkEnd');
      if (id === 'brother') unlockAch('brotherEnd');
    } else unlockAch('defeat1');
    if ((d.endings || []).length >= 8) unlockAch('allEndings');
    if (d.runs >= 10) unlockAch('runs10');
    const royal = ROYALS.find((r) => r.id === run.royal);
    el = h('div.result' + (id === 'defeat' ? '' : '.win'),
      h('div.eyebrow', ENDINGS[id].eyebrow),
      h('h1', id === 'defeat' ? 'DEFEAT' : 'THE END'),
      h('div.line', played.map((x) => `결말 ${ENDINGS[x].no} · ${ENDINGS[x].title}`).join('  ·  ')),
      h('div.stats',
        h('div', h('span', '용사'), h('span', { style: { fontFamily: 'var(--serif)' } }, royal.name)),
        h('div', h('span', '도달'), h('span', `${run.act}막`)),
        h('div', h('span', '처치'), h('span', String(run.stats.kills))),
        h('div', h('span', '유물 · 무지개 조각'), h('span', `${run.relics.length} · ${run.shards}/5`)),
        h('div', h('span', '마스코트 친밀도'), h('span', `+${xp}`)),
        h('div', h('span', '별가루'), h('span', { style: { color: 'var(--gold2)' } }, `+${ash}`))),
      h('div.btns', h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); app.go('lobby'); } }, '로비로')));
    app.ui.appendChild(el);
  }
  return {
    enter() {
      app.bg.setMode('lobby');
      audio.play('lobby');
      const royalId = !defeat && !forced ? royalEnding(run, run.royal) : null;
      if (defeat) { audio.sfxPlay('defeat'); play('defeat'); }
      else if (queue) { audio.sfxPlay('victory'); audio.play('fate'); play(queue.shift()); }
      else if (forced) { audio.sfxPlay('victory'); play(forced); }
      else if (royalId) { audio.sfxPlay('victory'); audio.play('fate'); play(royalId); } // 8장을 모두 봤으면 용사 결말이 우선
      else { audio.sfxPlay('victory'); choose(); }
    },
    exit: () => { app.ui.querySelectorAll('.result').forEach((x) => x.remove()); if (el) el.remove(); },
  };
}
