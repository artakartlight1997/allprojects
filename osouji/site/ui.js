// 画面と入力とメインループ。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const ui = { buttons: [], drag: null, room: null, area: null };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ui.room = null;   // 大きさが変わったら 部屋の絵を作り直す
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// --- 部品 -----------------------------------------------------------------

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 14; i++) {
    ctx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 9) break;
    fs = Math.max(9, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on, tag) {
  const b = { x, y, w, h, on, tag };
  ui.buttons.push(b);
  return b;
}

function drawButton(b, label, col, textCol, sub) {
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#22304A';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(34,48,74,0.7)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.75);
  }
}

function hit(px, py) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

// 部屋の絵は毎フレーム描くと重いので、一度描いて使いまわす
function roomCanvas(w, h, room) {
  if (ui.room && ui.room.w === w && ui.room.h === h && ui.room.room === room) {
    return ui.room.cv;
  }
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(w));
  cv.height = Math.max(2, Math.round(h));
  room.draw(cv.getContext('2d'), cv.width, cv.height);
  ui.room = { cv, w, h, room };
  return cv;
}

// --- タイトル -------------------------------------------------------------

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2F6E8C'); g.addColorStop(1, '#8FD3E8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // うしろに 半分そうじした部屋を見せる
  const dw = W * 0.36, dh = dw * (DIRT_H / DIRT_W);
  const dx = W - dw - H * 0.05, dy = (H - dh) / 2;
  ctx.save();
  rr(ctx, dx, dy, dw, dh, H * 0.03); ctx.clip();
  ctx.drawImage(roomCanvas(dw, dh, ROOMS[Math.floor(game.t / 3) % ROOMS.length]), dx, dy);
  ctx.fillStyle = 'rgba(150,140,120,0.55)';
  ctx.fillRect(dx + dw * 0.5, dy, dw * 0.5, dh);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
  rr(ctx, dx, dy, dw, dh, H * 0.03); ctx.stroke();

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('りなのおそうじ大作戦', W * 0.55, H * 0.125, 'bold ');
  ctx.fillText('りなのおそうじ大作戦', H * 0.06, H * 0.06);
  ctx.fillStyle = '#DDF3FA';
  fitFont('こすって きれいに。道具を強くして もっと速く！', W * 0.55, H * 0.042);
  ctx.fillText('こすって きれいに。道具を強くして もっと速く！', H * 0.07, H * 0.21);

  ctx.fillStyle = '#FFF3C4';
  fitFont('コイン ' + save.coins.toLocaleString() + '　さいこう ' +
          save.best.toLocaleString() + '点　ピカピカ ' + save.perfect + 'へや',
          W * 0.55, H * 0.038);
  ctx.fillText('コイン ' + save.coins.toLocaleString() + '　さいこう ' +
               save.best.toLocaleString() + '点　ピカピカ ' + save.perfect + 'へや',
               H * 0.07, H * 0.28);

  const bw = H * 0.62, bh = H * 0.14;
  drawButton(button(H * 0.06, H * 0.38, bw, bh, () => {
    enterFullscreen(); startRound();
  }), 'そうじを はじめる', '#FFD166');
  drawButton(button(H * 0.06, H * 0.56, bw * 0.48, bh * 0.8,
                    () => { game.screen = 'shopFree'; }), 'どうぐ', '#CFEAF4');
  drawButton(button(H * 0.06 + bw * 0.52, H * 0.56, bw * 0.48, bh * 0.8,
                    () => { game.screen = 'howto'; }), 'あそびかた', '#D8E4F2');

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  fitFont(ROUND_ROOMS + 'へや つづけて そうじ。道具は ずっと のこる', W * 0.55, H * 0.032);
  ctx.fillText(ROUND_ROOMS + 'へや つづけて そうじ。道具は ずっと のこる', H * 0.06, H * 0.78);
}

function drawHowto() {
  ctx.fillStyle = '#F2F7FA'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#22506A';
  ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① 画面を ゆびで こすると よごれが おちる',
    '② よごれは 3しゅるい。うすい ほこり → こい あぶら → 黒い こびりつき の順に かたい',
    '③ よごれの下に おとしものが かくれている。ほると コインになる',
    '④ 100% ピカピカにすると ボーナス。のこり時間も 点になる',
    '⑤ 部屋のあいだの おみせで 道具を強くできる。道具は ずっと のこる',
    '　 ロボットを 買うと かってに そうじしてくれる',
  ];
  ctx.fillStyle = '#3A5A6E';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, H * 0.044);
    ctx.fillText(s, H * 0.05, H * 0.19 + i * H * 0.088);
  });
  const bh = H * 0.11;
  drawButton(button(H * 0.05, H - bh - H * 0.05, H * 0.4, bh,
                    () => { game.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- そうじ ---------------------------------------------------------------

function roomBox() {
  const top = H * 0.11;
  const availH = H - top - H * 0.03;
  const availW = W - H * 0.06;
  let w = availW, h = w * (DIRT_H / DIRT_W);
  if (h > availH) { h = availH; w = h * (DIRT_W / DIRT_H); }
  return { x: (W - w) / 2, y: top + (availH - h) / 2, w, h };
}

function drawClean() {
  ctx.fillStyle = '#1E2C36'; ctx.fillRect(0, 0, W, H);
  const b = roomBox();
  ui.area = b;

  ctx.save();
  rr(ctx, b.x, b.y, b.w, b.h, H * 0.02); ctx.clip();
  ctx.drawImage(roomCanvas(b.w, b.h, game.room), b.x, b.y);
  for (const f of game.finds) {
    if (!f.found) continue;
    const fx = b.x + f.x * b.w, fy = b.y + f.y * b.h - Math.min(f.t, 1) * H * 0.04;
    ctx.globalAlpha = Math.max(0, 1 - (f.t - 1.2) / 0.6);
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(fx, fy, H * 0.022, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const kind of ['grease', 'stuck', 'dust']) {
    ctx.drawImage(game.dirt[kind].cv, b.x, b.y, b.w, b.h);
  }
  // ロボット
  for (const r of game.robots) {
    const rx = b.x + r.x * b.w, ry = b.y + r.y * b.h;
    const rad = H * 0.028;
    ctx.fillStyle = '#5A6B7A';
    ctx.beginPath(); ctx.arc(rx, ry, rad, 0, 7); ctx.fill();
    ctx.fillStyle = '#8FD0E8';
    ctx.beginPath(); ctx.arc(rx, ry, rad * 0.55, 0, 7); ctx.fill();
    ctx.fillStyle = '#2B3A46';
    ctx.beginPath(); ctx.arc(rx - rad * 0.25, ry - rad * 0.1, rad * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(rx + rad * 0.25, ry - rad * 0.1, rad * 0.12, 0, 7); ctx.fill();
  }
  // こすっている ふきだし
  if (game.scrubT > 0 && ui.drag) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ui.drag.sx, ui.drag.sy, brushR() / DIRT_W * b.w, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  rr(ctx, b.x, b.y, b.w, b.h, H * 0.02); ctx.stroke();

  for (const p of game.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.6);
    ctx.fillStyle = p.col;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * 0.04) + 'px system-ui, sans-serif';
    ctx.fillText(p.text, b.x + p.x * b.w,
                 b.y + (p.y - (p.lift || 0)) * b.h - p.t * H * 0.06);
    ctx.globalAlpha = 1;
  }

  // HUD
  ctx.fillStyle = 'rgba(10,18,26,0.75)';
  ctx.fillRect(0, 0, W, H * 0.1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
  ctx.fillText(game.room.icon + ' ' + game.room.name +
               '（' + (game.round + 1) + '/' + ROUND_ROOMS + '）', H * 0.03, H * 0.05);
  ctx.font = Math.round(H * 0.04) + 'px system-ui, sans-serif';
  ctx.fillText('のこり ' + Math.max(0, Math.ceil(game.timeLeft)) + 'びょう', W * 0.36, H * 0.05);

  // きれい度バー
  const gw = W * 0.28, gx = W - gw - H * 0.03;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, gx, H * 0.032, gw, H * 0.036, H * 0.018); ctx.fill();
  ctx.fillStyle = game.clean > 0.9 ? '#8FE0A8' : game.clean > 0.5 ? '#FFD166' : '#FF9C7A';
  rr(ctx, gx, H * 0.032, Math.max(3, gw * game.clean), H * 0.036, H * 0.018); ctx.fill();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.fillText('きれい度', gx - H * 0.015, H * 0.05);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#22303A';        // バーの上なので 濃い色にする
  ctx.font = 'bold ' + Math.round(H * 0.028) + 'px system-ui, sans-serif';
  ctx.fillText(Math.round(game.clean * 100) + '%', gx + gw / 2, H * 0.0505);
  ctx.textAlign = 'left';
}

// --- けっか ---------------------------------------------------------------

function drawResult() {
  drawClean();
  ctx.fillStyle = 'rgba(8,16,26,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = game.perfect ? '#A8F0C4' : '#FFE9A8';
  const title = game.perfect ? 'ピカピカ！' : 'おそうじ おわり';
  fitFont(title, W * 0.8, H * 0.11, 'bold ');
  ctx.fillText(title, W / 2, H * 0.1);

  const lines = [
    'きれい度 ' + Math.round(game.clean * 100) + '%',
    'おそうじ代 ' + game.earned.toLocaleString() + ' コイン',
    'おとしもの ' + game.foundCoins.toLocaleString() + ' コイン',
    'この へや ' + game.roundScore.toLocaleString() + ' 点',
  ];
  ctx.fillStyle = '#E8F0F6';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.7, H * 0.05);
    ctx.fillText(s, W / 2, H * 0.26 + i * H * 0.072);
  });

  const got = game.finds.filter((f) => f.found).map((f) => f.name);
  ctx.fillStyle = '#FFD166';
  const gotText = got.length ? '見つけた: ' + got.join('・') : 'おとしもの なし';
  fitFont(gotText, W * 0.86, H * 0.036);
  ctx.fillText(gotText, W / 2, H * 0.58);

  const bw = W * 0.36, bh = H * 0.13;
  drawButton(button(W / 2 - bw / 2, H * 0.7, bw, bh, afterResult),
             game.round + 1 >= ROUND_ROOMS ? 'けっかを みる' : 'おみせへ →', '#FFD166');
}

// --- おみせ ---------------------------------------------------------------

function drawShop(free) {
  ctx.fillStyle = '#F2F7FA'; ctx.fillRect(0, 0, W, H);
  const pad = H * 0.03;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#22506A';
  ctx.font = 'bold ' + Math.round(H * 0.06) + 'px system-ui, sans-serif';
  ctx.fillText('どうぐの おみせ', pad, pad);
  ctx.fillStyle = '#E09A2B';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('コイン ' + save.coins.toLocaleString(), W - pad, pad);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#5F8095';
  ctx.font = Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.fillText('買った どうぐは ずっと のこる', pad, pad + H * 0.07);

  const top = pad + H * 0.13;
  const bh = H * 0.16, gap = H * 0.022;
  const colW = (W - pad * 2 - gap) / 2;
  UPGRADES.forEach((u, i) => {
    const x = pad + (i % 2) * (colW + gap);
    const y = top + ((i / 2) | 0) * (bh + gap);
    const lv = lvOf(u.key);
    const maxed = lv >= u.max;
    const cost = maxed ? 0 : u.cost(lv);
    const can = !maxed && save.coins >= cost;
    ctx.fillStyle = maxed ? '#DDE8EE' : can ? '#FFFFFF' : '#EDF1F4';
    rr(ctx, x, y, colW, bh, H * 0.022); ctx.fill();
    ctx.strokeStyle = can ? '#7FC8A0' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = can ? 3 : 1.5; ctx.stroke();

    ctx.fillStyle = '#22506A';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold ' + Math.round(bh * 0.32) + 'px system-ui, sans-serif';
    ctx.fillText(u.icon + ' ' + u.name, x + colW * 0.04, y + bh * 0.1);
    // レベルの玉
    for (let k = 0; k < u.max; k++) {
      ctx.fillStyle = k < lv ? '#7FC8A0' : '#D6DEE4';
      ctx.beginPath();
      ctx.arc(x + colW * 0.42 + k * bh * 0.19, y + bh * 0.24, bh * 0.06, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#5F8095';
    ctx.font = Math.round(bh * 0.23) + 'px system-ui, sans-serif';
    fitFont(u.desc(lv), colW * 0.92, bh * 0.23);
    ctx.fillText(u.desc(lv), x + colW * 0.04, y + bh * 0.58);

    ctx.textAlign = 'right';
    ctx.fillStyle = maxed ? '#7F9AAA' : can ? '#E09A2B' : '#AFBCC4';
    ctx.font = 'bold ' + Math.round(bh * 0.3) + 'px system-ui, sans-serif';
    ctx.fillText(maxed ? 'MAX' : cost.toLocaleString(), x + colW * 0.96, y + bh * 0.12);
    ctx.textAlign = 'left';

    if (!maxed) ui.buttons.push({ x, y, w: colW, h: bh, tag: 'buy', key: u.key });
  });

  const gbH = H * 0.12;
  drawButton(button(W / 2 - W * 0.18, H - gbH - pad, W * 0.36, gbH, () => {
    if (free) game.screen = 'title'; else loadRoom();
  }), free ? 'もどる' : 'つぎの へやへ →', '#FFD166');
}

// --- おわり ---------------------------------------------------------------

function drawEnd() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2F6E8C'); g.addColorStop(1, '#E8B45C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('おそうじ かんりょう！', W * 0.8, H * 0.12, 'bold ');
  ctx.fillText('おそうじ かんりょう！', W / 2, H * 0.1);
  const lines = [
    ROUND_ROOMS + 'へや ぶんの ごうけい ' + game.totalScore.toLocaleString() + ' 点',
    'さいこう ' + save.best.toLocaleString() + ' 点',
    'もっている コイン ' + save.coins.toLocaleString(),
    'つぎは よごれが ふえるよ（レベル ' + game.level + '）',
  ];
  ctx.fillStyle = '#FFF3C4';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.8, H * 0.05);
    ctx.fillText(s, W / 2, H * 0.3 + i * H * 0.078);
  });
  const bw = W * 0.3, bh = H * 0.13;
  drawButton(button(W / 2 - bw - H * 0.02, H * 0.72, bw, bh,
                    () => { game.screen = 'shopFree'; }), 'どうぐを 買う', '#CFEAF4');
  drawButton(button(W / 2 + H * 0.02, H * 0.72, bw, bh, startRound), 'もう一度', '#FFD166');
}

// --- 全画面 ---------------------------------------------------------------

function fullscreenSupported() {
  const e = document.documentElement;
  return !!(e.requestFullscreen || e.webkitRequestFullscreen);
}
function enterFullscreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  if (screen.orientation && screen.orientation.lock) {
    try { const r = screen.orientation.lock('landscape'); if (r && r.catch) r.catch(() => {}); }
    catch (err) {}
  }
}

// --- 入力 -----------------------------------------------------------------

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function scrubAt(x, y, prev) {
  const b = ui.area;
  if (!b) return null;
  const u = (x - b.x) / b.w, v = (y - b.y) / b.h;
  if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) return null;
  scrub(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)),
        prev ? prev.u : null, prev ? prev.v : null, 1);
  game.scrubT = 0.15;
  return { u, v, sx: x, sy: y };
}

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  const { x, y } = pos(ev);
  const b = hit(x, y);
  if (b) {
    if (b.tag === 'buy') { buy(b.key); return; }
    if (b.on) { b.on(); return; }
  }
  if (game.screen === 'clean') {
    const p = scrubAt(x, y, null);
    if (p) ui.drag = p;
  }
  canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener('pointermove', (ev) => {
  if (game.screen !== 'clean' || !ui.drag) return;
  const { x, y } = pos(ev);
  const p = scrubAt(x, y, ui.drag);
  if (p) ui.drag = p;
});

function endDrag() { ui.drag = null; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- たて画面 -------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#16242E'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#9FC8D8';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
}

// --- ループ ---------------------------------------------------------------

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  game.t += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (game.screen === 'clean') {
    updateClean(dt);
    if (game.screen === 'clean') drawClean();
    else drawResult();
  } else if (game.screen === 'result') drawResult();
  else if (game.screen === 'shop') drawShop(false);
  else if (game.screen === 'shopFree') drawShop(true);
  else if (game.screen === 'end') drawEnd();
  else if (game.screen === 'howto') drawHowto();
  else drawTitle();
}

layout();
requestAnimationFrame(frame);
