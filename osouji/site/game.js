// ゲームの中身。こする・きれい度をはかる・おとしものを見つける・道具を強くする。
//
// 遊べば遊ぶほど道具が強くなり、同じ部屋を前より速くきれいにできる、
// というのがこのゲームの気持ちよさ。道具の強さは記録に残る。

'use strict';

const SAVE_KEY = 'osouji.v1';

const ROUND_ROOMS = 5;         // 1 回のそうじで まわる部屋の数
const BASE_TIME = 40;          // 1 部屋の持ち時間（秒）
const CLEAN_DONE = 0.985;      // ここまで落とせば その部屋は終わり
const CLEAN_PERFECT = 0.97;    // ここから上は「ピカピカ」ボーナス

// --- 道具（買うと ずっと強いまま）----------------------------------------
//
// cost(lv) は「つぎのレベルにするのに かかるコイン」。
// max まで上げられる。

const UPGRADES = [
  { key: 'brush', name: 'ブラシ', max: 6, icon: '🖌',
    desc: (lv) => 'こする はばが 広くなる（いま ' + (28 + lv * 9) + '）',
    cost: (lv) => 120 + lv * 160 },
  { key: 'soap', name: 'せんざい', max: 6, icon: '🧴',
    desc: (lv) => 'よごれの おちが 速くなる（いま ' + (100 + lv * 35) + '%）',
    cost: (lv) => 150 + lv * 190 },
  { key: 'tawashi', name: 'たわし', max: 5, icon: '🧽',
    desc: (lv) => 'こびりつきに 強くなる（いま ' + (100 + lv * 70) + '%）',
    cost: (lv) => 200 + lv * 240 },
  { key: 'robot', name: 'ロボット', max: 5, icon: '🤖',
    desc: (lv) => lv ? 'かってに そうじしてくれる（' + lv + 'だい）' : 'かってに そうじしてくれる',
    cost: (lv) => 400 + lv * 420 },
  { key: 'time', name: 'すいとう', max: 5, icon: '🥤',
    desc: (lv) => 'そうじの 時間が のびる（いま ' + (BASE_TIME + lv * 8) + '秒）',
    cost: (lv) => 180 + lv * 200 },
  { key: 'reward', name: 'おこづかい', max: 5, icon: '💰',
    desc: (lv) => 'もらえる コインが ふえる（いま ' + (100 + lv * 25) + '%）',
    cost: (lv) => 250 + lv * 300 },
];

const save = {
  coins: 0,
  lv: {},            // key -> レベル
  best: 0,           // 1 回のそうじの最高点
  rounds: 0,         // 何回そうじしたか
  perfect: 0,        // ピカピカ(100%)にした部屋の数
  finds: {},         // 見つけた おとしもの の名前 -> 個数
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(o.coins)) save.coins = o.coins;
    if (Number.isFinite(o.best)) save.best = o.best;
    if (Number.isFinite(o.rounds)) save.rounds = o.rounds;
    if (Number.isFinite(o.perfect)) save.perfect = o.perfect;
    if (o.lv && typeof o.lv === 'object') save.lv = o.lv;
    if (o.finds && typeof o.finds === 'object') save.finds = o.finds;
  } catch (e) { /* 壊れていても遊べなくはしない */ }
  for (const u of UPGRADES) {
    const v = save.lv[u.key];
    save.lv[u.key] = Number.isFinite(v) ? Math.max(0, Math.min(u.max, v | 0)) : 0;
  }
}

function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function lvOf(key) { return save.lv[key] || 0; }
function upgOf(key) { return UPGRADES.find((u) => u.key === key); }

// 道具の効きめ
function brushR() { return 28 + lvOf('brush') * 9; }          // 汚れ下じきの中の半径
function soapPower() { return 1 + lvOf('soap') * 0.35; }
function tawashiPower() { return 1 + lvOf('tawashi') * 0.7; }
function roundTime() { return BASE_TIME + lvOf('time') * 8; }
function rewardMul() { return 1 + lvOf('reward') * 0.25; }
function robotCount() { return lvOf('robot'); }

// 層ごとの落ちやすさ。こびりつきは たわしがないと ほとんど落ちない
// 値は「1 フレームぶん こすったときに どれだけ薄くなるか」。
// ゆびを動かしているあいだ 毎フレーム効くので、小さくても じゅうぶん落ちる。
// 道具なしで 1 部屋を 9 割くらい、道具そろえて 10 割＋時間あまり、
// になるように調整してある。
function eraseRate(kind) {
  if (kind === 'dust') return 0.22 * soapPower();
  if (kind === 'grease') return 0.09 * soapPower();
  return 0.03 * soapPower() * tawashiPower();
}

// --- ゲームの状態 ---------------------------------------------------------

const game = {
  screen: 'title',      // title / howto / clean / result / shop / end
  roomIndex: 0,
  round: 0,             // 何部屋目（0..ROUND_ROOMS-1）
  level: 1,             // 汚れの多さ。遊ぶほど上がる
  room: null,
  dirt: null,
  finds: [],
  timeLeft: 0,
  clean: 0,             // きれい度 0..1
  startDirt: 1,
  robots: [],
  earned: 0,            // この部屋でもらったコイン
  foundCoins: 0,
  roundScore: 0,
  totalScore: 0,
  perfect: false,
  t: 0,
  pops: [],             // 画面に出す小さな文字
  scrubbing: false,
  scrubT: 0,
};

// きれい度をはかる用の小さな下じき
const MEAS_W = 60, MEAS_H = 34;
const measCv = document.createElement('canvas');
measCv.width = MEAS_W; measCv.height = MEAS_H;
const measCtx = measCv.getContext('2d', { willReadFrequently: true });

// 3 まいの汚れの残り量を合計する。層ごとに重みを変えて、
// こびりつきを落としたときの手ごたえを大きくしている。
const WEIGHT = { dust: 1, grease: 1.6, stuck: 2.4 };

function measureDirt() {
  let total = 0;
  for (const kind of ['dust', 'grease', 'stuck']) {
    measCtx.setTransform(1, 0, 0, 1, 0, 0);
    measCtx.clearRect(0, 0, MEAS_W, MEAS_H);
    measCtx.drawImage(game.dirt[kind].cv, 0, 0, MEAS_W, MEAS_H);
    const d = measCtx.getImageData(0, 0, MEAS_W, MEAS_H).data;
    let s = 0;
    for (let i = 3; i < d.length; i += 4) s += d[i];
    total += s * WEIGHT[kind];
  }
  return total;
}

function startRound() {
  game.round = 0;
  game.totalScore = 0;
  save.rounds++;
  storeSave();
  loadRoom();
}

function loadRoom() {
  game.roomIndex = game.round % ROOMS.length;
  game.room = ROOMS[game.roomIndex];
  const seed = ((Math.random() * 1e9) | 0);
  game.dirt = makeDirt(seed, game.level);
  game.finds = makeFinds(seed, game.level);
  game.startDirt = measureDirt() || 1;
  game.clean = 0;
  game.timeLeft = roundTime();
  game.earned = 0;
  game.foundCoins = 0;
  game.perfect = false;
  game.pops = [];
  game.robots = [];
  for (let i = 0; i < robotCount(); i++) {
    game.robots.push({
      x: 0.2 + i * 0.15, y: 0.3 + (i % 3) * 0.2,
      vx: (i % 2 ? 1 : -1) * 0.09, vy: (i % 3 ? 1 : -1) * 0.07,
    });
  }
  game.screen = 'clean';
}

// --- こする ---------------------------------------------------------------

// u,v は 0..1（部屋の中の位置）。強さ 1 でふつうの一回ぶん。
function scrub(u, v, prevU, prevV, strength) {
  const x = u * DIRT_W, y = v * DIRT_H;
  const r = brushR() * (strength || 1);
  for (const kind of ['dust', 'grease', 'stuck']) {
    const c = game.dirt[kind].ctx;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.globalAlpha = Math.min(1, eraseRate(kind) * (strength || 1));
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (prevU !== undefined && prevU !== null) {
      c.lineWidth = r * 2;
      c.beginPath();
      c.moveTo(prevU * DIRT_W, prevV * DIRT_H);
      c.lineTo(x, y);
      c.strokeStyle = '#000';
      c.stroke();
    } else {
      c.beginPath(); c.arc(x, y, r, 0, 7);
      c.fillStyle = '#000'; c.fill();
    }
    c.restore();
  }
}

// おとしものが出てきたか調べる
function checkFinds() {
  for (const f of game.finds) {
    if (f.found) continue;
    const x = Math.max(0, Math.min(DIRT_W - 1, Math.round(f.x * DIRT_W)));
    const y = Math.max(0, Math.min(DIRT_H - 1, Math.round(f.y * DIRT_H)));
    let a = 0;
    for (const kind of ['dust', 'grease', 'stuck']) {
      a += game.dirt[kind].ctx.getImageData(x, y, 1, 1).data[3];
    }
    if (a < 40) {
      f.found = true; f.t = 0;
      const c = Math.round(f.coin * rewardMul());
      game.foundCoins += c;
      save.coins += c;
      save.finds[f.name] = (save.finds[f.name] || 0) + 1;
      storeSave();
      // 同時に何個も出ると 文字が重なるので、少しずつ 高さをずらす
      game.pops.push({ x: f.x, y: f.y, text: f.name + ' +' + c, t: 0,
                       col: '#FFD166', lift: game.pops.length * 0.05 });
    }
  }
}

function updateClean(dt) {
  game.t += dt;
  game.timeLeft -= dt;
  if (game.scrubT > 0) game.scrubT -= dt;

  // ロボットは かってに こすってくれる
  for (const r of game.robots) {
    r.x += r.vx * dt; r.y += r.vy * dt;
    if (r.x < 0.05 || r.x > 0.95) { r.vx = -r.vx; r.x = Math.max(0.05, Math.min(0.95, r.x)); }
    if (r.y < 0.08 || r.y > 0.92) { r.vy = -r.vy; r.y = Math.max(0.08, Math.min(0.92, r.y)); }
    scrub(r.x, r.y, null, null, 0.5);
  }

  for (const p of game.pops) p.t += dt;
  game.pops = game.pops.filter((p) => p.t < 1.6);
  for (const f of game.finds) if (f.found) f.t += dt;

  // きれい度は 0.2 秒ごとに はかる（毎フレームだと重い）
  game.measT = (game.measT || 0) + dt;
  if (game.measT > 0.2) {
    game.measT = 0;
    game.clean = Math.max(0, Math.min(1, 1 - measureDirt() / game.startDirt));
    checkFinds();
  }

  // すみっこの ほんの少しまで 100% にするのは 子どもには つらいので、
  // 98.5% まで落とせば「終わり」、97% 以上なら「ピカピカ」あつかいにする。
  if (game.clean >= CLEAN_DONE || game.timeLeft <= 0) finishRoom();
}

function finishRoom() {
  game.clean = Math.max(0, Math.min(1, 1 - measureDirt() / game.startDirt));
  checkFinds();
  game.perfect = game.clean >= CLEAN_PERFECT;
  const base = Math.round(game.clean * 500 * (1 + game.level * 0.15));
  const timeBonus = game.perfect ? Math.round(Math.max(0, game.timeLeft) * 12) : 0;
  const perfectBonus = game.perfect ? 500 : 0;
  game.earned = Math.round((base + timeBonus + perfectBonus) * rewardMul());
  game.roundScore = game.earned + game.foundCoins;
  game.totalScore += game.roundScore;
  save.coins += game.earned;
  if (game.perfect) save.perfect++;
  storeSave();
  game.screen = 'result';
}

function afterResult() {
  game.round++;
  if (game.round >= ROUND_ROOMS) {
    if (game.totalScore > save.best) save.best = game.totalScore;
    game.level++;              // 次はもう少し よごれる
    storeSave();
    game.screen = 'end';
  } else {
    game.screen = 'shop';
  }
}

function buy(key) {
  const u = upgOf(key);
  const lv = lvOf(key);
  if (lv >= u.max) return false;
  const c = u.cost(lv);
  if (save.coins < c) return false;
  save.coins -= c;
  save.lv[key] = lv + 1;
  storeSave();
  return true;
}

loadSave();
game.level = 1 + Math.min(6, (save.rounds / 2) | 0);
