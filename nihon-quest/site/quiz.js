// 都道府県クイズ。問題づくりと、おぼえ具合の記録。
//
// ねらいは「何度も遊ぶうちに、場所・形・県庁所在地・名物が分かるようになる」こと。
// そのために
//   ・出題は 9 種類。同じ県でも聞きかたを変える
//   ・まちがえた県ほど出やすくする（おぼえるまで何度も出る）
//   ・正解しても不正解でも、かならず答えとまめちしきを見せる
//   ・記録はブラウザに残す（localStorage）ので、次に開いてもつづきから

'use strict';

const SAVE_KEY = 'nihon-quest.v1';

// 都道府県を id で引けるようにしておく
const PREF_BY_ID = {};
for (const p of PREFS) PREF_BY_ID[p.id] = p;

// 名物 → その名物を持つ都道府県。
// 「みかん」のように複数の県に出てくるものは、答えが 1 つに決まらないので
// 「この名物はどこ？」の問題には使わない。
const FAMOUS_INDEX = {};
for (const p of PREFS) {
  for (const f of p.famous) (FAMOUS_INDEX[f] || (FAMOUS_INDEX[f] = [])).push(p.id);
}
const UNIQUE_FAMOUS = [];
for (const f in FAMOUS_INDEX) {
  if (FAMOUS_INDEX[f].length === 1) UNIQUE_FAMOUS.push(f);
}

// ---------------------------------------------------------------- 記録

const save = {
  pref: {},      // id -> {c: 正解数, w: まちがい数}
  coins: 0,      // ぜんぶで集めたコイン
  best: 0,       // 最高スコア
  journeys: 0,   // 旅を終えた回数
  quizC: 0, quizW: 0,
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      Object.assign(save, o);
      if (!save.pref || typeof save.pref !== 'object') save.pref = {};
    }
  } catch (e) {
    // 記録が壊れていても遊べなくはしない
  }
}

function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function prefStat(id) {
  return save.pref[id] || (save.pref[id] = { c: 0, w: 0 });
}

// 0(まだ) 〜 3(ばっちり)。スタンプ帳の色分けに使う
function masteryLevel(id) {
  const s = save.pref[id];
  if (!s || s.c + s.w === 0) return 0;
  if (s.c >= 6 && s.c > s.w * 2) return 3;
  if (s.c >= 3) return 2;
  return 1;
}

function masteryTotal() {
  let n = 0;
  for (const p of PREFS) if (masteryLevel(p.id) >= 2) n++;
  return n;
}

// ---------------------------------------------------------------- 乱数

// 種から作る乱数。同じ種なら同じステージができる
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rnd, arr) { return arr[(rnd() * arr.length) | 0]; }

function shuffle(rnd, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ---------------------------------------------------------------- 出題する県えらび

// まちがえた県・まだ出ていない県ほど重くする。
// これで「苦手なところが何度も出る」＝おぼえられる。
function weightOf(id) {
  const s = save.pref[id];
  if (!s || s.c + s.w === 0) return 6;
  return Math.max(1, 10 - s.c * 2 + s.w * 3);
}

function chooseTarget(rnd, region, used) {
  let pool = PREFS.filter(p => (!region || p.region === region)
                            && !used.has(p.id));
  if (!pool.length) pool = PREFS.filter(p => !region || p.region === region);
  let total = 0;
  const ws = pool.map(p => { const w = weightOf(p.id); total += w; return w; });
  let r = rnd() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// まちがいの選択肢。やさしいうちは遠くの地方から、
// おぼえてきたら同じ地方から選んで、少しずつ難しくする。
function distractors(rnd, target, n, sameRegionBias) {
  const far = PREFS.filter(p => p.id !== target.id && p.region !== target.region);
  const near = PREFS.filter(p => p.id !== target.id && p.region === target.region);
  const out = [];
  const wantNear = Math.min(near.length, sameRegionBias);
  for (const p of shuffle(rnd, near).slice(0, wantNear)) out.push(p);
  for (const p of shuffle(rnd, far)) {
    if (out.length >= n) break;
    out.push(p);
  }
  return shuffle(rnd, out).slice(0, n);
}

// ---------------------------------------------------------------- 問題づくり

// media
//   null                     絵なし
//   {type:'shape', id}       その県の形を大きく出す
//   {type:'map', hi:[id]}    日本地図。その県を赤くする
//   {type:'map', marks:[id]} 日本地図。4 県に①〜④の色を付ける
// choiceKind
//   'text'    文字の選択肢
//   'shape'   形の選択肢（ids に県 id）
//   'mark'    ①〜④（色つき）

const QUIZ_KINDS = [
  'shape2name', 'name2shape', 'place2name', 'name2place',
  'pref2cap', 'cap2pref', 'famous2pref', 'pref2famous', 'region',
];

// 覚えはじめは「場所」と「名物」から。慣れてきたら形や県庁所在地も混ぜる。
function kindsFor(level) {
  if (level < 6) return ['place2name', 'name2place', 'famous2pref', 'pref2famous', 'shape2name'];
  if (level < 16) return QUIZ_KINDS.filter(k => k !== 'cap2pref');
  return QUIZ_KINDS;
}

function makeQuestion(rnd, region, used) {
  const level = masteryTotal();
  const bias = level < 8 ? 0 : level < 20 ? 1 : 2;   // 同じ地方から混ぜる数
  let kind = pick(rnd, kindsFor(level));
  let target = chooseTarget(rnd, region, used);

  // 「この名物はどこ？」は、答えが 1 つに決まる名物がないと出せない
  if (kind === 'famous2pref' && !target.famous.some(f => UNIQUE_FAMOUS.includes(f))) {
    kind = 'pref2famous';
  }

  const q = { kind, target, media: null, choiceKind: 'text',
              prompt: '', sub: '', choices: [], answer: 0 };

  const others = distractors(rnd, target, 3, bias);

  if (kind === 'shape2name') {
    q.prompt = 'このかたちは どこ？';
    q.media = { type: 'shape', id: target.id };
    q.choices = [target, ...others].map(p => p.name);
    q.answer = 0;

  } else if (kind === 'name2shape') {
    q.prompt = target.name + ' のかたちは どれ？';
    q.choiceKind = 'shape';
    q.choices = [target.id, ...others.map(p => p.id)];
    q.answer = 0;

  } else if (kind === 'place2name') {
    q.prompt = '赤いところは どこ？';
    q.media = { type: 'map', hi: [target.id] };
    q.choices = [target, ...others].map(p => p.name);
    q.answer = 0;

  } else if (kind === 'name2place') {
    q.prompt = target.name + ' は どれ？';
    q.choiceKind = 'mark';
    const marks = shuffle(rnd, [target.id, ...others.map(p => p.id)]);
    q.media = { type: 'map', marks };
    q.choices = ['1', '2', '3', '4'];
    q.answer = marks.indexOf(target.id);
    q.noShuffle = true;

  } else if (kind === 'pref2cap') {
    q.prompt = target.name + ' の 県庁所在地は？';
    q.sub = '県庁所在地＝その都道府県のまんなかになる市';
    q.choices = [target, ...others].map(p => p.cap + '市');
    q.answer = 0;

  } else if (kind === 'cap2pref') {
    q.prompt = target.cap + '市 があるのは どこ？';
    q.choices = [target, ...others].map(p => p.name);
    q.answer = 0;

  } else if (kind === 'famous2pref') {
    const f = pick(rnd, target.famous.filter(x => UNIQUE_FAMOUS.includes(x)));
    q.prompt = '「' + f + '」で ゆうめいなのは？';
    q.choices = [target, ...others].map(p => p.name);
    q.answer = 0;

  } else if (kind === 'pref2famous') {
    q.prompt = target.name + ' で ゆうめいなのは？';
    // まちがいの選択肢が、じつは正解の県の名物でもあった…を防ぐ
    const banned = new Set(target.famous);
    const bad = [];
    for (const p of shuffle(rnd, PREFS)) {
      if (p.id === target.id) continue;
      for (const f of p.famous) {
        if (!banned.has(f) && !bad.includes(f)) { bad.push(f); break; }
      }
      if (bad.length >= 3) break;
    }
    q.choices = [pick(rnd, target.famous), ...bad];
    q.answer = 0;

  } else { // region
    q.prompt = target.name + ' は どの地方？';
    const regs = shuffle(rnd, REGIONS.filter(r => r !== target.region)).slice(0, 3);
    q.choices = [target.region, ...regs];
    q.answer = 0;
  }

  if (!q.noShuffle) {
    const order = shuffle(rnd, [0, 1, 2, 3]);
    const cs = order.map(i => q.choices[i]);
    q.answer = order.indexOf(q.answer);
    q.choices = cs;
  }
  return q;
}

// 答え合わせのあとに出す一言
function answerNote(q) {
  const t = q.target;
  switch (q.kind) {
    case 'pref2cap':
    case 'cap2pref':
      return t.name + ' の県庁所在地は ' + t.cap + '市';
    case 'famous2pref':
    case 'pref2famous':
      return t.name + ' は ' + t.famous.slice(0, 3).join('・') + ' がゆうめい';
    case 'region':
      return t.name + ' は ' + t.region + '地方';
    default:
      return t.name + '（' + t.kana + '）／県庁所在地は ' + t.cap + '市';
  }
}

function recordAnswer(id, ok) {
  const s = prefStat(id);
  if (ok) { s.c++; save.quizC++; } else { s.w++; save.quizW++; }
  storeSave();
}
