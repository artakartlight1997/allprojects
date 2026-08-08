// ばんめんの ルール。
//
// ★ 「見た目」と「ルール」を 分けている。
//   ルールは いつも すぐに 計算して しまい（swapDo → resolveStep）、
//   見た目だけを 時間を かけて 追いつかせる。
//   こう しないと、アニメの とちゅうで もう 1回 さわられた ときに
//   ばんめんが こわれる。

'use strict';

const SAVE_KEY = 'puzzle.v1';

const save = { clear: [], best: {}, fails: {}, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}
// 3回 だめだと 手が 4つ ふえる（3だんかい、さいだい +12）
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function extraMoves() { return assistLevel(G.stage) * 4; }

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  cell: [],      // { k, sp } … sp: 0 / 'h' / 'v' / 'b' / 'r'
  ice: [],
  score: 0,
  moves: 0,
  got: 0, got2: 0,
  chain: 0,
  over: false, win: false,
  sel: null,
  phase: 'idle',  // idle / swap / back / pop / fall
  pt: 0,
  a: null, b: null,       // 入れかえる 2つ
  popping: [],            // 消える マス
  fall: [],               // 落ちる ようす { r, c, from }
  gain: [],               // 「+100」の ふきだし
  shuffles: 0,
};

function rndK() { return (Math.random() * G.S.colors) | 0; }

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.score = 0;
  G.moves = G.S.moves + extraMoves();
  G.got = 0; G.got2 = 0;
  G.chain = 0;
  G.over = false; G.win = false;
  G.sel = null;
  G.phase = 'idle'; G.pt = 0;
  G.popping = []; G.fall = []; G.gain = [];
  G.shuffles = 0;
  warned = false;

  // こおり
  G.ice = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(G.S.ice ? (G.S.ice[r].charCodeAt(c) - 48) : 0);
    }
    // '.' は 46 → 46-48 = -2。0 に なおす。
    for (let c = 0; c < COLS; c++) if (row[c] < 0) row[c] = 0;
    G.ice.push(row);
  }

  // はじめから そろっていない ばんめんを 作る
  do {
    G.cell = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push({ k: rndK(), sp: 0, fy: 0 });
      G.cell.push(row);
    }
    // そろって いたら その マスだけ 引きなおす
    for (let n = 0; n < 40; n++) {
      const ms = findMatches();
      if (!ms.length) break;
      for (const g of ms) for (const p of g) G.cell[p[0]][p[1]].k = rndK();
    }
  } while (!hasMove());

  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

// --- そろっているか しらべる ------------------------------------------------------

// たて・よこに 3つ 以上 つづく かたまりを ぜんぶ かえす
function findMatches() {
  const out = [];
  // よこ
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const same = c < COLS && G.cell[r][c] && G.cell[r][c - 1] &&
                   G.cell[r][c].k >= 0 && G.cell[r][c].k === G.cell[r][c - 1].k;
      if (same) { run++; continue; }
      if (run >= 3) {
        const g = [];
        for (let k = c - run; k < c; k++) g.push([r, k]);
        g.dir = 'h';
        out.push(g);
      }
      run = 1;
    }
  }
  // たて
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const same = r < ROWS && G.cell[r][c] && G.cell[r - 1][c] &&
                   G.cell[r][c].k >= 0 && G.cell[r][c].k === G.cell[r - 1][c].k;
      if (same) { run++; continue; }
      if (run >= 3) {
        const g = [];
        for (let k = r - run; k < r; k++) g.push([k, c]);
        g.dir = 'v';
        out.push(g);
      }
      run = 1;
    }
  }
  return out;
}

// 動かせる 手が 1つでも あるか
function hasMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= ROWS || c2 >= COLS) continue;
        if (G.cell[r][c].sp === 'r' || G.cell[r2][c2].sp === 'r') return true;
        swapCells(r, c, r2, c2);
        const ok = findMatches().length > 0;
        swapCells(r, c, r2, c2);
        if (ok) return true;
      }
    }
  }
  return false;
}

function swapCells(r1, c1, r2, c2) {
  const t = G.cell[r1][c1];
  G.cell[r1][c1] = G.cell[r2][c2];
  G.cell[r2][c2] = t;
}

// 手が なくなったら まぜなおす（あそべなく ならない ため）
function reshuffle() {
  const all = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push(G.cell[r][c]);
  for (let n = 0; n < 60; n++) {
    for (let i = all.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = all[i]; all[i] = all[j]; all[j] = t;
    }
    let i = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) G.cell[r][c] = all[i++];
    if (!findMatches().length && hasMove()) break;
  }
  G.shuffles++;
}

// --- 消す ------------------------------------------------------------------------

// r,c を 消す ものに くわえる（とくべつな たまは まわりも まきこむ）
function addClear(set, r, c, depth) {
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return;
  const key = r * COLS + c;
  if (set.has(key)) return;
  set.add(key);
  const cell = G.cell[r][c];
  if (!cell || !cell.sp || depth > 3) return;
  const sp = cell.sp;
  if (sp === 'h') { for (let k = 0; k < COLS; k++) addClear(set, r, k, depth + 1); }
  else if (sp === 'v') { for (let k = 0; k < ROWS; k++) addClear(set, k, c, depth + 1); }
  else if (sp === 'b') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) addClear(set, r + dr, c + dc, depth + 1);
  }
}

// いま そろっている ものを 消して、とくべつな たまを 作る。
// もう そろって いなければ false。
function resolveStep() {
  const ms = findMatches();
  if (!ms.length) return false;

  const set = new Set();
  const makes = [];   // 新しく できる とくべつな たま
  for (const g of ms) {
    for (const p of g) addClear(set, p[0], p[1], 0);
    if (g.length >= 5) {
      makes.push([g[(g.length / 2) | 0][0], g[(g.length / 2) | 0][1], 'r', g[0] ? G.cell[g[0][0]][g[0][1]].k : 0]);
    } else if (g.length === 4) {
      const mid = g[1];
      makes.push([mid[0], mid[1], g.dir === 'h' ? 'h' : 'v', G.cell[mid[0]][mid[1]].k]);
    }
  }
  // たてと よこが 交わって いたら ばくだん
  for (const g of ms) {
    if (g.length !== 3) continue;
    for (const h of ms) {
      if (h === g || h.dir === g.dir) continue;
      for (const p of g) {
        if (h.some((q) => q[0] === p[0] && q[1] === p[1])) {
          makes.push([p[0], p[1], 'b', G.cell[p[0]][p[1]].k]);
        }
      }
    }
  }

  popCells(set, makes);
  return true;
}

// 消す ところを じっさいに 消して、こおりを わり、点を 入れる
function popCells(set, makes) {
  G.chain++;
  const n = set.size;
  const bonus = 1 + (G.chain - 1) * 0.5;
  const add = Math.round(n * 30 * bonus + Math.max(0, n - 3) * 40);
  G.score += add;

  let icedBroke = 0;
  for (const key of set) {
    const r = (key / COLS) | 0, c = key % COLS;
    const cell = G.cell[r][c];
    if (!cell) continue;
    // もくひょうの 色を かぞえる
    const gl = G.S.goal;
    if (gl.type === 'collect' && cell.k === gl.k) G.got++;
    if (gl.type === 'collect2') {
      if (cell.k === gl.k) G.got++;
      if (cell.k === gl.k2) G.got2++;
    }
    if (cell.sp) sfxBoom();
    G.cell[r][c] = null;
    // こおりは その マスの ものが 消えると 1まい われる
    if (G.ice[r][c] > 0) { G.ice[r][c]--; icedBroke++; }
  }
  if (icedBroke) sfxIce();
  sfxPop(G.chain, n > 5);

  // とくべつな たまを おく（消した あとに おく）
  for (const [r, c, sp, k] of makes) {
    G.cell[r][c] = { k: sp === 'r' ? -1 : k, sp, fy: 0, born: true };
  }
  if (makes.length) sfxMake();

  G.gain.push({ r: [...set][0] !== undefined ? (([...set][0] / COLS) | 0) : 0,
                c: [...set][0] !== undefined ? ([...set][0] % COLS) : 0,
                n: add, t: 0 });
  G.popping = [...set];
}

// 落として すきまを うめる
function applyGravity() {
  G.fall = [];
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (G.cell[r][c]) {
        if (write !== r) {
          G.cell[write][c] = G.cell[r][c];
          G.cell[r][c] = null;
          G.fall.push({ r: write, c, from: r });
        }
        write--;
      }
    }
    let above = -1;
    for (let r = write; r >= 0; r--) {
      G.cell[r][c] = { k: rndK(), sp: 0, fy: 0 };
      G.fall.push({ r, c, from: above-- });
    }
  }
}

// --- そうさ ---------------------------------------------------------------------

// にじいろの たまを つかう（つないだ 色を ぜんぶ 消す）
function useRainbow(rr1, cc1, rr2, cc2) {
  const a = G.cell[rr1][cc1], b = G.cell[rr2][cc2];
  const rain = a.sp === 'r' ? a : b;
  const other = a.sp === 'r' ? b : a;
  const set = new Set();
  if (other.sp === 'r') {
    // にじ どうし → ぜんぶ
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) set.add(r * COLS + c);
  } else {
    const k = other.k;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) if (G.cell[r][c] && G.cell[r][c].k === k) addClear(set, r, c, 0);
    }
    set.add((rain === a ? rr1 : rr2) * COLS + (rain === a ? cc1 : cc2));
  }
  sfxBoom();
  popCells(set, []);
}

function tapCell(r, c) {
  if (G.screen !== 'play' || G.over || G.phase !== 'idle') return;
  if (!G.cell[r] || !G.cell[r][c]) return;
  if (!G.sel) { G.sel = [r, c]; sfxSwap(); return; }
  const [r0, c0] = G.sel;
  if (r0 === r && c0 === c) { G.sel = null; return; }
  if (Math.abs(r0 - r) + Math.abs(c0 - c) !== 1) { G.sel = [r, c]; sfxSwap(); return; }
  G.sel = null;
  G.a = [r0, c0]; G.b = [r, c];
  G.phase = 'swap'; G.pt = 0;
  sfxSwap();
}

// 入れかえを ほんとうに おこなう（アニメの あと）
function swapDo() {
  const [r1, c1] = G.a, [r2, c2] = G.b;
  const rain = G.cell[r1][c1].sp === 'r' || G.cell[r2][c2].sp === 'r';
  if (rain) {
    G.moves--;
    G.chain = 0;
    useRainbow(r1, c1, r2, c2);
    G.phase = 'pop'; G.pt = 0;
    return;
  }
  // とくべつな たま どうしを つなぐと、色が そろって いなくても 両方 はつどう。
  // ごほうびを 大きく して、作る かちを 出す。
  if (G.cell[r1][c1].sp && G.cell[r2][c2].sp) {
    G.moves--;
    G.chain = 0;
    const set = new Set();
    addClear(set, r1, c1, 0);
    addClear(set, r2, c2, 0);
    sfxBoom();
    popCells(set, []);
    G.phase = 'pop'; G.pt = 0;
    return;
  }
  swapCells(r1, c1, r2, c2);
  if (!findMatches().length) {
    // そろわなかった → もどす（手は へらさない）
    swapCells(r1, c1, r2, c2);
    G.phase = 'back'; G.pt = 0;
    sfxBack();
    return;
  }
  G.moves--;
  G.chain = 0;
  resolveStep();
  G.phase = 'pop'; G.pt = 0;
}

// --- 1コマ ----------------------------------------------------------------------

const T_SWAP = 0.14, T_BACK = 0.14, T_POP = 0.20, T_FALL = 0.20;

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  for (const g of G.gain) g.t += dt;
  G.gain = G.gain.filter((g) => g.t < 1.0);

  if (G.over) {
    G.pt += dt;
    if (G.pt > 1.6) { bgmStop(); G.screen = 'result'; }
    return;
  }

  G.pt += dt;
  if (G.phase === 'swap' && G.pt >= T_SWAP) { swapDo(); return; }
  if (G.phase === 'back' && G.pt >= T_BACK) { G.phase = 'idle'; G.pt = 0; return; }
  if (G.phase === 'pop' && G.pt >= T_POP) {
    G.popping = [];
    applyGravity();
    G.phase = 'fall'; G.pt = 0;
    return;
  }
  if (G.phase === 'fall' && G.pt >= T_FALL) {
    G.fall = [];
    if (resolveStep()) { G.phase = 'pop'; G.pt = 0; return; }
    G.chain = 0;
    if (!hasMove()) reshuffle();
    G.phase = 'idle'; G.pt = 0;
    checkEnd();
    return;
  }
  bgmHeat(G.moves <= 5 ? 1 : 0);
}

let warned = false;
function goalDone() {
  const gl = G.S.goal;
  if (gl.type === 'score') return G.score >= gl.n;
  if (gl.type === 'collect') return G.got >= gl.n;
  if (gl.type === 'collect2') return G.got >= gl.n && G.got2 >= gl.n;
  if (gl.type === 'ice') {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G.ice[r][c] > 0) return false;
    return true;
  }
  return false;
}

function checkEnd() {
  if (G.over) return;
  if (goalDone()) { finish(true); return; }
  if (G.moves <= 0) { finish(false); return; }
  if (G.moves <= 3 && !warned) { warned = true; sfxWarn(); }
}

function finish(win) {
  G.over = true;
  G.win = win;
  G.pt = 0;
  warned = false;
  const key = 's' + G.stage;
  if (win) {
    save.clear[G.stage] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.score);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxEnd(win);
}

// もくひょうの すすみぐあい（0〜1）
function goalProgress() {
  const gl = G.S.goal;
  if (gl.type === 'score') return Math.min(1, G.score / gl.n);
  if (gl.type === 'collect') return Math.min(1, G.got / gl.n);
  if (gl.type === 'collect2') return Math.min(1, (G.got + G.got2) / (gl.n * 2));
  if (gl.type === 'ice') {
    let left = 0, all = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const st = G.S.ice ? Math.max(0, G.S.ice[r].charCodeAt(c) - 48) : 0;
        all += st; left += G.ice[r][c];
      }
    }
    return all ? 1 - left / all : 1;
  }
  return 0;
}

function goalText() {
  const gl = G.S.goal;
  if (gl.type === 'score') return 'てんすう ' + G.score + ' / ' + gl.n;
  if (gl.type === 'collect') return GEMS[gl.k].name + ' ' + Math.min(G.got, gl.n) + ' / ' + gl.n;
  if (gl.type === 'collect2') {
    return GEMS[gl.k].name + ' ' + Math.min(G.got, gl.n) + '/' + gl.n +
           '　' + GEMS[gl.k2].name + ' ' + Math.min(G.got2, gl.n) + '/' + gl.n;
  }
  let left = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) left += G.ice[r][c];
  return 'こおり のこり ' + left;
}
