// ゆいのぽとぽとパズル。おなじ 色を 4つ くっつけると 消える 落ちものパズル。
//
// ★ ここは「数字と ことば」だけ。

'use strict';

const GAME_VER = 1;
const VH = 450;

const COLS = 6;      // よこの ます
const ROWS = 12;     // たての ます（いちばん 上は かくれ ぶぶん）

// 色は そのまま「どうぶつ」。face を 見て ui.js が かおを 描き分ける。
const BLOBS = [
  null,
  { name: 'ねこ',   col: '#FF9FC0', dark: '#E0709A', face: 'cat' },
  { name: 'ひよこ', col: '#FFD166', dark: '#E0A93A', face: 'chick' },
  { name: 'かえる', col: '#8FE0A0', dark: '#5AB870', face: 'frog' },
  { name: 'さかな', col: '#8FD6FF', dark: '#5AA8E0', face: 'fish' },
  { name: 'うさぎ', col: '#D6BFFF', dark: '#A98FE0', face: 'usa' },
];

// 面ごとの きまり
//   cols … つかう 色の 数
//   fall … 1マス 落ちるのに かかる びょう（小さいほど はやい）
//   need … 消す かず
const STAGES = [
  { name: '1. はじめての ぽとぽと', cols: 3, fall: 0.90, need: 20 },
  { name: '2. 3つの 色で なれよう', cols: 3, fall: 0.78, need: 30 },
  { name: '3. すこし はやい',       cols: 3, fall: 0.66, need: 40 },
  { name: '4. 色が 4つに',           cols: 4, fall: 0.72, need: 45 },
  { name: '5. れんさを ねらおう',     cols: 4, fall: 0.62, need: 55 },
  { name: '6. どんどん 落ちる',       cols: 4, fall: 0.52, need: 65 },
  { name: '7. 色が 5つに',           cols: 5, fall: 0.60, need: 70 },
  { name: '8. せまい すきま',         cols: 5, fall: 0.50, need: 80 },
  { name: '9. はやい！',             cols: 5, fall: 0.42, need: 90 },
  { name: '10. さいごの ぽとぽと',    cols: 5, fall: 0.34, need: 110 },
];

// れんさの ときの かけ声（子どもが うれしく なる ように）
const CHAIN_SAY = ['', 'ナイス！', 'すごい！ 2れんさ', 'やった！ 3れんさ',
                   'すごすぎ！ 4れんさ', 'てんさい！ 5れんさ', 'かみ！ 6れんさ'];

const TIPS = [
  '★ おなじ 色を たて・よこに 4つ つなげると 消える（ななめは ダメ）',
  '★ 消えた あとに 上から 落ちて また 4つに なると「れんさ」。点が どんと 上がる',
  '★ ↻ボタンで まわる。かべぎわでも ちゃんと まわる',
  '★ ⤓ボタンを おすと すとんと 落ちる。いそぐ ときに つかおう',
  '★ いちばん 上の まん中が うまると おしまい。まん中は あけて おこう',
];
