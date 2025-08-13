// ---------- 유틸 ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function normalizeHex(s) {
  if (!s) return null;
  s = s.trim();
  if (s[0] === '#') s = s.slice(1);
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toUpperCase();
}
function toRgb(hex) {
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toHex({r,g,b}) {
  const h = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  return ('000000' + h.toString(16)).slice(-6).toUpperCase();
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(h1, h2, t) {
  const c1 = toRgb(h1), c2 = toRgb(h2);
  return toHex({
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  });
}
function escHtml(t){
  return t.replace(/[&<>"]/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[m]));
}
// |cffRRGGBB텍스트|r → HTML
function wowToHtml(s){
  return s.replace(/\|cff([0-9A-Fa-f]{6})([\s\S]*?)\|r/g,
           (_,hex,txt) => `\x3cspan style="color:#${hex}"\x3e${escHtml(txt)}\x3c/span\x3e`)
          .replace(/\n/g,"<br>");
}

// ---------- DOM ----------
const textInput = $('#textInput');
const startColor = $('#startColor');
const endColor = $('#endColor');
const startHex = $('#startHex');
const endHex = $('#endHex');
const quickColor = $('#quickColor');
const quickHex = $('#quickHex');
const bg = $('#bg');
const mode = $('#mode');

const wowOutput = $('#wowOutput');
const renderOut = $('#renderOut');
const wowInput = $('#wowInput');
const renderBack = $('#renderBack');
const copyBtn = $('#copyBtn');
const copyMsg = $('#copyMsg');

const gradBox = $('#gradBox');
const customBox = $('#customBox');
const charColors = $('#charColors');
const randomizeBtn = $('#randomizeBtn');
const genFromCustomBtn = $('#genFromCustomBtn');

// Preset DOM
const presetBox = $('#presetBox');
const presetSelect = $('#presetSelect');
const presetSteps = $('#presetSteps');
const genPresetBtn = $('#genPresetBtn');
const presetPreview = $('#presetPreview');

// ---------- 프리셋 예시 ----------
const PRESETS = [
  { id: 'pinkPurple',  name: '핑크→퍼플',           colors: ['FFC0CB','BA55D3'] },
  { id: 'mintBlue',    name: '민트→블루',           colors: ['3FE0C5','2E86FF'] },
  { id: 'sunset',      name: '선셋(오렌지→퍼플)',    colors: ['FF9A3C','FF2E63','8A2BE2'] },
  { id: 'pastel',      name: '파스텔(톤다운 무지개)', colors: ['FFB3BA','FFDFBA','FFFFBA','BAFFC9','BAE1FF'] },
  { id: 'rainbow',     name: '무지개',               colors: ['FF0000','FF7F00','FFFF00','00FF00','0000FF','4B0082','9400D3'] },
  { id: 'monoGray',    name: '모노(검→회)',          colors: ['222222','DDDDDD'] }
];

function initPresetOptions() {
  presetSelect.innerHTML = '';
  PRESETS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
  });
  updatePresetPreview();
}
function getPresetById(id) {
  return PRESETS.find(p => p.id === id) || PRESETS[0];
}
function makeNStepColors(waypoints, steps) {
  if (steps < 2) steps = 2;
  const result = [];
  const segs = waypoints.length - 1;
  if (segs <= 0) return Array(steps).fill(waypoints[0]);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const segPos = t * segs;
    const segIdx = Math.min(segs - 1, Math.floor(segPos));
    const localT = segPos - segIdx;
    const c1 = waypoints[segIdx];
    const c2 = waypoints[segIdx + 1];
    result.push(lerpColor(c1, c2, localT));
  }
  return result;
}
function updatePresetPreview() {
  const preset = getPresetById(presetSelect.value);
  const steps = Math.max(2, Math.min(30, Number(presetSteps.value) || 6));
  const arr = makeNStepColors(preset.colors, steps);
  presetPreview.innerHTML = '';
  arr.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'preset-swatch';
    sw.style.background = '#'+hex;
    presetPreview.appendChild(sw);
  });
}

// 입력 동기화
function bindColorPair(colorInput, hexInput){
  colorInput.addEventListener('input', () => { hexInput.value = colorInput.value.toUpperCase(); });
  hexInput.addEventListener('input', () => {
    const hex = normalizeHex(hexInput.value);
    if (hex) colorInput.value = '#' + hex;
  });
}
bindColorPair(startColor, startHex);
bindColorPair(endColor, endHex);
bindColorPair(quickColor, quickHex);

// 코드 생성
function genWowPerChar(text, startH, endH){
  const chars = Array.from(text);
  if (chars.length === 0) return '';
  const s = normalizeHex(startH); const e = normalizeHex(endH);
  if (!s || !e) return '';
  return chars.map((ch, i) => {
    const t = (chars.length === 1) ? 0 : i / (chars.length - 1);
    const hex = lerpColor(s, e, t);
    return `|cff${hex}${ch}|r`;
  }).join('');
}
function genWowSingle(text, hex){
  const h = normalizeHex(hex);
  if (!h || !text) return '';
  return `|cff${h}${text}|r`;
}
function applyRenderFromCode(code){
  wowOutput.value = code;
  renderOut.innerHTML = wowToHtml(code);
}

// 문자별 직접 지정
function buildCharEditors() {
  const chars = Array.from(textInput.value || '');
  charColors.innerHTML = '';
  chars.forEach((ch) => {
    const card = document.createElement('div');
    card.className = 'char-card';

    const symbol = document.createElement('div');
    symbol.className = 'char-symbol';
    symbol.textContent = ch || '␠';

    const right = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'row';

    const color = document.createElement('input');
    color.type = 'color';
    color.value = '#'+(normalizeHex(startHex.value) || '000000');

    const hex = document.createElement('input');
    hex.className = 'hex mono char-hex';
    hex.value = color.value.toUpperCase();

    color.addEventListener('input', () => { hex.value = color.value.toUpperCase(); });
    hex.addEventListener('input', () => {
      const h = normalizeHex(hex.value);
      if (h) color.value = '#'+h;
    });

    row.append(color, hex);
    right.append(row);
    card.append(symbol, right);
    charColors.append(card);
  });
}
function getCustomHexArray() {
  const cards = $$('.char-card');
  return cards.map(c => (normalizeHex(c.querySelector('input[type=color]').value) || '000000'));
}
function genWowPerCharCustom(text) {
  const chars = Array.from(text || '');
  if (chars.length === 0) return '';
  const hexes = getCustomHexArray();
  return chars.map((ch, i) => `|cff${hexes[i] || '000000'}${ch}|r`).join('');
}
function randomHex() {
  const n = Math.floor(Math.random()*0xFFFFFF);
  return ('#' + ('000000' + n.toString(16)).slice(-6)).toUpperCase();
}

// 프리셋
function genWowFromPresetNSteps(text, presetId, steps) {
  const chars = Array.from(text || '');
  if (chars.length === 0) return '';
  const preset = getPresetById(presetId);
  const palette = makeNStepColors(preset.colors, steps);
  return chars.map((ch, i) => {
    const idx = Math.min(palette.length - 1, Math.floor(i * palette.length / chars.length));
    const hex = palette[idx];
    return `|cff${hex}${ch}|r`;
  }).join('');
}

// 이벤트 바인딩
$('#applyBtn').addEventListener('click', () => {
  const text = textInput.value ?? '';
  if (mode.value === 'single') {
    const code = genWowSingle(text, startHex.value);
    applyRenderFromCode(code);
  } else {
    const code = genWowPerChar(text, startHex.value, endHex.value);
    applyRenderFromCode(code);
  }
});
$('#quickBtn').addEventListener('click', () => {
  const text = textInput.value ?? '';
  const code = genWowSingle(text, quickHex.value);
  applyRenderFromCode(code);
});
bg.addEventListener('input', () => { document.body.style.background = bg.value; });
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(wowOutput.value || '');
    copyMsg.textContent = '복사됨!';
    setTimeout(() => copyMsg.textContent = '', 1200);
  } catch {
    copyMsg.textContent = '복사 실패. 수동으로 복사하세요.';
  }
});
wowInput.addEventListener('input', () => {
  renderBack.innerHTML = wowToHtml(wowInput.value || '');
});

// 모드 전환
mode.addEventListener('change', () => {
  const m = mode.value;
  gradBox.style.display   = (m === 'perChar' || m === 'single') ? '' : 'none';
  customBox.style.display = (m === 'perCharCustom') ? '' : 'none';
  presetBox.style.display = (m === 'presetNSteps') ? '' : 'none';
  if (m === 'perCharCustom') buildCharEditors();
  if (m === 'presetNSteps')  updatePresetPreview();
});
textInput.addEventListener('input', () => {
  if (mode.value === 'perCharCustom') buildCharEditors();
});
randomizeBtn.addEventListener('click', () => {
  const cards = $$('.char-card');
  cards.forEach(card => {
    const color = card.querySelector('input[type=color]');
    const hex = card.querySelector('.char-hex');
    const rnd = randomHex();
    color.value = rnd;
    hex.value = rnd;
  });
});
genFromCustomBtn.addEventListener('click', () => {
  const code = genWowPerCharCustom(textInput.value);
  applyRenderFromCode(code);
});

// 프리셋 이벤트
presetSelect.addEventListener('change', updatePresetPreview);
presetSteps.addEventListener('input', updatePresetPreview);
genPresetBtn.addEventListener('click', () => {
  const steps = Math.max(2, Math.min(30, Number(presetSteps.value) || 6));
  const code = genWowFromPresetNSteps(textInput.value, presetSelect.value, steps);
  applyRenderFromCode(code);
});

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.background = bg.value;
  initPresetOptions();
  updatePresetPreview();
  applyRenderFromCode(genWowPerChar(textInput.value, '#FFC0CB', '#BA55D3'));
});
