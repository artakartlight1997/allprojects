'use strict';
// HUD・操作ボタン・タイトル・エンディング、そして 入力と メインループ。

const BUTTON_SCALES = [[0.8, '小'], [1.0, '中'], [1.25, '大']];
const CONFETTI = ['#FFD84D', '#7BD5F2', '#FF9EC4', '#86DC64', '#B289E8', '#FF8A3A'];

// --- 全画面 ---------------------------------------------------------------
const FS_EL = document.documentElement;
const fullscreenSupported = !!(FS_EL.requestFullscreen || FS_EL.webkitRequestFullscreen);
const isStandalone = window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches;
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function enterFullscreen() {
  if (!fullscreenSupported || isFullscreen()) return;
  try {
    if (FS_EL.requestFullscreen) FS_EL.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else FS_EL.webkitRequestFullscreen();
  } catch (e) {}
  if (screen.orientation && screen.orientation.lock) {
    try { const r = screen.orientation.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  }
}
function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (e) {}
}

// --- HUD ------------------------------------------------------------------
function badge(x, y, text, color, fs) {
  setFont(fs);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const padX = fs * 0.6;
  const w = ctx.measureText(text).width + padX * 2;
  const h = fs * 1.85;
  fillRoundRect(x, y, w, h, h * 0.42, color);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x + padX, y + h * 0.55);
  return w;
}

function drawHud() {
  const compact = viewH < 420;
  const fs = compact ? 12 : 14;
  const pad = compact ? 8 : 14;
  const p = game.player;
  let x = pad;
  const y = compact ? 5 : 8;
  x += badge(x, y, `のこり ${game.lives}`, 'rgba(255,107,138,0.82)', fs) + 5;
  x += badge(x, y, `● ${game.coinCount}`, 'rgba(255,201,61,0.85)', fs) + 5;
  x += badge(x, y, `${game.score}`, 'rgba(43,43,58,0.7)', fs) + 5;

  const label = compact
    ? `${game.levelIndex + 1}/${LEVELS.length}`
    : `${game.levelIndex + 1}/${LEVELS.length}  ${game.area.title}`;
  setFont(fs);
  const rw = ctx.measureText(label).width + fs * 1.25;
  badge(viewW - pad - rw, y, label, 'rgba(43,43,58,0.7)', fs);
  if (game.goalLocked && game.introDone) {
    const who = `${game.lv.boss.name} と しょうぶ！`;
    setFont(fs);
    const bw = ctx.measureText(who).width + fs * 1.25;
    badge(viewW - pad - rw - bw - 5, y, who, 'rgba(224,72,63,0.85)', fs);
  }

  // りなの じょうたい
  const items = [];
  items.push([p.weapon ? WEAPONS[p.weapon].name : (p.size > 0 ? 'おおきい りな' : 'ちび りな'),
    null, p.weapon ? rgba(WEAPONS[p.weapon].col, 0.85) : 'rgba(120,120,150,0.7)']);
  if (p.starT > 0) items.push(['★ むてき', p.starT, 'rgba(255,201,61,0.85)']);
  if (p.featherT > 0) items.push(['はね', p.featherT, 'rgba(95,216,160,0.85)']);
  if (p.magnetT > 0) items.push(['じしゃく', p.magnetT, 'rgba(255,122,122,0.85)']);
  let bx = pad;
  const by = y + fs * 1.85 + 4;
  for (const [lab, remain, color] of items) {
    bx += badge(bx, by, remain === null ? lab : `${lab} ${Math.ceil(remain)}`, color, fs) + 5;
  }

  if (game.msgT > 0 && game.msg) {
    const a = clamp(game.msgT, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    setFont(clamp(viewH * 0.045, 13, 20));
    const tw = ctx.measureText(game.msg).width + 34;
    fillRoundRect(viewW / 2 - tw / 2, viewH * 0.13, tw, viewH * 0.09, viewH * 0.045, 'rgba(30,20,45,0.82)');
    ctx.fillStyle = '#FFF0F5';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(game.msg, viewW / 2, viewH * 0.175);
    ctx.restore();
  }
}

// --- ボス登場 -------------------------------------------------------------
function drawBossIntro(cam, camY, s) {
  const boss = game.introBoss;
  if (!boss) return;
  const k = clamp(1 - game.introT / BOSS_INTRO_TIME, 0, 1);
  const cx = (boss.x + boss.w / 2 - cam) * s;
  const cy = (boss.y + boss.h / 2 - camY) * s;
  if (k < 0.12) fillRect(0, 0, viewW, viewH, `rgba(255,255,255,${(0.12 - k) * 5})`);
  const dim = Math.min(k * 5, 1) * Math.min((1 - k) * 5, 1) * 0.42;
  fillRect(0, 0, viewW, viewH, `rgba(20,10,30,${dim})`);
  ctx.save();
  ctx.globalAlpha = Math.min((1 - k) * 3, 1) * 0.5;
  for (let i = 0; i < 20; i++) {
    const a = (i * 18 + k * 40) * Math.PI / 180;
    const r0 = s * (1.6 + k * 3.8);
    const r1 = r0 + s * (1.8 + Math.sin(i * 2.3) * 0.9);
    line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
      cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, i % 2 ? '#FFE9A8' : '#FFFFFF', s * 0.06);
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const q = k * 1.7 - i * 0.2;
    if (q < 0 || q > 1) continue;
    strokeCircle(cx, cy, s * (0.5 + q * 6), `rgba(255,255,255,${(1 - q) * 0.5})`, s * 0.1);
  }
  const grow = clamp((k - 0.1) / 0.25, 0, 1);
  const fade = clamp((1 - k) / 0.2, 0, 1);
  const size = s * 1.15 * (0.4 + grow * 0.6);
  ctx.save();
  ctx.globalAlpha = fade;
  shadowText(`${game.lv.boss.name} とうじょう！`, viewW / 2, viewH * 0.3, size, '#FFF3C4', s * 0.3);
  shadowText(game.lv.boss.hint || 'ジャンプで ふんで たおそう！', viewW / 2, viewH * 0.4,
    s * 0.44, '#FFFFFF', s * 0.16);
  ctx.restore();
}

// --- 操作ボタン -----------------------------------------------------------
// じゅうじボタン（左）＋ジャンプ・こうげき（右）。
// はしごと どかんが あるので、上下も 押せる かたちに した。
function drawControls() {
  const pad = clamp(viewH * 0.04, 8, 22);
  const R = clamp(viewH * 0.155 * uiScale, 44, 96);   // じゅうじの 半径
  const jump = clamp(viewH * 0.2 * uiScale, 52, 112);
  const fire = jump * 0.76;

  const px = pad + R;
  const py = viewH - pad - R;
  ui.padC = { x: px, y: py, r: R };
  ui.jump = { x: viewW - pad - jump / 2, y: viewH - pad - jump / 2, r: jump / 2 };
  ui.fire = { x: viewW - pad - jump - fire * 0.62, y: viewH - pad - jump * 0.42 - fire / 2, r: fire / 2 };

  const low = game.playerViewY > 0.6;
  const leftA = low && game.playerViewX < 0.36 ? 0.28 : 1;
  const rightA = low && game.playerViewX > 0.72 ? 0.28 : 1;

  // じゅうじ
  ctx.save();
  ctx.globalAlpha = leftA;
  const arm = R * 0.46;
  const armL = R * 0.98;
  fillRoundRect(px - armL, py - arm, armL * 2, arm * 2, arm * 0.42, 'rgba(255,255,255,0.22)');
  fillRoundRect(px - arm, py - armL, arm * 2, armL * 2, arm * 0.42, 'rgba(255,255,255,0.22)');
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  rectPath(px - armL, py - arm, armL * 2, arm * 2, arm * 0.42); ctx.stroke();
  rectPath(px - arm, py - armL, arm * 2, armL * 2, arm * 0.42); ctx.stroke();
  const tri = (dx, dy, on) => {
    const c = on ? '#FFD24A' : 'rgba(255,255,255,0.9)';
    const bx = px + dx * armL * 0.66, by = py + dy * armL * 0.66;
    const r = arm * 0.52;
    poly([[bx + dx * r, by + dy * r],
      [bx - dx * r + dy * r, by - dy * r + dx * r],
      [bx - dx * r - dy * r, by - dy * r - dx * r]], c);
  };
  tri(-1, 0, game.inputLeft); tri(1, 0, game.inputRight);
  tri(0, -1, game.inputUp); tri(0, 1, game.inputDown);
  fillCircle(px, py, arm * 0.34, 'rgba(255,255,255,0.35)');
  ctx.restore();

  // ジャンプ
  ctx.save();
  ctx.globalAlpha = rightA;
  fillCircle(ui.jump.x, ui.jump.y, ui.jump.r, 'rgba(255,143,187,0.42)');
  strokeCircle(ui.jump.x, ui.jump.y, ui.jump.r - 1, 'rgba(255,255,255,0.7)', 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  setFont(ui.jump.r * 0.34);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('ジャンプ', ui.jump.x, ui.jump.y);

  // こうげき（ぶきが ないときは うすく）
  const p = game.player;
  const has = !!p.weapon;
  fillCircle(ui.fire.x, ui.fire.y, ui.fire.r,
    has ? rgba(WEAPONS[p.weapon].col, 0.5) : 'rgba(255,255,255,0.14)');
  strokeCircle(ui.fire.x, ui.fire.y, ui.fire.r - 1,
    has ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', 2);
  setFont(ui.fire.r * 0.36);
  ctx.fillStyle = has ? '#FFFFFF' : 'rgba(255,255,255,0.45)';
  ctx.fillText('こうげき', ui.fire.x, ui.fire.y + ui.fire.r * 0.52);
  if (has) drawWeaponIcon(p.weapon, ui.fire.x, ui.fire.y - ui.fire.r * 0.18, ui.fire.r * 0.36, game.elapsed);
  ctx.restore();
}

// --- ステージえらび -------------------------------------------------------
const PICK_COLS = 9;
function stageCell(bodySize) {
  const rows = Math.ceil(LEVELS.length / PICK_COLS);
  const gap = Math.max(3, bodySize * 0.24);
  const cell = Math.min(bodySize * 2.0, (viewW * 0.9 - gap * (PICK_COLS - 1)) / PICK_COLS);
  return { rows, gap, cell };
}
function stagePickerHeight(bodySize) {
  const { rows, gap, cell } = stageCell(bodySize);
  return rows * cell + (rows - 1) * gap + bodySize * 2.4;
}
function drawStagePicker(y, bodySize) {
  const { rows, gap, cell } = stageCell(bodySize);
  const totalW = cell * PICK_COLS + gap * (PICK_COLS - 1);
  setFont(bodySize * 0.85);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#C8B8D8';
  ctx.fillText('ステージを えらぶ（ぜんぶ 最初から あそべるよ）', viewW / 2, y - cell * 0.35);
  for (let i = 0; i < LEVELS.length; i++) {
    const r = Math.floor(i / PICK_COLS);
    const c = i % PICK_COLS;
    const cols = Math.min(PICK_COLS, LEVELS.length - r * PICK_COLS);
    const rowW = cell * cols + gap * (cols - 1);
    const x = viewW / 2 - rowW / 2 + c * (cell + gap);
    const yy = y + r * (cell + gap);
    const selected = i === game.startIndex;
    const done = !!save.cleared[i];
    fillRoundRect(x, yy, cell, cell, cell * 0.26,
      selected ? '#FF8FBB' : done ? 'rgba(122,220,128,0.35)' : 'rgba(255,255,255,0.18)');
    if (selected) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(x, yy, cell, cell); }
    setFont(cell * 0.46);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = selected ? '#3A2430' : '#FFFFFF';
    ctx.fillText(String(i + 1), x + cell / 2, yy + cell * 0.54);
    if (done) {
      setFont(cell * 0.3);
      ctx.fillStyle = '#FFE066';
      ctx.fillText('★', x + cell * 0.82, yy + cell * 0.24);
    }
    ctx.textBaseline = 'alphabetic';
    ui.stageBtns.push({ x, y: yy, w: cell, h: cell, index: i });
  }
  // えらんでいる ステージの 名前と ボス
  const lv = LEVELS[game.startIndex];
  setFont(bodySize * 1.0);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFE9F2';
  ctx.fillText(`${game.startIndex + 1}. ${lv.title}`, viewW / 2,
    y + rows * (cell + gap) + bodySize * 0.9);
  setFont(bodySize * 0.85);
  ctx.fillStyle = '#C8B8D8';
  ctx.fillText(`ボス: ${lv.boss.name}`, viewW / 2, y + rows * (cell + gap) + bodySize * 2.05);
  return stagePickerHeight(bodySize);
}

// --- オーバーレイ ---------------------------------------------------------
function overlayText() {
  switch (game.phase) {
    case 'TITLE':
      return ['りなの大冒険2', [
        'じゅうじボタンで うごく（↑↓で はしご、↓で どかんに 入る）',
        'ケーキで 大きくなる。ぶきを 取ると こうげきボタンが 使える',
        `ぜんぶで ${LEVELS.length} ステージ。ぜんぶに 大きな ボスが いる`,
      ], `ステージ ${game.startIndex + 1} を はじめる`];
    case 'LEVEL_CLEAR':
      return [`ステージ ${game.levelIndex + 1} クリア！`, [
        `${game.lv.title} を クリアした`,
        `コイン ${game.coinCount} まい / スコア ${game.score}`,
        game.lastBonus > 0 ? `タイムボーナス +${game.lastBonus}` : 'つぎは もっと はやく！',
      ], game.levelIndex + 1 >= LEVELS.length ? 'けっかを みる' : 'つぎの ステージへ'];
    case 'GAME_OVER':
      return ['ゲームオーバー', [
        `スコア ${game.score}`,
        'タイトルから すきな ステージを えらべるよ',
      ], 'タイトルへ'];
    case 'ALL_CLEAR':
      return ['ぼうけんの きろく', [
        `ぜん ${LEVELS.length} ステージ クリア！`,
        `あつめたコイン ${game.coinCount} まい`,
        `さいしゅうスコア ${game.score}`,
        `クリアタイム ${Math.floor(game.totalTime / 60)}分${Math.floor(game.totalTime % 60)}秒`,
      ], 'タイトルへ'];
    default: return ['', [], ''];
  }
}

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}

function drawHubButton() {
  const h = clamp(viewH * 0.1, 34, 44);
  setFont(h * 0.42);
  const label = '≡ ゲームをえらぶ';
  const w = ctx.measureText(label).width + h * 0.9;
  const x = 10, y = 10;
  fillRoundRect(x, y, w, h, h / 2, 'rgba(255,255,255,0.88)');
  ctx.fillStyle = '#33304A';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ui.hubBtn = { x, y, w, h };
}

function drawOverlay() {
  const [title, body, btnLabel] = overlayText();
  fillRect(0, 0, viewW, viewH, 'rgba(0,0,0,0.68)');
  const isTitle = game.phase === 'TITLE';
  const showFs = isTitle && !isStandalone;
  let titleSize = clamp(viewH * 0.085, 20, 40);
  let bodySize = clamp(viewH * 0.038, 10.5, 16);
  let btnH = clamp(viewH * 0.105, 32, 50);

  const measure = () => {
    let h = titleSize + 10 + body.length * bodySize * 1.5;
    if (isTitle) {
      h += bodySize * 2.0 + stagePickerHeight(bodySize);
      h += bodySize * 2.0 + bodySize * 2.1;
      if (showFs) h += bodySize * 1.7 + bodySize * 2.1;
    }
    return h + 14 + btnH;
  };
  let total = measure();
  const room = viewH - 8;
  if (total > room) {
    const k = room / total;
    titleSize *= k; bodySize *= k; btnH *= k;
    total = measure();
  }
  const lineH = bodySize * 1.5;
  let y = Math.max(titleSize + 4, (viewH - total) / 2 + titleSize);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  shadowText(title, viewW / 2, y, titleSize, '#FFE9F2', titleSize * 0.3);
  y += 10;
  setFont(bodySize);
  ctx.fillStyle = '#E8E4F0';
  for (const t of body) { y += lineH; ctx.fillText(t, viewW / 2, y); }

  ui.stageBtns = [];
  ui.sizeBtns = [];
  if (isTitle) {
    y += bodySize * 2.0;
    y += drawStagePicker(y, bodySize);
    // ★ 上の おび（gamebar）にも 同じ ボタンが あるので、ふだんは かかない。
    //   おびが 読みこめなかった ときだけ、ここに 出して にげ道を のこす。
    if (!window.__gamebar) drawHubButton();

    y += bodySize * 2.0;
    setFont(bodySize);
    const labelW = ctx.measureText('ボタンの大きさ').width;
    const cellW = bodySize * 3.0;
    const totalW = labelW + 10 + cellW * BUTTON_SCALES.length + 8 * (BUTTON_SCALES.length - 1);
    let bx = viewW / 2 - totalW / 2;
    const cellH = bodySize * 2.1;
    ctx.textAlign = 'left'; ctx.fillStyle = '#B9A9C9';
    ctx.fillText('ボタンの大きさ', bx, y);
    bx += labelW + 10;
    for (const [scale, label] of BUTTON_SCALES) {
      const sel = Math.abs(uiScale - scale) < 0.001;
      fillRoundRect(bx, y - cellH * 0.72, cellW, cellH, cellH * 0.35,
        sel ? '#FF8FBB' : 'rgba(255,255,255,0.2)');
      ctx.fillStyle = sel ? '#3A2430' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + cellW / 2, y + cellH * 0.08);
      ui.sizeBtns.push({ x: bx, y: y - cellH * 0.72, w: cellW, h: cellH, scale });
      bx += cellW + 8;
      ctx.textAlign = 'left';
    }
    y += cellH * 0.5;

    y += bodySize * 1.7;
    if (fullscreenSupported && !isStandalone) {
      const label = isFullscreen() ? 'ぜんがめんを やめる' : 'ぜんがめんにする';
      setFont(bodySize);
      const fw = ctx.measureText(label).width + cellH * 1.4;
      const fx = viewW / 2 - fw / 2;
      fillRoundRect(fx, y - cellH * 0.72, fw, cellH, cellH * 0.35, 'rgba(255,255,255,0.2)');
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
      ctx.fillText(label, viewW / 2, y + cellH * 0.08);
      ui.fsBtn = { x: fx, y: y - cellH * 0.72, w: fw, h: cellH };
    } else if (!isStandalone) {
      setFont(bodySize * 0.9);
      ctx.fillStyle = '#B9A9C9'; ctx.textAlign = 'center';
      ctx.fillText('共有ボタン → ホーム画面に追加 で 全画面になります', viewW / 2, y);
    }
    ctx.textAlign = 'left';
  }

  y += 14;
  setFont(clamp(viewH * 0.045, 13, 19));
  const bw = ctx.measureText(btnLabel).width + btnH * 1.1;
  const bxx = viewW / 2 - bw / 2;
  fillRoundRect(bxx, y, bw, btnH, btnH / 2, '#FF8FBB');
  ctx.fillStyle = '#3A2430';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(btnLabel, viewW / 2, y + btnH * 0.55);
  ui.overlayBtn = { x: bxx, y, w: bw, h: btnH };
}

// --- エンディング ---------------------------------------------------------
function creditLines() {
  const m = Math.floor(game.totalTime / 60), s = Math.floor(game.totalTime % 60);
  return [
    '■ りなの大冒険2', '',
    '■ たおした ボスたち',
    ...LEVELS.map((l, i) => `${i + 1}. ${l.boss.name}`), '',
    '■ きろく',
    `あつめたコイン    ${game.coinCount} まい`,
    `さいしゅうスコア    ${game.score}`,
    `クリアタイム    ${m}分${s}秒`, '',
    '■ おわりに',
    'ぜんぶの ステージを クリアした りなは',
    'せかいで いちばんの ぼうけんかに なりました。', '',
    'あそんでくれて ありがとう！',
  ];
}

function drawEnding() {
  const s = viewH / VIEW_TILES_Y;
  const t = game.endingT;
  const groundY = viewH * 0.78;
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2C1E4A'); g.addColorStop(0.35, '#6B3A6E');
  g.addColorStop(0.72, '#E8735C'); g.addColorStop(1, '#FFC98A');
  fillRect(0, 0, viewW, viewH, g);
  for (let i = 0; i < 50; i++) {
    const x = (((i * 137) % 100) / 100) * viewW;
    const y = (((i * 71) % 45) / 100) * viewH;
    const tw = Math.sin(t * 2 + i) * 0.5 + 0.5;
    fillCircle(x, y, s * 0.035 * (1 + (i % 2)), `rgba(255,255,255,${0.2 + tw * 0.5})`);
  }
  fillCircle(viewW * 0.5, viewH * (0.5 + 0.12 * Math.min(t / 25, 1)), s * 2.3, '#FFD9A0');
  fillRect(0, groundY, viewW, viewH - groundY, '#2A1F3D');
  fillRect(0, groundY, viewW, s * 0.2, '#4A3770');
  for (let i = 0; i < 55; i++) {
    const speed = 1.2 + ((i * 37) % 60) / 60;
    const span = viewH + s * 3;
    const y = ((t * speed * s * 1.6 + i * s * 1.9) % span) - s;
    const x = (((i * 73) % 100) / 100) * viewW + Math.sin(t * 1.6 + i) * s * 0.6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(((t * 140 + i * 31) * Math.PI) / 180);
    fillRect(-s * 0.09, -s * 0.05, s * 0.18, s * 0.1, rgba(CONFETTI[i % CONFETTI.length], 0.85));
    ctx.restore();
  }
  // りなと ボスたちの こうしん
  const span = viewW + s * 10;
  const speed = s * 1.7;
  for (let i = 0; i < 6; i++) {
    const lv = LEVELS[(i * 4 + 3) % LEVELS.length];
    const raw = t * speed - (i + 1) * s * 3.2;
    const x = (((raw % span) + span) % span) - s * 5;
    const w = s * 1.9, h = s * 1.7;
    drawBossShape(lv.boss.shape, x, groundY - h + s * 0.1, w, h, t * 1.3, true,
      lv.boss.col, lv.boss.col2, false);
  }
  const rinaX = (((t * speed % span) + span) % span) - s * 5;
  const rw = s * 0.72 * 1.5, rh = s * 0.92 * 1.5;
  rinaSprite(rinaX, groundY - rh + s * 0.1, rw, rh, true, Math.sin(t * 13), 1, RINA_BODY, RINA_DARK, true);

  const lines = creditLines();
  const lineH = s * 0.62;
  const scroll = Math.max(t - 1.5, 0) * s * 1.1;
  const fadeTop = viewH * 0.16;
  ctx.textAlign = 'center';
  lines.forEach((raw, i) => {
    if (!raw) return;
    const y = groundY + s * 1.6 + i * lineH - scroll;
    if (y < fadeTop - lineH || y > viewH + lineH) return;
    const alpha = clamp((y - fadeTop) / (s * 1.6), 0, 1);
    const heading = raw.startsWith('■');
    ctx.save(); ctx.globalAlpha = alpha;
    shadowText(heading ? raw.slice(2) : raw, viewW * 0.5, y,
      heading ? s * 0.48 : s * 0.4, heading ? '#FFD2E4' : '#FFFFFF', s * 0.16);
    ctx.restore();
  });
  const titleAlpha = clamp((t - 1) / 1.5, 0, 1);
  if (titleAlpha > 0) {
    ctx.save(); ctx.globalAlpha = titleAlpha;
    shadowText('おしまい', viewW * 0.5, viewH * 0.13, s * (1 + Math.sin(t * 2) * 0.03), '#FFF0F5', s * 0.24);
    ctx.restore();
  }
}

function drawEndingButton() {
  if (game.endingT < 4) { ui.overlayBtn = null; return; }
  const h = clamp(viewH * 0.1, 32, 46);
  setFont(clamp(viewH * 0.04, 12, 16));
  const label = 'けっかを みる';
  const w = ctx.measureText(label).width + h * 1.2;
  const x = viewW - w - 20, y = viewH - h - 18;
  fillRoundRect(x, y, w, h, h / 2, 'rgba(255,143,187,0.9)');
  ctx.fillStyle = '#3A2430';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h * 0.55);
  ui.overlayBtn = { x, y, w, h };
}

// --- 画面 -----------------------------------------------------------------
function drawScene() {
  ui.left = ui.right = ui.up = ui.down = ui.jump = ui.fire = null;
  ui.padC = null;
  ui.overlayBtn = ui.fsBtn = ui.hubBtn = null;
  ui.sizeBtns = [];
  ui.stageBtns = [];

  if (game.phase === 'ENDING') { drawEnding(); drawEndingButton(); return; }

  const s = viewH / VIEW_TILES_Y;
  const cam = game.cameraX, camY = game.cameraY;
  const p = paletteOf(game.area.theme);
  drawBackground(p, cam, camY, s);
  drawTiles(p, cam, camY, s);
  drawCrumbleGhosts(cam, camY, s);
  drawPipeHints(cam, camY, s);
  drawMovers(p, cam, camY, s);
  drawCheckpoints(cam, camY, s);
  drawGoal(cam, camY, s);
  drawPickups(cam, camY, s);
  drawEnemies(cam, camY, s);
  drawShots(cam, camY, s);
  drawBolts(cam, camY, s);
  drawPlayer(cam, camY, s);
  drawPops(cam, camY, s);
  drawWaterTint(cam, camY, s);
  if (game.area.dark) drawDark(cam, camY, s);
  if (game.introT > 0) drawBossIntro(cam, camY, s);

  drawHud();
  if (game.phase === 'PLAYING' || game.phase === 'DYING') drawControls();
  else drawOverlay();
}

function drawRotateNotice() {
  fillRect(0, 0, viewW, viewH, '#191223');
  const s = Math.min(viewW, viewH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
}

// --- 入力 -----------------------------------------------------------------
const pointerTargets = new Map();

function hitCircle(btn, x, y, grow) {
  if (!btn) return false;
  const r = btn.r * (grow || 1.22);
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

/** じゅうじボタン。ななめも 押せるように、中心からの ずれで きめる。 */
function applyPad(x, y) {
  const c = ui.padC;
  if (!c) return;
  const dx = x - c.x, dy = y - c.y;
  const dead = c.r * 0.22;
  game.inputLeft = dx < -dead;
  game.inputRight = dx > dead;
  game.inputUp = dy < -dead;
  game.inputDown = dy > dead;
}
function clearPad() {
  game.inputLeft = game.inputRight = game.inputUp = game.inputDown = false;
}

function onDown(e) {
  const [x, y] = pointerPos(e);
  if (game.phase === 'PLAYING' || game.phase === 'DYING') {
    if (hitCircle(ui.padC, x, y, 1.3)) {
      pointerTargets.set(e.pointerId, 'pad'); applyPad(x, y); return;
    }
    if (hitCircle(ui.jump, x, y)) {
      pointerTargets.set(e.pointerId, 'jump'); game.pressJump(); sfxJump(); return;
    }
    if (hitCircle(ui.fire, x, y)) {
      pointerTargets.set(e.pointerId, 'fire'); game.pressFire(); return;
    }
    return;
  }
  // まずは きっちり、あたらなければ 少し ひろげて もう一度
  if (menuTap(x, y)) return;
  hitSlop = 40; menuTap(x, y); hitSlop = 0;
}

/** タイトルや まくの ボタン。押せたら true。 */
function menuTap(x, y) {
  if (hitRect(ui.hubBtn, x, y)) { gotoHub(); return true; }
  for (const b of ui.stageBtns) if (hitRect(b, x, y)) { game.selectStage(b.index); return true; }
  for (const b of ui.sizeBtns) {
    if (hitRect(b, x, y)) { uiScale = b.scale; save.btn = b.scale; storeSave(); return true; }
  }
  if (hitRect(ui.fsBtn, x, y)) {
    if (isFullscreen()) exitFullscreen(); else enterFullscreen(); return true;
  }
  if (hitRect(ui.overlayBtn, x, y)) {
    if (game.phase === 'TITLE') enterFullscreen();
    game.advance();
    if (game.phase === 'PLAYING') bgmStage();
    return true;
  }
  return false;
}

function onMove(e) {
  if (pointerTargets.get(e.pointerId) !== 'pad') return;
  const [x, y] = pointerPos(e);
  applyPad(x, y);
}

function onUp(e) {
  const t = pointerTargets.get(e.pointerId);
  if (!t) return;
  pointerTargets.delete(e.pointerId);
  if (t === 'pad') clearPad();
  else if (t === 'jump') game.releaseJump();
}

canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(e); });
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('pointerleave', onUp);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump',
  KeyX: 'fire', KeyC: 'fire',
};
window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (game.phase !== 'PLAYING' && game.phase !== 'DYING') {
    if (k === 'jump') { game.advance(); if (game.phase === 'PLAYING') bgmStage(); }
    else if (k === 'left') game.selectStage(game.startIndex - 1);
    else if (k === 'right') game.selectStage(game.startIndex + 1);
    else if (k === 'up') game.selectStage(game.startIndex - PICK_COLS);
    else if (k === 'down') game.selectStage(game.startIndex + PICK_COLS);
    return;
  }
  if (k === 'left') game.inputLeft = true;
  else if (k === 'right') game.inputRight = true;
  else if (k === 'up') game.inputUp = true;
  else if (k === 'down') game.inputDown = true;
  else if (k === 'jump') { game.pressJump(); sfxJump(); }
  else game.pressFire();
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if (k === 'left') game.inputLeft = false;
  else if (k === 'right') game.inputRight = false;
  else if (k === 'up') game.inputUp = false;
  else if (k === 'down') game.inputDown = false;
  else if (k === 'jump') game.releaseJump();
});

// --- メインループ ---------------------------------------------------------
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
  if (viewH > viewW * 1.05) { game.clearInput(); drawRotateNotice(); return; }
  game.update(dt, viewW / (viewH / VIEW_TILES_Y));
  drawScene();
}

resize();
requestAnimationFrame(frame);
