// 「きょうだいオールスター」の きほんの データ。
//
// ★ これまでに 作った 33本の ゲームから「いちばん おいしい ところ」だけを
//   5びょうの ミニゲームに して、つぎつぎ 出す。だんだん 速く なる。
//   4人きょうだい（りな・まさき・あおい・ゆい）が 1人ずつ ライフ。
//   ミスすると 1人 ぬける。4人 ぜんいん ぬけたら おしまい。

'use strict';

const GAME_VER = 1;

const VH = 450;              // かそう画面の たかさ

// きょうだい 4人。ライフでも あり、ミニゲームの 出題者でも ある。
const KIDS = [
  { key: 'rina',   name: 'りな',   col: '#FF6FA8', sub: '#FFC2D8', hair: '#4A2B1E' },
  { key: 'masaki', name: 'まさき', col: '#4A9BFF', sub: '#BBD9FF', hair: '#241A14' },
  { key: 'aoi',    name: 'あおい', col: '#48D8A0', sub: '#BFF2DE', hair: '#3A2418' },
  { key: 'yui',    name: 'ゆい',   col: '#FFC63A', sub: '#FFE9A8', hair: '#503323' },
];

// むずかしさ。何本 クリアしたかで 上がって いく。
//   sec … 1本の じかん   spd … 中みの 速さ   lv … 中みの きびしさ(0..2)
const LEVELS = [
  { sec: 5.4, spd: 1.00, lv: 0 },
  { sec: 5.0, spd: 1.12, lv: 0 },
  { sec: 4.6, spd: 1.25, lv: 1 },
  { sec: 4.2, spd: 1.40, lv: 1 },
  { sec: 3.8, spd: 1.55, lv: 2 },
  { sec: 3.5, spd: 1.72, lv: 2 },
  { sec: 3.2, spd: 1.90, lv: 2 },
];

const UP_EVERY = 5;          // 何本ごとに 速く なるか
const BOSS_EVERY = 12;       // 何本ごとに ボスが 出るか
const LIVES = 4;

// --- セーブ ---------------------------------------------------------------------

const SAVE_KEY = 'allstar.save.v1';

const save = { hi: 0, best: 0, plays: 0, cleared: {} };

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (typeof s.hi === 'number') save.hi = s.hi;
    if (typeof s.best === 'number') save.best = s.best;
    if (typeof s.plays === 'number') save.plays = s.plays;
    if (s.cleared && typeof s.cleared === 'object') save.cleared = s.cleared;
  } catch (e) {}
}

function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

loadSave();
