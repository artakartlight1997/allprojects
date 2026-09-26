// ゆいの はたけ日記。
// 「牧場物語」みたいな のんびり はたけ ゲーム。たねを まいて、みずを やって、そだったら しゅうかく。
// みんなの「ちゅうもん」に こたえると コインと けいけんちが もらえて、あたらしい たねや にわとりが ふえる。
// ほんとうの じかんで そだつので、とじて いる あいだも やさいは おおきく なる（つづきから あそべる）。

'use strict';

const SAVE = 'yuifarm.v1';
const CROPS = {
  carrot:  { name: 'にんじん', seed: 4,   time: 30,  sell: 10,  lv: 1, col: '#FF8A3A' },
  tomato:  { name: 'トマト',   seed: 10,  time: 60,  sell: 24,  lv: 2, col: '#E84A4A' },
  corn:    { name: 'とうもろこし', seed: 20, time: 120, sell: 50, lv: 4, col: '#FFD24A' },
  berry:   { name: 'いちご',   seed: 35,  time: 180, sell: 85,  lv: 5, col: '#FF4A6A' },
  pumpkin: { name: 'かぼちゃ', seed: 60,  time: 300, sell: 160, lv: 7, col: '#FF9A2A' },
  melon:   { name: 'すいか',   seed: 120, time: 600, sell: 330, lv: 9, col: '#3A9A4A' },
};
const EGG = { name: 'たまご', sell: 18 };
const EGG_TIME = 90;
const CHICK_PRICE = 60, CHICK_LV = 3, CHICK_MAX = 4;
const PEOPLE = ['rina', 'aoi', 'masaki', 'eito'];

function fresh() {
  return { coins: 30, xp: 0, lv: 1, cols: 4, rows: 3, plots: Array(20).fill(null), bag: {}, chicks: [], orders: [], t: Date.now(), total: 0 };
}
const sv = Object.assign(fresh(), store.get(SAVE, {}));
function save() { sv.t = Date.now(); store.set(SAVE, sv); }
function needXp(lv) { return Math.round(40 * Math.pow(lv, 2.1)); }

const G = { tool: 'carrot', t: 0, pops: [], welcome: null, tab: 0, walk: { x: 0, y: 0, tx: 0, ty: 0 } };

// --- そだつ ---------------------------------------------------------------------------
// prog は 0〜1。3だんかい（0.33 / 0.66 / 1）。みずを やると つぎの だんかい まで 2ばい はやい。
function grow(p, dt) {
  const C = CROPS[p.c];
  while (dt > 0 && p.prog < 1) {
    const rate = (p.w ? 2 : 1) / C.time;
    const nextStage = p.prog < 0.33 ? 0.33 : p.prog < 0.66 ? 0.66 : 1;
    const need = (nextStage - p.prog) / rate;
    if (dt < need) { p.prog += dt * rate; dt = 0; }
    else { p.prog = nextStage; dt -= need; p.w = 0; }
  }
}
function stage(p) { return p.prog >= 1 ? 3 : p.prog >= 0.66 ? 2 : p.prog >= 0.33 ? 1 : 0; }
function tick(dt) {
  for (const p of sv.plots) if (p) grow(p, dt);
  for (const c of sv.chicks) { if (!c.egg) { c.prog += dt / EGG_TIME; if (c.prog >= 1) { c.prog = 0; c.egg = 1; } } }
}

// いない あいだ
(function offline() {
  const sec = Math.min(24 * 3600, Math.max(0, (Date.now() - sv.t) / 1000));
  if (sec > 20) {
    const before = sv.plots.filter((p) => p && p.prog >= 1).length;
    tick(sec);
    const ripe = sv.plots.filter((p) => p && p.prog >= 1).length - before;
    const eggs = sv.chicks.filter((c) => c.egg).length;
    if (ripe > 0 || eggs > 0) G.welcome = { sec, ripe, eggs };
  }
  if (!sv.orders.length) for (let i = 0; i < 3; i++) sv.orders.push(newOrder());
  save();
})();

// --- こうどう -------------------------------------------------------------------------

function pop(x, y, s, c) { G.pops.push({ x, y, s, c: c || '#FFFFFF', t: 0 }); }
function addXp(n) {
  sv.xp += n;
  while (sv.xp >= needXp(sv.lv)) {
    sv.xp -= needXp(sv.lv); sv.lv++;
    const un = Object.keys(CROPS).filter((k) => CROPS[k].lv === sv.lv).map((k) => CROPS[k].name);
    if (sv.lv === CHICK_LV) un.push('にわとり');
    if (sv.lv === 6) { sv.cols = 5; un.push('はたけが ひろく なった'); }
    if (sv.lv === 8) { sv.rows = 4; un.push('はたけが もっと ひろく なった'); }
    G.lvup = { lv: sv.lv, un, t: 3 };
    jingle([72, 76, 79, 84, 88], 0.09, 'square', 0.13);
  }
}
function tapPlot(i, x, y) {
  const p = sv.plots[i];
  if (p && p.prog >= 1) {
    sv.bag[p.c] = (sv.bag[p.c] || 0) + 1;
    sv.plots[i] = null; sv.total++;
    addXp(Math.ceil(CROPS[p.c].seed / 4) + 1);
    pop(x, y, '+1 ' + CROPS[p.c].name, '#FFE066');
    tone(880, 0.06, 'square', 0.08); tone(1320, 0.08, 'triangle', 0.06);
    save(); return;
  }
  if (p) {
    if (G.tool === 'water') {
      if (p.w) { pop(x, y, 'もう みず あげたよ'); return; }
      p.w = 1; pop(x, y, 'みず！', '#9AD8FF'); noise(0.25, 0.08, 3000); save();
    } else pop(x, y, Math.ceil((1 - p.prog) * CROPS[p.c].time / (p.w ? 2 : 1)) + 'びょう くらい');
    return;
  }
  if (G.tool === 'water') { pop(x, y, 'たねを まいてから'); return; }
  const C = CROPS[G.tool];
  if (!C) return;
  if (sv.coins < C.seed) { pop(x, y, 'コインが たりない', '#FFB0B0'); tone(200, 0.1, 'square', 0.06); return; }
  sv.coins -= C.seed;
  sv.plots[i] = { c: G.tool, prog: 0, w: 0 };
  pop(x, y, '-' + C.seed + ' コイン');
  tone(600, 0.05, 'triangle', 0.07);
  save();
}
function tapChick(c, x, y) {
  if (!c.egg) { pop(x, y, 'コケッ'); tone(1100, 0.05, 'square', 0.05); return; }
  c.egg = 0; sv.bag.egg = (sv.bag.egg || 0) + 1; addXp(2);
  pop(x, y, '+1 たまご', '#FFE066'); tone(1000, 0.08, 'triangle', 0.08); save();
}
function buyChick() {
  if (sv.lv < CHICK_LV || sv.chicks.length >= CHICK_MAX) return;
  if (sv.coins < CHICK_PRICE) { tone(200, 0.1, 'square', 0.06); return; }
  sv.coins -= CHICK_PRICE; sv.chicks.push({ prog: 0, egg: 0, x: Math.random() }); save();
  jingle([79, 84], 0.08, 'square', 0.1);
}
function itemName(k) { return k === 'egg' ? EGG.name : CROPS[k].name; }
function itemPrice(k) { return k === 'egg' ? EGG.sell : CROPS[k].sell; }
function newOrder() {
  const opts = Object.keys(CROPS).filter((k) => CROPS[k].lv <= sv.lv);
  if (sv.lv >= CHICK_LV) opts.push('egg');
  const n = irnd(1, Math.min(2, opts.length));
  const items = {};
  for (let i = 0; i < n; i++) { const k = pick(opts); items[k] = (items[k] || 0) + irnd(1, 3); }
  let val = 0; for (const k in items) val += itemPrice(k) * items[k];
  return { who: pick(PEOPLE), items, coins: Math.round(val * 1.4), xp: Math.round(val / 10) + 2 };
}
function canFill(o) { for (const k in o.items) if ((sv.bag[k] || 0) < o.items[k]) return false; return true; }
function fillOrder(i) {
  const o = sv.orders[i];
  if (!canFill(o)) { tone(200, 0.1, 'square', 0.06); return; }
  for (const k in o.items) sv.bag[k] -= o.items[k];
  sv.coins += o.coins; addXp(o.xp);
  sv.orders[i] = newOrder();
  jingle([76, 79, 84, 88], 0.07, 'square', 0.12);
  save();
}
function sellAll() {
  let got = 0;
  for (const k in sv.bag) { got += itemPrice(k) * sv.bag[k]; sv.bag[k] = 0; }
  if (!got) return;
  sv.coins += got; pop(VW - 180, 420, '+' + got + ' コイン', '#FFE066');
  tone(1200, 0.1, 'square', 0.08); save();
}

// --- え -------------------------------------------------------------------------------

function fieldRect() {
  const cs = Math.min(92, (VW - 470) / sv.cols, 330 / sv.rows);
  return { cs, x0: 115 + ((VW - 350) - 115 - cs * sv.cols) / 2, y0: 86 };
}
function drawCrop(k, st, x, y, s, t) {
  const C = CROPS[k];
  const sway = Math.sin(t * 2 + x) * 0.08;
  if (st === 0) { fillC(x, y + s * 0.2, s * 0.06, '#6A4A2A'); ctx.strokeStyle = '#5AB85A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + s * 0.2); ctx.lineTo(x + sway * 20, y); ctx.stroke(); fillC(x - 5 + sway * 20, y, 5, '#6ACB5A'); fillC(x + 5 + sway * 20, y - 2, 5, '#6ACB5A'); return; }
  if (st === 1) { for (const a of [-0.6, 0, 0.6]) { ellipse(x + Math.sin(a + sway) * s * 0.2, y - s * 0.05, s * 0.09, s * 0.22, a + sway); ctx.fillStyle = '#4AB85A'; ctx.fill(); } return; }
  const big = st === 3;
  if (k === 'carrot') { for (const a of [-0.5, 0, 0.5]) { ellipse(x + Math.sin(a) * s * 0.15, y - s * 0.22, s * 0.08, s * 0.2, a + sway); ctx.fillStyle = '#3E9B4F'; ctx.fill(); } if (big) { ctx.fillStyle = C.col; ctx.beginPath(); ctx.moveTo(x - s * 0.13, y - s * 0.05); ctx.lineTo(x + s * 0.13, y - s * 0.05); ctx.lineTo(x, y + s * 0.3); ctx.fill(); } }
  else if (k === 'tomato' || k === 'berry') { fillR(x - 2, y - s * 0.3, 4, s * 0.5, '#3E8A3E'); for (const a of [-1, 1]) { ellipse(x + a * s * 0.18, y - s * 0.12, s * 0.16, s * 0.08, a * 0.4 + sway); ctx.fillStyle = '#4AB85A'; ctx.fill(); } if (big) { const r = k === 'berry' ? s * 0.09 : s * 0.12; for (const [dx, dy] of [[-0.16, 0.05], [0.14, -0.02], [0, 0.16]]) { fillC(x + dx * s, y + dy * s, r, C.col); fillC(x + dx * s - r * 0.3, y + dy * s - r * 0.3, r * 0.25, 'rgba(255,255,255,0.5)'); } } }
  else if (k === 'corn') { fillR(x - 3, y - s * 0.4, 6, s * 0.6, '#5AA04A'); for (const a of [-1, 1]) { ellipse(x + a * s * 0.15, y - s * 0.15, s * 0.2, s * 0.06, a * 0.5); ctx.fillStyle = '#6ACB5A'; ctx.fill(); } if (big) { ellipse(x + s * 0.12, y - s * 0.22, s * 0.08, s * 0.18, 0.3); ctx.fillStyle = C.col; ctx.fill(); } }
  else { const r = k === 'melon' ? s * 0.3 : s * 0.26; fillR(x - s * 0.3, y - 2, s * 0.6, 4, '#4AB85A'); ellipse(x - s * 0.25, y - s * 0.1, s * 0.12, s * 0.07, 0.4); ctx.fillStyle = '#6ACB5A'; ctx.fill(); if (big) { fillC(x + s * 0.05, y + s * 0.02, r, C.col); if (k === 'melon') { ctx.strokeStyle = '#1E5A2A'; ctx.lineWidth = 3; for (const o of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.arc(x + s * 0.05 + o * r, y + s * 0.02, r * 0.9, -1.2, 1.2); ctx.stroke(); } } else { ctx.strokeStyle = '#D87A1A'; ctx.lineWidth = 2; for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(x + s * 0.05 + o * r * 0.8, y + s * 0.02, r * 0.3, r, 0, 0, Math.PI * 2); ctx.stroke(); } fillR(x + s * 0.03, y - r, 5, 8, '#6A4A2A'); } } else fillC(x + s * 0.05, y + s * 0.05, r * 0.4, '#8AD06A'); }
  if (big) { ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3; star(x + s * 0.32, y - s * 0.32, s * 0.09); ctx.fillStyle = '#FFE066'; ctx.fill(); ctx.globalAlpha = 1; }
}
function drawItemIcon(k, x, y, s, t) { if (k === 'egg') { ellipse(x, y, s * 0.3, s * 0.38); ctx.fillStyle = '#FFF4E0'; ctx.fill(); ctx.strokeStyle = '#D8C8A8'; ctx.lineWidth = 1.5; ctx.stroke(); } else drawCrop(k, 3, x, y, s * 1.3, 0); void t; }

function drawFarm(t) {
  ctx.fillStyle = grad(0, VH, '#9AD8FF', '#E8F8FF'); ctx.fillRect(0, 0, VW, 70);
  fillR(0, 60, VW, VH - 60, '#8FCB6E');
  for (let i = 0; i < 30; i++) fillC((i * 137) % (VW - 340), 70 + (i * 71) % 460, 2, '#7AB85A');
  // はたけ
  const F = fieldRect();
  G.plotRects = [];
  for (let r = 0; r < sv.rows; r++) for (let c = 0; c < sv.cols; c++) {
    const i = r * 5 + c, x = F.x0 + c * F.cs, y = F.y0 + r * F.cs, p = sv.plots[i];
    fillRR(x + 4, y + 4, F.cs - 8, F.cs - 8, 10, p && p.w ? '#6A4A30' : '#9A7050');
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 10, y + 4 + k * (F.cs - 8) / 4, F.cs - 20, 3);
    if (p) {
      drawCrop(p.c, stage(p), x + F.cs / 2, y + F.cs / 2 + 6, F.cs, t);
      if (p.prog < 1) { fillRR(x + 12, y + F.cs - 16, F.cs - 24, 6, 3, 'rgba(0,0,0,0.3)'); fillRR(x + 12, y + F.cs - 16, (F.cs - 24) * p.prog, 6, 3, p.w ? '#6AC8FF' : '#FFE066'); }
    }
    G.plotRects.push({ i, x: x + 4, y: y + 4, w: F.cs - 8, h: F.cs - 8 });
  }
  // にわとり ごや
  const cy = Math.min(VH - 100, F.y0 + sv.rows * F.cs + 20);
  G.chickRects = [];
  if (sv.lv >= CHICK_LV) {
    const cw = Math.min(VW - 380, 420);
    fillRR(30, cy, cw, 86, 12, '#E8D8B0');
    ctx.strokeStyle = '#B8905A'; ctx.lineWidth = 3; rr(30, cy, cw, 86, 12); ctx.stroke();
    text('にわとり ' + sv.chicks.length + ' / ' + CHICK_MAX, 44, cy + 14, 13, '#6A4A2A', 'left');
    sv.chicks.forEach((c, k) => {
      const x = 70 + k * Math.min(90, (cw - 80) / 3) + Math.sin(t * 0.8 + k * 2) * 8, y = cy + 56;
      if (c.egg) { ellipse(x + 24, y + 12, 9, 11); ctx.fillStyle = '#FFF4E0'; ctx.fill(); }
      fillC(x, y, 17, '#FFFFFF'); fillC(x + 12, y - 14, 10, '#FFFFFF');
      ctx.fillStyle = '#E84A4A'; ctx.beginPath(); ctx.moveTo(x + 8, y - 24); ctx.lineTo(x + 12, y - 30); ctx.lineTo(x + 16, y - 24); ctx.fill();
      ctx.fillStyle = '#FFB020'; ctx.beginPath(); ctx.moveTo(x + 21, y - 15); ctx.lineTo(x + 28, y - 12); ctx.lineTo(x + 21, y - 10); ctx.fill();
      fillC(x + 15, y - 16, 2, '#2A2028');
      if (!c.egg) { fillRR(x - 18, y + 20, 36, 5, 2, 'rgba(0,0,0,0.2)'); fillRR(x - 18, y + 20, 36 * c.prog, 5, 2, '#FFE066'); }
      G.chickRects.push({ c, x: x - 24, y: y - 32, w: 60, h: 62 });
    });
  }
  // ゆい
  drawKid('yui', 60, F.y0 + 170, 120, { t, pose: G.pops.length ? 'cheer' : 'stand', dir: 2 });
  // うえの ステータス
  fillRR(10, 8, 330, 46, 12, 'rgba(255,255,255,0.85)');
  fillC(34, 31, 12, '#FFD24A'); text(sv.coins, 52, 31, 22, '#8A6A10', 'left');
  text('Lv ' + sv.lv, 150, 31, 20, '#2A6A2A', 'left');
  fillRR(205, 24, 120, 14, 7, '#D8E8D0'); fillRR(205, 24, 120 * Math.min(1, sv.xp / needXp(sv.lv)), 14, 7, '#6ACB5A');
  G.pops.forEach((p) => { ctx.globalAlpha = Math.max(0, 1 - p.t); textO(p.s, p.x, p.y - p.t * 40, 18, p.c, '#2A4A1A'); ctx.globalAlpha = 1; });
}

function drawPanel(t) {
  const X = VW - 340, W = 330;
  fillRR(X, 8, W, VH - 16, 16, 'rgba(255,250,235,0.95)');
  const tabs = ['たね', 'ちゅうもん', 'かご'];
  tabs.forEach((s, i) => btn(X + 8 + i * 106, 16, 100, 44, s, () => { G.tab = i; }, { col: G.tab === i ? '#FFE066' : '#EFE6C8', size: 17 }));
  if (G.tab === 0) {
    btn(X + 10, 70, W - 20, 50, '💧 みずやり', () => { G.tool = 'water'; }, { col: G.tool === 'water' ? '#9AD8FF' : '#FFFFFF', size: 18, flat: 1 });
    Object.keys(CROPS).forEach((k, i) => {
      const C = CROPS[k], ok = sv.lv >= C.lv, y = 128 + i * 56;
      btn(X + 10, y, W - 20, 50, '', () => { if (ok) G.tool = k; }, { col: G.tool === k ? '#FFE066' : ok ? '#FFFFFF' : 'rgba(200,190,170,0.5)', flat: 1, off: !ok });
      drawItemIcon(k, X + 40, y + 28, 36, t);
      text(ok ? C.name : '？？？', X + 70, y + 16, 17, '#2A4A1A', 'left', true);
      text(ok ? 'たね ' + C.seed + ' → うる ' + C.sell + '　' + (C.time >= 60 ? C.time / 60 + 'ふん' : C.time + 'びょう') : 'Lv ' + C.lv + ' で ひらく', X + 70, y + 36, 13, '#6A6A5A', 'left', false, W - 90);
    });
    if (sv.lv >= CHICK_LV) btn(X + 10, 470, W - 20, 50, 'にわとりを かう（' + CHICK_PRICE + ' コイン）', buyChick, { col: '#FFE8C8', size: 15, off: sv.chicks.length >= CHICK_MAX });
    else text('Lv ' + CHICK_LV + ' で にわとりが かえる', X + W / 2, 494, 14, '#8A8A7A', 'center');
  } else if (G.tab === 1) {
    sv.orders.forEach((o, i) => {
      const y = 70 + i * 142, ok = canFill(o);
      fillRR(X + 10, y, W - 20, 132, 12, '#FFFFFF');
      drawKidFace(o.who, X + 42, y + 36, 22);
      text(KIDS[o.who].name + 'の ちゅうもん', X + 74, y + 22, 15, '#2A4A1A', 'left', true);
      let xx = X + 74;
      for (const k in o.items) { drawItemIcon(k, xx + 12, y + 56, 26, t); text('×' + o.items[k] + '（' + (sv.bag[k] || 0) + '）', xx + 26, y + 56, 14, (sv.bag[k] || 0) >= o.items[k] ? '#2A8A3A' : '#B06050', 'left'); xx += 110; }
      text('ごほうび ' + o.coins + ' コイン', X + 22, y + 92, 14, '#8A6A10', 'left', true, W - 160);
      text('けいけん +' + o.xp, X + 22, y + 114, 13, '#2A8A3A', 'left', false, W - 160);
      btn(X + W - 120, y + 80, 100, 44, 'わたす', () => fillOrder(i), { col: ok ? '#9AF0B8' : '#E8E8E0', off: !ok, size: 17 });
    });
  } else {
    const keys = Object.keys(sv.bag).filter((k) => sv.bag[k] > 0);
    if (!keys.length) text('まだ なにも ない。 しゅうかく しよう！', X + W / 2, 120, 16, '#8A8A7A', 'center');
    keys.forEach((k, i) => { const y = 80 + i * 48; drawItemIcon(k, X + 40, y + 18, 32, t); text(itemName(k) + ' × ' + sv.bag[k], X + 70, y + 18, 18, '#2A4A1A', 'left'); text(itemPrice(k) * sv.bag[k] + ' コイン', X + W - 20, y + 18, 15, '#8A6A10', 'right'); });
    btn(X + 30, VH - 90, W - 60, 60, 'ぜんぶ うる', sellAll, { col: '#FFE066', size: 20, off: !keys.length });
    text('ちゅうもんの ほうが たくさん もらえるよ', X + W / 2, VH - 106, 13, '#6A6A5A', 'center');
  }
}

startGame({
  bg: '#6A9A3A',
  update(dt) {
    G.t += dt;
    tick(dt);
    for (const p of G.pops) p.t += dt;
    G.pops = G.pops.filter((p) => p.t < 1);
    if (G.lvup) { G.lvup.t -= dt; if (G.lvup.t <= 0) G.lvup = null; }
    G.saveT = (G.saveT || 0) + dt; if (G.saveT > 10) { G.saveT = 0; save(); }
  },
  draw(t) {
    drawFarm(t);
    drawPanel(t);
    if (G.lvup) { fillRR(VW / 2 - 330, 200, 460, 110, 18, 'rgba(255,255,255,0.95)'); textO('レベル ' + G.lvup.lv + ' に なった！', VW / 2 - 100, 236, 30, '#FFB020', '#FFFFFF'); text(G.lvup.un.join('・') || 'ちゅうもんが ふえるよ', VW / 2 - 100, 280, 17, '#2A4A1A', 'center', true, 420); }
    if (G.welcome) {
      fillR(0, 0, VW, VH, 'rgba(0,0,0,0.45)');
      fillRR(VW / 2 - 250, 120, 500, 280, 20, '#FFFAEB');
      drawKid('yui', VW / 2 - 170, 330, 150, { t, pose: 'wave' });
      text('おかえり！', VW / 2 + 40, 170, 32, '#2A6A2A', 'center');
      const w = G.welcome, s = Math.floor(w.sec / 60);
      text((s >= 60 ? Math.floor(s / 60) + 'じかん ' : '') + (s % 60) + 'ふん の あいだに', VW / 2 + 40, 214, 17, '#4A4A3A', 'center');
      if (w.ripe) text('やさいが ' + w.ripe + 'こ そだったよ！', VW / 2 + 40, 248, 20, '#E86A00', 'center');
      if (w.eggs) text('たまごが ' + w.eggs + 'こ うまれたよ！', VW / 2 + 40, 280, 18, '#8A6A10', 'center');
      btn(VW / 2 - 30, 318, 150, 56, 'みにいく', () => { G.welcome = null; }, { col: '#FFE066', size: 20 });
    }
  },
  down(x, y) {
    if (G.welcome) return;
    for (const r of (G.plotRects || [])) if (inBox(x, y, r)) { tapPlot(r.i, x, y); return; }
    for (const r of (G.chickRects || [])) if (inBox(x, y, r)) { tapChick(r.c, x, y); return; }
  },
  pause() { save(); },
});
window.addEventListener('pagehide', save);
