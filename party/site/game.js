// 1だいの スマホ／タブレットを かこんで、2〜4人で 同時に あそぶ。
//
// ★ サーバーは つかわない。ぜんぶ この 1だいの 中で うごく。
//   だから「みんなで 同じ ところに いる」ときだけ あそべる。
//
// 画面を 人数ぶんに わけて、それぞれの 人が じぶんの ばしょを おす。
// 向かいがわの 人には 字が さかさまに なるので、その人の ばしょは
// **180度 まわして** かく（ui.js の zoneOf / drawInZone）。

'use strict';

const SAVE_KEY = 'party.v1';

const save = {
  n: 4,
  who: [0, 1, 2, 3],
  names: ['', '', '', ''],      // からっぽ なら キャラの 名前を つかう
  cpu: [false, false, false, true],
  cpuLv: 1,                     // 0 よわい / 1 ふつう / 2 つよい
  rounds: 5, plays: 0, best: {},
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(o.n)) save.n = Math.max(2, Math.min(4, o.n));
    if (Array.isArray(o.who) && o.who.length === 4) save.who = o.who.map((x) => x | 0);
    if (Array.isArray(o.names) && o.names.length === 4) {
      save.names = o.names.map((s) => String(s || '').slice(0, 6));
    }
    if (Array.isArray(o.cpu) && o.cpu.length === 4) save.cpu = o.cpu.map((x) => !!x);
    if (Number.isFinite(o.cpuLv)) save.cpuLv = Math.max(0, Math.min(2, o.cpuLv | 0));
    if (Number.isFinite(o.rounds)) save.rounds = Math.max(3, Math.min(9, o.rounds));
    if (Number.isFinite(o.plays)) save.plays = o.plays;
    if (o.best && typeof o.best === 'object') save.best = o.best;
  } catch (e) {}
}

// その ばしょの 名前。入れて なければ キャラの 名前。
function slotName(i) {
  return save.names[i] || PEOPLE[PICKS[Math.max(0, Math.min(PICKS.length - 1, save.who[i]))]].name;
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

// えらべる キャラ（chars.js の PEOPLE）
const PICKS = ['rina', 'masaki', 'aoi', 'papa', 'mama'];
// 人ごとの 色。ボタンや ふちに つかう。
const PCOL = ['#FF6A8A', '#4A9CE8', '#5AC87A', '#FFB03A'];

const G = {
  screen: 'title',
  n: 4,
  who: [],          // 人ごとの キャラ key
  pts: [],          // ごうけい てんすう
  round: 0,
  order: [],        // ミニゲームの じゅんばん
  names: [],        // 人ごとの 名前
  cpu: [],          // その ばしょは CPU か
  cz: [],           // CPU の かんがえ（ミニゲームごとに つかう）
  mini: null,
  m: null,          // ミニゲームの 中身（games.js が つかう）
  t: 0,             // ミニゲームが はじまってからの 時間
  phase: 'how',     // how → count → play → result
  ph: 0,            // phase の 中の 時間
  last: [],         // このラウンドの てんすう
  down: [],         // いま おしているか
  winner: -1,
};

function startMatch() {
  audioStart();
  G.n = save.n;
  G.who = save.who.slice(0, G.n).map((i) => PICKS[Math.max(0, Math.min(PICKS.length - 1, i))]);
  G.names = [];
  for (let i = 0; i < G.n; i++) G.names.push(slotName(i));
  G.cpu = save.cpu.slice(0, G.n).map((x) => !!x);
  G.pts = new Array(G.n).fill(0);
  G.down = new Array(G.n).fill(false);
  G.round = 0;
  // ミニゲームの じゅんばんを まぜる（同じ ものが つづかない ように）
  const idx = MINIS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
  }
  G.order = [];
  while (G.order.length < save.rounds) {
    for (const k of idx) {
      if (G.order.length >= save.rounds) break;
      G.order.push(k);
    }
  }
  G.screen = 'play';
  save.plays++;
  storeSave();
  beginRound();
  bgmStart(0);
}

function beginRound() {
  G.mini = MINIS[G.order[G.round]];
  G.phase = 'how';
  G.ph = 0;
  G.t = 0;
  G.m = null;
  G.last = new Array(G.n).fill(0);
  for (let i = 0; i < G.n; i++) G.down[i] = false;
}

function beginPlay() {
  G.phase = 'play';
  G.ph = 0;
  G.t = 0;
  G.mini.start(G);
  // CPU の「これくらいで おそう」を きめる
  G.cz = [];
  for (let i = 0; i < G.n; i++) G.cz.push(G.cpu[i] ? cpuPlan(G, i) : null);
}

function endRound() {
  G.last = G.mini.score(G);
  for (let i = 0; i < G.n; i++) G.pts[i] += G.last[i];
  G.phase = 'result';
  G.ph = 0;
  sfxRound();
}

function nextRound() {
  G.round++;
  if (G.round >= G.order.length) {
    // ゆうしょう を きめる
    let best = -1, bi = -1, tie = false;
    for (let i = 0; i < G.n; i++) {
      if (G.pts[i] > best) { best = G.pts[i]; bi = i; tie = false; }
      else if (G.pts[i] === best) tie = true;
    }
    G.winner = tie ? -1 : bi;
    const k = 'n' + G.n;
    save.best[k] = Math.max(save.best[k] || 0, best);
    storeSave();
    bgmStop();
    G.screen = 'over';
    sfxWin();
    return;
  }
  beginRound();
}

// --- 1 コマ -------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.ph += dt;

  if (G.phase === 'how') {
    // あそびかたを 見せる。だれかが おしたら すすむ。
    // ぜんいん CPU の ときは まって いても すすむ ように 6びょうで きりあげる。
    if (G.ph > 6) startCount();
    return;
  }
  if (G.phase === 'count') {
    const was = Math.ceil(3 - (G.ph - dt));
    const now = Math.ceil(3 - G.ph);
    if (now !== was && now >= 0) sfxCount(now);
    if (G.ph >= 3) beginPlay();
    return;
  }
  if (G.phase === 'play') {
    G.t += dt;
    // CPU は 人と 同じ playerDown / playerUp を つかって おす。
    // 「じつは 中で こっそり 点を 足している」ように しない ため。
    for (let i = 0; i < G.n; i++) if (G.cpu[i]) cpuThink(G, i, dt);
    const over = G.mini.step(G, dt);
    if (over || (G.mini.len > 0 && G.t >= G.mini.len)) endRound();
    return;
  }
  if (G.phase === 'result') {
    if (G.ph > 3.4) nextRound();
  }
}

function startCount() { G.phase = 'count'; G.ph = 0; }

// --- ボタン -------------------------------------------------------------------

function playerDown(i) {
  if (G.screen !== 'play' || i < 0 || i >= G.n) return;
  G.down[i] = true;
  if (G.phase === 'how') { if (G.ph > 0.8) startCount(); return; }
  if (G.phase === 'result') { if (G.ph > 1.2) nextRound(); return; }
  if (G.phase !== 'play') return;
  if (G.mini.press) G.mini.press(G, i);
}

function playerUp(i) {
  if (G.screen !== 'play' || i < 0 || i >= G.n) return;
  G.down[i] = false;
  if (G.phase !== 'play') return;
  if (G.mini.release) G.mini.release(G, i);
}

// じゅんい（1い が 0）
function ranking() {
  const idx = G.pts.map((_, i) => i);
  idx.sort((a, b) => G.pts[b] - G.pts[a]);
  const place = new Array(G.n).fill(0);
  let cur = 0;
  for (let k = 0; k < idx.length; k++) {
    if (k > 0 && G.pts[idx[k]] !== G.pts[idx[k - 1]]) cur = k;
    place[idx[k]] = cur;
  }
  return place;
}
