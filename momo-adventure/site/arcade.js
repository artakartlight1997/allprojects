// むかしの ゲームセンターの ゲームを もとに した 5本で つかう 共通どうぐ。
//
// ★ これまで 直して きた「気もちよさ」を ぜんぶ ここに 入れて ある。
//   ・たてに 持った スマホでは 中みを 90度 まわして 画面いっぱいに つかう
//   ・スティックは ゆびを 置いた ところに 出る（きまった 場所を ねらわない）
//   ・ボタンは じっさいの 大きさ（CSS ピクセル）で きめる
//   ・音は ファイルを つかわず その場で 作る
//
// ★ つかいかた（ゲームがわ）
//     <script src="/allprojects/arcade.js?v=1"></script>
//     …data.js / game.js / ui.js…
//     さいごに arcadeStart({ update: fn, draw: fn })
//
// ★ 絵は ぜんぶ その場で 描く。画像ファイルは 1まいも つかわない。

'use strict';

// --- 画面 -------------------------------------------------------------------------

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let VH = 450;
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, VOB = 0, DPR = 1, ROT = false;
const VW_MIN = 720;

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  const sN = Math.min(H / VH, W / VW_MIN);   // まわさない ときの 縮尺
  const sR = Math.min(W / VH, H / VW_MIN);   // まわした ときの 縮尺
  ROT = sR > sN * 1.15;
  SC = ROT ? sR : sN;

  VW = (ROT ? H : W) / SC;
  const extra = Math.max(0, (ROT ? W : H) / SC - VH);
  VOY = extra / 2;
  VOB = extra - VOY;

  if (ROT) ctx.setTransform(0, DPR * SC, -DPR * SC, 0, Math.round(DPR * (W - VOY * SC)), 0);
  else ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));

  document.documentElement.setAttribute('data-game-rot', ROT ? '1' : '0');
}

function toV(px, py) {
  if (ROT) return { x: py / SC, y: (W - px) / SC - VOY };
  return { x: px / SC, y: py / SC - VOY };
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// --- かたち ------------------------------------------------------------------------

function rr(x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function fitSize(text, maxW, start) {
  let fs = start;
  for (let i = 0; i < 22; i++) {
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 8) break;
    fs = Math.max(8, Math.floor(fs * 0.92));
  }
  return fs;
}
function bigText(s, x, y, size, col, shadow, align) {
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  if (shadow !== null) {
    ctx.fillStyle = shadow || 'rgba(0,0,0,0.42)';
    ctx.fillText(s, x + Math.max(1, size * 0.06), y + Math.max(1, size * 0.07));
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}
function bgGrad(a, b) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
}

// --- ボタン ------------------------------------------------------------------------

const ui = { buttons: [] };

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
  ui.buttons.push(b); return b;
}
function drawButton(b, label, col, textCol) {
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  rr(b.x + 3, b.y + 4, b.w, b.h, b.h * 0.28); ctx.fill();
  ctx.fillStyle = col || '#FFD24A';
  rr(b.x, b.y, b.w, b.h, b.h * 0.28); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  rr(b.x, b.y, b.w, b.h * 0.42, b.h * 0.22); ctx.fill();
  const fs = fitSize(label, b.w * 0.86, Math.round(b.h * 0.44));
  bigText(label, b.x + b.w / 2, b.y + b.h / 2, fs, textCol || '#241C34', null);
}
function hitBtn(px, py) {
  const p = toV(px, py);
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}

// --- そうさ ------------------------------------------------------------------------
//
// ★ 左がわ … スティック（ゆびを 置いた ところが まん中に なる）
//   右がわ … わざボタン（どこを おしても きく）
//   ゲームに よっては zone を 'all' に して 画面ぜんぶを スティックに できる。

const IN = {
  zone: 'split',      // 'split' | 'all' | 'tap'
  dir: '',            // 'l' 'r' 'u' 'd'
  ax: 0, ay: 0,       // -1..1 の かたむき
  hold: false,        // スティックを にぎって いるか
  x: 0, y: 0,         // ゆびの ばしょ（かそう画面）
  taps: [],           // この コマに あった タップ（かそう画面）
  fire: false,        // わざボタンを おして いる
  fireTap: false,     // わざボタンを おした しゅんかん
  cx: 0, cy: 0,       // スティックの まん中
  on: false, id: null,
  seen: false,
  released: false,   // はなした しゅんかん（1コマだけ true）
  moved: 0,          // にぎってから いちばん 動いた きょり
};
const STICK_R = 74, STICK_DEAD = 15;
function stickR() { return STICK_R / SC; }
function stickHome() { return { x: VW * 0.16, y: VH * 0.68 }; }
function fireHome() { return { x: VW - 82, y: VH * 0.70 }; }

let firePtr = null;

function inStickZone(v) {
  if (IN.zone === 'all') return true;
  if (IN.zone === 'tap') return false;
  return v.x < VW * 0.52;
}
function inFireZone(v) {
  if (IN.zone !== 'split') return false;
  return v.x >= VW * 0.52;
}

function stickGrab(v) {
  IN.seen = true; IN.on = true;
  IN.cx = v.x; IN.cy = v.y;
  IN.ax = 0; IN.ay = 0; IN.dir = ''; IN.hold = true; IN.moved = 0;
}
function stickMove(v) {
  const r = stickR(), dead = STICK_DEAD / SC;
  let ax = v.x - IN.cx, ay = v.y - IN.cy;
  const len = Math.hypot(ax, ay);
  if (len > r) {                       // はしまで 行ったら まん中も ついていく
    IN.cx += (len - r) * ax / len;
    IN.cy += (len - r) * ay / len;
    ax = v.x - IN.cx; ay = v.y - IN.cy;
  }
  IN.ax = clamp(ax / r, -1, 1); IN.ay = clamp(ay / r, -1, 1);
  IN.moved = Math.max(IN.moved, Math.hypot(ax, ay));
  if (Math.hypot(ax, ay) < dead) { IN.dir = ''; return; }
  IN.dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'r' : 'l') : (ay > 0 ? 'd' : 'u');
}
function stickRelease() {
  IN.on = false; IN.id = null; IN.dir = ''; IN.ax = 0; IN.ay = 0; IN.hold = false;
  IN.released = true;
}

function drawStick() {
  if (IN.zone === 'tap') return;
  if (!IN.on && IN.seen) return;                   // 1回 さわったら 消す
  const r = stickR();
  const home = stickHome();
  const cx = IN.on ? IN.cx : home.x, cy = IN.on ? IN.cy : home.y;
  ctx.save();
  ctx.globalAlpha = IN.on ? 1 : 0.4;
  circle(cx, cy, r);
  ctx.fillStyle = 'rgba(10,10,10,0.22)'; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.strokeStyle = 'rgba(248,248,248,0.34)'; ctx.stroke();
  const s = r * 0.13;
  for (const [k, ax, ay] of [['u', 0, -1], ['d', 0, 1], ['l', -1, 0], ['r', 1, 0]]) {
    const tx = cx + ax * r * 0.90, ty = cy + ay * r * 0.90;
    const bx = cx + ax * r * 0.68, by = cy + ay * r * 0.68;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx - ay * s, by + ax * s);
    ctx.lineTo(bx + ay * s, by - ax * s);
    ctx.closePath();
    ctx.fillStyle = IN.dir === k ? '#FFD24A' : 'rgba(248,248,248,0.42)';
    ctx.fill();
  }
  const kx = cx + IN.ax * r, ky = cy + IN.ay * r;
  circle(kx, ky, r * 0.40);
  ctx.fillStyle = IN.on ? '#FFD24A' : 'rgba(248,248,248,0.66)'; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
  ctx.restore();
}

function drawFire(label, col) {
  if (IN.zone !== 'split') return;
  const h = fireHome(), r = Math.max(34, 58 / SC);
  ctx.save();
  ctx.globalAlpha = IN.fire ? 1 : 0.72;
  circle(h.x, h.y, r);
  ctx.fillStyle = IN.fire ? (col || '#FF6FA8') : 'rgba(255,255,255,0.16)'; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = col || '#FF6FA8'; ctx.stroke();
  const fs = fitSize(label || '！', r * 1.45, Math.round(r * 0.52));
  bigText(label || '！', h.x, h.y, fs, IN.fire ? '#2A1C34' : (col || '#FF6FA8'), null);
  ctx.restore();
}

function pointerDown(id, px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) { b.on(); return; }
  const v = toV(px, py);
  IN.x = v.x; IN.y = v.y;
  // ★ さわった しゅんかんの おとの とけい も いっしょに のこす。
  //   リズムゲームは 1コマ（16ミリびょう）の ずれでも 気に なる ので、
  //   まいコマ まとめて 見るのでは なく、さわった その ときの じかんで しらべる。
  IN.taps.push({ x: v.x, y: v.y, at: anow() });
  if (inFireZone(v)) {
    if (firePtr === null) { firePtr = id; IN.fire = true; IN.fireTap = true; }
    return;
  }
  if (inStickZone(v) && IN.id === null) { IN.id = id; stickGrab(v); }
}
function pointerMove(id, px, py) {
  const v = toV(px, py);
  if (IN.id === id) { IN.x = v.x; IN.y = v.y; stickMove(v); }
}
function pointerUp(id) {
  if (IN.id === id) stickRelease();
  if (firePtr === id) { firePtr = null; IN.fire = false; }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    pointerDown(t.identifier, t.clientX - r.left, t.clientY - r.top);
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    pointerMove(t.identifier, t.clientX - r.left, t.clientY - r.top);
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) pointerUp(e.changedTouches[i].identifier);
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) pointerUp(e.changedTouches[i].identifier);
});
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  pointerDown('m', e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  pointerMove('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => pointerUp('m'));

const KEYS = {};
window.addEventListener('keydown', (e) => {
  audioStart();
  KEYS[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
  if (e.code === 'Space' || e.code === 'KeyZ') { IN.fire = true; IN.fireTap = true; }
});
window.addEventListener('keyup', (e) => {
  KEYS[e.code] = false;
  if (e.code === 'Space' || e.code === 'KeyZ') IN.fire = false;
});
function keyDir() {
  if (KEYS.ArrowLeft) return 'l';
  if (KEYS.ArrowRight) return 'r';
  if (KEYS.ArrowUp) return 'u';
  if (KEYS.ArrowDown) return 'd';
  return '';
}

// --- リナパパ と なかまたち --------------------------------------------------------
//
// ★ メガネの ちょいぽちゃ パパ。かわいく 見える ように 頭を 大きめ（2.5頭身）。

function drawPapa(x, y, s, opt) {
  opt = opt || {};
  const face = opt.face || 'happy';      // happy | oops | dig
  const dir = opt.dir === undefined ? 1 : opt.dir;
  const walk = opt.walk || 0;
  const bob = Math.sin(walk * 8) * s * 0.05;
  const legA = Math.sin(walk * 8) * s * 0.30;

  // あし
  ctx.strokeStyle = '#3A4A6A'; ctx.lineWidth = s * 0.20; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.16, y + s * 0.42); ctx.lineTo(x - s * 0.16 + legA, y + s * 0.86);
  ctx.moveTo(x + s * 0.16, y + s * 0.42); ctx.lineTo(x + s * 0.16 - legA, y + s * 0.86);
  ctx.stroke();
  // からだ（すこし まるい）
  ctx.fillStyle = opt.shirt || '#4AA0E0';
  rr(x - s * 0.44, y - s * 0.06 + bob, s * 0.88, s * 0.58, s * 0.24); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(x - s * 0.44, y - s * 0.06 + bob, s * 0.88, s * 0.20, s * 0.12); ctx.fill();
  // うで
  ctx.strokeStyle = '#FFD8B8'; ctx.lineWidth = s * 0.17;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.40, y + s * 0.10 + bob);
  ctx.lineTo(x - s * 0.62 + (opt.arm || 0) * dir, y + s * 0.30 + bob - (opt.arm || 0) * 0.4);
  ctx.moveTo(x + s * 0.40, y + s * 0.10 + bob);
  ctx.lineTo(x + s * 0.62 + (opt.arm || 0) * dir, y + s * 0.30 + bob - (opt.arm || 0) * 0.4);
  ctx.stroke();
  // あたま
  const hy = y - s * 0.62 + bob;
  ctx.fillStyle = '#FFD8B8';
  circle(x, hy, s * 0.56); ctx.fill();
  ctx.fillStyle = '#4A3A2A';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.06, s * 0.56, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
  // メガネ
  ctx.strokeStyle = '#2A2A32'; ctx.lineWidth = Math.max(1.5, s * 0.055);
  const ex = s * 0.22, ey = hy + s * 0.06;
  for (const sg of [-1, 1]) { circle(x + sg * ex, ey, s * 0.17); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x - s * 0.05, ey); ctx.lineTo(x + s * 0.05, ey); ctx.stroke();
  // 目
  if (face === 'oops') {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.5, s * 0.055);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * ex - s * 0.08, ey - s * 0.07);
      ctx.lineTo(x + sg * ex + s * 0.08, ey + s * 0.07);
      ctx.moveTo(x + sg * ex + s * 0.08, ey - s * 0.07);
      ctx.lineTo(x + sg * ex - s * 0.08, ey + s * 0.07);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2A2028';
    for (const sg of [-1, 1]) { circle(x + sg * ex + dir * s * 0.03, ey, s * 0.075); ctx.fill(); }
  }
  // ほっぺ と 口
  ctx.fillStyle = 'rgba(255,120,150,0.40)';
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.40, hy + s * 0.20, s * 0.11); ctx.fill(); }
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.beginPath();
  if (face === 'oops') ctx.arc(x, hy + s * 0.40, s * 0.12, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, hy + s * 0.22, s * 0.16, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // 口ひげ
  ctx.fillStyle = '#4A3A2A';
  rr(x - s * 0.13, hy + s * 0.14, s * 0.26, s * 0.06, s * 0.03); ctx.fill();
}

// まるくて かわいい てき（色を かえて つかいまわす）
function drawBlob(x, y, s, col, opt) {
  opt = opt || {};
  const t = opt.t || 0;
  const sq = 1 + Math.sin(t * 6) * 0.05;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, s * sq, s / sq, 0, Math.PI, 0);
  ctx.rect(x - s * sq, y, s * 2 * sq, s * 0.55);
  ctx.fill();
  // ぎざぎざの すそ
  // ★ circle() は 中で beginPath する ので、まとめて 1つの みちに できない。
  //   1つずつ ぬる。
  for (let i = 0; i < 4; i++) {
    circle(x - s * sq + s * sq * (0.5 + i), y + s * 0.55, s * sq * 0.5);
    ctx.fill();
  }
  // 目
  ctx.fillStyle = '#FFF';
  circle(x - s * 0.34, y - s * 0.05, s * 0.30); ctx.fill();
  circle(x + s * 0.34, y - s * 0.05, s * 0.30); ctx.fill();
  ctx.fillStyle = '#2A2028';
  const lx = (opt.look || 0) * s * 0.12;
  circle(x - s * 0.34 + lx, y - s * 0.02, s * 0.15); ctx.fill();
  circle(x + s * 0.34 + lx, y - s * 0.02, s * 0.15); ctx.fill();
  if (opt.cheek !== false) {
    ctx.fillStyle = 'rgba(255,120,150,0.42)';
    circle(x - s * 0.62, y + s * 0.28, s * 0.16); ctx.fill();
    circle(x + s * 0.62, y + s * 0.28, s * 0.16); ctx.fill();
  }
}

// --- おと（ファイルなし・その場で 作る） --------------------------------------------

const A = { ctx: null, mus: null, sfx: null, noise: null, keep: null, bgmT: 0, bgmBar: 0 };

function silentWav(sec) {
  const sr = 8000, n = Math.floor(sr * sec);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}
function unmuteIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  if (A.keep) { const p = A.keep.play(); if (p && p.catch) p.catch(() => {}); return; }
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
    el.loop = true; el.volume = 0.02; el.src = silentWav(1);
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    A.keep = el;
  } catch (e) {}
}
function audioStart() {
  unmuteIOS();
  if (A.ctx) {
    if (A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    return;
  }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  A.ctx = new C({ latencyHint: 'interactive' });
  A.mus = A.ctx.createGain(); A.mus.gain.value = 0.20; A.mus.connect(A.ctx.destination);
  A.sfx = A.ctx.createGain(); A.sfx.gain.value = 0.45; A.sfx.connect(A.ctx.destination);
  if (A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
}
function anow() { return A.ctx ? A.ctx.currentTime : 0; }
function safeT(t) { const n = A.ctx.currentTime; return (!(t >= n)) ? n + 0.0005 : t; }
function mid2f(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function noiseBuf() {
  if (A.noise) return A.noise;
  const n = Math.floor(A.ctx.sampleRate * 0.5);
  const b = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  A.noise = b; return b;
}
function nz(t, dur, v, lo, hi, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const s = A.ctx.createBufferSource(); s.buffer = noiseBuf();
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = (lo + hi) / 2;
  f.Q.value = Math.max(0.4, (lo + hi) / 2 / Math.max(1, hi - lo));
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dst || A.sfx);
  s.start(t); s.stop(t + dur + 0.02);
}
function tone(t, m, dur, v, type, dst, m2) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type || 'triangle';
  o.frequency.setValueAtTime(mid2f(m), t);
  if (m2 !== undefined) o.frequency.exponentialRampToValueAtTime(mid2f(m2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dst || A.sfx);
  o.start(t); o.stop(t + dur + 0.05);
}
function kick(t, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.8, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(A.mus);
  o.start(t); o.stop(t + 0.24);
}
function bleep(t0, notes, step, dur, v, dst) {
  if (!A.ctx) return;
  for (let i = 0; i < notes.length; i++) tone(t0 + i * step, notes[i], dur, v, 'square', dst || A.sfx);
}

function sfxTap()   { if (A.ctx) tone(anow(), 79, 0.045, 0.10, 'square'); }
function sfxShot()  { if (A.ctx) { const t = anow(); tone(t, 88, 0.06, 0.09, 'square', null, 70); nz(t, 0.05, 0.06, 1500, 6000); } }
function sfxHit()   { if (A.ctx) { const t = anow(); bleep(t, [84, 91], 0.03, 0.05, 0.11); nz(t, 0.06, 0.09, 1800, 7000); } }
function sfxJump()  { if (A.ctx) tone(anow(), 72, 0.10, 0.10, 'square', null, 86); }
function sfxGet()   { if (A.ctx) bleep(anow(), [72, 76, 79, 84], 0.045, 0.09, 0.12); }
function sfxPop()   { if (A.ctx) { const t = anow(); bleep(t, [76, 84, 91], 0.04, 0.07, 0.12); nz(t + 0.04, 0.10, 0.10, 500, 4000); } }
function sfxNg()    { if (A.ctx) { const t = anow(); bleep(t, [60, 55, 50], 0.07, 0.12, 0.13); nz(t, 0.12, 0.10, 200, 1400); } }
function sfxDead()  { if (A.ctx) { const t = anow(); bleep(t, [72, 67, 62, 58, 53, 48, 43], 0.09, 0.15, 0.14); nz(t + 0.7, 0.30, 0.10, 100, 900); } }
function sfxClear(p){ if (A.ctx) { const t = anow(); bleep(t, p ? [72,76,79,84,79,84,88,91] : [72,76,79,84,84,88], 0.09, 0.16, 0.15); kick(t, 0.7); kick(t + 0.36, 0.7); } }
function sfxOver()  { if (A.ctx) { const t = anow(); bleep(t, [67, 63, 60, 56, 51, 48], 0.11, 0.20, 0.14); nz(t + 0.6, 0.35, 0.10, 100, 900); } }
function sfxTest()  { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84], 0.09, 0.16, 0.16); kick(t, 0.7); kick(t + 0.36, 0.7); nz(t + 0.18, 0.06, 0.12, 2000, 8000); } }

// BGM（四角い波 2つ ＋ ノイズ）。むかしの ゲーム機と 同じ 組みあわせ。
const BGM_PROG = [[0, 7, 5, 3], [0, 5, 3, 7], [0, 3, 5, 7]];
let bgmOn = false, bgmRoot = 55, bgmSet = 0, bgmBpm = 124, bgmHot = 0;

function bgmStart(n) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = (n || 0) % BGM_PROG.length;
  bgmRoot = 55 + ((n || 0) % 4) * 2;
  bgmBpm = 118 + ((n || 0) % 5) * 5;
  bgmHot = 0;
  A.bgmT = anow() + 0.15; A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
function bgmHeat(v) { bgmHot = clamp(v, 0, 1); }
function bgmPump() {
  if (!bgmOn || !A.ctx) return;
  const spb = 60 / (bgmBpm * (1 + bgmHot * 0.16));
  const barLen = spb * 4;
  while (A.bgmT + A.bgmBar * barLen < anow() + 1.2) {
    const t0 = A.bgmT + A.bgmBar * barLen;
    if (t0 + barLen > anow()) bgmBar(t0, A.bgmBar, spb);
    A.bgmBar++;
  }
}
function bgmBar(t0, bar, spb) {
  const prog = BGM_PROG[bgmSet];
  const ci = bar % 4;
  const r = bgmRoot + prog[ci];
  const third = (ci === 1 || ci === 3) ? 3 : 4;
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * spb, 0.55);
    if (i === 1 || i === 3) nz(t0 + i * spb, 0.06, 0.12, 1200, 5000, A.mus);
    nz(t0 + i * spb + spb / 2, 0.025, 0.045, 6000, 12000, A.mus);
  }
  for (let i = 0; i < 8; i++) {
    tone(t0 + i * (spb / 2), r - 24 + (i % 4 === 2 ? 7 : 0), spb * 0.40, 0.12, 'square', A.mus);
  }
  const arp = [0, third, 7, 12, 7, third];
  for (let i = 0; i < 12; i++) {
    tone(t0 + i * (spb / 3), r + arp[i % 6] + (i >= 6 ? 12 : 0), spb * 0.26,
         bgmHot > 0.5 ? 0.07 : 0.05, 'square', A.mus);
  }
}

// --- メインループ ------------------------------------------------------------------

let arcadeUpdate = null, arcadeDraw = null, lastMs = 0;

function arcadeFrame(ms) {
  const now = ms / 1000;
  let dt = lastMs ? now - lastMs : 0;
  lastMs = now;
  dt = Math.min(0.05, dt);

  bgmPump();
  if (arcadeUpdate) arcadeUpdate(dt);

  ui.buttons = [];
  if (arcadeDraw) arcadeDraw(dt);

  IN.taps.length = 0;
  IN.fireTap = false;
  IN.released = false;
  requestAnimationFrame(arcadeFrame);
}

function arcadeStart(opt) {
  arcadeUpdate = opt.update;
  arcadeDraw = opt.draw;
  if (opt.vh) VH = opt.vh;
  if (opt.zone) IN.zone = opt.zone;
  layout();
  requestAnimationFrame(arcadeFrame);
}

// --- めん えらび（タイトルで つかう 共通の ぶひん） --------------------------------

function stagePicker(n, open, clear, names, y0, onPick, col) {
  const cols = VW > 820 ? 5 : 4;
  const cw = Math.min(122, (VW - 48 - (cols - 1) * 8) / cols), ch = 44;
  for (let i = 0; i < n; i++) {
    const x = 24 + (i % cols) * (cw + 8), y = y0 + Math.floor(i / cols) * (ch + 8);
    const ok = i < open;
    const b = button(x, y, cw, ch, ok ? () => onPick(i) : null);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    rr(b.x + 3, b.y + 3, cw, ch, 9); ctx.fill();
    ctx.fillStyle = ok ? (clear[i] ? (col || '#FFD24A') : '#5A4A86') : '#2A2440';
    rr(b.x, b.y, cw, ch, 9); ctx.fill();
    const nm = ok ? (names[i] || (i + 1) + 'めん') : '？？';
    const fs = fitSize(nm, cw - 12, 15);
    bigText(nm, b.x + cw / 2, b.y + ch * 0.36, fs,
            ok ? (clear[i] ? '#2A2038' : '#FFF') : '#6A5F8A', null);
    if (ok && clear[i]) bigText('クリア！', b.x + cw / 2, b.y + ch * 0.74, 11, 'rgba(42,32,56,0.8)', null);
    else if (ok) bigText((i + 1) + 'めんめ', b.x + cw / 2, b.y + ch * 0.74, 11, 'rgba(255,255,255,0.6)', null);
  }
  return y0 + Math.ceil(n / cols) * (ch + 8);
}

// クリア／ゲームオーバーの まく
function drawResult(win, title, lines, btns, col) {
  ctx.fillStyle = 'rgba(6,4,16,0.72)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText(title, VW / 2, VH * 0.24, 34, win ? (col || '#FFD24A') : '#FF8AA8');
  lines.forEach((s, i) => bigText(s, VW / 2, VH * 0.40 + i * 28, 18, '#F0EAFF', null));
  const bw = Math.min(190, VW * 0.23);
  const total = btns.length * bw + (btns.length - 1) * 14;
  btns.forEach((b, i) => {
    const x = VW / 2 - total / 2 + i * (bw + 14);
    drawButton(button(x, VH * 0.74, bw, 46, b.on), b.label, b.col || '#FFD24A');
  });
}
