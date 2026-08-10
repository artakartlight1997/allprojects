// りなの フルーツスライス
//
// ★ とんで きた くだものを ゆびで さっと きる。ばくだんは きらない。
//
// ★ 気もちよさの ために
//     ・ゆびの 通った 線と くだものの まるの「まじわり」で 見る ので、
//       速く はらっても とりこぼさない（コマの あいだも つないで しらべる）
//     ・1回の はらいで たくさん きると コンボで てんすうが はねる
//     ・きった くだものは 半分に わかれて 飛ぶ。しるも とぶ

'use strict';

const GAME_VER = 1;
const HUD = 26;

const GRAV = 900;
const LIVES = 3;

const FRUITS = ['apple', 'banana', 'strawberry', 'cake', 'star', 'flower', 'ball', 'fish'];

const MODES = [
  { key: 'endless', name: 'エンドレス', about: '3回 おとしたら おしまい' },
  { key: 'time', name: '60びょう', about: '時間いっぱい きりまくる' },
];

const SAVE_KEY = 'slice.save.v1';
const save = { hi: {}, cut: 0, plays: 0, bestCombo: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.hi && typeof s.hi === 'object') save.hi = s.hi;
  if (typeof s.cut === 'number') save.cut = s.cut;
  if (typeof s.plays === 'number') save.plays = s.plays;
  if (typeof s.bestCombo === 'number') save.bestCombo = s.bestCombo;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, mode: 0,
  objs: [], bits: [], juice: [], trail: [],
  score: 0, lives: LIVES, combo: 0, comboT: 0, best: 0,
  time: 0, spawnT: 0, level: 0, over: false,
  msg: '', msgT: 0, flash: 0, px: 0, py: 0, had: false,
};

function say(s) { G.msg = s; G.msgT = 1.2; }

function startRun(mode) {
  G.mode = mode;
  G.objs = []; G.bits = []; G.juice = []; G.trail = [];
  G.score = 0; G.lives = LIVES; G.combo = 0; G.comboT = 0;
  G.time = mode === 1 ? 60 : 0;
  G.spawnT = 0.8; G.level = 0; G.over = false; G.flash = 0;
  G.had = false;
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(3); bgmHeat(0.3);
}

function spawn() {
  const lv = G.level;
  const n = 1 + (Math.random() < Math.min(0.55, 0.12 + lv * 0.05) ? 1 : 0)
              + (Math.random() < Math.min(0.3, lv * 0.03) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const bomb = Math.random() < Math.min(0.22, 0.05 + lv * 0.018);
    const x = VW * (0.15 + Math.random() * 0.7);
    // ★ 上がる 高さ = vy*vy/(2*GRAV)。画面の 7わりくらい 上がる ように する。
    //   まえは ひくすぎて 画面の 下の ほうで すぐ もどって いた。
    const vy = -(760 + Math.random() * 140 + lv * 8);
    const vx = (VW / 2 - x) * (0.25 + Math.random() * 0.35);
    G.objs.push({
      x: x, y: VH + 40, vx: vx, vy: vy,
      k: bomb ? 'bomb' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
      bomb: bomb, r: bomb ? 26 : 30, a: Math.random() * 6, va: (Math.random() - 0.5) * 4,
      col: null, dead: false,
    });
    const o = G.objs[G.objs.length - 1];
    if (!bomb) {
      const it = ITEM_BY[o.k];
      o.col = it.cols[Math.floor(Math.random() * it.cols.length)];
    }
  }
}

// 線ぶんと まるの まじわり
function segHit(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t, py = y1 + dy * t;
  return Math.hypot(px - cx, py - cy) <= r;
}

function cut(o, ax, ay) {
  o.dead = true;
  if (o.bomb) {
    G.lives = 0;
    G.flash = 0.5;
    say('ばくだん！');
    sfxDead();
    endRun();
    return;
  }
  G.combo++; G.comboT = 0.55;
  const add = 10 + Math.max(0, G.combo - 1) * 5;
  G.score += add;
  save.cut++;
  if (G.combo > save.bestCombo) save.bestCombo = G.combo;
  if (G.combo >= 3) say(G.combo + ' コンボ！ +' + add);
  const an = Math.atan2(ay, ax);
  for (const sg of [-1, 1]) {
    G.bits.push({
      x: o.x, y: o.y, vx: o.vx + Math.cos(an + sg * Math.PI / 2) * 150,
      vy: o.vy + Math.sin(an + sg * Math.PI / 2) * 150,
      k: o.k, col: o.col, r: o.r, a: o.a, va: sg * 5, half: sg, t: 1.6,
    });
  }
  const it = ITEM_BY[o.k];
  for (let i = 0; i < 10; i++) {
    G.juice.push({
      x: o.x, y: o.y,
      vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320 - 60,
      r: 3 + Math.random() * 5, col: o.col || it.cols[0], t: 0.7,
    });
  }
  sfxPop();
}

function endRun() {
  if (G.over) return;
  G.over = true;
  const key = MODES[G.mode].key;
  if (!save.hi[key] || G.score > save.hi[key]) save.hi[key] = G.score;
  storeSave();
  bgmStop();
  sfxOver();
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.flash > 0) G.flash -= dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  for (let i = G.juice.length - 1; i >= 0; i--) {
    const j = G.juice[i];
    j.t -= dt; j.x += j.vx * dt; j.y += j.vy * dt; j.vy += GRAV * 0.5 * dt;
    if (j.t <= 0) G.juice.splice(i, 1);
  }
  for (let i = G.bits.length - 1; i >= 0; i--) {
    const b = G.bits[i];
    b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += GRAV * dt; b.a += b.va * dt;
    if (b.t <= 0 || b.y > VH + 120) G.bits.splice(i, 1);
  }
  for (let i = G.trail.length - 1; i >= 0; i--) {
    G.trail[i].t -= dt;
    if (G.trail[i].t <= 0) G.trail.splice(i, 1);
  }
  if (G.screen !== 'play' || G.over) return;

  // ゆびの 線
  if (IN.hold) {
    if (G.had) {
      G.trail.push({ x1: G.px, y1: G.py, x2: IN.x, y2: IN.y, t: 0.24 });
      const dx = IN.x - G.px, dy = IN.y - G.py;
      if (Math.hypot(dx, dy) > 4) {
        for (const o of G.objs) {
          if (o.dead) continue;
          if (segHit(G.px, G.py, IN.x, IN.y, o.x, o.y, o.r)) cut(o, dx, dy);
        }
      }
    }
    G.px = IN.x; G.py = IN.y; G.had = true;
  } else G.had = false;
  if (G.over) return;

  // とばす
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = Math.max(0.55, 1.35 - G.level * 0.055);
    spawn();
  }
  G.level = G.mode === 1 ? (60 - G.time) / 6 : G.score / 160;
  bgmHeat(clamp(G.level / 10, 0, 1));

  for (let i = G.objs.length - 1; i >= 0; i--) {
    const o = G.objs[i];
    o.x += o.vx * dt; o.y += o.vy * dt; o.vy += GRAV * dt; o.a += o.va * dt;
    if (o.dead || o.y > VH + 80) {
      if (!o.dead && !o.bomb) {
        G.lives--;
        G.combo = 0;
        say('おとした！');
        sfxNg();
        if (G.mode === 0 && G.lives <= 0) { endRun(); return; }
      }
      G.objs.splice(i, 1);
    }
  }

  if (G.mode === 1) {
    G.time -= dt;
    if (G.time <= 0) { G.time = 0; endRun(); }
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawBomb(x, y, r, t) {
  ctx.fillStyle = '#242838';
  circle(x, y, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  circle(x - r * 0.32, y - r * 0.34, r * 0.22); ctx.fill();
  ctx.strokeStyle = '#B0A090'; ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.78);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 0.7, y - r * 1.55);
  ctx.stroke();
  ctx.fillStyle = '#FFD24A';
  circle(x + r * 0.7, y - r * 1.6, r * 0.2 * (1 + Math.sin(t * 30) * 0.3)); ctx.fill();
  ctx.fillStyle = '#FF6A3A';
  circle(x + r * 0.7, y - r * 1.6, r * 0.1); ctx.fill();
}

function drawPlay() {
  bgGrad('#1E4034', '#0A1614');
  // 木もれび
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#FFF';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(VW * (i * 0.22), -20);
    ctx.lineTo(VW * (i * 0.22) + 90, -20);
    ctx.lineTo(VW * (i * 0.22) + 220, VH + 20);
    ctx.lineTo(VW * (i * 0.22) + 130, VH + 20);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  for (const j of G.juice) {
    ctx.globalAlpha = clamp(j.t * 1.6, 0, 1);
    ctx.fillStyle = j.col;
    circle(j.x, j.y, j.r); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const b of G.bits) {
    ctx.save();
    ctx.globalAlpha = clamp(b.t, 0, 1);
    ctx.translate(b.x, b.y); ctx.rotate(b.a);
    ctx.beginPath();
    if (b.half > 0) ctx.rect(0, -b.r * 1.4, b.r * 1.5, b.r * 2.8);
    else ctx.rect(-b.r * 1.5, -b.r * 1.4, b.r * 1.5, b.r * 2.8);
    ctx.clip();
    ITEM_BY[b.k].draw(0, 0, b.r, b.col);
    ctx.restore();
  }
  for (const o of G.objs) {
    ctx.save();
    ctx.translate(o.x, o.y); ctx.rotate(o.a);
    if (o.bomb) drawBomb(0, 0, o.r, G.t);
    else ITEM_BY[o.k].draw(0, 0, o.r, o.col);
    ctx.restore();
  }
  // ゆびの あと
  ctx.save();
  ctx.lineCap = 'round';
  for (const s of G.trail) {
    ctx.globalAlpha = clamp(s.t / 0.24, 0, 1) * 0.9;
    ctx.strokeStyle = '#FFF6C0';
    ctx.lineWidth = 3 + clamp(s.t / 0.24, 0, 1) * 8;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
  ctx.restore();

  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,80,60,' + clamp(G.flash, 0, 0.6) + ')';
    ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  }

  drawHud();
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2.2);
    bigText(G.msg, VW / 2, VH * 0.28, 26, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    const key = MODES[G.mode].key;
    drawResult(G.score >= (save.hi[key] || 0), 'おしまい！',
      ['スコア ' + G.score + '　さいこう ' + (save.hi[key] || 0),
       'きった かず ' + save.cut + '　さいこうコンボ ' + save.bestCombo],
      [{ label: 'もういちど', on: () => startRun(G.mode) },
       { label: 'メニュー', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#DCF0E0';
  ctx.fillText('さいこう ' + (save.hi[MODES[G.mode].key] || 0), 130, HUD / 2);
  if (G.mode === 1) ctx.fillText('のこり ' + G.time.toFixed(1) + 'びょう', 240, HUD / 2);
  ctx.textAlign = 'right';
  if (G.mode === 0) {
    ctx.fillText('のこり', VW - 76, HUD / 2);
    for (let i = 0; i < LIVES; i++) {
      ctx.fillStyle = i < G.lives ? '#FF6A8A' : 'rgba(255,255,255,0.2)';
      circle(VW - 58 + i * 18, HUD / 2, 6); ctx.fill();
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (G.combo >= 2) {
    ctx.globalAlpha = clamp(G.comboT * 2, 0, 1);
    bigText(G.combo + ' コンボ', VW / 2, HUD + 22, 20, '#FFE066');
    ctx.globalAlpha = 1;
  }
}

function drawTitle() {
  bgGrad('#1E4034', '#0A1614');
  bigText('りなの', VW / 2, 38, 20, '#FFC0DC');
  bigText('フルーツスライス', VW / 2, 74, fitSize('フルーツスライス', VW * 0.6, 44), '#FFD24A');
  bigText('ゆびで さっと はらって くだものを きる！ ばくだんは きらない', VW / 2, 114, 16, '#DCF0E0', null);
  for (let i = 0; i < FRUITS.length; i++) {
    const x = VW / 2 - (FRUITS.length - 1) * 44 / 2 + i * 44;
    const it = ITEM_BY[FRUITS[i]];
    it.draw(x, 158, 18, it.cols[0]);
  }
  drawBomb(VW / 2 + FRUITS.length * 44 / 2 + 18, 158, 16, G.t);
  const bw = Math.min(240, VW * 0.3);
  for (let i = 0; i < MODES.length; i++) {
    const y = 196 + i * 62;
    drawButton(button(VW / 2 - bw / 2, y, bw, 46, () => startRun(i)), MODES[i].name, '#FFD24A');
    bigText(MODES[i].about + '　さいこう ' + (save.hi[MODES[i].key] || 0),
            VW / 2, y + 54, 13, '#BFD8C8', null);
  }
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, 330, sw, 32, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, 330, sw, 32, () => sfxTest()), '♪ おと', '#8AD8F0');
  bigText('これまでに ' + save.cut + 'こ きった', VW / 2, VH - 16, 14, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#1E4034', '#0A1614');
  bigText('あそびかた', VW / 2, 38, 26, '#FFD24A');
  const lines = [
    '① 画面を ゆびで さっと はらうと、通った ところが きれる',
    '② 1回の はらいで たくさん きると コンボ。てんすうが どんどん ふえる',
    '③ ばくだんを きると そこで おしまい。よけよう',
    '④ エンドレスは くだものを 3こ おとしたら おしまい',
    '⑤ 60びょうモードは おとしても つづく。きりまくろう',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 84 + i * 32, fitSize(s, VW * 0.88, 17), '#EAF6EE', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'all' });
