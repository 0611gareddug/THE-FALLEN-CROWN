// 유물 1차 30종: 흔함 8 · 희귀 4 · 전설 2 · 세트 12 (4세트) · 저주 4
// fx: 전투 보정(R)에 더해지는 값. onGet: 얻는 순간 런 상태에 적용.
import { ROYAL_RELICS } from './fate.js';

export const RELICS = [
  // ── 흔함 ──
  { id: 'spoon', g: 'common', name: '녹슨 왕실 숟가락', fx: { grp: [0.08, 0, 0] }, desc: '견습·숙련 공격력 +8%', flavor: '왕실 식기였다. 지금은 그냥 숟가락이다.' },
  { id: 'bread', g: 'common', name: '반쯤 먹은 빵', fx: { waveHeal: 1 }, desc: '웨이브가 끝날 때마다 성벽 +1', flavor: '누가 먹다 남긴 거지? 아무튼 체력 회복.' },
  { id: 'ant', g: 'common', name: '근면한 개미 배지', fx: { summonCost: 1 }, desc: '소환 비용 -1', flavor: '개미는 쉬지 않는다. 당신도 쉬지 않는다.' },
  { id: 'boots', g: 'common', name: '낡은 장화', fx: { spd: 0.04 }, desc: '아군 공격 속도 +4%', flavor: '발 냄새가 전투 의욕을 북돋운다.' },
  { id: 'string', g: 'common', name: '새 활시위', fx: { cls: { archer: 0.08 } }, desc: '궁수 피해 +8%', flavor: '원래 있던 건 뿌루가 먹었다.' },
  { id: 'candle', g: 'common', name: '꺼지지 않는 양초', fx: { cls: { mage: 0.08 } }, desc: '마도 피해 +8%', flavor: '끄려고 해봤다. 안 꺼진다. 무섭다.' },
  { id: 'coin', g: 'common', name: '구멍 난 동전', fx: { waveGold: 6 }, desc: '웨이브 보상 금화 +6', flavor: '구멍으로 미래가 보인다고 한다. 안 보인다.' },
  { id: 'banner', g: 'common', name: '기운 왕국 깃발', fx: {}, onGet: { wallMax: 10 }, desc: '성벽 최대 체력 +10', flavor: '여기저기 기웠지만 아직 휘날린다.' },
  // ── 희귀 ──
  { id: 'quill', g: 'rare', name: '왕실 공식 깃털펜', fx: {}, run: { dice: 0.1 }, desc: '사건 주사위 판정 성공률 +10%p', flavor: '서명만 하면 다 된다고 믿었던 시절의 펜.' },
  { id: 'shiny', g: 'rare', name: '반짝이는 무언가', fx: { stone: 0.004 }, desc: '처치 시 행운석 확률 +0.4%p', flavor: '정체는 모른다. 반짝이니까 좋은 거다.' },
  { id: 'whet', g: 'rare', name: '정예의 숫돌', fx: { grp: [0, 0.12, 0] }, desc: '정예·영웅 공격력 +12%', flavor: '칼을 갈면 마음도 갈린다.' },
  { id: 'hourglass', g: 'rare', name: '거꾸로 도는 모래시계', fx: { slow: 0.08 }, desc: '모든 적 이동 속도 -8%', flavor: '모래가 위로 떨어진다. 물리학이 울고 있다.' },
  // ── 전설 ──
  { id: 'receipt', g: 'legend', name: '용의 세금 영수증', fx: { goldMul: 0.25 }, desc: '처치 금화 +25%', flavor: '용이 진짜로 세금을 냈다는 유일한 증거.' },
  { id: 'godDice', g: 'legend', name: '신의 주사위 (복제품)', fx: {}, run: { autoDice: 1 }, desc: '판당 1회, 주사위 판정을 무조건 성공', flavor: '정품 인증은 받지 못했다.' },
  // ── 세트: 잿불 대장간 ──
  { id: 'hammer', g: 'set', set: 'forge', name: '잿불 망치', fx: { cls: { knight: 0.05 } }, desc: '기사 피해 +5%', flavor: '두드리면 불티가 튄다. 손가락에도.' },
  { id: 'anvil', g: 'set', set: 'forge', name: '잿불 모루', fx: { cls: { knight: 0.05 } }, desc: '기사 피해 +5%', flavor: '들고 다니기엔 너무 무겁다. 그래도 들고 다닌다.' },
  { id: 'bellows', g: 'set', set: 'forge', name: '잿불 풀무', fx: { cls: { knight: 0.05 } }, desc: '기사 피해 +5%', flavor: '바람을 넣으면 의욕도 들어간다.' },
  // ── 세트: 도박사의 밤 ──
  { id: 'crackdice', g: 'set', set: 'gambler', name: '금 간 주사위', fx: {}, desc: '세트 2개: 도박 성공률 +5%p · 3개: 꽝이면 행운석 절반 환급', flavor: '6이 나올 것처럼 생겼다. 안 나온다.' },
  { id: 'markcard', g: 'set', set: 'gambler', name: '표시된 카드', fx: {}, desc: '세트 2개: 도박 성공률 +5%p · 3개: 꽝이면 행운석 절반 환급', flavor: '뒷면에 연필로 "에이스"라고 써 있다.' },
  { id: 'sock', g: 'set', set: 'gambler', name: '행운의 양말', fx: {}, desc: '세트 2개: 도박 성공률 +5%p · 3개: 꽝이면 행운석 절반 환급', flavor: '빨면 운이 빠진다고 해서 안 빨았다.' },
  // ── 세트: 왕실 만찬 ──
  { id: 'fork', g: 'set', set: 'feast', name: '은 포크', fx: {}, desc: '세트 2개: 웨이브마다 성벽 +1 · 3개: 야영 회복 2배', flavor: '포크로 수프를 먹는 법을 연구 중.' },
  { id: 'soup', g: 'set', set: 'feast', name: '식은 수프', fx: {}, desc: '세트 2개: 웨이브마다 성벽 +1 · 3개: 야영 회복 2배', flavor: '300년 묵었다. 아직 따뜻했던 기억이 있다.' },
  { id: 'glass', g: 'set', set: 'feast', name: '빈 와인잔', fx: {}, desc: '세트 2개: 웨이브마다 성벽 +1 · 3개: 야영 회복 2배', flavor: '비어 있지만 마음만은 가득.' },
  // ── 세트: 숲의 노래 ──
  { id: 'flute', g: 'set', set: 'forest', name: '도토리 피리', fx: {}, desc: '세트 2개: 궁수 피해 +10% · 3개: 모든 공격 치명타 +6%', flavor: '불면 다람쥐가 화를 낸다.' },
  { id: 'moss', g: 'set', set: 'forest', name: '이끼 망토', fx: {}, desc: '세트 2개: 궁수 피해 +10% · 3개: 모든 공격 치명타 +6%', flavor: '촉촉하다. 지나치게.' },
  { id: 'nest', g: 'set', set: 'forest', name: '빈 새 둥지', fx: {}, desc: '세트 2개: 궁수 피해 +10% · 3개: 모든 공격 치명타 +6%', flavor: '뿌루가 이사 오고 싶어 한다.' },
  // ── 저주 ──
  { id: 'blood', g: 'curse', name: '피의 계약서', fx: {}, onGet: { stones: 5, wallMax: -20 }, desc: '즉시 행운석 +5 · 대가: 성벽 최대 체력 -20', flavor: '약관이 247페이지다. 아무도 안 읽었다.' },
  { id: 'gacha', g: 'curse', name: '무한 가챠 부적', fx: { double: [0.1, 0.1] }, desc: '소환 10% 확률로 2명 · 대가: 10% 확률로 0명', flavor: '돌리고 싶다. 계속 돌리고 싶다.' },
  { id: 'scepter', g: 'curse', name: '투덜대는 왕홀', fx: { dmg: 0.3, summonCost: -3 }, desc: '모든 피해 +30% · 대가: 소환 비용 +3', flavor: '"또 나야? 왜 맨날 나야?"' },
  { id: 'fakecrown', g: 'curse', name: '짝퉁 무너진 왕관', fx: { celestialMax: 1, wallDrain: 1 }, desc: '천상 유닛 한도 +1 · 대가: 웨이브마다 성벽 -1', flavor: '가짜인데 저주는 진짜다.' },
];
// 왕족 전용 유물은 무작위 보상 · 상점에는 나오지 않는다 (운명의 장에서만)
export { ROYAL_RELICS };
export const RELIC = Object.fromEntries([...RELICS, ...ROYAL_RELICS].map((r) => [r.id, r]));

export const SETS = {
  forge: { name: '잿불 대장간', n2: { fx: { cls: { knight: 0.1 } }, text: '기사 피해 +10%' }, n3: { fx: { upgCost: 0.3 }, text: '강화 비용 -30%' } },
  gambler: { name: '도박사의 밤', n2: { fx: { gamble: 0.05 }, text: '도박 소환 성공률 +5%p' }, n3: { fx: { gambleRefund: 1 }, text: '꽝이면 50% 확률로 행운석 절반 환급' } },
  feast: { name: '왕실 만찬', n2: { fx: { waveHeal: 1 }, text: '웨이브마다 성벽 +1' }, n3: { fx: {}, run: { campHeal: 2 }, text: '야영 회복량 2배' } },
  forest: { name: '숲의 노래', n2: { fx: { cls: { archer: 0.1 }, range: 6 }, text: '궁수 피해 +10%, 사거리 증가' }, n3: { fx: { crit: 0.06 }, text: '모든 공격 치명타 +6% (도토리가 아프다)' } },
};

export const GRADE = {
  common: { name: '흔함', color: '#8a7458' },
  rare: { name: '희귀', color: '#2f6fc8' },
  legend: { name: '전설', color: '#c27510' },
  set: { name: '세트', color: '#2e8b3e' },
  curse: { name: '저주', color: '#c0392b' },
  light: { name: '용사 · 빛', color: '#d0a010' },
  dark: { name: '용사 · 어둠', color: '#8a52d0' },
};

// 보정 객체 합치기
export function mergeFx(R, fx) {
  for (const [k, v] of Object.entries(fx || {})) {
    if (k === 'cls') { R.cls = R.cls || {}; for (const [c, x] of Object.entries(v)) R.cls[c] = (R.cls[c] || 0) + x; }
    else if (k === 'grp') { R.grp = R.grp || [0, 0, 0]; v.forEach((x, i) => (R.grp[i] += x)); }
    else if (k === 'double') R.double = v;
    else R[k] = (R[k] || 0) + v;
  }
  return R;
}

export function setCounts(relics) {
  const c = {};
  for (const id of relics) { const r = RELIC[id]; if (r && r.set) c[r.set] = (c[r.set] || 0) + 1; }
  return c;
}
