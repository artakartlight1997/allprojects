// 画面・操作・メインループ。
//
// ★ 道は「後ろから見た立体」で描く（アウトラン方式）。
//   遠くのセグメントほど小さく、近いほど大きく。近い順に上から重ねると
//   坂もカーブもそれらしく見える。道が向こうから流れてくるので
//   速さがそのまま画面に出る＝スピード感。
//
// ★ 操作は画面の **左半分＝左、右半分＝右**。指を置いている間ずっと曲がる。
//   小さい子でも迷わない。パソコンはやじるしキー。

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

// --- 立体の道 -----------------------------------------------------------------------

const CAM_H = 1500;                                  // カメラの高さ
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
    const p1 = project({ x: x * ROAD_W, y: seg.y1, z: z1 }, camX, camY, camZ);
    const p2 = project({ x: (x + dx) * ROAD_W, y: seg.y2, z: z1 + SEG_LEN }, camX, camY, camZ);
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

  // 左右のボタン（画面の下半分ぜんぶが当たる。絵は目じるし）
  const bh = 84, by = VH - bh - 10;
  for (const dir of [-1, 1]) {
    const bx2 = dir < 0 ? 12 : VW - 100;
    const on = G.steer === dir;
    ctx.fillStyle = on ? 'rgba(255,224,102,0.45)' : 'rgba(255,255,255,0.16)';
    rr(ctx, bx2, by, 88, bh, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    const cx = bx2 + 44, cy = by + bh / 2;
    ctx.moveTo(cx + dir * 20, cy);
    ctx.lineTo(cx - dir * 12, cy - 22);
    ctx.lineTo(cx - dir * 12, cy + 22);
    ctx.closePath(); ctx.fill();
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
  const sub = '左半分で左、右半分で右。アクセルは自動';
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
    '① 画面の 左半分を さわると左、右半分を さわると右に曲がる',
    '　 アクセルは自動。パソコンは ← → でも動く',
    '② 同じ向きに曲がりつづけると 火花がたまる。',
    '　 指をはなした しゅんかんに **ダッシュ**（ドリフト）',
    '③ 道の上のオレンジのパネルを ふむと ダッシュ',
    '④ 草の上に出ると ガタガタして おそくなる',
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

const touches = {};

function applySteer() {
  let l = false, r = false;
  for (const k in touches) {
    if (touches[k] === -1) l = true;
    if (touches[k] === 1) r = true;
  }
  if (keys.ArrowLeft) l = true;
  if (keys.ArrowRight) r = true;
  G.steer = (l && r) ? 0 : (l ? -1 : (r ? 1 : 0));
}

function down(id, px, py) {
  audioStart();
  const x = px / SC, y = py / SC;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b && b.on && y < VH * 0.35) { b.on(); return; }
    // ★ 画面の左半分＝左、右半分＝右
    touches[id] = x < VW / 2 ? -1 : 1;
    applySteer();
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}
function up(id) { delete touches[id]; applySteer(); }

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) down(t.identifier, t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    if (touches[t.identifier] === undefined) continue;
    touches[t.identifier] = (t.clientX - r.left) / SC < VW / 2 ? -1 : 1;
  }
  applySteer();
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
  if (touches.m === undefined) return;
  const r = canvas.getBoundingClientRect();
  touches.m = (e.clientX - r.left) / SC < VW / 2 ? -1 : 1;
  applySteer();
});
window.addEventListener('mouseup', () => up('m'));

const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; applySteer(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = false; applySteer(); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); engStop(); }
});

// --- ループ -------------------------------------------------------------------------

let last = 0, tsec = 0, cntShown = 9;
function frame(now) {
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
