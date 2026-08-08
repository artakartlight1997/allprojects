// めいろ作りと、30 面ぶんの むずかしさ。

'use strict';

// たね から 決まる 乱数。同じ 面は 何回 やっても 同じ かたち。
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 面の むずかしさ ---------------------------------------------------------
//
// 30 面。だんだん めいろが 大きく、パパが ふえて、速くなる。
// ときどき「へんな 面」（くらやみ・つるつる・せまい）を まぜて、
// ただ 数字が 上がるだけに ならないように している。

const GIMMICK = {
  none: { name: '', desc: '' },
  dark: { name: 'まっくら！', desc: 'りなの まわりしか 見えない', col: '#8A7ED8' },
  ice: { name: 'つるつる！', desc: 'ゆかが すべる。止まりにくい', col: '#7FD0E8' },
  fast: { name: 'パパ ぜっこうちょう！', desc: 'パパが はじめから 速い', col: '#F08A6A' },
  many: { name: 'パパ だらけ！', desc: 'パパが 1人 ふえる', col: '#E86A9C' },
};

const STAGES = [];
(function buildStages() {
  for (let i = 0; i < 30; i++) {
    const n = i + 1;
    // めいろの 大きさ（ますの 数。かならず 奇数に する）
    const cw = 9 + 2 * Math.min(7, Math.floor(i / 2.6));
    const ch = 7 + 2 * Math.min(5, Math.floor(i / 3.4));
    // 何人に 追われるか
    let papas = 1;
    if (n >= 8) papas = 2;
    if (n >= 16) papas = 3;
    if (n >= 24) papas = 4;
    if (n === 30) papas = 5;
    // へんな 面
    let gim = 'none';
    if (n % 5 === 0 && n % 10 !== 0) gim = 'ice';
    if (n % 7 === 0) gim = 'dark';
    if (n % 10 === 0) gim = 'many';
    if (n >= 12 && n % 6 === 0) gim = 'fast';
    STAGES.push({
      n,
      cw, ch,
      time: 26 + Math.round(i * 0.9),          // にげきる 秒数
      papas,
      // パパは どこまで 速くなっても りなより おそい（走って にげられる）。
      // むずかしさは 人数と めいろの 大きさで つける。
      papaSpeed: 2.30 + i * 0.026,
      rinaSpeed: 4.05,
      shoes: Math.max(2, 5 - Math.floor(i / 9)),   // りなの アイテム
      glasses: 1 + Math.floor(i / 8),              // パパの アイテム
      loops: 0.16 + i * 0.004,                     // よけいに こわす かべの わりあい
      braid: 1 - i * 0.012,                        // ゆきどまりを つぶす わりあい
      gim,
      seed: 1000 + i * 7919,
    });
  }
})();

// --- めいろ ------------------------------------------------------------------
//
// ますを 1 つおきに 通路に する 作りかた。
// (2*c+1) の ますめに して、かべも ますとして 持つと あたり判定が かんたん。
//
// ふつうの めいろは ゆきどまりだらけで、追われる がわには つらすぎる。
// あとから かべを すこし こわして、ぐるぐる まわれる 道を 作っている。

function makeMaze(st) {
  const W = st.cw * 2 + 1, H = st.ch * 2 + 1;
  const g = new Uint8Array(W * H).fill(1);        // 1 = かべ
  const rn = rng(st.seed);
  const at = (x, y) => y * W + x;

  // ふかさ優先で ほりすすむ
  const stack = [[1, 1]];
  g[at(1, 1)] = 0;
  const D = [[2, 0], [-2, 0], [0, 2], [0, -2]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const cand = [];
    for (const [dx, dy] of D) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
      if (g[at(nx, ny)] === 0) continue;
      cand.push([nx, ny, dx, dy]);
    }
    if (!cand.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = cand[(rn() * cand.length) | 0];
    g[at(x + dx / 2, y + dy / 2)] = 0;
    g[at(nx, ny)] = 0;
    stack.push([nx, ny]);
  }

  // かべを すこし こわして ぐるぐる 道を 作る
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (g[at(x, y)] === 0) continue;
      if ((x % 2) === (y % 2)) continue;          // かどの 柱は のこす
      if (rn() < st.loops) g[at(x, y)] = 0;
    }
  }
  // ゆきどまりを つぶす。
  // ふつうの めいろは ゆきどまりだらけで、入ったら まず つかまる。
  // 出口が 1 つしか ない ますは、もう 1 つ あなを あけて 通りぬけ できるように する。
  const openN = (x, y) => {
    let n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (g[at(x + dx, y + dy)] === 0) n++;
    }
    return n;
  };
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (g[at(x, y)] !== 0 || openN(x, y) !== 1) continue;
      if (rn() > st.braid) continue;
      // こわせる かべ（そのむこうが めいろの 中）を さがす
      const cand = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const wx = x + dx, wy = y + dy, bx = x + dx * 2, by = y + dy * 2;
        if (bx < 1 || by < 1 || bx >= W - 1 || by >= H - 1) continue;
        if (g[at(wx, wy)] !== 1 || g[at(bx, by)] !== 0) continue;
        cand.push([wx, wy]);
      }
      if (!cand.length) continue;
      const [wx, wy] = cand[(rn() * cand.length) | 0];
      g[at(wx, wy)] = 0;
    }
  }

  // まん中に ひろばを 1 つ（にげ道が できる）
  const mx = (st.cw >> 1) * 2 + 1, my = (st.ch >> 1) * 2 + 1;
  for (let y = my - 1; y <= my + 1; y++) {
    for (let x = mx - 1; x <= mx + 1; x++) {
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[at(x, y)] = 0;
    }
  }
  return { w: W, h: H, g, at };
}

// 通れる ますを ぜんぶ 集める
function floorTiles(mz) {
  const out = [];
  for (let y = 1; y < mz.h - 1; y++) {
    for (let x = 1; x < mz.w - 1; x++) if (mz.g[mz.at(x, y)] === 0) out.push([x, y]);
  }
  return out;
}

// りなから の きょり を ぜんぶの ますに ひろげる（パパは これを 下って くる）
function flowField(mz, sx, sy, out) {
  const n = mz.w * mz.h;
  out.fill(65535);
  const q = new Int32Array(n);
  let head = 0, tail = 0;
  const s = mz.at(sx, sy);
  if (mz.g[s] !== 0) return out;
  out[s] = 0; q[tail++] = s;
  while (head < tail) {
    const c = q[head++];
    const cx = c % mz.w, cy = (c / mz.w) | 0;
    const d = out[c] + 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= mz.w || ny >= mz.h) continue;
      const i = ny * mz.w + nx;
      if (mz.g[i] !== 0 || out[i] <= d) continue;
      out[i] = d; q[tail++] = i;
    }
  }
  return out;
}
