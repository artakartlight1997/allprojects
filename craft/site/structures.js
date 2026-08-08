// 街と村の 建てかた。
//
// world.js から 「この しかくの中だけ 書いてね」と 呼ばれる。
// 建物は チャンク（16x16）より 大きいので、同じ 建物が 何回も 呼ばれる。
// 毎回 同じ 形に ならないと 継ぎ目が ずれるので、
// 形は ぜんぶ たね（s.seed）から 決めて、乱数は 使いまわさない。
//
// box は いま 作っている チャンクの はんい。ここに かからない ものは
// はじめから 作らない ——「街ぜんぶ を 49 回 書く」と 遅くなるため。

'use strict';

function boxHit(box, x0, z0, x1, z1) {
  return !(x1 < box.x0 || x0 > box.x1 || z1 < box.z0 || z0 > box.z1);
}

// --- 部品 --------------------------------------------------------------------

// 四角い はこ（中は からっぽ）
function shell(put, x0, y0, z0, x1, y1, z1, id) {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || z === z0 || z === z1
                  || y === y0 || y === y1;
        if (edge) put(x, y, z, id);
      }
    }
  }
}

function fillBox(put, x0, y0, z0, x1, y1, z1, id) {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) put(x, y, z, id);
    }
  }
}

// 三角の 屋根。ながい ほうに そって かたむける。
function gableRoof(put, x0, y0, z0, x1, z1, id, alongX) {
  const w = alongX ? (z1 - z0) : (x1 - x0);
  const half = Math.floor(w / 2) + 1;
  for (let k = 0; k <= half; k++) {
    const y = y0 + k;
    const ax0 = alongX ? x0 - 1 : x0 - 1 + k;
    const ax1 = alongX ? x1 + 1 : x1 + 1 - k;
    const az0 = alongX ? z0 - 1 + k : z0 - 1;
    const az1 = alongX ? z1 + 1 - k : z1 + 1;
    if (ax0 > ax1 || az0 > az1) break;
    for (let z = az0; z <= az1; z++) {
      for (let x = ax0; x <= ax1; x++) {
        // ふちだけ 置いて、中は 上の だんに まかせる
        const edge = alongX ? (z === az0 || z === az1) : (x === ax0 || x === ax1);
        if (edge || k === half) put(x, y, z, id);
      }
    }
  }
}

// --- 村の 家 -----------------------------------------------------------------
//
// 木の 柱＋板の かべ＋三角屋根。まどは ガラス、中に たいまつ。

const HOUSE_WALL = ['planks', 'planks', 'birch_planks', 'cobble'];
const HOUSE_ROOF = ['log', 'birch_log', 'cobble', 'brick'];

function house(put, box, x, y, z, w, d, seed, doorDir) {
  const x1 = x + w - 1, z1 = z + d - 1;
  const hgt = 4;
  if (!boxHit(box, x - 2, z - 2, x1 + 2, z1 + Math.floor(Math.max(w, d) / 2) + 3)) return;
  const rn = rng(seed);
  const wall = ID[HOUSE_WALL[(rn() * HOUSE_WALL.length) | 0]];
  const roof = ID[HOUSE_ROOF[(rn() * HOUSE_ROOF.length) | 0]];

  fillBox(put, x, y - 1, z, x1, y - 1, z1, ID.planks);          // ゆか
  shell(put, x, y, z, x1, y + hgt, z1, wall);                   // かべ
  fillBox(put, x + 1, y, z + 1, x1 - 1, y + hgt - 1, z1 - 1, 0); // 中を くりぬく
  // かどの 柱
  for (const [cx, cz] of [[x, z], [x1, z], [x, z1], [x1, z1]]) {
    for (let k = 0; k <= hgt; k++) put(cx, y + k, cz, ID.log);
  }
  // まど
  const wy = y + 2;
  for (let i = x + 2; i <= x1 - 2; i += 2) { put(i, wy, z, ID.glass); put(i, wy, z1, ID.glass); }
  for (let i = z + 2; i <= z1 - 2; i += 2) { put(x, wy, i, ID.glass); put(x1, wy, i, ID.glass); }
  // 入口（2 ますぶん くりぬく）
  const mx = x + (w >> 1), mz = z + (d >> 1);
  if (doorDir === 0) { put(mx, y, z1, 0); put(mx, y + 1, z1, 0); }
  else if (doorDir === 1) { put(mx, y, z, 0); put(mx, y + 1, z, 0); }
  else if (doorDir === 2) { put(x1, y, mz, 0); put(x1, y + 1, mz, 0); }
  else { put(x, y, mz, 0); put(x, y + 1, mz, 0); }
  // 屋根
  gableRoof(put, x, y + hgt, z, x1, z1, roof, w >= d);
  // 中の あかりと 家具
  put(x + 1, y + 2, z + 1, ID.torch);
  if (rn() < 0.5) put(x1 - 1, y, z1 - 1, ID.bookshelf);
  if (rn() < 0.5) put(x + 1, y, z1 - 1, ID.table);
}

// --- 村 ----------------------------------------------------------------------
//
// まえは 井戸を かこむ 輪の 上に 家を ならべていた。
// それだと 半径が 近い 家どうしが かさなって、家の 中に 家が めりこんだ。
// いまは 17x17 の 区画を 3x3 に 切って、1区画に 1つだけ 建てる。
// 区画の あいだが そのまま 道に なるので、かさなりようが ない。

const VPLOT = 17;
const VRING = 2;                // まん中から いくつ ぶん 広げるか（2 → 5x5）

function drawVillage(s, put, box) {
  const y = s.y + 1;
  const cx = s.x, cz = s.z;
  const edge = s.r - 2;

  // 道は 区画の あいだに 通る。先に 敷いて、家に 上書きさせる。
  const offs = [];
  for (let k = -VRING - 1; k <= VRING; k++) offs.push(Math.round((k + 0.5) * VPLOT));
  offs.push(-edge, edge);
  const d0 = Math.max(-edge, box.x0 - cx), d1 = Math.min(edge, box.x1 - cx);
  const e0 = Math.max(-edge, box.z0 - cz), e1 = Math.min(edge, box.z1 - cz);
  for (const o of offs) {
    for (let w = -1; w <= 1; w++) {
      if (cz + o + w >= box.z0 && cz + o + w <= box.z1) {
        for (let d = d0; d <= d1; d++) put(cx + d, y - 1, cz + o + w, ID.gravel);
      }
      if (cx + o + w >= box.x0 && cx + o + w <= box.x1) {
        for (let e = e0; e <= e1; e++) put(cx + o + w, y - 1, cz + e, ID.gravel);
      }
    }
  }

  // まん中の 井戸
  if (boxHit(box, cx - 4, cz - 4, cx + 4, cz + 4)) {
    for (let z = cz - 4; z <= cz + 4; z++) {
      for (let x = cx - 4; x <= cx + 4; x++) put(x, y - 1, z, ID.stonebrick);
    }
    fillBox(put, cx - 2, y - 4, cz - 2, cx + 2, y - 1, cz + 2, ID.cobble);
    fillBox(put, cx - 1, y - 3, cz - 1, cx + 1, y - 1, cz + 1, ID.water);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      for (let k = 0; k <= 2; k++) put(cx + dx, y + k, cz + dz, ID.log);
    }
    fillBox(put, cx - 2, y + 3, cz - 2, cx + 2, y + 3, cz + 2, ID.planks);
    put(cx - 2, y + 2, cz, ID.torch);
    put(cx + 2, y + 2, cz, ID.torch);
  }

  // まわりの 区画に 家か はたけ
  for (let gz = -VRING; gz <= VRING; gz++) {
    for (let gx = -VRING; gx <= VRING; gx++) {
      if (!gx && !gz) continue;
      const px2 = cx + gx * VPLOT, pz = cz + gz * VPLOT;
      if (!boxHit(box, px2 - 8, pz - 8, px2 + 8, pz + 10)) continue;
      const seed = (s.seed ^ Math.imul(gx + 5, 374761393) ^ Math.imul(gz + 7, 668265263)) >>> 0;
      const rn = rng(seed);
      const roll = rn();
      if (roll < 0.22) { farm(put, box, px2 - 3, y - 1, pz - 2, seed); continue; }
      if (roll < 0.30) { well(put, box, px2, y, pz); continue; }
      const w = 6 + ((rn() * 4) | 0), d = 5 + ((rn() * 3) | 0);
      const jx = ((rn() * 3) | 0) - 1, jz = ((rn() * 3) | 0) - 1;
      // 入口は まん中（井戸）を むく
      const dir = Math.abs(gx) > Math.abs(gz) ? (gx > 0 ? 3 : 2) : (gz > 0 ? 1 : 0);
      house(put, box, px2 - (w >> 1) + jx, y, pz - (d >> 1) + jz, w, d, seed, dir);
    }
  }

  // 道の かどの あかり（区画の かどに 立てる）
  for (let gz = -VRING; gz <= VRING; gz++) {
    for (let gx = -VRING; gx <= VRING; gx++) {
      if (((gx + gz) & 1) !== 0) continue;
      const lx = cx + Math.round((gx + 0.5) * VPLOT) + 2;
      const lz = cz + Math.round((gz + 0.5) * VPLOT) + 2;
      if (!boxHit(box, lx, lz, lx, lz)) continue;
      for (let k = 0; k < 3; k++) put(lx, y + k, lz, ID.log);
      put(lx, y + 3, lz, ID.glowstone);
    }
  }
}

// 小さな 井戸（村の あちこちに）
function well(put, box, cx, y, cz) {
  if (!boxHit(box, cx - 2, cz - 2, cx + 2, cz + 2)) return;
  fillBox(put, cx - 2, y - 3, cz - 2, cx + 2, y - 1, cz + 2, ID.cobble);
  fillBox(put, cx - 1, y - 2, cz - 1, cx + 1, y - 1, cz + 1, ID.water);
  put(cx - 2, y, cz - 2, ID.log); put(cx + 2, y, cz + 2, ID.log);
}

function farm(put, box, x, y, z, seed) {
  if (!boxHit(box, x, z, x + 6, z + 4)) return;
  const rn = rng(seed);
  fillBox(put, x, y, z, x + 6, y, z + 4, ID.dirt);
  fillBox(put, x + 3, y, z, x + 3, y, z + 4, ID.water);   // まん中に 水みち
  for (let i = 0; i <= 6; i++) {
    for (let k = 0; k <= 4; k++) {
      if (i === 3) continue;
      const r = rn();
      if (r < 0.34) put(x + i, y + 1, z + k, ID.melon);
      else if (r < 0.66) put(x + i, y + 1, z + k, ID.pumpkin);
      else put(x + i, y + 1, z + k, ID.tallgrass);
    }
  }
}

// --- 街 ----------------------------------------------------------------------
//
// まっすぐな 通りで ますめに 区切って、区画ごとに ビルを 建てる。
// まん中は ひろばで、ふんすいと ベンチ。まわりを かべで かこむ。

const TOWN_MAT = ['brick', 'stonebrick', 'sandstone', 'planks', 'cobble',
                  'wool_white', 'wool_cyan', 'wool_yellow'];

function drawTown(s, put, box) {
  const y = s.y + 1;
  const r = s.r;
  const x0 = s.x - r, z0 = s.z - r, x1 = s.x + r, z1 = s.z + r;
  // 書くのは このチャンクに かかる ぶんだけ。
  // 街ぜんぶを まわすと 1チャンクあたり 何万回も からまわりする。
  const bx0 = Math.max(x0, box.x0), bx1 = Math.min(x1, box.x1);
  const bz0 = Math.max(z0, box.z0), bz1 = Math.min(z1, box.z1);

  // 地面（石だたみ）
  for (let z = bz0; z <= bz1; z++) {
    for (let x = bx0; x <= bx1; x++) put(x, y - 1, z, ID.stonebrick);
  }

  const GRID = 17;              // 通りの あいだ
  // 通り
  for (let gx = x0 + 4; gx <= x1; gx += GRID) {
    for (let w = 0; w < 5; w++) {
      if (gx + w < bx0 || gx + w > bx1) continue;
      for (let z = bz0; z <= bz1; z++) put(gx + w, y - 1, z, ID.cobble);
    }
  }
  for (let gz = z0 + 4; gz <= z1; gz += GRID) {
    for (let w = 0; w < 5; w++) {
      if (gz + w < bz0 || gz + w > bz1) continue;
      for (let x = bx0; x <= bx1; x++) put(x, y - 1, gz + w, ID.cobble);
    }
  }

  // 区画ごとに ビル
  let i = 0;
  for (let gz = z0 + 4; gz + GRID <= z1; gz += GRID) {
    for (let gx = x0 + 4; gx + GRID <= x1; gx += GRID) {
      i++;
      const bx = gx + 5, bz = gz + 5;
      const bw = GRID - 6, bd = GRID - 6;
      // まん中の あたりは ひろばに する
      if (Math.abs(bx + bw / 2 - s.x) < GRID && Math.abs(bz + bd / 2 - s.z) < GRID) continue;
      if (!boxHit(box, bx - 1, bz - 1, bx + bw, bz + bd)) continue;
      const seed = (s.seed ^ Math.imul(i, 2246822519)) >>> 0;
      const r2 = rng(seed);
      if (r2() < 0.14) { park(put, box, bx, y, bz, bw, bd, seed); continue; }
      building(put, box, bx, y, bz, bw, bd, seed);
    }
  }

  // まん中の ひろば
  plaza(put, box, s.x, y, s.z);

  // 街灯（通りの まじわる ところ）
  for (let gz = z0 + 4; gz <= z1; gz += GRID) {
    for (let gx = x0 + 4; gx <= x1; gx += GRID) {
      const lx = gx + 2, lz = gz + 2;
      if (!boxHit(box, lx, lz, lx, lz)) continue;
      if (Math.abs(lx - s.x) < 13 && Math.abs(lz - s.z) < 13) continue;
      for (let k = 0; k < 4; k++) put(lx, y + k, lz, ID.cobble);
      put(lx, y + 4, lz, ID.glowstone);
    }
  }

  // まわりの かべ。まん中の 4 方向に 門を あける。
  for (const z of [z0, z1]) {
    if (z < box.z0 || z > box.z1) continue;
    for (let x = bx0; x <= bx1; x++) {
      if (Math.abs(x - s.x) < 4) continue;           // ここが 門
      for (let k = 0; k < 4; k++) put(x, y + k, z, ID.stonebrick);
      if ((x & 1) === 0) put(x, y + 4, z, ID.stonebrick);
    }
  }
  for (const x of [x0, x1]) {
    if (x < box.x0 || x > box.x1) continue;
    for (let z = bz0; z <= bz1; z++) {
      if (Math.abs(z - s.z) < 4) continue;
      for (let k = 0; k < 4; k++) put(x, y + k, z, ID.stonebrick);
      if ((z & 1) === 0) put(x, y + 4, z, ID.stonebrick);
    }
  }
  // 門の わきの あかり
  for (const [gx2, gz2] of [[s.x - 5, z0], [s.x + 5, z0], [s.x - 5, z1], [s.x + 5, z1],
                            [x0, s.z - 5], [x0, s.z + 5], [x1, s.z - 5], [x1, s.z + 5]]) {
    if (boxHit(box, gx2, gz2, gx2, gz2)) {
      for (let k = 0; k < 5; k++) put(gx2, y + k, gz2, ID.stonebrick);
      put(gx2, y + 5, gz2, ID.glowstone);
    }
  }
}

// ビル。2〜4 かい だて。まどが たくさん ならぶ。
function building(put, box, x, y, z, w, d, seed) {
  const x1 = x + w - 1, z1 = z + d - 1;
  const rn = rng(seed);
  const floors = 2 + ((rn() * 3) | 0);
  const fh = 4;
  const top = y + floors * fh;
  if (!boxHit(box, x - 1, z - 1, x1 + 1, z1 + 1)) return;
  const mat = ID[TOWN_MAT[(rn() * TOWN_MAT.length) | 0]];
  const trim = rn() < 0.5 ? ID.stonebrick : ID.brick;

  fillBox(put, x, y - 1, z, x1, y - 1, z1, ID.planks);
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    shell(put, x, fy, z, x1, fy + fh, z1, mat);
    fillBox(put, x + 1, fy + 1, z + 1, x1 - 1, fy + fh - 1, z1 - 1, 0);
    // かいごとの おび
    for (let xx = x; xx <= x1; xx++) { put(xx, fy, z, trim); put(xx, fy, z1, trim); }
    for (let zz = z; zz <= z1; zz++) { put(x, fy, zz, trim); put(x1, fy, zz, trim); }
    // まど
    const wy = fy + 2;
    for (let xx = x + 2; xx <= x1 - 1; xx += 2) {
      put(xx, wy, z, ID.glass); put(xx, wy, z1, ID.glass);
      put(xx, wy + 1, z, ID.glass); put(xx, wy + 1, z1, ID.glass);
    }
    for (let zz = z + 2; zz <= z1 - 1; zz += 2) {
      put(x, wy, zz, ID.glass); put(x1, wy, zz, ID.glass);
      put(x, wy + 1, zz, ID.glass); put(x1, wy + 1, zz, ID.glass);
    }
    put(x + 1, fy + 1, z + 1, ID.torch);
  }
  // 入口
  const mx = x + (w >> 1);
  put(mx, y, z, 0); put(mx, y + 1, z, 0);
  put(mx - 1, y, z, 0); put(mx - 1, y + 1, z, 0);
  put(mx, y + 3, z, ID.glowstone);
  // おくじょうの てすり
  for (let xx = x; xx <= x1; xx++) { put(xx, top + 1, z, trim); put(xx, top + 1, z1, trim); }
  for (let zz = z; zz <= z1; zz++) { put(x, top + 1, zz, trim); put(x1, top + 1, zz, trim); }
}

// 小さな こうえん
function park(put, box, x, y, z, w, d, seed) {
  if (!boxHit(box, x - 1, z - 1, x + w, z + d)) return;
  const rn = rng(seed);
  fillBox(put, x, y - 1, z, x + w - 1, y - 1, z + d - 1, ID.grass);
  for (let i = 0; i < 14; i++) {
    const px2 = x + ((rn() * w) | 0), pz = z + ((rn() * d) | 0);
    const r = rn();
    put(px2, y, pz, r < 0.4 ? ID.flower_red : r < 0.8 ? ID.flower_yellow : ID.tallgrass);
  }
  // まん中に 木
  const tx = x + (w >> 1), tz = z + (d >> 1);
  for (let k = 0; k < 4; k++) put(tx, y + k, tz, ID.log);
  for (let dy = 3; dy <= 5; dy++) {
    const rad = dy === 5 ? 1 : 2;
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx === 0 && dz === 0 && dy < 5) continue;
        put(tx + dx, y + dy, tz + dz, ID.leaves);
      }
    }
  }
}

// まん中の ひろば。ふんすいと ベンチと あかり。
function plaza(put, box, cx, y, cz) {
  const r = 11;
  if (!boxHit(box, cx - r, cz - r, cx + r, cz + r)) return;
  for (let z = cz - r; z <= cz + r; z++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
      put(x, y - 1, z, d > 8 ? ID.cobble : ID.sandstone);
    }
  }
  // ふんすい
  fillBox(put, cx - 4, y, cz - 4, cx + 4, y, cz + 4, ID.stonebrick);
  fillBox(put, cx - 3, y, cz - 3, cx + 3, y + 1, cz + 3, 0);
  shell(put, cx - 4, y, cz - 4, cx + 4, y + 1, cz + 4, ID.stonebrick);
  fillBox(put, cx - 3, y, cz - 3, cx + 3, y, cz + 3, ID.water);
  for (let k = 1; k <= 4; k++) put(cx, y + k, cz, ID.stonebrick);
  put(cx, y + 5, cz, ID.glowstone);
  // ベンチと あかり
  for (const [dx, dz] of [[-7, 0], [7, 0], [0, -7], [0, 7]]) {
    for (let k = -2; k <= 2; k++) {
      put(cx + dx + (dz ? k : 0), y, cz + dz + (dx ? k : 0), ID.planks);
    }
  }
  for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
    for (let k = 0; k < 4; k++) put(cx + dx, y + k, cz + dz, ID.cobble);
    put(cx + dx, y + 4, cz + dz, ID.glowstone);
  }
}
