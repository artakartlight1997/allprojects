// 画面・そうさ・メインループ。
//
// さかなは かたち 12しゅるいを 色と 大きさで 変えて 描く。
// どれも 目を 大きく、ほっぺを つけて かわいく している。

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
  ctx.fillStyle = textCol || '#123448';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(18,52,72,0.72)';
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

// --- さかなの 絵 ------------------------------------------------------------------

function eyeDot(x, y, r) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2430';
  ctx.beginPath(); ctx.arc(x + r * 0.14, y + r * 0.05, r * 0.55, 0, 7); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.25, r * 0.22, 0, 7); ctx.fill();
}
function blush(x, y, r) {
  ctx.fillStyle = 'rgba(255,140,160,0.42)';
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r * 0.45, 0, 0, 7); ctx.fill();
}

// s = よこはば の めやす
function drawFish(f, x, y, s, t) {
  const c = f.col;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.4, s * 0.02);
  ctx.strokeStyle = 'rgba(20,30,44,0.35)';
  const wag = Math.sin((t || 0) * 6) * 0.18;

  if (f.kind === 'fish' || f.kind === 'flat' || f.kind === 'long') {
    const hh = f.kind === 'flat' ? 0.34 : f.kind === 'long' ? 0.12 : 0.28;
    const ww = f.kind === 'long' ? 0.50 : 0.44;
    // おびれ
    ctx.fillStyle = c;
    ctx.save();
    ctx.translate(-s * (f.kind === 'long' ? 0.48 : 0.42), 0); ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.20, -s * Math.max(hh, 0.18) * 0.95);
    ctx.lineTo(-s * 0.20, s * Math.max(hh, 0.18) * 0.95);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // からだ
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 0, s * ww, s * hh, 0, 0, 7); ctx.fill(); ctx.stroke();
    // せびれ。★ 白だと サメの ひれみたいに 見えるので、体の 色を すこし 濃くした 色に する
    ctx.fillStyle = 'rgba(40,50,70,0.30)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, -s * hh * 0.85); ctx.lineTo(s * 0.02, -s * hh * 1.32);
    ctx.lineTo(s * 0.16, -s * hh * 0.80); ctx.closePath(); ctx.fill();
    // おなか
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.ellipse(s * 0.04, s * hh * 0.42, s * 0.30, s * hh * 0.40, 0, 0, 7); ctx.fill();
    eyeDot(s * (ww * 0.6), -s * hh * 0.30, s * 0.062);
    blush(s * (ww * 0.68), s * hh * 0.10, s * 0.07);
    ctx.strokeStyle = 'rgba(20,30,44,0.5)'; ctx.lineWidth = Math.max(1.2, s * 0.014);
    ctx.beginPath(); ctx.arc(s * (ww * 0.86), -s * hh * 0.02, s * 0.05, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (f.kind === 'round') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c;
    ctx.save(); ctx.translate(-s * 0.32, 0); ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-s * 0.16, -s * 0.18); ctx.lineTo(-s * 0.16, s * 0.18);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.16, s * 0.22, s * 0.13, 0, 0, 7); ctx.fill();
    eyeDot(-s * 0.10, -s * 0.10, s * 0.075);
    eyeDot(s * 0.14, -s * 0.10, s * 0.075);
    blush(s * 0.24, s * 0.06, s * 0.08);
  } else if (f.kind === 'squid') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42); ctx.lineTo(s * 0.20, s * 0.06);
    ctx.lineTo(-s * 0.20, s * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.24, s * 0.16, 0, 0, 7); ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(i * s * 0.06, s * 0.16);
      ctx.quadraticCurveTo(i * s * 0.10, s * 0.30, i * s * 0.07 + Math.sin((t || 0) * 5 + i) * s * 0.05, s * 0.44);
      ctx.stroke();
    }
    eyeDot(-s * 0.10, s * 0.02, s * 0.062);
    eyeDot(s * 0.10, s * 0.02, s * 0.062);
  } else if (f.kind === 'octo') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -s * 0.08, s * 0.28, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -s * 0.06, s * 0.28, s * 0.22, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.beginPath();
      ctx.moveTo(i * s * 0.075, s * 0.10);
      ctx.quadraticCurveTo(i * s * 0.12, s * 0.28, i * s * 0.09 + Math.sin((t || 0) * 4 + i) * s * 0.06, s * 0.40);
      ctx.stroke();
    }
    eyeDot(-s * 0.11, -s * 0.10, s * 0.07);
    eyeDot(s * 0.11, -s * 0.10, s * 0.07);
    blush(-s * 0.22, s * 0.0, s * 0.08); blush(s * 0.22, s * 0.0, s * 0.08);
  } else if (f.kind === 'crab') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.30, s * 0.20, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (const sg of [-1, 1]) {
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, s * 0.04);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sg * s * 0.18, s * 0.06);
        ctx.lineTo(sg * s * (0.34 + i * 0.05), s * (0.18 + i * 0.06));
        ctx.stroke();
      }
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(sg * s * 0.40, -s * 0.14, s * 0.11, s * 0.09, sg * 0.5, 0, 7); ctx.fill();
    }
    eyeDot(-s * 0.10, -s * 0.10, s * 0.06);
    eyeDot(s * 0.10, -s * 0.10, s * 0.06);
  } else if (f.kind === 'shrimp') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, 0);
    ctx.quadraticCurveTo(-s * 0.10, -s * 0.26, s * 0.24, -s * 0.10);
    ctx.quadraticCurveTo(s * 0.34, s * 0.08, s * 0.16, s * 0.14);
    ctx.quadraticCurveTo(-s * 0.10, s * 0.20, -s * 0.34, s * 0.06);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c;                                // しっぽ
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, 0); ctx.lineTo(-s * 0.46, -s * 0.14);
    ctx.lineTo(-s * 0.44, s * 0.14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, s * 0.035);
    for (const sg of [-1, 1]) {                       // はさみ
      ctx.beginPath();
      ctx.moveTo(s * 0.20, s * 0.02);
      ctx.lineTo(s * 0.40, sg * s * 0.16); ctx.stroke();
    }
    eyeDot(s * 0.14, -s * 0.10, s * 0.055);
  } else if (f.kind === 'turtle') {
    ctx.fillStyle = '#8ADFA8';
    ctx.beginPath(); ctx.ellipse(s * 0.28, s * 0.02, s * 0.13, s * 0.12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.30, s * 0.22, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = Math.max(1.4, s * 0.018);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * s * 0.12, 0, s * 0.08, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#8ADFA8';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(-s * 0.06, sg * s * 0.20, s * 0.12, s * 0.07, sg * 0.3, 0, 7); ctx.fill();
    }
    eyeDot(s * 0.32, -s * 0.03, s * 0.05);
  } else if (f.kind === 'horse') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(s * 0.10, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.26, -s * 0.28, s * 0.20, -s * 0.14);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.06, s * 0.02, s * 0.12);
    ctx.quadraticCurveTo(s * 0.02, s * 0.32, -s * 0.14, s * 0.30);
    ctx.quadraticCurveTo(-s * 0.24, s * 0.28, -s * 0.16, s * 0.16);
    ctx.quadraticCurveTo(-s * 0.10, s * 0.10, -s * 0.10, s * 0.02);
    ctx.quadraticCurveTo(-s * 0.10, -s * 0.24, s * 0.10, -s * 0.34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    eyeDot(s * 0.10, -s * 0.24, s * 0.05);
  } else if (f.kind === 'angler') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.34, s * 0.28, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.20, -s * 0.56, s * 0.36, -s * 0.40); ctx.stroke();
    const gl = 0.7 + 0.3 * Math.sin((t || 0) * 4);
    ctx.fillStyle = 'rgba(255,240,150,' + gl + ')';
    ctx.beginPath(); ctx.arc(s * 0.38, -s * 0.40, s * 0.09, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';                        // ぎざぎざの 歯
    ctx.beginPath();
    ctx.moveTo(s * 0.06, s * 0.06);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(s * (0.06 + i * 0.05), s * (i % 2 ? 0.06 : 0.16));
    }
    ctx.lineTo(s * 0.30, s * 0.06); ctx.closePath(); ctx.fill();
    eyeDot(s * 0.14, -s * 0.10, s * 0.06);
  } else {  // junk
    if (f.k === 'boot') {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-s * 0.10, -s * 0.30); ctx.lineTo(s * 0.10, -s * 0.30);
      ctx.lineTo(s * 0.10, s * 0.10); ctx.lineTo(s * 0.34, s * 0.10);
      ctx.lineTo(s * 0.34, s * 0.26); ctx.lineTo(-s * 0.12, s * 0.26);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = c;
      rr(ctx, -s * 0.14, -s * 0.24, s * 0.28, s * 0.48, s * 0.05); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      rr(ctx, -s * 0.08, -s * 0.16, s * 0.06, s * 0.32, 2); ctx.fill();
    }
  }
  ctx.restore();
}

// --- あそんでいる 画面 -----------------------------------------------------------

function seaBg(t) {
  const S = G.S;
  const g = ctx.createLinearGradient(0, 0, 0, VH * 0.34);
  g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH * 0.34);
  const g2 = ctx.createLinearGradient(0, VH * 0.34, 0, VH);
  g2.addColorStop(0, S.sea[0]); g2.addColorStop(1, S.sea[1]);
  ctx.fillStyle = g2; ctx.fillRect(0, VH * 0.34, VW, VH * 0.66);
  // 水めん
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= VW; x += 12) ctx.lineTo(x, VH * 0.34 + Math.sin(x * 0.045 + t * 1.6) * 4);
  ctx.stroke();
  // 水中の すじ
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const y = VH * 0.42 + i * 26;
    ctx.beginPath();
    for (let x = 0; x <= VW; x += 22) ctx.lineTo(x, y + Math.sin(x * 0.03 + t + i) * 3);
    ctx.stroke();
  }
  // あわ
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 14; i++) {
    const x = ((i * 173) % (VW - 30)) + 15;
    const y = VH - ((t * 22 + i * 47) % (VH * 0.6));
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill();
  }
}

// つりざお と うき
function drawRod(t) {
  const rx = VW * 0.20, ry = VH * 0.20;
  // つり人（ゆい）
  const px = VW * 0.10, py = VH * 0.34;
  ctx.fillStyle = '#5A3A2A';                      // かみ
  ctx.beginPath(); ctx.arc(px, py - 66, 22, Math.PI * 1.0, Math.PI * 2.0); ctx.fill();
  ctx.fillStyle = '#F6CFAC';                      // かお
  ctx.beginPath(); ctx.arc(px, py - 60, 19, 0, 7); ctx.fill();
  ctx.fillStyle = '#5A3A2A';
  ctx.beginPath(); ctx.arc(px, py - 66, 20, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px - 18, py - 56, 7, 14, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px + 18, py - 56, 7, 14, -0.2, 0, 7); ctx.fill();
  eyeDot(px - 7, py - 60, 4.4); eyeDot(px + 7, py - 60, 4.4);
  blush(px - 13, py - 52, 6); blush(px + 13, py - 52, 6);
  ctx.fillStyle = '#FF8FBB';                      // からだ
  rr(ctx, px - 18, py - 42, 36, 44, 12); ctx.fill();
  // さお
  ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(px + 10, py - 26); ctx.lineTo(rx + 60, ry); ctx.stroke();
  // いと
  const fx = VW * 0.62;
  const sink = G.phase === 'bite' ? 16 + Math.sin(t * 24) * 4 : G.phase === 'fight' ? 22 : 0;
  const fy = VH * 0.34 + sink + (G.phase === 'wait' ? Math.sin(t * 2) * 3 : 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(rx + 60, ry); ctx.lineTo(fx, fy); ctx.stroke();
  // うき
  if (G.phase === 'wait' || G.phase === 'bite' || G.phase === 'fight') {
    ctx.fillStyle = '#FF5A6A';
    ctx.beginPath(); ctx.arc(fx, fy - 6, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(fx, fy - 6, 9, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(fx, fy - 6, 9, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#FF5A6A'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx, fy - 15); ctx.lineTo(fx, fy - 26); ctx.stroke();
  }
  return { fx, fy };
}

function drawPlay(t) {
  seaBg(t);
  const uk = drawRod(t);

  // しぶき
  for (const s of G.splash) {
    ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(uk.fx + s.x, uk.fy + s.y, 3, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (G.phase === 'fight') drawFight(t);
  if (G.phase === 'got' && G.caught) drawCaught(t);
  if (G.phase === 'bite') {
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (30 + Math.sin(t * 20) * 4) + 'px system-ui, sans-serif';
    ctx.fillText('！', uk.fx, uk.fy - 46);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  drawHud(t);

  // 画面ぜんたいが ボタン（1つの ボタンだけで あそべる）
  const b = button(0, 0, VW, VH, null);
  b.big = true;
}

// ひきあいの ゲージ
function drawFight(t) {
  const f = G.fish;
  // ★ 右はしに 入れものを 1つ 作り、その 中に つつ・さかな・ゲージを 置く。
  //   外に 字を 出すと 画面から はみ出す。
  const pw = 136, px = VW - pw - 8, py = 46, ph = VH - 108;
  ctx.fillStyle = 'rgba(10,26,44,0.62)';
  rr(ctx, px, py, pw, ph + 34, 14); ctx.fill();

  const x = px + 12, y = py + 10, w = 48, h = ph - 20;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(ctx, x, y, w, h, 10); ctx.fill();
  // ぼう
  const bh = barH() * h;
  const by = y + G.by * h - bh / 2;
  ctx.fillStyle = 'rgba(140,240,170,0.55)';
  rr(ctx, x + 3, by, w - 6, bh, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(180,255,200,0.95)'; ctx.lineWidth = 2;
  rr(ctx, x + 3, by, w - 6, bh, 8); ctx.stroke();
  // さかな
  drawFish(f, x + w / 2, y + G.fy * h, 54, t);
  // ゲージ
  const gx = x + w + 18;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, gx, y, 24, h, 12); ctx.fill();
  const gh = h * Math.max(0, Math.min(1, G.gauge));
  ctx.fillStyle = G.gauge > 0.6 ? '#8FF0A0' : G.gauge > 0.3 ? '#FFD166' : '#FF8FA0';
  rr(ctx, gx, y + h - gh, 24, gh, 12); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ぼう', x + w / 2, y + h + 6);
  ctx.fillText('ゲージ', gx + 12, y + h + 6);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('おして 上げる', px + pw / 2, y + h + 22);
  ctx.textAlign = 'left';
}

function drawCaught(t) {
  const c = G.caught;
  const k = Math.min(1, G.showT * 3);
  ctx.fillStyle = 'rgba(10,26,44,0.55)';
  ctx.fillRect(0, 0, VW, VH);
  const cy = VH * 0.44 - (1 - k) * 60;
  drawFish(c.f, VW / 2, cy, Math.min(280, VW * 0.34), t);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = c.f.nushi ? '#FFE066' : c.f.junk ? '#B0C0D0' : '#FFFFFF';
  fitFont(c.f.name, VW * 0.6, 34, 'bold ');
  ctx.fillText(c.f.name, VW / 2, cy + 76);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(c.cm + ' cm', VW / 2, cy + 116);
  if (c.f.nushi) {
    ctx.fillStyle = '#FFE066';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('★ ぬしを つりあげた！ ★', VW / 2, cy + 146);
  }
  ctx.textAlign = 'left';
}

function drawHud(t) {
  ctx.fillStyle = 'rgba(10,26,44,0.6)';
  rr(ctx, 8, 6, Math.min(360, VW * 0.5), 34, 10); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  fitFont(G.S.name, VW * 0.2, 16, 'bold ');
  ctx.fillText(G.S.name, 20, 23);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('つった ' + G.got + ' / ' + G.S.need, 172, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('にげられ ' + G.miss, 286, 23);
  ctx.textBaseline = 'top';

  drawButton(button(VW - 96, 8, 86, 28, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');

  if (G.msgT > 0 && G.msg && G.phase !== 'got') {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    const fs = fitFont(G.msg, VW * 0.6, 17, 'bold ');
    const w = ctx.measureText(G.msg).width + 30;
    ctx.fillStyle = 'rgba(10,26,44,0.78)';
    rr(ctx, (VW - w) / 2, VH - 52, w, 34, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.fillText(G.msg, VW / 2, VH - 35);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
  }
}

// --- ずかん ----------------------------------------------------------------------

let zukanPage = 0;

function drawZukan(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1B5A72'); g.addColorStop(1, '#0E3244');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const got = FISH.filter((f) => save.zukan[f.k]).length;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('さかな ずかん　' + got + ' / ' + FISH.length, 24, 12);

  const cols = VW > 700 ? 6 : 4, rows = 3;
  const per = cols * rows;
  const pages = Math.ceil(FISH.length / per);
  zukanPage = Math.max(0, Math.min(pages - 1, zukanPage));
  const cw = (VW - 40) / cols, ch = 118;
  for (let i = 0; i < per; i++) {
    const f = FISH[zukanPage * per + i];
    if (!f) break;
    const x = 20 + (i % cols) * cw, y = 48 + Math.floor(i / cols) * ch;
    const has = !!save.zukan[f.k];
    ctx.fillStyle = has ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.28)';
    rr(ctx, x + 4, y, cw - 10, ch - 10, 10); ctx.fill();
    ctx.textAlign = 'center';
    if (has) {
      drawFish(f, x + cw / 2, y + 40, Math.min(cw - 24, 104), t + i);
      ctx.fillStyle = '#FFFFFF';
      fitFont(f.name, cw - 20, 13, 'bold ');
      ctx.fillText(f.name, x + cw / 2, y + 70);
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('さいこう ' + save.zukan[f.k] + 'cm', x + cw / 2, y + 88);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(save.count[f.k] + ' ひき', x + cw / 2, y + 102);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText('？', x + cw / 2, y + 26);
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('まだ つって いない', x + cw / 2, y + 74);
    }
    ctx.textAlign = 'left';
  }

  if (pages > 1) {
    drawButton(button(24, VH - 44, 90, 32, () => { zukanPage = (zukanPage + pages - 1) % pages; }), '◀ まえ', '#8FD6FF');
    drawButton(button(124, VH - 44, 90, 32, () => { zukanPage = (zukanPage + 1) % pages; }), 'つぎ ▶', '#8FD6FF');
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText((zukanPage + 1) + ' / ' + pages, 226, VH - 34);
  }
  drawButton(button(VW - 110, 10, 96, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- タイトル --------------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A7AA0'); g.addColorStop(1, '#0E3244');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // およいでいる さかな
  const swim = ['aji', 'kuma', 'tako', 'medaka', 'buri'];
  for (let i = 0; i < swim.length; i++) {
    const f = FISH_OF[swim[i]];
    const x = ((t * (26 + i * 9) + i * 220) % (VW + 200)) - 100;
    const y = 90 + i * 62 + Math.sin(t * 1.4 + i) * 12;
    ctx.globalAlpha = 0.35;
    drawFish(f, x, y, 74, t + i);
    ctx.globalAlpha = 1;
  }

  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのつりぼり', VW * 0.42, 40, 'bold ');
  ctx.fillText('ゆいのつりぼり', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#BEEAF5';
  const ss = fitFont('うきが しずんだら タップ！ ぜんぶで ' + FISH.length + 'しゅるい', VW * 0.55, 15);
  ctx.fillText('うきが しずんだら タップ！ ぜんぶで ' + FISH.length + 'しゅるい', 26, y);
  y += ss + 14;

  // つりばを えらぶ
  const cols = VW > 700 ? 5 : 4;
  const cw = Math.min(150, (VW - 48 - (cols - 1) * 8) / cols), chh = 82;
  for (let i = 0; i < SPOTS.length; i++) {
    const x = 24 + (i % cols) * (cw + 8), yy = y + Math.floor(i / cols) * (chh + 8);
    const open = i < save.open;
    const b = button(x, yy, cw, chh, open ? () => startSpot(i) : null);
    ctx.fillStyle = open ? (save.clear[i] ? '#8FF0C0' : '#8FD6FF') : 'rgba(255,255,255,0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.fillStyle = open ? '#123448' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(SPOTS[i].name, cw - 14, 15, 'bold ');
    ctx.fillText(open ? SPOTS[i].name : '？？？', b.x + cw / 2, b.y + 10);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(open ? (save.clear[i] ? '★ クリア' : SPOTS[i].need + ' ひき つる') : 'まだ',
                 b.x + cw / 2, b.y + 32);
    if (open) {
      ctx.fillStyle = 'rgba(18,52,72,0.65)';
      fitFont(SPOTS[i].hint, cw - 14, 10);
      ctx.fillText(SPOTS[i].hint, b.x + cw / 2, b.y + 50);
      // その つりばの さかなを 小さく 見せる
      const list = SPOTS[i].fish;
      for (let k = 0; k < Math.min(3, list.length); k++) {
        drawFish(FISH_OF[list[k]], b.x + cw / 2 + (k - 1) * 34, b.y + 70, 32, t + i + k);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  const got = FISH.filter((f) => save.zukan[f.k]).length;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('ずかん ' + got + ' / ' + FISH.length + '　てんすう ' + save.pt +
               '　さお「' + RODS[rodLevel()].name + '」', 24, VH - 78);

  drawButton(button(VW - 340, VH - 44, 100, 32, () => { zukanPage = 0; G.screen = 'zukan'; }), 'ずかん', '#C9F0FF');
  drawButton(button(VW - 232, VH - 44, 108, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#E8F4FF');
  drawButton(button(VW - 116, VH - 44, 100, 32, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto() {
  ctx.fillStyle = '#0E3244'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#BEEAF5';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 画面を タップして さおを なげる',
    '② うきが しずんで「！」が 出たら、すぐ もう一度 タップ',
    '③ ひきあい！ おしっぱなしで ぼうが 上がり、はなすと 下がる',
    '④ ぼうと さかなを 重ねて いる あいだ、右の ゲージが たまる',
    '⑤ ゲージが 上まで たまれば つれる。0に なると にげられる',
  ].concat(TIPS);
  ctx.fillStyle = '#E8F4FF';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  drawButton(button(VW - 116, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A8AB0'); g.addColorStop(1, '#0E3244');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFE066';
  fitFont('クリア！', VW * 0.4, 42, 'bold ');
  ctx.fillText('クリア！', VW / 2, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(G.S.name + '　' + G.got + ' ひき つった（にげられ ' + G.miss + '）', VW / 2, 76);
  if (G.best) {
    drawFish(G.best.f, VW / 2, 190, Math.min(260, VW * 0.3), t);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('いちばん 大きい　' + G.best.f.name + ' ' + G.best.cm + 'cm', VW / 2, 262);
  }
  const nx = G.spot + 1;
  if (nx < SPOTS.length) {
    ctx.fillStyle = '#8FF0C0';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('「' + SPOTS[nx].name + '」が ひらいた！', VW / 2, 300);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(180, VW * 0.25);
  if (nx < SPOTS.length) {
    drawButton(button(VW / 2 - bw - 90, VH - 58, bw, 44, () => startSpot(nx)), 'つぎの つりば', '#FFD166');
  }
  drawButton(button(VW / 2 - bw / 2, VH - 58, bw, 44, () => startSpot(G.spot)), 'もう一度', '#8FD6FF');
  drawButton(button(VW / 2 + 90, VH - 58, bw, 44, () => { G.screen = 'title'; }), 'つりばを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ----------------------------------------------------------------------

function down(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) { b.on(); return; }
  if (G.screen === 'play' && (!b || b.big)) press();
}
function up() { release(); }

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  down(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
canvas.addEventListener('touchcancel', () => up());
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  down(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => up());
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); audioStart(); if (G.screen === 'play') press(); }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') up(); });


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
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'zukan') drawZukan(tsec);
  else if (G.screen === 'result') drawResult(tsec);
  else drawPlay(tsec);

  portraitTip();
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
