// りなの まちがいさがし
//
// ★ 左と 右に 同じ 絵。ちがう ところを タップで さがす。
//   絵は その場で 作るので、あそぶ たびに ちがう 絵に なる。
//
// ★ ちがいの つくりかた（5しゅるい）
//     色が ちがう／大きさが ちがう／むきが ちがう／ばしょが ちがう／ない
//   どれも「見れば わかる」大きさに して ある。小さすぎる ちがいは 出さない。

'use strict';

const GAME_VER = 1;
const HUD = 26;

const STAGES = [
  { n: 3, items: 8, time: 100, name: '1めん' },
  { n: 4, items: 9, time: 100, name: '2めん' },
  { n: 4, items: 10, time: 95, name: '3めん' },
  { n: 5, items: 11, time: 95, name: '4めん' },
  { n: 5, items: 12, time: 90, name: '5めん' },
  { n: 6, items: 12, time: 90, name: '6めん' },
  { n: 6, items: 13, time: 85, name: '7めん' },
  { n: 7, items: 14, time: 85, name: '8めん' },
  { n: 7, items: 15, time: 80, name: '9めん' },
  { n: 8, items: 16, time: 80, name: 'さいご' },
];

const SCENES = [
  { name: 'こうえん', sky: ['#8FD6FF', '#DFF3FF'], ground: '#7ACB6A', deco: 'park' },
  { name: 'おへや', sky: ['#CFE4F2', '#EAF4FA'], ground: '#D8B98A', deco: 'room' },
  { name: 'うみべ', sky: ['#5AC8E8', '#DFF6FF'], ground: '#F0DCA8', deco: 'sea' },
  { name: 'よぞら', sky: ['#1B1430', '#3A2A5A'], ground: '#2E3A56', deco: 'night' },
];

const SAVE_KEY = 'spot.save.v1';
const save = { open: 1, clear: {}, best: {}, found: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (typeof s.found === 'number') save.found = s.found;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  scene: null, objs: [], diffs: [], found: 0, time: 0,
  hints: 3, hintT: 0, over: false, won: false,
  miss: 0, missT: 0, msg: '', msgT: 0, tapFx: [],
};

// --- ばんめん ------------------------------------------------------------------------

function panel(i) {
  const top = HUD + 22, bot = 8, gap = 10;
  const w = (VW - 20 - gap) / 2;
  const h = VH - top - bot;
  return { x: 10 + i * (w + gap), y: top, w: w, h: h };
}
// 0〜1 の ばしょ を 画面の ばしょ に
function toP(P, u, v) { return { x: P.x + u * P.w, y: P.y + v * P.h }; }

function buildStage(n) {
  const S = STAGES[n];
  G.scene = SCENES[n % SCENES.length];
  // ものを ならべる（かさならない ように ますめに 置く）
  const cols = 4, rows = 4;
  const cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push([i, j]);
  for (let i = cells.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    const t = cells[i]; cells[i] = cells[k]; cells[k] = t;
  }
  G.objs = [];
  const bag = ITEMS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    const t = bag[i]; bag[i] = bag[k]; bag[k] = t;
  }
  const nItems = Math.min(S.items, cells.length);
  for (let i = 0; i < nItems; i++) {
    const [ci, cj] = cells[i];
    const it = bag[i % bag.length];
    G.objs.push({
      item: it,
      u: (ci + 0.5) / cols + (Math.random() - 0.5) * 0.08,
      v: (cj + 0.5) / rows * 0.86 + 0.10 + (Math.random() - 0.5) * 0.05,
      s: 0.055 + Math.random() * 0.02,
      col: it.cols[Math.floor(Math.random() * it.cols.length)],
      flip: 1,
      du: 0, dv: 0, ds: 0, dcol: null, dflip: 1, gone: 0,
    });
  }
  // ちがいを つくる
  const kinds = ['col', 'size', 'flip', 'move', 'gone'];
  const idx = [];
  for (let i = 0; i < G.objs.length; i++) idx.push(i);
  for (let i = idx.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    const t = idx[i]; idx[i] = idx[k]; idx[k] = t;
  }
  G.diffs = [];
  for (let d = 0; d < S.n; d++) {
    const o = G.objs[idx[d]];
    const kind = kinds[d % kinds.length];
    if (kind === 'col') {
      const other = o.item.cols.filter((c) => c !== o.col);
      o.dcol = other[Math.floor(Math.random() * other.length)] || '#FFFFFF';
    } else if (kind === 'size') {
      o.ds = o.s * (Math.random() < 0.5 ? 0.55 : 0.75);
    } else if (kind === 'flip') {
      o.dflip = -1;
    } else if (kind === 'move') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      if (Math.random() < 0.5) o.du = dir * 0.075; else o.dv = dir * 0.075;
    } else {
      o.gone = 1;
    }
    G.diffs.push({ o: o, kind: kind, hit: false });
  }
  G.found = 0; G.time = S.time; G.hints = 3; G.hintT = 0;
  G.over = false; G.won = false; G.miss = 0; G.missT = 0; G.tapFx = [];
}

function startStage(n) {
  G.stage = n;
  buildStage(n);
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n); bgmHeat(0.2);
}

function say(s) { G.msg = s; G.msgT = 1.4; }

// --- タップ -------------------------------------------------------------------------

function tapAt(x, y) {
  if (G.over || G.won) return;
  let side = -1;
  for (let i = 0; i < 2; i++) {
    const P = panel(i);
    if (x >= P.x && x <= P.x + P.w && y >= P.y && y <= P.y + P.h) side = i;
  }
  if (side < 0) return;
  const P = panel(side);
  const u = (x - P.x) / P.w, v = (y - P.y) / P.h;
  let best = null, bd = 1e9;
  for (const d of G.diffs) {
    if (d.hit) continue;
    const o = d.o;
    // 左（0）は もとの すがた、右（1）は ちがう すがた
    const pu = side === 1 ? o.u + o.du : o.u;
    const pv = side === 1 ? o.v + o.dv : o.v;
    const dx = (u - pu) * P.w, dy = (v - pv) * P.h;
    const dd = Math.hypot(dx, dy);
    const r = Math.max(34, o.s * P.h * 1.5);
    if (dd < r && dd < bd) { bd = dd; best = d; }
    if (d.kind === 'move') {
      const qu = side === 1 ? o.u : o.u + o.du;
      const qv = side === 1 ? o.v : o.v + o.dv;
      const d2 = Math.hypot((u - qu) * P.w, (v - qv) * P.h);
      if (d2 < r && d2 < bd) { bd = d2; best = d; }
    }
  }
  if (best) {
    best.hit = true;
    G.found++; save.found++;
    G.tapFx.push({ u: best.o.u, v: best.o.v, t: 0.6, ok: true });
    sfxGet();
    if (G.found >= G.diffs.length) win();
  } else {
    G.miss++; G.missT = 0.5;
    G.time = Math.max(0, G.time - 3);
    G.tapFx.push({ u: u, v: v, t: 0.4, ok: false, side: side });
    sfxNg();
    say('ちがうよ… 3びょう へった');
  }
}

function useHint() {
  if (G.hints <= 0 || G.over || G.won) return;
  const left = G.diffs.filter((d) => !d.hit);
  if (!left.length) return;
  G.hints--;
  G.hintT = 2.4;
  G.hintOn = left[Math.floor(Math.random() * left.length)];
  G.time = Math.max(0, G.time - 5);
  say('ヒント！ 5びょう へった');
  sfxJump();
}

function win() {
  G.won = true;
  const key = 's' + G.stage;
  const sc = Math.round(G.time * 10) + G.found * 100 - G.miss * 20;
  G.score = Math.max(0, sc);
  if (!save.best[key] || G.score > save.best[key]) save.best[key] = G.score;
  save.clear[G.stage] = true;
  if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
  storeSave();
  bgmStop(); sfxClear(true);
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.missT > 0) G.missT -= dt;
  if (G.hintT > 0) G.hintT -= dt;
  for (let i = G.tapFx.length - 1; i >= 0; i--) {
    G.tapFx[i].t -= dt;
    if (G.tapFx[i].t <= 0) G.tapFx.splice(i, 1);
  }
  if (G.screen !== 'play' || G.over || G.won) return;
  for (const t of IN.taps) tapAt(t.x, t.y);
  G.time -= dt;
  if (G.time <= 0) {
    G.time = 0; G.over = true;
    bgmStop(); sfxOver(); storeSave();
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawBack(P) {
  const S = G.scene;
  ctx.save();
  rr(P.x, P.y, P.w, P.h, 10); ctx.clip();
  const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h * 0.7);
  g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.fillStyle = S.ground;
  ctx.beginPath();
  ctx.moveTo(P.x, P.y + P.h * 0.62);
  ctx.quadraticCurveTo(P.x + P.w * 0.5, P.y + P.h * 0.56, P.x + P.w, P.y + P.h * 0.62);
  ctx.lineTo(P.x + P.w, P.y + P.h); ctx.lineTo(P.x, P.y + P.h);
  ctx.closePath(); ctx.fill();
  if (S.deco === 'park' || S.deco === 'sea') {
    ctx.fillStyle = S.deco === 'sea' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      const cx = P.x + P.w * (0.15 + i * 0.32), cy = P.y + P.h * (0.13 + (i % 2) * 0.06);
      const r = P.h * 0.05;
      circle(cx, cy, r); ctx.fill();
      circle(cx + r, cy + r * 0.2, r * 0.75); ctx.fill();
      circle(cx - r, cy + r * 0.2, r * 0.7); ctx.fill();
    }
  }
  if (S.deco === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 26; i++) {
      const h = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
      circle(P.x + h * P.w, P.y + h2 * P.h * 0.55, 1.6); ctx.fill();
    }
    ctx.fillStyle = '#FFF2C0';
    circle(P.x + P.w * 0.85, P.y + P.h * 0.12, P.h * 0.055); ctx.fill();
  }
  if (S.deco === 'room') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    rr(P.x + P.w * 0.08, P.y + P.h * 0.10, P.w * 0.18, P.h * 0.2, 6); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
  rr(P.x, P.y, P.w, P.h, 10); ctx.stroke();
}

function drawPanel(i) {
  const P = panel(i);
  drawBack(P);
  ctx.save();
  rr(P.x, P.y, P.w, P.h, 10); ctx.clip();
  for (const o of G.objs) {
    const alt = i === 1;
    if (alt && o.gone) continue;
    const u = alt ? o.u + o.du : o.u;
    const v = alt ? o.v + o.dv : o.v;
    const s = (alt && o.ds) ? o.ds : o.s;
    const col = (alt && o.dcol) ? o.dcol : o.col;
    const fl = alt ? o.dflip : o.flip;
    const p = toP(P, u, v);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (fl < 0) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath();
    ctx.ellipse(0, s * P.h * 0.98, s * P.h * 0.9, s * P.h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    o.item.draw(0, 0, s * P.h, col);
    ctx.restore();
  }
  // 見つけた ところ
  for (const d of G.diffs) {
    if (!d.hit) continue;
    const alt = i === 1;
    const u = alt ? d.o.u + d.o.du : d.o.u;
    const v = alt ? d.o.v + d.o.dv : d.o.v;
    const p = toP(P, u, v);
    const r = Math.max(26, d.o.s * P.h * 1.35);
    ctx.strokeStyle = '#FF3A6A'; ctx.lineWidth = 4;
    circle(p.x, p.y, r); ctx.stroke();
  }
  // ヒント
  if (G.hintT > 0 && G.hintOn && !G.hintOn.hit) {
    const alt = i === 1;
    const u = alt ? G.hintOn.o.u + G.hintOn.o.du : G.hintOn.o.u;
    const v = alt ? G.hintOn.o.v + G.hintOn.o.dv : G.hintOn.o.v;
    const p = toP(P, u, v);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(G.t * 8);
    ctx.strokeStyle = '#FFD24A'; ctx.lineWidth = 5;
    circle(p.x, p.y, Math.max(40, G.hintOn.o.s * P.h * 2.2)); ctx.stroke();
    ctx.restore();
  }
  // タップの あと
  for (const f of G.tapFx) {
    if (f.side !== undefined && f.side !== i) continue;
    const p = toP(P, f.u, f.v);
    ctx.save();
    ctx.globalAlpha = clamp(f.t * 2, 0, 1);
    ctx.strokeStyle = f.ok ? '#5ADC80' : '#FF6A6A';
    ctx.lineWidth = 3;
    circle(p.x, p.y, (1 - f.t) * 60 + 8); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  bigText(i === 0 ? 'ひだり' : 'みぎ', P.x + P.w / 2, P.y - 10, 13, 'rgba(255,255,255,0.8)', null);
}

function drawPlay() {
  bgGrad('#2A4258', '#101A26');
  drawPanel(0);
  drawPanel(1);
  drawHud();
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, HUD + 8, 18, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.won) {
    drawResult(true, 'ぜんぶ 見つけた！',
      ['スコア ' + G.score + '　のこり時間 ' + G.time.toFixed(1) + 'びょう',
       'まちがえ ' + G.miss + 'かい'],
      G.stage >= STAGES.length - 1
        ? [{ label: 'メニュー', on: () => { G.screen = 'title'; } }]
        : [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
           { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
  if (G.over) {
    drawResult(false, '時間ぎれ…',
      ['見つけた ' + G.found + ' / ' + G.diffs.length,
       'あと ' + (G.diffs.length - G.found) + 'つ だった'],
      [{ label: 'もういちど', on: () => startStage(G.stage) },
       { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = G.time < 12 ? '#FF8A8A' : '#FFD24A';
  ctx.fillText('のこり ' + G.time.toFixed(1), 10, HUD / 2);
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#E8F0FF';
  ctx.fillText('見つけた ' + G.found + ' / ' + G.diffs.length, 108, HUD / 2);
  ctx.fillText(STAGES[G.stage].name + '（' + G.scene.name + '）', 232, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const bw = 104;
  drawButton(button(VW - bw - 10, 2, bw, HUD - 4, () => useHint()),
             'ヒント ' + G.hints, G.hints > 0 ? '#FFD24A' : 'rgba(255,255,255,0.2)');
}

function drawTitle() {
  bgGrad('#2A4258', '#101A26');
  bigText('りなの', VW / 2, 38, 20, '#FFC0DC');
  bigText('まちがいさがし', VW / 2, 74, fitSize('まちがいさがし', VW * 0.6, 44), '#FFD24A');
  bigText('左と 右で ちがう ところを タップ！ あそぶ たびに 絵が かわる', VW / 2, 114, 16, '#DDE8FF', null);
  bigText('色・大きさ・むき・ばしょ・ない　の 5しゅるい', VW / 2, 138, 15, '#B8C8E8', null);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 164,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 34, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 34, () => sfxTest()), '♪ おと', '#8AD8F0');
  bigText('これまでに ' + save.found + 'つ 見つけた', VW / 2, VH - 16, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#2A4258', '#101A26');
  bigText('あそびかた', VW / 2, 38, 26, '#FFD24A');
  const lines = [
    '① 左と 右の 絵を くらべて、ちがう ところを タップ',
    '② 見つけると あかい わが つく。ぜんぶ 見つけたら クリア',
    '③ ちがうと 3びょう へる。あわてず よく 見よう',
    '④ 右上の「ヒント」で 1つ 光らせる（5びょう へる・3回まで）',
    '⑤ ちがいは 色・大きさ・むき・ばしょ・ない の 5しゅるい',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 84 + i * 32, fitSize(s, VW * 0.88, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'tap' });
