// ゲームの中身。お絵かきの下じき、擬態度の計算、鬼（パパ）の目。
//
// 擬態度は「描いた絵」と「隠れた場所の背景」を、48×60 に縮めて
// 1 ピクセルずつ色をくらべて出している。似ているほど見つかりにくい。

'use strict';

const SAVE_KEY = 'rinaleon.v1';

const PW = 200, PH = 250;      // お絵かき用の下じきの大きさ
const SW = 48, SH = 60;        // 擬態度をはかるときの大きさ
const HIDE_H = 0.30;           // りなの高さ（画面の高さに対する割合）
const ROUNDS = 3;
const SEEK_TIME = 30;          // 逃げきる秒数

const save = { best: 0, cleared: 0, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(o.best)) save.best = o.best;
    if (Number.isFinite(o.cleared)) save.cleared = o.cleared;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) { /* 壊れていても遊べなくはしない */ }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function offscreen(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}

// --- お絵かきの下じき -----------------------------------------------------

const paint = {
  cv: offscreen(PW, PH),
  ctx: null,
  color: '#B25C46',
  size: 14,
  spuit: false,
  pose: 0,
  history: [],
};
paint.ctx = paint.cv.getContext('2d', { willReadFrequently: true });

function paintReset() {
  const c = paint.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, PW, PH);
  paint.history = [];
  paint.spuit = false;
}

function paintPush() {
  const cv = offscreen(PW, PH);
  cv.getContext('2d').drawImage(paint.cv, 0, 0);
  paint.history.push(cv);
  if (paint.history.length > 12) paint.history.shift();
}

function paintUndo() {
  const cv = paint.history.pop();
  if (!cv) return;
  paint.ctx.setTransform(1, 0, 0, 1, 0, 0);
  paint.ctx.clearRect(0, 0, PW, PH);
  paint.ctx.drawImage(cv, 0, 0);
}

// u,v は 0..1（下じきの中の位置）
function paintDot(u, v, prev) {
  const c = paint.ctx;
  const x = u * PW, y = v * PH;
  c.strokeStyle = paint.color;
  c.fillStyle = paint.color;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = paint.size;
  if (prev) {
    c.beginPath();
    c.moveTo(prev.u * PW, prev.v * PH);
    c.lineTo(x, y);
    c.stroke();
  } else {
    c.beginPath(); c.arc(x, y, paint.size / 2, 0, 7); c.fill();
  }
}

function paintFill() {
  paintPush();
  const c = paint.ctx;
  c.fillStyle = paint.color;
  c.fillRect(0, 0, PW, PH);
}

// --- 擬態度 ---------------------------------------------------------------

const sampPaint = offscreen(SW, SH);
const sampBg = offscreen(SW, SH);
const sampMask = offscreen(SW, SH);
const spCtx = sampPaint.getContext('2d', { willReadFrequently: true });
const sbCtx = sampBg.getContext('2d', { willReadFrequently: true });
const smCtx = sampMask.getContext('2d', { willReadFrequently: true });

let maskPose = -1, maskData = null;

function maskFor(pose) {
  if (maskPose === pose && maskData) return maskData;
  smCtx.setTransform(1, 0, 0, 1, 0, 0);
  smCtx.clearRect(0, 0, SW, SH);
  smCtx.fillStyle = '#000';
  rinaPath(smCtx, SW, SH, pose);
  smCtx.fill();
  maskData = smCtx.getImageData(0, 0, SW, SH).data;
  maskPose = pose;
  return maskData;
}

// りなを置く四角（画面の座標）
function hideRect(W, H, x, y) {
  const h = H * HIDE_H;
  const w = h * (PW / PH);
  return { x: x - w / 2, y: y - h, w, h };
}

// 0（ぜんぜん似ていない）〜 1（そっくり）
function camoScore(W, H, stage, r, pose) {
  const mask = maskFor(pose);

  spCtx.setTransform(1, 0, 0, 1, 0, 0);
  spCtx.clearRect(0, 0, SW, SH);
  spCtx.drawImage(paint.cv, 0, 0, SW, SH);

  sbCtx.setTransform(1, 0, 0, 1, 0, 0);
  sbCtx.clearRect(0, 0, SW, SH);
  sbCtx.save();
  sbCtx.scale(SW / r.w, SH / r.h);
  sbCtx.translate(-r.x, -r.y);
  drawStageBg(sbCtx, W, H, stage);
  sbCtx.restore();

  const a = spCtx.getImageData(0, 0, SW, SH).data;
  const b = sbCtx.getImageData(0, 0, SW, SH).data;
  let sum = 0, n = 0;
  for (let i = 0; i < mask.length; i += 4) {
    if (mask[i + 3] < 128) continue;
    const dr = a[i] - b[i], dg = a[i + 1] - b[i + 1], db = a[i + 2] - b[i + 2];
    sum += Math.sqrt(dr * dr + dg * dg + db * db) / 441.67;
    n++;
  }
  if (!n) return 0;
  const diff = sum / n;
  // 平均のずれが 0 なら 1、0.30 以上なら 0。0.30 は「見ればすぐ分かる」くらい
  return Math.max(0, Math.min(1, 1 - diff / 0.30));
}

// --- ゲームの状態 ---------------------------------------------------------

const game = {
  screen: 'title',      // title / paint / hide / seek / result / end
  round: 0,
  stage: null,
  order: [],
  hideX: 0.5, hideY: 0,    // 0..1（画面に対する割合）。y は足もと
  camo: 0,
  seeker: null,
  timeLeft: 0,
  sus: 0,               // 見つかりそう度 0..1
  found: false,
  moveT: 0,             // 直前に動いてからの時間
  score: 0,
  roundScore: 0,
  t: 0,
  msg: '', msgT: 0,
};

function startGame() {
  game.order = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
  game.round = 0;
  game.score = 0;
  save.plays++;
  storeSave();
  startRound();
}

function startRound() {
  game.stage = STAGES[game.order[game.round]];
  paintReset();
  paint.pose = 0;
  paint.color = '#B25C46';
  paint.size = 14;
  game.hideX = 0.5;
  game.camo = 0;
  game.screen = 'paint';
}

function goHide() {
  game.screen = 'hide';
}

function goSeek(W, H) {
  const r = hideRect(W, H, game.hideX * W, game.hideY * H);
  game.camo = camoScore(W, H, game.stage, r, paint.pose);
  game.seeker = {
    x: 0.08, dir: 1,
    speed: 0.055 + game.round * 0.012,     // 画面幅に対する 1 秒あたり
    stareT: 0, stare: 0, nextStare: 3 + Math.random() * 3,
  };
  game.timeLeft = SEEK_TIME;
  game.sus = 0;
  game.found = false;
  game.moveT = 9;
  game.screen = 'seek';
  game.msg = 'じっと かくれて！'; game.msgT = 2.2;
}

// 鬼（パパ）の目。近くにいて、こちらを向いていて、似ていないほど早く見つかる。
function updateSeek(dt, W, H) {
  const s = game.seeker;
  game.timeLeft -= dt;
  game.moveT += dt;

  s.stareT += dt;
  if (s.stare > 0) {
    s.stare -= dt;                        // 立ち止まってじーっと見ている
  } else {
    s.x += s.dir * s.speed * dt;
    if (s.x > 0.92) { s.x = 0.92; s.dir = -1; }
    if (s.x < 0.08) { s.x = 0.08; s.dir = 1; }
    if (s.stareT > s.nextStare) {
      s.stareT = 0;
      s.nextStare = 3 + Math.random() * 3;
      s.stare = 1.2 + Math.random() * 0.8;
      if (Math.random() < 0.5) s.dir = -s.dir;
    }
  }

  const dx = game.hideX - s.x;
  const near = Math.max(0, 1 - Math.abs(dx) / 0.34);
  const facing = Math.sign(dx) === s.dir ? 1 : 0.22;
  const moving = game.moveT < 0.7 ? 3 : 1;
  const staring = s.stare > 0 ? 1.7 : 1;
  // 似ているほど急に見つかりにくくなるようにしている。
  // ぎたい度 90% なら目の前で見つめられても 6 秒くらいもつ。
  // 50% だと 2 秒たらずでバレる。
  const rate = (0.05 + 2.4 * Math.pow(1 - game.camo, 1.9))
             * near * facing * moving * staring;

  if (near < 0.12 || facing < 0.5) game.sus = Math.max(0, game.sus - dt * 0.45);
  else game.sus = Math.min(1, game.sus + rate * dt);

  if (game.sus >= 1) { game.found = true; finishRound(); return; }
  if (game.timeLeft <= 0) { game.found = false; finishRound(); }
}

function finishRound() {
  const camoPts = Math.round(game.camo * 1000);
  const survive = game.found ? Math.round((SEEK_TIME - game.timeLeft) * 20) : 1500;
  game.roundScore = camoPts + survive;
  game.score += game.roundScore;
  if (game.score > save.best) { save.best = game.score; }
  storeSave();
  game.screen = 'result';
}

function nextRound() {
  game.round++;
  if (game.round >= ROUNDS) {
    save.cleared++;
    storeSave();
    game.screen = 'end';
  } else {
    startRound();
  }
}

loadSave();
