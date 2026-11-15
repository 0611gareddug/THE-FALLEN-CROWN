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

export class Net {
  constructor() {
    this.role = null;
    this.peer = null;
    this.conn = null;
    this.code = null;
    this.status = 'idle';
    this.handlers = new Map();
    this.rtt = 0;
    this.lastRecv = 0;
    this.everConnected = false;
    this.timer = null;
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

  setStatus(s, msg) {
    this.status = s;
    this.statusMsg = msg || '';
    this.emit({ t: '_status', s, msg });
  }

  host() {
    this.close();
    this.role = 'host';
    return new Promise((resolve, reject) => {
      const code = genCode();
      const p = new Peer(PREFIX + code, this.options());
      p.on('open', () => { this.peer = p; this.code = code; this.setStatus('waiting'); this.heartbeat(); resolve(code); });
      p.on('error', (e) => {
        if (e.type === 'unavailable-id') { p.destroy(); this.host().then(resolve, reject); return; }
        if (this.status === 'connected') return;
        this.setStatus('error', errText(e));
        reject(e);
      });
      p.on('connection', (c) => {
        if (this.conn && this.conn.open) {
          c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 400); });
          return;
        }
        this.attach(c);
      });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) { /* 무시 */ } });
    });
  }

  join(code) {
    this.close();
    this.role = 'guest';
    this.code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return new Promise((resolve, reject) => {
      const p = new Peer(this.options());
      this.peer = p;
      let done = false;
      const fail = (msg) => { if (done) return; done = true; this.setStatus('error', msg); reject(new Error(msg)); };
      const to = setTimeout(() => fail('연결 시간이 초과되었습니다. 방 코드를 확인하거나, 다른 네트워크에서 시도해 주세요.'), 15000);
      p.on('open', () => {
        const c = p.connect(PREFIX + this.code, { reliable: true, serialization: 'binary' });
        this.attach(c);
        c.on('open', () => { if (done) return; done = true; clearTimeout(to); resolve(); });
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
    c.on('data', (d) => this.recv(d));
    c.on('close', () => { if (this.conn === c) this.lost(); });
    c.on('error', () => { if (this.conn === c) this.lost(); });
  }

  lost() {
    if (this.status === 'lost' || this.status === 'idle') return;
    this.setStatus('lost');
    if (this.role === 'guest') this.retry();
  }

  // 참가자: 30초 동안 3초마다 다시 접속 시도
  retry() {
    const until = performance.now() + 30000;
    const tryOnce = () => {
      if (this.status === 'connected' || this.status === 'idle') return;
      if (performance.now() > until) { this.setStatus('gone'); return; }
      try {
        if (this.peer.disconnected) this.peer.reconnect();
        const c = this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'binary' });
        this.attach(c);
      } catch (e) { /* 다음 시도 */ }
      setTimeout(tryOnce, 3000);
    };
    setTimeout(tryOnce, 1000);
  }

  heartbeat() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.conn || !this.conn.open) return;
      this.send({ t: 'ping', k: performance.now() });
      if (this.status === 'connected' && performance.now() - this.lastRecv > 7000) this.lost();
    }, 2000);
  }

  send(m) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(m); } catch (e) { /* 연결 끊김 처리는 close 이벤트에서 */ }
    }
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

  recv(m) {
    this.lastRecv = performance.now();
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { this.send({ t: 'pong', k: m.k }); return; }
    if (m.t === 'pong') { this.rtt = performance.now() - m.k; return; }
    this.emit(m);
  }

  get connected() { return this.status === 'connected'; }

  close() {
    clearInterval(this.timer);
    try { if (this.conn) this.conn.close(); } catch (e) { /* 무시 */ }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* 무시 */ }
    this.conn = null; this.peer = null; this.everConnected = false;
    this.status = 'idle';
  }
}

export const net = new Net();
