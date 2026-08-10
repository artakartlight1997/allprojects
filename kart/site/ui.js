// 画面・操作・メインループ。
//
// ★ 道は「後ろから見た立体」で描く（アウトラン方式）。
//   遠くのセグメントほど小さく、近いほど大きく。近い順に上から重ねると
//   坂もカーブもそれらしく見える。道が向こうから流れてくるので
//   速さがそのまま画面に出る＝スピード感。
//
// ★ 操作は 左半分＝ハンドル（ゆびを置いたところが中心）、右下＝アクセル、その左＝ブレーキ。
//   小さい子でも迷わない。パソコンはやじるしキー。

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
  return null;
}

// --- 立体の道 -----------------------------------------------------------------------

const CAM_H = 1500;                                  // カメラの高さ
// カーブの 見ため の 強さ。大きいほど 道が はっきり まがって 見える。
// 大きく しすぎると 道が 画面の そとへ 出て しまう ので 2 くらいが ちょうどよい。
const CURVE_VIS = 2.0;
const FOV = 100;                                     // 視野
const CAM_D = 1 / Math.tan((FOV / 2) * Math.PI / 180);

function lerp(a, b, p) { return a + (b - a) * p; }

// 1つの点を画面の場所になおす。dz が 0 いかだと カメラの うしろ。
function project(p, camX, camY, camZ) {
  const dz = p.z - camZ;
  const sc = CAM_D / dz;
  return {
    x: VW / 2 + sc * (p.x - camX) * VW / 2,
    y: VH / 2 - sc * (p.y - camY) * VH / 2,
    w: sc * ROAD_W * VW / 2,
    dz, sc,
  };
}

// 台形をぬる
function quad(x1, y1, w1, x2, y2, w2, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

// コース脇のかざり
function drawDeco(x, y, w, k, th) {
  const s = w;
  if (k === 3) {
    // かんばん
    ctx.fillStyle = '#8A6440';
    ctx.fillRect(x - s * 0.05, y - s * 1.1, s * 0.1, s * 1.1);
    ctx.fillStyle = '#FFE066';
    rr(ctx, x - s * 0.55, y - s * 1.9, s * 1.1, s * 0.85, s * 0.1); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,30,0.5)'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
    ctx.fillStyle = '#E0533A';
    ctx.beginPath(); ctx.arc(x, y - s * 1.48, s * 0.26, 0, 7); ctx.fill();
    return;
  }
  if (k === 0) {
    // 木
    ctx.fillStyle = '#8A6440';
    ctx.fillRect(x - s * 0.08, y - s * 1.1, s * 0.16, s * 1.1);
    ctx.fillStyle = th.deco;
    ctx.beginPath(); ctx.arc(x, y - s * 1.5, s * 0.62, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 1.15, s * 0.42, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.4, y - s * 1.15, s * 0.42, 0, 7); ctx.fill();
    return;
  }
  if (k === 1) {
    // 岩
    ctx.fillStyle = th.deco;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y);
    ctx.lineTo(x - s * 0.3, y - s * 0.7);
    ctx.lineTo(x + s * 0.2, y - s * 0.8);
    ctx.lineTo(x + s * 0.6, y);
    ctx.closePath(); ctx.fill();
    return;
  }
  // 旗
  ctx.fillStyle = '#DDDDDD';
  ctx.fillRect(x - s * 0.04, y - s * 1.5, s * 0.08, s * 1.5);
  ctx.fillStyle = '#FF6B7A';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.04, y - s * 1.5);
  ctx.lineTo(x + s * 0.7, y - s * 1.3);
  ctx.lineTo(x + s * 0.04, y - s * 1.05);
  ctx.closePath(); ctx.fill();
}

// カート（後ろすがた）
function drawKart(x, y, w, f, mine, t) {
  const s = w;
  if (s < 3) return;
  ctx.save();
  ctx.translate(x, y);
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.24, 0, 0, 7); ctx.fill();
  // タイヤ
  ctx.fillStyle = '#2A2430';
  rr(ctx, -s * 0.95, -s * 0.62, s * 0.42, s * 0.62, s * 0.1); ctx.fill();
  rr(ctx, s * 0.53, -s * 0.62, s * 0.42, s * 0.62, s * 0.1); ctx.fill();
  // 車体
  ctx.fillStyle = f.drv.col;
  rr(ctx, -s * 0.72, -s * 0.92, s * 1.44, s * 0.78, s * 0.16); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,30,0.5)'; ctx.lineWidth = Math.max(1, s * 0.06); ctx.stroke();
  // うしろの あかり
  ctx.fillStyle = '#FF6B7A';
  ctx.beginPath(); ctx.arc(-s * 0.46, -s * 0.42, s * 0.11, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.46, -s * 0.42, s * 0.11, 0, 7); ctx.fill();
  // ドライバー
  ctx.fillStyle = '#F5CFAE';
  ctx.beginPath(); ctx.arc(0, -s * 1.16, s * 0.34, 0, 7); ctx.fill();
  ctx.fillStyle = '#3A3040';
  ctx.beginPath(); ctx.arc(0, -s * 1.22, s * 0.34, Math.PI, 0); ctx.fill();
  ctx.fillStyle = f.drv.col;
  rr(ctx, -s * 0.40, -s * 1.60, s * 0.80, s * 0.30, s * 0.12); ctx.fill();
  // ドリフトの火花
  if (f.driftT > 0.4) {
    const hot = f.driftT > 1.4;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = hot ? 'rgba(255,120,80,' + (0.4 + Math.random() * 0.5) + ')'
                          : 'rgba(255,224,102,' + (0.35 + Math.random() * 0.5) + ')';
      const sx = (i % 2 ? 1 : -1) * s * (0.75 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.arc(sx, -s * 0.1 + (Math.random() - 0.5) * s * 0.4, s * (0.06 + Math.random() * 0.1), 0, 7);
      ctx.fill();
    }
  }
  // ダッシュの火
  if (f.boostT > 0) {
    ctx.fillStyle = 'rgba(255,180,90,' + (0.5 + Math.random() * 0.4) + ')';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.2);
    ctx.lineTo(0, s * (0.5 + Math.random() * 0.5));
    ctx.lineTo(s * 0.3, -s * 0.2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// --- レース画面 ----------------------------------------------------------------------

function drawPlay(t) {
  const th = THEMES[G.C.theme] || THEMES.day;
  const me = G.karts[G.me];
  const n = G.segs.length;

  // 空
  const g = ctx.createLinearGradient(0, 0, 0, VH * 0.6);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  const sh = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 10 : 0;
  ctx.translate(sh, sh * 0.5);

  const mePos = wrapPos(me.pos);
  const baseI = segIndexOf(me.pos);
  const basePct = (mePos - baseI * SEG_LEN) / SEG_LEN;
  const baseSeg = G.segs[baseI];
  const camY = lerp(baseSeg.y1, baseSeg.y2, basePct) + CAM_H;
  const camX = me.px * ROAD_W;
  const camZ = mePos;

  let x = 0, dx = -(baseSeg.curve * basePct);
  let maxy = VH;
  const drawn = [];

  for (let i = 0; i < DRAW_N; i++) {
    const idx = (baseI + i) % n;
    const seg = G.segs[idx];
    // ★ z は「コースの はじめから 何メートル目か」。1しゅう こえても
    //   そのまま のばす（カメラより 先に あるので dz は プラス）。
    const z1 = (baseI + i) * SEG_LEN;
    // ★ ここが ずっと こわれて いた。
    //   x は「カーブを 1こま ずつ たしこんだ 数」で、そのまま 道の 中しんの
    //   ばしょ（ワールド座標）に なる。なのに ROAD_W（2200）を かけて いた ため、
    //   カーブに 入った とたん 道が 画面の 2万ピクセル 右へ すっとんで 消えて いた。
    //   「カーブが 曲がれない」の 正体は これ。道が 見えなければ 曲がれない。
    const p1 = project({ x: x * CURVE_VIS, y: seg.y1, z: z1 }, camX, camY, camZ);
    const p2 = project({ x: (x + dx) * CURVE_VIS, y: seg.y2, z: z1 + SEG_LEN }, camX, camY, camZ);
    x += dx; dx += seg.curve;

    if (p1.dz <= 40 || p2.y >= maxy || p2.y >= VH + 40) continue;
    maxy = p2.y;
    drawn.push({ seg, p1, p2, idx, i });

    const dark = ((idx / RUMBLE_N) | 0) % 2;
    // 草。画面いっぱいの 台形は ただの 四角なので fillRect が 速い。
    ctx.fillStyle = th.grass[dark];
    ctx.fillRect(0, p2.y, VW, p1.y - p2.y + 1);
    // ふちの しま
    quad(p1.x, p1.y, p1.w * 1.22, p2.x, p2.y, p2.w * 1.22, th.rumble[dark]);
    // 道
    quad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, th.road[dark]);
    // まん中の 線
    if (!dark && p1.w > 12) {
      quad(p1.x, p1.y, p1.w * 0.035, p2.x, p2.y, p2.w * 0.035, th.lane);
      quad(p1.x - p1.w * 0.5, p1.y, p1.w * 0.02, p2.x - p2.w * 0.5, p2.y, p2.w * 0.02, th.lane);
      quad(p1.x + p1.w * 0.5, p1.y, p1.w * 0.02, p2.x + p2.w * 0.5, p2.y, p2.w * 0.02, th.lane);
    }
    // ダッシュパネル
    if (seg.pad) {
      const px = p1.x + p1.w * seg.pad * 0.5;
      const px2 = p2.x + p2.w * seg.pad * 0.5;
      quad(px, p1.y, p1.w * 0.26, px2, p2.y, p2.w * 0.26,
           ((t * 6 + idx) | 0) % 2 ? '#FFE066' : '#FF8F3A');
    }
    // スタート・ゴール
    if (idx < 3) {
      quad(p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, ((idx + ((t * 3) | 0)) % 2) ? '#F0F0F0' : '#33303A');
    }
  }

  // 遠くをかすませる（セグメントごとにぬると重いので、
  // 地平線から下へ 1回のグラデーションで すませる）
  if (drawn.length) {
    const top = drawn[drawn.length - 1].p2.y;
    const bot = Math.min(VH, top + VH * 0.30);
    const fg = ctx.createLinearGradient(0, top - 6, 0, bot);
    fg.addColorStop(0, th.fog);
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = fg;
    ctx.fillRect(0, top - 6, VW, bot - top + 6);
    ctx.globalAlpha = 1;
  }

  // かざりとカートは 遠い順（配列のうしろ）から
  for (let k = drawn.length - 1; k >= 0; k--) {
    const d = drawn[k];
    for (const sp of d.seg.sprites) {
      const sx = d.p1.x + d.p1.w * sp.x;
      drawDeco(sx, d.p1.y, d.p1.w * 0.30, sp.k, th);
    }
    // このセグメントにいるカート
    for (const f of G.karts) {
      if (f === me) continue;
      const fi = segIndexOf(f.pos);
      if (fi !== d.idx) continue;
      const pct = (wrapPos(f.pos) - fi * SEG_LEN) / SEG_LEN;
      const px = lerp(d.p1.x, d.p2.x, pct) + lerp(d.p1.w, d.p2.w, pct) * f.px;
      const py = lerp(d.p1.y, d.p2.y, pct);
      // 相手のカートは 手まえの 自分より 大きく ならない ように 止める
      const kw2 = Math.min(VW * 0.105, lerp(d.p1.w, d.p2.w, pct) * 0.26);
      drawKart(px, py, kw2, f, false, t);
    }
  }

  // 自分のカートは いつも 手まえ
  {
    // ★ 自分のカートは いちばん 手まえ なので いちばん 大きい。
    //   小さいと 前を走る 相手より 小さく 見えて おかしい。
    const kw = VW * 0.125;
    const kx = VW / 2 + me.steer * kw * 0.34 + Math.sin(t * 9) * (me.driftT > 0 ? 3 : 0.6);
    const ky = VH * 0.90;
    drawKart(kx, ky, kw, me, true, t);
  }

  // 速いときの 線。★ 空の上まで 引くと ただの ゴミに 見えるので、
  //   道のあたり（画面の 下半分）だけに 出す。
  const sp = me.spd / MAXS;
  if (sp > 0.6 || me.boostT > 0) {
    const nline = me.boostT > 0 ? 16 : 8;
    ctx.strokeStyle = me.boostT > 0 ? 'rgba(255,224,102,0.55)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = me.boostT > 0 ? 3 : 2;
    const cy = VH * 0.62;
    for (let i = 0; i < nline; i++) {
      const a = (i / nline) * Math.PI * 2 + t * 3;
      if (Math.sin(a) < -0.15) continue;         // 上むきは 出さない
      const r0 = VW * 0.20 + ((i * 37 + t * 700) % 160);
      const r1 = r0 + 30 + sp * 70;
      ctx.beginPath();
      ctx.moveTo(VW / 2 + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.55);
      ctx.lineTo(VW / 2 + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.55);
      ctx.stroke();
    }
  }

  ctx.restore();

  drawHud(t);

  if (!G.started) {
    const left = Math.ceil(G.count - 0.2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,8,24,0.35)'; ctx.fillRect(0, 0, VW, VH);
    if (left > 0) {
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 92px system-ui, sans-serif';
      ctx.fillText(String(left), VW / 2, VH * 0.42);
      ctx.fillStyle = '#FFFFFF';
      fitFont(G.C.name, VW * 0.7, 24, 'bold ');
      ctx.fillText(G.C.name, VW / 2, VH * 0.64);
    } else {
      ctx.fillStyle = '#A8F0B0';
      ctx.font = 'bold 76px system-ui, sans-serif';
      ctx.fillText('スタート！', VW / 2, VH * 0.42);
    }
    ctx.textAlign = 'left';
  }

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,8,24,0.8)';
    rr(ctx, VW / 2 - 130, VH * 0.24, 260, 34, 10); ctx.fill();
    ctx.fillStyle = '#FFE066';
    fitFont(G.msg, 240, 20, 'bold ');
    ctx.fillText(G.msg, VW / 2, VH * 0.24 + 17);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,8,24,0.45)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText(G.place + '位！', VW / 2, VH * 0.44);
    ctx.textAlign = 'left';
  }
}

function drawHud(t) {
  const me = G.karts[G.me];
  // 上の おび
  ctx.fillStyle = 'rgba(10,8,24,0.55)';
  rr(ctx, 8, 6, VW - 16, 34, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(G.place + '位', 20, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('／ ' + G.karts.length + '台', 62, 25);

  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('LAP ' + Math.min(G.C.laps, me.lap + 1) + '/' + G.C.laps, VW * 0.30, 23);

  // 速さのバー
  const bw = Math.max(90, VW * 0.20);
  const bx = VW * 0.52;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, bx, 15, bw, 14, 7); ctx.fill();
  const sp = Math.min(1, me.spd / (MAXS * BOOST));
  ctx.fillStyle = me.boostT > 0 ? '#FFE066' : (sp > 0.8 ? '#A8F0B0' : '#8FD6FF');
  rr(ctx, bx, 15, Math.max(4, bw * sp), 14, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(Math.round(me.spd / 45) + ' km/h', bx + bw + 8, 23);

  ctx.textAlign = 'left';
  drawButton(button(VW - 94, 8, 84, 26, () => { bgmStop(); engStop(); G.screen = 'title'; }),
             'コースをえらぶ', 'rgba(255,255,255,0.85)');

  // --- ハンドル（左がわ・ゆびの ところに 出る） ---
  const sr = steerRadius();
  const shx = steerPtr.id !== null ? steerPtr.cx : VW * 0.17;
  const shy = VH - sr * 0.72 - 16;
  ctx.save();
  ctx.globalAlpha = steerPtr.id !== null ? 1 : 0.42;
  ctx.fillStyle = 'rgba(10,10,20,0.28)';
  rr(ctx, shx - sr, shy - sr * 0.34, sr * 2, sr * 0.68, sr * 0.34); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  for (const dir of [-1, 1]) {
    ctx.fillStyle = (G.steer * dir > 0.12) ? '#FFE066' : 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    const ax = shx + dir * sr * 0.78;
    ctx.moveTo(ax + dir * sr * 0.14, shy);
    ctx.lineTo(ax - dir * sr * 0.08, shy - sr * 0.20);
    ctx.lineTo(ax - dir * sr * 0.08, shy + sr * 0.20);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = steerPtr.id !== null ? '#FFE066' : 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(shx + G.steer * sr, shy, sr * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // --- アクセル と ブレーキ（右がわ） ---
  const gb = gasBox(), bb = brkBox();
  const pedal = (b2, on, label, col) => {
    ctx.beginPath(); ctx.arc(b2.x, b2.y, b2.r, 0, Math.PI * 2);
    ctx.fillStyle = on ? col : 'rgba(255,255,255,0.16)'; ctx.fill();
    ctx.lineWidth = Math.max(2, b2.r * 0.08);
    ctx.strokeStyle = col; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = Math.round(b2.r * 0.5);
    for (let i = 0; i < 12; i++) {
      ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
      if (ctx.measureText(label).width <= b2.r * 1.5 || fs <= 8) break;
      fs = Math.max(8, Math.floor(fs * 0.9));
    }
    ctx.fillStyle = on ? '#20182E' : col;
    ctx.fillText(label, b2.x, b2.y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  };
  pedal(bb, G.throttle < 0, 'ブレーキ', '#FF7A8A');
  pedal(gb, G.throttle > 0, 'アクセル', '#7ADC80');

  // ★ まだ 一度も アクセルを おして いない 子には、どこを おすかを 見せる。
  //   じゃまに ならない ように、うすい わく と ことばだけ。
  if (!gasSeen && G.started && !G.over) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.strokeStyle = '#7ADC80';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(gb.x, gb.y, gb.r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#7ADC80';
    ctx.fillText('右がわを おしっぱなしで すすむ', VW * 0.72, gb.y - gb.r - 16);
    ctx.textAlign = 'left';
  }

  // ★ この先の カーブを 先に しらせる。
  //   きつい カーブは「ブレーキ！」。これが ないと 気づいた ときには 手おくれ。
  if (G.started && !G.over) {
    const ca = curveAhead();
    const am = Math.abs(ca);
    if (am >= 2) {
      const dir = ca > 0 ? 1 : -1;              // ＋は 右まわり
      const hard = am >= 4;
      const slip = G.slip > 0.10;               // いま タイヤが はっきり すべって いる
      const cx = VW / 2, cy = VH * 0.20;
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * (hard ? 10 : 5));
      ctx.fillStyle = slip ? '#FF7A8A' : (hard ? '#FFC46A' : '#FFE066');
      for (let k = 0; k < (hard ? 3 : 2); k++) {
        const ax = cx + dir * (26 + k * 26);
        ctx.beginPath();
        ctx.moveTo(ax + dir * 18, cy);
        ctx.lineTo(ax - dir * 6, cy - 15);
        ctx.lineTo(ax - dir * 6, cy + 15);
        ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = slip ? '#FF7A8A' : (hard ? '#FFC46A' : '#FFE066');
      ctx.fillText(slip ? 'はやすぎ！ スピード おとして' : (hard ? 'きついカーブ' : 'カーブ'),
                   cx, cy - 34);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  }

  // ★ 草に出たら「もどって！」と やじるしを 出す
  if (Math.abs(me.px) > 1.02 && !G.over && G.started) {
    const dir = me.px > 0 ? -1 : 1;      // もどる むき
    const cx = VW / 2, cy = VH * 0.33;   // カートに かぶらない 高さ
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 9);
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.moveTo(cx + dir * 54, cy);
    ctx.lineTo(cx + dir * 16, cy - 30);
    ctx.lineTo(cx + dir * 16, cy - 12);
    ctx.lineTo(cx - dir * 30, cy - 12);
    ctx.lineTo(cx - dir * 30, cy + 12);
    ctx.lineTo(cx + dir * 16, cy + 12);
    ctx.lineTo(cx + dir * 16, cy + 30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(20,14,30,0.8)'; ctx.lineWidth = 5;
    fitFont('道にもどって！', VW * 0.5, 24, 'bold ');
    ctx.strokeText('道にもどって！', cx, cy - 50);
    ctx.fillText('道にもどって！', cx, cy - 50);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ドリフトのたまり
  if (me.driftT > 0.2) {
    const p = Math.min(1, me.driftT / 1.6);
    ctx.fillStyle = 'rgba(10,8,24,0.5)';
    rr(ctx, VW / 2 - 60, VH - 34, 120, 14, 7); ctx.fill();
    ctx.fillStyle = me.driftT > 1.4 ? '#FF8F3A' : '#FFE066';
    rr(ctx, VW / 2 - 58, VH - 32, 116 * p, 10, 5); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('はなすとダッシュ', VW / 2, VH - 42);
    ctx.textAlign = 'left';
  }
}

// --- タイトル ------------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E2A4A'); g.addColorStop(1, '#3A4A6A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const TITLE = 'まさきのカートレース';
  const fs = fitFont(TITLE, VW * 0.42, 34, 'bold ');
  ctx.fillText(TITLE, 24, 12);
  ctx.fillStyle = '#8FD6FF';
  const sub = '左でハンドル、右下でアクセル、その左がブレーキ';
  fitFont(sub, VW * 0.42, 14);
  ctx.fillText(sub, 26, 16 + fs + 4);

  // コース（5×2）
  const cw = Math.min(92, (VW * 0.56 - 24) / 5), chh = 58;
  for (let i = 0; i < COURSES.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 106 + Math.floor(i / 5) * (chh + 10);
    const op = opened(i), cl = !!save.clear[i];
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    ctx.textAlign = 'center';
    if (op) {
      ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'top';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(COURSES[i].laps + '周', cxp + (cw - 8) / 2, cyp + 23);
      ctx.fillStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(save.best['s' + i] ? save.best['s' + i] + '秒' : (cl ? 'クリア' : '—'),
                   cxp + (cw - 8) / 2, cyp + 39);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textBaseline = 'top';
    }
    ctx.textAlign = 'left';
  }

  // ドライバーえらび
  const dy = 106 + 2 * (chh + 10) + 6;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('のる人', 24, dy);
  for (let i = 0; i < DRIVERS.length; i++) {
    const bx = 24 + i * 64, by = dy + 16;
    const on = (save.who | 0) === i;
    button(bx, by, 58, 34, () => { save.who = i; storeSave(); });
    ctx.fillStyle = on ? DRIVERS[i].col : 'rgba(255,255,255,0.13)';
    rr(ctx, bx, by, 58, 34, 8); ctx.fill();
    ctx.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#2A2440' : 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(DRIVERS[i].name, 50, 14, 'bold ');
    ctx.fillText(DRIVERS[i].name, bx + 29, by + 17);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // つよさ
  const ex = VW - 200;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('あいての つよさ', ex, dy);
  for (let i = 0; i < DIFFS.length; i++) {
    const bx = ex + i * 62, by = dy + 16;
    const on = (save.diff | 0) === i;
    button(bx, by, 56, 34, () => { save.diff = i; storeSave(); });
    ctx.fillStyle = on ? DIFFS[i].col : 'rgba(255,255,255,0.13)';
    rr(ctx, bx, by, 56, 34, 8); ctx.fill();
    ctx.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#2A2440' : 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(DIFFS[i].name, 48, 13, 'bold ');
    ctx.fillText(DIFFS[i].name, bx + 28, by + 17);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  drawButton(button(VW - 150, 10, 138, 28, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(VW - 224, VH - 40, 96, 30, () => { G.screen = 'howto'; }), '遊びかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 40, 96, 30, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 6);
}

function drawHowto() {
  ctx.fillStyle = '#1E2A4A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#8FD6FF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('遊びかた', 24, 12);
  const lines = [
    '① 左半分を さわると ハンドルが 出る。すこし すべらせるだけで いっぱいに 切れる',
    '② 右がわは どこを おしても アクセル。おしっぱなしで すすむ',
    '　 その 左どなりの まるが ブレーキ。ゆびを すべらせて 行き来できる',
    '　 パソコンは ← → ハンドル、↑ アクセル、↓ ブレーキ',
    '　 ハンドルは「道の どこを 走るか」。切ったままでも 草には 出ない',
    '③ 同じ向きに曲がりつづけると 火花がたまる。はなすと **ダッシュ**',
    '④ 道の上のオレンジのパネルを ふむと ダッシュ',
    '⑤ きついカーブを 速すぎる 速さで 通ると タイヤが すべって おそくなる。',
    '　 「はやすぎ！」と 出たら アクセルを はなすか ブレーキ',
    '',
    '3位までに入れば クリア。3回まけると 自分だけ少し速くなるよ。',
  ];
  ctx.fillStyle = '#E8F0FA';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 60 + i * 28);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult() {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.place + '位', VW * 0.5, 46, 'bold ');
  ctx.fillText(G.place + '位', VW / 2, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.C.name, VW / 2, 84);
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText((G.total || 0) + ' 秒', VW / 2, 112);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('ベスト ' + (save.best['s' + G.stage] || '—') + ' 秒', VW / 2, 152);
  const laps = (G.lapTimes || []).map((v, i) => (i + 1) + 'しゅう ' + v + '秒').join('　');
  fitFont(laps, VW * 0.9, 14, 'bold ');
  ctx.fillText(laps, VW / 2, 176);
  if (!G.win) {
    ctx.fillStyle = '#A8F0B0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    const lv = assistLevel(G.stage);
    ctx.fillText(lv > 0 ? '自分のカートを' + lv + '段階 速くしてあるよ'
                        : 'あと' + (3 - ((save.fails['s' + G.stage] || 0) % 3)) + '回まけると 速くなるよ',
                 VW / 2, 204);
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(160, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 52, bw, 38, () => startStage(G.stage)), 'もう一度', '#E8D0F8');
  if (nxt < COURSES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 52, bw, 38, () => startStage(nxt)), '次のコース', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 52, bw, 38, () => { G.screen = 'title'; }),
             'コースをえらぶ', 'rgba(255,255,255,0.85)');
}

// --- 操作 ---------------------------------------------------------------------------

// ★ 左半分 … ハンドル（ゆびを置いたところが中心。左右にすべらせると
//   切れぐあいが かわる）。右半分 … 下が アクセル、上が ブレーキ。
//   まえは「左半分＝左に いっぱい／右半分＝右に いっぱい」で、
//   まえは アクセルを おさなくても ほぼ ぜんかいで 走って いた ため
//   「かってに アクセル ぜんかい」に なって いた。いまは はなすと おそくなる。

// ★ まえは 92px ゆびを すべらせないと いっぱいに 切れず、
//   親ゆびが とどかなくて「曲がれない」に なって いた。半分に する。
const STEER_R = 46;                 // ハンドルを いっぱいに 切る までの きょり(CSS px)
const steerPtr = { id: null, cx: 0, val: 0 };
const gasPtr = { id: null }, brkPtr = { id: null };
let gasSeen = false;      // 一度でも アクセルを おしたか
const keys = {};

function steerRadius() { return STEER_R / SC; }

// 右がわの ボタンの ばしょ
function gasBox() {
  const r = Math.max(42, 72 / SC);
  return { x: VW - r - 18, y: VH - r - 16, r: r };
}
function brkBox() {
  const g = gasBox(), r = g.r * 0.82;
  return { x: g.x - g.r - r - 10, y: g.y - g.r * 0.30, r: r };
}
function inCircle(b, x, y) { return Math.hypot(x - b.x, y - b.y) <= b.r * 1.15; }

function applyInput() {
  let st = steerPtr.id !== null ? steerPtr.val : 0;
  if (keys.ArrowLeft) st = -1;
  if (keys.ArrowRight) st = 1;
  if (keys.ArrowLeft && keys.ArrowRight) st = 0;
  G.steer = Math.max(-1, Math.min(1, st));

  let th = 0;
  if (gasPtr.id !== null || keys.ArrowUp || keys[' '] || keys.Space) { th = 1; gasSeen = true; }
  if (brkPtr.id !== null || keys.ArrowDown) th = -1;
  G.throttle = th;
}

function down(id, px, py) {
  audioStart();
  const x = px / SC, y = py / SC - VOY;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b && b.on && y < VH * 0.35) { b.on(); return; }
    // ★ 右がわは どこを おしても アクセル。まえは 小さな まるを
    //   きっちり おさないと 進まなかった。ブレーキの まるだけ べつあつかい。
    if (x >= VW * 0.55) {
      if (inCircle(brkBox(), x, y)) brkPtr.id = id; else { gasPtr.id = id; gasSeen = true; }
      applyInput(); return;
    }
    if (x < VW * 0.55 && steerPtr.id === null) {
      steerPtr.id = id; steerPtr.cx = x; steerPtr.val = 0;
      applyInput();
      return;
    }
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}
function move(id, px, py) {
  const x = px / SC, y = py / SC - VOY;
  // 右がわの ゆびは、すべらせる だけで アクセル と ブレーキを 行き来できる
  if (gasPtr.id === id || brkPtr.id === id) {
    const onBrk = inCircle(brkBox(), x, y);
    if (onBrk && brkPtr.id !== id) { gasPtr.id = null; brkPtr.id = id; applyInput(); }
    else if (!onBrk && gasPtr.id !== id && x >= VW * 0.55) { brkPtr.id = null; gasPtr.id = id; applyInput(); }
    else if (!onBrk && x < VW * 0.55) { gasPtr.id = null; brkPtr.id = null; applyInput(); }
    return;
  }
  if (steerPtr.id === id) {
    const r = steerRadius();
    let d = x - steerPtr.cx;
    if (Math.abs(d) > r) { steerPtr.cx += Math.sign(d) * (Math.abs(d) - r); d = Math.sign(d) * r; }
    steerPtr.val = d / r;
    applyInput();
  }
}
function up(id) {
  if (steerPtr.id === id) { steerPtr.id = null; steerPtr.val = 0; }
  if (gasPtr.id === id) gasPtr.id = null;
  if (brkPtr.id === id) brkPtr.id = null;
  applyInput();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) down(t.identifier, t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) move(t.identifier, t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) up(t.identifier);
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => { for (const t of e.changedTouches) up(t.identifier); });
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  move('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => up('m'));

window.addEventListener('keydown', (e) => {
  const k = e.key === ' ' ? 'Space' : e.key;
  keys[k] = true;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(k) >= 0) {
    applyInput(); e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  const k = e.key === ' ' ? 'Space' : e.key;
  keys[k] = false;
  applyInput();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); engStop(); }
});

// --- ループ -------------------------------------------------------------------------


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

let last = 0, tsec = 0, cntShown = 9;
function frame(now) {
  portraitTip();
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') {
    update(dt);
    // カウントダウンの音
    if (!G.started) {
      const left = Math.ceil(G.count - 0.2);
      if (left !== cntShown && left >= 1 && left <= 3) { cntShown = left; sfxCount(left); }
    } else cntShown = 9;
    drawPlay(tsec);
  } else if (G.screen === 'result') drawResult();
  else if (G.screen === 'howto') drawHowto();
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1E2A4A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('横向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#8FD6FF';
  ctx.fillText('道が向こうから流れてくるよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
