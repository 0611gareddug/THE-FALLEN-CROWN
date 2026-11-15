// 논리 해상도 360×640 기준 전장 배치 (1인 · 협동 8자 필드)
export const W = 360;
export const H = 640;

export const COLS = 6;
export const ROWS = 3;
export const CELL = 48;
export const BX = 36;
export const BY = 124;

// 1인용 길(중심선)
export const PL = 22;
export const PR = 338;
export const PT = 110;
export const PB = 282;

function polyPath(pts) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, dx: (x2 - x1) / len, dy: (y2 - y1) / len, len, s0: total });
    total += len;
  }
  const path = (s, out) => {
    s %= total;
    if (s < 0) s += total;
    let k = 0;
    while (k < segs.length - 1 && s >= segs[k].s0 + segs[k].len) k++;
    const g = segs[k], t = s - g.s0;
    out.x = g.x1 + g.dx * t; out.y = g.y1 + g.dy * t; out.dx = g.dx; out.dy = g.dy;
    return out;
  };
  return { segs, PERIM: total, path };
}

function makeLayout(kind, boards, pts, extra) {
  const nCells = boards.length * 18;
  const cellRect = (i) => { const b = boards[(i / 18) | 0], j = i % 18; return [b.x + (j % COLS) * CELL, b.y + ((j / COLS) | 0) * CELL]; };
  const CX = new Float32Array(nCells), CY = new Float32Array(nCells);
  for (let i = 0; i < nCells; i++) { const [x, y] = cellRect(i); CX[i] = x + CELL / 2; CY[i] = y + CELL / 2; }
  const cx = (i) => CX[i];
  const cy = (i) => CY[i];
  const cellAt = (x, y) => {
    for (let o = 0; o < boards.length; o++) {
      const b = boards[o];
      const c = Math.floor((x - b.x) / CELL), r = Math.floor((y - b.y) / CELL);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) return o * 18 + r * COLS + c;
    }
    return -1;
  };
  const NB = Array.from({ length: nCells }, (_, i) => {
    const o = (i / 18) | 0, j = i % 18, r = (j / COLS) | 0, c = j % COLS, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(o * 18 + rr * COLS + cc);
    }
    return out;
  });
  return { kind, boards, nCells, cellRect, CX, CY, cx, cy, cellAt, NB, ownerOf: (i) => (i / 18) | 0, pts, ...polyPath(pts), ...extra };
}

export const SOLO = makeLayout('solo', [{ x: BX, y: BY }], [[PL, PT], [PR, PT], [PR, PB], [PL, PB]], {
  view: { x: 0, y: 0, w: W, h: H }, landView: { x: 0, y: 80, w: W, h: 228 }, fieldLimit: 100,
});

// 협동: 위 보드(주인 1) · 아래 보드(주인 0), 8자 길
const CT = 74, CM = 246, CB = 418;
export const COOP = makeLayout('coop', [{ x: BX, y: CM + 14 }, { x: BX, y: CT + 14 }],
  [[PL, CT], [PR, CT], [PR, CM], [PL, CM], [PL, CB], [PR, CB], [PR, CM], [PL, CM]], {
    view: { x: 0, y: 56, w: W, h: 384 }, landView: { x: 0, y: 56, w: W, h: 384 }, fieldLimit: 150,
    mirrorY: CT + CB, // 참가자 화면: 위아래를 뒤집어 자기 보드가 아래로
  });

// 위아래 뒤집기: 주인 교체 + 행 뒤집기
export const mirrorCell = (i) => { if (i < 0) return i; const o = (i / 18) | 0, j = i % 18, r = (j / COLS) | 0, c = j % COLS; return (1 - o) * 18 + (2 - r) * COLS + c; };

// ── 1인용 하위 호환 ──
export const PERIM = SOLO.PERIM;
export const cellX = SOLO.cx;
export const cellY = SOLO.cy;
export const cellAt = SOLO.cellAt;
export const pathPos = SOLO.path;
export const NEIGHBORS = SOLO.NB;
