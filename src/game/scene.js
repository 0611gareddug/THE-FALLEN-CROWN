// 전투 장면: 시뮬레이션 + 렌더러 + HUD + 입력
import { Battle, PITY_MAX } from './battle.js';
import { Renderer } from '../gfx/render.js';
import { h, svg, ICON } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { store, save, markSeen } from '../core/storage.js';
import { settingsPanel } from '../ui/panels.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { UNIT, TIERS, CLASSES, CLASS_ORDER, SYNERGY, RECIPES, MAX_CELESTIAL, UPG_NAMES, upgGroup } from '../data/units.js';
import { ENEMIES, BOSS_GIMMICK_TEXT, makeBattle } from '../data/enemies.js';
import { MASCOT_DEFS } from '../data/mascots.js';
import { COMPANIONS } from '../data/companions.js';
import { RNG } from '../core/rng.js';
import { nodeOf, buildMods, runFx, mascotLevel, saveRun, ACTS, LAST_ACT } from '../run/run.js';
import { finalBoss } from '../run/flow.js';
import { tickMods } from '../run/events.js';
import { unlockAch } from '../meta/achievements.js';
import { portraitURL } from '../run/mapScene.js';
import { MirrorBattle, packField, applyInput } from '../net/mirror.js';
import { botTick } from './bot.js';
import { ROYALS } from '../data/text.js';
import { MASCOTS, TIPS, DEFEAT_LINES, VICTORY_LINES } from '../data/text.js';
import { SOLO, COOP, W, H } from './layout.js';

const TICK = 1 / 60;
const SPEEDS = [1, 1.5, 2];
// 협동에서 동료 보드 것이어도 내 화면에 그대로 보여줄 공용 이벤트
const SHARED_EV = new Set(['wave', 'waveClear', 'wallHit', 'guarded', 'freeze', 'steal', 'ashrain', 'split', 'heal', 'raise', 'enrage', 'victory', 'defeat', 'combo', 'roar', 'corrupt', 'cleanse', 'icebreak']);
const tierCol = (t) => (t === 5 ? '#ff9ad9' : TIERS[t].color);
const unitImg = (id, s = 3) => spriteURL(SPR.units[id].r, s);
// 협동 신호: [말, 표정]
const PINGS = { block: ['여기 막아줘!', 'angry'], evo: ['진화 해줘!', 'shock'], gold: ['금화 부탁!', 'sad'], ok: ['좋아!', 'happy'] };
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`; };

export function battleScene(app, params) {
  const data = store();
  const st = data.settings;
  let battle, rend, el, hud = {};
  let paused = false, acc = 0, slowmo = 0, hudT = 0, alarmT = 0, tipI = 0, tipT = 0, endT = -1;
  let selected = -1, drag = null, pop = null;
  const run = params.run || null;
  const coop = run && run.coop && app.coop ? app.coop : null;
  const me = coop ? coop.me : 0;
  const mascotId = run ? (run.players ? run.players[me].mascot : run.mascot) : params.mascot || 'puru';
  // 협동: 한 필드(아래 = 나, 위 = 동료) · 동기화
  const L = coop ? COOP : SOLO;
  const partnerP = coop ? run.players[1 - me] : null;
  let offNet = [], syncT = 0, evq = [], aiT = 0, skillAt = [-99, -99], coopDone = false, simT = 0, faceTO = 0, bubTO = 0;
  let node = null, nodeTitle = null, lastEscaped = 0, tut = null, moved = false;
  const TUT = [
    ['소환', "아래 '소환' 버튼을 3번 눌러 병사를 불러보세요.", (b) => b.stats.summons >= 3],
    ['진화', "같은 병사 3명이 모였습니다! 빛나는 칸의 유닛을 누르고 '진화 ▲'를 누르세요.", (b) => b.stats.merges >= 1],
    ['옮기기', '유닛을 끌어서 다른 칸에 놓아보세요. 근거리 유닛은 길 옆 칸이 좋아요.', () => moved],
    ['도박', "행운석 1개를 드렸어요. '도박 소환'에서 정예 도전을 눌러보세요.", (b) => b.stats.gambles >= 1],
    ['방어', '꽝이 10번 쌓이면 영웅이 확정으로 나와요. 이제 3웨이브를 버텨보세요!', (b) => b.result === 'victory'],
  ];
  function tutTick() {
    if (!tut) return;
    const s = TUT[tut.step];
    if (!s) return;
    if (!hud.coach) { hud.coach = h('div.coach'); el.appendChild(hud.coach); }
    if (tut.shown !== tut.step) { tut.shown = tut.step; hud.coach.replaceChildren(h('b', `${tut.step + 1}/5 · ${s[0]}`), h('div', s[1])); }
    if (s[2](battle)) {
      tut.step++;
      audio.sfxPlay('win');
      if (tut.step === 3) battle.stones += 1;
      if (tut.step === 4) { setTimeout(() => toast('바르톨: "이것이… 운이라는 걸세."', 'fail'), 2600); battle.timer = 3; }
    }
  }
  let speed = SPEEDS.includes(st.speed) ? st.speed : 1;

  // ───────── HUD 구성 ─────────
  function build() {
    const top = coop ? buildCoopTop() : h('div.top',
      h('div.top-row',
        hud.wave = h('div.wave', 'PREPARE'),
        hud.timer = h('div.timer', '0:06'),
        h('button.pause', { 'aria-label': '일시정지', onclick: openPause }, svg(ICON.pause))),
      h('div.bars',
        hud.field = h('div.bar.field', h('div.lbl', h('span', '필드 몬스터'), hud.fieldN = h('span', `0/${L.fieldLimit}`)), h('div.track', hud.fieldF = h('div.fill'))),
        hud.wall = h('div.bar.wall', h('div.lbl', h('span', '성벽'), hud.wallN = h('span', '100')), h('div.track', hud.wallF = h('div.fill')))),
      h('div.res',
        h('span', h('i.ic.gold'), hud.gold = h('span', '0')),
        h('span', h('i.ic.stone'), hud.stone = h('span', '0')),
        hud.evo = h('button.evo', { onclick: cycleEvo, 'aria-label': '진화 가능한 유닛 보기', title: '진화 가능한 유닛 선택' }, '▲ 진화 ', hud.evoN = h('b', '0')),
        hud.pity = h('div.pity', { title: '불운 게이지: 꽝 10번이면 영웅 확정 소환' }, '불운'),
      ),
    );
    if (coop) {
      hud.evo = h('button.evo', { onclick: cycleEvo, 'aria-label': '진화 가능한 유닛 보기', title: '진화 가능한 유닛 선택' }, '▲ 진화 ', hud.evoN = h('b', '0'));
      hud.pity = h('div.pity', { title: '불운 게이지: 꽝 10번이면 영웅 확정 소환' }, '불운');
      hud.cres = h('div.res.cres-row', hud.evo, h('button.synbtn', { onclick: () => togglePop('syn') }, '시너지'), h('span.gifthint', '유닛을 위로 끌면 선물'), hud.pity);
    }
    hud.pips = [];
    for (let i = 0; i < PITY_MAX; i++) { const p = h('i'); hud.pips.push(p); hud.pity.appendChild(p); }
    hud.pityBtn = h('button', { onclick: () => { if (battle.pity()) audio.sfxPlay('click'); } }, '영웅 확정');
    hud.pityBtn.style.display = 'none';
    hud.pity.appendChild(hud.pityBtn);

    hud.boss = h('div.bossbar', h('div.lbl', hud.bossName = h('span', ''), hud.bossT = h('span', '1:30')), h('div.track', hud.bossF = h('div.fill')));

    hud.synRows = {};
    const syn = h('div.syn', CLASS_ORDER.map((k) => {
      const pips = h('div.pips', [0, 1, 2, 3].map(() => h('i')));
      const fx = h('div.fx');
      const row = h('div.syn-row', { style: { '--cc': CLASSES[k].color } }, h('div.nm', CLASSES[k].name), pips, fx);
      hud.synRows[k] = { row, pips: [...pips.children], fx, last: -1 };
      return row;
    }));
    hud.tip = h('div.tip', TIPS[0]);
    hud.card = h('div.card');
    hud.syn = syn;
    hud.mid = h('div.mid', syn, hud.tip, hud.card);

    const m = MASCOT_DEFS[mascotId] || MASCOT_DEFS.puru;
    hud.speed = h('button.tool', { onclick: cycleSpeed, 'aria-label': '배속' }, h('span', '배속'), h('small', `×${speed}`));
    hud.skill = h('button.tool', { onclick: useSkill, 'aria-label': m.skill },
      h('img', { src: spriteURL((SPR.mascots[mascotId] || SPR.puru).r, 2), alt: '' }), hud.skillTxt = h('small', m.skill), hud.skillCd = h('div.cdfill'));
    hud.upTool = h('button.tool', { onclick: () => togglePop('upgrade') }, h('span', '강화'), h('small', 'E'));
    hud.recTool = h('button.tool', { onclick: () => togglePop('recipe') }, h('span', '천상 조합'), hud.recSmall = h('small', `0/${battle.maxCelestial}`));
    const tools = h('div.tools', hud.upTool, hud.recTool, hud.speed, hud.skill);

    hud.summon = h('button.summon', { onclick: doSummon },
      h('span.big', '소환'), hud.cost = h('span.cost', '15'));
    hud.gamble = h('button.gamble', { onclick: () => togglePop('gamble') },
      h('span.big', '도박 소환'), h('span.cost', '행운석으로 고등급 노리기'));
    const actions = h('div.actions', hud.summon, hud.gamble);

    hud.toast = h('div.toast');
    hud.popHost = h('div');
    el = h('div.hud' + (coop ? '.coop' : ''), top, hud.cres || null, hud.boss, hud.mid, tools, actions, hud.popHost, hud.toast);
    app.ui.appendChild(el);
  }

  // ───────── 협동 상단 바: 왼쪽 동료 · 가운데 정보 · 오른쪽 나 ─────────
  function buildCoopTop() {
    const my = run.players[me], pr = partnerP;
    const ry = (id) => ROYALS.find((r) => r.id === id) || ROYALS[0];
    hud.wave = h('div.wave', 'PREPARE');
    hud.timer = h('div.timer', '0:08');
    hud.field = h('div.bar.field', h('div.lbl', h('span', '몬스터'), hud.fieldN = h('span', `0/${L.fieldLimit}`)), h('div.track', hud.fieldF = h('div.fill')));
    hud.wall = h('div.bar.wall', h('div.lbl', h('span', '성벽'), hud.wallN = h('span', '100')), h('div.track', hud.wallF = h('div.fill')));
    hud.pImg = h('img', { src: portraitURL(pr.royal, 'neutral', 2), alt: '' });
    hud.pBub = h('div.cbub');
    hud.pGold = h('span', '0'); hud.pStone = h('span', '0');
    hud.pTag = h('small.ctag');
    hud.gold = h('span', '0'); hud.stone = h('span', '0');
    const partnerEl = h('button.cpor.pt', { onclick: () => togglePop('partner'), 'aria-label': '동료에게 금화 · 신호 보내기', title: '동료 메뉴 (G)' },
      h('div.cface', hud.pImg, h('i.cdot')),
      h('div.cinfo', h('b', { style: { color: ry(pr.royal).color } }, ry(pr.royal).name), h('span.cr', h('i.ic.gold'), hud.pGold, h('i.ic.stone'), hud.pStone), hud.pTag),
      hud.pBub);
    const meEl = h('div.cpor.me',
      h('div.cinfo', h('b', { style: { color: ry(my.royal).color } }, '나 · ' + ry(my.royal).name), h('span.cr', h('i.ic.gold'), hud.gold, h('i.ic.stone'), hud.stone)),
      h('div.cface', h('img', { src: portraitURL(my.royal, 'neutral', 2), alt: '' })));
    const mid = h('div.cmid',
      h('div.top-row', hud.wave, hud.timer, h('button.pause', { 'aria-label': '메뉴', onclick: openPause }, svg(ICON.pause))),
      h('div.bars', hud.field, hud.wall));
    return h('div.cbar', partnerEl, mid, meEl);
  }
  function setFace(f) {
    if (!hud.pImg) return;
    hud.pImg.src = portraitURL(partnerP.royal, f, 2);
    clearTimeout(faceTO);
    faceTO = setTimeout(() => { if (hud.pImg) hud.pImg.src = portraitURL(partnerP.royal, 'neutral', 2); }, 2600);
  }
  function bubble(text) {
    if (!hud.pBub) return;
    hud.pBub.textContent = text;
    hud.pBub.classList.remove('show'); void hud.pBub.offsetWidth; hud.pBub.classList.add('show');
    clearTimeout(bubTO);
    bubTO = setTimeout(() => hud.pBub && hud.pBub.classList.remove('show'), 2800);
  }
  const boardRing = (o, col) => rend.addFx({ k: 'ring', x: W / 2, y: L.CY[o * 18 + 8], r0: 8, r1: 120, t: 0, d: 0.9, col });
  function sendPing(k) {
    coop.net.send({ t: 'sig', k });
    audio.sfxPlay('click');
    boardRing(0, '#e8c25a');
    toast(`신호를 보냈다: "${PINGS[k][0]}"`);
    closePop();
  }
  function recvPing(k) {
    const p = PINGS[k];
    if (!p) return;
    audio.sfxPlay('ready');
    bubble(p[0]);
    setFace(p[1]);
    boardRing(1, '#6bc8ff');
  }
  function giveGold() {
    if (battle.sendGold(20)) { audio.sfxPlay('coin'); closePop(); }
    else { audio.sfxPlay('deny'); toast('금화가 부족합니다.'); }
  }

  // ───────── 동작 ─────────
  function doSummon() {
    audio.resume();
    if (!battle.summon()) {
      audio.sfxPlay('deny');
      if (!battle.hasEmpty()) toast('보드가 가득 찼습니다. 진화하거나 판매하세요.');
    }
  }
  function cycleSpeed() {
    if (coop && !coop.host) { toast('배속은 방장이 정합니다.'); return; }
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    st.speed = speed; save();
    hud.speed.lastChild.textContent = `×${speed}`;
    audio.sfxPlay('click');
  }
  let evoIdx = 0;
  function cycleEvo() {
    const cells = [];
    const seenIds = new Set();
    battle.units.forEach((u, i) => { if (i < 18 && u && battle.mergeable[i] && !seenIds.has(u.def.id)) { seenIds.add(u.def.id); cells.push(i); } });
    if (!cells.length) return;
    evoIdx = (evoIdx + 1) % cells.length;
    select(cells[evoIdx]);
    audio.sfxPlay('hover');
  }
  let prevEvo = new Set();
  function checkEvo() {
    const ids = new Set();
    battle.units.forEach((u, i) => { if (i < 18 && u && battle.mergeable[i]) ids.add(u.def.id); });
    for (const id of ids) {
      if (!prevEvo.has(id)) {
        audio.sfxPlay('ready');
        toast(`▲ ${UNIT[id].name} 3명이 모였다! 눌러서 진화하자.`, 'good');
        break;
      }
    }
    prevEvo = ids;
    hud.evoN.textContent = ids.size;
    hud.evo.classList.toggle('show', ids.size > 0);
  }
  function useSkill() {
    if (!battle.skill()) audio.sfxPlay('deny');
  }
  function select(i) {
    selected = i;
    rend.selected = i;
    renderCard();
  }

  function renderCard() {
    const c = hud.card;
    const u = selected >= 0 ? battle.units[selected] : null;
    if (!u) { c.classList.remove('show'); c.replaceChildren(); return; }
    const d = u.def;
    const theirs = coop && selected >= 18;
    const partners = theirs ? null : battle.mergePartners(selected);
    const refund = d.tier >= 5 ? 0 : u.spent ? Math.floor(u.spent * 0.5) : TIERS[d.tier].sell;
    const dps = battle.unitDmg(u) * d.rate * u.spd;
    c.replaceChildren(
      h('button.x', { onclick: () => select(-1), 'aria-label': '닫기' }, '×'),
      h('div.head',
        h('img', { src: unitImg(d.id, 3), alt: '' }),
        h('div',
          h('div.nm', { style: { color: tierCol(d.tier) } }, d.name),
          h('div.meta', h('b', { style: { color: tierCol(d.tier) } }, TIERS[d.tier].name), ` · ${CLASSES[d.cls].name} · ${d.dtype === 'p' ? '물리' : '마법'}`),
          h('div.stats', h('span', `피해 ${Math.round(battle.unitDmg(u))}`), h('span', `초당 ${Math.round(dps)}`), h('span', `사거리 ${d.range > 500 ? '∞' : Math.round(u.range / 24)}`)))),
      h('div.desc', d.desc),
      h('div.quip', `“${d.quip}”`),
      theirs ? h('div.acts', h('span', { style: { fontSize: '10.5px', color: '#8fb4ff', alignSelf: 'center' } }, '동료의 유닛 · 진화가 필요하면 신호를 보내 보자')) : h('div.acts',
        d.tier < 4 ? h('button.btn' + (partners ? '.primary' : ''), {
          disabled: !partners,
          style: partners ? null : { opacity: 0.4 },
          onclick: () => { if (battle.merge(selected)) renderCard(); },
        }, partners ? '진화 ▲' : `진화 (${countSame(d)}/3)`, h('kbd', 'F')) : null,
        d.tier === 4 ? h('span', { style: { fontSize: '10.5px', color: 'var(--dim)', alignSelf: 'center' } }, '천상 조합 재료') : null,
        d.tier < 5 ? h('button.btn', { onclick: () => { battle.sell(selected); select(-1); } }, `판매 +${refund}`, h('kbd', 'S')) : null),
    );
    c.classList.add('show');
  }
  const countSame = (d) => battle.units.filter((x, i) => i < 18 && x && x.def === d).length;

  // ───────── 팝업 (강화 · 도박 · 천상) ─────────
  function togglePop(kind) {
    audio.resume();
    audio.sfxPlay('click');
    if (pop && pop.kind === kind) { closePop(); return; }
    closePop();
    pop = { kind, el: h('div.pop') };
    hud.popHost.appendChild(pop.el);
    renderPop();
  }
  function closePop() {
    if (!pop) return;
    if (pop.kind === 'syn') hud.mid.prepend(hud.syn);
    pop.el.remove(); pop = null;
  }

  function renderPop() {
    if (!pop) return;
    const p = pop.el;
    const x = h('button.x', { onclick: closePop, 'aria-label': '닫기' }, '×');
    if (pop.kind === 'partner') {
      const pb = battle.P[1];
      p.replaceChildren(x, h('h3', '동료에게'),
        h('div.note', `동료 금화 ${pb.gold} · 행운석 ${pb.stones}${coop.partnerAI ? ' · 지금은 AI가 대신 조종 중' : ''}`),
        h('button.opt', { disabled: battle.gold < 20, onclick: giveGold }, h('div.l', '금화 보내기', h('small', '동료에게 금화 20을 건넨다')), h('div.r', '금화 20')),
        h('div.pings', Object.entries(PINGS).map(([k, [t]]) => h('button.ping', { onclick: () => sendPing(k) }, t))),
        h('div.note', '내 유닛을 끌어 위쪽 동료 보드의 빈 칸에 놓으면 선물할 수 있다.'));
      return;
    }
    if (pop.kind === 'syn') {
      if (!p.contains(hud.syn)) p.replaceChildren(x, h('h3', '내 보드 시너지'), hud.syn);
      return;
    }
    if (pop.kind === 'upgrade') {
      p.replaceChildren(x, h('h3', '강화'),
        ...[0, 1, 2].map((g) => {
          const c = battle.upgradeCost(g);
          return h('button.opt', { disabled: battle.gold < c, onclick: () => { if (battle.upgrade(g)) renderPop(); } },
            h('div.l', `${UPG_NAMES[g]}  Lv.${battle.upg[g]}`, h('small', `공격력 +${battle.upg[g] * 10}% → +${(battle.upg[g] + 1) * 10}%`)),
            h('div.r', `${c} 금화`));
        }));
    } else if (pop.kind === 'gamble') {
      const full = !battle.hasEmpty();
      const opts = [
        ['정예 도전', '성공 60% · 정예 등급', 1],
        ['영웅 도전', '성공 30% · 영웅 등급', 2],
        ['전설 도전', '성공 15% · 전설 등급', 3],
      ];
      p.replaceChildren(x, h('h3', '도박 소환'),
        h('div.note', full ? '보드가 가득 찼습니다.' : `실패하면 아무것도 나오지 않습니다. 대신 불운 게이지가 찹니다. (${battle.badLuck}/${PITY_MAX})`),
        ...opts.map(([name, sub, cost], i) =>
          h('button.opt', { disabled: battle.stones < cost || full, onclick: () => { battle.gamble(i); renderPop(); } },
            h('div.l', name, h('small', sub)), h('div.r', `행운석 ${cost}`))));
    } else if (pop.kind === 'recipe') {
      p.replaceChildren(x, h('h3', `천상 조합  ·  ${battle.celestial}/${battle.maxCelestial}`),
        ...RECIPES.map((r, i) => {
          const s = battle.recipeState(r);
          const res = UNIT[r.result];
          return h('div.recipe',
            h('img', { src: unitImg(r.result, 2), alt: '' }),
            h('div.info', h('span', { style: { color: '#ff9ad9' } }, res.name), h('small', r.mats.map((m) => UNIT[m].name).join(' + '))),
            h('div.mats', r.mats.map((m, j) => h('img' + (s.have[j] >= 0 ? '.have' : ''), { src: unitImg(m, 2), alt: '' }))),
            h('button.btn' + (s.ok ? '.primary' : ''), { disabled: !s.ok, style: s.ok ? null : { opacity: 0.35 }, onclick: () => { if (battle.craft(i)) { closePop(); select(-1); } } }, '조합'));
        }));
    }
  }

  // ───────── 알림 ─────────
  function toast(text, cls = '') {
    const d = h('div' + (cls ? '.' + cls : ''), text);
    hud.toast.replaceChildren(d);
  }
  // 천상 강림: 무지개 빛기둥 + 큰 초상 + 이름 (약 1.8초)
  function descend(id, partner) {
    const d = UNIT[id];
    const ov = h('div.descend',
      h('div.dc-beam'),
      h('div.dc-body',
        h('div.dc-eye', partner ? 'PARTNER · CELESTIAL DESCENT' : 'CELESTIAL DESCENT'),
        h('img.dc-img', { src: unitImg(id, 6), alt: '' }),
        h('div.dc-name', d.name),
        h('div.dc-desc', d.desc)));
    el.appendChild(ov);
    setTimeout(() => ov.classList.add('out'), 1700);
    setTimeout(() => ov.remove(), 2300);
  }
  function announce(text, sub, cls = '') {
    const a = h('div.announce' + (cls ? '.' + cls : ''), text, sub ? h('small', sub) : null);
    el.appendChild(a);
    setTimeout(() => a.remove(), 1900);
  }

  // ───────── 이벤트 → 소리/연출/HUD ─────────
  function onEvent(ev) {
    rend.handle(ev, battle);
    if (coop && ev.o === 1 && !SHARED_EV.has(ev.type)) { partnerEvent(ev); return; }
    switch (ev.type) {
      case 'unit':
        if (markSeen(ev.id)) {
          save();
          const n = data.seen.length;
          if (n >= 8) { data.mascots = data.mascots || ['puru']; if (!data.mascots.includes('owl')) { data.mascots.push('owl'); save(); toast('연대기 30% 달성! 마스코트 부엉박사 해금', 'good'); } }
          if (n >= 13) unlockAch('codex50');
        }
        break;
      case 'summon': audio.sfxPlay(ev.tier >= 2 ? 'rare' : 'summon', ev.tier); break;
      case 'gambleWin':
        audio.sfxPlay('rare', ev.tier);
        toast(ev.pity ? '불운의 결정! 영웅 확정 소환.' : `도박 성공! ${TIERS[ev.tier].name} 등급 소환.`, 'good');
        if (ev.pity) unlockAch('pity');
        if (ev.tier === 4 && !ev.pity) unlockAch('gamble3');
        persistLuck();
        break;
      case 'gambleFail':
        audio.sfxPlay('fail');
        toast(ev.line + (ev.consol ? `  (위로금 +${ev.consol})` : ''), 'fail');
        persistLuck();
        break;
      case 'merge':
        audio.sfxPlay('merge', ev.tier);
        if (ev.tier >= 2) setTimeout(() => audio.sfxPlay('rare', ev.tier), 120);
        if (selected === ev.cell || ev.from.includes(selected)) select(ev.cell);
        break;
      case 'celestial':
        audio.sfxPlay('celestial');
        slowmo = 1.8;
        descend(ev.id, false);
        break;
      case 'sell': audio.sfxPlay('sell'); break;
      case 'slash': case 'hit': audio.sfxPlay('hit'); break;
      case 'zap': audio.sfxPlay('zap'); break;
      case 'boom': if (ev.kind === 'meteor' || ev.kind === 'flask') audio.sfxPlay('boom'); break;
      case 'kill': audio.sfxPlay(ev.boss ? 'boom' : 'kill'); break;
      case 'stone': audio.sfxPlay('stone'); toast('행운석을 주웠다!', 'good'); break;
      case 'wave':
        if (ev.boss) {
          audio.sfxPlay('boss');
          audio.play('boss');
          announce('BOSS', ENEMIES[ev.boss].name, 'boss');
          setTimeout(() => toast(BOSS_GIMMICK_TEXT[ENEMIES[ev.boss].gimmick] || ''), 2000);
        } else {
          audio.sfxPlay('wave');
          announce(`WAVE ${ev.wave}`, ev.elite ? `정예 출현 · ${ENEMIES[ev.elite].name}` : ev.wave === 1 ? (nodeTitle || '마왕군이 몰려온다!') : null);
        }
        break;
      case 'waveClear':
        audio.sfxPlay('coin');
        toast(`웨이브 보상  금화 +${ev.gold}${ev.stone ? '  행운석 +1' : ''}${ev.heal ? `  성벽 +${ev.heal}` : ''}`);
        break;
      case 'judgment': audio.sfxPlay('judgment'); break;
      case 'timeStop': audio.sfxPlay('timestop'); break;
      case 'skill': {
        audio.sfxPlay('skill');
        const md = MASCOT_DEFS[mascotId] || MASCOT_DEFS.puru;
        let line = `${md.name}: "${md.lines[0]}" ${md.skill}!`;
        if (mascotId === 'rock') line = ev.awake ? '돌쇠: "……!" 돌의 각성!!!' : '돌쇠: "......"';
        if (mascotId === 'mimic') line = `덥석이: "덥석!" ${ev.eaten}마리 꿀꺽, 금화 +${ev.eaten * 3}`;
        if (mascotId === 'snail') line = '느릿: "빠른 등기 접수… 했…습…니…다…" (5초 후 도착)';
        toast(line, 'good');
        if (ev.awake) { slowmo = 0.8; announce('AWAKENING', '돌의 각성'); }
        break;
      }
      case 'wallHit': {
        audio.sfxPlay('wall');
        const bn = battle.boss ? battle.boss.def.name.split(' ').pop() : '';
        if (ev.why === 'bossLap') toast(`${bn}이(가) 성벽을 들이받았다! 성벽 -15`);
        if (ev.why === 'timeout') toast(`${bn}이(가) 분노했다! 성벽 -25`);
        if (ev.why === 'escape') toast(`도망친 적들이 성벽을 할퀴었다! 성벽 -${Math.round(ev.v)}`);
        if (ev.why === 'curse') toast('짝퉁 마왕 왕관이 성벽을 갉아먹는다… 성벽 -1');
        break;
      }
      case 'guarded': toast('바르톨: "이 늙은 몸이 막겠네!" 피해 절반', 'good'); break;
      case 'corrupt': audio.sfxPlay('fail'); toast(`먹물수염이 ${battle.units[ev.cell] ? battle.units[ev.cell].def.name : '유닛'}에게 먹물을 뿌렸다! 여러 번 눌러 닦아 주자!`); break;
      case 'cleanse': audio.sfxPlay(ev.done ? 'win' : 'hover'); break;
      case 'freeze': audio.sfxPlay(ev.kind === 'thunder' ? 'boom' : 'timestop'); toast(ev.kind === 'thunder' ? '천둥 그리핀의 번개! 한 줄이 마비됐다. 눌러서 깨워 주자!' : '실바나의 숨결! 한 줄이 얼어붙었다. 눌러서 얼음을 깨자!'); break;
      case 'transform': audio.sfxPlay('boss'); audio.play('boss'); slowmo = 1.2; announce('TRUE FORM', ENEMIES[ev.id].name, 'boss'); setTimeout(() => toast(BOSS_GIMMICK_TEXT[ENEMIES[ev.id].gimmick] || ''), 1800); break;
      case 'icebreak': audio.sfxPlay(ev.done ? 'win' : 'hit'); break;
      case 'steal': audio.sfxPlay('coin'); toast(`마왕이 금화 ${ev.v}을(를) 빼앗아 갔다!`); break;
      case 'ashrain': audio.sfxPlay('wall'); toast('어둠의 비가 내린다! 공격 속도 -35% (5초)'); break;
      case 'split': audio.sfxPlay('boss'); toast('그림자가 분열했다! 분신을 먼저 쓰러뜨려야 본체에 피해가 들어간다.'); break;
      case 'heal': audio.sfxPlay('upgrade'); break;
      case 'raise': audio.sfxPlay('boss'); break;
      case 'enrage': toast('늑대인간이 광폭화했다!'); break;
      case 'eliteDown': audio.sfxPlay('win'); toast('정예 처치! 금화 +30, 행운석 +1', 'good'); break;
      case 'delivered': toast('느릿: "등기… 도착…했습니다…"', 'good'); break;
      case 'summonZero': audio.sfxPlay('fail'); toast('무한 가챠 부적: 0명 소환. 금화만 사라졌다.', 'fail'); unlockAch('zero'); break;
      case 'upgrade': audio.sfxPlay('upgrade'); break;
      case 'victory': lastEscaped = ev.escaped || 0; if (!coop) endT = 1.6; else { audio.sfxPlay('victory'); announce('VICTORY', '함께 지켜냈다'); } break;
      case 'defeat': if (!coop) endT = 1.6; else { audio.sfxPlay('defeat'); announce('DEFEAT', '성벽이 무너졌다', 'boss'); } break;
      case 'combo': audio.sfxPlay('celestial'); announce('COMBO', '우정의 응원! 두 보드 공격 속도 +30%'); break;
      case 'gift': audio.sfxPlay('upgrade'); toast(`${UNIT[ev.id].name}을(를) 동료에게 선물했다.`, 'good'); break;
      case 'giftFull': audio.sfxPlay('deny'); toast('동료의 천상 자리가 가득 찼습니다.'); break;
      case 'sendGold': toast(`동료에게 금화 ${ev.v}을(를) 보냈다.`, 'good'); break;
      case 'gambleWin2': break;
    }
  }

  // 동료 보드에서 일어난 일: 소리 · 짧은 알림만
  function partnerEvent(ev) {
    switch (ev.type) {
      case 'slash': case 'hit': audio.sfxPlay('hit'); break;
      case 'zap': audio.sfxPlay('zap'); break;
      case 'kill': audio.sfxPlay(ev.boss ? 'boom' : 'kill'); break;
      case 'boom': if (ev.kind === 'meteor' || ev.kind === 'flask') audio.sfxPlay('boom'); break;
      case 'judgment': audio.sfxPlay('judgment'); break;
      case 'timeStop': audio.sfxPlay('timestop'); break;
      case 'celestial': audio.sfxPlay('celestial'); descend(ev.id, true); setFace('happy'); break;
      case 'gambleWin': if (ev.tier >= 3) { audio.sfxPlay('rare', ev.tier); bubble(`${TIERS[ev.tier].name} 떴다!`); setFace('smug'); } break;
      case 'skill': audio.sfxPlay('skill'); bubble(`${(MASCOT_DEFS[partnerP.mascot] || MASCOT_DEFS.puru).skill.split(' / ')[0]}!`); break;
      case 'gift': audio.sfxPlay('rare', 2); toast(`동료가 ${UNIT[ev.id].name}을(를) 선물했다!`, 'good'); setFace('happy'); select(-1); break;
      case 'sendGold': audio.sfxPlay('coin'); toast(`동료가 금화 ${ev.v}을(를) 보냈다!`, 'good'); setFace('happy'); break;
      case 'eliteDown': audio.sfxPlay('win'); break;
    }
  }

  function persistLuck() { if (coop && !coop.host) return; data.badLuck = battle.badLuck; save(); }

  // ───────── HUD 갱신 (초당 10회) ─────────
  function updateHud() {
    const b = battle;
    if (b.phase === 'prep') { hud.wave.textContent = 'PREPARE'; hud.timer.textContent = b.timer > 99 ? '준비 중' : fmtT(b.timer); hud.timer.className = 'timer rest'; }
    else {
      hud.wave.replaceChildren('WAVE ', h('b', String(b.wave)), ` / ${b.nWaves}`);
      const t = b.phase === 'rest' ? b.timer : b.phase === 'leftover' ? b.leftT : b.bossInfo() ? b.bossT : Math.max(0, 20 - b.waveT);
      hud.timer.textContent = fmtT(t);
      hud.timer.className = 'timer' + (b.phase === 'rest' ? ' rest' : '');
    }
    const n = b.liveCount();
    const FL = L.fieldLimit;
    hud.fieldN.textContent = `${n}/${FL}`;
    hud.fieldF.style.width = Math.min(100, (n / FL) * 100) + '%';
    hud.field.classList.toggle('warn', n >= FL * 0.7 && n <= FL);
    hud.field.classList.toggle('danger', n > FL);
    if (coop) {
      const pb = b.P[1];
      hud.pGold.textContent = pb.gold;
      hud.pStone.textContent = pb.stones;
      hud.pTag.textContent = coop.partnerAI ? 'AI가 대신 조종' : pb.skillT >= pb.skillCd && b.phase !== 'prep' ? '스킬 준비됨' : '';
    }
    hud.wallN.textContent = `${Math.ceil(b.wall)}/${b.wallMax}`;
    hud.wallF.style.width = (b.wall / b.wallMax) * 100 + '%';
    hud.wall.classList.toggle('low', b.wall < b.wallMax * 0.3);
    hud.gold.textContent = b.gold;
    hud.stone.textContent = b.stones;
    hud.pips.forEach((p, i) => p.classList.toggle('on', i < b.badLuck));
    const full = b.badLuck >= PITY_MAX;
    hud.pity.classList.toggle('full', full);
    hud.pityBtn.style.display = full ? '' : 'none';

    checkEvo();
    const cost = b.summonCost();
    hud.cost.textContent = `금화 ${cost}`;
    hud.summon.disabled = b.gold < cost || !b.hasEmpty();
    hud.gamble.disabled = b.stones < 1 && !pop;
    const ready = b.skillT >= b.skillCd && b.phase !== 'prep';
    hud.skill.classList.toggle('ready', ready);
    hud.skillCd.style.width = (b.skillT / b.skillCd) * 100 + '%';
    hud.skillTxt.textContent = ready ? (MASCOT_DEFS[mascotId] || MASCOT_DEFS.puru).skill.split(' / ')[0] + '!' : `${Math.ceil(b.skillCd - b.skillT)}초`;
    hud.recSmall.textContent = `${b.celestial}/${b.maxCelestial}`;
    hud.recTool.classList.toggle('hot', RECIPES.some((r) => b.recipeState(r).ok));
    hud.upTool.classList.toggle('hot', [0, 1, 2].some((g) => b.gold >= b.upgradeCost(g) && b.gold > cost * 3));

    const boss = b.boss && b.boss.alive;
    hud.boss.style.display = boss ? 'block' : 'none';
    hud.mid.classList.toggle('boss', !!boss);
    if (boss) {
      hud.bossF.style.width = (b.boss.hp / b.boss.maxHp) * 100 + '%';
      hud.bossT.textContent = (b.boss.shield ? '무적 · ' : '') + fmtT(b.bossT);
      hud.bossName.textContent = b.boss.def.name;
    }

    for (const k of CLASS_ORDER) {
      const r = hud.synRows[k];
      const c = b.syn[k];
      if (r.last === c) continue;
      r.last = c;
      const tiers = SYNERGY[k];
      r.pips.forEach((p, i) => { p.style.display = i < tiers[tiers.length - 1].n ? '' : 'none'; p.classList.toggle('on', i < c); });
      const active = tiers.filter((t) => c >= t.n);
      const next = tiers.find((t) => c < t.n);
      r.row.classList.toggle('act', active.length > 0);
      r.fx.replaceChildren(
        active.length ? active[active.length - 1].text : '',
        next ? h('em', `${active.length ? '  ·  ' : ''}${next.n}종: ${next.text}`) : '',
      );
    }
    if (pop) renderPop();
    if (selected >= 0 && !b.units[selected]) select(-1);
  }

  // ───────── 입력 ─────────
  function toLogical(e) {
    const r = app.gameCv.getBoundingClientRect();
    const v = rend.view;
    return [v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h];
  }
  function onDown(e) {
    audio.resume();
    if (paused || battle.result) return;
    const [x, y] = toLogical(e);
    const c = L.cellAt(x, y);
    if (coop && c >= 18 && battle.units[c]) {
      // 동료 유닛: 끌 수는 없고, 정화/얼음 깨기로 도울 수 있다
      const u = battle.units[c];
      if (u.corrupt > 0 || u.ice > 0) { battle.cleanse(c); rend.burst(...cellCenter(c), 6, u.corrupt > 0 ? ['#c99bff', '#ffffff'] : ['#a8e4ff', '#ffffff'], 60, 0.3); return; }
      audio.sfxPlay('hover');
      select(selected === c ? -1 : c);
      return;
    }
    if (c >= 0 && battle.units[c]) {
      drag = { from: c, sx: x, sy: y, x, y, moved: false, over: c, id: e.pointerId };
      app.gameCv.setPointerCapture(e.pointerId);
      rend.drag = drag;
    } else if (coop ? y > 56 && y < 440 : y > 90 && y < 300) {
      select(-1);
      closePop();
    }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = toLogical(e);
    drag.x = x; drag.y = y;
    if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 7) drag.moved = true;
    drag.over = L.cellAt(x, y);
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    rend.drag = null;
    if (d.moved) {
      if (d.over >= 0 && d.over !== d.from) {
        if (coop && d.over >= 18) {
          if (battle.units[d.over]) { audio.sfxPlay('deny'); toast('동료 보드의 빈 칸에만 선물할 수 있어요.'); return; }
          battle.move(d.from, d.over);
          select(-1);
          return;
        }
        battle.move(d.from, d.over);
        moved = true;
        audio.sfxPlay('hover');
        select(d.over);
      }
    } else {
      const u = battle.units[d.from];
      if (u && (u.corrupt > 0 || u.ice > 0)) { battle.cleanse(d.from); rend.burst(...cellCenter(d.from), 6, u.corrupt > 0 ? ['#c99bff', '#ffffff'] : ['#a8e4ff', '#ffffff'], 60, 0.3); return; }
      audio.sfxPlay('hover');
      select(selected === d.from ? -1 : d.from);
    }
  }
  function cellCenter(i) { return [L.cx(i), L.cy(i)]; }
  function onKey(e) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (pop) closePop(); else openPause(); return; }
    if (paused || battle.result) return;
    if (k === 'q') doSummon();
    else if (k === 'w') togglePop('gamble');
    else if (k === 'e') togglePop('upgrade');
    else if (k === 'r') useSkill();
    else if (k === ' ') { e.preventDefault(); cycleSpeed(); }
    else if (k === 'g' && coop) togglePop('partner');
    else if (k === 't') togglePop('recipe');
    else if (k === 's') sellSel();
    else if (k === 'f') mergeSel();
  }
  // 선택한 유닛: S 판매 (영웅 이상은 두 번), F 진화
  let sellArm = null;
  function sellSel() {
    const u = selected >= 0 ? battle.units[selected] : null;
    if (!u) { toast('먼저 유닛을 눌러 선택하세요. (S 판매 · F 진화)'); return; }
    if (coop && selected >= 18) { audio.sfxPlay('deny'); toast('동료의 유닛은 팔 수 없어요.'); return; }
    if (u.def.tier >= 5) { audio.sfxPlay('deny'); toast('천상 유닛은 팔 수 없어요.'); return; }
    const refund = u.spent ? Math.floor(u.spent * 0.5) : TIERS[u.def.tier].sell;
    if (u.def.tier >= 3 && !(sellArm && sellArm.uid === u.uid && performance.now() - sellArm.t < 2500)) {
      sellArm = { uid: u.uid, t: performance.now() };
      audio.sfxPlay('hover');
      toast(`${TIERS[u.def.tier].name} ${u.def.name} — S를 한 번 더 누르면 판매 (+${refund})`);
      return;
    }
    sellArm = null;
    battle.sell(selected);
    select(-1);
  }
  function mergeSel() {
    const u = selected >= 0 ? battle.units[selected] : null;
    if (!u) { toast('먼저 유닛을 눌러 선택하세요. (S 판매 · F 진화)'); return; }
    if (coop && selected >= 18) { audio.sfxPlay('deny'); toast('동료의 유닛은 진화시킬 수 없어요. 신호로 부탁해 보세요.'); return; }
    if (u.def.tier >= 4) { audio.sfxPlay('deny'); toast(u.def.tier === 4 ? '전설은 진화 대신 천상 조합 재료로 쓰여요. (T)' : '천상은 최고 등급이에요.'); return; }
    if (!battle.mergePartners(selected)) { audio.sfxPlay('deny'); toast(`같은 유닛 ${countSame(u.def)}/3 — 3명이 모이면 진화할 수 있어요.`); return; }
    if (battle.merge(selected)) renderCard();
  }

  // ───────── 일시정지 · 결과 ─────────
  let pauseEl = null;
  function openPause() {
    if (battle.result || pauseEl) return;
    paused = !coop;
    audio.sfxPlay('click');
    pauseEl = h('div.sheet', h('div.panel', { style: { textAlign: 'center' } },
      h('h2', coop ? 'MENU' : 'PAUSED'),
      coop ? h('div.note', '협동 중에는 전투가 멈추지 않습니다.') : null,
      h('div.sub', `웨이브 ${battle.wave} · 성벽 ${Math.ceil(battle.wall)}`),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('button.btn.primary', { onclick: closePause }, '계속하기'),
        h('button.btn', { onclick: () => settingsPanel(app.ui, app) }, '설정'),
        run && !coop ? h('button.btn', { onclick: () => { closePause(); app.go('lobby'); } }, '로비로 (이 전투는 처음부터)') : null,
        coop ? h('button.btn.danger', { onclick: () => { closePause(); app.go('lobby'); } }, '협동 나가기') : h('button.btn.danger', { onclick: () => { closePause(); if (run) { battle.result = 'defeat'; finishRun(false); } else finish(true); } }, run ? '여정 포기' : '포기하고 로비로'))));
    app.ui.appendChild(pauseEl);
  }
  function closePause() {
    if (pauseEl) { pauseEl.remove(); pauseEl = null; }
    paused = false;
    audio.sfxPlay('click');
  }
  app.pauseHook = () => { if (!battle.result) openPause(); };

  function finishRun(win) {
    if (coop && !coop.host) return;
    const b = battle;
    if (coop) {
      for (let o = 0; o < 2; o++) run.players[o].carry = b.exportCarry(o);
      run.carry = run.players[0].carry;
    }
    data.badLuck = b.badLuck;
    data.tips = true;
    save();
    const s = run.stats;
    const tot = (k) => (coop ? b.totalStat(k) : b.stats[k]);
    s.kills += tot('kills'); s.merges += tot('merges'); s.celestials += tot('celestials'); s.fails += tot('fails'); s.gambles += tot('gambles');
    if (!win) { audio.stop(); app.go('ending', { run, defeat: true }); return; }
    if (!coop) run.carry = b.exportCarry();
    s.battles++;
    if (b.freeSummon === 0) run.firstFree = 0;
    const kind = node.type;
    tickMods(run, kind === 'boss' || kind === 'dragon');
    if (kind === 'boss' && run.act < LAST_ACT) { if (run.act <= 2) { run.shards = Math.min(5, run.shards + 1); unlockAch(run.act === 1 ? 'act1' : 'act2'); } }
    if (kind === 'dragon') { run.shards = Math.min(5, run.shards + 1); unlockAch('dragonKill'); }
    if (b.wall <= 5) unlockAch('wall1');
    if (b.stats.maxField >= (coop ? 170 : 120)) unlockAch('overflow');
    if (b.stats.celestials > 0 || s.celestials > 0) unlockAch('cel1');
    if (b.celestial >= 2) unlockAch('cel2');
    if (s.fails >= 10) unlockAch('fail10');
    if (run.shards >= 5) unlockAch('shards5');
    if (run.relics.length >= 10) unlockAch('relic10');
    if (!coop) saveRun(run);
    audio.stop();
    if (kind === 'boss' && run.act === LAST_ACT) { app.go('ending', { run }); return; }
    app.go('reward', { run, kind, escaped: lastEscaped });
  }

  function finish(quit) {
    if (run) { finishRun(battle.result === 'victory'); return; }
    if (tut) {
      if (battle.result === 'victory') { data.prologue = true; save(); audio.stop(); app.go('prologue', { part: 2 }); }
      else { audio.stop(); app.go('prologue', { part: 3 }); }
      return;
    }
    const b = battle;
    const win = b.result === 'victory';
    const ash = quit ? Math.floor(b.ashReward() / 2) : b.ashReward();
    data.ash += ash;
    data.runs++;
    if (win) data.wins++;
    data.bestWave = Math.max(data.bestWave, b.wave);
    data.badLuck = b.badLuck;
    data.tips = true;
    save();
    if (quit) { app.go('lobby'); return; }
    audio.stop();
    audio.sfxPlay(win ? 'victory' : 'defeat');
    let best = null;
    for (const u of b.units) if (u && (!best || u.dealt > best.dealt)) best = u;
    const lines = win ? VICTORY_LINES : DEFEAT_LINES;
    const res = h('div.result' + (win ? '.win' : ''),
      h('div.eyebrow', win ? 'THE GIANT FALLS' : 'THE WALLS CRUMBLE'),
      h('h1', win ? 'VICTORY' : 'DEFEAT'),
      h('div.line', lines[(Math.random() * lines.length) | 0]),
      h('div.stats',
        h('div', h('span', '도달 웨이브'), h('span', `${b.wave} / ${b.nWaves}`)),
        h('div', h('span', '처치'), h('span', String(b.stats.kills))),
        h('div', h('span', '소환 / 진화'), h('span', `${b.stats.summons} / ${b.stats.merges}`)),
        h('div', h('span', '도박 꽝'), h('span', `${b.stats.fails} / ${b.stats.gambles}`)),
        best ? h('div', h('span', '최고의 일꾼'), h('span', { style: { color: tierCol(best.def.tier), fontFamily: 'var(--serif)' } }, best.def.name)) : null,
        h('div', h('span', '별가루'), h('span', { style: { color: 'var(--gold2)' } }, `+${ash}`))),
      h('div.btns',
        h('button.btn', { onclick: () => { audio.sfxPlay('click'); app.go('lobby'); } }, '로비로'),
        h('button.btn.primary', { onclick: () => { audio.sfxPlay('click'); app.go('battle', params); } }, '다시 도전')));
    app.ui.appendChild(res);
  }

  // ───────── 수명 주기 ─────────
  function enter() {
    if (run) {
      node = nodeOf(run, params.nodeId);
      const rng = new RNG(run.seed * 13 + [...node.id].reduce((a, c) => a * 7 + c.charCodeAt(0), 1) % 100000);
      let kind = node.type === 'dragon' ? 'boss' : node.type;
      let bossId = null;
      if (node.type === 'boss') bossId = run.act < LAST_ACT ? ACTS[run.act - 1].boss : (run.finalBoss = finalBoss(run));
      if (node.type === 'dragon') bossId = 'silvana';
      const cfg = makeBattle(rng, run.act, node.row, kind, bossId);
      const mods = buildMods(run);
      mods.morvenWeak = runFx(run).morvenWeak;
      nodeTitle = node.type === 'elite' ? '정예의 길' : node.type === 'boss' ? null : `${ACTS[run.act - 1].name} · ${node.row + 1}번째 별`;
      if (coop) {
        const seed = rng.int(1e9);
        const P = run.players;
        if (coop.host) {
          const lv = run.mascotLv || [1, 1];
          battle = new Battle({
            seed, layout: COOP, node: cfg, mods,
            players: P.map((p, o) => ({ royal: p.royal, mascot: p.mascot, carry: p.carry, badLuck: o === 0 ? data.badLuck : 0, mascotLv: lv[o] })),
          });
          offNet.push(coop.net.on('in', (m) => { if (!coop.partnerAI) applyInput(battle, m); }));
        } else {
          battle = new MirrorBattle((m) => coop.net.send(m));
          battle.P[0].mascot = P[me].mascot; battle.P[0].royal = P[me].royal;
          battle.P[1].mascot = P[1 - me].mascot; battle.P[1].royal = P[1 - me].royal;
          offNet.push(coop.net.on('bs', (m) => battle.apply(m.s, performance.now())));
        }
        offNet.push(coop.net.on('sig', (m) => recvPing(m.k)));
      } else battle = new Battle({ seed: rng.int(1e9), royal: run.royal, mascot: mascotId, badLuck: data.badLuck, carry: run.carry, node: cfg, mods, mascotLv: mascotLevel(mascotId) });
    } else if (params.tutorial) {
      battle = new Battle({ royal: 'edric', mascot: 'puru', badLuck: 0, node: { L: 1, kind: 'battle', waves: [[['skel', 10]], [['skel', 8], ['rat', 8]], [['bat', 4], ['skel', 10]]] } });
      battle.timer = 9999;
      battle.forceUnit = 'spear'; battle.forceN = 3; battle.forceFail = 1;
      battle.gold = 80;
      tut = { step: 0 };
    } else battle = new Battle({ royal: params.royal, mascot: mascotId, badLuck: data.badLuck, mascotLv: mascotLevel(mascotId) });
    rend = new Renderer(app.gameCv, st, L);
    if (coop) {
      if (!coop.host) rend.setMirror(true);
      document.body.classList.add('coopb');
    }
    resize();
    app.gameCv.style.display = 'block';
    app.bg.setMode('game');
    audio.play('battle');
    build();
    app.gameCv.addEventListener('pointerdown', onDown);
    app.gameCv.addEventListener('pointermove', onMove);
    app.gameCv.addEventListener('pointerup', onUp);
    app.gameCv.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    const royal = run ? (run.players ? run.players[me].royal : run.royal) : params.royal || 'edric';
    toast(royal === 'kyle' ? '피크: "싸우기 전에 간식부터 확인하자."' : royal === 'seren' ? '미나: "주문서 챙겼어! 아, 이건 요리책이다."' : '레오: "바, 방패 준비 완료! 아마도!"');
  }
  function exit() {
    app.gameCv.removeEventListener('pointerdown', onDown);
    app.gameCv.removeEventListener('pointermove', onMove);
    app.gameCv.removeEventListener('pointerup', onUp);
    app.gameCv.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey);
    app.gameCv.style.display = 'none';
    app.pauseHook = null;
    offNet.forEach((f) => f());
    document.body.classList.remove('coopb');
    clearTimeout(faceTO); clearTimeout(bubTO);
    if (el) el.remove();
    if (pauseEl) pauseEl.remove();
    app.ui.querySelectorAll('.result, .sheet').forEach((x) => x.remove());
  }
  const LAND_VIEW = { x: 0, y: 80, w: W, h: 228 };
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const view = app.land ? (coop ? COOP.landView : LAND_VIEW) : null;
    const zoom = app.land ? (coop ? 488 : 630) / view.w : 1;
    let s = Math.ceil(app.scale * zoom * dpr);
    s = Math.max(1, Math.min(st.low ? 3 : 6, s));
    rend.resize(s, view);
  }

  // ── 협동 프레임: 방장이 필드 하나를 돌리고 참가자에게 보낸다 ──
  function coopFrame(dt) {
    const now = performance.now();
    if (coop.host) {
      if (!coopDone) {
        simT += dt * speed;
        let n = 0;
        while (simT >= TICK && n < 10) { battle.tick(TICK); simT -= TICK; n++; }
        if (n === 10) simT = 0;
        if (coop.partnerAI) { aiT += dt; if (aiT > 0.5) { aiT = 0; battle.cur = 1; botTick(battle, battle.time); battle.cur = 0; } }
        // 마스코트 합동: 3초 안에 둘 다 스킬을 쓰면 우정의 응원
        for (const e of battle.events) if (e.type === 'skill') skillAt[e.o] = battle.time;
        if (skillAt[0] > 0 && skillAt[1] > 0 && Math.abs(skillAt[0] - skillAt[1]) < 3) {
          skillAt = [-99, -99];
          for (const P of battle.P) P.cheerT = Math.max(P.cheerT, 5);
          battle.emit('combo', {});
        }
        for (const e of battle.events) evq.push(e);
        if (battle.result) {
          coopDone = true;
          setTimeout(() => finishRun(battle.result === 'victory'), 2200);
        }
      }
      syncT += dt;
      if (syncT >= 0.08) {
        syncT = 0;
        coop.net.send({ t: 'bs', s: packField(battle, evq) });
        evq = [];
      }
    } else battle.interp(now);
    const evs = battle.events;
    for (let i = 0; i < evs.length; i++) onEvent(evs[i]);
    evs.length = 0;
    rend.draw(battle, dt);
  }

  function frame(dt) {
    if (coop) coopFrame(dt);
    else if (!paused && !battle.result) {
      let sdt = dt * speed;
      if (slowmo > 0) { slowmo -= dt; sdt *= 0.3; }
      acc += sdt;
      let n = 0;
      while (acc >= TICK && n < 10) { battle.tick(TICK); acc -= TICK; n++; }
      if (n === 10) acc = 0;
    }
    if (!coop) {
      const evs = battle.events;
      for (let i = 0; i < evs.length; i++) onEvent(evs[i]);
      evs.length = 0;
      rend.draw(battle, paused ? 0 : dt * (slowmo > 0 ? 0.4 : 1));
    }

    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.1;
      updateHud();
    }
    if (battle.overflow && !paused) {
      alarmT -= dt;
      if (alarmT <= 0) { alarmT = 2; audio.sfxPlay('alarm'); }
    }
    tipT += dt;
    if (tipT > 9) {
      tipT = 0;
      tipI = (tipI + 1) % TIPS.length;
      // 동료가 있으면 팁 대신 가끔 참견한다
      if (run && run.party.length && tipI % 2 === 1 && !paused) {
        const id = run.party[(tipI >> 1) % run.party.length];
        const c = COMPANIONS[id];
        hud.tip.replaceChildren(h('img.tip-por', { src: portraitURL(id, 'neutral'), alt: '' }), h('b', { style: { color: c.color } }, c.name + ' '), c.quips[(tipI * 7 + battle.wave) % c.quips.length]);
      } else hud.tip.textContent = TIPS[tipI];
    }
    tutTick();
    if (endT > 0) { endT -= dt; if (endT <= 0) { endT = -1; finish(false); } }
  }

  return { enter, exit, frame, resize, get battle() { return battle; }, select, get speed() { return speed; }, set speed(v) { speed = v; } };
}
