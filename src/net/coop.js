// 협동 세션: 방장이 여정 상태를 쥐고, 참가자 화면을 함께 넘긴다. 투표(갈리면 무작위) · 연결 상태.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { relinkRun } from '../run/run.js';
import { RNG } from '../core/rng.js';
import { ROYALS } from '../data/text.js';
import { SPR, spriteURL } from '../gfx/sprites.js';

export const PROTO = 1;
const SYNC_SCENES = new Set(['map', 'event', 'shop', 'camp', 'treasure', 'altar', 'minigame', 'reward', 'actIntro', 'ending', 'battle', 'coopSelect']);

export class Coop {
  constructor(app, net) {
    this.app = app;
    this.net = net;
    this.role = net.role;
    this.me = this.role === 'host' ? 0 : 1;
    this.run = null;
    this.votes = {};
    this.open = {};
    this.decided = {};
    this.waiters = {};
    this.partnerAI = false;
    this.lastGo = null;
    this.handlers = [];
    this.picks = [{}, {}];
    this.rng = new RNG((Math.random() * 1e9) | 0);
    const origGo = app.go.bind(app);
    this.origGo = origGo;
    app.go = (name, params = {}) => this.go(name, params);
    this.hook('go', (m) => this.onGo(m));
    this.hook('run', (m) => this.onRunMsg(m));
    this.hook('vote', (m) => this.onVote(m));
    this.hook('decided', (m) => this.onDecided(m));
    this.hook('vtime', (m) => this.onVTime(m));
    this.hook('pick', (m) => { this.picks[1 - this.me] = m.p; this.emitLocal('picks'); });
    this.hook('_status', (m) => this.onStatus(m));
    this.hook('bye', () => this.partnerLeft(true));
    this.chip = h('div.coop-chip');
    document.getElementById('stage').appendChild(this.chip);
    this.chipTimer = setInterval(() => this.updateChip(), 1000);
    this.updateChip();
  }

  hook(t, fn) { this.handlers.push(this.net.on(t, fn)); }
  listeners = {};
  onLocal(t, fn) { (this.listeners[t] = this.listeners[t] || new Set()).add(fn); return () => this.listeners[t].delete(fn); }
  emitLocal(t, d) { if (this.listeners[t]) for (const f of [...this.listeners[t]]) f(d); }

  get host() { return this.role === 'host'; }
  get partnerName() { return this.host ? '동료' : '방장'; }

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
    } else if (this.allowLocalGo) {
      this.origGo(name, params);
    }
  }
  onGo(m) {
    if (this.host) return;
    this.allowLocalGo = true;
    const params = { ...m.p };
    if (this.run) params.run = this.run;
    this.origGo(m.name, params);
    this.allowLocalGo = false;
  }
  sendRun() {
    if (!this.host || !this.run) return;
    this.net.send({ t: 'run', run: JSON.stringify(this.run) });
    this.emitLocal('run', this.run);
  }
  onRunMsg(m) {
    if (this.host) return;
    const r = relinkRun(JSON.parse(m.run));
    r.me = 1;
    // 참가자 화면용: 금화·행운석은 내 것, 성벽은 공용
    const mine = r.players[1].carry;
    r.carry = Object.assign({}, mine, { wall: r.players[0].carry.wall, wallMax: r.players[0].carry.wallMax });
    this.run = r;
    this.emitLocal('run', r);
  }
  myCarry(run) { return run.players ? run.players[this.me].carry : run.carry; }

  // ── 투표 ──
  // 기본: 두 사람 모두 고르면 결정, 갈리면 즉시 무작위. 10초가 지나면 고른 쪽(없으면 무작위)으로.
  // afterFirst: 둘 다 누르거나, 한 명이 누른 뒤 N초가 지나면 결정 (상점 떠나기)
  openVote(key, opt = {}) {
    if (this.open[key]) return;
    this.open[key] = { ...opt, start: performance.now(), timeout: (opt.timeout || 10) * 1000 };
    this.votes[key] = this.votes[key] || [undefined, undefined];
    if (this.host) {
      clearTimeout(this.open[key].timer);
      this.open[key].timer = setTimeout(() => this.resolve(key), this.open[key].timeout);
      this.tryResolve(key);
    }
  }
  vote(key, pick) {
    this.votes[key] = this.votes[key] || [undefined, undefined];
    if (this.decided[key] !== undefined) return;
    this.votes[key][this.me] = pick;
    this.net.send({ t: 'vote', key, who: this.me, pick });
    this.emitLocal('vote', { key });
    if (this.host) this.tryResolve(key);
  }
  onVote(m) {
    this.votes[m.key] = this.votes[m.key] || [undefined, undefined];
    this.votes[m.key][m.who] = m.pick;
    this.emitLocal('vote', { key: m.key });
    if (this.host) this.tryResolve(m.key);
  }
  tryResolve(key) {
    const v = this.votes[key];
    const o = this.open[key];
    if (!o || !v || this.decided[key] !== undefined) return;
    const alone = !this.net.connected || this.partnerAI;
    const a = v[0], b = v[1];
    const any = a !== undefined ? a : b;
    if (o.owner !== undefined && o.owner !== null) { if (v[o.owner] !== undefined) this.finish(key, v[o.owner]); else if (alone && a !== undefined) this.finish(key, a); return; }
    if (a !== undefined && (b !== undefined || alone)) {
      if (alone || b === undefined || JSON.stringify(a) === JSON.stringify(b)) this.finish(key, a);
      else this.finish(key, this.rng.next() < 0.5 ? a : b, { a, b });
      return;
    }
    if (o.afterFirst && any !== undefined && !o.afT) {
      o.afT = setTimeout(() => { const w = this.votes[key] || []; this.finish(key, w[0] !== undefined ? w[0] : w[1]); }, o.afterFirst * 1000);
      // 남은 시간 표시를 위해 기준 시각을 다시 잡는다
      o.start = performance.now(); o.timeout = o.afterFirst * 1000;
      this.net.send({ t: 'vtime', key, ms: o.timeout });
    }
  }
  resolve(key) {
    const v = this.votes[key] || [];
    const o = this.open[key];
    if (!o || this.decided[key] !== undefined) return;
    const a = v[0], b = v[1];
    if (a !== undefined && b !== undefined && JSON.stringify(a) !== JSON.stringify(b)) { this.finish(key, this.rng.next() < 0.5 ? a : b, { a, b }); return; }
    if (a !== undefined || b !== undefined) { this.finish(key, a !== undefined ? a : b); return; }
    const opts = o.options || [true];
    this.finish(key, opts[this.rng.int(opts.length)], { timeout: true });
  }
  finish(key, result, rand) {
    if (this.decided[key] !== undefined) return;
    const o = this.open[key];
    if (o) { clearTimeout(o.timer); clearTimeout(o.afT); }
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
    const o = this.open[m.key];
    if (o) { clearTimeout(o.timer); clearTimeout(o.afT); }
    if (m.rand && (m.rand.a !== undefined || m.rand.timeout)) {
      const label = this.labels[m.key] || ((x) => String(x));
      audio.sfxPlay('dice');
      this.toastAll(m.rand.timeout ? `시간이 다 됐다! 무작위 → "${label(m.result)}"` : `의견이 갈렸다! 무작위 결정 → "${label(m.result)}"`);
    }
    const w = this.waiters[m.key];
    delete this.waiters[m.key];
    if (w) w(m.result, m.extra);
  }
  onVTime(m) { const o = this.open[m.key]; if (o) { o.start = performance.now(); o.timeout = m.ms; } }
  whenDecided(key, cb) {
    if (this.decided[key] !== undefined) { cb(this.decided[key]); return; }
    this.waiters[key] = cb;
  }
  clearVote(key) { delete this.votes[key]; delete this.open[key]; delete this.decided[key]; delete this.waiters[key]; }

  // 투표 상태 표시줄 (남은 시간 · 상대 선택)
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
      const other = v[1 - this.me];
      const mine = v[this.me];
      if (o) fill.style.width = Math.max(0, 100 - ((performance.now() - o.start) / o.timeout) * 100) + '%';
      const pName = this.partnerAI ? 'AI 동료' : this.partnerName;
      let t;
      if (this.decided[key] !== undefined) t = '결정!';
      else if (o && o.options && o.options.length === 1 && o.options[0] === true && !o.afterFirst) t = mine === undefined ? `${pName}: ${other === undefined ? '아직' : '준비 완료!'} · 둘 다 누르면 넘어갑니다` : other === undefined ? `${pName}을(를) 기다리는 중… (10초 뒤 자동)` : '둘 다 준비 완료!';
      else if (mine === undefined) t = `${pName}: ${other === undefined ? '고르는 중…' : label(other)}`;
      else if (other === undefined) t = o && o.afterFirst ? `${pName}을(를) 잠깐 기다리는 중… (곧 출발)` : `${pName}의 선택을 기다리는 중… (갈리면 무작위)`;
      else t = `${pName}: ${label(other)}`;
      txt.textContent = t;
    };
    const iv = setInterval(upd, 200);
    const off = this.onLocal('vote', upd);
    upd();
    return bar;
  }

  // ── 연결 상태 ──
  onStatus(m) {
    if (m.s === 'lost') {
      if (this.host) this.partnerLeft(false);
      else this.showOverlay('방장과 연결이 끊겼습니다. 다시 연결하는 중…');
    } else if (m.s === 'connected' && m.msg === 'reconnected') {
      this.hideOverlay();
      this.partnerAI = false;
      if (this.host) {
        this.toastAll('동료가 돌아왔습니다!');
        this.sendRun();
        if (this.lastGo) this.net.send({ t: 'go', name: this.lastGo.name, p: this.lastGo.p });
      }
    } else if (m.s === 'gone' && !this.host) {
      this.showOverlay('방장에게 다시 연결하지 못했습니다. 로비로 돌아갑니다.');
      setTimeout(() => { this.hideOverlay(); this.leave(false); this.origGo('lobby'); }, 2500);
    }
    this.updateChip();
  }
  partnerLeft(clean) {
    if (!this.host) { this.showOverlay('방장이 방을 닫았습니다.'); setTimeout(() => { this.hideOverlay(); this.leave(false); this.origGo('lobby'); }, 2000); return; }
    this.partnerAI = true;
    this.toastAll(clean ? '동료가 떠났습니다. AI가 동료의 보드를 맡습니다.' : '동료와 연결이 끊겼습니다. 돌아올 때까지 AI가 대신합니다.');
    // 기다리던 투표는 방장 선택으로
    for (const key of Object.keys(this.open)) this.tryResolve(key);
    this.updateChip();
  }
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
    const ok = this.net.connected && !this.partnerAI;
    const r = this.run && this.run.players ? this.run.players[1 - this.me].royal : this.picks[1 - this.me].royal;
    const royal = r && ROYALS.find((x) => x.id === r);
    this.chip.replaceChildren(...[
      royal && SPR.royals[r] ? h('img', { src: spriteURL(SPR.royals[r], 1), alt: '' }) : null,
      h('i.dot' + (ok ? '.on' : '')),
      h('span', ok ? `${royal ? royal.name : this.partnerName} 연결됨 · ${Math.round(this.net.rtt)}ms` : this.partnerAI ? 'AI가 동료 대신 플레이 중' : '연결 끊김')].filter(Boolean));
  }

  leave(sendBye) {
    if (sendBye) this.net.send({ t: 'bye' });
    clearInterval(this.chipTimer);
    this.handlers.forEach((off) => off());
    this.chip.remove();
    this.hideOverlay();
    this.app.go = this.origGo;
    this.app.coop = null;
    setTimeout(() => this.net.close(), 300);
  }
}
