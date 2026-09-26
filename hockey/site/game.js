// あおいの エアホッケー。
// ゲームセンターの エアホッケー。ゆびで マレット（うつ どうぐ）を うごかして パックを はじき、
// あいての ゴールに いれる。さきに 7てん とったら かち。あいては 5人（だんだん つよく なる）。

'use strict';

const SAVE = 'airhockey.v1';
const WIN = 7;
const PR = 17, MR = 30;          // パック と マレットの はんけい
const GOAL = 150;                // ゴールの はば
const FOES = [
  { id: 'yui', name: 'ゆい', spd: 520, react: 0.35, aim: 0.3, col: '#8FD07A' },
  { id: 'masaki', name: 'まさき', spd: 700, react: 0.22, aim: 0.5, col: '#4A8AE8' },
  { id: 'eito', name: 'エイト', spd: 860, react: 0.15, aim: 0.65, col: '#3EC08A' },
  { id: 'rina', name: 'りな', spd: 1000, react: 0.1, aim: 0.8, col: '#FF6FA8' },
  { id: 'robo', name: 'ホッケーロボ', spd: 1200, react: 0.06, aim: 0.95, col: '#9AA8C0' },
];

const sv = Object.assign({ beat: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

function table() { return { x0: 40, y0: 70, x1: VW - 40, y1: VH - 20 }; }

function startMatch(fi) {
  const T = table();
  G.mode = 'play';
  G.M = { fi, F: FOES[fi], me: 0, cpu: 0, over: 0, serveT: 1.2, flash: 0, fx: [],
    puck: { x: (T.x0 + T.x1) / 2, y: (T.y0 + T.y1) / 2, vx: 0, vy: 0 },
    p1: { x: T.x0 + 90, y: (T.y0 + T.y1) / 2, vx: 0, vy: 0, tx: T.x0 + 90, ty: (T.y0 + T.y1) / 2 },
    p2: { x: T.x1 - 90, y: (T.y0 + T.y1) / 2, vx: 0, vy: 0, think: 0, tx: T.x1 - 90, ty: (T.y0 + T.y1) / 2 },
    serveTo: Math.random() < 0.5 ? 1 : -1 };
  resetPuck();
}
function resetPuck() {
  const M = G.M, T = table();
  M.puck.x = (T.x0 + T.x1) / 2 + M.serveTo * 120;   // serveTo 1 = あいての がわ M.puck.y = (T.y0 + T.y1) / 2; M.puck.vx = M.puck.vy = 0;
  M.serveT = 1.0;
}

function moveMallet(m, dt, maxSp, xmin, xmax) {
  const T = table();
  const tx = clamp(m.tx, xmin + MR, xmax - MR), ty = clamp(m.ty, T.y0 + MR, T.y1 - MR);
  let dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy), step = maxSp * dt;
  if (d > step) { dx *= step / d; dy *= step / d; }
  m.vx = dx / dt; m.vy = dy / dt;
  m.x += dx; m.y += dy;
}
function hitMallet(m, pk) {
  const dx = pk.x - m.x, dy = pk.y - m.y, d = Math.hypot(dx, dy);
  if (d >= PR + MR || d === 0) return false;
  const nx = dx / d, ny = dy / d;
  pk.x = m.x + nx * (PR + MR); pk.y = m.y + ny * (PR + MR);
  const rvx = pk.vx - m.vx, rvy = pk.vy - m.vy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { pk.vx -= 1.9 * vn * nx; pk.vy -= 1.9 * vn * ny; }
  pk.vx += m.vx * 0.25; pk.vy += m.vy * 0.25;
  // かべに はさまれない ように：パックを だい の 中に もどし、かさなって いたら マレットの ほうを どかす
  const T = table(), gy0 = (T.y0 + T.y1) / 2 - GOAL / 2, gy1 = gy0 + GOAL;
  const inMouth = pk.y > gy0 && pk.y < gy1;
  pk.y = clamp(pk.y, T.y0 + PR, T.y1 - PR);
  if (!inMouth) pk.x = clamp(pk.x, T.x0 + PR, T.x1 - PR);
  const ex = pk.x - m.x, ey = pk.y - m.y, ed = Math.hypot(ex, ey);
  if (ed < PR + MR - 0.5) {
    const ux = ed ? ex / ed : 1, uy = ed ? ey / ed : 0;
    m.x = pk.x - ux * (PR + MR); m.y = pk.y - uy * (PR + MR);
    const cx = (T.x0 + T.x1) / 2 - pk.x, cy = (T.y0 + T.y1) / 2 - pk.y, cl = Math.hypot(cx, cy) || 1;
    pk.vx += cx / cl * 250; pk.vy += cy / cl * 250;
  }
  const sp = Math.hypot(pk.vx, pk.vy); if (sp > 1500) { pk.vx *= 1500 / sp; pk.vy *= 1500 / sp; }
  return true;
}

function cpuThink(dt) {
  const M = G.M, F = M.F, T = table(), c = M.p2, pk = M.puck;
  c.think -= dt;
  if (c.think > 0) return;
  c.think = F.react;
  const midX = (T.x0 + T.x1) / 2, goalY = (T.y0 + T.y1) / 2;
  if (pk.x > midX - 10 && (pk.vx > -250 || pk.x > T.x1 - 220)) {
    if (c.x > pk.x + 8) {
      // ゴールがわ に いるので、パックに むかって つっこむ（すこし ねらいを つける）
      const aimY = goalY + (Math.random() - 0.5) * GOAL * (1.4 - F.aim);
      const ax = T.x0 - pk.x, ay = aimY - pk.y, al = Math.hypot(ax, ay);
      const dx = pk.x - c.x, dy = pk.y - c.y, dl = Math.hypot(dx, dy) || 1;
      const mix = F.aim * 0.6;
      c.tx = pk.x + (dx / dl * (1 - mix) + ax / al * mix) * 50;
      c.ty = pk.y + (dy / dl * (1 - mix) + ay / al * mix) * 50;
    } else {
      // パックの うしろへ まわりこむ（よこから）
      c.tx = pk.x + 50;
      c.ty = pk.y + (pk.y < goalY ? 70 : -70);
    }
  } else {
    // まもる：パックと ゴールの あいだ
    c.tx = T.x1 - 70 - (1 - F.aim) * 20;
    c.ty = goalY + (pk.y - goalY) * (0.4 + F.aim * 0.4);
  }
}

function updatePlay(dt) {
  const M = G.M, T = table(), pk = M.puck;
  if (M.over) { M.over += dt; return; }
  if (M.flash > 0) M.flash -= dt;
  for (const f of M.fx) f.t -= dt;
  M.fx = M.fx.filter((f) => f.t > 0);
  const midX = (T.x0 + T.x1) / 2;
  moveMallet(M.p1, dt, 2600, T.x0, midX);
  cpuThink(dt);
  moveMallet(M.p2, dt, M.F.spd, midX, T.x1);
  if (M.serveT > 0) { M.serveT -= dt; return; }
  const n = 6, d = dt / n;
  for (let k = 0; k < n; k++) {
    pk.x += pk.vx * d; pk.y += pk.vy * d;
    const f = Math.exp(-0.25 * d); pk.vx *= f; pk.vy *= f;
    const gy0 = (T.y0 + T.y1) / 2 - GOAL / 2, gy1 = gy0 + GOAL;
    if (pk.y < T.y0 + PR) { pk.y = T.y0 + PR; pk.vy = Math.abs(pk.vy) * 0.92; wallSnd(); }
    if (pk.y > T.y1 - PR) { pk.y = T.y1 - PR; pk.vy = -Math.abs(pk.vy) * 0.92; wallSnd(); }
    if (pk.x < T.x0 + PR) {
      if (pk.y > gy0 && pk.y < gy1) { if (pk.x < T.x0 - PR) { goal(false); return; } }
      else { pk.x = T.x0 + PR; pk.vx = Math.abs(pk.vx) * 0.92; wallSnd(); }
    }
    if (pk.x > T.x1 - PR) {
      if (pk.y > gy0 && pk.y < gy1) { if (pk.x > T.x1 + PR) { goal(true); return; } }
      else { pk.x = T.x1 - PR; pk.vx = -Math.abs(pk.vx) * 0.92; wallSnd(); }
    }
    if (hitMallet(M.p1, pk) || hitMallet(M.p2, pk)) tone(520 + Math.min(600, Math.hypot(pk.vx, pk.vy) * 0.4), 0.05, 'square', 0.08);
  }
  // パックが とまって しまったら すこし うごかす
  if (Math.hypot(pk.vx, pk.vy) < 5 && Math.abs(pk.x - midX) < 4) pk.vx = (Math.random() - 0.5) * 60;
}
let lastWall = 0;
function wallSnd() { if (G.t - lastWall > 0.05) { lastWall = G.t; tone(300, 0.04, 'triangle', 0.07); } }
function goal(mine) {
  const M = G.M;
  if (mine) M.me++; else M.cpu++;
  M.serveTo = mine ? 1 : -1;       // きめられた ほう（あいての がわ）から はじめる
  M.flash = 0.4;
  M.fx.push({ s: mine ? 'ゴール！' : 'きめられた…', t: 1.2, mine });
  if (mine) jingle([72, 79, 84], 0.08, 'square', 0.12); else tone(260, 0.3, 'square', 0.08, 180);
  if (M.me >= WIN || M.cpu >= WIN) {
    M.over = 0.01;
    M.win = M.me >= WIN;
    if (M.win) { sv.beat = Math.max(sv.beat, M.fi + 1); save(); jingle([72, 76, 79, 84, 88, 91], 0.1, 'square', 0.14); }
    return;
  }
  resetPuck();
}

// --- え -------------------------------------------------------------------------------

function drawTable(t) {
  const T = table();
  ctx.fillStyle = grad(0, VH, '#1E3A6A', '#0E1A3A'); ctx.fillRect(0, 0, VW, VH);
  fillRR(T.x0 - 14, T.y0 - 14, T.x1 - T.x0 + 28, T.y1 - T.y0 + 28, 26, '#E84A6A');
  fillRR(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0, 16, '#EAF6FF');
  // あな（くうきが でる）
  ctx.fillStyle = 'rgba(120,160,200,0.25)';
  for (let x = T.x0 + 20; x < T.x1; x += 30) for (let y = T.y0 + 20; y < T.y1; y += 30) ctx.fillRect(x, y, 2, 2);
  const mx = (T.x0 + T.x1) / 2, my = (T.y0 + T.y1) / 2;
  ctx.strokeStyle = 'rgba(232,74,106,0.5)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(mx, T.y0); ctx.lineTo(mx, T.y1); ctx.stroke();
  circ(mx, my, 60); ctx.stroke();
  ctx.strokeStyle = 'rgba(74,138,232,0.5)';
  ctx.beginPath(); ctx.arc(T.x0, my, 90, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(T.x1, my, 90, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  fillR(T.x0 - 14, my - GOAL / 2, 14, GOAL, '#2A2440'); fillR(T.x1, my - GOAL / 2, 14, GOAL, '#2A2440');
}
function drawMallet(m, col) {
  fillC(m.x + 3, m.y + 5, MR, 'rgba(0,0,0,0.2)');
  fillC(m.x, m.y, MR, col); fillC(m.x, m.y, MR * 0.72, shadeC(col)); fillC(m.x, m.y, MR * 0.42, col);
  fillC(m.x - MR * 0.15, m.y - MR * 0.2, MR * 0.18, 'rgba(255,255,255,0.5)');
}
function shadeC(c) { return c + 'AA'; }
function drawPlay(t) {
  const M = G.M, T = table();
  drawTable(t);
  const pk = M.puck;
  // パックの おいかけ かげ
  const sp = Math.hypot(pk.vx, pk.vy);
  if (sp > 500) { ctx.globalAlpha = 0.25; fillC(pk.x - pk.vx * 0.02, pk.y - pk.vy * 0.02, PR, '#2A2440'); ctx.globalAlpha = 1; }
  fillC(pk.x + 2, pk.y + 4, PR, 'rgba(0,0,0,0.25)');
  fillC(pk.x, pk.y, PR, '#2A2440'); fillC(pk.x, pk.y, PR * 0.6, '#4A4460');
  drawMallet(M.p1, '#B98FE0');
  drawMallet(M.p2, M.F.col);
  // スコア
  fillRR(VW / 2 - 150, 8, 300, 52, 14, 'rgba(0,0,0,0.4)');
  drawKidFace('aoi', VW / 2 - 124, 34, 18);
  text(M.me, VW / 2 - 50, 34, 34, '#FFFFFF', 'center');
  text('-', VW / 2, 34, 28, '#FFFFFF', 'center');
  text(M.cpu, VW / 2 + 50, 34, 34, '#FFFFFF', 'center');
  if (M.F.id === 'robo') { fillRR(VW / 2 + 106, 18, 36, 32, 8, '#9AA8C0'); fillC(VW / 2 + 116, 32, 4, '#FF5A5A'); fillC(VW / 2 + 132, 32, 4, '#FF5A5A'); }
  else drawKidFace(M.F.id, VW / 2 + 124, 34, 18);
  text('さきに ' + WIN + 'てん', 20, 36, 15, 'rgba(255,255,255,0.7)', 'left');
  btn(VW - 110, 14, 96, 40, 'やめる', () => { G.mode = 'title'; }, { col: 'rgba(255,255,255,0.85)', size: 15 });
  if (M.serveT > 0 && !M.over) text('よーい…', (T.x0 + T.x1) / 2, (T.y0 + T.y1) / 2 - 90, 24, '#4A6A9A', 'center');
  M.fx.forEach((f) => { ctx.globalAlpha = Math.min(1, f.t * 2); textO(f.s, VW / 2, VH / 2, 56, f.mine ? '#FFE066' : '#B0C8FF', '#2A2440'); ctx.globalAlpha = 1; });
  if (M.flash > 0) fillR(0, 0, VW, VH, 'rgba(255,255,255,' + M.flash + ')');
  if (M.over > 1) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.5)');
    fillRR(VW / 2 - 260, 90, 520, 360, 20, '#FFFFFF');
    textO(M.win ? 'かった！' : 'まけちゃった…', VW / 2, 150, 48, M.win ? '#FFB020' : '#8A9AB0', '#FFFFFF');
    text(M.me + ' - ' + M.cpu, VW / 2, 210, 32, '#2A2440', 'center');
    drawKid('aoi', VW / 2 - 150, 330, 110, { t, pose: M.win ? 'cheer' : 'sad' });
    if (M.win && M.fi + 1 < FOES.length) btn(VW / 2 - 50, 250, 230, 70, 'つぎの あいてへ', () => startMatch(M.fi + 1), { col: '#9AF0B8' });
    else if (M.win) text('ぜんいんに かった！ チャンピオン！', VW / 2 + 60, 285, 20, '#E04A7A', 'center');
    btn(VW / 2 - 50, 330, 230, 60, 'もういちど', () => startMatch(M.fi), { col: '#FFE066', size: 20 });
    btn(VW / 2 - 50, 396, 230, 44, 'あいてを えらぶ', () => { G.mode = 'title'; }, { col: '#D8E8FF', size: 16 });
  }
}

function drawTitle(t) {
  drawTable(t);
  fillR(0, 0, VW, VH, 'rgba(14,26,58,0.55)');
  textO('あおいの エアホッケー', VW / 2, 60, 48, '#FFFFFF', '#E84A6A');
  text('ゆびで マレットを うごかして、パックを あいての ゴールへ！', VW / 2, 112, 19, '#DDEBFF', 'center');
  drawKid('aoi', 120, VH - 30, 180, { t, pose: 'wave' });
  FOES.forEach((F, i) => {
    const open = i <= sv.beat;
    const x = VW / 2 - 290 + (i % 3) * 200, y = 160 + Math.floor(i / 3) * 170;
    btn(x, y, 180, 150, '', () => { if (open) { fullScreen(); startMatch(i); } }, { col: open ? (i < sv.beat ? '#9AF0B8' : '#FFFFFF') : 'rgba(150,160,190,0.6)', off: !open });
    if (F.id === 'robo') { fillRR(x + 60, y + 24, 60, 56, 12, '#9AA8C0'); fillC(x + 78, y + 50, 7, '#FF5A5A'); fillC(x + 102, y + 50, 7, '#FF5A5A'); }
    else drawKidFace(F.id, x + 90, y + 54, 32);
    text((i + 1) + '. ' + (open ? F.name : '？？？'), x + 90, y + 112, 18, '#2A2440', 'center', true, 170);
    text(i < sv.beat ? 'かった！' : open ? 'しょうぶ！' : '🔒', x + 90, y + 136, 14, '#6A6A7A', 'center');
  });
}

startGame({
  bg: '#0E1A3A',
  update(dt) {
    G.t += dt;
    if (G.mode !== 'play') return;
    const M = G.M, s = 700 * dt;
    if (KEYS.ArrowLeft) M.p1.tx = M.p1.x - s * 4; if (KEYS.ArrowRight) M.p1.tx = M.p1.x + s * 4;
    if (KEYS.ArrowUp) M.p1.ty = M.p1.y - s * 4; if (KEYS.ArrowDown) M.p1.ty = M.p1.y + s * 4;
    updatePlay(Math.min(dt, 1 / 30));
  },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawPlay(t); },
  down(x, y) { if (G.mode === 'play') { G.M.p1.tx = x; G.M.p1.ty = y; } },
  move(x, y, drag) { if (G.mode === 'play' && drag) { G.M.p1.tx = x; G.M.p1.ty = y; } },
});
