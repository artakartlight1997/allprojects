// リナパパの ブロックつみ
//
// ★ むかしの「4つの ますで できた ブロックを つんで、よこ 1れつ そろえて 消す」
//   ゲームが もと。7しゅるいの かたちが 出る。
//
// ★ そうさ（ゆびで 気もちよく）
//     ・よこに すべらせる … 1ますずつ 動く（ますに ぴったり つく）
//     ・ちょんと タップ   … まわる
//     ・下に さっと はらう … いっきに 落とす
//   むかしの ゲームの「置きたい ところに 置けない」いらいらを なくす ため、
//   落ちる 先を うすい かげで さきに 見せる。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const COLS = 10, ROWS = 18;

// かたち（4つの むき ぶんは まわして 作る）
const PIECES = [
  { n: 'I', col: '#5AD8F0', cells: [[0, 1], [1, 1], [2, 1], [3, 1]], w: 4 },
  { n: 'O', col: '#FFD24A', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 2 },
  { n: 'T', col: '#C88AF0', cells: [[1, 0], [0, 1], [1, 1], [2, 1]], w: 3 },
  { n: 'S', col: '#7ADC80', cells: [[1, 0], [2, 0], [0, 1], [1, 1]], w: 3 },
  { n: 'Z', col: '#FF7A8A', cells: [[0, 0], [1, 0], [1, 1], [2, 1]], w: 3 },
  { n: 'J', col: '#6A9AF0', cells: [[0, 0], [0, 1], [1, 1], [2, 1]], w: 3 },
  { n: 'L', col: '#FFA05A', cells: [[2, 0], [0, 1], [1, 1], [2, 1]], w: 3 },
];

const LEVELS = [1.00, 0.86, 0.74, 0.63, 0.54, 0.46, 0.39, 0.33, 0.28, 0.24, 0.20, 0.17];

const SAVE_KEY = 'tsumi.save.v1';
const save = { hi: 0, lines: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.hi === 'number') save.hi = s.hi;
  if (typeof s.lines === 'number') save.lines = s.lines;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0,
  grid: [], cur: null, next: null, bag: [],
  fall: 0, lock: 0, lines: 0, score: 0, level: 0, over: false,
  flashRows: [], flashT: 0, dragX: 0, msg: '', msgT: 0, startLv: 0,
};

// ★ ばんめん と 右の「つぎ」は ひとかたまりで まん中に よせる。
//   べつべつに おくと、よこ長の 画面で 左が ぽっかり あいて しまう。
function panelW() { return Math.max(74, Math.min(160, VW * 0.17)); }
function box() {
  const top = HUD + 6, bot = 8;
  const pw = panelW();
  const c = Math.floor(Math.min((VH - top - bot) / ROWS, (VW - pw - 40) / COLS));
  const w = c * COLS, h = c * ROWS;
  const total = w + 16 + pw;
  return { c: c, x: Math.round((VW - total) / 2), y: top, w: w, h: h, pw: pw };
}

// --- かたち の そうさ ---------------------------------------------------------------

function rotCells(cells, w, times) {
  let cs = cells.map((p) => [p[0], p[1]]);
  for (let t = 0; t < times; t++) cs = cs.map((p) => [w - 1 - p[1], p[0]]);
  return cs;
}
function pieceCells(p) { return rotCells(PIECES[p.i].cells, PIECES[p.i].w, p.r); }

function fits(p, dx, dy, dr) {
  const q = { i: p.i, r: (p.r + (dr || 0) + 4) % 4 };
  const cs = pieceCells(q);
  for (const [cx, cy] of cs) {
    const x = p.x + cx + (dx || 0), y = p.y + cy + (dy || 0);
    if (x < 0 || x >= COLS || y >= ROWS) return false;
    if (y >= 0 && G.grid[y][x]) return false;
  }
  return true;
}

function nextFromBag() {
  if (G.bag.length === 0) {
    G.bag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = G.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = G.bag[i]; G.bag[i] = G.bag[j]; G.bag[j] = t;
    }
  }
  return G.bag.pop();
}

function spawn() {
  const i = G.next === null ? nextFromBag() : G.next;
  G.next = nextFromBag();
  G.cur = { i: i, r: 0, x: Math.floor((COLS - PIECES[i].w) / 2), y: -1 };
  G.fall = fallTime(); G.lock = 0;
  if (!fits(G.cur, 0, 0, 0)) endGame();
}

function fallTime() { return LEVELS[Math.min(LEVELS.length - 1, G.level)]; }

function lockPiece() {
  for (const [cx, cy] of pieceCells(G.cur)) {
    const x = G.cur.x + cx, y = G.cur.y + cy;
    if (y >= 0) G.grid[y][x] = PIECES[G.cur.i].col;
  }
  sfxTap();
  // そろった れつ
  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    let full = true;
    for (let x = 0; x < COLS; x++) if (!G.grid[y][x]) { full = false; break; }
    if (full) rows.push(y);
  }
  if (rows.length) {
    G.flashRows = rows; G.flashT = 0.32;
    const pts = [0, 100, 300, 600, 1000][rows.length];
    G.score += pts * (G.level + 1);
    G.lines += rows.length;
    save.lines += rows.length;
    G.level = Math.min(LEVELS.length - 1, G.startLv + Math.floor(G.lines / 8));
    bgmHeat(Math.min(1, G.level / 8));
    if (rows.length === 4) { say('すごい！ 4れつ！'); sfxClear(true); }
    else { say(rows.length + 'れつ！'); sfxPop(); }
  } else spawn();
}

function clearRows() {
  for (const y of G.flashRows.sort((a, b) => a - b)) {
    G.grid.splice(y, 1);
    G.grid.unshift(new Array(COLS).fill(null));
  }
  G.flashRows = [];
  spawn();
}

function say(s) { G.msg = s; G.msgT = 1.2; }

function startRun(lv) {
  G.grid = [];
  for (let y = 0; y < ROWS; y++) G.grid.push(new Array(COLS).fill(null));
  G.cur = null; G.next = null; G.bag = [];
  G.lines = 0; G.score = 0; G.startLv = lv || 0; G.level = G.startLv;
  G.over = false; G.flashRows = []; G.flashT = 0;
  G.screen = 'play';
  save.plays++; storeSave();
  spawn();
  bgmStart(4);
  bgmHeat(Math.min(1, G.level / 8));
}

function endGame() {
  G.over = true;
  bgmStop(); sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

// --- そうさ（ゆびの ジェスチャー） --------------------------------------------------

let gStartX = 0, gStartY = 0, gMovedCells = 0, gDropped = false;

function handleInput(dt) {
  const B = box();
  const cur = G.cur;
  if (!cur) return;

  // にぎった しゅんかん
  if (IN.taps.length) { gStartX = IN.cx; gStartY = IN.cy; gMovedCells = 0; gDropped = false; }

  if (IN.hold && !gDropped) {
    // よこ：1ますぶん 動いたら 1ます うごかす
    const want = Math.round((IN.x - gStartX) / B.c);
    while (gMovedCells < want) { if (fits(cur, 1, 0, 0)) { cur.x++; sfxTap(); } gMovedCells++; }
    while (gMovedCells > want) { if (fits(cur, -1, 0, 0)) { cur.x--; sfxTap(); } gMovedCells--; }
    // 下に さっと はらう -> いっきに 落とす
    if (IN.y - gStartY > B.c * 2.2 && Math.abs(IN.x - gStartX) < B.c * 1.6) {
      hardDrop(); gDropped = true;
    }
  }
  // はなした とき、ほとんど 動いて いなければ「まわす」
  if (IN.released && !gDropped && IN.moved < B.c * 0.6) rotate();

  // キーボード
  if (KEYS.ArrowLeft && !G.kl) { if (fits(cur, -1, 0, 0)) cur.x--; }
  if (KEYS.ArrowRight && !G.kr) { if (fits(cur, 1, 0, 0)) cur.x++; }
  G.kl = KEYS.ArrowLeft; G.kr = KEYS.ArrowRight;
  if (KEYS.ArrowUp && !G.ku) rotate();
  G.ku = KEYS.ArrowUp;
  if (KEYS.Space && !G.ks) hardDrop();
  G.ks = KEYS.Space;
  if (KEYS.ArrowDown) G.fall -= dt * 12;
}

function rotate() {
  const cur = G.cur;
  if (!cur) return;
  for (const kick of [0, -1, 1, -2, 2]) {
    if (fits(cur, kick, 0, 1)) {
      cur.x += kick; cur.r = (cur.r + 1) % 4;
      sfxJump();
      return;
    }
  }
}

function ghostY() {
  let d = 0;
  while (fits(G.cur, 0, d + 1, 0)) d++;
  return G.cur.y + d;
}

function hardDrop() {
  const gy = ghostY();
  G.score += (gy - G.cur.y) * 2;
  G.cur.y = gy;
  lockPiece();
  sfxHit();
}

// --- まいコマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play' || G.over) return;

  if (G.flashRows.length) {
    G.flashT -= dt;
    if (G.flashT <= 0) clearRows();
    return;
  }

  handleInput(dt);
  if (!G.cur) return;

  G.fall -= dt;
  if (G.fall <= 0) {
    G.fall = fallTime();
    if (fits(G.cur, 0, 1, 0)) { G.cur.y++; G.lock = 0; }
    else {
      G.lock += fallTime();
      if (G.lock > 0.28) lockPiece();
    }
  }
}

// --- 絵 ---------------------------------------------------------------------------

function cell(B, x, y, col, alpha) {
  const px = B.x + x * B.c, py = B.y + y * B.c;
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = col;
  rr(px + 1, py + 1, B.c - 2, B.c - 2, B.c * 0.22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  rr(px + 3, py + 3, B.c - 6, (B.c - 6) * 0.34, B.c * 0.16); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlay() {
  const B = box();
  bgGrad('#1A2038', '#080A14');

  // わく
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  rr(B.x - 6, B.y - 6, B.w + 12, B.h + 12, 10); ctx.fill();
  ctx.fillStyle = '#0E1120';
  ctx.fillRect(B.x, B.y, B.w, B.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath(); ctx.moveTo(B.x + x * B.c, B.y); ctx.lineTo(B.x + x * B.c, B.y + B.h); ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(B.x, B.y + y * B.c); ctx.lineTo(B.x + B.w, B.y + y * B.c); ctx.stroke();
  }

  // つんだ ブロック
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) if (G.grid[y][x]) cell(B, x, y, G.grid[y][x]);
  }

  // 消える れつを ひからせる
  if (G.flashRows.length) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.4 * Math.abs(Math.sin(G.t * 30))) + ')';
    for (const y of G.flashRows) ctx.fillRect(B.x, B.y + y * B.c, B.w, B.c);
  }

  if (G.cur && !G.flashRows.length) {
    // 落ちる 先の かげ
    const gy = ghostY();
    for (const [cx, cy] of pieceCells(G.cur)) {
      const y = gy + cy;
      if (y >= 0) cell(B, G.cur.x + cx, y, PIECES[G.cur.i].col, 0.22);
    }
    for (const [cx, cy] of pieceCells(G.cur)) {
      const y = G.cur.y + cy;
      if (y >= 0) cell(B, G.cur.x + cx, y, PIECES[G.cur.i].col);
    }
  }

  // 右がわ：つぎの ブロックと パパ
  const rx = B.x + B.w + 16;
  const rw = B.pw;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  rr(rx, B.y, rw, B.c * 4.4, 8); ctx.fill();
  bigText('つぎ', rx + rw / 2, B.y + 14, 13, '#C8BCE8', null);
  if (G.next !== null) {
    const P = PIECES[G.next];
    const s = Math.min(B.c * 0.8, rw / 5);
    const cs = P.cells;
    const w = Math.max(...cs.map((p) => p[0])) + 1, h = Math.max(...cs.map((p) => p[1])) + 1;
    const ox = rx + rw / 2 - w * s / 2, oy = B.y + B.c * 2.4 - h * s / 2;
    for (const [cx, cy] of cs) {
      ctx.fillStyle = P.col;
      rr(ox + cx * s + 1, oy + cy * s + 1, s - 2, s - 2, s * 0.22); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      rr(ox + cx * s + 2, oy + cy * s + 2, s - 4, (s - 4) * 0.34, s * 0.16); ctx.fill();
    }
  }
  drawPapa(rx + rw / 2, B.y + B.h - 20, Math.min(26, rw * 0.28),
           { dir: 1, walk: G.t * 0.5, shirt: '#E8B040' });

  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, B.x + B.w / 2, VH * 0.30, 28, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    drawResult(false, 'おしまい！',
      ['スコア ' + G.score, '消した れつ ' + G.lines + '　レベル ' + (G.level + 1)],
      [{ label: 'もういちど', on: () => startRun(G.startLv) },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A'; ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#C8BCE8';
  ctx.fillText('ハイ ' + Math.max(save.hi, G.score), 132, HUD / 2);
  ctx.fillText('れつ ' + G.lines, 232, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('レベル ' + (G.level + 1), VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#20264A', '#0A0C18');
  bigText('リナパパの', VW / 2, 46, 24, '#FFC0DC');
  bigText('ブロックつみ', VW / 2, 84, fitSize('ブロックつみ', VW * 0.6, 48), '#FFD24A');
  bigText('よこに すべらせて 動かす／ちょんと タップで まわす', VW / 2, 122, 16, '#DDE4FF', null);
  bigText('下に さっと はらうと いっきに 落ちる', VW / 2, 146, 15, '#B8C4E8', null);

  // かたちの みほん
  for (let i = 0; i < 7; i++) {
    const P = PIECES[i];
    const s = Math.min(13, VW * 0.016);
    const ox = VW * 0.5 + (i - 3) * s * 5.4 - s * 1.5, oy = 172;
    for (const [cx, cy] of P.cells) {
      ctx.fillStyle = P.col;
      rr(ox + cx * s, oy + cy * s, s - 1.5, s - 1.5, s * 0.22); ctx.fill();
    }
  }

  const bw = Math.min(240, VW * 0.28);
  drawButton(button(VW / 2 - bw / 2, 216, bw, 50, () => startRun(0)), 'はじめる', '#FFD24A');
  bigText('さいしょの はやさ', VW / 2, 284, 14, '#C8BCE8', null);
  const lw = Math.min(64, VW * 0.08);
  for (let i = 0; i < 5; i++) {
    const x = VW / 2 - (lw * 5 + 4 * 4) / 2 + i * (lw + 4);
    drawButton(button(x, 300, lw, 36, () => startRun(i * 2)), String(i * 2 + 1), '#8AD8F0');
  }
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, 350, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#C8BCE8');
  drawButton(button(VW / 2 + 8, 350, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('ハイスコア ' + save.hi + '　ぜんぶで ' + save.lines + 'れつ 消した',
          VW / 2, VH - 22, 15, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#20264A', '#0A0C18');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① よこに すべらせると 1ますずつ 動く（ゆびを はなさなくて よい）',
    '② ちょんと タップすると まわる',
    '③ 下に さっと はらうと いっきに 落ちる',
    '④ うすい かげが 落ちる 先。見ながら place できる',
    '⑤ よこ 1れつ そろうと 消える。4れつ いちどに 消すと 大きな てんすう',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 96 + i * 34, fitSize(s, VW * 0.86, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 66, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'all' });
