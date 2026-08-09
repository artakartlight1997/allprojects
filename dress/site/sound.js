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

// --- こうかおん ------------------------------------------------------------------

function sfxTap() {
  if (!A.ctx) return;
  tone(anow(), 74, 0.06, 0.08, 'triangle', A.sfx, 79);
}
function sfxPop() {
  if (!A.ctx) return;
  tone(anow(), 67, 0.09, 0.09, 'triangle', A.sfx, 76);
}
function sfxOk() {
  if (!A.ctx) return;
  const t = anow();
  [76, 81, 84].forEach((m, i) => tone(t + i * 0.055, m, 0.16, 0.13, 'triangle'));
}
function sfxNg() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 58, 0.20, 0.13, 'square', A.sfx, 50);
  nz(t, 0.14, 0.10, 200, 1200);
}
function sfxGet() {
  if (!A.ctx) return;
  const t = anow();
  [72, 79, 84, 88].forEach((m, i) => tone(t + i * 0.06, m, 0.22, 0.13, 'triangle'));
}
function sfxLevel() {
  if (!A.ctx) return;
  const t = anow();
  [60, 64, 67, 72, 76, 79].forEach((m, i) => tone(t + i * 0.07, m, 0.28, 0.14, 'triangle'));
  pad(t, [48, 55, 60], 1.1, 0.22);
}
function sfxClear(perfect) {
  if (!A.ctx) return;
  const t = anow();
  const ms = perfect ? [72, 76, 79, 84, 88, 91] : [72, 76, 79, 84];
  ms.forEach((m, i) => tone(t + i * 0.11, m, 0.34, 0.16, 'triangle'));
  pad(t, [48, 55, 60, 64], 1.6, 0.26);
}
function sfxOver() {
  if (!A.ctx) return;
  const t = anow();
  [67, 63, 58, 51].forEach((m, i) => tone(t + i * 0.14, m, 0.40, 0.15, 'triangle'));
}
function sfxTick() {
  if (!A.ctx) return;
  tone(anow(), 86, 0.04, 0.06, 'square');
}
function sfxTest() {
  if (!A.ctx) return;
  const t = anow();
  [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.10, m, 0.22, 0.18, 'triangle'));
  kick(t, 0.7); kick(t + 0.3, 0.7);
}

// --- BGM ------------------------------------------------------------------------
//
// 曲の ファイルは 持たず、コード進行から その場で 組み立てる。
// 1小節ずつ 先に 予約するので、切れ目なく つながる。

const BGM = {
  prog: [[0, 5, 3, 7], [0, 4, 5, 7]],
  min: [[], []],
};

let bgmOn = false, bgmRoot = 62, bgmSet = 0, bgmBpm = 92, bgmHot = 0;

function bgmStart(n) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = (n || 0) % BGM.prog.length;
  bgmRoot = 62 + ((n || 0) % 3) * 2;
  bgmBpm = 92 + ((n || 0) % 4) * 4;
  bgmHot = 0;
  A.bgmT = anow() + 0.15;
  A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
function bgmHeat(v) { bgmHot = v; }

function bgmPump() {
  if (!bgmOn || !A.ctx) return;
  const spb = 60 / (bgmBpm * (1 + bgmHot * 0.10));
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
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * spb, 0.45);
    if (i === 1 || i === 3) nz(t0 + i * spb, 0.08, 0.14, 900, 4200, A.mus);
    nz(t0 + i * spb + spb / 2, 0.03, 0.045, 6000, 11000, A.mus);
  }
  for (let i = 0; i < 8; i++) {
    tone(t0 + i * (spb / 2), r - 24 + (i % 4 === 2 ? 7 : 0), spb * 0.44, 0.09, 'square', A.mus);
  }
  pad(t0, [r, r + third, r + 7], spb * 3.8, 0.12);
  const mel = [12, 7, third, 12, 16, 7];
  for (let i = 0; i < 6; i++) {
    if (bgmHot < 0.5 && i % 2 === 1) continue;
    tone(t0 + i * (spb * 4 / 6), r + mel[i], spb * 0.5, 0.055, 'triangle', A.mus);
  }
}
