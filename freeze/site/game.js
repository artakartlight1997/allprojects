// ゆいの ダンスフリーズ
//
// ★ 音楽が 鳴って いる あいだは 画面を おしっぱなしで おどる。
//   音が ピタッと 止まったら、すぐ ゆびを はなして **とまる**。
//   「だるまさんが ころんだ」を ダンスに した ような あそび。
//
// ★ ちいさい 子でも できる ように、ねらう ばしょは ない。
//   画面の どこでも いい。おす／はなす だけ。
//
// ★ はんていは 音の 時計（AudioContext）で する。
//   画面の コマ送りだと 16ミリびょう ずれて、はなした 早さが 正しく 出ない。
//
// ★ 音は ファイルを つかわず その場で 作る。止まる ところは 小節の
//   きりの いい ばしょに するので、耳で「そろそろ 来る」と 分かる。

'use strict';

const GAME_VER = 1;
const HUD = 28;
const MISS_MAX = 3;
const EARLY = 0.25;          // これより 早く はなすと「はやすぎ」

const STAGES = [
  { name: 'れんしゅう', rounds: 4, win: 0.90, bpm: 96, minBar: 1, maxBar: 3 },
  { name: 'おんがくかい', rounds: 5, win: 0.85, bpm: 102, minBar: 1, maxBar: 3 },
  { name: 'こうえんで', rounds: 5, win: 0.78, bpm: 108, minBar: 1, maxBar: 4 },
  { name: 'なかよし', rounds: 6, win: 0.72, bpm: 114, minBar: 1, maxBar: 4 },
  { name: 'はっぴょうかい', rounds: 6, win: 0.66, bpm: 120, minBar: 1, maxBar: 5 },
  { name: 'よるの まち', rounds: 7, win: 0.60, bpm: 126, minBar: 1, maxBar: 5 },
  { name: 'きらきら', rounds: 7, win: 0.54, bpm: 132, minBar: 1, maxBar: 6 },
  { name: 'スポットライト', rounds: 8, win: 0.48, bpm: 138, minBar: 1, maxBar: 6 },
  { name: 'だいぶたい', rounds: 8, win: 0.44, bpm: 146, minBar: 1, maxBar: 6 },
  { name: 'ゆめの ステージ', rounds: 10, win: 0.40, bpm: 154, minBar: 1, maxBar: 7 },
];

const SAVE_KEY = 'freeze.save.v1';
const save = { clear: {}, best: {}, plays: 0, freezes: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.freezes)) save.freezes = s.freezes;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  si: 0, st: null,
  round: 0, miss: 0, score: 0, perfect: 0,
  phase: 'ready',     // ready | dance | freeze | judge
  t0: 0, stopAt: 0, bars: 0, phaseT: 0,
  holding: false, holdAt: 0, releasedAt: 0,
  result: '', resultCol: '#FFF', frozen: false,
  over: false, win: false, msg: '', msgT: 0,
  danceT: 0, pose: 0, poseT: 0, shake: 0,
};

let schedBar = 0;

function startStage(i) {
  audioStart();
  G.si = i; G.st = STAGES[i];
  G.round = 0; G.miss = 0; G.score = 0; G.perfect = 0;
  G.over = false; G.win = false; G.frozen = false;
  G.screen = 'play';
  save.plays++; storeSave();
  nextRound();
}

function spb() { return 60 / G.st.bpm; }

function nextRound() {
  G.round++;
  G.phase = 'ready';
  G.phaseT = 1.3;
  G.result = ''; G.frozen = false;
  G.releasedAt = 0;
  G.msg = 'よーい…'; G.msgT = 1.2;
}

function beginDance() {
  const st = G.st;
  G.bars = st.minBar + Math.floor(Math.random() * (st.maxBar - st.minBar + 1));
  G.t0 = anow() + 0.25;
  G.stopAt = G.t0 + G.bars * 4 * spb();
  schedBar = 0;
  G.phase = 'dance';
  G.msg = 'おどって！'; G.msgT = 1.0;
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

const MELODY = [0, 4, 7, 4, 9, 7, 4, 2];

function pumpMusic() {
  if (!A.ctx || G.phase !== 'dance') return;
  const p = spb(), barLen = p * 4;
  while (schedBar < G.bars && G.t0 + schedBar * barLen < anow() + 1.0) {
    const t0 = G.t0 + schedBar * barLen;
    if (t0 + barLen > anow()) musicBar(t0, schedBar, p);
    schedBar++;
  }
}
function musicBar(t0, bar, p) {
  const root = 60 + [0, 5, 7, 5][bar % 4];
  for (let i = 0; i < 4; i++) {
    if (i === 0 || i === 2) kick(t0 + i * p, 0.6);
    if (i === 1 || i === 3) nz(t0 + i * p, 0.11, 0.15, 900, 5200, A.mus);
    nz(t0 + i * p + p / 2, 0.026, 0.05, 7000, 13000, A.mus);
    tone(t0 + i * p, root - 24, p * 0.8, 0.14, 'sawtooth', A.mus);
  }
  for (let i = 0; i < 8; i++) {
    tone(t0 + i * (p / 2), root + MELODY[i], p * 0.34, 0.09, 'square', A.mus);
  }
}
function sfxStop() {
  if (!A.ctx) return;
  const t = anow();
  tone(t, 96, 0.10, 0.12, 'square', null, 84);
  nz(t, 0.20, 0.10, 300, 2500);
}
function sfxFreezeOK(perfect) {
  if (!A.ctx) return;
  const t = anow();
  bleep(t, perfect ? [84, 88, 91, 96] : [79, 84, 88], 0.05, 0.10, 0.13);
  nz(t, 0.08, 0.08, 5000, 12000);
}

// --- おす／はなす --------------------------------------------------------------------
//
// arcade の しくみは「スティック」を そうていして いるので、ここでは
// おした しゅんかん・はなした しゅんかんの **音の 時こく** を じぶんで のこす。
// ボタン（あそびかた など）を おした ときは かぞえない。

function pressAt(px, py) {
  if (hitBtn(px, py)) return;            // ボタンは そちらに まかせる
  audioStart();
  if (G.screen !== 'play' || G.over) return;
  G.holding = true; G.holdAt = anow();
}
function releaseAt() {
  if (!G.holding) return;
  G.holding = false;
  if (G.screen !== 'play' || G.over) return;
  G.releasedAt = anow();
  if (G.phase === 'dance' || G.phase === 'freeze') resolveRelease(G.releasedAt);
}

const cvRect = () => canvas.getBoundingClientRect();
canvas.addEventListener('touchstart', (e) => {
  const r = cvRect();
  const t = e.changedTouches[0];
  pressAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', () => releaseAt(), { passive: false });
canvas.addEventListener('touchcancel', () => releaseAt());
canvas.addEventListener('mousedown', (e) => {
  const r = cvRect();
  pressAt(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => releaseAt());
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  audioStart();
  if (G.screen === 'play' && !G.over) { G.holding = true; G.holdAt = anow(); }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') releaseAt(); });

// --- はんてい -----------------------------------------------------------------------

function resolveRelease(at) {
  const stop = G.stopAt + outLat();
  const d = at - stop;
  if (d < -EARLY) {
    // 音が 鳴って いる うちに 手を はなした
    fail('はやすぎ！', 'おんがくは まだ 鳴ってるよ');
    return;
  }
  const perfect = Math.abs(d) <= 0.15;
  G.frozen = true;
  G.perfect += perfect ? 1 : 0;
  G.score += perfect ? 300 : 150;
  G.score += Math.max(0, Math.round((G.st.win - Math.max(0, d)) * 200));
  save.freezes++;
  G.result = perfect ? 'ぴったり！' : 'とまれた！';
  G.resultCol = perfect ? '#FFD24A' : '#8AF0B0';
  G.phase = 'judge'; G.phaseT = 1.0;
  sfxFreezeOK(perfect);
}

function fail(title, why) {
  G.miss++;
  G.result = title; G.resultCol = '#FF8AA8';
  G.msg = why; G.msgT = 1.4;
  G.phase = 'judge'; G.phaseT = 1.2;
  G.shake = 0.4;
  sfxNg();
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  IN.taps.length = 0;
  if (G.screen !== 'play' || G.over) return;

  pumpMusic();
  const now = anow(), lat = outLat();

  if (G.phase === 'ready') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      if (!G.holding) { G.msg = 'ゆびを おいてね'; G.msgT = 0.4; G.phaseT = 0.35; return; }
      beginDance();
    }
  } else if (G.phase === 'dance') {
    if (G.holding) {
      G.danceT += dt;
      G.poseT += dt;
      if (G.poseT > 60 / G.st.bpm / 2) { G.poseT = 0; G.pose = (G.pose + 1) % 6; }
      G.score += Math.round(dt * 30);
    }
    if (now >= G.stopAt) {
      G.phase = 'freeze';
      sfxStop();
    }
  } else if (G.phase === 'freeze') {
    if (G.holding) {
      G.poseT += dt;
      if (G.poseT > 0.12) { G.poseT = 0; G.pose = (G.pose + 1) % 6; }
      if (now > G.stopAt + lat + G.st.win) fail('うごいちゃった！', 'おんがくが 止まったら はなす');
    }
  } else if (G.phase === 'judge') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      if (G.miss >= MISS_MAX) { G.over = true; G.win = false; sfxOver(); return; }
      if (G.round >= G.st.rounds) {
        G.over = true; G.win = true;
        const k = 'st' + G.si;
        save.clear[k] = true;
        if ((save.best[k] || 0) < G.score) save.best[k] = G.score;
        storeSave(); sfxClear(G.miss === 0);
        return;
      }
      nextRound();
    }
  }
}

// --- え ------------------------------------------------------------------------------

// ゆい。おどって いる ときは 手足が うごき、とまると こおりの きらきらが つく。
function drawYui(x, y, s, pose, moving, t, frozenNow) {
  const bob = moving ? Math.sin(t * 14) * s * 0.05 : 0;
  const yy = y + bob;
  const arms = [
    [-0.95, -1.0, 0.95, -1.0],
    [-0.5, 0.7, 1.05, -0.95],
    [-1.05, -0.95, 0.5, 0.7],
    [-1.1, 0.1, 1.1, 0.1],
    [-0.35, -1.1, 1.0, -0.3],
    [-1.0, -0.3, 0.35, -1.1],
  ][pose % 6];
  const legK = moving ? Math.sin(t * 14) : 0;
  ctx.save();
  // あし
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.18; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, yy + s * 0.32);
  ctx.lineTo(x - s * 0.20 + legK * s * 0.18, yy + s * 0.92);
  ctx.moveTo(x + s * 0.12, yy + s * 0.32);
  ctx.lineTo(x + s * 0.20 - legK * s * 0.18, yy + s * 0.92);
  ctx.stroke();
  // ワンピース
  ctx.fillStyle = '#FFB84A';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, yy + s * 0.02);
  ctx.lineTo(x + s * 0.26, yy + s * 0.02);
  ctx.lineTo(x + s * 0.44, yy + s * 0.38);
  ctx.lineTo(x - s * 0.44, yy + s * 0.38);
  ctx.closePath(); ctx.fill();
  rr(x - s * 0.26, yy - s * 0.30, s * 0.52, s * 0.40, s * 0.15); ctx.fill();
  // うで と 手
  const aL = s * 0.62, sx = s * 0.24, sy = -s * 0.16;
  const h = [[x - sx + arms[0] * aL, yy + sy + arms[1] * aL],
             [x + sx + arms[2] * aL, yy + sy + arms[3] * aL]];
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.15;
  ctx.beginPath();
  ctx.moveTo(x - sx, yy + sy); ctx.lineTo(h[0][0], h[0][1]);
  ctx.moveTo(x + sx, yy + sy); ctx.lineTo(h[1][0], h[1][1]);
  ctx.stroke();
  ctx.fillStyle = '#FFE0C4';
  circle(h[0][0], h[0][1], s * 0.10); ctx.fill();
  circle(h[1][0], h[1][1], s * 0.10); ctx.fill();
  // あたま
  const hy = yy - s * 0.60;
  ctx.fillStyle = '#F6CDA8';
  circle(x, hy, s * 0.31); ctx.fill();
  ctx.fillStyle = '#5A4436';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.04, s * 0.33, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
  circle(x, hy - s * 0.30, s * 0.13); ctx.fill();       // おだんご
  ctx.fillStyle = '#2A2028';
  if (frozenNow) {
    // とまって いる ときは ぎゅっと 目を つむる
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = Math.max(1.4, s * 0.04);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sg * s * 0.10, hy + s * 0.04, s * 0.06, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    circle(x - s * 0.10, hy + s * 0.01, s * 0.045); ctx.fill();
    circle(x + s * 0.10, hy + s * 0.01, s * 0.045); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(x - s * 0.20, hy + s * 0.12, s * 0.06); ctx.fill();
  circle(x + s * 0.20, hy + s * 0.12, s * 0.06); ctx.fill();
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath(); ctx.arc(x, hy + s * 0.09, s * 0.08, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();

  if (frozenNow) {
    ctx.strokeStyle = 'rgba(180,230,255,0.85)'; ctx.lineWidth = s * 0.05;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r0 = s * 0.85, r1 = s * 1.05;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, yy + Math.sin(a) * r0 - s * 0.1);
      ctx.lineTo(x + Math.cos(a) * r1, yy + Math.sin(a) * r1 - s * 0.1);
      ctx.stroke();
    }
  }
}

function bg() {
  const dance = G.phase === 'dance' && G.holding;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (G.phase === 'freeze' || G.frozen) { g.addColorStop(0, '#123048'); g.addColorStop(1, '#2E5E80'); }
  else { g.addColorStop(0, '#3A1E52'); g.addColorStop(1, '#8A3A78'); }
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // ミラーボールの 光
  const beat = dance ? G.t * 8 : G.t * 1.5;
  for (let i = 0; i < 6; i++) {
    const a = beat * 0.4 + i * 1.05;
    ctx.globalAlpha = dance ? 0.16 : 0.07;
    ctx.fillStyle = ['#FF8FBB', '#8AD8F0', '#9AE86A', '#FFD24A', '#C8A8F0', '#FF9A6A'][i];
    ctx.beginPath();
    ctx.moveTo(VW / 2, 0);
    ctx.lineTo(VW / 2 + Math.cos(a) * VW, VH);
    ctx.lineTo(VW / 2 + Math.cos(a + 0.22) * VW, VH);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-VW, VH * 0.72, VW * 3, VH);
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(G.t * 60) * 6 * G.shake, 0);
  bg();

  const moving = (G.phase === 'dance' || G.phase === 'freeze') && G.holding;
  const frozenNow = G.frozen || (G.phase === 'freeze' && !G.holding);
  drawYui(VW / 2, VH * 0.60, 108, G.pose, moving, G.t, frozenNow);

  // 音が 鳴って いるかの めやす（大きな しるし）
  const on = G.phase === 'dance';
  const label = G.phase === 'ready' ? 'よーい…'
    : on ? '♪ おどって！' : (G.phase === 'freeze' ? 'とまれ！' : G.result);
  const col = G.phase === 'ready' ? '#FFF6C8' : on ? '#FFD24A' : (G.phase === 'freeze' ? '#8AE8FF' : G.resultCol);
  bigText(label, VW / 2, VH * 0.16, on ? 34 + Math.sin(G.t * 12) * 2 : 34, col);

  // 音の なみ（鳴って いる あいだ うごく）
  if (on) {
    ctx.strokeStyle = 'rgba(255,214,74,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = VW * 0.5 + (i - 4) * 26;
      const hgt = 8 + Math.abs(Math.sin(G.t * 12 + i)) * 22;
      ctx.beginPath();
      ctx.moveTo(x, VH * 0.26 - hgt / 2); ctx.lineTo(x, VH * 0.26 + hgt / 2);
      ctx.stroke();
    }
  } else if (G.phase === 'freeze') {
    bigText('ゆびを はなして！', VW / 2, VH * 0.26, 22, '#CFF0FF', null);
  }

  // おしっぱなしの めやす。いま おす のか はなす のかで 出す ことばを かえる。
  const pad = { x: VW * 0.5 - 150, y: VH - 62, w: 300, h: 44 };
  let padTx, padOn;
  if (G.phase === 'freeze' || (G.phase === 'judge' && G.frozen)) {
    padTx = G.holding ? 'はなして！' : 'とまってる！';
    padOn = !G.holding;
  } else {
    padTx = G.holding ? 'おしてる！' : 'ここを おしっぱなし（どこでも いい）';
    padOn = G.holding;
  }
  ctx.fillStyle = padOn ? (G.phase === 'freeze' || G.frozen ? 'rgba(138,232,255,0.85)' : 'rgba(255,214,74,0.85)')
    : 'rgba(255,255,255,0.16)';
  rr(pad.x, pad.y, pad.w, pad.h, 22); ctx.fill();
  bigText(padTx, pad.x + pad.w / 2, pad.y + pad.h / 2,
          fitSize(padTx, pad.w - 20, 17), padOn ? '#20303A' : '#FFF0F5', null);

  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.325, 22, '#FFF0F5', null);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'おしまい！',
      ['スコア ' + G.score + '　ぴったり ' + G.perfect + 'かい',
       G.win ? 'とまるのが じょうずだね！' : 'ミス ' + MISS_MAX + 'で おしまい'],
      [{ label: 'もういちど', on: () => startStage(G.si) },
       G.win && G.si + 1 < STAGES.length
         ? { label: 'つぎへ', on: () => startStage(G.si + 1), col: '#8AF0B0' }
         : { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'ステージへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(8,4,20,0.55)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText(G.st.name, 10, HUD / 2);
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#E8D8F0';
  ctx.fillText(G.round + ' / ' + G.st.rounds + ' かいめ', 140, HUD / 2);
  ctx.fillText('スコア ' + G.score, 250, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('ミス', VW - 76, HUD / 2);
  for (let i = 0; i < MISS_MAX; i++) {
    const x = VW - 60 + i * 20, y = HUD / 2;
    ctx.strokeStyle = i < G.miss ? '#FF6F8A' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
    ctx.stroke();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  bg();
  drawYui(VW * 0.12, VH * 0.74, 74, Math.floor(G.t * 4) % 6, true, G.t, false);
  drawYui(VW * 0.88, VH * 0.74, 74, 3, false, G.t, true);
  bigText('ゆいの', VW / 2, 34, 20, '#FFD9EC', null);
  bigText('ダンスフリーズ', VW / 2, 68, fitSize('ダンスフリーズ', VW * 0.5, 42), '#FFF6C8');
  bigText('おんがくの あいだは おしっぱなしで おどる。止まったら はなして とまる！',
          VW / 2, 104, fitSize('おんがくの あいだは おしっぱなしで おどる。止まったら はなして とまる！', VW * 0.9, 16),
          '#F0DCFF', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['st' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 126, startStage, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#E8D0F8');
  bigText('あそんだ かず ' + save.plays + '　とまれた かず ' + save.freezes,
          VW / 2, VH - 16, 14, 'rgba(255,255,255,0.75)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bg();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① おんがくが 鳴って いる あいだは 画面を おしっぱなし。ゆいが おどる',
    '② おんがくが ピタッと 止まったら、すぐ ゆびを はなす（とまる！）',
    '③ 止まる まえに はなすと「はやすぎ」。おそすぎると「うごいちゃった」',
    '④ ぴったり とまれると たかい とくてん。ミス 3つで おしまい',
    '⑤ さわる ばしょは どこでも いい。パソコンなら スペースキーを おしっぱなし',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#F0DCFF', null));
  drawYui(VW * 0.34, 330, 66, 1, true, G.t, false);
  bigText('おどる', VW * 0.34, 372, 15, '#FFD24A', null);
  drawYui(VW * 0.66, 330, 66, 3, false, G.t, true);
  bigText('とまる', VW * 0.66, 372, 15, '#8AE8FF', null);
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 52, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
