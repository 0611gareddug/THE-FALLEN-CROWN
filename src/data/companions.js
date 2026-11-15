// 동료 NPC 5명: 인연(0~5)에 따른 패시브와 전투 중 참견 대사
export const COMPANIONS = {
  bran: {
    name: '바르톨', title: '은퇴한 용사 할아버지', color: '#7a8296',
    p1: { text: '성벽 최대 체력 +10 (합류 시)', join: { wallMax: 10 } },
    p3: { text: '보스의 성벽 피해를 한 번 절반으로', fx: { bossGuard: 1 } },
    quips: ['이 늙은 몸은… 허리가 아프네.', '정면 돌파! …는 젊은이들에게 맡기겠네.', '내 젊을 적엔 고블린이 더 작았지.', '진형을! 아, 이미 했군. 요즘 애들은 빨라.'],
  },
  linette: {
    name: '리네트', title: '방랑 음유시인', color: '#d0463b',
    p1: { text: '웨이브 보상 금화 +4', fx: { waveGold: 4 } },
    p3: { text: '지도에서 사건 칸의 제목을 미리 본다', run: { preview: 1 } },
    quips: ['ㄹㅇ 이 장면 노래로 만들어야 함.', '방금 그 소환, 3절 가사로 씀.', '관객 여러분 박수!', '♪ 고블린은 가고~ 금화는 오고~ ♪'],
  },
  bork: {
    name: '보르크', title: '덤벙 발명가', color: '#a8704a',
    p1: { text: '기사 피해 +5%', fx: { cls: { knight: 0.05 } } },
    p3: { text: '보스 피해 +10%', fx: { bossDmg: 0.1 } },
    quips: ['실바나도 저렇게 날았었는데… 흑.', '이 발명품은 안 터져요. 아마.', '저 박쥐, 실바나랑 날개가 닮았어… 흑흑.', '전 괜찮습니다. (방금 뭔가 터짐)'],
  },
  aila: {
    name: '에일라', title: '수줍은 마왕군 탈영병', color: '#9b5fd6',
    p1: { text: '마도 피해 +5%', fx: { cls: { mage: 0.05 } } },
    p3: { text: '먹물수염 전투에서 보스 체력 -20% (마왕군 시절 정보)', run: { morvenWeak: 0.2 } },
    quips: ['…그 배치, 진심이야?', '마왕군이라면 저 틈을 노렸을 거야.', '나쁘지 않네. 칭찬 아님.', '빨리 끝내. 간식 시간이야.'],
  },
  toto: {
    name: '토토', title: '장사꾼 너구리', color: '#7a6a5a',
    p1: { text: '처치 금화 +5%', fx: { goldMul: 0.05 } },
    p3: { text: '상점 물건 +2, 가격 -10%', run: { shopPlus: 2, shopDisc: 0.1 } },
    quips: ['이거 한정판이에요. (아님)', '용사님, 방금 그 고블린 투구 팔아도 돼요?', '전투 끝나면 할인 행사 합니다!', '토토는 응원 중! 유료 응원은 추가 요금!'],
  },
};
export const COMPANION_IDS = Object.keys(COMPANIONS);
export const PARTY_MAX = 3;
