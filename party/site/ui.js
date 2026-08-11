// 画面・そうさ・メインループ。よこ向きが おすすめだが たて向きでも あそべる。
//
// 4人が 1だいを かこむので、画面を 人数ぶんに わけて、
// 向かいがわの 人の ばしょは **180度 まわして** かく。
// まん中に 出す ものは 文字を つかわず、まる・色・わっか だけに する
// （文字は どちらかの 人から さかさまに なって しまうため）。

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
  // みじかい ほうを 450 に そろえる。よこ向きでも たて向きでも
  // 1人ぶんの ばしょが つぶれない ように。
  if (H > W) { VW = 450; SC = W / VW; VH = H / SC; }
  else { VH = 450; SC = H / VH; VW = W / SC; }
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

// --- 人ごとの ばしょ ------------------------------------------------------------
//
// rot が 1 の 人は 向かいがわ。その人の ばしょは 180度 まわして かく。
//   2人 … 下（そのまま）と 上（さかさま）
//   3人 … 下を 左右に わけて 2人、上に 1人
//   4人 … 4すみ

function zones(n) {
  const hw = VW / 2, hh = VH / 2;
  if (n <= 2) {
    return [{ x: 0, y: hh, w: VW, h: hh, rot: 0 },
            { x: 0, y: 0, w: VW, h: hh, rot: 1 }];
  }
  if (n === 3) {
    return [{ x: 0, y: hh, w: hw, h: hh, rot: 0 },
            { x: hw, y: hh, w: hw, h: hh, rot: 0 },
            { x: 0, y: 0, w: VW, h: hh, rot: 1 }];
  }
  return [{ x: 0, y: hh, w: hw, h: hh, rot: 0 },
          { x: hw, y: hh, w: hw, h: hh, rot: 0 },
          { x: 0, y: 0, w: hw, h: hh, rot: 1 },
          { x: hw, y: 0, w: hw, h: hh, rot: 1 }];
}

function zoneOf(n, x, y) {
  const zs = zones(n);
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return i;
  }
  return -1;
}

// その人の むきで かく。中は (0,0)〜(w,h) の ざひょうに なる。
function drawInZone(z, fn) {
  ctx.save();
  if (z.rot) {
    ctx.translate(z.x + z.w, z.y + z.h);
    ctx.rotate(Math.PI);
  } else {
    ctx.translate(z.x, z.y);
  }
  fn(z.w, z.h);
  ctx.restore();
}

// --- あそんでいる 画面 ----------------------------------------------------------

function drawPlay(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A1E4A'); g.addColorStop(1, '#4A2A5A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  const zs = zones(G.n);
  for (let i = 0; i < G.n; i++) drawZone(zs[i], i, t);

  // わけめ の 線
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, VH / 2); ctx.lineTo(VW, VH / 2);
  if (G.n >= 3) { ctx.moveTo(VW / 2, VH / 2); ctx.lineTo(VW / 2, VH); }
  if (G.n >= 4) { ctx.moveTo(VW / 2, 0); ctx.lineTo(VW / 2, VH / 2); }
  ctx.stroke();

  drawCenter(t);

  // ラウンドの まえだけ、まん中に「やめる」を 出す。
  // あそんでいる とちゅうは、まちがって おさない ように 出さない。
  if (G.phase === 'how') {
    const b = button(VW / 2 - 30, VH / 2 - 18, 60, 36, () => { bgmStop(); G.screen = 'title'; });
    ctx.fillStyle = 'rgba(20,12,34,0.75)';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(VW / 2 - 9, VH / 2 - 9); ctx.lineTo(VW / 2 + 9, VH / 2 + 9);
    ctx.moveTo(VW / 2 + 9, VH / 2 - 9); ctx.lineTo(VW / 2 - 9, VH / 2 + 9);
    ctx.stroke();
  }
}

// まん中の あいず。**文字は つかわない**（どちらかの 人から さかさまに なる）。
function drawCenter(t) {
  const cx = VW / 2, cy = VH / 2;
  const m = G.m, mini = G.mini;

  if (G.phase === 'count') {
    const left = Math.max(0, Math.ceil(3 - G.ph));
    const k = 1 - ((3 - G.ph) % 1);
    ctx.fillStyle = 'rgba(20,12,34,0.75)';
    ctx.beginPath(); ctx.arc(cx, cy, 62, 0, 7); ctx.fill();
    ctx.strokeStyle = mini.col; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 54, -1.57, -1.57 + k * 6.283); ctx.stroke();
    // かずは 「まる の かず」で 見せる（文字は つかわない）
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < left; i++) {
      ctx.beginPath(); ctx.arc(cx - (left - 1) * 11 + i * 22, cy, 8, 0, 7); ctx.fill();
    }
    return;
  }
  if (G.phase !== 'play') return;

  if (mini.key === 'react' || mini.key === 'hold') {
    const go = m.phase === 'go';
    const ready = mini.key === 'hold' && m.phase === 'ready';
    ctx.fillStyle = go ? '#FFE066' : ready ? 'rgba(200,138,232,0.55)' : 'rgba(20,12,34,0.7)';
    ctx.beginPath(); ctx.arc(cx, cy, go ? 76 : 56, 0, 7); ctx.fill();
    if (go) {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx, cy, 76, 0, 7); ctx.stroke();
      // びっくり マーク（左右たいしょうなので さかさまでも 読める）
      ctx.fillStyle = '#C84A20';
      rr(ctx, cx - 8, cy - 34, 16, 40, 8); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + 20, 9, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, 56, 0, 7); ctx.stroke();
    }
    return;
  }

  if (mini.key === 'timing') {
    const k = Math.max(0, 1 - m.t / m.at);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.stroke();
    if (k > 0) {
      ctx.strokeStyle = mini.col; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(cx, cy, 26 + k * 74, 0, 7); ctx.stroke();
    } else {
      const a = Math.max(0, 1 - (m.t - m.at) / 0.5);
      ctx.fillStyle = 'rgba(255,224,102,' + a + ')';
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.fill();
    }
    return;
  }

  if (mini.key === 'color') {
    ctx.fillStyle = 'rgba(20,12,34,0.6)';
    ctx.beginPath(); ctx.arc(cx, cy, 66, 0, 7); ctx.fill();
    if (m.live && m.cur >= 0) {
      ctx.fillStyle = PCOL[m.cur];
      ctx.beginPath(); ctx.arc(cx, cy, 56, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(cx - 16, cy - 16, 14, 0, 7); ctx.fill();
    }
    return;
  }

  if (mini.key === 'mash') {
    // のこり時間の わっか
    const k = Math.max(0, 1 - G.t / mini.len);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, 44, 0, 7); ctx.stroke();
    ctx.strokeStyle = mini.col; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, 44, -1.57, -1.57 + k * 6.283); ctx.stroke();
  }
}

function drawZone(z, i, t) {
  const key = G.who[i], col = PCOL[i];
  const on = G.down[i];
  drawInZone(z, (w, h) => {
    // ボタン（ばしょ ぜんたいが ボタン）
    const lit = zoneLit(i);
    ctx.fillStyle = lit ? col : 'rgba(255,255,255,0.06)';
    rr(ctx, 6, 6, w - 12, h - 12, 16); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = on ? 7 : 4;
    ctx.stroke();
    if (on) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      rr(ctx, 6, 6, w - 12, h - 12, 16); ctx.fill();
    }

    // かお と なまえ と てんすう（下に そろえる ＝ その人から 見て 手前）
    const fy = h - 34;
    drawFace(ctx, key, 34, fy, 20);
    // ★ じぶんの 色の まる。「いろあわせ」で まん中に 出るのは この 色。
    //   かおの 中の 色は **キャラの 色**（りな＝きいろ など）で、人の 色とは ちがう。
    //   だから 色は かおに かさねず、よこに はっきり 出す。
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(50, fy + 15, 12, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(20,12,34,0.55)'; ctx.lineWidth = 3;
    ctx.stroke();
    // 光っている ときは 下じきが その色に なるので、字は こい色に する
    ctx.fillStyle = lit ? 'rgba(26,16,44,0.92)' : '#FFFFFF';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const nm = G.names[i];
    const nw = fitFont(nm, w * 0.3, 17, 'bold ');
    ctx.fillText(nm, 66, fy - 10);
    // CPU は ひと目で わかるように ふだを つける
    if (G.cpu[i]) {
      const tx = 70 + ctx.measureText(nm).width;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = lit ? 'rgba(26,16,44,0.55)' : 'rgba(255,255,255,0.55)';
      ctx.fillText('CPU', tx, fy - 10 + (nw > 14 ? 1 : 0));
    }
    ctx.fillStyle = lit ? 'rgba(26,16,44,0.75)' : col;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(G.pts[i] + 'てん', 66, fy + 12);

    // ラウンド中の じょうたい
    zoneInfo(i, w, h);
  });
}

// その人の ばしょを 光らせるか
function zoneLit(i) {
  if (G.phase !== 'play') return false;
  const m = G.m, k = G.mini.key;
  if (k === 'react') return m.phase === 'go' && m.got[i] < 0 && !m.foul[i];
  if (k === 'hold') return m.phase === 'go' && m.got[i] < 0 && !m.foul[i];
  if (k === 'color') return m.live && m.cur === i;
  return false;
}

// その人の ばしょに 出す おしらせ（その人の むきで かかれる）
function zoneInfo(i, w, h) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = w / 2, cy = h * 0.42;

  if (G.phase === 'how') {
    ctx.fillStyle = G.mini.col;
    fitFont(G.mini.name, w * 0.8, 30, 'bold ');
    ctx.fillText(G.mini.name, cx, cy - 22);
    ctx.fillStyle = '#FFF3C4';
    fitFont(G.mini.how.replace(/\*\*/g, ''), w * 0.9, 16);
    ctx.fillText(G.mini.how.replace(/\*\*/g, ''), cx, cy + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    fitFont('おすと はじまる', w * 0.5, 13);
    ctx.fillText('おすと はじまる', cx, cy + 30);
    ctx.textAlign = 'left';
    return;
  }
  if (G.phase === 'result') {
    const p = G.last[i];
    ctx.fillStyle = p >= 3 ? '#FFE066' : p >= 1 ? '#FFFFFF' : 'rgba(255,255,255,0.55)';
    fitFont('+' + p, w * 0.3, 34, 'bold ');
    ctx.fillText('+' + p, cx, cy);
    if (p >= 3) {
      ctx.fillStyle = '#FFE066';
      fitFont('1い！', w * 0.4, 18, 'bold ');
      ctx.fillText('1い！', cx, cy + 28);
    }
    ctx.textAlign = 'left';
    return;
  }
  if (G.phase !== 'play') { ctx.textAlign = 'left'; return; }

  const m = G.m, k = G.mini.key;
  ctx.fillStyle = '#FFFFFF';
  if (k === 'mash') {
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(String(m.n[i]), cx, cy);
  } else if (k === 'color') {
    // 光っている ときは 下じきが 自分の 色。白字だと 読みにくいので こい色に する。
    ctx.fillStyle = zoneLit(i) ? 'rgba(26,16,44,0.9)'
                  : m.pt[i] >= 0 ? '#FFFFFF' : '#FF9C9C';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText((m.pt[i] > 0 ? '+' : '') + m.pt[i], cx, cy);
  } else if (k === 'react' || k === 'hold') {
    if (m.foul[i]) {
      ctx.fillStyle = '#FF9C9C';
      fitFont(k === 'hold' ? 'はやく はなした！' : 'フライング！', w * 0.6, 20, 'bold ');
      ctx.fillText(k === 'hold' ? 'はやく はなした！' : 'フライング！', cx, cy);
    } else if (m.got[i] >= 0) {
      ctx.fillStyle = '#FFE066';
      fitFont(m.got[i].toFixed(2) + 'びょう', w * 0.6, 22, 'bold ');
      ctx.fillText(m.got[i].toFixed(2) + 'びょう', cx, cy);
    } else if (k === 'hold' && m.phase === 'ready') {
      ctx.fillStyle = G.down[i] ? '#A8F0B0' : '#FFF3C4';
      fitFont(G.down[i] ? 'おしてる！' : 'おしっぱなしに して', w * 0.8, 18, 'bold ');
      ctx.fillText(G.down[i] ? 'おしてる！' : 'おしっぱなしに して', cx, cy);
    }
  } else if (k === 'timing') {
    if (m.err[i] < 99) {
      ctx.fillStyle = m.err[i] < 0.12 ? '#FFE066' : '#FFFFFF';
      fitFont((m.err[i] < 0.12 ? 'ぴったり！ ' : 'ずれ ') + m.err[i].toFixed(2),
              w * 0.7, 20, 'bold ');
      ctx.fillText((m.err[i] < 0.12 ? 'ぴったり！ ' : 'ずれ ') + m.err[i].toFixed(2), cx, cy);
    }
  }
  ctx.textAlign = 'left';
}

// --- タイトル -----------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A1E4A'); g.addColorStop(1, '#7A3A6A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  for (let i = 0; i < 26; i++) {
    const x = ((i * 173 + t * 22) % (VW + 80)) - 40;
    const y = (i * 91) % VH;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, 7); ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('みんなでパーティ', VW * 0.5, 50, 'bold ');
  ctx.fillText('みんなでパーティ', 28, 20);
  ctx.fillStyle = '#FFD9F0';
  fitFont('1だいの まわりに あつまって、2〜4人で 同時に あそぶ', VW * 0.56, 18);
  ctx.fillText('1だいの まわりに あつまって、2〜4人で 同時に あそぶ', 30, 22 + fs + 6);

  // 人数
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('なん人で あそぶ？', 30, 108);
  for (let k = 2; k <= 4; k++) {
    const bx = 28 + (k - 2) * 82;
    const on = save.n === k;
    const b = button(bx, 130, 74, 40, () => { save.n = k; storeSave(); });
    ctx.fillStyle = on ? '#FFD166' : 'rgba(255,255,255,0.16)';
    rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = on ? 3 : 2; ctx.stroke();
    ctx.fillStyle = on ? '#3A2A08' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(k + '人', b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ラウンド数
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('なんかい しょうぶ？', 30, 186);
  for (let k = 0; k < 3; k++) {
    const n = [3, 5, 7][k];
    const bx = 28 + k * 82;
    const on = save.rounds === n;
    const b = button(bx, 208, 74, 36, () => { save.rounds = n; storeSave(); });
    ctx.fillStyle = on ? '#8FD6FF' : 'rgba(255,255,255,0.16)';
    rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = on ? 3 : 2; ctx.stroke();
    ctx.fillStyle = on ? '#123048' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(n + 'かい', b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // だれで あそぶか。1れつ ずつ「かお → 名前 → 人／CPU」。
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('だれで あそぶ？', 30, 258);
  // ボタンの ぶんの よこはばを のこして、人数で わける
  const leftW = VW - Math.min(VW * 0.3, 260) - 64;
  const cw = Math.min(84, Math.max(58, leftW / save.n));
  for (let i = 0; i < save.n; i++) {
    const bx = 28 + i * cw, w = cw - 8;

    // かお（おすと キャラが かわる）
    const b = button(bx, 276, w, 58, () => {
      save.who[i] = (save.who[i] + 1) % PICKS.length;
      storeSave();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 4; ctx.stroke();
    drawFace(ctx, PICKS[save.who[i]], b.x + b.w / 2, b.y + 29, 19);

    // 名前（おすと キーボードが 出る）
    const nb = button(bx, 338, w, 22, () => openName(i, bx, 338, w, 22));
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, nb.x, nb.y, nb.w, nb.h, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = save.names[i] ? '#FFFFFF' : 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(slotName(i), nb.w * 0.86, 13, 'bold ');
    ctx.fillText(slotName(i), nb.x + nb.w / 2, nb.y + nb.h / 2);

    // 人／CPU
    const isC = !!save.cpu[i];
    const cb = button(bx, 364, w, 22, () => { save.cpu[i] = !save.cpu[i]; storeSave(); });
    ctx.fillStyle = isC ? 'rgba(255,209,102,0.85)' : 'rgba(143,214,255,0.85)';
    rr(ctx, cb.x, cb.y, cb.w, cb.h, 6); ctx.fill();
    ctx.fillStyle = '#2A2440';
    fitFont(isC ? 'CPU' : '人', cb.w * 0.8, 13, 'bold ');
    ctx.fillText(isC ? 'CPU' : '人', cb.x + cb.w / 2, cb.y + cb.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // CPU の つよさ（CPU が 1人でも いる ときだけ）
  if (save.cpu.slice(0, save.n).some((x) => x)) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('CPUの つよさ', 30, 392);
    for (let k = 0; k < 3; k++) {
      const on = save.cpuLv === k;
      const b = button(112 + k * 62, 388, 58, 22, () => { save.cpuLv = k; storeSave(); });
      ctx.fillStyle = on ? '#FFD166' : 'rgba(255,255,255,0.16)';
      rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.strokeStyle = on ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = on ? 2 : 1.5; ctx.stroke();
      ctx.fillStyle = on ? '#3A2A08' : '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(CPU_LV[k].name, b.w * 0.86, 13, 'bold ');
      ctx.fillText(CPU_LV[k].name, b.x + b.w / 2, b.y + b.h / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  const bw = Math.min(VW * 0.3, 260);
  drawButton(button(VW - bw - 28, VH - 110, bw, 56, () => { startMatch(); }),
             'はじめる', '#FFD166');
  drawButton(button(VW - bw - 28, VH - 46, bw * 0.55, 34, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D0F8');
  drawButton(button(VW - bw * 0.42 - 28, VH - 46, bw * 0.42, 34, () => { sfxTest(); }),
             '♪ 音', 'rgba(255,255,255,0.85)');
  drawButton(button(VW - 150, 12, 138, 34, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');

  // したの ほうが あいていたら（たて向きなど）、あそびかたの 絵を おく
  drawAroundPic(420, VH - 140);

  drawTurnHint();

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, 28, VH - 6);
}

function drawHowto() {
  ctx.fillStyle = '#241838'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD9F0';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① スマホや タブレットを **たいらに おいて**、まわりに あつまる',
    '② 画面が 人数ぶんに わかれる。**じぶんの ばしょ**が じぶんの ボタン',
    '③ 上がわの 人には 字が さかさまに ならない よう、まわして 出るよ',
    '④ ミニゲームは 5しゅるい。1いは 3てん、2いは 2てん、3いは 1てん',
    '⑤ ぜんぶ おわって いちばん てんすうが 多い人が ゆうしょう！',
    '',
    'はやおし　… まん中が ひかったら すぐ おす（フライングは まけ）',
    'れんだ　　… 5びょうで たくさん おす',
    'ぴったり　… わっかが きえる しゅんかんに おす',
    'いろあわせ… まん中が じぶんの 色の ときだけ おす',
    'ながおし　… おしっぱなし → ひかったら すぐ はなす',
  ];
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 17);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 56 + i * 32);
  });
  drawButton(button(VW - 120, 12, 104, 36, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawOver(t) {
  bg();
  // ゆうしょうの 人を まん中に、みんなの てんすうを ならべる
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFE066';
  fitFont(G.winner >= 0 ? 'ゆうしょう！' : 'ひきわけ！', VW * 0.5, 44, 'bold ');
  ctx.fillText(G.winner >= 0 ? 'ゆうしょう！' : 'ひきわけ！', VW / 2, 18);

  if (G.winner >= 0) {
    drawFace(ctx, G.who[G.winner], VW / 2, 116, 38);
    ctx.fillStyle = PCOL[G.winner];
    fitFont(G.names[G.winner], VW * 0.4, 30, 'bold ');
    ctx.fillText(G.names[G.winner], VW / 2, 158);
    // かんむり
    ctx.fillStyle = '#FFD166';
    ctx.beginPath();
    ctx.moveTo(VW / 2 - 26, 82); ctx.lineTo(VW / 2 + 26, 82);
    ctx.lineTo(VW / 2 + 26, 60); ctx.lineTo(VW / 2 + 13, 72);
    ctx.lineTo(VW / 2, 56); ctx.lineTo(VW / 2 - 13, 72);
    ctx.lineTo(VW / 2 - 26, 60); ctx.closePath(); ctx.fill();
  }

  const place = ranking();
  const cw = Math.min(150, (VW - 60) / G.n);
  for (let i = 0; i < G.n; i++) {
    const x = VW / 2 - (cw * G.n) / 2 + i * cw + cw / 2;
    const y = 214;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    rr(ctx, x - cw / 2 + 5, y, cw - 10, 108, 12); ctx.fill();
    ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 3; ctx.stroke();
    drawFace(ctx, G.who[i], x, y + 30, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fitFont(G.names[i] + (G.cpu[i] ? '(CPU)' : ''), cw * 0.8, 14, 'bold ');
    ctx.fillText(G.names[i] + (G.cpu[i] ? '(CPU)' : ''), x, y + 54);
    ctx.fillStyle = PCOL[i];
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(G.pts[i] + 'てん', x, y + 72);
    ctx.fillStyle = ['#FFE066', '#D8D8E8', '#E8A868', 'rgba(255,255,255,0.5)'][place[i]];
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText((place[i] + 1) + 'い', x, y + 94);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(VW * 0.26, 210);
  drawButton(button(VW / 2 - bw - 8, VH - 52, bw, 42, () => { startMatch(); }),
             'もう一度', '#FFD166');
  drawButton(button(VW / 2 + 8, VH - 52, bw, 42, () => { G.screen = 'title'; }),
             'さいしょへ', '#E8D0F8');
}

// --- 名前を 入れる --------------------------------------------------------------
//
// キャンバスに じぶんで 字を 打つ しくみを 作ると、日本語の 入力（かな漢字）が
// つかえない。ブラウザの input を その ばしょに かさねて 出す ほうが かくじつ。

const nameIn = document.getElementById('nameIn');
let nameFor = -1;

function openName(i, x, y, w, h) {
  // べつの 名前を 入れている とちゅうなら、さきに それを しまう。
  // （キャンバスを おしても blur は おきない ように して あるため）
  if (nameFor >= 0 && nameFor !== i) closeName();
  nameFor = i;
  const r = canvas.getBoundingClientRect();
  nameIn.style.display = 'block';
  nameIn.style.left = (r.left + x * SC) + 'px';
  nameIn.style.top = (r.top + y * SC) + 'px';
  nameIn.style.width = (w * SC) + 'px';
  nameIn.style.height = (h * SC) + 'px';
  nameIn.style.fontSize = Math.max(11, Math.round(h * SC * 0.6)) + 'px';
  nameIn.value = save.names[i] || '';
  nameIn.placeholder = slotName(i);
  nameIn.focus();
  nameIn.select();
}

function closeName() {
  if (nameFor < 0) return;
  save.names[nameFor] = nameIn.value.trim().slice(0, 6);
  storeSave();
  nameFor = -1;
  nameIn.style.display = 'none';
  nameIn.blur();
}

nameIn.addEventListener('blur', closeName);
nameIn.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter' || e.key === 'Escape') closeName();
});

// --- そうさ（4本の ゆびを どうじに 見る）-----------------------------------------

const touchOwner = {};      // touch の id → だれの ばしょか

function down(id, px, py) {
  audioStart();
  if (G.screen !== 'play') {
    const b = hitBtn(px, py);
    if (b) b.on();
    return;
  }
  // あそびかたを 見ている あいだだけ、まん中の「やめる」が おせる
  if (G.phase === 'how') {
    const b = hitBtn(px, py);
    if (b) { b.on(); return; }
  }
  const i = zoneOf(G.n, px / SC, py / SC);
  if (i >= 0) { touchOwner[id] = i; playerDown(i); }
}
function up(id) {
  const i = touchOwner[id];
  if (i === undefined) return;
  delete touchOwner[id];
  // 同じ 人の ゆびが まだ のこって いないか
  let still = false;
  for (const k in touchOwner) if (touchOwner[k] === i) still = true;
  if (!still) playerUp(i);
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) down(t.identifier, t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) up(t.identifier);
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
  for (const t of e.changedTouches) up(t.identifier);
});
canvas.addEventListener('mousedown', (e) => {
  // ★ preventDefault を しないと、この あと ブラウザが キャンバスに
  //   フォーカスを うつして、いま ひらいた 名前の はこが すぐ blur して
  //   とじて しまう（名前が 入れられない）。
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => up('m'));

// パソコンで ためす とき用。1P=Z 2P=X 3P=N 4P=M
const KEYP = { KeyZ: 0, KeyX: 1, KeyN: 2, KeyM: 3 };
window.addEventListener('keydown', (e) => {
  if (e.repeat || nameFor >= 0) return;
  if (KEYP[e.code] !== undefined) { e.preventDefault(); audioStart(); playerDown(KEYP[e.code]); }
});
window.addEventListener('keyup', (e) => {
  if (KEYP[e.code] !== undefined) playerUp(KEYP[e.code]);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); G.screen = 'title'; }
});

// --- たて画面 -----------------------------------------------------------------

// 1だいを かこんで あそぶ ようす の 絵。あいた ところにだけ かく。
function drawAroundPic(y0, y1) {
  const hgt = y1 - y0;
  if (hgt < 160) return;
  const cy = (y0 + y1) / 2, cx = VW / 2;
  const tw = Math.min(VW * 0.42, 180), th = tw * 0.66;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, cx - tw / 2, cy - th / 2, tw, th, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  // 中を 4つに わけて 人の 色を おく
  for (let i = 0; i < save.n; i++) {
    const z = zones(save.n)[i];
    const rx = cx - tw / 2 + (z.x / VW) * tw + 3;
    const ry = cy - th / 2 + (z.y / VH) * th + 3;
    ctx.fillStyle = PCOL[i];
    rr(ctx, rx, ry, (z.w / VW) * tw - 6, (z.h / VH) * th - 6, 6); ctx.fill();
  }
  // まわりに すわる 人
  for (let i = 0; i < save.n; i++) {
    // その人の ばしょの まん中の 上（または 下）に すわらせる
    const z = zones(save.n)[i];
    const fx = cx - tw / 2 + ((z.x + z.w / 2) / VW) * tw;
    const fy = cy + (z.rot ? -1 : 1) * (th / 2 + 30);
    drawFace(ctx, PICKS[save.who[i]], fx, fy, 20);
    ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(fx, fy, 23, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitFont('1だいを かこんで、じぶんの ばしょを おす', VW * 0.8, 14);
  ctx.fillText('1だいを かこんで、じぶんの ばしょを おす', cx, cy + th / 2 + 60);
  ctx.textAlign = 'left';
}

// たて向きでも あそべる が、よこ向きの ほうが 1人ぶんが 大きい。
// じゃまに ならない ように、タイトルに 小さく 出すだけに する。
function drawTurnHint() {
  if (H <= W) return;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  fitFont('よこ向きに すると もっと 大きく あそべるよ', VW * 0.9, 15);
  ctx.fillText('よこ向きに すると もっと 大きく あそべるよ', VW / 2, VH - 130);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- ループ -------------------------------------------------------------------

let last = 0, tsec = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.045, (now - last) / 1000 || 0);
  last = now;
  tsec += dt;
  ui.buttons = [];

  if (G.screen === 'play') { update(dt); drawPlay(tsec); }
  else if (G.screen === 'over') drawOver(tsec);
  else if (G.screen === 'howto') drawHowto();
  else drawTitle(tsec);
}

layout();
requestAnimationFrame(frame);
