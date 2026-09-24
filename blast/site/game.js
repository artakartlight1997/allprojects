// ゆいの ぴったりブロック。8×8 の ばんに ブロックを おいて、
// たて か よこ が そろったら 消える。3つ おききったら つぎの 3つ。
// どれも おけなく なったら おしまい（エンドレス）。
// 「ぼうけん」は ほうせきの 入った ブロックを 消して、ぜんぶ あつめたら クリア。

'use strict';

const SAVE = 'pittariblock.v1';
const N = 8;
const sv = store.get(SAVE, { best: 0, adv: 0 });

// かたち（[x, y] の ならび）
const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]], [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [2, 1], [2, 2], [1, 2], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
];
const COLORS = ['#FF6A8A', '#FFB020', '#FFE066', '#7FE0A0', '#6EC6F5', '#8A7AF0', '#E86AD8'];

// ぼうけん：ほうせき（g）と さいしょから ある ブロック（#）
const ADV = [
  { rows: ['........', '........', '..#g#...', '........', '........', '...#g#..', '........', '........'] },
  { rows: ['#......#', '.g....g.', '........', '...##...', '...##...', '........', '.g....g.', '#......#'] },
  { rows: ['########', '#g....g#', '#......#', '#......#', '#......#', '#......#', '#g....g#', '########'] },
  { rows: ['g......g', '.#....#.', '..#..#..', '...gg...', '...gg...', '..#..#..', '.#....#.', 'g......g'] },
  { rows: ['.g.g.g.g', '........', '##.##.##', '........', '........', '##.##.##', '........', 'g.g.g.g.'] },
  { rows: ['#g#g#g#g', 'g#g#g#g#', '........', '........', '........', '........', '#g#g#g#g', 'g#g#g#g#'] },
];

const P = { mode: 'title', board: [], tray: [], drag: null, score: 0, combo: 0, fx: [], texts: [],
  adv: -1, gems: 0, gemsLeft: 0, over: false, overT: 0, streak: 0 };

// ひだり：じょうほう ／ まんなか：ばん ／ みぎ：つぎの 3つ
function layout() {
  const infoW = 160, trayW = 210;
  const cs = Math.min(56, (VH - 70) / N, (VW - infoW - trayW - 80) / N);
  const bw = cs * N;
  const x0 = (VW - (infoW + 24 + bw + 32 + trayW)) / 2;
  const bx = x0 + infoW + 24;
  return { cs, bx, by: (VH - bw) / 2 + 6, bw, tx: bx + bw + 32, trayW, ix: x0, iw: infoW };
}

function newGame(adv) {
  P.board = [];
  for (let y = 0; y < N; y++) { P.board.push([]); for (let x = 0; x < N; x++) P.board[y].push(null); }
  P.adv = adv === undefined ? -1 : adv;
  P.gems = 0; P.gemsLeft = 0;
  if (P.adv >= 0) {
    const rows = ADV[P.adv].rows;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = rows[y][x];
      if (c === '#') P.board[y][x] = { col: '#8A94A8' };
      if (c === 'g') { P.board[y][x] = { col: '#8A94A8', gem: 1 }; P.gemsLeft++; }
    }
  }
  P.score = 0; P.combo = 0; P.streak = 0; P.fx = []; P.texts = []; P.over = false; P.win = false;
  P.mode = 'play';
  dealTray();
}

function fits(shape, gx, gy) {
  for (const [x, y] of shape) {
    const X = gx + x, Y = gy + y;
    if (X < 0 || Y < 0 || X >= N || Y >= N || P.board[Y][X]) return false;
  }
  return true;
}
function canPlaceAnywhere(shape) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(shape, x, y)) return true;
  return false;
}

// 3つ くばる。「3つ とも おける じゅんばんが ある」組だけを くばる
// （さいきんの ブロックパズルと 同じ やさしさ。 運だけで おわらない）
function simPlace(board, shape) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let ok = true;
    for (const [a, b] of shape) { const X = x + a, Y = y + b; if (X >= N || Y >= N || board[Y][X]) { ok = false; break; } }
    if (!ok) continue;
    for (const [a, b] of shape) board[y + b][x + a] = 1;
    const rows = [], cols = [];
    for (let yy = 0; yy < N; yy++) if (board[yy].every((c) => c)) rows.push(yy);
    for (let xx = 0; xx < N; xx++) { let f = true; for (let yy = 0; yy < N; yy++) if (!board[yy][xx]) f = false; if (f) cols.push(xx); }
    for (const yy of rows) for (let xx = 0; xx < N; xx++) board[yy][xx] = 0;
    for (const xx of cols) for (let yy = 0; yy < N; yy++) board[yy][xx] = 0;
    return true;
  }
  return false;
}
function tripleOK(tr) {
  const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const o of orders) {
    const bd = P.board.map((r) => r.map((c) => (c ? 1 : 0)));
    if (o.every((i) => simPlace(bd, tr[i]))) return true;
  }
  return false;
}
function dealTray() {
  let filled = 0;
  for (const r of P.board) for (const c of r) if (c) filled++;
  let tr = null;
  for (let tries = 0; tries < 40; tries++) {
    const cand = [];
    while (cand.length < 3) {
      const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      if (filled > 22 && s.length >= 5 && Math.random() < 0.5) continue;
      cand.push(s);
    }
    tr = cand;
    if (tripleOK(cand)) break;
  }
  P.tray = tr.map((s) => ({ shape: s, col: pick(COLORS), used: false }));
  checkOver();
}

function checkOver() {
  const left = P.tray.filter((t) => !t.used);
  if (left.length && !left.some((t) => canPlaceAnywhere(t.shape))) {
    P.over = true; P.overT = 0;
    if (P.adv < 0 && P.score > sv.best) { sv.best = P.score; store.set(SAVE, sv); P.newBest = true; } else P.newBest = false;
    tone(300, 0.5, 'triangle', 0.15, 90);
  }
}

function place(item, gx, gy) {
  for (const [x, y] of item.shape) P.board[gy + y][gx + x] = { col: item.col, pop: 0.2 };
  item.used = true;
  P.score += item.shape.length;
  tone(520 + item.shape.length * 40, 0.06, 'square', 0.08);
  // そろった れつ を さがす
  const rows = [], cols = [];
  for (let y = 0; y < N; y++) if (P.board[y].every((c) => c)) rows.push(y);
  for (let x = 0; x < N; x++) { let ok = true; for (let y = 0; y < N; y++) if (!P.board[y][x]) ok = false; if (ok) cols.push(x); }
  const lines = rows.length + cols.length;
  if (lines) {
    P.combo++;
    const clear = {};
    for (const y of rows) for (let x = 0; x < N; x++) clear[x + ',' + y] = 1;
    for (const x of cols) for (let y = 0; y < N; y++) clear[x + ',' + y] = 1;
    let gems = 0;
    for (const k in clear) {
      const [x, y] = k.split(',').map(Number);
      const c = P.board[y][x];
      if (c && c.gem) gems++;
      P.fx.push({ x, y, col: c ? c.col : '#FFF', t: 0 });
      P.board[y][x] = null;
    }
    const pts = lines * 10 * lines * Math.min(8, P.combo);
    P.score += pts;
    if (gems) { P.gems += gems; P.gemsLeft -= gems; jingle([84, 88, 91], 0.07, 'triangle', 0.14); }
    const word = lines >= 4 ? 'すごすぎ！！' : lines === 3 ? 'すごい！' : lines === 2 ? 'ダブル！' : P.combo >= 3 ? 'コンボ ' + P.combo + '！' : 'きえた！';
    P.texts.push({ s: word + '  +' + pts, t: 1.3, col: lines >= 3 ? '#FFB020' : '#FFE066' });
    jingle([72, 76, 79, 84, 88].slice(0, 1 + lines), 0.06, 'square', 0.12);
    // ばんが からっぽに なったら ボーナス
    if (P.board.every((r) => r.every((c) => !c))) { P.score += 300; P.texts.push({ s: 'ぜんけし！ +300', t: 1.6, col: '#9AF0B8' }); }
    if (P.adv >= 0 && P.gemsLeft <= 0) {
      P.win = true; P.over = true; P.overT = 0;
      sv.adv = Math.max(sv.adv, P.adv + 1); store.set(SAVE, sv);
      jingle([72, 76, 79, 84, 88, 91], 0.1, 'square', 0.15);
      return;
    }
  } else {
    // 3回 つづけて 消えないと コンボが とぎれる
    P.streak++;
    if (P.streak >= 3) { P.combo = 0; P.streak = 0; }
  }
  if (lines) P.streak = 0;
  if (P.tray.every((t) => t.used)) dealTray();
  else checkOver();
}

// --- そうさ ------------------------------------------------------------------------

function trayRect(i) {
  const L = layout();
  const h = (L.bw) / 3;
  return { x: L.tx, y: L.by + i * h, w: L.trayW, h: h - 8 };
}
function shapeSize(s) { let w = 0, h = 0; for (const [x, y] of s) { w = Math.max(w, x + 1); h = Math.max(h, y + 1); } return { w, h }; }

// ゆびで かくれない ように、すこし 上に もちあげて もつ
const LIFT = 70;
function dragTarget() {
  const d = P.drag, L = layout();
  const sz = shapeSize(d.item.shape);
  const px = d.x - (sz.w * L.cs) / 2, py = d.y - LIFT - (sz.h * L.cs) / 2;
  return { gx: Math.round((px - L.bx) / L.cs), gy: Math.round((py - L.by) / L.cs), px, py };
}

function down(x, y) {
  if (P.mode !== 'play' || P.over) return;
  for (let i = 0; i < 3; i++) {
    const r = trayRect(i);
    if (!P.tray[i].used && inBox(x, y, r)) { P.drag = { i, item: P.tray[i], x, y }; tone(700, 0.04, 'square', 0.05); return; }
  }
}
function move(x, y) { if (P.drag) { P.drag.x = x; P.drag.y = y; } }
// はなした ところに おく
function upWith() {
  const d = P.drag;
  if (!d) return;
  const t = dragTarget();
  P.drag = null;
  if (fits(d.item.shape, t.gx, t.gy)) place(d.item, t.gx, t.gy);
  else tone(200, 0.08, 'square', 0.06);
}

// --- かく ----------------------------------------------------------------------------

function cell(px, py, s, col, gem, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  fillRR(px + 2, py + 2, s - 4, s - 4, 7, col);
  fillRR(px + 6, py + 5, s - 12, (s - 4) * 0.28, 4, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(px + 2, py + s * 0.66, s - 4, s * 0.3, 7); ctx.fill();
  if (gem) {
    ctx.fillStyle = '#7FF0FF';
    ctx.beginPath(); ctx.moveTo(px + s / 2, py + s * 0.2); ctx.lineTo(px + s * 0.78, py + s * 0.45); ctx.lineTo(px + s / 2, py + s * 0.82); ctx.lineTo(px + s * 0.22, py + s * 0.45); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPlay(t, dt) {
  const L = layout();
  ctx.fillStyle = grad(0, VH, '#2A3A7A', '#141A40'); ctx.fillRect(0, 0, VW, VH);
  // ばん
  fillRR(L.bx - 10, L.by - 10, L.bw + 20, L.bw + 20, 14, '#0E1430');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    fillRR(L.bx + x * L.cs + 2, L.by + y * L.cs + 2, L.cs - 4, L.cs - 4, 6, 'rgba(255,255,255,0.06)');
    const c = P.board[y][x];
    if (c) {
      const pz = c.pop > 0 ? 1 + c.pop : 1;
      if (c.pop > 0) c.pop -= dt;
      ctx.save(); ctx.translate(L.bx + x * L.cs + L.cs / 2, L.by + y * L.cs + L.cs / 2); ctx.scale(pz, pz);
      cell(-L.cs / 2, -L.cs / 2, L.cs, c.col, c.gem);
      ctx.restore();
    }
  }
  // おく ばしょの かげ と、そろう れつの ひかり
  if (P.drag) {
    const tg = dragTarget();
    if (fits(P.drag.item.shape, tg.gx, tg.gy)) {
      for (const [x, y] of P.drag.item.shape) cell(L.bx + (tg.gx + x) * L.cs, L.by + (tg.gy + y) * L.cs, L.cs, P.drag.item.col, 0, 0.35);
      // そろう よてい の れつ
      const tmp = P.board.map((r) => r.slice());
      for (const [x, y] of P.drag.item.shape) tmp[tg.gy + y][tg.gx + x] = 1;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + Math.sin(t * 10) * 0.08) + ')';
      for (let y = 0; y < N; y++) if (tmp[y].every((c) => c)) ctx.fillRect(L.bx, L.by + y * L.cs, L.bw, L.cs);
      for (let x = 0; x < N; x++) { let ok = true; for (let y = 0; y < N; y++) if (!tmp[y][x]) ok = false; if (ok) ctx.fillRect(L.bx + x * L.cs, L.by, L.cs, L.bw); }
    }
  }
  // きえた ところの きらきら
  for (const f of P.fx) {
    f.t += dt;
    const u = f.t / 0.5;
    ctx.globalAlpha = Math.max(0, 1 - u);
    const s = L.cs * (1 + u * 0.6);
    fillRR(L.bx + f.x * L.cs + L.cs / 2 - s / 2, L.by + f.y * L.cs + L.cs / 2 - s / 2, s, s, 8, f.col);
    ctx.globalAlpha = 1;
  }
  P.fx = P.fx.filter((f) => f.t < 0.5);
  // トレイ
  for (let i = 0; i < 3; i++) {
    const r = trayRect(i), it = P.tray[i];
    fillRR(r.x, r.y, r.w, r.h, 12, 'rgba(255,255,255,0.07)');
    if (!it || it.used || (P.drag && P.drag.i === i)) continue;
    const sz = shapeSize(it.shape);
    const cs = Math.min(L.cs * 0.6, (r.h - 16) / sz.h, (r.w - 20) / sz.w);
    const ok = canPlaceAnywhere(it.shape);
    for (const [x, y] of it.shape) cell(r.x + r.w / 2 - sz.w * cs / 2 + x * cs, r.y + r.h / 2 - sz.h * cs / 2 + y * cs, cs, ok ? it.col : '#6A6480');
  }
  // もっている ブロック
  if (P.drag) {
    const tg = dragTarget();
    for (const [x, y] of P.drag.item.shape) cell(tg.px + x * L.cs, tg.py + y * L.cs, L.cs, P.drag.item.col, 0, 0.92);
  }
  // じょうほう
  const hx = L.ix, hw = L.iw;
  {
    text(P.adv >= 0 ? 'ぼうけん ' + (P.adv + 1) : 'スコア', hx + hw / 2, 60, 20, '#C8D8FF', 'center', true, hw);
    if (P.adv >= 0) {
      text('ほうせき', hx + hw / 2, 110, 18, '#C8D8FF', 'center');
      textO('のこり ' + P.gemsLeft, hx + hw / 2, 146, 30, '#7FF0FF');
    } else textO(String(P.score), hx + hw / 2, 100, 38, '#FFE066');
    if (P.adv < 0) text('ベスト ' + sv.best, hx + hw / 2, 146, 18, '#C8D8FF', 'center');
    if (P.combo >= 2) textO('コンボ ×' + P.combo, hx + hw / 2, 200, 24, '#FF8FC8');
    btn(hx + 6, VH - 70, hw - 12, 50, 'やめる', () => { P.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  }
  if (P.over && P.overT > 0.5) P.texts = [];
  for (const tx of P.texts) {
    tx.t -= dt;
    ctx.globalAlpha = clamp(tx.t / 0.4, 0, 1);
    textO(tx.s, L.bx + L.bw / 2, L.by + L.bw / 2 - (1.3 - tx.t) * 40, 34, tx.col);
    ctx.globalAlpha = 1;
  }
  P.texts = P.texts.filter((x) => x.t > 0);
  if (P.over) {
    P.overT += dt;
    if (P.overT > 0.6) {
      fillR(0, 0, VW, VH, 'rgba(0,0,0,0.55)');
      if (P.win) {
        textO('ほうせき コンプリート！', VW / 2, 170, 44, '#7FF0FF');
        if (P.adv + 1 < ADV.length) btn(VW / 2 - 230, 290, 220, 70, 'つぎへ', () => newGame(P.adv + 1));
        else text('ぼうけん ぜんぶ クリア！', VW / 2, 320, 26, '#FFE066', 'center');
      } else {
        textO('もう おけない！', VW / 2, 150, 46, '#FFB0B0');
        textO('スコア ' + P.score, VW / 2, 220, 36, '#FFE066');
        if (P.newBest) text('ベスト こうしん！', VW / 2, 268, 24, '#9AF0B8', 'center');
      }
      btn(VW / 2 + 10, 290, 220, 70, 'もういちど', () => newGame(P.adv >= 0 ? P.adv : undefined), { col: '#D8D0F0' });
      btn(VW / 2 - 100, 380, 200, 56, 'タイトルへ', () => { P.mode = 'title'; }, { col: '#D8D0F0', size: 20 });
    }
  }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#2A3A7A', '#141A40'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 18; i++) {
    const x = (i * 131 + t * 30) % (VW + 60) - 30, y = 60 + (i * 83) % (VH - 120);
    cell(x, y, 34, COLORS[i % COLORS.length], i % 5 === 0, 0.45);
  }
  textO('ぴったりブロック', VW / 2, 110, 60, '#FFE066', '#1A1A40');
  text('ゆいの', VW / 2, 50, 26, '#FFFFFF', 'center');
  text('たて か よこ を そろえて けそう！', VW / 2, 174, 22, '#FFFFFF', 'center');
  btn(VW / 2 - 170, 230, 340, 76, 'エンドレス', () => { fullScreen(); newGame(); }, { sub: 'ベスト ' + sv.best });
  btn(VW / 2 - 170, 326, 340, 76, 'ほうせき ぼうけん', () => { fullScreen(); newGame(Math.min(sv.adv, ADV.length - 1)); },
      { col: '#7FF0FF', sub: sv.adv >= ADV.length ? 'ぜんぶ クリア！' : (sv.adv + 1) + ' / ' + ADV.length + ' めん' });
}

let _lt = 0;
startGame({
  bg: '#141A40',
  draw(t) {
    const dt = Math.min(0.05, t - _lt); _lt = t;
    if (P.mode === 'title') drawTitle(t); else drawPlay(t, dt);
  },
  down, move, up: upWith,
});
