// エイトくんの チャンピオンロード
//
// ★ 1980年代の「パンチアウト」もの。ボタンを れんだ しても ぜったいに 勝てない。
//   あいての **あいず（テル）を 見てから よける** → そこで できた
//   すきに なぐる。この くりかえしだけの ゲーム。
//
// ★ よけかたは 4しゅるい あって、こうげきごとに 正かいが ちがう。
//   ・左フック  … 右へ よける（しゃがみでも かわせる）
//   ・右フック  … 左へ よける（しゃがみでも かわせる）
//   ・アッパー  … ガード（上）。**しゃがむと 大ダメージ**（わな）
//   ・ボディ    … 左か 右へ よける。**ガードは きかない**（わな）
//
// ★ すきが ない ときに なぐると あいてに ガードされ、
//   そのまま カウンターが 飛んで くる。これが れんだ よけの しくみ。
//
// ★ ぴったり よけると ☆が たまる。☆で「ひっさつ」が 出せる。
//
// 絵は ぜんぶ canvas、音は ぜんぶ WebAudio（画像・音の ファイルは 使わない）。

'use strict';

const GAME_VER = 1;
const HUD = 30;

// --- 数字（ここを いじれば つよさが かわる） ------------------------------------
const ME_HP = 100;
const ME_DOWNS = 3;              // 3回 たおれたら まけ
const GETUP_HP = 0.55;           // 立ちあがった ときの たいりょく

const PUNCH_CD = 0.26;           // パンチの 間かく
const PUNCH_DMG = 3;             // すきが ない ときの パンチ（ガードされる）
const OPEN_MUL = 3;              // すきの ときの ばいりつ
const COUNTER_MUL = 4;           // すきに なった すぐ あと（カウンター）
const COUNTER_W = 0.35;
const SPECIAL_DMG = 22;          // ☆ ひっさつ

const DODGE_T = 0.32;            // よけて いる 時間
const DODGE_CD = 0.08;
// ★ よけが 早すぎて 当たる のを ふせぐ「のこり時間」。
//   ロボットに あそばせたら、あいずを 見た しゅんかんに よけた せいで
//   よけ終わった あとに パンチが 来て、1めんですら 1回も かわせなかった。
//   よけてから この 時間の うちなら「ぎりぎり かわした」あつかいに する。
//   ただし ☆は もらえず、すきも みじかい（ちゃんと 見て よけた ほうが とく）。
const DODGE_MEM = 0.55;
// ★ ガードを にぎりっぱなしに して れんだ するだけで 勝てる 面が あった。
//   ボクシングと おなじで、**かまえっぱなしの ガードは くずれる**。
//   この 時間を こえると まもりが 弱く なり、アッパーには 通用しなく なる。
const GUARD_MAX = 1.5;
// ★ ひるみが 長いと れんぞく こうげきで「ひるみ→また 当たる」の
//   むげんループに なる（ロボットで 6〜8めんが 0勝だった）。みじかくする。
const HURT_T = 0.26;             // なぐられて ひるむ 時間
const DOWN_T = 2.6;              // たおれて いる 時間
const ROUND_T = 99;              // もち時間（びょう）

// --- あいて 8にん ------------------------------------------------------------------
//
// tell … あいずを 出して いる 時間。★ 0.3びょうより みじかいと
//        「見てから」では ぜったいに 間に あわない（ロボットで たしかめた）。
//        いちばん 強い あいてでも 0.45びょう は 見せる。
// seq  … こうげきの じゅんばん。★ パンチアウトと おなじで、あいてごとに
//        きまった ながれが ある。おぼえれば さきよみ できる。
//        ときどき（25%）とばして くるので まる おぼえだけでは 勝てない。
// rest … つぎの こうげきまでの 休み
// open … よけた あとの すきの ながさ
// combo… つづけて 何ぱつ 出して くるか
// pun  … こちらの パンチを ガードした あと、やり返して くる かくりつ

const FOES = [
  { name: 'たまごマン', hp: 100, downs: 2, tell: 0.78, rest: [1.10, 1.70], open: 1.15,
    combo: 1, pun: 0.16, dmg: 7, seq: 'LRLRB',
    skin: '#F6D8B0', suit: '#E8608A', hair: '#C89050', style: 'egg' },
  { name: 'ぐるぐるパンダ', hp: 120, downs: 2, tell: 0.70, rest: [1.00, 1.55], open: 1.05,
    combo: 1, pun: 0.22, dmg: 8, seq: 'LLRUR',
    skin: '#F4F4F8', suit: '#3A3A48', hair: '#2A2A34', style: 'panda' },
  { name: 'でんきロボ', hp: 135, downs: 2, tell: 0.64, rest: [0.92, 1.42], open: 0.98,
    combo: 2, pun: 0.28, dmg: 9, seq: 'LRUBLR',
    skin: '#B8C8D8', suit: '#4A8AC8', hair: '#8A9AB0', style: 'robo' },
  { name: 'かぜのにんじゃ', hp: 150, downs: 2, tell: 0.58, rest: [0.86, 1.30], open: 0.90,
    combo: 2, pun: 0.32, dmg: 10, seq: 'LBRULRB',
    skin: '#F0CFA8', suit: '#3E5A8A', hair: '#22222E', style: 'ninja' },
  { name: 'ドクター・ゲンコツ', hp: 165, downs: 3, tell: 0.54, rest: [0.80, 1.22], open: 0.84,
    combo: 2, pun: 0.36, dmg: 13, seq: 'UBLRUL',
    skin: '#F0C8A0', suit: '#E8E8F0', hair: '#D8D8E0', style: 'doc' },
  { name: 'かいぞくキング', hp: 180, downs: 3, tell: 0.50, rest: [0.76, 1.14], open: 0.78,
    combo: 3, pun: 0.40, dmg: 15, seq: 'LRBULRU',
    skin: '#D8A878', suit: '#8A3A5A', hair: '#3A2A22', style: 'pirate' },
  { name: 'こおりのじょおう', hp: 195, downs: 3, tell: 0.47, rest: [0.72, 1.08], open: 0.72,
    combo: 3, pun: 0.44, dmg: 17, seq: 'ULBRULRB',
    skin: '#EAF0FF', suit: '#5AC8E8', hair: '#A8E0F0', style: 'ice' },
  { name: 'マスクのおうじゃ', hp: 215, downs: 3, tell: 0.45, rest: [0.68, 1.00], open: 0.66,
    combo: 3, pun: 0.48, dmg: 19, seq: 'LRULBRUB',
    skin: '#C8A8F0', suit: '#FFD24A', hair: '#2A1E3A', style: 'mask' },
];

const ATK_NAME = { L: '左フック', R: '右フック', U: 'アッパー', B: 'ボディ' };
const ATK_HINT = { L: '→ に よける！', R: '← に よける！', U: '↑ ガード！', B: '← か → に よける！' };
const ATK_COL = { L: '#FF8A5A', R: '#FF8A5A', U: '#C8A8F0', B: '#8AE0A0' };

// --- セーブ ---------------------------------------------------------------------------
const SAVE_KEY = 'punch.save.v1';
const save = { clear: {}, best: {}, plays: 0, ko: 0, hint: 1 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.ko)) save.ko = s.ko;
  if (Number.isFinite(s.hint)) save.hint = s.hint;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- 音 --------------------------------------------------------------------------------
function sfxSwing() { if (A.ctx) nz(anow(), 0.10, 0.05, 400, 2600); }
function sfxHit() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.09, 0.20, 120, 1800);
  tone(t, 40, 0.10, 0.11, 'triangle', null, 28);
}
function sfxBig() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.16, 0.26, 90, 2200);
  tone(t, 38, 0.20, 0.16, 'triangle', null, 22);
  kick(t, 0.8);
}
function sfxBlock() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.05, 0.10, 2000, 7000);
  tone(t, 66, 0.05, 0.06, 'square', null, 60);
}
function sfxDodge() { if (A.ctx) nz(anow(), 0.13, 0.045, 900, 4200); }
function sfxStar() { if (A.ctx) bleep(anow(), [84, 91, 96], 0.045, 0.09, 0.12); }
function sfxSpecial() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [60, 67, 72, 79, 84], 0.05, 0.12, 0.13);
  nz(t + 0.24, 0.22, 0.28, 80, 2400);
  kick(t + 0.24, 0.9);
}
function sfxDown() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 64, 55, 48], 0.10, 0.18, 0.13);
  nz(t + 0.36, 0.40, 0.14, 90, 1000);
}
function sfxBell() {
  if (!A.ctx) return;
  const t = anow();
  for (let i = 0; i < 3; i++) tone(t + i * 0.26, 88, 0.24, 0.10, 'triangle');
}
function sfxWin() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14);
  kick(t, 0.7); kick(t + 0.42, 0.7);
}
// ★ あいずの 音。こうげきごとに 高さが ちがうので、耳でも おぼえられる。
const TELL_N = { L: 74, R: 79, U: 86, B: 64 };
function sfxTell(kind) { if (A.ctx) tone(anow(), TELL_N[kind] || 72, 0.09, 0.075, 'square'); }

// --- ゲームの なかみ ------------------------------------------------------------------
const G = {
  screen: 'title', t: 0,
  si: 0, st: null,
  me: null, foe: null,
  pops: [], parts: [],
  time: ROUND_T, shake: 0, flash: 0, hitStop: 0,
  over: false, win: false, endWhy: '',
  msg: '', msgT: 0,
  fx: null,                      // いま 何が おきたか（当たった／よけた／ガード…）
  meFlash: 0, foeFlash: 0,       // ゲージを 光らせる
};

// ★ 「当たったのか、ふせげたのか わからん」と 言われた ので、
//   おきた こと ごとに **色・かたち・ことば**を そろえて 大きく 出す。
//   いろ … みどり=うまく いった / きいろ=こちらの こうげきが 当たった
//          はいいろ=ふせがれた / あか=やられた
const FX = {
  hit:      { col: '#FFD24A', ring: '#FFF0A8', text: 'ヒット！',      icon: 'burst', side: 'foe' },
  counter:  { col: '#FF9A3A', ring: '#FFD24A', text: 'カウンター！',  icon: 'burst', side: 'foe' },
  special:  { col: '#FF6FA8', ring: '#FFD24A', text: 'ひっさつ！',    icon: 'burst', side: 'foe' },
  blocked:  { col: '#B0BCD8', ring: '#8A96B4', text: 'ガードされた',  icon: 'shield', side: 'foe' },
  whiff:    { col: '#8A96B4', ring: '#6A7690', text: 'から ぶり',     icon: 'swish', side: 'foe' },
  evade:    { col: '#8AE0A0', ring: '#CFFFD8', text: 'よけた！',      icon: 'ring', side: 'me' },
  perfect:  { col: '#FFD24A', ring: '#FFF6C8', text: '☆ ぴったり！',  icon: 'star', side: 'me' },
  late:     { col: '#CFE8A0', ring: '#E8FFC8', text: 'ぎりぎり！',    icon: 'ring', side: 'me' },
  guard:    { col: '#5AD8F0', ring: '#CFF4FF', text: 'ガード せいこう', icon: 'shield', side: 'me' },
  taken:    { col: '#FF6A8A', ring: '#FFC8D4', text: 'やられた！',    icon: 'crack', side: 'me' },
  trap:     { col: '#FF4A6A', ring: '#FFB0C0', text: 'よけかたが ちがう！', icon: 'crack', side: 'me' },
  broken:   { col: '#FF8A4A', ring: '#FFD0A8', text: 'ガードが くずれた！', icon: 'crack', side: 'me' },
};

function fx(kind, sub) {
  G.fx = { kind: kind, t: 0, sub: sub || '' };
}

function newMe() {
  return {
    hp: ME_HP, hpMax: ME_HP, downs: 0, stars: 0,
    st: 'idle', stT: 0, dodge: '', cd: 0, glove: 0,
    punchT: 0, punchArm: 0, upT: 0, prevDir: '',
    lastDodge: '', lastDodgeAt: -9, guardT: 0,
  };
}

function newFoe(st) {
  return {
    hp: st.hp, hpMax: st.hp, downs: 0,
    st: 'rest', stT: rndR(st.rest), kind: '', tellT: 0,
    open: 0, openAt: 0, blockT: 0, hurtT: 0, rage: 1, seqI: 0,
    left: 0, right: 0, lean: 0, combo: 0, comboLeft: 0,
  };
}

function rndR(r) { return r[0] + Math.random() * (r[1] - r[0]); }

function startMatch(i) {
  audioStart();
  G.si = i;
  G.st = FOES[i];
  G.me = newMe();
  G.foe = newFoe(G.st);
  G.pops.length = 0; G.parts.length = 0;
  G.time = ROUND_T; G.shake = 0; G.flash = 0; G.hitStop = 0;
  G.fx = null; G.meFlash = 0; G.foeFlash = 0;
  G.over = false; G.win = false; G.endWhy = '';
  G.msg = G.st.name + ' と しょうぶ！'; G.msgT = 1.8;
  save.plays++; storeSave();
  G.screen = 'play';
  sfxBell();
}

function pop(text, col, x, y) {
  G.pops.push({ text, col, x: x === undefined ? VW / 2 : x, y: y === undefined ? VH * 0.34 : y, t: 0 });
}
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 190;
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, col, t: 0 });
  }
}

// --- あいての こうげき ------------------------------------------------------------
function foeAttack(quick) {
  const f = G.foe, st = G.st;
  if (Math.random() < 0.25) f.seqI = Math.floor(Math.random() * st.seq.length);
  f.kind = st.seq[f.seqI % st.seq.length];
  f.seqI = (f.seqI + 1) % st.seq.length;
  f.st = 'tell';
  // ★ みじかすぎると 目で 見てから 反しゃ できない。とくに れんぞく こうげきの
  //   2はつめ 3はつめは ひるみから もどった ばかりなので、下じきを 少し 長く する。
  f.tellT = Math.max(quick ? 0.46 : 0.44, st.tell * f.rage * (quick ? 0.78 : 1));
  f.stT = f.tellT;
  if (!quick) f.comboLeft = 1 + Math.floor(Math.random() * st.combo);
  sfxTell(f.kind);
}

// よけかたの 正かい表。ev=かわせた star=☆がもらえる mul=くらう ばいりつ
// gb = ガードが くずれて いる（ながく にぎりすぎ）
function judgeDefense(kind, st, dir, gb) {
  if (kind === 'L' || kind === 'R') {
    const want = kind === 'L' ? 'r' : 'l';
    if (st === 'dodge') {
      if (dir === want) return { ev: 1, star: 1, mul: 0 };
      return { ev: 0, star: 0, mul: 1.15 };        // ★ 逆に よけると もろに くらう
    }
    if (st === 'duck') return { ev: 1, star: 0, mul: 0 };
    if (st === 'guard') return { ev: 0, star: 0, mul: gb ? 0.9 : 0.35 };
    return { ev: 0, star: 0, mul: 1 };
  }
  if (kind === 'U') {
    // ★ くずれた ガードは アッパーで こじあけられる
    if (st === 'guard') return gb ? { ev: 0, star: 0, mul: 1.1, brk: 1 } : { ev: 1, star: 1, mul: 0 };
    if (st === 'duck') return { ev: 0, star: 0, mul: 1.6 };   // ★ わな。あごに 当たる
    if (st === 'dodge') return { ev: 0, star: 0, mul: 0.9 };
    return { ev: 0, star: 0, mul: 1.2 };
  }
  // B ボディ
  if (st === 'dodge') return { ev: 1, star: 1, mul: 0 };
  if (st === 'guard') return { ev: 0, star: 0, mul: 1.0 };    // ★ ガードは おなかを まもれない
  if (st === 'duck') return { ev: 0, star: 0, mul: 0.5 };
  return { ev: 0, star: 0, mul: 1 };
}

function foeStrike() {
  const f = G.foe, m = G.me, st = G.st;
  // いま よけて いなくても、ついさっき よけて いたら ぎりぎり かわせる
  let dst = m.st, ddir = m.dodge, late = false;
  if ((dst === 'idle' || dst === 'punch') && G.t - m.lastDodgeAt < DODGE_MEM) {
    dst = 'dodge'; ddir = m.lastDodge; late = true;
  }
  const gb = m.guardT > GUARD_MAX;
  const r = judgeDefense(f.kind, dst, ddir, gb);
  if (r.ev) {
    f.st = 'open'; f.stT = st.open * f.rage * (late ? 0.7 : 1);
    f.open = f.stT; f.openAt = G.t;
    if (r.star && !late && m.stars < 3) { m.stars++; sfxStar(); fx('perfect'); }
    else fx(late ? 'late' : 'evade');
    sfxDodge();
    G.flash = Math.max(G.flash, 0.12);
  } else {
    const d = st.dmg * r.mul;
    // ガードで けずられた だけ なら「ふせげた」と はっきり 見せる
    if (dst === 'guard' && r.mul <= 0.4) fx('guard', '- ' + Math.round(d));
    else if (r.brk || (dst === 'guard' && gb)) fx('broken', '- ' + Math.round(d));
    else if (r.mul > 1.05) fx('trap', '- ' + Math.round(d));
    else fx('taken', '- ' + Math.round(d));
    hurtMe(d);
  }
}

function hurtMe(d) {
  const m = G.me;
  // ★ たおれて いる あいだも なぐられ つづけて いた。
  //   1回 ダウンすると そのまま ダウンが 3に なって 立ちあがれず、
  //   すぐ まけて しまう バグだった。たおれて いる 人は なぐらない。
  if (m.st === 'down' || G.over) return;
  m.hp -= d;
  G.meFlash = 0.5;
  m.stars = 0;                        // ★ もらうと ☆は 消える
  m.st = 'hurt'; m.stT = HURT_T;
  G.shake = Math.max(G.shake, 8 + d * 0.5);
  G.hitStop = 0.06;
  sfxHit();
  burst(VW / 2, VH * 0.68, '#FF8AA8', 10);
  pop('- ' + Math.round(d), '#FF8AA8', VW / 2, VH * 0.52);
  if (m.hp <= 0) {
    m.hp = 0; m.downs++;
    m.st = 'down'; m.stT = DOWN_T;
    const f = G.foe;
    f.st = 'rest'; f.stT = DOWN_T + 0.9; f.comboLeft = 0;
    sfxDown();
    if (m.downs >= ME_DOWNS) endMatch(false, 'ダウン ' + ME_DOWNS + 'かい で まけ');
  }
}

function hurtFoe(d, big) {
  const f = G.foe, st = G.st;
  f.hp -= d;
  G.foeFlash = 0.5;
  f.hurtT = big ? 0.34 : 0.18;
  f.lean = big ? 1 : 0.5;
  G.shake = Math.max(G.shake, big ? 11 : 5);
  G.hitStop = big ? 0.07 : 0.04;
  if (big) sfxBig(); else sfxHit();
  burst(VW / 2, VH * 0.44, '#FFE08A', big ? 16 : 8);
  pop('- ' + Math.round(d), big ? '#FFD24A' : '#FFF0C0', VW / 2, VH * 0.30);
  if (f.hp <= 0) {
    f.hp = 0; f.downs++;
    f.st = 'down'; f.stT = DOWN_T;
    sfxDown();
    save.ko++; storeSave();
    if (f.downs >= st.downs) endMatch(true, 'ノックアウト！');
    else pop('ダウン！ あと ' + (st.downs - f.downs) + 'かい', '#FFD24A');
  }
}

function endMatch(win, why) {
  if (G.over) return;
  G.over = true; G.win = win; G.endWhy = why;
  if (win) {
    sfxWin();
    save.clear['s' + G.si] = 1;
    const left = Math.round(G.time);
    if (!save.best['s' + G.si] || save.best['s' + G.si] < left) save.best['s' + G.si] = left;
  }
  storeSave();
}

// --- こちらの こうげき ------------------------------------------------------------
function tryPunch() {
  const m = G.me, f = G.foe;
  if (G.over || m.cd > 0) return;
  if (m.st === 'hurt' || m.st === 'down') return;
  if (f.st === 'down') return;
  m.cd = PUNCH_CD;
  m.glove = 1 - m.glove;
  m.punchT = 0.20; m.punchArm = m.glove;
  if (m.st === 'idle' || m.st === 'guard') { m.st = 'punch'; m.stT = 0.20; }

  if (f.st === 'open') {
    const counter = G.t - f.openAt < COUNTER_W;
    const d = PUNCH_DMG * (counter ? COUNTER_MUL : OPEN_MUL);
    fx(counter ? 'counter' : 'hit', '- ' + Math.round(d));
    hurtFoe(d, counter);
    return;
  }
  if (f.st === 'tell' || f.st === 'strike') {
    // あいずの さいちゅうに 手を 出すと、そのまま こうげきを もらう
    sfxSwing();
    fx('whiff');
    return;
  }
  // ★ すきが ない ときは ガードされる。しかも やり返して くる
  sfxBlock();
  f.blockT = 0.22;
  fx('blocked');
  if (Math.random() < G.st.pun && f.st === 'rest') foeAttack(true);
}

function trySpecial() {
  const m = G.me, f = G.foe;
  if (G.over || m.stars < 1) return;
  if (m.st === 'hurt' || m.st === 'down' || f.st === 'down') return;
  m.stars--;
  m.st = 'special'; m.stT = 0.55; m.cd = 0.55;
  G.flash = 0.30;
  sfxSpecial();
  const d = SPECIAL_DMG + (f.st === 'open' ? 10 : 0);
  fx('special', '- ' + d);
  hurtFoe(d, true);
}

// --- まいコマ ---------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  if (G.screen !== 'play') { IN.taps.length = 0; IN.fireTap = false; return; }

  if (G.hitStop > 0) { G.hitStop -= dt; dt *= 0.25; }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.4);
  if (G.meFlash > 0) G.meFlash = Math.max(0, G.meFlash - dt * 2.2);
  if (G.foeFlash > 0) G.foeFlash = Math.max(0, G.foeFlash - dt * 2.2);
  if (G.fx) { G.fx.t += dt; if (G.fx.t > 0.85) G.fx = null; }
  if (G.msgT > 0) G.msgT -= dt;

  for (let i = G.pops.length - 1; i >= 0; i--) {
    const q = G.pops[i]; q.t += dt;
    if (q.t > 0.9) G.pops.splice(i, 1);
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 620 * dt;
    if (q.t > 0.7) G.parts.splice(i, 1);
  }

  if (G.over) { IN.taps.length = 0; IN.fireTap = false; return; }

  const m = G.me, f = G.foe, st = G.st;

  // 時間ぎれ → はんてい
  G.time -= dt;
  if (G.time <= 0) {
    G.time = 0;
    const mine = f.downs * 10 + (1 - f.hp / f.hpMax) * 5;
    const theirs = m.downs * 10 + (1 - m.hp / m.hpMax) * 5;
    endMatch(mine > theirs, mine > theirs ? 'はんていで かち！' : 'はんていで まけ');
    return;
  }

  // --- こちらの じょうたい ---
  if (m.cd > 0) m.cd -= dt;
  if (m.punchT > 0) m.punchT -= dt;
  if (m.stT > 0) m.stT -= dt;

  const dir = IN.dir || keyDir();
  if (m.st === 'down') {
    if (m.stT <= 0) {
      m.hp = Math.round(m.hpMax * GETUP_HP);
      m.st = 'idle';
      pop('立ちあがった！', '#8AD8F0');
    }
  } else if (m.st === 'hurt') {
    if (m.stT <= 0) m.st = 'idle';
  } else if (m.st === 'dodge') {
    if (m.stT <= 0) { m.st = 'idle'; m.cd = Math.max(m.cd, DODGE_CD); }
  } else if (m.st === 'special') {
    if (m.stT <= 0) m.st = 'idle';
  } else {
    // ★ よけは「おしっぱなし」では くり返さない。いちど 手を もどして
    //   おしなおさないと もう一度 よけられない（にぎったままで 勝てないように）。
    const fresh = (dir === 'l' || dir === 'r') && dir !== m.prevDir;
    if (fresh && m.upT <= 0) {
      m.st = 'dodge'; m.stT = DODGE_T; m.dodge = dir; m.upT = DODGE_T + DODGE_CD;
      m.lastDodge = dir; m.lastDodgeAt = G.t;
      sfxSwing();
    } else if (dir === 'd') {
      m.st = 'duck';
    } else if (dir === 'u') {
      m.st = 'guard';
    } else if (m.st === 'duck' || m.st === 'guard') {
      m.st = 'idle';
    } else if (m.st === 'punch' && m.stT <= 0) {
      m.st = 'idle';
    }
  }
  m.prevDir = dir;
  m.guardT = m.st === 'guard' ? m.guardT + dt : 0;
  if (m.upT > 0) m.upT -= dt;

  // --- あいての じょうたい ---
  if (f.hurtT > 0) f.hurtT -= dt;
  if (f.blockT > 0) f.blockT -= dt;
  f.lean += (0 - f.lean) * Math.min(1, dt * 6);
  f.stT -= dt;

  if (f.st === 'down') {
    if (f.stT <= 0) {
      f.hp = Math.round(f.hpMax * GETUP_HP);
      f.rage = Math.max(0.62, f.rage - 0.16);   // 立つたび 少し 速く なる
      f.st = 'rest'; f.stT = 1.2;
      pop(st.name + ' が 立った！', '#FF8AA8');
      sfxBell();
    }
  } else if (f.st === 'rest') {
    // ★ こちらが たおれて いる あいだは しかけて こない（レフェリーが 止める）。
    //   立ちあがった 直後にも 少し 間を おく。
    if (m.st === 'down') f.stT = Math.max(f.stT, 0.9);
    else if (f.stT <= 0) foeAttack(false);
  } else if (f.st === 'tell') {
    if (f.stT <= 0) { f.st = 'strike'; f.stT = 0.16; foeStrike(); }
  } else if (f.st === 'strike') {
    // ここに 来るのは 当たった とき だけ（よけられて いたら 'open' に なって いる）
    if (f.stT <= 0) {
      f.comboLeft--;
      if (f.comboLeft > 0) foeAttack(true);
      else { f.st = 'rest'; f.stT = rndR(st.rest) * f.rage; }
    }
  } else if (f.st === 'open') {
    if (f.stT <= 0) { f.st = 'rest'; f.stT = rndR(st.rest) * f.rage * 0.7; }
  }

  // --- そうさ ---
  if (IN.fireTap) tryPunch();
  if (KEYS.KeyX) { KEYS.KeyX = false; trySpecial(); }
  IN.taps.length = 0;
  IN.fireTap = false;
}

// --- 絵 ---------------------------------------------------------------------------
function ringY() { return HUD + 64; }

function drawRing() {
  const y0 = ringY();
  // かべ と おきゃくさん
  const g = ctx.createLinearGradient(0, y0, 0, VH);
  g.addColorStop(0, '#241C3E'); g.addColorStop(1, '#120E22');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  // おきゃくさん（シルエット）
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const yy = y0 + 8 + r * 13;
    ctx.fillStyle = ['rgba(120,110,180,0.30)', 'rgba(96,88,150,0.34)', 'rgba(70,64,120,0.40)'][r];
    for (let i = -2; i < 34; i++) {
      const xx = i * (VW / 30) + (r % 2) * 12;
      const bob = Math.sin(G.t * 3 + i * 0.7 + r) * 2.4;
      circle(xx, yy + bob, 9 - r); ctx.fill();
    }
  }

  // リングの ゆか（おくが せまい だいけい）
  const fy = y0 + 54;
  ctx.fillStyle = '#5A4A86';
  ctx.beginPath();
  ctx.moveTo(VW * 0.20, fy);
  ctx.lineTo(VW * 0.80, fy);
  ctx.lineTo(VW * 1.20, VH + VOB);
  ctx.lineTo(-VW * 0.20, VH + VOB);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(VW * 0.20, fy);
  ctx.lineTo(VW * 0.80, fy);
  ctx.lineTo(VW * 0.92, fy + (VH - fy) * 0.30);
  ctx.lineTo(VW * 0.08, fy + (VH - fy) * 0.30);
  ctx.closePath(); ctx.fill();

  // おくの ロープ
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ['#FF6FA8', '#F8F4FF', '#8AD8F0'][i];
    ctx.lineWidth = 3;
    const yy = fy - 8 - i * 13;
    ctx.beginPath(); ctx.moveTo(VW * 0.14, yy); ctx.lineTo(VW * 0.86, yy); ctx.stroke();
  }
  ctx.fillStyle = '#3A2E58';
  for (const px of [VW * 0.15, VW * 0.85]) {
    rr(px - 5, fy - 50, 10, 54, 4); ctx.fill();
  }
}

// 手まえの ロープ（いちばん 手まえに かく）
function drawFrontRope() {
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = i === 0 ? '#FF6FA8' : '#F8F4FF';
    ctx.lineWidth = 7;
    const yy = VH * (0.88 + i * 0.10);
    ctx.beginPath();
    ctx.moveTo(-VW * 0.2, yy);
    ctx.quadraticCurveTo(VW / 2, yy + 6, VW * 1.2, yy);
    ctx.stroke();
  }
  ctx.restore();
}

// --- あいての 絵 -------------------------------------------------------------------
function foeS() { return Math.min(VH * 0.33, VW * 0.21); }

function drawFoe() {
  const f = G.foe, st = G.st;
  const s = foeS();
  const cx = VW / 2 + f.lean * 12 * (f.kind === 'R' ? -1 : 1);
  let cy = VH * 0.52;

  const tellK = f.st === 'tell' ? f.kind : '';
  const strK = f.st === 'strike' ? f.kind : '';
  const prog = f.st === 'tell' && f.tellT > 0 ? 1 - f.stT / f.tellT : 0;

  ctx.save();

  if (f.st === 'down') {
    ctx.translate(cx, cy + s * 0.55);
    ctx.rotate(-0.95);
    ctx.translate(-cx, -(cy + s * 0.55));
    cy += s * 0.30;
  } else if (f.st === 'open') {
    cy += s * 0.10 + Math.sin(G.t * 22) * 3;
  } else {
    cy += Math.sin(G.t * 3.2) * s * 0.035;
    if (tellK === 'U') cy += prog * s * 0.16;         // アッパーは しずみこむ
    if (tellK === 'B') cy += prog * s * 0.10;
  }

  // あし
  ctx.strokeStyle = '#2A2438'; ctx.lineWidth = s * 0.24; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy + s * 0.50); ctx.lineTo(cx - s * 0.38, cy + s * 1.00);
  ctx.moveTo(cx + s * 0.24, cy + s * 0.50); ctx.lineTo(cx + s * 0.38, cy + s * 1.00);
  ctx.stroke();

  // トランクス
  ctx.fillStyle = st.suit;
  rr(cx - s * 0.44, cy + s * 0.26, s * 0.88, s * 0.40, s * 0.14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(cx - s * 0.44, cy + s * 0.26, s * 0.88, s * 0.10, s * 0.05); ctx.fill();

  // からだ
  ctx.fillStyle = st.skin;
  rr(cx - s * 0.50, cy - s * 0.34, s * 1.00, s * 0.68, s * 0.24); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  rr(cx - s * 0.06, cy - s * 0.30, s * 0.12, s * 0.56, s * 0.06); ctx.fill();
  if (f.st === 'open') {                       // すきの あいだは おなかが 光る
    ctx.fillStyle = 'rgba(255,210,74,0.34)';
    rr(cx - s * 0.50, cy - s * 0.34, s * 1.00, s * 0.68, s * 0.24); ctx.fill();
  }

  // あたま
  const hy = cy - s * 0.72;
  drawFoeHead(cx, hy, s, st, f);

  // グローブ（左右）。あいず・こうげきで 大きく 前に 出る
  let lx = cx - s * 0.74, ly = cy - s * 0.10, lr = s * 0.26;
  let rx = cx + s * 0.74, ry = cy - s * 0.10, rr2 = s * 0.26;
  if (tellK === 'L' || strK === 'L') {
    const k = strK ? 1 : prog;
    lx = cx - s * (0.74 + k * 0.34); ly = cy - s * (0.10 + k * 0.28);
    lr = s * (0.26 + k * 0.24);
  }
  if (tellK === 'R' || strK === 'R') {
    const k = strK ? 1 : prog;
    rx = cx + s * (0.74 + k * 0.34); ry = cy - s * (0.10 + k * 0.28);
    rr2 = s * (0.26 + k * 0.24);
  }
  if (tellK === 'U' || strK === 'U') {
    const k = strK ? 1 : prog;
    lx = cx - s * 0.40; ly = cy + s * (0.40 - k * 0.10); lr = s * (0.26 + k * 0.10);
    rx = cx + s * 0.40; ry = cy + s * (0.40 - k * 0.10); rr2 = s * (0.26 + k * 0.10);
  }
  if (tellK === 'B' || strK === 'B') {
    const k = strK ? 1 : prog;
    lx = cx - s * (0.60 + k * 0.20); ly = cy + s * (0.20 + k * 0.10); lr = s * (0.26 + k * 0.18);
    rx = cx + s * (0.60 + k * 0.20); ry = cy + s * (0.20 + k * 0.10); rr2 = s * (0.26 + k * 0.18);
  }
  if (strK === 'L' || strK === 'R' || strK === 'U' || strK === 'B') {
    // パンチの すじ
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.10);
    ctx.lineTo((lx + rx) / 2, (ly + ry) / 2);
    ctx.stroke();
  }
  if (f.blockT > 0) { lx = cx - s * 0.34; rx = cx + s * 0.34; ly = ry = cy - s * 0.56; }

  for (const [gx, gy, gr] of [[lx, ly, lr], [rx, ry, rr2]]) {
    ctx.fillStyle = '#E0303A';
    circle(gx, gy, gr); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    circle(gx - gr * 0.28, gy - gr * 0.30, gr * 0.34); ctx.fill();
    ctx.fillStyle = '#F8F0E0';
    rr(gx - gr * 0.5, gy + gr * 0.55, gr, gr * 0.34, gr * 0.16); ctx.fill();
  }

  // ★ あいずの ひかりは からだより **あと** に かく。
  //   さきに かくと グローブや 体に かくれて まったく 見えなかった。
  if (tellK) drawTellGlow(cx, cy, s, tellK, prog);

  ctx.restore();

  // ヒント（title で オンに して いる ときだけ）。ロープに かさなると
  // 読めないので、ゲージの すぐ 下の あいて いる ところに おく。
  if (save.hint && tellK) {
    const txt = ATK_NAME[tellK] + '　' + ATK_HINT[tellK];
    const fs = fitSize(txt, VW * 0.52, 19);
    const w = VW * 0.54, hh = fs + 12;
    ctx.fillStyle = 'rgba(10,6,22,0.72)';
    rr(VW / 2 - w / 2, HUD + 56 - hh / 2, w, hh, hh / 2); ctx.fill();
    bigText(txt, VW / 2, HUD + 56, fs, ATK_COL[tellK]);
  }
}

// あいずの ひかり。この ゲームで いちばん 大事な 絵なので
// ①光る まる ②ひろがる わ ③やじるし の 3つを 重ねて はっきり 見せる。
function drawTellGlow(cx, cy, s, kind, prog) {
  const a = 0.34 + prog * 0.46;
  let gx = cx, gy = cy, gr = s * 0.40;
  if (kind === 'L') { gx = cx - s * 0.86; gy = cy - s * 0.22; gr = s * 0.46; }
  else if (kind === 'R') { gx = cx + s * 0.86; gy = cy - s * 0.22; gr = s * 0.46; }
  else if (kind === 'U') { gy = cy + s * 0.46; gr = s * 0.52; }
  else { gy = cy + s * 0.24; gr = s * 0.56; }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.62;
  ctx.fillStyle = ATK_COL[kind];
  circle(gx, gy, gr * (0.60 + prog * 0.34)); ctx.fill();
  ctx.strokeStyle = ATK_COL[kind];
  for (let i = 0; i < 3; i++) {
    const k = (prog + i / 3) % 1;
    ctx.globalAlpha = a * (1 - k);
    ctx.lineWidth = Math.max(2, s * 0.055);
    circle(gx, gy, gr * (0.55 + k * 1.20)); ctx.stroke();
  }
  ctx.restore();

  // ★ やじるしは「じぶんが 入れる むき」を さす（ヒントを 出して いる ときだけ）。
  //   さいしょ「パンチが 来る むき」に して いたが、ボディの ときに
  //   下を さして しまい、しゃがむのが 正かいだと 思わせて しまった。
  if (!save.hint) return;
  const dirs = kind === 'L' ? [[1, 0]] : kind === 'R' ? [[-1, 0]]
             : kind === 'U' ? [[0, -1]] : [[-1, 0], [1, 0]];
  ctx.save();
  ctx.globalAlpha = 0.62 + prog * 0.38;
  ctx.fillStyle = ATK_COL[kind];
  ctx.strokeStyle = 'rgba(20,12,34,0.7)';
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  for (const av of dirs) {
    for (let i = 0; i < 2; i++) {
      const d = gr * (0.95 + i * 0.40 + prog * 0.25);
      const tx = gx + av[0] * d, ty = gy + av[1] * d, w = s * 0.15;
      ctx.beginPath();
      ctx.moveTo(tx + av[0] * w, ty + av[1] * w);
      ctx.lineTo(tx - av[0] * w - av[1] * w, ty - av[1] * w - av[0] * w);
      ctx.lineTo(tx - av[0] * w + av[1] * w, ty - av[1] * w + av[0] * w);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFoeHead(x, y, s, st, f) {
  const r = s * 0.40;
  const down = f.st === 'down', open = f.st === 'open';
  ctx.fillStyle = st.skin;
  circle(x, y, r); ctx.fill();

  // かみ／ぼうし
  ctx.fillStyle = st.hair;
  if (st.style === 'mask') {
    // ★ さいしょ 顔ぜんぶを こい 色で ぬって いたので、目も 口も
    //   見えなかった。おおうのは 上はんぶんだけに する。
    ctx.beginPath(); ctx.arc(x, y, r * 1.02, Math.PI * 0.98, Math.PI * 2.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = st.suit;
    ctx.fillRect(x - r * 0.98, y - r * 0.44, r * 1.96, r * 0.20);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.02); ctx.lineTo(x + r * 0.26, y - r * 0.46);
    ctx.lineTo(x - r * 0.26, y - r * 0.46);
    ctx.closePath(); ctx.fill();
  } else if (st.style === 'ninja') {
    ctx.beginPath(); ctx.arc(x, y, r * 1.04, Math.PI * 0.98, Math.PI * 2.02); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - r, y + r * 0.20, r * 2, r * 0.55);
  } else if (st.style === 'panda') {
    ctx.fillStyle = '#2A2A34';
    circle(x - r * 0.82, y - r * 0.70, r * 0.34); ctx.fill();
    circle(x + r * 0.82, y - r * 0.70, r * 0.34); ctx.fill();
  } else if (st.style === 'robo') {
    ctx.fillStyle = st.hair;
    rr(x - r, y - r * 1.16, r * 2, r * 0.5, r * 0.2); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    circle(x, y - r * 1.32, r * 0.16); ctx.fill();
  } else if (st.style === 'ice') {
    ctx.fillStyle = st.hair;
    ctx.beginPath(); ctx.arc(x, y, r * 1.14, Math.PI, 0); ctx.closePath(); ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.42, y - r * 0.9);
      ctx.lineTo(x + i * r * 0.42 - r * 0.14, y - r * 1.55);
      ctx.lineTo(x + i * r * 0.42 + r * 0.14, y - r * 1.55);
      ctx.closePath(); ctx.fill();
    }
  } else if (st.style === 'pirate') {
    ctx.fillStyle = '#22222C';
    ctx.beginPath(); ctx.arc(x, y - r * 0.10, r * 1.06, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - r * 1.18, y - r * 0.16, r * 2.36, r * 0.18);
    ctx.fillStyle = '#22222C';
    circle(x - r * 0.40, y + r * 0.06, r * 0.22); ctx.fill();
  } else if (st.style === 'doc') {
    ctx.fillStyle = st.hair;
    ctx.beginPath(); ctx.arc(x, y - r * 0.06, r * 1.04, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F0F0F8';                    // ひげ
    ctx.beginPath(); ctx.arc(x, y + r * 0.36, r * 0.56, 0, Math.PI); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = st.hair;
    ctx.beginPath(); ctx.arc(x, y - r * 0.06, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  }

  // 目
  const ey = y + r * 0.06, ex = r * 0.36;
  if (down || open) {
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.6, r * 0.10);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * ex - r * 0.16, ey - r * 0.14);
      ctx.lineTo(x + sg * ex + r * 0.16, ey + r * 0.14);
      ctx.moveTo(x + sg * ex + r * 0.16, ey - r * 0.14);
      ctx.lineTo(x + sg * ex - r * 0.16, ey + r * 0.14);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#FFF';
    for (const sg of [-1, 1]) { circle(x + sg * ex, ey, r * 0.20); ctx.fill(); }
    ctx.fillStyle = '#2A2028';
    const look = f.st === 'tell' ? (f.kind === 'L' ? 0.06 : f.kind === 'R' ? -0.06 : 0) : 0;
    for (const sg of [-1, 1]) { circle(x + sg * ex + r * look, ey + r * 0.02, r * 0.11); ctx.fill(); }
  }
  // 口
  ctx.strokeStyle = '#8A3A4A'; ctx.lineWidth = Math.max(1.4, r * 0.09);
  ctx.beginPath();
  if (down || open) ctx.arc(x, y + r * 0.62, r * 0.24, Math.PI * 1.1, Math.PI * 1.9);
  else if (f.st === 'tell') ctx.arc(x, y + r * 0.40, r * 0.26, 0.15, Math.PI - 0.15);
  else ctx.arc(x, y + r * 0.44, r * 0.20, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

// --- こちらの 絵（うしろすがた） ------------------------------------------------
function drawMe() {
  const m = G.me;
  // ★ 手まえの じぶんは 小さめ・下め に する。大きいと あいての 体が
  //   かくれて しまい、いちばん 大事な「あいず」が 見えなく なる。
  const s = foeS() * 0.84;
  let cx = VW / 2, cy = VH * 1.08;
  let alpha = 0.95;

  if (m.st === 'dodge') {
    const k = Math.sin(clamp(1 - m.stT / DODGE_T, 0, 1) * Math.PI);
    cx += (m.dodge === 'l' ? -1 : 1) * k * s * 1.05;
    cy += k * s * 0.05;
  } else if (m.st === 'duck') {
    cy += s * 0.42;
  } else if (m.st === 'hurt') {
    cx += Math.sin(G.t * 40) * 6;
    cy += s * 0.10;
  } else if (m.st === 'down') {
    cy += s * 0.70; alpha = 0.55;
  } else {
    cy += Math.sin(G.t * 3.2) * s * 0.03;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // かた
  ctx.fillStyle = '#F0C8A0';
  rr(cx - s * 0.62, cy - s * 0.62, s * 1.24, s * 0.90, s * 0.30); ctx.fill();
  // ランニング
  ctx.fillStyle = '#4A9AE0';
  rr(cx - s * 0.44, cy - s * 0.40, s * 0.88, s * 0.70, s * 0.16); ctx.fill();

  // あたま（うしろから）
  const hy = cy - s * 0.94;
  ctx.fillStyle = '#F0C8A0';
  circle(cx, hy, s * 0.40); ctx.fill();
  ctx.fillStyle = '#3A2A22';
  ctx.beginPath(); ctx.arc(cx, hy, s * 0.41, Math.PI * 0.86, Math.PI * 2.14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3A2A22';
  circle(cx - s * 0.30, hy + s * 0.18, s * 0.10); ctx.fill();
  circle(cx + s * 0.30, hy + s * 0.18, s * 0.10); ctx.fill();

  // グローブ（2つ）。パンチの ときは 前に のびる ＝ 大きく なる
  for (const side of [-1, 1]) {
    const isPunch = m.punchT > 0 && ((m.punchArm === 0 && side === -1) || (m.punchArm === 1 && side === 1));
    const k = isPunch ? Math.sin(clamp(1 - m.punchT / 0.20, 0, 1) * Math.PI) : 0;
    let gx = cx + side * s * 0.62;
    let gy = cy - s * 0.86 - k * s * 0.62;
    let gr = s * 0.27 + k * s * 0.20;
    if (m.st === 'guard') {
      // ★ にぎりすぎた ガードは ふるえる（もうすぐ くずれる しるし）
      const wob = m.guardT > GUARD_MAX * 0.7 ? Math.sin(G.t * 34) * s * 0.06 : 0;
      gx = cx + side * s * 0.30 + wob; gy = cy - s * 1.02 + wob * 0.5; gr = s * 0.32;
    }
    if (m.st === 'special') {
      const kk = clamp(1 - m.stT / 0.55, 0, 1);
      gx = cx + side * s * (0.62 - kk * 0.34);
      gy = cy - s * (0.86 + kk * 1.10);
      gr = s * (0.30 + kk * 0.34);
    }
    ctx.fillStyle = '#3A7AD8';
    circle(gx, gy, gr); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    circle(gx - gr * 0.28, gy - gr * 0.32, gr * 0.34); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = Math.max(1.5, gr * 0.09);
    circle(gx, gy, gr); ctx.stroke();
  }
  ctx.restore();

  // よけて いる あいだの すじ
  if (m.st === 'dodge') {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#8AE0A0'; ctx.lineWidth = 4;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - (m.dodge === 'l' ? -1 : 1) * s * (0.5 + i * 0.22), cy - s * (0.5 + i * 0.10));
      ctx.lineTo(cx - (m.dodge === 'l' ? -1 : 1) * s * (0.8 + i * 0.22), cy - s * (0.5 + i * 0.10));
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- おきた ことを 大きく 見せる ------------------------------------------------------
//
// ★ 「当たったのか、ふせげたのか わからん」への こたえ。
//   ①画面の へりを 色で そめる ②かたち ③ことば の 3つを 同時に 出す。
//   あいてに おきた ことは 画面の 上、じぶんに おきた ことは 下に 出す ので、
//   どっちの はなしか ひと目で わかる。

function drawFx() {
  if (!G.fx) return;
  const d = FX[G.fx.kind];
  if (!d) return;
  const k = clamp(G.fx.t / 0.85, 0, 1);
  const pop = Math.sin(Math.min(1, k * 3.4) * Math.PI * 0.5);   // 出るとき ぽん
  const fade = 1 - k * k;

  // ① 画面の へりを そめる
  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  const gx = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.26, VW / 2, VH / 2, VH * 0.78);
  gx.addColorStop(0, 'rgba(0,0,0,0)');
  gx.addColorStop(1, d.col);
  ctx.fillStyle = gx;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.restore();

  // ② かたち
  const cx = VW / 2, cy = d.side === 'foe' ? VH * 0.33 : VH * 0.63;
  const r = VH * 0.10 * (0.6 + pop * 0.5);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.strokeStyle = d.ring;
  ctx.fillStyle = d.col;
  if (d.icon === 'burst') {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      const rr2 = i % 2 ? r * 0.44 : r;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
      else ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (d.icon === 'star') {
    star(cx, cy, r, d.col);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr2 = i % 2 ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
      else ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.stroke();
  } else if (d.icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.78, cy - r * 0.52);
    ctx.lineTo(cx + r * 0.78, cy + r * 0.22);
    ctx.quadraticCurveTo(cx + r * 0.5, cy + r, cx, cy + r * 1.02);
    ctx.quadraticCurveTo(cx - r * 0.5, cy + r, cx - r * 0.78, cy + r * 0.22);
    ctx.lineTo(cx - r * 0.78, cy - r * 0.52);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(3, r * 0.13);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.30, cy + r * 0.06);
    ctx.lineTo(cx - r * 0.05, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.36, cy - r * 0.30);
    ctx.stroke();
  } else if (d.icon === 'ring') {
    for (let i = 0; i < 2; i++) {
      ctx.globalAlpha = fade * (1 - i * 0.45);
      circle(cx, cy, r * (0.62 + k * (0.6 + i * 0.5))); ctx.stroke();
    }
    ctx.globalAlpha = fade;
  } else if (d.icon === 'swish') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, Math.PI * 0.15, Math.PI * 1.05);
    ctx.stroke();
  } else {                                   // crack（やられた）
    ctx.lineWidth = Math.max(4, r * 0.20);
    ctx.strokeStyle = d.col;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sg * r * 0.1, cy - r);
      ctx.lineTo(cx + sg * r * 0.55, cy - r * 0.2);
      ctx.lineTo(cx + sg * r * 0.2, cy + r * 0.1);
      ctx.lineTo(cx + sg * r * 0.7, cy + r);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ③ ことば
  ctx.save();
  ctx.globalAlpha = fade;
  const fs = fitSize(d.text, VW * 0.5, Math.round(VH * 0.070 * (0.78 + pop * 0.28)));
  bigText(d.text, cx, cy + r * 1.55, fs, d.col);
  if (G.fx.sub) bigText(G.fx.sub, cx, cy + r * 1.55 + fs * 0.95, Math.round(fs * 0.72), '#FFF0F0');
  ctx.restore();
}

// --- ゲージ など ------------------------------------------------------------------
function bar(x, y, w, h, k, col, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.45)';
  rr(x, y, w, h, h * 0.42); ctx.fill();
  ctx.fillStyle = col;
  rr(x + 2, y + 2, Math.max(0, (w - 4) * clamp(k, 0, 1)), h - 4, (h - 4) * 0.42); ctx.fill();
}

function drawHud() {
  const m = G.me, f = G.foe, st = G.st;
  ctx.fillStyle = 'rgba(10,6,22,0.85)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0EAFF';
  ctx.fillText('エイトくん', 10, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText(st.name, VW - 10, HUD / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = G.time < 15 ? '#FF8AA8' : '#FFD24A';
  ctx.fillText('のこり ' + Math.ceil(G.time), VW / 2, HUD / 2);

  const bw = VW * 0.36, bh = 15;
  bar(10, HUD + 8, bw, bh, m.hp / m.hpMax,
      G.meFlash > 0.25 ? '#FFFFFF' : m.hp / m.hpMax < 0.3 ? '#FF6A8A' : '#5AD8F0');
  bar(VW - 10 - bw, HUD + 8, bw, bh, f.hp / f.hpMax,
      G.foeFlash > 0.25 ? '#FFFFFF' : '#FF8A5A');

  // ダウンの かず
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = '#CFC8E8';
  ctx.fillText('ダウン ' + m.downs + '/' + ME_DOWNS, 10, HUD + 34);
  ctx.textAlign = 'right';
  ctx.fillText('あと ' + Math.max(0, st.downs - f.downs) + 'かい たおす', VW - 10, HUD + 34);

  // ☆
  ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) {
    const sx2 = 10 + bw + 16 + i * 22, sy2 = HUD + 15;
    star(sx2, sy2, 9, i < m.stars ? '#FFD24A' : 'rgba(255,255,255,0.16)');
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function star(x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr3 = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr3, y + Math.sin(a) * rr3);
    else ctx.lineTo(x + Math.cos(a) * rr3, y + Math.sin(a) * rr3);
  }
  ctx.closePath(); ctx.fill();
}

function drawControls() {
  drawStick();
  drawFire('パンチ', '#FF6FA8');
  // ☆ ひっさつ の ボタン。パンチの まるの 大きさから ばしょを 計算して 左どなりに おく。
  const rf = Math.max(34, 58 / SC);
  const r = Math.max(30, 46 / SC);
  const cxb = VW - 82 - rf - r - 26;
  const b = button(cxb - r, VH * 0.70 - r, r * 2, r * 2, trySpecial);
  const on = G.me && G.me.stars > 0;
  ctx.save();
  ctx.globalAlpha = on ? 0.95 : 0.30;
  circle(b.x + r, b.y + r, r);
  ctx.fillStyle = on ? 'rgba(255,210,74,0.22)' : 'rgba(255,255,255,0.14)'; ctx.fill();
  ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke();
  star(b.x + r, b.y + r - r * 0.22, r * 0.34, '#FFD24A');
  bigText('ひっさつ', b.x + r, b.y + r + r * 0.44, Math.round(r * 0.34), '#FFE8A8', null);
  ctx.restore();
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  drawRing();
  drawFoe();
  drawMe();
  drawFrontRope();

  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.7);
    ctx.fillStyle = q.col;
    circle(q.x, q.y, 4); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.5).toFixed(3) + ')';
    ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  }

  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9);
    bigText(q.text, q.x, q.y - q.t * 34, 20, q.col);
    ctx.globalAlpha = 1;
  }

  drawFx();
  drawHud();
  drawControls();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.30, 26, '#FFF6C8');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    const st = G.st;
    drawResult(G.win, G.win ? 'かち！' : 'まけ…',
      [G.endWhy,
       G.win ? 'のこり ' + Math.ceil(G.time) + 'びょう で ' + st.name + ' に かった'
             : st.name + ' の たいりょく のこり ' + Math.round(G.foe.hp / G.foe.hpMax * 100) + '%'],
      G.win && G.si + 1 < FOES.length
        ? [{ label: 'もういちど', on: () => startMatch(G.si) },
           { label: 'つぎの あいて', on: () => startMatch(G.si + 1), col: '#8AF0B0' },
           { label: 'あいてを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]
        : [{ label: 'もういちど', on: () => startMatch(G.si) },
           { label: 'あいてを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2E2050'); g.addColorStop(1, '#140E28');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  ctx.fillStyle = 'rgba(255,210,74,0.10)';
  ctx.beginPath();
  ctx.moveTo(VW * 0.18, VH * 0.30); ctx.lineTo(VW * 0.82, VH * 0.30);
  ctx.lineTo(VW * 1.15, VH); ctx.lineTo(-VW * 0.15, VH);
  ctx.closePath(); ctx.fill();

  bigText('エイトくんの', VW / 2, 30, 18, '#FFD8A8', null);
  bigText('チャンピオンロード', VW / 2, 62,
          fitSize('チャンピオンロード', VW * 0.5, 40), '#FFD24A');
  const sub = 'あいずを 見てから よける！ すきを つくって なぐる ボクシング';
  bigText(sub, VW / 2, 98, fitSize(sub, VW * 0.9, 15), '#CFC8E8', null);

  const names = FOES.map((f) => f.name);
  const clear = FOES.map((f, i) => !!save.clear['s' + i]);
  const y = stagePicker(FOES.length, FOES.length, clear, names, 120, startMatch, '#FFD24A');

  const sw = Math.min(150, VW * 0.19);
  drawButton(button(VW / 2 - sw * 1.5 - 12, y + 10, sw, 40, () => { G.screen = 'howto'; }),
             'あそびかた', '#FFE0B0');
  drawButton(button(VW / 2 - sw * 0.5, y + 10, sw, 40,
                    () => { save.hint = save.hint ? 0 : 1; storeSave(); }),
             save.hint ? 'ヒント あり' : 'ヒント なし', save.hint ? '#8AE0A0' : '#8A8AA8');
  drawButton(button(VW / 2 + sw * 0.5 + 12, y + 10, sw, 40, () => { audioStart(); sfxBell(); }),
             '♪ おと', '#FFE0B0');

  bigText('あそんだ かず ' + save.plays + '　たおした かず ' + save.ko,
          VW / 2, VH - 14, 14, 'rgba(230,220,255,0.7)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(230,220,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  ctx.fillStyle = '#1C1636';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 30, 24, '#FFF6C8');
  const lines = [
    '① あいてが 光ったら「あいず」。そこから よけかたを えらぶ',
    '② 左の グローブが 光る＝左フック → スティック 右',
    '③ 右の グローブが 光る＝右フック → スティック 左',
    '④ 下が 光って しずむ＝アッパー → スティック 上（ガード）※しゃがむと 大ダメージ',
    '⑤ おなかが 光る＝ボディ → 左か 右に よける ※ガードは きかない',
    '⑥ よけると あいてに すきが できる。そこで「パンチ」を れんだ！',
    '⑦ すきが ない ときに なぐると ガードされて やり返される',
    '⑧ ぴったり よけると ☆。☆で「ひっさつ」が 出せる（あたると 大きい）',
    '⑨ あいては だいたい おなじ じゅんばんで こうげきして くる。おぼえたら さきよみ！',
    '⑩ パソコンなら ← → ↑ ↓ と スペース（パンチ）、X（ひっさつ）',
  ];
  const fs = VH < 400 ? 13 : 15;
  lines.forEach((s, i) => bigText(s, VW / 2, 60 + i * (fs + 11), fitSize(s, VW * 0.94, fs), '#CFE8FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 44, bw, 38, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
