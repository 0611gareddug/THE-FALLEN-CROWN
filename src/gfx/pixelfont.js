// 3×5 픽셀 숫자 폰트 → 색상별 글리프를 미리 구워 빠르게 찍는다.
const GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  '.': ['000', '000', '000', '000', '010'],
  k: ['100', '101', '110', '101', '101'],
  m: ['000', '000', '111', '111', '101'],
  '+': ['000', '010', '111', '010', '000'],
  '!': ['010', '010', '010', '000', '010'],
};

const cache = new Map();

function glyphSheet(color) {
  if (cache.has(color)) return cache.get(color);
  const keys = Object.keys(GLYPHS);
  const c = document.createElement('canvas');
  c.width = keys.length * 5;
  c.height = 7;
  const g = c.getContext('2d');
  const map = {};
  keys.forEach((k, i) => {
    const ox = i * 5;
    map[k] = ox;
    const rows = GLYPHS[k];
    // 외곽선
    g.fillStyle = '#1b1622';
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 3; x++)
        if (rows[y][x] === '1') g.fillRect(ox + x, y, 3, 3);
    g.fillStyle = color;
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 3; x++)
        if (rows[y][x] === '1') g.fillRect(ox + x + 1, y + 1, 1, 1);
  });
  const sheet = { c, map };
  cache.set(color, sheet);
  return sheet;
}

export function fmtNum(v) {
  if (v < 1000) return String(Math.max(1, Math.round(v)));
  if (v < 1e6) return (v / 1000).toFixed(v < 10000 ? 1 : 0) + 'k';
  return (v / 1e6).toFixed(1) + 'm';
}

// 중앙 정렬로 문자열을 찍는다. scale = 논리 px 배율
export function drawNum(ctx, str, cx, y, color, scale = 1) {
  const sheet = glyphSheet(color);
  const w = str.length * 4 * scale;
  let x = Math.round(cx - w / 2);
  for (let i = 0; i < str.length; i++) {
    const ox = sheet.map[str[i]];
    if (ox !== undefined) ctx.drawImage(sheet.c, ox, 0, 5, 7, x, Math.round(y), 5 * scale, 7 * scale);
    x += 4 * scale;
  }
}
