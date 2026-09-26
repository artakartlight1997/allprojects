// りなの パターゴルフ。
// うえから 見た ミニゴルフ。ボールを うしろに ひっぱって はなすと うてる（ひっぱる ほど つよい）。
// かべで はねかえる・すなは とまりやすい・いけは 1うち ふえて もどる・さかは ながされる・かざぐるまは まわる。
// 9ホール。パー（めやすの うちかず）より すくなく いれよう。

'use strict';

const SAVE = 'puttgolf.v1';
const CW = 700, CH = 440;        // コースの 大きさ
const BR = 9, CUP = 13;          // ボール と カップの はんけい

// rect(x0,y0,x1,y1) の まわりの かべ
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const HOLES = [
  { par: 2, outline: box(80, 150, 620, 290), start: [140, 220], cup: [560, 220] },
  { par: 3, outline: [[60, 50], [260, 50], [260, 290], [640, 290], [640, 410], [60, 410]], start: [160, 100], cup: [585, 350] },
  { par: 2, outline: box(60, 70, 640, 370), start: [110, 220], cup: [595, 220], bumps: [[300, 160, 30], [300, 280, 30], [440, 220, 34]] },
  { par: 3, outline: box(60, 60, 640, 380), start: [110, 110], cup: [590, 330], walls: [[[250, 60], [250, 270]], [[450, 170], [450, 380]]], sand: [[270, 250, 430, 380]] },
  { par: 3, outline: box(60, 70, 640, 370), start: [110, 220], cup: [590, 220], water: [[250, 70, 450, 195], [250, 245, 450, 370]] },
  { par: 3, outline: box(60, 50, 640, 400), start: [110, 350], cup: [590, 110], slope: [[220, 50, 480, 400, 0, 260]] },
  { par: 3, outline: box(60, 140, 640, 300), start: [110, 220], cup: [590, 220], mill: [350, 220, 72, 1.6] },
  { par: 4, outline: [[60, 40], [330, 40], [330, 170], [640, 170], [640, 410], [370, 410], [370, 280], [60, 280]], start: [110, 90], cup: [590, 360], bumps: [[200, 160, 26], [500, 290, 26]], sand: [[380, 180, 520, 260]] },
  { par: 4, outline: box(40, 40, 660, 400), start: [90, 360], cup: [610, 80], walls: [[[200, 40], [200, 290]], [[400, 150], [400, 400]]], water: [[210, 300, 390, 400]], slope: [[410, 40, 660, 400, -200, 0]], mill: [300, 150, 60, -1.8], bumps: [[520, 220, 24]] },
];
const MAXSHOT = 8;

const sv = Object.assign({ best: {}, bestTotal: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

// --- ぶつり ---------------------------------------------------------------------------

function segsOf(h, t) {
  const s = [];
  const o = h.outline;
  for (let i = 0; i < o.length; i++) s.push([o[i], o[(i + 1) % o.length]]);
  for (const w of (h.walls || [])) s.push(w);
  if (h.mill) { const [mx, my, L, sp] = h.mill; const a = t * sp; s.push([[mx - Math.cos(a) * L, my - Math.sin(a) * L], [mx + Math.cos(a) * L, my + Math.sin(a) * L]]); s.push([[mx - Math.cos(a + 1.57) * L, my - Math.sin(a + 1.57) * L], [mx + Math.cos(a + 1.57) * L, my + Math.sin(a + 1.57) * L]]); }
  return s;
}
function inR(x, y, r) { return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; }

// 1コマ すすめる。 b = { x, y, vx, vy }、もどりは 'cup' / 'water' / null
function stepBall(h, b, t, dt) {
  const n = 4, d = dt / n;
  for (let k = 0; k < n; k++) {
    const segs = segsOf(h, t + d * k);
    let fr = 1.1, dec = 40;
    if ((h.sand || []).some((r) => inR(b.x, b.y, r))) { fr = 4.5; dec = 140; }
    for (const sl of (h.slope || [])) if (inR(b.x, b.y, sl)) { b.vx += sl[4] * d; b.vy += sl[5] * d; }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0) { const ns = Math.max(0, sp * Math.exp(-fr * d) - dec * d); b.vx *= ns / sp; b.vy *= ns / sp; }
    b.x += b.vx * d; b.y += b.vy * d;
    for (const [p, q] of segs) {
      const ex = q[0] - p[0], ey = q[1] - p[1], L2 = ex * ex + ey * ey;
      let u = ((b.x - p[0]) * ex + (b.y - p[1]) * ey) / L2; u = Math.max(0, Math.min(1, u));
      const cx = p[0] + ex * u, cy = p[1] + ey * u, dx = b.x - cx, dy = b.y - cy, dd = Math.hypot(dx, dy);
      if (dd < BR && dd > 0.0001) {
        const nx = dx / dd, ny = dy / dd, vn = b.vx * nx + b.vy * ny;
        b.x = cx + nx * BR; b.y = cy + ny * BR;
        if (vn < 0) { b.vx -= 1.75 * vn * nx; b.vy -= 1.75 * vn * ny; b.hit = 1; }
      }
    }
    for (const [cx, cy, r] of (h.bumps || [])) {
      const dx = b.x - cx, dy = b.y - cy, dd = Math.hypot(dx, dy);
      if (dd < r + BR) { const nx = dx / dd, ny = dy / dd, vn = b.vx * nx + b.vy * ny; b.x = cx + nx * (r + BR); b.y = cy + ny * (r + BR); if (vn < 0) { b.vx -= 2.1 * vn * nx; b.vy -= 2.1 * vn * ny; b.bump = 1; } }
    }
    // カップ
    const cdx = h.cup[0] - b.x, cdy = h.cup[1] - b.y, cd = Math.hypot(cdx, cdy), sp2 = Math.hypot(b.vx, b.vy);
    if (cd < CUP - 2 && sp2 < 430) return 'cup';
    if (cd < CUP + 6 && sp2 < 250) { b.vx += cdx * 6 * d; b.vy += cdy * 6 * d; }
    if ((h.water || []).some((r) => inR(b.x, b.y, r))) return 'water';
  }
  return null;
}

// --- あそぶ ---------------------------------------------------------------------------

function startHole(i, total) {
  const h = HOLES[i];
  G.mode = 'play';
  G.P = { i, h, ball: { x: h.start[0], y: h.start[1], vx: 0, vy: 0 }, last: [h.start[0], h.start[1]], shots: 0, moving: false, aim: null, done: 0, msg: '', msgT: 0, total: total || 0, card: G.P && i > 0 ? G.P.card : [] , ht: 0 };
  sayP('ホール ' + (i + 1) + '　パー ' + h.par, 2);
}
function sayP(s, t) { G.P.msg = s; G.P.msgT = t || 2; }
function shoot(vx, vy) {
  const P = G.P;
  P.last = [P.ball.x, P.ball.y];
  P.ball.vx = vx; P.ball.vy = vy; P.moving = true; P.shots++;
  noise(0.06, 0.2, 3000); tone(300, 0.05, 'square', 0.06);
}
function updatePlay(dt) {
  const P = G.P;
  P.ht += dt;
  if (P.msgT > 0) P.msgT -= dt;
  if (P.done) { P.done += dt; return; }
  if (!P.moving) return;
  const b = P.ball;
  const r = stepBall(P.h, b, P.ht, dt);
  if (b.hit) { b.hit = 0; tone(220, 0.04, 'triangle', 0.08); }
  if (b.bump) { b.bump = 0; tone(880, 0.06, 'square', 0.08); }
  if (r === 'cup') { holeDone(); return; }
  if (r === 'water') { P.shots++; b.x = P.last[0]; b.y = P.last[1]; b.vx = b.vy = 0; P.moving = false; sayP('ポチャン！ 1うち ふえて もどる', 2); tone(200, 0.3, 'sine', 0.1, 90); }
  if (Math.hypot(b.vx, b.vy) < 6) { b.vx = b.vy = 0; P.moving = false; if (P.shots >= MAXSHOT) { P.shots = MAXSHOT; holeDone(true); } }
}
function holeDone(giveUp) {
  const P = G.P;
  P.moving = false; P.done = 0.01;
  P.card[P.i] = P.shots;
  P.total += P.shots;
  const d = P.shots - P.h.par;
  P.word = giveUp ? 'つぎ いこう！' : P.shots === 1 ? 'ホールインワン！！' : d <= -2 ? 'イーグル！' : d === -1 ? 'バーディー！' : d === 0 ? 'パー！' : d === 1 ? 'ボギー' : 'はいった！';
  const b = sv.best[P.i];
  if (!b || P.shots < b) sv.best[P.i] = P.shots;
  save();
  if (!giveUp) jingle(d <= 0 ? [72, 76, 79, 84, 88] : [72, 76, 79], 0.08, 'square', 0.12);
}
function finishRound() {
  const P = G.P;
  if (!sv.bestTotal || P.total < sv.bestTotal) sv.bestTotal = P.total;
  save();
  G.mode = 'card';
}

// --- え -------------------------------------------------------------------------------

function org() { return { x: (VW - CW) / 2, y: 70 }; }
function drawCourse(h, t) {
  const o = org();
  ctx.save(); ctx.translate(o.x, o.y);
  // しばふ
  ctx.beginPath(); h.outline.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = '#6ACB5A'; ctx.fill();
  ctx.save(); ctx.clip();
  for (let x = 0; x < CW; x += 40) for (let y = 0; y < CH; y += 40) if (((x + y) / 40) % 2 === 0) fillR(x, y, 40, 40, 'rgba(255,255,255,0.07)');
  for (const r of (h.sand || [])) { fillRR(r[0], r[1], r[2] - r[0], r[3] - r[1], 20, '#F0DC9A'); for (let i = 0; i < 20; i++) fillC(r[0] + ((i * 37) % (r[2] - r[0])), r[1] + ((i * 23) % (r[3] - r[1])), 1.6, '#C8B070'); }
  for (const r of (h.water || [])) { fillRR(r[0], r[1], r[2] - r[0], r[3] - r[1], 14, '#4AA2E4'); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const yy = r[1] + 20 + i * 30 + Math.sin(t * 2 + i) * 3; if (yy < r[3] - 10) { ctx.beginPath(); ctx.moveTo(r[0] + 20, yy); ctx.quadraticCurveTo((r[0] + r[2]) / 2, yy - 8, r[2] - 20, yy); ctx.stroke(); } } }
  for (const sl of (h.slope || [])) {
    fillR(sl[0], sl[1], sl[2] - sl[0], sl[3] - sl[1], 'rgba(40,120,40,0.18)');
    const ang = Math.atan2(sl[5], sl[4]);
    for (let x = sl[0] + 40; x < sl[2]; x += 70) for (let y = sl[1] + 40; y < sl[3]; y += 70) {
      const u = (t * 0.8 + (x + y) * 0.003) % 1;
      ctx.save(); ctx.translate(x + Math.cos(ang) * u * 20, y + Math.sin(ang) * u * 20); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 - u * 0.4) + ')'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
  // かべ
  ctx.strokeStyle = '#8A5A34'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); h.outline.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
  for (const [p, q] of (h.walls || [])) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  for (const [x, y, r] of (h.bumps || [])) { fillC(x, y, r, '#FF6FA8'); fillC(x, y, r * 0.65, '#FFB0D0'); fillC(x - r * 0.3, y - r * 0.3, r * 0.2, '#FFFFFF'); }
  if (h.mill) {
    const [mx, my, L, sp] = h.mill, a = (G.P ? G.P.ht : t) * sp;
    ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = 8;
    for (const aa of [a, a + 1.57]) { ctx.beginPath(); ctx.moveTo(mx - Math.cos(aa) * L, my - Math.sin(aa) * L); ctx.lineTo(mx + Math.cos(aa) * L, my + Math.sin(aa) * L); ctx.stroke(); }
    fillC(mx, my, 10, '#FFE066');
  }
  // カップ と はた
  fillC(h.cup[0], h.cup[1], CUP, '#1A2A1A');
  fillR(h.cup[0] - 1.5, h.cup[1] - 54, 3, 54, '#FFFFFF');
  ctx.fillStyle = '#FF3A5A'; ctx.beginPath(); ctx.moveTo(h.cup[0] + 1.5, h.cup[1] - 54); ctx.lineTo(h.cup[0] + 30 + Math.sin(t * 5) * 3, h.cup[1] - 46); ctx.lineTo(h.cup[0] + 1.5, h.cup[1] - 38); ctx.fill();
  ctx.restore();
}

function drawPlay(t) {
  const P = G.P, o = org(), b = P.ball;
  ctx.fillStyle = grad(0, VH, '#3E8A4E', '#2A6A3A'); ctx.fillRect(0, 0, VW, VH);
  drawCourse(P.h, t);
  // ねらい
  if (P.aim && !P.moving && !P.done) {
    const [vx, vy, pw] = aimVec();
    const n = Math.hypot(vx, vy) || 1;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 1; i <= 10; i++) fillC(o.x + b.x + vx / n * i * pw * 0.2, o.y + b.y + vy / n * i * pw * 0.2, 3.2 - i * 0.18, '#FFFFFF');
    // パワー
    fillRR(20, VH - 50, 200, 22, 8, 'rgba(0,0,0,0.4)');
    fillRR(20, VH - 50, 200 * pw / 160, 22, 8, pw > 120 ? '#FF6A4A' : pw > 60 ? '#FFD24A' : '#7FE0A0');
    text('つよさ', 120, VH - 39, 14, '#FFFFFF', 'center');
  }
  // りな（ボールの そば）
  if (!P.moving && !P.done) {
    const side = P.aim ? (aimVec()[0] > 0 ? -1 : 1) : -1;
    drawKid('rina', o.x + b.x + side * 34, o.y + b.y + 20, 70, { t, pose: 'stand', dir: side < 0 ? 2 : 1 });
  }
  // ボール
  fillC(o.x + b.x + 2, o.y + b.y + 3, BR, 'rgba(0,0,0,0.25)');
  fillC(o.x + b.x, o.y + b.y, BR, '#FFFFFF'); fillC(o.x + b.x - 3, o.y + b.y - 3, 3, '#E8E8F0');
  // じょうほう
  text('ホール ' + (P.i + 1) + ' / ' + HOLES.length, 20, 30, 22, '#FFFFFF', 'left');
  text('パー ' + P.h.par + '　うった かず ' + P.shots, 20, 56, 17, '#DDF8D8', 'left');
  text('ごうけい ' + P.total, VW - 20, 30, 20, '#FFFFFF', 'right');
  btn(VW - 120, 44, 100, 36, 'やめる', () => { G.mode = 'title'; }, { col: 'rgba(255,255,255,0.8)', size: 15 });
  if (P.msgT > 0) { fillRR(VW / 2 - 200, 20, 400, 44, 12, 'rgba(0,0,0,0.45)'); text(P.msg, VW / 2, 42, 19, '#FFFFFF', 'center', true, 380); }
  if (!P.moving && !P.done && P.shots === 0 && P.i === 0 && !P.aim) text('ボールの ちかくから うしろに ひっぱって はなそう！', VW / 2, VH - 24, 17, '#FFFFFF', 'center');
  if (P.done > 0.5) {
    fillR(0, 0, VW, VH, 'rgba(0,0,0,0.35)');
    textO(P.word, VW / 2, 190, 56, '#FFE066', '#2A6A3A');
    text(P.shots + ' うち（パー ' + P.h.par + '）', VW / 2, 250, 24, '#FFFFFF', 'center');
    if (P.i + 1 < HOLES.length) btn(VW / 2 - 110, 300, 220, 70, 'つぎの ホール', () => startHole(P.i + 1, P.total), { col: '#FFE066' });
    else btn(VW / 2 - 110, 300, 220, 70, 'けっか を 見る', finishRound, { col: '#FFE066' });
  }
}
function aimVec() {
  const P = G.P, o = org();
  const dx = P.aim.sx - P.aim.x, dy = P.aim.sy - P.aim.y;
  const pw = Math.min(160, Math.hypot(dx, dy));
  return [dx, dy, pw];
}

function drawCard(t) {
  const P = G.P;
  ctx.fillStyle = grad(0, VH, '#3E8A4E', '#2A6A3A'); ctx.fillRect(0, 0, VW, VH);
  textO('スコアカード', VW / 2, 60, 40, '#FFFFFF', '#1A4A2A');
  const w = Math.min(760, VW - 40), x0 = VW / 2 - w / 2, cw = w / 12;
  fillRR(x0, 110, w, 150, 12, '#FFFFFF');
  const rows = [['ホール', (i) => i + 1, 'ごうけい'], ['パー', (i) => HOLES[i].par, HOLES.reduce((a, h) => a + h.par, 0)], ['りな', (i) => P.card[i], P.total]];
  rows.forEach((r, j) => {
    const y = 136 + j * 44;
    text(r[0], x0 + cw * 0.9, y, 17, '#2A2440', 'center');
    for (let i = 0; i < HOLES.length; i++) {
      const v = r[1](i), c = j === 2 ? (v < HOLES[i].par ? '#E04A7A' : v === HOLES[i].par ? '#2A8A4A' : '#2A2440') : '#2A2440';
      text(v, x0 + cw * (i + 2.0), y, 20, c, 'center');
    }
    text(r[2], x0 + cw * 11.1, y, r[2] === 'ごうけい' ? 15 : 20, '#2A2440', 'center');
  });
  const d = P.total - HOLES.reduce((a, h) => a + h.par, 0);
  text(d < 0 ? 'パーより ' + (-d) + ' すくない！ すごい！' : d === 0 ? 'ぴったり パー！' : 'パーより ' + d + ' おおい。 また ちょうせん！', VW / 2, 300, 24, '#FFE066', 'center');
  text('ベスト ごうけい ' + sv.bestTotal, VW / 2, 340, 18, '#DDF8D8', 'center');
  drawKid('rina', Math.min(VW - 60, VW / 2 + 320), 520, 140, { t, pose: d <= 0 ? 'cheer' : 'wave' });
  btn(VW / 2 - 230, 400, 210, 70, 'もういちど', () => { G.P = null; startHole(0, 0); }, { col: '#FFE066' });
  btn(VW / 2 + 10, 400, 210, 70, 'タイトル', () => { G.mode = 'title'; }, { col: '#D8F0D8' });
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#8ED0FF', '#E8F8FF'); ctx.fillRect(0, 0, VW, VH);
  fillR(0, 300, VW, 240, '#6ACB5A');
  fillC(VW / 2 + 180, 380, 16, '#1A2A1A'); fillR(VW / 2 + 178, 310, 3, 70, '#FFFFFF');
  ctx.fillStyle = '#FF3A5A'; ctx.beginPath(); ctx.moveTo(VW / 2 + 181, 310); ctx.lineTo(VW / 2 + 215, 320); ctx.lineTo(VW / 2 + 181, 330); ctx.fill();
  const u = (t * 0.5) % 1;
  fillC(VW / 2 - 120 + u * 300, 390 - Math.sin(u * Math.PI) * 10, 9, '#FFFFFF');
  drawKid('rina', VW / 2 - 180, 430, 170, { t, pose: 'stand', dir: 2 });
  textO('りなの パターゴルフ', VW / 2, 70, 50, '#FFFFFF', '#2A6A3A');
  text('ひっぱって はなして、カップに いれよう！ ぜんぶで 9ホール', VW / 2, 124, 19, '#2A4A2A', 'center');
  btn(VW / 2 - 130, 170, 260, 80, 'スタート！', () => { fullScreen(); G.P = null; startHole(0, 0); }, { col: '#FFE066', size: 28 });
  if (sv.bestTotal) text('ベスト ごうけい ' + sv.bestTotal + '（パー ' + HOLES.reduce((a, h) => a + h.par, 0) + '）', VW / 2, 272, 18, '#2A4A2A', 'center');
}

startGame({
  bg: '#2A6A3A',
  update(dt) { G.t += dt; if (G.mode === 'play') updatePlay(Math.min(dt, 1 / 30)); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else if (G.mode === 'card') drawCard(t); else drawPlay(t); },
  down(x, y) {
    const P = G.P;
    if (G.mode !== 'play' || P.moving || P.done) return;
    P.aim = { sx: x, sy: y, x, y };
  },
  move(x, y) { const P = G.P; if (P && P.aim) { P.aim.x = x; P.aim.y = y; } },
  up() {
    const P = G.P;
    if (!P || !P.aim) return;
    const [dx, dy, pw] = aimVec();
    P.aim = null;
    if (pw < 8) return;
    const n = Math.hypot(dx, dy);
    shoot(dx / n * pw * 5.6, dy / n * pw * 5.6);
  },
});
