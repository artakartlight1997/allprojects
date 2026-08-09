// 画面・そうさ・メインループ。ぜんぶ 四角の ドット絵。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, VOB = 0, DPR = 1;

// ★ たて長の 画面（スマホを たてに 持った とき）だと よこが せまく なりすぎて、
//   右がわの ボタンや 数字が 画面の 外に 出て しまう。
//   そこで「よこ VW_MIN 以上は かならず 入る」ように 縮尺を きめ、
//   あまった たての ぶんは 上下に 分けて まん中に よせる（レターボックス）。
//   よこ長の ときは これまでと まったく 同じ 見た目に なる。
const VW_MIN = 720;

const ui = { buttons: [] };

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  SC = Math.min(H / VH, W / VW_MIN);
  VW = W / SC;
  // ★ たて長の ときは、あまった たての ぶんを 上に すこし・下に たっぷり 分ける。
  //   下の 広い ところに 大きな 十字ボタンを おく ため。
  const extra = Math.max(0, H / SC - VH);
  VOY = extra * 0.12;
  VOB = extra - VOY;
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 14; i++) {
    ctx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 6) break;
    fs = Math.max(6, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
  ui.buttons.push(b); return b;
}

function drawButton(b, label, col, textCol) {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
  ctx.fillStyle = col || PAL.w;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x, b.y, b.w, 2);
  ctx.fillStyle = textCol || PAL.k;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w * 0.88, b.h * 0.46, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC - VOY;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

function boardBox() {
  const top = 32, bot = 56;
  const av = VW - 20 - padReserve();
  const c = Math.max(8, Math.floor(Math.min((VH - top - bot) / FH, av / FW)));
  return { x: Math.round((VW - padReserve() - c * FW) / 2), y: top, c: c };
}

// --- ドット絵 ---------------------------------------------------------------------

const FROG = [
  '.1....1.',
  '.11..11.',
  '.122221.',
  '12322321',
  '12222221',
  '.111111.',
  '1.1..1.1',
  '11....11',
];

function drawFrog(px, py, c, dir, dead) {
  const s = c / 8;
  const map = dead ? { '1': PAL.gy, '2': PAL.gy, '3': PAL.w } :
                     { '1': PAL.dg, '2': PAL.g, '3': PAL.w };
  ctx.save();
  ctx.translate(px + c / 2, py + c / 2);
  ctx.rotate(dir * Math.PI / 2);
  drawSprite(FROG, -c / 2, -c / 2, s, map);
  ctx.restore();
  if (!dead) {  // 目の くろ目
    ctx.fillStyle = PAL.k;
    const q = Math.max(1, s);
    ctx.fillRect(Math.round(px + c * 0.34), Math.round(py + c * 0.36), q, q);
    ctx.fillRect(Math.round(px + c * 0.56), Math.round(py + c * 0.36), q, q);
  }
}

function drawCar(px, py, w, c, look, left) {
  const C = CARS[look % CARS.length];
  const m = Math.max(1, Math.floor(c * 0.12));
  ctx.fillStyle = C.col;
  ctx.fillRect(px, py + m, w, c - m * 2);
  ctx.fillStyle = C.top;
  ctx.fillRect(px + w * 0.22, py + m * 2, w * 0.56, (c - m * 4) / 2);
  // タイヤ
  ctx.fillStyle = PAL.k;
  const t = Math.max(2, Math.floor(c * 0.16));
  ctx.fillRect(px + w * 0.12, py + c - m - t, t, t);
  ctx.fillRect(px + w * 0.78, py + c - m - t, t, t);
  // ライト
  ctx.fillStyle = PAL.y;
  ctx.fillRect(left ? px : px + w - t, py + c * 0.36, t, t);
}

function drawLog(px, py, w, c) {
  const m = Math.max(1, Math.floor(c * 0.14));
  ctx.fillStyle = '#8A5A28';
  ctx.fillRect(px, py + m, w, c - m * 2);
  ctx.fillStyle = '#6A4218';
  for (let x = px + 4; x < px + w - 3; x += 8) ctx.fillRect(x, py + m, 2, c - m * 2);
  ctx.fillStyle = '#A8763A';
  ctx.fillRect(px, py + m, w, 2);
}

function drawTurtle(px, py, w, c, n, sink) {
  const one = w / n;
  for (let i = 0; i < n; i++) {
    const x = px + i * one;
    if (sink === 2) continue;
    const m = Math.max(1, Math.floor(c * (sink === 1 ? 0.30 : 0.16)));
    ctx.fillStyle = sink === 1 ? '#2A6A48' : PAL.dg;
    ctx.fillRect(x + 1, py + m, one - 2, c - m * 2);
    ctx.fillStyle = sink === 1 ? '#3A8A58' : PAL.g;
    ctx.fillRect(x + one * 0.24, py + m + 2, one * 0.52, c - m * 2 - 4);
    if (sink === 0) {
      ctx.fillStyle = PAL.dg;
      ctx.fillRect(x + one * 0.78, py + c * 0.4, Math.max(2, one * 0.16), Math.max(2, c * 0.18));
      ctx.fillStyle = PAL.k;
      ctx.fillRect(x + one * 0.84, py + c * 0.44, Math.max(1, one * 0.06), Math.max(1, c * 0.08));
    }
  }
}

// --- あそんでいる 画面 -----------------------------------------------------------

function drawPlay() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  const B = boardBox();
  const c = B.c;

  // はいけい
  for (let y = 0; y < FH; y++) {
    const py = B.y + y * c;
    let col = '#2A2A44';
    if (y === 0) col = '#184A30';
    else if (y >= 1 && y <= 5) col = '#1830A8';
    else if (y === 6) col = '#184A30';
    else if (y === 12) col = '#184A30';
    ctx.fillStyle = col;
    ctx.fillRect(B.x, py, c * FW, c);
    if (y >= 7 && y <= 11) {           // 道の 白線
      ctx.fillStyle = 'rgba(248,248,248,0.18)';
      for (let x = 0; x < FW; x++) ctx.fillRect(B.x + x * c + c * 0.3, py + c - 2, c * 0.4, 1);
    }
    if (y >= 1 && y <= 5) {            // 水の きらめき
      ctx.fillStyle = 'rgba(72,216,248,0.16)';
      for (let x = 0; x < FW; x++) {
        if (((x * 7 + y * 3 + (G.t * 2 | 0)) % 5) === 0) ctx.fillRect(B.x + x * c + 2, py + c * 0.6, c * 0.3, 2);
      }
    }
  }

  // おうち
  for (let i = 0; i < G.HOMES.length; i++) {
    const px = B.x + G.HOMES[i] * c, py = B.y;
    ctx.fillStyle = '#0E2A1A';
    ctx.fillRect(px, py, c, c);
    ctx.fillStyle = PAL.g;
    ctx.fillRect(px, py, c, 2);
    if (G.homes[i]) drawFrog(px, py, c, 0, false);
    else {
      ctx.fillStyle = PAL.y;
      ctx.fillRect(px + c * 0.3, py + c * 0.3, c * 0.4, c * 0.4);
    }
  }

  // 帯の なかみ
  for (let y = 0; y < FH; y++) {
    const L = G.lanes[y];
    if (!L) continue;
    const py = B.y + y * c;
    for (const it of L.items) {
      const px = B.x + it.x * c, w = it.w * c;
      if (px > B.x + c * FW || px + w < B.x) continue;
      if (L.zone === 'road') drawCar(px, py, w, c, it.look, L.sp < 0);
      else if (it.kind === 'turtle') drawTurtle(px, py, w, c, it.w, it.sink);
      else drawLog(px, py, w, c);
    }
  }

  // カエル
  const f = G.frog;
  if (f) {
    const px = B.x + f.x * c, py = B.y + f.y * c;
    if (G.dead > 0) {
      const blink = ((G.t * 10) | 0) % 2 === 0;
      if (blink) drawFrog(px, py, c, 0, true);
      retroText(G.deadKind === 'car' ? 'ドンッ' : G.deadKind === 'time' ? '時間ぎれ' : 'ドボン',
                px + c / 2, py - 14, 14, PAL.r, PAL.dk, 'center');
    } else {
      drawFrog(px, py, c, f.dir, false);
    }
  }

  drawHud(B);
  drawPad();

  if (G.ready > 0 && G.dead <= 0) {
    retroText('スタート！', VW / 2, VH * 0.5, 24, PAL.y, PAL.dk, 'center');
  }
  if (G.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(0, 0, VW, VH);
    retroText(G.win ? 'クリア！' : 'ゲームオーバー', VW / 2, VH * 0.26,
              34, G.win ? PAL.y : PAL.r, PAL.dk, 'center');
    retroText('スコア', VW / 2, VH * 0.42, 14, PAL.w, PAL.dk, 'center');
    drawNum(G.score, VW / 2, VH * 0.47, 4, PAL.y, 'center');
    const bw = Math.min(170, VW * 0.24);
    const nx = G.stage + 1;
    if (G.win && nx < STAGES.length) {
      drawButton(button(VW / 2 - bw - 88, VH * 0.7, bw, 40, () => startStage(nx)), 'つぎの めん', PAL.y);
    }
    drawButton(button(VW / 2 - bw / 2, VH * 0.7, bw, 40, () => startStage(G.stage)), 'もういちど', PAL.c);
    drawButton(button(VW / 2 + 88, VH * 0.7, bw, 40, () => { bgmStop(); G.screen = 'title'; }),
               'めんを えらぶ', PAL.w);
  }
  crt();
}

function drawHud(B) {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(0, 0, VW, 28);
  retroText('スコア', 10, 7, 13, PAL.gy, null);
  drawNum(G.score, 62, 8, 3, PAL.w, 'left');
  retroText('ハイスコア', VW * 0.30, 7, 13, PAL.gy, null);
  drawNum(Math.max(save.hi, G.score), VW * 0.30 + 74, 8, 3, PAL.y, 'left');
  retroText('おうち', VW - 118, 7, 13, PAL.gy, null);
  drawNum(G.homes.filter((h) => h).length + '/' + G.HOMES.length, VW - 74, 8, 3, PAL.g, 'left');

  // のこり じかんの ぼう
  const bw = Math.min(220, VW * 0.3);
  const bx = B.x, by = B.y + B.c * FH + 6;
  ctx.fillStyle = 'rgba(248,248,248,0.18)';
  ctx.fillRect(bx, by, bw, 8);
  const k = Math.max(0, G.left / G.S.sec);
  ctx.fillStyle = k > 0.4 ? PAL.g : k > 0.2 ? PAL.y : PAL.r;
  ctx.fillRect(bx, by, bw * k, 8);
  retroText('じかん', bx + bw + 8, by - 3, 12, PAL.gy, null);

  // ★ のこりの カエルと めんの 名まえは、十字ボタンと かさならない 左がわに おく
  for (let i = 0; i < G.lives - 1; i++) drawFrog(bx + bw + 60 + i * 18, by - 6, 16, 0, false);
  retroText(G.S.name, bx + bw + 60 + Math.max(0, G.lives - 1) * 18 + 6, by - 4, 13, PAL.c, null);

  // ★ おしらせは ばんめんの 上に かさねると おうちが 見えなく なるので、
  //   いちばん 下の あいた ところに 出す。
  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    retroText(G.msg, Math.min(VW / 2, VW - 120), VH - 20, 14, PAL.y, PAL.dk, 'center');
    ctx.globalAlpha = 1;
  }
}

// ★ 十字ボタンは ゆびで さわる ものなので、かそう画面の たんいでは なく
//   じっさいの 画面の 大きさ（CSS ピクセル）を 見て 大きさを きめる。
//   まえは「よこはばの 4.5%」きめうちで、たて向きの スマホでは
//   14px ほどしか なく、ねらっても なかなか 当たらなかった。
//   たて長で 下に すきまが ある ときは、そこに でんと 大きく おく。
const PAD_TOUCH = 62;   // ゆびで 押したい 大きさ（CSS ピクセル）
let padHit = '', padHitT = 0;

function padBox() {
  const want = PAD_TOUCH / SC;   // かそう画面の たんいに なおす
  if (VOB >= 120) {
    const c = Math.max(want, Math.min(VW * 0.22, VOB * 0.30, 110 / SC));
    return { c: c, x: (VW - c * 3) / 2, y: VH + Math.max(8, (VOB - c * 3) / 2), band: true };
  }
  const c = Math.min(Math.max(want, 30), VH * 0.24, VW * 0.13);
  return { c: c, x: VW - c * 3 - 12, y: (VH - c * 3) / 2 + 8, band: false };
}

// 十字ボタンの ぶんの ばしょ。よこ長の ときは 右がわに あけて、
// ばんめんと かさならない ように する（たて長は 下に おくので 0）。
function padReserve() {
  const P = padBox();
  return P.band ? 0 : P.c * 3 + 22;
}

function drawPad() {
  const P = padBox(), c = P.c, g = Math.max(2, c * 0.07);
  const set = [[0, -1, 1, 0, '↑'], [-1, 0, 0, 1, '←'], [1, 0, 2, 1, '→'], [0, 1, 1, 2, '↓']];
  for (const [dx, dy, gx, gy, label] of set) {
    // 押せる はんいは マスいっぱい。見た目だけ すこし 内がわに 描く
    const b = button(P.x + gx * c, P.y + gy * c, c, c, () => hop(dx, dy));
    b.pad = dx + ',' + dy;
    const on = false;
    const flash = padHit === b.pad && padHitT > 0;
    ctx.fillStyle = flash ? PAL.w : on ? PAL.g : 'rgba(248,248,248,' + (P.band ? 0.34 : 0.24) + ')';
    ctx.fillRect(b.x + g, b.y + g, c - g * 2, c - g * 2);
    ctx.fillStyle = (flash || on) ? PAL.k : PAL.w;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(c * 0.46) + 'px system-ui, sans-serif';
    ctx.fillText(label, b.x + c / 2, b.y + c / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
}

// --- タイトル --------------------------------------------------------------------

function drawTitle() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  // うしろで 車が 走る
  for (let i = 0; i < 4; i++) {
    const y = VH - 116 + i * 22;
    const dirL = i % 2 === 1;
    const x = dirL ? VW - ((G.t * (60 + i * 20)) % (VW + 120)) : ((G.t * (60 + i * 20)) % (VW + 120)) - 100;
    ctx.globalAlpha = 0.4;
    drawCar(x, y, 54, 18, i, dirL);
    ctx.globalAlpha = 1;
  }

  retroText('あおいの', 24, 16, 22, PAL.c, PAL.dk);
  retroText('カエルわたり', 24, 42, 40, PAL.g, PAL.dk);
  retroText('道と 川を わたって おうちへ！', 26, 108, 15, PAL.w, null);

  const cols = VW > 700 ? 5 : 4;
  const cw = Math.min(120, (VW - 48 - (cols - 1) * 8) / cols), ch = 44;
  const y = 136;
  for (let i = 0; i < STAGES.length; i++) {
    const x = 24 + (i % cols) * (cw + 8), yy = y + Math.floor(i / cols) * (ch + 8);
    const open = i < save.open;
    const b = button(x, yy, cw, ch, open ? () => startStage(i) : null);
    ctx.fillStyle = PAL.dk;
    ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
    ctx.fillStyle = open ? (save.clear[i] ? PAL.g : PAL.b) : '#12142A';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = open ? PAL.w : PAL.gy;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(open ? STAGES[i].name : '？？', cw - 10, 15, 'bold ');
    ctx.fillText(open ? STAGES[i].name : '？？', b.x + cw / 2, b.y + 15);
    if (open) {
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = save.clear[i] ? PAL.k : PAL.c;
      ctx.fillText(Math.round(STAGES[i].sec) + ' びょう', b.x + cw / 2, b.y + 31);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  retroText('ハイスコア', 24, VH - 52, 13, PAL.gy, null);
  drawNum(save.hi, 100, VH - 53, 3, PAL.y, 'left');
  drawButton(button(VW - 232, VH - 40, 108, 30, () => { G.screen = 'howto'; }), 'あそびかた', PAL.c);
  drawButton(button(VW - 116, VH - 40, 100, 30, () => { sfxTest(); }), '♪ おと', PAL.w);
  retroText('v' + GAME_VER, 24, VH - 22, 12, PAL.gy, null);
  crt();
}

function drawHowto() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  retroText('あそびかた', 24, 14, 26, PAL.g, PAL.dk);
  const lines = [
    '① 十字ボタン（パソコンは 矢印キー）で 1ますずつ はねる',
    '② 車に あたらない ように 道を わたる',
    '③ 川は 丸太と カメの 上を つたって わたる',
    '④ いちばん 上の おうち 5つを ぜんぶ うめたら クリア',
  ].concat(TIPS);
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.7, 15);
    ctx.fillStyle = PAL.w;
    ctx.fillText(s, 24, 56 + i * 25);
  });
  drawFrog(VW - 90, 90, 40, 0, false);
  drawCar(VW - 110, 150, 70, 26, 0, false);
  drawLog(VW - 110, 196, 70, 26);
  drawTurtle(VW - 110, 240, 70, 26, 3, 0);
  drawButton(button(VW - 250, 12, 100, 30, () => { G.screen = 'title'; }), 'もどる', PAL.y);
  crt();
}

// --- そうさ ----------------------------------------------------------------------

// ゆび 1本ずつ おぼえて おく。
// 十字ボタンの 上で ゆびを すべらせても むきが 変わる ように する。
const touchAt = {};

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
  if (b && b.pad) { padHit = b.pad; padHitT = 0.14; }
  return b;
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const x = t.clientX - r.left, y = t.clientY - r.top;
    const b = tapAt(x, y);
    touchAt[t.identifier] = { x: x, y: y, pad: b ? b.pad : null };
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const s = touchAt[t.identifier];
    if (!s || !s.pad) continue;
    const b = hitBtn(t.clientX - r.left, t.clientY - r.top);
    if (b && b.pad && b.pad !== s.pad) {
      b.on(); s.pad = b.pad; padHit = b.pad; padHitT = 0.14;
    }
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const s = touchAt[t.identifier];
    delete touchAt[t.identifier];
    // 十字ボタンから 始まった ゆびは、はらい（スワイプ）として あつかわない
    if (!s || s.pad) continue;
    const dx = (t.clientX - r.left) - s.x, dy = (t.clientY - r.top) - s.y;
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
      if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 1 : -1, 0);
      else hop(0, dy > 0 ? 1 : -1);
    }
  }
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) delete touchAt[e.changedTouches[i].identifier];
});
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('keydown', (e) => {
  audioStart();
  if (e.code === 'ArrowLeft') { e.preventDefault(); hop(-1, 0); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); hop(1, 0); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); hop(0, -1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); hop(0, 1); }
});


// たて長の ときだけ、下の あいた ところに あんないを 出す
function portraitTip() {
  if (VOY < 26) return;
  if (VOB >= 120 && G.screen === 'play') return;   // そこは 十字ボタンの ばしょ
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('よこ向きに すると 大きく なるよ', VW / 2, VH + Math.min(VOY * 0.55, 26));
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- メインループ ----------------------------------------------------------------

let last = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);

  update(dt);
  if (padHitT > 0) padHitT -= dt;

  // レターボックスの すきまを 消す（十字ボタンを そこに 描く ため）
  if (VOB > 0) {
    ctx.fillStyle = PAL.k;
    ctx.fillRect(0, -VOY - 2, VW, VOY + 4);
    ctx.fillRect(0, VH - 2, VW, VOB + 4);
  }

  ui.buttons = [];
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();

  portraitTip();
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
