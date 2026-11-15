import { ROYAL_ENDINGS, ROYAL_ENDING_ORDER } from './fate.js';
// 결말 8개
export const ENDINGS = {
  rebuild: {
    no: 1, title: '재건된 왕국', eyebrow: 'THE KINGDOM REBUILT',
    lines: [
      ['narr', '', '왕관의 저주가 흩어지자 하늘에서 재가 멎었다.'],
      ['narr', '', '왕국은 다시 세워졌다. 조금 삐뚤게. 성벽 한쪽은 아직 기워져 있다.'],
      ['@q', 'happy', '폐하, 대관식 날짜는요? …네? 아직 안 정하셨다고요?'],
      ['narr', '', '그렇게 무너진 왕관의 시대가 끝났다. 다음 시대의 이름은 아직 없다.'],
    ],
  },
  saint: {
    no: 2, title: '빛의 성왕', eyebrow: 'THE SAINT KING',
    lines: [
      ['priest', 'happy', '왕관이 정화되었습니다! 빛이, 빛이 돌아왔습니다!'],
      ['narr', '', '대성당의 종이 일주일 내내 울렸다. 이웃 왕국에서 소음 민원이 들어왔다.'],
      ['narr', '', '당신은 빛의 성왕이라 불렸다. 헌금함은 늘 가득했다. 장부도.'],
    ],
  },
  ash: {
    no: 3, title: '재의 군주', eyebrow: 'THE ASHEN LORD',
    lines: [
      ['narr', '', '당신은 왕관을 썼다. 차갑고, 무겁고, 달콤했다.'],
      ['cultist', 'happy', '재의 군주 만세! 재의 군주 만…콜록콜록.'],
      ['narr', '', '하늘에서는 영원히 재가 내린다. 백성들은 우산을 샀다. 길드가 독점 판매했다.'],
      ['narr', '', '…이것이 정말 당신이 원한 왕국인가?'],
    ],
  },
  forest: {
    no: 4, title: '숲으로 돌아간 왕', eyebrow: 'THE KING OF THE WOOD',
    lines: [
      ['chief', 'neutral', '왕관을 부쉈다고? …왕족이 그런 짓을 하다니. 마음에 드는군.'],
      ['narr', '', '부서진 왕관 조각은 숲에 묻혔다. 그 자리에서 거대한 나무가 자랐다.'],
      ['narr', '', '당신은 숲의 오두막에서 살았다. 가끔 허수아비와 상담했다.'],
    ],
  },
  republic: {
    no: 5, title: '황금의 공화국', eyebrow: 'THE GOLDEN REPUBLIC',
    lines: [
      ['guild', 'happy', '왕관 낙찰! 낙찰가는… 왕국 하나!'],
      ['narr', '', '왕관을 판 돈으로 공화국이 세워졌다. 국회의 첫 안건은 "세금 인상"이었다.'],
      ['toto', 'smug', '폐하, 아니 시민님. 수수료는 제가 챙겼어요.'],
    ],
  },
  brother: {
    no: 6, title: '형제의 화해', eyebrow: 'BROTHERS OF ASH',
    lines: [
      ['narr', '', '그림자가 흩어지자, 그 안에서 잿빛 눈의 형제가 무릎을 꿇고 있었다.'],
      ['narr', '', '"…미안해. 왕관이 속삭였어. 네가 나를 버릴 거라고."'],
      ['narr', '', '당신은 손을 내밀었다. 셋이 그려진 낡은 초상화를, 이번엔 함께 다시 그렸다.'],
      ['narr', '', '이번엔 모두 웃고 있다. 한 명은 눈을 감았지만.'],
    ],
  },
  dawn: {
    no: 7, title: '잿빛 새벽', eyebrow: 'THE ASHEN DAWN',
    lines: [
      ['narr', '', '다섯 개의 조각이 하나로 맞춰지는 순간, 왕관은 왕관이기를 그만두었다.'],
      ['bran', 'sad', '…선왕 폐하께서 하시려던 일이 이것이었군요.'],
      ['aila', 'happy', '아버지도… 이걸 보셨으면 좋았을 텐데. 칭찬이야, 이건.'],
      ['narr', '', '재가 멎은 하늘 끝에서 300년 만의 새벽이 밝아 왔다.'],
      ['narr', '', '왕도, 왕관도 없는 첫 아침. 사람들은 그냥 "좋은 아침"이라고 인사했다.'],
    ],
  },
  defeat: {
    no: 8, title: '잿더미', eyebrow: 'THE WALLS CRUMBLE',
    lines: [['narr', '', '성벽이 무너졌다. 재 위에 재가 쌓였다.']],
  },
};
Object.assign(ENDINGS, ROYAL_ENDINGS);
export const ENDING_ORDER = ['rebuild', 'saint', 'ash', 'forest', 'republic', 'brother', 'dawn', 'defeat', ...ROYAL_ENDING_ORDER];
