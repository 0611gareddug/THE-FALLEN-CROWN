// 유닛 · 등급 · 계열 · 레시피 정의 (오리지널 설계)

export const TIERS = [
  { name: '견습', color: '#9a9a9a', glow: '#c8c8c8', sell: 10 },
  { name: '숙련', color: '#5fae5a', glow: '#8fe08a', sell: 25 },
  { name: '정예', color: '#4f86d6', glow: '#86b4ff', sell: 60 },
  { name: '영웅', color: '#9b5fd6', glow: '#c99bff', sell: 150 },
  { name: '전설', color: '#e0b23a', glow: '#ffe08a', sell: 400 },
  { name: '천상', color: '#ff7ad9', glow: '#ffffff', sell: 0 },
];

export const CLASSES = {
  knight: { name: '기사', color: '#c9a85c' },
  archer: { name: '궁수', color: '#7fbf6a' },
  mage: { name: '마도', color: '#7aa2ff' },
  priest: { name: '성직', color: '#f1e3a6' },
  rogue: { name: '도적', color: '#b07ad6' },
};
export const CLASS_ORDER = ['knight', 'archer', 'mage', 'priest', 'rogue'];

// 시너지: 보드 위 "서로 다른 종류" 개수 기준
export const SYNERGY = {
  knight: [
    { n: 2, text: '기사 피해 +10%' },
    { n: 3, text: '기사 공격 3% 확률 기절' },
    { n: 4, text: '기사 피해 +25%, 보스 피해 +15%' },
  ],
  archer: [
    { n: 2, text: '궁수 사거리 증가' },
    { n: 3, text: '궁수 공격 속도 +15%' },
    { n: 4, text: '궁수 치명타 20% (피해 ×2)' },
  ],
  mage: [
    { n: 2, text: '마도 범위 +15%' },
    { n: 3, text: '마법 피해 +10%' },
    { n: 4, text: '3초마다 소형 운석' },
  ],
  priest: [
    { n: 2, text: '아군 전체 공격 속도 +5%' },
    { n: 3, text: '금화 획득 +10%' },
  ],
  rogue: [
    { n: 2, text: '처치 시 금화 +1' },
    { n: 3, text: '행운석 획득 확률 ×1.5' },
    { n: 4, text: '도적 공격 5% 즉사 (보스 제외)' },
  ],
};

// dtype: p = 물리, m = 마법
// proj: 투사체 연출 종류
export const UNITS = [
  // ── 견습 ──
  { id: 'spear', tier: 0, cls: 'knight', name: '창병 견습생', dmg: 15, rate: 0.85, range: 72, dtype: 'p', proj: 'melee',
    desc: '근거리. 한 방이 묵직하다. 가장자리 칸에 두자.', quip: '창은 길다. 경력은 짧다.' },
  { id: 'hunter', tier: 0, cls: 'archer', name: '사냥꾼 견습생', dmg: 6, rate: 1.7, range: 130, dtype: 'p', proj: 'arrow',
    desc: '원거리 빠른 단발.', quip: '토끼만 잡아봤습니다.' },
  { id: 'ember', tier: 0, cls: 'mage', name: '불씨 견습생', dmg: 8, rate: 0.9, range: 110, dtype: 'm', proj: 'fire', splash: 22,
    desc: '작은 범위 화염.', quip: '불은 붙이는데 끄는 법은 아직 안 배움.' },
  { id: 'nun', tier: 0, cls: 'priest', name: '수련 수녀', dmg: 5, rate: 1.0, range: 110, dtype: 'm', proj: 'holy', auraSpd: 0.03,
    desc: '주변 8칸 아군 공격 속도 +3%.', quip: '기도는 무료, 축복은 유료.' },
  { id: 'urchin', tier: 0, cls: 'rogue', name: '꼬마 좀도둑', dmg: 7, rate: 1.6, range: 95, dtype: 'p', proj: 'dagger', killGold: 1,
    desc: '빠른 단검. 처치 시 금화 +1.', quip: '주머니가 많을수록 강해진다고 믿는다.' },

  // ── 숙련 ──
  { id: 'shield', tier: 1, cls: 'knight', name: '방패 경비병', dmg: 32, rate: 0.85, range: 72, dtype: 'p', proj: 'melee', stun: [0.1, 0.5],
    desc: '공격 시 10% 확률로 0.5초 기절.', quip: '방패로 때리는 게 더 아픔.' },
  { id: 'xbow', tier: 1, cls: 'archer', name: '석궁수', dmg: 21, rate: 1.0, range: 150, dtype: 'p', proj: 'bolt', pierce: 1,
    desc: '관통 화살. 뒤의 적 1명까지 맞힌다.', quip: '장전이 반, 조준이 반.' },
  { id: 'frost', tier: 1, cls: 'mage', name: '얼음 마도사', dmg: 17, rate: 1.0, range: 120, dtype: 'm', proj: 'ice', slow: [0.2, 2],
    desc: '맞은 적 이동 속도 -20% (2초).', quip: '말투도 차갑다.' },
  { id: 'pick', tier: 1, cls: 'rogue', name: '소매치기', dmg: 15, rate: 1.5, range: 100, dtype: 'p', proj: 'dagger', killGold: 2,
    desc: '처치 시 금화 +2.', quip: '적의 지갑도 전리품으로 칩니다.' },
  { id: 'bell', tier: 1, cls: 'priest', name: '종지기 수도사', dmg: 14, rate: 1.0, range: 115, dtype: 'm', proj: 'holy', auraSpd: 0.04, waveHeal: 1,
    desc: '주변 8칸 아군 공격 속도 +4%. 웨이브마다 성벽 +1.', quip: '종은 정시에 친다. 낮잠도 정시에 잔다.' },

  // ── 정예 ──
  { id: 'ashguard', tier: 2, cls: 'knight', name: '잿빛 근위기사', dmg: 58, rate: 0.9, range: 76, dtype: 'p', proj: 'melee', every3: 42,
    desc: '3번째 공격마다 주변 범위 강타.', quip: '세 번째에 진심을 담는다.' },
  { id: 'twin', tier: 2, cls: 'archer', name: '쌍궁 레인저', dmg: 30, rate: 1.3, range: 150, dtype: 'p', proj: 'arrow', multi: 2,
    desc: '두 대상 동시 공격.', quip: '활 두 개, 손 두 개, 집중력 반.' },
  { id: 'storm', tier: 2, cls: 'mage', name: '번개 술사', dmg: 46, rate: 0.9, range: 125, dtype: 'm', proj: 'zap', chain: 4,
    desc: '연쇄 번개. 최대 4마리.', quip: '머리카락이 항상 서 있다.' },
  { id: 'shade', tier: 2, cls: 'rogue', name: '그림자 단검수', dmg: 40, rate: 1.4, range: 90, dtype: 'p', proj: 'dagger', backstab: 2,
    desc: '멀어지는 적의 뒤를 치면 피해 ×2.', quip: '뒤에서만 말 걸어주세요.' },
  { id: 'pilgrim', tier: 2, cls: 'priest', name: '빛의 순례자', dmg: 34, rate: 1.0, range: 125, dtype: 'm', proj: 'holy', splash: 24, auraSpd: 0.06,
    desc: '작은 범위 빛 공격. 주변 8칸 아군 공격 속도 +6%.', quip: '길을 잃은 게 아니라 순례 중이다.' },

  // ── 영웅 ──
  { id: 'paladin', tier: 3, cls: 'priest', name: '서약의 성기사', dmg: 75, rate: 1.0, range: 115, dtype: 'm', proj: 'holy', auraDmg: 0.12,
    desc: '주변 8칸 아군 피해 +12%.', quip: '서약서 약관은 안 읽었다.' },
  { id: 'wind', tier: 3, cls: 'archer', name: '바람 추적자', dmg: 62, rate: 1.5, range: 165, dtype: 'p', proj: 'arrow', rain: [5, 6, 1.3],
    desc: '5초마다 화살 비 6발.', quip: '바람 따라 왔다가 바람 따라 간다.' },
  { id: 'alch', tier: 3, cls: 'mage', name: '재의 연금술사', dmg: 72, rate: 1.0, range: 120, dtype: 'm', proj: 'flask', burn: [4, 0.35], boom: [52, 0.9],
    desc: '화상을 입힌다. 화상 중 죽은 적은 폭발.', quip: '폭발은 예술, 화상은 덤.' },
  { id: 'duel', tier: 3, cls: 'knight', name: '은빛 결투가', dmg: 95, rate: 1.2, range: 80, dtype: 'p', proj: 'melee', duel: [0.08, 10],
    desc: '같은 적을 계속 치면 피해 +8%씩 (최대 10중첩).', quip: '한 놈만 팬다.' },
  { id: 'viper', tier: 3, cls: 'rogue', name: '독침 암살자', dmg: 66, rate: 1.5, range: 105, dtype: 'p', proj: 'dagger', burn: [3, 0.3], execute: 0.02,
    desc: '독 바른 단검: 맞은 적이 3초 동안 중독된다. 2% 즉사.', quip: '독은 유기농이다.' },

  // ── 전설 ──
  { id: 'phoenix', tier: 4, cls: 'knight', name: '불사조 기수', dmg: 425, rate: 1.0, range: 95, dtype: 'p', proj: 'melee', dash: [5, 190, 3.5, 1.1],
    desc: '5초마다 적진을 꿰뚫고 돌진해 길 위에 거대한 화염 흔적을 남긴다.', quip: '말이 불타고 있는데 괜찮대요.' },
  { id: 'star', tier: 4, cls: 'mage', name: '별을 읽는 자', dmg: 375, rate: 0.85, range: 145, dtype: 'm', proj: 'star', meteor: [8, 5, 6, 58],
    desc: '8초마다 거대한 유성 5개를 떨어뜨린다.', quip: '별은 읽는데 분위기는 못 읽는다.' },
  { id: 'dusk', tier: 4, cls: 'archer', name: '황혼의 사수', dmg: 675, rate: 0.75, range: 240, dtype: 'p', proj: 'snipe', snipe: true, bossBonus: 0.5, pierce: true,
    desc: '체력이 가장 많은 적을 관통 저격. 보스 피해 +50%.', quip: '퇴근 시간에만 진심.' },
  { id: 'mask', tier: 4, cls: 'rogue', name: '가면 쓴 군주', dmg: 365, rate: 1.6, range: 120, dtype: 'p', proj: 'dagger', stoneOnKill: 0.015, execute: 0.03, multi: 2,
    desc: '두 대상 동시 공격. 3% 즉사. 처치 시 1.5% 확률로 행운석 (웨이브당 1개).', quip: '가면 속에도 가면이 있다.' },
  { id: 'bishop', tier: 4, cls: 'priest', name: '구름 대주교', dmg: 330, rate: 0.9, range: 150, dtype: 'm', proj: 'holy', splash: 32, auraDmg: 0.18, waveHeal: 2,
    desc: '광역 빛 공격. 주변 8칸 아군 피해 +18%. 웨이브마다 성벽 +2.', quip: '설교는 짧게. 축복은 길게.' },

  // ── 천상 (레시피 전용) ──
  { id: 'swordking', tier: 5, cls: 'knight', name: '무너진 왕관의 기사왕', dmg: 950, rate: 1.0, range: 110, dtype: 'p', proj: 'melee', judgment: [9, 3.2, 2.5], every3: 70,
    desc: '9초마다 왕의 심판: 화면 전체에 큰 피해 + 2.5초 기절. 세 번째 공격마다 광역 베기.', quip: '왕관은 무너져도 기사는 안 무너진다. 허리는 무너졌다.' },
  { id: 'witch', tier: 5, cls: 'mage', name: '시간을 꿰매는 마녀', dmg: 720, rate: 1.0, range: 160, dtype: 'm', proj: 'clock', splash: 40, globalSlow: 0.4, timeStop: [12, 2.5],
    desc: '모든 적 이동 속도 -40%. 광역 공격. 12초마다 시간 정지 2.5초.', quip: '마감 기한도 꿰매 드립니다.' },
  { id: 'skybow', tier: 5, cls: 'archer', name: '하늘을 꿰뚫는 활', dmg: 750, rate: 1.0, range: 999, dtype: 'p', proj: 'beam', beam: 16, bossPct: 0.02,
    desc: '굵은 일직선 관통 광선. 보스에게 최대 체력 2% 추가 피해.', quip: '하늘이 좀 아프다고 한다.' },
  { id: 'saint', tier: 5, cls: 'priest', name: '새벽의 성녀', dmg: 620, rate: 1.0, range: 150, dtype: 'm', proj: 'holy', splash: 36, globalDmg: 0.4, waveHeal: 5,
    desc: '아군 전체 피해 +40%. 광역 공격. 웨이브마다 성벽 +5.', quip: '새벽 기도는 5시. 지각 불허.' },
  { id: 'nameless', tier: 5, cls: 'rogue', name: '이름 없는 왕', dmg: 640, rate: 1.6, range: 130, dtype: 'p', proj: 'dagger', multi: 2, goldMul: 2, execute: 0.06, shadow: 0.35,
    desc: '두 대상 동시 공격. 처치 금화 ×2. 6% 즉사. 처치한 적의 35%가 그림자가 되어 한 번 더 공격.', quip: '이름은 없고 지갑은 두둑하다.' },
];

export const UNIT = Object.fromEntries(UNITS.map((u, i) => [u.id, Object.assign(u, { idx: i })]));
export const BY_TIER = TIERS.map((_, t) => UNITS.filter((u) => u.tier === t));

export const RECIPES = [
  { result: 'swordking', mats: ['ashguard', 'duel', 'phoenix'] },
  { result: 'witch', mats: ['frost', 'alch', 'star'] },
  { result: 'skybow', mats: ['xbow', 'wind', 'dusk'] },
  { result: 'saint', mats: ['nun', 'paladin', 'star'] },
  { result: 'nameless', mats: ['shade', 'mask', 'pick'] },
];
export const MAX_CELESTIAL = 2;

// 강화 그룹: 0 = 견습·숙련, 1 = 정예·영웅, 2 = 전설·천상
export const upgGroup = (tier) => (tier <= 1 ? 0 : tier <= 3 ? 1 : 2);
export const UPG_NAMES = ['견습 · 숙련', '정예 · 영웅', '전설 · 천상'];
export const upgCost = (g, lv) => [30 + lv * 16, 70 + lv * 34, 140 + lv * 70][g];
