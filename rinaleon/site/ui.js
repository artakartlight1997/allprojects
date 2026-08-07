// 画面と入力とメインループ。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const ui = { buttons: [], areas: {}, drag: null, last: null };

const PALETTE = [
  '#FFFFFF', '#D9D2C4', '#8A7A5E', '#4A3F58',
  '#B25C46', '#C0664E', '#B08149', '#C9A06A',
  '#6FAE55', '#3E7A46', '#7FC7C0', '#79C4EC',
  '#16204A', '#E58AAE', '#F4E06A', '#2B2230',
];
const BRUSHES = [[7, '細'], [16, '中'], [34, '太']];

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
  for (let i = 0; i < 12; i++) {
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
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.28));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#22304A';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w * 0.86, b.h * 0.44, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
}

function hit(px, py) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

// りなを画面に描く（塗った絵を輪郭で切りぬく）
function drawRina(c, x, y, w, h, pose, opts) {
  opts = opts || {};
  c.save();
  c.translate(x, y);
  rinaPath(c, w, h, pose);
  c.save();
  c.clip();
  c.drawImage(paint.cv, 0, 0, w, h);
  c.restore();
  if (opts.outline) {
    c.strokeStyle = opts.outline;
    c.lineWidth = opts.lw || 2;
    c.setLineDash(opts.dash || []);
    c.stroke();
    c.setLineDash([]);
  }
  c.restore();
  drawRinaEyes(c, x, y, w, h, pose, !!opts.blink);
}

// --- ステージの見本（お絵かき画面のサムネイル） ---------------------------

const thumb = { cv: null, ctx: null, w: 0, h: 0, stage: null };

function makeThumb(stage, w, h) {
  w = Math.max(40, Math.round(w)); h = Math.max(30, Math.round(h));
  if (!thumb.cv || thumb.w !== w || thumb.h !== h || thumb.stage !== stage) {
    thumb.cv = offscreen(w, h);
    thumb.ctx = thumb.cv.getContext('2d', { willReadFrequently: true });
    thumb.w = w; thumb.h = h; thumb.stage = stage;
    drawStageBg(thumb.ctx, w, h, stage);
  }
  return thumb;
}

function pickFromThumb(u, v) {
  if (!thumb.ctx) return;
  const x = Math.max(0, Math.min(thumb.w - 1, Math.round(u * thumb.w)));
  const y = Math.max(0, Math.min(thumb.h - 1, Math.round(v * thumb.h)));
  const d = thumb.ctx.getImageData(x, y, 1, 1).data;
  paint.color = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
  paint.spuit = false;
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
  g.addColorStop(0, '#2E7D5B'); g.addColorStop(1, '#8FD0A8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // うしろで見本のカメレオンりなが色を変える
  const demo = STAGES[Math.floor(game.t / 3) % STAGES.length];
  const dw = W * 0.34, dh = H * 0.66;
  const dx = W - dw - H * 0.05, dy = (H - dh) / 2;
  ctx.save();
  rr(ctx, dx, dy, dw, dh, H * 0.03); ctx.clip();
  ctx.translate(dx, dy);
  drawStageBg(ctx, dw, dh, demo);
  // 見本のりな。背景に合わせて塗ってある姿を見せる
  const sh = dh * 0.5, sw = sh * (PW / PH);
  ctx.save();
  ctx.translate((dw - sw) / 2, dh * (1 - FLOOR_RATIO) - sh + dh * 0.02);
  rinaPath(ctx, sw, sh, 0);
  ctx.save(); ctx.clip();
  drawStageBg(ctx, dw, dh, demo);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  ctx.restore();

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('めっちゃリナレオン', W * 0.52, H * 0.13, 'bold ');
  ctx.fillText('めっちゃリナレオン', H * 0.06, H * 0.07);
  ctx.fillStyle = '#DFF6E8';
  fitFont('じぶんで色をぬって、かべに ばけろ！', W * 0.5, H * 0.045);
  ctx.fillText('じぶんで色をぬって、かべに ばけろ！', H * 0.07, H * 0.23);

  ctx.fillStyle = '#FFF3C4';
  ctx.font = Math.round(H * 0.038) + 'px system-ui, sans-serif';
  ctx.fillText('さいこう ' + save.best.toLocaleString() + ' 点' +
               (save.cleared ? '　クリア ' + save.cleared + '回' : ''),
               H * 0.07, H * 0.30);

  const bw = H * 0.62, bh = H * 0.14;
  drawButton(button(H * 0.06, H * 0.40, bw, bh, () => {
    enterFullscreen(); startGame();
  }), 'あそぶ', '#FFD166');
  drawButton(button(H * 0.06, H * 0.58, bw * 0.48, bh * 0.8, () => {
    game.screen = 'howto';
  }), 'あそびかた', '#CFEBD9');
  drawButton(button(H * 0.06 + bw * 0.52, H * 0.58, bw * 0.48, bh * 0.8, () => {
    if (fullscreenSupported()) enterFullscreen();
  }), fullscreenSupported() ? 'ぜんがめん' : 'ホームに追加', '#D8E4F2');

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  fitFont('ぜんぶで ' + ROUNDS + ' かい。パパに ' + SEEK_TIME + ' びょう 見つからなければ かち',
          W * 0.52, H * 0.032);
  ctx.fillText('ぜんぶで ' + ROUNDS + ' かい。パパに ' + SEEK_TIME + ' びょう 見つからなければ かち',
               H * 0.06, H * 0.80);
  drawHubButton();
}

function drawHowto() {
  ctx.fillStyle = '#F3F7F2'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#25543F';
  ctx.font = 'bold ' + Math.round(H * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① まっしろな りな に、じぶんで 色をぬる',
    '　 みぎの ステージの絵を「スポイト」で つつくと、その色が つかえる',
    '② かくれる ばしょを えらぶ。にている ところほど「ぎたい度」が 上がる',
    '③ パパが さがしに くる。' + SEEK_TIME + 'びょう 見つからなければ かち',
    '　 うごくと 見つかりやすい。じっとして やりすごそう',
    '　 パパが 立ちどまって じーっと 見ているときが あぶない',
  ];
  ctx.font = Math.round(H * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#3C5A4B';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, H * 0.045);
    ctx.fillText(s, H * 0.05, H * 0.19 + i * H * 0.088);
  });
  const bh = H * 0.11;
  drawButton(button(H * 0.05, H - bh - H * 0.05, H * 0.4, bh,
                    () => { game.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- お絵かき -------------------------------------------------------------

function drawPaint() {
  ctx.fillStyle = '#EFF3F6'; ctx.fillRect(0, 0, W, H);
  const pad = H * 0.025;

  // 見出し
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#26374F';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
  ctx.fillText((game.round + 1) + 'かいめ：' + game.stage.name + ' に ばける', pad, pad);
  ctx.fillStyle = '#5F7185';
  ctx.font = Math.round(H * 0.032) + 'px system-ui, sans-serif';
  ctx.fillText('スポイトで 右の絵から色を とれるよ', pad, pad + H * 0.062);

  // 左：りな
  const top = pad + H * 0.11;
  const areaH = H - top - pad * 2 - H * 0.12;
  const rh = areaH, rw = rh * (PW / PH);
  const rx = pad + H * 0.02, ry = top;
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, rx - H * 0.02, ry - H * 0.01, rw + H * 0.04, rh + H * 0.02, H * 0.02);
  ctx.fill();
  ctx.strokeStyle = '#D6DEE6'; ctx.lineWidth = 2; ctx.stroke();
  drawRina(ctx, rx, ry, rw, rh, paint.pose,
           { outline: 'rgba(60,80,100,0.45)', lw: 2, dash: [6, 5] });
  ui.areas.paint = { x: rx, y: ry, w: rw, h: rh };
  ui.buttons.push({ x: rx, y: ry, w: rw, h: rh, tag: 'canvas' });

  // 右：道具。たてに入りきるよう、使える高さを先に分けてから置く
  const px0 = rx + rw + H * 0.06;
  const pw = W - px0 - pad;
  const gap = H * 0.012;
  const goH = H * 0.115;
  const bottom = H - pad - goH - gap;
  const avail = bottom - top;
  const th = Math.min(avail * 0.42, pw * 0.5);
  const rest = avail - th - gap * 4;
  const palH = rest * 0.38;            // 色（2 段）
  const rowH = (rest - palH) / 3;      // 太さ・道具・ポーズ

  // ステージの見本
  const tw = pw;
  const t = makeThumb(game.stage, tw, th);
  ctx.drawImage(t.cv, px0, top, tw, th);
  ctx.strokeStyle = paint.spuit ? '#F0803C' : '#C8D2DC';
  ctx.lineWidth = paint.spuit ? 4 : 2;
  ctx.strokeRect(px0, top, tw, th);
  ui.buttons.push({ x: px0, y: top, w: tw, h: th, tag: 'thumb' });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(px0, top + th - H * 0.045, tw, H * 0.045);
  ctx.fillStyle = '#33465C';
  ctx.font = Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(paint.spuit ? 'スポイト中：この絵を つついて 色をとる' : game.stage.hint,
               px0 + tw / 2, top + th - H * 0.038);
  ctx.textAlign = 'left';

  // 色
  let y = top + th + gap;
  const cols = 8, cw = tw / cols, chh = palH / 2;
  for (let i = 0; i < PALETTE.length; i++) {
    const bx = px0 + (i % cols) * cw, by = y + ((i / cols) | 0) * chh;
    const col = PALETTE[i];
    ctx.fillStyle = col;
    rr(ctx, bx + 2, by + 2, cw - 4, chh - 4, 5); ctx.fill();
    ctx.strokeStyle = paint.color === col ? '#F0803C' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = paint.color === col ? 3 : 1;
    ctx.stroke();
    ui.buttons.push({ x: bx, y: by, w: cw, h: chh, tag: 'color', col });
  }
  y += palH + gap;

  // 太さ
  const bw3 = (tw - gap * 2) / 3;
  BRUSHES.forEach(([sz, label], i) => {
    const b = button(px0 + i * (bw3 + gap), y, bw3, rowH - gap, () => {
      paint.size = sz; paint.spuit = false;
    }, 'brush');
    drawButton(b, label, paint.size === sz ? '#FFD166' : '#FFFFFF');
  });
  y += rowH;

  // 道具
  const bw4 = (tw - gap * 3) / 4;
  const tools = [
    ['スポイト', () => { paint.spuit = !paint.spuit; }, paint.spuit],
    ['ぜんぶ', () => paintFill(), false],
    ['もどす', () => paintUndo(), false],
    ['けす', () => { paintPush(); paintReset(); }, false],
  ];
  tools.forEach(([label, on, act], i) => {
    drawButton(button(px0 + i * (bw4 + gap), y, bw4, rowH - gap, on, 'tool'),
               label, act ? '#F0803C' : '#E4ECF3', act ? '#FFFFFF' : '#22304A');
  });
  y += rowH;

  // ポーズ
  const bw5 = (tw - gap * 2) / 3;
  POSES.forEach((label, i) => {
    drawButton(button(px0 + i * (bw5 + gap), y, bw5, rowH - gap,
                      () => { paint.pose = i; }, 'pose'),
               label, paint.pose === i ? '#FFD166' : '#FFFFFF');
  });

  // すすむ
  drawButton(button(px0, H - goH - pad, tw, goH, goHide), 'かくれに いく →', '#7FD0A0');
}

// --- かくれる -------------------------------------------------------------

function hideCameo() {
  const r = hideRect(W, H, game.hideX * W, game.hideY * H);
  return camoScore(W, H, game.stage, r, paint.pose);
}

function drawHide() {
  drawStageBg(ctx, W, H, game.stage);
  const r = hideRect(W, H, game.hideX * W, game.hideY * H);
  drawRina(ctx, r.x, r.y, r.w, r.h, paint.pose,
           { outline: 'rgba(255,255,255,0.85)', lw: 2, dash: [7, 6] });
  ui.buttons.push({ x: r.x, y: r.y, w: r.w, h: r.h, tag: 'move' });

  // 上のおび
  ctx.fillStyle = 'rgba(12,20,32,0.55)';
  ctx.fillRect(0, 0, W, H * 0.13);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
  ctx.fillText('りなを ドラッグして かくれる ばしょを えらぼう', H * 0.03, H * 0.065);

  // ぎたい度
  const camo = game.camo;
  const bw = W * 0.32, bx = W - bw - H * 0.03, by = H * 0.16;
  ctx.fillStyle = 'rgba(12,20,32,0.5)';
  rr(ctx, bx - H * 0.02, by - H * 0.05, bw + H * 0.04, H * 0.115, H * 0.02); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = Math.round(H * 0.034) + 'px system-ui, sans-serif';
  ctx.fillText('ぎたい度 ' + Math.round(camo * 100) + '%', bx, by - H * 0.02);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  rr(ctx, bx, by + H * 0.012, bw, H * 0.028, H * 0.014); ctx.fill();
  ctx.fillStyle = camo > 0.7 ? '#7FE0A0' : camo > 0.45 ? '#FFD166' : '#FF9C7A';
  rr(ctx, bx, by + H * 0.012, Math.max(4, bw * camo), H * 0.028, H * 0.014); ctx.fill();

  // 今いる場所の柄
  ctx.fillStyle = 'rgba(12,20,32,0.55)';
  const zl = ZONE_LABEL[zoneAt(game.stage, W, game.hideX * W)] || '';
  const lw = ctx.measureText(zl).width + H * 0.06;
  rr(ctx, r.x + r.w / 2 - lw / 2, r.y - H * 0.06, lw, H * 0.05, H * 0.02); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(zl, r.x + r.w / 2, r.y - H * 0.035);
  ctx.textAlign = 'left';

  const bh = H * 0.12;
  drawButton(button(H * 0.03, H - bh - H * 0.03, W * 0.24, bh,
                    () => { game.screen = 'paint'; }), '← ぬりなおす', '#E4ECF3');
  drawButton(button(W - W * 0.3 - H * 0.03, H - bh - H * 0.03, W * 0.3, bh,
                    () => goSeek(W, H)), 'ここに かくれる！', '#FFD166');
}

// --- さがされる -----------------------------------------------------------

function drawPapa(x, y, w, h, t, right, staring) {
  const cx = x + w / 2;
  const step = Math.sin(t * 6) * w * 0.12;
  ctx.fillStyle = '#3B4A63';
  rr(ctx, cx - w * 0.22 + step, y + h * 0.72, w * 0.18, h * 0.28, w * 0.06); ctx.fill();
  rr(ctx, cx + w * 0.04 - step, y + h * 0.72, w * 0.18, h * 0.28, w * 0.06); ctx.fill();
  ctx.fillStyle = '#4E7FC0';
  rr(ctx, cx - w * 0.3, y + h * 0.34, w * 0.6, h * 0.42, w * 0.14); ctx.fill();
  ctx.fillStyle = '#FFE3D0';
  ctx.beginPath(); ctx.arc(cx, y + h * 0.22, w * 0.24, 0, 7); ctx.fill();
  ctx.fillStyle = '#3C3A44';
  ctx.beginPath(); ctx.arc(cx, y + h * 0.16, w * 0.25, Math.PI, 0); ctx.fill();
  // めがね
  ctx.strokeStyle = '#2D3648'; ctx.lineWidth = Math.max(1.5, w * 0.028);
  const ex = right ? w * 0.03 : -w * 0.03;
  ctx.beginPath(); ctx.arc(cx - w * 0.1 + ex, y + h * 0.23, w * 0.085, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + w * 0.1 + ex, y + h * 0.23, w * 0.085, 0, 7); ctx.stroke();
  ctx.fillStyle = '#2B2230';
  ctx.beginPath(); ctx.arc(cx - w * 0.1 + ex, y + h * 0.23, w * 0.04, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w * 0.1 + ex, y + h * 0.23, w * 0.04, 0, 7); ctx.fill();
  if (staring) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.round(w * 0.5) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('？', cx, y - h * 0.06);
  }
}

function drawSeek() {
  drawStageBg(ctx, W, H, game.stage);
  const r = hideRect(W, H, game.hideX * W, game.hideY * H);
  const blink = Math.sin(game.t * 1.7) > 0.97;
  drawRina(ctx, r.x, r.y, r.w, r.h, paint.pose, { blink });

  const s = game.seeker;
  const ph = H * 0.30, pw = ph * 0.55;
  const floorY = H * (1 - FLOOR_RATIO) + H * 0.02;
  drawPapa(s.x * W - pw / 2, floorY - ph, pw, ph, game.t, s.dir > 0, s.stare > 0);

  // HUD
  ctx.fillStyle = 'rgba(12,20,32,0.5)';
  ctx.fillRect(0, 0, W, H * 0.11);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.05) + 'px system-ui, sans-serif';
  ctx.fillText('のこり ' + Math.max(0, Math.ceil(game.timeLeft)) + ' びょう', H * 0.03, H * 0.055);
  ctx.font = Math.round(H * 0.035) + 'px system-ui, sans-serif';
  ctx.fillText('ぎたい度 ' + Math.round(game.camo * 100) + '%', W * 0.3, H * 0.055);

  // 見つかりそうゲージ
  const gw = W * 0.3, gx = W - gw - H * 0.03;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  rr(ctx, gx, H * 0.037, gw, H * 0.036, H * 0.018); ctx.fill();
  ctx.fillStyle = game.sus > 0.7 ? '#FF6B6B' : game.sus > 0.35 ? '#FFB84D' : '#8FE0A8';
  rr(ctx, gx, H * 0.037, Math.max(3, gw * game.sus), H * 0.036, H * 0.018); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.font = Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.fillText('みつかりそう', gx - H * 0.015, H * 0.055);
  ctx.textAlign = 'left';

  if (game.msgT > 0) {
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.fillStyle = 'rgba(12,20,32,0.6)';
    ctx.fillRect(0, H * 0.4, W, H * 0.12);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(H * 0.06) + 'px system-ui, sans-serif';
    ctx.fillText(game.msg, W / 2, H * 0.46);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // そっと動くボタン
  const bs = H * 0.17, m = H * 0.03;
  for (const [tag, label, dx] of [['left', '◀', -1], ['right', '▶', 1]]) {
    const bx = dx < 0 ? m : m + bs * 1.15;
    const by = H - bs - m;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    rr(ctx, bx, by, bs, bs, bs * 0.3); ctx.fill();
    ctx.fillStyle = '#3A4560';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(bs * 0.5) + 'px system-ui, sans-serif';
    ctx.fillText(label, bx + bs / 2, by + bs / 2);
    ctx.globalAlpha = 1;
    ui.buttons.push({ x: bx, y: by, w: bs, h: bs, tag: 'nudge', dx });
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = Math.round(H * 0.03) + 'px system-ui, sans-serif';
  ctx.fillText('うごくと 見つかりやすい', m, H - m - bs - H * 0.035);
}

// --- けっか ---------------------------------------------------------------

function drawResult() {
  drawStageBg(ctx, W, H, game.stage);
  const r = hideRect(W, H, game.hideX * W, game.hideY * H);
  drawRina(ctx, r.x, r.y, r.w, r.h, paint.pose,
           { outline: game.found ? '#FF6B6B' : '#8FE0A8', lw: 4 });
  ctx.fillStyle = 'rgba(8,14,26,0.62)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = game.found ? '#FF9C9C' : '#A8F0C4';
  fitFont(game.found ? 'みつかった！' : 'にげきった！', W * 0.8, H * 0.11, 'bold ');
  ctx.fillText(game.found ? 'みつかった！' : 'にげきった！', W / 2, H * 0.14);

  const lines = [
    'ぎたい度 ' + Math.round(game.camo * 100) + '%',
    'かくれた ばしょ ' + (ZONE_LABEL[zoneAt(game.stage, W, game.hideX * W)] || ''),
    'この かいの てん ' + game.roundScore.toLocaleString(),
    'ごうけい ' + game.score.toLocaleString() + ' 点',
  ];
  ctx.fillStyle = '#E8EEF6';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.8, H * 0.05);
    ctx.fillText(s, W / 2, H * 0.30 + i * H * 0.075);
  });

  ctx.fillStyle = '#FFE9A8';
  fitFont(camoAdvice(), W * 0.86, H * 0.04);
  ctx.fillText(camoAdvice(), W / 2, H * 0.62);

  const bw = W * 0.34, bh = H * 0.13;
  drawButton(button(W / 2 - bw / 2, H * 0.73, bw, bh, nextRound),
             game.round + 1 >= ROUNDS ? 'けっかを みる' : 'つぎの ステージへ', '#FFD166');
}

function camoAdvice() {
  if (game.camo > 0.8) return 'かんぺき！ かべと そっくりだった';
  if (game.camo > 0.6) return 'いい かんじ。もう少し 細かい もようを 足すと もっと ばける';
  if (game.camo > 0.35) return '色は 近い。スポイトで 背景の色を とると もっと 合うよ';
  return 'まず「スポイト」で 背景の色を とって「ぜんぶ」で ぬりつぶすと 一気に ばけられる';
}

function drawEnd() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2E7D5B'); g.addColorStop(1, '#E8A25C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('ぜんぶ おわり！', W * 0.8, H * 0.12, 'bold ');
  ctx.fillText('ぜんぶ おわり！', W / 2, H * 0.12);
  const lines = [
    'ごうけい ' + game.score.toLocaleString() + ' 点',
    'さいこう ' + save.best.toLocaleString() + ' 点',
    'クリアした 回数 ' + save.cleared + ' 回',
  ];
  ctx.fillStyle = '#FFF3C4';
  lines.forEach((s, i) => {
    fitFont(s, W * 0.8, H * 0.055);
    ctx.fillText(s, W / 2, H * 0.32 + i * H * 0.085);
  });
  const bw = W * 0.3, bh = H * 0.13;
  drawButton(button(W / 2 - bw - H * 0.02, H * 0.7, bw, bh, startGame), 'もういちど', '#FFD166');
  drawButton(button(W / 2 + H * 0.02, H * 0.7, bw, bh,
                    () => { game.screen = 'title'; }), 'タイトルへ', '#CFEBD9');
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
  if (b.tag === 'canvas') {
    const a = ui.areas.paint;
    const u = (x - a.x) / a.w, v = (y - a.y) / a.h;
    if (paint.spuit) { pickFromCanvasOrThumb(u, v, true); return; }
    paintPush();
    paintDot(u, v, null);
    ui.drag = { kind: 'paint', prev: { u, v } };
  } else if (b.tag === 'thumb') {
    const u = (x - b.x) / b.w, v = (y - b.y) / b.h;
    pickFromThumb(u, v);
  } else if (b.tag === 'color') {
    paint.color = b.col; paint.spuit = false;
  } else if (b.tag === 'move') {
    ui.drag = { kind: 'move', dx: x - game.hideX * W };
  } else if (b.tag === 'nudge') {
    ui.drag = { kind: 'nudge', dx: b.dx };
  } else if (b.on) {
    b.on();
  }
  canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener('pointermove', (ev) => {
  if (!ui.drag) return;
  const { x, y } = pos(ev);
  if (ui.drag.kind === 'paint') {
    const a = ui.areas.paint;
    const u = (x - a.x) / a.w, v = (y - a.y) / a.h;
    paintDot(u, v, ui.drag.prev);
    ui.drag.prev = { u, v };
  } else if (ui.drag.kind === 'move') {
    game.hideX = Math.max(0.06, Math.min(0.94, (x - ui.drag.dx) / W));
    game.camo = hideCameo();
  }
});

function endDrag() { ui.drag = null; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function pickFromCanvasOrThumb(u, v) {
  // 下じきの上でスポイトを使ったときは、そこに塗ってある色をとる
  const x = Math.max(0, Math.min(PW - 1, Math.round(u * PW)));
  const y = Math.max(0, Math.min(PH - 1, Math.round(v * PH)));
  const d = paint.ctx.getImageData(x, y, 1, 1).data;
  paint.color = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
  paint.spuit = false;
}

window.addEventListener('keydown', (e) => {
  if (game.screen === 'seek') {
    if (e.key === 'ArrowLeft') nudge(-1);
    if (e.key === 'ArrowRight') nudge(1);
  }
});

function nudge(dir) {
  game.hideX = Math.max(0.06, Math.min(0.94, game.hideX + dir * 0.006));
  game.moveT = 0;
}

// --- たて画面 -------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#16281F'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#9FD0B0';
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

  if (game.screen === 'paint') drawPaint();
  else if (game.screen === 'hide') {
    if (!game.hideY) game.hideY = 1 - FLOOR_RATIO + 0.02;
    if (!ui.drag) game.camo = hideCameo();
    drawHide();
  } else if (game.screen === 'seek') {
    if (ui.drag && ui.drag.kind === 'nudge') nudge(ui.drag.dx);
    if (game.msgT > 0) game.msgT -= dt;
    updateSeek(dt, W, H);
    if (game.screen === 'seek') drawSeek();
  } else if (game.screen === 'result') drawResult();
  else if (game.screen === 'end') drawEnd();
  else if (game.screen === 'howto') drawHowto();
  else drawTitle();
}

game.hideY = 1 - FLOOR_RATIO + 0.02;
layout();
requestAnimationFrame(frame);
