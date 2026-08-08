// 画面・そうさ・メインループ。
//
// ひっぱって はなす だけ。ひっぱっている あいだは **とぶ 道すじ**を
// 点で 出す。出さないと 小さい子は どこへ 飛ぶのか わからず、
// あてずっぽうに なって しまう。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VW = 800;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = H / VH;
  VW = W / SC;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
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
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- 絵 -------------------------------------------------------------------------

function drawBox(q) {
  const m = MAT[q.k];
  const k = Math.max(0, q.hp / q.max);
  ctx.fillStyle = m.col;
  rr(ctx, q.x + 1, q.y + 1, q.w - 2, q.h - 2, q.k === 'c' ? 6 : 3);
  ctx.fill();
  ctx.strokeStyle = m.col2; ctx.lineWidth = 2; ctx.stroke();
  if (q.k === 'c') {
    // おり の たて棒 と、中の どうぶつ
    ctx.fillStyle = '#F6CFAC';
    ctx.beginPath(); ctx.arc(q.x + q.w / 2, q.y + q.h * 0.56, q.w * 0.26, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.arc(q.x + q.w * 0.42, q.y + q.h * 0.52, 1.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(q.x + q.w * 0.58, q.y + q.h * 0.52, 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = m.col2; ctx.lineWidth = 2.5;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(q.x + (q.w * i) / 3, q.y + 3);
      ctx.lineTo(q.x + (q.w * i) / 3, q.y + q.h - 3);
      ctx.stroke();
    }
  } else if (q.k === 'w') {
    ctx.strokeStyle = m.col2; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(q.x + 4, q.y + q.h * 0.35); ctx.lineTo(q.x + q.w - 4, q.y + q.h * 0.35);
    ctx.moveTo(q.x + 4, q.y + q.h * 0.68); ctx.lineTo(q.x + q.w - 4, q.y + q.h * 0.68);
    ctx.stroke();
  } else if (q.k === 'i') {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(q.x + 5, q.y + q.h * 0.6); ctx.lineTo(q.x + q.w * 0.5, q.y + 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = m.col2;
    ctx.beginPath(); ctx.arc(q.x + q.w * 0.3, q.y + q.h * 0.35, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(q.x + q.w * 0.68, q.y + q.h * 0.62, 2.2, 0, 7); ctx.fill();
  }
  // いたんでいる ほど ひびを 出す
  if (k < 0.99) {
    ctx.strokeStyle = 'rgba(30,20,20,' + (0.20 + (1 - k) * 0.5) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(q.x + q.w * 0.25, q.y + 3);
    ctx.lineTo(q.x + q.w * 0.5, q.y + q.h * 0.5);
    ctx.lineTo(q.x + q.w * 0.32, q.y + q.h - 3);
    if (k < 0.55) {
      ctx.moveTo(q.x + q.w - 3, q.y + q.h * 0.3);
      ctx.lineTo(q.x + q.w * 0.6, q.y + q.h * 0.55);
    }
    ctx.stroke();
  }
  if (q.hit > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + q.hit * 0.5 + ')';
    rr(ctx, q.x + 1, q.y + 1, q.w - 2, q.h - 2, 3); ctx.fill();
  }
}

function drawBall(b, x, y) {
  const K = b.kind || b;
  const r = K.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = K.col;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  // みみ
  ctx.fillStyle = K.col;
  if (K.key === 'usa') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * r * 0.42, -r * 1.15, r * 0.22, r * 0.62, s * 0.2, 0, 7); ctx.fill();
    }
  } else if (K.key === 'kuma') {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.72, -r * 0.74, r * 0.32, 0, 7); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#FF9C5A';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0); ctx.lineTo(r * 1.5, r * 0.2); ctx.lineTo(r * 0.7, r * 0.4);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.12, r * 0.14, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.12, r * 0.14, 0, 7); ctx.fill();
  ctx.restore();
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  // そら
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, '#8FD6FF'); g.addColorStop(1, '#D8F0FF');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, GY);
  // くも
  for (let i = 0; i < 5; i++) {
    const x = ((i * 211 + t * 8) % (VW + 160)) - 80;
    const y = 40 + (i * 53) % 120;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 7); ctx.arc(x + 22, y + 4, 15, 0, 7); ctx.arc(x - 20, y + 5, 13, 0, 7);
    ctx.fill();
  }
  // じめん
  ctx.fillStyle = '#6ACB6A';
  ctx.fillRect(0, GY, VW, VH - GY);
  ctx.fillStyle = '#4E9B4A';
  ctx.fillRect(0, GY, VW, 7);

  for (const q of G.boxes) drawBox(q);

  // かけら
  for (const b of G.bits) {
    ctx.fillStyle = MAT[b.k].col;
    ctx.globalAlpha = Math.max(0, 1 - b.t / 0.9);
    ctx.fillRect(b.x - 3, b.y - 3, 7, 7);
    ctx.globalAlpha = 1;
  }

  // ゴム
  const K = ballKind();
  ctx.strokeStyle = '#8A5A38'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SLING.x - 14, GY); ctx.lineTo(SLING.x - 6, SLING.y + 6);
  ctx.moveTo(SLING.x + 14, GY); ctx.lineTo(SLING.x + 6, SLING.y + 6);
  ctx.stroke();
  const hold = G.aim || { x: SLING.x, y: SLING.y };
  ctx.strokeStyle = '#5A3A28'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SLING.x - 8, SLING.y + 2); ctx.lineTo(hold.x, hold.y);
  ctx.lineTo(SLING.x + 8, SLING.y + 2);
  ctx.stroke();

  // とぶ 道すじ
  if (G.aim) {
    const dx = SLING.x - G.aim.x, dy = SLING.y - G.aim.y;
    const B = ballKind();
    let vx = dx * POWER * B.pow, vy = dy * POWER * B.pow;
    let px = SLING.x, py = SLING.y;
    for (let i = 0; i < 34; i++) {
      for (let k = 0; k < 3; k++) {
        vy += GRAV * 0.016;
        px += vx * 0.016; py += vy * 0.016;
      }
      if (py > GY || px > VW) break;
      // ★ 白い 点だけだと そらに とけて 見えない。
      //   こい ふちを つけて、大きさも 少し 大きく する。
      const a = 0.85 - i * 0.018;
      ctx.fillStyle = 'rgba(40,60,90,' + a * 0.5 + ')';
      ctx.beginPath(); ctx.arc(px, py, 5.2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.beginPath(); ctx.arc(px, py, 3.6, 0, 7); ctx.fill();
    }
  }

  // たま
  if (G.ball) drawBall(G.ball, G.ball.x, G.ball.y);
  else if (!G.over && G.shots > 0) drawBall({ kind: K }, hold.x, hold.y);

  // たすかった どうぶつ
  for (const p of G.pops) {
    const k = p.t / 1.4;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('たすかった！', p.x, p.y - k * 46);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawTop();

  if (G.over) {
    ctx.fillStyle = 'rgba(20,30,40,0.45)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText(G.win ? 'ぜんいん たすけた！' : 'たまが なくなった…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(20,40,60,0.42)';
  rr(ctx, 8, 6, VW - 16, 36, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  fitFont(G.S.name, VW * 0.28, 16, 'bold ');
  ctx.fillText(G.S.name, 20, 24);

  // のこりの たま
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('のこりの たま', VW * 0.34, 24);
  for (let i = 0; i < Math.min(10, G.shots); i++) {
    const K = BALLS.find((b) => b.key === G.S.balls[Math.min(G.S.balls.length - 1, G.next + i)]) || BALLS[0];
    ctx.fillStyle = K.col;
    ctx.beginPath(); ctx.arc(VW * 0.34 + 92 + i * 17, 24, 6.5, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  // たすけた 数
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('たすけた ' + G.saved + ' / ' + G.need, VW - 108, 24);
  ctx.textAlign = 'left';

  drawButton(button(VW - 98, 10, 44, 28, () => startStage(G.stage)), 'やり\nなおす'.replace('\n', ''), 'rgba(255,255,255,0.85)');
  drawButton(button(VW - 50, 10, 42, 28, () => { bgmStop(); G.screen = 'title'; }), 'めん', 'rgba(255,255,255,0.85)');
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A4A6A'); g.addColorStop(1, '#5A8A6A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('あおいのどうぶつレスキュー', VW * 0.50, 38, 'bold ');
  ctx.fillText('あおいのどうぶつレスキュー', 24, 16);
  ctx.fillStyle = '#D8F0FF';
  fitFont('ひっぱって はなす。おりを こわして どうぶつを たすけよう', VW * 0.52, 15);
  ctx.fillText('ひっぱって はなす。おりを こわして どうぶつを たすけよう', 26, 20 + fs + 4);

  for (let i = 0; i < BALLS.length; i++) {
    drawBall({ kind: BALLS[i] }, VW - 44 - (BALLS.length - 1 - i) * 52, 42 + Math.sin(t * 2 + i) * 4);
  }

  // 20めん（10 × 2）
  const cw = Math.min(72, (VW - 48) / 10), chh = 62;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 10) * cw, cyp = 116 + Math.floor(i / 10) * (chh + 10);
    const op = opened(i), cl = save.clear[i];
    if (op) button(cxp, cyp, cw - 6, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.26)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 6, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      // つみきの かたちを 小さく
      const S2 = STAGES[i];
      const s = (cw - 20) / CW;
      const ox = cxp + 9, oy = cyp + 20;
      for (let r = 0; r < CH; r++) {
        for (let c = 0; c < CW; c++) {
          const ch = S2.rows[r][c];
          if (!ch || ch === '.') continue;
          ctx.fillStyle = MAT[ch].col;
          ctx.fillRect(ox + c * s, oy + r * s * 0.78, s - 0.5, s * 0.78 - 0.5);
        }
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + 6, cyp + 4);
      const bk = save.best['s' + i];
      if (bk !== undefined) {
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('たま' + bk + 'のこし', cxp + cw - 10, cyp + 5);
        ctx.textAlign = 'left';
      }
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
  ctx.fillText('たすけた めん  ' + done + ' / ' + STAGES.length +
               '　（3回 だめだと たまが 1つ ふえて、つぎの めんも あくよ）',
               24, 116 + 2 * (chh + 10) + 8);

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
  ctx.fillStyle = '#22384E'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#D8F0FF';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 左の ぬいぐるみを **ゆびで ひっぱる**（うしろに ひくほど とおくへ とぶ）',
    '② はなすと とんでいく。白い 点が とぶ 道すじの めやす',
    '③ きいろい **おり**を こわすと、中の どうぶつが たすかる',
    '④ おりを ぜんぶ こわせば クリア。たまが なくなると おわり',
    '',
    '★ こおり … すぐ われる。ねらって くずすと まわりも まきこめる',
    '★ 木 … ふつう',
    '★ いし … かたい。くまの ぬいぐるみで どーんと ぶつけよう',
    '',
    '★ うさぎ … ふつう　　★ くま … おもい（いしに つよい）　　★ ことり … かるくて 速い',
    '',
    'つみきが くずれて 下じきに なっても おりは こわれる。',
    'ちょくせつ あてなくても、**下を くずす**ほうが 早い ことも あるよ',
  ];
  ctx.fillStyle = '#E8F4FA';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 50 + i * 26);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'ざんねん…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'ざんねん…', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 84);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('たすけた どうぶつ ' + G.saved + ' / ' + G.need, VW / 2, 116);
  if (G.win) {
    ctx.fillStyle = '#A8F0B0';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('たまが ' + G.shots + 'こ のこった！', VW / 2, 146);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    const f = (save.fails['s' + G.stage] || 0);
    ctx.fillText(f >= 3 ? 'てつだうよ。たまが ' + Math.min(3, Math.floor(f / 3)) + 'こ ふえた！'
                        : 'あと ' + (3 - f % 3) + '回 だめだったら たまを ふやすね',
                 VW / 2, 150);
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

let dragging = false;

function down(px, py) {
  audioStart();
  const x = px / SC, y = py / SC;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b) { b.on(); return; }
    // ゴムの ちかくを さわったら ひっぱりはじめ。
    // 小さい子は ぴったり さわれない ので、ひろく とる。
    if (!G.ball && G.shots > 0 && x < VW * 0.55) {
      dragging = true;
      aimStart(x, y);
      aimMove(x, y);
    }
    return;
  }
  const b = hitBtn(px, py);
  if (b) b.on();
}
function move(px, py) {
  if (!dragging) return;
  aimMove(px / SC, py / SC);
}
function up() {
  if (!dragging) return;
  dragging = false;
  aimEnd();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  down(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  move(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
canvas.addEventListener('touchcancel', () => up());
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  move(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => up());

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'title'; }
});

// --- ループ ---------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
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
  ctx.fillStyle = '#22384E'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#D8F0FF';
  ctx.fillText('よこに とばす ゲームだよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
