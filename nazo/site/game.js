// りなの へやから 脱出。
// 「脱出ゲーム」：へやの 4つの かべを 見てまわり、どうぐを みつけて なぞを といて とびらを あける。
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
};
const ROOMS = [
  { name: 'りなの へや', wall: '#FFE6EE', floor: '#D8B08A' },
  { name: 'キッチン', wall: '#E8F4E0', floor: '#C8C0B0' },
  { name: 'にわの ものおき', wall: '#E8DCC8', floor: '#8A7050' },
];

const sv = Object.assign({ clear: {}, cur: null }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', room: 0, view: 0, f: {}, items: [], sel: null, msg: '', msgT: 0, zoom: null, hintN: 0, clearT: 0, t: 0 };

function startRoom(i, fresh) {
  G.mode = 'room'; G.room = i; G.view = 0; G.sel = null; G.zoom = null; G.hintN = 0; G.clearT = 0;
  if (!fresh && sv.cur && sv.cur.room === i) { G.f = sv.cur.f; G.items = sv.cur.items; }
  else { G.f = {}; G.items = []; }
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

// --- ズーム（かぎ） ------------------------------------------------------------------

function drawZoom(t) {
  const z = G.zoom;
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.6)');
  const w = 440, x = VW / 2 - w / 2, y = 70;
  fillRR(x, y, w, 360, 20, '#2A2A38');
  btn(x + w - 70, y + 10, 60, 44, '×', () => { G.zoom = null; }, { col: '#FFB0B0', size: 22 });
  if (z.kind === 'lock') {
    text('ばんごうを あわせよう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    z.d.forEach((d, i) => {
      const bx = VW / 2 - z.n * 55 + i * 110 + 10;
      btn(bx, y + 80, 90, 50, '▲' + (i + 1), () => { z.d[i] = (d + 1) % 10; tone(800, 0.03, 'square', 0.05); }, { col: '#D8D8E8', size: 18 });
      fillRR(bx, y + 140, 90, 80, 10, '#F4F4F0'); text(z.d[i], bx + 45, y + 180, 48, '#2A2440', 'center');
      btn(bx, y + 230, 90, 50, '▼' + (i + 1), () => { z.d[i] = (d + 9) % 10; tone(700, 0.03, 'square', 0.05); }, { col: '#D8D8E8', size: 18 });
    });
  } else {
    text('いろの ボタンを そろえよう', VW / 2, y + 40, 20, '#FFFFFF', 'center');
    z.d.forEach((d, i) => {
      const bx = VW / 2 - 200 + i * 100 + 10;
      btn(bx, y + 100, 80, 120, '', () => { z.d[i] = (d + 1) % COLS.length; tone(600 + i * 100, 0.04, 'square', 0.05); }, { col: COLS[d][1] });
      text(COLS[d][0], bx + 40, y + 240, 16, '#FFFFFF', 'center');
    });
  }
  btn(VW / 2 - 90, y + 290, 180, 56, 'これで あける', () => {
    const ok = z.d.every((d, i) => d === z.ans[i]);
    if (!ok) { say('ちがう みたい……'); tone(200, 0.25, 'square', 0.08); return; }
    G.zoom = null;
    if (z.kind === 'color') { G.f.fridge = 1; say('れいぞうこが あいた！'); }
    else { G.f.open = 1; say('カチャ！ あいた！ ドアを タップして そとへ'); }
    keep();
    jingle([72, 79, 84], 0.1, 'square', 0.12);
  }, { col: '#9AF0B8' });
  void t;
}

// --- がめん ---------------------------------------------------------------------------

function drawRoom(t) {
  HOT = [];
  wallBase(t);
  [room0, room1, room2][G.room](G.view, t);
  // したの もちもの
  fillR(0, 470, VW, 70, '#2A2030');
  const n = Math.max(6, G.items.length);
  const sw = Math.min(74, (VW - 290) / n);
  G.items.forEach((k, i) => {
    const x = 16 + i * (sw + 6);
    btn(x, 478, sw, 56, '', () => {
      if (G.sel === 'battery' && k === 'light') { take('battery'); take('light'); give('lighton', 'でんちを いれた！ でんとうが ひかった！'); G.sel = 'lighton'; return; }
      G.sel = G.sel === k ? null : k;
      if (k === 'memo' && G.sel) say('メモ：「ねこ → いぬ → うさぎ の かず が ばんごう」', 4);
      else if (k === 'memo2' && G.sel) say('メモ：「れいぞうこの いろは カレンダーの くだものの じゅん」', 4);
      else if (G.sel) say(ITEM[k].name + 'を えらんだ。 つかう ところを タップ');
    }, { col: G.sel === k ? '#FFE066' : '#F4F0FF' });
    drawItem(k, x + sw / 2, 506, sw * 0.4);
  });
  // ヒント・ボタン
  btn(VW - 262, 478, 120, 56, 'ヒント', () => {
    const H = [HINT0, HINT1, HINT2][G.room];
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
function drawItem(k, x, y, s) {
  if (k === 'key' || k === 'doorkey') { fillC(x - s * 0.5, y, s * 0.45, ITEM[k].col); fillR(x - s * 0.2, y - s * 0.12, s * 1.1, s * 0.24, ITEM[k].col); fillR(x + s * 0.6, y, s * 0.14, s * 0.3, ITEM[k].col); fillC(x - s * 0.5, y, s * 0.18, '#2A2030'); }
  else if (k === 'memo' || k === 'memo2') { fillRR(x - s * 0.6, y - s * 0.8, s * 1.2, s * 1.6, 3, '#FFFFFF'); for (let i = 0; i < 4; i++) fillR(x - s * 0.4, y - s * 0.5 + i * s * 0.35, s * 0.8, 2, '#9A9AAA'); }
  else if (k === 'driver') { fillRR(x - s, y - s * 0.2, s * 0.9, s * 0.4, 4, '#E04A4A'); fillR(x - s * 0.1, y - s * 0.07, s, s * 0.14, '#A8A8B8'); }
  else if (k === 'light' || k === 'lighton') { if (k === 'lighton') fillC(x + s, y, s * 0.6, 'rgba(255,230,120,0.7)'); fillRR(x - s, y - s * 0.3, s * 1.4, s * 0.6, 6, '#6A7A9A'); fillRR(x + s * 0.3, y - s * 0.45, s * 0.5, s * 0.9, 4, '#8A9AB8'); }
  else if (k === 'battery') { fillRR(x - s * 0.8, y - s * 0.35, s * 1.5, s * 0.7, 4, '#4A8A4A'); fillR(x + s * 0.7, y - s * 0.15, s * 0.2, s * 0.3, '#C8C8D0'); }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#5A3A2A', '#2A1A12'); ctx.fillRect(0, 0, VW, VH);
  // ドアの え
  const dx = VW / 2 - 60;
  fillRR(dx - 8, 90, 136, 250, 8, '#3A2418'); fillRR(dx, 98, 120, 240, 6, '#B8864E');
  const g = ctx.createLinearGradient(dx, 0, dx + 120, 0); g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(1, 'rgba(255,240,180,0.3)');
  fillC(dx + 100, 220, 7, '#E8C040');
  drawKid('rina', dx - 90, 350, 150, { t, pose: 'stand', dir: 2 });
  textO('りなの へやから 脱出', VW / 2, 50, 44, '#FFE066', '#2A1A12');
  const cleared = Object.keys(sv.clear).length;
  ROOMS.forEach((R, i) => {
    const open = i === 0 || sv.clear[i - 1];
    const bx = VW / 2 - 330 + i * 225;
    const cont = sv.cur && sv.cur.room === i;
    btn(bx, 380, 210, 100, (i + 1) + '. ' + R.name, () => { if (open) startRoom(i, false); }, { col: open ? (sv.clear[i] ? '#9AF0B8' : '#FFE066') : 'rgba(150,140,130,0.5)', off: !open, size: 20, sub: !open ? '🔒 まえの へやを クリア' : cont ? 'つづきから' : sv.clear[i] ? 'クリア！' : 'はじめる' });
    if (cont) btn(bx + 50, 486, 110, 34, 'さいしょから', () => startRoom(i, true), { col: '#D8D0F0', size: 13 });
  });
  if (cleared >= 3) textO('ぜんぶ だっしゅつ できた！', VW / 2, 360, 24, '#9AF0B8', '#2A1A12');
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
    if (G.room < 2) btn(VW / 2 + 140, 400, 220, 70, 'つぎの へやへ', () => startRoom(G.room + 1, false), { col: '#FFE066' });
    btn(VW / 2 - 360, 400, 200, 70, 'へやを えらぶ', () => { G.mode = 'title'; }, { col: '#D8E8FF' });
  }
}

startGame({
  bg: '#2A1A12',
  update(dt) { G.t += dt; if (G.msgT > 0) G.msgT -= dt; },
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
