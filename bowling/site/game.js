// まさきの ボウリング。
// うしろから 見た レーンで ボールを なげて、10本の ピンを たおす。ほんものと おなじ 10フレームの てんすう。
//   1. ボールを ひだり みぎに ドラッグして なげる ばしょを きめる
//   2. ゆれる やじるしを タップで とめて むきを きめる
//   3. パワー と カーブの メーターを タップで とめる
// ピンは まるい からだ どうしで ぶつかって たおれる（ぶつりの けいさん）。

'use strict';

const SAVE = 'masakibowling.v1';
const LANE_W = 1.05, LEN = 18.3, BALL_R = 0.11, PIN_R = 0.06;
const HEAD_Z = 16.2, ROW = 0.264, GAP = 0.3048;

const sv = Object.assign({ best: 0, strikes: 0, games: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

function pinSpots() {
  const s = [];
  for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) s.push({ x: (i - r / 2) * GAP, z: HEAD_Z + r * ROW });
  return s;
}
function newGame() {
  G.mode = 'play';
  G.B = { frames: [], frame: 0, roll: 0, pins: pinSpots().map((p) => ({ ...p, ox: p.x, oz: p.z, vx: 0, vz: 0, down: false, gone: false, ang: 0 })),
    phase: 'pos', startX: 0, aim: 0, power: 0, curve: 0, ball: null, t: 0, msg: '', msgT: 0, cam: -2.4, dance: 0 };
  sayB('フレーム 1。 ボールを ひだり みぎに うごかして「ここから なげる」', 3);
}
function sayB(s, t) { G.B.msg = s; G.B.msgT = t || 2; }
function standing() { return G.B.pins.filter((p) => !p.down); }
function resetPins(all) {
  const B = G.B;
  if (all) B.pins = pinSpots().map((p) => ({ ...p, ox: p.x, oz: p.z, vx: 0, vz: 0, down: false, gone: false, ang: 0 }));
  else B.pins.forEach((p) => { if (p.down) p.gone = true; else { p.x = p.ox; p.z = p.oz; p.vx = p.vz = 0; } });
}

// --- なげる ---------------------------------------------------------------------------

function throwBall() {
  const B = G.B;
  const sp = 6 + B.power * 4.5;                // 6〜10.5 m/s
  B.ball = { x: B.startX, z: 0.3, vx: Math.sin(B.aim) * sp, vz: Math.cos(B.aim) * sp, spin: B.curve, gutter: false, done: false, t: 0 };
  B.phase = 'roll'; B.t = 0;
  noise(0.4, 0.06, 400);
}
function stepPhysics(dt) {
  const B = G.B, b = B.ball;
  const n = 6, d = dt / n;
  for (let k = 0; k < n; k++) {
    if (b && !b.done) {
      b.t += d;
      // カーブ：ころがる うちに よこへ まがる（とちゅうから つよく）
      if (!b.gutter && b.z > 5) b.vx += b.spin * 0.55 * d;
      b.x += b.vx * d; b.z += b.vz * d;
      if (!b.gutter && Math.abs(b.x) > LANE_W / 2) { b.gutter = true; b.x = Math.sign(b.x) * (LANE_W / 2 + 0.12); b.vx = 0; tone(160, 0.3, 'triangle', 0.08); }
      if (b.z > LEN + 0.5) b.done = true;
      if (!b.gutter) for (const p of B.pins) if (!p.gone) collide(b, p, 7, 1.5, BALL_R + PIN_R);
    }
    for (const p of B.pins) {
      if (p.gone) continue;
      p.x += p.vx * d; p.z += p.vz * d;
      const f = Math.exp(-2.2 * d); p.vx *= f; p.vz *= f;
      if (Math.hypot(p.vx, p.vz) > 0.25 || Math.hypot(p.x - p.ox, p.z - p.oz) > 0.08) { if (!p.down) { p.down = true; p.ang = Math.atan2(p.vx, p.vz); tone(900 + Math.random() * 400, 0.05, 'square', 0.06); } }
      if (Math.abs(p.x) > LANE_W / 2 + 0.2 || p.z > LEN + 0.3) { p.vx = p.vz = 0; }
    }
    for (let i = 0; i < B.pins.length; i++) for (let j = i + 1; j < B.pins.length; j++) {
      const a = B.pins[i], c = B.pins[j];
      if (!a.gone && !c.gone) collide(a, c, 1.5, 1.5, PIN_R * 2);
    }
  }
}
function collide(a, c, ma, mc, r) {
  const dx = c.x - a.x, dz = c.z - a.z, dd = Math.hypot(dx, dz);
  if (dd >= r || dd === 0) return;
  const nx = dx / dd, nz = dz / dd;
  const push = (r - dd) / 2; a.x -= nx * push; a.z -= nz * push; c.x += nx * push; c.z += nz * push;
  const rv = (a.vx - c.vx) * nx + (a.vz - c.vz) * nz;
  if (rv <= 0) return;
  const j = (1.85 * rv) / (1 / ma + 1 / mc);
  a.vx -= j / ma * nx; a.vz -= j / ma * nz; c.vx += j / mc * nx; c.vz += j / mc * nz;
  // ピンは よこにも はじける
  c.vx += (Math.random() - 0.5) * 0.4; c.vz += (Math.random() - 0.3) * 0.3;
}

// --- てんすう ---------------------------------------------------------------------------

function rollsFlat() { const out = []; for (const f of G.B.frames) for (const r of f) out.push(r); return out; }
function frameScores() {
  const F = G.B.frames, out = [];
  const rolls = rollsFlat(); let ri = 0, total = 0;
  for (let i = 0; i < 10; i++) {
    const f = F[i]; if (!f) break;
    let sc = null;
    if (i < 9) {
      if (f[0] === 10) { if (rolls[ri + 1] !== undefined && rolls[ri + 2] !== undefined) sc = 10 + rolls[ri + 1] + rolls[ri + 2]; ri += 1; }
      else if (f.length === 2 && f[0] + f[1] === 10) { if (rolls[ri + 2] !== undefined) sc = 10 + rolls[ri + 2]; ri += 2; }
      else { if (f.length === 2) sc = f[0] + f[1]; ri += f.length; }
    } else {
      const done = f.length === 3 || (f.length === 2 && f[0] + f[1] < 10);
      if (done) sc = f.reduce((a, v) => a + v, 0);
    }
    if (sc === null) { out.push(null); continue; }
    total += sc; out.push(total);
  }
  return out;
}
function markOf(fi, ri) {
  const f = G.B.frames[fi]; if (!f || f[ri] === undefined) return '';
  const v = f[ri];
  if (fi < 9) { if (ri === 0) return v === 10 ? 'X' : v === 0 ? '-' : String(v); return f[0] + v === 10 ? '/' : v === 0 ? '-' : String(v); }
  // 10フレーム
  if (v === 10 && (ri === 0 || f[ri - 1] === 10 || (ri === 2 && f[0] + f[1] === 10))) return 'X';
  if (ri > 0 && f[ri - 1] !== 10 && !(ri === 2 && f[0] + f[1] === 10) && f[ri - 1] + v === 10) return '/';
  return v === 0 ? '-' : String(v);
}

function endRoll() {
  const B = G.B;
  const before = B.frames[B.frame] ? B.frames[B.frame].reduce((a, v) => a + v, 0) : 0;
  const downNow = B.pins.filter((p) => p.down && !p.gone).length;
  if (!B.frames[B.frame]) B.frames[B.frame] = [];
  const f = B.frames[B.frame];
  f.push(downNow);
  const tenth = B.frame === 9;
  let word = downNow === 0 ? (B.ball.gutter ? 'ガター…' : 'ざんねん') : downNow + 'ほん！';
  let next = 'roll', resetAll = false;
  if (!tenth) {
    if (f.length === 1 && downNow === 10) { word = 'ストライク！'; next = 'frame'; }
    else if (f.length === 2) { if (f[0] + f[1] === 10) word = 'スペア！'; next = 'frame'; }
  } else {
    const sum = f.reduce((a, v) => a + v, 0);
    if (downNow === 10 && standing().length === 0 && (f.length === 1 || f[f.length - 2] === 10 || (f.length === 3))) word = 'ストライク！';
    else if (f.length === 2 && f[0] !== 10 && f[0] + f[1] === 10) word = 'スペア！';
    if (f.length === 3 || (f.length === 2 && sum < 10)) next = 'end';
    else if (standing().length === 0) resetAll = true;
  }
  if (word === 'ストライク！') { sv.strikes++; B.dance = 2.5; jingle([72, 76, 79, 84, 88, 91], 0.08, 'square', 0.14); }
  else if (word === 'スペア！') { B.dance = 1.5; jingle([72, 79, 84], 0.1, 'square', 0.12); }
  sayB(word, 1.8);
  void before;
  B.phase = 'show'; B.t = 0; B.after = { next, resetAll };
}
function afterShow() {
  const B = G.B, a = B.after;
  B.ball = null;
  if (a.next === 'end') { finishGame(); return; }
  if (a.next === 'frame') { B.frame++; resetPins(true); }
  else resetPins(a.resetAll);
  B.phase = 'pos'; B.cam = -2.4;
  sayB('フレーム ' + (B.frame + 1) + (B.frames[B.frame] && B.frames[B.frame].length ? '　' + (B.frames[B.frame].length + 1) + 'きゅうめ' : ''), 1.6);
}
function finishGame() {
  const B = G.B, sc = frameScores();
  B.total = sc[9] || 0;
  B.newBest = B.total > sv.best;
  sv.best = Math.max(sv.best, B.total); sv.games++;
  save();
  B.phase = 'over';
  jingle([72, 76, 79, 84], 0.12, 'triangle', 0.12);
}

function update(dt) {
  const B = G.B;
  B.t += dt;
  if (B.msgT > 0) B.msgT -= dt;
  if (B.dance > 0) B.dance -= dt;
  if (B.phase === 'aim') B.aim = Math.sin(B.t * 1.4) * 0.035;
  if (B.phase === 'power') { B.power = (Math.sin(B.t * 2.4) + 1) / 2; B.curve = Math.sin(B.t * 1.7) * 0.9; }
  if (B.phase === 'roll') {
    stepPhysics(dt);
    B.cam += ((Math.min(B.ball.z - 3.2, 12.8)) - B.cam) * Math.min(1, dt * 3);
    if ((B.ball.done || B.ball.z > LEN) && B.t > 1) { if (!B.settle) B.settle = 0; B.settle += dt; }
    if (B.settle > 1.4 || B.t > 9) { B.settle = 0; endRoll(); }
  }
  if (B.phase === 'show') { stepPhysics(dt); if (B.t > 1.8) afterShow(); }
}

// --- え -------------------------------------------------------------------------------

function proj(x, y, z) {
  const B = G.B, cz = z - B.cam, F = 520, HY = 150, camY = 1.25;
  const zz = Math.max(0.3, cz);
  return { x: VW / 2 + x * F / zz, y: HY + (camY - y) * F / zz, s: F / zz };
}
function drawLane(t) {
  const B = G.B;
  ctx.fillStyle = grad(0, 150, '#1A2448', '#2A3A6A'); ctx.fillRect(0, 0, VW, 150);
  // おく の かべ
  const w0 = proj(-1.6, 1.4, LEN + 0.6), w1 = proj(1.6, -0.2, LEN + 0.6);
  fillR(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y, '#10182E');
  fillR(0, 150, VW, VH - 150, '#1E2A48');
  const quad = (x0, x1, z0, z1, col) => { const a = proj(x0, 0, z0), b = proj(x1, 0, z0), c = proj(x1, 0, z1), d = proj(x0, 0, z1); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill(); };
  const zs = Math.max(0, B.cam + 0.4);
  quad(-LANE_W / 2 - 0.25, -LANE_W / 2, zs, LEN, '#3A4460');
  quad(LANE_W / 2, LANE_W / 2 + 0.25, zs, LEN, '#3A4460');
  quad(-LANE_W / 2, LANE_W / 2, zs, LEN, '#E8C890');
  for (let i = -19; i <= 19; i += 2) { const x = i * LANE_W / 40; quad(x, x + LANE_W / 40, zs, LEN, 'rgba(180,130,70,0.15)'); }
  quad(-LANE_W / 2, LANE_W / 2, Math.max(zs, 14.5), LEN, 'rgba(255,255,255,0.15)');
  // やじるし（ねらいの めじるし）
  for (let i = -3; i <= 3; i++) { const p = proj(i * 0.13, 0, 4.6 + Math.abs(i) * 0.12); if (p.s < 400) { ctx.fillStyle = '#8A4A2A'; ctx.beginPath(); ctx.moveTo(p.x, p.y - p.s * 0.08); ctx.lineTo(p.x - p.s * 0.025, p.y); ctx.lineTo(p.x + p.s * 0.025, p.y); ctx.fill(); } }
  const fl = proj(-LANE_W / 2, 0, Math.max(zs, 0.01)), fr = proj(LANE_W / 2, 0, Math.max(zs, 0.01));
  if (B.cam < 0) { ctx.strokeStyle = '#E84A4A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.stroke(); }
}
function drawPin(p) {
  const a = proj(p.x, 0, p.z), s = a.s;
  if (a.y < 0) return;
  if (p.down) {
    ctx.save(); ctx.translate(a.x, a.y - s * 0.03); ctx.rotate(0.25 * Math.sign(Math.sin(p.ang) || 1));
    ellipse(0, 0, s * 0.19, s * 0.055); ctx.fillStyle = '#F4F4F8'; ctx.fill();
    fillR(-s * 0.08, -s * 0.05, s * 0.03, s * 0.1, '#E84A4A');
    ctx.restore();
    return;
  }
  const h = s * 0.38;
  ellipse(a.x, a.y, s * 0.06, s * 0.02); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  ctx.fillStyle = '#F8F8FC';
  ctx.beginPath();
  ctx.moveTo(a.x - s * 0.035, a.y);
  ctx.quadraticCurveTo(a.x - s * 0.075, a.y - h * 0.35, a.x - s * 0.03, a.y - h * 0.62);
  ctx.quadraticCurveTo(a.x - s * 0.018, a.y - h * 0.72, a.x - s * 0.03, a.y - h * 0.86);
  ctx.arc(a.x, a.y - h * 0.9, s * 0.032, Math.PI, 0);
  ctx.quadraticCurveTo(a.x + s * 0.018, a.y - h * 0.72, a.x + s * 0.03, a.y - h * 0.62);
  ctx.quadraticCurveTo(a.x + s * 0.075, a.y - h * 0.35, a.x + s * 0.035, a.y);
  ctx.fill();
  fillR(a.x - s * 0.024, a.y - h * 0.72, s * 0.048, h * 0.05, '#E84A4A');
  fillR(a.x - s * 0.024, a.y - h * 0.66, s * 0.048, h * 0.04, '#E84A4A');
}
function drawBall(x, z) {
  const a = proj(x, BALL_R, z), r = a.s * BALL_R;
  ellipse(a.x, a.y + r * 0.95, r, r * 0.3); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
  const g = ctx.createRadialGradient(a.x - r * 0.3, a.y - r * 0.4, r * 0.1, a.x, a.y, r);
  g.addColorStop(0, '#8AC0FF'); g.addColorStop(1, '#1E4AA8');
  ctx.fillStyle = g; circ(a.x, a.y, r); ctx.fill();
  for (const [dx, dy] of [[-0.25, -0.3], [0.1, -0.35], [-0.05, -0.05]]) fillC(a.x + dx * r, a.y + dy * r, r * 0.09, '#0E1A40');
}
function drawPlay(t) {
  const B = G.B;
  drawLane(t);
  const objs = B.pins.filter((p) => !p.gone).map((p) => ({ z: p.z, f: () => drawPin(p) }));
  const bx = B.ball ? B.ball.x : B.startX, bz = B.ball ? B.ball.z : 0.35;
  if (!(B.ball && B.ball.z > LEN)) objs.push({ z: bz, f: () => drawBall(bx, bz) });
  objs.sort((a, b) => b.z - a.z);
  for (const o of objs) o.f();
  // ねらい
  if (B.phase === 'aim' || B.phase === 'power' || B.phase === 'pos') {
    const a0 = proj(B.startX, 0, 0.8);
    const len = 7, ex = B.startX + Math.sin(B.aim) * len, a1 = proj(ex, 0, 0.8 + Math.cos(B.aim) * len);
    ctx.strokeStyle = B.phase === 'pos' ? 'rgba(255,255,255,0.35)' : 'rgba(255,230,100,0.9)'; ctx.lineWidth = 5; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke(); ctx.setLineDash([]);
  }
  // まさき
  if (B.phase !== 'roll' || B.t < 0.6) drawKid('masaki', VW / 2 - 230, VH - 6, 170, { t, pose: B.phase === 'roll' ? 'throw' : 'stand', dir: 2 });
  if (B.dance > 0) drawKid('masaki', VW - 120, VH - 10, 170, { t, pose: 'cheer' });
  drawCard();
  // そうさ
  if (B.phase === 'pos') {
    btn(VW / 2 - 110, VH - 86, 220, 64, 'ここから なげる', () => { B.phase = 'aim'; B.t = 0; sayB('ゆれる やじるしを タップで とめよう', 2); }, { col: '#FFE066', size: 20 });
    text('← ボールを ドラッグ で うごかせる →', VW / 2, VH - 104, 15, '#FFFFFF', 'center');
  }
  if (B.phase === 'power') {
    const x = VW - 110, y = 180, h = 220;
    fillRR(x, y, 60, h, 12, 'rgba(0,0,0,0.5)');
    fillRR(x + 8, y + 8 + (h - 16) * (1 - B.power), 44, (h - 16) * B.power, 8, B.power > 0.8 ? '#FF6A4A' : B.power > 0.4 ? '#FFD24A' : '#7FE0A0');
    text('パワー', x + 30, y - 14, 15, '#FFFFFF', 'center');
    fillRR(VW / 2 - 150, 162, 300, 26, 13, 'rgba(0,0,0,0.5)');
    fillC(VW / 2 + B.curve * 140, 175, 11, '#FFE066');
    text('ひだりに まがる ← カーブ → みぎに まがる', VW / 2, 200, 13, '#FFFFFF', 'center');
  }
  if (B.phase === 'aim' || B.phase === 'power') text('タップ！', VW / 2, VH - 60, 28, '#FFE066', 'center');
  if (B.msgT > 0) { ctx.globalAlpha = Math.min(1, B.msgT * 2); textO(B.msg, VW / 2, 250, B.msg.length < 8 ? 52 : 22, '#FFE066', '#1E2A48', 'center', VW - 60); ctx.globalAlpha = 1; }
  btn(12, VH - 52, 90, 40, 'やめる', () => { G.mode = 'title'; }, { col: 'rgba(255,255,255,0.8)', size: 15 });
  if (B.phase === 'over') {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.5)');
    fillRR(VW / 2 - 240, 110, 480, 330, 20, '#FFFFFF');
    textO(B.total + ' てん！', VW / 2, 170, 52, '#4A8AE8', '#FFFFFF');
    text(B.total >= 200 ? 'プロ みたい！' : B.total >= 150 ? 'すごく じょうず！' : B.total >= 100 ? 'いいかんじ！' : 'つぎは もっと たおそう！', VW / 2, 226, 22, '#2A2440', 'center');
    text(B.newBest ? 'じこベスト こうしん！' : 'ベスト ' + sv.best + ' てん', VW / 2, 262, 18, B.newBest ? '#E04A7A' : '#6A6A7A', 'center');
    drawKid('masaki', VW / 2 + 180, 430, 110, { t, pose: 'cheer' });
    btn(VW / 2 - 220, 330, 190, 70, 'もういちど', newGame, { col: '#FFE066' });
    btn(VW / 2 - 16, 330, 150, 70, 'タイトル', () => { G.mode = 'title'; }, { col: '#D8E8FF' });
  }
}
function drawCard() {
  const B = G.B, sc = frameScores();
  const w = Math.min(VW - 20, 760), cw = w / 10.6, x0 = VW / 2 - w / 2, y0 = 8;
  fillRR(x0, y0, w, 66, 8, '#FFFFFF');
  for (let i = 0; i < 10; i++) {
    const x = x0 + i * cw, fw = i === 9 ? cw * 1.6 : cw;
    fillR(x, y0, 1.5, 66, '#B8C0D8');
    if (i === B.frame && B.phase !== 'over') fillR(x + 1.5, y0, fw - 1.5, 66, 'rgba(255,224,102,0.35)');
    text(i + 1, x + 10, y0 + 12, 11, '#8A90A8', 'left');
    const n = i === 9 ? 3 : 2;
    for (let r = 0; r < n; r++) text(markOf(i, r), x + fw - (n - r) * (fw / (n + 0.4)) + fw / (n + 0.4) / 2, y0 + 16, 15, '#2A2440', 'center');
    if (sc[i] !== undefined && sc[i] !== null) text(sc[i], x + fw / 2, y0 + 46, 20, '#1E4AA8', 'center');
  }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#2A3A6A', '#10182E'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 12; i++) fillC((i * 173) % VW, 40 + (i * 57) % 120, 3, ['#FF6FA8', '#FFE066', '#7FE0F0'][i % 3]);
  textO('まさきの ボウリング', VW / 2, 70, 52, '#FFFFFF', '#4A8AE8');
  text('ねらって・パワーを きめて、10本の ピンを たおそう！', VW / 2, 124, 19, '#DDE8FF', 'center');
  // ピンの え
  const px = VW / 2 + 170;
  for (let r = 3; r >= 0; r--) for (let i = 0; i <= r; i++) { const x = px + (i - r / 2) * 46, y = 400 - r * 26; ctx.fillStyle = '#F8F8FC'; ellipse(x, y - 30, 14, 34); ctx.fill(); fillC(x, y - 64, 10, '#F8F8FC'); fillR(x - 9, y - 54, 18, 4, '#E84A4A'); }
  drawKid('masaki', VW / 2 - 200, 450, 200, { t, pose: 'wave' });
  btn(VW / 2 - 110, 160, 220, 80, 'スタート！', () => { fullScreen(); newGame(); }, { col: '#FFE066', size: 28 });
  text('ベスト ' + sv.best + ' てん ・ ストライク ' + sv.strikes + ' かい', VW / 2, 262, 18, '#DDE8FF', 'center');
}

startGame({
  bg: '#10182E',
  update(dt) { G.t += dt; if (G.mode === 'play') update(Math.min(dt, 1 / 30)); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawPlay(t); },
  down(x, y) {
    if (G.mode !== 'play') return;
    const B = G.B;
    if (B.phase === 'pos') { G.drag = { x, sx: B.startX }; return; }
    if (B.phase === 'aim') { B.phase = 'power'; B.t = 0; tone(700, 0.05, 'square', 0.06); sayB('パワーと カーブ。 タップで なげる！', 1.6); return; }
    if (B.phase === 'power') { throwBall(); }
  },
  move(x, y, drag) { const B = G.B; if (G.mode === 'play' && drag && G.drag && B.phase === 'pos') B.startX = clamp(G.drag.sx + (x - G.drag.x) / 300, -0.4, 0.4); },
  up() { G.drag = null; },
  key(code, down) {
    if (!down || G.mode !== 'play') return;
    const B = G.B;
    if (B.phase === 'pos' && code === 'ArrowLeft') B.startX = clamp(B.startX - 0.05, -0.4, 0.4);
    if (B.phase === 'pos' && code === 'ArrowRight') B.startX = clamp(B.startX + 0.05, -0.4, 0.4);
    if (code === 'Space' || code === 'Enter') { if (B.phase === 'pos') { B.phase = 'aim'; B.t = 0; } else if (B.phase === 'aim') { B.phase = 'power'; B.t = 0; } else if (B.phase === 'power') throwBall(); }
  },
});
