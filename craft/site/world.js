// 世界そのもの。地形を作る／ブロックを出し入れする／絵にする。
//
// 世界ぜんぶを覚えておくとスマホのメモリに入らないので、
//   ・地形は「たね」から そのつど 計算して作る（同じ たね なら同じ地形）
//   ・じぶんが 掘った／置いた ぶんだけ 別に覚えておく
// という作りにしてある。だから「つづきから」で保存するのは
// たね と 差分 だけで、ほんの少しですむ。

'use strict';

const CH = 16;        // チャンクの よこ幅
const CY = 72;        // 世界の 高さ
const SEA = 30;       // 水面の高さ

const CHXZ = CH * CH;

// --- でたらめな数（たねから決まる）------------------------------------------

function h2(x, z, s) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ (s | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function h3(x, y, z, s) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 1103515245)
        ^ Math.imul(z | 0, 668265263) ^ (s | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n = Math.imul(n ^ (n >>> 9), 2246822519);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// たね から 決まる 乱数。同じ たね なら 何回 呼んでも 同じ ならび。
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellSeed(gx, gz, salt) {
  return (Math.imul(gx, 73856093) ^ Math.imul(gz, 19349663)
          ^ Math.imul(W.seed, 2654435761) ^ salt) >>> 0;
}

// なめらかな でこぼこ（バリューノイズ）
function vn2(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = h2(xi, zi, s), b = h2(xi + 1, zi, s);
  const c = h2(xi, zi + 1, s), d = h2(xi + 1, zi + 1, s);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

function vn3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c000 = h3(xi, yi, zi, s), c100 = h3(xi + 1, yi, zi, s);
  const c010 = h3(xi, yi + 1, zi, s), c110 = h3(xi + 1, yi + 1, zi, s);
  const c001 = h3(xi, yi, zi + 1, s), c101 = h3(xi + 1, yi, zi + 1, s);
  const c011 = h3(xi, yi + 1, zi + 1, s), c111 = h3(xi + 1, yi + 1, zi + 1, s);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

// --- 世界 -------------------------------------------------------------------

const BIOME = { PLAIN: 0, FOREST: 1, DESERT: 2, SNOW: 3 };

// --- せかい ------------------------------------------------------------------
//
// 土管に 入ると べつの せかいへ 行ける。
// せかいごとに 地形の 作りかたと 地面の ブロックが ちがう。
// たねと「じぶんが いじった ぶん」は せかいごとに べつに 持つ。

const WORLDS = [
  { key: 'home',   name: 'はじまりの せかい', col: '#6DA13C', sky: [1.00, 1.00, 1.00] },
  { key: 'snow',   name: 'ゆきやま',         col: '#DCEAF6', sky: [0.92, 0.98, 1.10] },
  { key: 'future', name: 'みらい都市',       col: '#7FD0E8', sky: [0.80, 0.92, 1.15] },
  { key: 'mush',   name: 'キノコの森',       col: '#E06AA0', sky: [1.12, 0.86, 1.06] },
];
function worldOf(key) { return WORLDS.find((w) => w.key === key) || WORLDS[0]; }

const TH = {
  home:   { base: 3.6, mount: 24, dip: 4.2, mid: 8.6, fine: 3, biome: true, treeP: 1 },
  snow:   { base: 9.0, mount: 40, dip: 3.0, mid: 12,  fine: 4, surf: 'snow', sub: 'dirt',
            treeP: 0.55, birch: true, freeze: true },
  future: { base: 5.0, mount: 5,  dip: 2.0, mid: 2.5, fine: 1, surf: 'stonebrick',
            sub: 'stone', treeP: 0, city: true },
  mush:   { base: 4.0, mount: 16, dip: 4.0, mid: 9,   fine: 3, surf: 'grass', sub: 'dirt',
            treeP: 0, mushroom: true },
};
function th() { return TH[W.theme] || TH.home; }

const W = {
  seed: 1,
  theme: 'home',
  chunks: new Map(),        // "cx,cz" → チャンク
  edits: new Map(),         // "x,y,z" → ブロック番号（じぶんが変えたところ）
  // あかりは チャンクごとに 分けて しまう。
  // 1つの ながい 配列に すると、街の 街灯が 何百こにも なったとき
  // 地形を 作るたびに ぜんぶ 見にいくことに なって 遅い。
  lights: new Map(),        // "cx,cz" → [{x,y,z,v}]
  structs: new Map(),       // "gx,gz" → 街や村（なければ null）
  worms: new Map(),         // "gx,gz" → ほらあなの みちすじ
  meshQueue: [],
  built: 0,
};

// --- あかり ------------------------------------------------------------------

function addLight(x, y, z, v) {
  const k = ckey(Math.floor(x / CH), Math.floor(z / CH));
  let a = W.lights.get(k);
  if (!a) { a = []; W.lights.set(k, a); }
  for (let i = 0; i < a.length; i++) {
    if (a[i].x === x && a[i].y === y && a[i].z === z) return;   // 二重に 入れない
  }
  a.push({ x, y, z, v });
}

function removeLight(x, y, z) {
  const a = W.lights.get(ckey(Math.floor(x / CH), Math.floor(z / CH)));
  if (!a) return;
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i].x === x && a[i].y === y && a[i].z === z) a.splice(i, 1);
  }
}

// このチャンクの まわりの あかりだけ 集める
function lightsNear(cx, cz, out) {
  out.length = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const a = W.lights.get(ckey(cx + dx, cz + dz));
      if (!a) continue;
      for (let i = 0; i < a.length && out.length < 24; i++) out.push(a[i]);
    }
  }
  return out;
}

function ckey(cx, cz) { return cx + ',' + cz; }
function ekey(x, y, z) { return x + ',' + y + ',' + z; }

function biomeAt(wx, wz) {
  if (!th().biome) return W.theme === 'snow' ? BIOME.SNOW : BIOME.PLAIN;
  const t = vn2(wx / 340, wz / 340, W.seed + 31) * 0.7
          + vn2(wx / 90, wz / 90, W.seed + 33) * 0.3;
  if (t > 0.72) return BIOME.DESERT;
  if (t < 0.27) return BIOME.SNOW;
  const f = vn2(wx / 150, wz / 150, W.seed + 37);
  return f > 0.5 ? BIOME.FOREST : BIOME.PLAIN;
}

// なにも 建っていない ときの 地面の 高さ
function rawHeightAt(wx, wz) {
  const t = th();
  const big = vn2(wx / 220, wz / 220, W.seed + 7);
  const mid = vn2(wx / 64, wz / 64, W.seed + 11);
  const fine = vn2(wx / 21, wz / 21, W.seed + 13);
  // big を 3 乗ぎみにすると 平地と山が はっきり 分かれる
  const m = (big - 0.5) * 2;
  // 山は とがらせ、へこみは あさく。ぜんぶ 海に なると あそべない
  const mountain = m > 0 ? m * m * m * t.mount : m * t.dip;
  const h = SEA + t.base + mountain + (mid - 0.5) * t.mid + (fine - 0.5) * t.fine;
  return Math.max(4, Math.min(CY - 12, Math.round(h)));
}

// --- 街と村 ------------------------------------------------------------------
//
// 世界を SCELL ごとの 区画に 分けて、区画ごとに 街か 村か 何もなしを 決める。
// 場所は たね から 決まるので、同じ たね なら いつも 同じ ところに ある。
//
// 建物は でこぼこの 上には 建てられないので、まわりの 地面を ならす。
// ならしかたは heightAt の 中でやる ——
// そうすると 地面・木の 生えかた・明るさの 計算が ぜんぶ 同じ 高さを 見るので、
// 「家が 宙に うく」「木が 屋根から 生える」といったことが 起きない。

const SCELL = 320;          // 区画の 大きさ
const SEDGE = 12;           // ならした ところから もとの 地面へ なじませる はば
const SREACH = 90;          // 区画の へりから いちばん 遠くまで とどく はんい

function structOf(gx, gz) {
  const k = gx + ',' + gz;
  if (W.structs.has(k)) return W.structs.get(k);
  // よその せかいの まん中には かならず 街か 村を おく。
  // そこに「もどる 土管」を 置くので、ついた とたんに
  // 「ここが どんな せかいか」が 目に 入るし、帰り道も すぐ わかる。
  if (W.theme !== 'home' && gx === 0 && gz === 0) {
    const kind = th().city ? 'town' : 'village';
    const y = Math.max(SEA + 2, rawHeightAt(0, 0));
    const s2 = { kind, x: 0, z: 0, r: kind === 'town' ? 64 : 45, y,
                 seed: cellSeed(0, 0, 0x11), home: true };
    W.structs.set(k, s2);
    return s2;
  }
  let s = null;
  const T4 = th();
  const rn = rng(cellSeed(gx, gz, 0x5713));
  const roll = rn();
  const kind = T4.city ? 'town'
             : (T4.mushroom || T4.freeze) ? (roll < 0.30 ? 'village' : null)
             : (roll < 0.20 ? 'town' : roll < 0.64 ? 'village' : null);
  if (kind) {
    const r = kind === 'town' ? 64 : 45;
    const pad = r + SEDGE + 6;
    const x = Math.round(gx * SCELL + pad + rn() * (SCELL - pad * 2));
    const z = Math.round(gz * SCELL + pad + rn() * (SCELL - pad * 2));
    let sum = 0, n = 0, lo = 999, hi = -999, ok = true;
    for (const [dx, dz] of [[0, 0], [-r, -r], [r, -r], [-r, r], [r, r],
                            [0, -r], [0, r], [-r, 0], [r, 0]]) {
      const hh = rawHeightAt(x + dx, z + dz);
      sum += hh; n++;
      if (hh < lo) lo = hh;
      if (hh > hi) hi = hh;
      if (th().biome && biomeAt(x + dx, z + dz) === BIOME.SNOW) ok = false;
    }
    const base = Math.round(sum / n);
    // 海の中・がけの上・高すぎる ところには 建てない
    if (base <= SEA + 2 || hi - lo > 20 || base > CY - 26) ok = false;
    if (ok) s = { kind, x, z, r, y: base, seed: cellSeed(gx, gz, 0x9AB1) };
  }
  W.structs.set(k, s);
  return s;
}

// (wx,wz) が どの 街／村の 中に あるか。ならす はばの 外なら null。
function structAt(wx, wz) {
  const gx = Math.floor(wx / SCELL), gz = Math.floor(wz / SCELL);
  const lx = wx - gx * SCELL, lz = wz - gz * SCELL;
  let s = hitStruct(structOf(gx, gz), wx, wz);
  if (s) return s;
  // 区画の へりの ちかく だけ となりも しらべる（ふだんは 1回で すむ）
  const dx0 = lx < SREACH ? -1 : 0, dx1 = lx > SCELL - SREACH ? 1 : 0;
  const dz0 = lz < SREACH ? -1 : 0, dz1 = lz > SCELL - SREACH ? 1 : 0;
  if (!dx0 && !dx1 && !dz0 && !dz1) return null;
  for (let dz = dz0; dz <= dz1; dz++) {
    for (let dx = dx0; dx <= dx1; dx++) {
      if (!dx && !dz) continue;
      s = hitStruct(structOf(gx + dx, gz + dz), wx, wz);
      if (s) return s;
    }
  }
  return null;
}

function hitStruct(s, wx, wz) {
  if (!s) return null;
  const d = Math.max(Math.abs(wx - s.x), Math.abs(wz - s.z));
  return d <= s.r + SEDGE ? s : null;
}

// この しかくの中に かかる 街や村を あつめる
function structsOverlapping(x0, z0, x1, z1) {
  const out = [];
  const g0x = Math.floor((x0 - SREACH) / SCELL), g1x = Math.floor((x1 + SREACH) / SCELL);
  const g0z = Math.floor((z0 - SREACH) / SCELL), g1z = Math.floor((z1 + SREACH) / SCELL);
  for (let gz = g0z; gz <= g1z; gz++) {
    for (let gx = g0x; gx <= g1x; gx++) {
      const s = structOf(gx, gz);
      if (!s) continue;
      const r = s.r + SEDGE;
      if (s.x + r < x0 || s.x - r > x1 || s.z + r < z0 || s.z - r > z1) continue;
      out.push(s);
    }
  }
  return out;
}

// 街や村の ところは 地面を たいらに する。そとに 行くほど もとの 地面に もどす。
function heightAt(wx, wz) {
  const h = rawHeightAt(wx, wz);
  const s = structAt(wx, wz);
  if (!s) return h;
  const d = Math.max(Math.abs(wx - s.x), Math.abs(wz - s.z));
  if (d <= s.r) return s.y;
  const t = (s.r + SEDGE - d) / SEDGE;
  return Math.round(h + (s.y - h) * t);
}

// --- ほらあな ----------------------------------------------------------------
//
// まえは 3D ノイズの しきい値だけで 穴を あけていた。
// それだと「あちこちに ぽつぽつ 空どうが ある」だけで、つながっていないし
// 地上から 入り口も 見つからない。
//
// そこで「ミミズ」を はわせる。ある点から 向きを すこしずつ 変えながら
// 進ませて、通り道を まるく くりぬく。これで ぐねぐね つながった
// ほんとうの ほらあなに なる。ときどき 大きな 広間も 作る。
// 3回に 1回は 地面から はじめて、入り口が 外から 見えるようにしてある。

const WCELL = 96;           // ミミズを わかせる 区画

function wormsOf(gx, gz) {
  const k = gx + ',' + gz;
  let list = W.worms.get(k);
  if (list) return list;
  list = [];
  const rn = rng(cellSeed(gx, gz, 0x3C71));
  const n = rn() < 0.4 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const fromTop = rn() < 0.34;
    let x = gx * WCELL + rn() * WCELL;
    let z = gz * WCELL + rn() * WCELL;
    const surf = rawHeightAt(Math.round(x), Math.round(z));
    if (surf <= SEA + 1) continue;             // 海の下からは はじめない
    let y = fromTop ? surf - 1 : 7 + rn() * 34;
    let yaw = rn() * 6.283;
    let pitch = fromTop ? 0.55 + rn() * 0.5 : (rn() - 0.5) * 0.5;
    const steps = 70 + ((rn() * 90) | 0);
    const roomAt = 12 + ((rn() * 40) | 0);
    const path = new Float32Array(steps * 4);
    const ns = cellSeed(gx, gz, 0x77 + i);
    for (let t = 0; t < steps; t++) {
      let r = 2.0 + vn2(t * 0.09, i * 13.3, ns) * 1.9;
      if (t > roomAt && t < roomAt + 5) r = 5.5 + vn2(t * 0.4, i * 3.1, ns) * 3.0;
      path[t * 4] = x; path[t * 4 + 1] = y; path[t * 4 + 2] = z; path[t * 4 + 3] = r;
      yaw += (vn2(t * 0.11, i * 7.7, ns) - 0.5) * 0.55;
      pitch += (vn2(t * 0.13 + 50, i * 5.3, ns) - 0.5) * 0.32;
      if (pitch > 0.62) pitch = 0.62;
      if (pitch < -0.5) pitch = -0.5;
      // ふかく なりすぎたら 上へ、あさく なりすぎたら 下へ もどす
      if (y < 9) pitch -= 0.10;
      if (y > 46) pitch += 0.10;
      const cp = Math.cos(pitch);
      x += Math.sin(yaw) * cp * 1.3;
      y -= Math.sin(pitch) * 1.3;
      z += Math.cos(yaw) * cp * 1.3;
      if (y < 3 || y > CY - 6) break;
    }
    list.push({ path, n: path.length / 4, top: fromTop });
  }
  W.worms.set(k, list);
  if (W.worms.size > 400) {          // 遠くの ぶんは 捨てる（また 作れる）
    const it = W.worms.keys();
    for (let i = 0; i < 120; i++) { const kk = it.next().value; W.worms.delete(kk); }
  }
  return list;
}

// このチャンクの ぶんだけ くりぬく
function carveWorms(ch) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH;
  const g0x = Math.floor((x0 - WCELL) / WCELL), g1x = Math.floor((x0 + CH + WCELL) / WCELL);
  const g0z = Math.floor((z0 - WCELL) / WCELL), g1z = Math.floor((z0 + CH + WCELL) / WCELL);
  for (let gz = g0z; gz <= g1z; gz++) {
    for (let gx = g0x; gx <= g1x; gx++) {
      for (const w of wormsOf(gx, gz)) {
        const p = w.path;
        for (let t = 0; t < w.n; t++) {
          const cxp = p[t * 4], cyp = p[t * 4 + 1], czp = p[t * 4 + 2];
          let r = p[t * 4 + 3];
          if (r <= 0) continue;
          // 入り口の あたりは すこし 広げて、外から 見つけやすくする
          if (w.top && t < 4) r += 1.2;
          if (cxp + r < x0 || cxp - r > x0 + CH - 1) continue;
          if (czp + r < z0 || czp - r > z0 + CH - 1) continue;
          carveBall(ch, cxp, cyp, czp, r);
        }
      }
    }
  }
}

function carveBall(ch, cx, cy, cz, r) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH;
  const ax = Math.max(x0, Math.floor(cx - r)), bx = Math.min(x0 + CH - 1, Math.ceil(cx + r));
  const az = Math.max(z0, Math.floor(cz - r)), bz = Math.min(z0 + CH - 1, Math.ceil(cz + r));
  const ay = Math.max(1, Math.floor(cy - r)), by = Math.min(CY - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let z = az; z <= bz; z++) {
    for (let x = ax; x <= bx; x++) {
      const col = (x - x0) + (z - z0) * CH;
      const surf = ch.hm[col];
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      const dxz = dx * dx + dz * dz;
      if (dxz > r2) continue;
      // 海の底に 穴を あけると 海が ぬけるので、水の下では 地面ちかくを 残す
      const top = surf > SEA + 1 ? surf : surf - 3;
      for (let y = ay; y <= by; y++) {
        if (y > top) continue;
        const dy = (y + 0.5 - cy) * 1.15;    // すこし たてに つぶす
        if (dxz + dy * dy > r2) continue;
        const i = col + y * CHXZ;
        if (ch.b[i] === ID.bedrock) continue;
        ch.b[i] = 0;
      }
    }
  }
}

// 石のなかに どの鉱石が うまっているか。2x2x2 でかたまるようにしてある。
function oreAt(wx, wy, wz, surf) {
  const r = h3(wx >> 1, wy >> 1, wz >> 1, W.seed + 71);
  const deep = surf - wy;
  if (deep < 4) return ID.stone;
  if (wy < 13 && r < 0.0022) return ID.diamond_ore;
  if (wy < 11 && r < 0.0036) return ID.emerald_ore;
  if (wy < 18 && r < 0.0075) return ID.redstone_ore;
  if (wy < 24 && r < 0.0115) return ID.gold_ore;
  if (deep > 6 && r < 0.020) return ID.iron_ore;
  if (deep > 4 && r < 0.034) return ID.coal_ore;
  if (r > 0.988) return ID.gravel;
  return ID.stone;
}

function genChunk(cx, cz) {
  const T2 = th();
  const b = new Uint8Array(CH * CY * CH);
  const hm = new Uint8Array(CHXZ);
  const bm = new Uint8Array(CHXZ);
  for (let z = 0; z < CH; z++) {
    for (let x = 0; x < CH; x++) {
      const wx = cx * CH + x, wz = cz * CH + z;
      const h = heightAt(wx, wz);
      const bio = biomeAt(wx, wz);
      hm[x + z * CH] = h;
      bm[x + z * CH] = bio;
      const col = x + z * CH;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0) id = ID.bedrock;
        else if (y === h) {
          id = T2.surf ? ID[T2.surf]
             : bio === BIOME.DESERT ? ID.sand
             : bio === BIOME.SNOW ? ID.snow
             : (h < SEA + 1 ? ID.sand : ID.grass);
        } else if (y > h - 4) {
          id = T2.sub ? ID[T2.sub] : (bio === BIOME.DESERT ? ID.sand : ID.dirt);
        } else {
          id = oreAt(wx, y, wz, h);
        }
        // こまかい 空どう。ミミズの ほらあなに ぽつぽつ 足す ていど。
        if (y > 1 && y < h - 2) {
          const cave = vn3(wx / 26, y / 15, wz / 26, W.seed + 53);
          if (cave > 0.70 && (y < h - 2 || h > SEA + 1)) id = 0;
        }
        b[col + y * CHXZ] = id;
      }
    }
  }
  const ch = { cx, cz, b, hm, bm, mesh: null, dirty: true, gen: true };
  W.chunks.set(ckey(cx, cz), ch);

  carveWorms(ch);                       // ぐねぐねの ほらあなを ほる

  const T2b = th();
  for (let z = 0; z < CH; z++) {
    for (let x = 0; x < CH; x++) {
      const col = x + z * CH;
      const h = hm[col];
      for (let y = h + 1; y <= SEA; y++) {
        // ゆきやまでは 水めんが こおる
        b[col + y * CHXZ] = (T2b.freeze && y === SEA) ? ID.ice : ID.water;
      }
      // いちばん下は ようがんの 海。ほらあなの 底に たまる。
      for (let y = 1; y <= 4; y++) if (b[col + y * CHXZ] === 0) b[col + y * CHXZ] = ID.lava;
    }
  }

  buildStructures(ch);                  // 街・村を 建てる
  decorate(ch);                         // 木・花・草
  applyEdits(ch);                       // じぶんが いじった ぶん
  return ch;
}

// 街や村を この チャンクの ぶんだけ 書きこむ。
// 建物は チャンクを またぐので、かかっている ものを ぜんぶ 見て、
// はみ出した ぶんは 捨てる（となりの チャンクが 作られるとき また 書かれる）。
function buildStructures(ch) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH, x1 = x0 + CH - 1, z1 = z0 + CH - 1;
  const list = structsOverlapping(x0, z0, x1, z1);
  if (!list.length) return;
  const put = (wx, wy, wz, id) => {
    if (wx < x0 || wx > x1 || wz < z0 || wz > z1) return;
    if (wy < 1 || wy >= CY) return;
    ch.b[(wx - x0) + (wz - z0) * CH + wy * CHXZ] = id;
    if (id && BLOCKS[id].light > 0 && !BLOCKS[id].liquid) addLight(wx, wy, wz, BLOCKS[id].light);
  };
  const box = { x0, z0, x1, z1 };
  for (const s of list) {
    if (s.kind === 'arrival') drawArrival(s, put, box);
    else if (s.kind === 'town') drawTown(s, put, box);
    else drawVillage(s, put, box);
  }
}

// 木・花・草・サボテン。木は チャンクを またぐので、
// まわり 3 マスぶん 外まで しらべて はみ出しぶんも 書きこむ。
function decorate(ch) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH;
  const put = (wx, wy, wz, id, over) => {
    const lx = wx - x0, lz = wz - z0;
    if (lx < 0 || lx >= CH || lz < 0 || lz >= CH || wy < 0 || wy >= CY) return;
    const i = lx + lz * CH + wy * CHXZ;
    if (!over && ch.b[i] !== 0) return;
    ch.b[i] = id;
  };
  for (let wz = z0 - 3; wz < z0 + CH + 3; wz++) {
    for (let wx = x0 - 3; wx < x0 + CH + 3; wx++) {
      const h = heightAt(wx, wz);
      if (h < SEA + 1) continue;
      if (structAt(wx, wz)) continue;      // 街や村の 中には 生やさない
      const bio = biomeAt(wx, wz);
      const r = h2(wx, wz, W.seed + 101);

      if (bio === BIOME.DESERT) {
        if (r < 0.006) {
          const tall = 2 + ((h2(wx, wz, W.seed + 103) * 3) | 0);
          for (let k = 1; k <= tall; k++) put(wx, h + k, wz, ID.cactus);
        } else if (r > 0.994) {
          put(wx, h + 1, wz, ID.tallgrass);
        }
        continue;
      }
      const T3 = th();
      if (T3.mushroom) {
        // キノコの森。おおきな キノコが 生える
        if (r < 0.020) bigMushroom(put, wx, h, wz);
        else if (r > 0.90) put(wx, h + 1, wz, ID.mushroom);
        else if (r > 0.80) put(wx, h + 1, wz, ID.tallgrass);
        continue;
      }
      const treeP = (bio === BIOME.FOREST ? 0.038 : 0.007) * T3.treeP;
      if (treeP > 0 && r < treeP) {
        const birch = T3.birch || bio === BIOME.SNOW || h2(wx, wz, W.seed + 107) < 0.3;
        const logId = birch ? ID.birch_log : ID.log;
        const tall = 4 + ((h2(wx, wz, W.seed + 109) * 3) | 0);
        const ty = h + tall;
        for (let dy = -2; dy <= 1; dy++) {
          const ry = ty + dy;
          const rad = dy >= 1 ? 1 : (dy === 0 ? 1 : 2);
          for (let dz = -rad; dz <= rad; dz++) {
            for (let dx = -rad; dx <= rad; dx++) {
              if (rad === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
              if (dx === 0 && dz === 0 && dy < 1) continue;
              put(wx + dx, ry, wz + dz, ID.leaves);
            }
          }
        }
        for (let k = 1; k <= tall; k++) put(wx, h + k, wz, logId, true);
        continue;
      }
      // 草花は じぶんの チャンクのなかだけ
      if (wx < x0 || wx >= x0 + CH || wz < z0 || wz >= z0 + CH) continue;
      if (bio === BIOME.SNOW) continue;
      if (r > 0.86) put(wx, h + 1, wz, ID.tallgrass);
      else if (r > 0.845) put(wx, h + 1, wz, ID.flower_red);
      else if (r > 0.832) put(wx, h + 1, wz, ID.flower_yellow);
      else if (r > 0.828) put(wx, h + 1, wz, ID.pumpkin);
      else if (r > 0.824) put(wx, h + 1, wz, ID.melon);
    }
  }
}

// キノコの森の おおきな キノコ。じくは しらかば、かさは 赤か 茶色の ウール。
function bigMushroom(put, wx, h, wz) {
  const rn = rng((Math.imul(wx, 374761393) ^ Math.imul(wz, 668265263) ^ W.seed) >>> 0);
  const tall = 4 + ((rn() * 4) | 0);
  const cap = rn() < 0.5 ? ID.wool_red : ID.wool_brown;
  for (let k = 1; k <= tall; k++) put(wx, h + k, wz, ID.birch_log, true);
  const ty = h + tall;
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.abs(dx) + Math.abs(dz);
      if (d > 4) continue;
      put(wx + dx, ty + 1, wz + dz, cap);
      if (d <= 2) put(wx + dx, ty + 2, wz + dz, cap);
    }
  }
  put(wx, ty + 1, wz, ID.glowstone);      // かさの 下が ぼんやり 光る
}

// じぶんが 掘った／置いた ぶんを かぶせる
function applyEdits(ch) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH;
  for (const [k, id] of W.edits) {
    const p = k.split(',');
    const x = +p[0], y = +p[1], z = +p[2];
    if (x < x0 || x >= x0 + CH || z < z0 || z >= z0 + CH) continue;
    ch.b[(x - x0) + (z - z0) * CH + y * CHXZ] = id;
  }
}

function getChunk(cx, cz, make) {
  const c = W.chunks.get(ckey(cx, cz));
  if (c) return c;
  if (!make) return null;
  return genChunk(cx, cz);
}

function getBlock(x, y, z) {
  if (y < 0 || y >= CY) return 0;
  const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
  const c = getChunk(cx, cz, true);
  return c.b[(x - cx * CH) + (z - cz * CH) * CH + y * CHXZ];
}

// 世界の 座標での 空の 明るさ（生きものの 明るさに つかう）
function skyLightAt(x, y, z) {
  const h = surfaceAt(x, z);
  if (y > h) return 1;
  return Math.max(0.05, 1 - (h - y + 1) * 0.16);
}

// 地面の高さ（明るさの計算で使う）
function surfaceAt(x, z) {
  const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
  const c = getChunk(cx, cz, true);
  return c.hm[(x - cx * CH) + (z - cz * CH) * CH];
}

function setBlock(x, y, z, id) {
  if (y < 1 || y >= CY) return false;
  const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
  const c = getChunk(cx, cz, true);
  const lx = x - cx * CH, lz = z - cz * CH;
  const i = lx + lz * CH + y * CHXZ;
  if (c.b[i] === id) return false;
  const was = c.b[i];
  c.b[i] = id;
  W.edits.set(ekey(x, y, z), id);

  if (blk(was).light > 0) removeLight(x, y, z);
  if (blk(id).light > 0 && !blk(id).liquid) addLight(x, y, z, blk(id).light);
  // 地面の高さが変わったら 明るさも変わる
  if (y > c.hm[lx + lz * CH] && id !== 0 && blk(id).opaque) c.hm[lx + lz * CH] = y;
  else if (y === c.hm[lx + lz * CH] && id === 0) {
    let h = y; while (h > 0 && !isOpaque(c.b[lx + lz * CH + h * CHXZ])) h--;
    c.hm[lx + lz * CH] = h;
  }

  c.dirty = true;
  // ふちを 変えたら となりの チャンクも 作りなおす
  if (lx === 0) markDirty(cx - 1, cz);
  if (lx === CH - 1) markDirty(cx + 1, cz);
  if (lz === 0) markDirty(cx, cz - 1);
  if (lz === CH - 1) markDirty(cx, cz + 1);
  // たいまつは まわりを 明るくするので すこし 広めに 作りなおす
  if (blk(id).light > 0 || blk(was).light > 0) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) markDirty(cx + dx, cz + dz);
    }
  }
  return true;
}

function markDirty(cx, cz) {
  const c = W.chunks.get(ckey(cx, cz));
  if (c) c.dirty = true;
}

// --- 面のむき ---------------------------------------------------------------
//
// 外から見て 反時計まわり になるように かどを ならべてある。
// そうしないと 裏返って 見えなくなる。

const FACES = [
  { n: [0, 1, 0], ax: 0, az: 2, bright: 1.00,      // 上
    v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    uv: [[0, 0], [0, 1], [1, 1], [1, 0]] },
  { n: [0, -1, 0], ax: 0, az: 2, bright: 0.52,     // 下
    v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  { n: [1, 0, 0], ax: 2, az: 1, bright: 0.72,      // 右
    v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [-1, 0, 0], ax: 2, az: 1, bright: 0.72,     // 左
    v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [0, 0, 1], ax: 0, az: 1, bright: 0.88,      // 前
    v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
  { n: [0, 0, -1], ax: 0, az: 1, bright: 0.88,     // うしろ
    v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    uv: [[0, 1], [1, 1], [1, 0], [0, 0]] },
];

// 面のばんごう → どの絵を使うか
function faceTile(b, f) {
  return f === 0 ? b.top : f === 1 ? b.bottom : b.side;
}

// かどの暗さ。まわりに ブロックが ある ほど 暗くなる。
// これが あると 角が しまって マイクラっぽく 見える。
const AO_LEVEL = [0.48, 0.66, 0.83, 1.0];

// --- 地形を 三角形に する ---------------------------------------------------

// 1 つの かど を 16 バイトに つめる。
//   0..5   いち（チャンクの中・1/16 ブロック たんい）Int16 x3
//   6..9   絵の どこ を つかうか Uint16 x2
//   10..13 面の暗さ／空／たいまつ／すけぐあい Uint8 x4
// float で ぜんぶ 持つと 1 つ 36 バイトに なって、スマホの メモリを
// 2 倍 食う。ここは けちった ぶんだけ そのまま 効く。
const VSTRIDE = 16;
let SBUF = new ArrayBuffer(1 << 20);
let S16 = new Int16Array(SBUF), SU16 = new Uint16Array(SBUF), SU8 = new Uint8Array(SBUF);
let SN = 0;             // バイトの いち

function growScratch() {
  const nb = new ArrayBuffer(SBUF.byteLength * 2);
  new Uint8Array(nb).set(new Uint8Array(SBUF));
  SBUF = nb;
  S16 = new Int16Array(SBUF); SU16 = new Uint16Array(SBUF); SU8 = new Uint8Array(SBUF);
}

function pushV(x, y, z, u, v, l, s, bl, a) {
  if (SN + VSTRIDE > SBUF.byteLength) growScratch();
  const i = SN >> 1;
  S16[i] = (x * 16) | 0; S16[i + 1] = (y * 16) | 0; S16[i + 2] = (z * 16) | 0;
  SU16[i + 3] = (u * 65535) | 0; SU16[i + 4] = (v * 65535) | 0;
  SU8[SN + 10] = (l * 255) | 0; SU8[SN + 11] = (s * 255) | 0;
  SU8[SN + 12] = (bl * 255) | 0; SU8[SN + 13] = (a * 255) | 0;
  SN += VSTRIDE;
}

// 空の明るさ。地面より 下は だんだん暗くなる ＝ ほらあなは まっくら。
function skyAt(x, y, z) {
  const h = surfaceAt(x, z);
  if (y > h) return 1;
  return Math.max(0.05, 1 - (h - y + 1) * 0.16);
}

function lightAt(near, x, y, z) {
  let m = 0;
  for (let i = 0; i < near.length; i++) {
    const L = near[i];
    const d = Math.abs(L.x - x) + Math.abs(L.y - y) + Math.abs(L.z - z);
    const v = L.v * (1 - d / 9);
    if (v > m) m = v;
  }
  return m > 0 ? m : 0;
}

function buildMesh(ch) {
  const x0 = ch.cx * CH, z0 = ch.cz * CH;
  // まわり 8 つの チャンクを 先に 作って、配列で 手もとに 置いておく。
  // ここで 毎回 Map を 引くと、1 チャンクあたり 10万回 引くことになって
  // ものすごく 遅い。これが スマホで 動くか どうかの 分かれめ。
  const nb = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      nb[(dx + 1) + (dz + 1) * 3] = getChunk(ch.cx + dx, ch.cz + dz, true);
    }
  }
  // このチャンクの ちかくの あかり だけ 集める
  const near = lightsNear(ch.cx, ch.cz, []);
  const M = { ch, nb, near, x0, z0 };

  // 高さで 3 つの だん に 分ける。ほらあなの 天井や 地下の かべは
  // 地上に いるとき まったく 見えないので、だんごとに とばせるように する。
  SN = 0;
  const secs = [];
  for (let s = 0; s < SECN; s++) {
    const from = SN;
    meshPass(M, false, s * SECH, (s + 1) * SECH);
    secs.push({ y0: s * SECH, y1: (s + 1) * SECH,
                from: from / VSTRIDE, n: (SN - from) / VSTRIDE });
  }
  const opaqueEnd = SN;
  const asecs = [];
  for (let s = 0; s < SECN; s++) {
    const from = SN;
    meshPass(M, true, s * SECH, (s + 1) * SECH);
    asecs.push({ y0: s * SECH, y1: (s + 1) * SECH,
                 from: from / VSTRIDE, n: (SN - from) / VSTRIDE });
  }
  const alphaEnd = SN;

  const gl = R.gl;
  if (!ch.mesh) ch.mesh = { buf: gl.createBuffer(), nOpaque: 0, nAlpha: 0 };
  gl.bindBuffer(gl.ARRAY_BUFFER, ch.mesh.buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(SBUF, 0, alphaEnd), gl.STATIC_DRAW);
  ch.mesh.nOpaque = opaqueEnd / VSTRIDE;
  ch.mesh.nAlpha = (alphaEnd - opaqueEnd) / VSTRIDE;
  ch.mesh.bytes = alphaEnd;
  ch.mesh.alphaFrom = ch.mesh.nOpaque;
  ch.mesh.secs = secs;
  ch.mesh.asecs = asecs;
  ch.dirty = false;
  W.built++;
}

// チャンクの中の 場所で ブロックを 読む。はみ出したら となりの チャンクから。
// AO で 2 マス先まで 見るので、はみ出しは 最大 2（1 チャンク ぶん）に おさまる。
function gbl(M, lx, ly, lz) {
  if (ly < 0 || ly >= CY) return 0;
  let ox = 0, oz = 0;
  if (lx < 0) { ox = -1; lx += CH; } else if (lx >= CH) { ox = 1; lx -= CH; }
  if (lz < 0) { oz = -1; lz += CH; } else if (lz >= CH) { oz = 1; lz -= CH; }
  const c = M.nb[(ox + 1) + (oz + 1) * 3];
  return c ? c.b[lx + lz * CH + ly * CHXZ] : 0;
}

// 地面の高さも 同じように 手もとの チャンクから
function hgt(M, lx, lz) {
  let ox = 0, oz = 0;
  if (lx < 0) { ox = -1; lx += CH; } else if (lx >= CH) { ox = 1; lx -= CH; }
  if (lz < 0) { oz = -1; lz += CH; } else if (lz >= CH) { oz = 1; lz -= CH; }
  const c = M.nb[(ox + 1) + (oz + 1) * 3];
  return c ? c.hm[lx + lz * CH] : 0;
}

// 空の明るさ。地面より 下は だんだん暗くなる ＝ ほらあなは まっくら。
function skyAt(M, lx, ly, lz) {
  const h = hgt(M, lx, lz);
  if (ly > h) return 1;
  return Math.max(0.05, 1 - (h - ly + 1) * 0.16);
}

function lightAt(near, x, y, z) {
  let m = 0;
  for (let i = 0; i < near.length; i++) {
    const L = near[i];
    const d = Math.abs(L.x - x) + Math.abs(L.y - y) + Math.abs(L.z - z);
    const v = L.v * (1 - d / 9);
    if (v > m) m = v;
  }
  return m > 0 ? m : 0;
}

const SECH = 24;                       // だん 1 つの 高さ
const SECN = Math.ceil(CY / SECH);

function meshPass(M, wantAlpha, yFrom, yTo) {
  const b = M.ch.b;
  const yA = yFrom === undefined ? 0 : yFrom;
  const yB = Math.min(CY, yTo === undefined ? CY : yTo);
  for (let y = yA; y < yB; y++) {
    const yo = y * CHXZ;
    for (let z = 0; z < CH; z++) {
      for (let x = 0; x < CH; x++) {
        const id = b[x + z * CH + yo];
        if (id === 0) continue;
        const B = BLOCKS[id];
        if ((B.alpha > 0) !== wantAlpha) continue;
        if (B.cross) emitCross(M, x, y, z, B);
        else emitCube(M, x, y, z, id, B);
      }
    }
  }
}

function emitCube(M, lx, ly, lz, id, B) {
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    const nx = lx + F.n[0], ny = ly + F.n[1], nz = lz + F.n[2];
    const nid = gbl(M, nx, ny, nz);
    if (nid === id) continue;                 // 同じもの どうしは かかない
    if (nid !== 0) {
      const NB = BLOCKS[nid];
      if (NB.opaque) continue;                // 向こうが 見えないなら いらない
      if (B.alpha > 0 && NB.alpha > 0) continue;
    }
    const uv = uvOf(faceTile(B, f));
    const sky = skyAt(M, nx, ny, nz);
    const lit = B.light > 0 ? B.light : lightAt(M.near, M.x0 + nx, ny, M.z0 + nz);

    // 4 つの かど の 暗さ
    const ao0 = cornerAO(M, F, 0, nx, ny, nz);
    const ao1 = cornerAO(M, F, 1, nx, ny, nz);
    const ao2 = cornerAO(M, F, 2, nx, ny, nz);
    const ao3 = cornerAO(M, F, 3, nx, ny, nz);
    const ao = [ao0, ao1, ao2, ao3];

    // かどの暗さが ななめに かたよるときは 三角形の 割りかたを 変える。
    // そうしないと 角が ねじれて 見える。
    const flip = ao0 + ao2 < ao1 + ao3;
    const order = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
    const alpha = B.alpha > 0 ? B.alpha : 1;
    for (let k = 0; k < 6; k++) {
      const i = order[k], v = F.v[i], t = F.uv[i];
      pushV(lx + v[0], ly + v[1], lz + v[2],
            uv[0] + (uv[2] - uv[0]) * t[0], uv[1] + (uv[3] - uv[1]) * t[1],
            F.bright * AO_LEVEL[ao[i]], sky, lit, alpha);
    }
  }
}

const _o1 = [0, 0, 0], _o2 = [0, 0, 0];
function cornerAO(M, F, i, nx, ny, nz) {
  const c = F.v[i];
  const sa = c[F.ax] ? 1 : -1, sb = c[F.az] ? 1 : -1;
  _o1[0] = 0; _o1[1] = 0; _o1[2] = 0;
  _o2[0] = 0; _o2[1] = 0; _o2[2] = 0;
  _o1[F.ax] = sa; _o2[F.az] = sb;
  const s1 = isOpaque(gbl(M, nx + _o1[0], ny + _o1[1], nz + _o1[2])) ? 1 : 0;
  const s2 = isOpaque(gbl(M, nx + _o2[0], ny + _o2[1], nz + _o2[2])) ? 1 : 0;
  if (s1 && s2) return 0;
  const s3 = isOpaque(gbl(M, nx + _o1[0] + _o2[0], ny + _o1[1] + _o2[1],
                          nz + _o1[2] + _o2[2])) ? 1 : 0;
  return 3 - (s1 + s2 + s3);
}

// 花・草・たいまつ は ぺらぺらの ×字
function emitCross(M, lx, ly, lz, B) {
  const wx = M.x0 + lx, wz = M.z0 + lz;
  const uv = uvOf(B.side);   // wx/wz は あかりの きょり を はかるのに つかう
  const sky = skyAt(M, lx, ly, lz);
  const lit = B.light > 0 ? B.light : lightAt(M.near, wx, ly, wz);
  const d = 0.146;                     // ×の はしっこ
  const quads = [
    [[d, 0, d], [1 - d, 0, 1 - d], [1 - d, 1, 1 - d], [d, 1, d]],
    [[1 - d, 0, d], [d, 0, 1 - d], [d, 1, 1 - d], [1 - d, 1, d]],
  ];
  for (const q of quads) {
    for (const side of [0, 1]) {       // 裏からも 見えるように 2 まい
      const o = side ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1];
      for (const k of o) {
        const p = q[k];
        const uu = uv[0] + (uv[2] - uv[0]) * (k === 0 || k === 3 ? 0 : 1);
        const vv = uv[1] + (uv[3] - uv[1]) * (k < 2 ? 1 : 0);
        pushV(lx + p[0], ly + p[1], lz + p[2], uu, vv, 0.94, sky, lit, 1);
      }
    }
  }
}

// --- 見ているブロックを さがす（レイキャスト）-------------------------------

function raycast(ox, oy, oz, dx, dy, dz, maxD) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / dx), tdy = Math.abs(1 / dy), tdz = Math.abs(1 / dz);
  let tmx = (dx > 0 ? (x + 1 - ox) : (ox - x)) * tdx;
  let tmy = (dy > 0 ? (y + 1 - oy) : (oy - y)) * tdy;
  let tmz = (dz > 0 ? (z + 1 - oz) : (oz - z)) * tdz;
  let px = x, py = y, pz = z;
  for (let i = 0; i < 160; i++) {
    const id = getBlock(x, y, z);
    if (id !== 0 && !BLOCKS[id].liquid) {
      return { x, y, z, id, px, py, pz };
    }
    px = x; py = y; pz = z;
    if (tmx < tmy && tmx < tmz) { if (tmx > maxD) break; x += sx; tmx += tdx; }
    else if (tmy < tmz) { if (tmy > maxD) break; y += sy; tmy += tdy; }
    else { if (tmz > maxD) break; z += sz; tmz += tdz; }
  }
  return null;
}

// --- チャンクの出し入れ -----------------------------------------------------

function updateChunks(px, pz, dist) {
  const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH);
  // 遠くなったものは 捨てる（掘ったあとは W.edits に 残るので 消えない）
  for (const [k, c] of W.chunks) {
    if (Math.abs(c.cx - pcx) > dist + 1 || Math.abs(c.cz - pcz) > dist + 1) {
      if (c.mesh) R.gl.deleteBuffer(c.mesh.buf);
      W.chunks.delete(k);
    }
  }
  // 近いものから 順に 作る
  W.meshQueue.length = 0;
  for (let dz = -dist; dz <= dist; dz++) {
    for (let dx = -dist; dx <= dist; dx++) {
      const d2 = dx * dx + dz * dz;
      if (d2 > (dist + 0.5) * (dist + 0.5)) continue;
      const c = W.chunks.get(ckey(pcx + dx, pcz + dz));
      if (!c) { W.meshQueue.push({ cx: pcx + dx, cz: pcz + dz, d: d2 }); }
      else if (c.dirty) W.meshQueue.push({ cx: c.cx, cz: c.cz, d: d2 });
    }
  }
  W.meshQueue.sort((a, b) => a.d - b.d);
}

// 1 フレームに いくつか だけ 作る。いっぺんに作ると 画面が 止まる。
function buildSome(budgetMs) {
  const t0 = performance.now();
  let n = 0;
  while (W.meshQueue.length) {
    const q = W.meshQueue.shift();
    const c = getChunk(q.cx, q.cz, true);
    if (c.dirty) buildMesh(c);
    n++;
    if (performance.now() - t0 > budgetMs) break;
  }
  return n;
}

function resetWorld(seed) {
  for (const [, c] of W.chunks) if (c.mesh) R.gl.deleteBuffer(c.mesh.buf);
  W.chunks.clear();
  W.lights.clear();
  W.structs.clear();
  W.worms.clear();
  W.seed = seed | 0;
}

// たね から 立てる場所を さがす。
// まずは 街の ひろば —— ふんすいと あかりと 土管が そろっていて、
// はじめた とたんに「行くところ」が 目に 入る。
// 街が 見つからなければ 村の そと、それも なければ 草の ある たいらな ところ。
function spawnPoint() {
  if (W.theme !== 'home') {
    // もどる 土管の すぐ そばに 立たせる
    const s = structOf(0, 0);
    if (s.kind === 'town') return { x: 0.5, y: s.y + 2, z: 15.5, arrival: s };
    return { x: 34.5, y: s.y + 2, z: 27.5, arrival: s };
  }
  // 近い ところから 順に、街 → 村 の じゅんで さがす
  for (const want of ['town', 'village']) {
    for (let r = 0; r <= 3; r++) {
      for (let gz = -r; gz <= r; gz++) {
        for (let gx = -r; gx <= r; gx++) {
          if (Math.max(Math.abs(gx), Math.abs(gz)) !== r) continue;
          const st = structOf(gx, gz);
          if (!st || st.kind !== want) continue;
          if (want === 'town') {
            // ひろばの はし。ふんすい（まん中から 4ます）にも ベンチ（7ます）にも
            // 街灯（かどの 9ます）にも 土管（南に 9ます）にも かからない ところ。
            // ふんすいに くっつけると かべしか 見えないので 10ます はなし、
            // ななめに ずらして ベンチが 目のまえに 来ないように している。
            return { x: st.x + 10.5, y: st.y + 2, z: st.z + 5.5, near: st, town: true };
          }
          // ならした ところの 外がわに 立たせる（村ぜんたいが 見わたせる）
          for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const x = st.x + dx * (st.r + 16), z = st.z + dz * (st.r + 16);
            const h = heightAt(x, z);
            if (h > SEA + 1 && h < CY - 14) {
              return { x: x + 0.5, y: h + 1.2, z: z + 0.5, near: st };
            }
          }
        }
      }
    }
  }
  let backup = null;
  for (let r = 0; r < 90; r++) {
    for (let i = 0; i < 8; i++) {
      const a2 = (r * 8 + i) * 0.7;
      const x = Math.round(Math.cos(a2) * r * 2), z = Math.round(Math.sin(a2) * r * 2);
      const h = heightAt(x, z);
      if (h <= SEA + 1 || h >= CY - 14) continue;
      const p = { x: x + 0.5, y: h + 1.2, z: z + 0.5 };
      if (!backup) backup = p;
      // まっ白な ゆき原や すなばく に いきなり 出ると さびしいので、
      // 草の ある ところを さがす
      const b = biomeAt(x, z);
      if (b === BIOME.PLAIN || b === BIOME.FOREST) return p;
    }
  }
  return backup || { x: 0.5, y: SEA + 6, z: 0.5 };
}
