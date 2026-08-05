// スライムの見た目と ぷにぷに の動き。
//
// まわりに 16 個の点をおいて、それぞれをバネで もとの丸にもどす。
// つつくと その点が へこみ、まわりに 波が伝わる。やわらかいほど
// バネが弱く、ゆれが長くつづく。

'use strict';

const BLOB_N = 16;

function makeBlob(x, y, r) {
  const pts = [];
  for (let i = 0; i < BLOB_N; i++) pts.push({ off: 0, vel: 0 });
  return { x, y, r, pts, sx: 1, sy: 1, vy: 0, vsy: 0, t: 0 };
}

function blobUpdate(b, dt, p) {
  b.t += dt;
  // やわらかいほど バネが弱く よくゆれる
  const k = 60 - p.soft * 34;          // バネの強さ
  const damp = 3.2 + (1 - p.soft) * 5; // 止まりやすさ
  const spread = 0.22 + p.soft * 0.2;  // となりへ伝わる量
  const n = b.pts.length;
  const cur = b.pts.map((q) => q.off);
  for (let i = 0; i < n; i++) {
    const q = b.pts[i];
    const nb = (cur[(i - 1 + n) % n] + cur[(i + 1) % n]) / 2;
    q.vel += (-k * q.off + (nb - q.off) * k * spread) * dt;
    q.vel -= q.vel * damp * dt;
    q.off += q.vel * dt;
    if (Math.abs(q.off) > b.r * 0.55) q.off = Math.sign(q.off) * b.r * 0.55;
  }
  // つぶれ具合も バネでもどす
  b.vsy += (-k * (b.sy - 1)) * dt;
  b.vsy -= b.vsy * damp * dt;
  b.sy += b.vsy * dt;
  b.sx = 1 + (1 - b.sy) * 0.6;
}

// (px,py) を つついたときの へこみ
function blobPoke(b, px, py, power, p) {
  const ang = Math.atan2(py - b.y, px - b.x);
  const n = b.pts.length;
  const amp = b.r * 0.34 * power * (0.5 + p.soft * 0.9);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    let d = Math.abs(((a - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const w = Math.max(0, 1 - d / 1.5);
    b.pts[i].vel -= amp * w * 9;
  }
  b.vsy -= power * 3 * (0.4 + p.soft);
}

// ひっぱられている あいだ、ゆびの方へ たまが とんがる
function blobPull(b, ang, amount) {
  const n = b.pts.length;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const d = Math.abs(((a - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const w = Math.max(0, 1 - d / 1.15);
    const q = b.pts[i];
    q.off += (amount * w * w - q.off) * 0.3;
  }
}

function blobPath(c, b) {
  const n = b.pts.length;
  const px = [], py = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const r = b.r + b.pts[i].off;
    px.push(b.x + Math.cos(a) * r * b.sx);
    py.push(b.y + Math.sin(a) * r * b.sy);
  }
  c.beginPath();
  c.moveTo((px[0] + px[n - 1]) / 2, (py[0] + py[n - 1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    c.quadraticCurveTo(px[i], py[i], (px[i] + px[j]) / 2, (py[i] + py[j]) / 2);
  }
  c.closePath();
}

// スライム本体。つや・ラメ・つぶつぶ を 性質から描き分ける
function drawSlime(c, b, p, opts) {
  opts = opts || {};
  const base = p.rgb;
  const hi = shade(base, 0.55), lo = shade(base, -0.35);

  // 影
  c.save();
  c.globalAlpha = 0.22;
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(b.x, b.y + b.r * b.sy * 0.95, b.r * 0.85 * b.sx, b.r * 0.2, 0, 0, 7);
  c.fill();
  c.restore();

  c.save();
  blobPath(c, b);
  const g = c.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r * 0.4, b.y + b.r);
  g.addColorStop(0, rgbCss(shade(base, 0.18 + p.gloss * 0.2)));
  g.addColorStop(0.55, rgbCss(base));
  g.addColorStop(1, rgbCss(lo));
  c.fillStyle = g;
  c.fill();

  // まぜ足りないと しま模様が のこる。
  // まぜたのに 色がそろっていない ＝ 混ぜ残し、が そのまま 見た目に出る
  if (p.marble && p.marble.length && p.stir < 0.8) {
    c.save(); blobPath(c, b); c.clip();
    c.globalAlpha = Math.min(0.9, (0.8 - p.stir) * 1.7);
    for (let i = 0; i < p.marble.length; i++) {
      const mk = p.marble[i];
      const mx = b.x + (mk[3] || 0) * b.r * 0.72 * b.sx;
      const my = b.y + (mk[4] || 0) * b.r * 0.72 * b.sy;
      const rr = b.r * 0.5;
      const gg = c.createRadialGradient(mx, my, 0, mx, my, rr);
      gg.addColorStop(0, 'rgba(' + mk[0] + ',' + mk[1] + ',' + mk[2] + ',0.85)');
      gg.addColorStop(1, 'rgba(' + mk[0] + ',' + mk[1] + ',' + mk[2] + ',0)');
      c.fillStyle = gg;
      c.beginPath(); c.arc(mx, my, rr, 0, 7); c.fill();
    }
    c.restore();
    c.globalAlpha = 1;
  }

  // ふわふわは つや消しで もこもこ
  if (p.foamRatio > 0.15) {
    c.save(); blobPath(c, b); c.clip();
    c.globalAlpha = Math.min(0.5, p.foamRatio * 0.8);
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399, rr = b.r * (0.15 + (i % 7) * 0.12);
      c.beginPath();
      c.arc(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * b.sy,
            b.r * (0.10 + (i % 3) * 0.03), 0, 7);
      c.fill();
    }
    c.restore();
  }

  // つや（ハイライト）。
  // ここから下は ぜんぶ スライムの形の中だけに描く。clip する前に
  // 形を引きなおしているのは、上のブロックで path が消えているため
  c.save(); blobPath(c, b); c.clip();
  c.globalAlpha = 0.25 + p.gloss * 0.5;
  c.fillStyle = rgbCss(hi);
  c.beginPath();
  c.ellipse(b.x - b.r * 0.34, b.y - b.r * 0.42 * b.sy,
            b.r * 0.3, b.r * 0.17, -0.5, 0, 7);
  c.fill();
  c.globalAlpha = 1;

  // ラメ
  if (p.sparkle > 0.03) {
    const n = Math.round(6 + p.sparkle * 44);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + b.t * 0.25;
      const rr = b.r * Math.sqrt((i % 13) / 13) * 0.92;
      const x = b.x + Math.cos(a) * rr * b.sx;
      const y = b.y + Math.sin(a) * rr * b.sy;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(b.t * 3 + i));
      c.globalAlpha = tw;
      c.fillStyle = i % 3 ? '#FFF6C8' : '#FFFFFF';
      c.beginPath(); c.arc(x, y, b.r * 0.022, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }

  // ビーズ
  if (p.crunch > 0.03) {
    const n = Math.round(4 + p.crunch * 40);
    for (let i = 0; i < n; i++) {
      const a = i * 1.71 + 0.4;
      const rr = b.r * Math.sqrt(((i * 7) % 17) / 17) * 0.86;
      const x = b.x + Math.cos(a) * rr * b.sx;
      const y = b.y + Math.sin(a) * rr * b.sy;
      c.fillStyle = ['#F6A5C0', '#A5D8F6', '#F6E3A5', '#C0F6A5'][i % 4];
      c.beginPath(); c.arc(x, y, b.r * 0.038, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath(); c.arc(x - b.r * 0.012, y - b.r * 0.012, b.r * 0.014, 0, 7); c.fill();
    }
  }
  c.restore();

  // ふち
  c.strokeStyle = rgbCss(shade(base, -0.28), 0.8);
  c.lineWidth = Math.max(1.5, b.r * 0.03);
  blobPath(c, b);
  c.stroke();

  // かお（あそぶときだけ）
  if (opts.face) {
    const ey = b.y - b.r * 0.12 * b.sy;
    const er = b.r * 0.09;
    c.fillStyle = '#2B2630';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(b.x + s * b.r * 0.24 * b.sx, ey, er * 0.55,
                er * (opts.blink ? 0.12 : 1), 0, 0, 7);
      c.fill();
    }
    c.strokeStyle = '#2B2630';
    c.lineWidth = Math.max(1.5, b.r * 0.028);
    c.beginPath();
    c.arc(b.x, ey + b.r * 0.1, b.r * 0.12, 0.3, Math.PI - 0.3);
    c.stroke();
  }
  c.restore();
}

// ボウル（ラボ画面）。
// 中を のぞきこんだ角度にしてあるので、まざり具合が そのまま見える。
function bowlGeom(x, y, w, h) {
  return { cx: x + w / 2, cy: y + h * 0.42, rx: w * 0.46, ry: h * 0.30 };
}

function drawBowl(c, x, y, w, h, m, p, bath, t) {
  const G = bowlGeom(x, y, w, h);
  c.save();
  // そとがわ
  c.fillStyle = '#C6D0DC';
  c.beginPath();
  c.moveTo(G.cx - G.rx, G.cy);
  c.quadraticCurveTo(G.cx, G.cy + h * 0.86, G.cx + G.rx, G.cy);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.moveTo(G.cx - G.rx * 0.82, G.cy + G.ry * 0.4);
  c.quadraticCurveTo(G.cx - G.rx * 0.5, G.cy + h * 0.5,
                     G.cx - G.rx * 0.12, G.cy + h * 0.58);
  c.lineWidth = w * 0.03; c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.stroke();
  // 内がわ（からっぽの かげ）
  c.fillStyle = '#A9B5C4';
  c.beginPath(); c.ellipse(G.cx, G.cy, G.rx, G.ry, 0, 0, 7); c.fill();

  // 中身
  const k = bathScale(p.volume);
  const RX = G.rx * k, RY = G.ry * k;
  // 絵の具だけ 入れても「かさ」は ふえないので、
  // 何か入っていれば 見えるようにしておく
  const paint = m.red + m.yellow + m.blue + m.white + m.black
              + m.glitter + m.beads;
  if (p.volume > 0.4 || paint > 0.3) {
    c.save();
    c.beginPath(); c.ellipse(G.cx, G.cy, RX, RY, 0, 0, 7); c.clip();
    const img = bathImage(bath, p.rgb);
    c.imageSmoothingEnabled = true;
    c.drawImage(img, G.cx - RX, G.cy - RY, RX * 2, RY * 2);
    // てり
    c.globalAlpha = 0.22;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.ellipse(G.cx - RX * 0.34, G.cy - RY * 0.38, RX * 0.3, RY * 0.18, -0.5, 0, 7);
    c.fill();
    c.globalAlpha = 1;
    if (p.sparkle > 0.03) {
      for (let i = 0; i < 34; i++) {
        const a = i * 2.399;
        const rr = Math.sqrt((i % 11) / 11) * 0.9;
        c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(i + t * 3));
        c.fillStyle = i % 3 ? '#FFF6C8' : '#FFFFFF';
        c.beginPath();
        c.arc(G.cx + Math.cos(a) * RX * rr, G.cy + Math.sin(a) * RY * rr,
              RX * 0.02, 0, 7);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    c.restore();
    c.strokeStyle = rgbCss(shade(p.rgb, -0.3), 0.5);
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(G.cx, G.cy, RX, RY, 0, 0, 7); c.stroke();
  }

  // へら（かきまぜているあいだ だけ）
  if (bath.spoon) {
    const sx = G.cx + bath.spoon.x * RX, sy = G.cy + bath.spoon.y * RY;
    c.save();
    c.translate(sx, sy);
    c.rotate(-0.5);
    c.fillStyle = '#C99A5E';
    rrPath(c, -w * 0.035, -h * 0.10, w * 0.07, h * 0.20, w * 0.03);
    c.fill();
    c.fillStyle = '#B5854A';
    c.fillRect(-w * 0.014, -h * 0.34, w * 0.028, h * 0.26);
    c.restore();
  }

  // ふち
  c.strokeStyle = '#8E9BAC';
  c.lineWidth = Math.max(3, w * 0.014);
  c.beginPath(); c.ellipse(G.cx, G.cy, G.rx, G.ry, 0, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = Math.max(1.5, w * 0.006);
  c.beginPath();
  c.ellipse(G.cx, G.cy - G.ry * 0.04, G.rx * 0.97, G.ry * 0.94, 0, 0, 7);
  c.stroke();

  // したたる しずく
  for (const d of bath.drops) {
    c.fillStyle = d.col;
    c.beginPath();
    c.ellipse(d.x, d.y, w * 0.016, w * 0.026, 0, 0, 7);
    c.fill();
  }
  c.restore();
}

function rrPath(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// 材料の びん。ゆびで つかんで ボウルへ もっていく
function drawBottle(c, x, y, w, h, g, tilt) {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  const bw = w, bh = h;
  // 首
  c.fillStyle = '#DCE6EE';
  c.fillRect(-bw * 0.16, -bh * 0.62, bw * 0.32, bh * 0.22);
  // 胴
  c.fillStyle = '#EDF3F8';
  rrPath(c, -bw / 2, -bh * 0.42, bw, bh * 0.84, bw * 0.22);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 2; c.stroke();
  // 中身
  c.fillStyle = g.col;
  rrPath(c, -bw * 0.36, -bh * 0.22, bw * 0.72, bh * 0.56, bw * 0.14);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1.5; c.stroke();
  // つや
  c.fillStyle = 'rgba(255,255,255,0.55)';
  rrPath(c, -bw * 0.3, -bh * 0.34, bw * 0.14, bh * 0.5, bw * 0.06);
  c.fill();
  // ふた
  c.fillStyle = '#7A6A8A';
  rrPath(c, -bw * 0.22, -bh * 0.72, bw * 0.44, bh * 0.16, bw * 0.06);
  c.fill();
  c.restore();
}
