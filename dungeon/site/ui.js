// 画面・そうさ・メインループ。
//
// そうさは 十字ボタン（と パソコンの やじるしキー）。
// ターンせい なので、ボタンを おした ぶんだけ すすむ。
// 見えて いない ところは まっくら、一度 見た ところは うすく のこす。

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

// --- ちずの ばしょ ---------------------------------------------------------------

// ★ 地図は 25×15 の 決まった 形なので、**まるごと 1画面に 出す**。
//   スクロールすると、どこに いるか 分からなく なる（ワープしたみたい、と
//   言われた 原因の ひとつ）。ドルアーガの塔 と 同じで 全体が いつも 見える。
function view() {
  const panel = 168;
  const w = VW - panel - 18, h = VH - 60;
  const ts = Math.max(10, Math.floor(Math.min(w / MW, h / MH)));
  const mw = ts * MW, mh = ts * MH;
  return { x: 10 + (w - mw) / 2, y: 50 + (h - mh) / 2, w: mw, h: mh, ts, cols: MW, rows: MH };
}

function cam() { return { cx: 0, cy: 0 }; }

// --- 絵 -------------------------------------------------------------------------

// りな。★ 前は まるだけで だれか 分からなかったので、
//   顔・かみ・マント・たいまつ まで きちんと 描く。
function drawHero(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const r = s * 0.36;
  // マント
  ctx.fillStyle = '#C63A5E';
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, r * 0.15);
  ctx.quadraticCurveTo(-r * 1.25, r * 1.25, -r * 0.35, r * 1.25);
  ctx.lineTo(r * 0.35, r * 1.25);
  ctx.quadraticCurveTo(r * 1.25, r * 1.25, r * 0.95, r * 0.15);
  ctx.closePath(); ctx.fill();
  // からだ
  ctx.fillStyle = '#FF6A8A';
  rr(ctx, -r * 0.68, r * 0.10, r * 1.36, r * 1.05, r * 0.3); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,30,0.45)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.stroke();
  // ベルト
  ctx.fillStyle = '#FFD166';
  rr(ctx, -r * 0.68, r * 0.72, r * 1.36, r * 0.20, 2); ctx.fill();
  // 手
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(-r * 0.80, r * 0.62, r * 0.20, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.80, r * 0.62, r * 0.20, 0, 7); ctx.fill();
  // たいまつ（右手）
  ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath(); ctx.moveTo(r * 0.86, r * 0.62); ctx.lineTo(r * 1.02, -r * 0.10); ctx.stroke();
  const fl = 0.75 + Math.random() * 0.35;
  ctx.fillStyle = 'rgba(255,180,60,0.95)';
  ctx.beginPath(); ctx.ellipse(r * 1.06, -r * 0.34, r * 0.22 * fl, r * 0.34 * fl, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,150,0.95)';
  ctx.beginPath(); ctx.ellipse(r * 1.06, -r * 0.32, r * 0.11 * fl, r * 0.18 * fl, 0, 0, 7); ctx.fill();
  // 顔
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.62, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,60,0.35)'; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
  // かみ
  ctx.fillStyle = '#4A3020';
  ctx.beginPath(); ctx.arc(0, -r * 0.50, r * 0.66, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * 0.60, -r * 0.28, r * 0.20, r * 0.40, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.60, -r * 0.28, r * 0.20, r * 0.40, -0.2, 0, 7); ctx.fill();
  // 目と口
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.44, r * 0.09, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.44, r * 0.09, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,150,0.5)';
  ctx.beginPath(); ctx.arc(-r * 0.40, -r * 0.26, r * 0.13, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.40, -r * 0.26, r * 0.13, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8A5A48'; ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath(); ctx.arc(0, -r * 0.24, r * 0.14, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}

// どうぐ。★ 前は ぜんぶ 同じ 丸だったので、ひろう前に 何かが 分からなかった。
//   けん・たて・つぼ・まき・つばさ・カギ を 形で 見わける。
function drawItem(k, x, y, s) {
  const col = ITEMS[k].col;
  const r = s * 0.28;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.strokeStyle = 'rgba(20,14,26,0.6)';

  if (k === 'sword') {
    ctx.fillStyle = '#DCE4EE';                       // やいば
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.25); ctx.lineTo(r * 0.26, -r * 0.85);
    ctx.lineTo(r * 0.26, r * 0.30); ctx.lineTo(-r * 0.26, r * 0.30);
    ctx.lineTo(-r * 0.26, -r * 0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;                             // つば と え
    ctx.fillRect(-r * 0.78, r * 0.30, r * 1.56, r * 0.24);
    ctx.fillRect(-r * 0.18, r * 0.54, r * 0.36, r * 0.62);
  } else if (k === 'shield') {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.lineTo(r * 0.85, -r * 0.75);
    ctx.quadraticCurveTo(r * 0.85, r * 0.75, 0, r * 1.20);
    ctx.quadraticCurveTo(-r * 0.85, r * 0.75, -r * 0.85, -r * 0.75);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, r * 0.70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.10); ctx.lineTo(r * 0.55, -r * 0.10); ctx.stroke();
  } else if (k === 'bomb') {                          // かみなりの まき（まきもの）
    ctx.fillStyle = '#F2E4C8';
    rr(ctx, -r * 0.85, -r * 0.65, r * 1.70, r * 1.30, r * 0.18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    rr(ctx, -r * 1.05, -r * 0.90, r * 2.10, r * 0.34, r * 0.16); ctx.fill();
    rr(ctx, -r * 1.05, r * 0.56, r * 2.10, r * 0.34, r * 0.16); ctx.fill();
    ctx.fillStyle = '#FFD166';                        // いなずま
    ctx.beginPath();
    ctx.moveTo(r * 0.16, -r * 0.45); ctx.lineTo(-r * 0.32, r * 0.08);
    ctx.lineTo(-r * 0.02, r * 0.08); ctx.lineTo(-r * 0.18, r * 0.50);
    ctx.lineTo(r * 0.34, -r * 0.06); ctx.lineTo(r * 0.02, -r * 0.06);
    ctx.closePath(); ctx.fill();
  } else if (k === 'wing') {                          // かえりの つばさ
    ctx.fillStyle = col;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.55);
      ctx.quadraticCurveTo(sg * r * 1.30, r * 0.10, sg * r * 1.05, -r * 0.95);
      ctx.quadraticCurveTo(sg * r * 0.55, -r * 0.25, 0, -r * 0.15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (k === 'key') {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.30);
    ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.45, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.10); ctx.lineTo(0, r * 1.10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * 0.70); ctx.lineTo(r * 0.50, r * 0.70); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * 1.05); ctx.lineTo(r * 0.38, r * 1.05); ctx.stroke();
  } else {                                            // やくそう・とくやくそう（つぼ）
    ctx.fillStyle = '#C8B8A0';                        // コルク
    ctx.fillRect(-r * 0.24, -r * 1.20, r * 0.48, r * 0.34);
    ctx.fillStyle = 'rgba(240,240,255,0.85)';         // びん
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.90); ctx.lineTo(r * 0.22, -r * 0.90);
    ctx.lineTo(r * 0.22, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.90, -r * 0.10, r * 0.72, r * 0.62);
    ctx.quadraticCurveTo(r * 0.55, r * 1.15, 0, r * 1.15);
    ctx.quadraticCurveTo(-r * 0.55, r * 1.15, -r * 0.72, r * 0.62);
    ctx.quadraticCurveTo(-r * 0.90, -r * 0.10, -r * 0.22, -r * 0.45);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save();                                       // なかみ
    ctx.clip();
    ctx.fillStyle = col;
    ctx.fillRect(-r, r * 0.05, r * 2, r * 1.3);
    ctx.restore();
  }
  ctx.restore();
}

// 敵。★ 種類ごとに ちゃんと 顔や 形を つける。
function drawFoe(f, x, y, s) {
  const F = FOES[f.k];
  const r = s * (F.boss ? 0.46 : 0.34);
  const col = f.hit > 0 ? '#FFFFFF' : F.col;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1, r * 0.10);
  ctx.strokeStyle = 'rgba(20,14,26,0.55)';

  if (f.k === 'slime') {
    const w = 1 + Math.sin(f.x + f.y + Date.now() / 400) * 0.05;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.75);
    ctx.quadraticCurveTo(-r * w, -r * 0.95, 0, -r * 0.95);
    ctx.quadraticCurveTo(r * w, -r * 0.95, r, r * 0.75);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-r * 0.30, -r * 0.42, r * 0.22, r * 0.13, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#22301E';
    ctx.beginPath(); ctx.arc(-r * 0.30, 0, r * 0.13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.30, 0, r * 0.13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#22301E';
    ctx.beginPath(); ctx.arc(0, r * 0.22, r * 0.20, 0.25, Math.PI - 0.25); ctx.stroke();
  } else if (f.k === 'bat') {
    ctx.fillStyle = col;
    const fl = Math.sin(Date.now() / 120 + f.x) * 0.25;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    ctx.quadraticCurveTo(-r * 1.5, -r * (0.7 + fl), -r * 1.7, r * 0.1);
    ctx.quadraticCurveTo(-r * 1.1, r * 0.1, -r * 0.5, r * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.5, 0);
    ctx.quadraticCurveTo(r * 1.5, -r * (0.7 + fl), r * 1.7, r * 0.1);
    ctx.quadraticCurveTo(r * 1.1, r * 0.1, r * 0.5, r * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.5); ctx.lineTo(-r * 0.25, -r * 1.05);
    ctx.lineTo(-r * 0.05, -r * 0.55); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.5); ctx.lineTo(r * 0.25, -r * 1.05);
    ctx.lineTo(r * 0.05, -r * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.05, r * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.25, -r * 0.05, r * 0.12, 0, 7); ctx.fill();
  } else if (f.k === 'gob') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.72, r * 0.60, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -r * 0.30, r * 0.62, 0, 7); ctx.fill(); ctx.stroke();
    // 耳
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.35); ctx.lineTo(-r * 1.15, -r * 0.60);
    ctx.lineTo(-r * 0.55, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.35); ctx.lineTo(r * 1.15, -r * 0.60);
    ctx.lineTo(r * 0.55, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.34, r * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.24, -r * 0.34, r * 0.12, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.02); ctx.lineTo(-r * 0.06, r * 0.16);
    ctx.lineTo(r * 0.06, -r * 0.02); ctx.closePath(); ctx.fill();
    // こんぼう
    ctx.strokeStyle = '#7A5A30'; ctx.lineWidth = Math.max(2, r * 0.20);
    ctx.beginPath(); ctx.moveTo(r * 0.62, r * 0.55); ctx.lineTo(r * 1.05, -r * 0.25); ctx.stroke();
  } else if (f.k === 'armor') {
    ctx.fillStyle = col;
    rr(ctx, -r * 0.78, -r * 0.15, r * 1.56, r * 1.05, r * 0.22); ctx.fill(); ctx.stroke();
    // かぶと
    ctx.beginPath(); ctx.arc(0, -r * 0.38, r * 0.60, Math.PI, 0); ctx.fill(); ctx.stroke();
    rr(ctx, -r * 0.60, -r * 0.38, r * 1.20, r * 0.42, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1E2430';
    rr(ctx, -r * 0.44, -r * 0.28, r * 0.88, r * 0.18, 2); ctx.fill();
    ctx.fillStyle = '#FF6B7A';
    ctx.beginPath(); ctx.arc(-r * 0.20, -r * 0.19, r * 0.06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.20, -r * 0.19, r * 0.06, 0, 7); ctx.fill();
    // かた
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(-r * 0.86, r * 0.05, r * 0.30, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.86, r * 0.05, r * 0.30, 0, 7); ctx.fill(); ctx.stroke();
  } else if (f.k === 'mage') {
    // ローブ
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.lineTo(r * 0.95, r * 0.95);
    ctx.lineTo(-r * 0.95, r * 0.95);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // フードの 中
    ctx.fillStyle = '#2A1E30';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.36, r * 0.42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(-r * 0.14, -r * 0.35, r * 0.09, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.14, -r * 0.35, r * 0.09, 0, 7); ctx.fill();
    // つえ
    ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.beginPath(); ctx.moveTo(r * 0.75, r * 0.9); ctx.lineTo(r * 0.95, -r * 0.75); ctx.stroke();
    const g2 = 0.6 + 0.4 * Math.sin(Date.now() / 200);
    ctx.fillStyle = 'rgba(143,214,255,' + g2 + ')';
    ctx.beginPath(); ctx.arc(r * 0.97, -r * 0.85, r * 0.20, 0, 7); ctx.fill();
  } else {
    // ドラゴン
    ctx.fillStyle = col;
    // つばさ
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(-r * 1.6, -r * 1.2, -r * 1.5, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.0, -r * 0.4, r * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(r * 1.6, -r * 1.2, r * 1.5, r * 0.2);
    ctx.quadraticCurveTo(r * 0.9, r * 0.0, r * 0.4, r * 0.35);
    ctx.closePath(); ctx.fill();
    // からだ
    ctx.beginPath(); ctx.ellipse(0, r * 0.30, r * 0.72, r * 0.66, 0, 0, 7); ctx.fill(); ctx.stroke();
    // 首と 頭
    ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.58, r * 0.48, 0, 0, 7); ctx.fill(); ctx.stroke();
    // つの
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.72); ctx.lineTo(-r * 0.72, -r * 1.25);
    ctx.lineTo(-r * 0.16, -r * 0.86); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.42, -r * 0.72); ctx.lineTo(r * 0.72, -r * 1.25);
    ctx.lineTo(r * 0.16, -r * 0.86); ctx.closePath(); ctx.fill();
    // 目
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.48, r * 0.13, r * 0.09, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.22, -r * 0.48, r * 0.13, r * 0.09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A1414';
    ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.48, r * 0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.48, r * 0.05, 0, 7); ctx.fill();
    // きば
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-r * 0.20, -r * 0.14); ctx.lineTo(-r * 0.10, r * 0.06);
    ctx.lineTo(0, -r * 0.14); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.20, -r * 0.14); ctx.lineTo(r * 0.10, r * 0.06);
    ctx.lineTo(0, -r * 0.14); ctx.closePath(); ctx.fill();
    // おなか
    ctx.fillStyle = 'rgba(255,220,180,0.55)';
    ctx.beginPath(); ctx.ellipse(0, r * 0.42, r * 0.40, r * 0.42, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawPlay(t) {
  ctx.fillStyle = '#150F20';
  ctx.fillRect(0, 0, VW, VH);
  const V = view();
  const C = cam(V);

  for (let ry = 0; ry < V.rows; ry++) {
    for (let rx = 0; rx < V.cols; rx++) {
      const mx = C.cx + rx, my = C.cy + ry;
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
      if (!G.seen[my][mx]) continue;
      const x = V.x + rx * V.ts, y = V.y + ry * V.ts;
      const on = G.lit[my][mx];
      const cell = G.m[my][mx];
      // ★ 地図の 形は いつも 見える。たいまつの 外は 少し 暗いだけ。
      //   まっ暗だと 道が 分からず 迷子に なる。
      if (cell === WALL) {
        ctx.fillStyle = on ? '#5A4868' : '#413552';
        ctx.fillRect(x, y, V.ts, V.ts);
        ctx.fillStyle = on ? '#6E5A80' : '#4E4062';
        ctx.fillRect(x + 1, y + 1, V.ts - 2, V.ts * 0.42);
        ctx.strokeStyle = 'rgba(20,14,26,0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, V.ts - 1, V.ts - 1);
      } else {
        ctx.fillStyle = on ? '#413A52' : '#2E2840';
        ctx.fillRect(x, y, V.ts, V.ts);
        ctx.fillStyle = on ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 1, y + 1, V.ts - 2, V.ts - 2);
      }
      if (cell === DOOR) {
        // とびら（カギが いる）
        ctx.fillStyle = on ? '#A9702E' : '#5E4020';
        ctx.fillRect(x + 1, y + 1, V.ts - 2, V.ts - 2);
        ctx.strokeStyle = on ? '#6A4420' : '#3A2814'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 2.5, y + 2.5, V.ts - 5, V.ts - 5);
        ctx.fillStyle = on ? '#FFE066' : '#7A6A30';
        ctx.beginPath(); ctx.arc(x + V.ts * 0.72, y + V.ts * 0.5, V.ts * 0.09, 0, 7); ctx.fill();
      }
      if (cell === STAIR) {
        ctx.fillStyle = on ? '#FFD166' : '#8A7038';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 3 + i * 3, y + V.ts - 5 - i * (V.ts - 10) / 3,
                       V.ts - 6 - i * 6, (V.ts - 10) / 3);
        }
      }
    }
  }

  // たからばこ
  for (const c of G.chests || []) {
    if (!G.lit[c.y][c.x]) continue;
    const x = V.x + (c.x - C.cx) * V.ts, y = V.y + (c.y - C.cy) * V.ts;
    const s2 = V.ts;
    ctx.fillStyle = c.open ? '#6A5A3A' : '#C8884A';
    rr(ctx, x + s2 * 0.16, y + s2 * 0.30, s2 * 0.68, s2 * 0.46, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    if (!c.open) {
      ctx.fillStyle = '#FFE066';
      rr(ctx, x + s2 * 0.16, y + s2 * 0.44, s2 * 0.68, s2 * 0.10, 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s2 * 0.50, y + s2 * 0.52, s2 * 0.07, 0, 7); ctx.fill();
    }
  }

  // どうぐ
  for (const it of G.items) {
    if (!G.lit[it.y][it.x]) continue;
    const x = V.x + (it.x - C.cx) * V.ts, y = V.y + (it.y - C.cy) * V.ts;
    if (x < V.x - V.ts || y < V.y - V.ts) continue;
    drawItem(it.k, x + V.ts / 2, y + V.ts / 2, V.ts);
  }

  // てき
  for (const f of G.foes) {
    if (!G.lit[f.y][f.x]) continue;
    drawFoe(f, V.x + (f.x - C.cx) * V.ts + V.ts / 2, V.y + (f.y - C.cy) * V.ts + V.ts / 2, V.ts);
  }
  // りな。★ てきと まざって 見うしなわない ように、足もとに 光る わを つける。
  {
    const hx = V.x + (G.me.x - C.cx) * V.ts + V.ts / 2;
    const hy = V.y + (G.me.y - C.cy) * V.ts + V.ts / 2;
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = 'rgba(255,230,102,' + (0.45 + k * 0.4) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(hx, hy + V.ts * 0.28, V.ts * 0.40, 0, 7); ctx.stroke();
    drawHero(hx, hy, V.ts);
  }

  // ダメージの 数字
  for (const a of G.anim) {
    const x = V.x + (a.x - C.cx) * V.ts + V.ts / 2;
    const y = V.y + (a.y - C.cy) * V.ts + V.ts / 2 - a.t * 26;
    ctx.globalAlpha = Math.max(0, 1 - a.t / 0.8);
    ctx.fillStyle = a.me ? '#FF8FA0' : '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(String(a.n), x, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawTop();
  drawPanel(V);

  if (G.over) {
    ctx.fillStyle = 'rgba(10,6,16,0.6)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FF8FA0';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'ドラゴンを たおした！' : '力つきた…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  const me = G.me;
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, 8, 6, VW - 16, 38, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('地下 ' + G.depth + '階', 20, 25);
  ctx.fillStyle = '#C8B8E8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('レベル ' + me.lv, 108, 25);

  // 体力の ぼう
  const bx = 178, bw = Math.min(220, VW * 0.28);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, bx, 15, bw, 16, 8); ctx.fill();
  const k = Math.max(0, me.hp / me.max);
  ctx.fillStyle = k > 0.5 ? '#7FD86A' : k > 0.25 ? '#FFD166' : '#FF6A6A';
  rr(ctx, bx, 15, Math.max(5, bw * k), 16, 8); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(me.hp + ' / ' + me.max, bx + bw / 2, 23);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('攻撃 ' + me.atk + '　守り ' + me.def, bx + bw + 14, 25);

  drawButton(button(VW - 76, 10, 68, 28, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');
}

function drawPanel(V) {
  const x = V.x + V.w + 10;
  const w = VW - x - 10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // もちもの
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, x, 52, w, 132, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('もちもの（おすと 使う）', x + 8, 58);
  for (let i = 0; i < 8; i++) {
    const bx = x + 8 + (i % 2) * ((w - 22) / 2 + 6), by = 76 + Math.floor(i / 2) * 26;
    const k = G.me.bag[i];
    const bw = (w - 22) / 2;
    if (k) {
      const b = button(bx, by, bw, 23, () => useItem(i));
      ctx.fillStyle = ITEMS[k].col;
      rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.fillStyle = '#2A2028';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(ITEMS[k].name, bw * 0.9, 12, 'bold ');
      ctx.fillText(ITEMS[k].name, b.x + b.w / 2, b.y + 12);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.4;
      rr(ctx, bx, by, bw, 23, 6); ctx.stroke();
    }
  }

  // ログ
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, x, 190, w, 88, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < G.log.length; i++) {
    ctx.fillStyle = i === G.log.length - 1 ? '#FFE066' : 'rgba(255,255,255,0.6)';
    fitFont(G.log[i], w - 16, 12);
    ctx.fillText(G.log[i], x + 8, 196 + i * 16);
  }

  // 十字ボタン
  const pad = Math.min(w, 150), px = x + (w - pad) / 2, py = VH - pad - 8;
  const c = pad / 3;
  const dirs = [[1, 0, -1, '↑'], [0, 1, 1, '←'], [2, 1, 1, '→'], [1, 2, 1, '↓']];
  const dd = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  for (let i = 0; i < 4; i++) {
    const d = dirs[i];
    const b = button(px + d[0] * c, py + d[1] * c, c - 3, c - 3, () => act(dd[i][0], dd[i][1]));
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(c * 0.45) + 'px system-ui, sans-serif';
    ctx.fillText(d[3], b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  // まん中は「まつ」
  const b = button(px + c, py + c, c - 3, c - 3, () => act(0, 0));
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(c * 0.26) + 'px system-ui, sans-serif';
  ctx.fillText('まつ', b.x + b.w / 2, b.y + b.h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#241838'); g.addColorStop(1, '#4A2A50');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // ★ 文字の 大きさは 画面の はばで 変わるので、y を たしながら 積む。
  //   決めうちの y だと 小さい 画面で 下の 板と かさなる。
  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('りなのふしぎダンジョン', VW * 0.46, 40, 'bold ');
  ctx.fillText('りなのふしぎダンジョン', 24, y);
  y += fs + 8;

  ctx.fillStyle = '#E8C8F8';
  const ss = fitFont('1マス 歩くと 敵も 1回 動く。地図は いつも 同じ 形', VW * 0.54, 15);
  ctx.fillText('1マス 歩くと 敵も 1回 動く。地図は いつも 同じ 形', 26, y);
  y += ss + 10;

  // ★ 物語。何のために もぐるのかが 分かると 気もちが 入る。
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  STORY.open.forEach((line) => {
    const ls = fitFont(line, VW * 0.54, 13);
    ctx.fillText(line, 26, y);
    y += ls + 6;
  });
  y += 10;

  for (let i = 0; i < FKEYS.length; i++) {
    drawFoe({ k: FKEYS[i], hp: 1, max: 1, hit: 0 },
            VW - 44 - (FKEYS.length - 1 - i) * 50, 46 + Math.sin(t * 2 + i) * 4, 46);
  }

  // すすみぐあい
  const py = Math.min(y, VH - 236);
  ctx.fillStyle = 'rgba(30,20,44,0.6)';
  rr(ctx, 24, py, Math.min(VW - 48, 660), 88, 12); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('いちばん 深く もぐった 階　地下 ' + save.best + ' 階', 40, py + 12);
  ctx.fillStyle = save.clear ? '#FFE066' : 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(save.clear ? 'ドラゴンを たおした ことが ある！（' + save.wins + '回）'
                          : '地下 ' + FLOORS + '階の ドラゴンを たおすと クリア', 40, py + 36);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('もぐった 回数 ' + save.plays + '　力つきた 回数 ' + save.deaths, 40, py + 60);

  // はじめる ボタン
  const by = py + 100;
  drawButton(button(24, by, 200, 52, () => startRun(1)),
             '地下 1階から', '#FFD166');
  if (save.check > 1) {
    drawButton(button(240, by, 240, 52, () => startRun(save.check)),
               '地下 ' + save.check + '階から', '#8FD6FF', '#123048',
               '深くまで もぐった ごほうび');
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('★ 5階ごとに「その 階から はじめられる」ように なるよ', 24, by + 64);
  ctx.fillText('★ 力つきても、深くまで もぐった ぶんは のこる', 24, by + 86);

  drawButton(button(VW - 224, VH - 40, 96, 30, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 40, 96, 30, () => { sfxTest(); }),
             '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, 24, VH - 6);
}

function drawHowto() {
  ctx.fillStyle = '#1E1430'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#E8C8F8';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 右下の 十字ボタン（パソコンは 矢印キー）で 1マスずつ 進む',
    '② 敵の いる ほうへ 進むと 攻撃。1マス 歩くと 敵も 1回 動く',
    '③ 金色の「階段」に のると 次の 階へ。地下 10階に ドラゴン',
    '④ 落ちている 道具を ひろって、右の ボタンで 使う',
    '⑤ 敵を たおすと レベルが 上がって、体力が ぜんぶ もどる',
    '',
    '★ 赤い とびらは 同じ 階の どこかに ある「かぎ」で 開く',
    '★ あぶなく なったら「まつ」で ようすを 見るのも 手',
    '★ コウモリは 1ターンに 2回 動く。魔法使いは はなれていても 撃つ',
    '★ よろいは かたいので、かみなりの まき が よく きく',
    '',
    '力つきても、5階ごとの ところから やりなおせる。',
    '最初から やりなおしには ならないよ',
  ];
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 16);
    ctx.fillText(s, 24, 46 + i * 25);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FF8FA0';
  fitFont(G.win ? 'クリア！' : '力つきた…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : '力つきた…', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('地下 ' + G.depth + ' 階　レベル ' + G.me.lv, VW / 2, 88);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('いちばん 深く もぐった 階　地下 ' + save.best + ' 階', VW / 2, 122);
  if (G.win) {
    ctx.fillStyle = '#FFE9A8';
    ctx.font = 'bold 15px system-ui, sans-serif';
    STORY.win.forEach((line, i) => {
      fitFont(line, VW * 0.8, 15, 'bold ');
      ctx.fillText(line, VW / 2, 152 + i * 24);
    });
  } else {
    ctx.fillStyle = '#8FD6FF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('地下 ' + save.check + ' 階から やりなおせるよ', VW / 2, 152);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(180, VW * 0.24);
  drawButton(button(VW / 2 - bw - 100, VH - 60, bw, 42, () => startRun(save.check)),
             '地下 ' + save.check + '階から', '#FFD166');
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 42, () => startRun(1)),
             '地下 1階から', '#E8D0F8');
  drawButton(button(VW / 2 + 100, VH - 60, bw, 42, () => { G.screen = 'title'; }),
             'タイトルへ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});

const KEYD = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  Space: [0, 0], Period: [0, 0],
};
window.addEventListener('keydown', (e) => {
  const d = KEYD[e.code];
  if (!d) return;
  e.preventDefault();
  if (G.screen === 'play') act(d[0], d[1]);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') bgmStop();
});

// --- ループ ---------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') { update(dt); drawPlay(tsec); }
  else if (G.screen === 'result') drawResult(tsec);
  else if (G.screen === 'howto') drawHowto();
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1E1430'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#E8C8F8';
  ctx.fillText('ちずの よこに もちものが 出るよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
