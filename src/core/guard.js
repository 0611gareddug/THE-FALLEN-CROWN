// 개발자 도구 접근 억제 (완벽한 차단은 불가능 — 일반 사용자 억제용)
export function installGuard(onOpen, onClose) {
  const block = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if (k === 'f12') return block(e);
    if (ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c' || k === 'k')) return block(e);
    if (ctrl && e.altKey && (k === 'i' || k === 'j' || k === 'c')) return block(e);
    if (ctrl && (k === 'u' || k === 's' || k === 'p')) return block(e);
  }, true);
  window.addEventListener('contextmenu', block, true);
  window.addEventListener('dragstart', block, true);
  window.addEventListener('selectstart', (e) => {
    const t = e.target;
    if (!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) block(e);
  }, true);

  // 열림 감지: 도킹된 개발자 도구로 인한 창 크기 차이
  let open = false;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const check = () => {
    if (coarse || document.fullscreenElement) return;
    // 확대/축소 시에는 가로·세로 차이가 함께 커지므로, 한쪽만 크게 벌어질 때만 감지한다.
    const dw = window.outerWidth - window.innerWidth;
    const dh = window.outerHeight - window.innerHeight - 130;
    const side = dw > 200 && dw > 2.5 * Math.max(0, dh);
    const bottom = dh > 200 && dh > 2.5 * Math.max(0, dw);
    const now = side || bottom;
    if (now !== open) {
      open = now;
      if (open) onOpen(); else onClose();
    }
  };
  setInterval(check, 1000);
}
