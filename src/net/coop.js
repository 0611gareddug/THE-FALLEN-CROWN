// 협동 세션: 방장이 여정 상태를 쥐고, 참가자 화면을 함께 넘긴다. 투표 · 운명의 주사위 · 연결 상태.
import { h } from '../ui/dom.js';
import { audio } from '../core/audio.js';
import { relinkRun } from '../run/run.js';
import { RNG } from '../core/rng.js';
import { ROYALS } from '../data/text.js';
import { SPR, spriteURL } from '../gfx/sprites.js';

export const PROTO = 1;
const SYNC_SCENES = new Set(['map', 'event', 'shop', 'camp', 'treasure', 'altar', 'reward', 'actIntro', 'ending', 'battle', 'coopSelect']);

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
    this.hook('tie', (m) => this.onTie(m));
    this.hook('stake', (m) => this.onStake(m));
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
  // 두 사람 모두 openVote 후 vote. 방장이 결과를 정해 알린다.
  openVote(key, opt = {}) {
    if (this.open[key]) return;
    this.open[key] = { ...opt, start: performance.now(), timeout: (opt.timeout || 20) * 1000 };
    this.votes[key] = this.votes[key] || [undefined, undefined];
    if (this.host) {
      clearTimeout(this.open[key].timer);
      this.open[key].timer = setTimeout(() => this.resolve(key, true), this.open[key].timeout);
    }
  }
  vote(key, pick) {
    this.votes[key] = this.votes[key] || [undefined, undefined];
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
    if (!o || this.decided[key] !== undefined || o.tie) return;
    const alone = !this.net.connected || this.partnerAI;
    if (o.owner !== undefined && o.owner !== null && v[o.owner] !== undefined) { this.finish(key, v[o.owner]); return; }
    if (v[0] !== undefined && (v[1] !== undefined || alone)) {
      if (alone || v[1] === undefined || JSON.stringify(v[0]) === JSON.stringify(v[1])) this.finish(key, v[0]);
      else this.startTie(key);
    }
  }
  resolve(key) {
    const v = this.votes[key] || [];
    const o = this.open[key];
    if (!o || this.decided[key] !== undefined || o.tie) return;
    const picks = [v[0], v[1]].filter((x) => x !== undefined);
    if (picks.length === 2 && JSON.stringify(v[0]) !== JSON.stringify(v[1])) { this.startTie(key); return; }
    if (picks.length) { this.finish(key, picks[0]); return; }
    const opts = o.options || [true];
    this.finish(key, opts[this.rng.int(opts.length)]);
  }
  startTie(key) {
    const o = this.open[key];
    o.tie = { a: this.votes[key][0], b: this.votes[key][1], stakes: [0, 0] };
    this.net.send({ t: 'tie', key, a: o.tie.a, b: o.tie.b });
    this.onTie({ key, a: o.tie.a, b: o.tie.b });
    setTimeout(() => {
      const s = o.tie.stakes;
      const p = Math.max(0.2, Math.min(0.8, 0.5 + 0.1 * (s[0] - s[1])));
      const roll = this.rng.next();
      const result = roll < p ? o.tie.a : o.tie.b;
      // 건 행운석은 결과와 관계없이 소모
      if (this.run && this.run.players) this.run.players.forEach((pl, i) => { pl.carry.stones = Math.max(0, pl.carry.stones - s[i]); });
      this.finish(key, result, { p, roll, stakes: s, a: o.tie.a, b: o.tie.b });
      if (this.run) this.sendRun();
    }, 5200);
  }
  onTie(m) { this.emitLocal('tie', m); }
  stake(key, n) {
    this.net.send({ t: 'stake', key, who: this.me, n });
    this.onStake({ key, who: this.me, n });
  }
  onStake(m) {
    const o = this.open[m.key];
    if (this.host && o && o.tie) o.tie.stakes[m.who] = m.n;
    this.emitLocal('stake', m);
  }
  finish(key, result, tie) {
    if (this.decided[key] !== undefined) return;
    const extra = this.open[key] && this.open[key].extra ? this.open[key].extra(result) : null;
    // 바뀐 여정 상태를 먼저 보내고 결정을 알린다
    if (this.run) this.net.send({ t: 'run', run: JSON.stringify(this.run) });
    const msg = { t: 'decided', key, result, tie: tie || null, extra };
    this.net.send(msg);
    this.onDecided(msg);
  }
  onDecided(m) {
    if (this.decided[m.key] !== undefined) return;
    this.decided[m.key] = m.result;
    if (this.open[m.key]) clearTimeout(this.open[m.key].timer);
    const run = () => { const w = this.waiters[m.key]; delete this.waiters[m.key]; if (w) w(m.result, m.extra); };
    if (m.tie) this.emitLocal('tieResult', { ...m, done: run });
    else run();
  }
  whenDecided(key, cb) {
    if (this.decided[key] !== undefined) { cb(this.decided[key]); return; }
    this.waiters[key] = cb;
  }
  clearVote(key) { delete this.votes[key]; delete this.open[key]; delete this.decided[key]; delete this.waiters[key]; }

  // 투표 상태 표시줄 (남은 시간 · 상대 선택)
  voteBar(key, label = (x) => String(x)) {
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
      txt.textContent = this.decided[key] !== undefined ? '결정!' : mine === undefined ? `${pName}: ${other === undefined ? '고르는 중…' : label(other)}` : other === undefined ? `${pName}의 선택을 기다리는 중…` : `${pName}: ${label(other)}`;
    };
    const iv = setInterval(upd, 200);
    const off = this.onLocal('vote', upd);
    upd();
    return bar;
  }

  // 운명의 주사위 화면 (의견이 갈렸을 때)
  tieOverlay(root, key, label) {
    let myStake = 0;
    const box = h('div.dice');
    const odds = h('div.dice-need');
    const num = h('div.dice-num', '??');
    const btn = h('button.btn', {
      onclick: () => {
        const stones = this.myCarry(this.run || {}).stones || 0;
        if (myStake >= 3 || myStake >= stones) { audio.sfxPlay('deny'); return; }
        myStake++;
        audio.sfxPlay('stone');
        this.stake(key, myStake);
      },
    }, '행운석 걸기 (+10%p)');
    const stakes = [0, 0];
    const render = () => {
      const p = Math.max(0.2, Math.min(0.8, 0.5 + 0.1 * (stakes[0] - stakes[1])));
      const v = this.votes[key] || [];
      odds.textContent = `방장 "${label(v[0])}" ${Math.round(p * 100)}%  ·  참가자 "${label(v[1])}" ${Math.round((1 - p) * 100)}%`;
    };
    const offS = this.onLocal('stake', (m) => { if (m.key === key) { stakes[m.who] = m.n; render(); } });
    box.append(h('div.dice-card', h('div.eyebrow', 'DICE OF FATE'), h('div', { style: { fontSize: '13px', margin: '6px 0' } }, '의견이 갈렸다! 운명의 주사위가 정한다.'), num, odds, h('div.dice-btns', btn)));
    render();
    root.appendChild(box);
    audio.sfxPlay('dice');
    const offR = this.onLocal('tieResult', (m) => {
      if (m.key !== key) return;
      offR(); offS();
      btn.remove();
      let k = 0;
      const spin = setInterval(() => {
        num.textContent = String(1 + ((Math.random() * 100) | 0)).padStart(2, '0');
        if (++k > 14) {
          clearInterval(spin);
          num.textContent = String(Math.ceil(m.tie.roll * 100)).padStart(2, '0');
          num.classList.add('win');
          odds.textContent = `결과: "${label(m.result)}"`;
          audio.sfxPlay('win');
          setTimeout(() => { box.remove(); m.done(); }, 1100);
        }
      }, 70);
    });
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
