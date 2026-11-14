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

const RAINBOW = ['#ff6b6b', '#ffb36b', '#ffe36b', '#7fe08a', '#6bc8ff', '#c99bff'];

load();
const st = store().settings;
audio.setVol(st.music, st.sfx);
buildSprites([...TIERS.slice(0, 5).map((t) => t.color), ...RAINBOW]);

const stage = document.getElementById('stage');
const app = {
  ui: document.getElementById('ui'),
  gameCv: document.getElementById('game'),
  bg: new Background(document.getElementById('bg'), st),
  scale: 1,
  scene: null,
  pauseHook: null,
  go(name, params) {
    if (app.scene) app.scene.exit();
    app.ui.replaceChildren();
    const make = { lobby: lobbyScene, select: selectScene, battle: battleScene }[name];
    app.scene = make(app, params || {});
    app.scene.enter();
  },
  applyQuality() {
    app.bg.resize();
    if (app.scene && app.scene.resize) app.scene.resize();
  },
};

function fit() {
  const f = Math.min(innerWidth / 360, innerHeight / 640);
  app.scale = f;
  stage.style.transform = `translate(-50%, -50%) scale(${f})`;
  app.bg.resize();
  if (app.scene && app.scene.resize) app.scene.resize();
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
  if (app.scene && app.scene.frame) app.scene.frame(dt);
}

if (import.meta.env.DEV) window.__tfc = app;

const start = () => { app.go('lobby'); requestAnimationFrame(loop); };
// 글꼴이 준비되면 시작 (최대 1.5초 대기)
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).then(start);
