// リナパパの ばくだんめいろ
//
// ★ 1983年ごろの パソコン（MSX）で 人気だった「ばくだんを 置いて
//   ブロックを こわす」ゲームが もと。
//
// ★ そうさ（気もちよさの ために）
//     ・左がわ … スティック（ゆびを 置いた ところが まん中）
//     ・右がわ … どこを おしても ばくだんを 置く
//     ・道に すっと 入れる ように、進む むきの「まん中」へ 自分から そろえる。
//       だから ななめに ずれて いても かどを まがれる。
//
// ★ めんの すすみかた
//     やわらかい ブロックを こわす → どこかに かくし出口 と どうぐが 出る
//     てきを ぜんぶ たおして 出口に のると クリア。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const COLS = 15, ROWS = 11;

const T_FLOOR = 0, T_HARD = 1, T_SOFT = 2;

// めん。soft=やわらかいブロックの数 foes=てきの数 sp=てきの速さ chase=おいかけ率
const STAGES = [
  { soft: 40, foes: 2, sp: 1.4, chase: 0.00, name: '1めん' },
  { soft: 46, foes: 3, sp: 1.5, chase: 0.00, name: '2めん' },
  { soft: 50, foes: 3, sp: 1.7, chase: 0.10, name: '3めん' },
  { soft: 54, foes: 4, sp: 1.8, chase: 0.15, name: '4めん' },
  { soft: 58, foes: 4, sp: 2.0, chase: 0.22, name: '5めん' },
  { soft: 62, foes: 5, sp: 2.1, chase: 0.30, name: '6めん' },
  { soft: 66, foes: 5, sp: 2.3, chase: 0.38, name: '7めん' },
  { soft: 70, foes: 6, sp: 2.4, chase: 0.48, name: 'さいご' },
];

const FOE_COL = ['#FF7A8A', '#8AB4FF', '#7ADCB0', '#FFC63A', '#C88AF0'];

const FUSE = 2.1;            // ばくだんが 光ってから ばくはつまで
const FLAME = 0.46;          // ほのおが のこる 時間
const P_MAX = { fire: 6, bomb: 5, speed: 6.4 };

const SAVE_KEY = 'bomb.save.v1';
const save = { open: 1, clear: {}, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  map: [], item: [], exit: { x: 0, y: 0, shown: false },
  me: null, bombs: [], flames: [], foes: [], pops: [],
  lives: 3, score: 0, fire: 1, maxBomb: 1, speed: 3.4,
  over: false, won: false, dead: 0, ready: 0, msg: '', msgT: 0, time: 0,
};

// --- ばんめん ------------------------------------------------------------------------

function box() {
  const top = HUD + 6, bot = 6;
  const c = Math.floor(Math.min((VH - top - bot) / ROWS, (VW - 24) / COLS));
  return { c: c, x: Math.round((VW - c * COLS) / 2), y: top + Math.round((VH - top - bot - c * ROWS) / 2) };
}
function px(B, x) { return B.x + (x + 0.5) * B.c; }
function py(B, y) { return B.y + (y + 0.5) * B.c; }

function tile(i, j) {
  if (i < 0 || i >= COLS || j < 0 || j >= ROWS) return T_HARD;
  return G.map[j][i];
}
function bombAt(i, j) {
  for (const b of G.bombs) if (b.i === i && b.j === j) return b;
  return null;
}
function flameAt(i, j) {
  for (const f of G.flames) if (f.i === i && f.j === j) return true;
  return false;
}
// パパが 通れるか（自分が 乗って いる ばくだんは 通れる）
function walkable(i, j, ignoreOwn) {
  if (tile(i, j) !== T_FLOOR) return false;
  const b = bombAt(i, j);
  if (b && !(ignoreOwn && b.free)) return false;
  return true;
}

function buildStage(n) {
  const S = STAGES[n];
  G.map = [];
  for (let j = 0; j < ROWS; j++) {
    const row = [];
    for (let i = 0; i < COLS; i++) {
      const hard = (i === 0 || j === 0 || i === COLS - 1 || j === ROWS - 1 ||
                    (i % 2 === 0 && j % 2 === 0));
      row.push(hard ? T_HARD : T_FLOOR);
    }
    G.map.push(row);
  }
  // スタートの まわりは あける
  const safe = {};
  for (const [i, j] of [[1, 1], [2, 1], [1, 2], [3, 1], [1, 3]]) safe[i + ',' + j] = true;

  const spots = [];
  for (let j = 1; j < ROWS - 1; j++) {
    for (let i = 1; i < COLS - 1; i++) {
      if (G.map[j][i] !== T_FLOOR) continue;
      if (safe[i + ',' + j]) continue;
      spots.push([i, j]);
    }
  }
  for (let k = spots.length - 1; k > 0; k--) {
    const m = Math.floor(Math.random() * (k + 1));
    const t = spots[k]; spots[k] = spots[m]; spots[m] = t;
  }
  const soft = spots.slice(0, Math.min(S.soft, spots.length));
  for (const [i, j] of soft) G.map[j][i] = T_SOFT;

  // かくし出口 と どうぐ
  G.item = [];
  for (let j = 0; j < ROWS; j++) G.item.push(new Array(COLS).fill(null));
  const bag = soft.slice();
  const eg = bag.shift();
  G.exit = { x: eg[0], y: eg[1], shown: false };
  const kinds = ['fire', 'fire', 'bomb', 'bomb', 'speed', 'fire', 'bomb'];
  for (let k = 0; k < Math.min(kinds.length, bag.length); k++) {
    G.item[bag[k][1]][bag[k][0]] = kinds[k];
  }

  // てき（スタートから はなれた ところ）
  G.foes = [];
  const far = [];
  for (const [i, j] of spots) {
    if (G.map[j][i] !== T_FLOOR) continue;
    if (i + j < 8) continue;
    far.push([i, j]);
  }
  for (let k = 0; k < S.foes && k < far.length; k++) {
    const [i, j] = far[k];
    G.foes.push({
      x: i, y: j, tx: i, ty: j, sp: S.sp, chase: S.chase,
      col: FOE_COL[k % FOE_COL.length], t: Math.random() * 3, look: 0, alive: true,
    });
  }

  G.me = { x: 1, y: 1, dir: 'd', face: 1, walk: 0 };
  G.bombs = []; G.flames = []; G.pops = [];
  G.dead = 0; G.ready = 1.2;
}

function startStage(n) {
  G.stage = n;
  G.fire = 1; G.maxBomb = 1; G.speed = 3.4;
  G.lives = 3; G.score = 0; G.over = false; G.won = false; G.time = 0;
  buildStage(n);
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n); bgmHeat(0.2);
}

function say(s) { G.msg = s; G.msgT = 1.4; }

// --- そうさ -------------------------------------------------------------------------

function solidFor(pxx, pyy) {
  const i = Math.round(pxx), j = Math.round(pyy);
  if (tile(i, j) !== T_FLOOR) return true;
  const b = bombAt(i, j);
  if (b && !b.free) return true;
  return false;
}
const RAD = 0.30;
function blocked(x, y) {
  return solidFor(x - RAD, y - RAD) || solidFor(x + RAD, y - RAD) ||
         solidFor(x - RAD, y + RAD) || solidFor(x + RAD, y + RAD);
}
function moveMe(dx, dy) {
  const me = G.me;
  if (dx) {
    const nx = me.x + dx;
    if (!blocked(nx, me.y)) me.x = nx;
  }
  if (dy) {
    const ny = me.y + dy;
    if (!blocked(me.x, ny)) me.y = ny;
  }
}

function dirOf() {
  if (IN.hold && (Math.abs(IN.ax) > 0.18 || Math.abs(IN.ay) > 0.18)) {
    return Math.abs(IN.ax) > Math.abs(IN.ay) ? (IN.ax > 0 ? 'r' : 'l') : (IN.ay > 0 ? 'd' : 'u');
  }
  return keyDir();
}

function control(dt) {
  const me = G.me;
  const d = dirOf();
  const sp = G.speed * dt;
  const al = G.speed * 1.25 * dt;      // 道の まん中へ そろえる 速さ
  if (d === 'l' || d === 'r') {
    me.face = d === 'r' ? 1 : -1;
    const lane = Math.round(me.y);
    const gap = lane - me.y;
    if (Math.abs(gap) > 0.001) moveMe(0, clamp(gap, -al, al));
    moveMe(d === 'r' ? sp : -sp, 0);
    me.walk += dt;
  } else if (d === 'u' || d === 'd') {
    const lane = Math.round(me.x);
    const gap = lane - me.x;
    if (Math.abs(gap) > 0.001) moveMe(clamp(gap, -al, al), 0);
    moveMe(0, d === 'd' ? sp : -sp);
    me.walk += dt;
  }
  if (d) me.dir = d;

  // 自分の ばくだんから 出たら、もう 通れなく する。
  // ★ からだの はば（RAD）が ぜんぶ ますの そとに 出て から かたく する。
  //   はやく かたく すると、はみ出た かどが かべに あたって その場に はさまり、
  //   自分の ばくはつで やられて しまう。
  const OUT = 0.5 + RAD + 0.02;
  for (const b of G.bombs) {
    if (!b.free) continue;
    if (Math.abs(b.i - me.x) > OUT || Math.abs(b.j - me.y) > OUT) b.free = false;
  }

  if (IN.fireTap || (KEYS.Space && !G.ks)) putBomb();
  G.ks = KEYS.Space;
}

function putBomb() {
  if (G.bombs.length >= G.maxBomb) return;
  const i = Math.round(G.me.x), j = Math.round(G.me.y);
  if (tile(i, j) !== T_FLOOR || bombAt(i, j)) return;
  G.bombs.push({ i: i, j: j, t: FUSE, free: true, r: G.fire });
  if (A.ctx) tone(anow(), 60, 0.08, 0.10, 'square', null, 48);
}

// --- ばくはつ -----------------------------------------------------------------------

function boom(b) {
  const cells = [{ i: b.i, j: b.j, c: true }];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    for (let k = 1; k <= b.r; k++) {
      const i = b.i + dx * k, j = b.j + dy * k;
      const tv = tile(i, j);
      if (tv === T_HARD) break;
      if (tv === T_SOFT) {
        G.map[j][i] = T_FLOOR;
        G.score += 10;
        G.pops.push({ x: i, y: j, t: 0.4 });
        if (G.exit.x === i && G.exit.y === j) { G.exit.shown = true; say('出口が 出た！'); }
        cells.push({ i: i, j: j, end: true, dx: dx, dy: dy });
        break;
      }
      cells.push({ i: i, j: j, dx: dx, dy: dy, tip: k === b.r });
      const ob = bombAt(i, j);
      if (ob && ob.t > 0.02) ob.t = 0.02;      // れんさ
    }
  }
  for (const c of cells) G.flames.push({ i: c.i, j: c.j, t: FLAME, c: c.c, dx: c.dx || 0, dy: c.dy || 0 });
  sfxHit();
  if (A.ctx) { const t = anow(); nz(t, 0.28, 0.30, 60, 900); nz(t, 0.14, 0.16, 900, 4000); }
}

function hurtMe() {
  if (G.dead > 0 || G.won) return;
  G.dead = 1.5;
  G.lives--;
  bgmStop(); sfxDead();
}

// --- てき ---------------------------------------------------------------------------

function foeFree(i, j) {
  if (tile(i, j) !== T_FLOOR) return false;
  if (bombAt(i, j)) return false;
  return true;
}
function pickFoeDir(e) {
  const i = Math.round(e.x), j = Math.round(e.y);
  const opts = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (foeFree(i + dx, j + dy)) opts.push([dx, dy]);
  }
  if (!opts.length) { e.tx = i; e.ty = j; return; }
  let pick = null;
  if (Math.random() < e.chase) {
    let best = 1e9;
    for (const [dx, dy] of opts) {
      const d = Math.abs(i + dx - G.me.x) + Math.abs(j + dy - G.me.y);
      if (d < best) { best = d; pick = [dx, dy]; }
    }
  } else {
    // まっすぐ 進みたい
    const keep = opts.filter((o) => o[0] === e.lx && o[1] === e.ly);
    if (keep.length && Math.random() < 0.72) pick = keep[0];
    else pick = opts[Math.floor(Math.random() * opts.length)];
  }
  e.lx = pick[0]; e.ly = pick[1];
  e.tx = i + pick[0]; e.ty = j + pick[1];
  e.look = pick[0];
}
function stepFoe(e, dt) {
  e.t += dt;
  const dx = e.tx - e.x, dy = e.ty - e.y;
  const d = Math.hypot(dx, dy);
  const step = e.sp * dt;
  if (d <= step || d < 1e-6) {
    e.x = e.tx; e.y = e.ty;
    pickFoeDir(e);
  } else {
    e.x += dx / d * step; e.y += dy / d * step;
  }
}

// --- まいコマ -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play') return;
  if (G.over) return;

  for (let k = G.pops.length - 1; k >= 0; k--) {
    G.pops[k].t -= dt;
    if (G.pops[k].t <= 0) G.pops.splice(k, 1);
  }

  if (G.won) { G.ready -= dt; return; }

  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) {
      if (G.lives <= 0) { G.over = true; sfxOver(); storeSave(); }
      else { buildStage(G.stage); bgmStart(G.stage); }
    }
    return;
  }
  if (G.ready > 0) { G.ready -= dt; return; }

  G.time += dt;
  control(dt);

  for (let k = G.bombs.length - 1; k >= 0; k--) {
    const b = G.bombs[k];
    b.t -= dt;
    if (b.t <= 0) { G.bombs.splice(k, 1); boom(b); }
  }
  for (let k = G.flames.length - 1; k >= 0; k--) {
    G.flames[k].t -= dt;
    if (G.flames[k].t <= 0) G.flames.splice(k, 1);
  }

  for (const e of G.foes) if (e.alive) stepFoe(e, dt);

  // ほのおに あたった か
  const mi = Math.round(G.me.x), mj = Math.round(G.me.y);
  if (flameAt(mi, mj)) { hurtMe(); return; }
  for (const e of G.foes) {
    if (!e.alive) continue;
    if (flameAt(Math.round(e.x), Math.round(e.y))) {
      e.alive = false; G.score += 100;
      G.pops.push({ x: e.x, y: e.y, t: 0.5, col: e.col });
      sfxPop();
      continue;
    }
    if (Math.abs(e.x - G.me.x) < 0.66 && Math.abs(e.y - G.me.y) < 0.66) { hurtMe(); return; }
  }

  // どうぐ
  if (G.item[mj][mi] && tile(mi, mj) === T_FLOOR) {
    const it = G.item[mj][mi];
    G.item[mj][mi] = null;
    if (it === 'fire') { G.fire = Math.min(P_MAX.fire, G.fire + 1); say('ばくはつが 大きく なった！'); }
    if (it === 'bomb') { G.maxBomb = Math.min(P_MAX.bomb, G.maxBomb + 1); say('ばくだんが ふえた！'); }
    if (it === 'speed') { G.speed = Math.min(P_MAX.speed, G.speed + 0.6); say('足が 速く なった！'); }
    G.score += 50;
    sfxGet();
  }

  // クリア
  let left = 0;
  for (const e of G.foes) if (e.alive) left++;
  if (left === 0 && G.exit.shown && mi === G.exit.x && mj === G.exit.y) {
    G.won = true; G.ready = 1.0;
    G.score += 500 + Math.max(0, Math.round(600 - G.time * 3));
    save.clear[G.stage] = true;
    if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
    storeSave();
    bgmStop(); sfxClear(true);
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawTileHard(B, i, j) {
  const x = B.x + i * B.c, y = B.y + j * B.c, c = B.c;
  ctx.fillStyle = '#5A6480';
  rr(x + 1, y + 1, c - 2, c - 2, c * 0.18); ctx.fill();
  ctx.fillStyle = '#7A86A8';
  rr(x + 3, y + 3, c - 6, (c - 6) * 0.42, c * 0.14); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  rr(x + 3, y + c * 0.62, c - 6, c * 0.28, c * 0.1); ctx.fill();
}
function drawTileSoft(B, i, j) {
  const x = B.x + i * B.c, y = B.y + j * B.c, c = B.c;
  ctx.fillStyle = '#A8703A';
  rr(x + 2, y + 2, c - 4, c - 4, c * 0.16); ctx.fill();
  ctx.fillStyle = '#C88A4A';
  rr(x + 4, y + 4, c - 8, (c - 8) * 0.44, c * 0.12); ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,20,0.55)'; ctx.lineWidth = Math.max(1, c * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + 4, y + c * 0.5); ctx.lineTo(x + c - 4, y + c * 0.5);
  ctx.moveTo(x + c * 0.5, y + 4); ctx.lineTo(x + c * 0.5, y + c - 4);
  ctx.stroke();
}
function drawItem(B, i, j, kind) {
  const x = px(B, i), y = py(B, j), c = B.c;
  const bob = Math.sin(G.t * 4 + i + j) * c * 0.05;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  circle(x, y + c * 0.30, c * 0.24); ctx.fill();
  const col = kind === 'fire' ? '#FF8A3A' : kind === 'bomb' ? '#8AB4FF' : '#7ADCB0';
  ctx.fillStyle = col;
  rr(x - c * 0.28, y - c * 0.28 + bob, c * 0.56, c * 0.56, c * 0.16); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(x - c * 0.28, y - c * 0.28 + bob, c * 0.56, c * 0.22, c * 0.1); ctx.fill();
  ctx.fillStyle = '#2A2038';
  const s = c * 0.2;
  if (kind === 'fire') {
    ctx.beginPath();
    ctx.moveTo(x, y - s + bob); ctx.lineTo(x + s * 0.8, y + s * 0.7 + bob);
    ctx.lineTo(x - s * 0.8, y + s * 0.7 + bob); ctx.closePath(); ctx.fill();
  } else if (kind === 'bomb') {
    circle(x, y + s * 0.18 + bob, s * 0.72); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, y - s + bob); ctx.lineTo(x - s * 0.6, y + s * 0.15 + bob);
    ctx.lineTo(x + s * 0.05, y + s * 0.15 + bob); ctx.lineTo(x - s * 0.4, y + s + bob);
    ctx.lineTo(x + s * 0.7, y - s * 0.15 + bob); ctx.lineTo(x, y - s * 0.15 + bob);
    ctx.closePath(); ctx.fill();
  }
}
function drawExit(B) {
  const x = px(B, G.exit.x), y = py(B, G.exit.y), c = B.c;
  ctx.fillStyle = '#2A2038';
  rr(x - c * 0.36, y - c * 0.36, c * 0.72, c * 0.72, c * 0.12); ctx.fill();
  const k = 0.5 + 0.5 * Math.sin(G.t * 5);
  ctx.fillStyle = 'rgba(255,210,74,' + (0.4 + k * 0.6) + ')';
  ctx.beginPath();
  ctx.moveTo(x, y - c * 0.26);
  ctx.lineTo(x + c * 0.26, y);
  ctx.lineTo(x, y + c * 0.26);
  ctx.lineTo(x - c * 0.26, y);
  ctx.closePath(); ctx.fill();
}
function drawBomb(B, b) {
  const x = px(B, b.i), y = py(B, b.j), c = B.c;
  const k = 1 + Math.sin(b.t * 16) * 0.09;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y + c * 0.30, c * 0.30, c * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = b.t < 0.6 && Math.sin(b.t * 40) > 0 ? '#FF9AA8' : '#242838';
  circle(x, y, c * 0.32 * k); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  circle(x - c * 0.11, y - c * 0.12, c * 0.08); ctx.fill();
  ctx.strokeStyle = '#B0A090'; ctx.lineWidth = Math.max(1.5, c * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + c * 0.14, y - c * 0.26);
  ctx.quadraticCurveTo(x + c * 0.30, y - c * 0.42, x + c * 0.22, y - c * 0.52);
  ctx.stroke();
  ctx.fillStyle = '#FFD24A';
  circle(x + c * 0.22, y - c * 0.54, c * 0.07 * (1 + Math.sin(G.t * 30) * 0.3)); ctx.fill();
}
function drawFlame(B, f) {
  const x = px(B, f.i), y = py(B, f.j), c = B.c;
  const a = clamp(f.t / FLAME, 0, 1);
  const g = ctx.createRadialGradient(x, y, c * 0.05, x, y, c * 0.56);
  g.addColorStop(0, 'rgba(255,255,220,' + (0.95 * a) + ')');
  g.addColorStop(0.5, 'rgba(255,170,60,' + (0.85 * a) + ')');
  g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - c * 0.55, y - c * 0.55, c * 1.1, c * 1.1);
}

function drawPlay() {
  const B = box();
  bgGrad('#1E2A46', '#0A0E1C');

  // ゆか
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      ctx.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(B.x + i * B.c, B.y + j * B.c, B.c, B.c);
    }
  }
  // 出口・どうぐ（ゆかの 上）
  if (G.exit.shown) drawExit(B);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (G.map[j][i] === T_FLOOR && G.item[j][i]) drawItem(B, i, j, G.item[j][i]);
    }
  }
  // ブロック
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (G.map[j][i] === T_HARD) drawTileHard(B, i, j);
      else if (G.map[j][i] === T_SOFT) drawTileSoft(B, i, j);
    }
  }
  for (const b of G.bombs) drawBomb(B, b);

  // てき
  for (const e of G.foes) {
    if (!e.alive) continue;
    drawBlob(px(B, e.x), py(B, e.y) - B.c * 0.06, B.c * 0.26, e.col, { t: e.t, look: e.look });
  }

  // パパ
  if (G.dead <= 0 || Math.sin(G.t * 24) > 0) {
    const s = B.c * 0.50;
    drawPapa(px(B, G.me.x), py(B, G.me.y) - B.c * 0.10, s, {
      dir: G.me.face, walk: G.me.walk, shirt: '#4AA0E0',
      face: G.dead > 0 ? 'oops' : 'happy',
    });
  }

  for (const f of G.flames) drawFlame(B, f);
  for (const p of G.pops) {
    const a = clamp(p.t / 0.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col || '#E8C08A';
    for (let k = 0; k < 6; k++) {
      const an = k / 6 * Math.PI * 2;
      const r = (1 - a) * B.c * 0.7;
      circle(px(B, p.x) + Math.cos(an) * r, py(B, p.y) + Math.sin(an) * r, B.c * 0.09);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawStick();
  drawFire('ばくだん', '#FF8A3A');
  drawHud();

  if (G.ready > 0 && !G.won && G.dead <= 0) {
    bigText(STAGES[G.stage].name + '　スタート！', VW / 2, VH * 0.44, 34, '#FFD24A');
  }
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, HUD + 30, 22, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.won && G.ready <= 0) {
    const last = G.stage >= STAGES.length - 1;
    drawResult(true, last ? 'ぜんぶ クリア！' : 'クリア！',
      ['スコア ' + G.score, last ? 'おめでとう！ さいごまで いけた！' : 'つぎの めんへ すすもう'],
      last ? [{ label: 'タイトルへ', on: () => { G.screen = 'title'; } }]
           : [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
              { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
  if (G.over) {
    drawResult(false, 'ゲームオーバー',
      ['スコア ' + G.score, STAGES[G.stage].name + 'で やられた'],
      [{ label: 'もういちど', on: () => startStage(G.stage) },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(STAGES[G.stage].name, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#DCE4FF';
  ctx.fillText('スコア ' + G.score, 74, HUD / 2);
  let left = 0;
  for (const e of G.foes) if (e.alive) left++;
  ctx.fillText('てき ' + left, 186, HUD / 2);
  ctx.fillText('ばくだん ' + G.maxBomb + '　力 ' + G.fire, 252, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('のこり ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#22305A', '#080C18');
  bigText('リナパパの', VW / 2, 40, 22, '#FFC0DC');
  bigText('ばくだんめいろ', VW / 2, 78, fitSize('ばくだんめいろ', VW * 0.6, 46), '#FF8A3A');
  bigText('ばくだんで ブロックを こわし、てきを ぜんぶ たおして 出口へ', VW / 2, 118, 16, '#DDE4FF', null);
  bigText('左で 動く／右を おすと ばくだん', VW / 2, 142, 15, '#B8C4E8', null);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 168,
                        (i) => startStage(i), '#FF8A3A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#22305A', '#080C18');
  bigText('あそびかた', VW / 2, 40, 28, '#FF8A3A');
  const lines = [
    '① 左がわを さわると スティックが 出る。さわった ところが まん中',
    '② 右がわは どこを おしても ばくだんを 置く。すぐ にげよう',
    '③ 茶色い ブロックは こわせる。中から どうぐ や かくし出口 が 出る',
    '④ 火 = ばくはつが 大きく／たま = ばくだんが ふえる／くつ = 足が 速い',
    '⑤ てきを ぜんぶ たおして 出口に のると クリア。ぜんぶで 8めん',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 92 + i * 34, fitSize(s, VW * 0.88, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
