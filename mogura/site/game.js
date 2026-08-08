// あなから 出てくる ものを たたく。
//
// ★ 出てくる ものは「たたく もの」と「たたいちゃ だめな もの」の 2しゅるい。
//   ぜんぶ たたけば いい だけだと、めちゃくちゃに 連打すれば かてて しまう。
//   見て から きめる 時間を つくる ため、だめな ものを まぜる。
//
// ★ ときどき **リナパパ**が ボスで 出てくる。メガネの ちょいぽちゃ。
//   1回では たおれない（何回か たたく）。たたいて いる あいだは
//   ほかの あなからも どんどん 出てくるので いそがしい。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 2;

const VH = 450;

const SAVE_KEY = 'mogura.v1';

const save = { clear: [], best: {}, fails: {}, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}
// 3回 だめだと 目ひょうが さがる
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function goalMul() { return [1, 0.88, 0.78, 0.66][assistLevel(G.stage)]; }

// 出てくる もの
const KINDS = {
  mole:  { name: 'もぐら',   pt: 100, bad: false, hp: 1, col: '#A87A50' },
  gold:  { name: 'きんもぐら', pt: 300, bad: false, hp: 1, col: '#FFD166' },
  fast:  { name: 'すばやい',  pt: 180, bad: false, hp: 1, col: '#8FD6FF' },
  bomb:  { name: 'ばくだん',  pt: -250, bad: true, hp: 1, col: '#4A4458' },
  cake:  { name: 'ケーキ',   pt: -150, bad: true, hp: 1, col: '#FFB8D8' },
  papa:  { name: 'リナパパ',  pt: 900, bad: false, hp: 4, col: '#5A8A6A' },
};

// 10めん。だんだん 早く なり、だめな ものが ふえ、パパも 出る。
const STAGES = [
  { name: '1. はじめての モグラたたき', holes: 6, len: 30, goal: 2400, up: 0.85, down: 1.30, bad: 0.00, papa: 0 },
  { name: '2. きんもぐら が 出た',      holes: 6, len: 30, goal: 3600, up: 0.78, down: 1.20, bad: 0.00, papa: 0, gold: 0.12 },
  { name: '3. ばくだん に ちゅうい',    holes: 6, len: 35, goal: 4800, up: 0.74, down: 1.15, bad: 0.16, papa: 0, gold: 0.12 },
  { name: '4. パパ とうじょう！',       holes: 6, len: 35, goal: 6900, up: 0.70, down: 1.10, bad: 0.16, papa: 0.05, gold: 0.12 },
  { name: '5. あなが ふえた',           holes: 9, len: 40, goal: 8100, up: 0.66, down: 1.05, bad: 0.18, papa: 0.05, gold: 0.12 },
  { name: '6. すばやい もぐら',         holes: 9, len: 40, goal: 10000, up: 0.60, down: 0.95, bad: 0.20, papa: 0.06, gold: 0.12, fast: 0.25 },
  { name: '7. ケーキも まぜて',         holes: 9, len: 40, goal: 11200, up: 0.56, down: 0.90, bad: 0.24, papa: 0.06, gold: 0.12, fast: 0.25 },
  { name: '8. パパが よく 出る',        holes: 9, len: 45, goal: 15800, up: 0.52, down: 0.85, bad: 0.24, papa: 0.10, gold: 0.14, fast: 0.28 },
  { name: '9. どんどん 出る',           holes: 12, len: 45, goal: 18700, up: 0.48, down: 0.78, bad: 0.26, papa: 0.10, gold: 0.14, fast: 0.30 },
  { name: '10. パパ まつり',            holes: 12, len: 50, goal: 23800, up: 0.42, down: 0.72, bad: 0.28, papa: 0.16, gold: 0.16, fast: 0.32 },
];

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  holes: [],       // { up: 0〜1, k, hp, hit, state }
  score: 0,
  goal: 0,
  combo: 0, bestCombo: 0,
  hits: 0, miss: 0, lets: 0,
  t: 0, left: 0,
  next: 0,
  over: false, win: false,
  pops: [],
  papaOn: false,
  shake: 0,
  hurried: false,
};

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.holes = [];
  for (let k = 0; k < G.S.holes; k++) {
    G.holes.push({ up: 0, k: null, hp: 0, hit: 0, state: 'idle', t: 0, life: 0 });
  }
  G.score = 0;
  G.goal = Math.round(G.S.goal * goalMul() / 100) * 100;
  G.combo = 0; G.bestCombo = 0;
  G.hits = 0; G.miss = 0; G.lets = 0;
  G.t = 0; G.left = G.S.len;
  G.next = 0.8;
  G.over = false; G.win = false;
  G.pops = [];
  G.papaOn = false;
  G.shake = 0;
  G.hurried = false;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

function pickKind() {
  const S = G.S;
  const r = Math.random();
  if (!G.papaOn && r < (S.papa || 0)) return 'papa';
  if (r < (S.papa || 0) + (S.bad || 0)) return Math.random() < 0.6 ? 'bomb' : 'cake';
  if (r < (S.papa || 0) + (S.bad || 0) + (S.gold || 0)) return 'gold';
  if (Math.random() < (S.fast || 0)) return 'fast';
  return 'mole';
}

function spawn() {
  const free = G.holes.filter((h) => h.state === 'idle');
  if (!free.length) return;
  const h = free[(Math.random() * free.length) | 0];
  const k = pickKind();
  h.k = k;
  h.hp = KINDS[k].hp;
  h.state = 'up';
  h.t = 0;
  // 出ている 時間。すばやい ほど みじかい。
  const base = 0.9 + Math.random() * 0.7;
  h.life = k === 'fast' ? base * 0.55 : k === 'papa' ? 5.0 : base;
  h.up = 0;
  if (k === 'papa') { G.papaOn = true; sfxPapa(); }
  else sfxPop();
}

// たたいた
function whack(i) {
  if (G.screen !== 'play' || G.over) return;
  const h = G.holes[i];
  if (!h || h.state !== 'up' || h.up < 0.45) { G.combo = 0; return; }
  const K = KINDS[h.k];
  if (K.bad) {
    G.score = Math.max(0, G.score + K.pt);
    G.miss++;
    G.combo = 0;
    G.shake = 1;
    sfxBad();
    G.pops.push({ i, n: K.pt, t: 0, col: '#FF8FA0' });
    h.state = 'down'; h.t = 0;
    return;
  }
  h.hp--;
  h.hit = 1;
  if (h.hp > 0) {
    // パパは 何回か たたく
    sfxHit();
    G.pops.push({ i, n: 0, t: 0, col: '#FFFFFF', txt: 'あと ' + h.hp });
    return;
  }
  G.combo++;
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  G.hits++;
  const bonus = 1 + Math.min(10, G.combo - 1) * 0.1;
  const pt = Math.round(K.pt * bonus);
  G.score += pt;
  G.pops.push({ i, n: pt, t: 0, col: h.k === 'papa' ? '#FFE066' : '#A8F0B0' });
  if (h.k === 'papa') { G.papaOn = false; sfxPapaDown(); }
  else { sfxHit(); if (G.combo > 1) sfxCombo(G.combo); }
  h.state = 'down'; h.t = 0;
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.shake = Math.max(0, G.shake - dt * 3);
  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter((p) => p.t < 0.9);

  if (G.over) {
    G.t += dt;
    if (G.t > 1.6) { bgmStop(); G.screen = 'result'; }
    return;
  }

  G.left -= dt;
  bgmHeat(G.left < 12 ? 1 : 0);
  if (!G.hurried && G.left <= 10) { G.hurried = true; sfxTick(); }
  if (G.left <= 0) { G.left = 0; finish(); return; }

  // 出す
  G.next -= dt;
  if (G.next <= 0) {
    spawn();
    const S = G.S;
    G.next = S.up * (0.6 + Math.random() * 0.9);
  }

  // あなの ようす
  for (const h of G.holes) {
    h.hit = Math.max(0, h.hit - dt * 5);
    if (h.state === 'up') {
      h.t += dt;
      h.up = Math.min(1, h.t / 0.18);
      if (h.t >= h.life) {
        // にがした
        if (!KINDS[h.k].bad) { G.lets++; G.combo = 0; sfxLet(); }
        if (h.k === 'papa') G.papaOn = false;
        h.state = 'down'; h.t = 0;
      }
    } else if (h.state === 'down') {
      h.t += dt;
      h.up = Math.max(0, 1 - h.t / 0.16);
      if (h.up <= 0) { h.state = 'idle'; h.k = null; h.t = 0; }
    }
  }
}

function finish() {
  if (G.over) return;
  G.over = true;
  G.win = G.score >= G.goal;
  G.t = 0;
  const key = 's' + G.stage;
  if (G.win) {
    save.clear[G.stage] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.score);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxEnd(G.win);
}
