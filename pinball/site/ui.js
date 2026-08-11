// 画面・そうさ・メインループ。
//
// 台は「よこ100 × たて150」で 作って あるので、
// ここで 画面に 入る 大きさ（scale）を 出して、そのまま 拡大して 描く。

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
  ctx.fillStyle = textCol || '#2A1440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,20,64,0.72)';
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

// 台 → 画面
function tableBox() {
  const top = 8, bot = 8;
  const s = Math.min((VH - top - bot) / TH, (VW * 0.5) / TW);
  return { s: s, x: (VW - TW * s) / 2, y: top + ((VH - top - bot) - TH * s) / 2 };
}

// --- どうぶつバンパー -------------------------------------------------------------

function drawBumper(m, B, t) {
  const x = B.x + m.x * B.s, y = B.y + m.y * B.s, r = m.r * B.s;
  const k = m.hit > 0 ? 1 + m.hit * 0.7 : 1;
  const COL = { cat: '#FF9FC0', usa: '#D6BFFF', bear: '#E8C79A', frog: '#8FE0A0', pig: '#FFC7DC' };
  const c = COL[m.kind] || '#FF9FC0';
  ctx.save();
  ctx.translate(x, y); ctx.scale(k, k);
  // ひかり
  ctx.fillStyle = 'rgba(255,255,255,' + (m.hit > 0 ? 0.5 : 0.12) + ')';
  ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, 7); ctx.fill();
  // みみ
  ctx.fillStyle = c;
  if (m.kind === 'cat' || m.kind === 'pig') {
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.32, -r * 0.66); ctx.lineTo(sg * r * 0.76, -r * 1.16);
      ctx.lineTo(sg * r * 0.88, -r * 0.46); ctx.closePath(); ctx.fill();
    }
  } else if (m.kind === 'usa') {
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.40, -r * 1.02, r * 0.20, r * 0.54, sg * 0.16, 0, 7); ctx.fill();
    }
  } else if (m.kind === 'bear') {
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.68, -r * 0.72, r * 0.28, 0, 7); ctx.fill();
    }
  } else if (m.kind === 'frog') {
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.74, r * 0.30, 0, 7); ctx.fill();
    }
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,50,0.4)'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
  // かお
  ctx.fillStyle = '#2A2430';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * r * 0.32, -r * 0.08, r * 0.10, r * 0.15, 0, 0, 7); ctx.fill();
  }
  if (m.kind === 'frog') {
    ctx.fillStyle = '#FFFFFF';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.74, r * 0.19, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#2A2430';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.72, r * 0.10, 0, 7); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * r * 0.62, r * 0.18, r * 0.16, r * 0.11, 0, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#2A2430'; ctx.lineWidth = Math.max(1.2, r * 0.09); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, r * 0.10, r * 0.22, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

function drawStar(x, y, r, col, spin) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin || 0);
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr2, Math.sin(a) * rr2);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --- あそんでいる 画面 -----------------------------------------------------------

function drawPlay(t) {
  const T = G.T;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  const B = tableBox();
  const sh = G.shake > 0 ? Math.sin(G.shake * 80) * G.shake * 6 : 0;
  ctx.save();
  ctx.translate(sh, 0);

  // 台の 面
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, B.x - 4, B.y - 4, TW * B.s + 8, TH * B.s + 8, 12); ctx.fill();
  const tg = ctx.createLinearGradient(0, B.y, 0, B.y + TH * B.s);
  tg.addColorStop(0, 'rgba(255,255,255,0.10)'); tg.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = tg;
  rr(ctx, B.x, B.y, TW * B.s, TH * B.s, 10); ctx.fill();
  // きらきら もよう
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 20; i++) {
    const x = B.x + ((i * 37) % 92 + 4) * B.s;
    const y = B.y + ((i * 61) % 140 + 6) * B.s;
    drawStar(x, y, 3 + (i % 3), 'rgba(255,255,255,0.07)', t * 0.4 + i);
  }

  // かべ
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = WALL_R * 2 * B.s;
  ctx.lineCap = 'round';
  for (const w of G.walls) {
    ctx.beginPath();
    ctx.moveTo(B.x + w[0] * B.s, B.y + w[1] * B.s);
    ctx.lineTo(B.x + w[2] * B.s, B.y + w[3] * B.s);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // 出っぱり
  for (const p of G.post) {
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(B.x + p.x * B.s, B.y + p.y * B.s, p.r * B.s, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // まと（星）
  for (const q of G.target) {
    const x = B.x + q.x * B.s, y = B.y + q.y * B.s;
    if (q.down) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, q.r * B.s, 0, 7); ctx.stroke();
    } else {
      drawStar(x, y, q.r * B.s * 1.25, '#FFE066', t * 1.6);
      drawStar(x, y, q.r * B.s * 0.6, '#FFFFFF', -t * 1.2);
    }
  }

  // バンパー
  for (const m of G.bump) drawBumper(m, B, t);

  // フリッパー
  for (const s of ['l', 'r']) {
    const e = flipperEnds(s);
    ctx.strokeStyle = '#FF8FBB';
    ctx.lineWidth = 3.8 * B.s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(B.x + e.ax * B.s, B.y + e.ay * B.s);
    ctx.lineTo(B.x + e.bx * B.s, B.y + e.by * B.s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4 * B.s;
    ctx.beginPath();
    ctx.moveTo(B.x + e.ax * B.s, B.y + e.ay * B.s);
    ctx.lineTo(B.x + e.bx * B.s, B.y + e.by * B.s);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(B.x + e.ax * B.s, B.y + e.ay * B.s, 1.8 * B.s, 0, 7); ctx.fill();
  }

  // きらきら
  for (const s of G.spark) {
    ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
    drawStar(B.x + s.x * B.s, B.y + s.y * B.s, 3.5, s.col, s.t * 8);
    ctx.globalAlpha = 1;
  }

  // たま
  if (G.ball) {
    const x = B.x + G.ball.x * B.s, y = B.y + G.ball.y * B.s, r = BALL_R * B.s;
    const bg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r);
    bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#A8B4CC');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();

  drawHud(B, t);

  // 画面の 左半分／右半分が そのまま ボタン
  const lb = button(0, 0, VW / 2, VH, null); lb.side = 'l';
  const rb = button(VW / 2, 0, VW / 2, VH, null); rb.side = 'r';

  if (G.over) {
    ctx.fillStyle = 'rgba(10,4,20,0.68)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FF9FB0';
    fitFont(G.win ? 'クリア！' : 'おしまい', VW * 0.5, 50, 'bold ');
    ctx.fillText(G.win ? 'クリア！' : 'おしまい', VW / 2, VH * 0.32);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('てんすう ' + G.score + '　／　もくひょう ' + G.T.goal, VW / 2, VH * 0.44);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const bw = Math.min(180, VW * 0.24);
    const nx = G.table + 1;
    if (G.win && nx < TABLES.length) {
      drawButton(button(VW / 2 - bw - 90, VH * 0.62, bw, 44, () => startTable(nx)), 'つぎの 台', '#FFD166');
    }
    drawButton(button(VW / 2 - bw / 2, VH * 0.62, bw, 44, () => startTable(G.table)), 'もう一度', '#8FD6FF');
    drawButton(button(VW / 2 + 90, VH * 0.62, bw, 44, () => { bgmStop(); G.screen = 'title'; }),
               '台を えらぶ', 'rgba(255,255,255,0.85)');
  }
}

function drawHud(B, t) {
  const lw = B.x - 16;
  // 左：てんすう
  if (lw > 90) {
    ctx.fillStyle = 'rgba(10,4,20,0.5)';
    rr(ctx, 8, 12, lw, 132, 12); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('てんすう', 8 + lw / 2, 22);
    ctx.fillStyle = '#FFE066';
    fitFont(String(G.score), lw - 16, 30, 'bold ');
    ctx.fillText(String(G.score), 8 + lw / 2, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('もくひょう ' + G.T.goal, 8 + lw / 2, 78);
    // のこりの たま
    for (let i = 0; i < G.ballsLeft; i++) {
      const x = 8 + lw / 2 + (i - (G.ballsLeft - 1) / 2) * 22;
      const bg = ctx.createRadialGradient(x - 3, y0() - 3, 1, x, y0(), 8);
      bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#A8B4CC');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(x, y0(), 8, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('のこりの たま', 8 + lw / 2, 126);
    ctx.textAlign = 'left';
  }
  function y0() { return 108; }

  // 右：コンボ と ボタン
  const rx = B.x + TW * B.s + 16, rw = VW - rx - 8;
  if (rw > 90) {
    ctx.fillStyle = 'rgba(10,4,20,0.5)';
    rr(ctx, rx, 52, rw, 96, 12); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('つづけて', rx + rw / 2, 62);
    ctx.fillStyle = G.combo > 3 ? '#FF9FC0' : '#FFFFFF';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(G.combo + ' かい', rx + rw / 2, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('つづけて 当てると', rx + rw / 2, 114);
    ctx.fillText('てんすうが 上がる', rx + rw / 2, 128);
    ctx.textAlign = 'left';
    drawButton(button(rx, 12, rw, 30, () => { bgmStop(); G.screen = 'title'; }),
               'やめる', 'rgba(255,255,255,0.85)');
  }

  // 打ち出し あんない
  if (G.launch) {
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (20 + Math.sin(t * 6) * 2) + 'px system-ui, sans-serif';
    ctx.fillText('画面を おして 打ち出す！', VW / 2, VH - 40);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  } else if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.msg, VW * 0.7, 17, 'bold ');
    ctx.fillText(G.msg, VW / 2, VH - 22);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
  }
}

// --- タイトル --------------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#5A2A7A'); g.addColorStop(1, '#1B1030');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  for (let i = 0; i < 16; i++) {
    const x = ((i * 149) % (VW - 40)) + 20;
    const y = ((t * 20 + i * 53) % (VH + 40)) - 20;
    drawStar(x, y, 4 + (i % 4) * 2, 'rgba(255,255,255,0.12)', t + i);
  }

  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのキラキラピンボール', VW * 0.5, 38, 'bold ');
  ctx.fillText('ゆいのキラキラピンボール', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#FFE6F2';
  const ss = fitFont('左半分で 左の はね、右半分で 右の はね。たま 3こ しょうぶ', VW * 0.56, 15);
  ctx.fillText('左半分で 左の はね、右半分で 右の はね。たま 3こ しょうぶ', 26, y);
  y += ss + 16;

  const cols = VW > 700 ? 3 : 2;
  const cw = Math.min(210, (VW - 48 - (cols - 1) * 10) / cols), chh = 74;
  for (let i = 0; i < TABLES.length; i++) {
    const x = 24 + (i % cols) * (cw + 10), yy = y + Math.floor(i / cols) * (chh + 10);
    const open = i < save.open;
    const b = button(x, yy, cw, chh, open ? () => startTable(i) : null);
    ctx.fillStyle = open ? (save.clear[i] ? '#8FF0C0' : '#FF9FC0') : 'rgba(255,255,255,0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.fillStyle = open ? '#2A1440' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(TABLES[i].name, cw - 14, 16, 'bold ');
    ctx.fillText(open ? TABLES[i].name : '？？？', b.x + cw / 2, b.y + 10);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(open ? 'もくひょう ' + TABLES[i].goal + ' てん' : 'まだ', b.x + cw / 2, b.y + 32);
    if (open && save.best[i]) {
      ctx.fillStyle = 'rgba(42,20,64,0.7)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('さいこう ' + save.best[i], b.x + cw / 2, b.y + 52);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  drawButton(button(VW - 232, VH - 44, 108, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 44, 100, 32, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto(t) {
  ctx.fillStyle = '#1B1030'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#FFE6F2';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 画面を おすと たまが 打ち出される',
    '② 画面の 左半分＝左の はね、右半分＝右の はね',
    '③ たまが 下に 落ちる まえに はねで 打ち返そう',
    '④ たま 3こ つかって、もくひょうの てんすうに とどけば クリア',
  ].concat(TIPS);
  ctx.fillStyle = '#F4E8FF';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.7, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  for (let i = 0; i < BUMP_KIND.length; i++) {
    drawBumper({ x: 0, y: 0, r: 1, hit: 0, kind: BUMP_KIND[i] },
               { x: VW - 74, y: 76 + i * 62, s: 22 }, t);
  }
  drawButton(button(VW - 250, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- そうさ ----------------------------------------------------------------------

function sideAt(px) { return (px / SC) < VW / 2 ? 'l' : 'r'; }

function down(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) { b.on(); return; }
  if (G.screen !== 'play' || G.over) return;
  if (G.launch) { launch(); return; }
  G.hold[sideAt(px)] = true;
}
function upSide(px) {
  if (px === undefined) { G.hold.l = false; G.hold.r = false; return; }
  G.hold[sideAt(px)] = false;
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) down(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) upSide(t.clientX - r.left);
}, { passive: false });
canvas.addEventListener('touchcancel', () => upSide());
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  down(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => upSide());
window.addEventListener('keydown', (e) => {
  audioStart();
  if (G.screen !== 'play') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyZ') { e.preventDefault(); if (G.launch) launch(); else G.hold.l = true; }
  if (e.code === 'ArrowRight' || e.code === 'Slash') { e.preventDefault(); if (G.launch) launch(); else G.hold.r = true; }
  if (e.code === 'Space') { e.preventDefault(); if (G.launch) launch(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyZ') G.hold.l = false;
  if (e.code === 'ArrowRight' || e.code === 'Slash') G.hold.r = false;
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
