// ゲームの 中身。りなが にげて、パパが 追いかける。
//
// 時間内に つかまらなければ クリア。
// りなは くつを とると 速くなる。パパは サングラスを とると 速くなる。

'use strict';

const SAVE_KEY = 'escape.v1';

const save = {
  cleared: 0,        // どこまで クリアしたか
  best: {},          // 面ごとの のこり時間 の さいこう
  plays: 0,
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(o.cleared)) save.cleared = o.cleared;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
    if (o.best && typeof o.best === 'object') save.best = o.best;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

// --- 状態 ---------------------------------------------------------------------

const game = {
  screen: 'title',        // title / howto / select / play / clear / over / end
  stage: null,
  mz: null,
  flow: null,
  flowT: 0,
  rina: null,
  papas: [],
  items: [],              // { x, y, kind: 'shoe' | 'glass', got }
  timeLeft: 0,
  t: 0,
  msg: '', msgT: 0,
  shake: 0,
  intro: 0,               // 面の はじめの あんない
  caughtBy: null,
  pops: [],
};

const R_RAD = 0.34;       // からだの 大きさ（ますの 何ばい か）

function tileAt(x, y) {
  const mz = game.mz;
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= mz.w || iy >= mz.h) return 1;
  return mz.g[iy * mz.w + ix];
}

// まるい からだが かべに めりこんでいるか
function blocked(x, y, r) {
  for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) {
    if (tileAt(x + dx, y + dy) === 1) return true;
  }
  return false;
}

// かべに そって すべる ように 動かす
function moveEnt(e, vx, vy, dt) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) * dt / 0.2));
  const sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    const nx = e.x + vx * sdt;
    if (!blocked(nx, e.y, R_RAD)) e.x = nx; else vx = 0;
    const ny = e.y + vy * sdt;
    if (!blocked(e.x, ny, R_RAD)) e.y = ny; else vy = 0;
  }
}

// パパは ぜったいに りなより 速く ならない。
// ここを 守らないと、走っても にげられない 面が できて、子どもが 投げ出す。
function papaCap(st, v) {
  return Math.min(v, st.rinaSpeed * 0.86);
}

// 同じ 面で 何回も つかまったら、こっそり やさしくする。
// 3回で 時間が のびて パパが すこし おそく、6回で パパが 1人 帰る。
let failStage = -1, failStreak = 0;
function assistLevel() { return Math.min(2, Math.floor(failStreak / 3)); }

// --- 面を はじめる -------------------------------------------------------------

function startStage(i) {
  i = Math.max(0, Math.min(STAGES.length - 1, i));
  const st = STAGES[i];
  if (failStage !== i) { failStage = i; failStreak = 0; }
  const as = assistLevel();
  game.assist = as;
  game.stage = st;
  game.mz = makeMaze(st);
  game.flow = new Uint16Array(game.mz.w * game.mz.h);
  game.flowT = 0;
  const tiles = floorTiles(game.mz);
  const rn = rng(st.seed ^ 0x9e37);

  // りなは 左上、パパは できるだけ 遠くから
  game.rina = { x: 1.5, y: 1.5, vx: 0, vy: 0, boost: 0, face: 0, step: 0 };
  flowField(game.mz, 1, 1, game.flow);
  const far = tiles.slice().sort((a, b) =>
    game.flow[b[1] * game.mz.w + b[0]] - game.flow[a[1] * game.mz.w + a[0]]);

  game.papas = [];
  const gim = st.gim;
  let nPapa = st.papas + (gim === 'many' ? 1 : 0);
  if (as >= 2 && nPapa > 1) nPapa--;
  for (let i2 = 0; i2 < nPapa; i2++) {
    const t = far[Math.min(far.length - 1, i2 * 3)];
    game.papas.push({
      x: t[0] + 0.5, y: t[1] + 0.5, vx: 0, vy: 0,
      speed: papaCap(st, st.papaSpeed * (gim === 'fast' ? 1.14 : 1)
                         * (gim === 'ice' ? 0.86 : 1) * (1 - as * 0.06)),
      glasses: gim === 'fast', face: 0, step: 0, stun: 0.6 + i2 * 0.35,
    });
  }

  // アイテムを まく。りなの ちかくと パパの ちかくには 置かない。
  game.items = [];
  const pick = (kind, n) => {
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 60; tries++) {
        const t = tiles[(rn() * tiles.length) | 0];
        const d = game.flow[t[1] * game.mz.w + t[0]];
        if (d < 6 || d > 65000) continue;
        if (game.items.some((it) => it.x === t[0] && it.y === t[1])) continue;
        game.items.push({ x: t[0], y: t[1], kind, got: 0, bob: rn() * 6.28 });
        break;
      }
    }
  };
  pick('shoe', st.shoes);
  pick('glass', st.glasses);

  game.timeLeft = Math.round(st.time * (1 + as * 0.18));
  game.timeMax = game.timeLeft;
  game.t = 0;
  game.intro = gim === 'none' ? 0 : 2.4;
  game.caughtBy = null;
  game.pops = [];
  game.shake = 0;
  game.msgT = 0;
  game.screen = 'play';
  save.plays++;
  storeSave();
}

function pop(x, y, text, col) {
  game.pops.push({ x, y, text, col, t: 0 });
  if (game.pops.length > 5) game.pops.shift();
}

// --- 1 コマ すすめる -----------------------------------------------------------

function updatePlay(dt, inp) {
  game.t += dt;
  if (game.intro > 0) { game.intro -= dt; return; }
  game.timeLeft -= dt;
  if (game.shake > 0) game.shake -= dt;
  if (game.msgT > 0) game.msgT -= dt;
  for (const p of game.pops) p.t += dt;
  game.pops = game.pops.filter((p) => p.t < 1.4);

  const st = game.stage, r = game.rina;
  const ice = st.gim === 'ice';

  // りな
  let mx = inp.mx, my = inp.my;
  const L = Math.hypot(mx, my);
  if (L > 1) { mx /= L; my /= L; }
  if (r.boost > 0) r.boost -= dt;
  const spd = st.rinaSpeed * (r.boost > 0 ? 1.55 : 1);
  const acc = ice ? 3.8 : 22;                    // つるつるの ゆかは 止まりにくい
  r.vx += (mx * spd - r.vx) * Math.min(1, acc * dt);
  r.vy += (my * spd - r.vy) * Math.min(1, acc * dt);
  moveEnt(r, r.vx, r.vy, dt);
  if (L > 0.1) r.face = Math.atan2(my, mx);
  r.step += Math.hypot(r.vx, r.vy) * dt;

  // アイテム
  for (const it of game.items) {
    if (it.got) continue;
    const cx = it.x + 0.5, cy = it.y + 0.5;
    if (Math.hypot(r.x - cx, r.y - cy) < 0.6) {
      it.got = 1;
      if (it.kind === 'shoe') {
        r.boost = 4.5;
        pop(cx, cy, 'はやい！', '#7FE0A0');
      } else {
        // パパより 先に とると、パパを 速く させずに すむ
        pop(cx, cy, 'サングラス かくした！', '#FFD166');
      }
      continue;
    }
    for (const p of game.papas) {
      if (it.kind !== 'glass') continue;
      if (Math.hypot(p.x - cx, p.y - cy) < 0.6) {
        it.got = 1;
        p.glasses = true;
        p.speed = papaCap(st, p.speed + 0.45);
        pop(cx, cy, 'パパ パワーアップ！', '#FF9C7A');
        game.msg = 'パパが サングラスを かけた！';
        game.msgT = 2.2;
        game.shake = 0.3;
      }
    }
  }

  // パパの 行き先を ときどき 計算しなおす
  game.flowT -= dt;
  if (game.flowT <= 0) {
    game.flowT = 0.22;
    flowField(game.mz, Math.floor(r.x), Math.floor(r.y), game.flow);
  }

  for (const p of game.papas) {
    if (p.stun > 0) { p.stun -= dt; continue; }
    // いまの ますより きょりの 小さい となりへ すすむ
    const px = Math.floor(p.x), py = Math.floor(p.y);
    let bx = 0, by = 0, best = game.flow[py * game.mz.w + px];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= game.mz.w || ny >= game.mz.h) continue;
      const d = game.flow[ny * game.mz.w + nx];
      if (d < best) { best = d; bx = dx; by = dy; }
    }
    // ますの まん中を 通ると かべに ひっかからない
    const tx = px + 0.5 + bx, ty = py + 0.5 + by;
    let dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    p.vx += (dx * p.speed - p.vx) * Math.min(1, 14 * dt);
    p.vy += (dy * p.speed - p.vy) * Math.min(1, 14 * dt);
    moveEnt(p, p.vx, p.vy, dt);
    p.face = Math.atan2(p.vy, p.vx);
    p.step += Math.hypot(p.vx, p.vy) * dt;
    // つかまった？
    if (Math.hypot(p.x - r.x, p.y - r.y) < 0.62) {
      game.caughtBy = p;
      game.screen = 'over';
      failStreak++;
      return;
    }
  }

  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    const left = 0;
    const key = 'k' + st.n;
    save.best[key] = Math.max(save.best[key] || 0, Math.round(game.t));
    if (st.n > save.cleared) save.cleared = st.n;
    failStreak = 0;
    storeSave();
    game.screen = st.n >= STAGES.length ? 'end' : 'clear';
  }
}

loadSave();
