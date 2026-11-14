// 로비 (레퍼런스: 별 하늘 · 대각선 빛줄기 · 왼쪽 정렬 세리프 제목 · ◇ 메뉴)
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
      ['함께하기', () => notice(el, 'TOGETHER', '함께하기 · 2인 협동',
        '방 코드로 친구와 함께하는 협동 모드는 <b>3단계</b>에서 열립니다.<br><br>그때까지 동료들과 왕국을 지켜주세요. 뿌루는 협동을 몹시 기대하고 있습니다. (병아리라서 잘 모름)')],
      ['연대기', () => chroniclePanel(el)],
      ['왕실 보물고', () => treasuryPanel(el)],
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
        h('div.eyebrow.rise', { style: { animationDelay: `${delay}s` } }, 'BEYOND THE ASHES'),
        h('h1.title.rise', { style: { animationDelay: `${delay + 0.15}s` } }, 'THE FALLEN CROWN'),
        h('div.subtitle.rise', { style: { animationDelay: `${delay + 0.35}s` } }, '무너진 왕관'),
        h('div.rule.rise', { style: { animationDelay: `${delay + 0.6}s` } }),
        h('ul.menu', items.map(([label, fn, sub], i) =>
          h('li.rise', { style: step(i) },
            h('button', {
              onmouseenter: () => audio.sfxPlay('hover'),
              onclick: () => { audio.resume(); audio.sfxPlay('click'); fn(); },
            }, label, sub ? h('span.soon', sub) : null)))),
      ),
      h('div.sparkle.fade', { style: { animationDelay: `${delay + 1.6}s` } }, svg(ICON.star)),
      h('div.lobby-foot.fade', { style: { animationDelay: `${delay + 1.8}s` } }, 'v0.2 · 2단계 · 로그라이크 여정'),
    );
    app.ui.appendChild(el);
    firstVisit = false;
  }

  return { enter, exit: () => el && el.remove() };
}
