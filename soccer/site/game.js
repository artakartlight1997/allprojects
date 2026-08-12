// まさきの PKサッカー
//
// ★ ペナルティキックの うちあい。5本ずつ 交たいで ける／まもる。
//
// ★ ける とき … ゴールを 9つに わけた どこかを えらんで、そのあと
//   ゆれる ゲージを タップで 止める。まん中で 止められると ねらった ところへ、
//   ずれると たまも ずれる（わくの 外に 出る ことも ある）。
//   「ねらう」→「タイミング」の 2だんかい なので、うまく なる 手ごたえが ある。
//
// ★ まもる とき … 相手が ける まえに 目線が ちらっと 動く（ヒント）。
//   つよい 相手ほど ヒントが みじかい。とんだ ばしょが 合えば セーブ、
//   となりでも うまく いけば とどく。
//
// ★ ボタンは 大きく。9つの まとは どれも 100px ちかく ある。

'use strict';

const GAME_VER = 1;
const HUD = 28;
const SHOTS = 5;             // おたがい 5本ずつ
const SUDDEN = 8;            // どうてんなら ここまで えんちょう

// 相手チーム（だんだん つよく なる）
const TEAMS = [
  { name: 'ひよこチーム', col: '#FFD24A', keep: 0.10, aim: 0.35, tell: 1.10 },
  { name: 'こうえんチーム', col: '#9AE86A', keep: 0.16, aim: 0.45, tell: 1.00 },
  { name: 'あおぞらチーム', col: '#8AD8F0', keep: 0.22, aim: 0.55, tell: 0.90 },
  { name: 'なかよしチーム', col: '#FF9A6A', keep: 0.28, aim: 0.62, tell: 0.80 },
  { name: 'いなずまチーム', col: '#C8A8F0', keep: 0.34, aim: 0.70, tell: 0.70 },
  { name: 'かぜのチーム', col: '#7AE8C8', keep: 0.40, aim: 0.76, tell: 0.60 },
  { name: 'ほのおチーム', col: '#FF6F8A', keep: 0.46, aim: 0.82, tell: 0.52 },
  { name: 'こおりチーム', col: '#A8D8FF', keep: 0.52, aim: 0.86, tell: 0.44 },
  { name: 'きんメダル', col: '#FFC44A', keep: 0.58, aim: 0.90, tell: 0.36 },
  { name: 'にほんだいひょう', col: '#E8506A', keep: 0.64, aim: 0.94, tell: 0.28 },
];

const SAVE_KEY = 'soccer.save.v1';
const save = { clear: {}, plays: 0, goals: 0, saves: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.goals)) save.goals = s.goals;
  if (Number.isFinite(s.saves)) save.saves = s.saves;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  ti: 0, team: null,
  turn: 0,               // 何本目（0 から）
  mine: true,            // じぶんが ける ばん か
  my: [], op: [],        // けっか（'goal' 'miss' 'save' / まだは undefined）
  phase: 'aim',          // aim | power | fly | dive | wait | shot | result
  aimZone: -1, powerX: 0, powerDir: 1, powerLock: -1,
  ball: null, keeper: null, diveZone: -1, cpuZone: -1, tellT: 0, tellZone: -1,
  msg: '', msgT: 0, phaseT: 0, resultTx: '', resultCol: '#FFF',
  over: false, win: false, draw: false, shake: 0,
};

function startGame(i) {
  audioStart();
  G.ti = i; G.team = TEAMS[i];
  G.turn = 0; G.mine = true; G.my = []; G.op = [];
  G.over = false; G.win = false; G.draw = false;
  G.screen = 'play';
  save.plays++; storeSave();
  beginTurn();
}

function beginTurn() {
  G.aimZone = -1; G.diveZone = -1; G.cpuZone = -1;
  G.ball = null; G.keeper = { z: 4, t: 0 };
  G.powerX = 0; G.powerDir = 1; G.powerLock = -1;
  G.resultTx = '';
  if (G.mine) {
    G.phase = 'aim';
    G.msg = 'ねらう ところを えらぼう'; G.msgT = 1.6;
  } else {
    G.phase = 'dive';
    G.cpuZone = cpuPick();
    G.tellZone = Math.random() < 0.75 ? G.cpuZone : Math.floor(Math.random() * 9);
    G.tellT = G.team.tell;
    G.msg = 'とぶ ところを えらぼう'; G.msgT = 1.6;
  }
}

// 相手が ねらう ばしょ。つよいほど すみっこを ねらう。
function cpuPick() {
  if (Math.random() < G.team.aim) {
    const corners = [0, 2, 3, 5, 6, 8];
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return Math.floor(Math.random() * 9);
}

// --- ゴールの ばしょ ----------------------------------------------------------------

function goalBox() {
  const w = Math.min(VW * 0.62, 520), h = 176;
  return { x: VW / 2 - w / 2, y: 74, w: w, h: h };
}
function zoneRect(z) {
  const g = goalBox();
  const cw = g.w / 3, ch = g.h / 3;
  return { x: g.x + (z % 3) * cw, y: g.y + Math.floor(z / 3) * ch, w: cw, h: ch };
}
function zoneCenter(z) {
  const r = zoneRect(z);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
function zoneDist(a, b) {
  return Math.abs((a % 3) - (b % 3)) + Math.abs(Math.floor(a / 3) - Math.floor(b / 3));
}

// --- おと ---------------------------------------------------------------------------

function sfxKick() { if (A.ctx) { const t = anow(); nz(t, 0.06, 0.20, 200, 2200); tone(t, 52, 0.08, 0.12, 'triangle', null, 40); } }
function sfxGoal() { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88], 0.06, 0.14, 0.14); nz(t + 0.1, 0.5, 0.08, 300, 3000); } }
function sfxSave() { if (A.ctx) { const t = anow(); nz(t, 0.14, 0.18, 400, 3000); bleep(t, [60, 55], 0.06, 0.10, 0.11); } }
function sfxWide() { if (A.ctx) { const t = anow(); tone(t, 64, 0.30, 0.10, 'sine', null, 48); nz(t, 0.25, 0.06, 200, 1200); } }
function sfxTick() { if (A.ctx) tone(anow(), 84, 0.03, 0.06, 'square'); }

// --- けっか ------------------------------------------------------------------------

function shootResolve(zone, err) {
  // err … 0 が ぴったり。1 に ちかいほど ずれる
  const g = goalBox();
  const c = zoneCenter(zone);
  const dx = (Math.random() < 0.5 ? -1 : 1) * err * g.w * 0.42;
  const dy = (Math.random() < 0.5 ? -1 : 1) * err * g.h * 0.30;
  const tx = c.x + dx, ty = c.y + dy;
  const inGoal = tx > g.x + 6 && tx < g.x + g.w - 6 && ty > g.y + 4 && ty < g.y + g.h - 4;
  // どの まとに 入ったか（キーパーの はんてい用）
  let hit = zone;
  if (inGoal) {
    const cx = clamp(Math.floor((tx - g.x) / (g.w / 3)), 0, 2);
    const cy = clamp(Math.floor((ty - g.y) / (g.h / 3)), 0, 2);
    hit = cy * 3 + cx;
  }
  return { tx: tx, ty: ty, inGoal: inGoal, hit: hit };
}

function keeperSaves(keepZone, hitZone, skill) {
  const d = zoneDist(keepZone, hitZone);
  if (d === 0) return Math.random() < 0.55 + skill * 0.45;
  if (d === 1) return Math.random() < skill * 0.55;
  if (d === 2) return Math.random() < skill * 0.14;
  return false;
}

function endTurn(res) {
  if (G.mine) { G.my.push(res); if (res === 'goal') { save.goals++; storeSave(); } }
  else { G.op.push(res); if (res !== 'goal') { save.saves++; storeSave(); } }
  G.phase = 'result'; G.phaseT = 1.5;
}

function nextTurn() {
  if (G.mine) { G.mine = false; }
  else { G.mine = true; G.turn++; }
  // かちまけは「おたがい 同じ 本数 うった」ときだけ しらべる
  if (G.my.length !== G.op.length) { beginTurn(); return; }
  const ms = G.my.filter((r) => r === 'goal').length;
  const os = G.op.filter((r) => r === 'goal').length;
  if (G.my.length >= SHOTS) {
    if (ms !== os) { finish(ms > os); return; }
    if (G.my.length >= SUDDEN) { finish(false, true); return; }   // ひきわけ
  } else {
    // のこりを ぜんぶ 決めても おいつけない なら そこで おわり
    const mLeft = SHOTS - G.my.length, oLeft = SHOTS - G.op.length;
    if (ms > os + oLeft) { finish(true); return; }
    if (os > ms + mLeft) { finish(false); return; }
  }
  beginTurn();
}

function finish(win, draw) {
  G.over = true; G.win = win; G.draw = !!draw;
  if (win) { save.clear['t' + G.ti] = true; storeSave(); sfxClear(true); }
  else if (draw) sfxClear(false);
  else sfxOver();
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.keeper) G.keeper.t += dt;
  if (G.screen !== 'play' || G.over) { IN.taps.length = 0; return; }

  if (G.phase === 'power') {
    G.powerX += G.powerDir * dt * 1.9;
    if (G.powerX > 1) { G.powerX = 1; G.powerDir = -1; }
    if (G.powerX < -1) { G.powerX = -1; G.powerDir = 1; }
  } else if (G.phase === 'fly' || G.phase === 'shot') {
    const b = G.ball;
    b.k = Math.min(1, b.k + dt * 1.9);
    if (b.k >= 1 && !b.done) {
      b.done = true;
      resolveBall();
    }
  } else if (G.phase === 'dive') {
    if (G.tellT > 0) G.tellT -= dt;
  } else if (G.phase === 'result') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) nextTurn();
  }

  // タップは 画面ごとの あたりで しらべる（draw で ボタンを つくる）
  IN.taps.length = 0;
}

function resolveBall() {
  const b = G.ball;
  if (G.mine) {
    if (!b.inGoal) { G.resultTx = 'そとへ…'; G.resultCol = '#FFB0C8'; sfxWide(); endTurn('miss'); return; }
    if (keeperSaves(G.keeper.z, b.hit, G.team.keep)) {
      G.resultTx = 'とめられた！'; G.resultCol = '#FFB0C8'; G.shake = 0.3; sfxSave(); endTurn('save');
    } else {
      G.resultTx = 'ゴール！'; G.resultCol = '#FFD24A'; sfxGoal(); endTurn('goal');
    }
  } else {
    if (!b.inGoal) { G.resultTx = 'そとへ！ ラッキー'; G.resultCol = '#8AF0B0'; sfxWide(); endTurn('miss'); return; }
    if (keeperSaves(G.diveZone, b.hit, 0.72)) {
      G.resultTx = 'ナイスセーブ！'; G.resultCol = '#8AF0B0'; sfxSave(); endTurn('save');
    } else {
      G.resultTx = 'きめられた…'; G.resultCol = '#FFB0C8'; G.shake = 0.3; sfxGoal(); endTurn('goal');
    }
  }
}

function tapZone(z) {
  if (G.over) return;
  if (G.phase === 'aim') {
    G.aimZone = z;
    G.phase = 'power'; G.powerX = -1; G.powerDir = 1;
    G.msg = 'まん中で 止めよう！'; G.msgT = 1.4;
    sfxTick();
  } else if (G.phase === 'dive') {
    G.diveZone = z;
    G.keeper = { z: z, t: 0 };
    const r = shootResolve(G.cpuZone, Math.random() * (1 - G.team.aim) * 0.5);
    G.ball = { from: { x: VW / 2, y: VH - 46 }, to: { x: r.tx, y: r.ty },
               inGoal: r.inGoal, hit: r.hit, k: 0, done: false };
    G.phase = 'shot';
    sfxKick();
  }
}

function stopPower() {
  if (G.phase !== 'power') return;
  G.powerLock = G.powerX;
  const err = Math.min(1, Math.abs(G.powerX) * 0.9);
  const r = shootResolve(G.aimZone, err);
  // キーパーは じぶんの キックの ときだけ よそうして とぶ
  const kz = Math.random() < G.team.keep + 0.25
    ? (Math.random() < 0.55 ? G.aimZone : Math.floor(Math.random() * 9))
    : Math.floor(Math.random() * 9);
  G.keeper = { z: kz, t: 0 };
  G.ball = { from: { x: VW / 2, y: VH - 46 }, to: { x: r.tx, y: r.ty },
             inGoal: r.inGoal, hit: r.hit, k: 0, done: false };
  G.phase = 'fly';
  sfxKick();
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  audioStart();
  if (G.screen === 'play' && G.phase === 'power') stopPower();
});

// --- え ------------------------------------------------------------------------------

function pitch() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2E6E3E'); g.addColorStop(1, '#4A9A56');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  // しばの しま
  for (let i = 0; i < 8; i++) {
    if (i % 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-VW, VH * 0.30 + i * VH * 0.09, VW * 3, VH * 0.09);
  }
  // ペナルティエリア
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
  ctx.strokeRect(VW * 0.16, 60, VW * 0.68, VH * 0.52);
  ctx.beginPath();
  ctx.arc(VW / 2, VH * 0.58, 66, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
}

function drawGoal() {
  const g = goalBox();
  // ネット
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
  for (let x = g.x; x <= g.x + g.w; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.stroke();
  }
  for (let y = g.y; y <= g.y + g.h; y += 16) {
    ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke();
  }
  // ポスト
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(g.x, g.y + g.h); ctx.lineTo(g.x, g.y);
  ctx.lineTo(g.x + g.w, g.y); ctx.lineTo(g.x + g.w, g.y + g.h);
  ctx.stroke();
}

function drawZones() {
  const pick = G.phase === 'aim' || G.phase === 'dive';
  for (let z = 0; z < 9; z++) {
    const r = zoneRect(z);
    const b = button(r.x, r.y, r.w, r.h, pick ? () => tapZone(z) : null);
    const on = (G.mine && G.aimZone === z) || (!G.mine && G.diveZone === z);
    if (pick) {
      ctx.fillStyle = on ? 'rgba(255,214,74,0.35)' : 'rgba(255,255,255,0.07)';
      rr(b.x + 3, b.y + 3, r.w - 6, r.h - 6, 8); ctx.fill();
      ctx.strokeStyle = on ? '#FFD24A' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = on ? 3 : 1.5;
      rr(b.x + 3, b.y + 3, r.w - 6, r.h - 6, 8); ctx.stroke();
    } else if (on) {
      ctx.strokeStyle = 'rgba(255,214,74,0.55)'; ctx.lineWidth = 2;
      rr(b.x + 3, b.y + 3, r.w - 6, r.h - 6, 8); ctx.stroke();
    }
  }
  // まもる ときの ヒント（相手の 目線）
  if (G.phase === 'dive' && G.tellT > 0) {
    const c = zoneCenter(G.tellZone);
    ctx.globalAlpha = clamp(G.tellT * 1.6, 0, 1) * 0.8;
    ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 3;
    circle(c.x, c.y, 22 + Math.sin(G.t * 10) * 3); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// せんしゅ（あたま・からだ・手足）
function drawPlayer(x, y, s, col, opt) {
  opt = opt || {};
  const arm = opt.arm || 0, leg = opt.leg || 0;
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y + s * 0.34); ctx.lineTo(x - s * 0.18 - leg * s * 0.5, y + s * 0.9);
  ctx.moveTo(x + s * 0.12, y + s * 0.34); ctx.lineTo(x + s * 0.18 + leg * s * 0.5, y + s * 0.9);
  ctx.stroke();
  ctx.fillStyle = col;
  rr(x - s * 0.26, y - s * 0.26, s * 0.52, s * 0.62, s * 0.14); ctx.fill();
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.24, y - s * 0.14);
  ctx.lineTo(x - s * 0.24 - s * 0.5 * Math.cos(arm), y - s * 0.14 - s * 0.5 * Math.sin(arm));
  ctx.moveTo(x + s * 0.24, y - s * 0.14);
  ctx.lineTo(x + s * 0.24 + s * 0.5 * Math.cos(arm), y - s * 0.14 - s * 0.5 * Math.sin(arm));
  ctx.stroke();
  ctx.fillStyle = '#F6CDA8';
  circle(x, y - s * 0.52, s * 0.24); ctx.fill();
  ctx.fillStyle = '#3A2E26';
  ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.25, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x - s * 0.08, y - s * 0.50, s * 0.035); ctx.fill();
  circle(x + s * 0.08, y - s * 0.50, s * 0.035); ctx.fill();
}

function drawKeeper() {
  const g = goalBox();
  const flying = G.phase === 'fly' || G.phase === 'shot';
  let x = g.x + g.w / 2, y = g.y + g.h - 18;
  let arm = 0.6;
  if (flying && G.keeper) {
    const k = clamp(G.ball ? G.ball.k : 0, 0, 1);
    const c = zoneCenter(G.keeper.z);
    x += (c.x - x) * k;
    y += (c.y + 10 - y) * k;
    arm = 0.6 + k * 0.7;
  }
  // じぶんが キーパーの ときは じぶんの 色（青）で かく
  drawPlayer(x, y, 54, G.mine ? '#FF8A3A' : '#5AA8F0', { arm: arm, leg: flying ? 0.5 : 0 });
  // てぶくろ
  ctx.fillStyle = '#FFE066';
  const ax = 54 * 0.24 + 54 * 0.5 * Math.cos(arm), ay = 54 * 0.14 + 54 * 0.5 * Math.sin(arm);
  circle(x - ax, y - ay, 8); ctx.fill();
  circle(x + ax, y - ay, 8); ctx.fill();
}

function drawBall(x, y, r) {
  ctx.fillStyle = '#FFFFFF';
  circle(x, y, r); ctx.fill();
  ctx.fillStyle = '#2A2A32';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    circle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.22); ctx.fill();
  }
  circle(x, y, r * 0.26); ctx.fill();
}

function drawPowerBar() {
  const w = Math.min(VW * 0.6, 460), h = 30;
  const x = VW / 2 - w / 2, y = VH - 108;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  rr(x, y, w, h, 12); ctx.fill();
  // まん中の あたり（せいこう はんい）
  ctx.fillStyle = 'rgba(122,232,160,0.55)';
  rr(x + w / 2 - w * 0.09, y + 3, w * 0.18, h - 6, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,74,0.35)';
  rr(x + w / 2 - w * 0.22, y + 3, w * 0.44, h - 6, 8); ctx.fill();
  // うごく はり
  const px = x + w / 2 + G.powerX * (w / 2 - 8);
  ctx.fillStyle = '#FFFFFF';
  rr(px - 4, y - 5, 8, h + 10, 4); ctx.fill();
  bigText('タップで 止める！', VW / 2, y - 18, 18, '#FFF6C8');
  // 画面ぜんたいが 止める ボタン
  button(0, HUD, VW, VH - HUD, stopPower);
}

// 5本の けっかを ○×で ならべる。ゴールに かぶらない ように 左下に 置く。
function scoreCols() { return Math.max(SHOTS, G.my.length, G.op.length); }
function drawScoreRow(list, x0, y, col, label) {
  bigText(label, x0 + 22, y, 14, '#FFF6C8', null);
  for (let i = 0; i < scoreCols(); i++) {
    const x = x0 + 52 + i * 22;
    const r = list[i];
    ctx.fillStyle = r === 'goal' ? col : r ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)';
    circle(x, y, 8); ctx.fill();
    if (r && r !== 'goal') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3.5, y - 3.5); ctx.lineTo(x + 3.5, y + 3.5);
      ctx.moveTo(x + 3.5, y - 3.5); ctx.lineTo(x - 3.5, y + 3.5);
      ctx.stroke();
    }
  }
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(G.t * 60) * 5 * G.shake, 0);
  pitch();
  drawGoal();
  drawZones();
  drawKeeper();

  // ける ひと（画面から はみ出さない ように 少し 上へ）
  const kicking = G.mine;
  const ky = VH - 76;
  if (G.phase !== 'fly' && G.phase !== 'shot') {
    drawPlayer(VW / 2 - 44, ky, 52, kicking ? '#5AA8F0' : G.team.col, { arm: 0.2, leg: 0 });
  } else {
    drawPlayer(VW / 2 - 64, ky, 52, kicking ? '#5AA8F0' : G.team.col, { arm: 0.9, leg: 0.6 });
  }

  // ボール
  if (G.ball) {
    const b = G.ball, k = b.k;
    const x = b.from.x + (b.to.x - b.from.x) * k;
    const y = b.from.y + (b.to.y - b.from.y) * k - Math.sin(k * Math.PI) * 34;
    drawBall(x, y, 13 - k * 4);
  } else {
    drawBall(VW / 2, VH - 46, 13);
  }

  if (G.phase === 'power') drawPowerBar();

  drawHud();
  ctx.restore();

  // ゲージが 出て いる ときは 字が かさなる ので 出さない
  if (G.msgT > 0 && G.phase !== 'result' && G.phase !== 'power') {
    ctx.globalAlpha = clamp(G.msgT * 1.6, 0, 1);
    bigText(G.msg, VW / 2, VH - 146, 24, '#FFF6C8');
    ctx.globalAlpha = 1;
  }
  if (G.phase === 'result' && G.resultTx) {
    bigText(G.resultTx, VW / 2, VH * 0.52, 40, G.resultCol);
  }

  if (G.over) {
    const ms = G.my.filter((r) => r === 'goal').length;
    const os = G.op.filter((r) => r === 'goal').length;
    drawResult(G.win || G.draw, G.draw ? 'ひきわけ！' : G.win ? 'かった！' : 'まけた…',
      [ms + ' 対 ' + os + '　' + G.team.name + 'せん',
       'きめた ' + ms + '本　とめた ' + G.op.filter((r) => r === 'save').length + '本'],
      [{ label: 'もういちど', on: () => startGame(G.ti) },
       G.win && G.ti + 1 < TEAMS.length
         ? { label: 'つぎの あいて', on: () => startGame(G.ti + 1), col: '#8AF0B0' }
         : { label: 'あいてを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(8,20,10,0.55)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  const ms = G.my.filter((r) => r === 'goal').length;
  const os = G.op.filter((r) => r === 'goal').length;
  ctx.fillText('じぶん ' + ms + '  -  ' + os + ' ' + G.team.name, 10, HUD / 2);
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = G.mine ? '#FFD24A' : '#8AE8FF';
  ctx.fillText(G.mine ? 'キミの キック' : 'キミが キーパー', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // 5本の けっか（左下）
  const bw = 62 + scoreCols() * 22;
  const bx = 10, by = VH - 62;
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  rr(bx, by, bw, 54, 10); ctx.fill();
  drawScoreRow(G.my, bx, by + 16, '#5AA8F0', 'じぶん');
  drawScoreRow(G.op, bx, by + 38, G.team.col, 'あいて');
}

function drawTitle() {
  pitch();
  drawGoal();
  drawPlayer(VW * 0.14, VH * 0.78, 60, '#5AA8F0', { arm: 0.3, leg: 0.2 });
  drawBall(VW * 0.22, VH * 0.86, 13);
  drawPlayer(VW * 0.86, VH * 0.78, 60, '#FF8A3A', { arm: 1.1, leg: 0.5 });
  bigText('まさきの', VW / 2, 34, 20, '#DFF6E4', null);
  bigText('PKサッカー', VW / 2, 68, fitSize('PKサッカー', VW * 0.45, 42), '#FFF6C8');
  bigText('5本ずつ こうたいで ける／まもる。かったら つぎの あいてへ！',
          VW / 2, 104, fitSize('5本ずつ こうたいで ける／まもる。かったら つぎの あいてへ！', VW * 0.86, 16),
          '#DFF6E4', null);

  const names = TEAMS.map((t) => t.name);
  const clear = TEAMS.map((t, i) => !!save.clear['t' + i]);
  const y = stagePicker(TEAMS.length, TEAMS.length, clear, names, 126, startGame, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#DFF0C8');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#DFF0C8');
  bigText('あそんだ かず ' + save.plays + '　きめた ゴール ' + save.goals + '　とめた かず ' + save.saves,
          VW / 2, VH - 16, 14, 'rgba(255,255,255,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  pitch();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① ける ばん … ゴールを 9つに わけた どこかを タップして ねらう',
    '② そのあと ゲージが 左右に うごく。まん中で 止められると ねらった ところへ',
    '③ ずれると たまも ずれる。大きく ずれると わくの 外へ',
    '④ まもる ばん … とぶ ところを タップ。ける まえに 相手の 目線が ちらっと 光る',
    '⑤ 5本ずつ うって、ゴールの 多い ほうが かち。どうてんなら えんちょうせん',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#DFF6E4', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
