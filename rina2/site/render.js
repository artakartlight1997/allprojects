'use strict';
// 絵。ぜんぶ canvas に その場で かく（画像ファイルは 1つも つかわない）。

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });

const game = new Game();
let uiScale = save.btn;
let viewW = 0, viewH = 0;

const ui = {
  left: null, right: null, up: null, down: null, jump: null, fire: null,
  overlayBtn: null, sizeBtns: [], stageBtns: [], fsBtn: null, hubBtn: null, pageBtns: [],
};

// --- 色 -------------------------------------------------------------------
const RINA_BODY = '#FF9EC4', RINA_DARK = '#E979AC', RINA_FOOT = '#FFE0EC';
const INK = '#41303A', CHEEK = '#FF6F9C';
const PUNI_BODY = '#86DC64', PUNI_DARK = '#5FB841';
const TOGE_BODY = '#B289E8', TOGE_DARK = '#8A5FC9';
const PATA_BODY = '#7BD5F2', PATA_DARK = '#4FB2D6';
const PYON_BODY = '#FFC163', PYON_DARK = '#E0913A';
const OIKA_BODY = '#FF7F6B', OIKA_DARK = '#D9553F';
const SLIME_BODY = '#5FD1C9', SLIME_DARK = '#3AA79F', SLIME_HI = '#C8FBF6';
const DON_BODY = '#D9A566', DON_CAP = '#7A5334';
const GHOST_BODY = '#EDE4FF', GHOST_DARK = '#B9A9D8';
const FISH_BODY = '#FF9A5A', FISH_DARK = '#D96A32';
const ROBO_BODY = '#B9C4D6', ROBO_DARK = '#7C8AA0';
const BARREL_A = '#C8813C', BARREL_B = '#8A5626';
const MINION_BODY = '#FFB3D0', MINION_DARK = '#E07FA6';
const COIN_A = '#FFD84D', COIN_B = '#FFF3B0', COIN_C = '#E0A81E';
const GEM_A = '#6BE3E0', GEM_B = '#B6FFFD';
const LIFE_A = '#FF6B8A', STAR_A = '#FFE066';
const FEATHER_A = '#B2F5C4', MAGNET_A = '#FF7A7A';
const CAKE_A = '#FFF0F5', CAKE_B = '#FF8FB8';
const ICE_A = '#CFF0FF';

// --- テーマ ---------------------------------------------------------------
// bg: 背景の 描きかた（HILL 丘 / ROOM 部屋 / SEA 海 / SPACE 宇宙 /
//     ART 絵の具 / TOWER てっこつ / CANDY おかし）
function pal(bg, skyTop, skyBottom, backC, frontC, dirt, dirtDark, surface,
  platform, cloud, cloudA, hazard, hazardBase, night) {
  return { bg, skyTop, skyBottom, hillBack: backC, hillFront: frontC, dirt, dirtDark,
    surface, platform, cloud, cloudA, hazard, hazardBase, night };
}

const PALETTES = {
  HOUSE: pal('ROOM', '#FFE2C4', '#FFD0B0', '#E8B98F', '#D9A06E', '#C08A54', '#98673A',
    '#E0A96B', '#D9B37A', '#FFFFFF', 0.4, '#D6DDE6', '#9AA6B5', false),
  GARDEN: pal('HILL', '#7EC8F5', '#D6F0FF', '#9AD98C', '#6FC162', '#B5793F', '#8E5A2B',
    '#6FC162', '#CE9A5E', '#FFFFFF', 0.75, '#D6DDE6', '#9AA6B5', false),
  SCHOOL: pal('ROOM', '#DCE8F5', '#F2F6FA', '#C4D4E4', '#A8BCD0', '#C9B79A', '#9C8A70',
    '#D8C8A8', '#C0AE90', '#FFFFFF', 0.4, '#D6DDE6', '#9AA6B5', false),
  MUSIC: pal('ROOM', '#F0E0FA', '#FBF2FF', '#D8C0EC', '#BCA0D8', '#A88AC0', '#84689C',
    '#C4A8DC', '#B294CC', '#FFFFFF', 0.4, '#D6DDE6', '#9AA6B5', false),
  GYM: pal('ROOM', '#FFF2D8', '#FFE8C0', '#E8D0A0', '#D4B884', '#C89A5E', '#A07440',
    '#DCB878', '#C8A468', '#FFFFFF', 0.4, '#D6DDE6', '#9AA6B5', false),
  SEA: pal('SEA', '#2E90B8', '#8FE0EC', '#3E9CB0', '#2A7E96', '#5E9CA8', '#3F7484',
    '#8FE3E8', '#79C4CE', '#DFF7FF', 0.5, '#B9EAF2', '#6FA8B5', false),
  DEEP: pal('SEA', '#0E3A5C', '#1E6B8C', '#17567A', '#0F3F5C', '#2E5E74', '#1E4254',
    '#4E9CB0', '#3E8296', '#9FE0F0', 0.3, '#B9EAF2', '#6FA8B5', true),
  CORAL: pal('SEA', '#2A6EA0', '#7ED0E8', '#E88AA8', '#D06A8C', '#C87A96', '#9C5470',
    '#FFB0C8', '#E894B0', '#FFE0EC', 0.5, '#FFC0D0', '#C87A96', false),
  CANDY: pal('CANDY', '#FFC0DC', '#FFF0F5', '#FFA8CC', '#FF8FBB', '#E88AB0', '#C46A8E',
    '#FFC8DC', '#FFB0CC', '#FFFFFF', 0.7, '#FFD24A', '#E8A030', false),
  FOREST: pal('HILL', '#4A8C6A', '#A8D8B0', '#2E6B4A', '#1F5238', '#5E7A4A', '#3E5632',
    '#7ABE6A', '#8A9C5E', '#D8F0D8', 0.4, '#D6DDE6', '#9AA6B5', false),
  CLOUD: pal('HILL', '#FFA46B', '#FFE3C4', '#FFC48A', '#FFB073', '#E8E0F5', '#C9BEE0',
    '#FFFFFF', '#EDE4FA', '#FFFFFF', 0.85, '#D6DDE6', '#9AA6B5', false),
  PAINT: pal('ART', '#FFF0C0', '#FFE0E8', '#FFC8A0', '#FFA8C0', '#B98FE0', '#8A64B0',
    '#FFD24A', '#7ADCB0', '#FFFFFF', 0.5, '#FF6FA8', '#C84A80', false),
  MUSEUM: pal('ART', '#2A2440', '#4A3A60', '#3A3050', '#2A2438', '#6B5A8A', '#4A3D63',
    '#8E79B5', '#7C6AA0', '#C8B0FF', 0.25, '#D6DDE6', '#9AA6B5', true),
  CRAYON: pal('ART', '#FFF8E0', '#FFFFFF', '#FFE0A0', '#FFC46A', '#F0A8C0', '#C87A96',
    '#8AD8F0', '#FFD24A', '#FFFFFF', 0.6, '#FF8A3A', '#C85A20', false),
  FACTORY: pal('TOWER', '#3A3448', '#5C5470', '#4A4258', '#332E42', '#6E6A80', '#4E4A60',
    '#9AA0B0', '#8A90A0', '#C0C0D0', 0.25, '#FF9E3D', '#CF5320', true),
  DKTOWER: pal('TOWER', '#1E2440', '#3A4470', '#2A3050', '#1E2438', '#C85A3A', '#96401F',
    '#E87A4A', '#D06A3A', '#FFC0A0', 0.2, '#FF9E3D', '#CF5320', true),
  ROCKET: pal('SPACE', '#20264A', '#4A5490', '#333C6A', '#242A4C', '#7A7A96', '#585874',
    '#A0A0BC', '#8E8EAC', '#C8D0FF', 0.3, '#FF9E3D', '#CF5320', true),
  STATION: pal('SPACE', '#0E1230', '#242A54', '#1A2044', '#12162E', '#8A94B0', '#626A84',
    '#B0BAD4', '#9AA4C0', '#D0D8FF', 0.25, '#8AD8F0', '#4A8AA0', true),
  MOON: pal('SPACE', '#101430', '#2A2E50', '#4A4A62', '#34344A', '#9A9AAE', '#74748A',
    '#C4C4D4', '#B0B0C4', '#E0E0F0', 0.2, '#D6DDE6', '#9AA6B5', true),
  HOLE: pal('SPACE', '#140A24', '#3A1A4C', '#2A1238', '#1A0A26', '#5E3A78', '#402452',
    '#8A5AA8', '#734A90', '#C88AFF', 0.3, '#FF6FA8', '#C84A80', true),
  DREAM: pal('SPACE', '#3A2A6A', '#8A6ACC', '#5A44A0', '#42307C', '#7A6AB0', '#584A88',
    '#A896D8', '#9484C8', '#FFE0FF', 0.4, '#FFD24A', '#E8A030', true),
  MIRROR: pal('ART', '#B0C8E8', '#E8F2FF', '#8AA8D0', '#6E8AB4', '#8A9CB8', '#68788E',
    '#C0D4EC', '#A8BCD8', '#FFFFFF', 0.6, '#D6DDE6', '#9AA6B5', false),
  DRAGON: pal('HILL', '#3A1B22', '#8C3A2E', '#5E2A2A', '#421F20', '#6B4038', '#4A2A26',
    '#8F5240', '#7A4536', '#FFB37A', 0.3, '#FF9E3D', '#CF5320', true),
  SKYTOWER: pal('TOWER', '#141A3A', '#3A3A72', '#232A55', '#1A1F42', '#4C4E85', '#34365F',
    '#7E80C4', '#6567A8', '#C6C9FF', 0.3, '#D6DDE6', '#9AA6B5', true),
  CASTLE: pal('TOWER', '#2E2440', '#6B4E7A', '#453255', '#33253F', '#7A6A88', '#574A63',
    '#9C89AD', '#8A7799', '#E0C8FF', 0.3, '#FF9E3D', '#CF5320', true),
  // どかんの さきの ちか。どのステージでも 同じ 見ため。
  CAVE_SUB: pal('CAVE', '#241B3D', '#3E2C58', '#3A2B57', '#2C2043', '#6B5A8A', '#4A3D63',
    '#8E79B5', '#7C6AA0', '#B79CFF', 0.2, '#D6DDE6', '#9AA6B5', true),
};
function paletteOf(theme) { return PALETTES[theme] || PALETTES.GARDEN; }

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
function drawCoin(cx, cy, r, t) {
  const sq = Math.max(Math.abs(Math.cos(t * 3.2)), 0.18);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sq, 1); ctx.translate(-cx, -cy);
  fillCircle(cx, cy, r, COIN_C);
  fillCircle(cx, cy, r * 0.84, COIN_A);
  fillCircle(cx - r * 0.22, cy - r * 0.24, r * 0.34, COIN_B);
  ctx.restore();
}
function drawGem(cx, cy, r, t) {
  const sq = 0.7 + Math.abs(Math.cos(t * 2.2)) * 0.3;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sq, 1); ctx.translate(-cx, -cy);
  poly([[cx, cy - r], [cx + r * 0.78, cy - r * 0.15], [cx, cy + r], [cx - r * 0.78, cy - r * 0.15]], GEM_A);
  poly([[cx, cy - r], [cx + r * 0.3, cy - r * 0.2], [cx, cy + r * 0.15], [cx - r * 0.3, cy - r * 0.2]], GEM_B);
  ctx.restore();
}
function drawLife(cx, cy, r) {
  fillCircle(cx - r * 0.42, cy - r * 0.28, r * 0.52, LIFE_A);
  fillCircle(cx + r * 0.42, cy - r * 0.28, r * 0.52, LIFE_A);
  poly([[cx - r * 0.9, cy - r * 0.16], [cx, cy + r * 0.92], [cx + r * 0.9, cy - r * 0.16]], LIFE_A);
  fillCircle(cx - r * 0.42, cy - r * 0.4, r * 0.16, 'rgba(255,255,255,0.75)');
}
function drawCake(cx, cy, r) {
  fillOval(cx - r, cy - r * 0.1, r * 2, r * 1.1, '#D98A5A');
  fillOval(cx - r, cy - r * 0.55, r * 2, r * 0.9, CAKE_A);
  fillOval(cx - r * 0.95, cy - r * 0.75, r * 1.9, r * 0.7, CAKE_B);
  for (let i = 0; i < 3; i++) {
    fillCircle(cx - r * 0.5 + i * r * 0.5, cy - r * 0.85, r * 0.18, '#FF4A78');
  }
  line(cx, cy - r * 1.5, cx, cy - r * 0.9, '#FFD24A', r * 0.16);
  fillCircle(cx, cy - r * 1.62, r * 0.16, '#FFF0A0');
}
function drawBadge(cx, cy, r, color, t) {
  const glow = (Math.sin(t * 4) * 0.5 + 0.5) * 0.3;
  fillCircle(cx, cy, r * 1.28, rgba(color, 0.35 + glow));
  fillCircle(cx, cy, r, color);
  fillCircle(cx - r * 0.34, cy - r * 0.38, r * 0.3, 'rgba(255,255,255,0.4)');
}
function drawWeaponIcon(key, cx, cy, r, t) {
  const w = WEAPONS[key];
  drawBadge(cx, cy, r, w.col, t);
  if (key === 'HEART') {
    drawLife(cx, cy, r * 0.62);
  } else if (key === 'ICE') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      line(cx - Math.cos(a) * r * 0.7, cy - Math.sin(a) * r * 0.7,
        cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, '#FFFFFF', r * 0.17);
    }
  } else if (key === 'BOOM') {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 6);
    poly([[-r * 0.7, r * 0.2], [0, -r * 0.7], [r * 0.7, r * 0.2],
      [r * 0.2, r * 0.1], [0, -r * 0.2], [-r * 0.2, r * 0.1]], '#FFFFFF');
    ctx.restore();
  } else {
    fillRect(cx - r * 0.12, cy - r * 0.1, r * 0.24, r * 0.85, '#8A5A2A');
    fillRoundRect(cx - r * 0.62, cy - r * 0.72, r * 1.24, r * 0.6, r * 0.14, '#E8E8F0');
  }
}
function drawPickupIcon(kind, cx, cy, r, t) {
  switch (kind) {
    case 'COIN': drawCoin(cx, cy, r * 0.9, t); break;
    case 'GEM': drawGem(cx, cy, r, t); break;
    case 'LIFE': drawLife(cx, cy, r); break;
    case 'CAKE': drawCake(cx, cy, r * 0.95); break;
    case 'STAR': starPoly(cx, cy, r * 1.15, 5, 0.45, STAR_A, t * 1.6);
      fillCircle(cx - r * 0.16, cy - r * 0.18, r * 0.14, 'rgba(255,255,255,0.85)'); break;
    case 'FEATHER':
      drawBadge(cx, cy, r, FEATHER_A, t);
      fillOval(cx - r * 0.3, cy - r * 0.55, r * 0.6, r * 0.95, '#FFFFFF');
      line(cx, cy - r * 0.5, cx, cy + r * 0.55, '#6BAF88', r * 0.1);
      break;
    case 'MAGNET':
      drawBadge(cx, cy, r, MAGNET_A, t);
      strokeArc(cx - r * 0.44, cy - r * 0.3, r * 0.88, r * 0.88, 180, 180, '#FFFFFF', r * 0.26);
      fillRect(cx - r * 0.44, cy + r * 0.14, r * 0.26, r * 0.3, '#FFFFFF');
      fillRect(cx + r * 0.18, cy + r * 0.14, r * 0.26, r * 0.3, '#FFFFFF');
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
    const bob = Math.sin(pk.t * 3 + pk.x) * s * 0.08;
    // アイテムは 大きめに 描く（見つけやすいように）
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

// --- 敵 -------------------------------------------------------------------
function eyes(cx, cy, w, spread, size, look) {
  fillCircle(cx - w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx + w * spread + look, cy, w * size, '#FFFFFF');
  fillCircle(cx - w * spread * 0.85 + look, cy + w * 0.01, w * size * 0.5, INK);
  fillCircle(cx + w * spread * 1.15 + look, cy + w * 0.01, w * size * 0.5, INK);
}
function smile(cx, cy, w, h) { strokeArc(cx - w * 0.11, cy, w * 0.22, h * 0.13, 20, 140, INK, w * 0.042); }

function drawWalker(x, y, w, h, t, right) {
  const cx = x + w / 2;
  const squash = 1 + Math.sin(t * 8) * 0.06;
  const bodyR = w * 0.46;
  const step = Math.sin(t * 8) * w * 0.12;
  fillOval(cx - w * 0.36 + step, y + h * 0.78, w * 0.3, h * 0.24, PUNI_DARK);
  fillOval(cx + w * 0.06 - step, y + h * 0.78, w * 0.3, h * 0.24, PUNI_DARK);
  ctx.save(); ctx.translate(cx, y + h); ctx.scale(1 / squash, squash); ctx.translate(-cx, -(y + h));
  fillCircle(cx, y + h * 0.48, bodyR, PUNI_BODY);
  fillArc(cx - bodyR, y + h * 0.48 - bodyR * 0.1, bodyR * 2, bodyR * 1.1, 0, 180, PUNI_DARK);
  ctx.restore();
  eyes(cx, y + h * 0.4, w, 0.17, 0.15, right ? w * 0.06 : -w * 0.06);
  smile(cx, y + h * 0.5, w, h);
}
function drawSpiky(x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h * 0.52, r = w * 0.4;
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 - 90) * Math.PI) / 180;
    poly([[cx + Math.cos(a - 0.28) * r, cy + Math.sin(a - 0.28) * r],
      [cx + Math.cos(a) * r * 1.52, cy + Math.sin(a) * r * 1.52],
      [cx + Math.cos(a + 0.28) * r, cy + Math.sin(a + 0.28) * r]], TOGE_DARK);
  }
  fillCircle(cx, cy, r, TOGE_BODY);
  fillCircle(cx, cy + r * 0.2, r * 0.72, rgba(TOGE_DARK, 0.35));
  eyes(cx, cy - h * 0.04, w, 0.15, 0.14, 0);
  const lw = w * 0.055;
  line(cx - w * 0.28, cy - h * 0.2, cx - w * 0.04, cy - h * 0.11, INK, lw);
  line(cx + w * 0.28, cy - h * 0.2, cx + w * 0.04, cy - h * 0.11, INK, lw);
  strokeArc(cx - w * 0.1, cy + h * 0.16, w * 0.2, h * 0.12, 200, 140, INK, w * 0.04);
}
function drawFlyer(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5, r = w * 0.34;
  const flap = Math.abs(Math.sin(t * 9));
  for (const side of [-1, 1]) {
    fillOval(cx + side * r * 0.55 - (side < 0 ? r * 0.7 : 0), cy - r * 0.5,
      r * 0.7, r * (0.5 + flap * 0.9), rgba(PATA_DARK, 0.9));
  }
  fillCircle(cx, cy, r, PATA_BODY);
  fillCircle(cx - r * 0.25, cy - r * 0.3, r * 0.55, 'rgba(255,255,255,0.35)');
  eyes(cx, cy - h * 0.02, w, 0.13, 0.13, right ? w * 0.04 : -w * 0.04);
  const bx = cx + (right ? r * 0.85 : -r * 0.85);
  poly([[bx, cy + h * 0.02], [bx + (right ? r * 0.45 : -r * 0.45), cy + h * 0.09],
    [bx, cy + h * 0.16]], '#FFC24D');
}
function drawJumper(x, y, w, h, t, air) {
  const cx = x + w / 2;
  const stretch = air ? 1.16 : 1 + Math.sin(t * 6) * 0.05;
  const coilTop = y + h * 0.66;
  for (let i = 0; i < 3; i++) {
    strokeArc(cx - w * 0.24, coilTop + h * 0.1 * i, w * 0.48, h * 0.16, 0, 180, PYON_DARK, w * 0.07);
  }
  ctx.save(); ctx.translate(cx, y + h); ctx.scale(1 / stretch, stretch); ctx.translate(-cx, -(y + h));
  ctx.fillStyle = PYON_BODY;
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.02);
  ctx.bezierCurveTo(cx + w * 0.52, y + h * 0.22, cx + w * 0.46, y + h * 0.72, cx, y + h * 0.72);
  ctx.bezierCurveTo(cx - w * 0.46, y + h * 0.72, cx - w * 0.52, y + h * 0.22, cx, y + h * 0.02);
  ctx.closePath(); ctx.fill();
  fillOval(cx - w * 0.2, y + h * 0.42, w * 0.4, h * 0.22, 'rgba(255,255,255,0.4)');
  ctx.restore();
  eyes(cx, y + h * 0.36, w, 0.15, 0.14, 0);
  smile(cx, y + h * 0.46, w, h);
}
function drawChaser(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5, r = w * 0.42;
  for (let i = 0; i < 3; i++) {
    const off = (right ? -1 : 1) * (r * (1.2 + i * 0.35));
    line(cx + off, cy - h * 0.16 + i * h * 0.16,
      cx + off - (right ? -1 : 1) * r * 0.5, cy - h * 0.16 + i * h * 0.16,
      rgba(OIKA_DARK, 0.35), h * 0.05);
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
function drawHopper(x, y, w, h, t, air) {
  const cx = x + w / 2;
  const squash = air ? 1.18 : 1 + Math.sin(t * 5) * 0.07;
  ctx.save(); ctx.translate(cx, y + h); ctx.scale(1 / squash, squash); ctx.translate(-cx, -(y + h));
  ctx.fillStyle = SLIME_BODY;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.48, y + h);
  ctx.bezierCurveTo(cx - w * 0.5, y + h * 0.1, cx + w * 0.5, y + h * 0.1, cx + w * 0.48, y + h);
  ctx.closePath(); ctx.fill();
  fillOval(cx - w * 0.3, y + h * 0.55, w * 0.6, h * 0.4, rgba(SLIME_DARK, 0.35));
  fillOval(cx - w * 0.26, y + h * 0.2, w * 0.3, h * 0.24, rgba(SLIME_HI, 0.8));
  ctx.restore();
  eyes(cx, y + h * 0.52, w, 0.16, 0.14, 0);
  smile(cx, y + h * 0.64, w, h);
}
function drawDropper(x, y, w, h, t, hanging) {
  const cx = x + w / 2;
  if (hanging) line(cx, y - h * 1.4, cx, y + h * 0.1, 'rgba(255,255,255,0.6)', w * 0.04);
  const sway = hanging ? Math.sin(t * 2.2) * w * 0.05 : 0;
  const cxs = cx + sway;
  fillOval(cxs - w * 0.36, y + h * 0.22, w * 0.72, h * 0.74, DON_BODY);
  fillArc(cxs - w * 0.42, y + h * 0.02, w * 0.84, h * 0.5, 180, 180, DON_CAP);
  fillRoundRect(cxs - w * 0.05, y - h * 0.1, w * 0.1, h * 0.16, w * 0.05, DON_CAP);
  const eyeY = y + h * 0.52;
  if (hanging) { eyes(cxs, eyeY, w, 0.14, 0.12, 0); smile(cxs, y + h * 0.62, w, h); }
  else {
    fillCircle(cxs - w * 0.15, eyeY, w * 0.14, '#FFFFFF');
    fillCircle(cxs + w * 0.15, eyeY, w * 0.14, '#FFFFFF');
    fillCircle(cxs - w * 0.15, eyeY, w * 0.05, INK);
    fillCircle(cxs + w * 0.15, eyeY, w * 0.05, INK);
    fillOval(cxs - w * 0.07, y + h * 0.66, w * 0.14, h * 0.14, INK);
  }
}
function drawGhost(x, y, w, h, t, shy) {
  const cx = x + w / 2, cy = y + h * 0.48;
  const wob = Math.sin(t * 3) * h * 0.04;
  fillCircle(cx, cy + wob, w * 0.42, rgba(GHOST_BODY, 0.9));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const bx = cx - w * 0.4 + (w * 0.8 * (i + 0.5)) / n;
    fillCircle(bx, cy + w * 0.36 + wob + Math.sin(t * 6 + i) * h * 0.03, w * 0.11, rgba(GHOST_BODY, 0.9));
  }
  fillCircle(cx - w * 0.14, cy + wob, w * 0.16, 'rgba(255,255,255,0.5)');
  if (shy) {
    // 見られると 手で 顔を かくす
    fillCircle(cx - w * 0.15, cy + wob, w * 0.11, GHOST_DARK);
    fillCircle(cx + w * 0.15, cy + wob, w * 0.11, GHOST_DARK);
    strokeArc(cx - w * 0.1, cy + h * 0.16 + wob, w * 0.2, h * 0.1, 200, 140, INK, w * 0.04);
  } else {
    eyes(cx, cy + wob, w, 0.16, 0.13, 0);
    fillOval(cx - w * 0.09, cy + h * 0.14 + wob, w * 0.18, h * 0.13, INK);
  }
}
function drawFish(x, y, w, h, t, right) {
  const cx = x + w / 2, cy = y + h * 0.5;
  const d = right ? 1 : -1;
  poly([[cx - d * w * 0.36, cy], [cx - d * w * 0.55, cy - h * 0.3],
    [cx - d * w * 0.55, cy + h * 0.3]], FISH_DARK);
  fillOval(cx - w * 0.4, cy - h * 0.36, w * 0.8, h * 0.72, FISH_BODY);
  fillOval(cx - w * 0.24, cy - h * 0.3, w * 0.42, h * 0.3, 'rgba(255,255,255,0.3)');
  const bump = Math.sin(t * 5) * h * 0.06;
  poly([[cx, cy - h * 0.32], [cx - d * w * 0.16, cy - h * 0.52 - bump],
    [cx + d * w * 0.1, cy - h * 0.3]], FISH_DARK);
  fillCircle(cx + d * w * 0.2, cy - h * 0.08, w * 0.11, '#FFFFFF');
  fillCircle(cx + d * w * 0.23, cy - h * 0.08, w * 0.055, INK);
  strokeArc(cx + d * w * 0.16, cy + h * 0.08, w * 0.18, h * 0.12, 20, 140, INK, w * 0.035);
}
function drawRobo(x, y, w, h, t, right) {
  const cx = x + w / 2;
  fillRoundRect(cx - w * 0.36, y + h * 0.3, w * 0.72, h * 0.62, w * 0.12, ROBO_BODY);
  fillRoundRect(cx - w * 0.3, y + h * 0.06, w * 0.6, h * 0.3, w * 0.12, ROBO_DARK);
  const ex = right ? w * 0.05 : -w * 0.05;
  fillCircle(cx - w * 0.12 + ex, y + h * 0.2, w * 0.09, '#FF5A5A');
  fillCircle(cx + w * 0.12 + ex, y + h * 0.2, w * 0.09, '#FF5A5A');
  fillRect(cx - w * 0.02, y - h * 0.04, w * 0.04, h * 0.12, ROBO_DARK);
  fillCircle(cx, y - h * 0.06, w * 0.07, '#FFD24A');
  const gun = right ? w * 0.36 : -w * 0.36;
  fillRoundRect(cx + gun - (right ? 0 : w * 0.2), y + h * 0.44, w * 0.2, h * 0.16, w * 0.05, ROBO_DARK);
  fillRect(cx - w * 0.24, y + h * 0.92, w * 0.16, h * 0.1, ROBO_DARK);
  fillRect(cx + w * 0.08, y + h * 0.92, w * 0.16, h * 0.1, ROBO_DARK);
  for (let i = 0; i < 3; i++) {
    fillRect(cx - w * 0.2 + i * w * 0.16, y + h * 0.48, w * 0.1, h * 0.06,
      (Math.floor(t * 4) % 3) === i ? '#7ADC80' : 'rgba(0,0,0,0.25)');
  }
}
function drawBarreler(x, y, w, h, t, right) {
  const cx = x + w / 2;
  fillOval(cx - w * 0.42, y + h * 0.28, w * 0.84, h * 0.66, '#8A5A3A');
  fillCircle(cx, y + h * 0.22, w * 0.3, '#A87050');
  const ex = right ? w * 0.05 : -w * 0.05;
  eyes(cx, y + h * 0.2, w, 0.13, 0.11, ex);
  strokeArc(cx - w * 0.12, y + h * 0.3, w * 0.24, h * 0.1, 200, 140, INK, w * 0.04);
  const swing = Math.sin(t * 4) * w * 0.1;
  fillRoundRect(cx + (right ? w * 0.3 : -w * 0.5) + swing, y + h * 0.4, w * 0.24, h * 0.3, w * 0.07, BARREL_A);
}
function drawBarrel(x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 7); ctx.translate(-cx, -cy);
  fillRoundRect(x + w * 0.04, y + h * 0.04, w * 0.92, h * 0.92, w * 0.22, BARREL_A);
  fillRect(x + w * 0.04, y + h * 0.28, w * 0.92, h * 0.1, BARREL_B);
  fillRect(x + w * 0.04, y + h * 0.62, w * 0.92, h * 0.1, BARREL_B);
  line(x + w * 0.3, y + h * 0.08, x + w * 0.3, y + h * 0.92, rgba(BARREL_B, 0.6), w * 0.05);
  line(x + w * 0.68, y + h * 0.08, x + w * 0.68, y + h * 0.92, rgba(BARREL_B, 0.6), w * 0.05);
  ctx.restore();
}
function drawMinion(x, y, w, h, t, right) {
  const cx = x + w / 2;
  const bob = Math.sin(t * 9) * h * 0.06;
  fillCircle(cx, y + h * 0.55 + bob, w * 0.42, MINION_BODY);
  fillArc(cx - w * 0.42, y + h * 0.5 + bob, w * 0.84, h * 0.5, 0, 180, MINION_DARK);
  eyes(cx, y + h * 0.48 + bob, w, 0.16, 0.14, right ? w * 0.05 : -w * 0.05);
  smile(cx, y + h * 0.6 + bob, w, h);
}

// --- ボス -----------------------------------------------------------------
// かたち は 10しゅるい。色と 大きさと 名前で 25たい ぶんの ちがいを 出す。
function bossEyes(cx, cy, w, angry, look) {
  fillCircle(cx - w * 0.16 + look, cy, w * 0.11, '#FFFFFF');
  fillCircle(cx + w * 0.16 + look, cy, w * 0.11, '#FFFFFF');
  fillCircle(cx - w * 0.15 + look, cy + w * 0.01, w * 0.055, INK);
  fillCircle(cx + w * 0.17 + look, cy + w * 0.01, w * 0.055, INK);
  if (angry) {
    line(cx - w * 0.26, cy - w * 0.16, cx - w * 0.07, cy - w * 0.07, INK, w * 0.035);
    line(cx + w * 0.26, cy - w * 0.16, cx + w * 0.07, cy - w * 0.07, INK, w * 0.035);
  }
}
function bossMouth(cx, cy, w, open) {
  if (open) {
    fillArc(cx - w * 0.16, cy - w * 0.1, w * 0.32, w * 0.28, 0, 180, '#7A2A3A');
    fillArc(cx - w * 0.12, cy + w * 0.03, w * 0.24, w * 0.12, 0, 180, '#FF8FA8');
  } else {
    strokeArc(cx - w * 0.14, cy - w * 0.05, w * 0.28, w * 0.16, 20, 140, INK, w * 0.035);
  }
}

function drawBossShape(shape, x, y, w, h, t, right, col, col2, charging) {
  const cx = x + w / 2;
  const look = right ? w * 0.03 : -w * 0.03;
  const breathe = 1 + Math.sin(t * 2.4) * 0.035;
  ctx.save();
  ctx.translate(cx, y + h); ctx.scale(breathe, breathe); ctx.translate(-cx, -(y + h));
  switch (shape) {
    case 'BLOB': {
      fillCircle(cx, y + h * 0.55, w * 0.46, col);
      fillArc(cx - w * 0.46, y + h * 0.5, w * 0.92, h * 0.55, 0, 180, col2);
      fillOval(cx - w * 0.3, y + h * 0.24, w * 0.28, h * 0.18, 'rgba(255,255,255,0.4)');
      // かんむり
      poly([[cx - w * 0.2, y + h * 0.14], [cx - w * 0.12, y - h * 0.02],
        [cx, y + h * 0.1], [cx + w * 0.12, y - h * 0.02], [cx + w * 0.2, y + h * 0.14]], '#FFD24A');
      break;
    }
    case 'ROBO': {
      fillRoundRect(cx - w * 0.4, y + h * 0.28, w * 0.8, h * 0.6, w * 0.1, col);
      fillRoundRect(cx - w * 0.3, y + h * 0.04, w * 0.6, h * 0.3, w * 0.1, col2);
      fillRect(cx - w * 0.52, y + h * 0.34, w * 0.12, h * 0.42, col2);
      fillRect(cx + w * 0.4, y + h * 0.34, w * 0.12, h * 0.42, col2);
      fillRect(cx - w * 0.02, y - h * 0.06, w * 0.04, h * 0.12, col2);
      fillCircle(cx, y - h * 0.09, w * 0.06, charging ? '#FF5A5A' : '#7ADC80');
      for (let i = 0; i < 4; i++) {
        fillRect(cx - w * 0.26 + i * w * 0.15, y + h * 0.45, w * 0.09, h * 0.08,
          (Math.floor(t * 5) % 4) === i ? '#FFD24A' : 'rgba(0,0,0,0.3)');
      }
      break;
    }
    case 'DRAGON': {
      fillOval(cx - w * 0.44, y + h * 0.34, w * 0.88, h * 0.56, col);
      for (let i = 0; i < 4; i++) {
        poly([[cx - w * 0.3 + i * w * 0.2, y + h * 0.34],
          [cx - w * 0.22 + i * w * 0.2, y + h * 0.1],
          [cx - w * 0.14 + i * w * 0.2, y + h * 0.34]], col2);
      }
      const d = right ? 1 : -1;
      fillOval(cx + d * w * 0.22 - w * 0.22, y + h * 0.06, w * 0.44, h * 0.34, col);
      poly([[cx + d * w * 0.4, y + h * 0.2], [cx + d * w * 0.62, y + h * 0.26],
        [cx + d * w * 0.4, y + h * 0.32]], col2);
      fillOval(cx - d * w * 0.52, y + h * 0.4, w * 0.36, h * 0.3, rgba(col2, 0.85));
      break;
    }
    case 'GHOST': {
      fillCircle(cx, y + h * 0.5, w * 0.44, rgba(col, 0.92));
      const n = 5;
      for (let i = 0; i < n; i++) {
        const bx = cx - w * 0.42 + (w * 0.84 * (i + 0.5)) / n;
        fillCircle(bx, y + h * 0.9 + Math.sin(t * 5 + i) * h * 0.04, w * 0.1, rgba(col, 0.92));
      }
      fillCircle(cx - w * 0.16, y + h * 0.36, w * 0.16, rgba('#FFFFFF', 0.35));
      break;
    }
    case 'FISH': {
      const d = right ? 1 : -1;
      poly([[cx - d * w * 0.36, y + h * 0.5], [cx - d * w * 0.6, y + h * 0.2],
        [cx - d * w * 0.6, y + h * 0.8]], col2);
      fillOval(cx - w * 0.42, y + h * 0.18, w * 0.84, h * 0.68, col);
      poly([[cx, y + h * 0.2], [cx - d * w * 0.18, y - h * 0.04], [cx + d * w * 0.1, y + h * 0.22]], col2);
      fillOval(cx - w * 0.24, y + h * 0.26, w * 0.4, h * 0.22, 'rgba(255,255,255,0.28)');
      break;
    }
    case 'UFO': {
      fillOval(cx - w * 0.5, y + h * 0.4, w, h * 0.34, col);
      fillOval(cx - w * 0.3, y + h * 0.1, w * 0.6, h * 0.42, rgba(col2, 0.85));
      fillOval(cx - w * 0.24, y + h * 0.14, w * 0.3, h * 0.2, 'rgba(255,255,255,0.35)');
      for (let i = 0; i < 5; i++) {
        fillCircle(cx - w * 0.36 + i * w * 0.18, y + h * 0.62,
          w * 0.05, (Math.floor(t * 6) % 5) === i ? '#FFD24A' : '#FFFFFF');
      }
      break;
    }
    case 'KING': {
      fillRoundRect(cx - w * 0.36, y + h * 0.36, w * 0.72, h * 0.56, w * 0.14, col);
      fillRoundRect(cx - w * 0.5, y + h * 0.42, w * 0.16, h * 0.32, w * 0.08, col2);
      fillRoundRect(cx + w * 0.34, y + h * 0.42, w * 0.16, h * 0.32, w * 0.08, col2);
      fillCircle(cx, y + h * 0.26, w * 0.24, '#F6CDA8');
      poly([[cx - w * 0.26, y + h * 0.1], [cx - w * 0.18, y - h * 0.06], [cx - w * 0.08, y + h * 0.06],
        [cx, y - h * 0.1], [cx + w * 0.08, y + h * 0.06], [cx + w * 0.18, y - h * 0.06],
        [cx + w * 0.26, y + h * 0.1]], '#FFD24A');
      fillRect(cx - w * 0.26, y + h * 0.1, w * 0.52, h * 0.06, '#E0A81E');
      break;
    }
    case 'WITCH': {
      poly([[cx - w * 0.34, y + h * 0.92], [cx, y + h * 0.3], [cx + w * 0.34, y + h * 0.92]], col);
      fillCircle(cx, y + h * 0.28, w * 0.2, '#F6CDA8');
      poly([[cx - w * 0.34, y + h * 0.16], [cx, y - h * 0.14], [cx + w * 0.34, y + h * 0.16]], col2);
      fillOval(cx - w * 0.4, y + h * 0.12, w * 0.8, h * 0.08, col2);
      fillRoundRect(cx + w * 0.3, y + h * 0.2, w * 0.06, h * 0.6, w * 0.03, '#8A5A2A');
      fillCircle(cx + w * 0.33, y + h * 0.18, w * 0.09, charging ? '#FFF0A0' : '#8AD8F0');
      break;
    }
    case 'PAINT': {
      fillCircle(cx, y + h * 0.56, w * 0.44, col);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t * 0.6;
        fillCircle(cx + Math.cos(a) * w * 0.46, y + h * 0.56 + Math.sin(a) * h * 0.42, w * 0.12, col2);
      }
      fillCircle(cx - w * 0.16, y + h * 0.34, w * 0.14, 'rgba(255,255,255,0.35)');
      fillRoundRect(cx + w * 0.3, y + h * 0.02, w * 0.08, h * 0.4, w * 0.04, '#8A5A2A');
      fillRoundRect(cx + w * 0.26, y + h * 0.38, w * 0.16, h * 0.14, w * 0.05, col2);
      break;
    }
    default: { // 'BOOK'
      fillRoundRect(cx - w * 0.42, y + h * 0.2, w * 0.84, h * 0.72, w * 0.06, col);
      fillRect(cx - w * 0.36, y + h * 0.24, w * 0.72, h * 0.64, '#FFF6E0');
      fillRect(cx - w * 0.03, y + h * 0.2, w * 0.06, h * 0.72, col2);
      for (let i = 0; i < 4; i++) {
        fillRect(cx - w * 0.3, y + h * (0.34 + i * 0.13), w * 0.22, h * 0.04, 'rgba(0,0,0,0.2)');
        fillRect(cx + w * 0.08, y + h * (0.34 + i * 0.13), w * 0.22, h * 0.04, 'rgba(0,0,0,0.2)');
      }
      break;
    }
  }
  ctx.restore();

  // 顔は かたちの 上に かく（どのボスも かわいく）
  const faceY = shape === 'KING' || shape === 'WITCH' ? y + h * 0.26
    : shape === 'BOOK' ? y + h * 0.55 : y + h * 0.44;
  bossEyes(cx, faceY, w, true, look);
  bossMouth(cx, faceY + h * 0.16, w, charging);
  if (charging) {
    const g = Math.abs(Math.sin(t * 14));
    strokeCircle(cx, y + h * 0.5, w * 0.62 + g * w * 0.08, rgba('#FFF0A0', 0.3 + g * 0.5), w * 0.03);
  }
}

/** ボスの たいりょくバー。上に 大きく 出す。 */
function drawBossBar(e, cam, camY, s) {
  const w = e.w * s * 1.05;
  const x = (e.x + e.w / 2 - cam) * s - w / 2;
  const y = (e.y - camY) * s - s * 0.62;
  fillRoundRect(x, y, w, s * 0.26, s * 0.13, 'rgba(0,0,0,0.45)');
  const k = clamp(e.hp / e.maxHp, 0, 1);
  fillRoundRect(x + s * 0.04, y + s * 0.04, (w - s * 0.08) * k, s * 0.18, s * 0.09,
    k > 0.5 ? '#7ADC80' : k > 0.25 ? '#FFD24A' : '#FF6B6B');
  setFont(s * 0.28);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(e.boss.name, x + w / 2, y - s * 0.12);
}

function drawEnemies(cam, camY, s) {
  for (const e of game.enemies) {
    const x = (e.x - cam) * s;
    if (x < -4 * s || x > viewW + 4 * s) continue;
    let y = (e.y - camY) * s;
    const w = e.w * s, h = e.h * s;
    if (game.introT > 0 && e === game.introBoss) {
      const k = 1 - game.introT / BOSS_INTRO_TIME;
      y -= Math.abs(Math.sin(k * Math.PI * 3)) * h * 0.4 * (1 - k * 0.6);
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
      case 'FISH': drawFish(x, y, w, h, e.t, e.vx > 0); break;
      case 'ROBO': drawRobo(x, y, w, h, e.t, e.vx > 0); break;
      case 'BARRELER': drawBarreler(x, y, w, h, e.t, e.vx > 0); break;
      case 'BARREL': drawBarrel(x, y, w, h, e.t); break;
      case 'MINION': drawMinion(x, y, w, h, e.t, e.vx > 0); break;
      case 'BOSS':
        drawBossShape(e.boss.shape, x, y, w, h, e.t, e.vx > 0, e.boss.col, e.boss.col2,
          e.state === 'CHARGE');
        break;
    }
    ctx.restore();
    if (e.frozenT > 0) {
      fillRoundRect(x - w * 0.06, y - h * 0.06, w * 1.12, h * 1.12, w * 0.14, rgba(ICE_A, 0.55));
      strokeCircle(x + w / 2, y + h / 2, w * 0.55, 'rgba(255,255,255,0.6)', s * 0.04);
    }
    if (e.kind === 'BOSS') drawBossBar(e, cam, camY, s);
  }
}

// --- たま -----------------------------------------------------------------
function drawShots(cam, camY, s) {
  for (const sh of game.shots) {
    const x = (sh.x - cam) * s, y = (sh.y - camY) * s;
    if (x < -s || x > viewW + s) continue;
    if (sh.kind === 'HEART') {
      fillCircle(x, y, s * 0.34, rgba('#FF6FA8', 0.3));
      drawLife(x, y, s * 0.26);
    } else if (sh.kind === 'ICE') {
      fillCircle(x, y, s * 0.3, rgba('#8AD8F0', 0.35));
      starPoly(x, y, s * 0.25, 6, 0.4, '#E4F8FF', game.elapsed * 6);
    } else {
      ctx.save(); ctx.translate(x, y); ctx.rotate(sh.t * 22);
      poly([[-s * 0.3, s * 0.1], [0, -s * 0.32], [s * 0.3, s * 0.1],
        [s * 0.1, s * 0.04], [0, -s * 0.1], [-s * 0.1, s * 0.04]], '#FFD24A');
      ctx.restore();
    }
  }
}

function drawBolts(cam, camY, s) {
  for (const b of game.bolts) {
    const x = (b.x - cam) * s, y = (b.y - camY) * s;
    if (x < -2 * s || x > viewW + 2 * s) continue;
    const r = b.r * s;
    if (b.beam) {
      const len = s * 2.2;
      const d = sign(b.vx);
      fillRoundRect(x - (d > 0 ? len : 0), y - r, len, r * 2, r, rgba(b.col, 0.85));
      fillRoundRect(x - (d > 0 ? len : 0), y - r * 0.4, len, r * 0.8, r * 0.4, 'rgba(255,255,255,0.8)');
    } else if (b.ground) {
      const k = Math.abs(Math.sin(b.t * 14));
      poly([[x - r, y + r], [x, y - r * (1 + k * 0.6)], [x + r, y + r]], b.col);
      fillRect(x - r, y + r * 0.7, r * 2, r * 0.5, rgba(b.col, 0.6));
    } else {
      fillCircle(x, y, r * 1.35, rgba(b.col, 0.28));
      fillCircle(x, y, r, b.col);
      fillCircle(x - r * 0.3, y - r * 0.32, r * 0.34, 'rgba(255,255,255,0.65)');
      if (b.rain) line(x, y - r * 2.4, x, y - r, rgba(b.col, 0.4), r * 0.6);
    }
  }
}

// --- りな -----------------------------------------------------------------
function rinaSprite(x, y, w, h, faceRight, stepPhase, stretch, body, dark, big) {
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
  if (big) {
    // 大きい ときは リボンが つく（見ためで わかるように）
    poly([[cx - w * 0.02, y + h * 0.06], [cx - w * 0.3, y - h * 0.02],
      [cx - w * 0.28, y + h * 0.16]], '#FF4A78');
    poly([[cx + w * 0.02, y + h * 0.06], [cx + w * 0.3, y - h * 0.02],
      [cx + w * 0.28, y + h * 0.16]], '#FF4A78');
    fillCircle(cx, y + h * 0.08, w * 0.07, '#FFD0E2');
  }
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

function drawPlayer(cam, camY, s) {
  const p = game.player;
  const hitW = PLAYER_W * s, hitH = PLAYER_H * s;
  const scale = (p.size > 0 ? 1.95 : 1.35) * (p.growT > 0 ? 1 + Math.sin(game.elapsed * 30) * 0.08 : 1);
  const w = hitW * scale, h = hitH * scale;
  const x = (p.x - cam) * s - (w - hitW) / 2;
  const y = (p.y - camY) * s - (h - hitH);
  const cx = x + w / 2;

  let body = RINA_BODY, dark = RINA_DARK;
  const star = p.starT > 0;
  if (star) {
    const k = Math.sin(p.animT * 18) * 0.5 + 0.5;
    const g = Math.round((0.55 + 0.35 * k) * 255);
    const b = Math.round((0.35 + 0.55 * (1 - k)) * 255);
    body = `rgb(255,${g},${b})`;
    dark = `rgba(255,${g},${b},0.65)`;
  }

  if (p.pipeT > 0) {
    // どかんに 吸いこまれる
    const k = 1 - p.pipeT / PIPE_TIME;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w, y - h * 2, w * 3, (y + h * (1 - k)) - (y - h * 2));
    ctx.clip();
    rinaSprite(x, y + h * k, w, h, p.faceRight, 0, 1, body, dark, p.size > 0);
    ctx.restore();
    return;
  }

  if (p.hurtT > 0 && !star && Math.sin(p.animT * 40) < 0) return;

  const moving = game.phase === 'PLAYING' && (game.inputLeft || game.inputRight) && p.onGround;
  const stepPhase = moving ? Math.sin(p.animT * 13) : 0;
  const air = !p.onGround;
  const stretch = air ? clamp(1 + p.vy / 60, 0.86, 1.16) : 1 + Math.sin(p.animT * 13) * 0.03;

  if (p.featherT > 0) {
    const flap = Math.abs(Math.sin(p.animT * (air ? 14 : 5)));
    for (const side of [-1, 1]) {
      fillOval(cx + side * w * 0.42 - (side < 0 ? w * 0.32 : 0), y + h * 0.2,
        w * 0.32, h * (0.28 + flap * 0.3), 'rgba(239,255,244,0.95)');
    }
  }

  rinaSprite(x, y, w, h, p.faceRight, stepPhase, stretch, body, dark, p.size > 0);

  // ぶきを 手に 持つ
  if (p.weapon && p.hammerT <= 0) {
    const hx = cx + (p.faceRight ? w * 0.42 : -w * 0.42);
    drawWeaponIcon(p.weapon, hx, y + h * 0.55, w * 0.2, game.elapsed);
  }
  if (p.hammerT > 0) {
    const k = 1 - p.hammerT / HAMMER_SWING;
    const d = p.faceRight ? 1 : -1;
    const a = (-100 + k * 150) * Math.PI / 180 * d;
    ctx.save();
    ctx.translate(cx + d * w * 0.2, y + h * 0.5);
    ctx.rotate(a);
    fillRect(-w * 0.06, 0, w * 0.12, h * 0.6, '#8A5A2A');
    fillRoundRect(-w * 0.3, h * 0.5, w * 0.6, h * 0.28, w * 0.08, '#E8E8F0');
    ctx.restore();
  }

  if (star) {
    const a = (Math.sin(p.animT * 12) * 0.5 + 0.5) * 0.5;
    fillCircle(cx, y + h * 0.5, w * 0.8, rgba(STAR_A, a));
  }
  if (p.magnetT > 0) {
    const a = (Math.sin(p.animT * 6) * 0.5 + 0.5) * 0.25;
    strokeCircle(cx, y + h * 0.5, MAGNET_RANGE * s, rgba(MAGNET_A, a), s * 0.06);
  }
  if (p.inWater) {
    for (let i = 0; i < 3; i++) {
      const bt = (game.elapsed * 1.4 + i * 0.33) % 1;
      fillCircle(cx + w * 0.3, y + h * 0.3 - bt * s * 2, s * 0.06 * (1 - bt * 0.5),
        `rgba(255,255,255,${0.5 * (1 - bt)})`);
    }
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
