'use strict';
// 描画・入力・メインループ。Android 版の Render.kt / MainActivity.kt に対応する。

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });

const game = new Game();
let uiScale = 1;
let viewW = 0, viewH = 0;

// 当たり判定用に、その時点で描いたボタンの位置を覚えておく
const ui = { left: null, right: null, jump: null, overlayBtn: null, sizeBtns: [] };

// --- 描画ヘルパ ---------------------------------------------------------
const FONT_STACK = 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
function setFont(px) { ctx.font = `700 ${px}px ${FONT_STACK}`; }

function fillCircle(cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, 0), 0, Math.PI * 2);
  ctx.fill();
}
function strokeCircle(cx, cy, r, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(r, 0), 0, Math.PI * 2);
  ctx.stroke();
}
/** Compose の drawOval と同じく左上と大きさで指定する。 */
function fillOval(x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function rectPath(x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function fillRoundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color; rectPath(x, y, w, h, r); ctx.fill();
}
function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
function arcPath(x, y, w, h, startDeg, sweepDeg, useCenter) {
  const cx = x + w / 2, cy = y + h / 2;
  const s = (startDeg * Math.PI) / 180;
  const e = ((startDeg + sweepDeg) * Math.PI) / 180;
  ctx.beginPath();
  if (useCenter) ctx.moveTo(cx, cy);
  ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, s, e, sweepDeg < 0);
  if (useCenter) ctx.closePath();
}
function strokeArc(x, y, w, h, st, sw, color, lw) {
  arcPath(x, y, w, h, st, sw, false);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
function fillArc(x, y, w, h, st, sw, color) {
  arcPath(x, y, w, h, st, sw, true);
  ctx.fillStyle = color; ctx.fill();
}
function poly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}
function line(x1, y1, x2, y2, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function shadowText(text, x, y, px, color, blur) {
  setFont(px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = blur || px * 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// --- 背景 ---------------------------------------------------------------
function drawBackground(pal, cam, s) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  fillRect(0, 0, viewW, viewH, g);

  if (pal.night) {
    for (let i = 0; i < 40; i++) {
      const x = (((i * 137) % 100) / 100) * viewW;
      const y = (((i * 89) % 60) / 100) * viewH;
      fillCircle(x, y, s * 0.04 * (1 + (i % 3)), 'rgba(255,255,255,0.7)');
    }
  }
  fillCircle(viewW * 0.78, viewH * 0.18, s * 2.2, rgba(pal.cloud, 0.35));

  const cloudShift = -cam * s * 0.15;
  const span = viewW + 6 * s;
  for (let i = 0; i < 14; i++) {
    const bx = i * 9 * s + cloudShift;
    const x = (((bx % span) + span) % span) - 3 * s;
    const y = viewH * (0.1 + 0.07 * ((i * 7) % 5));
    const r = s * (0.55 + 0.12 * ((i * 3) % 4));
    const c = rgba(pal.cloud, pal.cloudA);
    fillCircle(x, y, r, c);
    fillCircle(x + r, y + r * 0.2, r * 0.8, c);
    fillCircle(x - r, y + r * 0.25, r * 0.7, c);
  }

  const hillShift = -cam * s * 0.4;
  for (let layer = 0; layer < 2; layer++) {
    const color = layer === 0 ? pal.hillBack : pal.hillFront;
    const baseY = viewH * (layer === 0 ? 0.72 : 0.82);
    const r = s * (layer === 0 ? 3.4 : 2.6);
    const step = r * 1.5;
    const shift = hillShift * (layer === 0 ? 0.6 : 1);
    const first = Math.floor((-shift - step) / step);
    const last = Math.ceil((viewW - shift + step) / step);
    for (let i = first; i <= last; i++) fillCircle(i * step + shift, baseY + r * 0.55, r, color);
    fillRect(0, baseY + r * 0.5, viewW, viewH, color);
  }
}

// --- タイル -------------------------------------------------------------
function drawTiles(pal, cam, s) {
  const lv = game.level;
  const first = Math.max(Math.floor(cam), 0);
  const last = Math.min(Math.floor(cam + viewW / s + 2), lv.width - 1);
  const lava = lv.theme === 'LAVA' || lv.theme === 'CASTLE';
  for (let ty = 0; ty < lv.height; ty++) {
    for (let tx = first; tx <= last; tx++) {
      const c = lv.tiles[ty][tx];
      if (c === '.') continue;
      const x = (tx - cam) * s;
      const y = ty * s;
      if (c === '#') {
        const open = ty === 0 || lv.tiles[ty - 1][tx] !== '#';
        fillRect(x, y, s, s, pal.dirt);
        fillRect(x, y + s * 0.82, s, s * 0.18, pal.dirtDark);
        if (open) {
          fillRect(x, y, s, s * 0.3, pal.surface);
          fillCircle(x + s * 0.25, y + s * 0.3, s * 0.16, pal.surface);
          fillCircle(x + s * 0.7, y + s * 0.31, s * 0.13, pal.surface);
        } else {
          fillCircle(x + s * 0.3, y + s * 0.4, s * 0.09, rgba(pal.dirtDark, 0.5));
        }
      } else if (c === '=') {
        fillRoundRect(x, y, s, s * 0.62, s * 0.18, pal.platform);
        fillRect(x, y, s, s * 0.2, pal.surface);
      } else if (c === '?') {
        fillRoundRect(x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.16, '#F6C445');
        fillRoundRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72, s * 0.12, '#FFE08A');
        strokeArc(x + s * 0.32, y + s * 0.22, s * 0.36, s * 0.34, 160, 250, '#B07714', s * 0.1);
        fillCircle(x + s * 0.5, y + s * 0.72, s * 0.06, '#B07714');
      } else if (c === 'x') {
        fillRoundRect(x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.16, '#9A7B52');
        fillRoundRect(x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.68, s * 0.1, '#7E6342');
      } else if (c === 's') {
        if (lava) {
          fillRect(x, y, s, s, pal.hazardBase);
          const wob = Math.sin(game.elapsed * 3 + tx) * s * 0.06;
          fillRect(x, y + s * 0.1 + wob, s, s * 0.9, pal.hazard);
          fillCircle(x + s * 0.3, y + s * 0.35 + wob, s * 0.1, 'rgba(255,255,255,0.35)');
        } else {
          for (let i = 0; i < 3; i++) {
            const bx = x + (s * i) / 3;
            poly([[bx, y + s], [bx + s / 6, y + s * 0.18], [bx + s / 3, y + s]], pal.hazard);
          }
          fillRect(x, y + s * 0.86, s, s * 0.14, pal.hazardBase);
        }
      } else if (c === 'F') {
        // もろい足場。乗るとひび割れて震え、やがて落ちる。
        const cr = game.crumbleAt(tx, ty);
        const shake = cr && cr.state === 1 ? Math.sin(game.elapsed * 60) * s * 0.05 : 0;
        fillRoundRect(x + shake, y, s, s * 0.6, s * 0.14, '#B9A489');
        fillRect(x + shake, y, s, s * 0.16, '#D6C6AC');
        const lw = cr && cr.state === 1 ? s * 0.06 : s * 0.04;
        line(x + shake + s * 0.3, y, x + shake + s * 0.42, y + s * 0.6, '#6E5F4B', lw);
        line(x + shake + s * 0.72, y, x + shake + s * 0.6, y + s * 0.6, '#6E5F4B', lw);
      } else if (c === 'T') {
        // とつぜんトゲ。近づくまでは地面に埋まっている。
        const tr = game.trapAt.get(ty * lv.width + tx);
        let out = 0;
        if (tr && tr.state === 2) out = 1;
        else if (tr && tr.state === 1) out = clamp(tr.t / TRAP_WARN, 0, 1) * 0.35;
        if (out > 0.02) {
          for (let i = 0; i < 3; i++) {
            const bx = x + (s * i) / 3;
            const top = y + s * (1 - 0.82 * out);
            poly([[bx, y + s], [bx + s / 6, top], [bx + s / 3, y + s]], pal.hazard);
          }
        }
        // 出ていないときも「あやしい継ぎ目」は見えている
        fillRect(x, y + s * 0.88, s, s * 0.12, rgba(pal.hazardBase, 0.9));
        for (let i = 0; i < 3; i++) {
          fillCircle(x + s * (0.17 + i * 0.33), y + s * 0.93, s * 0.035, rgba(pal.hazard, 0.55));
        }
      } else if (c === '^') {
        const squish = Math.sin(game.elapsed * 4 + tx) * s * 0.03;
        fillRect(x + s * 0.2, y + s * 0.6, s * 0.6, s * 0.4, '#6E6E86');
        for (let i = 0; i < 3; i++) {
          fillRect(x + s * 0.18, y + s * (0.62 + i * 0.12), s * 0.64, s * 0.05, '#9C9CB8');
        }
        fillRoundRect(x + s * 0.02, y + s * 0.28 + squish, s * 0.96, s * 0.34, s * 0.17, '#3ED17E');
        fillRoundRect(x + s * 0.1, y + s * 0.32 + squish, s * 0.8, s * 0.12, s * 0.06, '#8CF0B6');
      }
    }
  }
}

/** 崩れて消えた足場は、戻ってくることが分かるよう薄い枠だけ残す。 */
function drawCrumbleGhosts(cam, s) {
  for (const c of game.crumbles) {
    if (c.state !== 2) continue;
    const x = (c.tx - cam) * s;
    if (x < -s || x > viewW + s) continue;
    const back = clamp(c.t / CRUMBLE_BACK, 0, 1);
    ctx.strokeStyle = `rgba(214,198,172,${0.15 + back * 0.25})`;
    ctx.lineWidth = s * 0.05;
    rectPath(x, c.ty * s, s, s * 0.6, s * 0.14);
    ctx.stroke();
  }
}

function drawMovers(pal, cam, s) {
  for (const m of game.movers) {
    const x = (m.x - cam) * s;
    if (x < -3 * s || x > viewW + 3 * s) continue;
    const y = m.y * s;
    const w = MOVER_W * s;
    const h = MOVER_H * s;
    fillRoundRect(x, y + h * 0.4, w, h, s * 0.12, pal.dirtDark);
    fillRoundRect(x, y, w, h, s * 0.12, pal.platform);
    fillRoundRect(x, y, w, h * 0.45, s * 0.1, pal.surface);
    const c = '#5A5A70';
    fillCircle(x + s * 0.25, y + h * 0.6, s * 0.06, c);
    fillCircle(x + w - s * 0.25, y + h * 0.6, s * 0.06, c);
    const cx = x + w / 2, cy = y + h * 0.55, r = s * 0.1;
    if (m.vertical) {
      poly([[cx, cy - s * 0.14 - r], [cx - r, cy - s * 0.14 + r], [cx + r, cy - s * 0.14 + r]], c);
      poly([[cx, cy + s * 0.14 + r], [cx - r, cy + s * 0.14 - r], [cx + r, cy + s * 0.14 - r]], c);
    } else {
      poly([[cx - s * 0.18 - r, cy], [cx - s * 0.18 + r, cy - r], [cx - s * 0.18 + r, cy + r]], c);
      poly([[cx + s * 0.18 + r, cy], [cx + s * 0.18 - r, cy - r], [cx + s * 0.18 - r, cy + r]], c);
    }
  }
}

function drawCheckpoints(cam, s) {
  for (const cp of game.checkpoints) {
    const x = (cp.x - cam) * s;
    if (x < -2 * s || x > viewW + 2 * s) continue;
    const base = cp.y * s;
    const height = s * 3;
    fillRoundRect(x + s * 0.44, base - height, s * 0.12, height, s * 0.06, '#B9BFCB');
    const flagColor = cp.active ? '#5FD8A0' : '#9AA0AC';
    const wave = cp.active ? Math.sin(game.elapsed * 4) * s * 0.1 : 0;
    poly([
      [x + s * 0.54, base - height + s * 0.12],
      [x + s * 1.5 + wave, base - height + s * 0.6],
      [x + s * 0.54, base - height + s * 1.08],
    ], flagColor);
    if (cp.active) {
      const a = (Math.sin(game.elapsed * 5) * 0.5 + 0.5) * 0.5;
      fillCircle(x + s * 0.5, base - height, s * 0.7, rgba('#5FD8A0', a));
    }
  }
}

function drawGoal(cam, s) {
  const lv = game.level;
  const x = (lv.goalX - cam) * s;
  const yBase = lv.goalY * s;
  const height = s * 4;
  const locked = game.goalLocked;
  fillRoundRect(x + s * 0.42, yBase - height, s * 0.16, height, s * 0.08, '#BFC7D2');
  fillCircle(x + s * 0.5, yBase - height, s * 0.2, locked ? '#7C8494' : '#FFD84D');
  const wave = locked ? 0 : Math.sin(game.elapsed * 3) * s * 0.12;
  poly([
    [x + s * 0.56, yBase - height + s * 0.15],
    [x + s * 2.0 + wave, yBase - height + s * 0.75],
    [x + s * 0.56, yBase - height + s * 1.35],
  ], locked ? '#6C7280' : '#FF7BA8');
  fillRoundRect(x + s * 0.2, yBase - s * 0.3, s * 0.6, s * 0.3, s * 0.08, '#8C93A1');
  if (locked) {
    const cx = x + s * 1.1;
    const cy = yBase - height + s * 0.75;
    strokeArc(cx - s * 0.16, cy - s * 0.3, s * 0.32, s * 0.32, 180, 180, '#E6E9EF', s * 0.08);
    fillRoundRect(cx - s * 0.22, cy - s * 0.14, s * 0.44, s * 0.36, s * 0.07, '#E6E9EF');
  }
}

// --- アイテム -----------------------------------------------------------
function drawCoin(cx, cy, r, t) {
  const squeeze = Math.max(Math.abs(Math.cos(t * 3.2)), 0.18);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(squeeze, 1); ctx.translate(-cx, -cy);
  fillCircle(cx, cy, r, COIN_C);
  fillCircle(cx, cy, r * 0.84, COIN_A);
  fillCircle(cx - r * 0.22, cy - r * 0.24, r * 0.34, COIN_B);
  ctx.restore();
}
function drawGem(cx, cy, r, t) {
  const squeeze = 0.7 + Math.abs(Math.cos(t * 2.2)) * 0.3;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(squeeze, 1); ctx.translate(-cx, -cy);
  poly([[cx, cy - r], [cx + r * 0.78, cy - r * 0.15], [cx, cy + r], [cx - r * 0.78, cy - r * 0.15]], GEM_A);
  poly([[cx, cy - r], [cx + r * 0.3, cy - r * 0.2], [cx, cy + r * 0.15], [cx - r * 0.3, cy - r * 0.2]], GEM_B);
  ctx.restore();
}
function drawHeart(cx, cy, r) {
  fillCircle(cx - r * 0.42, cy - r * 0.28, r * 0.52, HEART_A);
  fillCircle(cx + r * 0.42, cy - r * 0.28, r * 0.52, HEART_A);
  poly([[cx - r * 0.9, cy - r * 0.16], [cx, cy + r * 0.92], [cx + r * 0.9, cy - r * 0.16]], HEART_A);
  fillCircle(cx - r * 0.42, cy - r * 0.4, r * 0.16, 'rgba(255,255,255,0.75)');
}
function drawStar(cx, cy, r, t) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate((t * 90 * Math.PI) / 180); ctx.translate(-cx, -cy);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poly(pts, STAR_A);
  ctx.restore();
  fillCircle(cx - r * 0.16, cy - r * 0.18, r * 0.14, 'rgba(255,255,255,0.85)');
}
function drawBadge(cx, cy, r, color, t) {
  const glow = (Math.sin(t * 4) * 0.5 + 0.5) * 0.3;
  fillCircle(cx, cy, r * 1.28, rgba(color, 0.35 + glow));
  fillCircle(cx, cy, r, color);
  fillCircle(cx - r * 0.34, cy - r * 0.38, r * 0.3, 'rgba(255,255,255,0.4)');
}

function drawPickupIcon(kind, cx, cy, r, t) {
  switch (kind) {
    case 'COIN': drawCoin(cx, cy, r * 0.88, t); break;
    case 'GEM': drawGem(cx, cy, r, t); break;
    case 'HEART': drawHeart(cx, cy, r); break;
    case 'STAR': drawStar(cx, cy, r * 1.1, t); break;
    case 'DASH':
      drawBadge(cx, cy, r, DASH_A, t);
      poly([
        [cx + r * 0.14, cy - r * 0.52], [cx - r * 0.34, cy + r * 0.08],
        [cx - r * 0.02, cy + r * 0.08], [cx - r * 0.14, cy + r * 0.55],
        [cx + r * 0.36, cy - r * 0.1], [cx + r * 0.03, cy - r * 0.1],
      ], '#FFFFFF');
      break;
    case 'FEATHER':
      drawBadge(cx, cy, r, FEATHER_A, t);
      fillOval(cx - r * 0.3, cy - r * 0.55, r * 0.6, r * 0.95, '#FFFFFF');
      line(cx, cy - r * 0.5, cx, cy + r * 0.55, '#6BAF88', r * 0.1);
      break;
    case 'SHIELD':
      fillCircle(cx, cy, r, rgba(SHIELD_A, 0.45));
      strokeCircle(cx, cy, r, 'rgba(255,255,255,0.9)', r * 0.16);
      fillCircle(cx - r * 0.3, cy - r * 0.34, r * 0.24, 'rgba(255,255,255,0.6)');
      break;
    case 'MAGNET':
      drawBadge(cx, cy, r, MAGNET_A, t);
      strokeArc(cx - r * 0.44, cy - r * 0.3, r * 0.88, r * 0.88, 180, 180, '#FFFFFF', r * 0.26);
      fillRect(cx - r * 0.44, cy + r * 0.14, r * 0.26, r * 0.3, '#FFFFFF');
      fillRect(cx + r * 0.18, cy + r * 0.14, r * 0.26, r * 0.3, '#FFFFFF');
      break;
  }
}

function drawPickups(cam, s) {
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    const cx = (pk.x + 0.5 - cam) * s;
    if (cx < -s || cx > viewW + s) continue;
    const bob = Math.sin(pk.t * 3 + pk.x) * s * 0.08;
    drawPickupIcon(pk.kind, cx, (pk.y + 0.5) * s + bob, s * 0.34, pk.t);
  }
}

function drawPops(cam, s) {
  for (const pop of game.pops) {
    const a = 1 - pop.t / 0.8;
    if (a <= 0) continue;
    const cx = (pop.x - cam) * s;
    const cy = (pop.y + 0.5) * s - pop.t * s * 2.2;
    if (pop.kind) {
      ctx.save();
      ctx.globalAlpha = Math.max(a, 0);
      drawPickupIcon(pop.kind, cx, cy, s * 0.3 * a, pop.t);
      ctx.restore();
    }
    if (pop.text) {
      ctx.save();
      ctx.globalAlpha = Math.max(a, 0);
      shadowText(pop.text, cx, cy - s * 0.5, s * 0.42, '#FFFFFF', s * 0.12);
      ctx.restore();
    }
  }
}

// --- 敵 -----------------------------------------------------------------
function eyes(cx, cy, w, spread, size, look) {
  fillCircle(cx - w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx + w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx - w * spread * 0.85 + look, cy + w * 0.01, w * size * 0.5, INK);
  fillCircle(cx + w * spread * 1.15 + look, cy + w * 0.01, w * size * 0.5, INK);
}

function drawWalker(x, y, w, h, t, right) {
  const cx = x + w / 2;
  const squash = 1 + Math.sin(t * 8) * 0.06;
  const bodyR = w * 0.46;
  const step = Math.sin(t * 8) * w * 0.12;
  fillOval(cx - w * 0.36 + step, y + h * 0.78, w * 0.3, h * 0.24, PUNI_DARK);
  fillOval(cx + w * 0.06 - step, y + h * 0.78, w * 0.3, h * 0.24, PUNI_DARK);
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(1 / squash, squash); ctx.translate(-cx, -(y + h));
  fillCircle(cx, y + h * 0.48, bodyR, PUNI_BODY);
  fillArc(cx - bodyR, y + h * 0.48 - bodyR * 0.1, bodyR * 2, bodyR * 1.1, 0, 180, PUNI_DARK);
  ctx.restore();
  eyes(cx, y + h * 0.4, w, 0.17, 0.15, right ? w * 0.06 : -w * 0.06);
  strokeArc(cx - w * 0.12, y + h * 0.5, w * 0.24, h * 0.14, 20, 140, INK, w * 0.045);
}

function drawSpiky(x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h * 0.52, r = w * 0.4;
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 - 90) * Math.PI) / 180;
    poly([
      [cx + Math.cos(a - 0.28) * r, cy + Math.sin(a - 0.28) * r],
      [cx + Math.cos(a) * r * 1.52, cy + Math.sin(a) * r * 1.52],
      [cx + Math.cos(a + 0.28) * r, cy + Math.sin(a + 0.28) * r],
    ], TOGE_DARK);
  }
  fillCircle(cx, cy, r, TOGE_BODY);
  fillCircle(cx, cy + r * 0.2, r * 0.72, rgba(TOGE_DARK, 0.35));
  eyes(cx, cy - h * 0.04, w, 0.15, 0.14, 0);
  const lw = w * 0.055;
  line(cx - w * 0.28, cy - h * 0.2, cx - w * 0.04, cy - h * 0.11, INK, lw);
  line(cx + w * 0.28, cy - h * 0.2, cx + w * 0.04, cy - h * 0.11, INK, lw);
  strokeArc(cx - w * 0.1, cy + h * 0.16, w * 0.2, h * 0.12, 200, 140, INK, w * 0.04);
  if (Math.sin(t * 6) > 0.9) {
    fillCircle(cx - r * 0.4, cy - r * 0.45, r * 0.3, 'rgba(255,255,255,0.3)');
  }
}

function drawFlyer(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5, r = w * 0.36;
  const flap = Math.abs(Math.sin(t * 9));
  for (const side of [-1, 1]) {
    fillOval(
      cx + side * r * 0.55 - (side < 0 ? r * 0.7 : 0), cy - r * 0.5,
      r * 0.7, r * (0.5 + flap * 0.9), rgba(PATA_DARK, 0.9),
    );
  }
  fillCircle(cx, cy, r, PATA_BODY);
  fillCircle(cx - r * 0.25, cy - r * 0.3, r * 0.55, 'rgba(255,255,255,0.35)');
  eyes(cx, cy - h * 0.02, w, 0.13, 0.13, right ? w * 0.04 : -w * 0.04);
  const bx = cx + (right ? r * 0.85 : -r * 0.85);
  poly([
    [bx, cy + h * 0.02],
    [bx + (right ? r * 0.45 : -r * 0.45), cy + h * 0.09],
    [bx, cy + h * 0.16],
  ], '#FFC24D');
}

function drawJumper(x, y, w, h, t, air) {
  const cx = x + w / 2;
  const stretch = air ? 1.16 : 1 + Math.sin(t * 6) * 0.05;
  const coilTop = y + h * 0.66;
  for (let i = 0; i < 3; i++) {
    strokeArc(cx - w * 0.24, coilTop + h * 0.1 * i, w * 0.48, h * 0.16, 0, 180, PYON_DARK, w * 0.07);
  }
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(1 / stretch, stretch); ctx.translate(-cx, -(y + h));
  ctx.fillStyle = PYON_BODY;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.02);
  ctx.bezierCurveTo(cx + w * 0.52, y + h * 0.22, cx + w * 0.46, y + h * 0.72, cx, y + h * 0.72);
  ctx.bezierCurveTo(cx - w * 0.46, y + h * 0.72, cx - w * 0.52, y + h * 0.22, cx, y + h * 0.02);
  ctx.closePath();
  ctx.fill();
  fillOval(cx - w * 0.2, y + h * 0.42, w * 0.4, h * 0.22, 'rgba(255,255,255,0.4)');
  ctx.restore();
  eyes(cx, y + h * 0.36, w, 0.15, 0.14, 0);
  strokeArc(cx - w * 0.1, y + h * 0.46, w * 0.2, h * 0.12, 20, 140, INK, w * 0.04);
}

function drawChaser(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5, r = w * 0.42;
  for (let i = 0; i < 3; i++) {
    const off = (right ? -1 : 1) * (r * (1.2 + i * 0.35));
    line(
      cx + off, cy - h * 0.16 + i * h * 0.16,
      cx + off - (right ? -1 : 1) * r * 0.5, cy - h * 0.16 + i * h * 0.16,
      rgba(OIKA_DARK, 0.35), h * 0.05,
    );
  }
  const step = Math.sin(t * 16) * w * 0.14;
  fillOval(cx - w * 0.34 + step, y + h * 0.76, w * 0.28, h * 0.26, OIKA_DARK);
  fillOval(cx + w * 0.06 - step, y + h * 0.76, w * 0.28, h * 0.26, OIKA_DARK);
  fillCircle(cx, cy, r, OIKA_BODY);
  const lw = w * 0.06;
  line(cx - w * 0.3, cy - h * 0.3, cx - w * 0.06, cy - h * 0.18, INK, lw);
  line(cx + w * 0.3, cy - h * 0.3, cx + w * 0.06, cy - h * 0.18, INK, lw);
  eyes(cx, cy - h * 0.02, w, 0.15, 0.14, right ? w * 0.05 : -w * 0.05);
  strokeArc(cx - w * 0.12, cy + h * 0.18, w * 0.24, h * 0.13, 200, 140, INK, w * 0.045);
}

function drawBoss(x, y, w, h, t, right, hp) {
  const cx = x + w / 2, cy = y + h * 0.54, r = w * 0.4;
  const breathe = 1 + Math.sin(t * 3) * 0.04;
  const step = Math.sin(t * 7) * w * 0.08;
  fillOval(cx - w * 0.32 + step, y + h * 0.82, w * 0.26, h * 0.2, BOSS_DARK);
  fillOval(cx + w * 0.06 - step, y + h * 0.82, w * 0.26, h * 0.2, BOSS_DARK);
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(breathe, breathe); ctx.translate(-cx, -(y + h));
  fillCircle(cx, cy, r, BOSS_BODY);
  fillCircle(cx, cy + r * 0.25, r * 0.7, rgba(BOSS_DARK, 0.4));
  for (const side of [-1, 1]) {
    poly([
      [cx + side * r * 0.62, cy - r * 0.6],
      [cx + side * r * 1.05, cy - r * 1.4],
      [cx + side * r * 0.24, cy - r * 0.95],
    ], BOSS_DARK);
  }
  poly([
    [cx - r * 0.5, cy - r * 0.82], [cx - r * 0.5, cy - r * 1.3], [cx - r * 0.22, cy - r * 1.02],
    [cx, cy - r * 1.45], [cx + r * 0.22, cy - r * 1.02], [cx + r * 0.5, cy - r * 1.3],
    [cx + r * 0.5, cy - r * 0.82],
  ], '#FFD34D');
  ctx.restore();
  eyes(cx, cy - h * 0.04, w, 0.13, 0.11, right ? w * 0.03 : -w * 0.03);
  fillArc(cx - w * 0.16, cy + h * 0.1, w * 0.32, h * 0.18, 200, 140, INK);
  for (let i = 0; i < 3; i++) {
    const fx = cx - w * 0.11 + i * w * 0.11;
    const tr = w * 0.035;
    poly([[fx, cy + h * 0.15 + tr], [fx - tr, cy + h * 0.15 - tr], [fx + tr, cy + h * 0.15 - tr]], '#FFFFFF');
  }
  for (let i = 0; i < BOSS_HP; i++) {
    fillCircle(
      cx - w * 0.12 + i * w * 0.12, y - h * 0.16, w * 0.055,
      i < hp ? '#FF6B8A' : 'rgba(255,255,255,0.33)',
    );
  }
}

const DON_BODY = '#D9A566', DON_CAP = '#7A5334';

/** どんぐり。落ちてくるまでは宙にぶら下がっている。 */
function drawDropper(x, y, w, h, t, hanging) {
  const cx = x + w / 2;
  if (hanging) {
    // ぶら下がっている糸。見上げないと気づかない。
    line(cx, y - h * 1.4, cx, y + h * 0.1, 'rgba(255,255,255,0.6)', w * 0.04);
  }
  const sway = hanging ? Math.sin(t * 2.2) * w * 0.05 : 0;
  const cxs = cx + sway;
  fillOval(cxs - w * 0.36, y + h * 0.22, w * 0.72, h * 0.74, DON_BODY);
  fillArc(cxs - w * 0.42, y + h * 0.02, w * 0.84, h * 0.5, 180, 180, DON_CAP);
  fillRoundRect(cxs - w * 0.05, y - h * 0.1, w * 0.1, h * 0.16, w * 0.05, DON_CAP);
  const eyeY = y + h * 0.52;
  if (hanging) {
    eyes(cxs, eyeY, w, 0.14, 0.12, 0);
    strokeArc(cxs - w * 0.08, y + h * 0.62, w * 0.16, h * 0.1, 20, 140, INK, w * 0.04);
  } else {
    // 落下中はあわてた顔
    fillCircle(cxs - w * 0.15, eyeY, w * 0.14, '#FFFFFF');
    fillCircle(cxs + w * 0.15, eyeY, w * 0.14, '#FFFFFF');
    fillCircle(cxs - w * 0.15, eyeY, w * 0.05, INK);
    fillCircle(cxs + w * 0.15, eyeY, w * 0.05, INK);
    fillOval(cxs - w * 0.07, y + h * 0.66, w * 0.14, h * 0.14, INK);
  }
}

const ENEMY_BODY = {
  WALKER: PUNI_BODY, SPIKY: TOGE_BODY, FLYER: PATA_BODY,
  JUMPER: PYON_BODY, CHASER: OIKA_BODY, DROPPER: DON_BODY, BOSS: BOSS_BODY,
};

function drawEnemies(cam, s) {
  for (const e of game.enemies) {
    const x = (e.x - cam) * s;
    if (x < -3 * s || x > viewW + 3 * s) continue;
    const y = e.y * s, w = e.w * s, h = e.h * s;
    if (!e.alive) {
      const k = clamp(1 - e.squashT / 0.7, 0, 1);
      fillOval(x - w * 0.1, y + h * 0.66, w * 1.2, h * 0.34 * k, rgba(ENEMY_BODY[e.kind], k));
      continue;
    }
    if (e.invulnT > 0 && Math.sin(e.t * 40) < 0) continue;
    switch (e.kind) {
      case 'WALKER': drawWalker(x, y, w, h, e.t, e.vx > 0); break;
      case 'SPIKY': drawSpiky(x, y, w, h, e.t); break;
      case 'FLYER': drawFlyer(x, y, w, h, e.t, e.vx > 0); break;
      case 'JUMPER': drawJumper(x, y, w, h, e.t, e.vy !== 0); break;
      case 'CHASER': drawChaser(x, y, w, h, e.t, e.vx > 0); break;
      case 'DROPPER': drawDropper(x, y, w, h, e.t, !e.dropped); break;
      case 'BOSS': drawBoss(x, y, w, h, e.t, e.vx > 0, e.hp); break;
    }
  }
}

// --- 主人公 -------------------------------------------------------------
function rinaSprite(x, y, w, h, faceRight, stepPhase, stretch, body, dark) {
  const cx = x + w / 2;
  fillOval(cx - w * 0.4 + stepPhase * w * 0.14, y + h * 0.8, w * 0.34, h * 0.2, RINA_FOOT);
  fillOval(cx + w * 0.06 - stepPhase * w * 0.14, y + h * 0.8, w * 0.34, h * 0.2, RINA_FOOT);
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(1 / stretch, stretch); ctx.translate(-cx, -(y + h));
  fillCircle(cx - w * 0.32, y + h * 0.15, w * 0.19, body);
  fillCircle(cx + w * 0.32, y + h * 0.15, w * 0.19, body);
  fillCircle(cx - w * 0.32, y + h * 0.16, w * 0.1, rgba(dark, 0.55));
  fillCircle(cx + w * 0.32, y + h * 0.16, w * 0.1, rgba(dark, 0.55));
  fillRoundRect(cx - w * 0.46, y + h * 0.16, w * 0.92, h * 0.68, Math.min(w * 0.42, h * 0.36), body);
  fillOval(cx - w * 0.24, y + h * 0.48, w * 0.48, h * 0.3, 'rgba(255,255,255,0.55)');
  fillCircle(cx - w * 0.31, y + h * 0.45, w * 0.11, rgba(CHEEK, 0.55));
  fillCircle(cx + w * 0.31, y + h * 0.45, w * 0.11, rgba(CHEEK, 0.55));
  const ex = faceRight ? w * 0.05 : -w * 0.05;
  fillCircle(cx - w * 0.17 + ex, y + h * 0.36, w * 0.16, '#FFFFFF');
  fillCircle(cx + w * 0.17 + ex, y + h * 0.36, w * 0.16, '#FFFFFF');
  fillCircle(cx - w * 0.15 + ex, y + h * 0.375, w * 0.085, INK);
  fillCircle(cx + w * 0.19 + ex, y + h * 0.375, w * 0.085, INK);
  fillCircle(cx - w * 0.17 + ex, y + h * 0.35, w * 0.03, '#FFFFFF');
  fillCircle(cx + w * 0.17 + ex, y + h * 0.35, w * 0.03, '#FFFFFF');
  strokeArc(cx - w * 0.1 + ex, y + h * 0.45, w * 0.2, h * 0.12, 15, 150, INK, w * 0.04);
  ctx.restore();
}

function drawPlayer(cam, s) {
  const p = game.player;
  // 当たり判定より少し大きく描く。足元と中心を合わせて、地面から浮かせない。
  const hitW = PLAYER_W * s;
  const hitH = PLAYER_H * s;
  const w = hitW * PLAYER_DRAW_SCALE;
  const h = hitH * PLAYER_DRAW_SCALE;
  const x = (p.x - cam) * s - (w - hitW) / 2;
  const y = p.y * s - (h - hitH);
  const cx = x + w / 2;

  const star = p.starT > 0;
  let body = RINA_BODY, dark = RINA_DARK;
  if (star) {
    const k = Math.sin(p.animT * 18) * 0.5 + 0.5;
    const g = Math.round((0.55 + 0.35 * k) * 255);
    const b = Math.round((0.35 + 0.55 * (1 - k)) * 255);
    body = `rgb(255,${g},${b})`;
    dark = `rgba(255,${g},${b},0.65)`;
  }

  if (p.dashT > 0 && Math.abs(p.vx) > 0.1) {
    for (let i = 1; i <= 3; i++) {
      const off = (p.faceRight ? -1 : 1) * w * 0.35 * i;
      ctx.save();
      ctx.globalAlpha = 0.16 / i;
      fillRoundRect(cx - w * 0.46 + off, y + h * 0.16, w * 0.92, h * 0.68, Math.min(w * 0.42, h * 0.36), body);
      ctx.restore();
    }
  }

  if (p.hurtT > 0 && !star && Math.sin(p.animT * 40) < 0) return;

  const moving = game.phase === 'PLAYING' && (game.inputLeft || game.inputRight) && p.onGround;
  const stepPhase = moving ? Math.sin(p.animT * 13) : 0;
  const air = !p.onGround;
  const stretch = air ? clamp(1 + p.vy / 60, 0.86, 1.16) : 1 + Math.sin(p.animT * 13) * 0.03;

  if (p.featherT > 0) {
    const flap = Math.abs(Math.sin(p.animT * (air ? 14 : 5)));
    for (const side of [-1, 1]) {
      fillOval(
        cx + side * w * 0.42 - (side < 0 ? w * 0.32 : 0), y + h * 0.2,
        w * 0.32, h * (0.28 + flap * 0.3), 'rgba(239,255,244,0.95)',
      );
    }
  }

  rinaSprite(x, y, w, h, p.faceRight, stepPhase, stretch, body, dark);

  if (star) {
    const a = (Math.sin(p.animT * 12) * 0.5 + 0.5) * 0.5;
    fillCircle(cx, y + h * 0.5, w * 0.8, rgba(STAR_A, a));
  }
  if (p.hasShield) {
    const a = 0.35 + (Math.sin(p.animT * 5) * 0.5 + 0.5) * 0.25;
    fillCircle(cx, y + h * 0.5, w * 0.95, rgba(SHIELD_A, a * 0.5));
    strokeCircle(cx, y + h * 0.5, w * 0.95, rgba(SHIELD_A, Math.min(a + 0.3, 1)), w * 0.07);
  }
  if (p.magnetT > 0) {
    const a = (Math.sin(p.animT * 6) * 0.5 + 0.5) * 0.25;
    strokeCircle(cx, y + h * 0.5, MAGNET_RANGE * s, rgba(MAGNET_A, a), s * 0.06);
  }
}
