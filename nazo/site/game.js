// りなの へやから 脱出。
// 「脱出ゲーム」：へやの 4つの かべを 見てまわり、どうぐを みつけて なぞを といて とびらを あける。
// ぜんぶで 10へや。へやが すすむ ごとに あたらしい しかけが ふえる：
//   4 おふろば（シャワーで かわる・もちものを しらべる）5 リビング（やじるしの かぎ）
//   6 しょさい（本の ならべかえ・むしめがね）7 アトリエ（えのぐを まぜる）8 やねうら（ランプ パズル）
//   9 おんがくしつ（おとの じゅんばん）10 げんかん（ことばの かぎ）
//   ・◀ ▶ で かべを かえる。しらべたい ところを タップ
//   ・どうぐは したの もちものに はいる。どうぐを えらんでから つかいたい ところを タップ
//   ・こまったら「ヒント」。すすみぐあいに あわせて ちょっとずつ おしえて くれる
// とちゅうで とじても、へやの ようすと もちものは のこる。

'use strict';

const SAVE = 'nazoescape.v1';
const ITEM = {
  key:     { name: 'ちいさな かぎ', col: '#FFD24A' },
  memo:    { name: 'メモ', col: '#FFFFFF' },
  driver:  { name: 'ドライバー', col: '#E04A4A' },
  memo2:   { name: 'メモ（キッチン）', col: '#FFFFFF' },
  doorkey: { name: 'ドアの かぎ', col: '#C8A040' },
  light:   { name: 'かいちゅうでんとう', col: '#6A7A9A' },
  battery: { name: 'でんち', col: '#4A8A4A' },
  lighton: { name: 'ひかる でんとう', col: '#FFE066' },
  duck:    { name: 'アヒルの おもちゃ', col: '#FFD24A' },
  handle:  { name: 'シャワーの ハンドル', col: '#E84A4A' },
  remote:  { name: 'リモコン（でんち なし）', col: '#3A3A48' },
  remoteon:{ name: 'リモコン', col: '#3A3A48' },
  lupe:    { name: 'むしめがね', col: '#8AB8E0' },
  red:     { name: 'あかの えのぐ', col: '#E84A4A' },
  blue:    { name: 'あおの えのぐ', col: '#4A8AE8' },
  yellow:  { name: 'きいろの えのぐ', col: '#FFD24A' },
  purple:  { name: 'むらさきの えのぐ', col: '#9A5AD8' },
  green:   { name: 'みどりの えのぐ', col: '#4AB85A' },
  orange:  { name: 'オレンジの えのぐ', col: '#FF9A3A' },
  neji:    { name: 'ぜんまいの ねじ', col: '#C8A040' },
};
// もちもの どうしを あわせる [a, b, できる もの, メッセージ, のこす]
const COMBOS = [
  ['battery', 'light', 'lighton', 'でんちを いれた！ でんとうが ひかった！'],
  ['battery', 'remote', 'remoteon', 'でんちを いれた！ リモコンが つかえる！'],
  ['red', 'blue', 'purple', 'あか ＋ あお ＝ むらさき！', 1],
  ['blue', 'yellow', 'green', 'あお ＋ きいろ ＝ みどり！', 1],
  ['red', 'yellow', 'orange', 'あか ＋ きいろ ＝ オレンジ！', 1],
];
// えらんで もういちど タップ ＝ しらべる
const INSPECT = {
  duck: () => { take('duck'); give('handle', 'アヒルの おなかが パカッ！ シャワーの ハンドルが はいって いた！'); },
};
const MEMO = {
  memo: 'メモ：「ねこ → いぬ → うさぎ の かず が ばんごう」',
  memo2: 'メモ：「れいぞうこの いろは カレンダーの くだものの じゅん」',
};
const ROOMS = [
  { name: 'りなの へや', wall: '#FFE6EE', floor: '#D8B08A' },
  { name: 'キッチン', wall: '#E8F4E0', floor: '#C8C0B0' },
  { name: 'にわの ものおき', wall: '#E8DCC8', floor: '#8A7050' },
  { name: 'おふろば', wall: '#E0F0F8', floor: '#B8D0D8', neu: 'シャワー・もちものを しらべる' },
  { name: 'リビング', wall: '#FFF0D8', floor: '#C89A6A', neu: 'やじるしの かぎ' },
  { name: 'しょさい', wall: '#E8E0D0', floor: '#8A6A4A', neu: '本の ならべかえ・むしめがね' },
  { name: 'アトリエ', wall: '#FFFFFF', floor: '#D8C8B0', neu: 'えのぐを まぜる' },
  { name: 'やねうら', wall: '#C8B090', floor: '#7A5A3A', neu: 'ランプ パズル' },
  { name: 'おんがくしつ', wall: '#E8E0FF', floor: '#9A7ACA', neu: 'おとの じゅんばん' },
  { name: 'げんかん', wall: '#F4ECE0', floor: '#A89078', neu: 'ことばの かぎ' },
];

const sv = Object.assign({ clear: {}, cur: null }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', room: 0, view: 0, f: {}, items: [], sel: null, msg: '', msgT: 0, zoom: null, hintN: 0, clearT: 0, t: 0 };

function startRoom(i, fresh) {
  G.mode = 'room'; G.room = i; G.view = 0; G.sel = null; G.zoom = null; G.hintN = 0; G.clearT = 0;
  if (!fresh && sv.cur && sv.cur.room === i) { G.f = sv.cur.f; G.items = sv.cur.items; }
  else { G.f = {}; G.items = []; }
  G.playSeq = null; G.hintK = -1;
  keep();
  say(ROOMS[i].name + '。 とびらが あかない……！ ◀ ▶ で まわりを 見てみよう', 3.5);
}
function keep() { sv.cur = { room: G.room, f: G.f, items: G.items }; save(); }
function say(s, t) { G.msg = s; G.msgT = t || 2.8; }
function has(k) { return G.items.indexOf(k) >= 0; }
function give(k, s) { if (!has(k)) G.items.push(k); say(s || ITEM[k].name + 'を てにいれた！'); jingle([76, 79, 84], 0.08, 'square', 0.1); keep(); }
function take(k) { G.items = G.items.filter((x) => x !== k); if (G.sel === k) G.sel = null; keep(); }
function using(k) { return G.sel === k; }
function clearRoom() {
  sv.clear[G.room] = 1; sv.cur = null; save();
  G.mode = 'clear'; G.clearT = 0;
  jingle([72, 76, 79, 84, 88, 91], 0.1, 'square', 0.14);
}

// --- え の どうぐ ------------------------------------------------------------------

const LX = () => (VW - 720) / 2;   // なかみは はば 720 の まんなかに かく
function animal(kind, x, y, s) {
  const col = { cat: '#F0A860', dog: '#C89A6A', rabbit: '#F4F0F0' }[kind];
  if (kind === 'rabbit') { ellipse(x - s * 0.35, y - s * 1.1, s * 0.18, s * 0.6); ctx.fillStyle = col; ctx.fill(); ellipse(x + s * 0.35, y - s * 1.1, s * 0.18, s * 0.6); ctx.fill(); }
  if (kind === 'cat') for (const sg of [-1, 1]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + sg * s * 0.2, y - s * 0.6); ctx.lineTo(x + sg * s * 0.7, y - s * 1.05); ctx.lineTo(x + sg * s * 0.75, y - s * 0.35); ctx.fill(); }
  fillC(x, y + s * 0.55, s * 0.62, col);
  fillC(x, y - s * 0.2, s * 0.7, col);
  if (kind === 'dog') for (const sg of [-1, 1]) { ellipse(x + sg * s * 0.7, y - s * 0.1, s * 0.22, s * 0.45, sg * 0.3); ctx.fillStyle = '#8A5A3A'; ctx.fill(); }
  fillC(x - s * 0.25, y - s * 0.25, s * 0.09, '#2A2028'); fillC(x + s * 0.25, y - s * 0.25, s * 0.09, '#2A2028');
  fillC(x, y - s * 0.05, s * 0.09, kind === 'rabbit' ? '#FF8AA8' : '#4A3030');
}
function wallBase(t) {
  const R = ROOMS[G.room];
  fillR(0, 0, VW, 330, R.wall);
  fillR(0, 330, VW, 140, R.floor);
  fillR(0, 326, VW, 8, 'rgba(0,0,0,0.12)');
  if (G.room === 2) { ctx.fillStyle = 'rgba(90,60,30,0.15)'; for (let x = 0; x < VW; x += 40) ctx.fillRect(x, 0, 3, 330); }
  if (G.room === 1) { ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1; for (let x = 0; x < VW; x += 36) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 330); ctx.stroke(); } for (let y = 200; y < 330; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); } }
  if (G.room === 3) { ctx.strokeStyle = 'rgba(80,120,150,0.18)'; ctx.lineWidth = 1; for (let x = 0; x < VW; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 330); ctx.stroke(); } for (let y = 0; y < 330; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); } }
  if (G.room === 4) { ctx.fillStyle = 'rgba(230,160,90,0.12)'; for (let x = 0; x < VW; x += 48) ctx.fillRect(x, 0, 20, 330); }
  if (G.room === 5) { fillR(0, 220, VW, 110, '#A8845A'); fillR(0, 216, VW, 6, '#6A4A30'); }
  if (G.room === 6) { for (let i = 0; i < 18; i++) fillC((i * 173) % VW, 30 + (i * 97) % 280, 6 + (i % 4) * 3, ['rgba(232,74,74,0.15)', 'rgba(74,138,232,0.15)', 'rgba(255,210,74,0.2)'][i % 3]); }
  if (G.room === 7) { ctx.fillStyle = 'rgba(90,60,30,0.2)'; for (let y = 0; y < 330; y += 34) ctx.fillRect(0, y, VW, 3); }
  if (G.room === 8) { for (let i = 0; i < 12; i++) text('♪', (i * 131) % VW + 20, 40 + (i * 71) % 260, 22, 'rgba(120,90,200,0.18)', 'center'); }
  void t;
}
function door(x, y, open, col) {
  fillRR(x - 6, y - 6, 132, 262, 6, '#6A4A30');
  if (open) { fillR(x, y, 120, 250, '#FFF6D0'); ctx.fillStyle = 'rgba(255,240,180,0.6)'; ctx.fillRect(x, y, 120, 250); return; }
  fillRR(x, y, 120, 250, 4, col || '#B8864E');
  fillRR(x + 12, y + 14, 96, 100, 4, 'rgba(0,0,0,0.08)');
  fillRR(x + 12, y + 130, 96, 100, 4, 'rgba(0,0,0,0.08)');
  fillC(x + 100, y + 130, 7, '#E8C040');
}

// ホットスポット：{ x, y, w, h, on }
let HOT = [];
function hot(x, y, w, h, on) { HOT.push({ x, y, w, h, on }); }

// --- へや 1：りなの へや ------------------------------------------------------------

function room0(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open);
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('かぎが かかって いる。 ドアノブの 上に ばんごうの かぎが ある'); });
    fillRR(o + 330, 150, 60, 30, 5, '#3A3A48');
    for (let i = 0; i < 3; i++) fillRR(o + 334 + i * 19, 155, 15, 20, 3, '#E8E8F0');
    hot(o + 322, 140, 76, 50, () => { if (!f.open) G.zoom = { kind: 'lock', n: 3, d: [0, 0, 0], ans: [2, 4, 1] }; });
    // ポスター
    fillRR(o + 60, 60, 170, 200, 6, '#FFFFFF');
    text('りなの え', o + 145, 84, 16, '#E04A7A', 'center');
    fillR(o + 100, 150, 90, 70, '#FFE8A0'); ctx.fillStyle = '#E84A4A'; ctx.beginPath(); ctx.moveTo(o + 90, 152); ctx.lineTo(o + 145, 110); ctx.lineTo(o + 200, 152); ctx.fill();
    fillR(o + 135, 185, 22, 35, '#8A5A34'); fillC(o + 205, 110, 14, '#FFD24A');
    hot(o + 60, 60, 170, 200, () => say('りなが かいた おうちの え'));
    // コートかけ
    fillR(o + 540, 90, 8, 240, '#8A5A34'); fillC(o + 544, 90, 10, '#8A5A34');
    fillRR(o + 516, 110, 56, 90, 12, '#FF8FB8');
  } else if (v === 1) {
    // たな
    fillR(o + 80, 110, 560, 14, '#A8784A');
    animal('cat', o + 150, 80, 20); animal('dog', o + 260, 80, 20); animal('dog', o + 360, 80, 20); animal('dog', o + 560, 80, 20);
    fillRR(o + 430, 50, 30, 60, 3, '#4A8AE8'); fillRR(o + 462, 56, 26, 54, 3, '#FFB020'); fillRR(o + 490, 46, 30, 64, 3, '#8FD07A');
    hot(o + 80, 30, 560, 94, () => say('たなに ぬいぐるみと 本が ならんで いる'));
    // つくえ
    fillRR(o + 160, 230, 400, 26, 6, '#C8905A');
    fillR(o + 180, 256, 16, 110, '#A8784A'); fillR(o + 524, 256, 16, 110, '#A8784A');
    fillRR(o + 300, 262, 150, 60, 6, f.drawer ? '#8A5A34' : '#B8804A');
    fillC(o + 375, 292, 7, '#E8C040');
    if (!f.drawer) fillRR(o + 368, 270, 14, 10, 3, '#3A3A48');
    hot(o + 300, 262, 150, 60, () => {
      if (f.drawer) { if (!has('memo') && !f.memoTaken) { f.memoTaken = 1; give('memo', 'ひきだしの 中に メモが あった！'); } else say('からっぽの ひきだし'); return; }
      if (using('key')) { f.drawer = 1; take('key'); f.memoTaken = 1; give('memo', 'ひきだしが あいた！ 中に メモが あった！'); return; }
      say('ひきだしに かぎが かかって いる。 ちいさな かぎが いりそう');
    });
    fillRR(o + 200, 200, 90, 30, 4, '#FFFFFF'); text('えほん', o + 245, 215, 14, '#6A6A7A', 'center');
  } else if (v === 2) {
    // ベッド
    fillRR(o + 90, 200, 520, 130, 16, '#FFB8D0'); fillRR(o + 90, 240, 520, 90, 16, '#FF8FB8');
    fillRR(o + 70, 130, 30, 200, 8, '#C8905A'); fillRR(o + 600, 170, 30, 160, 8, '#C8905A');
    fillRR(o + 120, 176, 140, 60, 26, f.pillow ? '#F4F4FF' : '#FFFFFF');
    hot(o + 120, 176, 140, 60, () => { if (!f.pillow) { f.pillow = 1; give('key', 'まくらの 下に ちいさな かぎが あった！'); } else say('ふかふかの まくら'); });
    animal('cat', o + 380, 200, 24); animal('rabbit', o + 480, 200, 24);
    hot(o + 340, 150, 200, 90, () => say('ベッドの 上の ぬいぐるみ。 かわいい'));
  } else {
    // まど と とけい
    fillRR(o + 220, 50, 280, 200, 8, '#FFFFFF'); fillR(o + 232, 62, 256, 176, '#9AD8FF');
    fillC(o + 440, 110, 22, '#FFE066'); fillR(o + 358, 62, 4, 176, '#FFFFFF'); fillR(o + 232, 148, 256, 4, '#FFFFFF');
    fillR(o + 200, 250, 320, 14, '#C8905A');
    animal('dog', o + 300, 222, 22);
    hot(o + 220, 50, 280, 214, () => say('いい てんき。 はやく そとで あそびたい！'));
    fillC(o + 620, 100, 42, '#FFFFFF'); ctx.strokeStyle = '#3A3A48'; ctx.lineWidth = 4; circ(o + 620, 100, 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o + 620, 100); ctx.lineTo(o + 620, 70); ctx.moveTo(o + 620, 100); ctx.lineTo(o + 640, 108); ctx.stroke();
    fillRR(o + 70, 250, 70, 80, 10, '#C86A4A'); fillC(o + 105, 230, 36, '#3E9B4F');
    hot(o + 60, 190, 90, 140, () => say('はっぱが ゆれた。 なにも ない みたい'));
  }
}
const HINT0 = [
  [() => !G.f.pillow, 'ベッドの まくらを しらべて みよう'],
  [() => !G.f.drawer, 'ちいさな かぎを えらんで、つくえの ひきだしを タップ'],
  [() => !G.f.open, 'メモには「ねこ → いぬ → うさぎ の かず」。 4つの かべ ぜんぶの ぬいぐるみを かぞえよう'],
  [() => !G.f.open, 'ねこ 2ひき・いぬ 4ひき・うさぎ 1ぴき。 ドアの ばんごうは「2 4 1」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 2：キッチン ----------------------------------------------------------------

const COLS = [['あか', '#E84A4A'], ['きいろ', '#FFD24A'], ['むらさき', '#9A5AD8'], ['みどり', '#4AB85A'], ['あお', '#4A8AE8'], ['しろ', '#F4F4F4']];
function fruit(k, x, y, s) {
  if (k === 0) { fillC(x, y, s, '#E84A4A'); fillR(x - 1, y - s - 6, 3, 8, '#6A4A30'); }
  if (k === 1) { ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = s * 0.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y - s, s * 1.2, 0.5, 2.6); ctx.stroke(); }
  if (k === 2) for (let i = 0; i < 6; i++) fillC(x + [-6, 6, 0, -12, 12, 0][i] * s / 14, y + [-6, -6, 4, -16, -16, 14][i] * s / 14, s * 0.4, '#9A5AD8');
  if (k === 3) { fillC(x, y, s * 1.05, '#8AD06A'); ctx.strokeStyle = '#5AA04A'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * s * 0.35, y - s); ctx.lineTo(x + i * s * 0.35, y + s); ctx.stroke(); } }
}
function room1(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#9AB8D8');
    hot(o + 300, 76, 120, 250, () => {
      if (f.open) { clearRoom(); return; }
      if (using('doorkey')) { f.open = 1; take('doorkey'); keep(); say('カチャ！ ドアが あいた！ もういちど タップで そとへ'); jingle([72, 79, 84], 0.1, 'square', 0.12); return; }
      say('かぎあなが ある。 ドアの かぎが いる');
    });
    fillRR(o + 90, 110, 130, 90, 6, '#FFFFFF');
    for (let i = 0; i < 4; i++) fillC(o + 115 + i * 27, 140, 9, ['#E84A4A', '#4A8AE8', '#FFD24A', '#4AB85A'][i]);
    text('おさらの いろ', o + 155, 178, 13, '#6A6A7A', 'center');
    hot(o + 90, 110, 130, 90, () => say('おさらの え。 あか・あお・きいろ・みどり……これは ヒントかな？'));
  } else if (v === 1) {
    // れいぞうこ
    fillRR(o + 250, 40, 220, 290, 14, f.fridge ? '#DDE8F0' : '#F4F8FC');
    fillR(o + 250, 150, 220, 4, '#B8C8D8');
    fillR(o + 440, 70, 8, 60, '#B8C8D8'); fillR(o + 440, 180, 8, 80, '#B8C8D8');
    fillRR(o + 290, 180, 120, 40, 8, '#3A3A48');
    for (let i = 0; i < 4; i++) fillC(o + 308 + i * 28, 200, 9, '#6A6A7A');
    if (f.fridge) { fillRR(o + 262, 160, 196, 160, 8, '#FFFFFF'); fillRR(o + 290, 250, 60, 50, 6, '#FFFFFF'); ctx.strokeStyle = '#C8D8E8'; ctx.strokeRect(o + 262, 160, 196, 160); if (!f.keyTaken) { fillRR(o + 380, 270, 40, 16, 4, '#C8A040'); } }
    hot(o + 250, 40, 220, 290, () => {
      if (f.fridge) { if (!f.keyTaken) { f.keyTaken = 1; give('doorkey', 'れいぞうこの 中に ドアの かぎが あった！'); } else say('つめたい。 ジュースが はいって いる'); return; }
      G.zoom = { kind: 'color', d: [5, 5, 5, 5], ans: [0, 1, 2, 3] };
    });
    fillRR(o + 70, 200, 120, 130, 8, '#E8C898'); text('しょっきだな', o + 130, 260, 14, '#6A5A4A', 'center');
    hot(o + 70, 200, 120, 130, () => say('おさらが きちんと ならんで いる'));
  } else if (v === 2) {
    // カレンダー と まど
    fillRR(o + 90, 60, 200, 230, 6, '#FFFFFF');
    fillR(o + 90, 60, 200, 36, '#E84A7A'); text('くだものの ひ', o + 190, 78, 16, '#FFFFFF', 'center');
    [0, 1, 2, 3].forEach((k, i) => { fruit(k, o + 130 + (i % 2) * 120, 140 + Math.floor(i / 2) * 90, 18); text(['1', '2', '3', '4'][i], o + 105 + (i % 2) * 120, 115 + Math.floor(i / 2) * 90, 14, '#E84A7A'); });
    hot(o + 90, 60, 200, 230, () => say('カレンダー。 1 りんご・2 バナナ・3 ぶどう・4 メロン'));
    fillRR(o + 380, 60, 260, 180, 8, '#FFFFFF'); fillR(o + 392, 72, 236, 156, '#BFE8FF');
    fillC(o + 460, 150, 30, '#8FD07A'); fillR(o + 456, 150, 8, 70, '#7A5234');
    hot(o + 380, 60, 260, 180, () => say('にわの 木が 見える'));
    // かべの あな（ねじ どめ）
    fillRR(o + 460, 260, 90, 50, 4, f.vent ? '#3A3A48' : '#C8C8D0');
    if (!f.vent) { ctx.strokeStyle = '#8A8A98'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(o + 470, 270 + i * 9); ctx.lineTo(o + 540, 270 + i * 9); ctx.stroke(); } for (const [a, b] of [[466, 264], [544, 264], [466, 306], [544, 306]]) fillC(o + a, b, 3, '#6A6A7A'); }
    else if (!f.memo2) fillRR(o + 485, 272, 40, 26, 3, '#FFFFFF');
    hot(o + 460, 260, 90, 50, () => {
      if (f.vent) { if (!f.memo2) { f.memo2 = 1; give('memo2', 'あなの 中に メモが あった！'); } else say('からっぽの あな'); return; }
      if (using('driver')) { f.vent = 1; keep(); say('ねじを はずした！ 中に なにか ある'); tone(700, 0.2, 'square', 0.08); return; }
      say('ねじで とめて ある。 ドライバーが あれば……');
    });
  } else {
    // ながし
    fillRR(o + 120, 190, 480, 30, 6, '#C8C8D0');
    fillRR(o + 120, 220, 480, 110, 6, '#E8D8B8');
    fillRR(o + 150, 232, 190, 90, 6, f.sink ? '#A89878' : '#F0E4C8'); fillRR(o + 380, 232, 190, 90, 6, '#F0E4C8');
    fillC(o + 330, 276, 5, '#6A5A4A'); fillC(o + 390, 276, 5, '#6A5A4A');
    fillR(o + 350, 120, 10, 70, '#A8A8B8'); fillRR(o + 320, 110, 70, 14, 6, '#A8A8B8');
    hot(o + 150, 232, 190, 90, () => { if (!f.sink) { f.sink = 1; give('driver', 'ながしの 下に ドライバーが あった！'); } else say('あらいものの せんざい'); });
    hot(o + 380, 232, 190, 90, () => say('おなべが はいって いる'));
  }
}
const HINT1 = [
  [() => !G.f.sink, 'ながしの 下の とだなを しらべて みよう'],
  [() => !G.f.vent, 'ドライバーを えらんで、カレンダーの よこの ねじの ふたを タップ'],
  [() => !G.f.fridge, 'メモ「れいぞうこの いろは カレンダーの くだものの じゅん」。 りんご・バナナ・ぶどう・メロンの いろは？'],
  [() => !G.f.fridge, 'れいぞうこは「あか・きいろ・むらさき・みどり」'],
  [() => true, 'ドアの かぎを えらんで ドアを タップ！'],
];

// --- へや 3：ものおき -----------------------------------------------------------------

function room2(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#8A6A4A');
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('南京錠（なんきんじょう）が かかって いる。 2けたの ばんごう'); });
    fillRR(o + 380, 180, 40, 46, 8, '#C8A040'); ctx.strokeStyle = '#8A8A98'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(o + 400, 180, 14, Math.PI, 0); ctx.stroke();
    hot(o + 370, 150, 60, 80, () => { if (!f.open) G.zoom = { kind: 'lock', n: 2, d: [0, 0], ans: [5, 7] }; });
    fillR(o + 90, 100, 160, 10, '#6A4A30'); for (let i = 0; i < 4; i++) fillR(o + 100 + i * 40, 110, 6, 80 + i * 10, '#8A8A98');
    hot(o + 90, 90, 160, 120, () => say('スコップや くまでが かかって いる'));
  } else if (v === 1) {
    fillR(o + 120, 140, 480, 12, '#6A4A30'); fillR(o + 120, 250, 480, 12, '#6A4A30');
    fillRR(o + 160, 180, 70, 60, 6, '#E84A4A'); text('どうぐばこ', o + 195, 212, 12, '#FFFFFF', 'center');
    hot(o + 160, 180, 70, 60, () => say('どうぐばこ。 くぎが たくさん'));
    if (!f.lightTaken) { fillRR(o + 420, 200, 90, 30, 10, '#6A7A9A'); fillRR(o + 500, 196, 24, 38, 6, '#8A9AB8'); }
    hot(o + 400, 180, 140, 70, () => { if (!f.lightTaken) { f.lightTaken = 1; give('light', 'かいちゅうでんとうを みつけた！ でも でんちが ない……'); } });
    fillRR(o + 260, 70, 120, 70, 8, '#8FD07A'); fillRR(o + 400, 90, 60, 50, 6, '#FFB020');
    hot(o + 250, 60, 220, 90, () => say('うえきばちと じょうろ'));
  } else if (v === 2) {
    fillRR(o + 90, 60, 170, 110, 8, '#FFFFFF'); text('おやつの じかん', o + 175, 86, 16, '#E84A7A', 'center');
    text('3 じ', o + 175, 130, 36, '#2A2440', 'center');
    hot(o + 90, 60, 170, 110, () => say('「おやつの じかん 3じ」と かいて ある'));
    // とけいの はこ
    fillRR(o + 380, 110, 200, 200, 14, f.box ? '#8A6A4A' : '#B8864E');
    const cx = o + 480, cy = 200;
    fillC(cx, cy, 70, '#FFFFFF'); ctx.strokeStyle = '#3A3A48'; ctx.lineWidth = 4; circ(cx, cy, 70); ctx.stroke();
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; text(i, cx + Math.cos(a) * 54, cy + Math.sin(a) * 54, 13, '#2A2440', 'center'); }
    const h = f.hour || 12, a = h / 12 * Math.PI * 2 - Math.PI / 2;
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 56); ctx.stroke();
    fillC(cx, cy, 6, '#3A3A48');
    if (f.box && !f.batTaken) fillRR(o + 460, 280, 40, 20, 4, '#4A8A4A');
    hot(o + 380, 110, 200, 200, () => {
      if (f.box) { if (!f.batTaken) { f.batTaken = 1; give('battery', 'はこの 中に でんちが あった！'); } else say('からっぽの はこ'); return; }
      f.hour = (f.hour || 12) % 12 + 1; tone(900, 0.04, 'square', 0.06); keep();
      if (f.hour === 3) { f.box = 1; keep(); say('カチッ！ はこの ふたが ひらいた！'); jingle([79, 84], 0.1, 'square', 0.12); }
    });
  } else {
    // くらい すみ
    fillR(0, 0, VW, 470, '#1A1410');
    if (using('lighton') || f.seen57) {
      f.seen57 = 1;
      const g = ctx.createRadialGradient(o + 360, 190, 10, o + 360, 190, 170);
      g.addColorStop(0, 'rgba(255,240,180,0.85)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.fillRect(o + 150, 20, 420, 360);
      text('5 7', o + 360, 190, 64, '#8A3A2A', 'center');
    } else text('まっくらで なにも 見えない', o + 360, 190, 20, '#6A5A4A', 'center');
    hot(o + 150, 40, 420, 300, () => { if (using('lighton')) { f.seen57 = 1; keep(); say('かべに「5 7」と かいて ある！'); } else if (!f.seen57) say('まっくら。 あかりが あれば……'); });
  }
}
const HINT2 = [
  [() => !G.f.lightTaken, 'たなの 上を しらべて みよう'],
  [() => !G.f.box, 'はこの とけいを タップすると はりが うごく。 ポスターの じかんに あわせよう'],
  [() => !G.f.box, 'とけいの みじかい はりを「3」に しよう'],
  [() => !has('lighton') && !G.f.seen57, 'でんちを えらんでから、もちものの かいちゅうでんとうを タップ'],
  [() => !G.f.seen57, 'ひかる でんとうを えらんで、くらい すみ（みぎの かべ）を タップ'],
  [() => !G.f.open, 'なんきんじょうの ばんごうは「5 7」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 4：おふろば（あたらしい：シャワーで へやが かわる・もちものを しらべる） -------------------

function lockOnDoor(o, f, n, ans, label) {
  hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say(label); });
  fillRR(o + 330, 150, 60, 30, 5, '#3A3A48');
  for (let i = 0; i < n; i++) fillRR(o + 332 + i * (56 / n), 155, 56 / n - 4, 20, 3, '#E8E8F0');
  hot(o + 322, 140, 76, 50, () => { if (!f.open) G.zoom = { kind: 'lock', n, d: Array(n).fill(0), ans }; });
}
function room3(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#C8E0F0');
    lockOnDoor(o, f, 3, [8, 2, 6], '3けたの ばんごうの かぎが かかって いる');
    fillR(o + 80, 120, 150, 8, '#A8A8B8'); fillRR(o + 100, 128, 110, 120, 8, '#FF9AB8');
    hot(o + 80, 110, 150, 140, () => say('ふかふかの タオル'));
    fillRR(o + 520, 230, 90, 100, 10, '#FFFFFF'); fillRR(o + 530, 210, 70, 26, 8, '#E8E8F0');
    hot(o + 520, 210, 90, 120, () => say('せんたくき。 からっぽ'));
  } else if (v === 1) {
    // おふろ
    fillRR(o + 110, 190, 500, 140, 34, '#FFFFFF');
    if (!f.drain) {
      fillRR(o + 132, 204, 456, 76, 26, '#8AD0F0');
      for (let i = 0; i < 14; i++) fillC(o + 150 + i * 31, 208 + Math.sin(t * 2 + i) * 4, 9, 'rgba(255,255,255,0.8)');
    } else {
      fillRR(o + 132, 204, 456, 100, 26, '#E8F4F8');
      if (!f.duckTaken) { fillC(o + 360, 272, 18, '#FFD24A'); fillC(o + 378, 256, 11, '#FFD24A'); fillR(o + 386, 254, 12, 5, '#FF9A3A'); fillC(o + 380, 253, 2, '#2A2028'); }
    }
    ctx.strokeStyle = '#A8A8B8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o + 575, 180); ctx.quadraticCurveTo(o + 590, 230, o + 572, 262); ctx.stroke();
    fillC(o + 572, 266, 10, f.drain ? '#6A6A7A' : '#3A3A48');
    hot(o + 540, 170, 70, 110, () => {
      if (!f.drain) { f.drain = 1; keep(); say('せんを ぬいた！ おゆが ながれて いく……'); noise(0.6, 0.15, 800); }
      else say('おゆは もう ない');
    });
    hot(o + 140, 200, 390, 110, () => {
      if (!f.drain) { say('あったかい おゆが いっぱい。 そこは 見えない'); return; }
      if (!f.duckTaken) { f.duckTaken = 1; give('duck', 'おふろの そこに アヒルの おもちゃ！'); } else say('からっぽの おふろ');
    });
  } else if (v === 2) {
    // かがみ と せんめんだい
    fillRR(o + 240, 40, 240, 180, 12, '#B8C8D8'); fillRR(o + 252, 52, 216, 156, 8, '#DDEEF8');
    if (f.steam) {
      fillRR(o + 252, 52, 216, 156, 8, 'rgba(255,255,255,0.75)');
      text('8 2 6', o + 360, 132, 54, '#7A98B8', 'center', true);
    } else { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(o + 280, 90); ctx.lineTo(o + 320, 60); ctx.moveTo(o + 290, 120); ctx.lineTo(o + 350, 70); ctx.stroke(); }
    hot(o + 240, 40, 240, 180, () => { if (f.steam) { f.seenCode = 1; keep(); say('くもった かがみに「8 2 6」と ゆびで かいて ある！'); } else say('ぴかぴかの かがみ。 なにも かいて ない'); });
    fillRR(o + 250, 240, 220, 40, 10, '#FFFFFF'); fillRR(o + 300, 250, 120, 20, 8, '#C8E0F0'); fillRR(o + 290, 280, 140, 50, 6, '#E8E8F0');
    hot(o + 250, 240, 220, 90, () => say('せんめんだい。 はブラシが 2ほん'));
  } else {
    // シャワー
    fillR(o + 356, 60, 8, 150, '#A8A8B8'); fillRR(o + 320, 50, 80, 22, 10, '#A8A8B8');
    if (f.steam) { for (let i = 0; i < 10; i++) fillR(o + 330 + i * 7, 76 + ((t * 300 + i * 40) % 110), 2, 14, '#8AD0F0'); for (let i = 0; i < 6; i++) fillC(o + 200 + i * 70, 120 + Math.sin(t + i) * 20, 40, 'rgba(255,255,255,0.35)'); }
    fillRR(o + 340, 210, 40, 40, 8, '#C8C8D0');
    if (f.handleIn) { fillC(o + 360, 230, 16, '#E84A4A'); fillR(o + 346, 227, 28, 6, '#FFFFFF'); } else fillC(o + 360, 230, 7, '#3A3A48');
    hot(o + 320, 200, 80, 60, () => {
      if (!f.handleIn) {
        if (using('handle')) { f.handleIn = 1; take('handle'); say('ハンドルを つけた！ まわせそう'); tone(700, 0.1, 'square', 0.08); }
        else say('シャワーの ハンドルが とれて いる');
        return;
      }
      if (!f.steam) { f.steam = 1; keep(); say('あつい おゆが でた！ ゆげで へやが もくもく……'); noise(0.8, 0.1, 1500); }
      else say('シャワーから おゆが でて いる');
    });
    fillRR(o + 90, 250, 110, 80, 8, '#FFE0A0'); text('シャンプー', o + 145, 290, 13, '#8A5A20', 'center');
    hot(o + 90, 250, 110, 80, () => say('いい におい'));
  }
}
const HINT3 = [
  [() => !G.f.drain, 'おふろの せん（くさり）を ぬいて みよう'],
  [() => !G.f.duckTaken, 'おゆが なくなった おふろの そこを しらべよう'],
  [() => !has('handle') && !G.f.handleIn, 'アヒルを えらんで、もういちど タップして しらべよう（あたらしい しかけ）'],
  [() => !G.f.handleIn, 'ハンドルを えらんで シャワーの ところを タップ'],
  [() => !G.f.steam, 'シャワーを タップして おゆを だそう'],
  [() => !G.f.seenCode && !G.f.open, 'ゆげで くもった かがみを 見て みよう'],
  [() => !G.f.open, 'ドアの ばんごうは「8 2 6」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 5：リビング（あたらしい：やじるしの かぎ） ------------------------------------

const ARW = ['↑', '→', '↓', '←'];
function room4(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#D8B890');
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('やじるしの かぎが かかって いる'); });
    fillRR(o + 318, 146, 84, 36, 6, '#3A3A48');
    for (let i = 0; i < 4; i++) text(ARW[0], o + 330 + i * 20, 164, 16, '#E8E8F0', 'center', true);
    hot(o + 310, 136, 100, 56, () => { if (!f.open) G.zoom = { kind: 'arrow', d: [0, 0, 0, 0], ans: [0, 1, 1, 2] }; });
    fillRR(o + 90, 240, 80, 90, 10, '#C86A4A'); fillC(o + 130, 210, 40, '#3E9B4F');
    hot(o + 80, 170, 100, 160, () => say('かんようしょくぶつ'));
  } else if (v === 1) {
    // テレビ
    fillRR(o + 200, 60, 320, 200, 12, '#2A2A38');
    if (f.tvOn) {
      ctx.fillStyle = grad(72, 248, '#FF8FC8', '#7FC8F8'); ctx.fillRect(o + 214, 72, 292, 176);
      text('ダンス ゲーム', o + 360, 100, 20, '#FFFFFF', 'center', true);
      ARW.slice(0, 4);
      [0, 1, 1, 2].forEach((d, i) => { fillRR(o + 238 + i * 64, 136, 54, 70, 10, 'rgba(255,255,255,0.85)'); text(ARW[d], o + 265 + i * 64, 172, 40, '#E84A7A', 'center', true); });
    } else fillR(o + 214, 72, 292, 176, '#1A1A24');
    fillRR(o + 240, 270, 240, 50, 8, '#8A5A34');
    hot(o + 200, 60, 320, 200, () => {
      if (f.tvOn) { say('テレビに「↑ → → ↓」！'); return; }
      if (using('remoteon')) { f.tvOn = 1; keep(); say('テレビが ついた！'); tone(900, 0.1, 'triangle', 0.1); return; }
      if (using('remote')) { say('リモコンに でんちが ない……'); return; }
      say('テレビが きえて いる。 リモコンが あれば……');
    });
  } else if (v === 2) {
    // ソファ
    fillRR(o + 110, 190, 500, 140, 24, '#5A8AC8'); fillRR(o + 90, 170, 40, 160, 16, '#4A7AB8'); fillRR(o + 590, 170, 40, 160, 16, '#4A7AB8');
    for (let i = 0; i < 3; i++) fillRR(o + 150 + i * 145, f.cushion && i === 1 ? 200 : 180, 130, 80, 24, ['#FFB8D0', '#FFE066', '#9AF0B8'][i]);
    if (f.cushion && !f.remoteTaken) { fillRR(o + 330, 272, 60, 18, 6, '#3A3A48'); }
    for (let i = 0; i < 3; i++) hot(o + 150 + i * 145, 180, 130, 100, () => {
      if (i !== 1) { say('ふかふかの クッション'); return; }
      if (!f.cushion) { f.cushion = 1; keep(); say('クッションの したに なにか ある！'); return; }
      if (!f.remoteTaken) { f.remoteTaken = 1; give('remote', 'リモコンを みつけた！ でも でんちが ない……'); } else say('ふかふかの クッション');
    });
  } else {
    // とけい と きんぎょばち
    fillC(o + 360, 120, 60, '#FFFFFF'); ctx.strokeStyle = '#8A5A34'; ctx.lineWidth = 6; circ(o + 360, 120, 60); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2A2440'; ctx.beginPath(); ctx.moveTo(o + 360, 120); ctx.lineTo(o + 360, 80); ctx.moveTo(o + 360, 120);
    const a = f.clockBat ? 0.5 : t * 0.5; ctx.lineTo(o + 360 + Math.cos(a) * 40, 120 + Math.sin(a) * 40); ctx.stroke();
    hot(o + 300, 60, 120, 120, () => { if (!f.clockBat) { f.clockBat = 1; give('battery', 'とけいの うらから でんちを とった！ とけいが とまった'); } else say('とまった とけい'); });
    fillRR(o + 480, 240, 110, 90, 30, 'rgba(160,210,255,0.6)'); fillC(o + 520 + Math.sin(t * 2) * 15, 285, 10, '#FF7A3A');
    hot(o + 470, 230, 130, 100, () => say('きんぎょが およいで いる'));
    fillRR(o + 90, 220, 170, 110, 8, '#A8784A'); text('本', o + 175, 270, 16, '#FFFFFF', 'center');
  }
}
const HINT4 = [
  [() => !G.f.remoteTaken, 'ソファの まんなかの クッションを しらべよう'],
  [() => !G.f.clockBat, 'リモコンに でんちが ない。 かべの とけいを しらべよう'],
  [() => !has('remoteon') && !G.f.tvOn, 'でんちを えらんで、もちものの リモコンを タップ'],
  [() => !G.f.tvOn, 'リモコンを えらんで テレビを タップ'],
  [() => !G.f.open, 'ドアの やじるしの かぎ（あたらしい しかけ）は テレビの「↑ → → ↓」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 6：しょさい（あたらしい：本の ならべかえ・むしめがね） --------------------------------

const BOOKC = ['#E84A4A', '#FFB020', '#4AB85A', '#4A8AE8', '#9A5AD8'];
function drawBooks(order, x, y, w, sel) {
  order.forEach((h, i) => {
    const bh = 60 + h * 22, bx = x + i * w;
    fillRR(bx + 4, y - bh, w - 8, bh, 4, BOOKC[h]);
    fillR(bx + 8, y - bh + 10, w - 16, 4, 'rgba(255,255,255,0.5)');
    if (sel === i) { ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; rr(bx + 2, y - bh - 2, w - 4, bh + 4, 6); ctx.stroke(); }
  });
}
function room5(v, t) {
  const o = LX(), f = G.f;
  if (!f.books) f.books = [3, 1, 4, 0, 2];
  if (v === 0) {
    door(o + 300, 76, f.open, '#8A6A4A');
    lockOnDoor(o, f, 4, [1, 9, 5, 3], '4けたの ばんごうの かぎが かかって いる');
    fillRR(o + 520, 90, 110, 150, 6, '#FFFFFF'); fillRR(o + 530, 100, 90, 110, 4, '#9AD8FF'); fillC(o + 575, 150, 24, '#FFE066');
    hot(o + 520, 90, 110, 150, () => say('おひさまの え'));
  } else if (v === 1) {
    // 本だな
    fillRR(o + 170, 40, 380, 290, 8, '#6A4A30'); fillR(o + 184, 190, 352, 10, '#4A3020');
    drawBooks(f.books, o + 200, 188, 64, -1);
    fillRR(o + 200, 230, 320, 80, 6, f.sorted ? '#3A2418' : '#8A5A34');
    if (f.sorted && !f.lupeTaken) { fillC(o + 360, 270, 16, '#8AB8E0'); fillR(o + 370, 280, 24, 6, '#6A4A30'); }
    hot(o + 190, 50, 340, 140, () => {
      if (f.sorted) { say('本が ひくい じゅんに ならんで いる'); return; }
      G.zoom = { kind: 'sort', d: f.books.slice(), sel: -1, ok: () => { f.books = [0, 1, 2, 3, 4]; f.sorted = 1; keep(); say('カタッ！ 本だなの したの ひきだしが あいた！'); } };
    });
    hot(o + 200, 230, 320, 80, () => {
      if (!f.sorted) { say('ひきだしが あかない。 本だなに しかけが ありそう'); return; }
      if (!f.lupeTaken) { f.lupeTaken = 1; give('lupe', 'むしめがねを みつけた！'); } else say('からっぽの ひきだし');
    });
  } else if (v === 2) {
    // つくえ と ちず
    fillRR(o + 120, 50, 300, 190, 6, '#F4E8C8'); ctx.strokeStyle = '#C8A870'; ctx.lineWidth = 2; ctx.strokeRect(o + 120, 50, 300, 190);
    fillC(o + 220, 130, 50, '#9AD08A'); fillC(o + 320, 160, 40, '#9AD08A'); text('たからの ちず', o + 270, 70, 16, '#8A5A20', 'center', true);
    text(f.read ? '1953' : '1953', o + 395, 228, f.read ? 12 : 5, '#6A4A20', 'right');
    hot(o + 120, 50, 300, 190, () => {
      if (using('lupe') || f.read) { f.read = 1; keep(); say('ちずの すみの ちいさな もじ：「ドアは 1 9 5 3」'); return; }
      say('ちずの すみに ちいさな もじ。 ちいさすぎて よめない……');
    });
    fillRR(o + 460, 240, 200, 26, 6, '#8A5A34'); fillRR(o + 490, 200, 70, 40, 4, '#FFF4A0');
    hot(o + 480, 190, 90, 60, () => say('メモ：「本は ひくい じゅんに ならべよう」'));
  } else {
    fillC(o + 360, 150, 70, '#7FC8F8'); fillC(o + 330, 130, 24, '#8AD06A'); fillC(o + 390, 170, 20, '#8AD06A');
    fillR(o + 356, 220, 8, 60, '#8A5A34'); fillRR(o + 320, 280, 80, 16, 6, '#8A5A34');
    hot(o + 280, 70, 160, 230, () => say('ちきゅうぎ。 くるくる まわる'));
  }
}
const HINT5 = [
  [() => !G.f.sorted, 'つくえの メモを 読んで、本だなを しらべよう'],
  [() => !G.f.sorted, '本を 2さつ じゅんに タップすると いれかわる（あたらしい しかけ）。 ひだりが ひくい じゅんに'],
  [() => !G.f.lupeTaken, '本だなの したの ひきだしを しらべよう'],
  [() => !G.f.read, 'むしめがねを えらんで、かべの ちずを タップ'],
  [() => !G.f.open, 'ドアの ばんごうは「1 9 5 3」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 7：アトリエ（あたらしい：えのぐを まぜる） ----------------------------------------

function flower(x, y, col, painted, label) {
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; fillC(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 14, painted ? col : '#FFFFFF'); ctx.strokeStyle = '#8A8A98'; ctx.lineWidth = 1.5; circ(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 14); ctx.stroke(); }
  fillC(x, y, 12, '#FFE066');
  if (!painted) text(label, x, y + 50, 13, '#6A6A7A', 'center', true);
}
function room6(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#E8C0A0');
    hot(o + 300, 76, 120, 250, () => {
      if (f.open) { clearRoom(); return; }
      if (using('doorkey')) { f.open = 1; take('doorkey'); keep(); say('カチャ！ ドアが あいた！ もういちど タップで そとへ'); jingle([72, 79, 84], 0.1, 'square', 0.12); return; }
      say('かぎあなが ある。 ドアの かぎが いる');
    });
    fillRR(o + 80, 90, 150, 130, 6, '#FFFFFF');
    [['あか', '#E84A4A', 'あお', '#4A8AE8', '#9A5AD8'], ['あお', '#4A8AE8', 'きいろ', '#FFD24A', '#4AB85A'], ['あか', '#E84A4A', 'きいろ', '#FFD24A', '#FF9A3A']].forEach((r, i) => {
      const y = 116 + i * 36; fillC(o + 100, y, 9, r[1]); text('+', o + 118, y, 14, '#4A4A5A', 'center'); fillC(o + 136, y, 9, r[3]); text('=', o + 154, y, 14, '#4A4A5A', 'center'); fillC(o + 176, y, 11, r[4]);
    });
    text('いろの まぜかた', o + 155, 102 - 4, 11, '#6A6A7A', 'center');
    hot(o + 80, 80, 150, 140, () => say('ポスター：「あか＋あお＝むらさき・あお＋きいろ＝みどり・あか＋きいろ＝オレンジ」', 4.5));
  } else if (v === 1) {
    // イーゼル
    fillR(o + 250, 290, 10, 40, '#8A5A34'); fillR(o + 460, 290, 10, 40, '#8A5A34');
    fillRR(o + 200, 60, 320, 230, 6, '#FFFFFF'); ctx.strokeStyle = '#8A5A34'; ctx.lineWidth = 6; ctx.strokeRect(o + 200, 60, 320, 230);
    flower(o + 270, 150, '#9A5AD8', f.pu, 'むらさき'); flower(o + 360, 150, '#4AB85A', f.gr, 'みどり'); flower(o + 450, 150, '#FF9A3A', f.or, 'オレンジ');
    hot(o + 200, 60, 320, 230, () => {
      const P = { purple: 'pu', green: 'gr', orange: 'or' };
      for (const k in P) if (using(k)) {
        if (f[P[k]]) { say('もう ぬって ある'); return; }
        f[P[k]] = 1; take(k); tone(800, 0.1, 'triangle', 0.1);
        if (f.pu && f.gr && f.or) { give('doorkey', '3つの 花が さいた！ えの うらから ドアの かぎが おちた！'); } else { keep(); say(ITEM[k].name + 'で 花を ぬった！'); }
        return;
      }
      if (using('red') || using('blue') || using('yellow')) { say('その いろの 花は ない。 えのぐを まぜて みよう'); return; }
      say('3つの 花に いろが ない。 むらさき・みどり・オレンジ');
    });
  } else if (v === 2) {
    // たな
    fillR(o + 120, 170, 480, 12, '#8A5A34');
    if (!f.redT) { fillRR(o + 180, 120, 60, 50, 8, '#E84A4A'); fillRR(o + 196, 108, 28, 14, 4, '#C8C8D0'); }
    hot(o + 170, 100, 80, 80, () => { if (!f.redT) { f.redT = 1; give('red'); } else say('たなの うえ'); });
    fillRR(o + 380, 110, 120, 60, 8, f.boxOpen ? '#C8A070' : '#A8784A'); text('えのぐ', o + 440, 140, 14, '#FFFFFF', 'center');
    hot(o + 370, 100, 140, 80, () => { if (!f.boxOpen) { f.boxOpen = 1; give('blue', 'はこの 中に あおの えのぐ！'); } else say('からっぽの はこ'); });
    fillRR(o + 250, 230, 220, 90, 10, '#C8B8A0'); text('パレット', o + 360, 275, 16, '#6A5A4A', 'center');
    hot(o + 250, 230, 220, 90, () => say('パレット。 いろを まぜる ところ。 もちもので まぜられる'));
  } else {
    // バケツ
    fillRR(o + 420, 210, 120, 120, 12, '#8AB8E0'); fillR(o + 430, 220, 100, 12, f.yellowT ? '#C8D8E8' : '#FFD24A');
    hot(o + 410, 200, 140, 130, () => { if (!f.yellowT) { f.yellowT = 1; give('yellow', 'バケツに きいろの えのぐ！'); } else say('からっぽの バケツ'); });
    fillRR(o + 120, 90, 200, 150, 6, '#FFFFFF'); fillC(o + 180, 160, 30, '#FF8FB8'); fillC(o + 250, 170, 36, '#7FC8F8');
    hot(o + 120, 90, 200, 150, () => say('あおいが かいた え'));
  }
}
const HINT6 = [
  [() => !(G.f.redT && G.f.boxOpen && G.f.yellowT), 'えのぐを 3しょく あつめよう（たな・はこ・バケツ）'],
  [() => !(G.f.pu || has('purple')), 'えのぐは まぜられる（あたらしい しかけ）。 あかを えらんで、もちものの あおを タップ'],
  [() => !(G.f.pu && G.f.gr && G.f.or), 'まぜた いろを えらんで イーゼルの えを タップ。 むらさき・みどり・オレンジ'],
  [() => !G.f.open, 'ドアの かぎを えらんで ドアを タップ'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 8：やねうら（あたらしい：ランプ パズル） ---------------------------------------------

function lightsStart() { const d = Array(9).fill(1); for (const i of [0, 4, 8]) pressLight(d, i); return d; }
function pressLight(d, i) { const r = Math.floor(i / 3), c = i % 3; for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr2 = r + dr, cc = c + dc; if (rr2 >= 0 && rr2 < 3 && cc >= 0 && cc < 3) d[rr2 * 3 + cc] ^= 1; } }
function room7(v, t) {
  const o = LX(), f = G.f;
  if (!f.lights) f.lights = lightsStart();
  if (v === 0) {
    door(o + 300, 76, f.open, '#7A5A3A');
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('ドアに ランプが 9こ。 ぜんぶ つけると あきそう'); });
    fillRR(o + 318, 120, 84, 84, 8, '#2A2030');
    f.lights.forEach((on, i) => fillC(o + 334 + (i % 3) * 26, 136 + Math.floor(i / 3) * 26, 9, on ? '#FFE066' : '#4A4050'));
    hot(o + 310, 112, 100, 100, () => { if (!f.open) G.zoom = { kind: 'lights', d: f.lights, ok: () => { f.open = 1; keep(); say('ランプが ぜんぶ ついた！ ドアが あいた！'); } }; });
  } else if (v === 1) {
    fillR(0, 0, VW, 470, '#1A1410');
    if (using('lighton') || f.seenNote) {
      f.seenNote = 1;
      const g = ctx.createRadialGradient(o + 360, 190, 10, o + 360, 190, 190);
      g.addColorStop(0, 'rgba(255,240,180,0.85)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.fillRect(o + 140, 10, 440, 380);
      text('ランプを ぜんぶ つけると ドアが あく', o + 360, 170, 20, '#6A3A1A', 'center', true);
      text('おすと うえ・した・よこも かわる', o + 360, 206, 18, '#6A3A1A', 'center', true);
    } else text('まっくらで なにも 見えない', o + 360, 190, 20, '#6A5A4A', 'center');
    hot(o + 140, 40, 440, 300, () => { if (using('lighton')) { f.seenNote = 1; keep(); say('かべに かいて ある！'); } else if (!f.seenNote) say('まっくら。 あかりが あれば……'); });
  } else if (v === 2) {
    fillRR(o + 250, 190, 220, 140, 10, '#8A6A4A'); fillR(o + 250, 230, 220, 8, '#6A4A30'); text('ふるい はこ', o + 360, 280, 16, '#FFE0B0', 'center');
    hot(o + 250, 190, 220, 140, () => { if (!f.lightTaken) { f.lightTaken = 1; give('light', 'かいちゅうでんとうを みつけた！ でも でんちが ない……'); } else say('ほこりっぽい はこ'); });
    for (let i = 0; i < 3; i++) fillRR(o + 80 + i * 40, 250 - i * 30, 60, 80 + i * 30, 4, ['#C89A6A', '#A8784A', '#8A5A34'][i]);
  } else {
    fillRR(o + 300, 200, 140, 90, 12, '#C86A4A'); fillC(o + 340, 245, 26, '#3A3A48'); fillRR(o + 380, 220, 44, 20, 4, '#FFE0B0'); fillR(o + 420, 170, 4, 34, '#A8A8B8');
    hot(o + 300, 170, 140, 120, () => { if (!f.batTaken) { f.batTaken = 1; give('battery', 'ふるい ラジオから でんちを とった！'); } else say('こわれた ラジオ'); });
    fillRR(o + 90, 60, 120, 90, 6, '#9AC8E8'); hot(o + 90, 60, 120, 90, () => say('ちいさな まど。 そらが 見える'));
  }
}
const HINT7 = [
  [() => !G.f.lightTaken, 'ふるい はこを しらべよう'],
  [() => !G.f.batTaken, 'ラジオを しらべよう'],
  [() => !has('lighton') && !G.f.seenNote, 'でんちを えらんで、もちものの かいちゅうでんとうを タップ'],
  [() => !G.f.seenNote, 'ひかる でんとうを えらんで くらい かべを タップ'],
  [() => !G.f.open, 'ドアの ランプ パズル（あたらしい しかけ）。 おすと うえ・した・よこも かわる'],
  [() => !G.f.open, 'ひだりうえ・まんなか・みぎした の 3つを おすと……？'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 9：おんがくしつ（あたらしい：おとの じゅんばん） -----------------------------------

const BELL = [['あか', '#E84A4A', 523], ['きいろ', '#FFD24A', 659], ['みどり', '#4AB85A', 784], ['あお', '#4A8AE8', 1047]];
const SEQ8 = [2, 0, 3, 1, 0];
function playSeq() { G.playSeq = { t: -0.3, i: -1 }; }
function room8(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#6A4AA8');
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('ドアに 4つの ベル。 ただしい じゅんに ならすと あきそう'); });
    BELL.forEach((b, i) => fillC(o + 327 + i * 22, 160, 9, b[1]));
    hot(o + 310, 140, 100, 44, () => { if (!f.open) G.zoom = { kind: 'bells', inp: [], ok: () => { f.open = 1; keep(); say('ベルが なって ドアが あいた！'); } }; });
  } else if (v === 1) {
    // ピアノ
    fillRR(o + 160, 90, 400, 170, 10, '#2A2030'); fillR(o + 180, 180, 360, 50, '#FFFFFF');
    for (let i = 0; i < 14; i++) fillR(o + 180 + i * 25.7, 180, 1.5, 50, '#8A8A98');
    for (let i = 0; i < 13; i++) if (i % 7 !== 2 && i % 7 !== 6) fillR(o + 196 + i * 25.7, 180, 14, 30, '#2A2030');
    hot(o + 180, 180, 360, 50, () => tone(pick([392, 440, 494, 523, 587]), 0.3, 'triangle', 0.12));
    fillRR(o + 270, 280, 180, 40, 8, '#6A4A30');
    hot(o + 270, 270, 180, 60, () => { if (!f.nejiTaken) { f.nejiTaken = 1; give('neji', 'ピアノの いすの 中に ぜんまいの ねじ！'); } else say('ピアノの いす'); });
  } else if (v === 2) {
    // オルゴール
    fillRR(o + 270, 190, 180, 110, 10, '#B8864E'); fillRR(o + 270, 170, 180, 30, 8, '#C8986A');
    fillC(o + 460, 240, 10, f.nejiIn ? '#C8A040' : '#3A3A48');
    const P = G.playSeq;
    if (P && P.i >= 0 && P.i < SEQ8.length) { const b = BELL[SEQ8[P.i]]; fillC(o + 360, 110, 46, b[1]); text('♪', o + 360, 110, 44, '#FFFFFF', 'center', true); text(b[0], o + 360, 170 - 8, 16, '#4A2A1A', 'center', true); }
    else text('オルゴール', o + 360, 140, 18, '#6A4A8A', 'center', true);
    hot(o + 260, 160, 220, 150, () => {
      if (!f.nejiIn) {
        if (using('neji')) { f.nejiIn = 1; take('neji'); }
        else { say('オルゴール。 ぜんまいの ねじが ない'); return; }
      }
      f.played = 1; keep(); playSeq(); say('オルゴールが なった！ いろの じゅんばんを おぼえよう（なんかいでも きける）');
    });
  } else {
    // がくふ
    fillRR(o + 150, 60, 420, 170, 6, '#FFFFFF');
    for (let i = 0; i < 5; i++) fillR(o + 170, 100 + i * 20, 380, 2, '#8A8A98');
    for (let i = 0; i < 5; i++) { fillC(o + 220 + i * 70, 170 - i * 8, 12, '#2A2440'); fillR(o + 230 + i * 70, 110 - i * 8, 3, 60, '#2A2440'); text(i + 1, o + 220 + i * 70, 210, 13, '#6A6A7A', 'center'); }
    hot(o + 150, 60, 420, 170, () => say('がくふ。 おとは 5つ。 いろは オルゴールが おしえて くれる'));
  }
}
const HINT8 = [
  [() => !G.f.nejiTaken, 'ピアノの いすを しらべよう'],
  [() => !G.f.played, 'ねじを えらんで オルゴールを タップ'],
  [() => !G.f.open, 'オルゴールの いろの じゅんに、ドアの ベルを ならそう（あたらしい しかけ）'],
  [() => !G.f.open, 'じゅんばんは「みどり・あか・あお・きいろ・あか」'],
  [() => true, 'ドアを タップして そとへ！'],
];

// --- へや 10：げんかん（あたらしい：ことばの かぎ。いままでの しかけも つかう） ----------------------

const WORD = ['あ', 'そ', 'と', 'へ', 'に', 'じ', 'り', 'な', 'か', 'ぎ'];
function room9(v, t) {
  const o = LX(), f = G.f;
  if (v === 0) {
    door(o + 300, 76, f.open, '#A8784A');
    hot(o + 300, 76, 120, 250, () => { if (f.open) clearRoom(); else say('ことばの かぎが かかって いる。 3もじ'); });
    fillRR(o + 322, 146, 76, 34, 6, '#3A3A48'); for (let i = 0; i < 3; i++) fillRR(o + 326 + i * 24, 151, 20, 24, 3, '#E8E8F0');
    hot(o + 310, 136, 100, 56, () => { if (!f.open) G.zoom = { kind: 'word', d: [0, 0, 0], ans: [1, 2, 3] }; });
    fillRR(o + 90, 60, 150, 170, 6, '#FFFFFF'); text('たんじょうび', o + 165, 90, 16, '#E84A7A', 'center', true);
    text('7がつ 3にち', o + 165, 150, 24, '#2A2440', 'center', true); hot(o + 90, 60, 150, 170, () => say('ポスター「たんじょうび 7がつ 3にち」'));
  } else if (v === 1) {
    // くつばこ
    fillRR(o + 150, 150, 420, 180, 8, '#A8784A'); fillR(o + 150, 230, 420, 6, '#6A4A30');
    [[210, '#4A8AE8'], [310, '#FFB8D0'], [430, '#E84A4A']].forEach(([x, c], i) => {
      if (i === 2) { fillRR(o + x, 160, 44, 64, 8, c); fillRR(o + x + 30, 204, 34, 20, 6, c); } else { fillRR(o + x, 190, 70, 30, 12, c); }
      hot(o + x - 10, 150, 90, 80, () => { if (i === 2) { f.c1 = 1; keep(); say('ながぐつの 中に カード「1ばんめ： そ」'); } else say('くつが ならんで いる'); });
    });
    fillRR(o + 170, 250, 380, 60, 6, '#C8986A');
  } else if (v === 2) {
    // くらい クローゼット
    fillR(0, 0, VW, 470, '#1A1410');
    if (using('lighton') || f.c2) {
      f.c2 = 1;
      const g = ctx.createRadialGradient(o + 360, 190, 10, o + 360, 190, 170);
      g.addColorStop(0, 'rgba(255,240,180,0.85)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.fillRect(o + 150, 20, 420, 360);
      fillRR(o + 300, 140, 120, 90, 6, '#FFFFFF'); text('2ばんめ', o + 360, 162, 14, '#6A6A7A', 'center'); text('と', o + 360, 200, 44, '#E84A7A', 'center', true);
    } else text('まっくらな クローゼット', o + 360, 190, 20, '#6A5A4A', 'center');
    hot(o + 150, 40, 420, 300, () => { if (using('lighton')) { f.c2 = 1; keep(); say('カード「2ばんめ： と」'); } else if (!f.c2) say('まっくら。 あかりが あれば……'); });
  } else {
    // ちいさな きんこ
    fillRR(o + 290, 160, 140, 130, 10, f.safe ? '#6A6A7A' : '#8A8A98'); fillC(o + 360, 225, 26, '#C8C8D0'); fillRR(o + 330, 180, 60, 20, 4, '#3A3A48');
    if (f.safe) { fillRR(o + 300, 170, 120, 110, 6, '#3A3A48'); fillRR(o + 320, 190, 80, 50, 4, '#FFFFFF'); text('3ばんめ', o + 360, 204, 12, '#6A6A7A', 'center'); text('へ', o + 360, 226, 26, '#E84A7A', 'center', true); }
    hot(o + 290, 160, 140, 130, () => {
      if (!f.safe) { G.zoom = { kind: 'lock', n: 2, d: [0, 0], ans: [7, 3], ok: () => { f.safe = 1; keep(); give('lighton', 'きんこが あいた！ ひかる でんとうと カード「3ばんめ： へ」'); } }; return; }
      say('カード「3ばんめ： へ」');
    });
    fillRR(o + 100, 200, 60, 130, 20, '#4A8AE8'); fillRR(o + 170, 190, 60, 140, 20, '#FF8FB8'); hot(o + 90, 180, 150, 150, () => say('かさたて'));
  }
}
const HINT9 = [
  [() => !G.f.c1, 'くつばこの ながぐつを しらべよう'],
  [() => !G.f.safe, 'ちいさな きんこ。 ポスターの たんじょうびが ばんごうかも'],
  [() => !G.f.safe, 'きんこの ばんごうは「7 3」'],
  [() => !G.f.c2, 'でんとうを えらんで、くらい クローゼットを タップ'],
  [() => !G.f.open, 'カードの もじを 1・2・3ばんめの じゅんに ドアの ことばの かぎ（あたらしい しかけ）へ'],
  [() => !G.f.open, 'ことばは「そ と へ」'],
  [() => true, 'ドアを タップして そとへ！'],
];

const ROOM_FN = [room0, room1, room2, room3, room4, room5, room6, room7, room8, room9];
const HINTS = [HINT0, HINT1, HINT2, HINT3, HINT4, HINT5, HINT6, HINT7, HINT8, HINT9];

// --- ズーム（かぎ） ------------------------------------------------------------------

function zoomOk() {
  const z = G.zoom;
  G.zoom = null;
  if (z.ok) z.ok();
  else if (z.kind === 'color') { G.f.fridge = 1; say('れいぞうこが あいた！'); }
  else { G.f.open = 1; say('カチャ！ あいた！ ドアを タップして そとへ'); }
  keep();
  jingle([72, 79, 84], 0.1, 'square', 0.12);
}
function drawZoom(t) {
  const z = G.zoom;
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.6)');
  const w = 520, x = VW / 2 - w / 2, y = 56;
  fillRR(x, y, w, 390, 20, '#2A2A38');
  btn(x + w - 70, y + 10, 60, 44, '×', () => { G.zoom = null; }, { col: '#FFB0B0', size: 22 });
  let manual = true;
  if (z.kind === 'lock' || z.kind === 'word' || z.kind === 'arrow') {
    const n = z.d.length, cw = Math.min(110, 440 / n);
    text(z.kind === 'word' ? 'ことばを あわせよう' : z.kind === 'arrow' ? 'やじるしを あわせよう（タップで まわる）' : 'ばんごうを あわせよう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    const lab = (d) => z.kind === 'word' ? WORD[d] : z.kind === 'arrow' ? ARW[d] : String(d);
    const mod = z.kind === 'word' ? WORD.length : z.kind === 'arrow' ? 4 : 10;
    z.d.forEach((d, i) => {
      const bx = VW / 2 - n * cw / 2 + i * cw + 8, bw = cw - 16;
      if (z.kind !== 'arrow') btn(bx, y + 80, bw, 50, '▲', () => { z.d[i] = (d + 1) % mod; tone(800, 0.03, 'square', 0.05); }, { col: '#D8D8E8', size: 18 });
      btn(bx, y + 140, bw, 90, '', () => { if (z.kind === 'arrow') { z.d[i] = (d + 1) % 4; tone(800, 0.03, 'square', 0.05); } }, { col: '#F4F4F0', flat: 1 });
      text(lab(z.d[i]), bx + bw / 2, y + 185, z.kind === 'lock' ? 48 : 44, '#2A2440', 'center', true);
      if (z.kind !== 'arrow') btn(bx, y + 240, bw, 50, '▼', () => { z.d[i] = (d + mod - 1) % mod; tone(700, 0.03, 'square', 0.05); }, { col: '#D8D8E8', size: 18 });
    });
  } else if (z.kind === 'color') {
    text('いろの ボタンを そろえよう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    z.d.forEach((d, i) => {
      const bx = VW / 2 - 200 + i * 100 + 10;
      btn(bx, y + 100, 80, 120, '', () => { z.d[i] = (d + 1) % COLS.length; tone(600 + i * 100, 0.04, 'square', 0.05); }, { col: COLS[d][1] });
      text(COLS[d][0], bx + 40, y + 240, 16, '#FFFFFF', 'center');
    });
  } else if (z.kind === 'sort') {
    manual = false;
    text('本を 2さつ タップして いれかえよう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    const bx0 = VW / 2 - 200;
    fillR(bx0, y + 300, 400, 10, '#8A5A34');
    drawBooks(z.d, bx0, y + 300, 80, z.sel);
    z.d.forEach((h, i) => btn(bx0 + i * 80, y + 80, 80, 220, '', () => {
      if (z.sel < 0) { z.sel = i; tone(700, 0.04, 'square', 0.05); return; }
      const j = z.sel; z.sel = -1;
      [z.d[i], z.d[j]] = [z.d[j], z.d[i]]; G.f.books = z.d.slice(); keep(); tone(900, 0.05, 'square', 0.06);
      if (z.d.every((v2, k) => v2 === k)) zoomOk();
    }, { col: 'rgba(0,0,0,0)', flat: 1 }));
    drawBooks(z.d, bx0, y + 300, 80, z.sel);
  } else if (z.kind === 'lights') {
    manual = false;
    text('ランプを ぜんぶ つけよう', VW / 2, y + 30, 20, '#FFFFFF', 'center');
    text('おすと うえ・した・よこも かわる', VW / 2, y + 54, 14, '#C8C0E0', 'center');
    z.d.forEach((on, i) => btn(VW / 2 - 135 + (i % 3) * 92, y + 72 + Math.floor(i / 3) * 88, 84, 80, '', () => {
      pressLight(z.d, i); keep(); tone(on ? 500 : 900, 0.05, 'square', 0.06);
      if (z.d.every((v2) => v2)) zoomOk();
    }, { col: on ? '#FFE066' : '#4A4050' }));
    btn(VW / 2 - 90, y + 340, 180, 40, 'さいしょに もどす', () => { const d = lightsStart(); for (let i = 0; i < 9; i++) z.d[i] = d[i]; keep(); }, { col: '#D8D0F0', size: 14 });
  } else if (z.kind === 'bells') {
    manual = false;
    text('ベルを じゅんばんに ならそう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    BELL.forEach((b, i) => {
      const bx = VW / 2 - 220 + i * 112;
      btn(bx, y + 100, 100, 150, b[0], () => {
        tone(b[2], 0.3, 'triangle', 0.14); z.flash = { i, t: 0.25 };
        z.inp.push(i);
        const k = z.inp.length - 1;
        if (z.inp[k] !== SEQ8[k]) { z.inp = []; say('ちがう みたい…… さいしょから'); tone(200, 0.25, 'square', 0.08); return; }
        if (z.inp.length === SEQ8.length) zoomOk();
      }, { col: z.flash && z.flash.i === i && z.flash.t > 0 ? '#FFFFFF' : b[1], size: 18 });
    });
    if (z.flash) z.flash.t -= 1 / 60;
    text('ならした かず ' + z.inp.length + ' / ' + SEQ8.length, VW / 2, y + 290, 18, '#FFFFFF', 'center');
  }
  if (manual) btn(VW / 2 - 90, y + 320, 180, 56, 'これで あける', () => {
    const ok = z.d.every((d, i) => d === z.ans[i]);
    if (!ok) { say('ちがう みたい……'); tone(200, 0.25, 'square', 0.08); return; }
    zoomOk();
  }, { col: '#9AF0B8' });
  void t;
}

// --- がめん ---------------------------------------------------------------------------

function drawRoom(t) {
  HOT = [];
  wallBase(t);
  ROOM_FN[G.room](G.view, t);
  // したの もちもの
  fillR(0, 470, VW, 70, '#2A2030');
  const n = Math.max(6, G.items.length);
  const sw = Math.min(74, (VW - 290) / n);
  G.items.forEach((k, i) => {
    const x = 16 + i * (sw + 6);
    btn(x, 478, sw, 56, '', () => invTap(k), { col: G.sel === k ? '#FFE066' : '#F4F0FF' });
    drawItem(k, x + sw / 2, 506, sw * 0.4);
  });
  // ヒント・ボタン
  btn(VW - 262, 478, 120, 56, 'ヒント', () => {
    const H = HINTS[G.room];
    const k = Math.max(0, H.findIndex((h) => h[0]()));
    // おなじ ところで もういちど おすと、もっと くわしい ヒント
    let i = k;
    if (G.hintK === k && H[k + 1] && H[k + 1][0]()) i = k + 1;
    G.hintK = k;
    say(H[i][1], 4.5);
  }, { col: '#FFE066', size: 20 });
  btn(VW - 136, 478, 120, 56, 'やめる', () => { G.mode = 'title'; }, { col: '#D8D0F0', size: 18 });
  // かべを かえる
  btn(6, 180, 56, 100, '◀', () => { G.view = (G.view + 3) % 4; }, { col: 'rgba(255,255,255,0.75)', size: 28 });
  btn(VW - 62, 180, 56, 100, '▶', () => { G.view = (G.view + 1) % 4; }, { col: 'rgba(255,255,255,0.75)', size: 28 });
  text(ROOMS[G.room].name + '　' + ['とびら', 'ひだり', 'うしろ', 'みぎ'][G.view] + 'の かべ', 16, 22, 16, 'rgba(0,0,0,0.55)', 'left', true);
  if (G.msgT > 0) {
    const w = Math.min(640, VW - 160);
    fillRR(VW / 2 - w / 2, 400, w, 56, 14, 'rgba(20,16,32,0.88)');
    text(G.msg, VW / 2, 428, 17, '#FFFFFF', 'center', true, w - 24);
  }
  if (G.zoom) drawZoom(t);
}
// もちものを タップ：えらぶ／あわせる／しらべる
function invTap(k) {
  if (G.sel && G.sel !== k) {
    const c = COMBOS.find((c2) => (c2[0] === G.sel && c2[1] === k) || (c2[1] === G.sel && c2[0] === k));
    if (c) { if (!c[4]) { take(c[0]); take(c[1]); } give(c[2], c[3]); G.sel = c[2]; return; }
  }
  if (G.sel === k && INSPECT[k]) { INSPECT[k](); return; }
  G.sel = G.sel === k ? null : k;
  if (G.sel && MEMO[k]) say(MEMO[k], 4);
  else if (G.sel) say(ITEM[k].name + 'を えらんだ。 ' + (INSPECT[k] ? 'もういちど タップで しらべる' : 'つかう ところか、あわせる もちものを タップ'));
}
function drawItem(k, x, y, s) {
  if (k === 'key' || k === 'doorkey') { fillC(x - s * 0.5, y, s * 0.45, ITEM[k].col); fillR(x - s * 0.2, y - s * 0.12, s * 1.1, s * 0.24, ITEM[k].col); fillR(x + s * 0.6, y, s * 0.14, s * 0.3, ITEM[k].col); fillC(x - s * 0.5, y, s * 0.18, '#2A2030'); }
  else if (k === 'memo' || k === 'memo2') { fillRR(x - s * 0.6, y - s * 0.8, s * 1.2, s * 1.6, 3, '#FFFFFF'); for (let i = 0; i < 4; i++) fillR(x - s * 0.4, y - s * 0.5 + i * s * 0.35, s * 0.8, 2, '#9A9AAA'); }
  else if (k === 'driver') { fillRR(x - s, y - s * 0.2, s * 0.9, s * 0.4, 4, '#E04A4A'); fillR(x - s * 0.1, y - s * 0.07, s, s * 0.14, '#A8A8B8'); }
  else if (k === 'light' || k === 'lighton') { if (k === 'lighton') fillC(x + s, y, s * 0.6, 'rgba(255,230,120,0.7)'); fillRR(x - s, y - s * 0.3, s * 1.4, s * 0.6, 6, '#6A7A9A'); fillRR(x + s * 0.3, y - s * 0.45, s * 0.5, s * 0.9, 4, '#8A9AB8'); }
  else if (k === 'battery') { fillRR(x - s * 0.8, y - s * 0.35, s * 1.5, s * 0.7, 4, '#4A8A4A'); fillR(x + s * 0.7, y - s * 0.15, s * 0.2, s * 0.3, '#C8C8D0'); }
  else if (k === 'duck') { fillC(x, y + s * 0.2, s * 0.6, '#FFD24A'); fillC(x + s * 0.4, y - s * 0.4, s * 0.38, '#FFD24A'); fillR(x + s * 0.7, y - s * 0.45, s * 0.35, s * 0.18, '#FF9A3A'); }
  else if (k === 'handle') { fillC(x, y, s * 0.6, '#E84A4A'); fillR(x - s * 0.8, y - s * 0.15, s * 1.6, s * 0.3, '#FFFFFF'); }
  else if (k === 'remote' || k === 'remoteon') { fillRR(x - s * 0.35, y - s * 0.9, s * 0.7, s * 1.8, 5, '#3A3A48'); fillC(x, y - s * 0.55, s * 0.14, k === 'remoteon' ? '#FF5A5A' : '#6A6A7A'); for (let i = 0; i < 3; i++) fillC(x, y - s * 0.1 + i * s * 0.3, s * 0.1, '#C8C8D0'); }
  else if (k === 'lupe') { ctx.strokeStyle = '#6A7A9A'; ctx.lineWidth = s * 0.2; circ(x - s * 0.2, y - s * 0.2, s * 0.5); ctx.stroke(); fillC(x - s * 0.2, y - s * 0.2, s * 0.4, 'rgba(160,210,255,0.6)'); fillR(x + s * 0.15, y + s * 0.15, s * 0.7, s * 0.22, '#8A5A34'); }
  else if (k === 'neji') { fillC(x - s * 0.4, y, s * 0.35, '#C8A040'); fillC(x + s * 0.4, y, s * 0.35, '#C8A040'); fillR(x - s * 0.1, y - s * 0.1, s * 0.9, s * 0.2, '#C8A040'); }
  else if (ITEM[k] && /えのぐ/.test(ITEM[k].name)) { fillRR(x - s * 0.8, y - s * 0.35, s * 1.3, s * 0.7, 5, ITEM[k].col); fillR(x + s * 0.5, y - s * 0.2, s * 0.35, s * 0.4, '#C8C8D0'); }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#5A3A2A', '#2A1A12'); ctx.fillRect(0, 0, VW, VH);
  // ドアと りな
  const dx = VW - 150;
  fillRR(dx - 6, 300, 100, 190, 8, '#3A2418'); fillRR(dx, 306, 88, 180, 6, '#B8864E'); fillC(dx + 74, 400, 6, '#E8C040');
  drawKid('rina', dx - 60, 500, 120, { t, pose: 'stand', dir: 2 });
  textO('りなの へやから 脱出', VW / 2, 44, 42, '#FFE066', '#2A1A12');
  const cleared = ROOMS.filter((R, i) => sv.clear[i]).length;
  text('クリア ' + cleared + ' / ' + ROOMS.length + '　（へやが すすむと あたらしい しかけが ふえるよ）', VW / 2, 86, 15, '#FFE0B0', 'center', true, VW - 40);
  const cols = 5, bw = Math.min(170, (VW - 60) / cols - 10), bh = 92;
  const x0 = VW / 2 - (cols * (bw + 10) - 10) / 2;
  ROOMS.forEach((R, i) => {
    const open = i === 0 || sv.clear[i - 1];
    const bx = x0 + (i % cols) * (bw + 10), by = 108 + Math.floor(i / cols) * (bh + 12);
    const cont = sv.cur && sv.cur.room === i;
    btn(bx, by, bw, bh, (i + 1) + '. ' + R.name, () => { if (open) startRoom(i, false); }, { col: open ? (sv.clear[i] ? '#9AF0B8' : '#FFE066') : 'rgba(150,140,130,0.5)', off: !open, size: 17,
      sub: !open ? '🔒' : cont ? 'つづきから' : sv.clear[i] ? 'クリア！' : R.neu ? 'NEW！' : 'はじめる' });
  });
  // つぎに あそぶ へやの あたらしい しかけ
  const nx = ROOMS.findIndex((R, i) => !sv.clear[i]);
  if (nx >= 0 && ROOMS[nx].neu) {
    fillRR(x0, 326, Math.min(520, VW - 260), 40, 10, 'rgba(255,224,102,0.18)');
    text((nx + 1) + '. ' + ROOMS[nx].name + ' の あたらしい しかけ：' + ROOMS[nx].neu, x0 + 14, 346, 16, '#FFE066', 'left', true, Math.min(500, VW - 290));
  }
  const ci = sv.cur ? sv.cur.room : -1;
  if (ci >= 0 && ROOMS[ci]) btn(x0, 380, 260, 44, (ci + 1) + '. ' + ROOMS[ci].name + ' を さいしょから', () => startRoom(ci, true), { col: '#D8D0F0', size: 14 });
  if (cleared >= ROOMS.length) textO('ぜんぶ だっしゅつ できた！', VW / 2 - 60, 420, 30, '#9AF0B8', '#2A1A12');
}

function drawClear(t) {
  G.clearT += 1 / 60;
  ctx.fillStyle = grad(0, VH, '#9AD8FF', '#E8F8FF'); ctx.fillRect(0, 0, VW, VH);
  fillR(0, 380, VW, 160, '#8FCB6E');
  fillC(VW - 120, 90, 50, '#FFE066');
  for (let i = 0; i < 20; i++) { const a = G.clearT * 2 + i; fillC(VW / 2 + Math.cos(a) * (140 + i * 8), 200 + Math.sin(a * 1.3) * 80, 5, ['#FF6FA8', '#FFE066', '#7FE0F0'][i % 3]); }
  drawKid('rina', VW / 2, 460, 220, { t, pose: 'cheer' });
  textO('だっしゅつ せいこう！', VW / 2, 80, 48, '#FFFFFF', '#E86A00');
  text(ROOMS[G.room].name + ' から でられた！', VW / 2, 136, 22, '#2A2440', 'center');
  if (G.clearT > 1) {
    if (G.room < ROOMS.length - 1) {
      btn(VW / 2 + 140, 400, 220, 70, 'つぎの へやへ', () => startRoom(G.room + 1, false), { col: '#FFE066' });
      if (ROOMS[G.room + 1].neu) text('つぎは NEW：' + ROOMS[G.room + 1].neu, VW / 2 + 250, 486, 14, '#2A4A7A', 'center', true, 260);
    } else textO('ぜんぶの へやから だっしゅつ！', VW / 2, 180, 30, '#FFE066', '#E86A00');
    btn(VW / 2 - 360, 400, 200, 70, 'へやを えらぶ', () => { G.mode = 'title'; }, { col: '#D8E8FF' });
  }
}

startGame({
  bg: '#2A1A12',
  update(dt) {
    G.t += dt; if (G.msgT > 0) G.msgT -= dt;
    // オルゴール：0.7びょうずつ いろと おとを ならす
    const P = G.playSeq;
    if (P) {
      P.t += dt;
      const i = Math.floor(P.t / 0.7);
      if (i !== P.i) { P.i = i; if (i >= 0 && i < SEQ8.length) tone(BELL[SEQ8[i]][2], 0.4, 'triangle', 0.14); }
      if (i >= SEQ8.length) G.playSeq = null;
    }
  },
  draw(t) {
    if (G.mode === 'title') drawTitle(t);
    else if (G.mode === 'clear') drawClear(t);
    else drawRoom(t);
  },
  down(x, y) {
    if (G.mode !== 'room' || G.zoom) return;
    for (let i = HOT.length - 1; i >= 0; i--) { const h = HOT[i]; if (inBox(x, y, h)) { h.on(); return; } }
  },
});
