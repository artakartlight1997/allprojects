// 画面・そうさ・メインループ。よこ向き せんよう。
//
// UI は 大きめ。よこ持ちの スマホでも 「どこを 押すか」が ひとめで わかるように、
// ボタンは 画面の 高さ を もとに した 大きさ で 出している。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const FONT = 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// もじが はみ出さない 大きさ を さがす
function fitFont(text, maxW, size, pre) {
  let s = size;
  ctx.font = (pre || '') + Math.round(s) + 'px ' + FONT;
  const w = ctx.measureText(text).width;
  if (w > maxW && w > 0) {
    s = Math.max(9, s * maxW / w);
    ctx.font = (pre || '') + Math.round(s) + 'px ' + FONT;
  }
  return s;
}

function text(str, x, y, size, col, align, pre, maxW) {
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  fitFont(str, maxW || W, size, pre === undefined ? 'bold ' : pre);
  ctx.fillStyle = col || '#FFFFFF';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

function button(x, y, w, h, on) {
  const b = { x: x, y: y, w: w, h: h, on: on };
  ui.buttons.push(b);
  return b;
}

function drawButton(b, label, col, textCol, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  rr(ctx, b.x + b.h * 0.06, b.y + b.h * 0.09, b.w, b.h, Math.min(18, b.h * 0.3)); ctx.fill();
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(18, b.h * 0.3)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#2A2440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.86, b.h * (sub ? 0.38 : 0.46), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.48 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,36,64,0.72)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.78);
  }
  ctx.textAlign = 'left';
}

// 小さい ボタンは ゆびで 当てにくい。どれにも 当たらなかった ときだけ、
// まわりを 少し ひろげて もう一度 さがす（見た目は そのまま）。
function hitBtn(px, py) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  const need = 44;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if (!mx && !my) continue;
    if (px >= b.x - mx && px <= b.x + b.w + mx &&
        py >= b.y - my && py <= b.y + b.h + my) return b;
  }
  return null;
}

const RANK_NAME = ['もういちど！', 'クリア！', 'オールスター！'];
const RANK_COL = ['#B0A8C0', '#7FE0A0', '#FFD166'];

// ★ を ならべる
function stars(x, y, s, n, max) {
  for (let i = 0; i < (max || 2); i++) {
    ctx.fillStyle = i < n ? '#FFD166' : 'rgba(255,255,255,0.18)';
    starPath(x + i * s * 2.2, y, s, 5, 0.45, 0); ctx.fill();
    if (i < n) {
      ctx.strokeStyle = 'rgba(180,120,20,0.6)'; ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.stroke();
    }
  }
}

// 星空の はいけい（タイトル・えらぶ 画面 きょうつう）
function starryBg(t) {
  ctx.fillStyle = skyGrad(0, H, '#3B1E5E', '#161033');
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 173) % 101) / 100 * W;
    const sy = ((i * 97) % 89) / 100 * H;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + i));
    ctx.globalAlpha = tw;
    ctx.fillStyle = i % 5 ? '#FFF6C8' : '#FFC8E0';
    sparkle(sx, sy, H * (i % 7 === 0 ? 0.016 : 0.009));
  }
  ctx.globalAlpha = 1;
  // したの ステージ
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(0, H); ctx.lineTo(W * 0.12, H * 0.72);
  ctx.lineTo(W * 0.88, H * 0.72); ctx.lineTo(W, H);
  ctx.closePath(); ctx.fill();
}

// --- タイトル ---------------------------------------------------------------------

function drawTitle(t) {
  starryBg(t);
  const bb = Math.sin(t * 3.2);

  // タイトルの もじ
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y0 = H * 0.2;
  ctx.save();
  ctx.translate(W / 2, y0);
  ctx.rotate(bb * 0.012);
  let fs = fitFont('りなりな', W * 0.5, H * 0.16, 'bold ');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2A1B44'; ctx.lineWidth = H * 0.028;
  ctx.strokeText('りなりな', 0, 0);
  const g = ctx.createLinearGradient(0, -fs * 0.6, 0, fs * 0.6);
  g.addColorStop(0, '#FFF6C8'); g.addColorStop(1, '#FF8FC8');
  ctx.fillStyle = g;
  ctx.fillText('りなりな', 0, 0);
  fs = fitFont('リズム オールスターズ', W * 0.72, H * 0.115, 'bold ');
  ctx.strokeStyle = '#2A1B44'; ctx.lineWidth = H * 0.024;
  ctx.strokeText('リズム オールスターズ', 0, H * 0.125);
  const g2 = ctx.createLinearGradient(0, H * 0.07, 0, H * 0.19);
  g2.addColorStop(0, '#FFE066'); g2.addColorStop(1, '#FFB020');
  ctx.fillStyle = g2;
  ctx.fillText('リズム オールスターズ', 0, H * 0.125);
  ctx.restore();
  ctx.textAlign = 'left';

  // ステージに ならんだ なかまたち（画面の 下の れつ）
  const gy = H * 0.98;
  const wobble = (i) => Math.sin(t * 4 + i * 1.1);
  drawFluff(W * 0.08, gy - Math.abs(wobble(0)) * H * 0.02, H * 0.26,
            { hairs: [{ ang: -0.3, len: 0.6, ph: t * 6 }, { ang: 0.4, len: 0.8, ph: t * 5 }],
              mood: 'happy', wob: wobble(0) * 0.4, ph: t * 0.6 });
  drawNinjaCat(W * 0.22, gy, H * 0.26, { slash: (Math.sin(t * 2) + 1) / 2 * 0.5, mood: 'idle' });
  drawPenguin(W * 0.35, gy, H * 0.25, { teacher: 1, step: Math.abs(wobble(2)), dir: 1 });
  drawFrog(W * 0.66, gy, H * 0.24, { puff: (wobble(3) + 1) / 2 * 0.8 });
  drawRobo(W * 0.79, gy, H * 0.25, { swing: (wobble(4) + 1) / 2, lamp: 3, mood: 'happy' });
  drawGhost(W * 0.93, H * 0.74 + wobble(5) * H * 0.02, H * 0.13, { good: 1, t: t });
  drawRina(W * 0.5, gy + H * 0.05, H * 0.3,
           { arm: (wobble(1) + 1) / 2, mood: 'happy', mic: 1, jump: Math.max(0, wobble(1)) });

  // ボタン
  const bw = Math.min(W * 0.34, H * 0.72), bh = H * 0.13;
  drawButton(button(W / 2 - bw / 2, H * 0.45, bw, bh, () => {
    audioStart(); enterFullscreen(); RG.screen = 'select';
  }), '▶ はじめる', '#FFE066', '#3A2A10', 'ミニゲームを えらぶ');

  const sw = Math.min(W * 0.22, H * 0.44), sh = H * 0.085;
  drawButton(button(H * 0.03, H * 0.03, sw, sh, calStart),
             '♪ ずれ合わせ', 'rgba(255,255,255,0.86)');

  const done = clearedCount();
  text('クリア ' + done + ' / ' + STAGES.length + '　★ ' + starCount(),
       H * 0.03, H * 0.18, H * 0.045, '#FFE0B0', 'left');

  drawHubButton();
}

// --- ミニゲームを えらぶ ------------------------------------------------------------

function drawSelect(t) {
  starryBg(t * 0.5);
  ctx.fillStyle = 'rgba(10,6,24,0.35)';
  ctx.fillRect(0, 0, W, H);

  text('どれで あそぶ？', W * 0.5, H * 0.075, H * 0.065, '#FFF6C8', 'center');
  text('← やさしい　　　だんだん むずかしく なるよ　　　むずかしい →',
       W * 0.5, H * 0.135, H * 0.038, '#C8B8E0', 'center', '', W * 0.56);

  // むずかしさ の きりかえ
  const tw = Math.min(W * 0.2, H * 0.42), th = H * 0.08;
  const tx = W - tw - H * 0.03;
  drawButton(button(tx, H * 0.035, tw, th, () => { RG.fast = RG.fast ? 0 : 1; }),
             RG.fast ? '🔥 はやい' : '🐢 ふつう',
             RG.fast ? '#FFB0B0' : 'rgba(255,255,255,0.86)', '#2A2440',
             'タップで きりかえ');

  drawButton(button(H * 0.03, H * 0.035, Math.min(W * 0.14, H * 0.3), th,
                    () => { RG.screen = 'title'; }), '← もどる', 'rgba(255,255,255,0.8)');

  // カード 4れつ × 2だん
  const cols = 4, rows = 2;
  const m = H * 0.03;
  const top = H * 0.18;
  const cw = (W - m * (cols + 1)) / cols;
  const ch = (H - top - m * (rows + 1)) / rows;

  // まだ クリアして いない いちばん 前の 面 ＝ つぎに やると いい ところ
  let nextI = -1;
  for (let i = 0; i < STAGES.length; i++) {
    if (bestRank(STAGES[i], RG.fast) < 1) { nextI = i; break; }
  }

  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const cx = m + (i % cols) * (cw + m);
    const cy = top + Math.floor(i / cols) * (ch + m);
    const b = button(cx, cy, cw, ch, () => { showRule(st.key, RG.fast); });
    const hot = Math.sin(t * 3 + i) * 0.5 + 0.5;

    // カード
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(ctx, cx + 4, cy + 6, cw, ch, ch * 0.12); ctx.fill();
    const g = ctx.createLinearGradient(cx, cy, cx, cy + ch);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = g;
    rr(ctx, cx, cy, cw, ch, ch * 0.12); ctx.fill();
    ctx.strokeStyle = st.col; ctx.lineWidth = Math.max(2, H * 0.006);
    rr(ctx, cx, cy, cw, ch, ch * 0.12); ctx.stroke();

    // 上の おび（いろ）
    ctx.save();
    rr(ctx, cx, cy, cw, ch, ch * 0.12); ctx.clip();
    ctx.fillStyle = st.col;
    ctx.globalAlpha = 0.24;
    ctx.fillRect(cx, cy, cw, ch * 0.62);
    ctx.globalAlpha = 1;
    // キャラクター
    const scn = SCENES[st.scene];
    ctx.save();
    ctx.translate(0, -hot * ch * 0.015);
    if (st.remix) {
      SCENES.barber.icon(cx + cw * 0.28, cy + ch * 0.32, ch * 0.2);
      SCENES.ninja.icon(cx + cw * 0.6, cy + ch * 0.32, ch * 0.2);
      drawGhost(cx + cw * 0.86, cy + ch * 0.22, ch * 0.12, { good: 1, t: t });
    } else if (scn) {
      scn.icon(cx + cw * 0.5, cy + ch * 0.3, ch * 0.27);
    }
    ctx.restore();
    ctx.restore();

    if (i === nextI) {
      const bounce = Math.abs(Math.sin(t * 3)) * ch * 0.03;
      ctx.fillStyle = '#FFE066';
      rr(ctx, cx + cw * 0.5 - ch * 0.32, cy - ch * 0.11 - bounce, ch * 0.64, ch * 0.16,
         ch * 0.08); ctx.fill();
      text('つぎは ここ！', cx + cw * 0.5, cy - ch * 0.03 - bounce, ch * 0.1,
           '#3A2A10', 'center');
    }

    // なまえ
    text(st.name, cx + cw * 0.5, cy + ch * 0.68, ch * 0.145, '#FFFFFF', 'center', 'bold ', cw * 0.9);
    text(st.from, cx + cw * 0.5, cy + ch * 0.8, ch * 0.105, 'rgba(255,255,255,0.7)',
         'center', '', cw * 0.9);

    // じゅんばん の ばんごう
    ctx.fillStyle = st.col;
    cir(cx + ch * 0.15, cy + ch * 0.15, ch * 0.095); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    cir(cx + ch * 0.15, cy + ch * 0.15, ch * 0.095); ctx.stroke();
    text(String(i + 1), cx + ch * 0.15, cy + ch * 0.155, ch * 0.12, '#2A2440', 'center');

    // むずかしさ（●の かず）
    ctx.fillStyle = 'rgba(20,14,34,0.4)';
    rr(ctx, cx + cw - ch * 0.12 - 4 * ch * 0.085 - ch * 0.05, cy + ch * 0.14 - ch * 0.05,
       4 * ch * 0.085 + ch * 0.1, ch * 0.1, ch * 0.05); ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k < st.lv ? '#FFD166' : 'rgba(255,255,255,0.22)';
      cir(cx + cw - ch * 0.12 - (4 - k) * ch * 0.085, cy + ch * 0.14, ch * 0.028); ctx.fill();
    }

    // せいせき
    const r = bestRank(st, RG.fast);
    if (r < 0) {
      text('まだ あそんでない', cx + cw * 0.5, cy + ch * 0.92, ch * 0.1,
           'rgba(255,255,255,0.45)', 'center', '');
    } else {
      stars(cx + cw * 0.5 - ch * 0.07, cy + ch * 0.92, ch * 0.06, r, 2);
    }
  }
}

// --- あそびかた -------------------------------------------------------------------

function drawRule(t) {
  const st = STAGE_BY[RG.pending] || STAGES[0];
  starryBg(t * 0.4);
  ctx.fillStyle = 'rgba(10,6,24,0.45)';
  ctx.fillRect(0, 0, W, H);

  // 左に 大きな キャラクター
  const scn = SCENES[st.scene];
  ctx.save();
  ctx.translate(0, Math.sin(t * 3) * H * 0.012);
  if (scn) scn.icon(W * 0.2, H * 0.42, H * 0.34);
  ctx.restore();

  ctx.fillStyle = st.col;
  rr(ctx, W * 0.38, H * 0.14, W * 0.56, H * 0.1, H * 0.03); ctx.fill();
  text(st.name, W * 0.66, H * 0.19, H * 0.065, '#FFFFFF', 'center', 'bold ', W * 0.52);
  const idx = STAGES.indexOf(st);
  text(st.from + '　/　' + (RG.pendFast ? 'はやい' : 'ふつう') +
       '　/　' + (idx + 1) + 'ばんめ　むずかしさ ' +
       '●'.repeat(st.lv || 1) + '○'.repeat(5 - (st.lv || 1)),
       W * 0.66, H * 0.27, H * 0.04, '#FFE0B0', 'center', '', W * 0.56);

  text(st.rule, W * 0.66, H * 0.37, H * 0.055, '#FFF6C8', 'center', 'bold ', W * 0.56);
  for (let i = 0; i < st.how.length; i++) {
    text('・' + st.how[i], W * 0.4, H * (0.47 + i * 0.07), H * 0.045,
         '#D8D0F0', 'left', '', W * 0.54);
  }
  text(st.hold ? 'そうさ：おしっぱなし → はなす' : 'そうさ：画面を タップ（スペースキーでも OK）',
       W * 0.66, H * 0.66, H * 0.042, '#A8E0FF', 'center', '', W * 0.56);

  const bw = Math.min(W * 0.3, H * 0.66), bh = H * 0.12;
  drawButton(button(W * 0.66 - bw / 2, H * 0.76, bw, bh,
                    () => { startStage(st.key, RG.pendFast); }),
             '▶ はじめる！', '#FFE066', '#3A2A10');
  drawButton(button(H * 0.03, H - H * 0.13, Math.min(W * 0.16, H * 0.34), H * 0.09,
                    () => { RG.screen = 'select'; }), '← もどる', 'rgba(255,255,255,0.8)');
}

// --- あそんでいる 画面 --------------------------------------------------------------

function drawPlay() {
  const st = RG.st;
  const b = beatNow();
  const key = st.remix ? sceneKeyAt(st, b) : st.scene;
  const scn = SCENES[key] || SCENES[st.scene];
  const v = {
    beat: b, notes: RG.notes, hitB: RG.hitB, missB: RG.missB,
    holding: RG.holding, combo: RG.combo, hitLane: RG.hitLane,
  };
  scn.draw(v, RG.byScene[key] || []);

  // 上の おび
  ctx.fillStyle = 'rgba(18,14,32,0.5)';
  ctx.fillRect(0, 0, W, H * 0.085);
  text(st.name + (RG.fast ? '（はやい）' : ''), H * 0.03, H * 0.043, H * 0.045,
       '#FFFFFF', 'left', 'bold ', W * 0.3);

  // すすみぐあい
  const bw = W * 0.32, bx = W / 2 - bw / 2;
  const f = Math.max(0, Math.min(1, b / RG.endB));
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, bx, H * 0.026, bw, H * 0.034, H * 0.017); ctx.fill();
  ctx.fillStyle = st.col;
  rr(ctx, bx, H * 0.026, Math.max(4, bw * f), H * 0.034, H * 0.017); ctx.fill();

  if (RG.combo > 1) {
    text(RG.combo + ' れんぞく', W - H * 0.03, H * 0.043, H * 0.045,
         RG.combo >= 8 ? '#FFE066' : '#FFFFFF', 'right');
  }

  // カウント（はじめの 2小節）
  if (b < st.intro * 4) {
    const n = Math.floor(b) % 4 + 1;
    const u = b - Math.floor(b);
    if (b >= 0) {
      ctx.globalAlpha = Math.max(0, 1 - u * 1.4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(H * (0.26 + (1 - u) * 0.06)) + 'px ' + FONT;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = H * 0.014;
      ctx.strokeText(String(n), W / 2, H * 0.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(n), W / 2, H * 0.5);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
    banner(st.rule, H * 0.72, '#FFF3C4', H * 0.05);
  }

  // 出てくる もじ
  RG.pops.forEach((p, i) => {
    const dt = b - p.b;
    ctx.globalAlpha = Math.max(0, 1 - dt / 1.6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = fitFont(p.text, W * 0.5, H * 0.075, 'bold ');
    ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.lineWidth = Math.max(6, H * 0.024);
    const y = H * 0.30 - dt * H * 0.05 - i * H * 0.002;
    ctx.strokeText(p.text, W / 2, y);
    ctx.fillStyle = p.col;
    ctx.fillText(p.text, W / 2, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    void fs;
  });

  drawButton(button(H * 0.03, H - H * 0.105, H * 0.28, H * 0.08, () => {
    stopStage(); RG.screen = 'select';
  }), 'やめる', 'rgba(255,255,255,0.8)');

  if (RG.assist > 0) {
    text('やさしく してるよ', W - H * 0.03, H - H * 0.06, H * 0.04,
         'rgba(255,224,138,0.9)', 'right', '');
  }
}

// --- けっか -----------------------------------------------------------------------

function drawResult(t) {
  const st = RG.st;
  starryBg(t * 0.4);
  ctx.fillStyle = 'rgba(10,6,24,0.5)';
  ctx.fillRect(0, 0, W, H);

  const r = RG.rank;
  text(RANK_NAME[r], W * 0.5, H * 0.16, H * 0.11, RANK_COL[r], 'center');
  stars(W * 0.5 - H * 0.06, H * 0.29, H * 0.05, r, 2);

  // よろこぶ キャラクター
  const scn = SCENES[st.remix ? 'ninja' : st.scene];
  ctx.save();
  ctx.translate(0, -Math.abs(Math.sin(t * 4)) * H * (r >= 1 ? 0.03 : 0.005));
  if (scn) scn.icon(W * 0.2, H * 0.52, H * 0.3);
  ctx.restore();
  drawRina(W * 0.82, H * 0.92, H * 0.42,
           { arm: r >= 1 ? (Math.sin(t * 5) + 1) / 2 : 0, mood: r >= 1 ? 'happy' : 'sad',
             mic: 1, jump: r >= 2 ? Math.max(0, Math.sin(t * 5)) : 0 });

  // すうじ
  text(st.name + (RG.fast ? '（はやい）' : ''), W * 0.5, H * 0.06, H * 0.05,
       '#D8D0F0', 'center', '', W * 0.5);
  const rows = [
    ['ピッタリ', RG.perfect, '#FFE066'],
    ['おしい', RG.good, '#A8E0FF'],
    ['ミス', RG.miss + RG.extra, '#FF9C9C'],
    ['れんぞく', RG.maxCombo, '#7FE0A0'],
  ];
  const px = W * 0.38, py = H * 0.38;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, px - H * 0.03, py - H * 0.06, W * 0.32, H * 0.44, H * 0.03); ctx.fill();
  for (let i = 0; i < rows.length; i++) {
    text(rows[i][0], px, py + i * H * 0.1, H * 0.05, '#FFFFFF', 'left', '', W * 0.17);
    text(String(rows[i][1]), px + W * 0.26, py + i * H * 0.1, H * 0.06, rows[i][2], 'right');
  }

  const bw = Math.min(W * 0.24, H * 0.5), bh = H * 0.11;
  drawButton(button(W * 0.5 - bw - H * 0.02, H * 0.86, bw, bh,
                    () => { startStage(st.key, RG.fast); }),
             'もういちど', '#FFE066', '#3A2A10');
  drawButton(button(W * 0.5 + H * 0.02, H * 0.86, bw, bh,
                    () => { RG.screen = 'select'; }),
             'ほかの ゲーム', '#B8E8FF', '#20304A');

  if (r >= 1 && !RG.fast) {
    text('「はやい」でも やってみよう！', W * 0.5, H * 0.8, H * 0.042, '#FFE0B0', 'center', '');
  }
}

// --- ずれ合わせ --------------------------------------------------------------------

function drawCal(t) {
  starryBg(t * 0.3);
  ctx.fillStyle = 'rgba(10,6,24,0.45)';
  ctx.fillRect(0, 0, W, H);
  calPump();
  const c = RG.cal || { taps: [], done: 0 };

  text('ずれ合わせ', W * 0.5, H * 0.14, H * 0.08, '#FFF6C8', 'center');
  text('「カッ、カッ」に あわせて 8回 タップしてね', W * 0.5, H * 0.26, H * 0.05,
       '#D8D0F0', 'center', '');
  text('スマホは 音が すこし おくれて 出るので、ここで 合わせると ピッタリに なるよ',
       W * 0.5, H * 0.33, H * 0.04, '#A8B8D8', 'center', '', W * 0.86);

  // タップの かず
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i < c.taps.length ? '#FFE066' : 'rgba(255,255,255,0.2)';
    cir(W * 0.5 + (i - 3.5) * H * 0.09, H * 0.5, H * 0.028); ctx.fill();
  }
  drawRina(W * 0.5, H * 0.86, H * 0.34,
           { arm: Math.abs(Math.sin(t * 6)), mood: 'happy', mic: 1 });

  if (c.done) {
    text('できた！ ずれ ' + Math.round(save.lat * 1000) + 'ms', W * 0.5, H * 0.62,
         H * 0.055, '#7FE0A0', 'center');
  }
  drawButton(button(H * 0.03, H * 0.04, Math.min(W * 0.16, H * 0.34), H * 0.09,
                    () => { RG.cal = null; RG.screen = 'title'; }),
             '← もどる', 'rgba(255,255,255,0.82)');
  drawButton(button(W - H * 0.42, H * 0.04, H * 0.38, H * 0.09,
                    () => { save.lat = -1; storeSave(); calStart(); }),
             'やりなおす', '#FFC0C0');
}

// --- ほかの ゲームへ --------------------------------------------------------------

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function drawHubButton() {
  const mw = Math.min(W * 0.30, H * 0.62), mh = H * 0.085;
  drawButton(button(W - mw - H * 0.03, H * 0.03, mw, mh, gotoHub),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.86)', '#33304A');
}

function enterFullscreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  const so = window.screen && window.screen.orientation;
  if (so && so.lock) {
    try { const r = so.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (err) {}
  }
}

// --- そうさ -----------------------------------------------------------------------

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  audioStart();
  const p = pos(ev);
  const b = hitBtn(p.x, p.y);
  if (b) { if (b.on) b.on(); return; }
  if (RG.screen === 'play') rTap();
  else if (RG.screen === 'cal') calTap();
});
function upHandler() {
  if (RG.screen === 'play') rRelease();
}
canvas.addEventListener('pointerup', upHandler);
canvas.addEventListener('pointercancel', upHandler);
window.addEventListener('blur', () => { if (RG.holding) rRelease(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ほかの アプリに 行くと 画面は 止まるが 曲は 鳴りつづける。
// もどってきたら ぐちゃぐちゃ なので、いったん やめる。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && RG.screen === 'play') { stopStage(); RG.screen = 'select'; }
});

const KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (KEYS.indexOf(e.code) < 0) return;
  e.preventDefault();
  audioStart();
  if (RG.screen === 'play') rTap();
  else if (RG.screen === 'cal') calTap();
});
window.addEventListener('keyup', (e) => {
  if (KEYS.indexOf(e.code) < 0) return;
  e.preventDefault();
  if (RG.screen === 'play') rRelease();
});

// --- たて画面 ---------------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, W, H);
  text('よこ向きに してね', W / 2, H * 0.44, W * 0.07, '#FFFFFF', 'center');
  text('スマホを たおすと あそべます', W / 2, H * 0.55, W * 0.042, '#C8B8E0', 'center', '');
  drawRina(W / 2, H * 0.86, W * 0.28, { arm: 0.5, mood: 'happy', mic: 1 });
}

// --- ループ -----------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (RG.screen === 'play') {
    updatePlay();
    if (RG.screen === 'play') drawPlay();
    else drawResult(tsec);
  } else if (RG.screen === 'result') drawResult(tsec);
  else if (RG.screen === 'select') drawSelect(tsec);
  else if (RG.screen === 'rule') drawRule(tsec);
  else if (RG.screen === 'cal') drawCal(tsec);
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
