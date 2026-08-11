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
  x += badge(x, y, `チュール ${game.coinCount}`, 'rgba(255,154,90,0.9)', fs) + 5;
  x += badge(x, y, `${game.score}`, 'rgba(43,43,58,0.7)', fs) + 5;

  const label = compact
    ? `${game.levelIndex + 1}/${LEVELS.length}`
    : `${game.levelIndex + 1}/${LEVELS.length}  ${game.area.title}`;
  setFont(fs);
  const rw = ctx.measureText(label).width + fs * 1.25;
  badge(viewW - pad - rw, y, label, 'rgba(43,43,58,0.7)', fs);
  if (game.introDone && game.bossAlive) {
    const who = 'にげろ！ ゴールへ！';
    setFont(fs);
    const bw = ctx.measureText(who).width + fs * 1.25;
    badge(viewW - pad - rw - bw - 5, y, who, 'rgba(224,72,63,0.9)', fs);
  }

  // りなの じょうたい
  const items = [];
  items.push([p.weapon ? WEAPONS[p.weapon].name : (p.size > 0 ? 'もふもふ' : 'ふつうの おる'),
    null, p.weapon ? rgba(WEAPONS[p.weapon].col, 0.85) : 'rgba(120,120,150,0.7)']);
  if (p.starT > 0) items.push(['またたび むてき', p.starT, 'rgba(154,224,106,0.9)']);
  if (p.featherT > 0) items.push(['ふわふわ', p.featherT, 'rgba(95,216,160,0.85)']);
  if (p.magnetT > 0) items.push(['においセンサー', p.magnetT, 'rgba(255,122,122,0.85)']);
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
  const nm = game.lv.bosses.map((b) => b.name).join(' と ');
  shadowText(`${nm} が やってきた！`, viewW / 2, viewH * 0.3, size, '#FFF3C4', s * 0.3);
  shadowText(game.lv.boss.hint || 'にげろ！', viewW / 2, viewH * 0.4, s * 0.44, '#FFFFFF', s * 0.16);
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
const PICK_COLS = 10;
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
  const bn = (lv.bosses || [lv.boss]).map((b) => b.name).join(' と ');
  ctx.fillText(`おいかけてくるのは ${bn}`, viewW / 2, y + rows * (cell + gap) + bodySize * 2.05);
  return stagePickerHeight(bodySize);
}

// --- オーバーレイ ---------------------------------------------------------
function overlayText() {
  switch (game.phase) {
    case 'TITLE':
      return ['おるの大冒険', [
        'グレーの ねこ おるが チュールを あつめて すすむ',
        'じゅうじボタンで うごく（↑↓で はしご、↓で どかんに 入る）',
        'ごほうびチュールで もふもふ。もう1こで にゃー／しゃー／ねこパンチ',
        `ぜんぶで ${LEVELS.length} ステージ。さいごは りなちゃんたちから にげろ！`,
      ], `ステージ ${game.startIndex + 1} を はじめる`];
    case 'LEVEL_CLEAR':
      return [`ステージ ${game.levelIndex + 1} クリア！`, [
        `${game.lv.title} を クリアした`,
        `チュール ${game.coinCount} こ / スコア ${game.score}`,
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
        `あつめた チュール ${game.coinCount} こ`,
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
  const h = clamp(viewH * 0.075, 24, 36);
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
    drawHubButton();

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
  // ★ タイトルからも エンディング（まほうの ばめん）を 見られる ように する。
  //   10面を クリアした のに 見られない、と 言われたため。
  const endLabel = 'エンディングを みる';
  const ew = isTitle ? ctx.measureText(endLabel).width + btnH * 0.9 : 0;
  const gapB = isTitle ? 10 : 0;
  const bxx = viewW / 2 - (bw + ew + gapB) / 2;
  fillRoundRect(bxx, y, bw, btnH, btnH / 2, '#FF8FBB');
  ctx.fillStyle = '#3A2430';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(btnLabel, bxx + bw / 2, y + btnH * 0.55);
  ui.overlayBtn = { x: bxx, y, w: bw, h: btnH };
  ui.endBtn = null;
  if (isTitle) {
    const ex = bxx + bw + gapB;
    fillRoundRect(ex, y, ew, btnH, btnH / 2, 'rgba(255,255,255,0.22)');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(endLabel, ex + ew / 2, y + btnH * 0.55);
    ui.endBtn = { x: ex, y, w: ew, h: btnH };
  }
}

// --- エンディング ---------------------------------------------------------
function creditLines() {
  const m = Math.floor(game.totalTime / 60), s = Math.floor(game.totalTime % 60);
  return [
    '■ おるの大冒険', '',
    '■ とうじょう',
    'おる（グレーの ねこ）',
    'リノ（白に 茶色の ねこ・気さく）',
    'りなちゃん（あそぼ〜）',
    'まりちゃん（ブラッシングしましょー！）',
    'あーたん／くーたん（かいぬし）', '',
    '■ あるいた ばしょ',
    ...LEVELS.map((l, i) => `${i + 1}. ${l.title}`), '',
    '■ きろく',
    `あつめた チュール    ${game.coinCount} こ`,
    `さいしゅうスコア    ${game.score}`,
    `クリアタイム    ${m}分${s}秒`, '',
    '■ おわりに',
    'ながい ぼうけんの あと、おるは おうちに つきました。',
    'リノも いっしょ。あーたんと くーたんの ベッドで',
    'よにんと いっぴき、すやすや ねむります。', '',
    'おやすみなさい。あそんでくれて ありがとう！',
  ];
}

// おうちに かえって、みんなで ベッドで ねむる エンディング。
function drawSleeper(cx, cy, s, kind, t, fluffy) {
  // ふとんから 顔だけ 出して ねている
  const br = Math.sin(t * 1.2 + cx * 0.01) * s * 0.03;
  if (kind === 'ORU') {
    if (fluffy) {
      // まほうで 生えた 毛。まわりに ふわふわを 足す。
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        fillCircle(cx + Math.cos(a) * s * 0.52, cy + br + Math.sin(a) * s * 0.5,
          s * 0.22, ORU_FUR);
      }
    }
    fillCircle(cx, cy + br, s * 0.5, ORU_FUR_L);
    for (const sd of [-1, 1]) {
      poly([[cx + sd * s * 0.42, cy - s * 0.2 + br], [cx + sd * s * 0.3, cy - s * 0.66 + br],
        [cx + sd * s * 0.08, cy - s * 0.36 + br]], ORU_FUR_D);
    }
    for (const sd of [-1, 1]) strokeArc(cx + sd * s * 0.22 - s * 0.14, cy - s * 0.02 + br,
      s * 0.28, s * 0.16, 200, 140, INK, s * 0.05);
    poly([[cx - s * 0.08, cy + s * 0.16 + br], [cx + s * 0.08, cy + s * 0.16 + br],
      [cx, cy + s * 0.26 + br]], ORU_NOSE);
    fillCircle(cx - s * 0.34, cy + s * 0.16 + br, s * 0.12, rgba(CHEEK, 0.4));
    fillCircle(cx + s * 0.34, cy + s * 0.16 + br, s * 0.12, rgba(CHEEK, 0.4));
  } else if (kind === 'RINO') {
    fillCircle(cx, cy + br, s * 0.42, RINO_FUR);
    fillCircle(cx + s * 0.22, cy - s * 0.18 + br, s * 0.16, RINO_BROWN);
    for (const sd of [-1, 1]) {
      poly([[cx + sd * s * 0.36, cy - s * 0.18 + br], [cx + sd * s * 0.26, cy - s * 0.6 + br],
        [cx + sd * s * 0.06, cy - s * 0.32 + br]], sd > 0 ? RINO_BROWN : RINO_FUR_D);
    }
    for (const sd of [-1, 1]) strokeArc(cx + sd * s * 0.19 - s * 0.12, cy - s * 0.02 + br,
      s * 0.24, s * 0.14, 200, 140, INK, s * 0.045);
    poly([[cx - s * 0.07, cy + s * 0.14 + br], [cx + s * 0.07, cy + s * 0.14 + br],
      [cx, cy + s * 0.23 + br]], ORU_NOSE);
  } else {
    const hr = s * 0.52;
    if (kind === 'AA') fillArc(cx - hr * 1.15, cy - hr * 1.35 + br, hr * 2.3, hr * 1.9, 180, 180, HAIR);
    else kutanBob(cx, cy + br, hr, t, true, false);
    fillCircle(cx, cy + br, hr, SKIN);
    for (const sd of [-1, 1]) strokeArc(cx + sd * hr * 0.38 - hr * 0.18, cy - hr * 0.06 + br,
      hr * 0.36, hr * 0.2, 200, 140, INK, hr * 0.07);
    fillCircle(cx - hr * 0.62, cy + hr * 0.28 + br, hr * 0.16, rgba(CHEEK, 0.45));
    fillCircle(cx + hr * 0.62, cy + hr * 0.28 + br, hr * 0.16, rgba(CHEEK, 0.45));
    strokeArc(cx - hr * 0.18, cy + hr * 0.36 + br, hr * 0.36, hr * 0.22, 20, 140, INK, hr * 0.07);
    if (kind === 'AA') fillArc(cx - hr * 1.15, cy - hr * 1.35 + br, hr * 2.3, hr * 1.8, 180, 180, HAIR);
    else kutanBob(cx, cy + br, hr, t, true, true);
  }
  // zzz
  const zt = (t * 0.7 + (kind === 'ORU' ? 0 : kind === 'RINO' ? 0.4 : 0.8)) % 3;
  if (zt < 2.2) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - zt / 2.2) * 0.9;
    setFont(s * 0.4);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('z', cx + s * 0.6 + zt * s * 0.2, cy - s * 0.6 - zt * s * 0.5);
    ctx.restore();
  }
}

// エンディングの ながれ。★ 何が おきて いるか わかる ように 4つの ばめんに 分けた。
//   ①  0.0〜 3.6秒 … おるが おうちに ついた（下半身の 毛が ない ことを 見せる）
//   ②  3.6〜 6.6秒 … あーたんと くーたんが まほうを かける
//   ③  6.6〜11.4秒 … 毛が どんどん 生える（ゲージで どれだけ 生えたか 見せる）
//   ④ 11.4〜14.0秒 … ふわふわの ねこに もどって よろこぶ
//     14.0秒〜     … 4人と 1ぴきで ベッドで ねむる
const SC1 = 3.6, SC2 = 6.6, SC3 = 11.4, MAGIC_END = 14.0;
let endMagicSfx = 0;

/** エンディングの ふきだし。だれが しゃべって いるか わかる ように 大きく。 */
function endBubble(text, x, y, s, alpha, col) {
  if (alpha <= 0) return;
  const fs = clamp(s * 0.46, 13, 24);
  setFont(fs);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + fs * 1.4;
  const bh = fs * 1.9;
  const cx = clamp(x, tw / 2 + 6, viewW - tw / 2 - 6);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  fillRoundRect(cx - tw / 2, y - bh / 2, tw, bh, bh * 0.45, 'rgba(255,255,255,0.96)');
  poly([[x - fs * 0.28, y + bh / 2 - 2], [x + fs * 0.28, y + bh / 2 - 2],
    [x, y + bh / 2 + fs * 0.7]], 'rgba(255,255,255,0.96)');
  ctx.strokeStyle = col || '#C8A8F0';
  ctx.lineWidth = Math.max(2, s * 0.05);
  rectPath(cx - tw / 2, y - bh / 2, tw, bh, bh * 0.45);
  ctx.stroke();
  ctx.fillStyle = '#33283C';
  setFont(fs);
  ctx.fillText(text, cx, y + fs * 0.06);
  ctx.restore();
}

/** 画面の 上に 出る せつめい。①②③④ と ばめんの 名前を 出す。 */
function endCaption(step, title, s, alpha) {
  const fs = clamp(s * 0.66, 16, 32);
  setFont(fs);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = step + ' ' + title;
  const tw = ctx.measureText(label).width + fs * 2.0;
  const y = viewH * 0.07;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  fillRoundRect(viewW / 2 - tw / 2, y, tw, fs * 2.1, fs, 'rgba(30,20,45,0.86)');
  ctx.strokeStyle = 'rgba(255,224,150,0.9)';
  ctx.lineWidth = Math.max(2, s * 0.05);
  rectPath(viewW / 2 - tw / 2, y, tw, fs * 2.1, fs);
  ctx.stroke();
  ctx.fillStyle = '#FFF0F5';
  setFont(fs);
  ctx.fillText(label, viewW / 2, y + fs * 1.05);
  ctx.restore();
}

/** よるの へやの かべと まど。まほうの ばめんと ベッドの ばめんで つかう。 */
function drawNightRoom(s, t) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#1C1836'); g.addColorStop(0.6, '#2E2650'); g.addColorStop(1, '#463A66');
  fillRect(0, 0, viewW, viewH, g);
  const wx = viewW * 0.12, wy = viewH * 0.12;
  fillRoundRect(wx, wy, s * 3.4, s * 2.8, s * 0.18, '#3A3260');
  fillRoundRect(wx + s * 0.16, wy + s * 0.16, s * 3.08, s * 2.48, s * 0.12, '#1A2A52');
  fillCircle(wx + s * 2.3, wy + s * 0.9, s * 0.44, '#FFF3C4');
  fillCircle(wx + s * 2.14, wy + s * 0.78, s * 0.36, '#1A2A52');
  for (let i = 0; i < 14; i++) {
    fillCircle(wx + s * (0.3 + ((i * 37) % 28) / 10), wy + s * (0.3 + ((i * 53) % 22) / 10),
      s * 0.035, `rgba(255,255,255,${0.4 + Math.sin(t * 2 + i) * 0.3})`);
  }
  line(wx + s * 1.7, wy + s * 0.16, wx + s * 1.7, wy + s * 2.6, '#3A3260', s * 0.09);
  line(wx + s * 0.16, wy + s * 1.4, wx + s * 3.24, wy + s * 1.4, '#3A3260', s * 0.09);
}

/** まほうの ばめん。①〜④の ばめんに 分けて、いま 何が おきて いるか 出す。 */
function drawMagic(s, t) {
  drawNightRoom(s, t);
  const floorY = viewH * 0.86;
  fillRect(0, floorY, viewW, viewH - floorY, '#3A2E58');
  fillRect(0, floorY, viewW, s * 0.16, '#5A4A80');

  const cx = viewW * 0.5;
  const ow = s * 2.7, oh = s * 3.4;
  const casting = t >= SC1;                       // まほうを かけて いる さいちゅう
  // 毛が どれだけ 生えたか（③の あいだに 0 → 1）
  const fur = clamp((t - SC2) / (SC3 - SC2), 0, 1);

  // ① おるは 左から あるいて 入ってくる
  const walk = clamp(t / 2.2, 0, 1);
  const ox = cx * walk + (-ow) * (1 - walk);
  const hop = t > SC3 ? Math.abs(Math.sin((t - SC3) * 7)) * s * 0.5 : 0;
  const oy = floorY - oh - hop;

  if (casting) {
    // まほうの わ（足もとで まわる）
    ctx.save();
    ctx.globalAlpha = 0.45 + Math.sin(t * 4) * 0.15;
    for (let i = 0; i < 3; i++) {
      const rr = s * (1.1 + i * 0.45);
      ctx.strokeStyle = i % 2 ? '#FFE9A8' : '#C8A8F0';
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.ellipse(cx, floorY - s * 0.1, rr, rr * 0.3, 0, t * (1 + i * 0.4), t * (1 + i * 0.4) + 4.2);
      ctx.stroke();
    }
    ctx.restore();

    // おるに あつまる きらきら
    for (let i = 0; i < 26; i++) {
      const k = ((t * 0.7 + i / 26) % 1);
      const a = (i / 26) * Math.PI * 2 + t * 0.8;
      const r = s * (4.2 * (1 - k) + 0.3);
      ctx.save();
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      starPoly(cx + Math.cos(a) * r, floorY - oh * 0.5 + Math.sin(a) * r * 0.55,
        s * (0.1 + (1 - k) * 0.12), 4, 0.3, i % 3 === 0 ? '#FFE9A8' : '#DFF6FF', t * 3 + i);
      ctx.restore();
    }
  }

  // あーたんと くーたん。②から 手を あげて まほうを かける。
  // ★ おとななので、おるより 大きく 見えるように した。
  const gw = s * 2.5, gh = s * 5.0;
  const ax = cx - s * 5.6, kx = cx + s * 3.7;
  drawGrownup(ax, floorY - gh, gw, gh, t, 'AA', casting);
  drawGrownup(kx, floorY - gh, gw, gh, t, 'KU', casting);

  // おる。毛が 生えるにつれて 光る。
  if (casting) {
    const glow = fur < 1 ? Math.abs(Math.sin(t * 6)) * 0.5 : 0.25;
    fillCircle(cx, floorY - oh * 0.5, s * (2.1 + glow), `rgba(255,240,200,${0.18 + glow * 0.2})`);
  }
  oruSprite(ox - ow / 2, oy, ow, oh, true, walk < 1 ? t * 8 : 0,
    1 + Math.sin(t * 3) * 0.02, false, fur);

  // リノも いっしょに 見て いる（おるの ひだりがわ）
  drawRino(cx - s * 3.0, floorY - s * 2.0, s * 2.2, s * 2.0, t, true);

  // ① どこの 毛が ない のか、やじるしで はっきり 見せる
  if (t < SC1 && walk >= 1) {
    const a = clamp((t - 2.2) / 0.4, 0, 1) * clamp((SC1 - t) / 0.4, 0, 1);
    const ay = floorY - oh * 0.24;
    ctx.save(); ctx.globalAlpha = a;
    const wob = Math.sin(t * 6) * s * 0.1;
    const tipX = cx + s * 1.1 + wob, tailX = cx + s * 2.3 + wob;
    line(tailX, ay - s * 0.55, tipX + s * 0.2, ay - s * 0.06, '#FFE066', s * 0.12);
    poly([[tipX, ay], [tipX + s * 0.55, ay - s * 0.3], [tipX + s * 0.42, ay + s * 0.3]],
      '#FFE066');
    // 字が キャラに かぶって 読めなく ならない ように、下じきを しく
    const lf = clamp(s * 0.44, 12, 22);
    setFont(lf);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lt = 'ここの 毛が ない';
    const lw = ctx.measureText(lt).width;
    const lx = Math.min(tailX - s * 0.2, viewW - lw - lf * 1.4);
    fillRoundRect(lx - lf * 0.5, ay - s * 0.85 - lf * 0.85, lw + lf, lf * 1.7, lf * 0.85,
      'rgba(30,20,45,0.86)');
    ctx.fillStyle = '#FFE066';
    ctx.fillText(lt, lx, ay - s * 0.85);
    ctx.restore();
  }

  // ③ 毛が どれだけ 生えたか ゲージで 見せる
  if (t >= SC2 && t < SC3 + 0.6) {
    const bw = Math.min(viewW * 0.5, s * 8), bh2 = s * 0.44;
    const bx = viewW / 2 - bw / 2, by = viewH * 0.9;
    fillRoundRect(bx, by, bw, bh2, bh2 / 2, 'rgba(20,14,34,0.8)');
    fillRoundRect(bx + s * 0.05, by + s * 0.05, (bw - s * 0.1) * fur, bh2 - s * 0.1,
      bh2 / 2, fur >= 1 ? '#FFE066' : '#C8A8F0');
    setFont(clamp(s * 0.38, 11, 19));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF0F5';
    ctx.fillText('けの もふもふ  ' + Math.round(fur * 100) + '%', viewW / 2, by + bh2 / 2);
  }

  // ばめんの せつめい と せりふ
  const gy = floorY - gh - s * 0.5;
  if (t < SC1) {
    endCaption('①', 'おるが おうちに ついた！', s, clamp(t / 0.5, 0, 1));
    endBubble('おかえり おる〜', ax + gw / 2, gy, s, clamp((t - 1.6) / 0.4, 0, 1), '#5A82BF');
    endBubble('よく がんばったね！', kx + gw / 2, gy, s, clamp((t - 2.4) / 0.4, 0, 1), '#4FA88A');
  } else if (t < SC2) {
    endCaption('②', 'ふたりが まほうを かける！', s, clamp((t - SC1) / 0.4, 0, 1));
    endBubble('まほうを かけるよ！', ax + gw / 2, gy, s, clamp((t - SC1 - 0.2) / 0.4, 0, 1),
      '#5A82BF');
    endBubble('ふわふわに なぁれ〜', kx + gw / 2, gy, s, clamp((t - SC1 - 1.1) / 0.4, 0, 1),
      '#4FA88A');
  } else if (t < SC3) {
    endCaption('③', 'おるの 毛が 生えてきた！', s, clamp((t - SC2) / 0.4, 0, 1));
    endBubble('もう ちょっと〜', kx + gw / 2, gy, s, clamp((t - SC2 - 1.6) / 0.4, 0, 1),
      '#4FA88A');
  } else {
    endCaption('④', 'ふわふわの ねこに もどった！', s, clamp((t - SC3) / 0.4, 0, 1));
    endBubble('にゃ〜！', cx, floorY - oh - s * 0.9 - hop, s,
      clamp((t - SC3 - 0.4) / 0.4, 0, 1), '#8B8B99');
  }

  // ④に なった しゅんかんの きらきら
  if (t >= SC3) {
    const k = clamp((t - SC3) / 0.8, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.min(k, 1) * Math.PI) * 0.9;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = s * (1 + k * 6);
      starPoly(cx + Math.cos(a) * r, floorY - oh * 0.5 + Math.sin(a) * r * 0.7,
        s * 0.2, 5, 0.45, '#FFE9A8', a);
    }
    ctx.restore();
  }
}

function drawEnding() {
  const s = viewH / VIEW_TILES_Y;
  const t = game.endingT;

  // 音は 1回だけ
  if (t < 0.2) endMagicSfx = 0;
  if (t > SC1 && endMagicSfx === 0) { endMagicSfx = 1; sfxGrow(); }
  if (t > SC3 && endMagicSfx === 1) { endMagicSfx = 2; sfxWin(); }
  if (t > MAGIC_END && endMagicSfx === 2) { endMagicSfx = 3; sfxSleep(); }

  if (t < MAGIC_END) { drawMagic(s, t); return; }

  const tb = t - MAGIC_END;
  drawNightRoom(s, t);

  // ベッド
  const bedY = viewH * 0.58;
  const bedX = viewW * 0.16, bedW = viewW * 0.68;
  fillRoundRect(bedX - s * 0.2, bedY - s * 1.9, s * 0.5, s * 2.4, s * 0.12, '#6A4A3A');
  fillRoundRect(bedX, bedY - s * 0.1, bedW, s * 2.2, s * 0.2, '#8A5A42');
  for (let i = 0; i < 2; i++) {
    fillRoundRect(bedX + s * 0.4 + i * s * 2.0, bedY - s * 0.85, s * 1.8, s * 0.8, s * 0.3, '#F4ECF7');
  }
  fillRoundRect(bedX, bedY + s * 0.25, bedW, s * 1.5, s * 0.25, '#7A9AD8');
  fillRoundRect(bedX, bedY + s * 0.25, bedW, s * 0.32, s * 0.16, '#A8C0EC');
  for (let i = 0; i < 6; i++) {
    fillCircle(bedX + bedW * (0.1 + i * 0.16), bedY + s * 1.1, s * 0.16, 'rgba(255,255,255,0.16)');
  }

  // よにんと いっぴき。おるは もう もふもふ。
  drawSleeper(bedX + s * 1.35, bedY - s * 0.48, s * 1.1, 'AA', t);
  drawSleeper(bedX + s * 3.5, bedY - s * 0.48, s * 1.1, 'KU', t);
  drawSleeper(bedX + bedW * 0.6, bedY + s * 0.72, s * 1.05, 'ORU', t, true);
  drawSleeper(bedX + bedW * 0.85, bedY + s * 0.78, s * 0.85, 'RINO', t);

  // ふわふわ うかぶ チュールの ゆめ
  for (let i = 0; i < 8; i++) {
    const k = (t * 0.35 + i * 0.125) % 1;
    const cx = viewW * (0.2 + i * 0.09);
    ctx.save();
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.5;
    drawChuru(cx + Math.sin(t + i) * s * 0.3, viewH * 0.5 - k * viewH * 0.42, s * 0.3, t + i);
    ctx.restore();
  }

  // スタッフロール
  const lines = creditLines();
  const lineH = s * 0.62;
  const scroll = Math.max(tb - 1.0, 0) * s * 1.05;
  const fadeTop = viewH * 0.12;
  ctx.textAlign = 'center';
  lines.forEach((raw, i) => {
    if (!raw) return;
    const y = viewH + s * 0.6 + i * lineH - scroll;
    if (y < fadeTop - lineH || y > viewH + lineH) return;
    const alpha = clamp((y - fadeTop) / (s * 1.6), 0, 1);
    const heading = raw.startsWith('■');
    ctx.save(); ctx.globalAlpha = alpha;
    shadowText(heading ? raw.slice(2) : raw, viewW * 0.5, y,
      heading ? s * 0.48 : s * 0.4, heading ? '#FFD2E4' : '#FFFFFF', s * 0.2);
    ctx.restore();
  });

  const titleAlpha = clamp(tb / 1.2, 0, 1);
  if (titleAlpha > 0) {
    ctx.save(); ctx.globalAlpha = titleAlpha;
    shadowText('おやすみなさい', viewW * 0.5, viewH * 0.12,
      s * 0.95 * (1 + Math.sin(t * 1.6) * 0.03), '#FFF0F5', s * 0.26);
    ctx.restore();
  }
}

function drawEndingButton() {
  if (game.endingT < MAGIC_END + 1.5) { ui.overlayBtn = null; return; }
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
  ui.overlayBtn = ui.fsBtn = ui.hubBtn = ui.endBtn = null;
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
function hitRect(r, x, y) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
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
  if (hitRect(ui.hubBtn, x, y)) { gotoHub(); return; }
  for (const b of ui.stageBtns) if (hitRect(b, x, y)) { game.selectStage(b.index); return; }
  for (const b of ui.sizeBtns) if (hitRect(b, x, y)) { uiScale = b.scale; save.btn = b.scale; storeSave(); return; }
  if (hitRect(ui.endBtn, x, y)) { game.endingT = 0; game.phase = 'ENDING'; bgmStop(); return; }
  if (hitRect(ui.fsBtn, x, y)) { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); return; }
  if (hitRect(ui.overlayBtn, x, y)) {
    if (game.phase === 'TITLE') enterFullscreen();
    game.advance();
    if (game.phase === 'PLAYING') bgmStage();
  }
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
