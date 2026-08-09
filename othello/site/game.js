// オセロの きまりと、あいて（CPU）の 考えかた。
//
// ★ ばんは 8×8 の ただの 表。おける かどうかは
//   「8方向へ 進んで、あいての 色が つづいた あとに 自分の 色が あるか」で きまる。
// ★ CPU は つよさで 考えかたを 変える。
//   いちばん つよい「ねこの 王さま」は 4手 先まで 読む（ミニマックス）。

'use strict';

const SAVE_KEY = 'yui-oth-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { win: o.win || {}, lose: o.lose || {}, best: o.best || 0 };
  } catch (e) {
    return { win: {}, lose: {}, best: 0 };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',
  level: 0,
  bd: [],
  turn: BLACK,
  moves: [],          // いま おける ところ
  last: null,         // さいごに おいた ところ
  flip: [],           // ひっくり返る えんしゅつ
  flipT: 0,
  thinkT: 0,
  msg: '', msgT: 0,
  over: false, result: null,
  passT: 0,
  hint: true,
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function newBoard() {
  const b = [];
  for (let y = 0; y < N; y++) b.push(new Array(N).fill(0));
  b[3][3] = WHITE; b[4][4] = WHITE;
  b[3][4] = BLACK; b[4][3] = BLACK;
  return b;
}

// (x,y) に col を おいたら ひっくり返る ところ
function gains(bd, x, y, col) {
  if (bd[y][x]) return [];
  const foe = col === BLACK ? WHITE : BLACK;
  const out = [];
  for (const [dx, dy] of DIRS) {
    const line = [];
    let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cy >= 0 && cx < N && cy < N && bd[cy][cx] === foe) {
      line.push([cx, cy]); cx += dx; cy += dy;
    }
    if (line.length && cx >= 0 && cy >= 0 && cx < N && cy < N && bd[cy][cx] === col) {
      for (const p of line) out.push(p);
    }
  }
  return out;
}

function legalMoves(bd, col) {
  const out = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const g = gains(bd, x, y, col);
      if (g.length) out.push({ x: x, y: y, g: g });
    }
  }
  return out;
}

function countDisc(bd, col) {
  let n = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (bd[y][x] === col) n++;
  return n;
}

function place(bd, m, col) {
  bd[m.y][m.x] = col;
  for (const [x, y] of m.g) bd[y][x] = col;
}

function cloneBoard(bd) { return bd.map((r) => r.slice()); }

// --- CPU ------------------------------------------------------------------------

function evalBoard(bd, col) {
  const foe = col === BLACK ? WHITE : BLACK;
  let w = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (bd[y][x] === col) w += WEIGHT[y][x];
      else if (bd[y][x] === foe) w -= WEIGHT[y][x];
    }
  }
  // おける ところの 多さ（あいてが 動けないほど よい）
  w += (legalMoves(bd, col).length - legalMoves(bd, foe).length) * 6;
  return w;
}

function minimax(bd, col, me, depth, alpha, beta) {
  if (depth <= 0) return evalBoard(bd, me);
  const ms = legalMoves(bd, col);
  if (!ms.length) {
    const foeMs = legalMoves(bd, col === BLACK ? WHITE : BLACK);
    if (!foeMs.length) {
      // おわり。石の 数で きめる
      const d = countDisc(bd, me) - countDisc(bd, me === BLACK ? WHITE : BLACK);
      return d * 1000;
    }
    return minimax(bd, col === BLACK ? WHITE : BLACK, me, depth - 1, alpha, beta);
  }
  if (col === me) {
    let best = -1e9;
    for (const m of ms) {
      const b2 = cloneBoard(bd);
      place(b2, m, col);
      const v = minimax(b2, col === BLACK ? WHITE : BLACK, me, depth - 1, alpha, beta);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  let worst = 1e9;
  for (const m of ms) {
    const b2 = cloneBoard(bd);
    place(b2, m, col);
    const v = minimax(b2, col === BLACK ? WHITE : BLACK, me, depth - 1, alpha, beta);
    if (v < worst) worst = v;
    if (worst < beta) beta = worst;
    if (alpha >= beta) break;
  }
  return worst;
}

function cpuPick() {
  const L = LEVELS[G.level];
  const ms = legalMoves(G.bd, WHITE);
  if (!ms.length) return null;
  if (L.kind === 'random') return ms[(Math.random() * ms.length) | 0];
  if (L.kind === 'greedy') {
    let best = ms[0];
    for (const m of ms) if (m.g.length > best.g.length) best = m;
    return best;
  }
  if (L.depth <= 0) {
    // ばしょの うれしさ だけで きめる
    let best = ms[0], bv = -1e9;
    for (const m of ms) {
      const v = WEIGHT[m.y][m.x] + m.g.length;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  let best = ms[0], bv = -1e9;
  for (const m of ms) {
    const b2 = cloneBoard(G.bd);
    place(b2, m, WHITE);
    const v = minimax(b2, BLACK, WHITE, L.depth - 1, -1e9, 1e9);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

// --- ゲームの ながれ --------------------------------------------------------------

function startGame(level) {
  G.level = level;
  G.bd = newBoard();
  G.turn = BLACK;
  G.last = null;
  G.flip = []; G.flipT = 0;
  G.over = false; G.result = null;
  G.thinkT = 0; G.passT = 0;
  G.moves = legalMoves(G.bd, BLACK);
  G.screen = 'play';
  say('くろねこ（あなた）から！');
  bgmStart(level);
}

function say(s) { G.msg = s; G.msgT = 2.6; }

function humanPlay(x, y) {
  if (G.over || G.turn !== BLACK || G.flipT > 0 || G.thinkT > 0) return;
  const m = G.moves.find((q) => q.x === x && q.y === y);
  if (!m) { sfxNg(); say('そこには おけないよ'); return; }
  doMove(m, BLACK);
}

function doMove(m, col) {
  place(G.bd, m, col);
  G.last = { x: m.x, y: m.y, col: col };
  G.flip = m.g.map((p) => ({ x: p[0], y: p[1], col: col }));
  G.flipT = 0.42;
  sfxPut(m.g.length);
  G.turn = col === BLACK ? WHITE : BLACK;
  G.moves = [];
}

function afterFlip() {
  // つぎの 手ばんを きめる（おけない ときは パス）
  let ms = legalMoves(G.bd, G.turn);
  if (!ms.length) {
    const other = G.turn === BLACK ? WHITE : BLACK;
    const oms = legalMoves(G.bd, other);
    if (!oms.length) { finish(); return; }
    say((G.turn === BLACK ? 'あなたは' : 'あいては') + ' おけません。パス！');
    sfxPass();
    G.turn = other;
    ms = oms;
    G.passT = 0.8;
  }
  G.moves = G.turn === BLACK ? ms : [];
  if (G.turn === WHITE) G.thinkT = 0.55 + Math.random() * 0.35;
}

function finish() {
  G.over = true;
  const b = countDisc(G.bd, BLACK), w = countDisc(G.bd, WHITE);
  const win = b > w, draw = b === w;
  G.result = { b: b, w: w, win: win, draw: draw };
  if (win) { save.win[G.level] = (save.win[G.level] || 0) + 1; save.best = Math.max(save.best, G.level + 1); }
  else if (!draw) save.lose[G.level] = (save.lose[G.level] || 0) + 1;
  storeSave();
  bgmStop();
  if (win) sfxClear(w === 0); else if (draw) sfxOk(); else sfxOver();
}

function update(dt) {
  if (G.msgT > 0) G.msgT -= dt;
  if (G.passT > 0) G.passT -= dt;
  if (G.screen !== 'play' || G.over) { bgmPump(); return; }

  if (G.flipT > 0) {
    G.flipT -= dt;
    if (G.flipT <= 0) { G.flip = []; afterFlip(); }
    bgmPump();
    return;
  }
  if (G.turn === WHITE && G.thinkT > 0) {
    G.thinkT -= dt;
    if (G.thinkT <= 0) {
      const m = cpuPick();
      if (m) doMove(m, WHITE);
      else afterFlip();
    }
  }
  bgmPump();
}
