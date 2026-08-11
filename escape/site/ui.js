// 画面・そうさ・メインループ。よこ向き専用。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;

const ui = { buttons: [], stick: null, page: 0 };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// --- 部品 ---------------------------------------------------------------------

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
    if (ctx.measureText(text).width <= maxW || fs <= 8) break;
    fs = Math.max(8, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on, tag) {
  const b = { x, y, w, h, on, tag };
  ui.buttons.push(b); return b;
}

function drawButton(b, label, col, textCol, sub) {
  ctx.fillStyle = col || '#FFFFFF';
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.26)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#2A2440';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.36 : 0.46), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(42,36,64,0.7)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.8);
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

// --- 人の 絵 -------------------------------------------------------------------
//
// 上から 見た すがた。頭（まる）＋ からだ ＋ 手足。
// 走ると 足が うごく。

function drawPerson(x, y, s, face, step, opt) {
  const sw = Math.sin(step * 9) * s * 0.22;
  ctx.save();
  ctx.translate(x, y);
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, s * 0.34, s * 0.42, s * 0.2, 0, 0, 7); ctx.fill();
  ctx.rotate(face + Math.PI / 2);
  // 足
  ctx.fillStyle = opt.leg;
  ctx.fillRect(-s * 0.26, s * 0.05 + sw, s * 0.18, s * 0.3);
  ctx.fillRect(s * 0.08, s * 0.05 - sw, s * 0.18, s * 0.3);
  // からだ
  ctx.fillStyle = opt.body;
  rr(ctx, -s * 0.34, -s * 0.2, s * 0.68, s * 0.44, s * 0.14); ctx.fill();
  // うで
  ctx.fillStyle = opt.skin;
  ctx.fillRect(-s * 0.46, -s * 0.14 - sw, s * 0.14, s * 0.3);
  ctx.fillRect(s * 0.32, -s * 0.14 + sw, s * 0.14, s * 0.3);
  // 頭
  ctx.fillStyle = opt.skin;
  ctx.beginPath(); ctx.arc(0, -s * 0.26, s * 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = opt.hair;
  ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.3, Math.PI, 0); ctx.fill();
  if (opt.pig) {                                  // りなの おさげ
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.26, s * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.26, s * 0.12, 0, 7); ctx.fill();
  }
  // かお（前を むいている ほう）
  ctx.fillStyle = '#33313E';
  if (opt.glasses) {
    ctx.fillStyle = '#20202A';
    rr(ctx, -s * 0.26, -s * 0.34, s * 0.52, s * 0.16, s * 0.05); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-s * 0.22, -s * 0.32, s * 0.08, s * 0.05);
  } else {
    ctx.beginPath(); ctx.arc(-s * 0.11, -s * 0.32, s * 0.045, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.11, -s * 0.32, s * 0.045, 0, 7); ctx.fill();
  }
  ctx.restore();
}

const RINA = { skin: '#F2C9A8', hair: '#5A3A26', body: '#F06A9C', leg: '#4A6ACF', pig: true };
const PAPA = { skin: '#E8BE98', hair: '#2E2A28', body: '#3E7ACF', leg: '#3A3A44' };

// --- あそんでいる 画面 ---------------------------------------------------------

function tileSize() {
  // まわりが 見えないと パパから にげられない。
  // よこ 18ます・たて 10ますくらいが 入るように する。
  return Math.max(16, Math.min(W / 18, H / 10.2));
}

function drawPlay() {
  const st = game.stage, mz = game.mz, r = game.rina;
  const ts = tileSize();
  let camX = r.x, camY = r.y;
  // めいろ ぜんぶが 入るなら まん中に そろえる
  const viewW = W / ts, viewH = (H * 0.86) / ts;
  if (mz.w <= viewW) camX = mz.w / 2;
  else camX = Math.max(viewW / 2, Math.min(mz.w - viewW / 2, camX));
  if (mz.h <= viewH) camY = mz.h / 2;
  else camY = Math.max(viewH / 2, Math.min(mz.h - viewH / 2, camY));
  const sx = Math.sin(game.shake * 40) * game.shake * 8;
  const ox = W / 2 - camX * ts + sx, oy = H * 0.46 - camY * ts;

  ctx.fillStyle = '#20203A'; ctx.fillRect(0, 0, W, H);

  // ゆか と かべ
  const x0 = Math.max(0, Math.floor(-ox / ts) - 1), x1 = Math.min(mz.w - 1, Math.ceil((W - ox) / ts));
  const y0 = Math.max(0, Math.floor(-oy / ts) - 1), y1 = Math.min(mz.h - 1, Math.ceil((H - oy) / ts));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = ox + x * ts, py = oy + y * ts;
      if (mz.g[y * mz.w + x] === 1) {
        ctx.fillStyle = st.gim === 'ice' ? '#4E6E9E' : '#5A4A7A';
        ctx.fillRect(px, py, ts + 1, ts + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.fillRect(px, py, ts + 1, ts * 0.22);
      } else {
        ctx.fillStyle = ((x + y) & 1) ? (st.gim === 'ice' ? '#BFE0F0' : '#E8E2D6')
                                      : (st.gim === 'ice' ? '#A8D2E8' : '#DCD4C4');
        ctx.fillRect(px, py, ts + 1, ts + 1);
      }
    }
  }

  // アイテム
  for (const it of game.items) {
    if (it.got) continue;
    const px = ox + (it.x + 0.5) * ts, py = oy + (it.y + 0.5) * ts
      + Math.sin(game.t * 3 + it.bob) * ts * 0.08;
    if (it.kind === 'shoe') {
      ctx.fillStyle = '#37D67A';
      ctx.beginPath(); ctx.arc(px, py, ts * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold ' + Math.round(ts * 0.34) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('速', px, py + ts * 0.02);
    } else {
      ctx.fillStyle = '#FF7A5A';
      ctx.beginPath(); ctx.arc(px, py, ts * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#20202A';
      rr(ctx, px - ts * 0.2, py - ts * 0.06, ts * 0.4, ts * 0.13, ts * 0.04); ctx.fill();
    }
  }

  // りな と パパ
  const psz = ts * 1.05;
  for (const p of game.papas) {
    drawPerson(ox + p.x * ts, oy + p.y * ts, psz, p.face, p.step,
               Object.assign({}, PAPA, { glasses: p.glasses }));
  }
  if (r.boost > 0) {
    ctx.strokeStyle = 'rgba(80,240,150,' + (0.35 + Math.sin(game.t * 18) * 0.2) + ')';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ox + r.x * ts, oy + r.y * ts, ts * 0.62, 0, 7); ctx.stroke();
  }
  drawPerson(ox + r.x * ts, oy + r.y * ts, psz, r.face, r.step, RINA);

  // 出てくる 文字
  for (const p of game.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    ctx.fillStyle = p.col;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(p.text, W * 0.4, H * 0.042, 'bold ');
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
    const px = ox + (p.x + 0.5) * ts, py = oy + (p.y + 0.5) * ts - p.t * ts * 0.8;
    ctx.strokeText(p.text, px, py); ctx.fillText(p.text, px, py);
    ctx.globalAlpha = 1;
  }

  // まっくらの 面
  if (st.gim === 'dark') {
    const lx = ox + r.x * ts, ly = oy + r.y * ts;
    const rad = ts * 5.6;
    const g = ctx.createRadialGradient(lx, ly, rad * 0.3, lx, ly, rad);
    g.addColorStop(0, 'rgba(8,6,18,0)');
    g.addColorStop(0.6, 'rgba(8,6,18,0.55)');
    g.addColorStop(1, 'rgba(8,6,18,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // パパは ぼんやり 光って 見える（どこに いるか わからないと つらすぎる）
    for (const p of game.papas) {
      const px = ox + p.x * ts, py = oy + p.y * ts;
      const g2 = ctx.createRadialGradient(px, py, 0, px, py, ts * 1.5);
      g2.addColorStop(0, 'rgba(255,120,90,0.5)');
      g2.addColorStop(1, 'rgba(255,120,90,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(px, py, ts * 1.5, 0, 7); ctx.fill();
    }
  }

  drawHUD();
}

function drawHUD() {
  const st = game.stage;
  // 上の おび
  ctx.fillStyle = 'rgba(16,14,32,0.62)';
  ctx.fillRect(0, 0, W, H * 0.105);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.046) + 'px system-ui, sans-serif';
  ctx.fillText(st.n + '面', H * 0.03, H * 0.052);

  // のこり時間の バー
  const bw = W * 0.42, bx = W / 2 - bw / 2;
  const f = Math.max(0, game.timeLeft / (game.timeMax || st.time));
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(ctx, bx, H * 0.028, bw, H * 0.05, H * 0.025); ctx.fill();
  ctx.fillStyle = f > 0.5 ? '#7FE0A0' : f > 0.22 ? '#FFD166' : '#FF7A7A';
  rr(ctx, bx, H * 0.028, Math.max(6, bw * f), H * 0.05, H * 0.025); ctx.fill();
  ctx.fillStyle = '#1E1A32'; ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.round(H * 0.036) + 'px system-ui, sans-serif';
  ctx.fillText('のこり ' + Math.ceil(game.timeLeft) + 'びょう', W / 2, H * 0.0545);

  // パパの 数
  ctx.textAlign = 'right'; ctx.fillStyle = '#FFC0B0';
  ctx.font = 'bold ' + Math.round(H * 0.04) + 'px system-ui, sans-serif';
  const gl = game.papas.filter((p) => p.glasses).length;
  ctx.fillText('パパ ' + game.papas.length + (gl ? '（サングラス ' + gl + '）' : ''),
               W - H * 0.03, H * 0.052);
  ctx.textAlign = 'left';

  // まん中の おしらせ
  if (game.msgT > 0) {
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.fillStyle = 'rgba(16,10,26,0.8)';
    const tw = W * 0.52;
    rr(ctx, W / 2 - tw / 2, H * 0.14, tw, H * 0.085, 12); ctx.fill();
    ctx.fillStyle = '#FFC8A8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(game.msg, tw * 0.9, H * 0.045, 'bold ');
    ctx.fillText(game.msg, W / 2, H * 0.1825);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // 面の はじめの あんない
  if (game.intro > 0) {
    const g = GIMMICK[game.stage.gim];
    ctx.fillStyle = 'rgba(10,8,20,0.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = g.col || '#FFD166';
    fitFont(g.name, W * 0.8, H * 0.13, 'bold ');
    ctx.fillText(g.name, W / 2, H * 0.4);
    ctx.fillStyle = '#E8E4F4';
    fitFont(g.desc, W * 0.8, H * 0.05);
    ctx.fillText(g.desc, W / 2, H * 0.53);
    ctx.textAlign = 'left';
  }

  // 歩く まる
  if (ui.stick) {
    const rad = Math.min(H * 0.13, 90);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ui.stick.ox, ui.stick.oy, rad, 0, 7); ctx.stroke();
    const dx = ui.stick.x - ui.stick.ox, dy = ui.stick.y - ui.stick.oy;
    const L = Math.min(rad, Math.hypot(dx, dy)) || 0;
    const a = Math.atan2(dy, dx);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(ui.stick.ox + Math.cos(a) * L, ui.stick.oy + Math.sin(a) * L, rad * 0.36, 0, 7);
    ctx.fill();
  } else if (game.t < 4) {
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, (4 - game.t) * 0.25) + ')';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont('画面を ゆびで なぞると にげる', W * 0.6, H * 0.05, 'bold ');
    ctx.fillText('画面を ゆびで なぞると にげる', W / 2, H * 0.9);
    ctx.textAlign = 'left';
  }

  drawButton(button(H * 0.03, H - H * 0.11, H * 0.28, H * 0.08,
                    () => { game.screen = 'select'; }), 'やめる', 'rgba(255,255,255,0.8)');
}

// --- タイトル -----------------------------------------------------------------

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3B2A6E'); g.addColorStop(1, '#C4568C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // うしろで おいかけっこ
  const t = game.t;
  const py = H * 0.72;
  drawPerson(W * 0.52 + Math.sin(t * 0.9) * W * 0.2, py, H * 0.17, 0, t * 2.2, RINA);
  drawPerson(W * 0.36 + Math.sin(t * 0.9 - 0.5) * W * 0.2, py + H * 0.03,
             H * 0.17, 0, t * 2.2, Object.assign({}, PAPA, { glasses: true }));

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('りな逃走中', W * 0.5, H * 0.16, 'bold ');
  ctx.fillText('りな逃走中', H * 0.06, H * 0.06);
  ctx.fillStyle = '#FFE0EE';
  fitFont('パパから にげきれ！ ぜんぶで 30面', W * 0.5, H * 0.05);
  ctx.fillText('パパから にげきれ！ ぜんぶで 30面', H * 0.07, H * 0.245);
  ctx.fillStyle = '#FFF3C4';
  const prog = 'クリアした 面 ' + save.cleared + ' / ' + STAGES.length;
  fitFont(prog, W * 0.5, H * 0.042);
  ctx.fillText(prog, H * 0.07, H * 0.315);

  const bw = Math.min(W * 0.42, H * 0.95), bh = H * 0.135;
  const x = H * 0.06;
  let y = H * 0.4;
  drawButton(button(x, y, bw, bh, () => {
    enterFullscreen();
    startStage(Math.min(save.cleared, STAGES.length - 1));
  }), save.cleared > 0 ? (save.cleared + 1) + '面から はじめる' : 'はじめる', '#FFD166');
  y += bh * 1.16;
  drawButton(button(x, y, bw * 0.49, bh * 0.86, () => { ui.page = 0; game.screen = 'select'; }),
             '面を えらぶ', '#BFE4F0');
  drawButton(button(x + bw * 0.51, y, bw * 0.49, bh * 0.86, () => { game.screen = 'howto'; }),
             'あそびかた', '#D8D4F0');
  drawHubButton();
}

function drawHowto() {
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFB0D0';
  ctx.font = 'bold ' + Math.round(H * 0.075) + 'px system-ui, sans-serif';
  ctx.fillText('あそびかた', H * 0.05, H * 0.05);
  const lines = [
    '① 画面を ゆびで なぞると、その むきに りなが 走る',
    '② パパに つかまらずに 時間まで にげきれば クリア',
    '③ みどりの「速」を とると、りなが 4.5びょう 速くなる',
    '④ オレンジの サングラスは パパの アイテム！',
    '　 パパが 先に とると 速くなって、サングラスを かけて 追ってくる',
    '　 りなが 先に とれば かくせる！ ぎりぎりを ねらおう',
    '⑤ めいろは ぐるぐる まわれる ように 作ってある。ゆきどまりに 注意',
    '⑥ 面が すすむと めいろが 大きく、パパが ふえる（さいごは 5人！）',
    '⑦ ときどき へんな 面が 出る',
    '　 まっくら＝りなの まわりしか 見えない / つるつる＝ゆかが すべる',
    '⑧ ぜんぶで 30面。クリアした ところから つづきが できる',
    'パソコン: やじるしキー か WASD で うごく',
  ];
  ctx.fillStyle = '#D8D4EC';
  const step = Math.min(H * 0.072, (H * 0.70) / lines.length);
  lines.forEach((s, i) => {
    fitFont(s, W * 0.92, Math.min(H * 0.042, step * 0.7));
    ctx.fillText(s, H * 0.05, H * 0.16 + i * step);
  });
  drawButton(button(W - H * 0.45, H * 0.05, H * 0.4, H * 0.1,
                    () => { game.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- 面えらび -----------------------------------------------------------------

function drawSelect() {
  ctx.fillStyle = '#241E3E'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.round(H * 0.062) + 'px system-ui, sans-serif';
  ctx.fillText('面を えらぶ', H * 0.04, H * 0.04);

  const cols = 10, rows = 3;
  const per = cols * rows;
  const pages = Math.ceil(STAGES.length / per);
  ui.page = Math.max(0, Math.min(pages - 1, ui.page));
  const cw = Math.min((W - H * 0.08) / cols, H * 0.19);
  const chh = cw * 0.82;
  const gx = (W - cw * cols) / 2, gy = H * 0.19;
  for (let i = ui.page * per; i < Math.min(STAGES.length, (ui.page + 1) * per); i++) {
    const k = i - ui.page * per;
    const x = gx + (k % cols) * cw, y = gy + ((k / cols) | 0) * chh;
    const st = STAGES[i];
    const open = i <= save.cleared;
    const done = st.n <= save.cleared;
    ctx.fillStyle = !open ? 'rgba(255,255,255,0.07)'
      : done ? '#7FE0A0' : '#FFD166';
    rr(ctx, x + 3, y + 3, cw - 6, chh - 6, 10); ctx.fill();
    ctx.fillStyle = open ? '#2A2440' : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(chh * 0.36) + 'px system-ui, sans-serif';
    ctx.fillText(open ? String(st.n) : '?', x + cw / 2, y + chh * 0.42);
    if (open && st.gim !== 'none') {
      ctx.fillStyle = GIMMICK[st.gim].col;
      ctx.beginPath(); ctx.arc(x + cw * 0.5, y + chh * 0.74, chh * 0.07, 0, 7); ctx.fill();
    }
    if (open) button(x, y, cw, chh, ((n) => () => { enterFullscreen(); startStage(n); })(i));
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(220,214,240,0.8)';
  fitFont('みどり＝クリアずみ　　　いろの ●＝へんな 面', W * 0.7, H * 0.038);
  ctx.fillText('みどり＝クリアずみ　　　いろの ●＝へんな 面', gx, gy + chh * rows + H * 0.02);

  const bh = H * 0.1;
  drawButton(button(H * 0.04, H - bh - H * 0.04, H * 0.34, bh,
                    () => { game.screen = 'title'; }), 'もどる', '#D8D4F0');
  if (pages > 1) {
    drawButton(button(W - H * 0.78, H - bh - H * 0.04, H * 0.34, bh,
                      () => { ui.page = Math.max(0, ui.page - 1); }), '◀', '#D8D4F0');
    drawButton(button(W - H * 0.4, H - bh - H * 0.04, H * 0.34, bh,
                      () => { ui.page++; }), '▶', '#D8D4F0');
  }
}

// --- クリア／つかまった --------------------------------------------------------

function drawResult(win) {
  drawPlay();
  ctx.fillStyle = win ? 'rgba(20,50,36,0.82)' : 'rgba(50,16,24,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = win ? '#A8F0C4' : '#FFB0B0';
  const title = win ? 'にげきった！' : 'つかまった…';
  fitFont(title, W * 0.8, H * 0.14, 'bold ');
  ctx.fillText(title, W / 2, H * 0.14);

  ctx.fillStyle = '#FFFFFF';
  const sub = win ? game.stage.n + '面 クリア！'
                  : game.stage.n + '面　あと ' + Math.ceil(game.timeLeft) + 'びょう だった';
  fitFont(sub, W * 0.7, H * 0.06);
  ctx.fillText(sub, W / 2, H * 0.32);

  // 何回も つかまう子には、だまって 手を かしてあげる
  if (!win && assistLevel() > 0) {
    ctx.fillStyle = '#FFE08A';
    const a = assistLevel() >= 2 ? 'パパを 1人 おうちに 帰した。時間も のばしたよ'
                                 : 'パパを すこし ゆっくりに した。時間も のばしたよ';
    fitFont(a, W * 0.8, H * 0.045);
    ctx.fillText(a, W / 2, H * 0.41);
  }

  const bw = Math.min(W * 0.3, H * 0.62), bh = H * 0.13;
  if (win) {
    drawButton(button(W / 2 - bw - H * 0.02, H * 0.5, bw, bh, () => {
      startStage(game.stage.n);
    }), 'つぎの 面へ →', '#FFD166');
    drawButton(button(W / 2 + H * 0.02, H * 0.5, bw, bh, () => { game.screen = 'select'; }),
               '面を えらぶ', '#D8D4F0');
  } else {
    drawButton(button(W / 2 - bw - H * 0.02, H * 0.5, bw, bh, () => {
      startStage(game.stage.n - 1);
    }), 'もう一度', '#FFD166');
    drawButton(button(W / 2 + H * 0.02, H * 0.5, bw, bh, () => { game.screen = 'select'; }),
               '面を えらぶ', '#D8D4F0');
  }
}

function drawEnd() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2E1E5E'); g.addColorStop(1, '#E8A24C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('ぜんぶ にげきった！！', W * 0.85, H * 0.14, 'bold ');
  ctx.fillText('ぜんぶ にげきった！！', W / 2, H * 0.12);
  ctx.fillStyle = '#FFF3C4';
  const lines = ['30面 ぜんぶ クリア。パパは もう つかまえられない',
                 'あそんだ かいすう ' + save.plays];
  lines.forEach((s, i) => {
    fitFont(s, W * 0.8, H * 0.052);
    ctx.fillText(s, W / 2, H * 0.34 + i * H * 0.08);
  });
  drawPerson(W * 0.5, H * 0.66, H * 0.2, 0, game.t * 2, RINA);
  const bw = Math.min(W * 0.3, H * 0.6), bh = H * 0.12;
  drawButton(button(W / 2 - bw / 2, H * 0.8, bw, bh, () => { game.screen = 'title'; }),
             'タイトルへ', '#FFD166');
}

// --- ほかの ゲームへ ----------------------------------------------------------

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function drawHubButton() {
  const mw = Math.min(W * 0.30, H * 0.60), mh = H * 0.085;
  drawButton(button(W - mw - H * 0.03, H * 0.03, mw, mh, gotoHub),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.86)', '#33304A');
}

// --- 全画面 -------------------------------------------------------------------

function enterFullscreen() {
  const e = document.documentElement;
  const f = e.requestFullscreen || e.webkitRequestFullscreen;
  if (f) { try { f.call(e); } catch (err) {} }
  const so = window.screen && window.screen.orientation;
  if (so && so.lock) {
    try { const r = so.lock('landscape'); if (r && r.catch) r.catch(() => {}); } catch (err) {}
  }
}

// --- そうさ -------------------------------------------------------------------

const inp = { mx: 0, my: 0 };
const keys = {};
let stickId = -1;

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  const p = pos(ev);
  const b = hit(p.x, p.y);
  if (b) { if (b.on) b.on(); return; }
  if (game.screen !== 'play') return;
  stickId = ev.pointerId;
  ui.stick = { ox: p.x, oy: p.y, x: p.x, y: p.y };
  canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener('pointermove', (ev) => {
  if (ev.pointerId !== stickId || !ui.stick) return;
  const p = pos(ev);
  ui.stick.x = p.x; ui.stick.y = p.y;
  const rad = Math.min(H * 0.13, 90);
  let dx = (p.x - ui.stick.ox) / rad, dy = (p.y - ui.stick.oy) / rad;
  const L = Math.hypot(dx, dy);
  if (L > 1) { dx /= L; dy /= L; }
  inp.mx = dx; inp.my = dy;
});

function endTouch(ev) {
  if (ev.pointerId !== stickId) return;
  stickId = -1; ui.stick = null; inp.mx = 0; inp.my = 0;
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function readKeys() {
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (mx || my) { inp.mx = mx; inp.my = my; }
  else if (!ui.stick) { inp.mx = 0; inp.my = 0; }
}

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  ctx.fillStyle = '#1E1A32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#C8B8E0';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
}

// --- ループ -------------------------------------------------------------------

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  ui.buttons = [];
  if (game.screen !== 'play') game.t += dt;

  if (W < H * 1.15) { drawRotate(); return; }

  if (game.screen === 'play') {
    readKeys();
    updatePlay(dt, inp);
    if (game.screen === 'play') drawPlay();
    else if (game.screen === 'over') drawResult(false);
    else drawResult(true);
  } else if (game.screen === 'clear') drawResult(true);
  else if (game.screen === 'over') drawResult(false);
  else if (game.screen === 'select') drawSelect();
  else if (game.screen === 'howto') drawHowto();
  else if (game.screen === 'end') drawEnd();
  else drawTitle();
}

layout();
requestAnimationFrame(frame);
