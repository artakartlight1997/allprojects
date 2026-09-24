// きょうつうの どうぐ（がめん・そうさ・ボタン・音・セーブ・ループ）。
//
// ★ がめんは「たて 540」を きじゅんに した かそうの 大きさ で かく。
//   よこはばは 画面の 形に あわせて 720〜1170 の あいだで のびちぢみ する
//   （よこ長の スマホでも 左右に すきまが できない）。
//   ゲームがわは VW × VH（VH=540）の 中に かけば いい。
// ★ ボタンは 毎コマ btn() で 出す。見た目が 小さくても ゆびの 当たる
//   はんいは 44px いじょうに ひろげて さがす（hitBtn）。
// ★ 音は ファイルを つかわず その場で 作る。iPhone の 消音スイッチでも
//   鳴るように、無音の 音を 流しっぱなしに して おく（unmuteIOS）。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const VH = 540;
let VW = 960;
let SC = 1, OX = 0, OY = 0;       // かそう → 本物の ピクセル
let PW = 0, PH = 0;               // 本物の 画面（CSS px）
const FONT = 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';

function fitScreen() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  PW = canvas.clientWidth; PH = canvas.clientHeight;
  canvas.width = Math.round(PW * dpr);
  canvas.height = Math.round(PH * dpr);
  const asp = PW / Math.max(1, PH);
  VW = Math.round(Math.max(720, Math.min(1170, VH * asp)));
  SC = Math.min(PW / VW, PH / VH);
  OX = (PW - VW * SC) / 2; OY = (PH - VH * SC) / 2;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, dpr * OX, dpr * OY);
  if (window.GAME && GAME.resize) GAME.resize();
}
window.addEventListener('resize', fitScreen);
window.addEventListener('orientationchange', () => setTimeout(fitScreen, 200));

// --- かく どうぐ --------------------------------------------------------------------

function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
function fillC(x, y, r, c) { ctx.fillStyle = c; circ(x, y, r); ctx.fill(); }
function fillR(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function fillRR(x, y, w, h, r, c) { ctx.fillStyle = c; rr(x, y, w, h, r); ctx.fill(); }
function ellipse(x, y, rx, ry, rot) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
}
function grad(y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1); return g;
}
function star(x, y, r, n, inner, rot) {
  n = n || 5; inner = inner || 0.45;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (rot || 0) - Math.PI / 2 + i * Math.PI / n;
    const d = i % 2 ? r * inner : r;
    if (i) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

// もじ。maxW を こえる ときは 小さく する。
function font(size, bold) { ctx.font = (bold === false ? '' : 'bold ') + Math.round(size) + 'px ' + FONT; }
function text(s, x, y, size, col, align, bold, maxW) {
  s = String(s);
  font(size, bold);
  if (maxW) {
    const w = ctx.measureText(s).width;
    if (w > maxW) font(Math.max(8, size * maxW / w), bold);
  }
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = col || '#fff';
  ctx.fillText(s, x, y);
}
// ふちどり もじ
function textO(s, x, y, size, col, edge, align, maxW) {
  s = String(s);
  font(size);
  if (maxW) {
    const w = ctx.measureText(s).width;
    if (w > maxW) font(Math.max(8, size * maxW / w));
  }
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.18);
  ctx.strokeStyle = edge || 'rgba(20,12,30,0.85)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = col || '#fff';
  ctx.fillText(s, x, y);
}
// 何行かに わける（日本語は 1文字ずつ はかる）
function wrap(s, maxW, size) {
  font(size, false);
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
      else line += ch;
    }
    out.push(line);
  }
  return out;
}

// --- ボタン ------------------------------------------------------------------------

const UI = { btns: [] };
function btn(x, y, w, h, label, on, o) {
  o = o || {};
  const b = { x, y, w, h, on, off: o.off };
  UI.btns.push(b);
  const pressed = PTR.down && PTR.btn === label && inBox(PTR.x, PTR.y, b);
  const col = o.off ? 'rgba(120,110,140,0.55)' : (o.col || '#FFE066');
  if (!o.flat) fillRR(x + 3, y + 5, w, h, Math.min(16, h * 0.3), 'rgba(0,0,0,0.28)');
  fillRR(x, y + (pressed ? 3 : 0), w, h, Math.min(16, h * 0.3), col);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2; ctx.stroke();
  if (label) {
    const sub = o.sub;
    text(label, x + w / 2, y + h / 2 + (pressed ? 3 : 0) - (sub ? h * 0.14 : 0),
         o.size || Math.min(h * 0.46, 30), o.tc || '#2A2440', 'center', true, w * 0.88);
    if (sub) text(sub, x + w / 2, y + h / 2 + h * 0.24, h * 0.22, o.tc2 || 'rgba(42,36,64,0.75)',
                  'center', false, w * 0.9);
  }
  b.label = label;
  return b;
}
function inBox(px, py, b) { return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h; }
function hitBtn(px, py) {
  for (let i = UI.btns.length - 1; i >= 0; i--) {
    const b = UI.btns[i];
    if (!b.off && inBox(px, py, b)) return b;
  }
  // 見た目が 小さい ボタンは ゆびの 当たる はんいを ひろげる
  const need = 44 / Math.max(0.3, SC);
  for (let i = UI.btns.length - 1; i >= 0; i--) {
    const b = UI.btns[i];
    if (b.off) continue;
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if ((mx || my) && inBox(px, py, { x: b.x - mx, y: b.y - my, w: b.w + mx * 2, h: b.h + my * 2 })) return b;
  }
  return null;
}

// --- そうさ ------------------------------------------------------------------------

const PTR = { x: 0, y: 0, down: false, id: -1, btn: null, sx: 0, sy: 0, t0: 0 };
const KEYS = {};
function toV(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left - OX) / SC, y: (ev.clientY - r.top - OY) / SC };
}
canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  sndStart();
  if (PTR.down && ev.pointerId !== PTR.id) {
    // 2本めの ゆびは ボタンだけ 受けつける
    const p2 = toV(ev);
    const b2 = hitBtn(p2.x, p2.y);
    if (b2 && b2.on) b2.on();
    return;
  }
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
  const p = toV(ev);
  PTR.x = p.x; PTR.y = p.y; PTR.sx = p.x; PTR.sy = p.y; PTR.down = true;
  PTR.id = ev.pointerId; PTR.t0 = performance.now();
  const b = hitBtn(p.x, p.y);
  if (b) { PTR.btn = b.label; if (b.on) b.on(); return; }
  PTR.btn = null;
  if (GAME.down) GAME.down(p.x, p.y);
});
canvas.addEventListener('pointermove', (ev) => {
  if (PTR.down && ev.pointerId !== PTR.id) return;
  const p = toV(ev);
  PTR.x = p.x; PTR.y = p.y;
  if (GAME.move) GAME.move(p.x, p.y, PTR.down && !PTR.btn);
});
function ptrUp(ev) {
  if (ev.pointerId !== PTR.id) return;
  const p = toV(ev);
  const wasBtn = PTR.btn;
  PTR.down = false; PTR.btn = null; PTR.id = -1;
  if (!wasBtn && GAME.up) GAME.up(p.x, p.y);
}
canvas.addEventListener('pointerup', ptrUp);
canvas.addEventListener('pointercancel', ptrUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (KEYS[e.code]) return;
  KEYS[e.code] = true;
  sndStart();
  if (GAME.key) GAME.key(e.code, true);
});
window.addEventListener('keyup', (e) => {
  KEYS[e.code] = false;
  if (GAME.key) GAME.key(e.code, false);
});
window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });

// --- 音 ----------------------------------------------------------------------------

const SND = { ctx: null, out: null, on: true, noise: null, keep: null };
function sndStart() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  if (!SND.keep) {
    try {
      // 無音の wav を ながしっぱなし（iPhone の 消音スイッチ たいさく）
      const sr = 8000, n = 8000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      let s = ''; const b = new Uint8Array(buf);
      for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      const el = document.createElement('audio');
      el.setAttribute('playsinline', ''); el.loop = true; el.volume = 0.02;
      el.src = 'data:audio/wav;base64,' + btoa(s);
      const pr = el.play(); if (pr && pr.catch) pr.catch(() => {});
      SND.keep = el;
    } catch (e) {}
  } else { const pr = SND.keep.play(); if (pr && pr.catch) pr.catch(() => {}); }
  if (SND.ctx) { if (SND.ctx.state !== 'running') SND.ctx.resume().catch(() => {}); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  SND.ctx = new C({ latencyHint: 'interactive' });
  SND.out = SND.ctx.createGain(); SND.out.gain.value = 0.45;
  SND.out.connect(SND.ctx.destination);
}
function sndT() { return SND.ctx ? SND.ctx.currentTime : 0; }
// ピッ・ポン などの みじかい 音。f1 を わたすと 高さが すべる。
function tone(f, dur, type, vol, f1, delay) {
  if (!SND.ctx || !SND.on) return;
  const t = SND.ctx.currentTime + 0.005 + (delay || 0);
  const o = SND.ctx.createOscillator(), g = SND.ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SND.out);
  o.start(t); o.stop(t + dur + 0.02);
}
// ザッ・ドン などの ノイズ
function noise(dur, vol, freq, delay) {
  if (!SND.ctx || !SND.on) return;
  if (!SND.noise) {
    const n = SND.ctx.sampleRate * 0.5;
    SND.noise = SND.ctx.createBuffer(1, n, SND.ctx.sampleRate);
    const d = SND.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = SND.ctx.currentTime + 0.005 + (delay || 0);
  const s = SND.ctx.createBufferSource(); s.buffer = SND.noise;
  const f = SND.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = 0.8;
  const g = SND.ctx.createGain();
  g.gain.setValueAtTime(vol || 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(SND.out);
  s.start(t); s.stop(t + dur + 0.02);
}
// ドレミ で みじかい メロディ（n: MIDI の ばんごう の ならび）
function jingle(ns, step, type, vol) {
  ns.forEach((m, i) => {
    if (m == null) return;
    tone(440 * Math.pow(2, (m - 69) / 12), step * 1.6, type || 'triangle', vol || 0.18, 0, i * step);
  });
}

// --- セーブ ------------------------------------------------------------------------

const store = {
  get(k, def) {
    try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

// --- ほかの ゲームへ / ぜんがめん ----------------------------------------------------

function gotoHub() {
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function fullScreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f && !document.fullscreenElement) { try { const p = f.call(e); if (p && p.catch) p.catch(() => {}); } catch (err) {} }
  const so = window.screen && window.screen.orientation;
  if (so && so.lock) { try { const r = so.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (err) {} }
}

// --- こまかい どうぐ ------------------------------------------------------------------

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

// --- ループ ------------------------------------------------------------------------
//
// GAME = { update(dt), draw(t), down(x,y), move(x,y,drag), up(x,y), key(code,down), bg }

let GAME = {};
let _last = 0, TIME = 0;
function drawRotate() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, PW, PH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(PW * 0.075) + 'px ' + FONT;
  ctx.fillText('よこ向きに してね', PW / 2, PH * 0.45);
  ctx.fillStyle = '#C8B8E0'; ctx.font = Math.round(PW * 0.045) + 'px ' + FONT;
  ctx.fillText('スマホを たおすと あそべます', PW / 2, PH * 0.55);
  ctx.restore();
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - _last) / 1000 || 0);
  _last = now;
  TIME += dt;
  UI.btns = [];
  if (PW < PH * 1.1) { drawRotate(); return; }
  if (GAME.update) GAME.update(dt);
  // すきまの ぬりつぶし
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = GAME.bg || '#1E1A32';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  if (GAME.draw) GAME.draw(TIME);
  ctx.restore();
}
function startGame(g) {
  GAME = g;
  fitScreen();
  document.addEventListener('visibilitychange', () => { if (document.hidden && GAME.pause) GAME.pause(); });
  requestAnimationFrame(frame);
}
