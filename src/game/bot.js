// 간단한 전투 AI: 협동 중 동료가 나갔을 때 그 보드를 대신 맡는다 (밸런스 봇과 공용)
import { RECIPES } from '../data/units.js';

export function botTick(b, t) {
  if (b.result) return;
  const b0 = b.cur * 18;
  for (let i = b0; i < b0 + 18; i++) if (b.mergeable[i] && b.merge(i)) return;
  for (let r = 0; r < RECIPES.length; r++) if (b.craft(r)) return;
  if (b.badLuck >= 10) b.pity();
  for (let i = b0; i < b0 + 18; i++) { const u = b.units[i]; if (u && (u.corrupt > 0 || u.ice > 0)) b.cleanse(i); }
  if (b.stones >= 2 && b.hasEmpty() && t > 20) b.gamble(b.stones >= 4 ? 1 : 0);
  if (b.hasEmpty()) { if (b.gold >= b.summonCost()) b.summon(); }
  else {
    const g = b.upg[0] <= b.upg[1] ? 0 : 1;
    if (b.gold >= b.upgradeCost(g)) b.upgrade(g);
    else if (b.gold >= b.upgradeCost(2) && b.upg[2] < b.upg[1]) b.upgrade(2);
    else {
      let worst = -1;
      for (let i = b0; i < b0 + 18; i++) { const u = b.units[i]; if (u && u.def.tier === 0 && !b.mergeable[i]) { worst = i; break; } }
      if (worst >= 0 && b.gold < b.summonCost()) b.sell(worst);
    }
  }
  if (b.gold > 300) { const g = [0, 1, 2].sort((x, y) => b.upg[x] - b.upg[y])[0]; b.upgrade(g); }
  b.skill();
}
