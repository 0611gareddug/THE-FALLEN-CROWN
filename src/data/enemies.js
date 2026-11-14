// 적 · 정예 · 보스 정의와 웨이브 생성

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
  cultist: { name: '재의 신도', hp: 1.2, spd: 42, armor: 0.1, mres: 0.3 },

  // ── 정예 ──
  shieldlord: { name: '방패 기사단장', hp: 9, spd: 26, armor: 0.6, mres: 0.1, elite: true, size: 32 },
  priestess: { name: '치유하는 무녀', hp: 6, spd: 32, armor: 0.1, mres: 0.4, elite: true, heal: [3, 0.06, 70], size: 32 },
  necro: { name: '사령술사', hp: 6.5, spd: 30, armor: 0.1, mres: 0.35, elite: true, summon: [6, 'skel', 3], size: 32 },
  wolf: { name: '질주하는 늑대인간', hp: 7, spd: 70, armor: 0.2, mres: 0.1, elite: true, enrage: 0.5, size: 32 },

  // ── 보스 (hp는 해당 지점 기본 체력의 배수) ──
  ogran: { name: '잿불 거인 오그란', hp: 30, spd: 19, armor: 0.3, mres: 0.15, boss: true, gimmick: 'roar', title: '1막 보스' },
  morven: { name: '배신의 재상 모르벤', hp: 26, spd: 22, armor: 0.15, mres: 0.45, boss: true, gimmick: 'corrupt', title: '2막 보스' },
  silvana: { name: '얼어붙은 용 실바나', hp: 22, spd: 17, armor: 0.35, mres: 0.35, boss: true, gimmick: 'freeze', title: '용의 둥지' },
  crown: { name: '무너진 왕관 그 자체', hp: 24, spd: 20, armor: 0.3, mres: 0.3, boss: true, gimmick: 'steal', title: '최종 보스' },
  aspel: { name: '재의 교주 아스펠', hp: 23, spd: 21, armor: 0.2, mres: 0.5, boss: true, gimmick: 'ashrain', title: '최종 보스' },
  shadow: { name: '형제의 그림자', hp: 21, spd: 24, armor: 0.25, mres: 0.25, boss: true, gimmick: 'split', title: '최종 보스' },
};

export const BOSS_GIMMICK_TEXT = {
  roar: '포효할 때마다 쥐떼를 부른다.',
  corrupt: '유닛을 타락시켜 공격을 멈추게 한다. 타락한 유닛을 여러 번 눌러 정화하자!',
  freeze: '보드 한 줄을 얼린다. 얼어붙은 유닛을 눌러 얼음을 깨자!',
  steal: '주기적으로 금화를 훔쳐 간다. 금화는 빨리 쓰는 게 이득!',
  ashrain: '재의 비로 아군 공격 속도를 떨어뜨리고 신도를 부른다.',
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
  ['skel', 'rat', 'bat', 'slime', 'corpse'],
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'ember', 'wraith', 'toad'],
  ['skel', 'rat', 'bat', 'slime', 'corpse', 'ember', 'wraith', 'toad', 'cultist'],
];
const ELITES = ['shieldlord', 'priestess', 'necro', 'wolf'];

// 지도 칸 하나의 전투 구성
export function makeBattle(rng, act, row, kind, boss) {
  const L0 = [1.5, 7, 12][act - 1] + row * 0.55;
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
  if (kind === 'elite') waves[nWaves - 1].push([rng.pick(ELITES), 1]);
  if (kind === 'boss') waves[nWaves - 1].push([boss, 1]);
  return { L: L0, waves, kind, boss: kind === 'boss' ? boss : null };
}
