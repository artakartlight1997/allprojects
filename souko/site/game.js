// エイトくんの そうこばん
//
// ★ 1982年の「倉庫番」。にもつは **おす ことしか できない**。
//   引っぱれないので、かべぎわに よせて しまうと 二度と 動かせない。
//   ここが この あそびの ぜんぶ。
//
// ★ 「詰んだ」に 気づけないと つまらないので、
//   ・**もどす（Undo）は 何回でも**。1手ずつ ずっと まきもどせる
//   ・**もう 動かせない にもつは 赤くして 教える**（角に はまった とき）
//   の 2つを 入れて ある。
//
// ★ そうさは 2とおり。
//   ・左の スティック（← → ↑ ↓）で 1ますずつ うごく／おす
//   ・**行きたい ますを タップ**すると、そこまで じどうで 歩く
//     （にもつの ある ますを タップしたら、ならんで いれば おす）
//
// ★ めんは tools/genlevels.py が 作る。
//   「解けた かたちから 時間を まきもどす」やりかたなので **かならず 解ける**。
//   さいたんの おす かずも 解きプログラムで 数えて あって、
//   それを「もくひょう」として 見せて いる。
//
// 絵は ぜんぶ canvas、音は ぜんぶ WebAudio（画像・音の ファイルは 使わない）。

'use strict';

const GAME_VER = 1;
const HUD = 30;
const STEP_T = 0.085;          // 1ます うごくのに かかる 時間
const REPEAT_T = 0.13;         // スティックを たおしっぱなしの ときの あいだ

// --- セーブ ---------------------------------------------------------------------------
const SAVE_KEY = 'souko.save.v1';
const save = { clear: {}, best: {}, plays: 0, undo: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.undo)) save.undo = s.undo;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- 音 --------------------------------------------------------------------------------
// ★ さいしょ 0.030 に して いたら、はかると ほとんど 波が 出て いなかった
//   （あるく 音なので 小さくは したいが、聞こえない のは だめ）
function sfxStep() { if (A.ctx) nz(anow(), 0.06, 0.13, 240, 1500); }
function sfxPush() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.10, 0.075, 160, 900);
  tone(t, 44, 0.08, 0.055, 'triangle', null, 38);
}
function sfxSet() { if (A.ctx) bleep(anow(), [79, 84], 0.05, 0.10, 0.12); }
function sfxOff() { if (A.ctx) tone(anow(), 60, 0.07, 0.055, 'square', null, 54); }
function sfxUndo() { if (A.ctx) bleep(anow(), [72, 65], 0.05, 0.09, 0.09); }
function sfxBump() { if (A.ctx) tone(anow(), 40, 0.06, 0.05, 'square', null, 34); }
function sfxStuck() { if (A.ctx) bleep(anow(), [58, 54], 0.09, 0.14, 0.09); }
function sfxWin() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14);
  kick(t, 0.7); kick(t + 0.42, 0.7);
}

// --- ばん ------------------------------------------------------------------------------
const DIRS = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };

const G = {
  screen: 'title', t: 0,
  li: 0, lv: null,
  w: 0, h: 0, wall: null, goal: null,
  boxes: [], px: 0, py: 0, face: 'd',
  moves: 0, pushes: 0, undos: [],
  anim: null, path: [], stepT: 0, holdT: 0, lastTap: null,
  win: false, winT: 0, shake: 0,
  msg: '', msgT: 0,
};

function at(x, y) { return y >= 0 && y < G.h && x >= 0 && x < G.w ? G.wall[y][x] : 1; }
function boxAt(x, y) {
  for (let i = 0; i < G.boxes.length; i++) if (G.boxes[i].x === x && G.boxes[i].y === y) return i;
  return -1;
}
function isGoal(x, y) { return y >= 0 && y < G.h && x >= 0 && x < G.w && G.goal[y][x] === 1; }
function done() {
  for (const b of G.boxes) if (!isGoal(b.x, b.y)) return false;
  return true;
}

function startLevel(i) {
  audioStart();
  G.li = i;
  const lv = LEVELS[i];
  G.lv = lv;
  G.h = lv.rows.length;
  G.w = Math.max.apply(null, lv.rows.map((r) => r.length));
  G.wall = []; G.goal = []; G.boxes = [];
  for (let y = 0; y < G.h; y++) {
    G.wall.push(new Array(G.w).fill(1));
    G.goal.push(new Array(G.w).fill(0));
    const row = lv.rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#') continue;
      G.wall[y][x] = 0;
      if (c === '.' || c === '*' || c === '+') G.goal[y][x] = 1;
      if (c === '$' || c === '*') G.boxes.push({ x, y, ax: x, ay: y });
      if (c === '@' || c === '+') { G.px = x; G.py = y; }
    }
  }
  G.face = 'd';
  G.moves = 0; G.pushes = 0; G.undos = [];
  G.anim = null; G.path = []; G.stepT = 0; G.holdT = 0; G.lastTap = null;
  G.win = false; G.winT = 0; G.shake = 0;
  G.msg = lv.name; G.msgT = 1.6;
  save.plays++; storeSave();
  G.screen = 'play';
}

// --- うごく ---------------------------------------------------------------------------
function tryMove(dir) {
  if (G.win || G.anim) return false;
  const d = DIRS[dir];
  if (!d) return false;
  G.face = dir;
  const nx = G.px + d[0], ny = G.py + d[1];
  if (at(nx, ny)) { sfxBump(); return false; }
  const bi = boxAt(nx, ny);
  if (bi < 0) {
    G.undos.push({ dx: d[0], dy: d[1], bi: -1 });
    G.anim = { kind: 'walk', t: 0, dx: d[0], dy: d[1], bi: -1 };
    G.px = nx; G.py = ny; G.moves++;
    sfxStep();
    return true;
  }
  // にもつを おす
  const tx = nx + d[0], ty = ny + d[1];
  if (at(tx, ty) || boxAt(tx, ty) >= 0) { sfxBump(); return false; }
  const wasOn = isGoal(nx, ny);
  G.undos.push({ dx: d[0], dy: d[1], bi: bi });
  G.anim = { kind: 'push', t: 0, dx: d[0], dy: d[1], bi: bi };
  G.boxes[bi].x = tx; G.boxes[bi].y = ty;
  G.px = nx; G.py = ny; G.moves++; G.pushes++;
  const nowOn = isGoal(tx, ty);
  if (nowOn && !wasOn) sfxSet();
  else if (!nowOn && wasOn) sfxOff();
  else sfxPush();
  if (done()) {
    G.win = true; G.winT = 0;
    sfxWin();
    save.clear['s' + G.li] = 1;
    const b = save.best['s' + G.li];
    if (!b || G.pushes < b) save.best['s' + G.li] = G.pushes;
    storeSave();
  } else if (stuck(tx, ty)) {
    sfxStuck();
    G.msg = 'この にもつは もう 動かせない！「もどす」で やりなおそう';
    G.msgT = 2.4;
  }
  return true;
}

function undo() {
  if (!G.undos.length || G.anim) return;
  G.win = false;
  const u = G.undos.pop();
  G.px -= u.dx; G.py -= u.dy;
  if (u.bi >= 0) {
    const b = G.boxes[u.bi];
    b.x -= u.dx; b.y -= u.dy;
    b.ax = b.x; b.ay = b.y;
    G.pushes = Math.max(0, G.pushes - 1);
  }
  G.moves = Math.max(0, G.moves - 1);
  G.path.length = 0;
  save.undo++; storeSave();
  sfxUndo();
}

// ★ かどに はまった にもつは 二度と 動かせない。気づかずに 何十手も
//   つづけると かなしいので、その場で 赤くして 音でも 教える。
function stuck(x, y) {
  if (isGoal(x, y)) return false;
  const up = at(x, y - 1) || boxAt(x, y - 1) >= 0;
  const dn = at(x, y + 1) || boxAt(x, y + 1) >= 0;
  const lf = at(x - 1, y) || boxAt(x - 1, y) >= 0;
  const rt = at(x + 1, y) || boxAt(x + 1, y) >= 0;
  // にもつ どうしで つまった ときは 動かせる ことも あるので かべだけ 見る
  const wu = at(x, y - 1), wd = at(x, y + 1), wl = at(x - 1, y), wr = at(x + 1, y);
  if ((wu || wd) && (wl || wr)) return true;
  return (up && dn && lf && rt);
}

// --- タップで じどうで 歩く -----------------------------------------------------------
function walkTo(gx, gy) {
  if (G.win || at(gx, gy)) return;
  const bi = boxAt(gx, gy);
  if (bi >= 0) {
    // にもつを タップ: ならんで いれば おす
    const dx = gx - G.px, dy = gy - G.py;
    if (dx === 0 && Math.abs(dy) === 1) tryMove(dy > 0 ? 'd' : 'u');
    else if (dy === 0 && Math.abs(dx) === 1) tryMove(dx > 0 ? 'r' : 'l');
    else { G.msg = 'にもつの となりに 立ってから おそう'; G.msgT = 1.6; }
    return;
  }
  // にもつを 動かさずに 行ける か（幅ゆうせん さがし）
  const prev = new Map();
  const key = (x, y) => y * G.w + x;
  const q = [[G.px, G.py]];
  const seen = new Set([key(G.px, G.py)]);
  let found = false;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === gx && y === gy) { found = true; break; }
    for (const k of ['u', 'd', 'l', 'r']) {
      const d = DIRS[k];
      const nx = x + d[0], ny = y + d[1];
      if (at(nx, ny) || boxAt(nx, ny) >= 0) continue;
      const kk = key(nx, ny);
      if (seen.has(kk)) continue;
      seen.add(kk);
      prev.set(kk, [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!found) { G.msg = 'そこへは 行けない'; G.msgT = 1.2; return; }
  const steps = [];
  let cx = gx, cy = gy;
  while (!(cx === G.px && cy === G.py)) {
    const p = prev.get(key(cx, cy));
    if (!p) break;
    steps.push(p[2]);
    cx = p[0]; cy = p[1];
  }
  steps.reverse();
  G.path = steps;
}

// --- まいコマ -------------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; return; }
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.win) G.winT += dt;

  // うごきの えんしゅつ
  if (G.anim) {
    G.anim.t += dt;
    if (G.anim.t >= STEP_T) {
      if (G.anim.bi >= 0) {
        const b = G.boxes[G.anim.bi];
        b.ax = b.x; b.ay = b.y;
      }
      G.anim = null;
    }
  }

  const dir = IN.dir || keyDir();

  if (!G.anim) {
    if (G.path.length) {
      // タップで きめた みちを 1ますずつ
      const k = G.path.shift();
      if (!tryMove(k)) G.path.length = 0;
    } else if (dir) {
      // ★ たおしっぱなしでも すすむ。ただし 1ますずつ 間を あける。
      if (G.holdT <= 0) { tryMove(dir); G.holdT = REPEAT_T; }
    }
  }
  if (dir) G.holdT -= dt; else G.holdT = 0;

  // ★ 画面ぜんぶが スティックなので、タップと スティックが ぶつかる。
  //   「ゆびを おいた ばしょ」を おぼえて おいて、**ほとんど 動かさずに
  //   はなした ときだけ**「そこへ 歩く」に する。
  //   うごかす きょりの しきい は スティックの あそび（STICK_DEAD）と
  //   おなじに して あるので、歩くつもりの タップで 1ます うごく ことは ない。
  if (IN.taps.length) G.lastTap = IN.taps[IN.taps.length - 1];
  if (IN.released && G.lastTap && IN.moved < 15 / SC) {
    const c = cellAt(G.lastTap.x, G.lastTap.y);
    if (c) { G.path.length = 0; walkTo(c.x, c.y); }
    G.lastTap = null;
  }
  IN.taps.length = 0;
  IN.fireTap = false;
}

// --- ばんの ばしょ --------------------------------------------------------------------
function view() {
  const top = HUD + 26, bot = 12;
  const availH = VH - top - bot;
  const availW = VW * 0.66;                 // 左右の そうさに ばしょを のこす
  const ts = Math.floor(Math.min(availW / G.w, availH / G.h, 54));
  return { ts, x0: Math.round(VW / 2 - G.w * ts / 2), y0: Math.round(top + (availH - G.h * ts) / 2) };
}

function cellAt(vx, vy) {
  const v = view();
  const x = Math.floor((vx - v.x0) / v.ts), y = Math.floor((vy - v.y0) / v.ts);
  if (x < 0 || y < 0 || x >= G.w || y >= G.h) return null;
  return { x, y };
}

// --- 絵 --------------------------------------------------------------------------------
function drawPlay() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A2440'); g.addColorStop(1, '#171226');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  const v = view();
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  // ゆか と かべ
  for (let y = 0; y < G.h; y++) {
    for (let x = 0; x < G.w; x++) {
      const px = v.x0 + x * v.ts, py = v.y0 + y * v.ts;
      if (at(x, y)) {
        if (nearFloor(x, y)) {
          ctx.fillStyle = '#6A5A92';
          rr(px + 1, py + 1, v.ts - 2, v.ts - 2, v.ts * 0.16); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.13)';
          rr(px + 1, py + 1, v.ts - 2, v.ts * 0.30, v.ts * 0.12); ctx.fill();
        }
        continue;
      }
      ctx.fillStyle = (x + y) % 2 ? '#3E3560' : '#453B69';
      ctx.fillRect(px, py, v.ts, v.ts);
      if (isGoal(x, y)) {
        ctx.strokeStyle = '#FFD24A';
        ctx.lineWidth = Math.max(2, v.ts * 0.09);
        circle(px + v.ts / 2, py + v.ts / 2, v.ts * 0.24); ctx.stroke();
        ctx.fillStyle = 'rgba(255,210,74,0.16)';
        circle(px + v.ts / 2, py + v.ts / 2, v.ts * 0.24); ctx.fill();
      }
    }
  }

  // にもつ
  for (const b of G.boxes) {
    let bx = b.x, by = b.y;
    if (G.anim && G.anim.bi >= 0 && G.boxes[G.anim.bi] === b) {
      const k = 1 - Math.min(1, G.anim.t / STEP_T);
      bx = b.x - G.anim.dx * k; by = b.y - G.anim.dy * k;
    }
    drawBox(v.x0 + bx * v.ts, v.y0 + by * v.ts, v.ts, isGoal(b.x, b.y), stuck(b.x, b.y));
  }

  // エイトくん
  let px = G.px, py = G.py;
  if (G.anim) {
    const k = 1 - Math.min(1, G.anim.t / STEP_T);
    px = G.px - G.anim.dx * k; py = G.py - G.anim.dy * k;
  }
  drawEito(v.x0 + px * v.ts + v.ts / 2, v.y0 + py * v.ts + v.ts, v.ts, G.face);
  ctx.restore();

  drawHud();
  drawControls();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    const fs = fitSize(G.msg, VW * 0.86, 20);
    ctx.fillStyle = 'rgba(10,6,22,0.8)';
    const w = VW * 0.88;
    rr(VW / 2 - w / 2, VH - 46, w, 30, 15); ctx.fill();
    bigText(G.msg, VW / 2, VH - 31, fs, '#FFF6C8', null);
    ctx.globalAlpha = 1;
  }

  if (G.win) {
    const b = LEVELS[G.li].best;
    const perfect = G.pushes <= b;
    drawResult(true, perfect ? 'かんぺき！' : 'クリア！',
      ['おした かず ' + G.pushes + '（もくひょう ' + b + '）　あるいた かず ' + G.moves,
       perfect ? 'さいたん手数だ！ すごい！' : 'あと ' + (G.pushes - b) + 'おし へらせる'],
      G.li + 1 < LEVELS.length
        ? [{ label: 'もういちど', on: () => startLevel(G.li) },
           { label: 'つぎの めん', on: () => startLevel(G.li + 1), col: '#8AF0B0' },
           { label: 'めんを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startLevel(G.li) },
           { label: 'めんを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

// かべは 「ゆかの となり」だけ かく（そとの まっくろな ぶぶんは かかない）
function nearFloor(x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!at(x + dx, y + dy)) return true;
    }
  }
  return false;
}

function drawBox(px, py, ts, on, bad) {
  const m = ts * 0.09;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(px + m + 2, py + m + 3, ts - m * 2, ts - m * 2, ts * 0.16); ctx.fill();
  ctx.fillStyle = bad ? '#C85A5A' : on ? '#5FC98A' : '#C89050';
  rr(px + m, py + m, ts - m * 2, ts - m * 2, ts * 0.16); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  rr(px + m, py + m, ts - m * 2, (ts - m * 2) * 0.32, ts * 0.12); ctx.fill();
  // ひも
  ctx.strokeStyle = bad ? '#8A2E2E' : on ? '#2E7A52' : '#7A5230';
  ctx.lineWidth = Math.max(2, ts * 0.07);
  ctx.beginPath();
  ctx.moveTo(px + ts / 2, py + m); ctx.lineTo(px + ts / 2, py + ts - m);
  ctx.moveTo(px + m, py + ts / 2); ctx.lineTo(px + ts - m, py + ts / 2);
  ctx.stroke();
  if (on) {                            // ★ ○に のった にもつは 色を まるごと かえる。
    ctx.fillStyle = '#EAFFF2';         //   星だけだと 遠目に 見分けが つかなかった。
    star(px + ts / 2, py + ts / 2, ts * 0.18);
  }
  if (bad) {
    ctx.strokeStyle = '#FF8A8A'; ctx.lineWidth = Math.max(2, ts * 0.08);
    const q = ts * 0.22;
    ctx.beginPath();
    ctx.moveTo(px + ts / 2 - q, py + ts / 2 - q); ctx.lineTo(px + ts / 2 + q, py + ts / 2 + q);
    ctx.moveTo(px + ts / 2 + q, py + ts / 2 - q); ctx.lineTo(px + ts / 2 - q, py + ts / 2 + q);
    ctx.stroke();
  }
}

function star(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    else ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath(); ctx.fill();
}

// エイトくん（足もとが (x, y)）
function drawEito(x, y, ts, face) {
  const s = ts * 0.42;
  const bob = Math.sin(G.t * 4) * s * 0.05;
  const dir = face === 'l' ? -1 : face === 'r' ? 1 : 0;
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x, y - s * 0.06, s * 0.62, s * 0.20, 0, 0, Math.PI * 2); ctx.fill();
  // あし
  ctx.strokeStyle = '#3A4A6A'; ctx.lineWidth = s * 0.26; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, y - s * 0.52); ctx.lineTo(x - s * 0.24, y - s * 0.10);
  ctx.moveTo(x + s * 0.22, y - s * 0.52); ctx.lineTo(x + s * 0.24, y - s * 0.10);
  ctx.stroke();
  // からだ
  ctx.fillStyle = '#3EC08A';
  rr(x - s * 0.46, y - s * 1.28 + bob, s * 0.92, s * 0.80, s * 0.24); ctx.fill();
  // うで
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.20;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y - s * 1.02 + bob); ctx.lineTo(x - s * 0.62 + dir * s * 0.2, y - s * 0.72 + bob);
  ctx.moveTo(x + s * 0.42, y - s * 1.02 + bob); ctx.lineTo(x + s * 0.62 + dir * s * 0.2, y - s * 0.72 + bob);
  ctx.stroke();
  // あたま
  const hy = y - s * 1.72 + bob;
  ctx.fillStyle = '#F6CDA8';
  circle(x, hy, s * 0.52); ctx.fill();
  // キャップ
  ctx.fillStyle = '#E8506A';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.06, s * 0.54, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillRect(x + (face === 'l' ? -s * 0.90 : 0), hy - s * 0.18, s * 0.90, s * 0.12);
  // 目
  ctx.fillStyle = '#2A2028';
  if (face === 'u') {
    circle(x - s * 0.18, hy + s * 0.04, s * 0.07); ctx.fill();
    circle(x + s * 0.18, hy + s * 0.04, s * 0.07); ctx.fill();
  } else {
    for (const sg of [-1, 1]) {
      circle(x + sg * s * 0.20 + dir * s * 0.08, hy + s * 0.10, s * 0.085); ctx.fill();
    }
  }
}

// --- ゲージ・ボタン -------------------------------------------------------------------
function drawHud() {
  const lv = LEVELS[G.li];
  ctx.fillStyle = 'rgba(10,6,22,0.85)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0EAFF';
  ctx.fillText((G.li + 1) + '. ' + lv.name, 10, HUD / 2);

  let onGoal = 0;
  for (const b of G.boxes) if (isGoal(b.x, b.y)) onGoal++;
  ctx.textAlign = 'center';
  ctx.fillStyle = onGoal === G.boxes.length ? '#8AF0B0' : '#FFD24A';
  ctx.fillText('にもつ ' + onGoal + ' / ' + G.boxes.length, VW / 2, HUD / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = G.pushes > lv.best ? '#CFC8E8' : '#8AF0B0';
  ctx.fillText('おした ' + G.pushes + '（もくひょう ' + lv.best + '）', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawControls() {
  // ★ さわって いない ときの スティックの 下じきは 大きくて、
  //   せまい 画面だと ばんに かかる。さわって いる ときだけ 出して、
  //   ふだんは 小さな あんないを おく。
  if (IN.on) drawStick();
  else drawPadHint();
  // 「もどす」と「はじめから」。★ 倉庫番は もどせないと あそべない。
  const r = Math.max(32, 52 / SC);
  const cx = VW - 20 - r, cy = VH * 0.60;
  const b1 = button(cx - r, cy - r, r * 2, r * 2, undo);
  const on = G.undos.length > 0;
  ctx.save();
  ctx.globalAlpha = on ? 0.95 : 0.32;
  circle(cx, cy, r);
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  ctx.strokeStyle = '#8AD8F0'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.stroke();
  // ↩ の やじるし
  ctx.strokeStyle = '#CFF0FF'; ctx.lineWidth = Math.max(2.5, r * 0.13);
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.06, r * 0.36, Math.PI * 0.15, Math.PI * 1.35);
  ctx.stroke();
  ctx.fillStyle = '#CFF0FF';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.46, cy - r * 0.34);
  ctx.lineTo(cx - r * 0.10, cy - r * 0.30);
  ctx.lineTo(cx - r * 0.40, cy + r * 0.04);
  ctx.closePath(); ctx.fill();
  bigText('もどす', cx, cy + r * 0.58, Math.round(r * 0.32), '#CFF0FF', null);
  ctx.restore();

  const bw = Math.min(120, VW * 0.15), bh = 34;
  drawButton(button(VW - 20 - bw, VH - 12 - bh, bw, bh, () => startLevel(G.li)),
             'はじめから', '#FFC8A8');
}

// うごかしかたの 小さな あんない（左下）
function drawPadHint() {
  const r = Math.max(30, 46 / SC);
  const cx = VW * 0.11 + r * 0.2, cy = VH * 0.74;
  ctx.save();
  ctx.globalAlpha = 0.34;
  circle(cx, cy, r);
  ctx.fillStyle = 'rgba(10,10,10,0.22)'; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = 'rgba(248,248,248,0.34)'; ctx.stroke();
  ctx.fillStyle = 'rgba(248,248,248,0.55)';
  const a = r * 0.15;
  for (const [ax, ay] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const tx = cx + ax * r * 0.82, ty = cy + ay * r * 0.82;
    const bx = cx + ax * r * 0.54, by = cy + ay * r * 0.54;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx - ay * a, by + ax * a);
    ctx.lineTo(bx + ay * a, by - ax * a);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 0.6;
  bigText('うごかす', cx, cy + r * 1.34, Math.round(r * 0.30), '#CFC8E8', null);
  ctx.globalAlpha = 1;
}

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3A2E58'); g.addColorStop(1, '#181228');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  bigText('エイトくんの', VW / 2, 26, 17, '#FFD8A8', null);
  bigText('そうこばん', VW / 2, 56, fitSize('そうこばん', VW * 0.4, 36), '#FFD24A');
  const sub = 'にもつは おす ことしか できない。全30めん・ぜんぶ 解ける';
  bigText(sub, VW / 2, 88, fitSize(sub, VW * 0.9, 15), '#CFC8E8', null);

  const names = LEVELS.map((l, i) => (i + 1) + '. ' + l.name);
  const clear = LEVELS.map((l, i) => !!save.clear['s' + i]);
  const y = pick30(names, clear);

  const sw = Math.min(150, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 36, () => { G.screen = 'howto'; }),
             'あそびかた', '#FFE0B0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 36, () => { audioStart(); sfxSet(); }),
             '♪ おと', '#FFE0B0');
  const cleared = clear.filter(Boolean).length;
  bigText('クリア ' + cleared + ' / 30　あそんだ かず ' + save.plays +
          '　もどした かず ' + save.undo,
          VW / 2, VH - 12, 13, 'rgba(230,220,255,0.7)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(230,220,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

// ★ 30めん あるので arcade.js の stagePicker（4〜5れつ）では 画面から はみ出す。
//   ここだけ 10れつの 小さな ふだに する。
function pick30(names, clear) {
  const cols = VW > 820 ? 10 : 8;
  const cw = Math.min(76, (VW - 40 - (cols - 1) * 6) / cols), ch = 40;
  const y0 = 112;
  for (let i = 0; i < names.length; i++) {
    const x = VW / 2 - (cols * cw + (cols - 1) * 6) / 2 + (i % cols) * (cw + 6);
    const y = y0 + Math.floor(i / cols) * (ch + 6);
    const b = button(x, y, cw, ch, () => startLevel(i));
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    rr(b.x + 2, b.y + 3, cw, ch, 8); ctx.fill();
    ctx.fillStyle = clear[i] ? '#FFD24A' : '#5A4A86';
    rr(b.x, b.y, cw, ch, 8); ctx.fill();
    bigText(String(i + 1), b.x + cw / 2, b.y + ch * 0.36, 17,
            clear[i] ? '#2A2038' : '#FFF', null);
    const sub = clear[i] ? ('' + (save.best['s' + i] || '')) + 'おし' : LEVELS[i].best + 'おし';
    bigText(sub, b.x + cw / 2, b.y + ch * 0.75, 11,
            clear[i] ? 'rgba(42,32,56,0.85)' : 'rgba(255,255,255,0.6)', null);
  }
  return y0 + Math.ceil(names.length / cols) * (ch + 6);
}

function drawHowto() {
  ctx.fillStyle = '#1C1636';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 30, 24, '#FFF6C8');
  const lines = [
    '① にもつを ぜんぶ ○の上に のせたら クリア',
    '② にもつは **おす ことしか できない**。引っぱれない',
    '③ かべの かどに よせて しまうと 二度と 動かせない（× が 出る）',
    '④ 左の スティックで 1ますずつ うごく。たおしっぱなしで すすみつづける',
    '⑤ **行きたい ますを タップ**すると そこまで じどうで 歩く',
    '⑥ にもつを タップすると、ならんで いれば おす',
    '⑦ こまったら「もどす」。**何回でも** 1手ずつ まきもどせる',
    '⑧ 「もくひょう」は コンピュータが 計算した さいたんの おす かず',
    '⑨ パソコンなら ← → ↑ ↓ で うごく、Z で もどす',
  ];
  lines.forEach((s, i) => bigText(s.replace(/\*\*/g, ''), VW / 2, 62 + i * 28,
                                  fitSize(s.replace(/\*\*/g, ''), VW * 0.94, 15), '#CFE8FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 44, bw, 38, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

// Z キーで もどす（arcade.js は Z を わざボタンに 当てて いるので ここで 見る）
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyZ' && G.screen === 'play') undo();
});

arcadeStart({ update: update, draw: draw, zone: 'all' });
