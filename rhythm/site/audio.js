// おと。音のファイルは 1つも 使わず、その場で 波を 作って 鳴らしている。
//
// リズムゲームは 「いつ鳴ったか」が すべてなので、時計は 画面の コマ送りでは なく
// AudioContext の 時計（currentTime）を つかう。
// 画面は カクついても、音と はんてい は ずれない。
//
// 音は 少し 先まで まとめて 予約する（さきよみスケジューラ）。
// 鳴らす その 瞬間に 作ると、スマホでは かならず 遅れる。

'use strict';

const A = {
  ctx: null,
  music: null,      // 曲（すこし 小さめ）
  sfx: null,        // たたいた 音（はっきり）
  noise: null,
  ready: false,
};

function audioStart() {
  if (A.ctx) {
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return;
  }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  A.ctx = new C({ latencyHint: 'interactive' });
  A.music = A.ctx.createGain();
  A.music.gain.value = 0.32;
  A.sfx = A.ctx.createGain();
  A.sfx.gain.value = 0.5;
  A.music.connect(A.ctx.destination);
  A.sfx.connect(A.ctx.destination);
  A.ready = true;
}

function anow() { return A.ctx ? A.ctx.currentTime : 0; }

// 音を 出してから 耳に とどくまでの ずれ。ブラウザが 教えてくれる ときは それを つかう。
function outLatency() {
  if (!A.ctx) return 0.05;
  const o = A.ctx.outputLatency;
  if (typeof o === 'number' && o > 0 && o < 0.5) return o;
  const b = A.ctx.baseLatency;
  if (typeof b === 'number' && b > 0 && b < 0.5) return b + 0.02;
  return 0.05;
}

function noiseBuf() {
  if (A.noise) return A.noise;
  const n = Math.floor(A.ctx.sampleRate * 0.5);
  const b = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  A.noise = b;
  return b;
}

function mid2f(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// 予約は かならず「いま より あと」。タブを 切りかえて 戻ったときなど、
// もう すぎた 時こく を わたすと WebAudio は 例外を なげて 画面が 止まる。
function safeT(t) {
  const n = A.ctx.currentTime;
  return (!(t >= n)) ? n + 0.0005 : t;
}

// --- たいこ の たぐい -----------------------------------------------------------

function kick(t, v, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.9, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g); g.connect(dst || A.music);
  o.start(t); o.stop(t + 0.26);
}

function nzHit(t, dur, v, hp, lp, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const s = A.ctx.createBufferSource();
  s.buffer = noiseBuf();
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = (hp + lp) / 2;
  f.Q.value = Math.max(0.4, (hp + lp) / 2 / Math.max(1, lp - hp));
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dst || A.music);
  s.start(t); s.stop(t + dur + 0.02);
}

function snare(t, v, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  nzHit(t, 0.13, (v || 0.5) * 0.8, 900, 4200, dst);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(210, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime((v || 0.5) * 0.5, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g); g.connect(dst || A.music);
  o.start(t); o.stop(t + 0.12);
}

function hat(t, v, dst) { nzHit(t, 0.035, (v || 0.22), 6000, 12000, dst); }
function stick(t, v) { nzHit(t, 0.03, v || 0.4, 1800, 5000, A.sfx); }

function tom(t, f, v, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.6, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(dst || A.music);
  o.start(t); o.stop(t + 0.32);
}

// --- 音てい の ある 音 ----------------------------------------------------------

// メロディ。2つの 波を すこし ずらして 重ねると あつみが 出る。
function pluck(t, m, dur, v, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const f = mid2f(m);
  const g = A.ctx.createGain();
  const lp = A.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(f * 8, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [type, det, amp] of [['triangle', 0, 1], ['square', 7, 0.35]]) {
    const o = A.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = det;
    const g2 = A.ctx.createGain();
    g2.gain.value = amp;
    o.connect(g2); g2.connect(lp);
    o.start(t); o.stop(t + dur + 0.05);
  }
  lp.connect(g); g.connect(dst || A.music);
}

function bass(t, m, dur, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = mid2f(m);
  const lp = A.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.28, t + 0.01);
  g.gain.setValueAtTime(v || 0.28, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(A.music);
  o.start(t); o.stop(t + dur + 0.05);
}

function chord(t, ms, dur, v) {
  if (!A.ctx) return;
  t = safeT(t);
  for (const m of ms) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mid2f(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime((v || 0.1) / ms.length, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.music);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

// --- たたいた ときの 音 ---------------------------------------------------------

function sfxHit(kind, good) {
  if (!A.ctx) return;
  const t = anow() + 0.001;
  if (kind === 'punch') {
    nzHit(t, 0.09, 0.55, 300, 2400, A.sfx);
    tom(t, 120, 0.55, A.sfx);
  } else if (kind === 'jump') {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(A.sfx);
    o.start(t); o.stop(t + 0.16);
  } else if (kind === 'pop') {
    nzHit(t, 0.05, 0.4, 1200, 4000, A.sfx);
    pluck(t, 84, 0.12, 0.28, A.sfx);
  } else if (kind === 'taiko') {
    tom(t, 165, 0.7, A.sfx);
    nzHit(t, 0.05, 0.3, 500, 3000, A.sfx);
  } else {
    nzHit(t, 0.06, 0.4, 700, 3500, A.sfx);
    pluck(t, 79, 0.1, 0.24, A.sfx);
  }
  if (good) {
    // ピッタリ の ときだけ きらっと 上に のる
    pluck(t + 0.02, 96, 0.16, 0.16, A.sfx);
  }
}

function sfxMiss() {
  if (!A.ctx) return;
  const t = anow() + 0.001;
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(80, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(A.sfx);
  o.start(t); o.stop(t + 0.22);
}

function sfxFanfare(rank) {
  if (!A.ctx) return;
  const t = anow() + 0.05;
  const up = [0, 4, 7, 12, 16];
  const root = rank >= 2 ? 72 : rank >= 1 ? 67 : 60;
  const n = rank >= 2 ? 5 : rank >= 1 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    pluck(t + i * 0.13, root + up[i], 0.5, 0.3, A.sfx);
  }
  if (rank < 1) {
    pluck(t, root, 0.5, 0.3, A.sfx);
    pluck(t + 0.16, root - 3, 0.6, 0.3, A.sfx);
  }
}

// --- 曲を ならべる --------------------------------------------------------------
//
// 16分の ますめ を 文字で 書く。'x'=バスドラム 's'=スネア 'h'=ハイハット

const DRUM = {
  basic: { k: 'x.......x.......', s: '....x.......x...', h: 'h.h.h.h.h.h.h.h.' },
  march: { k: 'x...x...x...x...', s: '..s...s...s...s.', h: 'hhhhhhhhhhhhhhhh' },
  funk:  { k: 'x.....x...x.....', s: '....x.......x...', h: 'h.hhh.hhh.hhh.hh' },
  taiko: { k: 'x...x...x...x...', s: '................', h: '................' },
  disco: { k: 'x...x...x...x...', s: '....x.......x...', h: '..h...h...h...h.' },
};

const S = {
  bpm: 120,
  t0: 0,              // ビート 0 の 時こく（AudioContext の 時計）
  bars: 0,
  schedBar: 0,
  song: null,         // { drum, prog, root, mel }
  notePitch: null,    // 面の おてほんメロディ（たたく 音の 高さ）
  playing: false,
};

function beatNow() { return A.ctx ? (A.ctx.currentTime - S.t0) * S.bpm / 60 : 0; }
function beatAt(t) { return (t - S.t0) * S.bpm / 60; }
function timeOfBeat(b) { return S.t0 + b * 60 / S.bpm; }

function songStart(song, bars, startIn) {
  S.song = song;
  S.bpm = song.bpm;
  S.bars = bars;
  S.schedBar = 0;
  S.t0 = anow() + (startIn === undefined ? 0.25 : startIn);
  S.playing = true;
}

function songStop() { S.playing = false; }

// 1小節ぶんを 予約する
function schedBar(bar) {
  if (!A.ctx || !S.song) return;
  const sp = S.song;
  const t0 = timeOfBeat(bar * 4);
  const spb = 60 / S.bpm;
  const step = spb / 4;                       // 16分
  const intro = sp.intro === undefined ? 2 : sp.intro;
  if (t0 + 4 * spb < anow()) return;          // もう すぎた 小節は 鳴らさない

  // カウント（はじめの 2小節）
  if (bar < intro) {
    for (let i = 0; i < 4; i++) stickAt(t0 + i * spb, i === 0 ? 0.45 : 0.3);
    if (bar === intro - 1) for (let i = 0; i < 4; i++) hat(t0 + i * spb + spb / 2, 0.14);
    return;
  }

  const d = DRUM[sp.drum] || DRUM.basic;
  for (let i = 0; i < 16; i++) {
    const t = t0 + i * step;
    if (d.k[i] === 'x') kick(t, 0.85);
    if (d.s[i] === 's' || d.s[i] === 'x') snare(t, 0.42);
    if (d.h[i] === 'h') hat(t, i % 4 === 0 ? 0.2 : 0.12);
  }

  // ベースと わおん
  const ci = (bar - intro) % sp.prog.length;
  const r = sp.root + sp.prog[ci];
  bass(t0, r - 12, spb * 0.9, 0.3);
  bass(t0 + spb * 2, r - 12, spb * 0.45, 0.26);
  bass(t0 + spb * 3, r - 12 + 7, spb * 0.45, 0.22);
  chord(t0, [r, r + (sp.min && sp.min.indexOf(ci) >= 0 ? 3 : 4), r + 7], spb * 3.4, 0.09);
}

function stickAt(t, v) { nzHit(t, 0.03, v || 0.4, 1800, 5000, A.music); }

// 画面の コマごとに 呼ぶ。1小節 さきまで 予約しておく。
function songPump() {
  if (!S.playing || !A.ctx) return;
  const ahead = beatNow() + 5;
  while (S.schedBar * 4 < ahead && S.schedBar < S.bars) {
    schedBar(S.schedBar);
    S.schedBar++;
  }
}
