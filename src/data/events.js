import { FATE } from './fate.js';
// 사건 40개 (1차) + 특수 사건
// 대사: [누가, 표정, 문장]  누가: narr(해설) · CAST id · '@q'(동료 중 한 명이 있으면 그 동료가 말함)
// 선택지: t(문구) · sub(설명) · cond(조건) · hide(조건 불충족 시 숨김) · fx(효과) · r(결과 대사)
//         roll(성공 확률) · win/lose { fx, r }
// fx: gold stones wall wallMax rep{} bond{} relic unit loseUnit flag shard join leave mod{fx,battles,name} mascot ach heal upg

const E = {};
const ev = (id, o) => (E[id] = { id, ...o });

// ═══════════════ 1막 공통 ═══════════════
ev('tax', {
  title: '밀린 세금 고지서', act: [1], bg: 'office', kind: 'common',
  intro: [
    ['narr', '', '텅 빈 왕실 세무서. 책상 위에 300년 치 세금 고지서가 탑처럼 쌓여 있다.'],
    ['narr', '', "맨 위 고지서의 수신인은 '북쪽 산의 용'이다."],
  ],
  choices: [
    { t: '백성들의 세금을 전부 탕감한다', sub: '빛의 교회 +2 · 금화 -30', fx: { rep: { church: 2 }, gold: -30 }, r: [['@q', 'happy', 'ㄹㅇ 성군 각.'], ['narr', '', '어디선가 박수 소리가 들린다. 한 명이다.']] },
    { t: '고지서를 용에게 보낸다', sub: '성공 3%', roll: 0.03,
      win: { fx: { gold: 500, relic: 'receipt', ach: 'tax' }, r: [['narr', '', '며칠 뒤, 까맣게 탄 봉투가 도착했다.'], ['narr', '', '안에는 금화 500닢과 정중한 사과 편지가 들어 있었다. 용이 진짜로 세금을 냈다.']] },
      lose: { fx: { wall: -10 }, r: [['narr', '', '용이 답장을 보냈다. 불로.'], ['@q', 'shock', '성벽이… 바삭해졌어요.']] } },
    { t: '고지서로 종이비행기를 접는다', sub: '아무 일도 없다 (아마도)', fx: { flagInc: 'plane' }, r: [['narr', '', '종이비행기는 우아하게 날아가 창밖의 잿더미에 꽂혔다.'], ['bran', 'shock', '…폐하, 방금 그건 왜 하신 겁니까?']] },
  ],
});

ev('box', {
  title: '절대 열지 마시오', act: [1, 2], bg: 'road', kind: 'common',
  intro: [
    ['narr', '', "길 한가운데 상자가 있다. 상자에는 '절대 열지 마시오'라고 쓰여 있다."],
    ['narr', '', "그 아래 작은 글씨로 '진짜로'."],
  ],
  choices: [
    { t: '연다', sub: '성공 50% · 희귀 유물 / 저주 유물', roll: 0.5,
      win: { fx: { relic: 'random:rare' }, r: [['narr', '', '상자 안에서 반짝이는 무언가가 나왔다. 경고문은 뻥이었다.']] },
      lose: { fx: { relic: 'random:curse' }, r: [['narr', '', '상자 안에서 음산한 목소리가 들린다. "열지 말랬지."'], ['narr', '', '저주받은 물건이 손에 달라붙었다. 떨어지지 않는다.']] } },
    { t: '열지 않는다', fx: {}, r: [['narr', '', '상자가 섭섭한 듯 혼자 굴러간다. 데굴. 데굴.']] },
    { t: '노크한다', sub: '???', fx: { mascot: 'mimic', ach: 'knock' }, r: [['box', 'neutral', '누구세요?'], ['narr', '', '……'], ['box', 'happy', '아 왕족이시구나! 저 따라가도 돼요? 금화 좋아해요.'], ['narr', '', "마스코트 '덥석이'가 마음을 열었다. (다음 판부터 선택 가능)"]] },
  ],
});

ev('refugees', {
  title: '잿더미의 난민', act: [1], bg: 'ruins', kind: 'common',
  intro: [
    ['villager', 'sad', '왕족이시라고요? 저희 마을이… 하룻밤 새 재가 됐어요.'],
    ['villager', 'sad', '애들이 배고프대요. 어른도 배고프고요. 사실 저도 배고파요.'],
  ],
  choices: [
    { t: '성벽 안으로 받아들인다', sub: '빛의 교회 +2 · 성직 유닛 1명 · 다음 2전투 적 체력 +10%', fx: { rep: { church: 2 }, unit: 'nun', mod: { fx: { enemyHp: 0.1 }, battles: 2, name: '난민 보호' } }, r: [['villager', 'happy', '감사합니다! 저희 수녀님도 같이 갈게요. 기도는 무료예요.']] },
    { t: '길드에 일자리를 소개한다', sub: '떠돌이 길드 +2 · 금화 -30', fx: { rep: { guild: 2 }, gold: -30 }, r: [['villager', 'neutral', '길드요? 거기 수수료가… 아, 아닙니다. 감사합니다.']] },
    { t: '모른 척 지나간다', sub: '재의 교단 +1', fx: { rep: { cult: 1, church: -1 } }, r: [['narr', '', '등 뒤로 수군거림이 들린다. "역시 왕족들은…"'], ['@q', 'sad', '…'], ['narr', '', '어디선가 재의 교단이 이 모습을 흡족하게 지켜보았다.']] },
  ],
});

ev('well', {
  title: '소원을 들어주는 우물', act: [1, 2], bg: 'forest', kind: 'common',
  intro: [
    ['narr', '', '숲속에 낡은 우물이 있다. 표지판: "소원 1회 금화 50. 환불 불가. 결과 보장 불가."'],
  ],
  choices: [
    { t: '금화 50을 던진다', sub: '성공 40% · 행운석 3', cond: { goldMin: 50 }, roll: 0.4,
      win: { fx: { gold: -50, stones: 3 }, r: [['narr', '', '우물 속에서 보라색 돌 세 개가 튀어나왔다. 영수증도 같이.']] },
      lose: { fx: { gold: -50 }, r: [['narr', '', '퐁당. 아무 일도 없었다.'], ['narr', '', '우물 속에서 "ㅋ" 소리가 들린 것 같다.']] } },
    { t: '우물에 들어가 금화를 줍는다', sub: '성공 25% · 금화 +150 / 실패 시 성벽 -8', roll: 0.25,
      win: { fx: { gold: 150, rep: { guild: 1 } }, r: [['narr', '', '바닥에는 300년 치 소원이 쌓여 있었다. 다 금화였다.']] },
      lose: { fx: { wall: -8 }, r: [['narr', '', '우물은 생각보다 깊었다. 그리고 축축했다.'], ['@q', 'smug', '소원 빌었어요? "나가고 싶다"로?']] } },
    { t: '그냥 지나간다', fx: {}, r: [['narr', '', '합리적인 선택이었다. 재미는 없었다.']] },
  ],
});

ev('scarecrow', {
  title: '허수아비 기사', act: [1], bg: 'road', kind: 'common',
  intro: [
    ['narr', '', '밭 한가운데 갑옷을 입은 허수아비가 서 있다. 꽤 늠름하다.'],
    ['narr', '', '자세히 보니 갑옷은 진짜다. 허수아비는 가짜다.'],
  ],
  choices: [
    { t: '진지하게 결투를 신청한다', sub: '성공 50% · 정예 기사 유닛', roll: 0.5,
      win: { fx: { unit: 'random:2:knight' }, r: [['narr', '', '허수아비가 쓰러지자 안에서 진짜 기사가 기어 나왔다. "…덕분에 깼소. 함께하겠소."']] },
      lose: { fx: { wall: -5 }, r: [['narr', '', '허수아비가 바람에 넘어지며 정확히 머리를 때렸다.'], ['@q', 'smug', '방금 허수아비한테 진 거예요?']] } },
    { t: '갑옷만 빌린다', sub: '유물: 낡은 장화', fx: { relic: 'boots' }, r: [['narr', '', '갑옷은 너무 무거웠다. 장화만 챙겼다. 냄새가 났다.']] },
    { t: '허수아비에게 왕국의 미래를 상담한다', sub: '???', fx: { flag: 'scarecrowTalk', rep: { tribe: 1 } }, r: [['narr', '', '허수아비는 말이 없었다. 그래서 좋은 상담사였다.'], ['narr', '', '지나가던 숲의 부족 사냥꾼이 이 광경을 보고 고개를 끄덕였다.']] },
  ],
});

ev('bakery', {
  title: '해골 빵집', act: [1], bg: 'ruins', kind: 'common',
  intro: [
    ['narr', '', '무너진 빵집에서 고소한 냄새가 난다. 해골이 앞치마를 두르고 빵을 굽고 있다.'],
    ['narr', '', '해골: "딸깍딸깍(어서 오세요)."'],
  ],
  choices: [
    { t: '빵을 산다', sub: '금화 -20 · 유물: 반쯤 먹은 빵', cond: { goldMin: 20 }, fx: { gold: -20, relic: 'bread' }, r: [['narr', '', '해골이 빵을 반으로 나눠 반쪽을 먹었다. 뼈 사이로 빵가루가 떨어졌다.']] },
    { t: '레시피를 훔친다', sub: '성공 40% · 떠돌이 길드 +2, 금화 +60', roll: 0.4,
      win: { fx: { rep: { guild: 2 }, gold: 60 }, r: [['narr', '', '레시피를 길드에 팔았다. "해골 빵" 체인점이 생길 예정이다.']] },
      lose: { fx: { rep: { church: -1 }, wall: -5 }, r: [['narr', '', '해골이 밀대로 정확히 정강이를 쳤다. 뼈가 뼈를 때렸다.']] } },
    { t: '해골에게 노동권을 설명한다', sub: '???', fx: { flag: 'skeletonUnion', rep: { church: 1 } }, r: [['narr', '', '해골은 진지하게 들었다. 그리고 앞치마를 벗어 던졌다.'], ['narr', '', '"딸깍(파업)!" …어딘가에서 해골들이 수군대기 시작했다.']] },
  ],
});

ev('pebble', {
  title: '길가의 돌', act: [1, 2, 3], bg: 'road', kind: 'common', repeat: true, weight: 0.4,
  intro: [['narr', '', '길가에 평범한 돌이 있다. 아주 평범하다. 놀랄 만큼 평범하다.']],
  choices: [
    { t: '돌과 대화한다', fx: { ach: 'rocktalk' }, r: [['narr', '', '……'], ['narr', '', '……'], ['narr', '', '돌은 끝까지 말이 없었다. 깊은 우정을 느꼈다.']] },
    { t: '돌을 뒤집는다', sub: '성공 30% · 금화 +40', roll: 0.3, win: { fx: { gold: 40 }, r: [['narr', '', '돌 밑에 누군가 숨겨 둔 비상금이 있었다.']] }, lose: { fx: {}, r: [['narr', '', '돌 밑에는 돌이 있었다.']] } },
    { t: '지나간다', fx: {}, r: [['narr', '', '돌은 당신을 기억할 것이다. 아마도.']] },
  ],
});

// ═══════════════ 2막 공통 ═══════════════
ev('dicetemple', {
  title: '운명의 신관', act: [2], bg: 'temple', kind: 'common',
  intro: [
    ['dicepriest', 'smug', '또 오셨네. 이번에도 굴리실 거죠? 압니다, 압니다.'],
    ['dicepriest', 'neutral', '요즘 왕족들은 인생을 다 주사위로 결정하시더라.'],
  ],
  choices: [
    { t: '행운석 1개를 바치고 축복받는다', sub: '다음 3번의 주사위 판정 +25%p', cond: { stonesMin: 1 }, fx: { stones: -1, flag: 'blessed3' }, r: [['dicepriest', 'happy', '축복받으셨습니다. 영수증은 안 드려요.']] },
    { t: '주사위 말고 다른 방법은 없냐고 묻는다', fx: { ach: 'wall4' }, r: [['dicepriest', 'smug', '없어요. 이 세계관이 원래 그래요.'], ['narr', '', '어딘가에서 제작자가 고개를 끄덕였다.']] },
    { t: '신전의 주사위를 몰래 바꿔치기한다', sub: '성공 20% (카일 +30%p) · 전설 유물', roll: 0.2, royalBonus: { kyle: 0.3 },
      win: { fx: { relic: 'godDice' }, r: [['narr', '', '완벽한 손놀림이었다. 신관은 아무것도 눈치채지 못했다.'], ['dicepriest', 'shock', '…어? 이거 6만 나오는데?']] },
      lose: { fx: { gold: -100, rep: { church: -1 } }, r: [['dicepriest', 'angry', '거기, 손. 그거 내려놓으세요.'], ['narr', '', '신관이 소송을 걸었다. 합의금으로 금화 100을 냈다.']] } },
  ],
});

ev('board', {
  title: '왕국 자유게시판', act: [2], bg: 'market', kind: 'common',
  intro: [
    ['narr', '', '무너진 광장 게시판에 쪽지가 빼곡하다.'],
    ['narr', '', '"왕족 일 안 함 ㄹㅇ" "성벽 또 뚫림 실화냐" "재 그만 좀 내려라"'],
  ],
  choices: [
    { t: '정성스럽게 답글을 단다', sub: '모든 진영 +1', fx: { rep: { church: 1, cult: 1, tribe: 1, guild: 1 } }, r: [['narr', '', '답글이 300개 달렸다. 절반은 "누구세요?"였다.']] },
    { t: '본인 등판한다', sub: '다음 3전투 공격 속도 +10%', fx: { mod: { fx: { spd: 0.1 }, battles: 3, name: '본인 등판' } }, r: [['narr', '', '쪽지가 하나 더 붙었다. "ㄷㄷ 본인 등판"'], ['narr', '', '백성들의 사기가 올랐다. 조금.']] },
    { t: '게시판을 통째로 떼어 간다', sub: '떠돌이 길드 +2 · 빛의 교회 -1 · 성벽 +15', fx: { rep: { guild: 2, church: -1 }, wall: 15 }, r: [['narr', '', '게시판은 훌륭한 땔감이 되었다. 성벽 보수에도 썼다.'], ['@q', 'smug', '여론 통제 완료.']] },
  ],
});

ev('arena', {
  title: '지하 결투장', act: [2], bg: 'crypt', kind: 'common',
  intro: [
    ['guild', 'smug', '어서 오십쇼! 오늘의 경기: 두꺼비 대 두꺼비! 배당률 1.9배!'],
    ['narr', '', '두 두꺼비는 서로에게 관심이 없어 보인다.'],
  ],
  choices: [
    { t: '왼쪽 두꺼비에 금화 100을 건다', sub: '성공 50% · 금화 +90', cond: { goldMin: 100 }, roll: 0.5,
      win: { fx: { gold: 90 }, r: [['narr', '', '왼쪽 두꺼비가 오른쪽 두꺼비를 삼켰다. 경기 끝.']] },
      lose: { fx: { gold: -100 }, r: [['narr', '', '오른쪽 두꺼비가 왼쪽 두꺼비를 삼켰다. 금화도 삼켰다.']] } },
    { t: '직접 출전한다', sub: '다음 전투 적 +20%, 대신 행운석 +2', fx: { stones: 2, mod: { fx: { enemyHp: 0.2 }, battles: 1, name: '결투장 후유증' } }, r: [['narr', '', '두꺼비 둘이 동시에 당신을 바라봤다. 경기는 화제가 되었다.']] },
    { t: '사인회를 연다', sub: '떠돌이 길드 +1 · 금화 +40', fx: { rep: { guild: 1 }, gold: 40 }, r: [['narr', '', '"왕족 친필"은 생각보다 잘 팔렸다. 대부분 땔감용이었다.']] },
  ],
});

ev('statue', {
  title: '모르벤의 동상', act: [2], bg: 'hall', kind: 'common',
  intro: [
    ['narr', '', '광장 한가운데 거대한 모르벤 동상이 서 있다. 받침대에는 "위대한 섭정"이라고 새겨져 있다.'],
    ['narr', '', '동상의 표정이 묘하게 얄밉다.'],
  ],
  choices: [
    { t: '동상을 부순다', sub: '빛의 교회 +1 · 재의 교단 -2', fx: { rep: { church: 1, cult: -2 }, flag: 'statueDown' }, r: [['narr', '', '동상이 쓰러지며 정확히 반으로 갈라졌다. 속은 비어 있었다. 모르벤처럼.']] },
    { t: '수염을 그려 넣는다', sub: '성공 60% · 다음 보스전 보스 체력 -10%', roll: 0.6,
      win: { fx: { mod: { fx: { bossHp: -0.1 }, battles: 99, name: '동상 낙서', boss: true } }, r: [['narr', '', '훌륭한 수염이었다. 이 소식을 들은 모르벤의 위엄이 깎였다.']] },
      lose: { fx: { wall: -5 }, r: [['narr', '', '경비병에게 들켰다. 도망치다 넘어졌다.']] } },
    { t: '동상에 경배한다', sub: '재의 교단 +2', fx: { rep: { cult: 2 } }, r: [['narr', '', '동상이 미소 지은 것 같았다. 기분 탓이다. 아마.']] },
  ],
});

ev('overdue', {
  title: '금서 열람실', act: [2, 3], bg: 'library', kind: 'common',
  intro: [
    ['narr', '', '왕실 도서관 깊은 곳, 쇠사슬로 묶인 책장이 있다.'],
    ['narr', '', '사서의 메모: "세렌 공주님 연체 4년째. 반납 바람."'],
  ],
  choices: [
    { t: '금서를 읽는다', sub: '성공 50% (세렌 +35%p) · 영구: 마도 피해 +10%', roll: 0.5, royalBonus: { seren: 0.35 },
      win: { fx: { mod: { fx: { cls: { mage: 0.1 } }, battles: 99, name: '금서의 지식' } }, r: [['narr', '', '머릿속에 금지된 지식이 쏟아졌다. 대부분 요리법이었다. 일부는 마법이었다.']] },
      lose: { fx: { wall: -10, rep: { cult: 1 } }, r: [['narr', '', '책이 물었다. 진짜로 물었다.']] } },
    { t: '연체료를 낸다', sub: '금화 -40 · 빛의 교회 +1 · 행운석 +1', cond: { goldMin: 40 }, fx: { gold: -40, rep: { church: 1 }, stones: 1 }, r: [['narr', '', '사서의 유령이 감동해서 울었다. 그리고 행운석을 줬다.']] },
    { t: '세렌: "그거 내가 빌린 거 맞아."', cond: { royal: 'seren' }, hide: true, fx: { relic: 'candle' }, r: [['seren', 'smug', '4년 연체? 계산해 보니 이자가 원금보다 많네. 안 낼래.'], ['narr', '', '세렌은 금서 대신 꺼지지 않는 양초를 챙겼다.']] },
  ],
});

ev('collector', {
  title: '모르벤의 세리', act: [2], bg: 'office', kind: 'common',
  intro: [
    ['guild', 'smug', '모르벤 섭정의 명으로 왔습니다. 잿더미세, 성벽세, 숨쉬기세를 내셔야겠군요.'],
    ['guild', 'neutral', '합계 금화 120. 카드 결제는 안 됩니다.'],
  ],
  choices: [
    { t: '낸다', sub: '금화 -120 · 떠돌이 길드 +2', cond: { goldMin: 120 }, fx: { gold: -120, rep: { guild: 2 } }, r: [['guild', 'happy', '성실 납세자시군요. 영수증 드릴게요. 이거 휴지예요.']] },
    { t: '거부한다', sub: '다음 2전투 적 체력 +15%', fx: { mod: { fx: { enemyHp: 0.15 }, battles: 2, name: '세금 체납' }, rep: { tribe: 1 } }, r: [['guild', 'angry', '후회하실 겁니다!'], ['narr', '', '세리가 모르벤에게 고자질하러 갔다.']] },
    { t: '용의 세금 영수증을 보여준다', sub: '용에게 세금을 받아 본 자만', cond: { relic: 'receipt' }, fx: { gold: 120, ach: 'collector' }, r: [['guild', 'shock', '용… 용이 세금을…?'], ['narr', '', '세리는 기절했다. 떨어진 지갑을 주웠다.']] },
  ],
});

ev('swamp_toad', {
  title: '말하는 두꺼비', act: [2], bg: 'swamp', kind: 'common',
  intro: [
    ['narr', '', '늪에서 두꺼비가 고개를 내밀었다. "입맞춤하면 왕자가 됩니다."'],
    ['narr', '', '"참고로 이미 왕족이시면 두꺼비가 됩니다."'],
  ],
  choices: [
    { t: '입맞춤한다', sub: '성공 30% · ???', roll: 0.3,
      win: { fx: { unit: 'random:3', rep: { tribe: 1 } }, r: [['narr', '', '두꺼비가 빛나며 영웅이 되었다! "은혜는 칼로 갚겠소."']] },
      lose: { fx: { mod: { fx: { spd: -0.05 }, battles: 2, name: '두꺼비 입맛' } }, r: [['narr', '', '아무 일도 일어나지 않았다. 입안에 늪 맛만 남았다.'], ['@q', 'shock', '…양치하세요.']] } },
    { t: '두꺼비를 결투장에 판다', sub: '떠돌이 길드 +1 · 금화 +60', fx: { rep: { guild: 1, tribe: -1 }, gold: 60 }, r: [['narr', '', '두꺼비는 체념한 표정이었다. 익숙해 보였다.']] },
    { t: '늪에 돌려보낸다', sub: '숲의 부족 +2', fx: { rep: { tribe: 2 } }, r: [['narr', '', '두꺼비가 고맙다며 개굴했다. 숲이 조금 밝아졌다.']] },
  ],
});

// ═══════════════ 3막 공통 ═══════════════
ev('ghostking', {
  title: '선왕의 망령', act: [3], bg: 'crypt', kind: 'common',
  intro: [
    ['ghost', 'sad', '…내 아이야. 왕관이 무너진 날, 나는 그것을 쓰고 있었단다.'],
    ['ghost', 'neutral', '조각 하나를 지키고 있었다. 너에게 줄 수 있다. 질문 하나에 답한다면.'],
  ],
  choices: [
    { t: '"왕관은 왜 무너졌나요?"', sub: '왕관 조각 +1', fx: { shard: 1, flag: 'knowTruth' }, r: [['ghost', 'sad', '모두가 왕관을 원했지. 아무도 왕국을 원하지 않았다.'], ['narr', '', '망령이 빛나는 조각을 건넸다. 차가웠다.']] },
    { t: '"아버지, 용돈 좀…"', sub: '왕관 조각 +1 · 금화 +100', fx: { shard: 1, gold: 100, ach: 'allowance' }, r: [['ghost', 'shock', '…300년 만에 처음 듣는 말이로구나.'], ['ghost', 'happy', '옛다. 다 쓰지 말고.']] },
    { t: '"저승은 어때요?"', sub: '왕관 조각 +1 · 빛의 교회 +1', fx: { shard: 1, rep: { church: 1 } }, r: [['ghost', 'smug', '세금이 없단다.'], ['narr', '', '망령은 조각을 건네고 만족스럽게 사라졌다.']] },
  ],
});

ev('snowking', {
  title: '눈사람 왕', act: [3], bg: 'mountain', kind: 'common',
  intro: [
    ['narr', '', '설산 입구에 왕관을 쓴 거대한 눈사람이 앉아 있다.'],
    ['narr', '', '눈사람: "이곳은 나의 왕국이다. 통행세는 겨울 한 조각이다."'],
  ],
  choices: [
    { t: '왕위를 걸고 눈싸움을 한다', sub: '성공 45% · 전설 유닛', roll: 0.45,
      win: { fx: { unit: 'random:4' }, r: [['narr', '', '눈사람 왕이 녹아내리며 말했다. "그대가… 진정한… 겨울의 왕…"'], ['narr', '', '눈 속에서 전설의 전사가 깨어났다.']] },
      lose: { fx: { wall: -12 }, r: [['narr', '', '눈사람의 눈덩이는 바위였다. 반칙이었다.']] } },
    { t: '당근 코를 선물한다', sub: '숲의 부족 +2 · 성벽 +15', fx: { rep: { tribe: 2 }, wall: 15 }, r: [['narr', '', '눈사람 왕이 감동해 길을 열어주었다. 콧물(눈)을 흘렸다.']] },
    { t: '"왕은 한 명이면 충분해."', sub: '재의 교단 +2 · 금화 +80', fx: { rep: { cult: 2 }, gold: 80 }, r: [['narr', '', '당신은 눈사람 왕을 녹였다. 왕관은 녹지 않았다. 팔았다.']] },
  ],
});

ev('echo', {
  title: '메아리 골짜기', act: [3], bg: 'mountain', kind: 'common',
  intro: [['narr', '', '골짜기 앞에 팻말: "소리치면 메아리가 대답합니다. 가끔 진심으로."']],
  choices: [
    { t: '"나는 왕이다!"', sub: '성공 50% · 다음 전투 피해 +20%', roll: 0.5,
      win: { fx: { mod: { fx: { dmg: 0.2 }, battles: 1, name: '메아리의 확신' } }, r: [['narr', '', '"…왕이다… 왕이다… 왕…이…다…" 메아리가 확신을 실어 돌려주었다.']] },
      lose: { fx: { mod: { fx: { dmg: -0.1 }, battles: 1, name: '메아리의 의심' } }, r: [['narr', '', '"…진짜?… 진짜?… 진짜…?" 메아리가 의심했다.']] } },
    { t: '"배고프다!"', sub: '성벽 +10', fx: { wall: 10 }, r: [['narr', '', '"…밥 먹자… 밥 먹자…" 메아리를 따라가니 산적의 비상식량이 있었다.']] },
    { t: '조용히 지나간다', sub: '행운석 +1', fx: { stones: 1 }, r: [['narr', '', '메아리가 섭섭해서 행운석을 굴려 보냈다. "…왜 아무 말도… 안 해…"']] },
  ],
});

ev('inn', {
  title: '세상 끝 여관', act: [3], bg: 'camp', kind: 'common',
  intro: [
    ['villager', 'happy', '어서 오세요, 세상 끝 여관입니다! 마지막 손님이세요. 진짜 마지막.'],
  ],
  choices: [
    { t: '하룻밤 묵는다', sub: '금화 -60 · 성벽 최대치의 40% 회복', cond: { goldMin: 60 }, fx: { gold: -60, heal: 0.4 }, r: [['narr', '', '오랜만에 푹 잤다. 꿈에 뿌루가 나왔다. 계속 삐약거렸다.']] },
    { t: '주인과 주사위 내기를 한다', sub: '성공 50% · 행운석 +3 / 실패 행운석 -1', cond: { stonesMin: 1 }, roll: 0.5,
      win: { fx: { stones: 3 }, r: [['villager', 'shock', '어떻게 6이 세 번…?']] },
      lose: { fx: { stones: -1 }, r: [['villager', 'smug', '세상 끝까지 오셨는데 운도 끝이시네요.']] } },
    { t: '방명록에 낙서한다', sub: '???', fx: { flag: 'guestbook', rep: { guild: 1 } }, r: [['narr', '', '방명록 첫 장에는 300년 전의 필체로 "다시 올게 — 선왕"이라고 적혀 있었다.']] },
  ],
});

ev('whisper', {
  title: '왕관의 속삭임', act: [3], bg: 'hall', kind: 'common',
  intro: [
    ['narr', '', '폐허가 된 옥좌 위에 왕관 조각 하나가 떠 있다. 속삭인다.'],
    ['narr', '', '"나를 써라. 모든 것을 다시 세울 수 있다. 너만의 방식으로."'],
  ],
  choices: [
    { t: '조각만 챙긴다', sub: '왕관 조각 +1', fx: { shard: 1 }, r: [['narr', '', '속삭임을 무시하고 조각을 주머니에 넣었다. 주머니가 투덜거렸다.']] },
    { t: '속삭임에 귀를 기울인다', sub: '왕관 조각 +1 · 재의 교단 +3 · 성벽 최대 -10', fx: { shard: 1, rep: { cult: 3 }, wallMax: -10 }, r: [['narr', '', '속삭임이 달콤했다. 손끝이 잿빛으로 물들었다.']] },
    { t: '"너 혹시 말 많은 편이니?"', sub: '왕관 조각 +1 · 업적', fx: { shard: 1 }, r: [['narr', '', '"…" 조각이 처음으로 조용해졌다. 상처받은 것 같다.']] },
  ],
});

ev('mirror', {
  title: '그림자 거울', act: [3], bg: 'crypt', kind: 'common',
  cond: { flag: 'siblingSeen' },
  intro: [
    ['narr', '', '깨진 거울 속에 익숙한 얼굴이 보인다. 당신의 형제다. 잿빛 눈을 하고 있다.'],
    ['narr', '', '거울 속 그림자가 손짓한다. 왕관의 심장으로 오라고.'],
  ],
  choices: [
    { t: '그림자를 쫓는다', sub: '최종 보스가 바뀐다', fx: { flag: 'brotherRoute' }, r: [['narr', '', '거울이 산산이 부서졌다. 그림자는 왕관의 심장으로 사라졌다.'], ['@q', 'sad', '…같이 가요. 끝까지.']] },
    { t: '거울을 덮는다', sub: '빛의 교회 +1', fx: { rep: { church: 1 } }, r: [['narr', '', '천을 덮자 속삭임이 멎었다. 아직은.']] },
  ],
});

// ═══════════════ 진영 연쇄 ═══════════════
ev('church1', {
  title: '빛의 교회 순례단', act: [1, 2], bg: 'road', kind: 'faction', faction: 'church',
  intro: [
    ['priest', 'happy', '빛이 함께하길! 저희는 무너진 대성당을 다시 세우려는 순례단입니다.'],
    ['priest', 'neutral', '헌금은 자율입니다. 자율이지만 눈치는 보입니다.'],
  ],
  choices: [
    { t: '헌금한다', sub: '금화 -50 · 빛의 교회 +3', cond: { goldMin: 50 }, fx: { gold: -50, rep: { church: 3 } }, r: [['priest', 'happy', '빛이 그대를 기억할 것입니다. 장부에도 적어두겠습니다.']] },
    { t: '함께 기도한다', sub: '빛의 교회 +1 · 성벽 +10', fx: { rep: { church: 1 }, wall: 10 }, r: [['narr', '', '기도가 끝나자 마음이 가벼워졌다. 성벽도 조금 단단해졌다.']] },
    { t: '"빛은 금화로 사는 건가요?"', sub: '빛의 교회 -2 · 재의 교단 +1', fx: { rep: { church: -2, cult: 1 } }, r: [['priest', 'angry', '…불경하군요.'], ['narr', '', '순례단이 수군거리며 떠났다.']] },
  ],
});
ev('church2', {
  title: '대성당 재건', act: [2, 3], bg: 'temple', kind: 'faction', faction: 'church', cond: { repMin: { church: 3 } },
  intro: [
    ['priest', 'happy', '왕족이시여! 대성당의 기둥 하나가 다시 섰습니다. 마지막 축복을 내려주소서.'],
  ],
  choices: [
    { t: '대성당의 종을 울린다', sub: '빛의 교회 +3 · 성벽 최대 +15', fx: { rep: { church: 3 }, wallMax: 15, heal: 0.15 }, r: [['narr', '', '종소리가 잿빛 하늘을 갈랐다. 아주 잠깐, 해가 보였다.']] },
    { t: '성수로 유닛을 축복한다', sub: '빛의 교회 +2 · 서약의 성기사 합류', fx: { rep: { church: 2 }, unit: 'paladin' }, r: [['narr', '', '성수를 맞은 수련 기사가 서약을 외쳤다. 약관은 안 읽었다.']] },
    { t: '"이거 재산세 나오겠는데요."', sub: '떠돌이 길드 +2', fx: { rep: { guild: 2, church: -1 } }, r: [['priest', 'shock', '…왕족이 할 말입니까 그게?']] },
  ],
});
ev('cult1', {
  title: '재의 설교자', act: [1, 2], bg: 'ruins', kind: 'faction', faction: 'cult',
  intro: [
    ['cultist', 'smug', '재는 벌이 아니라 축복이다! 왕관의 저주는 힘이다!'],
    ['cultist', 'neutral', '…아 근데 오늘 설교 듣는 사람이 왕족 한 분이네. 반갑습니다.'],
  ],
  choices: [
    { t: '끝까지 들어준다', sub: '재의 교단 +3 · 저주 유물', fx: { rep: { cult: 3 }, relic: 'random:curse' }, r: [['cultist', 'happy', '첫 신도시다! 기념품 드릴게요. 반품 불가!']] },
    { t: '설교 중간에 질문한다', sub: '재의 교단 +1 · 행운석 +1', fx: { rep: { cult: 1 }, stones: 1 }, r: [['narr', '', '"그럼 재는 어디서 와요?" 설교자는 3시간 동안 대답했다.']] },
    { t: '설교단을 걷어찬다', sub: '빛의 교회 +2 · 재의 교단 -2', fx: { rep: { church: 2, cult: -2 } }, r: [['cultist', 'angry', '재의 이름으로 너를 기억하겠다!'], ['narr', '', '그는 정말로 기억할 것이다. 꽤 집요해 보였다.']] },
  ],
});
ev('cult2', {
  title: '재의 의식', act: [2, 3], bg: 'crypt', kind: 'faction', faction: 'cult', cond: { repMin: { cult: 3 } },
  intro: [
    ['cultist', 'smug', '형제여, 아니 왕족이여. 교주 아스펠께서 그대를 기다리신다.'],
    ['cultist', 'neutral', '의식에 참여하면 잿빛의 힘을 주겠다. 대가는… 나중에 알게 된다.'],
  ],
  choices: [
    { t: '의식에 참여한다', sub: '재의 교단 +3 · 모든 피해 +15% (영구) · 최종 보스가 바뀐다', fx: { rep: { cult: 3 }, flag: 'ashRite', mod: { fx: { dmg: 0.15 }, battles: 99, name: '잿빛의 힘' } }, r: [['narr', '', '재가 피부 아래로 스며들었다. 강해졌다. 조금 가려웠다.']] },
    { t: '의식을 엿보기만 한다', sub: '재의 교단 +1 · 행운석 +2', fx: { rep: { cult: 1 }, stones: 2 }, r: [['narr', '', '의식은 생각보다 지루했다. 다들 재를 뿌리고 기침했다.']] },
    { t: '의식장의 재를 몰래 바꿔 놓는다 (밀가루로)', sub: '빛의 교회 +2 · 재의 교단 -3', fx: { rep: { church: 2, cult: -3 }, ach: 'flour' }, r: [['narr', '', '신도들이 밀가루를 뒤집어쓰고 재채기를 했다. 의식은 빵 반죽이 되었다.']] },
  ],
});
ev('tribe1', {
  title: '숲의 사냥꾼', act: [1, 2], bg: 'forest', kind: 'faction', faction: 'tribe',
  intro: [
    ['chief', 'neutral', '왕족이 숲에 오다니. 나무를 베러 왔나, 재를 뿌리러 왔나?'],
  ],
  choices: [
    { t: '함께 사냥한다', sub: '숲의 부족 +3 · 궁수 유닛', fx: { rep: { tribe: 3 }, unit: 'random:1:archer' }, r: [['chief', 'happy', '활 잡는 손이 나쁘지 않군. 우리 젊은이 하나를 데려가라.']] },
    { t: '나무를 심겠다고 약속한다', sub: '숲의 부족 +2 · 성벽 +10', fx: { rep: { tribe: 2 }, wall: 10 }, r: [['chief', 'neutral', '왕족의 약속은 믿지 않는다. 나무는 믿는다.']] },
    { t: '"이 숲 개발하면 땅값 오르겠네요."', sub: '떠돌이 길드 +2 · 숲의 부족 -2', fx: { rep: { guild: 2, tribe: -2 } }, r: [['chief', 'angry', '……'], ['narr', '', '숲의 나무들이 당신을 노려보는 것 같다.']] },
  ],
});
ev('tribe2', {
  title: '부족의 성소', act: [2, 3], bg: 'forest', kind: 'faction', faction: 'tribe', cond: { repMin: { tribe: 3 } },
  intro: [
    ['chief', 'happy', '숲이 그대를 받아들였다. 성소의 샘에서 하나를 고르라.'],
  ],
  choices: [
    { t: '생명의 샘', sub: '성벽 최대치의 50% 회복 · 숲의 부족 +2', fx: { heal: 0.5, rep: { tribe: 2 } }, r: [['narr', '', '샘물을 마시자 성벽에서 새싹이 돋았다. 성벽이 웃는 것 같았다.']] },
    { t: '사냥의 샘', sub: '궁수 피해 +15% (영구) · 숲의 부족 +2', fx: { mod: { fx: { cls: { archer: 0.15 } }, battles: 99, name: '사냥의 샘' }, rep: { tribe: 2 } }, r: [['narr', '', '화살 끝에서 숲의 향기가 났다. 맞으면 아프다.']] },
    { t: '샘에 금화를 던진다', sub: '숲의 부족 -1 · 행운석 +2', fx: { rep: { tribe: -1 }, stones: 2 }, r: [['chief', 'sad', '…이건 소원 우물이 아니다.'], ['narr', '', '그래도 샘은 행운석을 돌려주었다. 착한 샘이다.']] },
  ],
});
ev('guild1', {
  title: '길드의 계약서', act: [1, 2], bg: 'market', kind: 'faction', faction: 'guild',
  intro: [
    ['guild', 'smug', '왕족님! 투자 기회입니다! 계약서에 서명만 하시면 됩니다.'],
    ['guild', 'neutral', '작은 글씨는 신경 쓰지 마세요. 원래 작게 쓰는 겁니다.'],
  ],
  choices: [
    { t: '서명한다', sub: '떠돌이 길드 +3 · 금화 +120 · 다음 상점 가격 +20%', fx: { rep: { guild: 3 }, gold: 120, flag: 'guildDebt' }, r: [['guild', 'happy', '탁월한 선택이십니다! 작은 글씨는 나중에 읽어보세요.']] },
    { t: '작은 글씨를 읽는다', sub: '떠돌이 길드 +1 · 유물', fx: { rep: { guild: 1 }, relic: 'random:common' }, r: [['narr', '', '작은 글씨: "서명 시 영혼의 3%를 길드에 위탁합니다." 서명하지 않았다.'], ['guild', 'sad', '…눈이 좋으시네요. 이건 선물입니다.']] },
    { t: '계약서로 종이비행기를 접는다', sub: '???', fx: { flagInc: 'plane', rep: { guild: -1 } }, r: [['narr', '', '종이비행기는 길드장의 이마에 정확히 꽂혔다.']] },
  ],
});
ev('guild2', {
  title: '황금 경매장', act: [2, 3], bg: 'market', kind: 'faction', faction: 'guild', cond: { repMin: { guild: 3 } },
  intro: [
    ['guild', 'happy', 'VIP 고객님! 오늘의 경매 품목은 무려 "진짜 전설 유물"입니다!'],
  ],
  choices: [
    { t: '금화 150에 입찰한다', sub: '전설 유물', cond: { goldMin: 150 }, fx: { gold: -150, relic: 'random:legend', rep: { guild: 2 } }, r: [['guild', 'happy', '낙찰! 진짜예요. 이번엔 진짜.']] },
    { t: '경매를 주최한다 (유닛 하나를 판다)', sub: '가장 높은 등급 유닛 판매 · 금화 크게', fx: { sellBest: 1, rep: { guild: 2 } }, r: [['narr', '', '"왕족이 쓰던 전사" 경매는 대성황이었다.']] },
    { t: '경매장 조명을 끈다', sub: '성공 35% · 금화 +250', roll: 0.35,
      win: { fx: { gold: 250, rep: { guild: -2 } }, r: [['narr', '', '어둠 속에서 누군가 금화 자루를 들고 나갔다. 당신이었다.']] },
      lose: { fx: { rep: { guild: -3 }, wall: -10 }, r: [['guild', 'angry', '불 켜! 저 왕족 잡아!']] } },
  ],
});

// ═══════════════ 동료 ═══════════════
ev('bran1', {
  title: '마지막 근위병', act: [1], bg: 'ruins', kind: 'bond', comp: 'bran', recruit: true,
  intro: [
    ['bran', 'sad', '…폐하? 살아 계셨군요. 저는 근위대장 브란입니다. 아니, 이었습니다.'],
    ['bran', 'sad', '그날 밤 선왕 폐하를 지키지 못했습니다. 이 늙은 몸, 남은 시간을 폐하께 바치겠습니다.'],
    ['bran', 'neutral', '…허리가 좀 아프긴 합니다만.'],
  ],
  choices: [
    { t: '함께 가자', sub: '브란 합류 · 인연 +1', fx: { join: 'bran', bond: { bran: 1 } }, r: [['bran', 'happy', '명을 받듭니다! (뚝) …괜찮습니다. 허리입니다.']] },
    { t: '이제 쉬어도 된다고 말한다', sub: '빛의 교회 +1 · 성벽 +20', fx: { rep: { church: 1 }, wall: 20 }, r: [['bran', 'sad', '…그럼 성벽이라도 보수해 두고 떠나겠습니다.'], ['narr', '', '브란은 밤새 성벽을 고치고 조용히 떠났다.']] },
  ],
});
ev('bran2', {
  title: '브란의 맹세', act: [2, 3], bg: 'camp', kind: 'bond', comp: 'bran', cond: { bondMin: { bran: 2 } },
  intro: [
    ['bran', 'neutral', '폐하. 그날 밤 이야기를 해도 되겠습니까.'],
    ['bran', 'sad', '선왕께서는 왕관을 벗으려 하셨습니다. 그 순간 저주가 풀렸지요. 저는… 아무것도 하지 못했습니다.'],
  ],
  choices: [
    { t: '"이번엔 함께 끝내자."', sub: '브란 인연 +2', fx: { bond: { bran: 2 }, flag: 'branOath' }, r: [['bran', 'happy', '…예. 이번엔 반드시.'], ['narr', '', '노기사의 눈에 오랜만에 불이 켜졌다.']] },
    { t: '"허리는 괜찮아?"', sub: '브란 인연 +1 · 성벽 +10', fx: { bond: { bran: 1 }, wall: 10 }, r: [['bran', 'shock', '폐하… 그걸 기억하고 계셨습니까.'], ['bran', 'happy', '안 괜찮습니다. 감사합니다.']] },
  ],
});
ev('linette1', {
  title: '노래하는 음유시인', act: [1, 2], bg: 'market', kind: 'bond', comp: 'linette', recruit: true,
  intro: [
    ['linette', 'happy', '♪ 무너진 왕관~ 잿빛 하늘~ 그리고 등장하는 잘생긴(?) 왕족~ ♪'],
    ['linette', 'smug', '안녕! 난 리네트. 당신 여행, 노래로 만들면 대박 날 것 같아. 따라가도 돼?'],
  ],
  choices: [
    { t: '같이 가자', sub: '리네트 합류 · 인연 +1', fx: { join: 'linette', bond: { linette: 1 } }, r: [['linette', 'happy', 'ㄹㅇ? 1절 벌써 씀. 제목은 "꽝의 왕국".']] },
    { t: '노래 한 곡만 듣는다', sub: '금화 -10 · 다음 2전투 공격 속도 +8%', fx: { gold: -10, mod: { fx: { spd: 0.08 }, battles: 2, name: '리네트의 노래' } }, r: [['linette', 'neutral', '팁 감사! 다음에 또 만나면 그땐 같이 가자고.']] },
  ],
});
ev('linette2', {
  title: '리네트의 신곡', act: [2, 3], bg: 'camp', kind: 'bond', comp: 'linette', cond: { bondMin: { linette: 2 } },
  intro: [
    ['linette', 'neutral', '…있잖아. 사실 나 원래 왕궁 악사였어. 그날 밤 노래를 부르다 도망쳤어.'],
    ['linette', 'sad', '그래서 이번엔 끝까지 부르고 싶어. 이 여행의 마지막 절까지.'],
  ],
  choices: [
    { t: '"마지막 절은 해피엔딩으로 하자."', sub: '리네트 인연 +2', fx: { bond: { linette: 2 } }, r: [['linette', 'happy', '약속! 아, 근데 비극이 더 잘 팔리는데…'], ['linette', 'smug', '농담이야. ㄹㅇ 농담.']] },
    { t: '"후렴은 내가 부를게."', sub: '리네트 인연 +1 · 업적', fx: { bond: { linette: 1 } }, r: [['narr', '', '당신의 노래 실력은… 용감했다.'], ['linette', 'shock', '…가사만 써줄래?']] },
  ],
});
ev('bork1', {
  title: '용을 잃은 기수', act: [1, 2], bg: 'swamp', kind: 'bond', comp: 'bork', recruit: true,
  intro: [
    ['bork', 'sad', '……흑. 아, 왕족이시군요. 전 보르크. 용 기수였습니다.'],
    ['bork', 'sad', '제 용 실바나가 그날 밤 재를 맞고… 얼어붙은 산으로 날아갔어요. 흑흑.'],
  ],
  choices: [
    { t: '"함께 실바나를 찾자."', sub: '보르크 합류 · 인연 +1', fx: { join: 'bork', bond: { bork: 1 } }, r: [['bork', 'happy', '정말요?! 흑흑흑 (기뻐서 우는 중)']] },
    { t: '손수건을 건넨다', sub: '숲의 부족 +1', fx: { rep: { tribe: 1 } }, r: [['bork', 'sad', '감사합니다… (코 풂) 돌려드릴게요.'], ['narr', '', '돌려받지 않았다.']] },
  ],
});
ev('bork2', {
  title: '용알', act: [2, 3], bg: 'mountain', kind: 'bond', comp: 'bork', cond: { bondMin: { bork: 2 } },
  intro: [
    ['bork', 'shock', '폐하! 이거 보세요! 실바나의 둥지에 남아 있던… 알이에요!'],
    ['bork', 'sad', '근데 차가워요. 꺼진 것 같아요. 흑.'],
  ],
  choices: [
    { t: '품에 안고 데워준다', sub: '보르크 인연 +2 · 인연 5면 마스코트 용알이 해금', fx: { bond: { bork: 2 }, flag: 'eggWarm' }, r: [['narr', '', '알이 아주 희미하게 따뜻해졌다. 톡, 하고 안에서 무언가 움직였다.'], ['bork', 'happy', '살아 있어요!!! 흑흑흑흑']] },
    { t: '"오믈렛…은 농담이야."', sub: '보르크 인연 +1', fx: { bond: { bork: 1 } }, r: [['bork', 'shock', '……'], ['bork', 'sad', '농담이라도 상처예요.']] },
  ],
});
ev('aila1', {
  title: '재상의 딸', act: [2], bg: 'hall', kind: 'bond', comp: 'aila', recruit: true,
  intro: [
    ['aila', 'neutral', '…왕족이구나. 난 에일라. 모르벤의 딸이야.'],
    ['aila', 'cold', '아버지를 막으려고 했어. 실패했지. 그래서 이번엔 너를 이용할 거야.'],
  ],
  choices: [
    { t: '"이용해도 좋아. 같이 가자."', sub: '에일라 합류 · 인연 +1', fx: { join: 'aila', bond: { aila: 1 } }, r: [['aila', 'smug', '…쉽네. 마음에 들어. 칭찬 아님.']] },
    { t: '"모르벤의 딸을 믿을 수 없어."', sub: '재의 교단 +1', fx: { rep: { cult: 1 } }, r: [['aila', 'neutral', '현명해. 나라도 안 믿어.'], ['narr', '', '에일라는 어둠 속으로 사라졌다.']] },
  ],
});
ev('aila2', {
  title: '아버지의 편지', act: [2, 3], bg: 'library', kind: 'bond', comp: 'aila', cond: { bondMin: { aila: 2 } },
  intro: [
    ['aila', 'sad', '아버지 서재에서 이걸 찾았어. 나한테 쓴 편지야. 부치지 않은.'],
    ['aila', 'sad', '"에일라, 왕관을 쓰면 너를 지킬 수 있을 줄 알았다." …바보.'],
  ],
  choices: [
    { t: '"아버지를 구할 방법을 찾자."', sub: '에일라 인연 +2 · 모르벤 약화 정보', fx: { bond: { aila: 2 }, flag: 'ailaHope' }, r: [['aila', 'shock', '…구한다고? 아버지를?'], ['aila', 'happy', '…고마워. 이건 칭찬이야.']] },
    { t: '조용히 곁에 있어준다', sub: '에일라 인연 +1', fx: { bond: { aila: 1 } }, r: [['narr', '', '에일라는 한참 동안 편지를 읽었다. 당신은 아무 말도 하지 않았다. 그게 맞았다.']] },
  ],
});
ev('toto1', {
  title: '수상한 고블린 상인', act: [1, 2], bg: 'road', kind: 'bond', comp: 'toto', recruit: true,
  intro: [
    ['toto', 'happy', '손님! 손님! 잿더미 특가 세일! 오늘만! 사실 매일!'],
    ['toto', 'smug', '토토는 왕족 단골 받는 게 꿈이었어요. 따라가도 돼요? 이동식 상점 해드림!'],
  ],
  choices: [
    { t: '같이 가자', sub: '토토 합류 · 인연 +1', fx: { join: 'toto', bond: { toto: 1 } }, r: [['toto', 'happy', '계약 성립! 첫 거래 기념 영수증 드려요. 이거 100금화예요.'], ['narr', '', '농담이었다. 아마.']] },
    { t: '물건만 산다', sub: '금화 -40 · 흔한 유물', cond: { goldMin: 40 }, fx: { gold: -40, relic: 'random:common' }, r: [['toto', 'smug', '현명한 소비! 환불은 안 돼요.']] },
  ],
});
ev('toto2', {
  title: '토토의 마지막 영업', act: [2, 3], bg: 'camp', kind: 'bond', comp: 'toto', cond: { bondMin: { toto: 2 } },
  intro: [
    ['toto', 'happy', '폐하, 이번엔 진짜 나와요. 진짜예요. 토토 믿죠?'],
    ['narr', '', '토토가 반짝이는 눈으로 상자를 내민다.'],
  ],
  choices: [
    { t: '행운석 3개를 내고 상자를 연다', sub: '성공 25% · 전설 유닛 / 실패해도 인연 +1', cond: { stonesMin: 3 }, roll: 0.25,
      win: { fx: { stones: -3, unit: 'random:4', bond: { toto: 2 } }, r: [['toto', 'shock', '…진짜 나왔네? 토토도 놀람.']] },
      lose: { fx: { stones: -3, bond: { toto: 1 } }, r: [['toto', 'smug', '다음엔 진짜 나와요.']] } },
    { t: '거절한다', sub: '토토 인연 -1', fx: { bond: { toto: -1 } }, r: [['toto', 'sad', '…폐하 너무해.']] },
    { t: '오히려 토토에게 상자를 판다', sub: '성공 10% · 금화 +300', roll: 0.1,
      win: { fx: { gold: 300, bond: { toto: 2 } }, r: [['toto', 'shock', '폐하… 천재? 토토 제자 해요.']] },
      lose: { fx: {}, r: [['toto', 'smug', '그 상자 원래 내 거잖아요.']] } },
  ],
});

// ═══════════════ 왕족 전용 ═══════════════
ev('royal_edric', {
  title: '기사의 서약', act: [1, 2], bg: 'hall', kind: 'royal', royal: 'edric',
  intro: [
    ['edric', 'neutral', '무너진 기사단 회랑. 벽에 걸린 초상화 하나가 눈에 띈다.'],
    ['edric', 'sad', '…세렌과 카일. 우리 셋이 함께 그려진 마지막 그림이다. 둘은 어디에 있을까.'],
  ],
  choices: [
    { t: '초상화 앞에서 서약한다', sub: '기사 피해 +10% (영구) · 형제의 흔적', fx: { mod: { fx: { cls: { knight: 0.1 } }, battles: 99, name: '기사의 서약' }, flag: 'siblingSeen' }, r: [['edric', 'neutral', '정의는 반드시 승리한다. 운만 따라준다면.'], ['narr', '', '그림 속 동생의 눈이 잠시 잿빛으로 빛난 것 같았다.']] },
    { t: '초상화를 떼어 챙긴다', sub: '빛의 교회 +2 · 형제의 흔적', fx: { rep: { church: 2 }, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['edric', 'happy', '다시 만나면 같이 그리자. 이번엔 웃으면서.']] },
  ],
});
ev('royal_seren', {
  title: '금서 해독', act: [1, 2], bg: 'library', kind: 'royal', royal: 'seren',
  intro: [
    ['seren', 'smug', '왕관의 저주에 관한 금서. 드디어 찾았다. …역시 연체 중이네.'],
    ['seren', 'shock', '잠깐, 여기 형제들의 이름이 적혀 있어. 에드릭… 카일… 그리고 "그림자".'],
  ],
  choices: [
    { t: '끝까지 해독한다', sub: '성공 60% · 마도 피해 +15% (영구) · 형제의 흔적', roll: 0.6,
      win: { fx: { mod: { fx: { cls: { mage: 0.15 } }, battles: 99, name: '금서 해독' }, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['seren', 'neutral', '…왕관은 가장 가까운 핏줄 하나를 그림자로 만든대. 그게 누군지는…'], ['seren', 'sad', '찾아야 해.']] },
      lose: { fx: { wall: -10, flag: 'siblingSeen' }, r: [['seren', 'shock', '책이 불탔어! 아니 내 앞머리가 탔어!']] } },
    { t: '책을 덮고 반납한다', sub: '빛의 교회 +2 · 행운석 +2', fx: { rep: { church: 2 }, stones: 2 }, r: [['narr', '', '4년 만의 반납이었다. 사서의 유령이 눈물을 흘렸다.']] },
  ],
});
ev('royal_kyle', {
  title: '뒷거래', act: [1, 2], bg: 'market', kind: 'royal', royal: 'kyle',
  intro: [
    ['kyle', 'smug', '암시장 단골의 감이 말한다. 저 상인, 뭔가 숨기고 있어.'],
    ['guild', 'neutral', '…왕실 문장이 찍힌 반지 하나가 들어왔소. 주인이 그림자처럼 사라졌다더군.'],
  ],
  choices: [
    { t: '반지를 산다', sub: '금화 -60 · 형제의 흔적 · 행운석 +2', cond: { goldMin: 60 }, fx: { gold: -60, stones: 2, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['kyle', 'sad', '…에드릭 형 반지잖아. 아니, 세렌 누나 건가. 둘 다 같은 거 꼈었지.']] },
    { t: '뒷거래로 정보만 산다', sub: '떠돌이 길드 +2 · 형제의 흔적', fx: { rep: { guild: 2 }, flag: 'siblingSeen' }, r: [['kyle', 'neutral', '그림자라… 재밌네. 우리 집안은 늘 그림자가 문제였지.']] },
    { t: '상인을 털어 버린다', sub: '성공 70% · 금화 +150', roll: 0.7,
      win: { fx: { gold: 150, rep: { guild: -2 } }, r: [['kyle', 'smug', '서자의 특기지. 금고 털기.']] },
      lose: { fx: { wall: -10, rep: { guild: -3 } }, r: [['guild', 'angry', '경비!!']] } },
  ],
});

// ═══════════════ 특수 ═══════════════
ev('dragon_talk', {
  title: '얼어붙은 용', special: true, bg: 'mountain',
  intro: [
    ['dragon', 'angry', '크르르르… 인간… 왕족… 재의 냄새…'],
    ['bork', 'sad', '실바나! 나야, 보르크야! 기억 안 나? 너 매일 내 머리 물었잖아!'],
    ['dragon', 'sad', '……보…르…크…?'],
  ],
  choices: [
    { t: '보르크에게 맡긴다', sub: '성공 60% (인연 5면 100%) · 전투 없이 왕관 조각', roll: 0.6, bondAuto: { bork: 5 },
      win: { fx: { shard: 1, flag: 'dragonFriend', bond: { bork: 1 }, ach: 'dragon', skipBattle: 1 }, r: [['dragon', 'happy', '보르크…! 크르릉 (머리를 문다)'], ['bork', 'happy', '아야! 맞아, 이거야! 흑흑흑'], ['narr', '', '실바나가 얼음 속에서 왕관 조각을 꺼내 주었다.']] },
      lose: { fx: { flag: 'dragonTalked' }, r: [['dragon', 'angry', '크아아아!'], ['bork', 'shock', '아직 재가 너무 많아요! 일단 싸워서 재를 털어내야 해요!']] } },
    { t: '싸워서 재를 털어낸다', fx: { flag: 'dragonTalked' }, r: [['narr', '', '실바나가 날개를 펼쳤다. 냉기가 몰아친다!']] },
  ],
});

// 왕족 메인 스토리(운명의 장)도 같은 사건 엔진으로 재생한다
Object.assign(E, FATE);

export const EVENT_DATA = E;
