// メニューと 15日ぶんの お店。
//
// あそびの しんは「**あとどれだけ 待てるか** を 見ながら、
// つぎに 何を 作るか きめる」こと。だから
//   ・料理は 作るのに 時間が かかる（すぐには 出せない）
//   ・カウンターに おける 数は かぎられている（作りすぎると じゃま）
//   ・お客さんは 待てなく なると 帰る（お金に ならない）
// の 3つを 数字で もつ。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;

// 料理。time は できるまでの びょう数、yen は ねだん。
const DISH = [
  { key: 'juice', name: 'ジュース',   time: 2.0, yen: 120, col: '#FF9C5A', col2: '#FFD166' },
  { key: 'ice',   name: 'アイス',     time: 2.6, yen: 180, col: '#FFB8D8', col2: '#FFF0F6' },
  { key: 'sand',  name: 'サンド',     time: 3.2, yen: 200, col: '#F0D89C', col2: '#8FD66A' },
  { key: 'soup',  name: 'スープ',     time: 3.6, yen: 250, col: '#E8A050', col2: '#FFE0B0' },
  { key: 'cake',  name: 'ケーキ',     time: 4.2, yen: 300, col: '#FFFFFF', col2: '#FF6A8A' },
  { key: 'pan',   name: 'パンケーキ', time: 5.0, yen: 400, col: '#E8B870', col2: '#FFE066' },
];
function dishOf(k) { return DISH.find((d) => d.key === k); }

// お客さん（どうぶつ）
const ANIMALS = [
  { key: 'usagi', name: 'うさぎ',  col: '#F6E8F0', ear: 'long' },
  { key: 'kuma',  name: 'くま',    col: '#C89A6A', ear: 'round' },
  { key: 'neko',  name: 'ねこ',    col: '#F0C060', ear: 'point' },
  { key: 'inu',   name: 'いぬ',    col: '#E0C8A8', ear: 'flop' },
  { key: 'panda', name: 'パンダ',  col: '#F4F4F4', ear: 'round', dark: true },
  { key: 'kitsune', name: 'きつね', col: '#E88A50', ear: 'point' },
  { key: 'buta',  name: 'ぶた',    col: '#F8B8C8', ear: 'point', nose: true },
  { key: 'zou',   name: 'ぞう',    col: '#B8C0CC', ear: 'big', nose2: true },
];

// 15日。だんだん メニューが ふえ、お客さんが 早く 来て、待てる 時間が みじかく なる。
//   seats … いすの 数（同時に 何人 まで）
//   every … 何びょうに 1人 来るか
//   wait  … 待てる 時間（びょう）
//   len   … その日の ながさ（びょう）
//   goal  … その日の 目標
//   two   … 2品 たのむ わりあい
//   three … 3品 たのむ わりあい（two の 中の うちわけ ではなく べつ）
const DAYS = [
  { name: '1日目 オープン！', dishes: ['juice'],
    seats: 3, every: 4.2, wait: 20, len: 60, goal: 1500, two: 0.00, three: 0.00 },
  { name: '2日目 アイスも はじめ', dishes: ['juice', 'ice'],
    seats: 3, every: 3.8, wait: 19, len: 60, goal: 2500, two: 0.10, three: 0.00 },
  { name: '3日目 サンドイッチ', dishes: ['juice', 'ice', 'sand'],
    seats: 4, every: 3.5, wait: 18, len: 65, goal: 3100, two: 0.20, three: 0.00 },
  { name: '4日目 だんだん にぎやか', dishes: ['juice', 'ice', 'sand'],
    seats: 4, every: 3.2, wait: 18, len: 65, goal: 4100, two: 0.30, three: 0.00 },
  { name: '5日目 スープの日', dishes: ['juice', 'ice', 'sand', 'soup'],
    seats: 4, every: 3.0, wait: 17, len: 70, goal: 6000, two: 0.35, three: 0.00 },
  { name: '6日目 ケーキ とうじょう', dishes: ['juice', 'ice', 'sand', 'cake'],
    seats: 5, every: 2.9, wait: 17, len: 70, goal: 7700, two: 0.40, three: 0.00 },
  { name: '7日目 いそがしい 昼', dishes: ['juice', 'ice', 'sand', 'soup', 'cake'],
    seats: 5, every: 2.7, wait: 16, len: 75, goal: 8200, two: 0.45, three: 0.05 },
  { name: '8日目 パンケーキ！', dishes: ['juice', 'sand', 'cake', 'pan'],
    seats: 5, every: 2.6, wait: 16, len: 75, goal: 11400, two: 0.50, three: 0.08 },
  { name: '9日目 あまい ものの日', dishes: ['ice', 'cake', 'pan', 'juice'],
    seats: 5, every: 2.5, wait: 15, len: 75, goal: 11600, two: 0.55, three: 0.10 },
  { name: '10日目 まんいん おれい', dishes: DISH.map((d) => d.key),
    seats: 6, every: 2.4, wait: 15, len: 80, goal: 11800, two: 0.55, three: 0.12 },
  { name: '11日目 あめの日', dishes: ['soup', 'cake', 'pan', 'juice'],
    seats: 6, every: 2.3, wait: 14, len: 80, goal: 12100, two: 0.60, three: 0.15 },
  { name: '12日目 えんそくの きゃく', dishes: DISH.map((d) => d.key),
    seats: 6, every: 2.2, wait: 14, len: 85, goal: 12400, two: 0.62, three: 0.18 },
  { name: '13日目 おまつり', dishes: DISH.map((d) => d.key),
    seats: 6, every: 2.1, wait: 13, len: 85, goal: 12700, two: 0.65, three: 0.20 },
  { name: '14日目 テレビが きた', dishes: DISH.map((d) => d.key),
    seats: 6, every: 2.0, wait: 13, len: 90, goal: 13000, two: 0.68, three: 0.24 },
  { name: '15日目 さいごの日', dishes: DISH.map((d) => d.key),
    seats: 6, every: 1.9, wait: 12, len: 90, goal: 13300, two: 0.70, three: 0.28 },
];

// カウンターに おける 料理の 数。ここが きついほど「作りすぎ」が だめに なる。
const SLOTS = 6;
