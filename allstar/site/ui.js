// 画面・そうさ・メインループ。
//
// ★ よこ長の 絵づくり。たてに 持った スマホでは 中みを 90度 まわして
//   画面いっぱいに つかう（画面回転ロックが 入って いても 大きく あそべる）。
// ★ そうさは 2つだけ。「さわって うごかす」と「タップ」。
//   ミニゲームには 0〜1 の ざひょうで わたす。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, VOB = 0, DPR = 1, ROT = false;

const VW_MIN = 720;

const ui = { buttons: [] };

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  const sN = Math.min(H / VH, W / VW_MIN);
  const sR = Math.min(W / VH, H / VW_MIN);
  ROT = sR > sN * 1.15;
  SC = ROT ? sR : sN;

  const long = ROT ? H : W;
  const short = ROT ? W : H;
  VW = long / SC;
  const extra = Math.max(0, short / SC - VH);
  VOY = extra / 2;
  VOB = extra - VOY;

  if (ROT) {
    ctx.setTransform(0, DPR * SC, -DPR * SC, 0, Math.round(DPR * (W - VOY * SC)), 0);
  } else {
    ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));
  }
  document.documentElement.setAttribute('data-game-rot', ROT ? '1' : '0');
}

// 画面の ざひょう -> かそう画面の ざひょう
function toV(px, py) {
  if (ROT) return { x: py / SC, y: (W - px) / SC - VOY };
  return { x: px / SC, y: py / SC - VOY };
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// --- ミニゲームの はこ（0〜1 の ざひょうの もと） ------------------------------------

const HUD_H = 26, BAR_H = 8;
let S = { x: 0, y: 0, w: 0, h: 0 };

function stageBox() {
  const top = HUD_H + BAR_H + 4;
  const h = VH - top - 8;
  const w = Math.min(VW - 24, h * 2.15);
  return { x: Math.round((VW - w) / 2), y: top, w: w, h: h };
}
function X(u) { return S.x + u * S.w; }
function Y(v) { return S.y + v * S.h; }
function R(k) { return k * S.h; }

// --- そうさ ----------------------------------------------------------------------

const IN = { down: false, u: 0.5, v: 0.5, taps: [] };
let ptrId = null;

function inSet(px, py) {
  const p = toV(px, py);
  IN.u = (p.x - S.x) / S.w;
  IN.v = (p.y - S.y) / S.h;
}

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
  ui.buttons.push(b); return b;
}

function hitBtn(px, py) {
  const p = toV(px, py);
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}

function pointerDown(id, px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) { b.on(); return; }
  if (ptrId !== null) return;
  ptrId = id;
  IN.down = true;
  inSet(px, py);
  IN.taps.push({ u: IN.u, v: IN.v });
}
function pointerMove(id, px, py) {
  if (ptrId !== id) return;
  inSet(px, py);
}
function pointerUp(id) {
  if (ptrId !== id) return;
  ptrId = null; IN.down = false;
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
window.addEventListener('keydown', (e) => {
  audioStart();
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    IN.taps.push({ u: IN.u, v: IN.v });
  }
});

// --- ぶひん -----------------------------------------------------------------------

function drawButton(b, label, col, textCol) {
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  rr(b.x + 3, b.y + 4, b.w, b.h, b.h * 0.28); ctx.fill();
  ctx.fillStyle = col;
  rr(b.x, b.y, b.w, b.h, b.h * 0.28); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  rr(b.x, b.y, b.w, b.h * 0.42, b.h * 0.22); ctx.fill();
  const fs = fitSize(label, b.w * 0.86, Math.round(b.h * 0.44));
  bigText(label, b.x + b.w / 2, b.y + b.h / 2, fs, textCol || '#241C34', null);
}

function bg(a, b2) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, a); g.addColorStop(1, b2);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
}

// --- タイトル ---------------------------------------------------------------------

function drawTitle() {
  bg('#3A2260', '#160C2A');
  // きらきら
  for (let i = 0; i < 30; i++) {
    const u = (i * 0.137 + G.t * 0.02) % 1;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.25 * Math.abs(Math.sin(G.t + i))) + ')';
    ctx.fillRect(u * VW, ((i * 0.311) % 1) * VH, 3, 3);
  }

  bigText('きょうだい', VW * 0.5, 52, 30, '#FFD24A');
  const fs = fitSize('オールスター', VW * 0.66, 58);
  bigText('オールスター', VW * 0.5, 96, fs, '#FF6FA8');
  bigText('みんなの ゲームが 5びょうずつ 出てくる！  ぜんぶで 13しゅるい', VW * 0.5, 138, 16, '#E8DFFF', null);

  for (let i = 0; i < 4; i++) {
    const x = VW * 0.5 + (i - 1.5) * Math.min(120, VW * 0.15);
    drawKid(i, x, 212, 34, 'happy', G.t + i * 0.4);
    bigText(KIDS[i].name, x, 262, 15, KIDS[i].col, null);
  }

  const bw = Math.min(260, VW * 0.30), bh = 52;
  drawButton(button(VW * 0.5 - bw / 2, 300, bw, bh, () => startRun()), 'スタート！', '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW * 0.5 - sw - 8, 362, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW * 0.5 + 8, 362, sw, 36, () => { sfxTest(); }), '♪ おと', '#B8A8F0');

  bigText('ハイスコア  ' + save.hi, VW * 0.5, 418, 16, '#FFD24A', null);
  bigText('さいこう れんぞく  ' + save.best + '本', VW * 0.5, 438, 14, '#C8BCE8', null);
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('v' + GAME_VER, 12, VH - 16);
}

function drawHowto() {
  bg('#221A40', '#120A22');
  bigText('あそびかた', VW * 0.5, 40, 28, '#FFD24A');
  const lines = [
    '① これまでの ゲームから 生まれた ミニゲーム 12しゅるいが つぎつぎ 出てくる',
    '② 出た しゅんかんの 大きな 文字が「やること」',
    '③ そうさは 2つだけ。さわって うごかす／タップ',
    '④ しっぱいすると きょうだいが 1人 こうたい（ぜんぶで 4人）',
    '⑤ 5本 クリアするたび スピードアップ',
    '⑥ 12本ごとに パパロボが 出てくる！',
  ];
  lines.forEach((s, i) => {
    const fs = fitSize(s, VW * 0.84, 17);
    bigText(s, VW * 0.5, 96 + i * 34, fs, '#F0EAFF', null);
  });
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW * 0.5 - bw / 2, 380, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

// --- あそんで いる 画面 ------------------------------------------------------------

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VW, HUD_H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(String(G.score), 10, HUD_H / 2);
  ctx.fillStyle = '#C8BCE8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(G.clears + '本め', 92, HUD_H / 2);
  ctx.textBaseline = 'top';

  for (let i = 0; i < 4; i++) drawKidIcon(i, 176 + i * 30, HUD_H / 2, 11, G.alive[i]);

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = '#C8BCE8';
  ctx.fillText('スピード ' + (G.level + 1), VW - 12, HUD_H / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // のこり じかんの ぼう
  const k = Math.max(0, G.time / G.timeMax);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, HUD_H, VW, BAR_H);
  ctx.fillStyle = k > 0.4 ? '#48D8A0' : k > 0.18 ? '#FFD24A' : '#FF5A7A';
  ctx.fillRect(0, HUD_H, VW * k, BAR_H);
}

function drawPlay() {
  bg('#2A2048', '#140E28');
  S = stageBox();

  // ミニゲームの わく
  ctx.save();
  ctx.beginPath();
  rr(S.x, S.y, S.w, S.h, 10);
  ctx.clip();
  ctx.fillStyle = '#181228';
  ctx.fillRect(S.x, S.y, S.w, S.h);
  if (G.M) G.M.draw(G.g, G.t);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  rr(S.x, S.y, S.w, S.h, 10); ctx.stroke();

  drawHud();

  if (G.phase === 'call') {
    ctx.fillStyle = 'rgba(10,6,22,0.66)';
    ctx.fillRect(S.x, S.y, S.w, S.h);
    // 左に 出題者、右に 大きな 文字。かさならない ように きっちり 分ける。
    drawKid(G.hostK, X(0.14), Y(0.52), R(0.17), 'happy', G.t);
    bigText(KIDS[G.hostK].name, X(0.14), Y(0.86), Math.round(R(0.09)),
            KIDS[G.hostK].col, null);
    const cx = X(0.62), maxW = S.w * 0.60;
    const nm = G.M.boss ? 'パパロボ とうじょう！' : G.M.name + '！';
    const fs = fitSize(nm, maxW, Math.round(R(0.26)));
    bigText(nm, cx, Y(0.42), fs, G.M.boss ? '#FF5A7A' : '#FFD24A');
    const f2 = fitSize(G.M.hint, maxW, Math.round(R(0.11)));
    bigText(G.M.hint, cx, Y(0.68), f2, '#E8DFFF', null);
  }

  if (G.phase === 'judge') {
    ctx.fillStyle = G.lastOk ? 'rgba(40,200,140,0.28)' : 'rgba(220,60,90,0.30)';
    ctx.fillRect(S.x, S.y, S.w, S.h);
    bigText(G.lastOk ? 'ナイス！' : 'ざんねん…', X(0.5), Y(0.44), Math.round(R(0.26)),
            G.lastOk ? '#7CFFC4' : '#FFC0CC');
    if (!G.lastOk && G.msg) bigText(G.msg, X(0.5), Y(0.70), Math.round(R(0.11)), '#FFE8EE', null);
  }

  if (G.phase === 'speed') {
    ctx.fillStyle = 'rgba(10,6,22,0.6)';
    ctx.fillRect(S.x, S.y, S.w, S.h);
    bigText('スピードアップ！', X(0.5), Y(0.45), Math.round(R(0.20)), '#FFD24A');
    bigText('スピード ' + (G.level + 1), X(0.5), Y(0.70), Math.round(R(0.12)), '#E8DFFF', null);
  }
}

// --- おわりの 画面 -----------------------------------------------------------------

function drawOver() {
  bg('#2A1638', '#120A1E');
  bigText('おしまい！', VW * 0.5, 54, 34, '#FFD24A');
  for (let i = 0; i < 4; i++) {
    const x = VW * 0.5 + (i - 1.5) * Math.min(110, VW * 0.14);
    drawKid(i, x, 132, 28, 'ng', G.t + i * 0.3);
  }
  bigText('スコア  ' + G.score, VW * 0.5, 208, 26, '#FFF');
  bigText('クリア  ' + G.clears + '本   スピード ' + (G.level + 1), VW * 0.5, 246, 17, '#C8BCE8', null);
  if (G.score >= save.hi && G.score > 0) {
    bigText('★ ハイスコア こうしん！ ★', VW * 0.5, 280, 18, '#FFD24A');
  } else {
    bigText('ハイスコア  ' + save.hi, VW * 0.5, 280, 16, '#8A7CB0', null);
  }
  const bw = Math.min(200, VW * 0.24);
  drawButton(button(VW * 0.5 - bw - 10, 322, bw, 48, () => startRun()), 'もういちど', '#FFD24A');
  drawButton(button(VW * 0.5 + 10, 322, bw, 48, () => { G.screen = 'title'; }), 'タイトルへ', '#8AD8F0');
}

// --- メインループ ------------------------------------------------------------------

let last = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);

  update(dt);

  ui.buttons = [];
  S = stageBox();
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'over') drawOver();
  else drawPlay();

  IN.taps.length = 0;
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
