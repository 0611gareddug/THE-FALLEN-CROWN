// 협동 세션 (2~4인): 방장이 여정 상태를 쥐고, 참가자 화면을 함께 넘긴다.
// 투표: 다수결 (동점이면 무작위) · 연결 상태 · 나간 사람 자리는 AI가 맡는다.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { relinkRun } from '../run/run.js';
import { RNG } from '../core/rng.js';
import { ROYALS } from '../data/text.js';
import { SPR, spriteURL } from '../gfx/sprites.js';
import { Chat } from './chat.js';
import { cleanNick } from './nick.js';

export const PROTO = 2;
export const VOTE_SEC = 20; // 협동 투표 제한 시간(초)
const SYNC_SCENES = new Set(['map', 'event', 'shop', 'camp', 'treasure', 'altar', 'minigame', 'reward', 'actIntro', 'ending', 'battle', 'coopSelect']);
// 참가자가 보낸 메시지 중 다른 참가자도 봐야 하는 것 (방장이 대신 전달)
const RELAY = new Set(['vote', 'vopen', 'pick', 'sig', 'mgs', 'gsend']);
// 모두 선택지에 도착하지 않아도 이 시간이 지나면 투표 시간을 시작한다 (멈춤 방지)
const ARRIVE_MAX = 60;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export class Coop {
  constructor(app, net) {
    this.app = app;
    this.net = net;
    this.role = net.role;
    this.me = this.role === 'host' ? 0 : net.slot || 1;
    this.run = null;
    this.votes = {};
    this.open = {};
    this.decided = {};
    this.decidedX = {}; // 결정과 함께 온 결과 정보 (늦게 도착한 사람도 같은 정보를 받는다)
    this.waiters = {};
    this.seen = {}; // 투표 키 → 선택지에 도착한 자리들
    this.preTime = {}; // 투표를 열기 전에 받은 시간 시작 신호
    this.ai = new Set(); // AI가 맡은 자리
    this.lastGo = null;
    this.handlers = [];
    this.picks = {}; // 자리 번호 → { royal, mascot, ready, lv }
    this.seats = this.host ? [0] : [0, this.me]; // 로비에 있는 자리들
    this.rng = new RNG((Math.random() * 1e9) | 0);
    const origGo = app.go.bind(app);
    this.origGo = origGo;
    app.go = (name, params = {}) => this.go(name, params);
    this.hook('go', (m) => this.onGo(m));
    this.hook('run', (m) => this.onRunMsg(m));
    this.hook('vote', (m) => this.onVote(m));
    this.hook('decided', (m) => this.onDecided(m));
    this.hook('vtime', (m) => this.onVTime(m));
    this.hook('vopen', (m) => this.onVOpen(m));
    this.hook('resync', (m) => this.onResync(m));
    this.hook('pick', (m) => { if (m.p && m.p.nick) m.p.nick = cleanNick(m.p.nick); this.picks[m.who !== undefined ? m.who : m.from] = m.p; this.emitLocal('picks'); });
    this.hook('seats', (m) => { if (!this.host) { this.seats = m.seats; this.picks = m.picks || this.picks; this.emitLocal('picks'); } });
    this.hook('_status', (m) => this.onStatus(m));
    this.hook('reseat', (m) => { this.me = m.slot; this.net.slot = m.slot; });
    this.hook('bye', (m) => this.seatLeft(this.host ? m.from : 0, true));
    // 방장: 참가자끼리 봐야 하는 메시지를 다른 참가자에게 전달
    if (this.host) for (const t of RELAY) this.hook(t, (m) => this.net.send(m, m.from));
    this.chip = h('div.coop-chip');
    document.getElementById('stage').appendChild(this.chip);
    this.chipTimer = setInterval(() => this.updateChip(), 1000);
    this.updateChip();
    this.chat = new Chat(this);
    // 협동 중에는 휴대폰 화면이 저절로 꺼지지 않게 한다 (꺼지면 연결이 멈춘다)
    this.wake = null;
    this.keepAwake = () => {
      if (document.visibilityState !== 'visible' || this.wake || !navigator.wakeLock) return;
      navigator.wakeLock.request('screen').then((w) => { this.wake = w; w.addEventListener('release', () => { if (this.wake === w) this.wake = null; }); }).catch(() => {});
    };
    this.onVisWake = () => this.keepAwake();
    document.addEventListener('visibilitychange', this.onVisWake);
    this.keepAwake();
  }

  hook(t, fn) { this.handlers.push(this.net.on(t, fn)); }
  listeners = {};
  onLocal(t, fn) { (this.listeners[t] = this.listeners[t] || new Set()).add(fn); return () => this.listeners[t].delete(fn); }
  emitLocal(t, d) { if (this.listeners[t]) for (const f of [...this.listeners[t]]) f(d); }

  get host() { return this.role === 'host'; }
  // 인원 (여정이 시작되면 여정 기준)
  get n() { return this.run && this.run.players ? this.run.players.length : this.seats.length; }
  get others() { const out = []; for (let i = 0; i < this.n; i++) if (i !== this.me) out.push(i); return out; }
  // 하위 호환: 2인일 때의 상대
  get partner() { return this.others[0]; }
  get partnerAI() { return this.ai.size > 0; }
  get partnerName() { return this.n > 2 ? '동료들' : this.nameOf(this.partner); }
  // '레오(닉네임)' — 닉네임이 없으면 영웅 이름만
  nameOf(i) {
    const p = this.run && this.run.players ? this.run.players[i] : this.picks[i];
    const r = p && ROYALS.find((x) => x.id === p.royal);
    const nk = p && p.nick ? cleanNick(p.nick) : '';
    if (r) return nk ? `${r.name}(${nk})` : r.name;
    return nk || (i === 0 ? '방장' : `동료 ${i}`);
  }
  colorOf(i) {
    const p = this.run && this.run.players ? this.run.players[i] : this.picks[i];
    const r = p && ROYALS.find((x) => x.id === p.royal);
    return r ? r.color : '#9fc8ff';
  }
  // 지금 사람이 직접 조종하는 자리 (방장 기준)
  human(i) { return i === 0 || (this.net.isOpen && this.net.isOpen(i) && !this.ai.has(i)); }
  activeVoters() {
    if (!this.host) return [];
    const out = [];
    for (let i = 0; i < this.n; i++) if (this.human(i)) out.push(i);
    return out;
  }

  // ── 화면 전환 (방장이 결정, 참가자는 따라간다) ──
  go(name, params = {}) {
    if (!SYNC_SCENES.has(name)) { if (name === 'lobby') this.leave(true); this.origGo(name, params); return; }
    if (this.host) {
      const p = { ...params };
      delete p.run;
      if (params.run) { this.run = params.run; this.sendRun(); }
      this.lastGo = { name, p };
      this.net.send({ t: 'go', name, p });
      this.origGo(name, params);
      this.chat.place(name);
    } else if (this.allowLocalGo) {
      this.origGo(name, params);
      this.chat.place(name);
    }
  }
  onGo(m) {
    if (this.host) return;
    this.allowLocalGo = true;
    const params = { ...m.p };
    if (this.run) params.run = this.run;
    try { this.origGo(m.name, params); } catch (e) { console.error(e); this.allowLocalGo = false; this.requestResync(); return; }
    this.allowLocalGo = false;
    this.chat.place(m.name);
  }
  sendRun() {
    if (!this.host || !this.run) return;
    this.net.send({ t: 'run', run: JSON.stringify(this.run) });
    this.emitLocal('run', this.run);
  }
  onRunMsg(m) {
    if (this.host) return;
    const r = relinkRun(JSON.parse(m.run));
    r.me = this.me;
    // 참가자 화면용: 금화·행운석은 내 것, 성벽은 공용
    const mine = r.players[this.me].carry;
    r.carry = Object.assign({}, mine, { wall: r.players[0].carry.wall, wallMax: r.players[0].carry.wallMax });
    this.run = r;
    this.emitLocal('run', r);
  }
  myCarry(run) { return run.players ? run.players[this.me].carry : run.carry; }

  // ── 투표 ──
  // 기본: 지금 사람이 있는 자리가 모두 고르면 다수결로 결정 (동점이면 무작위). 시간이 다 되면 고른 표만으로.
  // afterFirst: 모두 누르거나, 누군가 누른 뒤 N초가 지나면 결정 (상점 떠나기 · 놀이 천막)
  // owner: 그 자리의 플레이어만 결정 (나머지는 의견)
  // 시간은 모두가 선택지에 도착한 뒤부터 잰다 (대사를 늦게 읽는 사람도 고를 수 있게).
  openVote(key, opt = {}) {
    if (this.open[key]) return;
    const o = this.open[key] = { ...opt, start: performance.now(), timeout: (opt.timeout || VOTE_SEC) * 1000, waiting: !opt.afterFirst };
    this.votes[key] = this.votes[key] || [];
    this.markSeen(key, this.me);
    this.net.send({ t: 'vopen', key, who: this.me });
    if (this.preTime[key] !== undefined) { o.start = performance.now(); o.timeout = this.preTime[key]; o.waiting = false; delete this.preTime[key]; }
    if (this.host) {
      if (o.waiting) o.arriveT = setTimeout(() => this.startClock(key), ARRIVE_MAX * 1000);
      else o.timer = setTimeout(() => this.resolve(key), o.timeout);
      this.checkArrive(key);
      this.tryResolve(key);
    }
  }
  markSeen(key, who) { (this.seen[key] = this.seen[key] || new Set()).add(who); }
  onVOpen(m) {
    const who = this.host ? m.from : m.who;
    if (this.decided[m.key] !== undefined) {
      // 늦게 도착한 사람에게 결정을 다시 보낸다 (중간에 놓쳤을 때 대비)
      if (this.host) this.net.sendTo(who, { t: 'decided', key: m.key, result: this.decided[m.key], rand: null, extra: this.decidedX[m.key] });
      return;
    }
    this.markSeen(m.key, who);
    this.emitLocal('vote', { key: m.key });
    if (this.host) this.checkArrive(m.key);
  }
  // 방장: 사람이 있는 자리가 모두 도착했으면 시간을 시작한다
  checkArrive(key) {
    const o = this.open[key];
    if (!this.host || !o || !o.waiting || this.decided[key] !== undefined) return;
    const s = this.seen[key] || new Set();
    const v = this.votes[key] || [];
    if (this.activeVoters().every((i) => s.has(i) || v[i] !== undefined)) this.startClock(key);
  }
  startClock(key) {
    const o = this.open[key];
    if (!o || !o.waiting || this.decided[key] !== undefined) return;
    o.waiting = false;
    clearTimeout(o.arriveT);
    o.start = performance.now();
    clearTimeout(o.timer);
    o.timer = setTimeout(() => this.resolve(key), o.timeout);
    this.net.send({ t: 'vtime', key, ms: o.timeout });
    this.emitLocal('vote', { key });
  }
  vote(key, pick) {
    this.votes[key] = this.votes[key] || [];
    this.markSeen(key, this.me);
    if (this.decided[key] !== undefined) return;
    this.votes[key][this.me] = pick;
    this.net.send({ t: 'vote', key, who: this.me, pick });
    this.emitLocal('vote', { key });
    if (this.host) this.tryResolve(key);
  }
  onVote(m) {
    const who = this.host ? m.from : m.who;
    this.votes[m.key] = this.votes[m.key] || [];
    this.votes[m.key][who] = m.pick;
    this.markSeen(m.key, who);
    this.emitLocal('vote', { key: m.key });
    if (this.host) { this.checkArrive(m.key); this.tryResolve(m.key); }
  }
  // 다수결: 가장 많은 표, 동점이면 무작위
  tally(v) {
    const cnt = [];
    for (const x of v) { if (x === undefined) continue; const c = cnt.find((y) => same(y.v, x)); if (c) c.n++; else cnt.push({ v: x, n: 1 }); }
    if (!cnt.length) return null;
    const top = Math.max(...cnt.map((c) => c.n));
    const best = cnt.filter((c) => c.n === top);
    return { v: best.length > 1 ? best[this.rng.int(best.length)].v : best[0].v, tie: best.length > 1, split: cnt.length > 1 };
  }
  tryResolve(key) {
    const v = this.votes[key];
    const o = this.open[key];
    if (!o || !v || this.decided[key] !== undefined) return;
    const act = this.activeVoters();
    if (o.owner !== undefined && o.owner !== null) {
      if (v[o.owner] !== undefined) this.finish(key, v[o.owner]);
      else if (!this.human(o.owner) && v[0] !== undefined) this.finish(key, v[0]);
      return;
    }
    const all = act.every((i) => v[i] !== undefined);
    const any = v.some((x) => x !== undefined);
    if (all && any) {
      const t = this.tally(v);
      this.finish(key, t.v, t.tie ? { tie: true } : null);
      return;
    }
    if (o.afterFirst && any && !o.afT) {
      o.afT = setTimeout(() => { const t = this.tally(this.votes[key] || []); this.finish(key, t ? t.v : true); }, o.afterFirst * 1000);
      // 남은 시간 표시를 위해 기준 시각을 다시 잡는다
      o.start = performance.now(); o.timeout = o.afterFirst * 1000;
      this.net.send({ t: 'vtime', key, ms: o.timeout });
    }
  }
  resolve(key) {
    const v = this.votes[key] || [];
    const o = this.open[key];
    if (!o || this.decided[key] !== undefined) return;
    if (o.owner !== undefined && o.owner !== null && v[o.owner] !== undefined) { this.finish(key, v[o.owner]); return; }
    const t = this.tally(v);
    if (t) { this.finish(key, t.v, t.tie ? { tie: true } : null); return; }
    const opts = o.options || [true];
    this.finish(key, opts[this.rng.int(opts.length)], { timeout: true });
  }
  finish(key, result, rand) {
    if (this.decided[key] !== undefined) return;
    const o = this.open[key];
    if (o) { clearTimeout(o.timer); clearTimeout(o.afT); clearTimeout(o.arriveT); }
    const extra = o && o.extra ? o.extra(result) : null;
    // 바뀐 여정 상태를 먼저 보내고 결정을 알린다
    if (this.run) this.net.send({ t: 'run', run: JSON.stringify(this.run) });
    const msg = { t: 'decided', key, result, rand: rand || null, extra };
    this.net.send(msg);
    this.onDecided(msg);
  }
  onDecided(m) {
    if (this.decided[m.key] !== undefined) return;
    this.decided[m.key] = m.result;
    this.decidedX[m.key] = m.extra;
    const o = this.open[m.key];
    if (o) { clearTimeout(o.timer); clearTimeout(o.afT); clearTimeout(o.arriveT); }
    if (m.rand && (m.rand.tie || m.rand.timeout)) {
      const label = this.labels[m.key] || ((x) => String(x));
      audio.sfxPlay('dice');
      this.toastAll(m.rand.timeout ? `시간이 다 됐다! 무작위 → "${label(m.result)}"` : `표가 같다! 무작위 결정 → "${label(m.result)}"`);
    }
    const w = this.waiters[m.key];
    delete this.waiters[m.key];
    if (w) this.safe(() => w(m.result, m.extra));
  }
  onVTime(m) {
    const o = this.open[m.key];
    if (o) { o.start = performance.now(); o.timeout = m.ms; o.waiting = false; this.emitLocal('vote', { key: m.key }); } else this.preTime[m.key] = m.ms;
  }
  whenDecided(key, cb) {
    if (this.decided[key] !== undefined) { const r = this.decided[key], x = this.decidedX[key]; this.safe(() => cb(r, x)); return; }
    this.waiters[key] = cb;
  }
  clearVote(key) { delete this.votes[key]; delete this.open[key]; delete this.decided[key]; delete this.decidedX[key]; delete this.waiters[key]; delete this.seen[key]; }
  // 결정 처리 중 오류가 나도 멈추지 않게: 참가자는 방장에게 지금 화면을 다시 받는다
  safe(fn) {
    try { fn(); } catch (e) { console.error(e); this.requestResync(); }
  }
  requestResync() {
    if (this.host) return;
    const now = performance.now();
    if (this.lastResync && now - this.lastResync < 3000) return;
    this.lastResync = now;
    this.net.send({ t: 'resync' });
  }
  onResync(m) {
    if (!this.host || m.from === undefined) return;
    if (this.run) this.net.sendTo(m.from, { t: 'run', run: JSON.stringify(this.run) });
    if (this.lastGo) this.net.sendTo(m.from, { t: 'go', name: this.lastGo.name, p: this.lastGo.p });
  }
  // 다른 사람들이 고른 값 (버튼 표시용)
  othersPicked(key, value) { return this.othersCount(key, value) > 0; }
  othersCount(key, value) {
    const v = this.votes[key] || [];
    return this.others.filter((i) => v[i] !== undefined && same(v[i], value)).length;
  }
  // 투표 버튼 표시: v-me · v-them (+ 인원 수)
  markBtn(b, key, value) {
    const v = this.votes[key] || [];
    const n = this.othersCount(key, value);
    b.classList.toggle('v-me', v[this.me] !== undefined && same(v[this.me], value));
    b.classList.toggle('v-them', n > 0);
    b.dataset.n = n > 1 || this.n > 2 ? `+${n}` : '';
  }

  // 투표 상태 표시줄 (남은 시간 · 다른 사람 선택)
  labels = {};
  voteBar(key, label = (x) => String(x)) {
    this.labels[key] = label;
    const bar = h('div.vote-bar');
    const fill = h('i');
    const txt = h('span');
    bar.append(h('div.vb-track', fill), txt);
    let seen = false;
    const upd = () => {
      if (bar.isConnected) seen = true;
      else if (seen) { clearInterval(iv); off(); return; }
      const o = this.open[key];
      const v = this.votes[key] || [];
      const mine = v[this.me];
      if (o) fill.style.width = o.waiting ? '100%' : Math.max(0, 100 - ((performance.now() - o.start) / o.timeout) * 100) + '%';
      bar.classList.toggle('wait', !!(o && o.waiting));
      const others = this.others;
      const done = others.filter((i) => v[i] !== undefined);
      const nm = (i) => (this.ai.has(i) ? `${this.nameOf(i)}(AI)` : this.nameOf(i));
      let t;
      const sn = this.seen[key] || new Set();
      const reading = others.filter((i) => !this.ai.has(i) && !sn.has(i) && v[i] === undefined);
      if (this.decided[key] !== undefined) t = '결정!';
      else if (o && o.waiting && reading.length) t = `${reading.map(nm).join(' · ')} 이야기 읽는 중… 모두 도착하면 ${Math.round(o.timeout / 1000)}초가 시작됩니다`;
      else if (o && o.options && o.options.length === 1 && o.options[0] === true) {
        const ready = done.length + (mine !== undefined ? 1 : 0);
        t = o.afterFirst
          ? (mine === undefined ? `준비 ${ready}/${this.n}` : `준비 ${ready}/${this.n} · 곧 출발`)
          : `준비 ${ready}/${this.n} · 모두 누르면 넘어갑니다 (${VOTE_SEC}초 뒤 자동)`;
      } else if (others.length === 1) {
        const other = v[others[0]];
        const pName = nm(others[0]);
        if (mine === undefined) t = `${pName}: ${other === undefined ? '고르는 중…' : label(other)}`;
        else if (other === undefined) t = `${pName}의 선택을 기다리는 중… (갈리면 무작위)`;
        else t = `${pName}: ${label(other)}`;
      } else {
        const parts = others.map((i) => `${nm(i)} ${v[i] === undefined ? '…' : label(v[i])}`);
        t = `${parts.join(' · ')} — 다수결${mine === undefined ? '' : ' (동점이면 무작위)'}`;
      }
      txt.textContent = t;
    };
    const iv = setInterval(upd, 200);
    const off = this.onLocal('vote', upd);
    upd();
    return bar;
  }

  // ── 연결 상태 ──
  onStatus(m) {
    if (this.host) {
      const slot = m.slot;
      if (slot === undefined) { this.updateChip(); return; }
      if (m.s === 'lost') this.seatLeft(slot, false);
      else if (m.s === 'connected' && m.msg === 'reconnected') {
        this.ai.delete(slot);
        this.toastAll(`${this.nameOf(slot)}이(가) 돌아왔습니다!`);
        this.chat.sys(`${this.nameOf(slot)}이(가) 돌아왔습니다.`);
        this.sendRun();
        if (this.lastGo) this.net.sendTo(slot, { t: 'go', name: this.lastGo.name, p: this.lastGo.p });
        this.emitLocal('seats');
      } else if (m.s === 'connected') {
        // 로비: 새 참가자
        if (!this.seats.includes(slot)) { this.seats = [...this.seats, slot].sort(); this.chat.sys(`동료 ${slot}이(가) 방에 들어왔습니다.`); }
        this.broadcastSeats();
        this.emitLocal('picks');
      }
    } else {
      if (m.s === 'lost') this.showOverlay('방장과 연결이 끊겼습니다. 다시 연결하는 중…');
      else if (m.s === 'connected' && m.msg === 'reconnected') this.hideOverlay();
      else if (m.s === 'gone') {
        this.showOverlay('방장에게 다시 연결하지 못했습니다. 로비로 돌아갑니다.');
        setTimeout(() => { this.hideOverlay(); this.leave(false); this.origGo('lobby'); }, 2500);
      }
    }
    this.updateChip();
  }
  broadcastSeats() { if (this.host) this.net.send({ t: 'seats', seats: this.seats, picks: this.picks }); }
  seatLeft(slot, clean) {
    if (!this.host) { this.showOverlay('방장이 방을 닫았습니다.'); setTimeout(() => { this.hideOverlay(); this.leave(false); this.origGo('lobby'); }, 2000); return; }
    if (!this.run) {
      // 로비에서 나감: 자리 비우기
      this.chat.sys(`${this.nameOf(slot)}이(가) 방을 나갔습니다.`);
      this.seats = this.seats.filter((x) => x !== slot);
      delete this.picks[slot];
      this.broadcastSeats();
      this.emitLocal('picks');
      this.updateChip();
      return;
    }
    if (slot >= this.n) return;
    this.ai.add(slot);
    this.chat.sys(clean ? `${this.nameOf(slot)}이(가) 떠났습니다. AI가 대신 맡습니다.` : `${this.nameOf(slot)}와(과) 연결이 끊겼습니다. AI가 대신 맡습니다.`);
    this.toastAll(clean ? `${this.nameOf(slot)}이(가) 떠났습니다. AI가 보드를 맡습니다.` : `${this.nameOf(slot)}와(과) 연결이 끊겼습니다. 돌아올 때까지 AI가 대신합니다.`);
    // 기다리던 투표는 남은 사람 기준으로
    for (const key of Object.keys(this.open)) { this.checkArrive(key); this.tryResolve(key); }
    this.emitLocal('seats');
    this.updateChip();
  }
  // 하위 호환
  partnerLeft(clean) { this.seatLeft(this.partner, clean); }
  showOverlay(text) {
    this.hideOverlay();
    this.ov = h('div.coop-ov', h('div', text));
    document.getElementById('stage').appendChild(this.ov);
  }
  hideOverlay() { if (this.ov) { this.ov.remove(); this.ov = null; } }
  toastAll(text) {
    const t = h('div.coop-toast', text);
    document.getElementById('stage').appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
  updateChip() {
    const others = this.others;
    if (others.length <= 1) {
      const p = others[0];
      const ok = this.host ? (p !== undefined && this.net.isOpen(p) && !this.ai.has(p)) : this.net.connected;
      const rec = this.run && this.run.players ? this.run.players[p] : this.picks[p];
      const r = rec && rec.royal;
      const royal = r && ROYALS.find((x) => x.id === r);
      const rtt = this.host ? this.net.rtts.get(p) || 0 : this.net.rtt;
      this.chip.replaceChildren(...[
        royal && SPR.royals[r] ? h('img', { src: spriteURL(SPR.royals[r], 1), alt: '' }) : null,
        h('i.dot' + (ok ? '.on' : '')),
        h('span', ok ? `${royal ? royal.name : this.nameOf(p)} 연결됨 · ${Math.round(rtt)}ms` : this.ai.size ? 'AI가 동료 대신 플레이 중' : p === undefined ? '동료를 기다리는 중' : '연결 끊김')].filter(Boolean));
      return;
    }
    // 3~4인: 자리마다 점
    const rtt = this.host ? Math.max(0, ...this.net.rtts.values()) : this.net.rtt;
    this.chip.replaceChildren(
      ...others.map((i) => {
        const ok = this.host ? this.net.isOpen(i) && !this.ai.has(i) : this.net.connected;
        const rec = this.run && this.run.players ? this.run.players[i] : this.picks[i];
        return h('span.cseat', rec && SPR.royals[rec.royal] ? h('img', { src: spriteURL(SPR.royals[rec.royal], 1), alt: '' }) : null, h('i.dot' + (ok ? '.on' : this.ai.has(i) ? '.ai' : '')));
      }),
      h('span', `${this.n}인 · ${Math.round(rtt)}ms${this.ai.size ? ` · AI ${this.ai.size}` : ''}`));
  }

  leave(sendBye) {
    if (sendBye) this.net.send({ t: 'bye' });
    clearInterval(this.chipTimer);
    this.handlers.forEach((off) => off());
    this.chip.remove();
    this.chat.destroy();
    document.removeEventListener('visibilitychange', this.onVisWake);
    if (this.wake) { const w = this.wake; this.wake = null; w.release().catch(() => {}); }
    this.hideOverlay();
    this.app.go = this.origGo;
    this.app.coop = null;
    setTimeout(() => this.net.close(), 300);
  }
}
