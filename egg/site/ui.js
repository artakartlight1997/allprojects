// 画面・そうさ・メインループ。
//
// 絵は ぜんぶ ここで 線と まるから 描く（絵の ファイルは 1つも つかわない）。
// キャラクターは かわいく なるように、ほっぺ・大きい目・まるい 体で 統一している。

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
  ctx.fillStyle = textCol || '#3A2A40';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(58,42,64,0.72)';
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
  return null;
}

// --- かわいい かおの ぶひん ------------------------------------------------------

// 目。ねているときは 線、ふつうは 大きい 黒目に ハイライト。
function eyes(x, y, r, closed, look) {
  if (closed) {
    ctx.strokeStyle = '#3A2A34';
    ctx.lineWidth = Math.max(1.6, r * 0.24);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * r * 1.5, y, r * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    return;
  }
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#3A2A34';
    ctx.beginPath();
    ctx.ellipse(x + s * r * 1.5, y, r * 0.78, r, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + s * r * 1.5 - r * 0.24 + (look || 0) * r * 0.3, y - r * 0.3, r * 0.30, 0, 7);
    ctx.fill();
  }
}

// ほっぺ
function cheeks(x, y, r, col) {
  ctx.fillStyle = col || 'rgba(255,140,160,0.55)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * r * 2.7, y + r * 0.5, r * 0.62, r * 0.42, 0, 0, 7); ctx.fill();
  }
}

// 口（happy=にっこり / sad=への字 / o=まる）
function mouth(x, y, r, kind) {
  ctx.strokeStyle = '#3A2A34';
  ctx.lineWidth = Math.max(1.6, r * 0.2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'sad') ctx.arc(x, y + r * 1.0, r * 0.7, Math.PI * 1.2, Math.PI * 1.8);
  else if (kind === 'o') { ctx.arc(x, y + r * 0.3, r * 0.42, 0, 7); }
  else ctx.arc(x, y - r * 0.1, r * 0.7, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// --- ペットを 描く ---------------------------------------------------------------

// たまご
function drawEgg(x, y, s, wob) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(wob * 22) * 0.10);
  ctx.fillStyle = '#FFF8F0';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.38, s * 0.48, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,110,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
  // もよう
  ctx.fillStyle = '#FFC7DC';
  for (const [dx, dy, r] of [[-0.14, 0.08, 0.09], [0.16, -0.02, 0.07], [0.02, 0.26, 0.06], [-0.05, -0.20, 0.05]]) {
    ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// あかちゃん（ひよこ）
function drawBaby(x, y, s, p, t) {
  const bob = Math.sin(t * 3) * s * 0.02;
  ctx.save();
  ctx.translate(x, y + bob);
  const r = s * 0.30;
  // 体
  ctx.fillStyle = '#FFE9A8';
  ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.95, r * 0.8, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,60,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // あし
  ctx.strokeStyle = '#F0A03A'; ctx.lineWidth = Math.max(2, r * 0.13);
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * r * 0.35, r * 1.28); ctx.lineTo(sg * r * 0.35, r * 1.55); ctx.stroke();
  }
  // 頭
  ctx.fillStyle = '#FFF0BE';
  ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.92, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,60,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // たまごの から（ぼうし）
  if (p && p.age < 0.6) {
    ctx.fillStyle = '#FFF8F0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.85);
    ctx.lineTo(-r * 0.55, -r * 1.25); ctx.lineTo(-r * 0.15, -r * 0.90);
    ctx.lineTo(r * 0.25, -r * 1.30); ctx.lineTo(r * 0.60, -r * 0.92);
    ctx.lineTo(r * 0.95, -r * 1.20); ctx.lineTo(r * 0.95, -r * 1.55);
    ctx.lineTo(-r * 0.95, -r * 1.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,110,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // くちばし
  ctx.fillStyle = '#F0A03A';
  ctx.beginPath();
  ctx.moveTo(-r * 0.20, -r * 0.10); ctx.lineTo(r * 0.20, -r * 0.10);
  ctx.lineTo(0, r * 0.18); ctx.closePath(); ctx.fill();
  const lv = petLevel(p);
  eyes(0, -r * 0.52, r * 0.20, p.asleep, 0);
  cheeks(0, -r * 0.42, r * 0.20, 'rgba(255,150,170,0.45)');
  if (!p.asleep && lv < 35) mouth(0, r * 0.30, r * 0.20, 'sad');
  ctx.restore();
}

// こども（まるい からだ）
function drawChild(x, y, s, p, t) {
  const bob = Math.sin(t * 2.6) * s * 0.025;
  ctx.save();
  ctx.translate(x, y + bob);
  const r = s * 0.36;
  ctx.fillStyle = '#FFF3F7';
  ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.98, r * 1.0, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(140,100,120,0.35)'; ctx.lineWidth = 2.4; ctx.stroke();
  // みみ
  ctx.fillStyle = '#FFF3F7';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sg * r * 0.62, -r * 0.85, r * 0.24, r * 0.36, sg * 0.3, 0, 7);
    ctx.fill(); ctx.stroke();
  }
  // て
  ctx.fillStyle = '#FFE3EE';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sg * r * 0.95, r * 0.35 + Math.sin(t * 4 + sg) * r * 0.06, r * 0.24, 0, 7);
    ctx.fill();
  }
  const lv = petLevel(p);
  eyes(0, -r * 0.12, r * 0.19, p.asleep, Math.sin(t) * 0.4);
  cheeks(0, -r * 0.02, r * 0.19);
  mouth(0, r * 0.42, r * 0.19, p.asleep ? 'o' : lv < 35 ? 'sad' : 'happy');
  ctx.restore();
}

// おとな。すがたごとに 形を 変える
function drawAdult(x, y, s, form, t, p) {
  const F = FORM_OF[form] || FORMS[0];
  const bob = Math.sin(t * 2.4) * s * 0.025;
  ctx.save();
  ctx.translate(x, y + bob);
  const r = s * 0.40;
  const asleep = p && p.asleep;

  // からだ（きほんは まるい）
  ctx.fillStyle = F.col;
  ctx.strokeStyle = 'rgba(80,60,80,0.32)';
  ctx.lineWidth = 2.6;

  if (F.k === 'obk') {
    // おばけ：下が ぎざぎざ
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.5);
    ctx.arc(0, r * 0.05, r, Math.PI, 0);
    ctx.lineTo(r, r * 0.75);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(r - (i * 2 + 1) * r / 4, r * (i % 2 ? 0.75 : 1.05));
      ctx.lineTo(r - (i * 2 + 2) * r / 4, r * (i % 2 ? 1.05 : 0.75));
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * (F.k === 'pig' ? 1.05 : 0.95), r * 0.98, 0, 0, 7);
    ctx.fill(); ctx.stroke();
  }

  // みみ・つの・くちばし
  if (F.k === 'cat') {
    ctx.fillStyle = F.col;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.30, -r * 0.80);
      ctx.lineTo(sg * r * 0.72, -r * 1.35);
      ctx.lineTo(sg * r * 0.86, -r * 0.62);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = F.sub;
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.42, -r * 0.80);
      ctx.lineTo(sg * r * 0.68, -r * 1.15);
      ctx.lineTo(sg * r * 0.76, -r * 0.70);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = F.col;
    }
    // ひげ
    ctx.strokeStyle = 'rgba(120,100,120,0.5)'; ctx.lineWidth = 1.6;
    for (const sg of [-1, 1]) for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.45, r * 0.12 + i * r * 0.12);
      ctx.lineTo(sg * r * 1.05, r * 0.06 + i * r * 0.20);
      ctx.stroke();
    }
  } else if (F.k === 'usa') {
    ctx.fillStyle = F.col;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.42, -r * 1.25, r * 0.20, r * 0.60, sg * 0.16, 0, 7);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = F.sub;
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.42, -r * 1.25, r * 0.10, r * 0.42, sg * 0.16, 0, 7); ctx.fill();
      ctx.fillStyle = F.col;
    }
  } else if (F.k === 'pen') {
    ctx.fillStyle = F.sub;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.30, r * 0.86, r * 0.62, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFC24A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.20, r * 0.02); ctx.lineTo(r * 0.20, r * 0.02);
    ctx.lineTo(0, r * 0.28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = F.sub;              // つばさ
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.92, r * 0.28, r * 0.18, r * 0.46, sg * 0.3, 0, 7); ctx.fill();
    }
  } else if (F.k === 'bear') {
    ctx.fillStyle = F.col;
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.arc(sg * r * 0.66, -r * 0.86, r * 0.28, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#FFF0DC';
    ctx.beginPath(); ctx.ellipse(0, r * 0.34, r * 0.40, r * 0.30, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6A4A2A';
    ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.14, r * 0.10, 0, 0, 7); ctx.fill();
  } else if (F.k === 'uni') {
    // つの と たてがみ
    ctx.fillStyle = '#FFD166';
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.92); ctx.lineTo(0, -r * 1.62); ctx.lineTo(r * 0.12, -r * 0.92);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = F.sub;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-r * 0.35 + i * r * 0.24, -r * 0.98 + Math.sin(i) * r * 0.08, r * 0.20, 0, 7);
      ctx.fill();
    }
    for (const sg of [-1, 1]) {
      ctx.fillStyle = F.col;
      ctx.beginPath();
      ctx.ellipse(sg * r * 0.66, -r * 0.80, r * 0.16, r * 0.30, sg * 0.4, 0, 7); ctx.fill(); ctx.stroke();
    }
  } else if (F.k === 'dra') {
    ctx.fillStyle = F.sub;              // つの
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.34, -r * 0.86);
      ctx.lineTo(sg * r * 0.56, -r * 1.42);
      ctx.lineTo(sg * r * 0.70, -r * 0.76);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = F.sub;              // せなかの とげ
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 0.70, r * (0.0 + i * 0.28));
      ctx.lineTo(r * 1.16, r * (0.10 + i * 0.28));
      ctx.lineTo(r * 0.72, r * (0.24 + i * 0.28));
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';  // おなか
    ctx.beginPath(); ctx.ellipse(0, r * 0.44, r * 0.44, r * 0.36, 0, 0, 7); ctx.fill();
  } else if (F.k === 'pig') {
    ctx.fillStyle = F.sub;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.42, -r * 0.78);
      ctx.lineTo(sg * r * 0.78, -r * 1.12);
      ctx.lineTo(sg * r * 0.86, -r * 0.60);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = F.sub;              // はな
    ctx.beginPath(); ctx.ellipse(0, r * 0.30, r * 0.28, r * 0.20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#B4657A';
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(sg * r * 0.10, r * 0.30, r * 0.05, r * 0.08, 0, 0, 7); ctx.fill();
    }
  }

  const lv = p ? petLevel(p) : 100;
  eyes(0, -r * 0.18, r * 0.18, asleep, Math.sin(t * 0.8) * 0.4);
  if (F.k !== 'pen' && F.k !== 'bear' && F.k !== 'pig') {
    cheeks(0, -r * 0.06, r * 0.18, F.k === 'obk' ? 'rgba(255,160,190,0.35)' : undefined);
    mouth(0, r * 0.34, r * 0.18, asleep ? 'o' : lv < 35 ? 'sad' : 'happy');
  }
  ctx.restore();
}

function drawPet(x, y, s, p, t) {
  if (!p) return;
  if (p.stage === 0) drawEgg(x, y, s, p.tap > 0 && G.shake > 0 ? G.t : G.t * 0.25);
  else if (p.stage === 1) drawBaby(x, y, s, p, t);
  else if (p.stage === 2) drawChild(x, y, s, p, t);
  else drawAdult(x, y, s, p.form, t, p);
}

function drawPoop(x, y, s) {
  ctx.fillStyle = '#7A5A3A';
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.9, s * 0.5, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.42, s * 0.62, s * 0.38, 0, 0, 7); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.76, s * 0.34, s * 0.26, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(x - s * 0.24, y - s * 0.86, s * 0.10, s * 0.07, 0, 0, 7); ctx.fill();
}

// --- あそんでいる 画面 -----------------------------------------------------------

function roomBg(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#4A3560'); g.addColorStop(1, '#2E2440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // まど
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  rr(ctx, VW * 0.62, 60, 150, 110, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,150,0.16)';
  ctx.beginPath(); ctx.arc(VW * 0.62 + 108, 96, 20, 0, 7); ctx.fill();
  // ゆか
  ctx.fillStyle = '#3A2C4E';
  ctx.fillRect(0, VH - 128, VW, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  for (let x = 0; x < VW; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, VH - 128); ctx.lineTo(x - 26, VH); ctx.stroke();
  }
  // ほし
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 12; i++) {
    const x = ((i * 137) % (VW - 40)) + 20;
    const y = 24 + ((i * 61) % 140);
    const r = 2 + (i % 3);
    ctx.beginPath(); ctx.arc(x, y, r * (0.7 + 0.3 * Math.sin(t * 2 + i)), 0, 7); ctx.fill();
  }
}

function bar(x, y, w, h, v, col, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = v < 25 ? '#FF7A8A' : col;
  rr(ctx, x, y, Math.max(h, w * v / 100), h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(label, x + 8, y + h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawPlay(t) {
  const p = G.pet;
  roomBg(t);
  if (!p) return;

  const cx = VW * 0.42, cy = VH * 0.60;

  // ペット（おすと よろこぶ）
  const size = Math.min(VH * 0.52, VW * 0.42);
  const pb = button(cx - size * 0.42, cy - size * 0.62, size * 0.84, size * 1.0, () => {
    if (p.stage === 0) { pokeEgg(); return; }
    if (!p.alive) return;
    p.fun = clamp100(p.fun + 2);
    puff('heart', 2);
    sfxTap();
  });
  const shake = G.shake > 0 ? Math.sin(G.t * 60) * 6 : 0;
  drawPet(cx + shake, cy, size, p, t);

  // うんち。★ ペットの あとに 描く。前に 描くと 体に かくれて 見えない
  for (let i = 0; i < p.poop.length; i++) {
    const q = p.poop[i];
    const b = button(cx + q.x - 20, cy + q.y - 14, 40, 40, ((k) => () => pokePoop(k))(i));
    drawPoop(b.x + 20, b.y + 30, 15);
  }

  // びょうきの しるし
  if (p.sick) {
    ctx.fillStyle = '#FF8FA0';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('！', cx + size * 0.42, cy - size * 0.42 + Math.sin(t * 6) * 4);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('びょうき', cx + size * 0.46, cy - size * 0.30);
    ctx.textAlign = 'left';
  }
  // ねている しるし
  if (p.asleep) {
    ctx.fillStyle = 'rgba(200,220,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i * 0.33) % 1;
      ctx.font = 'bold ' + (12 + i * 5) + 'px system-ui, sans-serif';
      ctx.globalAlpha = 1 - k;
      ctx.fillText('Z', cx + size * 0.30 + k * 26, cy - size * 0.36 - k * 40);
    }
    ctx.globalAlpha = 1;
  }

  // ハートや あわ
  for (const h of G.heart) {
    const a = 1 - h.t / h.life;
    ctx.globalAlpha = Math.max(0, a);
    const hx = cx + h.x, hy = cy + h.y;
    if (h.k === 'heart') {
      ctx.fillStyle = '#FF8FBB';
      ctx.beginPath();
      ctx.arc(hx - 4, hy, 4, 0, 7); ctx.arc(hx + 4, hy, 4, 0, 7);
      ctx.moveTo(hx - 8, hy + 1); ctx.lineTo(hx, hy + 11); ctx.lineTo(hx + 8, hy + 1);
      ctx.closePath(); ctx.fill();
    } else if (h.k === 'bub') {
      ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = '#8FD6FF';
      ctx.beginPath();
      ctx.moveTo(hx, hy - 6); ctx.quadraticCurveTo(hx + 5, hy + 2, hx, hy + 6);
      ctx.quadraticCurveTo(hx - 5, hy + 2, hx, hy - 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawHud(t);
  if (G.play) drawMini(t);
}

function drawHud(t) {
  const p = G.pet;
  // 左上：名まえと 日にち
  ctx.fillStyle = 'rgba(20,14,30,0.65)';
  rr(ctx, 10, 8, 190, 118, 12); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  fitFont(p.name, 130, 17, 'bold ');
  ctx.fillText(p.name, 20, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(p.age.toFixed(1) + ' 日め', 20, 36);

  bar(20, 54, 160, 13, p.hunger, '#FFD166', 'おなか');
  bar(20, 71, 160, 13, p.fun, '#FF9FC0', 'きげん');
  bar(20, 88, 160, 13, p.clean, '#8FD6FF', 'きれい');
  bar(20, 105, 160, 13, p.energy, '#A8E6CF', 'げんき');

  // お世話の ボタン（下に よこ 1れつ）
  const n = ACTS.length;
  const bw = Math.min(120, (VW - 40) / n - 8);
  const total = n * bw + (n - 1) * 8;
  const x0 = (VW - total) / 2;
  for (let i = 0; i < n; i++) {
    const a = ACTS[i];
    const b = button(x0 + i * (bw + 8), VH - 62, bw, 46, () => doAct(a.k));
    const on = a.k === 'sleep' && p.asleep;
    drawButton(b, on ? 'おきる' : a.name, on ? '#FFE066' : a.col);
    if (a.k === 'med' && p.sick) {
      ctx.fillStyle = '#FF5A6A';
      ctx.beginPath(); ctx.arc(b.x + b.w - 6, b.y + 6, 6, 0, 7); ctx.fill();
    }
  }

  // 右上の ボタン
  drawButton(button(VW - 96, 10, 86, 28, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');
  drawButton(button(VW - 190, 10, 86, 28, () => { G.screen = 'zukan'; }),
             'ずかん', '#C9A9FF');

  // ひとこと
  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.fillStyle = 'rgba(20,14,30,0.8)';
    const fs = fitFont(G.msg, VW * 0.7, 16, 'bold ');
    const w = ctx.measureText(G.msg).width + 28;
    rr(ctx, (VW - w) / 2, VH - 108, w, 32, 10); ctx.fill();
    ctx.fillStyle = '#FFF3F7';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.fillText(G.msg, VW / 2, VH - 92);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
  }

  // たまごの ときの あんない
  if (p.stage === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('たまごを トントン してみよう（' + p.tap + ' / 8）', VW / 2, 150);
    ctx.textAlign = 'left';
  }
}

function doAct(k) {
  if (k === 'food') { G.foodOpen = !G.foodOpen; sfxTap(); return; }
  if (k === 'play') actPlay();
  else if (k === 'bath') actBath();
  else if (k === 'sleep') actSleep();
  else if (k === 'med') actMed();
}

// ごはんの えらびかた
function drawFoodPick() {
  if (!G.foodOpen) return;
  const w = 300, h = 96, x = (VW - w) / 2, y = VH - 176;
  ctx.fillStyle = 'rgba(20,14,30,0.9)';
  rr(ctx, x, y, w, h, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('なにを あげる？', x + 12, y + 8);
  for (let i = 0; i < FOODS.length; i++) {
    const f = FOODS[i];
    const b = button(x + 12 + i * 94, y + 28, 86, 54, () => { actFood(f.k); G.foodOpen = false; });
    drawButton(b, f.name, f.col, '#3A2A40', 'おなか +' + f.gain);
  }
}

// ミニゲーム「どっちの 手？」
function drawMini(t) {
  const g = G.play;
  ctx.fillStyle = 'rgba(20,14,30,0.82)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(G.msg || 'どっちの 手？', VW * 0.7, 24, 'bold ');
  ctx.fillText(G.msg || 'どっちの 手？', VW / 2, 70);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText((g.round + 1) + ' / 3　あたり ' + g.hit, VW / 2, 100);

  for (let i = 0; i < 2; i++) {
    const bx = VW / 2 + (i ? 40 : -180), by = 150;
    const b = button(bx, by, 140, 140, () => playPick(i));
    ctx.fillStyle = g.show === i ? '#FFE066' : '#FFD9C0';
    rr(ctx, b.x, b.y, b.w, b.h, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 3; ctx.stroke();
    // て（まる 5つ）
    ctx.fillStyle = '#FFC9A8';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(b.x + 30 + k * 26, b.y + 34, 13, 0, 7); ctx.fill();
    }
    if (g.show === i) {
      // あたりの なかみ
      ctx.fillStyle = '#FF8FBB';
      ctx.beginPath();
      const hx = b.x + 70, hy = b.y + 92;
      ctx.arc(hx - 9, hy, 9, 0, 7); ctx.arc(hx + 9, hy, 9, 0, 7);
      ctx.moveTo(hx - 18, hy + 2); ctx.lineTo(hx, hy + 24); ctx.lineTo(hx + 18, hy + 2);
      ctx.closePath(); ctx.fill();
    }
  }
  if (g.show >= 0) {
    ctx.fillStyle = g.pick === g.answer ? '#8FF0A0' : '#FF9FB0';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(g.pick === g.answer ? 'あたり！' : 'はずれ…', VW / 2, VH - 60);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- ずかん ----------------------------------------------------------------------

function drawZukan(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3A2A50'); g.addColorStop(1, '#2E2440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const got = FORMS.filter((f) => save.zukan[f.k]).length;
  ctx.fillText('ずかん　' + got + ' / ' + FORMS.length, 24, 14);

  // ★ 「会った回数」を 上に 出すと 顔に かぶるので、いちばん 下に 置く。
  const cols = VW > 660 ? 4 : 2;
  const cw = (VW - 48) / cols, ch = 152;
  for (let i = 0; i < FORMS.length; i++) {
    const f = FORMS[i];
    const x = 24 + (i % cols) * cw, y = 48 + Math.floor(i / cols) * ch;
    const mx = x + cw / 2 - 4;
    const has = !!save.zukan[f.k];
    ctx.fillStyle = has ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.25)';
    rr(ctx, x + 4, y, cw - 12, ch - 12, 12); ctx.fill();
    ctx.textAlign = 'center';
    if (has) {
      drawAdult(mx - 2, y + 54, 92, f.k, t + i, null);
      ctx.fillStyle = '#FFFFFF';
      fitFont(f.name, cw - 26, 15, 'bold ');
      ctx.fillText(f.name, mx, y + 94);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      fitFont(f.about, cw - 26, 11);
      ctx.fillText(f.about, mx, y + 113);
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('会った 回数 ' + save.zukan[f.k], mx, y + 128);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText('？', mx, y + 34);
      ctx.font = 'bold 12px system-ui, sans-serif';
      fitFont(f.about, cw - 26, 12);
      ctx.fillText(f.about, mx, y + 100);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('まだ 会って いない', mx, y + 128);
    }
    ctx.textAlign = 'left';
  }
  drawButton(button(VW - 110, 12, 96, 32, () => { G.screen = G.pet && G.pet.alive ? 'play' : 'title'; }),
             'もどる', '#FFD166');
}

// --- タイトル --------------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#5A3A6E'); g.addColorStop(1, '#2E2440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  let y = 18;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのたまごっこ', VW * 0.44, 40, 'bold ');
  ctx.fillText('ゆいのたまごっこ', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#F7D9E8';
  const ss = fitFont('たまごから 育てて、どんな 姿に なるか 見てみよう', VW * 0.52, 15);
  ctx.fillText('たまごから 育てて、どんな 姿に なるか 見てみよう', 26, y);
  y += ss + 14;

  // 見本の キャラ
  const show = ['cat', 'usa', 'pen', 'uni'];
  for (let i = 0; i < show.length; i++) {
    drawAdult(VW - 62 - (show.length - 1 - i) * 78, 74 + Math.sin(t * 2 + i) * 5, 84, show[i], t + i, null);
  }

  const got = FORMS.filter((f) => save.zukan[f.k]).length;
  ctx.fillStyle = 'rgba(20,14,30,0.6)';
  rr(ctx, 24, y, Math.min(VW - 48, 430), 78, 12); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('ずかん　' + got + ' / ' + FORMS.length + ' しゅるい', 40, y + 12);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('育てた 回数 ' + save.plays + '　いちばん 長く ' + save.best + ' 日', 40, y + 36);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(save.pet ? 'とちゅうの 子が いる よ' : '新しい たまごから はじめよう', 40, y + 56);

  const by = y + 96;
  drawButton(button(24, by, 210, 52, () => startRun(false)), '新しい たまご', '#FFD166');
  if (save.pet) {
    drawButton(button(250, by, 230, 52, () => startRun(true)),
               'つづきから', '#8FD6FF', '#123048', save.pet.name + '（' + save.pet.age.toFixed(1) + '日め）');
  }

  drawButton(button(VW - 340, VH - 42, 100, 32, () => { G.screen = 'zukan'; }), 'ずかん', '#C9A9FF');
  drawButton(button(VW - 232, VH - 42, 108, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 42, 100, 32, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto() {
  ctx.fillStyle = '#2E2440'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#F7D9E8';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① たまごを トントン すると 早く われる（待っていても われる）',
    '② 下の ボタンで お世話。ごはん・あそぶ・おふろ・ねんね・おくすり',
    '③ 4つの ものさし（おなか・きげん・きれい・げんき）を へらさない',
    '④ 1日 は ' + DAY + ' びょう。3日 たつと 大人に なる',
  ].concat(TIPS);
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  drawButton(button(VW - 116, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, G.result && G.result.win ? '#6A4A8A' : '#3A3050');
  g.addColorStop(1, '#2E2440');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const R = G.result || { win: false, days: 0 };
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = R.win ? '#FFE066' : '#FF9FB0';
  fitFont(R.win ? '大人に なった！' : 'また あした ね…', VW * 0.6, 40, 'bold ');
  ctx.fillText(R.win ? '大人に なった！' : 'また あした ね…', VW / 2, 22);

  if (R.win && R.form) {
    drawAdult(VW / 2, 170, 150, R.form, t, null);
    const F = FORM_OF[R.form];
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(F.name, VW / 2, 246);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    fitFont(F.about, VW * 0.7, 14, 'bold ');
    ctx.fillText(F.about, VW / 2, 278);
    ctx.fillStyle = '#8FD6FF';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('ずかんに 登録した！　' + FORMS.filter((f) => save.zukan[f.k]).length +
                 ' / ' + FORMS.length, VW / 2, 302);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('ものさしが 0の ままだと お別れに なって しまう', VW / 2, 120);
    ctx.fillText('つぎは こまめに お世話して みよう', VW / 2, 148);
    ctx.fillStyle = '#FFD166';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(R.days.toFixed(1) + ' 日 いっしょに いた', VW / 2, 192);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(190, VW * 0.26);
  drawButton(button(VW / 2 - bw - 90, VH - 60, bw, 44, () => startRun(false)), '新しい たまご', '#FFD166');
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 44, () => { G.screen = 'zukan'; }), 'ずかん', '#C9A9FF');
  drawButton(button(VW / 2 + 90, VH - 60, bw, 44, () => { G.screen = 'title'; }), 'タイトルへ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ----------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) { b.on(); return; }
  if (G.screen === 'play') G.foodOpen = false;
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
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'zukan') drawZukan(tsec);
  else if (G.screen === 'result') drawResult(tsec);
  else { drawPlay(tsec); drawFoodPick(); }

  portraitTip();
  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
