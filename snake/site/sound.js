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

// --- 8ビットふうの こうかおん ------------------------------------------------------
//
// ★ むかしの ゲーム機は「四角い 波」と「ノイズ」しか 出せなかった。
//   ここでも わざと square と ノイズだけを つかい、
//   音を 階段のように 変えて レトロな 感じに して いる。

// 四角い波を 階段状に 上げ下げする（ピロピロ音）
function bleep(t0, notes, step, dur, v, dst) {
  if (!A.ctx) return;
  for (let i = 0; i < notes.length; i++) {
    tone(t0 + i * step, notes[i], dur, v, 'square', dst || A.sfx);
  }
}

function sfxTap() {
  if (!A.ctx) return;
  tone(anow(), 79, 0.045, 0.10, 'square');
}
function sfxPop() {
  if (!A.ctx) return;
  bleep(anow(), [72, 79], 0.035, 0.05, 0.10);
}
function sfxOk() {
  if (!A.ctx) return;
  bleep(anow(), [76, 83, 88], 0.05, 0.09, 0.12);
}
function sfxNg() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [60, 55, 50], 0.07, 0.12, 0.13);
  nz(t, 0.12, 0.10, 200, 1400);
}
function sfxGet() {
  if (!A.ctx) return;
  bleep(anow(), [72, 76, 79, 84], 0.045, 0.09, 0.12);
}
function sfxLevel() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [60, 64, 67, 72, 76, 79, 84], 0.055, 0.11, 0.13);
}
function sfxClear(perfect) {
  if (!A.ctx) return;
  const t = anow();
  const ms = perfect ? [72, 76, 79, 84, 79, 84, 88, 91] : [72, 76, 79, 84, 84, 88];
  bleep(t, ms, 0.09, 0.16, 0.15);
  kick(t, 0.7); kick(t + 0.36, 0.7);
}
function sfxOver() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [67, 63, 60, 56, 51, 48], 0.11, 0.20, 0.14);
  nz(t + 0.6, 0.35, 0.10, 100, 900);
}
function sfxTick() {
  if (!A.ctx) return;
  tone(anow(), 88, 0.03, 0.07, 'square');
}
function sfxTest() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 76, 79, 84], 0.09, 0.16, 0.16);
  kick(t, 0.7); kick(t + 0.36, 0.7);
  nz(t + 0.18, 0.06, 0.12, 2000, 8000);
}

// --- BGM（8ビットふう） ----------------------------------------------------------
//
// 音いろは 四角い波 2つ（メロディと ベース）＋ ノイズ（リズム）だけ。
// むかしの ゲーム機と 同じ 組みあわせ。

const BGM = { prog: [[0, 7, 5, 3], [0, 5, 7, 3]], min: [[3], [1]] };

let bgmOn = false, bgmRoot = 55, bgmSet = 0, bgmBpm = 120, bgmHot = 0;

function bgmStart(n) {
  audioStart();
  if (!A.ctx) return;
  bgmOn = true;
  bgmSet = (n || 0) % BGM.prog.length;
  bgmRoot = 55 + ((n || 0) % 3) * 2;
  bgmBpm = 120 + ((n || 0) % 5) * 4;
  bgmHot = 0;
  A.bgmT = anow() + 0.15;
  A.bgmBar = 0;
}
function bgmStop() { bgmOn = false; }
function bgmHeat(v) { bgmHot = v; }

function bgmPump() {
  if (!bgmOn || !A.ctx) return;
  const spb = 60 / (bgmBpm * (1 + bgmHot * 0.14));
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
  // リズム（ノイズ）
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * spb, 0.6);
    if (i === 1 || i === 3) nz(t0 + i * spb, 0.06, 0.13, 1200, 5000, A.mus);
    nz(t0 + i * spb + spb / 2, 0.025, 0.05, 6000, 12000, A.mus);
  }
  // ベース（四角い波）
  for (let i = 0; i < 8; i++) {
    tone(t0 + i * (spb / 2), r - 24 + (i % 4 === 2 ? 7 : 0), spb * 0.40, 0.13, 'square', A.mus);
  }
  // メロディ（アルペジオ＝和音を ばらして 鳴らす。むかしの ゲームの あの 音）
  const arp = [0, third, 7, 12, 7, third];
  for (let i = 0; i < 12; i++) {
    tone(t0 + i * (spb / 3), r + arp[i % 6] + (i >= 6 ? 12 : 0), spb * 0.26,
         bgmHot > 0.5 ? 0.075 : 0.055, 'square', A.mus);
  }
}

// --- この ゲームだけの おと ------------------------------------------------------

function sfxEat(kind) {
  if (!A.ctx) return;
  const t = anow();
  if (kind === 'gold') bleep(t, [72, 79, 84, 88, 91], 0.05, 0.10, 0.14);
  else if (kind === 'ice') bleep(t, [84, 79, 72, 67], 0.05, 0.10, 0.12);
  else if (kind === 'short') bleep(t, [67, 62, 67, 72], 0.05, 0.09, 0.12);
  else bleep(t, [72, 79], 0.035, 0.06, 0.11);
}
function sfxDead() {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, [72, 67, 62, 58, 53, 48, 43], 0.09, 0.15, 0.14);
  nz(t + 0.7, 0.30, 0.10, 100, 900);
}
