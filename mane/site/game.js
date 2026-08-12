// あおいの まねっこダンス
//
// ★ せんせい（りな）が おどった ポーズの じゅんばんを おぼえて、
//   おなじ ように あおいが おどる。だんだん 長く なって いく。
//   むかしの「光った ボタンを 同じ じゅんに おす」あそびの ダンス版。
//
// ★ ポーズには 1つずつ 音が ついて いる（ドミソシレファ#）。
//   だから ならびが メロディに なって、耳でも おぼえられる。
//   ならびを 見せる ときも おす ときも 同じ 音が 鳴る。
//
// ★ ボタンは 6つを よこに ならべた 大きな ふだ。
//   絵（ポーズ）と 名まえの 両方を のせて、字が 読めなくても わかる ように した。

'use strict';

const GAME_VER = 1;
const HUD = 28;
const MISS_MAX = 3;

// ポーズ。音・名まえ・見た目を まとめて もつ。
const POSES = [
  { name: 'バンザイ', midi: 60, col: '#FF6FA8' },
  { name: 'みぎて', midi: 64, col: '#5AD8F0' },
  { name: 'ひだりて', midi: 67, col: '#9AE86A' },
  { name: 'しゃがむ', midi: 71, col: '#FFD24A' },
  { name: 'ジャンプ', midi: 74, col: '#C8A8F0' },
  { name: 'くるり', midi: 77, col: '#FF9A6A' },
];

const STAGES = [
  { name: 'はじめて', kinds: 3, start: 2, rounds: 5, step: 0.80 },
  { name: 'おけいこ', kinds: 3, start: 2, rounds: 6, step: 0.72 },
  { name: 'なかよし', kinds: 4, start: 2, rounds: 6, step: 0.68 },
  { name: 'はっぴょうかい', kinds: 4, start: 3, rounds: 6, step: 0.62 },
  { name: 'ステージへ', kinds: 5, start: 3, rounds: 7, step: 0.58 },
  { name: 'きらきら', kinds: 5, start: 3, rounds: 7, step: 0.54 },
  { name: 'スポットライト', kinds: 6, start: 3, rounds: 8, step: 0.50 },
  { name: 'アイドル', kinds: 6, start: 4, rounds: 8, step: 0.46 },
  { name: 'せんぱい', kinds: 6, start: 4, rounds: 9, step: 0.42 },
  { name: 'ゆめの ぶたい', kinds: 6, start: 5, rounds: 10, step: 0.38 },
];

const SAVE_KEY = 'mane.save.v1';
const save = { clear: {}, best: {}, plays: 0, poses: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.poses)) save.poses = s.poses;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  si: 0, st: null,
  seq: [], round: 0, miss: 0, score: 0,
  phase: 'show',      // show（見せる） | input（まねする） | good（せいかい） | bad
  showI: -1, showT: 0, phaseT: 0,
  inputI: 0, myPose: -1, myT: 0, teachPose: -1, teachT: 0,
  over: false, win: false, msg: '', msgT: 0,
  press: -1, pressT: 0, wrong: -1, wrongT: 0,
};

function startStage(i) {
  audioStart();
  G.si = i; G.st = STAGES[i];
  G.seq = []; G.round = 0; G.miss = 0; G.score = 0;
  G.over = false; G.win = false;
  G.myPose = -1; G.teachPose = -1;
  G.screen = 'play';
  save.plays++; storeSave();
  nextRound();
}

function nextRound() {
  const st = G.st;
  const add = G.round === 0 ? st.start : 1;
  for (let i = 0; i < add; i++) {
    // 同じ ポーズが 3回 つづくと おぼえにくい ので さける
    let p;
    let guard = 0;
    do {
      p = Math.floor(Math.random() * st.kinds);
      guard++;
    } while (guard < 8 && G.seq.length >= 2 &&
             G.seq[G.seq.length - 1] === p && G.seq[G.seq.length - 2] === p);
    G.seq.push(p);
  }
  G.round++;
  G.phase = 'show'; G.showI = -1; G.showT = 0.7; G.inputI = 0;
  G.msg = 'よく 見てね'; G.msgT = 1.2;
}

function posePing(p, big) {
  if (!A.ctx) return;
  const t = anow();
  tone(t, POSES[p].midi + 12, big ? 0.22 : 0.16, big ? 0.14 : 0.11, 'triangle');
  tone(t, POSES[p].midi, 0.12, 0.07, 'square');
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.myT > 0) G.myT -= dt;
  if (G.teachT > 0) G.teachT -= dt;
  if (G.pressT > 0) G.pressT -= dt;
  if (G.wrongT > 0) G.wrongT -= dt;
  if (G.screen !== 'play') { IN.taps.length = 0; return; }
  if (G.over) { IN.taps.length = 0; return; }

  if (G.phase === 'show') {
    G.showT -= dt;
    if (G.showT <= 0) {
      G.showI++;
      if (G.showI >= G.seq.length) {
        G.phase = 'input'; G.inputI = 0; G.teachPose = -1;
        G.msg = 'まねして！'; G.msgT = 1.0;
      } else {
        G.teachPose = G.seq[G.showI]; G.teachT = G.st.step * 0.9;
        posePing(G.teachPose, false);
        G.showT = G.st.step;
      }
    }
  } else if (G.phase === 'good') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      if (G.round >= G.st.rounds) {
        G.over = true; G.win = true;
        const k = 'st' + G.si;
        save.clear[k] = true;
        if ((save.best[k] || 0) < G.seq.length) save.best[k] = G.seq.length;
        storeSave(); sfxClear(G.miss === 0);
      } else nextRound();
    }
  } else if (G.phase === 'bad') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      if (G.miss >= MISS_MAX) { G.over = true; G.win = false; sfxOver(); }
      else { G.phase = 'show'; G.showI = -1; G.showT = 0.8; G.inputI = 0; G.msg = 'もういちど 見てね'; G.msgT = 1.2; }
    }
  }

  // ボタンの タップは drawPlay で つくった あたりで しらべる
  IN.taps.length = 0;
}

function pressPose(p) {
  if (G.screen !== 'play' || G.over) return;
  G.press = p; G.pressT = 0.14;
  G.myPose = p; G.myT = 0.5;
  if (G.phase !== 'input') { posePing(p, false); return; }   // 見せて いる 間は 音だけ
  const want = G.seq[G.inputI];
  if (p === want) {
    posePing(p, true);
    G.inputI++;
    G.score += 20 + G.round * 5;
    save.poses++;
    if (G.inputI >= G.seq.length) {
      G.phase = 'good'; G.phaseT = 0.9;
      G.score += 100 * G.round;
      G.msg = 'できた！'; G.msgT = 1.0;
      sfxGet();
    }
  } else {
    G.miss++; G.wrong = p; G.wrongT = 0.6;
    G.phase = 'bad'; G.phaseT = 1.1;
    G.msg = 'ちがったよ'; G.msgT = 1.1;
    sfxNg();
  }
}

// キーボード（1〜6）でも あそべる
window.addEventListener('keydown', (e) => {
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[e.code];
  if (n === undefined) return;
  audioStart();
  if (G.screen === 'play' && n < G.st.kinds) pressPose(n);
});

// --- え ------------------------------------------------------------------------------

// おどる 子。pose ばんごうで 手足が かわる。
function drawKid(x, y, s, pose, col, hair, t) {
  const bob = Math.sin(t * 6) * s * 0.03;
  let yy = y + bob;
  let crouch = 0, spin = 0, jump = 0;
  if (pose === 3) { crouch = 1; yy += s * 0.20; }
  if (pose === 4) { jump = 1; yy -= s * 0.22; }
  if (pose === 5) spin = 1;
  // うでの むき（左手 x,y / 右手 x,y）
  // pose が -1 の ときは「なにも して いない」しぜんな 立ちすがた
  const arms = pose < 0 ? [-0.35, 0.7, 0.35, 0.7] : [
    [-0.95, -1.05, 0.95, -1.05],   // バンザイ
    [-0.55, 0.75, 1.05, -1.0],     // みぎて
    [-1.05, -1.0, 0.55, 0.75],     // ひだりて
    [-1.05, 0.15, 1.05, 0.15],     // しゃがむ
    [-1.15, -0.55, 1.15, -0.55],   // ジャンプ
    [-0.3, -1.05, 1.05, 0.25],     // くるり
  ][pose];

  ctx.save();
  if (spin) { ctx.translate(x, yy); ctx.rotate(Math.sin(t * 9) * 0.35); ctx.translate(-x, -yy); }
  const legSpread = jump ? 0.34 : crouch ? 0.26 : 0.16;
  const legLen = crouch ? 0.55 : 0.92;
  // あし
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.17; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.13, yy + s * 0.32);
  ctx.lineTo(x - s * legSpread, yy + s * legLen);
  ctx.moveTo(x + s * 0.13, yy + s * 0.32);
  ctx.lineTo(x + s * legSpread, yy + s * legLen);
  ctx.stroke();
  // スカート と からだ
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.26, yy + s * 0.04);
  ctx.lineTo(x + s * 0.26, yy + s * 0.04);
  ctx.lineTo(x + s * 0.42, yy + s * 0.36);
  ctx.lineTo(x - s * 0.42, yy + s * 0.36);
  ctx.closePath(); ctx.fill();
  rr(x - s * 0.27, yy - s * 0.30, s * 0.54, s * 0.42, s * 0.15); ctx.fill();
  // うで。ポーズが ひと目で わかる ように 長めに して、
  // さきっぽに 手（まる）を つける。
  const aL = s * 0.62;
  const sx = s * 0.24, sy = -s * 0.16;
  const hands = [
    [x - sx + arms[0] * aL, yy + sy + arms[1] * aL],
    [x + sx + arms[2] * aL, yy + sy + arms[3] * aL],
  ];
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.15;
  ctx.beginPath();
  ctx.moveTo(x - sx, yy + sy); ctx.lineTo(hands[0][0], hands[0][1]);
  ctx.moveTo(x + sx, yy + sy); ctx.lineTo(hands[1][0], hands[1][1]);
  ctx.stroke();
  ctx.fillStyle = '#FFE0C4';
  circle(hands[0][0], hands[0][1], s * 0.10); ctx.fill();
  circle(hands[1][0], hands[1][1], s * 0.10); ctx.fill();
  // あたま
  const hy = yy - s * 0.60;
  ctx.fillStyle = '#F6CDA8';
  circle(x, hy, s * 0.31); ctx.fill();
  ctx.fillStyle = hair || '#4A3A44';
  ctx.beginPath(); ctx.arc(x, hy - s * 0.05, s * 0.33, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  circle(x - s * 0.30, hy + s * 0.04, s * 0.12); ctx.fill();
  circle(x + s * 0.30, hy + s * 0.04, s * 0.12); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x - s * 0.10, hy + s * 0.01, s * 0.043); ctx.fill();
  circle(x + s * 0.10, hy + s * 0.01, s * 0.043); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  circle(x - s * 0.20, hy + s * 0.12, s * 0.06); ctx.fill();
  circle(x + s * 0.20, hy + s * 0.12, s * 0.06); ctx.fill();
  ctx.strokeStyle = '#A0485E'; ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.beginPath(); ctx.arc(x, hy + s * 0.09, s * 0.08, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
  // くるり の しるし
  if (spin) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = s * 0.05;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x, yy - s * 0.1, s * 0.72, sg > 0 ? -0.5 : 2.6, sg > 0 ? 0.9 : 4.0);
      ctx.stroke();
    }
  }
  if (jump) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.ellipse(x, yy + s * 1.12, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2E2450'); g.addColorStop(1, '#6A4A86');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // ゆか
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(-VW, VH * 0.62, VW * 3, VH);
  // かがみの わく（けいこ場っぽく）
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 6;
  ctx.strokeRect(VW * 0.06, VH * 0.10, VW * 0.88, VH * 0.52);
}

function poseBtnRect(i, n) {
  const gap = 8;
  const bw = Math.min(150, (VW - 32 - (n - 1) * gap) / n);
  const total = n * bw + (n - 1) * gap;
  const x = VW / 2 - total / 2 + i * (bw + gap);
  const h = 104;
  return { x: x, y: VH - h - 12, w: bw, h: h };
}

function drawPoseButtons() {
  const n = G.st.kinds;
  const active = G.phase === 'input' && !G.over;
  for (let i = 0; i < n; i++) {
    const r = poseBtnRect(i, n);
    const b = button(r.x, r.y, r.w, r.h, () => pressPose(i));
    const hot = G.press === i && G.pressT > 0;
    const bad = G.wrong === i && G.wrongT > 0;
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    rr(b.x + 3, b.y + 4, r.w, r.h, 12); ctx.fill();
    ctx.fillStyle = bad ? '#C8506A' : hot ? POSES[i].col : (active ? '#3E3268' : '#302850');
    rr(b.x, b.y, r.w, r.h, 12); ctx.fill();
    ctx.fillStyle = POSES[i].col;
    rr(b.x, b.y, r.w, 6, 3); ctx.fill();
    ctx.globalAlpha = active ? 1 : 0.55;
    drawKid(b.x + r.w / 2, b.y + r.h * 0.52, r.h * 0.42, i, POSES[i].col, '#4A3A44', G.t + i);
    ctx.globalAlpha = 1;
    bigText(POSES[i].name, b.x + r.w / 2, b.y + r.h - 13,
            fitSize(POSES[i].name, r.w - 10, 14), '#FFF0F5', null);
  }
}

function drawPlay() {
  bg();

  // せんせい と あおい
  const tx = VW * 0.30, ax = VW * 0.70, fy = VH * 0.50;
  const showing = G.phase === 'show';
  ctx.globalAlpha = showing ? 1 : 0.55;
  drawKid(tx, fy, 82, G.teachT > 0 ? G.teachPose : -1, '#FF8FBB', '#4A3A44', G.t);
  ctx.globalAlpha = 1;
  bigText('せんせい', tx, fy + 86, 15, showing ? '#FFD24A' : 'rgba(255,255,255,0.5)', null);

  ctx.globalAlpha = showing ? 0.55 : 1;
  drawKid(ax, fy, 82, G.myT > 0 ? G.myPose : -1, '#8AD8F0', '#6A4A3A', G.t + 1);
  ctx.globalAlpha = 1;
  bigText('あおい', ax, fy + 86, 15, showing ? 'rgba(255,255,255,0.5)' : '#8AF0B0', null);

  // ならびの ようす（○の つらなり）
  const n = G.seq.length;
  const dw = Math.min(26, (VW * 0.6) / Math.max(1, n));
  const x0 = VW / 2 - (n * dw) / 2;
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * dw + dw / 2, cy = VH * 0.675;
    const shown = showing ? i <= G.showI : i < G.inputI;
    circle(cx, cy, dw * 0.32);
    ctx.fillStyle = shown ? POSES[G.seq[i]].col : 'rgba(255,255,255,0.18)';
    ctx.fill();
    if (!showing && i === G.inputI && G.phase === 'input') {
      circle(cx, cy, dw * 0.46);
      ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }

  drawPoseButtons();
  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.20, 30, '#FFF6C8');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'おしまい！',
      ['おぼえた ポーズ ' + G.seq.length + 'こ　スコア ' + G.score,
       G.win ? 'ミス ' + G.miss + '　つぎの ステージへ！' : 'ミス ' + MISS_MAX + 'で おしまい'],
      [{ label: 'もういちど', on: () => startStage(G.si) },
       G.win && G.si + 1 < STAGES.length
         ? { label: 'つぎへ', on: () => startStage(G.si + 1), col: '#8AF0B0' }
         : { label: 'ステージへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
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
  ctx.fillStyle = '#D8CCF0';
  ctx.fillText('ラウンド ' + G.round + ' / ' + G.st.rounds, 130, HUD / 2);
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
  drawKid(VW * 0.13, VH * 0.52, 74, Math.floor(G.t * 2) % 6, '#FF8FBB', '#4A3A44', G.t);
  drawKid(VW * 0.87, VH * 0.52, 74, Math.floor(G.t * 2 + 2) % 6, '#8AD8F0', '#6A4A3A', G.t + 1);
  bigText('あおいの', VW / 2, 34, 20, '#FFD9EC', null);
  bigText('まねっこダンス', VW / 2, 68, fitSize('まねっこダンス', VW * 0.5, 42), '#FFF6C8');
  bigText('せんせいの ポーズを おぼえて、おなじ じゅんに おそう！',
          VW / 2, 104, fitSize('せんせいの ポーズを おぼえて、おなじ じゅんに おそう！', VW * 0.8, 16),
          '#E8DCFF', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['st' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 126, startStage, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#E8D0F8');
  bigText('あそんだ かず ' + save.plays + '　おどった ポーズ ' + save.poses,
          VW / 2, VH - 16, 14, 'rgba(255,255,255,0.75)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bg();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① せんせいが ポーズを 1つずつ おどる。よく 見て おぼえよう',
    '② 「まねして！」に なったら、おなじ じゅんに 下の ふだを おす',
    '③ ぜんぶ あったら 1つ ふえて つぎの ラウンドへ',
    '④ ちがう ふだを おすと ミス。ミス 3つで おしまい',
    '⑤ ポーズには 音が ついて いる。メロディで おぼえると らくちん',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#E8DCFF', null));
  for (let i = 0; i < 6; i++) {
    const x = VW / 2 + (i - 2.5) * 92;
    drawKid(x, 300, 44, i, POSES[i].col, '#4A3A44', G.t + i);
    bigText(POSES[i].name, x, 336, 13, '#E8DCFF', null);
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
