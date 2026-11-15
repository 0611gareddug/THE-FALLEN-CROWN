import { ROYAL_ENDINGS, ROYAL_ENDING_ORDER } from './fate.js';
// 결말 8개
export const ENDINGS = {
  rebuild: {
    no: 1, title: '평화로운 들판', eyebrow: 'BACK TO THE MEADOW',
    lines: [
      ['narr', '', '마왕 녹스가 쓰러지자 보랏빛 구름이 걷히고, 들판에 다시 햇살이 쏟아졌다.'],
      ['narr', '', '용사단은 마을로 돌아왔다. 조금 그을렸고, 많이 배고팠다.'],
      ['@q', 'happy', '용사님, 잔치 날짜는요? …네? 아직 안 정하셨다고요?'],
      ['narr', '', '그날 밤 마을 광장에서 잔치가 열렸다. 뿌루가 제일 많이 먹었다.'],
    ],
  },
  saint: {
    no: 2, title: '구름 위의 성자', eyebrow: 'THE SAINT OF THE CLOUDS',
    lines: [
      ['priest', 'happy', '마왕의 힘이 구름 종 안에 봉인되었습니다! 이제 천 년은 조용할 거예요!'],
      ['narr', '', '구름 수도원의 종이 일주일 내내 울렸다. 아랫마을에서 소음 민원이 들어왔다.'],
      ['narr', '', '용사단은 "구름 위의 성자"라 불렸다. 수도원 헌금함은 늘 가득했다. 장부도.'],
    ],
  },
  ash: {
    no: 3, title: '요정 나라의 왕', eyebrow: 'KING OF THE FAIRIES',
    lines: [
      ['cultist', 'happy', '마왕성을 꽃밭으로 바꿨다! 이제 여기는 우리 놀이터야! 용사가 왕이야!'],
      ['narr', '', '마왕성 지붕에 데이지가 피었다. 탑마다 그네가 달렸다.'],
      ['narr', '', '요정의 왕이 된 용사는 매일 장난에 시달렸다. 왕관은 꽃으로 엮은 것이었다. 가끔 벌이 날아왔다.'],
      ['narr', '', '…이것이 정말 원하던 왕국이었을까? 아무튼 재밌긴 했다.'],
    ],
  },
  forest: {
    no: 4, title: '숲으로 돌아간 용사', eyebrow: 'THE HERO OF THE WOOD',
    lines: [
      ['chief', 'neutral', '마왕성을 숲에 돌려줬다고? …사람이 그런 일을 하다니. 마음에 드는군.'],
      ['narr', '', '무너진 마왕성 자리에 도토리가 심어졌다. 몇 년 뒤, 거대한 나무가 자랐다.'],
      ['narr', '', '용사는 숲 동물 마을의 오두막에서 살았다. 가끔 허수아비와 상담했다.'],
    ],
  },
  republic: {
    no: 5, title: '황금 항구', eyebrow: 'THE GOLDEN HARBOR',
    lines: [
      ['guild', 'happy', '마왕성 관광 상품 출시! 입장료는 금화 열 닢! 기념품은 별도!'],
      ['narr', '', '마왕성은 이 세계 최고의 관광지가 되었다. 첫 번째 회의 안건은 "입장료 인상"이었다.'],
      ['toto', 'smug', '용사님, 기념품 가게 수수료는 제가 챙겼어요.'],
    ],
  },
  brother: {
    no: 6, title: '소꿉친구의 귀환', eyebrow: 'A FRIEND COMES HOME',
    lines: [
      ['narr', '', '그림자가 흩어지자, 그 안에서 보랏빛 눈의 소년이 무릎을 꿇고 있었다. 노아였다.'],
      ['narr', '', '"…미안해. 마왕이 속삭였어. 너희가 나를 잊었을 거라고."'],
      ['narr', '', '용사단은 손을 내밀었다. 마을 회관에 걸린 낡은 그림을, 이번엔 넷이서 다시 그렸다.'],
      ['narr', '', '이번엔 모두 웃고 있다. 뿌루는 그림 밖으로 삐져나왔지만.'],
    ],
  },
  dawn: {
    no: 7, title: '무지개 다리', eyebrow: 'THE RAINBOW BRIDGE',
    lines: [
      ['narr', '', '다섯 개의 무지개 조각이 하나로 맞춰지는 순간, 하늘에 무지개 다리가 놓였다.'],
      ['bran', 'sad', '…40년 전 우리가 하지 못한 일을, 자네들이 해냈군.'],
      ['aila', 'happy', '마왕의 저주가… 녹고 있어. 칭찬이야, 이건. 진짜로.'],
      ['narr', '', '무지개 다리 끝에서 천 년 만의 진짜 아침이 밝아 왔다.'],
      ['narr', '', '마왕도, 저주도 없는 첫 아침. 사람들은 그냥 "좋은 아침"이라고 인사했다.'],
    ],
  },
  defeat: {
    no: 8, title: '넘어진 용사단', eyebrow: 'THE WALLS CRUMBLE',
    lines: [['narr', '', '성벽이 무너졌다. 용사단은 일단 집에 가서 낮잠을 자기로 했다. 다시 일어나면 된다.']],
  },
};
Object.assign(ENDINGS, ROYAL_ENDINGS);
export const ENDING_ORDER = ['rebuild', 'saint', 'ash', 'forest', 'republic', 'brother', 'dawn', 'defeat', ...ROYAL_ENDING_ORDER];
