// 20めんの もんだい。
//
// もくひょうは 3しゅるい：
//   score   … てんすうを ためる
//   collect … きめられた 色の たまを 何こ 消す
//   ice     … こおりを ぜんぶ わる
// ぜんぶ「なんてでも いい」ではなく **手の 数**が きまっている ので、
// むだな 入れかえを しないで すむ 手を さがす のが あそび。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;

// たまの 色。0 から じゅんに つかう（色が 少ない ほど そろえやすい）。
const GEMS = [
  { name: 'ハート',   col: '#FF6A8A', col2: '#FFB8C8', shape: 'heart' },
  { name: 'ほし',     col: '#FFD166', col2: '#FFF0B8', shape: 'star' },
  { name: 'みずたま', col: '#5AC8E8', col2: '#B8ECF8', shape: 'drop' },
  { name: 'はっぱ',   col: '#6ACB6A', col2: '#BEEFBE', shape: 'leaf' },
  { name: 'むらさき', col: '#B98FE0', col2: '#E0CDF6', shape: 'gem' },
  { name: 'オレンジ', col: '#FF9C5A', col2: '#FFD6B8', shape: 'round' },
];

// こおりの ならびは 文字で かく（. なし / 1 うすい / 2 あつい）
// ★ ばんめんの **すみっこ**には こおりを おかない。
//   すみの マスは たて／よこ 1本ずつ でしか そろえられず、
//   さいごの 1マスが どうしても 消えない ことが おきる。
//   ロボットに ときに 行かせた ら、98%まで 行って 何回も しっぱいした。
const ICE_A = [
  '........',
  '........',
  '..1111..',
  '..1111..',
  '..1111..',
  '..1111..',
  '........',
  '........',
];
const ICE_B = [
  '........',
  '.1....1.',
  '..1..1..',
  '...11...',
  '...11...',
  '..1..1..',
  '.1....1.',
  '........',
];
const ICE_C = [
  '........',
  '.111111.',
  '.1....1.',
  '.1.11.1.',
  '.1.11.1.',
  '.1....1.',
  '.111111.',
  '........',
];
const ICE_D = [
  '........',
  '.111111.',
  '.111111.',
  '.112211.',
  '.112211.',
  '.111111.',
  '.111111.',
  '........',
];
const ICE_E = [
  '..1111..',
  '.111111.',
  '.111111.',
  '.111111.',
  '.111111.',
  '.111111.',
  '.111111.',
  '..1111..',
];

const STAGES = [
  // 1〜5 … てんすう。手も 色も やさしい。
  { name: 'はじめての キラキラ', colors: 4, moves: 20, goal: { type: 'score', n: 1500 } },
  { name: 'ならべて 消そう',     colors: 4, moves: 20, goal: { type: 'score', n: 2600 } },
  { name: '4つ そろえると…',    colors: 5, moves: 20, goal: { type: 'score', n: 3400 } },
  { name: 'れんさ を ねらえ',    colors: 5, moves: 20, goal: { type: 'score', n: 4400 } },
  { name: 'ばくだん を 作ろう',  colors: 5, moves: 20, goal: { type: 'score', n: 4300 } },

  // 6〜10 … 色あつめ。ねらった 色を 消す 手を さがす。
  { name: 'ハートを あつめて',   colors: 5, moves: 20, goal: { type: 'collect', k: 0, n: 26 } },
  { name: 'ほしを あつめて',     colors: 5, moves: 20, goal: { type: 'collect', k: 1, n: 28 } },
  { name: 'みずたまを あつめて', colors: 5, moves: 22, goal: { type: 'collect', k: 2, n: 28 } },
  { name: 'はっぱを あつめて',   colors: 6, moves: 28, goal: { type: 'collect', k: 3, n: 22 } },
  { name: 'ふたつ あつめて',     colors: 6, moves: 26, goal: { type: 'collect2', k: 0, k2: 1, n: 18 } },

  // 11〜15 … こおり わり。ばしょを ねらう ひつようが 出る。
  { name: 'こおりが はった',     colors: 5, moves: 20, goal: { type: 'ice' }, ice: ICE_A },
  { name: 'ななめの こおり',     colors: 5, moves: 24, goal: { type: 'ice' }, ice: ICE_B },
  { name: 'こおりの わく',       colors: 5, moves: 30, goal: { type: 'ice' }, ice: ICE_C },
  { name: 'こおりの へや',       colors: 6, moves: 40, goal: { type: 'ice' }, ice: ICE_D },
  { name: 'こおりの おしろ',     colors: 6, moves: 56, goal: { type: 'ice' }, ice: ICE_E },

  // 16〜20 … まぜて、手も きつく。
  { name: 'こおりと ハート',     colors: 5, moves: 22, goal: { type: 'collect', k: 0, n: 30 }, ice: ICE_A },
  { name: 'てんすう しょうぶ',   colors: 6, moves: 24, goal: { type: 'score', n: 4800 } },
  { name: 'こおりと ほし',       colors: 6, moves: 32, goal: { type: 'collect', k: 1, n: 22 }, ice: ICE_B },
  { name: 'さいごの こおり',     colors: 6, moves: 38, goal: { type: 'ice' }, ice: ICE_C },
  { name: 'キラキラ グランプリ', colors: 6, moves: 32, goal: { type: 'score', n: 4800 } },
];

const COLS = 8, ROWS = 8;
