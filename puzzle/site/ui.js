// 画面・そうさ・メインループ。
//
// たまは 色だけでなく **形も 変える**。色だけだと、色の 見えかたが
// ちがう 人には ならんでいるか 分からない。ハート・ほし・しずく…と
// 形で 見わけられる ように する。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800, VOY = 0, DPR = 1;

// ★ たて長の 画面（スマホを たてに 持った とき）だと よこが せまく なりすぎて、
//   右がわの ボタンや 数字が 画面の 外に 出て しまう。
//   そこで「よこ VW_MIN 以上は かならず 入る」ように 縮尺を きめ、
//   あまった たての ぶんは 上下に 分けて まん中に よせる（レターボックス）。
//   よこ長の ときは これまでと まったく 同じ 見た目に なる。
const VW_MIN = 720;

const ui = { buttons: [] };

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  SC = Math.min(H / VH, W / VW_MIN);
  VW = W / SC;
  VOY = Math.max(0, (H / SC - VH) / 2);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, Math.round(DPR * SC * VOY));
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
    if (ctx.measureText(text).width <= maxW || fs <= 6) break;
    fs = Math.max(6, Math.floor(fs * 0.9));
  }
  return fs;
}

function button(x, y, w, h, on) {
  const b = { x, y, w, h, on };
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
  ctx.textAlign = 'left';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC - VOY;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- ばんめんの ばしょ -----------------------------------------------------------

function board() {
  const size = Math.min(VH - 58, VW * 0.56);
  const cs = Math.floor(size / COLS);
  const w = cs * COLS;
  return { x: 20, y: Math.round((VH - w) / 2) + 6, cs, w };
}

// --- たまの 絵 -------------------------------------------------------------------

function gemShape(k, x, y, s) {
  const g = GEMS[k];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = g.col;
  if (g.shape === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-13, -1, -9, -12, 0, -5);
    ctx.bezierCurveTo(9, -12, 13, -1, 0, 9);
    ctx.closePath(); ctx.fill();
  } else if (g.shape === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? 4.6 : 11;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (g.shape === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(9, -2, 10, 3, 10, 4);
    ctx.arc(0, 4, 10, 0, Math.PI);
    ctx.bezierCurveTo(-10, 3, -9, -2, 0, -12);
    ctx.closePath(); ctx.fill();
  } else if (g.shape === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(-10, -10, 9, -9);
    ctx.quadraticCurveTo(10, 9, -10, 8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(8, -8); ctx.stroke();
  } else if (g.shape === 'gem') {
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(10, -3); ctx.lineTo(6, 10);
    ctx.lineTo(-6, 10); ctx.lineTo(-10, -3);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, 7); ctx.fill();
  }
  // つや
  ctx.fillStyle = g.col2;
  ctx.beginPath(); ctx.ellipse(-3.4, -4.2, 3.2, 2.2, -0.6, 0, 7); ctx.fill();
  ctx.restore();
}

// にじいろの たま
function rainbowGem(x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = GEMS[i].col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 11.5, t * 1.2 + i * 1.047, t * 1.2 + (i + 1) * 1.047);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill();
  ctx.restore();
}

function drawCell(cell, x, y, cs, t, popK) {
  const s = cs / 26;
  let sc = 1;
  if (popK !== undefined) sc = Math.max(0, 1 - popK) * 1.25;
  if (cell.born) sc = Math.min(1.25, 1 + (1 - Math.min(1, (cell.bt || 0) * 5)) * 0.25);
  if (cell.sp === 'r') { rainbowGem(x, y, s * sc, t); return; }
  gemShape(cell.k, x, y, s * sc);
  // とくべつな たまの しるし
  if (cell.sp === 'h' || cell.sp === 'v') {
    ctx.save();
    ctx.translate(x, y);
    if (cell.sp === 'v') ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-cs * 0.34, 0); ctx.lineTo(cs * 0.34, 0);
    ctx.stroke();
    ctx.restore();
  } else if (cell.sp === 'b') {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(x, y, cs * 0.34, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3A2A5A'); g.addColorStop(1, '#7A4A7A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // きらきら
  for (let i = 0; i < 22; i++) {
    const x = ((i * 197 + t * 12) % (VW + 60)) - 30;
    const y = (i * 137) % VH;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.04) + ')';
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 4), 0, 7); ctx.fill();
  }

  const B = board();
  // わく
  ctx.fillStyle = 'rgba(20,12,34,0.42)';
  rr(ctx, B.x - 8, B.y - 8, B.w + 16, B.w + 16, 14); ctx.fill();

  // マス目
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(B.x + c * B.cs, B.y + r * B.cs, B.cs, B.cs);
    }
  }

  // たま
  const swapK = G.phase === 'swap' ? G.pt / T_SWAP
              : G.phase === 'back' ? 1 - G.pt / T_BACK : 0;
  const fallK = G.phase === 'fall' ? Math.min(1, G.pt / T_FALL) : 1;
  const popK = G.phase === 'pop' ? Math.min(1, G.pt / T_POP) : undefined;
  const fmap = {};
  for (const f of G.fall) fmap[f.r * COLS + f.c] = f.from;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = G.cell[r][c];
      if (!cell) continue;
      let x = B.x + c * B.cs + B.cs / 2;
      let y = B.y + r * B.cs + B.cs / 2;
      // 落ちて くる とちゅう
      const from = fmap[r * COLS + c];
      if (from !== undefined && fallK < 1) {
        y += (from - r) * B.cs * (1 - fallK);
      }
      // 入れかえの とちゅう
      if ((G.phase === 'swap' || G.phase === 'back') && G.a && G.b) {
        const isA = G.a[0] === r && G.a[1] === c, isB = G.b[0] === r && G.b[1] === c;
        if (isA || isB) {
          const o = isA ? G.b : G.a;
          x += (B.x + o[1] * B.cs + B.cs / 2 - x) * swapK;
          y += (B.y + o[0] * B.cs + B.cs / 2 - y) * swapK;
        }
      }
      const isPop = popK !== undefined && G.popping.indexOf(r * COLS + c) >= 0;
      drawCell(cell, x, y, B.cs, t, isPop ? popK : undefined);
    }
  }

  // こおり
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = G.ice[r][c];
      if (!n) continue;
      const x = B.x + c * B.cs, y = B.y + r * B.cs;
      // ★ こおりを こく すると 下の たまの 色が わからなく なって、
      //   そろえられ なく なる。うすい water色＋白い ふち＋ひび だけに して、
      //   あつい こおりは 「ふちの ふとさ」と「ひびの 本数」で 見わける。
      ctx.fillStyle = n >= 2 ? 'rgba(150,215,240,0.30)' : 'rgba(190,235,250,0.16)';
      rr(ctx, x + 1, y + 1, B.cs - 2, B.cs - 2, 5); ctx.fill();
      ctx.strokeStyle = n >= 2 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = n >= 2 ? 3.5 : 1.8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + B.cs * 0.4); ctx.lineTo(x + B.cs * 0.45, y + 5);
      ctx.moveTo(x + B.cs * 0.5, y + B.cs - 6); ctx.lineTo(x + B.cs - 6, y + B.cs * 0.5);
      if (n >= 2) {
        ctx.moveTo(x + 5, y + B.cs - 8); ctx.lineTo(x + B.cs * 0.34, y + B.cs - 5);
        ctx.moveTo(x + B.cs - 6, y + 10); ctx.lineTo(x + B.cs - 12, y + 5);
      }
      ctx.stroke();
    }
  }

  // えらんだ マス
  if (G.sel) {
    const [r, c] = G.sel;
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 3.5;
    rr(ctx, B.x + c * B.cs + 2, B.y + r * B.cs + 2, B.cs - 4, B.cs - 4, 7); ctx.stroke();
  }

  // 「+120」
  for (const gg of G.gain) {
    const a = Math.max(0, 1 - gg.t);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('+' + gg.n, B.x + gg.c * B.cs + B.cs / 2,
                 B.y + gg.r * B.cs + B.cs / 2 - gg.t * 26);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawSide(t);

  if (G.over) {
    ctx.fillStyle = 'rgba(20,12,34,0.5)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 60px system-ui, sans-serif';
    ctx.fillText(G.win ? 'クリア！' : 'ざんねん…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawSide(t) {
  const B = board();
  const x = B.x + B.w + 26;
  const w = Math.max(120, VW - x - 20);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  ctx.fillStyle = '#FFFFFF';
  fitFont(G.S.name, w, 20, 'bold ');
  ctx.fillText(G.S.name, x, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText((G.stage + 1) + ' / ' + STAGES.length + 'めん', x, 8);

  // のこりの 手
  ctx.fillStyle = 'rgba(20,12,34,0.42)';
  rr(ctx, x, 54, w, 62, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('のこりの 手', x + 14, 62);
  ctx.fillStyle = G.moves <= 3 ? '#FF8FA0' : '#FFFFFF';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText(String(Math.max(0, G.moves)), x + 14, 76);

  // もくひょう
  ctx.fillStyle = 'rgba(20,12,34,0.42)';
  rr(ctx, x, 126, w, 88, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('もくひょう', x + 14, 134);
  ctx.fillStyle = '#FFFFFF';
  fitFont(goalText(), w - 28, 16, 'bold ');
  ctx.fillText(goalText(), x + 14, 152);
  // ぼう
  const k = goalProgress();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, x + 14, 178, w - 28, 14, 7); ctx.fill();
  ctx.fillStyle = k >= 1 ? '#A8F0B0' : '#FFD166';
  rr(ctx, x + 14, 178, Math.max(6, (w - 28) * k), 14, 7); ctx.fill();
  // あつめる もの の 絵
  const gl = G.S.goal;
  if (gl.type === 'collect' || gl.type === 'collect2') {
    gemShape(gl.k, x + w - 30, 145, 0.8);
    if (gl.type === 'collect2') gemShape(gl.k2, x + w - 56, 145, 0.8);
  }

  // てんすう
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('てんすう ' + G.score, x + 2, 222);
  const bk = save.best['s' + G.stage];
  if (bk) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('ベスト ' + bk, x + 2, 240);
  }
  if (G.chain > 1) {
    ctx.fillStyle = '#FFE066';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(G.chain + ' れんさ！', x + 2, 262);
  }

  drawButton(button(x, VH - 76, Math.min(w, 130), 28, () => { startStage(G.stage); }),
             'やりなおす', 'rgba(255,255,255,0.85)');
  drawButton(button(x, VH - 42, Math.min(w, 130), 28, () => { bgmStop(); G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#3A2A5A'); g.addColorStop(1, '#8A4A7A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  for (let i = 0; i < 26; i++) {
    const x = ((i * 173 + t * 16) % (VW + 80)) - 40;
    const y = (i * 91) % VH;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, 7); ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('りなのキラキラパズル', VW * 0.44, 40, 'bold ');
  ctx.fillText('りなのキラキラパズル', 24, 16);
  ctx.fillStyle = '#FFD9F0';
  fitFont('となりと 入れかえて、同じ たまを 3つ ならべて 消そう', VW * 0.50, 15);
  ctx.fillText('となりと 入れかえて、同じ たまを 3つ ならべて 消そう', 26, 20 + fs + 4);

  for (let i = 0; i < 6; i++) {
    gemShape(i, VW - 44 - i * 46, 40 + Math.sin(t * 2 + i) * 5, 1.5);
  }

  // 20めん（10 × 2）
  const cw = Math.min(72, (VW - 48) / 10), chh = 62;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 10) * cw, cyp = 116 + Math.floor(i / 10) * (chh + 10);
    const op = opened(i), cl = save.clear[i];
    const S = STAGES[i];
    if (op) button(cxp, cyp, cw - 6, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.26)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 6, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 6) / 2, cyp + 5);
      // もくひょうの しるし
      const gl = S.goal;
      if (gl.type === 'score') {
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(gl.n + '点', cxp + (cw - 6) / 2, cyp + 42);
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText('★', cxp + (cw - 6) / 2, cyp + 25);
      } else if (gl.type === 'ice') {
        ctx.fillStyle = '#BEEBFA';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText('こおり', cxp + (cw - 6) / 2, cyp + 26);
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(S.moves + '手', cxp + (cw - 6) / 2, cyp + 44);
      } else {
        gemShape(gl.k, cxp + (cw - 6) / 2, cyp + 32, 0.85);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(gl.n + 'こ', cxp + (cw - 6) / 2, cyp + 44);
      }
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 6) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  const done = save.clear.filter(Boolean).length;
  ctx.fillText('クリアした めん  ' + done + ' / ' + STAGES.length +
               '　（3回 だめだと 手が 3つ ふえて、つぎの めんも あくよ）', 24, 116 + 2 * (chh + 10) + 8);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(VW - 224, VH - 40, 96, 30, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D0F8');
  drawButton(button(VW - 116, VH - 40, 96, 30, () => { sfxTest(); }),
             '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, 24, VH - 6);
}

function drawHowto() {
  ctx.fillStyle = '#2A1E3A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD9F0';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    'たまを おして、つぎに となりの たまを おすと 入れかわる。',
    '同じ たまが たて か よこに 3つ ならぶと 消える。',
    'そろわない ときは もどるだけ。手は へらないよ。',
    '',
    '★ 4つ ならべると **すじの たま**（そのれつ ぜんぶ 消える）',
    '★ たてと よこが 十字に なると **ばくだん**（まわり 3×3 が 消える）',
    '★ 5つ ならべると **にじいろの たま**。となりの たまと 入れかえると',
    '　 その 色が ぜんぶ 消える',
    '★ とくべつな たま どうしを 入れかえると 両方 はつどう！',
    '',
    'たまが 落ちて また そろうと **れんさ**。れんさ するほど 点が 高い。',
    'こおりの マスは、その上の たまを 消すと 1まい われる（あつい こおりは 2まい）',
  ];
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 52 + i * 28);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'ざんねん…', VW * 0.5, 44, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'ざんねん…', VW / 2, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText((G.stage + 1) + 'めん　' + G.S.name, VW / 2, 76);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(goalText(), VW / 2, 108);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(G.score + ' 点', VW / 2, 140);
  if (!G.win) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    const f = (save.fails['s' + G.stage] || 0);
    ctx.fillText(f >= 3 ? 'てつだうよ。手が ' + (Math.min(3, Math.floor(f / 3)) * 3) + 'つ ふえた！'
                        : 'あと ' + (3 - f % 3) + '回 だめだったら 手を ふやすね',
                 VW / 2, 184);
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(150, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 56, bw, 38, () => startStage(G.stage)),
             'もう一度', '#E8D0F8');
  if (nxt < STAGES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 38, () => startStage(nxt)),
               'つぎの めん', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 56, bw, 38, () => { G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const x = px / SC, y = py / SC - VOY;
  if (G.screen === 'play' && !G.over) {
    const B = board();
    if (x >= B.x && x < B.x + B.w && y >= B.y && y < B.y + B.w) {
      tapCell(Math.floor((y - B.y) / B.cs), Math.floor((x - B.x) / B.cs));
      return;
    }
  }
  const b = hitBtn(px, py);
  if (b) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'title'; }
});

// --- ループ ---------------------------------------------------------------------


// たて長の ときだけ、下の あいた ところに あんないを 出す
function portraitTip() {
  if (VOY < 26) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('よこ向きに すると 大きく なるよ', VW / 2, VH + Math.min(VOY * 0.55, 26));
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

let last = 0, tsec = 0;
function frame(now) {
  portraitTip();
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') { update(dt); drawPlay(tsec); }
  else if (G.screen === 'result') drawResult(tsec);
  else if (G.screen === 'howto') drawHowto();
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2A1E3A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFD9F0';
  ctx.fillText('ばんめんの よこに もくひょうが 出るよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
