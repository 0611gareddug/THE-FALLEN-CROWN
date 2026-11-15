// 전체 화면 배경: 아침 들판 · 뭉게구름 · 흔들리는 풀 · 지평선 끝 작은 마왕성 · 날리는 꽃잎
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
    this.P = Math.max(3, Math.round(Math.min(w, h) / 150)); // 픽셀 크기
    this.buildLayers();
    const n = this.settings.low ? 16 : Math.round(Math.min(60, (w * h) / 22000));
    this.parts = [];
    for (let i = 0; i < n; i++) this.parts.push(this.spawn(true));
    // 앞쪽 풀 다발
    const P = this.P;
    this.tufts = [];
    const nt = this.settings.low ? 0 : Math.round(w / (P * 9));
    for (let i = 0; i < nt; i++) this.tufts.push({ x: (i + Math.random() * 0.8) * P * 9, h: 3 + ((Math.random() * 4) | 0), ph: Math.random() * 6, c: Math.random() < 0.3 });
  }

  layer(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.dpr);
    const g = c.getContext('2d');
    g.scale(this.dpr, this.dpr);
    g.imageSmoothingEnabled = false;
    return [c, g];
  }

  // 픽셀 구름 하나 (둥근 덩어리 여러 개)
  cloud(g, x, y, s, light, shade) {
    const P = this.P;
    const blobs = [[0, 2, 6, 3], [3, 0, 7, 5], [8, 1, 6, 4], [12, 2, 5, 3], [-3, 3, 5, 2]];
    g.fillStyle = shade;
    for (const [bx, by, bw, bh] of blobs) g.fillRect(x + bx * P * s, y + (by + 1) * P * s, bw * P * s, bh * P * s);
    g.fillStyle = light;
    for (const [bx, by, bw, bh] of blobs) g.fillRect(x + bx * P * s, y + by * P * s, bw * P * s, bh * P * s);
  }

  buildLayers() {
    const { w, h, P } = this;
    const pad = 40;
    // 하늘: 위는 맑은 파랑, 지평선은 따뜻한 크림
    const [sky, g] = this.layer(w + pad * 2, h + pad * 2);
    const H = h + pad * 2, W = w + pad * 2;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#6cc4f5');
    grd.addColorStop(0.45, '#a9defa');
    grd.addColorStop(0.72, '#e6f6ff');
    grd.addColorStop(0.86, '#fff4d8');
    grd.addColorStop(1, '#fff4d8');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    // 해 (왼쪽 위) + 은은한 빛
    const sx = W * 0.18, sy = H * 0.16;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, Math.min(W, H) * 0.45);
    sg.addColorStop(0, 'rgba(255,248,214,0.95)');
    sg.addColorStop(0.15, 'rgba(255,240,190,0.55)');
    sg.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fffbe8';
    const r = P * 5;
    for (let yy = -r; yy <= r; yy += P) for (let xx = -r; xx <= r; xx += P) if (xx * xx + yy * yy <= r * r) g.fillRect(Math.round(sx + xx), Math.round(sy + yy), P, P);
    this.sky = sky; this.pad = pad;

    // 먼 산 + 마왕성 (지평선 오른쪽 끝)
    const [far, fg] = this.layer(w, h);
    const horizon = h * 0.74;
    fg.fillStyle = '#b9d9ef';
    for (let x = 0; x < w; x += P) {
      const y = horizon - P * 6 - Math.round((Math.sin(x * 0.012) * 6 + Math.sin(x * 0.031 + 1) * 3) * P * 0.6 / P) * P;
      fg.fillRect(x, y, P, horizon - y + P * 4);
    }
    // 마왕성: 작고 귀여운 보랏빛 성 + 소용돌이 구름
    const cx = w * 0.8, cy = horizon - P * 5;
    fg.fillStyle = '#9c8fc4';
    const ex = (a, b, c2, d) => fg.fillRect(cx + a * P, cy + b * P, c2 * P, d * P);
    ex(-6, -6, 12, 7); ex(-8, -10, 3, 11); ex(5, -10, 3, 11); ex(-2, -14, 4, 15);
    ex(-8, -11, 1, 1); ex(-6, -11, 1, 1); ex(5, -11, 1, 1); ex(7, -11, 1, 1);
    fg.fillStyle = '#7d6fae';
    ex(-3, -16, 6, 2); ex(-2, -18, 4, 2); ex(-1, -19, 2, 1);
    ex(-9, -12, 5, 2); ex(4, -12, 5, 2);
    fg.fillStyle = '#ffd36b';
    ex(-1, -9, 1, 1); ex(1, -6, 1, 1); ex(-6, -4, 1, 1);
    // 성 위의 보랏빛 구름
    fg.globalAlpha = 0.75;
    this.cloud(fg, cx - P * 10, cy - P * 26, 0.9, '#b7a6dd', '#9585c4');
    fg.globalAlpha = 1;
    // 가까운 언덕들
    const hill = (col, base, amp, f, ph) => {
      fg.fillStyle = col;
      for (let x = 0; x < w; x += P) {
        const y = base - Math.round(((Math.sin(x * f + ph) * 0.5 + 0.5) * amp) / P) * P;
        fg.fillRect(x, y, P, h - y);
      }
    };
    hill('#a6d98a', horizon + P * 2, P * 9, 0.006, 0.5);
    hill('#8fcd6e', horizon + P * 9, P * 7, 0.009, 2.4);
    hill('#78bf58', horizon + P * 17, P * 6, 0.012, 4.1);
    // 흙길 (들판을 가로질러 성 쪽으로)
    fg.fillStyle = '#e9cf98';
    for (let y = horizon + P * 10; y < h; y += P) {
      const t = (y - horizon) / (h - horizon);
      const half = Math.round((P * 1.5 + t * w * 0.11) / P) * P;
      const mid = Math.round((w * 0.62 - t * w * 0.18) / P) * P;
      fg.fillRect(mid - half, y, half * 2, P);
    }
    // 꽃
    const flowers = ['#ff9ac2', '#fff1a8', '#ffffff', '#ffb36b'];
    for (let i = 0; i < Math.round(w / 9); i++) {
      const x = Math.round((Math.random() * w) / P) * P, y = Math.round((horizon + P * 12 + Math.random() * (h - horizon - P * 12)) / P) * P;
      fg.fillStyle = flowers[i % 4];
      fg.fillRect(x, y, P, P);
    }
    this.far = far;

    // 흘러가는 구름 (따로 그려서 프레임마다 옮긴다)
    this.clouds = [];
    const nC = Math.max(4, Math.round(w / 260));
    for (let i = 0; i < nC; i++) {
      const s = 0.8 + Math.random() * 0.9;
      const [cc, cgc] = this.layer(P * 22 * s, P * 9 * s);
      this.cloud(cgc, P * 3 * s, P * s, s, '#ffffff', '#d7ecfa');
      this.clouds.push({ c: cc, x: Math.random() * w, y: h * (0.06 + Math.random() * 0.42), v: 4 + Math.random() * 8, d: 0.4 + s * 0.4, w: P * 22 * s });
    }
  }

  spawn(initial) {
    const pollen = Math.random() < 0.35;
    return {
      x: Math.random() * this.w,
      y: initial ? Math.random() * this.h : -10,
      vx: 10 + Math.random() * 14,
      vy: pollen ? -2 + Math.random() * 4 : 6 + Math.random() * 10,
      s: pollen ? 1 : 2,
      a: 0.5 + Math.random() * 0.4,
      d: 0.4 + Math.random() * 0.8,
      col: pollen ? '#fff7c2' : ['#ffb3cf', '#ffffff', '#ffd1e3'][(Math.random() * 3) | 0],
      pollen,
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
    const { w, h, dpr, pad, P } = this;
    const par = this.mode === 'lobby' && !this.settings.low;
    this.px += ((par ? this.mx : 0) - this.px) * Math.min(1, dt * 3);
    this.py += ((par ? this.my : 0) - this.py) * Math.min(1, dt * 3);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.imageSmoothingEnabled = false;
    g.drawImage(this.sky, Math.round((-pad - this.px * 10) * dpr), Math.round((-pad - this.py * 8) * dpr));
    // 구름
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > w + 20) c.x = -c.w - 20;
      g.drawImage(c.c, Math.round((c.x - this.px * 20 * c.d) * dpr), Math.round((c.y - this.py * 10 * c.d) * dpr));
    }
    g.drawImage(this.far, Math.round(-this.px * 24 * dpr), Math.round(-this.py * 10 * dpr));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 앞쪽 풀 (바람에 흔들림)
    const ox = this.px * 40, oy = this.py * 24;
    for (const t of this.tufts) {
      const sway = Math.round(Math.sin(this.t * 1.6 + t.ph + t.x * 0.01) * 1.2) * P;
      const bx = t.x - ox * 0.8, by = h + 2 - oy * 0.4;
      g.fillStyle = t.c ? '#5aa844' : '#68b54d';
      for (let k = 0; k < t.h; k++) {
        const s2 = Math.round((sway * k) / t.h / P) * P;
        g.fillRect(bx + s2, by - (k + 1) * P, P, P);
        g.fillRect(bx + P * 2 + s2, by - (k + 1) * P + P, P, P);
      }
    }
    // 꽃잎 · 꽃가루
    for (const p of this.parts) {
      p.x += (p.vx + Math.sin(this.t * 1.2 + p.ph) * 8) * dt * p.d;
      p.y += (p.vy + Math.cos(this.t * 0.9 + p.ph) * 4) * dt * p.d;
      if (p.y > h + 10 || p.y < -20 || p.x > w + 20) Object.assign(p, this.spawn(false), { x: -10, y: Math.random() * h * 0.8 });
      const x = Math.round(p.x - ox * p.d), y = Math.round(p.y - oy * p.d);
      g.globalAlpha = p.pollen ? p.a * (0.6 + Math.sin(this.t * 3 + p.ph) * 0.4) : p.a;
      g.fillStyle = p.col;
      if (p.pollen) g.fillRect(x, y, 2, 2);
      else { g.fillRect(x, y, 3, 2); g.fillRect(x + 1, y - 1, 1, 1); }
    }
    g.globalAlpha = 1;
  }
}
