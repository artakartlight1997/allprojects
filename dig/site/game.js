// リナパパの ほりほり大作戦
//
// ★ むかしの「土を ほって もぐりながら 進む」ゲームが もと。
//   パパが 土を ほって トンネルを つくり、ポンプで てきを ふくらませて ポン！
//   石の 下に てきを おびきよせて つぶすのも あり。
//
// ★ そうさ … 左 スティックで ほる むき、右ボタンで ポンプ。

'use strict';

const GAME_VER = 1;

const COLS = 19, ROWS = 11;
const HUD = 26;

// めん。てきの 数・はやさ・石の 数を かえる。
const STAGES = [
  { name: 'にわの 下', n: 3, sp: 2.5, rock: 2, ghost: 7.0 },
  { name: 'こうえん', n: 3, sp: 2.7, rock: 3, ghost: 6.6 },
  { name: 'すなば',   n: 4, sp: 2.9, rock: 3, ghost: 6.2 },
  { name: 'あなぐら', n: 4, sp: 3.1, rock: 4, ghost: 5.8 },
  { name: 'いわば',   n: 5, sp: 3.2, rock: 4, ghost: 5.4 },
  { name: 'ちかどう', n: 5, sp: 3.4, rock: 5, ghost: 5.0 },
  { name: 'ようがん', n: 6, sp: 3.5, rock: 5, ghost: 4.6 },
  { name: 'ちのそこ', n: 6, sp: 3.7, rock: 6, ghost: 4.2 },
];

const SAVE_KEY = 'dig.save.v1';
const save = { open: 1, clear: [], hi: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = s.open;
  if (Array.isArray(s.clear)) save.clear = s.clear;
  if (typeof s.hi === 'number') save.hi = s.hi;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0, S: STAGES[0],
  earth: [], rocks: [], foes: [], me: null,
  harp: null, lives: 3, score: 0, over: false, win: false, endT: 0, msg: '', msgT: 0,
};

// --- ばんめんの 大きさ -------------------------------------------------------------

function box() {
  const top = HUD + 6, bot = 8;
  const c = Math.floor(Math.min((VH - top - bot) / ROWS, (VW - 24) / COLS));
  return { x: Math.round((VW - c * COLS) / 2), y: top, c: c };
}
function solid(cx, cy) {
  if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return true;
  return G.earth[cy][cx] === 1;
}

// --- はじめる ----------------------------------------------------------------------

function startStage(i) {
  G.stage = i; G.S = STAGES[i];
  G.screen = 'play'; G.over = false; G.win = false; G.endT = 0;
  G.lives = 3; G.score = 0;
  buildStage();
  bgmStart(i);
}

function buildStage() {
  const S = G.S;
  G.earth = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) row.push(y === 0 ? 0 : 1);
    G.earth.push(row);
  }
  // はじめから ある トンネル（よこ 2本 と たて 1本）
  const lanes = [3, 7];
  for (const ly of lanes) for (let x = 2; x < COLS - 2; x++) G.earth[ly][x] = 0;
  for (let y = 0; y <= 3; y++) G.earth[y][Math.floor(COLS / 2)] = 0;

  G.rocks = [];
  const used = {};
  for (let i = 0; i < S.rock; i++) {
    for (let k = 0; k < 40; k++) {
      const x = 2 + Math.floor(Math.random() * (COLS - 4));
      const y = 2 + Math.floor(Math.random() * (ROWS - 4));
      if (used[x + ',' + y] || G.earth[y][x] === 0) continue;
      if (G.earth[y + 1] && G.earth[y + 1][x] === 0) continue;
      used[x + ',' + y] = 1;
      G.rocks.push({ x: x, y: y, fy: y, fall: 0, wob: 0, dead: false });
      break;
    }
  }

  G.foes = [];
  for (let i = 0; i < S.n; i++) {
    const ly = lanes[i % lanes.length];
    const x = 2 + Math.floor((i / S.n) * (COLS - 5)) + 1;
    G.foes.push({ x: x, y: ly, fx: x, fy: ly, dx: 1, dy: 0, kind: i % 2,
                  pump: 0, pumpT: 0, ghost: 0, ghostT: S.ghost, dead: false, t: Math.random() * 6 });
  }
  G.me = { x: Math.floor(COLS / 2), y: 1, fx: Math.floor(COLS / 2), fy: 1,
           dx: 0, dy: 1, want: '', dead: 0, walk: 0 };
  G.harp = null;
  G.msg = ''; G.msgT = 0;
}

// --- うごき ------------------------------------------------------------------------

const DIRV = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };

function moveGrid(o, sp, dt, canDig) {
  // ますの まん中に いる ときだけ むきを かえられる（気もちよさの ため すこし ゆるく）
  const cx = o.x, cy = o.y;
  const atX = Math.abs(o.fx - cx) < 0.02, atY = Math.abs(o.fy - cy) < 0.02;
  if (atX && atY) {
    o.fx = cx; o.fy = cy;
    const d = o.want && DIRV[o.want];
    if (d) {
      const nx = cx + d[0], ny = cy + d[1];
      const ok = nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && (canDig || !solid(nx, ny));
      if (ok) { o.dx = d[0]; o.dy = d[1]; }
    }
    const nx = cx + o.dx, ny = cy + o.dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || (!canDig && solid(nx, ny))) { o.dx = 0; o.dy = 0; }
  }
  if (o.dx === 0 && o.dy === 0) return;
  o.fx += o.dx * sp * dt;
  o.fy += o.dy * sp * dt;
  // つぎの ますに 入ったか
  const tx = cx + o.dx, ty = cy + o.dy;
  if ((o.dx > 0 && o.fx >= tx) || (o.dx < 0 && o.fx <= tx) ||
      (o.dy > 0 && o.fy >= ty) || (o.dy < 0 && o.fy <= ty)) {
    o.x = tx; o.y = ty; o.fx = tx; o.fy = ty;
    if (canDig && G.earth[ty] && G.earth[ty][tx] === 1) { G.earth[ty][tx] = 0; G.score += 5; }
  }
}

function foeStep(f, dt) {
  f.t += dt;
  const S = G.S;
  // ゆく手が ふさがれて いる じかんが 長いと、土の 中を すりぬけ はじめる
  if (f.ghost > 0) {
    f.ghost -= dt;
    const sp = S.sp * 0.42;
    f.fx += (G.me.fx - f.fx) * 0 + Math.sign(G.me.fx - f.fx) * sp * dt;
    f.fy += Math.sign(G.me.fy - f.fy) * sp * dt;
    f.x = Math.round(f.fx); f.y = Math.round(f.fy);
    if (!solid(f.x, f.y)) { f.ghost = 0; f.fx = f.x; f.fy = f.y; f.ghostT = S.ghost; }
    return;
  }
  const at = Math.abs(f.fx - f.x) < 0.02 && Math.abs(f.fy - f.y) < 0.02;
  if (at) {
    // パパに 近づく むきを えらぶ（トンネルの 中だけ）
    const cand = [];
    for (const k in DIRV) {
      const d = DIRV[k];
      const nx = f.x + d[0], ny = f.y + d[1];
      if (solid(nx, ny)) continue;
      const back = (d[0] === -f.dx && d[1] === -f.dy);
      const dist = Math.abs(nx - G.me.x) + Math.abs(ny - G.me.y);
      cand.push({ d: d, dist: dist, back: back });
    }
    if (cand.length === 0) {
      f.ghostT -= dt * 8;
    } else {
      const fwd = cand.filter((c) => !c.back);
      const pick = (fwd.length ? fwd : cand).sort((a, b) => a.dist - b.dist)[0];
      f.dx = pick.d[0]; f.dy = pick.d[1];
      f.ghostT = S.ghost;
    }
  }
  f.ghostT -= dt;
  if (f.ghostT <= 0) { f.ghost = 2.6; f.ghostT = S.ghost; return; }
  const sp = S.sp * (0.42 + Math.min(0.5, G.t * 0.004));
  f.fx += f.dx * sp * dt; f.fy += f.dy * sp * dt;
  const tx = f.x + f.dx, ty = f.y + f.dy;
  if ((f.dx > 0 && f.fx >= tx) || (f.dx < 0 && f.fx <= tx) ||
      (f.dy > 0 && f.fy >= ty) || (f.dy < 0 && f.fy <= ty)) { f.x = tx; f.y = ty; f.fx = tx; f.fy = ty; }
}

function fireHarpoon() {
  if (G.harp || G.me.dead > 0) return;
  const d = [G.me.dx, G.me.dy];
  if (d[0] === 0 && d[1] === 0) { d[0] = 1; }
  G.harp = { x: G.me.fx, y: G.me.fy, dx: d[0], dy: d[1], len: 0, hit: null, t: 0 };
  sfxShot();
}

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play') return;

  if (G.over) {
    G.endT += dt;
    if (G.endT > 1.2 && (IN.taps.length || IN.fireTap)) { /* まくを 出す */ }
    return;
  }

  // そうさ
  G.me.want = IN.dir || keyDir() || '';
  if (IN.fireTap) fireHarpoon();

  if (G.me.dead > 0) {
    G.me.dead -= dt;
    if (G.me.dead <= 0) {
      G.lives--;
      if (G.lives <= 0) { endGame(false); return; }
      G.me.x = Math.floor(COLS / 2); G.me.y = 1;
      G.me.fx = G.me.x; G.me.fy = G.me.y; G.me.dx = 0; G.me.dy = 0;
      for (const f of G.foes) if (!f.dead) { f.pump = 0; f.pumpT = 0; f.ghost = 0; }
    }
    return;
  }

  moveGrid(G.me, 3.6, dt, true);
  if (G.me.dx || G.me.dy) G.me.walk += dt;

  // ポンプの ヤリ
  if (G.harp) {
    const h = G.harp;
    h.t += dt;
    if (!h.hit) {
      h.len += 9 * dt;
      const tx = Math.round(h.x + h.dx * h.len), ty = Math.round(h.y + h.dy * h.len);
      if (h.len > 2.6 || solid(tx, ty)) G.harp = null;
      else {
        for (const f of G.foes) {
          if (f.dead) continue;
          if (Math.abs(f.fx - (h.x + h.dx * h.len)) < 0.55 &&
              Math.abs(f.fy - (h.y + h.dy * h.len)) < 0.55) {
            h.hit = f; f.pump = Math.min(4, f.pump + 1); f.pumpT = 1.4;
            sfxPop();
            if (f.pump >= 4) { f.dead = true; G.score += 300 + G.stage * 50; say('ポンッ！'); }
            break;
          }
        }
      }
    } else if (h.t > 0.35) G.harp = null;
  }

  // てき
  let alive = 0;
  for (const f of G.foes) {
    if (f.dead) continue;
    alive++;
    if (f.pumpT > 0) {
      f.pumpT -= dt;
      if (f.pumpT <= 0) f.pump = Math.max(0, f.pump - 1);
    } else foeStep(f, dt);
    if (Math.abs(f.fx - G.me.fx) < 0.7 && Math.abs(f.fy - G.me.fy) < 0.7 && f.pump === 0) {
      G.me.dead = 1.2; sfxDead();
    }
  }

  // 石
  for (const r of G.rocks) {
    if (r.dead) continue;
    if (r.fall === 0) {
      const below = r.y + 1;
      if (below < ROWS && G.earth[below][r.x] === 0) { r.wob += dt; if (r.wob > 0.55) r.fall = 1; }
      else r.wob = 0;
    } else {
      r.fy += 7 * dt;
      const ny = Math.floor(r.fy + 0.5);
      if (ny !== r.y) { r.y = ny; G.earth[Math.min(ROWS - 1, ny)][r.x] = 0; }
      for (const f of G.foes) {
        if (!f.dead && f.x === r.x && Math.abs(f.fy - r.fy) < 0.7) {
          f.dead = true; G.score += 500; say('つぶした！'); sfxHit();
        }
      }
      if (G.me.x === r.x && Math.abs(G.me.fy - r.fy) < 0.7 && G.me.dead <= 0) { G.me.dead = 1.2; sfxDead(); }
      if (r.y >= ROWS - 1 || (r.y + 1 < ROWS && G.earth[r.y + 1][r.x] === 1)) {
        r.dead = true; sfxHit();
      }
    }
  }

  if (alive === 0 && !G.over) endGame(true);
}

function say(s) { G.msg = s; G.msgT = 1.4; }

function endGame(win) {
  G.over = true; G.win = win; G.endT = 0;
  bgmStop();
  if (win) {
    G.score += G.lives * 200;
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    sfxClear(G.lives === 3);
  } else sfxOver();
  if (G.score > save.hi) save.hi = G.score;
  storeSave();
}

// --- 絵 ---------------------------------------------------------------------------

const LAYER = ['#8A5A32', '#7A4E2A', '#6A4224', '#5A381E'];

function drawPlay() {
  const B = box();
  bgGrad('#4A3A26', '#241A12');
  // 空
  ctx.fillStyle = '#7ACBE8';
  ctx.fillRect(B.x, B.y, B.c * COLS, B.c);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = B.x + x * B.c, py = B.y + y * B.c;
      if (G.earth[y][x] === 1) {
        ctx.fillStyle = LAYER[Math.min(LAYER.length - 1, Math.floor(y / 3))];
        ctx.fillRect(px, py, B.c, B.c);
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.fillRect(px, py, B.c, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(px + 2, py + 4, Math.max(2, B.c * 0.16), Math.max(2, B.c * 0.12));
      } else if (y > 0) {
        ctx.fillStyle = '#2A1C12';
        ctx.fillRect(px, py, B.c, B.c);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
  ctx.strokeRect(B.x - 1.5, B.y - 1.5, B.c * COLS + 3, B.c * ROWS + 3);

  // 石
  for (const r of G.rocks) {
    if (r.dead) continue;
    const px = B.x + (r.x + 0.5) * B.c;
    const py = B.y + (r.fy + 0.5) * B.c + (r.fall === 0 ? Math.sin(r.wob * 30) * B.c * 0.06 : 0);
    ctx.fillStyle = '#9AA0AA';
    circle(px, py, B.c * 0.44); ctx.fill();
    ctx.fillStyle = '#7A8090';
    circle(px + B.c * 0.10, py + B.c * 0.10, B.c * 0.30); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    circle(px - B.c * 0.14, py - B.c * 0.16, B.c * 0.12); ctx.fill();
  }

  // ヤリ
  if (G.harp) {
    const h = G.harp;
    const x0 = B.x + (h.x + 0.5) * B.c, y0 = B.y + (h.y + 0.5) * B.c;
    const x1 = x0 + h.dx * h.len * B.c, y1 = y0 + h.dy * h.len * B.c;
    ctx.strokeStyle = '#F0E8D0'; ctx.lineWidth = Math.max(2, B.c * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = '#FF7A9A';
    circle(x1, y1, B.c * 0.16); ctx.fill();
  }

  // てき
  for (const f of G.foes) {
    if (f.dead) continue;
    const px = B.x + (f.fx + 0.5) * B.c, py = B.y + (f.fy + 0.5) * B.c;
    const s = B.c * (0.36 + f.pump * 0.10);
    ctx.save();
    if (f.ghost > 0) ctx.globalAlpha = 0.55;
    drawBlob(px, py - s * 0.1, s, f.kind ? '#FF8A5A' : '#7ADCB0',
             { t: f.t, look: Math.sign(G.me.fx - f.fx) });
    ctx.restore();
    if (f.pump > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < f.pump; i++) circle(px - s * 0.6 + i * s * 0.4, py - s * 1.35, s * 0.12), ctx.fill();
    }
  }

  // パパ
  if (G.me.dead <= 0 || Math.floor(G.t * 12) % 2 === 0) {
    const px = B.x + (G.me.fx + 0.5) * B.c, py = B.y + (G.me.fy + 0.5) * B.c;
    drawPapa(px, py + B.c * 0.16, B.c * 0.50,
             { dir: G.me.dx >= 0 ? 1 : -1, walk: G.me.walk, shirt: '#E8B040',
               face: G.me.dead > 0 ? 'oops' : 'happy' });
  }

  drawHud();
  drawStick();
  drawFire('ポンプ', '#FF9AC0');

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    bigText(G.msg, VW / 2, VH * 0.30, 30, '#FFD24A');
    ctx.globalAlpha = 1;
  }
  if (G.over) {
    drawResult(G.win, G.win ? 'クリア！' : 'ゲームオーバー',
      ['スコア ' + G.score, G.win ? 'のこり ' + G.lives + '人' : 'つぎは がんばろう'],
      resultButtons());
  }
}

function resultButtons() {
  const btns = [];
  const nx = G.stage + 1;
  if (G.win && nx < STAGES.length) btns.push({ label: 'つぎの めん', on: () => startStage(nx) });
  btns.push({ label: 'もういちど', on: () => startStage(G.stage), col: '#8AD8F0' });
  btns.push({ label: 'めんを えらぶ', on: () => { G.screen = 'title'; }, col: '#C8BCE8' });
  return btns;
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A'; ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.fillStyle = '#C8BCE8'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ハイ ' + Math.max(save.hi, G.score), 132, HUD / 2);
  ctx.fillText(G.S.name, 232, HUD / 2);
  let left = 0;
  for (const f of G.foes) if (!f.dead) left++;
  ctx.fillText('のこり ' + left + 'ひき', 340, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('パパ ' + G.lives, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- タイトル ----------------------------------------------------------------------

function drawTitle() {
  bgGrad('#6A4A2A', '#2A1A10');
  bigText('リナパパの', VW / 2, 46, 24, '#FFE0A0');
  bigText('ほりほり大作戦', VW / 2, 84, fitSize('ほりほり大作戦', VW * 0.62, 48), '#FFD24A');
  bigText('土を ほって てきを ポンプで ポンッ！', VW / 2, 122, 16, '#F0E0C8', null);

  drawPapa(VW * 0.12, 150, 30, { dir: 1, walk: G.t, shirt: '#E8B040' });
  drawBlob(VW * 0.88, 140, 22, '#7ADCB0', { t: G.t, look: -1 });

  const names = STAGES.map((s) => s.name);
  const y = stagePicker(STAGES.length, save.open, save.clear, names, 168,
                        (i) => startStage(i), '#FFD24A');

  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#8AD8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 36, () => sfxTest()), '♪ おと', '#C8BCE8');
  bigText('ハイスコア ' + save.hi, VW / 2, VH - 20, 15, '#FFD24A', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  bgGrad('#3A2A1A', '#1A120C');
  bigText('あそびかた', VW / 2, 42, 28, '#FFD24A');
  const lines = [
    '① 左がわを さわると スティックが 出る。その むきに 土を ほって 進む',
    '② 右がわを おすと ポンプ。てきに 当てると ふくらむ',
    '③ 4回 当てると ポンッ！ ぜんぶ たおすと クリア',
    '④ 石の 下の 土を ほると 石が 落ちる。てきを つぶすと 大きな てんすう',
    '⑤ 長いあいだ 進めない てきは 土の 中を すりぬけて くる。ちゅうい！',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 96 + i * 34, fitSize(s, VW * 0.86, 17), '#F0EAFF', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 66, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
