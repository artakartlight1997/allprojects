// コースのデータ。
//
// ★ 前は真上から見おろす形だったが、「小さくて見にくい・スピード感がない」
//   ので **後ろから見る立体の道**（アウトラン方式）に作り直した。
//   道を短い「セグメント」に切って、遠くのセグメントほど小さく描く。
//   カーブと坂はセグメントごとの「曲がり」と「高さ」で表す。
//
// ★ コースは下の COURSES に「まっすぐ 何こ」「カーブ 何こ・強さ」を
//   ならべて書くだけで作れる。数字を変えれば形が変わる。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 4;

const VH = 450;

const SEG_LEN = 320;        // セグメント1つの長さ（大きいほど軽い）
const ROAD_W = 2200;        // 道の半分のはば
const RUMBLE_N = 4;         // しま模様の切りかわり
const DRAW_N = 110;        // 何セグメント先まで描くか（多すぎると重い）

// --- コースを組み立てる道具 ---------------------------------------------------------

function easeIn(a, b, p) { return a + (b - a) * p * p; }
function easeOut(a, b, p) { return a + (b - a) * (1 - (1 - p) * (1 - p)); }
function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

function makeBuilder() {
  const segs = [];
  function lastY() { return segs.length ? segs[segs.length - 1].y2 : 0; }
  function add(curve, y) {
    const n = segs.length;
    segs.push({ i: n, curve, y1: lastY(), y2: y, sprites: [], karts: [] });
  }
  // enter … だんだん曲がる、hold … その曲がりのまま、leave … だんだん戻る
  function road(enter, hold, leave, curve, hill) {
    const start = lastY();
    const total = enter + hold + leave;
    const end = start + (hill || 0) * SEG_LEN;
    for (let i = 0; i < enter; i++) add(easeIn(0, curve, i / enter), easeInOut(start, end, (0 + i) / total));
    for (let i = 0; i < hold; i++) add(curve, easeInOut(start, end, (enter + i) / total));
    for (let i = 0; i < leave; i++) add(easeInOut(curve, 0, i / leave), easeInOut(start, end, (enter + hold + i) / total));
  }
  return { segs, road };
}

// 文字で書いたコースを組み立てる
//   ['s', 長さ]              まっすぐ
//   ['c', 長さ, 曲がり]      カーブ（＋で右、−で左）
//   ['h', 長さ, 高さ]        坂（＋でのぼり、−でくだり）
//   ['ch', 長さ, 曲がり, 高さ] カーブ＋坂
// ★ 1しゅうの長さ。plan の数字を そのまま使うと 1しゅう5秒くらいで
//   あっという間に終わる。5倍にして 1しゅう30秒くらいにする。
const PLAN_SCALE = 4;

function buildTrack(plan) {
  const B = makeBuilder();
  for (const p of plan) {
    const k = p[0], n = p[1] * PLAN_SCALE;
    const third = Math.max(3, Math.round(n / 3));
    if (k === 's') B.road(third, n - third * 2, third, 0, 0);
    else if (k === 'c') B.road(third, n - third * 2, third, p[2], 0);
    else if (k === 'h') B.road(third, n - third * 2, third, 0, p[2]);
    else B.road(third, n - third * 2, third, p[2], p[3]);
  }
  // かざりを置く（同じコースなら毎回同じ場所に出るよう index から決める）
  for (const s of B.segs) {
    const r = (s.i * 9301 + 49297) % 233280 / 233280;
    if (s.i % 7 === 0) s.sprites.push({ x: -1.45 - r * 0.7, k: (s.i / 7) % 3 });
    if (s.i % 9 === 0) s.sprites.push({ x: 1.4 + r * 0.8, k: (s.i / 9 + 1) % 3 });
    if (s.i % 31 === 0) s.sprites.push({ x: (s.i % 62 === 0 ? -1 : 1) * (1.08 + r * 0.06), k: 3 });
  }
  return B.segs;
}

// --- コース ------------------------------------------------------------------------
//
// theme … 色の組み合わせ。laps … 何しゅう。

const COURSES = [
  { name: '1. はじめてのサーキット', theme: 'day', laps: 3, plan: [
    ['s', 60], ['c', 50, 2], ['s', 40], ['c', 50, -2], ['s', 60], ['c', 40, 3], ['s', 50],
  ] },
  { name: '2. なみの見える丘', theme: 'sea', laps: 3, plan: [
    ['s', 40], ['h', 50, 22], ['c', 50, -3], ['h', 50, -22], ['s', 40], ['c', 60, 3], ['s', 40],
  ] },
  { name: '3. 森のワインディング', theme: 'forest', laps: 3, plan: [
    ['s', 30], ['c', 40, 4], ['c', 40, -4], ['c', 40, 4], ['c', 40, -4], ['s', 40], ['c', 50, 3], ['s', 30],
  ] },
  { name: '4. 夕やけロード', theme: 'sunset', laps: 3, plan: [
    ['s', 50], ['ch', 60, 3, 26], ['s', 30], ['ch', 60, -3, -26], ['s', 40], ['c', 50, 4], ['s', 40],
  ] },
  { name: '5. さばくの直線', theme: 'desert', laps: 3, plan: [
    ['s', 110], ['c', 40, 5], ['s', 60], ['c', 40, -5], ['s', 90], ['c', 40, 4], ['s', 40],
  ] },
  { name: '6. 雪山ヘアピン', theme: 'snow', laps: 3, plan: [
    ['s', 30], ['c', 34, 6], ['s', 24], ['c', 34, -6], ['h', 40, 24], ['c', 40, 5], ['h', 40, -24], ['s', 30],
  ] },
  { name: '7. 夜のベイエリア', theme: 'night', laps: 3, plan: [
    ['s', 46], ['c', 46, -4], ['s', 30], ['c', 46, 4], ['h', 40, 20], ['c', 40, -5], ['h', 40, -20], ['s', 40],
  ] },
  { name: '8. かざんロード', theme: 'volcano', laps: 3, plan: [
    ['s', 34], ['c', 36, 5], ['c', 36, -5], ['h', 44, 30], ['c', 40, 5], ['h', 44, -30], ['c', 40, -4], ['s', 34],
  ] },
  { name: '9. 天空サーキット', theme: 'sky', laps: 3, plan: [
    ['h', 50, 30], ['c', 40, 6], ['h', 44, -30], ['c', 40, -6], ['s', 30], ['c', 36, 6], ['c', 36, -6], ['s', 40],
  ] },
  { name: '10. さいごの大レース', theme: 'night', laps: 3, plan: [
    ['s', 40], ['c', 36, 6], ['h', 40, 26], ['c', 40, -6], ['h', 40, -26], ['s', 30],
    ['c', 34, 7], ['c', 34, -7], ['s', 44], ['c', 46, 5], ['s', 40],
  ] },
];

// 色の組み合わせ
const THEMES = {
  day:     { sky: ['#8FD6FF', '#DFF3FF'], grass: ['#6ACB6A', '#5CB85C'], road: ['#5A5A66', '#565662'],
             rumble: ['#FFFFFF', '#FF6B7A'], lane: '#FFFFFF', deco: '#3E8E3E', fog: '#DFF3FF' },
  sea:     { sky: ['#5AC8E8', '#DFF6FF'], grass: ['#7ED0A0', '#6CC490'], road: ['#5E5E6A', '#5A5A66'],
             rumble: ['#FFFFFF', '#5AC8E8'], lane: '#FFFFFF', deco: '#3E9E7E', fog: '#DFF6FF' },
  forest:  { sky: ['#79C6E8', '#D6F0E6'], grass: ['#3F9A54', '#378C4B'], road: ['#55555F', '#51515B'],
             rumble: ['#FFF4D0', '#4A8C3F'], lane: '#FFF4D0', deco: '#215F32', fog: '#D6F0E6' },
  sunset:  { sky: ['#FF9C5A', '#FFD9A8'], grass: ['#C08A4A', '#B07E42'], road: ['#4E4652', '#4A424E'],
             rumble: ['#FFE066', '#FF6B7A'], lane: '#FFE9C0', deco: '#8A5A2A', fog: '#FFD9A8' },
  desert:  { sky: ['#FFC46A', '#FFEFC8'], grass: ['#E0C078', '#D4B46C'], road: ['#6A6258', '#665E54'],
             rumble: ['#FFFFFF', '#E08A3A'], lane: '#FFFFFF', deco: '#A88A48', fog: '#FFEFC8' },
  snow:    { sky: ['#BFE0F0', '#F4FBFF'], grass: ['#F0F6FA', '#E4EEF4'], road: ['#7A828E', '#767E8A'],
             rumble: ['#FF6B7A', '#FFFFFF'], lane: '#FFFFFF', deco: '#9FC0D0', fog: '#F4FBFF' },
  night:   { sky: ['#1B1430', '#3A2A5A'], grass: ['#243050', '#20294A'], road: ['#3E3E4A', '#3A3A46'],
             rumble: ['#FFE066', '#FF6B7A'], lane: '#FFE066', deco: '#4A5A8A', fog: '#3A2A5A' },
  volcano: { sky: ['#5A2A34', '#B04A3A'], grass: ['#4A2A2A', '#442626'], road: ['#3A3238', '#362E34'],
             rumble: ['#FF8F3A', '#FFE066'], lane: '#FFC46A', deco: '#8A3A2A', fog: '#B04A3A' },
  // ★ 空と草の色が にていると 道の外が どこか 分からない。はっきり 分ける。
  sky:     { sky: ['#4A90E2', '#BFE0FF'], grass: ['#FFFFFF', '#DCEBFA'], road: ['#5A5A6A', '#565666'],
             rumble: ['#FF8FBB', '#7AB8FF'], lane: '#FFFFFF', deco: '#BFD8F0', fog: '#DFF0FF' },
};
