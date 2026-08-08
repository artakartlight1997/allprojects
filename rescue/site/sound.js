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

// ゴムを ひっぱっている（ひっぱるほど 高く）
function sfxPull(k) {
  if (!A.ctx) return;
  tone(anow(), 52 + k * 16, 0.05, 0.05, 'triangle');
}
// はなした
function sfxShoot() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.14, 0.16, 400, 3600);
  tone(t, 74, 0.14, 0.10, 'triangle', A.sfx, 58);
}
// 木が こわれた
function sfxWood() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.13, 0.16, 500, 2600);
  tone(t, 55, 0.10, 0.07, 'square', A.sfx, 46);
}
// こおりが われた
function sfxIce() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.16, 0.16, 2800, 9500);
  tone(t, 93, 0.12, 0.07, 'triangle', A.sfx, 81);
}
// いしが くだけた
function sfxStone() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.22, 0.20, 120, 1600);
  tone(t, 43, 0.18, 0.10, 'square', A.sfx, 33);
}
// ぶつかった（かるい 音）
function sfxBump(v) {
  if (!A.ctx) return;
  nz(anow(), 0.05, Math.min(0.12, 0.02 + v * 0.06), 300, 1800);
}
// どうぶつを たすけた
function sfxSave() {
  if (!A.ctx) return;
  const t = anow();
  [76, 81, 84, 88].forEach((m, i) => tone(t + i * 0.055, m, 0.22, 0.13, 'triangle'));
}
// たまが なくなった
function sfxMiss() {
  if (!A.ctx) return;
  tone(anow(), 60, 0.24, 0.11, 'square', A.sfx, 48);
}
function sfxEnd(win) {
  if (!A.ctx) return;
  const t = anow();
  const ms = win ? [72, 76, 79, 84, 88] : [72, 69, 65, 60];
  ms.forEach((m, i) => tone(t + i * 0.12, m, 0.36, 0.17, 'triangle'));
  if (win) pad(t, [60, 64, 67, 72], 1.6, 0.30);
}
function sfxTest() {
  if (!A.ctx) return;
  const t = anow();
  [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.10, m, 0.22, 0.18, 'triangle'));
  kick(t, 0.7); kick(t + 0.3, 0.7);
}

// --- BGM ----------------------------------------------------------------------

const BGM = {
  prog: [[0, 7, 5, 3], [0, 5, 9, 7], [0, 3, 7, 5]],
  min: [[3], [2], [1]],
};

let bgmOn = false, bgmRoot = 60, bgmSet = 0, bgmBpm = 100, bgmHot = 0;

function bgmStart(stage) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = stage % BGM.prog.length;
  bgmRoot = 57 + (stage % 4) * 2;
  bgmBpm = 96 + (stage % 5) * 4;
  bgmHot = 0;
  A.bgmT = anow() + 0.15;
  A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
function bgmHeat(v) { bgmHot = v; }

function bgmPump() {
  if (!bgmOn || !A.ctx) return;
  const spb = 60 / bgmBpm;
  const barLen = spb * 4;
  while (A.bgmT + A.bgmBar * barLen < anow() + 1.2) {
    const t0 = A.bgmT + A.bgmBar * barLen;
    if (t0 + barLen > anow()) bgmBar(t0, A.bgmBar, spb);
    A.bgmBar++;
  }
}

function bgmBar(t0, bar, spb) {
  const prog = BGM.prog[bgmSet], mins = BGM.min[bgmSet];
  const ci = bar % 4;
  const r = bgmRoot + prog[ci];
  const third = mins.indexOf(ci) >= 0 ? 3 : 4;
  kick(t0, 0.6);
  kick(t0 + spb * 2, 0.5);
  nz(t0 + spb, 0.07, 0.11, 1100, 4200, A.mus);
  nz(t0 + spb * 3, 0.07, 0.11, 1100, 4200, A.mus);
  tone(t0, r - 24, spb * 1.7, 0.15, 'triangle', A.mus);
  tone(t0 + spb * 2, r - 24 + 7, spb * 1.7, 0.13, 'triangle', A.mus);
  pad(t0, [r, r + third, r + 7], spb * 3.8, 0.13);
  const mel = [0, 7, 12, 7, third, 7];
  for (let i = 0; i < 6; i++) {
    tone(t0 + i * (spb * 4 / 6), r + 12 + mel[i], spb * 0.5, 0.05, 'sine', A.mus);
  }
}
