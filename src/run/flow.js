// 런 진행 흐름: 칸 들어가기 · 끝내기 · 막 전환 · 결말
import { nodeOf, saveRun, clearRun, genMap, ACTS } from './run.js';
import { pickEvent } from './events.js';
import { store, save } from '../core/storage.js';

const guest = (app) => app.coop && app.coop.role === 'guest';

export function enterNode(app, run, id) {
  if (guest(app)) return;
  const nd = nodeOf(run, id);
  run.pos = id;
  run.inNode = { id, type: nd.type };
  if (nd.type === 'event') {
    run.inNode.eventId = pickEvent(run);
  }
  if (!run.coop) saveRun(run);
  resumeNode(app, run);
}

export function resumeNode(app, run) {
  if (guest(app)) return;
  const n = run.inNode;
  if (!n) { app.go('map', { run }); return; }
  switch (n.type) {
    case 'battle': case 'elite': case 'boss': case 'dragon':
      if (n.type === 'dragon' && !n.talked && run.party.includes('bork') && (run.bonds.bork || 0) >= 3 && !run.flags.dragonTalked) {
        app.go('event', { run, eventId: 'dragon_talk' });
        return;
      }
      app.go('battle', { run, nodeId: n.id });
      break;
    case 'event': app.go('event', { run, eventId: n.eventId }); break;
    case 'shop': app.go('shop', { run }); break;
    case 'camp': app.go('camp', { run }); break;
    case 'treasure': app.go('treasure', { run }); break;
    case 'altar': app.go('altar', { run }); break;
    default: finishNode(app, run);
  }
}

export function finishNode(app, run) {
  if (guest(app)) return;
  const n = run.inNode;
  if (n) {
    const nd = nodeOf(run, n.id);
    if (nd) nd.done = true;
    run.inNode = null;
    if (nd && nd.type === 'boss') { nextAct(app, run); return; }
  }
  if (!run.coop) saveRun(run);
  app.go('map', { run });
}

export function nextAct(app, run) {
  if (guest(app)) return;
  if (run.act >= 3) {
    if (!run.coop) saveRun(run);
    app.go('ending', { run });
    return;
  }
  run.act++;
  run.pos = null;
  run.map = genMap(run.seed, run.act);
  // 막 사이 휴식: 성벽 30% 회복
  run.carry.wall = Math.min(run.carry.wallMax, run.carry.wall + Math.round(run.carry.wallMax * 0.3));
  if (!run.coop) saveRun(run);
  app.go('actIntro', { run });
}

// 최종 보스 결정
export function finalBoss(run) {
  if (run.flags.brotherRoute) return 'shadow';
  if ((run.rep.cult || 0) >= 6 || run.flags.ashRite) return 'aspel';
  return 'crown';
}

export function endRun(run, outcome) {
  const d = store();
  if (!run.coop) clearRun();
  d.runs++;
  if (outcome !== 'defeat') d.wins++;
  d.endings = d.endings || [];
  if (outcome && !d.endings.includes(outcome)) d.endings.push(outcome);
  // 마스코트 친밀도
  d.mascotXp = d.mascotXp || {};
  const xp = (run.act - 1) * 2 + (outcome !== 'defeat' ? 4 : 1);
  const my = run.players && run.me !== undefined ? run.players[run.me].mascot : run.mascot;
  d.mascotXp[my] = (d.mascotXp[my] || 0) + xp;
  save();
  return xp;
}

export const ACT_TITLE = (a) => ACTS[a - 1];
