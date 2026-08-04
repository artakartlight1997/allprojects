// 描画。画像は使わず、ぜんぶ図形で描く。

'use strict';

const view = { w: 0, h: 0, tile: 40, tilesX: 18, dpr: 1 };

function sx(x) { return (x - game.cam.x) * view.tile; }
function sy(y) { return (y - game.cam.y) * view.tile; }

function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

// ---------------------------------------------------------------- 都道府県の形

function prefBBox(p) {
  if (p._bb) return p._bb;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  // シルエットは大きい島だけで作る。小さい離島まで入れると本体が豆粒になる
  let big = 0;
  for (const r of p.rings) big = Math.max(big, r.length);
  for (const r of p.rings) {
    if (r.length < big * 0.28) continue;
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < x0) x0 = r[i];
      if (r[i] > x1) x1 = r[i];
      if (r[i + 1] < y0) y0 = r[i + 1];
      if (r[i + 1] > y1) y1 = r[i + 1];
    }
  }
  p._bb = { x0, y0, x1, y1, big };
  return p._bb;
}

// 都道府県ひとつを box の中いっぱいに描く（形あてクイズ・スタンプ帳のカード）
function drawPrefShape(ctx, p, cx, cy, size, fill, stroke, lw) {
  const bb = prefBBox(p);
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  const s = size / Math.max(w, h);
  ctx.save();
  ctx.translate(cx - (bb.x0 + w / 2) * s, cy - (bb.y0 + h / 2) * s);
  ctx.beginPath();
  for (const r of p.rings) {
    if (r.length < bb.big * 0.28) continue;
    ctx.moveTo(r[0] * s, r[1] * s);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i] * s, r[i + 1] * s);
    ctx.closePath();
  }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  ctx.restore();
}

const MARK_COLORS = ['#e8503f', '#2f7de0', '#2fa85a', '#d9a02b'];

// 日本地図ぜんぶ。opts で塗り分ける
//   hi:[id]      赤くする
//   marks:[id]   ①〜④の色を付けて番号を書く
//   mastery:true おぼえ具合で色を変える
//   fills:{id:色} 県ごとに色を指定（すごろく用）
//   sel:id       枠を太くする
function drawJapanMap(ctx, x, y, size, opts) {
  opts = opts || {};
  const s = size / PREF_QUANT;
  ctx.save();
  ctx.translate(x, y);
  // 沖縄の枠（日本の地図でよくある囲み）
  const ins = OKINAWA_INSET;
  ctx.strokeStyle = 'rgba(90,120,150,0.55)';
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.setLineDash([size * 0.02, size * 0.015]);
  ctx.strokeRect((ins.x - 0.055) * size, (ins.y - 0.055) * size,
                 0.115 * size, 0.115 * size);
  ctx.setLineDash([]);

  for (const p of PREFS) {
    let fill = opts.base || '#dfeacd';
    if (opts.fills && opts.fills[p.id]) fill = opts.fills[p.id];
    if (opts.hi && opts.hi.includes(p.id)) fill = '#e8503f';
    else if (opts.marks && opts.marks.includes(p.id)) {
      fill = MARK_COLORS[opts.marks.indexOf(p.id)];
    } else if (opts.mastery) {
      const m = masteryLevel(p.id);
      fill = ['#e6e6e6', '#ffe0a8', '#a8e0a0', '#5fc27e'][m];
    }
    ctx.beginPath();
    for (const r of p.rings) {
      ctx.moveTo(r[0] * s, r[1] * s);
      for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i] * s, r[i + 1] * s);
      ctx.closePath();
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = opts.sel === p.id ? '#1d2b3a' : 'rgba(60,80,100,0.45)';
    ctx.lineWidth = Math.max(0.6, size * (opts.sel === p.id ? 0.006 : 0.0018));
    ctx.stroke();
  }

  // 赤くした県は小さいと見つけられないので、まわりに輪を描いて目印にする
  if (opts.hi) {
    for (const id of opts.hi) {
      const p = PREF_BY_ID[id];
      ctx.beginPath();
      ctx.arc(p.cx * s, p.cy * s, size * 0.075, 0, 7);
      ctx.strokeStyle = '#e8503f';
      ctx.lineWidth = Math.max(1.5, size * 0.008);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.cx * s, p.cy * s, size * 0.092, 0, 7);
      ctx.strokeStyle = 'rgba(232,80,63,0.35)';
      ctx.lineWidth = Math.max(1, size * 0.005);
      ctx.stroke();
    }
  }

  if (opts.marks) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(size * 0.042) + 'px system-ui, sans-serif';
    for (let i = 0; i < opts.marks.length; i++) {
      const p = PREF_BY_ID[opts.marks[i]];
      const px = p.cx * s, py = p.cy * s;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.032, 0, 7);
      ctx.fillStyle = MARK_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(1, size * 0.005);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(String(i + 1), px, py + size * 0.001);
    }
  }
  ctx.restore();
}

// 地図の上の点から都道府県をさがす（スタンプ帳のタップ用）
function prefAt(mx, my, x, y, size) {
  const s = size / PREF_QUANT;
  const qx = (mx - x) / s, qy = (my - y) / s;
  let best = null, bestD = 1e9;
  for (const p of PREFS) {
    for (const r of p.rings) {
      if (pointInRing(qx, qy, r)) return p;
    }
    const d = (p.cx - qx) ** 2 + (p.cy - qy) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return bestD < (PREF_QUANT * 0.035) ** 2 ? best : null;
}

function pointInRing(x, y, r) {
  let inside = false;
  const n = r.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = r[i * 2], yi = r[i * 2 + 1], xj = r[j * 2], yj = r[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- 背景

function drawSky(ctx, st) {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, st.sky.top);
  g.addColorStop(1, st.sky.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);

  if (st.sky.star > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + st.sky.star * 0.4) + ')';
    for (let i = 0; i < 60; i++) {
      const px = (i * 173.7 % view.w);
      const py = (i * 91.3 % (view.h * 0.55));
      const r = (i % 3) * 0.6 + 0.7;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    }
  }
  // おひさま／お月さま
  ctx.fillStyle = st.sky.sun;
  ctx.beginPath();
  ctx.arc(view.w * 0.8, view.h * 0.18, view.h * 0.06, 0, 7);
  ctx.fill();
}

function hills(ctx, base, amp, col, off, step) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, view.h);
  for (let x = 0; x <= view.w; x += 12) {
    const t = (x + off) / step;
    ctx.lineTo(x, base + Math.sin(t) * amp + Math.sin(t * 2.3) * amp * 0.4);
  }
  ctx.lineTo(view.w, view.h);
  ctx.closePath();
  ctx.fill();
}

function drawDeco(ctx, st) {
  const cam = game.cam.x * view.tile;
  const base = view.h * 0.62;
  const d = st.theme.deco;

  if (d === 'snow') {
    hills(ctx, base, 40, 'rgba(255,255,255,0.75)', -cam * 0.15, 130);
    hills(ctx, base + 30, 26, 'rgba(220,238,248,0.9)', -cam * 0.3, 90);
  } else if (d === 'sea') {
    ctx.fillStyle = 'rgba(70,170,205,0.55)';
    ctx.fillRect(0, base, view.w, view.h - base);
    for (let i = 0; i < 3; i++) {
      const bx = ((i * 420 - cam * 0.2) % (view.w + 420)) - 120;
      ctx.fillStyle = 'rgba(120,180,140,0.75)';
      ctx.beginPath();
      ctx.ellipse(bx, base + 6, 90, 26, 0, Math.PI, 0);
      ctx.fill();
    }
  } else if (d === 'town') {
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 150 - cam * 0.25) % (view.w + 300)) - 150;
      const bh = 60 + (i * 37 % 90);
      ctx.fillStyle = 'rgba(120,140,175,0.6)';
      ctx.fillRect(bx, base - bh, 78, bh + 40);
      ctx.fillStyle = 'rgba(255,240,190,0.5)';
      for (let k = 0; k < 4; k++)
        for (let j = 0; j < 3; j++)
          if ((i + k + j) % 3) ctx.fillRect(bx + 10 + j * 20, base - bh + 12 + k * 18, 10, 10);
    }
  } else if (d === 'temple') {
    hills(ctx, base + 10, 26, 'rgba(140,175,140,0.7)', -cam * 0.2, 110);
    const bx = ((-cam * 0.3) % (view.w + 600)) + 200;
    ctx.fillStyle = 'rgba(190,80,80,0.75)';
    for (let k = 0; k < 4; k++) {
      const wdt = 120 - k * 22;
      ctx.fillRect(bx - wdt / 2, base - 40 - k * 34, wdt, 10);
      ctx.fillRect(bx - wdt / 3, base - 34 - k * 34, wdt * 0.66, 26);
    }
  } else if (d === 'south') {
    hills(ctx, base + 20, 18, 'rgba(120,190,150,0.7)', -cam * 0.2, 100);
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 260 - cam * 0.35) % (view.w + 260)) - 60;
      ctx.strokeStyle = 'rgba(120,90,60,0.8)';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(bx, base + 40); ctx.quadraticCurveTo(bx + 8, base - 20, bx + 22, base - 54); ctx.stroke();
      ctx.fillStyle = 'rgba(70,160,90,0.85)';
      for (let k = 0; k < 5; k++) {
        const a = -2.6 + k * 0.55;
        ctx.beginPath();
        ctx.ellipse(bx + 22 + Math.cos(a) * 26, base - 54 + Math.sin(a) * 16, 30, 10, a, 0, 7);
        ctx.fill();
      }
    }
  } else if (d === 'forest') {
    hills(ctx, base, 34, 'rgba(90,140,95,0.65)', -cam * 0.18, 120);
    for (let i = 0; i < 9; i++) {
      const bx = ((i * 190 - cam * 0.32) % (view.w + 190)) - 60;
      ctx.fillStyle = 'rgba(60,115,70,0.85)';
      ctx.beginPath();
      ctx.moveTo(bx, base + 40);
      ctx.lineTo(bx + 34, base - 70);
      ctx.lineTo(bx + 68, base + 40);
      ctx.closePath(); ctx.fill();
    }
  } else if (d === 'mount') {
    hills(ctx, base - 20, 70, 'rgba(110,125,175,0.55)', -cam * 0.12, 160);
    hills(ctx, base + 20, 40, 'rgba(95,140,105,0.7)', -cam * 0.26, 110);
  } else {
    hills(ctx, base, 40, 'rgba(140,180,120,0.6)', -cam * 0.18, 130);
    hills(ctx, base + 30, 26, 'rgba(110,160,100,0.7)', -cam * 0.32, 90);
  }

  if (st.event === 'rain') {
    ctx.strokeStyle = 'rgba(200,225,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const px = (i * 137 + game.t * 900) % view.w;
      const py = (i * 89 + game.t * 1400) % view.h;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 6, py + 18); ctx.stroke();
    }
  }
  if (st.event === 'wind') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const py = (i * 97) % view.h;
      const px = (i * 211 + game.t * 260 * Math.sign(game.wind || 1)) % (view.w + 200) - 100;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 46, py + 4); ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- タイル

function drawTiles(ctx, st) {
  const x0 = Math.max(0, Math.floor(game.cam.x) - 1);
  const x1 = Math.min(st.w - 1, Math.ceil(game.cam.x + view.tilesX) + 1);
  const y0 = Math.max(0, Math.floor(game.cam.y) - 1);
  const y1 = Math.min(st.h - 1, Math.ceil(game.cam.y + VIEW_TILES_Y) + 1);
  const T = view.tile;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = st.g[y][x];
      if (c === '.') continue;
      const px = sx(x), py = sy(y);
      if (c === '#') {
        ctx.fillStyle = st.theme.soil;
        ctx.fillRect(px, py, T + 1, T + 1);
        ctx.fillStyle = st.theme.ground;
        ctx.fillRect(px, py, T + 1, T * 0.34);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(px, py, T + 1, 3);
      } else if (c === '=') {
        ctx.fillStyle = st.theme.soil;
        ctx.fillRect(px, py, T + 1, T + 1);
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        if ((x + y) % 2 === 0) ctx.fillRect(px, py, T + 1, T + 1);
      } else if (c === '^') {
        ctx.fillStyle = '#8f96a8';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(px + k * T / 3, py + T);
          ctx.lineTo(px + k * T / 3 + T / 6, py + T * 0.15);
          ctx.lineTo(px + (k + 1) * T / 3, py + T);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#dfe4ee';
        ctx.fillRect(px, py + T * 0.92, T + 1, T * 0.1);
      }
    }
  }
}

// ---------------------------------------------------------------- キャラ

// りな。旅のリュックをしょっている
function drawRina(ctx, x, y, s, face, anim, opts) {
  opts = opts || {};
  ctx.save();
  ctx.translate(x, y);
  if (opts.blink) ctx.globalAlpha = 0.45;
  ctx.scale(face, 1);
  const bob = Math.sin(anim * 2) * s * 0.03;

  if (opts.star) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ['#ffd166', '#ff8fa0', '#8fd0ff', '#c8ff9f'][(anim * 8 | 0) % 4];
    ctx.beginPath(); ctx.arc(0, 0, s * 0.78, 0, 7); ctx.fill();
    ctx.restore();
  }

  // リュック
  ctx.fillStyle = '#8a6cc4';
  rr(ctx, -s * 0.62, -s * 0.2 + bob, s * 0.42, s * 0.62, s * 0.14);
  ctx.fill();

  // あし
  ctx.fillStyle = '#f2b8c6';
  const step = Math.sin(anim * 6) * s * 0.16;
  rr(ctx, -s * 0.26 + step, s * 0.36, s * 0.22, s * 0.3, s * 0.09); ctx.fill();
  rr(ctx, s * 0.05 - step, s * 0.36, s * 0.22, s * 0.3, s * 0.09); ctx.fill();

  // からだ
  ctx.fillStyle = '#ff8fb0';
  rr(ctx, -s * 0.42, -s * 0.26 + bob, s * 0.84, s * 0.72, s * 0.3);
  ctx.fill();
  ctx.fillStyle = '#ffd9e4';
  rr(ctx, -s * 0.22, -s * 0.02 + bob, s * 0.44, s * 0.36, s * 0.16);
  ctx.fill();

  // かお
  ctx.fillStyle = '#ffe3d0';
  ctx.beginPath();
  ctx.arc(0, -s * 0.55 + bob, s * 0.42, 0, 7);
  ctx.fill();
  // かみ
  ctx.fillStyle = '#5a3b32';
  ctx.beginPath();
  ctx.arc(0, -s * 0.62 + bob, s * 0.44, Math.PI * 1.02, Math.PI * 2.02);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-s * 0.38, -s * 0.45 + bob, s * 0.13, s * 0.26, 0.2, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.38, -s * 0.45 + bob, s * 0.13, s * 0.26, -0.2, 0, 7);
  ctx.fill();
  // ぼうし（旅がら）
  ctx.fillStyle = '#f6d76b';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.86 + bob, s * 0.5, s * 0.12, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.92 + bob, s * 0.26, Math.PI, 0);
  ctx.fill();
  // め
  ctx.fillStyle = '#33262b';
  const blinkOpen = (anim % 4) > 0.12 ? 1 : 0.15;
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.55 + bob, s * 0.06, s * 0.09 * blinkOpen, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.15, -s * 0.55 + bob, s * 0.06, s * 0.09 * blinkOpen, 0, 0, 7);
  ctx.fill();
  // ほっぺ
  ctx.fillStyle = 'rgba(255,140,160,0.55)';
  ctx.beginPath(); ctx.arc(-s * 0.28, -s * 0.42 + bob, s * 0.08, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.28, -s * 0.42 + bob, s * 0.08, 0, 7); ctx.fill();
  // くち
  ctx.strokeStyle = '#33262b';
  ctx.lineWidth = Math.max(1, s * 0.045);
  ctx.beginPath();
  ctx.arc(0, -s * 0.42 + bob, s * 0.1, 0.25, Math.PI - 0.25);
  ctx.stroke();

  if (opts.barrier) {
    ctx.strokeStyle = 'rgba(130,210,255,0.85)';
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.85, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(ctx, e, T) {
  const x = sx(e.x), y = sy(e.y), s = T * 0.8;
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(game.t * 5 + e.ph) * s * 0.06;
  if (e.kind === 'walker') {
    ctx.fillStyle = '#6fce7a';
    ctx.beginPath();
    ctx.ellipse(0, bob, s * 0.5, s * 0.42, 0, Math.PI, 0);
    ctx.rect(-s * 0.5, bob, s, s * 0.42);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.16, bob - s * 0.06, s * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.16, bob - s * 0.06, s * 0.12, 0, 7); ctx.fill();
    ctx.fillStyle = '#243';
    ctx.beginPath(); ctx.arc(-s * 0.14, bob - s * 0.06, s * 0.06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.18, bob - s * 0.06, s * 0.06, 0, 7); ctx.fill();
  } else if (e.kind === 'flyer') {
    const f = Math.sin(game.t * 12 + e.ph) * 0.5 + 0.5;
    ctx.fillStyle = '#8fd8ef';
    ctx.beginPath();
    ctx.ellipse(-s * 0.5, bob, s * 0.32, s * 0.16 + f * s * 0.12, -0.5, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.5, bob, s * 0.32, s * 0.16 + f * s * 0.12, 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#5cb8d8';
    ctx.beginPath(); ctx.arc(0, bob, s * 0.36, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.12, bob - s * 0.04, s * 0.1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.12, bob - s * 0.04, s * 0.1, 0, 7); ctx.fill();
  } else if (e.kind === 'bouncer') {
    ctx.fillStyle = '#f6a04a';
    const sq = e.vy < 0 ? 1.1 : 0.92;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44 / sq, s * 0.44 * sq, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.14, -s * 0.06, s * 0.11, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.14, -s * 0.06, s * 0.11, 0, 7); ctx.fill();
    ctx.fillStyle = '#432';
    ctx.beginPath(); ctx.arc(-s * 0.13, -s * 0.05, s * 0.055, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.15, -s * 0.05, s * 0.055, 0, 7); ctx.fill();
  } else { // spiky
    ctx.fillStyle = '#9b6fd0';
    ctx.beginPath(); ctx.arc(0, bob, s * 0.36, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4fb0';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.3, bob + Math.sin(a) * s * 0.3);
      ctx.lineTo(Math.cos(a + 0.3) * s * 0.3, bob + Math.sin(a + 0.3) * s * 0.3);
      ctx.lineTo(Math.cos(a + 0.15) * s * 0.6, bob + Math.sin(a + 0.15) * s * 0.6);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-s * 0.1, bob, s * 0.09, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.1, bob, s * 0.09, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// クイズの鳥居
function drawGate(ctx, e, T) {
  const x = sx(e.x), y = sy(e.y);
  const w = T * 1.7, h = T * 2.1;
  ctx.save();
  ctx.translate(x, y + T * 0.5);
  const done = e.used;
  ctx.fillStyle = done ? '#9aa3ae' : '#d8443c';
  ctx.fillRect(-w * 0.36, -h, T * 0.17, h);
  ctx.fillRect(w * 0.36 - T * 0.17, -h, T * 0.17, h);
  ctx.fillRect(-w * 0.5, -h, w, T * 0.2);
  ctx.fillRect(-w * 0.42, -h + T * 0.34, w * 0.84, T * 0.14);
  ctx.fillStyle = done ? '#c9ced6' : '#f4e9c8';
  rr(ctx, -T * 0.34, -h * 0.62, T * 0.68, T * 0.62, T * 0.1);
  ctx.fill();
  ctx.fillStyle = done ? '#8a9199' : '#c0392b';
  ctx.font = 'bold ' + Math.round(T * 0.5) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(done ? '済' : '？', 0, -h * 0.62 + T * 0.33);
  if (!done) {
    const g = Math.sin(game.t * 4) * 0.5 + 0.5;
    ctx.strokeStyle = 'rgba(255,230,120,' + (0.35 + g * 0.5) + ')';
    ctx.lineWidth = 3;
    ctx.strokeRect(-w * 0.5, -h, w, h);
  }
  ctx.restore();
}

function drawEnts(ctx, T) {
  for (const e of game.ents) {
    if (e.dead) continue;
    const x = sx(e.x), y = sy(e.y);
    if (x < -3 * T || x > view.w + 3 * T) continue;

    if (e.t === 'coin') {
      const k = Math.abs(Math.sin(game.t * 3 + e.ph));
      ctx.fillStyle = '#f6c728';
      ctx.beginPath();
      ctx.ellipse(x, y, T * 0.26 * (0.35 + k * 0.65), T * 0.28, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#fff0a8'; ctx.lineWidth = 2; ctx.stroke();
    } else if (e.t === 'gem') {
      ctx.save(); ctx.translate(x, y + Math.sin(game.t * 3 + e.ph) * T * 0.12);
      ctx.fillStyle = '#66dcf5';
      ctx.beginPath();
      ctx.moveTo(0, -T * 0.34); ctx.lineTo(T * 0.28, 0);
      ctx.lineTo(0, T * 0.34); ctx.lineTo(-T * 0.28, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -T * 0.34); ctx.lineTo(T * 0.12, -T * 0.05);
      ctx.lineTo(-T * 0.12, -T * 0.05); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (e.t === 'item') {
      drawItem(ctx, e.kind, x, y, T);
    } else if (e.t === 'pad') {
      const sq = e.squish > 0 ? 0.6 : 1;
      ctx.fillStyle = '#c8874a';
      ctx.fillRect(x - T * 0.45, y + T * 0.2, T * 0.9, T * 0.28);
      ctx.fillStyle = '#ffd166';
      rr(ctx, x - T * 0.45, y + T * 0.2 - T * 0.34 * sq, T * 0.9, T * 0.34 * sq, T * 0.1);
      ctx.fill();
    } else if (e.t === 'mplat') {
      ctx.fillStyle = '#a98455';
      rr(ctx, x - T * 1.0, y - T * 0.3, T * 2.0, T * 0.5, T * 0.12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x - T * 1.0, y - T * 0.3, T * 2.0, 4);
    } else if (e.t === 'check') {
      ctx.strokeStyle = '#7a6a55'; ctx.lineWidth = Math.max(3, T * 0.1);
      ctx.beginPath(); ctx.moveTo(x, y + T * 0.5); ctx.lineTo(x, y - T * 1.2); ctx.stroke();
      const wv = Math.sin(game.t * 4) * T * 0.08;
      ctx.fillStyle = e.used ? '#5fc27e' : '#cfd6de';
      ctx.beginPath();
      ctx.moveTo(x, y - T * 1.2);
      ctx.lineTo(x + T * 0.8, y - T * 1.0 + wv);
      ctx.lineTo(x, y - T * 0.6);
      ctx.closePath(); ctx.fill();
    } else if (e.t === 'gate') {
      drawGate(ctx, e, T);
    } else if (e.t === 'goal') {
      ctx.fillStyle = '#8a5fc4';
      ctx.fillRect(x - T * 0.1, y - T * 2.4, T * 0.2, T * 2.9);
      const wv = Math.sin(game.t * 3) * T * 0.1;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(x + T * 0.1, y - T * 2.4);
      ctx.lineTo(x + T * 1.3, y - T * 2.1 + wv);
      ctx.lineTo(x + T * 0.1, y - T * 1.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(T * 0.4) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ゴール', x + T * 0.6, y - T * 1.95);
    } else if (e.t === 'enemy') {
      drawEnemy(ctx, e, T);
    }
  }
}

function drawItem(ctx, kind, x, y, T) {
  ctx.save();
  ctx.translate(x, y);
  const r = T * 0.34;
  if (kind === 'heart') {
    ctx.fillStyle = '#ff6f8f';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(-r * 1.4, -r * 0.2, -r * 0.5, -r * 1.2, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.5, -r * 1.2, r * 1.4, -r * 0.2, 0, r * 0.9);
    ctx.fill();
  } else if (kind === 'star') {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr2 = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill();
  } else if (kind === 'dash') {
    ctx.fillStyle = '#5fd0e8';
    rr(ctx, -r, -r * 0.5, r * 1.8, r * 1.0, r * 0.3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.3); ctx.lineTo(r * 0.5, -r * 0.3);
    ctx.lineTo(r * 0.1, r * 0.4); ctx.closePath(); ctx.fill();
  } else if (kind === 'feather') {
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.4, r, -0.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e0c96a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.7); ctx.lineTo(r * 0.5, -r * 0.7); ctx.stroke();
  } else if (kind === 'barrier') {
    ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = Math.max(3, T * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(127,208,255,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#e8503f';
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#dfe4ee';
    ctx.fillRect(-r, 0, r * 0.55, r * 0.7);
    ctx.fillRect(r * 0.45, 0, r * 0.55, r * 0.7);
  }
  ctx.restore();
}

function drawChaser(ctx, T) {
  const c = game.chaser;
  if (!c) return;
  const x = sx(c.x), y = sy(c.y);
  if (x < -4 * T) return;
  const s = T * 1.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(game.t * 4);
  ctx.fillStyle = '#b98757';
  ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#8d6440';
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28, s * 0.1, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold ' + Math.round(T * 0.35) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('おおきな だんご！', x, y - s * 0.7);
}

function drawFx(ctx, T) {
  for (const f of game.fx) {
    const x = sx(f.x), y = sy(f.y);
    if (f.text) {
      ctx.globalAlpha = Math.min(1, f.t);
      ctx.fillStyle = f.col;
      ctx.font = 'bold ' + Math.round(T * 0.42) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, x, y);
      ctx.globalAlpha = 1;
    } else if (f.ring) {
      ctx.globalAlpha = Math.max(0, f.t / 0.35) * 0.7;
      ctx.strokeStyle = f.col; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, T * (0.2 + (1 - f.t / 0.35) * 0.7), 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.t / 0.6));
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.arc(x, y, T * f.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// くらいステージ。りなのまわりだけ明るい
function drawDark(ctx) {
  const p = game.player;
  const x = sx(p.x), y = sy(p.y);
  const r = view.tile * 4.6;
  const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(4,6,20,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);
}

function drawWorld(ctx) {
  const st = game.stage, T = view.tile, p = game.player;
  drawSky(ctx, st);
  drawDeco(ctx, st);
  drawTiles(ctx, st);
  drawEnts(ctx, T);
  drawChaser(ctx, T);

  const blink = p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0;
  if (p.dash > 0) {
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.16 * (4 - i);
      drawRina(ctx, sx(p.x) - p.face * i * T * 0.22, sy(p.y), T * PLAYER_H * DRAW_SCALE * 0.5,
               p.face, p.anim, {});
      ctx.globalAlpha = 1;
    }
  }
  drawRina(ctx, sx(p.x), sy(p.y), T * PLAYER_H * DRAW_SCALE * 0.5, p.face, p.anim,
           { blink, star: p.star > 0, barrier: p.barrier });
  drawFx(ctx, T);
  if (st.event === 'dark') drawDark(ctx);
}
