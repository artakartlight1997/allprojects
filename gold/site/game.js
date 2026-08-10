// リナパパの おたからランナー
//
// ★ 1983年ごろ パソコン（MSX）でも 大人気だった「金貨を あつめて にげる」
//   アクションパズルが もと。ゆかに あなを ほって てきを 落として こえる。
//
// ★ そうさ（気もちよさの ために）
//     ・左がわ … スティック（よこ＝走る、上下＝はしご）
//     ・右がわ … 「◀ほる」「ほる▶」の 2つの ボタン。どっちを ほるか まよわない
//   ますの まん中へ 自分から そろえる ので、はしごに すっと 入れる。
//
// ★ 金貨を ぜんぶ とると、上へ のぼれる はしごが 出る。
//   いちばん 上まで のぼれば クリア。

'use strict';

const GAME_VER = 2;
const HUD = 26;
const COLS = 26, ROWS = 13;

const SPD = 6.2;             // 走る はやさ（ます／びょう）
const CLIMB = 5.2;
const FALL = 10.5;
const HOLE_T = 5.4;          // あなが もどるまで
const TRAP_T = 3.2;          // てきが あなから 出るまで

// --- めん の データ -----------------------------------------------------------------
//
//   ゆかは 3・6・9・12 の れつ。歩くのは 2・5・8・11 の れつ。
//   gaps=ゆかの きれめ  lad=はしご(たて)  rope=ロープ(よこ)  rock=こわせない いわ
//   exit=かくしはしご（金貨を ぜんぶ とると 出る）

const LV = [
  { name: '1めん',
    lad: [[4, 8, 11], [21, 5, 8], [12, 2, 5]],
    rope: [[10, 4, 11], [4, 12, 20]],
    gold: [[2, 11], [17, 11], [8, 8], [24, 8], [6, 5], [19, 5]],
    exit: [[12, 0, 2]],
    me: [1, 11], foes: [[23, 11]] },

  { name: '2めん',
    lad: [[3, 8, 11], [22, 8, 11], [8, 5, 8], [18, 5, 8], [13, 2, 5]],
    rope: [[10, 3, 9], [7, 8, 16], [4, 13, 19]],
    rock: [[12, 10, 15]],
    gold: [[1, 11], [13, 11], [25, 11], [5, 8], [20, 8], [10, 5], [16, 5]],
    exit: [[13, 0, 2]],
    me: [12, 11], foes: [[2, 8], [24, 11]] },

  { name: '3めん',
    lad: [[2, 8, 11], [24, 8, 11], [11, 5, 8], [16, 5, 8], [6, 2, 5], [20, 2, 5]],
    rope: [[10, 2, 9], [7, 11, 16], [4, 6, 12], [4, 14, 20]],
    rock: [[12, 13, 16], [9, 7, 10]],
    gold: [[5, 11], [19, 11], [2, 8], [14, 8], [23, 8], [9, 5], [17, 5], [12, 2]],
    exit: [[6, 0, 2]],
    me: [1, 11], foes: [[13, 11], [24, 5]] },

  { name: '4めん',
    lad: [[5, 8, 11], [20, 8, 11], [9, 5, 8], [15, 5, 8], [3, 2, 5], [23, 2, 5]],
    rope: [[10, 5, 12], [10, 14, 20], [7, 9, 15], [4, 3, 10], [4, 16, 23]],
    rock: [[12, 6, 9], [9, 16, 20], [6, 3, 6]],
    gold: [[7, 11], [17, 11], [1, 8], [12, 8], [25, 8], [6, 5], [18, 5], [11, 2], [21, 2]],
    exit: [[13, 0, 2]],
    me: [12, 11], foes: [[2, 11], [24, 11], [15, 5]] },

  { name: '5めん',
    lad: [[1, 5, 11], [24, 5, 11], [13, 8, 11], [7, 2, 8], [18, 2, 8]],
    rope: [[10, 1, 8], [10, 13, 20], [7, 7, 18], [4, 7, 18]],
    rock: [[12, 4, 8], [9, 10, 14], [6, 18, 22], [3, 8, 10]],
    gold: [[4, 11], [21, 11], [10, 11], [3, 8], [16, 8], [22, 8], [10, 5], [14, 5], [5, 2], [20, 2]],
    exit: [[13, 0, 2]],
    me: [12, 11], foes: [[2, 11], [23, 11], [7, 5]] },

  { name: '6めん',
    lad: [[13, 5, 11], [2, 2, 8], [23, 2, 8], [8, 8, 11], [18, 8, 11]],
    rope: [[10, 8, 13], [10, 13, 18], [7, 2, 13], [7, 13, 23], [4, 2, 10], [4, 15, 23]],
    rock: [[12, 3, 6], [12, 20, 23], [9, 7, 10], [9, 16, 19], [6, 11, 15]],
    gold: [[4, 11], [10, 11], [16, 11], [22, 11], [5, 8], [12, 8], [21, 8], [9, 5], [17, 5], [11, 2]],
    exit: [[13, 0, 2]],
    me: [13, 11], foes: [[1, 11], [25, 11], [8, 5], [18, 5]] },

  { name: '7めん',
    lad: [[6, 5, 11], [19, 5, 11], [12, 2, 8], [1, 8, 11], [24, 8, 11]],
    rope: [[10, 1, 6], [10, 19, 24], [7, 6, 12], [7, 12, 19], [4, 4, 12], [4, 12, 20]],
    rock: [[12, 8, 11], [12, 15, 18], [9, 2, 5], [9, 21, 24], [6, 8, 11], [6, 15, 18], [3, 10, 15]],
    gold: [[3, 11], [13, 11], [22, 11], [8, 8], [16, 8], [25, 8], [4, 5], [11, 5], [21, 5], [17, 2]],
    exit: [[12, 0, 2]],
    me: [12, 11], foes: [[1, 11], [24, 11], [6, 8], [19, 8]] },

  { name: 'さいご',
    lad: [[2, 5, 11], [23, 5, 11], [8, 2, 8], [17, 2, 8], [13, 8, 11]],
    rope: [[10, 2, 13], [10, 13, 23], [7, 2, 8], [7, 8, 17], [7, 17, 23], [4, 8, 17]],
    rock: [[12, 5, 8], [12, 18, 21], [9, 2, 4], [9, 12, 15], [9, 20, 22],
           [6, 3, 6], [6, 14, 17], [3, 9, 12]],
    gold: [[5, 11], [11, 11], [20, 11], [4, 8], [14, 8], [24, 8], [6, 5], [13, 5], [21, 5],
           [10, 2], [19, 2]],
    exit: [[13, 0, 2]],
    me: [13, 11], foes: [[1, 11], [25, 11], [8, 5], [17, 5]] },
];

const FOE_COL = ['#FF7A8A', '#C88AF0', '#8AB4FF', '#7ADCB0', '#FFC63A'];

const SAVE_KEY = 'gold.save.v1';
const save = { open: 1, clear: {}, coins: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(LV.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (typeof s.coins === 'number') save.coins = s.coins;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  map: [], me: null, foes: [], holes: [], left: 0, revealed: false,
  lives: 3, score: 0, over: false, won: false, dead: 0, ready: 0,
  msg: '', msgT: 0, pops: [],
};

// --- めん を つくる -----------------------------------------------------------------

function buildMap(spec) {
  const g = [];
  for (let j = 0; j < ROWS; j++) g.push(new Array(COLS).fill('.'));
  for (const j of [3, 6, 9, 12]) for (let i = 0; i < COLS; i++) g[j][i] = '#';
  for (const [j, a, b] of spec.gaps || []) for (let i = a; i <= b; i++) g[j][i] = '.';
  for (const [j, a, b] of spec.rock || []) for (let i = a; i <= b; i++) g[j][i] = '=';
  for (const [i, a, b] of spec.lad || []) for (let j = a; j <= b; j++) g[j][i] = 'H';
  for (const [j, a, b] of spec.rope || []) for (let i = a; i <= b; i++) if (g[j][i] === '.') g[j][i] = '-';
  for (const [i, a, b] of spec.exit || []) for (let j = a; j <= b; j++) g[j][i] = 'S';
  for (const [i, j] of spec.gold || []) g[j][i] = '$';
  return g;
}

function buildStage(n) {
  const spec = LV[n];
  G.map = buildMap(spec);
  G.left = 0;
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (G.map[j][i] === '$') G.left++;
  G.revealed = false;
  G.holes = []; G.pops = [];
  G.me = { x: spec.me[0], y: spec.me[1], face: 1, walk: 0 };
  G.foes = spec.foes.map((f, k) => ({
    x: f[0], y: f[1], home: [f[0], f[1]], face: 1, trap: 0, think: 0, dir: '',
    col: FOE_COL[k % FOE_COL.length], t: Math.random() * 3, dead: 0,
  }));
  G.dead = 0; G.ready = 1.2; G.won = false;
}

function startStage(n) {
  G.stage = n;
  G.lives = 3; G.score = 0; G.over = false;
  buildStage(n);
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n + 1); bgmHeat(0.35);
}

function say(s) { G.msg = s; G.msgT = 1.4; }

// --- ますの しらべ ------------------------------------------------------------------

function tl(i, j) {
  if (i < 0 || i >= COLS || j < 0 || j >= ROWS) return '#';
  const c = G.map[j][i];
  if (c === 'S') return G.revealed ? 'H' : '.';
  return c;
}
function solid(i, j) { const c = tl(i, j); return c === '#' || c === '='; }
function standing(x, y) {
  const cx = Math.round(x), cy = Math.round(y);
  const here = tl(cx, cy);
  if (here === 'H') return true;
  if (here === '-' && Math.abs(y - cy) < 0.3) return true;
  const b = tl(cx, cy + 1);
  return b === '#' || b === '=' || b === 'H';
}

// --- 動き --------------------------------------------------------------------------

function moveX(a, dx) {
  let x = a.x;
  const t = x + dx;
  const cy = Math.round(a.y);
  for (let k = 0; k < 6; k++) {
    if (dx > 0) {
      const border = Math.round(x) + 0.5;
      if (t < border) { a.x = t; return; }
      if (solid(Math.round(x) + 1, cy)) { a.x = border - 0.002; return; }
      x = border + 0.001;
    } else {
      const border = Math.round(x) - 0.5;
      if (t > border) { a.x = t; return; }
      if (solid(Math.round(x) - 1, cy)) { a.x = border + 0.002; return; }
      x = border - 0.001;
    }
  }
  a.x = t;
}
function moveUp(a, dy) {
  let y = a.y;
  const t = y - dy;
  const cx = Math.round(a.x);
  for (let k = 0; k < 6; k++) {
    const border = Math.round(y) - 0.5;
    if (t > border) { a.y = t; return; }
    if (solid(cx, Math.round(y) - 1)) { a.y = border + 0.002; return; }
    y = border - 0.001;
  }
  a.y = t;
}
function moveDown(a, dy) {
  let y = a.y;
  const t = y + dy;
  const cx = Math.round(a.x);
  for (let k = 0; k < 6; k++) {
    const border = Math.round(y) + 0.5;
    if (t < border) { a.y = t; return; }
    if (solid(cx, Math.round(y) + 1)) { a.y = border - 0.002; return; }
    y = border + 0.001;
  }
  a.y = t;
}
// 落ちる。ます線を こえる たびに「立てるか」を しらべる（すりぬけ ふせぎ）
function fallStep(a, dy) {
  let next = Math.floor(a.y) + 1;
  const t = a.y + dy;
  while (next <= t + 1e-9) {
    if (solid(Math.round(a.x), next)) { a.y = next - 1; return true; }
    if (standing(a.x, next)) { a.y = next; return true; }
    next += 1;
  }
  a.y = t;
  return false;
}

function align(a, to, sp, dt) {
  const d = to - a.x;
  if (Math.abs(d) < 1e-4) { a.x = to; return; }
  a.x += clamp(d, -sp * dt, sp * dt);
}

function stepActor(a, dir, dt, sp) {
  if (!standing(a.x, a.y)) {
    align(a, Math.round(a.x), sp, dt);
    fallStep(a, FALL * dt);
    a.falling = true;
    return;
  }
  a.falling = false;
  const cx = Math.round(a.x), cy = Math.round(a.y);
  const here = tl(cx, cy);
  if (dir === 'l' || dir === 'r') {
    a.face = dir === 'r' ? 1 : -1;
    const gap = cy - a.y;
    if (Math.abs(gap) > 1e-4) a.y += clamp(gap, -sp * 1.4 * dt, sp * 1.4 * dt);
    moveX(a, (dir === 'r' ? 1 : -1) * sp * dt);
    a.walk = (a.walk || 0) + dt;
  } else if (dir === 'u') {
    if (here === 'H' && !solid(cx, cy - 1)) {
      align(a, cx, sp * 1.4, dt);
      moveUp(a, CLIMB * dt);
      a.walk = (a.walk || 0) + dt;
    }
  } else if (dir === 'd') {
    if (!solid(cx, cy + 1)) {
      align(a, cx, sp * 1.4, dt);
      moveDown(a, CLIMB * dt);
      a.walk = (a.walk || 0) + dt;
    }
  }
}

// --- ほる --------------------------------------------------------------------------

// その むきが ほれるか どうか
function canDig(sign) {
  const me = G.me;
  if (me.falling) return false;
  const cx = Math.round(me.x), cy = Math.round(me.y);
  if (tl(cx, cy) === '-') return false;
  const i = cx + sign, j = cy + 1;
  if (i < 0 || i >= COLS || j >= ROWS) return false;
  if (G.map[j][i] !== '#') return false;
  if (solid(i, cy)) return false;
  return true;
}

function digAt(sign) {
  const me = G.me;
  if (me.falling) return;
  const cx = Math.round(me.x), cy = Math.round(me.y);
  if (tl(cx, cy) === '-') return;                 // ロープに ぶら下がって いる ときは ほれない
  const i = cx + sign, j = cy + 1;
  if (i < 0 || i >= COLS || j >= ROWS) return;
  if (G.map[j][i] !== '#') return;
  if (solid(i, cy)) return;                       // 上が つまって いたら ほれない
  G.map[j][i] = 'o';
  G.holes.push({ i: i, j: j, t: HOLE_T });
  G.pops.push({ x: i, y: j, t: 0.4, col: '#C8A070' });
  if (A.ctx) { const t = anow(); nz(t, 0.16, 0.14, 300, 2200); tone(t, 55, 0.10, 0.08, 'square', null, 43); }
}

// --- てきの かんがえ（BFS で 近みちを さがす） --------------------------------------

function bfsDir(sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return '';
  const seen = new Int8Array(COLS * ROWS);
  const first = new Array(COLS * ROWS).fill('');
  const q = [[sx, sy]];
  seen[sy * COLS + sx] = 1;
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    const f = first[y * COLS + x];
    const opts = [];
    if (!standing(x, y)) {
      opts.push([x, y + 1, 'd']);
    } else {
      if (!solid(x - 1, y)) opts.push([x - 1, y, 'l']);
      if (!solid(x + 1, y)) opts.push([x + 1, y, 'r']);
      if (tl(x, y) === 'H' && !solid(x, y - 1)) opts.push([x, y - 1, 'u']);
      if (!solid(x, y + 1)) opts.push([x, y + 1, 'd']);
    }
    for (const [nx, ny, d] of opts) {
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const k = ny * COLS + nx;
      if (seen[k]) continue;
      seen[k] = 1;
      first[k] = f || d;
      if (nx === tx && ny === ty) return first[k];
      q.push([nx, ny]);
    }
  }
  return '';
}

function foeThink(e) {
  const sx = Math.round(e.x), sy = Math.round(e.y);
  const tx = Math.round(G.me.x), ty = Math.round(G.me.y);
  let d = bfsDir(sx, sy, tx, ty);
  if (!d) {
    const opts = [];
    if (!solid(sx - 1, sy)) opts.push('l');
    if (!solid(sx + 1, sy)) opts.push('r');
    if (tl(sx, sy) === 'H') opts.push('u');
    d = opts.length ? opts[Math.floor(Math.random() * opts.length)] : '';
  }
  e.dir = d;
}

// --- ミス と クリア -----------------------------------------------------------------

function loseLife(why) {
  if (G.dead > 0 || G.won) return;
  G.dead = 1.4;
  G.lives--;
  bgmStop(); sfxDead();
  say(why);
}

function clearStage() {
  G.won = true;
  G.score += 800 + G.lives * 200;
  save.clear[G.stage] = true;
  if (G.stage + 1 >= save.open) save.open = Math.min(LV.length, G.stage + 2);
  storeSave();
  bgmStop(); sfxClear(true);
}

// --- まいコマ -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (let k = G.pops.length - 1; k >= 0; k--) {
    G.pops[k].t -= dt;
    if (G.pops[k].t <= 0) G.pops.splice(k, 1);
  }
  if (G.screen !== 'play' || G.over || G.won) return;

  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) {
      if (G.lives <= 0) { G.over = true; sfxOver(); storeSave(); }
      else { buildStage(G.stage); bgmStart(G.stage + 1); }
    }
    return;
  }
  if (G.ready > 0) { G.ready -= dt; return; }

  // そうさ
  let dir = '';
  if (IN.hold && (Math.abs(IN.ax) > 0.18 || Math.abs(IN.ay) > 0.18)) {
    dir = Math.abs(IN.ax) > Math.abs(IN.ay) ? (IN.ax > 0 ? 'r' : 'l') : (IN.ay > 0 ? 'd' : 'u');
  }
  if (!dir) dir = keyDir();
  stepActor(G.me, dir, dt, SPD);

  // ★ ほる むきは ボタンで はっきり わける。
  //   まえは ボタン 1つで「スティックの むき／むいて いる ほう」を ほって いた ので、
  //   おす まえに どっちが ほれるのか 見て わからなかった。
  if (KEYS.KeyZ && !G.kz) digAt(-1);
  if (KEYS.KeyX && !G.kx) digAt(1);
  if (KEYS.Space && !G.ks) digAt(G.me.face);
  G.ks = KEYS.Space; G.kz = KEYS.KeyZ; G.kx = KEYS.KeyX;

  // 金貨
  const mi = Math.round(G.me.x), mj = Math.round(G.me.y);
  if (G.map[mj][mi] === '$') {
    G.map[mj][mi] = '.';
    G.left--; G.score += 150; save.coins++;
    sfxGet();
    if (G.left === 0) {
      G.revealed = true;
      say('のぼれる はしごが 出た！ 上を めざそう');
      sfxPop();
    }
  }

  // あな
  for (let k = G.holes.length - 1; k >= 0; k--) {
    const h = G.holes[k];
    h.t -= dt;
    if (h.t > 0) continue;
    G.map[h.j][h.i] = '#';
    G.holes.splice(k, 1);
    // 中に いた ものは つぶれる
    for (const e of G.foes) {
      if (e.dead > 0) continue;
      if (Math.round(e.x) === h.i && Math.round(e.y) === h.j) {
        e.dead = 2.2; e.trap = 0; G.score += 250;
        G.pops.push({ x: e.x, y: e.y, t: 0.5, col: e.col });
        sfxPop();
      }
    }
    if (Math.round(G.me.x) === h.i && Math.round(G.me.y) === h.j) {
      loseLife('あなに とじこめられた！'); return;
    }
  }

  // てき
  for (const e of G.foes) {
    e.t += dt;
    if (e.dead > 0) {
      e.dead -= dt;
      if (e.dead <= 0) { e.x = e.home[0]; e.y = e.home[1]; e.trap = 0; e.dir = ''; }
      continue;
    }
    const ei = Math.round(e.x), ej = Math.round(e.y);
    if (tl(ei, ej) === 'o' && standing(e.x, e.y)) {
      // あなに はまった
      if (e.trap <= 0) e.trap = TRAP_T;
      e.trap -= dt;
      align(e, ei, 4, dt);
      if (e.trap <= 0 && !solid(ei, ej - 1)) { e.y = ej - 1; e.trap = 0; }
      continue;
    }
    e.trap = 0;
    e.think -= dt;
    if (e.think <= 0) { e.think = 0.45; foeThink(e); }
    stepActor(e, e.dir, dt, SPD * 0.60);
    if (e.dir === 'l') e.face = -1;
    if (e.dir === 'r') e.face = 1;
    if (Math.abs(e.x - G.me.x) < 0.62 && Math.abs(e.y - G.me.y) < 0.62) {
      loseLife('てきに つかまった！'); return;
    }
  }

  // クリア
  if (G.revealed && Math.round(G.me.y) <= 0) clearStage();
}

// --- 絵 -----------------------------------------------------------------------------

function box() {
  const top = HUD + 6, bot = 6;
  const c = Math.floor(Math.min((VH - top - bot) / ROWS, (VW - 20) / COLS));
  return { c: c, x: Math.round((VW - c * COLS) / 2), y: top + Math.round((VH - top - bot - c * ROWS) / 2) };
}
function gx(B, x) { return B.x + (x + 0.5) * B.c; }
function gy(B, y) { return B.y + (y + 0.5) * B.c; }

function drawCell(B, i, j, c) {
  const x = B.x + i * B.c, y = B.y + j * B.c, s = B.c;
  if (c === '#') {
    ctx.fillStyle = '#8A4A38';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#A85A44';
    for (let r = 0; r < 2; r++) {
      for (let k = 0; k < 2; k++) {
        const ox = (r % 2) * s * 0.25;
        ctx.fillRect(x + ox + k * s * 0.5 + 1, y + r * s * 0.5 + 1, s * 0.5 - 2, s * 0.5 - 2);
      }
    }
  } else if (c === '=') {
    ctx.fillStyle = '#4A5468';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#68748C';
    rr(x + 2, y + 2, s - 4, s * 0.36, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(x + 2, y + s * 0.6, s - 4, s * 0.3, 3); ctx.fill();
  } else if (c === 'o') {
    ctx.fillStyle = '#1A0E10';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = 'rgba(160,90,60,0.35)';
    ctx.fillRect(x, y, s, s * 0.16);
  } else if (c === 'H' || (c === 'S' && G.revealed)) {
    ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.22, y); ctx.lineTo(x + s * 0.22, y + s);
    ctx.moveTo(x + s * 0.78, y); ctx.lineTo(x + s * 0.78, y + s);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.6, s * 0.10);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.18, y + s * 0.3); ctx.lineTo(x + s * 0.82, y + s * 0.3);
    ctx.moveTo(x + s * 0.18, y + s * 0.75); ctx.lineTo(x + s * 0.82, y + s * 0.75);
    ctx.stroke();
  } else if (c === '-') {
    ctx.strokeStyle = '#D8C8A0'; ctx.lineWidth = Math.max(2, s * 0.10);
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.5 - s * 0.5 + s * 0.5); ctx.lineTo(x + s, y + s * 0.5);
    ctx.stroke();
  } else if (c === '$') {
    const bob = Math.sin(G.t * 4 + i * 0.7) * s * 0.06;
    ctx.fillStyle = '#FFD24A';
    circle(x + s / 2, y + s / 2 + bob, s * 0.30); ctx.fill();
    ctx.fillStyle = '#E8A020';
    circle(x + s / 2, y + s / 2 + bob, s * 0.30);
    ctx.lineWidth = Math.max(1, s * 0.05); ctx.strokeStyle = '#B87A10'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    circle(x + s * 0.40, y + s * 0.38 + bob, s * 0.08); ctx.fill();
  }
}

function drawPlay() {
  const B = box();
  bgGrad('#1A1430', '#07060F');
  // ばんめんの わく
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(B.x - 5, B.y - 5, B.c * COLS + 10, B.c * ROWS + 10, 8); ctx.fill();
  ctx.fillStyle = '#0E0A1A';
  ctx.fillRect(B.x, B.y, B.c * COLS, B.c * ROWS);

  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const c = G.map[j][i];
      drawCell(B, i, j, c === 'S' ? (G.revealed ? 'H' : '.') : c);
    }
  }

  // 出口が 出たら、いちばん 上に はたを 立てて わかりやすく
  if (G.revealed) {
    for (const [i] of LV[G.stage].exit) {
      const fx = gx(B, i), fy = gy(B, 0) - B.c * 0.5;
      ctx.fillStyle = '#FFD24A';
      ctx.beginPath();
      ctx.moveTo(fx + B.c * 0.1, fy);
      ctx.lineTo(fx + B.c * 0.95, fy + B.c * 0.22);
      ctx.lineTo(fx + B.c * 0.1, fy + B.c * 0.44);
      ctx.closePath(); ctx.fill();
      bigText('ゴール', fx + B.c * 1.9, fy + B.c * 0.24, Math.max(11, B.c * 0.46), '#FFD24A', null);
    }
  }

  // てき
  for (const e of G.foes) {
    if (e.dead > 0) continue;
    const a = e.trap > 0 ? 0.75 : 1;
    ctx.globalAlpha = a;
    drawBlob(gx(B, e.x), gy(B, e.y) - B.c * 0.08, B.c * 0.28, e.col, { t: e.t, look: e.face });
    ctx.globalAlpha = 1;
  }

  // パパ
  if (G.dead <= 0 || Math.sin(G.t * 24) > 0) {
    drawPapa(gx(B, G.me.x), gy(B, G.me.y) - B.c * 0.12, B.c * 0.52, {
      dir: G.me.face, walk: G.me.walk || 0, shirt: '#7ADCB0',
      face: G.dead > 0 ? 'oops' : 'happy',
    });
  }

  for (const p of G.pops) {
    const a = clamp(p.t / 0.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col || '#FFD24A';
    for (let k = 0; k < 6; k++) {
      const an = k / 6 * Math.PI * 2 + p.t;
      const r = (1 - a) * B.c * 0.8;
      circle(gx(B, p.x) + Math.cos(an) * r, gy(B, p.y) + Math.sin(an) * r, B.c * 0.09);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ★ どの ますを ほるのか、その場に 出して 見せる
  if (G.dead <= 0 && G.ready <= 0 && !G.won && !G.over) {
    const cx = Math.round(G.me.x), cy = Math.round(G.me.y);
    for (const sg of [-1, 1]) {
      if (!canDig(sg)) continue;
      const x = B.x + (cx + sg) * B.c, y = B.y + (cy + 1) * B.c;
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(G.t * 6);
      ctx.strokeStyle = sg < 0 ? '#8AD8F0' : '#FFD24A';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      rr(x + 2, y + 2, B.c - 4, B.c - 4, 4); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = sg < 0 ? '#8AD8F0' : '#FFD24A';
      bigText(sg < 0 ? '◀' : '▶', x + B.c / 2, y + B.c / 2, Math.max(11, B.c * 0.5), null, null);
    }
  }

  drawStick();
  drawDigButtons();
  drawHud();

  if (G.ready > 0) bigText(LV[G.stage].name + '　スタート！', VW / 2, VH * 0.42, 32, '#FFD24A');
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, HUD + 26, 21, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.won) {
    const last = G.stage >= LV.length - 1;
    drawResult(true, last ? 'ぜんぶ クリア！' : 'クリア！',
      ['スコア ' + G.score, last ? 'おめでとう！ たからは ぜんぶ 手に 入った' : 'つぎの めんへ'],
      last ? [{ label: 'タイトルへ', on: () => { G.screen = 'title'; } }]
           : [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
              { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
  if (G.over) {
    drawResult(false, 'ゲームオーバー',
      ['スコア ' + G.score, LV[G.stage].name + 'で ちからつきた'],
      [{ label: 'もういちど', on: () => startStage(G.stage) },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

// ほる ボタン（左を ほる／右を ほる）
function digBox(sg) {
  const r = Math.max(38, 62 / SC);
  const y = VH - r - 14;
  return sg < 0 ? { x: VW - r * 3 - 30, y: y, r: r } : { x: VW - r - 16, y: y, r: r };
}
function drawDigButtons() {
  if (G.won || G.over || G.dead > 0) return;
  for (const sg of [-1, 1]) {
    const b = digBox(sg);
    const ok = canDig(sg);
    const col = sg < 0 ? '#8AD8F0' : '#FFD24A';
    button(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, () => digAt(sg));
    ctx.save();
    ctx.globalAlpha = ok ? 0.95 : 0.35;
    circle(b.x, b.y, b.r);
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.lineWidth = Math.max(2, b.r * 0.08);
    ctx.strokeStyle = col; ctx.stroke();
    bigText(sg < 0 ? '◀ほる' : 'ほる▶', b.x, b.y, fitSize('◀ほる', b.r * 1.55, Math.round(b.r * 0.42)),
            col, null);
    ctx.restore();
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(LV[G.stage].name, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#E8E0FF';
  ctx.fillText('のこり きんか ' + G.left, 74, HUD / 2);
  ctx.fillText('スコア ' + G.score, 208, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('のこり ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#2A1E48', '#08060F');
  bigText('リナパパの', VW / 2, 40, 22, '#FFC0DC');
  bigText('おたからランナー', VW / 2, 78, fitSize('おたからランナー', VW * 0.6, 46), '#FFD24A');
  bigText('金貨を ぜんぶ あつめて、出て きた はしごで 上へ にげろ', VW / 2, 118, 16, '#DDE4FF', null);
  bigText('左で 動く／右下の 2つの ボタンで 左右の ゆかを ほる', VW / 2, 142, 15, '#B8C4E8', null);
  const y = stagePicker(LV.length, save.open, save.clear, LV.map((s) => s.name), 168,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('これまでに ' + save.coins + 'まい あつめた', VW / 2, VH - 18, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#2A1E48', '#08060F');
  bigText('あそびかた', VW / 2, 40, 28, '#FFD24A');
  const lines = [
    '① 左がわの スティックで 走る・はしごを のぼる・ロープを わたる',
    '② 右下の「◀ほる」「ほる▶」で、足もとの 左／右の ゆかに あなを ほる',
    '　 ほれる ますは その場に 光って 出る。ほれない ときは ボタンが うすく なる',
    '③ あなに てきを 落とすと しばらく 出て こない。上を 走って こえよう',
    '④ あなは しばらくすると もどる。中に いると つぶれるので 気をつけて',
    '⑤ 金貨を ぜんぶ とると はしごが 出る。いちばん 上まで のぼれば クリア',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 90 + i * 34, fitSize(s, VW * 0.88, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
