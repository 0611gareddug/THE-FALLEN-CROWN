import './ui/style.css';
import { load, store } from './core/storage.js';
import { audio } from './core/audio.js';
import { installGuard } from './core/guard.js';
import { Background } from './gfx/bg.js';
import { buildSprites } from './gfx/sprites.js';
import { TIERS } from './data/units.js';
import { lobbyScene } from './ui/lobby.js';
import { selectScene } from './ui/select.js';
import { battleScene } from './game/scene.js';
import { mapScene } from './run/mapScene.js';
import { eventScene } from './run/eventScene.js';
import { shopScene, campScene, treasureScene, altarScene, rewardScene, actIntroScene, endingScene } from './run/nodeScenes.js';
import { prologueScene } from './run/prologue.js';
import { coopLobbyScene, coopSelectScene } from './net/coopUI.js';
import { onAchievement, unlockAch } from './meta/achievements.js';
import { achQueue } from './run/events.js';
import { watchChoices } from './ui/dom.js';

const RAINBOW = ['#ff6b6b', '#ffb36b', '#ffe36b', '#7fe08a', '#6bc8ff', '#c99bff'];

load();
const st = store().settings;
audio.setVol(st.music, st.sfx);
buildSprites([...TIERS.slice(0, 5).map((t) => t.color), ...RAINBOW]);

const stage = document.getElementById('stage');
watchChoices(document.getElementById('ui'));
const app = {
  ui: document.getElementById('ui'),
  gameCv: document.getElementById('game'),
  bg: new Background(document.getElementById('bg'), st),
  scale: 1,
  land: null,
  scene: null,
  pauseHook: null,
  go(name, params) {
    if (app.scene) app.scene.exit();
    app.ui.replaceChildren();
    const make = {
      lobby: lobbyScene, select: selectScene, battle: battleScene, map: mapScene, event: eventScene,
      shop: shopScene, camp: campScene, treasure: treasureScene, altar: altarScene, reward: rewardScene,
      actIntro: actIntroScene, ending: endingScene, prologue: prologueScene,
      coopLobby: coopLobbyScene, coopSelect: coopSelectScene,
    }[name];
    app.scene = make(app, params || {});
    app.scene.enter();
  },
  applyQuality() {
    app.bg.resize();
    if (app.scene && app.scene.resize) app.scene.resize();
  },
};

// PC처럼 가로로 넓은 화면은 960×540 가로 배치, 그 외는 360×640 세로 배치
const coarse = matchMedia('(pointer: coarse)').matches;
function fit() {
  const land = innerWidth / innerHeight >= 1.2 && !(coarse && innerHeight < 500);
  const changed = land !== app.land;
  app.land = land;
  document.body.classList.toggle('land', land);
  const [sw, sh] = land ? [960, 540] : [360, 640];
  const f = Math.min(innerWidth / sw, innerHeight / sh);
  app.scale = f;
  stage.style.transform = `translate(-50%, -50%) scale(${f})`;
  app.bg.resize();
  if (app.scene && app.scene.resize) app.scene.resize(changed);
}
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 80); });
fit();

// 첫 입력에 오디오 활성화 (브라우저 정책)
const unlock = () => { audio.resume(); };
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });

// 탭이 숨겨지면 멈춘다
let hidden = false;
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden;
  if (hidden) { audio.suspend(); if (app.pauseHook) app.pauseHook(); }
  else audio.resume();
});

if (import.meta.env.PROD) {
  const g = document.getElementById('guard');
  installGuard(
    () => { g.style.display = 'flex'; if (app.pauseHook) app.pauseHook(); audio.suspend(); },
    () => { g.style.display = 'none'; audio.resume(); },
  );
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  if (hidden) return;
  if (dt > 0.1) dt = 0.1;
  app.bg.frame(dt);
  while (achQueue.length) unlockAch(achQueue.shift());
  if (app.scene && app.scene.frame) app.scene.frame(dt);
}

if (import.meta.env.DEV) window.__tfc = app;

// 업적 알림
onAchievement((a) => {
  audio.sfxPlay('win');
  const n = document.createElement('div');
  n.className = 'ach-pop';
  n.innerHTML = `<small>업적 달성</small><b></b><span></span>`;
  n.querySelector('b').textContent = a.name;
  n.querySelector('span').textContent = `${a.desc} · 별가루 +${a.ash}`;
  stage.appendChild(n);
  setTimeout(() => n.remove(), 3600);
});

const start = () => { app.go('lobby'); requestAnimationFrame(loop); };
// 글꼴이 준비되면 시작 (최대 1.5초 대기)
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(start);
