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

// エンジン。ずっと 鳴らしっぱなしに して、はやさで 高さと 大きさを かえる。
// 1つ 1つ 音を 作ると 数が 多すぎて 重く なるので、
// **鳴らしっぱなしの 発しん器を 2つ**だけ 用意して つまみを うごかす。
const ENG = { on: false, o1: null, o2: null, g: null, f: null, nz: null, ng: null };

function engStart() {
  if (!A.ctx || ENG.on) return;
  const t = A.ctx.currentTime;
  ENG.g = A.ctx.createGain(); ENG.g.gain.value = 0.0001;
  ENG.f = A.ctx.createBiquadFilter();
  ENG.f.type = 'lowpass'; ENG.f.frequency.value = 900; ENG.f.Q.value = 3;
  ENG.g.connect(A.sfx);
  ENG.f.connect(ENG.g);
  ENG.o1 = A.ctx.createOscillator(); ENG.o1.type = 'sawtooth';
  ENG.o2 = A.ctx.createOscillator(); ENG.o2.type = 'square';
  const g2 = A.ctx.createGain(); g2.gain.value = 0.35;
  ENG.o1.connect(ENG.f);
  ENG.o2.connect(g2); g2.connect(ENG.f);
  ENG.o1.frequency.value = 70; ENG.o2.frequency.value = 35;
  ENG.o1.start(t); ENG.o2.start(t);
  // タイヤと 風の ざらざら
  ENG.nz = A.ctx.createBufferSource();
  ENG.nz.buffer = noiseBuf(); ENG.nz.loop = true;
  ENG.ng = A.ctx.createGain(); ENG.ng.gain.value = 0.0001;
  const nf = A.ctx.createBiquadFilter();
  nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.7;
  ENG.nz.connect(nf); nf.connect(ENG.ng); ENG.ng.connect(A.sfx);
  ENG.nz.start(t);
  ENG.on = true;
}

// sp 0〜1（はやさ）、slip 0〜1（すべっている ぐあい）
function engSet(sp, slip, alive) {
  if (!A.ctx || !ENG.on) return;
  const t = A.ctx.currentTime;
  const v = alive ? 0.05 + sp * 0.10 : 0.0001;
  ENG.g.gain.setTargetAtTime(v, t, 0.06);
  ENG.o1.frequency.setTargetAtTime(58 + sp * 155, t, 0.05);
  ENG.o2.frequency.setTargetAtTime(29 + sp * 78, t, 0.05);
  ENG.f.frequency.setTargetAtTime(520 + sp * 1500, t, 0.08);
  ENG.ng.gain.setTargetAtTime(alive ? 0.008 + slip * 0.055 : 0.0001, t, 0.05);
}

function engStop() {
  if (!A.ctx || !ENG.on) return;
  ENG.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.08);
  ENG.ng.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.08);
}

// カウントダウン 3・2・1（音が 上がる）→ スタート
function sfxCount(n) {
  if (!A.ctx) return;
  tone(anow(), n > 0 ? 69 : 81, n > 0 ? 0.14 : 0.42, 0.22, 'square');
}
// アイテムの はこを とった
function sfxBox() {
  if (!A.ctx) return;
  const t = anow();
  [76, 80, 83, 88].forEach((m, i) => tone(t + i * 0.045, m, 0.11, 0.13, 'triangle'));
}
// ダッシュ！
function sfxDash() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.45, 0.30, 300, 5000);
  tone(t, 52, 0.34, 0.16, 'sawtooth', A.sfx, 76);
}
// バナナを おいた
function sfxDrop() {
  if (!A.ctx) return;
  tone(anow(), 55, 0.10, 0.13, 'sine', A.sfx, 44);
}
// こうらを なげた
function sfxShell() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 84, 0.16, 0.13, 'square', A.sfx, 72);
  nz(t, 0.12, 0.10, 1200, 4000);
}
// ぶつかった・すべった
function sfxSpin() {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.34, 0.26, 200, 2600);
  tone(t, 60, 0.30, 0.14, 'square', A.sfx, 40);
}
// 草に 入った（1回だけ 鳴らす）
function sfxGrass() {
  if (!A.ctx) return;
  nz(anow(), 0.16, 0.12, 500, 2400);
}
// 1しゅう まわった
function sfxLap() {
  if (!A.ctx) return;
  const t = anow();
  [72, 79].forEach((m, i) => tone(t + i * 0.09, m, 0.18, 0.16, 'triangle'));
}
// ゴール（1い は はなやかに）
function sfxGoal(win) {
  if (!A.ctx) return;
  const t = anow();
  const ms = win ? [72, 76, 79, 84, 88] : [72, 74, 76, 79];
  ms.forEach((m, i) => tone(t + i * 0.11, m, 0.34, 0.18, 'triangle'));
  if (win) pad(t, [60, 64, 67, 72], 1.5, 0.30);
}
// ♪音 ボタン
function sfxTest() {
  if (!A.ctx) return;
  const t = anow();
  [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.10, m, 0.22, 0.20, 'triangle'));
  kick(t, 0.8); kick(t + 0.2, 0.8);
}

// --- BGM ----------------------------------------------------------------------
//
// レースなので はしっている あいだ ずっと 走り つづける ビート。
// さいご の 1しゅうに 入ると 少し はやく なる（bgmHeat）。

const BGM = {
  prog: [[0, 0, 5, 7], [0, 3, 5, 7], [0, 7, 3, 5]],
  min: [[], [1, 3], [2]],
};

let bgmOn = false, bgmRoot = 57, bgmSet = 0, bgmBpm = 138, bgmHot = 0;

function bgmStart(stage) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = stage % BGM.prog.length;
  bgmRoot = 55 + (stage % 4) * 2;
  bgmBpm = 132 + (stage % 5) * 4;
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
    kick(t0 + i * spb, 0.75);
    if (i === 1 || i === 3) nz(t0 + i * spb, 0.09, 0.18, 1000, 4600, A.mus);
    nz(t0 + i * spb + spb / 2, 0.028, 0.05, 6500, 11000, A.mus);
  }
  // はしる ベース（8分）
  for (let i = 0; i < 8; i++) {
    const m = r - 24 + (i % 4 === 2 ? 7 : 0);
    tone(t0 + i * (spb / 2), m, spb * 0.44, 0.17, 'sawtooth', A.mus);
  }
  pad(t0, [r, r + third, r + 7], spb * 3.8, 0.11);
  if (bgmHot > 0) {
    const arp = [0, third, 7, 12, 7, third];
    for (let i = 0; i < 6; i++) {
      tone(t0 + i * (spb * 4 / 6), r + 12 + arp[i], spb * 0.5, 0.05, 'square', A.mus);
    }
  }
}
