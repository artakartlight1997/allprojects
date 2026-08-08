// 画面・そうさ・メインループ。よこ向き専用。
//
// かくのは ぜんぶ「ゲームの 中の 大きさ」（たて VH＝450）で 書いて、
// さいごに 画面の 大きさへ まとめて のばす。こうすると どの スマホでも
// 同じ 見た目・同じ むずかしさに なる。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1;

const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = H / VH;
  G.VW = W / SC;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// --- どうぐ -------------------------------------------------------------------

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

// --- りな ---------------------------------------------------------------------

function drawRina(x, y, vy, t, inv) {
  const tilt = Math.max(-0.42, Math.min(0.55, vy / 900));
  if (inv > 0 && Math.floor(inv * 14) % 2 === 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.22, 1.22);
  // ふわふわの ひかり
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill();
  ctx.rotate(tilt);

  // はね（ふわっと はばたく）
  const fw = Math.sin(t * 9) * 0.5;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-6, s * 4);
    ctx.rotate(s * (0.7 + fw));
    ctx.beginPath();
    ctx.ellipse(-13, 0, 15, 7, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  // あし
  ctx.fillStyle = '#4A6ACF';
  rr(ctx, -9, 10, 8, 13, 3); ctx.fill();
  rr(ctx, 2, 10, 8, 13, 3); ctx.fill();
  // からだ
  ctx.fillStyle = '#F06A9C';
  rr(ctx, -12, -6, 24, 18, 7); ctx.fill();
  // うで（前に 出す）
  ctx.strokeStyle = '#F6CFAC'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(19, 3 + fw * 4); ctx.stroke();
  // あたま
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(3, -16, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#5A3A26';
  ctx.beginPath(); ctx.arc(2, -18, 12, Math.PI * 1.05, Math.PI * 2.05); ctx.fill();
  ctx.beginPath(); ctx.arc(-9, -14, 5.5, 0, 7); ctx.fill();     // おさげ
  ctx.fillStyle = '#33313E';
  ctx.beginPath(); ctx.arc(8, -15, 1.9, 0, 7); ctx.fill();
  ctx.fillStyle = '#C4506A';
  ctx.beginPath(); ctx.ellipse(9, -10, 2.4, 2.0, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// --- てき ---------------------------------------------------------------------

function drawFoe(e, t) {
  const f = FOE[e.kind];
  const x = e.x, y = e.y, r = e.r;
  // うしろの もようと まぎれない ように、うすい かげを 1まい しく
  ctx.fillStyle = 'rgba(20,20,40,0.22)';
  ctx.beginPath(); ctx.arc(x + 2, y + 3, r * 1.06, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (e.kind === 'tori') {
    const w = Math.sin(t * 11 + e.ph) * 0.7;
    ctx.fillStyle = '#D8842E';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * (0.5 + w));
      ctx.beginPath(); ctx.ellipse(4, -s * r * 0.8, r * 0.75, r * 0.32, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-r - 9, -3); ctx.lineTo(-r - 9, 4); ctx.fill();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.22, 2.6, 0, 7); ctx.fill();
  } else if (e.kind === 'komori') {
    const w = Math.sin(t * 13 + e.ph) * 0.8;
    ctx.fillStyle = '#6E4EA8';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 1.7, s * (r * 0.5 + w * 8) - r * 0.4);
      ctx.lineTo(-r * 0.5, s * r * 1.1);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.15, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.15, 1.6, 0, 7); ctx.fill();
  } else if (e.kind === 'kumo') {
    ctx.fillStyle = f.col;
    for (const [dx, dy, rr2] of [[-r * 0.5, 4, r * 0.62], [0, -6, r * 0.72],
                                 [r * 0.55, 2, r * 0.58], [0, 8, r * 0.6]]) {
      ctx.beginPath(); ctx.arc(dx, dy, rr2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#5A6A80';
    ctx.beginPath(); ctx.arc(-r * 0.3, -2, 3.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.15, -2, 3.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5A6A80'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(-r * 0.07, 8, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    if (e.hp < FOE.kumo.hp) {
      ctx.fillStyle = 'rgba(90,110,140,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill();
    }
  } else if (e.kind === 'hoshi') {
    ctx.rotate(t * 1.6 + e.ph);
    ctx.fillStyle = f.col;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr2 = i % 2 ? r * 0.44 : r;
      const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#B07A10';
    ctx.beginPath(); ctx.arc(-4, -2, 2.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -2, 2.2, 0, 7); ctx.fill();
  } else if (e.kind === 'roke') {
    ctx.fillStyle = '#FFD166';
    const fl = 10 + Math.sin(t * 30 + e.ph) * 6;
    ctx.beginPath(); ctx.moveTo(r * 0.8, 0);
    ctx.lineTo(r * 0.8 + fl, -6); ctx.lineTo(r * 0.8 + fl * 1.5, 0);
    ctx.lineTo(r * 0.8 + fl, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.moveTo(-r * 1.5, 0);
    ctx.lineTo(r * 0.8, -r * 0.7); ctx.lineTo(r * 0.8, r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.28, 0, 7); ctx.fill();
  } else if (e.kind === 'ufo') {
    ctx.fillStyle = 'rgba(180,255,230,0.35)';
    ctx.beginPath(); ctx.moveTo(-r * 0.7, 6); ctx.lineTo(-r * 1.6, 34);
    ctx.lineTo(r * 1.6, 34); ctx.lineTo(r * 0.7, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#CFF6EA';
    ctx.beginPath(); ctx.arc(0, -6, r * 0.55, Math.PI, 0); ctx.fill();
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.42, 0, 0, 7); ctx.fill();
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = (Math.floor(t * 6) + i + 3) % 3 === 0 ? '#FFE066' : '#2E7A6A';
      ctx.beginPath(); ctx.arc(i * r * 0.6, 4, 3.2, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBoss(b, t) {
  const d = BOSS[b.key];
  ctx.save();
  ctx.translate(b.x, b.y);
  const hurt = b.hurt > 0;
  if (b.key === 'kumoking') {
    ctx.fillStyle = hurt ? '#FFFFFF' : d.col;
    for (const [dx, dy, rr2] of [[-b.r * 0.55, 10, b.r * 0.62], [0, -14, b.r * 0.78],
                                 [b.r * 0.6, 4, b.r * 0.6], [0, 18, b.r * 0.66],
                                 [-b.r * 0.2, -b.r * 0.5, b.r * 0.42]]) {
      ctx.beginPath(); ctx.arc(dx, dy, rr2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#3E4A60';
    ctx.beginPath(); ctx.arc(-b.r * 0.42, -6, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-b.r * 0.02, -6, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3E4A60'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-b.r * 0.22, 16, 14, 0.25, Math.PI - 0.25); ctx.stroke();
  } else {
    ctx.fillStyle = hurt ? '#FFFFFF' : d.col;
    ctx.beginPath(); ctx.ellipse(6, 0, b.r * 0.9, b.r * 0.72, 0, 0, 7); ctx.fill();
    // くび と かお
    ctx.beginPath(); ctx.ellipse(-b.r * 0.55, -b.r * 0.15, b.r * 0.5, b.r * 0.38, -0.2, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#5E3A9E';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(b.r * 0.2 + i * 14, -b.r * 0.6 + i * 6);
      ctx.lineTo(b.r * 0.34 + i * 14, -b.r * 0.95 + i * 6);
      ctx.lineTo(b.r * 0.48 + i * 14, -b.r * 0.55 + i * 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(-b.r * 0.72, -b.r * 0.25, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.arc(-b.r * 0.74, -b.r * 0.25, 3, 0, 7); ctx.fill();
    // かみなりの ような つの
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-b.r * 0.5, -b.r * 0.55); ctx.lineTo(-b.r * 0.3, -b.r * 0.9);
    ctx.lineTo(-b.r * 0.42, -b.r * 0.86); ctx.lineTo(-b.r * 0.2, -b.r * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay(t) {
  const st = STAGES[G.si];
  const VW = G.VW;
  const sx = G.shake > 0 ? Math.sin(t * 60) * G.shake * 10 : 0;
  ctx.save();
  ctx.translate(sx, 0);

  // そら
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(-20, 0, VW + 40, VH);

  // うしろの ほし／くも（おそく 流れる）
  if (st.stars) {
    for (let i = 0; i < 40; i++) {
      const x = ((i * 137.5 - G.scroll * 0.12) % (VW + 60) + VW + 60) % (VW + 60) - 30;
      const y = (i * 97) % VH;
      const a = 0.3 + 0.5 * Math.abs(Math.sin(i + t * 1.5));
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }
  // うしろの もよう。てきと 見まちがえないように うすく、かたちも かえる。
  for (let i = 0; i < 7; i++) {
    const x = ((i * 210 - G.scroll * 0.22) % (VW + 300) + VW + 300) % (VW + 300) - 150;
    const y = 40 + (i * 83) % (VH - 120);
    if (st.stars) {
      const g2 = ctx.createRadialGradient(x, y, 6, x, y, 90);
      g2.addColorStop(0, 'rgba(180,160,255,0.14)');
      g2.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(x, y, 90, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (const [dx, dy, r] of [[-44, 8, 22], [0, -8, 30], [46, 6, 20], [-16, 14, 24]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill();
      }
    }
  }

  // アイテム
  for (const it of G.items) {
    ctx.save(); ctx.translate(it.x, it.y);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, it.r + 6 + Math.sin(t * 5) * 2, 0, 7); ctx.fill();
    if (it.kind === 'heart') {
      ctx.fillStyle = '#FF7AAA';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-16, -4, -8, -16, 0, -7);
      ctx.bezierCurveTo(8, -16, 16, -4, 0, 8);
      ctx.fill();
    } else {
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr2 = i % 2 ? 7 : 16;
        const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // てき
  for (const e of G.foes) drawFoe(e, t);
  if (G.boss) drawBoss(G.boss, t);

  // あわ
  for (const s of G.shots) {
    ctx.fillStyle = 'rgba(190,235,255,0.75)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(s.x - 3, s.y - 3, 2.4, 0, 7); ctx.fill();
  }
  // てきの たま
  for (const s of G.eshots) {
    ctx.fillStyle = '#FF6A6A';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, 7); ctx.fill();
  }

  // つぶ
  for (const p of G.puffs) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5 * (1 - p.t / p.life) + 1, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (!(G.done && !G.win)) drawRina(RINA_X, G.y, G.vy, t, G.inv);

  // 出る 文字
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.6);
    ctx.fillStyle = p.col;
    fitFont(p.text, 260, 26, 'bold ');
    ctx.strokeStyle = 'rgba(20,10,30,0.75)'; ctx.lineWidth = 5;
    const y = p.y - p.t * 34;
    ctx.strokeText(p.text, p.x, y); ctx.fillText(p.text, p.x, y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  ctx.restore();

  drawHUD(t);
}

function drawHUD(t) {
  const st = STAGES[G.si], VW = G.VW;
  ctx.fillStyle = 'rgba(18,14,32,0.42)';
  ctx.fillRect(0, 0, VW, 40);

  // たいりょく
  for (let i = 0; i < Math.max(G.maxHp, G.hp); i++) {
    const on = i < G.hp;
    ctx.save(); ctx.translate(20 + i * 26, 20); ctx.scale(0.9, 0.9);
    ctx.fillStyle = on ? '#FF6A9C' : 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-16, -4, -8, -16, 0, -7);
    ctx.bezierCurveTo(8, -16, 16, -4, 0, 8);
    ctx.fill();
    ctx.restore();
  }

  // すすみぐあい
  const bw = VW * 0.34, bx = VW / 2 - bw / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, bx, 12, bw, 16, 8); ctx.fill();
  ctx.fillStyle = '#7FE0C0';
  rr(ctx, bx, 12, Math.max(6, bw * progress()), 16, 8); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(st.name, bw * 0.9, 13, 'bold ');
  ctx.fillText(st.name, VW / 2, 20);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW - 18, 20);
  ctx.textAlign = 'left';

  // ボスの たいりょく
  if (G.boss && G.boss.hp > 0) {
    const b = G.boss;
    const w2 = VW * 0.5, x2 = VW / 2 - w2 / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    rr(ctx, x2, 48, w2, 16, 8); ctx.fill();
    ctx.fillStyle = '#FF6A6A';
    rr(ctx, x2, 48, Math.max(4, w2 * (b.hp / b.max)), 16, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(BOSS[b.key].name, VW / 2, 56);
    ctx.textAlign = 'left';
  }

  // 3ほうこう の のこり
  if (G.triple > 0) {
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('あわ 3ほうこう ' + G.triple.toFixed(1) + 'びょう', 20, 58);
  }

  // はじめの あんない
  if (G.t < 3.2) {
    ctx.globalAlpha = Math.min(1, (3.2 - G.t) / 1.2);
    ctx.fillStyle = 'rgba(12,8,24,0.55)';
    const pw = G.VW * 0.7, ph = 44;
    rr(ctx, G.VW / 2 - pw / 2, VH - 74, pw, ph, 12); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(stageRule(G.si), pw * 0.92, 20, 'bold ');
    ctx.fillText(stageRule(G.si), G.VW / 2, VH - 52);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.assist > 0) {
    ctx.fillStyle = 'rgba(255,224,138,0.85)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('やさしく してるよ', G.VW - 16, VH - 18);
    ctx.textAlign = 'left';
  }

  drawButton(button(14, VH - 44, 86, 30, () => {
    bgmStop(); G.screen = 'select';
  }), 'やめる', 'rgba(255,255,255,0.8)');
}

// --- タイトル -----------------------------------------------------------------

function drawTitle(t) {
  const VW = G.VW;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#7FC8F8'); g.addColorStop(1, '#FFD8EC');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 6; i++) {
    const x = ((i * 190 + t * 22) % (VW + 300)) - 150;
    const y = 50 + (i * 71) % (VH - 150);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [dx, dy, r] of [[-28, 6, 24], [0, -6, 32], [30, 4, 22]]) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill();
    }
  }
  drawRina(VW * 0.78, VH * 0.56 + Math.sin(t * 1.6) * 22,
           Math.cos(t * 1.6) * -120, t, 0);

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(60,90,140,0.55)'; ctx.lineWidth = 6;
  const fs = fitFont('ふわふわふわりな', VW * 0.55, 62, 'bold ');
  ctx.strokeText('ふわふわふわりな', 30, 26);
  ctx.fillText('ふわふわふわりな', 30, 26);
  ctx.fillStyle = '#2A4A6E';
  fitFont('タップで ふわっと とんで、そらの てきと たたかおう', VW * 0.55, 20);
  ctx.fillText('タップで ふわっと とんで、そらの てきと たたかおう', 32, 26 + fs + 8);
  const done = clearedCount();
  fitFont('クリアした めん ' + done + ' / ' + STAGES.length, VW * 0.5, 19);
  ctx.fillText('クリアした めん ' + done + ' / ' + STAGES.length, 32, 26 + fs + 34);

  const bw = Math.min(VW * 0.40, 330), bh = 58;
  const x = 30;
  let y = VH * 0.42;
  const nx = Math.min(STAGES.length - 1, done);
  drawButton(button(x, y, bw, bh, () => { enterFullscreen(); showRule(nx); }),
             done > 0 ? (nx + 1) + 'めん から' : 'はじめる', '#FFD166');
  y += bh + 10;
  drawButton(button(x, y, bw * 0.48, 42, () => { G.screen = 'select'; }), 'めんを えらぶ', '#BFE4F0');
  drawButton(button(x + bw * 0.52, y, bw * 0.48, 42, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D8F4');
  y += 50;
  drawButton(button(x, y, bw * 0.48, 38, () => { sfxTest(); }), '♪ 音を ためす', '#FFE08A',
             '#3A2A08', soundOK() ? '音は 出せる' : 'ここを おしてね');
  ctx.fillStyle = 'rgba(40,60,90,0.75)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  fitFont('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW * 0.6, 15);
  ctx.fillText('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', 30, VH - 26);
  drawHubButton();
}

function drawHowto() {
  const VW = G.VW;
  ctx.fillStyle = '#17203A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#8FD6FF';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('あそびかた', 26, 22);
  const lines = [
    '① 画面を タップ すると りなが ふわっと 上がる。はなすと ゆっくり 下がる',
    '② あわは かってに 前へ とんでいく。高さを 合わせて てきに あてよう',
    '③ てきや てきの たまに ぶつかると たいりょくが 1 へる（ハートが 0 で おわり）',
    '④ ピンクの ハート＝たいりょく回ふく　　きいろの ほし＝あわが 3ほうこうに',
    '⑤ 上の バーが 右はしまで いけば クリア。5めん と 10めん は ボス',
    '⑥ ぶつかった あとは しばらく むてき（ちかちかする）',
    '⑦ 何回も だめだと、ハートが ふえて てきが おそくなる。3回で つぎの めんも あく',
    'パソコン: スペースキー か やじるしキー でも とべる',
  ];
  ctx.fillStyle = '#D8E4F4';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 19);
    ctx.fillText(s, 26, 78 + i * 38);
  });
  drawButton(button(VW - 130, 22, 108, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- めん えらび ---------------------------------------------------------------

function drawSelect() {
  const VW = G.VW;
  ctx.fillStyle = '#1B2440'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('めんを えらぶ', 22, 18);

  const cols = 5, rows = 2;
  const gx = 22, gy = 68, gap = 10;
  const cw = (VW - gx * 2 - gap * (cols - 1)) / cols;
  const chh = Math.min(150, (VH - gy - 70 - gap) / rows);
  for (let i = 0; i < STAGES.length; i++) {
    const st = STAGES[i];
    const x = gx + (i % cols) * (cw + gap), y = gy + ((i / cols) | 0) * (chh + gap + 12);
    const open = stageOpen(i);
    const stars = save.star['s' + i] || 0;
    ctx.fillStyle = open ? (st.boss ? '#E86A9C' : '#3E7ACF') : 'rgba(255,255,255,0.08)';
    rr(ctx, x, y, cw, chh, 12); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold ' + Math.round(chh * 0.3) + 'px system-ui, sans-serif';
    ctx.fillText(open ? String(i + 1) : '?', x + cw / 2, y + chh * 0.32);
    if (open) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      fitFont(st.name, cw * 0.92, chh * 0.14);
      ctx.fillText(st.name, x + cw / 2, y + chh * 0.62);
      // ほし
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k < stars ? '#FFD166' : 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        const cx2 = x + cw / 2 + (k - 1) * 18, cy2 = y + chh * 0.83;
        for (let j = 0; j < 10; j++) {
          const a = -Math.PI / 2 + j * Math.PI / 5;
          const rr2 = j % 2 ? 3 : 7;
          const px = cx2 + Math.cos(a) * rr2, py = cy2 + Math.sin(a) * rr2;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
      if (st.boss) {
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText('ボス', x + cw / 2, y + 14);
      }
      button(x, y, cw, chh, ((k) => () => { enterFullscreen(); showRule(k); })(i));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      fitFont('まえを クリアすると あく', cw * 0.92, chh * 0.12);
      ctx.fillText('まえを クリアすると あく', x + cw / 2, y + chh * 0.62);
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  drawButton(button(VW - 130, 18, 108, 38, () => { G.screen = 'title'; }), 'もどる', '#D8D4F0');
}

// --- はじめる まえの あんない ----------------------------------------------------

function showRule(i) {
  audioStart();
  G.pending = Math.max(0, Math.min(STAGES.length - 1, i));
  G.screen = 'rule';
}

function drawRule(t) {
  const VW = G.VW, st = STAGES[G.pending];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(10,14,30,0.42)'; ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  fitFont((G.pending + 1) + ' めん', VW * 0.3, 22, 'bold ');
  ctx.fillText((G.pending + 1) + ' めん', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  fitFont(st.name, VW * 0.7, 52, 'bold ');
  ctx.fillText(st.name, VW / 2, 54);

  const pw = VW * 0.82, ph = 84;
  ctx.fillStyle = 'rgba(12,8,24,0.6)';
  rr(ctx, VW / 2 - pw / 2, 128, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = st.boss ? '#FF8FBB' : '#8FD6FF'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF3C4'; ctx.textBaseline = 'middle';
  fitFont(stageRule(G.pending), pw * 0.9, 24, 'bold ');
  ctx.fillText(stageRule(G.pending), VW / 2, 128 + ph * 0.36);
  ctx.fillStyle = 'rgba(225,235,250,0.85)';
  fitFont('タップ＝ふわっと 上がる。あわは かってに 出る', pw * 0.9, 18);
  ctx.fillText('タップ＝ふわっと 上がる。あわは かってに 出る', VW / 2, 128 + ph * 0.72);

  drawRina(VW / 2, 268 + Math.sin(t * 3) * 10, Math.cos(t * 3) * -60, t, 0);

  ctx.textAlign = 'left';
  const bw = Math.min(VW * 0.32, 260);
  drawButton(button(VW / 2 - bw / 2, VH - 118, bw, 52, () => { startStage(G.pending); }),
             'はじめる！', '#FFD166');
  drawButton(button(20, 20, 100, 38, () => { G.screen = 'select'; }), 'もどる', '#D8D4F0');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('画面を さわっても はじまるよ', VW * 0.5, 16);
  ctx.fillText('画面を さわっても はじまるよ', VW / 2, VH - 52);
  ctx.textAlign = 'left';
}

// --- けっか -------------------------------------------------------------------

function drawResult(t) {
  const VW = G.VW;
  drawPlay(t);
  ctx.fillStyle = G.win ? 'rgba(16,40,60,0.82)' : 'rgba(50,16,30,0.82)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#A8F0FF' : '#FFB0B0';
  fitFont(G.win ? 'ゴール！' : 'おちちゃった…', VW * 0.7, 56, 'bold ');
  ctx.fillText(G.win ? 'ゴール！' : 'おちちゃった…', VW / 2, 40);

  if (G.win) {
    for (let k = 0; k < 3; k++) {
      const on = k < G.stars;
      const sc2 = on ? 1 + Math.max(0, Math.sin(t * 4 - k) * 0.08) : 1;
      ctx.save();
      ctx.translate(VW / 2 + (k - 1) * 66, 132);
      ctx.scale(sc2, sc2);
      ctx.fillStyle = on ? '#FFD166' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = -Math.PI / 2 + j * Math.PI / 5;
        const rr2 = j % 2 ? 11 : 26;
        const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  const rows = [['てんすう', G.score, '#FFE066'], ['たおした てき', G.kills, '#A8E0FF'],
                ['のこり たいりょく', Math.max(0, G.hp), '#FF9CC0']];
  rows.forEach((r, i) => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#D8E4F4';
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText(r[0], VW / 2 - 14, 186 + i * 34);
    ctx.textAlign = 'left'; ctx.fillStyle = r[2];
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(String(r[1]), VW / 2 + 14, 184 + i * 34);
  });

  ctx.textAlign = 'center';
  let note = 'もう一度 やってみよう';
  let ncol = '#9CB0C8';
  if (G.win) note = 'つぎの めんが あいたよ';
  else if (G.justOpened) { note = 'つぎの めんも あけたよ。とばしても いいよ'; ncol = '#7FE0A0'; }
  else if (assistLevel() > 0) { note = 'つぎは ハートが ふえて てきが おそくなるよ'; ncol = '#FFE08A'; }
  ctx.fillStyle = ncol;
  fitFont(note, VW * 0.7, 19);
  ctx.fillText(note, VW / 2, 300);
  ctx.textAlign = 'left';

  const bw = Math.min(VW * 0.25, 200), bh = 50;
  const nx = G.si + 1;
  const canNext = nx < STAGES.length && (G.win || stageOpen(nx));
  drawButton(button(VW / 2 - bw * 1.6, VH - 84, bw, bh, () => { startStage(G.si); }),
             'もう一度', '#FFD166');
  drawButton(button(VW / 2 - bw * 0.5, VH - 84, bw, bh, () => { G.screen = 'select'; }),
             'えらぶ', '#D8D4F0');
  if (canNext) {
    drawButton(button(VW / 2 + bw * 0.6, VH - 84, bw, bh, () => { showRule(nx); }),
               'つぎへ →', '#7FE0A0');
  }
}

// --- ほかの ゲームへ ------------------------------------------------------------

function gotoHub() {
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  location.href = '/allprojects/';
}
function drawHubButton() {
  const mw = Math.min(G.VW * 0.3, 190), mh = 38;
  drawButton(button(G.VW - mw - 16, 16, mw, mh, gotoHub),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.88)', '#33304A');
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

// --- そうさ -------------------------------------------------------------------

let held = false;

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
  if (G.screen === 'play') { held = true; flap(); }
  else if (G.screen === 'rule') startStage(G.pending);
});
function up() { held = false; }
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
window.addEventListener('blur', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (!['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) return;
  e.preventDefault();
  audioStart();
  if (e.repeat) return;
  if (G.screen === 'play') { held = true; flap(); }
  else if (G.screen === 'rule') startStage(G.pending);
});
window.addEventListener('keyup', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
    held = false;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'select'; }
});

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#17203A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#A8C0E0';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

// --- ループ -------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') {
    update(dt, held);
    if (G.screen === 'play') drawPlay(tsec);
    else drawResult(tsec);
  } else if (G.screen === 'clear' || G.screen === 'over') drawResult(tsec);
  else if (G.screen === 'select') drawSelect();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'rule') drawRule(tsec);
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
