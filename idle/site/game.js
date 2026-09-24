// あおいの ぽちぽち パン工場。
// パンを タップして やく → おてつだいを やとう → じどうで どんどん ふえる。
//   ・アプリを とじて いても パンは やける（さいだい 8じかん ぶん）
//   ・きんいろ クロワッサンを タップすると フィーバー
//   ・パンを たくさん やいたら「あたらしい まち」へ。ほしで ずっと つよく なる
// ぜんぶ 自動で セーブ されるので、いつでも つづきから。

'use strict';

const SAVE = 'panfactory.v1';
const OFFLINE_MAX = 8 * 3600;

const HELP = [
  { k: 'cat',     n: 'ねこの てんいん',   cost: 15,    rate: 0.2 },
  { k: 'oven',    n: 'ぽかぽか オーブン', cost: 100,   rate: 1 },
  { k: 'baker',   n: 'パンやさん',        cost: 1100,  rate: 8 },
  { k: 'belt',    n: 'ベルトコンベア',    cost: 12000, rate: 47 },
  { k: 'factory', n: 'パン こうじょう',   cost: 1.3e5, rate: 260 },
  { k: 'truck',   n: 'パン トラック',     cost: 1.4e6, rate: 1400 },
  { k: 'plane',   n: 'パン ひこうき',     cost: 2e7,   rate: 7800 },
  { k: 'rocket',  n: 'うちゅう パン',     cost: 3.3e8, rate: 44000 },
];

// パワーアップ：おてつだいが 1・10・25・50・100 に なると かえる（それぞれ ×2）
const UPS = [];
HELP.forEach((h, i) => [1, 10, 25, 50, 100].forEach((need, j) => UPS.push({
  id: h.k + need, kind: 'help', hi: i, need, cost: h.cost * [10, 60, 600, 6000, 80000][j],
  n: h.n + ' ×2', d: h.n + 'が ' + need + 'こ で かえる',
})));
[[50, 'ちからもち こね'], [600, 'ふわふわ こね'], [8000, 'ぐるぐる こね'], [1e5, 'スーパー こね'], [3e6, 'ウルトラ こね'], [1e8, 'ミラクル こね']].forEach(([c, n], j) =>
  UPS.push({ id: 'tap' + j, kind: 'tap', cost: c, n: n, d: 'タップで やける パン ×2' }));
[[2e4, 1], [2e6, 2], [2e8, 3]].forEach(([c, lv]) =>
  UPS.push({ id: 'magic' + lv, kind: 'magic', cost: c, n: 'ゆびさき マジック ' + lv, d: 'タップで 1びょう ぶんの ' + lv + '%も やける' }));
UPS.sort((a, b) => a.cost - b.cost);

function fresh() { return { bread: 0, all: 0, life: 0, own: HELP.map(() => 0), ups: {}, stars: 0, starsGot: 0, taps: 0, seen: 0, t: Date.now(), golds: 0 }; }
const sv = Object.assign(fresh(), store.get(SAVE, {}));
while (sv.own.length < HELP.length) sv.own.push(0);
function save() { sv.t = Date.now(); store.set(SAVE, sv); }

const V = { tab: 0, buyN: 1, pops: [], crumbs: [], squash: 0, gold: null, goldNext: 40, fever: 0, welcome: null, t: 0, confirm: false, flash: 0 };

// --- けいさん -----------------------------------------------------------------------

function fmt(n) {
  if (n < 1e4) return String(Math.floor(n));
  for (const [u, v] of [['京', 1e16], ['兆', 1e12], ['億', 1e8], ['万', 1e4]]) {
    if (n >= v) { const x = n / v; return (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.floor(x)) + u; }
  }
  return String(Math.floor(n));
}
function fmtR(n) { return n < 10 && n % 1 ? n.toFixed(1) : fmt(n); }
function helpMult(i) {
  let m = 1;
  for (const u of UPS) if (u.kind === 'help' && u.hi === i && sv.ups[u.id]) m *= 2;
  return m;
}
function starMult() { return 1 + sv.stars * 0.1; }
function helpRate(i) { return HELP[i].rate * helpMult(i) * starMult(); }
function baseRate() { let r = 0; HELP.forEach((h, i) => { r += sv.own[i] * helpRate(i); }); return r; }
function rate() { return baseRate() * (V.fever > 0 ? 7 : 1); }
function tapPower() {
  let p = 1;
  for (const u of UPS) if (u.kind === 'tap' && sv.ups[u.id]) p *= 2;
  let mg = 0;
  for (const u of UPS) if (u.kind === 'magic' && sv.ups[u.id]) mg += 0.01;
  return (p + baseRate() * mg) * starMult() * (V.fever > 0 ? 7 : 1);
}
function costOf(i, n) {
  // n こ まとめて かう ねだん（1こ ごとに 1.15ばい）
  const c0 = HELP[i].cost * Math.pow(1.15, sv.own[i]);
  return c0 * (Math.pow(1.15, n) - 1) / 0.15;
}
function maxBuy(i) {
  let n = 0;
  while (n < 1000 && costOf(i, n + 1) <= sv.bread) n++;
  return n;
}
function gain(n) { sv.bread += n; sv.all += n; sv.life += n; }
function starsAvail() { return Math.floor(Math.sqrt(sv.life / 1e6)) - sv.starsGot; }

// --- こうどう -----------------------------------------------------------------------

function tapBread(x, y) {
  const p = tapPower();
  gain(p); sv.taps++;
  V.squash = 1;
  V.pops.push({ x: x + rnd(-50, 50), y: y - 40 + rnd(-20, 20), s: '+' + fmt(p), t: 0 });
  for (let k = 0; k < 4; k++) V.crumbs.push({ x, y, vx: rnd(-160, 160), vy: rnd(-260, -80), t: 0, c: pick(['#E8A050', '#F6D29A', '#C8823A']) });
  tone(520 + rnd(0, 120), 0.05, 'triangle', 0.1, 700);
}
function buyHelp(i) {
  const n = V.buyN === 'max' ? maxBuy(i) : V.buyN;
  if (n <= 0) return;
  const c = costOf(i, n);
  if (c > sv.bread) { tone(200, 0.08, 'square', 0.06); return; }
  sv.bread -= c; sv.own[i] += n;
  sv.seen = Math.max(sv.seen, Math.min(HELP.length - 1, i + 1));
  jingle([72, 79], 0.06, 'square', 0.1);
  save();
}
function upAvail(u) {
  if (sv.ups[u.id]) return false;
  if (u.kind === 'help') return sv.own[u.hi] >= u.need;
  if (u.kind === 'magic') return sv.all >= u.cost * 0.3 || sv.bread >= u.cost * 0.3;
  return sv.all >= u.cost * 0.3;
}
function buyUp(u) {
  if (sv.bread < u.cost) { tone(200, 0.08, 'square', 0.06); return; }
  sv.bread -= u.cost; sv.ups[u.id] = 1;
  jingle([72, 76, 79, 84], 0.06, 'square', 0.12);
  save();
}
function newTown() {
  const g = starsAvail();
  if (g < 1) return;
  const keep = { life: sv.life, stars: sv.stars + g, starsGot: sv.starsGot + g, taps: sv.taps, golds: sv.golds };
  Object.assign(sv, fresh(), keep);
  V.confirm = false; V.fever = 0; V.flash = 1;
  jingle([60, 64, 67, 72, 76, 79, 84], 0.09, 'square', 0.14);
  save();
}
function catchGold() {
  const G = V.gold; V.gold = null; sv.golds++;
  if (Math.random() < 0.5) {
    V.fever = 20;
    V.pops.push({ x: G.x, y: G.y, s: 'フィーバー ×7！', t: 0, big: 1 });
  } else {
    const n = Math.max(30, baseRate() * 90 + tapPower() * 20);
    gain(n);
    V.pops.push({ x: G.x, y: G.y, s: '+' + fmt(n) + ' こ！', t: 0, big: 1 });
  }
  jingle([84, 88, 91, 96], 0.07, 'triangle', 0.16);
}

// いない あいだの パン
(function offline() {
  const sec = Math.min(OFFLINE_MAX, Math.max(0, (Date.now() - sv.t) / 1000));
  const r = baseRate();
  if (sec > 30 && r > 0) {
    const n = r * sec;
    gain(n);
    V.welcome = { sec, n };
  }
  save();
})();

// --- え -----------------------------------------------------------------------------

function sceneW() { return VW - 372; }

function drawLoaf(x, y, s, t, face) {
  // しょくパン
  ctx.save(); ctx.translate(x, y);
  const sq = V.squash * (face ? 1 : 0);
  ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
  const path = (k, dy) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.55 * k, s * 0.55 * k + dy);
    ctx.lineTo(-s * 0.55 * k, -s * 0.15 * k + dy);
    ctx.bezierCurveTo(-s * 0.95 * k, -s * 0.2 * k + dy, -s * 0.8 * k, -s * 0.8 * k + dy, -s * 0.3 * k, -s * 0.72 * k + dy);
    ctx.bezierCurveTo(-s * 0.1 * k, -s * 0.95 * k + dy, s * 0.1 * k, -s * 0.95 * k + dy, s * 0.3 * k, -s * 0.72 * k + dy);
    ctx.bezierCurveTo(s * 0.8 * k, -s * 0.8 * k + dy, s * 0.95 * k, -s * 0.2 * k + dy, s * 0.55 * k, -s * 0.15 * k + dy);
    ctx.lineTo(s * 0.55 * k, s * 0.55 * k + dy);
    ctx.closePath();
  };
  path(1, 0); ctx.fillStyle = '#C8823A'; ctx.fill();
  path(0.97, -s * 0.03); ctx.fillStyle = '#E09A50'; ctx.fill();
  path(0.84, s * 0.05); ctx.fillStyle = '#FFF0CC'; ctx.fill();
  if (face) {
    const blink = (t % 4) < 0.12;
    if (blink) { ctx.strokeStyle = '#4A2A18'; ctx.lineWidth = s * 0.04; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * s * 0.2 - s * 0.07, -s * 0.05); ctx.lineTo(sg * s * 0.2 + s * 0.07, -s * 0.05); ctx.stroke(); } }
    else for (const sg of [-1, 1]) { fillC(sg * s * 0.2, -s * 0.05, s * 0.08, '#4A2A18'); fillC(sg * s * 0.2 + s * 0.025, -s * 0.08, s * 0.03, '#FFFFFF'); }
    fillC(-s * 0.36, s * 0.1, s * 0.08, 'rgba(255,120,120,0.45)'); fillC(s * 0.36, s * 0.1, s * 0.08, 'rgba(255,120,120,0.45)');
    ctx.strokeStyle = '#4A2A18'; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.arc(0, s * 0.08, s * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  ctx.restore();
}
function miniBread(x, y, s) { ellipse(x, y, s, s * 0.6); ctx.fillStyle = '#D89048'; ctx.fill(); ellipse(x, y - s * 0.12, s * 0.7, s * 0.3); ctx.fillStyle = '#F2C27A'; ctx.fill(); }

function drawCat(x, y, s, t, col) {
  const step = Math.sin(t * 8) * s * 0.08;
  ellipse(x, y, s * 0.5, s * 0.32); ctx.fillStyle = col; ctx.fill();
  fillC(x + s * 0.45, y - s * 0.25, s * 0.28, col);
  for (const sg of [0, 1]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + s * (0.28 + sg * 0.28), y - s * 0.4); ctx.lineTo(x + s * (0.33 + sg * 0.28), y - s * 0.65); ctx.lineTo(x + s * (0.45 + sg * 0.2), y - s * 0.45); ctx.fill(); }
  fillR(x - s * 0.3, y + s * 0.2 + step, s * 0.1, s * 0.2, col); fillR(x + s * 0.2, y + s * 0.2 - step, s * 0.1, s * 0.2, col);
  fillC(x + s * 0.52, y - s * 0.28, s * 0.045, '#2A2028');
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.quadraticCurveTo(x - s * 0.75, y - s * 0.2 + step, x - s * 0.62, y - s * 0.5); ctx.stroke();
  // コックぼう
  fillRR(x + s * 0.3, y - s * 0.75, s * 0.3, s * 0.18, s * 0.05, '#FFFFFF');
}
function drawOven(x, y, s, t) {
  fillRR(x - s * 0.5, y - s * 0.7, s, s * 0.7, s * 0.12, '#B84A3A');
  fillRR(x - s * 0.36, y - s * 0.5, s * 0.72, s * 0.36, s * 0.08, '#2A1A18');
  const g = 0.5 + Math.sin(t * 5 + x) * 0.2;
  fillRR(x - s * 0.32, y - s * 0.46, s * 0.64, s * 0.28, s * 0.06, 'rgba(255,150,40,' + g + ')');
  miniBread(x, y - s * 0.3, s * 0.18);
}
function drawBaker(x, y, s, t) {
  const b = Math.abs(Math.sin(t * 4 + x)) * s * 0.06;
  fillRR(x - s * 0.22, y - s * 0.55 - b, s * 0.44, s * 0.55, s * 0.12, '#FFFFFF');
  fillC(x, y - s * 0.7 - b, s * 0.2, '#FFD8B8');
  fillC(x - s * 0.12, y - s * 0.95 - b, s * 0.14, '#FFFFFF'); fillC(x + s * 0.12, y - s * 0.95 - b, s * 0.14, '#FFFFFF'); fillC(x, y - s * 1.0 - b, s * 0.16, '#FFFFFF');
  fillC(x - s * 0.07, y - s * 0.7 - b, s * 0.03, '#2A2028'); fillC(x + s * 0.07, y - s * 0.7 - b, s * 0.03, '#2A2028');
  miniBread(x + s * 0.3, y - s * 0.35 - b, s * 0.13);
}
function drawTruck(x, y, s) {
  fillRR(x - s * 0.6, y - s * 0.5, s * 0.8, s * 0.45, s * 0.06, '#FFFFFF');
  miniBread(x - s * 0.2, y - s * 0.28, s * 0.14);
  fillRR(x + s * 0.2, y - s * 0.38, s * 0.36, s * 0.33, s * 0.08, '#FF8A3A');
  fillRR(x + s * 0.3, y - s * 0.33, s * 0.18, s * 0.12, s * 0.03, '#BFE6FF');
  fillC(x - s * 0.35, y - s * 0.03, s * 0.1, '#333'); fillC(x + s * 0.35, y - s * 0.03, s * 0.1, '#333');
}
function drawPlane(x, y, s) {
  ellipse(x, y, s * 0.6, s * 0.14); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.fillStyle = '#FF8A3A'; ctx.beginPath(); ctx.moveTo(x - s * 0.1, y); ctx.lineTo(x - s * 0.3, y + s * 0.4); ctx.lineTo(x + s * 0.05, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.62, y - s * 0.26); ctx.lineTo(x - s * 0.4, y - s * 0.05); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - s * 0.62, y); ctx.lineTo(x - s * 0.9, y); ctx.stroke();
  fillRR(x - s * 1.9, y - s * 0.16, s * 1.0, s * 0.32, 4, '#FFF0CC');
  text('パン', x - s * 1.4, y, s * 0.22, '#C8823A', 'center', true);
}
function drawRocket(x, y, s, t) {
  const f = 0.7 + Math.sin(t * 30) * 0.3;
  ctx.fillStyle = 'rgba(255,160,40,0.9)'; ctx.beginPath(); ctx.moveTo(x - s * 0.12, y + s * 0.4); ctx.lineTo(x, y + s * (0.4 + 0.4 * f)); ctx.lineTo(x + s * 0.12, y + s * 0.4); ctx.fill();
  ellipse(x, y, s * 0.2, s * 0.45); ctx.fillStyle = '#F0F0F8'; ctx.fill();
  fillC(x, y - s * 0.08, s * 0.08, '#6AC8FF');
  ctx.fillStyle = '#E84A5A';
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sg * s * 0.15, y + s * 0.15); ctx.lineTo(x + sg * s * 0.32, y + s * 0.45); ctx.lineTo(x + sg * s * 0.12, y + s * 0.38); ctx.fill(); }
  miniBread(x, y - s * 0.52, s * 0.14);
}
function drawFactory(x, y, s, n, t) {
  const fl = Math.min(4, n);
  for (let i = 0; i < 3; i++) {
    const sx = x + s * 0.55, sy = y - s * 0.9 - fl * s * 0.18;
    const u = (t * 0.4 + i / 3) % 1;
    fillC(sx + u * s * 0.3, sy - u * s * 0.6, s * (0.08 + u * 0.12), 'rgba(255,255,255,' + (0.7 - u * 0.7) + ')');
  }
  fillR(x + s * 0.45, y - s * 0.9 - fl * s * 0.18, s * 0.18, s * 0.6, '#9A8A8A');
  fillRR(x - s * 0.7, y - s * 0.4 - fl * s * 0.18, s * 1.4, s * 0.4 + fl * s * 0.18, 6, '#E8D8C8');
  ctx.fillStyle = '#C8B8A8';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - s * 0.7 + i * s * 0.35, y - s * 0.4 - fl * s * 0.18); ctx.lineTo(x - s * 0.52 + i * s * 0.35, y - s * 0.62 - fl * s * 0.18); ctx.lineTo(x - s * 0.35 + i * s * 0.35, y - s * 0.4 - fl * s * 0.18); ctx.fill(); }
  for (let r = 0; r <= fl; r++) for (let i = 0; i < 4; i++) fillRR(x - s * 0.6 + i * s * 0.33, y - s * 0.32 - r * s * 0.18 + s * 0.05, s * 0.2, s * 0.1, 2, '#FFE9A0');
}

function drawScene(t) {
  const W = sceneW();
  ctx.fillStyle = grad(0, 440, V.fever > 0 ? '#FFD0F0' : '#BFE6FF', V.fever > 0 ? '#FFF0C0' : '#FFF6E0');
  ctx.fillRect(0, 0, W, VH);
  fillC(W - 60, 120, 34, 'rgba(255,230,120,0.9)');
  // うちゅう パン
  if (sv.own[7]) drawRocket(60, 160 + Math.sin(t) * 12, 60, t);
  // ひこうき
  if (sv.own[6]) { const u = ((t * 0.08) % 1.4) - 0.2; drawPlane(u * (W + 200), 150 + Math.sin(t * 0.7) * 10, 60); }
  // こうじょう（うしろ）
  if (sv.own[4]) drawFactory(W * 0.22, 420, 110, sv.own[4], t);
  if (sv.own[4] > 1) drawFactory(W * 0.8, 420, 90, sv.own[4] - 1, t + 1);
  // じめん
  fillR(0, 420, W, VH - 420, '#9ADA7A');
  fillR(0, 486, W, 40, '#8A8A9A');
  for (let x = ((-t * 60) % 60); x < W; x += 60) fillR(x, 504, 30, 4, '#FFFFFF');
  // トラック
  for (let i = 0; i < Math.min(3, sv.own[5]); i++) { const u = ((t * 0.12 + i * 0.37) % 1.3) - 0.15; drawTruck(u * W, 512, 70); }
  // ベルトコンベア
  if (sv.own[3]) {
    fillRR(10, 438, W - 20, 16, 8, '#5A5A6A');
    for (let x = ((t * 80) % 50); x < W - 30; x += 50) miniBread(20 + x, 432, 12);
  }
  // オーブン と パンやさん
  for (let i = 0; i < Math.min(5, sv.own[1]); i++) drawOven(30 + i * 52, 420, 46, t);
  for (let i = 0; i < Math.min(5, sv.own[2]); i++) drawBaker(W - 30 - i * 44, 470, 50, t);
  // ねこ
  for (let i = 0; i < Math.min(8, sv.own[0]); i++) {
    const sp = 40 + i * 9, span = W - 60;
    const u = (t * sp / span + i * 0.23) % 2, dir = u < 1 ? 1 : -1, x = 30 + (u < 1 ? u : 2 - u) * span;
    ctx.save(); ctx.translate(x, 474); ctx.scale(dir, 1); drawCat(0, 0, 26, t + i, ['#FFB060', '#F0F0F0', '#555', '#E8C090'][i % 4]); ctx.restore();
  }
  // おおきな パン（タップ する ところ）
  const bx = W / 2, by = 270, bs = 120;
  const br = 1 + Math.sin(t * 2.4) * 0.02;
  ellipse(bx, by + bs * 0.62, bs * 0.6, 14); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
  if (V.fever > 0) { ctx.save(); ctx.globalAlpha = 0.5; for (let k = 0; k < 10; k++) { const a = t * 1.5 + k * 0.628; ctx.fillStyle = k % 2 ? '#FFE066' : '#FFFFFF'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 220, a, a + 0.3); ctx.fill(); } ctx.restore(); }
  drawLoaf(bx, by, bs * br, t, true);
  UI.btns.push({ x: bx - bs * 0.7, y: by - bs * 0.95, w: bs * 1.4, h: bs * 1.6, on: () => tapBread(PTR.x || bx, PTR.y || by), label: '__bread' });
  // きんいろ クロワッサン
  if (V.gold) {
    const G = V.gold, a = Math.min(1, G.life / 1.5);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(G.x, G.y + Math.sin(t * 4) * 6); ctx.rotate(Math.sin(t * 3) * 0.2);
    fillC(0, 0, 40, 'rgba(255,240,150,0.5)');
    for (let k = -2; k <= 2; k++) { ellipse(k * 12, Math.abs(k) * 4, 12 - Math.abs(k) * 2, 18 - Math.abs(k) * 3); ctx.fillStyle = k % 2 ? '#F0B030' : '#FFD040'; ctx.fill(); }
    ctx.restore();
    UI.btns.push({ x: G.x - 44, y: G.y - 44, w: 88, h: 88, on: catchGold, label: '__gold' });
  }
  // くず と +N
  for (const c of V.crumbs) fillC(c.x, c.y, 5, c.c);
  for (const p of V.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / (p.big ? 2 : 0.9));
    textO(p.s, p.x, p.y - p.t * 60, p.big ? 34 : 24, p.big ? '#FFE066' : '#FFFFFF', '#8A4A1A', 'center');
    ctx.globalAlpha = 1;
  }
  // じょうほう
  fillRR(12, 12, W - 24, 86, 16, 'rgba(255,255,255,0.8)');
  text('🍞 ' + fmt(sv.bread) + ' こ', W / 2, 44, 38, '#8A4A1A', 'center', true, W - 60);
  text('1びょうに ' + fmtR(rate()) + ' こ ・ タップで ' + fmtR(tapPower()) + ' こ', W / 2, 80, 17, '#7A5A3A', 'center', false, W - 50);
  if (sv.stars) text('⭐' + sv.stars + '（+' + sv.stars * 10 + '%）', 22, 118, 17, '#C88A00', 'left', true);
  if (V.fever > 0) textO('フィーバー！ ×7 のこり ' + Math.ceil(V.fever), W / 2, 124, 24, '#FF4A8A', '#FFFFFF');
  else if (sv.all < 30) textO('パンを タップして やこう！', W / 2, 124, 22, '#FF7A2A', '#FFFFFF');
}

function drawHelpIcon(i, x, y, t) {
  const s = 34;
  if (i === 0) drawCat(x - 4, y + 6, s * 0.8, 0, '#FFB060');
  else if (i === 1) drawOven(x, y + 14, s * 0.8, t);
  else if (i === 2) drawBaker(x, y + 18, s * 0.8, 0);
  else if (i === 3) { fillRR(x - 18, y + 2, 36, 8, 4, '#5A5A6A'); miniBread(x - 8, y - 2, 7); miniBread(x + 8, y - 2, 7); }
  else if (i === 4) drawFactory(x, y + 16, 26, 1, t);
  else if (i === 5) drawTruck(x, y + 12, 38);
  else if (i === 6) { ctx.save(); ctx.translate(x + 12, y); ctx.scale(0.55, 0.55); drawPlane(0, 0, 60); ctx.restore(); }
  else drawRocket(x, y + 2, 32, t);
}

function drawPanel(t) {
  const X = VW - 364, W = 356;
  fillRR(X - 4, 6, W + 4, VH - 12, 16, '#FFF6E8');
  const tabs = ['おてつだい', 'パワーアップ', 'あたらしい まち'];
  const nUp = UPS.filter((u) => upAvail(u) && sv.bread >= u.cost).length;
  tabs.forEach((s, i) => btn(X + i * (W / 3), 12, W / 3 - 6, 46, s, () => { V.tab = i; V.confirm = false; },
    { col: V.tab === i ? '#FFB866' : '#F0E0C8', size: 15, sub: i === 1 && nUp ? '⭐' + nUp : i === 2 && starsAvail() > 0 ? '⭐+' + starsAvail() : '' }));
  if (V.tab === 0) {
    HELP.forEach((h, i) => {
      const y = 66 + i * 52;
      if (i > sv.seen && !sv.own[i]) {
        fillRR(X, y, W - 6, 46, 10, '#E8DCC8');
        text('？？？　（' + fmt(h.cost) + ' こ）', X + W / 2, y + 23, 16, '#A89878', 'center');
        return;
      }
      const n = V.buyN === 'max' ? Math.max(1, maxBuy(i)) : V.buyN;
      const c = costOf(i, n), ok = c <= sv.bread;
      btn(X, y, W - 6, 46, '', () => buyHelp(i), { col: ok ? '#FFFFFF' : '#EDE4D6', flat: 1 });
      drawHelpIcon(i, X + 28, y + 20, t);
      text(h.n, X + 56, y + 15, 16, '#4A3020', 'left', true, 170);
      text('🍞' + fmt(c) + (n > 1 ? '（' + n + 'こ）' : ''), X + 56, y + 34, 14, ok ? '#2A8A3A' : '#B06050', 'left', false, 170);
      text(String(sv.own[i]), X + W - 20, y + 16, 22, '#8A4A1A', 'right', true);
      text('+' + fmtR(helpRate(i)) + '/びょう', X + W - 20, y + 36, 12, '#8A7A6A', 'right');
    });
    ['×1', '×10', 'MAX'].forEach((s, i) => { const v = [1, 10, 'max'][i]; btn(X + 40 + i * 96, VH - 60, 86, 40, s, () => { V.buyN = v; }, { col: V.buyN === v ? '#FFB866' : '#F0E0C8', size: 17 }); });
  } else if (V.tab === 1) {
    const list = UPS.filter(upAvail).slice(0, 8);
    if (!list.length) text('おてつだいを ふやすと あらわれるよ', X + W / 2, 200, 17, '#8A7A6A', 'center');
    list.forEach((u, i) => {
      const y = 66 + i * 56, ok = sv.bread >= u.cost;
      btn(X, y, W - 6, 50, '', () => buyUp(u), { col: ok ? '#FFFFFF' : '#EDE4D6', flat: 1 });
      if (u.kind === 'help') drawHelpIcon(u.hi, X + 28, y + 22, t);
      else { ctx.save(); ctx.translate(X + 28, y + 26); drawLoaf(0, 0, 30, 0, false); ctx.restore(); }
      text(u.n, X + 56, y + 16, 16, '#4A3020', 'left', true, 190);
      text(u.d, X + 56, y + 37, 12, '#8A7A6A', 'left', false, 190);
      text('🍞' + fmt(u.cost), X + W - 16, y + 25, 16, ok ? '#2A8A3A' : '#B06050', 'right', true, 100);
    });
    const done = Object.keys(sv.ups).length;
    text('かった パワーアップ ' + done + ' / ' + UPS.length, X + W / 2, VH - 24, 15, '#8A7A6A', 'center');
  } else {
    const g = starsAvail();
    text('あたらしい まちに おみせを だす', X + W / 2, 90, 20, '#8A4A1A', 'center', true, W - 20);
    wrap('パンも おてつだいも さいしょから に なるけど、⭐ほし が もらえる。⭐1こで ずっと +10% たくさん やけるよ。', W - 40, 16).forEach((l, i) => text(l, X + 20, 128 + i * 26, 16, '#5A4A3A'));
    fillRR(X + 20, 216, W - 46, 110, 14, '#FFFFFF');
    text('いまの ⭐ ' + sv.stars + '（+' + sv.stars * 10 + '%）', X + W / 2, 244, 18, '#C88A00', 'center', true);
    text('もらえる ⭐ +' + Math.max(0, g), X + W / 2, 278, 24, g > 0 ? '#E86A00' : '#A89878', 'center', true);
    const nextAt = Math.pow(sv.starsGot + Math.max(0, g) + 1, 2) * 1e6;
    text('つぎの ⭐まで ぜんぶで ' + fmt(nextAt) + ' こ（いま ' + fmt(sv.life) + '）', X + W / 2, 308, 13, '#8A7A6A', 'center', false, W - 60);
    if (!V.confirm) btn(X + 50, 350, W - 106, 70, 'おみせを だす！', () => { V.confirm = true; }, { off: g < 1, col: '#FFE066' });
    else {
      text('ほんとうに いい？', X + W / 2, 360, 18, '#E84A3A', 'center', true);
      btn(X + 30, 380, 140, 60, 'だす！', newTown, { col: '#FFE066' });
      btn(X + 186, 380, 140, 60, 'やめる', () => { V.confirm = false; }, { col: '#F0E0C8' });
    }
    text('やいた パン ぜんぶ：' + fmt(sv.life) + ' こ ・ タップ ' + sv.taps + ' 回', X + W / 2, VH - 40, 13, '#8A7A6A', 'center', false, W - 30);
  }
}

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? h + 'じかん ' + m + 'ふん' : m ? m + 'ふん' : Math.floor(s) + 'びょう';
}

let saveT = 0;
startGame({
  bg: '#FFF6E0',
  update(dt) {
    V.t += dt;
    gain(rate() * dt);
    if (V.fever > 0) V.fever = Math.max(0, V.fever - dt);
    V.squash = Math.max(0, V.squash - dt * 6);
    V.flash = Math.max(0, V.flash - dt);
    for (const c of V.crumbs) { c.t += dt; c.vy += 800 * dt; c.x += c.vx * dt; c.y += c.vy * dt; }
    V.crumbs = V.crumbs.filter((c) => c.t < 0.8);
    for (const p of V.pops) p.t += dt;
    V.pops = V.pops.filter((p) => p.t < (p.big ? 2 : 0.9));
    // きんいろ クロワッサン
    if (V.gold) { V.gold.life -= dt; if (V.gold.life <= 0) V.gold = null; }
    else if (sv.all > 50) { V.goldNext -= dt; if (V.goldNext <= 0) { V.goldNext = rnd(60, 120); V.gold = { x: rnd(60, sceneW() - 60), y: rnd(150, 380), life: 10 }; tone(1200, 0.2, 'sine', 0.08, 1800); } }
    if (V.pops.length > 40) V.pops.splice(0, V.pops.length - 40);
    saveT += dt;
    if (saveT > 5) { saveT = 0; save(); }
    const i = HELP.findIndex((h, k) => k > sv.seen && sv.bread >= h.cost * 0.5);
    if (i >= 0) sv.seen = i;
  },
  draw(t) {
    drawScene(t);
    drawPanel(t);
    if (V.flash > 0) fillR(0, 0, VW, VH, 'rgba(255,255,255,' + V.flash + ')');
    if (V.welcome) {
      fillR(0, 0, VW, VH, 'rgba(40,20,0,0.55)');
      fillRR(VW / 2 - 260, 110, 520, 300, 24, '#FFF6E8');
      drawLoaf(VW / 2, 190, 70, t, true);
      text('おかえり！', VW / 2, 262, 32, '#8A4A1A', 'center', true);
      text(fmtTime(V.welcome.sec) + ' の あいだに', VW / 2, 302, 20, '#5A4A3A', 'center');
      text('🍞 ' + fmt(V.welcome.n) + ' こ やけたよ', VW / 2, 336, 26, '#E86A00', 'center', true);
      btn(VW / 2 - 90, 352, 180, 50, 'やったー！', () => { V.welcome = null; }, { col: '#FFE066', size: 20 });
    }
  },
  key(code, down) { if (down && code === 'Space' && !V.welcome) tapBread(sceneW() / 2, 270); },
  pause() { save(); },
});
window.addEventListener('pagehide', save);
