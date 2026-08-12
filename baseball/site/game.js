// あおいの ホームランきょうそう
//
// ★ ピッチャーが なげた たまを、タイミングよく タップして 打つ。
//   ボタンは 1つ（画面 ぜんぶ）だけ。ちいさい 子でも すぐ できる。
//
// ★ たまは 5しゅるい。ストレート・はやい・おそい・カーブ・フォーク。
//   はやさが ちがうので、「見て から 打つ」のでは まにあわない。
//   ピッチャーの ふりかぶりを 見て、リズムを おぼえるのが コツ。
//
// ★ タイミングは 音の 時計（AudioContext）で しらべる。
//   画面の コマ送りは 1コマ 16ミリびょう ずれるので、
//   「ジャストミート」の ような こまかい はんていには つかえない。
//
// ★ ぴったり 打てると ホームラン（3てん）、すこし ずれると ヒット（1てん）。
//   きめられた 点を とれたら クリア。

'use strict';

const GAME_VER = 1;
const HUD = 28;

// たまの しゅるい。dur … ピッチャーの 手から ホームベースまでの びょうすう
const PITCH = [
  { name: 'ストレート', dur: 1.05, curve: 0, drop: 0, col: '#FFFFFF' },
  { name: 'はやい たま', dur: 0.82, curve: 0, drop: 0, col: '#FFD24A' },
  { name: 'おそい たま', dur: 1.40, curve: 0, drop: 0, col: '#8AF0B0' },
  { name: 'カーブ', dur: 1.18, curve: 1, drop: 0.10, col: '#8AD8F0' },
  { name: 'フォーク', dur: 1.10, curve: 0, drop: 0.26, col: '#C8A8F0' },
];

// はんてい（びょう）
const W_JUST = 0.045;
const W_HIT = 0.10;
const W_FOUL = 0.16;

const STAGES = [
  { name: 'パパ', balls: 8, target: 6, kinds: 1, spd: 1.15 },
  { name: 'ママ', balls: 8, target: 8, kinds: 2, spd: 1.10 },
  { name: 'まさき', balls: 10, target: 10, kinds: 2, spd: 1.05 },
  { name: 'りな', balls: 10, target: 12, kinds: 3, spd: 1.00 },
  { name: 'コーチ', balls: 10, target: 14, kinds: 3, spd: 0.96 },
  { name: 'エース', balls: 12, target: 17, kinds: 4, spd: 0.92 },
  { name: 'せんぱい', balls: 12, target: 19, kinds: 4, spd: 0.88 },
  { name: 'かいまく とうしゅ', balls: 12, target: 21, kinds: 5, spd: 0.85 },
  { name: 'まぼろしの とうしゅ', balls: 14, target: 24, kinds: 5, spd: 0.80 },
  { name: 'でんせつの とうしゅ', balls: 14, target: 26, kinds: 5, spd: 0.76 },
];

const SAVE_KEY = 'baseball.save.v1';
const save = { clear: {}, plays: 0, hr: 0, far: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.hr)) save.hr = s.hr;
  if (Number.isFinite(s.far)) save.far = s.far;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  si: 0, st: null,
  ball: 0, score: 0, hr: 0, hits: 0, best: 0,
  phase: 'wind',           // wind（ふりかぶり）| fly（たまが 来る）| result
  p: null, phaseT: 0,
  swingT: 0, swung: false,
  hit: null,               // {dist, kind, x, y, vx, vy}
  resultTx: '', resultCol: '#FFF',
  over: false, win: false, msg: '', msgT: 0, shake: 0,
};

function startStage(i) {
  audioStart();
  G.si = i; G.st = STAGES[i];
  G.ball = 0; G.score = 0; G.hr = 0; G.hits = 0; G.best = 0;
  G.over = false; G.win = false;
  G.screen = 'play';
  save.plays++; storeSave();
  nextPitch();
}

function nextPitch() {
  G.ball++;
  if (G.ball > G.st.balls) {
    G.over = true;
    G.win = G.score >= G.st.target;
    if (G.win) { save.clear['s' + G.si] = true; storeSave(); sfxClear(G.score >= G.st.target + 6); }
    else sfxOver();
    return;
  }
  const kind = PITCH[Math.floor(Math.random() * G.st.kinds)];
  G.p = { kind: kind, t0: 0, dur: kind.dur * G.st.spd, side: Math.random() < 0.5 ? -1 : 1 };
  G.phase = 'wind'; G.phaseT = 0.7;
  G.swung = false; G.hit = null; G.resultTx = '';
}

// --- おと ---------------------------------------------------------------------------

function sfxThrow() { if (A.ctx) { const t = anow(); nz(t, 0.06, 0.16, 900, 4000); tone(t, 76, 0.05, 0.06, 'square'); } }
function sfxCrack(p) {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.05, 0.24, 1500, 7000);
  tone(t, 60 + p * 16, 0.10, 0.14, 'triangle', null, 44);
}
function sfxWhiff() { if (A.ctx) { const t = anow(); nz(t, 0.16, 0.22, 400, 2600); tone(t, 50, 0.14, 0.07, 'sine', null, 40); } }
function sfxCatch() { if (A.ctx) { const t = anow(); nz(t, 0.08, 0.24, 300, 1600); } }
function sfxHR() { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88, 91], 0.055, 0.14, 0.14); nz(t + 0.15, 0.6, 0.07, 300, 3000); } }

// --- はんてい -----------------------------------------------------------------------

function outLat() {
  if (!A.ctx) return 0.02;
  const o = A.ctx.outputLatency;
  if (typeof o === 'number' && o > 0 && o < 0.5) return o;
  const b = A.ctx.baseLatency;
  if (typeof b === 'number' && b > 0 && b < 0.5) return b + 0.01;
  return 0.02;
}

function swing() {
  if (G.screen !== 'play' || G.over) return;
  if (G.phase !== 'fly' || G.swung) return;
  G.swung = true; G.swingT = 1;
  const at = anow();
  const meet = G.p.t0 + G.p.dur + outLat();
  const err = Math.abs(at - meet);
  if (err <= W_JUST) {
    const dist = 105 + Math.round((1 - err / W_JUST) * 45);
    hitBall('ホームラン！', '#FFD24A', dist, 3, 1);
    G.hr++; save.hr++;
    sfxCrack(1); sfxHR();
  } else if (err <= W_HIT) {
    const dist = 28 + Math.round((1 - err / W_HIT) * 55);
    hitBall('ヒット！', '#8AF0B0', dist, 1, 0.55);
    G.hits++;
    sfxCrack(0.5);
  } else if (err <= W_FOUL) {
    hitBall('ファウル…', '#FFB0C8', 0, 0, 0.2);
    sfxCrack(0.1);
  } else {
    G.resultTx = 'からぶり！'; G.resultCol = '#FFB0C8';
    G.phase = 'result'; G.phaseT = 1.1;
    G.shake = 0.25;
    sfxWhiff();
  }
}

function hitBall(tx, col, dist, pts, power) {
  G.resultTx = dist > 0 ? tx + ' ' + dist + 'm' : tx;
  G.resultCol = col;
  G.score += pts;
  G.best = Math.max(G.best, dist);
  if (dist > save.far) { save.far = dist; }
  storeSave();
  const dir = (Math.random() - 0.5) * 1.1;
  G.hit = { x: VW / 2, y: VH - 108, vx: dir * 420 * power + (power > 0.9 ? 0 : 0),
            vy: -(240 + power * 260), t: 0, dist: dist };
  G.phase = 'result'; G.phaseT = dist >= 100 ? 1.7 : 1.1;
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.swingT > 0) G.swingT -= dt * 4;
  if (G.shake > 0) G.shake -= dt;
  if (G.screen !== 'play' || G.over) { IN.taps.length = 0; return; }

  if (G.phase === 'wind') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      G.p.t0 = anow();
      G.phase = 'fly';
      sfxThrow();
    }
    // ふりかぶり中の タップは からぶり あつかいに しない（ただの フライング）
    IN.taps.length = 0;
    return;
  }

  if (G.phase === 'fly') {
    for (let i = 0; i < IN.taps.length; i++) swing();
    const k = (anow() - G.p.t0) / G.p.dur;
    if (!G.swung && k > 1.22) {
      G.resultTx = 'みのがし…'; G.resultCol = '#FFB0C8';
      G.phase = 'result'; G.phaseT = 1.0;
      sfxCatch();
    }
  } else if (G.phase === 'result') {
    if (G.hit) {
      G.hit.t += dt;
      G.hit.x += G.hit.vx * dt;
      G.hit.y += G.hit.vy * dt;
      G.hit.vy += 420 * dt;
    }
    G.phaseT -= dt;
    if (G.phaseT <= 0) nextPitch();
  }
  IN.taps.length = 0;
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  audioStart();
  if (G.screen === 'play') swing();
});

// --- え ------------------------------------------------------------------------------

function field() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A4A86'); g.addColorStop(0.42, '#5A8AC8');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // かんきゃくせき
  ctx.fillStyle = '#3A3060';
  ctx.fillRect(-VW, VH * 0.14, VW * 3, VH * 0.12);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = ['#FF8FBB', '#8AD8F0', '#9AE86A', '#FFD24A', '#C8A8F0'][i % 5];
    ctx.globalAlpha = 0.55;
    circle(-VW + i * (VW * 3 / 40) + 10, VH * 0.19 + Math.sin(i * 2.1) * 6, 5); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // しばふ
  ctx.fillStyle = '#3E8A4E';
  ctx.fillRect(-VW, VH * 0.26, VW * 3, VH);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(-VW, VH * 0.26 + i * VH * 0.14, VW * 3, VH * 0.07);
  }
  // 土（マウンドと ホーム）
  ctx.fillStyle = '#B08A5A';
  ctx.beginPath();
  ctx.ellipse(VW / 2, VH * 0.40, 78, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(VW / 2, VH - 66, 130, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(VW / 2 - 22, VH - 62); ctx.lineTo(VW / 2 + 22, VH - 62);
  ctx.lineTo(VW / 2 + 22, VH - 52); ctx.lineTo(VW / 2, VH - 44);
  ctx.lineTo(VW / 2 - 22, VH - 52);
  ctx.closePath(); ctx.fill();
}

function drawPitcher(x, y, s, k) {
  // k … 0 ふりかぶり はじめ、1 なげた
  const arm = -1.9 + k * 3.2;
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y + s * 0.28); ctx.lineTo(x - s * 0.2, y + s * 0.7);
  ctx.moveTo(x + s * 0.12, y + s * 0.28); ctx.lineTo(x + s * 0.24, y + s * 0.7);
  ctx.stroke();
  ctx.fillStyle = '#E8E8F0';
  rr(x - s * 0.24, y - s * 0.24, s * 0.48, s * 0.56, s * 0.13); ctx.fill();
  ctx.fillStyle = '#4A6ACC';
  rr(x - s * 0.24, y + s * 0.16, s * 0.48, s * 0.16, s * 0.06); ctx.fill();
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y - s * 0.1);
  ctx.lineTo(x + s * 0.2 + Math.cos(arm) * s * 0.6, y - s * 0.1 + Math.sin(arm) * s * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#F6CDA8';
  circle(x, y - s * 0.46, s * 0.22); ctx.fill();
  ctx.fillStyle = '#4A6ACC';
  ctx.beginPath(); ctx.arc(x, y - s * 0.48, s * 0.24, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - s * 0.24, y - s * 0.52, s * 0.44, s * 0.06);
}

function drawBatter(x, y, s, swingK) {
  const a = swingK > 0 ? -2.4 + (1 - swingK) * 3.4 : -1.9;
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.14, y + s * 0.26); ctx.lineTo(x - s * 0.28, y + s * 0.72);
  ctx.moveTo(x + s * 0.14, y + s * 0.26); ctx.lineTo(x + s * 0.28, y + s * 0.72);
  ctx.stroke();
  ctx.fillStyle = '#FF8FBB';
  rr(x - s * 0.24, y - s * 0.24, s * 0.48, s * 0.54, s * 0.13); ctx.fill();
  // バット
  const bx = x + Math.cos(a) * s * 0.4, by = y - s * 0.12 + Math.sin(a) * s * 0.4;
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.13;
  ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.12); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = '#C08A4A'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + Math.cos(a - 0.3) * s * 0.76, by + Math.sin(a - 0.3) * s * 0.76);
  ctx.stroke();
  // あたま と ヘルメット
  ctx.fillStyle = '#F6CDA8';
  circle(x, y - s * 0.46, s * 0.22); ctx.fill();
  ctx.fillStyle = '#E85A7A';
  ctx.beginPath(); ctx.arc(x, y - s * 0.48, s * 0.25, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x + s * 0.08, y - s * 0.44, s * 0.035); ctx.fill();
}

function ballPos() {
  const p = G.p;
  if (!p) return { x: VW / 2, y: VH * 0.40, r: 6 };
  const k = clamp((anow() - p.t0) / p.dur, 0, 1.3);
  const y0 = VH * 0.40, y1 = VH - 96;
  const y = y0 + (y1 - y0) * k + p.kind.drop * VH * 0.16 * k * k;
  const x = VW / 2 + p.side * p.kind.curve * Math.sin(k * Math.PI) * VW * 0.06;
  return { x: x, y: y, r: 5 + k * 9, k: k };
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(G.t * 60) * 5 * G.shake, 0);
  field();

  const windK = G.phase === 'wind' ? clamp(1 - G.phaseT / 0.7, 0, 1) : 1;
  drawPitcher(VW / 2, VH * 0.40, 62, G.phase === 'wind' ? windK * 0.85 : 1);

  // とんで いく たま
  if (G.hit) {
    const h = G.hit;
    ctx.fillStyle = '#FFFFFF';
    circle(h.x, h.y, Math.max(3, 11 - h.t * 3)); ctx.fill();
    if (h.dist >= 100) {
      ctx.globalAlpha = 0.5;
      for (let i = 1; i < 6; i++) {
        circle(h.x - h.vx * 0.02 * i, h.y - h.vy * 0.02 * i, Math.max(2, 8 - i)); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  } else if (G.phase === 'fly') {
    const b = ballPos();
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r + 6, b.r, b.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = G.p.kind.col;
    circle(b.x, b.y, b.r); ctx.fill();
    ctx.strokeStyle = '#E05A5A'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0.5, 2.3); ctx.stroke();
  }

  drawBatter(VW / 2 - 44, VH - 96, 66, G.swingT);

  // うつ めやす（ホームベースの 上に わ）
  if (G.phase === 'fly') {
    const k = (anow() - G.p.t0) / G.p.dur;
    ctx.strokeStyle = k > 0.86 && k < 1.14 ? '#FFD24A' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    circle(VW / 2, VH - 96, 26); ctx.stroke();
  }

  drawHud();
  ctx.restore();

  if (G.resultTx) {
    bigText(G.resultTx, VW / 2, VH * 0.30, 34, G.resultCol);
  }
  if (G.phase === 'wind') {
    bigText('タップで バットを ふる！', VW / 2, VH - 26, 20, '#FFF6C8');
  }
  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.24, 22, '#FFF6C8', null);
    ctx.globalAlpha = 1;
  }

  // 画面ぜんぶが バットの ボタン
  button(0, HUD, VW, VH - HUD, swing);

  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'とどかなかった…',
      [G.score + ' てん（もくひょう ' + G.st.target + '）　ホームラン ' + G.hr + '本　ヒット ' + G.hits + '本',
       'いちばん とばした きょり ' + G.best + 'm'],
      [{ label: 'もういちど', on: () => startStage(G.si) },
       G.win && G.si + 1 < STAGES.length
         ? { label: 'つぎの とうしゅ', on: () => startStage(G.si + 1), col: '#8AF0B0' }
         : { label: 'とうしゅを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(8,12,30,0.55)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText(G.st.name + ' とうしゅ', 10, HUD / 2);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#DCE8FF';
  ctx.fillText(G.ball + ' / ' + G.st.balls + ' きゅうめ', 160, HUD / 2);
  ctx.fillText('ホームラン ' + G.hr, 280, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = G.score >= G.st.target ? '#8AF0B0' : '#FFF6C8';
  ctx.fillText(G.score + ' / ' + G.st.target + ' てん', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  field();
  drawPitcher(VW * 0.16, VH * 0.62, 66, 0.6);
  drawBatter(VW * 0.84, VH * 0.62, 70, 0.4);
  bigText('あおいの', VW / 2, 34, 20, '#DCE8FF', null);
  bigText('ホームランきょうそう', VW / 2, 68, fitSize('ホームランきょうそう', VW * 0.55, 40), '#FFF6C8');
  bigText('たまが ホームベースに 来た しゅんかんに タップ！ ぴったりで ホームラン',
          VW / 2, 104, fitSize('たまが ホームベースに 来た しゅんかんに タップ！ ぴったりで ホームラン', VW * 0.9, 16),
          '#DCE8FF', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 126, startStage, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#DCE8FF');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#DCE8FF');
  bigText('あそんだ かず ' + save.plays + '　ホームラン ' + save.hr + '本　さいこう ' + save.far + 'm',
          VW / 2, VH - 16, 14, 'rgba(255,255,255,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  field();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① ピッチャーが ふりかぶって、たまを なげる',
    '② たまが ホームベース（黄色い わ）に 来た しゅんかんに タップ',
    '③ ぴったり だと ホームラン（3てん）、すこし ずれると ヒット（1てん）',
    '④ たまは 5しゅるい。はやい・おそい・カーブ・フォークで タイミングが ちがう',
    '⑤ もくひょうの 点が とれたら クリア。パソコンなら スペースキー',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#DCE8FF', null));
  for (let i = 0; i < PITCH.length; i++) {
    const x = VW / 2 + (i - 2) * 116;
    ctx.fillStyle = PITCH[i].col;
    circle(x, 286, 13); ctx.fill();
    bigText(PITCH[i].name, x, 314, fitSize(PITCH[i].name, 110, 14), '#DCE8FF', null);
  }
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
