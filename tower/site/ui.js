// 画面・そうさ・メインループ。よこ向き専用。
//
// かくのは ぜんぶ「ゲームの 中の 大きさ」（たて VH＝450）で 書いて、
// さいごに 画面の 大きさへ まとめて のばす。どの スマホでも 同じ 見た目。
//
// ゲームの 中の y は「上が プラス」。かく ときに sy() で ひっくり返す。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, SC = 1, VOY = 0, DPR = 1;

// ★ たて長の 画面（スマホを たてに 持った とき）だと よこが せまく なりすぎて、
//   右がわの ボタンや 数字が 画面の 外に 出て しまう。
//   そこで「よこ VW_MIN 以上は かならず 入る」ように 縮尺を きめ、
//   あまった たての ぶんは 上下に 分けて まん中に よせる（レターボックス）。
//   よこ長の ときは これまでと まったく 同じ 見た目に なる。
const VW_MIN = 720;


const ui = { buttons: [] };

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  DPR = dpr;
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  SC = Math.min(H / VH, W / VW_MIN);
  G.VW = W / SC;
  VOY = Math.max(0, (H / SC - VH) / 2);
  G.cx = G.VW / 2;
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, Math.round(dpr * SC * VOY));
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));

// ゲームの y（上がプラス）→ 画面の y（下がプラス）
function sy(y) { return VH - (y - G.camY); }

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
  // ★ 小さい ボタンは ゆびで 当てにくい、と 言われた。どれにも あたらなかった
  //   ときだけ、まわりを 少し ひろげて もう一度 さがす（見た目は そのまま）。
  const need = 40 / (typeof SC === 'number' && SC > 0 ? SC : 1);
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    const mx = Math.max(0, (need - b.w) / 2), my = Math.max(0, (need - b.h) / 2);
    if (!mx && !my) continue;
    if (x >= b.x - mx && x <= b.x + b.w + mx &&
        y >= b.y - my && y <= b.y + b.h + my) return b;
  }
  return null;
}

// --- タワーの 中 ---------------------------------------------------------------

function drawTower(t) {
  const st = STAGES[G.si], VW = G.VW, cx = G.cx;
  const sk = ctx.createLinearGradient(0, 0, 0, VH);
  sk.addColorStop(0, st.sky[0]); sk.addColorStop(1, st.sky[1]);
  ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);

  if (st.stars) {
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % VW;
      const y = ((i * 97 - G.camY * 0.25) % VH + VH) % VH;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * Math.abs(Math.sin(i + t))) + ')';
      ctx.fillRect(x, y, 2.2, 2.2);
    }
  } else {
    // ゆっくり ながれる くも。のぼっている かんじが 出る。
    for (let i = 0; i < 6; i++) {
      const x = ((i * 190 + t * 6) % (VW + 240)) - 120;
      const y = ((i * 260 - G.camY * 0.35) % 1400 + 1400) % 1400 - 400;
      const py = VH - y;
      if (py < -80 || py > VH + 80) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      for (const [dx, dy, r] of [[-36, 6, 22], [0, -6, 30], [38, 4, 20]]) {
        ctx.beginPath(); ctx.arc(x + dx, py + dy, r, 0, 7); ctx.fill();
      }
    }
  }

  // タワーの かべ
  const wl = cx - TOWER_W / 2, wr = cx + TOWER_W / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(wl, 0, TOWER_W, VH);
  ctx.fillStyle = 'rgba(60,50,80,0.30)';
  ctx.fillRect(wl - 14, 0, 14, VH);
  ctx.fillRect(wr, 0, 14, VH);
  // かべの もよう（のぼっている のが わかる ように 目じるしを ながす）
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  const step = 120;
  const first = Math.floor(G.camY / step) * step;
  for (let y = first; y < G.camY + VH + step; y += step) {
    const py = sy(y);
    ctx.fillRect(wl - 14, py - 3, 14, 6);
    ctx.fillRect(wr, py - 3, 14, 6);
  }

  // あしば
  for (const p of G.plats) {
    const py = sy(p.y);
    if (py < -40 || py > VH + 40) continue;
    if (!p.on) {
      if (p.kind !== 'crack' || p.gone > 0.6) continue;
      ctx.globalAlpha = Math.max(0, 1 - p.gone / 0.6);
    }
    const x = cx + p.x - p.w / 2;
    if (p.kind === 'goal') {
      ctx.fillStyle = '#FFD166';
      rr(ctx, x, py, p.w, PLAT_H + 4, 6); ctx.fill();
      ctx.fillStyle = '#FF8FB8';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      fitFont('ゴール！', p.w, 24, 'bold ');
      ctx.fillText('ゴール！', cx + p.x, py - 8);
      ctx.textAlign = 'left';
    } else if (p.kind === 'spring') {
      ctx.strokeStyle = '#5AA8D8'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        ctx.lineTo(x + (p.w * i) / 10, py + 6 + (i % 2 ? -5 : 5));
      }
      ctx.stroke();
      ctx.fillStyle = '#8FE0FF';
      rr(ctx, x, py, p.w, 7, 3); ctx.fill();
    } else {
      const col = p.kind === 'crack' ? '#C8A882'
                : p.kind === 'slip' ? '#A8DCF0'
                : p.kind === 'move' ? '#E8A050' : '#8A6A46';
      const top = p.kind === 'crack' ? '#E0C8A8'
                : p.kind === 'slip' ? '#E4F7FF'
                : p.kind === 'move' ? '#FFC890' : '#B08A5E';
      ctx.fillStyle = col;
      rr(ctx, x, py, p.w, PLAT_H, 5); ctx.fill();
      ctx.fillStyle = top;
      rr(ctx, x, py, p.w, 4, 2); ctx.fill();
      if (p.kind === 'crack') {
        ctx.strokeStyle = 'rgba(90,60,30,0.6)'; ctx.lineWidth = 1.6;
        for (let i = 1; i < 3; i++) {
          const bx = x + (p.w * i) / 3;
          ctx.beginPath(); ctx.moveTo(bx, py); ctx.lineTo(bx + 4, py + PLAT_H); ctx.stroke();
        }
      }
      if (p.kind === 'move') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (const s of [-1, 1]) {
          const ax = cx + p.x + s * (p.w / 2 + 8);
          ctx.beginPath();
          ctx.moveTo(ax + s * 6, py + 6);
          ctx.lineTo(ax, py + 1); ctx.lineTo(ax, py + 11);
          ctx.closePath(); ctx.fill();
        }
      }
      if (p.kind === 'slip') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 24, py + 5, 12, 2.4);
      }
    }
    ctx.globalAlpha = 1;
  }

  // よこかぜ。どっちに ながされているか 見えないと、
  // 「なんで ずれるの？」に なって くやしいだけ。
  if (st.wind) {
    const w = Math.sin(G.t * 0.7);
    const dir = w > 0 ? 1 : -1;
    const strength = Math.abs(w);
    if (strength > 0.25) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (strength * 0.55) + ')';
      ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const wy = ((i * 71 + t * 260 * dir) % VH + VH) % VH;
        const wx = ((t * 420 * dir + i * 130) % (TOWER_W + 200) + TOWER_W + 200)
                   % (TOWER_W + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(cx - TOWER_W / 2 + wx, wy);
        ctx.lineTo(cx - TOWER_W / 2 + wx + dir * 44 * strength, wy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + strength * 0.5) + ')';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(dir > 0 ? 'かぜ →' : '← かぜ', cx, 120);
      ctx.textAlign = 'left';
    }
  }

  // ほし
  for (const s of G.stars) {
    if (s.got) continue;
    const py = sy(s.y);
    if (py < -30 || py > VH + 30) continue;
    drawStar(cx + s.x, py + Math.sin(t * 3 + s.x) * 3, 11, '#FFE066');
  }

  // アイテム
  for (const it of G.items) {
    if (it.got) continue;
    const py = sy(it.y);
    if (py < -30 || py > VH + 30) continue;
    drawTowerItem(it.kind, cx + it.x, py + Math.sin(t * 3.4) * 3);
  }
}

function drawStar(x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr2 = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.2, r * 0.16, 0, 7); ctx.fill();
}

function drawTowerItem(kind, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
  if (kind === 'umbrella') {
    ctx.fillStyle = '#8FD6FF';
    ctx.beginPath(); ctx.arc(0, 2, 14, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#5A9AC8';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 9, 2); ctx.lineTo(i * 9 + 4.5, -3); ctx.lineTo(i * 9 + 9, 2);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#8A6A46'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 14); ctx.stroke();
  } else {
    ctx.fillStyle = '#A8F0B0';
    rr(ctx, -13, -2, 26, 11, 4); ctx.fill();
    rr(ctx, -13, -11, 12, 12, 3); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(14, -6 + i * 6); ctx.lineTo(22, -6 + i * 6); ctx.stroke();
    }
  }
  ctx.restore();
}

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay(t) {
  const cx = G.cx, VW = G.VW;
  const sx = G.shake > 0 ? Math.sin(t * 60) * G.shake * 10 : 0;
  ctx.save();
  ctx.translate(sx, 0);
  drawTower(t);

  // おともだち
  for (const f of G.friends) {
    const py = sy(f.y);
    if (py < -80 || py > VH + 80) continue;
    if (!f.used) {
      // 目立つ わっか。おともだちは とりたい ものだと わかるように。
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx + f.x, py - 26, 32 + Math.sin(t * 4) * 3, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = f.used ? 0.45 : 1;
    drawPerson(ctx, f.who, { x: cx + f.x, y: py, face: 1, vx: 0, vy: 0,
                             onGround: true, squash: Math.sin(t * 3) * 0.06 }, t);
    ctx.globalAlpha = 1;
  }

  // ママ（下から）
  const my = sy(G.mama.y);
  if (my > -140) {
    // 画面の 下より 下に いる ときは 「ここに いるよ」の しるしを 出す
    if (my > VH + 30) {
      const d = Math.round((G.aoi.y - G.mama.y) / 10);
      // 近いほど こく なる。ふりむかなくても 「ヤバい」が つたわる。
      const hot = Math.max(0, Math.min(1, (60 - d) / 45));
      ctx.fillStyle = 'rgba(200,106,168,' + (0.55 + hot * 0.42) + ')';
      rr(ctx, cx - 64, VH - 28, 128, 24, 8); ctx.fill();
      if (hot > 0.5) {
        ctx.strokeStyle = Math.floor(t * 8) % 2 ? '#FFFFFF' : '#FFD166';
        ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('ママ あと ' + d + 'm', 120, 15, 'bold ');
      ctx.fillText('ママ あと ' + d + 'm', cx, VH - 16);
      ctx.textAlign = 'left';
    } else {
      drawPerson(ctx, 'mama', { x: cx + G.mama.x, y: my, face: G.mama.face,
                                vx: 30, vy: 0, onGround: true,
                                squash: Math.sin(t * 9) * 0.10 }, t);
    }
  }

  // あおい
  const a = G.aoi;
  const ay = sy(a.y);
  if (G.umbrella > 0) {
    ctx.fillStyle = '#8FD6FF';
    ctx.beginPath(); ctx.arc(cx + a.x, ay - 62, 26, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#8A6A46'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(cx + a.x, ay - 62); ctx.lineTo(cx + a.x, ay - 46); ctx.stroke();
  }
  drawPerson(ctx, 'aoi', { x: cx + a.x, y: ay, face: a.face, vx: a.vx, vy: a.vy,
                           onGround: a.onGround, squash: a.squash }, t);
  if (G.shoes > 0) {
    ctx.fillStyle = 'rgba(168,240,176,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx + a.x - a.face * (16 + i * 9), ay - 12 - i * 4, 8, 2.4);
    }
  }

  // つぶ
  for (const p of G.puffs) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(cx + p.x, sy(p.y), 6 * (1 - p.t / p.life) + 1, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 出る 文字
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    ctx.fillStyle = p.col;
    fitFont(p.text, p.big ? 380 : 200, p.big ? 26 : 20, 'bold ');
    ctx.strokeStyle = 'rgba(20,10,30,0.75)'; ctx.lineWidth = 5;
    const y = sy(p.y) - p.t * 26;
    ctx.strokeText(p.text, cx + p.x, y); ctx.fillText(p.text, cx + p.x, y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  ctx.restore();

  drawBubble(t);
  drawHUD(t);
  drawPad();
}

// ママの おおきな ふきだし
function drawBubble(t) {
  if (!G.bubble) return;
  const VW = G.VW, b = G.bubble;
  const grow = Math.min(1, b.t / 0.16);
  const fade = b.t > 2.1 ? Math.max(0, (2.6 - b.t) / 0.5) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  const bw = Math.min(VW * 0.72, 430) * grow;
  const bh = 62 * grow;
  // 上に 出す。あおいは 画面の 下のほうに いるので、下に 出すと
  // 本人が ふきだしで かくれて しまう。
  const bx = G.cx - bw / 2, by = 46;
  ctx.fillStyle = '#FFFFFF';
  rr(ctx, bx, by, bw, bh, 18); ctx.fill();
  ctx.strokeStyle = '#C86AA8'; ctx.lineWidth = 4; ctx.stroke();
  // しっぽ（下むき）
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(G.cx - 14, by + bh - 2);
  ctx.lineTo(G.cx + 8, by + bh - 2);
  ctx.lineTo(G.cx - 4, by + bh + 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#C86AA8'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(G.cx - 14, by + bh); ctx.lineTo(G.cx - 4, by + bh + 22);
  ctx.lineTo(G.cx + 8, by + bh); ctx.stroke();
  if (grow > 0.9) {
    ctx.fillStyle = '#C8306A';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(b.text, bw * 0.88, 27, 'bold ');
    ctx.fillText(b.text, G.cx, by + bh / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawHUD(t) {
  const VW = G.VW;
  // のぼった 高さの バー（右がわ・たて）
  const bx = VW - 26, by = 52, bh = VH - 150;
  ctx.fillStyle = 'rgba(20,16,34,0.35)';
  rr(ctx, bx, by, 14, bh, 7); ctx.fill();
  // ママの いち
  const myy = by + bh * (1 - mamaRate());
  ctx.fillStyle = '#C86AA8';
  ctx.beginPath(); ctx.arc(bx + 7, Math.min(by + bh, myy), 8, 0, 7); ctx.fill();
  // あおいの いち
  const ayy = by + bh * (1 - climbRate());
  ctx.fillStyle = '#FF8FB8';
  ctx.beginPath(); ctx.arc(bx + 7, ayy, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(bx + 7, ayy, 4, 0, 7); ctx.fill();
  // ゴールの しるし
  ctx.fillStyle = '#FFD166';
  ctx.fillRect(bx - 4, by - 4, 22, 5);

  // ハート
  for (let i = 0; i < Math.min(6, G.hearts); i++) drawHeart(96 + i * 26, 22, 10);

  // ほし
  ctx.fillStyle = 'rgba(20,16,34,0.4)';
  rr(ctx, VW / 2 - 52, 8, 104, 26, 9); ctx.fill();
  drawStar(VW / 2 - 32, 21, 9, '#FFE066');
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(G.got + ' / ' + G.starTotal, VW / 2 - 18, 22);

  // はじめの あんない。ふきだしと 場所が かぶるので、出す 間は ふきだしを 出さない。
  if (G.t < 3.6) {
    ctx.globalAlpha = Math.min(1, (3.6 - G.t) / 1.2);
    ctx.fillStyle = 'rgba(12,8,24,0.6)';
    const pw = VW * 0.7, ph = 38;
    rr(ctx, VW / 2 - pw / 2, 46, pw, ph, 10); ctx.fill();
    ctx.fillStyle = '#FFF3C4';
    ctx.textAlign = 'center';
    fitFont(stageRule(G.si), pw * 0.94, 19, 'bold ');
    ctx.fillText(stageRule(G.si), VW / 2, 65);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.assist > 0) {
    ctx.fillStyle = 'rgba(255,224,138,0.85)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('やさしく してるよ', VW / 2, VH - 8);
    ctx.textAlign = 'left';
  }

  drawButton(button(10, 8, 68, 26, () => { bgmStop(); G.screen = 'select'; }),
             'やめる', 'rgba(255,255,255,0.8)');
}

function drawHeart(x, y, r) {
  ctx.fillStyle = '#FF7FA8';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 1.35, y - r * 0.1, x - r * 0.55, y - r * 1.05, x, y - r * 0.3);
  ctx.bezierCurveTo(x + r * 0.55, y - r * 1.05, x + r * 1.35, y - r * 0.1, x, y + r * 0.85);
  ctx.fill();
}

// --- そうさ（左右だけ）-----------------------------------------------------------

const IN = { left: false, right: false };

function padScale() { return Math.max(0.66, Math.min(1, G.VW / 820)); }

function padPos() {
  const VW = G.VW, k = padScale();
  return {
    left: { x: 30 + 44 * k, y: VH - 62 * k, r: 44 * k },
    right: { x: VW - 30 - 44 * k, y: VH - 62 * k, r: 44 * k },
  };
}

function drawPad() {
  const p = padPos();
  const bs = [[p.left, '◀', IN.left], [p.right, '▶', IN.right]];
  for (const [b, lab, on] of bs) {
    ctx.fillStyle = on ? '#FFD166' : 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (on ? 0.94 : 1), 0, 7); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.3)' : '#FF8FB8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#3A2A40';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(b.r * 0.85) + 'px system-ui, sans-serif';
    ctx.fillText(lab, b.x, b.y);
  }
  if (G.t < 8) {
    ctx.globalAlpha = Math.min(1, (8 - G.t) / 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(13 * padScale()) + 'px system-ui, sans-serif';
    ctx.fillText('左右だけ！ あしばで かってに はねるよ', G.cx, VH - 52);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function padHit(x, y) {
  const p = padPos();
  for (const k of ['left', 'right']) {
    const b = p[k];
    if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) < (b.r * 1.35) * (b.r * 1.35)) return k;
  }
  // ボタンの 外を さわったら、画面の 左半分／右半分 でも うごく
  return x < G.cx ? 'left' : 'right';
}

const touches = {};

function onDown(id, px, py) {
  const x = px / SC, y = py / SC - VOY;
  const b = hitBtn(px, py);
  if (b) { audioStart(); b.on(); return; }
  if (G.screen !== 'play') { audioStart(); screenTap(); return; }
  const k = padHit(x, y);
  touches[id] = k;
  IN[k] = true;
}
function onUp(id) {
  const k = touches[id];
  if (k) { IN[k] = false; delete touches[id]; }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    onDown(t.identifier, t.clientX - r.left, t.clientY - r.top);
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) onUp(t.identifier);
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  for (const t of e.changedTouches) onUp(t.identifier);
});
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  onDown('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => onUp('m'));

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
  if (G.screen !== 'play' && (e.code === 'Space' || e.code === 'Enter')) {
    audioStart(); screenTap();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function readInput() {
  let mx = 0;
  if (IN.left || keys.ArrowLeft || keys.KeyA) mx -= 1;
  if (IN.right || keys.ArrowRight || keys.KeyD) mx += 1;
  return { mx };
}

// 画面を さわった ときの すすみかた
function screenTap() {
  if (G.screen === 'rule') { startStage(G.pending); return; }
  if (G.screen === 'clear' || G.screen === 'over') return;
  if (G.screen === 'ending') { G.endStep++; if (G.endStep > 3) G.screen = 'title'; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'select'; }
});

// --- タイトル -----------------------------------------------------------------

function bgGrad(a, b) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, VH);
}

function drawTitle(t) {
  const VW = G.VW;
  bgGrad('#5A3A78', '#F0A0C8');
  // うしろの タワー
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(VW * 0.72, 40, 120, VH - 40);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 8; i++) ctx.fillRect(VW * 0.72, 60 + i * 48, 120, 6);

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont('あおいの ハッピータワー', VW * 0.62, 42, 'bold ');
  ctx.fillText('あおいの ハッピータワー', 24, 18);
  ctx.fillStyle = '#FFE8F4';
  fitFont('ママから にげて てっぺんまで！ 全10かい', VW * 0.55, 19);
  ctx.fillText('ママから にげて てっぺんまで！ 全10かい', 24, 66);
  ctx.fillStyle = '#FFF3C4';
  fitFont('のぼった かい ' + clearedCount() + ' / ' + STAGES.length, VW * 0.4, 18, 'bold ');
  ctx.fillText('のぼった かい ' + clearedCount() + ' / ' + STAGES.length, 24, 92);

  // あおいと ママ
  drawPerson(ctx, 'aoi', { x: VW * 0.52, y: VH - 90 + Math.sin(t * 3) * 6, face: 1,
                           vx: 0, vy: 1, onGround: false, squash: 0 }, t);
  drawPerson(ctx, 'mama', { x: VW * 0.52 - 6, y: VH - 22, face: 1,
                            vx: 30, vy: 0, onGround: true, squash: Math.sin(t * 8) * 0.08 }, t);

  const bw = Math.min(VW * 0.34, 300);
  drawButton(button(24, 190, bw, 54, () => {
    G.pending = Math.min(STAGES.length - 1, clearedCount());
    G.screen = 'rule';
  }), 'はじめる', '#FFD166');
  drawButton(button(24, 256, bw * 0.54 - 5, 40, () => { G.screen = 'select'; }),
             'かいを えらぶ', '#A8E0F0');
  drawButton(button(24 + bw * 0.54 + 5, 256, bw * 0.46 - 5, 40, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D0F8');
  drawButton(button(24, 306, bw * 0.62, 36, () => { sfxTest(); }),
             '♪ 音を ためす', 'rgba(255,255,255,0.85)', '#3A2A40', 'ここを おしてね');
  if (save.ending) {
    drawButton(button(24, 350, bw * 0.62, 34, () => { G.screen = 'ending'; G.endStep = 0; }),
               'エンディングを 見る', '#FFC8E0');
  }
  drawButton(button(VW - 150, 12, 138, 34, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.88)', '#33304A');

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  fitFont('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW * 0.7, 14);
  ctx.fillText('音が 出ないときは スマホの よこの スイッチ（消音）を たしかめてね', VW / 2, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto() {
  const VW = G.VW;
  ctx.fillStyle = '#2A1C3A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFB8DC';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 16);
  const lines = [
    '① そうさは **左右だけ**。あしばに つくと かってに はねる',
    '② 下から **ママ** が のぼってくる。つかまると ハートが 1つ へる',
    '③ ハートが 0 に なる まえに **てっぺんの ゴール** へ！',
    '④ あしばは 5しゅるい。うごく／こわれる／すべる／バネ／ふつう',
    '⑤ **ほし** を あつめよう（とらなくても クリアできる）',
    '⑥ **かさ**＝ゆっくり おちる　**くつ**＝はやく うごける（7びょう）',
    '⑦ とちゅうで **おともだち** に 会える。ふれると たすけてくれる',
    '　 まさき＝すごく 高く とばす／パパ＝ママを とめる／りな＝ハート',
    '⑧ 3かい つかまると、つぎの かいが ひらく（先に すすめる）',
    'パソコン: ←→ で うごく',
  ];
  ctx.fillStyle = '#EDE0F4';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 18);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 62 + i * 34);
  });
  drawButton(button(VW - 120, 14, 104, 36, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawSelect() {
  const VW = G.VW;
  ctx.fillStyle = '#2A1C3A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('かいを えらぶ', 20, 12);
  drawButton(button(VW - 120, 10, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#E8D0F8');

  const cols = 5, gap = 10;
  const cw = (VW - 40 - gap * (cols - 1)) / cols;
  const ch = 148;
  for (let i = 0; i < STAGES.length; i++) {
    const c = i % cols, r = (i / cols) | 0;
    const x = 20 + c * (cw + gap), y = 54 + r * (ch + gap);
    const open = stageOpen(i), cleared = !!save.clear['s' + i];
    ctx.fillStyle = !open ? '#3A2E4A' : (i === STAGES.length - 1 ? '#C8407A' : '#4A3A6A');
    rr(ctx, x, y, cw, ch, 12); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = open ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(String(i + 1), x + cw / 2, y + 6);
    if (open) {
      ctx.fillStyle = '#EDE0F4';
      fitFont(STAGES[i].name, cw * 0.9, 12);
      ctx.fillText(STAGES[i].name, x + cw / 2, y + 40);
      if (cleared) {
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText('のぼった！', x + cw / 2, y + 60);
        drawStar(x + cw / 2 - 14, y + 88, 9, '#FFE066');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('x ' + (save.best['s' + i] || 0), x + cw / 2 - 2, y + 82);
        ctx.textAlign = 'center';
      }
      button(x, y, cw, ch, () => { G.pending = i; G.screen = 'rule'; });
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('かぎ', x + cw / 2, y + 62);
    }
  }
  ctx.textAlign = 'left';
}

function drawRule(t) {
  const VW = G.VW, st = STAGES[G.pending];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(20,12,34,0.5)'; ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  fitFont((G.pending + 1) + ' かい目', VW * 0.3, 19, 'bold ');
  ctx.fillText((G.pending + 1) + ' かい目', VW / 2, 16);
  ctx.fillStyle = '#FFFFFF';
  fitFont(st.name, VW * 0.7, 40, 'bold ');
  ctx.fillText(st.name, VW / 2, 38);

  drawFace(ctx, 'aoi', VW / 2 - 130, 142, 32);
  drawFace(ctx, 'mama', VW / 2 + 130, 142, 32);
  ctx.fillStyle = '#FFE066';
  ctx.textBaseline = 'middle';
  fitFont('にげろ！', 110, 26, 'bold ');
  ctx.fillText('にげろ！', VW / 2, 142);

  const pw = VW * 0.8, ph = 74;
  ctx.fillStyle = 'rgba(10,8,22,0.62)';
  rr(ctx, VW / 2 - pw / 2, 192, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = '#FFB8DC'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF3C4';
  const h = '高さ ' + Math.round(st.h / 10) + 'm　ママの はやさ ' + st.mama;
  fitFont(h, pw * 0.92, 19, 'bold ');
  ctx.fillText(h, VW / 2, 216);
  ctx.fillStyle = '#FFD0E0';
  fitFont(stageRule(G.pending), pw * 0.92, 18);
  ctx.fillText(stageRule(G.pending), VW / 2, 246);

  ctx.textAlign = 'left';
  const bw = Math.min(VW * 0.3, 240);
  drawButton(button(VW / 2 - bw / 2, VH - 104, bw, 50, () => { startStage(G.pending); }),
             'のぼる！', '#FFD166');
  drawButton(button(18, 16, 96, 36, () => { G.screen = 'select'; }), 'もどる', '#E8D0F8');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('画面を さわっても はじまるよ', VW * 0.5, 15);
  ctx.fillText('画面を さわっても はじまるよ', VW / 2, VH - 42);
  ctx.textAlign = 'left';
}

function drawResult(t) {
  const VW = G.VW;
  drawTower(t);
  ctx.fillStyle = G.win ? 'rgba(30,14,44,0.90)' : 'rgba(48,16,36,0.90)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFB0C8';
  fitFont(G.win ? 'てっぺんに ついた！' : 'つかまっちゃった…', VW * 0.8, 46, 'bold ');
  ctx.fillText(G.win ? 'てっぺんに ついた！' : 'つかまっちゃった…', VW / 2, 30);

  ctx.fillStyle = '#FFFFFF';
  fitFont(STAGES[G.si].name, VW * 0.5, 21);
  ctx.fillText(STAGES[G.si].name, VW / 2, 88);
  drawFace(ctx, G.win ? 'aoi' : 'mama', VW / 2, 148, 30);

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#EDE0F4';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('あつめた ほし', VW / 2 - 12, 208);
  ctx.fillText('のこり ハート', VW / 2 - 12, 234);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(G.got + ' / ' + G.starTotal, VW / 2 + 12, 208);
  ctx.fillStyle = '#FF9CB8';
  ctx.fillText(String(Math.max(0, G.hearts)), VW / 2 + 12, 234);

  ctx.textAlign = 'center';
  if (G.win && G.si === STAGES.length - 1) {
    ctx.fillStyle = '#FFD166';
    fitFont('タワーを ぜんぶ のぼった！', VW * 0.6, 20, 'bold ');
    ctx.fillText('タワーを ぜんぶ のぼった！', VW / 2, 268);
  } else if (G.justOpened) {
    ctx.fillStyle = '#A8F0B0';
    fitFont('つぎの かいが ひらいたよ', VW * 0.6, 18);
    ctx.fillText('つぎの かいが ひらいたよ', VW / 2, 268);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(VW * 0.26, 200), by = VH - 76;
  const last = G.si === STAGES.length - 1;
  drawButton(button(VW / 2 - bw * 1.55, by, bw, 46, () => { startStage(G.si); }),
             'もう一度', '#FFD166');
  drawButton(button(VW / 2 - bw * 0.5, by, bw, 46, () => { G.screen = 'select'; }),
             'えらぶ', '#E8D0F8');
  if (G.win && last) {
    drawButton(button(VW / 2 + bw * 0.55, by, bw, 46,
                      () => { G.screen = 'ending'; G.endStep = 0; }),
               'エンディング →', '#FFC8E0');
  } else if (G.win || save.skip['s' + G.si]) {
    drawButton(button(VW / 2 + bw * 0.55, by, bw, 46, () => {
      G.pending = Math.min(STAGES.length - 1, G.si + 1); G.screen = 'rule';
    }), 'つぎへ →', '#A8F0B0');
  }
}

// --- エンディング（じつは ゆめだった）--------------------------------------------

const END_TEXT = [
  ['あおい…　あおい、おきなさーい', 'ママの こえで 目が さめた。'],
  ['タワーも、ふきだしも、ぜんぶ ゆめ。', 'あおいは じぶんの ベッドの 中に いた。'],
  ['「へんな ゆめ みちゃった」', 'あおいが わらうと、みんなも わらった。'],
  ['きょうは にちようび。ならいごとは おやすみ。', 'よかったね、あおい。'],
];

function drawEnding(t) {
  const VW = G.VW;
  const step = Math.min(END_TEXT.length - 1, G.endStep || 0);
  // だんだん 朝に なる
  const k = step / (END_TEXT.length - 1);
  const mix = (a, b) => Math.round(a + (b - a) * k);
  bgGrad('rgb(' + mix(42, 255) + ',' + mix(32, 226) + ',' + mix(78, 186) + ')',
         'rgb(' + mix(90, 255) + ',' + mix(70, 246) + ',' + mix(130, 230) + ')');

  // 朝の ひかり
  ctx.fillStyle = 'rgba(255,240,180,' + (0.10 + k * 0.30) + ')';
  ctx.beginPath(); ctx.arc(VW * 0.82, 70, 60 + k * 40, 0, 7); ctx.fill();

  // ベッドの あおい（1〜2まい目）と みんな（3まい目から）
  const gy = VH - 116;
  if (step === 0) {
    drawBed(VW / 2, gy, true, t);
    drawPerson(ctx, 'mama', { x: VW / 2 + 120, y: gy, face: -1, vx: 0, vy: 0,
                              onGround: true, squash: Math.sin(t * 3) * 0.05 }, t);
  } else if (step === 1) {
    drawBed(VW / 2 - 40, gy, false, t);
    drawPerson(ctx, 'aoi', { x: VW / 2 - 40, y: gy - 22, face: 1, vx: 0, vy: 0,
                             onGround: true, squash: Math.sin(t * 3) * 0.05 }, t);
    drawPerson(ctx, 'mama', { x: VW / 2 + 110, y: gy, face: -1, vx: 0, vy: 0,
                              onGround: true, squash: Math.sin(t * 3.2) * 0.05 }, t);
  } else {
    // 4人 そろって にこにこ。さいごの 画面なので すこし 大きく かく。
    ctx.save();
    ctx.translate(VW / 2, VH - 66);
    ctx.scale(1.45, 1.45);
    const who = ['papa', 'mama', 'aoi', 'masaki'];
    who.forEach((k2, i) => {
      drawPerson(ctx, k2, { x: (i - 1.5) * 66, y: 0, face: i < 2 ? 1 : -1, vx: 0, vy: 0,
                            onGround: true, happy: true,
                            squash: Math.sin(t * 3 + i) * 0.06 }, t);
    });
    ctx.restore();
    // ゆか
    ctx.fillStyle = 'rgba(180,140,110,0.35)';
    ctx.fillRect(0, VH - 66, VW, 6);
    // ハートが ふわふわ
    for (let i = 0; i < 5; i++) {
      const hx = VW / 2 + Math.sin(t * 0.8 + i * 1.7) * 190;
      const hy = 200 - ((t * 26 + i * 60) % 220);
      ctx.globalAlpha = 0.55;
      drawHeart(hx, hy + 120, 9);
      ctx.globalAlpha = 1;
    }
  }

  // ことば
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(20,12,30,0.5)';
  const pw = VW * 0.86;
  rr(ctx, VW / 2 - pw / 2, 30, pw, 92, 14); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  fitFont(END_TEXT[step][0], pw * 0.9, 30, 'bold ');
  ctx.fillText(END_TEXT[step][0], VW / 2, 46);
  ctx.fillStyle = '#FFE8F4';
  fitFont(END_TEXT[step][1], pw * 0.9, 21);
  ctx.fillText(END_TEXT[step][1], VW / 2, 88);
  ctx.textAlign = 'left';

  const bw = Math.min(VW * 0.3, 230);
  if (step < END_TEXT.length - 1) {
    drawButton(button(VW - bw - 20, VH - 56, bw, 42,
                      () => { G.endStep = step + 1; }), 'つぎへ →', '#FFD166');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'left';
    fitFont('画面を さわっても すすむよ', VW * 0.4, 13);
    ctx.fillText('画面を さわっても すすむよ', 22, VH - 24);
  } else {
    drawButton(button(VW - bw - 20, VH - 56, bw, 42,
                      () => { G.screen = 'title'; }), 'おしまい', '#FFC8E0');
  }
}

function drawBed(x, y, sleeping, t) {
  ctx.fillStyle = '#8A6A9A';
  rr(ctx, x - 90, y - 34, 180, 38, 8); ctx.fill();
  ctx.fillStyle = '#F0E4F8';
  rr(ctx, x - 84, y - 46, 168, 18, 8); ctx.fill();
  ctx.fillStyle = '#FFB8DC';
  rr(ctx, x - 84, y - 40, 120, 22, 8); ctx.fill();
  if (sleeping) {
    // ふとんから 顔だけ
    ctx.fillStyle = PEOPLE.aoi.skin;
    ctx.beginPath(); ctx.arc(x + 54, y - 50, 15, 0, 7); ctx.fill();
    ctx.fillStyle = PEOPLE.aoi.hair;
    ctx.beginPath(); ctx.arc(x + 54, y - 52, 15.5, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
    ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + 54 + s * 5, y - 48, 3, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
    // Zzz
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const a = (t * 0.8 + i * 0.5) % 3;
      ctx.globalAlpha = Math.max(0, 1 - a / 3);
      ctx.font = 'bold ' + (13 + i * 4) + 'px system-ui, sans-serif';
      ctx.fillText('z', x + 74 + a * 16, y - 70 - a * 22);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

// --- たて画面 -----------------------------------------------------------------

function drawRotate() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2A1C3A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFB8DC';
  ctx.fillText('スマホをたおすと あそべます', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, Math.round(dpr * SC * VOY));
}

// --- ループ -------------------------------------------------------------------


// たて長の ときだけ、下の あいた ところに あんないを 出す
function portraitTip() {
  if (VOY < 26) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('よこ向きに すると 大きく なるよ', G.VW / 2, VH + Math.min(VOY * 0.55, 26));
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

let last = 0, tsec = 0;
function frame(now) {
  portraitTip();
  requestAnimationFrame(frame);
  const dt = Math.min(0.045, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (W < H * 1.15) { drawRotate(); return; }

  if (G.screen === 'play') {
    update(dt, readInput());
    if (G.screen === 'play') drawPlay(tsec);
    else drawResult(tsec);
  } else if (G.screen === 'clear' || G.screen === 'over') drawResult(tsec);
  else if (G.screen === 'select') drawSelect();
  else if (G.screen === 'howto') drawHowto();
  else if (G.screen === 'rule') drawRule(tsec);
  else if (G.screen === 'ending') drawEnding(tsec);
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
