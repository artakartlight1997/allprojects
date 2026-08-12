// りなの テニス
//
// ★ 上から 見た コート。じぶんは 手前、あいては おく。
//   ゆびで 左右に うごいて、ボールが 来たら タップで うつ。
//
// ★ うつ ときの ボールとの きょりで コースが かわる。
//   ・ラケットの まん中で うつと まっすぐ 速い たま
//   ・はしっこで うつと よこに まがる（あいてを 走らせられる）
//   ちからいっぱい ねらうより、あいての いない ところへ 打つ ほうが 強い。
//
// ★ そうさは 2つだけ。
//   ・左右に すべらせる（ゆびを 置いた ところへ 近づく）
//   ・タップで うつ（うてる はんいに 入って いる ときだけ）
//   うつ タイミングは やさしめ。とどく はんいに 入って いれば 空ぶりしない。
//
// ★ 5ポイント さきに とった ほうが かち。あいては だんだん つよく なる。

'use strict';

const GAME_VER = 1;
const HUD = 28;
const WIN_PT = 5;
const MOVE_SPD = 0.85;      // 1びょうに どれだけ よこに 走れるか（コート = 1）

// コートの ばしょ（かそう画面）
const CT = { x: 0, y: 62, w: 0, h: 0 };     // draw の たびに 入れなおす
const MY_Y = 0.90;      // じぶんの たてい ち（コートの わりあい）
const OP_Y = 0.10;

const RIVALS = [
  { name: 'ゆい', col: '#FFB84A', spd: 0.55, acc: 0.35, pow: 0.85, ret: 0.80 },
  { name: 'あおい', col: '#8AD8F0', spd: 0.65, acc: 0.45, pow: 0.90, ret: 0.85 },
  { name: 'まさき', col: '#7AE8C8', spd: 0.75, acc: 0.55, pow: 0.95, ret: 0.88 },
  { name: 'ママ', col: '#C8A8F0', spd: 0.85, acc: 0.62, pow: 1.00, ret: 0.90 },
  { name: 'パパ', col: '#FF9A6A', spd: 0.95, acc: 0.70, pow: 1.05, ret: 0.92 },
  { name: 'コーチ', col: '#FFD24A', spd: 1.05, acc: 0.78, pow: 1.10, ret: 0.94 },
  { name: 'せんぱい', col: '#9AE86A', spd: 1.15, acc: 0.84, pow: 1.15, ret: 0.95 },
  { name: 'チャンピオン', col: '#FF6F8A', spd: 1.25, acc: 0.90, pow: 1.20, ret: 0.96 },
];

const SAVE_KEY = 'tennis.save.v1';
const save = { clear: {}, plays: 0, points: 0, rally: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.points)) save.points = s.points;
  if (Number.isFinite(s.rally)) save.rally = s.rally;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  ri: 0, rival: null,
  me: 0.5, op: 0.5,         // 0..1 の よこい ち
  ball: null,               // {x,y,vx,vy,to} すべて 0..1
  myPt: 0, opPt: 0, rally: 0, bestRally: 0,
  phase: 'serve',           // serve | play | point
  serveMine: true, phaseT: 0,
  msg: '', msgT: 0, hitFx: 0, swing: 0, opSwing: 0,
  over: false, win: false, lastWin: false,
};

function startMatch(i) {
  audioStart();
  G.ri = i; G.rival = RIVALS[i];
  G.myPt = 0; G.opPt = 0; G.rally = 0; G.bestRally = 0;
  G.over = false; G.win = false;
  G.me = 0.5; G.op = 0.5;
  G.serveMine = true;
  G.screen = 'play';
  save.plays++; storeSave();
  newPoint();
}

function newPoint() {
  G.phase = 'serve'; G.phaseT = 1.0;
  G.rally = 0;
  G.ball = null;
  G.msg = G.serveMine ? 'サーブ！ タップで うつ' : 'あいての サーブ';
  G.msgT = 1.4;
}

function serve() {
  const from = G.serveMine ? MY_Y : OP_Y;
  const x = G.serveMine ? G.me : G.op;
  const aim = G.serveMine ? 0.35 + Math.random() * 0.30 : 0.30 + Math.random() * 0.40;
  // ★ よこの 速さは「とんで いる 時間」から きめる。
  //   まえは (aim - x) * 0.55 と していたので、たまが 速いほど よこに
  //   とどかず、ねらった すみに ぜんぜん 行かなかった（ラリーが おわらない）。
  const vy = (G.serveMine ? -1 : 1) * 0.62;
  const fly = (MY_Y - OP_Y) / Math.abs(vy);
  G.ball = {
    x: x, y: from,
    vx: (aim - x) / fly, vy: vy,
    mine: G.serveMine, hot: 0,
  };
  G.phase = 'play';
  G.rally = 0;
  sfxHitBall(0.5);
}

// --- おと ---------------------------------------------------------------------------

function sfxHitBall(p) {
  if (!A.ctx) return;
  const t = anow();
  nz(t, 0.05, 0.12 + p * 0.10, 1200, 5200);
  tone(t, 72 + p * 12, 0.05, 0.08, 'triangle');
}
function sfxPoint(win) {
  if (!A.ctx) return;
  const t = anow();
  if (win) bleep(t, [72, 76, 79, 84], 0.05, 0.12, 0.13);
  else bleep(t, [67, 62, 57], 0.07, 0.14, 0.12);
}
function sfxOut() { if (A.ctx) { const t = anow(); tone(t, 58, 0.22, 0.10, 'sine', null, 46); nz(t, 0.18, 0.06, 200, 1200); } }

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.hitFx > 0) G.hitFx -= dt * 3;
  if (G.swing > 0) G.swing -= dt * 4;
  if (G.opSwing > 0) G.opSwing -= dt * 4;
  if (G.screen !== 'play' || G.over) { IN.taps.length = 0; return; }

  // ゆびで よこに うごく。★ 走る 速さには かぎりが ある。
  //   ゆびの ところへ すぐ ワープすると、どんな たまも とどいて しまって
  //   ゲームに ならない。コートを よこぎるのに 1.2びょう くらい かかる。
  if (IN.hold) {
    const want = clamp((IN.x - CT.x) / Math.max(1, CT.w), 0, 1);
    G.me += clamp(want - G.me, -MOVE_SPD * dt, MOVE_SPD * dt);
  }
  // キーボード
  if (KEYS.ArrowLeft) G.me = clamp(G.me - dt * MOVE_SPD, 0, 1);
  if (KEYS.ArrowRight) G.me = clamp(G.me + dt * MOVE_SPD, 0, 1);
  G.me = clamp(G.me, 0.03, 0.97);

  if (G.phase === 'serve') {
    G.phaseT -= dt;
    if (!G.serveMine && G.phaseT <= 0) serve();
    else if (G.serveMine && G.phaseT <= 0 && IN.taps.length) serve();
  } else if (G.phase === 'play') {
    stepBall(dt);
    aiMove(dt);
    // タップは そのまま「うつ」。ゆびを 置いた まま すべらせると うごく ので、
    // うつ ための ボタンは 作らない（作ると うごけなく なる）。
    for (let i = 0; i < IN.taps.length; i++) swing();
  } else if (G.phase === 'point') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) {
      if (G.myPt >= WIN_PT || G.opPt >= WIN_PT) {
        G.over = true; G.win = G.myPt > G.opPt;
        if (G.win) { save.clear['r' + G.ri] = true; storeSave(); sfxClear(G.opPt === 0); }
        else sfxOver();
      } else newPoint();
    }
  }
  IN.taps.length = 0;
}

function stepBall(dt) {
  const b = G.ball;
  if (!b) return;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  // よこの かべ（サイドライン）で はねる
  if (b.x < 0.02) { b.x = 0.02; b.vx = Math.abs(b.vx); }
  if (b.x > 0.98) { b.x = 0.98; b.vx = -Math.abs(b.vx); }

  // じぶんの がわを 通りすぎた
  if (b.vy > 0 && b.y > MY_Y + 0.06) { point(false, 'とどかなかった…'); return; }
  if (b.vy < 0 && b.y < OP_Y - 0.06) { point(true, 'ぬいた！'); return; }
}

// ラリーが つづくほど たまが 速く なる。
// ★ これが ないと、おたがい とどく はんいから 出られず ラリーが
//   100回 いじょう つづいて しまう（ロボットで 実さいに そうなった）。
function rallySpeed() { return Math.min(2.6, 1 + G.rally * 0.05); }

// あいての うごきと 打ちかえし
function aiMove(dt) {
  const b = G.ball, r = G.rival;
  if (!b) return;
  // ボールの 行きさきを よそうして 近づく（うまいほど 正かく）
  const pred = b.vy < 0 ? b.x + b.vx * ((OP_Y - b.y) / b.vy) : b.x;
  const want = clamp(pred * r.acc + 0.5 * (1 - r.acc), 0, 1);
  G.op += clamp(want - G.op, -1, 1) * Math.min(1, dt * 3.4 * r.spd);
  G.op = clamp(G.op, 0.03, 0.97);

  if (b.vy < 0 && b.y <= OP_Y + 0.04) {
    const d = Math.abs(b.x - G.op);
    if (d > 0.16 || Math.random() > r.ret) { point(true, 'あいての ミス！'); return; }
    // ★ 打ちかえす さきは「りなが いない ほうの すみ」。
    //   まえは りなの ま向かい（かがみ）に 打って いたので、りなが まん中に
    //   いると ぜんぜん 走らされず、ラリーが 100回 いじょう つづいて しまった。
    //   うまい あいてほど すみを ねらう。
    const bend = clamp((b.x - G.op) * 2.4, -1, 1);
    const far = G.me < 0.5 ? 0.88 : 0.12;
    const aim = clamp(far * r.acc + (0.5 + bend * 0.30) * (1 - r.acc)
                      + (Math.random() - 0.5) * (1 - r.acc) * 0.5, 0.06, 0.94);
    const spd = 0.62 * r.pow * rallySpeed();
    b.y = OP_Y + 0.04;
    b.vy = spd;
    b.vx = (aim - b.x) / ((MY_Y - b.y) / spd);
    b.mine = false;
    G.rally++;
    G.opSwing = 1;
    sfxHitBall(0.4);
  }
}

// じぶんが うつ
function swing() {
  if (G.screen !== 'play' || G.over) return;
  if (G.phase === 'serve' && G.serveMine) { serve(); return; }
  if (G.phase !== 'play') return;
  const b = G.ball;
  if (!b || b.vy <= 0) return;                 // 自分に 向かって いない
  G.swing = 1;
  const dy = MY_Y - b.y;
  // まだ とおい ときは「うごく ための タップ」なので、なにも 起きない（音も 出さない）
  if (dy < -0.06 || dy > 0.16) return;
  const d = Math.abs(b.x - G.me);
  if (d > 0.15) { sfxOut(); return; }                  // よこに とどかない（からぶり）
  // ラケットの どこで うったかで コースが かわる
  const bend = clamp((b.x - G.me) * 2.6, -1, 1);
  const aim = clamp(1 - G.op + bend * 0.42 + (Math.random() - 0.5) * 0.06, 0.05, 0.95);
  const power = 1 - Math.min(1, d / 0.15) * 0.25;      // まん中ほど 速い
  b.y = MY_Y - 0.04;
  b.vy = -0.60 * rallySpeed() * power;
  b.vx = (aim - b.x) / ((b.y - OP_Y) / Math.abs(b.vy));
  b.mine = true;
  b.hot = power;
  G.rally++;
  G.bestRally = Math.max(G.bestRally, G.rally);
  G.hitFx = 1;
  sfxHitBall(power);
}

function point(mine, why) {
  if (mine) { G.myPt++; save.points++; } else { G.opPt++; }
  save.rally = Math.max(save.rally, G.bestRally);
  storeSave();
  G.phase = 'point'; G.phaseT = 1.5;
  G.msg = why; G.msgT = 1.5;
  G.lastWin = mine;
  G.serveMine = !mine ? false : true;
  G.ball = null;
  sfxPoint(mine);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space') { audioStart(); if (G.screen === 'play') swing(); }
});

// --- え ------------------------------------------------------------------------------

function courtBox() {
  const w = Math.min(VW * 0.56, 430);
  CT.x = VW / 2 - w / 2; CT.y = HUD + 16; CT.w = w; CT.h = VH - CT.y - 16;
  return CT;
}
function px(bx) { return CT.x + bx * CT.w; }
function py(by) { return CT.y + by * CT.h; }

function drawCourt() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E4A6E'); g.addColorStop(1, '#2E6E96');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  const c = courtBox();
  ctx.fillStyle = '#3A78A8';
  rr(c.x - 22, c.y - 10, c.w + 44, c.h + 20, 10); ctx.fill();
  ctx.fillStyle = '#4A9AC8';
  rr(c.x, c.y, c.w, c.h, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  rr(c.x, c.y, c.w, c.h, 6); ctx.stroke();
  // センターライン と サービスライン
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x + c.w / 2, c.y + c.h * 0.24);
  ctx.lineTo(c.x + c.w / 2, c.y + c.h * 0.76);
  ctx.moveTo(c.x, c.y + c.h * 0.24); ctx.lineTo(c.x + c.w, c.y + c.h * 0.24);
  ctx.moveTo(c.x, c.y + c.h * 0.76); ctx.lineTo(c.x + c.w, c.y + c.h * 0.76);
  ctx.stroke();
  // ネット
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(c.x - 12, c.y + c.h / 2 - 3, c.w + 24, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  for (let x = c.x - 12; x < c.x + c.w + 12; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, c.y + c.h / 2 - 8); ctx.lineTo(x, c.y + c.h / 2 + 8); ctx.stroke();
  }
}

function drawPlayer(x, y, s, col, swing, up) {
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, y + s * 0.28); ctx.lineTo(x - s * 0.24, y + s * 0.72);
  ctx.moveTo(x + s * 0.12, y + s * 0.28); ctx.lineTo(x + s * 0.24, y + s * 0.72);
  ctx.stroke();
  ctx.fillStyle = col;
  rr(x - s * 0.24, y - s * 0.22, s * 0.48, s * 0.56, s * 0.13); ctx.fill();
  // ラケットの うで
  const a = swing > 0 ? -0.9 + (1 - swing) * 1.6 : 0.5;
  const rx = x + Math.cos(a) * s * 0.62, ry = y - s * 0.1 - Math.sin(a) * s * 0.5 * (up ? -1 : 1);
  ctx.strokeStyle = '#F6CDA8'; ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y - s * 0.08); ctx.lineTo(rx, ry);
  ctx.stroke();
  // ラケット
  ctx.strokeStyle = '#FFE066'; ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.ellipse(rx + s * 0.12, ry - s * 0.06, s * 0.20, s * 0.26, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  // あたま
  ctx.fillStyle = '#F6CDA8';
  circle(x, y - s * 0.44, s * 0.22); ctx.fill();
  ctx.fillStyle = '#4A3A44';
  ctx.beginPath(); ctx.arc(x, y - s * 0.47, s * 0.23, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  circle(x - s * 0.22, y - s * 0.44, s * 0.09); ctx.fill();
  circle(x + s * 0.22, y - s * 0.44, s * 0.09); ctx.fill();
}

function drawPlay() {
  drawCourt();
  const c = CT;

  // とどく はんい（じぶんの ラケットの ゆか）
  if (G.phase === 'play' && G.ball && G.ball.vy > 0) {
    ctx.fillStyle = 'rgba(255,214,74,0.16)';
    rr(px(G.me - 0.15), py(MY_Y - 0.06), c.w * 0.30, c.h * 0.22, 8); ctx.fill();
  }

  // あいて
  drawPlayer(px(G.op), py(OP_Y), 46, G.rival.col, G.opSwing, true);
  bigText(G.rival.name, px(G.op), py(OP_Y) - 42, 13, '#DFF0FF', null);

  // じぶん
  drawPlayer(px(G.me), py(MY_Y), 50, '#FF8FBB', G.swing, false);

  // ボール
  if (G.ball) {
    const bx = px(G.ball.x), by = py(G.ball.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(bx, by + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E8F44A';
    circle(bx, by, 9); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(bx, by, 9, 0.6, 2.4); ctx.stroke();
  }

  if (G.hitFx > 0) {
    ctx.globalAlpha = G.hitFx;
    circle(px(G.me), py(MY_Y), 30 + (1 - G.hitFx) * 26);
    ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawHud();

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.4, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.5, 26, G.phase === 'point' && !G.lastWin ? '#FFB0C8' : '#FFF6C8');
    ctx.globalAlpha = 1;
  }
  if (G.phase === 'serve' && G.serveMine) {
    bigText('タップで サーブ！', VW / 2, VH - 22, 20, '#FFD24A');
  }
  if (G.rally >= 3) {
    bigText(G.rally + ' ラリー', VW / 2, HUD + 26, 20, 'rgba(255,255,255,0.75)', null);
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'かった！' : 'まけた…',
      [G.myPt + ' 対 ' + G.opPt + '　' + G.rival.name + 'せん',
       'いちばん つづいた ラリー ' + G.bestRally + 'かい'],
      [{ label: 'もういちど', on: () => startMatch(G.ri) },
       G.win && G.ri + 1 < RIVALS.length
         ? { label: 'つぎの あいて', on: () => startMatch(G.ri + 1), col: '#8AF0B0' }
         : { label: 'あいてを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(4,16,28,0.6)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText('りな ' + G.myPt + '  -  ' + G.opPt + ' ' + G.rival.name, 10, HUD / 2);
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#CFE8FF';
  ctx.fillText(WIN_PT + 'ポイント さきどり', VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // ポイントの たま
  for (let i = 0; i < WIN_PT; i++) {
    ctx.fillStyle = i < G.myPt ? '#FF8FBB' : 'rgba(255,255,255,0.18)';
    circle(VW / 2 - 90 + i * 20, HUD / 2, 7); ctx.fill();
    ctx.fillStyle = i < G.opPt ? G.rival.col : 'rgba(255,255,255,0.18)';
    circle(VW / 2 + 20 + i * 20, HUD / 2, 7); ctx.fill();
  }
}

function drawTitle() {
  drawCourt();
  drawPlayer(VW * 0.14, VH * 0.62, 60, '#FF8FBB', 0.4, false);
  drawPlayer(VW * 0.86, VH * 0.62, 60, '#FFD24A', 0, false);
  bigText('りなの', VW / 2, 34, 20, '#DFF0FF', null);
  bigText('テニス', VW / 2, 68, fitSize('テニス', VW * 0.35, 42), '#FFF6C8');
  bigText('ゆびで よこに うごいて、ボールが 来たら タップで うつ！',
          VW / 2, 104, fitSize('ゆびで よこに うごいて、ボールが 来たら タップで うつ！', VW * 0.86, 16),
          '#DFF0FF', null);

  const names = RIVALS.map((r) => r.name);
  const clear = RIVALS.map((r, i) => !!save.clear['r' + i]);
  const y = stagePicker(RIVALS.length, RIVALS.length, clear, names, 126, startMatch, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#CFE8FF');
  drawButton(button(VW / 2 + 8, y + 10, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#CFE8FF');
  // コートの 上に かさなるので、下じきを しいて 読めるように する
  const st = 'あそんだ かず ' + save.plays + '　とった ポイント ' + save.points +
             '　さいこう ラリー ' + save.rally;
  ctx.font = 'bold 14px system-ui, sans-serif';
  const stw = ctx.measureText(st).width + 24;
  ctx.fillStyle = 'rgba(4,16,28,0.66)';
  rr(VW / 2 - stw / 2, VH - 28, stw, 24, 12); ctx.fill();
  bigText(st, VW / 2, VH - 16, 14, '#DFF0FF', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  drawCourt();
  bigText('あそびかた', VW / 2, 40, 28, '#FFF6C8');
  const lines = [
    '① ゆびを 画面に つけて 左右に すべらせると、りなが よこに うごく',
    '② ボールが 近づいたら タップ。とどく はんい（黄色）に 入って いれば うてる',
    '③ ラケットの まん中で うつと 速い たま。はしで うつと よこに まがる',
    '④ あいての いない ところへ 打つと ポイント。5ポイント さきどりで かち',
    '⑤ パソコンなら ← → で うごいて スペースで うつ',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 88 + i * 32, fitSize(s, VW * 0.9, 17), '#DFF0FF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'all' });
