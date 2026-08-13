// エイトくんの どうくつ探検
//
// ★ 1980年代の「スラスト」もの。ボタンを はなしても **すぐには 止まらない**。
//   下に 引っぱられ つづける ので、いつも 少し 先を 考えて ふかす。
//   この「いきおいが のこる」ことだけで、ただの めいろが むずかしく なる。
//
// ★ そうさは 2つだけ。
//   ・左の スティック … **むきを きめる**（きめた ほうへ ゆっくり まわる）
//   ・右の ボタン     … **ふんしゃ**。むいて いる ほうへ おされる
//   ぐるぐる 回す やりかたは スマホだと むずかしすぎたので、
//   「スティックの ほうを 向く」に して ある。いきおいの むずかしさは そのまま。
//
// ★ クリスタルを ぜんぶ あつめて、さいごに **パッドに そっと 着地**する。
//   速すぎても、かたむいて いても こわれる。ここが いちばん むずかしい。
//
// ★ ねんりょうは ふかして いる あいだ だけ へる。0に なると 落ちるだけ。
//   とちゅうの タンクで 足せる。
//
// ★ どうくつは 天じょうと ゆかの 高さの ならびで できて いる。
//   すきまは かならず きまった 高さ 以上に して あるので、
//   「ぜったいに 通れない ところ」が できない。
//
// 絵は ぜんぶ canvas、音は ぜんぶ WebAudio（画像・音の ファイルは 使わない）。

'use strict';

const GAME_VER = 1;
const HUD = 30;

// --- 物理（1ユニット = ふねの たて 2つぶん くらい） --------------------------------
const VIEW_H = 14;            // 画面に 見える たての ユニット数
const WORLD_H = 20;           // どうくつの たて ぜんたい
const SHIP_R = 0.46;          // ふねの 大きさ
const GRAV = 9.0;
const THRUST = 20.0;
const MAX_V = 16;
const DRAG = 0.22;
// ★ 「方向の そうさが げきむず」と 言われた。原いんは 2つ:
//   ① 機首の まわるのが おそい（5.2）… 向きたい ほうを 向くまで 時間が かかる
//   ② スティックで 向きを きめて、**べつの ゆびで ふんしゃ**する 2本ゆび そうさ
//   そこで **「かんたん」そうさ**を 作って、そちらを ふつうに した。
//   ・スティックを たおした **その ほうへ そのまま とぶ**（1本ゆびで あそべる）
//   ・機首は すぐに その ほうを 向く
//   ・スティックを はなすと 機首は 上に もどる（ボタンだけで ホバリングできる）
//   もとの そうさ（向きを きめて ふんしゃ）も タイトルで えらべる。
const TURN = 5.2;             // むずかしい: 1びょうに まわれる 角度（ラジアン）
const TURN_EASY = 14.0;       // かんたん: ほとんど すぐ 向く
const GRAV_EASY = 7.6;        // かんたんは 重力も 少し 弱く
const FUEL_MAX = 130;
// ★ さいしょ 12 に して いたら、どうくつの まん中で ガス欠に なる ことが
//   おおかった。もどる ことも できず ただ 落ちるだけ なので 少し ゆるめた。
const FUEL_BURN = 9;          // ふかして いる あいだ 1びょうに へる ぶん
const TANK_FUEL = 38;

// そっと 着地の じょうけん
const LAND_V = 4.0;           // これより 速いと こわれる
const LAND_A = 0.78;          // 上むきから これ以上 かたむくと こわれる（ラジアン）
// ★ とびらが いちばん しまった ときでも、ここまでは かならず あけて おく。
//   さいしょ これが なくて、とびらが **ぴったり しまって 通れない** どうくつが
//   6つも できて いた（すきま 0.02 ユニット ＝ ふねの 1/40）。
const GATE_MIN = 1.9;
// ★ タレットは さいしょ **ふねを ねらって** うって いた。すきまが 3ユニット
//   しか ない ところで ねらいうちされると よける ばしょが なく、
//   ロボットに とばせたら 4どうくつめで 32回 ぜんぶ たまで こわれた。
//   いまは **まっすぐ 上に うつ**。うつ 前に 光るので、あいだを ぬけられる。
const TUR_PER = 2.8;          // うつ 間かく
const TUR_WARN = 0.6;         // うつ 前に 光る 時間
const TUR_V = 4.5;            // たまの 速さ
// ★ たまが 天じょうまで とどくと「あくまで 待つ」しか なくなり、
//   待って いる あいだ ずっと ふかす ので ガス欠に なる。
//   とどく 高さを かぎって、**上を 通れば よけられる** ように した。
// ★ せまい どうくつでは 2.3 も とどくと 天じょうまで ふさがって しまう。
//   すきまの はんぶんまで、を うわのせの じょうけんに する。
const TUR_RANGE = 2.3;        // たまが とどく 高さ（ユニット）
const TUR_RANGE_K = 0.52;     // すきまに くらべた 上げん

const STAGES = [
  { name: 'はじめの どうくつ', len: 92, gap: 4.2, wave: 1.6, cry: 3, tur: 0, gate: 0, tank: 2 },
  { name: 'ひかりの みち', len: 102, gap: 3.8, wave: 2.0, cry: 4, tur: 0, gate: 0, tank: 2 },
  { name: 'ほそい すきま', len: 112, gap: 3.2, wave: 2.4, cry: 5, tur: 2, gate: 0, tank: 2 },
  { name: 'みはりの とう', len: 122, gap: 3.1, wave: 2.6, cry: 5, tur: 2, gate: 0, tank: 3 },
  { name: 'ゆれる かべ', len: 132, gap: 2.9, wave: 3.0, cry: 6, tur: 3, gate: 2, tank: 3 },
  { name: 'とびらの ま', len: 132, gap: 2.9, wave: 3.0, cry: 6, tur: 3, gate: 3, tank: 3 },
  { name: 'まがりくねり', len: 142, gap: 2.7, wave: 3.4, cry: 7, tur: 3, gate: 3, tank: 3 },
  { name: 'ようがんの たに', len: 152, gap: 2.6, wave: 3.6, cry: 7, tur: 4, gate: 4, tank: 4 },
  { name: 'くらやみ', len: 162, gap: 2.5, wave: 3.8, cry: 8, tur: 4, gate: 4, tank: 4 },
  { name: 'さいしんぶ', len: 172, gap: 2.4, wave: 4.0, cry: 8, tur: 5, gate: 5, tank: 4 },
];

const SAVE_KEY = 'cave.save.v1';
const save = { clear: {}, best: {}, plays: 0, cry: 0, easy: 1 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.cry)) save.cry = s.cry;
  if (Number.isFinite(s.easy)) save.easy = s.easy;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- 音 --------------------------------------------------------------------------------
let thrustNode = null;
function sfxThrustOn() {
  if (!A.ctx || thrustNode) return;
  const src = A.ctx.createBufferSource();
  const buf = A.ctx.createBuffer(1, A.ctx.sampleRate * 1, A.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
  src.buffer = buf; src.loop = true;
  const f = A.ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 620;
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, A.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.16, A.ctx.currentTime + 0.05);
  src.connect(f); f.connect(g); g.connect(A.sfx || A.ctx.destination);
  src.start();
  thrustNode = { src, g };
}
function sfxThrustOff() {
  if (!thrustNode) return;
  const t = A.ctx.currentTime;
  try {
    thrustNode.g.gain.cancelScheduledValues(t);
    thrustNode.g.gain.setValueAtTime(Math.max(0.0001, thrustNode.g.gain.value), t);
    thrustNode.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    thrustNode.src.stop(t + 0.12);
  } catch (e) {}
  thrustNode = null;
}
function sfxCry() { if (A.ctx) bleep(anow(), [84, 91, 96], 0.045, 0.09, 0.12); }
function sfxTank() { if (A.ctx) bleep(anow(), [64, 71, 76], 0.05, 0.10, 0.12); }
function sfxShot() { if (A.ctx) { const t = anow(); tone(t, 70, 0.06, 0.05, 'square', null, 58); } }
function sfxCrash() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.34, 0.24, 90, 2600);
  tone(t, 40, 0.24, 0.13, 'triangle', null, 20);
  kick(t, 0.9);
}
function sfxLand() { if (A.ctx) { const t = anow(); nz(t, 0.10, 0.08, 120, 900); bleep(t, [72, 79], 0.06, 0.12, 0.10); } }
function sfxLow() { if (A.ctx) tone(anow(), 60, 0.09, 0.06, 'square', null, 55); }
function sfxWin() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14);
  kick(t, 0.7); kick(t + 0.42, 0.7);
}

// --- さいころ（おなじ めんは いつも おなじ） -----------------------------------------
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

// --- どうくつを 作る ------------------------------------------------------------------
//
// ★ 天じょう(ceil)と ゆか(floor)を 1ますごとに もつ だけ。
//   さいごに **すきまが きまった 高さ より せまく なって いないか** を
//   ぜんぶ 見なおして ひろげる ので、通れない ところが できない。

function buildCave(si) {
  const st = STAGES[si];
  const rnd = rng(0x0CAE + si * 7919);
  const W = st.len;
  const ceil = new Array(W), flr = new Array(W);

  let mid = WORLD_H / 2, gap = st.gap + 1.4;
  let vmid = 0, vgap = 0;
  for (let x = 0; x < W; x++) {
    // はじめと おわりは ゆったり（出発と 着地の ため）
    const edge = Math.min(x, W - 1 - x);
    const calm = edge < 10 ? 1 - edge / 10 : 0;

    vmid += (rnd() - 0.5) * 0.55 * st.wave * 0.6;
    vmid *= 0.86;
    mid += vmid * (1 - calm);
    mid = clamp(mid, 4.2, WORLD_H - 4.2);

    vgap += (rnd() - 0.5) * 0.5;
    vgap *= 0.82;
    gap += vgap;
    gap = clamp(gap, st.gap, st.gap + 3.2);
    const g = gap + calm * 2.2;

    ceil[x] = mid - g / 2;
    flr[x] = mid + g / 2;
  }

  repair(ceil, flr, W, st.gap);

  // ★ せまい ところを わざと 作る。
  //   さいころ まかせだと、むずかしい はずの どうくつなのに
  //   いちばん せまい ところが よゆうの ひろさ、という ことが おきた。
  const nPinch = 2 + Math.floor(si / 2);
  for (let i = 0; i < nPinch; i++) {
    const px = Math.floor(16 + (W - 34) * (i + 0.5 + (rnd() - 0.5) * 0.5) / nPinch);
    for (let d = -3; d <= 3; d++) {
      const x = px + d;
      if (x < 12 || x >= W - 12) continue;
      const k = (Math.cos(d / 3 * Math.PI) + 1) / 2;       // まんなかが いちばん せまい
      const m = (ceil[x] + flr[x]) / 2;
      const g0 = flr[x] - ceil[x];
      const g1 = g0 * (1 - k) + st.gap * k;
      ceil[x] = m - g1 / 2; flr[x] = m + g1 / 2;
    }
  }
  repair(ceil, flr, W, st.gap);

  // 出発の ばしょ と 着地パッド
  const startX = 4;
  const padX = W - 7;
  // パッドの ところは たいらに する
  const padY = flr[padX];
  for (let x = padX - 2; x <= padX + 2; x++) flr[x] = padY;

  // タレット（ゆかに くっついて まっすぐ 上に うつ）
  const turrets = [];
  for (let i = 0; i < st.tur; i++) {
    const x = Math.floor(18 + (W - 34) * (i + 0.5) / st.tur);
    turrets.push({ x: x + 0.5, y: flr[x] - 0.35, t: rnd() * TUR_PER, alive: true });
  }

  // とびら（すきまが せまく なったり ひろく なったり）
  const gates = [];
  for (let i = 0; i < st.gate; i++) {
    const x = Math.floor(24 + (W - 44) * (i + 0.5) / st.gate);
    gates.push({ x: x, t: rnd() * 3, per: 2.4 + rnd() * 1.2, amt: 0.34 + rnd() * 0.18 });
  }

  // ひろい ところを ならべて、そこに もの を おく。
  // ★ **タレットの まうえ と とびらの ところは よける**。
  //   さいしょ よけて いなくて、6どうくつめの クリスタルが タレットの
  //   まうえに あった。とりに 行くと 100% たまに あたる ので、
  //   ロボットは そこで 22回 つづけて こわれた。
  const spots = [];
  for (let x = 12; x < W - 12; x += 3) {
    let near = false;
    for (const t of turrets) if (Math.abs(x + 0.5 - t.x) < 2.6) near = true;
    for (const g of gates) if (Math.abs(x + 0.5 - g.x) < 4.0) near = true;
    if (near) continue;
    spots.push({ x: x + 0.5, y: (ceil[x] + flr[x]) / 2, gap: flr[x] - ceil[x] });
  }
  spots.sort((a, b) => b.gap - a.gap);

  const items = [];
  const use = spots.slice(0, st.cry + st.tank + 4);
  shuffle(use, rnd);
  for (let i = 0; i < st.cry; i++) {
    const sp = use[i];
    if (sp) items.push({ kind: 'cry', x: sp.x, y: sp.y, got: false });
  }
  for (let i = 0; i < st.tank; i++) {
    const sp = use[st.cry + i];
    if (sp) items.push({ kind: 'tank', x: sp.x, y: sp.y, got: false });
  }

  return {
    st, W, ceil, flr, items, turrets, gates,
    startX: startX + 0.5, startY: (ceil[startX] + flr[startX]) / 2,
    padX: padX + 0.5, padY,
  };
}

// すきま・へりからの はみ出し・きゅうな 段差を ならす
function repair(ceil, flr, W, MINGAP) {
  for (let pass = 0; pass < 3; pass++) {
    for (let x = 0; x < W; x++) {
      let c = ceil[x], f = flr[x];
      if (f - c < MINGAP) {
        const m = (c + f) / 2;
        c = m - MINGAP / 2; f = m + MINGAP / 2;
      }
      if (c < 1.2) { f += 1.2 - c; c = 1.2; }
      if (f > WORLD_H - 1.2) { c -= f - (WORLD_H - 1.2); f = WORLD_H - 1.2; }
      ceil[x] = clamp(c, 1.2, WORLD_H - 1.2 - MINGAP);
      flr[x] = clamp(f, ceil[x] + MINGAP, WORLD_H - 1.2);
    }
    // ★ 1ますで 大きく 上下すると 目に 見えない かべに ぶつかる。なめらかに。
    for (let x = 1; x < W; x++) {
      const lim = 0.85;
      if (ceil[x] - ceil[x - 1] > lim) ceil[x] = ceil[x - 1] + lim;
      if (ceil[x - 1] - ceil[x] > lim) ceil[x] = ceil[x - 1] - lim;
      if (flr[x] - flr[x - 1] > lim) flr[x] = flr[x - 1] + lim;
      if (flr[x - 1] - flr[x] > lim) flr[x] = flr[x - 1] - lim;
    }
  }
}

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
}

// --- どうくつを 読む -------------------------------------------------------------------
// とびらが しまって いる ぶんを 足した 「いまの」 天じょう・ゆか
function ceilAt(x) {
  const c = G.cave;
  const i = clamp(Math.floor(x), 0, c.W - 1);
  const j = clamp(i + 1, 0, c.W - 1);
  const k = clamp(x - i, 0, 1);
  let v = c.ceil[i] * (1 - k) + c.ceil[j] * k;
  v += gateAmt(x);
  return v;
}
function flrAt(x) {
  const c = G.cave;
  const i = clamp(Math.floor(x), 0, c.W - 1);
  const j = clamp(i + 1, 0, c.W - 1);
  const k = clamp(x - i, 0, 1);
  let v = c.flr[i] * (1 - k) + c.flr[j] * k;
  v -= gateAmt(x);
  return v;
}
// とびらは その ばしょの まわり 2ますに だけ きく。
// かえすのは 「天じょう と ゆか が それぞれ せまく なる ぶん」。
function gateAmt(x) {
  let best = 0;
  for (const g of G.cave.gates) {
    const d = Math.abs(x - g.x);
    if (d > 2.2) continue;
    const w = 1 - d / 2.2;
    // ★ 2乗して いるのは「しまって いる 時間を みじかく」する ため。
    //   ふつうの さいん波だと はんぶんの 時間 しまって いて、
    //   ロボットが とびらで 16回 天じょうに ぶつかった。
    const close = Math.pow((Math.sin(g.t / g.per * Math.PI * 2) + 1) / 2, 2);
    best = Math.max(best, w * close * g.amt);
  }
  if (best <= 0) return 0;
  const base = flrAt0(x) - ceilAt0(x);
  const maxClose = Math.max(0, (base - GATE_MIN) / 2);   // 上下 それぞれ ここまで
  return Math.min(best * base, maxClose);
}
function ceilAt0(x) {
  const c = G.cave, i = clamp(Math.round(x), 0, c.W - 1);
  return c.ceil[i];
}
function flrAt0(x) {
  const c = G.cave, i = clamp(Math.round(x), 0, c.W - 1);
  return c.flr[i];
}

// ふねが かべに あたって いるか（ふねの はばを 5てん 見る）
function hitsWall(x, y) {
  for (let i = -2; i <= 2; i++) {
    const sx = x + i * SHIP_R * 0.5;
    const dy = Math.sqrt(Math.max(0, SHIP_R * SHIP_R - (sx - x) * (sx - x)));
    if (y - dy < ceilAt(sx)) return 1;
    if (y + dy > flrAt(sx)) return 2;
  }
  return 0;
}

// --- ゲームの なかみ -------------------------------------------------------------------
const G = {
  screen: 'title', t: 0,
  si: 0, cave: null,
  x: 0, y: 0, vx: 0, vy: 0, ang: 0, aim: 0,
  fuel: FUEL_MAX, thrusting: false,
  cry: 0, cryAll: 0, lives: 3, time: 0,
  bullets: [], parts: [], pops: [],
  camX: 0, camY: 0, shake: 0,
  dead: 0, over: false, win: false, msg: '', msgT: 0, lowT: 0,
};

function startStage(i) {
  audioStart();
  G.si = i;
  G.cave = buildCave(i);
  G.lives = 3; G.cry = 0; G.cryAll = G.cave.items.filter((it) => it.kind === 'cry').length;
  G.time = 0;
  G.over = false; G.win = false;
  save.plays++; storeSave();
  G.screen = 'play';
  respawn(true);
  G.msg = STAGES[i].name + '　クリスタル ' + G.cryAll + 'こ あつめて パッドに 着地！';
  G.msgT = 2.6;
}

function respawn(fresh) {
  const c = G.cave;
  if (fresh) for (const it of c.items) it.got = false;
  G.cry = fresh ? 0 : G.cry;
  G.x = c.startX; G.y = c.startY;
  G.vx = 0; G.vy = 0; G.ang = 0; G.aim = 0;
  G.fuel = FUEL_MAX;
  G.bullets.length = 0;
  G.dead = 0;
  G.camX = G.x; G.camY = G.y;
  sfxThrustOff();
  G.thrusting = false;
}

function pop(text, col) { G.pops.push({ text, col, x: G.x, y: G.y, t: 0 }); }
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * (sp || 6);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, t: 0, life: 0.7 });
  }
}

function crash(why) {
  if (G.dead > 0 || G.over) return;
  G.dead = 1.5;
  G.lives--;
  sfxThrustOff(); G.thrusting = false;
  sfxCrash();
  G.shake = 16;
  burst(G.x, G.y, '#FFB86A', 22, 9);
  burst(G.x, G.y, '#FF6A6A', 14, 6);
  G.msg = why; G.msgT = 1.8;
  if (G.lives <= 0) { G.over = true; G.win = false; }
}

function tryLand() {
  const c = G.cave;
  const sp = Math.hypot(G.vx, G.vy);
  const tilt = Math.abs(angDiff(G.ang, 0));
  const landV = save.easy ? LAND_V + 1.4 : LAND_V;
  const landA = save.easy ? LAND_A + 0.30 : LAND_A;
  if (G.cry < G.cryAll) {
    G.msg = 'クリスタルが あと ' + (G.cryAll - G.cry) + 'こ！'; G.msgT = 1.4;
    return false;
  }
  if (sp > landV) { crash('速すぎて こわれた…（そっと おりよう）'); return false; }
  if (tilt > landA) { crash('かたむいて こわれた…（まっすぐ おりよう）'); return false; }
  G.win = true; G.over = true;
  sfxThrustOff(); G.thrusting = false;
  sfxLand(); sfxWin();
  save.clear['s' + G.si] = 1;
  const t = Math.round(G.time);
  if (!save.best['s' + G.si] || save.best['s' + G.si] > t) save.best['s' + G.si] = t;
  storeSave();
  return true;
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// --- まいコマ ---------------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; sfxThrustOff(); return; }
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);

  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += GRAV * 0.5 * dt;
    if (q.t > q.life) G.parts.splice(i, 1);
  }
  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t += dt;
    if (G.pops[i].t > 0.9) G.pops.splice(i, 1);
  }

  const c = G.cave;
  for (const g of c.gates) g.t += dt;

  if (G.over) { sfxThrustOff(); IN.taps.length = 0; IN.fireTap = false; return; }

  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) respawn(false);
    IN.taps.length = 0; IN.fireTap = false;
    return;
  }

  G.time += dt;

  // --- そうさ ---
  let ax = 0, ay = 0;
  const easy = !!save.easy;
  const stick = IN.hold && (Math.abs(IN.ax) > 0.18 || Math.abs(IN.ay) > 0.18);
  const k = keyDir();
  let aimed = false;
  if (stick) {
    G.aim = Math.atan2(IN.ax, -IN.ay);           // 上が 0、右まわりに ふえる
    aimed = true;
  } else if (k) {
    if (k === 'u') G.aim = 0;
    else if (k === 'd') G.aim = Math.PI;
    else if (k === 'l') G.aim = -Math.PI / 2;
    else if (k === 'r') G.aim = Math.PI / 2;
    aimed = true;
  } else if (easy) {
    G.aim = 0;                                   // ★ はなすと 機首は 上へ もどる
  }
  // むきが かわる
  const dA = angDiff(G.aim, G.ang);
  const step = (easy ? TURN_EASY : TURN) * dt;
  G.ang += Math.abs(dA) < step ? dA : Math.sign(dA) * step;

  // ★ かんたんでは **スティックを たおすだけで ふく**（1本ゆびで あそべる）。
  //   ボタンでも ふけるので、そのときは 機首（＝上）の ほうへ。
  const want = (IN.fire || (easy && aimed)) && G.fuel > 0;
  if (want && !G.thrusting) sfxThrustOn();
  if (!want && G.thrusting) sfxThrustOff();
  G.thrusting = want;
  if (want) {
    // かんたんは「入れた ほう」へ そのまま おされる（まわりきるのを 待たない）
    const dir = easy && aimed ? G.aim : G.ang;
    ax += Math.sin(dir) * THRUST;
    ay += -Math.cos(dir) * THRUST;
    G.fuel = Math.max(0, G.fuel - FUEL_BURN * dt);
    if (G.fuel < 25) {
      G.lowT -= dt;
      if (G.lowT <= 0) { sfxLow(); G.lowT = 0.55; }
    }
    // ふんしゃの ほのお
    if (Math.random() < 0.7) {
      G.parts.push({
        x: G.x - Math.sin(G.ang) * SHIP_R, y: G.y + Math.cos(G.ang) * SHIP_R,
        vx: -Math.sin(G.ang) * 5 + (Math.random() - 0.5),
        vy: Math.cos(G.ang) * 5 + (Math.random() - 0.5),
        col: Math.random() < 0.5 ? '#FFD24A' : '#FF8A3A', t: 0, life: 0.22,
      });
    }
  }
  ay += easy ? GRAV_EASY : GRAV;

  G.vx += ax * dt; G.vy += ay * dt;
  G.vx -= G.vx * DRAG * dt; G.vy -= G.vy * DRAG * dt;
  const sp = Math.hypot(G.vx, G.vy);
  if (sp > MAX_V) { G.vx = G.vx / sp * MAX_V; G.vy = G.vy / sp * MAX_V; }

  const nx = G.x + G.vx * dt, ny = G.y + G.vy * dt;

  // パッドに ついたか（ゆかの すぐ 上、パッドの まうえ）
  const onPad = Math.abs(nx - c.padX) < 1.5 && ny + SHIP_R >= c.padY - 0.06;
  if (onPad) {
    G.x = nx; G.y = c.padY - SHIP_R;
    if (tryLand()) return;
    if (G.dead > 0) return;
    G.vy = 0; G.vx *= 0.5;
  } else {
    const h = hitsWall(nx, ny);
    if (h) {
      G.x = nx; G.y = ny;
      crash(h === 1 ? '天じょうに ぶつかった！' : 'ゆかに ぶつかった！');
      return;
    }
    G.x = nx; G.y = ny;
  }
  if (G.x < 0.6) { G.x = 0.6; G.vx = Math.abs(G.vx) * 0.3; }
  if (G.x > c.W - 0.6) { G.x = c.W - 0.6; G.vx = -Math.abs(G.vx) * 0.3; }

  // --- もの を とる ---
  for (const it of c.items) {
    if (it.got) continue;
    if (Math.hypot(it.x - G.x, it.y - G.y) < SHIP_R + 0.42) {
      it.got = true;
      if (it.kind === 'cry') {
        G.cry++; save.cry++; storeSave(); sfxCry();
        pop('クリスタル ' + G.cry + '/' + G.cryAll, '#8AE0F0');
        if (G.cry >= G.cryAll) { G.msg = 'ぜんぶ あつめた！ パッドに そっと 着地しよう'; G.msgT = 2.4; }
      } else {
        G.fuel = Math.min(FUEL_MAX, G.fuel + TANK_FUEL); sfxTank();
        pop('ねんりょう +' + TANK_FUEL, '#8AF0B0');
      }
      burst(it.x, it.y, it.kind === 'cry' ? '#8AE0F0' : '#8AF0B0', 8, 4);
    }
  }

  // --- タレット（まっすぐ 上に うつ） ---
  for (const tu of c.turrets) {
    if (!tu.alive) continue;
    if (Math.abs(tu.x - G.x) > VIEW_H) continue;          // 見えて いる ぶんだけ
    tu.t += dt;
    if (tu.t > TUR_PER) {
      tu.t = 0;
      const room = flrAt0(tu.x) - ceilAt0(tu.x);
      G.bullets.push({
        x: tu.x, y: flrAt0(tu.x) - 0.5, vx: 0, vy: -TUR_V, t: 0, d: 0,
        maxD: Math.min(TUR_RANGE, room * TUR_RANGE_K),
      });
      sfxShot();
    }
  }
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
    b.d = (b.d || 0) + Math.hypot(b.vx, b.vy) * dt;
    if (b.d > (b.maxD || TUR_RANGE) || b.t > 4 || b.y < ceilAt(b.x) || b.y > flrAt(b.x)) {
      G.bullets.splice(i, 1); continue;
    }
    if (Math.hypot(b.x - G.x, b.y - G.y) < SHIP_R + 0.16) {
      G.bullets.splice(i, 1);
      crash('たまに あたった！');
      return;
    }
  }

  // --- カメラ ---
  const tx = G.x + clamp(G.vx * 0.28, -3, 3);
  G.camX += (tx - G.camX) * Math.min(1, dt * 6);
  G.camY += (G.y - G.camY) * Math.min(1, dt * 5);
  G.camY = clamp(G.camY, VIEW_H / 2, WORLD_H - VIEW_H / 2);

  IN.taps.length = 0;
  IN.fireTap = false;
}

// --- 絵 ---------------------------------------------------------------------------------
function U() { return (VH - HUD - 6) / VIEW_H; }        // 1ユニットの ピクセル
function sx(x) { return VW / 2 + (x - G.camX) * U(); }
function sy(y) { return HUD + 6 + (y - (G.camY - VIEW_H / 2)) * U(); }

function drawPlay() {
  const c = G.cave, u = U();
  const g = ctx.createLinearGradient(0, HUD, 0, VH);
  g.addColorStop(0, '#1A1030'); g.addColorStop(1, '#0C0818');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  // 見えて いる はんい
  const x0 = Math.max(0, Math.floor(G.camX - VW / 2 / u) - 2);
  const x1 = Math.min(c.W - 1, Math.ceil(G.camX + VW / 2 / u) + 2);

  // どうくつの いわ
  ctx.fillStyle = '#4A3A62';
  ctx.beginPath();
  ctx.moveTo(sx(x0), sy(-4));
  for (let x = x0; x <= x1; x += 0.5) ctx.lineTo(sx(x), sy(ceilAt(x)));
  ctx.lineTo(sx(x1), sy(-4));
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx(x0), sy(WORLD_H + 4));
  for (let x = x0; x <= x1; x += 0.5) ctx.lineTo(sx(x), sy(flrAt(x)));
  ctx.lineTo(sx(x1), sy(WORLD_H + 4));
  ctx.closePath(); ctx.fill();

  // へりの ひかり
  ctx.strokeStyle = '#8A6ACF'; ctx.lineWidth = Math.max(2, u * 0.10);
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 0.5) {
    if (x === x0) ctx.moveTo(sx(x), sy(ceilAt(x))); else ctx.lineTo(sx(x), sy(ceilAt(x)));
  }
  ctx.stroke();
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 0.5) {
    if (x === x0) ctx.moveTo(sx(x), sy(flrAt(x))); else ctx.lineTo(sx(x), sy(flrAt(x)));
  }
  ctx.stroke();

  // 着地パッド
  if (c.padX > x0 - 3 && c.padX < x1 + 3) {
    const on = G.cry >= G.cryAll;
    ctx.fillStyle = on ? '#8AF0B0' : '#6A6A8A';
    rr(sx(c.padX - 1.4), sy(c.padY) - u * 0.22, u * 2.8, u * 0.30, u * 0.12); ctx.fill();
    for (const s of [-1, 1]) {
      ctx.fillStyle = on ? '#FFD24A' : '#4A4A66';
      rr(sx(c.padX + s * 1.4) - u * 0.09, sy(c.padY) - u * 0.9, u * 0.18, u * 0.7, u * 0.06); ctx.fill();
      if (on) { circle(sx(c.padX + s * 1.4), sy(c.padY) - u * 0.95, u * 0.14); ctx.fill(); }
    }
    bigText(on ? 'ここに おりよう' : 'クリスタルを あつめて',
            sx(c.padX), sy(c.padY) - u * 1.6, Math.round(u * 0.42),
            on ? '#8AF0B0' : 'rgba(200,190,230,0.7)', null);
  }

  // とびら。★ さいしょは 小さな しるしだけで、しまって いるのか
  //   あいて いるのか 見て わからなかった。いまは **のびちぢみする 板**に して、
  //   どれだけ ふさいで いるかを そのまま かたちで 見せる。
  for (const gt of c.gates) {
    if (gt.x < x0 - 3 || gt.x > x1 + 3) continue;
    const close = Math.pow((Math.sin(gt.t / gt.per * Math.PI * 2) + 1) / 2, 2);
    const col = close > 0.45 ? '#E85A6A' : '#B06A8A';
    const px = sx(gt.x), w = u * 0.72;
    const rawC = sy(ceilAt0(gt.x)), rawF = sy(flrAt0(gt.x));
    const curC = sy(ceilAt(gt.x)), curF = sy(flrAt(gt.x));
    ctx.fillStyle = col;
    rr(px - w / 2, rawC - u * 0.1, w, Math.max(u * 0.26, curC - rawC + u * 0.1), u * 0.12); ctx.fill();
    rr(px - w / 2, Math.min(curF, rawF - u * 0.26), w,
       Math.max(u * 0.26, rawF - curF) + u * 0.1, u * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    rr(px - w / 2, curC - u * 0.14, w, u * 0.12, u * 0.06); ctx.fill();
    rr(px - w / 2, curF + u * 0.02, w, u * 0.12, u * 0.06); ctx.fill();
  }

  // タレット（まっすぐ 上に うつ。うつ 前に 光って 教える）
  for (const tu of c.turrets) {
    if (tu.x < x0 - 2 || tu.x > x1 + 2) continue;
    const px = sx(tu.x), py = sy(flrAt0(tu.x));
    const warn = tu.t > TUR_PER - TUR_WARN;
    ctx.fillStyle = '#7A8AA8';
    rr(px - u * 0.32, py - u * 0.44, u * 0.64, u * 0.46, u * 0.10); ctx.fill();
    ctx.strokeStyle = warn ? '#FF6A6A' : '#C8A060';
    ctx.lineWidth = Math.max(2, u * 0.16);
    ctx.beginPath();
    ctx.moveTo(px, py - u * 0.40); ctx.lineTo(px, py - u * 0.95);
    ctx.stroke();
    if (warn) {                       // うつ みちすじを うっすら 見せる
      ctx.save();
      ctx.globalAlpha = 0.20 + 0.25 * Math.sin(G.t * 24);
      ctx.fillStyle = '#FF6A6A';
      const reach = Math.min(TUR_RANGE, (flrAt0(tu.x) - ceilAt0(tu.x)) * TUR_RANGE_K);
      const topY = Math.max(sy(ceilAt(tu.x)), py - u * (0.5 + reach));
      ctx.fillRect(px - u * 0.13, topY, u * 0.26, py - u * 0.9 - topY);
      ctx.restore();
    }
    ctx.fillStyle = warn ? '#FF6A6A' : '#3A4A68';
    circle(px, py - u * 0.40, u * 0.14); ctx.fill();
  }

  // もの
  for (const it of c.items) {
    if (it.got) continue;
    const px = sx(it.x), py = sy(it.y) + Math.sin(G.t * 3 + it.x) * u * 0.10;
    if (it.kind === 'cry') {
      ctx.fillStyle = '#8AE0F0';
      ctx.beginPath();
      ctx.moveTo(px, py - u * 0.42); ctx.lineTo(px + u * 0.28, py);
      ctx.lineTo(px, py + u * 0.42); ctx.lineTo(px - u * 0.28, py);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(px, py - u * 0.42); ctx.lineTo(px + u * 0.28, py); ctx.lineTo(px, py);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#8AF0B0';
      rr(px - u * 0.26, py - u * 0.34, u * 0.52, u * 0.68, u * 0.14); ctx.fill();
      ctx.fillStyle = '#2A5A3A';
      bigText('F', px, py, Math.round(u * 0.44), '#1E4A2E', null);
    }
  }

  // たま（とどく 高さが 近づくと うすく なる ＝ ここまで しか 来ない）
  for (const b of G.bullets) {
    const k = 1 - clamp((b.d || 0) / (b.maxD || TUR_RANGE), 0, 1);
    ctx.globalAlpha = 0.35 + k * 0.65;
    ctx.fillStyle = '#FF8A5A';
    circle(sx(b.x), sy(b.y), u * (0.10 + k * 0.07)); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // つぶ
  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
    ctx.fillStyle = q.col;
    circle(sx(q.x), sy(q.y), u * 0.11); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ふね
  if (G.dead <= 0) drawShip(sx(G.x), sy(G.y), u, G.ang, G.thrusting);

  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9);
    bigText(q.text, sx(q.x), sy(q.y) - q.t * 40, 16, q.col);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawHud();
  drawStick();
  drawFire(save.easy ? '上へ' : 'ふんしゃ', '#FFD24A');

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    const fs = fitSize(G.msg, VW * 0.84, 19);
    const w = VW * 0.88;
    ctx.fillStyle = 'rgba(10,6,22,0.78)';
    rr(VW / 2 - w / 2, HUD + 8, w, 30, 15); ctx.fill();
    bigText(G.msg, VW / 2, HUD + 23, fs, '#FFF6C8', null);
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'ちゃくりく せいこう！' : 'ゲームオーバー',
      [G.win ? 'かかった 時間 ' + G.time.toFixed(1) + 'びょう　のこり ねんりょう ' + Math.round(G.fuel)
             : 'クリスタル ' + G.cry + ' / ' + G.cryAll + ' で おわり',
       G.win ? STAGES[G.si].name + ' を こえた！' : 'ふねが 3きとも こわれた'],
      G.win && G.si + 1 < STAGES.length
        ? [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'つぎの どうくつ', on: () => startStage(G.si + 1), col: '#8AF0B0' },
           { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawShip(px, py, u, ang, fire) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  const s = u * 0.52;
  if (fire) {
    ctx.fillStyle = '#FF9A3A';
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, s * 0.7);
    ctx.lineTo(0, s * (1.3 + Math.random() * 0.6));
    ctx.lineTo(s * 0.34, s * 0.7);
    ctx.closePath(); ctx.fill();
  }
  // 本体。★ どうくつの 中は くらいので、ふちを つけて 見えやすく する。
  ctx.strokeStyle = 'rgba(140,200,255,0.55)';
  ctx.lineWidth = Math.max(2, s * 0.22);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.15);
  ctx.lineTo(s * 0.72, s * 0.62);
  ctx.lineTo(s * 0.30, s * 0.72);
  ctx.lineTo(-s * 0.30, s * 0.72);
  ctx.lineTo(-s * 0.72, s * 0.62);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#E8ECF4';
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.15);
  ctx.lineTo(s * 0.72, s * 0.62);
  ctx.lineTo(s * 0.30, s * 0.72);
  ctx.lineTo(-s * 0.30, s * 0.72);
  ctx.lineTo(-s * 0.72, s * 0.62);
  ctx.closePath(); ctx.fill();
  // まど（エイトくんが 見える）
  ctx.fillStyle = '#4AA0E0';
  circle(0, -s * 0.24, s * 0.36); ctx.fill();
  ctx.fillStyle = '#F6CDA8';
  circle(0, -s * 0.24, s * 0.22); ctx.fill();
  ctx.fillStyle = '#E8506A';
  ctx.beginPath(); ctx.arc(0, -s * 0.30, s * 0.23, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(-s * 0.08, -s * 0.20, s * 0.05); ctx.fill();
  circle(s * 0.08, -s * 0.20, s * 0.05); ctx.fill();
  // あし
  ctx.strokeStyle = '#8A94AC'; ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, s * 0.6); ctx.lineTo(-s * 0.62, s * 1.0);
  ctx.moveTo(s * 0.36, s * 0.6); ctx.lineTo(s * 0.62, s * 1.0);
  ctx.stroke();
  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(10,6,22,0.85)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  // ねんりょう
  const bw = Math.min(150, VW * 0.18), bh = 13, bx = 10, by = HUD / 2 - bh / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(bx, by, bw, bh, bh / 2); ctx.fill();
  const k = G.fuel / FUEL_MAX;
  ctx.fillStyle = k < 0.25 ? '#FF6A8A' : k < 0.5 ? '#FFD24A' : '#8AF0B0';
  rr(bx + 2, by + 2, Math.max(0, (bw - 4) * k), bh - 4, (bh - 4) / 2); ctx.fill();
  ctx.fillStyle = '#F0EAFF';
  ctx.fillText('ねんりょう', bx + bw + 8, HUD / 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = G.cry >= G.cryAll ? '#8AF0B0' : '#8AE0F0';
  ctx.fillText('クリスタル ' + G.cry + ' / ' + G.cryAll, VW / 2, HUD / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F0EAFF';
  const prog = Math.round(clamp(G.x / (G.cave.W - 8), 0, 1) * 100);
  // ★ ▲を のこりの かず だけ ならべる。かならず かず を かぎる こと。
  //   テストで のこりを 99に した とき、▲が 99こ ならんで HUDが うまった。
  const lv = clamp(G.lives, 0, 9);
  ctx.fillText('のこり ' + '▲'.repeat(lv) + '　' + prog + '%', VW - 10, HUD / 2);

  // はやさの めやす（着地の とき 大事）
  const sp = Math.hypot(G.vx, G.vy);
  const okSp = sp <= (save.easy ? LAND_V + 1.4 : LAND_V);
  ctx.textAlign = 'right'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = okSp ? 'rgba(138,240,176,0.9)' : 'rgba(255,140,140,0.9)';
  ctx.fillText('はやさ ' + sp.toFixed(1) + (okSp ? '（おりられる）' : '（速い）'),
               VW - 10, HUD + 14);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  G.cave = null;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#241844'); g.addColorStop(1, '#0C0818');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = '#4A3A62';
  ctx.beginPath();
  ctx.moveTo(-VW, VH); ctx.lineTo(-VW, VH * 0.82);
  for (let i = 0; i <= 24; i++) {
    ctx.lineTo(-VW + (VW * 3) * i / 24, VH * (0.82 + Math.sin(i * 0.9) * 0.05));
  }
  ctx.lineTo(VW * 2, VH); ctx.closePath(); ctx.fill();

  bigText('エイトくんの', VW / 2, 26, 17, '#FFD8A8', null);
  bigText('どうくつ探検', VW / 2, 56, fitSize('どうくつ探検', VW * 0.4, 36), '#FFD24A');
  const sub = save.easy
    ? 'スティックを たおした ほうへ とぶ！ 1本ゆびで あそべる・全10どうくつ'
    : 'むきを きめて ふんしゃ！ いきおいを かんがえて とぶ・全10どうくつ';
  bigText(sub, VW / 2, 88, fitSize(sub, VW * 0.9, 15), '#CFC8E8', null);

  drawShip(VW * 0.12, VH * 0.60, 34, Math.sin(G.t) * 0.5, true);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 112, startStage, '#FFD24A');

  const sw = Math.min(140, VW * 0.18);
  drawButton(button(VW / 2 - sw * 1.5 - 12, y + 8, sw, 38, () => { G.screen = 'howto'; }),
             'あそびかた', '#FFE0B0');
  // ★ そうさの きりかえ。ふつうは「かんたん」。
  drawButton(button(VW / 2 - sw * 0.5, y + 8, sw, 38,
                    () => { save.easy = save.easy ? 0 : 1; storeSave(); }),
             save.easy ? 'そうさ かんたん' : 'そうさ むずかしい',
             save.easy ? '#8AE0A0' : '#FF9A6A');
  drawButton(button(VW / 2 + sw * 0.5 + 12, y + 8, sw, 38, () => { audioStart(); sfxCry(); }),
             '♪ おと', '#FFE0B0');
  bigText('あそんだ かず ' + save.plays + '　あつめた クリスタル ' + save.cry,
          VW / 2, VH - 12, 13, 'rgba(230,220,255,0.7)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(230,220,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  G.cave = null;
  ctx.fillStyle = '#1C1636';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 30, 24, '#FFF6C8');
  const lines = save.easy ? [
    '【そうさ かんたん】',
    '① 左の スティックを **たおした ほうへ そのまま とぶ**。1本ゆびで OK',
    '② はなすと ふかすのを やめて、機首は 上に もどる',
    '③ 右の「上へ」ボタンでも 上に ふける（ホバリング）',
    '④ はなしても すぐには 止まらない。いつも 少し 先を 考えて うごかす',
    '⑤ かべに あたると こわれる。ふねは 3きまで',
    '⑥ 青い クリスタルを ぜんぶ あつめると、パッドが 緑に 光る',
    '⑦ パッドに そっと おりたら クリア（右上の「はやさ」が 緑なら OK）',
    '⑧ ねんりょうは ふかして いる あいだ だけ へる。F の タンクで 足せる',
    '⑨ もっと むずかしく したい ときは タイトルで「そうさ むずかしい」に',
  ] : [
    '【そうさ むずかしい】もとの スラスト そうさ',
    '① 左の スティックで **むきを きめる**。ふねは そっちを ゆっくり 向く',
    '② 右の「ふんしゃ」で 向いて いる ほうへ おされる（2本ゆび）',
    '③ ボタンを はなしても すぐには 止まらない。いつも 下に 引っぱられて いる',
    '④ かべに あたると こわれる。ふねは 3きまで',
    '⑤ 青い クリスタルを ぜんぶ あつめると、パッドが 緑に 光る',
    '⑥ パッドに **そっと まっすぐ** おりたら クリア（速いと こわれる）',
    '⑦ 画面右上の「はやさ」が 緑なら おりられる ぐらい ゆっくり',
    '⑧ ねんりょうは ふかして いる あいだ だけ へる。F の タンクで 足せる',
    '⑨ パソコンなら ← → ↑ ↓ で むき、スペースで ふんしゃ',
  ];
  lines.forEach((s2, i) => bigText(s2.replace(/\*\*/g, ''), VW / 2, 58 + i * 26,
                                   fitSize(s2.replace(/\*\*/g, ''), VW * 0.94, 14), '#CFE8FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 44, bw, 38, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
