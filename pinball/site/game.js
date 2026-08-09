// たまの うごき（かんたんな 物理）。
//
// ★ かべも フリッパーも「線ぶん」として あつかう。
//   たまの まん中から 線ぶんへの いちばん 近い 点を さがして、
//   その きょりが たまの 半径より 小さければ ぶつかった、とする。
//   まるい バンパーは まん中どうしの きょりで みる。
//   これだけで ピンボールらしい はねかたに なる。
//
// ★ はやく 動く たまは、1コマで かべを つきぬける。
//   だから 1コマを 小さく 分けて（サブステップ）計算している。

'use strict';

const SAVE_KEY = 'yui-pin-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { open: o.open || 1, clear: o.clear || {}, best: o.best || {} };
  } catch (e) {
    return { open: 1, clear: {}, best: {} };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',
  table: 0, T: null,
  walls: [],
  bump: [], target: [], post: [],
  ball: null,
  ballsLeft: BALLS,
  score: 0,
  combo: 0, comboT: 0,
  flip: { l: 0, r: 0, la: 0, ra: 0 },   // 0..1 の おしぐあいと いまの かたむき
  hold: { l: false, r: false },
  msg: '', msgT: 0,
  over: false, win: false,
  spark: [],
  launch: true,       // 打ち出し まち
  still: 0,           // たまが 止まって いる 時間
  shake: 0,
  tilt: 0,
};

function startTable(i) {
  G.table = i;
  G.T = TABLES[i];
  G.walls = baseWalls();
  G.bump = G.T.bump.map((b, k) => ({ x: b[0], y: b[1], r: b[2], pt: b[3], hit: 0, kind: BUMP_KIND[k % BUMP_KIND.length] }));
  G.target = G.T.target.map((b) => ({ x: b[0], y: b[1], r: b[2], pt: b[3], down: false }));
  G.post = G.T.post.map((b) => ({ x: b[0], y: b[1], r: b[2] }));
  G.ballsLeft = BALLS;
  G.score = 0;
  G.combo = 0; G.comboT = 0;
  G.over = false; G.win = false;
  G.spark.length = 0;
  G.screen = 'play';
  newBall();
  bgmStart(i);
  say('画面を おして はねを 上げよう！');
}

function say(s) { G.msg = s; G.msgT = 2.4; }

function newBall() {
  G.ball = { x: 89, y: 140, vx: 0, vy: 0 };
  G.launch = true;
  G.still = 0;
  G.flip.l = 0; G.flip.r = 0;
}

function spark(x, y, n, col) {
  for (let i = 0; i < (n || 6); i++) {
    G.spark.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
      t: 0, life: 0.35 + Math.random() * 0.3, col: col || '#FFE066',
    });
  }
}

// --- あたり はんてい -------------------------------------------------------------

// 点 p から 線ぶん ab への いちばん 近い 点
function nearOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + dx * t, y: ay + dy * t, t: t };
}

// 線ぶんに ぶつかった ときの はねかえり。
// kick は フリッパーが 動いて いる ぶんの おし出す 力。
function bounceSeg(b, ax, ay, bx, by, rad, bounce, kick, kx, ky) {
  const n = nearOnSeg(b.x, b.y, ax, ay, bx, by);
  let dx = b.x - n.x, dy = b.y - n.y;
  let d = Math.hypot(dx, dy);
  if (d > BALL_R + rad) return false;
  if (d < 0.0001) { dx = 0; dy = -1; d = 1; }
  const nx = dx / d, ny = dy / d;
  const push = BALL_R + rad - d;
  b.x += nx * push; b.y += ny * push;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + bounce) * vn * nx;
    b.vy -= (1 + bounce) * vn * ny;
  }
  if (kick) { b.vx += (kx || nx) * kick; b.vy += (ky || ny) * kick; }
  return true;
}

function bounceCircle(b, cx, cy, r, bounce, pushOut) {
  let dx = b.x - cx, dy = b.y - cy;
  let d = Math.hypot(dx, dy);
  if (d > BALL_R + r) return false;
  if (d < 0.0001) { dx = 0; dy = -1; d = 1; }
  const nx = dx / d, ny = dy / d;
  b.x = cx + nx * (BALL_R + r);
  b.y = cy + ny * (BALL_R + r);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + bounce) * vn * nx;
    b.vy -= (1 + bounce) * vn * ny;
  }
  if (pushOut) { b.vx += nx * pushOut; b.vy += ny * pushOut; }
  return true;
}

// フリッパーの 先の ばしょ
function flipperEnds(side) {
  const a = side === 'l'
    ? FLIP.rest + (FLIP.up - FLIP.rest) * G.flip.la
    : Math.PI - (FLIP.rest + (FLIP.up - FLIP.rest) * G.flip.ra);
  const px = side === 'l' ? FLIP.lx : FLIP.rx;
  return { ax: px, ay: FLIP.y, bx: px + Math.cos(a) * FLIP.len, by: FLIP.y + Math.sin(a) * FLIP.len, a: a };
}

// --- 1コマ ----------------------------------------------------------------------

function addScore(n) {
  G.combo++;
  G.comboT = 1.6;
  G.score += Math.round(n * (1 + (G.combo - 1) * 0.15));
  // ★ もくひょうに とどいた しゅんかんに クリア。
  //   「たまを 3こ 使いきるまで 終わらない」に すると、
  //   じょうずな 子が いつまでも 終われなく なる。
  if (!G.over && G.score >= G.T.goal) winTable();
}

function winTable() {
  G.over = true; G.win = true;
  save.clear[G.table] = true;
  save.open = Math.max(save.open, Math.min(TABLES.length, G.table + 2));
  save.best[G.table] = Math.max(save.best[G.table] || 0, G.score);
  storeSave();
  bgmStop();
  sfxClear(G.ballsLeft === BALLS);
}

function step(dt) {
  const b = G.ball;
  if (!b) return;

  // フリッパーの かたむき
  for (const s of ['l', 'r']) {
    const want = G.hold[s] ? 1 : 0;
    const cur = s === 'l' ? G.flip.la : G.flip.ra;
    const nv = cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), FLIP.speed * dt);
    if (s === 'l') { G.flip.dl = nv - cur; G.flip.la = nv; }
    else { G.flip.dr = nv - cur; G.flip.ra = nv; }
  }

  if (G.launch) {
    // 打ち出す まで 下で まつ
    b.y = Math.min(140, b.y + 40 * dt);
    return;
  }

  // ★ 台は たて150。じゅうりょくが 強すぎると あっという間に 落ちて
  //   1回が 数びょうで 終わって しまうので、ゆっくりめに して ある。
  b.vy += 45 * dt;                          // じゅうりょく
  b.vx *= Math.pow(0.88, dt);               // くうきの ていこう
  b.vy *= Math.pow(0.97, dt);
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > 130) { b.vx *= 130 / sp; b.vy *= 130 / sp; }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // かべ
  for (const w of G.walls) bounceSeg(b, w[0], w[1], w[2], w[3], WALL_R, 0.55);
  // 出っぱり
  for (const p of G.post) bounceCircle(b, p.x, p.y, p.r, 0.7);

  // バンパー
  for (const m of G.bump) {
    if (bounceCircle(b, m.x, m.y, m.r, 0.6, 34)) {
      m.hit = 0.28;
      addScore(m.pt);
      spark(m.x, m.y, 8, '#FFE066');
      G.shake = 0.16;
      sfxBump(Math.min(6, G.combo));
    }
  }
  // まと
  let allDown = true;
  for (const q of G.target) {
    if (q.down) continue;
    allDown = false;
    if (bounceCircle(b, q.x, q.y, q.r, 0.35)) {
      q.down = true;
      addScore(q.pt);
      spark(q.x, q.y, 10, '#8FD6FF');
      sfxTarget();
    }
  }
  if (allDown && G.target.length) {
    addScore(1500);
    say('まと ぜんぶ たおした！ ボーナス 1500！');
    spark(50, 100, 24, '#FF9FC0');
    sfxBonus();
    for (const q of G.target) q.down = false;
  }

  // フリッパー
  for (const s of ['l', 'r']) {
    const e = flipperEnds(s);
    const dv = s === 'l' ? (G.flip.dl || 0) : (G.flip.dr || 0);
    // 上がって いる とちゅうだけ 強く はじく
    const kick = dv > 0 ? 78 : 0;
    if (bounceSeg(b, e.ax, e.ay, e.bx, e.by, 1.9, 0.42, kick, 0, -1)) {
      if (kick) sfxFlip();
    }
  }

  // ★ たまが どこかに はさまって 動かなく なったら、台を 少し ゆらして 助ける。
  //   本物の ピンボールにも ある しくみ。これで「二どと 動かない」が なくなる。
  if (Math.hypot(b.vx, b.vy) < 7) G.still += dt; else G.still = 0;
  if (G.still > 2.2) {
    b.vx += (Math.random() - 0.5) * 46;
    b.vy -= 30;
    G.still = 0; G.shake = 0.3;
    say('台を ゆらした！');
    sfxFlip();
  }

  // ドレイン（下に おちた）
  if (b.y > TH + 6) loseBall();
  // 万一 外に 出たら もどす
  if (b.x < 2 || b.x > 98) { b.x = Math.max(4, Math.min(96, b.x)); b.vx *= -0.5; }
}

function launch() {
  if (!G.launch || !G.ball) return;
  G.launch = false;
  // ★ みちを のぼりきって 右上の ななめに 当たると、そこで 左へ 曲がって
  //   台の 中に 入る。とどかないと みちを 落ちて くるだけに なるので、
  //   ここの 数字は 「y=140 から y=20 まで 上がりきる」 強さに して ある。
  G.ball.vx = -1 + Math.random();
  G.ball.vy = -128;
  sfxLaunch();
  say('');
}

function loseBall() {
  G.ballsLeft--;
  G.combo = 0;
  sfxDrain();
  if (G.ballsLeft <= 0) {
    G.ball = null;
    G.over = true;
    G.win = G.score >= G.T.goal;
    if (G.win) {
      save.clear[G.table] = true;
      save.open = Math.max(save.open, Math.min(TABLES.length, G.table + 2));
    }
    save.best[G.table] = Math.max(save.best[G.table] || 0, G.score);
    storeSave();
    bgmStop();
    if (G.win) sfxClear(true); else sfxOver();
    return;
  }
  say('のこり ' + G.ballsLeft + ' こ');
  newBall();
}

function update(dt) {
  if (G.msgT > 0) G.msgT -= dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.shake > 0) G.shake -= dt;
  for (const m of G.bump) if (m.hit > 0) m.hit -= dt;
  for (let i = G.spark.length - 1; i >= 0; i--) {
    const s = G.spark[i];
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt;
    if (s.t > s.life) G.spark.splice(i, 1);
  }

  if (G.screen !== 'play' || G.over) { bgmPump(); return; }

  // ★ 1コマを 小さく 分けて つきぬけを 防ぐ
  const n = 6;
  for (let i = 0; i < n; i++) step(dt / n);
  bgmHeat(G.combo > 3 ? 1 : 0);
  bgmPump();
}
