// 10 かいぶんの タワー。
//
// あしばは その場で「たねの ある らんすう」から 作る。だから 同じ 面は
// なんど あそんでも 同じ ならび。おぼえて うまく なれる。
//
// h      … タワーの 高さ（この ぶんだけ 上に のぼると てっぺん）
// mama   … ママが 上がってくる はやさ（1びょうに なんピクセル）。
//          じょうずに のぼると 1びょうに 150px ぐらい なので、
//          その 5〜9わり。ふりむくと すぐ そこに いる ぐらいが ちょうどよい。
// gap    … あしばの たての あいだ（近いほど かんたん）
// kinds  … 出てくる あしばの しゅるいと わりあい
// wind   … よこから ふく かぜ（0 なら なし）

'use strict';

// VH は chars.js で きめている

const TOWER_W = 470;          // タワーの よこはば（まん中が 0）
// あしばで はねる はやさ（上むき）。GRAV=1250 なので 上がる 高さは
//   660*660 / (2*1250) = 174 ピクセル。
// あしばの たての あいだ（gap × 0.86〜1.16）より かならず 高くする こと。
// ここが 足りないと「どうやっても つぎの あしばに とどかない」に なる。
const HOP = 660;

// あしばの しゅるい
//   normal … ふつう
//   move   … よこに うごく
//   crack  … 1かい のると こわれる
//   spring … すごく 高く はねる
//   slip   … つるつる すべる
const PLAT_TEXT = {
  normal: '',
  move: 'よこに うごく あしば',
  crack: '1かい のると こわれる あしば',
  spring: 'すごく 高く はねる バネの あしば',
  slip: 'つるつる すべる あしば',
};

const STAGES = [
  { name: '1かい　げんかん', sky: ['#9BD8FF', '#E8F6FF'],
    h: 1900, mama: 78, gap: 96, wind: 0,
    kinds: { normal: 1 },
    friends: ['masaki'] },

  { name: '2かい　リビング', sky: ['#FFD9A8', '#FFF2DC'],
    h: 2200, mama: 86, gap: 100, wind: 0,
    kinds: { normal: 5, move: 1 },
    friends: ['rina'] },

  { name: '3かい　だいどころ', sky: ['#C8EFC0', '#EEFBEA'],
    h: 2500, mama: 94, gap: 102, wind: 0,
    kinds: { normal: 4, move: 2, spring: 1 },
    friends: ['masaki', 'papa'] },

  { name: '4かい　おふろ', sky: ['#A8DCF0', '#E4F7FF'],
    h: 2800, mama: 101, gap: 104, wind: 0,
    kinds: { normal: 4, move: 2, crack: 2 },
    friends: ['rina'] },

  { name: '5かい　こどもべや', sky: ['#E0C8F5', '#F6EEFF'],
    h: 3100, mama: 108, gap: 106, wind: 0,
    kinds: { normal: 3, move: 2, crack: 2, spring: 1 },
    friends: ['masaki', 'papa'] },

  { name: '6かい　やねうら', sky: ['#F0B8A8', '#FFEAE0'],
    h: 3400, mama: 112, gap: 108, wind: 30,
    kinds: { normal: 3, move: 3, crack: 2, slip: 1 },
    friends: ['rina', 'papa'] },

  { name: '7かい　おくじょう', sky: ['#7FC0F0', '#DCEEFF'],
    h: 3700, mama: 118, gap: 110, wind: 46,
    kinds: { normal: 3, move: 3, crack: 2, slip: 2, spring: 1 },
    friends: ['masaki', 'rina'] },

  { name: '8かい　くもの 上', sky: ['#BFD8F0', '#F4F9FF'],
    h: 4000, mama: 126, gap: 112, wind: 68,
    kinds: { normal: 2, move: 3, crack: 3, slip: 2, spring: 1 },
    friends: ['papa', 'rina'] },

  { name: '9かい　ほしぞら', sky: ['#2A2A5A', '#6A5AA0'], stars: true,
    h: 4300, mama: 131, gap: 114, wind: 76,
    kinds: { normal: 2, move: 3, crack: 3, slip: 3, spring: 1 },
    friends: ['masaki', 'papa', 'rina'] },

  { name: '10かい　タワーの てっぺん', sky: ['#3A2A6A', '#F0A0C8'], stars: true,
    h: 4700, mama: 136, gap: 116, wind: 84,
    kinds: { normal: 2, move: 3, crack: 3, slip: 3, spring: 2 },
    friends: ['masaki', 'papa', 'rina'] },
];

// ママの さけび。おおきな ふきだしで 出す。
// ならいごとの 3つは かならず 出す。あとは おまけ。
const MAMA_LINES = [
  'スイミングに いくわよー！',
  '合気道に いくわよー！',
  '習字の 時間よ〜',
  'ピアノの れんしゅうは？',
  'しゅくだい やったの〜？',
  'おかたづけ してからね！',
  'つぎ そろばんよ〜',
  'えいご きょうしつ〜！',
];

// ステージごとの ひとこと
function stageRule(si) {
  const st = STAGES[si];
  const a = [];
  for (const k of Object.keys(st.kinds)) if (PLAT_TEXT[k]) a.push(PLAT_TEXT[k]);
  const w = st.wind ? 'よこから かぜ' : '';
  if (w) a.push(w);
  return a.length ? a.join('　') : 'まずは のぼりかたに なれよう';
}

// たねの ある らんすう。同じ たねなら いつも 同じ ならび。
function mkRng(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
