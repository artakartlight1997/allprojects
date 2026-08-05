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

  // ふわふわは つや消しで もこもこ
  if (p.foamRatio > 0.15) {
    c.save(); c.clip();
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

  // つや（ハイライト）
  c.save(); c.clip();
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

// のばしたときの帯
function drawBand(c, b, px, py, p, broken) {
  const dx = px - b.x, dy = py - b.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const w0 = b.r * 0.55, w1 = b.r * 0.14;
  const thin = broken ? 0 : Math.max(0.12, 1 - len / (b.r * 14));
  c.save();
  c.beginPath();
  c.moveTo(b.x + nx * w0, b.y + ny * w0);
  c.quadraticCurveTo(b.x + ux * len * 0.5 + nx * w0 * thin * 0.7,
                     b.y + uy * len * 0.5 + ny * w0 * thin * 0.7,
                     px + nx * w1 * thin, py + ny * w1 * thin);
  c.lineTo(px - nx * w1 * thin, py - ny * w1 * thin);
  c.quadraticCurveTo(b.x + ux * len * 0.5 - nx * w0 * thin * 0.7,
                     b.y + uy * len * 0.5 - ny * w0 * thin * 0.7,
                     b.x - nx * w0, b.y - ny * w0);
  c.closePath();
  const g = c.createLinearGradient(b.x, b.y, px, py);
  g.addColorStop(0, rgbCss(p.rgb));
  g.addColorStop(1, rgbCss(shade(p.rgb, 0.2)));
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = rgbCss(shade(p.rgb, -0.28), 0.7);
  c.lineWidth = Math.max(1, b.r * 0.02);
  c.stroke();
  c.restore();
}

// ボウルの中の見本（ラボ画面）
function drawBowl(c, x, y, w, h, m, p) {
  c.save();
  // ボウル
  c.fillStyle = '#E4EAF0';
  c.beginPath();
  c.ellipse(x + w / 2, y + h * 0.34, w * 0.46, h * 0.2, 0, 0, 7);
  c.fill();
  c.fillStyle = '#D2DAE4';
  c.beginPath();
  c.moveTo(x + w * 0.04, y + h * 0.34);
  c.quadraticCurveTo(x + w / 2, y + h * 1.16, x + w * 0.96, y + h * 0.34);
  c.closePath();
  c.fill();
  // 中身
  const vol = Math.min(1, p.volume / 62);   // 62ml くらいで ボウルいっぱいに見える
  if (vol > 0.01) {
    c.save();
    c.beginPath();
    c.moveTo(x + w * 0.06, y + h * 0.36);
    c.quadraticCurveTo(x + w / 2, y + h * 1.1, x + w * 0.94, y + h * 0.36);
    c.closePath();
    c.clip();
    const top = y + h * (1.02 - vol * 0.62);
    c.fillStyle = rgbCss(p.rgb);
    c.fillRect(x, top, w, h * 1.2);
    // 表面
    c.fillStyle = rgbCss(shade(p.rgb, 0.25));
    c.beginPath();
    c.ellipse(x + w / 2, top, w * 0.42, h * 0.07, 0, 0, 7);
    c.fill();
    if (p.sparkle > 0.03) {
      for (let i = 0; i < 30; i++) {
        const a = i * 2.399;
        c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(i + Date.now() / 400));
        c.fillStyle = '#FFF6C8';
        c.beginPath();
        c.arc(x + w / 2 + Math.cos(a) * w * 0.3, top + h * 0.1 + Math.sin(a) * h * 0.2,
              w * 0.008, 0, 7);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }
  c.strokeStyle = '#B8C2CE';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(x + w / 2, y + h * 0.34, w * 0.46, h * 0.2, 0, 0, 7);
  c.stroke();
  c.restore();
}
