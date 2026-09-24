// あおいの フルーツがっちゃん。
// はこの 上から くだものを おとす。同じ くだもの どうしが くっつくと
// ひとつ 大きい くだものに かわる。さいごは スイカ！
// くだものが 赤い せんを こえた まま 2びょう たつと おしまい。
//
// ★ まるい からだの ぶつりを 自分で けいさんしている（ライブラリなし）。
//   1コマを 4つに わけて うごかし、かさなりを 3回 なおすと くずれにくい。

'use strict';

const SAVE = 'fruitgaccha.v1';
const sv = store.get(SAVE, { best: 0, top: 0 });

const FR = [
  { name: 'さくらんぼ', r: 13, c: '#E8284A', c2: '#FF6A7A' },
  { name: 'いちご',     r: 17, c: '#FF4A5A', c2: '#FF8A8A' },
  { name: 'ぶどう',     r: 22, c: '#8A4AC8', c2: '#B888E8' },
  { name: 'デコポン',   r: 27, c: '#FFA020', c2: '#FFC860' },
  { name: 'かき',       r: 33, c: '#FF7A1A', c2: '#FFA860' },
  { name: 'りんご',     r: 40, c: '#E8303A', c2: '#FF7070' },
  { name: 'なし',       r: 47, c: '#E8D870', c2: '#F8F0B0' },
  { name: 'もも',       r: 55, c: '#FFA8B8', c2: '#FFD0DA' },
  { name: 'パイナップル', r: 63, c: '#F8C830', c2: '#FFE68A' },
  { name: 'メロン',     r: 73, c: '#9AD86A', c2: '#C8F0A0' },
  { name: 'スイカ',     r: 85, c: '#3AA84A', c2: '#6ACC6A' },
];
const PTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

const F = { mode: 'title', bodies: [], next: 0, cur: 0, aim: 0, cool: 0, score: 0, over: false, overT: 0,
  danger: 0, pops: [], id: 0, topLv: 0 };

function box() {
  const w = 400, h = 480;
  return { x: VW / 2 - w / 2, y: VH - h - 14, w, h, line: VH - h - 14 + 70 };
}

function newGame() {
  F.bodies = []; F.score = 0; F.over = false; F.overT = 0; F.danger = 0; F.pops = []; F.topLv = 0;
  F.cur = randSmall(); F.next = randSmall(); F.cool = 0;
  F.aim = VW / 2; F.mode = 'play';
}
function randSmall() { return Math.floor(Math.random() * 5); }

function drop() {
  if (F.cool > 0 || F.over) return;
  const B = box(), r = FR[F.cur].r;
  const x = clamp(F.aim, B.x + r + 2, B.x + B.w - r - 2);
  F.bodies.push({ id: F.id++, lv: F.cur, x, y: B.y + 30, vx: 0, vy: 0, r, born: 0, drop: 1 });
  F.cur = F.next; F.next = randSmall(); F.cool = 0.55;
  tone(500, 0.06, 'triangle', 0.08, 300);
}

function physics(dt) {
  const B = box();
  const SUB = 4, g = 1500;
  const h = dt / SUB;
  for (let s = 0; s < SUB; s++) {
    for (const b of F.bodies) { b.vy += g * h; b.x += b.vx * h; b.y += b.vy * h; }
    for (let it = 0; it < 3; it++) {
      const n = F.bodies.length;
      for (let i = 0; i < n; i++) {
        const a = F.bodies[i];
        for (let j = i + 1; j < n; j++) {
          const b = F.bodies[j];
          const dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r;
          if (dx > rs || dx < -rs || dy > rs || dy < -rs) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rs - d;
          const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
          a.x -= nx * ov * (mb / tot); a.y -= ny * ov * (mb / tot);
          b.x += nx * ov * (ma / tot); b.y += ny * ov * (ma / tot);
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const imp = -(1 + 0.15) * rv / (1 / ma + 1 / mb);
            a.vx -= imp * nx / ma; a.vy -= imp * ny / ma;
            b.vx += imp * nx / mb; b.vy += imp * ny / mb;
          }
          a.touch = b.touch = 1;
        }
      }
      for (const b of F.bodies) {
        if (b.x < B.x + b.r) { b.x = B.x + b.r; b.vx = Math.abs(b.vx) * 0.2; }
        if (b.x > B.x + B.w - b.r) { b.x = B.x + B.w - b.r; b.vx = -Math.abs(b.vx) * 0.2; }
        if (b.y > B.y + B.h - b.r) { b.y = B.y + B.h - b.r; if (b.vy > 0) b.vy *= -0.15; b.vx *= 0.96; b.touch = 1; }
      }
    }
    for (const b of F.bodies) { b.vx *= 0.995; b.vy *= 0.999; }
  }
}

function merges() {
  const n = F.bodies.length;
  const gone = new Set(), add = [];
  for (let i = 0; i < n; i++) {
    const a = F.bodies[i];
    if (gone.has(a.id)) continue;
    for (let j = i + 1; j < n; j++) {
      const b = F.bodies[j];
      if (gone.has(b.id) || a.lv !== b.lv) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > a.r + b.r + 1.5) continue;
      gone.add(a.id); gone.add(b.id);
      F.score += PTS[a.lv] * 2;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      F.pops.push({ x: mx, y: my, r: a.r, t: 0, c: FR[a.lv].c2 });
      if (a.lv < FR.length - 1) {
        const lv = a.lv + 1;
        add.push({ id: F.id++, lv, x: mx, y: my, vx: (a.vx + b.vx) / 2, vy: Math.min(0, (a.vy + b.vy) / 2), r: FR[lv].r, born: 0.25 });
        F.topLv = Math.max(F.topLv, lv);
        tone(300 + lv * 70, 0.12, 'triangle', 0.14, 500 + lv * 90);
        if (lv >= 8) jingle([72, 76, 79, 84, 88], 0.08, 'square', 0.14);
      } else {
        // スイカ どうしで 大ボーナス
        F.score += 200;
        jingle([84, 88, 91, 96], 0.1, 'square', 0.16);
      }
      break;
    }
  }
  if (gone.size) F.bodies = F.bodies.filter((b) => !gone.has(b.id)).concat(add);
}

function update(dt) {
  if (F.mode !== 'play') return;
  if (F.cool > 0) F.cool -= dt;
  if (KEYS.ArrowLeft) F.aim -= 360 * dt;
  if (KEYS.ArrowRight) F.aim += 360 * dt;
  const B = box();
  F.aim = clamp(F.aim, B.x + 10, B.x + B.w - 10);
  if (F.over) { F.overT += dt; return; }
  for (const b of F.bodies) { b.touch = 0; if (b.born > 0) b.born -= dt; }
  physics(dt);
  merges();
  // あふれ チェック（おちてきた ばかりの ものは かぞえない）
  let over = false;
  for (const b of F.bodies) {
    if (b.drop && b.touch) b.drop = 0;
    if (!b.drop && b.y - b.r < B.line) over = true;
  }
  F.danger = over ? F.danger + dt : Math.max(0, F.danger - dt * 2);
  if (F.danger > 2) {
    F.over = true; F.overT = 0;
    if (F.score > sv.best) { sv.best = F.score; F.newBest = true; } else F.newBest = false;
    sv.top = Math.max(sv.top, F.topLv);
    store.set(SAVE, sv);
    tone(300, 0.6, 'triangle', 0.15, 80);
  }
  for (const p of F.pops) p.t += dt;
  F.pops = F.pops.filter((p) => p.t < 0.5);
}

// --- かく ----------------------------------------------------------------------------

function drawFruit(lv, x, y, r, face, t) {
  const f = FR[lv];
  ctx.save();
  ctx.translate(x, y);
  if (lv === 10) {                     // スイカ（しまもよう）
    fillC(0, 0, r, '#2A8A3A');
    ctx.save(); circ(0, 0, r); ctx.clip();
    ctx.strokeStyle = '#1A5A26'; ctx.lineWidth = r * 0.12;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.32, -r); ctx.quadraticCurveTo(i * r * 0.32 + r * 0.25, 0, i * r * 0.32, r); ctx.stroke(); }
    ctx.restore();
  } else if (lv === 9) {               // メロン（あみめ）
    fillC(0, 0, r, f.c);
    ctx.save(); circ(0, 0, r); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.28 - r, -r); ctx.lineTo(i * r * 0.28 + r, r); ctx.moveTo(i * r * 0.28 + r, -r); ctx.lineTo(i * r * 0.28 - r, r); ctx.stroke(); }
    ctx.restore();
  } else if (lv === 8) {               // パイナップル
    fillC(0, 0, r, f.c);
    ctx.save(); circ(0, 0, r); ctx.clip();
    ctx.strokeStyle = 'rgba(160,110,20,0.5)'; ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.25 - r, -r); ctx.lineTo(i * r * 0.25 + r, r); ctx.moveTo(i * r * 0.25 + r, -r); ctx.lineTo(i * r * 0.25 - r, r); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#4AA84A';
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.12, -r * 0.85); ctx.lineTo(i * r * 0.3, -r * 1.3); ctx.lineTo(i * r * 0.12 + r * 0.1, -r * 0.85); ctx.fill(); }
  } else if (lv === 2) {               // ぶどう（つぶつぶ）
    for (const [dx, dy] of [[-0.4, -0.3], [0.4, -0.3], [0, 0.05], [-0.4, 0.4], [0.4, 0.4], [0, -0.55], [0, 0.6]]) fillC(dx * r, dy * r, r * 0.42, f.c);
    fillC(-r * 0.15, -r * 0.2, r * 0.15, f.c2);
  } else {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, f.c2); g.addColorStop(1, f.c);
    ctx.fillStyle = g; circ(0, 0, r); ctx.fill();
    if (lv === 1) { ctx.fillStyle = '#FFF4B0'; for (let i = 0; i < 8; i++) fillC(Math.cos(i * 2.4) * r * 0.55, Math.sin(i * 2.4) * r * 0.5 + r * 0.1, 1.6, '#FFF4B0'); }
  }
  // へた・は
  if (lv === 0) { ctx.strokeStyle = '#5A8A3A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.6, -r * 2, r * 0.9, -r * 1.9); ctx.stroke(); }
  if (lv === 1 || lv === 3 || lv === 4 || lv === 5 || lv === 7) {
    ctx.fillStyle = '#4AA84A';
    ellipse(r * 0.18, -r * 0.92, r * 0.28, r * 0.12, -0.5); ctx.fill();
    if (lv === 4) { ellipse(-r * 0.18, -r * 0.92, r * 0.28, r * 0.12, 0.5); ctx.fill(); }
  }
  if (face) {
    const es = Math.max(1.5, r * 0.09), ey = lv === 10 ? -r * 0.05 : r * 0.02;
    fillC(-r * 0.28, ey, es, '#2A2028'); fillC(r * 0.28, ey, es, '#2A2028');
    fillC(-r * 0.28 - es * 0.3, ey - es * 0.3, es * 0.35, '#FFFFFF'); fillC(r * 0.28 - es * 0.3, ey - es * 0.3, es * 0.35, '#FFFFFF');
    fillC(-r * 0.46, ey + r * 0.2, r * 0.1, 'rgba(255,120,150,0.5)'); fillC(r * 0.46, ey + r * 0.2, r * 0.1, 'rgba(255,120,150,0.5)');
    ctx.strokeStyle = '#5A2038'; ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.beginPath(); ctx.arc(0, ey + r * 0.12, r * 0.12, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  ctx.restore();
  void t;
}

function drawPlay(t) {
  ctx.fillStyle = grad(0, VH, '#FFE8C8', '#FFD0A0'); ctx.fillRect(0, 0, VW, VH);
  const B = box();
  // はこ
  fillRR(B.x - 14, B.y - 6, B.w + 28, B.h + 20, 18, '#C8905A');
  fillRR(B.x, B.y, B.w, B.h, 8, '#FFF6E8');
  // あぶない せん
  ctx.strokeStyle = F.danger > 0 ? 'rgba(255,60,60,' + (0.5 + Math.sin(t * 20) * 0.4) + ')' : 'rgba(255,90,90,0.35)';
  ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(B.x, B.line); ctx.lineTo(B.x + B.w, B.line); ctx.stroke(); ctx.setLineDash([]);
  // ねらい
  if (!F.over) {
    const r = FR[F.cur].r;
    const ax = clamp(F.aim, B.x + r + 2, B.x + B.w - r - 2);
    ctx.strokeStyle = 'rgba(160,110,60,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, B.y + 30); ctx.lineTo(ax, B.y + B.h); ctx.stroke();
    if (F.cool <= 0) drawFruit(F.cur, ax, B.y + 30, r, 1, t);
  }
  for (const b of F.bodies) {
    const s = b.born > 0 ? 1 + b.born * 0.8 : 1;
    drawFruit(b.lv, b.x, b.y, b.r * s, 1, t);
  }
  for (const p of F.pops) {
    ctx.globalAlpha = 1 - p.t / 0.5;
    ctx.strokeStyle = p.c; ctx.lineWidth = 4; circ(p.x, p.y, p.r * (1 + p.t * 2)); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // ひだり：スコア
  const lx = Math.max(10, B.x - 220);
  fillRR(lx, 20, 190, 150, 16, 'rgba(255,255,255,0.7)');
  text('スコア', lx + 95, 48, 20, '#8A5A3A', 'center');
  textO(String(F.score), lx + 95, 92, 40, '#FF8A3A', '#FFFFFF');
  text('ベスト ' + sv.best, lx + 95, 140, 18, '#8A5A3A', 'center');
  btn(lx + 20, VH - 80, 150, 56, 'やめる', () => { F.mode = 'title'; }, { col: '#FFFFFF', size: 20 });
  // みぎ：つぎ と しんかの わ
  const rx = B.x + B.w + 30;
  if (rx + 190 < VW + 10) {
    fillRR(rx, 20, 190, 130, 16, 'rgba(255,255,255,0.7)');
    text('つぎ', rx + 95, 44, 20, '#8A5A3A', 'center');
    drawFruit(F.next, rx + 95, 96, Math.min(FR[F.next].r, 34), 1, t);
    fillRR(rx, 170, 190, 290, 16, 'rgba(255,255,255,0.7)');
    text('しんかの わ', rx + 95, 194, 18, '#8A5A3A', 'center');
    for (let i = 0; i < FR.length; i++) {
      const a = -Math.PI / 2 + i / FR.length * Math.PI * 2;
      drawFruit(i, rx + 95 + Math.cos(a) * 70, 322 + Math.sin(a) * 70, 8 + i * 1.3, 0, t);
    }
    text(F.topLv >= 10 ? 'スイカ！' : FR[F.topLv].name, rx + 95, 322, 15, '#8A5A3A', 'center', true, 90);
  }
  if (F.over && F.overT > 0.6) {
    fillR(0, 0, VW, VH, 'rgba(80,40,10,0.45)');
    textO('あふれちゃった！', VW / 2, 170, 50, '#FFFFFF', '#8A3A10');
    textO('スコア ' + F.score, VW / 2, 240, 40, '#FFE066', '#8A3A10');
    if (F.newBest) text('ベスト こうしん！', VW / 2, 288, 24, '#FFFFFF', 'center');
    btn(VW / 2 - 230, 320, 220, 70, 'もういちど', newGame);
    btn(VW / 2 + 10, 320, 220, 70, 'タイトルへ', () => { F.mode = 'title'; }, { col: '#FFFFFF' });
  }
}

function drawTitle(t) {
  ctx.fillStyle = grad(0, VH, '#FFE8C8', '#FFD0A0'); ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < FR.length; i++) {
    const x = 60 + i * (VW - 120) / (FR.length - 1), y = VH - 70 - Math.abs(Math.sin(t * 3 + i)) * 16;
    drawFruit(i, x, y - FR[i].r * 0.3, Math.min(FR[i].r, 40), 1, t);
  }
  text('あおいの', VW / 2, 62, 26, '#8A5A3A', 'center');
  textO('フルーツがっちゃん', VW / 2, 130, 60, '#FF6A5A', '#FFFFFF');
  text('同じ くだものを くっつけて スイカを つくろう！', VW / 2, 196, 22, '#8A5A3A', 'center');
  btn(VW / 2 - 150, 240, 300, 80, 'あそぶ', () => { fullScreen(); newGame(); }, { col: '#FFE066', sub: 'ベスト ' + sv.best });
  if (sv.top > 0) text('いちばん 大きく できた：' + FR[sv.top].name, VW / 2, 350, 20, '#8A5A3A', 'center');
}

startGame({
  bg: '#FFD0A0',
  update,
  draw(t) { if (F.mode === 'title') drawTitle(t); else drawPlay(t); },
  down(x) { if (F.mode === 'play') F.aim = x; },
  move(x, y, drag) { if (F.mode === 'play' && drag) F.aim = x; },
  up(x) { if (F.mode === 'play') { F.aim = x; drop(); } },
  key(code, down) { if (down && F.mode === 'play' && (code === 'Space' || code === 'ArrowDown')) drop(); },
});
