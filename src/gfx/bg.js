// 전체 화면 배경: 밤하늘 · 대각선 빛줄기 · 잿가루와 불티 · 먼 무너진 성
export class Background {
  constructor(canvas, settings) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.settings = settings;
    this.mode = 'lobby';
    this.mx = 0; this.my = 0; this.px = 0; this.py = 0;
    this.parts = [];
    this.t = 0;
    this.acc = 0;
    this.resize();
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.mx = e.clientX / innerWidth - 0.5;
      this.my = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  setMode(m) { this.mode = m; this.acc = 1; }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight;
    this.w = w; this.h = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.buildLayers();
    const n = this.settings.low ? 40 : Math.round(Math.min(140, (w * h) / 9000));
    this.parts = [];
    for (let i = 0; i < n; i++) this.parts.push(this.spawn(true));
  }

  layer(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.dpr);
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    return [c, g];
  }

  buildLayers() {
    const { w, h } = this;
    const pad = 40;
    // 하늘 + 별
    const [sky, g] = this.layer(w + pad * 2, h + pad * 2);
    const grd = g.createLinearGradient(0, 0, 0, h + pad * 2);
    grd.addColorStop(0, '#07080c');
    grd.addColorStop(0.6, '#0b0d13');
    grd.addColorStop(1, '#12141b');
    g.fillStyle = grd;
    g.fillRect(0, 0, w + pad * 2, h + pad * 2);
    const stars = Math.round((w * h) / 2200);
    for (let i = 0; i < stars; i++) {
      const x = Math.random() * (w + pad * 2), y = Math.random() * (h + pad * 2) * 0.9;
      const b = Math.random();
      g.globalAlpha = 0.2 + b * 0.6;
      g.fillStyle = b > 0.93 ? '#f3e7c8' : '#cfd3e0';
      const s = b > 0.97 ? 2 : 1;
      g.fillRect(Math.round(x), Math.round(y), s, s);
      if (b > 0.985) {
        g.globalAlpha = 0.25;
        g.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
        g.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
      }
    }
    g.globalAlpha = 1;
    this.sky = sky; this.pad = pad;

    // 대각선 빛줄기 (한 번만 흐리게 구워 둔다)
    const [beam, bg] = this.layer(w, h);
    const len = Math.hypot(w, h) * 1.4;
    const bw = Math.max(260, Math.min(w, h) * 0.55);
    bg.save();
    bg.filter = `blur(${Math.round(bw * 0.18)}px)`;
    bg.translate(w * 0.12, -h * 0.08);
    bg.rotate(-Math.atan2(w * 0.75, h));
    const lg = bg.createLinearGradient(0, 0, 0, len);
    lg.addColorStop(0, 'rgba(225,220,205,0.13)');
    lg.addColorStop(0.45, 'rgba(200,196,185,0.07)');
    lg.addColorStop(1, 'rgba(180,180,180,0)');
    bg.fillStyle = lg;
    bg.beginPath();
    bg.moveTo(-bw * 0.25, 0);
    bg.lineTo(bw * 0.25, 0);
    bg.lineTo(bw * 0.6, len);
    bg.lineTo(-bw * 0.6, len);
    bg.closePath();
    bg.fill();
    bg.fillStyle = 'rgba(235,230,215,0.05)';
    bg.beginPath();
    bg.moveTo(-bw * 0.08, 0);
    bg.lineTo(bw * 0.08, 0);
    bg.lineTo(bw * 0.22, len * 0.7);
    bg.lineTo(-bw * 0.22, len * 0.7);
    bg.closePath();
    bg.fill();
    bg.restore();
    this.beam = beam;

    // 먼 무너진 성 실루엣 (픽셀 느낌)
    const [castle, cg] = this.layer(w, h);
    const px = Math.max(3, Math.round(Math.min(w, h) / 160));
    const baseY = h * 0.92;
    const cx0 = w * 0.55;
    cg.fillStyle = '#0d0f16';
    const towers = [[0, 22, 6], [7, 14, 10], [18, 30, 5], [24, 17, 12], [37, 25, 6], [44, 11, 9], [54, 19, 5]];
    for (const [ox, th, tw] of towers) {
      const x = cx0 + ox * px, top = baseY - th * px;
      cg.fillRect(x, top, tw * px, baseY - top + px * 30);
      // 부서진 총안
      for (let k = 0; k < tw; k += 2) if ((k * 7 + ox) % 3) cg.fillRect(x + k * px, top - px, px, px);
    }
    cg.fillRect(cx0 - px * 10, baseY, px * 80, h - baseY);
    cg.fillStyle = 'rgba(224,102,58,0.35)';
    cg.fillRect(cx0 + 20 * px, baseY - 22 * px, px, px * 2);
    cg.fillRect(cx0 + 27 * px, baseY - 10 * px, px, px * 2);
    cg.fillStyle = 'rgba(224,102,58,0.18)';
    cg.fillRect(cx0 + 9 * px, baseY - 8 * px, px, px);
    this.castle = castle;
  }

  spawn(initial) {
    const ember = Math.random() < 0.07;
    return {
      x: Math.random() * this.w,
      y: initial ? Math.random() * this.h : -10,
      vx: (Math.random() - 0.3) * 8,
      vy: ember ? -(4 + Math.random() * 8) : 8 + Math.random() * 16,
      s: ember ? 2 : Math.random() < 0.3 ? 2 : 1,
      a: 0.15 + Math.random() * 0.45,
      d: 0.3 + Math.random() * 0.9,
      ember,
      ph: Math.random() * 6,
    };
  }

  frame(dt) {
    this.t += dt;
    // 게임 중에는 30fps로 낮춰 가볍게
    if (this.mode !== 'lobby') {
      this.acc += dt;
      if (this.acc < 1 / 30) return;
      dt = this.acc; this.acc = 0;
    }
    const g = this.ctx;
    const { w, h, dpr, pad } = this;
    const par = this.mode === 'lobby' && !this.settings.low;
    this.px += ((par ? this.mx : 0) - this.px) * Math.min(1, dt * 3);
    this.py += ((par ? this.my : 0) - this.py) * Math.min(1, dt * 3);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(this.sky, Math.round((-pad - this.px * 14) * dpr), Math.round((-pad - this.py * 10) * dpr));
    g.globalAlpha = 0.85 + Math.sin(this.t * 0.4) * 0.15;
    g.drawImage(this.beam, Math.round(-this.px * 24 * dpr), Math.round(-this.py * 16 * dpr));
    g.globalAlpha = 1;
    g.drawImage(this.castle, Math.round(-this.px * 30 * dpr), Math.round(-this.py * 8 * dpr));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ox = this.px * 40, oy = this.py * 24;
    for (const p of this.parts) {
      p.x += (p.vx + Math.sin(this.t * 0.8 + p.ph) * 6) * dt * p.d;
      p.y += p.vy * dt * p.d;
      if (p.y > h + 10 || p.y < -20 || p.x < -20 || p.x > w + 20) Object.assign(p, this.spawn(false), p.ember ? { y: h + 5 } : {});
      const x = Math.round(p.x - ox * p.d), y = Math.round(p.y - oy * p.d);
      if (p.ember) {
        const f = 0.6 + Math.sin(this.t * 6 + p.ph) * 0.4;
        g.globalAlpha = 0.12 * f;
        g.fillStyle = '#e0663a';
        g.fillRect(x - 3, y - 3, 8, 8);
        g.globalAlpha = 0.8 * f;
        g.fillStyle = '#ff9a5a';
        g.fillRect(x, y, 2, 2);
      } else {
        g.globalAlpha = p.a;
        g.fillStyle = '#9a96a0';
        g.fillRect(x, y, p.s, p.s);
      }
    }
    g.globalAlpha = 1;
  }
}
