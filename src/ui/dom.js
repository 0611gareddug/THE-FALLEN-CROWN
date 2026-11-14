// 작은 DOM 헬퍼: h('div.a.b', {onclick}, ...children)
export function h(sel, props, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    kids.unshift(props);
    props = null;
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className += ' ' + v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export const svg = (inner, vb = '0 0 16 16') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', vb);
  s.innerHTML = inner;
  return s;
};

export const ICON = {
  sound: '<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 5.5c1 .8 1 4.2 0 5M13 4c2 1.8 2 6.2 0 8"/>',
  mute: '<path d="M2 6h3l4-3v10l-4-3H2z"/><path d="M11 6l4 4M15 6l-4 4"/>',
  full: '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>',
  pause: '<path d="M5 3v10M11 3v10"/>',
  star: '<path d="M8 0L9.2 6.8 16 8 9.2 9.2 8 16 6.8 9.2 0 8 6.8 6.8z" fill="#c9a85c" stroke="none"/>',
};
