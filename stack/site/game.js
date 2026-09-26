// ゆいの ケーキタワー。
// 「Stack」みたいな タイミング ゲーム。よこから すべって くる スポンジを、タップで したの だんに かさねる。
// はみ出した ところは おちて、つぎの だんは 小さく なる。ぴったり かさねると「ぴったり！」、
// 3かい つづけて ぴったりだと だんが すこし 大きく なる。どこまで たかい ケーキに できるかな？

'use strict';

const SAVE = 'caketower.v1';
const BASE = 150;             // いちばん したの 大きさ
const LH = 22;                // 1だんの たかさ
const FLAVORS = [
  ['いちご', '#FFB8D0', '#FF8FB8'], ['バニラ', '#FFF0C0', '#F4D890'], ['チョコ', '#A8704A', '#8A5634'],
  ['まっちゃ', '#B8E0A0', '#8AC870'], ['ブルーベリー', '#C8B8F0', '#A08AD8'], ['オレンジ', '#FFD0A0', '#FFB070'],
];
const TITLES = [[0, 'はじめての ケーキ'], [10, 'おいしい ケーキ'], [20, 'パティシエ みならい'], [35, 'パティシエ'], [50, 'でんせつの パティシエ']];

const sv = Object.assign({ best: 0, plays: 0 }, store.get(SAVE, {}));
function save() { store.set(SAVE, sv); }
const G = { mode: 'title', t: 0 };

function start() {
  G.mode = 'play';
  G.S = { layers: [{ x: -BASE / 2, z: -BASE / 2, w: BASE, d: BASE, f: 0 }], cur: null, falls: [], combo: 0, cam: 0, over: 0, msg: '', msgT: 0, sparkle: 0 };
  nextLayer();
}
function nextLayer() {
  const S = G.S, top = S.layers[S.layers.length - 1], n = S.layers.length;
  const axis = n % 2 ? 'x' : 'z';
  S.cur = { x: top.x, z: top.z, w: top.w, d: top.d, f: n % FLAVORS.length, axis, t: 0, dir: 1, speed: Math.min(320, 120 + n * 5) };
  S.cur[axis] = -220;
}
function drop() {
  const S = G.S, c = S.cur, top = S.layers[S.layers.length - 1];
  if (!c || S.over) return;
  const ax = c.axis, sz = ax === 'x' ? 'w' : 'd';
  const diff = c[ax] - top[ax];
  if (Math.abs(diff) <= 4) {
    // ぴったり
    c[ax] = top[ax];
    S.combo++;
    if (S.combo >= 3) {   // すこし 大きく
      const g = Math.min(12, BASE - c[sz]);
      c[sz] += g; c[ax] -= g / 2;
    }
    S.msg = S.combo >= 3 ? 'ぴったり！ ×' + S.combo + '  おおきく なった！' : 'ぴったり！'; S.msgT = 1.1; S.sparkle = 0.6;
    tone(660 + Math.min(12, S.combo) * 60, 0.12, 'triangle', 0.12);
  } else {
    const a0 = Math.max(c[ax], top[ax]), a1 = Math.min(c[ax] + c[sz], top[ax] + top[sz]);
    const keep = a1 - a0;
    if (keep <= 0) { S.falls.push({ ...c, vy: 0, y: S.layers.length * LH }); S.cur = null; gameOver(); return; }
    // はみだし
    const fall = { ...c, vy: 0, y: S.layers.length * LH };
    if (c[ax] < top[ax]) { fall[sz] = top[ax] - c[ax]; }
    else { fall[ax] = a1; fall[sz] = c[ax] + c[sz] - a1; }
    S.falls.push(fall);
    c[ax] = a0; c[sz] = keep;
    S.combo = 0;
    noise(0.1, 0.1, 1500); tone(440, 0.06, 'square', 0.06);
  }
  S.layers.push({ x: c.x, z: c.z, w: c.w, d: c.d, f: c.f });
  nextLayer();
}
function gameOver() {
  const S = G.S;
  S.over = 0.01;
  S.score = S.layers.length - 1;
  S.newBest = S.score > sv.best;
  sv.best = Math.max(sv.best, S.score); sv.plays++;
  save();
  tone(300, 0.4, 'triangle', 0.1, 150);
  if (S.newBest && S.score > 0) jingle([72, 76, 79, 84, 88], 0.09, 'square', 0.12);
}
function update(dt) {
  const S = G.S;
  if (S.msgT > 0) S.msgT -= dt;
  if (S.sparkle > 0) S.sparkle -= dt;
  if (S.cur) {
    const c = S.cur;
    c[c.axis] += c.dir * c.speed * dt;
    if (c[c.axis] > 220 - c[c.axis === 'x' ? 'w' : 'd'] * 0.2) c.dir = -1;
    if (c[c.axis] < -220) c.dir = 1;
  }
  for (const f of S.falls) { f.vy += 900 * dt; f.y -= f.vy * dt; }
  S.falls = S.falls.filter((f) => f.y > -400);
  const target = Math.max(0, (S.layers.length - 6) * LH);
  S.cam += (target - S.cam) * Math.min(1, dt * 4);
  if (S.over) S.over += dt;
}

// --- え（ななめ うえから 見た はこ） ------------------------------------------------

const K = 0.866, Q = 0.5;   // cos30, sin30
function iso(x, z, y) { const S = G.S; return { x: VW / 2 + (x - z) * K * 0.9, y: 400 - (x + z) * Q * 0.9 - y + S.cam }; }
function drawSlab(b, y, h, cream) {
  const F = FLAVORS[b.f];
  const p = (x, z, yy) => iso(x, z, yy);
  const x0 = b.x, x1 = b.x + b.w, z0 = b.z, z1 = b.z + b.d;
  // みぎまえ（x1 がわ）
  const a = p(x1, z0, y), bb = p(x1, z1, y), c = p(x1, z1, y + h), d = p(x1, z0, y + h);
  ctx.fillStyle = F[2]; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  // ひだりまえ（z1 がわ）
  const e = p(x0, z1, y), f = p(x0, z1, y + h);
  ctx.fillStyle = shadeHex(F[2], 0.85); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(c.x, c.y); ctx.lineTo(f.x, f.y); ctx.fill();
  // クリームの せん
  if (cream) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); const m1 = p(x0, z1, y + h * 0.45), m2 = p(x1, z1, y + h * 0.45), m3 = p(x1, z0, y + h * 0.45); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.lineTo(m3.x, m3.y); ctx.stroke();
  }
  // うえ
  const t0 = p(x0, z0, y + h), t1 = p(x1, z0, y + h), t2 = p(x1, z1, y + h), t3 = p(x0, z1, y + h);
  ctx.fillStyle = F[1]; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.fill();
}
function shadeHex(c, k) { const n = parseInt(c.slice(1), 16); const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return 'rgb(' + r + ',' + g + ',' + b + ')'; }

function drawPlay(t) {
  const S = G.S;
  const hue = Math.min(1, S.layers.length / 60);
  ctx.fillStyle = grad(0, VH, hue > 0.5 ? '#2A2A5A' : '#FFE0EC', hue > 0.5 ? '#6A4A8A' : '#FFF6F0'); ctx.fillRect(0, 0, VW, VH);
  if (hue > 0.5) for (let i = 0; i < 30; i++) fillC((i * 97) % VW, (i * 41) % 300, 1.5, '#FFF6C8');
  // おさら
  const pl = iso(-BASE / 2 - 30, -BASE / 2 - 30, -8), pr = iso(BASE / 2 + 30, BASE / 2 + 30, -8);
  ellipse((pl.x + pr.x) / 2, (pl.y + pr.y) / 2 + 12, BASE * 1.4, BASE * 0.55); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.strokeStyle = '#E8D8E0'; ctx.lineWidth = 3; ctx.stroke();
  // おちる かけらは、タワーの むこうがわ なら さきに、てまえ なら あとに かく
  const top0 = S.layers[S.layers.length - 1];
  const behind = (f) => (f.x + f.w / 2) + (f.z + f.d / 2) < (top0.x + top0.w / 2) + (top0.z + top0.d / 2);
  for (const f of S.falls) if (behind(f)) drawSlab(f, f.y - LH, LH, true);
  S.layers.forEach((b, i) => { if (i === 0) drawSlab({ ...b, f: 1 }, -LH, LH, false); else drawSlab(b, (i - 1) * LH, LH, true); });
  if (S.cur) drawSlab(S.cur, (S.layers.length - 1) * LH, LH, true);
  for (const f of S.falls) if (!behind(f)) drawSlab(f, f.y - LH, LH, true);
  // ゲームオーバー：いちごを のせる
  if (S.over) {
    const top = S.layers[S.layers.length - 1], yy = (S.layers.length - 1) * LH;
    const c = iso(top.x + top.w / 2, top.z + top.d / 2, yy + 6);
    fillC(c.x, c.y, 16, '#FFFFFF'); fillC(c.x, c.y - 12, 11, '#E84A4A'); fillR(c.x - 1, c.y - 26, 3, 6, '#3E9B4F');
  }
  if (S.sparkle > 0) { const top = S.layers[S.layers.length - 1], c = iso(top.x + top.w / 2, top.z + top.d / 2, (S.layers.length - 1) * LH); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + t * 3; star(c.x + Math.cos(a) * (60 + (0.6 - S.sparkle) * 120), c.y + Math.sin(a) * 30, 7); ctx.fillStyle = '#FFE066'; ctx.fill(); } }
  drawKid('yui', 110, VH - 20, 150, { t, pose: S.sparkle > 0 || (S.over && S.newBest) ? 'cheer' : S.over ? 'sad' : 'stand' });
  text(S.layers.length - 1, VW / 2, 60, 56, '#FFFFFF', 'center');
  text('だん', VW / 2 + 60, 66, 18, '#FFFFFF', 'left');
  text('ベスト ' + sv.best, VW - 20, 30, 18, hue > 0.5 ? '#FFFFFF' : '#8A4A6A', 'right');
  if (S.msgT > 0) { ctx.globalAlpha = Math.min(1, S.msgT * 2); textO(S.msg, VW / 2, 120, 28, '#FFE066', '#E04A7A'); ctx.globalAlpha = 1; }
  if (S.layers.length === 1 && !S.over) text('スポンジが かさなる ところで タップ！', VW / 2, VH - 30, 20, '#8A4A6A', 'center');
  if (S.over > 0.8) {
    fillRR(VW / 2 - 230, 150, 460, 250, 20, 'rgba(255,255,255,0.95)');
    textO(S.score + ' だんの ケーキ！', VW / 2, 200, 38, '#FF6FA8', '#FFFFFF');
    let title = TITLES[0][1]; for (const [n, s] of TITLES) if (S.score >= n) title = s;
    text('しょうごう：' + title, VW / 2, 250, 20, '#8A4A6A', 'center');
    text(S.newBest ? 'じこベスト こうしん！' : 'ベスト ' + sv.best + ' だん', VW / 2, 282, 18, S.newBest ? '#E04A7A' : '#6A6A7A', 'center');
    btn(VW / 2 - 210, 310, 200, 70, 'もういちど', start, { col: '#FFE066' });
    btn(VW / 2 + 10, 310, 200, 70, 'タイトル', () => { G.mode = 'title'; }, { col: '#FFE0EC' });
  }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#FFB8D0', '#FFF0F4'); ctx.fillRect(0, 0, VW, VH);
  textO('ゆいの ケーキタワー', VW / 2, 70, 52, '#FFFFFF', '#E04A7A');
  text('タップで スポンジを かさねて、たかい ケーキを つくろう！', VW / 2, 124, 19, '#8A4A6A', 'center');
  // かざりの ケーキ
  const cx = VW / 2 + 160;
  for (let i = 0; i < 6; i++) { const w = 150 - i * 12, F = FLAVORS[i % FLAVORS.length]; fillRR(cx - w / 2, 400 - i * 30, w, 30, 8, F[2]); fillR(cx - w / 2, 400 - i * 30, w, 8, F[1]); fillR(cx - w / 2, 412 - i * 30, w, 3, 'rgba(255,255,255,0.8)'); }
  fillC(cx, 222, 14, '#E84A4A'); fillR(cx - 1, 204, 3, 8, '#3E9B4F');
  drawKid('yui', VW / 2 - 180, 440, 190, { t, pose: 'wave' });
  btn(VW / 2 - 110, 160, 220, 80, 'スタート！', () => { fullScreen(); start(); }, { col: '#FFE066', size: 28 });
  text('ベスト ' + sv.best + ' だん', VW / 2, 262, 20, '#8A4A6A', 'center');
  text('ぴったり 3かい れんぞくで だんが 大きく なる', VW / 2, VH - 30, 16, '#8A4A6A', 'center');
}

startGame({
  bg: '#FFB8D0',
  update(dt) { G.t += dt; if (G.mode === 'play') update(Math.min(dt, 1 / 30)); },
  draw(t) { if (G.mode === 'title') drawTitle(t); else drawPlay(t); },
  down() { if (G.mode === 'play' && !G.S.over) drop(); },
  key(code, down) { if (down && (code === 'Space' || code === 'Enter') && G.mode === 'play' && !G.S.over) drop(); },
});
