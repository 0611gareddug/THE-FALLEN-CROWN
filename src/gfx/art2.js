// 2단계 아트: 정예 · 보스 · 마스코트 스프라이트, 인물 초상(표정), 장소 배경
const O = '#1b1622';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function paintRows(rows, pal, w, h) {
  const c = cv(w, h), g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length && x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      g.fillStyle = ch === 'o' ? O : pal[ch] || '#ff00ff';
      g.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

// ───────── 정예 (16×16) ─────────
export const ELITE_ART = {
  shieldlord: {
    rows: [
      '.....oooooo.....',
      '....owwwwwwo....',
      '...owwlwwwwwo...',
      '...owwwwwwwwo...',
      '...oWWWWWWWWo...',
      '...oWrrWWrrWo...',
      '....oWWWWWWo....',
      '..ooooaaaaoooo..',
      '.oggggaaaaoaao..',
      'oggrrggaaaoaaao.',
      'ogrrrrgaaaoaaao.',
      'oggrrggAaAoaao..',
      '.oggggoaaaoo....',
      '..ooooaaAaao....',
      '....oWWo.oWWo...',
      '....oooo.oooo...',
    ],
    pal: { w: '#9aa0b4', l: '#e8ecf4', W: '#5d6378', r: '#e0463a', a: '#4a4f62', A: '#2e3242', g: '#c9a85c' },
  },
  priestess: {
    rows: [
      '.....oooooo.....',
      '....owwwwwwo....',
      '...owwwwwwwwo...',
      '...owsssssswo...',
      '...owsessesw o..',
      '...owssbbsswo...',
      '...owwssssswwo..',
      '..owwwaaaaaawwo.',
      '..owaaaaggaaawo.',
      '.oaaaaaaggaaaaao',
      '.oaaaggggggaaao.',
      '..oaaaaggaaaaoyo',
      '..oaaaaggaaaaoyo',
      '..oAaaaaaaaaAo..',
      '..oAAAAAAAAAAo..',
      '...oooooooooo...',
    ],
    pal: { w: '#e8e0d0', s: '#e8c0a0', e: '#5a2a4a', b: '#f08a8a', a: '#5a8a7a', A: '#3a5a50', g: '#9be08a', y: '#9be08a' },
  },
  necro: {
    rows: [
      '......oooo......',
      '.....oaaaao.....',
      '....oaaaaaao....',
      '...oaaaaaaaao...',
      '...oaKKKKKKao...',
      '...oKKgKKgKKo..o',
      '...oKKKKKKKKo.op',
      '....oaKKKKao..op',
      '...oaaaaaaaao.ox',
      '..oaaaaaaaaaaoxo',
      '.oaaaaapaaaaaox.',
      '.oaaaapppaaaaox.',
      '.oAaaaapaaaaAox.',
      '.oAAaaaaaaaAAo..',
      '..oAAAAAAAAAAo..',
      '...oooooooooo...',
    ],
    pal: { a: '#3a2a4a', A: '#22182e', K: '#141018', g: '#9be08a', p: '#c99bff', x: '#5a4a3a' },
  },
  wolf: {
    rows: [
      '..oo......oo....',
      '.oao.....oao....',
      '.oaaoooooaao....',
      '.oaaaaaaaaao....',
      'oaaeaaaaaeaao...',
      'oaaaaaaaaaaao...',
      'oaaaawwwaaaaao..',
      '.oaaowwwoaaaaao.',
      '..ooaaaaaaaaaao.',
      '..oaaAaaaaAaaaao',
      '.oaaAAaaaaAAaaao',
      'oaaoAaaaaaaAoaao',
      'owoo.oaaaao.oowo',
      'oo...oaAAao...oo',
      '....oaao.oaao...',
      '....oooo.oooo...',
    ],
    pal: { a: '#6a6470', A: '#46404e', e: '#ffe36b', w: '#f0f0f0' },
  },
};

// ───────── 보스 (24×24) ─────────
export const BOSS_ART = {
  morven: {
    rows: [
      '.........oooooo.........',
      '........oggggggo........',
      '.......oggpggpggo.......',
      '.......oooooooooo.......',
      '.......osssssssso.......',
      '.......oseesseeso.......',
      '.......osssssssso.......',
      '.......oshhhhhhso.......',
      '........ohhhhhho........',
      '....oooooaaaaaaooooo....',
      '...oppppoaaggaaoppppo...',
      '..oppppppaaaaaapppppo...',
      '.oppppppaaaggaaappppppo.',
      '.opppppaaaaaaaaaapppppo.',
      '.oppppaaaaaggaaaaapppppo',
      '..oppaaaaaaaaaaaaaappo..',
      '...oaaaaaaggaaaaaaaao...',
      '...oaaaaaaaaaaaaaaaao...',
      '...oAaaaaaaggaaaaaaAo...',
      '...oAAaaaaaaaaaaaaAAo...',
      '...oAAAaaaaaaaaaaAAAo...',
      '....oAAAAAAAAAAAAAAo....',
      '.....oooooooooooooo.....',
      '........................',
    ],
    pal: { g: '#e8c25a', p: '#5a2a6a', s: '#d8b8a0', e: '#9b2a3a', h: '#c8c8d0', a: '#3a2a4a', A: '#22182e' },
  },
  silvana: {
    rows: [
      '........................',
      '..o.................o...',
      '.oio..............oio...',
      '.oiio....oooo....oiio...',
      '..oiio..oiiiio..oiio....',
      '...oiiooiiiiiiooiio.....',
      '....oiiiiwiiiwiiiio.....',
      '.....oiiibiiibiiio......',
      '.....oiiiiiiiiiiio......',
      '......oiiiwwwiiio.......',
      '...ooooiiwwwwwiioooo....',
      '..oiiiiiiiwwwiiiiiiio...',
      '.oiiIiiiiiiiiiiiiIiiio..',
      'oiiIIiiiiiiiiiiiiiIIiio.',
      'oiIIoiiiiiiiiiiiiioIIio.',
      '.oo.oiiiIiiiiiIiiio.oo..',
      '....oiiIIiiiiiIIiio.....',
      '....oiiIiiiiiiiIiio.....',
      '...oiiIo.oiiio.oIiio....',
      '...owwo..owwwo..owwo....',
      '...ooo...ooooo...ooo....',
      '........................',
      '........................',
      '........................',
    ],
    pal: { i: '#a8d8f0', I: '#6aa0d0', w: '#ffffff', b: '#2a4a8a' },
  },
  crown: {
    rows: [
      '........................',
      '...o....o....o....o.....',
      '..ogo..ogo..ogo..ogo....',
      '..oggo.oggooggo.oggo....',
      '..ogggogggrgggogggo.....',
      '..oggggggrrrgggggggo....',
      '..ogggggggrggggggggo....',
      '..ooooooooooooooooo.....',
      '..oGGGGGGGGGGGGGGGGo....',
      '..oGkkkkkkkkkkkkkkGo....',
      '..oGkyykkkkkkkyykkGo....',
      '..oGkyykkkkkkkyykkGo....',
      '..oGkkkkkkkkkkkkkkGo....',
      '..oGkkkkkyyyykkkkkGo....',
      '...oGkkkkkkkkkkkkGo.....',
      '....oGGGGGGGGGGGGo......',
      '.....oooooooooooo.......',
      '......k.k...k..k........',
      '.....k...k.k..k.........',
      '......k.....k...k.......',
      '........................',
      '........................',
      '........................',
      '........................',
    ],
    pal: { g: '#e8c25a', G: '#8a6a2a', r: '#d0463b', k: '#3a3344', y: '#ff8a3a' },
  },
  aspel: {
    rows: [
      '.........oooooo.........',
      '........orrrrrro........',
      '.......orrrrrrrro.......',
      '......orrrkkkkrrro......',
      '......orrkkKKkkrro......',
      '......orrkfkkfkrro......',
      '......orrkkkkkkrro......',
      '.......orrkkkkrro.......',
      '....ooooorrrrrrooooo....',
      '...orrrrrrrrrrrrrrrro...',
      '..orrrrrrrryyrrrrrrrro..',
      '..orrrrrrryffyrrrrrrro..',
      '.orrrrrrrrryyrrrrrrrrro.',
      '.orrorrrrrrrrrrrrrrorro.',
      'oxxo.orrrrrrrrrrrro.oxxo',
      'oxo..orrrrRRrrrrrro..oxo',
      '.o...orrrRRRRrrrrro...o.',
      '.....orrRRRRRRrrrro.....',
      '.....oRRRRRRRRRRRRo.....',
      '.....oRRRRRRRRRRRRo.....',
      '......oooooooooooo......',
      '........................',
      '........................',
      '........................',
    ],
    pal: { r: '#7a2a2a', R: '#4a1818', k: '#1a1018', K: '#2a2028', f: '#ff8a3a', y: '#ffe36b', x: '#9a9490' },
  },
  shadow: {
    rows: [
      '.........oooooo.........',
      '........okkkkkko........',
      '...o.o.okkkkkkkko.o.o...',
      '...okokokkkkkkkkokoko...',
      '....okkkkkkkkkkkkkko....',
      '.....okkkkkkkkkkkko.....',
      '.....okpkkkkkkkkpko.....',
      '.....okkkkkkkkkkkko.....',
      '......okkkpppkkkko......',
      '...oooookkkkkkkkoooooo..',
      '..okkkkkkkkkkkkkkkkkkko.',
      '.okkkkkkkkkkkkkkkkkkkko.',
      '.okkokkkkkkkkkkkkkkokko.',
      'okko.okkkkkkkkkkkko.okko',
      'oko..okkkkkkkkkkkko..oko',
      '.o...okkkkkkkkkkkko...o.',
      '.....okkkkkkkkkkkko.....',
      '.....okkkkko.okkkkko....',
      '....okkkkko...okkkkko...',
      '....okkkko.....okkkko...',
      '....ooooo.......ooooo...',
      '........................',
      '........................',
      '........................',
    ],
    pal: { k: '#2a2238', p: '#c99bff' },
  },
};

export const CULTIST = {
  rows: [
    '....oooo....',
    '...orrrro...',
    '..orrrrrro..',
    '..orkkkkro..',
    '..orkfkfro..',
    '...orkkro...',
    '..orrrrrro..',
    '.orrrrrrrro.',
    '.orryrrrrro.',
    '..orrrrrro..',
    '..oRRoRRRo..',
    '..ooo.ooo...',
  ],
  pal: { r: '#7a2a2a', R: '#4a1818', k: '#1a1018', f: '#ff8a3a', y: '#ffe36b' },
};

// ───────── 마스코트 (12×12) ─────────
export const MASCOT_ART = {
  cat: { rows: [
    '.o.......o..',
    'oao.....oao.',
    'oaaooooooao.',
    'oaaaaaaaaao.',
    'oaeaaaaeaao.',
    'oaaabbaaaao.',
    '.oaaaaaaao..',
    '.ogygogyggo.',
    'oaaaaaaaaao.',
    'oaaaaaaaaaoo',
    'oaoaaaoaaoao',
    'ooooooooooo.',
  ], pal: { a: '#e0a060', e: '#2a1d2e', b: '#f08a8a', g: '#e8c25a', y: '#d0463b' } },
  mimic: { rows: [
    '............',
    '.oooooooooo.',
    'oxxxxxxxxxxo',
    'oxgxxxxxxgxo',
    'oxxxxeexxxxo',
    'owwowwowwowo',
    'orrrrrrrrrro',
    'owowwowwowwo',
    'oxxxxxxxxxxo',
    'oxgxxxxxxgxo',
    'oxxxxxxxxxxo',
    '.oooooooooo.',
  ], pal: { x: '#8a5a2a', g: '#e8c25a', e: '#ffe36b', w: '#f0f0f0', r: '#d0463b' } },
  rock: { rows: [
    '............',
    '............',
    '............',
    '............',
    '....oooo....',
    '...oaaalo...',
    '..oaaaaaao..',
    '.oaaaaaaaao.',
    '.oaAaaaaaao.',
    '.oAAaaaaAao.',
    '..oAAAAAAo..',
    '...oooooo...',
  ], pal: { a: '#8a8490', A: '#5a5460', l: '#c8c2cc' } },
  owl: { rows: [
    '.oo......oo.',
    '.oaoooooooa.',
    'oaaaaaaaaaao',
    'owwwoaaowwwo',
    'owgwgoogwgwo',
    'owwwoyyowwwo',
    'oaaaaooaaaao',
    'oaabaaaabaao',
    'oabbbaabbbao',
    '.oaaaaaaaao.',
    '..oyo..oyo..',
    '..oo....oo..',
  ], pal: { a: '#8a6a4a', w: '#f0e8d0', g: '#2a1d2e', y: '#e8c25a', b: '#b08a6a' } },
  egg: { rows: [
    '............',
    '.....oo.....',
    '....oaao....',
    '...oaabao...',
    '..oaaaaaao..',
    '..oabaaaao..',
    '.oaaaaabaao.',
    '.oaaaaaaaao.',
    '.oabaaaaaao.',
    '.oaaaaabaao.',
    '..oaaaaaao..',
    '...oooooo...',
  ], pal: { a: '#e8dcc0', b: '#c99bff' } },
  snail: { rows: [
    '............',
    '............',
    '.....oooo...',
    '....oxxxxo..',
    '...oxxyyxxo.',
    '...oxyxxyxo.',
    'o.ooxxyyxxo.',
    'oaoaoxxxxo..',
    'oaaaooooo...',
    'oaeaaaaaaao.',
    '.oaaaaaaaaao',
    '..oooooooooo',
  ], pal: { x: '#a0603a', y: '#e8c25a', a: '#b8c8a0', e: '#2a1d2e' } },
  potato: { rows: [
    '............',
    '.....g......',
    '....gog.....',
    '.....o......',
    '...oooooo...',
    '..oaaaaaao..',
    '.oaabaaaaao.',
    '.oaaeaaeaao.',
    '.oaaaaaaabo.',
    '.oabaaaaaao.',
    '..oaaaaaao..',
    '...oooooo...',
  ], pal: { a: '#c8a060', b: '#9a7840', e: '#2a1d2e', g: '#7fbf6a' } },
};

// ───────── 동화풍 보스 (24×24, 코드로 그린다) ─────────
function bossCanvas(draw) {
  const c = cv(24, 24), g = c.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 타원 채우기 (외곽선 포함)
  const ell = (cx, cy, rx, ry, col, out = O, y0 = -99, y1 = 99) => {
    for (let pass = 0; pass < 2; pass++) {
      const ox = pass ? 0 : 1;
      for (let y = Math.floor(cy - ry - ox); y <= Math.ceil(cy + ry + ox); y++) {
        if (y < y0 || y > y1) continue;
        const t = (y - cy) / (ry + ox);
        if (Math.abs(t) > 1) continue;
        const hw = (rx + ox) * Math.sqrt(1 - t * t);
        px(Math.round(cx - hw), y, pass ? col : out, Math.round(hw * 2) || 1, 1);
      }
    }
  };
  draw(px, ell);
  return c;
}
const FAIRY_BOSS = {
  // 슬라임왕 퐁퐁: 왕관 쓴 커다란 초록 슬라임
  ogran: () => bossCanvas((px, ell) => {
    ell(12, 16, 11, 8, '#6fd36a', O, 7, 23);
    px(1, 22, O, 22, 1); px(2, 21, '#4aa84a', 20, 1);
    ell(12, 18, 9, 4, '#5cc25a', '#5cc25a', 16, 21);
    px(5, 10, '#c8f5b0', 3, 2); px(4, 12, '#c8f5b0', 2, 2); px(9, 9, '#e8ffd8', 2, 1);
    px(7, 13, O, 3, 4); px(14, 13, O, 3, 4); px(8, 13, '#ffffff', 1, 2); px(15, 13, '#ffffff', 1, 2);
    px(9, 18, O, 6, 1); px(10, 19, '#2a6a2a', 4, 1);
    px(5, 17, '#ff9ac2', 2, 1); px(17, 17, '#ff9ac2', 2, 1);
    // 왕관
    px(7, 3, O, 10, 5); px(8, 4, '#ffd36b', 8, 3); px(7, 1, O, 2, 3); px(11, 0, O, 2, 4); px(15, 1, O, 2, 3);
    px(8, 2, '#ffd36b', 1, 2); px(12, 1, '#ffd36b', 1, 3); px(15, 2, '#ffd36b', 1, 2); px(11, 5, '#e0463a', 2, 1);
    // 흘러내림
    px(3, 22, '#6fd36a', 2, 1); px(19, 22, '#6fd36a', 2, 1);
  }),
  // 문어 해적선장 먹물수염: 삼각모 · 안대 · 다리 여섯
  morven: () => bossCanvas((px, ell) => {
    for (let k = 0; k < 6; k++) {
      const x = 3 + k * 3.4 | 0, sway = k % 2 ? 1 : -1;
      px(x, 15, O, 4, 8); px(x + 1, 15, '#ff7a8a', 2, 7);
      px(x + sway, 21, O, 4, 3); px(x + 1 + sway, 21, '#ff7a8a', 2, 2);
      px(x + 1, 18, '#ffd0d6', 1, 1);
    }
    ell(12, 10, 8, 7, '#ff8a98', O, 2, 17);
    px(6, 7, '#ffc0c8', 3, 2);
    // 먹물 수염
    px(7, 14, '#4a2a5a', 10, 2); px(8, 16, '#4a2a5a', 8, 1); px(10, 17, '#4a2a5a', 4, 1);
    // 안대 + 눈
    px(7, 10, O, 4, 3); px(4, 9, O, 16, 1);
    px(14, 9, O, 4, 4); px(15, 10, '#ffffff', 2, 2); px(16, 11, O, 1, 1);
    // 삼각모
    px(3, 3, O, 18, 3); px(4, 4, '#3a2a4a', 16, 1); px(6, 0, O, 12, 4); px(7, 1, '#3a2a4a', 10, 2);
    px(7, 4, '#ffd36b', 10, 1); px(11, 1, '#ffffff', 2, 2);
  }),
  // 천둥 그리핀: 흰 독수리 머리 · 펼친 날개 · 번개
  griffin: () => bossCanvas((px, ell) => {
    // 날개
    for (let k = 0; k < 7; k++) {
      px(1 + k, 6 + k, O, 6, 3); px(2 + k, 7 + k, '#9fc8e8', 5, 1);
      px(17 - k, 6 + k, O, 6, 3); px(17 - k, 7 + k, '#9fc8e8', 5, 1);
    }
    px(2, 7, '#ffe36b', 1, 2); px(21, 7, '#ffe36b', 1, 2);
    ell(12, 15, 6, 5, '#e8c27a', O, 9, 21);
    px(8, 18, '#c89a50', 8, 2);
    px(8, 20, O, 3, 3); px(13, 20, O, 3, 3); px(9, 20, '#c89a50', 1, 2); px(14, 20, '#c89a50', 1, 2);
    ell(12, 7, 4, 4, '#ffffff', O, 2, 12);
    px(10, 6, O, 2, 2); px(14, 6, O, 2, 2); px(10, 6, '#ffe36b', 1, 1); px(14, 6, '#ffe36b', 1, 1);
    px(11, 8, O, 3, 3); px(12, 9, '#ffb030', 1, 2); px(11, 8, '#ffb030', 3, 1);
    // 번개 볏
    px(11, 0, O, 3, 3); px(12, 0, '#ffe36b', 1, 2); px(13, 2, '#ffe36b', 1, 1);
    // 꼬리
    px(18, 17, O, 4, 2); px(19, 17, '#e8c27a', 2, 1); px(21, 15, '#ffe36b', 1, 2);
  }),
  // 마왕 녹스: 보랏빛 망토 · 뿔 · 뾰족 왕관
  crown: () => bossCanvas((px, ell) => {
    px(3, 11, O, 18, 13); px(4, 12, '#4a2a6a', 16, 11); px(5, 13, '#c0392b', 3, 9); px(16, 13, '#c0392b', 3, 9);
    px(8, 13, '#2e1a44', 8, 10); px(11, 15, '#ffd36b', 2, 2);
    ell(12, 8, 5, 5, '#b9a3e3', O, 2, 14);
    px(3, 2, O, 3, 6); px(4, 3, '#f0e6d0', 1, 4); px(18, 2, O, 3, 6); px(19, 3, '#f0e6d0', 1, 4);
    px(5, 5, O, 2, 2); px(17, 5, O, 2, 2);
    px(8, 1, O, 8, 3); px(9, 2, '#ffd36b', 6, 1); px(9, 0, '#ffd36b', 1, 1); px(12, 0, '#ffd36b', 1, 1); px(14, 0, '#ffd36b', 1, 1);
    px(9, 7, '#ffe36b', 2, 2); px(13, 7, '#ffe36b', 2, 2);
    px(9, 11, O, 6, 1); px(10, 11, '#ffffff', 1, 1); px(13, 11, '#ffffff', 1, 1);
  }),
  // 진정한 마왕 녹스 (2단계): 커진 뿔 · 붉은 눈 · 보랏빛 불꽃
  crown2: () => bossCanvas((px, ell) => {
    for (let k = 0; k < 6; k++) { px(2 + k * 4, 14 - (k % 2) * 3, '#9b5fd6', 2, 10); px(3 + k * 4, 12 - (k % 2) * 3, '#c99bff', 1, 3); }
    px(3, 11, O, 18, 13); px(4, 12, '#2e1a44', 16, 11); px(5, 13, '#e0463a', 3, 9); px(16, 13, '#e0463a', 3, 9);
    px(8, 13, '#1a0e2a', 8, 10); px(11, 15, '#ff6b6b', 2, 2);
    ell(12, 8, 5, 5, '#8a6ad0', O, 2, 14);
    px(1, 0, O, 4, 8); px(2, 1, '#f0e6d0', 2, 6); px(19, 0, O, 4, 8); px(20, 1, '#f0e6d0', 2, 6);
    px(4, 6, O, 3, 2); px(17, 6, O, 3, 2);
    px(8, 1, O, 8, 3); px(9, 2, '#ffd36b', 6, 1);
    px(9, 7, '#ff3a3a', 2, 2); px(13, 7, '#ff3a3a', 2, 2);
    px(9, 11, O, 6, 2); px(10, 11, '#ffffff', 1, 2); px(13, 11, '#ffffff', 1, 2);
  }),
};

export function buildArt2(target, flipFn, silFn) {
  for (const [id, a] of Object.entries(ELITE_ART)) {
    const r = paintRows(a.rows.map((x) => x.replace(/ /g, '.')), a.pal, 16, 16);
    const l = flipFn(r);
    target.enemies[id] = { r, l, fr: silFn(r, '#ffffff', 0), fl: silFn(l, '#ffffff', 0) };
  }
  for (const [id, a] of Object.entries(BOSS_ART)) {
    const r = paintRows(a.rows, a.pal, 24, 24);
    const l = flipFn(r);
    target.enemies[id] = { r, l, fr: silFn(r, '#ffffff', 0), fl: silFn(l, '#ffffff', 0) };
  }
  for (const [id, fn] of Object.entries(FAIRY_BOSS)) {
    const r = fn();
    const l = flipFn(r);
    target.enemies[id] = { r, l, fr: silFn(r, '#ffffff', 0), fl: silFn(l, '#ffffff', 0) };
  }
  const cr = paintRows(CULTIST.rows, CULTIST.pal, 12, 12);
  const cl = flipFn(cr);
  target.enemies.cultist = { r: cr, l: cl, fr: silFn(cr, '#ffffff', 0), fl: silFn(cl, '#ffffff', 0) };
  target.mascots = target.mascots || {};
  for (const [id, a] of Object.entries(MASCOT_ART)) {
    const r = paintRows(a.rows, a.pal, 12, 12);
    target.mascots[id] = { r, l: flipFn(r) };
  }
}

// ═════════════ 인물 초상 (32×32, 표정 6종) ═════════════
// 머리 모양 · 색 · 장신구를 조합해 그린다.
export const CAST = {
  narr: null,
  edric: { name: '레오', skin: '#f1c9a5', hair: '#e8c25a', style: 'short', cloth: '#c9a85c', cloth2: '#3a5fb0', crown: true, voice: [520, 'square'] },
  seren: { name: '미나', skin: '#f6d6c0', hair: '#c9a8f0', style: 'long', cloth: '#6a4ab0', cloth2: '#c99bff', tiara: true, voice: [760, 'triangle'] },
  kyle: { name: '피크', skin: '#e0b08a', hair: '#8a4a1a', style: 'messy', cloth: '#3a5a3a', cloth2: '#5a7a5a', crown: 'tilt', bandana: '#3a5a3a', voice: [440, 'square'] },
  bran: { name: '바르톨', skin: '#f0c8a0', hair: '#e8e8f0', style: 'bald', beard: '#f4f4f8', cloth: '#7a8aa8', cloth2: '#ffd36b', scar: true, armor: true, voice: [220, 'square'] },
  linette: { name: '리네트', skin: '#f6d0b0', hair: '#d0463b', style: 'long', hat: 'feather', cloth: '#4f9a4a', cloth2: '#e8c25a', voice: [880, 'triangle'] },
  bork: { name: '보르크', skin: '#a8704a', hair: '#1a1018', style: 'short', goggles: true, cloth: '#7a4b2a', cloth2: '#4e2f1a', voice: [300, 'sawtooth'] },
  aila: { name: '에일라', skin: '#f6dccf', hair: '#5a4a8a', style: 'straight', cloth: '#6a4ab0', cloth2: '#ffb3cf', cold: true, voice: [620, 'sine'] },
  toto: { name: '토토', skin: '#b8a090', hair: '#5a4a3a', style: 'cap', ears: true, cloth: '#e8a040', cloth2: '#ffd36b', tooth: true, voice: [980, 'square'] },
  priest: { name: '수도사', skin: '#f0d0b0', hair: '#e0ecff', style: 'hood', cloth: '#e8f2ff', cloth2: '#6ab0e8', voice: [360, 'sine'] },
  cultist: { name: '장난꾸러기 요정', skin: '#fde2d0', hair: '#9ee6b0', style: 'messy', ears: true, cloth: '#ff9ac2', cloth2: '#fff1a8', voice: [1100, 'triangle'] },
  chief: { name: '곰 촌장', skin: '#c8925a', hair: '#7a4a2a', style: 'short', ears: true, cloth: '#5a8a3a', cloth2: '#e8c25a', voice: [200, 'triangle'] },
  guild: { name: '항구 상인회장', skin: '#f0c0a0', hair: '#3a2a1a', style: 'tophat', mustache: true, cloth: '#2f6fb8', cloth2: '#ffd36b', voice: [340, 'square'] },
  villager: { name: '마을 사람', skin: '#f0c8a8', hair: '#6a4a2a', style: 'short', cloth: '#8a6a4a', cloth2: '#6a5a4a', voice: [500, 'triangle'] },
  dicepriest: { name: '등대지기', skin: '#e8c8a8', hair: '#4a6a9a', style: 'hood', cloth: '#3a6ab0', cloth2: '#ffffff', dice: true, voice: [400, 'triangle'] },
  box: { name: '상자', box: true, voice: [150, 'square'] },
  dragon: { name: '실바나', dragon: true, voice: [120, 'sawtooth'] },
  morven: { name: '먹물수염', skin: '#ff9aa8', hair: '#3a2a4a', style: 'tophat', beard: '#4a2a5a', cloth: '#3a2a4a', cloth2: '#ffd36b', voice: [240, 'sawtooth'] },
  librarian: { name: '사서 할머니', skin: '#f0d0b0', hair: '#d8d8e0', style: 'long', cloth: '#7a5a9a', cloth2: '#ffd36b', glasses: true, voice: [380, 'sine'] },
  forger: { name: '위조범 핀', skin: '#e8c0a0', hair: '#5a4030', style: 'cap', mustache: true, cloth: '#6a5a3a', cloth2: '#c8c0a0', voice: [560, 'square'] },
  cousin: { name: '테오도르', skin: '#f4e0d4', hair: '#d8c08a', style: 'short', cloth: '#5a6a9a', cloth2: '#e8c25a', crownSmall: true, cold: true, voice: [600, 'triangle'] },
  noah: { name: '노아', skin: '#f4dcc8', hair: '#8ab0e0', style: 'messy', cloth: '#5a8ad0', cloth2: '#ffd36b', voice: [600, 'triangle'] },
  noahShadow: { name: '그림자 노아', skin: '#c8b8e0', hair: '#4a3a6a', style: 'messy', cloth: '#2e1a44', cloth2: '#9b5fd6', cold: true, voice: [480, 'sine'] },
  nox: { name: '마왕 녹스', skin: '#b9a3e3', hair: '#2e1a44', style: 'short', cloth: '#4a2a6a', cloth2: '#c0392b', horns: true, crownSmall: true, voice: [150, 'sawtooth'] },
  granny: { name: '어부 할머니', skin: '#f0c8a8', hair: '#e8e8e8', style: 'long', cloth: '#4aa8e0', cloth2: '#ffffff', voice: [420, 'triangle'] },
  kid: { name: '마을 꼬마', skin: '#f6d2b0', hair: '#a86a3a', style: 'messy', cloth: '#e8a040', cloth2: '#ffffff', voice: [900, 'square'] },
  ghost: { name: '전설의 용사 아르딘', skin: '#d8f0ff', hair: '#f0f8ff', style: 'short', beard: '#f0f8ff', cloth: '#8ab8e0', cloth2: '#ffd36b', armor: true, ghost: true, voice: [200, 'sine'] },
};

const FACES = ['neutral', 'happy', 'angry', 'sad', 'shock', 'smug'];

function drawPortrait(c, face) {
  const cvs = cv(32, 32), g = cvs.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f)), gg = Math.min(255, Math.round(((n >> 8) & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${gg},${b})`;
  };
  if (c.box) {
    // 말하는 상자
    px(6, 10, O, 20, 18); px(7, 11, '#8a5a2a', 18, 16); px(7, 17, '#5a3a1a', 18, 2);
    px(7, 19, '#f0f0f0', 18, 1);
    const open = face === 'shock' || face === 'happy';
    px(7, open ? 16 : 18, O, 18, open ? 3 : 1);
    px(11, 13, face === 'angry' ? '#d0463b' : '#ffe36b', 2, 2); px(19, 13, face === 'angry' ? '#d0463b' : '#ffe36b', 2, 2);
    px(8, 12, '#e8c25a', 2, 2); px(22, 12, '#e8c25a', 2, 2);
    return cvs;
  }
  if (c.dragon) {
    px(4, 8, O, 24, 22); px(5, 9, '#a8d8f0', 22, 20); px(5, 22, '#6aa0d0', 22, 7);
    px(3, 2, O, 5, 8); px(4, 3, '#ffffff', 3, 6); px(24, 2, O, 5, 8); px(25, 3, '#ffffff', 3, 6);
    const ey = face === 'angry' ? '#d0463b' : '#2a4a8a';
    px(9, 14, ey, 4, face === 'sad' ? 1 : 3); px(19, 14, ey, 4, face === 'sad' ? 1 : 3);
    px(10, 14, '#ffffff', 1, 1); px(20, 14, '#ffffff', 1, 1);
    px(12, 23, O, 8, 1); px(13, 24, '#ffffff', 1, 2); px(18, 24, '#ffffff', 1, 2);
    return cvs;
  }
  const skin = c.skin, hair = c.hair, sk2 = shade(skin, 0.82), hr2 = shade(hair, 0.7);
  // 몸통 (어깨)
  px(5, 25, O, 22, 7); px(6, 26, c.cloth, 20, 6);
  px(6, 26, shade(c.cloth, 1.15), 20, 1);
  px(14, 26, c.cloth2, 4, 6);
  if (c.armor) { px(6, 26, '#9aa0b4', 6, 3); px(20, 26, '#9aa0b4', 6, 3); px(6, 26, '#c9ced8', 6, 1); px(20, 26, '#c9ced8', 6, 1); }
  // 목
  px(13, 23, sk2, 6, 3);
  // 머리
  px(8, 7, O, 16, 18); px(9, 8, skin, 14, 16); px(9, 22, sk2, 14, 2);
  if (c.ears) { px(4, 12, O, 5, 5); px(5, 13, skin, 4, 3); px(23, 12, O, 5, 5); px(23, 13, skin, 4, 3); }
  // 머리카락
  const st = c.style;
  if (st === 'short' || st === 'messy') {
    px(8, 5, O, 16, 6); px(9, 6, hair, 14, 5); px(9, 10, hair, 3, 3); px(20, 10, hair, 3, 3);
    if (st === 'messy') { px(7, 7, hair, 2, 2); px(23, 6, hair, 2, 3); px(12, 4, hair, 3, 2); px(18, 4, hair, 2, 2); }
    px(10, 6, shade(hair, 1.2), 6, 1);
  } else if (st === 'long' || st === 'straight') {
    px(7, 5, O, 18, 7); px(8, 6, hair, 16, 6);
    px(7, 11, O, 3, 14); px(8, 11, hair, 2, 13); px(22, 11, O, 3, 14); px(22, 11, hair, 2, 13);
    if (st === 'long') { px(6, 18, hair, 2, 7); px(24, 18, hair, 2, 7); }
    px(9, 6, shade(hair, 1.2), 7, 1);
    px(13, 9, hair, 6, 2);
  } else if (st === 'bald') {
    px(9, 8, shade(skin, 1.08), 14, 2); px(8, 11, hair, 2, 5); px(22, 11, hair, 2, 5);
  } else if (st === 'hood') {
    px(6, 4, O, 20, 22); px(7, 5, hair, 18, 20); px(9, 9, skin, 14, 15); px(9, 22, sk2, 14, 2);
    px(7, 5, shade(hair, 1.2), 18, 1);
  } else if (st === 'cap') {
    px(8, 5, O, 16, 6); px(9, 6, c.cloth2, 14, 4); px(5, 9, O, 6, 2); px(6, 9, c.cloth2, 5, 1);
  } else if (st === 'feather') {
    px(8, 6, O, 16, 4); px(9, 7, hair, 14, 3);
    for (let k = 0; k < 5; k++) { px(9 + k * 3, 1, O, 3, 6); px(10 + k * 3, 2, ['#d0463b', '#e8c25a', '#4f9a4a', '#e8c25a', '#d0463b'][k], 1, 5); }
  } else if (st === 'tophat') {
    px(8, 9, hair, 16, 2); px(10, 0, O, 12, 9); px(11, 1, '#1a1018', 10, 8); px(11, 6, c.cloth2, 10, 1); px(7, 8, O, 18, 2); px(8, 8, '#1a1018', 16, 1);
  }
  if (c.hat === 'helmet') {
    px(8, 3, O, 16, 8); px(9, 4, '#c9ced8', 14, 6); px(9, 4, '#eef2f8', 14, 1); px(9, 9, '#9aa6bc', 14, 1);
    px(15, 0, O, 3, 5); px(16, 0, '#e0463a', 1, 4); px(15, 4, '#f0d27a', 3, 1);
  }
  if (c.hat === 'witch') {
    px(4, 8, O, 24, 3); px(5, 9, '#2e5aa8', 22, 1);
    px(10, 4, O, 12, 5); px(11, 5, '#4a7fd0', 10, 4); px(12, 1, O, 8, 4); px(13, 2, '#4a7fd0', 6, 3); px(18, 0, O, 4, 2); px(19, 0, '#4a7fd0', 2, 1);
    px(11, 7, '#ffd36b', 10, 1); px(15, 3, '#ffd36b', 1, 1);
  }
  if (c.hat === 'feather') { px(6, 3, O, 20, 5); px(7, 4, '#4f9a4a', 18, 3); px(22, 0, '#e8c25a', 2, 4); px(24, 1, '#e8c25a', 1, 3); }
  if (c.bandana) { px(8, 9, c.bandana, 16, 2); }
  if (c.goggles) { px(8, 8, O, 16, 3); px(10, 8, '#e8c25a', 4, 2); px(18, 8, '#e8c25a', 4, 2); px(11, 8, '#a8e4ff', 2, 1); px(19, 8, '#a8e4ff', 2, 1); }
  if (c.crown === true) { px(10, 2, O, 12, 5); px(11, 3, '#e8c25a', 10, 3); px(11, 2, '#e8c25a', 1, 1); px(15, 2, '#e8c25a', 2, 1); px(20, 2, '#e8c25a', 1, 1); px(15, 4, '#d0463b', 2, 1); }
  if (c.crown === 'tilt') { px(15, 2, O, 9, 4); px(16, 2, '#e8c25a', 7, 2); px(16, 1, '#e8c25a', 1, 1); px(19, 1, '#e8c25a', 1, 1); px(22, 1, '#e8c25a', 1, 1); }
  if (c.horns) { px(5, 1, O, 4, 8); px(6, 2, '#f0e6d0', 2, 6); px(23, 1, O, 4, 8); px(24, 2, '#f0e6d0', 2, 6); }
  if (c.crownSmall) { px(13, 3, O, 6, 3); px(14, 3, '#e8c25a', 4, 2); }
  if (c.tiara) { px(10, 6, '#e8c25a', 12, 1); px(15, 4, '#c99bff', 2, 2); }
  // 표정
  const ey = 15, lx = 11, rx = 18;
  const eye = (x) => {
    switch (face) {
      case 'happy': px(x, ey + 1, O, 3, 1); px(x, ey, O, 1, 1); px(x + 2, ey, O, 1, 1); break;
      case 'sad': px(x, ey + 1, O, 3, 2); px(x + 1, ey + 1, '#ffffff', 1, 1); break;
      case 'shock': px(x - 1, ey - 1, O, 4, 4); px(x, ey, '#ffffff', 2, 2); break;
      case 'smug': px(x, ey + 1, O, 3, 1); px(x, ey + 2, sk2, 3, 1); break;
      default: px(x, ey, O, 3, 3); px(x + 1, ey, '#ffffff', 1, 1);
    }
  };
  if (c.glasses) {
    for (const x of [lx, rx]) { px(x - 1, ey - 1, O, 5, 1); px(x - 1, ey + 3, O, 5, 1); px(x - 1, ey - 1, O, 1, 5); px(x + 3, ey - 1, O, 1, 5); }
    px(lx + 3, ey + 1, O, rx - lx - 4, 1);
  }
  if (c.cold && face === 'neutral') { px(lx, ey + 1, O, 3, 2); px(rx, ey + 1, O, 3, 2); }
  else { eye(lx); eye(rx); }
  // 눈썹
  if (face === 'angry') { px(lx - 1, ey - 3, hr2, 2, 1); px(lx + 1, ey - 2, hr2, 2, 1); px(rx + 2, ey - 3, hr2, 2, 1); px(rx, ey - 2, hr2, 2, 1); }
  else if (face === 'sad') { px(lx, ey - 2, hr2, 2, 1); px(lx + 2, ey - 3, hr2, 1, 1); px(rx + 1, ey - 2, hr2, 2, 1); px(rx, ey - 3, hr2, 1, 1); }
  else if (st !== 'bald') { px(lx, ey - 2, hr2, 3, 1); px(rx, ey - 2, hr2, 3, 1); }
  // 볼
  if (face === 'happy' || face === 'shock') { px(10, 19, '#f08a8a', 2, 1); px(20, 19, '#f08a8a', 2, 1); }
  // 입
  switch (face) {
    case 'happy': px(13, 20, O, 6, 1); px(14, 21, '#c0504a', 4, 1); break;
    case 'angry': px(13, 21, O, 6, 1); px(13, 20, O, 1, 1); px(18, 20, O, 1, 1); break;
    case 'sad': px(14, 21, O, 4, 1); px(13, 22, O, 1, 1); px(18, 22, O, 1, 1); break;
    case 'shock': px(14, 20, O, 4, 3); px(15, 21, '#c0504a', 2, 1); break;
    case 'smug': px(14, 21, O, 5, 1); px(18, 20, O, 1, 1); break;
    default: px(14, 21, O, 4, 1);
  }
  if (c.tooth) px(17, 21, '#e8c25a', 1, 1);
  if (c.beard) { px(10, 20, c.beard, 12, 4); px(12, 24, c.beard, 8, 2); if (face !== 'shock') px(14, 21, O, 4, 1); }
  if (c.mustache) { px(12, 19, '#3a2a1a', 8, 1); px(11, 20, '#3a2a1a', 2, 1); px(19, 20, '#3a2a1a', 2, 1); }
  if (c.mask) { px(9, 18, '#2a1018', 14, 5); px(11, 15, '#ff8a3a', 2, 1); px(19, 15, '#ff8a3a', 2, 1); }
  if (c.scar) { px(19, 12, '#c0504a', 1, 6); }
  if (c.dice) { px(24, 22, O, 6, 6); px(25, 23, '#ffffff', 4, 4); px(26, 24, O, 1, 1); px(28, 26, O, 1, 1); }
  if (c.ghost) {
    const d = g.getImageData(0, 0, 32, 32);
    for (let i = 3; i < d.data.length; i += 4) if (d.data[i]) d.data[i] = 190;
    g.putImageData(d, 0, 0);
  }
  return cvs;
}

const portraitCache = new Map();
export function portrait(who, face = 'neutral') {
  const key = who + ':' + face;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const c = CAST[who];
  const img = c ? drawPortrait(c, FACES.includes(face) ? face : 'neutral') : null;
  portraitCache.set(key, img);
  return img;
}

// ═════════════ 장소 배경 (240×135) ═════════════
export const PLACES = {
  ruins: '들판 마을', forest: '햇살 숲', temple: '구름 신전', road: '갈림길', hall: '마왕성 홀', camp: '야영지',
  swamp: '안개 호수', mountain: '구름 산', library: '마을 도서관', market: '항구 장터', crypt: '수정 동굴', office: '마을 사무소',
};

function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function drawPlace(id) {
  const W = 240, H = 135;
  const c = cv(W, H), g = c.getContext('2d');
  const r = rnd([...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483647 || 1);
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // 디더링 하늘 띠
  const sky = (cols) => {
    const band = H / cols.length;
    cols.forEach((col, i) => {
      rect(0, i * band, W, band + 1, col);
      if (i) for (let x = (i % 2); x < W; x += 2) rect(x, i * band, 1, 1, cols[i - 1]);
    });
  };
  const ridge = (y0, amp, col, step = 6, seedOff = 0) => {
    g.fillStyle = col;
    let y = y0;
    for (let x = 0; x < W; x += step) {
      y = Math.max(y0 - amp, Math.min(y0 + amp, y + (r() - 0.5) * amp));
      g.fillRect(x, Math.round(y), step, H - Math.round(y));
    }
  };
  const stars = (n, col) => { for (let i = 0; i < n; i++) rect(r() * W, r() * H * 0.5, 1, 1, col); };
  const ash = (n) => { for (let i = 0; i < n; i++) rect(r() * W, r() * H, 1, 1, r() < 0.15 ? '#ff8a3a' : '#6a6470'); };
  switch (id) {
    case 'ruins': {
      sky(['#1a1420', '#2a1a24', '#4a2228', '#6a3028', '#7a3a2a']);
      ridge(92, 6, '#2a2028', 8);
      for (let i = 0; i < 9; i++) {
        const x = i * 28 + r() * 10, w = 16 + r() * 10, h = 20 + r() * 26, y = 112 - h;
        rect(x, y, w, h + 30, '#16121a');
        rect(x + 2, y - 4 - r() * 6, 4, 8, '#16121a');
        if (r() < 0.5) rect(x + w / 2, y + 6, 3, 4, '#e0663a');
        rect(x + w - 3, y, 3, 2, '#2a2028');
      }
      rect(0, 112, W, 23, '#100c12');
      ash(70);
      break;
    }
    case 'forest': {
      sky(['#0e1412', '#14201a', '#1a2a22', '#22322a']);
      for (let layer = 0; layer < 3; layer++) {
        const col = ['#1e2c24', '#16221c', '#0e1612'][layer];
        for (let i = 0; i < 16; i++) {
          const x = i * 16 + r() * 12 - 6, h = 50 + layer * 20 + r() * 20, base = 100 + layer * 12;
          rect(x + 5, base - h, 4, h, col);
          for (let k = 0; k < 4; k++) rect(x + 1 - k, base - h + 8 + k * 8, 12 + k * 2, 6, col);
        }
      }
      for (let i = 0; i < 4; i++) rect(0, 70 + i * 12, W, 3, 'rgba(200,210,200,0.05)');
      ash(30);
      break;
    }
    case 'temple': {
      sky(['#14121e', '#1e1a2a', '#2a2436', '#352e42']);
      rect(0, 104, W, 31, '#18141e');
      for (let i = 0; i < 6; i++) {
        const x = 18 + i * 38;
        rect(x, 30, 12, 76, '#2a2436'); rect(x - 2, 28, 16, 4, '#3a3446'); rect(x - 2, 102, 16, 4, '#3a3446');
        rect(x + 2, 30, 2, 76, '#3a3446');
        if (i === 2) rect(x + 3, 60, 6, 10, '#16121a');
      }
      rect(96, 84, 48, 20, '#3a3446'); rect(100, 80, 40, 4, '#4a4456');
      for (let i = 0; i < 5; i++) { rect(104 + i * 8, 74, 2, 6, '#e8e0d0'); rect(104 + i * 8, 71, 2, 3, '#ffe36b'); }
      rect(80, 20, 80, 3, 'rgba(255,230,160,0.06)');
      break;
    }
    case 'road': {
      sky(['#1a1a26', '#2a2a36', '#3a3440', '#4a3a3a']);
      ridge(80, 8, '#2a2630', 10);
      ridge(92, 5, '#201c24', 6);
      g.fillStyle = '#3a3036';
      g.beginPath(); g.moveTo(110, 92); g.lineTo(130, 92); g.lineTo(200, H); g.lineTo(40, H); g.fill();
      g.fillStyle = '#3a3036';
      g.beginPath(); g.moveTo(118, 92); g.lineTo(124, 92); g.lineTo(240, 120); g.lineTo(240, 128); g.fill();
      rect(150, 70, 3, 34, '#4e2f1a'); rect(136, 72, 22, 6, '#7a4b2a'); rect(152, 82, 20, 6, '#7a4b2a');
      stars(40, '#8a8696');
      ash(20);
      break;
    }
    case 'hall': {
      sky(['#1a1218', '#221820', '#2a1e26']);
      rect(0, 100, W, 35, '#2a1e1e');
      for (let x = 0; x < W; x += 12) rect(x, 100, 1, 35, '#221616');
      for (let i = 0; i < 5; i++) {
        const x = 12 + i * 52;
        rect(x, 0, 14, 100, '#2a2028'); rect(x + 2, 0, 2, 100, '#3a3038');
        rect(x + 20, 14, 16, 44, '#6a2028'); rect(x + 20, 14, 16, 3, '#e8c25a'); rect(x + 26, 30, 4, 6, '#e8c25a');
        g.fillStyle = '#6a2028'; g.beginPath(); g.moveTo(x + 20, 58); g.lineTo(x + 28, 52); g.lineTo(x + 36, 58); g.fill();
      }
      rect(108, 66, 24, 34, '#3a2a2a'); rect(104, 62, 32, 6, '#e8c25a'); rect(112, 74, 16, 26, '#5a2028');
      break;
    }
    case 'camp': {
      sky(['#0a0c14', '#10121c', '#161824', '#1a1c28']);
      stars(80, '#b8bcd0');
      ridge(96, 6, '#12141c', 8);
      rect(0, 108, W, 27, '#0e1016');
      g.fillStyle = '#3a3036'; g.beginPath(); g.moveTo(150, 108); g.lineTo(180, 76); g.lineTo(210, 108); g.fill();
      g.fillStyle = '#2a2028'; g.beginPath(); g.moveTo(180, 76); g.lineTo(186, 108); g.lineTo(176, 108); g.fill();
      for (let i = 0; i < 6; i++) rect(100 - i * 6, 112 - i * 4, 40 + i * 12, 3 + i * 2, `rgba(255,138,58,${0.05 - i * 0.006})`);
      rect(112, 106, 16, 4, '#4e2f1a'); rect(116, 96, 8, 10, '#ff8a3a'); rect(118, 92, 4, 6, '#ffe36b');
      break;
    }
    case 'swamp': {
      sky(['#101814', '#16201a', '#1c2820', '#22302a']);
      rect(0, 96, W, 39, '#14201c');
      for (let y = 98; y < H; y += 4) for (let x = (y % 8); x < W; x += 16) rect(x, y, 6, 1, '#1e2e28');
      for (let i = 0; i < 6; i++) {
        const x = 10 + i * 42 + r() * 10;
        rect(x, 40 + r() * 20, 4, 60, '#0e1410');
        rect(x - 8, 54, 10, 2, '#0e1410'); rect(x + 4, 62, 12, 2, '#0e1410');
      }
      for (let i = 0; i < 30; i++) rect(r() * W, 40 + r() * 70, 1, 1, '#c8f08a');
      rect(0, 80, W, 8, 'rgba(200,220,210,0.05)');
      break;
    }
    case 'mountain': {
      sky(['#1a2030', '#24304a', '#30405a', '#3a4a66']);
      g.fillStyle = '#4a5a76';
      for (let i = 0; i < 4; i++) { const x = i * 70 - 10; g.beginPath(); g.moveTo(x, 110); g.lineTo(x + 40, 30 + r() * 20); g.lineTo(x + 90, 110); g.fill(); }
      g.fillStyle = '#e8f0ff';
      for (let i = 0; i < 4; i++) { const x = i * 70 - 10; g.beginPath(); g.moveTo(x + 30, 50); g.lineTo(x + 40, 34); g.lineTo(x + 52, 52); g.fill(); }
      rect(0, 104, W, 31, '#c8d8ec');
      for (let i = 0; i < 90; i++) rect(r() * W, r() * H, 1, 1, '#ffffff');
      break;
    }
    case 'library': {
      sky(['#1a1410', '#221a14']);
      for (let s2 = 0; s2 < 4; s2++) {
        const x = 8 + s2 * 60;
        rect(x, 10, 50, 100, '#3a2418');
        for (let sh = 0; sh < 5; sh++) {
          rect(x, 12 + sh * 20, 50, 2, '#2a1a10');
          for (let b = 0; b < 10; b++) rect(x + 2 + b * 5, 14 + sh * 20 + (b % 3), 4, 16 - (b % 3), ['#6a2028', '#2a4a6a', '#4a6a2a', '#8a6a2a', '#4a2a5a'][(b + sh + s2) % 5]);
        }
      }
      rect(0, 110, W, 25, '#2a1a10');
      rect(110, 96, 20, 14, '#5a3a20'); rect(118, 86, 4, 10, '#ffe36b');
      for (let i = 0; i < 4; i++) rect(100 - i * 8, 80 - i * 4, 40 + i * 16, 30 + i * 8, 'rgba(255,220,140,0.03)');
      break;
    }
    case 'market': {
      sky(['#1e1622', '#2e2030', '#40283a', '#4e2e3a']);
      rect(0, 100, W, 35, '#2a2026');
      for (let i = 0; i < 5; i++) {
        const x = 6 + i * 48, col = ['#8a2a2a', '#2a5a8a', '#8a7a2a', '#2a7a4a', '#6a2a7a'][i];
        rect(x, 62, 40, 4, col); for (let k = 0; k < 40; k += 8) rect(x + k, 66, 4, 4, col);
        rect(x + 2, 66, 2, 34, '#4e2f1a'); rect(x + 36, 66, 2, 34, '#4e2f1a');
        rect(x + 4, 84, 32, 14, '#5a3a20');
        for (let k = 0; k < 5; k++) rect(x + 6 + k * 6, 80, 4, 4, ['#e8c25a', '#d0463b', '#7fbf6a', '#c99bff', '#ffffff'][k]);
      }
      for (let i = 0; i < 8; i++) rect(10 + i * 30, 30, 2, 2, '#ffe36b');
      break;
    }
    case 'crypt': {
      sky(['#0c0a10', '#121018', '#18141e']);
      for (let i = 0; i < 4; i++) {
        const x = i * 64;
        g.fillStyle = '#221c2a'; g.fillRect(x, 0, 64, 110);
        g.fillStyle = '#100c14'; g.beginPath(); g.arc(x + 32, 60, 24, Math.PI, 0); g.fill(); g.fillRect(x + 8, 60, 48, 50);
      }
      rect(0, 108, W, 27, '#18141e');
      rect(30, 98, 40, 12, '#3a3446'); rect(170, 98, 40, 12, '#3a3446');
      for (let i = 0; i < 5; i++) rect(80 + i * 4, 60 - i * 2, 80 - i * 8, 40, 'rgba(155,95,214,0.04)');
      for (let i = 0; i < 12; i++) rect(100 + r() * 40, 70 + r() * 30, 1, 1, '#c99bff');
      break;
    }
    case 'office': {
      sky(['#1e1a16', '#262018']);
      rect(0, 0, W, 8, '#140f0c');
      rect(20, 20, 60, 40, '#2e2620'); rect(24, 24, 52, 32, '#3a3a50'); rect(48, 24, 2, 32, '#2e2620'); rect(24, 38, 52, 2, '#2e2620');
      rect(0, 104, W, 31, '#2a2018');
      rect(70, 84, 110, 20, '#5a3a20'); rect(70, 82, 110, 3, '#7a4b2a');
      for (let k = 0; k < 12; k++) rect(96 + (k % 2) * 2, 82 - k * 4, 26, 4, k % 2 ? '#e8e0d0' : '#d8d0c0');
      for (let k = 0; k < 6; k++) rect(140, 82 - k * 4, 22, 4, k % 2 ? '#e8e0d0' : '#d0c8b8');
      rect(150, 60, 4, 4, '#d0463b');
      break;
    }
  }
  // 하단 비네트
  for (let i = 0; i < 6; i++) rect(0, H - 6 + i, W, 1, `rgba(0,0,0,${0.08 * i})`);
  return c;
}

const placeCache = new Map();
export function place(id) {
  if (!PLACES[id]) id = 'road';
  if (!placeCache.has(id)) placeCache.set(id, drawPlace(id));
  return placeCache.get(id);
}
