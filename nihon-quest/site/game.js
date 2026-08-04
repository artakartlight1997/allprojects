// ゲームの中身。物理・当たり判定・進行。
// 描画は render.js、画面まわりと入力は ui.js。

'use strict';

// ---- 動きの数値。タイルを単位にしている
const GRAVITY = 44;
const MOVE_SPEED = 7.5;
const AIR_ACCEL = 60;
const GROUND_ACCEL = 90;
const FRICTION = 55;
const JUMP_V = -17.5;        // 3.48 タイル上がる。横には 5.96 タイル
const JUMP_CUT = 0.42;       // ボタンを離すと上りをゆるめる（長押しで高く）
const PAD_V = -26;           // ジャンプ台。7.7 タイル
const STOMP_V = -13;
const MAX_FALL = 30;
const COYOTE = 0.11;         // 足場をはなれた直後でもジャンプできる猶予
const JUMP_BUFFER = 0.14;    // 着地の直前に押しても受け付ける

// ---- キャラの大きさ。前のゲームより一回り大きい
const PLAYER_W = 0.85;
const PLAYER_H = 1.15;
const DRAW_SCALE = 1.35;     // 当たり判定より大きく描く（見た目を大きく）

const VIEW_TILES_Y = 11;     // たてに何タイル見えるか。小さいほどキャラが大きい

const MAX_HP = 3;
const INVULN = 1.4;
const SPAWN_GRACE = 1.4;

const STAGES_PER_JOURNEY = 5;
const QUIZ_TIME = 22;   // クイズの持ち時間（秒）

// ---- 効果のつづく時間
const T_STAR = 8, T_DASH = 10, T_FEATHER = 14, T_MAGNET = 10;

const game = {
  screen: 'title',
  stage: null,
  player: null,
  cam: { x: 0, y: 0 },
  t: 0,
  stageNo: 1,
  region: '関東',
  seed: 1,
  journey: [],       // この旅で回った地方
  quiz: null,
  fx: [],
  coinsTotal: 0,
  score: 0,
  stageStart: 0,
  quizDone: 0, quizOk: 0,
  chaser: null,
  wind: 0,
  msg: null, msgT: 0,
};

function solidAt(st, x, y) {
  if (y < 0) return false;
  if (x < 0 || x >= st.w || y >= st.h) return y >= st.h ? false : true;
  const c = st.g[y][x];
  return c === '#' || c === '=';
}

function spikeAt(st, x, y) {
  if (x < 0 || x >= st.w || y < 0 || y >= st.h) return false;
  return st.g[y][x] === '^';
}

// ---------------------------------------------------------------- 旅とステージ

// 苦手な地方ほど出やすくする
function chooseRegion(rnd, avoid) {
  const score = REGIONS.map(r => {
    const ps = PREFS.filter(p => p.region === r);
    let known = 0;
    for (const p of ps) if (masteryLevel(p.id) >= 2) known++;
    return { r, w: Math.max(1, ps.length - known) + 0.5 };
  }).filter(o => !avoid.includes(o.r));
  const pool = score.length ? score : REGIONS.map(r => ({ r, w: 1 }));
  let total = 0; for (const o of pool) total += o.w;
  let v = rnd() * total;
  for (const o of pool) { v -= o.w; if (v <= 0) return o.r; }
  return pool[pool.length - 1].r;
}

function startJourney() {
  game.journey = [];
  game.score = 0;
  game.coinsTotal = 0;
  game.quizDone = 0; game.quizOk = 0;
  game.stageNo = 0;
  nextStage();
}

function nextStage() {
  game.stageNo++;
  const rnd = mulberry32((Math.random() * 1e9) | 0);
  game.region = chooseRegion(rnd, game.journey.slice(-2));
  game.journey.push(game.region);
  game.seed = (Math.random() * 1e9) | 0;
  loadStage();
}

function loadStage() {
  const st = genStage(game.seed, game.stageNo, game.region);
  game.stage = st;
  game.ents = st.ents.map(e => Object.assign({}, e, {
    x: e.x + 0.5, y: e.y + 0.5, ox: e.x + 0.5, oy: e.y + 0.5,
    vx: (e.t === 'enemy' ? (Math.random() < 0.5 ? -1.6 : 1.6) : 0), vy: 0,
    dead: false, used: false, ph: Math.random() * 6.28,
  }));
  game.player = {
    x: st.spawn.x + 0.5, y: st.spawn.y,
    vx: 0, vy: 0, onGround: false, face: 1,
    hp: MAX_HP, inv: SPAWN_GRACE, coins: 0,
    star: 0, dash: 0, feather: 0, magnet: 0, barrier: false,
    dbl: false, anim: 0, spawnX: st.spawn.x + 0.5, spawnY: st.spawn.y,
    hurtT: 0,
  };
  game.cam.x = 0; game.cam.y = 0;
  game.fx = [];
  game.t = 0;
  game.stageStart = 0;
  game.wind = 0;
  game.chaser = st.event === 'chase' ? { x: -6, y: 0, hit: 0 } : null;
  game.quizAsked = [];
  game.screen = 'play';
  game.msg = st.region + '地方 の たび';
  game.msgT = 2.6;
}

function respawn(cost) {
  const p = game.player;
  p.x = p.spawnX; p.y = p.spawnY;
  p.vx = 0; p.vy = 0;
  p.hp = MAX_HP;
  p.inv = SPAWN_GRACE;
  p.star = p.dash = p.feather = p.magnet = 0;
  p.barrier = false;
  game.score = Math.max(0, game.score - cost);
  if (game.chaser) game.chaser.x = p.x - 14;
}

// ---------------------------------------------------------------- あたり

function hurt(from) {
  const p = game.player;
  if (p.inv > 0 || p.star > 0) return;
  if (p.barrier) {
    p.barrier = false; p.inv = INVULN;
    burst(p.x, p.y, '#7fd0ff', 16);
    return;
  }
  p.hp--;
  p.inv = INVULN;
  p.hurtT = 0.35;
  p.vy = -8;
  p.vx = (from !== undefined && from > p.x) ? -6 : 6;
  burst(p.x, p.y, '#ff8fa0', 12);
  if (p.hp <= 0) respawn(200);
}

function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    game.fx.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.9) * 8,
                   t: 0.6, col, r: 0.06 + Math.random() * 0.08 });
  }
}

function popText(x, y, text, col) {
  game.fx.push({ x, y, text, col: col || '#fff', t: 1.1, vy: -1.6, vx: 0 });
}

// ---------------------------------------------------------------- 更新

function updatePlay(dt, input) {
  const st = game.stage, p = game.player;
  game.t += dt;
  if (game.msgT > 0) game.msgT -= dt;

  // 風のイベント。左右にゆっくり押される
  if (st.event === 'wind') {
    game.wind = Math.sin(game.t * 0.55) * 4.2;
  }

  // ---- 横の動き
  const speed = MOVE_SPEED * (p.dash > 0 ? 1.45 : 1);
  let want = 0;
  if (input.left) want = -1;
  if (input.right) want = 1;
  if (want !== 0) {
    p.face = want;
    const acc = (p.onGround ? GROUND_ACCEL : AIR_ACCEL) * dt;
    p.vx += want * acc;
    if (Math.abs(p.vx) > speed) p.vx = want * speed;
  } else if (p.onGround) {
    const f = FRICTION * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= Math.sign(p.vx) * f;
  }
  p.vx += game.wind * dt;
  if (Math.abs(p.vx) > speed * 1.6) p.vx = Math.sign(p.vx) * speed * 1.6;

  // ---- ジャンプ
  p.coyote = p.onGround ? COYOTE : Math.max(0, (p.coyote || 0) - dt);
  p.jbuf = input.jumpPressed ? JUMP_BUFFER : Math.max(0, (p.jbuf || 0) - dt);
  if (p.jbuf > 0) {
    if (p.coyote > 0) {
      p.vy = JUMP_V; p.jbuf = 0; p.coyote = 0; p.dbl = false;
      game.fx.push({ x: p.x, y: p.y + PLAYER_H / 2, ring: true, t: 0.35, col: '#fff' });
    } else if (p.feather > 0 && !p.dbl) {
      p.vy = JUMP_V * 0.9; p.jbuf = 0; p.dbl = true;
      burst(p.x, p.y + 0.4, '#fff2a8', 10);
    }
  }
  // ボタンを離したら上りをゆるめる（＝短く押すと低く、長く押すと高く跳ぶ）
  if (!input.jump && p.vy < -4) p.vy += GRAVITY * JUMP_CUT * 2.5 * dt * 12;

  // ---- 落ちる
  p.vy += GRAVITY * dt;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  moveWithTiles(p, dt);

  // 効果の残り時間
  for (const k of ['star', 'dash', 'feather', 'magnet', 'inv', 'hurtT']) {
    if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
  }
  p.anim += dt * (2 + Math.abs(p.vx) * 0.8);

  // ---- 落下
  if (p.y > st.h + 2) { hurtFall(); }

  // ---- トゲ
  const cx = Math.floor(p.x), cy = Math.floor(p.y + PLAYER_H / 2 - 0.1);
  if (spikeAt(st, cx, cy) || spikeAt(st, Math.floor(p.x - PLAYER_W / 3), cy)
      || spikeAt(st, Math.floor(p.x + PLAYER_W / 3), cy)) hurt(p.x);

  updateEnts(dt);
  updateChaser(dt);
  updateFx(dt);
  updateCamera(dt);
}

function hurtFall() {
  const p = game.player;
  p.hp--;
  if (p.hp <= 0) { respawn(200); return; }
  p.x = p.spawnX; p.y = p.spawnY;
  p.vx = 0; p.vy = 0; p.inv = SPAWN_GRACE;
  popText(p.x, p.y - 1, 'いたた！', '#ffd0d8');
}

function moveWithTiles(o, dt) {
  const st = game.stage;
  const hw = PLAYER_W / 2, hh = PLAYER_H / 2;

  o.x += o.vx * dt;
  let l = Math.floor(o.x - hw), r = Math.floor(o.x + hw);
  let t = Math.floor(o.y - hh + 0.02), b = Math.floor(o.y + hh - 0.02);
  for (let y = t; y <= b; y++) {
    if (o.vx > 0 && solidAt(st, r, y)) { o.x = r - hw - 0.001; o.vx = 0; }
    else if (o.vx < 0 && solidAt(st, l, y)) { o.x = l + 1 + hw + 0.001; o.vx = 0; }
  }
  if (o.x < hw) { o.x = hw; o.vx = 0; }
  if (o.x > st.w - hw) { o.x = st.w - hw; o.vx = 0; }

  o.onGround = false;
  o.y += o.vy * dt;
  l = Math.floor(o.x - hw + 0.02); r = Math.floor(o.x + hw - 0.02);
  t = Math.floor(o.y - hh); b = Math.floor(o.y + hh);
  for (let x = l; x <= r; x++) {
    if (o.vy > 0 && solidAt(st, x, b)) { o.y = b - hh - 0.001; o.vy = 0; o.onGround = true; }
    else if (o.vy < 0 && solidAt(st, x, t)) { o.y = t + 1 + hh + 0.001; o.vy = 0; }
  }
}

function overlapPlayer(e, w, h) {
  const p = game.player;
  return Math.abs(p.x - e.x) < (PLAYER_W + w) / 2
      && Math.abs(p.y - e.y) < (PLAYER_H + h) / 2;
}

function addScore(n, x, y, col) {
  game.score += n;
  if (x !== undefined) popText(x, y, '+' + n, col);
}

function updateEnts(dt) {
  const st = game.stage, p = game.player;
  for (const e of game.ents) {
    if (e.dead) continue;

    if (e.t === 'enemy') {
      updateEnemy(e, dt);
      if (!e.dead && overlapPlayer(e, 0.8, 0.8)) {
        const stompable = e.kind !== 'spiky';
        if (p.star > 0) { killEnemy(e); }
        else if (stompable && p.vy > 2 && p.y < e.y - 0.25) {
          killEnemy(e); p.vy = STOMP_V; p.dbl = false;
        } else hurt(e.x);
      }

    } else if (e.t === 'coin' || e.t === 'gem') {
      if (p.magnet > 0) {
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < 5) { e.x += (p.x - e.x) * dt * 5; e.y += (p.y - e.y) * dt * 5; }
      }
      if (overlapPlayer(e, 0.6, 0.6)) {
        e.dead = true;
        const v = e.t === 'gem' ? 500 : 100;
        p.coins += e.t === 'gem' ? 5 : 1;
        game.coinsTotal += e.t === 'gem' ? 5 : 1;
        addScore(v, e.x, e.y, e.t === 'gem' ? '#b6f2ff' : '#ffe27a');
        burst(e.x, e.y, e.t === 'gem' ? '#8fe8ff' : '#ffdd66', 6);
      }

    } else if (e.t === 'item') {
      e.y = e.oy + Math.sin(game.t * 3 + e.ph) * 0.12;
      if (overlapPlayer(e, 0.8, 0.8)) { e.dead = true; takeItem(e.kind, e.x, e.y); }

    } else if (e.t === 'pad') {
      if (overlapPlayer(e, 0.9, 0.7) && p.vy >= 0) {
        p.vy = PAD_V; p.dbl = false; e.squish = 0.25;
        burst(e.x, e.y, '#ffd166', 10);
      }
      if (e.squish > 0) e.squish -= dt;

    } else if (e.t === 'mplat') {
      const a = Math.sin(game.t * 0.9 + e.ph) * e.range;
      const nx = e.dir === 'x' ? e.ox + a : e.ox;
      const ny = e.dir === 'y' ? e.oy + a : e.oy;
      const dx = nx - e.x, dy = ny - e.y;
      e.x = nx; e.y = ny;
      // 上に乗っているなら一緒に運ぶ
      if (Math.abs(p.x - e.x) < 1.2 && Math.abs((p.y + PLAYER_H / 2) - (e.y - 0.3)) < 0.35
          && p.vy >= 0) {
        p.x += dx; p.y += dy; p.onGround = true; p.vy = 0;
      }

    } else if (e.t === 'check') {
      if (!e.used && overlapPlayer(e, 1.0, 1.4)) {
        e.used = true;
        p.spawnX = e.x; p.spawnY = e.y - 0.4;
        popText(e.x, e.y - 1, 'ここから再開！', '#b7f7c4');
        burst(e.x, e.y, '#9ff0b0', 14);
      }

    } else if (e.t === 'gate') {
      // 鳥居は高いので、跳びこえても通ったことにする。
      // ここを素通りできてしまうと、クイズに出会わないまま終わってしまう
      if (!e.used && Math.abs(p.x - e.x) < 1.0
          && p.y > e.y - 5 && p.y < e.y + 2) {
        e.used = true;
        openQuiz(e);
      }

    } else if (e.t === 'goal') {
      // ゴールの旗も、跳びこえてしまわないように高く判定する
      if (Math.abs(p.x - e.x) < 1.0 && p.y > e.y - 5 && p.y < e.y + 2) clearStage();
    }
  }
}

function killEnemy(e) {
  e.dead = true;
  burst(e.x, e.y, '#ffd9a0', 12);
  addScore(200, e.x, e.y - 0.5, '#ffd9a0');
}

function updateEnemy(e, dt) {
  const st = game.stage;
  if (e.kind === 'flyer') {
    e.x += e.vx * 0.55 * dt;
    e.y = e.oy + Math.sin(game.t * 1.6 + e.ph) * 0.9;
    if (e.x < e.ox - 3) { e.x = e.ox - 3; e.vx = Math.abs(e.vx); }
    if (e.x > e.ox + 3) { e.x = e.ox + 3; e.vx = -Math.abs(e.vx); }
    return;
  }
  if (e.kind === 'bouncer') {
    e.vy = (e.vy || 0) + GRAVITY * dt;
    e.y += e.vy * dt;
    const fy = Math.floor(e.y + 0.5);
    if (solidAt(st, Math.floor(e.x), fy)) {
      e.y = fy - 0.5; e.vy = -12;
    }
  }
  const nx = e.x + e.vx * dt * (e.kind === 'spiky' ? 0.55 : 0.8);
  const fx = Math.floor(nx + Math.sign(e.vx) * 0.4);
  const fy = Math.floor(e.y + 0.6);
  if (solidAt(st, fx, Math.floor(e.y)) || !solidAt(st, fx, fy)) {
    e.vx = -e.vx;                       // 壁とがけで折り返す
  } else {
    e.x = nx;
  }
}

function takeItem(kind, x, y) {
  const p = game.player;
  const names = { heart: 'たいりょく', star: 'むてき', dash: 'ダッシュ',
                  feather: '2かいジャンプ', barrier: 'バリア', magnet: 'マグネット' };
  if (kind === 'heart') {
    if (p.hp < MAX_HP) p.hp++; else addScore(500, x, y, '#ffb7c8');
  } else if (kind === 'star') p.star = T_STAR;
  else if (kind === 'dash') p.dash = T_DASH;
  else if (kind === 'feather') p.feather = T_FEATHER;
  else if (kind === 'magnet') p.magnet = T_MAGNET;
  else if (kind === 'barrier') p.barrier = true;
  popText(x, y - 0.8, names[kind], '#fff0b0');
  burst(x, y, '#ffe9a0', 14);
}

function updateChaser(dt) {
  const c = game.chaser;
  if (!c) return;
  const p = game.player, st = game.stage;
  // プレイヤーより少しおそい。走っていればぜったい追いつかれない
  c.x += 4.4 * dt;
  if (c.x < p.x - 18) c.x = p.x - 18;
  const col = Math.max(0, Math.min(st.w - 1, Math.floor(c.x)));
  const target = (st.gh[col] || GROUND_ROW) - 1.2;
  c.y += (target - c.y) * Math.min(1, dt * 6);
  if (c.hit > 0) c.hit -= dt;
  if (Math.abs(p.x - c.x) < 1.2 && Math.abs(p.y - c.y) < 1.6 && c.hit <= 0) {
    c.hit = 1.5; c.x -= 7; hurt(c.x);
  }
}

function updateFx(dt) {
  for (const f of game.fx) {
    f.t -= dt;
    if (f.ring) continue;
    f.x += (f.vx || 0) * dt;
    f.y += (f.vy || 0) * dt;
    if (!f.text) f.vy = (f.vy || 0) + 16 * dt;
  }
  game.fx = game.fx.filter(f => f.t > 0);
}

function updateCamera(dt) {
  const p = game.player, st = game.stage;
  const halfW = (view.tilesX || 18) / 2;
  let tx = p.x - halfW + 1.5 * p.face;
  tx = Math.max(0, Math.min(st.w - halfW * 2, tx));
  game.cam.x += (tx - game.cam.x) * Math.min(1, dt * 6);
  let ty = p.y - VIEW_TILES_Y * 0.58;
  ty = Math.max(0, Math.min(st.h - VIEW_TILES_Y, ty));
  game.cam.y += (ty - game.cam.y) * Math.min(1, dt * 5);
}

// ---------------------------------------------------------------- クイズ

function openQuiz(gate) {
  const used = new Set(game.quizAsked || []);
  const rnd = mulberry32((Math.random() * 1e9) | 0);
  const q = makeQuestion(rnd, game.region, used);
  (game.quizAsked || (game.quizAsked = [])).push(q.target.id);
  game.quiz = {
    q, gate, picked: -1, answered: false, t: 0, resultT: 0, reward: null,
    time: QUIZ_TIME, timeUp: false,
  };
  game.screen = 'quiz';
}

function answerQuiz(i) {
  const qz = game.quiz;
  if (!qz || qz.answered) return;
  qz.answered = true;
  qz.picked = i;
  qz.timeUp = i < 0;
  const ok = i === qz.q.answer;
  qz.ok = ok;
  recordAnswer(qz.q.target.id, ok);
  if (qz.mode === 'board') {
    // すごろくでは、正解するとその県のカードがもらえる
    qz.bonus = ok ? CARD_COINS : 100;
    return;
  }
  game.quizDone++;
  if (ok) {
    game.quizOk++;
    const bonus = 1000 + Math.round(Math.max(0, qz.time) * 20);
    game.score += bonus;
    qz.bonus = bonus;
    qz.reward = ITEM_KINDS[(Math.random() * ITEM_KINDS.length) | 0];
  } else {
    game.score += 100;
    qz.bonus = 100;
    qz.reward = 'coinsmall';
  }
  qz.resultT = 0;
}

function closeQuiz() {
  const qz = game.quiz;
  if (!qz) return;
  if (qz.mode === 'board') {
    game.quiz = null;
    boardQuizDone(!!qz.ok);
    return;
  }
  const p = game.player;
  if (qz.reward && qz.reward !== 'coinsmall') {
    takeItem(qz.reward, p.x, p.y - 1);
  } else {
    p.coins += 3; game.coinsTotal += 3;
    popText(p.x, p.y - 1, 'コイン+3', '#ffe27a');
  }
  game.quiz = null;
  game.screen = 'play';
}

// ---------------------------------------------------------------- 進行

function clearStage() {
  const timeSec = game.t;
  const timeBonus = Math.max(0, Math.round((150 - timeSec) * 10));
  game.score += timeBonus + 500;
  game.result = {
    timeSec, timeBonus, region: game.region, stageNo: game.stageNo,
    last: game.stageNo >= STAGES_PER_JOURNEY,
  };
  if (game.result.last) {
    save.journeys++;
    if (game.score > save.best) save.best = game.score;
    save.coins += game.coinsTotal;
    storeSave();
  }
  game.screen = 'clear';
}
