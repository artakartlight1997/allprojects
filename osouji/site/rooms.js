// 部屋の絵と、その上にのせる汚れ。
//
// 汚れは 3 まいの下じき（キャンバス）に分けて持っている。
//   dust   ほこり     ふつうに こすれば すぐ落ちる
//   grease あぶら汚れ しつこい。せんざいが効く
//   stuck  こびりつき とても かたい。たわしが要る
// こすると「消しゴム」で薄くしていき、3 まいの残り具合から
// きれい度を出している。
//
// 絵はすべて幅・高さを受け取って描くので、どんな画面でも同じ見た目になる。
// 乱数は種から作るので、同じ部屋なら毎回おなじ汚れかたになる。

'use strict';

function rnd32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

function roundRect(c, x, y, w, h, r, col) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
  c.fillStyle = col; c.fill();
}

function tiles(c, x, y, w, h, t, a, b) {
  for (let yy = y; yy < y + h; yy += t) {
    for (let xx = x; xx < x + w; xx += t) {
      const i = (((xx - x) / t) | 0) + (((yy - y) / t) | 0);
      fill(c, xx, yy, t - Math.max(1, t * 0.06), t - Math.max(1, t * 0.06),
           i % 2 ? a : b);
    }
  }
}

// --- 部屋 -----------------------------------------------------------------

const ROOMS = [
  {
    name: 'キッチン', icon: '🍳',
    draw(c, W, H) {
      fill(c, 0, 0, W, H, '#E8EDF0');
      tiles(c, 0, 0, W, H * 0.56, W * 0.055, '#DCE6EC', '#EAF1F5');
      fill(c, 0, H * 0.56, W, H * 0.08, '#B9A17E');          // カウンター
      fill(c, 0, H * 0.64, W, H * 0.36, '#C9B292');          // 戸だな
      for (let i = 0; i < 5; i++) {
        roundRect(c, W * (0.03 + i * 0.195), H * 0.68, W * 0.17, H * 0.28,
                  W * 0.006, '#D6BF9E');
        roundRect(c, W * (0.10 + i * 0.195), H * 0.71, W * 0.035, H * 0.012,
                  H * 0.006, '#8C7A5E');
      }
      // なべとフライパン
      roundRect(c, W * 0.62, H * 0.40, W * 0.16, H * 0.15, W * 0.01, '#8E99A6');
      roundRect(c, W * 0.60, H * 0.44, W * 0.04, H * 0.03, H * 0.015, '#6E7783');
      c.beginPath(); c.arc(W * 0.24, H * 0.50, W * 0.055, 0, 7);
      c.fillStyle = '#5A626D'; c.fill();
    },
  },
  {
    name: 'おふろ', icon: '🛁',
    draw(c, W, H) {
      fill(c, 0, 0, W, H, '#DCEEF2');
      tiles(c, 0, 0, W, H * 0.6, W * 0.045, '#CFE7EE', '#E2F2F6');
      fill(c, 0, H * 0.6, W, H * 0.4, '#C2DCE4');
      roundRect(c, W * 0.05, H * 0.42, W * 0.5, H * 0.5, W * 0.03, '#F2F8FA');
      roundRect(c, W * 0.08, H * 0.47, W * 0.44, H * 0.4, W * 0.025, '#BFE4EE');
      roundRect(c, W * 0.7, H * 0.2, W * 0.05, H * 0.16, W * 0.02, '#9FB4BE');
      c.beginPath(); c.arc(W * 0.725, H * 0.2, W * 0.035, 0, 7);
      c.fillStyle = '#B7C9D2'; c.fill();
    },
  },
  {
    name: 'げんかん', icon: '🚪',
    draw(c, W, H) {
      fill(c, 0, 0, W, H, '#E3DCCE');
      fill(c, 0, 0, W, H * 0.62, '#DED4C2');
      roundRect(c, W * 0.34, H * 0.06, W * 0.32, H * 0.56, W * 0.008, '#A8794E');
      roundRect(c, W * 0.37, H * 0.11, W * 0.26, H * 0.2, W * 0.006, '#B98A5E');
      roundRect(c, W * 0.37, H * 0.35, W * 0.26, H * 0.2, W * 0.006, '#B98A5E');
      c.beginPath(); c.arc(W * 0.62, H * 0.34, W * 0.014, 0, 7);
      c.fillStyle = '#E8C86A'; c.fill();
      fill(c, 0, H * 0.62, W, H * 0.38, '#C4B79C');
      for (let i = 0; i < 12; i++) {
        fill(c, W * (i / 12), H * 0.62, W * 0.004, H * 0.38, 'rgba(0,0,0,0.06)');
      }
      // くつ
      roundRect(c, W * 0.1, H * 0.74, W * 0.09, H * 0.07, H * 0.02, '#C25B5B');
      roundRect(c, W * 0.21, H * 0.74, W * 0.09, H * 0.07, H * 0.02, '#C25B5B');
    },
  },
  {
    name: 'まど', icon: '🪟',
    draw(c, W, H) {
      fill(c, 0, 0, W, H, '#C8B79A');
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#8FD0F0'); g.addColorStop(1, '#D9F0FB');
      c.fillStyle = g;
      c.fillRect(W * 0.06, H * 0.08, W * 0.88, H * 0.78);
      // 外の景色
      c.fillStyle = '#7FBF6A';
      c.beginPath();
      c.moveTo(W * 0.06, H * 0.7);
      for (let x = 0; x <= 1; x += 0.05) {
        c.lineTo(W * (0.06 + 0.88 * x), H * (0.66 + Math.sin(x * 7) * 0.04));
      }
      c.lineTo(W * 0.94, H * 0.86); c.lineTo(W * 0.06, H * 0.86);
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.ellipse(W * (0.18 + i * 0.2), H * (0.2 + (i % 2) * 0.08),
                  W * 0.07, H * 0.05, 0, 0, 7);
        c.fill();
      }
      // さん
      fill(c, W * 0.06, H * 0.08, W * 0.88, H * 0.02, '#A08A66');
      fill(c, W * 0.06, H * 0.84, W * 0.88, H * 0.02, '#A08A66');
      fill(c, W * 0.06, H * 0.08, W * 0.02, H * 0.78, '#A08A66');
      fill(c, W * 0.92, H * 0.08, W * 0.02, H * 0.78, '#A08A66');
      fill(c, W * 0.49, H * 0.08, W * 0.02, H * 0.78, '#A08A66');
    },
  },
  {
    name: 'いえのまえ', icon: '🏠',
    draw(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H * 0.5);
      g.addColorStop(0, '#8FC8EC'); g.addColorStop(1, '#CFE9F7');
      c.fillStyle = g; c.fillRect(0, 0, W, H * 0.42);
      fill(c, 0, H * 0.42, W, H * 0.58, '#B9B3A8');   // コンクリ
      for (let i = 0; i < 6; i++) {
        fill(c, 0, H * (0.42 + i * 0.1), W, H * 0.004, 'rgba(0,0,0,0.08)');
        fill(c, W * (i / 6), H * 0.42, W * 0.004, H * 0.58, 'rgba(0,0,0,0.06)');
      }
      roundRect(c, W * 0.06, H * 0.12, W * 0.3, H * 0.3, W * 0.008, '#D8CDB8');
      roundRect(c, W * 0.12, H * 0.2, W * 0.08, H * 0.12, W * 0.006, '#8FBEDA');
      roundRect(c, W * 0.24, H * 0.2, W * 0.08, H * 0.12, W * 0.006, '#8FBEDA');
      roundRect(c, W * 0.68, H * 0.22, W * 0.16, H * 0.2, W * 0.01, '#6E9C5A');
    },
  },
];

// --- 汚れ -----------------------------------------------------------------

const DIRT_W = 480, DIRT_H = 270;   // 汚れの下じきの大きさ（画面に引き伸ばす）

// 層ごとの色。見ただけで「かたさ」が分かるようにしている
const DIRT_STYLE = {
  dust:   { col: 'rgba(150,140,120,0.62)', label: 'ほこり' },
  grease: { col: 'rgba(110,85,45,0.78)',   label: 'あぶら汚れ' },
  stuck:  { col: 'rgba(70,60,55,0.9)',     label: 'こびりつき' },
};

function blob(c, x, y, r, rn) {
  c.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    const rr = r * (0.65 + rn() * 0.55);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
}

// level が上がるほど汚れが増える
function makeDirt(seed, level, mul) {
  const k = mul === undefined ? 1 : mul;
  const layers = {};
  const counts = {
    dust: Math.round((26 + level * 5) * k),
    grease: Math.round((9 + level * 3) * k),
    stuck: Math.round((4 + level * 2) * k),
  };
  for (const kind of ['dust', 'grease', 'stuck']) {
    const cv = document.createElement('canvas');
    cv.width = DIRT_W; cv.height = DIRT_H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    const rn = rnd32(seed + kind.length * 7919 + level * 13);
    c.fillStyle = DIRT_STYLE[kind].col;
    const n = counts[kind];
    const rBase = kind === 'dust' ? 34 : kind === 'grease' ? 22 : 15;
    for (let i = 0; i < n; i++) {
      const x = rn() * DIRT_W, y = rn() * DIRT_H;
      const r = rBase * (0.55 + rn() * 0.9);
      blob(c, x, y, r, rn);
      if (kind === 'dust' && rn() < 0.4) {
        // ほこりは すじ状にも のびる
        for (let k = 1; k < 4; k++) blob(c, x + k * r * 0.7, y + rn() * 6 - 3, r * 0.7, rn);
      }
    }
    layers[kind] = { cv, ctx: c };
  }
  return layers;
}

// 汚れの下にかくれている おとしもの
const FINDS = [
  { name: '100円玉', coin: 100, col: '#D8D8DC' },
  { name: '10円玉', coin: 30, col: '#C98A4B' },
  { name: 'ヘアピン', coin: 60, col: '#E8A0C0' },
  { name: 'ビー玉', coin: 80, col: '#7FC7E8' },
  { name: 'ネコのおもちゃ', coin: 120, col: '#F09A5A' },
  { name: 'シール', coin: 50, col: '#F4D06A' },
  { name: 'なくしたボタン', coin: 40, col: '#9A86C8' },
  { name: 'あめ玉', coin: 45, col: '#F28C8C' },
];

function makeFinds(seed, level) {
  const rn = rnd32(seed * 31 + 5);
  const n = 5 + Math.min(5, (level / 2) | 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = FINDS[(rn() * FINDS.length) | 0];
    out.push({
      x: 0.06 + rn() * 0.88, y: 0.12 + rn() * 0.76,
      name: f.name, coin: f.coin, col: f.col,
      found: false, t: 0,
    });
  }
  return out;
}

// --- カビ ------------------------------------------------------------------
//
// ほうっておくと 広がる よごれ。ここが 時間との たたかいに なる。
// こすると 小さくなり、消しきると コインに なる。

function makeMolds(seed, level, mul, growMul) {
  const rn = rnd32(seed * 17 + 91);
  const gm = growMul === undefined ? 1 : growMul;
  const n = Math.max(1, Math.round((2 + Math.min(4, (level / 2) | 0))
                                   * (mul === undefined ? 1 : mul)));
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: 0.10 + rn() * 0.80, y: 0.16 + rn() * 0.68,
      r: 0.030 + rn() * 0.016,          // いまの 大きさ（画面の 横はば ぶんの 1）
      max: 0.085 + rn() * 0.035,        // ここまで 広がる
      grow: (0.0042 + rn() * 0.0030 + level * 0.0006) * gm,
      seed: rn() * 100,
      dead: false,
    });
  }
  return out;
}

// --- こわれもの ------------------------------------------------------------
//
// こすると ヒビが 入り、3回で こわれる。よけて そうじする ひつようがある。
// ブラシを 大きくするほど 速いが、よけるのが むずかしくなる。

const BREAKABLES = [
  { name: 'かびん', col: '#8FD0C0', tall: true },
  { name: 'コップ', col: '#BFE4F5', tall: true },
  { name: 'しゃしんたて', col: '#E8C08A', tall: false },
  { name: 'おきもの', col: '#F0A8C0', tall: false },
];

function makeBreakables(seed, level, mul) {
  const rn = rnd32(seed * 53 + 7);
  const n = Math.max(0, Math.round((1 + Math.min(3, (level / 2) | 0))
                                   * (mul === undefined ? 1 : mul)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = BREAKABLES[(rn() * BREAKABLES.length) | 0];
    out.push({
      x: 0.12 + rn() * 0.76, y: 0.20 + rn() * 0.62,
      r: 0.042 + rn() * 0.014,
      name: b.name, col: b.col, tall: b.tall,
      hp: 3, broken: false, shake: 0, guard: 0,
    });
  }
  return out;
}
