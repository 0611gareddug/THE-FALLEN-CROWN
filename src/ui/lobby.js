// 로비: 아침 들판 · 뭉게구름 · 멀리 마왕성 · 나무 표지판 메뉴
import { h, svg, ICON } from './dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { settingsPanel, chroniclePanel, notice, treasuryPanel } from './panels.js';
import { loadRun, clearRun } from '../run/run.js';
import { resumeNode } from '../run/flow.js';
import { ROYALS } from '../data/text.js';

function resumeRun(app, run) {
  if (run.inNode) resumeNode(app, run);
  else app.go('map', { run });
}

let firstVisit = true;

export function lobbyScene(app) {
  const st = store().settings;
  let el;

  const muteIcon = () => svg(st.music + st.sfx > 0 ? ICON.sound : ICON.mute);

  function enter() {
    app.bg.setMode('lobby');
    audio.play('lobby');
    const delay = firstVisit ? 0.2 : 0;
    const saved = loadRun();
    const items = [
      saved ? ['이어하기', () => resumeRun(app, saved), `${saved.act}막 · ${ROYALS.find((r) => r.id === saved.royal).name}`] : null,
      ['여정 시작', () => {
        if (saved) {
          notice(el, 'NEW JOURNEY', '새 여정을 시작하면 저장된 여정이 사라집니다.', '');
          const p = el.querySelector('.sheet .panel');
          p.appendChild(h('button.btn.danger', { style: { marginTop: '10px', width: '100%' }, onclick: () => { clearRun(); startNew(); } }, '저장된 여정을 버리고 시작'));
          return;
        }
        startNew();
      }],
      ['함께하기', () => app.go('coopLobby'), '2~4인 협동'],
      ['연대기', () => chroniclePanel(el)],
      ['용사단 보물창고', () => treasuryPanel(el)],
      ['설정', () => settingsPanel(el, app)],
    ].filter(Boolean);
    const startNew = () => { if (!store().prologue) app.go('prologue'); else app.go('select'); };
    const step = (i) => ({ animationDelay: `${delay + 0.9 + i * 0.1}s` });
    el = h('div.screen.lobby',
      h('div.lobby-icons.fade', { style: { animationDelay: `${delay + 1.2}s` } },
        h('button.icon-btn', {
          'aria-label': '소리 켜기/끄기',
          onclick(e) {
            if (st.music + st.sfx > 0) { st._m = st.music; st._s = st.sfx; st.music = 0; st.sfx = 0; }
            else { st.music = st._m || 0.5; st.sfx = st._s || 0.7; }
            audio.setVol(st.music, st.sfx);
            save();
            e.currentTarget.replaceChildren(muteIcon());
          },
        }, muteIcon()),
        h('button.icon-btn', {
          'aria-label': '전체 화면',
          onclick() {
            const d = document;
            if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
            else d.documentElement.requestFullscreen && d.documentElement.requestFullscreen().catch(() => {});
          },
        }, svg(ICON.full)),
      ),
      h('div.lobby-block',
        h('div.eyebrow.rise', { style: { animationDelay: `${delay}s` } }, 'TO THE DEMON CASTLE'),
        h('h1.title.rise', { style: { animationDelay: `${delay + 0.15}s` } }, 'LUCKY HEROES'),
        h('div.subtitle.rise', { style: { animationDelay: `${delay + 0.35}s` } }, '행운의 용사단'),
        h('div.rule.rise', { style: { animationDelay: `${delay + 0.6}s` } }),
        h('ul.menu', items.map(([label, fn, sub], i) =>
          h('li.rise', { style: step(i) },
            h('button', {
              onmouseenter: () => audio.sfxPlay('hover'),
              onclick: () => { audio.resume(); audio.sfxPlay('click'); fn(); },
            }, label, sub ? h('span.soon', sub) : null)))),
      ),
      h('div.sparkle.fade', { style: { animationDelay: `${delay + 1.6}s` } }, svg(ICON.star)),
      h('div.lobby-foot.fade', { style: { animationDelay: `${delay + 1.8}s` } }, 'v1.4 · 행운의 용사단'),
    );
    app.ui.appendChild(el);
    firstVisit = false;
  }

  return { enter, exit: () => el && el.remove() };
}
