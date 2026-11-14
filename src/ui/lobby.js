// 로비 (레퍼런스: 별 하늘 · 대각선 빛줄기 · 왼쪽 정렬 세리프 제목 · ◇ 메뉴)
import { h, svg, ICON } from './dom.js';
import { audio } from '../core/audio.js';
import { store, save } from '../core/storage.js';
import { settingsPanel, chroniclePanel, notice } from './panels.js';

let firstVisit = true;

export function lobbyScene(app) {
  const st = store().settings;
  let el;

  const muteIcon = () => svg(st.music + st.sfx > 0 ? ICON.sound : ICON.mute);

  function enter() {
    app.bg.setMode('lobby');
    audio.play('lobby');
    const delay = firstVisit ? 0.2 : 0;
    const items = [
      ['여정 시작', () => app.go('select')],
      ['함께하기', () => notice(el, 'TOGETHER', '함께하기 · 2인 협동',
        '방 코드로 친구와 함께하는 협동 모드는 <b>3단계</b>에서 열립니다.<br><br>그때까지 뿌루와 단둘이 왕국을 지켜주세요. 뿌루는 협동을 몹시 기대하고 있습니다. (병아리라서 잘 모름)')],
      ['연대기', () => chroniclePanel(el)],
      ['왕실 보물고', () => notice(el, 'TREASURY', `왕실 보물고 · 잿빛 조각 ${store().ash}개`,
        '보물고는 <b>2단계</b>에서 문을 엽니다.<br><br>현재 보물고 안에는 거미줄과 빈 상자, 그리고 "외상 장부"라고 적힌 책 한 권뿐입니다. 판을 끝낼 때마다 잿빛 조각은 차곡차곡 쌓이고 있으니 안심하세요.')],
      ['설정', () => settingsPanel(el, app)],
    ];
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
        h('ul.menu', items.map(([label, fn], i) =>
          h('li.rise', { style: step(i) },
            h('button', {
              onmouseenter: () => audio.sfxPlay('hover'),
              onclick: () => { audio.resume(); audio.sfxPlay('click'); fn(); },
            }, label)))),
      ),
      h('div.sparkle.fade', { style: { animationDelay: `${delay + 1.6}s` } }, svg(ICON.star)),
      h('div.lobby-foot.fade', { style: { animationDelay: `${delay + 1.8}s` } }, 'v0.1 · 1단계 미리보기'),
    );
    app.ui.appendChild(el);
    firstVisit = false;
  }

  return { enter, exit: () => el && el.remove() };
}
