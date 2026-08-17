// りなの せかい旅行
//
// ★ りなが 飛行機で 10の 国へ 旅に 出る。よこ から 見た 空の たび。
//   ・とんで いる あいだ … ゆびで 高さを かえて、よけて・あつめる
//   ・さいご         … くうこうの すべりだいに **そっと おりる**
//   ・つくと       … その 国の ゆうめいな 建もの と、パスポートの スタンプ
//
// ★ そうさは 1つだけ。**画面の どこでも いいので ゆびを 置いて、上下に すべらせる**。
//   なかまパレードで「ゆびの ばしょ＝そのまま」に したら
//   「よこ持ちだと まん中に とどかない」と 言われた ので、
//   はじめから **置いた ところからの 動かした ぶん**（相対）に して ある。
//
// ★ ぶつかっても すぐには おわらない。飛行機の げんきが 3つ ある。
//   0 に なると 引きかえし。ねんりょうも 0 に なると 引きかえし。
//
// ★ 絵は ぜんぶ canvas、音は ぜんぶ WebAudio（画像・音の ファイルは 使わない）。

'use strict';

const GAME_VER = 1;
const HUD = 32;

// --- 空の わりつけ -----------------------------------------------------------------------
function skyT() { return HUD + 10; }              // 空の いちばん 上
function skyB() { return VH - 34; }               // 地めん（海）の 上
function ay(a) { return skyT() + clamp(a, -0.2, 1.2) * (skyB() - skyT()); }
const PLANE_X = 0.24;                             // 飛行機の よこの ばしょ（画面の わりあい）
function px0() { return VW * PLANE_X; }

// --- とぶ はやさ など ---------------------------------------------------------------------
const SPEED = 62;                 // 1びょうに すすむ きょり
// ★ さいしょ 0.62 に して いたら、**めん ぜんぶが 1画面に 入って しまい**、
//   じゃまも ★も ぎゅうぎゅうに かさなって 何も 見えなかった。
//   3.4 なら 1びょうに 210ピクセル ながれる。画面には 280きょり ぶんが 見える。
const PXPD = 3.4;                 // きょり 1 が 画面の 何ピクセルか
const MOVE_K = 9.0;               // ゆびに ついていく はやさ
const DRAG_SPAN = 0.42;           // ゆびを 画面たての これだけ すべらせると 上から 下まで
const DRAG_EDGE = 0.9;            // ゆびが 画面の はしまで 来た ときの ついていく はやさ
const FUEL_MAX = 100;
const HP_MAX = 3;

// --- 行き先（近い ところから 遠い ところへ） ------------------------------------------------
const STAGES = [
  { c: 'かんこく',     city: 'ソウル',      km: 1160, len: 2400, mark: 'tower',
    fact: 'キムチと やきにくの 国。日本から いちばん 近い', sky: 'day' },
  { c: 'たいわん',     city: 'タイペイ',    km: 2100, len: 2680, mark: 'tp101',
    fact: 'タピオカの ふるさと。あつくて 雨が よく ふる', sky: 'day' },
  { c: 'ちゅうごく',   city: 'ペキン',      km: 2100, len: 2960, mark: 'wall',
    fact: '万里の長城は 2万キロも つづく なが〜い かべ', sky: 'dusk' },
  { c: 'タイ',         city: 'バンコク',    km: 4600, len: 3240, mark: 'wat',
    fact: 'ぞうさんの 国。おてらが 金ぴかで きらきら', sky: 'day' },
  { c: 'インド',       city: 'デリー',      km: 5900, len: 3520, mark: 'taj',
    fact: 'タージ・マハルは まっ白な 大理石の おはか', sky: 'dusk' },
  { c: 'エジプト',     city: 'カイロ',      km: 9500, len: 3800, mark: 'pyramid',
    fact: 'ピラミッドは 4500年も 前に つくられた', sky: 'desert' },
  { c: 'イタリア',     city: 'ローマ',      km: 9900, len: 4080, mark: 'colos',
    fact: 'ピザと パスタの 国。コロッセオは 2000年前の きょうぎじょう', sky: 'day' },
  { c: 'フランス',     city: 'パリ',        km: 9700, len: 4360, mark: 'eiffel',
    fact: 'エッフェル塔は 324メートル。てっぺんまで のぼれる', sky: 'dusk' },
  { c: 'アメリカ',     city: 'ニューヨーク', km: 10900, len: 4640, mark: 'liberty',
    fact: '自由の女神は フランスからの プレゼント', sky: 'night' },
  { c: 'オーストラリア', city: 'シドニー',   km: 7800, len: 4920, mark: 'opera',
    fact: 'カンガルーと コアラの 国。日本と きせつが 反対', sky: 'day' },
];

// --- むずかしさ --------------------------------------------------------------------------
const DIFF = [
  { name: 'やさしい',  col: '#8AF0B0', haz: 0.78, burn: 0.65, speed: 0.85, land: 1.9, hp: 4,
    tip: 'じゃまが 少なく、ねんりょうも たっぷり' },
  { name: 'ふつう',    col: '#FFD24A', haz: 1.00, burn: 1.00, speed: 1.00, land: 1.3, hp: 3,
    tip: 'とりや かみなりを よけながら すすむ' },
  { name: 'むずかしい', col: '#FF9A6A', haz: 1.45, burn: 1.35, speed: 1.15, land: 0.9, hp: 3,
    tip: 'じゃまが 多く、ねんりょうも きびしい' },
];
function DF() { return DIFF[clamp(save.diff | 0, 0, DIFF.length - 1)]; }

const SAVE_KEY = 'trip.save.v1';
const save = { clear: {}, best: {}, stamp: {}, plays: 0, km: 0, diff: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (s.stamp && typeof s.stamp === 'object') save.stamp = s.stamp;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.km)) save.km = s.km;
  if (Number.isFinite(s.diff)) save.diff = clamp(s.diff | 0, 0, DIFF.length - 1);
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- 空の いろ ---------------------------------------------------------------------------
const SKYC = {
  day:    { top: '#8FD6FF', bot: '#DFF3FF', sea: '#4FA8D8', sea2: '#3E8FBF', cloud: 'rgba(255,255,255,0.92)' },
  dusk:   { top: '#5B4A9A', bot: '#FFB98A', sea: '#6A5A9A', sea2: '#4E4380', cloud: 'rgba(255,225,235,0.85)' },
  night:  { top: '#1E1B4A', bot: '#4A3E7A', sea: '#22204E', sea2: '#191840', cloud: 'rgba(210,220,255,0.55)' },
  desert: { top: '#7EC8F0', bot: '#FFE6B8', sea: '#E8C88A', sea2: '#D4AF6E', cloud: 'rgba(255,255,255,0.85)' },
};

// --- 音 ----------------------------------------------------------------------------------
let engNode = null;
function engineOn() {
  if (!A.ctx || engNode) return;
  const src = A.ctx.createBufferSource();
  const buf = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  src.buffer = buf; src.loop = true;
  const f = A.ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 330;
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, A.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.10, A.ctx.currentTime + 0.4);
  src.connect(f); f.connect(g); g.connect(A.sfx || A.ctx.destination);
  src.start();
  engNode = { src: src, g: g };
}
function engineOff() {
  if (!engNode) return;
  const t = A.ctx.currentTime;
  try {
    engNode.g.gain.cancelScheduledValues(t);
    engNode.g.gain.setValueAtTime(Math.max(0.0001, engNode.g.gain.value), t);
    engNode.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    engNode.src.stop(t + 0.3);
  } catch (e) {}
  engNode = null;
}
function sfxStar()  { if (A.ctx) bleep(anow(), [84, 91], 0.04, 0.09, 0.11); }
function sfxBag()   { if (A.ctx) bleep(anow(), [72, 76, 79, 84], 0.045, 0.10, 0.13); }
function sfxFuel()  { if (A.ctx) bleep(anow(), [64, 71, 76], 0.05, 0.11, 0.12); }
function sfxHit()   { if (A.ctx) { const t = anow(); nz(t, 0.24, 0.20, 90, 2200); tone(t, 45, 0.20, 0.12, 'triangle', null, 26); kick(t, 0.7); } }
function sfxWind()  { if (A.ctx) nz(anow(), 0.5, 0.055, 300, 1500); }
function sfxThunder(){ if (A.ctx) { const t = anow(); nz(t, 0.55, 0.22, 60, 1400); kick(t, 0.9); } }
function sfxLowFuel(){ if (A.ctx) tone(anow(), 62, 0.10, 0.07, 'square', null, 56); }
function sfxGear()  { if (A.ctx) { const t = anow(); nz(t, 0.20, 0.07, 150, 900); tone(t, 50, 0.16, 0.05, 'square'); } }
function sfxTouch() { if (A.ctx) { const t = anow(); nz(t, 0.16, 0.13, 120, 1100); tone(t, 40, 0.14, 0.08, 'triangle', null, 30); } }
function sfxArrive() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.08, 0.18, 0.15);
  kick(t, 0.7); kick(t + 0.48, 0.7);
}
function sfxFail()  { if (A.ctx) { const t = anow(); bleep(t, [72, 67, 63, 58, 53], 0.12, 0.22, 0.13); } }
function sfxStamp() { if (A.ctx) { const t = anow(); nz(t, 0.10, 0.16, 200, 1600); tone(t, 55, 0.12, 0.09, 'square'); } }

// --- BGM（たびの きぶんの ゆったり した ワルツ） -------------------------------------------
const BG = { on: false, t: 0, bar: 0, hot: 0, bpm: 108 };
const BG_ROOT = [57, 59, 60, 62, 64, 65, 64, 62, 60, 57];
const BG_MEL = [
  [0, 4, 7, 12, 7, 4], [0, 5, 9, 12, 9, 5],
  [2, 7, 11, 14, 11, 7], [0, 4, 7, 11, 9, 7],
];
function bgmStartT() { audioStart(); if (A.ctx) { BG.on = true; BG.t = anow() + 0.06; BG.bar = 0; } }
function bgmStopT() { BG.on = false; }
function bgmPumpT() {
  if (!BG.on || !A.ctx) return;
  const spb = 60 / (BG.bpm + BG.hot * 26);
  while (BG.t < anow() + 0.7) { schedBar(BG.t, spb); BG.t += spb * 3; BG.bar++; }
}
// 3びょうし（ズン・チャ・チャ）。とんで いる かんじが 出る。
function schedBar(t0, spb) {
  const root = BG_ROOT[G.si % BG_ROOT.length] - 12;
  const chord = [0, 5, 7, 5][BG.bar % 4];
  const mel = BG_MEL[BG.bar % BG_MEL.length];
  for (let b = 0; b < 3; b++) {
    const t = t0 + b * spb;
    if (b === 0) { kick(t, 0.55); tone(t, root + chord, spb * 0.7, 0.07, 'triangle', A.mus); }
    else {
      tone(t, root + chord + 12, spb * 0.30, 0.04, 'triangle', A.mus);
      tone(t, root + chord + 16, spb * 0.30, 0.032, 'triangle', A.mus);
    }
  }
  for (let i = 0; i < 6; i++) {
    const t = t0 + i * spb * 0.5;
    tone(t, root + 24 + mel[i] + chord, spb * 0.42, 0.05 + BG.hot * 0.02, 'square', A.mus);
  }
}

// --- さいころ ----------------------------------------------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- たびの みちを 作る -------------------------------------------------------------------
//
// ★ 「ぜったいに 通れない ならび」が できないように、
//   じゃまは **たてに 0.45 いじょうの すきま**を かならず のこす。
//   作った あとで もう一度 見なおして、せまい ところを ひろげる。
const GAP_MIN = 0.42;

function buildTrip(si) {
  const st = STAGES[si];
  const D = DF();
  const rnd = rng(0x7A17 + si * 6151);
  const items = [];
  const L = st.len;

  // --- じゃま ---
  const nHaz = Math.round((L / 130) * D.haz * (0.80 + si * 0.030));
  const kinds = ['bird', 'cloud', 'balloon'];
  if (si >= 2) kinds.push('plane');
  if (si >= 3) kinds.push('storm');
  for (let i = 0; i < nHaz; i++) {
    // さいしょの 140 と さいごの 220 は あけて おく（出発と 着りく の ため）
    const d = 300 + (L - 760) * (i + 0.5 + (rnd() - 0.5) * 0.6) / nHaz;
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const a = 0.12 + rnd() * 0.72;
    items.push({
      t: 'haz', kind: kind, d: d, a: a, a0: a,
      amp: kind === 'bird' ? 0.06 + rnd() * 0.10 : 0,
      ph: rnd() * 6.28, sp: 1.2 + rnd() * 1.4,
      r: kind === 'storm' ? 0.13 : kind === 'plane' ? 0.075 : 0.062,
      hit: 0, bolt: rnd() * 2,
    });
  }

  // --- あつめる もの ---
  const nStar = Math.round(L / 145);
  for (let i = 0; i < nStar; i++) {
    const d = 240 + (L - 640) * (i + 0.5) / nStar;
    // ★ 3こ ならべて 「みち」に する。ならんで いると おいかけたく なる。
    const a = 0.14 + rnd() * 0.68;
    for (let k = 0; k < 3; k++) {
      items.push({ t: 'star', d: d + k * 13, a: clamp(a + (k - 1) * 0.04, 0.08, 0.9), got: 0 });
    }
  }
  const nBag = 5;
  for (let i = 0; i < nBag; i++) {
    items.push({
      t: 'bag', d: 400 + (L - 900) * (i + 0.5) / nBag,
      a: 0.15 + rnd() * 0.68, got: 0,
    });
  }
  // ★ タンクの かずは **ねんりょうの へりかたから 計算する**。
  //   さいしょ「2 + めん/3」で きめて いたら、むずかしいで
  //   かんぺきに とんでも 99% の ところで ガス欠に なる めんが 5つ あった。
  //   1本ぶんで たびの 0.75/burn、タンク 1こで その 34%。
  //   ぜんぶで たびの 1.25ばい に なる かず を 出す。
  //   1本ぶんで たびの 0.85/burn、タンク 1こで その 34%。
  //   じゃまを よけて いると **タンクの 6わり ぐらいしか とれない** ので、
  //   それも 見こんで かずを 出す。ぜんぶ とれたら 大あまり ＝ それで いい。
  const need = (1.25 * D.burn / 0.85 - 1) / (0.34 * 0.6);
  const nFuel = Math.max(2, Math.ceil(need) + Math.floor(si / 4));
  for (let i = 0; i < nFuel; i++) {
    items.push({
      t: 'fuel', d: 500 + (L - 1000) * (i + 0.6) / nFuel,
      a: 0.18 + rnd() * 0.62, got: 0,
    });
  }
  // --- 追い風（みどりの おび）。入ると はやく なって ねんりょうも へらない ---
  const nJet = 2 + Math.floor(si / 2);
  for (let i = 0; i < nJet; i++) {
    const a = 0.10 + rnd() * 0.24;                    // 追い風は 高い ところ
    items.push({
      t: 'jet', d: 450 + (L - 950) * (i + 0.5) / nJet,
      a: a, h: 0.16 + rnd() * 0.08, w: 65 + rnd() * 55, on: 0,
    });
  }

  fixTrip(items, L);
  items.sort(function (p, q) { return p.d - q.d; });
  return { st: st, L: L, items: items, hp: D.hp };
}

// ★ おなじ ばしょに じゃまが かたまって「通れない かべ」に なって いないか 見なおす。
//
//   20きょり ごとに 見て、その ばしょで **ふさがれて いない 高さの すきま**が
//   GAP_MIN より せまければ、まん中の じゃまを はしへ どける。
//   これを くりかえして、どこにも かべが なく なるまで 直す。
//
//   ★ さいしょ もっと ややこしい なおしかたを して いた が、
//     ロボットに とばせたら かんぺきに よけても 3回 ぶつかる めんが あった。
//     「ぜんぶの ばしょで すきまが ある」を そのまま たしかめる かたちに した。
//   （ひこうきは 0.4びょうで 上から 下まで 動ける ＝ 25きょり ぶん。
//     じゃまは 100きょり いじょう 間が あく ので、「とどかない」は おきない）
function tripGap(haz, d) {
  const segs = [];
  for (const o of haz) {
    if (Math.abs(o.d - d) > 30) continue;          // よこの あたり(12)＋よゆう
    const m = o.r + 0.055 + (o.amp || 0);
    segs.push({ lo: o.a - m, hi: o.a + m, o: o });
  }
  if (!segs.length) return { gap: 1, segs: segs };
  segs.sort(function (p, q) { return p.lo - q.lo; });
  let top = 0.03, gap = 0;
  for (let k = 0; k <= segs.length; k++) {
    const bot = k < segs.length ? segs[k].lo : 0.95;
    if (bot - top > gap) gap = bot - top;
    if (k < segs.length && segs[k].hi > top) top = segs[k].hi;
  }
  return { gap: gap, segs: segs };
}

function fixTrip(items, L) {
  let haz = items.filter(function (o) { return o.t === 'haz'; });
  haz.sort(function (p, q) { return p.d - q.d; });
  for (let pass = 0; pass < 12; pass++) {
    let bad = 0;
    for (let d = 180; d < L - 260; d += 10) {
      const r = tripGap(haz, d);
      if (r.gap >= GAP_MIN || !r.segs.length) continue;
      bad++;
      const mid = r.segs[Math.floor(r.segs.length / 2)].o;
      if (pass < 7) {
        // ★ さいしょ「上か下の はしへ どける」に して いた。そうしたら
        //   じゃまが みんな はしに よって、**まん中を まっすぐ 飛ぶ だけで
        //   ぜんぶ よけられる** ように なって しまった（ロボットが 10/10）。
        //   高さは そのままに して、**まえ うしろに ずらす**。
        mid.d += 45;
        haz.sort(function (p, q) { return p.d - q.d; });
      } else {
        // ★ どけても だめな ならびが のこる ことが ある（5コースで おきた）。
        //   そのときは **消す**。かならず 通れるように なる。
        mid.dead = 1;
      }
    }
    haz = haz.filter(function (o) { return !o.dead; });
    if (!bad) break;
  }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].dead) items.splice(i, 1);
  for (const o of haz) o.a0 = o.a;
}

// 作った みちに 「通れない ところ」が ないか（テスト から よぶ）
function tripCheck(tp) {
  const haz = tp.items.filter(function (o) { return o.t === 'haz'; });
  let worst = 1, at = 0;
  for (let d = 180; d < tp.L - 260; d += 10) {
    const g = tripGap(haz, d).gap;
    if (g < worst) { worst = g; at = d; }
  }
  return { worst: worst, at: at, ok: worst >= GAP_MIN };
}

// --- ゲームの なかみ ---------------------------------------------------------------------
const G = {
  screen: 'title', t: 0,
  si: 0, trip: null,
  d: 0, a: 0.5, ta: 0.5, vy: 0,
  held: 0, grabPy: 0, grabA: 0,
  fuel: FUEL_MAX, burnRate: 1, hp: HP_MAX, inv: 0,
  star: 0, bag: 0, bagAll: 0, jet: 0, lowT: 0,
  phase: 'ready', readyT: 0, landT: 0, landIn: 0, landOK: 0,
  parts: [], pops: [], shake: 0, flash: 0,
  msg: '', msgT: 0,
  over: false, win: false,
};

function startStage(i) {
  audioStart();
  const D = DF();
  G.si = i;
  G.trip = buildTrip(i);
  G.d = 0; G.a = 0.5; G.ta = 0.5; G.vy = 0; G.held = 0;
  G.fuel = FUEL_MAX; G.hp = D.hp; G.inv = 0;
  const secs = G.trip.L / (SPEED * D.speed);
  G.burnRate = FUEL_MAX / (0.85 * secs) * D.burn;
  G.star = 0; G.bag = 0; G.jet = 0; G.lowT = 0;
  G.bagAll = G.trip.items.filter(function (o) { return o.t === 'bag'; }).length;
  G.parts.length = 0; G.pops.length = 0;
  G.shake = 0; G.flash = 0;
  G.phase = 'ready'; G.readyT = 1.7;
  G.landT = 0; G.landIn = 0; G.landOK = 0;
  G.over = false; G.win = false;
  G.msg = ''; G.msgT = 0;
  save.plays++; storeSave();
  BG.hot = 0;
  bgmStartT();
  engineOn();
  G.screen = 'play';
}

function pop(text, col) { G.pops.push({ text: text, col: col, t: 0 }); }
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * (sp || 90);
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: col, t: 0, life: 0.6 });
  }
}

function hurt(why) {
  if (G.inv > 0 || G.over) return;
  G.hp--;
  G.inv = 1.6;
  G.shake = 14;
  G.flash = 0.35;
  sfxHit();
  burst(px0(), ay(G.a), '#FFB86A', 16, 130);
  pop(why, '#FF8A8A');
  if (G.hp <= 0) finish(false, 'ひこうきが もたなく なった…');
}

function finish(win, why) {
  if (G.over) return;
  G.over = true; G.win = win;
  G.phase = 'end';
  bgmStopT(); engineOff();
  G.msg = why || ''; G.msgT = 3;
  if (win) {
    sfxArrive();
    save.clear['s' + G.si] = 1;
    save.stamp['s' + G.si] = 1;
    save.km += STAGES[G.si].km;
    const sc = G.star * 10 + G.bag * 100 + Math.round(G.fuel) + (G.landOK === 2 ? 300 : 100);
    if (!save.best['s' + G.si] || save.best['s' + G.si] < sc) save.best['s' + G.si] = sc;
    G.score = sc;
    storeSave();
    setTimeout(function () { sfxStamp(); }, 700);
  } else {
    sfxFail();
    G.score = 0;
  }
}

// --- まいコマ ----------------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  bgmPumpT();
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; return; }
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 34);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 1.6);
  if (G.inv > 0) G.inv -= dt;

  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 220 * dt;
    if (q.t > q.life) G.parts.splice(i, 1);
  }
  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t += dt;
    if (G.pops[i].t > 1.1) G.pops.splice(i, 1);
  }

  if (G.over) { IN.taps.length = 0; IN.fireTap = false; return; }

  // --- そうさ（ゆびを 置いた ところからの 上下） ---
  if (IN.hold) {
    if (!G.held) { G.held = 1; G.grabPy = IN.y; G.grabA = G.ta; }
    // ゆびが 画面の 上下の はしまで 来たら つかんだ ばしょが ついていく
    if (IN.y < VH * 0.10) G.grabPy += VH * DRAG_EDGE * dt;
    else if (IN.y > VH * 0.90) G.grabPy -= VH * DRAG_EDGE * dt;
    G.ta = clamp(G.grabA + (IN.y - G.grabPy) / (VH * DRAG_SPAN), 0.03, 0.95);
    if (G.ta <= 0.03 || G.ta >= 0.95) { G.grabA = G.ta; G.grabPy = IN.y; }
  } else {
    G.held = 0;
  }
  const k = keyDir();
  if (k === 'u') G.ta = clamp(G.ta - dt * 1.05, 0.03, 0.95);
  if (k === 'd') G.ta = clamp(G.ta + dt * 1.05, 0.03, 0.95);
  const before = G.a;
  G.a += (G.ta - G.a) * Math.min(1, dt * MOVE_K);
  G.vy = (G.a - before) / Math.max(0.0001, dt);

  if (G.phase === 'ready') {
    G.readyT -= dt;
    if (G.readyT <= 0) { G.phase = 'fly'; G.msg = 'いってらっしゃい！'; G.msgT = 1.2; }
    IN.taps.length = 0; IN.fireTap = false;
    return;
  }
  if (G.phase === 'fly') updateFly(dt);
  else if (G.phase === 'land') updateLand(dt);

  IN.taps.length = 0;
  IN.fireTap = false;
}

function updateFly(dt) {
  const tr = G.trip, D = DF();
  const jet = G.jet > 0;
  const v = SPEED * D.speed * (jet ? 1.45 : 1);
  G.d += v * dt;
  G.jet = Math.max(0, G.jet - dt);

  // ★ ねんりょうは **めんの ながさに あわせて** へる。
  //   1本ぶんで たびの やく 75% ぶん。のこりは タンクと おいかぜで おぎなう。
  //   これを しないと、長い めんほど 何もかも 足りなく なる。
  G.fuel -= (jet ? 0.2 : 1) * G.burnRate * dt;
  if (G.fuel <= 0) { G.fuel = 0; finish(false, 'ねんりょうが なくなった…'); return; }
  if (G.fuel < 25) {
    G.lowT -= dt;
    if (G.lowT <= 0) { sfxLowFuel(); G.lowT = 0.6; }
  }

  BG.hot = clamp((G.d - (tr.L - 500)) / 500, 0, 1);

  const myA = G.a;
  for (const o of tr.items) {
    const rel = o.d - G.d;
    if (rel > 340) break;
    if (rel < -60) continue;
    if (o.t === 'haz') {
      // とりは 上下に ゆれる
      if (o.amp) o.a = o.a0 + Math.sin(G.t * o.sp + o.ph) * o.amp;
      if (o.kind === 'storm') o.bolt -= dt;
      if (Math.abs(rel) < 12 && Math.abs(o.a - myA) < o.r + 0.045) {
        if (o.hit) continue;
        o.hit = 1;
        hurt(o.kind === 'bird' ? 'とりに ぶつかった！'
           : o.kind === 'storm' ? 'かみなり雲！'
           : o.kind === 'plane' ? 'ほかの ひこうき！' : '雲に つっこんだ！');
        if (o.kind === 'storm') sfxThunder();
      }
    } else if (o.t === 'jet') {
      const inJet = Math.abs(rel) < o.w * 0.5 && Math.abs(o.a - myA) < o.h;
      if (inJet) {
        if (!o.on) { o.on = 1; sfxWind(); pop('おいかぜ！', '#8AF0B0'); }
        G.jet = Math.max(G.jet, 0.25);
      } else o.on = 0;
    } else if (!o.got && Math.abs(rel) < 10) {
      if (o.t === 'star' && Math.abs(o.a - myA) < 0.055) {
        o.got = 1; G.star++; sfxStar();
        burst(px0(), ay(o.a), '#FFE24A', 5, 70);
      } else if (o.t === 'bag' && Math.abs(o.a - myA) < 0.070) {
        o.got = 1; G.bag++; sfxBag();
        pop('おみやげ ' + G.bag + '/' + G.bagAll, '#FF8FBB');
        burst(px0(), ay(o.a), '#FF8FBB', 8, 90);
      } else if (o.t === 'fuel' && Math.abs(o.a - myA) < 0.070) {
        o.got = 1; G.fuel = Math.min(FUEL_MAX, G.fuel + 34); sfxFuel();
        pop('ねんりょう +34', '#8AF0B0');
        burst(px0(), ay(o.a), '#8AF0B0', 8, 90);
      }
    }
  }

  if (G.d >= tr.L) {
    G.phase = 'land'; G.landT = 0; G.landIn = 0;
    sfxGear();
    G.msg = STAGES[G.si].city + ' に とうちゃく！ みどりの おびに 入って おりよう';
    G.msgT = 2.6;
  }
}

// ★ 着りく。むずかしい 操作は させない。
//   **みどりの おびの 中に いる 時間**を ためる だけ。
//   たまったら 着りく。時間ぎれでも 着りくは できる（点が 下がる だけ）。
const LAND_A = 0.72;              // すべりだいの 高さ
const LAND_H = 0.09;              // おびの はんぶんの 高さ
const LAND_T = 4.5;               // 着りくの ながさ（びょう）
function updateLand(dt) {
  const D = DF();
  G.landT += dt;
  G.d += SPEED * D.speed * 0.72 * dt;
  G.fuel = Math.max(0, G.fuel - G.burnRate * 0.5 * dt);
  const h = LAND_H * D.land;
  if (Math.abs(G.a - LAND_A) < h) G.landIn += dt;
  if (G.landT >= LAND_T) {
    // 3びょう いじょう おびに いたら パーフェクト
    G.landOK = G.landIn >= LAND_T * 0.62 ? 2 : 1;
    sfxTouch();
    burst(px0(), ay(LAND_A), '#FFF0C8', 14, 110);
    finish(true, G.landOK === 2 ? 'パーフェクト ちゃくりく！' : 'ぶじに とうちゃく！');
  }
}

// --- 絵 -----------------------------------------------------------------------------------
function dx(d) { return px0() + (d - G.d) * PXPD; }

function drawPlay() {
  const tr = G.trip, st = STAGES[G.si], D = DF();
  const C = SKYC[st.sky];

  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  // 空
  const g = ctx.createLinearGradient(0, skyT() - 20, 0, skyB());
  g.addColorStop(0, C.top); g.addColorStop(1, C.bot);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, skyB() + VOY + 4);
  drawSkyDeco(st.sky);
  drawFarClouds(C);

  // 海／地めん
  const g2 = ctx.createLinearGradient(0, skyB(), 0, VH);
  g2.addColorStop(0, C.sea); g2.addColorStop(1, C.sea2);
  ctx.fillStyle = g2;
  ctx.fillRect(-VW, skyB(), VW * 3, VH - skyB() + VOB + 8);
  // なみ
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = skyB() + 8 + i * 7;
    ctx.beginPath();
    for (let x = -20; x < VW + 20; x += 22) {
      const o = ((G.d * PXPD * (0.5 + i * 0.1)) % 22);
      ctx.moveTo(x - o, y);
      ctx.quadraticCurveTo(x - o + 5.5, y - 3, x - o + 11, y);
    }
    ctx.stroke();
  }

  // 追い風の おび（いちばん おく）
  for (const o of tr.items) {
    if (o.t !== 'jet') continue;
    const x = dx(o.d), w = o.w * PXPD;
    if (x + w < -40 || x - w > VW + 40) continue;
    const y0 = ay(o.a - o.h), y1 = ay(o.a + o.h);
    ctx.fillStyle = 'rgba(138,240,176,0.22)';
    rr(x - w / 2, y0, w, y1 - y0, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(120,230,160,0.7)'; ctx.lineWidth = 2;
    rr(x - w / 2, y0, w, y1 - y0, 10); ctx.stroke();
    // ながれる やじるし
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 4; i++) {
      const ax = x - w / 2 + ((G.t * 190 + i * w / 4) % w);
      const ayy = (y0 + y1) / 2;
      ctx.beginPath();
      ctx.moveTo(ax, ayy - 7); ctx.lineTo(ax + 13, ayy); ctx.lineTo(ax, ayy + 7);
      ctx.closePath(); ctx.fill();
    }
    bigText('おいかぜ', x, y0 - 10, 13, '#2A6A44', '#FFFFFF');
  }

  // 着りくの みちしるべ
  if (G.phase === 'land') drawRunway(D);

  // もの
  for (const o of tr.items) {
    const x = dx(o.d);
    if (x < -70 || x > VW + 70) continue;
    if (o.t === 'star' && !o.got) drawStar(x, ay(o.a), 10 + Math.sin(G.t * 5 + o.d) * 1.5, '#FFE24A');
    else if (o.t === 'bag' && !o.got) drawBag(x, ay(o.a) + Math.sin(G.t * 3 + o.d) * 4);
    else if (o.t === 'fuel' && !o.got) drawCan(x, ay(o.a) + Math.sin(G.t * 3 + o.d) * 4);
    else if (o.t === 'haz') drawHaz(o, x);
  }

  // 飛行機
  drawPlane(px0(), ay(G.a), G.vy, G.inv > 0 && Math.floor(G.t * 14) % 2 === 0);

  // つぶ
  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
    ctx.fillStyle = q.col;
    circle(q.x, q.y, 4); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ぶつかった ときの 赤い ふち
  if (G.flash > 0) {
    ctx.globalAlpha = G.flash * 0.6;
    ctx.fillStyle = '#FF5A5A';
    ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
    ctx.globalAlpha = 1;
  }

  drawHud();

  for (let i = 0; i < G.pops.length; i++) {
    const q = G.pops[i];
    ctx.globalAlpha = Math.max(0, 1 - q.t / 1.1);
    bigText(q.text, px0() + 40, ay(G.a) - 40 - q.t * 60 - i * 22,
            fitSize(q.text, VW * 0.4, 20), q.col, 'rgba(255,255,255,0.95)');
    ctx.globalAlpha = 1;
  }

  if (G.phase === 'ready') {
    const kk = clamp(G.readyT / 1.7, 0, 1);
    ctx.globalAlpha = 0.30 + 0.45 * kk;
    ctx.fillStyle = '#1E2440';
    rr(VW / 2 - VW * 0.32, VH * 0.28, VW * 0.64, 96, 20); ctx.fill();
    ctx.globalAlpha = 1;
    bigText('日本 → ' + st.c + '（' + st.city + '）', VW / 2, VH * 0.28 + 30, 24, '#FFF6C8');
    bigText(st.km + ' キロの たび', VW / 2, VH * 0.28 + 60, 17, '#FFD9A0', null);
    bigText('ゆびを 置いて 上下に すべらせて とぼう', VW / 2, VH * 0.28 + 84,
            fitSize('ゆびを 置いて 上下に すべらせて とぼう', VW * 0.6, 15), '#CFE8FF', null);
  }

  if (G.msgT > 0 && G.phase !== 'ready' && !G.over) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    bigText(G.msg, VW / 2, HUD + 44, fitSize(G.msg, VW * 0.7, 20), '#FFF6C8', 'rgba(20,26,54,0.7)');
    ctx.globalAlpha = 1;
  }

  if (G.over) drawEnd();
}

// --- おわりの まく（ついたら 建もの と スタンプ） --------------------------------------------
function drawEnd() {
  const st = STAGES[G.si];
  ctx.fillStyle = 'rgba(10,14,32,0.93)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  if (G.win) {
    bigText(st.city + ' に とうちゃく！', VW / 2, HUD + 34, 26, '#FFD24A');
    // 建もの
    ctx.save();
    ctx.translate(VW * 0.24, VH * 0.60);
    drawMark(st.mark, 1);
    ctx.restore();
    bigText(st.c, VW * 0.24, VH * 0.80, 22, '#FFF6C8');
    bigText(st.fact, VW * 0.66, VH * 0.36, fitSize(st.fact, VW * 0.60, 16), '#CFE8FF', null);
    const lines = [
      '★ ' + G.star + 'こ　おみやげ ' + G.bag + '/' + G.bagAll,
      'のこり ねんりょう ' + Math.round(G.fuel) + '　' + (G.landOK === 2 ? 'パーフェクト ちゃくりく' : 'ちゃくりく OK'),
      'スコア ' + G.score + '　とんだ きょり ぜんぶで ' + save.km + ' キロ',
    ];
    lines.forEach(function (s, i) {
      bigText(s, VW * 0.66, VH * 0.48 + i * 26, fitSize(s, VW * 0.60, 17), '#F0EAFF', null);
    });
    // スタンプ
    ctx.save();
    ctx.translate(VW * 0.66, VH * 0.76);
    ctx.rotate(-0.18);
    ctx.strokeStyle = '#FF5A6A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
    bigText(st.c, 0, -6, fitSize(st.c, 46, 13), '#FF5A6A', null);
    bigText('ARRIVED', 0, 10, 9, '#FF5A6A', null);
    ctx.restore();
  } else {
    bigText('ひきかえした…', VW / 2, VH * 0.26, 30, '#FF8AA8');
    bigText(G.msg, VW / 2, VH * 0.38, fitSize(G.msg, VW * 0.6, 20), '#F0EAFF', null);
    bigText('すすんだ きょり ' + Math.round(G.d / G.trip.L * 100) + '%　★ ' + G.star + 'こ',
            VW / 2, VH * 0.46, 17, '#CFE8FF', null);
  }
  const btns = G.win && G.si + 1 < STAGES.length
    ? [{ label: 'もういちど', on: function () { startStage(G.si); } },
       { label: 'つぎの 国へ', on: function () { startStage(G.si + 1); }, col: '#8AF0B0' },
       { label: 'えらぶ', on: function () { backTitle(); }, col: '#8AD8F0' }]
    : [{ label: 'もういちど', on: function () { startStage(G.si); } },
       { label: 'えらぶ', on: function () { backTitle(); }, col: '#8AD8F0' }];
  const bw = Math.min(190, VW * 0.22);
  const total = btns.length * bw + (btns.length - 1) * 14;
  btns.forEach(function (b, i) {
    drawButton(button(VW / 2 - total / 2 + i * (bw + 14), VH - 52, bw, 42, b.on), b.label, b.col || '#FFD24A');
  });
}

function backTitle() { bgmStopT(); engineOff(); G.screen = 'title'; }

// --- 空の かざり -------------------------------------------------------------------------
function drawSkyDeco(sky) {
  if (sky === 'night') {
    for (let i = 0; i < 30; i++) {
      const x = ((i * 149 + G.d * 0.06) % (VW + 40)) - 20;
      const y = skyT() + ((i * 71) % 100) / 100 * (skyB() - skyT()) * 0.7;
      const tw = 0.5 + 0.5 * Math.sin(G.t * 2.2 + i);
      ctx.globalAlpha = 0.4 + tw * 0.55;
      ctx.fillStyle = '#FFF6C8';
      circle(x, y, 1.4 + tw); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF0C0';
    circle(VW * 0.82, skyT() + 26, 18); ctx.fill();
    ctx.fillStyle = SKYC.night.top;
    circle(VW * 0.82 - 7, skyT() + 21, 16); ctx.fill();
    return;
  }
  ctx.fillStyle = sky === 'dusk' ? 'rgba(255,220,150,0.95)' : 'rgba(255,242,180,0.95)';
  circle(VW * 0.80, skyT() + 28, sky === 'dusk' ? 24 : 20); ctx.fill();
}

function drawFarClouds(C) {
  // おくの 雲（ゆっくり ながれる）
  for (let i = 0; i < 7; i++) {
    const x = ((i * 220 - G.d * PXPD * 0.28) % (VW + 300) + VW + 300) % (VW + 300) - 150;
    const y = skyT() + 18 + ((i * 53) % 60) / 60 * (skyB() - skyT()) * 0.62;
    const s = 0.7 + (i % 3) * 0.25;
    ctx.fillStyle = C.cloud;
    ctx.globalAlpha = 0.45;
    circle(x, y, 22 * s); ctx.fill();
    circle(x + 24 * s, y + 5 * s, 17 * s); ctx.fill();
    circle(x - 22 * s, y + 6 * s, 15 * s); ctx.fill();
    rr(x - 24 * s, y, 50 * s, 17 * s, 8 * s); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// --- じゃま ------------------------------------------------------------------------------
function drawHaz(o, x) {
  const y = ay(o.a);
  const R = o.r * (skyB() - skyT());
  if (o.kind === 'bird') {
    const f = Math.sin(G.t * 9 + o.ph);
    ctx.strokeStyle = '#3A3450'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - R, y + f * R * 0.5);
    ctx.quadraticCurveTo(x - R * 0.4, y - R * 0.5, x, y);
    ctx.quadraticCurveTo(x + R * 0.4, y - R * 0.5, x + R, y + f * R * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#5A4A6A';
    circle(x, y, R * 0.30); ctx.fill();
    ctx.fillStyle = '#FFC24A';
    ctx.beginPath();
    ctx.moveTo(x + R * 0.26, y - 1); ctx.lineTo(x + R * 0.56, y + 1);
    ctx.lineTo(x + R * 0.26, y + 4); ctx.closePath(); ctx.fill();
  } else if (o.kind === 'balloon') {
    ctx.strokeStyle = 'rgba(90,70,60,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + R * 0.6); ctx.lineTo(x, y + R * 1.35); ctx.stroke();
    ctx.fillStyle = '#FF8FBB';
    ctx.beginPath(); ctx.ellipse(x, y, R * 0.85, R, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath(); ctx.ellipse(x, y, R * 0.32, R, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A0714E';
    rr(x - R * 0.28, y + R * 1.3, R * 0.56, R * 0.42, 3); ctx.fill();
  } else if (o.kind === 'plane') {
    // むかいの ひこうき（左を むいて いる）
    ctx.fillStyle = '#E8ECF4';
    rr(x - R * 1.5, y - R * 0.34, R * 3, R * 0.68, R * 0.34); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - R * 1.5, y); ctx.lineTo(x - R * 2.1, y + R * 0.05);
    ctx.lineTo(x - R * 1.5, y + R * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8FA8C8';
    ctx.beginPath();
    ctx.moveTo(x + R * 0.2, y); ctx.lineTo(x + R * 1.1, y - R * 0.9);
    ctx.lineTo(x + R * 1.4, y - R * 0.9); ctx.lineTo(x + R * 0.9, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5A9AD8';
    circle(x - R * 1.15, y - R * 0.05, R * 0.14); ctx.fill();
  } else if (o.kind === 'storm') {
    const on = o.bolt < 0.35;
    if (o.bolt <= 0) o.bolt = 1.6 + Math.random() * 1.6;
    ctx.fillStyle = on ? '#8A86B8' : '#6A6690';
    circle(x, y - R * 0.15, R * 0.72); ctx.fill();
    circle(x + R * 0.6, y, R * 0.55); ctx.fill();
    circle(x - R * 0.6, y + R * 0.05, R * 0.5); ctx.fill();
    rr(x - R * 0.8, y - R * 0.15, R * 1.6, R * 0.62, R * 0.28); ctx.fill();
    // かみなり
    ctx.fillStyle = on ? '#FFF06A' : '#FFD24A';
    ctx.beginPath();
    ctx.moveTo(x + R * 0.06, y + R * 0.35);
    ctx.lineTo(x - R * 0.24, y + R * 0.95);
    ctx.lineTo(x + R * 0.02, y + R * 0.95);
    ctx.lineTo(x - R * 0.16, y + R * 1.55);
    ctx.lineTo(x + R * 0.34, y + R * 0.80);
    ctx.lineTo(x + R * 0.08, y + R * 0.80);
    ctx.lineTo(x + R * 0.34, y + R * 0.35);
    ctx.closePath(); ctx.fill();
  } else {
    // ふつうの 雲（かたい）
    ctx.fillStyle = '#C8CEE0';
    circle(x, y - R * 0.1, R * 0.7); ctx.fill();
    circle(x + R * 0.62, y + R * 0.06, R * 0.5); ctx.fill();
    circle(x - R * 0.6, y + R * 0.08, R * 0.46); ctx.fill();
    rr(x - R * 0.8, y - R * 0.1, R * 1.6, R * 0.6, R * 0.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    circle(x - R * 0.2, y - R * 0.28, R * 0.34); ctx.fill();
  }
}

function drawStar(x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr2 = i % 2 ? r * 0.46 : r;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  circle(x - r * 0.2, y - r * 0.25, r * 0.2); ctx.fill();
}

function drawBag(x, y) {
  ctx.fillStyle = '#FF8FBB';
  rr(x - 13, y - 10, 26, 22, 5); ctx.fill();
  ctx.fillStyle = '#E8709E';
  rr(x - 13, y - 2, 26, 4, 2); ctx.fill();
  ctx.strokeStyle = '#8A5A70'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 11, 6, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#FFF0C8';
  circle(x + 6, y + 4, 2.5); ctx.fill();
}

function drawCan(x, y) {
  ctx.fillStyle = '#8AF0B0';
  rr(x - 11, y - 13, 22, 26, 5); ctx.fill();
  ctx.fillStyle = '#4A9A6A';
  rr(x - 4, y - 17, 8, 5, 2); ctx.fill();
  bigText('F', x, y + 1, 15, '#1E4A2E', null);
}

// --- くうこう（着りく） --------------------------------------------------------------------
function drawRunway(D) {
  const h = LAND_H * D.land;
  const y0 = ay(LAND_A - h), y1 = ay(LAND_A + h);
  const inZone = Math.abs(G.a - LAND_A) < h;
  ctx.fillStyle = inZone ? 'rgba(138,240,176,0.30)' : 'rgba(255,224,120,0.22)';
  ctx.fillRect(0, y0, VW, y1 - y0);
  ctx.strokeStyle = inZone ? '#8AF0B0' : '#FFD24A';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.lineDashOffset = -G.t * 90;
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(VW, y0);
  ctx.moveTo(0, y1); ctx.lineTo(VW, y1); ctx.stroke();
  ctx.setLineDash([]);
  bigText(inZone ? 'この たかさで OK！' : 'みどりの おびに 入ろう',
          VW * 0.72, (y0 + y1) / 2, 18, inZone ? '#2A6A44' : '#7A5A20', '#FFFFFF');

  // すべりだい（地めんの すべり道）
  ctx.fillStyle = '#6A6A80';
  ctx.fillRect(0, skyB(), VW, 14);
  ctx.fillStyle = '#FFF0C8';
  for (let i = 0; i < 14; i++) {
    const x = ((i * 90 - G.d * PXPD * 0.9) % (VW + 90) + VW + 90) % (VW + 90) - 45;
    ctx.fillRect(x, skyB() + 5, 44, 4);
  }
  // のこり 時間
  const k = clamp(1 - G.landT / LAND_T, 0, 1);
  const bw = VW * 0.4, bx = VW / 2 - bw / 2, by = skyB() + 20;
  ctx.fillStyle = 'rgba(20,26,54,0.55)';
  rr(bx, by, bw, 10, 5); ctx.fill();
  ctx.fillStyle = '#8AF0B0';
  rr(bx, by, bw * clamp(G.landIn / (LAND_T * 0.62), 0, 1), 10, 5); ctx.fill();
  bigText('ちゃくりく まで ' + (LAND_T - G.landT).toFixed(1) + 'びょう', VW / 2, by + 5, 12, '#FFFFFF', 'rgba(20,26,54,0.8)');
}

// --- 飛行機（りなが のって いる） -----------------------------------------------------------
function drawPlane(x, y, vy, blink) {
  const tilt = clamp(vy * 0.9, -0.35, 0.35);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  if (blink) ctx.globalAlpha = 0.45;
  const s = 1.25;
  // ひこうき雲
  ctx.globalAlpha = (blink ? 0.2 : 0.5);
  ctx.fillStyle = '#FFFFFF';
  rr(-88 * s, -4 * s, 60 * s, 8 * s, 4 * s); ctx.fill();
  ctx.globalAlpha = blink ? 0.45 : 1;
  // しっぽ
  ctx.fillStyle = '#FF8FBB';
  ctx.beginPath();
  ctx.moveTo(-26 * s, -2 * s); ctx.lineTo(-34 * s, -26 * s);
  ctx.lineTo(-20 * s, -26 * s); ctx.lineTo(-10 * s, -2 * s);
  ctx.closePath(); ctx.fill();
  // うしろの はね
  ctx.fillStyle = '#E8709E';
  ctx.beginPath();
  ctx.moveTo(-24 * s, 0); ctx.lineTo(-40 * s, 10 * s);
  ctx.lineTo(-20 * s, 8 * s); ctx.closePath(); ctx.fill();
  // どうたい
  ctx.fillStyle = '#F6F8FC';
  rr(-30 * s, -11 * s, 66 * s, 22 * s, 11 * s); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30 * s, -10 * s); ctx.quadraticCurveTo(46 * s, 0, 30 * s, 10 * s);
  ctx.closePath(); ctx.fill();
  // ライン
  ctx.fillStyle = '#FF8FBB';
  rr(-28 * s, 1 * s, 62 * s, 5 * s, 2.5 * s); ctx.fill();
  // まえの はね
  ctx.fillStyle = '#D8DEEA';
  ctx.beginPath();
  ctx.moveTo(2 * s, 4 * s); ctx.lineTo(-14 * s, 24 * s);
  ctx.lineTo(6 * s, 22 * s); ctx.lineTo(16 * s, 6 * s);
  ctx.closePath(); ctx.fill();
  // エンジン
  ctx.fillStyle = '#9AA6BC';
  rr(-6 * s, 9 * s, 18 * s, 8 * s, 4 * s); ctx.fill();
  // まど（りなが 見える）
  ctx.fillStyle = '#5AB4E8';
  circle(16 * s, -1 * s, 8 * s); ctx.fill();
  ctx.fillStyle = '#F6CDA8';
  circle(16 * s, 0, 5.6 * s); ctx.fill();
  ctx.fillStyle = '#6B4A38';
  ctx.beginPath();
  ctx.arc(16 * s, -1 * s, 6 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = '#2E2438';
  circle(14.6 * s, 0.6 * s, 1.2 * s); ctx.fill();
  circle(18.4 * s, 0.6 * s, 1.2 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,150,180,0.7)';
  circle(13 * s, 2.6 * s, 1.6 * s); ctx.fill();
  circle(20 * s, 2.6 * s, 1.6 * s); ctx.fill();
  // ほかの まど
  ctx.fillStyle = '#9AC8E8';
  for (let i = 0; i < 4; i++) circle(-2 * s - i * 9 * s, -2 * s, 2.6 * s), ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// --- HUD ---------------------------------------------------------------------------------
function drawHud() {
  ctx.fillStyle = 'rgba(20,26,54,0.78)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  // ねんりょう
  const bw = Math.min(140, VW * 0.16), bh = 13, bx = 62, by = HUD / 2 - bh / 2;
  ctx.fillStyle = DF().col;
  ctx.fillText(DF().name, 8, HUD / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(bx, by, bw, bh, bh / 2); ctx.fill();
  const k = G.fuel / FUEL_MAX;
  ctx.fillStyle = k < 0.25 ? '#FF6A8A' : k < 0.5 ? '#FFD24A' : '#8AF0B0';
  rr(bx + 2, by + 2, Math.max(0, (bw - 4) * k), bh - 4, (bh - 4) / 2); ctx.fill();
  ctx.fillStyle = '#F0EAFF';
  ctx.fillText('ねんりょう', bx + bw + 8, HUD / 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFE24A';
  ctx.fillText('★ ' + G.star + '　おみやげ ' + G.bag + '/' + G.bagAll, VW / 2, HUD / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F0EAFF';
  const hp = clamp(G.hp, 0, 9);
  ctx.fillText('ひこうき ' + '✈'.repeat(hp), VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // すすみぐあい（日本 → 行き先）
  const pw = VW * 0.46, px = VW / 2 - pw / 2, py = HUD + 5;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  rr(px, py, pw, 6, 3); ctx.fill();
  const pk = clamp(G.d / G.trip.L, 0, 1);
  ctx.fillStyle = '#FF8FBB';
  rr(px, py, pw * pk, 6, 3); ctx.fill();
  ctx.save();
  ctx.translate(px + pw * pk, py + 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-4, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  bigText('日本', px - 16, py + 3, 10, 'rgba(255,255,255,0.85)', null);
  bigText(STAGES[G.si].city, px + pw + 22, py + 3, 10, 'rgba(255,255,255,0.85)', null);
}

// --- ゆうめいな 建もの --------------------------------------------------------------------
function drawMark(kind, s) {
  const S = 96 * s;
  ctx.lineJoin = 'round';
  if (kind === 'tower') {                                   // ソウルタワー
    ctx.fillStyle = '#6A7A5A';
    ctx.beginPath(); ctx.moveTo(-S * 0.9, S * 0.5); ctx.quadraticCurveTo(0, S * 0.1, S * 0.9, S * 0.5);
    ctx.lineTo(S * 0.9, S * 0.6); ctx.lineTo(-S * 0.9, S * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#D8DEEA';
    ctx.beginPath();
    ctx.moveTo(-S * 0.09, S * 0.22); ctx.lineTo(-S * 0.05, -S * 0.30);
    ctx.lineTo(S * 0.05, -S * 0.30); ctx.lineTo(S * 0.09, S * 0.22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9AC8E8';
    ctx.beginPath(); ctx.ellipse(0, -S * 0.34, S * 0.20, S * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E8709E';
    ctx.beginPath(); ctx.ellipse(0, -S * 0.44, S * 0.14, S * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#D8DEEA'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -S * 0.52); ctx.lineTo(0, -S * 0.78); ctx.stroke();
  } else if (kind === 'tp101') {                            // 台北101
    ctx.fillStyle = '#8FD0C0';
    for (let i = 0; i < 8; i++) {
      const w = S * (0.30 + i * 0.012), y = S * 0.5 - S * 0.145 * (i + 1);
      ctx.beginPath();
      ctx.moveTo(-w * 0.86, y + S * 0.145); ctx.lineTo(w * 0.86, y + S * 0.145);
      ctx.lineTo(w, y); ctx.lineTo(-w, y); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#6EB6A6';
    ctx.fillRect(-S * 0.26, S * 0.36, S * 0.52, S * 0.16);
    ctx.strokeStyle = '#D8DEEA'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -S * 0.68); ctx.lineTo(0, -S * 0.95); ctx.stroke();
  } else if (kind === 'wall') {                             // 万里の長城
    // ★ さいしょ 四角を ならべる だけで「ブロックの 山」に 見えた。
    //   かべを 1本の おびに して、上に ぎざぎざと 見はりの とうを のせる。
    const hy = function (t) { return S * (0.22 - Math.cos((t - 0.5) * 2.6) * 0.30); };
    ctx.fillStyle = '#8A9A70';                              // おかの みどり
    ctx.beginPath();
    ctx.moveTo(-S, S * 0.62);
    for (let t = 0; t <= 1.001; t += 0.05) ctx.lineTo(-S + 2 * S * t, hy(t) + S * 0.16);
    ctx.lineTo(S, S * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C8B898';                              // かべ 本体
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.05) ctx.lineTo(-S + 2 * S * t, hy(t));
    for (let t = 1; t >= -0.001; t -= 0.05) ctx.lineTo(-S + 2 * S * t, hy(t) + S * 0.20);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#A89878';                              // かべの かげ
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.05) ctx.lineTo(-S + 2 * S * t, hy(t) + S * 0.14);
    for (let t = 1; t >= -0.001; t -= 0.05) ctx.lineTo(-S + 2 * S * t, hy(t) + S * 0.20);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C8B898';                              // 上の ぎざぎざ
    for (let t = 0.02; t < 1; t += 0.075) {
      ctx.fillRect(-S + 2 * S * t - S * 0.026, hy(t) - S * 0.075, S * 0.052, S * 0.078);
    }
    for (const t of [0.22, 0.62]) {                         // 見はりの とう
      const x = -S + 2 * S * t, y = hy(t);
      ctx.fillStyle = '#B8A888';
      ctx.fillRect(x - S * 0.105, y - S * 0.30, S * 0.21, S * 0.34);
      ctx.fillStyle = '#8A7A5A';
      ctx.fillRect(x - S * 0.13, y - S * 0.36, S * 0.26, S * 0.07);
      ctx.fillStyle = '#5A4A38';
      ctx.fillRect(x - S * 0.035, y - S * 0.22, S * 0.07, S * 0.10);
    }
  } else if (kind === 'wat') {                              // ワット・アルン
    ctx.fillStyle = '#E8DCC0';
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.95); ctx.lineTo(S * 0.30, S * 0.45); ctx.lineTo(-S * 0.30, S * 0.45);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    for (let i = 0; i < 4; i++) {
      const y = -S * 0.55 + i * S * 0.26, w = S * (0.09 + i * 0.055);
      ctx.fillRect(-w, y, w * 2, S * 0.05);
    }
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#E8DCC0';
      ctx.beginPath();
      ctx.moveTo(sx * S * 0.55, -S * 0.30); ctx.lineTo(sx * S * 0.72, S * 0.45);
      ctx.lineTo(sx * S * 0.38, S * 0.45); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#9A8A6A';
    ctx.fillRect(-S * 0.85, S * 0.45, S * 1.7, S * 0.14);
  } else if (kind === 'taj') {                              // タージ・マハル
    // 白い 建ものなので、うすい 青の かげを 先に おいて かたちを 見せる
    ctx.fillStyle = '#BFD4E4';
    ctx.fillRect(-S * 0.54, -S * 0.02, S * 1.08, S * 0.56);
    ctx.beginPath(); ctx.arc(0, -S * 0.05, S * 0.37, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#F4F0E8';
    ctx.fillRect(-S * 0.5, -S * 0.05, S, S * 0.55);
    ctx.beginPath(); ctx.arc(0, -S * 0.05, S * 0.34, Math.PI, 0); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.62); ctx.lineTo(S * 0.05, -S * 0.40); ctx.lineTo(-S * 0.05, -S * 0.40);
    ctx.closePath(); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * S * 0.74 - S * 0.06, -S * 0.32, S * 0.12, S * 0.82);
      ctx.beginPath(); ctx.arc(sx * S * 0.74, -S * 0.32, S * 0.10, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#C8BCA8';
    ctx.beginPath(); ctx.arc(0, S * 0.5, S * 0.16, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#9AC8E8';
    ctx.fillRect(-S * 0.95, S * 0.5, S * 1.9, S * 0.12);
  } else if (kind === 'pyramid') {                          // ピラミッド
    const ps = [[-0.45, 0.95, 0.62], [0.42, 0.75, 0.48], [0.95, 0.5, 0.32]];
    for (const p of ps) {
      ctx.fillStyle = '#E8C88A';
      ctx.beginPath();
      ctx.moveTo(p[0] * S, S * 0.5 - p[1] * S);
      ctx.lineTo(p[0] * S + p[2] * S, S * 0.5);
      ctx.lineTo(p[0] * S - p[2] * S, S * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D4AF6E';
      ctx.beginPath();
      ctx.moveTo(p[0] * S, S * 0.5 - p[1] * S);
      ctx.lineTo(p[0] * S + p[2] * S, S * 0.5);
      ctx.lineTo(p[0] * S, S * 0.5);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#C8A870';
    ctx.fillRect(-S, S * 0.5, S * 2, S * 0.12);
  } else if (kind === 'colos') {                            // コロッセオ
    ctx.fillStyle = '#D8C8A8';
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.85, S * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B8A488';
    ctx.beginPath(); ctx.ellipse(0, -S * 0.06, S * 0.62, S * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8A7A60';
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 12; i++) {
        const a = Math.PI + i / 11 * Math.PI;
        const x = Math.cos(a) * S * 0.74, y = Math.sin(a) * S * 0.46 + S * 0.12 + r * S * 0.20;
        if (y > S * 0.5) continue;
        ctx.beginPath(); ctx.arc(x, y, S * 0.055, Math.PI, 0); ctx.fill();
        ctx.fillRect(x - S * 0.055, y, S * 0.11, S * 0.10);
      }
    }
  } else if (kind === 'eiffel') {                           // エッフェル塔
    ctx.strokeStyle = '#9A7A5A'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-S * 0.55, S * 0.55); ctx.quadraticCurveTo(-S * 0.14, -S * 0.2, -S * 0.05, -S * 0.9);
    ctx.moveTo(S * 0.55, S * 0.55); ctx.quadraticCurveTo(S * 0.14, -S * 0.2, S * 0.05, -S * 0.9);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-S * 0.34, S * 0.12); ctx.lineTo(S * 0.34, S * 0.12);
    ctx.moveTo(-S * 0.17, -S * 0.32); ctx.lineTo(S * 0.17, -S * 0.32);
    ctx.stroke();
    ctx.fillStyle = '#9A7A5A';
    ctx.beginPath();
    ctx.moveTo(-S * 0.55, S * 0.16); ctx.lineTo(S * 0.55, S * 0.16);
    ctx.lineTo(S * 0.40, S * 0.02); ctx.lineTo(-S * 0.40, S * 0.02); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -S * 0.9, S * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8A9A6A';
    ctx.fillRect(-S, S * 0.55, S * 2, S * 0.1);
  } else if (kind === 'liberty') {                          // 自由の女神
    ctx.fillStyle = '#7ACCB8';
    ctx.beginPath();
    ctx.moveTo(-S * 0.26, S * 0.5); ctx.lineTo(-S * 0.12, -S * 0.28);
    ctx.lineTo(S * 0.12, -S * 0.28); ctx.lineTo(S * 0.26, S * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -S * 0.38, S * 0.11, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.86 + i * Math.PI * 0.24;
      ctx.beginPath();
      ctx.moveTo(0, -S * 0.38);
      ctx.lineTo(Math.cos(a) * S * 0.26, -S * 0.38 + Math.sin(a) * S * 0.26);
      ctx.lineWidth = 4; ctx.strokeStyle = '#7ACCB8'; ctx.stroke();
    }
    ctx.strokeStyle = '#7ACCB8'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(S * 0.06, -S * 0.22); ctx.lineTo(S * 0.30, -S * 0.72); ctx.stroke();
    ctx.fillStyle = '#FFD24A';
    circle(S * 0.33, -S * 0.80, S * 0.09); ctx.fill();
    ctx.fillStyle = '#9A8A70';
    ctx.fillRect(-S * 0.40, S * 0.5, S * 0.8, S * 0.22);
  } else {                                                  // オペラハウス
    // ★ さいしょ 平たい かまぼこを ならべて いて、まったく それらしく なかった。
    //   **かたむいた かい がら**を かさねて、うしろに 高いのを おく。
    ctx.fillStyle = '#7EC0E8';                              // 海
    ctx.fillRect(-S, S * 0.44, S * 2, S * 0.30);
    ctx.fillStyle = '#C8BCA8';                              // 台
    ctx.beginPath();
    ctx.moveTo(-S * 0.92, S * 0.46); ctx.lineTo(S * 0.92, S * 0.46);
    ctx.lineTo(S * 0.80, S * 0.30); ctx.lineTo(-S * 0.80, S * 0.30);
    ctx.closePath(); ctx.fill();
    const shells = [[-0.34, 0.90, 1.0], [-0.02, 1.14, 1.0], [0.30, 0.86, 1.0],
                    [0.56, 0.56, 0.8], [-0.60, 0.54, 0.8]];
    for (const sh of shells) {
      const bx = sh[0] * S, hgt = sh[1] * S, w = 0.40 * S * sh[2];
      ctx.fillStyle = '#F6F4EE';
      ctx.beginPath();
      ctx.moveTo(bx - w, S * 0.32);
      ctx.quadraticCurveTo(bx - w * 0.75, S * 0.32 - hgt, bx + w * 0.55, S * 0.32 - hgt * 0.30);
      ctx.quadraticCurveTo(bx + w * 0.30, S * 0.32 - hgt * 0.05, bx + w * 0.30, S * 0.32);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#D6D2C8';                            // かげ の すじ
      ctx.beginPath();
      ctx.moveTo(bx - w, S * 0.32);
      ctx.quadraticCurveTo(bx - w * 0.80, S * 0.32 - hgt * 0.85, bx - w * 0.18, S * 0.32 - hgt * 0.52);
      ctx.quadraticCurveTo(bx - w * 0.50, S * 0.32 - hgt * 0.22, bx - w * 0.40, S * 0.32);
      ctx.closePath(); ctx.fill();
    }
  }
}

// --- タイトル ----------------------------------------------------------------------------
function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#6EC6F5'); g.addColorStop(0.6, '#BFE9FF'); g.addColorStop(1, '#FFE9C8');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = '#4FA8D8';
  ctx.fillRect(-VW, VH * 0.86, VW * 3, VH);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 210 + G.t * 22) % (VW + 260)) - 130;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    circle(x, 60 + (i % 3) * 26, 20); ctx.fill();
    circle(x + 22, 65 + (i % 3) * 26, 15); ctx.fill();
    circle(x - 20, 66 + (i % 3) * 26, 13); ctx.fill();
  }

  bigText('りなの', VW / 2, 22, 17, '#2A6A9A', null);
  bigText('せかい旅行', VW / 2, 52, fitSize('せかい旅行', VW * 0.38, 36), '#1E5A8A', '#FFFFFF');
  const D = DF();
  bigText('ひこうきで 10の 国へ！ よけて・あつめて・そっと ちゃくりく',
          VW / 2, 84, fitSize('ひこうきで 10の 国へ！ よけて・あつめて・そっと ちゃくりく', VW * 0.9, 15), '#2A5A7A', null);
  bigText('いま ＝ ' + D.name + '：' + D.tip, VW / 2, 102,
          fitSize('いま ＝ ' + D.name + '：' + D.tip, VW * 0.9, 13), '#1E5A8A', null);

  ctx.save();
  ctx.translate(VW * 0.10, VH * 0.70);
  ctx.rotate(Math.sin(G.t * 1.6) * 0.10);
  ctx.scale(0.9, 0.9);
  drawPlane(0, 0, 0, false);
  ctx.restore();

  const names = STAGES.map(function (s) { return s.c; });
  const clear = STAGES.map(function (s, i) { return !!save.clear['s' + i]; });
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 120, startStage, '#FFD24A');

  bigText('むずかしさ', VW / 2, y + 12, 13, 'rgba(20,60,90,0.8)', null);
  const dw = Math.min(150, (VW - 60) / 3), dh = 36;
  DIFF.forEach(function (d, i) {
    const bx = VW / 2 - (dw * 3 + 20) / 2 + i * (dw + 10);
    const on = i === (save.diff | 0);
    const b = button(bx, y + 24, dw, dh, function () { save.diff = i; storeSave(); });
    drawButton(b, d.name, on ? d.col : '#A8BCCC', on ? '#241C34' : 'rgba(30,50,70,0.8)');
    if (on) {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      rr(b.x - 3, b.y - 3, dw + 6, dh + 6, (dh + 6) * 0.28); ctx.stroke();
    }
  });

  const sw = Math.min(150, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 70, sw, 36, function () { G.screen = 'howto'; }),
             'あそびかた', '#FFE0B0');
  drawButton(button(VW / 2 + 8, y + 70, sw, 36, function () { G.screen = 'passport'; }),
             'パスポート', '#FF9ABF');
  bigText('とんだ きょり ぜんぶで ' + save.km + ' キロ　あそんだ かず ' + save.plays,
          VW / 2, VH - 12, 13, 'rgba(20,60,90,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,60,90,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

// --- パスポート（スタンプの ページ） --------------------------------------------------------
function drawPassport() {
  ctx.fillStyle = '#1E3A5A';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = '#F4EFE2';
  rr(VW * 0.06, HUD + 6, VW * 0.88, VH - HUD - 62, 12); ctx.fill();
  bigText('パスポート', VW / 2, HUD + 26, 22, '#1E3A5A');
  const n = STAGES.length, cols = VW > 820 ? 5 : 5;
  const cw = (VW * 0.84) / cols, ch = 74;
  for (let i = 0; i < n; i++) {
    const cx = VW * 0.08 + cw * (i % cols) + cw / 2;
    const cy = HUD + 62 + Math.floor(i / cols) * ch + ch / 2;
    ctx.strokeStyle = 'rgba(30,58,90,0.18)'; ctx.lineWidth = 1;
    rr(cx - cw / 2 + 4, cy - ch / 2 + 3, cw - 8, ch - 6, 6); ctx.stroke();
    if (save.stamp['s' + i]) {
      ctx.save();
      ctx.translate(cx, cy - 6);
      ctx.rotate(((i * 37) % 20 - 10) * 0.014);
      ctx.strokeStyle = '#D8465A'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
      bigText(STAGES[i].c, 0, -4, fitSize(STAGES[i].c, 38, 11), '#D8465A', null);
      bigText('OK', 0, 9, 9, '#D8465A', null);
      ctx.restore();
      bigText(STAGES[i].city, cx, cy + 28, fitSize(STAGES[i].city, cw - 12, 11), '#1E3A5A', null);
    } else {
      bigText('？', cx, cy - 6, 26, 'rgba(30,58,90,0.25)', null);
      bigText(STAGES[i].c, cx, cy + 28, fitSize(STAGES[i].c, cw - 12, 11), 'rgba(30,58,90,0.45)', null);
    }
  }
  const got = STAGES.filter(function (s, i) { return save.stamp['s' + i]; }).length;
  bigText('スタンプ ' + got + ' / ' + n + '　とんだ きょり ' + save.km + ' キロ',
          VW / 2, VH - 62, 15, '#1E3A5A', null);
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 46, bw, 38, function () { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function drawHowto() {
  ctx.fillStyle = '#E8F4FF';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 30, 24, '#1E5A8A');
  const lines = [
    '① 画面の どこでも いいので ゆびを 置いて、そこから **上下に すべらせる**',
    '　 パソコンなら ↑ ↓',
    '② ★を あつめる。3つ ならんで いる ので、なぞる ように とると たくさん とれる',
    '③ ピンクの かばんは **おみやげ**。ぜんぶ あつめると スコアが 大きく のびる',
    '④ みどりの タンクで ねんりょうが ふえる。0 に なると 引きかえし',
    '⑤ **みどりの おび（おいかぜ）**に 入ると はやく なって、ねんりょうも ほとんど へらない',
    '⑥ とり・雲・気球・かみなり・ほかの ひこうき に ぶつかると ひこうきが へる',
    '⑦ さいごは くうこう。**みどりの おびの 高さ**で まって いると ちゃくりく せいこう',
    '⑧ ついたら その 国の 建ものと、パスポートに スタンプが もらえる',
  ];
  lines.forEach(function (s, i) {
    bigText(s.replace(/\*\*/g, ''), VW / 2, 58 + i * 28,
            fitSize(s.replace(/\*\*/g, ''), VW * 0.94, 15), '#24506E', null);
  });
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 44, bw, 38, function () { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'passport') drawPassport();
  else drawPlay();
}

// ★ 画面ぜんぶが そうさの ばしょ（スティックの 絵は 出さない）。
arcadeStart({ update: update, draw: draw, zone: 'all' });
