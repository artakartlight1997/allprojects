// りなシリーズで つかう「かわいい絵」の としょかん。
//
// ★ 画像ファイルは 1まいも つかわない。ぜんぶ その場で 描く。
//   えいご、まちがいさがし、カードめくり で 同じ 絵を つかいまわす ので、
//   1か所 直せば ぜんぶ きれいに なる。
//
// ★ つかいかた
//     <script src="/allprojects/rinaart.js?v=1"></script>
//     ITEMS[i].draw(x, y, s, col)      … x,y は まん中、s は 大きさ（はんけい）
//     drawRinaFace(x, y, s, mood)      … りなの かお
//     drawRinaBody(x, y, s, opt)       … りなの ぜんしん
//
// ★ ITEMS の なかみ
//     key   … プログラムで つかう 名まえ
//     ja    … にほんご
//     en    … えいご（1つ）        ens … えいご（2つ いじょう）
//     cols  … その ものが とれる 色（まちがいさがし で つかう）

'use strict';

const RA = {};   // 中で つかう 小さな どうぐ

RA.c = function (x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); };
RA.rr = function (x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
};
RA.eyes = function (x, y, s, d) {
  d = d === undefined ? 0.34 : d;
  ctx.fillStyle = '#2A2028';
  RA.c(x - s * d, y, s * 0.11); ctx.fill();
  RA.c(x + s * d, y, s * 0.11); ctx.fill();
  ctx.fillStyle = '#FFF';
  RA.c(x - s * d - s * 0.04, y - s * 0.04, s * 0.04); ctx.fill();
  RA.c(x + s * d - s * 0.04, y - s * 0.04, s * 0.04); ctx.fill();
};
RA.cheek = function (x, y, s, d) {
  ctx.fillStyle = 'rgba(255,120,150,0.42)';
  RA.c(x - s * d, y, s * 0.11); ctx.fill();
  RA.c(x + s * d, y, s * 0.11); ctx.fill();
};
RA.smile = function (x, y, s, w) {
  ctx.strokeStyle = '#A0485E';
  ctx.lineWidth = Math.max(1.2, s * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, s * (w || 0.14), 0.25, Math.PI - 0.25);
  ctx.stroke();
};

// --- ひとつずつの もの --------------------------------------------------------------

const ITEMS = [
  { key: 'apple', ja: 'りんご', en: 'apple', ens: 'apples', a: 'an',
    cols: ['#E8434A', '#7ACB4A', '#F0A030'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = '#6A4A2A';
      RA.rr(x - s * 0.06, y - s * 0.95, s * 0.12, s * 0.4, s * 0.06); ctx.fill();
      ctx.fillStyle = '#5AA83A';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.34, y - s * 0.72, s * 0.3, s * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col || '#E8434A';
      RA.c(x - s * 0.3, y + s * 0.1, s * 0.6); ctx.fill();
      RA.c(x + s * 0.3, y + s * 0.1, s * 0.6); ctx.fill();
      RA.rr(x - s * 0.9, y - s * 0.2, s * 1.8, s * 0.7, s * 0.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.36, y - s * 0.24, s * 0.2, s * 0.32, -0.4, 0, Math.PI * 2); ctx.fill();
    } },

  { key: 'banana', ja: 'バナナ', en: 'banana', ens: 'bananas', a: 'a',
    cols: ['#FFD24A', '#B8E04A', '#E8B060'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#FFD24A';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.85, y - s * 0.5);
      ctx.quadraticCurveTo(x, y + s * 0.95, x + s * 0.9, y - s * 0.25);
      ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.5, x - s * 0.62, y - s * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7A5A2A';
      RA.rr(x - s * 0.95, y - s * 0.62, s * 0.24, s * 0.2, s * 0.08); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y - s * 0.26);
      ctx.quadraticCurveTo(x - s * 0.05, y + s * 0.38, x + s * 0.55, y - s * 0.12);
      ctx.quadraticCurveTo(x - s * 0.05, y + s * 0.2, x - s * 0.55, y - s * 0.12);
      ctx.closePath(); ctx.fill();
    } },

  { key: 'strawberry', ja: 'いちご', en: 'strawberry', ens: 'strawberries', a: 'a',
    cols: ['#F0405A', '#FF8FB0', '#E8E04A'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#F0405A';
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.95);
      ctx.quadraticCurveTo(x - s * 0.95, y + s * 0.15, x - s * 0.6, y - s * 0.5);
      ctx.quadraticCurveTo(x, y - s * 0.85, x + s * 0.6, y - s * 0.5);
      ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.15, x, y + s * 0.95);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4AA83A';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(x + i * s * 0.26, y - s * 0.55, s * 0.22, s * 0.12, i * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 7; i++) {
        const a = i * 1.9;
        RA.c(x + Math.cos(a) * s * 0.38, y + Math.sin(a) * s * 0.34 + s * 0.12, s * 0.055);
        ctx.fill();
      }
    } },

  { key: 'cat', ja: 'ねこ', en: 'cat', ens: 'cats', a: 'a',
    cols: ['#F0C070', '#9AA4B4', '#F0F0F0'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#F0C070';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55, y - s * 0.35);
      ctx.lineTo(x - s * 0.72, y - s * 0.95);
      ctx.lineTo(x - s * 0.18, y - s * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.55, y - s * 0.35);
      ctx.lineTo(x + s * 0.72, y - s * 0.95);
      ctx.lineTo(x + s * 0.18, y - s * 0.62);
      ctx.closePath(); ctx.fill();
      RA.c(x, y, s * 0.72); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.28, s * 0.42, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      RA.eyes(x, y - s * 0.06, s, 0.3);
      ctx.fillStyle = '#E8748A';
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.28);
      ctx.lineTo(x - s * 0.11, y + s * 0.14);
      ctx.lineTo(x + s * 0.11, y + s * 0.14);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = Math.max(1, s * 0.05);
      for (const sg of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(x + sg * s * 0.2, y + s * 0.22);
          ctx.lineTo(x + sg * s * 0.92, y + s * 0.22 + i * s * 0.2);
          ctx.stroke();
        }
      }
    } },

  { key: 'dog', ja: 'いぬ', en: 'dog', ens: 'dogs', a: 'a',
    cols: ['#C88A50', '#5A4A3A', '#E8D8B8'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#C88A50';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.66, y - s * 0.05, s * 0.24, s * 0.46, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.66, y - s * 0.05, s * 0.24, s * 0.46, -0.2, 0, Math.PI * 2); ctx.fill();
      RA.c(x, y, s * 0.7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.3, s * 0.4, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      RA.eyes(x, y - s * 0.1, s, 0.28);
      ctx.fillStyle = '#3A2A28';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.22, s * 0.16, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3A2A28'; ctx.lineWidth = Math.max(1.2, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.32); ctx.lineTo(x, y + s * 0.44);
      ctx.moveTo(x, y + s * 0.44); ctx.arc(x - s * 0.1, y + s * 0.44, s * 0.1, 0, Math.PI);
      ctx.moveTo(x, y + s * 0.44); ctx.arc(x + s * 0.1, y + s * 0.44, s * 0.1, 0, Math.PI);
      ctx.stroke();
    } },

  { key: 'bird', ja: 'とり', en: 'bird', ens: 'birds', a: 'a',
    cols: ['#5AC8E8', '#FF9AB0', '#FFD24A'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#5AC8E8';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.05, y + s * 0.16, s * 0.66, s * 0.56, 0, 0, Math.PI * 2); ctx.fill();
      RA.c(x + s * 0.36, y - s * 0.36, s * 0.42); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.14, y + s * 0.2, s * 0.38, s * 0.3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F0A030';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.72, y - s * 0.38);
      ctx.lineTo(x + s * 1.05, y - s * 0.26);
      ctx.lineTo(x + s * 0.72, y - s * 0.16);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2A2028';
      RA.c(x + s * 0.46, y - s * 0.44, s * 0.09); ctx.fill();
      ctx.fillStyle = col || '#5AC8E8';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y + s * 0.1);
      ctx.lineTo(x - s * 1.05, y - s * 0.2);
      ctx.lineTo(x - s * 0.95, y + s * 0.34);
      ctx.closePath(); ctx.fill();
    } },

  { key: 'fish', ja: 'さかな', en: 'fish', ens: 'fish', a: 'a',
    cols: ['#F08A3A', '#5AC8E8', '#FF7AA8'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#F08A3A';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.1, y, s * 0.72, s * 0.46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55, y);
      ctx.lineTo(x - s * 1.05, y - s * 0.42);
      ctx.lineTo(x - s * 1.05, y + s * 0.42);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.14, y + s * 0.12, s * 0.5, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF';
      RA.c(x + s * 0.46, y - s * 0.1, s * 0.16); ctx.fill();
      ctx.fillStyle = '#2A2028';
      RA.c(x + s * 0.5, y - s * 0.1, s * 0.08); ctx.fill();
    } },

  { key: 'rabbit', ja: 'うさぎ', en: 'rabbit', ens: 'rabbits', a: 'a',
    cols: ['#FFFFFF', '#F0C8D8', '#D8CCC0'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#FFFFFF';
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + sg * s * 0.3, y - s * 0.78, s * 0.18, s * 0.46, sg * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F5A8B8';
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + sg * s * 0.3, y - s * 0.76, s * 0.09, s * 0.3, sg * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = col || '#FFFFFF';
      RA.c(x, y + s * 0.05, s * 0.62); ctx.fill();
      RA.eyes(x, y - s * 0.02, s, 0.28);
      ctx.fillStyle = '#F5889A';
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3); ctx.lineTo(x - s * 0.1, y + s * 0.18);
      ctx.lineTo(x + s * 0.1, y + s * 0.18); ctx.closePath(); ctx.fill();
      RA.cheek(x, y + s * 0.2, s, 0.42);
    } },

  { key: 'bear', ja: 'くま', en: 'bear', ens: 'bears', a: 'a',
    cols: ['#B98A5A', '#E8C8A0', '#8A6A50'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#B98A5A';
      RA.c(x - s * 0.6, y - s * 0.52, s * 0.3); ctx.fill();
      RA.c(x + s * 0.6, y - s * 0.52, s * 0.3); ctx.fill();
      RA.c(x, y, s * 0.72); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.26, s * 0.36, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      RA.eyes(x, y - s * 0.1, s, 0.28);
      ctx.fillStyle = '#4A3028';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.2, s * 0.14, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      RA.smile(x, y + s * 0.26, s, 0.16);
    } },

  { key: 'ball', ja: 'ボール', en: 'ball', ens: 'balls', a: 'a',
    cols: ['#4A9BFF', '#FF6A8A', '#7ADC80'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#4A9BFF';
      RA.c(x, y, s * 0.85); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.85, y);
      ctx.quadraticCurveTo(x, y - s * 0.42, x + s * 0.85, y);
      ctx.quadraticCurveTo(x, y + s * 0.42, x - s * 0.85, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      RA.c(x - s * 0.32, y - s * 0.4, s * 0.16); ctx.fill();
    } },

  { key: 'book', ja: 'ほん', en: 'book', ens: 'books', a: 'a',
    cols: ['#C85A6A', '#4A8AD8', '#5AB86A'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#C85A6A';
      RA.rr(x - s * 0.78, y - s * 0.62, s * 1.56, s * 1.24, s * 0.1); ctx.fill();
      ctx.fillStyle = '#FFF8E8';
      RA.rr(x - s * 0.62, y - s * 0.48, s * 1.3, s * 0.96, s * 0.06); ctx.fill();
      ctx.fillStyle = col || '#C85A6A';
      RA.rr(x - s * 0.06, y - s * 0.62, s * 0.12, s * 1.24, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(90,80,90,0.4)'; ctx.lineWidth = Math.max(1, s * 0.04);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - s * 0.52, y - s * 0.28 + i * s * 0.26);
        ctx.lineTo(x - s * 0.14, y - s * 0.28 + i * s * 0.26);
        ctx.moveTo(x + s * 0.14, y - s * 0.28 + i * s * 0.26);
        ctx.lineTo(x + s * 0.52, y - s * 0.28 + i * s * 0.26);
        ctx.stroke();
      }
    } },

  { key: 'pencil', ja: 'えんぴつ', en: 'pencil', ens: 'pencils', a: 'a',
    cols: ['#F0B830', '#7ACBE8', '#FF8FB0'],
    draw: function (x, y, s, col) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(-0.45);
      ctx.fillStyle = col || '#F0B830';
      RA.rr(-s * 0.2, -s * 0.7, s * 0.4, s * 1.2, s * 0.05); ctx.fill();
      ctx.fillStyle = '#E8D8B0';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.5); ctx.lineTo(s * 0.2, s * 0.5);
      ctx.lineTo(0, s * 0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3A3038';
      ctx.beginPath();
      ctx.moveTo(-s * 0.07, s * 0.78); ctx.lineTo(s * 0.07, s * 0.78);
      ctx.lineTo(0, s * 0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8748A';
      RA.rr(-s * 0.21, -s * 0.98, s * 0.42, s * 0.3, s * 0.08); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      RA.rr(-s * 0.2, -s * 0.7, s * 0.14, s * 1.2, s * 0.05); ctx.fill();
      ctx.restore();
    } },

  { key: 'cup', ja: 'コップ', en: 'cup', ens: 'cups', a: 'a',
    cols: ['#FFFFFF', '#8AD8F0', '#FFC0D0'],
    draw: function (x, y, s, col) {
      ctx.strokeStyle = col || '#FFFFFF';
      ctx.lineWidth = s * 0.16;
      ctx.beginPath(); ctx.arc(x + s * 0.72, y, s * 0.3, -1.2, 1.2); ctx.stroke();
      ctx.fillStyle = col || '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.66, y - s * 0.6);
      ctx.lineTo(x + s * 0.62, y - s * 0.6);
      ctx.lineTo(x + s * 0.48, y + s * 0.7);
      ctx.lineTo(x - s * 0.52, y + s * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C8763A';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.02, y - s * 0.58, s * 0.62, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      RA.rr(x - s * 0.5, y - s * 0.36, s * 0.16, s * 0.9, s * 0.08); ctx.fill();
    } },

  { key: 'flower', ja: 'はな', en: 'flower', ens: 'flowers', a: 'a',
    cols: ['#FF7AA8', '#FFD24A', '#C88AF0'],
    draw: function (x, y, s, col) {
      ctx.strokeStyle = '#4AA83A'; ctx.lineWidth = s * 0.12;
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.1); ctx.lineTo(x, y + s * 0.95); ctx.stroke();
      ctx.fillStyle = '#4AA83A';
      ctx.beginPath();
      ctx.ellipse(x + s * 0.28, y + s * 0.58, s * 0.28, s * 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col || '#FF7AA8';
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * s * 0.44, y + Math.sin(a) * s * 0.44 - s * 0.1,
                    s * 0.3, s * 0.22, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFE066';
      RA.c(x, y - s * 0.1, s * 0.26); ctx.fill();
    } },

  { key: 'star', ja: 'ほし', en: 'star', ens: 'stars', a: 'a',
    cols: ['#FFD24A', '#8AD8F0', '#FF9AC0'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#FFD24A';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 ? s * 0.4 : s * 0.95;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      RA.c(x - s * 0.2, y - s * 0.24, s * 0.14); ctx.fill();
    } },

  { key: 'car', ja: 'くるま', en: 'car', ens: 'cars', a: 'a',
    cols: ['#E8543A', '#4A9BFF', '#7ADC80'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#E8543A';
      RA.rr(x - s * 0.95, y - s * 0.1, s * 1.9, s * 0.62, s * 0.18); ctx.fill();
      RA.rr(x - s * 0.56, y - s * 0.66, s * 1.05, s * 0.62, s * 0.2); ctx.fill();
      ctx.fillStyle = '#BFE4F4';
      RA.rr(x - s * 0.44, y - s * 0.56, s * 0.38, s * 0.4, s * 0.08); ctx.fill();
      RA.rr(x + s * 0.02, y - s * 0.56, s * 0.38, s * 0.4, s * 0.08); ctx.fill();
      ctx.fillStyle = '#2A2830';
      RA.c(x - s * 0.52, y + s * 0.52, s * 0.28); ctx.fill();
      RA.c(x + s * 0.56, y + s * 0.52, s * 0.28); ctx.fill();
      ctx.fillStyle = '#C8C8D0';
      RA.c(x - s * 0.52, y + s * 0.52, s * 0.12); ctx.fill();
      RA.c(x + s * 0.56, y + s * 0.52, s * 0.12); ctx.fill();
      ctx.fillStyle = '#FFE066';
      RA.c(x + s * 0.88, y + s * 0.12, s * 0.12); ctx.fill();
    } },

  { key: 'hat', ja: 'ぼうし', en: 'hat', ens: 'hats', a: 'a',
    cols: ['#F0A03A', '#7A9AE8', '#E86A8A'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#F0A03A';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.42, s * 0.98, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.52, y + s * 0.42);
      ctx.quadraticCurveTo(x - s * 0.44, y - s * 0.78, x, y - s * 0.78);
      ctx.quadraticCurveTo(x + s * 0.44, y - s * 0.78, x + s * 0.52, y + s * 0.42);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      RA.rr(x - s * 0.54, y + s * 0.12, s * 1.08, s * 0.24, s * 0.1); ctx.fill();
    } },

  { key: 'cake', ja: 'ケーキ', en: 'cake', ens: 'cakes', a: 'a',
    cols: ['#FFF0E0', '#FFD8E8', '#E8D0A8'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = '#C8905A';
      RA.rr(x - s * 0.82, y - s * 0.05, s * 1.64, s * 0.75, s * 0.1); ctx.fill();
      ctx.fillStyle = col || '#FFF0E0';
      RA.rr(x - s * 0.86, y - s * 0.34, s * 1.72, s * 0.4, s * 0.14); ctx.fill();
      ctx.fillStyle = '#F06A8A';
      for (let i = -1; i <= 1; i++) { RA.c(x + i * s * 0.5, y - s * 0.42, s * 0.16); ctx.fill(); }
      ctx.fillStyle = '#F0E8D0';
      RA.rr(x - s * 0.08, y - s * 0.92, s * 0.16, s * 0.5, s * 0.05); ctx.fill();
      ctx.fillStyle = '#FFB03A';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 1.0, s * 0.1, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    } },

  { key: 'umbrella', ja: 'かさ', en: 'umbrella', ens: 'umbrellas', a: 'an',
    cols: ['#5A8AE8', '#E8546A', '#5AC8A0'],
    draw: function (x, y, s, col) {
      ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.2); ctx.lineTo(x, y + s * 0.72);
      ctx.arc(x - s * 0.16, y + s * 0.72, s * 0.16, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = col || '#5A8AE8';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.95, y - s * 0.2);
      ctx.quadraticCurveTo(x, y - s * 1.15, x + s * 0.95, y - s * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (const d of [-0.63, 0, 0.63]) {
        ctx.beginPath();
        ctx.moveTo(x + d * s - s * 0.16, y - s * 0.2);
        ctx.quadraticCurveTo(x + d * s, y - s * 0.5, x + d * s + s * 0.16, y - s * 0.2);
        ctx.closePath(); ctx.fill();
      }
    } },

  { key: 'key', ja: 'かぎ', en: 'key', ens: 'keys', a: 'a',
    cols: ['#F0C030', '#C0C8D0', '#E08A50'],
    draw: function (x, y, s, col) {
      ctx.fillStyle = col || '#F0C030';
      ctx.lineWidth = s * 0.22; ctx.strokeStyle = col || '#F0C030';
      ctx.beginPath(); ctx.arc(x - s * 0.42, y, s * 0.4, 0, Math.PI * 2); ctx.stroke();
      RA.rr(x - s * 0.1, y - s * 0.11, s * 1.05, s * 0.22, s * 0.06); ctx.fill();
      RA.rr(x + s * 0.6, y + s * 0.09, s * 0.14, s * 0.34, s * 0.05); ctx.fill();
      RA.rr(x + s * 0.86, y + s * 0.09, s * 0.14, s * 0.28, s * 0.05); ctx.fill();
    } },
];

const ITEM_BY = {};
for (const it of ITEMS) ITEM_BY[it.key] = it;

// --- りな ---------------------------------------------------------------------------

function drawRinaFace(x, y, s, mood) {
  ctx.fillStyle = '#4A2B1E';
  RA.rr(x - s * 1.06, y - s * 0.2, s * 2.12, s * 1.1, s * 0.3); ctx.fill();
  RA.c(x, y - s * 0.04, s * 1.13); ctx.fill();
  ctx.fillStyle = '#FFE0C8';
  RA.c(x, y, s); ctx.fill();
  ctx.fillStyle = '#4A2B1E';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.14, s * 0.99, Math.PI * 1.04, Math.PI * 1.96);
  ctx.closePath(); ctx.fill();
  if (mood === 'sad') {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.4, s * 0.11);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * s * 0.38 - s * 0.15, y + s * 0.02);
      ctx.lineTo(x + sg * s * 0.38 + s * 0.15, y + s * 0.18);
      ctx.stroke();
    }
  } else if (mood === 'happy') {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.4, s * 0.1);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sg * s * 0.38, y + s * 0.18, s * 0.17, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2A2028';
    RA.c(x - s * 0.38, y + s * 0.12, s * 0.17); ctx.fill();
    RA.c(x + s * 0.38, y + s * 0.12, s * 0.17); ctx.fill();
    ctx.fillStyle = '#FFF';
    RA.c(x - s * 0.44, y + s * 0.06, s * 0.06); ctx.fill();
    RA.c(x + s * 0.32, y + s * 0.06, s * 0.06); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  RA.c(x - s * 0.66, y + s * 0.34, s * 0.16); ctx.fill();
  RA.c(x + s * 0.66, y + s * 0.34, s * 0.16); ctx.fill();
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1.2, s * 0.1);
  ctx.beginPath();
  if (mood === 'sad') ctx.arc(x, y + s * 0.72, s * 0.2, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y + s * 0.4, s * 0.22, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // リボン
  ctx.fillStyle = '#FF6FA8';
  RA.c(x - s * 1.0, y - s * 0.66, s * 0.2); ctx.fill();
  RA.c(x - s * 1.28, y - s * 0.78, s * 0.16); ctx.fill();
  RA.c(x - s * 0.76, y - s * 0.84, s * 0.16); ctx.fill();
}

function drawRinaBody(x, y, s, opt) {
  opt = opt || {};
  const arm = opt.arm || 0;      // 0=下 1=さす
  ctx.strokeStyle = '#3A4A6A'; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y + s * 0.5); ctx.lineTo(x - s * 0.24, y + s * 1.1);
  ctx.moveTo(x + s * 0.2, y + s * 0.5); ctx.lineTo(x + s * 0.24, y + s * 1.1);
  ctx.stroke();
  ctx.fillStyle = opt.wear || '#FF6FA8';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.1);
  ctx.lineTo(x + s * 0.5, y - s * 0.1);
  ctx.lineTo(x + s * 0.72, y + s * 0.62);
  ctx.lineTo(x - s * 0.72, y + s * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FFE0C8'; ctx.lineWidth = s * 0.18;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.44, y + s * 0.05);
  if (arm > 0) ctx.lineTo(x - s * 1.0 * (opt.dir === -1 ? 1 : -1), y - s * 0.45);
  else ctx.lineTo(x - s * 0.66, y + s * 0.5);
  ctx.moveTo(x + s * 0.44, y + s * 0.05);
  if (arm > 0 && opt.dir === 1) ctx.lineTo(x + s * 1.0, y - s * 0.45);
  else ctx.lineTo(x + s * 0.66, y + s * 0.5);
  ctx.stroke();
  drawRinaFace(x, y - s * 0.78, s * 0.62, opt.mood);
}
