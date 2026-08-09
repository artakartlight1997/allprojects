// 落ちものパズルの なかみ。
//
//   1) 2つ 1くみの たまが 上から 落ちてくる
//   2) 下に つくと 板に くっつく
//   3) うかんで いる たまを 落とす → 4つ つながって いたら 消す
//   4) 消えたら また 2)へ もどる（これが「れんさ」）
//
// ★ 3)〜4) を くりかえす ところは「じかん つき」で 見せる。
//   いっぺんに 消すと 何が おきたか 分からないので、
//   0.28びょうずつ 止めて「落ちる → 消える」を 見せている。

'use strict';

const SAVE_KEY = 'yui-drop-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      open: o.open || 1,
      clear: o.clear || {},
      best: o.best || {},        // 面ごとの さいこう点
      chain: o.chain || 0,       // いちばん 長い れんさ
    };
  } catch (e) {
    return { open: 1, clear: {}, best: {}, chain: 0 };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',
  stage: 0, S: null,
  bd: [],            // 板（0=なし）
  cur: null,         // 落ちてくる くみ
  next: null,
  fallT: 0,
  phase: 'fall',     // fall / settle（落として 消す） / over
  settleT: 0,
  settleStep: 'drop',
  chain: 0,
  score: 0,
  cleared: 0,        // 消した かず
  pop: [],           // 消える えんしゅつ
  msg: '', msgT: 0,
  over: false, win: false,
  shake: 0,
};

function emptyBoard() {
  const b = [];
  for (let y = 0; y < ROWS; y++) b.push(new Array(COLS).fill(0));
  return b;
}

function randColor() { return 1 + ((Math.random() * G.S.cols) | 0); }
function newPair() { return { x: 2, y: 0, rot: 0, a: randColor(), b: randColor() }; }

function startStage(i) {
  G.stage = i;
  G.S = STAGES[i];
  G.bd = emptyBoard();
  G.cur = newPair();
  G.next = newPair();
  G.fallT = 0;
  G.phase = 'fall';
  G.chain = 0; G.score = 0; G.cleared = 0;
  G.pop.length = 0;
  G.over = false; G.win = false;
  G.msg = ''; G.msgT = 0;
  G.screen = 'play';
  bgmStart(i);
  say(G.S.need + ' こ 消したら クリア！');
}

function say(s) { G.msg = s; G.msgT = 2.2; }

// くみの 2つめの ばしょ
function subPos(p) {
  const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][p.rot];
  return { x: p.x + d[0], y: p.y + d[1] };
}

function cellFree(x, y) {
  if (x < 0 || x >= COLS || y >= ROWS) return false;
  if (y < 0) return true;                       // 上には はみ出して よい
  return G.bd[y][x] === 0;
}

function canPlace(p) {
  const s = subPos(p);
  return cellFree(p.x, p.y) && cellFree(s.x, s.y);
}

// --- そうさ ---------------------------------------------------------------------

function moveX(d) {
  if (G.phase !== 'fall' || !G.cur) return;
  const q = { x: G.cur.x + d, y: G.cur.y, rot: G.cur.rot };
  if (canPlace(q)) { G.cur.x = q.x; sfxTap(); }
}

function rotate() {
  if (G.phase !== 'fall' || !G.cur) return;
  const p = G.cur;
  const r = (p.rot + 1) % 4;
  // ★ かべや たまに ぶつかる ときは、よこに 1マス ずらして でも まわす。
  //   まわらないと 子どもは「こわれた」と 思う。
  for (const kick of [0, 1, -1, 2, -2]) {
    const q = { x: p.x + kick, y: p.y, rot: r };
    if (canPlace(q)) { p.x = q.x; p.rot = r; sfxPop(); return; }
  }
  // それでも ダメなら 1マス 上げて ためす
  for (const kick of [0, 1, -1]) {
    const q = { x: p.x + kick, y: p.y - 1, rot: r };
    if (canPlace(q)) { p.x = q.x; p.y = q.y; p.rot = r; sfxPop(); return; }
  }
}

function softDrop() {
  if (G.phase !== 'fall' || !G.cur) return;
  let n = 0;
  while (true) {
    const q = { x: G.cur.x, y: G.cur.y + 1, rot: G.cur.rot };
    if (!canPlace(q)) break;
    G.cur.y++; n++;
    if (n > ROWS + 2) break;
  }
  G.score += n;
  lockPair();
}

// --- 板の しょり ----------------------------------------------------------------

function lockPair() {
  const p = G.cur, s = subPos(p);
  if (p.y >= 0) G.bd[p.y][p.x] = p.a;
  if (s.y >= 0) G.bd[s.y][s.x] = p.b;
  G.cur = null;
  G.chain = 0;
  G.phase = 'settle';
  G.settleStep = 'drop';
  G.settleT = 0;
  sfxLand();
}

// うかんで いる たまを 1マスずつ 落とす。動いたら true
function applyGravity() {
  let moved = false;
  for (let x = 0; x < COLS; x++) {
    for (let y = ROWS - 2; y >= 0; y--) {
      if (G.bd[y][x] && !G.bd[y + 1][x]) {
        G.bd[y + 1][x] = G.bd[y][x];
        G.bd[y][x] = 0;
        moved = true;
      }
    }
  }
  return moved;
}

// 4つ いじょう つながって いる かたまりを さがす
function findGroups() {
  const seen = [];
  for (let y = 0; y < ROWS; y++) seen.push(new Array(COLS).fill(false));
  const groups = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!G.bd[y][x] || seen[y][x]) continue;
      const c = G.bd[y][x];
      const q = [[x, y]], list = [];
      seen[y][x] = true;
      while (q.length) {
        const [cx, cy] = q.pop();
        list.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          if (seen[ny][nx] || G.bd[ny][nx] !== c) continue;
          seen[ny][nx] = true;
          q.push([nx, ny]);
        }
      }
      if (list.length >= 4) groups.push({ c: c, cells: list });
    }
  }
  return groups;
}

function clearGroups(groups) {
  let n = 0;
  for (const g of groups) {
    for (const [x, y] of g.cells) {
      G.bd[y][x] = 0;
      G.pop.push({ x: x, y: y, c: g.c, t: 0 });
      n++;
    }
  }
  G.chain++;
  G.cleared += n;
  // てんすう：たくさん・同時に・れんさ ほど 大きく
  const bonus = (1 + (G.chain - 1) * 0.8) * (1 + (groups.length - 1) * 0.5);
  G.score += Math.round(n * 10 * bonus);
  save.chain = Math.max(save.chain, G.chain);
  G.shake = Math.min(0.5, 0.12 + G.chain * 0.06);
  if (G.chain >= 2) sfxChain(G.chain); else sfxClearBlob();
  say(CHAIN_SAY[Math.min(CHAIN_SAY.length - 1, G.chain)] || (G.chain + ' れんさ！'));
  return n;
}

function spawnNext() {
  G.cur = G.next;
  G.next = newPair();
  G.fallT = 0;
  if (!canPlace(G.cur)) {
    G.over = true; G.win = false;
    G.phase = 'over';
    bgmStop();
    sfxOver();
    return;
  }
  G.phase = 'fall';
}

function checkWin() {
  if (G.cleared >= G.S.need) {
    G.over = true; G.win = true;
    G.phase = 'over';
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    save.best[G.stage] = Math.max(save.best[G.stage] || 0, G.score);
    storeSave();
    bgmStop();
    sfxClear(true);
    return true;
  }
  return false;
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  for (let i = G.pop.length - 1; i >= 0; i--) {
    G.pop[i].t += dt;
    if (G.pop[i].t > 0.45) G.pop.splice(i, 1);
  }

  if (G.screen !== 'play') { bgmPump(); return; }

  if (G.phase === 'fall') {
    G.fallT += dt;
    const step = G.S.fall;
    while (G.fallT >= step) {
      G.fallT -= step;
      const q = { x: G.cur.x, y: G.cur.y + 1, rot: G.cur.rot };
      if (canPlace(q)) G.cur.y++;
      else { lockPair(); break; }
    }
  } else if (G.phase === 'settle') {
    G.settleT -= dt;
    if (G.settleT <= 0) {
      if (G.settleStep === 'drop') {
        // うかんで いる ぶんを ぜんぶ 落とす
        let guard = 0;
        while (applyGravity() && guard++ < ROWS * 2) { /* くりかえし */ }
        G.settleStep = 'check';
        G.settleT = 0.10;
      } else {
        const gs = findGroups();
        if (gs.length) {
          clearGroups(gs);
          G.settleStep = 'drop';
          G.settleT = 0.28;
        } else {
          if (G.chain >= 2) bgmHeat(1);
          if (!checkWin()) spawnNext();
        }
      }
    }
  }
  bgmPump();
}
