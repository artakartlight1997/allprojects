// リナパパの ぴょんぴょんピラミッド
//
// ★ むかしの「ななめに ぴょんぴょん とんで ブロックの 色を かえる」ゲームが もと。
//   ぜんぶの ブロックを 色を かえたら クリア。はしから 落ちると アウト。
//
// ★ そうさ … もとの ゲームは ななめの レバーで とても むずかしかった ので、
//   「とびたい ブロックを タップする」だけに した。
//   となりの 4つ しか えらべないので、まちがえにくい。
//   ゆびで はらう（スワイプ）でも 同じ ように とべる。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const ROWSN = 7;

const STAGES = [
  { name: 'はじめて', need: 1, balls: 1, bt: 2.8, snake: 0 },
  { name: 'あさ',     need: 1, balls: 2, bt: 2.6, snake: 0 },
  { name: 'ひる',     need: 2, balls: 2, bt: 2.5, snake: 0 },
  { name: 'ゆうがた', need: 2, balls: 2, bt: 2.4, snake: 0 },
  { name: 'よる',     need: 2, balls: 2, bt: 2.3, snake: 1 },
  { name: 'ゆめの中', need: 2, balls: 3, bt: 2.2, snake: 1 },
  { name: 'ほしぞら', need: 2, balls: 3, bt: 2.1, snake: 1 },
  { name: 'てっぺん', need: 2, balls: 3, bt: 2.0, snake: 1 },
];

const SAVE_KEY = 'pyramid.save.v1';
const save = { open: 1, clear: [], hi: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = s.open;
  if (Array.isArray(s.clear)) save.clear = s.clear;
  if (typeof s.hi === 'number') save.hi = s.hi;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0, S: STAGES[0],
  cube: [], me: null, balls: [], snakes: [], spawn: 0, snakeT: 0,
  lives: 3, score: 0, over: false, win: false, msg: '', msgT: 0, left: 0,
};

// --- ばんめん ---------------------------------------------------------------------

function box() {
  const top = HUD + 10, bot = 14;
  const cw = Math.min((VW - 40) / (ROWSN + 1), (VH - top - bot) / (ROWSN * 0.78 + 0.8));
  const w = cw, h = cw * 0.78;
  return { w: w, h: h, cx: VW / 2, y: top + h * 0.6 };
}
function cubePos(B, r, c) {
  return { x: B.cx + (c - r / 2) * B.w, y: B.y + r * B.h };
}
function valid(r, c) { return r >= 0 && r < ROWSN && c >= 0 && c <= r; }

function startStage(i) {
  G.stage = i; G.S = STAGES[i];
  G.screen = 'play'; G.over = false; G.win = false;
  G.lives = 3; G.score = 0;
  buildStage();
  bgmStart(i + 3);
}

function buildStage() {
  G.cube = [];
  G.left = 0;
  for (let r = 0; r < ROWSN; r++) {
    const row = [];
    for (let c = 0; c <= r; c++) { row.push(0); G.left++; }
    G.cube.push(row);
  }
  G.me = { r: 0, c: 0, fr: 0, fc: 0, hop: 0, from: null, dead: 0, fall: 0 };
  G.balls = []; G.snakes = [];
  G.spawn = 2.0; G.snakeT = 12;
  G.msg = ''; G.msgT = 0;
}

function say(s) { G.msg = s; G.msgT = 1.3; }

// となりの 4つ
function neigh(r, c) {
  return [
    { r: r + 1, c: c, k: 'dl' },
    { r: r + 1, c: c + 1, k: 'dr' },
    { r: r - 1, c: c - 1, k: 'ul' },
    { r: r - 1, c: c, k: 'ur' },
  ];
}

function hopTo(r, c) {
  const me = G.me;
  if (me.hop > 0 || me.dead > 0 || me.fall > 0) return;
  const ok = neigh(me.r, me.c).some((n) => n.r === r && n.c === c);
  if (!ok) return;
  me.from = { r: me.r, c: me.c };
  me.r = r; me.c = c; me.hop = 0.22;
  sfxJump();
  if (!valid(r, c)) { me.fall = 0.9; return; }
  // 色を すすめる
  const cur = G.cube[r][c];
  if (cur < G.S.need) {
    G.cube[r][c] = cur + 1;
    G.score += 25;
    if (G.cube[r][c] === G.S.need) { G.left--; G.score += 25; sfxGet(); }
  }
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play' || G.over) return;
  const S = G.S, me = G.me, B = box();

  // --- そうさ（タップ or はらい） ---
  if (me.hop <= 0 && me.dead <= 0 && me.fall <= 0) {
    for (const tp of IN.taps) {
      let best = null, bd = 1e9;
      for (const n of neigh(me.r, me.c)) {
        const p = cubePos(B, n.r, n.c);
        const d = Math.hypot(tp.x - p.x, tp.y - (p.y + B.h * 0.2));
        if (d < bd) { bd = d; best = n; }
      }
      if (best && bd < B.w * 1.2) { hopTo(best.r, best.c); break; }
    }
    const kd = keyDir();
    if (kd === 'l') hopTo(me.r + 1, me.c);
    else if (kd === 'r') hopTo(me.r + 1, me.c + 1);
    else if (kd === 'u') hopTo(me.r - 1, me.c);
    else if (kd === 'd') hopTo(me.r - 1, me.c - 1);
  }
  if (me.hop > 0) me.hop -= dt;
  if (me.fall > 0) {
    me.fall -= dt;
    if (me.fall <= 0) {
      G.lives--;
      if (G.lives <= 0) { endGame(false); return; }
      me.r = 0; me.c = 0; me.from = null; me.hop = 0; me.dead = 0;
      say('きを つけて！');
    }
    return;
  }
  if (me.dead > 0) {
    me.dead -= dt;
    if (me.dead <= 0) {
      G.lives--;
      if (G.lives <= 0) { endGame(false); return; }
      me.r = 0; me.c = 0; me.from = null; me.hop = 0;
      G.balls = [];
    }
    return;
  }

  // --- ボール（上から ぴょんぴょん おりてくる） ---
  G.spawn -= dt;
  if (G.spawn <= 0 && G.balls.length < S.balls) {
    G.spawn = S.bt * (0.7 + Math.random() * 0.7);
    G.balls.push({ r: 0, c: 0, hop: 0, wait: 0.3, from: null });
  }
  for (const b of G.balls) {
    if (b.hop > 0) { b.hop -= dt; continue; }
    b.wait -= dt;
    if (b.wait > 0) continue;
    b.wait = S.bt * 0.42;
    b.from = { r: b.r, c: b.c };
    if (Math.random() < 0.5) { b.r++; } else { b.r++; b.c++; }
    b.hop = 0.2;
    if (!valid(b.r, b.c)) b.gone = true;
  }
  G.balls = G.balls.filter((b) => !b.gone);

  // --- ヘビ（パパを おいかける） ---
  if (S.snake > 0) {
    G.snakeT -= dt;
    if (G.snakeT <= 0 && G.snakes.length < S.snake) {
      G.snakeT = 14;
      G.snakes.push({ r: 0, c: 0, hop: 0, wait: 1.0, from: null, t: 0 });
      say('ヘビが 来た！');
    }
    for (const s of G.snakes) {
      s.t += dt;
      if (s.hop > 0) { s.hop -= dt; continue; }
      s.wait -= dt;
      if (s.wait > 0) continue;
      s.wait = 0.95;
      s.from = { r: s.r, c: s.c };
      // パパに 近づく ほうへ
      const cand = neigh(s.r, s.c).filter((n) => valid(n.r, n.c));
      if (cand.length) {
        cand.sort((a, b) => (Math.abs(a.r - me.r) + Math.abs(a.c - me.c)) -
                            (Math.abs(b.r - me.r) + Math.abs(b.c - me.c)));
        s.r = cand[0].r; s.c = cand[0].c; s.hop = 0.2;
      }
    }
  }

  // --- ぶつかり ---
  for (const b of G.balls) if (b.r === me.r && b.c === me.c) { me.dead = 1.0; sfxDead(); }
  for (const s of G.snakes) if (s.r === me.r && s.c === me.c) { me.dead = 1.0; sfxDead(); }

  if (G.left <= 0) endGame(true);
}

function endGame(win) {
  G.over = true; G.win = win;
  bgmStop();
  if (win) {
    G.score += G.lives * 250;
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    sfxClear(G.lives === 3);
  } else sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

// --- 絵 ---------------------------------------------------------------------------

const TOP_COL = ['#5A6A8A', '#FFD24A', '#7ADCB0', '#FF8AB0'];
const SIDE_L = ['#3E4A66', '#C8A02A', '#4EA880', '#C86088'];
const SIDE_R = ['#2E3852', '#A88020', '#3A8462', '#A44A6E'];

function drawCube(B, r, c, lv) {
  const p = cubePos(B, r, c);
  const w = B.w / 2, h = B.h;
  // 上の めん（ひしがた）
  ctx.fillStyle = TOP_COL[lv];
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - h * 0.5);
  ctx.lineTo(p.x + w, p.y);
  ctx.lineTo(p.x, p.y + h * 0.5);
  ctx.lineTo(p.x - w, p.y);
  ctx.closePath(); ctx.fill();
  // 左右の めん
  ctx.fillStyle = SIDE_L[lv];
  ctx.beginPath();
  ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x, p.y + h * 0.5);
  ctx.lineTo(p.x, p.y + h * 1.15); ctx.lineTo(p.x - w, p.y + h * 0.65);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = SIDE_R[lv];
  ctx.beginPath();
  ctx.moveTo(p.x + w, p.y); ctx.lineTo(p.x, p.y + h * 0.5);
  ctx.lineTo(p.x, p.y + h * 1.15); ctx.lineTo(p.x + w, p.y + h * 0.65);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - h * 0.5); ctx.lineTo(p.x + w, p.y);
  ctx.lineTo(p.x, p.y + h * 0.5); ctx.lineTo(p.x - w, p.y);
  ctx.closePath(); ctx.stroke();
}

// とんで いる とちゅうの ばしょ
function hopPos(B, o, dur) {
  const p = cubePos(B, o.r, o.c);
  if (!o.from || o.hop <= 0) return { x: p.x, y: p.y, up: 0 };
  const k = 1 - o.hop / dur;
  const q = cubePos(B, o.from.r, o.from.c);
  return { x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k,
           up: Math.sin(k * Math.PI) * B.h * 0.7 };
}

function drawPlay() {
  const B = box();
  bgGrad('#1A2440', '#080C18');
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.3 * Math.abs(Math.sin(G.t * 0.6 + i))) + ')';
    ctx.fillRect((i * 71) % VW, (i * 37) % (VH * 0.5), 2, 2);
  }

  for (let r = ROWSN - 1; r >= 0; r--) {
    for (let c = 0; c <= r; c++) drawCube(B, r, c, G.cube[r][c]);
  }

  // とべる ところに めじるし
  if (G.me.hop <= 0 && G.me.dead <= 0 && G.me.fall <= 0) {
    for (const n of neigh(G.me.r, G.me.c)) {
      if (!valid(n.r, n.c)) continue;
      const p = cubePos(B, n.r, n.c);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.28 + 0.22 * Math.sin(G.t * 5)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - B.h * 0.5);
      ctx.lineTo(p.x + B.w / 2, p.y);
      ctx.lineTo(p.x, p.y + B.h * 0.5);
      ctx.lineTo(p.x - B.w / 2, p.y);
      ctx.closePath(); ctx.stroke();
    }
  }

  // ボール
  for (const b of G.balls) {
    const p = hopPos(B, b, 0.2);
    const s = B.w * 0.22;
    drawBlob(p.x, p.y - p.up - s * 0.4, s, '#FF7A6A', { t: G.t, look: 0 });
  }
  // ヘビ
  for (const s of G.snakes) {
    const p = hopPos(B, s, 0.2);
    const r = B.w * 0.24;
    ctx.fillStyle = '#9AE05A';
    circle(p.x, p.y - p.up - r * 0.5, r); ctx.fill();
    circle(p.x - r * 0.7, p.y - p.up + r * 0.2, r * 0.7); ctx.fill();
    ctx.fillStyle = '#FFF';
    circle(p.x - r * 0.3, p.y - p.up - r * 0.7, r * 0.28); ctx.fill();
    circle(p.x + r * 0.3, p.y - p.up - r * 0.7, r * 0.28); ctx.fill();
    ctx.fillStyle = '#2A2028';
    circle(p.x - r * 0.3, p.y - p.up - r * 0.68, r * 0.14); ctx.fill();
    circle(p.x + r * 0.3, p.y - p.up - r * 0.68, r * 0.14); ctx.fill();
  }

  // パパ
  const me = G.me;
  if (me.dead <= 0 || Math.floor(G.t * 12) % 2 === 0) {
    let p;
    if (me.fall > 0) {
      const q = cubePos(B, me.from ? me.from.r : 0, me.from ? me.from.c : 0);
      const k = 1 - me.fall / 0.9;
      p = { x: q.x + (me.c - (me.from ? me.from.c : 0)) * B.w * 0.5,
            y: q.y + k * k * 420, up: 0 };
    } else p = hopPos(B, me, 0.22);
    drawPapa(p.x, p.y - p.up + B.h * 0.1, B.w * 0.30,
             { dir: 1, walk: 0, shirt: '#E8B040', face: (me.dead > 0 || me.fall > 0) ? 'oops' : 'happy' });
  }

  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH * 0.18, 26, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    drawResult(G.win, G.win ? 'ぜんぶ ぬれた！' : 'ゲームオーバー',
      ['スコア ' + G.score, G.win ? 'のこり ' + G.lives + '人' : 'つぎは がんばろう'],
      resultButtons());
  }
}

function resultButtons() {
  const btns = [];
  const nx = G.stage + 1;
  if (G.win && nx < STAGES.length) btns.push({ label: 'つぎの めん', on: () => startStage(nx) });
  btns.push({ label: 'もういちど', on: () => startStage(G.stage), col: '#8AD8F0' });
  btns.push({ label: 'めんを えらぶ', on: () => { G.screen = 'title'; }, col: '#C8BCE8' });
  return btns;
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A'; ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#C8BCE8';
  ctx.fillText('ハイ ' + Math.max(save.hi, G.score), 132, HUD / 2);
  ctx.fillText(G.S.name, 232, HUD / 2);
  ctx.fillText('のこり ' + G.left + 'こ', 340, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('パパ ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#22305A', '#080C18');
  bigText('リナパパの', VW / 2, 44, 24, '#9AE0B0');
  bigText('ぴょんぴょんピラミッド', VW / 2, 82, fitSize('ぴょんぴょんピラミッド', VW * 0.66, 44), '#FFD24A');
  bigText('とびたい ブロックを タップ。ぜんぶ ぬれたら クリア！', VW / 2, 120, 16, '#DCE8FF', null);

  const B2 = { w: 26, h: 20, cx: VW * 0.12, y: 148 };
  for (let r = 2; r >= 0; r--) for (let c = 0; c <= r; c++) drawCube(B2, r, c, (r + c) % 3 + 1);

  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 172,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('ハイスコア ' + save.hi, VW / 2, VH - 20, 15, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#22305A', '#080C18');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① とびたい ブロックを タップ。となりの 4つだけ えらべる',
    '② ひかって いる ところが とべる ところ',
    '③ ふんだ ブロックの 色が かわる。ぜんぶ かえたら クリア',
    '④ めんに よっては 2回・3回 ふむ ひつようが ある',
    '⑤ 赤い ボールと ヘビに 当たると アウト。はしから 落ちても アウト',
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

arcadeStart({ update: update, draw: draw, zone: 'tap' });
