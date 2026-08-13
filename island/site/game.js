// エイトくんの ぼうけん島
//
// ★ 1980年代の「ぼうけん島」もの。**南の島**が ぶたい。
//   たいりょくが つねに へるので、走りながら フルーツを 食べつづける。
//
// ★ 島らしさを ぜんぶ 入れた:
//   ・すな／ジャングル／いわば／かざん／さんご／こおり／しつげん／
//     どうくつ／そらの いせき／しろ … めんの 名まえの とおりの 地けい
//   ・へび・さかな・タコ・むし・カニ・コウモリ・ハチ・スライム・落ちる岩
//   ・**天気が かわる**（はれ→くもり→あめ→かみなり→きり→よる）。
//     かみなりは 地めんに 落ちる。落ちる ところに まるい しるしが 出る
//   ・**どの めんにも ボス**が いる。たおすと ゴールが ひらく
//
// ★ ジャンプを ていねいに した（「ぎこちない」と 言われた ので）:
//   ・よこは **じわっと 加速／げんそく**する（前は 速さが パッと きりかわった）
//   ・**コヨーテ時間** … 足場を すぎた あとも 0.1びょうは ジャンプできる
//   ・**さきおし** … 着地の 0.12びょう前に おしても ちゃんと とぶ
//   ・**てっぺんは ゆっくり** … 上がりきる あたりだけ 重力を 弱く する
//   ・上がる ときと 落ちる ときで 重力が ちがう（落ちは 速い）
//   ・ボタンを はなすと そこで 上がるのを やめる（高さを 決められる）
//
// ★ こうげきは 4つ:
//   ふみつけ ／ スライディング（下に 入れる）／ なげもの（おの・ブーメラン・
//   ばくだん）／ スケボー とっしん
//
// ★ めんは その場で 作る。かたまり（チャンク）を つなぐ やりかたなので
//   ジャンプで こえられない ところが できない。おなじ めんは いつも おなじ。

'use strict';

const GAME_VER = 2;
const HUD = 30;

// --- 大きさ と 物理 ------------------------------------------------------------------
const TILES_Y = 10;                  // 画面に 見える たての マス数（★ 10 に して キャラを 大きく）
const LV_H = 16;                     // めんの たての マス数（画面より 高い ＝ たてにも スクロール）
const PW = 0.76, PH = 1.04;          // エイトくんの 大きさ（マス）

// よこ
const RUN = 8.0;                     // さいこう そくど
const RUN_ACC = 72, RUN_FRIC = 62;   // 地めんでの 加速・げんそく
const AIR_ACC = 42, AIR_FRIC = 10;   // 空中は ききにくい
const ICE_ACC = 22, ICE_FRIC = 6;    // こおりは すべる
const MUD_MUL = 0.55;                // どろは おそい
const BOARD = 11.6;                  // スケボー

// たて
const JUMP_V = -16.0;                // 高さ 約3.2マス
const GRAV_UP = 40, GRAV_DN = 62, GRAV_CUT = 96, MAX_FALL = 30;
const APEX_V = 3.2, APEX_MUL = 0.55; // てっぺん あたりは ふわっと
const COYOTE = 0.10, BUFFER = 0.12;

// スライディング
// ★ 天じょうの ひくい ところは 5マス あるので、すべって 4.5マスだと
//   とちゅうで 立って つかえた。0.42びょう（5.3マス）に する。
const SLIDE_T = 0.42, SLIDE_V = 12.6, SLIDE_CD = 0.42;
const SLIDE_H = 0.56;                // すべって いる あいだの 高さ

// たいりょく
const LIFE_MAX = 100;
const FRUIT_HEAL = 8, BIGFRUIT_HEAL = 30;

const WEAPONS = {
  AXE:  { name: 'おの', ammo: 6, col: '#C8A060' },
  BOOM: { name: 'ブーメラン', ammo: 5, col: '#8AE0C0' },
  BOMB: { name: 'ばくだん', ammo: 4, col: '#FF8A5A' },
};
const WEP_KEYS = ['AXE', 'BOOM', 'BOMB'];

// --- めん ----------------------------------------------------------------------------
//
// theme … 地けいの 作りかた（名まえの とおりに する）
// drain … たいりょくの へる はやさ（★ むずかしく して ほしいと 言われた ので 上げた）
// foes  … その 島に 出る てき
// wx    … 天気の ながれ（じかんで かわる）
// boss  … さいごに 出る ボス

const STAGES = [
  { name: 'はじまりの すなはま', theme: 'beach', len: 170, hard: 0, drain: 5.6,
    foes: ['CRAB', 'BLOB', 'FISH'], wx: ['sun', 'cloud'], boss: 'CRAB_KING' },
  { name: 'やしの ジャングル', theme: 'jungle', len: 185, hard: 1, drain: 6.0,
    foes: ['SNAKE', 'BUG', 'BLOB'], wx: ['sun', 'rain'], boss: 'BEE_QUEEN' },
  { name: 'いわばの さか', theme: 'rock', len: 195, hard: 1, drain: 6.4,
    foes: ['BLOB', 'CRAB', 'ROCK'], wx: ['cloud', 'rain', 'storm'], boss: 'GOLEM' },
  { name: 'かざんの たに', theme: 'volcano', len: 205, hard: 2, drain: 6.8,
    foes: ['BAT', 'BLOB', 'ROCK'], wx: ['storm', 'cloud'], boss: 'LAVA_SNAKE' },
  { name: 'さんごの みずうみ', theme: 'lagoon', len: 210, hard: 2, drain: 7.0,
    foes: ['FISH', 'OCTO', 'CRAB'], wx: ['sun', 'rain', 'storm'], boss: 'OCTO_KING' },
  { name: 'こおりの がけ', theme: 'ice', len: 215, hard: 3, drain: 7.4,
    foes: ['BAT', 'BEE', 'BLOB'], wx: ['fog', 'cloud', 'storm'], boss: 'ICE_OWL' },
  { name: 'どくの しつげん', theme: 'swamp', len: 220, hard: 3, drain: 7.8,
    foes: ['SNAKE', 'BUG', 'OCTO'], wx: ['fog', 'rain', 'storm'], boss: 'FROG' },
  { name: 'ようがんの どうくつ', theme: 'cave', len: 225, hard: 4, drain: 8.2,
    foes: ['BAT', 'ROCK', 'SNAKE'], wx: ['night'], boss: 'BAT_KING' },
  { name: 'そらの いせき', theme: 'sky', len: 230, hard: 4, drain: 8.6,
    foes: ['BEE', 'BUG', 'BAT'], wx: ['cloud', 'storm', 'sun'], boss: 'STONE_BIRD' },
  { name: 'まおうの しろ', theme: 'castle', len: 240, hard: 5, drain: 9.0,
    foes: ['BAT', 'SNAKE', 'CRAB', 'BEE'], wx: ['storm', 'night'], boss: 'DEMON' },
];

const THEMES = {
  beach:   { sky: ['#5AC8F0', '#BFF0E8'], gnd: '#E0C088', gnd2: '#B89858', deco: '#3EA85E',
             water: '#3AA8D8' },
  jungle:  { sky: ['#4AB8D8', '#A8E8B8'], gnd: '#8A6A44', gnd2: '#5E4830', deco: '#2E9A52',
             water: '#3A9AC0' },
  rock:    { sky: ['#7A9AC0', '#CFE0F0'], gnd: '#9A8A78', gnd2: '#6A5E52', deco: '#7A8A6A',
             water: '#4A8AB8' },
  volcano: { sky: ['#E08A4A', '#F0C88A'], gnd: '#8A5A44', gnd2: '#5A3828', deco: '#C85A3A',
             water: '#E86A2A' },
  lagoon:  { sky: ['#5AD8F0', '#CFF8F0'], gnd: '#E8D0A0', gnd2: '#C0A070', deco: '#FF8AB0',
             water: '#2AC0D8' },
  ice:     { sky: ['#A8D8F0', '#EAF6FF'], gnd: '#CFE4F4', gnd2: '#8FB4D0', deco: '#FFFFFF',
             water: '#5AA8D8' },
  swamp:   { sky: ['#6A7A5A', '#B0C098'], gnd: '#5E6A44', gnd2: '#3E4A2E', deco: '#8AA84E',
             water: '#4A6A3E' },
  cave:    { sky: ['#241428', '#4A2838'], gnd: '#6A4A48', gnd2: '#3E2A2E', deco: '#A05A48',
             water: '#E86A2A' },
  sky:     { sky: ['#3A5AC0', '#A8C8F8'], gnd: '#C8C0E0', gnd2: '#8E86AE', deco: '#FFE08A',
             water: '#6A8AD8' },
  castle:  { sky: ['#2E1E4E', '#6A3A8A'], gnd: '#5A4A78', gnd2: '#3A2E52', deco: '#C8A8F0',
             water: '#8A3AC0' },
};

// --- セーブ ---------------------------------------------------------------------------
const SAVE_KEY = 'island.save.v1';
const save = { clear: {}, best: {}, plays: 0, fruit: 0, boss: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.fruit)) save.fruit = s.fruit;
  if (Number.isFinite(s.boss)) save.boss = s.boss;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- さいころ（おなじ めんは いつも おなじ） ---------------------------------------
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

// --- めんを 作る --------------------------------------------------------------------
//
// マス … '.' から / '#' つち / '^' トゲ / 'W' 水 / 'L' ようがん
//        '=' うすい足場 / 'I' こおり（すべる）/ 'M' どろ（おそい）
//        'B' こわせる ブロック / 'V' つた（のぼれる）
//        'f' フルーツ / 'F' 大フルーツ / 'e' たまご
//
// ★ めんの 名まえの とおりの かたまりを つなぐ。テーマごとに 出る ものが ちがう ので、
//   「どの めんも おなじ」に ならない。

const KINDS = {
  beach:   ['flat', 'water', 'palm', 'stepUp', 'stepDn', 'pit', 'raft', 'palm'],
  jungle:  ['flat', 'vine', 'canopy', 'pit', 'stepUp', 'log', 'canopy', 'vine'],
  rock:    ['flat', 'stairs', 'stepUp', 'stepDn', 'boulder', 'pit', 'spike', 'stairs'],
  volcano: ['lava', 'lava', 'crumble', 'spike', 'lava', 'stepUp', 'flat', 'ceil'],
  lagoon:  ['water', 'lily', 'water', 'coral', 'raft', 'lily', 'flat', 'coral'],
  ice:     ['iceflat', 'iceflat', 'iceslide', 'pit', 'iceflat', 'stepDn', 'spike', 'iceslide'],
  swamp:   ['mud', 'mud', 'pit', 'mud', 'vine', 'spike', 'water', 'flat'],
  cave:    ['lava', 'ceil', 'ceil', 'crumble', 'flat', 'spike', 'lava', 'pit'],
  sky:     ['floatA', 'floatB', 'flat', 'floatA', 'pit', 'floatB', 'stepUp', 'floatA'],
  castle:  ['flat', 'spike', 'crumble', 'stairs', 'pit', 'floatA', 'spike', 'ceil'],
};

function buildStage(si) {
  const st = STAGES[si];
  const rnd = rng(0x1E17 + si * 7919);
  const H = LV_H;
  const W = st.len;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));

  const enemies = [];
  let gy = H - 4;
  let x = 0;

  const fill = (x0, x1, y0, c) => {
    for (let xx = Math.max(0, x0); xx < Math.min(W, x1); xx++) {
      for (let yy = y0; yy < H; yy++) g[yy][xx] = c || '#';
    }
  };
  const put = (xx, yy, c) => {
    if (xx >= 0 && xx < W && yy >= 0 && yy < H) g[yy][xx] = c;
  };
  const foe = (kind, xx, yy) => enemies.push({ kind, x: xx + 0.5, y: yy });

  fill(0, 14, gy);
  x = 14;

  const kinds = KINDS[st.theme] || KINDS.beach;
  const foesOf = st.foes;
  const pickFoe = () => foesOf[Math.floor(rnd() * foesOf.length)];

  const BOSS_W = 28;
  const endX = W - BOSS_W - 6;

  let chunkN = 0;
  while (x < endX) {
    const room = endX - x;
    // ★ はじめの 2つは かならず ふつうの 道（走りだした とたんに 落ちない）
    const kind = chunkN < 2 ? 'flat' : kinds[Math.floor(rnd() * kinds.length)];
    chunkN++;
    const before = x;

    if (kind === 'flat' || room < 14) {
      const w = 8 + Math.floor(rnd() * 6);
      fill(x, x + w, gy);
      if (rnd() < 0.7) put(x + 2 + Math.floor(rnd() * (w - 4)), gy - 1, 'f');
      if (rnd() < 0.30) put(x + 2 + Math.floor(rnd() * (w - 4)), gy - 3, 'e');
      // ★ 1つの かたまりに 1〜2ひき。前は しま ぜんたいで 4ひき しか
      //   出ない ことが あって、走って いるだけの めんに なって いた。
      foe(pickFoe(), x + 2 + Math.floor(rnd() * Math.max(1, w - 4)), gy - 1);
      if (rnd() < 0.45) foe(pickFoe(), x + 4 + Math.floor(rnd() * Math.max(1, w - 6)), gy - 1);
      x += w;

    } else if (kind === 'water') {
      const w = 2 + Math.floor(rnd() * Math.min(2, 1 + st.hard));
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      x += w;
      fill(x, x + 6, gy);
      if (rnd() < 0.6) put(x + 2, gy - 1, 'f');
      foe('FISH', x - w / 2, gy);
      x += 6;

    } else if (kind === 'palm') {
      fill(x, x + 10, gy);
      for (let i = 0; i < 3; i++) put(x + 3 + i, gy - 4, '=');
      put(x + 4, gy - 5, 'f');
      if (rnd() < 0.5) put(x + 3, gy - 5, 'e');
      foe('CRAB', x + 7, gy - 1);
      if (rnd() < 0.5) foe(pickFoe(), x + 2, gy - 1);
      x += 10;

    } else if (kind === 'raft') {
      const w = 12;
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      // ★ 2マスはばだと いきおいの ついた ジャンプが とびこえて 水に 落ちる。
      //   3マスはば・4マスおきに して、すきまを 1マスに する。
      for (let i = 0; i < 3; i++) {
        const px = x + 1 + i * 4;
        for (let k = 0; k < 3; k++) put(px + k, gy - 1, '=');
        if (rnd() < 0.5) put(px + 1, gy - 2, 'f');
      }
      x += w;
      fill(x, x + 5, gy);
      x += 5;

    } else if (kind === 'vine') {
      fill(x, x + 12, gy);
      const top = Math.max(2, gy - 5);
      for (let yy = top; yy < gy; yy++) put(x + 3, yy, 'V');
      for (let i = 0; i < 5; i++) put(x + 3 + i, top - 1, '=');
      put(x + 5, top - 2, 'f');
      if (rnd() < 0.5) put(x + 7, top - 2, 'F');
      foe('SNAKE', x + 9, gy - 1);
      if (rnd() < 0.6) foe(pickFoe(), x + 1, gy - 1);
      x += 12;

    } else if (kind === 'canopy') {
      const w = 14;
      fill(x, x + w, gy);
      for (let i = 0; i < 5; i++) put(x + 2 + i, gy - 3, '=');
      for (let i = 0; i < 4; i++) put(x + 8 + i, gy - 5, '=');
      put(x + 4, gy - 4, 'f'); put(x + 10, gy - 6, 'f');
      foe('BUG', x + 6, gy - 5);
      foe(pickFoe(), x + 12, gy - 1);
      x += w;

    } else if (kind === 'log') {
      const w = 10;
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      for (let i = 0; i < w; i += 4) { for (let k = 0; k < 3; k++) put(x + i + k, gy - 1, '='); }
      x += w;
      fill(x, x + 5, gy);
      x += 5;

    } else if (kind === 'stairs') {
      const up = rnd() < 0.5 ? 1 : -1;
      let w = 0;
      for (let i = 0; i < 4; i++) {
        gy = clamp(gy - up, 5, H - 3);
        fill(x + w, x + w + 3, gy);
        w += 3;
      }
      if (rnd() < 0.6) put(x + 4, gy - 1, 'f');
      foe(pickFoe(), x + w - 2, gy - 1);
      if (rnd() < 0.5) foe(pickFoe(), x + 2, gy - 1);
      x += w;

    } else if (kind === 'stepUp') {
      const up = 1 + Math.floor(rnd() * 2);
      gy = clamp(gy - up, 5, H - 3);
      fill(x, x + 8, gy);
      if (rnd() < 0.6) put(x + 3, gy - 1, 'f');
      if (rnd() < 0.4) put(x + 5, gy - 3, 'e');
      foe(pickFoe(), x + 5, gy - 1);
      x += 8;

    } else if (kind === 'stepDn') {
      const dn = 1 + Math.floor(rnd() * 2);
      gy = clamp(gy + dn, 5, H - 3);
      fill(x, x + 8, gy);
      if (rnd() < 0.6) put(x + 3, gy - 1, 'f');
      foe(pickFoe(), x + 5, gy - 1);
      x += 8;

    } else if (kind === 'pit') {
      const w = 2 + Math.floor(rnd() * Math.min(3, 1 + st.hard));
      x += w;
      fill(x, x + 7, gy);
      if (rnd() < 0.5) put(x + 3, gy - 1, 'f');
      foe(pickFoe(), x + 4, gy - 1);
      x += 7;

    } else if (kind === 'spike') {
      fill(x, x + 12, gy);
      const n = 2 + Math.floor(rnd() * 2);
      const at0 = x + 3;
      for (let i = 0; i < n; i++) put(at0 + i, gy - 1, '^');
      if (rnd() < 0.6) put(at0 + n + 2, gy - 3, 'f');
      foe(pickFoe(), x + 9, gy - 1);
      x += 12;

    } else if (kind === 'lava') {
      // ★ ロボットで 8しまが ようがんに 113回 落ちた。はばが 7マスに なると
      //   まん中の 足場 1つでは わたれない。4マスまでに する。
      const w = 3 + Math.floor(rnd() * Math.min(2, 1 + st.hard));
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'L';
      put(x + Math.floor(w / 2), gy - 3, '=');
      x += w;
      fill(x, x + 7, gy);
      if (rnd() < 0.5) put(x + 3, gy - 1, 'f');
      x += 7;

    } else if (kind === 'crumble') {
      fill(x, x + 12, gy);
      for (let yy = gy - 3; yy < gy; yy++) put(x + 5, yy, 'B');
      put(x + 7, gy - 1, 'f');
      if (rnd() < 0.5) put(x + 9, gy - 3, 'e');
      foe(pickFoe(), x + 9, gy - 1);
      x += 12;

    } else if (kind === 'ceil') {
      // 天じょうが ひくい ところ（スライディングで くぐる）
      fill(x, x + 12, gy);
      for (let i = 0; i < 4; i++) {
        for (let yy = 0; yy <= gy - 2; yy++) put(x + 3 + i, yy, '#');
      }
      put(x + 8, gy - 1, 'f');
      foe(pickFoe(), x + 10, gy - 1);
      x += 12;

    } else if (kind === 'iceflat') {
      const w = 10 + Math.floor(rnd() * 4);
      fill(x, x + w, gy, 'I');
      for (let xx = x; xx < x + w; xx++) for (let yy = gy + 1; yy < H; yy++) g[yy][xx] = '#';
      if (rnd() < 0.6) put(x + 4, gy - 1, 'f');
      foe(pickFoe(), x + 6, gy - 1);
      if (rnd() < 0.5) foe(pickFoe(), x + 2, gy - 1);
      x += w;

    } else if (kind === 'iceslide') {
      let w = 0;
      for (let i = 0; i < 4; i++) {
        gy = clamp(gy + 1, 5, H - 3);
        fill(x + w, x + w + 3, gy, 'I');
        for (let xx = x + w; xx < x + w + 3; xx++) for (let yy = gy + 1; yy < H; yy++) g[yy][xx] = '#';
        w += 3;
      }
      x += w;

    } else if (kind === 'mud') {
      const w = 8 + Math.floor(rnd() * 4);
      fill(x, x + w, gy, 'M');
      for (let xx = x; xx < x + w; xx++) for (let yy = gy + 1; yy < H; yy++) g[yy][xx] = '#';
      if (rnd() < 0.6) put(x + 3, gy - 1, 'f');
      foe('SNAKE', x + 5, gy - 1);
      if (rnd() < 0.5) foe(pickFoe(), x + 2, gy - 1);
      x += w;

    } else if (kind === 'lily') {
      const w = 14;
      for (let xx = x; xx < x + w; xx++) for (let yy = gy; yy < H; yy++) g[yy][xx] = 'W';
      for (let i = 0; i < 4; i++) { const px = x + 1 + i * 4;
        for (let k = 0; k < 3; k++) put(px + k, gy - 1, '='); }
      x += w;
      fill(x, x + 5, gy);
      foe('FISH', x - 6, gy);
      foe('FISH', x - 11, gy);
      x += 5;

    } else if (kind === 'coral') {
      // ★ 前は トゲが 4マスおき で、1つ とびこえた 先が また トゲに なって
      //   ロボットが 89回 死んだ。6マスおきに して、足場も とどく 高さ(3)に。
      const w = 16;
      fill(x, x + w, gy);
      for (let i = 0; i < 2; i++) {
        put(x + 4 + i * 6, gy - 1, '^');
        for (let k = 0; k < 3; k++) put(x + 3 + i * 6 + k, gy - 3, '=');
      }
      put(x + 8, gy - 4, 'f');
      foe('OCTO', x + 11, gy - 1);
      if (rnd() < 0.6) foe(pickFoe(), x + 1, gy - 1);
      x += 14;

    } else if (kind === 'boulder') {
      fill(x, x + 12, gy);
      foe('ROCK', x + 5, Math.max(1, gy - 6));
      foe('ROCK', x + 9, Math.max(1, gy - 6));
      put(x + 3, gy - 1, 'f');
      x += 12;

    } else if (kind === 'floatA') {
      // ★ 前は さいごの 足場から 地めんまで 4マス あいて いて、
      //   ロボットが 103回 落ちた。はしまで 足場を ならべる。
      // ★ すきまの ある うかび足場は、いきおいの ついた ジャンプで
      //   とびこえて しまい 103回 落ちた。**すきまを なくして 高さだけ かえる**。
      //   見た目は「だんだんの うかぶ いせき」のまま、かならず わたれる。
      const w = 20;
      for (let i = 0; i < 5; i++) {
        const px = x + i * 4, py = gy - 1 - (i % 2) * 2;
        for (let k = 0; k < 4; k++) put(px + k, py, '=');
        if (rnd() < 0.4) put(px + 1, py - 1, 'f');
      }
      x += w;
      fill(x, x + 5, gy);
      foe(pickFoe(), x + 2, gy - 1);
      x += 5;

    } else if (kind === 'floatB') {
      const w = 18;
      for (let i = 0; i < 4; i++) {
        const px = x + i * 4, py = Math.max(2, gy - 1 - Math.min(i, 3));
        for (let k = 0; k < 4; k++) put(px + k, py, '=');
        if (rnd() < 0.5) put(px + 1, py - 1, 'f');
      }
      gy = clamp(gy - 3, 5, H - 3);
      x += w;
      fill(x, x + 6, gy);
      foe(pickFoe(), x + 3, gy - 1);
      x += 6;

    } else {
      fill(x, x + 10, gy);
      x += 10;
    }
    if (x <= before) x = before + 6;   // ぜったいに すすむ
  }

  // --- ボスの へや ---
  const bossX = x;
  gy = clamp(gy, 6, H - 4);
  fill(x, W, gy);
  for (let yy = gy - 8; yy < gy; yy++) put(W - 1, yy, '#');
  // へやに 大フルーツ（ボス戦の 前に たいりょくを もどせる）
  put(x + 3, gy - 1, 'F');
  // ★ ふめない ボス（カニ・ハチ・フクロウ など）は **なげものが ないと
  //   ぜったいに たおせない**。ロボットは こおりの がけで 245びょう
  //   なぐりつづけて 1も へらせなかった。
  //   そこで へやに 「かならず なげものが 出る たまご」（w）を 2つ おく。
  //   なくなっても、なげものを もって いなければ また わいて くる。
  // ★ gy-4 だと ジャンプの てっぺんでも たたけず、ロボットが へやで
  //   ずっと ジャンプしつづけて たいりょくぎれに なった。gy-3 に する。
  put(x + 6, gy - 1, 'w');
  put(x + 16, gy - 1, 'w');

  const lv = {
    st, w: W, h: H, g, enemies,
    bossX: bossX + 12, bossY: gy - 3, gy: gy, goalX: W - 5, goalY: gy,
  };
  return fixStage(lv);
}

// --- めんの 見なおし -------------------------------------------------------------------
//
// ★ ロボットに 走らせて 見つかった 問題を ここで つぶす。
//   ・あぶない マス（水・トゲ・ようがん）が 4マス以上 つづくと こえられない
//   ・とびこえた 先の マスも あんぜんで ないと いけない（着地が トゲだった）
//   ・てきは あぶない マスから 5マス はなす（よけた ジャンプで 落ちる）

function fixStage(lv) {
  const g = lv.g, H = lv.h, W = lv.w;
  const bad = (c) => c === 'W' || c === '^' || c === 'L';
  const colBad = (x) => {
    for (let y = 0; y < H; y++) if (bad(g[y][x])) return true;
    return false;
  };
  const groundY = (x) => {
    for (let y = 0; y < H; y++) {
      const c = g[y][x];
      if (c === '#' || c === 'I' || c === 'M') return y;
    }
    return H;
  };

  for (let x = 0; x < W; x++) {
    if (!colBad(x)) continue;
    let a = x;
    while (a < W && colBad(a)) a++;
    const run = a - x;
    let hasPlat = false;
    for (let xx = x; xx < a; xx++) {
      for (let y = 0; y < H; y++) if (g[y][xx] === '=') hasPlat = true;
    }
    if (run > 3 && !hasPlat) {
      // ★ まん中に うすい足場を おいて わたれる ように する。
      //   高さは **りょうどなりの 地めん**から きめる。
      //   前は あぶない マスの 列で groundY() を 見て いて、地めんが
      //   見つからず H を かえした ので、**足場が ようがんの 中**に できて
      //   いた（見えないし のれない）。
      const mid = Math.floor((x + a) / 2);
      const gl = x - 1 >= 0 ? groundY(x - 1) : H;
      const gr = a < W ? groundY(a) : H;
      const base = Math.min(gl, gr);
      const gyy = clamp(base - 3, 2, H - 3);
      for (let k = -1; k <= 1; k++) if (mid + k >= 0 && mid + k < W) g[gyy][mid + k] = '=';
    }
    // 前後 3マスは あんぜんに（とびこえた 先が また トゲ、を なくす）
    for (let k = 1; k <= 3; k++) {
      for (const xx of [x - k, a - 1 + k]) {
        if (xx < 0 || xx >= W || !colBad(xx)) continue;
        const gyy = groundY(xx);
        if (gyy >= H) continue;
        for (let y = 0; y < H; y++) if (bad(g[y][xx])) g[y][xx] = y >= gyy ? '#' : '.';
      }
    }
    x = a;
  }

  // ★ トゲの かたまりどうしが 近すぎると、1つ とびこえた 先が また トゲに なる。
  //   5マス あけて、近すぎる ほうは 消す。
  let lastSpike = -99;
  for (let x = 0; x < W; x++) {
    let has = false;
    for (let y = 0; y < H; y++) if (g[y][x] === '^') has = true;
    if (!has) continue;
    let a = x;
    while (a < W) {
      let h2 = false;
      for (let y = 0; y < H; y++) if (g[y][a] === '^') h2 = true;
      if (!h2) break;
      a++;
    }
    if (x - lastSpike < 5) {
      for (let xx = x; xx < a; xx++) for (let y = 0; y < H; y++) if (g[y][xx] === '^') g[y][xx] = '.';
    } else {
      lastSpike = a;
    }
    x = a;
  }

  // ★ かべに うまって しまった フルーツ・たまごを 消す（取れないので）
  const standT = (c) => c === '#' || c === 'I' || c === 'M' || c === '=' || c === 'B';
  const cellT = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? '#' : g[y][x];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = g[y][x];
      if (c !== 'f' && c !== 'F' && c !== 'e' && c !== 'w') continue;
      if (standT(cellT(x, y - 1)) && standT(cellT(x, y + 1)) &&
          standT(cellT(x - 1, y)) && standT(cellT(x + 1, y))) g[y][x] = '.';
    }
  }

  // ★ てきが あぶない マスの すぐ よこに いると、よけた ジャンプが
  //   そのまま 水に 落ちる。前は 「±5マスに あぶない マスが あれば 消す」に
  //   して いたが、ようがんや 水の おおい しまでは **てきが 1ぴきしか
  //   のこらなかった**。いまは まず **あんぜんな ところへ ずらして**、
  //   どうしても だめな ときだけ 消す。歩く てきは 自分で へりで ふりむくので
  //   はなす きょりも 2マスで じゅうぶん。
  const walker = (k) => k === 'BLOB' || k === 'CRAB' || k === 'SNAKE' || k === 'OCTO';
  const okAt = (xx) => {
    if (xx < 1 || xx >= W - 1) return false;
    for (let k = -2; k <= 2; k++) if (colBad(clamp(xx + k, 0, W - 1))) return false;
    return groundY(xx) < H;
  };
  const kept = [];
  for (const e of lv.enemies) {
    if (!walker(e.kind)) { kept.push(e); continue; }
    let ex = Math.round(e.x);
    if (!okAt(ex)) {
      let moved = false;
      for (let d = 1; d <= 10 && !moved; d++) {
        for (const xx of [ex + d, ex - d]) {
          if (okAt(xx)) { ex = xx; moved = true; break; }
        }
      }
      if (!moved) continue;
      e.x = ex + 0.5;
      e.y = groundY(ex) - 1;
    }
    kept.push(e);
  }
  lv.enemies = kept;
  return lv;
}

// --- ゲームの なかみ -------------------------------------------------------------------
const G = {
  screen: 'title', t: 0,
  si: 0, lv: null,
  p: null, cam: 0, camY: 0,
  enemies: [], shots: [], pops: [], parts: [], bolts: [],
  boss: null, bossOn: false, goalOpen: false,
  lives: 3, score: 0, fruit: 0, checkX: 3,
  over: false, win: false, dead: 0, clearT: 0,
  msg: '', msgT: 0, shake: 0, flash: 0,
  wx: 'sun', wxT: 0, wxI: 0, lightT: 3, lightMark: null,
  drops: [],                              // あめ・ゆき の つぶ
};

function startStage(i) {
  audioStart();
  G.si = i;
  G.lv = buildStage(i);
  G.lives = 3; G.score = 0; G.fruit = 0;
  G.over = false; G.win = false;
  save.plays++; storeSave();
  G.screen = 'play';
  respawn(true);
  bgmIsland(STAGES[i].theme);
  G.msg = STAGES[i].name; G.msgT = 2.0;
}

function respawn(fresh) {
  const lv = G.lv;
  if (fresh) {
    G.checkX = 3;
    G.enemies = lv.enemies.map((e) => mkEnemy(e.kind, e.x, e.y));
    G.boss = null; G.bossOn = false; G.goalOpen = false;
    G.wxI = 0; G.wx = lv.st.wx[0]; G.wxT = 0;
    G.lightT = 4;
  } else {
    // 目じるしより 先の てきは 生きかえる（やりなおしの ため）
    for (const e of G.enemies) {
      if (e.x > G.checkX + 4) { e.alive = true; e.hp = e.hpMax; e.t = 0; }
    }
    if (G.boss && G.boss.alive) {
      // ★ 死ぬたび ボスが 全かい すると、いつまでも 終わらない。
      //   35%だけ もどす（がんばった ぶんは のこる）。
      G.boss.hp = Math.min(G.boss.hpMax, G.boss.hp + G.boss.hpMax * 0.35);
      // ★ やりなおした とたん ボスが 目の前に いて、また やられる ことが あった。
      //   はなれた ところに もどして、しばらく 休ませる。
      G.boss.x = G.lv.bossX + 8;
      G.boss.y = G.boss.baseY;
      G.boss.st = 'wait'; G.boss.stT = 2.2; G.boss.vx = 0; G.boss.vy = 0;
    }
  }
  // 立てる ところを さがす
  let sx0 = clamp(G.checkX, 1, lv.w - 3), sy0 = 1;
  let found = false;
  for (let k = 0; k < 90 && !found; k++) {
    const tx = clamp(sx0 - k, 1, lv.w - 3);
    for (let ty = lv.h - 2; ty >= 1; ty--) {
      if (at(tx, ty) === '#' && at(tx, ty - 1) === '.' && at(tx, ty - 2) === '.') {
        sx0 = tx; sy0 = ty - PH; found = true; break;
      }
    }
  }
  G.p = {
    x: sx0, y: sy0, vx: 0, vy: 0, face: 1, onGround: true,
    life: LIFE_MAX, walk: 0, jumpHold: false, invT: 2.0,
    coyote: 0, buffer: 0, land: 0, squash: 0,
    board: false, boardT: 0,
    wep: null, ammo: 0, throwCd: 0,
    slide: 0, slideCd: 0, climb: false,
    hurtT: 0,
  };
  G.shots = []; G.parts = []; G.pops = []; G.bolts = [];
  G.dead = 0; G.clearT = 0;
  G.cam = clamp(G.p.x - viewTilesX() * 0.35, 0, lv.w - viewTilesX());
  G.camY = camYWant();
}

function at(tx, ty) {
  const lv = G.lv;
  if (!lv || ty < 0 || ty >= lv.h || tx < 0 || tx >= lv.w) return ty >= lv.h ? '.' : '#';
  return lv.g[ty][tx];
}
function setAt(tx, ty, c) {
  const lv = G.lv;
  if (!lv || ty < 0 || ty >= lv.h || tx < 0 || tx >= lv.w) return;
  lv.g[ty][tx] = c;
}
function solid(tx, ty) { const c = at(tx, ty); return c === '#' || c === 'I' || c === 'M' || c === 'B'; }
function oneWay(tx, ty) { return at(tx, ty) === '='; }
function deadly(c) { return c === 'W' || c === '^' || c === 'L'; }

// --- おと ------------------------------------------------------------------------------
function sfxEat() { if (A.ctx) bleep(anow(), [79, 84], 0.04, 0.07, 0.10); }
function sfxBig() { if (A.ctx) bleep(anow(), [72, 76, 79, 84, 88], 0.05, 0.10, 0.12); }
function sfxHop() { if (A.ctx) tone(anow(), 70, 0.09, 0.09, 'square', null, 84); }
// ★ 0.07 だと はかると ほとんど 波が 出て いなかった（着地の 音が 聞こえない）
function sfxLand() { if (A.ctx) nz(anow(), 0.07, 0.14, 180, 1300); }
function sfxSlide() { if (A.ctx) nz(anow(), 0.26, 0.09, 500, 3000); }
function sfxAxe() { if (A.ctx) { const t = anow(); tone(t, 88, 0.05, 0.08, 'square', null, 76); nz(t, 0.04, 0.05, 2000, 7000); } }
function sfxEgg() { if (A.ctx) { const t = anow(); nz(t, 0.07, 0.14, 800, 4000); bleep(t, [76, 83], 0.04, 0.06, 0.10); } }
function sfxKill() { if (A.ctx) { const t = anow(); nz(t, 0.08, 0.14, 1200, 6000); tone(t, 60, 0.08, 0.09, 'square', null, 48); } }
function sfxBoom() { if (A.ctx) { const t = anow(); nz(t, 0.30, 0.24, 90, 2600); tone(t, 40, 0.20, 0.13, 'triangle', null, 22); kick(t, 0.8); } }
function sfxDie() { if (A.ctx) { const t = anow(); bleep(t, [72, 66, 60, 54, 48], 0.09, 0.15, 0.13); nz(t + 0.5, 0.3, 0.08, 120, 900); } }
function sfxGoal() { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14); kick(t, 0.7); } }
function sfxBoard() { if (A.ctx) { const t = anow(); nz(t, 0.3, 0.08, 400, 2500); bleep(t, [64, 71, 76], 0.05, 0.08, 0.10); } }
function sfxThunder() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.6, 0.30, 60, 4000);
  nz(t + 0.05, 0.9, 0.18, 40, 800);
  kick(t, 0.9);
}
function sfxWarn() { if (A.ctx) tone(anow(), 60, 0.10, 0.07, 'square', null, 66); }
function sfxBossHit() { if (A.ctx) { const t = anow(); nz(t, 0.10, 0.18, 300, 2500); tone(t, 52, 0.10, 0.10, 'square', null, 40); } }
function sfxBossDie() {
  if (!A.ctx) return;
  const t = anow();
  for (let i = 0; i < 5; i++) nz(t + i * 0.14, 0.3, 0.20, 80, 2600);
  bleep(t + 0.7, [48, 55, 60, 67, 72, 79], 0.09, 0.18, 0.14);
}
function sfxRoar() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 34, 0.55, 0.14, 'sawtooth', null, 28);
  nz(t, 0.5, 0.14, 80, 900);
}

// --- BGM（アクションぽく）--------------------------------------------------------------
//
// ★ 「もっと アクションぽく」と 言われた ので、arcade.js の BGM は 使わず
//   ここで 作る。しくみは:
//   ・16分の はやい ベース（ずっと 動く ＝ 走って いる かんじ）
//   ・キックと スネアの ドラム（うら拍に スネア）
//   ・上に メロディ。さびで 音が 高く なる
//   ・テーマごとに 音階と はやさを かえる（かざんは 速くて 低い、など）

const BGM_THEME = {
  beach:   { bpm: 150, root: 57, scale: [0, 2, 4, 7, 9], wave: 'square' },
  jungle:  { bpm: 156, root: 55, scale: [0, 3, 5, 7, 10], wave: 'square' },
  rock:    { bpm: 150, root: 53, scale: [0, 2, 3, 7, 8], wave: 'square' },
  volcano: { bpm: 168, root: 51, scale: [0, 1, 5, 7, 8], wave: 'sawtooth' },
  lagoon:  { bpm: 148, root: 59, scale: [0, 2, 4, 7, 11], wave: 'square' },
  ice:     { bpm: 152, root: 60, scale: [0, 2, 3, 7, 10], wave: 'triangle' },
  swamp:   { bpm: 146, root: 50, scale: [0, 1, 3, 7, 8], wave: 'square' },
  cave:    { bpm: 160, root: 48, scale: [0, 3, 5, 6, 10], wave: 'sawtooth' },
  sky:     { bpm: 158, root: 62, scale: [0, 2, 4, 7, 9], wave: 'square' },
  castle:  { bpm: 172, root: 49, scale: [0, 1, 4, 7, 8], wave: 'sawtooth' },
};
const BASS_PAT = [0, 0, 7, 0, 0, 0, 7, 0, 5, 5, 0, 5, 3, 3, 7, 7];
const MEL_PAT = [
  [0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 2, -1, 0, -1, -1, -1],
  [4, -1, 3, 2, -1, 0, -1, 2, 3, -1, 4, -1, 7, -1, -1, -1],
  [7, -1, 4, -1, 3, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1],
  [0, 2, 3, 4, -1, 3, 2, 0, -1, 2, -1, 4, 3, -1, -1, -1],
];

const BG = { on: false, th: null, t: 0, bar: 0, hot: 0 };

function bgmIsland(theme) {
  audioStart();
  if (!A.ctx) return;
  BG.on = true;
  BG.th = BGM_THEME[theme] || BGM_THEME.beach;
  BG.t = anow() + 0.12;
  BG.bar = 0;
  BG.hot = 0;
}
function bgmStopIsland() { BG.on = false; }

function bgmPumpIsland() {
  if (!BG.on || !A.ctx) return;
  const th = BG.th;
  const spb = 60 / th.bpm;
  const step = spb / 4;                   // 16分
  const barLen = step * 16;
  while (BG.t < anow() + 0.9) {
    schedBar(BG.t, th, step);
    BG.t += barLen;
    BG.bar++;
  }
}

function schedBar(t0, th, step) {
  const bar = BG.bar;
  const prog = [0, 5, 3, 7][bar % 4];      // 4小節で 1まわり
  const mel = MEL_PAT[bar % MEL_PAT.length];
  const hot = BG.hot > 0.5;                // ボス戦は はげしく
  for (let i = 0; i < 16; i++) {
    const t = t0 + i * step;
    // ドラム
    if (i % 8 === 0 || i === 6 || (hot && i === 11)) kick(t, 0.75);
    if (i % 8 === 4) nz(t, 0.10, hot ? 0.16 : 0.12, 1200, 6500, A.mus);
    if (i % 2 === 1) nz(t, 0.03, 0.030, 6000, 11000, A.mus);   // ハイハット
    // ベース（16分で ずっと 動く）
    const b = th.root - 12 + prog + BASS_PAT[i];
    tone(t, b, step * 0.9, hot ? 0.085 : 0.070, th.wave, A.mus);
    // メロディ
    const m = mel[i];
    if (m >= 0) {
      const oct = hot ? 12 : 0;
      const n = th.root + 12 + prog + th.scale[m % th.scale.length] + Math.floor(m / th.scale.length) * 12;
      tone(t, n + oct, step * 1.7, 0.055, 'square', A.mus);
    }
  }
}

// --- まいコマ ---------------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  bgmPumpIsland();
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; return; }
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.4);

  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g === undefined ? 30 : q.g) * dt;
    if (q.t > (q.life || 0.8)) G.parts.splice(i, 1);
  }
  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t += dt;
    if (G.pops[i].t > 0.9) G.pops.splice(i, 1);
  }

  updateWeather(dt);

  if (G.over) { IN.taps.length = 0; IN.fireTap = false; return; }

  if (G.clearT > 0) {
    G.clearT -= dt;
    if (G.clearT <= 0) { G.over = true; G.win = true; }
    IN.taps.length = 0; IN.fireTap = false;
    return;
  }
  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0) {
      if (G.lives <= 0) { G.over = true; G.win = false; bgmStopIsland(); }
      else respawn(false);
    }
    IN.taps.length = 0; IN.fireTap = false;
    return;
  }

  updatePlayer(dt);
  updateShots(dt);
  updateEnemies(dt);
  updateBoss(dt);

  // カメラ
  const tx = G.p.x - viewTilesX() * 0.35;
  G.cam += (clamp(tx, 0, G.lv.w - viewTilesX()) - G.cam) * Math.min(1, dt * 8);
  G.camY += (camYWant() - G.camY) * Math.min(1, dt * 5);

  IN.taps.length = 0;
  IN.fireTap = false;
}

function viewTilesX() { return VW / ts(); }
function camYWant() {
  // ★ まん中に あわせると 上が 空だらけに なる。少し 下げて 地めんを 見せる。
  const want = G.p.y + PH / 2 - TILES_Y * 0.60;
  return clamp(want, 0, LV_H - TILES_Y);
}

// --- 天気 --------------------------------------------------------------------------------
//
// ★ 「天気も かわるし、カミナリが 落ちても いい」と 言われた ので、
//   めんの あいだに ゆっくり かわる。かみなりは 落ちる ばしょに
//   まるい しるしが 1びょう 出てから 落ちる（見てから よけられる）。

const WX_NAME = { sun: 'はれ', cloud: 'くもり', rain: 'あめ', storm: 'かみなり', fog: 'きり', night: 'よる' };

function updateWeather(dt) {
  const st = G.lv.st;
  G.wxT += dt;
  if (G.wxT > 22 && st.wx.length > 1) {
    G.wxT = 0;
    G.wxI = (G.wxI + 1) % st.wx.length;
    G.wx = st.wx[G.wxI];
    G.msg = '天気が かわった … ' + WX_NAME[G.wx]; G.msgT = 1.6;
  }

  // あめ・ゆきの つぶ
  const want = G.wx === 'rain' ? 90 : G.wx === 'storm' ? 130 : 0;
  while (G.drops.length < want) {
    G.drops.push({ x: Math.random() * VW, y: Math.random() * VH, v: 620 + Math.random() * 260 });
  }
  if (G.drops.length > want) G.drops.length = want;
  for (const d of G.drops) {
    d.y += d.v * dt; d.x -= d.v * 0.22 * dt;
    if (d.y > VH) { d.y = -10; d.x = Math.random() * VW + VW * 0.25; }
  }

  // かみなり
  if (G.wx === 'storm' && !G.over && G.dead <= 0) {
    G.lightT -= dt;
    if (G.lightT <= 0 && !G.lightMark) {
      const px = Math.round(G.p.x + (Math.random() - 0.5) * 7);
      G.lightMark = { x: clamp(px, 1, G.lv.w - 2), t: 1.0 };
      sfxWarn();
    }
  }
  if (G.lightMark) {
    G.lightMark.t -= dt;
    if (G.lightMark.t <= 0) {
      strike(G.lightMark.x);
      G.lightMark = null;
      G.lightT = 4.5 + Math.random() * 3.5;
    }
  }
}

function strike(tx) {
  G.flash = 1.0; G.shake = 12;
  sfxThunder();
  G.bolts.push({ x: tx, t: 0 });
  const p = G.p;
  if (p && Math.abs(p.x + PW / 2 - (tx + 0.5)) < 1.1) hurt('かみなりに うたれた！');
  for (const e of G.enemies) {
    if (e.alive && Math.abs(e.x - (tx + 0.5)) < 1.2) killEnemy(e);
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    G.bolts[i].t += 0;
    if (G.bolts.length > 3) G.bolts.shift();
  }
}

// --- エイトくん ---------------------------------------------------------------------------
function jumpHeld() { return IN.fire || KEYS.Space || KEYS.KeyZ || KEYS.ArrowUp; }
function jumpTap() { return IN.fireTap || KEYS.__jumpTap; }

function groundKind() {
  const p = G.p;
  const ty = Math.floor(p.y + PH + 0.06);
  const c1 = at(Math.floor(p.x + 0.1), ty), c2 = at(Math.floor(p.x + PW - 0.1), ty);
  if (c1 === 'I' || c2 === 'I') return 'I';
  if (c1 === 'M' || c2 === 'M') return 'M';
  return '#';
}

function updatePlayer(dt) {
  const p = G.p;
  const st = G.lv.st;

  // たいりょく（つねに へる）
  p.life -= st.drain * dt;
  if (p.life <= 0) { die('たいりょくが きれた…'); return; }
  if (p.invT > 0) p.invT -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.slideCd > 0) p.slideCd -= dt;
  if (p.throwCd > 0) p.throwCd -= dt;
  if (p.squash > 0) p.squash -= dt;
  if (p.boardT > 0) p.boardT -= dt;

  // --- 入力 ---
  let dir = 0;
  if (IN.dir === 'l' || KEYS.ArrowLeft) dir = -1;
  if (IN.dir === 'r' || KEYS.ArrowRight) dir = 1;
  if (IN.hold && Math.abs(IN.ax) > 0.24) dir = IN.ax > 0 ? 1 : -1;
  const down = IN.dir === 'd' || KEYS.ArrowDown || (IN.hold && IN.ay > 0.55);
  const up = IN.dir === 'u' || KEYS.ArrowUp || (IN.hold && IN.ay < -0.55);

  // --- つたに つかまる ---
  const cx = Math.floor(p.x + PW / 2);
  const onVine = at(cx, Math.floor(p.y + PH * 0.4)) === 'V' || at(cx, Math.floor(p.y + PH * 0.8)) === 'V';
  if (onVine && (up || down || p.climb)) {
    p.climb = true;
    p.vy = up ? -6.2 : down ? 6.2 : 0;
    p.vx = dir * 3.2;
    p.onGround = false;
    if (jumpTap()) { p.climb = false; p.vy = JUMP_V * 0.86; p.jumpHold = true; sfxHop(); }
  } else {
    p.climb = false;
  }

  // --- スライディング ---
  if (p.slide > 0) {
    p.slide -= dt;
    p.vx = p.face * SLIDE_V;
    // ★ ひくい 天じょうの 下で すべりが 終わると 立ちあがれず つかえる。
    //   頭の 上が ふさがって いる あいだは すべりを のばす。
    if (p.slide <= 0 && headBlocked()) p.slide = 0.10;
    else if (p.slide <= 0) p.slideCd = SLIDE_CD;
  } else if (down && p.onGround && p.slideCd <= 0 && !p.board && Math.abs(p.vx) > 2.2) {
    p.slide = SLIDE_T;
    sfxSlide();
    for (let i = 0; i < 6; i++) {
      G.parts.push({ x: p.x + PW / 2, y: p.y + PH, vx: -p.face * (2 + Math.random() * 4),
                     vy: -Math.random() * 3, col: '#E8D8B0', t: 0, life: 0.45, g: 20 });
    }
  }

  // --- よこの うごき（じわっと 加速する）---
  if (!p.climb && p.slide <= 0) {
    const gk = groundKind();
    const onIce = p.onGround && gk === 'I';
    const mud = p.onGround && gk === 'M';
    const acc = p.onGround ? (onIce ? ICE_ACC : RUN_ACC) : AIR_ACC;
    const fric = p.onGround ? (onIce ? ICE_FRIC : RUN_FRIC) : AIR_FRIC;
    const top = (p.board ? BOARD : RUN) * (mud ? MUD_MUL : 1);
    if (p.board) {
      if (dir !== 0) p.face = dir;
      p.vx += (p.face * top - p.vx) * Math.min(1, dt * 6);
    } else if (dir !== 0) {
      p.face = dir;
      p.vx += dir * acc * dt;
      if (Math.abs(p.vx) > top) p.vx = Math.sign(p.vx) * top;
    } else {
      const d = fric * dt;
      p.vx = Math.abs(p.vx) <= d ? 0 : p.vx - Math.sign(p.vx) * d;
    }
  }
  if (Math.abs(p.vx) > 0.1) p.walk += dt * Math.abs(p.vx) * 0.85;

  // --- ジャンプ（コヨーテ時間・さきおし・てっぺんは ふわっと）---
  if (!p.climb) {
    if (p.onGround) p.coyote = COYOTE; else p.coyote = Math.max(0, p.coyote - dt);
    if (jumpTap()) p.buffer = BUFFER; else p.buffer = Math.max(0, p.buffer - dt);

    if (p.buffer > 0 && p.coyote > 0 && p.slide <= 0) {
      p.vy = JUMP_V; p.onGround = false; p.jumpHold = true;
      p.buffer = 0; p.coyote = 0; p.squash = 0.16;
      sfxHop();
    }
    if (!jumpHeld()) p.jumpHold = false;

    let gv;
    if (p.vy < 0) gv = p.jumpHold ? GRAV_UP : GRAV_CUT;
    else gv = GRAV_DN;
    if (Math.abs(p.vy) < APEX_V && p.jumpHold) gv *= APEX_MUL;   // てっぺんは ふわっと
    p.vy = Math.min(p.vy + gv * dt, MAX_FALL);
  }

  const wasAir = !p.onGround;
  moveX(dt);
  moveY(dt);
  if (wasAir && p.onGround) {
    p.squash = 0.18;
    if (p.vy > 8 || true) sfxLand();
    for (let i = 0; i < 4; i++) {
      G.parts.push({ x: p.x + PW / 2 + (Math.random() - 0.5) * 0.5, y: p.y + PH,
                     vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2,
                     col: '#FFFFFF', t: 0, life: 0.28, g: 18 });
    }
  }

  pickTiles();
  throwCheck();

  // 目じるし（チェックポイント）。足の下が ほんとうの つちの ときだけ。
  if (p.onGround && p.x > G.checkX + 30) {
    const c = at(Math.floor(p.x + PW / 2), Math.floor(p.y + PH + 0.1));
    if (c === '#' || c === 'I' || c === 'M') G.checkX = Math.floor(p.x);
  }

  // ★ ボス戦の あいだは へやから 出られない ようにする。
  //   前は 左に もどれて、そらの いせきでは そのまま 落ちて 死んで いた。
  if (G.bossOn && G.boss && G.boss.alive) {
    const wall = G.lv.bossX - 14;
    if (p.x < wall) { p.x = wall; if (p.vx < 0) p.vx = 0; }
  }

  if (p.y > G.lv.h + 1) die('落ちて しまった…');

  // ボスの へやに 入ったか
  if (!G.bossOn && p.x > G.lv.bossX - 12) startBoss();
  // ゴール
  if (G.goalOpen && Math.abs(p.x - G.lv.goalX) < 1.2 && G.clearT <= 0) {
    G.clearT = 1.6;
    save.clear['s' + G.si] = 1;
    const sc = Math.round(G.score);
    if (!save.best['s' + G.si] || save.best['s' + G.si] < sc) save.best['s' + G.si] = sc;
    storeSave();
    sfxGoal();
  }
}

function headBlocked() {
  const p = G.p;
  const x0 = Math.floor(p.x + 0.1), x1 = Math.floor(p.x + PW - 0.1);
  for (let tx = x0; tx <= x1; tx++) {
    if (solid(tx, Math.floor(p.y + 0.1)) || solid(tx, Math.floor(p.y + PH * 0.35))) return true;
  }
  return false;
}

function pbox() {
  const p = G.p;
  const h = p.slide > 0 ? SLIDE_H : PH;
  return { x: p.x, y: p.y + PH - h, w: PW, h: h };
}

function moveX(dt) {
  const p = G.p;
  p.x += p.vx * dt;
  const b = pbox();
  const y0 = Math.floor(b.y + 0.06), y1 = Math.floor(b.y + b.h - 0.06);
  if (p.vx > 0) {
    const tx = Math.floor(p.x + PW);
    for (let ty = y0; ty <= y1; ty++) {
      if (solid(tx, ty)) {
        if (at(tx, ty) === 'B' && (p.slide > 0 || p.board)) { breakBlock(tx, ty); continue; }
        p.x = tx - PW - 0.001; p.vx = 0;
        if (p.board) breakBoard('かべに ぶつかった');
        if (p.slide > 0) p.slide = 0;
        break;
      }
    }
  } else if (p.vx < 0) {
    const tx = Math.floor(p.x);
    for (let ty = y0; ty <= y1; ty++) {
      if (solid(tx, ty)) {
        if (at(tx, ty) === 'B' && (p.slide > 0 || p.board)) { breakBlock(tx, ty); continue; }
        p.x = tx + 1 + 0.001; p.vx = 0;
        if (p.board) breakBoard('かべに ぶつかった');
        if (p.slide > 0) p.slide = 0;
        break;
      }
    }
  }
  p.x = clamp(p.x, 0, G.lv.w - PW);
}

function moveY(dt) {
  const p = G.p;
  const prevFeet = p.y + PH;
  p.y += p.vy * dt;
  const x0 = Math.floor(p.x + 0.08), x1 = Math.floor(p.x + PW - 0.08);
  if (p.vy >= 0) {
    const ty = Math.floor(p.y + PH);
    for (let tx = x0; tx <= x1; tx++) {
      const hardHit = solid(tx, ty);
      const softHit = oneWay(tx, ty) && prevFeet <= ty + 0.04 && !(IN.dir === 'd' || KEYS.ArrowDown);
      if (hardHit || softHit) {
        p.y = ty - PH - 0.001; p.vy = 0; p.onGround = true;
        return;
      }
    }
    p.onGround = false;
  } else {
    const b = pbox();
    const ty = Math.floor(b.y);
    for (let tx = x0; tx <= x1; tx++) {
      if (at(tx, ty) === 'e') { hatchEgg(tx, ty); p.vy = 1.5; return; }
      if (at(tx, ty) === 'B') { breakBlock(tx, ty); p.vy = 1.5; return; }
      if (solid(tx, ty)) { p.y = ty + 1 - (PH - b.h) + 0.001; p.vy = 1; return; }
    }
  }
}

function breakBlock(tx, ty) {
  setAt(tx, ty, '.');
  sfxKill();
  for (let i = 0; i < 8; i++) {
    G.parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 9,
                   vy: -Math.random() * 7, col: '#8A6A4A', t: 0, life: 0.6 });
  }
  G.score += 10;
}

function pickTiles() {
  const p = G.p;
  const x0 = Math.floor(p.x + 0.1), x1 = Math.floor(p.x + PW - 0.1);
  const b = pbox();
  const y0 = Math.floor(b.y + 0.1), y1 = Math.floor(b.y + b.h - 0.1);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = at(tx, ty);
      if (c === 'f') {
        setAt(tx, ty, '.'); p.life = Math.min(LIFE_MAX, p.life + FRUIT_HEAL);
        G.fruit++; save.fruit++; G.score += 20; sfxEat();
        G.pops.push({ x: tx + 0.5, y: ty, text: '+' + FRUIT_HEAL, col: '#FFD24A', t: 0 });
      } else if (c === 'F') {
        setAt(tx, ty, '.'); p.life = Math.min(LIFE_MAX, p.life + BIGFRUIT_HEAL);
        G.fruit++; save.fruit++; G.score += 60; sfxBig();
        G.pops.push({ x: tx + 0.5, y: ty, text: '+' + BIGFRUIT_HEAL, col: '#8AF0B0', t: 0 });
      } else if (c === 'w') {
        // ★ ボスの へやの ぶき。**あるいて とる**（下から たたく のは
        //   ボス戦の さいちゅうには むずかしすぎた）
        setAt(tx, ty, '.');
        hatchEgg(tx, ty, true);
      } else if (deadly(c) && p.invT <= 0) {
        die(c === 'W' ? '水に 落ちた…' : c === 'L' ? 'ようがんに 落ちた…' : 'トゲに あたった…');
        return;
      }
    }
  }
}

function hatchEgg(tx, ty, forceWeapon) {
  setAt(tx, ty, '.');
  sfxEgg();
  const p = G.p;
  const r = forceWeapon ? 0 : Math.random();
  if (r < 0.34) {
    const k = WEP_KEYS[Math.floor(Math.random() * WEP_KEYS.length)];
    p.wep = k; p.ammo = WEAPONS[k].ammo;
    G.pops.push({ x: tx + 0.5, y: ty, text: WEAPONS[k].name + ' ×' + p.ammo, col: WEAPONS[k].col, t: 0 });
  } else if (r < 0.58) {
    p.board = true; p.boardT = 9; sfxBoard();
    G.pops.push({ x: tx + 0.5, y: ty, text: 'スケボー！', col: '#8AD8F0', t: 0 });
  } else if (r < 0.80) {
    p.life = Math.min(LIFE_MAX, p.life + BIGFRUIT_HEAL);
    G.pops.push({ x: tx + 0.5, y: ty, text: '大フルーツ +' + BIGFRUIT_HEAL, col: '#8AF0B0', t: 0 });
  } else {
    p.invT = Math.max(p.invT, 6);
    G.pops.push({ x: tx + 0.5, y: ty, text: 'むてき 6びょう！', col: '#FFD24A', t: 0 });
  }
  for (let i = 0; i < 10; i++) {
    G.parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 10,
                   vy: -Math.random() * 9, col: '#FFF0C8', t: 0, life: 0.6 });
  }
  G.score += 30;
}

function breakBoard(why) {
  const p = G.p;
  if (!p.board) return;
  p.board = false; p.boardT = 0;
  p.invT = Math.max(p.invT, 1.1);
  G.pops.push({ x: p.x, y: p.y, text: 'スケボーが こわれた', col: '#FF8AA8', t: 0 });
  sfxKill();
}

// --- なげもの -----------------------------------------------------------------------------
function throwCheck() {
  const p = G.p;
  if (!p.wep || p.ammo <= 0) return;
  if (!(KEYS.__throwTap || G.throwTap)) return;
  G.throwTap = false; KEYS.__throwTap = false;
  // ★ 間かくが ないと、おしっぱなしで 6本ぜんぶが 1かたまりに なって とんで
  //   1回 はずすと たまが なくなる。0.3びょう あける。
  if (p.throwCd > 0) return;
  p.throwCd = 0.30;
  p.ammo--;
  const k = p.wep;
  const x = p.x + PW / 2, y = p.y + PH * 0.45;
  if (k === 'AXE') {
    G.shots.push({ k: 'AXE', x, y, vx: p.face * 11, vy: -8.0, t: 0, spin: 0 });
  } else if (k === 'BOOM') {
    G.shots.push({ k: 'BOOM', x, y, vx: p.face * 14, vy: 0, t: 0, spin: 0, face: p.face, back: false });
  } else {
    G.shots.push({ k: 'BOMB', x, y, vx: p.face * 9, vy: -9.5, t: 0, spin: 0, fuse: 1.1 });
  }
  sfxAxe();
  if (p.ammo <= 0) {
    G.pops.push({ x: p.x, y: p.y, text: WEAPONS[k].name + ' を つかいきった', col: '#B0BCD8', t: 0 });
    p.wep = null;
  }
}

function updateShots(dt) {
  const p = G.p;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.t += dt; s.spin += dt * 16;
    if (s.k === 'BOOM') {
      // ★ 行って もどって くる。もどりも てきに 当たる。
      if (!s.back && s.t > 0.42) { s.back = true; }
      s.vx += (s.back ? -s.face * 26 : 0) * dt;
      s.x += s.vx * dt;
      s.y += Math.sin(s.t * 9) * 3.4 * dt;
      if (s.back && (s.face > 0 ? s.x < p.x : s.x > p.x)) { G.shots.splice(i, 1); continue; }
      if (s.t > 2.4) { G.shots.splice(i, 1); continue; }
    } else {
      s.vy += 30 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.k === 'BOMB') {
        // 地めんで はねる
        if (solid(Math.floor(s.x), Math.floor(s.y + 0.3)) && s.vy > 0) {
          s.vy = -s.vy * 0.42; s.vx *= 0.6;
        }
        s.fuse -= dt;
        if (s.fuse <= 0) { boom(s.x, s.y); G.shots.splice(i, 1); continue; }
      } else if (solid(Math.floor(s.x), Math.floor(s.y))) {
        G.shots.splice(i, 1); continue;
      }
      if (s.t > 3 || s.y > G.lv.h + 2) { G.shots.splice(i, 1); continue; }
    }
    // てきに 当たる
    for (const e of G.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - s.x) < e.w / 2 + 0.35 && Math.abs(e.y - s.y) < e.h / 2 + 0.35) {
        hitEnemy(e, s.k === 'BOMB' ? 3 : 2);
        if (s.k !== 'BOOM') { if (s.k === 'BOMB') boom(s.x, s.y); G.shots.splice(i, 1); }
        break;
      }
    }
    // ボスに 当たる
    const b = G.boss;
    if (b && b.alive && G.shots[i] === s) {
      if (Math.abs(b.x - s.x) < b.w / 2 + 0.4 && Math.abs(b.y - s.y) < b.h / 2 + 0.4) {
        hitBoss(s.k === 'BOMB' ? 3 : 2);
        if (s.k !== 'BOOM') { if (s.k === 'BOMB') boom(s.x, s.y); G.shots.splice(i, 1); }
      }
    }
  }
}

function boom(x, y) {
  sfxBoom();
  G.shake = 10;
  for (let i = 0; i < 20; i++) {
    G.parts.push({ x, y, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 14,
                   col: Math.random() < 0.5 ? '#FFD24A' : '#FF8A3A', t: 0, life: 0.6 });
  }
  for (const e of G.enemies) {
    if (e.alive && Math.hypot(e.x - x, e.y - y) < 2.4) hitEnemy(e, 4);
  }
  const b = G.boss;
  if (b && b.alive && Math.hypot(b.x - x, b.y - y) < 2.8) hitBoss(3);
  // こわせる ブロックも こわす
  for (let ty = Math.floor(y) - 1; ty <= Math.floor(y) + 1; ty++) {
    for (let tx = Math.floor(x) - 1; tx <= Math.floor(x) + 1; tx++) {
      if (at(tx, ty) === 'B') breakBlock(tx, ty);
    }
  }
  const p = G.p;
  if (p.invT <= 0 && Math.hypot(p.x + PW / 2 - x, p.y + PH / 2 - y) < 1.5) hurt('じぶんの ばくだんに あたった！');
}

// --- ダメージ と 死 -----------------------------------------------------------------------
function hurt(why) {
  const p = G.p;
  if (p.invT > 0 || G.dead > 0 || G.over) return;
  if (p.board) { breakBoard(why); return; }
  die(why);
}

function die(why) {
  if (G.dead > 0 || G.over) return;
  G.lives--;
  G.dead = 1.5;
  G.shake = 14;
  sfxDie();
  G.msg = why; G.msgT = 1.8;
  const p = G.p;
  for (let i = 0; i < 16; i++) {
    G.parts.push({ x: p.x + PW / 2, y: p.y + PH / 2, vx: (Math.random() - 0.5) * 12,
                   vy: -Math.random() * 12, col: '#FF8AA8', t: 0, life: 0.8 });
  }
}

// --- てき ---------------------------------------------------------------------------------
//
// ★ 島に いそうな ものを ならべた。ふみつけで たおせる ものと、
//   ふめない もの（カニは からが かたい・ハチは とげ）を まぜて ある。
//
//   BLOB  スライム   … 歩く。ふめる
//   CRAB  カニ       … よこに 歩く。**上は かたくて ふめない**。よこから 当てる
//   SNAKE へび       … はやく 歩く。ふめる
//   FISH  さかな     … 水から とびはねる。ふめる（空中で）
//   OCTO  タコ       … その場から すみを なげる。ふめる
//   BUG   むし       … 空を なみに とぶ。ふめる
//   BAT   コウモリ   … ぶら下がって いて、近づくと おそって くる
//   BEE   ハチ       … 近づいて くる。**とげが あって ふめない**
//   ROCK  おち岩     … 下を 通ると 落ちて くる。**たおせない**（よける）

const FOE_DEF = {
  BLOB:  { w: 0.86, h: 0.80, hp: 1, stomp: 1, spd: 2.4, score: 30, col: '#B06AD8' },
  CRAB:  { w: 1.05, h: 0.72, hp: 2, stomp: 0, spd: 2.0, score: 60, col: '#E85A4A' },
  SNAKE: { w: 1.25, h: 0.55, hp: 1, stomp: 1, spd: 4.6, score: 50, col: '#5AC86A' },
  FISH:  { w: 0.90, h: 0.72, hp: 1, stomp: 1, spd: 0, score: 45, col: '#4AB8E8' },
  OCTO:  { w: 1.00, h: 0.95, hp: 2, stomp: 1, spd: 0, score: 70, col: '#E06AB0' },
  BUG:   { w: 0.72, h: 0.62, hp: 1, stomp: 1, spd: 3.0, score: 40, col: '#C8D84A' },
  BAT:   { w: 0.85, h: 0.60, hp: 1, stomp: 1, spd: 4.2, score: 50, col: '#8A6AC8' },
  BEE:   { w: 0.70, h: 0.66, hp: 1, stomp: 0, spd: 3.6, score: 60, col: '#FFC84A' },
  ROCK:  { w: 1.00, h: 1.00, hp: 99, stomp: 0, spd: 0, score: 0, col: '#8A8A96' },
};

function mkEnemy(kind, x, y) {
  const d = FOE_DEF[kind] || FOE_DEF.BLOB;
  return {
    kind, x, y: y + 0.5, w: d.w, h: d.h, hp: d.hp, hpMax: d.hp,
    vx: -d.spd, vy: 0, t: Math.random() * 3, alive: true, state: 0, home: y + 0.5, homeX: x,
    hurtT: 0,
  };
}

function updateEnemies(dt) {
  const p = G.p;
  const near = 18;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (Math.abs(e.x - p.x) > near) continue;         // 見えて いる ぶんだけ 動かす
    e.t += dt;
    if (e.hurtT > 0) e.hurtT -= dt;
    const d = FOE_DEF[e.kind];

    if (e.kind === 'BLOB' || e.kind === 'CRAB' || e.kind === 'SNAKE') {
      // 地めんを 歩く。へりで ふりむく
      e.x += e.vx * dt;
      const front = e.x + Math.sign(e.vx) * (e.w / 2 + 0.1);
      const fy = Math.floor(e.y + e.h / 2 + 0.2);
      const ahead = at(Math.floor(front), fy);
      const wall = solid(Math.floor(front), Math.floor(e.y));
      if (!(ahead === '#' || ahead === 'I' || ahead === 'M' || ahead === '=') || wall ||
          deadly(at(Math.floor(front), Math.floor(e.y)))) {
        e.vx = -e.vx; e.x += e.vx * dt * 2;
      }
      // 地めんに くっつける
      const gyy = Math.floor(e.y + e.h / 2 + 0.2);
      if (at(Math.floor(e.x), gyy) === '.' ) e.y += 6 * dt;

    } else if (e.kind === 'FISH') {
      // 水から とびはねる
      if (e.state === 0) {
        if (e.t > 1.6) { e.state = 1; e.vy = -13; e.t = 0; }
      } else {
        e.vy += 34 * dt; e.y += e.vy * dt;
        if (e.y > e.home + 1.2) { e.y = e.home; e.state = 0; e.t = 0; e.vy = 0; }
      }

    } else if (e.kind === 'OCTO') {
      // すみを なげる
      if (e.t > 2.0) {
        e.t = 0;
        const dx = p.x - e.x, dy = p.y - e.y;
        const l = Math.max(1, Math.hypot(dx, dy));
        G.shots.push({ k: 'INK', foe: true, x: e.x, y: e.y - 0.3,
                       vx: dx / l * 7, vy: dy / l * 7 - 3, t: 0, spin: 0 });
      }

    } else if (e.kind === 'BUG') {
      e.x += e.vx * dt;
      e.y = e.home + Math.sin(e.t * 2.6) * 1.5;
      if (Math.abs(e.x - e.homeX) > 5) e.vx = -e.vx;

    } else if (e.kind === 'BAT') {
      if (e.state === 0) {
        if (Math.abs(e.x - p.x) < 6) { e.state = 1; }
      } else {
        const dx = p.x - e.x, dy = p.y - e.y;
        const l = Math.max(0.5, Math.hypot(dx, dy));
        e.x += dx / l * d.spd * dt;
        e.y += dy / l * d.spd * 0.7 * dt;
        e.y += Math.sin(e.t * 8) * 1.6 * dt;
      }

    } else if (e.kind === 'BEE') {
      const dx = p.x - e.x, dy = p.y - e.y;
      const l = Math.max(0.5, Math.hypot(dx, dy));
      e.x += dx / l * d.spd * dt;
      e.y += dy / l * d.spd * dt + Math.sin(e.t * 12) * 2.2 * dt;

    } else if (e.kind === 'ROCK') {
      if (e.state === 0) {
        if (Math.abs(e.x - (p.x + PW / 2)) < 1.4 && p.y > e.y) { e.state = 1; sfxWarn(); }
      } else {
        e.vy += 42 * dt; e.y += e.vy * dt;
        const gyy = Math.floor(e.y + e.h / 2);
        if (solid(Math.floor(e.x), gyy)) {
          e.alive = false;
          G.shake = 8;
          for (let i = 0; i < 10; i++) {
            G.parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 10,
                           vy: -Math.random() * 8, col: '#8A8A96', t: 0, life: 0.5 });
          }
        }
      }
    }

    // エイトくんに あたる
    if (G.dead > 0 || G.clearT > 0) continue;
    const b = pbox();
    if (!overlap(b.x, b.y, b.w, b.h, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) continue;

    const canStomp = d.stomp && p.vy > 2 && (p.y + PH) < e.y + e.h * 0.5;
    if (canStomp) {
      hitEnemy(e, 99);
      p.vy = JUMP_V * 0.66; p.jumpHold = true; p.squash = 0.16;
    } else if (p.slide > 0 || p.board || p.invT > 0) {
      if (p.invT > 0 && !p.slide && !p.board) hitEnemy(e, 99);
      else hitEnemy(e, 2);                       // スライディング・スケボーで たおす
    } else {
      hurt(kindName(e.kind) + 'に あたった！');
    }
  }

  // てきの たま（すみ）
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    if (!s.foe) continue;
    s.t += dt;
    s.vy += 16 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.t > 3 || solid(Math.floor(s.x), Math.floor(s.y))) { G.shots.splice(i, 1); continue; }
    const b = pbox();
    if (overlap(b.x, b.y, b.w, b.h, s.x - 0.25, s.y - 0.25, 0.5, 0.5)) {
      G.shots.splice(i, 1);
      hurt('すみに あたった！');
    }
  }
}

function kindName(k) {
  return { BLOB: 'スライム', CRAB: 'カニ', SNAKE: 'へび', FISH: 'さかな', OCTO: 'タコ',
           BUG: 'むし', BAT: 'コウモリ', BEE: 'ハチ', ROCK: '岩' }[k] || 'てき';
}

function hitEnemy(e, dmg) {
  if (!e.alive) return;
  if (e.kind === 'ROCK') return;                 // 岩は こわせない
  e.hp -= dmg; e.hurtT = 0.16;
  if (e.hp > 0) { sfxKill(); return; }
  killEnemy(e);
}

function killEnemy(e) {
  if (!e.alive || e.kind === 'ROCK') return;
  e.alive = false;
  const d = FOE_DEF[e.kind];
  G.score += d.score;
  sfxKill();
  G.pops.push({ x: e.x, y: e.y, text: '+' + d.score, col: '#FFF0C8', t: 0 });
  for (let i = 0; i < 10; i++) {
    G.parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 11,
                   vy: -Math.random() * 9, col: d.col, t: 0, life: 0.55 });
  }
  // ときどき フルーツを おとす
  if (Math.random() < 0.30) {
    const tx = Math.round(e.x), ty = Math.round(e.y);
    if (at(tx, ty) === '.') setAt(tx, ty, 'f');
  }
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --- ボス -----------------------------------------------------------------------------------
//
// ★ 「どの めんにも ボスを おいて」と 言われた ので、10たい 作った。
//   どれも **あいずを 出してから こうげき**する。よく 見れば よけられる。
//   たおしかたは 「ふみつけ」か「なげもの」。ボスに よって 弱点が ちがう。

const BOSS_DEF = {
  CRAB_KING:  { name: 'ヤドカリ大王', hp: 8, w: 2.6, h: 2.0, col: '#E85A4A', col2: '#F0A090',
                stompOK: false, move: 'dash', shot: 'bubble' },
  BEE_QUEEN:  { name: 'ハチの じょおう', hp: 8, w: 2.2, h: 1.8, col: '#FFC84A', col2: '#3A2E20',
                stompOK: false, move: 'fly', shot: 'bee' },
  GOLEM:      { name: 'いわの ゴーレム', hp: 10, w: 2.6, h: 2.8, col: '#9A8A78', col2: '#6A5E52',
                stompOK: true, move: 'jump', shot: 'rock' },
  LAVA_SNAKE: { name: 'マグマへび', hp: 10, w: 3.0, h: 1.4, col: '#E8622A', col2: '#FFD24A',
                stompOK: false, move: 'wave', shot: 'fire' },
  OCTO_KING:  { name: 'おおダコ', hp: 11, w: 2.8, h: 2.4, col: '#E06AB0', col2: '#8A2E60',
                stompOK: true, move: 'hover', shot: 'ink3' },
  ICE_OWL:    { name: 'こおりの フクロウ', hp: 11, w: 2.4, h: 2.2, col: '#CFE4F4', col2: '#5A8AB8',
                stompOK: false, move: 'dive', shot: 'icicle' },
  FROG:       { name: 'どくガエル', hp: 12, w: 2.6, h: 2.0, col: '#8AC84A', col2: '#4A7A2A',
                stompOK: true, move: 'hop', shot: 'tongue' },
  BAT_KING:   { name: 'コウモリ王', hp: 12, w: 2.6, h: 1.8, col: '#8A6AC8', col2: '#3A2A58',
                stompOK: false, move: 'swoop', shot: 'wave' },
  STONE_BIRD: { name: 'いしの とり', hp: 13, w: 3.0, h: 2.2, col: '#C8C0E0', col2: '#8E86AE',
                stompOK: true, move: 'fly', shot: 'wind' },
  DEMON:      { name: 'まおう', hp: 16, w: 2.8, h: 3.0, col: '#8A3AC0', col2: '#FFD24A',
                stompOK: false, move: 'teleport', shot: 'all' },
};

function startBoss() {
  const lv = G.lv;
  const d = BOSS_DEF[lv.st.boss];
  G.bossOn = true;
  BG.hot = 1;
  // ★ 地めんを 歩く ボスは 地めんに 立たせる。空を とぶ ボスだけ 上に おく。
  //   前は ぜんぶ 高い ところに 出して いて、画面の 上に はみ出して
  //   ボスの すがたが 見えなかった。
  const fly = d.move === 'fly' || d.move === 'hover' || d.move === 'dive' ||
              d.move === 'swoop' || d.move === 'wave' || d.move === 'teleport';
  const by = fly ? lv.gy - d.h / 2 - 2.2 : lv.gy - d.h / 2 - 0.02;
  G.boss = {
    kind: lv.st.boss, def: d, name: d.name,
    x: lv.bossX + 4, y: by, w: d.w, h: d.h,
    hp: d.hp, hpMax: d.hp, alive: true,
    st: 'wait', stT: 1.4, t: 0, vx: 0, vy: 0, face: -1, hurtT: 0,
    baseY: by, phase: 0, fly: fly,
  };
  G.msg = d.name + ' が あらわれた！'; G.msgT = 2.2;
  sfxRoar();
}

function updateBoss(dt) {
  const b = G.boss;
  if (!b || !b.alive) return;
  const p = G.p, d = b.def;
  // ★ なげものが なくなったら へやに また たまごを わかせる（つんだ ままに しない）
  b.eggT = (b.eggT || 0) - dt;
  if ((!p.wep || p.ammo <= 0) && b.eggT <= 0) {
    b.eggT = 7;
    const lv = G.lv;
    for (const tx of [lv.bossX - 6, lv.bossX + 4]) {
      if (at(tx, lv.gy - 1) === '.') { setAt(tx, lv.gy - 1, 'w'); break; }
    }
  }
  b.t += dt; b.stT -= dt;
  if (b.hurtT > 0) b.hurtT -= dt;
  b.face = p.x < b.x ? -1 : 1;
  const rage = b.hp <= b.hpMax * 0.4 ? 1.45 : 1;   // のこりが 少ないと はやく なる

  if (b.st === 'wait') {
    b.x += Math.sin(b.t * 1.6) * 1.2 * dt;
    if (b.stT <= 0) { b.st = 'tell'; b.stT = 0.75 / rage; sfxWarn(); }
  } else if (b.st === 'tell') {
    // あいず。近づく／ふくらむ
    if (b.stT <= 0) {
      b.st = 'act'; b.stT = 1.1;
      bossAct(b, rage);
    }
  } else if (b.st === 'act') {
    bossMove(b, dt, rage);
    if (b.stT <= 0) { b.st = 'wait'; b.stT = (1.1 + Math.random() * 0.7) / rage; b.vx = 0; b.vy = 0; }
  }

  // へやから 出ない
  b.x = clamp(b.x, G.lv.bossX - 4, G.lv.w - 2.5);
  b.y = clamp(b.y, G.lv.gy - 8, G.lv.gy - d.h / 2 - 0.02);

  // エイトくんと ぶつかる
  if (G.dead > 0 || G.clearT > 0) return;
  const pb = pbox();
  // ★ 見た目より 少し 小さい あたり はんい（かすっただけで 死ぬと つらい）
  const hw = b.w * 0.40, hh = b.h * 0.40;
  if (overlap(pb.x, pb.y, pb.w, pb.h, b.x - hw, b.y - hh, hw * 2, hh * 2)) {
    const canStomp = d.stompOK && p.vy > 2 && (p.y + PH) < b.y;
    if (canStomp) {
      hitBoss(1);
      p.vy = JUMP_V * 0.72; p.jumpHold = true;
    } else if (p.invT > 0) {
      hitBoss(1);
    } else {
      hurt(b.name + 'に あたった！');
    }
  }
}

function bossAct(b, rage) {
  const p = G.p, d = b.def;
  const shoot = (vx, vy, kind) => {
    G.shots.push({ k: kind || 'INK', foe: true, x: b.x, y: b.y, vx, vy, t: 0, spin: 0, big: 1 });
  };
  const toP = () => {
    const dx = p.x - b.x, dy = p.y - b.y, l = Math.max(1, Math.hypot(dx, dy));
    return [dx / l, dy / l];
  };
  if (d.move === 'dash') { b.vx = (p.x < b.x ? -1 : 1) * 9 * rage; }
  else if (d.move === 'jump') { b.vy = -14; b.vx = (p.x < b.x ? -1 : 1) * 4; }
  else if (d.move === 'hop') { b.vy = -12; b.vx = (p.x < b.x ? -1 : 1) * 6 * rage; }
  else if (d.move === 'dive' || d.move === 'swoop') { const [ux, uy] = toP(); b.vx = ux * 8.5 * rage; b.vy = uy * 6.5 * rage; }
  else if (d.move === 'teleport') { b.x = p.x + (Math.random() < 0.5 ? -4 : 4); b.y = b.baseY - Math.random() * 2; }

  const s = d.shot;
  if (s === 'bubble') { for (let i = -1; i <= 1; i++) shoot(b.face * 6 + i * 1.6, -6 + i, 'BUBBLE'); }
  else if (s === 'bee') { for (let i = 0; i < 3; i++) { const [ux, uy] = toP(); shoot(ux * 7 + (i - 1) * 2, uy * 7, 'BEEB'); } }
  else if (s === 'rock') { for (let i = 0; i < 3; i++) G.enemies.push(mkEnemy('ROCK', b.x + (i - 1) * 3, 2)); }
  else if (s === 'fire') { for (let i = 0; i < 4; i++) shoot(b.face * (5 + i * 1.6), -8 + i * 1.4, 'FIRE'); }
  else if (s === 'ink3') { for (let i = -1; i <= 1; i++) { const [ux, uy] = toP(); shoot(ux * 8 + i * 2.2, uy * 8 - 2, 'INK'); } }
  else if (s === 'icicle') { for (let i = 0; i < 3; i++) shoot((i - 1) * 3.2, 9, 'ICE'); }
  else if (s === 'tongue') { const [ux, uy] = toP(); shoot(ux * 13, uy * 13, 'TONGUE'); }
  else if (s === 'wave') { for (let i = 0; i < 4; i++) shoot(b.face * 7, -5 + i * 3.0, 'WAVE'); }
  // ★ 4本を よこ1れつに とばすと よけられなかった（ロボットが 17回 死んだ）。
  //   3本に して、たてに 大きく ちらす。
  else if (s === 'wind') { for (let i = 0; i < 3; i++) shoot(b.face * 7, (i - 1) * 3.8, 'WIND'); }
  else if (s === 'all') {
    const [ux, uy] = toP();
    for (let i = -2; i <= 2; i++) shoot(ux * 8 + i * 2.0, uy * 8 + i * 1.0, 'FIRE');
    if (b.hp <= b.hpMax * 0.5) for (let i = 0; i < 2; i++) G.enemies.push(mkEnemy('BAT', b.x + (i ? 3 : -3), b.baseY - 3));
  }
  sfxRoar();
}

function bossMove(b, dt, rage) {
  const d = b.def;
  if (d.move === 'fly' || d.move === 'hover') {
    b.x += Math.cos(b.t * 1.9) * 3.6 * dt * rage;
    b.y = b.baseY - 1.6 + Math.sin(b.t * 2.4) * 1.3;
  } else if (d.move === 'wave') {
    b.x += b.face * 3.2 * dt * rage;
    b.y = b.baseY + Math.sin(b.t * 3.2) * 1.5;
  } else {
    b.x += b.vx * dt;
    b.vy += 40 * dt;
    b.y += b.vy * dt;
    const floorY = G.lv.gy - d.h / 2 - 0.02;
    if (b.y > floorY) {
      b.y = floorY; b.vy = 0;
      if (d.move === 'jump' || d.move === 'hop') { G.shake = 9; b.vx *= 0.3; }
    }
    b.vx *= (1 - Math.min(1, dt * 1.6));
  }
}

function hitBoss(dmg) {
  const b = G.boss;
  if (!b || !b.alive || b.hurtT > 0.08) return;
  b.hp -= dmg; b.hurtT = 0.24;
  G.shake = 7;
  sfxBossHit();
  for (let i = 0; i < 8; i++) {
    G.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 10,
                   vy: -Math.random() * 8, col: b.def.col2, t: 0, life: 0.5 });
  }
  if (b.hp <= 0) {
    b.alive = false;
    G.goalOpen = true;
    BG.hot = 0;
    G.score += 500;
    save.boss++; storeSave();
    sfxBossDie();
    G.shake = 18;
    G.msg = b.name + ' を たおした！ ゴールが ひらいた';
    G.msgT = 2.6;
    for (let i = 0; i < 40; i++) {
      G.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 20,
                     vy: -Math.random() * 16, col: Math.random() < 0.5 ? b.def.col : '#FFD24A',
                     t: 0, life: 1.1 });
    }
    // ごほうびの 大フルーツ
    const tx = Math.round(b.x), ty = Math.round(b.y);
    if (at(tx, ty) === '.') setAt(tx, ty, 'F');
  }
}

// --- 絵 -------------------------------------------------------------------------------------
function ts() { return (VH - HUD) / TILES_Y; }
function sx(tx) { return (tx - G.cam) * ts(); }
function sy(ty) { return HUD + (ty - G.camY) * ts(); }

function drawBg() {
  const th = THEMES[G.lv.st.theme];
  const dark = G.wx === 'night' ? 0.62 : G.wx === 'storm' ? 0.34 : G.wx === 'fog' ? 0.18 :
               G.wx === 'rain' ? 0.22 : G.wx === 'cloud' ? 0.10 : 0;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, mix(th.sky[0], '#0A0A18', dark));
  g.addColorStop(1, mix(th.sky[1], '#0A0A18', dark));
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  // とおくの 島（おくゆき）
  const t = ts();
  ctx.fillStyle = mix(th.deco, '#0A0A18', 0.45 + dark * 0.4);
  for (let i = -1; i < 9; i++) {
    const bx = (i * 260 - (G.cam * t * 0.22) % 260);
    const by = HUD + (VH - HUD) * 0.60;
    ctx.beginPath();
    ctx.moveTo(bx - 130, by + 90);
    ctx.quadraticCurveTo(bx, by - 60, bx + 130, by + 90);
    ctx.closePath(); ctx.fill();
  }
  // 手まえの 島
  ctx.fillStyle = mix(th.gnd2, '#0A0A18', 0.30 + dark * 0.4);
  for (let i = -1; i < 8; i++) {
    const bx = (i * 340 - (G.cam * t * 0.42) % 340);
    const by = HUD + (VH - HUD) * 0.74;
    ctx.beginPath();
    ctx.moveTo(bx - 170, by + 120);
    ctx.quadraticCurveTo(bx, by - 40, bx + 170, by + 120);
    ctx.closePath(); ctx.fill();
  }
}

function mix(a, b, k) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
}

function drawTiles() {
  const lv = G.lv, t = ts(), th = THEMES[lv.st.theme];
  const x0 = Math.max(0, Math.floor(G.cam) - 1);
  const x1 = Math.min(lv.w - 1, Math.ceil(G.cam + viewTilesX()) + 1);
  const y0 = Math.max(0, Math.floor(G.camY) - 1);
  const y1 = Math.min(lv.h - 1, Math.ceil(G.camY + TILES_Y) + 1);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = lv.g[ty][tx];
      if (c === '.') continue;
      const px = sx(tx), py = sy(ty);
      if (c === '#' || c === 'I' || c === 'M') {
        const top = !solid(tx, ty - 1);
        // ★ どろの ような 1色の かたまりに 見えない よう、まだらを 入れる

        ctx.fillStyle = c === 'I' ? '#BFE0F4' : c === 'M' ? '#4A5A38' : th.gnd2;
        ctx.fillRect(px, py, t + 1, t + 1);
        if (top) {
          ctx.fillStyle = c === 'I' ? '#EAF6FF' : c === 'M' ? '#6A7A48' : th.gnd;
          ctx.fillRect(px, py, t + 1, t * 0.34);
          if (c === '#' && lv.st.theme !== 'cave' && lv.st.theme !== 'castle') {
            ctx.fillStyle = th.deco;
            ctx.fillRect(px, py, t + 1, t * 0.11);
          }
          if (c === 'I') {
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillRect(px + t * 0.1, py + t * 0.05, t * 0.5, t * 0.08);
          }
        } else {
          // 中の ほうは 小石や ひびで もようを つける
          const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
          ctx.fillStyle = 'rgba(0,0,0,0.13)';
          circle(px + t * (0.2 + (h % 5) * 0.14), py + t * (0.25 + ((h >> 3) % 4) * 0.18),
                 t * (0.05 + (h % 3) * 0.025));
          ctx.fill();
          if ((h >> 7) % 5 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(px + t * 0.1, py + t * 0.55, t * 0.55, t * 0.07);
          }
        }
      } else if (c === '=') {
        ctx.fillStyle = th.deco;
        rr(px + 1, py + t * 0.20, t - 2, t * 0.30, t * 0.10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        rr(px + 1, py + t * 0.20, t - 2, t * 0.12, t * 0.06); ctx.fill();
      } else if (c === 'B') {
        ctx.fillStyle = '#A07850';
        rr(px + 1, py + 1, t - 2, t - 2, t * 0.12); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, t * 0.05);
        ctx.beginPath();
        ctx.moveTo(px + 1, py + t / 2); ctx.lineTo(px + t - 1, py + t / 2);
        ctx.moveTo(px + t / 2, py + 1); ctx.lineTo(px + t / 2, py + t - 1);
        ctx.stroke();
      } else if (c === 'V') {
        ctx.strokeStyle = '#3E8A46'; ctx.lineWidth = Math.max(3, t * 0.16);
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) {
          const yy = py + t * k / 4;
          const xx = px + t / 2 + Math.sin(k * 1.5 + ty) * t * 0.14;
          if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        ctx.fillStyle = '#5AC86A';
        circle(px + t * 0.30, py + t * 0.35, t * 0.13); ctx.fill();
        circle(px + t * 0.70, py + t * 0.72, t * 0.13); ctx.fill();
      } else if (c === 'W' || c === 'L') {
        const wob = Math.sin(G.t * 2.4 + tx * 0.7) * t * 0.06;
        ctx.fillStyle = c === 'L' ? '#E8622A' : th.water;
        ctx.fillRect(px, py + wob, t + 1, t + 1 - wob);
        ctx.fillStyle = c === 'L' ? 'rgba(255,210,74,0.55)' : 'rgba(255,255,255,0.28)';
        ctx.fillRect(px, py + wob, t + 1, t * 0.13);
        if (c === 'L' && Math.random() < 0.03) {
          G.parts.push({ x: tx + 0.5, y: ty, vx: (Math.random() - 0.5) * 2,
                         vy: -3 - Math.random() * 3, col: '#FFD24A', t: 0, life: 0.7, g: 12 });
        }
      } else if (c === '^') {
        ctx.fillStyle = lv.st.theme === 'lagoon' ? '#FF7AA8' : '#D8D8E0';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(px + t * (0.08 + k * 0.30), py + t);
          ctx.lineTo(px + t * (0.23 + k * 0.30), py + t * 0.20);
          ctx.lineTo(px + t * (0.38 + k * 0.30), py + t);
          ctx.closePath(); ctx.fill();
        }
      } else if (c === 'f') {
        drawFruit(px + t / 2, py + t / 2, t * 0.28, tx);
      } else if (c === 'F') {
        drawFruit(px + t / 2, py + t / 2, t * 0.42, tx);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        circle(px + t / 2, py + t / 2, t * 0.48 + Math.sin(G.t * 4) * 2); ctx.stroke();
      } else if (c === 'e') {
        drawEgg(px + t / 2, py + t / 2, t * 0.34);
      } else if (c === 'w') {
        const b2 = Math.sin(G.t * 4) * t * 0.06;
        ctx.fillStyle = '#8A6A44';
        rr(px + t * 0.14, py + t * 0.30 + b2, t * 0.72, t * 0.60, t * 0.10); ctx.fill();
        ctx.fillStyle = '#FFD24A';
        rr(px + t * 0.14, py + t * 0.30 + b2, t * 0.72, t * 0.16, t * 0.07); ctx.fill();
        ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = Math.max(2, t * 0.06);
        circle(px + t / 2, py + t * 0.60 + b2, t * 0.52 + Math.sin(G.t * 5) * 2); ctx.stroke();
        bigText('ぶき', px + t / 2, py + t * 0.05, Math.round(t * 0.30), '#FFD24A');
      }
    }
  }

  drawDeco(x0, x1);

  // ボス戦の あいだの「とじた 入口」
  if (G.bossOn && G.boss && G.boss.alive) {
    const wx = sx(lv.bossX - 14);
    if (wx > -t * 2 && wx < VW + t * 2) {
      ctx.fillStyle = '#5A4A78';
      ctx.fillRect(wx - t * 0.3, sy(lv.gy - 9), t * 0.6, t * 9);
      ctx.fillStyle = '#C8A8F0';
      for (let i = 0; i < 9; i++) {
        ctx.fillRect(wx - t * 0.42, sy(lv.gy - 9 + i) + t * 0.1, t * 0.84, t * 0.14);
      }
    }
  }

  // ゴール
  if (G.goalOpen) drawGoal(lv.goalX, lv.goalY);
  else if (G.bossOn) {
    const px = sx(lv.goalX), py = sy(lv.goalY);
    ctx.globalAlpha = 0.3;
    drawGoal(lv.goalX, lv.goalY);
    ctx.globalAlpha = 1;
  }
}

// --- 島の かざり（テーマごと）-----------------------------------------------------------
//
// ★ 「島らしい えんしゅつが ない」と 言われた ので、地めんの 上に
//   その 島らしい ものを ならべる。さいころは x から きめるので いつも おなじ。

function drawDeco(x0, x1) {
  const lv = G.lv, t = ts(), th = THEMES[lv.st.theme], theme = lv.st.theme;
  for (let tx = x0; tx <= x1; tx++) {
    const h = (tx * 2654435761) >>> 0;
    if ((h % 7) !== 0) continue;
    // その 列の 地めんの 高さ
    let gyy = -1;
    for (let y = 0; y < lv.h; y++) {
      const c = lv.g[y][tx];
      if (c === '#' || c === 'I' || c === 'M') { gyy = y; break; }
    }
    if (gyy < 0) continue;
    if (lv.g[gyy - 1] && lv.g[gyy - 1][tx] !== '.') continue;   // ものの 上には おかない
    const px = sx(tx) + t / 2, py = sy(gyy);
    const k = (h >> 3) % 3;

    if (theme === 'beach' || theme === 'jungle') {
      // やしの木／草
      if (k === 0) {
        const hh = t * (1.6 + ((h >> 5) % 3) * 0.35);
        ctx.strokeStyle = '#8A6A44'; ctx.lineWidth = Math.max(3, t * 0.13); ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + t * 0.2, py - hh * 0.6, px - t * 0.1, py - hh);
        ctx.stroke();
        ctx.fillStyle = th.deco;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.58 + Math.sin(G.t * 1.2 + tx) * 0.06;
          ctx.beginPath();
          ctx.ellipse(px - t * 0.1 + Math.cos(a) * t * 0.55, py - hh + Math.sin(a) * t * 0.35,
                      t * 0.58, t * 0.17, a, 0, Math.PI * 2);
          ctx.fill();
        }
        if (theme === 'beach') {
          ctx.fillStyle = '#8A5A2A';
          circle(px - t * 0.1, py - hh + t * 0.2, t * 0.12); ctx.fill();
        }
      } else {
        ctx.strokeStyle = th.deco; ctx.lineWidth = Math.max(2, t * 0.07);
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(px + i * t * 0.18, py);
          ctx.quadraticCurveTo(px + i * t * 0.3, py - t * 0.3,
                               px + i * t * 0.42 + Math.sin(G.t * 2 + i) * t * 0.05, py - t * 0.55);
          ctx.stroke();
        }
      }
    } else if (theme === 'lagoon') {
      if (k === 0) {                       // さんご
        ctx.strokeStyle = th.deco; ctx.lineWidth = Math.max(3, t * 0.12); ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(px + i * t * 0.28, py - t * 0.55);
          ctx.stroke();
        }
      } else {                             // ひとで
        ctx.fillStyle = '#FF9A5A';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? t * 0.10 : t * 0.24;
          if (i === 0) ctx.moveTo(px + Math.cos(a) * r, py - t * 0.2 + Math.sin(a) * r);
          else ctx.lineTo(px + Math.cos(a) * r, py - t * 0.2 + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      }
    } else if (theme === 'ice') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(px - t * 0.2, py); ctx.lineTo(px, py - t * (0.6 + k * 0.3)); ctx.lineTo(px + t * 0.2, py);
      ctx.closePath(); ctx.fill();
    } else if (theme === 'volcano' || theme === 'cave') {
      if (k === 0) {                       // けむり
        ctx.fillStyle = 'rgba(200,180,180,0.28)';
        for (let i = 0; i < 3; i++) {
          const yy = py - t * (0.3 + i * 0.5) - ((G.t * 20 + tx * 30) % 60);
          circle(px + Math.sin(G.t + i) * t * 0.2, yy, t * (0.16 + i * 0.06)); ctx.fill();
        }
      } else {
        ctx.fillStyle = th.gnd2;           // いわ
        ctx.beginPath();
        ctx.moveTo(px - t * 0.28, py); ctx.lineTo(px - t * 0.1, py - t * 0.42);
        ctx.lineTo(px + t * 0.16, py - t * 0.3); ctx.lineTo(px + t * 0.3, py);
        ctx.closePath(); ctx.fill();
      }
    } else if (theme === 'swamp') {
      ctx.strokeStyle = th.deco; ctx.lineWidth = Math.max(2, t * 0.08);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(px + i * t * 0.16, py);
        ctx.lineTo(px + i * t * 0.22 + Math.sin(G.t * 1.6 + i) * t * 0.06, py - t * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = '#6A5A2A';
      circle(px, py - t * 0.95, t * 0.09); ctx.fill();
    } else if (theme === 'sky') {
      ctx.fillStyle = th.gnd2;             // こわれた はしら
      rr(px - t * 0.20, py - t * (0.7 + k * 0.4), t * 0.40, t * (0.7 + k * 0.4), t * 0.06); ctx.fill();
      ctx.fillStyle = th.deco;
      rr(px - t * 0.26, py - t * (0.78 + k * 0.4), t * 0.52, t * 0.12, t * 0.05); ctx.fill();
    } else if (theme === 'castle') {
      // たいまつ
      ctx.fillStyle = '#5A4A38';
      rr(px - t * 0.06, py - t * 0.9, t * 0.12, t * 0.9, t * 0.04); ctx.fill();
      const fl = t * (0.16 + Math.sin(G.t * 9 + tx) * 0.04);
      ctx.fillStyle = '#FF9A3A';
      circle(px, py - t * 0.95, fl); ctx.fill();
      ctx.fillStyle = '#FFD24A';
      circle(px, py - t * 0.97, fl * 0.55); ctx.fill();
    } else {
      ctx.fillStyle = th.gnd2;
      ctx.beginPath();
      ctx.moveTo(px - t * 0.26, py); ctx.lineTo(px - t * 0.06, py - t * 0.36);
      ctx.lineTo(px + t * 0.2, py - t * 0.22); ctx.lineTo(px + t * 0.3, py);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawFruit(x, y, r, seed) {
  const c = ['#FF5A5A', '#FFB03A', '#FF7AB0', '#B06AE8'][seed % 4];
  ctx.fillStyle = c;
  circle(x, y, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  circle(x - r * 0.32, y - r * 0.34, r * 0.28); ctx.fill();
  ctx.strokeStyle = '#3EA85E'; ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x + r * 0.5, y - r * 1.5);
  ctx.stroke();
}

function drawEgg(x, y, r) {
  const b = Math.sin(G.t * 5) * r * 0.10;
  ctx.fillStyle = '#FFF6E0';
  ctx.beginPath(); ctx.ellipse(x, y + b, r * 0.82, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC84A';
  for (let i = 0; i < 3; i++) {
    circle(x - r * 0.4 + i * r * 0.4, y + b + (i % 2 ? r * 0.2 : -r * 0.25), r * 0.16); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y + b, r * 0.82, r, 0, 0, Math.PI * 2); ctx.stroke();
}

function drawGoal(tx, ty) {
  const t = ts(), x = sx(tx), y = sy(ty);
  ctx.fillStyle = '#8A6A4A';
  ctx.fillRect(x + t * 0.42, y - t * 4, t * 0.16, t * 4);
  const f = Math.sin(G.t * 4) * t * 0.10;
  ctx.fillStyle = '#FFD24A';
  ctx.beginPath();
  ctx.moveTo(x + t * 0.58, y - t * 4);
  ctx.lineTo(x + t * 2.0 + f, y - t * 3.5);
  ctx.lineTo(x + t * 0.58, y - t * 3.0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  circle(x + t * 0.5, y - t * 4.1, t * 0.16); ctx.fill();
  bigText('ゴール', x + t * 0.5, y - t * 4.7, Math.round(t * 0.42), '#FFF6C8');
}

// --- エイトくんの 絵 -----------------------------------------------------------------------
function drawEito() {
  const p = G.p, t = ts();
  const s = t * 0.92;                                  // ★ 前より 大きい
  const x = sx(p.x + PW / 2), yBase = sy(p.y + PH);
  const sliding = p.slide > 0;
  // 着地・ジャンプの ぐにゃっと（squash & stretch）
  let sqx = 1, sqy = 1;
  if (p.squash > 0) {
    const k = p.squash / 0.18;
    sqx = 1 + k * 0.22; sqy = 1 - k * 0.20;
  } else if (!p.onGround) {
    sqx = 0.92; sqy = 1.10;
  }
  if (sliding) { sqx = 1.3; sqy = 0.62; }

  ctx.save();
  if (p.invT > 0 && Math.floor(G.t * 14) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.translate(x, yBase);
  ctx.scale(sqx * (p.face < 0 ? -1 : 1), sqy);

  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();

  if (p.board) {
    ctx.fillStyle = '#E85A8A';
    rr(-s * 0.52, -s * 0.10, s * 1.04, s * 0.14, s * 0.06); ctx.fill();
    ctx.fillStyle = '#3A3A48';
    circle(-s * 0.30, s * 0.02, s * 0.09); ctx.fill();
    circle(s * 0.30, s * 0.02, s * 0.09); ctx.fill();
  }

  const legLift = p.board ? s * 0.10 : 0;
  const walkA = Math.sin(p.walk * 2.2);
  // あし
  ctx.strokeStyle = '#3A4A6A'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  if (sliding) {
    ctx.moveTo(-s * 0.10, -s * 0.30); ctx.lineTo(s * 0.42, -s * 0.14);
    ctx.moveTo(-s * 0.10, -s * 0.30); ctx.lineTo(s * 0.30, -s * 0.34);
  } else if (p.onGround) {
    ctx.moveTo(-s * 0.14, -s * 0.42); ctx.lineTo(-s * 0.14 + walkA * s * 0.22, -s * 0.04 - legLift);
    ctx.moveTo(s * 0.14, -s * 0.42); ctx.lineTo(s * 0.14 - walkA * s * 0.22, -s * 0.04 - legLift);
  } else {
    ctx.moveTo(-s * 0.14, -s * 0.42); ctx.lineTo(-s * 0.26, -s * 0.10);
    ctx.moveTo(s * 0.14, -s * 0.42); ctx.lineTo(s * 0.22, -s * 0.16);
  }
  ctx.stroke();

  // からだ
  const bodyY = sliding ? -s * 0.34 : -s * 0.86;
  ctx.fillStyle = '#3EC08A';
  rr(-s * 0.30, bodyY, s * 0.60, sliding ? s * 0.30 : s * 0.48, s * 0.16); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(-s * 0.30, bodyY, s * 0.60, s * 0.12, s * 0.06); ctx.fill();

  // うで
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  if (sliding) {
    ctx.moveTo(s * 0.14, bodyY + s * 0.10); ctx.lineTo(s * 0.52, bodyY - s * 0.06);
    ctx.moveTo(-s * 0.22, bodyY + s * 0.10); ctx.lineTo(-s * 0.46, bodyY + s * 0.16);
  } else if (!p.onGround) {
    ctx.moveTo(-s * 0.26, bodyY + s * 0.14); ctx.lineTo(-s * 0.46, bodyY - s * 0.14);
    ctx.moveTo(s * 0.26, bodyY + s * 0.14); ctx.lineTo(s * 0.46, bodyY - s * 0.14);
  } else {
    ctx.moveTo(-s * 0.26, bodyY + s * 0.14); ctx.lineTo(-s * 0.40 - walkA * s * 0.14, bodyY + s * 0.36);
    ctx.moveTo(s * 0.26, bodyY + s * 0.14); ctx.lineTo(s * 0.40 + walkA * s * 0.14, bodyY + s * 0.36);
  }
  ctx.stroke();

  // あたま
  const hy = bodyY - s * 0.34;
  ctx.fillStyle = '#F6CDA8';
  circle(0, hy, s * 0.34); ctx.fill();
  ctx.fillStyle = '#E8506A';
  ctx.beginPath(); ctx.arc(0, hy - s * 0.04, s * 0.36, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillRect(0, hy - s * 0.12, s * 0.52, s * 0.08);
  ctx.fillStyle = '#2A2028';
  circle(s * 0.10, hy + s * 0.06, s * 0.055); ctx.fill();
  circle(s * 0.22, hy + s * 0.06, s * 0.055); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  circle(s * 0.26, hy + s * 0.18, s * 0.07); ctx.fill();

  ctx.restore();

  // なげものの のこり
  if (p.wep && p.ammo > 0) {
    bigText(WEAPONS[p.wep].name + ' ×' + p.ammo, x, sy(p.y) - t * 0.36,
            Math.round(t * 0.30), WEAPONS[p.wep].col);
  }
}

// --- てきの 絵 ----------------------------------------------------------------------------
function drawEnemy(e) {
  const t = ts(), x = sx(e.x), y = sy(e.y);
  const w = e.w * t, h = e.h * t;
  const hurt = e.hurtT > 0;
  const d = FOE_DEF[e.kind];
  ctx.save();
  if (hurt) ctx.globalAlpha = 0.6;
  const col = hurt ? '#FFFFFF' : d.col;

  if (e.kind === 'BLOB') {
    const sq = 1 + Math.sin(e.t * 7) * 0.08;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2 * sq, h / 2 / sq, 0, Math.PI, 0);
    ctx.rect(x - w / 2 * sq, y, w * sq, h * 0.4);
    ctx.fill();
    eyes(x, y - h * 0.08, w * 0.16, Math.sign(e.vx));

  } else if (e.kind === 'CRAB') {
    ctx.fillStyle = col;
    rr(x - w / 2, y - h / 2, w, h, h * 0.42); ctx.fill();
    ctx.fillStyle = '#8A2E22';                        // かたい から
    rr(x - w / 2, y - h / 2, w, h * 0.34, h * 0.30); ctx.fill();
    // はさみ
    ctx.fillStyle = col;
    const cl = Math.sin(e.t * 6) * w * 0.05;
    circle(x - w * 0.56, y - h * 0.14 + cl, w * 0.17); ctx.fill();
    circle(x + w * 0.56, y - h * 0.14 - cl, w * 0.17); ctx.fill();
    // あし
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, w * 0.06);
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + sg * w * 0.2, y + h * 0.2);
        ctx.lineTo(x + sg * (w * 0.34 + i * w * 0.10), y + h * 0.5);
        ctx.stroke();
      }
    }
    eyes(x, y - h * 0.22, w * 0.12, 0);

  } else if (e.kind === 'SNAKE') {
    ctx.strokeStyle = col; ctx.lineWidth = h * 0.7; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const xx = x - Math.sign(e.vx) * (w / 2) + Math.sign(e.vx) * (w * i / 6);
      const yy = y + Math.sin(e.t * 8 + i * 0.9) * h * 0.28;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    const hx = x + Math.sign(e.vx) * w * 0.5;
    ctx.fillStyle = mix(d.col, '#FFFFFF', 0.2);
    circle(hx, y, h * 0.44); ctx.fill();
    eyes(hx, y - h * 0.08, h * 0.11, Math.sign(e.vx));
    ctx.strokeStyle = '#E8506A'; ctx.lineWidth = Math.max(1.5, h * 0.08);
    ctx.beginPath();
    ctx.moveTo(hx + Math.sign(e.vx) * h * 0.35, y + h * 0.1);
    ctx.lineTo(hx + Math.sign(e.vx) * h * 0.7, y + h * 0.2);
    ctx.stroke();

  } else if (e.kind === 'FISH') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(clamp(e.vy * 0.05, -0.9, 0.9));
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w * 0.44, 0); ctx.lineTo(-w * 0.78, -h * 0.34); ctx.lineTo(-w * 0.78, h * 0.34);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(0, h * 0.16, w * 0.36, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF'; circle(w * 0.22, -h * 0.10, h * 0.14); ctx.fill();
    ctx.fillStyle = '#2A2028'; circle(w * 0.25, -h * 0.10, h * 0.07); ctx.fill();
    ctx.restore();

  } else if (e.kind === 'OCTO') {
    ctx.fillStyle = col;
    circle(x, y - h * 0.12, w * 0.44); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ang = Math.PI * (0.15 + i * 0.175);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, w * 0.11); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * w * 0.3, y + h * 0.1);
      ctx.quadraticCurveTo(x + Math.cos(ang) * w * 0.6,
                           y + h * 0.4 + Math.sin(e.t * 5 + i) * h * 0.1,
                           x + Math.cos(ang) * w * 0.5, y + h * 0.55);
      ctx.stroke();
    }
    eyes(x, y - h * 0.18, w * 0.13, 0);

  } else if (e.kind === 'BUG') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.42, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const fl = Math.sin(e.t * 30) * h * 0.24;
    ctx.beginPath(); ctx.ellipse(x - w * 0.24, y - h * 0.34 + fl, w * 0.28, h * 0.20, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.24, y - h * 0.34 - fl, w * 0.28, h * 0.20, 0.5, 0, Math.PI * 2); ctx.fill();
    eyes(x, y - h * 0.06, w * 0.12, Math.sign(e.vx));

  } else if (e.kind === 'BAT') {
    const fl = Math.sin(e.t * 18) * h * 0.5;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.4 + fl, x - w * 0.95, y + h * 0.25 + fl);
    ctx.quadraticCurveTo(x - w * 0.5, y + h * 0.15, x, y + h * 0.25);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w * 0.95, y + h * 0.25 - fl);
    ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.4 - fl, x, y);
    ctx.fill();
    circle(x, y + h * 0.05, h * 0.44); ctx.fill();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.3, y - h * 0.3); ctx.lineTo(x - h * 0.14, y - h * 0.62); ctx.lineTo(x - h * 0.02, y - h * 0.26);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + h * 0.3, y - h * 0.3); ctx.lineTo(x + h * 0.14, y - h * 0.62); ctx.lineTo(x + h * 0.02, y - h * 0.26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF6A6A';
    circle(x - h * 0.14, y + h * 0.02, h * 0.09); ctx.fill();
    circle(x + h * 0.14, y + h * 0.02, h * 0.09); ctx.fill();

  } else if (e.kind === 'BEE') {
    const fl = Math.sin(e.t * 40) * h * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(x - w * 0.1, y - h * 0.4 + fl, w * 0.3, h * 0.16, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.1, y - h * 0.4 - fl, w * 0.3, h * 0.16, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.46, h * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A2028';
    for (let i = 0; i < 2; i++) {
      ctx.fillRect(x - w * 0.16 + i * w * 0.28, y - h * 0.38, w * 0.13, h * 0.76);
    }
    // とげ（ふめない しるし）
    ctx.fillStyle = '#3A3A48';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.12, y - h * 0.5); ctx.lineTo(x, y - h * 0.9); ctx.lineTo(x + w * 0.12, y - h * 0.5);
    ctx.closePath(); ctx.fill();
    eyes(x, y - h * 0.04, w * 0.11, 0);

  } else if (e.kind === 'ROCK') {
    ctx.fillStyle = e.state ? '#A08878' : col;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const r = w * 0.5 * (0.82 + ((i * 37) % 10) / 40);
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    circle(x - w * 0.14, y + h * 0.10, w * 0.13); ctx.fill();
    if (e.state === 0) {
      ctx.globalAlpha = 0.5 + Math.sin(G.t * 8) * 0.3;
      bigText('！', x, y - h * 0.8, Math.round(t * 0.5), '#FF8A5A');
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function eyes(x, y, r, dir) {
  ctx.fillStyle = '#FFF';
  circle(x - r * 1.1, y, r); ctx.fill();
  circle(x + r * 1.1, y, r); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x - r * 1.1 + dir * r * 0.3, y, r * 0.52); ctx.fill();
  circle(x + r * 1.1 + dir * r * 0.3, y, r * 0.52); ctx.fill();
}

// --- ボスの 絵 ----------------------------------------------------------------------------
function drawBoss() {
  const b = G.boss;
  if (!b || !b.alive) return;
  const t = ts(), x = sx(b.x), y = sy(b.y), w = b.w * t, h = b.h * t;
  const d = b.def;
  const tell = b.st === 'tell';
  ctx.save();
  if (b.hurtT > 0 && Math.floor(G.t * 30) % 2 === 0) ctx.globalAlpha = 0.55;

  // あいずの ひかり
  if (tell) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(G.t * 22) * 0.25;
    ctx.fillStyle = d.col2;
    circle(x, y, w * 0.75); ctx.fill();
    ctx.restore();
  }

  const col = b.hurtT > 0 ? '#FFFFFF' : d.col;
  const face = b.face;

  if (b.kind === 'CRAB_KING') {
    ctx.fillStyle = col;
    rr(x - w / 2, y - h / 2, w, h * 0.8, h * 0.34); ctx.fill();
    ctx.fillStyle = d.col2;
    rr(x - w / 2, y - h / 2, w, h * 0.3, h * 0.28); ctx.fill();
    ctx.fillStyle = col;
    for (const sg of [-1, 1]) {
      circle(x + sg * w * 0.62, y - h * 0.1 + Math.sin(G.t * 4 + sg) * h * 0.06, w * 0.20); ctx.fill();
    }
    crown(x, y - h * 0.52, w * 0.26);
    eyes(x, y - h * 0.24, w * 0.09, face);

  } else if (b.kind === 'BEE_QUEEN') {
    const fl = Math.sin(G.t * 34) * h * 0.24;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sg * w * 0.2, y - h * 0.42 + sg * fl, w * 0.4, h * 0.16, sg * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.46, h * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.col2;
    for (let i = 0; i < 3; i++) ctx.fillRect(x - w * 0.30 + i * w * 0.22, y - h * 0.4, w * 0.10, h * 0.8);
    crown(x, y - h * 0.44, w * 0.22);
    eyes(x, y - h * 0.06, w * 0.10, face);

  } else if (b.kind === 'GOLEM') {
    ctx.fillStyle = col;
    rr(x - w / 2, y - h / 2, w, h * 0.62, h * 0.12); ctx.fill();
    rr(x - w * 0.30, y + h * 0.10, w * 0.60, h * 0.40, h * 0.10); ctx.fill();
    ctx.fillStyle = d.col2;
    for (let i = 0; i < 4; i++) {
      circle(x - w * 0.3 + i * w * 0.2, y - h * 0.18 + (i % 2) * h * 0.16, w * 0.06); ctx.fill();
    }
    ctx.fillStyle = '#FF8A3A';
    circle(x - w * 0.14, y - h * 0.26, w * 0.07); ctx.fill();
    circle(x + w * 0.14, y - h * 0.26, w * 0.07); ctx.fill();

  } else if (b.kind === 'LAVA_SNAKE') {
    ctx.strokeStyle = col; ctx.lineWidth = h * 0.7; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 7; i++) {
      const xx = x + face * (w / 2) - face * (w * i / 7);
      const yy = y + Math.sin(G.t * 5 + i * 0.8) * h * 0.4;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = d.col2;
    circle(x + face * w * 0.48, y, h * 0.5); ctx.fill();
    eyes(x + face * w * 0.48, y - h * 0.1, h * 0.11, face);

  } else if (b.kind === 'OCTO_KING') {
    ctx.fillStyle = col;
    circle(x, y - h * 0.16, w * 0.44); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI * (0.10 + i * 0.16);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, w * 0.10); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * w * 0.3, y + h * 0.1);
      ctx.quadraticCurveTo(x + Math.cos(ang) * w * 0.7,
                           y + h * 0.45 + Math.sin(G.t * 4 + i) * h * 0.12,
                           x + Math.cos(ang) * w * 0.55, y + h * 0.6);
      ctx.stroke();
    }
    crown(x, y - h * 0.52, w * 0.24);
    eyes(x, y - h * 0.20, w * 0.12, face);

  } else if (b.kind === 'ICE_OWL') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.44, h * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.col2;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * w * 0.20, y - h * 0.40);
      ctx.lineTo(x + sg * w * 0.34, y - h * 0.62);
      ctx.lineTo(x + sg * w * 0.06, y - h * 0.46);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#FFF';
    circle(x - w * 0.14, y - h * 0.10, w * 0.14); ctx.fill();
    circle(x + w * 0.14, y - h * 0.10, w * 0.14); ctx.fill();
    ctx.fillStyle = '#FFA83A';
    circle(x - w * 0.14, y - h * 0.10, w * 0.07); ctx.fill();
    circle(x + w * 0.14, y - h * 0.10, w * 0.07); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.02); ctx.lineTo(x - w * 0.06, y + h * 0.12); ctx.lineTo(x + w * 0.06, y + h * 0.12);
    ctx.closePath(); ctx.fill();

  } else if (b.kind === 'FROG') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y + h * 0.06, w * 0.48, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.col2;
    for (let i = 0; i < 4; i++) {
      circle(x - w * 0.28 + i * w * 0.19, y + h * 0.06 + ((i % 2) ? h * 0.12 : -h * 0.10), w * 0.07); ctx.fill();
    }
    ctx.fillStyle = col;
    for (const sg of [-1, 1]) { circle(x + sg * w * 0.20, y - h * 0.34, w * 0.16); ctx.fill(); }
    ctx.fillStyle = '#FFF';
    for (const sg of [-1, 1]) { circle(x + sg * w * 0.20, y - h * 0.36, w * 0.10); ctx.fill(); }
    ctx.fillStyle = '#2A2028';
    for (const sg of [-1, 1]) { circle(x + sg * w * 0.20, y - h * 0.36, w * 0.05); ctx.fill(); }

  } else if (b.kind === 'BAT_KING') {
    const fl = Math.sin(G.t * 12) * h * 0.4;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.5 + fl, x - w * 0.95, y + h * 0.3 + fl);
    ctx.quadraticCurveTo(x - w * 0.5, y + h * 0.2, x, y + h * 0.3);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.2, x + w * 0.95, y + h * 0.3 - fl);
    ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.5 - fl, x, y);
    ctx.fill();
    circle(x, y + h * 0.02, h * 0.46); ctx.fill();
    ctx.fillStyle = d.col2;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * h * 0.3, y - h * 0.3); ctx.lineTo(x + sg * h * 0.16, y - h * 0.72);
      ctx.lineTo(x + sg * h * 0.03, y - h * 0.26);
      ctx.closePath(); ctx.fill();
    }
    crown(x, y - h * 0.62, h * 0.22);
    ctx.fillStyle = '#FF6A6A';
    circle(x - h * 0.16, y - h * 0.02, h * 0.10); ctx.fill();
    circle(x + h * 0.16, y - h * 0.02, h * 0.10); ctx.fill();

  } else if (b.kind === 'STONE_BIRD') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.34, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    const fl = Math.sin(G.t * 6) * h * 0.3;
    for (const sg of [-1, 1]) {
      ctx.fillStyle = sg > 0 ? d.col2 : col;
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.1);
      ctx.quadraticCurveTo(x + sg * w * 0.7, y - h * 0.5 + fl * sg, x + sg * w * 0.9, y + h * 0.1 + fl * sg);
      ctx.quadraticCurveTo(x + sg * w * 0.4, y + h * 0.1, x, y + h * 0.1);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#FFE08A';
    ctx.beginPath();
    ctx.moveTo(x + face * w * 0.30, y - h * 0.12);
    ctx.lineTo(x + face * w * 0.52, y - h * 0.02);
    ctx.lineTo(x + face * w * 0.30, y + h * 0.06);
    ctx.closePath(); ctx.fill();
    eyes(x + face * w * 0.12, y - h * 0.18, w * 0.07, face);

  } else {                                        // DEMON
    ctx.fillStyle = col;
    rr(x - w / 2, y - h * 0.36, w, h * 0.74, h * 0.16); ctx.fill();
    // つの
    ctx.fillStyle = d.col2;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * w * 0.22, y - h * 0.34);
      ctx.lineTo(x + sg * w * 0.40, y - h * 0.72);
      ctx.lineTo(x + sg * w * 0.10, y - h * 0.40);
      ctx.closePath(); ctx.fill();
    }
    // つばさ
    ctx.fillStyle = mix(d.col, '#000000', 0.35);
    const fl = Math.sin(G.t * 5) * h * 0.16;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * w * 0.3, y - h * 0.2);
      ctx.quadraticCurveTo(x + sg * w * 0.95, y - h * 0.5 + fl, x + sg * w * 0.8, y + h * 0.25 + fl);
      ctx.quadraticCurveTo(x + sg * w * 0.5, y + h * 0.05, x + sg * w * 0.3, y + h * 0.1);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#FF4A4A';
    circle(x - w * 0.13, y - h * 0.16, w * 0.09); ctx.fill();
    circle(x + w * 0.13, y - h * 0.16, w * 0.09); ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.beginPath(); ctx.arc(x, y + h * 0.06, w * 0.18, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();

  // ボスの たいりょく
  const bw = Math.min(VW * 0.5, 260), bh = 12;
  const bx = VW / 2 - bw / 2, by = HUD + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = b.hp / b.hpMax < 0.4 ? '#FF6A6A' : '#FFD24A';
  rr(bx + 2, by + 2, Math.max(0, (bw - 4) * b.hp / b.hpMax), bh - 4, (bh - 4) / 2); ctx.fill();
  bigText(b.name, VW / 2, by + bh + 10, 14, '#FFF6C8');
}

function crown(x, y, r) {
  ctx.fillStyle = '#FFD24A';
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.5);
  ctx.lineTo(x - r, y - r * 0.5); ctx.lineTo(x - r * 0.4, y);
  ctx.lineTo(x, y - r * 0.8); ctx.lineTo(x + r * 0.4, y);
  ctx.lineTo(x + r, y - r * 0.5); ctx.lineTo(x + r, y + r * 0.5);
  ctx.closePath(); ctx.fill();
}

// --- 画面 ------------------------------------------------------------------------------------
function drawPlay() {
  const t = ts();
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);

  drawBg();
  drawTiles();

  // なげもの・てきの たま
  for (const s of G.shots) {
    const x = sx(s.x), y = sy(s.y), r = t * (s.big ? 0.26 : 0.20);
    if (s.k === 'AXE' || s.k === 'BOOM') {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(s.spin);
      ctx.fillStyle = s.k === 'AXE' ? '#C8A060' : '#8AE0C0';
      if (s.k === 'AXE') {
        ctx.fillRect(-t * 0.05, -t * 0.24, t * 0.10, t * 0.48);
        ctx.fillStyle = '#D8D8E0';
        ctx.beginPath();
        ctx.moveTo(0, -t * 0.24); ctx.lineTo(t * 0.26, -t * 0.10); ctx.lineTo(0, t * 0.02);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.lineWidth = t * 0.12; ctx.strokeStyle = '#8AE0C0'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-t * 0.22, t * 0.10); ctx.lineTo(0, -t * 0.20);
        ctx.lineTo(t * 0.22, t * 0.10); ctx.stroke();
      }
      ctx.restore();
    } else if (s.k === 'BOMB') {
      ctx.fillStyle = '#3A3A48';
      circle(x, y, t * 0.24); ctx.fill();
      ctx.fillStyle = s.fuse < 0.4 && Math.floor(G.t * 14) % 2 ? '#FF4A4A' : '#FFD24A';
      circle(x + t * 0.16, y - t * 0.22, t * 0.08); ctx.fill();
    } else {
      const col = { INK: '#4A2A5A', BUBBLE: '#8AD8F0', BEEB: '#FFC84A', FIRE: '#FF7A3A',
                    ICE: '#CFE8FF', TONGUE: '#FF7AA8', WAVE: '#C8A8F0', WIND: '#E8E8FF' }[s.k] || '#4A2A5A';
      ctx.fillStyle = col;
      circle(x, y, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      circle(x - r * 0.3, y - r * 0.3, r * 0.36); ctx.fill();
    }
  }

  for (const e of G.enemies) if (e.alive) drawEnemy(e);
  drawBoss();
  if (G.dead <= 0) drawEito();

  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / (q.life || 0.8));
    ctx.fillStyle = q.col;
    circle(sx(q.x), sy(q.y), t * 0.09); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9);
    bigText(q.text, sx(q.x), sy(q.y) - q.t * 34, Math.round(t * 0.34), q.col);
    ctx.globalAlpha = 1;
  }

  // かみなりの しるし と いなずま
  if (G.lightMark) {
    const x = sx(G.lightMark.x + 0.5);
    const gyy = groundYAt(G.lightMark.x);
    const y = sy(gyy);
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(G.t * 26) * 0.35;
    ctx.strokeStyle = '#FFE04A'; ctx.lineWidth = Math.max(3, t * 0.10);
    circle(x, y, t * 0.9); ctx.stroke();
    ctx.fillStyle = 'rgba(255,224,74,0.16)';
    circle(x, y, t * 0.9); ctx.fill();
    ctx.globalAlpha = 0.8;
    bigText('！', x, y - t * 1.5, Math.round(t * 0.7), '#FFE04A');
    ctx.restore();
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    b.t += 0.02;
    if (b.t > 0.30) { G.bolts.splice(i, 1); continue; }
    const x = sx(b.x + 0.5), y1 = sy(groundYAt(b.x));
    ctx.save();
    ctx.globalAlpha = 1 - b.t / 0.30;
    ctx.strokeStyle = '#FFF6C8'; ctx.lineWidth = Math.max(4, t * 0.16); ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, HUD);
    let yy = HUD;
    let xx = x;
    while (yy < y1) {
      yy += t * 0.8;
      xx += (Math.random() - 0.5) * t * 0.7;
      ctx.lineTo(xx, Math.min(yy, y1));
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  drawWeatherFront();
  drawHud();
  drawControls();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    const fs = fitSize(G.msg, VW * 0.86, 22);
    const w = VW * 0.90;
    ctx.fillStyle = 'rgba(10,6,22,0.72)';
    rr(VW / 2 - w / 2, HUD + 34, w, 32, 16); ctx.fill();
    bigText(G.msg, VW / 2, HUD + 50, fs, '#FFF6C8', null);
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'ゲームオーバー',
      ['スコア ' + G.score + '　たべた フルーツ ' + G.fruit,
       G.win ? G.lv.st.name + ' を こえた！' : 'のこり ' + Math.max(0, G.lives) + ' で おわり'],
      G.win && G.si + 1 < STAGES.length
        ? [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'つぎの しま', on: () => startStage(G.si + 1), col: '#8AF0B0' },
           { label: 'えらぶ', on: () => { G.screen = 'title'; bgmStopIsland(); }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startStage(G.si) },
           { label: 'しまを えらぶ', on: () => { G.screen = 'title'; bgmStopIsland(); }, col: '#8AD8F0' }]);
  }
}

function groundYAt(tx) {
  for (let y = 0; y < G.lv.h; y++) {
    const c = at(tx, y);
    if (c === '#' || c === 'I' || c === 'M' || c === 'W' || c === 'L') return y;
  }
  return G.lv.h - 1;
}

// 天気の 手まえの えんしゅつ
function drawWeatherFront() {
  if (G.wx === 'rain' || G.wx === 'storm') {
    ctx.save();
    ctx.strokeStyle = G.wx === 'storm' ? 'rgba(200,220,255,0.55)' : 'rgba(180,210,255,0.42)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const d of G.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 4, d.y + 14);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (G.wx === 'fog') {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#E8F0FF';
      const y = HUD + (VH - HUD) * (0.2 + i * 0.22);
      const off = (G.t * (14 + i * 9)) % (VW + 300) - 150;
      ctx.beginPath();
      ctx.ellipse(off, y, 220, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(off - VW * 0.8, y + 20, 190, 30, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (G.wx === 'night' && G.p) {
    // まわりだけ 見える
    ctx.save();
    const x = sx(G.p.x + PW / 2), y = sy(G.p.y + PH / 2);
    const g = ctx.createRadialGradient(x, y, ts() * 2.0, x, y, ts() * 6.5);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(2,2,12,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(-VW, HUD, VW * 3, VH + VOB);
    ctx.restore();
  }
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.55).toFixed(3) + ')';
    ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  }
}

// --- HUD と ボタン ---------------------------------------------------------------------------
function drawHud() {
  const p = G.p, lv = G.lv;
  ctx.fillStyle = 'rgba(10,6,22,0.85)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  // たいりょく
  const bw = Math.min(160, VW * 0.20), bh = 14, bx = 10, by = HUD / 2 - bh / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(bx, by, bw, bh, bh / 2); ctx.fill();
  const k = p.life / LIFE_MAX;
  ctx.fillStyle = k < 0.25 ? '#FF6A8A' : k < 0.5 ? '#FFD24A' : '#8AF0B0';
  rr(bx + 2, by + 2, Math.max(0, (bw - 4) * k), bh - 4, (bh - 4) / 2); ctx.fill();
  ctx.fillStyle = '#F0EAFF';
  ctx.fillText('たいりょく', bx + bw + 8, HUD / 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText('スコア ' + G.score + '　' + WX_NAME[G.wx], VW / 2, HUD / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#F0EAFF';
  const prog = Math.round(clamp(p.x / (lv.w - 8), 0, 1) * 100);
  ctx.fillText('のこり ' + '▲'.repeat(clamp(G.lives, 0, 9)) + '　' + prog + '%', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawControls() {
  drawStick();
  drawFire('ジャンプ', '#FFD24A');
  // なげものの ボタン
  const rf = Math.max(34, 58 / SC);
  const r = Math.max(30, 46 / SC);
  const cxb = VW - 82 - rf - r - 26;
  const p = G.p;
  const on = p && p.wep && p.ammo > 0;
  const b = button(cxb - r, VH * 0.70 - r, r * 2, r * 2, () => { G.throwTap = true; });
  ctx.save();
  ctx.globalAlpha = on ? 0.95 : 0.30;
  circle(b.x + r, b.y + r, r);
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill();
  ctx.strokeStyle = on ? WEAPONS[p.wep].col : '#8AD8F0';
  ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke();
  bigText(on ? WEAPONS[p.wep].name : 'なげる', b.x + r, b.y + r - r * 0.12,
          Math.round(r * (on && WEAPONS[p.wep].name.length > 3 ? 0.30 : 0.40)), '#CFF0FF', null);
  if (on) bigText('×' + p.ammo, b.x + r, b.y + r + r * 0.42, Math.round(r * 0.34), '#FFF0C8', null);
  ctx.restore();
}

function drawTitle() {
  G.lv = null;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#5AC8F0'); g.addColorStop(1, '#B8F0E8');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = '#E0C088';
  ctx.fillRect(-VW, VH * 0.84, VW * 3, VH);
  ctx.fillStyle = '#3EA85E';
  ctx.fillRect(-VW, VH * 0.84, VW * 3, VH * 0.035);
  // やしの木
  for (const px of [VW * 0.08, VW * 0.93]) {
    ctx.strokeStyle = '#8A6A44'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, VH * 0.84); ctx.quadraticCurveTo(px + 10, VH * 0.62, px - 6, VH * 0.46); ctx.stroke();
    ctx.fillStyle = '#2E9A52';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      ctx.beginPath();
      ctx.ellipse(px - 6 + Math.cos(a) * 34, VH * 0.46 + Math.sin(a) * 22, 36, 12, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  bigText('エイトくんの', VW / 2, 30, 19, '#2A4A3A', null);
  bigText('ぼうけん島', VW / 2, 64, fitSize('ぼうけん島', VW * 0.4, 40), '#FFF6C8');
  const sub = 'ボスは 10たい！ 天気も かわる。走って とんで なげて すすめ';
  bigText(sub, VW / 2, 98, fitSize(sub, VW * 0.9, 15), '#2A4A3A', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 120, startStage, '#FFD24A');

  const sw = Math.min(150, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 38, () => { G.screen = 'howto'; }), 'あそびかた', '#FFE0B0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 38, () => { audioStart(); bgmIsland('beach'); setTimeout(bgmStopIsland, 4200); }),
             '♪ おと', '#FFE0B0');
  bigText('あそんだ かず ' + save.plays + '　フルーツ ' + save.fruit + '　たおした ボス ' + save.boss,
          VW / 2, VH - 12, 13, 'rgba(20,40,30,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(20,40,30,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  G.lv = null;
  ctx.fillStyle = '#1E3A4E';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 28, 23, '#FFF6C8');
  const lines = [
    '① たいりょくは じっと して いても へる。フルーツを 食べつづけよう',
    '② 左で うごく／右の「ジャンプ」で とぶ。はなすと そこで 上がるのを やめる',
    '③ **下に 入れながら 走ると スライディング**。てきを たおし、ひくい すきまも くぐれる',
    '④ たまごを 下から たたくと おの・ブーメラン・ばくだん・スケボー・むてき',
    '⑤ ふめる てきと ふめない てき（カニの から・ハチの とげ）が いる',
    '⑥ つた（V）は 上下で のぼれる。うすい足場は 下に 入れると おりられる',
    '⑦ **天気が かわる**。かみなりは まるい しるしの ところに 落ちる',
    '⑧ **どの しまにも ボス**。たおすと ゴールが ひらく',
    '⑨ パソコンなら ← → ↑ ↓、スペース（ジャンプ）、X（なげる）',
  ];
  const fs = 14;
  lines.forEach((s, i) => bigText(s.replace(/\*\*/g, ''), VW / 2, 58 + i * 27,
                                  fitSize(s.replace(/\*\*/g, ''), VW * 0.94, fs), '#CFE8FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 40, bw, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

// キーボード（X で なげる、スペースの さきおし）
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyX') { G.throwTap = true; }
  if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'ArrowUp') KEYS.__jumpTap = true;
});
// ★ さきおしは 1コマだけ true に する。arcade の ループの あとで 消す。
const _oldDraw = draw;
arcadeStart({
  update: (dt) => { update(dt); KEYS.__jumpTap = false; },
  draw: draw,
  zone: 'split',
});
