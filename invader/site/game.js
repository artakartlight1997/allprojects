// リナパパの インベーダー
//
// ★ むかしの「上から おりてくる てきを ぜんぶ たおす」ゲームが もと。
//   よこ に ならんだ てきが 左右に 動き、はしで 1だん おりてくる。
//   かべ（バリア）は だんだん けずれる。ときどき UFO も 出る。
//
// ★ そうさ … 画面の どこでも さわって 左右に すべらせるだけ。
//   たまは じどうで 出る（小さい子でも あそべる ように）。
//   さわった ところの 「よこの ばしょ」に すーっと ついていくので
//   ゆびで じきが かくれない。

'use strict';

const GAME_VER = 1;
const HUD = 26;
const WW = 640, WH = 360;

const STAGES = [
  { name: 'はじめて', rows: 3, cols: 7, sp: 26, drop: 10, fire: 1.60, ufo: 14 },
  { name: 'よる',     rows: 3, cols: 8, sp: 30, drop: 11, fire: 1.40, ufo: 13 },
  { name: 'うちゅう', rows: 4, cols: 8, sp: 32, drop: 10, fire: 1.35, ufo: 12 },
  { name: 'ほしのうみ', rows: 4, cols: 9, sp: 34, drop: 10, fire: 1.22, ufo: 12 },
  { name: 'すいせい', rows: 5, cols: 9, sp: 36, drop: 10, fire: 1.12, ufo: 11 },
  { name: 'ブラックホール', rows: 5, cols: 10, sp: 38, drop: 11, fire: 1.06, ufo: 10 },
  { name: 'ぎんが',   rows: 5, cols: 11, sp: 43, drop: 12, fire: 0.94, ufo: 10 },
  { name: 'さいしゅう', rows: 6, cols: 11, sp: 46, drop: 12, fire: 0.88, ufo: 9 },
];

const SAVE_KEY = 'invader.save.v1';
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
  me: null, foes: [], shots: [], bombs: [], walls: [], ufo: null,
  dir: 1, stepT: 0, fireT: 0, ufoT: 0,
  lives: 3, score: 0, over: false, win: false, msg: '', msgT: 0, shake: 0,
};

function box() {
  const top = HUD + 4, bot = 6;
  const s = Math.min((VH - top - bot) / WH, (VW - 20) / WW);
  return { s: s, x: (VW - WW * s) / 2, y: top };
}
function px(B, x) { return B.x + x * B.s; }
function py(B, y) { return B.y + y * B.s; }

function startStage(i) {
  G.stage = i; G.S = STAGES[i];
  G.screen = 'play'; G.over = false; G.win = false;
  G.lives = 3; G.score = 0;
  buildStage();
  bgmStart(i + 2);
}

function buildStage() {
  const S = G.S;
  G.me = { x: WW / 2, cool: 0, dead: 0 };
  G.foes = [];
  // ★ れつが 多い めんは 上から はじめる（下に つく までの じかんを そろえる）
  const gapX = 46, gapY = 31;
  const y0 = 52 - Math.max(0, S.rows - 4) * 6;
  const x0 = (WW - (S.cols - 1) * gapX) / 2;
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      G.foes.push({ x: x0 + c * gapX, y: y0 + r * gapY, kind: r % 3, alive: true, t: Math.random() * 6 });
    }
  }
  G.shots = []; G.bombs = []; G.ufo = null;
  G.dir = 1; G.stepT = 0; G.fireT = S.fire; G.ufoT = S.ufo;
  // かべ（4つ・こまかい ブロックの あつまり）
  G.walls = [];
  for (let i = 0; i < 4; i++) {
    const bx = 90 + i * 155;
    for (let a = 0; a < 7; a++) {
      for (let b = 0; b < 4; b++) {
        if (b === 3 && (a === 3)) continue;                       // まん中の した を あける
        if (b === 3 && (a === 2 || a === 4)) continue;
        G.walls.push({ x: bx + a * 9 - 27, y: 272 + b * 9, hp: 3 });
      }
    }
  }
  G.msg = ''; G.msgT = 0;
}

function say(s) { G.msg = s; G.msgT = 1.3; }

function aliveFoes() { return G.foes.filter((f) => f.alive); }

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.screen !== 'play' || G.over) return;

  const S = G.S, me = G.me;

  if (me.dead > 0) {
    me.dead -= dt;
    if (me.dead <= 0) {
      G.lives--;
      if (G.lives <= 0) { endGame(false); return; }
      me.x = WW / 2; G.bombs = [];
    }
    return;
  }

  // --- そうさ（ゆびの よこの ばしょへ すーっと ついていく） ---
  if (IN.hold) {
    const B = box();
    const want = clamp((IN.x - B.x) / B.s, 18, WW - 18);
    me.x += (want - me.x) * Math.min(1, dt * 13);
  }
  if (KEYS.ArrowLeft) me.x -= 240 * dt;
  if (KEYS.ArrowRight) me.x += 240 * dt;
  me.x = clamp(me.x, 18, WW - 18);

  // --- じどう はっしゃ ---
  me.cool -= dt;
  const live = aliveFoes();
  if (me.cool <= 0 && G.shots.length < 3) {
    me.cool = 0.28;
    G.shots.push({ x: me.x, y: WH - 44 });
    sfxShot();
  }

  // --- てきの 行進 ---
  const n = live.length, all = S.rows * S.cols;
  const stepEvery = Math.max(0.085, 0.62 * (n / all) + 0.06);
  G.stepT -= dt;
  if (G.stepT <= 0 && n > 0) {
    G.stepT = stepEvery;
    let hitEdge = false;
    for (const f of live) {
      const nx = f.x + G.dir * (S.sp * 0.32);
      if (nx < 20 || nx > WW - 20) hitEdge = true;
    }
    if (hitEdge) {
      G.dir *= -1;
      for (const f of live) f.y += S.drop;
      tone(anow(), 45, 0.09, 0.10, 'square');
    } else {
      for (const f of live) f.x += G.dir * (S.sp * 0.32);
      tone(anow(), 40 + (1 - n / all) * 10, 0.05, 0.07, 'square');
    }
    // 下まで きたら やられる
    for (const f of live) if (f.y > WH - 48) { endGame(false); return; }
  }

  // --- てきの たま ---
  G.fireT -= dt;
  if (G.fireT <= 0 && n > 0) {
    G.fireT = S.fire * (0.6 + Math.random() * 0.8);
    // いちばん 下の れつから 落とす
    const cols = {};
    for (const f of live) {
      const k = Math.round(f.x);
      if (!cols[k] || f.y > cols[k].y) cols[k] = f;
    }
    const arr = Object.keys(cols).map((k) => cols[k]);
    const f = arr[Math.floor(Math.random() * arr.length)];
    if (f) G.bombs.push({ x: f.x, y: f.y + 12, t: 0 });
  }

  // --- UFO ---
  G.ufoT -= dt;
  if (G.ufoT <= 0 && !G.ufo) {
    G.ufoT = S.ufo * (0.7 + Math.random() * 0.6);
    G.ufo = { x: Math.random() < 0.5 ? -20 : WW + 20, y: 40 };
    G.ufo.d = G.ufo.x < 0 ? 1 : -1;
  }
  if (G.ufo) {
    G.ufo.x += G.ufo.d * 96 * dt;
    if (G.ufo.x < -40 || G.ufo.x > WW + 40) G.ufo = null;
  }

  // --- たま の うごき ---
  for (const s of G.shots) {
    s.y -= 420 * dt;
    if (s.y < 10) s.gone = true;
    for (const w of G.walls) {
      if (w.hp > 0 && Math.abs(w.x - s.x) < 5 && Math.abs(w.y - s.y) < 5) { w.hp--; s.gone = true; }
    }
    for (const f of live) {
      if (!f.alive) continue;
      if (Math.abs(f.x - s.x) < 15 && Math.abs(f.y - s.y) < 13) {
        f.alive = false; s.gone = true;
        G.score += (3 - f.kind) * 30 + 20;
        sfxPop();
      }
    }
    if (G.ufo && Math.abs(G.ufo.x - s.x) < 22 && Math.abs(G.ufo.y - s.y) < 12) {
      G.score += 500; G.ufo = null; s.gone = true; sfxGet(); say('UFO！ 500てん');
    }
  }
  G.shots = G.shots.filter((s) => !s.gone);

  for (const b of G.bombs) {
    b.t += dt;
    b.y += 190 * dt;
    if (b.y > WH) b.gone = true;
    for (const w of G.walls) {
      if (w.hp > 0 && Math.abs(w.x - b.x) < 5 && Math.abs(w.y - b.y) < 5) { w.hp--; b.gone = true; }
    }
    if (Math.abs(b.x - me.x) < 15 && Math.abs(b.y - (WH - 30)) < 14) {
      b.gone = true; me.dead = 1.2; G.shake = 0.4; sfxDead();
    }
  }
  G.bombs = G.bombs.filter((b) => !b.gone);

  if (aliveFoes().length === 0) endGame(true);
}

function endGame(win) {
  G.over = true; G.win = win;
  bgmStop();
  if (win) {
    G.score += G.lives * 300;
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    sfxClear(G.lives === 3);
  } else sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

// --- 絵 ---------------------------------------------------------------------------

const FOE_COL = ['#7ADCB0', '#FFC63A', '#FF8AB0'];

function drawFoe(x, y, s, kind, t) {
  const wob = Math.floor(t * 3) % 2 === 0 ? 1 : -1;
  ctx.fillStyle = FOE_COL[kind];
  rr(x - s, y - s * 0.8, s * 2, s * 1.5, s * 0.5); ctx.fill();
  // あし
  ctx.fillStyle = FOE_COL[kind];
  for (const sg of [-1, 1]) {
    rr(x + sg * s * 0.6 - s * 0.16, y + s * 0.55, s * 0.32, s * 0.45 * (sg * wob > 0 ? 1.3 : 0.8), s * 0.14);
    ctx.fill();
  }
  // つの
  ctx.strokeStyle = FOE_COL[kind]; ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.75); ctx.lineTo(x - s * 0.75, y - s * 1.25);
  ctx.moveTo(x + s * 0.5, y - s * 0.75); ctx.lineTo(x + s * 0.75, y - s * 1.25);
  ctx.stroke();
  // 目
  ctx.fillStyle = '#FFF';
  circle(x - s * 0.38, y - s * 0.1, s * 0.30); ctx.fill();
  circle(x + s * 0.38, y - s * 0.1, s * 0.30); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x - s * 0.38, y - s * 0.06, s * 0.16); ctx.fill();
  circle(x + s * 0.38, y - s * 0.06, s * 0.16); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(x - s * 0.72, y + s * 0.28, s * 0.16); ctx.fill();
  circle(x + s * 0.72, y + s * 0.28, s * 0.16); ctx.fill();
}

function drawPlay() {
  const B = box();
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
  bgGrad('#101A3A', '#05060F');
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.3 * Math.abs(Math.sin(G.t * 0.7 + i))) + ')';
    ctx.fillRect(px(B, (i * 61) % WW), py(B, (i * 43) % WH), 2, 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
  ctx.strokeRect(B.x, B.y, WW * B.s, WH * B.s);

  // UFO
  if (G.ufo) {
    const x = px(B, G.ufo.x), y = py(B, G.ufo.y), s = B.s * 13;
    ctx.fillStyle = '#C8A0FF';
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,240,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y - s * 0.2, s * 0.7, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    for (let i = -1; i <= 1; i++) { circle(x + i * s * 0.8, y + s * 0.18, s * 0.16); ctx.fill(); }
  }

  // てき
  for (const f of G.foes) {
    if (!f.alive) continue;
    drawFoe(px(B, f.x), py(B, f.y), B.s * 12, f.kind, G.t + f.t);
  }

  // かべ
  for (const w of G.walls) {
    if (w.hp <= 0) continue;
    ctx.fillStyle = w.hp === 3 ? '#5AD07A' : w.hp === 2 ? '#3AA05A' : '#28703E';
    ctx.fillRect(px(B, w.x - 4.5), py(B, w.y - 4.5), B.s * 9, B.s * 9);
  }

  // たま
  ctx.fillStyle = '#FFF';
  for (const s of G.shots) ctx.fillRect(px(B, s.x - 1.5), py(B, s.y - 8), B.s * 3, B.s * 12);
  for (const b of G.bombs) {
    ctx.fillStyle = '#FF7A9A';
    const w = Math.sin(b.t * 22) * B.s * 2;
    ctx.fillRect(px(B, b.x - 2) + w, py(B, b.y - 6), B.s * 4, B.s * 10);
  }

  // じき（パパの ロケット）
  if (G.me.dead <= 0 || Math.floor(G.t * 12) % 2 === 0) {
    const x = px(B, G.me.x), y = py(B, WH - 30);
    ctx.fillStyle = '#8AD8F0';
    ctx.beginPath();
    ctx.moveTo(x, y - B.s * 20);
    ctx.lineTo(x + B.s * 15, y + B.s * 10);
    ctx.lineTo(x - B.s * 15, y + B.s * 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4A9BFF';
    rr(x - B.s * 15, y + B.s * 4, B.s * 30, B.s * 8, B.s * 3); ctx.fill();
    // まどの 中に パパ
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(x, y - B.s * 5, B.s * 8); ctx.fill();
    drawPapa(x, y - B.s * 1, B.s * 7.5, { dir: 1, walk: 0, shirt: '#E8B040',
             face: G.me.dead > 0 ? 'oops' : 'happy' });
    // ふんしゃ
    ctx.fillStyle = 'rgba(255,180,80,' + (0.5 + Math.random() * 0.4) + ')';
    ctx.beginPath();
    ctx.moveTo(x - B.s * 6, y + B.s * 12);
    ctx.lineTo(x + B.s * 6, y + B.s * 12);
    ctx.lineTo(x, y + B.s * (18 + Math.random() * 8));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  drawHud();
  drawStick();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH * 0.22, 26, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'ゲームオーバー',
      ['スコア ' + G.score, G.win ? 'のこり ' + G.lives + '機' : 'つぎは がんばろう'],
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
  ctx.fillText('のこり ' + aliveFoes().length + 'たい', 340, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('パパ ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bgGrad('#141E44', '#05060F');
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.3 * Math.abs(Math.sin(G.t + i))) + ')';
    ctx.fillRect((i * 61) % VW, (i * 43) % VH, 2, 2);
  }
  bigText('リナパパの', VW / 2, 46, 24, '#8AE0FF');
  bigText('インベーダー', VW / 2, 84, fitSize('インベーダー', VW * 0.6, 48), '#FFD24A');
  bigText('ゆびで 左右に すべらせるだけ。たまは じどうで 出るよ', VW / 2, 122, 16, '#D8E8FF', null);

  drawFoe(VW * 0.10, 152, 16, 0, G.t);
  drawFoe(VW * 0.90, 152, 16, 2, G.t + 1);

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
  bgGrad('#141E44', '#05060F');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① 画面の どこでも さわって、左右に すべらせると ロケットが 動く',
    '② たまは じどうで 出る。ボタンは いらない',
    '③ みどりの かべに かくれられる。でも だんだん けずれる',
    '④ てきを ぜんぶ たおすと クリア。下まで おりられると まけ',
    '⑤ ときどき とおる UFO は 500てん！',
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
