// P2P 연결 (WebRTC · PeerJS). 방장이 방 코드로 대기, 참가자가 코드로 접속.
import Peer from 'peerjs';

const PREFIX = 'tfc-crown-v1-';
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => ALPH[(Math.random() * ALPH.length) | 0]).join('');

function errText(e) {
  const t = e && e.type;
  if (t === 'peer-unavailable') return '방을 찾을 수 없습니다. 코드를 다시 확인해 주세요.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return '연결 서버에 닿지 않습니다. 인터넷 연결을 확인해 주세요.';
  if (t === 'browser-incompatible') return '이 브라우저는 협동 연결을 지원하지 않습니다.';
  return '연결에 실패했습니다. 이 네트워크에서는 협동 연결이 막혀 있을 수 있습니다.';
}

export const MAX_PLAYERS = 4;
// 이 시간 동안 아무것도 받지 못하면 끊긴 것으로 본다 (휴대폰이 잠깐 느려져도 버티도록 넉넉히)
const SILENT_MS = 12000;

// 방장: 참가자 최대 3명과 각각 연결 (별 모양). 참가자: 방장 하나와 연결.
// 참가자가 보낸 메시지는 방장이 받으면서 m.from(자리 번호)을 붙인다.
export class Net {
  constructor() {
    this.role = null;
    this.peer = null;
    this.conn = null; // 참가자: 방장 연결
    this.conns = new Map(); // 방장: 자리 번호 → 연결
    this.code = null;
    this.status = 'idle';
    this.handlers = new Map();
    this.rtt = 0;
    this.rtts = new Map();
    this.lastRecv = 0;
    this.lastRecvs = new Map();
    this.everConnected = false;
    this.timer = null;
    this.locked = false; // 게임이 시작되면 새 참가자를 받지 않는다 (재접속은 허용)
    this.peerSlot = new Map(); // 참가자 peer id → 자리 번호 (재접속 시 같은 자리)
    this.stale = new Set(); // 방장: 응답이 없어 끊긴 것으로 처리한 자리 (연결은 살아 있을 수 있다)
    this.onVis = () => { if (document.visibilityState === 'visible') this.pingNow(); };
    document.addEventListener('visibilitychange', this.onVis);
  }

  options() {
    // 개발 중에는 ?peer=localhost:9000 으로 로컬 중계 서버를 쓸 수 있다
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search).get('peer');
      if (q) { const [host, port] = q.split(':'); return { host, port: +port, path: '/', secure: false, debug: 1 }; }
    }
    return {
      debug: 0,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] },
    };
  }

  setStatus(s, msg, slot) {
    this.status = s;
    this.statusMsg = msg || '';
    this.emit({ t: '_status', s, msg, slot });
  }

  // 방장 기준: 지금 연결된 참가자 자리 번호들
  slots() { return [...this.conns.entries()].filter(([, c]) => c.open).map(([k]) => k).sort(); }
  get count() { return this.role === 'host' ? 1 + this.slots().length : 0; }

  host() {
    this.close();
    this.role = 'host';
    return new Promise((resolve, reject) => {
      const code = genCode();
      const p = new Peer(PREFIX + code, this.options());
      p.on('open', () => { this.peer = p; this.code = code; this.setStatus('waiting'); this.heartbeat(); resolve(code); });
      p.on('error', (e) => {
        if (e.type === 'unavailable-id') { p.destroy(); this.host().then(resolve, reject); return; }
        if (this.conns.size) return;
        this.setStatus('error', errText(e));
        reject(e);
      });
      p.on('connection', (c) => {
        const known = this.peerSlot.get(c.metadata && c.metadata.id);
        let slot = known;
        if (slot === undefined) {
          if (this.locked) { c.on('open', () => { c.send({ t: 'full', why: 'started' }); setTimeout(() => c.close(), 400); }); return; }
          slot = [1, 2, 3].find((k) => !this.conns.has(k) || !this.conns.get(k).open);
          if (slot === undefined) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 400); }); return; }
        }
        if (c.metadata && c.metadata.id) this.peerSlot.set(c.metadata.id, slot);
        this.attachHost(c, slot, known !== undefined);
      });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) { /* 무시 */ } });
    });
  }

  attachHost(c, slot, re) {
    const old = this.conns.get(slot);
    if (old && old !== c) { try { old.close(); } catch (e) { /* 무시 */ } }
    this.conns.set(slot, c);
    c.on('open', () => {
      this.stale.delete(slot);
      this.lastRecvs.set(slot, performance.now());
      c.send({ t: 'welcome', slot });
      this.status = 'connected';
      this.emit({ t: '_status', s: 'connected', msg: re ? 'reconnected' : '', slot });
    });
    c.on('data', (d) => this.recv(d, slot));
    const gone = () => { if (this.conns.get(slot) === c) this.lostSlot(slot); };
    c.on('close', gone);
    c.on('error', gone);
  }

  lostSlot(slot) {
    if (this.status === 'idle') return;
    this.emit({ t: '_status', s: 'lost', slot });
  }

  join(code) {
    this.close();
    this.role = 'guest';
    this.code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.myId = this.myId || Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      const p = new Peer(this.options());
      this.peer = p;
      let done = false;
      const fail = (msg) => { if (done) return; done = true; this.setStatus('error', msg); reject(new Error(msg)); };
      const to = setTimeout(() => fail('연결 시간이 초과되었습니다. 방 코드를 확인하거나, 다른 네트워크에서 시도해 주세요.'), 15000);
      p.on('open', () => {
        const c = p.connect(PREFIX + this.code, { reliable: true, serialization: 'binary', metadata: { id: this.myId } });
        this.attach(c);
        const offW = this.on('welcome', (m) => { offW(); this.slot = m.slot; if (done) return; done = true; clearTimeout(to); resolve(m.slot); });
        const offF = this.on('full', (m) => { offF(); fail(m.why === 'started' ? '이미 시작한 방입니다.' : '방이 가득 찼습니다 (최대 4명).'); });
      });
      p.on('error', (e) => { clearTimeout(to); fail(errText(e)); });
    });
  }

  attach(c) {
    this.conn = c;
    c.on('open', () => {
      const re = this.everConnected;
      this.everConnected = true;
      this.lastRecv = performance.now();
      this.setStatus('connected', re ? 'reconnected' : '');
      this.heartbeat();
    });
    c.on('data', (d) => this.recv(d, 0));
    c.on('close', () => { if (this.conn === c) this.lost(); });
    c.on('error', () => { if (this.conn === c) this.lost(); });
  }

  lost() {
    if (this.status === 'lost' || this.status === 'idle') return;
    this.setStatus('lost');
    if (this.role === 'guest') this.retry();
  }

  // 참가자: 60초 동안 3초마다 다시 접속 시도
  retry() {
    const until = performance.now() + 60000;
    const tryOnce = () => {
      if (this.status === 'connected' || this.status === 'idle') return;
      if (performance.now() > until) { this.setStatus('gone'); return; }
      try {
        if (this.peer.disconnected) this.peer.reconnect();
        const c = this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'binary', metadata: { id: this.myId } });
        this.attach(c);
      } catch (e) { /* 다음 시도 */ }
      setTimeout(tryOnce, 3000);
    };
    setTimeout(tryOnce, 1000);
  }

  heartbeat() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const now = performance.now();
      if (this.role === 'host') {
        for (const [slot, c] of this.conns) {
          if (!c.open) continue;
          try { c.send({ t: 'ping', k: now }); } catch (e) { /* 무시 */ }
          if (!this.stale.has(slot) && now - (this.lastRecvs.get(slot) || now) > SILENT_MS) { this.stale.add(slot); this.lostSlot(slot); }
        }
        return;
      }
      if (!this.conn || !this.conn.open) return;
      this.send({ t: 'ping', k: now });
      if (this.status === 'connected' && now - this.lastRecv > SILENT_MS) this.lost();
    }, 2000);
  }

  // 화면이 다시 보이면 바로 확인 신호를 보낸다 (휴대폰이 잠깐 멈췄다 돌아온 경우)
  pingNow() {
    const now = performance.now();
    if (this.role === 'host') { for (const c of this.conns.values()) if (c.open) { try { c.send({ t: 'ping', k: now }); } catch (e) { /* 무시 */ } } }
    else if (this.conn && this.conn.open) { try { this.conn.send({ t: 'ping', k: now }); } catch (e) { /* 무시 */ } }
  }

  // 방장: 모두에게(except 제외) · 참가자: 방장에게
  send(m, except) {
    if (this.role === 'host') {
      for (const [slot, c] of this.conns) if (slot !== except && c.open) { try { c.send(m); } catch (e) { /* 무시 */ } }
      return;
    }
    if (this.conn && this.conn.open) {
      try { this.conn.send(m); } catch (e) { /* 연결 끊김 처리는 close 이벤트에서 */ }
    }
  }
  sendTo(slot, m) {
    const c = this.conns.get(slot);
    if (c && c.open) { try { c.send(m); } catch (e) { /* 무시 */ } }
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type).delete(fn);
  }

  emit(m) {
    const hs = this.handlers.get(m.t);
    if (hs) for (const f of [...hs]) f(m);
  }

  recv(m, slot) {
    const now = performance.now();
    if (this.role === 'host') {
      this.lastRecvs.set(slot, now);
      // 응답이 없어 끊긴 것으로 처리했던 자리가 같은 연결로 다시 말을 걸면 돌아온 것으로 본다
      if (this.stale.has(slot) && this.isOpen(slot)) { this.stale.delete(slot); this.emit({ t: '_status', s: 'connected', msg: 'reconnected', slot }); }
    } else {
      this.lastRecv = now;
      if (this.status === 'lost' && this.conn && this.conn.open) this.setStatus('connected', 'reconnected');
    }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { if (this.role === 'host') this.sendTo(slot, { t: 'pong', k: m.k }); else this.send({ t: 'pong', k: m.k }); return; }
    if (m.t === 'pong') { const r = now - m.k; if (this.role === 'host') this.rtts.set(slot, r); else this.rtt = r; return; }
    if (this.role === 'host') m.from = slot; // 방장이 받은 메시지에는 보낸 자리를 붙인다
    else if (m.from === undefined) m.from = 0;
    this.emit(m);
  }

  get connected() { return this.role === 'host' ? this.slots().length > 0 : this.status === 'connected'; }
  // 게임 시작 때 자리 번호를 0..n-1로 당긴다 (seats[k] = 예전 자리)
  remap(seats) {
    const conns = new Map(), ps = new Map(), lr = new Map();
    seats.forEach((old, k) => { if (k && this.conns.has(old)) { conns.set(k, this.conns.get(old)); lr.set(k, this.lastRecvs.get(old)); } });
    for (const [id, old] of this.peerSlot) { const k = seats.indexOf(old); if (k > 0) ps.set(id, k); }
    // 연결 이벤트 핸들러는 예전 자리 번호를 기억하므로, 데이터에 새 번호를 붙이도록 다시 연결
    for (const [k, c] of conns) { c.removeAllListeners('data'); c.removeAllListeners('close'); c.removeAllListeners('error'); c.on('data', (d) => this.recv(d, k)); const gone = () => { if (this.conns.get(k) === c) this.lostSlot(k); }; c.on('close', gone); c.on('error', gone); }
    this.conns = conns; this.peerSlot = ps; this.lastRecvs = lr; this.stale = new Set();
  }
  isOpen(slot) { const c = this.conns.get(slot); return !!(c && c.open); }

  close() {
    clearInterval(this.timer);
    try { if (this.conn) this.conn.close(); } catch (e) { /* 무시 */ }
    for (const c of this.conns.values()) { try { c.close(); } catch (e) { /* 무시 */ } }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* 무시 */ }
    this.conn = null; this.peer = null; this.everConnected = false;
    this.conns = new Map(); this.peerSlot = new Map(); this.lastRecvs = new Map(); this.rtts = new Map(); this.stale = new Set();
    this.locked = false; this.slot = undefined;
    this.status = 'idle';
  }
}

export const net = new Net();
