// にょろにょろの なかみ。
//
// ★ 体は「マスの ならび」で 持つ。先頭に 1マス たして、
//   のびない ときは しっぽを 1マス 消す。これだけで ヘビが 進む。
//
// ★ 向きは「つぎに 進む とき」に かわる。だから 1コマの あいだに
//   2回 おしても、うしろ向きに なって 自分に ぶつかる ことは ない。

'use strict';

const SAVE_KEY = 'aoi-snake-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { hi: o.hi || 0, open: o.open || 1, clear: o.clear || {}, best: o.best || {} };
  } catch (e) {
    return { hi: 0, open: 1, clear: {}, best: {} };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',
  stage: 0, S: null,
  wall: [],           // true = かべ
  body: [],           // [{x,y}] 先頭が あたま
  dx: 1, dy: 0,       // いまの 向き
  wx: 1, wy: 0,       // つぎに 曲がりたい 向き
  grow: 0,            // あと 何マス のびるか
  step: 0,            // つぎに 進むまでの たまり（0〜1）
  speed: 4.5,
  slow: 0,            // こおりで おそく なって いる のこり びょう
  foods: [],
  ate: 0, score: 0,
  over: false, win: false,
  msg: '', msgT: 0,
  pop: [],
  t: 0,
  ready: 0,
};

function wallAt(x, y) {
  if (x < 0 || y < 0 || x >= BW || y >= BH) return true;
  return G.wall[y][x];
}
function bodyAt(x, y, skipTail) {
  const n = G.body.length - (skipTail ? 1 : 0);
  for (let i = 0; i < n; i++) if (G.body[i].x === x && G.body[i].y === y) return true;
  return false;
}

function startStage(i) {
  G.stage = i;
  G.S = STAGES[i];
  G.wall = [];
  for (let y = 0; y < BH; y++) G.wall.push(new Array(BW).fill(false));
  for (const [x, y, w, h] of G.S.wall) {
    for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) {
      if (x + k < BW && y + j < BH) G.wall[y + j][x + k] = true;
    }
  }
  G.body = [];
  const sy = (BH / 2) | 0;
  for (let k = 0; k < START_LEN; k++) G.body.push({ x: 4 - k, y: sy });
  G.dx = 1; G.dy = 0; G.wx = 1; G.wy = 0;
  G.grow = 0; G.step = 0;
  G.speed = G.S.speed; G.slow = 0;
  G.foods = [];
  G.ate = 0; G.score = 0;
  G.over = false; G.win = false;
  G.pop.length = 0;
  G.ready = 1.2;
  G.screen = 'play';
  spawnFood('apple');
  bgmStart(i);
  say(G.S.need + ' こ 食べたら クリア！');
}

function say(s) { G.msg = s; G.msgT = 2.2; }

function freeCell() {
  for (let n = 0; n < 400; n++) {
    const x = (Math.random() * BW) | 0, y = (Math.random() * BH) | 0;
    if (wallAt(x, y) || bodyAt(x, y) || G.foods.some((f) => f.x === x && f.y === y)) continue;
    return { x: x, y: y };
  }
  // うまって いる ときは 端から さがす
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    if (!wallAt(x, y) && !bodyAt(x, y) && !G.foods.some((f) => f.x === x && f.y === y)) return { x: x, y: y };
  }
  return null;
}

function spawnFood(kind) {
  const c = freeCell();
  if (!c) return;
  G.foods.push({ x: c.x, y: c.y, k: kind, t: FOODS[kind].life });
}

// --- そうさ ---------------------------------------------------------------------

function turn(dx, dy) {
  if (G.screen !== 'play' || G.over) return;
  // ★ 反対むきには 曲がれない（すぐ 自分に ぶつかって しまう ため）
  if (dx === -G.dx && dy === -G.dy) return;
  G.wx = dx; G.wy = dy;
}

// --- 1コマ ----------------------------------------------------------------------

function stepSnake() {
  G.dx = G.wx; G.dy = G.wy;
  const h = G.body[0];
  const nx = h.x + G.dx, ny = h.y + G.dy;

  // しっぽは この あと 消えるので、ぶつかり はんていから 外す
  if (wallAt(nx, ny) || bodyAt(nx, ny, G.grow <= 0)) { die(); return; }

  G.body.unshift({ x: nx, y: ny });
  const fi = G.foods.findIndex((f) => f.x === nx && f.y === ny);
  if (fi >= 0) {
    const f = G.foods[fi];
    const F = FOODS[f.k];
    G.foods.splice(fi, 1);
    G.ate++;
    G.score += F.pt;
    G.pop.push({ x: nx, y: ny, pt: F.pt, t: 0 });
    if (F.grow > 0) G.grow += F.grow;
    else {
      // ちぢみ草。みじかく なる（さいてい 3マスは のこす）
      for (let k = 0; k < -F.grow && G.body.length > 3; k++) G.body.pop();
    }
    if (f.k === 'ice') { G.slow = 5; say('こおり！ すこし ゆっくりに なった'); }
    else if (f.k === 'gold') say('きんの み！ 50てん');
    else if (f.k === 'short') say('ちぢみ草。体が みじかく なった');
    sfxEat(f.k);
    if (G.ate >= G.S.need) { clearStage(); return; }
    spawnFood('apple');
    // ときどき とくべつな えさを 出す
    if (G.ate % 4 === 0) {
      const sp = ['gold', 'ice', 'short'][(Math.random() * 3) | 0];
      spawnFood(sp);
    }
  }
  if (G.grow > 0) G.grow--;
  else G.body.pop();
}

function die() {
  G.over = true; G.win = false;
  save.hi = Math.max(save.hi, G.score);
  storeSave();
  bgmStop();
  sfxDead();
}

function clearStage() {
  G.over = true; G.win = true;
  save.clear[G.stage] = true;
  save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
  save.hi = Math.max(save.hi, G.score);
  save.best[G.stage] = Math.max(save.best[G.stage] || 0, G.score);
  storeSave();
  bgmStop();
  sfxClear(true);
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (let i = G.pop.length - 1; i >= 0; i--) {
    G.pop[i].t += dt;
    if (G.pop[i].t > 0.8) G.pop.splice(i, 1);
  }
  if (G.screen !== 'play' || G.over) { bgmPump(); return; }
  if (G.ready > 0) { G.ready -= dt; bgmPump(); return; }

  if (G.slow > 0) G.slow -= dt;
  // とくべつな えさは 時間で 消える
  for (let i = G.foods.length - 1; i >= 0; i--) {
    const f = G.foods[i];
    if (FOODS[f.k].life > 0) { f.t -= dt; if (f.t <= 0) G.foods.splice(i, 1); }
  }
  if (!G.foods.some((f) => f.k === 'apple')) spawnFood('apple');

  const sp = G.speed * (G.slow > 0 ? 0.62 : 1);
  G.step += sp * dt;
  let guard = 0;
  while (G.step >= 1 && !G.over && guard++ < 8) {
    G.step -= 1;
    stepSnake();
  }
  bgmHeat(G.body.length > 14 ? 1 : 0);
  bgmPump();
}
