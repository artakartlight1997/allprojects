// おと。ファイルは 1つも つかわず、その場で 波を 作る。
//
// スマホ（とくに iPhone）は 横の 消音スイッチを 切っていると WebAudio が
// まるごと 無音に なる。無音の 音楽を 1つ 流しっぱなしに すると
// 「動画あつかい」に かわって、スイッチを 切っていても 鳴る。

'use strict';

const A = { ctx: null, mus: null, sfx: null, noise: null, keep: null, bgmT: 0, bgmBar: 0 };

function silentWav(sec) {
  const sr = 8000, n = Math.floor(sr * sec);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}

function unmuteIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  if (A.keep) { const p = A.keep.play(); if (p && p.catch) p.catch(() => {}); return; }
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.loop = true; el.volume = 0.02;
    el.src = silentWav(1);
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    A.keep = el;
  } catch (e) {}
}

function audioStart() {
  unmuteIOS();
  if (A.ctx) {
    if (A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    return;
  }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  A.ctx = new C({ latencyHint: 'interactive' });
  A.mus = A.ctx.createGain(); A.mus.gain.value = 0.22; A.mus.connect(A.ctx.destination);
  A.sfx = A.ctx.createGain(); A.sfx.gain.value = 0.45; A.sfx.connect(A.ctx.destination);
  if (A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
}

function anow() { return A.ctx ? A.ctx.currentTime : 0; }
function soundOK() { return !!(A.ctx && A.ctx.state === 'running'); }
function safeT(t) { const n = A.ctx.currentTime; return (!(t >= n)) ? n + 0.0005 : t; }
function mid2f(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function noiseBuf() {
  if (A.noise) return A.noise;
  const n = Math.floor(A.ctx.sampleRate * 0.5);
  const b = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  A.noise = b;
  return b;
}

function nz(t, dur, v, lo, hi, dst) {
  if (!A.ctx) return;
  t = safeT(t);
  const s = A.ctx.createBufferSource();
  s.buffer = noiseBuf();
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = (lo + hi) / 2;
  f.Q.value = Math.max(0.4, (lo + hi) / 2 / Math.max(1, hi - lo));
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dst || A.sfx);
  s.start(t); s.stop(t + dur + 0.02);
}

// のばして 切る つつみ。切りっぱなしだと 曲が すきまだらけに なる。
function tone(t, m, dur, v, type, dst, m2) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type || 'triangle';
  o.frequency.setValueAtTime(mid2f(m), t);
  if (m2 !== undefined) o.frequency.exponentialRampToValueAtTime(mid2f(m2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.012);
  g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dst || A.sfx);
  o.start(t); o.stop(t + dur + 0.05);
}

function pad(t, ms, dur, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const lv = v / ms.length;
  for (const m of ms) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mid2f(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.06);
    g.gain.setValueAtTime(lv, t + dur * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.mus);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

function kick(t, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v || 0.8, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(A.mus);
  o.start(t); o.stop(t + 0.24);
}


// --- こうかおん ---------------------------------------------------------------

// --- こうかおん ---------------------------------------------------------------

function sfxShot() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 86, 0.07, 0.10, 'square');
  tone(t, 74, 0.10, 0.07, 'triangle');
  nz(t, 0.05, 0.05, 2400, 7000);
}

function sfxLaser() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 92, 0.14, 0.10, 'sawtooth', null, 68);
  nz(t, 0.12, 0.06, 1600, 6000);
}

// てきに あたった
function sfxBoom(big) {
  if (!A.ctx) return;
  const t = anow();
  nz(t, big ? 0.42 : 0.16, big ? 0.34 : 0.16, 60, big ? 2600 : 3600);
  tone(t, big ? 40 : 52, big ? 0.34 : 0.14, big ? 0.28 : 0.14, 'sine', null, big ? 26 : 34);
}

// あたった（プレイヤー）
function sfxHurt() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 62, 0.26, 0.26, 'sawtooth', null, 38);
  nz(t, 0.24, 0.22, 100, 1800);
}

// アイテム
function sfxItem() {
  if (!A.ctx) return;
  const t = anow();
  [72, 79, 84, 88].forEach((m, i) => tone(t + i * 0.05, m, 0.14, 0.13, 'triangle'));
}

// バリアで はじいた
function sfxGuard() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 90, 0.12, 0.12, 'sine', null, 96);
  nz(t, 0.08, 0.08, 3000, 9000);
}

// ボス とうじょう
function sfxBossIn() {
  if (!A.ctx) return;
  const t = anow();
  [43, 43, 45, 47].forEach((m, i) => {
    tone(t + i * 0.16, m, 0.22, 0.24, 'sawtooth');
    if (i % 2 === 0) kick(t + i * 0.16, 0.7);
  });
  nz(t + 0.64, 0.5, 0.16, 80, 1400);
}

// リナパパ ボス（ちょっと まぬけな ファンファーレ）
function sfxPapa() {
  if (!A.ctx) return;
  const t = anow();
  [55, 59, 62, 59, 55].forEach((m, i) => tone(t + i * 0.13, m, 0.18, 0.20, 'square'));
  nz(t + 0.65, 0.28, 0.14, 200, 2200);
}

function sfxBossDown() {
  if (!A.ctx) return;
  const t = anow();
  for (let i = 0; i < 6; i++) nz(t + i * 0.11, 0.24, 0.24 - i * 0.02, 60, 3000 - i * 300);
  [72, 76, 79, 84].forEach((m, i) => tone(t + 0.7 + i * 0.12, m, 0.3, 0.20, 'triangle'));
}

function sfxEnd(win) {
  if (!A.ctx) return;
  const t = anow();
  if (win) [72, 76, 79, 84, 88].forEach((m, i) => tone(t + i * 0.13, m, 0.4, 0.22, 'triangle'));
  else [67, 64, 60, 55].forEach((m, i) => tone(t + i * 0.17, m, 0.36, 0.20, 'sawtooth'));
}

function sfxTick() {
  if (!A.ctx) return;
  tone(anow(), 84, 0.07, 0.14, 'square');
}

function sfxTest() {
  if (!A.ctx) return;
  const t = anow();
  sfxShot();
  setTimeout(() => sfxItem(), 260);
  setTimeout(() => sfxBoom(false), 620);
  setTimeout(() => sfxBoom(true), 900);
}

// --- BGM ----------------------------------------------------------------------

const BGM = {
  prog: [[0, 5, 3, 7], [0, 7, 3, 5], [0, 8, 5, 3]],
  min: [[0, 1, 2, 3], [0, 2], [0, 1, 3]],
};

let bgmOn = false, bgmRoot = 55, bgmSet = 0, bgmBpm = 132, bgmHot = 0;

function bgmStart(stage) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = stage % BGM.prog.length;
  bgmRoot = 53 + (stage % 4) * 2;
  bgmBpm = 126 + (stage % 5) * 6;
  bgmHot = 0;
  A.bgmT = anow() + 0.15;
  A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
function bgmHeat(v) { bgmHot = v; }

function bgmPump() {
  if (!bgmOn || !A.ctx) return;
  const spb = 60 / (bgmBpm * (1 + bgmHot * 0.12));
  const barLen = spb * 4;
  while (A.bgmT + A.bgmBar * barLen < anow() + 1.2) {
    const t0 = A.bgmT + A.bgmBar * barLen;
    if (t0 + barLen > anow()) bgmBar(t0, A.bgmBar, spb);
    A.bgmBar++;
  }
}

function bgmBar(t0, bar, spb) {
  // ★ パロディウス風に、行進曲みたいな はずむ 感じ に する。
  //   ベースは「ブン・パッ」の オンパ、うわものは 木きんの ような
  //   みじかい 音。まじめな 曲より コミカルに。
  const prog = BGM.prog[bgmSet], mins = BGM.min[bgmSet];
  const ci = bar % 4;
  const r = bgmRoot + prog[ci];
  const third = mins.indexOf(ci) >= 0 ? 3 : 4;

  for (let i = 0; i < 4; i++) {
    // ドン（1・3拍）と タン（2・4拍）
    if (i % 2 === 0) kick(t0 + i * spb, 0.8);
    else nz(t0 + i * spb, 0.09, 0.18, 900, 4600, A.mus);
    nz(t0 + i * spb + spb / 2, 0.03, 0.06, 6000, 12000, A.mus);
  }

  // オンパ ベース（うら拍で 和音を ポン）
  for (let i = 0; i < 4; i++) {
    tone(t0 + i * spb, r - 24, spb * 0.30, 0.20, 'triangle', A.mus);
    for (const m of [r - 12, r - 12 + third, r - 5]) {
      tone(t0 + i * spb + spb * 0.5, m, spb * 0.22, 0.07, 'square', A.mus);
    }
  }

  // 木きん風の メロディ（いつも 鳴る。はずむ）
  const mel = [12, 12, 14, 16, 16, 14, 12, 7];
  const len = [0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 0.75, 0.25];
  let at = 0;
  for (let i = 0; i < mel.length; i++) {
    const d = len[i] * spb * 2;
    tone(t0 + at, r + mel[i] + (bar % 2 ? 0 : 0), d * 0.55, 0.13, 'triangle', A.mus);
    tone(t0 + at, r + mel[i] + 12, d * 0.30, 0.05, 'sine', A.mus);
    at += d;
  }

  if (bgmHot) {
    // ボス中は うらで はやい 3連
    for (let i = 0; i < 12; i++) {
      tone(t0 + i * (spb / 3), r - 12 + (i % 3 === 0 ? 0 : third), spb * 0.18, 0.07, 'square', A.mus);
    }
  }
}
