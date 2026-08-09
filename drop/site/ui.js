// 画面・そうさ・メインループ。
//
// たまは 色ごとに どうぶつの かおに して ある。
// 「同じ 色＝同じ かお」なので、色の 見わけが つきにくい 子でも 分かる。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = H / VH;
  VW = W / SC;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
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
  ctx.fillStyle = textCol || '#2A2440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,36,64,0.72)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.85);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- たまを 描く ------------------------------------------------------------------

function drawBlob(c, x, y, s, t, k) {
  const B = BLOBS[c];
  if (!B) return;
  const r = s * 0.46;
  ctx.save();
  ctx.translate(x, y);
  if (k) ctx.scale(1 + k * 0.25, 1 - k * 0.15);   // 消える とき ふくらむ

  // みみ・かたち（色ごとに ちがう どうぶつ）
  ctx.fillStyle = B.col;
  if (B.face === 'cat') {
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.30, -r * 0.70);
      ctx.lineTo(sg * r * 0.72, -r * 1.18);
      ctx.lineTo(sg * r * 0.82, -r * 0.52);
      ctx.closePath(); ctx.fill();
    }
  } else if (B.face === 'usa') {
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.40, -r * 1.02, r * 0.20, r * 0.52, sg * 0.16, 0, 7); ctx.fill();
    }
  } else if (B.face === 'frog') {
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.72, r * 0.28, 0, 7); ctx.fill();
    }
  } else if (B.face === 'fish') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, 0); ctx.lineTo(-r * 1.24, -r * 0.34);
    ctx.lineTo(-r * 1.24, r * 0.34); ctx.closePath(); ctx.fill();
  }

  // からだ
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = B.dark; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.26, r * 0.17, -0.5, 0, 7); ctx.fill();

  if (B.face === 'chick') {                       // くちばし
    ctx.fillStyle = '#F0A03A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, r * 0.16); ctx.lineTo(r * 0.18, r * 0.16);
    ctx.lineTo(0, r * 0.44); ctx.closePath(); ctx.fill();
  }
  if (B.face === 'frog') {                        // 目玉の 白
    ctx.fillStyle = '#FFFFFF';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.72, r * 0.19, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#2A2430';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.52, -r * 0.70, r * 0.10, 0, 7); ctx.fill();
    }
  }

  // 目
  if (B.face !== 'frog') {
    ctx.fillStyle = '#2A2430';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.32, -r * 0.10, r * 0.11, r * 0.15, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.32 - r * 0.04, -r * 0.16, r * 0.05, 0, 7); ctx.fill();
    }
  }
  // ほっぺ
  ctx.fillStyle = 'rgba(255,120,150,0.35)';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * r * 0.60, r * 0.16, r * 0.16, r * 0.11, 0, 0, 7); ctx.fill();
  }
  // 口
  if (B.face !== 'chick') {
    ctx.strokeStyle = '#2A2430'; ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, r * 0.10, r * 0.20, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

// --- あそんでいる 画面 -----------------------------------------------------------

function boardBox() {
  const padTop = 44, padBot = 62;
  const h = VH - padTop - padBot;
  const cell = Math.floor(Math.min(h / (ROWS - 1), (VW * 0.42) / COLS));
  const w = cell * COLS;
  return { x: Math.round((VW - w) / 2), y: padTop, w: w, h: cell * (ROWS - 1), cell: cell };
}

function drawPlay(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3E2E5E'); g.addColorStop(1, '#241C3A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // うしろの ほし
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 22; i++) {
    const x = ((i * 197) % (VW - 20)) + 10;
    const y = ((i * 113) % (VH - 20)) + 10;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill();
  }

  const B = boardBox();
  const sh = G.shake > 0 ? Math.sin(G.shake * 70) * G.shake * 8 : 0;
  ctx.save();
  ctx.translate(sh, 0);

  // 板
  ctx.fillStyle = 'rgba(10,6,20,0.55)';
  rr(ctx, B.x - 6, B.y - 6, B.w + 12, B.h + 12, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
  rr(ctx, B.x - 6, B.y - 6, B.w + 12, B.h + 12, 12); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath(); ctx.moveTo(B.x + x * B.cell, B.y); ctx.lineTo(B.x + x * B.cell, B.y + B.h); ctx.stroke();
  }

  // ★ 板の 外に はみ出して 描かない ように、ここで 切りぬく。
  //   落ちてくる くみは 見えない 1行めから 来るので、そのままだと 上に はみ出す。
  ctx.save();
  rr(ctx, B.x - 2, B.y - 2, B.w + 4, B.h + 4, 10); ctx.clip();

  // つんである たま（いちばん 上の 行は かくれ ぶぶんなので 出さない）
  for (let y = 1; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = G.bd[y][x];
      if (!c) continue;
      drawBlob(c, B.x + (x + 0.5) * B.cell, B.y + (y - 0.5) * B.cell, B.cell, t);
    }
  }

  // 消える えんしゅつ
  for (const q of G.pop) {
    const k = q.t / 0.45;
    ctx.globalAlpha = Math.max(0, 1 - k);
    drawBlob(q.c, B.x + (q.x + 0.5) * B.cell, B.y + (q.y - 0.5) * B.cell, B.cell * (1 + k), t, k);
    ctx.globalAlpha = 1;
  }

  // 落ちてくる くみ
  if (G.cur) {
    const p = G.cur, s = subPos(p);
    const off = G.phase === 'fall' ? (G.fallT / G.S.fall) : 0;
    const yy = (v) => B.y + (v - 0.5 + off) * B.cell;
    // 落ちる さきの あんない（うすい 線）
    let gy = p.y;
    while (canPlace({ x: p.x, y: gy + 1, rot: p.rot })) gy++;
    const gs = subPos({ x: p.x, y: gy, rot: p.rot });
    // 落ちる さきは 色の わっかで 見せる（うすい たまを 置くと 本物と まぎらわしい）
    const ring = (c, cx, cy) => {
      ctx.strokeStyle = BLOBS[c].col;
      ctx.globalAlpha = 0.55; ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, B.cell * 0.42, 0, 7); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    if (gy >= 1) ring(p.a, B.x + (p.x + 0.5) * B.cell, B.y + (gy - 0.5) * B.cell);
    if (gs.y >= 1) ring(p.b, B.x + (gs.x + 0.5) * B.cell, B.y + (gs.y - 0.5) * B.cell);
    if (p.y >= 0) drawBlob(p.a, B.x + (p.x + 0.5) * B.cell, yy(p.y), B.cell, t);
    if (s.y >= 0) drawBlob(p.b, B.x + (s.x + 0.5) * B.cell, yy(s.y), B.cell, t);
  }
  ctx.restore();   // 切りぬきを もどす
  ctx.restore();

  drawSide(B, t);
  drawPad(B);
  drawTop();

  if (G.over) {
    ctx.fillStyle = 'rgba(10,6,20,0.6)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FF9FB0';
    fitFont(G.win ? 'クリア！' : 'つみあがった…', VW * 0.6, 52, 'bold ');
    ctx.fillText(G.win ? 'クリア！' : 'つみあがった…', VW / 2, VH * 0.4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const bw = Math.min(180, VW * 0.24);
    drawButton(button(VW / 2 - bw - 90, VH * 0.6, bw, 44,
      () => startStage(G.win && G.stage + 1 < STAGES.length ? G.stage + 1 : G.stage)),
      G.win && G.stage + 1 < STAGES.length ? 'つぎの めん' : 'もう一度', '#FFD166');
    drawButton(button(VW / 2 - bw / 2, VH * 0.6, bw, 44, () => startStage(G.stage)), 'やりなおす', '#8FD6FF');
    drawButton(button(VW / 2 + 90, VH * 0.6, bw, 44, () => { bgmStop(); G.screen = 'title'; }),
      'めんを えらぶ', 'rgba(255,255,255,0.85)');
  }
}

// 右がわ：つぎの くみ・点・のこり
function drawSide(B, t) {
  const x = B.x + B.w + 24;
  const w = Math.max(96, Math.min(190, VW - x - 12));
  if (w < 80) return;
  ctx.fillStyle = 'rgba(10,6,20,0.5)';
  rr(ctx, x, 44, w, 168, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('つぎ', x + w / 2, 52);
  if (G.next) {
    const c = Math.min(40, w * 0.32);
    drawBlob(G.next.b, x + w / 2, 84, c, t);
    drawBlob(G.next.a, x + w / 2, 84 + c, c, t);
  }
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(String(G.score), x + w / 2, 152);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('のこり ' + Math.max(0, G.S.need - G.cleared) + ' こ', x + w / 2, 180);
  ctx.textAlign = 'left';

  // 左がわ：どの 色が 何こ あるか（あそび方の ヒント）
  const lx = B.x - 24 - 74;
  if (lx > 6) {
    ctx.fillStyle = 'rgba(10,6,20,0.5)';
    rr(ctx, lx, 44, 74, 34 + G.S.cols * 30, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ばんの 中', lx + 37, 52);
    for (let c = 1; c <= G.S.cols; c++) {
      let n = 0;
      for (let y = 1; y < ROWS; y++) for (let xx = 0; xx < COLS; xx++) if (G.bd[y][xx] === c) n++;
      drawBlob(c, lx + 24, 84 + (c - 1) * 30, 26, t);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(n), lx + 44, 78 + (c - 1) * 30);
    }
    ctx.textAlign = 'left';
  }
}

// 下の そうさボタン
function drawPad(B) {
  const y = VH - 56, h = 46;
  const bw = Math.min(96, (VW - 40) / 4 - 8);
  const total = bw * 4 + 24;
  const x0 = (VW - total) / 2;
  const set = [
    ['◀', () => moveX(-1), '#8FD6FF'],
    ['↻', () => rotate(), '#FFD166'],
    ['▶', () => moveX(1), '#8FD6FF'],
    ['⤓', () => softDrop(), '#FF9FC0'],
  ];
  for (let i = 0; i < 4; i++) {
    const b = button(x0 + i * (bw + 8), y, bw, h, set[i][1]);
    drawButton(b, set[i][0], set[i][2]);
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(10,6,20,0.6)';
  rr(ctx, 8, 6, VW - 16, 30, 10); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  fitFont(G.S.name, VW * 0.3, 15, 'bold ');
  ctx.fillText(G.S.name, 20, 21);
  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center';
    fitFont(G.msg, VW * 0.34, 16, 'bold ');
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
  g.addColorStop(0, '#5A3E8A'); g.addColorStop(1, '#241C3A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // ふってくる たま
  for (let i = 0; i < 10; i++) {
    const c = 1 + (i % 5);
    const x = 40 + ((i * 173) % (VW - 80));
    const y = ((t * (34 + i * 6) + i * 90) % (VH + 80)) - 40;
    ctx.globalAlpha = 0.22;
    drawBlob(c, x, y, 42, t + i);
    ctx.globalAlpha = 1;
  }

  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのぽとぽとパズル', VW * 0.46, 40, 'bold ');
  ctx.fillText('ゆいのぽとぽとパズル', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#F0E4FF';
  const ss = fitFont('おなじ どうぶつを 4つ くっつけて 消そう！ れんさを ねらえ', VW * 0.56, 15);
  ctx.fillText('おなじ どうぶつを 4つ くっつけて 消そう！ れんさを ねらえ', 26, y);
  y += ss + 14;

  const cols = VW > 700 ? 5 : 4;
  const cw = Math.min(146, (VW - 48 - (cols - 1) * 8) / cols), chh = 62;
  for (let i = 0; i < STAGES.length; i++) {
    const x = 24 + (i % cols) * (cw + 8), yy = y + Math.floor(i / cols) * (chh + 8);
    const open = i < save.open;
    const b = button(x, yy, cw, chh, open ? () => startStage(i) : null);
    ctx.fillStyle = open ? (save.clear[i] ? '#8FF0C0' : '#C9A9FF') : 'rgba(255,255,255,0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.fillStyle = open ? '#2A2440' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(STAGES[i].name, cw - 12, 14, 'bold ');
    ctx.fillText(open ? STAGES[i].name : '？？？', b.x + cw / 2, b.y + 8);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(open ? (STAGES[i].cols + '色　' + STAGES[i].need + 'こ 消す') : 'まだ',
                 b.x + cw / 2, b.y + 27);
    if (open && save.best[i]) {
      ctx.fillStyle = 'rgba(42,36,64,0.7)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('さいこう ' + save.best[i], b.x + cw / 2, b.y + 44);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('いちばん 長い れんさ　' + save.chain + ' れんさ', 24, VH - 76);

  drawButton(button(VW - 232, VH - 44, 108, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 44, 100, 32, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto(t) {
  ctx.fillStyle = '#241C3A'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#F0E4FF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 下の ◀ ▶ で よこに うごかす',
    '② ↻ で くるっと まわる',
    '③ ⤓ で すとんと 落とす',
    '④ おなじ どうぶつが 4つ つながると 消える',
  ].concat(TIPS);
  ctx.fillStyle = '#F0E4FF';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.7, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  // 見本
  for (let c = 1; c < BLOBS.length; c++) {
    drawBlob(c, VW - 70, 70 + (c - 1) * 62, 48, t + c);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(BLOBS[c].name, VW - 70, 70 + (c - 1) * 62 + 26);
    ctx.textAlign = 'left';
  }
  drawButton(button(VW - 240, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
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
  for (const t of e.changedTouches) tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('keydown', (e) => {
  audioStart();
  if (G.screen !== 'play') return;
  if (e.code === 'ArrowLeft') { e.preventDefault(); moveX(-1); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); moveX(1); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyZ') { e.preventDefault(); rotate(); }
  else if (e.code === 'ArrowDown' || e.code === 'Space') { e.preventDefault(); softDrop(); }
});

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

  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
