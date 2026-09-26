// あおいの おえかきロジック（ピクロス）。
// たて と よこの すうじを ヒントに マスを ぬって、かくれた えを だす パズル。
//   すうじ … その れつに「つづけて ぬる マスの かず」が じゅんばんに ならんで いる
//   まちがえて ぬると ✕に なって おしえて くれる（まちがいが すくないほど ★が ふえる）
// とちゅうの ぬりかたも のこる。

'use strict';

const SAVE = 'oekakilogic.v1';
const COL = { R: '#E84A4A', P: '#FF8FB8', G: '#4AB85A', B: '#4A8AE8', K: '#2A2A3A', W: '#F4F4F8', Y: '#FFD24A', N: '#8A5A34', O: '#FF9A3A', S: '#FFE0C8', V: '#9A6AD8' };
const LEVELS = [['かんたん 5×5', 5], ['ふつう 8×8', 8], ['むずかしい 10×10', 10]];

const sv = Object.assign({ done: {}, prog: {}, tab: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

function clues(arr) { const o = []; let n = 0; for (const c of arr) { if (c) n++; else if (n) { o.push(n); n = 0; } } if (n) o.push(n); return o.length ? o : [0]; }

function startPuzzle(i) {
  const P = PUZZLES[i];
  const H = P.rows.length, W = P.rows[0].length;
  const ans = P.rows.map((r) => [...r].map((c) => (c === '.' ? 0 : 1)));
  // 0 = まだ、1 = ぬった、2 = ✕、3 = まちがい✕
  let grid = ans.map((r) => r.map(() => 0));
  if (sv.prog[i]) { const s = sv.prog[i].g; grid = ans.map((r, y) => r.map((_, x) => +s[y * W + x] || 0)); }
  G.mode = 'play';
  G.P = { i, P, H, W, ans, grid, miss: sv.prog[i] ? sv.prog[i].m : 0, tool: 1, drag: null, done: 0, shake: 0,
    rc: ans.map((r) => clues(r)), cc: ans[0].map((_, x) => clues(ans.map((r) => r[x]))) };
}
function keepProg() { const Q = G.P; sv.prog[Q.i] = { g: Q.grid.map((r) => r.join('')).join(''), m: Q.miss }; save(); }

function layout() {
  const Q = G.P;
  const maxR = Math.max(...Q.rc.map((c) => c.length)), maxC = Math.max(...Q.cc.map((c) => c.length));
  const areaW = VW - 250, areaH = VH - 30;
  const cs = Math.floor(Math.min((areaW - 20) / (Q.W + maxR * 0.62), (areaH - 20) / (Q.H + maxC * 0.62), 58));
  const cw = maxR * cs * 0.62, ch = maxC * cs * 0.62;
  const gw = Q.W * cs, gh = Q.H * cs;
  const x0 = 20 + (areaW - 20 - cw - gw) / 2 + cw, y0 = 15 + (areaH - ch - gh) / 2 + ch;
  return { cs, x0, y0, cw, ch };
}
function cellAt(x, y) {
  const L = layout(), Q = G.P;
  const cx = Math.floor((x - L.x0) / L.cs), cy = Math.floor((y - L.y0) / L.cs);
  if (cx < 0 || cy < 0 || cx >= Q.W || cy >= Q.H) return null;
  return [cx, cy];
}
function rowDone(y) { const Q = G.P; return Q.ans[y].every((a, x) => !a || Q.grid[y][x] === 1); }
function colDone(x) { const Q = G.P; return Q.ans.every((r, y) => !r[x] || Q.grid[y][x] === 1); }

function act(cx, cy) {
  const Q = G.P, d = Q.drag;
  const cur = Q.grid[cy][cx];
  if (d.action === 'fill') {
    if (cur !== 0) return;
    if (Q.ans[cy][cx]) { Q.grid[cy][cx] = 1; tone(700 + (cx + cy) * 15, 0.04, 'triangle', 0.07); }
    else { Q.grid[cy][cx] = 3; Q.miss++; Q.shake = 0.3; tone(180, 0.18, 'square', 0.08); d.stop = true; }
    // そろった れつは のこりを ✕に
    if (rowDone(cy)) for (let x = 0; x < Q.W; x++) if (Q.grid[cy][x] === 0) Q.grid[cy][x] = 2;
    if (colDone(cx)) for (let y = 0; y < Q.H; y++) if (Q.grid[y][cx] === 0) Q.grid[y][cx] = 2;
  } else if (d.action === 'x') { if (cur === 0) Q.grid[cy][cx] = 2; }
  else if (d.action === 'unx') { if (cur === 2) Q.grid[cy][cx] = 0; }
  if (Q.ans.every((r, y) => r.every((a, x) => !a || Q.grid[y][x] === 1))) solved();
}
function solved() {
  const Q = G.P;
  Q.done = 0.01;
  const stars = Q.miss === 0 ? 3 : Q.miss <= 2 ? 2 : 1;
  Q.stars = stars;
  sv.done[Q.i] = Math.max(sv.done[Q.i] || 0, stars);
  delete sv.prog[Q.i];
  save();
  jingle([72, 76, 79, 84, 88, 91], 0.08, 'square', 0.13);
}

// --- え -------------------------------------------------------------------------------

function drawPlay(t) {
  const Q = G.P, L = layout();
  ctx.fillStyle = grad(0, VH, '#E8DEFA', '#CFC0F0'); ctx.fillRect(0, 0, VW, VH);
  const sh = Q.shake > 0 ? Math.sin(t * 90) * 5 : 0;
  ctx.save(); ctx.translate(sh, 0);
  // ヒントの すうじ
  for (let y = 0; y < Q.H; y++) {
    const c = Q.rc[y], done = rowDone(y);
    fillR(L.x0 - L.cw - 4, L.y0 + y * L.cs + 1, L.cw, L.cs - 2, y % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)');
    c.forEach((n, k) => text(n, L.x0 - 10 - (c.length - 1 - k) * L.cs * 0.62, L.y0 + (y + 0.5) * L.cs, L.cs * 0.5, done ? '#B8A8D8' : '#2A2440', 'right'));
  }
  for (let x = 0; x < Q.W; x++) {
    const c = Q.cc[x], done = colDone(x);
    fillR(L.x0 + x * L.cs + 1, L.y0 - L.ch - 4, L.cs - 2, L.ch, x % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)');
    c.forEach((n, k) => text(n, L.x0 + (x + 0.5) * L.cs, L.y0 - 12 - (c.length - 1 - k) * L.cs * 0.62, L.cs * 0.5, done ? '#B8A8D8' : '#2A2440', 'center'));
  }
  // マス
  fillR(L.x0 - 2, L.y0 - 2, Q.W * L.cs + 4, Q.H * L.cs + 4, '#2A2440');
  for (let y = 0; y < Q.H; y++) for (let x = 0; x < Q.W; x++) {
    const v = Q.grid[y][x], px = L.x0 + x * L.cs, py = L.y0 + y * L.cs;
    const reveal = Q.done && Q.ans[y][x];
    fillR(px + 1, py + 1, L.cs - 2, L.cs - 2, reveal ? COL[Q.P.rows[y][x]] : Q.done ? '#DCD2F2' : v === 1 ? '#6A4AA8' : '#FFFFFF');
    if (v === 2 || v === 3) { ctx.strokeStyle = v === 3 ? '#E84A4A' : '#B8A8D8'; ctx.lineWidth = Math.max(2, L.cs * 0.08); const m = L.cs * 0.28; ctx.beginPath(); ctx.moveTo(px + m, py + m); ctx.lineTo(px + L.cs - m, py + L.cs - m); ctx.moveTo(px + L.cs - m, py + m); ctx.lineTo(px + m, py + L.cs - m); ctx.stroke(); }
  }
  // 5マス ごとの ふとい せん
  ctx.strokeStyle = '#2A2440'; ctx.lineWidth = 3;
  for (let k = 5; k < Q.W; k += 5) { ctx.beginPath(); ctx.moveTo(L.x0 + k * L.cs, L.y0); ctx.lineTo(L.x0 + k * L.cs, L.y0 + Q.H * L.cs); ctx.stroke(); }
  for (let k = 5; k < Q.H; k += 5) { ctx.beginPath(); ctx.moveTo(L.x0, L.y0 + k * L.cs); ctx.lineTo(L.x0 + Q.W * L.cs, L.y0 + k * L.cs); ctx.stroke(); }
  ctx.restore();
  // みぎの パネル
  const px = VW - 230;
  fillRR(px, 12, 218, VH - 24, 16, 'rgba(255,255,255,0.7)');
  text(Q.done ? Q.P.name : 'なにが でるかな？', px + 109, 40, 20, '#4A2A8A', 'center', true, 200);
  text('まちがい ' + Q.miss, px + 109, 70, 17, Q.miss ? '#E84A4A' : '#6A6A7A', 'center');
  btn(px + 14, 90, 92, 70, 'ぬる', () => { Q.tool = 1; }, { col: Q.tool === 1 ? '#FFE066' : '#F0ECFA', size: 20 });
  btn(px + 112, 90, 92, 70, '✕', () => { Q.tool = 2; }, { col: Q.tool === 2 ? '#FFE066' : '#F0ECFA', size: 26 });
  text('✕ は「ぬらない」しるし', px + 109, 176, 13, '#6A6A7A', 'center');
  drawKid('aoi', px + 109, VH - 104, Q.done ? 96 : 150, { t, pose: Q.done ? 'cheer' : 'stand' });
  btn(px + 14, VH - 92, 190, 60, 'もどる', () => { if (!Q.done) keepProg(); G.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  if (Q.done > 0.8) {
    fillRR(px + 10, 186, 198, 150, 14, '#FFFFFF');
    text('できた！', px + 109, 212, 26, '#E04A7A', 'center');
    for (let k = 0; k < 3; k++) { star(px + 59 + k * 50, 250, 18); ctx.fillStyle = k < Q.stars ? '#FFD24A' : '#E0E0E8'; ctx.fill(); }
    btn(px + 34, 276, 150, 50, 'つぎへ', () => { const n = Q.i + 1; if (n < PUZZLES.length) startPuzzle(n); else G.mode = 'title'; }, { col: '#9AF0B8', size: 18 });
  }
}

function drawThumb(i, x, y, s, solved) {
  const P = PUZZLES[i], n = P.rows.length, c = s / n;
  fillR(x, y, s, s, '#FFFFFF');
  if (!solved) { text('？', x + s / 2, y + s / 2, s * 0.5, '#C8B8E8', 'center'); return; }
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) { const ch = P.rows[yy][xx]; if (ch !== '.') fillR(x + xx * c, y + yy * c, c + 0.5, c + 0.5, COL[ch]); }
}
function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#B89AF0', '#E8DEFA'); ctx.fillRect(0, 0, VW, VH);
  textO('あおいの おえかきロジック', VW / 2, 44, 40, '#FFFFFF', '#6A4AA8');
  text('すうじの ヒントで マスを ぬると、えが でて くるよ', VW / 2, 86, 17, '#4A2A8A', 'center');
  LEVELS.forEach(([name, n], k) => btn(VW / 2 - 330 + k * 225, 108, 210, 48, name, () => { sv.tab = k; save(); }, { col: sv.tab === k ? '#FFE066' : '#F0ECFA', size: 18 }));
  const n = LEVELS[sv.tab][1];
  const list = PUZZLES.map((p, i) => i).filter((i) => PUZZLES[i].rows.length === n);
  list.forEach((i, k) => {
    const x = VW / 2 - 3 * 150 + 25 + (k % 6) * 150, y = 180;
    btn(x - 8, y - 8, 116, 150, '', () => startPuzzle(i), { col: '#FFFFFF' });
    drawThumb(i, x, y, 100, sv.done[i]);
    text(sv.done[i] ? PUZZLES[i].name : sv.prog[i] ? 'とちゅう' : (k + 1) + 'もんめ', x + 50, y + 116, 14, '#4A2A8A', 'center', true, 104);
    if (sv.done[i]) for (let s = 0; s < 3; s++) { star(x + 26 + s * 24, y + 134, 8); ctx.fillStyle = s < sv.done[i] ? '#FFB020' : '#E0E0E8'; ctx.fill(); }
  });
  drawKid('aoi', 110, VH - 20, 160, { t, pose: 'wave' });
  fillRR(200, VH - 180, VW - 230, 150, 16, 'rgba(255,255,255,0.8)');
  const tips = ['れい：「3 1」は、3マス つづけて ぬって、1マス いじょう あけて、1マス ぬる。', 'たて と よこの すうじを どちらも まもる ように ぬろう。',
    'ぜったい ぬらない マスには ✕ を つけると わかりやすい。', 'ゆびで なぞると まとめて ぬれるよ。'];
  tips.forEach((s, i) => text(s, 220, VH - 154 + i * 32, 15, '#2A2440', 'left', false, VW - 270));
  void t;
}

startGame({
  bg: '#6A4AA8',
  update(dt) { G.t += dt; if (G.P && G.P.shake > 0) G.P.shake -= dt; if (G.P && G.P.done) G.P.done += dt; },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawPlay(t); },
  down(x, y) {
    if (G.mode !== 'play' || G.P.done) return;
    const c = cellAt(x, y); if (!c) return;
    const Q = G.P, cur = Q.grid[c[1]][c[0]];
    Q.drag = { sx: c[0], sy: c[1], axis: null, action: Q.tool === 1 ? 'fill' : cur === 2 ? 'unx' : 'x' };
    act(c[0], c[1]);
  },
  move(x, y, drag) {
    const Q = G.P;
    if (G.mode !== 'play' || !drag || !Q || !Q.drag || Q.drag.stop || Q.done) return;
    const c = cellAt(x, y); if (!c) return;
    const d = Q.drag;
    if (!d.axis && (c[0] !== d.sx || c[1] !== d.sy)) d.axis = c[0] !== d.sx ? 'x' : 'y';
    if (d.axis === 'x') c[1] = d.sy; else if (d.axis === 'y') c[0] = d.sx;
    act(c[0], c[1]);
  },
  up() { if (G.P && G.P.drag) { G.P.drag = null; if (!G.P.done) keepProg(); } },
});
