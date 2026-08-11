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
    'ぴょんた    おいかけ    どんぐり',
    'パパ    ママ', '',
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
  const followers = ['WALKER', 'JUMPER', 'FLYER', 'CHASER', 'DROPPER', 'SPIKY', 'PAPA', 'BOSS'];
  followers.forEach((kind, i) => {
    const raw = t * speed - (i + 1) * s * 2.7;
    const x = (((raw % span) + span) % span) - s * 4.5;
    const big = kind === 'BOSS' || kind === 'PAPA';
    const w = big ? s * 1.7 : s * 0.8;
    const h = big ? s * 1.5 : s * 0.8;
    const y = groundY - h + s * 0.1;
    const tt = t * 1.4;
    if (kind === 'WALKER') drawWalker(x, y, w, h, tt, true);
    else if (kind === 'JUMPER') drawJumper(x, y, w, h, tt, false);
    else if (kind === 'CHASER') drawChaser(x, y, w, h, tt, true);
    else if (kind === 'SPIKY') drawSpiky(x, y, w, h, tt);
    else if (kind === 'DROPPER') drawDropper(x, y, w, h, tt, false);
    else if (kind === 'PAPA') drawBoss(x, y, w, h, tt, true, PAPA_HP, 'PAPA', PAPA_HP);
    else if (kind === 'BOSS') drawBoss(x, y, w, h, tt, true, BOSS_HP, 'MAMA', BOSS_HP);
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

// --- ボス登場 -----------------------------------------------------------
function drawBossIntro(cam, s) {
  const boss = game.introBoss;
  if (!boss) return;
  const k = clamp(1 - game.introT / BOSS_INTRO_TIME, 0, 1);   // 0 -> 1
  const cx = (boss.x + boss.w / 2 - cam) * s;
  const cy = (boss.y + boss.h / 2) * s;

  // 出はじめの白いフラッシュ
  if (k < 0.12) fillRect(0, 0, viewW, viewH, `rgba(255,255,255,${(0.12 - k) * 5})`);
  // 少し暗くして主役を立たせる
  const dim = Math.min(k * 5, 1) * Math.min((1 - k) * 5, 1) * 0.4;
  fillRect(0, 0, viewW, viewH, `rgba(20,10,30,${dim})`);

  // 集中線
  ctx.save();
  ctx.globalAlpha = Math.min((1 - k) * 3, 1) * 0.5;
  for (let i = 0; i < 18; i++) {
    const a = (i * (360 / 18) + k * 40) * Math.PI / 180;
    const r0 = s * (1.4 + k * 3.5);
    const r1 = r0 + s * (1.6 + Math.sin(i * 2.3) * 0.8);
    line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
      cx + Math.cos(a) * r1, cy + Math.sin(a) * r1,
      i % 2 ? '#FFE9A8' : '#FFFFFF', s * 0.06);
  }
  ctx.restore();

  // 広がる輪
  for (let i = 0; i < 3; i++) {
    const p = k * 1.7 - i * 0.2;
    if (p < 0 || p > 1) continue;
    strokeCircle(cx, cy, s * (0.5 + p * 5.5), `rgba(255,255,255,${(1 - p) * 0.5})`, s * 0.1);
  }

  // きらきら
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 + k * 90) * Math.PI / 180;
    const d = s * (1.2 + k * 3.2);
    const r = s * 0.13 * (1 - k);
    fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, Math.max(r, 0),
      i % 3 === 0 ? '#FFD84D' : '#FFFFFF');
  }

  // 名前
  const name = boss.boss === 'PAPA' ? 'パパ とうじょう!' : 'ママ とうじょう!';
  const grow = clamp((k - 0.1) / 0.25, 0, 1);
  const fade = clamp((1 - k) / 0.2, 0, 1);
  const size = s * 1.15 * (0.4 + grow * 0.6) * (1 + Math.sin(k * 18) * 0.03 * (1 - grow));
  ctx.save();
  ctx.globalAlpha = fade;
  shadowText(name, viewW / 2, viewH * 0.3, size, '#FFF3C4', s * 0.3);
  const sub = boss.boss === 'PAPA' ? '2かい ふんで やっつけよう' : 'スライムに きをつけて!';
  shadowText(sub, viewW / 2, viewH * 0.4, s * 0.42, '#FFFFFF', s * 0.16);
  ctx.restore();
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
  const hp = game.player.hp;
  const hearts = '♥'.repeat(Math.max(hp, 0)) + '♡'.repeat(Math.max(PLAYER_MAX_HP - hp, 0));
  x += badge(x, y, hearts, 'rgba(255,107,138,0.8)', fs) + 6;
  x += badge(x, y, `のこり ${game.lives}`, 'rgba(43,43,58,0.67)', fs) + 6;
  x += badge(x, y, `● ${game.coinCount}`, 'rgba(255,201,61,0.8)', fs) + 6;
  x += badge(x, y, `${game.score}`, 'rgba(43,43,58,0.67)', fs) + 6;

  const label = compact
    ? `${game.levelIndex + 1}/${LEVELS.length}`
    : `${game.levelIndex + 1}/${LEVELS.length}  ${game.level.title}`;
  setFont(fs);
  const rw = ctx.measureText(label).width + fs * 1.3;
  badge(viewW - pad - rw, y, label, 'rgba(43,43,58,0.67)', fs);
  if (game.goalLocked) {
    const who = game.aliveBoss() === 'PAPA' ? 'パパと しょうぶ!' : 'ママと しょうぶ!';
    setFont(fs);
    const bw = ctx.measureText(who).width + fs * 1.3;
    badge(viewW - pad - rw - bw - 6, y, who, 'rgba(224,72,63,0.8)', fs);
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
    case 'TITLE': {
      const body = [
        '◀ ▶ で歩いて、▲ でジャンプ（長押しで高く跳ぶ）',
        '敵は上から踏むとやっつけられる。紫のトゲだけは踏めない！',
      ];
      if (save.maxStage > 0) {
        body.push(`クリアしたステージから つづきができるよ（最高 ${save.best} 点）`);
      } else {
        body.push(`ぜんぶで ${LEVELS.length} ステージ。最後はボスが待っている`);
      }
      const label = game.startIndex > 0
        ? `ステージ ${game.startIndex + 1} から はじめる`
        : 'ぼうけんを はじめる';
      return ['りなの大冒険', body, label];
    }
    case 'LEVEL_CLEAR':
      return [`ステージ ${game.levelIndex + 1} クリア！`, [
        `コイン ${game.coinCount} まい / スコア ${game.score}`,
        game.lastBonus > 0 ? `タイムボーナス +${game.lastBonus}` : 'つぎはもっと速く！',
      ], game.levelIndex + 1 >= LEVELS.length ? 'けっかを みる' : 'つぎのステージへ'];
    case 'GAME_OVER':
      return ['ゲームオーバー', [
        `スコア ${game.score}`,
        `ステージ ${Math.min(save.maxStage, LEVELS.length - 1) + 1} から やりなおせるよ`,
      ], 'タイトルへ'];
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

// ほかの ゲームを えらぶ 入口（ゲームランド）へ もどる
function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}

// タイトルの 左上のすみに 小さく 置く。
// この画面は たてに ぎっしりなので、高さの 計算には まぜず 角に 重ねる。
function drawHubButton() {
  const h = clamp(viewH * 0.1, 34, 44);
  setFont(h * 0.42);
  const label = '≡ ゲームをえらぶ';
  const w = ctx.measureText(label).width + h * 0.9;
  const x = 10, y = 10;
  fillRoundRect(x, y, w, h, h / 2, 'rgba(255,255,255,0.86)');
  ctx.fillStyle = '#33304A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ui.hubBtn = { x, y, w, h };
}

function drawOverlay() {
  const [title, body, btnLabel] = overlayText();
  fillRect(0, 0, viewW, viewH, 'rgba(0,0,0,0.67)');

  const isTitle = game.phase === 'TITLE';
  const showFs = isTitle && !isStandalone;
  let titleSize = clamp(viewH * 0.095, 24, 42);
  let bodySize = clamp(viewH * 0.042, 12, 17);
  let btnH = clamp(viewH * 0.115, 38, 54);

  // タイトルは「ステージえらび」「ボタンの大きさ」「ぜんがめん」と中身が多い。
  // 画面の低い端末で「はじめる」が下にはみ出さないよう、
  // 全部の高さを足してから、入らないぶんだけ縮める。
  const measure = () => {
    let h = titleSize + 12 + body.length * bodySize * 1.55;
    if (isTitle) {
      h += bodySize * 2.1 + stagePickerHeight(bodySize);   // ステージえらび
      h += bodySize * 2.2 + bodySize * 2.2;                // ボタンの大きさ
      if (showFs) h += bodySize * 1.9 + bodySize * 2.2;    // ぜんがめん
    }
    return h + 18 + btnH;
  };
  let total = measure();
  const room = viewH - 10;
  if (total > room) {
    const k = room / total;
    titleSize *= k; bodySize *= k; btnH *= k;
    total = measure();
  }
  const lineH = bodySize * 1.55;
  let y = Math.max(titleSize + 4, (viewH - total) / 2 + titleSize);

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

  ui.stageBtns = [];
  if (isTitle) {
    y += bodySize * 2.1;
    y += drawStagePicker(y, bodySize);
  }
  // ★ 上の おび（gamebar）にも 同じ ボタンが あるので、ふだんは かかない。
  //   おびが 読みこめなかった ときだけ、ここに 出して にげ道を のこす。
  if (isTitle && !window.__gamebar) drawHubButton();

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

// ステージえらびのマスの大きさ。高さの見積もりと描画で同じ値を使う
function stageCellSize(bodySize) {
  const n = LEVELS.length;
  const gapX = Math.max(3, bodySize * 0.28);
  return { n, gapX, cell: Math.min(bodySize * 2.1, (viewW * 0.86 - gapX * (n - 1)) / n) };
}

function stagePickerHeight(bodySize) {
  return stageCellSize(bodySize).cell + bodySize * 0.6;
}

// ステージえらび。クリアした先までのステージを選んで始められる。
// 行けていないステージは灰色にして、押しても始まらないようにする。
function drawStagePicker(y, bodySize) {
  const { n, gapX, cell } = stageCellSize(bodySize);
  const h = cell;
  const totalW = cell * n + gapX * (n - 1);
  let x = viewW / 2 - totalW / 2;

  setFont(bodySize * 0.85);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#B9A9C9';
  ctx.fillText('ステージをえらぶ', viewW / 2, y - cell * 0.35);

  for (let i = 0; i < n; i++) {
    const unlocked = i <= save.maxStage;
    const selected = i === game.startIndex;
    fillRoundRect(x, y, cell, h, cell * 0.28,
      selected ? '#FF8FBB' : unlocked ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)');
    if (selected) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cell, h);
    }
    setFont(cell * 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = selected ? '#3A2430' : unlocked ? '#FFFFFF' : '#6B5C7A';
    ctx.fillText(unlocked ? String(i + 1) : '×', x + cell / 2, y + h * 0.54);
    ctx.textBaseline = 'alphabetic';
    if (unlocked) ui.stageBtns.push({ x, y, w: cell, h, index: i });
    x += cell + gapX;
  }
  ctx.textAlign = 'center';
  return stagePickerHeight(bodySize);
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
  ui.left = ui.right = ui.jump = ui.overlayBtn = ui.fsBtn = ui.hubBtn = null;
  ui.sizeBtns = [];
  ui.stageBtns = [];

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
  drawShots(cam, s);
  drawPlayer(cam, s);
  drawPops(cam, s);
  if (game.introT > 0) drawBossIntro(cam, s);

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
// ★ ボタンが 小さくて 押しにくい、と 言われた。
//   hitSlop を 入れると、その 大きさに とどかない ボタンだけ
//   あたる はんいが ひろがる（見た目は そのまま）。
//   まず slop なしで しらべて、どれにも あたらなかった ときだけ ひろげて さがす。
let hitSlop = 0;
function hitRect(r, x, y) {
  if (!r) return false;
  const mx = Math.max(0, (hitSlop - r.w) / 2), my = Math.max(0, (hitSlop - r.h) / 2);
  return x >= r.x - mx && x <= r.x + r.w + mx && y >= r.y - my && y <= r.y + r.h + my;
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
  // まずは きっちり、あたらなければ 少し ひろげて もう一度
  if (menuTap(x, y)) return;
  hitSlop = 40; menuTap(x, y); hitSlop = 0;
}

/** タイトルや まくの ボタン。押せたら true。 */
function menuTap(x, y) {
  if (hitRect(ui.hubBtn, x, y)) { gotoHub(); return true; }
  for (const b of ui.stageBtns || []) {
    // うしろの景色も選んだステージに変えて、どの面か分かるようにする
    if (hitRect(b, x, y)) { game.selectStage(b.index); return true; }
  }
  for (const b of ui.sizeBtns) {
    if (hitRect(b, x, y)) { uiScale = b.scale; save.btn = b.scale; storeSave(); return true; }
  }
  if (hitRect(ui.fsBtn, x, y)) {
    if (isFullscreen()) exitFullscreen(); else enterFullscreen();
    return true;
  }
  if (hitRect(ui.overlayBtn, x, y)) {
    // 「はじめる」を押した流れでそのまま全画面にする（操作が必要なため）
    if (game.phase === 'TITLE') enterFullscreen();
    game.advance();
    return true;
  }
  return false;
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
