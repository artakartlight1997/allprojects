'use strict';
// HUD・操作ボタン・オーバーレイ・エンディング、そして入力とメインループ。

const CONFETTI = ['#FFD84D', '#7BD5F2', '#FF9EC4', '#86DC64', '#B289E8'];
const BUTTON_SCALES = [[0.78, '小'], [1.0, '中'], [1.22, '大']];

// --- 全画面 -------------------------------------------------------------
// iPhone の Safari は要素の全画面表示に対応していない（対応しているのは
// 動画だけ）。その場合は「ホーム画面に追加」を案内する。
const FS_EL = document.documentElement;
const fullscreenSupported = !!(FS_EL.requestFullscreen || FS_EL.webkitRequestFullscreen);
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches;

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function enterFullscreen() {
  if (!fullscreenSupported || isFullscreen()) return;
  try {
    if (FS_EL.requestFullscreen) FS_EL.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else FS_EL.webkitRequestFullscreen();
  } catch (e) { /* 使えない端末では何もしない */ }
  // 対応している端末では横向きに固定する
  if (screen.orientation && screen.orientation.lock) {
    try {
      const r = screen.orientation.lock('landscape');
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* 非対応は無視 */ }
  }
}

function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (e) { /* 何もしない */ }
}

// --- エンディング --------------------------------------------------------
function creditLines() {
  const minutes = Math.floor(game.totalTime / 60);
  const seconds = Math.floor(game.totalTime % 60);
  return [
    '■ りなの大冒険', '',
    '■ とうじょうキャラクター',
    'りな',
    'ぷにまる    とげのすけ    ぱたぽん',
    'ぴょんた    おいかけ',
    'おうさま', '',
    '■ ぼうけんしたステージ',
    ...LEVELS.map((l) => l.title), '',
    '■ きろく',
    `あつめたコイン    ${game.coinCount} まい`,
    `さいしゅうスコア    ${game.score}`,
    `クリアタイム    ${minutes}分${seconds}秒`, '',
    '■ おわりに',
    'さいごまであそんでくれて',
    'ほんとうにありがとう！', '',
    'また あそびにきてね',
  ];
}

function drawEnding() {
  const s = viewH / VIEW_TILES_Y;
  const t = game.endingT;
  const groundY = viewH * 0.78;

  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2C1E4A');
  g.addColorStop(0.35, '#6B3A6E');
  g.addColorStop(0.72, '#E8735C');
  g.addColorStop(1, '#FFC98A');
  fillRect(0, 0, viewW, viewH, g);

  for (let i = 0; i < 50; i++) {
    const x = (((i * 137) % 100) / 100) * viewW;
    const y = (((i * 71) % 45) / 100) * viewH;
    const tw = Math.sin(t * 2 + i) * 0.5 + 0.5;
    fillCircle(x, y, s * 0.035 * (1 + (i % 2)), `rgba(255,255,255,${0.2 + tw * 0.5})`);
  }

  const sunY = viewH * (0.5 + 0.12 * Math.min(t / 25, 1));
  fillCircle(viewW * 0.5, sunY, s * 3.6, 'rgba(255,240,204,0.3)');
  fillCircle(viewW * 0.5, sunY, s * 2.3, '#FFD9A0');

  for (let layer = 0; layer < 2; layer++) {
    const c = layer === 0 ? '#6B4A78' : '#3E2C51';
    const r = s * (layer === 0 ? 3.2 : 2.4);
    const step = r * 1.4;
    const baseY = groundY - (layer === 0 ? s * 0.9 : 0);
    const offset = layer === 0 ? s * 0.7 : 0;
    for (let i = -1; i * step + offset < viewW + step; i++) {
      fillCircle(i * step + offset, baseY + r * 0.6, r, c);
    }
    fillRect(0, baseY + r * 0.55, viewW, viewH, c);
  }
  fillRect(0, groundY, viewW, viewH - groundY, '#2A1F3D');
  fillRect(0, groundY, viewW, s * 0.2, '#4A3770');

  for (let f = 0; f < 3; f++) {
    const phase = (t + f * 1.4) % 3.4;
    if (phase > 1.7) continue;
    const k = phase / 1.7;
    const fx = viewW * (0.18 + 0.32 * f);
    const fy = viewH * (0.16 + 0.09 * (f % 2));
    const rad = s * 3.4 * k;
    for (let i = 0; i < 14; i++) {
      const a = (i * (360 / 14) * Math.PI) / 180;
      fillCircle(fx + Math.cos(a) * rad, fy + Math.sin(a) * rad * 0.85,
        s * 0.085, rgba(CONFETTI[f], (1 - k) * 0.9));
    }
  }

  for (let i = 0; i < 55; i++) {
    const speed = 1.2 + ((i * 37) % 60) / 60;
    const span = viewH + s * 3;
    const y = ((t * speed * s * 1.6 + i * s * 1.9) % span) - s;
    const x = (((i * 73) % 100) / 100) * viewW + Math.sin(t * 1.6 + i) * s * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((t * 140 + i * 31) * Math.PI) / 180);
    fillRect(-s * 0.09, -s * 0.05, s * 0.18, s * 0.1, rgba(CONFETTI[i % CONFETTI.length], 0.85));
    ctx.restore();
  }

  // りなと仲間たちの行進
  const span = viewW + s * 9;
  const speed = s * 1.7;
  const followers = ['WALKER', 'JUMPER', 'FLYER', 'CHASER', 'DROPPER', 'SPIKY', 'BOSS'];
  followers.forEach((kind, i) => {
    const raw = t * speed - (i + 1) * s * 2.7;
    const x = (((raw % span) + span) % span) - s * 4.5;
    const w = kind === 'BOSS' ? s * 1.7 : s * 0.8;
    const h = kind === 'BOSS' ? s * 1.5 : s * 0.8;
    const y = groundY - h + s * 0.1;
    const tt = t * 1.4;
    if (kind === 'WALKER') drawWalker(x, y, w, h, tt, true);
    else if (kind === 'JUMPER') drawJumper(x, y, w, h, tt, false);
    else if (kind === 'CHASER') drawChaser(x, y, w, h, tt, true);
    else if (kind === 'SPIKY') drawSpiky(x, y, w, h, tt);
    else if (kind === 'DROPPER') drawDropper(x, y, w, h, tt, false);
    else if (kind === 'BOSS') drawBoss(x, y, w, h, tt, true, BOSS_HP);
    else drawFlyer(x, groundY - h - s * 1.7 + Math.sin(t * 2.4) * s * 0.35, w, h, tt, true);
  });
  const rinaX = (((t * speed % span) + span) % span) - s * 4.5;
  const rw = s * 0.72 * PLAYER_DRAW_SCALE;
  const rh = s * 0.92 * PLAYER_DRAW_SCALE;
  rinaSprite(rinaX, groundY - rh + s * 0.1, rw, rh,
    true, Math.sin(t * 13), 1, RINA_BODY, RINA_DARK);

  // スタッフロール
  const lines = creditLines();
  const lineH = s * 0.7;
  const scroll = Math.max(t - 1.5, 0) * s * 1.15;
  const fadeTop = viewH * 0.2;
  ctx.textAlign = 'center';
  lines.forEach((raw, i) => {
    if (!raw) return;
    const y = groundY + s * 1.6 + i * lineH - scroll;
    if (y < fadeTop - lineH || y > viewH + lineH) return;
    const alpha = clamp((y - fadeTop) / (s * 1.6), 0, 1);
    const heading = raw.startsWith('■');
    ctx.save();
    ctx.globalAlpha = alpha;
    shadowText(heading ? raw.slice(2) : raw, viewW * 0.5, y,
      heading ? s * 0.52 : s * 0.44, heading ? '#FFD2E4' : '#FFFFFF', s * 0.16);
    ctx.restore();
  });

  const titleAlpha = clamp((t - 1) / 1.5, 0, 1);
  if (titleAlpha > 0) {
    const bounce = 1 + Math.sin(t * 2) * 0.03;
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    shadowText('おしまい', viewW * 0.5, viewH * 0.145, s * 1.05 * bounce, '#FFF0F5', s * 0.24);
    ctx.restore();
  }
}

// --- HUD ----------------------------------------------------------------
function badge(x, y, text, color, fs) {
  setFont(fs);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const padX = fs * 0.65;
  const w = ctx.measureText(text).width + padX * 2;
  const h = fs * 1.9;
  fillRoundRect(x, y, w, h, h * 0.42, color);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x + padX, y + h * 0.55);
  return w;
}

function drawHud() {
  const compact = viewH < 420;
  const fs = compact ? 12 : 14;
  const pad = compact ? 10 : 16;
  let x = pad;
  const y = compact ? 6 : 9;
  x += badge(x, y, `♥ ${game.lives}`, 'rgba(255,107,138,0.8)', fs) + 6;
  x += badge(x, y, `● ${game.coinCount}`, 'rgba(255,201,61,0.8)', fs) + 6;
  x += badge(x, y, `${game.score}`, 'rgba(43,43,58,0.67)', fs) + 6;

  const label = compact
    ? `${game.levelIndex + 1}/${LEVELS.length}`
    : `${game.levelIndex + 1}/${LEVELS.length}  ${game.level.title}`;
  setFont(fs);
  const rw = ctx.measureText(label).width + fs * 1.3;
  badge(viewW - pad - rw, y, label, 'rgba(43,43,58,0.67)', fs);
  if (game.goalLocked) {
    setFont(fs);
    const bw = ctx.measureText('ボスを たおせ!').width + fs * 1.3;
    badge(viewW - pad - rw - bw - 6, y, 'ボスを たおせ!', 'rgba(224,72,63,0.8)', fs);
  }

  // 効果時間つきアイテム
  const p = game.player;
  const items = [];
  if (p.hasShield) items.push(['◎ バリア', null, 'rgba(127,181,255,0.8)']);
  if (p.starT > 0) items.push(['★', p.starT, 'rgba(255,201,61,0.8)']);
  if (p.dashT > 0) items.push(['⚡', p.dashT, 'rgba(79,195,247,0.8)']);
  if (p.featherT > 0) items.push(['羽', p.featherT, 'rgba(95,216,160,0.8)']);
  if (p.magnetT > 0) items.push(['磁', p.magnetT, 'rgba(255,122,122,0.8)']);
  let bx = pad;
  const by = y + fs * 1.9 + 5;
  for (const [label2, remain, color] of items) {
    const text = remain === null ? label2 : `${label2} ${Math.ceil(remain)}`;
    bx += badge(bx, by, text, color, fs) + 6;
  }
}

// --- 操作ボタン ---------------------------------------------------------
function drawControls() {
  const pad = clamp(viewH * 0.045, 10, 26);
  const move = clamp(viewH * 0.185 * uiScale, 46, 92);
  const jump = clamp(viewH * 0.225 * uiScale, 56, 112);
  const gap = pad * 0.6;

  ui.left = { x: pad + move / 2, y: viewH - pad - move / 2, r: move / 2 };
  ui.right = { x: pad + move * 1.5 + gap, y: viewH - pad - move / 2, r: move / 2 };
  ui.jump = { x: viewW - pad - jump / 2, y: viewH - pad - jump / 2, r: jump / 2 };

  // りなと重なるボタンは薄くして、キャラが隠れないようにする
  const low = game.playerViewY > 0.62;
  const leftAlpha = low && game.playerViewX < 0.34 ? 0.2 : 1;
  const rightAlpha = low && game.playerViewX > 0.74 ? 0.2 : 1;

  const pad3 = (btn, label, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    fillCircle(btn.x, btn.y, btn.r, 'rgba(255,255,255,0.25)');
    strokeCircle(btn.x, btn.y, btn.r - 1, 'rgba(255,255,255,0.55)', 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont(btn.r * 0.72);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, btn.x, btn.y + btn.r * 0.04);
    ctx.restore();
  };
  pad3(ui.left, '◀', leftAlpha);
  pad3(ui.right, '▶', leftAlpha);
  pad3(ui.jump, '▲', rightAlpha);
}

// --- オーバーレイ -------------------------------------------------------
function overlayText() {
  switch (game.phase) {
    case 'TITLE':
      return ['りなの大冒険', [
        '◀ ▶ で歩いて、▲ でジャンプ（長押しで高く跳ぶ）',
        '敵は上から踏むとやっつけられる。紫のトゲだけは踏めない！',
        `ぜんぶで ${LEVELS.length} ステージ。最後はボスが待っている`,
      ], 'ぼうけんを はじめる'];
    case 'LEVEL_CLEAR':
      return [`ステージ ${game.levelIndex + 1} クリア！`, [
        `コイン ${game.coinCount} まい / スコア ${game.score}`,
        game.lastBonus > 0 ? `タイムボーナス +${game.lastBonus}` : 'つぎはもっと速く！',
      ], game.levelIndex + 1 >= LEVELS.length ? 'けっかを みる' : 'つぎのステージへ'];
    case 'GAME_OVER':
      return ['ゲームオーバー', [`スコア ${game.score}`, 'もういちど挑戦しよう！'], 'タイトルへ'];
    case 'ALL_CLEAR':
      return ['ぼうけんの きろく', [
        `ぜん ${LEVELS.length} ステージ クリア！`,
        `あつめたコイン ${game.coinCount} まい`,
        `さいしゅうスコア ${game.score}`,
        `クリアタイム ${Math.floor(game.totalTime / 60)}分${Math.floor(game.totalTime % 60)}秒`,
      ], 'タイトルへ'];
    default:
      return ['', [], ''];
  }
}

function drawOverlay() {
  const [title, body, btnLabel] = overlayText();
  fillRect(0, 0, viewW, viewH, 'rgba(0,0,0,0.67)');

  const isTitle = game.phase === 'TITLE';
  const titleSize = clamp(viewH * 0.095, 24, 42);
  const bodySize = clamp(viewH * 0.042, 12, 17);
  const lineH = bodySize * 1.55;
  const pickerH = isTitle ? bodySize * 3.4 : 0;
  const btnH = clamp(viewH * 0.115, 38, 54);

  const total = titleSize + 12 + body.length * lineH + pickerH + 18 + btnH;
  let y = (viewH - total) / 2 + titleSize;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  shadowText(title, viewW / 2, y, titleSize, '#FFE9F2', titleSize * 0.3);
  y += 12;
  setFont(bodySize);
  ctx.fillStyle = '#E8E4F0';
  for (const lineText of body) {
    y += lineH;
    ctx.fillText(lineText, viewW / 2, y);
  }

  ui.sizeBtns = [];
  if (isTitle) {
    y += bodySize * 2.2;
    setFont(bodySize);
    const labelW = ctx.measureText('ボタンの大きさ').width;
    const cellW = bodySize * 3.2;
    const totalW = labelW + 10 + cellW * BUTTON_SCALES.length + 8 * (BUTTON_SCALES.length - 1);
    let bx = viewW / 2 - totalW / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#B9A9C9';
    ctx.fillText('ボタンの大きさ', bx, y);
    bx += labelW + 10;
    const cellH = bodySize * 2.2;
    for (const [scale, label] of BUTTON_SCALES) {
      const selected = Math.abs(uiScale - scale) < 0.001;
      fillRoundRect(bx, y - cellH * 0.72, cellW, cellH, cellH * 0.35,
        selected ? '#FF8FBB' : 'rgba(255,255,255,0.2)');
      ctx.fillStyle = selected ? '#3A2430' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + cellW / 2, y + cellH * 0.08);
      ui.sizeBtns.push({ x: bx, y: y - cellH * 0.72, w: cellW, h: cellH, scale });
      bx += cellW + 8;
      ctx.textAlign = 'left';
    }
    y += cellH * 0.5;

    // 全画面。iPhone の Safari は非対応なので、その場合は案内文にする。
    y += bodySize * 1.9;
    if (fullscreenSupported && !isStandalone) {
      const label = isFullscreen() ? 'ぜんがめんを やめる' : 'ぜんがめんにする';
      setFont(bodySize);
      const fw = ctx.measureText(label).width + cellH * 1.4;
      const fx = viewW / 2 - fw / 2;
      fillRoundRect(fx, y - cellH * 0.72, fw, cellH, cellH * 0.35, 'rgba(255,255,255,0.2)');
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, viewW / 2, y + cellH * 0.08);
      ui.fsBtn = { x: fx, y: y - cellH * 0.72, w: fw, h: cellH };
    } else if (!isStandalone) {
      setFont(bodySize * 0.92);
      ctx.fillStyle = '#B9A9C9';
      ctx.textAlign = 'center';
      ctx.fillText('共有ボタン → ホーム画面に追加 で全画面になります', viewW / 2, y);
    }
    ctx.textAlign = 'left';
  }

  y += 18;
  setFont(clamp(viewH * 0.05, 15, 20));
  const bw = ctx.measureText(btnLabel).width + btnH * 1.1;
  const bxx = viewW / 2 - bw / 2;
  fillRoundRect(bxx, y, bw, btnH, btnH / 2, '#FF8FBB');
  ctx.fillStyle = '#3A2430';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btnLabel, viewW / 2, y + btnH * 0.55);
  ui.overlayBtn = { x: bxx, y, w: bw, h: btnH };
}

function drawEndingButton() {
  if (game.endingT < 4) { ui.overlayBtn = null; return; }
  const h = clamp(viewH * 0.1, 34, 48);
  setFont(clamp(viewH * 0.042, 13, 17));
  const label = 'けっかを みる';
  const w = ctx.measureText(label).width + h * 1.2;
  const x = viewW - w - 22;
  const y = viewH - h - 20;
  fillRoundRect(x, y, w, h, h / 2, 'rgba(255,143,187,0.85)');
  ctx.fillStyle = '#3A2430';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h * 0.55);
  ui.overlayBtn = { x, y, w, h };
}

// --- 画面全体 -----------------------------------------------------------
function drawScene() {
  ui.left = ui.right = ui.jump = ui.overlayBtn = ui.fsBtn = null;
  ui.sizeBtns = [];

  if (game.phase === 'ENDING') {
    drawEnding();
    drawEndingButton();
    return;
  }

  const s = viewH / VIEW_TILES_Y;
  const cam = game.cameraX;
  const pal = PALETTES[game.level.theme];
  drawBackground(pal, cam, s);
  drawTiles(pal, cam, s);
  drawCrumbleGhosts(cam, s);
  drawMovers(pal, cam, s);
  drawCheckpoints(cam, s);
  drawGoal(cam, s);
  drawPickups(cam, s);
  drawEnemies(cam, s);
  drawPlayer(cam, s);
  drawPops(cam, s);

  drawHud();
  if (game.phase === 'PLAYING' || game.phase === 'DYING') drawControls();
  else drawOverlay();
}

function drawRotateNotice() {
  fillRect(0, 0, viewW, viewH, '#191223');
  const s = Math.min(viewW, viewH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = viewW / 2, cy = viewH * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(Date.now() / 500) * 0.25 - 0.25);
  fillRoundRect(-s * 0.13, -s * 0.21, s * 0.26, s * 0.42, s * 0.035, '#3B2C4F');
  fillRoundRect(-s * 0.11, -s * 0.185, s * 0.22, s * 0.37, s * 0.02, '#FF9EC4');
  ctx.restore();
  setFont(clamp(s * 0.055, 15, 26));
  ctx.fillStyle = '#F4ECF7';
  ctx.fillText('よこ向きにしてね', cx, viewH * 0.75);
  setFont(clamp(s * 0.038, 11, 16));
  ctx.fillStyle = '#B9A9C9';
  ctx.fillText('画面の向きのロックを外してください', cx, viewH * 0.82);
}

// --- 入力 ---------------------------------------------------------------
const pointerTargets = new Map();

function hitCircle(btn, x, y) {
  if (!btn) return false;
  // 指では狙いがぶれるので、見た目より少し広く取る
  const r = btn.r * 1.25;
  return (x - btn.x) ** 2 + (y - btn.y) ** 2 <= r * r;
}
function hitRect(r, x, y) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return [e.clientX - rect.left, e.clientY - rect.top];
}

function onDown(e) {
  const [x, y] = pointerPos(e);
  if (game.phase === 'PLAYING' || game.phase === 'DYING') {
    if (hitCircle(ui.left, x, y)) { pointerTargets.set(e.pointerId, 'left'); game.inputLeft = true; return; }
    if (hitCircle(ui.right, x, y)) { pointerTargets.set(e.pointerId, 'right'); game.inputRight = true; return; }
    if (hitCircle(ui.jump, x, y)) { pointerTargets.set(e.pointerId, 'jump'); game.pressJump(); return; }
    return;
  }
  for (const b of ui.sizeBtns) {
    if (hitRect(b, x, y)) { uiScale = b.scale; return; }
  }
  if (hitRect(ui.fsBtn, x, y)) {
    if (isFullscreen()) exitFullscreen(); else enterFullscreen();
    return;
  }
  if (hitRect(ui.overlayBtn, x, y)) {
    // 「はじめる」を押した流れでそのまま全画面にする（操作が必要なため）
    if (game.phase === 'TITLE') enterFullscreen();
    game.advance();
  }
}

function onUp(e) {
  const target = pointerTargets.get(e.pointerId);
  if (!target) return;
  pointerTargets.delete(e.pointerId);
  if (target === 'left') game.inputLeft = false;
  else if (target === 'right') game.inputRight = false;
  else if (target === 'jump') game.releaseJump();
}

canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(e); });
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('pointerleave', onUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// PC でも遊べるようにキーボードも受ける
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', Space: 'jump', KeyW: 'jump', KeyZ: 'jump',
};
window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (game.phase !== 'PLAYING' && game.phase !== 'DYING') {
    if (k === 'jump') game.advance();
    return;
  }
  if (k === 'left') game.inputLeft = true;
  else if (k === 'right') game.inputRight = true;
  else game.pressJump();
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if (k === 'left') game.inputLeft = false;
  else if (k === 'right') game.inputRight = false;
  else game.releaseJump();
});

// --- メインループ -------------------------------------------------------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = canvas.clientWidth;
  viewH = canvas.clientHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (canvas.clientWidth !== viewW || canvas.clientHeight !== viewH) resize();
  const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
  last = now;

  // 縦画面ではゲームを止めて、回すよう促す
  if (viewH > viewW * 1.05) {
    game.clearInput();
    drawRotateNotice();
    return;
  }
  game.update(dt, viewW / (viewH / VIEW_TILES_Y));
  drawScene();
}

resize();
requestAnimationFrame(frame);
