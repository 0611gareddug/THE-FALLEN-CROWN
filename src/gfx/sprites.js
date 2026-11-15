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
  spear: { t: 'knight', a: '#8a8f99', A: '#5d6270', c: '#b04a3a', w: '#c9ced8', W: '#7d8494' },
  hunter: { t: 'archer', a: '#6b7f4a', A: '#4a5a30', c: '#8a6a3a', h: '#6a4a2a' },
  ember: { t: 'mage', a: '#a0503a', A: '#6e3226', h: '#4a2a1a', c: '#ff8a3a' },
  nun: { t: 'priest', a: '#d8d4cc', A: '#a8a29a', h: '#6a4a2a' },
  shield: { t: 'knight', a: '#4f7a4a', A: '#35552f', c: '#e8c25a', w: '#b8c4b0', W: '#6f8068' },
  xbow: { t: 'archer', a: '#3f6a3a', A: '#2a4a26', c: '#9a7a4a', h: '#3a2a1a' },
  frost: { t: 'mage', a: '#3f78b0', A: '#284f7a', h: '#d8e8ff', c: '#a8e4ff' },
  pick: { t: 'rogue', a: '#5a4a3a', A: '#3a2e24', c: '#7a6a5a', h: '#8a5a2a' },
  ashguard: { t: 'knight', a: '#4a5f8a', A: '#2e3d5e', c: '#9aa6c0', w: '#aab4c8', W: '#5d6782' },
  twin: { t: 'archer', a: '#3a5f9a', A: '#263f6a', c: '#c0c8d8', h: '#e0c060' },
  storm: { t: 'mage', a: '#3a4f9a', A: '#26346a', h: '#f0f0ff', c: '#ffe36b' },
  shade: { t: 'rogue', a: '#2e3a5a', A: '#1e263e', c: '#4a5a8a', h: '#1a1a2a' },
  paladin: { t: 'priest', a: '#e8e0f0', A: '#b0a0c8', h: '#e0c060', g: '#c99bff' },
  wind: { t: 'archer', a: '#7a4bb0', A: '#523080', c: '#c0f0d0', h: '#c0c0d0' },
  alch: { t: 'mage', a: '#6a3a8a', A: '#46265e', h: '#3a2a3a', c: '#9be08a' },
  duel: { t: 'knight', a: '#b8bccc', A: '#7d8294', c: '#9b5fd6', w: '#f0f2f8', W: '#9aa0b4' },
  phoenix: { t: 'knight', a: '#c0502a', A: '#86341a', c: '#ffcf4a', w: '#ffd890', W: '#d08a30' },
  star: { t: 'mage', a: '#2a2f6a', A: '#1a1e46', h: '#f0f0ff', c: '#ffe36b', g: '#ffe36b' },
  dusk: { t: 'archer', a: '#8a3a4a', A: '#5e2632', c: '#ffb070', h: '#2a1a1a' },
  mask: { t: 'rogue', a: '#5a2a3a', A: '#3e1a26', c: '#e8c25a', h: '#1a1018' },
  swordking: { t: 'knight', a: '#e0b23a', A: '#a07a1a', c: '#ffffff', w: '#fff4c0', W: '#c8a040', g: '#ffffff' },
  witch: { t: 'mage', a: '#1e1a3a', A: '#120f26', h: '#c0b0ff', c: '#a8e4ff', g: '#c99bff' },
  skybow: { t: 'archer', a: '#e8f0ff', A: '#a0b0d0', c: '#7ad0ff', h: '#ffe080' },
  saint: { t: 'priest', a: '#fff8e8', A: '#e0c8a0', h: '#ffe9a0', g: '#ffb0d8' },
  urchin: { t: 'rogue', a: '#8a6a4a', A: '#5a4430', c: '#c8a070', h: '#5a3a1a' },
  bell: { t: 'priest', a: '#b8a888', A: '#8a7a60', h: '#4a3a2a', g: '#e8c25a' },
  pilgrim: { t: 'priest', a: '#d8e8f0', A: '#98b0c0', h: '#e8d0a0', g: '#7ad0ff' },
  viper: { t: 'rogue', a: '#2a5a3a', A: '#1a3a26', c: '#9be08a', h: '#1a1a1a' },
  bishop: { t: 'priest', a: '#f0f4ff', A: '#b8c4e0', h: '#d8d8e8', g: '#ffd36b' },
  nameless: { t: 'rogue', a: '#1a1420', A: '#0e0a12', c: '#e8c25a', h: '#0a0a0a' },
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
Object.assign(E, {
  shellsnail: [
    '............',
    '............',
    '.....oooo...',
    '....oxxxxo..',
    '...oxXyyXxo.',
    '...oxyXXyxo.',
    'o..oxXyyXxo.',
    'oao.oxxxxo..',
    'oaaooooooo..',
    'oeaaaaaaaao.',
    '.oaaaaaaaaao',
    '..ooooooooo.',
  ],
  bunny: [
    '...oo.oo....',
    '..owo.owo...',
    '..owo.owo...',
    '..owoowwo...',
    '.owwwwwwo...',
    '.oweowwwo...',
    'obwwwwwwwo..',
    '.oowwwwwwwo.',
    '..owwwwwwwoo',
    '..owwWwwwwzo',
    '..oWoooWWoo.',
    '..oo...oo...',
  ],
  crab: [
    '............',
    'oo........oo',
    'oroo....ooro',
    'orrro..orrro',
    '.oro.oo.oro.',
    '..oorrrroo..',
    '.orerrrrero.',
    'orrrrrrrrrro',
    'oRrrrrrrrrRo',
    '.oRRRRRRRRo.',
    'o.o.o..o.o.o',
    '............',
  ],
  jelly: [
    '............',
    '....oooo....',
    '...ojjjjo...',
    '..ojljjjjo..',
    '..ojjjjjjo..',
    '.ojejjjejjo.',
    '.ojjjjjjjjo.',
    '.oJJJJJJJJo.',
    '..ojojojo...',
    '..oj.oj.jo..',
    '...o.oj.o...',
    '......o.....',
  ],
  cloudling: [
    '............',
    '....oooo....',
    '..ooccccoo..',
    '.occccccccco',
    'occcccccccco',
    'occeccceccco',
    'occccccccco.',
    '.oCCCccCCCo.',
    '..oCCCCCCo..',
    '...oyo.oyo..',
    '....oy..oy..',
    '............',
  ],
  golem: [
    '...oooooo...',
    '..oaaaanao..',
    '.oaaannaaao.',
    '.oaeaaaaeao.',
    '.oaaaaaaaao.',
    'ooaAAAAAAaoo',
    'oaoaaanaaoao',
    'oaoannaaaoao',
    'oAoaaaaaaoAo',
    'oo.oAaaAo.oo',
    '...oaaoaao..',
    '...oooooooo.',
  ],
  imp: [
    '............',
    '..o......o..',
    '..oro..oro..',
    '...orrrro...',
    '..orrrrrro..',
    '..oryrryro..',
    '..orrwwrro..',
    '...orrrro.o.',
    '..orRrrRroro',
    '..oro..oro..',
    '..oo....oo..',
    '............',
  ],
  darkknight: [
    '....oooo....',
    '...okkkko...',
    '...okrrko...',
    '...okkkko...',
    '..ooooooooo.',
    '.okkokkkkogo',
    '.okkokpkkogo',
    '.okkokkkkogo',
    '..oookkkko..',
    '....okKko...',
    '...oko.oko..',
    '...ooo.ooo..',
  ],
});
const EP = {
  shellsnail: { a: '#c8b890', x: '#8a5a8a', X: '#5a3a6a', y: '#e8c25a' },
  bunny: { w: '#f0eae0', W: '#c0b8b0', b: '#f08a8a' },
  crab: { r: '#e05a3a', R: '#a03a26' },
  jelly: { j: '#c8a0f0', J: '#9070c0', l: '#ffffff' },
  cloudling: { c: '#8a8aa0', C: '#5a5a74', y: '#ffe36b' },
  golem: { a: '#8a8a7a', A: '#5a5a4e', n: '#6a9a4a' },
  imp: { r: '#c0303a', R: '#801a24', y: '#ffe36b', w: '#ffffff' },
  darkknight: { k: '#3a3448', K: '#22202e', r: '#ff4a4a', g: '#9a90b0', p: '#9b5fd6' },
  rat: { a: '#7a7380', A: '#5a5360' },
  bat: { a: '#5a3a6a', A: '#3a2448' },
  toad: { a: '#5a7a3a', A: '#3e5a26' },
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
const PURU_P = { a: '#b8b0a8', A: '#8a827a', g: '#e8c25a' };

// ── 왕관 (왕족 초상 덮어쓰기용, 16 폭) ──
const CROWN = [
  '....o.o..o.o....',
  '....ogogogo.....',
  '....ogggggo.....',
  '....ooooooo.....',
];

const ROYAL_P = {
  edric: { t: 'knight', a: '#c9a85c', A: '#8a7030', c: '#3a5fb0', w: '#e8ecf4', W: '#9aa2b4', crown: 0 },
  seren: { t: 'mage', a: '#6a4ab0', A: '#46307a', h: '#f0d0ff', c: '#c99bff', crown: 2 },
  kyle: { t: 'rogue', a: '#3a5a3a', A: '#263e26', c: '#5a7a5a', h: '#b06a2a', crown: 0 },
  nix: { t: 'rogue', a: '#5a3a7a', A: '#3a2452', c: '#e8892b', h: '#3a2a4a', crown: 0 },
};

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
    paint(CROWN, {}, 16, 4, 0, p.crown, g);
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
