// 코드로 정의한 픽셀아트 → 시작 시 한 번만 오프스크린 캔버스로 굽는다.

import { buildArt2 } from './art2.js';

const BASE = {
  o: '#1b1622', s: '#f1c9a5', S: '#c9946f', e: '#2a1d2e', b: '#f08a8a',
  g: '#e8c25a', G: '#a87a2a', w: '#d9dde6', W: '#8a90a0', x: '#7a4b2a', X: '#4e2f1a',
  l: '#fff7e0', r: '#d0463b', k: '#3a3344', K: '#26212e', y: '#ffe36b', f: '#ff8a3a', F: '#e0463a',
  i: '#a8e4ff', I: '#5fa8e0', p: '#c99bff', P: '#7a4bb0', n: '#9be08a', N: '#4f9a4a', z: '#ffffff',
};

// ── 유닛 몸체 템플릿 (16×16) ──
const T = {
  knight: [
    '.......cc.......',
    '......occo....w.',
    '.....owwwwo...w.',
    '....owwlwwwo..w.',
    '....owwwwwwo..w.',
    '....oWWWWWWo..x.',
    '....osesseso..x.',
    '....osbssbso..x.',
    '.....oaaaao..ox.',
    '..ooooaggaooosx.',
    '..ogcoaaaaaoox..',
    '..occoAaaaAo.x..',
    '..ogcoaaaaao.x..',
    '...ooooAAoo..x..',
    '....oWo.oWo.....',
    '....ooo.ooo.....',
  ],
  archer: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao..o.',
    '...oaalaaaaao.ox',
    '...oahhhhhhao.oX',
    '...ohsesseshoo.X',
    '...oosbssbsoo..X',
    '....osssssso..oX',
    '....ocaaaaco..oX',
    '...ooaaggaaoososX',
    '...oscaaaaacoo.X',
    '....ocAaaAco..oX',
    '....oaaaaaao..ox',
    '....ooAooAoo..o.',
    '....oxo..oxo....',
    '....ooo..ooo....',
  ],
  mage: [
    '.......oo.......',
    '......oaao......',
    '.....oaayao.....',
    '....oaaaaaao..oo',
    '...oaaaaaaaao.oc',
    '..oogggggggggooc',
    '...ohhhhhhhho.oo',
    '...ohsesseshoox.',
    '....osbssbso..x.',
    '....oaaaaaao.osx',
    '...oaaagaaaaoox.',
    '...oaaagaaaao.x.',
    '..oAaaagaaaAo.x.',
    '..oAAaaaaaAAo.x.',
    '...oooooooooo.x.',
    '..............o.',
  ],
  priest: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '...oaagggggao...',
    '...oahhhhhhao...',
    '...oasesseso.oo.',
    '...oasbssbsaoyyo',
    '...oaasssssaoyyo',
    '...oaaaaaaaao.go',
    '..oaaaagaaaaoxo.',
    '..oaaagggaaaoso.',
    '..oaaaagaaaaox..',
    '..oAaaagaaaAo.x.',
    '..oAAaaaaaAAo.x.',
    '...oooooooooo.x.',
    '..............o.',
  ],
  rogue: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '...oaalaaaaao...',
    '...oahhhhhhao...',
    '...ohsesseshoo..',
    '...ooccccccoo...',
    '....occccco.....',
    '...ooaaaaaoo..o.',
    '..owoaaggaaoso.w',
    '..oWsaaaaaaoo.w.',
    '...ooAaaaAoo.W..',
    '....oaaaaaao.o..',
    '....ooAooAoo....',
    '....okoo.oko....',
    '....ooo..ooo....',
  ],
};

// 유닛별 팔레트 (몸체 템플릿 위에 색을 덮어 개성을 준다)
const UP = {
  // 견습: 마을 사람들
  spear: { t: 'knight', a: '#6aa04a', A: '#4a7a32', c: '#e8b84a', w: '#ecd590', W: '#b89a5a' },
  hunter: { t: 'archer', a: '#9a7040', A: '#6e4e2a', c: '#c89a5a', h: '#8a5a2a' },
  ember: { t: 'mage', a: '#f4f0e6', A: '#c8bfae', h: '#a86a3a', c: '#ff8a3a' },
  nun: { t: 'priest', a: '#f4f0ff', A: '#c8c0e0', h: '#e8b860' },
  // 숙련
  shield: { t: 'knight', a: '#5a8ad0', A: '#3a62a0', c: '#e8c25a', w: '#d2d6de', W: '#8a92a0' },
  xbow: { t: 'archer', a: '#7ab05a', A: '#4f8a3a', c: '#b08a50', h: '#5a3a1a' },
  frost: { t: 'mage', a: '#ff9ac2', A: '#d06a96', h: '#ffe8a0', c: '#a8e4ff' },
  pick: { t: 'rogue', a: '#c8884a', A: '#9a6430', c: '#f0c060', h: '#5a3a1a' },
  // 정예
  ashguard: { t: 'knight', a: '#3a7ad0', A: '#2a5a9a', c: '#ffd36b', w: '#dfe6f0', W: '#9aa6bc' },
  twin: { t: 'archer', a: '#4a9ac8', A: '#2f72a0', c: '#ffe08a', h: '#e0a040' },
  storm: { t: 'mage', a: '#4a6ad8', A: '#2f4aa8', h: '#fff4c0', c: '#ffe36b' },
  shade: { t: 'rogue', a: '#5a5a9a', A: '#3e3e72', c: '#8a8ad0', h: '#2a2a4a' },
  // 영웅
  paladin: { t: 'priest', a: '#f4f0ff', A: '#c0b0e0', h: '#ffd36b', g: '#c99bff' },
  wind: { t: 'archer', a: '#5ac0a0', A: '#3a9078', c: '#e0fff0', h: '#e0e0f0' },
  alch: { t: 'mage', a: '#9a6ad0', A: '#7046a8', h: '#f0c060', c: '#9be08a' },
  duel: { t: 'knight', a: '#c8ccd8', A: '#8a90a4', c: '#9b5fd6', w: '#f4f6fa', W: '#a0a8bc' },
  // 전설
  phoenix: { t: 'knight', a: '#e0602a', A: '#a8401a', c: '#ffcf4a', w: '#ffe0a0', W: '#e09a40' },
  star: { t: 'mage', a: '#3a4aa8', A: '#26307a', h: '#f0f0ff', c: '#ffe36b', g: '#ffe36b' },
  dusk: { t: 'archer', a: '#e07050', A: '#b04a3a', c: '#ffd080', h: '#5a2a1a' },
  mask: { t: 'rogue', a: '#c04a6a', A: '#8a2e4a', c: '#ffd36b', h: '#3a1a2a' },
  // 천상: 전설 속 영웅들
  swordking: { t: 'knight', a: '#f0c040', A: '#b88a1a', c: '#ffffff', w: '#fff6d0', W: '#d8b050', g: '#ffffff' },
  witch: { t: 'mage', a: '#5a46a8', A: '#3a2c7a', h: '#d8ccff', c: '#a8e4ff', g: '#c99bff' },
  skybow: { t: 'archer', a: '#eef6ff', A: '#a8bce0', c: '#7ad0ff', h: '#ffe890' },
  saint: { t: 'priest', a: '#fffaf0', A: '#e8d0a8', h: '#ffeca8', g: '#ffb0d8' },
  nameless: { t: 'rogue', a: '#46345e', A: '#2e2042', c: '#ffd36b', h: '#2a1a30' },
};

// ── 적 템플릿 (12×12, 오른쪽을 바라봄) ──
const E = {
  rat: [
    '............',
    '............',
    '............',
    '.....oo.....',
    '..oooaaoo...',
    '.oaaaaaaaoo.',
    'oaAaaaaaaeoo',
    'oaaaaaaaaaar',
    '.oaaaaaaaoo.',
    '..oAo..oAo..',
    'oo.o....o...',
    '............',
  ],
  skel: [
    '....oooo....',
    '...owwwwo...',
    '...owewewo..',
    '...owwwwwo..',
    '....oWwWo...',
    '...oowwwoo..',
    '..ow.oWo.wo.',
    '..o.owwwo.o.',
    '....oWWWo...',
    '....ow.wo...',
    '...owo.owo..',
    '...ooo.ooo..',
  ],
  corpse: [
    '....oooo....',
    '...oWWWWo...',
    '..oWwwwwWo..',
    '..oWonnnoo..',
    '...onennoo..',
    '..oooWWooo..',
    '.oWoWwwWoWo.',
    '.ono.WWWonno',
    '....oWWWo...',
    '....oW.Wo...',
    '...oWo.oWo..',
    '...ooo.ooo..',
  ],
  ember: [
    '.....o......',
    '....oyo..o..',
    '...oyfyo.oo.',
    '..oyffyo.of.',
    '..offffoof..',
    '.offeffeffo.',
    '.ofFffffFfo.',
    '.oFfFffFfFo.',
    '..oFFffFFo..',
    '...oFFFFo...',
    '....oooo....',
    '............',
  ],
  bat: [
    '............',
    '............',
    'o....oo....o',
    'oo..oaao..oo',
    'oao.oeaeo.ao',
    'oaaoaaaaoaao',
    '.oaaaAAaaao.',
    '..ooaaaaoo..',
    '....oooo....',
    '............',
    '............',
    '............',
  ],
  toad: [
    '............',
    '............',
    '..oo....oo..',
    '.oeao..oaeo.',
    '.oaaooooaao.',
    'oaaaaaaaaaao',
    'oaAaaaaaaAao',
    'oarrrrrrrrao',
    'oaaaaaaaaaao',
    '.oAaAaaAaAo.',
    'oaaooooooaao',
    'ooo......ooo',
  ],
  wraith: [
    '....oooo....',
    '...oiiiio...',
    '..oiiiiiio..',
    '..oieiieio..',
    '..oiiiiiio..',
    '.oiiiooiiio.',
    '.oiiiiiiiio.',
    '.oIiiiiiiIo.',
    '..oIiiiiIo..',
    '..oIoiIoIo..',
    '...o.oo.o...',
    '............',
  ],
  slime: [
    '............',
    '............',
    '............',
    '.....oo.....',
    '....onno....',
    '...onlnnno..',
    '..onnnnnnno.',
    '..onennennno',
    '.onnnnnnnnno',
    '.oNnnnnnnNNo',
    '..oNNNNNNNo.',
    '...ooooooo..',
  ],
  mini: [
    '............',
    '............',
    '............',
    '............',
    '............',
    '.....oo.....',
    '....onlo....',
    '...onnnno...',
    '...oenenno..',
    '..oNnnnnNo..',
    '...oNNNNo...',
    '....oooo....',
  ],
};
// 마왕군 졸개들 (밝은 동화풍 색)
const EP = {
  rat: { a: '#a08870', A: '#7a6450' },
  skel: { w: '#8fd06a', W: '#5fa040', e: '#c0392b' },
  corpse: { w: '#8fd06a', W: '#9aa0b0', n: '#7ac05a', e: '#c0392b' },
  bat: { a: '#8a5ab0', A: '#5e3a80' },
  toad: { a: '#6ab04a', A: '#4a8a32', r: '#ff9ac2' },
};

// ── 보스 오그란 (24×24) ──
const OGRAN = [
  '........oooooooo........',
  '......ooffyfffyfoo......',
  '.....oFfffffffffffo.....',
  '....oaaaaaaaaaaaaaao....',
  '...oaaaaaaaaaaaaaaaao...',
  '...oaayyaaaaaaaayyaao...',
  '...oaayeaaaaaaaaeyaao...',
  '...oaaaaaaaaaaaaaaaao...',
  '...oaaaaowwwwwwoaaaao...',
  '....oaaaowowowwoaaao....',
  '..ooooaaaooooooaaaoooo..',
  '.oaaaaoaaaaaaaaaaoaaaao.',
  'oaaAaaoaaFaafaaFaaoaAaao',
  'oaaAaoaaaaFfffaaaaaoAaao',
  'oaaaoaaaaaFffFaaaaaaoaao',
  'oAaao.oaaaaFFaaaaao.oaao',
  '.ooo..oaaaaaaaaaaao..oo.',
  '......oAaaaaaaaaaAo.....',
  '......oAAaaoooaaAAo.....',
  '......oaaaao.oaaaao.....',
  '.....oaaaaao.oaaaaao....',
  '.....oAAAAao.oaAAAAo....',
  '.....ooooooo.ooooooo....',
  '........................',
];
const OGRAN_P = { a: '#5a4a46', A: '#3a2e2c' };

// ── 마스코트 뿌루 (12×12) ──
const PURU = [
  '....oo......',
  '...oago.....',
  '..oaaaaoo...',
  '.oaaeaaayo..',
  '.oaaaaaayyo.',
  '.obaaaaaoo..',
  'oaaaaaaao...',
  'oaAaaaaaao..',
  'oaAAaaaaao..',
  '.oaaaaaao...',
  '..oyoooyo...',
  '..oo...oo...',
];
const PURU_P = { a: '#ffe48a', A: '#e8b84a', g: '#ff9a3a' };

// ── 왕관 (왕족 초상 덮어쓰기용, 16 폭) ──
const CROWN = [
  '....o.o..o.o....',
  '....ogogogo.....',
  '....ogggggo.....',
  '....ooooooo.....',
];

// 행운의 용사단 3인 (내부 id는 그대로): 레오 · 미나 · 피크. 머리 위에 행운의 네잎클로버
const ROYAL_P = {
  edric: { t: 'knight', a: '#4a8ae0', A: '#2f5fa8', c: '#f0d27a', w: '#eef2f8', W: '#9aa6bc', crown: 0 },
  seren: { t: 'mage', a: '#4a7fd0', A: '#2e5aa8', h: '#ffb3cf', c: '#ffd36b', y: '#ffd36b', crown: 0 },
  kyle: { t: 'archer', a: '#5aa04a', A: '#3a7a30', c: '#a8703e', h: '#5a3a1e', crown: 1 },
};
const CLOVER = [
  '.......o.o......',
  '......ogogo.....',
  '.......ogo......',
  '........s.......',
];
const CLOVER_P = { g: '#5fd068', s: '#2f7a2f' };

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' && !globalThis.document ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function paint(rows, pal, w = 16, h = 16, ox = 0, oy = 0, ctx = null) {
  const c = ctx ? null : makeCanvas(w, h);
  const g = ctx || c.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length && x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = pal[ch] || BASE[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + ox, y + oy, 1, 1);
    }
  }
  return c;
}

// 실루엣 (외곽 발광 / 피격 번쩍임용)
function silhouette(src, color, pad) {
  const w = src.width + pad * 2, h = src.height + pad * 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  if (pad) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(src, pad + dx, pad + dy);
  } else g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  return c;
}

function flip(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}


export const SPR = { units: {}, enemies: {}, boss: null, puru: null, royals: {}, mascots: {}, ready: false };

export function buildSprites(tierGlows) {
  for (const [id, p] of Object.entries(UP)) {
    const pal = { ...p, h: p.h || '#6a4a2a', H: p.H || '#4a3020' };
    const body = paint(T[p.t], pal);
    const isCel = ['swordking', 'witch', 'skybow', 'saint', 'nameless'].includes(id);
    if (isCel) {
      // 머리 위 후광
      const g = body.getContext('2d');
      g.fillStyle = '#ffe36b';
      g.fillRect(5, 0, 6, 1);
    }
    const flipped = flip(body);
    SPR.units[id] = {
      r: body, l: flipped,
      glow: tierGlows.map((col) => [silhouette(body, col, 1), silhouette(flipped, col, 1)]),
      flash: silhouette(body, '#ffffff', 0),
    };
  }
  for (const [id, rows] of Object.entries(E)) {
    const pal = EP[id] || {};
    const r = paint(rows, pal, 12, 12);
    const l = flip(r);
    SPR.enemies[id] = { r, l, fr: silhouette(r, '#ffffff', 0), fl: silhouette(l, '#ffffff', 0) };
  }
  const br = paint(OGRAN, OGRAN_P, 24, 24);
  const bl = flip(br);
  SPR.boss = { r: br, l: bl, fr: silhouette(br, '#ffffff', 0), fl: silhouette(bl, '#ffffff', 0) };
  const pr = paint(PURU, PURU_P, 12, 12);
  SPR.puru = { r: pr, l: flip(pr) };
  for (const [id, p] of Object.entries(ROYAL_P)) {
    const c = makeCanvas(16, 20);
    const g = c.getContext('2d');
    paint(T[p.t], { ...p, h: p.h || '#6a4a2a' }, 16, 16, 0, 4, g);
    paint(CLOVER, CLOVER_P, 16, 4, 0, p.crown, g);
    SPR.royals[id] = c;
  }
  buildArt2(SPR, flip, silhouette);
  SPR.mascots.puru = SPR.puru;
  SPR.ready = true;
}

// DOM용 이미지 (도감, 카드)
const urlCache = new Map();
export function spriteURL(canvas, scale = 4) {
  const key = canvas;
  if (urlCache.has(key) && urlCache.get(key).scale === scale) return urlCache.get(key).url;
  const c = document.createElement('canvas');
  c.width = canvas.width * scale; c.height = canvas.height * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(canvas, 0, 0, c.width, c.height);
  const url = c.toDataURL();
  urlCache.set(key, { scale, url });
  return url;
}
export function silhouetteURL(canvas, scale = 4) {
  return spriteURL(silhouette(canvas, '#2a2533', 0), scale);
}
