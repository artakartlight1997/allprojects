// ゆいの パクパク おおきくなれ。
// 大きな テーブルの 上で、おかしを パクパク たべて 大きく なる きょうそう。
// 60びょうで いちばん 大きい 子が かち。小さい あいてに ぶつかると すこし もらえる。
// 全5カップ。1い〜3いで メダル。
//
// そうさ：画面を おさえた ところが スティックの まんなか。ひっぱった ほうへ すすむ。

'use strict';

const SAVE = 'pakupaku.v1';
const sv = store.get(SAVE, { medals: {} });
const AW = 2200, AH = 1500;          // テーブルの ひろさ
const ROUND = 60;

const CUPS = [
  { name: 'いちごカップ', table: '#FFE8F0', edge: '#E88AA8', cpu: 0.55, foods: 70 },
  { name: 'クッキーカップ', table: '#FFF0D8', edge: '#C8905A', cpu: 0.7, foods: 70 },
  { name: 'ドーナツカップ', table: '#E8F4FF', edge: '#7AA8D8', cpu: 0.82, foods: 65 },
  { name: 'ケーキカップ', table: '#F4E8FF', edge: '#A88AD8', cpu: 0.92, foods: 62 },
  { name: 'キングカップ', table: '#FFF4C8', edge: '#D8A830', cpu: 1.0, foods: 60 },
];
const FOODS = [
  { k: 'ichigo', v: 1, r: 12, w: 10 },
  { k: 'cookie', v: 2, r: 14, w: 6 },
  { k: 'donut', v: 3, r: 16, w: 4 },
  { k: 'pudding', v: 5, r: 18, w: 2 },
  { k: 'cake', v: 10, r: 24, w: 0.6 },
];
const RIVALS = [
  { name: 'ゆい', col: '#FF8FC0', face: '#FFE0EC', you: 1 },
  { name: 'まるまる', col: '#7FC8F8', face: '#E0F4FF' },
  { name: 'もぐもぐ', col: '#9AE07A', face: '#E8FFE0' },
  { name: 'ぱくりん', col: '#FFC04A', face: '#FFF4D0' },
];

const K = { mode: 'title', cup: 0, eaters: [], foods: [], t: 0, cam: { x: 0, y: 0 }, stick: null, parts: [], texts: [], result: null };

function radius(e) { return 18 + Math.sqrt(e.mass) * 5.2; }
function spawnFood() {
  let tot = 0; for (const f of FOODS) tot += f.w;
  let r = Math.random() * tot, F2 = FOODS[0];
  for (const f of FOODS) { r -= f.w; if (r <= 0) { F2 = f; break; } }
  return { k: F2.k, v: F2.v, r: F2.r, x: rnd(60, AW - 60), y: rnd(60, AH - 60), bob: Math.random() * 6 };
}

function startCup(i) {
  K.cup = i; K.mode = 'play'; K.t = ROUND; K.goT = 0; K.parts = []; K.texts = []; K.result = null; K.countdown = 3;
  K.eaters = RIVALS.map((R, j) => ({ ...R, x: AW / 2 + Math.cos(j * Math.PI / 2) * 300, y: AH / 2 + Math.sin(j * Math.PI / 2) * 250,
    vx: 0, vy: 0, mass: 4, chew: 0, tgt: null, think: 0, hurt: 0 }));
  K.foods = [];
  for (let n = 0; n < CUPS[i].foods; n++) K.foods.push(spawnFood());
}

function speedOf(e) { return 330 - Math.min(150, Math.sqrt(e.mass) * 9); }

function update(dt) {
  if (K.mode !== 'play') return;
  if (K.countdown > 0) { const c0 = Math.ceil(K.countdown); K.countdown -= dt; if (Math.ceil(K.countdown) !== c0) tone(K.countdown <= 0 ? 880 : 520, 0.12, 'square', 0.1); return; }
  if (K.result) return;
  K.goT = (K.goT || 0) + dt;
  K.t -= dt;
  const me = K.eaters[0];
  // じぶんの うごき
  let dx = 0, dy = 0;
  if (K.stick && K.stick.on) { dx = K.stick.dx; dy = K.stick.dy; }
  if (KEYS.ArrowLeft) dx -= 1; if (KEYS.ArrowRight) dx += 1; if (KEYS.ArrowUp) dy -= 1; if (KEYS.ArrowDown) dy += 1;
  const l = Math.hypot(dx, dy);
  if (l > 0.1) { const k = Math.min(1, l) / l; me.vx = lerp(me.vx, dx * k * speedOf(me), 0.2); me.vy = lerp(me.vy, dy * k * speedOf(me), 0.2); }
  else { me.vx *= 0.85; me.vy *= 0.85; }
  // CPU
  const lv = CUPS[K.cup].cpu;
  for (let i = 1; i < K.eaters.length; i++) {
    const e = K.eaters[i];
    e.think -= dt;
    if (e.think <= 0 || !e.tgt || e.tgt.gone) {
      e.think = rnd(0.3, 0.8) / lv;
      let best = null, bs = -1;
      for (const f of K.foods) {
        const d = Math.hypot(f.x - e.x, f.y - e.y);
        const s = f.v / (d + 80);
        if (s > bs) { bs = s; best = f; }
      }
      // 小さい あいてを ねらう ことも ある
      for (const o of K.eaters) {
        if (o === e || o.mass > e.mass * 0.75) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        const s = (e.mass - o.mass) * 0.08 * Math.max(0, (lv - 0.5) * 2) / (d + 80);
        if (s > bs && d < 500) { bs = s; best = o; }
      }
      e.tgt = best;
    }
    let tx = 0, ty = 0;
    if (e.tgt) { tx = e.tgt.x - e.x; ty = e.tgt.y - e.y; }
    // 大きい あいてからは にげる
    for (const o of K.eaters) {
      if (o === e || o.mass < e.mass * 1.25) continue;
      const ddx = e.x - o.x, ddy = e.y - o.y, d = Math.hypot(ddx, ddy);
      if (d < 260) { tx += ddx / d * 300 * lv; ty += ddy / d * 300 * lv; }
    }
    const tl = Math.hypot(tx, ty) || 1;
    const sp = speedOf(e) * (0.5 + lv * 0.42);
    e.vx = lerp(e.vx, tx / tl * sp, 0.12); e.vy = lerp(e.vy, ty / tl * sp, 0.12);
  }
  for (const e of K.eaters) {
    e.x = clamp(e.x + e.vx * dt, radius(e), AW - radius(e));
    e.y = clamp(e.y + e.vy * dt, radius(e), AH - radius(e));
    if (e.chew > 0) e.chew -= dt;
    if (e.hurt > 0) e.hurt -= dt;
    // たべる
    const r = radius(e);
    for (const f of K.foods) {
      if (f.gone) continue;
      if (Math.hypot(f.x - e.x, f.y - e.y) < r + f.r * 0.4) {
        f.gone = true; e.mass += f.v; e.chew = 0.25;
        if (e.you) { tone(700 + f.v * 60, 0.06, 'triangle', 0.1, 1200); if (f.v >= 5) K.texts.push({ s: '+' + f.v, x: f.x, y: f.y, t: 0.8 }); }
        for (let q = 0; q < 5 && K.parts.length < 200; q++) K.parts.push({ x: f.x, y: f.y, vx: rnd(-120, 120), vy: rnd(-120, 120), t: 0.4, c: e.col });
      }
    }
  }
  // ぶつかり
  for (let i = 0; i < K.eaters.length; i++) for (let j = i + 1; j < K.eaters.length; j++) {
    const a = K.eaters[i], b = K.eaters[j];
    const dx2 = b.x - a.x, dy2 = b.y - a.y, d = Math.hypot(dx2, dy2), rs = radius(a) + radius(b);
    if (d >= rs || d === 0) continue;
    const nx = dx2 / d, ny = dy2 / d, ov = rs - d;
    const big = a.mass >= b.mass ? a : b, small = big === a ? b : a;
    // 大きい ほうが すこし もらう（1かい ぶつかる ごとに）
    if (small.hurt <= 0 && big.mass > small.mass * 1.15 && small.mass > 3) {
      const take = Math.max(1, Math.round(small.mass * 0.12));
      small.mass -= take; big.mass += take; small.hurt = 0.8;
      if (big.you) { tone(900, 0.1, 'square', 0.1, 1400); K.texts.push({ s: 'パクッ +' + take, x: big.x, y: big.y - radius(big), t: 0.9 }); }
      if (small.you) { tone(220, 0.15, 'square', 0.1, 120); K.texts.push({ s: 'とられた… -' + take, x: small.x, y: small.y - radius(small), t: 0.9 }); }
    }
    const ma = a.mass, mb = b.mass;
    a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb);
    b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
    const push = 180;
    a.vx -= nx * push * mb / (ma + mb); a.vy -= ny * push * mb / (ma + mb);
    b.vx += nx * push * ma / (ma + mb); b.vy += ny * push * ma / (ma + mb);
  }
  K.foods = K.foods.filter((f) => !f.gone);
  while (K.foods.length < CUPS[K.cup].foods) K.foods.push(spawnFood());
  for (const p of K.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
  K.parts = K.parts.filter((p) => p.t > 0);
  for (const t2 of K.texts) { t2.t -= dt; t2.y -= 40 * dt; }
  K.texts = K.texts.filter((t2) => t2.t > 0);
  // カメラ
  K.cam.x = lerp(K.cam.x, me.x - VW / 2, 0.15);
  K.cam.y = lerp(K.cam.y, me.y - VH / 2, 0.15);
  if (K.t <= 0) finish();
}

function finish() {
  const order = K.eaters.slice().sort((a, b) => b.mass - a.mass);
  const place = order.indexOf(K.eaters[0]) + 1;
  K.result = { order, place };
  if (place <= 3) {
    const prev = sv.medals[K.cup] || 9;
    sv.medals[K.cup] = Math.min(prev, place);
    store.set(SAVE, sv);
  }
  if (place === 1) jingle([72, 76, 79, 84, 88], 0.1, 'square', 0.15);
  else if (place <= 3) jingle([72, 76, 79], 0.1, 'square', 0.14);
  else tone(300, 0.4, 'triangle', 0.14, 150);
}

// --- かく ----------------------------------------------------------------------------

function drawFood(f, x, y, t) {
  const b = Math.sin(t * 3 + f.bob) * 2;
  y += b;
  if (f.k === 'ichigo') {
    ctx.fillStyle = '#FF3A5A'; ctx.beginPath(); ctx.moveTo(x - 11, y - 5); ctx.quadraticCurveTo(x, y - 12, x + 11, y - 5); ctx.quadraticCurveTo(x + 8, y + 10, x, y + 13); ctx.quadraticCurveTo(x - 8, y + 10, x - 11, y - 5); ctx.fill();
    ctx.fillStyle = '#FFF4B0'; for (let i = 0; i < 5; i++) fillC(x - 5 + (i % 3) * 5, y + (i < 3 ? 0 : 5), 1.2, '#FFF4B0');
    ctx.fillStyle = '#4AA84A'; ellipse(x, y - 9, 7, 3); ctx.fill();
  } else if (f.k === 'cookie') {
    fillC(x, y, 14, '#D8A060'); fillC(x - 4, y - 3, 2.5, '#6A3A1A'); fillC(x + 5, y + 2, 2.5, '#6A3A1A'); fillC(x - 1, y + 6, 2, '#6A3A1A');
  } else if (f.k === 'donut') {
    fillC(x, y, 16, '#E8A860'); fillC(x, y, 13, '#FF8FC8'); fillC(x, y, 5, CUPS[K.cup].table);
    for (let i = 0; i < 6; i++) fillR(x + Math.cos(i) * 9 - 1, y + Math.sin(i * 1.7) * 9 - 1, 3, 2, ['#FFFFFF', '#FFE066', '#7FC8F8'][i % 3]);
  } else if (f.k === 'pudding') {
    ctx.fillStyle = '#FFD86A'; ctx.beginPath(); ctx.moveTo(x - 16, y + 12); ctx.lineTo(x - 11, y - 10); ctx.lineTo(x + 11, y - 10); ctx.lineTo(x + 16, y + 12); ctx.fill();
    ctx.fillStyle = '#8A4A1A'; ellipse(x, y - 10, 11, 4); ctx.fill();
    fillC(x, y - 16, 3.5, '#E8283A');
  } else {
    fillRR(x - 22, y - 10, 44, 26, 6, '#FFF4E8'); fillR(x - 22, y + 2, 44, 5, '#FF8FB8');
    fillRR(x - 22, y - 14, 44, 8, 4, '#FFFFFF');
    for (let i = 0; i < 3; i++) fillC(x - 12 + i * 12, y - 16, 4.5, '#FF3A5A');
  }
}

function drawEater(e, x, y, t) {
  const r = radius(e);
  const sq = e.chew > 0 ? 1 + Math.sin(e.chew * 40) * 0.08 : 1;
  ellipse(x + 4, y + r * 0.85, r * 0.9, r * 0.25); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(sq, 2 - sq);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, e.face); g.addColorStop(1, e.col);
  ctx.fillStyle = g; circ(0, 0, r); ctx.fill();
  if (e.hurt > 0 && Math.floor(e.hurt * 20) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; circ(0, 0, r); ctx.fill(); }
  // かお（すすむ ほうを 見る）
  const l = Math.hypot(e.vx, e.vy) || 1, lx = e.vx / l * r * 0.12, ly = e.vy / l * r * 0.12;
  for (const sg of [-1, 1]) { fillC(sg * r * 0.3 + lx, -r * 0.12 + ly, r * 0.16, '#FFFFFF'); fillC(sg * r * 0.3 + lx * 1.5, -r * 0.1 + ly * 1.5, r * 0.09, '#2A2028'); }
  fillC(-r * 0.5, r * 0.15, r * 0.12, 'rgba(255,100,140,0.45)'); fillC(r * 0.5, r * 0.15, r * 0.12, 'rgba(255,100,140,0.45)');
  if (e.chew > 0) { ctx.fillStyle = '#7A2438'; ellipse(lx, r * 0.3 + ly, r * 0.18, r * 0.15); ctx.fill(); }
  else { ctx.strokeStyle = '#7A2438'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.beginPath(); ctx.arc(lx, r * 0.2 + ly, r * 0.14, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.restore();
  if (e.you) { ctx.fillStyle = '#FFFFFF'; textO('ゆい', x, y - r - 14, 16, '#FF6FA8', '#FFFFFF'); }
}

function drawPlay(t) {
  const C = CUPS[K.cup];
  fillR(0, 0, VW, VH, C.edge);
  ctx.save();
  ctx.translate(-Math.round(K.cam.x), -Math.round(K.cam.y));
  fillRR(-20, -20, AW + 40, AH + 40, 40, 'rgba(0,0,0,0.12)');
  fillRR(0, 0, AW, AH, 30, C.table);
  // テーブルクロスの もよう
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 0; x < AW; x += 120) for (let y = 0; y < AH; y += 120) if (((x + y) / 120) % 2 === 0) ctx.fillRect(x, y, 120, 120);
  for (const f of K.foods) {
    if (f.x < K.cam.x - 40 || f.x > K.cam.x + VW + 40 || f.y < K.cam.y - 40 || f.y > K.cam.y + VH + 40) continue;
    drawFood(f, f.x, f.y, t);
  }
  for (const p of K.parts) { ctx.globalAlpha = p.t * 2.5; fillC(p.x, p.y, 4, p.c); }
  ctx.globalAlpha = 1;
  const es = K.eaters.slice().sort((a, b) => a.mass - b.mass);
  for (const e of es) drawEater(e, e.x, e.y, t);
  for (const t2 of K.texts) { ctx.globalAlpha = clamp(t2.t * 2, 0, 1); textO(t2.s, t2.x, t2.y, 20, '#FFE066'); ctx.globalAlpha = 1; }
  ctx.restore();
  // じかん と じゅんい
  fillRR(VW / 2 - 70, 10, 140, 50, 14, 'rgba(255,255,255,0.85)');
  text(Math.max(0, Math.ceil(K.t)) + ' びょう', VW / 2, 36, 26, K.t < 10 ? '#E8283A' : '#5A3A4A', 'center');
  const order = K.eaters.slice().sort((a, b) => b.mass - a.mass);
  fillRR(10, 10, 190, 150, 14, 'rgba(255,255,255,0.85)');
  order.forEach((e, i) => {
    fillC(34, 36 + i * 34, 12, e.col);
    text((i + 1) + 'い ' + e.name, 54, 36 + i * 34, 18, e.you ? '#E8508A' : '#5A3A4A', 'left', true, 100);
    text(String(e.mass), 190, 36 + i * 34, 17, '#5A3A4A', 'right');
  });
  // ちず
  const mw = 170, mh = mw * AH / AW, mx = VW - mw - 12, my = 12;
  fillRR(mx, my, mw, mh, 10, 'rgba(255,255,255,0.8)');
  for (const e of K.eaters) fillC(mx + e.x / AW * mw, my + e.y / AH * mh, 3 + Math.sqrt(e.mass) * 0.5, e.col);
  ctx.strokeStyle = '#5A3A4A'; ctx.lineWidth = 1.5; ctx.strokeRect(mx + K.cam.x / AW * mw, my + K.cam.y / AH * mh, VW / AW * mw, VH / AH * mh);
  // スティック
  if (K.stick && K.stick.on) {
    ctx.globalAlpha = 0.5;
    fillC(K.stick.x, K.stick.y, 56, '#FFFFFF');
    fillC(K.stick.x + K.stick.dx * 44, K.stick.y + K.stick.dy * 44, 26, '#FF8FC0');
    ctx.globalAlpha = 1;
  } else if (K.t > ROUND - 4 && !K.result) textO('画面を おさえて ひっぱると うごくよ！', VW / 2, VH - 40, 22, '#FFFFFF', '#8A3A5A');
  if (K.countdown > 0) textO(String(Math.ceil(K.countdown)), VW / 2, VH / 2, 110, '#FFFFFF', '#E8508A');
  else if (K.goT < 0.8 && !K.result) textO('スタート！', VW / 2, VH / 2, 80, '#FFE066', '#E8508A');
  btn(10, VH - 64, 120, 50, 'やめる', () => { K.mode = 'select'; }, { col: '#FFFFFF', size: 18 });
  if (K.result) drawResult(t);
}

function drawResult(t) {
  fillR(0, 0, VW, VH, 'rgba(90,30,60,0.5)');
  const R = K.result;
  textO(R.place === 1 ? 'ゆうしょう！' : R.place + 'い！', VW / 2, 90, 60, R.place === 1 ? '#FFE066' : '#FFFFFF', '#8A3A5A');
  // ひょうしょうだい
  // まんなか＝1い（いちばん たかい）、ひだり＝2い、みぎ＝3い
  const pod = [[0, 0, 150], [1, -170, 110], [2, 170, 80]];
  for (const [i, dx, h] of pod) {
    const e = R.order[i]; if (!e) continue;
    const x = VW / 2 + dx, base = 400;
    fillRR(x - 70, base - h, 140, h, 8, ['#FFD24A', '#D8D8E8', '#E8A868'][i]);
    text(String(i + 1), x, base - h / 2, 40, '#FFFFFF', 'center');
    drawEater({ ...e, mass: Math.min(e.mass, 60), vx: 0, vy: 1, chew: 0, hurt: 0 }, x, base - h - 44, t);
    text(e.name + ' ' + e.mass, x, base + 20, 18, '#FFFFFF', 'center');
  }
  btn(VW / 2 - 230, 450, 220, 64, 'もういちど', () => startCup(K.cup));
  if (R.place <= 3 && K.cup + 1 < CUPS.length) btn(VW / 2 + 10, 450, 220, 64, 'つぎの カップ', () => startCup(K.cup + 1), { col: '#9AF0B8' });
  else btn(VW / 2 + 10, 450, 220, 64, 'カップを えらぶ', () => { K.mode = 'select'; }, { col: '#FFFFFF' });
}

function unlocked(i) { return i === 0 || (sv.medals[i - 1] && sv.medals[i - 1] <= 3); }
function drawSelect(t) {
  ctx.fillStyle = grad(0, VH, '#FFE0EC', '#FFC8DC'); ctx.fillRect(0, 0, VW, VH);
  text('カップを えらんでね', VW / 2, 44, 30, '#8A3A5A', 'center');
  btn(14, 14, 110, 48, 'もどる', () => { K.mode = 'title'; }, { col: '#FFFFFF', size: 18 });
  const bw = Math.min(170, (VW - 60) / 5 - 12);
  CUPS.forEach((C, i) => {
    const x = VW / 2 - (5 * (bw + 12) - 12) / 2 + i * (bw + 12), y = 110;
    const op = unlocked(i);
    btn(x, y, bw, 300, '', () => { if (op) startCup(i); }, { col: op ? C.table : 'rgba(150,130,140,0.4)' });
    drawFood({ k: FOODS[Math.min(4, i)].k, bob: i }, x + bw / 2, y + 90, t);
    text(op ? C.name : '？？？', x + bw / 2, y + 160, 19, '#5A3A4A', 'center', true, bw - 10);
    text('つよさ ' + '★'.repeat(i + 1), x + bw / 2, y + 196, 15, '#8A5A6A', 'center', false, bw - 10);
    const m = sv.medals[i];
    if (m) { fillC(x + bw / 2, y + 248, 24, ['#FFD24A', '#D8D8E8', '#E8A868'][m - 1]); text(m + 'い', x + bw / 2, y + 249, 18, '#5A3A4A', 'center'); }
    else if (!op) text('🔒', x + bw / 2, y + 248, 30, '#5A3A4A', 'center');
  });
  text('3い いないで つぎの カップが ひらくよ', VW / 2, 460, 20, '#8A3A5A', 'center');
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#FFE0EC', '#FFC8DC'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 14; i++) drawFood({ k: FOODS[i % 5].k, bob: i }, (i * 157 + t * 40) % (VW + 80) - 40, 60 + (i * 97) % (VH - 120), t);
  const e = { ...RIVALS[0], mass: 20 + Math.sin(t * 2) * 6, vx: 1, vy: 0, chew: Math.sin(t * 5) > 0.6 ? 0.2 : 0, hurt: 0 };
  drawEater(e, VW / 2, 300, t);
  text('ゆいの', VW / 2, 58, 26, '#8A3A5A', 'center');
  textO('パクパク おおきくなれ', VW / 2, 120, 56, '#FF6FA8', '#FFFFFF');
  text('おかしを たべて いちばん 大きく なろう！', VW / 2, 180, 22, '#8A3A5A', 'center');
  btn(VW / 2 - 150, 410, 300, 80, 'あそぶ', () => { fullScreen(); K.mode = 'select'; }, { col: '#FFE066' });
}

startGame({
  bg: '#FFC8DC',
  update,
  draw(t) { if (K.mode === 'title') drawTitle(t); else if (K.mode === 'select') drawSelect(t); else drawPlay(t); },
  down(x, y) { if (K.mode === 'play') K.stick = { on: true, x, y, dx: 0, dy: 0 }; },
  move(x, y, drag) {
    if (!K.stick || !K.stick.on || !drag) return;
    const dx = x - K.stick.x, dy = y - K.stick.y, l = Math.hypot(dx, dy);
    const k = l > 50 ? 1 / l : 1 / 50;
    K.stick.dx = dx * k; K.stick.dy = dy * k;
  },
  up() { if (K.stick) K.stick.on = false; },
});
