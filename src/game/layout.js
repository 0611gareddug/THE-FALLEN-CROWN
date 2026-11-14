// 논리 해상도 360×640 기준 전장 배치
export const W = 360;
export const H = 640;

export const COLS = 6;
export const ROWS = 3;
export const CELL = 48;
export const BX = 36; // 보드 왼쪽
export const BY = 124; // 보드 위쪽

// 몬스터가 도는 길(중심선)
export const PL = 22;
export const PR = 338;
export const PT = 110;
export const PB = 282;
const PW = PR - PL;
const PH = PB - PT;
export const PERIM = 2 * (PW + PH);

export const cellX = (i) => BX + (i % COLS) * CELL + CELL / 2;
export const cellY = (i) => BY + ((i / COLS) | 0) * CELL + CELL / 2;

export function cellAt(x, y) {
  const c = Math.floor((x - BX) / CELL);
  const r = Math.floor((y - BY) / CELL);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
  return r * COLS + c;
}

// 길 위의 위치 s → 좌표/방향 (시계 방향)
export function pathPos(s, out) {
  s %= PERIM;
  if (s < 0) s += PERIM;
  if (s < PW) { out.x = PL + s; out.y = PT; out.dx = 1; out.dy = 0; }
  else if (s < PW + PH) { out.x = PR; out.y = PT + (s - PW); out.dx = 0; out.dy = 1; }
  else if (s < 2 * PW + PH) { out.x = PR - (s - PW - PH); out.y = PB; out.dx = -1; out.dy = 0; }
  else { out.x = PL; out.y = PB - (s - 2 * PW - PH); out.dx = 0; out.dy = -1; }
  return out;
}

export function neighbors(i) {
  const r = (i / COLS) | 0, c = i % COLS, out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
    }
  return out;
}
export const NEIGHBORS = Array.from({ length: COLS * ROWS }, (_, i) => neighbors(i));
