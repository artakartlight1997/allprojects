'use strict';
// 絵。ぜんぶ canvas に その場で かく（画像ファイルは 1つも つかわない）。
//
// おる … ペルシャねこ。全身グレーで、下半身だけ 毛が ない（サマーカット）。
//        目は 大きくて まんまる。ぶきっちょな 顔。
// リノ … 毛の みじかい ふつうの ねこ。白に 茶色が ところどころ。
//        いつも しっぽを 立てて ごきげん。

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });

const game = new Game();
let uiScale = save.btn;
let viewW = 0, viewH = 0;

const ui = {
  left: null, right: null, up: null, down: null, jump: null, fire: null,
  overlayBtn: null, sizeBtns: [], stageBtns: [], fsBtn: null, hubBtn: null, endBtn: null,
};

// --- 色 -------------------------------------------------------------------
// おる（ペルシャねこ・グレー・下半身は 毛なし）
const ORU_FUR = '#ABABB8', ORU_FUR_D = '#8B8B99', ORU_FUR_L = '#CFCFDA';
const ORU_SKIN = '#E6C6C6', ORU_SKIN_D = '#C9A5A5';
const ORU_NOSE = '#FF9AB0';
// リノ（白に 茶色）
const RINO_FUR = '#FFFFFF', RINO_FUR_D = '#E0DCD4', RINO_BROWN = '#C98A50';
const INK = '#3A3040', CHEEK = '#FF9AB8';
// てき
const DOG_BODY = '#D9B37A', DOG_DARK = '#B08A4E';
const BIGDOG_BODY = '#8C7A6A', BIGDOG_DARK = '#645446';
const CROW_BODY = '#4A4458', CROW_DARK = '#2E2A3A';
const BEE_BODY = '#FFD24A', BEE_DARK = '#3A3040';
const GRASS_BODY = '#7ADC80', GRASS_DARK = '#4FA85A';
const FROG_BODY = '#5FD1A0', FROG_DARK = '#3AA77A';
const SEMI_BODY = '#9A8A6A', SEMI_DARK = '#6A5C44';
const GHOST_BODY = '#EDE4FF', GHOST_DARK = '#B9A9D8';
const ROBO_BODY = '#C4C8D4', ROBO_DARK = '#7C8496';
const MINION_BODY = '#FFB3D0', MINION_DARK = '#E07FA6';
// アイテム
const CHURU_A = '#FF9A5A', CHURU_B = '#FFD0A8', CHURU_C = '#E06A2A';
const KARI_A = '#C98A50', KARI_B = '#8A5A2A';
const MATATABI_A = '#9AE06A', MATATABI_B = '#5FA83A';
const STAR_A = '#FFE066';
const FUWA_A = '#B2F5C4', NIOI_A = '#FF7A7A';
// 人（りな・まり・あーたん・くーたん）
const SKIN = '#F6CDA8', SKIN_D = '#E0AE84', HAIR = '#4A3A44';
const RINA_DRESS = '#FF9EC4', RINA_DRESS_D = '#E979AC';
const MARI_DRESS = '#C8A8F0', MARI_DRESS_D = '#8A64B0';

// --- テーマ ---------------------------------------------------------------
// bg: 背景の 描きかた（HILL 丘 / ROOM 部屋 / SEA 海 / SPACE 宇宙 /
//     ART 絵の具 / TOWER てっこつ / CANDY おかし）
function pal(bg, skyTop, skyBottom, backC, frontC, dirt, dirtDark, surface,
  platform, cloud, cloudA, hazard, hazardBase, night) {
  return { bg, skyTop, skyBottom, hillBack: backC, hillFront: frontC, dirt, dirtDark,
    surface, platform, cloud, cloudA, hazard, hazardBase, night };
}

const PALETTES = {
  HOME: pal('ROOM', '#FFE6CC', '#FFD4B8', '#E8B98F', '#D9A06E', '#C08A54', '#98673A',
    '#E0A96B', '#D9B37A', '#FFFFFF', 0.4, '#8AD8F0', '#4A8AA0', false),
  YARD: pal('HILL', '#8FD9F0', '#DFF6FF', '#A8E098', '#7ACB6A', '#B5793F', '#8E5A2B',
    '#7ACB6A', '#CE9A5E', '#FFFFFF', 0.75, '#8AD8F0', '#4A8AA0', false),
  PARK: pal('HILL', '#7EC8F5', '#E4F6D8', '#9AD98C', '#6FC162', '#C08A54', '#98673A',
    '#8ACF74', '#CE9A5E', '#FFFFFF', 0.8, '#8AD8F0', '#4A8AA0', false),
  ROOF: pal('TOWER', '#9AC8F0', '#DCEEFF', '#7A96B8', '#5A7A9C', '#B06A5A', '#84483C',
    '#D08A6A', '#C07A5A', '#FFFFFF', 0.7, '#8AD8F0', '#4A8AA0', false),
  SHOP: pal('TOWER', '#FFD9A8', '#FFF0D8', '#E8A86A', '#C8834A', '#B08A5E', '#8A6640',
    '#D9A868', '#C89858', '#FFFFFF', 0.6, '#8AD8F0', '#4A8AA0', false),
  VET: pal('ROOM', '#DFF2F5', '#F4FBFC', '#BCDCE4', '#9AC4CE', '#B8C4C8', '#8E9CA0',
    '#D4E4E8', '#C0D0D4', '#FFFFFF', 0.4, '#FF8A8A', '#C85A5A', false),
  SUNSET: pal('TOWER', '#FF9A5A', '#FFD9A8', '#C87A5A', '#96543A', '#B06A5A', '#84483C',
    '#D08A6A', '#C07A5A', '#FFE0C0', 0.5, '#8AD8F0', '#4A8AA0', false),
  NIGHTPARK: pal('HILL', '#1A2044', '#3E4A80', '#26365A', '#1A2842', '#4C4E85', '#34365F',
    '#4E7A5E', '#6567A8', '#C6C9FF', 0.3, '#8AD8F0', '#4A8AA0', true),
  RINAHOME: pal('ROOM', '#FFDCEC', '#FFF0F6', '#F0B8D0', '#DC98B8', '#C08A74', '#98675A',
    '#E0A98B', '#D9B39A', '#FFFFFF', 0.4, '#8AD8F0', '#4A8AA0', false),
  HOMEWAY: pal('TOWER', '#2E2A50', '#6A5A8C', '#3E3A62', '#2A2648', '#7A6A88', '#574A63',
    '#9C89AD', '#8A7799', '#E0C8FF', 0.35, '#8AD8F0', '#4A8AA0', true),
  // どかんの さきの ゆかした
  UNDER: pal('CAVE', '#241B3D', '#3E2C58', '#3A2B57', '#2C2043', '#6B5A8A', '#4A3D63',
    '#8E79B5', '#7C6AA0', '#B79CFF', 0.2, '#8AD8F0', '#4A8AA0', true),
};
function paletteOf(theme) { return PALETTES[theme] || PALETTES.HOME; }

// --- 描画ヘルパ -----------------------------------------------------------
const FONT_STACK = 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
function setFont(px) { ctx.font = `700 ${px}px ${FONT_STACK}`; }
function fillCircle(cx, cy, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 0), 0, Math.PI * 2); ctx.fill();
}
function strokeCircle(cx, cy, r, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 0), 0, Math.PI * 2); ctx.stroke();
}
function fillOval(x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
}
function rectPath(x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function fillRoundRect(x, y, w, h, r, color) { ctx.fillStyle = color; rectPath(x, y, w, h, r); ctx.fill(); }
function fillRect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function arcPath(x, y, w, h, startDeg, sweepDeg, useCenter) {
  const cx = x + w / 2, cy = y + h / 2;
  const s = (startDeg * Math.PI) / 180, e = ((startDeg + sweepDeg) * Math.PI) / 180;
  ctx.beginPath();
  if (useCenter) ctx.moveTo(cx, cy);
  ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, s, e, sweepDeg < 0);
  if (useCenter) ctx.closePath();
}
function strokeArc(x, y, w, h, st, sw, color, lw) {
  arcPath(x, y, w, h, st, sw, false);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
function fillArc(x, y, w, h, st, sw, color) { arcPath(x, y, w, h, st, sw, true); ctx.fillStyle = color; ctx.fill(); }
function poly(points, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath(); ctx.fill();
}
function line(x1, y1, x2, y2, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function shadowText(text, x, y, px, color, blur) {
  setFont(px); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = blur || px * 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
function starPoly(cx, cy, r, n, inner, color, rot) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180 + (rot || 0);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poly(pts, color);
}

// --- 背景 -----------------------------------------------------------------
function drawBackground(p, cam, camY, s) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, p.skyTop); g.addColorStop(1, p.skyBottom);
  fillRect(0, 0, viewW, viewH, g);
  const t = game.elapsed;
  const shift = -cam * s * 0.22;
  const yShift = camY * s * 0.2;

  if (p.bg === 'ROOM') {
    // 部屋。かべ紙の しま と 大きな まど。
    const stripe = s * 1.4;
    for (let i = -1; i * stripe + (shift % (stripe * 2)) < viewW + stripe; i++) {
      const x = i * stripe * 2 + (shift % (stripe * 2));
      fillRect(x, 0, stripe, viewH, 'rgba(255,255,255,0.16)');
    }
    for (let i = 0; i < 4; i++) {
      const x = ((i * 12 * s + shift) % (viewW + 14 * s)) - 4 * s;
      const y = viewH * 0.16 + yShift;
      fillRoundRect(x, y, s * 4.2, s * 3.2, s * 0.2, 'rgba(255,255,255,0.5)');
      fillRoundRect(x + s * 0.2, y + s * 0.2, s * 3.8, s * 2.8, s * 0.14, 'rgba(150,215,255,0.75)');
      line(x + s * 2.1, y + s * 0.2, x + s * 2.1, y + s * 3.0, 'rgba(255,255,255,0.7)', s * 0.1);
      line(x + s * 0.2, y + s * 1.6, x + s * 4.0, y + s * 1.6, 'rgba(255,255,255,0.7)', s * 0.1);
    }
  } else if (p.bg === 'SEA') {
    for (let i = 0; i < 26; i++) {
      const bx = ((i * 5.3 * s + shift * 0.6) % (viewW + 3 * s)) - s;
      const by = viewH - ((t * (28 + (i % 5) * 12) + i * 90) % (viewH + 120));
      fillCircle(bx, by, s * (0.08 + (i % 3) * 0.05), 'rgba(255,255,255,0.35)');
    }
    for (let i = 0; i < 10; i++) {
      const x = ((i * 7 * s + shift * 1.4) % (viewW + 6 * s)) - 3 * s;
      const h = s * (2.4 + (i % 3));
      const sway = Math.sin(t * 1.2 + i) * s * 0.4;
      for (let k = 0; k < 4; k++) {
        fillOval(x + sway * (k / 4) - s * 0.22, viewH - h * (k + 1) / 4 - s * 0.4,
          s * 0.44, h * 0.4, 'rgba(60,150,120,0.35)');
      }
    }
  } else if (p.bg === 'SPACE') {
    for (let i = 0; i < 80; i++) {
      // ばらばらに 見えるように、じゅんばんを かきまぜてから ならべる
      const h1 = (i * 2654435761) % 1000, h2 = (i * 40503 + 1013904223) % 997;
      const x = (h1 / 1000) * viewW + shift * 0.3;
      const xx = ((x % (viewW + 20)) + viewW + 20) % (viewW + 20) - 10;
      const y = (h2 / 997) * viewH;
      const tw = Math.sin(t * 2.4 + i) * 0.5 + 0.5;
      fillCircle(xx, y, s * 0.03 * (1 + (i % 3)), `rgba(255,255,255,${0.2 + tw * 0.5})`);
    }
    for (let i = 0; i < 3; i++) {
      const x = ((i * 17 * s + shift * 0.7) % (viewW + 14 * s)) - 7 * s;
      const y = viewH * (0.12 + i * 0.1) + yShift;
      const r = s * (0.9 + i * 0.35);
      const c = ['#8A6ACC', '#4A8AC0', '#C87A96'][i];
      fillCircle(x, y, r, rgba(c, 0.55));
      fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4, 'rgba(255,255,255,0.14)');
      ctx.save();
      ctx.translate(x, y); ctx.rotate(-0.4);
      strokeCircle(0, 0, r * 1.6, 'rgba(255,255,255,0.16)', s * 0.05);
      ctx.restore();
    }
  } else if (p.bg === 'CAVE') {
    // ちかの へや。上下から とがった 岩、おくに ひかる 石。
    for (let i = 0; i < 16; i++) {
      const x = ((i * 6.5 * s + shift * 1.2) % (viewW + 6 * s)) - 3 * s;
      const h = s * (1.0 + ((i * 29) % 4) * 0.5);
      poly([[x - s * 0.5, 0], [x + s * 0.5, 0], [x, h]], rgba(p.hillFront, 0.85));
      poly([[x + s * 2 - s * 0.45, viewH], [x + s * 2 + s * 0.45, viewH],
        [x + s * 2, viewH - h * 0.8]], rgba(p.hillFront, 0.85));
    }
    for (let i = 0; i < 10; i++) {
      const x = ((i * 11 * s + shift * 0.8) % (viewW + 8 * s)) - 4 * s;
      const y = viewH * (0.24 + ((i * 17) % 5) * 0.1) + yShift;
      const g2 = Math.sin(t * 2 + i) * 0.5 + 0.5;
      starPoly(x, y, s * 0.22, 4, 0.35, `rgba(180,220,255,${0.25 + g2 * 0.35})`, 0);
    }
  } else if (p.bg === 'ART') {
    for (let i = 0; i < 16; i++) {
      const x = ((i * 8.5 * s + shift) % (viewW + 8 * s)) - 4 * s;
      const y = viewH * (0.1 + ((i * 37) % 60) / 100) + yShift;
      const r = s * (0.8 + ((i * 13) % 5) * 0.24);
      const cols = ['#FF6FA8', '#FFD24A', '#7ADCB0', '#8AD8F0', '#C88AF0', '#FF8A3A'];
      const c = cols[i % cols.length];
      fillCircle(x, y, r, rgba(c, 0.28));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        fillCircle(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, r * 0.28, rgba(c, 0.22));
      }
    }
  } else if (p.bg === 'TOWER') {
    for (let layer = 0; layer < 2; layer++) {
      const c = layer === 0 ? p.hillBack : p.hillFront;
      const step = s * (layer === 0 ? 4.5 : 3.2);
      const sh = shift * (layer === 0 ? 0.6 : 1);
      for (let i = -1; i * step + (sh % step) < viewW + step; i++) {
        const x = i * step + (sh % step);
        const h = viewH * (layer === 0 ? 0.32 : 0.24) + ((i * 53) % 5) * s * 0.5;
        fillRect(x, viewH - h, step * 0.82, h, c);
        for (let wy = 0; wy < 5; wy++) {
          for (let wx = 0; wx < 2; wx++) {
            fillRect(x + step * (0.14 + wx * 0.36), viewH - h + s * (0.4 + wy * 0.8),
              step * 0.2, s * 0.34, ((i + wy + wx) % 3 === 0) ? 'rgba(255,220,140,0.5)' : 'rgba(255,255,255,0.08)');
          }
        }
      }
    }
  } else if (p.bg === 'CANDY') {
    for (let i = 0; i < 12; i++) {
      const x = ((i * 9 * s + shift) % (viewW + 9 * s)) - 4 * s;
      const y = viewH * 0.72 + yShift * 0.5;
      fillCircle(x, y + s * 1.6, s * 2.6, rgba(p.hillBack, 0.9));
      fillCircle(x + s * 1.2, y + s * 1.9, s * 2.0, rgba(p.hillFront, 0.9));
    }
    for (let i = 0; i < 8; i++) {
      const x = ((i * 11 * s + shift * 0.7) % (viewW + 8 * s)) - 3 * s;
      const y = viewH * (0.12 + (i % 3) * 0.09) + yShift;
      fillCircle(x, y, s * 0.5, 'rgba(255,255,255,0.65)');
      fillCircle(x + s * 0.42, y + s * 0.1, s * 0.36, 'rgba(255,255,255,0.55)');
    }
  } else {
    // HILL
    for (let i = 0; i < 14; i++) {
      const bx = i * 9 * s + shift;
      const x = (((bx % (viewW + 6 * s)) + viewW + 6 * s) % (viewW + 6 * s)) - 3 * s;
      const y = viewH * (0.1 + 0.07 * ((i * 7) % 5)) + yShift;
      const r = s * (0.55 + 0.12 * ((i * 3) % 4));
      const c = rgba(p.cloud, p.cloudA);
      fillCircle(x, y, r, c);
      fillCircle(x + r, y + r * 0.2, r * 0.8, c);
      fillCircle(x - r, y + r * 0.25, r * 0.7, c);
    }
    const hillShift = -cam * s * 0.4;
    for (let layer = 0; layer < 2; layer++) {
      const color = layer === 0 ? p.hillBack : p.hillFront;
      const baseY = viewH * (layer === 0 ? 0.7 : 0.8) + yShift * 0.4;
      const r = s * (layer === 0 ? 3.4 : 2.6);
      const step = r * 1.5;
      const sh = hillShift * (layer === 0 ? 0.6 : 1);
      const first = Math.floor((-sh - step) / step);
      const last = Math.ceil((viewW - sh + step) / step);
      for (let i = first; i <= last; i++) fillCircle(i * step + sh, baseY + r * 0.55, r, color);
      fillRect(0, baseY + r * 0.5, viewW, viewH, color);
    }
  }
  if (p.night && p.bg !== 'SPACE') {
    for (let i = 0; i < 34; i++) {
      const x = (((i * 137) % 100) / 100) * viewW;
      const y = (((i * 89) % 55) / 100) * viewH;
      fillCircle(x, y, s * 0.04 * (1 + (i % 3)), 'rgba(255,255,255,0.55)');
    }
  }
}

// --- タイル ---------------------------------------------------------------
function drawTiles(p, cam, camY, s) {
  const ar = game.area;
  const first = Math.max(Math.floor(cam) - 1, 0);
  const last = Math.min(Math.floor(cam + viewW / s + 2), ar.width - 1);
  const rowTop = Math.max(Math.floor(camY) - 1, 0);
  const rowBot = Math.min(Math.floor(camY + viewH / s + 2), ar.height - 1);
  const lava = ar.theme === 'DRAGON' || ar.theme === 'CASTLE' || ar.theme === 'FACTORY';
  const t = game.elapsed;

  for (let ty = rowTop; ty <= rowBot; ty++) {
    for (let tx = first; tx <= last; tx++) {
      const c = ar.tiles[ty][tx];
      if (c === '.') continue;
      const x = (tx - cam) * s;
      const y = (ty - camY) * s;
      if (c === '#') {
        const open = ty === 0 || ar.tiles[ty - 1][tx] !== '#';
        fillRect(x, y, s + 0.5, s + 0.5, p.dirt);
        fillRect(x, y + s * 0.82, s + 0.5, s * 0.18, p.dirtDark);
        if (open) {
          fillRect(x, y, s + 0.5, s * 0.3, p.surface);
          fillCircle(x + s * 0.25, y + s * 0.3, s * 0.16, p.surface);
          fillCircle(x + s * 0.7, y + s * 0.31, s * 0.13, p.surface);
        } else {
          fillCircle(x + s * 0.3, y + s * 0.4, s * 0.09, rgba(p.dirtDark, 0.5));
        }
      } else if (c === '=') {
        fillRoundRect(x, y, s, s * 0.62, s * 0.18, p.platform);
        fillRect(x, y, s, s * 0.2, p.surface);
      } else if (c === '?') {
        const bob = Math.sin(t * 3 + tx) * s * 0.02;
        fillRoundRect(x + s * 0.03, y + s * 0.03 + bob, s * 0.94, s * 0.94, s * 0.16, '#F6C445');
        fillRoundRect(x + s * 0.14, y + s * 0.14 + bob, s * 0.72, s * 0.72, s * 0.12, '#FFE08A');
        strokeArc(x + s * 0.32, y + s * 0.22 + bob, s * 0.36, s * 0.34, 160, 250, '#B07714', s * 0.1);
        fillCircle(x + s * 0.5, y + s * 0.72 + bob, s * 0.06, '#B07714');
      } else if (c === '!') {
        // アイテムブロック。？より 目立つ ピンク。
        const glow = Math.sin(t * 5 + tx) * 0.5 + 0.5;
        fillRoundRect(x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.16, '#FF7BA8');
        fillRoundRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72, s * 0.12, rgba('#FFD0E2', 0.7 + glow * 0.3));
        starPoly(x + s * 0.5, y + s * 0.5, s * 0.26, 5, 0.45, '#FFFFFF', t * 1.5);
      } else if (c === 'X') {
        fillRoundRect(x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.16, '#9A7B52');
        fillRoundRect(x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.68, s * 0.1, '#7E6342');
      } else if (c === 'N') {
        fillRect(x, y, s + 0.5, s + 0.5, '#C4744A');
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, s * 0.035);
        for (let r = 0; r < 2; r++) {
          const yy = y + s * (0.5 * r + 0.5);
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + s, yy); ctx.stroke();
          const xx = x + (r % 2 ? s * 0.25 : s * 0.75);
          ctx.beginPath(); ctx.moveTo(xx, yy - s * 0.5); ctx.lineTo(xx, yy); ctx.stroke();
        }
        fillRect(x, y, s + 0.5, s * 0.1, 'rgba(255,255,255,0.28)');
      } else if (c === 's') {
        if (lava) {
          fillRect(x, y, s + 0.5, s + 0.5, p.hazardBase);
          const wob = Math.sin(t * 3 + tx) * s * 0.06;
          fillRect(x, y + s * 0.1 + wob, s + 0.5, s * 0.9, p.hazard);
          fillCircle(x + s * 0.3, y + s * 0.35 + wob, s * 0.1, 'rgba(255,255,255,0.35)');
        } else {
          for (let i = 0; i < 3; i++) {
            const bx = x + (s * i) / 3;
            poly([[bx, y + s], [bx + s / 6, y + s * 0.16], [bx + s / 3, y + s]], p.hazard);
          }
          fillRect(x, y + s * 0.86, s + 0.5, s * 0.14, p.hazardBase);
        }
      } else if (c === 'F') {
        const cr = game.crumbleAt(tx, ty);
        const shake = cr && cr.state === 1 ? Math.sin(t * 60) * s * 0.05 : 0;
        fillRoundRect(x + shake, y, s, s * 0.6, s * 0.14, '#B9A489');
        fillRect(x + shake, y, s, s * 0.16, '#D6C6AC');
        const lw = cr && cr.state === 1 ? s * 0.06 : s * 0.04;
        line(x + shake + s * 0.3, y, x + shake + s * 0.42, y + s * 0.6, '#6E5F4B', lw);
        line(x + shake + s * 0.72, y, x + shake + s * 0.6, y + s * 0.6, '#6E5F4B', lw);
      } else if (c === 'T') {
        const tr = game.trapAt.get(ty * ar.width + tx);
        let out = 0;
        if (tr && tr.state === 2) out = 1;
        else if (tr && tr.state === 1) out = clamp(tr.t / TRAP_WARN, 0, 1) * 0.35;
        if (out > 0.02) {
          for (let i = 0; i < 3; i++) {
            const bx = x + (s * i) / 3;
            poly([[bx, y + s], [bx + s / 6, y + s * (1 - 0.82 * out)], [bx + s / 3, y + s]], p.hazard);
          }
        }
        fillRect(x, y + s * 0.88, s, s * 0.12, rgba(p.hazardBase, 0.9));
        for (let i = 0; i < 3; i++) {
          fillCircle(x + s * (0.17 + i * 0.33), y + s * 0.93, s * 0.035, rgba(p.hazard, 0.55));
        }
      } else if (c === '^') {
        const squish = Math.sin(t * 4 + tx) * s * 0.03;
        fillRect(x + s * 0.2, y + s * 0.6, s * 0.6, s * 0.4, '#6E6E86');
        for (let i = 0; i < 3; i++) fillRect(x + s * 0.18, y + s * (0.62 + i * 0.12), s * 0.64, s * 0.05, '#9C9CB8');
        fillRoundRect(x + s * 0.02, y + s * 0.28 + squish, s * 0.96, s * 0.34, s * 0.17, '#3ED17E');
        fillRoundRect(x + s * 0.1, y + s * 0.32 + squish, s * 0.8, s * 0.12, s * 0.06, '#8CF0B6');
      } else if (c === 'H') {
        // はしご
        fillRect(x + s * 0.16, y, s * 0.1, s + 0.5, '#C89A5E');
        fillRect(x + s * 0.74, y, s * 0.1, s + 0.5, '#C89A5E');
        fillRect(x + s * 0.16, y + s * 0.24, s * 0.68, s * 0.12, '#E8BE7E');
        fillRect(x + s * 0.16, y + s * 0.68, s * 0.68, s * 0.12, '#E8BE7E');
      } else if (c === '>' || c === '<') {
        fillRect(x, y, s + 0.5, s * 0.86, '#4A4A5E');
        fillRect(x, y, s + 0.5, s * 0.16, '#8A8AA0');
        const dir = c === '>' ? 1 : -1;
        const off = ((t * 5 * dir) % 1 + 1) % 1;
        for (let i = -1; i <= 1; i++) {
          const cx = x + ((i + off) * s * 0.5 + s * 0.5);
          if (cx < x - s * 0.1 || cx > x + s * 1.1) continue;
          poly([[cx - s * 0.1 * dir, y + s * 0.28], [cx + s * 0.12 * dir, y + s * 0.44],
            [cx - s * 0.1 * dir, y + s * 0.6]], '#FFD24A');
        }
        fillRect(x, y + s * 0.86, s + 0.5, s * 0.14, '#2E2E3E');
      } else if (c === 'D' || c === 'O') {
        drawPipeTile(tx, ty, x, y, s, c);
      } else if (c === 'A') {
        // 上むきの かぜ（ふきあげ）。中に 入ると ふわっと 上がる。
        const flow = (t * 2.4 + tx * 0.3) % 1;
        fillRect(x, y, s + 0.5, s + 0.5, 'rgba(180,235,255,0.22)');
        for (let i = 0; i < 3; i++) {
          const k = (flow + i / 3) % 1;
          const yy = y + s * (1 - k);
          ctx.save();
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.85;
          poly([[x + s * 0.5, yy - s * 0.2], [x + s * 0.18, yy + s * 0.1],
            [x + s * 0.82, yy + s * 0.1]], '#DFF6FF');
          ctx.restore();
        }
        const left = tx === 0 || ar.tiles[ty][tx - 1] !== 'A';
        const right = tx >= ar.width - 1 || ar.tiles[ty][tx + 1] !== 'A';
        if (left) fillRect(x, y, s * 0.08, s + 0.5, 'rgba(200,240,255,0.5)');
        if (right) fillRect(x + s * 0.92, y, s * 0.08, s + 0.5, 'rgba(200,240,255,0.5)');
      } else if (c === 'I') {
        // こおりの ゆか。すべる。
        fillRect(x, y, s + 0.5, s + 0.5, '#BFE8F7');
        fillRect(x, y, s + 0.5, s * 0.22, '#EAFAFF');
        fillRect(x, y + s * 0.8, s + 0.5, s * 0.2, '#93C9DE');
        line(x + s * 0.2, y + s * 0.35, x + s * 0.45, y + s * 0.6, 'rgba(255,255,255,0.8)', s * 0.07);
        line(x + s * 0.6, y + s * 0.3, x + s * 0.8, y + s * 0.5, 'rgba(255,255,255,0.6)', s * 0.05);
      } else if (c === '(' || c === ')') {
        // よこむきの かぜ。おされる。
        const dir = c === ')' ? 1 : -1;
        const flow = ((t * 1.9 * dir) % 1 + 1) % 1;
        fillRect(x, y, s + 0.5, s + 0.5, 'rgba(200,230,255,0.13)');
        for (let i = 0; i < 2; i++) {
          const k = (flow + i / 2) % 1;
          const xx = x + (dir > 0 ? k * s : (1 - k) * s);
          const yy = y + s * (0.3 + ((tx + i) % 2) * 0.35);
          ctx.save();
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.75;
          line(xx - dir * s * 0.3, yy, xx, yy, '#EAF6FF', s * 0.07);
          poly([[xx + dir * s * 0.14, yy], [xx - dir * s * 0.04, yy - s * 0.09],
            [xx - dir * s * 0.04, yy + s * 0.09]], '#EAF6FF');
          ctx.restore();
        }
      } else if (c === 'W') {
        const top = ty === 0 || ar.tiles[ty - 1][tx] !== 'W';
        fillRect(x, y, s + 0.5, s + 0.5, 'rgba(70,170,220,0.42)');
        if (top) {
          const wob = Math.sin(t * 2.6 + tx * 0.8) * s * 0.06;
          fillRect(x, y + wob, s + 0.5, s * 0.16, 'rgba(220,250,255,0.55)');
        }
      }
    }
  }
}

function drawPipeTile(tx, ty, x, y, s, c) {
  const ar = game.area;
  const leftSame = tx > 0 && (ar.tiles[ty][tx - 1] === 'D' || ar.tiles[ty][tx - 1] === 'O');
  const green = '#3ABE62', dark = '#1F8C42', light = '#8CF0A8';
  if (c === 'O') {
    fillRect(x - (leftSame ? 0 : s * 0.1), y, s + (leftSame ? 0.5 : s * 0.2), s * 0.34, dark);
    fillRect(x - (leftSame ? 0 : s * 0.1), y, s + (leftSame ? 0.5 : s * 0.2), s * 0.26, green);
    fillRect(x - (leftSame ? 0 : s * 0.1), y, s * 0.2, s * 0.26, light);
    fillRect(x, y + s * 0.34, s + 0.5, s * 0.66, green);
    if (!leftSame) fillRect(x, y + s * 0.34, s * 0.18, s * 0.66, light);
    // 入口の あな
    fillRect(x, y + s * 0.06, s + 0.5, s * 0.1, 'rgba(0,0,0,0.35)');
  } else {
    fillRect(x, y, s + 0.5, s + 0.5, green);
    if (!leftSame) fillRect(x, y, s * 0.18, s + 0.5, light);
    fillRect(x, y, s + 0.5, s * 0.06, rgba(dark, 0.5));
  }
}

/** どかんの ある ところに ↓ の しるしを 出す（どこに 入れるか わかるように）。 */
function drawPipeHints(cam, camY, s) {
  const ar = game.area;
  for (const w of game.lv.warps) {
    if (w.a !== game.areaIndex) continue;
    const x = (w.x + 0.5 - cam) * s;
    if (x < -s || x > viewW + s) continue;
    const y = (w.y - camY) * s;
    const bob = Math.sin(game.elapsed * 4) * s * 0.14;
    const a = 0.55 + Math.sin(game.elapsed * 4) * 0.35;
    poly([[x - s * 0.24, y - s * 0.95 - bob], [x + s * 0.24, y - s * 0.95 - bob],
      [x, y - s * 0.45 - bob]], `rgba(255,255,255,${a})`);
    setFont(s * 0.3);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillText('▼ボタン', x, y - s * 1.15 - bob);
  }
}

function drawCrumbleGhosts(cam, camY, s) {
  for (const c of game.crumbles) {
    if (c.state !== 2) continue;
    const x = (c.tx - cam) * s;
    if (x < -s || x > viewW + s) continue;
    const back = clamp(c.t / CRUMBLE_BACK, 0, 1);
    ctx.strokeStyle = `rgba(214,198,172,${0.15 + back * 0.25})`;
    ctx.lineWidth = s * 0.05;
    rectPath(x, (c.ty - camY) * s, s, s * 0.6, s * 0.14);
    ctx.stroke();
  }
}

function drawMovers(p, cam, camY, s) {
  for (const m of game.movers) {
    const x = (m.x - cam) * s;
    if (x < -3 * s || x > viewW + 3 * s) continue;
    const y = (m.y - camY) * s;
    const w = 2.4 * s, h = 0.45 * s;
    fillRoundRect(x, y + h * 0.4, w, h, s * 0.12, p.dirtDark);
    fillRoundRect(x, y, w, h, s * 0.12, p.platform);
    fillRoundRect(x, y, w, h * 0.45, s * 0.1, p.surface);
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

function drawCheckpoints(cam, camY, s) {
  for (const cp of game.checkpoints) {
    const x = (cp.x - cam) * s;
    if (x < -2 * s || x > viewW + 2 * s) continue;
    const base = (cp.y - camY) * s;
    const height = s * 3.2;
    fillRoundRect(x + s * 0.44, base - height, s * 0.12, height, s * 0.06, '#B9BFCB');
    const flagColor = cp.active ? '#5FD8A0' : '#9AA0AC';
    const wave = cp.active ? Math.sin(game.elapsed * 4) * s * 0.1 : 0;
    poly([[x + s * 0.54, base - height + s * 0.12], [x + s * 1.6 + wave, base - height + s * 0.62],
      [x + s * 0.54, base - height + s * 1.12]], flagColor);
    if (cp.active) {
      const a = (Math.sin(game.elapsed * 5) * 0.5 + 0.5) * 0.5;
      fillCircle(x + s * 0.5, base - height, s * 0.7, rgba('#5FD8A0', a));
    }
  }
}

function drawGoal(cam, camY, s) {
  const ar = game.area;
  if (ar.goalX < 0) return;
  const x = (ar.goalX - cam) * s;
  if (x < -3 * s || x > viewW + 3 * s) return;
  const yBase = (ar.goalY - camY) * s;
  const height = s * 4.4;
  const locked = game.goalLocked;
  fillRoundRect(x + s * 0.42, yBase - height, s * 0.16, height, s * 0.08, '#BFC7D2');
  fillCircle(x + s * 0.5, yBase - height, s * 0.22, locked ? '#7C8494' : '#FFD84D');
  const wave = locked ? 0 : Math.sin(game.elapsed * 3) * s * 0.14;
  poly([[x + s * 0.56, yBase - height + s * 0.15], [x + s * 2.2 + wave, yBase - height + s * 0.8],
    [x + s * 0.56, yBase - height + s * 1.45]], locked ? '#6C7280' : '#FF7BA8');
  fillRoundRect(x + s * 0.2, yBase - s * 0.3, s * 0.6, s * 0.3, s * 0.08, '#8C93A1');
  if (locked) {
    const cx = x + s * 1.2, cy = yBase - height + s * 0.8;
    strokeArc(cx - s * 0.18, cy - s * 0.34, s * 0.36, s * 0.36, 180, 180, '#E6E9EF', s * 0.09);
    fillRoundRect(cx - s * 0.24, cy - s * 0.16, s * 0.48, s * 0.4, s * 0.08, '#E6E9EF');
  }
}

// --- アイテム -------------------------------------------------------------
function drawChuru(cx, cy, r, t) {
  // チュール（ほそながい ふくろ）
  const wob = Math.sin(t * 3) * r * 0.06;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.35 + wob * 0.1); ctx.translate(-cx, -cy);
  fillRoundRect(cx - r * 0.34, cy - r * 1.0, r * 0.68, r * 2.0, r * 0.3, CHURU_A);
  fillRoundRect(cx - r * 0.2, cy - r * 0.86, r * 0.24, r * 1.6, r * 0.12, CHURU_B);
  fillRect(cx - r * 0.4, cy - r * 1.06, r * 0.8, r * 0.22, CHURU_C);
  fillRect(cx - r * 0.4, cy + r * 0.86, r * 0.8, r * 0.2, CHURU_C);
  ctx.restore();
}
function drawChuru3(cx, cy, r, t) {
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(cx + i * r * 0.42, cy); ctx.rotate(i * 0.28);
    ctx.translate(-(cx + i * r * 0.42), -cy);
    drawChuru(cx + i * r * 0.42, cy, r * 0.72, t + i);
    ctx.restore();
  }
}
function drawKarikari(cx, cy, r) {
  // カリカリの おさら
  fillOval(cx - r, cy - r * 0.1, r * 2, r * 1.1, '#EDEDF4');
  fillOval(cx - r * 0.82, cy - r * 0.28, r * 1.64, r * 0.86, '#D6D6E2');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    fillCircle(cx + Math.cos(a) * r * 0.42, cy - r * 0.1 + Math.sin(a) * r * 0.2,
      r * 0.2, i % 2 ? KARI_A : KARI_B);
  }
  fillCircle(cx, cy - r * 0.12, r * 0.2, KARI_A);
}
function drawMatatabi(cx, cy, r, t) {
  // またたびの は
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 2) * 0.2); ctx.translate(-cx, -cy);
  fillCircle(cx, cy, r * 1.2, rgba(MATATABI_A, 0.3));
  ctx.fillStyle = MATATABI_A;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.9, cy);
  ctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.95, cx + r * 0.6, cy - r * 0.7, cx + r * 0.9, cy);
  ctx.bezierCurveTo(cx + r * 0.6, cy + r * 0.7, cx - r * 0.4, cy + r * 0.95, cx - r * 0.9, cy);
  ctx.closePath(); ctx.fill();
  line(cx - r * 0.85, cy, cx + r * 0.8, cy, MATATABI_B, r * 0.12);
  ctx.restore();
}
function drawBadge(cx, cy, r, color, t) {
  const glow = (Math.sin(t * 4) * 0.5 + 0.5) * 0.3;
  fillCircle(cx, cy, r * 1.28, rgba(color, 0.35 + glow));
  fillCircle(cx, cy, r, color);
  fillCircle(cx - r * 0.34, cy - r * 0.38, r * 0.3, 'rgba(255,255,255,0.4)');
}
/** わざの アイコン。にゃー＝こえ、しゃー＝ぎざぎざ、パンチ＝にくきゅう。 */
function drawWeaponIcon(key, cx, cy, r, t) {
  const w = WEAPONS[key];
  drawBadge(cx, cy, r, w.col, t);
  if (key === 'NYA') {
    for (let i = 1; i <= 3; i++) {
      strokeArc(cx - r * 0.2 * i, cy - r * 0.2 * i, r * 0.4 * i, r * 0.4 * i,
        -50, 100, `rgba(255,255,255,${0.9 - i * 0.2})`, r * 0.12);
    }
  } else if (key === 'SHA') {
    poly([[cx - r * 0.7, cy - r * 0.5], [cx - r * 0.1, cy - r * 0.1], [cx - r * 0.55, cy + r * 0.15],
      [cx + r * 0.1, cy + r * 0.6], [cx - r * 0.05, cy + r * 0.05], [cx + r * 0.6, cy - r * 0.25],
      [cx - r * 0.05, cy - r * 0.2]], '#FFFFFF');
  } else {
    // にくきゅう
    fillCircle(cx, cy + r * 0.22, r * 0.42, '#FFFFFF');
    for (let i = 0; i < 4; i++) {
      const a = (-140 + i * 33) * Math.PI / 180;
      fillCircle(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5 - r * 0.05,
        r * 0.16, '#FFFFFF');
    }
  }
}
function drawPickupIcon(kind, cx, cy, r, t) {
  switch (kind) {
    case 'CHURU': drawChuru(cx, cy, r * 0.9, t); break;
    case 'CHURU3': drawChuru3(cx, cy, r, t); break;
    case 'KARIKARI': drawKarikari(cx, cy, r); break;
    case 'BIGCHURU':
      fillCircle(cx, cy, r * 1.3, rgba('#FFD24A', 0.3 + Math.abs(Math.sin(t * 4)) * 0.25));
      drawChuru(cx, cy, r * 1.15, t);
      starPoly(cx + r * 0.8, cy - r * 0.8, r * 0.32, 5, 0.45, '#FFF0A0', t * 2);
      break;
    case 'MATATABI': drawMatatabi(cx, cy, r, t); break;
    case 'FUWA':
      drawBadge(cx, cy, r, FUWA_A, t);
      fillOval(cx - r * 0.34, cy - r * 0.5, r * 0.68, r * 0.9, '#FFFFFF');
      fillOval(cx - r * 0.2, cy - r * 0.34, r * 0.4, r * 0.5, rgba(FUWA_A, 0.5));
      break;
    case 'NIOI':
      drawBadge(cx, cy, r, NIOI_A, t);
      for (let i = 1; i <= 3; i++) {
        strokeArc(cx - r * 0.55, cy - r * 0.2 * i, r * 1.1, r * 0.4 * i, 200, 140,
          `rgba(255,255,255,${0.9 - i * 0.22})`, r * 0.1);
      }
      break;
    default:
      if (kind.slice(0, 2) === 'W_') drawWeaponIcon(kind.slice(2), cx, cy, r, t);
  }
}
function drawPickups(cam, camY, s) {
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    const cx = (pk.x + 0.5 - cam) * s;
    if (cx < -s * 2 || cx > viewW + s * 2) continue;
    const bob = pk.walk ? 0 : Math.sin(pk.t * 3 + pk.x) * s * 0.08;
    drawPickupIcon(pk.kind, cx, (pk.y + 0.5 - camY) * s + bob, s * 0.44, pk.t);
  }
}

function drawPops(cam, camY, s) {
  for (const pop of game.pops) {
    const a = 1 - pop.t / 0.9;
    if (a <= 0) continue;
    const cx = (pop.x - cam) * s;
    const cy = (pop.y + 0.5 - camY) * s - pop.t * s * 2.2;
    if (pop.kind) {
      ctx.save(); ctx.globalAlpha = Math.max(a, 0);
      drawPickupIcon(pop.kind, cx, cy, s * 0.34 * a, pop.t);
      ctx.restore();
    }
    if (pop.text) {
      ctx.save(); ctx.globalAlpha = Math.max(a, 0);
      shadowText(pop.text, cx, cy - s * 0.5, s * 0.44, '#FFFFFF', s * 0.12);
      ctx.restore();
    }
  }
}

// --- てき -----------------------------------------------------------------
function eyes(cx, cy, w, spread, size, look) {
  fillCircle(cx - w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx + w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx - w * spread * 0.85 + look, cy + w * 0.01, w * size * 0.5, INK);
  fillCircle(cx + w * spread * 1.15 + look, cy + w * 0.01, w * size * 0.5, INK);
}
function smile(cx, cy, w, h) { strokeArc(cx - w * 0.11, cy, w * 0.22, h * 0.13, 20, 140, INK, w * 0.042); }

/** こいぬ。ぱたぱた 走ってくる。 */
function drawWalker(x, y, w, h, t, right) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const step = Math.sin(t * 9) * w * 0.12;
  fillRoundRect(cx - w * 0.3 + step, y + h * 0.74, w * 0.16, h * 0.26, w * 0.07, DOG_DARK);
  fillRoundRect(cx + w * 0.14 - step, y + h * 0.74, w * 0.16, h * 0.26, w * 0.07, DOG_DARK);
  // しっぽ（ぶんぶん）
  const sw = Math.sin(t * 14) * 0.5;
  line(cx - d * w * 0.34, y + h * 0.5, cx - d * w * 0.52, y + h * (0.34 + sw * 0.12),
    DOG_DARK, w * 0.08);
  fillOval(cx - w * 0.36, y + h * 0.4, w * 0.72, h * 0.42, DOG_BODY);
  // あたま
  const hx = cx + d * w * 0.2, hy = y + h * 0.3;
  fillCircle(hx, hy, w * 0.26, DOG_BODY);
  fillOval(hx + d * w * 0.1, hy + h * 0.08, w * 0.26, h * 0.2, DOG_BODY);
  fillCircle(hx + d * w * 0.22, hy + h * 0.1, w * 0.06, INK);
  // たれみみ
  fillOval(hx - d * w * 0.26, hy - h * 0.16, w * 0.18, h * 0.3, DOG_DARK);
  fillCircle(hx - d * w * 0.05, hy - h * 0.04, w * 0.07, '#FFFFFF');
  fillCircle(hx - d * w * 0.04, hy - h * 0.03, w * 0.035, INK);
  strokeArc(hx + d * w * 0.04, hy + h * 0.13, w * 0.14, h * 0.08, 20, 140, INK, w * 0.03);
}

/** おおいぬ。おるを 見つけると 追いかけてくる。 */
function drawChaser(x, y, w, h, t, right) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const step = Math.sin(t * 16) * w * 0.14;
  fillRoundRect(cx - w * 0.32 + step, y + h * 0.72, w * 0.18, h * 0.28, w * 0.08, BIGDOG_DARK);
  fillRoundRect(cx + w * 0.14 - step, y + h * 0.72, w * 0.18, h * 0.28, w * 0.08, BIGDOG_DARK);
  line(cx - d * w * 0.38, y + h * 0.42, cx - d * w * 0.58, y + h * 0.26, BIGDOG_DARK, w * 0.09);
  fillOval(cx - w * 0.4, y + h * 0.34, w * 0.8, h * 0.44, BIGDOG_BODY);
  const hx = cx + d * w * 0.24, hy = y + h * 0.24;
  fillCircle(hx, hy, w * 0.28, BIGDOG_BODY);
  fillOval(hx + d * w * 0.14, hy + h * 0.08, w * 0.3, h * 0.22, BIGDOG_BODY);
  fillCircle(hx + d * w * 0.26, hy + h * 0.1, w * 0.06, INK);
  // 立ちみみ
  poly([[hx - d * w * 0.2, hy - h * 0.12], [hx - d * w * 0.24, hy - h * 0.34],
    [hx - d * w * 0.02, hy - h * 0.2]], BIGDOG_DARK);
  poly([[hx + d * w * 0.1, hy - h * 0.16], [hx + d * w * 0.14, hy - h * 0.36],
    [hx + d * w * 0.24, hy - h * 0.14]], BIGDOG_DARK);
  fillCircle(hx - d * w * 0.02, hy - h * 0.02, w * 0.08, '#FFFFFF');
  fillCircle(hx + d * w * 0.16, hy - h * 0.02, w * 0.08, '#FFFFFF');
  fillCircle(hx - d * w * 0.01, hy - h * 0.01, w * 0.04, INK);
  fillCircle(hx + d * w * 0.17, hy - h * 0.01, w * 0.04, INK);
  // わんっ！の 口
  fillArc(hx + d * w * 0.06, hy + h * 0.12, w * 0.2, h * 0.14, 0, 180, '#7A2A3A');
}

/** カラス。そらを ふらふら とぶ。 */
function drawFlyer(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5, d = right ? 1 : -1;
  const flap = Math.abs(Math.sin(t * 9));
  for (const side of [-1, 1]) {
    poly([[cx, cy - h * 0.1],
      [cx + side * w * 0.55, cy - h * (0.1 + flap * 0.36)],
      [cx + side * w * 0.4, cy + h * 0.16]], CROW_DARK);
  }
  fillOval(cx - w * 0.28, cy - h * 0.26, w * 0.56, h * 0.52, CROW_BODY);
  fillCircle(cx + d * w * 0.18, cy - h * 0.18, w * 0.19, CROW_BODY);
  poly([[cx + d * w * 0.3, cy - h * 0.18], [cx + d * w * 0.56, cy - h * 0.12],
    [cx + d * w * 0.3, cy - h * 0.06]], '#FFC24D');
  fillCircle(cx + d * w * 0.2, cy - h * 0.22, w * 0.07, '#FFFFFF');
  fillCircle(cx + d * w * 0.22, cy - h * 0.22, w * 0.035, INK);
}

/** ハチ。ふめない。 */
function drawSpiky(x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h * 0.5;
  const flap = Math.abs(Math.sin(t * 26));
  fillOval(cx - w * 0.36, cy - h * 0.3 - flap * h * 0.1, w * 0.34, h * 0.26,
    'rgba(255,255,255,0.6)');
  fillOval(cx + w * 0.02, cy - h * 0.3 - flap * h * 0.1, w * 0.34, h * 0.26,
    'rgba(255,255,255,0.6)');
  fillOval(cx - w * 0.34, cy - h * 0.2, w * 0.68, h * 0.46, BEE_BODY);
  for (let i = 0; i < 2; i++) {
    fillRect(cx - w * 0.1 + i * w * 0.2, cy - h * 0.2, w * 0.1, h * 0.46, BEE_DARK);
  }
  poly([[cx - w * 0.34, cy - h * 0.02], [cx - w * 0.54, cy + h * 0.02],
    [cx - w * 0.34, cy + h * 0.08]], BEE_DARK);
  eyes(cx + w * 0.16, cy - h * 0.06, w, 0.08, 0.09, 0);
  line(cx + w * 0.2, cy - h * 0.24, cx + w * 0.3, cy - h * 0.42, BEE_DARK, w * 0.03);
  line(cx + w * 0.1, cy - h * 0.24, cx + w * 0.16, cy - h * 0.44, BEE_DARK, w * 0.03);
}

/** バッタ。ときどき 大きく はねる。 */
function drawJumper(x, y, w, h, t, air) {
  const cx = x + w / 2;
  const stretch = air ? 1.16 : 1 + Math.sin(t * 6) * 0.05;
  ctx.save(); ctx.translate(cx, y + h); ctx.scale(1 / stretch, stretch); ctx.translate(-cx, -(y + h));
  fillOval(cx - w * 0.4, y + h * 0.4, w * 0.8, h * 0.42, GRASS_BODY);
  fillCircle(cx + w * 0.26, y + h * 0.4, w * 0.2, GRASS_BODY);
  poly([[cx - w * 0.1, y + h * 0.5], [cx - w * 0.34, y + h * (air ? 0.28 : 0.5)],
    [cx - w * 0.28, y + h * 0.86], [cx - w * 0.06, y + h * 0.7]], GRASS_DARK);
  ctx.restore();
  eyes(cx + w * 0.26, y + h * 0.34, w, 0.09, 0.1, 0);
  line(cx + w * 0.3, y + h * 0.22, cx + w * 0.44, y + h * 0.06, GRASS_DARK, w * 0.035);
  smile(cx + w * 0.26, y + h * 0.44, w, h);
}

/** カエル。ぴょんぴょん 近づいてくる。 */
function drawHopper(x, y, w, h, t, air) {
  const cx = x + w / 2;
  const squash = air ? 1.16 : 1 + Math.sin(t * 5) * 0.07;
  ctx.save(); ctx.translate(cx, y + h); ctx.scale(1 / squash, squash); ctx.translate(-cx, -(y + h));
  fillOval(cx - w * 0.46, y + h * 0.3, w * 0.92, h * 0.7, FROG_BODY);
  fillOval(cx - w * 0.3, y + h * 0.6, w * 0.6, h * 0.3, rgba(FROG_DARK, 0.4));
  fillRoundRect(cx - w * 0.5, y + h * 0.72, w * 0.22, h * 0.2, w * 0.08, FROG_DARK);
  fillRoundRect(cx + w * 0.28, y + h * 0.72, w * 0.22, h * 0.2, w * 0.08, FROG_DARK);
  fillCircle(cx - w * 0.2, y + h * 0.24, w * 0.16, FROG_BODY);
  fillCircle(cx + w * 0.2, y + h * 0.24, w * 0.16, FROG_BODY);
  ctx.restore();
  fillCircle(cx - w * 0.2, y + h * 0.24, w * 0.1, '#FFFFFF');
  fillCircle(cx + w * 0.2, y + h * 0.24, w * 0.1, '#FFFFFF');
  fillCircle(cx - w * 0.19, y + h * 0.25, w * 0.05, INK);
  fillCircle(cx + w * 0.21, y + h * 0.25, w * 0.05, INK);
  strokeArc(cx - w * 0.16, y + h * 0.44, w * 0.32, h * 0.14, 20, 140, INK, w * 0.04);
}

/** セミ。木から 落ちてくる。 */
function drawDropper(x, y, w, h, t, hanging) {
  const cx = x + w / 2;
  if (hanging) line(cx, y - h * 1.4, cx, y + h * 0.1, 'rgba(255,255,255,0.5)', w * 0.04);
  const sway = hanging ? Math.sin(t * 2.2) * w * 0.05 : 0;
  const cxs = cx + sway;
  for (const side of [-1, 1]) {
    fillOval(cxs + side * w * 0.1 - w * 0.3, y + h * 0.3, w * 0.6, h * 0.5,
      'rgba(220,240,255,0.55)');
  }
  fillOval(cxs - w * 0.24, y + h * 0.24, w * 0.48, h * 0.66, SEMI_BODY);
  fillCircle(cxs, y + h * 0.26, w * 0.22, SEMI_DARK);
  fillCircle(cxs - w * 0.11, y + h * 0.24, w * 0.07, '#FFFFFF');
  fillCircle(cxs + w * 0.11, y + h * 0.24, w * 0.07, '#FFFFFF');
  fillCircle(cxs - w * 0.1, y + h * 0.25, w * 0.035, INK);
  fillCircle(cxs + w * 0.12, y + h * 0.25, w * 0.035, INK);
  if (!hanging) {
    for (let i = 1; i <= 2; i++) {
      strokeArc(cxs - w * 0.3 * i, y + h * 0.1, w * 0.6 * i, h * 0.5 * i, 200, 140,
        `rgba(255,255,255,${0.5 / i})`, w * 0.05);
    }
  }
}

/** よるの おばけ。見ていない ときだけ 近づいてくる。 */
function drawGhost(x, y, w, h, t, shy) {
  const cx = x + w / 2, cy = y + h * 0.48;
  const wob = Math.sin(t * 3) * h * 0.04;
  fillCircle(cx, cy + wob, w * 0.42, rgba(GHOST_BODY, 0.9));
  for (let i = 0; i < 4; i++) {
    const bx = cx - w * 0.4 + (w * 0.8 * (i + 0.5)) / 4;
    fillCircle(bx, cy + w * 0.36 + wob + Math.sin(t * 6 + i) * h * 0.03,
      w * 0.11, rgba(GHOST_BODY, 0.9));
  }
  if (shy) {
    fillCircle(cx - w * 0.15, cy + wob, w * 0.11, GHOST_DARK);
    fillCircle(cx + w * 0.15, cy + wob, w * 0.11, GHOST_DARK);
    strokeArc(cx - w * 0.1, cy + h * 0.16 + wob, w * 0.2, h * 0.1, 200, 140, INK, w * 0.04);
  } else {
    eyes(cx, cy + wob, w, 0.16, 0.13, 0);
    fillOval(cx - w * 0.09, cy + h * 0.14 + wob, w * 0.18, h * 0.13, INK);
  }
}

/** そうじきロボ。ふめない。ときどき ゴミを とばしてくる。 */
function drawRobo(x, y, w, h, t, right) {
  const cx = x + w / 2;
  const spin = t * 6;
  fillOval(cx - w * 0.5, y + h * 0.1, w, h * 0.9, ROBO_BODY);
  fillOval(cx - w * 0.4, y + h * 0.02, w * 0.8, h * 0.5, ROBO_DARK);
  fillOval(cx - w * 0.3, y + h * 0.06, w * 0.34, h * 0.24, 'rgba(255,255,255,0.4)');
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI * 2;
    fillCircle(cx + Math.cos(a) * w * 0.3, y + h * 0.62 + Math.sin(a) * h * 0.12,
      w * 0.07, '#5A5A6E');
  }
  fillCircle(cx - w * 0.14, y + h * 0.28, w * 0.07, (Math.sin(t * 8) > 0) ? '#FF5A5A' : '#7ADC80');
  fillCircle(cx + w * 0.14, y + h * 0.28, w * 0.07, '#8AD8F0');
  fillRect(cx - w * 0.5, y + h * 0.86, w, h * 0.12, '#4A4A5E');
}

/** リノ。友だちの ねこ。白に 茶色が ところどころ。しっぽを 立てて ごきげん。 */
function drawRino(x, y, w, h, t, right) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const step = Math.sin(t * 10) * w * 0.1;
  // しっぽ（ぴんと 立てて いる）
  const sway = Math.sin(t * 4) * w * 0.06;
  line(cx - d * w * 0.3, y + h * 0.55, cx - d * w * 0.36 + sway, y - h * 0.16,
    RINO_FUR_D, w * 0.11);
  fillCircle(cx - d * w * 0.36 + sway, y - h * 0.18, w * 0.08, RINO_BROWN);
  // あし
  fillRoundRect(cx - w * 0.26 + step, y + h * 0.76, w * 0.15, h * 0.24, w * 0.07, RINO_FUR_D);
  fillRoundRect(cx + w * 0.11 - step, y + h * 0.76, w * 0.15, h * 0.24, w * 0.07, RINO_FUR_D);
  // からだ
  fillOval(cx - w * 0.36, y + h * 0.4, w * 0.72, h * 0.46, RINO_FUR);
  fillOval(cx - w * 0.1, y + h * 0.46, w * 0.3, h * 0.22, RINO_BROWN);
  // あたま
  const hx = cx + d * w * 0.12, hy = y + h * 0.3;
  const hr = w * 0.27;
  poly([[hx - hr * 0.85, hy - hr * 0.5], [hx - hr * 0.6, hy - hr * 1.3],
    [hx - hr * 0.15, hy - hr * 0.78]], RINO_FUR);
  poly([[hx + hr * 0.85, hy - hr * 0.5], [hx + hr * 0.6, hy - hr * 1.3],
    [hx + hr * 0.15, hy - hr * 0.78]], RINO_BROWN);
  fillCircle(hx, hy, hr, RINO_FUR);
  fillCircle(hx + d * hr * 0.55, hy - hr * 0.45, hr * 0.32, RINO_BROWN);
  // にっこりした 目（気さく）
  const ex = d * w * 0.02;
  fillCircle(hx - hr * 0.4 + ex, hy, hr * 0.26, '#FFFFFF');
  fillCircle(hx + hr * 0.4 + ex, hy, hr * 0.26, '#FFFFFF');
  fillCircle(hx - hr * 0.36 + ex, hy + hr * 0.02, hr * 0.15, INK);
  fillCircle(hx + hr * 0.44 + ex, hy + hr * 0.02, hr * 0.15, INK);
  fillCircle(hx - hr * 0.42 + ex, hy - hr * 0.06, hr * 0.05, '#FFFFFF');
  fillCircle(hx + hr * 0.38 + ex, hy - hr * 0.06, hr * 0.05, '#FFFFFF');
  poly([[hx - hr * 0.12, hy + hr * 0.3], [hx + hr * 0.12, hy + hr * 0.3],
    [hx, hy + hr * 0.46]], ORU_NOSE);
  strokeArc(hx - hr * 0.26, hy + hr * 0.42, hr * 0.26, hr * 0.22, 20, 140, INK, hr * 0.09);
  strokeArc(hx, hy + hr * 0.42, hr * 0.26, hr * 0.22, 20, 140, INK, hr * 0.09);
  fillCircle(hx - hr * 0.7, hy + hr * 0.3, hr * 0.18, rgba(CHEEK, 0.5));
  fillCircle(hx + hr * 0.7, hy + hr * 0.3, hr * 0.18, rgba(CHEEK, 0.5));
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      line(hx + sd * hr * 0.5, hy + hr * (0.28 + i * 0.16),
        hx + sd * hr * 1.35, hy + hr * (0.16 + i * 0.26), 'rgba(90,80,90,0.5)', hr * 0.05);
    }
  }
}

function drawMinion(x, y, w, h, t, right) {
  const cx = x + w / 2;
  const bob = Math.sin(t * 9) * h * 0.06;
  fillCircle(cx, y + h * 0.55 + bob, w * 0.42, MINION_BODY);
  fillArc(cx - w * 0.42, y + h * 0.5 + bob, w * 0.84, h * 0.5, 0, 180, MINION_DARK);
  eyes(cx, y + h * 0.48 + bob, w, 0.16, 0.14, right ? w * 0.05 : -w * 0.05);
  smile(cx, y + h * 0.6 + bob, w, h);
}

// --- ボス（りな・まり）ほか 人 -------------------------------------------
// りな…小さい 女の子。ふたつむすび。だっこ しようと 手を ひろげてくる。
// まり…りなの ママ。エプロンと ブラシ。ブラッシングしようと おいかけてくる。
function drawFace(cx, cy, r, look, happy) {
  fillCircle(cx, cy, r, SKIN);
  fillCircle(cx - r * 0.36 + look, cy - r * 0.05, r * 0.24, '#FFFFFF');
  fillCircle(cx + r * 0.36 + look, cy - r * 0.05, r * 0.24, '#FFFFFF');
  fillCircle(cx - r * 0.33 + look, cy - r * 0.02, r * 0.13, INK);
  fillCircle(cx + r * 0.39 + look, cy - r * 0.02, r * 0.13, INK);
  fillCircle(cx - r * 0.38 + look, cy - r * 0.1, r * 0.05, '#FFFFFF');
  fillCircle(cx + r * 0.34 + look, cy - r * 0.1, r * 0.05, '#FFFFFF');
  fillCircle(cx - r * 0.62, cy + r * 0.28, r * 0.16, rgba(CHEEK, 0.55));
  fillCircle(cx + r * 0.62, cy + r * 0.28, r * 0.16, rgba(CHEEK, 0.55));
  if (happy) {
    fillArc(cx - r * 0.26, cy + r * 0.28, r * 0.52, r * 0.44, 0, 180, '#B84A64');
    fillArc(cx - r * 0.18, cy + r * 0.4, r * 0.36, r * 0.22, 0, 180, '#FF8FA8');
  } else {
    strokeArc(cx - r * 0.2, cy + r * 0.3, r * 0.4, r * 0.24, 20, 140, INK, r * 0.08);
  }
}

/** りなちゃん。 */
function drawRina(x, y, w, h, t, right, stunned) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const run = Math.sin(t * 12);
  const lean = stunned ? 0 : d * 0.12;
  ctx.save();
  ctx.translate(cx, y + h); ctx.rotate(lean); ctx.translate(-cx, -(y + h));
  // あし
  fillRoundRect(cx - w * 0.22 + run * w * 0.12, y + h * 0.74, w * 0.16, h * 0.26, w * 0.07, '#F0D8E4');
  fillRoundRect(cx + w * 0.06 - run * w * 0.12, y + h * 0.74, w * 0.16, h * 0.26, w * 0.07, '#F0D8E4');
  // ワンピース
  poly([[cx - w * 0.2, y + h * 0.4], [cx + w * 0.2, y + h * 0.4],
    [cx + w * 0.34, y + h * 0.78], [cx - w * 0.34, y + h * 0.78]], RINA_DRESS);
  fillRect(cx - w * 0.22, y + h * 0.5, w * 0.44, h * 0.05, RINA_DRESS_D);
  // 手を ひろげて だっこの ポーズ
  const armY = stunned ? 0.6 : 0.36;
  fillRoundRect(cx - w * 0.44, y + h * armY, w * 0.24, h * 0.1, w * 0.05, SKIN);
  fillRoundRect(cx + w * 0.2, y + h * armY, w * 0.24, h * 0.1, w * 0.05, SKIN);
  fillCircle(cx - w * 0.46, y + h * (armY + 0.05), w * 0.08, SKIN);
  fillCircle(cx + w * 0.46, y + h * (armY + 0.05), w * 0.08, SKIN);
  // かお と かみ（ポニーテール）
  const hy = y + h * 0.2, hr = w * 0.22;
  // うしろで ひとつに むすんだ しっぽ。走ると ゆれる。
  const tx2 = cx - d * hr * 1.05;
  const swing = Math.sin(t * 9) * hr * 0.35;
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(tx2, hy - hr * 0.55);
  ctx.quadraticCurveTo(tx2 - d * hr * 1.7 + swing, hy + hr * 0.5,
    tx2 - d * hr * 0.9 + swing, hy + hr * 2.4);
  ctx.quadraticCurveTo(tx2 - d * hr * 0.1, hy + hr * 0.9, tx2 + d * hr * 0.2, hy + hr * 0.1);
  ctx.closePath(); ctx.fill();
  drawFace(cx, hy, hr, d * hr * 0.08, !stunned);
  fillArc(cx - hr * 1.1, hy - hr * 1.25, hr * 2.2, hr * 1.9, 180, 180, HAIR);
  // むすびめ と リボン
  fillCircle(tx2, hy - hr * 0.42, hr * 0.3, HAIR);
  fillCircle(tx2, hy - hr * 0.42, hr * 0.17, '#FF4A78');
  poly([[tx2, hy - hr * 0.42], [tx2 - d * hr * 0.55, hy - hr * 0.85],
    [tx2 - d * hr * 0.5, hy - hr * 0.1]], '#FF4A78');
  ctx.restore();
}

/** まりちゃん（りなの ママ）。ブラシを 持っている。 */
function drawMari(x, y, w, h, t, right, stunned) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const run = Math.sin(t * 10);
  ctx.save();
  ctx.translate(cx, y + h); ctx.rotate(stunned ? 0 : d * 0.09); ctx.translate(-cx, -(y + h));
  fillRoundRect(cx - w * 0.2 + run * w * 0.1, y + h * 0.78, w * 0.15, h * 0.22, w * 0.06, '#5A4A62');
  fillRoundRect(cx + w * 0.05 - run * w * 0.1, y + h * 0.78, w * 0.15, h * 0.22, w * 0.06, '#5A4A62');
  poly([[cx - w * 0.2, y + h * 0.36], [cx + w * 0.2, y + h * 0.36],
    [cx + w * 0.3, y + h * 0.8], [cx - w * 0.3, y + h * 0.8]], MARI_DRESS);
  poly([[cx - w * 0.12, y + h * 0.42], [cx + w * 0.12, y + h * 0.42],
    [cx + w * 0.18, y + h * 0.78], [cx - w * 0.18, y + h * 0.78]], 'rgba(255,255,255,0.85)');
  // うで（ブラシを ふりあげて いる）
  const armY = stunned ? 0.56 : 0.26;
  fillRoundRect(cx - w * 0.4, y + h * 0.4, w * 0.14, h * 0.26, w * 0.06, MARI_DRESS_D);
  fillRoundRect(cx + w * 0.22, y + h * armY, w * 0.14, h * 0.26, w * 0.06, MARI_DRESS_D);
  // ブラシ
  const bx = cx + w * 0.3, by = y + h * (armY - 0.06);
  fillRoundRect(bx - w * 0.05, by - h * 0.14, w * 0.1, h * 0.2, w * 0.04, '#8A5A2A');
  fillRoundRect(bx - w * 0.14, by - h * 0.24, w * 0.28, h * 0.12, w * 0.04, '#E8E8F0');
  for (let i = 0; i < 5; i++) {
    line(bx - w * 0.11 + i * w * 0.055, by - h * 0.24,
      bx - w * 0.11 + i * w * 0.055, by - h * 0.32, '#8AD8F0', w * 0.02);
  }
  // かお と かみ（セミロング）
  const hy = y + h * 0.18, hr = w * 0.2;
  fillRoundRect(cx - hr * 1.3, hy - hr * 0.9, hr * 2.6, hr * 2.7, hr * 0.8, HAIR);
  drawFace(cx, hy, hr, d * hr * 0.08, !stunned);
  fillArc(cx - hr * 1.15, hy - hr * 1.3, hr * 2.3, hr * 1.9, 180, 180, HAIR);
  ctx.restore();
}

/** エンディングに 出てくる おとな（あーたん・くーたん）。 */
function drawGrownup(x, y, w, h, t, who, magic) {
  const cx = x + w / 2;
  const top = who === 'AA' ? '#7FA9E8' : '#7ADCB0';
  const topD = who === 'AA' ? '#5A82BF' : '#4FA88A';
  if (who === 'AA') fillOval(cx - w * 0.38, y + h * 0.38, w * 0.76, h * 0.5, top);
  else fillRoundRect(cx - w * 0.3, y + h * 0.38, w * 0.6, h * 0.5, w * 0.14, top);
  if (magic) {
    // まほうを かける ポーズ。手を 上に あげて、ゆびさきが 光る。
    const sw = Math.sin(t * 3) * h * 0.03;
    for (const sd of [-1, 1]) {
      fillRoundRect(cx + sd * w * 0.3 - w * 0.07, y + h * 0.06 + sw, w * 0.14, h * 0.36,
        w * 0.06, topD);
      const gx = cx + sd * w * 0.3, gy = y + h * 0.04 + sw;
      const g2 = Math.abs(Math.sin(t * 5 + sd));
      fillCircle(gx, gy, w * (0.1 + g2 * 0.05), 'rgba(255,245,190,0.85)');
      starPoly(gx, gy, w * (0.16 + g2 * 0.06), 4, 0.3, 'rgba(255,255,255,0.9)', t * 2);
    }
  } else {
    fillRoundRect(cx - w * 0.42, y + h * 0.42, w * 0.14, h * 0.3, w * 0.06, topD);
    fillRoundRect(cx + w * 0.28, y + h * 0.42, w * 0.14, h * 0.3, w * 0.06, topD);
  }
  const hy = y + h * 0.2, hr = w * 0.2;
  if (who === 'AA') fillArc(cx - hr * 1.15, hy - hr * 1.3, hr * 2.3, hr * 1.8, 180, 180, HAIR);
  else fillRoundRect(cx - hr * 1.35, hy - hr * 1.05, hr * 2.7, hr * 2.35, hr * 0.95, '#6A4A3A');
  drawFace(cx, hy, hr, 0, true);
  if (who === 'AA') {
    fillArc(cx - hr * 1.15, hy - hr * 1.3, hr * 2.3, hr * 1.8, 180, 180, HAIR);
    // めがね（あーたん）
    for (const sd of [-1, 1]) {
      fillCircle(cx + sd * hr * 0.4, hy + hr * 0.02, hr * 0.36, 'rgba(255,255,255,0.5)');
      strokeCircle(cx + sd * hr * 0.4, hy + hr * 0.02, hr * 0.36, HAIR, hr * 0.09);
    }
  } else {
    // ボブの まえがみ（くーたん）
    fillRoundRect(cx - hr * 1.35, hy - hr * 1.1, hr * 2.7, hr * 0.8, hr * 0.3, '#6A4A3A');
  }
}

/** あーたん。おるの パパ。やや ふとりぎみ。
 *  だっこして ねかしつけようと おいかけてくる。 */
function drawAatan(x, y, w, h, t, right, stunned) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const run = Math.sin(t * 8);
  ctx.save();
  ctx.translate(cx, y + h); ctx.rotate(stunned ? 0 : d * 0.07); ctx.translate(-cx, -(y + h));
  // あし
  fillRoundRect(cx - w * 0.24 + run * w * 0.1, y + h * 0.78, w * 0.19, h * 0.22, w * 0.08, '#4A5064');
  fillRoundRect(cx + w * 0.05 - run * w * 0.1, y + h * 0.78, w * 0.19, h * 0.22, w * 0.08, '#4A5064');
  // おなか（まるい）
  fillOval(cx - w * 0.4, y + h * 0.36, w * 0.8, h * 0.48, '#7FA9E8');
  fillOval(cx - w * 0.26, y + h * 0.5, w * 0.52, h * 0.3, 'rgba(255,255,255,0.28)');
  // うで（だっこの ポーズ）
  const armY = stunned ? 0.62 : 0.44;
  fillRoundRect(cx - w * 0.52, y + h * armY, w * 0.26, h * 0.12, w * 0.06, '#5A82BF');
  fillRoundRect(cx + w * 0.26, y + h * armY, w * 0.26, h * 0.12, w * 0.06, '#5A82BF');
  fillCircle(cx - w * 0.54, y + h * (armY + 0.06), w * 0.09, SKIN);
  fillCircle(cx + w * 0.54, y + h * (armY + 0.06), w * 0.09, SKIN);
  // かお（みじかい かみ・めがね）
  const hy = y + h * 0.19, hr = w * 0.23;
  fillArc(cx - hr * 1.12, hy - hr * 1.3, hr * 2.24, hr * 1.9, 180, 180, HAIR);
  drawFace(cx, hy, hr, d * hr * 0.08, !stunned);
  fillArc(cx - hr * 1.12, hy - hr * 1.3, hr * 2.24, hr * 1.9, 180, 180, HAIR);
  // めがね
  const gy = hy + hr * 0.02, gr = hr * 0.36;
  for (const sd of [-1, 1]) {
    fillCircle(cx + sd * hr * 0.4, gy, gr, 'rgba(255,255,255,0.5)');
    strokeCircle(cx + sd * hr * 0.4, gy, gr, HAIR, hr * 0.09);
  }
  line(cx - hr * 0.1, gy, cx + hr * 0.1, gy, HAIR, hr * 0.08);
  ctx.restore();
  // あくび の きらきら
  if (!stunned) {
    const k = (t * 0.7) % 1;
    ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
    setFont(w * 0.24);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF3C4';
    ctx.fillText('z', cx + w * 0.42, y + h * 0.08 - k * h * 0.12);
    ctx.restore();
  }
}

/** くーたん。ボブの かみがた。つめきりを 持って おいかけてくる。 */
function drawKutan(x, y, w, h, t, right, stunned) {
  const cx = x + w / 2, d = right ? 1 : -1;
  const run = Math.sin(t * 10);
  ctx.save();
  ctx.translate(cx, y + h); ctx.rotate(stunned ? 0 : d * 0.09); ctx.translate(-cx, -(y + h));
  fillRoundRect(cx - w * 0.2 + run * w * 0.1, y + h * 0.78, w * 0.15, h * 0.22, w * 0.06, '#4A6458');
  fillRoundRect(cx + w * 0.05 - run * w * 0.1, y + h * 0.78, w * 0.15, h * 0.22, w * 0.06, '#4A6458');
  poly([[cx - w * 0.2, y + h * 0.36], [cx + w * 0.2, y + h * 0.36],
    [cx + w * 0.3, y + h * 0.8], [cx - w * 0.3, y + h * 0.8]], '#7ADCB0');
  fillRect(cx - w * 0.22, y + h * 0.5, w * 0.44, h * 0.05, '#4FA88A');
  // うで（つめきりを ふりあげて いる）
  const armY = stunned ? 0.58 : 0.24;
  fillRoundRect(cx - w * 0.4, y + h * 0.4, w * 0.14, h * 0.26, w * 0.06, '#4FA88A');
  fillRoundRect(cx + w * 0.22, y + h * armY, w * 0.14, h * 0.28, w * 0.06, '#4FA88A');
  // つめきり
  const bx = cx + w * 0.3, by = y + h * (armY - 0.04);
  fillRoundRect(bx - w * 0.06, by - h * 0.16, w * 0.12, h * 0.2, w * 0.04, '#C8CCD8');
  fillRoundRect(bx - w * 0.1, by - h * 0.2, w * 0.2, h * 0.07, w * 0.03, '#9AA0B0');
  line(bx - w * 0.02, by - h * 0.24, bx + w * 0.06, by - h * 0.3, '#E8ECF4', w * 0.035);
  // かお と ボブの かみ
  const hy = y + h * 0.18, hr = w * 0.2;
  // ボブ … 耳の 下で まっすぐ そろえた かみ
  fillRoundRect(cx - hr * 1.35, hy - hr * 1.05, hr * 2.7, hr * 2.35, hr * 0.95, '#6A4A3A');
  drawFace(cx, hy, hr, d * hr * 0.08, !stunned);
  // まえがみ（まっすぐ）
  fillRect(cx - hr * 1.05, hy - hr * 1.05, hr * 2.1, hr * 0.85, '#6A4A3A');
  fillRoundRect(cx - hr * 1.35, hy - hr * 1.1, hr * 2.7, hr * 0.8, hr * 0.3, '#6A4A3A');
  ctx.restore();
}

function drawBossShape(who, x, y, w, h, t, right, col, col2, stunned) {
  if (who === 'MARI') drawMari(x, y, w, h, t, right, stunned);
  else if (who === 'AA') drawAatan(x, y, w, h, t, right, stunned);
  else if (who === 'KU') drawKutan(x, y, w, h, t, right, stunned);
  else drawRina(x, y, w, h, t, right, stunned);
}

/** ボスの ふきだし。★ 小さくて 読めないと 言われたので 大きくした。
 *  画面の そとに はみ出さない ように よこの ばしょも おさえる。 */
function drawBubble(e, cam, camY, s) {
  if (!e.bubble || e.bubbleT <= 0) return;
  const a = clamp(e.bubbleT * 1.4, 0, 1);
  const fs = Math.max(s * 0.62, 17);
  setFont(fs);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(e.bubble).width + fs * 1.5;
  const bh = fs * 1.9;
  let cx = (e.x + e.w / 2 - cam) * s;
  cx = clamp(cx, tw / 2 + 6, viewW - tw / 2 - 6);
  let cy = (e.y - camY) * s - bh * 0.8;
  // HUD（のこり・チュール）の 下に おさめる
  cy = Math.max(cy, viewH * 0.19 + bh * 0.5);
  const tipX = clamp((e.x + e.w / 2 - cam) * s, cx - tw / 2 + fs, cx + tw / 2 - fs);
  ctx.save();
  ctx.globalAlpha = a;
  fillRoundRect(cx - tw / 2, cy - bh / 2, tw, bh, bh * 0.45, 'rgba(255,255,255,0.96)');
  poly([[tipX - fs * 0.32, cy + bh / 2 - 2], [tipX + fs * 0.32, cy + bh / 2 - 2],
    [tipX, cy + bh / 2 + fs * 0.8]], 'rgba(255,255,255,0.96)');
  ctx.strokeStyle = rgba((e.boss && e.boss.col2) || '#C98A50', 0.8);
  ctx.lineWidth = Math.max(2, s * 0.05);
  rectPath(cx - tw / 2, cy - bh / 2, tw, bh, bh * 0.45);
  ctx.stroke();
  ctx.fillStyle = '#33283C';
  setFont(fs);
  ctx.fillText(e.bubble, cx, cy + fs * 0.06);
  ctx.restore();
}

/** ボスとの きょり。ちかいと あかく なる。 */
function drawBossGauge(e, cam, camY, s) {
  const p = game.player;
  const d = Math.abs((e.x + e.w / 2) - (p.x + PLAYER_W / 2));
  const k = clamp(1 - d / 16, 0, 1);
  const w = s * 3.2, x = (e.x + e.w / 2 - cam) * s - w / 2;
  const y = (e.y - camY) * s - s * 0.98;
  fillRoundRect(x, y, w, s * 0.22, s * 0.11, 'rgba(0,0,0,0.4)');
  fillRoundRect(x + s * 0.03, y + s * 0.03, (w - s * 0.06) * k, s * 0.16, s * 0.08,
    k > 0.75 ? '#FF6B6B' : k > 0.45 ? '#FFD24A' : '#7ADC80');
  setFont(s * 0.26);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(e.stunT > 0 ? e.boss.name + '（とまってる！）' : e.boss.name, x + w / 2, y - s * 0.1);
}

function drawEnemies(cam, camY, s) {
  for (const e of game.enemies) {
    const x = (e.x - cam) * s;
    if (x < -4 * s || x > viewW + 4 * s) continue;
    let y = (e.y - camY) * s;
    const w = e.w * s, h = e.h * s;
    if (game.introT > 0 && e.kind === 'BOSS') {
      const k = 1 - game.introT / BOSS_INTRO_TIME;
      y -= Math.abs(Math.sin(k * Math.PI * 3)) * h * 0.3 * (1 - k * 0.6);
    }
    if (!e.alive) {
      const k = clamp(1 - e.squashT / 0.75, 0, 1);
      fillOval(x - w * 0.1, y + h * 0.66, w * 1.2, h * 0.34 * k, `rgba(255,255,255,${k * 0.5})`);
      continue;
    }
    if (e.invulnT > 0 && Math.sin(e.t * 40) < 0) continue;
    ctx.save();
    switch (e.kind) {
      case 'WALKER': drawWalker(x, y, w, h, e.t, e.vx > 0); break;
      case 'SPIKY': drawSpiky(x, y, w, h, e.t); break;
      case 'FLYER': drawFlyer(x, y, w, h, e.t, e.vx > 0); break;
      case 'JUMPER': drawJumper(x, y, w, h, e.t, e.vy !== 0); break;
      case 'CHASER': drawChaser(x, y, w, h, e.t, e.vx > 0); break;
      case 'HOPPER': drawHopper(x, y, w, h, e.t, e.vy !== 0); break;
      case 'DROPPER': drawDropper(x, y, w, h, e.t, !e.dropped); break;
      case 'GHOST': drawGhost(x, y, w, h, e.t, e.shy); break;
      case 'ROBO': drawRobo(x, y, w, h, e.t, e.vx > 0); break;
      case 'RINO': drawRino(x, y, w, h, e.t, e.vx > 0); break;
      case 'MINION': drawMinion(x, y, w, h, e.t, e.vx > 0); break;
      case 'BOSS':
        drawBossShape(e.boss.who, x, y, w, h, e.t, e.vx > 0, e.boss.col, e.boss.col2,
          e.stunT > 0);
        break;
    }
    ctx.restore();
    if (e.stunT > 0) {
      // ひるんで いる あいだは 目を まわす
      for (let i = 0; i < 3; i++) {
        const a = game.elapsed * 6 + (i / 3) * Math.PI * 2;
        starPoly(x + w / 2 + Math.cos(a) * w * 0.4, y - h * 0.06 + Math.sin(a) * h * 0.08,
          s * 0.16, 5, 0.45, '#FFE066', a);
      }
    }
    if (e.kind === 'BOSS' && game.introDone) drawBossGauge(e, cam, camY, s);
    if (e.bubbleT > 0) drawBubble(e, cam, camY, s);
  }
}

// --- わざ -----------------------------------------------------------------
function drawShots(cam, camY, s) {
  for (const sh of game.shots) {
    const x = (sh.x - cam) * s, y = (sh.y - camY) * s;
    if (x < -s * 2 || x > viewW + s * 2) continue;
    const d = sign(sh.vx) || 1;
    if (sh.kind === 'NYA') {
      // こえの わ
      for (let i = 0; i < 3; i++) {
        const k = 0.5 + i * 0.35;
        strokeArc(x - s * 0.4 * k, y - s * 0.4 * k, s * 0.8 * k, s * 0.8 * k,
          d > 0 ? -55 : 125, 110, `rgba(140,220,255,${0.9 - i * 0.25})`, s * 0.09);
      }
      // ★ 小さいと 見えないので 大きく。ふちどりも つける。
      setFont(s * 0.62);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * 0.14; ctx.strokeStyle = 'rgba(40,60,90,0.75)';
      ctx.strokeText('にゃー', x - d * s * 0.55, y + s * 0.02);
      ctx.fillStyle = '#EAF8FF';
      ctx.fillText('にゃー', x - d * s * 0.55, y + s * 0.02);
    } else {
      // しゃー！ ぎざぎざの いき
      const k = 1 - sh.t / sh.life;
      ctx.save();
      ctx.globalAlpha = Math.max(k, 0.2);
      for (let i = 0; i < 4; i++) {
        const yy = y + (i - 1.5) * s * 0.3;
        poly([[x - d * s * 0.5, yy - s * 0.1], [x + d * s * (0.5 + i * 0.12), yy],
          [x - d * s * 0.5, yy + s * 0.1]], i % 2 ? '#FFD6B0' : '#FF8A3A');
      }
      setFont(s * 0.78);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = s * 0.18; ctx.strokeStyle = 'rgba(120,50,10,0.8)';
      ctx.strokeText('しゃー！', x + d * s * 0.5, y - s * 0.62);
      ctx.fillStyle = '#FFE8C8';
      ctx.fillText('しゃー！', x + d * s * 0.5, y - s * 0.62);
      ctx.restore();
    }
  }
}

function drawBolts(cam, camY, s) {
  for (const b of game.bolts) {
    const x = (b.x - cam) * s, y = (b.y - camY) * s;
    if (x < -2 * s || x > viewW + 2 * s) continue;
    const r = b.r * s;
    ctx.save();
    if (b.spin) { ctx.translate(x, y); ctx.rotate(b.t * 9); ctx.translate(-x, -y); }
    fillCircle(x, y, r * 1.3, rgba(b.col, 0.28));
    fillCircle(x, y, r, b.col);
    fillCircle(x - r * 0.3, y - r * 0.32, r * 0.34, 'rgba(255,255,255,0.6)');
    line(x - r * 0.7, y, x + r * 0.7, y, 'rgba(255,255,255,0.5)', r * 0.2);
    ctx.restore();
  }
}

// --- おる -----------------------------------------------------------------
// ペルシャねこ。全身グレー。下半身だけ 毛が ない（サマーカット）。
// 目は とても 大きく まんまる。ぶきっちょな 顔。
// furK … 0 = いつもの おる（下半身は 毛なし）、1 = 全身 もふもふ
//        エンディングで あーたん・くーたんが まほうを かけると 0→1 に なる
function oruSprite(x, y, w, h, faceRight, stepPhase, stretch, puff, furK) {
  const fk = furK || 0;
  const cx = x + w / 2;
  const d = faceRight ? 1 : -1;
  const pw = puff ? 1.18 : 1;
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(1 / stretch, stretch); ctx.translate(-cx, -(y + h));

  // しっぽ … つけねは つるつる、さきだけ ふさふさ（毛が 生えると 全部 ふさふさ）
  const sway = Math.sin(stepPhase * 1.6 + 1) * h * 0.06;
  line(cx - d * w * 0.28, y + h * 0.66, cx - d * w * 0.5, y + h * 0.44 + sway,
    ORU_SKIN_D, w * (0.085 + fk * 0.12));
  if (fk > 0) {
    line(cx - d * w * 0.28, y + h * 0.66, cx - d * w * 0.5, y + h * 0.44 + sway,
      ORU_FUR, w * (0.06 + fk * 0.16));
  }
  fillCircle(cx - d * w * 0.55, y + h * 0.38 + sway, w * (0.13 + fk * 0.06), ORU_FUR);

  // うしろあし・まえあし（毛が ない → まほうで もふもふ）
  const st = Math.sin(stepPhase) * w * 0.1;
  const legW = w * (0.16 + fk * 0.12);
  const legC = fk > 0.5 ? ORU_FUR : ORU_SKIN;
  fillRoundRect(cx - w * 0.28 + st - (legW - w * 0.16) / 2, y + h * 0.76, legW, h * 0.24,
    legW * 0.45, legC);
  fillRoundRect(cx + w * 0.12 - st - (legW - w * 0.16) / 2, y + h * 0.76, legW, h * 0.24,
    legW * 0.45, legC);
  if (fk > 0 && fk <= 0.5) {
    ctx.save(); ctx.globalAlpha = fk * 2;
    fillRoundRect(cx - w * 0.28 + st, y + h * 0.76, w * 0.16, h * 0.24, w * 0.07, ORU_FUR);
    fillRoundRect(cx + w * 0.12 - st, y + h * 0.76, w * 0.16, h * 0.24, w * 0.07, ORU_FUR);
    ctx.restore();
  }
  fillOval(cx - w * 0.3 + st, y + h * 0.94, w * 0.2, h * 0.09, ORU_SKIN_D);
  fillOval(cx + w * 0.1 - st, y + h * 0.94, w * 0.2, h * 0.09, ORU_SKIN_D);

  // 下半身（つるん → まほうで もふもふに なる）
  fillOval(cx - w * 0.32, y + h * 0.5, w * 0.64, h * 0.36, ORU_SKIN);
  fillOval(cx - w * 0.24, y + h * 0.56, w * 0.36, h * 0.18, rgba(ORU_SKIN_D, 0.45));
  if (fk > 0) {
    // 毛が 生えてくる。だんだん こく、だんだん 大きく なる。
    fillOval(cx - w * (0.32 + fk * 0.08), y + h * (0.5 - fk * 0.04),
      w * (0.64 + fk * 0.16), h * (0.38 + fk * 0.16), rgba(ORU_FUR, Math.min(1, fk * 1.5)));
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (i / 9);
      fillCircle(cx + Math.cos(a) * w * (0.3 + fk * 0.06),
        y + h * 0.7 + Math.sin(a) * h * 0.2, w * 0.1 * fk, rgba(ORU_FUR_L, fk));
    }
  }

  // 毛の さかいめ（もこもこの ふち）
  for (let i = 0; i < 6; i++) {
    fillCircle(cx - w * 0.33 + (w * 0.66 * (i + 0.5)) / 6, y + h * (0.5 - fk * 0.03),
      w * (0.1 + fk * 0.04), ORU_FUR);
  }

  // 上半身（もふもふ）
  fillOval(cx - w * 0.44 * pw, y + h * 0.24, w * 0.88 * pw, h * 0.34 * pw, ORU_FUR);
  if (puff) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      fillCircle(cx + Math.cos(a) * w * 0.46, y + h * 0.4 + Math.sin(a) * h * 0.24,
        w * 0.1, ORU_FUR_L);
    }
  }

  // あたま（まんまる・ぺちゃんこ鼻の ペルシャ）
  const hy = y + h * 0.24, hr = w * 0.36 * pw;
  // ほっぺの 毛
  fillCircle(cx - hr * 0.78, hy + hr * 0.36, hr * 0.52, ORU_FUR_L);
  fillCircle(cx + hr * 0.78, hy + hr * 0.36, hr * 0.52, ORU_FUR_L);
  // みみ
  for (const sd of [-1, 1]) {
    poly([[cx + sd * hr * 0.82, hy - hr * 0.42], [cx + sd * hr * 0.62, hy - hr * 1.14],
      [cx + sd * hr * 0.2, hy - hr * 0.72]], ORU_FUR_D);
    poly([[cx + sd * hr * 0.68, hy - hr * 0.5], [cx + sd * hr * 0.58, hy - hr * 0.94],
      [cx + sd * hr * 0.34, hy - hr * 0.68]], rgba(ORU_NOSE, 0.75));
  }
  fillCircle(cx, hy, hr, ORU_FUR);
  fillCircle(cx, hy - hr * 0.2, hr * 0.85, ORU_FUR_L);
  fillCircle(cx, hy, hr * 0.98, rgba(ORU_FUR, 0.0));

  // 目（大きく まんまる）
  const ex = d * hr * 0.06;
  for (const sd of [-1, 1]) {
    fillCircle(cx + sd * hr * 0.4 + ex, hy + hr * 0.02, hr * 0.31, '#FFFFFF');
    fillCircle(cx + sd * hr * 0.4 + ex + d * hr * 0.04, hy + hr * 0.04, hr * 0.22, '#7ACBE0');
    fillCircle(cx + sd * hr * 0.4 + ex + d * hr * 0.04, hy + hr * 0.04, hr * 0.13, INK);
    fillCircle(cx + sd * hr * 0.4 + ex - hr * 0.06, hy - hr * 0.06, hr * 0.08, '#FFFFFF');
  }
  // ぺちゃんこの はなと 口
  poly([[cx - hr * 0.13, hy + hr * 0.38], [cx + hr * 0.13, hy + hr * 0.38],
    [cx, hy + hr * 0.55]], ORU_NOSE);
  strokeArc(cx - hr * 0.28, hy + hr * 0.5, hr * 0.28, hr * 0.22, 20, 140, INK, hr * 0.08);
  strokeArc(cx, hy + hr * 0.5, hr * 0.28, hr * 0.22, 20, 140, INK, hr * 0.08);
  // ひげ
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      line(cx + sd * hr * 0.5, hy + hr * (0.3 + i * 0.14),
        cx + sd * hr * 1.35, hy + hr * (0.12 + i * 0.26), 'rgba(90,85,95,0.55)', hr * 0.045);
    }
  }
  ctx.restore();
}

function drawPlayer(cam, camY, s) {
  const p = game.player;
  const hitW = PLAYER_W * s, hitH = PLAYER_H * s;
  const scale = 1.75 * (p.growT > 0 ? 1 + Math.sin(game.elapsed * 30) * 0.08 : 1);
  const w = hitW * scale, h = hitH * scale;
  const x = (p.x - cam) * s - (w - hitW) / 2;
  const y = (p.y - camY) * s - (h - hitH);
  const cx = x + w / 2;

  if (p.pipeT > 0) {
    const k = 1 - p.pipeT / PIPE_TIME;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w, y - h * 2, w * 3, (y + h * (1 - k)) - (y - h * 2));
    ctx.clip();
    oruSprite(x, y + h * k, w, h, p.faceRight, 0, 1, p.size > 0);
    ctx.restore();
    return;
  }
  if (p.hurtT > 0 && p.starT <= 0 && Math.sin(p.animT * 40) < 0) return;

  const moving = game.phase === 'PLAYING' && (game.inputLeft || game.inputRight) && p.onGround;
  const stepPhase = moving ? p.animT * 13 : 0;
  const air = !p.onGround;
  const stretch = air ? clamp(1 + p.vy / 60, 0.86, 1.16) : 1 + Math.sin(p.animT * 13) * 0.03;

  if (p.starT > 0) {
    const a = (Math.sin(p.animT * 12) * 0.5 + 0.5) * 0.55;
    fillCircle(cx, y + h * 0.5, w * 0.85, rgba(MATATABI_A, a));
  }
  if (p.featherT > 0) {
    const flap = Math.abs(Math.sin(p.animT * (air ? 14 : 5)));
    for (const side of [-1, 1]) {
      fillOval(cx + side * w * 0.42 - (side < 0 ? w * 0.32 : 0), y + h * 0.2,
        w * 0.32, h * (0.28 + flap * 0.3), 'rgba(239,255,244,0.9)');
    }
  }

  oruSprite(x, y, w, h, p.faceRight, stepPhase, stretch, p.size > 0);

  // あーたんに ねかしつけられて いる あいだ
  if (p.sleepT > 0) {
    for (let i = 0; i < 3; i++) {
      const k = (game.elapsed * 0.9 + i * 0.33) % 1;
      ctx.save();
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.95;
      setFont(w * (0.34 + k * 0.2));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFF3C4';
      ctx.fillText('z', cx + w * (0.4 + k * 0.5), y - h * 0.1 - k * h * 0.5);
      ctx.restore();
    }
  }

  // わざを もっている しるし
  if (p.weapon && p.hammerT <= 0) {
    const hx = cx + (p.faceRight ? w * 0.46 : -w * 0.46);
    drawWeaponIcon(p.weapon, hx, y + h * 0.62, w * 0.24, game.elapsed);
  }
  // ねこパンチ
  if (p.hammerT > 0) {
    const k = 1 - p.hammerT / HAMMER_SWING;
    const d = p.faceRight ? 1 : -1;
    const px = cx + d * w * (0.3 + k * 0.5);
    const py = y + h * 0.5;
    fillCircle(px, py, w * 0.2, ORU_FUR);
    for (let i = 0; i < 4; i++) {
      const a = (-140 + i * 33) * Math.PI / 180;
      fillCircle(px + Math.cos(a) * w * 0.2, py + Math.sin(a) * w * 0.2, w * 0.07, ORU_SKIN);
    }
    fillCircle(px, py + w * 0.05, w * 0.1, ORU_NOSE);
    for (let i = 0; i < 3; i++) {
      line(px + d * w * 0.2, py - w * 0.2 + i * w * 0.2,
        px + d * w * 0.42, py - w * 0.26 + i * w * 0.26, 'rgba(255,255,255,0.8)', w * 0.05);
    }
  }
  if (p.magnetT > 0) {
    const a = (Math.sin(p.animT * 6) * 0.5 + 0.5) * 0.25;
    strokeCircle(cx, y + h * 0.5, MAGNET_RANGE * s, rgba(NIOI_A, a), s * 0.06);
  }
}

// --- くらやみ -------------------------------------------------------------
function drawDark(cam, camY, s) {
  const p = game.player;
  const cx = (p.x + PLAYER_W / 2 - cam) * s;
  const cy = (p.y + PLAYER_H / 2 - camY) * s;
  const r = s * (p.starT > 0 ? 8 : 5.2);
  const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0.88)');
  fillRect(0, 0, viewW, viewH, g);
}

// --- 水中の いろあい -------------------------------------------------------
function drawWaterTint(cam, camY, s) {
  if (!game.player.inWater) return;
  fillRect(0, 0, viewW, viewH, 'rgba(40,140,200,0.16)');
}
