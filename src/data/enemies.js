// 적 정의와 1단계 시험 전투(10웨이브) 구성

export const ENEMIES = {
  rat: { name: '잿빛 쥐떼', hp: 0.55, spd: 62, armor: 0, mres: 0 },
  skel: { name: '해골 병사', hp: 1, spd: 40, armor: 0.1, mres: 0 },
  corpse: { name: '갑주 시체', hp: 1.35, spd: 33, armor: 0.45, mres: 0 },
  ember: { name: '불씨 정령', hp: 1, spd: 46, armor: 0, mres: 0.45 },
  bat: { name: '박쥐 무리', hp: 0.42, spd: 56, armor: 0, mres: 0, group: 3 },
  toad: { name: '거대 두꺼비', hp: 3.4, spd: 24, armor: 0.15, mres: 0.15 },
  wraith: { name: '흐릿한 망령', hp: 0.95, spd: 44, armor: 0, mres: 0.2, phase: [5, 1.4] },
  slime: { name: '분열 점액', hp: 1.1, spd: 35, armor: 0, mres: 0, split: 2 },
  mini: { name: '작은 점액', hp: 0.35, spd: 48, armor: 0, mres: 0 },
  ogran: { name: '잿불 거인 오그란', hp: 1, spd: 19, armor: 0.3, mres: 0.15, boss: true, roar: [9, 4] },
};

export const WAVE_TIME = 20; // 적이 나오는 시간
export const REST_TIME = 8; // 다음 웨이브까지 쉬는 시간
export const BOSS_TIME = 90; // 보스 제한 시간
export const FIELD_LIMIT = 100; // 넘으면 성벽 피해

// 웨이브별 기본 체력
export const baseHp = (w) => Math.round(30 * Math.pow(1.5, w - 1));
export const BOSS_HP = 34000;

export const WAVES = [
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
export const BOSS_WAVE = 10;
