// 画面・そうさ・メインループ。
//
// こまは ねこの かお。くろねこ が 自分、しろねこ が あいて。
// ひっくり返る とちゅうは よこに つぶして、まん中で 色が 入れかわる。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, DPR = 1;

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
  VOY = Math.max(0, (H / SC - VH) / 2);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

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

function drawButton(b, label, col, textCol, sub) {
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.28)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#12301F';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(18,48,31,0.72)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.85);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC - VOY;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  // ★ 小さい ボタンは ゆびで 当てにくい、と 言われた。どれにも あたらなかった
  //   ときだけ、まわりを 少し ひろげて もう一度 さがす（見た目は そのまま）。
  const need = 40 / (typeof SC === 'number' && SC > 0 ? SC : 1);
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if (!mx && !my) continue;
    if (x >= b.x - mx && x <= b.x + b.w + mx &&
        y >= b.y - my && y <= b.y + b.h + my) return b;
  }
  return null;
}

// --- ねこの こま -------------------------------------------------------------------

// sx = よこの つぶれぐあい（1 = ふつう、0 = 真よこ）
function drawCat(x, y, r, col, sx) {
  const dark = col === BLACK;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.02, sx === undefined ? 1 : sx), 1);
  const body = dark ? '#3A3040' : '#FFF6F8';
  const line = dark ? '#1E1826' : '#D8C4CC';
  // みみ
  ctx.fillStyle = body;
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * r * 0.34, -r * 0.78);
    ctx.lineTo(sg * r * 0.78, -r * 1.36);
    ctx.lineTo(sg * r * 0.92, -r * 0.58);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = dark ? '#6A5A72' : '#FFD0DE';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * r * 0.46, -r * 0.78);
    ctx.lineTo(sg * r * 0.72, -r * 1.16);
    ctx.lineTo(sg * r * 0.80, -r * 0.66);
    ctx.closePath(); ctx.fill();
  }
  // かお
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = Math.max(1.4, r * 0.10); ctx.stroke();
  // 目
  ctx.fillStyle = dark ? '#FFE066' : '#3A3040';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * r * 0.34, -r * 0.08, r * 0.13, r * 0.19, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = dark ? '#FFFFFF' : '#FFFFFF';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.arc(sg * r * 0.34 - r * 0.05, -r * 0.14, r * 0.055, 0, 7); ctx.fill();
  }
  // はな と 口
  ctx.fillStyle = dark ? '#FF9FC0' : '#FF9FB8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.10, r * 0.12); ctx.lineTo(r * 0.10, r * 0.12);
  ctx.lineTo(0, r * 0.26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,60,0.6)';
  ctx.lineWidth = Math.max(1.1, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-r * 0.13, r * 0.30, r * 0.14, -0.3, Math.PI - 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 0.13, r * 0.30, r * 0.14, 0.6, Math.PI + 0.3); ctx.stroke();
  // ひげ
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.35)' : 'rgba(120,90,110,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (const sg of [-1, 1]) for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(sg * r * 0.34, r * 0.16 + i * r * 0.10);
    ctx.lineTo(sg * r * 0.92, r * 0.10 + i * r * 0.18);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // ほっぺ
  ctx.fillStyle = dark ? 'rgba(255,140,180,0.30)' : 'rgba(255,140,170,0.40)';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * r * 0.62, r * 0.24, r * 0.17, r * 0.11, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// --- あそんでいる 画面 -----------------------------------------------------------

function boardBox() {
  const pad = 12;
  const size = Math.min(VH - 56, VW * 0.56);
  return { x: Math.max(pad, (VW - size) / 2 - Math.min(120, VW * 0.14)), y: 44, s: size, c: size / N };
}

function drawPlay(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1B6A4A'); g.addColorStop(1, '#0E3A2A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  const B = boardBox();
  // ばん
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  rr(ctx, B.x - 8, B.y - 8, B.s + 16, B.s + 16, 12); ctx.fill();
  ctx.fillStyle = '#2A8A5E';
  rr(ctx, B.x, B.y, B.s, B.s, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.6;
  for (let i = 1; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(B.x + i * B.c, B.y); ctx.lineTo(B.x + i * B.c, B.y + B.s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(B.x, B.y + i * B.c); ctx.lineTo(B.x + B.s, B.y + i * B.c); ctx.stroke();
  }
  // 目じるしの てん
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (const [i, j] of [[2, 2], [2, 6], [6, 2], [6, 6]]) {
    ctx.beginPath(); ctx.arc(B.x + i * B.c, B.y + j * B.c, 3, 0, 7); ctx.fill();
  }

  // こま
  const flipMap = {};
  for (const f of G.flip) flipMap[f.x + ',' + f.y] = f;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = G.bd[y][x];
      if (!v) continue;
      const cx = B.x + (x + 0.5) * B.c, cy = B.y + (y + 0.5) * B.c;
      const f = flipMap[x + ',' + y];
      if (f) {
        // ★ 0.42びょう かけて よこに つぶれ、まん中で 色が かわる
        const k = 1 - G.flipT / 0.42;
        const sx = Math.abs(Math.cos(k * Math.PI));
        const col = k < 0.5 ? (f.col === BLACK ? WHITE : BLACK) : f.col;
        drawCat(cx, cy, B.c * 0.40, col, sx);
      } else {
        drawCat(cx, cy, B.c * 0.40, v, 1);
      }
    }
  }
  // さいごに おいた ところ
  if (G.last) {
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 3;
    rr(ctx, B.x + G.last.x * B.c + 2, B.y + G.last.y * B.c + 2, B.c - 4, B.c - 4, 6);
    ctx.stroke();
  }
  // おける ところ
  if (G.turn === BLACK && !G.over && G.flipT <= 0) {
    for (const m of G.moves) {
      const cx = B.x + (m.x + 0.5) * B.c, cy = B.y + (m.y + 0.5) * B.c;
      const b = button(B.x + m.x * B.c, B.y + m.y * B.c, B.c, B.c,
                       ((q) => () => humanPlay(q.x, q.y))(m));
      if (G.hint) {
        ctx.fillStyle = 'rgba(255,230,102,' + (0.28 + 0.16 * Math.sin(t * 4)) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, B.c * 0.20, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.round(B.c * 0.28) + 'px system-ui, sans-serif';
        ctx.fillText(String(m.g.length), cx, cy);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      }
      void b;
    }
  }

  drawSide(B, t);
  drawTop();

  if (G.over) {
    ctx.fillStyle = 'rgba(6,24,15,0.7)';
    ctx.fillRect(0, 0, VW, VH);
    const R = G.result;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = R.win ? '#FFE066' : R.draw ? '#8FD6FF' : '#FF9FB0';
    fitFont(R.win ? 'あなたの 勝ち！' : R.draw ? 'ひきわけ！' : 'あいての 勝ち…', VW * 0.6, 46, 'bold ');
    ctx.fillText(R.win ? 'あなたの 勝ち！' : R.draw ? 'ひきわけ！' : 'あいての 勝ち…', VW / 2, VH * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('くろねこ ' + R.b + '　－　しろねこ ' + R.w, VW / 2, VH * 0.42);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const bw = Math.min(190, VW * 0.24);
    const nx = G.level + 1;
    if (R.win && nx < LEVELS.length) {
      drawButton(button(VW / 2 - bw - 90, VH * 0.6, bw, 44, () => startGame(nx)),
                 'つよい あいてと', '#FFD166', '#12301F', LEVELS[nx].name);
    }
    drawButton(button(VW / 2 - bw / 2, VH * 0.6, bw, 44, () => startGame(G.level)), 'もう一度', '#8FD6FF');
    drawButton(button(VW / 2 + 90, VH * 0.6, bw, 44, () => { bgmStop(); G.screen = 'title'; }),
               'あいてを えらぶ', 'rgba(255,255,255,0.85)');
  }
}

function drawSide(B, t) {
  const x = B.x + B.s + 20, w = VW - x - 12;
  if (w < 100) return;
  const b = countDisc(G.bd, BLACK), wd = countDisc(G.bd, WHITE);
  ctx.fillStyle = 'rgba(6,24,15,0.5)';
  rr(ctx, x, 44, w, 190, 12); ctx.fill();

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  drawCat(x + w * 0.28, 78, 22, BLACK, 1);
  drawCat(x + w * 0.72, 78, 22, WHITE, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(b), x + w * 0.28, 104);
  ctx.fillText(String(wd), x + w * 0.72, 104);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('あなた', x + w * 0.28, 136);
  ctx.fillText(LEVELS[G.level].name, x + w * 0.72, 136);

  // どちらの ばん か
  ctx.fillStyle = G.turn === BLACK ? '#FFE066' : '#8FD6FF';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(G.turn === BLACK ? 'あなたの ばん' : 'あいてが 考え中…', x + w / 2, 162);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('のこり ' + (N * N - b - wd) + ' ます', x + w / 2, 190);
  ctx.textAlign = 'left';

  const hb = button(x + 8, 206, w - 16, 24, () => { G.hint = !G.hint; sfxTap(); });
  drawButton(hb, G.hint ? 'ヒント：あり' : 'ヒント：なし', G.hint ? '#8FF0C0' : 'rgba(255,255,255,0.3)');

  // ちいさな あんない
  if (w > 130) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('数字は とれる かず', x + w / 2, 244);
    ctx.fillText('四すみは とても つよい', x + w / 2, 260);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(6,24,15,0.6)';
  rr(ctx, 8, 6, VW - 16, 30, 10); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  fitFont('あいて … ' + LEVELS[G.level].name, VW * 0.3, 15, 'bold ');
  ctx.fillText('あいて … ' + LEVELS[G.level].name, 20, 21);
  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center';
    fitFont(G.msg, VW * 0.36, 15, 'bold ');
    ctx.fillText(G.msg, VW * 0.56, 21);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(VW - 92, 8, 84, 26, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');
}

// --- タイトル --------------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1B7A52'); g.addColorStop(1, '#0E3A2A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのねこオセロ', VW * 0.42, 40, 'bold ');
  ctx.fillText('ゆいのねこオセロ', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#DFF6E6';
  const ss = fitFont('はさんで ひっくり返そう。あいての つよさは 5だんかい', VW * 0.5, 15);
  ctx.fillText('はさんで ひっくり返そう。あいての つよさは 5だんかい', 26, y);
  y += ss + 16;

  for (let i = 0; i < LEVELS.length; i++) {
    const bw = Math.min(430, VW * 0.56), bh = 46;
    const b = button(24, y + i * (bh + 8), bw, bh, () => startGame(i));
    const cleared = (save.win[i] || 0) > 0;
    ctx.fillStyle = cleared ? '#8FF0C0' : '#DFF6E6';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    drawCat(b.x + 26, b.y + bh / 2, 15, WHITE, 1);
    ctx.fillStyle = '#12301F';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fitFont(LEVELS[i].name, bw * 0.3, 17, 'bold ');
    ctx.fillText(LEVELS[i].name, b.x + 50, b.y + bh / 2 - 8);
    ctx.fillStyle = 'rgba(18,48,31,0.7)';
    fitFont(LEVELS[i].about, bw * 0.44, 12);
    ctx.fillText(LEVELS[i].about, b.x + 50, b.y + bh / 2 + 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#12301F';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('勝ち ' + (save.win[i] || 0) + '　負け ' + (save.lose[i] || 0), b.x + bw - 12, b.y + bh / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // 見本の ばん
  const bx = Math.min(VW - 190, VW * 0.66), sz = Math.min(170, VW * 0.24);
  if (sz > 110) {
    const c = sz / 4;
    ctx.fillStyle = '#2A8A5E';
    rr(ctx, bx, 120, sz, sz, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(bx + i * c, 120); ctx.lineTo(bx + i * c, 120 + sz); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, 120 + i * c); ctx.lineTo(bx + sz, 120 + i * c); ctx.stroke();
    }
    const demo = [[1, 1, WHITE], [2, 1, BLACK], [1, 2, BLACK], [2, 2, WHITE], [0, 0, BLACK], [3, 3, WHITE]];
    for (const [i, j, col] of demo) {
      const k = ((t * 1.2 + i + j) % 4) < 2 ? col : (col === BLACK ? WHITE : BLACK);
      drawCat(bx + (i + 0.5) * c, 120 + (j + 0.5) * c, c * 0.40, k, 1);
    }
  }

  drawButton(button(VW - 232, VH - 44, 108, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#DFF6E6');
  drawButton(button(VW - 116, VH - 44, 100, 32, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto(t) {
  ctx.fillStyle = '#0E3A2A'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#DFF6E6';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① あなたは くろねこ。ひかって いる ますを おす',
    '② じぶんの こまで あいての こまを はさむと、ぜんぶ 自分の 色に なる',
    '③ ますの 数字は「そこに おくと 何こ とれるか」',
    '④ どちらも おけなく なったら おしまい。多いほうの 勝ち',
  ].concat(TIPS);
  ctx.fillStyle = '#EFFAF2';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.72, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  drawCat(VW - 90, 120, 40, BLACK, 1);
  drawCat(VW - 90, 230, 40, WHITE, 1);
  ctx.fillStyle = '#DFF6E6';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('あなた', VW - 90, 168);
  ctx.fillText('あいて', VW - 90, 278);
  ctx.textAlign = 'left';
  drawButton(button(VW - 250, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- そうさ ----------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});


// たて長の ときだけ、下の あいた ところに あんないを 出す
function portraitTip() {
  if (VOY < 26) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('よこ向きに すると 大きく なるよ', VW / 2, VH + Math.min(VOY * 0.55, 26));
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- メインループ ----------------------------------------------------------------

let last = 0, tsec = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);
  tsec += dt;

  update(dt);

  ui.buttons = [];
  if (G.screen === 'title') drawTitle(tsec);
  else if (G.screen === 'howto') drawHowto(tsec);
  else drawPlay(tsec);

  portraitTip();
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
