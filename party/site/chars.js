// でてくる 人たちの 絵。画像ファイルは 1つも つかわず、ぜんぶ ここで かく。
//
// かくのは「ゲームの 中の 大きさ」。たては VH = 450 に きめて、
// あとで 画面の 大きさへ まとめて のばす。だから どの スマホでも 同じ 見た目。

'use strict';

// ★ この ゲームだけ VH を あとから 変える（let）。
//   たて向きに した ときは 「よこ」を 450 に そろえて、たてを のばす。
//   そうしないと たて向きで よこが 208 しか なくなって、ばしょが ほそすぎる。
let VH = 450;

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 2;

const PEOPLE = {
  aoi: {
    name: 'あおい', col: '#FF8FB8', hair: '#3A2A1E', skin: '#F6CFAC',
    about: '小学4年生。きょうは とにかく にげる！',
    pig: true, slim: true,
  },
  mama: {
    name: 'ママ', col: '#C86AA8', hair: '#2E2018', skin: '#F2C9A8',
    about: 'ならいごとに つれていこうと 下から のぼってくる',
    bun: true,
  },
  masaki: {
    name: 'まさき', col: '#3E7ACF', hair: '#3A2A1E', skin: '#F2C9A8',
    about: 'お兄ちゃん。かたぐるまで 高く とばしてくれる',
    curly: true, slim: true,
  },
  papa: {
    name: 'パパ', col: '#5A8A6A', hair: '#241E18', skin: '#EFC49F',
    about: 'ママを ちょっとだけ ひきとめてくれる',
    big: true, beard: true,
  },
  rina: {
    name: 'りな', col: '#F0C020', hair: '#4A3020', skin: '#F6CFAC',
    about: 'おともだち。ハートを 1つ くれる',
    long: true, slim: true,
  },
};

function pH(p) { return p.big ? 62 : 52; }
function pW(p) { return (p.big ? 30 : p.slim ? 21 : 25); }

function rr2(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// f: { x, y, face, vy, onGround, squash, t }  y は 足もと
function drawPerson(ctx, key, f, t) {
  const p = PEOPLE[key];
  const h = pH(p), w = pW(p);
  ctx.save();
  ctx.translate(f.x, f.y);
  // かげ
  if (f.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(0, 2, w * 0.62, 4, 0, 0, 7); ctx.fill();
  }
  ctx.scale(f.face || 1, 1);
  const sq = f.squash || 0;
  ctx.scale(1 + sq * 0.22, 1 - sq * 0.22);

  const air = !f.onGround;
  const run = f.onGround && Math.abs(f.vx || 0) > 30 ? Math.sin(t * 15) : 0;

  // あし
  ctx.fillStyle = '#31405A';
  const lg = h * 0.29;
  if (air) {
    ctx.save(); ctx.translate(-w * 0.22, -lg); ctx.rotate(f.vy < 0 ? -0.6 : -0.25);
    rr2(ctx, -w * 0.2, 0, w * 0.34, lg, 3); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(w * 0.20, -lg); ctx.rotate(f.vy < 0 ? 0.5 : 0.2);
    rr2(ctx, -w * 0.14, 0, w * 0.34, lg, 3); ctx.fill(); ctx.restore();
  } else {
    rr2(ctx, -w * 0.40 + run * w * 0.22, -lg, w * 0.34, lg, 3); ctx.fill();
    rr2(ctx, w * 0.06 - run * w * 0.22, -lg, w * 0.34, lg, 3); ctx.fill();
  }

  // からだ（あおいと りなは スカート）
  const by = -lg - h * 0.34;
  ctx.fillStyle = p.col;
  if (key === 'aoi' || key === 'rina' || key === 'mama') {
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, by);
    ctx.lineTo(w * 0.42, by);
    ctx.lineTo(w * 0.66, by + h * 0.36);
    ctx.lineTo(-w * 0.66, by + h * 0.36);
    ctx.closePath(); ctx.fill();
  } else {
    rr2(ctx, -w * 0.5, by, w, h * 0.36, w * 0.28); ctx.fill();
  }

  // うで
  ctx.strokeStyle = p.skin; ctx.lineWidth = h * 0.10; ctx.lineCap = 'round';
  const ay = by + h * 0.12;
  const swing = air ? -h * 0.20 : run * 6;
  ctx.beginPath(); ctx.moveTo(-w * 0.34, by + h * 0.06);
  ctx.lineTo(-w * 0.58, ay + swing); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.34, by + h * 0.06);
  ctx.lineTo(w * 0.58, ay + swing); ctx.stroke();

  // あたま
  const hy = by - h * 0.20;
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(0, hy, h * 0.21, 0, 7); ctx.fill();
  drawHair(ctx, p, key, h, hy);

  // かお
  ctx.fillStyle = '#2A2028';
  const ex = h * 0.075;
  ctx.beginPath(); ctx.arc(-ex, hy + h * 0.01, h * 0.026, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ex, hy + h * 0.01, h * 0.026, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (key === 'mama' && !f.happy) {
    // おいかけている ときの ママは「まじめな 口」。
    // エンディングでは happy を たてて にっこりに する。
    ctx.moveTo(-h * 0.05, hy + h * 0.10); ctx.lineTo(h * 0.05, hy + h * 0.10);
  } else {
    ctx.arc(0, hy + h * 0.055, h * 0.055, 0.3, Math.PI - 0.3);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHair(ctx, p, key, h, hy) {
  ctx.fillStyle = p.hair;
  if (p.curly) {
    for (let i = -3; i <= 3; i++) {
      const px = i * h * 0.075;
      const py = hy - h * 0.16 - Math.cos(i * 0.6) * h * 0.07 + Math.sin(i * 2.1) * h * 0.02;
      ctx.beginPath(); ctx.arc(px, py, h * 0.088, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, hy - h * 0.03, h * 0.22, Math.PI * 1.05, Math.PI * 2.0); ctx.fill();
    return;
  }
  // まえがみ
  ctx.beginPath(); ctx.arc(0, hy - h * 0.03, h * 0.225, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  if (p.pig) {
    // ツインテール
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * h * 0.25, hy + h * 0.05, h * 0.075, h * 0.13, s * 0.35, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * h * 0.22, hy - h * 0.07, h * 0.035, 0, 7); ctx.fill();
    }
  } else if (p.long) {
    ctx.beginPath();
    ctx.ellipse(0, hy + h * 0.12, h * 0.24, h * 0.24, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.fillRect(-h * 0.24, hy - h * 0.02, h * 0.48, h * 0.24);
  } else if (p.bun) {
    ctx.beginPath(); ctx.arc(0, hy - h * 0.26, h * 0.10, 0, 7); ctx.fill();
  }
  if (p.beard) {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.ellipse(0, hy + h * 0.15, h * 0.14, h * 0.07, 0, 0, 7); ctx.fill();
  }
}

// まるい かお だけ（メニューや けっか画面 用）
function drawFace(ctx, key, x, y, r) {
  const p = PEOPLE[key];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = p.col;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  const h = r * 2.6;
  ctx.save();
  ctx.scale(0.86, 0.86);
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(0, r * 0.12, h * 0.21, 0, 7); ctx.fill();
  drawHair(ctx, p, key, h, r * 0.12);
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-h * 0.075, r * 0.14, h * 0.028, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(h * 0.075, r * 0.14, h * 0.028, 0, 7); ctx.fill();
  ctx.restore();
  ctx.restore();
}
