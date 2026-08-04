// 画面まわり。タイトル・HUD・クイズ・スタンプ帳・入力・ループ。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

const ui = {
  buttons: [],          // 毎フレーム作り直す。{x,y,w,h,on}
  btnScale: 1,
  book: { sel: null },
  fsWanted: false,
};

const input = { left: false, right: false, jump: false, jumpPressed: false };
const keys = {};
const touches = {};    // pointerId -> 'left'|'right'|'jump'

// ---------------------------------------------------------------- 大きさ

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = w; view.h = h; view.dpr = dpr;
  view.tile = h / VIEW_TILES_Y;
  view.tilesX = w / view.tile;
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// ---------------------------------------------------------------- 全画面

function fullscreenSupported() {
  const e = document.documentElement;
  return !!(e.requestFullscreen || e.webkitRequestFullscreen);
}
function isStandalone() {
  return window.navigator.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;
}
function enterFullscreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  if (screen.orientation && screen.orientation.lock) {
    try { screen.orientation.lock('landscape').catch(() => {}); } catch (err) {}
  }
}

// ---------------------------------------------------------------- ボタン

function button(x, y, w, h, on) {
  ui.buttons.push({ x, y, w, h, on });
  return { x, y, w, h };
}

function drawButton(b, label, col, sub) {
  ctx.fillStyle = col || '#ffffff';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(16, b.h * 0.25));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#20293a';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.86, b.h * 0.44, 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.35 : 0));
  if (sub) {
    ctx.font = Math.round(fs * 0.55) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#5a6478';
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.6);
  }
}

// 文字がボタンからはみ出さない大きさをさがす。
// 日本語は 1 文字がほぼ 1em あるので、文字数から見積もると必ずはみ出す。
function fitFont(text, maxW, maxH, weight) {
  let fs = Math.round(maxH);
  for (let i = 0; i < 12; i++) {
    ctx.font = (weight || '') + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 9) break;
    fs = Math.max(9, Math.floor(fs * 0.9));
  }
  return fs;
}

function hit(px, py) {
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
  }
  return null;
}

// ---------------------------------------------------------------- 入力

function clearInput() {
  input.left = input.right = input.jump = false;
  for (const k in touches) delete touches[k];
}

canvas.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  const px = ev.clientX - r.left, py = ev.clientY - r.top;
  const b = hit(px, py);
  if (b) {
    if (b.pad) {
      touches[ev.pointerId] = b.pad;
      if (b.pad === 'jump') { input.jump = true; input.jumpPressed = true; }
      else input[b.pad] = true;
    } else if (b.on) {
      b.on();
    }
  }
  canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
});

function releasePointer(ev) {
  const pad = touches[ev.pointerId];
  if (pad) {
    delete touches[ev.pointerId];
    let still = false;
    for (const k in touches) if (touches[k] === pad) still = true;
    if (!still) { if (pad === 'jump') input.jump = false; else input[pad] = false; }
  }
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (keys[e.key]) return;
  keys[e.key] = true;
  if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') input.right = true;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
    input.jump = true; input.jumpPressed = true; e.preventDefault();
  }
  if (game.screen === 'quiz' && '1234'.includes(e.key)) answerOrNext(+e.key - 1);
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') input.right = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') input.jump = false;
});

function answerOrNext(i) {
  const qz = game.quiz;
  if (!qz) return;
  if (!qz.answered) answerQuiz(i); else closeQuiz();
}

// ---------------------------------------------------------------- 操作ボタン

function drawPads() {
  const T = view.h;
  const s = T * 0.20 * ui.btnScale;
  const m = T * 0.035;
  const by = view.h - s - m;
  const p = game.player;
  // りなとボタンが重なるときは薄くする
  const px = sx(p.x), py = sy(p.y);
  const near = (bx, byy) => Math.hypot(px - (bx + s / 2), py - (byy + s / 2)) < s * 1.2;

  const defs = [
    { pad: 'left', x: m, y: by, label: '◀' },
    { pad: 'right', x: m + s * 1.15, y: by, label: '▶' },
    { pad: 'jump', x: view.w - s - m, y: by, label: '▲' },
  ];
  for (const d of defs) {
    const b = { x: d.x, y: d.y, w: s, h: s, pad: d.pad };
    ui.buttons.push(b);
    const active = d.pad === 'jump' ? input.jump : input[d.pad];
    ctx.globalAlpha = near(d.x, d.y) ? 0.28 : 0.7;
    ctx.fillStyle = active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)';
    rr(ctx, b.x, b.y, s, s, s * 0.3); ctx.fill();
    ctx.fillStyle = '#3a4560';
    ctx.font = 'bold ' + Math.round(s * 0.5) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.label, b.x + s / 2, b.y + s / 2);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- HUD

function drawHud() {
  const st = game.stage, p = game.player;
  const pad = view.h * 0.03;
  const fs = Math.max(13, Math.round(view.h * 0.045));
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  ctx.fillStyle = 'rgba(12,18,32,0.42)';
  rr(ctx, pad * 0.6, pad * 0.6, view.w * 0.46, fs * 2.5, 12); ctx.fill();

  ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
  ctx.fillStyle = '#ff9db0';
  const hearts = '♥'.repeat(p.hp) + '♡'.repeat(MAX_HP - p.hp);
  ctx.fillText(hearts, pad, pad);
  ctx.fillStyle = '#ffe27a';
  ctx.fillText('◎' + p.coins, pad + fs * 4.2, pad);
  ctx.fillStyle = '#fff';
  ctx.font = Math.round(fs * 0.85) + 'px system-ui, sans-serif';
  ctx.fillText(game.score.toLocaleString(), pad + fs * 7.6, pad + fs * 0.08);

  ctx.font = Math.round(fs * 0.78) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#dfe8ff';
  const gates = game.ents.filter(e => e.t === 'gate');
  const done = gates.filter(e => e.used).length;
  ctx.fillText(st.region + '地方  ' + game.stageNo + '/' + STAGES_PER_JOURNEY
               + '  鳥居 ' + done + '/' + gates.length, pad, pad + fs * 1.3);

  // 効果の残り
  const eff = [];
  if (p.star > 0) eff.push(['むてき', p.star, T_STAR, '#ffd93d']);
  if (p.dash > 0) eff.push(['ダッシュ', p.dash, T_DASH, '#5fd0e8']);
  if (p.feather > 0) eff.push(['2かい', p.feather, T_FEATHER, '#fff6c8']);
  if (p.magnet > 0) eff.push(['ひきよせ', p.magnet, T_MAGNET, '#ff9c7a']);
  let ey = pad + fs * 2.8;
  ctx.font = Math.round(fs * 0.62) + 'px system-ui, sans-serif';
  for (const [n, t, mx, c] of eff) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, pad, ey, view.w * 0.2, fs * 0.8, 6); ctx.fill();
    ctx.fillStyle = c;
    rr(ctx, pad, ey, view.w * 0.2 * (t / mx), fs * 0.8, 6); ctx.fill();
    ctx.fillStyle = '#132';
    ctx.fillText(n, pad + 6, ey + fs * 0.1);
    ey += fs * 1.0;
  }

  // ステージ名の帯
  if (game.msgT > 0) {
    const a = Math.min(1, game.msgT / 0.6);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(12,18,32,0.6)';
    ctx.fillRect(0, view.h * 0.36, view.w, view.h * 0.16);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(view.h * 0.075) + 'px system-ui, sans-serif';
    ctx.fillText(game.msg, view.w / 2, view.h * 0.44);
    ctx.globalAlpha = 1;
  }

  // 進みぐあいのバー
  const bw = view.w * 0.3, bx = view.w - bw - pad, byy = pad;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, bx, byy, bw, fs * 0.5, fs * 0.25); ctx.fill();
  ctx.fillStyle = '#9fe8b0';
  const prog = Math.min(1, p.x / (st.w - 5));
  rr(ctx, bx, byy, Math.max(fs * 0.5, bw * prog), fs * 0.5, fs * 0.25); ctx.fill();
}

// ---------------------------------------------------------------- タイトル

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, '#2b3f7a'); g.addColorStop(1, '#6fb6d8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);

  // うしろに日本地図をうっすら
  const ms = Math.min(view.w * 0.5, view.h * 0.98);
  ctx.globalAlpha = 0.16;
  drawJapanMap(ctx, view.w - ms - view.h * 0.02, (view.h - ms) / 2, ms, { base: '#ffffff' });
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const t = view.h;
  ctx.fillStyle = '#fff';
  fitFont('にっぽん大冒険', view.w * 0.5, t * 0.14, 'bold ');
  ctx.fillText('にっぽん大冒険', t * 0.08, t * 0.09);
  ctx.font = Math.round(t * 0.05) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#dbe8ff';
  ctx.fillText('とりいをくぐって 都道府県クイズ！', t * 0.09, t * 0.26);

  const known = masteryTotal();
  ctx.font = Math.round(t * 0.042) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('おぼえた県 ' + known + ' / 47' +
               (save.best ? '　さいこう ' + save.best.toLocaleString() + '点' : ''),
               t * 0.09, t * 0.34);

  const bw = t * 0.62, bh = t * 0.15;
  let by = t * 0.46;
  drawButton(button(t * 0.08, by, bw, bh, () => { if (ui.fsWanted) enterFullscreen(); startJourney(); }),
             'はじめる', '#ffd166');
  by += bh * 1.2;
  drawButton(button(t * 0.08, by, bw * 0.48, bh * 0.85, () => { game.screen = 'book'; }),
             'スタンプ帳', '#bfe8c8');
  const fsLabel = fullscreenSupported()
    ? (ui.fsWanted ? 'ぜんがめん ON' : 'ぜんがめん OFF')
    : 'ホーム画面に追加';
  drawButton(button(t * 0.08 + bw * 0.52, by, bw * 0.48, bh * 0.85, () => {
    if (fullscreenSupported()) { ui.fsWanted = !ui.fsWanted; if (ui.fsWanted) enterFullscreen(); }
  }), fsLabel, '#cfd8ea');

  ctx.textAlign = 'left';
  ctx.font = Math.round(t * 0.033) + 'px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('◀▶ うごく　▲ ジャンプ（長おしで高く）', t * 0.08, t * 0.87);
  if (!fullscreenSupported() && !isStandalone()) {
    ctx.fillText('iPhone は「ホーム画面に追加」してから開くと大きく遊べます', t * 0.08, t * 0.92);
  }
}

// ---------------------------------------------------------------- クイズ

function drawQuiz(dt) {
  drawWorld(ctx);
  ctx.fillStyle = 'rgba(8,12,24,0.72)';
  ctx.fillRect(0, 0, view.w, view.h);

  const qz = game.quiz, q = qz.q;
  const t = view.h;
  const pw = Math.min(view.w * 0.95, view.h * 2.0), ph = view.h * 0.92;
  const px = (view.w - pw) / 2, py = (view.h - ph) / 2;
  ctx.fillStyle = '#fdfbf4';
  rr(ctx, px, py, pw, ph, t * 0.04); ctx.fill();

  // 問題文
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#22304a';
  const fsQ = Math.round(t * 0.062);
  ctx.font = 'bold ' + fsQ + 'px system-ui, sans-serif';
  ctx.fillText(q.prompt, px + pw / 2, py + t * 0.035);
  if (q.sub) {
    ctx.font = Math.round(t * 0.032) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#7a869c';
    ctx.fillText(q.sub, px + pw / 2, py + t * 0.105);
  }

  // のこり時間
  if (!qz.answered) {
    qz.time -= dt;
    if (qz.time <= 0) { qz.time = 0; answerQuiz(-1); }
  }
  if (!qz.answered) {
    const barW = pw * 0.6;
    ctx.fillStyle = '#e6e2d8';
    rr(ctx, px + pw / 2 - barW / 2, py + ph - t * 0.05, barW, t * 0.018, t * 0.01); ctx.fill();
    ctx.fillStyle = qz.time > 7 ? '#7fc98f' : '#e8895f';
    rr(ctx, px + pw / 2 - barW / 2, py + ph - t * 0.05,
       Math.max(0, barW * qz.time / QUIZ_TIME), t * 0.018, t * 0.01); ctx.fill();
  }

  // 左：絵、右：選択肢。答え合わせの帯が出たら、その分だけ上に詰める
  const resH = qz.answered ? ph * 0.34 : 0;
  const mediaW = pw * 0.42;
  const mx = px + t * 0.03, my = py + t * 0.14;
  const mh = ph - t * 0.24 - resH;
  if (q.media) {
    ctx.fillStyle = '#eaf3fb';
    rr(ctx, mx, my, mediaW, mh, t * 0.03); ctx.fill();
    if (q.media.type === 'shape') {
      drawPrefShape(ctx, PREF_BY_ID[q.media.id], mx + mediaW / 2, my + mh / 2,
                    Math.min(mediaW, mh) * 0.78, '#4f7dc0', '#22304a', 2.5);
    } else {
      const s = Math.min(mediaW, mh) * 0.96;
      drawJapanMap(ctx, mx + (mediaW - s) / 2, my + (mh - s) / 2, s, {
        hi: q.media.hi, marks: q.media.marks, base: '#dfe8d6',
      });
    }
  }

  // 選択肢
  const cx0 = q.media ? mx + mediaW + t * 0.03 : px + t * 0.06;
  const cw = px + pw - t * 0.03 - cx0;
  const n = 4;
  const gapY = t * 0.018;
  // 形をえらぶ問題は 2×2 に並べる。たてに 4 つ並べると形が小さくて見分けられない
  const grid = q.choiceKind === 'shape';
  const chH = grid ? (mh - gapY) / 2 : (mh - gapY * (n - 1)) / n;
  const chW = grid ? (cw - gapY) / 2 : cw;
  for (let i = 0; i < n; i++) {
    const by = grid ? my + ((i / 2) | 0) * (chH + gapY) : my + i * (chH + gapY);
    const bx = grid ? cx0 + (i % 2) * (chW + gapY) : cx0;
    const b = { x: bx, y: by, w: chW, h: chH };
    let col = '#ffffff';
    if (qz.answered) {
      if (i === q.answer) col = '#a8e6b4';
      else if (i === qz.picked) col = '#ffb3b3';
      else col = '#eceff4';
    }
    if (!qz.answered) {
      const idx = i;
      ui.buttons.push({ x: b.x, y: b.y, w: b.w, h: b.h, on: () => answerQuiz(idx) });
    }
    ctx.fillStyle = col;
    rr(ctx, b.x, b.y, b.w, b.h, t * 0.025); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();

    if (q.choiceKind === 'shape') {
      const room = Math.min(b.w, b.h) * 0.78;
      drawPrefShape(ctx, PREF_BY_ID[q.choices[i]], b.x + b.w / 2, b.y + b.h * 0.48,
                    room, '#4f7dc0', '#22304a', 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#22304a';
      ctx.font = 'bold ' + Math.round(b.h * 0.16) + 'px system-ui, sans-serif';
      ctx.fillText(String(i + 1), b.x + b.w * 0.05, b.y + b.h * 0.05);
      if (qz.answered) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.font = 'bold ' + Math.round(b.h * 0.16) + 'px system-ui, sans-serif';
        ctx.fillText(PREF_BY_ID[q.choices[i]].name, b.x + b.w / 2, b.y + b.h * 0.98);
      }
    } else if (q.choiceKind === 'mark') {
      ctx.fillStyle = MARK_COLORS[i];
      ctx.beginPath();
      ctx.arc(b.x + b.h * 0.55, b.y + b.h / 2, b.h * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px system-ui, sans-serif';
      ctx.fillText(String(i + 1), b.x + b.h * 0.55, b.y + b.h / 2);
      if (qz.answered) {
        ctx.fillStyle = '#22304a';
        ctx.textAlign = 'left';
        ctx.font = Math.round(b.h * 0.36) + 'px system-ui, sans-serif';
        ctx.fillText(PREF_BY_ID[q.media.marks[i]].name, b.x + b.h * 1.0, b.y + b.h / 2);
      }
    } else {
      ctx.fillStyle = '#22304a';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const label = q.choices[i];
      fitFont(label, b.w * 0.84, b.h * 0.6, 'bold ');
      ctx.fillText(label, b.x + b.w * 0.08, b.y + b.h / 2);
    }
  }

  // 答え合わせ
  if (qz.answered) {
    qz.resultT += dt;
    const rh = resH - t * 0.03;
    const ry = py + ph - rh - t * 0.055;
    ctx.fillStyle = qz.ok ? 'rgba(80,180,110,0.95)' : 'rgba(70,95,140,0.95)';
    rr(ctx, px + t * 0.03, ry, pw - t * 0.06, rh, t * 0.03); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(t * 0.07) + 'px system-ui, sans-serif';
    ctx.fillText(qz.ok ? 'せいかい！ +' + qz.bonus
                       : (qz.timeUp ? 'じかん切れ…' : 'ざんねん…'),
                 px + pw / 2, ry + rh * 0.22);
    ctx.font = Math.round(t * 0.042) + 'px system-ui, sans-serif';
    ctx.fillText(answerNote(q), px + pw / 2, ry + rh * 0.48);
    ctx.font = Math.round(t * 0.034) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(q.target.memo, px + pw / 2, ry + rh * 0.68);

    const bw2 = pw * 0.3, bh2 = t * 0.09;
    const nb = button(px + pw / 2 - bw2 / 2, ry + rh - bh2 * 0.55, bw2, bh2, closeQuiz);
    drawButton(nb, qz.ok ? 'アイテムをもらう' : 'つぎへ', '#ffd166');
  }
}

// ---------------------------------------------------------------- クリア画面

function drawClear() {
  drawWorld(ctx);
  ctx.fillStyle = 'rgba(8,12,24,0.75)';
  ctx.fillRect(0, 0, view.w, view.h);
  const t = view.h, r = game.result;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.round(t * 0.1) + 'px system-ui, sans-serif';
  ctx.fillText('ゴール！', view.w / 2, t * 0.08);
  ctx.font = Math.round(t * 0.05) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(r.region + '地方  ' + r.stageNo + '/' + STAGES_PER_JOURNEY,
               view.w / 2, t * 0.21);

  ctx.font = Math.round(t * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#dfe8ff';
  const lines = [
    'タイム ' + r.timeSec.toFixed(1) + ' 秒（ボーナス +' + r.timeBonus + '）',
    'コイン ' + game.player.coins + ' まい',
    'クイズ ' + game.quizOk + ' / ' + game.quizDone + ' 問せいかい',
    'スコア ' + game.score.toLocaleString(),
  ];
  lines.forEach((s, i) => ctx.fillText(s, view.w / 2, t * 0.32 + i * t * 0.07));

  const bw = t * 0.5, bh = t * 0.13;
  drawButton(button(view.w / 2 - bw / 2, t * 0.72, bw, bh, () => {
    if (r.last) { game.screen = 'end'; } else { nextStage(); }
  }), r.last ? 'たびの おわりへ' : 'つぎの地方へ', '#ffd166');
}

// ---------------------------------------------------------------- 旅のおわり

function drawEnd() {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, '#2b3f7a'); g.addColorStop(1, '#e88a5c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);

  const t = view.h;
  const ms = Math.min(view.w * 0.44, view.h * 0.86);
  drawJapanMap(ctx, view.w * 0.05, (view.h - ms) / 2, ms, { mastery: true });

  const lx = view.w * 0.05 + ms + t * 0.05;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  fitFont('たび、おつかれさま！', view.w - lx - t * 0.04, t * 0.09, 'bold ');
  ctx.fillText('たび、おつかれさま！', lx, t * 0.1);
  ctx.fillStyle = '#ffe9a8';
  const lines = [
    'まわった地方: ' + game.journey.join('・'),
    'クイズ ' + game.quizOk + ' / ' + game.quizDone + ' 問せいかい',
    'コイン ' + game.coinsTotal + ' まい',
    'スコア ' + game.score.toLocaleString() + '点',
    'おぼえた県 ' + masteryTotal() + ' / 47',
  ];
  const lineW = view.w - lx - t * 0.04;
  lines.forEach((s, i) => {
    fitFont(s, lineW, t * 0.045);
    ctx.fillText(s, lx, t * 0.26 + i * t * 0.065);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  fitFont('地図の色は おぼえ具合。緑になるまで なんども旅しよう！',
          view.w - lx - t * 0.04, t * 0.033);
  ctx.fillText('地図の色は おぼえ具合。緑になるまで なんども旅しよう！', lx, t * 0.62);

  const bw = t * 0.45, bh = t * 0.12;
  drawButton(button(lx, t * 0.72, bw, bh, startJourney), 'もう一度たびに出る', '#ffd166');
  drawButton(button(lx + bw * 1.1, t * 0.72, bw * 0.8, bh, () => { game.screen = 'book'; }),
             'スタンプ帳', '#bfe8c8');
}

// ---------------------------------------------------------------- スタンプ帳

function drawBook() {
  ctx.fillStyle = '#f3efe2';
  ctx.fillRect(0, 0, view.w, view.h);
  const t = view.h;
  const ms = Math.min(view.w * 0.5, view.h * 0.84);
  const mx = t * 0.03, my = t * 0.1;
  drawJapanMap(ctx, mx, my, ms, { mastery: true, sel: ui.book.sel && ui.book.sel.id });
  ui.buttons.push({
    x: mx, y: my, w: ms, h: ms, map: true,
    on: null, mapBox: { x: mx, y: my, s: ms },
  });

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#3a4560';
  ctx.font = 'bold ' + Math.round(t * 0.055) + 'px system-ui, sans-serif';
  ctx.fillText('スタンプ帳', mx, t * 0.02);
  ctx.font = Math.round(t * 0.032) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#6b7688';
  ctx.fillText('地図をタップすると くわしく見られるよ', mx + t * 0.3, t * 0.035);

  // 色の説明
  const legend = [['まだ', '#e6e6e6'], ['ちょっと', '#ffe0a8'],
                  ['おぼえた', '#a8e0a0'], ['ばっちり', '#5fc27e']];
  let lx0 = mx;
  ctx.font = Math.round(t * 0.028) + 'px system-ui, sans-serif';
  for (const [n, c] of legend) {
    ctx.fillStyle = c;
    rr(ctx, lx0, view.h - t * 0.055, t * 0.045, t * 0.032, 4); ctx.fill();
    ctx.fillStyle = '#4a5568';
    ctx.fillText(n, lx0 + t * 0.055, view.h - t * 0.052);
    lx0 += t * 0.055 + ctx.measureText(n).width + t * 0.04;
  }

  // 右がわのカード
  const cx0 = mx + ms + t * 0.04;
  const cw = view.w - cx0 - t * 0.03;
  const p = ui.book.sel;
  ctx.fillStyle = '#fff';
  rr(ctx, cx0, t * 0.1, cw, view.h - t * 0.22, t * 0.03); ctx.fill();
  ctx.strokeStyle = '#ddd6c4'; ctx.lineWidth = 2; ctx.stroke();

  if (!p) {
    ctx.fillStyle = '#98a2b3';
    ctx.textAlign = 'center';
    ctx.font = Math.round(t * 0.04) + 'px system-ui, sans-serif';
    ctx.fillText('都道府県をえらんでね', cx0 + cw / 2, view.h / 2);
  } else {
    const st2 = save.pref[p.id] || { c: 0, w: 0 };
    drawPrefShape(ctx, p, cx0 + cw * 0.19, t * 0.33, Math.min(cw * 0.28, t * 0.28),
                  '#8fb6e0', '#3a4560', 2.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#22304a';
    ctx.font = 'bold ' + Math.round(t * 0.06) + 'px system-ui, sans-serif';
    ctx.fillText(p.name, cx0 + cw * 0.44, t * 0.16);
    ctx.font = Math.round(t * 0.033) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#6b7688';
    ctx.fillText(p.kana, cx0 + cw * 0.44, t * 0.235);
    ctx.font = Math.round(t * 0.038) + 'px system-ui, sans-serif';
    ctx.fillStyle = '#22304a';
    ctx.fillText('県庁所在地　' + p.cap + '市', cx0 + cw * 0.44, t * 0.29);
    ctx.fillText('地方　　　　' + p.region, cx0 + cw * 0.44, t * 0.35);
    ctx.fillStyle = '#4a5568';
    ctx.font = Math.round(t * 0.036) + 'px system-ui, sans-serif';
    ctx.fillText('ゆうめいなもの', cx0 + cw * 0.06, t * 0.52);
    ctx.fillStyle = '#22304a';
    ctx.font = Math.round(t * 0.04) + 'px system-ui, sans-serif';
    p.famous.forEach((f, i) => {
      ctx.fillText('・' + f, cx0 + cw * (i % 2 ? 0.52 : 0.08),
                   t * 0.58 + ((i / 2) | 0) * t * 0.055);
    });
    ctx.fillStyle = '#5a6478';
    ctx.font = Math.round(t * 0.032) + 'px system-ui, sans-serif';
    wrapText(ctx, p.memo, cx0 + cw * 0.06, t * 0.72, cw * 0.88, t * 0.042);
    ctx.fillStyle = '#7a869c';
    ctx.fillText('クイズ せいかい ' + st2.c + ' 回 ／ まちがい ' + st2.w + ' 回',
                 cx0 + cw * 0.06, view.h - t * 0.16);
  }

  const bw = t * 0.28, bh = t * 0.09;
  drawButton(button(view.w - bw - t * 0.04, view.h - bh - t * 0.03, bw, bh,
                    () => { game.screen = game.result && game.result.last ? 'end' : 'title'; }),
             'もどる', '#ffd166');
}

function wrapText(c, text, x, y, maxW, lh) {
  let line = '';
  for (const ch of text) {
    if (c.measureText(line + ch).width > maxW) { c.fillText(line, x, y); y += lh; line = ''; }
    line += ch;
  }
  if (line) c.fillText(line, x, y);
}

// 地図タップ
canvas.addEventListener('pointerdown', ev => {
  if (game.screen !== 'book') return;
  const r = canvas.getBoundingClientRect();
  const px = ev.clientX - r.left, py = ev.clientY - r.top;
  for (const b of ui.buttons) {
    if (!b.map) continue;
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
      const p = prefAt(px, py, b.mapBox.x, b.mapBox.y, b.mapBox.s);
      if (p) ui.book.sel = p;
    }
  }
});

// ---------------------------------------------------------------- たて画面

function drawRotate() {
  ctx.fillStyle = '#101828';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(view.w * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', view.w / 2, view.h * 0.45);
  ctx.font = Math.round(view.w * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#9fb0d0';
  ctx.fillText('スマホをたおすと あそべます', view.w / 2, view.h * 0.56);
}

// ---------------------------------------------------------------- ループ

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  ui.buttons = [];

  if (view.w < view.h * 1.15) { drawRotate(); clearInput(); return; }

  if (game.screen === 'play') {
    updatePlay(dt, input);
    drawWorld(ctx);
    drawHud();
    drawPads();
  } else if (game.screen === 'quiz') {
    clearInput();
    drawQuiz(dt);
  } else if (game.screen === 'clear') {
    clearInput();
    drawClear();
  } else if (game.screen === 'end') {
    drawEnd();
  } else if (game.screen === 'book') {
    drawBook();
  } else {
    drawTitle();
  }
  input.jumpPressed = false;
}

loadSave();
layout();
requestAnimationFrame(frame);
