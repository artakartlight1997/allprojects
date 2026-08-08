// 九州の 県の かたち と ばしょ。
//
// ★ 「自然に おぼえる」ように するには、クイズで 名まえを 当てさせる より
//   **形を じぶんの 手で はめる** ほうが よい。
//   何回も はめて いるうちに、となりの 県との つながりで おぼえられる。
//
// かたちは 本物の 地図を そのまま 写した ものでは なく、
// **となりどうしの つながりと 大きさの 感じ**を あわせた かんたんな 形。
// （こまかい 出入りまで 入れると、はめる のが むずかしすぎる）
//
// ざひょうは 0〜100（よこ）× 0〜150（たて）。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 1;

const VH = 450;

const PREFS = [
  {
    key: 'fukuoka', name: '福岡', kana: 'ふくおか', col: '#FF8FA0',
    about: 'めんたいこ と とんこつラーメン。九州で いちばん 人が 多い',
    poly: [[30, 2], [46, 0], [58, 6], [66, 16], [64, 26], [52, 32], [40, 34], [32, 28], [26, 20], [26, 10]],
  },
  {
    key: 'saga', name: '佐賀', kana: 'さが', col: '#FFC46A',
    about: 'ありた焼き と むつごろう。九州で いちばん 小さい',
    poly: [[26, 20], [32, 28], [30, 38], [22, 42], [14, 38], [12, 28], [18, 22]],
  },
  {
    key: 'nagasaki', name: '長崎', kana: 'ながさき', col: '#8FD6FF',
    about: 'カステラ と ちゃんぽん。しまが とても 多い',
    poly: [[12, 28], [14, 38], [22, 42], [20, 52], [12, 60], [4, 56], [2, 44], [4, 34]],
    isles: [[[0, 16], [6, 14], [8, 20], [2, 22]], [[6, 66], [12, 64], [14, 70], [8, 72]]],
  },
  {
    key: 'oita', name: '大分', kana: 'おおいた', col: '#B98FE0',
    about: 'べっぷ温泉。日本一 おんせんが 多い',
    poly: [[66, 16], [80, 14], [92, 22], [94, 34], [86, 46], [74, 48], [64, 42], [62, 30], [64, 26]],
  },
  {
    key: 'kumamoto', name: '熊本', kana: 'くまもと', col: '#6ACB6A',
    about: 'あそ山 と くまモン。まん中に ある',
    poly: [[32, 28], [40, 34], [52, 32], [62, 42], [60, 56], [52, 68], [40, 74], [30, 68], [26, 56], [28, 44], [30, 38]],
  },
  {
    key: 'miyazaki', name: '宮崎', kana: 'みやざき', col: '#FFD166',
    about: 'マンゴー と 日なた。ひがしがわ',
    poly: [[64, 42], [74, 48], [86, 46], [88, 60], [82, 76], [72, 90], [62, 96], [56, 86], [54, 72], [58, 58], [60, 56]],
  },
  {
    key: 'kagoshima', name: '鹿児島', kana: 'かごしま', col: '#FF9C5A',
    about: 'さくらじま と さつまいも。九州の いちばん 南',
    poly: [[30, 68], [40, 74], [52, 68], [54, 72], [56, 86], [62, 96], [54, 104], [46, 112], [44, 126],
           [38, 132], [32, 124], [34, 110], [26, 100], [22, 86]],
  },
  {
    key: 'okinawa', name: '沖縄', kana: 'おきなわ', col: '#5AC8E8',
    about: 'あたたかい 島。九州地方の いちばん 南',
    poly: [[6, 128], [14, 122], [20, 126], [22, 133], [14, 138], [7, 135]],
  },
];

// ぜんぶの かたちが おさまる はこ
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

// かたちの まん中（はめる ばしょの めやす）
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
//   learn  … ぜんぶ ならんでいる。言われた 県を タップして おぼえる
//   fit    … かけらを ひっぱって はめる（うすい かげ あり）
//   fit2   … かげ なしで はめる
//   name   … 地図の 上で 言われた 県を タップ（かたちだけ）
//   time   … タイムアタック

const STAGES = [
  { name: '1. 九州を 見てみよう', mode: 'learn', use: 7, hint: true },
  { name: '2. はめて みよう',     mode: 'fit',   use: 4, hint: true },
  { name: '3. 7つ ぜんぶ はめる', mode: 'fit',   use: 7, hint: true },
  { name: '4. 名まえ さがし',     mode: 'name',  use: 7, hint: true },
  { name: '5. かげ なしで はめる', mode: 'fit2', use: 7, hint: false },
  { name: '6. 沖縄も いれて',     mode: 'fit',   use: 8, hint: true },
  { name: '7. 名まえ さがし 2',   mode: 'name',  use: 8, hint: false },
  { name: '8. かげ なし 8つ',     mode: 'fit2',  use: 8, hint: false },
  { name: '9. タイムアタック',    mode: 'time',  use: 7, hint: false, sec: 60 },
  { name: '10. さいごの しあげ',  mode: 'time',  use: 8, hint: false, sec: 75 },
];
