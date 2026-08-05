// 画面と入力とメインループ。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const SAVE_KEY = 'slime.v1';
const SHELF_MAX = 12;

const save = { shelf: [], made: 0, bestStretch: 0, bestPoke: 0, bestBounce: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.shelf)) save.shelf = o.shelf.slice(0, SHELF_MAX);
    for (const k of ['made', 'bestStretch', 'bestPoke', 'bestBounce']) {
      if (Number.isFinite(o[k])) save[k] = o[k];
    }
  } catch (e) { /* 壊れていても遊べなくはしない */ }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const game = {
  screen: 'title',   // title / howto / lab / done / playmenu / stretch / poke / bounce / shelf
  m: emptyMix(),
  bath: null,        // ボウルの中の 絵の具（bath.js）
  p: null,
  name: '', title: null,
  blob: null,
  t: 0,
  shelfSel: -1,
  // あそび用
  play: null,
  msg: '', msgT: 0,
};

// pulls は「のばす」であそぶとき用。ゆび 1本ごとに 1つ入る（同時に何本でも）
const ui = { buttons: [], drag: null, bowl: null, stage: null, pulls: {} };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

function drawButton(b, label, col, textCol) {
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#3A2A4A';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w * 0.88, b.h * 0.44, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

function hit(px, py) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

function meter(x, y, w, h, v, col, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, x, y, Math.max(h, w * Math.max(0, Math.min(1, v))), h, h / 2); ctx.fill();
  if (label) {
    ctx.fillStyle = '#5A4A66';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(h * 0.95) + 'px system-ui, sans-serif';
    ctx.fillText(label, x + w + h * 0.5, y + h / 2);
  }
}

function bg(c0, c1) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// --- タイトル -------------------------------------------------------------

function demoProps(i) {
  const m = emptyMix();
  m.glue = 40; m.borax = 12; m.stir = 90;
  const c = [[20, 0, 0], [0, 18, 0], [0, 0, 20], [12, 12, 0], [10, 0, 14]][i % 5];
  m.red = c[0]; m.yellow = c[1]; m.blue = c[2];
  m.glitter = i % 2 ? 8 : 0;
  return analyze(m);
}

function drawTitle() {
  bg('#5B3B7A', '#C9A0DC');
  const i = Math.floor(game.t / 2.2) % 5;
  const p = demoProps(i);
  if (!game.demoBlob) game.demoBlob = makeBlob(0, 0, 1);
  const b = game.demoBlob;
  b.x = W * 0.78; b.y = H * 0.52; b.r = Math.min(W * 0.12, H * 0.26);
  blobUpdate(b, 1 / 60, p);
  if (Math.random() < 0.02) blobPoke(b, b.x + b.r, b.y, 0.6, p);
  drawSlime(ctx, b, p, { face: true, blink: Math.sin(game.t * 1.6) > 0.96 });

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('リナのスライムラボ', W * 0.55, H * 0.13, 'bold ');
  ctx.fillText('リナのスライムラボ', H * 0.06, H * 0.07);
  ctx.fillStyle = '#F0E2FA';
  fitFont('まぜる量で 色も 手ざわりも かわる！', W * 0.5, H * 0.045);
  ctx.fillText('まぜる量で 色も 手ざわりも かわる！', H * 0.07, H * 0.22);
  ctx.fillStyle = '#FFE9A8';
  fitFont('つくった数 ' + save.made + '　だな ' + save.shelf.length + '/' + SHELF_MAX,
          W * 0.5, H * 0.038);
  ctx.fillText('つくった数 ' + save.made + '　だな ' + save.shelf.length + '/' + SHELF_MAX,
               H * 0.07, H * 0.29);

  const bw = H * 0.62, bh = H * 0.14;
  drawButton(button(H * 0.06, H * 0.39, bw, bh, () => {
    enterFullscreen(); newMix();
  }), 'スライムを つくる', '#FFD166');
  drawButton(button(H * 0.06, H * 0.57, bw * 0.48, bh * 0.8,
                    () => { game.screen = 'shelf'; game.shelfSel = -1; }), 'スライムだな', '#CFEAF4');
  drawButton(button(H * 0.06 + bw * 0.52, H * 0.57, bw * 0.48, bh * 0.8,
                    () => { game.screen = 'howto'; }), 'あそびかた', '#E6D8F2');

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  fitFont('のばす・ぷにぷに・バウンド・ぐにゃぐにゃ の 4つで あそべる', W * 0.55, H * 0.032);
  ctx.fillText('のばす・ぷにぷに・バウンド・ぐにゃぐにゃ の 4つで あそべる', H * 0.06, H * 0.79);
}

function drawHowto() {
  ctx.fillStyle = '#F7F2FB'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#5B3B7A';
  ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① 材料の びんを ゆびで つかんで、ボウルの上まで もっていくと 出てくる',
    '② 入れた 絵の具は そこに たまる。かってには まざらない',
    '③ ボウルの中を ゆびで ぐるぐる すると、なぞったところ だけ まざる',
    '　 あおの となりに きいろを たらして まぜると みどりになる',
    '④ のり＋水が「かさ」、ホウ砂水が「かたさ」。少ないと ベタベタ 多いと カチカチ',
    '⑤ まぜ足りないと しま模様が のこる。できたら のばす・ぷにぷに・バウンド',
    '⑥ のばすときは つまんだ ところが のびる。ゆびを 何本 つかっても いい',
    '⑦「ぐにゃぐにゃ」は 620この つぶで できた ほんものの 流体。ちぎれる・くっつく',
  ];
  ctx.fillStyle = '#6A5A7A';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, H * 0.042);
    ctx.fillText(s, H * 0.05, H * 0.17 + i * H * 0.078);
  });
  const bh = H * 0.11;
  drawButton(button(H * 0.05, H - bh - H * 0.05, H * 0.4, bh,
                    () => { game.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- ラボ（つくる）--------------------------------------------------------

function newMix() {
  game.m = emptyMix();
  game.bath = makeBath();
  game.p = analyze(game.m);
  game.screen = 'lab';
}

function drawLab(dt) {
  ctx.fillStyle = '#F7F2FB'; ctx.fillRect(0, 0, W, H);
  const m = game.m, bath = game.bath;
  const pad = H * 0.03;
  const bw = W * 0.38, bh = H * 0.52;
  const bx = pad, by = pad + H * 0.115;
  const G = bowlGeom(bx, by, bw, bh);
  const k = bathScale(game.p ? game.p.volume : 0);
  const RX = G.rx * k, RY = G.ry * k;
  ui.bowl = { cx: G.cx, cy: G.cy, RX, RY };

  // びんを ボウルの上まで もっていくと そそげる。
  // 出る場所は ゆびの ところ。だから 好きな場所に たらせる
  let pourKey = null;
  if (ui.drag && ui.drag.tag === 'bottle') {
    const ex = (ui.drag.x - G.cx) / G.rx, ey = (ui.drag.y - G.cy) / G.ry;
    if (ex * ex + ey * ey < 1) pourKey = ui.drag.key;
  }
  if (pourKey) {
    const g = INGREDIENTS.find((q) => q.key === pourKey);
    const amt = g.rate * dt;
    m[g.key] += amt;
    let u = (ui.drag.x - G.cx) / RX, v = (ui.drag.y - G.cy) / RY;
    const d = Math.hypot(u, v);
    if (d > 1) { u /= d; v /= d; }
    bathPour(bath, g.key, amt, u, v);
    ui.drag.poured = true;
    ui.drag.pourT = (ui.drag.pourT || 0) + dt;
    if (ui.drag.pourT > 0.05) {
      ui.drag.pourT = 0;
      bathDrop(bath, ui.drag.x + (Math.random() - 0.5) * bw * 0.04,
               ui.drag.y - bh * 0.12, g.col, 0.15);
    }
  }

  bathUpdate(bath, dt);
  // 「まぜ」は 手ごたえではなく、ほんとうに 色がそろったかで はかる
  m.stir = bath.mixed * 100;
  game.p = analyze(m);
  const p = game.p;

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#5B3B7A';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
  ctx.fillText('スライムを つくる', pad, pad * 0.6);
  ctx.fillStyle = '#8A7A9A';
  const tip = 'びんを つかんで ボウルの上へ もっていくと 出てくる。'
            + 'ゆびで ぐるぐる すると まざる';
  fitFont(tip, W - pad * 2, H * 0.032);
  ctx.fillText(tip, pad, pad * 0.6 + H * 0.058);

  drawBowl(ctx, bx, by, bw, bh, m, p, bath, game.t);
  ui.buttons.push({ x: G.cx - G.rx, y: G.cy - G.ry,
                    w: G.rx * 2, h: G.ry * 2, tag: 'stir' });

  // メーター
  const my = G.cy + G.ry + H * 0.06, mw = bw * 0.55, mh = H * 0.032;
  const stateCol = p.state === 'good' ? '#7FC98F'
                 : p.state === 'tiny' ? '#B8C2CE' : '#E8895F';
  meter(bx, my, mw, mh, p.volume / 80, '#9FC8E8', 'かさ');
  meter(bx, my + mh * 1.7, mw, mh, p.ratio / 0.8, stateCol,
        p.state === 'sticky' ? 'ベタベタ' : p.state === 'hard' ? 'カチカチ'
        : p.state === 'tiny' ? 'ちいさい' : 'ちょうどいい');
  meter(bx, my + mh * 3.4, mw, mh, p.stir, '#D9A0E8',
        p.stir > 0.85 ? 'よく まざった' : 'まぜ');

  // 右：材料のたな
  const px0 = bx + bw + H * 0.04;
  const pw = W - px0 - pad;
  const cols = 4, rows = Math.ceil(INGREDIENTS.length / cols);
  const gap = H * 0.016;
  const rackTop = pad + H * 0.115;
  const gbH = H * 0.11;
  const availH = (H - gbH - pad * 2) - rackTop;
  const cw = (pw - gap * (cols - 1)) / cols;
  const chh = Math.min((availH - gap * (rows - 1)) / rows, H * 0.21);
  INGREDIENTS.forEach((g, i) => {
    const x = px0 + (i % cols) * (cw + gap);
    const y = rackTop + ((i / cols) | 0) * (chh + gap);
    const held = ui.drag && ui.drag.tag === 'bottle' && ui.drag.key === g.key;
    ctx.fillStyle = held ? '#EFE8F6' : '#FFFFFF';
    rr(ctx, x, y, cw, chh, H * 0.02); ctx.fill();
    ctx.strokeStyle = held ? '#C6B6D6' : 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1.5; ctx.stroke();
    if (held) {
      ctx.fillStyle = '#D8CCE6';                 // びんを 持ち出しているあいだ
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(chh * 0.3) + 'px system-ui, sans-serif';
      ctx.fillText('…', x + cw / 2, y + chh * 0.36);
    } else {
      drawBottle(ctx, x + cw / 2, y + chh * 0.42, cw * 0.36, chh * 0.5, g, 0);
    }
    ctx.fillStyle = '#4A3A5A';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(g.name, cw * 0.9, chh * 0.17, 'bold ');
    ctx.fillText(g.name, x + cw / 2, y + chh * 0.63);
    ctx.fillStyle = '#8A7A9A';
    fitFont(Math.round(m[g.key]) + g.unit, cw * 0.9, chh * 0.14);
    ctx.fillText(Math.round(m[g.key]) + g.unit, x + cw / 2, y + chh * 0.81);
    ui.buttons.push({ x, y, w: cw, h: chh, tag: 'ing', key: g.key });
  });

  // 下のボタン
  drawButton(button(px0, H - gbH - pad, pw * 0.34, gbH, newMix), 'さいしょから', '#E6D8F2');
  drawButton(button(px0 + pw * 0.38, H - gbH - pad, pw * 0.62, gbH, finishMix),
             'できた！ →', p.state === 'tiny' ? '#DDD6E4' : '#7FD0A0');
  drawButton(button(pad, H - gbH - pad, bw * 0.36, gbH,
                    () => { game.screen = 'title'; }), 'やめる', '#EDE6F4');

  // つかんでいる びん は いちばん上に
  if (ui.drag && ui.drag.tag === 'bottle') {
    const g = INGREDIENTS.find((q) => q.key === ui.drag.key);
    const hh = Math.min(H * 0.30, bh * 0.55);
    if (pourKey) {
      // 口が ゆびの ところに くるように かたむける
      drawBottle(ctx, ui.drag.x + hh * 0.45, ui.drag.y - hh * 0.6,
                 hh * 0.5, hh, g, -2.5);
    } else {
      drawBottle(ctx, ui.drag.x, ui.drag.y - hh * 0.45, hh * 0.5, hh, g, -0.2);
      ctx.fillStyle = 'rgba(91,59,122,0.9)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('ボウルの上へ！', bw * 0.7, H * 0.04, 'bold ');
      ctx.fillText('ボウルの上へ！', G.cx, G.cy);
    }
  }
}

function finishMix() {
  if (analyze(game.m).state === 'tiny') {
    game.msg = 'のりを もっと 入れてね'; game.msgT = 1.6; return;
  }
  // まぜ足りないぶんの しま模様を のこす
  game.m.marble = bathMarble(game.bath);
  const p = analyze(game.m);
  game.p = p;
  game.title = rareTitle(game.m, p);
  game.name = slimeName(game.m, p);
  save.made++;
  storeSave();
  game.blob = makeBlob(0, 0, 1);
  game.screen = 'done';
}

// --- できあがり -----------------------------------------------------------

function drawDone() {
  bg('#4C3A6A', '#B79BD4');
  const p = game.p;
  const b = game.blob;
  b.x = W * 0.26; b.y = H * 0.55; b.r = Math.min(W * 0.14, H * 0.28);
  blobUpdate(b, 1 / 60, p);
  if (Math.random() < 0.02) blobPoke(b, b.x + b.r * 0.8, b.y - b.r * 0.4, 0.5, p);
  drawSlime(ctx, b, p, { face: true, blink: Math.sin(game.t * 1.6) > 0.96 });
  ui.buttons.push({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2, tag: 'poke' });

  const lx = W * 0.48;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (game.title) {
    ctx.fillStyle = '#FFE07A';
    fitFont('★ ' + game.title + ' ★', W * 0.46, H * 0.05, 'bold ');
    ctx.fillText('★ ' + game.title + ' ★', lx, H * 0.1);
  }
  ctx.fillStyle = '#FFFFFF';
  fitFont(game.name, W * 0.48, H * 0.085, 'bold ');
  ctx.fillText(game.name, lx, H * 0.17);

  const mw = W * 0.3, mh = H * 0.03;
  const rows = [['のび', p.stretch, '#9FE8C0'], ['はずみ', p.bounce, '#9FC8E8'],
                ['やわらかさ', p.soft, '#E8C09F'], ['きらきら', p.sparkle, '#F2E08A'],
                ['つぶつぶ', p.crunch, '#E8A0C0']];
  rows.forEach(([n, v, c], i) => {
    ctx.fillStyle = '#EFE4F8';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(H * 0.032) + 'px system-ui, sans-serif';
    ctx.fillText(n, lx + W * 0.1, H * 0.31 + i * H * 0.058 + mh / 2);
    meter(lx + W * 0.115, H * 0.31 + i * H * 0.058, mw, mh, v, c);
  });

  // できばえ
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const stars = 1 + Math.round(p.grade * 4);
  ctx.fillStyle = '#FFE07A';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
  ctx.fillText('できばえ ' + '★'.repeat(stars) + '☆'.repeat(5 - stars), lx, H * 0.62);
  ctx.fillStyle = '#EFE4F8';
  fitFont(advice(p), W * 0.48, H * 0.034);
  ctx.fillText(advice(p), lx, H * 0.69);

  const bw2 = W * 0.15, bh2 = H * 0.12;
  drawButton(button(lx, H * 0.78, bw2, bh2, () => { game.screen = 'playmenu'; }),
             'あそぶ', '#FFD166');
  drawButton(button(lx + bw2 * 1.1, H * 0.78, bw2, bh2, shelveIt), 'だなに しまう', '#CFEAF4');
  drawButton(button(lx + bw2 * 2.2, H * 0.78, bw2, bh2, newMix), 'また つくる', '#E6D8F2');
}

function shelveIt() {
  save.shelf.unshift({ m: Object.assign({}, game.m), name: game.name, title: game.title });
  if (save.shelf.length > SHELF_MAX) save.shelf.pop();
  storeSave();
  game.msg = 'だなに しまった！'; game.msgT = 1.6;
}

// --- あそぶ ---------------------------------------------------------------

function drawPlayMenu() {
  bg('#3F6E8C', '#9FD8E8');
  const p = game.p, b = game.blob;
  b.x = W * 0.22; b.y = H * 0.55; b.r = Math.min(W * 0.12, H * 0.24);
  blobUpdate(b, 1 / 60, p);
  drawSlime(ctx, b, p, { face: true, blink: Math.sin(game.t * 1.6) > 0.96 });

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont(game.name + ' で あそぶ', W * 0.6, H * 0.08, 'bold ');
  ctx.fillText(game.name + ' で あそぶ', W * 0.42, H * 0.12);

  const items = [
    ['のばす', 'つまんだ ところが のびる', 'stretch', '#9FE8C0'],
    ['ぷにぷに', '15びょうで 何回 つつける？', 'poke', '#F2D08A'],
    ['バウンド', 'どこまで はずむ？', 'bounce', '#9FC8E8'],
    ['ぐにゃぐにゃ', 'ほんものの 流体。ちぎって くっつけて', 'goo', '#E8B0D8'],
  ];
  const bw = W * 0.5, bh = H * 0.115;
  items.forEach(([n, sub, key, col], i) => {
    const y = H * 0.24 + i * (bh + H * 0.022);
    const bb = button(W * 0.42, y, bw, bh, () => startPlay(key));
    ctx.fillStyle = col;
    rr(ctx, bb.x, bb.y, bb.w, bb.h, H * 0.025); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2A3A4A';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    fitFont(n, bw * 0.5, bh * 0.36, 'bold ');
    ctx.fillText(n, bb.x + bw * 0.05, bb.y + bh * 0.16);
    ctx.fillStyle = 'rgba(42,58,74,0.7)';
    fitFont(sub, bw * 0.6, bh * 0.24);
    ctx.fillText(sub, bb.x + bw * 0.05, bb.y + bh * 0.58);
    if (key !== 'goo') {
      const best = key === 'stretch' ? save.bestStretch
                 : key === 'poke' ? save.bestPoke : save.bestBounce;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#2A3A4A';
      ctx.font = 'bold ' + Math.round(bh * 0.3) + 'px system-ui, sans-serif';
      ctx.fillText('さいこう ' + Math.round(best), bb.x + bw * 0.95, bb.y + bh * 0.35);
      ctx.textAlign = 'left';
    }
  });
  const gbH = H * 0.11;
  drawButton(button(W * 0.42, H - gbH - H * 0.04, bw * 0.45, gbH,
                    () => { game.screen = 'done'; }), 'もどる', '#E6EEF4');
}

function startPlay(kind) {
  game.play = { kind, t: 0, score: 0, best: 0, over: false,
                fluid: null, grabbed: false, broke: false,
                y: 0, vy: 0, bounces: 0, peak: 0 };
  ui.pulls = {};
  const b = game.blob;
  b.x = W / 2; b.y = H * 0.55; b.r = Math.min(W * 0.11, H * 0.22);
  for (const q of b.pts) { q.off = 0; q.vel = 0; }
  b.sy = 1; b.vsy = 0;
  game.screen = kind;
  game.msg = kind === 'stretch' ? 'スライムを ひっぱって！'
           : kind === 'poke' ? 'つついて つついて！'
           : kind === 'goo' ? 'つまんで ちぎって あそぼう！'
           : '画面を タップで おとす';
  game.msgT = 2;
}

function playHud(title, value, unit) {
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(0, 0, W, H * 0.1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
  ctx.fillText(title, H * 0.03, H * 0.05);
  ctx.textAlign = 'right';
  ctx.fillText(value + unit, W - H * 0.03, H * 0.05);
  ctx.textAlign = 'left';
  // 左はしに よせておく。まんなかだと のびたスライムに かぶる
  const gbH = H * 0.1;
  drawButton(button(W * 0.02, H - gbH - H * 0.025, W * 0.15, gbH,
                    () => { game.screen = 'playmenu'; }), 'やめる', '#E6EEF4');
}

function drawStretch(dt) {
  bg('#DCF0F6', '#F6F1DC');
  const p = game.p, b = game.blob, pl = game.play;
  const base = Math.min(W * 0.10, H * 0.20);
  b.x = W * 0.24; b.y = H * 0.40;

  // つくえ
  const floor = H * 0.90;
  ctx.fillStyle = '#E2CFA8';
  ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(0, floor, W, 3);

  // ゆび 1本に つき ひも 1本。何本でも 同時に ひっぱれる
  const ids = Object.keys(ui.pulls);
  let extraVol = 0, longest = 0;
  for (const id of ids) {
    const pu = ui.pulls[id];
    if (!pu.strand) {
      pu.strand = makeStrand(b, pu.ang, pu.x, pu.y, p);
      pu.strand.floor = floor;
    }
    const s = pu.strand;
    strandStep(s, b, pu.x, pu.y, p, dt, pu.held);
    extraVol += Math.max(0, s.vol - s.vol0);
    if (pu.held && s.broken < 0) longest = Math.max(longest, s.len);
    if (s.broken >= 0 && !pu.broke) {
      pu.broke = true;
      game.msg = 'ちぎれた！ ゆっくり ひっぱると のびるよ';
      game.msgT = 1.8;
    }
    if (s.dead) {
      delete ui.pulls[id];
      if (pl.score > save.bestStretch) { save.bestStretch = pl.score; storeSave(); }
    }
  }
  pl.score = Math.max(pl.score, longest / base * 5);

  // ひもに 流れこんだぶん たまが やせる
  // ひもに 流れこんだ ぶん、たまは 目に見えて しぼむ。
  // 本体が 変わらないと「糸だけ 出ている」ように 見えて うそくさい
  b.r = base * Math.max(0.42, 1 - extraVol / (base * base * 3.2));
  // つまんでいる ところ だけ とんがる
  for (const id of Object.keys(ui.pulls)) {
    const pu = ui.pulls[id];
    if (pu.held && pu.strand && pu.strand.broken < 0) {
      blobPull(b, pu.ang, b.r * 0.85);
    }
  }
  blobUpdate(b, dt, p);

  for (const id of Object.keys(ui.pulls)) {
    if (ui.pulls[id].strand) drawStrand(ctx, ui.pulls[id].strand, p, b);
  }
  drawSlime(ctx, b, p, { face: true });
  for (const id of Object.keys(ui.pulls)) {
    const pu = ui.pulls[id];
    if (!pu.held || !pu.strand || pu.strand.broken >= 0) continue;
    ctx.fillStyle = rgbCss(shade(p.rgb, -0.1));      // つまんでいる ゆびさき
    ctx.beginPath();
    ctx.ellipse(pu.x, pu.y, base * 0.15, base * 0.19, 0, 0, 7);
    ctx.fill();
  }

  ui.buttons.push({ x: b.x - b.r * 1.4, y: b.y - b.r * 1.4,
                    w: b.r * 2.8, h: b.r * 2.8, tag: 'pull' });
  if (!ids.length) {
    ctx.fillStyle = 'rgba(60,80,96,0.75)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont('つまんだ ところが のびる', W * 0.42, H * 0.05, 'bold ');
    ctx.fillText('つまんだ ところが のびる', W * 0.66, H * 0.36);
    ctx.fillStyle = 'rgba(60,80,96,0.55)';
    const tips = ['ゆっくり ひっぱると 長くのびる。いっきに ひくと ちぎれる',
                  'ゆびを 2本 3本 つかうと、いっぺんに ひっぱれる'];
    tips.forEach((t, i) => {
      fitFont(t, W * 0.46, H * 0.038);
      ctx.fillText(t, W * 0.66, H * 0.46 + i * H * 0.07);
    });
  }
  playHud('のばす　さいこう ' + Math.round(save.bestStretch) + 'cm',
          Math.round(pl.score), 'cm');
}

// 「ぐにゃぐにゃ」は 本物の 粒子流体（fluid.js）。
// たれる・のびる・くびれる・ちぎれる・つくえに 広がる は
// ぜんぶ つぶの 動きから ひとりでに 出てくる。
function gooMat(p) {
  return {
    visc: 0.15 + p.stretch * 0.82,     // ねばり。大きいほど 長い糸になる
    coh: 80 + p.stretch * 520,         // くっつく力（表面張力のかわり）
    scorr: 0.0016 + (1 - p.stretch) * 0.0075,   // はじけやすさ
    kspr: 2600,                        // バネの つよさ ＝ 形を たもつ力
    plast: 0.7 + p.stretch * 4.5,      // 形を おぼえなおす はやさ ＝ のび
    yieldR: 0.20 - p.stretch * 0.12,   // どこまで のばしたら おぼえなおすか
    adhere: 480,                       // つくえへの ねばりつき
  };
}

function drawGoo(dt) {
  bg('#DCF0F6', '#F6F1DC');
  const p = game.p, pl = game.play;
  const base = Math.min(W * 0.095, H * 0.19);
  const floor = H * 0.90;

  // つくえ
  ctx.fillStyle = '#E2CFA8';
  ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(0, floor, W, 3);

  if (!pl.fluid) {
    // つくえの 上に のっている ところから 始める（落ちてくると さがせない）
    pl.fluid = makeFluid(W * 0.26, floor - base * 0.98, base);
    const f = pl.fluid;
    f.floor = (floor - f.oy) / f.scale;
    f.top = (H * 0.11 - f.oy) / f.scale;
    f.left = (W * 0.012 - f.ox) / f.scale;
    f.right = (W * 0.988 - f.ox) / f.scale;
  }
  const f = pl.fluid;
  const mat = gooMat(p);

  // つまむ・はなす
  const ids = Object.keys(ui.pulls);
  let holding = null;
  for (const id of ids) {
    const pu = ui.pulls[id];
    if (pu.held) { holding = pu; break; }
  }
  if (holding) {
    if (!pl.grabbed) {
      const got = fluidGrab(f, holding.x, holding.y, base * 0.28);
      if (got > 0) { pl.grabbed = true; pl.broke = false; }
    }
    if (pl.grabbed) fluidHold(f, holding.x, holding.y);
  } else if (pl.grabbed) {
    fluidRelease(f); pl.grabbed = false;
    if (pl.score > save.bestStretch) { save.bestStretch = pl.score; storeSave(); }
  }
  for (const id of ids) if (!ui.pulls[id].held) delete ui.pulls[id];

  // 進める。1 フレームを 2回に 分けて 解くと 落ちつく
  const sub = Math.min(0.018, Math.max(0.004, dt / 2));
  fluidStep(f, sub, mat);
  fluidStep(f, sub, mat);

  // つながりを 見て、ちぎれたかを 決める。判定は 書いていない。
  // 1フレームに 1回だけ 数える（かおの 位置にも 使いまわす）
  const root = fluidComponents(f, 0.88);
  const size = {};
  let big = -1, bigN = 0;
  for (let i = 0; i < f.n; i++) {
    const r = root[i];
    size[r] = (size[r] || 0) + 1;
    if (size[r] > bigN) { bigN = size[r]; big = r; }
  }
  if (pl.grabbed) {
    let heldRoot = -1, apart = 0, heldN = 0;
    for (let i = 0; i < f.n; i++) {
      if (!f.held[i]) continue;
      heldN++;
      if (heldRoot < 0) heldRoot = root[i];
      if (root[i] !== big) apart++;
    }
    const cut = heldN > 0 && apart > heldN * 0.6;
    if (!cut) {
      // まだ つながっている。かたまりの まんなかから ゆびまでの 長さ
      let sx = 0, sy = 0, cnt = 0;
      for (let i = 0; i < f.n; i++) {
        if (root[i] !== big || f.held[i]) continue;
        sx += f.x[i]; sy += f.y[i]; cnt++;
      }
      if (cnt > 8) {
        const cxm = f.ox + sx / cnt * f.scale, cym = f.oy + sy / cnt * f.scale;
        const d = Math.hypot(holding.x - cxm, holding.y - cym);
        pl.score = Math.max(pl.score, d / base * 5);
      }
    } else if (!pl.broke) {
      pl.broke = true;
      game.msg = 'ちぎれた！ ゆっくり ひっぱると のびるよ';
      game.msgT = 1.8;
      if (pl.score > save.bestStretch) { save.bestStretch = pl.score; storeSave(); }
    }
  }

  const hi = drawFluid(ctx, f, p, W, H);

  // かお。いちばん 大きい かたまりの まんなかに 出す。
  // ぜんぶの 平均だと、ちぎれた とき 何もない ところに 顔が うかぶ
  let sx = 0, sy = 0, cnt = 0;
  for (let i = 0; i < f.n; i++) {
    if (root[i] !== big) continue;
    sx += f.x[i]; sy += f.y[i]; cnt++;
  }
  const fx = f.ox + sx / cnt * f.scale, fy = f.oy + sy / cnt * f.scale;
  const er = base * 0.11;
  ctx.fillStyle = '#2B2630';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(fx + s * base * 0.26, fy - base * 0.06, er * 0.5,
                er * (Math.sin(game.t * 1.6) > 0.96 ? 0.12 : 1), 0, 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = '#2B2630';
  ctx.lineWidth = Math.max(1.5, base * 0.03);
  ctx.beginPath();
  ctx.arc(fx, fy + base * 0.06, base * 0.13, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // つや
  ctx.save();
  ctx.globalAlpha = 0.3 + p.gloss * 0.35;
  ctx.fillStyle = rgbCss(hi);
  ctx.beginPath();
  ctx.ellipse(fx - base * 0.34, fy - base * 0.42, base * 0.28, base * 0.15,
              -0.5, 0, 7);
  ctx.fill();
  ctx.restore();

  // つまめる はんい ＝ 画面ぜんぶ（どこを つまんでも いい）
  ui.buttons.push({ x: 0, y: H * 0.1, w: W, h: H * 0.78, tag: 'pull' });
  if (!ids.length) {
    ctx.fillStyle = 'rgba(60,80,96,0.75)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont('つまんで ちぎって、くっつけて あそぼう', W * 0.44, H * 0.05, 'bold ');
    ctx.fillText('つまんで ちぎって、くっつけて あそぼう', W * 0.68, H * 0.34);
    ctx.fillStyle = 'rgba(60,80,96,0.55)';
    const tips = ['ほうっておくと つくえに びちゃっと 広がる',
                  'ちぎれた かけらも つまめる。よせると くっついて もどる'];
    tips.forEach((t, i) => {
      fitFont(t, W * 0.48, H * 0.038);
      ctx.fillText(t, W * 0.68, H * 0.44 + i * H * 0.07);
    });
  }
  playHud('ぐにゃぐにゃ　つぶ ' + f.n + 'こ', Math.round(pl.score), 'cm');
}

function drawPoke(dt) {
  bg('#F6E8F6', '#FDF6E4');
  const p = game.p, b = game.blob, pl = game.play;
  b.x = W / 2; b.y = H * 0.55;
  if (!pl.over) {
    pl.t += dt;
    if (pl.t > 15) {
      pl.over = true;
      if (pl.score > save.bestPoke) { save.bestPoke = pl.score; storeSave(); }
    }
  }
  blobUpdate(b, dt, p);
  drawSlime(ctx, b, p, { face: true, blink: Math.sin(game.t * 1.6) > 0.96 });
  ui.buttons.push({ x: b.x - b.r * 1.2, y: b.y - b.r * 1.2,
                    w: b.r * 2.4, h: b.r * 2.4, tag: 'poke' });
  playHud('ぷにぷに　のこり ' + Math.max(0, Math.ceil(15 - pl.t)) + 'びょう',
          pl.score, 'かい');
  if (pl.over) {
    ctx.fillStyle = 'rgba(10,20,30,0.55)';
    ctx.fillRect(0, H * 0.38, W, H * 0.18);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
    ctx.fillText(pl.score + ' かい！', W / 2, H * 0.47);
  }
}

function drawBounce(dt) {
  bg('#E4F0FA', '#F6ECDC');
  const p = game.p, b = game.blob, pl = game.play;
  const floor = H * 0.82;
  b.x = W / 2;
  if (pl.dropped) {
    pl.vy += 1800 * dt;
    pl.y += pl.vy * dt;
    if (pl.y + b.r > floor) {
      pl.y = floor - b.r;
      if (pl.vy > 60) {
        pl.vy = -pl.vy * (0.28 + p.bounce * 0.62);
        pl.bounces++;
        blobPoke(b, b.x, b.y + b.r, Math.min(1, Math.abs(pl.vy) / 900), p);
        b.vsy -= Math.min(6, Math.abs(pl.vy) / 160);
      } else { pl.vy = 0; pl.resting = (pl.resting || 0) + dt; }
    }
    // 高さは「1 回はずんだあと」から測る。落とした高さを数えても
    // どのスライムも同じ点になってしまうため
    if (pl.bounces >= 1) pl.peak = Math.max(pl.peak, (floor - b.r - pl.y) / H * 100);
    pl.score = Math.round(pl.peak);
    if (pl.resting > 1.2 && !pl.over) {
      pl.over = true;
      if (pl.score > save.bestBounce) { save.bestBounce = pl.score; storeSave(); }
    }
  } else {
    pl.y = H * 0.18;
  }
  b.y = pl.y;
  blobUpdate(b, dt, p);
  // 床
  ctx.fillStyle = '#C8B79A';
  ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, floor, W, 4);
  drawSlime(ctx, b, p, { face: true });
  ui.buttons.push({ x: 0, y: H * 0.1, w: W, h: H * 0.72, tag: 'drop' });
  playHud('バウンド　' + pl.bounces + 'かい はずんだ', pl.score, '');
  if (pl.over) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(10,20,30,0.55)';
    ctx.fillRect(0, H * 0.38, W, H * 0.18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.round(H * 0.06) + 'px system-ui, sans-serif';
    ctx.fillText('たかさ ' + pl.score + '　' + pl.bounces + 'かい はずんだ', W / 2, H * 0.47);
  }
}

// --- スライムだな ---------------------------------------------------------

function drawShelf() {
  ctx.fillStyle = '#F7F2FB'; ctx.fillRect(0, 0, W, H);
  const pad = H * 0.03;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#5B3B7A';
  ctx.font = 'bold ' + Math.round(H * 0.06) + 'px system-ui, sans-serif';
  ctx.fillText('スライムだな', pad, pad);
  ctx.fillStyle = '#8A7A9A';
  ctx.font = Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.fillText(save.shelf.length + ' / ' + SHELF_MAX + '　えらぶと あそべる', pad + W * 0.22, pad + H * 0.02);

  if (!save.shelf.length) {
    ctx.fillStyle = '#A899B8';
    ctx.textAlign = 'center';
    ctx.font = Math.round(H * 0.05) + 'px system-ui, sans-serif';
    ctx.fillText('まだ 何もないよ。つくって「だなにしまう」', W / 2, H * 0.45);
  }

  const cols = 6, gap = H * 0.02;
  const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
  const chh = cw * 1.15;
  save.shelf.forEach((s, i) => {
    const x = pad + (i % cols) * (cw + gap);
    const y = pad + H * 0.13 + ((i / cols) | 0) * (chh + gap);
    const p = analyze(s.m);
    const sel = game.shelfSel === i;
    ctx.fillStyle = sel ? '#FFF0C4' : '#FFFFFF';
    rr(ctx, x, y, cw, chh, H * 0.02); ctx.fill();
    ctx.strokeStyle = sel ? '#E0A63A' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
    const tb = makeBlob(x + cw / 2, y + chh * 0.38, cw * 0.3);
    drawSlime(ctx, tb, p, {});
    ctx.fillStyle = '#4A3A5A';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(s.name, cw * 0.92, chh * 0.13, 'bold ');
    ctx.fillText(s.name, x + cw / 2, y + chh * 0.7);
    if (s.title) {
      ctx.fillStyle = '#E0A63A';
      fitFont('★' + s.title, cw * 0.92, chh * 0.11);
      ctx.fillText('★' + s.title, x + cw / 2, y + chh * 0.86);
    }
    ui.buttons.push({ x, y, w: cw, h: chh, tag: 'shelf', idx: i });
  });

  const gbH = H * 0.11;
  drawButton(button(pad, H - gbH - pad, W * 0.16, gbH,
                    () => { game.screen = 'title'; }), 'もどる', '#E6D8F2');
  if (game.shelfSel >= 0 && save.shelf[game.shelfSel]) {
    drawButton(button(pad + W * 0.18, H - gbH - pad, W * 0.24, gbH, () => {
      const s = save.shelf[game.shelfSel];
      game.m = Object.assign(emptyMix(), s.m);
      game.p = analyze(game.m);
      game.name = s.name; game.title = s.title;
      game.blob = makeBlob(0, 0, 1);
      game.screen = 'playmenu';
    }), 'これで あそぶ', '#FFD166');
    drawButton(button(pad + W * 0.44, H - gbH - pad, W * 0.16, gbH, () => {
      save.shelf.splice(game.shelfSel, 1);
      game.shelfSel = -1;
      storeSave();
    }), 'すてる', '#F2D8D8');
  }
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

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  const { x, y } = pos(ev);
  const b = hit(x, y);
  if (!b) return;
  if (b.tag === 'ing') { ui.drag = { tag: 'bottle', key: b.key, x, y, pourT: 0 }; }
  else if (b.tag === 'stir') { ui.drag = { tag: 'stir', x, y }; }
  else if (b.tag === 'pull') {
    // ang は「のばす」用（つまんだ 向きから ひもが 生える）。
    // 「ぐにゃぐにゃ」では 使わない
    ui.pulls[ev.pointerId] = {
      ang: Math.atan2(y - game.blob.y, x - game.blob.x),
      x, y, held: true, strand: null, broke: false,
    };
  }
  else if (b.tag === 'poke') {
    blobPoke(game.blob, x, y, 1, game.p);
    if (game.screen === 'poke' && !game.play.over) game.play.score++;
  } else if (b.tag === 'drop') {
    if (!game.play.dropped) { game.play.dropped = true; game.play.vy = 0; }
    else blobPoke(game.blob, x, y, 0.7, game.p);
  } else if (b.tag === 'shelf') { game.shelfSel = b.idx; }
  else if (b.on) b.on();
  // ゆびを 画面の外に 出しても ついてくるように。
  // 使えない ときも あるので 失敗しても 止めない
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
});

canvas.addEventListener('pointermove', (ev) => {
  const pu = ui.pulls[ev.pointerId];
  if (pu) { const q = pos(ev); pu.x = q.x; pu.y = q.y; return; }
  if (!ui.drag) return;
  const { x, y } = pos(ev);
  if (ui.drag.tag === 'stir' && ui.bowl) {
    // ボウルを 半径1の円と見たときの 動きに なおして わたす
    const bo = ui.bowl;
    const u = (x - bo.cx) / bo.RX, v = (y - bo.cy) / bo.RY;
    const pu = (ui.drag.x - bo.cx) / bo.RX, pv = (ui.drag.y - bo.cy) / bo.RY;
    bathStir(game.bath, u, v, u - pu, v - pv);
  }
  ui.drag.x = x; ui.drag.y = y;
});

function endDrag(ev) {
  // ゆびを はなしても ひもは のこす。ちぢんで もどるまで 動かすため
  const pu = ui.pulls[ev && ev.pointerId];
  if (pu) { pu.held = false; return; }
  // びんを 持ちあげただけで はなした ＝ たぶん やりかたが 分からない
  if (ui.drag && ui.drag.tag === 'bottle' && !ui.drag.poured
      && game.screen === 'lab') {
    game.msg = 'びんを ボウルの上まで もっていってね';
    game.msgT = 1.8;
  }
  ui.drag = null;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// --- たて画面 -------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#2A1E38'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#C9A0DC';
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

  if (game.screen === 'lab') drawLab(dt);
  else if (game.screen === 'done') drawDone();
  else if (game.screen === 'playmenu') drawPlayMenu();
  else if (game.screen === 'stretch') drawStretch(dt);
  else if (game.screen === 'poke') drawPoke(dt);
  else if (game.screen === 'bounce') drawBounce(dt);
  else if (game.screen === 'goo') drawGoo(dt);
  else if (game.screen === 'shelf') drawShelf();
  else if (game.screen === 'howto') drawHowto();
  else drawTitle();

  if (game.msgT > 0) {
    game.msgT -= dt;
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.fillStyle = 'rgba(20,14,30,0.72)';
    const tw = W * 0.5, th = H * 0.11;
    rr(ctx, W / 2 - tw / 2, H * 0.12, tw, th, H * 0.03); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(game.msg, tw * 0.9, th * 0.45, 'bold ');
    ctx.fillText(game.msg, W / 2, H * 0.12 + th / 2);
    ctx.globalAlpha = 1;
  }
}

loadSave();
layout();
requestAnimationFrame(frame);
