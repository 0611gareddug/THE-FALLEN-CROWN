// 적 · 정예 · 보스 정의와 웨이브 생성

export const ENEMIES = {
  rat: { name: '들쥐 졸개', hp: 0.55, spd: 62, armor: 0, mres: 0 },
  skel: { name: '꼬마 고블린', hp: 1, spd: 40, armor: 0.1, mres: 0 },
  corpse: { name: '갑옷 고블린', hp: 1.35, spd: 33, armor: 0.45, mres: 0 },
  ember: { name: '심술 불꽃', hp: 1, spd: 46, armor: 0, mres: 0.45 },
  bat: { name: '장난 박쥐 떼', hp: 0.42, spd: 56, armor: 0, mres: 0, group: 3 },
  toad: { name: '뚱보 두꺼비', hp: 3.4, spd: 24, armor: 0.15, mres: 0.15 },
  wraith: { name: '장난꾸러기 유령', hp: 0.95, spd: 44, armor: 0, mres: 0.2, phase: [5, 1.4] },
  slime: { name: '분열 슬라임', hp: 1.1, spd: 35, armor: 0, mres: 0, split: 2 },
  mini: { name: '아기 슬라임', hp: 0.35, spd: 48, armor: 0, mres: 0 },
  cultist: { name: '마왕군 꼬마 마법사', hp: 1.2, spd: 42, armor: 0.1, mres: 0.3 },
  // ── 새 일반 적 (막마다 2종) ──
  shellsnail: { name: '껍데기 달팽이', hp: 1.5, spd: 22, armor: 0.55, mres: 0, desc: '껍데기가 단단하다. 마법으로 녹이자.' },
  bunny: { name: '깡충 토끼 졸개', hp: 0.55, spd: 78, armor: 0, mres: 0, desc: '아주 빠르다. 사거리 긴 유닛으로 잡자.' },
  crab: { name: '집게 꽃게', hp: 1.4, spd: 32, armor: 0.4, mres: 0.1, desc: '단단한 등딱지.' },
  jelly: { name: '말랑 해파리', hp: 1.0, spd: 38, armor: 0, mres: 0.4, regen: 0.04, desc: '체력이 계속 차오른다. 한 번에 몰아치자.' },
  cloudling: { name: '먹구름 꼬마', hp: 0.85, spd: 50, armor: 0, mres: 0.25, phase: [4, 1.3], desc: '가끔 구름 속에 숨어 보이지 않는다.' },
  golem: { name: '이끼 돌골렘', hp: 3.8, spd: 19, armor: 0.5, mres: 0.2, desc: '느리고 아주 단단하다.' },
  imp: { name: '꼬마 악마', hp: 0.7, spd: 60, armor: 0, mres: 0.25, group: 2, desc: '둘씩 붙어 다니며 빠르다.' },
  darkknight: { name: '마왕군 흑기사', hp: 2.4, spd: 30, armor: 0.45, mres: 0.3, guard: [6, 1.5], desc: '6초마다 1.5초 동안 방패를 들어 모든 피해를 막는다.' },

  // ── 정예 ──
  shieldlord: { name: '고블린 방패대장', hp: 9, spd: 26, armor: 0.6, mres: 0.1, elite: true, size: 32 },
  priestess: { name: '치유하는 마녀', hp: 6, spd: 32, armor: 0.1, mres: 0.4, elite: true, heal: [3, 0.06, 70], size: 32 },
  necro: { name: '고블린 주술사', hp: 6.5, spd: 30, armor: 0.1, mres: 0.35, elite: true, summon: [6, 'skel', 3], size: 32 },
  wolf: { name: '질주하는 늑대 기사', hp: 7, spd: 70, armor: 0.2, mres: 0.1, elite: true, enrage: 0.5, size: 32 },
  boar: { name: '돌진 멧돼지 대장', hp: 8, spd: 28, armor: 0.3, mres: 0.05, elite: true, charge: [6, 70], size: 32, desc: '6초마다 앞으로 크게 돌진한다.' },
  slimeking: { name: '왕방울 슬라임', hp: 8, spd: 24, armor: 0.1, mres: 0.1, elite: true, split: 4, splitType: 'slime', size: 32, desc: '쓰러지면 분열 슬라임 4마리로 갈라진다.' },
  stormshaman: { name: '구름 주술사', hp: 6.5, spd: 32, armor: 0.1, mres: 0.4, elite: true, haste: [5, 2.5, 70], size: 32, desc: '5초마다 주변 적을 2.5초 동안 빠르게 만든다.' },
  warder: { name: '마왕군 결계사', hp: 7, spd: 28, armor: 0.2, mres: 0.45, elite: true, ward: [7, 1.6, 70], size: 32, desc: '7초마다 주변 적에게 1.6초 동안 무적 결계를 씌운다.' },

  // ── 보스 (hp는 해당 지점 기본 체력의 배수) ──
  ogran: { name: '슬라임왕 퐁퐁', hp: 30, spd: 19, armor: 0.3, mres: 0.15, boss: true, gimmick: 'roar', title: '1막 보스 · 풀숲' },
  morven: { name: '문어 해적선장 먹물수염', hp: 26, spd: 22, armor: 0.15, mres: 0.45, boss: true, gimmick: 'corrupt', title: '2막 보스 · 해변 마을' },
  griffin: { name: '천둥 그리핀', hp: 24, spd: 24, armor: 0.25, mres: 0.3, boss: true, gimmick: 'thunder', title: '3막 보스 · 구름 산' },
  silvana: { name: '얼어붙은 용 실바나', hp: 22, spd: 17, armor: 0.35, mres: 0.35, boss: true, gimmick: 'freeze', title: '마왕성 · 용의 둥지' },
  // 최종 보스: 마왕 녹스. 체력이 다하면 진정한 모습으로 변신한다 (2단계)
  crown: { name: '마왕 녹스', hp: 12, spd: 20, armor: 0.3, mres: 0.3, boss: true, gimmick: 'steal', title: '최종 보스 · 마왕성', phase2: 'crown2' },
  crown2: { name: '진정한 마왕 녹스', hp: 13, spd: 24, armor: 0.35, mres: 0.35, boss: true, gimmick: 'ashrain', title: '최종 보스 · 2단계' },
  aspel: { name: '어둠에 물든 마왕 녹스', hp: 12, spd: 21, armor: 0.2, mres: 0.5, boss: true, gimmick: 'ashrain', title: '최종 보스 · 마왕성', phase2: 'crown2' },
  shadow: { name: '마왕의 그림자', hp: 18, spd: 24, armor: 0.25, mres: 0.25, boss: true, gimmick: 'split', title: '최종 보스 · 마왕성' },
};

export const BOSS_GIMMICK_TEXT = {
  roar: '출렁일 때마다 졸개들을 우르르 부른다.',
  corrupt: '먹물을 뿌려 유닛을 멈추게 한다. 먹물 묻은 유닛을 여러 번 눌러 닦아 주자!',
  thunder: '번개로 보드 한 줄을 마비시킨다. 마비된 유닛을 눌러 깨워 주자!',
  freeze: '보드 한 줄을 얼린다. 얼어붙은 유닛을 눌러 얼음을 깨자!',
  steal: '주기적으로 금화를 빼앗아 간다. 금화는 빨리 쓰는 게 이득! 쓰러뜨리면 진정한 모습을 드러낸다.',
  ashrain: '어둠의 비로 아군 공격 속도를 떨어뜨리고 졸개를 부른다.',
  split: '체력이 줄면 그림자로 분열한다. 분신이 살아 있는 동안 본체는 무적.',
};

export const WAVE_TIME = 20;
export const REST_TIME = 8;
export const BOSS_TIME = 90;
export const FIELD_LIMIT = 100;
export const LEFTOVER_TIME = 40; // 마지막 웨이브 후 남은 적이 도망치기까지

// 난이도 지수 L → 기본 체력
// 10까지는 1.5배씩, 그 뒤로는 1.22배씩 (여정 후반이 폭발하지 않도록)
export const hpAt = (L) => Math.round(L <= 10 ? 30 * Math.pow(1.5, L - 1) : 1153 * Math.pow(1.28, L - 10));
// 1단계 시험 전투 호환
export const baseHp = (w) => hpAt(w);
export const BOSS_HP = 34000;

export const TRIAL_WAVES = [
  [['skel', 18]],
  [['skel', 14], ['rat', 12]],
  [['skel', 12], ['bat', 6]],
  [['corpse', 10], ['skel', 14]],
  [['toad', 4], ['rat', 16], ['ember', 8]],
  [['wraith', 12], ['skel', 16], ['bat', 5]],
  [['slime', 14], ['corpse', 12], ['rat', 8]],
  [['ember', 16], ['corpse', 12], ['toad', 5]],
  [['wraith', 14], ['slime', 12], ['rat', 16], ['toad', 4]],
  [['ogran', 1], ['skel', 16], ['bat', 4]],
];
// 하위 호환 이름
export const WAVES = TRIAL_WAVES;
export const BOSS_WAVE = 10;

const POOL = [
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'shellsnail', 'bunny'],
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'ember', 'toad', 'crab', 'jelly'],
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'ember', 'wraith', 'toad', 'cloudling', 'golem', 'jelly'],
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'ember', 'wraith', 'toad', 'cultist', 'imp', 'darkknight', 'golem'],
];
// 막마다 나올 수 있는 정예 (새 정예는 그 막부터)
const ELITES = [
  ['shieldlord', 'priestess', 'necro', 'wolf', 'boar'],
  ['shieldlord', 'priestess', 'necro', 'wolf', 'boar', 'slimeking'],
  ['shieldlord', 'priestess', 'necro', 'wolf', 'slimeking', 'stormshaman'],
  ['shieldlord', 'priestess', 'necro', 'wolf', 'stormshaman', 'warder'],
];

// 지도 칸 하나의 전투 구성
export function makeBattle(rng, act, row, kind, boss) {
  const L0 = [1.5, 6.5, 12, 18.2][act - 1] + row * 0.55;
  const pool = POOL[act - 1];
  const nWaves = kind === 'boss' ? 3 : kind === 'elite' ? 5 : row < 3 && act === 1 ? 3 : 4;
  const waves = [];
  for (let w = 0; w < nWaves; w++) {
    const total = Math.round((19 + act * 3 + w * 3) * (kind === 'elite' ? 1.1 : 1));
    const kinds = rng.shuffle(pool.slice()).slice(0, w === 0 ? 1 : 2 + (act > 1 ? 1 : 0));
    const list = [];
    let left = total;
    kinds.forEach((k, i) => {
      const def = ENEMIES[k];
      let n = i === kinds.length - 1 ? left : Math.round(total / kinds.length);
      if (def.hp >= 3) n = Math.max(2, Math.round(n / 3));
      if (def.group) n = Math.max(2, Math.round(n / def.group));
      left -= n;
      if (n > 0) list.push([k, n]);
    });
    waves.push(list);
  }
  if (kind === 'elite') waves[nWaves - 1].push([rng.pick(ELITES[act - 1]), 1]);
  if (kind === 'boss') waves[nWaves - 1].push([boss, 1]);
  return { L: L0, waves, kind, boss: kind === 'boss' ? boss : null };
}
