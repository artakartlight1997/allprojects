// ゆいのたまごっこ。たまごから 育てて、どんな 姿に なるかを 集める ゲーム。
//
// ★ ここは「数字と ことば」だけ。動かす ところは game.js、
//   絵を かく ところは ui.js に 分けてある。

'use strict';

const GAME_VER = 1;

const VH = 450;                 // 画面の 高さの きほん（横は 画面に 合わせて のびる）

// 1日 の 長さ（びょう）。子どもが 待てる 長さに する。
const DAY = 50;

// 大人に なるまでの 日数
const AGE_CHILD = 1;            // あかちゃん → こども
const AGE_ADULT = 3;            // こども → おとな

// ものさし（0〜100）が 1びょうで どれだけ へるか
const DROP = {
  hunger: 0.50,                 // おなか
  fun:    0.45,                 // きげん
  clean:  0.20,                 // きれい（うんちが あると もっと へる）
  energy: 0.35,                 // げんき（ねると もどる）
};

// 大人の すがた 8しゅるい。
// tier … 3=とても よく 世話した / 2=ふつう / 1=あまり できなかった
// like … いちばん 多く した お世話（food / play / bath / any）
const FORMS = [
  { k: 'cat',  name: 'しろねこ',   tier: 2, like: 'any',  col: '#FFF3F7', sub: '#FFC7DC',
    about: 'バランスよく 育てると 会える。だっこが 好き' },
  { k: 'usa',  name: 'うさぎ',     tier: 2, like: 'play', col: '#FFE9F2', sub: '#FF9FC0',
    about: 'たくさん 遊んで あげると 会える。よく はねる' },
  { k: 'pen',  name: 'ペンギン',   tier: 2, like: 'bath', col: '#EAF4FF', sub: '#4A6A9A',
    about: 'おふろ 大好き。いつも ピカピカ' },
  { k: 'bear', name: 'くまさん',   tier: 2, like: 'food', col: '#E8C79A', sub: '#A9793E',
    about: 'ごはんを たくさん あげると 会える。のんびりや' },
  { k: 'uni',  name: 'ユニコーン', tier: 3, like: 'any',  col: '#FFFFFF', sub: '#C9A9FF',
    about: '★レア★ ほとんど 泣かせないと 会える' },
  { k: 'dra',  name: 'ドラゴン',   tier: 3, like: 'play', col: '#BFF0C0', sub: '#3E9A5A',
    about: '★レア★ よく 世話して たくさん 遊ぶと 会える' },
  { k: 'pig',  name: 'こぶた',     tier: 1, like: 'food', col: '#FFD5E0', sub: '#E8899F',
    about: 'ごはんばかり あげると こうなる。それも かわいい' },
  { k: 'obk',  name: 'おばけ',     tier: 1, like: 'any',  col: '#DDE6F5', sub: '#8894B0',
    about: 'ほったらかしに すると こうなる。おこってない よ' },
];
const FORM_OF = {};
FORMS.forEach((f) => { FORM_OF[f.k] = f; });

// ごはん（あげすぎると おなかを こわす）
const FOODS = [
  { k: 'rice', name: 'おにぎり', gain: 30, fun: 2,  col: '#FFFFFF' },
  { k: 'cake', name: 'ケーキ',   gain: 18, fun: 12, col: '#FFC7DC' },
  { k: 'milk', name: 'ミルク',   gain: 12, fun: 4,  col: '#FFF6E0' },
];

// お世話の ボタン
const ACTS = [
  { k: 'food',  name: 'ごはん',   col: '#FFD166' },
  { k: 'play',  name: 'あそぶ',   col: '#8FD6FF' },
  { k: 'bath',  name: 'おふろ',   col: '#A8E6CF' },
  { k: 'sleep', name: 'ねんね',   col: '#C9A9FF' },
  { k: 'med',   name: 'おくすり', col: '#FF9FB0' },
];

// あそびの ミニゲーム「どっちの 手？」の せりふ
const PLAY_SAY = ['どっちの 手に あると 思う？', 'つぎは どっち？', 'さいご！ どっち？'];

const TIPS = [
  '★ 4つの ものさしが 0に なると 泣いてしまう。0の まま だと お別れ',
  '★ うんちを そのままに すると「きれい」が どんどん へる。おふろで きれいに',
  '★ ごはんを あげすぎると おなかを こわす。おくすりで なおる',
  '★ ねんね中は「げんき」が ぐんぐん もどる。おきる ときは もう一度 おす',
  '★ どんな お世話を したかで、大人の すがたが 変わる（ぜんぶで 8しゅるい）',
];
