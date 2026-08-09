// ゆいのつりぼり。10の つりばで、ぜんぶで 30しゅるいの さかなを あつめる。
//
// ★ ここは「数字と ことば」だけ。

'use strict';

const GAME_VER = 1;
const VH = 450;

// さかなの かたち。ui.js が この 名まえを 見て 描き分ける。
//   fish=ふつう / round=まるい / long=ながい / flat=ひらたい /
//   squid=イカ / octo=タコ / crab=カニ / shrimp=エビ / turtle=カメ /
//   horse=タツノオトシゴ / angler=チョウチンアンコウ / junk=ごみ
//
// hp   … つり上げるまでの 長さ（大きいほど 時間が かかる）
// move … あばれかた（大きいほど はやく 上下する）
// rare … 出やすさ（大きいほど よく 出る）
const FISH = [
  // いけ
  { k: 'medaka', name: 'メダカ',     kind: 'fish',  col: '#FFD98A', cm: [2, 4],    hp: 0.8, move: 0.9, rare: 10, pt: 10 },
  { k: 'funa',   name: 'フナ',       kind: 'fish',  col: '#B7C4A8', cm: [12, 26],  hp: 1.0, move: 0.8, rare: 9,  pt: 20 },
  { k: 'zari',   name: 'ザリガニ',   kind: 'shrimp', col: '#E4573A', cm: [6, 12],  hp: 1.0, move: 1.2, rare: 6,  pt: 30 },
  { k: 'gama',   name: 'おおガエル', kind: 'round', col: '#7FC96A', cm: [18, 30],  hp: 1.7, move: 1.4, rare: 2,  pt: 120, nushi: true },
  // 小川
  { k: 'ayu',    name: 'アユ',       kind: 'fish',  col: '#CFE8D8', cm: [14, 28],  hp: 1.1, move: 1.3, rare: 9,  pt: 40 },
  { k: 'yamame', name: 'ヤマメ',     kind: 'fish',  col: '#9FB6C9', cm: [16, 32],  hp: 1.2, move: 1.4, rare: 7,  pt: 50 },
  { k: 'sawa',   name: 'サワガニ',   kind: 'crab',  col: '#D96A4A', cm: [3, 6],    hp: 0.9, move: 1.0, rare: 6,  pt: 35 },
  { k: 'iwana',  name: 'イワナの ぬし', kind: 'fish', col: '#7A6A9A', cm: [40, 62], hp: 1.9, move: 1.6, rare: 2, pt: 180, nushi: true },
  // 大きな川
  { k: 'koi',    name: 'コイ',       kind: 'fish',  col: '#F0A050', cm: [30, 70],  hp: 1.6, move: 0.9, rare: 8,  pt: 70 },
  { k: 'namazu', name: 'ナマズ',     kind: 'flat',  col: '#7A6A50', cm: [35, 65],  hp: 1.7, move: 1.0, rare: 6,  pt: 90 },
  { k: 'unagi',  name: 'ウナギ',     kind: 'long',  col: '#4A4038', cm: [40, 80],  hp: 1.6, move: 1.8, rare: 5,  pt: 110 },
  { k: 'chou',   name: 'チョウザメ', kind: 'long',  col: '#8A98A8', cm: [80, 140], hp: 2.2, move: 1.3, rare: 2,  pt: 260, nushi: true },
  // みずうみ
  { k: 'bass',   name: 'ブラックバス', kind: 'fish', col: '#5A7A4A', cm: [25, 55], hp: 1.5, move: 1.6, rare: 8,  pt: 80 },
  { k: 'waka',   name: 'ワカサギ',   kind: 'fish',  col: '#E8E4D8', cm: [6, 14],   hp: 0.8, move: 1.1, rare: 9,  pt: 25 },
  { k: 'supon',  name: 'スッポン',   kind: 'turtle', col: '#6A6A4A', cm: [20, 40], hp: 1.8, move: 1.1, rare: 4,  pt: 130 },
  // みなと
  { k: 'aji',    name: 'アジ',       kind: 'fish',  col: '#C8D8E0', cm: [15, 32],  hp: 1.1, move: 1.4, rare: 10, pt: 45 },
  { k: 'saba',   name: 'サバ',       kind: 'fish',  col: '#7A99B8', cm: [25, 45],  hp: 1.3, move: 1.6, rare: 8,  pt: 60 },
  { k: 'tako',   name: 'タコ',       kind: 'octo',  col: '#E88A9A', cm: [30, 70],  hp: 1.8, move: 1.2, rare: 5,  pt: 150 },
  // いそ
  { k: 'mebaru', name: 'メバル',     kind: 'fish',  col: '#8A6A6A', cm: [15, 30],  hp: 1.2, move: 1.5, rare: 9,  pt: 55 },
  { k: 'kasago', name: 'カサゴ',     kind: 'round', col: '#B85A4A', cm: [15, 32],  hp: 1.4, move: 1.3, rare: 7,  pt: 75 },
  { k: 'ise',    name: 'イセエビ',   kind: 'shrimp', col: '#C8402A', cm: [20, 40], hp: 1.9, move: 1.4, rare: 3,  pt: 200 },
  // すな浜
  { k: 'kisu',   name: 'キス',       kind: 'fish',  col: '#F0E8D8', cm: [12, 26],  hp: 1.0, move: 1.5, rare: 9,  pt: 50 },
  { k: 'hirame', name: 'ヒラメ',     kind: 'flat',  col: '#A89880', cm: [30, 70],  hp: 1.8, move: 1.1, rare: 6,  pt: 140 },
  { k: 'hoshi',  name: 'ホシガレイ', kind: 'flat',  col: '#8A7A6A', cm: [40, 80],  hp: 2.1, move: 1.4, rare: 2,  pt: 280, nushi: true },
  // おきあい
  { k: 'buri',   name: 'ブリ',       kind: 'fish',  col: '#A8C0D0', cm: [50, 90],  hp: 2.0, move: 1.8, rare: 7,  pt: 160 },
  { k: 'katsuo', name: 'カツオ',     kind: 'fish',  col: '#5A7A98', cm: [40, 70],  hp: 1.8, move: 2.0, rare: 7,  pt: 150 },
  { k: 'maguro', name: 'マグロ',     kind: 'fish',  col: '#3A5A80', cm: [90, 200], hp: 2.6, move: 1.9, rare: 3,  pt: 400, nushi: true },
  // サンゴの海
  { k: 'kuma',   name: 'クマノミ',   kind: 'fish',  col: '#FF8A3A', cm: [5, 11],   hp: 0.9, move: 1.7, rare: 9,  pt: 90 },
  { k: 'tatsu',  name: 'タツノオトシゴ', kind: 'horse', col: '#FFC24A', cm: [8, 18], hp: 1.3, move: 1.2, rare: 5, pt: 170 },
  { k: 'kame',   name: 'ウミガメ',   kind: 'turtle', col: '#5A9A6A', cm: [60, 110], hp: 2.3, move: 1.0, rare: 3, pt: 320 },
  // しんかい
  { k: 'ankou',  name: 'チョウチンアンコウ', kind: 'angler', col: '#5A3A5A', cm: [20, 45], hp: 2.0, move: 1.5, rare: 6, pt: 300 },
  { k: 'ika',    name: 'ダイオウイカ', kind: 'squid', col: '#D06A8A', cm: [100, 260], hp: 2.7, move: 1.6, rare: 3, pt: 500 },
  { k: 'ryugu',  name: 'リュウグウノツカイ', kind: 'long', col: '#E8E0F0', cm: [150, 400], hp: 3.0, move: 2.1, rare: 2, pt: 800, nushi: true },
  // ごみ（どこでも たまに）
  { k: 'boot',   name: 'ながぐつ',   kind: 'junk',  col: '#4A5A6A', cm: [20, 28],  hp: 0.6, move: 0.5, rare: 4,  pt: 5, junk: true },
  { k: 'can',    name: 'あきカン',   kind: 'junk',  col: '#B0B8C0', cm: [10, 14],  hp: 0.5, move: 0.5, rare: 4,  pt: 5, junk: true },
];
const FISH_OF = {};
FISH.forEach((f) => { FISH_OF[f.k] = f; });

// つりば 10か所
const SPOTS = [
  { name: '1. うらの いけ',   sky: ['#8FD6FF', '#CFF0FF'], sea: ['#4A9AC0', '#2A6A90'],
    fish: ['medaka', 'funa', 'zari', 'gama'], need: 4, hint: 'まずは 小さい さかなから' },
  { name: '2. 小川',          sky: ['#A8E0FF', '#DFF6E6'], sea: ['#4AA8A0', '#2A7A78'],
    fish: ['ayu', 'yamame', 'sawa', 'iwana'], need: 5, hint: '流れが あるので すこし あばれる' },
  { name: '3. 大きな川',      sky: ['#FFD9A8', '#FFF0D8'], sea: ['#5A8A6A', '#2A5A48'],
    fish: ['koi', 'namazu', 'unagi', 'chou'], need: 5, hint: '大きい さかなが 出てくる' },
  { name: '4. みずうみ',      sky: ['#B8C8FF', '#E8E0FF'], sea: ['#3A6AA0', '#1A3A6A'],
    fish: ['bass', 'waka', 'supon', 'koi'], need: 6, hint: 'ワカサギは 小さいけど たくさん いる' },
  { name: '5. みなと',        sky: ['#FFB8C8', '#FFE0E8'], sea: ['#3A7A9A', '#1A4A6A'],
    fish: ['aji', 'saba', 'tako', 'kisu'], need: 6, hint: 'タコは ぐいぐい ひっぱる' },
  { name: '6. いそ',          sky: ['#A8D8FF', '#E0F0FF'], sea: ['#2A7A88', '#0E4A58'],
    fish: ['mebaru', 'kasago', 'ise', 'aji'], need: 7, hint: 'イセエビは なかなか 出ない' },
  { name: '7. すな浜',        sky: ['#FFE0A8', '#FFF6E0'], sea: ['#4A9AB8', '#2A6A88'],
    fish: ['kisu', 'hirame', 'hoshi', 'saba'], need: 7, hint: 'ひらたい さかなの すみか' },
  { name: '8. おきあい',      sky: ['#7AA8E0', '#B8D8FF'], sea: ['#1A4A80', '#0A2A56'],
    fish: ['buri', 'katsuo', 'maguro', 'saba'], need: 8, hint: 'とても 力が つよい！' },
  { name: '9. サンゴの海',    sky: ['#FFC8E0', '#FFE8F4'], sea: ['#2AA8C0', '#0A6A88'],
    fish: ['kuma', 'tatsu', 'kame', 'aji'], need: 8, hint: 'きれいな 生きものが いっぱい' },
  { name: '10. しんかい',     sky: ['#4A3A6A', '#6A4A8A'], sea: ['#12244A', '#050A1E'],
    fish: ['ankou', 'ika', 'ryugu', 'unagi'], need: 9, hint: 'ふしぎな 生きものの すみか' },
];

// さおの つよさ（つりばを クリアすると のびる）
// bar … つりの ぼうの 長さ（長いほど かんたん）
const RODS = [
  { name: 'たけざお',   bar: 0.30 },
  { name: 'グラスざお', bar: 0.34 },
  { name: 'カーボンざお', bar: 0.38 },
  { name: 'まほうの さお', bar: 0.44 },
];

const TIPS = [
  '★ うきが しずんだら すぐ タップ！ おそいと にげられる',
  '★ ぼうを さかなに 重ねると ゲージが たまる。はなれると へる',
  '★ おしっぱなしで 上がり、はなすと 下がる。とんとん おすのが コツ',
  '★ つりばを クリアすると さおが つよく なって、ぼうが 長くなる',
  '★ 「ぬし」は なかなか 出てこない。何回も つりに 行こう',
];
