// 画面・そうさ・メインループ。
//
// タワーディフェンスで いちばん わからなく なりやすいのは
// 「その とうは どこまで とどくのか」。
// えらんだ とうと、これから おく とうの **とどくはんい**を いつも まるで 出す。

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

// --- ばんめんの ばしょ -----------------------------------------------------------

function bd() {
  const cs = Math.floor(Math.min(46, (VW - 196) / GW, (VH - 104) / GH));
  return { x: 12, y: 54, cs, w: cs * GW, h: cs * GH };
}

// --- 絵 -------------------------------------------------------------------------

function drawTower(t, B, t2) {
  const x = B.x + (t.c + 0.5) * B.cs, y = B.y + (t.r + 0.5) * B.cs;
  const s = B.cs / 44;
  const T = TOWERS[t.k];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // だい
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 12, 17, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6A5A48';
  rr(ctx, -16, -4, 32, 18, 5); ctx.fill();
  ctx.fillStyle = '#8A7458';
  rr(ctx, -16, -6, 32, 6, 3); ctx.fill();
  // ほんたい
  ctx.save();
  ctx.rotate(t.ang || 0);
  ctx.fillStyle = T.col;
  if (t.k === 'punch') {
    rr(ctx, -9, -9, 18, 18, 5); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 7, -4, 12, 8, 4); ctx.fill();
  } else if (t.k === 'bomb') {
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#3A2A28';
    rr(ctx, 4, -4, 14, 8, 4); ctx.fill();
  } else if (t.k === 'ice') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 12, Math.sin(a) * 12);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  } else {
    rr(ctx, -8, -7, 16, 14, 4); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 6, -2.5, 16, 5, 2.5); ctx.fill();
  }
  ctx.restore();
  // レベルの ほし
  ctx.fillStyle = '#FFE066';
  for (let i = 0; i < t.lv; i++) {
    ctx.beginPath(); ctx.arc(-8 + i * 8, -16, 3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawFoe(f, B) {
  const p = atU(f.u);
  const F = FOES[f.k];
  const x = B.x + (p.c + 0.5) * B.cs, y = B.y + (p.r + 0.5) * B.cs;
  const rr2 = F.r * B.cs;
  ctx.save();
  ctx.translate(x, y);
  if (F.air) ctx.translate(0, -B.cs * 0.22 + Math.sin(G.t * 8 + f.u * 40) * 2.5);
  else {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, rr2 * 0.9, rr2 * 0.9, rr2 * 0.32, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = f.hitT > 0 ? '#FFFFFF' : F.col;
  if (f.k === 'bat') {
    // はね
    ctx.beginPath();
    const w = Math.sin(G.t * 16 + f.u * 30) * 0.4;
    ctx.ellipse(-rr2 * 1.3, -rr2 * 0.2, rr2 * 0.8, rr2 * 0.42, w, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rr2 * 1.3, -rr2 * 0.2, rr2 * 0.8, rr2 * 0.42, -w, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, rr2, 0, 7); ctx.fill();
  } else if (f.k === 'tank') {
    rr(ctx, -rr2, -rr2 * 0.9, rr2 * 2, rr2 * 1.8, rr2 * 0.4); ctx.fill();
  } else if (f.k === 'boss') {
    ctx.beginPath(); ctx.arc(0, 0, rr2, 0, 7); ctx.fill();
    ctx.fillStyle = '#8A2020';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * rr2 * 0.5, -rr2 * 0.8);
      ctx.lineTo(s * rr2 * 0.9, -rr2 * 1.5);
      ctx.lineTo(s * rr2 * 0.15, -rr2 * 1.0);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, rr2, Math.PI, 0);
    ctx.quadraticCurveTo(rr2, rr2 * 0.9, 0, rr2 * 0.9);
    ctx.quadraticCurveTo(-rr2, rr2 * 0.9, -rr2, 0);
    ctx.closePath(); ctx.fill();
  }
  // め
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-rr2 * 0.35, -rr2 * 0.15, rr2 * 0.14, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(rr2 * 0.35, -rr2 * 0.15, rr2 * 0.14, 0, 7); ctx.fill();
  // たいりょくの ぼう
  if (f.hp < f.max) {
    const bw = rr2 * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rr(ctx, -bw / 2, -rr2 - 9, bw, 4.5, 2); ctx.fill();
    const k = Math.max(0, f.hp / f.max);
    ctx.fillStyle = k > 0.5 ? '#7FD86A' : k > 0.22 ? '#FFD166' : '#FF6A6A';
    rr(ctx, -bw / 2, -rr2 - 9, bw * k, 4.5, 2); ctx.fill();
  }
  if (f.slow > 0) {
    ctx.strokeStyle = 'rgba(140,220,250,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, rr2 + 4, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  const B = bd();
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2E4A34'); g.addColorStop(1, '#1E3226');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  // ★ みちは ばんめんの そとまで のびている（入口と きちは 画面の はし）。
  //   そのまま かくと 右の ボタンの 上に てきや きちが はみ出すので、
  //   ばんめんの ぶんだけ 切りとって かく。
  ctx.save();
  rr(ctx, B.x, B.y, B.w, B.h, 4);
  ctx.clip();

  // 草の マス
  for (let r = 0; r < GH; r++) {
    for (let c = 0; c < GW; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#4E8A4A' : '#478044';
      ctx.fillRect(B.x + c * B.cs, B.y + r * B.cs, B.cs, B.cs);
    }
  }
  // みち
  ctx.strokeStyle = '#B89A6A';
  ctx.lineWidth = B.cs * 0.78; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < G.path.length; i++) {
    const [c, r] = G.path[i];
    const x = B.x + (c + 0.5) * B.cs, y = B.y + (r + 0.5) * B.cs;
    ctx[i ? 'lineTo' : 'moveTo'](x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#C8AC7C'; ctx.lineWidth = B.cs * 0.6; ctx.stroke();

  // きち（ゴール）。ばんめんの 中に おさまる ように よせる。
  {
    const e = G.path[G.path.length - 1];
    const ec = Math.max(0, Math.min(GW - 1, e[0])), er = Math.max(0, Math.min(GH - 1, e[1]));
    const x = B.x + (ec + 0.5) * B.cs, y = B.y + (er + 0.5) * B.cs;
    ctx.fillStyle = '#4A9CE8';
    rr(ctx, x - B.cs * 0.42, y - B.cs * 0.42, B.cs * 0.84, B.cs * 0.84, 6); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont('きち', B.cs * 0.8, B.cs * 0.36, 'bold ');
    ctx.fillText('きち', x, y);
    ctx.textAlign = 'left';
  }
  // 入口
  {
    const s = G.path[0];
    const sc = Math.max(0, Math.min(GW - 1, s[0])), sr = Math.max(0, Math.min(GH - 1, s[1]));
    const x = B.x + (sc + 0.5) * B.cs, y = B.y + (sr + 0.5) * B.cs;
    ctx.fillStyle = 'rgba(255,120,120,0.55)';
    ctx.beginPath(); ctx.arc(x, y, B.cs * 0.34, 0, 7); ctx.fill();
  }

  // おける ところ（とうを えらんで いる ときだけ 出す）
  if (G.pick) {
    for (let r = 0; r < GH; r++) {
      for (let c = 0; c < GW; c++) {
        if (!canPlace(c, r)) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
        rr(ctx, B.x + c * B.cs + 3, B.y + r * B.cs + 3, B.cs - 6, B.cs - 6, 5); ctx.stroke();
      }
    }
  }

  // とどく はんい
  const showT = G.sel;
  if (showT) {
    const x = B.x + (showT.c + 0.5) * B.cs, y = B.y + (showT.r + 0.5) * B.cs;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x, y, tRange(showT) * B.cs, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const tw of G.towers) drawTower(tw, B, t);
  for (const f of G.foes) if (!f.dead && f.hp > 0) drawFoe(f, B);

  // たま
  for (const s of G.shots) {
    const x = B.x + (s.x + 0.5 + (s.tx - s.x) * s.t) * B.cs;
    const y = B.y + (s.y + 0.5 + (s.ty - s.y) * s.t) * B.cs;
    ctx.fillStyle = TOWERS[s.k].col;
    if (s.k === 'laser') {
      ctx.strokeStyle = TOWERS[s.k].col; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(B.x + (s.x + 0.5) * B.cs, B.y + (s.y + 0.5) * B.cs);
      ctx.lineTo(x, y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, B.cs * 0.10, 0, 7); ctx.fill();
    }
  }
  // ばくはつ
  for (const b of G.booms) {
    const k = b.t / 0.34;
    ctx.strokeStyle = 'rgba(255,180,100,' + (1 - k) + ')';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(B.x + (b.x + 0.5) * B.cs, B.y + (b.y + 0.5) * B.cs, b.r * B.cs * (0.4 + k * 0.7), 0, 7);
    ctx.stroke();
  }
  ctx.restore();   // ばんめんの 切りとり ここまで

  drawTop();
  drawPanel(B, t);

  if (G.flashT > 0) {
    ctx.globalAlpha = Math.min(1, G.flashT * 2);
    ctx.fillStyle = 'rgba(30,20,20,0.75)';
    rr(ctx, B.x + B.w / 2 - 130, B.y + B.h - 34, 260, 26, 8); ctx.fill();
    ctx.fillStyle = '#FFC0C0';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.flash, 240, 15, 'bold ');
    ctx.fillText(G.flash, B.x + B.w / 2, B.y + B.h - 21);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(10,20,14,0.55)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText(G.win ? 'まもりきった！' : 'やぶられた…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(10,26,16,0.6)';
  rr(ctx, 8, 6, VW - 16, 40, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  fitFont(G.S.name, VW * 0.24, 16, 'bold ');
  ctx.fillText(G.S.name, 20, 26);

  const x0 = VW * 0.30;
  // ライフ
  ctx.fillStyle = '#FF8FA0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('♥ ' + G.life, x0, 26);
  // おかね
  ctx.fillStyle = '#FFE066';
  ctx.fillText('¥ ' + G.yen, x0 + 88, 26);
  // なみ
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('なみ ' + waveText(), x0 + 200, 26);

  if (!G.waveOn && !G.over) {
    ctx.fillStyle = '#A8F0B0';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('つぎまで ' + Math.ceil(G.restT) + 'びょう', x0 + 288, 26);
  }
  ctx.textAlign = 'left';
}

function drawPanel(B, t) {
  const x = B.x + B.w + 10;
  const w = VW - x - 10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // とうの ボタン（2 × 2）
  const bw = (w - 6) / 2, bh = 52;
  for (let i = 0; i < TKEYS.length; i++) {
    const k = TKEYS[i];
    const T = TOWERS[k];
    const bx = x + (i % 2) * (bw + 6), by = 54 + Math.floor(i / 2) * (bh + 6);
    const on = G.pick === k;
    const poor = G.yen < T.cost;
    const b = button(bx, by, bw, bh, () => {
      G.pick = (G.pick === k) ? null : k;
      G.sel = null;
    });
    ctx.fillStyle = on ? T.col : poor ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.18)';
    rr(ctx, b.x, b.y, b.w, b.h, 9); ctx.fill();
    ctx.strokeStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
    // 小さい 絵
    ctx.save();
    ctx.translate(b.x + 17, b.y + 20);
    ctx.scale(0.42, 0.42);
    ctx.fillStyle = T.col;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, 8, -6, 22, 12, 6); ctx.fill();
    ctx.restore();
    ctx.fillStyle = on ? '#2A2440' : (poor ? 'rgba(255,255,255,0.45)' : '#FFFFFF');
    fitFont(T.name, b.w - 36, 13, 'bold ');
    ctx.fillText(T.name, b.x + 32, b.y + 9);
    ctx.fillStyle = on ? 'rgba(42,36,64,0.8)' : (poor ? '#FF9C9C' : '#FFE066');
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('¥' + T.cost, b.x + 32, b.y + 26);
    ctx.fillStyle = on ? 'rgba(42,36,64,0.7)' : 'rgba(255,255,255,0.55)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(T.air ? 'そらも うてる' : 'じめんだけ', b.x + 6, b.y + 40);
  }

  const y2 = 54 + 2 * (bh + 6) + 8;

  // えらんだ とうの ようす
  if (G.sel) {
    const T = TOWERS[G.sel.k];
    ctx.fillStyle = 'rgba(10,26,16,0.6)';
    rr(ctx, x, y2, w, 92, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    fitFont(T.name + '  レベル ' + G.sel.lv, w - 16, 15, 'bold ');
    ctx.fillText(T.name + '  レベル ' + G.sel.lv, x + 8, y2 + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('つよさ ' + Math.round(tDmg(G.sel)) + '　とどく ' + tRange(G.sel).toFixed(1),
                 x + 8, y2 + 28);
    ctx.fillText(T.about, x + 8, y2 + 44);
    if (G.sel.lv < 3) {
      drawButton(button(x + 8, y2 + 60, w - 16, 26, () => upgrade(G.sel)),
                 'つよくする ¥' + upCost(G.sel), G.yen >= upCost(G.sel) ? '#FFD166' : 'rgba(255,255,255,0.3)');
    } else {
      ctx.fillStyle = '#A8F0B0';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('いちばん つよい！', x + 8, y2 + 64);
    }
  } else if (G.pick) {
    const T = TOWERS[G.pick];
    ctx.fillStyle = 'rgba(10,26,16,0.6)';
    rr(ctx, x, y2, w, 92, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    fitFont(T.name + ' を おく', w - 16, 15, 'bold ');
    ctx.fillText(T.name + ' を おく', x + 8, y2 + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('しかくの ある ところを', x + 8, y2 + 30);
    ctx.fillText('タップしてね', x + 8, y2 + 46);
    ctx.fillText(T.about, x + 8, y2 + 66);
  } else {
    ctx.fillStyle = 'rgba(10,26,16,0.45)';
    rr(ctx, x, y2, w, 92, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('上から とうを えらんで', x + 8, y2 + 12);
    ctx.fillText('草の 上に おこう。', x + 8, y2 + 28);
    ctx.fillText('おいた とうを タップすると', x + 8, y2 + 50);
    ctx.fillText('つよく できるよ。', x + 8, y2 + 66);
  }

  // はやさ と つぎの なみ
  const y3 = y2 + 100;
  drawButton(button(x, y3, (w - 6) / 2, 26, () => { G.speed = G.speed === 1 ? 2 : 1; }),
             G.speed === 1 ? '× 1' : '× 2', G.speed === 2 ? '#FFD166' : 'rgba(255,255,255,0.85)');
  if (!G.waveOn && !G.over) {
    drawButton(button(x + (w - 6) / 2 + 6, y3, (w - 6) / 2, 26, () => callNow()),
               'いま よぶ', '#A8F0B0');
  }
  drawButton(button(x, VH - 40, w, 26, () => { bgmStop(); G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E3A2A'); g.addColorStop(1, '#3A5A46');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('まさきのまもれ！ひみつきち', VW * 0.50, 38, 'bold ');
  ctx.fillText('まさきのまもれ！ひみつきち', 24, 16);
  ctx.fillStyle = '#C8F0D8';
  fitFont('とうを おいて、きちに 来る てきを ぜんぶ たおそう', VW * 0.50, 15);
  ctx.fillText('とうを おいて、きちに 来る てきを ぜんぶ たおそう', 26, 20 + fs + 4);

  // とうの しょうかい
  for (let i = 0; i < TKEYS.length; i++) {
    const T = TOWERS[TKEYS[i]];
    const x = VW - 40 - (TKEYS.length - 1 - i) * 52;
    ctx.fillStyle = T.col;
    ctx.beginPath(); ctx.arc(x, 40 + Math.sin(t * 2 + i) * 4, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, x + 5, 34 + Math.sin(t * 2 + i) * 4, 14, 8, 4); ctx.fill();
  }

  // 12めん（6 × 2）
  const cw = Math.min(112, (VW - 48) / 6), chh = 74;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 6) * cw, cyp = 118 + Math.floor(i / 6) * (chh + 10);
    const op = opened(i), cl = save.clear[i];
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? (cl ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      // みちの かたちを 小さく
      const mp = MAPS[STAGES[i].map];
      const s = (cw - 30) / GW;
      const ox = cxp + 12, oy = cyp + 26;
      ctx.strokeStyle = '#C8AC7C'; ctx.lineWidth = 3.5;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = 0; k < mp.length; k++) {
        const [c, r] = mp[k];
        ctx[k ? 'lineTo' : 'moveTo'](ox + (c + 0.5) * s, oy + (r + 0.5) * s * 0.62);
      }
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + 8, cyp + 5);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(STAGES[i].waves.length + 'なみ', cxp + cw - 16, cyp + 6);
      const bk = save.best['s' + i];
      if (bk) {
        ctx.fillStyle = '#FF8FA0';
        ctx.fillText('♥' + bk + ' のこし', cxp + cw - 16, cyp + chh - 15);
      }
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  const done = save.clear.filter(Boolean).length;
  ctx.fillText('まもりきった めん  ' + done + ' / ' + STAGES.length +
               '　（3回 やぶられると おかねと ♥が ふえて、つぎの めんも あくよ）',
               24, 118 + 2 * (chh + 10) + 8);

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
  ctx.fillStyle = '#1E3A2A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#C8F0D8';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 右の ボタンで とうを えらぶ → 草の 上（しかくが 出る ところ）を タップ',
    '② てきは みちを あるいて きちへ むかう。とうが かってに うつ',
    '③ てきを たおすと おかねが もらえる。とうを ふやしたり つよく したり',
    '④ おいた とうを タップすると「つよくする」ボタンが 出る（レベル3まで）',
    '⑤ きちに 入られると ♥が へる。0に なると まけ',
    '',
    '★ パンチ … 近くを 早く なぐる。安いので さいしょに',
    '★ ばくだん … まとめて どーん。かたまって 来る ときに つよい',
    '★ こおり … おそく する。**そらの てき**にも あたる',
    '★ レーザー … 遠くまで つよい。**そらの てき**にも あたる',
    '',
    'こうもり は そらを とぶので、こおり か レーザー が ないと あたらない！',
    '「いま よぶ」で つぎの なみを 早く よぶと、そのぶん おかねが もらえる',
  ];
  ctx.fillStyle = '#E4F4E8';
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
  fitFont(G.win ? 'まもりきった！' : 'やぶられた…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'まもりきった！' : 'やぶられた…', VW / 2, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 80);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('しのいだ なみ ' + Math.min(G.wave, G.S.waves.length) + ' / ' + G.S.waves.length,
               VW / 2, 112);
  ctx.fillStyle = '#FF8FA0';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('♥ ' + G.life + ' のこり', VW / 2, 140);
  if (!G.win) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    const f = (save.fails['s' + G.stage] || 0);
    ctx.fillText(f >= 3 ? 'てつだうよ。おかねが ふえて ♥も ふえた！'
                        : 'あと ' + (3 - f % 3) + '回 やぶられたら てつだうね',
                 VW / 2, 186);
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
  const x = px / SC, y = py / SC;
  if (G.screen === 'play' && !G.over) {
    const B = bd();
    if (x >= B.x && x < B.x + B.w && y >= B.y && y < B.y + B.h) {
      const c = Math.floor((x - B.x) / B.cs), r = Math.floor((y - B.y) / B.cs);
      const on = G.towers.find((t) => t.c === c && t.r === r);
      if (on) { G.sel = (G.sel === on) ? null : on; G.pick = null; return; }
      if (G.pick) { if (place(c, r, G.pick) && G.yen < TOWERS[G.pick].cost) G.pick = null; return; }
      G.sel = null;
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
  ctx.fillStyle = '#1E3A2A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#C8F0D8';
  ctx.fillText('ちずの よこに とうの ボタンが 出るよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
