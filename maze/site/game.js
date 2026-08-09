// うごき の ところ。
//
// ★ あおいも おばけも「マスの まん中を つないで 歩く」。
//   いまの マス (tx, ty) と つぎの マスの あいだを 0→1 で 進み、
//   1 に なったら つぎの マスに 入って 向きを 決めなおす。
//   こうすると、かべを すりぬけたり ななめに 入りこんだり しない。
//
// ★ 曲がる ときは「先に 曲がりたい 向きを 覚えておく（want）」。
//   むかしの ゲームと 同じで、少し 早めに おしても ちゃんと 曲がる。

'use strict';

const SAVE_KEY = 'aoi-maze-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { hi: o.hi || 0, open: o.open || 1, clear: o.clear || {} };
  } catch (e) {
    return { hi: 0, open: 1, clear: {} };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const G = {
  screen: 'title',
  stage: 0, S: null, M: null,
  m: [],              // '#' '-' ' ' だけの かべ地図
  dot: [],            // 0=なし 1=おかし 2=おおきい おかし
  left: 0,            // のこりの おかし
  me: null,
  ghosts: [],
  lives: LIVES,
  score: 0,
  door: { x: 9, y: 6 },
  fear: 0,            // おばけが 逃げて いる のこり びょう
  mode: 'scatter',    // scatter=四すみへ ちらばる / chase=おいかける
  modeT: 0,           // つぎに 切りかわるまでの びょう
  modeI: 0,
  chain: 0,           // つづけて 食べた おばけの 数
  ready: 0,           // 「READY」の あいだ
  dead: 0,            // やられた えんしゅつ
  over: false, win: false,
  msg: '', msgT: 0,
  eatPop: null,       // 食べた てんすうの 表示
  t: 0,
};

function tileAt(x, y) {
  if (y < 0 || y >= MH) return '#';
  return G.m[y][(x + MW) % MW];
}
function canGo(x, y, ghost) {
  const c = tileAt(x, y);
  if (c === '#') return false;
  if (c === '-') return !!ghost;      // とびらは おばけだけ 通れる
  return true;
}

function startStage(i) {
  G.stage = i;
  G.S = STAGES[i];
  G.M = MAZES[G.S.maze];
  loadMaze();
  G.lives = LIVES;
  G.score = 0;
  G.over = false; G.win = false;
  G.screen = 'play';
  bgmStart(i);
  say(G.S.name + '　スタート！');
}

function loadMaze() {
  G.m = []; G.dot = [];
  G.ghosts = [];
  G.left = 0;
  G.door = { x: 9, y: 6 };
  let start = { x: 9, y: 11 };
  const gs = [];
  for (let y = 0; y < MH; y++) {
    const row = [], drow = [];
    for (let x = 0; x < MW; x++) {
      const c = G.M.map[y][x];
      if (c === '#') { row.push('#'); drow.push(0); }
      else if (c === '-') { row.push('-'); drow.push(0); G.door = { x: x, y: y }; }
      else {
        row.push(' ');
        if (c === '.') { drow.push(1); G.left++; }
        else if (c === 'o') { drow.push(2); G.left++; }
        else drow.push(0);
      }
      if (c === 'A') start = { x: x, y: y };
      if (c >= '1' && c <= '4') gs.push({ x: x, y: y, i: +c - 1 });
    }
    G.m.push(row); G.dot.push(drow);
  }
  G.me = { x: start.x, y: start.y, sx: start.x, sy: start.y,
           dx: -1, dy: 0, wx: -1, wy: 0, p: 0, mouth: 0 };
  gs.sort((a, b) => a.i - b.i);
  for (let i = 0; i < G.S.n; i++) {
    const g = gs[i % gs.length];
    G.ghosts.push({
      i: i, x: g.x, y: g.y, dx: 0, dy: -1, p: 0,
      out: i === 0 ? 0 : 1.2 + i * 1.6,   // 家から 出るまでの まちじかん
      home: { x: g.x, y: g.y },
      inHouse: true,                      // 家の 中に いる あいだは 出口を めざす
      scared: 0, eaten: 0,
    });
  }
  G.fear = 0; G.chain = 0;
  // ★ おばけが ずっと おいかけて くると、にげ場が なく なって
  //   だれも クリアできない。むかしの ゲームと 同じで、
  //   ときどき「四すみへ ちらばる」時間を 入れる。
  G.mode = 'scatter'; G.modeI = 0; G.modeT = MODE_PLAN[0].sec;
  G.ready = 1.8; G.dead = 0;
  G.eatPop = null;
}

function say(s) { G.msg = s; G.msgT = 2.2; }

// --- そうさ ---------------------------------------------------------------------

function turn(dx, dy) {
  if (G.screen !== 'play' || G.over) return;
  G.me.wx = dx; G.me.wy = dy;
}

// --- あおい ---------------------------------------------------------------------

function stepMe(dt) {
  const m = G.me;
  const sp = G.S.ps;
  m.p += sp * dt;
  m.mouth += sp * dt * 2.2;
  while (m.p >= 1) {
    m.p -= 1;
    m.x = (m.sx + m.dx + MW) % MW;
    m.y = m.sy + m.dy;
    m.sx = m.x; m.sy = m.y;
    eatHere();
    // 曲がりたい 向きが 通れるなら そちらへ
    if ((m.wx !== m.dx || m.wy !== m.dy) && canGo(m.x + m.wx, m.y + m.wy)) {
      m.dx = m.wx; m.dy = m.wy;
    }
    if (!canGo(m.x + m.dx, m.y + m.dy)) { m.dx = 0; m.dy = 0; m.p = 0; break; }
  }
  if (m.dx === 0 && m.dy === 0) {
    // 止まって いても、通れる 向きを おされたら 動き出す
    if ((m.wx || m.wy) && canGo(m.x + m.wx, m.y + m.wy)) { m.dx = m.wx; m.dy = m.wy; }
  }
}

function eatHere() {
  const d = G.dot[G.me.y][G.me.x];
  if (!d) return;
  G.dot[G.me.y][G.me.x] = 0;
  G.left--;
  if (d === 1) { G.score += 10; sfxDot(); }
  else {
    G.score += 50;
    G.fear = G.S.fear;
    G.chain = 0;
    for (const g of G.ghosts) if (g.eaten <= 0) { g.scared = 1; g.dx = -g.dx; g.dy = -g.dy; }
    sfxPower();
    say('おばけが 青く なった！');
  }
  if (G.left <= 0) clearStage();
}

function clearStage() {
  G.win = true; G.over = true;
  save.clear[G.stage] = true;
  save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
  save.hi = Math.max(save.hi, G.score);
  storeSave();
  bgmStop();
  sfxClear(G.lives === LIVES);
}

// --- おばけ ---------------------------------------------------------------------

// その おばけが 目ざす マス
function ghostTarget(g) {
  const m = G.me;
  // ★ 家の 中に いる あいだは、まず「出口の 1つ 上」を めざす。
  //   これを しないと、あおいが 下に いる とき ずっと 家の 中で
  //   ぐるぐる 回って 出て こない。
  if (g.inHouse && g.eaten <= 0) return { x: G.door.x, y: G.door.y - 1 };
  if (g.eaten > 0) return g.home;                    // 食べられたら 家へ もどる
  if (g.scared > 0) return { x: MW - 1 - m.x, y: MH - 1 - m.y };  // にげる
  // ちらばる 時間は、それぞれの すみへ
  if (G.mode === 'scatter') return CORNERS[g.i % CORNERS.length];
  const mind = GHOSTS[g.i % GHOSTS.length].mind;
  if (mind === 'chase') return { x: m.x, y: m.y };
  if (mind === 'ambush') return { x: m.x + m.dx * 4, y: m.y + m.dy * 4 };
  if (mind === 'shy') {
    const d = Math.abs(g.x - m.x) + Math.abs(g.y - m.y);
    return d < 6 ? { x: 0, y: MH - 1 } : { x: m.x, y: m.y };
  }
  // wander … 気まぐれ。ときどき あおいを 見る
  if (!g.wt || g.wt <= 0) {
    g.wt = 1.2 + Math.random() * 1.6;
    g.wp = Math.random() < 0.45
      ? { x: m.x, y: m.y }
      : { x: (Math.random() * MW) | 0, y: (Math.random() * MH) | 0 };
  }
  return g.wp;
}

function stepGhost(g, dt) {
  if (g.out > 0) { g.out -= dt; return; }
  if (g.scared > 0) g.scared = G.fear > 0 ? 1 : 0;
  let sp = G.S.gs;
  if (g.eaten > 0) sp *= 2.2;               // 目だけに なると はやく もどる
  else if (g.scared > 0) sp *= 0.62;        // 青い ときは おそい
  if (tileAt(g.x, g.y) === '-') sp *= 0.7;  // とびらは ゆっくり
  g.p += sp * dt;
  if (g.wt) g.wt -= dt;
  while (g.p >= 1) {
    g.p -= 1;
    g.x = (g.x + g.dx + MW) % MW;
    g.y = g.y + g.dy;
    if (g.eaten > 0 && g.x === g.home.x && g.y === g.home.y) {
      g.eaten = 0; g.scared = 0; g.inHouse = true;   // また 出口を めざす
    }
    if (g.inHouse && g.y < G.door.y) g.inHouse = false;   // 出口を 通りぬけた
    pickGhostDir(g);
  }
}

function pickGhostDir(g) {
  const T = ghostTarget(g);
  let best = null, bv = 1e9;
  for (const [dx, dy] of DIRS) {
    // ★ うしろへは もどらない（行き止まり 以外）。これが「おいかけて いる」感じを 作る
    if (dx === -g.dx && dy === -g.dy) continue;
    const nx = (g.x + dx + MW) % MW, ny = g.y + dy;
    if (!canGo(nx, ny, true)) continue;
    // 目ざす マスに 近く なる 向きを えらぶ
    let d = (nx - T.x) * (nx - T.x) + (ny - T.y) * (ny - T.y);
    if (g.scared > 0) d += Math.random() * 12;   // 青い ときは すこし まよう
    if (d < bv) { bv = d; best = [dx, dy]; }
  }
  if (!best) {
    // どこにも 行けない ときだけ うしろへ
    for (const [dx, dy] of DIRS) {
      const nx = (g.x + dx + MW) % MW, ny = g.y + dy;
      if (canGo(nx, ny, true)) { best = [dx, dy]; break; }
    }
  }
  if (best) { g.dx = best[0]; g.dy = best[1]; }
}

// --- ぶつかり ---------------------------------------------------------------------

function hitCheck() {
  const m = G.me;
  for (const g of G.ghosts) {
    if (g.out > 0 || g.eaten > 0) continue;
    const dx = Math.abs(g.x - m.x), dy = Math.abs(g.y - m.y);
    if (Math.min(dx, MW - dx) > 0 || dy > 0) continue;
    if (g.scared > 0) {
      g.eaten = 1; g.scared = 0;
      const pt = EAT_PT[Math.min(EAT_PT.length - 1, G.chain)];
      G.score += pt;
      G.chain++;
      G.eatPop = { x: g.x, y: g.y, pt: pt, t: 0 };
      sfxEatGhost(G.chain);
      return;
    }
    loseLife();
    return;
  }
}

function loseLife() {
  G.lives--;
  G.dead = 1.6;
  G.fear = 0;
  bgmStop();
  sfxDead();
  if (G.lives <= 0) {
    G.over = true; G.win = false;
    save.hi = Math.max(save.hi, G.score);
    storeSave();
  }
}

function respawn() {
  const M = G.M;
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      if (M.map[y][x] === 'A') { G.me.x = x; G.me.y = y; G.me.sx = x; G.me.sy = y; }
    }
  }
  G.me.dx = -1; G.me.dy = 0; G.me.wx = -1; G.me.wy = 0; G.me.p = 0;
  const gs = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = M.map[y][x];
    if (c >= '1' && c <= '4') gs.push({ x: x, y: y, i: +c - 1 });
  }
  gs.sort((a, b) => a.i - b.i);
  G.ghosts.forEach((g, i) => {
    const s = gs[i % gs.length];
    g.x = s.x; g.y = s.y; g.dx = 0; g.dy = -1; g.p = 0;
    g.out = i === 0 ? 0 : 1.0 + i * 1.2;
    g.scared = 0; g.eaten = 0; g.inHouse = true;
  });
  G.ready = 1.6;
  bgmStart(G.stage);
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.eatPop) { G.eatPop.t += dt; if (G.eatPop.t > 0.9) G.eatPop = null; }
  if (G.screen !== 'play') { bgmPump(); return; }

  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0 && !G.over) respawn();
    bgmPump();
    return;
  }
  if (G.over) { bgmPump(); return; }
  if (G.ready > 0) { G.ready -= dt; bgmPump(); return; }

  // おいかける／ちらばる の 切りかえ
  G.modeT -= dt;
  if (G.modeT <= 0) {
    G.modeI = Math.min(MODE_PLAN.length - 1, G.modeI + 1);
    G.mode = MODE_PLAN[G.modeI].mode;
    G.modeT = MODE_PLAN[G.modeI].sec;
    // 切りかわった しゅんかんは 向きを 反対に する（本家と 同じ 合図）
    for (const g of G.ghosts) if (g.scared <= 0 && g.eaten <= 0 && !g.inHouse) {
      g.dx = -g.dx; g.dy = -g.dy;
    }
  }

  if (G.fear > 0) {
    G.fear -= dt;
    if (G.fear <= 0) { G.fear = 0; G.chain = 0; for (const g of G.ghosts) g.scared = 0; }
  }

  stepMe(dt);
  hitCheck();
  for (const g of G.ghosts) stepGhost(g, dt);
  hitCheck();

  bgmHeat(G.fear > 0 ? 1 : 0);
  bgmPump();
}
