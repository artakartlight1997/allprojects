// 画面・そうさ・メインループ。
//
// あなは たてよこに ならべる。1つの あなの「上の ほう」が たたく ところ。
// 出てくる ものは あなの ふちで きって、下から せり上がって 見えるように する。

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

// --- あなの ばしょ ---------------------------------------------------------------
//
// ★ あなの 数で ならびかたを かえる（6→3×2, 9→3×3, 12→4×3）。

function holeAt(i) {
  const n = (G.S ? G.S.holes : 6);
  const cols = n === 6 ? 3 : n === 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const aw = Math.min(VW - 36, 700), ah = VH - 58 - 14;
  const x0 = (VW - aw) / 2, y0 = 58;
  const cw = aw / cols, ch = ah / rows;
  const c = i % cols, r = (i / cols) | 0;
  const cx = x0 + cw * (c + 0.5);
  const cy = y0 + ch * (r + 0.82);   // あなの 口は マスの 下がわ
  const rx = Math.min(cw * 0.38, ch * 0.46);
  return { cx, cy, rx, ry: rx * 0.38, cw, ch, tall: ch * 0.80 };
}

// さわった ところの あな（なければ -1）
function holeHit(x, y) {
  const n = G.S ? G.S.holes : 0;
  for (let i = 0; i < n; i++) {
    const b = holeAt(i);
    if (x >= b.cx - b.rx * 1.25 && x <= b.cx + b.rx * 1.25 &&
        y >= b.cy - b.tall && y <= b.cy + b.ry * 2.2) return i;
  }
  return -1;
}

// --- 出てくる ものの え ------------------------------------------------------------

function eyes(x, y, r, open) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(x - r * 0.34, y, r * 0.20, r * 0.24 * (open ? 1 : 0.2), 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.34, y, r * 0.20, r * 0.24 * (open ? 1 : 0.2), 0, 0, 7); ctx.fill();
  if (!open) return;
  ctx.fillStyle = '#2A2440';
  ctx.beginPath(); ctx.arc(x - r * 0.32, y + r * 0.02, r * 0.10, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.36, y + r * 0.02, r * 0.10, 0, 7); ctx.fill();
}

function drawMole(x, y, r, col, hit) {
  // からだ
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 0.86, r * 0.72, 0, 0, 7); ctx.fill();
  // かお
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,26,20,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // おなか
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.72, r * 0.44, r * 0.42, 0, 0, 7); ctx.fill();
  // 手
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x - r * 0.86, y + r * 0.42, r * 0.24, r * 0.20, -0.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.86, y + r * 0.42, r * 0.24, r * 0.20, 0.5, 0, 7); ctx.fill();
  // はな
  ctx.fillStyle = '#FF8FA0';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.22, r * 0.26, r * 0.20, 0, 0, 7); ctx.fill();
  eyes(x, y - r * 0.20, r, !hit);
  // ひげ
  ctx.strokeStyle = 'rgba(60,40,30,0.5)'; ctx.lineWidth = 1.5;
  for (let s = -1; s <= 1; s += 2) {
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.22, y + r * 0.24);
      ctx.lineTo(x + s * r * 0.72, y + r * 0.24 + k * r * 0.16);
      ctx.stroke();
    }
  }
  if (hit) {
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1);
      ctx.lineTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
      ctx.stroke();
    }
  }
}

function drawGold(x, y, r, hit, t) {
  drawMole(x, y, r, '#FFD166', hit);
  // かんむり
  ctx.fillStyle = '#FFF0A0';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.80);
  ctx.lineTo(x - r * 0.28, y - r * 1.16);
  ctx.lineTo(x, y - r * 0.86);
  ctx.lineTo(x + r * 0.28, y - r * 1.16);
  ctx.lineTo(x + r * 0.5, y - r * 0.80);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,20,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  // きらきら
  ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 7)) + ')';
  for (let k = 0; k < 3; k++) {
    const a = t * 2 + k * 2.1;
    const px = x + Math.cos(a) * r * 1.2, py = y + Math.sin(a) * r * 1.0;
    ctx.beginPath();
    ctx.moveTo(px, py - 5); ctx.lineTo(px + 2, py); ctx.lineTo(px + 5, py);
    ctx.lineTo(px + 2, py + 2); ctx.lineTo(px, py + 6); ctx.lineTo(px - 2, py + 2);
    ctx.lineTo(px - 5, py); ctx.lineTo(px - 2, py);
    ctx.closePath(); ctx.fill();
  }
}

function drawFast(x, y, r, hit) {
  drawMole(x, y, r * 0.82, '#8FD6FF', hit);
  // はやそうな 線
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(x - r * 1.5, y + k * r * 0.34);
    ctx.lineTo(x - r * 0.95, y + k * r * 0.34);
    ctx.stroke();
  }
}

function drawBomb(x, y, r, t) {
  ctx.fillStyle = '#3A3448';
  ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.92, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.24, r * 0.24, r * 0.16, -0.6, 0, 7); ctx.fill();
  // どうかせん
  ctx.strokeStyle = '#C8A060'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.66);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.0, x + r * 0.62, y - r * 1.3);
  ctx.stroke();
  const f = 0.6 + 0.4 * Math.sin(t * 22);
  ctx.fillStyle = '#FFD166';
  ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 1.32, r * 0.22 * f, 0, 7); ctx.fill();
  ctx.fillStyle = '#FF8FA0';
  ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 1.32, r * 0.11 * f, 0, 7); ctx.fill();
  // ばつ じるし（たたいちゃ だめ）
  ctx.strokeStyle = '#FF6B7A'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.2); ctx.lineTo(x + r * 0.4, y + r * 0.4);
  ctx.moveTo(x + r * 0.4, y - r * 0.2); ctx.lineTo(x - r * 0.4, y + r * 0.4);
  ctx.stroke();
}

function drawCake(x, y, r) {
  // さら
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.86, r * 1.0, r * 0.22, 0, 0, 7); ctx.fill();
  // スポンジ
  ctx.fillStyle = '#F5D8A8';
  rr(ctx, x - r * 0.66, y - r * 0.1, r * 1.32, r * 0.94, 4); ctx.fill();
  ctx.fillStyle = '#FFB8D8';
  rr(ctx, x - r * 0.66, y + r * 0.24, r * 1.32, r * 0.18, 3); ctx.fill();
  // クリーム
  ctx.fillStyle = '#FFF6F0';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.66, y - r * 0.1);
  for (let k = 0; k <= 4; k++) {
    ctx.quadraticCurveTo(x - r * 0.66 + (k + 0.5) * r * 0.33, y - r * 0.46,
                         x - r * 0.66 + (k + 1) * r * 0.33, y - r * 0.1);
  }
  ctx.closePath(); ctx.fill();
  // いちご
  ctx.fillStyle = '#FF5A6E';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.88);
  ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.62, x, y - r * 0.32);
  ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.62, x, y - r * 0.88);
  ctx.fill();
  ctx.fillStyle = '#6ACB6A';
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.88, r * 0.16, r * 0.07, 0, 0, 7); ctx.fill();
}

// ★ ボスの **リナパパ**。メガネの ちょいぽちゃ。
function drawPapa(x, y, r, hit, hp, t) {
  const wob = Math.sin(t * 4) * r * 0.05;
  // からだ（ちょいぽちゃ なので まるい）
  ctx.fillStyle = '#5A8A6A';
  ctx.beginPath(); ctx.ellipse(x + wob, y + r * 1.10, r * 1.12, r * 0.92, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(20,40,28,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  // シャツの えり
  ctx.fillStyle = '#E8F0E8';
  ctx.beginPath();
  ctx.moveTo(x + wob - r * 0.42, y + r * 0.52);
  ctx.lineTo(x + wob, y + r * 0.98);
  ctx.lineTo(x + wob + r * 0.42, y + r * 0.52);
  ctx.closePath(); ctx.fill();
  // 手
  ctx.fillStyle = '#F2C9A8';
  ctx.beginPath(); ctx.ellipse(x + wob - r * 1.14, y + r * 0.92, r * 0.26, r * 0.24, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + wob + r * 1.14, y + r * 0.92, r * 0.26, r * 0.24, 0, 0, 7); ctx.fill();
  // かお（よこに 広い ＝ ちょいぽちゃ）
  ctx.fillStyle = '#F5CFAE';
  ctx.beginPath(); ctx.ellipse(x, y, r * 1.02, r * 0.94, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,50,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // ほっぺ（ぽちゃ）
  ctx.fillStyle = 'rgba(255,150,150,0.35)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.62, y + r * 0.28, r * 0.24, r * 0.17, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.62, y + r * 0.28, r * 0.24, r * 0.17, 0, 0, 7); ctx.fill();
  // かみ（よこと 上に 少し）
  ctx.fillStyle = '#3A3040';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.66, r * 0.92, r * 0.40, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - r * 0.92, y - r * 0.28, r * 0.16, r * 0.30, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.92, y - r * 0.28, r * 0.16, r * 0.30, -0.2, 0, 7); ctx.fill();
  // 目
  eyes(x, y - r * 0.10, r * 1.0, !hit);
  // ★ メガネ
  ctx.strokeStyle = '#2A2440'; ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.10, r * 0.32, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 0.36, y - r * 0.10, r * 0.32, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.05, y - r * 0.10); ctx.lineTo(x + r * 0.05, y - r * 0.10);
  ctx.moveTo(x - r * 0.68, y - r * 0.14); ctx.lineTo(x - r * 0.98, y - r * 0.20);
  ctx.moveTo(x + r * 0.68, y - r * 0.14); ctx.lineTo(x + r * 0.98, y - r * 0.20);
  ctx.stroke();
  // レンズの ひかり
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.10, r * 0.22, -2.4, -1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 0.36, y - r * 0.10, r * 0.22, -2.4, -1.5); ctx.stroke();
  // くち
  ctx.strokeStyle = '#8A5A48'; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  if (hit) ctx.arc(x, y + r * 0.42, r * 0.24, 0, Math.PI * 2);
  else ctx.arc(x, y + r * 0.34, r * 0.30, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // のこり 何回
  if (hp > 0) {
    ctx.fillStyle = 'rgba(20,14,30,0.6)';
    rr(ctx, x - r * 0.8, y - r * 1.62, r * 1.6, r * 0.34, 5); ctx.fill();
    ctx.fillStyle = '#FF8FA0';
    rr(ctx, x - r * 0.76, y - r * 1.58, r * 1.52 * (hp / KINDS.papa.hp), r * 0.26, 4); ctx.fill();
  }
}

function drawKind(k, x, y, r, hit, hp, t) {
  if (k === 'mole') drawMole(x, y, r, KINDS.mole.col, hit);
  else if (k === 'gold') drawGold(x, y, r, hit, t);
  else if (k === 'fast') drawFast(x, y, r, hit);
  else if (k === 'bomb') drawBomb(x, y, r, t);
  else if (k === 'cake') drawCake(x, y, r);
  else if (k === 'papa') drawPapa(x, y, r * 0.86, hit, hp, t);
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  ctx.save();
  if (G.shake > 0) {
    ctx.translate(Math.sin(t * 60) * 6 * G.shake, Math.cos(t * 51) * 5 * G.shake);
  }

  // そら と じめん
  // ★ あなは 画面 ぜんたいに ならぶので、じめんは 上の ほうから はじめる。
  //   まん中で 空と 土が わかれると、上の れつの あなが 空に うくように 見える。
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#7AC0E8'); g.addColorStop(0.15, '#A8DCF0'); g.addColorStop(0.155, '#8A6A44');
  g.addColorStop(1, '#4E3822');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, VW + 40, VH + 40);
  // さかい目の くさ
  ctx.strokeStyle = 'rgba(120,180,90,0.65)'; ctx.lineWidth = 3;
  for (let i = 0; i < 60; i++) {
    const x = ((i * 97) % 1000) / 1000 * VW;
    ctx.beginPath();
    ctx.moveTo(x, VH * 0.158);
    ctx.lineTo(x + Math.sin(t + i) * 3, VH * 0.158 - 9);
    ctx.stroke();
  }
  // 土の つぶつぶ
  ctx.fillStyle = 'rgba(255,235,200,0.09)';
  for (let i = 0; i < 90; i++) {
    const x = ((i * 173) % 1000) / 1000 * VW;
    const y = VH * 0.18 + ((i * 61) % 100) / 100 * VH * 0.80;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill();
  }

  const n = G.S.holes;
  for (let i = 0; i < n; i++) {
    const h = G.holes[i];
    const b = holeAt(i);
    // あなの 中（くらい）
    ctx.fillStyle = '#2A1C14';
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, 7); ctx.fill();

    if (h.state !== 'idle' && h.k) {
      const r = b.rx * 0.78;   // ★ 小さいと 見分けにくいので 大きめ
      const rise = b.tall * 0.52;
      ctx.save();
      // ★ あなの 口より 下は かくす（せり上がって 見えるように）
      ctx.beginPath();
      ctx.rect(b.cx - b.rx * 2, b.cy - b.tall - 40, b.rx * 4, b.tall + 40 + b.ry * 0.4);
      ctx.clip();
      const yy = b.cy - r * 0.1 - rise * h.up;
      drawKind(h.k, b.cx, yy, r, h.hit > 0.2, h.k === 'papa' ? h.hp : 0, t);
      ctx.restore();
    }

    // あなの ふち（手まえ がわ）
    ctx.strokeStyle = '#8A6440'; ctx.lineWidth = Math.max(4, b.rx * 0.16);
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,26,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(b.cx, b.cy, b.rx, b.ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
  }

  // 出た 点すう
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.pops) {
    const b = holeAt(p.i);
    ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9);
    ctx.fillStyle = p.col;
    ctx.font = 'bold 22px system-ui, sans-serif';
    const s = p.txt || (p.n > 0 ? '+' + p.n : String(p.n));
    ctx.strokeStyle = 'rgba(20,14,30,0.8)'; ctx.lineWidth = 4;
    ctx.strokeText(s, b.cx, b.cy - 30 - p.t * 40);
    ctx.fillText(s, b.cx, b.cy - 30 - p.t * 40);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  ctx.restore();

  drawTop();

  // ★ ボス登場の おしらせ（たたくゲームなので 止めずに 帯だけ 出す）
  if (G.papaIn > 0) {
    const p = 1 - G.papaIn / 1.6;
    const band = Math.min(1, p * 6) * Math.min(1, (1 - p) * 4);
    const h = 62 * band;
    if (h > 1) {
      const cy = VH * 0.30, off = (t * 60) % 44;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, cy - h / 2, VW, h); ctx.clip();
      ctx.fillStyle = 'rgba(24,12,30,0.86)';
      ctx.fillRect(0, cy - h / 2, VW, h);
      ctx.fillStyle = 'rgba(255,209,102,0.28)';
      for (let x = -h - 44; x < VW + h; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x - off, cy + h / 2);
        ctx.lineTo(x + h - off, cy - h / 2);
        ctx.lineTo(x + h + 16 - off, cy - h / 2);
        ctx.lineTo(x + 16 - off, cy + h / 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#FFD166'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, cy - h / 2); ctx.lineTo(VW, cy - h / 2);
      ctx.moveTo(0, cy + h / 2); ctx.lineTo(VW, cy + h / 2);
      ctx.stroke();
      if (band > 0.8) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        fitFont('リナパパ 登場！', VW * 0.6, 26, 'bold ');
        ctx.fillText('リナパパ 登場！', VW / 2, cy);
        ctx.textAlign = 'left';
      }
    }
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(10,20,34,0.5)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'クリア！' : 'もう ちょっと…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(20,14,30,0.68)';
  rr(ctx, 8, 6, VW - 16, 42, 10); ctx.fill();

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fitFont(G.S.name, VW * 0.24, 12, 'bold ');
  ctx.fillText(G.S.name, 18, 11);

  // 点すう と 目ひょう の バー
  const bx = 18, by = 28, bw = Math.max(120, VW * 0.30);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, bx, by, bw, 12, 6); ctx.fill();
  const f = Math.min(1, G.score / Math.max(1, G.goal));
  ctx.fillStyle = f >= 1 ? '#A8F0B0' : '#FFD166';
  rr(ctx, bx, by, Math.max(3, bw * f), 12, 6); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(G.score + ' / ' + G.goal, bx + bw + 10, 26);

  // コンボ
  ctx.textAlign = 'center';
  if (G.combo > 1) {
    ctx.fillStyle = '#FFE066';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(G.combo + ' 連続！', VW * 0.66, 26);
  }

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = G.left < 10 ? '#FF8FA0' : '#8FD6FF';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(Math.ceil(G.left) + '', VW - 104, 27);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('秒', VW - 104, 44);
  ctx.textAlign = 'left';

  drawButton(button(VW - 94, 12, 84, 28, () => { bgmStop(); G.screen = 'title'; }),
             '面をえらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3A2A44'); g.addColorStop(1, '#6A4A34');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('りなのモグラたたき', VW * 0.44, 38, 'bold ');
  ctx.fillText('りなのモグラたたき', 24, 16);
  ctx.fillStyle = '#FFD9A8';
  fitFont('たたく物と たたいちゃだめな物が あるよ', VW * 0.48, 15);
  ctx.fillText('たたく物と たたいちゃだめな物が あるよ', 26, 20 + fs + 4);

  // 見本（モグラ と ボス）
  // ★ まだ会っていないうちはボスを出さない。先に分かるとつまらない。
  {
    const x = VW - 150, y = 140;
    drawMole(x - 66, y, 32, KINDS.mole.col, false);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('モグラ', x - 66, y + 68);
    if (save.seen.papa) {
      drawPapa(x + 44, y - 4, 40, false, 0, t);
      ctx.fillStyle = '#FFE066';
      ctx.fillText('ボス リナパパ', x + 44, y + 78);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.beginPath(); ctx.ellipse(x + 44, y + 2, 42, 42, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText('？', x + 44, y + 2);
      ctx.textBaseline = 'top';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('ボスは……？', x + 44, y + 78);
    }
    ctx.textAlign = 'left';
  }

  // 下の かざり。あなから もぐらが ひょっこり。
  {
    const gy = VH - 96;
    ctx.fillStyle = 'rgba(90,64,40,0.55)';
    ctx.fillRect(0, gy, VW, VH - gy);
    ctx.strokeStyle = 'rgba(120,180,90,0.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97) % 1000) / 1000 * VW;
      ctx.beginPath();
      ctx.moveTo(x, gy + 2); ctx.lineTo(x + Math.sin(t + i) * 3, gy - 7);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const cx = VW * (0.50 + i * 0.17), cy = VH - 34;
      const up = Math.max(0, Math.sin(t * 1.6 + i * 2.1));
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 60, gy - 60, 120, cy - (gy - 60) + 4);
      ctx.clip();
      drawMole(cx, cy - 6 - up * 34, 24, i === 1 ? '#FFD166' : KINDS.mole.col, false);
      ctx.restore();
      ctx.fillStyle = '#2A1C14';
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 12, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8A6440'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI); ctx.stroke();
    }
  }

  // 10めん（5 × 2）
  const cw = Math.min(96, (VW * 0.56 - 24) / 5), chh = 60;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 112 + Math.floor(i / 5) * (chh + 10);
    const op = opened(i), best = save.best['s' + i] || 0;
    const cl = !!save.clear[i];
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
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 5);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('穴 ' + STAGES[i].holes, cxp + (cw - 8) / 2, cyp + 24);
      ctx.fillStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(best ? String(best) : (cl ? 'クリア' : '—'), cxp + (cw - 8) / 2, cyp + 40);
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
  ctx.fillText('★ 3回だめだと目標が下がって、次の面も開くよ', 24, 112 + 2 * (chh + 10) + 8);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(24, VH - 42, 106, 30, () => { G.screen = 'howto'; }),
             '遊びかた', '#E8D0F8');
  drawButton(button(138, VH - 42, 96, 30, () => { sfxTest(); }),
             '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, VW - 14, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto(t) {
  ctx.fillStyle = '#2A1E30'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD9A8';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('遊びかた', 24, 12);

  // 出てくる ものの ひょう
  const items = [
    ['mole', 'モグラ', '+100', true],
    ['gold', '金モグラ', '+300', true],
    ['fast', 'すばやい', '+180', true],
    ['bomb', '爆弾', '-250', false],
    ['cake', 'ケーキ', '-150', false],
  ];
  // ★ ボスは 会ってから 出す
  if (save.seen.papa) items.push(['papa', 'リナパパ', '+900', true]);
  const cw = Math.min(126, (VW - 48) / 6);
  for (let i = 0; i < items.length; i++) {
    const [k, name, pt, good] = items[i];
    const x = 30 + i * cw + cw / 2, y = 110;
    ctx.save();
    ctx.translate(0, 0);
    drawKind(k, x, y, 26, false, 0, t);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFFFFF';
    fitFont(name, cw - 6, 13, 'bold ');
    ctx.fillText(name, x, y + 52);
    ctx.fillStyle = good ? '#A8F0B0' : '#FF8FA0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(pt, x, y + 70);
    ctx.fillStyle = good ? 'rgba(168,240,176,0.8)' : 'rgba(255,143,160,0.9)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(good ? 'たたく' : 'たたかない', x, y + 88);
  }
  ctx.textAlign = 'left';

  const lines = [
    '① 出てきた物をタップ（たたく）',
    '② 爆弾とケーキは たたくと点が減る。よく見て！',
    '③ 続けてたたくと連続ボーナスで点が増える',
    '④ ときどきボスが出る。何回かたたかないと引っこまない',
    '',
    '時間内に目標の点をこえたらクリア。',
    '3回だめだと目標が下がって、次の面も開くよ。',
  ];
  ctx.fillStyle = '#F0E4F0';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 15);
    ctx.fillText(s, 24, 232 + i * 25);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'もう ちょっと…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'もう ちょっと…', VW / 2, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 80);

  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW / 2, 106);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('目標 ' + G.goal, VW / 2, 152);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('たたいた ' + G.hits + ' こ ／ にがした ' + G.lets +
               ' こ ／ まちがえて たたいた ' + G.miss + ' こ', VW / 2, 182);
  ctx.fillText('最高連続 ' + G.bestCombo, VW / 2, 206);

  if (!G.win) {
    const lv = assistLevel(G.stage);
    if (lv > 0) {
      ctx.fillStyle = '#A8F0B0';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('※ 目標を下げてあるよ（' + lv + '段階）', VW / 2, 232);
    }
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(160, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 56, bw, 38, () => startStage(G.stage)),
             'もう一度', '#E8D0F8');
  if (nxt < STAGES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 38, () => startStage(nxt)),
               '次の面', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 56, bw, 38, () => { G.screen = 'title'; }),
             '面をえらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

function tapAt(x, y) {
  const i = holeHit(x, y);
  if (i >= 0) whack(i);
}

function down(px, py) {
  audioStart();
  const x = px / SC, y = py / SC - VOY;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b && b.on) { b.on(); return; }
    tapAt(x, y);
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  // ★ ゆびを 何本 つかっても いいように、ぜんぶの ゆびを 見る。
  for (const t of e.changedTouches) down(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down(e.clientX - r.left, e.clientY - r.top);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') bgmStop();
});

// --- ループ ---------------------------------------------------------------------


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

let last = 0, tsec = 0;
function frame(now) {
  portraitTip();
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') { update(dt); drawPlay(tsec); }
  else if (G.screen === 'result') drawResult(tsec);
  else if (G.screen === 'howto') drawHowto(tsec);
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2A1E30'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('横向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFD9A8';
  ctx.fillText('穴が横にならぶよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
