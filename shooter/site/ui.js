// 画面・そうさ・メインループ。
//
// ★ そうさは ゆびで なぞる だけ。たまは じどうで 出る。
//   ゆびの ところへ 船が すーっと よっていく（ゆびで 船が かくれない）。

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

// --- ほし ---------------------------------------------------------------------------

const STARS = [];
for (let i = 0; i < 90; i++) {
  STARS.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9 });
}

function drawStars(t) {
  for (const s of STARS) {
    const x = ((s.x - t * s.z * 0.06) % 1 + 1) % 1 * VW;
    const y = s.y * VH;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + s.z * 0.45) + ')';
    ctx.fillRect(x, y, 1 + s.z * 1.6, 1 + s.z * 0.6);
  }
}

// --- 船と てき の え ---------------------------------------------------------------

function drawShip(x, y, r, blink) {
  ctx.save();
  ctx.translate(x, y);
  if (blink) ctx.globalAlpha = 0.45;
  // ★ くらい うちゅうで 見うしなわない ように、うすい ひかりを しく
  ctx.fillStyle = 'rgba(143,214,255,0.16)';
  ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, 7); ctx.fill();
  // ふんしゃ
  ctx.fillStyle = 'rgba(255,180,90,' + (0.5 + Math.random() * 0.4) + ')';
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.28); ctx.lineTo(-r * (1.5 + Math.random() * 0.7), 0);
  ctx.lineTo(-r * 0.9, r * 0.28); ctx.closePath(); ctx.fill();
  // 本体
  ctx.fillStyle = '#F4ECF7';
  ctx.beginPath();
  ctx.moveTo(r * 1.35, 0);
  ctx.lineTo(-r * 0.5, -r * 0.62);
  ctx.lineTo(-r * 0.9, -r * 0.22);
  ctx.lineTo(-r * 0.9, r * 0.22);
  ctx.lineTo(-r * 0.5, r * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8A7AA8'; ctx.lineWidth = 2; ctx.stroke();
  // つばさ
  ctx.fillStyle = '#FF8FBB';
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.4); ctx.lineTo(-r * 0.7, -r * 1.05);
  ctx.lineTo(-r * 0.95, -r * 0.35); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, r * 0.4); ctx.lineTo(-r * 0.7, r * 1.05);
  ctx.lineTo(-r * 0.95, r * 0.35); ctx.closePath(); ctx.fill();
  // まど
  ctx.fillStyle = '#8FD6FF';
  ctx.beginPath(); ctx.ellipse(r * 0.35, 0, r * 0.30, r * 0.24, 0, 0, 7); ctx.fill();
  ctx.restore();
}

function drawFoe(f, t) {
  const F = FOES[f.k];
  const col = f.hit > 0.3 ? '#FFFFFF' : F.col;
  ctx.save();
  ctx.translate(f.x, f.y);
  if (f.k === 'rock') {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + f.t * 0.3;
      const rr2 = f.r * (0.82 + ((i * 37) % 10) / 40);
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,30,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(-f.r * 0.2, -f.r * 0.15, f.r * 0.25, 0, 7); ctx.fill();
    ctx.restore(); return;
  }
  // むきは 左
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-f.r * 1.25, 0);
  ctx.lineTo(f.r * 0.55, -f.r * 0.78);
  ctx.lineTo(f.r * 1.05, 0);
  ctx.lineTo(f.r * 0.55, f.r * 0.78);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,30,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  // 目
  ctx.fillStyle = '#2A2440';
  ctx.beginPath(); ctx.ellipse(-f.r * 0.25, 0, f.r * 0.26, f.r * 0.34, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(-f.r * 0.34, -f.r * 0.10, f.r * 0.11, 0, 7); ctx.fill();
  if (FOES[f.k].shoot) {
    // ほうだい
    ctx.fillStyle = 'rgba(30,24,40,0.85)';
    rr(ctx, -f.r * 1.5, -f.r * 0.16, f.r * 0.5, f.r * 0.32, 2); ctx.fill();
  }
  ctx.restore();
}

// ★ リナパパ。メガネの ちょいぽちゃ が 円ばんに のって いる。
function drawPapaBoss(b, t) {
  const x = b.x, y = b.y, r = b.r;
  ctx.save();
  ctx.translate(x, y);
  const wob = Math.sin(t * 3) * r * 0.03;
  // 円ばん
  ctx.fillStyle = b.hit > 0.3 ? '#FFFFFF' : '#7A88A8';
  ctx.beginPath(); ctx.ellipse(0, r * 0.52, r * 1.28, r * 0.34, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(20,20,40,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#FFD166';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * r * 0.42, r * 0.62, r * 0.08, 0, 7); ctx.fill();
  }
  // ドーム
  ctx.fillStyle = 'rgba(160,220,255,0.30)';
  ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.92, Math.PI, 0); ctx.fill();
  // からだ（ちょいぽちゃ）
  ctx.fillStyle = '#5A8A6A';
  ctx.beginPath(); ctx.ellipse(wob, r * 0.20, r * 0.62, r * 0.42, 0, 0, 7); ctx.fill();
  // かお
  ctx.fillStyle = '#F5CFAE';
  ctx.beginPath(); ctx.ellipse(wob, -r * 0.30, r * 0.56, r * 0.50, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,50,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  // ほっぺ
  ctx.fillStyle = 'rgba(255,150,150,0.35)';
  ctx.beginPath(); ctx.ellipse(wob - r * 0.34, -r * 0.16, r * 0.14, r * 0.10, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(wob + r * 0.34, -r * 0.16, r * 0.14, r * 0.10, 0, 0, 7); ctx.fill();
  // かみ
  ctx.fillStyle = '#3A3040';
  ctx.beginPath();
  ctx.ellipse(wob, -r * 0.66, r * 0.50, r * 0.22, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.fill();
  // 目
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(wob - r * 0.20, -r * 0.34, r * 0.11, r * 0.13, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(wob + r * 0.20, -r * 0.34, r * 0.11, r * 0.13, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2440';
  ctx.beginPath(); ctx.arc(wob - r * 0.22, -r * 0.33, r * 0.06, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(wob + r * 0.18, -r * 0.33, r * 0.06, 0, 7); ctx.fill();
  // ★ メガネ
  ctx.strokeStyle = '#2A2440'; ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.arc(wob - r * 0.20, -r * 0.34, r * 0.18, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(wob + r * 0.20, -r * 0.34, r * 0.18, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wob - r * 0.02, -r * 0.34); ctx.lineTo(wob + r * 0.02, -r * 0.34);
  ctx.moveTo(wob - r * 0.38, -r * 0.36); ctx.lineTo(wob - r * 0.54, -r * 0.40);
  ctx.moveTo(wob + r * 0.38, -r * 0.36); ctx.lineTo(wob + r * 0.54, -r * 0.40);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(wob - r * 0.20, -r * 0.34, r * 0.12, -2.4, -1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(wob + r * 0.20, -r * 0.34, r * 0.12, -2.4, -1.5); ctx.stroke();
  // くち
  ctx.strokeStyle = '#8A5A48'; ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.beginPath(); ctx.arc(wob, -r * 0.10, r * 0.16, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
}

function drawBoss(b, t) {
  if (b.k === 'papa') { drawPapaBoss(b, t); return; }
  const r = b.r;
  ctx.save();
  ctx.translate(b.x, b.y);
  const col = b.hit > 0.3 ? '#FFFFFF' : (b.k === 'ufo' ? '#B98FE0' : '#6ACB6A');
  if (b.k === 'ufo') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.52, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,30,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,0.55)';
    ctx.beginPath(); ctx.arc(0, -r * 0.16, r * 0.62, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFD166';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * r * 0.44, r * 0.30, r * 0.10 * (1 + 0.4 * Math.sin(t * 6 + i)), 0, 7);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = col;
    rr(ctx, -r * 0.9, -r, r * 1.8, r * 2, r * 0.3); ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,30,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(20,14,30,0.5)';
    rr(ctx, -r * 1.25, -r * 0.55, r * 0.5, r * 0.34, 3); ctx.fill();
    rr(ctx, -r * 1.25, r * 0.21, r * 0.5, r * 0.34, 3); ctx.fill();
    // コア
    const p = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = 'rgba(255,120,140,' + p + ')';
    ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.20, 0, 7); ctx.fill();
  }
  ctx.restore();
}

const ITEM_COL = { pw: '#FFD166', hp: '#FF8FA0', sh: '#8FD6FF' };
const ITEM_TXT = { pw: 'P', hp: '♥', sh: 'B' };

// --- あそんでいる 画面 --------------------------------------------------------------

function drawPlay(t) {
  ctx.fillStyle = '#0E0A1C'; ctx.fillRect(0, 0, VW, VH);
  drawStars(t);

  ctx.save();
  if (G.shake > 0) ctx.translate(Math.sin(t * 70) * 6 * G.shake, Math.cos(t * 58) * 5 * G.shake);

  // アイテム
  for (const it of G.items) {
    ctx.fillStyle = ITEM_COL[it.k];
    ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2A2440';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ITEM_TXT[it.k], it.x, it.y + 1);
    ctx.textAlign = 'left';
  }

  // じぶんの たま
  ctx.fillStyle = '#FFE066';
  for (const s of G.shots) {
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.7, Math.atan2(s.vy, s.vx), 0, 7);
    ctx.fill();
  }

  for (const f of G.foes) drawFoe(f, t);
  if (G.boss) {
    drawBoss(G.boss, t);
    drawBossBar();
  }

  // てきの たま
  for (const b of G.ebul) {
    ctx.fillStyle = '#FF6B7A';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(b.x - 1, b.y - 1, b.r * 0.42, 0, 7); ctx.fill();
  }

  // けむり
  for (const p of G.puffs) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 + (1 - p.t / p.life) * 4, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!G.over || G.win) {
    if (G.shield > 0) {
      ctx.strokeStyle = 'rgba(143,214,255,' + (0.4 + 0.4 * Math.sin(t * 9)) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(G.px, G.py, 24, 0, 7); ctx.stroke();
    }
    // オプション（グラディウスの あれ）
    for (let i = 0; i < G.opts.length; i++) {
      const o = G.opts[i];
      // ★ 画面の 外に 出ないように 止める（左はしで 見えなく なる）
      o.x = Math.max(14, o.x);
      ctx.fillStyle = 'rgba(255,209,102,0.85)';
      ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 8 + i)) + ')';
      ctx.beginPath(); ctx.arc(o.x, o.y, 4, 0, 7); ctx.fill();
    }
    drawShip(G.px, G.py, 16, G.inv > 0 && Math.floor(t * 14) % 2 === 0);
  }
  // ★ いま つかんで いる ところ（ゆびは 船から はなれて いても いい）
  if (G.fingerX != null && !G.over) {
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(G.fingerX, G.fingerY, 18, 0, 7); ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.moveTo(G.fingerX, G.fingerY); ctx.lineTo(G.px, G.py); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();

  drawTop();

  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2);
    ctx.fillStyle = 'rgba(10,8,24,0.8)';
    rr(ctx, VW / 2 - 150, VH - 44, 300, 30, 8); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.msg, 280, 17, 'bold ');
    ctx.fillText(G.msg, VW / 2, VH - 29);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(10,8,24,0.5)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'クリア！' : 'やられた…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawBossBar() {
  const b = G.boss;
  const w = Math.min(340, VW * 0.44);
  const x = VW - w - 12, y = 40;
  ctx.fillStyle = 'rgba(10,8,24,0.7)';
  rr(ctx, x, y, w, 14, 7); ctx.fill();
  ctx.fillStyle = b.hp < b.max * 0.4 ? '#FF6B7A' : '#FFD166';
  rr(ctx, x + 2, y + 2, Math.max(2, (w - 4) * (b.hp / b.max)), 10, 5); ctx.fill();
  // ★ 名まえは バーの **左** に 出す。上に 出すと 上の おびと
  //   「めんを えらぶ」ボタンに かさなって 読めない。
  ctx.fillStyle = '#FFE066';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(BOSSES[b.k].name, x - 8, y + 7);
  ctx.textAlign = 'left';
}

function drawTop() {
  ctx.fillStyle = 'rgba(10,8,24,0.62)';
  rr(ctx, 8, 6, VW - 16, 28, 8); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  fitFont(G.S.name, VW * 0.20, 13, 'bold ');
  ctx.fillText(G.S.name, 16, 20);

  // ライフ
  const hx = VW * 0.30;
  for (let i = 0; i < G.maxhp; i++) {
    const on = i < G.hp;
    ctx.fillStyle = on ? '#FF8FA0' : 'rgba(255,255,255,0.18)';
    const x = hx + i * 20, y = 20;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.bezierCurveTo(x, y - 3, x + 8, y - 3, x + 8, y + 3);
    ctx.bezierCurveTo(x + 8, y - 3, x + 16, y - 3, x + 16, y + 5);
    ctx.bezierCurveTo(x + 16, y + 10, x + 8, y + 13, x + 8, y + 13);
    ctx.bezierCurveTo(x + 8, y + 13, x, y + 10, x, y + 5);
    ctx.fill();
  }
  // たまの つよさ
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('たま ' + G.pw, hx + G.maxhp * 20 + 12, 20);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW - 104, 20);
  ctx.textAlign = 'left';
  drawButton(button(VW - 94, 8, 84, 24, () => { bgmStop(); G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル -----------------------------------------------------------------------

function drawTitle(t) {
  ctx.fillStyle = '#0E0A1C'; ctx.fillRect(0, 0, VW, VH);
  drawStars(t);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('まさきのうちゅうシューティング', VW * 0.50, 34, 'bold ');
  ctx.fillText('まさきのうちゅうシューティング', 24, 14);
  ctx.fillStyle = '#8FD6FF';
  const sub = '画面を ひっぱると その ぶんだけ 船が うごく。たまは じどう';
  fitFont(sub, VW * 0.46, 14);
  ctx.fillText(sub, 26, 18 + fs + 4);

  // 見本
  {
    // ★ めんの ふだ（左はし から VW*0.56 くらい）に かさならない ように 右へ よせる。
    const x = VW - 116, y = 156;
    drawShip(x - 62, y, 18, false);
    drawPapaBoss({ x: x + 30, y: y, r: 36, hit: 0 }, t);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('じぶんの 船', x - 62, y + 32);
    ctx.fillStyle = '#FFE066';
    ctx.fillText('ボス リナパパ', x + 30, y + 56);
    ctx.textAlign = 'left';
  }

  const cw = Math.min(96, (VW * 0.56 - 24) / 5), chh = 62;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 112 + Math.floor(i / 5) * (chh + 10);
    const op = opened(i), cl = !!save.clear[i];
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 4);
      ctx.fillStyle = STAGES[i].boss === 'papa' ? '#FFE066' : 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(BOSSES[STAGES[i].boss].name, cxp + (cw - 8) / 2, cyp + 24);
      ctx.fillStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(save.best['s' + i] ? String(save.best['s' + i]) : (cl ? 'クリア' : '—'),
                   cxp + (cw - 8) / 2, cyp + 42);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('★ 3回 やられると ライフが ふえて、つぎの めんも ひらくよ', 24, 112 + 2 * (chh + 10) + 8);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(24, VH - 42, 106, 30, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(138, VH - 42, 96, 30, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, VW - 14, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto(t) {
  ctx.fillStyle = '#140E24'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#8FD6FF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 12);

  // アイテムの せつめい
  const its = [['pw', 'たまが つよくなる（さいだい 4）'], ['hp', 'ライフが 1つ もどる'],
               ['sh', 'バリア。1回 だけ まもってくれる']];
  its.forEach(([k, s], i) => {
    const x = 40, y = 62 + i * 34;
    ctx.fillStyle = ITEM_COL[k];
    ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2440';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ITEM_TXT[k], x, y + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F0E4F0';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(s, x + 24, y);
  });

  ctx.textBaseline = 'top';
  const lines = [
    '① 画面を ひっぱると、ひっぱった ぶんだけ 船が うごく',
    '　 （どこを さわっても いい。下のほうを さわると ゆびで 船が かくれない）',
    '② たまは じどうで 出る。ボタンは おさなくて いい',
    '③ P を 3つ とると「オプション」（金の 玉）が ついてくる。いっしょに うつ',
    '④ 赤い たまと てきに ぶつかると ライフが 1つ へる',
    '⑤ てきを ぜんぶ たおすと ボス。ボスを たおしたら クリア',
    '',
    '4・7・10 めんの ボスは リナパパ。メガネの ちょいぽちゃ が ケーキを なげてくる。',
  ];
  ctx.fillStyle = '#F0E4F0';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 15);
    ctx.fillText(s, 24, 176 + i * 25);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  ctx.fillStyle = '#0E0A1C'; ctx.fillRect(0, 0, VW, VH);
  drawStars(t);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : 'やられた…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'やられた…', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 84);
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 38px system-ui, sans-serif';
  ctx.fillText(String(G.score), VW / 2, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('さいこう ' + (save.best['s' + G.stage] || 0), VW / 2, 156);
  if (!G.win) {
    const lv = assistLevel(G.stage);
    ctx.fillStyle = '#A8F0B0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(lv > 0 ? 'ライフを ' + lv + 'つ ふやして あるよ' :
                 'あと ' + (3 - ((save.fails['s' + G.stage] || 0) % 3)) + '回 やられると やさしく なるよ',
                 VW / 2, 186);
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(160, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 56, bw, 38, () => startStage(G.stage)), 'もう一度', '#E8D0F8');
  if (nxt < STAGES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 56, bw, 38, () => startStage(nxt)), 'つぎの めん', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 56, bw, 38, () => { G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------------

// ★ もとは「ゆびの ばしょへ 船が とんでいく」だったが、
//   ゆびの 下に 船が 入って **自分の 船が 見えない**。
//   いまは **ひっぱった ぶんだけ 船が うごく**（あいたい そうさ）。
//   画面の どこを さわっても いいので、下のほうを さわれば
//   船に ゆびが かからない。
let dragging = false, lastX = 0, lastY = 0;
const DRAG_GAIN = 1.35;   // ゆびの うごきの 何ばい 船が うごくか

function down(px, py) {
  audioStart();
  const x = px / SC, y = py / SC;
  if (G.screen === 'play' && !G.over) {
    const b = hitBtn(px, py);
    if (b && b.on) { b.on(); return; }
    dragging = true;
    lastX = x; lastY = y;      // おぼえる だけ。船は とばない。
    G.fingerX = x; G.fingerY = y;
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}
function move(px, py) {
  if (!dragging) return;
  const x = px / SC, y = py / SC;
  G.tx += (x - lastX) * DRAG_GAIN;
  G.ty += (y - lastY) * DRAG_GAIN;
  lastX = x; lastY = y;
  G.fingerX = x; G.fingerY = y;
}
function up() { dragging = false; G.fingerX = null; }

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

// パソコンの やじるしキー でも うごく
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) {
    keys[e.key] = true; e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function keyMove(dt) {
  const s = 340 * dt;
  if (keys.ArrowLeft) { G.tx -= s; dragging = false; }
  if (keys.ArrowRight) { G.tx += s; dragging = false; }
  if (keys.ArrowUp) { G.ty -= s; dragging = false; }
  if (keys.ArrowDown) { G.ty += s; dragging = false; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') bgmStop();
});

// --- ループ ---------------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.032, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') { keyMove(dt); update(dt); drawPlay(tsec); }
  else if (G.screen === 'result') drawResult(tsec);
  else if (G.screen === 'howto') drawHowto(tsec);
  else drawTitle(tsec);
}

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0E0A1C'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#8FD6FF';
  ctx.fillText('左から 右へ すすむ ゲームだよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
