// ブロックの種類と、その絵（テクスチャ）。
//
// 絵は画像ファイルを使わず、その場でドット絵を描いている。
// 16x16 のドット絵を 16x16 個ならべて 1 枚（256x256）にまとめ、
// それを WebGL に渡す。読みこむファイルが増えないので起動が速い。

'use strict';

const TS = 16;        // ドット絵 1 まいの大きさ
const ATLAS_N = 16;   // よこに何まい並べるか

// --- 絵をかく道具 -----------------------------------------------------------

let _seed = 12345;
function rnd() {
  _seed = (Math.imul(_seed, 1664525) + 1013904223) >>> 0;
  return _seed / 4294967296;
}

function mix(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16),
        ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16),
        bb = parseInt(b.slice(5, 7), 16);
  const h = (v) => ('0' + Math.round(v).toString(16)).slice(-2);
  return '#' + h(ar + (br - ar) * t) + h(ag + (bg - ag) * t) + h(ab + (bb - ab) * t);
}

const TILES = [];       // かく関数のならび
const TILE = {};        // 名前 → ばんごう

function tile(name, fn) { TILE[name] = TILES.length; TILES.push(fn); }

// ざらざらした面。base を ぬって、上から すこし濃い/うすい 点を まく。
function grain(base, amt, dens) {
  return (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, TS, TS);
    for (let y = 0; y < TS; y++) {
      for (let x = 0; x < TS; x++) {
        if (rnd() > (dens === undefined ? 0.5 : dens)) continue;
        const t = (rnd() - 0.5) * (amt === undefined ? 0.22 : amt);
        c.fillStyle = mix(base, t > 0 ? '#ffffff' : '#000000', Math.abs(t));
        c.fillRect(x, y, 1, 1);
      }
    }
  };
}

// 鉱石。石の上に かたまりを のせる。
function ore(oreCol) {
  const stone = grain('#8A8A8A', 0.22, 0.5);
  return (c) => {
    stone(c);
    const spots = [[3, 3], [9, 4], [5, 10], [11, 10], [7, 7]];
    for (const [sx, sy] of spots) {
      if (rnd() < 0.25) continue;
      const w = 2 + ((rnd() * 2) | 0), h = 2 + ((rnd() * 2) | 0);
      c.fillStyle = oreCol;
      c.fillRect(sx, sy, w, h);
      c.fillStyle = mix(oreCol, '#ffffff', 0.35);
      c.fillRect(sx, sy, 1, 1);
      c.fillStyle = mix(oreCol, '#000000', 0.35);
      c.fillRect(sx + w - 1, sy + h - 1, 1, 1);
    }
  };
}

// --- ドット絵 ---------------------------------------------------------------

tile('grass_top', grain('#6DA13C', 0.26, 0.6));
tile('dirt', grain('#8A6440', 0.24, 0.6));
tile('grass_side', (c) => {
  grain('#8A6440', 0.24, 0.6)(c);
  // 上に草がかぶさっている。でこぼこにして「かぶさっている感じ」を出す
  for (let x = 0; x < TS; x++) {
    const h = 3 + ((rnd() * 3) | 0);
    for (let y = 0; y < h; y++) {
      c.fillStyle = mix('#6DA13C', rnd() > 0.5 ? '#ffffff' : '#000000', rnd() * 0.16);
      c.fillRect(x, y, 1, 1);
    }
  }
});
tile('stone', grain('#8A8A8A', 0.22, 0.5));
tile('cobble', (c) => {
  c.fillStyle = '#6E6E6E'; c.fillRect(0, 0, TS, TS);
  const rocks = [[0, 0, 7, 6], [8, 0, 8, 5], [0, 7, 5, 4], [6, 6, 5, 6],
                 [12, 6, 4, 5], [0, 12, 7, 4], [8, 12, 8, 4], [12, 0, 4, 5]];
  for (const [x, y, w, h] of rocks) {
    const base = mix('#8E8E8E', rnd() > 0.5 ? '#ffffff' : '#000000', rnd() * 0.25);
    c.fillStyle = base; c.fillRect(x, y, w - 1, h - 1);
    c.fillStyle = mix(base, '#ffffff', 0.22); c.fillRect(x, y, w - 1, 1);
  }
});
tile('sand', grain('#DFD2A0', 0.14, 0.6));
tile('sandstone', (c) => {
  grain('#DCCE9C', 0.10, 0.5)(c);
  c.fillStyle = 'rgba(150,130,80,0.55)';
  c.fillRect(0, 4, TS, 1); c.fillRect(0, 10, TS, 1);
});
tile('gravel', (c) => {
  grain('#948E8A', 0.3, 0.85)(c);
  for (let i = 0; i < 14; i++) {
    c.fillStyle = mix('#948E8A', rnd() > 0.5 ? '#ffffff' : '#000000', 0.3);
    c.fillRect((rnd() * 14) | 0, (rnd() * 14) | 0, 2, 2);
  }
});
tile('log_side', (c) => {
  c.fillStyle = '#6A4B2C'; c.fillRect(0, 0, TS, TS);
  for (let x = 0; x < TS; x++) {
    const t = (rnd() - 0.5) * 0.3;
    c.fillStyle = mix('#6A4B2C', t > 0 ? '#ffffff' : '#000000', Math.abs(t));
    c.fillRect(x, 0, 1, TS);
    if (rnd() < 0.3) {
      c.fillStyle = mix('#6A4B2C', '#000000', 0.3);
      c.fillRect(x, (rnd() * TS) | 0, 1, 2 + ((rnd() * 4) | 0));
    }
  }
});
tile('log_top', (c) => {
  grain('#A5834E', 0.14, 0.5)(c);
  c.strokeStyle = 'rgba(90,62,34,0.8)'; c.lineWidth = 1;
  for (const r of [2.5, 4.5, 6.5]) {
    c.beginPath(); c.arc(8, 8, r, 0, 7); c.stroke();
  }
});
tile('birch_side', (c) => {
  grain('#DCD6C6', 0.10, 0.5)(c);
  for (let i = 0; i < 5; i++) {
    c.fillStyle = 'rgba(60,55,50,0.75)';
    c.fillRect((rnd() * 12) | 0, (rnd() * 15) | 0, 2 + ((rnd() * 3) | 0), 1);
  }
});
tile('birch_top', grain('#C8B48A', 0.12, 0.5));
tile('leaves', (c) => {
  c.clearRect(0, 0, TS, TS);
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      if (rnd() < 0.17) continue;            // すきま。むこうが すける
      const t = (rnd() - 0.5) * 0.4;
      c.fillStyle = mix('#4C8F30', t > 0 ? '#ffffff' : '#000000', Math.abs(t));
      c.fillRect(x, y, 1, 1);
    }
  }
});
tile('planks', (c) => {
  c.fillStyle = '#B08A4E'; c.fillRect(0, 0, TS, TS);
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      if (rnd() > 0.45) continue;
      const t = (rnd() - 0.5) * 0.2;
      c.fillStyle = mix('#B08A4E', t > 0 ? '#ffffff' : '#000000', Math.abs(t));
      c.fillRect(x, y, 1, 1);
    }
  }
  c.fillStyle = 'rgba(90,62,30,0.85)';
  c.fillRect(0, 3, TS, 1); c.fillRect(0, 8, TS, 1); c.fillRect(0, 13, TS, 1);
  c.fillRect(5, 0, 1, 4); c.fillRect(11, 4, 1, 5); c.fillRect(4, 9, 1, 5);
});
tile('birch_planks', (c) => {
  c.fillStyle = '#D8C89A'; c.fillRect(0, 0, TS, TS);
  c.fillStyle = 'rgba(150,130,90,0.8)';
  c.fillRect(0, 3, TS, 1); c.fillRect(0, 8, TS, 1); c.fillRect(0, 13, TS, 1);
  c.fillRect(6, 0, 1, 4); c.fillRect(10, 9, 1, 5);
});
tile('glass', (c) => {
  c.fillStyle = '#CFE8F5'; c.fillRect(0, 0, TS, TS);
  c.fillStyle = '#E8F6FF';
  c.fillRect(0, 0, TS, 1); c.fillRect(0, TS - 1, TS, 1);
  c.fillRect(0, 0, 1, TS); c.fillRect(TS - 1, 0, 1, TS);
  c.fillRect(2, 3, 4, 1); c.fillRect(2, 4, 1, 3);
});
tile('brick', (c) => {
  c.fillStyle = '#B4A99C'; c.fillRect(0, 0, TS, TS);
  const put = (x, y, w) => {
    c.fillStyle = mix('#9C5A46', rnd() > 0.5 ? '#ffffff' : '#000000', rnd() * 0.16);
    c.fillRect(x, y, w, 3);
  };
  put(0, 0, 7); put(8, 0, 7);
  put(0, 4, 3); put(4, 4, 7); put(12, 4, 4);
  put(0, 8, 7); put(8, 8, 7);
  put(0, 12, 3); put(4, 12, 7); put(12, 12, 4);
});
tile('stonebrick', (c) => {
  grain('#96968E', 0.14, 0.6)(c);
  c.fillStyle = 'rgba(70,70,66,0.8)';
  c.fillRect(0, 7, TS, 1); c.fillRect(7, 0, 1, 8); c.fillRect(11, 8, 1, 8);
  c.fillRect(0, 15, TS, 1);
});
tile('mossy', (c) => {
  TILES[TILE.cobble](c);
  for (let i = 0; i < 46; i++) {
    c.fillStyle = mix('#4E7A34', rnd() > 0.5 ? '#ffffff' : '#000000', rnd() * 0.3);
    c.fillRect((rnd() * TS) | 0, (rnd() * TS) | 0, 1 + ((rnd() * 2) | 0), 1 + ((rnd() * 2) | 0));
  }
});
tile('clay', grain('#A2A8B6', 0.10, 0.5));
tile('snow', grain('#F4F8FC', 0.06, 0.4));
tile('ice', (c) => {
  grain('#A8CFE8', 0.10, 0.4)(c);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(2, 2, 6, 1); c.fillRect(9, 6, 5, 1); c.fillRect(4, 11, 7, 1);
});
tile('obsidian', (c) => {
  grain('#2A2034', 0.3, 0.5)(c);
  for (let i = 0; i < 10; i++) {
    c.fillStyle = 'rgba(150,110,200,0.55)';
    c.fillRect((rnd() * TS) | 0, (rnd() * TS) | 0, 1, 1);
  }
});
tile('bedrock', (c) => {
  c.fillStyle = '#55555A'; c.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 22; i++) {
    c.fillStyle = mix('#55555A', rnd() > 0.5 ? '#ffffff' : '#000000', 0.25 + rnd() * 0.25);
    c.fillRect((rnd() * 13) | 0, (rnd() * 13) | 0, 2 + ((rnd() * 3) | 0), 2 + ((rnd() * 3) | 0));
  }
});
tile('coal_ore', ore('#2E2E2E'));
tile('iron_ore', ore('#C4907A'));
tile('gold_ore', ore('#F2CE4A'));
tile('diamond_ore', ore('#5FDCD8'));
tile('emerald_ore', ore('#3ECC68'));
tile('redstone_ore', ore('#CE3630'));
tile('coal_block', grain('#232323', 0.22, 0.6));
tile('iron_block', (c) => {
  grain('#D6D6D6', 0.10, 0.5)(c);
  c.fillStyle = 'rgba(120,120,120,0.6)';
  c.fillRect(1, 1, 1, 14); c.fillRect(14, 1, 1, 14);
  c.fillRect(1, 1, 14, 1); c.fillRect(1, 14, 14, 1);
});
tile('gold_block', (c) => {
  grain('#F3D24E', 0.12, 0.5)(c);
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(2, 2, 4, 1);
});
tile('diamond_block', (c) => {
  grain('#5FDCD8', 0.12, 0.5)(c);
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fillRect(4, 3, 3, 1); c.fillRect(9, 8, 3, 1);
});
tile('emerald_block', grain('#3ECC68', 0.14, 0.5));
tile('bookshelf', (c) => {
  TILES[TILE.planks](c);
  const cols = ['#A83B3B', '#3B62A8', '#C8A63B', '#3B9A5A', '#8A3BA8'];
  for (const y0 of [1, 9]) {
    let x = 1;
    while (x < 15) {
      const w = 1 + ((rnd() * 2) | 0);
      c.fillStyle = cols[(rnd() * cols.length) | 0];
      c.fillRect(x, y0, w, 6);
      x += w + 1;
    }
  }
});
tile('table_top', (c) => {
  TILES[TILE.planks](c);
  c.fillStyle = 'rgba(60,40,20,0.85)';
  c.fillRect(1, 1, 14, 1); c.fillRect(1, 14, 14, 1);
  c.fillRect(1, 1, 1, 14); c.fillRect(14, 1, 1, 14);
  c.fillRect(5, 1, 1, 14); c.fillRect(10, 1, 1, 14);
  c.fillRect(1, 5, 14, 1); c.fillRect(1, 10, 14, 1);
});
tile('table_side', (c) => {
  TILES[TILE.planks](c);
  c.fillStyle = 'rgba(60,40,20,0.7)'; c.fillRect(0, 0, TS, 4);
  c.fillStyle = '#8A8A8A'; c.fillRect(3, 7, 4, 2); c.fillRect(9, 10, 4, 2);
});
tile('pumpkin_side', (c) => {
  c.fillStyle = '#DE8420'; c.fillRect(0, 0, TS, TS);
  c.fillStyle = 'rgba(150,80,10,0.7)';
  for (const x of [3, 7, 11]) c.fillRect(x, 0, 1, TS);
  c.fillStyle = 'rgba(255,220,150,0.3)'; c.fillRect(1, 0, 1, TS);
});
tile('pumpkin_top', (c) => {
  c.fillStyle = '#DE8420'; c.fillRect(0, 0, TS, TS);
  c.fillStyle = 'rgba(150,80,10,0.6)';
  c.beginPath(); c.arc(8, 8, 6, 0, 7); c.stroke();
  c.fillStyle = '#6A4B2C'; c.fillRect(7, 6, 3, 4);
});
tile('melon_side', (c) => {
  c.fillStyle = '#6E9E3A'; c.fillRect(0, 0, TS, TS);
  c.fillStyle = 'rgba(40,80,25,0.75)';
  for (const x of [2, 6, 10, 14]) c.fillRect(x, 0, 2, TS);
});
tile('melon_top', grain('#7CA845', 0.14, 0.5));
tile('cactus_side', (c) => {
  grain('#3E7A38', 0.14, 0.5)(c);
  c.fillStyle = 'rgba(20,50,20,0.8)'; c.fillRect(0, 0, 1, TS); c.fillRect(15, 0, 1, TS);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = '#DCE8C0';
    c.fillRect(2 + ((rnd() * 12) | 0), (rnd() * TS) | 0, 1, 1);
  }
});
tile('cactus_top', grain('#4E8A44', 0.14, 0.5));
tile('glowstone', (c) => {
  grain('#E8C868', 0.18, 0.7)(c);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = '#FFF4C0';
    c.fillRect((rnd() * 14) | 0, (rnd() * 14) | 0, 2, 2);
  }
});
tile('torch', (c) => {
  c.clearRect(0, 0, TS, TS);
  c.fillStyle = '#6A4B2C'; c.fillRect(7, 7, 2, 9);
  c.fillStyle = '#5A3E22'; c.fillRect(7, 12, 1, 4);
  c.fillStyle = '#FFD24A'; c.fillRect(6, 4, 4, 4);
  c.fillStyle = '#FFF2A8'; c.fillRect(7, 3, 2, 4);
});
tile('flower_red', (c) => {
  c.clearRect(0, 0, TS, TS);
  c.fillStyle = '#3E7A2E'; c.fillRect(7, 8, 2, 8);
  c.fillStyle = '#4E9A3A'; c.fillRect(4, 10, 3, 1); c.fillRect(9, 12, 3, 1);
  c.fillStyle = '#D63A3A'; c.fillRect(5, 3, 6, 5);
  c.fillStyle = '#F06A6A'; c.fillRect(6, 2, 4, 2);
  c.fillStyle = '#FFE070'; c.fillRect(7, 5, 2, 2);
});
tile('flower_yellow', (c) => {
  c.clearRect(0, 0, TS, TS);
  c.fillStyle = '#3E7A2E'; c.fillRect(7, 8, 2, 8);
  c.fillStyle = '#4E9A3A'; c.fillRect(4, 11, 3, 1);
  c.fillStyle = '#F0C825'; c.fillRect(5, 3, 6, 5);
  c.fillStyle = '#FFE870'; c.fillRect(6, 2, 4, 2);
  c.fillStyle = '#9A6A18'; c.fillRect(7, 5, 2, 2);
});
tile('tallgrass', (c) => {
  c.clearRect(0, 0, TS, TS);
  for (let i = 0; i < 7; i++) {
    const x = 1 + ((rnd() * 13) | 0), h = 5 + ((rnd() * 8) | 0);
    c.fillStyle = mix('#5A9A38', rnd() > 0.5 ? '#ffffff' : '#000000', rnd() * 0.25);
    c.fillRect(x, TS - h, 1, h);
    if (rnd() < 0.5) c.fillRect(x + 1, TS - h + 1, 1, h - 2);
  }
});
tile('mushroom', (c) => {
  c.clearRect(0, 0, TS, TS);
  c.fillStyle = '#E8DCC8'; c.fillRect(7, 9, 2, 7);
  c.fillStyle = '#C43030'; c.fillRect(4, 4, 8, 5); c.fillRect(5, 3, 6, 1);
  c.fillStyle = '#F6F0E0';
  c.fillRect(5, 5, 2, 2); c.fillRect(9, 6, 2, 2); c.fillRect(8, 4, 1, 1);
});
tile('water', (c) => {
  grain('#2F63C8', 0.10, 0.4)(c);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fillRect(1, 3, 6, 1); c.fillRect(8, 7, 6, 1); c.fillRect(3, 11, 6, 1);
});
tile('lava', (c) => {
  grain('#DE5A18', 0.2, 0.7)(c);
  for (let i = 0; i < 10; i++) {
    c.fillStyle = '#FFC24A';
    c.fillRect((rnd() * 14) | 0, (rnd() * 14) | 0, 2, 1);
  }
});

// ウール。色ちがいをまとめて作る。
const WOOLS = [
  ['white', 'しろ', '#E9ECEE'], ['red', 'あか', '#B0342C'],
  ['orange', 'オレンジ', '#E07A24'], ['yellow', 'きいろ', '#E8C42E'],
  ['lime', 'きみどり', '#7EC42E'], ['green', 'みどり', '#3E7A2E'],
  ['cyan', 'みずいろ', '#3EA0B0'], ['blue', 'あお', '#2E4EA8'],
  ['purple', 'むらさき', '#7A3EA8'], ['magenta', 'ピンク', '#C44EA8'],
  ['pink', 'ももいろ', '#E89AB4'], ['brown', 'ちゃいろ', '#7A5230'],
  ['gray', 'はいいろ', '#5A5A5E'], ['black', 'くろ', '#20201F'],
];
for (const [key, , col] of WOOLS) {
  tile('wool_' + key, (c) => {
    grain(col, 0.14, 0.55)(c);
    c.fillStyle = mix(col, '#000000', 0.18);
    for (let y = 1; y < TS; y += 4) c.fillRect(0, y, TS, 1);
  });
}

// --- 1 まいの絵にまとめる ---------------------------------------------------

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = TS * ATLAS_N; cv.height = TS * ATLAS_N;
  const c = cv.getContext('2d');
  _seed = 20240611;
  for (let i = 0; i < TILES.length; i++) {
    c.save();
    c.translate((i % ATLAS_N) * TS, ((i / ATLAS_N) | 0) * TS);
    c.beginPath(); c.rect(0, 0, TS, TS); c.clip();
    TILES[i](c);
    c.restore();
  }
  ATLAS_CV = cv;
  return cv;
}
let ATLAS_CV = null;

// ドット絵のはしっこが となりの絵とにじまないように、
// ほんの少し内がわを使う。
function uvOf(t) {
  const s = 1 / ATLAS_N;
  const x = (t % ATLAS_N) * s, y = ((t / ATLAS_N) | 0) * s;
  const e = 0.0006;
  return [x + e, y + e, x + s - e, y + s - e];
}

// --- ブロック ---------------------------------------------------------------
//
// top / side / bottom は ドット絵のばんごう。
//   solid  … ぶつかる（通れない）
//   opaque … 向こうが見えない（となりの面をかかなくていい）
//   alpha  … すけて見える（水・ガラス・氷）。あとから重ねてかく
//   cross  … ぺらぺらの ×字（花・草・たいまつ）
//   light  … じぶんで光る 0..1
//   hard   … こわすのにかかる秒

const BLOCKS = [{ key: 'air', name: 'なし' }];
const BY_KEY = {};

function block(key, name, o) {
  const b = {
    id: BLOCKS.length, key, name,
    top: o.top !== undefined ? o.top : o.all,
    side: o.side !== undefined ? o.side : o.all,
    bottom: o.bottom !== undefined ? o.bottom
          : (o.top !== undefined ? o.top : o.all),
    solid: o.solid !== false,
    opaque: o.opaque !== false,
    alpha: o.alpha || 0,
    cross: !!o.cross,
    liquid: !!o.liquid,
    light: o.light || 0,
    hard: o.hard === undefined ? 0.9 : o.hard,
    drop: o.drop || null,     // こわしたとき 何が出るか（キー名）
  };
  BLOCKS.push(b);
  BY_KEY[key] = b;
  return b;
}

const T = TILE;
block('grass', 'くさブロック', { top: T.grass_top, side: T.grass_side, bottom: T.dirt, hard: 0.4, drop: 'dirt' });
block('dirt', 'つち', { all: T.dirt, hard: 0.4 });
block('stone', 'いし', { all: T.stone, hard: 1.3, drop: 'cobble' });
block('cobble', 'まるいし', { all: T.cobble, hard: 1.4 });
block('sand', 'すな', { all: T.sand, hard: 0.4 });
block('sandstone', 'すなブロック', { all: T.sandstone, hard: 1.1 });
block('gravel', 'じゃり', { all: T.gravel, hard: 0.5 });
block('log', 'き', { top: T.log_top, side: T.log_side, bottom: T.log_top, hard: 1.0 });
block('birch_log', 'しらかば', { top: T.birch_top, side: T.birch_side, bottom: T.birch_top, hard: 1.0 });
block('leaves', 'はっぱ', { all: T.leaves, hard: 0.25, opaque: false });
block('planks', 'いた', { all: T.planks, hard: 0.9 });
block('birch_planks', 'しらかばのいた', { all: T.birch_planks, hard: 0.9 });
block('glass', 'ガラス', { all: T.glass, hard: 0.3, opaque: false, alpha: 0.45 });
block('brick', 'レンガ', { all: T.brick, hard: 1.5 });
block('stonebrick', 'いしレンガ', { all: T.stonebrick, hard: 1.4 });
block('mossy', 'こけのいし', { all: T.mossy, hard: 1.4 });
block('clay', 'ねんど', { all: T.clay, hard: 0.6 });
block('snow', 'ゆき', { all: T.snow, hard: 0.3 });
block('ice', 'こおり', { all: T.ice, hard: 0.5, opaque: false, alpha: 0.6 });
block('obsidian', 'くろようせき', { all: T.obsidian, hard: 4.5 });
block('bedrock', 'いわばん', { all: T.bedrock, hard: Infinity });
block('coal_ore', 'せきたん', { all: T.coal_ore, hard: 1.8 });
block('iron_ore', 'てつ', { all: T.iron_ore, hard: 2.2 });
block('gold_ore', 'きん', { all: T.gold_ore, hard: 2.4 });
block('diamond_ore', 'ダイヤ', { all: T.diamond_ore, hard: 2.8 });
block('emerald_ore', 'エメラルド', { all: T.emerald_ore, hard: 2.8 });
block('redstone_ore', 'レッドストーン', { all: T.redstone_ore, hard: 2.2 });
block('coal_block', 'せきたんブロック', { all: T.coal_block, hard: 2.2 });
block('iron_block', 'てつブロック', { all: T.iron_block, hard: 2.6 });
block('gold_block', 'きんブロック', { all: T.gold_block, hard: 2.6 });
block('diamond_block', 'ダイヤブロック', { all: T.diamond_block, hard: 3.2 });
block('emerald_block', 'エメラルドブロック', { all: T.emerald_block, hard: 3.2 });
block('bookshelf', 'ほんだな', { top: T.planks, side: T.bookshelf, bottom: T.planks, hard: 1.0 });
block('table', 'さぎょうだい', { top: T.table_top, side: T.table_side, bottom: T.planks, hard: 1.0 });
block('pumpkin', 'かぼちゃ', { top: T.pumpkin_top, side: T.pumpkin_side, bottom: T.pumpkin_top, hard: 0.7 });
block('melon', 'スイカ', { top: T.melon_top, side: T.melon_side, bottom: T.melon_top, hard: 0.7 });
block('cactus', 'サボテン', { top: T.cactus_top, side: T.cactus_side, bottom: T.cactus_top, hard: 0.5 });
block('glowstone', 'ひかりいし', { all: T.glowstone, hard: 0.6, light: 1.0 });
block('torch', 'たいまつ', { all: T.torch, hard: 0.05, solid: false, opaque: false, cross: true, light: 0.85 });
block('flower_red', 'あかいはな', { all: T.flower_red, hard: 0.05, solid: false, opaque: false, cross: true });
block('flower_yellow', 'きいろいはな', { all: T.flower_yellow, hard: 0.05, solid: false, opaque: false, cross: true });
block('tallgrass', 'くさ', { all: T.tallgrass, hard: 0.05, solid: false, opaque: false, cross: true });
block('mushroom', 'きのこ', { all: T.mushroom, hard: 0.05, solid: false, opaque: false, cross: true });
for (const [key, jp] of WOOLS) {
  block('wool_' + key, jp + 'のウール', { all: T['wool_' + key], hard: 0.5 });
}
block('water', 'みず', { all: T.water, hard: Infinity, solid: false, opaque: false, alpha: 0.72, liquid: true });
block('lava', 'ようがん', { all: T.lava, hard: Infinity, solid: false, opaque: false, alpha: 0.9, liquid: true, light: 0.9 });

const ID = {};
for (const b of BLOCKS) if (b.key) ID[b.key] = b.id;

function blk(id) { return BLOCKS[id] || BLOCKS[0]; }
function isOpaque(id) { return id !== 0 && BLOCKS[id].opaque; }
function isSolid(id) { return id !== 0 && BLOCKS[id].solid; }

// --- クラフト ---------------------------------------------------------------
//
// マイクラの 3x3 に材料をならべるやりかたは スマホだと つらいので、
// 「作れるものの一覧をおして作る」形にした。

const RECIPES = [
  { out: 'planks', n: 4, need: [['log', 1]] },
  { out: 'birch_planks', n: 4, need: [['birch_log', 1]] },
  { out: 'table', n: 1, need: [['planks', 4]] },
  { out: 'stonebrick', n: 4, need: [['cobble', 4]] },
  { out: 'brick', n: 4, need: [['clay', 4]] },
  { out: 'sandstone', n: 4, need: [['sand', 4]] },
  { out: 'glass', n: 1, need: [['sand', 2]] },
  { out: 'torch', n: 4, need: [['planks', 1], ['coal_ore', 1]] },
  { out: 'bookshelf', n: 1, need: [['planks', 6]] },
  { out: 'glowstone', n: 1, need: [['gold_ore', 2], ['torch', 2]] },
  { out: 'coal_block', n: 1, need: [['coal_ore', 9]] },
  { out: 'iron_block', n: 1, need: [['iron_ore', 9]] },
  { out: 'gold_block', n: 1, need: [['gold_ore', 9]] },
  { out: 'diamond_block', n: 1, need: [['diamond_ore', 9]] },
  { out: 'emerald_block', n: 1, need: [['emerald_ore', 9]] },
  { out: 'mossy', n: 1, need: [['cobble', 1], ['tallgrass', 1]] },
  { out: 'wool_white', n: 1, need: [['tallgrass', 4]] },
  { out: 'wool_red', n: 1, need: [['wool_white', 1], ['flower_red', 1]] },
  { out: 'wool_yellow', n: 1, need: [['wool_white', 1], ['flower_yellow', 1]] },
  { out: 'wool_green', n: 1, need: [['wool_white', 1], ['leaves', 1]] },
  { out: 'wool_black', n: 1, need: [['wool_white', 1], ['coal_ore', 1]] },
  { out: 'wool_pink', n: 1, need: [['wool_white', 1], ['redstone_ore', 1]] },
  { out: 'wool_blue', n: 1, need: [['wool_white', 1], ['clay', 1]] },
  { out: 'wool_brown', n: 1, need: [['wool_white', 1], ['dirt', 1]] },
];
