// まさきの ボールふえふえ 大くずし。
//
// ボールが「×2」「×3」で どんどん ふえて、ブロックが 一気に くずれる ブロックくずし。
//   ・アイテム … ×2 / ×3（いま ある ボール ぜんぶが ふえる）、+8、ワイド、ファイア
//   ・ゲート … とおりぬけた ボールが ふえる バー（1つの ボールは 1つの ゲートで 1回だけ）
//   ・5めんごとに ボス（うごく でかブロック）
// ボールは 400こ まで（スマホで おもく ならない ように）。

'use strict';

const SAVE = 'ballsfuefue.v1';
const MAXB = 400;
const COLS = 14;

// --- めん --------------------------------------------------------------------------
//  1〜9 … かたさ   x … ×2が でる   X … ×3が でる   p … +8が でる   b … ばくだん
//  gates … [よこの いち(0〜1), たての いち(0〜1), はば(0〜1), ばいりつ, うごく はやさ]

const STAGES = [
  { name: 'はじめの いっぽ', rows: [
    '..............',
    '.111111111111.',
    '.111111x11111.',
    '.111111111111.',
  ], gates: [[0.5, 0.62, 0.3, 2, 0]] },
  { name: 'ふえる たのしさ', rows: [
    '22222222222222',
    '21111111111112',
    '21111x11x11112',
    '21111111111112',
    '22222222222222',
  ], gates: [[0.3, 0.6, 0.22, 2, 0], [0.7, 0.6, 0.22, 2, 0]] },
  { name: 'ハート', rows: [
    '..222....222..',
    '.22222..22222.',
    '222x222222x222',
    '22222222222222',
    '.222222222222.',
    '..2222222222..',
    '...22222222...',
    '....222X22....',
    '.....2222.....',
    '......22......',
  ], gates: [[0.5, 0.7, 0.34, 3, 0]] },
  { name: 'ばくだん しましま', rows: [
    '33333333333333',
    '1b1111b1111b11',
    '33333333333333',
    '11b1111b1111b1',
    '33333x33x33333',
  ], gates: [[0.5, 0.64, 0.25, 2, 60]] },
  { name: 'ボス：でかブロック', boss: 70, rows: [
    '..............',
    '..............',
    '..............',
    '11p11111111p11',
  ], gates: [[0.5, 0.66, 0.3, 2, 0]] },
  { name: 'ピラミッド', rows: [
    '......44......',
    '.....4444.....',
    '....43x334....',
    '...33333333...',
    '..3333X333333.',
    '.222222222222.',
    '22222222222222',
    '11111b11b11111',
  ], gates: [[0.25, 0.66, 0.2, 2, 0], [0.75, 0.66, 0.2, 2, 0]] },
  { name: 'チェック', rows: [
    '4.4.4.4.4.4.4.',
    '.4.4.4X4.4.4.4',
    '4.4.4.4.4.4.4.',
    '.3.3.3.3.3.3.3',
    '3.3x3.3.3x3.3.',
    '.3.3.3.3.3.3.3',
  ], gates: [[0.5, 0.62, 0.3, 3, 80]] },
  { name: 'ほし', rows: [
    '......55......',
    '......55......',
    '.....5555.....',
    '55555555555555',
    '.555555X55555.',
    '..5555555555..',
    '...55555555...',
    '..555x..x555..',
    '.5555....5555.',
    '555........555',
  ], gates: [[0.5, 0.72, 0.22, 2, 0], [0.2, 0.6, 0.16, 2, 0], [0.8, 0.6, 0.16, 2, 0]] },
  { name: '小倉城', rows: [
    '.....6666.....',
    '....666666....',
    '.......6......',
    '...55555555...',
    '..5555X55555..',
    '.....4444.....',
    '..4444444444..',
    '.44x44444x444.',
    '33333333333333',
    '3333b3333b3333',
  ], gates: [[0.5, 0.74, 0.34, 3, 0]] },
  { name: 'ボス：ぐるぐるブロック', boss: 150, rows: [
    '..............',
    '..............',
    '..............',
    '..............',
    '22p2222222p222',
    '33333b33b33333',
  ], gates: [[0.3, 0.68, 0.2, 2, 90], [0.7, 0.68, 0.2, 2, -90]] },
  { name: 'かべ', rows: [
    '66666666666666',
    '66666666666666',
    '5555X5555X5555',
    '55555555555555',
    '44444444444444',
    '4b44444444444b',
  ], gates: [[0.5, 0.62, 0.5, 3, 0]] },
  { name: 'にっこり', rows: [
    '...77777777...',
    '..7777777777..',
    '.777.7777.777.',
    '.777.7777.777.',
    '.777777777777.',
    '.77x777777X77.',
    '.777.....7777.',
    '..777....777..',
    '...77777777...',
  ], gates: [[0.5, 0.74, 0.24, 3, 120]] },
  { name: 'ぐるぐる', rows: [
    '88888888888888',
    '8............8',
    '8.6666666666.8',
    '8.6........6.8',
    '8.6.44X444.6.8',
    '8.6.4....x.6.8',
    '8.6.444444.6.8',
    '8.6........6.8',
    '8.666666666b.8',
  ], gates: [[0.5, 0.78, 0.4, 2, 100]] },
  { name: 'とりで', rows: [
    '9.9.9.9.9.9.9.',
    '99999999999999',
    '8888X8888X8888',
    '77777777777777',
    '66b66666666b66',
    '55555555555555',
    '4444x4444x4444',
  ], gates: [[0.25, 0.7, 0.2, 3, 0], [0.75, 0.7, 0.2, 3, 0]] },
  { name: 'ボス：キングブロック', boss: 320, rows: [
    '..............',
    '..............',
    '..............',
    '..............',
    '55p5555555p555',
    '4444b4444b4444',
    '33X33333333X33',
  ], gates: [[0.5, 0.72, 0.3, 3, 110]] },
];

// --- じょうたい ----------------------------------------------------------------------

const sv = store.get(SAVE, { best: 0, stars: {} });
const W = { mode: 'title', stage: 0, balls: [], bricks: [], items: [], parts: [], gates: [], texts: [],
  pad: { x: 0, w: 110, wideT: 0 }, fireT: 0, lives: 3, score: 0, held: true, boss: null, t: 0,
  dragOff: 0, dragging: false, clearT: 0, sndT: 0, maxBalls: 0, shake: 0 };

// ばめんの ひろさ（ひだりに じょうほう、まんなかが あそぶ ところ）
function field() {
  const fw = Math.min(700, VW - 250);
  return { x: VW - fw - 24, y: 12, w: fw, h: VH - 24 };
}
function cellW() { return field().w / COLS; }
const CH = 24;

function startStage(i) {
  W.stage = i; W.mode = 'play';
  const F = field(), cw = cellW();
  const S = STAGES[i];
  W.bricks = [];
  S.rows.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const hp = /[1-9]/.test(ch) ? +ch : 1;
      W.bricks.push({ c, r, x: F.x + c * cw, y: F.y + 70 + r * CH, w: cw, h: CH, hp, mhp: hp,
                      kind: /[1-9]/.test(ch) ? 'n' : ch, hit: 0 });
    }
  });
  W.boss = S.boss ? { x: F.x + F.w / 2 - cw * 2.5, y: F.y + 70, w: cw * 5, h: CH * 3, hp: S.boss, mhp: S.boss, vx: 90, hit: 0 } : null;
  W.gates = (S.gates || []).map((g, gi) => ({ id: gi, x: F.x + F.w * g[0], y: F.y + F.h * g[1], w: F.w * g[2], mult: g[3], vx: g[4], hit: 0 }));
  W.balls = []; W.items = []; W.parts = []; W.texts = [];
  W.pad = { x: F.x + F.w / 2, w: 120, wideT: 0 };
  W.fireT = 0; W.lives = 3; W.score = 0; W.held = true; W.maxBalls = 1;
  resetBall();
  text2('ステージ ' + (i + 1) + '：' + S.name, '#FFE066', 2.2);
}
function resetBall() {
  W.balls = [newBall(W.pad.x, padY() - 9, 0, -1)];
  W.held = true;
}
function padY() { return field().y + field().h - 40; }
function newBall(x, y, dx, dy) {
  const sp = 470;
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, vx: dx / l * sp, vy: dy / l * sp, gate: -1, gt: 0 };
}
function text2(s, col, t) { W.texts.push({ s, col, t: t || 1.4, t0: t || 1.4 }); if (W.texts.length > 3) W.texts.shift(); }

// ボールを ふやす（いまの ボール ぜんぶが mult ばいに）
function multiply(mult, only) {
  const src = only || W.balls.slice();
  const add = [];
  for (const b of src) {
    for (let k = 1; k < mult; k++) {
      if (W.balls.length + add.length >= MAXB) break;
      const a = Math.atan2(b.vy, b.vx) + (k % 2 ? 1 : -1) * (0.25 + 0.12 * Math.floor(k / 2)) + rnd(-0.05, 0.05);
      const nb = newBall(b.x, b.y, Math.cos(a), Math.sin(a));
      nb.gate = b.gate; nb.gt = b.gt;
      add.push(nb);
    }
  }
  W.balls.push(...add);
  W.maxBalls = Math.max(W.maxBalls, W.balls.length);
  return add.length;
}

// --- こうしん ------------------------------------------------------------------------

function hitSound(f) {
  if (W.t - W.sndT < 0.035) return;
  W.sndT = W.t;
  tone(f, 0.05, 'square', 0.06);
}

function damageBrick(br, dmg) {
  br.hp -= dmg; br.hit = 0.15;
  W.score += 5;
  if (br.hp > 0) { hitSound(500 + br.hp * 60); return; }
  br.dead = true;
  W.score += 20;
  hitSound(900);
  for (let i = 0; i < 4 && W.parts.length < 300; i++) {
    W.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: rnd(-160, 160), vy: rnd(-200, 60), t: 0.6, col: brickCol(br) });
  }
  let item = null;
  if (br.kind === 'x') item = 'x2';
  else if (br.kind === 'X') item = 'x3';
  else if (br.kind === 'p') item = 'plus';
  else if (Math.random() < 0.06) item = Math.random() < 0.12 ? 'x5' : pick(['x2', 'plus', 'wide', 'fire', 'x2', 'x3']);
  if (item) W.items.push({ k: item, x: br.x + br.w / 2, y: br.y + br.h / 2 });
  if (br.kind === 'b') {
    // ばくだん：まわりを いっしょに こわす
    noise(0.3, 0.3, 300); W.shake = 0.25;
    for (const o of W.bricks) {
      if (o.dead || o === br) continue;
      if (Math.abs(o.c - br.c) <= 1 && Math.abs(o.r - br.r) <= 1) damageBrick(o, 99);
    }
    for (let i = 0; i < 16; i++) W.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: rnd(-300, 300), vy: rnd(-300, 300), t: 0.5, col: '#FFB020' });
  }
}

function brickAt(x, y) {
  const F = field(), cw = cellW();
  const c = Math.floor((x - F.x) / cw), r = Math.floor((y - F.y - 70) / CH);
  if (c < 0 || c >= COLS || r < 0) return null;
  return W.grid[r * COLS + c] || null;
}

function update(dt) {
  W.t += dt;
  for (const t of W.texts) t.t -= dt;
  W.texts = W.texts.filter((t) => t.t > 0);
  if (W.shake > 0) W.shake -= dt;
  if (W.mode !== 'play') return;
  const F = field();
  // パドル
  if (W.pad.wideT > 0) W.pad.wideT -= dt;
  W.pad.w = W.pad.wideT > 0 ? 200 : 120;
  if (KEYS.ArrowLeft) W.pad.x -= 620 * dt;
  if (KEYS.ArrowRight) W.pad.x += 620 * dt;
  W.pad.x = clamp(W.pad.x, F.x + W.pad.w / 2, F.x + F.w - W.pad.w / 2);
  if (W.fireT > 0) W.fireT -= dt;
  // グリッド（ボールと ブロックの あたりを はやく しらべる）
  W.grid = {};
  for (const br of W.bricks) if (!br.dead) W.grid[br.r * COLS + br.c] = br;
  // ゲート と ボス
  for (const g of W.gates) {
    if (g.vx) { g.x += g.vx * dt; if (g.x - g.w / 2 < F.x || g.x + g.w / 2 > F.x + F.w) { g.vx *= -1; g.x = clamp(g.x, F.x + g.w / 2, F.x + F.w - g.w / 2); } }
    if (g.hit > 0) g.hit -= dt;
  }
  const bs = W.boss;
  if (bs && bs.hp > 0) {
    bs.x += bs.vx * dt;
    if (bs.x < F.x || bs.x + bs.w > F.x + F.w) { bs.vx *= -1; bs.x = clamp(bs.x, F.x, F.x + F.w - bs.w); }
    if (bs.hit > 0) bs.hit -= dt;
  }
  if (W.held) {
    const b = W.balls[0];
    b.x = W.pad.x; b.y = padY() - 9;
  } else {
    const keep = [];
    for (const b of W.balls) {
      const steps = 3;
      let alive = true;
      for (let s = 0; s < steps && alive; s++) {
        const px = b.x, py = b.y;
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        // かべ
        if (b.x < F.x + 7) { b.x = F.x + 7; b.vx = Math.abs(b.vx); }
        if (b.x > F.x + F.w - 7) { b.x = F.x + F.w - 7; b.vx = -Math.abs(b.vx); }
        if (b.y < F.y + 7) { b.y = F.y + 7; b.vy = Math.abs(b.vy); }
        // パドル
        const pw = W.pad.w, pyy = padY();
        if (b.vy > 0 && b.y > pyy - 8 && py <= pyy - 8 && Math.abs(b.x - W.pad.x) < pw / 2 + 8) {
          const u = clamp((b.x - W.pad.x) / (pw / 2), -1, 1);
          const a = -Math.PI / 2 + u * 1.05;
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
          b.y = pyy - 9;
          hitSound(300);
        }
        if (b.y > F.y + F.h + 10) { alive = false; break; }
        // ゲート（したから うえへ とおりぬけた とき だけ）
        for (const g of W.gates) {
          if (b.vy < 0 && py >= g.y && b.y < g.y && Math.abs(b.x - g.x) < g.w / 2 && !(b.gate === g.id && W.t - b.gt < 1.2)) {
            b.gate = g.id; b.gt = W.t;
            g.hit = 0.15;
            multiply(g.mult, [b]);
            if (W.t - W.sndT > 0.05) { tone(1200 + g.mult * 200, 0.06, 'triangle', 0.08); W.sndT = W.t; }
          }
        }
        // ボス
        if (bs && bs.hp > 0 && b.x > bs.x - 6 && b.x < bs.x + bs.w + 6 && b.y > bs.y - 6 && b.y < bs.y + bs.h + 6) {
          bs.hp -= W.fireT > 0 ? 2 : 1; bs.hit = 0.1; W.score += 3;
          hitSound(200);
          const fromX = px < bs.x - 6 || px > bs.x + bs.w + 6;
          if (fromX) b.vx *= -1; else b.vy *= -1;
          b.x = px; b.y = py;
          if (bs.hp <= 0) {
            W.shake = 0.6; noise(0.6, 0.4, 250);
            for (let i = 0; i < 60; i++) W.parts.push({ x: bs.x + rnd(0, bs.w), y: bs.y + rnd(0, bs.h), vx: rnd(-300, 300), vy: rnd(-300, 200), t: 0.9, col: pick(['#FFB020', '#FF5A5A', '#FFE066']) });
            text2('ボスを たおした！', '#FFE066', 2);
            W.score += 2000;
          }
        }
        // ブロック
        const br = brickAt(b.x, b.y);
        if (br && !br.dead) {
          // たてに うごいて 入ったか、よこに うごいて 入ったかで はねかえる むきを きめる
          const byY = brickAt(px, b.y) === br, byX = brickAt(b.x, py) === br;
          damageBrick(br, W.fireT > 0 ? 3 : 1);
          if (W.fireT <= 0 || !br.dead) {
            if (byY && !byX) b.vy *= -1;
            else if (byX && !byY) b.vx *= -1;
            else { b.vx *= -1; b.vy *= -1; }
            b.x = px; b.y = py;
          }
          if (br.dead) W.grid[br.r * COLS + br.c] = null;
        }
      }
      // たてに ばかり うごかない / よこに ばかり うごかない ように
      if (Math.abs(b.vy) < 90) b.vy = (b.vy < 0 ? -1 : 1) * 90;
      if (alive) keep.push(b);
    }
    W.balls = keep;
    if (!W.balls.length) {
      W.lives--;
      noise(0.4, 0.25, 200);
      if (W.lives <= 0) { W.mode = 'over'; tone(300, 0.5, 'triangle', 0.15, 80); }
      else { text2('ボールが なくなった… のこり ' + W.lives, '#FFB0B0', 1.6); resetBall(); }
    }
  }
  // アイテム
  for (const it of W.items) {
    it.y += 170 * dt;
    if (it.y > padY() - 14 && it.y < padY() + 12 && Math.abs(it.x - W.pad.x) < W.pad.w / 2 + 16) {
      it.got = true; takeItem(it.k);
    }
  }
  W.items = W.items.filter((it) => !it.got && it.y < F.y + F.h + 20);
  // こなごな
  for (const p of W.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.t -= dt; }
  W.parts = W.parts.filter((p) => p.t > 0);
  for (const br of W.bricks) if (br.hit > 0) br.hit -= dt;
  W.bricks = W.bricks.filter((b) => !b.dead);
  // クリア
  if (!W.bricks.length && (!bs || bs.hp <= 0)) {
    W.mode = 'clear';
    const stars = W.lives >= 3 ? 3 : W.lives === 2 ? 2 : 1;
    sv.stars[W.stage] = Math.max(sv.stars[W.stage] || 0, stars);
    sv.best = Math.max(sv.best, W.stage + 1);
    store.set(SAVE, sv);
    jingle([72, 76, 79, 84, 88], 0.1, 'square', 0.14);
  }
}

function takeItem(k) {
  if (k === 'x2' || k === 'x3' || k === 'x5') {
    const m = k === 'x2' ? 2 : k === 'x3' ? 3 : 5;
    if (W.held) { W.held = false; W.balls[0].vy = -470; }
    const n = multiply(m);
    text2('ボール ×' + m + '！（+' + n + '）', '#FFE066', 1.4);
    jingle([79, 84, 91], 0.06, 'square', 0.12);
    W.shake = 0.12;
  } else if (k === 'plus') {
    for (let i = 0; i < 8 && W.balls.length < MAXB; i++) W.balls.push(newBall(W.pad.x, padY() - 12, rnd(-0.9, 0.9), -1));
    W.held = false;
    text2('ボール +8！', '#9AF0B8', 1.2);
    jingle([72, 79], 0.06, 'square', 0.12);
  } else if (k === 'wide') { W.pad.wideT = 12; text2('ワイド パドル！', '#7FC8F8', 1.2); tone(600, 0.2, 'sine', 0.12, 900); }
  else if (k === 'fire') { W.fireT = 8; text2('ファイア ボール！ つきぬける！', '#FF8A5A', 1.4); tone(300, 0.3, 'sawtooth', 0.08, 900); }
  W.maxBalls = Math.max(W.maxBalls, W.balls.length);
}

// --- かく ----------------------------------------------------------------------------

const HPCOL = ['#7FE0A0', '#7FC8F8', '#B98FE0', '#FF8FC8', '#FFB020', '#FF6A4A', '#E04A6E', '#8A94A8', '#5A6478'];
function brickCol(br) {
  if (br.kind === 'x' || br.kind === 'X' || br.kind === 'p') return '#FFE066';
  if (br.kind === 'b') return '#3A3448';
  return HPCOL[Math.min(8, br.mhp - 1)];
}
function itemLabel(k) { return { x2: '×2', x3: '×3', x5: '×5', plus: '+8', wide: 'ワイド', fire: 'ファイア' }[k]; }
function itemCol(k) { return { x2: '#FFE066', x3: '#FF8A3A', x5: '#FF6FC8', plus: '#9AF0B8', wide: '#7FC8F8', fire: '#FF5A5A' }[k]; }

function drawPlay(t) {
  const F = field();
  const sx = W.shake > 0 ? rnd(-5, 5) : 0, sy = W.shake > 0 ? rnd(-4, 4) : 0;
  ctx.save(); ctx.translate(sx, sy);
  ctx.fillStyle = grad(F.y, F.y + F.h, '#241A5A', '#0E0A28');
  rr(F.x, F.y, F.w, F.h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  // ほし
  for (let i = 0; i < 20; i++) fillC(F.x + (i * 97) % F.w, F.y + (i * 61) % F.h, 1.2, 'rgba(255,255,255,0.4)');
  // ブロック
  for (const br of W.bricks) {
    const col = brickCol(br);
    fillRR(br.x + 1.5, br.y + 1.5, br.w - 3, br.h - 3, 5, br.hit > 0 ? '#FFFFFF' : col);
    fillR(br.x + 4, br.y + 3, br.w - 8, 4, 'rgba(255,255,255,0.3)');
    if (br.kind === 'n' && br.mhp > 1) text(br.hp, br.x + br.w / 2, br.y + br.h / 2 + 1, 13, 'rgba(20,10,40,0.8)', 'center');
    else if (br.kind === 'x' || br.kind === 'X') text(br.kind === 'x' ? '×2' : '×3', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#8A4A00', 'center');
    else if (br.kind === 'p') text('+8', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#8A4A00', 'center');
    else if (br.kind === 'b') text('💣', br.x + br.w / 2, br.y + br.h / 2 + 1, 13, '#FFFFFF', 'center');
  }
  // ボス
  const bs = W.boss;
  if (bs && bs.hp > 0) {
    fillRR(bs.x, bs.y, bs.w, bs.h, 12, bs.hit > 0 ? '#FFFFFF' : '#7A3AB8');
    fillRR(bs.x + 6, bs.y + 6, bs.w - 12, 10, 5, 'rgba(255,255,255,0.25)');
    for (const sg of [-1, 1]) { fillC(bs.x + bs.w / 2 + sg * bs.w * 0.2, bs.y + bs.h * 0.45, 11, '#FFFFFF'); fillC(bs.x + bs.w / 2 + sg * bs.w * 0.2 + Math.sin(t * 2) * 3, bs.y + bs.h * 0.47, 6, '#2A2028'); }
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bs.x + bs.w / 2, bs.y + bs.h * 0.62, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    fillRR(F.x + 20, F.y + 16, F.w - 40, 14, 7, 'rgba(0,0,0,0.5)');
    fillRR(F.x + 20, F.y + 16, (F.w - 40) * bs.hp / bs.mhp, 14, 7, '#FF5A8A');
    text('ボス', F.x + 26, F.y + 44, 16, '#FFB0D0');
  }
  // ゲート
  for (const g of W.gates) {
    const a = g.hit > 0 ? 0.95 : 0.7;
    ctx.fillStyle = g.mult >= 3 ? 'rgba(255,138,58,' + a + ')' : 'rgba(255,224,102,' + a + ')';
    rr(g.x - g.w / 2, g.y - 7, g.w, 14, 7); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    textO('×' + g.mult, g.x, g.y - 1, 18, g.mult >= 3 ? '#FFD0A0' : '#FFFFFF');
  }
  // アイテム
  for (const it of W.items) {
    fillRR(it.x - 24, it.y - 12, 48, 24, 12, itemCol(it.k));
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; rr(it.x - 24, it.y - 12, 48, 24, 12); ctx.stroke();
    text(itemLabel(it.k), it.x, it.y + 1, it.k.length > 3 ? 11 : 15, '#2A1A10', 'center', true, 44);
  }
  // ボール
  const fire = W.fireT > 0;
  ctx.fillStyle = fire ? '#FF8A5A' : '#FFFFFF';
  for (const b of W.balls) { ctx.beginPath(); ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2); ctx.fill(); }
  if (fire) { ctx.fillStyle = 'rgba(255,200,80,0.5)'; for (const b of W.balls) { ctx.beginPath(); ctx.arc(b.x - b.vx * 0.015, b.y - b.vy * 0.015, 5, 0, Math.PI * 2); ctx.fill(); } }
  for (const p of W.parts) { ctx.globalAlpha = clamp(p.t * 2, 0, 1); fillR(p.x - 3, p.y - 3, 6, 6, p.col); }
  ctx.globalAlpha = 1;
  // パドル
  const py = padY();
  fillRR(W.pad.x - W.pad.w / 2, py, W.pad.w, 16, 8, W.pad.wideT > 0 ? '#7FC8F8' : '#FF6FA8');
  fillRR(W.pad.x - W.pad.w / 2 + 6, py + 3, W.pad.w - 12, 4, 2, 'rgba(255,255,255,0.5)');
  if (W.held) textO('タップで スタート！', F.x + F.w / 2, py - 60, 24, '#FFE066');
  ctx.restore();
  // ひだりの じょうほう
  const lx = 12, lw = F.x - 24;
  fillRR(lx, 12, lw, VH - 24, 12, 'rgba(255,255,255,0.06)');
  text('ステージ', lx + lw / 2, 40, 18, '#C8B8E0', 'center');
  text((W.stage + 1) + ' / ' + STAGES.length, lx + lw / 2, 70, 30, '#FFFFFF', 'center');
  text(STAGES[W.stage].name, lx + lw / 2, 102, 15, '#FFE0B0', 'center', true, lw - 12);
  text('ボール', lx + lw / 2, 148, 18, '#C8B8E0', 'center');
  textO(String(W.held ? 1 : W.balls.length), lx + lw / 2, 188, 46, W.balls.length >= 100 ? '#FFB020' : '#FFFFFF');
  text('さいだい ' + W.maxBalls, lx + lw / 2, 226, 15, '#C8B8E0', 'center');
  text('のこり', lx + lw / 2, 268, 18, '#C8B8E0', 'center');
  for (let i = 0; i < 3; i++) fillC(lx + lw / 2 - 26 + i * 26, 296, 9, i < W.lives ? '#FF6FA8' : 'rgba(255,255,255,0.2)');
  text('スコア', lx + lw / 2, 340, 18, '#C8B8E0', 'center');
  text(W.score, lx + lw / 2, 368, 22, '#FFE066', 'center');
  text('ブロック あと ' + W.bricks.length, lx + lw / 2, 406, 15, '#C8B8E0', 'center', true, lw - 10);
  if (W.fireT > 0) text('ファイア ' + Math.ceil(W.fireT), lx + lw / 2, 432, 15, '#FF8A5A', 'center');
  btn(lx + 10, VH - 70, lw - 20, 46, 'やめる', () => { W.mode = 'select'; }, { col: '#D8D0F0', size: 18 });
  // もじ
  W.texts.forEach((tx, i) => {
    ctx.globalAlpha = clamp(tx.t / 0.4, 0, 1);
    textO(tx.s, F.x + F.w / 2, F.y + F.h * 0.45 + i * 40, 30, tx.col);
    ctx.globalAlpha = 1;
  });
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#2A1A6A', '#0E0A28'); ctx.fillRect(0, 0, VW, VH);
  // ふえる ボールの かざり
  for (let i = 0; i < 60; i++) {
    const a = i * 2.4 + t * 0.4, r = 40 + (i * 7 + t * 60) % 320;
    fillC(VW / 2 + Math.cos(a) * r, VH * 0.42 + Math.sin(a) * r * 0.6, 5, i % 3 ? '#FFFFFF' : '#FFE066');
  }
  textO('ボール ふえふえ', VW / 2, 110, 64, '#FFE066', '#3A1A0A');
  textO('大くずし', VW / 2, 182, 56, '#FF8FC8', '#3A0A1A');
  text('×2 × ×3 で ボールが どんどん ふえる！', VW / 2, 242, 22, '#FFFFFF', 'center');
  btn(VW / 2 - 160, 300, 320, 76, 'あそぶ', () => { fullScreen(); W.mode = 'select'; }, { col: '#FFE066' });
  text('クリア ' + sv.best + ' / ' + STAGES.length, VW / 2, 420, 20, '#C8B8E0', 'center');
}

function drawSelect(t) {
  ctx.fillStyle = grad(0, VH, '#2A1A6A', '#0E0A28'); ctx.fillRect(0, 0, VW, VH);
  text('ステージを えらんでね', VW / 2, 44, 30, '#FFFFFF', 'center');
  btn(16, 16, 120, 50, 'もどる', () => { W.mode = 'title'; }, { col: '#D8D0F0', size: 20 });
  const cols = 5, bw = Math.min(170, (VW - 80) / cols - 12), bh = 120;
  STAGES.forEach((S, i) => {
    const x = VW / 2 - (cols * (bw + 12) - 12) / 2 + (i % cols) * (bw + 12);
    const y = 86 + Math.floor(i / cols) * (bh + 14);
    const open = i <= sv.best;
    btn(x, y, bw, bh, '', () => { if (open) startStage(i); }, { col: open ? (S.boss ? '#FFB0C8' : '#F4F0FF') : 'rgba(120,110,140,0.4)' });
    text(open ? String(i + 1) : '🔒', x + bw / 2, y + 36, 34, '#2A2440', 'center');
    text(S.boss ? 'ボス' : S.name, x + bw / 2, y + 74, 15, '#5A4A7A', 'center', true, bw - 12);
    const st = sv.stars[i] || 0;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k < st ? '#FFB020' : 'rgba(0,0,0,0.15)'; star(x + bw / 2 - 24 + k * 24, y + 100, 9); ctx.fill(); }
  });
  void t;
}

function drawEnd(t) {
  drawPlay(t);
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.55)');
  const clear = W.mode === 'clear';
  textO(clear ? 'ステージ クリア！' : 'ゲームオーバー', VW / 2, 150, 54, clear ? '#FFE066' : '#FFB0B0');
  text('さいだい ボール ' + W.maxBalls + 'こ　スコア ' + W.score, VW / 2, 222, 24, '#FFFFFF', 'center');
  if (clear) {
    const st = sv.stars[W.stage] || 0;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k < (W.lives >= 3 ? 3 : W.lives === 2 ? 2 : 1) ? '#FFB020' : 'rgba(255,255,255,0.2)'; star(VW / 2 - 60 + k * 60, 280, 24); ctx.fill(); }
    void st;
  }
  const bw = 230;
  if (clear && W.stage + 1 < STAGES.length) btn(VW / 2 - bw - 10, 340, bw, 70, 'つぎへ', () => startStage(W.stage + 1));
  else if (clear) text('ぜんぶ クリア！ すごい！', VW / 2, 372, 28, '#FFE066', 'center');
  btn(VW / 2 + 10, 340, bw, 70, 'もういちど', () => startStage(W.stage), { col: '#D8D0F0' });
  btn(VW / 2 - 100, 430, 200, 56, 'ステージ いちらん', () => { W.mode = 'select'; }, { col: '#D8D0F0', size: 20 });
}

// --- そうさ ------------------------------------------------------------------------

startGame({
  bg: '#0E0A28',
  update,
  draw(t) {
    if (W.mode === 'title') drawTitle(t);
    else if (W.mode === 'select') drawSelect(t);
    else if (W.mode === 'play') drawPlay(t);
    else drawEnd(t);
  },
  down(x) {
    if (W.mode !== 'play') return;
    W.dragging = true; W.dragOff = W.pad.x - x;
    if (W.held) { W.held = false; W.balls[0].vx = rnd(-120, 120); W.balls[0].vy = -470; tone(700, 0.08, 'square', 0.1); }
  },
  move(x, y, drag) {
    if (W.mode !== 'play' || !drag) return;
    W.pad.x = x + W.dragOff;
  },
  up() { W.dragging = false; },
  key(code, down) {
    if (!down || W.mode !== 'play') return;
    if ((code === 'Space' || code === 'ArrowUp') && W.held) { W.held = false; W.balls[0].vy = -470; }
  },
});
