// りなの レーンダッシュ。
// 「Subway Surfers」みたいな 3レーンの エンドレスランナー。うしろから 見た りなが どんどん はしる。
//   ・ひだり／みぎに スワイプ（やじるしキー）で レーンを かえる
//   ・うえに スワイプ（↑・スペース）で ジャンプ、したに スワイプ（↓）で スライディング
//   ・ひくい さく は ジャンプ、たかい バー は スライディング、かべ は よける
//   ・1かい ぶつかると つまずく。すぐ もういちど ぶつかると おしまい
// あつめた コインで なかま（ゆい・あおい）も はしれる ように なる。

'use strict';

const SAVE = 'lanedash.v1';
const LANE = 2.4;           // レーンの はば
const PZ = 5;               // りなの いち（カメラの まえ）
const RUNNERS = [
  { id: 'rina', need: 0 }, { id: 'yui', need: 300 }, { id: 'aoi', need: 700 },
];
const THEMES = [
  { name: 'しょうてんがい', sky: ['#8ED0FF', '#E0F4FF'], ground: '#A8D890', road: '#C8B8A8', side: 'shop' },
  { name: 'こうえん', sky: ['#9AD8FF', '#F0FFF0'], ground: '#7CC66A', road: '#D8C8A0', side: 'tree' },
  { name: 'ゆうやけ ビル', sky: ['#F08A5A', '#FFD8A8'], ground: '#9AB07A', road: '#A89890', side: 'city' },
  { name: 'よるの まち', sky: ['#101838', '#2A3A6A'], ground: '#2A3A3A', road: '#4A4A58', side: 'city' },
];

const sv = Object.assign({ best: 0, coins: 0, runner: 'rina' }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

function startRun() {
  G.mode = 'run';
  G.R = { lane: 1, x: 0, y: 0, vy: 0, slide: 0, dist: 0, v: 13, coins: 0, objs: [], nextZ: 40, stumble: 0, over: 0, magnet: 0, star: 0, t: 0, fx: [], shake: 0, runT: 0 };
  tone(660, 0.1, 'triangle', 0.1);
}

// --- ならべる -------------------------------------------------------------------------

function spawnRow(z) {
  const R = G.R;
  const hard = Math.min(1, R.dist / 3000);
  const row = [0, 0, 0];
  // かべは さいだい 2つ（かならず 1レーンは とおれる）
  const nBlock = Math.random() < 0.25 + hard * 0.35 ? (Math.random() < 0.35 + hard * 0.3 ? 2 : 1) : 0;
  const lanes = shuffle([0, 1, 2]);
  for (let i = 0; i < nBlock; i++) row[lanes[i]] = 'block';
  for (let i = nBlock; i < 3; i++) {
    const r = Math.random();
    if (r < 0.18 + hard * 0.12) row[lanes[i]] = 'bar';
    else if (r < 0.32 + hard * 0.2) row[lanes[i]] = 'high';
  }
  row.forEach((k, l) => { if (k) R.objs.push({ kind: k, lane: l, z, len: k === 'block' ? (Math.random() < 0.4 ? 10 : 3) : 0.6 }); });
  // コイン
  const free = [0, 1, 2].filter((l) => !row[l]);
  if (free.length && Math.random() < 0.7) {
    const l = pick(free);
    for (let i = 0; i < 6; i++) R.objs.push({ kind: 'coin', lane: l, z: z + 4 + i * 2.2, h: 0.6 });
  }
  // コインの アーチ（ジャンプで とる）
  const barLane = row.indexOf('bar');
  if (barLane >= 0 && Math.random() < 0.6) for (let i = 0; i < 5; i++) R.objs.push({ kind: 'coin', lane: barLane, z: z - 4 + i * 2, h: 0.6 + Math.sin(i / 4 * Math.PI) * 1.8 });
  if (Math.random() < 0.06 && free.length) R.objs.push({ kind: Math.random() < 0.5 ? 'magnet' : 'star', lane: pick(free), z: z + 8, h: 0.9 });
}

// --- うごき -------------------------------------------------------------------------

function move(d) {
  const R = G.R;
  if (!R || R.over) return;
  if (d === 'l' && R.lane > 0) { R.lane--; tone(700, 0.04, 'triangle', 0.06); }
  if (d === 'r' && R.lane < 2) { R.lane++; tone(700, 0.04, 'triangle', 0.06); }
  if (d === 'u' && R.y <= 0.01) { R.vy = 11; R.slide = 0; tone(500, 0.12, 'square', 0.06, 900); }
  if (d === 'd') { if (R.y > 0.2) R.vy = -18; R.slide = 0.7; noise(0.12, 0.08, 1800); }
}

function updateRun(dt) {
  const R = G.R;
  R.t += dt;
  if (R.over) { R.over += dt; return; }
  R.v = Math.min(30, 13 + R.dist / 180);
  const dz = R.v * dt;
  R.dist += dz;
  R.runT += dt * R.v / 13;
  R.x += (R.lane - 1 - R.x) * Math.min(1, dt * 14);
  R.vy -= 32 * dt; R.y = Math.max(0, R.y + R.vy * dt); if (R.y === 0) R.vy = 0;
  if (R.slide > 0) R.slide -= dt;
  if (R.stumble > 0) R.stumble -= dt;
  if (R.magnet > 0) R.magnet -= dt;
  if (R.star > 0) R.star -= dt;
  if (R.shake > 0) R.shake -= dt;
  for (const o of R.objs) o.z -= dz;
  R.nextZ -= dz;
  while (R.nextZ < 130) { spawnRow(R.nextZ + 20); R.nextZ += Math.max(14, 26 - R.dist / 400); }
  // あたり
  const px = R.x;
  for (const o of R.objs) {
    if (o.dead) continue;
    const ox = o.lane - 1;
    if (o.kind === 'coin' || o.kind === 'magnet' || o.kind === 'star') {
      if (R.magnet > 0 && o.kind === 'coin' && o.z < 30 && o.z > PZ - 1) { o.lane += ((R.x + 1) - o.lane) * Math.min(1, dt * 8); o.h += (R.y + 0.8 - o.h) * Math.min(1, dt * 8); }
      if (Math.abs(o.z - PZ) < 0.9 && Math.abs(ox - px) < 0.5 && Math.abs(o.h - (R.y + 0.8)) < 1.3) {
        o.dead = 1;
        if (o.kind === 'coin') { R.coins++; tone(1320 + (R.coins % 5) * 80, 0.05, 'square', 0.05); }
        else { R[o.kind] = o.kind === 'magnet' ? 8 : 6; jingle([79, 84, 88], 0.06, 'square', 0.1); R.fx.push({ s: o.kind === 'magnet' ? 'マグネット！' : 'むてき！', t: 1.4 }); }
      }
      continue;
    }
    if (Math.abs(ox - px) > 0.55) continue;
    if (o.z - PZ > 0.4 || o.z + o.len - PZ < -0.4) continue;
    let hit = false;
    if (o.kind === 'block') hit = true;
    if (o.kind === 'bar' && R.y < 0.9) hit = true;
    if (o.kind === 'high' && R.slide <= 0) hit = true;
    if (!hit) continue;
    o.dead = 1;
    if (R.star > 0) { R.fx.push({ s: 'ドカーン！', t: 0.8 }); noise(0.2, 0.2, 600); continue; }
    R.shake = 0.35;
    if (R.stumble > 0 || o.kind === 'block') { gameOver(); return; }
    R.stumble = 4; R.fx.push({ s: 'つまずいた！ きをつけて', t: 1.6 }); noise(0.25, 0.2, 500);
  }
  R.objs = R.objs.filter((o) => o.z + (o.len || 0) > -2 && !(o.dead && o.kind !== 'block'));
  for (const f of R.fx) f.t -= dt;
  R.fx = R.fx.filter((f) => f.t > 0);
}
function gameOver() {
  const R = G.R;
  R.over = 0.01;
  const score = Math.floor(R.dist) + R.coins * 10;
  R.score = score;
  R.newBest = score > sv.best;
  sv.best = Math.max(sv.best, score);
  sv.coins += R.coins;
  save();
  tone(300, 0.5, 'square', 0.1, 120); noise(0.3, 0.2, 400);
}

// --- え -------------------------------------------------------------------------------

function drawRun(t) {
  const R = G.R;
  const th = THEMES[Math.floor(R.dist / 900) % THEMES.length];
  const HY = 170, F = 330, camY = 3.4, cx = VW / 2 + (R.shake > 0 ? Math.sin(t * 80) * 8 : 0);
  ctx.fillStyle = grad(0, HY, th.sky[0], th.sky[1]); ctx.fillRect(0, 0, VW, HY);
  if (th.name === 'よるの まち') for (let i = 0; i < 40; i++) fillC((i * 97) % VW, (i * 41) % HY, 1.3, '#FFF6C8');
  fillR(0, HY, VW, VH - HY, th.ground);
  const camX = R.x * LANE * 0.55;
  const proj = (x, y, z) => { const zz = Math.max(0.5, z + 3); return { x: cx + (x - camX) * F / zz, y: HY + (camY - y) * F / zz, s: F / zz }; };
  // みち
  const roadPoly = (x0, x1, col) => {
    const a = proj(x0, 0, 0), b = proj(x1, 0, 0), c = proj(x1, 0, 200), d = proj(x0, 0, 200);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  };
  roadPoly(-LANE * 1.6, LANE * 1.6, th.road);
  // しま もよう（はやさが わかる）
  for (let k = 0; k < 30; k++) {
    const z = k * 6 - (R.dist % 6);
    const a = proj(-LANE * 1.6, 0, z), b = proj(LANE * 1.6, 0, z), c = proj(LANE * 1.6, 0, z + 3), d = proj(-LANE * 1.6, 0, z + 3);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  }
  for (const lx of [-0.5, 0.5]) { const a = proj(lx * LANE, 0, 0), b = proj(lx * LANE, 0, 200); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  // よこの けしき
  const sides = [];
  for (let k = 0; k < 16; k++) { const z = k * 10 - (R.dist % 10); for (const sg of [-1, 1]) sides.push({ z, sg, k: Math.floor((R.dist + z) / 10) }); }
  sides.sort((a, b) => b.z - a.z);
  // もの（とおい じゅん）と いっしょに かく
  const list = sides.map((s) => ({ z: s.z, f: () => drawSide(s, proj, th) }))
    .concat(R.objs.filter((o) => o.z < 140 && !o.dead).map((o) => ({ z: o.z, f: () => drawObj(o, proj, t) })));
  list.push({ z: PZ, f: () => drawPlayer(proj, t), me: 1 });
  list.sort((a, b) => b.z - a.z || (a.me ? 1 : -1));
  for (const d of list) d.f();
  // HUD
  fillRR(12, 10, 200, 46, 12, 'rgba(0,0,0,0.35)');
  text(Math.floor(R.dist) + ' m', 26, 33, 24, '#FFFFFF', 'left');
  fillRR(222, 10, 130, 46, 12, 'rgba(0,0,0,0.35)');
  fillC(246, 33, 11, '#FFD24A'); text('× ' + R.coins, 264, 33, 22, '#FFE066', 'left');
  text(th.name, VW - 20, 30, 16, 'rgba(255,255,255,0.85)', 'right');
  if (R.magnet > 0) text('🧲 ' + Math.ceil(R.magnet), VW - 20, 56, 18, '#FFFFFF', 'right');
  if (R.star > 0) text('⭐ ' + Math.ceil(R.star), VW - 90, 56, 18, '#FFFFFF', 'right');
  if (R.stumble > 0) text('あと 1かいで アウト！', VW / 2, 80, 18, '#FFB0B0', 'center');
  R.fx.forEach((f, i) => { ctx.globalAlpha = Math.min(1, f.t * 2); textO(f.s, VW / 2, 120 + i * 36, 30, '#FFE066', '#E86A00'); ctx.globalAlpha = 1; });
  if (R.t < 3 && !R.over) text('← → で レーン・↑ ジャンプ・↓ スライディング（スワイプでも OK）', VW / 2, VH - 24, 16, '#FFFFFF', 'center', true, VW - 40);
  if (R.over > 0.6) drawOver(t);
}
function drawSide(s, proj, th) {
  const x = s.sg * (LANE * 1.6 + 3.5);
  const a = proj(x, 0, s.z);
  if (a.s < 1) return;
  const col = ['#F2E6D0', '#E8D8F0', '#D8E8F8', '#F8E0D0', '#E0F0D8'][((s.k * 7 + (s.sg > 0 ? 3 : 0)) % 5 + 5) % 5];
  if (th.side === 'tree') {
    fillR(a.x - a.s * 0.3, a.y - a.s * 3, a.s * 0.6, a.s * 3, '#7A5234');
    fillC(a.x, a.y - a.s * 3.6, a.s * 2, (s.k % 3) ? '#3E9B4F' : '#FFB8D0');
    return;
  }
  const w = a.s * 5, h = a.s * (th.side === 'city' ? 8 + (s.k % 3) * 3 : 4.5);
  fillR(a.x - w / 2, a.y - h, w, h, th.name === 'よるの まち' ? '#2A3048' : col);
  if (th.side === 'shop') { const aw = ['#E04A6E', '#4A8AE8', '#FFB020'][(s.k % 3 + 3) % 3]; fillR(a.x - w / 2, a.y - h * 0.62, w, h * 0.12, aw); fillR(a.x - w * 0.35, a.y - h * 0.45, w * 0.7, h * 0.4, '#8AC8F0'); }
  else for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) fillR(a.x - w * 0.3 + c * w * 0.35, a.y - h + h * 0.1 + r * h * 0.2, w * 0.22, h * 0.1, th.name === 'よるの まち' ? '#FFE890' : '#8AC8F0');
}
function drawObj(o, proj, t) {
  const x = (o.lane - 1) * LANE;
  if (o.kind === 'coin') {
    const a = proj(x, o.h, o.z); const r = a.s * 0.35, w = Math.abs(Math.cos(t * 5 + o.z)) * r + 1;
    ellipse(a.x, a.y, w, r); ctx.fillStyle = '#FFD24A'; ctx.fill(); ctx.strokeStyle = '#E8A020'; ctx.lineWidth = Math.max(1, r * 0.2); ctx.stroke();
    return;
  }
  if (o.kind === 'magnet' || o.kind === 'star') {
    const a = proj(x, o.h + Math.sin(t * 4) * 0.2, o.z);
    fillC(a.x, a.y, a.s * 0.55, 'rgba(255,255,255,0.6)');
    if (o.kind === 'star') { star(a.x, a.y, a.s * 0.45); ctx.fillStyle = '#FFD24A'; ctx.fill(); }
    else { ctx.strokeStyle = '#E04A4A'; ctx.lineWidth = a.s * 0.18; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 0.3, Math.PI, 0); ctx.stroke(); }
    return;
  }
  const w = LANE * 0.42;
  const box = (h0, h1, col, top) => {
    const f0 = proj(x - w, h1, o.z), f1 = proj(x + w, h0, o.z);
    const b0 = proj(x - w, h1, o.z + o.len), b1 = proj(x + w, h1, o.z + o.len);
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b0.x, b0.y); ctx.fill();
    fillR(f0.x, f0.y, f1.x - f0.x, f1.y - f0.y, col);
    return [f0, f1];
  };
  if (o.kind === 'block') {
    const [f0, f1] = box(0, 2.6, o.len > 5 ? '#4A8AE8' : '#E86A4A', o.len > 5 ? '#8AB8F0' : '#F09A7A');
    if (o.len > 5) { const ww = f1.x - f0.x; for (let i = 0; i < 2; i++) fillR(f0.x + ww * (0.12 + i * 0.46), f0.y + (f1.y - f0.y) * 0.15, ww * 0.3, (f1.y - f0.y) * 0.3, '#DDF0FF'); }
    else { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.moveTo(f1.x, f0.y); ctx.lineTo(f0.x, f1.y); ctx.stroke(); }
  } else if (o.kind === 'bar') {
    const a = proj(x - w, 0.9, o.z), b = proj(x + w, 0, o.z);
    const h = (b.y - a.y);
    fillR(a.x, a.y, b.x - a.x, h * 0.35, '#FFFFFF'); for (let i = 0; i < 4; i++) fillR(a.x + (b.x - a.x) * i / 4, a.y, (b.x - a.x) / 8, h * 0.35, '#E04A4A');
    fillR(a.x + 2, a.y, (b.x - a.x) * 0.06, h, '#6A6A7A'); fillR(b.x - 2 - (b.x - a.x) * 0.06, a.y, (b.x - a.x) * 0.06, h, '#6A6A7A');
  } else if (o.kind === 'high') {
    const a = proj(x - w, 2.6, o.z), b = proj(x + w, 1.4, o.z), g = proj(x, 0, o.z);
    fillR(a.x, a.y, b.x - a.x, b.y - a.y, '#FFB020');
    text('しゃがめ', (a.x + b.x) / 2, (a.y + b.y) / 2, (b.y - a.y) * 0.5, '#5A3A10', 'center', true, b.x - a.x - 4);
    fillR(a.x, a.y, (b.x - a.x) * 0.06, g.y - a.y, '#6A6A7A'); fillR(b.x - (b.x - a.x) * 0.06, a.y, (b.x - a.x) * 0.06, g.y - a.y, '#6A6A7A');
  }
}
function drawPlayer(proj, t) {
  const R = G.R;
  const a = proj(R.x * LANE, R.y, PZ), g = proj(R.x * LANE, 0, PZ);
  ellipse(g.x, g.y, 30, 8); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  if (R.star > 0) { fillC(a.x, a.y - 60, 70, 'rgba(255,230,100,' + (0.25 + Math.sin(t * 12) * 0.1) + ')'); }
  if (R.stumble > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.5;
  const pose = R.over ? 'sad' : R.y > 0.05 ? 'jump' : 'run';
  const h = R.slide > 0 && !R.over ? 70 : 130;
  drawKid(sv.runner, a.x, a.y, h, { t: R.runT, pose, dir: 3 });
  ctx.globalAlpha = 1;
}
function drawOver(t) {
  const R = G.R;
  fillR(0, 0, VW, VH, 'rgba(0,0,0,0.5)');
  fillRR(VW / 2 - 250, 70, 500, 380, 20, '#FFFFFF');
  textO('おしまい！', VW / 2, 120, 42, '#FF6FA8', '#FFFFFF');
  text(Math.floor(R.dist) + ' m はしった', VW / 2, 180, 24, '#2A2440', 'center');
  text('コイン ' + R.coins + ' まい（×10）', VW / 2, 214, 20, '#8A6A10', 'center');
  text('スコア ' + R.score, VW / 2, 256, 34, '#2A2440', 'center');
  text(R.newBest ? 'じこベスト こうしん！' : 'ベスト ' + sv.best, VW / 2, 296, 18, R.newBest ? '#E04A7A' : '#6A6A7A', 'center');
  btn(VW / 2 - 220, 340, 210, 70, 'もういちど', startRun, { col: '#FFE066' });
  btn(VW / 2 + 10, 340, 210, 70, 'タイトル', () => { G.mode = 'title'; }, { col: '#D8E8FF' });
  void t;
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#FF8FB8', '#FFE0EC'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 12; i++) { const x = ((i * 120 - t * 300) % (VW + 200) + VW + 200) % (VW + 200) - 100; fillRR(x, 300 + (i % 3) * 8, 60, 6, 3, 'rgba(255,255,255,0.6)'); }
  textO('りなの レーンダッシュ', VW / 2, 70, 50, '#FFFFFF', '#E04A7A');
  text('よけて・とんで・すべって、どこまでも はしろう！', VW / 2, 124, 20, '#8A2A5A', 'center');
  drawKid(sv.runner, VW / 2 - 200, 390, 190, { t: t * 1.6, pose: 'run', dir: 2 });
  text('ベスト ' + sv.best, VW / 2 + 120, 200, 24, '#2A2440', 'center');
  fillC(VW / 2 + 60, 240, 12, '#FFD24A'); text('× ' + sv.coins, VW / 2 + 80, 240, 22, '#8A6A10', 'left');
  btn(VW / 2 + 10, 280, 240, 80, 'スタート！', () => { fullScreen(); startRun(); }, { col: '#FFE066', size: 28 });
  // はしる人
  RUNNERS.forEach((r, i) => {
    const ok = sv.coins >= r.need || i === 0;
    const bx = VW / 2 - 180 + i * 130, by = 410;
    btn(bx, by, 110, 110, '', () => { if (ok) { sv.runner = r.id; save(); } }, { col: sv.runner === r.id ? '#FFE066' : ok ? '#FFFFFF' : 'rgba(200,180,190,0.6)', off: !ok });
    drawKidFace(r.id, bx + 55, by + 46, 26);
    text(ok ? KIDS[r.id].name : 'コイン ' + r.need, bx + 55, by + 94, 15, '#2A2440', 'center');
  });
}

startGame({
  bg: '#FF8FB8',
  update(dt) { G.t += dt; if (G.mode === 'run') updateRun(Math.min(dt, 1 / 30)); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawRun(t); },
  down(x, y) { G.sw = { x, y }; },
  up(x, y) {
    if (G.mode !== 'run' || !G.sw) return;
    const dx = x - G.sw.x, dy = y - G.sw.y;
    G.sw = null;
    if (Math.hypot(dx, dy) < 24) { move(x < VW / 3 ? 'l' : x > VW * 2 / 3 ? 'r' : 'u'); return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 'l' : 'r'); else move(dy < 0 ? 'u' : 'd');
  },
  key(code, down) {
    if (!down || G.mode !== 'run') return;
    if (code === 'ArrowLeft') move('l');
    if (code === 'ArrowRight') move('r');
    if (code === 'ArrowUp' || code === 'Space') move('u');
    if (code === 'ArrowDown') move('d');
  },
});
