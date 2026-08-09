// 画面・そうさ・メインループ。
//
// ヘビは マスごとに 四角を ならべて 描く。あたまだけ 目と ほっぺを つける。
// 体は 1マスおきに 色を 変えて、しましまに 見せる（むかしの ゲームらしく）。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = H / VH;
  VW = W / SC;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 14; i++) {
    ctx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 6) break;
    fs = Math.max(6, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
  ui.buttons.push(b); return b;
}

function drawButton(b, label, col, textCol) {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
  ctx.fillStyle = col || PAL.w;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x, b.y, b.w, 2);
  ctx.fillStyle = textCol || PAL.k;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w * 0.88, b.h * 0.46, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

function boardBox() {
  const top = 34, bot = 62;
  const c = Math.max(8, Math.floor(Math.min((VH - top - bot) / BH, (VW - 24) / BW)));
  return { x: Math.round((VW - c * BW) / 2), y: top, c: c };
}

// --- 絵 -------------------------------------------------------------------------

function drawHead(px, py, c, dx, dy) {
  ctx.fillStyle = '#8AF08A';
  ctx.fillRect(px, py, c, c);
  ctx.fillStyle = PAL.dg;
  ctx.fillRect(px, py, c, 1); ctx.fillRect(px, py, 1, c);
  // 目（進む むきに よせる）
  const q = Math.max(2, Math.floor(c * 0.16));
  const ox = dx * c * 0.18, oy = dy * c * 0.18;
  ctx.fillStyle = PAL.k;
  ctx.fillRect(Math.round(px + c * 0.26 + ox), Math.round(py + c * 0.26 + oy), q, q);
  ctx.fillRect(Math.round(px + c * 0.62 + ox), Math.round(py + c * 0.26 + oy), q, q);
  // ほっぺ
  ctx.fillStyle = 'rgba(240,72,72,0.5)';
  ctx.fillRect(Math.round(px + c * 0.14), Math.round(py + c * 0.56), q, q);
  ctx.fillRect(Math.round(px + c * 0.72), Math.round(py + c * 0.56), q, q);
}

function drawFoodCell(f, px, py, c, t) {
  const F = FOODS[f.k];
  // のこり 2びょうを 切ったら 点めつ
  if (F.life > 0 && f.t < 2 && ((t * 8) | 0) % 2 === 0) return;
  const m = Math.max(1, Math.floor(c * 0.12));
  ctx.fillStyle = F.col;
  ctx.fillRect(px + m, py + m, c - m * 2, c - m * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(px + m * 2, py + m * 2, Math.max(1, (c - m * 4) / 3), Math.max(1, (c - m * 4) / 3));
  if (f.k === 'apple') {          // へた
    ctx.fillStyle = PAL.dg;
    ctx.fillRect(Math.round(px + c * 0.46), py, Math.max(1, m), Math.max(1, m * 1.6));
  }
}

// --- あそんでいる 画面 -----------------------------------------------------------

function drawPlay() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  const B = boardBox();

  // ばん（ますめ）
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const px = B.x + x * B.c, py = B.y + y * B.c;
      if (G.wall[y][x]) {
        // ★ かべは ヘビと まぎらわしく ない 色（れんが）に する
        ctx.fillStyle = '#8A5A28';
        ctx.fillRect(px, py, B.c, B.c);
        ctx.fillStyle = '#6A4218';
        ctx.fillRect(px, py + B.c / 2, B.c, 1);
        ctx.fillRect(px + B.c / 2, py, 1, B.c / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px, py, B.c, 1); ctx.fillRect(px, py, 1, B.c);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#0E2010' : '#0A1A0C';
        ctx.fillRect(px, py, B.c, B.c);
      }
    }
  }
  // まわりの わく
  ctx.fillStyle = '#8A5A28';
  ctx.fillRect(B.x - 4, B.y - 4, B.c * BW + 8, 4);
  ctx.fillRect(B.x - 4, B.y + B.c * BH, B.c * BW + 8, 4);
  ctx.fillRect(B.x - 4, B.y - 4, 4, B.c * BH + 8);
  ctx.fillRect(B.x + B.c * BW, B.y - 4, 4, B.c * BH + 8);

  // えさ
  for (const f of G.foods) drawFoodCell(f, B.x + f.x * B.c, B.y + f.y * B.c, B.c, G.t);

  // ヘビ
  for (let i = G.body.length - 1; i >= 0; i--) {
    const s = G.body[i];
    const px = B.x + s.x * B.c, py = B.y + s.y * B.c;
    if (i === 0) { drawHead(px, py, B.c, G.dx, G.dy); continue; }
    const m = Math.max(1, Math.floor(B.c * 0.08));
    ctx.fillStyle = i % 2 === 0 ? PAL.g : PAL.dg;
    ctx.fillRect(px + m, py + m, B.c - m * 2, B.c - m * 2);
  }

  // 食べた てんすう
  for (const p of G.pop) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
    drawNum(p.pt, B.x + (p.x + 0.5) * B.c, B.y + p.y * B.c - p.t * 16,
            Math.max(1, B.c / 9), PAL.y, 'center');
    ctx.globalAlpha = 1;
  }

  drawHud();
  drawPad();

  if (G.ready > 0) retroText('READY！', VW / 2, VH * 0.44, 28, PAL.y, PAL.dk, 'center');

  if (G.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(0, 0, VW, VH);
    retroText(G.win ? 'クリア！' : 'ゲームオーバー', VW / 2, VH * 0.26,
              34, G.win ? PAL.y : PAL.r, PAL.dk, 'center');
    retroText('たべた かず', VW / 2, VH * 0.40, 14, PAL.w, PAL.dk, 'center');
    drawNum(G.ate + '/' + G.S.need, VW / 2, VH * 0.45, 4, PAL.g, 'center');
    retroText('スコア', VW / 2, VH * 0.55, 14, PAL.w, PAL.dk, 'center');
    drawNum(G.score, VW / 2, VH * 0.60, 4, PAL.y, 'center');
    const bw = Math.min(170, VW * 0.24);
    const nx = G.stage + 1;
    if (G.win && nx < STAGES.length) {
      drawButton(button(VW / 2 - bw - 88, VH * 0.78, bw, 40, () => startStage(nx)), 'つぎの めん', PAL.y);
    }
    drawButton(button(VW / 2 - bw / 2, VH * 0.78, bw, 40, () => startStage(G.stage)), 'もういちど', PAL.c);
    drawButton(button(VW / 2 + 88, VH * 0.78, bw, 40, () => { bgmStop(); G.screen = 'title'; }),
               'めんを えらぶ', PAL.w);
  }
  crt();
}

function drawHud() {
  ctx.fillStyle = PAL.dk;
  ctx.fillRect(0, 0, VW, 30);
  retroText('スコア', 10, 8, 13, PAL.gy, null);
  drawNum(G.score, 62, 9, 3, PAL.w, 'left');
  retroText('ハイスコア', VW * 0.30, 8, 13, PAL.gy, null);
  drawNum(Math.max(save.hi, G.score), VW * 0.30 + 74, 9, 3, PAL.y, 'left');
  retroText('たべた', VW - 126, 8, 13, PAL.gy, null);
  drawNum(G.ate + '/' + G.S.need, VW - 82, 9, 3, PAL.g, 'left');

  retroText(G.S.name, 14, VH - 28, 14, PAL.c, null);
  retroText('ながさ', 90, VH - 28, 13, PAL.gy, null);
  drawNum(G.body.length, 134, VH - 27, 3, PAL.g, 'left');
  if (G.slow > 0) retroText('ゆっくり中', 180, VH - 28, 13, PAL.c, null);

  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    retroText(G.msg, VW / 2, VH - 52, 14, PAL.y, PAL.dk, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawPad() {
  const c = Math.min(28, VW * 0.045);
  const px = VW - c * 3.4, py = VH - c * 3.4;
  const set = [[0, -1, 1, 0, '↑'], [-1, 0, 0, 1, '←'], [1, 0, 2, 1, '→'], [0, 1, 1, 2, '↓']];
  for (const [dx, dy, gx, gy, label] of set) {
    const b = button(px + gx * c, py + gy * c, c - 2, c - 2, () => turn(dx, dy));
    const on = G.wx === dx && G.wy === dy;
    ctx.fillStyle = on ? PAL.g : 'rgba(248,248,248,0.22)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = on ? PAL.k : PAL.w;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(c * 0.5) + 'px system-ui, sans-serif';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
}

// --- タイトル --------------------------------------------------------------------

function drawTitle() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  // うしろで ヘビが うねうね
  const c = 14;
  for (let i = 0; i < 22; i++) {
    const x = ((G.t * 60 + i * -c) % (VW + 300)) - 150;
    const y = VH - 108 + Math.sin((G.t * 2) - i * 0.4) * 22;
    ctx.fillStyle = i === 0 ? '#8AF08A' : (i % 2 ? PAL.g : PAL.dg);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(Math.round(x), Math.round(y), c - 2, c - 2);
    ctx.globalAlpha = 1;
  }

  retroText('あおいの', 24, 16, 22, PAL.c, PAL.dk);
  retroText('にょろにょろ', 24, 42, 40, PAL.g, PAL.dk);
  retroText('えさを 食べて 体を のばそう！', 26, 130, 15, PAL.w, null);

  const cols = VW > 700 ? 5 : 4;
  const cw = Math.min(120, (VW - 48 - (cols - 1) * 8) / cols), ch = 46;
  const y = 158;
  for (let i = 0; i < STAGES.length; i++) {
    const x = 24 + (i % cols) * (cw + 8), yy = y + Math.floor(i / cols) * (ch + 8);
    const open = i < save.open;
    const b = button(x, yy, cw, ch, open ? () => startStage(i) : null);
    ctx.fillStyle = PAL.dk;
    ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
    ctx.fillStyle = open ? (save.clear[i] ? PAL.g : PAL.dg) : '#111A12';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = open ? PAL.w : PAL.gy;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(open ? STAGES[i].name : '？？', cw - 10, 15, 'bold ');
    ctx.fillText(open ? STAGES[i].name : '？？', b.x + cw / 2, b.y + 16);
    if (open) {
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = PAL.c;
      ctx.fillText(STAGES[i].need + ' こ たべる', b.x + cw / 2, b.y + 33);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  retroText('ハイスコア', 24, VH - 54, 13, PAL.gy, null);
  drawNum(save.hi, 100, VH - 55, 3, PAL.y, 'left');
  drawButton(button(VW - 232, VH - 42, 108, 30, () => { G.screen = 'howto'; }), 'あそびかた', PAL.c);
  drawButton(button(VW - 116, VH - 42, 100, 30, () => { sfxTest(); }), '♪ おと', PAL.w);
  retroText('v' + GAME_VER, 24, VH - 22, 12, PAL.gy, null);
  crt();
}

function drawHowto() {
  ctx.fillStyle = PAL.k;
  ctx.fillRect(0, 0, VW, VH);
  retroText('あそびかた', 24, 14, 26, PAL.g, PAL.dk);
  const lines = [
    '① 十字ボタン（パソコンは 矢印キー）で 向きを かえる',
    '② えさを 食べると 体が のびて てんすうが 入る',
    '③ きめられた 数だけ 食べたら クリア',
  ].concat(TIPS);
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.68, 15);
    ctx.fillStyle = PAL.w;
    ctx.fillText(s, 24, 56 + i * 26);
  });
  const keys = ['apple', 'gold', 'ice', 'short'];
  for (let i = 0; i < keys.length; i++) {
    const f = { k: keys[i], t: 99 };
    drawFoodCell(f, VW - 96, 86 + i * 54, 30, 0);
    ctx.fillStyle = PAL.w;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(FOODS[keys[i]].name, VW - 58, 96 + i * 54);
  }
  drawButton(button(VW - 250, 12, 100, 30, () => { G.screen = 'title'; }), 'もどる', PAL.y);
  crt();
}

// --- そうさ ----------------------------------------------------------------------

let tsx = 0, tsy = 0, tsOn = false;

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  tsx = t.clientX - r.left; tsy = t.clientY - r.top; tsOn = true;
  tapAt(tsx, tsy);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!tsOn) return;
  tsOn = false;
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  const dx = (t.clientX - r.left) - tsx, dy = (t.clientY - r.top) - tsy;
  if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  }
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('keydown', (e) => {
  audioStart();
  if (e.code === 'ArrowLeft') { e.preventDefault(); turn(-1, 0); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); turn(1, 0); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); turn(0, -1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); turn(0, 1); }
});

// --- メインループ ----------------------------------------------------------------

let last = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);

  update(dt);

  ui.buttons = [];
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();

  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
