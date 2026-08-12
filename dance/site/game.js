// りなの ダンスステージ
//
// ★ 上から おりてくる やじるしを、下の パネルに ぴったり かさなった しゅんかんに
//   おす。ダンスゲーム（ゲームセンターの 足で ふむ やつ）を 手で できる ように した。
//
// ★ いちばん 大事なのは「音と 画面と ゆびが そろう」こと。
//   ・画面の コマ送りは 1コマ 16ミリびょう ずれる ので はんていに つかわない。
//     ゆびが ついた しゅんかんの **音の 時計**（AudioContext）で くらべる。
//   ・スピーカーから 音が 出るまでの おくれ（outLat）も 足して そろえる。
//
// ★ ねらう ところは 画面を たてに 4つに わった まるごと。
//   よこ 200px ちかく あるので、ちいさな ボタンを ねらう ひつようは ない。
//
// ★ 曲は ファイルを つかわず、その場で 音を 組み立てて いる。
//   やじるしの ならびは 曲の メロディと 同じ。だから ふんで いると
//   曲を えんそうして いる ような 気もちに なる。

'use strict';

const GAME_VER = 1;
const HUD = 28;

const LANES = 4;
const LANE_COL = ['#FF6FA8', '#5AD8F0', '#9AE86A', '#FFD24A'];
const LANE_NAME = ['ひだり', 'した', 'うえ', 'みぎ'];
const KEY_LANE = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };

// はんてい（びょう）。子どもでも とれる ように ひろめ。
const W_PERFECT = 0.075;
const W_GOOD = 0.135;
const W_SAFE = 0.20;

const LEAD = 1.55;           // やじるしが 出てから パネルに 着くまで
const GAUGE_MAX = 100;

const SAVE_KEY = 'dance.save.v1';
const save = { best: {}, rank: {}, plays: 0, steps: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (s.rank && typeof s.rank === 'object') save.rank = s.rank;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.steps)) save.steps = s.steps;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- 曲 ---------------------------------------------------------------------------
//
// lv … やじるしの こみぐあい（0 が いちばん やさしい）
// prog … コードの ながれ。メロディも ベースも これに そって 作る。

const SONGS = [
  { key: 's1', name: 'はじめの ステップ', bpm: 92, bars: 16, lv: 0, root: 60,
    prog: [0, 0, 5, 5, 7, 7, 5, 5], sky: ['#3A2A5E', '#6A4A96'], col: '#FF8FBB' },
  { key: 's2', name: 'きらきら ステップ', bpm: 100, bars: 16, lv: 0, root: 62,
    prog: [0, 5, 7, 5, 0, 5, 9, 7], sky: ['#2A3A6E', '#4A78C8'], col: '#8AD8F0' },
  { key: 's3', name: 'ポップコーン', bpm: 108, bars: 16, lv: 1, root: 60,
    prog: [0, 7, 5, 7, 0, 7, 9, 5], sky: ['#5E2A46', '#C86A8A'], col: '#FFB0C8' },
  { key: 's4', name: 'なつやすみ', bpm: 114, bars: 18, lv: 1, root: 64,
    prog: [0, 5, 9, 7, 0, 5, 7, 5], sky: ['#1E5A5E', '#48C0B0'], col: '#7AE8C8' },
  { key: 's5', name: 'あめふり ダンス', bpm: 120, bars: 18, lv: 2, root: 62,
    prog: [0, 3, 7, 5, 0, 3, 5, 7], sky: ['#26324E', '#5A7AA8'], col: '#A8C8F0' },
  { key: 's6', name: 'ゆうやけ ステップ', bpm: 126, bars: 20, lv: 2, root: 65,
    prog: [0, 5, 3, 7, 0, 5, 9, 7], sky: ['#6E3A22', '#E88A4A'], col: '#FFC07A' },
  { key: 's7', name: 'よるの おまつり', bpm: 132, bars: 20, lv: 3, root: 62,
    prog: [0, 7, 3, 5, 0, 7, 5, 3], sky: ['#3A1E4E', '#8A48A8'], col: '#D8A0F0' },
  { key: 's8', name: 'でんきの まち', bpm: 140, bars: 20, lv: 3, root: 60,
    prog: [0, 5, 7, 10, 0, 5, 7, 5], sky: ['#0E2E3E', '#2A8AA8'], col: '#6AE0F0' },
  { key: 's9', name: 'うちゅう ダンス', bpm: 148, bars: 22, lv: 4, root: 63,
    prog: [0, 3, 8, 5, 0, 3, 10, 7], sky: ['#141030', '#3A2A78'], col: '#B0A8FF' },
  { key: 's10', name: 'さいごの ステージ', bpm: 156, bars: 24, lv: 4, root: 60,
    prog: [0, 5, 3, 7, 8, 7, 5, 3], sky: ['#4A0E2A', '#D8365E'], col: '#FF7A9A' },
];

const SCALE = [0, 2, 4, 5, 7, 9, 11];    // ドレミファソラシ

// おなじ 曲なら いつも おなじ ならびに なる さいころ
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- ふりつけ（ノーツ）を 作る -----------------------------------------------------
//
// 1しょうせつ = 4はく。8ぶおんぷ（はんぱく）を 1マスと して 8マス。
// lv が 上がる ほど マスが うまる。ならびは 「かいだん」「いったりきたり」など
// 手が おぼえやすい かたちを つないで いく。

function buildChart(song) {
  const rnd = rng(hashKey(song.key));
  const notes = [];
  const spb = 60 / song.bpm;
  const patStep = [0, 1, 2, 3];
  let lane = 1;
  let dir = 1;
  for (let bar = 0; bar < song.bars; bar++) {
    const chord = song.prog[bar % song.prog.length];
    // この しょうせつの マス（8ぶおんぷ 8つ）
    const slots = barSlots(song.lv, bar, rnd);
    // ならびの かたちを しょうせつごとに えらぶ
    const shape = bar < 2 ? 0 : Math.floor(rnd() * 4);
    for (let i = 0; i < 8; i++) {
      if (!slots[i]) continue;
      if (shape === 0) { lane = patStep[(bar + i) % 4]; }
      else if (shape === 1) { lane += dir; if (lane > 3) { lane = 2; dir = -1; } if (lane < 0) { lane = 1; dir = 1; } }
      else if (shape === 2) { lane = i % 2 === 0 ? (bar % 2 ? 0 : 3) : (bar % 2 ? 3 : 0); }
      else { lane = Math.floor(rnd() * 4); }
      lane = clamp(lane, 0, 3);
      // メロディの 音。コードの 音を 中心に、レーンで 高さを かえる
      const deg = (chord / 2 | 0) + [0, 2, 4, 6][lane];
      const midi = song.root + 12 + SCALE[deg % 7] + Math.floor(deg / 7) * 12;
      notes.push({ lane: lane, t: (bar * 4 + i * 0.5) * spb, midi: midi, judged: 0, at: 0 });
    }
  }
  return notes;
}

function barSlots(lv, bar, rnd) {
  const s = [0, 0, 0, 0, 0, 0, 0, 0];
  if (lv === 0) { s[0] = 1; s[4] = 1; if (bar % 4 === 3) s[6] = 1; }
  else if (lv === 1) { s[0] = s[2] = s[4] = s[6] = 1; if (bar % 4 === 3) s[7] = 1; }
  else if (lv === 2) {
    s[0] = s[2] = s[4] = s[6] = 1;
    s[1] = rnd() < 0.35 ? 1 : 0; s[5] = rnd() < 0.35 ? 1 : 0;
    if (bar % 4 === 3) { s[3] = 1; s[7] = 1; }
  } else if (lv === 3) {
    for (let i = 0; i < 8; i++) s[i] = 1;
    if (bar % 4 === 0) { s[3] = 0; s[7] = 0; }
  } else {
    for (let i = 0; i < 8; i++) s[i] = 1;
    if (bar % 2 === 1) s[7] = rnd() < 0.5 ? 1 : 0;
  }
  return s;
}

function hashKey(k) {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// --- おと ---------------------------------------------------------------------------

function outLat() {
  if (!A.ctx) return 0.02;
  const o = A.ctx.outputLatency;
  if (typeof o === 'number' && o > 0 && o < 0.5) return o;
  const b = A.ctx.baseLatency;
  if (typeof b === 'number' && b > 0 && b < 0.5) return b + 0.01;
  return 0.02;
}

function snare(t, v) {
  if (!A.ctx) return;
  nz(t, 0.12, v || 0.16, 900, 5200, A.mus);
  tone(t, 62, 0.06, (v || 0.16) * 0.4, 'triangle', A.mus);
}
function hat(t, v) { if (A.ctx) nz(t, 0.028, v || 0.05, 7000, 13000, A.mus); }
function bassNote(t, m, dur, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain(), f = A.ctx.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(mid2f(m), t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(700, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(A.mus);
  o.start(t); o.stop(t + dur + 0.03);
}
function sfxStep(kind) {
  if (!A.ctx) return;
  const t = anow();
  if (kind === 2) { bleep(t, [88, 95], 0.028, 0.05, 0.12); nz(t, 0.04, 0.09, 4000, 11000); }
  else if (kind === 1) { tone(t, 84, 0.05, 0.09, 'square'); }
  else tone(t, 76, 0.05, 0.07, 'square');
}
function sfxMissStep() { if (A.ctx) { const t = anow(); tone(t, 47, 0.16, 0.10, 'sawtooth'); nz(t, 0.14, 0.07, 150, 900); } }

// --- じょうたい ---------------------------------------------------------------------

// 曲を さきに 1びょうぶん 組み立てて おく ための しるし
let schedBar = 0, schedNote = 0;

const G = {
  screen: 'title', t: 0,
  song: null, si: 0, notes: [], t0: 0, bar: 0, spb: 0.5,
  score: 0, combo: 0, maxCombo: 0, gauge: 60,
  nPerfect: 0, nGood: 0, nSafe: 0, nMiss: 0,
  hitFx: [0, 0, 0, 0], lanePress: [0, 0, 0, 0],
  judgeTx: '', judgeT: 0, judgeCol: '#FFF',
  over: false, win: false, endT: 0, danceT: 0, pose: 0,
  crowd: 0, ready: 0,
};

function totalNotes() { return G.notes.length; }
function songLen() { return G.song.bars * 4 * G.spb; }

function startSong(i) {
  audioStart();
  schedBar = 0; schedNote = 0;      // 音の 組み立ても 最初から
  G.si = i;
  G.song = SONGS[i];
  G.spb = 60 / G.song.bpm;
  G.notes = buildChart(G.song);
  G.score = 0; G.combo = 0; G.maxCombo = 0; G.gauge = 60;
  G.nPerfect = G.nGood = G.nSafe = G.nMiss = 0;
  G.over = false; G.win = false; G.endT = 0; G.bar = 0;
  G.judgeTx = ''; G.judgeT = 0; G.danceT = 0;
  G.hitFx = [0, 0, 0, 0]; G.lanePress = [0, 0, 0, 0];
  G.ready = 1;
  G.t0 = anow() + 2.2;            // 2びょう ちょっと 待ってから 始まる
  G.screen = 'play';
  save.plays++; storeSave();
}

function pumpMusic() {
  if (!A.ctx || G.screen !== 'play') return;
  const s = G.song, spb = G.spb, barLen = spb * 4;
  while (schedBar < s.bars && G.t0 + schedBar * barLen < anow() + 1.2) {
    const t0 = G.t0 + schedBar * barLen;
    if (t0 + barLen > anow()) musicBar(t0, schedBar, spb);
    schedBar++;
  }
}
function musicBar(t0, bar, spb) {
  const s = G.song;
  const chord = s.prog[bar % s.prog.length];
  const root = s.root + chord;
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * spb, 0.6);
    if (i === 1 || i === 3) snare(t0 + i * spb, 0.15);
    hat(t0 + i * spb + spb / 2, 0.045);
    bassNote(t0 + i * spb, root - 24 + (i === 3 ? 7 : 0), spb * 0.8, 0.16);
  }
  // コード（うすく のばす）
  for (const k of [0, 4, 7]) {
    tone(t0, root - 12 + k, spb * 3.6, 0.035, 'triangle', A.mus);
  }
}

// メロディ（ノーツと 同じ ならび）も さきに 組み立てる
function pumpMelody() {
  if (!A.ctx || G.screen !== 'play') return;
  while (schedNote < G.notes.length && G.t0 + G.notes[schedNote].t < anow() + 1.2) {
    const n = G.notes[schedNote];
    const at = G.t0 + n.t;
    if (at > anow()) tone(at, n.midi, G.spb * 0.42, 0.10, 'square', A.mus);
    schedNote++;
  }
}

// --- そうさ -------------------------------------------------------------------------

const keyTaps = [];
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const l = KEY_LANE[e.code];
  if (l === undefined) return;
  audioStart();
  keyTaps.push({ lane: l, at: anow() });
});

function laneOfX(x) { return clamp(Math.floor(x / (VW / LANES)), 0, LANES - 1); }

function collectTaps() {
  const out = [];
  for (const t of IN.taps) out.push({ lane: laneOfX(t.x), at: t.at });
  for (const t of keyTaps) out.push(t);
  keyTaps.length = 0;
  return out;
}

// --- はんてい -----------------------------------------------------------------------

function judgeTap(tap) {
  const lat = outLat();
  let best = null, bestD = 1e9;
  for (const n of G.notes) {
    if (n.judged || n.lane !== tap.lane) continue;
    const d = Math.abs(tap.at - (G.t0 + n.t + lat));
    if (d < bestD) { bestD = d; best = n; }
  }
  G.lanePress[tap.lane] = 0.12;
  if (!best || bestD > W_SAFE) return;          // 早すぎ・おそすぎは 見なかった ことに する
  let kind;
  if (bestD <= W_PERFECT) kind = 2;
  else if (bestD <= W_GOOD) kind = 1;
  else kind = 0;
  best.judged = kind + 1;
  G.hitFx[best.lane] = 1;
  if (kind === 2) { G.score += 300; G.nPerfect++; G.gauge += 2; setJudge('パーフェクト！', '#FFD24A'); }
  else if (kind === 1) { G.score += 150; G.nGood++; G.gauge += 1; setJudge('グッド！', '#8AF0B0'); }
  else { G.score += 50; G.nSafe++; setJudge('セーフ', '#A8C8F0'); }
  G.combo++;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  G.score += Math.min(G.combo, 50) * 2;
  G.gauge = clamp(G.gauge, 0, GAUGE_MAX);
  G.pose = (G.pose + 1) % 6;
  G.crowd = 1;
  save.steps++;
  sfxStep(kind);
}

function setJudge(tx, col) { G.judgeTx = tx; G.judgeCol = col; G.judgeT = 0.5; }

function missNote(n) {
  n.judged = 4;
  G.nMiss++; G.combo = 0;
  G.gauge = clamp(G.gauge - 6, 0, GAUGE_MAX);
  setJudge('ミス', '#FF8AA8');
  sfxMissStep();
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.judgeT > 0) G.judgeT -= dt;
  if (G.crowd > 0) G.crowd -= dt * 2;
  for (let i = 0; i < LANES; i++) {
    if (G.hitFx[i] > 0) G.hitFx[i] -= dt * 4;
    if (G.lanePress[i] > 0) G.lanePress[i] -= dt;
  }
  if (G.screen !== 'play') { IN.taps.length = 0; keyTaps.length = 0; return; }

  pumpMusic();
  pumpMelody();

  const now = anow();
  const lat = outLat();
  G.danceT = (now - G.t0) / G.spb;
  if (G.ready > 0 && now >= G.t0) G.ready = 0;

  if (!G.over) {
    for (const tap of collectTaps()) judgeTap(tap);
    for (const n of G.notes) {
      if (!n.judged && now > G.t0 + n.t + lat + W_SAFE) missNote(n);
    }
    // 曲が おわった か
    if (now > G.t0 + songLen() + 1.2) {
      G.over = true;
      G.win = G.gauge > 0;
      if (G.win) {
        const r = rankOf();
        const k = G.song.key;
        if ((save.best[k] || 0) < G.score) save.best[k] = G.score;
        if ((save.rank[k] || 0) < r) save.rank[k] = r;
        storeSave();
        sfxClear(r >= 3);
      } else sfxOver();
    }
    if (G.gauge <= 0 && !G.over) {
      G.over = true; G.win = false; sfxOver();
    }
  }
}

function rankOf() {
  const max = totalNotes() * 300;
  const p = max > 0 ? (G.nPerfect * 300 + G.nGood * 150 + G.nSafe * 50) / max : 0;
  if (p >= 0.92) return 3;
  if (p >= 0.75) return 2;
  return 1;
}

// --- え ------------------------------------------------------------------------------

// おどる 女の子。pose で うでと あしを かえる。
function drawDancer(x, y, s, pose, beat, col, hair) {
  const bob = Math.sin(beat * Math.PI) * s * 0.07;
  const yy = y + bob;
  const arms = [
    [-1.0, -0.9, 1.0, -0.9],   // バンザイ
    [-1.1, 0.1, 0.9, -1.0],    // 右上げ
    [1.1, 0.1, -0.9, -1.0],    // 左上げ
    [-1.1, -0.2, 1.1, -0.2],   // よこ
    [-0.5, -1.1, 0.5, -1.1],   // ハート
    [-1.0, 0.4, 1.0, 0.4],     // したに
  ][pose % 6];
  const legK = (pose % 2) ? 1 : -1;
  // あし
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.17; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.14, yy + s * 0.42);
  ctx.lineTo(x - s * 0.14 + legK * s * 0.22, yy + s * 0.92);
  ctx.moveTo(x + s * 0.14, yy + s * 0.42);
  ctx.lineTo(x + s * 0.14 + legK * s * 0.10, yy + s * 0.92);
  ctx.stroke();
  // スカート
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.30, yy + s * 0.06);
  ctx.lineTo(x + s * 0.30, yy + s * 0.06);
  ctx.lineTo(x + s * 0.48, yy + s * 0.48);
  ctx.lineTo(x - s * 0.48, yy + s * 0.48);
  ctx.closePath(); ctx.fill();
  // からだ
  ctx.fillStyle = col;
  rr(x - s * 0.28, yy - s * 0.30, s * 0.56, s * 0.44, s * 0.16); ctx.fill();
  // うで
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, yy - s * 0.18);
  ctx.lineTo(x - s * 0.26 + arms[0] * s * 0.44, yy - s * 0.18 + arms[1] * s * 0.44);
  ctx.moveTo(x + s * 0.26, yy - s * 0.18);
  ctx.lineTo(x + s * 0.26 + arms[2] * s * 0.44, yy - s * 0.18 + arms[3] * s * 0.44);
  ctx.stroke();
  // あたま
  const hy = yy - s * 0.62;
  ctx.fillStyle = '#F6CDA8';
  circle(x, hy, s * 0.32); ctx.fill();
  // かみ（ふたつむすび）
  ctx.fillStyle = hair || '#4A3A44';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.05, s * 0.34, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  for (const sg of [-1, 1]) {
    circle(x + sg * s * 0.34, hy - s * 0.02 + Math.sin(beat * Math.PI + sg) * s * 0.06, s * 0.13);
    ctx.fill();
  }
  // かお
  ctx.fillStyle = '#2A2028';
  circle(x - s * 0.11, hy + s * 0.02, s * 0.045); ctx.fill();
  circle(x + s * 0.11, hy + s * 0.02, s * 0.045); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(x - s * 0.21, hy + s * 0.12, s * 0.06); ctx.fill();
  circle(x + s * 0.21, hy + s * 0.12, s * 0.06); ctx.fill();
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath(); ctx.arc(x, hy + s * 0.10, s * 0.08, 0.25, Math.PI - 0.25); ctx.stroke();
}

// やじるし
function arrowShape(x, y, r, lane) {
  const a = [Math.PI, Math.PI / 2, -Math.PI / 2, 0][lane];
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(r * 0.1, -r * 0.86);
  ctx.lineTo(r * 0.1, -r * 0.34);
  ctx.lineTo(-r * 0.9, -r * 0.34);
  ctx.lineTo(-r * 0.9, r * 0.34);
  ctx.lineTo(r * 0.1, r * 0.34);
  ctx.lineTo(r * 0.1, r * 0.86);
  ctx.closePath();
  ctx.restore();
}

function laneX(i) { return (i + 0.5) * (VW / LANES); }
function judgeY() { return VH - 74; }

function drawStage() {
  const s = G.song || SONGS[0];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, s.sky[0]); g.addColorStop(1, s.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // スポットライト
  const beat = G.screen === 'play' ? G.danceT : G.t * 2;
  for (let i = 0; i < 3; i++) {
    const px = VW * (0.25 + i * 0.25) + Math.sin(beat * 0.7 + i * 2) * VW * 0.10;
    const gg = ctx.createLinearGradient(px, 0, px, VH * 0.7);
    gg.addColorStop(0, 'rgba(255,255,255,0.16)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(px - 16, 0); ctx.lineTo(px + 16, 0);
    ctx.lineTo(px + 90, VH * 0.7); ctx.lineTo(px - 90, VH * 0.7);
    ctx.closePath(); ctx.fill();
  }
}

// かんきゃく。くらい かげで かいて、ペンライトだけ 光らせる。
// やじるしと まぎれない ように、色は うすく かたちは 小さく。
function drawCrowd(y) {
  const beat = G.screen === 'play' ? G.danceT : G.t * 2;
  const cols = ['#FF8FBB', '#8AD8F0', '#9AE86A', '#FFD24A', '#C8A8F0'];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const x = VW * (0.04 + i * (0.92 / (n - 1)));
    const b = Math.sin(beat * Math.PI + i * 0.9);
    const up = Math.abs(b) * 9;
    // ペンライト（ふって いる）
    ctx.strokeStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + b * 6, y - 12 - up);
    ctx.lineTo(x + b * 12, y - 30 - up);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    circle(x + b * 12, y - 30 - up, 4.5);
    ctx.fillStyle = cols[i % cols.length]; ctx.fill();
    // からだ（かげ）
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#140E28';
    circle(x, y - 8, 8); ctx.fill();
    rr(x - 10, y - 1, 20, 22, 9); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlay() {
  drawStage();

  // うしろで おどる りな と かんきゃく
  const beat = G.danceT;
  ctx.globalAlpha = 0.92;
  drawDancer(VW / 2, VH * 0.26, 60, G.pose, beat, G.song.col);
  ctx.globalAlpha = 1;
  drawCrowd(VH * 0.47);

  // レーン
  const lw = VW / LANES;
  for (let i = 0; i < LANES; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.22)';
    ctx.fillRect(i * lw, 0, lw, VH);
    if (G.lanePress[i] > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (G.lanePress[i] * 1.2) + ')';
      ctx.fillRect(i * lw, 0, lw, VH);
    }
  }

  const jy = judgeY();
  const r = Math.min(lw * 0.34, 42);
  const pxPerSec = (jy + 40) / LEAD;
  const now = anow(), lat = outLat();

  // パネル（あたり）
  for (let i = 0; i < LANES; i++) {
    ctx.globalAlpha = 0.9;
    arrowShape(laneX(i), jy, r, i);
    ctx.strokeStyle = LANE_COL[i]; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.globalAlpha = 1;
    if (G.hitFx[i] > 0) {
      ctx.globalAlpha = G.hitFx[i];
      arrowShape(laneX(i), jy, r * (1 + (1 - G.hitFx[i]) * 0.7), i);
      ctx.fillStyle = LANE_COL[i]; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ノーツ
  for (const n of G.notes) {
    if (n.judged) continue;
    const y = jy - (G.t0 + n.t + lat - now) * pxPerSec;
    if (y < -50 || y > VH + 40) continue;
    const k = clamp((y + 40) / 60, 0, 1);
    ctx.globalAlpha = k;
    arrowShape(laneX(n.lane), y, r, n.lane);
    ctx.fillStyle = LANE_COL[n.lane]; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ゆびの ばしょの めやす
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 1; i < LANES; i++) ctx.fillRect(i * lw - 1, jy - r - 8, 2, VH);
  for (let i = 0; i < LANES; i++) {
    bigText(LANE_NAME[i], laneX(i), VH - 16, 14, 'rgba(255,255,255,0.55)', null);
  }

  drawHud();

  if (G.judgeT > 0 && !G.over) {
    ctx.globalAlpha = clamp(G.judgeT * 2.6, 0, 1);
    bigText(G.judgeTx, VW / 2, jy - 86, 26, G.judgeCol);
    ctx.globalAlpha = 1;
  }
  if (G.combo >= 5 && !G.over) {
    bigText(G.combo + ' コンボ！', VW / 2, jy - 128, 22, '#FFF6C8');
  }

  if (G.ready > 0) {
    const left = G.t0 - anow();
    const n = Math.ceil(left);
    if (n >= 1 && n <= 3) bigText(String(n), VW / 2, VH * 0.5, 90, '#FFF6C8');
    else if (left <= 0.4) bigText('スタート！', VW / 2, VH * 0.5, 54, '#FFD24A');
  }

  if (G.over) drawOver();
}

function drawHud() {
  ctx.fillStyle = 'rgba(8,4,20,0.55)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = '#D8CCF0';
  ctx.fillText(G.song.name, 150, HUD / 2);

  // ゲージ
  const gw = Math.min(200, VW * 0.24), gx = VW - gw - 12, gy = HUD / 2 - 7;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(gx, gy, gw, 14, 7); ctx.fill();
  const k = G.gauge / GAUGE_MAX;
  ctx.fillStyle = k > 0.5 ? '#7AE8A0' : k > 0.25 ? '#FFD24A' : '#FF6F8A';
  rr(gx + 2, gy + 2, (gw - 4) * k, 10, 5); ctx.fill();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#D8CCF0';
  ctx.fillText('げんき', gx - 8, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawOver() {
  const r = rankOf();
  const stars = G.win ? '★'.repeat(r) + '☆'.repeat(3 - r) : '';
  drawResult(G.win, G.win ? 'クリア！ ' + stars : 'もういちど！',
    ['スコア ' + G.score + '　さいだい ' + G.maxCombo + ' コンボ',
     'パーフェクト ' + G.nPerfect + '　グッド ' + G.nGood +
       '　セーフ ' + G.nSafe + '　ミス ' + G.nMiss],
    [{ label: 'もういちど', on: () => startSong(G.si) },
     { label: 'つぎの きょく', on: () => startSong((G.si + 1) % SONGS.length), col: '#8AF0B0' },
     { label: 'きょくを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }],
    G.song.col);
}

function drawTitle() {
  drawStage();
  drawDancer(VW * 0.13, VH * 0.80, 52, Math.floor(G.t * 3) % 6, G.t * 2, '#FF8FBB');
  drawDancer(VW * 0.87, VH * 0.80, 52, Math.floor(G.t * 3 + 3) % 6, G.t * 2, '#8AD8F0', '#6A4A3A');
  drawCrowd(VH * 0.97);

  bigText('りなの', VW / 2, 34, 20, '#FFD9EC', null);
  bigText('ダンスステージ', VW / 2, 68, fitSize('ダンスステージ', VW * 0.6, 42), '#FFF6C8');
  bigText('おりてくる やじるしが パネルに かさなったら、その れつを タップ！',
          VW / 2, 104, fitSize('おりてくる やじるしが パネルに かさなったら、その れつを タップ！', VW * 0.9, 16),
          '#E8DCFF', null);

  const y = songPicker(126);

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#E8D0F8');
  bigText('あそんだ かず ' + save.plays + '　ふんだ ステップ ' + save.steps,
          VW / 2, VH - 16, 14, 'rgba(255,255,255,0.75)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

// きょくの ボタン。★の かずと むずかしさが ひと目で わかる ように する。
function songPicker(y0) {
  const cols = VW > 820 ? 5 : 4;
  const cw = Math.min(148, (VW - 48 - (cols - 1) * 10) / cols), ch = 52;
  for (let i = 0; i < SONGS.length; i++) {
    const s = SONGS[i];
    const x = 24 + (i % cols) * (cw + 10), y = y0 + Math.floor(i / cols) * (ch + 10);
    const b = button(x, y, cw, ch, () => startSong(i));
    const r = save.rank[s.key] || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    rr(b.x + 3, b.y + 3, cw, ch, 10); ctx.fill();
    ctx.fillStyle = r > 0 ? '#5A3A72' : '#3A2C58';
    rr(b.x, b.y, cw, ch, 10); ctx.fill();
    ctx.fillStyle = s.col;
    rr(b.x, b.y, cw, 5, 2.5); ctx.fill();
    bigText(s.name, b.x + cw / 2, b.y + ch * 0.34, fitSize(s.name, cw - 14, 15), '#FFF6E8', null);
    // むずかしさ（おんぷの かず）
    let d = '';
    for (let k = 0; k < 5; k++) d += k <= s.lv ? '♪' : '·';
    bigText(d, b.x + cw * 0.30, b.y + ch * 0.72, 13, 'rgba(255,255,255,0.6)', null);
    bigText(r > 0 ? '★'.repeat(r) + '☆'.repeat(3 - r) : '☆☆☆',
            b.x + cw * 0.72, b.y + ch * 0.72, 13, r > 0 ? '#FFD24A' : 'rgba(255,255,255,0.3)', null);
  }
  return y0 + Math.ceil(SONGS.length / cols) * (ch + 10);
}

function drawHowto() {
  drawStage();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① やじるしが 上から おりてくる。下の パネルに かさなった しゅんかんに タップ',
    '② タップは 画面を たてに 4つに わった どこでも いい。まん中を ねらわなくて よい',
    '③ ぴったりで パーフェクト、ちょっと ずれても グッド／セーフ。コンボが つづくと 高とくてん',
    '④ 見のがすと 「げんき」が へる。ゼロに なる まえに 曲を おわらせよう',
    '⑤ パソコンなら やじるしキー ← ↓ ↑ → でも あそべる',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#E8DCFF', null));

  // やじるしの みほん
  for (let i = 0; i < LANES; i++) {
    const x = VW / 2 + (i - 1.5) * 74;
    arrowShape(x, 288, 24, i);
    ctx.fillStyle = LANE_COL[i]; ctx.fill();
    bigText(LANE_NAME[i], x, 322, 13, '#E8DCFF', null);
  }
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
