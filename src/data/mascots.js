// 반려 마스코트 8마리: 패시브 + 액티브 스킬(시간 쿨타임) + 해금 조건
export const MASCOT_DEFS = {
  puru: {
    name: '뿌루', kind: '잿빛 병아리', cd: 60, skill: '삐약 응원',
    skillDesc: '10초 동안 아군 전체 공격 속도 +30%.',
    passive: '꽝이 나면 20% 확률로 위로금 금화 30.',
    unlock: '기본', lines: ['삐약!', '삐약삐약 (응원 중)', '(꽝을 보고 도망감)'],
  },
  cat: {
    name: '왕관냥', kind: '왕관을 허리에 찬 고양이', cd: 50, skill: '냥펀치 난타',
    skillDesc: '체력이 가장 높은 적 5마리를 두드려 2초 기절 + 피해.',
    passive: '스킬 피해가 적 체력에 비례해 강하다.',
    unlock: '왕실 보물고', cost: 60, lines: ['냥.', '(식빵 굽는 중)', '냐앙—'],
  },
  mimic: {
    name: '덥석이', kind: '미믹 상자', cd: 75, skill: '와구와구',
    skillDesc: '길 한 구간의 일반 적을 최대 12마리 삼키고 한 마리당 금화 3.',
    passive: '처치 금화가 5% 확률로 2배.',
    unlock: "사건 '절대 열지 마시오'에서 노크", lines: ['덥석!', '(트림)', '누구세요?'],
  },
  rock: {
    name: '돌쇠', kind: '그냥 돌멩이', cd: 30, skill: '그냥 있기',
    skillDesc: "'......' 단, 1% 확률로 '돌의 각성': 일반 적 전부 즉사.",
    passive: '없음. 정말 없음.',
    unlock: '왕실 보물고 (제일 비쌈)', cost: 200, lines: ['......', '......', '......!'],
  },
  owl: {
    name: '부엉박사', kind: '안경 쓴 부엉이 현자', cd: 70, skill: '야간 강의',
    skillDesc: '12초 동안 마도 계열 피해 +50%, 마법 피해 +20%.',
    passive: '사건의 주사위 판정 성공률 +5%p.',
    unlock: '연대기 수집률 30%', lines: ['부엉. 오늘 강의는…', '(졸고 있는 적들)', '출석 부르겠습니다.'],
  },
  egg: {
    name: '용알이', kind: '꺼진 줄 알았던 용알', cd: 60, skill: '데굴데굴 / 아기 숨결',
    skillDesc: '알일 때는 적을 뒤로 밀쳐내고, 처치 800마리 후 아기 용이 되면 길을 따라 화염을 뿜는다.',
    passive: '판 동안 처치할수록 자란다 (300 / 800).',
    unlock: '보르크 인연 5', lines: ['(데굴)', '(금이 갔다!)', '뀨아—!'],
  },
  snail: {
    name: '느릿', kind: '달팽이 우체부', cd: 90, skill: '빠른 등기',
    skillDesc: '누르고 5초 뒤 숙련 유닛 2명을 배달. 빈칸이 없으면 금화로 반송.',
    passive: '웨이브 보상 금화 +5%.',
    unlock: '왕실 보물고', cost: 80, lines: ['빠른 등기 왔…습…니…다…', '서명 부탁드려요.', '(아직 가는 중)'],
  },
  potato: {
    name: '감자', kind: '무념무상 감자', cd: 90, skill: '싹 틔우기',
    skillDesc: '성벽 체력 +8 회복. 쓰고 나면 감자가 꾸벅꾸벅 존다.',
    passive: '성벽 최대 체력 +10.',
    unlock: '업적 10개 달성', lines: ['(감자)', '(싹)', '(쿨쿨)'],
  },
};
export const MASCOT_ORDER = ['puru', 'cat', 'mimic', 'rock', 'owl', 'egg', 'snail', 'potato'];
// 친밀도: 판을 끝낼 때마다 경험치, 레벨당 필요량
export const MASCOT_XP = [0, 3, 8, 15, 25];
