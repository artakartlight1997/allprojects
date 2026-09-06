// キャラクターの え。ぜんぶ コードで かいている（画像ファイルは 0 こ）。
//
// 大きく うつしても きたなく ならないように、まると 線だけで 作って ある。
// どの 絵も (x, y) は「足もと の まんなか」、s は「せの 高さ の めやす」。
// s を 大きくすれば そのまま 大きく なるので、えらぶ 画面の 小さい 絵にも
// あそぶ 画面の 大きい 絵にも 同じ 関数を つかえる。

'use strict';

// --- ちいさな どうぐ ---------------------------------------------------------------

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function cir(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }

function ell(x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
}

function fillCir(x, y, r, col) { ctx.fillStyle = col; cir(x, y, r); ctx.fill(); }
function fillEll(x, y, rx, ry, col, rot) { ctx.fillStyle = col; ell(x, y, rx, ry, rot); ctx.fill(); }

// 足もと の かげ。これが あるだけで 「そこに 立っている」ように 見える。
function shadow(x, y, rx, a) {
  ctx.fillStyle = 'rgba(0,0,0,' + (a === undefined ? 0.22 : a) + ')';
  ell(x, y, rx, rx * 0.28); ctx.fill();
}

// ふちどりの ある 線。キャラクターの りんかくに つかう。
function lineTo2(pts, col, w, cap) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = cap || 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function starPath(x, y, r, n, inner, rot) {
  n = n || 5; inner = inner === undefined ? 0.45 : inner;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (rot || 0) - Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function sparkle(x, y, r, col) {
  ctx.fillStyle = col || '#FFF6B8';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  ctx.fill();
}

// おおきな め。ハイライトが 2つ 入るだけで ぐっと かわいく なる。
//   mood: 'idle' 'happy' 'sad' 'wow' 'wink' 'shut'
function eyes(x, y, s, gap, mood, look) {
  const lx = look === undefined ? 0 : look;
  for (const sg of [-1, 1]) {
    const ex = x + sg * gap;
    if (mood === 'happy' || (mood === 'wink' && sg > 0)) {
      ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.5, s * 0.24);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, y + s * 0.24, s * 0.62, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      continue;
    }
    if (mood === 'shut') {
      ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.5, s * 0.24);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - s * 0.55, y); ctx.lineTo(ex + s * 0.55, y);
      ctx.stroke();
      continue;
    }
    if (mood === 'sad') {
      fillEll(ex, y + s * 0.1, s * 0.5, s * 0.44, '#FFFFFF');
      fillCir(ex + lx * s * 0.2, y + s * 0.22, s * 0.3, '#2A2028');
      ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.5, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(ex - sg * s * 0.7, y - s * 0.55);
      ctx.lineTo(ex + sg * s * 0.5, y - s * 0.8);
      ctx.stroke();
      continue;
    }
    const big = mood === 'wow' ? 1.24 : 1;
    fillEll(ex, y, s * 0.56 * big, s * 0.66 * big, '#FFFFFF');
    ctx.strokeStyle = 'rgba(42,32,40,0.35)'; ctx.lineWidth = Math.max(1, s * 0.07);
    ell(ex, y, s * 0.56 * big, s * 0.66 * big); ctx.stroke();
    fillCir(ex + lx * s * 0.22, y + s * 0.06, s * 0.34 * big, '#2A2028');
    fillCir(ex + lx * s * 0.22 - s * 0.12, y - s * 0.1, s * 0.13, '#FFFFFF');
    fillCir(ex + lx * s * 0.22 + s * 0.12, y + s * 0.18, s * 0.06, 'rgba(255,255,255,0.7)');
  }
}

function blush(x, y, s, gap, col) {
  ctx.fillStyle = col || 'rgba(255,120,150,0.42)';
  for (const sg of [-1, 1]) { ell(x + sg * gap, y, s * 0.42, s * 0.28); ctx.fill(); }
}

// くち。open は 0（とじる）〜1（大きく あける）
function mouth(x, y, s, open, smile) {
  if (open > 0.05) {
    ctx.fillStyle = '#7A2438';
    ell(x, y + s * open * 0.3, s * (0.5 + open * 0.25), s * (0.2 + open * 0.7));
    ctx.fill();
    ctx.fillStyle = '#FF8FA8';
    ell(x, y + s * (0.3 + open * 0.55), s * 0.34, s * 0.2); ctx.fill();
    return;
  }
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1.4, s * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (smile === false) ctx.arc(x, y + s * 0.6, s * 0.4, Math.PI * 1.2, Math.PI * 1.8);
  else ctx.arc(x, y - s * 0.1, s * 0.45, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

// --- ① もじゃもじゃトマト -----------------------------------------------------------
//
//  o = { mood, wob（ゆれ）, hairs: [{ang, len, pull}] }

function drawTomato(x, y, s, o) {
  o = o || {};
  const r = s * 0.5;
  const wob = o.wob || 0;
  const sx = 1 + wob * 0.08, sy = 1 - wob * 0.08;
  shadow(x, y + s * 0.02, r * 1.0, 0.25);

  ctx.save();
  ctx.translate(x, y - r * sy);
  ctx.scale(sx, sy);

  // もじゃもじゃ（うしろがわ の 分）
  const hairs = o.hairs || [];
  for (const h of hairs) if (h.ang < 0) drawHair(0, 0, r, h);

  // からだ
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, '#FF8B7A');
  g.addColorStop(0.55, '#F2453D');
  g.addColorStop(1, '#B81F2A');
  ctx.fillStyle = g;
  ell(0, 0, r, r * 0.94); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ell(-r * 0.36, -r * 0.42, r * 0.24, r * 0.14, -0.5); ctx.fill();

  // へた（みどりの ぼうし）
  ctx.fillStyle = '#3E9B4F';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42;
    ctx.save();
    ctx.translate(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.62 - r * 0.16);
    ctx.rotate(a + Math.PI / 2);
    ell(0, 0, r * 0.15, r * 0.42); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#2F7B3E';
  cir(0, -r * 0.82, r * 0.16); ctx.fill();
  ctx.strokeStyle = '#2F7B3E'; ctx.lineWidth = r * 0.11; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.86); ctx.quadraticCurveTo(r * 0.1, -r * 1.12, -r * 0.05, -r * 1.24);
  ctx.stroke();

  // かお
  eyes(0, -r * 0.06, r * 0.34, r * 0.34, o.mood || 'idle', o.look);
  blush(0, r * 0.28, r * 0.5, r * 0.55);
  mouth(0, r * 0.34, r * 0.4, o.open || 0, o.mood !== 'sad');

  // もじゃもじゃ（まえがわ）
  for (const h of hairs) if (h.ang >= 0) drawHair(0, 0, r, h);
  ctx.restore();
}

// もじゃもじゃ 1本。くるくる した 線で かく。
// tip() で 先っぽの ばしょ が わかる（ピンセットを そこへ 持っていく ため）。
function hairTip(cx, cy, r, h) {
  const a = -Math.PI / 2 + h.ang;
  const len = r * (0.3 + h.len * 0.62);
  return { x: cx + Math.cos(a) * (r * 0.88 + len), y: cy + Math.sin(a) * (r * 0.84 + len) };
}

function drawHair(cx, cy, r, h) {
  const a = -Math.PI / 2 + h.ang;
  const bx = cx + Math.cos(a) * r * 0.88, by = cy + Math.sin(a) * r * 0.84;
  const len = r * (0.3 + h.len * 0.62);
  const ca = Math.cos(a), sa = Math.sin(a);
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = Math.max(2, r * 0.075);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  const seg = 4;
  for (let i = 1; i <= seg; i++) {
    const u = i / seg, um = (i - 0.5) / seg;
    const w = Math.sin(um * Math.PI * 2.6 + (h.ph || 0)) * r * 0.11;
    ctx.quadraticCurveTo(bx + ca * len * um - sa * w, by + sa * len * um + ca * w,
                         bx + ca * len * u, by + sa * len * u);
  }
  ctx.stroke();
  // 先っぽの まる。ぬく ばしょ の しるし
  const tx = bx + ca * len, ty = by + sa * len;
  if (h.ready) {
    ctx.fillStyle = 'rgba(255,224,102,0.45)';
    cir(tx, ty, r * 0.22); ctx.fill();
  }
  ctx.fillStyle = h.ready ? '#FFE066' : '#8A5A34';
  cir(tx, ty, r * (h.ready ? 0.12 : 0.075)); ctx.fill();
}

// 大きな ピンセット。ang は かたむき、snap は 0〜1 で とじぐあい
function drawTweezers(x, y, s, ang, snap) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang || 0);
  const open = (1 - (snap || 0)) * s * 0.22 + s * 0.03;
  ctx.strokeStyle = '#C8D2E0'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * s * 0.06, s * 0.9);
    ctx.quadraticCurveTo(sg * s * 0.16, s * 0.35, sg * open, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#FF6FA8';
  rr(ctx, -s * 0.16, s * 0.72, s * 0.32, s * 0.46, s * 0.12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, -s * 0.1, s * 0.78, s * 0.08, s * 0.3, s * 0.04); ctx.fill();
  ctx.restore();
}

// --- ② ねこざむらい -----------------------------------------------------------------
//
//  o = { slash（0〜1 きった ちょくご）, hurt, mood }

function drawNinjaCat(x, y, s, o) {
  o = o || {};
  const slash = o.slash || 0;
  const lean = slash * s * 0.12;
  shadow(x, y, s * 0.42, 0.28);

  ctx.save();
  ctx.translate(x + lean, y - s * (o.hurt ? 0.02 : 0));

  // しっぽ
  ctx.strokeStyle = '#4A4458'; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.34);
  ctx.quadraticCurveTo(-s * 0.55, -s * 0.5 - slash * s * 0.2, -s * 0.42, -s * 0.82);
  ctx.stroke();

  // あし
  ctx.fillStyle = '#3A3448';
  rr(ctx, -s * 0.24, -s * 0.2, s * 0.18, s * 0.2, s * 0.06); ctx.fill();
  rr(ctx, s * 0.06, -s * 0.2, s * 0.18, s * 0.2, s * 0.06); ctx.fill();

  // からだ（どうぎ）
  ctx.fillStyle = '#5B5470';
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.16);
  ctx.quadraticCurveTo(-s * 0.34, -s * 0.62, -s * 0.2, -s * 0.74);
  ctx.lineTo(s * 0.2, -s * 0.74);
  ctx.quadraticCurveTo(s * 0.34, -s * 0.62, s * 0.3, -s * 0.16);
  ctx.closePath(); ctx.fill();
  // むねの あわせ
  ctx.fillStyle = '#F3EDE0';
  ctx.beginPath();
  ctx.moveTo(-s * 0.14, -s * 0.74);
  ctx.lineTo(s * 0.14, -s * 0.74);
  ctx.lineTo(0, -s * 0.4);
  ctx.closePath(); ctx.fill();
  // おび
  ctx.fillStyle = '#E04A6E';
  rr(ctx, -s * 0.32, -s * 0.42, s * 0.64, s * 0.13, s * 0.05); ctx.fill();

  // かたな を もつ うで
  const sa = -0.9 + slash * 2.6;
  ctx.save();
  ctx.translate(s * 0.22, -s * 0.62);
  ctx.rotate(sa);
  ctx.strokeStyle = '#4A4458'; ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.3, 0); ctx.stroke();
  drawSword(s * 0.3, 0, s, 0);
  ctx.restore();

  // もう 片方の うで
  ctx.strokeStyle = '#4A4458'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.62);
  ctx.lineTo(-s * 0.38 - slash * s * 0.1, -s * 0.44);
  ctx.stroke();

  // あたま
  const hy = -s * 0.98;
  ctx.fillStyle = '#6D6684';
  // みみ
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * s * 0.1, hy - s * 0.16);
    ctx.lineTo(sg * s * 0.3, hy - s * 0.42);
    ctx.lineTo(sg * s * 0.34, hy - s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2A7BC';
    ctx.beginPath();
    ctx.moveTo(sg * s * 0.16, hy - s * 0.18);
    ctx.lineTo(sg * s * 0.27, hy - s * 0.33);
    ctx.lineTo(sg * s * 0.28, hy - s * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6D6684';
  }
  fillEll(0, hy, s * 0.34, s * 0.3, '#7A7392');
  fillEll(0, hy + s * 0.09, s * 0.22, s * 0.16, '#F3EDE0');

  // はちまき
  ctx.fillStyle = '#E04A6E';
  rr(ctx, -s * 0.36, hy - s * 0.18, s * 0.72, s * 0.11, s * 0.04); ctx.fill();
  ctx.strokeStyle = '#E04A6E'; ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, hy - s * 0.12);
  ctx.quadraticCurveTo(-s * 0.5, hy - s * 0.06 + slash * s * 0.08, -s * 0.52, hy + s * 0.08);
  ctx.stroke();

  eyes(0, hy - s * 0.02, s * 0.17, s * 0.15, o.hurt ? 'sad' : (slash > 0.3 ? 'wow' : (o.mood || 'idle')), o.look);
  // ひげ
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, s * 0.014);
  for (const sg of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sg * s * 0.14, hy + s * 0.1);
      ctx.lineTo(sg * s * 0.42, hy + s * 0.08 + i * s * 0.07);
      ctx.stroke();
    }
  }
  // はな と くち
  ctx.fillStyle = '#F2708C';
  ctx.beginPath();
  ctx.moveTo(0, hy + s * 0.06); ctx.lineTo(s * 0.04, hy + s * 0.12);
  ctx.lineTo(-s * 0.04, hy + s * 0.12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8A4458'; ctx.lineWidth = Math.max(1.2, s * 0.02);
  ctx.beginPath();
  ctx.arc(-s * 0.045, hy + s * 0.14, s * 0.045, 0, Math.PI);
  ctx.arc(s * 0.045, hy + s * 0.14, s * 0.045, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawSword(x, y, s, ang) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang || 0);
  ctx.fillStyle = '#3A3448';
  rr(ctx, -s * 0.02, -s * 0.05, s * 0.16, s * 0.1, s * 0.03); ctx.fill();
  ctx.fillStyle = '#FFD166';
  rr(ctx, s * 0.13, -s * 0.09, s * 0.04, s * 0.18, s * 0.02); ctx.fill();
  const g = ctx.createLinearGradient(0, -s * 0.04, 0, s * 0.04);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#D8E4F0'); g.addColorStop(1, '#9AA8BC');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s * 0.17, -s * 0.035);
  ctx.lineTo(s * 0.72, -s * 0.03);
  ctx.lineTo(s * 0.8, 0);
  ctx.lineTo(s * 0.72, s * 0.03);
  ctx.lineTo(s * 0.17, s * 0.035);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// とんでくる もの（おにぎり・さかな・つぼ・まきもの）
function drawFlyItem(x, y, s, kind, rot, half) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot || 0);
  if (half) { ctx.beginPath(); ctx.rect(half < 0 ? -s : 0, -s, s, s * 2); ctx.clip(); }
  if (kind === 'onigiri') {
    ctx.fillStyle = '#FFFDF4';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.52, s * 0.34, s * 0.42, s * 0.44);
    ctx.lineTo(-s * 0.42, s * 0.44);
    ctx.quadraticCurveTo(-s * 0.52, s * 0.34, 0, -s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2F3A2E';
    rr(ctx, -s * 0.22, s * 0.06, s * 0.44, s * 0.36, s * 0.05); ctx.fill();
    ctx.fillStyle = '#F2453D';
    cir(0, -s * 0.08, s * 0.08); ctx.fill();
  } else if (kind === 'fish') {
    ctx.fillStyle = '#7FC8F8';
    ell(0, 0, s * 0.5, s * 0.28); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.42, 0); ctx.lineTo(s * 0.72, -s * 0.26);
    ctx.lineTo(s * 0.72, s * 0.26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF'; cir(-s * 0.24, -s * 0.05, s * 0.09); ctx.fill();
    ctx.fillStyle = '#2A2028'; cir(-s * 0.26, -s * 0.05, s * 0.045); ctx.fill();
  } else if (kind === 'pot') {
    ctx.fillStyle = '#8A6A4A';
    ell(0, s * 0.05, s * 0.45, s * 0.45); ctx.fill();
    ctx.fillStyle = '#6B4F35';
    rr(ctx, -s * 0.26, -s * 0.5, s * 0.52, s * 0.2, s * 0.06); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ell(-s * 0.16, -s * 0.06, s * 0.1, s * 0.16, -0.4); ctx.fill();
  } else {
    // まきもの
    ctx.fillStyle = '#F6E6C0';
    rr(ctx, -s * 0.46, -s * 0.2, s * 0.92, s * 0.4, s * 0.05); ctx.fill();
    ctx.fillStyle = '#C0392B';
    rr(ctx, -s * 0.52, -s * 0.28, s * 0.12, s * 0.56, s * 0.05); ctx.fill();
    rr(ctx, s * 0.4, -s * 0.28, s * 0.12, s * 0.56, s * 0.05); ctx.fill();
    ctx.strokeStyle = '#8A7A5A'; ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, i * s * 0.1); ctx.lineTo(s * 0.3, i * s * 0.1); ctx.stroke();
    }
  }
  ctx.restore();
}

// --- ③ ぺんぎん ---------------------------------------------------------------------
//
//  o = { teacher, step（0〜1 足を あげた ぐあい）, dir, mood, arm }

function drawPenguin(x, y, s, o) {
  o = o || {};
  const st = o.step || 0;
  const dir = o.dir || 1;
  shadow(x, y, s * 0.36, 0.26);
  ctx.save();
  ctx.translate(x, y - st * s * 0.06);

  // タップシューズ
  for (const sg of [-1, 1]) {
    const up = sg === dir ? st : 0;
    ctx.fillStyle = '#FFB020';
    ell(sg * s * 0.15 + up * dir * s * 0.12, -up * s * 0.16, s * 0.15, s * 0.07); ctx.fill();
    ctx.fillStyle = '#3A2A18';
    rr(ctx, sg * s * 0.15 + up * dir * s * 0.12 - s * 0.13, -up * s * 0.16 + s * 0.02,
       s * 0.26, s * 0.05, s * 0.02); ctx.fill();
  }

  // からだ
  const bg = ctx.createLinearGradient(0, -s * 0.9, 0, 0);
  bg.addColorStop(0, o.teacher ? '#3E4A66' : '#2E3A54');
  bg.addColorStop(1, o.teacher ? '#26304A' : '#1C2438');
  ctx.fillStyle = bg;
  ell(0, -s * 0.42, s * 0.34, s * 0.44); ctx.fill();
  ctx.fillStyle = '#FFF8E8';
  ell(0, -s * 0.38, s * 0.23, s * 0.34); ctx.fill();

  // つばさ
  for (const sg of [-1, 1]) {
    const sw = sg === dir ? (o.arm || 0) : (o.arm || 0) * 0.4;
    ctx.save();
    ctx.translate(sg * s * 0.3, -s * 0.5);
    ctx.rotate(sg * (0.35 - sw * 1.5));
    ctx.fillStyle = o.teacher ? '#3E4A66' : '#2E3A54';
    ell(0, s * 0.12, s * 0.09, s * 0.24); ctx.fill();
    ctx.restore();
  }

  // あたま
  const hy = -s * 0.86;
  ctx.fillStyle = o.teacher ? '#3E4A66' : '#2E3A54';
  cir(0, hy, s * 0.29); ctx.fill();
  ctx.fillStyle = '#FFF8E8';
  ell(0, hy + s * 0.06, s * 0.2, s * 0.2); ctx.fill();
  // くちばし
  ctx.fillStyle = '#FFB020';
  ctx.beginPath();
  ctx.moveTo(dir * s * 0.04, hy + s * 0.06);
  ctx.lineTo(dir * s * 0.3, hy + s * 0.12);
  ctx.lineTo(dir * s * 0.04, hy + s * 0.18);
  ctx.closePath(); ctx.fill();
  eyes(0, hy - s * 0.03, s * 0.14, s * 0.12, o.mood || 'idle', dir * 0.4);

  if (o.teacher) {
    // シルクハット
    ctx.fillStyle = '#1A1424';
    rr(ctx, -s * 0.3, hy - s * 0.24, s * 0.6, s * 0.07, s * 0.03); ctx.fill();
    rr(ctx, -s * 0.19, hy - s * 0.58, s * 0.38, s * 0.36, s * 0.04); ctx.fill();
    ctx.fillStyle = '#E04A6E';
    rr(ctx, -s * 0.19, hy - s * 0.32, s * 0.38, s * 0.09, s * 0.02); ctx.fill();
    // ちょうネクタイ
    ctx.fillStyle = '#E04A6E';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6); ctx.lineTo(-s * 0.13, -s * 0.68);
    ctx.lineTo(-s * 0.13, -s * 0.52); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.13, -s * 0.68);
    ctx.lineTo(s * 0.13, -s * 0.52); ctx.closePath(); ctx.fill();
  } else {
    // りぼん
    ctx.fillStyle = '#FF6FA8';
    cir(-s * 0.22, hy - s * 0.2, s * 0.09); ctx.fill();
    cir(-s * 0.36, hy - s * 0.26, s * 0.07); ctx.fill();
    cir(-s * 0.1, hy - s * 0.28, s * 0.07); ctx.fill();
  }
  ctx.restore();
}

// --- ④ かえる -----------------------------------------------------------------------
//
//  o = { puff（0〜1 のどの ふくらみ）, mood, size }

function drawFrog(x, y, s, o) {
  o = o || {};
  const p = o.puff || 0;
  shadow(x, y, s * 0.44 * (1 + p * 0.1), 0.24);
  ctx.save();
  ctx.translate(x, y - p * s * 0.03);

  // あし
  ctx.fillStyle = '#3E9B4F';
  for (const sg of [-1, 1]) {
    ctx.save();
    ctx.translate(sg * s * 0.34, -s * 0.06);
    ctx.rotate(sg * 0.5);
    ell(0, 0, s * 0.17, s * 0.09); ctx.fill();
    ctx.restore();
  }
  // からだ
  const g = ctx.createRadialGradient(-s * 0.1, -s * 0.4, s * 0.05, 0, -s * 0.3, s * 0.5);
  g.addColorStop(0, '#7FD98A');
  g.addColorStop(1, '#3E9B4F');
  ctx.fillStyle = g;
  ell(0, -s * 0.3, s * 0.4 * (1 + p * 0.06), s * 0.32 * (1 + p * 0.04)); ctx.fill();
  // おなか
  ctx.fillStyle = '#E8F6C8';
  ell(0, -s * 0.2, s * 0.24, s * 0.18); ctx.fill();

  // のど（ふくらむ ところ）
  ctx.fillStyle = '#B8E86A';
  ell(0, -s * 0.44 + p * s * 0.08, s * (0.16 + p * 0.3), s * (0.1 + p * 0.28)); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ell(-s * 0.06, -s * 0.48 + p * s * 0.04, s * (0.05 + p * 0.09), s * (0.03 + p * 0.07));
  ctx.fill();

  // あたま
  const hy = -s * 0.62;
  ctx.fillStyle = '#4FAE5E';
  ell(0, hy, s * 0.36, s * 0.26); ctx.fill();
  // め（あたまの 上に とび出している）
  for (const sg of [-1, 1]) {
    ctx.fillStyle = '#4FAE5E';
    cir(sg * s * 0.2, hy - s * 0.2, s * 0.15); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    cir(sg * s * 0.2, hy - s * 0.21, s * 0.11); ctx.fill();
    if (o.mood === 'shut') {
      ctx.strokeStyle = '#2A2028'; ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(sg * s * 0.2 - s * 0.09, hy - s * 0.21);
      ctx.lineTo(sg * s * 0.2 + s * 0.09, hy - s * 0.21);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2A2028';
      cir(sg * s * 0.2, hy - s * 0.19, s * 0.06); ctx.fill();
      ctx.fillStyle = '#FFF';
      cir(sg * s * 0.2 - s * 0.03, hy - s * 0.23, s * 0.025); ctx.fill();
    }
  }
  // くち
  ctx.strokeStyle = '#276B35'; ctx.lineWidth = Math.max(1.4, s * 0.03);
  ctx.beginPath();
  if (p > 0.15) {
    ctx.arc(0, hy - s * 0.02, s * 0.2, 0.15, Math.PI - 0.15);
  } else {
    ctx.moveTo(-s * 0.22, hy + s * 0.05);
    ctx.quadraticCurveTo(0, hy + s * 0.14, s * 0.22, hy + s * 0.05);
  }
  ctx.stroke();
  blush(0, hy + s * 0.06, s * 0.2, s * 0.26, 'rgba(255,110,150,0.45)');
  ctx.restore();
}

// 音ぷ の しるし
function drawNote(x, y, s, col, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot || 0);
  ctx.fillStyle = col || '#FFF6B8';
  ell(-s * 0.22, s * 0.3, s * 0.3, s * 0.22, -0.4); ctx.fill();
  rr(ctx, s * 0.02, -s * 0.6, s * 0.09, s * 0.95, s * 0.04); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.1, -s * 0.6);
  ctx.quadraticCurveTo(s * 0.5, -s * 0.4, s * 0.36, -s * 0.02);
  ctx.quadraticCurveTo(s * 0.4, -s * 0.36, s * 0.1, -s * 0.44);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --- ⑤ こうじょう ロボ ---------------------------------------------------------------
//
//  o = { swing（0〜1 ハンマーを ふりおろした ぐあい）, mood, small }

function drawRobo(x, y, s, o) {
  o = o || {};
  const sw = o.swing || 0;
  shadow(x, y, s * 0.44, 0.3);
  ctx.save();
  ctx.translate(x, y);

  // キャタピラ
  ctx.fillStyle = '#3A4152';
  rr(ctx, -s * 0.38, -s * 0.24, s * 0.76, s * 0.24, s * 0.1); ctx.fill();
  ctx.fillStyle = '#6E7A90';
  for (let i = -2; i <= 2; i++) { cir(i * s * 0.16, -s * 0.12, s * 0.05); ctx.fill(); }

  // どうたい
  const g = ctx.createLinearGradient(0, -s * 0.85, 0, -s * 0.2);
  g.addColorStop(0, '#9AA8C0'); g.addColorStop(1, '#5E6A84');
  ctx.fillStyle = g;
  rr(ctx, -s * 0.32, -s * 0.86, s * 0.64, s * 0.64, s * 0.14); ctx.fill();
  ctx.fillStyle = '#2E3547';
  rr(ctx, -s * 0.2, -s * 0.72, s * 0.4, s * 0.26, s * 0.06); ctx.fill();
  // パネルの ランプ
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = (o.lamp || 0) > i ? '#7FE0A0' : '#3E4658';
    cir(-s * 0.12 + i * s * 0.12, -s * 0.59, s * 0.04); ctx.fill();
  }
  ctx.fillStyle = '#FFB020';
  rr(ctx, -s * 0.3, -s * 0.4, s * 0.6, s * 0.08, s * 0.03); ctx.fill();

  // ハンマーの うで
  ctx.save();
  ctx.translate(s * 0.28, -s * 0.78);
  ctx.rotate(-1.1 + sw * 1.9);
  ctx.strokeStyle = '#6E7A90'; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 0.52); ctx.stroke();
  ctx.fillStyle = '#C0392B';
  rr(ctx, -s * 0.19, s * 0.5, s * 0.38, s * 0.26, s * 0.07); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  rr(ctx, -s * 0.14, s * 0.54, s * 0.1, s * 0.14, s * 0.03); ctx.fill();
  ctx.restore();

  // もう 片方の うで
  ctx.strokeStyle = '#6E7A90'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.72);
  ctx.lineTo(-s * 0.46, -s * 0.5 + sw * s * 0.06);
  ctx.stroke();

  // あたま
  const hy = -s * 1.06;
  ctx.fillStyle = '#B8C4D8';
  rr(ctx, -s * 0.26, hy - s * 0.2, s * 0.52, s * 0.42, s * 0.12); ctx.fill();
  ctx.fillStyle = '#1E2432';
  rr(ctx, -s * 0.2, hy - s * 0.13, s * 0.4, s * 0.26, s * 0.1); ctx.fill();
  // め（よこ長の モニタ）
  const ec = o.mood === 'sad' ? '#FF8FA8' : (o.mood === 'happy' ? '#FFE066' : '#7FE0F0');
  for (const sg of [-1, 1]) {
    ctx.fillStyle = ec;
    if (o.mood === 'happy') {
      ctx.strokeStyle = ec; ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.arc(sg * s * 0.1, hy + s * 0.02, s * 0.07, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      rr(ctx, sg * s * 0.1 - s * 0.06, hy - s * 0.05, s * 0.12, s * 0.1, s * 0.04); ctx.fill();
    }
  }
  // アンテナ
  ctx.strokeStyle = '#8A94A8'; ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.moveTo(0, hy - s * 0.2); ctx.lineTo(0, hy - s * 0.36); ctx.stroke();
  ctx.fillStyle = sw > 0.5 ? '#FFE066' : '#E04A6E';
  cir(0, hy - s * 0.4, s * 0.07); ctx.fill();
  ctx.restore();
}

// ベルトで ながれてくる ぶひん
function drawPart(x, y, s, kind, glow) {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.fillStyle = 'rgba(255,224,102,' + (0.35 * glow) + ')';
    cir(0, 0, s * 1.1); ctx.fill();
  }
  if (kind === 1) {
    ctx.fillStyle = '#FFB020';
    starPath(0, 0, s * 0.6, 5, 0.45, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    cir(-s * 0.12, -s * 0.14, s * 0.12); ctx.fill();
  } else if (kind === 2) {
    ctx.fillStyle = '#7FC8F8';
    rr(ctx, -s * 0.42, -s * 0.42, s * 0.84, s * 0.84, s * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, -s * 0.3, -s * 0.3, s * 0.26, s * 0.26, s * 0.06); ctx.fill();
  } else {
    ctx.fillStyle = '#E86A9C';
    cir(0, 0, s * 0.46); ctx.fill();
    ctx.fillStyle = '#FFF';
    cir(0, 0, s * 0.16); ctx.fill();
  }
  ctx.restore();
}

// --- ⑥ おばけ -----------------------------------------------------------------------
//
//  o = { good（ピンク＝たたく）, t（ゆれ）, mood, pop（0〜1 出てきた ぐあい）}

function drawGhost(x, y, s, o) {
  o = o || {};
  const t = o.t || 0;
  const col = o.good ? '#FF8FC8' : '#7FC8F8';
  const dark = o.good ? '#E05C9E' : '#4A96D8';
  ctx.save();
  ctx.translate(x, y + (1 - (o.pop === undefined ? 1 : o.pop)) * s * 0.9);
  ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;

  // からだ（下が ひらひら）
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, s * 0.1);
  ctx.quadraticCurveTo(-s * 0.46, -s * 0.62, 0, -s * 0.62);
  ctx.quadraticCurveTo(s * 0.46, -s * 0.62, s * 0.42, s * 0.1);
  for (let i = 0; i < 4; i++) {
    const x0 = s * 0.42 - i * s * 0.21;
    const dy = Math.sin(t * 3 + i) * s * 0.06;
    ctx.quadraticCurveTo(x0 - s * 0.105, s * 0.3 + dy, x0 - s * 0.21, s * 0.1 + dy * 0.4);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ell(-s * 0.16, -s * 0.3, s * 0.12, s * 0.18, -0.3); ctx.fill();

  eyes(0, -s * 0.26, s * 0.15, s * 0.16, o.mood || (o.good ? 'idle' : 'wink'), o.look);
  ctx.fillStyle = '#5A2038';
  ell(0, -s * 0.02, s * 0.1, s * (o.mood === 'wow' ? 0.14 : 0.08)); ctx.fill();
  blush(0, -s * 0.08, s * 0.3, s * 0.28, 'rgba(255,255,255,0.35)');

  // 青おばけ には ✕ の しるし（たたいちゃ だめ）
  if (!o.good) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, -s * 0.66); ctx.lineTo(s * 0.14, -s * 0.9);
    ctx.moveTo(s * 0.14, -s * 0.66); ctx.lineTo(-s * 0.14, -s * 0.9);
    ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = s * 0.03;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ばね じかけの パンチグローブ
function drawGlove(x, y, s, ext) {
  ctx.save();
  ctx.translate(x, y);
  const e = Math.max(0, Math.min(1, ext));
  // ばね
  ctx.strokeStyle = '#B8C4D8'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath();
  const len = s * 1.5 * e;
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const px = -len * u;
    const py = Math.sin(u * Math.PI * 6) * s * 0.16;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = '#FF5C8A';
  cir(0, 0, s * 0.44); ctx.fill();
  ctx.fillStyle = '#FF8FB8';
  cir(-s * 0.1, -s * 0.12, s * 0.16); ctx.fill();
  ctx.fillStyle = '#D8386A';
  rr(ctx, -s * 0.5, -s * 0.16, s * 0.16, s * 0.32, s * 0.06); ctx.fill();
  ctx.restore();
}

// --- ⑦ りな（しかいしゃ）------------------------------------------------------------

function drawRina(x, y, s, o) {
  o = o || {};
  const arm = o.arm || 0;
  shadow(x, y, s * 0.36, 0.24);
  ctx.save();
  ctx.translate(x, y - (o.jump || 0) * s * 0.2);

  // あし
  ctx.strokeStyle = '#F0C8A8'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.34); ctx.lineTo(-s * 0.12, -s * 0.02);
  ctx.moveTo(s * 0.1, -s * 0.34); ctx.lineTo(s * 0.12, -s * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#E04A6E';
  for (const sg of [-1, 1]) { ell(sg * s * 0.12, -s * 0.01, s * 0.09, s * 0.05); ctx.fill(); }

  // スカート
  const g = ctx.createLinearGradient(0, -s * 0.7, 0, -s * 0.3);
  g.addColorStop(0, '#FF8FC0'); g.addColorStop(1, '#E8558F');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.72);
  ctx.lineTo(s * 0.22, -s * 0.72);
  ctx.lineTo(s * 0.34, -s * 0.3);
  ctx.lineTo(-s * 0.34, -s * 0.3);
  ctx.closePath(); ctx.fill();
  // ほし の かざり
  ctx.fillStyle = '#FFE066';
  starPath(s * 0.14, -s * 0.44, s * 0.07, 5, 0.45, 0.3); ctx.fill();

  // うで
  ctx.strokeStyle = '#F0C8A8'; ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.66);
  ctx.lineTo(-s * 0.36, -s * 0.4 - arm * s * 0.5);
  ctx.moveTo(s * 0.2, -s * 0.66);
  ctx.lineTo(s * 0.36 + arm * s * 0.1, -s * 0.42 - arm * s * 0.46);
  ctx.stroke();

  // あたま
  const hy = -s * 1.02;
  const hs = s * 0.3;
  // かみ（うしろ）。
  // ★ ここを 大きな まる 1つで かいて いたら、かみが あごの 下まで まわりこんで
  //   「ひげが 生えて いる」ように 見えて しまった。
  //   「あたまの うしろ」と「ほほの よこに たれる 分」に わけて、
  //   あごの 下には ぜったいに かからない ように する。
  ctx.fillStyle = '#5A3520';
  ell(0, hy - hs * 0.1, hs * 1.18, hs * 1.08); ctx.fill();
  for (const sg of [-1, 1]) {
    ell(sg * hs * 0.94, hy + hs * 0.22, hs * 0.27, hs * 0.6); ctx.fill();
  }
  ctx.fillStyle = '#FFE0C8';
  cir(0, hy, hs * 1.02); ctx.fill();
  // まえがみ
  ctx.fillStyle = '#5A3520';
  ctx.beginPath();
  ctx.arc(0, hy - hs * 0.1, hs * 1.03, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath(); ctx.fill();
  // ツインテール
  for (const sg of [-1, 1]) {
    ctx.fillStyle = '#5A3520';
    ell(sg * hs * 1.15, hy + hs * 0.36, hs * 0.34, hs * 0.6, sg * 0.3); ctx.fill();
    ctx.fillStyle = '#FF6FA8';
    cir(sg * hs * 1.0, hy - hs * 0.16, hs * 0.2); ctx.fill();
  }
  eyes(0, hy + hs * 0.1, hs * 0.44, hs * 0.4, o.mood || 'idle', o.look);
  blush(0, hy + hs * 0.42, hs * 0.5, hs * 0.62);
  mouth(0, hy + hs * 0.52, hs * 0.4, o.open || 0, true);

  // マイク
  if (o.mic) {
    ctx.save();
    ctx.translate(s * 0.4 + arm * s * 0.1, -s * 0.44 - arm * s * 0.46);
    ctx.rotate(-0.5 - arm * 0.5);
    ctx.fillStyle = '#3A3448';
    rr(ctx, -s * 0.03, 0, s * 0.06, s * 0.24, s * 0.02); ctx.fill();
    ctx.fillStyle = '#C8D2E0';
    cir(0, -s * 0.05, s * 0.09); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// --- はいけい に つかう もの ---------------------------------------------------------

function skyGrad(y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}

function drawCloud(x, y, s, a) {
  ctx.fillStyle = 'rgba(255,255,255,' + (a === undefined ? 0.8 : a) + ')';
  ell(x, y, s, s * 0.55); ctx.fill();
  ell(x - s * 0.6, y + s * 0.16, s * 0.55, s * 0.34); ctx.fill();
  ell(x + s * 0.62, y + s * 0.14, s * 0.6, s * 0.36); ctx.fill();
}

function drawSpark(x, y, s, t, col) {
  // たたいた ときの きらきら
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 2;
    const d = s * (0.4 + t * 1.2);
    ctx.globalAlpha = Math.max(0, 1 - t);
    sparkle(x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.3 * (1 - t * 0.5), col);
  }
  ctx.globalAlpha = 1;
}
