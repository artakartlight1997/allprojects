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
  // ★ 小さい ボタンは ゆびで 当てにくい、と 言われた。どれにも あたらなかった
  //   ときだけ、まわりを 少し ひろげて もう一度 さがす（見た目は そのまま）。
  const need = 40;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if (!mx && !my) continue;
    if (px >= b.x - mx && px <= b.x + b.w + mx &&
        py >= b.y - my && py <= b.y + b.h + my) return b;
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

// ほかの ゲームを えらぶ 入口（ゲームランド）へ もどる。
// タイトル画面の 右上に 小さく 出す。全画面で 遊んでいると
// ブラウザの「もどる」が 見えないので、ここから 帰れるようにしておく。
function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}

function drawHubButton() {
  const mw = Math.min(W * 0.30, H * 0.60), mh = H * 0.085;
  drawButton(button(W - mw - H * 0.03, H * 0.03, mw, mh, gotoHub),
       '≡ ゲームをえらぶ', 'rgba(255,255,255,0.86)', '#33304A');
}

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

  // むずかしさ を えらぶ
  const bw = H * 0.62;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold ' + Math.round(H * 0.036) + 'px system-ui, sans-serif';
  ctx.fillText('むずかしさ', H * 0.06, H * 0.355);
  // 4つ ならべる。右の 部屋の絵に かからない はばに おさめる
  const dRow = Math.min(H * 1.02, dx - H * 0.09);
  const gap2 = H * 0.014;
  const cw2 = (dRow - gap2 * (DIFFS.length - 1)) / DIFFS.length, ch2 = H * 0.105;
  DIFFS.forEach((d, i) => {
    const x = H * 0.06 + i * (cw2 + gap2), y = H * 0.40;
    const on = save.diff === i;
    ctx.fillStyle = on ? d.col : 'rgba(255,255,255,0.18)';
    rr(ctx, x, y, cw2, ch2, ch2 * 0.28); ctx.fill();
    ctx.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#243642' : '#EAF4FA';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(d.name, cw2 * 0.9, ch2 * 0.46, 'bold ');
    ctx.fillText(d.name, x + cw2 / 2, y + ch2 / 2);
    ui.buttons.push({ x, y, w: cw2, h: ch2, tag: 'diff', idx: i });
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fitFont(dif().sub, dRow, H * 0.037);
  ctx.fillText(dif().sub, H * 0.06, H * 0.518);

  const bh = H * 0.13;
  drawButton(button(H * 0.06, H * 0.57, bw, bh, () => {
    enterFullscreen(); startRound();
  }), 'そうじを はじめる', '#FFD166');
  drawButton(button(H * 0.06, H * 0.73, bw * 0.48, bh * 0.72,
                    () => { game.screen = 'shopFree'; }), 'どうぐ', '#CFEAF4');
  drawButton(button(H * 0.06 + bw * 0.52, H * 0.73, bw * 0.48, bh * 0.72,
                    () => { game.screen = 'howto'; }), 'あそびかた', '#D8E4F2');
  drawHubButton();
}

function drawHowto() {
  ctx.fillStyle = '#F2F7FA'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#22506A';
  ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① 画面を ゆびで こすると よごれが おちる',
    '② したの 4つの 道具を もちかえる。合った 道具だと 3ばい 速い',
    '　 ぞうきん＝ほこり / スポンジ＝あぶら / たわし＝こびりつき',
    '③ みどりの カビは ほうっておくと 広がる！「カビとり」を ふきかけて 消す',
    '　 カビとりは こわれものを 割らないので、かびんの となりでも 安心',
    '④ かびん や コップは こすると こわれる。3回で パリン。よけて そうじ',
    '⑤ よごれが おち続けている あいだ コンボが のびる。とまると 切れる',
    '⑥ よごれを 落とすと ★いっそう★ ゲージが たまる。いっぱいで つかうと',
    '　 光の波が 画面を わたって、通り道が いっぺんに ピカピカになる！',
    '⑦ よごれの下の おとしものは コインになる。おみせで 道具を 強くできる',
    '⑧ 2へやめから 「へんな 部屋」が 出る（むずかしさで 出る回数が かわる）',
    '　 あめもり＝よごれが ふってくる / ていでん＝まっくら',
    '　 たからもの だらけ＝こわれものが いっぱい / カビ大はっせい＝カビが 増える',
  ];
  ctx.fillStyle = '#3A5A6E';
  const step2 = Math.min(H * 0.079, (H * 0.70) / lines.length);
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, Math.min(H * 0.042, step2 * 0.68));
    ctx.fillText(s, H * 0.05, H * 0.15 + i * step2);
  });
  const bh = H * 0.11;
  drawButton(button(W - H * 0.45, H * 0.05, H * 0.4, bh,
                    () => { game.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- そうじ ---------------------------------------------------------------

const TOOLBAR_H = 0.135;      // 画面の したに 道具の ボタンを おく

// 部屋は 画面いっぱい。HUD と 道具バーは そのうえに かさねる。
// 前は 上下を あけていて 部屋が 小さかった
function roomBox() {
  return { x: 0, y: 0, w: W, h: H };
}

// --- へんな 部屋 ------------------------------------------------------------

// ていでん。ゆびの まわり だけ 見える。
// どこを こすったか おぼえて いないと いけないので ぐっと むずかしい。
// カビと こわれものは うっすら 見えるように している（見えないと つらすぎる）
function drawDark(b) {
  const lx = ui.drag ? ui.drag.sx : W * 0.5;
  const ly = ui.drag ? ui.drag.sy : H * 0.5;
  const flick = 0.88 + Math.sin(game.t * 11.3) * 0.06 + Math.sin(game.t * 3.7) * 0.06;
  const r = Math.max(H * 0.19, brushR() * curTool().rMul / DIRT_W * b.w * 2.4) * flick;
  const g = ctx.createRadialGradient(lx, ly, r * 0.3, lx, ly, r);
  g.addColorStop(0, 'rgba(4,8,14,0)');
  g.addColorStop(0.55, 'rgba(4,8,14,0.45)');
  g.addColorStop(1, 'rgba(4,8,14,0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of game.molds) {
    if (m.dead) continue;
    const mx = b.x + m.x * b.w, my = b.y + m.y * b.h, mr = m.r * b.w;
    const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(4, mr * 1.2));
    g2.addColorStop(0, 'rgba(70,150,90,0.55)');
    g2.addColorStop(1, 'rgba(70,150,90,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(mx, my, Math.max(4, mr * 1.2), 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,200,150,0.30)';
  ctx.lineWidth = 2;
  for (const bk of game.breaks) {
    if (bk.broken) continue;
    const rr2 = bk.r * b.w;
    ctx.beginPath();
    ctx.ellipse(b.x + bk.x * b.w, b.y + bk.y * b.h, rr2 * 1.05, rr2 * 0.85, 0, 0, 7);
    ctx.stroke();
  }
}

// 部屋に 入った ときに 「なにが おきているか」を 大きく 見せる。
// おに の 終わりの ほうでは 2つ かさなるので、2つとも 見せる。
function drawGimBanner() {
  const gs = game.gims;
  if (!gs.length || game.gimT <= 0) return;
  const a = Math.min(1, game.gimT / 0.6);
  const grow = game.gimT > 2.35 ? 1 + (game.gimT - 2.35) * 1.6 : 1;
  const rowH = H * 0.155;
  const bw = Math.min(W * 0.88, H * 1.6) * grow;
  const bh = (rowH * gs.length + H * 0.035) * grow;
  const x = (W - bw) / 2, y = H * 0.40 - bh / 2;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(12,20,30,0.85)';
  rr(ctx, x, y, bw, bh, H * 0.03); ctx.fill();
  ctx.strokeStyle = gs[gs.length - 1].col;
  ctx.lineWidth = Math.max(2, H * 0.008);
  rr(ctx, x, y, bw, bh, H * 0.03); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  gs.forEach((g, i) => {
    const cy = y + bh * 0.5 + (i - (gs.length - 1) / 2) * rowH * grow;
    ctx.fillStyle = g.col;
    fitFont(g.name, bw * 0.9, rowH * 0.42 * grow, 'bold ');
    ctx.fillText(g.name, x + bw / 2, cy - rowH * 0.19 * grow);
    ctx.fillStyle = '#E8F0F6';
    fitFont(g.desc, bw * 0.92, rowH * 0.25 * grow);
    ctx.fillText(g.desc, x + bw / 2, cy + rowH * 0.22 * grow);
  });
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// ずっと 出しておく 小さな ふだ。なにが おきているか わすれない ため
function drawGimBadge() {
  if (!game.gims.length) return;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const fs = Math.round(H * 0.032);
  ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
  const pad = H * 0.014, bh = fs * 1.6;
  let x = H * 0.03;
  const y = H * 0.112;
  for (const g of game.gims) {
    const tw = ctx.measureText(g.name).width;
    ctx.fillStyle = 'rgba(10,18,26,0.72)';
    rr(ctx, x, y, tw + pad * 2, bh, bh * 0.35); ctx.fill();
    ctx.strokeStyle = g.col; ctx.lineWidth = 2;
    rr(ctx, x, y, tw + pad * 2, bh, bh * 0.35); ctx.stroke();
    ctx.fillStyle = g.col;
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.fillText(g.name, x + pad, y + bh / 2);
    x += tw + pad * 2 + H * 0.014;
  }
  ctx.textBaseline = 'alphabetic';
}

function drawClean() {
  ctx.fillStyle = '#1E2C36'; ctx.fillRect(0, 0, W, H);
  const b = roomBox();
  ui.area = b;

  ctx.save();
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
  // カビ。よごれより 上に 描くので、広がってくるのが すぐ わかる
  for (const m of game.molds) {
    if (m.dead) continue;
    const mx = b.x + m.x * b.w, my = b.y + m.y * b.h, mr = m.r * b.w;
    const g = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr);
    g.addColorStop(0, 'rgba(38,74,44,0.95)');
    g.addColorStop(0.7, 'rgba(58,96,54,0.85)');
    g.addColorStop(1, 'rgba(74,110,62,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(26,52,32,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399 + m.seed;
      const rr2 = mr * (0.2 + (i % 4) * 0.19);
      ctx.beginPath();
      ctx.arc(mx + Math.cos(a) * rr2, my + Math.sin(a) * rr2, mr * 0.14, 0, 7);
      ctx.fill();
    }
  }
  // こわれもの。よけて そうじする ひつようが あるので いちばん 上に
  for (const bk of game.breaks) {
    const sx = b.x + bk.x * b.w + (bk.shake > 0 ? (Math.random() - 0.5) * 6 : 0);
    const sy = b.y + bk.y * b.h;
    const rr2 = bk.r * b.w;
    if (bk.broken) {
      ctx.fillStyle = 'rgba(120,120,130,0.55)';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.7;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * rr2 * 1.2, sy + Math.sin(a) * rr2 * 0.7);
        ctx.lineTo(sx + Math.cos(a + 0.4) * rr2 * 1.5, sy + Math.sin(a + 0.4) * rr2 * 0.9);
        ctx.lineTo(sx, sy + rr2 * 0.5);
        ctx.closePath(); ctx.fill();
      }
      continue;
    }
    if (bk.shake > 0) bk.shake -= 1 / 60;
    ctx.fillStyle = bk.col;
    if (bk.tall) {
      rr(ctx, sx - rr2 * 0.6, sy - rr2 * 1.1, rr2 * 1.2, rr2 * 2.2, rr2 * 0.35);
      ctx.fill();
    } else {
      rr(ctx, sx - rr2, sy - rr2 * 0.8, rr2 * 2, rr2 * 1.6, rr2 * 0.25);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.stroke();
    // ヒビ
    if (bk.hp < 3) {
      ctx.strokeStyle = 'rgba(40,30,40,0.85)';
      ctx.lineWidth = Math.max(1.5, rr2 * 0.12);
      for (let i = 0; i < 3 - bk.hp; i++) {
        ctx.beginPath();
        ctx.moveTo(sx - rr2 * 0.4 + i * rr2 * 0.4, sy - rr2 * 0.7);
        ctx.lineTo(sx - rr2 * 0.1 + i * rr2 * 0.4, sy + rr2 * 0.1);
        ctx.lineTo(sx - rr2 * 0.5 + i * rr2 * 0.4, sy + rr2 * 0.7);
        ctx.stroke();
      }
    }
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
  // あめもりの しずく。おちる さきに わっかを 出して、
  // 「あそこが よごれる」と 先に わかるように している
  for (const d of game.drips) {
    const dx2 = b.x + d.x * b.w, dy2 = b.y + d.y * b.h;
    const ty2 = b.y + d.ty * b.h;
    const rr3 = H * 0.019;
    const near = Math.max(0, Math.min(1, 1 - (d.ty - d.y) / 0.5));
    ctx.strokeStyle = 'rgba(120,190,240,' + (0.35 + near * 0.5).toFixed(2) + ')';
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath();
    ctx.ellipse(dx2, ty2, rr3 * (1.6 + near * 1.4), rr3 * (0.8 + near * 0.7), 0, 0, 7);
    ctx.stroke();
    // しっぽ
    const gt = ctx.createLinearGradient(dx2, dy2 - rr3 * 5, dx2, dy2);
    gt.addColorStop(0, 'rgba(170,215,245,0)');
    gt.addColorStop(1, 'rgba(170,215,245,0.7)');
    ctx.fillStyle = gt;
    ctx.beginPath();
    ctx.moveTo(dx2, dy2 - rr3 * 5);
    ctx.lineTo(dx2 + rr3 * 0.75, dy2);
    ctx.lineTo(dx2 - rr3 * 0.75, dy2);
    ctx.closePath(); ctx.fill();
    // つぶ
    ctx.fillStyle = 'rgba(120,180,225,0.95)';
    ctx.beginPath(); ctx.arc(dx2, dy2, rr3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(dx2 - rr3 * 0.3, dy2 - rr3 * 0.3, rr3 * 0.38, 0, 7);
    ctx.fill();
  }
  // こすっている ふきだし。カビとりの ときは スプレーの しぶき
  if (game.scrubT > 0 && ui.drag) {
    const rad = brushR() * curTool().rMul / DIRT_W * b.w;
    if (curTool().spray) {
      ctx.fillStyle = 'rgba(200,244,210,0.35)';
      ctx.beginPath(); ctx.arc(ui.drag.sx, ui.drag.sy, rad * 1.15, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(230,255,238,0.75)';
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399 + game.t * 6;
        const rr2 = rad * (0.25 + (i % 4) * 0.24);
        ctx.beginPath();
        ctx.arc(ui.drag.sx + Math.cos(a) * rr2, ui.drag.sy + Math.sin(a) * rr2,
                rad * 0.11, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ui.drag.sx, ui.drag.sy, rad, 0, 7);
      ctx.stroke();
    }
  }
  // ていでん。ゆびの まわり だけ 見える
  if (hasGim('dark')) drawDark(b);
  // いっそうの 波
  if (game.sweep >= 0) {
    const wx = b.x + game.sweep * b.w;
    const gw2 = b.w * 0.10;
    const g2 = ctx.createLinearGradient(wx - gw2, 0, wx + gw2 * 0.35, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.65, 'rgba(220,250,255,0.75)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(wx - gw2, b.y, gw2 * 1.35, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(3, H * 0.012);
    ctx.beginPath(); ctx.moveTo(wx, b.y); ctx.lineTo(wx, b.y + b.h); ctx.stroke();
  }
  // きらきら
  for (const s of game.sparks) {
    const a = Math.max(0, 1 - s.t / 0.9);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.col || (s.t < 0.4 ? '#FFFFFF' : '#FFF3B0');
    const sz = H * 0.012 * (1 - s.t * 0.5);
    ctx.beginPath();
    ctx.arc(b.x + s.x * b.w, b.y + s.y * b.h, Math.max(1, sz), 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 同時に 出ると 重なって 読めないので、出ている 順に 上へ ずらす
  game.pops.forEach((p, i) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - p.t / 1.6));
    ctx.fillStyle = p.col;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * 0.038) + 'px system-ui, sans-serif';
    const px2 = Math.max(b.x + b.w * 0.16,
                         Math.min(b.x + b.w * 0.84, b.x + p.x * b.w));
    ctx.fillText(p.text, px2,
                 b.y + p.y * b.h - i * H * 0.055 - Math.max(0, p.t) * H * 0.05);
    ctx.globalAlpha = 1;
  });

  // HUD
  ctx.fillStyle = 'rgba(10,18,26,0.62)';
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
  ctx.textAlign = 'center';
  ctx.fillStyle = '#22303A';        // バーの上なので 濃い色にする
  ctx.font = 'bold ' + Math.round(H * 0.028) + 'px system-ui, sans-serif';
  ctx.fillText(Math.round(game.clean * 100) + '%', gx + gw / 2, H * 0.0505);
  ctx.textAlign = 'left';

  // のこっている カビ の数（時間との たたかい なので 目立たせる）
  const alive = game.molds.filter((m) => !m.dead).length;
  if (alive > 0) {
    ctx.fillStyle = '#A8F0C4';
    ctx.font = 'bold ' + Math.round(H * 0.036) + 'px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('カビ ' + alive + 'こ', gx - H * 0.02, H * 0.05);
    ctx.textAlign = 'left';
  }
  // コンボ
  if (game.combo >= 3) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD166';
    const s = 1 + Math.min(0.3, game.combo * 0.02);
    ctx.font = 'bold ' + Math.round(H * 0.055 * s) + 'px system-ui, sans-serif';
    ctx.fillText('コンボ ' + game.combo + '！', W / 2, H * 0.17);
    ctx.textAlign = 'left';
  }

  // いっそうの しゅんかん 画面が ぱっと 光る
  if (game.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, game.flash) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // ノリノリ ちゅう は ふちが 光る
  if (game.fever > 0) {
    ctx.strokeStyle = 'rgba(255,220,120,' + Math.min(0.9, game.fever) + ')';
    ctx.lineWidth = H * 0.02;
    ctx.strokeRect(H * 0.01, H * 0.01, W - H * 0.02, H - H * 0.02);
    ctx.fillStyle = 'rgba(255,225,140,0.9)';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(H * 0.04) + 'px system-ui, sans-serif';
    ctx.fillText('ノリノリ！', W / 2, H * 0.225);
    ctx.textAlign = 'left';
  }

  drawGimBadge();
  drawGimBanner();
  drawSweepButton();
  drawToolBar();
}

// いっそう ゲージ と ボタン
function drawSweepButton() {
  const bw = Math.min(W * 0.30, H * 0.62), bh = H * 0.115;
  const x = W - bw - H * 0.03, y = H - H * TOOLBAR_H - bh - H * 0.012;
  const full = canSweep();
  ctx.fillStyle = full ? '#FFF3B0' : 'rgba(10,20,30,0.6)';
  rr(ctx, x, y, bw, bh, bh * 0.3); ctx.fill();
  if (!full) {
    // たまり ぐあい
    ctx.save();
    rr(ctx, x, y, bw, bh, bh * 0.3); ctx.clip();
    ctx.fillStyle = 'rgba(140,220,255,0.55)';
    ctx.fillRect(x, y, bw * game.power, bh);
    ctx.restore();
  }
  ctx.strokeStyle = full ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = full ? 3 : 1.5;
  rr(ctx, x, y, bw, bh, bh * 0.3); ctx.stroke();
  ctx.fillStyle = full ? '#3A2A10' : '#DCE6EE';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = full ? '★ いっそう！ ★'
                     : 'いっそう ' + Math.round(game.power * 100) + '%';
  fitFont(label, bw * 0.9, bh * (full ? 0.52 : 0.44), 'bold ');
  ctx.fillText(label, x + bw / 2, y + bh / 2);
  ctx.textAlign = 'left';
  if (full) ui.buttons.push({ x, y, w: bw, h: bh, tag: 'sweep' });
}

// 道具の ボタン。合った 道具を えらぶと ずっと 速く 落ちる
function drawToolBar() {
  const h = H * TOOLBAR_H * 0.78;
  const y = H - H * TOOLBAR_H + H * 0.012;
  const n = TOOLS.length;
  const gap = H * 0.016;
  const w = Math.min(H * 0.46, (W - gap * (n + 1)) / n);
  const x0 = (W - (w * n + gap * (n - 1))) / 2;
  TOOLS.forEach((t, i) => {
    const x = x0 + i * (w + gap);
    const on = game.tool === i;
    ctx.fillStyle = on ? t.col : 'rgba(255,255,255,0.16)';
    rr(ctx, x, y, w, h, h * 0.28); ctx.fill();
    ctx.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#1E2C36' : '#DCE6EE';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(t.name, w * 0.88, h * 0.42, 'bold ');
    ctx.fillText(t.name, x + w / 2, y + h * 0.35);
    // とくいな よごれ
    const best = t.spray ? 'カビ せんよう'
               : t.mul.dust >= 1.5 ? 'ほこりに つよい'
               : t.mul.grease >= 1.5 ? 'あぶらに つよい' : 'こびりつきに つよい';
    ctx.fillStyle = on ? 'rgba(30,44,54,0.75)' : 'rgba(220,230,238,0.6)';
    fitFont(best, w * 0.9, h * 0.26);
    ctx.fillText(best, x + w / 2, y + h * 0.72);
    ui.buttons.push({ x, y, w, h, tag: 'tool', idx: i });
  });
  ctx.textAlign = 'left';
}

// --- けっか ---------------------------------------------------------------

function drawResult() {
  drawClean();
  ctx.fillStyle = 'rgba(8,16,26,0.80)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = game.perfect ? '#A8F0C4' : '#FFE9A8';
  const title = game.perfect ? 'ピカピカ！' : 'おそうじ おわり';
  fitFont(title, W * 0.8, H * 0.11, 'bold ');
  ctx.fillText(title, W / 2, H * 0.1);

  const lines = [
    ['きれい度 ' + Math.round(game.clean * 100) + '%', '#E8F0F6'],
    ['おそうじ代 ' + game.earned.toLocaleString() + ' コイン', '#E8F0F6'],
    ['おとしもの ' + game.foundCoins.toLocaleString() + ' コイン', '#E8F0F6'],
  ];
  // おまけ。何が よかったのか／だめだったのか を はっきり 見せる
  if (game.bonusSafe) lines.push(['ひとつも こわさなかった +300', '#A8F0C4']);
  else lines.push([game.broke + 'こ こわしちゃった', '#FF9C7A']);
  if (game.bonusMold) lines.push(['カビ ぜんめつ +' + game.bonusMold, '#A8F0C4']);
  else {
    const left = game.molds.filter((m) => !m.dead).length;
    if (left) lines.push(['カビが ' + left + 'こ のこった', '#FFD166']);
  }
  if (game.bonusCombo) lines.push(['さいこうコンボ ' + game.bestCombo
                                   + ' +' + game.bonusCombo, '#FFD166']);
  if (game.bonusSweep) lines.push(['いっそう ' + game.sweeps + 'かい +'
                                   + game.bonusSweep, '#BFEFFF']);
  lines.push(['この へや ' + game.roundScore.toLocaleString() + ' 点', '#FFFFFF']);

  const step = Math.min(H * 0.066, (H * 0.40) / lines.length);
  lines.forEach((L, i) => {
    ctx.fillStyle = L[1];
    fitFont(L[0], W * 0.7, step * 0.72);
    ctx.fillText(L[0], W / 2, H * 0.235 + i * step);
  });

  const got = game.finds.filter((f) => f.found).map((f) => f.name);
  ctx.fillStyle = '#FFD166';
  const gotText = got.length ? '見つけた: ' + got.join('・') : 'おとしもの なし';
  fitFont(gotText, W * 0.86, H * 0.034);
  ctx.fillText(gotText, W / 2, H * 0.235 + lines.length * step + H * 0.01);

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
    if (b.tag === 'tool') { game.tool = b.idx; return; }
    if (b.tag === 'sweep') { startSweep(); return; }
    if (b.tag === 'diff') { save.diff = b.idx; storeSave(); return; }
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
