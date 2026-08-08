// 画面・そうさ・メインループ。
//
// ★ ラケットは ゆびの よこの ばしょに あわせる。たては 見ない。
//   画面の どこを さわっても いい（ラケットの 上を さわらなくて いい）。

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
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#2A2440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.36 : 0.46), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,36,64,0.7)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.8);
  }
  ctx.textAlign = 'left';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- え ------------------------------------------------------------------------------

function drawBrick(b) {
  const box = brickBox(b.c, b.r);
  const K = BRICK[b.k];
  const x = box.x + 2, y = box.y + 2, w = box.w - 4, h = box.h - 4;
  let col = K.col;
  if (b.k === 'h' && b.hp === 1) col = '#FFE0A8';
  if (b.k === 'H') col = b.hp === 3 ? '#B98FE0' : b.hp === 2 ? '#CDB0EC' : '#E4D4F6';
  if (b.hit > 0.4) col = '#FFFFFF';
  ctx.fillStyle = col;
  rr(ctx, x, y, w, h, 4); ctx.fill();
  // 上の ひかり
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  rr(ctx, x + 2, y + 2, w - 4, h * 0.34, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,30,0.45)'; ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 4); ctx.stroke();

  if (b.k === 's') {
    // はがね（ななめの しま）
    ctx.save();
    ctx.beginPath(); rr(ctx, x, y, w, h, 4); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    for (let i = -h; i < w; i += 9) {
      ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke();
    }
    ctx.restore();
  } else if (b.k === 'b') {
    // ばくだん
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, h * 0.30, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FF6B7A'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 5, y + h / 2 - 5); ctx.lineTo(x + w / 2 + 5, y + h / 2 + 5);
    ctx.moveTo(x + w / 2 + 5, y + h / 2 - 5); ctx.lineTo(x + w / 2 - 5, y + h / 2 + 5);
    ctx.stroke();
  } else if (b.k === '?') {
    ctx.fillStyle = '#1E3A2A';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('?', x + w / 2, y + h / 2 + 1);
    ctx.textAlign = 'left';
  } else if (b.k === 'H' || b.k === 'h') {
    // のこり 回数の 点
    ctx.fillStyle = 'rgba(40,26,54,0.6)';
    for (let i = 0; i < b.hp; i++) {
      ctx.beginPath();
      ctx.arc(x + w / 2 + (i - (b.hp - 1) / 2) * 9, y + h * 0.72, 2.6, 0, 7);
      ctx.fill();
    }
  }
}

// ★ リナパパ。メガネの ちょいぽちゃ。
function drawPapa(p, t) {
  const r = p.r;
  ctx.save();
  ctx.translate(p.x, p.y);
  const wob = Math.sin(t * 3.4) * r * 0.05;
  const dead = p.hp <= 0;
  if (dead) ctx.globalAlpha = 0.25;
  // からだ
  ctx.fillStyle = p.hit > 0.4 ? '#FFFFFF' : '#5A8A6A';
  // ★ からだは かおの 下から しっかり 出す。ちかいと かおに かくれて
  //   「顔だけ うかんで いる」ように 見える。
  ctx.beginPath(); ctx.ellipse(wob, r * 1.06, r * 0.94, r * 0.60, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(20,40,28,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  // 手
  ctx.fillStyle = '#F2C9A8';
  ctx.beginPath(); ctx.ellipse(wob - r * 0.98, r * 0.98, r * 0.22, r * 0.19, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(wob + r * 0.98, r * 0.98, r * 0.22, r * 0.19, 0, 0, 7); ctx.fill();
  // かお（よこに 広い ＝ ちょいぽちゃ）
  ctx.fillStyle = p.hit > 0.4 ? '#FFFFFF' : '#F5CFAE';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.94, r * 0.86, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,50,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // ほっぺ
  ctx.fillStyle = 'rgba(255,150,150,0.35)';
  ctx.beginPath(); ctx.ellipse(-r * 0.56, r * 0.26, r * 0.20, r * 0.14, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.56, r * 0.26, r * 0.20, r * 0.14, 0, 0, 7); ctx.fill();
  // かみ
  ctx.fillStyle = '#3A3040';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.56, r * 0.92, r * 0.44, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * 0.84, -r * 0.24, r * 0.14, r * 0.26, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.84, -r * 0.24, r * 0.14, r * 0.26, -0.2, 0, 7); ctx.fill();
  // 目
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.08, r * 0.17, r * 0.20, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.32, -r * 0.08, r * 0.17, r * 0.20, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2440';
  ctx.beginPath(); ctx.arc(-r * 0.30, -r * 0.06, r * 0.09, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.34, -r * 0.06, r * 0.09, 0, 7); ctx.fill();
  // ★ メガネ
  ctx.strokeStyle = '#2A2440'; ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.08, r * 0.28, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.08, r * 0.28, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.04, -r * 0.08); ctx.lineTo(r * 0.04, -r * 0.08);
  ctx.moveTo(-r * 0.60, -r * 0.12); ctx.lineTo(-r * 0.88, -r * 0.18);
  ctx.moveTo(r * 0.60, -r * 0.12); ctx.lineTo(r * 0.88, -r * 0.18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.08, r * 0.19, -2.4, -1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.08, r * 0.19, -2.4, -1.5); ctx.stroke();
  // くち
  ctx.strokeStyle = '#8A5A48'; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.arc(0, r * 0.34, r * 0.26, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  if (!dead) {
    // のこり たいりょく
    const w = r * 2.2;
    ctx.fillStyle = 'rgba(20,14,30,0.6)';
    rr(ctx, p.x - w / 2, p.y - r - 16, w, 9, 4); ctx.fill();
    ctx.fillStyle = p.hp < p.max * 0.4 ? '#FF6B7A' : '#FFD166';
    rr(ctx, p.x - w / 2 + 1.5, p.y - r - 14.5, (w - 3) * (p.hp / p.max), 6, 3); ctx.fill();
  }
}

function drawCake(x, y, r) {
  ctx.fillStyle = '#F5D8A8';
  rr(ctx, x - r * 0.8, y - r * 0.1, r * 1.6, r * 0.9, 3); ctx.fill();
  ctx.fillStyle = '#FFB8D8';
  rr(ctx, x - r * 0.8, y + r * 0.2, r * 1.6, r * 0.2, 2); ctx.fill();
  ctx.fillStyle = '#FFF6F0';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.8, y - r * 0.1);
  for (let k = 0; k <= 3; k++) {
    ctx.quadraticCurveTo(x - r * 0.8 + (k + 0.5) * r * 0.53, y - r * 0.5,
                         x - r * 0.8 + (k + 1) * r * 0.53, y - r * 0.1);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF5A6E';
  ctx.beginPath(); ctx.arc(x, y - r * 0.55, r * 0.24, 0, 7); ctx.fill();
}

// --- あそんでいる 画面 ----------------------------------------------------------------

function drawPlay(t) {
  const F = fld();
  ctx.fillStyle = '#170F26'; ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(t * 70) * 5 * G.shake, Math.cos(t * 58) * 4 * G.shake);

  // あそぶ ところ
  const g = ctx.createLinearGradient(0, TOPBAR, 0, VH);
  g.addColorStop(0, '#241A38'); g.addColorStop(1, '#3A2450');
  ctx.fillStyle = g;
  ctx.fillRect(F.x0, TOPBAR, F.w, VH - TOPBAR);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(F.x0, VH); ctx.lineTo(F.x0, TOPBAR); ctx.lineTo(F.x1, TOPBAR); ctx.lineTo(F.x1, VH);
  ctx.stroke();

  for (const b of G.bricks) drawBrick(b);

  if (G.papa) drawPapa(G.papa, t);
  for (const c of G.cakes) drawCake(c.x, c.y, c.r);

  // アイテム
  for (const it of G.items) {
    ctx.fillStyle = ITEMS[it.k].col;
    rr(ctx, it.x - 13, it.y - 9, 26, 18, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    rr(ctx, it.x - 13, it.y - 9, 26, 18, 5); ctx.stroke();
    ctx.fillStyle = '#2A2440';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(ITEMS[it.k].txt, it.x, it.y + 1);
    ctx.textAlign = 'left';
  }

  // レーザー
  ctx.fillStyle = '#FF8FA0';
  for (const s of G.shots) ctx.fillRect(s.x - 2, s.y - 10, 4, 12);

  // ラケット
  const hw = padWidth() / 2;
  ctx.fillStyle = G.padT > 0 ? '#FF9CB0' : (G.wide > 0 ? '#8FD6FF' : '#F4ECF7');
  rr(ctx, G.px - hw, PAD_Y, hw * 2, PAD_H, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  rr(ctx, G.px - hw + 3, PAD_Y + 2, hw * 2 - 6, 4, 2); ctx.fill();
  if (G.laser > 0) {
    ctx.fillStyle = '#FF6B7A';
    ctx.fillRect(G.px - hw + 3, PAD_Y - 5, 6, 5);
    ctx.fillRect(G.px + hw - 9, PAD_Y - 5, 6, 5);
  }

  // たま
  for (const b of G.balls) {
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, b.r * 0.4, 0, 7); ctx.fill();
  }

  for (const p of G.puffs) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (1 - p.t / p.life) * 4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (G.stuck && !G.over) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.35 * Math.sin(t * 5)) + ')';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('さわると スタート', VW / 2, VH * 0.62);
    ctx.textAlign = 'left';
  }

  drawTop();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    // ★ 上に 出すと ブロックが かくれて 見えなく なる。ラケットの 上に 出す。
    const my = PAD_Y - 44;
    ctx.fillStyle = 'rgba(10,8,24,0.82)';
    rr(ctx, VW / 2 - 160, my, 320, 28, 8); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.msg, 300, 16, 'bold ');
    ctx.fillText(G.msg, VW / 2, my + 14);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(10,8,24,0.5)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'クリア！' : 'ゲームオーバー', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(10,8,24,0.68)';
  rr(ctx, 8, 4, VW - 16, 26, 8); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  fitFont(G.S.name, VW * 0.22, 13, 'bold ');
  ctx.fillText(G.S.name, 16, 17);

  // のこり たま
  const hx = VW * 0.30;
  for (let i = 0; i < G.life; i++) {
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(hx + i * 15, 17, 5, 0, 7); ctx.fill();
  }

  // アイテムの のこり
  let ix = hx + G.life * 15 + 14;
  const on = [['wide', G.wide], ['slow', G.slow], ['laser', G.laser]];
  ctx.font = 'bold 11px system-ui, sans-serif';
  for (const [k, v] of on) {
    if (v <= 0) continue;
    ctx.fillStyle = ITEMS[k].col;
    rr(ctx, ix, 8, 20, 17, 4); ctx.fill();
    ctx.fillStyle = '#2A2440';
    ctx.textAlign = 'center';
    ctx.fillText(ITEMS[k].txt, ix + 10, 17);
    ctx.textAlign = 'left';
    ix += 24;
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW - 104, 17);
  ctx.textAlign = 'left';
  drawButton(button(VW - 94, 5, 84, 24, () => { bgmStop(); G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル -------------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#241A38'); g.addColorStop(1, '#4A2E58');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('あおいのブロックくずし', VW * 0.44, 36, 'bold ');
  ctx.fillText('あおいのブロックくずし', 24, 14);
  ctx.fillStyle = '#FFC8E0';
  fitFont('ばくだん と アイテムで どんどん くずそう', VW * 0.44, 14);
  ctx.fillText('ばくだん と アイテムで どんどん くずそう', 26, 18 + fs + 4);

  // 見本
  {
    const x = VW - 120, y = 150;
    drawPapa({ x, y, r: 30, hp: 1, max: 1, hit: 0 }, t);
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('4・8・12めんに 出る', x, y + 42);
    ctx.fillText('ボス リナパパ', x, y + 58);
    ctx.textAlign = 'left';
  }

  const cw = Math.min(84, (VW * 0.58 - 24) / 6), chh = 58;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 6) * cw, cyp = 110 + Math.floor(i / 6) * (chh + 10);
    const op = opened(i), cl = !!save.clear[i];
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 4);
      ctx.fillStyle = STAGES[i].papa ? '#FFE066' : 'rgba(255,255,255,0.65)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(STAGES[i].papa ? 'パパ' : 'ブロック', cxp + (cw - 8) / 2, cyp + 23);
      ctx.fillStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(save.best['s' + i] ? String(save.best['s' + i]) : (cl ? 'クリア' : '—'),
                   cxp + (cw - 8) / 2, cyp + 39);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('★ 3回 だめだと ラケットが 広く なって、つぎの めんも ひらくよ',
               24, 110 + 2 * (chh + 10) + 8);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(24, VH - 42, 106, 30, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(138, VH - 42, 96, 30, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, VW - 14, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto(t) {
  ctx.fillStyle = '#1C142C'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFC8E0';
  ctx.font = 'bold 25px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 10);

  // ブロックの しゅるい
  const ks = ['n', 'h', 'H', 's', 'b', '?'];
  const bw = Math.min(96, (VW - 60) / 6);
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i], x = 30 + i * bw, y = 48;
    ctx.fillStyle = BRICK[k].col;
    rr(ctx, x, y, bw - 12, 20, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    rr(ctx, x + 2, y + 2, bw - 16, 7, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,30,0.45)'; ctx.lineWidth = 1.5;
    rr(ctx, x, y, bw - 12, 20, 4); ctx.stroke();
    ctx.fillStyle = '#F0E4F0';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    fitFont(BRICK[k].name, bw - 8, 12, 'bold ');
    ctx.fillText(BRICK[k].name, x, y + 24);
  }

  // アイテム
  const its = ['wide', 'multi', 'slow', 'laser', 'life'];
  for (let i = 0; i < its.length; i++) {
    const k = its[i], x = 34 + i * Math.min(150, (VW - 68) / 5), y = 104;
    ctx.fillStyle = ITEMS[k].col;
    rr(ctx, x - 13, y - 9, 26, 18, 5); ctx.fill();
    ctx.fillStyle = '#2A2440';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(ITEMS[k].txt, x, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F0E4F0';
    fitFont(ITEMS[k].name, Math.min(150, (VW - 68) / 5) - 34, 12, 'bold ');
    ctx.fillText(ITEMS[k].name, x + 18, y - 6);
  }

  ctx.textBaseline = 'top';
  const lines = [
    '① 画面を よこに なぞると ラケットが うごく（どこを さわっても いい）',
    '② さわると たまが とびだす。ラケットの はしで うけると ななめに とぶ',
    '③ ばくだん ブロックは まわりも いっしょに こわれる',
    '④ 4・8・12めんの リナパパは、たまを ぶつけると たおせる。',
    '　 パパの ケーキが ラケットに 当たると、しばらく ラケットが 小さく なる',
    '',
    '★ しばらく ブロックに 当たらないと、ブロックの ほうが 下がってくるよ',
  ];
  ctx.fillStyle = '#F0E4F0';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 15);
    ctx.fillText(s, 24, 148 + i * 24);
  });
  drawButton(button(VW - 120, 10, 104, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'ゲームオーバー', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'ゲームオーバー', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 84);
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW / 2, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('さいこう ' + (save.best['s' + G.stage] || 0), VW / 2, 156);
  if (G.win) ctx.fillText('のこった たま ' + G.life + ' つ（+' + G.life * 500 + '）', VW / 2, 180);
  else {
    const lv = assistLevel(G.stage);
    ctx.fillStyle = '#A8F0B0';
    ctx.fillText(lv > 0 ? 'ラケットを ' + lv + 'だんかい 広く して あるよ'
                        : 'あと ' + (3 - ((save.fails['s' + G.stage] || 0) % 3)) + '回 だめだと やさしく なるよ',
                 VW / 2, 180);
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(160, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 56, bw, 38, () => startStage(G.stage)), 'もう一度', '#E8D0F8');
  if (nxt < STAGES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 38, () => startStage(nxt)), 'つぎの めん', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 56, bw, 38, () => { G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------------

let dragging = false;

function down(px, py) {
  audioStart();
  const x = px / SC;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b && b.on) { b.on(); return; }
    dragging = true;
    setPad(x);
    launch();
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}
function move(px) {
  if (!dragging) return;
  setPad(px / SC);
}
function up() { dragging = false; }

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  down(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  move(e.changedTouches[0].clientX - r.left);
}, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
canvas.addEventListener('touchcancel', () => up());
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  move(e.clientX - r.left);
});
window.addEventListener('mouseup', () => up());

// パソコンの やじるしキー
const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
  if (e.key === ' ') { launch(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
function keyMove(dt) {
  if (keys.ArrowLeft) setPad(G.px - 420 * dt);
  if (keys.ArrowRight) setPad(G.px + 420 * dt);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') bgmStop();
});

// --- ループ ---------------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') { keyMove(dt); update(dt); drawPlay(tsec); }
  else if (G.screen === 'result') drawResult(tsec);
  else if (G.screen === 'howto') drawHowto(tsec);
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1C142C'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFC8E0';
  ctx.fillText('ブロックが よこに ならぶよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
