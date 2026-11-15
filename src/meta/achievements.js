// 업적 43개 · 달성 시 별가루 + 알림
import { store, save } from '../core/storage.js';

export const ACHS = [
  // 진행 (8)
  { id: 'act1', cat: '진행', name: '첫 걸음', desc: '1막 보스 슬라임왕 퐁퐁 처치', ash: 10 },
  { id: 'act2', cat: '진행', name: '바다는 우리 것', desc: '2막 보스 먹물수염 처치', ash: 15 },
  { id: 'dragonKill', cat: '진행', name: '용의 둥지', desc: '실바나와의 전투에서 승리', ash: 15 },
  { id: 'finish', cat: '진행', name: '왕의 귀환', desc: '아무 결말이나 보기', ash: 20 },
  { id: 'edricWin', cat: '진행', name: '방패는 거들 뿐', desc: '레오로 결말 보기', ash: 10 },
  { id: 'serenWin', cat: '진행', name: '반납 기한은 지킵시다', desc: '미나로 결말 보기', ash: 10 },
  { id: 'kyleWin', cat: '진행', name: '전설의 빵집', desc: '피크로 결말 보기', ash: 10 },
  { id: 'nixWin', cat: '진행', name: '점 하나 차이', desc: '닉스로 결말 보기', ash: 10 },
  { id: 'runs10', cat: '진행', name: '모험 단골', desc: '여정을 10번 끝내기', ash: 20 },
  // 수집 (8)
  { id: 'cel1', cat: '수집', name: '하늘이 열렸다', desc: '천상 유닛 처음 만들기', ash: 10 },
  { id: 'cel2', cat: '수집', name: '천상의 듀오', desc: '한 판에 천상 유닛 2명', ash: 15 },
  { id: 'relic10', cat: '수집', name: '유물 덕후', desc: '한 판에 유물 10개', ash: 15 },
  { id: 'set3', cat: '수집', name: '풀세트', desc: '세트 유물 3개 모두 모으기', ash: 15 },
  { id: 'party3', cat: '수집', name: '든든한 일행', desc: '동료 3명과 함께 여행', ash: 10 },
  { id: 'bond5', cat: '수집', name: '평생 친구', desc: '동료 한 명과 인연 5 달성', ash: 15 },
  { id: 'shards5', cat: '수집', name: '무지개 맞추기', desc: '무지개 조각 5개 모두 모으기', ash: 20 },
  { id: 'codex50', cat: '수집', name: '연대기 기록관', desc: '유닛 도감 50% 달성', ash: 10 },
  // 운 · 망함 (10)
  { id: 'fail10', cat: '운 · 망함', name: '운명의 여신 읽씹', desc: '도박 소환 꽝 누적 10번', ash: 10 },
  { id: 'pity', cat: '운 · 망함', name: '불운의 결정', desc: '불운 게이지로 영웅 확정 소환', ash: 10 },
  { id: 'lowroll', cat: '운 · 망함', name: '3%의 기적', desc: '성공률 10% 이하 판정 성공', ash: 20 },
  { id: 'gamble3', cat: '운 · 망함', name: '인생은 한 방', desc: '전설 도전 도박 소환 성공', ash: 15 },
  { id: 'wall1', cat: '운 · 망함', name: '종이 한 장 차이', desc: '성벽 5 이하로 전투 승리', ash: 15 },
  { id: 'overflow', cat: '운 · 망함', name: '만원 사례', desc: '필드 몬스터 120마리 돌파', ash: 5 },
  { id: 'cursed2', cat: '운 · 망함', name: '저주 수집가', desc: '저주 유물 2개 보유', ash: 10 },
  { id: 'broke', cat: '운 · 망함', name: '빈털터리', desc: '금화 0으로 상점 나가기', ash: 5 },
  { id: 'defeat1', cat: '운 · 망함', name: '넘어진 용사', desc: '처음으로 패배하기', ash: 5 },
  { id: 'zero', cat: '운 · 망함', name: '0명 소환', desc: '무한 가챠 부적으로 아무도 안 나오기', ash: 5 },
  // 스토리 (8)
  { id: 'trueEnd', cat: '스토리', name: '무지개 다리', desc: '진엔딩 보기', ash: 50 },
  { id: 'tax', cat: '스토리', name: '납세의 의무', desc: '용에게 세금 받기', ash: 15 },
  { id: 'dragon', cat: '스토리', name: '용 기수의 귀환', desc: '실바나를 싸우지 않고 되찾기', ash: 20 },
  { id: 'darkEnd', cat: '스토리', name: '요정 나라', desc: '마왕성을 꽃밭으로 바꾸는 결말 보기', ash: 15 },
  { id: 'allEndings', cat: '스토리', name: '모든 길의 끝', desc: '공통 결말 7개를 모두 보기', ash: 100 },
  { id: 'collector', cat: '스토리', name: '세리 기절시키기', desc: '용의 영수증으로 세금 꽃게를 쓰러뜨리기', ash: 10 },
  { id: 'allowance', cat: '스토리', name: '천 년 만의 용돈', desc: '전설의 용사 유령에게 용돈 받기', ash: 10 },
  // 병맛 · 숨김 (6)
  { id: 'wall4', cat: '병맛 · 숨김', name: '제4의 벽', desc: '등대지기에게 다른 방법을 묻기', ash: 5, hidden: true },
  { id: 'rocktalk', cat: '병맛 · 숨김', name: '돌의 친구 (후보)', desc: '길가의 돌과 대화하기', ash: 5, hidden: true },
  { id: 'plane5', cat: '병맛 · 숨김', name: '종이비행기 장인', desc: '종이비행기를 5번 접기', ash: 10, hidden: true },
  { id: 'knock', cat: '병맛 · 숨김', name: '똑똑', desc: '상자에 노크하기', ash: 5, hidden: true },
  { id: 'flour', cat: '병맛 · 숨김', name: '밀가루 의식', desc: '요정의 밤 정원을 빵 반죽으로 만들기', ash: 10, hidden: true },
  { id: 'rockEnd', cat: '병맛 · 숨김', name: '돌의 친구', desc: '돌쇠와 함께 진엔딩 보기', ash: 30, hidden: true },
];
export const ACH = Object.fromEntries(ACHS.map((a) => [a.id, a]));
// 이벤트 데이터의 별칭
const ALIAS = { chatty: null, overdue: null, duet: null, sellToto: null };

let notify = null;
export function onAchievement(fn) { notify = fn; }

export function unlockAch(id) {
  if (ALIAS[id] === null && !ACH[id]) return false;
  const a = ACH[id];
  if (!a) return false;
  const d = store();
  d.ach = d.ach || [];
  if (d.ach.includes(id)) return false;
  d.ach.push(id);
  d.ash += a.ash;
  save();
  if (notify) notify(a);
  if (d.ach.length >= 10) { d.mascots = d.mascots || ['puru']; if (!d.mascots.includes('potato')) { d.mascots.push('potato'); save(); } }
  if (d.ach.length >= 20) { d.mascots = d.mascots || ['puru']; if (!d.mascots.includes('fox')) { d.mascots.push('fox'); save(); } }
  return true;
}

// 용사단 보물창고 영구 강화
export const PERKS = [
  { id: 'gold', name: '용사단 금고 열쇠', desc: '시작 금화 +5', max: 3, cost: (lv) => 30 + lv * 30 },
  { id: 'wall', name: '튼튼한 주춧돌', desc: '시작 성벽 최대 체력 +5', max: 2, cost: (lv) => 40 + lv * 40 },
  { id: 'free', name: '첫 소환 무료권', desc: '여정 첫 소환 1회 무료', max: 1, cost: () => 60 },
  { id: 'relic', name: '유산 상자', desc: '여정 시작 시 유물 3개 중 1개 선택', max: 1, cost: () => 120 },
  { id: 'stone', name: '주머니 속 행운석', desc: '시작 행운석 +1', max: 2, cost: (lv) => 50 + lv * 50 },
];
