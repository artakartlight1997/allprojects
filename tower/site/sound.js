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

// あしばで はねた。テンポよく のぼれている きもちよさを 出したいので みじかく。
function sfxHop() {
  if (!A.ctx) return;
  tone(anow(), 74, 0.11, 0.15, 'triangle', A.sfx, 86);
}
// バネの あしば。もっと 高く とぶので 音も 高く のばす。
function sfxSpring() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 68, 0.30, 0.22, 'square', A.sfx, 96);
  nz(t, 0.08, 0.10, 600, 3000, A.sfx);
}
function sfxBreak() {
  if (!A.ctx) return;
  nz(anow(), 0.16, 0.24, 300, 3600, A.sfx);
  tone(anow(), 54, 0.14, 0.12, 'square', A.sfx, 40);
}
function sfxStar() {
  if (!A.ctx) return;
  const t = anow();
  [0, 7, 12].forEach((d, i) => tone(t + i * 0.045, 84 + d, 0.20, 0.15, 'triangle', A.sfx));
}
function sfxItem() {
  if (!A.ctx) return;
  const t = anow();
  [0, 4, 7, 12, 16].forEach((d, i) => tone(t + i * 0.05, 76 + d, 0.26, 0.19, 'square', A.sfx));
}
// おともだちに 会った。あたたかい わおん。
function sfxFriend() {
  if (!A.ctx) return;
  const t = anow();
  pad(t, [67, 71, 74, 79], 0.9, 0.30);
  tone(t + 0.06, 79, 0.4, 0.16, 'triangle', A.sfx);
}
// ママの さけび。おどろかせたいので すこし 大きく、でも こわくない ように。
function sfxMama() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 64, 0.34, 0.24, 'square', A.sfx, 71);
  tone(t + 0.16, 71, 0.30, 0.20, 'square', A.sfx, 66);
}
// ママが 近づいてきた ドキドキ
function sfxNear() {
  if (!A.ctx) return;
  tone(anow(), 45, 0.22, 0.20, 'sawtooth', A.sfx, 41);
}
function sfxCaught() {
  if (!A.ctx) return;
  const t = anow();
  [0, -2, -5, -9].forEach((d, i) => tone(t + i * 0.13, 69 + d, 0.42, 0.24, 'square', A.sfx));
  nz(t, 0.3, 0.2, 200, 2400, A.sfx);
}
function sfxTop() {
  if (!A.ctx) return;
  const t = anow() + 0.04;
  [0, 4, 7, 12, 16, 19, 24].forEach((d, i) => {
    tone(t + i * 0.13, 72 + d, 0.7, 0.26, 'triangle', A.sfx);
    if (i % 2 === 0) kick(t + i * 0.13, 0.5);
  });
}
function sfxTest() {
  audioStart();
  if (!A.ctx) return;
  const t = anow() + 0.05;
  [0, 4, 7, 12].forEach((d, i) => {
    kick(t + i * 0.22);
    tone(t + i * 0.22, 74 + d, 0.3, 0.26, 'triangle', A.sfx);
  });
  pad(t, [62, 66, 69], 1.1, 0.16);
}

// --- BGM ----------------------------------------------------------------------
//
// 1小節ずつ 先に 予約する。鳴らす しゅんかんに 作ると スマホでは かならず 遅れる。
// のぼる ゲームなので、ずっと 上へ 上がっていく かんじの アルペジオに する。

const BGM = {
  prog: [[0, 5, 7, 5], [0, 9, 5, 7], [0, 7, 9, 5], [0, 3, 8, 7]],
  min: [[], [1], [2], [0, 1, 2, 3]],
};

let bgmOn = false, bgmRoot = 62, bgmSet = 0, bgmBpm = 126, bgmHot = 0;

function bgmStart(stage) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = stage % BGM.prog.length;
  bgmRoot = 60 + (stage % 3) * 2;
  bgmBpm = 126 + stage * 4;
  bgmHot = 0;
  A.bgmT = anow() + 0.15;
  A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
// ママが 近いと 曲を あつくする（ドキドキを 音でも つたえる）
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
  const hot = bgmHot;
  // ドラム
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * spb, 0.7);
    if (i === 1 || i === 3) nz(t0 + i * spb, 0.10, 0.20, 900, 4200, A.mus);
    nz(t0 + i * spb + spb / 2, 0.03, 0.06 + hot * 0.05, 6000, 11000, A.mus);
    if (hot > 0.5 && i % 2 === 1) kick(t0 + i * spb + spb / 2, 0.45);
  }
  // ベース と わおん
  tone(t0, r - 24, spb * 1.6, 0.20, 'sawtooth', A.mus);
  tone(t0 + spb * 2, r - 24, spb * 0.8, 0.17, 'sawtooth', A.mus);
  tone(t0 + spb * 3, r - 24 + 7, spb * 0.8, 0.15, 'sawtooth', A.mus);
  pad(t0, [r, r + third, r + 7], spb * 3.8, 0.13);
  // 上へ 上へ のぼる アルペジオ
  const arp = [0, third, 7, 12, third + 12, 19, 12, 7];
  for (let i = 0; i < 8; i++) {
    tone(t0 + i * (spb / 2), r + 12 + arp[i], spb * 0.5, 0.055 + hot * 0.02, 'triangle', A.mus);
  }
}
