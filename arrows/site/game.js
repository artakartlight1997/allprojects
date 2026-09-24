// りなの やじるし だっしゅつ。
// やじるしを タップすると、やじるしの むきに にょろにょろ すすんで ばんの そとへ でる。
// とちゅうに ほかの やじるしが あると ぶつかって ハートが へる（3つ）。
// ぜんぶ そとへ だせたら クリア。全30めん。
//
// ★ めんは じどうで 作る。「そとへ でる みちが あいている やじるし」を
//   1本ずつ くわえて いくので、くわえた ぎゃくの じゅんに だせば かならず とける。

'use strict';

const SAVE = 'yajirushi.v1';
const sv = store.get(SAVE, { best: 0, stars: {} });
const DV = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const COLS_A = ['#E8506A', '#F08A2A', '#E0B820', '#4AAE5E', '#3A8AD8', '#8A5AD8', '#D85AB8', '#2AA8A8'];

// たねつきの らんすう（めんが まいかい おなじに なる）
function rng(seed) { let s = seed * 2654435761 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function levelSpec(i) {
  const size = [5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10][i];
  const fill = 0.66 + Math.min(0.24, i * 0.01);
  const maxLen = Math.min(7, 3 + Math.floor(i / 5));
  return { size, fill, maxLen, seed: 1000 + i * 77 };
}

// めんを つくる
function makeLevel(i) {
  const sp = levelSpec(i);
  for (let attempt = 0; attempt < 60; attempt++) {
    const R = rng(sp.seed + attempt * 13);
    const n = sp.size;
    const occ = [];
    for (let y = 0; y < n; y++) occ.push(new Array(n).fill(-1));
    const arrows = [];
    let tries = 0;
    const target = Math.floor(n * n * sp.fill);
    let filled = 0;
    while (filled < target && tries < 12000) {
      tries++;
      // あたまの いち と むき
      const hx = Math.floor(R() * n), hy = Math.floor(R() * n);
      if (occ[hy][hx] >= 0) continue;
      const dk = 'RLUD'[Math.floor(R() * 4)];
      const d = DV[dk];
      // あたまから そとまで あいているか
      let ok = true;
      for (let x = hx + d[0], y = hy + d[1]; x >= 0 && y >= 0 && x < n && y < n; x += d[0], y += d[1]) if (occ[y][x] >= 0) { ok = false; break; }
      if (!ok) continue;
      // からだ（あたまの うしろへ のびる。まがっても よい）
      const len = 2 + Math.floor(R() * (sp.maxLen - 1));
      const cells = [[hx, hy]];
      let cx = hx - d[0], cy = hy - d[1];
      // からだの 2マスめは まっすぐ うしろ
      if (cx < 0 || cy < 0 || cx >= n || cy >= n || occ[cy][cx] >= 0) continue;
      // まえに すすむ みちに からだが かかっては いけない
      cells.push([cx, cy]);
      for (let k = 2; k < len; k++) {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ax, ay]) => [cx + ax, cy + ay])
          .filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && occ[y][x] < 0 && !cells.some((c) => c[0] === x && c[1] === y));
        if (!opts.length) break;
        const o = opts[Math.floor(R() * opts.length)];
        cells.push(o); cx = o[0]; cy = o[1];
      }
      // からだが じぶんの まえに いないか（あたまの まえの れつ）
      let front = false;
      for (const [x, y] of cells.slice(1)) {
        if (d[0] && y === hy && (x - hx) * d[0] > 0) front = true;
        if (d[1] && x === hx && (y - hy) * d[1] > 0) front = true;
      }
      if (front) continue;
      const id = arrows.length;
      for (const [x, y] of cells) occ[y][x] = id;
      arrows.push({ id, cells: cells.slice().reverse(), dir: dk, col: COLS_A[id % COLS_A.length], out: false, s: 0 });
      filled += cells.length;
    }
    if (filled >= target * 0.85 && arrows.length >= 4) return { n: sp.size, arrows };
  }
  return null;
}

const A = { mode: 'title', lv: 0, n: 5, arrows: [], occ: [], hearts: 3, hints: 3, moving: [], bump: null, hint: -1, clearT: 0, fail: false, taps: 0 };

function startLevel(i) {
  const L = makeLevel(i);
  A.lv = i; A.n = L.n; A.arrows = L.arrows; A.hearts = 3; A.hints = 3; A.moving = []; A.bump = null; A.hint = -1;
  A.clearT = 0; A.fail = false; A.mode = 'play'; A.taps = 0;
  rebuildOcc();
}
function rebuildOcc() {
  A.occ = [];
  for (let y = 0; y < A.n; y++) A.occ.push(new Array(A.n).fill(-1));
  for (const a of A.arrows) if (!a.out && !a.going) for (const [x, y] of a.cells) A.occ[y][x] = a.id;
}
function head(a) { return a.cells[a.cells.length - 1]; }
function blockedBy(a) {
  const [hx, hy] = head(a), d = DV[a.dir];
  let steps = 0;
  for (let x = hx + d[0], y = hy + d[1]; x >= 0 && y >= 0 && x < A.n && y < A.n; x += d[0], y += d[1]) {
    steps++;
    const o = A.occ[y][x];
    if (o >= 0 && o !== a.id) return { id: o, steps };
  }
  return null;
}

function tapArrow(a) {
  if (a.out || a.going || A.fail || A.clearT) return;
  A.taps++;
  A.hint = -1;
  const bl = blockedBy(a);
  if (bl) {
    A.hearts--;
    A.bump = { a, t: 0, steps: bl.steps, other: bl.id };
    tone(180, 0.2, 'square', 0.12, 90);
    if (A.hearts <= 0) { A.fail = true; A.failT = 0; }
    return;
  }
  a.going = true; a.s = 0;
  // すすむ みち：からだ ＋ あたまの まえ
  const d = DV[a.dir];
  const [hx, hy] = head(a);
  a.path = a.cells.slice();
  for (let k = 1; k <= A.n + a.cells.length + 1; k++) a.path.push([hx + d[0] * k, hy + d[1] * k]);
  rebuildOcc();
  jingle([72 + (a.id % 5) * 2, 79 + (a.id % 5) * 2], 0.05, 'triangle', 0.1);
}

function hintArrow() {
  if (A.hints <= 0) return;
  const c = A.arrows.find((a) => !a.out && !a.going && !blockedBy(a));
  if (c) { A.hint = c.id; A.hints--; tone(1200, 0.1, 'sine', 0.1); }
}

// --- かく ----------------------------------------------------------------------------

function geom() {
  const cs = Math.min(64, (VH - 60) / A.n, (VW - 380) / A.n);
  const bw = cs * A.n;
  return { cs, bx: (VW - bw) / 2, by: (VH - bw) / 2, bw };
}
function cellCenter(x, y) { const G = geom(); return [G.bx + (x + 0.5) * G.cs, G.by + (y + 0.5) * G.cs]; }

function drawArrow(a, t) {
  const G = geom();
  let pts;
  if (a.going) {
    // にょろにょろ すすむ
    const s = a.s, k = Math.floor(s), f = s - k;
    pts = [];
    for (let i = 0; i < a.cells.length; i++) {
      const p0 = a.path[Math.min(a.path.length - 1, i + k)], p1 = a.path[Math.min(a.path.length - 1, i + k + 1)];
      pts.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]);
    }
  } else pts = a.cells.map((c) => c.slice());
  // ぶつかった ときは まえに ちょっと でて もどる
  let ox = 0, oy = 0;
  if (A.bump && A.bump.a === a) {
    const u = A.bump.t / 0.4, d = DV[a.dir];
    const amt = Math.sin(Math.min(1, u) * Math.PI) * Math.min(0.45, A.bump.steps - 0.55);
    ox = d[0] * amt; oy = d[1] * amt;
  }
  const px = pts.map(([x, y]) => [G.bx + (x + 0.5 + ox) * G.cs, G.by + (y + 0.5 + oy) * G.cs]);
  const hl = A.hint === a.id;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (hl) {
    ctx.strokeStyle = 'rgba(255,224,102,' + (0.5 + Math.sin(t * 8) * 0.4) + ')';
    ctx.lineWidth = G.cs * 0.62;
    ctx.beginPath(); px.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = G.cs * 0.4;
  ctx.beginPath(); px.forEach(([x, y], i) => (i ? ctx.lineTo(x + 2, y + 3) : ctx.moveTo(x + 2, y + 3))); ctx.stroke();
  ctx.strokeStyle = a.col; ctx.lineWidth = G.cs * 0.36;
  ctx.beginPath(); px.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  // しっぽの まる
  fillC(px[0][0], px[0][1], G.cs * 0.2, a.col);
  // あたま（さんかく）
  const [hx, hy] = px[px.length - 1], d = DV[a.dir], sz = G.cs * 0.36;
  ctx.fillStyle = a.col;
  ctx.beginPath();
  ctx.moveTo(hx + d[0] * sz * 1.25, hy + d[1] * sz * 1.25);
  ctx.lineTo(hx - d[1] * sz - d[0] * sz * 0.2, hy + d[0] * sz - d[1] * sz * 0.2);
  ctx.lineTo(hx + d[1] * sz - d[0] * sz * 0.2, hy - d[0] * sz - d[1] * sz * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fillC(hx - d[0] * sz * 0.2, hy - d[1] * sz * 0.2, sz * 0.18, 'rgba(255,255,255,0.8)');
}

function drawPlay(t, dt) {
  ctx.fillStyle = '#F4EEE0'; ctx.fillRect(0, 0, VW, VH);
  const G = geom();
  fillRR(G.bx - 12, G.by - 12, G.bw + 24, G.bw + 24, 16, '#FFFFFF');
  ctx.fillStyle = '#E8E0D0';
  for (let y = 0; y < A.n; y++) for (let x = 0; x < A.n; x++) fillC(G.bx + (x + 0.5) * G.cs, G.by + (y + 0.5) * G.cs, 2.5, '#D8CEB8');
  // うごき
  for (const a of A.arrows) {
    if (a.going) {
      a.s += dt * 16;
      if (a.s > a.cells.length + A.n + 1) { a.going = false; a.out = true; }
    }
  }
  if (A.bump) { A.bump.t += dt; if (A.bump.t > 0.4) A.bump = null; }
  ctx.save(); ctx.beginPath(); ctx.rect(G.bx - G.cs * 2.5, 0, G.bw + G.cs * 5, VH); ctx.clip();
  for (const a of A.arrows) if (!a.out) drawArrow(a, t);
  ctx.restore();
  // じょうほう
  text('レベル ' + (A.lv + 1), 30, 50, 30, '#5A4A3A');
  for (let i = 0; i < 3; i++) {
    const c = i < A.hearts ? '#E8506A' : '#D8CEB8';
    const x = 44 + i * 40, y = 100;
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x, y + 12); ctx.bezierCurveTo(x - 20, y - 2, x - 10, y - 16, x, y - 6); ctx.bezierCurveTo(x + 10, y - 16, x + 20, y - 2, x, y + 12); ctx.fill();
  }
  const left = A.arrows.filter((a) => !a.out).length;
  text('のこり ' + left, 30, 150, 22, '#5A4A3A');
  const rx = VW - 170;
  btn(rx, 30, 150, 56, 'ヒント ' + A.hints, hintArrow, { off: A.hints <= 0, col: '#FFE066', size: 20 });
  btn(rx, 100, 150, 56, 'やりなおし', () => startLevel(A.lv), { col: '#D8E8F0', size: 18 });
  btn(rx, VH - 80, 150, 56, 'レベル いちらん', () => { A.mode = 'select'; }, { col: '#E8E0D0', size: 16 });
  if (A.taps === 0 && A.lv < 2) textO('やじるしを タップ！ むきの ほうへ でていくよ', VW / 2, VH - 18, 20, '#FFFFFF', 'rgba(90,74,58,0.9)');
  // クリア / しっぱい
  if (!left && !A.clearT) {
    A.clearT = 0.001;
    const stars = A.hearts;
    sv.stars[A.lv] = Math.max(sv.stars[A.lv] || 0, stars);
    sv.best = Math.max(sv.best, A.lv + 1);
    store.set(SAVE, sv);
    jingle([72, 76, 79, 84], 0.1, 'square', 0.14);
  }
  if (A.clearT) {
    A.clearT += dt;
    if (A.clearT > 0.4) {
      fillR(0, 0, VW, VH, 'rgba(60,40,20,0.45)');
      textO('クリア！', VW / 2, 160, 60, '#FFE066');
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < A.hearts ? '#FFB020' : 'rgba(255,255,255,0.3)'; star(VW / 2 - 60 + k * 60, 240, 24); ctx.fill(); }
      if (A.lv + 1 < 30) btn(VW / 2 - 230, 300, 220, 70, 'つぎへ', () => startLevel(A.lv + 1));
      else text('ぜんぶ クリア！', VW / 2, 335, 30, '#FFFFFF', 'center');
      btn(VW / 2 + 10, 300, 220, 70, 'もういちど', () => startLevel(A.lv), { col: '#D8E8F0' });
    }
  } else if (A.fail) {
    A.failT += dt;
    if (A.failT > 0.5) {
      fillR(0, 0, VW, VH, 'rgba(60,40,20,0.45)');
      textO('ハートが なくなった…', VW / 2, 180, 46, '#FFB0B0');
      btn(VW / 2 - 130, 280, 260, 76, 'もういちど', () => startLevel(A.lv));
    }
  }
}

function drawSelect() {
  ctx.fillStyle = '#F4EEE0'; ctx.fillRect(0, 0, VW, VH);
  text('レベルを えらんでね', VW / 2, 40, 28, '#5A4A3A', 'center');
  btn(16, 14, 110, 48, 'もどる', () => { A.mode = 'title'; }, { col: '#E8E0D0', size: 18 });
  const cols = 10, bw = Math.min(80, (VW - 60) / cols - 8), bh = 110;
  for (let i = 0; i < 30; i++) {
    const x = VW / 2 - (cols * (bw + 8) - 8) / 2 + (i % cols) * (bw + 8), y = 84 + Math.floor(i / cols) * (bh + 20);
    const open = i <= sv.best;
    btn(x, y, bw, bh, '', () => { if (open) startLevel(i); }, { col: open ? '#FFFFFF' : '#E0D8C8' });
    text(open ? String(i + 1) : '🔒', x + bw / 2, y + 40, 28, '#5A4A3A', 'center');
    const st = sv.stars[i] || 0;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k < st ? '#FFB020' : 'rgba(0,0,0,0.1)'; star(x + bw / 2 - 20 + k * 20, y + 84, 8); ctx.fill(); }
  }
}

function drawTitle(t) {
  ctx.fillStyle = '#F4EEE0'; ctx.fillRect(0, 0, VW, VH);
  // かざりの やじるし
  for (let i = 0; i < 9; i++) {
    const y = 60 + i * 55, x = ((t * 80 + i * 170) % (VW + 200)) - 100;
    ctx.strokeStyle = COLS_A[i % 8]; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.moveTo(x - 80, y); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = COLS_A[i % 8]; ctx.beginPath(); ctx.moveTo(x + 18, y); ctx.lineTo(x - 2, y - 14); ctx.lineTo(x - 2, y + 14); ctx.fill();
    ctx.globalAlpha = 1;
  }
  text('りなの', VW / 2, 70, 26, '#5A4A3A', 'center');
  textO('やじるし だっしゅつ', VW / 2, 140, 58, '#E8506A', '#FFFFFF');
  text('とおれる やじるしから じゅんばんに にがそう！', VW / 2, 210, 22, '#5A4A3A', 'center');
  btn(VW / 2 - 160, 270, 320, 80, 'あそぶ', () => { fullScreen(); startLevel(Math.min(sv.best, 29)); }, { col: '#FFE066', sub: 'レベル ' + (Math.min(sv.best, 29) + 1) + ' から' });
  btn(VW / 2 - 160, 370, 320, 60, 'レベル いちらん', () => { A.mode = 'select'; }, { col: '#FFFFFF' });
}

let _lt = 0;
startGame({
  bg: '#F4EEE0',
  draw(t) {
    const dt = Math.min(0.05, t - _lt); _lt = t;
    if (A.mode === 'title') drawTitle(t); else if (A.mode === 'select') drawSelect(); else drawPlay(t, dt);
  },
  down(x, y) {
    if (A.mode !== 'play') return;
    const G = geom();
    const cx = Math.floor((x - G.bx) / G.cs), cy = Math.floor((y - G.by) / G.cs);
    if (cx < 0 || cy < 0 || cx >= A.n || cy >= A.n) return;
    const id = A.occ[cy][cx];
    if (id >= 0) tapArrow(A.arrows[id]);
  },
});
