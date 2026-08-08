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

// iPhone・iPad は 横の スイッチが 消音（マナーモード）に なっていると、
// WebAudio の 音を まるごと 消してしまう。動画や 音楽アプリは 鳴るのに
// ゲームだけ 無音、という いちばん つらい やつ。
//
// 「無音の音楽を 1つ 流しっぱなしに する」と、ページの 音が
// 動画あつかい（playback）に かわって、スイッチを 切っていても 出る。
function silentWav(sec) {
  const sr = 8000, n = Math.floor(sr * sec);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  const b = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < b.length; i++) str += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(str);
}

function unmuteIOS() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {}
  if (A.keepAlive) { const p = A.keepAlive.play(); if (p && p.catch) p.catch(() => {}); return; }
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.loop = true;
    el.volume = 0.02;
    el.src = silentWav(1);
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    A.keepAlive = el;
  } catch (e) {}
}

function audioStart() {
  unmuteIOS();
  if (A.ctx) {
    if (A.ctx.state !== 'running') {
      const p = A.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    return;
  }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  A.ctx = new C({ latencyHint: 'interactive' });
  A.music = A.ctx.createGain();
  A.music.gain.value = 0.34;
  A.sfx = A.ctx.createGain();
  A.sfx.gain.value = 0.52;
  A.music.connect(A.ctx.destination);
  A.sfx.connect(A.ctx.destination);
  if (A.ctx.state !== 'running') {
    const p = A.ctx.resume();
    if (p && p.catch) p.catch(() => {});
  }
  A.ready = true;
}

// 音が ほんとうに 出せる じょうたいか
function soundOK() { return !!(A.ctx && A.ctx.state === 'running'); }

// 「音を ためす」ボタン用の みじかい フレーズ
function sfxTest() {
  audioStart();
  if (!A.ctx) return;
  const t = anow() + 0.05;
  const mel = [0, 4, 7, 12];
  for (let i = 0; i < 4; i++) {
    kick(t + i * 0.22, 0.9);
    hat(t + i * 0.22 + 0.11, 0.25);
    pluck(t + i * 0.22, 72 + mel[i], 0.3, 0.34, A.sfx);
  }
  snare(t + 0.44, 0.5);
  snare(t + 0.88, 0.5);
  chord(t, [60, 64, 67], 1.0, 0.16);
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
  // 一気に 消えると「ポツポツ」した すきまだらけの 曲に なる。
  // 2だんかいで 減らして、つぎの 音まで うっすら のこす。
  const vv = v || 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vv, t + 0.008);
  g.gain.exponentialRampToValueAtTime(vv * 0.32, t + dur * 0.45);
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
  g.gain.setValueAtTime(v || 0.28, t + dur * 0.85);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(A.music);
  o.start(t); o.stop(t + dur + 0.05);
}

// うしろで ずっと 鳴っている わおん。のばして おかないと 曲が すきまだらけに なる。
function chord(t, ms, dur, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const lv = (v || 0.1) / ms.length;
  for (const m of ms) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = mid2f(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.05);
    g.gain.setValueAtTime(lv, t + dur * 0.82);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.music);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

// ながおし の あいだ 鳴る 音。だんだん 高くなって、はなす ところで てっぺん。
// 「いつ はなすか」が 耳で わかる ように するのが ねらい。
function riser(t, dur, m0, m1, v) {
  if (!A.ctx) return;
  t = safeT(t);
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(mid2f(m0), t);
  o.frequency.exponentialRampToValueAtTime(mid2f(m1), t + dur);
  const lp = A.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(700, t);
  lp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v || 0.14, t + 0.05);
  g.gain.setValueAtTime(v || 0.14, t + dur * 0.92);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(A.music);
  o.start(t); o.stop(t + dur + 0.05);
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
  } else if (kind === 'screw') {
    nzHit(t, 0.14, 0.34, 900, 5000, A.sfx);
    pluck(t, 88, 0.24, 0.3, A.sfx);
    pluck(t + 0.05, 95, 0.2, 0.2, A.sfx);
  } else if (kind === 'ball') {
    nzHit(t, 0.04, 0.42, 1500, 6000, A.sfx);
    pluck(t, 90, 0.09, 0.26, A.sfx);
  } else if (kind === 'clap') {
    nzHit(t, 0.05, 0.5, 1200, 5500, A.sfx);
    nzHit(t + 0.012, 0.06, 0.35, 900, 4000, A.sfx);
  } else if (kind === 'shout') {
    const o2 = A.ctx.createOscillator(), g2 = A.ctx.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(520, t);
    o2.frequency.exponentialRampToValueAtTime(1150, t + 0.22);
    const lp2 = A.ctx.createBiquadFilter();
    lp2.type = 'bandpass'; lp2.frequency.value = 1400; lp2.Q.value = 3;
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o2.connect(lp2); lp2.connect(g2); g2.connect(A.sfx);
    o2.start(t); o2.stop(t + 0.32);
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
  const third = (sp.min && sp.min.indexOf(ci) >= 0) ? 3 : 4;
  bass(t0, r - 24, spb * 0.9, 0.3);
  bass(t0 + spb * 2, r - 24, spb * 0.45, 0.26);
  bass(t0 + spb * 3, r - 24 + 7, spb * 0.45, 0.22);
  chord(t0, [r - 12, r - 12 + third, r - 12 + 7], spb * 3.7, 0.14);

  // うしろで ずっと 鳴っている きらきら（アルペジオ）。
  // これが 無いと ドラムと ベースだけで、たたかない あいだが さびしい。
  const arp = [0, third, 7, 12, 7, third, 12, 7];
  for (let i = 0; i < 8; i++) {
    pluck(t0 + i * (spb / 2), r - 12 + arp[i], spb * 0.46, 0.10, A.music);
  }
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
