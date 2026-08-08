// 四国の 県の かたち と ばしょ。
//
// ★ 四国は 4県しか ない ので、ただ はめる だけでは すぐ おわって しまう。
//   そこで「**地図が まわる**」めんを 入れた。
//   画面の どこに あるかを おぼえた だけの 子は、まわると とたんに わからなく なる。
//   「香川は 北がわ、高知は 南がわ」と **いちかんけいで** おぼえて はじめて とける。
//
// ★ もう ひとつは「名さんぶつで おつかい」。
//   うどん→香川、みかん→愛媛 の ように、名まえ いがいの 手がかりでも つながる。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;

const PREFS = [
  {
    key: 'kagawa', name: '香川', kana: 'かがわ', col: '#FFC46A',
    about: 'さぬきうどん。日本で いちばん 小さい けん',
    item: 'うどん', where: '北がわ',
    poly: [[44, 14], [58, 8], [72, 6], [80, 12], [76, 20], [62, 22], [48, 20], [44, 18]],
  },
  {
    key: 'tokushima', name: '徳島', kana: 'とくしま', col: '#B98FE0',
    about: 'あわおどり と すだち。ひがしがわ',
    item: 'すだち', where: '東がわ',
    poly: [[76, 20], [88, 16], [96, 26], [92, 40], [82, 46], [72, 40], [66, 30], [62, 22]],
  },
  {
    key: 'ehime', name: '愛媛', kana: 'えひめ', col: '#FF8FA0',
    about: 'みかん と どうご温泉。にしがわ',
    item: 'みかん', where: '西がわ',
    poly: [[4, 26], [10, 16], [22, 10], [34, 8], [44, 14], [44, 26], [36, 36], [24, 40], [12, 34]],
  },
  {
    key: 'kochi', name: '高知', kana: 'こうち', col: '#6ACB6A',
    about: 'かつおの たたき。四国で いちばん 大きくて 南がわ',
    item: 'かつお', where: '南がわ',
    poly: [[24, 40], [36, 36], [44, 26], [48, 20], [62, 22], [66, 30], [72, 40], [82, 46],
           [74, 56], [58, 62], [42, 60], [30, 52]],
  },
];

function bounds(list) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of list) {
    const all = [p.poly].concat(p.isles || []);
    for (const poly of all) {
      for (const [x, y] of poly) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

function centroid(p) {
  let sx = 0, sy = 0;
  for (const [x, y] of p.poly) { sx += x; sy += y; }
  return { x: sx / p.poly.length, y: sy / p.poly.length };
}

function pointInPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function hitPref(p, x, y) {
  if (pointInPoly(p.poly, x, y)) return true;
  for (const isle of p.isles || []) if (pointInPoly(isle, x, y)) return true;
  return false;
}

// --- めん -------------------------------------------------------------------------
//
// mode
//   learn … 名まえで タップ
//   fit   … 形を はめる（かげ あり）
//   fit2  … かげ なしで はめる
//   name  … 名まえで タップ（名まえは かくれている）
//   item  … 名さんぶつで おつかい（「うどんを とどけて」→ 香川）
//   where … ばしょの ことばで（「北がわの けん」→ 香川）
//   time  … タイムアタック
//
// spin を つけると 地図が まわる（0.5 なら 半分の かくりつ）

const STAGES = [
  { name: '1. 四国を 見てみよう',   mode: 'learn', use: 4, hint: true },
  { name: '2. 形を はめよう',       mode: 'fit',   use: 4, hint: true },
  { name: '3. 名まえ さがし',       mode: 'name',  use: 4, hint: true },
  { name: '4. おつかい（名さん）',  mode: 'item',  use: 4, hint: true },
  { name: '5. ばしょで さがす',     mode: 'where', use: 4, hint: true },
  { name: '6. かげ なしで はめる',  mode: 'fit2',  use: 4, hint: false },
  { name: '7. 地図が まわる',       mode: 'name',  use: 4, hint: false, spin: 1 },
  { name: '8. まわる おつかい',     mode: 'item',  use: 4, hint: false, spin: 1 },
  { name: '9. まわして はめる',     mode: 'fit2',  use: 4, hint: false, spin: 1 },
  { name: '10. タイムアタック',     mode: 'time',  use: 4, hint: false, sec: 45, spin: 1 },
];
