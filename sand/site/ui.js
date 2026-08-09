// 画面・そうさ・メインループ。よこ向き専用。
//
// かくのは ぜんぶ「ゲームの 中の 大きさ」（たて VH＝450）で 書いて、
// さいごに 画面の 大きさへ まとめて のばす。どの スマホでも 同じ 見た目。

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
  ctx.fillStyle = textCol || '#3A2A20';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.36 : 0.46), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(58,42,32,0.7)';
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
  return null;
}

// --- あおいを かく（コックさんの かっこう）--------------------------------------

function drawAoi(x, y, s, pose, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // うでの ふり（pose で かわる）
  // 0 に 近いと うでが よこに ぴんと のびて ロボットみたいに 見えるので、
  // ふだんは 下がった ところを まん中に して ゆらす。
  const arm = pose === 'up' ? -0.9 : pose === 'down' ? 0.9
            : 0.55 + Math.sin(t * 3) * 0.12;
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath(); ctx.ellipse(0, 2, 22, 5, 0, 0, 7); ctx.fill();
  // あし
  ctx.fillStyle = '#31405A';
  rr(ctx, -13, -18, 10, 18, 3); ctx.fill();
  rr(ctx, 3, -18, 10, 18, 3); ctx.fill();
  // エプロン（からだ）
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-15, -18); ctx.lineTo(15, -18); ctx.lineTo(11, -46); ctx.lineTo(-11, -46);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF8FB8';
  rr(ctx, -12, -46, 24, 8, 3); ctx.fill();
  // うで
  ctx.strokeStyle = '#F6CFAC'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * 11, -40);
    ctx.lineTo(sg * (14 + Math.cos(arm) * 8), -40 + Math.sin(arm) * 26 + 6);
    ctx.stroke();
  }
  // あたま
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, -58, 13, 0, 7); ctx.fill();
  ctx.fillStyle = '#3A2A1E';
  ctx.beginPath(); ctx.arc(0, -60, 13, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * 15, -55, 4.5, 8, sg * 0.35, 0, 7); ctx.fill();
  }
  // コック帽
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, -11, -74, 22, 8, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(-6, -78, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -78, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -82, 8, 0, 7); ctx.fill();
  // かお
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-4, -57, 1.7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -57, 1.7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -54, 3.5, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay(t) {
  const b = beatNow();
  const st = RG.st;
  // だいどころ
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#FFF0DC'); g.addColorStop(1, '#FFD8AE');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // タイルの かべ
  ctx.strokeStyle = 'rgba(210,170,130,0.5)'; ctx.lineWidth = 2;
  for (let x = 0; x < VW; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 230); ctx.stroke();
  }
  for (let y = 24; y < 230; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke();
  }
  // だいの ふち
  ctx.fillStyle = '#B07A4A';
  ctx.fillRect(0, 300, VW, 12);
  ctx.fillStyle = '#E8C89A';
  ctx.fillRect(0, 312, VW, VH - 312);

  // ビートの めやす（4つの ランプ）
  const beatIn = ((b % 4) + 4) % 4;
  for (let i = 0; i < 4; i++) {
    const on = Math.floor(beatIn) === i;
    ctx.fillStyle = on ? '#FF8F5A' : 'rgba(180,130,90,0.35)';
    ctx.beginPath(); ctx.arc(VW / 2 - 60 + i * 40, 26, on ? 11 : 8, 0, 7); ctx.fill();
  }

  drawMini(st.kind, t, b);

  // あおい
  const pose = (b - RG.hitB) < 0.35 ? 'down' : 'idle';
  drawAoi(VW * 0.16, 300, 1.15, pose, t);

  // つぎの 音符の めやす（近づく わっか）。
  // 「いつ たたくか」が 目でも わかると、はじめての 子でも 入りやすい。
  drawLane(b);

  drawHUD(t, b);
}

// つぎの 音符までを あらわす わっか
// --- 音符の みち（右から ながれてくる）-------------------------------------------
//
// 音符は **右から** すべってきて、まん中の わくに かさなった ときが
// たたく とき。ちぢむ わっかより、いつ たたくかが 目で 追える。
// わくは 手もと（まないた・フライパン）の まうえに おいて、
// 見る ところを たて 1本に そろえる。

const LANE_Y = 128;          // みちの まん中の 高さ
const LANE_H = 52;           // みちの ふとさ
const LEAD = 2.2;            // なんはく さきまで 見えるか

function laneX(b, nb) {
  // nb … 音符の ビート、b … いまの ビート
  const mark = VW / 2;
  const per = (mark - 24) / LEAD;      // 1はく ぶんの ながさ
  return mark + (nb - b) * per;
}

function drawLane(b) {
  const mark = VW / 2;
  const per = (mark - 24) / LEAD;

  // みち
  ctx.fillStyle = 'rgba(70,44,26,0.30)';
  rr(ctx, 0, LANE_Y - LANE_H / 2, VW, LANE_H, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, LANE_Y - LANE_H / 2); ctx.lineTo(VW, LANE_Y - LANE_H / 2);
  ctx.moveTo(0, LANE_Y + LANE_H / 2); ctx.lineTo(VW, LANE_Y + LANE_H / 2);
  ctx.stroke();
  // 1はく ごとの 目じるし
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i <= LEAD + 1; i++) {
    const bx = mark + (i - ((b % 1) + 1) % 1) * per;
    if (bx < mark - 10 || bx > VW) continue;
    ctx.fillRect(bx - 1, LANE_Y - LANE_H / 2 + 6, 2, LANE_H - 12);
  }

  // たたく わく
  const hitAgo = b - RG.hitB;
  const flash = hitAgo >= 0 && hitAgo < 0.35 ? 1 - hitAgo / 0.35 : 0;
  ctx.fillStyle = 'rgba(255,224,102,' + (0.12 + flash * 0.6) + ')';
  ctx.beginPath(); ctx.arc(mark, LANE_Y, 26 + flash * 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mark, LANE_Y, 26, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,143,90,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mark, LANE_Y, 32, 0, 7); ctx.stroke();

  // 音符。うしろの ものから かく。
  const list = RG.notes.slice().sort((a, c) => c.b - a.b);
  for (const n of list) {
    const nb = n.k === 'hold' ? n.hb : n.b;
    const d = nb - b;
    if (d > LEAD + 0.6 || d < -1.2) continue;
    const x = mark + d * per;
    if (n.k === 'hold') {
      // ながおし。おす ところ から はなす ところ までの ぼう。
      const x2 = mark + (n.b - b) * per;
      ctx.globalAlpha = n.res ? 0.3 : 1;
      ctx.fillStyle = n.held && !n.res ? '#8FE0FF' : 'rgba(143,214,255,0.55)';
      rr(ctx, Math.min(x, x2), LANE_Y - 13, Math.abs(x2 - x), 26, 13); ctx.fill();
      ctx.strokeStyle = '#5AA8D8'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = n.res ? '#B0C4D4' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, LANE_Y, 15, 0, 7); ctx.fill();
      ctx.fillStyle = '#5AA8D8';
      ctx.beginPath(); ctx.arc(x2, LANE_Y, 9, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (n.k === 'call') {
      // コックさんの お手本。たたかない ので わく だけ。
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#C8C0B0'; ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(x, LANE_Y, 16, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      continue;
    }
    // ふつうの 音符
    const done = !!n.res;
    ctx.globalAlpha = done ? Math.max(0, 1 + d * 1.4) * 0.5 : 1;
    const col = n.res === 'miss' ? '#B0A090' : '#FF8F5A';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, LANE_Y, 19, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x - 5, LANE_Y - 5, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,40,10,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, LANE_Y, 19, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 「ここで たたく！」の やじるし（はじめの うちだけ）
  if (b < RG.st.intro * 4 + 4) {
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.moveTo(mark, LANE_Y + 38);
    ctx.lineTo(mark - 10, LANE_Y + 52); ctx.lineTo(mark + 10, LANE_Y + 52);
    ctx.closePath(); ctx.fill();
  }
}

// --- ミニゲームの 見た目 ---------------------------------------------------------
//
// しゅるいごとに 絵は ちがうけれど、たたく しくみは ぜんぶ 同じ。

function drawMini(kind, t, b) {
  const hit = b - RG.hitB;
  const miss = b - RG.missB;
  const call = b - RG.callB;
  const cx = VW * 0.5, cy = 300;
  const food = FOODS[RG.st.food];

  // まないた／フライパン
  if (kind === 'cut' || kind === 'place' || kind === 'spread' || kind === 'wrap' ||
      kind === 'squeeze') {
    ctx.fillStyle = '#C89A62';
    rr(ctx, cx - 130, cy - 16, 260, 20, 8); ctx.fill();
    ctx.fillStyle = '#E0B888';
    rr(ctx, cx - 126, cy - 14, 252, 8, 4); ctx.fill();
  } else if (kind === 'grill') {
    ctx.fillStyle = '#4A4A55';
    rr(ctx, cx - 120, cy - 22, 240, 26, 12); ctx.fill();
    ctx.fillStyle = '#33333C';
    rr(ctx, cx + 116, cy - 16, 90, 10, 5); ctx.fill();
    // ジュージューの けむり
    for (let i = 0; i < 5; i++) {
      const a = (t * 0.7 + i * 0.7) % 2;
      ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 0.35 - a * 0.18) + ')';
      ctx.beginPath();
      ctx.arc(cx - 60 + i * 30 + Math.sin(a * 3 + i) * 8, cy - 30 - a * 44, 8 + a * 7, 0, 7);
      ctx.fill();
    }
  } else if (kind === 'mix') {
    ctx.fillStyle = '#DCE4EE';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 10, 92, 34, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#B8C4D2';
    ctx.beginPath(); ctx.ellipse(cx, cy - 44, 92, 18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = food.col;
    ctx.beginPath(); ctx.ellipse(cx, cy - 42, 78, 14, 0, 0, 7); ctx.fill();
  } else if (kind === 'shake') {
    ctx.fillStyle = '#C89A62';
    rr(ctx, cx - 120, cy - 16, 240, 20, 8); ctx.fill();
  }

  if (kind === 'cut') {
    // きられる ざいりょう。たたくたび すこしずつ はなれていく。
    const done = RG.perfect + RG.good;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const cut = Math.max(0, Math.min(1, done - i));
      const sp = (i - (n - 1) / 2) * (30 + cut * 12);
      ctx.save();
      ctx.translate(cx + sp, cy - 18);
      ctx.rotate(cut * (i % 2 ? 0.12 : -0.12));
      ctx.fillStyle = food.col;
      rr(ctx, -14, -30, 28, 30, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      rr(ctx, -10, -26, 20, 8, 4); ctx.fill();
      ctx.fillStyle = 'rgba(120,80,40,0.25)';
      rr(ctx, -14, -6, 28, 6, 3); ctx.fill();
      ctx.restore();
    }
    // ほうちょう。え が 上、は が 下。おろすと 下がる。
    const swing = hit < 0.3 && hit >= 0 ? (1 - hit / 0.3) : 0;
    ctx.save();
    ctx.translate(cx + 10, cy - 96 + swing * 66);
    ctx.rotate(-0.35 + swing * 0.35);
    ctx.fillStyle = '#7A5230';
    rr(ctx, -8, -34, 16, 32, 6); ctx.fill();
    ctx.fillStyle = '#5A3A20';
    rr(ctx, -8, -10, 16, 8, 3); ctx.fill();
    ctx.fillStyle = '#CFD6E2';
    ctx.beginPath();
    ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.lineTo(9, 46); ctx.lineTo(-9, 35);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2F6FB';
    ctx.beginPath();
    ctx.moveTo(-9, 26); ctx.lineTo(9, 37); ctx.lineTo(9, 46); ctx.lineTo(-9, 35);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (swing > 0.6) {
      ctx.strokeStyle = 'rgba(255,255,255,' + swing + ')'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx - 40, cy - 34); ctx.lineTo(cx + 56, cy - 34); ctx.stroke();
    }
  } else if (kind === 'grill') {
    // やける ざいりょう。だんだん 色が こく なる。
    const done = RG.perfect + RG.good;
    for (let i = 0; i < 3; i++) {
      const k = Math.min(1, done / 6);
      ctx.save();
      ctx.translate(cx - 62 + i * 62, cy - 24);
      const flip = hit < 0.3 && hit >= 0 ? Math.sin((hit / 0.3) * Math.PI) : 0;
      ctx.translate(0, -flip * 34);
      ctx.rotate(flip * 3.1);
      ctx.fillStyle = food.col;
      rr(ctx, -26, -10, 52, 20, 8); ctx.fill();
      ctx.fillStyle = 'rgba(120,60,20,' + (0.15 + k * 0.5) + ')';
      for (let s2 = 0; s2 < 3; s2++) rr(ctx, -20 + s2 * 14, -8, 5, 16, 2), ctx.fill();
      ctx.restore();
    }
  } else if (kind === 'spread') {
    ctx.save();
    ctx.translate(cx, cy - 28);
    // パン（みみ つき）
    ctx.fillStyle = '#C89050';
    rr(ctx, -104, -20, 208, 30, 10); ctx.fill();
    ctx.fillStyle = '#F6E2BE';
    rr(ctx, -99, -16, 198, 22, 8); ctx.fill();
    // ぬれた ぶん。左から だんだん のびていく。
    const k = Math.min(1, (RG.perfect + RG.good) / Math.max(1, totalNotes()));
    ctx.fillStyle = FOODS[RG.st.food].col;
    rr(ctx, -95, -13, Math.max(0, 190 * k), 16, 7); ctx.fill();
    if (k > 0 && k < 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(-95 + 190 * k, -5, 5, 9, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
    // ナイフ。ぬっている ところに ついていく。
    const sw = hit < 0.3 && hit >= 0 ? Math.sin((hit / 0.3) * Math.PI) : 0;
    const kk = Math.min(1, (RG.perfect + RG.good) / Math.max(1, totalNotes()));
    ctx.save();
    ctx.translate(cx - 95 + 190 * kk, cy - 74 + sw * 22);
    ctx.rotate(0.45 - sw * 0.25);
    ctx.fillStyle = '#7A5230'; rr(ctx, -7, 0, 14, 34, 5); ctx.fill();
    ctx.fillStyle = '#CFD6E2';
    ctx.beginPath();
    ctx.moveTo(-6, 2); ctx.lineTo(6, 2); ctx.lineTo(5, -44); ctx.lineTo(-3, -44);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (kind === 'place') {
    // 上から ざいりょうが おちてくる
    ctx.save();
    ctx.translate(cx, cy - 22);
    ctx.fillStyle = '#C89050';
    rr(ctx, -92, -16, 184, 24, 9); ctx.fill();
    ctx.fillStyle = '#F6E2BE';
    rr(ctx, -88, -13, 176, 17, 7); ctx.fill();
    const done = RG.perfect + RG.good;
    for (let i = 0; i < Math.min(6, done); i++) {
      drawFood(ctx, RG.st.food, 0, -18 - i * 5, 150, t);
    }
    ctx.restore();
    // おちてくる もの
    let next = null;
    for (const n of RG.notes) {
      if (n.k === 'call' || n.res) continue;
      const nb = n.k === 'hold' ? n.hb : n.b;
      if (nb >= b - 0.2) { next = nb; break; }
    }
    // 音符が わくに ついた あたりで、ざいりょうが みちから 手もとへ おちる。
    // 「たたいた 音符が そのまま ざいりょうに なる」ように 見せる。
    if (next !== null && next - b < 0.75) {
      const k = Math.max(0, Math.min(1, 1 - (next - b) / 0.75));
      drawFood(ctx, RG.st.food, cx, LANE_Y + 10 + k * (cy - 66 - LANE_Y), 90, t);
    }
    if (call < 0.5 && call >= 0) {
      ctx.fillStyle = '#C8501A';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText('お手本！', cx, 68);
      ctx.textAlign = 'left';
    }
  } else if (kind === 'mix') {
    // ボウルの 中を クルクル
    const a = b * Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy - 42);
    ctx.strokeStyle = '#A08050'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a) * 46 * 0.5 + 8, -66);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 46, Math.sin(a) * 12, 16, 6, 0, 0, 7); ctx.fill();
    ctx.restore();
    if (hit < 0.3 && hit >= 0) {
      const k = 1 - hit / 0.3;
      ctx.fillStyle = 'rgba(255,255,255,' + k * 0.8 + ')';
      for (let i = 0; i < 6; i++) {
        const aa = i * 1.05 + b;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(aa) * (40 + (1 - k) * 40),
                cy - 48 + Math.sin(aa) * (14 + (1 - k) * 20), 4 * k + 1, 0, 7);
        ctx.fill();
      }
    }
  } else if (kind === 'squeeze') {
    // マヨネーズの ようき。おしっぱなしで にゅるー と 出る
    const on = !!RG.holding;
    ctx.save();
    ctx.translate(cx, cy - 92);
    ctx.fillStyle = '#F0F4F8';
    rr(ctx, -20, -40, 40, 54, 13); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    rr(ctx, -14, -32, 28, 38, 9); ctx.fill();
    ctx.fillStyle = '#C8CEDA';
    rr(ctx, -7, 12, 14, 15, 4); ctx.fill();
    ctx.restore();
    if (on) {
      ctx.strokeStyle = '#FFFBEA'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 64);
      for (let i = 0; i <= 10; i++) {
        ctx.lineTo(cx + Math.sin(i * 0.9 + b * 4) * 12, cy - 64 + i * 4);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#C89050';
    rr(ctx, cx - 92, cy - 26, 184, 24, 9); ctx.fill();
    ctx.fillStyle = '#F6E2BE';
    rr(ctx, cx - 88, cy - 23, 176, 17, 7); ctx.fill();
  } else if (kind === 'shake') {
    // ふりかける
    const sw = hit < 0.3 && hit >= 0 ? Math.sin((hit / 0.3) * Math.PI) : 0;
    ctx.save();
    ctx.translate(cx, cy - 96);
    ctx.rotate(0.6 + sw * 0.5);
    ctx.fillStyle = '#E8E0D0';
    rr(ctx, -14, -26, 28, 36, 8); ctx.fill();
    ctx.fillStyle = '#B8AE9A';
    rr(ctx, -11, -34, 22, 9, 4); ctx.fill();
    ctx.restore();
    if (sw > 0.2) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(cx + (i - 4) * 10 + Math.sin(i) * 6, cy - 70 + (1 - sw) * 50, 2, 0, 7);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#C89050';
    rr(ctx, cx - 92, cy - 26, 184, 24, 9); ctx.fill();
    ctx.fillStyle = '#F6E2BE';
    rr(ctx, cx - 88, cy - 23, 176, 17, 7); ctx.fill();
  } else if (kind === 'wrap') {
    // つつむ。たたくほど 左右の かみが とじていく。
    // さいごに まん中で ぴったり 合わさると「つつめた！」が わかる。
    const k = Math.min(1, (RG.perfect + RG.good) / Math.max(1, totalNotes()));
    ctx.save();
    ctx.translate(cx, cy - 26);
    drawSandwich(ctx, ['bread', 'lettuce', 'ham', 'cheese', 'bread'], 0, 0, 160, t);
    const sw2 = 96, pw2 = 118;
    for (const sg of [-1, 1]) {
      const edge = sg * (sw2 - k * (sw2 + 6));
      const x0 = sg < 0 ? -sw2 - pw2 : edge;
      const wd = sg < 0 ? edge - (-sw2 - pw2) : (sw2 + pw2) - edge;
      ctx.fillStyle = 'rgba(255,252,246,0.96)';
      rr(ctx, x0, -92, wd, 104, 6); ctx.fill();
      ctx.strokeStyle = '#E48FAA'; ctx.lineWidth = 3; ctx.stroke();
      // かみの もよう
      ctx.strokeStyle = 'rgba(228,143,170,0.45)'; ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const lx = x0 + (wd * i) / 4;
        ctx.beginPath(); ctx.moveTo(lx, -88); ctx.lineTo(lx, 8); ctx.stroke();
      }
    }
    if (k >= 0.98) {
      ctx.fillStyle = '#E48FAA';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('つつめた！', 0, -40);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // しっぱいの あかり
  if (miss < 0.3 && miss >= 0) {
    ctx.fillStyle = 'rgba(255,90,90,' + (0.3 - miss) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
}

function drawHUD(t, b) {
  // のこりと コンボ
  ctx.fillStyle = 'rgba(70,44,26,0.55)';
  rr(ctx, VW / 2 - 74, VH - 40, 148, 30, 10); ctx.fill();
  ctx.fillStyle = '#FFF3C4';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 17px system-ui, sans-serif';
  const done = RG.perfect + RG.good + RG.miss;
  ctx.fillText(done + ' / ' + totalNotes() + '　れんぞく ' + RG.combo, VW / 2, VH - 25);

  // 出る 文字
  for (let i = 0; i < RG.pops.length; i++) {
    const p = RG.pops[i];
    const a = Math.max(0, 1 - (b - p.b) / 1.6);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    fitFont(p.text, VW * 0.5, 26, 'bold ');
    ctx.strokeStyle = 'rgba(60,30,10,0.7)'; ctx.lineWidth = 5;
    const y = 214 - (b - p.b) * 12;
    ctx.strokeText(p.text, VW * 0.79, y); ctx.fillText(p.text, VW * 0.79, y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  if (RG.assist > 0) {
    ctx.fillStyle = 'rgba(255,224,138,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('やさしく してるよ', VW / 2, VH - 6);
    ctx.textAlign = 'left';
  }

  // はじめの あんない
  if (b < RG.st.intro * 4) {
    ctx.fillStyle = 'rgba(60,36,20,0.6)';
    const pw = VW * 0.72;
    rr(ctx, VW / 2 - pw / 2, 48, pw, 38, 10); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(stageHow(RG.si2), pw * 0.94, 19, 'bold ');
    ctx.fillText(stageHow(RG.si2), VW / 2, 67);
    ctx.textAlign = 'left';
  }

  drawButton(button(10, 8, 68, 26, () => { stopStage(); RG.screen = 'select'; }),
             'やめる', 'rgba(255,255,255,0.85)');
}

// --- タイトル -----------------------------------------------------------------

function bgKitchen() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#FFE9C8'); g.addColorStop(1, '#F5B678');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bgKitchen();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#6A3A1A';
  fitFont('あおいの 美味しい', VW * 0.5, 38, 'bold ');
  ctx.fillText('あおいの 美味しい', 24, 16);
  fitFont('サンドイッチ作り', VW * 0.5, 44, 'bold ');
  ctx.fillText('サンドイッチ作り', 24, 56);
  ctx.fillStyle = '#8A5A30';
  fitFont('リズムに 合わせて ざいりょうを あつめよう！ ぜんぶで 15こ', VW * 0.56, 18);
  ctx.fillText('リズムに 合わせて ざいりょうを あつめよう！ ぜんぶで 15こ', 24, 108);
  ctx.fillStyle = '#C8501A';
  fitFont('あつめた ざいりょう ' + gotFoods().length + ' / ' + STAGES.length,
          VW * 0.4, 18, 'bold ');
  ctx.fillText('あつめた ざいりょう ' + gotFoods().length + ' / ' + STAGES.length, 24, 134);

  drawAoi(VW * 0.66, VH - 40, 1.3, 'idle', t);
  // つみあがった サンドイッチ
  const keys = stackNow();
  if (keys.length) drawSandwich(ctx, keys, VW * 0.86, VH - 40, 130, t);

  const bw = Math.min(VW * 0.32, 280);
  drawButton(button(24, 168, bw, 52, () => {
    showRule(Math.min(STAGES.length - 1, clearedCount()));
  }), 'つくる！', '#FFC24A');
  drawButton(button(24, 230, bw * 0.52 - 4, 40, () => { RG.screen = 'select'; }),
             'メニュー', '#A8E0C0');
  drawButton(button(24 + bw * 0.52 + 4, 230, bw * 0.48 - 4, 40, () => { RG.screen = 'howto'; }),
             'あそびかた', '#F0C8E8');
  drawButton(button(24, 278, bw * 0.62, 36, () => { sfxTest(); }),
             '♪ 音を ためす', 'rgba(255,255,255,0.9)', '#5A3A20', 'ここを おしてね');
  if (canEat()) {
    drawButton(button(24, 322, bw * 0.7, 40, () => { RG.screen = 'eat'; RG.biteN = 0; }),
               'サンドイッチを 食べる', '#FF9C7A');
  }
  drawButton(button(VW - 150, 12, 138, 34, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#4A3A2A');

  ctx.fillStyle = 'rgba(90,58,32,0.8)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  fitFont('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW * 0.66, 14);
  ctx.fillText('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW / 2, VH - 6);
  // 版ばんごう。ふるい ものが スマホに のこっていないか、ここで 見わけられる。
  ctx.fillStyle = 'rgba(90,58,32,0.65)';
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, VW - 12, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto() {
  ctx.fillStyle = '#3A2418'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFC24A';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 音楽に 合わせて **画面を タップ**。ボタンは 1つだけ',
    '② 音符は **右から** ながれてくる。まん中の **白い わく** に かさなった しゅんかん',
    '③ **青い ぼう** は おしっぱなし。**はなす** ところで てんすうが つく',
    '④ **点線の わ** は コックさんの お手本。たたかずに 見るだけ',
    '⑤ クリアすると **ざいりょうが 1つ** 手に入る（ぜんぶで 15こ）',
    '⑥ ざいりょうが 3つ そろったら **サンドイッチが 食べられる**',
    '⑦ 3回 だめでも つぎの ミニゲームが あくので 安心して',
    'パソコン: スペースキー か クリック',
    '',
    '音が おくれて 聞こえる スマホでは、あそんでいる うちに',
    'ゲームが じどうで タイミングを 合わせるよ。',
  ];
  ctx.fillStyle = '#FFE8CC';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 18);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 58 + i * 32);
  });
  drawButton(button(VW - 120, 12, 104, 36, () => { RG.screen = 'title'; }), 'もどる', '#FFC24A');
}

function drawSelect() {
  ctx.fillStyle = '#3A2418'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('メニュー', 20, 10);
  drawButton(button(VW - 118, 8, 102, 32, () => { RG.screen = 'title'; }), 'もどる', '#F0C8E8');
  if (canEat()) {
    drawButton(button(VW - 268, 8, 142, 32, () => { RG.screen = 'eat'; RG.biteN = 0; }),
               '食べる', '#FF9C7A');
  }

  const cols = 5, gap = 8;
  const cw = (VW - 40 - gap * (cols - 1)) / cols;
  const ch = 118;
  for (let i = 0; i < STAGES.length; i++) {
    const c = i % cols, r = (i / cols) | 0;
    const x = 20 + c * (cw + gap), y = 48 + r * (ch + gap);
    const open = stageOpen(i), rank = save.rank[STAGES[i].key];
    ctx.fillStyle = !open ? '#4A3A2E' : (rank >= 2 ? '#B06A20' : '#5A4030');
    rr(ctx, x, y, cw, ch, 10); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = open ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(String(i + 1), x + cw / 2, y + 5);
    if (open) {
      drawFoodChip(ctx, STAGES[i].food, x + cw / 2, y + 48, 22);
      ctx.fillStyle = '#FFE8CC';
      fitFont(STAGES[i].name, cw * 0.94, 12);
      ctx.fillText(STAGES[i].name, x + cw / 2, y + 76);
      ctx.fillStyle = save.got[STAGES[i].food] ? '#FFE066' : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(save.got[STAGES[i].food]
        ? (rank >= 2 ? 'かんぺき！' : 'ゲット！') : 'まだ', x + cw / 2, y + 96);
      button(x, y, cw, ch, () => { showRule(i); });
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('？', x + cw / 2, y + 52);
    }
  }
  ctx.textAlign = 'left';
}

function drawRule(t) {
  const st = STAGES[RG.pending];
  bgKitchen();
  ctx.fillStyle = 'rgba(40,24,12,0.45)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fitFont((RG.pending + 1) + ' ばんめ', VW * 0.3, 18, 'bold ');
  ctx.fillText((RG.pending + 1) + ' ばんめ', VW / 2, 14);
  ctx.fillStyle = '#FFFFFF';
  fitFont(st.name, VW * 0.7, 40, 'bold ');
  ctx.fillText(st.name, VW / 2, 36);

  drawFoodChip(ctx, st.food, VW / 2, 136, 40);
  ctx.fillStyle = '#FFE066';
  ctx.textBaseline = 'middle';
  fitFont('クリアすると ' + FOODS[st.food].name + ' が もらえる！', VW * 0.6, 20, 'bold ');
  ctx.fillText('クリアすると ' + FOODS[st.food].name + ' が もらえる！', VW / 2, 196);

  const pw = VW * 0.82, ph = 56;
  ctx.fillStyle = 'rgba(30,18,10,0.62)';
  rr(ctx, VW / 2 - pw / 2, 216, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = '#FFC24A'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF3C4';
  fitFont(stageHow(RG.pending), pw * 0.92, 20, 'bold ');
  ctx.fillText(stageHow(RG.pending), VW / 2, 244);

  ctx.textAlign = 'left';
  const bw = Math.min(VW * 0.3, 240);
  drawButton(button(VW / 2 - bw / 2, VH - 100, bw, 50, () => { startStage(RG.pending); }),
             'つくる！', '#FFC24A');
  drawButton(button(18, 14, 96, 36, () => { RG.screen = 'select'; }), 'もどる', '#F0C8E8');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('画面を さわっても はじまるよ', VW * 0.5, 15);
  ctx.fillText('画面を さわっても はじまるよ', VW / 2, VH - 40);
  ctx.textAlign = 'left';
}

function drawResult(t) {
  bgKitchen();
  ctx.fillStyle = RG.rank >= 1 ? 'rgba(40,24,12,0.82)' : 'rgba(60,20,16,0.85)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const title = RG.rank >= 2 ? 'かんぺき！' : RG.rank >= 1 ? 'できあがり！' : 'もう一度！';
  ctx.fillStyle = RG.rank >= 1 ? '#FFE066' : '#FFB0A8';
  fitFont(title, VW * 0.6, 44, 'bold ');
  ctx.fillText(title, VW / 2, 22);

  ctx.fillStyle = '#FFFFFF';
  fitFont(RG.st.name, VW * 0.5, 20);
  ctx.fillText(RG.st.name, VW / 2, 76);

  // てんすう
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE8CC';
  ctx.font = 'bold 16px system-ui, sans-serif';
  const rows = [['ぴったり', RG.perfect, '#FFE066'], ['おしい', RG.good, '#A8E0FF'],
                ['ミス', RG.miss, '#FF9C9C'], ['さいこう れんぞく', RG.maxCombo, '#FFFFFF']];
  rows.forEach((r, i) => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#FFE8CC';
    ctx.fillText(r[0], VW / 2 - 12, 116 + i * 26);
    ctx.textAlign = 'left'; ctx.fillStyle = r[2];
    ctx.fillText(String(r[1]), VW / 2 + 12, 116 + i * 26);
  });

  ctx.textAlign = 'center';
  if (RG.newFood) {
    drawFoodChip(ctx, RG.newFood, VW / 2 + 190, 150, 38);
    ctx.fillStyle = '#FFE066';
    fitFont(FOODS[RG.newFood].name + ' ゲット！', 220, 20, 'bold ');
    ctx.fillText(FOODS[RG.newFood].name + ' ゲット！', VW / 2 + 190, 200);
  } else if (RG.justOpened) {
    ctx.fillStyle = '#A8F0B0';
    fitFont('つぎの ミニゲームが あいたよ', VW * 0.6, 17);
    ctx.fillText('つぎの ミニゲームが あいたよ', VW / 2, 232);
  }
  ctx.textAlign = 'left';

  // いま までの サンドイッチ。どれだけ つみあがったかが 見えると つづけたく なる。
  const keys = stackNow();
  if (keys.length) {
    ctx.save();
    ctx.translate(VW * 0.22, VH - 96);
    const need = sandHeight(keys), room = 150;
    if (need > room) ctx.scale(1, room / need);
    drawSandwich(ctx, keys, 0, 0, 108, t);
    ctx.restore();
    ctx.fillStyle = '#FFE8CC';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('いま ' + gotFoods().length + ' / ' + STAGES.length, VW * 0.22, VH - 92);
    ctx.textAlign = 'left';
  }

  const bw = Math.min(VW * 0.24, 190), by = VH - 70;
  drawButton(button(VW / 2 - bw * 1.6, by, bw, 44, () => { startStage(RG.si2); }),
             'もう一度', '#FFC24A');
  drawButton(button(VW / 2 - bw * 0.5, by, bw, 44, () => { RG.screen = 'select'; }),
             'メニュー', '#F0C8E8');
  const nxt = RG.si2 + 1;
  if (nxt < STAGES.length && stageOpen(nxt)) {
    drawButton(button(VW / 2 + bw * 0.6, by, bw, 44, () => { showRule(nxt); }),
               'つぎへ →', '#A8E0C0');
  } else if (canEat()) {
    drawButton(button(VW / 2 + bw * 0.6, by, bw, 44,
                      () => { RG.screen = 'eat'; RG.biteN = 0; }), '食べる！', '#FF9C7A');
  }
}

// --- 食べる 画面 ---------------------------------------------------------------
//
// あつめた ざいりょうで サンドイッチを つみあげて、タップで かじる。
// ここが ごほうび なので、いつでも 見に これる ように している。

const BITE_WORD = ['サクッ！', 'モグモグ', 'おいしい〜！', 'しあわせ…', 'ごちそうさま！'];

function drawEat(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#FFF4DC'); g.addColorStop(1, '#FFD0A0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // テーブル
  ctx.fillStyle = '#C89A62'; ctx.fillRect(0, VH - 80, VW, 80);
  ctx.fillStyle = '#E0B888'; ctx.fillRect(0, VH - 80, VW, 8);
  // おさら
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(VW / 2, VH - 74, 150, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#F0E4D0';
  ctx.beginPath(); ctx.ellipse(VW / 2, VH - 78, 128, 16, 0, 0, 7); ctx.fill();

  const keys = stackNow();
  const bites = Math.min(BITE_WORD.length, RG.biteN);
  // かじった ぶん だけ 小さく なる
  const w = 190 - bites * 26;
  ctx.save();
  if (w > 40) {
    // 15こ ぜんぶ そろうと たかく なるので、はみ出す ときだけ たてに ちぢめる
    const need = sandHeight(keys);
    const room = VH - 84 - 158;
    const sc = need > room ? room / need : 1;
    ctx.translate(0, VH - 84);
    ctx.scale(1, sc);
    ctx.translate(0, -(VH - 84));
    const top = drawSandwich(ctx, keys, VW / 2, VH - 84, w, t);
    // かじった あと
    if (bites > 0) {
      ctx.fillStyle = 'rgba(255,244,220,1)';
      for (let i = 0; i < bites; i++) {
        ctx.beginPath();
        ctx.arc(VW / 2 + w / 2 - 4, top + 24 + i * 26, 22, 0, 7); ctx.fill();
      }
    }
  }
  ctx.restore();
  ctx.setTransform(ctx.getTransform());

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#6A3A1A';
  if (bites >= BITE_WORD.length) {
    fitFont('ごちそうさまでした！', VW * 0.56, 36, 'bold ');
    ctx.fillText('ごちそうさまでした！', VW / 2, 20);
    ctx.fillStyle = '#8A5A30';
    fitFont('あつめた ざいりょう ' + gotFoods().length + ' / ' + STAGES.length +
            '　のこりも あつめて もっと 大きく しよう', VW * 0.86, 19);
    ctx.fillText('あつめた ざいりょう ' + gotFoods().length + ' / ' + STAGES.length +
                 '　のこりも あつめて もっと 大きく しよう', VW / 2, 74);
  } else {
    fitFont('タップして かじろう！', VW * 0.5, 34, 'bold ');
    ctx.fillText('タップして かじろう！', VW / 2, 20);
    ctx.fillStyle = '#C8501A';
    fitFont(bites > 0 ? BITE_WORD[bites - 1] : FOODS[keys[1] || 'bread'].name + ' が おいしそう',
            VW * 0.6, 26, 'bold ');
    ctx.fillText(bites > 0 ? BITE_WORD[bites - 1]
                 : 'ざいりょう ' + gotFoods().length + 'この スペシャルサンド', VW / 2, 72);
  }
  ctx.textAlign = 'left';

  // 入っている ざいりょう。1れつに ならべる。
  // 2れつに すると 下の れつが サンドイッチに かぶって しまう。
  const list = gotFoods();
  if (list.length) {
    const gap = Math.min(38, (VW - 70) / list.length);
    const r = Math.min(17, gap * 0.46);
    const x0 = VW / 2 - (gap * (list.length - 1)) / 2;
    for (let i = 0; i < list.length; i++) drawFoodChip(ctx, list[i], x0 + i * gap, 126, r);
  }

  drawButton(button(VW - 130, 12, 114, 36, () => { RG.screen = 'title'; }), 'もどる', '#FFC24A');
  if (bites >= BITE_WORD.length) {
    drawButton(button(VW / 2 - 90, VH - 46, 180, 38,
                      () => { RG.biteN = 0; }), 'もう一度 つくる', '#A8E0C0');
  }
}

function eatTap() {
  if (RG.biteN >= BITE_WORD.length) return;
  RG.biteN++;
  sfxBite(RG.biteN);
  if (RG.biteN >= BITE_WORD.length) {
    save.ate++;
    storeSave();
    sfxDone();
  }
}

// --- そうさ -------------------------------------------------------------------

function screenTap() {
  if (RG.screen === 'rule') { startStage(RG.pending); return; }
  if (RG.screen === 'eat') { eatTap(); return; }
}

function onDown(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b) { b.on(); return; }
  if (RG.screen === 'play') { rTap(); return; }
  screenTap();
}
function onUp() {
  if (RG.screen === 'play') rRelease();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t0 = e.changedTouches[0];
  onDown(t0.clientX - r.left, t0.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
canvas.addEventListener('touchcancel', () => onUp());
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  onDown(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => onUp());
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    audioStart();
    if (RG.screen === 'play') rTap(); else screenTap();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') onUp();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && RG.screen === 'play') { stopStage(); RG.screen = 'select'; }
});

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#3A2418'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFC24A';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

// --- ループ -------------------------------------------------------------------

let tsec = 0, last = 0;
function frame(now) {
  portraitTip();
  requestAnimationFrame(frame);
  const dt = Math.min(0.045, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (RG.screen === 'play') {
    updatePlay();
    if (RG.screen === 'play') drawPlay(tsec); else drawResult(tsec);
  } else if (RG.screen === 'result') drawResult(tsec);
  else if (RG.screen === 'select') drawSelect();
  else if (RG.screen === 'howto') drawHowto();
  else if (RG.screen === 'rule') drawRule(tsec);
  else if (RG.screen === 'eat') drawEat(tsec);
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
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


