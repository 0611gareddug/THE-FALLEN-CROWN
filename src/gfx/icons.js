// 지도 칸 · 자원 픽셀 아이콘 (9×9) → dataURL
const ICONS = {
  battle: ['o.......o', '.o.....o.', '..o...o..', '...o.o...', '....o....', '...o.o...', '.oo...oo.', '.oo...oo.', '.........'],
  elite: ['..ooooo..', '.ooooooo.', 'oo.ooo.oo', 'ooooooooo', '.ooo.ooo.', '..ooooo..', '..o.o.o..', '.........', '.........'],
  event: ['..ooooo..', '.oo...oo.', '......oo.', '....ooo..', '...oo....', '...oo....', '.........', '...oo....', '.........'],
  shop: ['....o....', '.ooooooo.', '.o..o..o.', 'ooo.o.ooo', 'ooo.o.ooo', '....o....', '....o....', '..ooooo..', '.........'],
  camp: ['....o....', '...ooo...', '..oo.o...', '..ooooo..', '...ooo...', '.o.....o.', '..ooooo..', '.o.....o.', '.........'],
  treasure: ['....o....', '...ooo...', 'ooooooooo', '.ooooooo.', '..ooooo..', '..oo.oo..', '.oo...oo.', '.........', '.........'],
  altar: ['ooooooooo', 'o.......o', 'o.oo.oo.o', 'o.oo.oo.o', 'o.......o', 'o.oo.oo.o', 'o.oo.oo.o', 'ooooooooo', '.........'],
  boss: ['o..o.o..o', 'oo.ooo.oo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.o.o.o.o.', '.ooooooo.', '.........', '.........'],
  dragon: ['o.......o', 'oo.....oo', '.ooooooo.', '.o.ooo.o.', '.ooooooo.', '..ooooo..', '...o.o...', '..o...o..', '.........'],
  fate: ['.o..o..o.', '.oo.o.oo.', '.ooooooo.', '.o.ooo.o.', '..ooooo..', '....o....', '...ooo...', '..o.o.o..', '.........'],
  shard: ['....o....', '...ooo...', '..ooooo..', '.ooo.ooo.', '..ooooo..', '...ooo...', '....o....', '.........', '.........'],
};

const cache = new Map();
export function iconURL(name, color = '#e8c25a', scale = 3) {
  const key = name + color + scale;
  if (cache.has(key)) return cache.get(key);
  const rows = ICONS[name] || ICONS.event;
  const c = document.createElement('canvas');
  c.width = 9 * scale; c.height = 9 * scale;
  const g = c.getContext('2d');
  g.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'o') g.fillRect(x * scale, y * scale, scale, scale); }));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
