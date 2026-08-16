// ゆいの なかまパレード
//
// ★ もとに した あそび … 道を まっすぐ 走りながら、まえに ならんだ
//   **2つ（ときどき 3つ）の ゲート**の どちらを 通るかを えらぶ。
//   ゲートには「＋10」「×2」「−5」「÷2」と 書いて あって、
//   通った ほうの ぶんだけ **なかまが ふえたり へったり** する。
//   さいごは あつめた なかま ぜんぶで もふもふ大王を くすぐる。
//
// ★ おもしろさの しん は **「×2」と「＋30」の どっちが 得か**。
//   なかまが 10人の ときは ＋30（→40）が 得。50人の ときは ×2（→100）が 得。
//   だから 「いまの 人数を 見て きめる」ことに なる。
//   ゲートの 数は その ときの 人数から 作って いる ので、
//   どの めんでも この まよいが おきる。
//
// ★ そうさは 1つだけ。**画面の どこでも いいので ゆびを 置いて 左右に すべらせる**。
//   ゆびの ある ほうへ パレードが よっていく（ゆびの ばしょが そのまま ばしょ）。
//   パソコンなら ← →。
//
// ★ 絵は ぜんぶ canvas、音は ぜんぶ WebAudio（画像・音の ファイルは 使わない）。
//   おく行きは 「z が とおいほど 小さく」の 1つの 式だけで 出して いる。

'use strict';

const GAME_VER = 2;
const HUD = 32;

// --- おく行き（にせ 3D） ----------------------------------------------------------------
//
//   z = 0    … いちばん 手まえ（ゆいが いる ところ）
//   z = とおい … 画面の 上のほう、小さく なる
//
//   ちぢみぐあい sc(z) = FOC / (FOC + z)。これ 1つで 大きさも 高さも きまる。
//
// ★ 「見おろす 角度が ちがう」と 言われた。もとの ゲームは
//   **カメラが もっと 高くて、もっと 下を むいて** いる:
//     ・地へいせんが 画面の ずっと 上（そらは ほんの ひとすじ）
//     ・道が 画面の 下いっぱいに ひろがって、りょうはしから はみ出す
//     ・その ぶん 道が とおくまで 見えて、おく行きが 出る
//   カメラの かたむきは この 3つの すう字で きまる:
//     hzY   … 地へいせんの 高さ（上げる ほど 見おろす）
//     nearY … いちばん 手まえの 高さ
//     ROAD_K… 手まえでの 道の はば
//   （y も x も sc(z) に 正比れい する ので、これは ほんものの
//     カメラを かたむけた ときと おなじ 形に なる）
const FOC = 6.0;                 // 小さいほど おく行きが きつく なる
const Z_FAR = 80;                // ここより 先は 描かない
const ROAD_K = 0.52;             // z=0 での 道の はば（画面よこの なんばい か）
// ★ ゲートは **手まえの 2つ しか 描かない**。
//   3つめ 4つめまで 描いたら、とおい ゲートが 手まえの ゲートの すぐ 上に
//   かさなって、すう字が 「+62+20」の ように つぶれて 読めなく なった。
const GATE_SHOW = 2;

function hzY() { return HUD + 56; }              // 地へいせん（前は +92。上げて 見おろしに）
function nearY() { return VH * 0.87; }           // z=0 の 高さ
function sc(z) { return FOC / (FOC + Math.max(0, z)); }
function zy(z) { const k = sc(z); return hzY() + (nearY() - hzY()) * k; }
function zx(x, z) { return VW / 2 + x * (VW * ROAD_K) * sc(z); }
// ★ 道は 地へいせんを ちょう点と する 三角。
//   y が 下がる ほど はばは 正比れいで ひろがる ので、
//   画面の いちばん 下まで まっすぐ のばせる（z=0 で 切ると すきまが できた）。
function halfAtY(y) { return VW * ROAD_K * (y - hzY()) / (nearY() - hzY()); }

// --- はしる はやさ など ------------------------------------------------------------------
const SPEED = 15.0;              // 1びょうに すすむ z
const MOVE_K = 11.0;             // ゆびに ついていく はやさ
const START_N = 5;               // さいしょの なかま
const N_MAX = 99999;
const DRAW_MAX = 300;            // 画面に 描く なかまの 上げん（多すぎると おもい）
// ★ もとの ゲームは 行れつが **道の おくまで ずーっと つづいて** いる。
//   さいしょ ZK=2.4 に して いたら、手まえに 横1れつの かべの ように
//   ならぶ だけで、おく行きが まったく 出て いなかった。
//   z がわに 大きく のばして、とおくの 子ほど 小さく 見えるように する。
const BLOB_SP = 0.043;           // なかま どうしの あいだ（よこ）
const BLOB_ZK = 6.6;             // z がわの のばしぐあい（大きいほど おくへ つづく）

// --- めん --------------------------------------------------------------------------------
//
//   gates … ゲートの かず
//   gap   … ゲートと ゲートの あいだ の z
//   obst  … じゃまが 出る わりあい
//   need  … もふもふ大王の つよさ（うまく 通った ときの 人数の なんばい か）
//           0.50 なら「半分の できで ちょうど」ぐらい
const STAGES = [
  { name: 'はなの みち',     gates: 6,  gap: 17, obst: 0.00, need: 0.38, cells3: 0.00, bg: 'field' },
  { name: 'ぷかぷか こうえん', gates: 7,  gap: 17, obst: 0.20, need: 0.44, cells3: 0.00, bg: 'field' },
  { name: 'にじの さか',      gates: 8,  gap: 16, obst: 0.30, need: 0.50, cells3: 0.15, bg: 'rainbow' },
  { name: 'わたあめの もり',   gates: 8,  gap: 16, obst: 0.40, need: 0.55, cells3: 0.20, bg: 'forest' },
  { name: 'みずたまり ロード',  gates: 9,  gap: 15, obst: 0.50, need: 0.60, cells3: 0.25, bg: 'forest' },
  { name: 'キャンディヒル',    gates: 9,  gap: 15, obst: 0.55, need: 0.65, cells3: 0.30, bg: 'candy' },
  { name: 'ほしぞら どおり',   gates: 10, gap: 15, obst: 0.60, need: 0.70, cells3: 0.35, bg: 'night' },
  { name: 'ゆきの はらっぱ',   gates: 10, gap: 14, obst: 0.65, need: 0.73, cells3: 0.40, bg: 'snow' },
  { name: 'ケーキの しろ',     gates: 11, gap: 14, obst: 0.70, need: 0.76, cells3: 0.45, bg: 'candy' },
  { name: 'もふもふの おしろ',  gates: 12, gap: 14, obst: 0.75, need: 0.79, cells3: 0.50, bg: 'night' },
];

// --- むずかしさ（3だんかい） ---------------------------------------------------------------
//
// ★ どうくつ探検で「むずかしさを えらばせて」と 言われた ので、
//   はじめから 3つ 用意する。かえるのは 大王の つよさ と じゃまの いたさ、
//   そして ゲートの わかりやすさ。
const DIFF = [
  { name: 'やさしい',  col: '#8AF0B0', bossK: 0.62, hurtK: 0.5, speedK: 0.86, hint: 1,
    tip: 'いい ほうの ゲートに ★が つく。大王も よわめ' },
  { name: 'ふつう',    col: '#FFD24A', bossK: 1.00, hurtK: 1.0, speedK: 1.00, hint: 0,
    tip: 'じぶんで えらぶ。「×2」と「＋いくつ」を くらべよう' },
  { name: 'むずかしい', col: '#FF9A6A', bossK: 1.18, hurtK: 1.5, speedK: 1.14, hint: 0,
    tip: 'はやい・大王が つよい・じゃまも いたい' },
];
function DF() { return DIFF[clamp(save.diff | 0, 0, DIFF.length - 1)]; }

const SAVE_KEY = 'parade.save.v1';
const save = { clear: {}, best: {}, plays: 0, friends: 0, diff: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.friends)) save.friends = s.friends;
  if (Number.isFinite(s.diff)) save.diff = clamp(s.diff | 0, 0, DIFF.length - 1);
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- いろ --------------------------------------------------------------------------------
//
// ★ 「かわいい」ように、こい色を つかわず パステルで そろえる。
//   なかまは 6色を じゅんぐりに つかう ので、かたまりが カラフルに 見える。
const PAL = ['#FFB3C7', '#FFD9A0', '#B8E4FF', '#D9C2FF', '#A8ECC8', '#FFF0A8'];
const PAL_D = ['#E88AA6', '#E8B878', '#8FC4E8', '#B49BE8', '#7FCCA6', '#E8D678'];
const SKY = {
  field:   ['#BFE9FF', '#FFF0D8'], rainbow: ['#CFE6FF', '#FFE0F0'],
  forest:  ['#CDEBFF', '#EAFBE0'], candy:   ['#FFD9EC', '#FFF3D8'],
  night:   ['#3A2E6E', '#9B7FD4'], snow:    ['#D8ECFF', '#FFFFFF'],
};
const GROUND = {
  field:   ['#A8E6A1', '#94DC90'], rainbow: ['#B8E8B0', '#A2DE9C'],
  forest:  ['#8FD98A', '#7CCB79'], candy:   ['#9FE0C8', '#8AD4BA'],
  night:   ['#4A4080', '#3E3670'], snow:    ['#EAF4FF', '#DCEBFA'],
};
const ROAD_C = {
  field:   ['#FFF2D8', '#FFE7C0'], rainbow: ['#FFF4E4', '#FFE9D0'],
  forest:  ['#FFF0DC', '#FFE4C4'], candy:   ['#FFF6E8', '#FFE0F0'],
  night:   ['#E8E0FF', '#D6CCF6'], snow:    ['#FFFFFF', '#EFF6FF'],
};

// --- 音 ----------------------------------------------------------------------------------
function sfxGood() { if (A.ctx) bleep(anow(), [76, 83, 88], 0.05, 0.10, 0.13); }
function sfxBig()  { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88], 0.04, 0.10, 0.14); kick(t, 0.5); } }
function sfxBad()  { if (A.ctx) { const t = anow(); bleep(t, [64, 59, 55], 0.06, 0.11, 0.12); nz(t, 0.12, 0.08, 200, 1300); } }
function sfxBump() { if (A.ctx) { const t = anow(); nz(t, 0.10, 0.09, 150, 1100); tone(t, 52, 0.10, 0.06, 'triangle', null, 44); } }
function sfxHeart(){ if (A.ctx) bleep(anow(), [88, 93], 0.04, 0.08, 0.11); }
// ★ さいしょ 0.035 に して いたら、はかって みると RMS 0.0014 で
//   まったく きこえて いなかった。もう少し 大きく、そして ゆっくりに。
function sfxStep() { if (A.ctx) nz(anow(), 0.06, 0.17, 200, 1000); }
function sfxTickle(){ if (A.ctx) { const t = anow(); tone(t, 84 + Math.random() * 10, 0.05, 0.05, 'square'); } }
function sfxWin()  {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.08, 0.18, 0.15);
  kick(t, 0.7); kick(t + 0.48, 0.7);
}
function sfxLose() { if (A.ctx) { const t = anow(); bleep(t, [72, 67, 63, 58], 0.12, 0.22, 0.13); } }
function sfxGo()   { if (A.ctx) bleep(anow(), [69, 69, 76], 0.16, 0.14, 0.14); }

// --- BGM（かわいい 3びょうしの ループ） ------------------------------------------------------
//
// ★ ふつうの 8ビートだと 行しんに ならない ので、
//   「ズン・タ・タ」の **行しんきょくの リズム**に して ある。
//   おわりが 近づくと BG.hot が 上がって、はやく・にぎやかに なる。
const BG = { on: false, t: 0, bar: 0, hot: 0, bpm: 132 };
const BG_ROOT = [57, 57, 59, 60, 62, 64, 64, 62, 60, 57];       // めんごとの キー
const MEL = [
  [0, 4, 7, 4, 9, 7, 4, 0], [0, 7, 12, 7, 9, 7, 4, 2],
  [4, 7, 9, 12, 9, 7, 4, 0], [0, 4, 7, 12, 11, 9, 7, 4],
];
function bgmStartP() { audioStart(); if (A.ctx) { BG.on = true; BG.t = anow() + 0.06; BG.bar = 0; } }
function bgmStopP() { BG.on = false; }
function bgmPumpP() {
  if (!BG.on || !A.ctx) return;
  const spb = 60 / (BG.bpm + BG.hot * 22);
  while (BG.t < anow() + 0.7) schedBar(BG.t, spb), BG.t += spb * 4, BG.bar++;
}
function schedBar(t0, spb) {
  const root = BG_ROOT[G.si % BG_ROOT.length] - 12;
  const mel = MEL[BG.bar % MEL.length];
  const chord = [0, 5, 7, 5][BG.bar % 4];
  // ズン・タ・タ（行しんきょく）
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * spb;
    if (b % 2 === 0) { kick(t, 0.62); tone(t, root + chord, spb * 0.45, 0.075, 'triangle', A.mus); }
    else {
      nz(t, 0.05, 0.045 + BG.hot * 0.02, 2200, 7000, A.mus);
      tone(t, root + chord + 12, spb * 0.22, 0.045, 'square', A.mus);
      tone(t, root + chord + 16, spb * 0.22, 0.035, 'square', A.mus);
    }
  }
  // うわもの
  for (let i = 0; i < 8; i++) {
    const t = t0 + i * spb * 0.5;
    tone(t, root + 24 + mel[i] + chord, spb * 0.38, 0.052 + BG.hot * 0.02, 'square', A.mus);
  }
}

// --- さいころ（おなじ めんは いつも おなじ 道） --------------------------------------------
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

// --- ゲートの けいさん -------------------------------------------------------------------
function applyOp(n, op, v) {
  if (op === '+') return Math.min(N_MAX, n + v);
  if (op === '-') return Math.max(1, n - v);
  if (op === 'x') return Math.min(N_MAX, n * v);
  return Math.max(1, Math.floor(n / v));                        // '/'
}
function opLabel(op, v) {
  return (op === '+' ? '+' : op === '-' ? '−' : op === 'x' ? '×' : '÷') + v;
}
function opGood(op) { return op === '+' || op === 'x'; }

// --- 道を 作る ---------------------------------------------------------------------------
//
// ★ ゲートの すう字は **その ときの 人数から** 作る。
//   「いつも ＋20」だと、人数が 200人に なった とたん ぜんぶ どうでも よく なる。
//   est（うまく 通った ときの 人数）を 作りながら 進めて、
//   ×2 と くらべて ちょうど まよう ぐらいの ＋ を 出す。
function buildTrack(si) {
  const st = STAGES[si];
  const D = DF();
  const rnd = rng(0x9A11 + si * 7717);
  const items = [];
  let z = 26, est = START_N;

  for (let i = 0; i < st.gates; i++) {
    // ★ ゲートの しゅるいは **じゅんばんに** 出す（さいころ まかせに しない）。
    //   まかせて いた ときは、コース9が 9563人、コース10が 2948人 に なって、
    //   先に すすんだ ほうが 人数が すくない という へんな ことに なった。
    //   じゅんばんなら 「ゲートの かず が 多い コース ＝ 人数も 多い」に なる。
    const tn = GATE_ORDER[(i + si) % GATE_ORDER.length];
    const three = tn === 'A' && rnd() < st.cells3 && est > 12;
    const cells = three ? makeCells3(est, rnd) : makeCells2(est, rnd, tn);

    // どれが いちばん 得か（やさしいの ★ と、大王の つよさに つかう）
    let bi = 0, bv = -1;
    for (let k = 0; k < cells.length; k++) {
      const v = applyOp(est, cells[k].op, cells[k].val);
      if (v > bv) { bv = v; bi = k; }
    }
    for (let k = 0; k < cells.length; k++) cells[k].best = (k === bi);

    const n = cells.length;
    for (let k = 0; k < cells.length; k++) {
      cells[k].x0 = -1 + 2 * k / n;
      cells[k].x1 = -1 + 2 * (k + 1) / n;
    }
    items.push({ t: 'gate', z: z, cells: cells, done: false, flash: 0 });
    est = bv;

    // じゃま と ハート は ゲートの あいだに おく
    const gap = st.gap;
    if (i < st.gates - 1) {
      if (rnd() < st.obst) {
        // ★ じゃまは **道の はんぶんだけ** ふさぐ。ぜんぶ ふさぐと よけようが ない。
        const left = rnd() < 0.5;
        const w = 0.55 + rnd() * 0.30;
        items.push({
          t: 'wall', z: z + gap * 0.5,
          x0: left ? -1 : 1 - w, x1: left ? -1 + w : 1,
          cost: Math.max(2, Math.round(est * 0.20 * D.hurtK)),
          done: false, spin: rnd() * 6,
        });
      }
      if (rnd() < 0.45) {
        items.push({
          t: 'heart', z: z + gap * (0.25 + rnd() * 0.5),
          x: (rnd() * 2 - 1) * 0.8,
          val: Math.max(2, Math.round(est * 0.10)), done: false,
        });
      }
    }
    z += gap + rnd() * 4;
  }

  const bossZ = z + 18;
  // ★ 上げんを つけて おかないと、むずかしいで
  //   「かんぺきに 通っても とどかない」大王が できて しまう。
  const hp = Math.max(10, Math.round(Math.min(est * 0.90, est * st.need * D.bossK)));
  return { items: items, bossZ: bossZ, hp: hp, est: est };
}

// 2つの ゲート。だいたい 「×」対「＋」に して まよわせる。
//
// ★ さいしょ 「×3」も 入れて いたら、コース10の さいごが 5万人に なった。
//   すう字が 大きすぎて 小学生には 読めない し、HUD にも 入らない。
//   いまは **1つの ゲートで だいたい 1.7ばい**に なるように そろえて ある。
//   コース1 で 150人、コース10 で 4000人ぐらい。
// A … ×2 と ＋（この ゲームの しん。10人なら ＋、100人なら × が 得）  → やく 2.05ばい
// B … ＋どうし（よく 見れば わかる）                                  → やく 1.47ばい
// C … ＋ と −（えらびまちがえると へる）                              → やく 1.45ばい
// D … ×2 と ÷2（いちばん はっきり して いる）                          → 2.00ばい
const GATE_ORDER = ['A', 'B', 'C', 'A', 'B', 'D'];

function makeCells2(est, rnd, tn) {
  if (tn === 'A') {
    const k = 0.85 + rnd() * 0.40;                 // 0.85〜1.25
    return sh([{ op: 'x', val: 2 }, { op: '+', val: Math.max(3, Math.round(est * k)) }], rnd);
  }
  if (tn === 'B') {
    const a = Math.max(2, Math.round(est * (0.12 + rnd() * 0.12)));
    const b = Math.max(a + 2, Math.round(est * (0.40 + rnd() * 0.14)));
    return sh([{ op: '+', val: a }, { op: '+', val: b }], rnd);
  }
  if (tn === 'C') {
    const good = Math.max(3, Math.round(est * (0.38 + rnd() * 0.14)));
    const bad = Math.max(3, Math.round(est * (0.3 + rnd() * 0.3)));
    return sh([{ op: '+', val: good }, { op: '-', val: bad }], rnd);
  }
  return sh([{ op: 'x', val: 2 }, { op: '/', val: 2 }], rnd);
}

// 3つの ゲート。まん中が わなの ことも ある。
function makeCells3(est, rnd) {
  const a = { op: 'x', val: 2 };
  const b = { op: '+', val: Math.max(4, Math.round(est * (0.80 + rnd() * 0.5))) };
  const c = rnd() < 0.5
    ? { op: '/', val: 2 }
    : { op: '-', val: Math.max(3, Math.round(est * (0.3 + rnd() * 0.3))) };
  return sh([a, b, c], rnd);
}
function sh(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// --- ゲームの なかみ ---------------------------------------------------------------------
const G = {
  screen: 'title', t: 0,
  si: 0, track: null,
  n: START_N, x: 0, tx: 0, run: 0,
  z: 0,                      // すすんだ きょり
  pops: [], parts: [],
  msg: '', msgT: 0,
  phase: 'run',              // 'ready' | 'run' | 'boss' | 'end'
  readyT: 0,
  bossHp: 0, bossMax: 0, bossT: 0, bossShake: 0,
  over: false, win: false, best: 0,
};

function startStage(i) {
  audioStart();
  G.si = i;
  G.track = buildTrack(i);
  G.n = START_N; G.x = 0; G.tx = 0; G.z = 0; G.run = 0;
  G.pops.length = 0; G.parts.length = 0;
  G.phase = 'ready'; G.readyT = 1.6;
  G.bossMax = G.track.hp; G.bossHp = G.track.hp; G.bossT = 0; G.bossShake = 0;
  G.over = false; G.win = false;
  G.msg = ''; G.msgT = 0;
  G.best = save.best['s' + i] || 0;
  save.plays++; storeSave();
  BG.hot = 0;
  bgmStartP();
  G.screen = 'play';
}

function pop(text, col, big) {
  G.pops.push({ text: text, col: col, t: 0, big: !!big, x: G.x });
}
function burst(x, z, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 0.3 + Math.random() * 0.9;
    G.parts.push({ x: x, z: z, vx: Math.cos(a) * v * 0.5, vy: -1.2 - Math.random() * 1.6,
                   y: 0, col: col, t: 0, life: 0.7 + Math.random() * 0.3 });
  }
}

// --- まいコマ -----------------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  bgmPumpP();
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; return; }
  if (G.msgT > 0) G.msgT -= dt;
  if (G.bossShake > 0) G.bossShake = Math.max(0, G.bossShake - dt * 30);

  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t += dt;
    if (G.pops[i].t > 1.0) G.pops.splice(i, 1);
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 5.5 * dt;
    if (q.t > q.life) G.parts.splice(i, 1);
  }

  if (G.over) { IN.taps.length = 0; IN.fireTap = false; return; }

  // --- そうさ（ゆびの ばしょが そのまま ばしょ） ---
  if (G.phase === 'run' || G.phase === 'ready') {
    if (IN.hold) {
      // ★ 画面の はしまで ゆびを のばさなくても はしに 行けるように 少し ひろげる。
      G.tx = clamp((IN.x - VW / 2) / (VW * 0.32), -1, 1);
    }
    const k = keyDir();
    if (k === 'l') G.tx = clamp(G.tx - dt * 2.4, -1, 1);
    if (k === 'r') G.tx = clamp(G.tx + dt * 2.4, -1, 1);
    G.x += (G.tx - G.x) * Math.min(1, dt * MOVE_K);
  }

  if (G.phase === 'ready') {
    G.readyT -= dt;
    if (G.readyT <= 0) { G.phase = 'run'; sfxGo(); G.msg = 'スタート！'; G.msgT = 1.0; }
    IN.taps.length = 0; IN.fireTap = false;
    return;
  }

  if (G.phase === 'run') updateRun(dt);
  else if (G.phase === 'boss') {
    // ★ 大王は まん中に いる。よこに ずれた まま たたかうと
    //   なかまが 画面の はしで くすぐって いるように 見えた。
    G.tx = 0;
    G.x += (0 - G.x) * Math.min(1, dt * 3.2);
    updateBoss(dt);
  }

  IN.taps.length = 0;
  IN.fireTap = false;
}

// かたまりの さきあたまが、ゆいから どれだけ 先に あるか
function crowdDepth() {
  const n = Math.max(1, Math.round(G.n));
  const m = Math.min(n, DRAW_MAX);
  const rk = n > DRAW_MAX ? Math.pow(n / DRAW_MAX, 0.17) : 1;
  return BLOB_SP * Math.sqrt(m) * rk * 2 * BLOB_ZK * 0.55 + 0.30;
}

function updateRun(dt) {
  const tr = G.track, D = DF();
  const v = SPEED * D.speedK;
  G.z += v * dt;
  G.run += v * dt;

  // 足音
  if (Math.floor(G.run / 3.2) !== Math.floor((G.run - v * dt) / 3.2)) sfxStep();

  // おわりに 近づくと BGM が もりあがる
  BG.hot = clamp((G.z - (tr.bossZ - 40)) / 40, 0, 1);

  // ★ ゲートは **かたまりの さきあたま**が くぐった ときに きく。
  //   まん中で きくと「もう くぐったのに かずが かわらない」と 見えた。
  //   ただし 行れつを おくまで のばした ら、なかまが 600人の とき
  //   さきあたまが 5ユニット（0.3びょう）も 先に なって、
  //   「まだ ゲートの 手まえなのに もう きまって いる」に なった。
  //   ロボットの てすとで むずかしいの おわり3コースが 0勝に なった ので、
  //   さきあたまは **2.2ユニットまで**に かぎる。
  const front = G.z + Math.min(crowdDepth(), 2.2);

  for (const it of tr.items) {
    if (it.done) continue;
    if (it.t === 'gate') {
      if (front < it.z) continue;
      it.done = true; it.flash = 1;
      let cell = null;
      for (const c of it.cells) if (G.x >= c.x0 && G.x < c.x1) cell = c;
      if (!cell) cell = G.x < 0 ? it.cells[0] : it.cells[it.cells.length - 1];
      const before = G.n;
      G.n = applyOp(G.n, cell.op, cell.val);
      const d = G.n - before;
      it.tookIdx = it.cells.indexOf(cell);
      if (d > 0) {
        pop('+' + d, '#FF6FA8', d >= before);
        if (d >= before) sfxBig(); else sfxGood();
        save.friends += d; storeSave();
        burst(G.x, G.z + crowdDepth() * 0.6, '#FFB3C7', 10);
      } else if (d < 0) {
        pop(String(d), '#7A86A8');
        sfxBad();
        burst(G.x, G.z + crowdDepth() * 0.6, '#B8C4D8', 8);
      }
    } else if (it.t === 'wall') {
      if (front < it.z) continue;
      it.done = true;
      if (G.x > it.x0 - 0.06 && G.x < it.x1 + 0.06) {
        const lost = Math.min(G.n - 1, it.cost);
        if (lost > 0) {
          G.n -= lost;
          pop('-' + lost, '#7A86A8');
          burst(G.x, G.z + crowdDepth() * 0.5, '#C8D4E8', 10);
        }
        sfxBump();
        G.bossShake = 8;
      }
    } else if (it.t === 'heart') {
      if (G.z + crowdDepth() * 0.5 < it.z) continue;
      if (Math.abs(it.x - G.x) < 0.22 + Math.min(0.3, crowdDepth() * 0.2)) {
        it.done = true;
        G.n = Math.min(N_MAX, G.n + it.val);
        save.friends += it.val; storeSave();
        pop('+' + it.val, '#FF6FA8');
        sfxHeart();
        burst(it.x, it.z, '#FF9AC0', 8);
      } else if (G.z > it.z + 2) it.done = true;
    }
    if (it.flash > 0) it.flash = Math.max(0, it.flash - dt * 2.2);
  }

  if (G.z >= tr.bossZ) {
    G.phase = 'boss'; G.bossT = 0;
    G.msg = 'もふもふ大王を くすぐれ！'; G.msgT = 1.6;
    BG.hot = 1;
  }
}

function updateBoss(dt) {
  G.bossT += dt;
  if (G.bossT < 0.8) return;                                  // ためる
  // ★ なかまと 大王が おなじ はやさで へっていく。
  //   だから **なかまの ほうが 多ければ かならず 勝つ**。
  //   はじまる 前に すう字を くらべれば わかる ので、
  //   「あの ゲートを えらんで おけば…」と つぎに つながる。
  const rate = Math.max(6, (G.bossMax + Math.min(G.n, G.bossMax * 2)) / 2.0);
  const d = rate * dt;
  const nd = Math.min(G.n - 0, d), bd = Math.min(G.bossHp, d);
  G.n = Math.max(0, G.n - nd);
  G.bossHp = Math.max(0, G.bossHp - bd);
  G.bossShake = 6;
  if (Math.random() < 0.4) sfxTickle();
  if (Math.random() < 0.6) burst((Math.random() * 2 - 1) * 0.5, G.track.bossZ - G.z + 2, '#FFF0A8', 2);

  if (G.bossHp <= 0 || G.n <= 0) finish(G.bossHp <= 0);
}

function finish(win) {
  G.phase = 'end';
  G.over = true; G.win = win;
  bgmStopP();
  if (win) {
    sfxWin();
    save.clear['s' + G.si] = 1;
    const b = Math.round(G.bossMax + G.n);
    if (!save.best['s' + G.si] || save.best['s' + G.si] < b) save.best['s' + G.si] = b;
    storeSave();
  } else {
    sfxLose();
  }
}

// --- 絵 -----------------------------------------------------------------------------------
function drawPlay() {
  const tr = G.track, st = STAGES[G.si], D = DF();
  const sky = SKY[st.bg], gnd = GROUND[st.bg], rc = ROAD_C[st.bg];

  ctx.save();
  if (G.bossShake > 0) ctx.translate((Math.random() - 0.5) * G.bossShake, (Math.random() - 0.5) * G.bossShake);

  // そら
  const g = ctx.createLinearGradient(0, 0, 0, hzY());
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, hzY() + VOY + 4);
  drawSkyDeco(st.bg);

  // 地めん
  const g2 = ctx.createLinearGradient(0, hzY(), 0, VH);
  g2.addColorStop(0, gnd[0]); g2.addColorStop(1, gnd[1]);
  ctx.fillStyle = g2;
  ctx.fillRect(-VW, hzY(), VW * 3, VH - hzY() + VOB + 8);

  // 道（しま もようで はやさを 見せる）
  const STRIPE = 5;
  const off = G.z % (STRIPE * 2);
  const yBot = VH + VOB + 8;                    // 画面の いちばん 下まで のばす
  const hBot = halfAtY(yBot);
  ctx.fillStyle = rc[0];
  ctx.beginPath();
  ctx.moveTo(VW / 2 - hBot, yBot); ctx.lineTo(VW / 2 + hBot, yBot);
  ctx.lineTo(zx(1, Z_FAR), zy(Z_FAR)); ctx.lineTo(zx(-1, Z_FAR), zy(Z_FAR));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rc[1];
  for (let i = 0; i * STRIPE * 2 < Z_FAR; i++) {
    const z0 = i * STRIPE * 2 - off, z1 = z0 + STRIPE;
    if (z1 <= 0) continue;
    // 手まえ がわは 画面の 下まで のばす（z=0 で 切ると 帯が 切れて 見えた）
    let ya, ha;
    if (z0 <= 0) { ya = yBot; ha = hBot; } else { ya = zy(z0); ha = halfAtY(ya); }
    const yb = zy(z1), hb = halfAtY(yb);
    ctx.beginPath();
    ctx.moveTo(VW / 2 - ha, ya); ctx.lineTo(VW / 2 + ha, ya);
    ctx.lineTo(VW / 2 + hb, yb); ctx.lineTo(VW / 2 - hb, yb);
    ctx.closePath(); ctx.fill();
  }
  // 道の ふち
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(VW / 2 + s * hBot, yBot); ctx.lineTo(zx(s, Z_FAR), zy(Z_FAR));
    ctx.stroke();
  }

  drawSideDeco(st.bg);

  // --- おく → 手まえ の じゅんに ならべて 描く ---
  const items = [];
  let gateSeen = 0;
  for (const it of tr.items) {
    const z = it.z - G.z;
    if (z < -6 || z > Z_FAR) continue;
    if (it.t === 'heart' && it.done) continue;
    if (it.t === 'gate' && !it.done) {
      if (gateSeen >= GATE_SHOW) continue;          // ★ 手まえの 2つ だけ
      gateSeen++;
    }
    items.push({ z: z, o: it, far: it.t === 'gate' ? gateSeen : 0 });
  }
  const bz = tr.bossZ - G.z;
  if (bz < Z_FAR) items.push({ z: bz, o: { t: 'boss' } });
  items.sort((a, b) => b.z - a.z);
  for (const e of items) {
    if (e.o.t === 'gate') drawGate(e.o, e.z, D, e.far);
    else if (e.o.t === 'wall') drawWall(e.o, e.z);
    else if (e.o.t === 'heart') drawHeart(e.o, e.z);
    else drawBoss(e.z);
  }

  drawCrowd();

  // つぶ
  for (const q of G.parts) {
    const z = q.z - (G.z - G.z);
    const k = sc(Math.max(0, z));
    ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
    ctx.fillStyle = q.col;
    circle(zx(q.x, Math.max(0, z)), zy(Math.max(0, z)) + q.y * 26 * k, Math.max(1.5, 7 * k));
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  drawHud();

  // ふきだす すう字
  for (let i = 0; i < G.pops.length; i++) {
    const q = G.pops[i];
    ctx.globalAlpha = Math.max(0, 1 - q.t / 1.0);
    // ★ おなじ ばしょに かさなって 読めなく なった ので、
    //   出た じゅんに よこへ ずらす。
    const dx = (i - (G.pops.length - 1) / 2) * 54;
    bigText(q.text, clamp(zx(q.x, 0) + dx, 60, VW - 60), zy(0) - 96 - q.t * 80,
            q.big ? 40 : 28, q.col, 'rgba(255,255,255,0.95)');
    ctx.globalAlpha = 1;
  }

  if (G.phase === 'ready') {
    const k = clamp(G.readyT / 1.6, 0, 1);
    ctx.globalAlpha = 0.35 + 0.4 * k;
    ctx.fillStyle = '#2A2038';
    rr(VW / 2 - VW * 0.30, VH * 0.30, VW * 0.60, 84, 20); ctx.fill();
    ctx.globalAlpha = 1;
    bigText(STAGES[G.si].name, VW / 2, VH * 0.30 + 28, 26, '#FFF6C8');
    bigText('ゆびを すべらせて ゲートを えらぼう', VW / 2, VH * 0.30 + 62,
            fitSize('ゆびを すべらせて ゲートを えらぼう', VW * 0.55, 16), '#FFD9EC', null);
  }

  if (G.msgT > 0 && G.phase !== 'ready') {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    const fs = fitSize(G.msg, VW * 0.5, 22);
    // ★ たたかいの あいだは 上に おびが 2本 出る ので、その 下に よける。
    bigText(G.msg, VW / 2, G.phase === 'boss' ? HUD + 96 : HUD + 46, fs, '#FFF6C8',
            'rgba(60,40,70,0.55)');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    const b = Math.round(G.bossMax + Math.max(0, G.n));
    drawResult(G.win, G.win ? 'なかよしに なれた！' : 'とどかなかった…',
      G.win
        ? ['もふもふ大王 ' + G.bossMax + ' に とどいた！　のこった なかま ' + Math.round(G.n) + '人',
           STAGES[G.si].name + ' クリア！　スコア ' + b]
        : ['もふもふ大王は ' + G.bossMax + ' 人ぶん。とどかなかった…',
           'ゲートは「いまの 人数」と くらべて えらぼう'],
      G.win && G.si + 1 < STAGES.length
        ? [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'つぎの みち', on: () => startStage(G.si + 1), col: '#8AF0B0' },
           { label: 'えらぶ', on: () => backTitle(), col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'えらぶ', on: () => backTitle(), col: '#8AD8F0' }],
      '#FF8FBB');
  }
}

function backTitle() { bgmStopP(); G.screen = 'title'; }

// --- そらと まわりの かざり ---------------------------------------------------------------
function drawSkyDeco(bg) {
  if (bg === 'night') {
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137) % 100) / 100 * VW;
      const y = HUD + 6 + ((i * 61) % 70) / 70 * (hzY() - HUD - 14);
      const tw = 0.5 + 0.5 * Math.sin(G.t * 2 + i);
      ctx.globalAlpha = 0.45 + tw * 0.5;
      ctx.fillStyle = '#FFF6C8';
      circle(x, y, 1.6 + tw); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF0C0';
    circle(VW * 0.80, HUD + 26, 16); ctx.fill();
    ctx.fillStyle = SKY.night[0];
    circle(VW * 0.80 - 6, HUD + 21, 14); ctx.fill();
    return;
  }
  if (bg === 'rainbow') {
    const cols = ['#FF9AA2', '#FFD59A', '#FFF6A0', '#A8ECC8', '#A8D8FF', '#D9C2FF'];
    ctx.lineWidth = 8;
    for (let i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i];
      ctx.beginPath();
      ctx.arc(VW / 2, hzY() + 26, 96 + i * 8, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }
  // おひさま
  ctx.fillStyle = 'rgba(255,240,170,0.9)';
  circle(VW * 0.16, HUD + 26, 17); ctx.fill();
  // くも
  for (let i = 0; i < 5; i++) {
    const x = ((G.z * 0.5 + i * 230) % (VW + 200)) - 100;
    const y = HUD + 14 + (i % 3) * 13;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(x, y, 11); ctx.fill();
    circle(x + 11, y + 2, 8); ctx.fill();
    circle(x - 10, y + 3, 7); ctx.fill();
    rr(x - 11, y, 23, 9, 4); ctx.fill();
  }
}

function drawSideDeco(bg) {
  // 道の りょうがわに ならぶ もの。z で 大きさが きまる ので おく行きが 出る。
  const SP = 7;
  const off = G.z % SP;
  for (let i = Math.floor(Z_FAR / SP); i >= 0; i--) {
    const z = i * SP - off;
    if (z < 0.4 || z > Z_FAR) continue;
    for (const s of [-1, 1]) {
      const x = s * 1.22, k = sc(z);
      const px = zx(x, z), py = zy(z), h = 46 * k;
      if (bg === 'forest' || bg === 'field') {
        // 木
        ctx.fillStyle = '#B98A5E';
        rr(px - 2.6 * k * 2, py - h * 0.32, 5.2 * k * 2, h * 0.34, 2); ctx.fill();
        ctx.fillStyle = i % 2 ? '#7FCB86' : '#96DA96';
        circle(px, py - h * 0.44, h * 0.34); ctx.fill();
        circle(px - h * 0.20, py - h * 0.30, h * 0.24); ctx.fill();
        circle(px + h * 0.20, py - h * 0.30, h * 0.24); ctx.fill();
      } else if (bg === 'candy') {
        // ぺろぺろキャンディ
        ctx.fillStyle = '#FFF6E8';
        rr(px - 1.6 * k * 2, py - h * 0.42, 3.2 * k * 2, h * 0.44, 2); ctx.fill();
        ctx.fillStyle = i % 2 ? '#FF9AC0' : '#9AD8FF';
        circle(px, py - h * 0.52, h * 0.26); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        circle(px - h * 0.07, py - h * 0.58, h * 0.09); ctx.fill();
      } else if (bg === 'snow') {
        ctx.fillStyle = '#FFFFFF';
        circle(px, py - h * 0.16, h * 0.20); ctx.fill();
        circle(px, py - h * 0.42, h * 0.14); ctx.fill();
        ctx.fillStyle = '#FF9AC0';
        circle(px, py - h * 0.42, h * 0.04); ctx.fill();
      } else if (bg === 'night') {
        // ランタン
        ctx.strokeStyle = '#6A5FA8'; ctx.lineWidth = Math.max(1, 3 * k);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - h * 0.62); ctx.stroke();
        ctx.fillStyle = '#FFE9A8';
        circle(px, py - h * 0.62, h * 0.16); ctx.fill();
      } else {
        ctx.fillStyle = i % 2 ? '#FFB3C7' : '#FFF0A8';
        circle(px, py - h * 0.12, h * 0.16); ctx.fill();
        ctx.fillStyle = '#FFF6E8';
        circle(px, py - h * 0.12, h * 0.06); ctx.fill();
      }
    }
  }
}

// --- ゲート -------------------------------------------------------------------------------
function drawGate(gt, z, D, far) {
  // ★ 手まえ（z が 小さい）ほど アーチは 画面いっぱいに なる。
  //   通りすぎた ゲートを そのまま 描いて いたら、うすい ピンクの かべが
  //   画面ぜんぶを おおって、道も なかまも 見えなく なった。
  //   z=6 から z=1 の あいだで すうっと きえるように する。
  const fade = clamp((z - 1.0) / 5.0, 0, 1);
  if (fade <= 0) return;
  const zz = Math.max(0, z);
  const k = sc(zz);
  const y = zy(zz);
  const H = 265 * k;                                     // アーチの 高さ（見おろしに した ぶん 高く）
  const passed = gt.done;
  // 2つめの ゲートは うすく して、手まえの ほうが はっきり 見えるように する
  const base = fade * (passed ? 0.30 : (far >= 2 ? 0.45 : 1));

  for (let i = 0; i < gt.cells.length; i++) {
    const c = gt.cells[i];
    const xa = zx(c.x0, zz), xb = zx(c.x1, zz);
    const w = xb - xa;
    const good = opGood(c.op);
    ctx.globalAlpha = base * (passed && gt.tookIdx !== i ? 0.5 : 1);

    const col = good ? '#FF8FBB' : '#8FA6C8';
    const col2 = good ? '#FFC2DA' : '#B8C8DE';
    const topH = H * 0.34;                               // ぬのの ぶん

    // 通れる ところを うっすら（どこを 通るか わかりやすく）
    if (!passed) {
      // ★ さいしょ 全体を こく ぬって いたら、道じたいが かすんで
      //   なかまが どこに いるか 見えにくく なった。したの ほうだけ うっすら。
      ctx.globalAlpha = base * 0.13;
      ctx.fillStyle = good ? '#FF6FA8' : '#7A86A8';
      ctx.fillRect(xa + w * 0.06, y - (H - topH) * 0.38, w * 0.88, (H - topH) * 0.38);
      ctx.globalAlpha = base;
    }

    // はしら（リボン まき）
    const pw = Math.max(3, w * 0.09);
    for (const px of [xa + pw * 0.7, xb - pw * 0.7]) {
      ctx.fillStyle = '#FFF6E8';
      rr(px - pw / 2, y - H, pw, H, Math.min(pw * 0.4, 6 * k)); ctx.fill();
      ctx.fillStyle = good ? '#FFB3C7' : '#A8BCD6';
      for (let s = 0; s < 5; s++) {
        rr(px - pw / 2, y - H + H * (0.28 + s * 0.14), pw, H * 0.05, 1.5); ctx.fill();
      }
    }

    // アーチ（上が まるい ぬの）
    const r = Math.min(w * 0.5, topH * 0.7);
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(xa + 1, y - H + topH);
    ctx.lineTo(xa + 1, y - H + r);
    ctx.quadraticCurveTo(xa + 1, y - H, xa + 1 + r, y - H);
    ctx.lineTo(xb - 1 - r, y - H);
    ctx.quadraticCurveTo(xb - 1, y - H, xb - 1, y - H + r);
    ctx.lineTo(xb - 1, y - H + topH);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(xa + 1, y - H + topH * 0.72);
    ctx.lineTo(xa + 1, y - H + r);
    ctx.quadraticCurveTo(xa + 1, y - H, xa + 1 + r, y - H);
    ctx.lineTo(xb - 1 - r, y - H);
    ctx.quadraticCurveTo(xb - 1, y - H, xb - 1, y - H + r);
    ctx.lineTo(xb - 1, y - H + topH * 0.72);
    ctx.closePath(); ctx.fill();
    // ひらひら（ぬのの したの ふち）
    ctx.fillStyle = col2;
    const fl = Math.max(2, w * 0.09);
    for (let s = 0; s * fl * 2 < w - 2; s++) {
      circle(xa + 1 + fl + s * fl * 2, y - H + topH, fl); ctx.fill();
    }

    // すう字。★ ぬのの 高さに 合わせないと、はばの ひろい ゲートで
    //   すう字が ぬのから はみ出して 空に うかんで 見えた。
    const lab = opLabel(c.op, c.val);
    const fs = Math.max(8, Math.min(w * 0.36, topH * 0.62));
    bigText(lab, (xa + xb) / 2, y - H + topH * 0.38, fs,
            good ? '#FFFFFF' : '#2A3448', good ? 'rgba(180,40,90,0.45)' : null);

    // ★ やさしいでは 得な ほうに 星を つける
    if (D.hint && c.best && !passed && H > 50) {
      const t = 0.5 + 0.5 * Math.sin(G.t * 6);
      ctx.globalAlpha = base * (0.6 + t * 0.4);
      drawStar((xa + xb) / 2, y - H - 16 * k, 15 * k, '#FFE24A');
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 1;
}

function drawStar(cx, cy, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}

// --- じゃま（わたあめの かべ。ぶつかると なかまが はぐれる） --------------------------------
function drawWall(w, z) {
  const fade = clamp((z - 1.0) / 4.0, 0, 1);
  if (fade <= 0) return;
  ctx.globalAlpha = fade * (w.done ? 0.35 : 1);
  const k = sc(Math.max(0, z));
  const y = zy(Math.max(0, z));
  const xa = zx(w.x0, Math.max(0, z)), xb = zx(w.x1, Math.max(0, z));
  const H = 84 * k;
  ctx.fillStyle = '#C9B8E8';
  rr(xa, y - H, xb - xa, H, Math.max(3, 12 * k)); ctx.fill();
  ctx.fillStyle = '#DCD0F4';
  const n = Math.max(2, Math.round((xb - xa) / Math.max(8, 26 * k)));
  for (let i = 0; i < n; i++) {
    circle(xa + (xb - xa) * (i + 0.5) / n, y - H + 4 * k, Math.max(3, 13 * k)); ctx.fill();
  }
  // ねむって いる かお（かわいく、でも 通っちゃ だめ と わかるように）
  if (H > 26) {
    ctx.strokeStyle = '#7A6AA8'; ctx.lineWidth = Math.max(1.5, 2.6 * k);
    const cx = (xa + xb) / 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 12 * k, y - H * 0.48, 5 * k, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, y - H * 0.30, 5 * k, 0, Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawHeart(h, z) {
  if (z < -2) return;
  const k = sc(Math.max(0, z));
  const y = zy(Math.max(0, z)) - 26 * k + Math.sin(G.t * 4 + h.z) * 5 * k;
  const px = zx(h.x, Math.max(0, z));
  const r = Math.max(3, 16 * k);
  ctx.fillStyle = '#FF6FA8';
  ctx.beginPath();
  ctx.moveTo(px, y + r * 0.9);
  ctx.bezierCurveTo(px - r * 1.4, y - r * 0.2, px - r * 0.5, y - r * 1.1, px, y - r * 0.35);
  ctx.bezierCurveTo(px + r * 0.5, y - r * 1.1, px + r * 1.4, y - r * 0.2, px, y + r * 0.9);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  circle(px - r * 0.35, y - r * 0.35, r * 0.20); ctx.fill();
  if (k > 0.25) bigText('+' + h.val, px, y - r * 1.5, Math.max(9, 15 * k), '#FF6FA8', '#FFFFFF');
}

// --- なかま -------------------------------------------------------------------------------
//
// ★ ならびかたは 「ひまわりの たね」の 式（ぐるぐる まわりながら 外へ）。
//   これだと 何人でも すきまなく まるく ならぶ ので、
//   ふえた ときに ちゃんと「大ぐんしゅう」に 見える。
function drawCrowd() {
  const n = Math.max(0, Math.round(G.n));
  if (n <= 0) return;
  const m = Math.min(n, DRAW_MAX);
  // DRAW_MAX を こえたら かたまりだけ 少し 大きく して 「もっと 多い」を 見せる
  const rk = n > DRAW_MAX ? Math.pow(n / DRAW_MAX, 0.17) : 1;

  const rMax = BLOB_SP * Math.sqrt(Math.max(1, m - 1)) * rk;
  const list = [];
  for (let i = 0; i < m; i++) {
    const r = BLOB_SP * Math.sqrt(i) * rk;
    const a = i * 2.39996323;
    const ox = Math.cos(a) * r;
    // rMax を 足して、oz が かならず プラスに なるように する。
    const oz = (Math.sin(a) * r + rMax) * BLOB_ZK * 0.55 + 0.30;
    list.push({ i: i, x: G.x + ox, z: oz });
  }
  list.sort((p, q) => q.z - p.z);
  for (const p of list) {
    const bob = Math.sin(G.run * 3.1 + p.i * 1.7) * 0.5 + 0.5;
    drawFriend(zx(p.x, p.z), zy(p.z), sc(p.z), PAL[p.i % PAL.length], PAL_D[p.i % PAL_D.length], bob);
  }
  // ゆい は いちばん 手まえ に 大きく
  drawYui(zx(G.x, 0), zy(0), sc(0));
}

function drawFriend(px, py, k, col, dark, bob) {
  const r = 15 * k;
  if (r < 2.2) { ctx.fillStyle = col; circle(px, py - r, Math.max(1, r)); ctx.fill(); return; }
  const hop = bob * r * 0.35;
  const cy = py - r - hop;
  // あし
  ctx.fillStyle = dark;
  circle(px - r * 0.38, py - r * 0.14 + hop * 0.4, r * 0.22); ctx.fill();
  circle(px + r * 0.38, py - r * 0.14 - hop * 0.4, r * 0.22); ctx.fill();
  // みみ
  ctx.fillStyle = col;
  circle(px - r * 0.62, cy - r * 0.66, r * 0.34); ctx.fill();
  circle(px + r * 0.62, cy - r * 0.66, r * 0.34); ctx.fill();
  // からだ
  circle(px, cy, r); ctx.fill();
  if (r < 5) return;
  // おなか
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  circle(px, cy + r * 0.22, r * 0.52); ctx.fill();
  // め
  ctx.fillStyle = '#3A2E42';
  circle(px - r * 0.32, cy - r * 0.12, r * 0.13); ctx.fill();
  circle(px + r * 0.32, cy - r * 0.12, r * 0.13); ctx.fill();
  if (r < 8) return;
  // ほっぺ
  ctx.fillStyle = 'rgba(255,140,170,0.55)';
  circle(px - r * 0.58, cy + r * 0.14, r * 0.15); ctx.fill();
  circle(px + r * 0.58, cy + r * 0.14, r * 0.15); ctx.fill();
  // くち
  ctx.strokeStyle = '#3A2E42'; ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath(); ctx.arc(px, cy + r * 0.10, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

function drawYui(px, py, k) {
  const r = 31 * k;
  const hop = (Math.sin(G.run * 3.1) * 0.5 + 0.5) * r * 0.22;
  const cy = py - r * 1.15 - hop;
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath(); ctx.ellipse(px, py, r * 0.8, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  // あし
  ctx.fillStyle = '#FFE0EC';
  rr(px - r * 0.42, py - r * 0.52 + hop * 0.5, r * 0.30, r * 0.55, r * 0.14); ctx.fill();
  rr(px + r * 0.12, py - r * 0.52 - hop * 0.5, r * 0.30, r * 0.55, r * 0.14); ctx.fill();
  // ワンピース
  ctx.fillStyle = '#FF8FBB';
  ctx.beginPath();
  ctx.moveTo(px - r * 0.30, cy + r * 0.10);
  ctx.lineTo(px + r * 0.30, cy + r * 0.10);
  ctx.lineTo(px + r * 0.62, py - r * 0.42);
  ctx.lineTo(px - r * 0.62, py - r * 0.42);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  rr(px - r * 0.60, py - r * 0.56, r * 1.20, r * 0.16, r * 0.06); ctx.fill();
  // て（ふりふり）
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.lineCap = 'round';
  const sw = Math.sin(G.run * 3.1) * r * 0.30;
  ctx.beginPath();
  ctx.moveTo(px - r * 0.34, cy + r * 0.28); ctx.lineTo(px - r * 0.72, cy + r * 0.62 + sw);
  ctx.moveTo(px + r * 0.34, cy + r * 0.28); ctx.lineTo(px + r * 0.72, cy + r * 0.62 - sw);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // かお
  ctx.fillStyle = '#F6CDA8';
  circle(px, cy - r * 0.12, r * 0.52); ctx.fill();
  // かみ（ふんわり ボブ＋ぱっつん）
  ctx.fillStyle = '#6B4A38';
  ctx.beginPath();
  ctx.arc(px, cy - r * 0.20, r * 0.60, Math.PI, 0);
  ctx.lineTo(px + r * 0.60, cy + r * 0.16);
  ctx.quadraticCurveTo(px + r * 0.42, cy - r * 0.06, px + r * 0.30, cy - r * 0.22);
  ctx.lineTo(px - r * 0.30, cy - r * 0.22);
  ctx.quadraticCurveTo(px - r * 0.42, cy - r * 0.06, px - r * 0.60, cy + r * 0.16);
  ctx.closePath(); ctx.fill();
  // リボン
  ctx.fillStyle = '#FF5F9E';
  circle(px - r * 0.56, cy - r * 0.44, r * 0.13); ctx.fill();
  circle(px - r * 0.76, cy - r * 0.40, r * 0.13); ctx.fill();
  ctx.fillStyle = '#FFD24A';
  circle(px - r * 0.66, cy - r * 0.42, r * 0.06); ctx.fill();
  // め・ほっぺ・くち
  ctx.fillStyle = '#3A2E42';
  circle(px - r * 0.19, cy - r * 0.08, r * 0.075); ctx.fill();
  circle(px + r * 0.19, cy - r * 0.08, r * 0.075); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,170,0.6)';
  circle(px - r * 0.34, cy + r * 0.06, r * 0.10); ctx.fill();
  circle(px + r * 0.34, cy + r * 0.06, r * 0.10); ctx.fill();
  ctx.strokeStyle = '#3A2E42'; ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); ctx.arc(px, cy + r * 0.06, r * 0.11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

// --- もふもふ大王 -------------------------------------------------------------------------
function drawBoss(z) {
  if (z > Z_FAR || z < -14) return;
  const k = sc(Math.max(0.2, z));
  const py = zy(Math.max(0.2, z));
  const px = zx(0, Math.max(0.2, z));
  const R = 120 * k;
  const wob = Math.sin(G.t * 3) * R * 0.035;
  const hurt = G.phase === 'boss' && G.bossT > 0.8;

  // もふもふ の ふち
  ctx.fillStyle = '#C7A8F0';
  ctx.beginPath();
  const lobes = 16;
  for (let i = 0; i <= lobes; i++) {
    const a = Math.PI * 2 * i / lobes;
    const rr2 = R * (1 + 0.10 * Math.sin(i * 3 + G.t * 2));
    const x = px + Math.cos(a) * rr2, y = py - R * 0.95 + Math.sin(a) * rr2 * 0.86 + wob;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  // からだ
  ctx.fillStyle = '#B892E8';
  ctx.beginPath();
  ctx.ellipse(px, py - R * 0.95 + wob, R * 0.90, R * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py - R * 0.72 + wob, R * 0.52, R * 0.40, 0, 0, Math.PI * 2);
  ctx.fill();
  if (R < 16) return;
  // かんむり
  ctx.fillStyle = '#FFD24A';
  ctx.beginPath();
  ctx.moveTo(px - R * 0.42, py - R * 1.62 + wob);
  ctx.lineTo(px - R * 0.26, py - R * 1.94 + wob);
  ctx.lineTo(px, py - R * 1.66 + wob);
  ctx.lineTo(px + R * 0.26, py - R * 1.94 + wob);
  ctx.lineTo(px + R * 0.42, py - R * 1.62 + wob);
  ctx.closePath(); ctx.fill();
  // め（くすぐられると にっこり）
  const laugh = hurt || (G.over && G.win);
  ctx.fillStyle = '#3A2E42';
  if (laugh) {
    ctx.strokeStyle = '#3A2E42'; ctx.lineWidth = Math.max(2, R * 0.05);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(px + s * R * 0.32, py - R * 1.16 + wob, R * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    circle(px - R * 0.32, py - R * 1.10 + wob, R * 0.10); ctx.fill();
    circle(px + R * 0.32, py - R * 1.10 + wob, R * 0.10); ctx.fill();
  }
  // ほっぺ・くち
  ctx.fillStyle = 'rgba(255,140,170,0.55)';
  circle(px - R * 0.52, py - R * 0.94 + wob, R * 0.13); ctx.fill();
  circle(px + R * 0.52, py - R * 0.94 + wob, R * 0.13); ctx.fill();
  ctx.fillStyle = '#5A3A50';
  ctx.beginPath();
  ctx.ellipse(px, py - R * 0.86 + wob, R * (laugh ? 0.22 : 0.14), R * (laugh ? 0.16 : 0.09), 0, 0, Math.PI * 2);
  ctx.fill();
  // つよさ
  if (G.phase !== 'boss' && R > 24) {
    bigText('もふもふ大王 ' + G.bossMax, px, py - R * 2.16 + wob,
            Math.max(11, Math.min(22, R * 0.20)), '#6A4AA8', '#FFFFFF');
  }
}

// --- HUD ----------------------------------------------------------------------------------
function drawHud() {
  ctx.fillStyle = 'rgba(58,42,72,0.72)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);

  // なかまの かず（大きく まん中）
  const n = Math.max(0, Math.round(G.n));
  bigText('なかま ' + n + '人', VW / 2, HUD / 2, 22, '#FFFFFF', 'rgba(255,111,168,0.9)');

  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = DF().col;
  ctx.fillText(DF().name, 10, HUD / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFF0D8';
  const prog = Math.round(clamp(G.z / G.track.bossZ, 0, 1) * 100);
  ctx.fillText('もふもふ大王 ' + G.bossMax + '　' + prog + '%', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // すすみぐあい の おび
  const bw = VW * 0.5, bx = VW / 2 - bw / 2, by = HUD + 4;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  rr(bx, by, bw, 7, 3.5); ctx.fill();
  ctx.fillStyle = '#FF8FBB';
  rr(bx, by, bw * clamp(G.z / G.track.bossZ, 0, 1), 7, 3.5); ctx.fill();
  ctx.fillStyle = '#C7A8F0';
  circle(bx + bw, by + 3.5, 6); ctx.fill();

  if (G.phase === 'boss') {
    // たたかいの おび
    const w = VW * 0.62, x0 = VW / 2 - w / 2, y0 = HUD + 22;
    for (const [val, max, col, lab, dy] of [
      [G.n, Math.max(G.n, G.bossMax), '#FF8FBB', 'なかま', 0],
      [G.bossHp, G.bossMax, '#B892E8', 'もふもふ大王', 26],
    ]) {
      ctx.fillStyle = 'rgba(40,30,54,0.55)';
      rr(x0, y0 + dy, w, 18, 9); ctx.fill();
      ctx.fillStyle = col;
      rr(x0 + 2, y0 + dy + 2, Math.max(0, (w - 4) * clamp(val / Math.max(1, max), 0, 1)), 14, 7); ctx.fill();
      bigText(lab + ' ' + Math.round(val), VW / 2, y0 + dy + 9, 14, '#FFFFFF', 'rgba(40,30,54,0.8)');
    }
  }
}

// --- タイトル -----------------------------------------------------------------------------
function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#BFE9FF'); g.addColorStop(0.55, '#FFE4F2'); g.addColorStop(1, '#FFF0D8');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // おか
  ctx.fillStyle = '#A8E6A1';
  ctx.beginPath();
  ctx.moveTo(-VW, VH); ctx.lineTo(-VW, VH * 0.80);
  for (let i = 0; i <= 24; i++) {
    ctx.lineTo(-VW + VW * 3 * i / 24, VH * (0.80 + Math.sin(i * 0.8) * 0.035));
  }
  ctx.lineTo(VW * 2, VH); ctx.closePath(); ctx.fill();

  bigText('ゆいの', VW / 2, 24, 17, '#FF8FBB', null);
  bigText('なかまパレード', VW / 2, 54, fitSize('なかまパレード', VW * 0.42, 36), '#FF5F9E', '#FFFFFF');
  const D = DF();
  bigText('ゲートを えらんで なかまを ふやそう！ 全10コース',
          VW / 2, 86, fitSize('ゲートを えらんで なかまを ふやそう！ 全10コース', VW * 0.9, 15), '#7A5A70', null);
  bigText('いま ＝ ' + D.name + '：' + D.tip, VW / 2, 104,
          fitSize('いま ＝ ' + D.name + '：' + D.tip, VW * 0.9, 13), '#B0567F', null);

  // タイトルの かざり（ゆいと なかま）
  drawYui(VW * 0.10, VH * 0.72, 0.95);
  for (let i = 0; i < 5; i++) {
    drawFriend(VW * 0.10 + 26 + i * 21, VH * 0.74 + (i % 2) * 6, 0.62,
               PAL[i % PAL.length], PAL_D[i % PAL_D.length],
               0.5 + 0.5 * Math.sin(G.t * 4 + i));
  }

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 122, startStage, '#FF8FBB');

  bigText('むずかしさ', VW / 2, y + 12, 13, 'rgba(90,60,80,0.8)', null);
  const dw = Math.min(150, (VW - 60) / 3), dh = 36;
  DIFF.forEach((d, i) => {
    const bx = VW / 2 - (dw * 3 + 20) / 2 + i * (dw + 10);
    const on = i === (save.diff | 0);
    const b = button(bx, y + 24, dw, dh, () => { save.diff = i; storeSave(); });
    drawButton(b, d.name, on ? d.col : '#C7B8D0', on ? '#241C34' : 'rgba(60,44,70,0.75)');
    if (on) {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      rr(b.x - 3, b.y - 3, dw + 6, dh + 6, (dh + 6) * 0.28); ctx.stroke();
    }
  });

  const sw = Math.min(150, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 70, sw, 36, () => { G.screen = 'howto'; }),
             'あそびかた', '#FFD9A0');
  drawButton(button(VW / 2 + 8, y + 70, sw, 36, () => { audioStart(); sfxGood(); }),
             '♪ おと', '#FFD9A0');
  bigText('あそんだ かず ' + save.plays + '　あつめた なかま ' + save.friends,
          VW / 2, VH - 12, 13, 'rgba(90,60,80,0.75)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(90,60,80,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  ctx.fillStyle = '#FFF0F6';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 30, 24, '#FF5F9E');
  const lines = [
    '① 画面の どこでも いいので ゆびを 置いて **左右に すべらせる**',
    '　 ゆびの ある ほうへ パレードが よっていく（パソコンなら ← →）',
    '② まえに ゲートが 2つ（ときどき 3つ）ならんで いる。通った ほうが きく',
    '③ ピンク＝ふえる（＋・×）　青むらさき＝へる（−・÷）',
    '④ 「×2」と「＋30」は **いまの 人数しだい**。10人なら ＋30、50人なら ×2 が 得',
    '⑤ むらさきの ふわふわは じゃま。ぶつかると なかまが はぐれる',
    '⑥ ピンクの ハートは とると なかまが ふえる',
    '⑦ さいごは もふもふ大王。**なかまの ほうが 多ければ かならず 勝てる**',
    '⑧ やさしいでは、得な ほうの ゲートに ★が つく',
  ];
  lines.forEach((s, i) => bigText(s.replace(/\*\*/g, ''), VW / 2, 58 + i * 28,
                                 fitSize(s.replace(/\*\*/g, ''), VW * 0.94, 15), '#6A4A60', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 44, bw, 38, () => { G.screen = 'title'; }), 'もどる', '#FF8FBB');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

// ★ 画面ぜんぶが そうさの ばしょ（スティックの 絵は 出さない）。
arcadeStart({ update: update, draw: draw, zone: 'all' });
