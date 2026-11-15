// 이야기 화면 공통: 긴 대사를 한두 문장씩 나누고, 말하는 사람 이름표 색을 정한다
import { COMPANIONS } from '../data/companions.js';
import { CAST } from '../gfx/art2.js';

const MAX = 46; // 한 장에 들어가는 글자 수(대략 두 줄)

// 문장 끝(. ! ? … 」 ") 뒤의 공백에서 나눈 뒤, 짧은 문장끼리는 다시 붙인다
export function splitText(text) {
  if (!text || text.length <= MAX) return [text];
  const parts = text.split(/(?<=[.!?…~][)'"」’”]?)\s+/).filter(Boolean);
  if (parts.length < 2) return [text];
  const out = [];
  let cur = '';
  // 따옴표가 열린 채로는 끊지 않는다 ("…" · '…' · 「…」)
  const open = (t) => ((t.match(/["“”]/g) || []).length % 2 === 1) || ((t.match(/'/g) || []).length % 2 === 1) || (t.split('「').length !== t.split('」').length);
  for (const s of parts) {
    if (cur && !open(cur) && (cur + ' ' + s).length > MAX) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
  }
  if (cur) out.push(cur);
  return out;
}

// [[who, face, text]] → 나눈 줄 목록 (같은 사람 · 같은 표정을 이어 간다)
export function expandLines(lines) {
  const out = [];
  for (const l of lines) for (const t of splitText(l[2])) out.push([l[0], l[1], t]);
  return out;
}

// 이름표 색: 동료는 고유색, 용사는 금색, 그 밖의 인물은 기본 양피지색
export function tagColor(who, run) {
  if (COMPANIONS[who] && COMPANIONS[who].color) return COMPANIONS[who].color;
  if (run && (who === run.royal || (run.players || []).some((p) => p.royal === who))) return '#ffd36b';
  return '#e9d9a8';
}

// 이름표 · 카드 모양을 한 번에 맞춘다
export function setTag(nameEl, cardEl, who, run, label) {
  const c = CAST[who];
  const name = label != null ? label : c ? c.name : '';
  nameEl.textContent = name;
  nameEl.style.setProperty('--tagc', tagColor(who, run));
  nameEl.classList.toggle('none', !name);
  cardEl.classList.toggle('narr', !c && label == null);
}
