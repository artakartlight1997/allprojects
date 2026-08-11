// 画面・そうさ・メインループ。
//
// 見せかたで いちばん 大事なのは 「**あと どれだけ 待てるか**」。
// お客さんの まわりの わっかが へっていき、色も 緑 → きいろ → 赤 に かわる。
// 数字ではなく 形と 色で 出すのは、小学生が ちらっと 見て わかる ため。

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

// --- 絵 -------------------------------------------------------------------------

// 料理。ぜんぶ まる と しかく の くみあわせで かく。
function drawDish(key, x, y, s) {
  const d = dishOf(key);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (key === 'juice') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-9, -12); ctx.lineTo(9, -12); ctx.lineTo(6, 13); ctx.lineTo(-6, 13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.col;
    ctx.beginPath();
    ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(5.5, 12); ctx.lineTo(-5.5, 12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#F04A6A'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(1, -6); ctx.stroke();
  } else if (key === 'ice') {
    ctx.fillStyle = '#E8B870';
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.col;
    ctx.beginPath(); ctx.arc(-3.5, -3, 6.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -3, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = d.col2;
    ctx.beginPath(); ctx.arc(0, -10, 6, 0, 7); ctx.fill();
  } else if (key === 'sand') {
    ctx.fillStyle = d.col;
    ctx.beginPath();
    ctx.moveTo(-12, 9); ctx.lineTo(12, 9); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.col2;
    ctx.beginPath();
    ctx.moveTo(-7, 3); ctx.lineTo(7, 3); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#C8A870'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-12, 9); ctx.lineTo(12, 9); ctx.lineTo(0, -12); ctx.closePath(); ctx.stroke();
  } else if (key === 'soup') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, 4, 14, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = d.col;
    ctx.beginPath(); ctx.ellipse(0, 1, 11, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-1, -13, -4, -17);
    ctx.moveTo(4, -8); ctx.quadraticCurveTo(7, -13, 4, -17);
    ctx.stroke();
  } else if (key === 'cake') {
    ctx.fillStyle = d.col;
    rr(ctx, -11, -6, 22, 16, 3); ctx.fill();
    ctx.fillStyle = '#F0D8B0';
    ctx.fillRect(-11, -1, 22, 4);
    ctx.fillStyle = d.col2;
    ctx.beginPath(); ctx.arc(0, -10, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#D8C0A0'; ctx.lineWidth = 1.4;
    rr(ctx, -11, -6, 22, 16, 3); ctx.stroke();
  } else if (key === 'pan') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, 10, 15, 5, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = d.col;
      ctx.beginPath(); ctx.ellipse(0, 5 - i * 6, 12, 4.5, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = d.col2;
    ctx.beginPath(); ctx.arc(0, -12, 4.5, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// どうぶつの かお
function drawAnimal(a, x, y, r, mood, t) {
  ctx.save();
  ctx.translate(x, y);
  // まちきれない ほど ぷるぷる する
  if (mood < 0.35) ctx.translate(Math.sin(t * 24) * (0.35 - mood) * 8, 0);
  // みみ
  ctx.fillStyle = a.col;
  if (a.ear === 'long') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.42, -r * 1.05, r * 0.20, r * 0.55, s * 0.18, 0, 7);
      ctx.fill();
    }
  } else if (a.ear === 'point') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.28, -r * 0.72);
      ctx.lineTo(s * r * 0.92, -r * 1.22);
      ctx.lineTo(s * r * 0.86, -r * 0.42);
      ctx.closePath(); ctx.fill();
    }
  } else if (a.ear === 'flop') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.86, -r * 0.14, r * 0.24, r * 0.46, s * 0.3, 0, 7);
      ctx.fill();
    }
  } else if (a.ear === 'big') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.92, -r * 0.12, r * 0.44, r * 0.60, 0, 0, 7);
      ctx.fill();
    }
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = a.dark ? '#3A3038' : a.col;
      ctx.beginPath(); ctx.arc(s * r * 0.72, -r * 0.74, r * 0.30, 0, 7); ctx.fill();
    }
  }
  // かお
  ctx.fillStyle = a.col;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  if (a.dark) {
    ctx.fillStyle = '#3A3038';
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.14, r * 0.26, r * 0.30, 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 0.14, r * 0.26, r * 0.30, -0.3, 0, 7); ctx.fill();
  }
  // め（まちきれないと への字）
  ctx.fillStyle = '#2A2028';
  const ey = -r * 0.12;
  if (mood > 0.35) {
    ctx.beginPath(); ctx.arc(-r * 0.34, ey, r * 0.11, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.34, ey, r * 0.11, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = r * 0.10; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.20, ey - r * 0.14);
      ctx.lineTo(s * r * 0.48, ey + r * 0.06);
      ctx.stroke();
    }
  }
  // はな と くち
  if (a.nose) {
    ctx.fillStyle = '#E88AA0';
    ctx.beginPath(); ctx.ellipse(0, r * 0.26, r * 0.26, r * 0.18, 0, 0, 7); ctx.fill();
  } else if (a.nose2) {
    // ぞうの はな。かおの 下へ たれ下がる ように かく。
    // かおの 中に おさめると ただの かたまりに 見えて しまう。
    ctx.fillStyle = a.col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.20, r * 0.30);
    ctx.quadraticCurveTo(-r * 0.24, r * 1.05, r * 0.04, r * 1.24);
    ctx.lineTo(r * 0.20, r * 1.10);
    ctx.quadraticCurveTo(r * 0.02, r * 0.98, r * 0.20, r * 0.30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = r * 0.05;
    for (let k = 1; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.21 + k * 0.01 * r, r * (0.5 + k * 0.22));
      ctx.lineTo(r * 0.19, r * (0.5 + k * 0.22));
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.11, r * 0.08, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    if (mood > 0.35) ctx.arc(0, r * 0.20, r * 0.22, 0.35, Math.PI - 0.35);
    else ctx.arc(0, r * 0.52, r * 0.22, Math.PI + 0.5, -0.5);
    ctx.stroke();
  }
  ctx.restore();
}

// あおいちゃん（カウンターの うしろ）
function drawAoi(x, y, r, t) {
  ctx.save();
  ctx.translate(x, y);
  // からだ
  ctx.fillStyle = '#FF8FB8';
  rr(ctx, -r * 0.9, r * 0.5, r * 1.8, r * 1.5, r * 0.4); ctx.fill();
  // エプロン
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, -r * 0.55, r * 0.7, r * 1.1, r * 1.2, r * 0.18); ctx.fill();
  // かお
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  // かみ（ツインテール）
  ctx.fillStyle = '#3A2A1E';
  ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 1.0, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 1.05, r * 0.16, r * 0.32, r * 0.56, s * 0.35, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * r * 0.92, -r * 0.30, r * 0.15, 0, 7); ctx.fill();
  }
  // め と くち
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-r * 0.30, r * 0.06, r * 0.11, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.30, r * 0.06, r * 0.11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2A2028'; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.arc(0, r * 0.22, r * 0.22, 0.35, Math.PI - 0.35); ctx.stroke();
  ctx.restore();
}

// --- あそんでいる 画面 ------------------------------------------------------------

const SEAT_Y = 148;
const CNT_Y = 250;
const BTN_Y = 322;

function seatX(s, n) {
  const w = Math.min(132, (VW - 40) / n);
  return VW / 2 - (w * n) / 2 + w * s + w / 2;
}

function drawPlay(t) {
  // お店の 中
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#F6E0C8'); g.addColorStop(0.55, '#EAD0B0'); g.addColorStop(1, '#C89A72');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // かべの もよう
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 0; x < VW; x += 56) ctx.fillRect(x, 0, 28, 96);

  drawTop(t);

  // いす と お客さん
  const n = G.D.seats;
  for (let s = 0; s < n; s++) {
    const x = seatX(s, n);
    ctx.fillStyle = 'rgba(120,80,50,0.22)';
    ctx.beginPath(); ctx.ellipse(x, SEAT_Y + 46, 40, 11, 0, 0, 7); ctx.fill();
  }
  for (const gs of G.guests) drawGuest(gs, t);

  // カウンター
  ctx.fillStyle = '#8A5A38';
  rr(ctx, 12, CNT_Y - 26, VW - 24, 52, 10); ctx.fill();
  ctx.fillStyle = '#A8724A';
  rr(ctx, 16, CNT_Y - 22, VW - 32, 40, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('できあがり', 24, CNT_Y - 12);
  // わく
  const cw = Math.min(64, (VW - 130) / SLOTS);
  for (let i = 0; i < SLOTS; i++) {
    const x = 96 + i * cw;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
    rr(ctx, x, CNT_Y - 20, cw - 6, 36, 6); ctx.stroke();
  }
  for (let i = 0; i < G.counter.length; i++) {
    const x = 96 + i * cw + (cw - 6) / 2;
    const pop = Math.max(0, 1 - G.counter[i].t * 5);
    drawDish(G.counter[i].key, x, CNT_Y - 1, 0.9 + pop * 0.35);
  }

  // あおいちゃん
  drawAoi(VW - 54, CNT_Y - 54, 22, t);

  // 料理ボタン
  const ds = G.D.dishes;
  const bw = Math.min(112, (VW - 40) / ds.length);
  for (let i = 0; i < ds.length; i++) {
    const x = VW / 2 - (bw * ds.length) / 2 + i * bw;
    const d = dishOf(ds[i]);
    const busy = G.cooking.length + G.counter.length >= SLOTS;
    const b = button(x + 3, BTN_Y, bw - 6, 74, () => cook(ds[i]));
    ctx.fillStyle = busy ? 'rgba(255,255,255,0.35)' : '#FFFFFF';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.20)'; ctx.lineWidth = 2; ctx.stroke();
    drawDish(ds[i], b.x + b.w / 2, b.y + 26, 1.0);
    ctx.fillStyle = '#4A3828';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(d.name, b.w * 0.9, 13, 'bold ');
    ctx.fillText(d.name, b.x + b.w / 2, b.y + 44);
    ctx.fillStyle = '#8A6A4A';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(d.yen + '円', b.x + b.w / 2, b.y + 58);
    ctx.textAlign = 'left';

    // ★ 作っている ようすは **その ボタンの 上**に 出す。
    //   べつの ところに ならべると、どの ボタンを おした ぶんか わからないし、
    //   お客さんの 絵にも かぶって しまう。
    const mine = G.cooking.filter((c) => c.key === ds[i]);
    if (mine.length) {
      let k = 0;
      for (const c of mine) k = Math.max(k, Math.min(1, c.t / c.time));
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      rr(ctx, b.x + 6, b.y + 5, b.w - 12, 7, 3.5); ctx.fill();
      ctx.fillStyle = mine.some((c) => c.wait) ? '#FF8FA0' : '#FF9C5A';
      rr(ctx, b.x + 6, b.y + 5, Math.max(4, (b.w - 12) * k), 7, 3.5); ctx.fill();
      if (mine.length > 1) {
        ctx.fillStyle = '#FF7A3A';
        ctx.beginPath(); ctx.arc(b.x + b.w - 12, b.y + 20, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(String(mine.length), b.x + b.w - 12, b.y + 21);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      }
    }
  }


  // 「+300円」などの ふきだし
  for (const p of G.pop) {
    const x = seatX(p.seat, n);
    const a = Math.max(0, 1 - p.t / 1.3);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.tip > 0 ? '#FFD166' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('+' + p.yen + '円', x, SEAT_Y - 40 + p.y);
    if (p.tip > 0) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('チップ +' + p.tip, x, SEAT_Y - 20 + p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  if (G.flashT > 0) {
    ctx.globalAlpha = Math.min(1, G.flashT * 2);
    // ★ ふきだしの ある 上のほうに 出すと お客さんの 注文が かくれる。
    //   カウンターと ボタンの あいだの あいた ところに 出す。
    ctx.fillStyle = 'rgba(40,20,20,0.72)';
    const fw = 300;
    rr(ctx, VW / 2 - fw / 2, BTN_Y - 30, fw, 26, 8); ctx.fill();
    ctx.fillStyle = '#FFC0C0';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.flash, fw * 0.9, 15, 'bold ');
    ctx.fillText(G.flash, VW / 2, BTN_Y - 17);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(30,20,14,0.55)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFE066';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('本日 へいてん', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop(t) {
  ctx.fillStyle = 'rgba(60,36,20,0.55)';
  rr(ctx, 8, 6, VW - 16, 34, 10); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  fitFont(G.D.name, VW * 0.22, 15, 'bold ');
  ctx.fillText(G.D.name, 20, 23);

  // うりあげ の ぼう
  const bx = VW * 0.30, bw = VW * 0.40;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  rr(ctx, bx, 13, bw, 15, 7); ctx.fill();
  const k = Math.min(1, G.money / G.goal);
  ctx.fillStyle = k >= 1 ? '#A8F0B0' : '#FFD166';
  rr(ctx, bx, 13, Math.max(6, bw * k), 15, 7); ctx.fill();
  ctx.fillStyle = '#3A2A18';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(G.money + ' / ' + G.goal + '円', bx + bw / 2, 21);

  // のこり時間
  const tx = VW * 0.74, tw = VW * 0.16;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  rr(ctx, tx, 13, tw, 15, 7); ctx.fill();
  const rest = dayLeft();
  ctx.fillStyle = rest < 0.16 ? '#FF8FA0' : '#8FD6FF';
  rr(ctx, tx, 13, Math.max(4, tw * rest), 15, 7); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(Math.ceil(Math.max(0, G.D.len - G.t)) + 'びょう', VW - 20, 21);
  ctx.textAlign = 'left';
}

function drawGuest(g, t) {
  const n = G.D.seats;
  const x = seatX(g.seat, n);
  let y = SEAT_Y;
  let alpha = 1;
  // 入ってくる／出ていく うごき
  if (g.inT < 0.4) { y -= (1 - g.inT / 0.4) * 60; alpha = g.inT / 0.4; }
  if (g.outT >= 0) { y -= (g.outT / 1.2) * 40; alpha = Math.max(0, 1 - g.outT / 1.2); }
  ctx.globalAlpha = alpha;

  // まちきれない わっか
  if (g.outT < 0) {
    const m = g.mood;
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke();
    ctx.strokeStyle = m > 0.6 ? '#7FD86A' : m > 0.3 ? '#FFD166' : '#FF6A6A';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, 44, -1.57, -1.57 + m * 6.283); ctx.stroke();
  }

  drawAnimal(g.animal, x, y, 30, g.outT >= 0 && g.angry ? 0 : g.mood, t);

  // たのんだ もの（ふきだし）
  if (g.outT < 0) {
    const cnt = g.want.length;
    const bw = 34 + cnt * 34;
    const by = y - 92;
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, x - bw / 2, by, bw, 46, 12); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 8, by + 46); ctx.lineTo(x + 8, by + 46); ctx.lineTo(x, by + 58);
    ctx.closePath(); ctx.fill();
    for (let k = 0; k < cnt; k++) {
      const dx = x - (cnt - 1) * 17 + k * 34;
      if (g.got[k]) {
        ctx.globalAlpha = alpha * 0.28;
        drawDish(g.want[k], dx, by + 23, 0.82);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#5AC87A'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(dx - 9, by + 23); ctx.lineTo(dx - 2, by + 30); ctx.lineTo(dx + 10, by + 14);
        ctx.stroke();
      } else {
        drawDish(g.want[k], dx, by + 23, 0.82);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#4A2A3A'); g.addColorStop(1, '#8A4A50');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('あおいのどうぶつカフェ', VW * 0.48, 40, 'bold ');
  ctx.fillText('あおいのどうぶつカフェ', 24, 16);
  ctx.fillStyle = '#FFD9C8';
  fitFont('たのまれた ものを 作って、まちきれなく なる まえに わたそう', VW * 0.54, 15);
  ctx.fillText('たのまれた ものを 作って、まちきれなく なる まえに わたそう', 26, 20 + fs + 4);

  // どうぶつを ならべて にぎやかに
  for (let i = 0; i < 5; i++) {
    drawAnimal(ANIMALS[i], VW - 60 - i * 62, 96 + Math.sin(t * 2 + i) * 4, 24, 1, t);
  }

  // 15日ぶんの ふだ（5 × 3）
  const cw = Math.min(96, (VW - 48) / 5), chh = 56;
  for (let i = 0; i < DAYS.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 148 + Math.floor(i / 5) * (chh + 8);
    const op = opened(i), cl = save.clear[i];
    if (op) button(cxp, cyp, cw - 8, chh, () => startDay(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.30)' : 'rgba(255,255,255,0.14)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 6);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(DAYS[i].goal + '円', cxp + (cw - 8) / 2, cyp + 30);
      const bk = save.best['d' + i];
      if (bk) {
        ctx.fillStyle = '#FFE066';
        ctx.fillText('さいこう ' + bk, cxp + (cw - 8) / 2, cyp + 42);
      }
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  const done = save.clear.filter(Boolean).length;
  ctx.fillText('クリアした 日  ' + done + ' / ' + DAYS.length +
               '　（3回 しっぱいすると つぎの 日も あくよ）', 24, 148 + 3 * (chh + 8) + 6);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
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
  ctx.fillStyle = '#3A2028'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD9C8';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① どうぶつの お客さんが すわると、ふきだしに たのむ ものが 出る',
    '② 下の 料理ボタンを おすと 作りはじめ。できるまで 時間が かかる',
    '③ できた 料理は カウンターに ならぶ',
    '④ お客さんを タップ → その人の たのんだ ものを わたす',
    '',
    '★ まわりの わっかが「あと どれくらい 待てるか」。',
    '　 みどり → きいろ → 赤 に なって、なくなると おこって 帰る',
    '★ わっかが みどりの うちに わたせると **チップ** が もらえる（+30%）',
    '★ カウンターに おけるのは 6つまで。作りすぎると 作れなく なる',
    '',
    'その日の 目標の お金を こえたら クリア。ぜんぶで 15日',
    '3回 しっぱいしたら、つぎの 日も あくし、お客さんも 少し 待ってくれる',
  ];
  ctx.fillStyle = '#F8E8E0';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 52 + i * 28);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'あと ちょっと…', VW * 0.5, 40, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'あと ちょっと…', VW / 2, 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.D.name, VW / 2, 62);

  const rows = [
    ['うりあげ', G.money + '円'],
    ['もくひょう', G.goal + '円'],
    ['よろこんで くれた 人', G.served + '人'],
    ['帰って しまった 人', G.left + '人'],
    ['チップ', G.tips + '円'],
  ];
  rows.forEach((r, i) => {
    const y = 96 + i * 34;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    rr(ctx, VW / 2 - 180, y, 360, 28, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(r[0], VW / 2 - 168, y + 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = i === 0 ? (G.win ? '#A8F0B0' : '#FFC0C0') : '#FFFFFF';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(r[1], VW / 2 + 168, y + 5);
    ctx.textAlign = 'center';
  });
  ctx.textAlign = 'left';

  const nxt = G.day + 1;
  const bw = Math.min(150, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 46, bw, 36, () => startDay(G.day)),
             'もう一度', '#E8D0F8');
  if (nxt < DAYS.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 46, bw, 36, () => startDay(nxt)),
               'つぎの 日', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 46, bw, 36, () => { G.screen = 'title'; }),
             '日をえらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const x = px / SC, y = py / SC - VOY;
  if (G.screen !== 'play') {
    const b = hitBtn(px, py);
    if (b) b.on();
    return;
  }
  // お客さんを さきに 見る（ボタンと かさなっても お客さん ゆうせん）
  if (!G.over) {
    const n = G.D.seats;
    for (const g of G.guests) {
      if (g.outT >= 0) continue;
      const gx = seatX(g.seat, n);
      // かおも ふきだしも タップして よい（小さい子は ふきだしを おしがち）
      if ((x - gx) * (x - gx) + (y - SEAT_Y) * (y - SEAT_Y) < 52 * 52) { serve(g); return; }
      if (x > gx - 60 && x < gx + 60 && y > SEAT_Y - 96 && y < SEAT_Y - 40) { serve(g); return; }
    }
  }
  const b = hitBtn(px, py);
  if (b) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'title'; }
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
  else if (G.screen === 'howto') drawHowto();
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#4A2A3A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFD9C8';
  ctx.fillText('カウンターが よこに ならぶよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
