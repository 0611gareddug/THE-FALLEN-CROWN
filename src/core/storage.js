// 브라우저 저장 (실패해도 게임은 정상 동작)
const KEY = 'tfc_save_v1';
const DEFAULT = () => ({
  settings: { music: 0.5, sfx: 0.7, shake: true, dmgNums: true, low: false, speed: 1 },
  seen: [],
  ash: 0,
  badLuck: 0,
  runs: 0,
  wins: 0,
  bestWave: 0,
  tips: false,
});

let data = DEFAULT();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      data = { ...DEFAULT(), ...d, settings: { ...DEFAULT().settings, ...(d.settings || {}) } };
    }
  } catch (e) { /* 저장소 사용 불가 */ }
  return data;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ }
}

export function reset() {
  data = DEFAULT();
  save();
  return data;
}

export const store = () => data;

export function markSeen(id) {
  if (!data.seen.includes(id)) {
    data.seen.push(id);
    return true;
  }
  return false;
}
