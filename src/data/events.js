import { FATE } from './fate.js';
// 사건 41개 + 특수 사건 — 행운의 용사단: 풀숲에서 마왕성까지
// 대사: [누가, 표정, 문장]  누가: narr(해설) · CAST id · '@q'(동료 중 한 명이 있으면 그 동료가 말함)
// 선택지: t(문구) · sub(설명) · cond(조건) · hide(조건 불충족 시 숨김) · fx(효과) · r(결과 대사)
//         roll(성공 확률) · win/lose { fx, r }
// fx: gold stones wall wallMax rep{} bond{} relic unit loseUnit flag shard join leave mod{fx,battles,name} mascot ach heal upg
// 진영(내부 키): church 구름 수도원 · cult 들판 요정 · tribe 숲 동물 마을 · guild 항구 상인회

const E = {};
const ev = (id, o) => (E[id] = { id, ...o });

// ═══════════════ 1막 · 풀숲 ═══════════════
ev('tax', {
  title: '밀린 세금 고지서', act: [1], bg: 'office', kind: 'common',
  intro: [
    ['narr', '', '마을 사무소 책상 위에 세금 고지서가 탑처럼 쌓여 있다. 이장님이 낮잠 자는 사이 아무도 정리하지 않았다.'],
    ['narr', '', "맨 위 고지서의 수신인은 '북쪽 산의 용'이다. 300년 치 밀렸다."],
  ],
  choices: [
    { t: '마을 사람들의 세금을 전부 깎아 준다', sub: '구름 수도원 +2 · 금화 -30', fx: { rep: { church: 2 }, gold: -30 }, r: [['@q', 'happy', 'ㄹㅇ 착한 용사 각.'], ['narr', '', '창밖에서 박수 소리가 들린다. 한 명이다. 이장님이다.']] },
    { t: '고지서를 용에게 보낸다', sub: '성공 3%', roll: 0.03,
      win: { fx: { gold: 500, relic: 'receipt', ach: 'tax' }, r: [['narr', '', '며칠 뒤, 살짝 그을린 봉투가 도착했다.'], ['narr', '', '안에는 금화 500닢과 정중한 사과 편지가 들어 있었다. 용이 진짜로 세금을 냈다.']] },
      lose: { fx: { wall: -10 }, r: [['narr', '', '용이 답장을 보냈다. 불로.'], ['@q', 'shock', '성벽이… 바삭해졌어요.']] } },
    { t: '고지서로 종이비행기를 접는다', sub: '아무 일도 없다 (아마도)', fx: { flagInc: 'plane' }, r: [['narr', '', '종이비행기는 우아하게 날아가 민들레 밭에 내려앉았다.'], ['bran', 'shock', '…용사님, 방금 그건 왜 하신 겁니까?']] },
  ],
});

ev('box', {
  title: '절대 열지 마시오', act: [1, 2], bg: 'road', kind: 'common',
  intro: [
    ['narr', '', "갈림길 한가운데 상자가 있다. 상자에는 '절대 열지 마시오'라고 쓰여 있다."],
    ['narr', '', "그 아래 작은 글씨로 '진짜로'. 그 아래 더 작은 글씨로 '…열어 주면 좋겠다'."],
  ],
  choices: [
    { t: '연다', sub: '성공 50% · 희귀 유물 / 저주 유물', roll: 0.5,
      win: { fx: { relic: 'random:rare' }, r: [['narr', '', '상자 안에서 반짝이는 무언가가 나왔다. 경고문은 뻥이었다.']] },
      lose: { fx: { relic: 'random:curse' }, r: [['narr', '', '상자 안에서 낮은 목소리가 들린다. "열지 말랬지."'], ['narr', '', '마왕군 물건이 손에 달라붙었다. 떨어지지 않는다.']] } },
    { t: '열지 않는다', fx: {}, r: [['narr', '', '상자가 섭섭한 듯 혼자 굴러간다. 데굴. 데굴.']] },
    { t: '노크한다', sub: '???', fx: { mascot: 'mimic', ach: 'knock' }, r: [['box', 'neutral', '누구세요?'], ['narr', '', '……'], ['box', 'happy', '아 용사님이시구나! 저 따라가도 돼요? 금화 좋아해요.'], ['narr', '', "마스코트 '덥석이'가 마음을 열었다. (다음 판부터 선택 가능)"]] },
  ],
});

ev('refugees', {
  title: '피난 온 마을 사람들', act: [1], bg: 'ruins', kind: 'common',
  intro: [
    ['villager', 'sad', '용사님이시라고요? 저희 마을에 고블린들이 몰려와서… 다 같이 도망 나왔어요.'],
    ['villager', 'sad', '애들이 배고프대요. 어른도 배고프고요. 사실 저도 배고파요.'],
  ],
  choices: [
    { t: '성벽 안으로 받아들인다', sub: '구름 수도원 +2 · 성가대 꼬마 1명 · 다음 2전투 적 체력 +10%', fx: { rep: { church: 2 }, unit: 'nun', mod: { fx: { enemyHp: 0.1 }, battles: 2, name: '피난민 보호' } }, r: [['villager', 'happy', '감사합니다! 우리 성가대 꼬마도 같이 갈게요. 노래는 무료예요.']] },
    { t: '항구 상인회에 일자리를 소개한다', sub: '항구 상인회 +2 · 금화 -30', fx: { rep: { guild: 2 }, gold: -30 }, r: [['villager', 'neutral', '상인회요? 거기 수수료가… 아, 아닙니다. 감사합니다.']] },
    { t: '들꽃 왕관을 만들어 주며 장난친다', sub: '들판 요정 +1', fx: { rep: { cult: 1, church: -1 } }, r: [['narr', '', '아이들은 웃었지만 배는 여전히 고팠다.'], ['@q', 'sad', '…그래도 밥이 먼저 아닐까요.'], ['narr', '', '어디선가 장난꾸러기 요정들이 키득거렸다.']] },
  ],
});

ev('well', {
  title: '소원을 들어주는 우물', act: [1, 2], bg: 'forest', kind: 'common',
  intro: [
    ['narr', '', '햇살 숲속에 이끼 낀 우물이 있다. 표지판: "소원 1회 금화 50. 환불 불가. 결과 보장 불가."'],
  ],
  choices: [
    { t: '금화 50을 던진다', sub: '성공 40% · 행운석 3', cond: { goldMin: 50 }, roll: 0.4,
      win: { fx: { gold: -50, stones: 3 }, r: [['narr', '', '우물 속에서 보랏빛 돌 세 개가 튀어나왔다. 영수증도 같이.']] },
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
    ['narr', '', '보리밭 한가운데 갑옷을 입은 허수아비가 서 있다. 꽤 늠름하다.'],
    ['narr', '', '자세히 보니 갑옷은 진짜다. 허수아비는 가짜다. 참새들은 둘 다 무시한다.'],
  ],
  choices: [
    { t: '진지하게 결투를 신청한다', sub: '성공 50% · 정예 기사 유닛', roll: 0.5,
      win: { fx: { unit: 'random:2:knight' }, r: [['narr', '', '허수아비가 쓰러지자 안에서 진짜 기사가 기어 나왔다. "…낮잠 잘 잤소. 함께하겠소."']] },
      lose: { fx: { wall: -5 }, r: [['narr', '', '허수아비가 바람에 넘어지며 정확히 머리를 때렸다.'], ['@q', 'smug', '방금 허수아비한테 진 거예요?']] } },
    { t: '갑옷만 빌린다', sub: '유물: 새 장화', fx: { relic: 'boots' }, r: [['narr', '', '갑옷은 너무 무거웠다. 반짝이는 장화만 챙겼다.']] },
    { t: '허수아비에게 모험 상담을 한다', sub: '???', fx: { flag: 'scarecrowTalk', rep: { tribe: 1 } }, r: [['narr', '', '허수아비는 말이 없었다. 그래서 좋은 상담사였다.'], ['narr', '', '지나가던 숲 동물 마을 너구리가 이 광경을 보고 고개를 끄덕였다.']] },
  ],
});

ev('bakery', {
  title: '고블린 빵집', act: [1], bg: 'ruins', kind: 'common',
  intro: [
    ['narr', '', '마을 어귀 빵집에서 고소한 냄새가 난다. 꼬마 고블린이 앞치마를 두르고 빵을 굽고 있다.'],
    ['narr', '', '고블린: "끼익(어서 오세요). 마왕군은 그만뒀어요. 빵이 더 좋아서."'],
  ],
  choices: [
    { t: '빵을 산다', sub: '금화 -20 · 유물: 갓 구운 크림빵', cond: { goldMin: 20 }, fx: { gold: -20, relic: 'bread' }, r: [['narr', '', '고블린이 빵을 반으로 나눠 반쪽을 먹었다. "끼익(시식이에요)."']] },
    { t: '레시피를 몰래 베낀다', sub: '성공 40% · 항구 상인회 +2, 금화 +60', roll: 0.4,
      win: { fx: { rep: { guild: 2 }, gold: 60 }, r: [['narr', '', '레시피를 항구 상인회에 팔았다. "고블린 빵" 체인점이 생길 예정이다.']] },
      lose: { fx: { rep: { church: -1 }, wall: -5 }, r: [['narr', '', '고블린이 밀대로 정확히 정강이를 쳤다. "끼익(나빠요)!"']] } },
    { t: '고블린에게 정당한 임금을 설명한다', sub: '???', fx: { flag: 'skeletonUnion', rep: { church: 1 } }, r: [['narr', '', '고블린은 진지하게 들었다. 그리고 마왕군 명찰을 떼어 던졌다.'], ['narr', '', '"끼익(사표)!" …어딘가에서 고블린들이 수군대기 시작했다.']] },
  ],
});

ev('pebble', {
  title: '길가의 돌', act: [1, 2, 3, 4], bg: 'road', kind: 'common', repeat: true, weight: 0.4,
  intro: [['narr', '', '길가에 평범한 돌이 있다. 아주 평범하다. 놀랄 만큼 평범하다.']],
  choices: [
    { t: '돌과 대화한다', fx: { ach: 'rocktalk' }, r: [['narr', '', '……'], ['narr', '', '……'], ['narr', '', '돌은 끝까지 말이 없었다. 깊은 우정을 느꼈다.']] },
    { t: '돌을 뒤집는다', sub: '성공 30% · 금화 +40', roll: 0.3, win: { fx: { gold: 40 }, r: [['narr', '', '돌 밑에 누군가 숨겨 둔 비상금이 있었다.']] }, lose: { fx: {}, r: [['narr', '', '돌 밑에는 돌이 있었다. 그리고 놀란 무당벌레가.']] } },
    { t: '지나간다', fx: {}, r: [['narr', '', '돌은 당신을 기억할 것이다. 아마도.']] },
  ],
});

// ═══════════════ 2막 · 해변 마을 ═══════════════
ev('dicetemple', {
  title: '주사위 등대', act: [2], bg: 'temple', kind: 'common',
  intro: [
    ['dicepriest', 'smug', '또 오셨네. 이번에도 굴리실 거죠? 압니다, 압니다.'],
    ['dicepriest', 'neutral', '이 등대는 배 대신 운명을 비춘답니다. 요즘 용사님들은 인생을 다 주사위로 결정하시더라.'],
  ],
  choices: [
    { t: '행운석 1개를 바치고 축복받는다', sub: '다음 3번의 주사위 판정 +25%p', cond: { stonesMin: 1 }, fx: { stones: -1, flag: 'blessed3' }, r: [['dicepriest', 'happy', '축복받으셨습니다. 영수증은 안 드려요.']] },
    { t: '주사위 말고 다른 방법은 없냐고 묻는다', fx: { ach: 'wall4' }, r: [['dicepriest', 'smug', '없어요. 이 세계관이 원래 그래요.'], ['narr', '', '어딘가에서 제작자가 고개를 끄덕였다.']] },
    { t: '등대의 주사위를 몰래 바꿔치기한다', sub: '성공 20% (피크 +30%p) · 전설 유물', roll: 0.2, royalBonus: { kyle: 0.3 },
      win: { fx: { relic: 'godDice' }, r: [['narr', '', '완벽한 손놀림이었다. 등대지기는 아무것도 눈치채지 못했다.'], ['dicepriest', 'shock', '…어? 이거 6만 나오는데?']] },
      lose: { fx: { gold: -100, rep: { church: -1 } }, r: [['dicepriest', 'angry', '거기, 손. 그거 내려놓으세요.'], ['narr', '', '등대지기가 소송을 걸었다. 합의금으로 금화 100을 냈다.']] } },
  ],
});

ev('board', {
  title: '항구 자유게시판', act: [2], bg: 'market', kind: 'common',
  intro: [
    ['narr', '', '부두 게시판에 쪽지가 빼곡하다.'],
    ['narr', '', '"문어 해적 또 옴 ㄹㅇ" "생선 값 실화냐" "용사단 언제 와요?"'],
  ],
  choices: [
    { t: '정성스럽게 답글을 단다', sub: '모든 진영 +1', fx: { rep: { church: 1, cult: 1, tribe: 1, guild: 1 } }, r: [['narr', '', '답글이 300개 달렸다. 절반은 "누구세요?"였다.']] },
    { t: '본인 등판한다', sub: '다음 3전투 공격 속도 +10%', fx: { mod: { fx: { spd: 0.1 }, battles: 3, name: '본인 등판' } }, r: [['narr', '', '쪽지가 하나 더 붙었다. "ㄷㄷ 용사단 본인 등판"'], ['narr', '', '항구의 사기가 올랐다. 조금.']] },
    { t: '게시판을 통째로 떼어 간다', sub: '항구 상인회 +2 · 구름 수도원 -1 · 성벽 +15', fx: { rep: { guild: 2, church: -1 }, wall: 15 }, r: [['narr', '', '게시판은 훌륭한 널빤지가 되었다. 성벽 보수에도 썼다.'], ['@q', 'smug', '여론 통제 완료.']] },
  ],
});

ev('arena', {
  title: '부두 꽃게 경주', act: [2], bg: 'crypt', kind: 'common',
  intro: [
    ['guild', 'smug', '어서 오십쇼! 오늘의 경기: 꽃게 대 꽃게! 배당률 1.9배!'],
    ['narr', '', '두 꽃게는 옆으로만 걷는다. 결승선은 앞에 있다.'],
  ],
  choices: [
    { t: '왼쪽 꽃게에 금화 100을 건다', sub: '성공 50% · 금화 +90', cond: { goldMin: 100 }, roll: 0.5,
      win: { fx: { gold: 90 }, r: [['narr', '', '왼쪽 꽃게가 옆으로 걷다가 우연히 결승선을 넘었다. 경기 끝.']] },
      lose: { fx: { gold: -100 }, r: [['narr', '', '오른쪽 꽃게가 왼쪽 꽃게를 집게로 집어 들고 나갔다. 금화도 집어 갔다.']] } },
    { t: '직접 출전한다', sub: '다음 전투 적 +20%, 대신 행운석 +2', fx: { stones: 2, mod: { fx: { enemyHp: 0.2 }, battles: 1, name: '꽃게 경주 후유증' } }, r: [['narr', '', '당신도 옆으로 걸었다. 경기는 항구의 화제가 되었다.']] },
    { t: '사인회를 연다', sub: '항구 상인회 +1 · 금화 +40', fx: { rep: { guild: 1 }, gold: 40 }, r: [['narr', '', '"용사단 친필"은 생각보다 잘 팔렸다. 대부분 생선 포장지로 쓰였다.']] },
  ],
});

ev('statue', {
  title: '먹물수염의 동상', act: [2], bg: 'market', kind: 'common',
  intro: [
    ['narr', '', '광장 한가운데 거대한 문어 동상이 서 있다. 받침대에는 "위대한 바다의 지배자 먹물수염"이라고 새겨져 있다.'],
    ['narr', '', '동상의 표정이 묘하게 얄밉다. 다리가 여덟 개라 여덟 배로 얄밉다.'],
  ],
  choices: [
    { t: '동상을 쓰러뜨린다', sub: '구름 수도원 +1 · 들판 요정 -2', fx: { rep: { church: 1, cult: -2 }, flag: 'statueDown' }, r: [['narr', '', '동상이 쓰러지며 정확히 반으로 갈라졌다. 속은 비어 있었다. 먹물수염의 머리처럼.']] },
    { t: '먹물로 콧수염을 그려 넣는다', sub: '성공 60% · 다음 보스전 보스 체력 -10%', roll: 0.6,
      win: { fx: { mod: { fx: { bossHp: -0.1 }, battles: 99, name: '동상 낙서', boss: true } }, r: [['narr', '', '훌륭한 콧수염이었다. 이 소식을 들은 먹물수염의 위엄이 깎였다.']] },
      lose: { fx: { wall: -5 }, r: [['narr', '', '해적 졸개에게 들켰다. 도망치다 미끄러졌다. 해변은 미끄럽다.']] } },
    { t: '동상에 꽃목걸이를 걸어 준다', sub: '들판 요정 +2', fx: { rep: { cult: 2 } }, r: [['narr', '', '요정들이 깔깔 웃었다. 문어 동상이 꽃목걸이를 하니 조금 귀여웠다.']] },
  ],
});

ev('overdue', {
  title: '마을 도서관 금서칸', act: [2, 3], bg: 'library', kind: 'common',
  intro: [
    ['narr', '', '바닷가 도서관 깊은 곳, 자물쇠로 잠긴 책장이 있다.'],
    ['narr', '', '사서의 메모: "미나 어린이 연체 4년째. 반납 바람. 진심으로."'],
  ],
  choices: [
    { t: '금서를 읽는다', sub: '성공 50% (미나 +35%p) · 영구: 마도 피해 +10%', roll: 0.5, royalBonus: { seren: 0.35 },
      win: { fx: { mod: { fx: { cls: { mage: 0.1 } }, battles: 99, name: '금서의 지식' } }, r: [['narr', '', '머릿속에 금지된 지식이 쏟아졌다. 대부분 요리법이었다. 일부는 마법이었다.']] },
      lose: { fx: { wall: -10, rep: { cult: 1 } }, r: [['narr', '', '책이 물었다. 진짜로 물었다. 요정들이 박수를 쳤다.']] } },
    { t: '연체료를 낸다', sub: '금화 -40 · 구름 수도원 +1 · 행운석 +1', cond: { goldMin: 40 }, fx: { gold: -40, rep: { church: 1 }, stones: 1 }, r: [['narr', '', '사서 할머니가 감동해서 울었다. 그리고 행운석을 줬다.']] },
    { t: '미나: "그거 내가 빌린 거 맞아."', cond: { royal: 'seren' }, hide: true, fx: { relic: 'candle' }, r: [['seren', 'smug', '4년 연체? 계산해 보니 연체료가 책값보다 비싸네. 다음에 낼게.'], ['narr', '', '미나는 금서 대신 꺼지지 않는 양초를 챙겼다. 독서등이 필요했다.']] },
  ],
});

ev('collector', {
  title: '먹물수염의 세금 꽃게', act: [2], bg: 'office', kind: 'common',
  intro: [
    ['guild', 'smug', '먹물수염 선장님의 명으로 왔습니다. 항구세, 파도세, 조개 줍기세를 내셔야겠군요.'],
    ['guild', 'neutral', '합계 금화 120. 조개 결제는 안 됩니다.'],
  ],
  choices: [
    { t: '낸다', sub: '금화 -120 · 항구 상인회 +2', cond: { goldMin: 120 }, fx: { gold: -120, rep: { guild: 2 } }, r: [['guild', 'happy', '성실 납세자시군요. 영수증 드릴게요. 이거 미역이에요.']] },
    { t: '거부한다', sub: '다음 2전투 적 체력 +15%', fx: { mod: { fx: { enemyHp: 0.15 }, battles: 2, name: '세금 체납' }, rep: { tribe: 1 } }, r: [['guild', 'angry', '후회하실 겁니다!'], ['narr', '', '세금 징수원이 먹물수염에게 고자질하러 옆으로 달려갔다.']] },
    { t: '용의 세금 영수증을 보여준다', sub: '용에게 세금을 받아 본 자만', cond: { relic: 'receipt' }, fx: { gold: 120, ach: 'collector' }, r: [['guild', 'shock', '용… 용이 세금을…?'], ['narr', '', '징수원은 기절했다. 떨어진 지갑을 주웠다.']] },
  ],
});

ev('swamp_toad', {
  title: '말하는 개구리', act: [2], bg: 'swamp', kind: 'common',
  intro: [
    ['narr', '', '안개 호수에서 개구리가 고개를 내밀었다. "입맞춤하면 왕자가 됩니다."'],
    ['narr', '', '"참고로 이미 용사이시면 개구리가 됩니다. 반반이에요."'],
  ],
  choices: [
    { t: '입맞춤한다', sub: '성공 30% · ???', roll: 0.3,
      win: { fx: { unit: 'random:3', rep: { tribe: 1 } }, r: [['narr', '', '개구리가 반짝이며 영웅이 되었다! "은혜는 칼로 갚겠소. 개굴."']] },
      lose: { fx: { mod: { fx: { spd: -0.05 }, battles: 2, name: '개구리 입맛' } }, r: [['narr', '', '아무 일도 일어나지 않았다. 입안에 호수 맛만 남았다.'], ['@q', 'shock', '…양치하세요.']] } },
    { t: '개구리를 꽃게 경주장에 판다', sub: '항구 상인회 +1 · 금화 +60', fx: { rep: { guild: 1, tribe: -1 }, gold: 60 }, r: [['narr', '', '개구리는 체념한 표정이었다. 익숙해 보였다.']] },
    { t: '호수에 돌려보낸다', sub: '숲 동물 마을 +2', fx: { rep: { tribe: 2 } }, r: [['narr', '', '개구리가 고맙다며 개굴했다. 호수의 안개가 조금 걷혔다.']] },
  ],
});

// ═══════════════ 3막 · 구름 산 / 4막 · 마왕성 ═══════════════
ev('ghostking', {
  title: '전설의 용사의 유령', act: [3, 4], bg: 'crypt', kind: 'common',
  intro: [
    ['ghost', 'happy', '오오, 후배들이구나. 천 년 전에 마왕을 혼냈던 아르딘이다. 지금은 보시다시피 반투명하지.'],
    ['ghost', 'neutral', '무지개 조각 하나를 지키고 있었다. 너희에게 줄 수 있다. 질문 하나에 답한다면.'],
  ],
  choices: [
    { t: '"마왕은 왜 다시 나타났나요?"', sub: '무지개 조각 +1', fx: { shard: 1, flag: 'knowTruth' }, r: [['ghost', 'sad', '사람들이 서로를 믿지 않을 때 마왕은 돌아온다. 그래서 너희가 셋인 거다.'], ['narr', '', '유령이 반짝이는 조각을 건넸다. 따뜻했다.']] },
    { t: '"선배님, 용돈 좀…"', sub: '무지개 조각 +1 · 금화 +100', fx: { shard: 1, gold: 100, ach: 'allowance' }, r: [['ghost', 'shock', '…천 년 만에 처음 듣는 말이로구나.'], ['ghost', 'happy', '옛다. 다 쓰지 말고. 간식은 사도 된다.']] },
    { t: '"유령 생활은 어때요?"', sub: '무지개 조각 +1 · 구름 수도원 +1', fx: { shard: 1, rep: { church: 1 } }, r: [['ghost', 'smug', '허리가 안 아프다.'], ['narr', '', '유령은 조각을 건네고 만족스럽게 사라졌다.']] },
  ],
});

ev('snowking', {
  title: '눈사람 왕', act: [3, 4], bg: 'mountain', kind: 'common',
  intro: [
    ['narr', '', '구름 산 꼭대기에 왕관을 쓴 거대한 눈사람이 앉아 있다.'],
    ['narr', '', '눈사람: "이곳은 나의 왕국이다. 통행세는 겨울 한 조각이다."'],
  ],
  choices: [
    { t: '왕위를 걸고 눈싸움을 한다', sub: '성공 45% · 전설 유닛', roll: 0.45,
      win: { fx: { unit: 'random:4' }, r: [['narr', '', '눈사람 왕이 녹아내리며 말했다. "그대가… 진정한… 겨울의 왕…"'], ['narr', '', '눈 속에서 전설의 전사가 깨어났다.']] },
      lose: { fx: { wall: -12 }, r: [['narr', '', '눈사람의 눈덩이는 바위였다. 반칙이었다.']] } },
    { t: '당근 코를 선물한다', sub: '숲 동물 마을 +2 · 성벽 +15', fx: { rep: { tribe: 2 }, wall: 15 }, r: [['narr', '', '눈사람 왕이 감동해 길을 열어주었다. 콧물(눈)을 흘렸다.']] },
    { t: '"왕은 한 명이면 충분해."', sub: '들판 요정 +2 · 금화 +80', fx: { rep: { cult: 2 }, gold: 80 }, r: [['narr', '', '당신은 눈사람 왕에게 따뜻한 차를 부었다. 왕관은 녹지 않았다. 팔았다.'], ['narr', '', '요정들이 배를 잡고 웃었다.']] },
  ],
});

ev('echo', {
  title: '메아리 골짜기', act: [3, 4], bg: 'mountain', kind: 'common',
  intro: [['narr', '', '구름 사이 골짜기 앞에 팻말: "소리치면 메아리가 대답합니다. 가끔 진심으로."']],
  choices: [
    { t: '"나는 용사다!"', sub: '성공 50% · 다음 전투 피해 +20%', roll: 0.5,
      win: { fx: { mod: { fx: { dmg: 0.2 }, battles: 1, name: '메아리의 확신' } }, r: [['narr', '', '"…용사다… 용사다… 용…사…다…" 메아리가 확신을 실어 돌려주었다.']] },
      lose: { fx: { mod: { fx: { dmg: -0.1 }, battles: 1, name: '메아리의 의심' } }, r: [['narr', '', '"…진짜?… 진짜?… 진짜…?" 메아리가 의심했다.']] } },
    { t: '"배고프다!"', sub: '성벽 +10', fx: { wall: 10 }, r: [['narr', '', '"…밥 먹자… 밥 먹자…" 메아리를 따라가니 산양들의 도시락이 있었다.']] },
    { t: '조용히 지나간다', sub: '행운석 +1', fx: { stones: 1 }, r: [['narr', '', '메아리가 섭섭해서 행운석을 굴려 보냈다. "…왜 아무 말도… 안 해…"']] },
  ],
});

ev('inn', {
  title: '마왕성 앞 마지막 여관', act: [3, 4], bg: 'camp', kind: 'common',
  intro: [
    ['villager', 'happy', '어서 오세요, 마왕성 앞 마지막 여관입니다! 진짜 마지막이에요. 그다음은 마왕성이라서.'],
  ],
  choices: [
    { t: '하룻밤 묵는다', sub: '금화 -60 · 성벽 최대치의 40% 회복', cond: { goldMin: 60 }, fx: { gold: -60, heal: 0.4 }, r: [['narr', '', '오랜만에 푹 잤다. 꿈에 뿌루가 나왔다. 계속 삐약거렸다.']] },
    { t: '주인과 주사위 내기를 한다', sub: '성공 50% · 행운석 +3 / 실패 행운석 -1', cond: { stonesMin: 1 }, roll: 0.5,
      win: { fx: { stones: 3 }, r: [['villager', 'shock', '어떻게 6이 세 번…?']] },
      lose: { fx: { stones: -1 }, r: [['villager', 'smug', '마왕성 앞까지 오셨는데 운은 여기서 끝이시네요.']] } },
    { t: '방명록에 낙서한다', sub: '???', fx: { flag: 'guestbook', rep: { guild: 1 } }, r: [['narr', '', '방명록 첫 장에는 천 년 전의 필체로 "꼭 다시 올게 — 아르딘"이라고 적혀 있었다.']] },
  ],
});

ev('whisper', {
  title: '마왕의 속삭임', act: [3, 4], bg: 'hall', kind: 'common',
  intro: [
    ['narr', '', '보랏빛 안개 속에 무지개 조각 하나가 떠 있다. 조각 너머로 낮은 목소리가 속삭인다.'],
    ['narr', '', '"용사여, 나와 손잡아라. 세상을 너희 뜻대로 바꿀 수 있다."'],
  ],
  choices: [
    { t: '조각만 챙긴다', sub: '무지개 조각 +1', fx: { shard: 1 }, r: [['narr', '', '속삭임을 무시하고 조각을 주머니에 넣었다. 주머니가 따뜻해졌다.']] },
    { t: '속삭임에 귀를 기울인다', sub: '무지개 조각 +1 · 들판 요정 +3 · 성벽 최대 -10', fx: { shard: 1, rep: { cult: 3 }, wallMax: -10 }, r: [['narr', '', '속삭임이 달콤했다. 손끝이 보랏빛으로 물들었다.'], ['narr', '', '장난꾸러기 요정들이 흥미롭다는 듯 몰려들었다.']] },
    { t: '"마왕님 혹시 말 많은 편이세요?"', sub: '무지개 조각 +1', fx: { shard: 1 }, r: [['narr', '', '"…" 속삭임이 처음으로 조용해졌다. 상처받은 것 같다.']] },
  ],
});

ev('mirror', {
  title: '보랏빛 거울', act: [3, 4], bg: 'crypt', kind: 'common',
  cond: { flag: 'siblingSeen' },
  intro: [
    ['narr', '', '깨진 거울 속에 익숙한 얼굴이 보인다. 1년 전 마왕에게 끌려간 소꿉친구 노아다. 눈이 보랏빛이다.'],
    ['narr', '', '거울 속 그림자가 손짓한다. 마왕성 꼭대기로 오라고.'],
  ],
  choices: [
    { t: '그림자를 쫓는다', sub: '최종 보스가 바뀐다', fx: { flag: 'brotherRoute' }, r: [['narr', '', '거울이 산산이 부서졌다. 그림자는 마왕성 꼭대기로 사라졌다.'], ['@q', 'sad', '…같이 가요. 노아를 데리고 돌아와요.']] },
    { t: '거울을 덮는다', sub: '구름 수도원 +1', fx: { rep: { church: 1 } }, r: [['narr', '', '천을 덮자 속삭임이 멎었다. 아직은.']] },
  ],
});

// ═══════════════ 진영 연쇄 ═══════════════
ev('church1', {
  title: '구름 수도원 순례단', act: [1, 2], bg: 'road', kind: 'faction', faction: 'church',
  intro: [
    ['priest', 'happy', '구름이 함께하길! 저희는 구름 산의 수도원을 다시 세우려는 순례단입니다.'],
    ['priest', 'neutral', '헌금은 자율입니다. 자율이지만 구름이 지켜보고 있습니다.'],
  ],
  choices: [
    { t: '헌금한다', sub: '금화 -50 · 구름 수도원 +3', cond: { goldMin: 50 }, fx: { gold: -50, rep: { church: 3 } }, r: [['priest', 'happy', '구름이 그대를 기억할 것입니다. 장부에도 적어두겠습니다.']] },
    { t: '함께 기도한다', sub: '구름 수도원 +1 · 성벽 +10', fx: { rep: { church: 1 }, wall: 10 }, r: [['narr', '', '기도가 끝나자 마음이 몽글몽글해졌다. 성벽도 조금 단단해졌다.']] },
    { t: '"구름은 금화로 사는 건가요?"', sub: '구름 수도원 -2 · 들판 요정 +1', fx: { rep: { church: -2, cult: 1 } }, r: [['priest', 'angry', '…무례하군요.'], ['narr', '', '순례단이 수군거리며 떠났다. 요정들은 키득거렸다.']] },
  ],
});
ev('church2', {
  title: '구름 수도원 재건', act: [2, 3, 4], bg: 'temple', kind: 'faction', faction: 'church', cond: { repMin: { church: 3 } },
  intro: [
    ['priest', 'happy', '용사님! 수도원의 종탑이 다시 섰습니다. 첫 종을 울려 주소서.'],
  ],
  choices: [
    { t: '구름 종을 울린다', sub: '구름 수도원 +3 · 성벽 최대 +15', fx: { rep: { church: 3 }, wallMax: 15, heal: 0.15 }, r: [['narr', '', '종소리가 하늘 끝까지 퍼졌다. 구름 사이로 무지개가 살짝 보였다.']] },
    { t: '성수로 유닛을 축복한다', sub: '구름 수도원 +2 · 은빛 성기사 합류', fx: { rep: { church: 2 }, unit: 'paladin' }, r: [['narr', '', '성수를 맞은 수련 기사가 서약을 외쳤다. 약관은 끝까지 읽었다.']] },
    { t: '"여기 관광지 하면 대박이겠는데요."', sub: '항구 상인회 +2', fx: { rep: { guild: 2, church: -1 } }, r: [['priest', 'shock', '…용사님이 할 말입니까 그게?']] },
  ],
});
ev('cult1', {
  title: '장난꾸러기 요정들', act: [1, 2], bg: 'ruins', kind: 'faction', faction: 'cult',
  intro: [
    ['cultist', 'smug', '용사다! 용사가 왔다! 우리랑 놀자! 지는 쪽이 꽃가루 뒤집어쓰기!'],
    ['cultist', 'neutral', '…아 근데 오늘 놀아 주는 사람이 용사 한 명이네. 반가워!'],
  ],
  choices: [
    { t: '끝까지 놀아 준다', sub: '들판 요정 +3 · 저주 유물', fx: { rep: { cult: 3 }, relic: 'random:curse' }, r: [['cultist', 'happy', '첫 친구다! 선물 줄게! 반품 불가! 약간 저주받았어!']] },
    { t: '수수께끼를 낸다', sub: '들판 요정 +1 · 행운석 +1', fx: { rep: { cult: 1 }, stones: 1 }, r: [['narr', '', '"아침엔 네 발, 점심엔…" 요정은 3시간 동안 고민하다 행운석을 주고 도망갔다.']] },
    { t: '"장난 그만!" 하고 혼낸다', sub: '구름 수도원 +2 · 들판 요정 -2', fx: { rep: { church: 2, cult: -2 } }, r: [['cultist', 'angry', '흥! 너 기억할 거야!'], ['narr', '', '요정은 정말로 기억할 것이다. 꽤 집요해 보였다.']] },
  ],
});
ev('cult2', {
  title: '요정 여왕의 밤 정원', act: [2, 3, 4], bg: 'crypt', kind: 'faction', faction: 'cult', cond: { repMin: { cult: 3 } },
  intro: [
    ['cultist', 'smug', '용사야, 요정 여왕님이 너를 부르셔. 밤에만 피는 정원으로.'],
    ['cultist', 'neutral', '여왕님이 마왕한테서 몰래 훔친 그림자 꽃가루가 있대. 엄청 세져. 대가는… 나중에 알게 돼.'],
  ],
  choices: [
    { t: '그림자 꽃가루를 받는다', sub: '들판 요정 +3 · 모든 피해 +15% (영구) · 최종 보스가 바뀐다', fx: { rep: { cult: 3 }, flag: 'ashRite', mod: { fx: { dmg: 0.15 }, battles: 99, name: '그림자 꽃가루' } }, r: [['narr', '', '보랏빛 가루가 반짝이며 스며들었다. 강해졌다. 조금 간지러웠다.'], ['narr', '', '멀리 마왕성에서 무언가가 낮게 웃었다.']] },
    { t: '정원 구경만 한다', sub: '들판 요정 +1 · 행운석 +2', fx: { rep: { cult: 1 }, stones: 2 }, r: [['narr', '', '밤 정원은 생각보다 졸렸다. 다들 꽃잎 위에서 꾸벅꾸벅 졸았다.']] },
    { t: '꽃가루를 몰래 밀가루로 바꿔 놓는다', sub: '구름 수도원 +2 · 들판 요정 -3', fx: { rep: { church: 2, cult: -3 }, ach: 'flour' }, r: [['narr', '', '요정들이 밀가루를 뒤집어쓰고 재채기를 했다. 정원은 빵 반죽이 되었다.']] },
  ],
});
ev('tribe1', {
  title: '숲 동물 마을의 열매 따기', act: [1, 2], bg: 'forest', kind: 'faction', faction: 'tribe',
  intro: [
    ['chief', 'neutral', '용사가 숲에 오다니. 나무를 베러 왔나, 열매를 따러 왔나? …둘 다 안 돼.'],
  ],
  choices: [
    { t: '함께 열매를 딴다', sub: '숲 동물 마을 +3 · 궁수 유닛', fx: { rep: { tribe: 3 }, unit: 'random:1:archer' }, r: [['chief', 'happy', '손이 빠르군. 우리 마을 다람쥐 사수 하나를 데려가라.']] },
    { t: '나무를 심겠다고 약속한다', sub: '숲 동물 마을 +2 · 성벽 +10', fx: { rep: { tribe: 2 }, wall: 10 }, r: [['chief', 'neutral', '사람의 약속은 믿지 않는다. 나무는 믿는다.']] },
    { t: '"이 숲에 놀이공원 지으면 대박이겠네요."', sub: '항구 상인회 +2 · 숲 동물 마을 -2', fx: { rep: { guild: 2, tribe: -2 } }, r: [['chief', 'angry', '……'], ['narr', '', '숲의 다람쥐들이 당신을 노려보는 것 같다.']] },
  ],
});
ev('tribe2', {
  title: '숲 동물 마을의 샘', act: [2, 3, 4], bg: 'forest', kind: 'faction', faction: 'tribe', cond: { repMin: { tribe: 3 } },
  intro: [
    ['chief', 'happy', '숲이 너희를 받아들였다. 마을 샘에서 하나를 고르라.'],
  ],
  choices: [
    { t: '생명의 샘', sub: '성벽 최대치의 50% 회복 · 숲 동물 마을 +2', fx: { heal: 0.5, rep: { tribe: 2 } }, r: [['narr', '', '샘물을 마시자 성벽에서 새싹이 돋았다. 성벽이 웃는 것 같았다.']] },
    { t: '사냥의 샘', sub: '궁수 피해 +15% (영구) · 숲 동물 마을 +2', fx: { mod: { fx: { cls: { archer: 0.15 } }, battles: 99, name: '사냥의 샘' }, rep: { tribe: 2 } }, r: [['narr', '', '화살 끝에서 숲의 향기가 났다. 맞으면 아프다.']] },
    { t: '샘에 금화를 던진다', sub: '숲 동물 마을 -1 · 행운석 +2', fx: { rep: { tribe: -1 }, stones: 2 }, r: [['chief', 'sad', '…이건 소원 우물이 아니다.'], ['narr', '', '그래도 샘은 행운석을 돌려주었다. 착한 샘이다.']] },
  ],
});
ev('guild1', {
  title: '항구 상인회의 계약서', act: [1, 2], bg: 'market', kind: 'faction', faction: 'guild',
  intro: [
    ['guild', 'smug', '용사님! 투자 기회입니다! 계약서에 서명만 하시면 됩니다.'],
    ['guild', 'neutral', '작은 글씨는 신경 쓰지 마세요. 원래 작게 쓰는 겁니다.'],
  ],
  choices: [
    { t: '서명한다', sub: '항구 상인회 +3 · 금화 +120 · 다음 상점 가격 +20%', fx: { rep: { guild: 3 }, gold: 120, flag: 'guildDebt' }, r: [['guild', 'happy', '탁월한 선택이십니다! 작은 글씨는 나중에 읽어보세요.']] },
    { t: '작은 글씨를 읽는다', sub: '항구 상인회 +1 · 유물', fx: { rep: { guild: 1 }, relic: 'random:common' }, r: [['narr', '', '작은 글씨: "서명 시 용사단 이름을 상인회 광고에 씁니다." 서명하지 않았다.'], ['guild', 'sad', '…눈이 좋으시네요. 이건 선물입니다.']] },
    { t: '계약서로 종이비행기를 접는다', sub: '???', fx: { flagInc: 'plane', rep: { guild: -1 } }, r: [['narr', '', '종이비행기는 상인회장의 모자에 정확히 꽂혔다.']] },
  ],
});
ev('guild2', {
  title: '황금 항구 경매', act: [2, 3, 4], bg: 'market', kind: 'faction', faction: 'guild', cond: { repMin: { guild: 3 } },
  intro: [
    ['guild', 'happy', 'VIP 고객님! 오늘의 경매 품목은 무려 "진짜 전설 유물"입니다!'],
  ],
  choices: [
    { t: '금화 150에 입찰한다', sub: '전설 유물', cond: { goldMin: 150 }, fx: { gold: -150, relic: 'random:legend', rep: { guild: 2 } }, r: [['guild', 'happy', '낙찰! 진짜예요. 이번엔 진짜.']] },
    { t: '경매를 주최한다 (유닛 하나를 판다)', sub: '가장 높은 등급 유닛 판매 · 금화 크게', fx: { sellBest: 1, rep: { guild: 2 } }, r: [['narr', '', '"용사단 출신 전사" 경매는 대성황이었다.']] },
    { t: '경매장 등불을 끈다', sub: '성공 35% · 금화 +250', roll: 0.35,
      win: { fx: { gold: 250, rep: { guild: -2 } }, r: [['narr', '', '어둠 속에서 누군가 금화 자루를 들고 나갔다. 당신이었다.']] },
      lose: { fx: { rep: { guild: -3 }, wall: -10 }, r: [['guild', 'angry', '불 켜! 저 용사 잡아!']] } },
  ],
});

// ═══════════════ 동료 ═══════════════
ev('bran1', {
  title: '은퇴한 용사 할아버지', act: [1], bg: 'ruins', kind: 'bond', comp: 'bran', recruit: true,
  intro: [
    ['bran', 'neutral', '…자네들이 이번 용사단인가? 나는 바르톨. 40년 전에 용사였지. 지금은 텃밭 담당이고.'],
    ['bran', 'sad', '그때 마왕을 끝까지 쓰러뜨리지 못했네. 남은 시간을 자네들에게 보태고 싶어.'],
    ['bran', 'neutral', '…허리가 좀 아프긴 하네만.'],
  ],
  choices: [
    { t: '함께 가요', sub: '바르톨 합류 · 인연 +1', fx: { join: 'bran', bond: { bran: 1 } }, r: [['bran', 'happy', '좋아, 출발이다! (뚝) …괜찮네. 허리야.']] },
    { t: '이제 쉬셔도 된다고 말한다', sub: '구름 수도원 +1 · 성벽 +20', fx: { rep: { church: 1 }, wall: 20 }, r: [['bran', 'sad', '…그럼 성벽이라도 보수해 두고 가겠네.'], ['narr', '', '바르톨 할아버지는 밤새 성벽을 고치고 조용히 텃밭으로 돌아갔다.']] },
  ],
});
ev('bran2', {
  title: '바르톨의 약속', act: [2, 3, 4], bg: 'camp', kind: 'bond', comp: 'bran', cond: { bondMin: { bran: 2 } },
  intro: [
    ['bran', 'neutral', '용사님들. 40년 전 이야기를 해도 되겠나.'],
    ['bran', 'sad', '그때 마왕성 앞에서 겁이 나서 물러섰지. 동료들은 기다렸는데… 나는 아무것도 하지 못했네.'],
  ],
  choices: [
    { t: '"이번엔 함께 끝내요."', sub: '바르톨 인연 +2', fx: { bond: { bran: 2 }, flag: 'branOath' }, r: [['bran', 'happy', '…그래. 이번엔 반드시.'], ['narr', '', '노용사의 눈에 오랜만에 불이 켜졌다.']] },
    { t: '"허리는 괜찮으세요?"', sub: '바르톨 인연 +1 · 성벽 +10', fx: { bond: { bran: 1 }, wall: 10 }, r: [['bran', 'shock', '그걸 기억하고 있었나.'], ['bran', 'happy', '안 괜찮네. 고맙네.']] },
  ],
});
ev('linette1', {
  title: '노래하는 음유시인', act: [1, 2], bg: 'market', kind: 'bond', comp: 'linette', recruit: true,
  intro: [
    ['linette', 'happy', '♪ 풀숲을 지나~ 바다를 건너~ 그리고 등장하는 귀여운(?) 용사단~ ♪'],
    ['linette', 'smug', '안녕! 난 리네트. 너희 모험, 노래로 만들면 대박 날 것 같아. 따라가도 돼?'],
  ],
  choices: [
    { t: '같이 가자', sub: '리네트 합류 · 인연 +1', fx: { join: 'linette', bond: { linette: 1 } }, r: [['linette', 'happy', 'ㄹㅇ? 1절 벌써 씀. 제목은 "꽝의 용사단".']] },
    { t: '노래 한 곡만 듣는다', sub: '금화 -10 · 다음 2전투 공격 속도 +8%', fx: { gold: -10, mod: { fx: { spd: 0.08 }, battles: 2, name: '리네트의 노래' } }, r: [['linette', 'neutral', '팁 감사! 다음에 또 만나면 그땐 같이 가자고.']] },
  ],
});
ev('linette2', {
  title: '리네트의 신곡', act: [2, 3, 4], bg: 'camp', kind: 'bond', comp: 'linette', cond: { bondMin: { linette: 2 } },
  intro: [
    ['linette', 'neutral', '…있잖아. 사실 나 노래 대회에서 한 번도 끝까지 부른 적이 없어. 늘 중간에 도망쳤거든.'],
    ['linette', 'sad', '그래서 이번엔 끝까지 부르고 싶어. 이 모험의 마지막 절까지.'],
  ],
  choices: [
    { t: '"마지막 절은 해피엔딩으로 하자."', sub: '리네트 인연 +2', fx: { bond: { linette: 2 } }, r: [['linette', 'happy', '약속! 아, 근데 슬픈 노래가 더 잘 팔리는데…'], ['linette', 'smug', '농담이야. ㄹㅇ 농담.']] },
    { t: '"후렴은 내가 부를게."', sub: '리네트 인연 +1', fx: { bond: { linette: 1 } }, r: [['narr', '', '당신의 노래 실력은… 용감했다.'], ['linette', 'shock', '…가사만 써줄래?']] },
  ],
});
ev('bork1', {
  title: '덤벙 발명가', act: [1, 2], bg: 'swamp', kind: 'bond', comp: 'bork', recruit: true,
  intro: [
    ['bork', 'sad', '……흑. 아, 용사님들이시군요. 전 보르크. 발명가예요. 대부분 터지지만요.'],
    ['bork', 'sad', '제 친구 용 실바나가 마왕의 얼음 마법에 맞아서… 마왕성 쪽으로 날아가 버렸어요. 흑흑.'],
  ],
  choices: [
    { t: '"함께 실바나를 찾자."', sub: '보르크 합류 · 인연 +1', fx: { join: 'bork', bond: { bork: 1 } }, r: [['bork', 'happy', '정말요?! 흑흑흑 (기뻐서 우는 중) 제 발명품 다 가져갈게요!']] },
    { t: '손수건을 건넨다', sub: '숲 동물 마을 +1', fx: { rep: { tribe: 1 } }, r: [['bork', 'sad', '감사합니다… (코 풂) 돌려드릴게요.'], ['narr', '', '돌려받지 않았다.']] },
  ],
});
ev('bork2', {
  title: '용알', act: [2, 3, 4], bg: 'mountain', kind: 'bond', comp: 'bork', cond: { bondMin: { bork: 2 } },
  intro: [
    ['bork', 'shock', '용사님! 이거 보세요! 실바나의 옛 둥지에 남아 있던… 알이에요!'],
    ['bork', 'sad', '근데 차가워요. 꺼진 것 같아요. 흑.'],
  ],
  choices: [
    { t: '품에 안고 데워준다', sub: '보르크 인연 +2 · 인연 5면 마스코트 용알이 해금', fx: { bond: { bork: 2 }, flag: 'eggWarm' }, r: [['narr', '', '알이 아주 희미하게 따뜻해졌다. 톡, 하고 안에서 무언가 움직였다.'], ['bork', 'happy', '살아 있어요!!! 흑흑흑흑']] },
    { t: '"오믈렛…은 농담이야."', sub: '보르크 인연 +1', fx: { bond: { bork: 1 } }, r: [['bork', 'shock', '……'], ['bork', 'sad', '농담이라도 상처예요.']] },
  ],
});
ev('aila1', {
  title: '수줍은 탈영병', act: [2], bg: 'swamp', kind: 'bond', comp: 'aila', recruit: true,
  intro: [
    ['aila', 'neutral', '…용사구나. 난 에일라. 마왕군… 이었어. 어제 그만뒀어.'],
    ['aila', 'cold', '마왕은 나쁜 놈이야. 진짜로. 그래서 너희를 이용해서 혼내 줄 거야. …같이 가도 돼?'],
  ],
  choices: [
    { t: '"이용해도 좋아. 같이 가자."', sub: '에일라 합류 · 인연 +1', fx: { join: 'aila', bond: { aila: 1 } }, r: [['aila', 'smug', '…쉽네. 마음에 들어. 칭찬 아님.']] },
    { t: '"마왕군을 믿을 수 없어."', sub: '들판 요정 +1', fx: { rep: { cult: 1 } }, r: [['aila', 'neutral', '현명해. 나라도 안 믿어.'], ['narr', '', '에일라는 망토를 여미고 안개 속으로 사라졌다.']] },
  ],
});
ev('aila2', {
  title: '탈영병의 비밀 쪽지', act: [2, 3, 4], bg: 'library', kind: 'bond', comp: 'aila', cond: { bondMin: { aila: 2 } },
  intro: [
    ['aila', 'sad', '마왕군에 있을 때 이걸 몰래 적어 뒀어. 마왕성 지도랑… 먹물수염의 약점.'],
    ['aila', 'sad', '전엔 아무한테도 못 보여줬어. 보여줄 사람이 없었거든.'],
  ],
  choices: [
    { t: '"이제 우리가 있잖아."', sub: '에일라 인연 +2', fx: { bond: { aila: 2 }, flag: 'ailaHope' }, r: [['aila', 'shock', '…우리?'], ['aila', 'happy', '…고마워. 이건 칭찬이야.']] },
    { t: '조용히 곁에 있어준다', sub: '에일라 인연 +1', fx: { bond: { aila: 1 } }, r: [['narr', '', '에일라는 한참 동안 쪽지를 만지작거렸다. 당신은 아무 말도 하지 않았다. 그게 맞았다.']] },
  ],
});
ev('toto1', {
  title: '장사꾼 너구리', act: [1, 2], bg: 'road', kind: 'bond', comp: 'toto', recruit: true,
  intro: [
    ['toto', 'happy', '손님! 손님! 너구리 특가 세일! 오늘만! 사실 매일!'],
    ['toto', 'smug', '토토는 용사단 단골 받는 게 꿈이었어요. 따라가도 돼요? 이동식 상점 해드림!'],
  ],
  choices: [
    { t: '같이 가자', sub: '토토 합류 · 인연 +1', fx: { join: 'toto', bond: { toto: 1 } }, r: [['toto', 'happy', '계약 성립! 첫 거래 기념 영수증 드려요. 이거 100금화예요.'], ['narr', '', '농담이었다. 아마.']] },
    { t: '물건만 산다', sub: '금화 -40 · 흔한 유물', cond: { goldMin: 40 }, fx: { gold: -40, relic: 'random:common' }, r: [['toto', 'smug', '현명한 소비! 환불은 안 돼요.']] },
  ],
});
ev('toto2', {
  title: '토토의 마지막 영업', act: [2, 3, 4], bg: 'camp', kind: 'bond', comp: 'toto', cond: { bondMin: { toto: 2 } },
  intro: [
    ['toto', 'happy', '용사님, 이번엔 진짜 나와요. 진짜예요. 토토 믿죠?'],
    ['narr', '', '토토가 반짝이는 눈으로 상자를 내민다. 꼬리도 반짝인다.'],
  ],
  choices: [
    { t: '행운석 3개를 내고 상자를 연다', sub: '성공 25% · 전설 유닛 / 실패해도 인연 +1', cond: { stonesMin: 3 }, roll: 0.25,
      win: { fx: { stones: -3, unit: 'random:4', bond: { toto: 2 } }, r: [['toto', 'shock', '…진짜 나왔네? 토토도 놀람.']] },
      lose: { fx: { stones: -3, bond: { toto: 1 } }, r: [['toto', 'smug', '다음엔 진짜 나와요.']] } },
    { t: '거절한다', sub: '토토 인연 -1', fx: { bond: { toto: -1 } }, r: [['toto', 'sad', '…용사님 너무해.']] },
    { t: '오히려 토토에게 상자를 판다', sub: '성공 10% · 금화 +300', roll: 0.1,
      win: { fx: { gold: 300, bond: { toto: 2 } }, r: [['toto', 'shock', '용사님… 천재? 토토 제자 해요.']] },
      lose: { fx: {}, r: [['toto', 'smug', '그 상자 원래 내 거잖아요.']] } },
  ],
});

// ═══════════════ 용사 전용 ═══════════════
ev('royal_edric', {
  title: '할아버지의 방패', act: [1, 2], bg: 'office', kind: 'royal', royal: 'edric',
  intro: [
    ['edric', 'neutral', '마을 회관 벽에 그림 하나가 걸려 있다. 어릴 적 우리 넷이 그려진 그림이다.'],
    ['edric', 'sad', '나, 미나, 피크… 그리고 노아. 1년 전 마왕에게 끌려간 노아.'],
  ],
  choices: [
    { t: '그림 앞에서 다짐한다', sub: '기사 피해 +10% (영구) · 친구의 흔적', fx: { mod: { fx: { cls: { knight: 0.1 } }, battles: 99, name: '레오의 다짐' }, flag: 'siblingSeen' }, r: [['edric', 'neutral', '이번엔 내가 지킬게. 방패부터 들고. 칼은… 그다음에.'], ['narr', '', '그림 속 노아의 눈이 잠시 보랏빛으로 빛난 것 같았다.']] },
    { t: '그림을 떼어 챙긴다', sub: '구름 수도원 +2 · 친구의 흔적', fx: { rep: { church: 2 }, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['edric', 'happy', '다시 만나면 같이 그리자. 이번엔 다섯이서. 뿌루도.']] },
  ],
});
ev('royal_seren', {
  title: '마왕성 견학 안내서', act: [1, 2], bg: 'library', kind: 'royal', royal: 'seren',
  intro: [
    ['seren', 'smug', '도서관에서 찾았어. 『마왕성 견학 안내서』. 대출 기록이… 역시 내가 연체 중이네.'],
    ['seren', 'shock', '잠깐, 여기 마왕성 포로 명단이 끼워져 있어. 노아… 노아 이름이 있어!'],
  ],
  choices: [
    { t: '끝까지 해독한다', sub: '성공 60% · 마도 피해 +15% (영구) · 친구의 흔적', roll: 0.6,
      win: { fx: { mod: { fx: { cls: { mage: 0.15 } }, battles: 99, name: '안내서 해독' }, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['seren', 'neutral', '…마왕은 가장 용감한 아이 하나를 그림자로 만든대. 그게 노아라면…'], ['seren', 'sad', '찾아야 해. 무조건.']] },
      lose: { fx: { wall: -10, flag: 'siblingSeen' }, r: [['seren', 'shock', '책에 불이 붙었어! 아니 내 앞머리에 붙었어!']] } },
    { t: '책을 덮고 반납한다', sub: '구름 수도원 +2 · 행운석 +2', fx: { rep: { church: 2 }, stones: 2 }, r: [['narr', '', '4년 만의 반납이었다. 사서 할머니가 눈물을 흘렸다.']] },
  ],
});
ev('royal_kyle', {
  title: '장터의 수상한 팔찌', act: [1, 2], bg: 'market', kind: 'royal', royal: 'kyle',
  intro: [
    ['kyle', 'smug', '맛집 찾아 떠돈 경력 10년의 감이 말한다. 저 상인, 뭔가 숨기고 있어.'],
    ['guild', 'neutral', '…들꽃으로 엮은 팔찌가 하나 들어왔소. 주인이 그림자처럼 사라졌다더군.'],
  ],
  choices: [
    { t: '팔찌를 산다', sub: '금화 -60 · 친구의 흔적 · 행운석 +2', cond: { goldMin: 60 }, fx: { gold: -60, stones: 2, flag: 'siblingSeen', flag2: 'brotherBond' }, r: [['kyle', 'sad', '…노아 거잖아. 우리 넷이 똑같이 엮었던 팔찌.']] },
    { t: '정보만 산다', sub: '항구 상인회 +2 · 친구의 흔적', fx: { rep: { guild: 2 }, flag: 'siblingSeen' }, r: [['kyle', 'neutral', '그림자라… 노아는 늘 숨바꼭질 1등이었지.']] },
    { t: '상인의 간식 창고를 턴다', sub: '성공 70% · 금화 +150', roll: 0.7,
      win: { fx: { gold: 150, rep: { guild: -2 } }, r: [['kyle', 'smug', '떠돌이의 특기지. 간식 창고 털기. 금화는 덤.']] },
      lose: { fx: { wall: -10, rep: { guild: -3 } }, r: [['guild', 'angry', '경비!!']] } },
  ],
});

// ═══════════════ 특수 ═══════════════
ev('dragon_talk', {
  title: '얼어붙은 용', special: true, bg: 'mountain',
  intro: [
    ['dragon', 'angry', '크르르르… 인간… 용사… 마왕의 냉기…'],
    ['bork', 'sad', '실바나! 나야, 보르크야! 기억 안 나? 너 매일 내 머리 물었잖아!'],
    ['dragon', 'sad', '……보…르…크…?'],
  ],
  choices: [
    { t: '보르크에게 맡긴다', sub: '성공 60% (인연 5면 100%) · 전투 없이 무지개 조각', roll: 0.6, bondAuto: { bork: 5 },
      win: { fx: { shard: 1, flag: 'dragonFriend', bond: { bork: 1 }, ach: 'dragon', skipBattle: 1 }, r: [['dragon', 'happy', '보르크…! 크르릉 (머리를 문다)'], ['bork', 'happy', '아야! 맞아, 이거야! 흑흑흑'], ['narr', '', '실바나가 얼음 속에서 무지개 조각을 꺼내 주었다.']] },
      lose: { fx: { flag: 'dragonTalked' }, r: [['dragon', 'angry', '크아아아!'], ['bork', 'shock', '아직 마왕의 냉기가 너무 많아요! 일단 싸워서 털어내야 해요!']] } },
    { t: '싸워서 냉기를 털어낸다', fx: { flag: 'dragonTalked' }, r: [['narr', '', '실바나가 날개를 펼쳤다. 냉기가 몰아친다!']] },
  ],
});

// 용사 메인 스토리(운명의 장)도 같은 사건 엔진으로 재생한다
Object.assign(E, FATE);

export const EVENT_DATA = E;
