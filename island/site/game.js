// エイトくんの ぼうけん島
//
// ★ もとは 1980年代の「ぼうけん島」もの。むずかしめに して ある。
//   いちばんの あじは **たいりょくゲージが つねに へって いく** こと。
//   立ち止まって いても へるので、走りながら フルーツを 食べつづける。
//   これが あるだけで、ただの ジャンプゲームが「いそがしい」ゲームに なる。
//
// ★ たまごを ジャンプで たたくと 道具が 出る。
//   ・おの   … 前に なげる（アーチを えがいて とぶ）
//   ★ スケボー … 速く なる。1回 ぶつかっても スケボーが こわれるだけ
//   ・大フルーツ … たいりょくが どっと もどる
//
// ★ あたると 1発で アウト（スケボーが あれば こわれるだけ）。
//   水と トゲは さわったら アウト。そのぶん 目じるしは 大きく はっきり かく。
//
// ★ めんは その場で 作る。かたまり（チャンク）を つなぐ やりかたなので、
//   ジャンプで こえられない ところが できない。おなじ めんは いつも おなじ。

'use strict';

const GAME_VER = 1;
const HUD = 30;

// --- 大きさ と 物理 ------------------------------------------------------------------
const TILES_Y = 12;                  // 画面の たての マス数（★ 12 に して キャラを 大きく）
const PW = 0.70, PH = 0.92;          // エイトくんの 大きさ（マス）
const GRAV = 44, MAX_FALL = 26;
const JUMP_V = -16.4;                // ジャンプの 力（高さ 約3.1マス）
const RUN = 7.2, BOARD = 10.4;       // 走る 速さ／スケボーの 速さ
const AXE_V = 9.5, AXE_UP = -7.5;

// たいりょく
const LIFE_MAX = 100;
const LIFE_DRAIN = 5.2;              // 1びょうに へる ぶん
const FRUIT_HEAL = 9, BIGFRUIT_HEAL = 34;

const STAGES = [
  { name: 'はじまりの はま', theme: 0, len: 150, hard: 0 },
  { name: 'やしの もり', theme: 0, len: 165, hard: 1 },
  { name: 'いわばの さか', theme: 1, len: 175, hard: 1 },
  { name: 'ほのおの たに', theme: 1, len: 185, hard: 2 },
  { name: 'まんげつの みずうみ', theme: 2, len: 190, hard: 2 },
  { name: 'こおりの がけ', theme: 3, len: 195, hard: 3 },
  { name: 'きりの しつげん', theme: 2, len: 200, hard: 3 },
  { name: 'ようがんの どうくつ', theme: 1, len: 205, hard: 4 },
  { name: 'そらの いせき', theme: 4, len: 210, hard: 4 },
  { name: 'まおうの しろ', theme: 4, len: 215, hard: 5 },
];

const THEMES = [
  { sky: ['#5AC8F0', '#B8F0E8'], gnd: '#D8B070', gnd2: '#B08A50', deco: '#3EA85E' },
  { sky: ['#E08A4A', '#F0C88A'], gnd: '#A87A5A', gnd2: '#7A5440', deco: '#C85A3A' },
  { sky: ['#2A3A6E', '#5A7AB8'], gnd: '#4A6A4A', gnd2: '#2E4A32', deco: '#7AE0C0' },
  { sky: ['#A8D8F0', '#E8F4FF'], gnd: '#C8E0F0', gnd2: '#8AA8C8', deco: '#FFFFFF' },
  { sky: ['#2E1E4E', '#6A3A8A'], gnd: '#5A4A78', gnd2: '#3A2E52', deco: '#C8A8F0' },
];

const SAVE_KEY = 'island.save.v1';
const save = { clear: {}, best: {}, plays: 0, fruit: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.fruit)) save.fruit = s.fruit;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- さいころ（おなじ めんは いつも おなじ） ---------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- めんを 作る --------------------------------------------------------------------
//
// マス … '.'から '#'（つち） '^'（トゲ） 'W'（水） '='（うすい 足場）
//        'f'（フルーツ） 'F'（大フルーツ） 'e'（たまご） 'g'（ゴール）
// ★ あなは 3マスまで、段差は 2マスまでに して、ぜったいに 通れる ように する。

function buildStage(si) {
  const st = STAGES[si];
  const rnd = rng(0x1E17 + si * 7919);
  const H = TILES_Y;
  const W = st.len;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));

  const enemies = [];
  let gy = H - 3;                    // いまの じめんの 高さ
  let x = 0;

  const fill = (x0, x1, y0) => {
    for (let xx = x0; xx < x1; xx++) {
      for (let yy = y0; yy < H; yy++) g[yy][xx] = '#';
    }
  };

  // はじめの 平地（あんぜん）
  fill(0, 12, gy);
  x = 12;

  let chunkN = 0;
  while (x < W - 14) {
    const room = W - 14 - x;
    // ★ はじめの 2つは かならず ふつうの 道。いきなり 水や 足場だと
    //   走りだした とたんに 落ちて しまう（ロボットで 実さいに そうなった）。
    const kind = chunkN < 2 ? 6 : Math.floor(rnd() * 7);
    chunkN++;
    if (kind === 0 && room > 10) {
      // あな（水）
      const w = 2 + Math.floor(rnd() * Math.min(2, 1 + st.hard));
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      x += w;
      fill(x, x + 6, gy);
      if (rnd() < 0.5) g[gy - 1][x + 2] = 'f';
      x += 6;
    } else if (kind === 1 && room > 12) {
      // 段のぼり
      const up = 1 + Math.floor(rnd() * 2);
      gy = Math.max(4, gy - up);
      fill(x, x + 7, gy);
      if (rnd() < 0.6) g[gy - 1][x + 3] = 'f';
      x += 7;
    } else if (kind === 2 && room > 12) {
      // 段おり
      const dn = 1 + Math.floor(rnd() * 2);
      gy = Math.min(H - 3, gy + dn);
      fill(x, x + 7, gy);
      x += 7;
    } else if (kind === 3 && room > 14) {
      // トゲ。★ 3マスおきに ならべたら、1つ とびこえた さきが また トゲで
      //   ほぼ 通れなかった。いまは「1かたまり」に して、あいだを 5マス あける。
      fill(x, x + 13, gy);
      const w1 = 1 + Math.floor(rnd() * (st.hard >= 2 ? 2 : 1));
      for (let i = 0; i < w1; i++) g[gy - 1][x + 3 + i] = '^';
      if (st.hard >= 3 && rnd() < 0.6) {
        const w2 = 1 + Math.floor(rnd() * 2);
        for (let i = 0; i < w2; i++) g[gy - 1][x + 9 + i] = '^';
      }
      x += 13;
    } else if (kind === 4 && room > 14) {
      // うすい 足場の 道（下は 水）
      const w = 3 + Math.floor(rnd() * 2);
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      const py = gy - 2;
      for (let xx = x; xx < x + w; xx++) g[py][xx] = '=';
      if (rnd() < 0.6) g[py - 1][x + 1] = 'f';
      x += w;
      fill(x, x + 6, gy);
      x += 6;
    } else if (kind === 5 && room > 12) {
      // たまご（道具）
      fill(x, x + 8, gy);
      g[gy - 3][x + 3] = 'e';
      x += 8;
    } else {
      // ふつうの 道（フルーツを ならべる）
      const w = 8 + Math.floor(rnd() * 5);
      fill(x, x + w, gy);
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const fx = x + 1 + Math.floor(rnd() * (w - 2));
        if (g[gy - 1][fx] === '.') g[gy - 1][fx] = rnd() < 0.12 ? 'F' : 'f';
      }
      x += w;
    }
    // てきを おく（あぶない ばしょの そばかは あとで まとめて しらべる）
    if (rnd() < 0.42 + st.hard * 0.07) {
      const ex = x - 3;
      if (ex > 14 && g[gy] && g[gy][ex] === '#') {
        const types = st.hard >= 3 ? ['WALK', 'HOP', 'BAT', 'FIRE'] :
          st.hard >= 1 ? ['WALK', 'HOP', 'BAT'] : ['WALK', 'HOP'];
        const t = types[Math.floor(rnd() * types.length)];
        enemies.push({ kind: t, x: ex, y: gy - 1 });
      }
    }
  }

  // おわりの 平地 と ゴール
  gy = Math.min(H - 3, gy);
  fill(x, W, gy);
  // ★ ゴールは たてに 4マス。1マスだけだと ジャンプで とびこえて しまい、
  //   右はしで 止まったまま クリアできなく なった（ロボットで 実さいに そうなった）。
  for (let yy = gy - 4; yy <= gy - 1; yy++) g[yy][W - 6] = 'g';
  g[gy - 1][W - 10] = 'F';

  fixStage(g, H, W);

  // ★ 水や トゲの すぐ そばの てきは 消す。
  //   「あなの ふちに てき」だと、よけた ジャンプが そのまま 水に 落ちる。
  //   めんを ぜんぶ 作りおわって から しらべないと、あとから できた 水を
  //   見のがして しまう（さいしょは 生成中に しらべて いて、見のがして いた）。
  const safeFoes = enemies.filter((e) => {
    // ±5マス。3マスだと「てきを よけた ジャンプの 着地が トゲ」に なった。
    for (let k = -5; k <= 5; k++) {
      const cx2 = e.x + k;
      if (cx2 < 0 || cx2 >= W) continue;
      for (let yy = 0; yy < H; yy++) {
        const c2 = g[yy][cx2];
        if (c2 === 'W' || c2 === '^') return false;
      }
    }
    return true;
  });

  return { grid: g, w: W, h: H, enemies: safeFoes, gy: gy, st: st, si: si };
}

// ★ 作った あとに ぜんぶ 見なおして、「ぜったい 通れない ところ」を ならす。
//   ロボットで 走らせたら、めんに よっては おなじ ところで 何十回も
//   死んで いた（トゲの すぐ手前が 段差、水の 着地が 高すぎる など）。
//   ここで つぎの きまりを まもらせる。
//     ・あぶない ところ（水・トゲ）は よこ 3マスまで
//     ・その 手前 3マスは たいらで あんぜん（じょそうが とれる）
//     ・とんだ さきの 高さは 手前より 2マス下〜3マス上 まで
//   まもれない ところは 土で うめる／トゲを 消す。
function fixStage(g, H, W) {
  const surf = new Array(W).fill(-1);
  const scan = () => {
    for (let x = 0; x < W; x++) {
      surf[x] = -1;
      for (let y = 0; y < H; y++) {
        const c = g[y][x];
        if (c === '#' || c === '=' || c === 'W') { surf[x] = y; break; }
      }
    }
  };
  scan();
  const haz = (xx) => {
    if (xx < 0 || xx >= W) return false;
    const y = surf[xx];
    if (y < 0) return true;
    if (g[y][xx] === 'W') return true;
    if (y > 0 && g[y - 1][xx] === '^') return true;
    return false;
  };
  let x = 1;
  while (x < W - 1) {
    if (!haz(x)) { x++; continue; }
    let a = x, b = x;
    while (b + 1 < W - 1 && haz(b + 1)) b++;
    let ok = (b - a + 1) <= 3 && a >= 4;
    const h0 = surf[a - 1];
    if (ok) {
      for (let k = 1; k <= 3; k++) {
        const xx = a - k;
        if (xx < 1 || surf[xx] !== h0 || haz(xx)) { ok = false; break; }
      }
    }
    if (ok) {
      const h1 = surf[b + 1];
      if (h1 < 0 || h1 < h0 - 3 || h1 > h0 + 2) ok = false;
      // ★ とんだ さきの 4マスも あんぜんで ないと いけない。
      //   1つ こえた すぐ さきに また トゲが あると、着地が そこに なって
      //   ほとんど 通れなかった（ロボットで 何十回も 死んだ）。
      for (let k = 0; k <= 4 && ok; k++) if (haz(b + 1 + k)) ok = false;
    }
    if (!ok) {
      for (let xx = a; xx <= b; xx++) {
        const y = surf[xx];
        if (y < 0) continue;
        if (g[y][xx] === 'W') for (let yy = y; yy < H; yy++) g[yy][xx] = '#';
        if (y > 0 && g[y - 1][xx] === '^') g[y - 1][xx] = '.';
      }
      scan();
    }
    x = b + 1;
  }
}

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  si: 0, lv: null,
  p: null, cam: 0,
  enemies: [], axes: [], pops: [], parts: [],
  lives: 3, score: 0, fruit: 0, checkX: 3,
  over: false, win: false, dead: 0, clearT: 0,
  msg: '', msgT: 0, shake: 0,
};

function startStage(i) {
  audioStart();
  G.si = i;
  G.lv = buildStage(i);
  G.lives = 3; G.score = 0; G.fruit = 0;
  G.over = false; G.win = false;
  save.plays++; storeSave();
  G.screen = 'play';
  respawn(true);
}

function respawn(fresh) {
  const lv = G.lv;
  if (fresh) G.checkX = 3;
  // ★ 死ぬたびに 最初から だと ながすぎるので、とちゅうの 目じるしから やりなおす。
  //   目じるしは「じめんの 上を 35マス すすむ ごと」に かってに つく。
  // 出る ばしょ。つちが あって、その 上が あいて いる ところを さがす。
  let startX = fresh ? 3 : G.checkX;
  let gy2 = -1;
  for (let back = 0; back < 80 && gy2 < 0; back++) {
    const cx = Math.max(1, Math.floor(startX) - back);
    for (let y = 0; y < lv.h; y++) {
      if (lv.grid[y][cx] === '#') {
        if (y > 0 && lv.grid[y - 1][cx] === '.') { gy2 = y; startX = cx; }
        break;
      }
    }
  }
  if (gy2 < 0) { gy2 = lv.gy; startX = 3; }
  G.p = {
    x: startX, y: gy2 - PH - 0.1, vx: 0, vy: 0,
    onGround: false, face: 1, life: LIFE_MAX,
    axe: false, board: false, invT: fresh ? 0 : 1.4, walk: 0, jumpHold: false,
  };
  G.cam = 0;
  G.axes = []; G.pops = []; G.parts = [];
  G.enemies = lv.enemies.map((e) => ({
    kind: e.kind, x: e.x, y: e.y - 0.9, w: 0.86, h: 0.86,
    vx: e.kind === 'BAT' ? -2.6 : e.kind === 'HOP' ? -2.0 : -1.5,
    vy: 0, t: Math.random() * 3, alive: true, hx: e.x, fireT: 1 + Math.random(),
  }));
  G.dead = 0; G.clearT = 0;
  if (fresh) { G.msg = 'たいりょくが へって いく！ フルーツを 食べろ'; G.msgT = 2.4; }
}

// --- マスを しらべる ---------------------------------------------------------------

function at(tx, ty) {
  const lv = G.lv;
  if (ty < 0) return '.';
  if (tx < 0 || tx >= lv.w || ty >= lv.h) return ty >= lv.h ? 'W' : '.';
  return lv.grid[ty][tx];
}
function solid(tx, ty) { return at(tx, ty) === '#'; }
function oneWay(tx, ty) { return at(tx, ty) === '='; }
function deadly(c) { return c === 'W' || c === '^'; }

// --- おと ---------------------------------------------------------------------------

function sfxEat() { if (A.ctx) bleep(anow(), [79, 84], 0.04, 0.07, 0.10); }
function sfxBig() { if (A.ctx) bleep(anow(), [72, 76, 79, 84, 88], 0.05, 0.10, 0.12); }
function sfxHop() { if (A.ctx) tone(anow(), 70, 0.09, 0.09, 'square', null, 82); }
function sfxAxe() { if (A.ctx) { const t = anow(); tone(t, 88, 0.05, 0.08, 'square', null, 76); nz(t, 0.04, 0.05, 2000, 7000); } }
function sfxEgg() { if (A.ctx) { const t = anow(); nz(t, 0.07, 0.14, 800, 4000); bleep(t, [76, 83], 0.04, 0.06, 0.10); } }
function sfxKill() { if (A.ctx) { const t = anow(); nz(t, 0.08, 0.14, 1200, 6000); tone(t, 60, 0.08, 0.09, 'square', null, 48); } }
function sfxDie() { if (A.ctx) { const t = anow(); bleep(t, [72, 66, 60, 54, 48], 0.09, 0.15, 0.13); nz(t + 0.5, 0.3, 0.08, 120, 900); } }
function sfxGoal() { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14); kick(t, 0.7); } }
function sfxBoard() { if (A.ctx) { const t = anow(); nz(t, 0.3, 0.08, 400, 2500); bleep(t, [64, 71, 76], 0.05, 0.08, 0.10); } }

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.screen !== 'play') { IN.taps.length = 0; return; }

  if (G.clearT > 0) {
    G.clearT -= dt;
    if (G.clearT <= 0) {
      G.over = true; G.win = true;
      const k = 's' + G.si;
      save.clear[k] = true;
      if ((save.best[k] || 0) < G.score) save.best[k] = G.score;
      storeSave();
    }
    IN.taps.length = 0;
    return;
  }
  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) {
      if (G.lives <= 0) { G.over = true; G.win = false; sfxOver(); }
      else respawn(false);
    }
    IN.taps.length = 0;
    return;
  }
  if (G.over) { IN.taps.length = 0; return; }

  updatePlayer(dt);
  updateEnemies(dt);
  updateAxes(dt);
  for (const q of G.pops) q.t += dt;
  G.pops = G.pops.filter((q) => q.t < 0.9);
  for (const q of G.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 30 * dt; }
  G.parts = G.parts.filter((q) => q.t < 0.8);

  // カメラ
  const want = clamp(G.p.x - viewTilesX() * 0.38, 0, Math.max(0, G.lv.w - viewTilesX()));
  G.cam += (want - G.cam) * Math.min(1, dt * 8);

  IN.taps.length = 0;
}

function viewTilesX() { return VW / (VH / TILES_Y); }

function jumpPressed() {
  return IN.fireTap || KEYS.Space || KEYS.KeyZ || KEYS.ArrowUp;
}

function updatePlayer(dt) {
  const p = G.p;
  // たいりょく（つねに へる）
  p.life -= LIFE_DRAIN * dt;
  if (p.life <= 0) { die('たいりょくが きれた…'); return; }
  if (p.invT > 0) p.invT -= dt;

  // よこの うごき
  let dir = 0;
  if (IN.dir === 'l' || KEYS.ArrowLeft) dir = -1;
  if (IN.dir === 'r' || KEYS.ArrowRight) dir = 1;
  if (IN.hold && Math.abs(IN.ax) > 0.2) dir = IN.ax > 0 ? 1 : -1;
  const spd = p.board ? BOARD : RUN;
  if (p.board) {
    // スケボーは 止まれない。むきだけ かえられる。
    if (dir !== 0) p.face = dir;
    p.vx = p.face * spd;
  } else {
    p.vx = dir * spd;
    if (dir !== 0) p.face = dir;
  }
  if (Math.abs(p.vx) > 0.1) p.walk += dt * Math.abs(p.vx) * 0.9;

  // ジャンプ
  if (jumpPressed() && p.onGround) {
    p.vy = JUMP_V; p.onGround = false; p.jumpHold = true;
    sfxHop();
  }
  const holding = IN.fire || KEYS.Space || KEYS.KeyZ || KEYS.ArrowUp;
  if (!holding) p.jumpHold = false;
  // ボタンを はなすと はやく 落ちる（こまかい ジャンプが できる）
  const gv = (p.vy < 0 && !p.jumpHold) ? GRAV * 2.1 : GRAV;
  p.vy = Math.min(p.vy + gv * dt, MAX_FALL);

  moveX(dt);
  moveY(dt);

  // マスを ひろう
  pickTiles();

  // 目じるし（チェックポイント）
  // ★ 「水の上の うすい足場」の 上でも 目じるしが ついて しまい、
  //   やりなおすと 水の中に 出て きて 何百回も 死ぬ ことが あった。
  //   足の下が ほんとうの つち（#）の ときだけ つける。
  if (p.onGround && p.x > G.checkX + 35 &&
      at(Math.floor(p.x + PW / 2), Math.floor(p.y + PH + 0.1)) === '#') {
    G.checkX = Math.floor(p.x);
  }

  // 落ちた
  if (p.y > G.lv.h + 1) die('落ちて しまった…');
}

function moveX(dt) {
  const p = G.p;
  p.x += p.vx * dt;
  const y0 = Math.floor(p.y + 0.06), y1 = Math.floor(p.y + PH - 0.06);
  if (p.vx > 0) {
    const tx = Math.floor(p.x + PW);
    for (let ty = y0; ty <= y1; ty++) {
      if (solid(tx, ty)) { p.x = tx - PW - 0.001; if (p.board) breakBoard('かべに ぶつかった'); break; }
    }
  } else if (p.vx < 0) {
    const tx = Math.floor(p.x);
    for (let ty = y0; ty <= y1; ty++) {
      if (solid(tx, ty)) { p.x = tx + 1 + 0.001; if (p.board) breakBoard('かべに ぶつかった'); break; }
    }
  }
  p.x = clamp(p.x, 0, G.lv.w - PW);
}

function moveY(dt) {
  const p = G.p;
  const prevFeet = p.y + PH;
  p.y += p.vy * dt;
  const x0 = Math.floor(p.x + 0.06), x1 = Math.floor(p.x + PW - 0.06);
  if (p.vy >= 0) {
    const ty = Math.floor(p.y + PH);
    for (let tx = x0; tx <= x1; tx++) {
      const hardHit = solid(tx, ty);
      const softHit = oneWay(tx, ty) && prevFeet <= ty + 0.02;
      if (hardHit || softHit) {
        p.y = ty - PH - 0.001; p.vy = 0; p.onGround = true;
        return;
      }
    }
    p.onGround = false;
  } else {
    const ty = Math.floor(p.y);
    for (let tx = x0; tx <= x1; tx++) {
      if (solid(tx, ty)) { p.y = ty + 1 + 0.001; p.vy = 0; return; }
      if (at(tx, ty) === 'e') { hatchEgg(tx, ty); p.vy = 1; return; }
    }
  }
}

function pickTiles() {
  const p = G.p;
  const x0 = Math.floor(p.x + 0.1), x1 = Math.floor(p.x + PW - 0.1);
  const y0 = Math.floor(p.y + 0.1), y1 = Math.floor(p.y + PH - 0.1);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const c = at(tx, ty);
      if (c === 'f') {
        G.lv.grid[ty][tx] = '.';
        p.life = Math.min(LIFE_MAX, p.life + FRUIT_HEAL);
        G.score += 50; G.fruit++; save.fruit++;
        G.pops.push({ x: tx + 0.5, y: ty, text: '+' + FRUIT_HEAL, t: 0, col: '#8AF0B0' });
        sfxEat();
      } else if (c === 'F') {
        G.lv.grid[ty][tx] = '.';
        p.life = Math.min(LIFE_MAX, p.life + BIGFRUIT_HEAL);
        G.score += 300; G.fruit++; save.fruit++;
        G.pops.push({ x: tx + 0.5, y: ty, text: '+' + BIGFRUIT_HEAL, t: 0, col: '#FFD24A' });
        sfxBig();
      } else if (c === 'g') {
        G.clearT = 1.6;
        G.score += 1000 + Math.round(p.life) * 10;
        sfxGoal();
        return;
      } else if (deadly(c)) {
        die(c === 'W' ? '水に おちた…' : 'トゲに あたった…');
        return;
      }
    }
  }
}

function hatchEgg(tx, ty) {
  const r = Math.random();
  G.lv.grid[ty][tx] = '.';
  sfxEgg();
  if (r < 0.42) {
    G.p.axe = true;
    G.pops.push({ x: tx + 0.5, y: ty, text: 'おの！', t: 0, col: '#FFD24A' });
  } else if (r < 0.72) {
    G.p.board = true;
    G.pops.push({ x: tx + 0.5, y: ty, text: 'スケボー！', t: 0, col: '#8AD8F0' });
    sfxBoard();
  } else {
    G.p.life = Math.min(LIFE_MAX, G.p.life + BIGFRUIT_HEAL);
    G.pops.push({ x: tx + 0.5, y: ty, text: '大フルーツ！', t: 0, col: '#FF8FBB' });
    sfxBig();
  }
}

function breakBoard(why) {
  const p = G.p;
  p.board = false; p.invT = 1.0;
  G.pops.push({ x: p.x, y: p.y, text: why, t: 0, col: '#FFB0C8' });
  G.shake = 0.2;
  for (let i = 0; i < 8; i++) {
    G.parts.push({ x: p.x + PW / 2, y: p.y + PH, vx: (Math.random() - 0.5) * 8,
                   vy: -Math.random() * 8, t: 0, col: '#8AD8F0' });
  }
}

function throwAxe() {
  const p = G.p;
  if (!p.axe || G.dead > 0 || G.clearT > 0) return;
  if (G.axes.length >= 2) return;
  G.axes.push({ x: p.x + PW / 2, y: p.y + PH * 0.4, vx: p.face * AXE_V, vy: AXE_UP, t: 0 });
  sfxAxe();
}

function updateAxes(dt) {
  for (const a of G.axes) {
    a.t += dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.vy += 26 * dt;
  }
  G.axes = G.axes.filter((a) => a.t < 1.6 && a.y < G.lv.h + 2 &&
    a.x > G.cam - 2 && a.x < G.cam + viewTilesX() + 3);
}

function updateEnemies(dt) {
  const p = G.p;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.x < G.cam - 6 || e.x > G.cam + viewTilesX() + 8) continue;
    e.t += dt;
    if (e.kind === 'BAT') {
      e.x += e.vx * dt;
      e.y += Math.sin(e.t * 3.4) * 2.4 * dt;
      if (e.x < e.hx - 7) { e.x = e.hx - 7; e.vx = Math.abs(e.vx); }
      if (e.x > e.hx + 7) { e.x = e.hx + 7; e.vx = -Math.abs(e.vx); }
    } else if (e.kind === 'FIRE') {
      // うごかない。ときどき 火の たまを 出す
      e.fireT -= dt;
      if (e.fireT <= 0) {
        e.fireT = 1.6 + Math.random() * 1.2;
        G.axes.push({ x: e.x + 0.4, y: e.y, vx: 0, vy: -11, t: 0, foe: true });
      }
    } else {
      // つち の 上を あるく（HOP は ときどき とぶ）
      if (e.kind === 'HOP' && e.onGround && e.t % 1.4 < dt) e.vy = -11;
      e.vy = Math.min(e.vy + GRAV * dt, MAX_FALL);
      e.y += e.vy * dt;
      const fx0 = Math.floor(e.x + 0.1), fx1 = Math.floor(e.x + e.w - 0.1);
      const fy = Math.floor(e.y + e.h);
      let land = false;
      for (let tx = fx0; tx <= fx1; tx++) if (solid(tx, fy) || oneWay(tx, fy)) land = true;
      if (land && e.vy >= 0) { e.y = fy - e.h - 0.001; e.vy = 0; e.onGround = true; }
      else e.onGround = false;
      e.x += e.vx * dt;
      // かべ と はしっこで むきを かえる
      const nx = e.vx > 0 ? Math.floor(e.x + e.w) : Math.floor(e.x);
      const my = Math.floor(e.y + e.h * 0.5);
      const ahead = Math.floor(e.x + (e.vx > 0 ? e.w + 0.2 : -0.2));
      const below = Math.floor(e.y + e.h + 0.2);
      if (solid(nx, my) || !(solid(ahead, below) || oneWay(ahead, below)) ||
          deadly(at(ahead, below))) {
        e.vx = -e.vx;
        e.x = clamp(e.x, 0, G.lv.w - e.w);
      }
    }

    // エイトくんに あたった か
    if (p.invT <= 0 && overlap(p.x, p.y, PW, PH, e.x, e.y, e.w, e.h)) {
      // 上から ふんだら たおせる（HOP と WALK だけ）
      if (p.vy > 2 && p.y + PH < e.y + e.h * 0.6 && e.kind !== 'FIRE') {
        killEnemy(e); p.vy = JUMP_V * 0.62;
      } else if (p.board) breakBoard('スケボーが こわれた');
      else { die('てきに あたった…'); return; }
    }

    // おのが あたった か
    for (const a of G.axes) {
      if (a.foe) continue;
      if (overlap(a.x - 0.25, a.y - 0.25, 0.5, 0.5, e.x, e.y, e.w, e.h)) {
        killEnemy(e); a.t = 9;
      }
    }
  }
  // てきの 火の たま
  for (const a of G.axes) {
    if (!a.foe) continue;
    if (p.invT <= 0 && overlap(a.x - 0.2, a.y - 0.2, 0.4, 0.4, p.x, p.y, PW, PH)) {
      if (p.board) { breakBoard('火に あたった'); a.t = 9; }
      else { die('火に あたった…'); return; }
    }
  }
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function killEnemy(e) {
  e.alive = false;
  G.score += 200;
  G.pops.push({ x: e.x + 0.4, y: e.y, text: '200', t: 0, col: '#FFF6C8' });
  for (let i = 0; i < 6; i++) {
    G.parts.push({ x: e.x + 0.4, y: e.y + 0.4, vx: (Math.random() - 0.5) * 7,
                   vy: -Math.random() * 7, t: 0, col: '#FFD24A' });
  }
  sfxKill();
}

function die(why) {
  if (G.dead > 0) return;
  G.lives--;
  G.dead = 1.3;
  G.msg = why; G.msgT = 1.6;
  G.shake = 0.35;
  sfxDie();
}

// キーボード
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyX' || e.code === 'KeyC') { audioStart(); throwAxe(); }
});

// --- え ------------------------------------------------------------------------------

function ts() { return VH / TILES_Y; }              // 1マスの 大きさ（px）
function sx(tx) { return (tx - G.cam) * ts(); }
function sy(ty) { return ty * ts(); }

function drawBg() {
  const th = THEMES[G.lv ? G.lv.st.theme : 0];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // とおくの やま
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 10; i++) {
    const bx = -((G.cam * 0.25) % 9) * ts() + i * 9 * ts();
    ctx.beginPath();
    ctx.moveTo(bx - 3.2 * ts(), VH * 0.78);
    ctx.lineTo(bx, VH * 0.50);
    ctx.lineTo(bx + 3.2 * ts(), VH * 0.78);
    ctx.closePath(); ctx.fill();
  }
  // 雲
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 7.3 - G.cam * 0.12) % 26 + 26) % 26 * ts() - 2 * ts();
    const cy = VH * (0.10 + (i % 3) * 0.07);
    circle(cx, cy, ts() * 0.5); ctx.fill();
    circle(cx + ts() * 0.5, cy - ts() * 0.16, ts() * 0.4); ctx.fill();
    circle(cx + ts() * 1.0, cy, ts() * 0.44); ctx.fill();
  }
}

function drawTiles() {
  const th = THEMES[G.lv.st.theme];
  const s = ts();
  const x0 = Math.max(0, Math.floor(G.cam) - 1);
  const x1 = Math.min(G.lv.w - 1, Math.ceil(G.cam + viewTilesX()) + 1);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = 0; ty < G.lv.h; ty++) {
      const c = G.lv.grid[ty][tx];
      if (c === '.') continue;
      const X = sx(tx), Y = sy(ty);
      if (c === '#') {
        ctx.fillStyle = solid(tx, ty - 1) ? th.gnd2 : th.gnd;
        ctx.fillRect(X, Y, s + 1, s + 1);
        if (!solid(tx, ty - 1)) {
          ctx.fillStyle = th.deco;
          ctx.fillRect(X, Y, s + 1, s * 0.22);
        }
      } else if (c === '=') {
        ctx.fillStyle = '#C8A060';
        rr(X + 1, Y + s * 0.3, s - 2, s * 0.30, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        rr(X + 1, Y + s * 0.3, s - 2, s * 0.10, 3); ctx.fill();
      } else if (c === 'W') {
        ctx.fillStyle = '#2E6AC8';
        ctx.fillRect(X, Y, s + 1, s + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        const w = Math.sin(G.t * 3 + tx) * s * 0.08;
        ctx.fillRect(X, Y + s * 0.12 + w, s + 1, s * 0.12);
      } else if (c === '^') {
        ctx.fillStyle = '#E0E4EC';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(X + s * (0.1 + i * 0.3), Y + s);
          ctx.lineTo(X + s * (0.25 + i * 0.3), Y + s * 0.18);
          ctx.lineTo(X + s * (0.4 + i * 0.3), Y + s);
          ctx.closePath(); ctx.fill();
        }
      } else if (c === 'f' || c === 'F') {
        drawFruit(X + s / 2, Y + s / 2, c === 'F' ? s * 0.46 : s * 0.30, tx);
      } else if (c === 'e') {
        drawEgg(X + s / 2, Y + s / 2, s * 0.40);
      } else if (c === 'g') {
        drawGoal(X + s / 2, Y + s);
      }
    }
  }
}

function drawFruit(x, y, r, seed) {
  const kind = (seed || 0) % 3;
  const cols = ['#FF5A5A', '#FFC44A', '#B06AE0'];
  ctx.fillStyle = cols[kind];
  circle(x, y, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  circle(x - r * 0.3, y - r * 0.3, r * 0.28); ctx.fill();
  ctx.strokeStyle = '#3E8A4E'; ctx.lineWidth = Math.max(2, r * 0.18);
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.4, y - r * 1.5); ctx.stroke();
}

function drawEgg(x, y, r) {
  const b = Math.sin(G.t * 5) * r * 0.06;
  ctx.fillStyle = '#FFF4E0';
  ctx.beginPath();
  ctx.ellipse(x, y + b, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E8A0C0';
  for (let i = 0; i < 3; i++) circle(x - r * 0.3 + i * r * 0.3, y + b + r * 0.2, r * 0.14);
  ctx.fill();
  ctx.strokeStyle = '#C8A060'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + b, r * 0.8, r, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawGoal(x, y) {
  const s = ts();
  ctx.fillStyle = '#8A5A3A';
  ctx.fillRect(x - s * 0.06, y - s * 2.6, s * 0.12, s * 2.6);
  const wave = Math.sin(G.t * 4) * s * 0.1;
  ctx.fillStyle = '#FFD24A';
  ctx.beginPath();
  ctx.moveTo(x, y - s * 2.6);
  ctx.lineTo(x + s * 1.2 + wave, y - s * 2.2);
  ctx.lineTo(x, y - s * 1.7);
  ctx.closePath(); ctx.fill();
  bigText('ゴール', x, y - s * 3.0, 14, '#FFF6C8');
}

// エイトくん。ぼうしを かぶった 小学生。
function drawEito(x, y, s, face, walk, board, air, hurt) {
  const bob = board ? 0 : Math.abs(Math.sin(walk * 3)) * s * 0.05;
  const yy = y - bob;
  const leg = air ? 0.5 : Math.sin(walk * 3) * 0.5;
  ctx.save();
  if (hurt) { ctx.globalAlpha = 0.5 + Math.sin(G.t * 40) * 0.4; }
  // スケボー
  if (board) {
    ctx.fillStyle = '#8AD8F0';
    rr(x - s * 0.52, yy + s * 0.86, s * 1.04, s * 0.12, s * 0.06); ctx.fill();
    ctx.fillStyle = '#2A2A32';
    circle(x - s * 0.32, yy + s * 1.02, s * 0.10); ctx.fill();
    circle(x + s * 0.32, yy + s * 1.02, s * 0.10); ctx.fill();
  }
  // あし
  ctx.strokeStyle = '#3A4A6A'; ctx.lineWidth = s * 0.17; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, yy + s * 0.44);
  ctx.lineTo(x - s * 0.12 + leg * s * 0.3, yy + s * 0.84);
  ctx.moveTo(x + s * 0.12, yy + s * 0.44);
  ctx.lineTo(x + s * 0.12 - leg * s * 0.3, yy + s * 0.84);
  ctx.stroke();
  // からだ
  ctx.fillStyle = '#3EC08A';
  rr(x - s * 0.26, yy + s * 0.06, s * 0.52, s * 0.44, s * 0.13); ctx.fill();
  // うで
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, yy + s * 0.18);
  ctx.lineTo(x - s * 0.22 - face * s * 0.1 - leg * s * 0.2, yy + s * 0.46);
  ctx.moveTo(x + s * 0.22, yy + s * 0.18);
  ctx.lineTo(x + s * 0.22 + face * s * 0.1 + leg * s * 0.2, yy + s * 0.46);
  ctx.stroke();
  // あたま
  const hy = yy - s * 0.14;
  ctx.fillStyle = '#F6CDA8';
  circle(x, hy, s * 0.24); ctx.fill();
  // ぼうし（キャップ）
  ctx.fillStyle = '#E8506A';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.03, s * 0.25, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.fillRect(x + (face > 0 ? 0 : -s * 0.34), hy - s * 0.06, s * 0.34, s * 0.06);
  // 目
  ctx.fillStyle = '#2A2028';
  circle(x + face * s * 0.09, hy + s * 0.03, s * 0.04); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  circle(x + face * s * 0.16, hy + s * 0.12, s * 0.05); ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  const s = ts();
  const X = sx(e.x) + e.w * s / 2, Y = sy(e.y) + e.h * s / 2;
  const r = e.w * s * 0.5;
  if (e.kind === 'BAT') {
    ctx.fillStyle = '#6A4A8A';
    const f = Math.sin(e.t * 14) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(X - r * 1.5, Y - f); ctx.lineTo(X - r * 0.6, Y + r * 0.4);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(X + r * 1.5, Y - f); ctx.lineTo(X + r * 0.6, Y + r * 0.4);
    ctx.closePath(); ctx.fill();
    circle(X, Y, r * 0.6); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    circle(X - r * 0.22, Y - r * 0.1, r * 0.13); ctx.fill();
    circle(X + r * 0.22, Y - r * 0.1, r * 0.13); ctx.fill();
  } else if (e.kind === 'FIRE') {
    ctx.fillStyle = '#8A3A2A';
    rr(X - r, Y + r * 0.2, r * 2, r * 0.8, r * 0.2); ctx.fill();
    const f = 0.8 + Math.sin(e.t * 9) * 0.2;
    ctx.fillStyle = '#FF7A3A';
    ctx.beginPath();
    ctx.moveTo(X - r * 0.5, Y + r * 0.2);
    ctx.lineTo(X, Y - r * 1.1 * f);
    ctx.lineTo(X + r * 0.5, Y + r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath();
    ctx.moveTo(X - r * 0.25, Y + r * 0.2);
    ctx.lineTo(X, Y - r * 0.6 * f);
    ctx.lineTo(X + r * 0.25, Y + r * 0.2);
    ctx.closePath(); ctx.fill();
  } else {
    // WALK … かたつむり／HOP … かえる
    const col = e.kind === 'HOP' ? '#7ADC80' : '#C87A4A';
    const hop = e.kind === 'HOP' && !e.onGround;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(X, Y + r * 0.1, r, r * (hop ? 0.75 : 0.9), 0, 0, Math.PI * 2); ctx.fill();
    if (e.kind === 'WALK') {
      ctx.strokeStyle = '#8A5230'; ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.arc(X + r * 0.1, Y, r * 0.5, 0, Math.PI * 1.7); ctx.stroke();
    }
    ctx.fillStyle = '#FFF';
    const d = e.vx > 0 ? 1 : -1;
    circle(X + d * r * 0.35, Y - r * 0.3, r * 0.24); ctx.fill();
    ctx.fillStyle = '#2A2028';
    circle(X + d * r * 0.40, Y - r * 0.3, r * 0.12); ctx.fill();
  }
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(G.t * 60) * 6 * G.shake, 0);
  drawBg();
  drawTiles();

  const s = ts();
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.x < G.cam - 2 || e.x > G.cam + viewTilesX() + 2) continue;
    drawEnemy(e);
  }

  // おの と 火の たま
  for (const a of G.axes) {
    const X = sx(a.x), Y = sy(a.y);
    if (a.foe) {
      ctx.fillStyle = '#FF7A3A';
      circle(X, Y, s * 0.22); ctx.fill();
      ctx.fillStyle = '#FFD24A';
      circle(X, Y, s * 0.12); ctx.fill();
    } else {
      ctx.save();
      ctx.translate(X, Y); ctx.rotate(a.t * 18);
      ctx.fillStyle = '#8A5A3A';
      ctx.fillRect(-s * 0.05, -s * 0.24, s * 0.10, s * 0.48);
      ctx.fillStyle = '#D8DCE8';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.24); ctx.lineTo(s * 0.28, -s * 0.10);
      ctx.lineTo(0, s * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  const p = G.p;
  if (G.dead > 0) {
    // やられた ときは くるくる 落ちる
    ctx.save();
    ctx.translate(sx(p.x + PW / 2), sy(p.y) + (1.3 - G.dead) * 90);
    ctx.rotate((1.3 - G.dead) * 8);
    drawEito(0, -s * 0.4, s * 1.05, p.face, 0, false, true, false);
    ctx.restore();
  } else if (G.clearT > 0) {
    drawEito(sx(p.x + PW / 2), sy(p.y), s * 1.05, 1, G.t * 8, false, false, false);
  } else {
    drawEito(sx(p.x + PW / 2), sy(p.y), s * 1.05, p.face, p.walk, p.board,
             !p.onGround, p.invT > 0);
  }

  // つぶつぶ と 文字
  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.8);
    ctx.fillStyle = q.col;
    circle(sx(q.x), sy(q.y), s * 0.09); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9);
    bigText(q.text, sx(q.x), sy(q.y) - q.t * 30, 16, q.col);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  drawHud();
  drawControls();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.30, 24, '#FFF6C8');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'ゲームオーバー',
      ['スコア ' + G.score + '　たべた フルーツ ' + G.fruit,
       G.win ? G.lv.st.name + ' を こえた！' : 'のこり ' + Math.max(0, G.lives) + ' で おわり'],
      [{ label: 'もういちど', on: () => startStage(G.si) },
       G.win && G.si + 1 < STAGES.length
         ? { label: 'つぎの しま', on: () => startStage(G.si + 1), col: '#8AF0B0' }
         : { label: 'しまを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawControls() {
  drawStick();
  drawFire('ジャンプ', '#FFD24A');
  // おのの ボタン。★ ジャンプの まるに かさなって いたので、
  //   ジャンプの 大きさから ばしょを 計算して 左どなりに おく。
  const rf = Math.max(34, 58 / SC);
  const r = Math.max(30, 46 / SC);
  const cxb = VW - 82 - rf - r - 26;
  const b = { x: cxb - r, y: VH * 0.70 - r, w: r * 2, h: r * 2 };
  button(b.x, b.y, b.w, b.h, throwAxe);
  ctx.save();
  ctx.globalAlpha = G.p && G.p.axe ? 0.95 : 0.30;
  circle(b.x + r, b.y + r, r);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
  ctx.strokeStyle = '#8AD8F0'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke();
  bigText('おの', b.x + r, b.y + r, Math.round(r * 0.5), '#CFF0FF', null);
  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.fillText('のこり ' + G.lives, 120, HUD / 2);

  // たいりょくゲージ（いちばん 大事なので 大きく）
  const gw = Math.min(280, VW * 0.30), gx = 200, gy = HUD / 2 - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(gx, gy, gw, 16, 8); ctx.fill();
  const k = clamp(G.p ? G.p.life / LIFE_MAX : 1, 0, 1);
  ctx.fillStyle = k > 0.5 ? '#7AE8A0' : k > 0.22 ? '#FFD24A' : '#FF6F8A';
  rr(gx + 2, gy + 2, (gw - 4) * k, 12, 6); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('たいりょく', gx + 6, HUD / 2);
  if (k < 0.22) {
    ctx.globalAlpha = 0.5 + Math.sin(G.t * 12) * 0.5;
    ctx.fillStyle = '#FF6F8A';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('あぶない！ フルーツ！', gx + gw + 10, HUD / 2);
    ctx.globalAlpha = 1;
  }

  // すすんだ ぐあい
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#CFE8FF';
  const prog = Math.round(clamp(G.p ? G.p.x / (G.lv.w - 8) : 0, 0, 1) * 100);
  ctx.fillText(G.lv.st.name + '  ' + prog + '%', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  G.lv = null;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#5AC8F0'); g.addColorStop(1, '#B8F0E8');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = '#D8B070';
  ctx.fillRect(-VW, VH * 0.82, VW * 3, VH);
  ctx.fillStyle = '#3EA85E';
  ctx.fillRect(-VW, VH * 0.82, VW * 3, VH * 0.04);
  drawEito(VW * 0.10, VH * 0.72, 46, 1, G.t * 8, false, false, false);
  drawEito(VW * 0.90, VH * 0.72, 46, -1, 0, true, false, false);

  bigText('エイトくんの', VW / 2, 34, 20, '#2A4A3A', null);
  bigText('ぼうけん島', VW / 2, 68, fitSize('ぼうけん島', VW * 0.4, 42), '#FFF6C8');
  bigText('たいりょくが つねに へる！ フルーツを 食べながら ゴールへ',
          VW / 2, 104, fitSize('たいりょくが つねに へる！ フルーツを 食べながら ゴールへ', VW * 0.86, 16),
          '#2A4A3A', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 126, startStage, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#FFE0B0');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#FFE0B0');
  bigText('あそんだ かず ' + save.plays + '　たべた フルーツ ' + save.fruit,
          VW / 2, VH - 14, 14, 'rgba(20,40,30,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,40,30,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  G.lv = null;
  ctx.fillStyle = '#1E3A4E';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 36, 26, '#FFF6C8');
  const lines = [
    '① たいりょくは じっと して いても へって いく。フルーツを 食べつづけよう',
    '② 左で うごく／右の「ジャンプ」で とぶ。ボタンを はなすと 早く 落ちる',
    '③ たまごを 下から たたくと 道具が 出る（おの・スケボー・大フルーツ）',
    '④ てきは ふんでも たおせる。おのは 遠くの てきに とどく',
    '⑤ 水・トゲ・てきに あたると アウト。スケボーが あれば 1回 まもって くれる',
    '⑥ パソコンなら ← → で うごく、スペースで ジャンプ、X で おの',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 78 + i * 30, fitSize(s, VW * 0.92, 16), '#CFE8FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 54, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
