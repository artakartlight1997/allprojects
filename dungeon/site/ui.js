// 画面・そうさ・メインループ。
//
// そうさは 十字ボタン（と パソコンの やじるしキー）。
// ターンせい なので、ボタンを おした ぶんだけ すすむ。
// 見えて いない ところは まっくら、一度 見た ところは うすく のこす。

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

// --- ちずの ばしょ ---------------------------------------------------------------

function view() {
  const panel = 176;
  const w = VW - panel - 20, h = VH - 62;
  // ★ 1マスを 大きく する。小さいと どれが じぶんか わからない。
  const ts = Math.max(18, Math.floor(Math.min(w / 17, h / 11)));
  return { x: 10, y: 52, w, h, ts, cols: Math.floor(w / ts), rows: Math.floor(h / ts) };
}

function cam(V) {
  let cx = G.me.x - (V.cols >> 1), cy = G.me.y - (V.rows >> 1);
  cx = Math.max(0, Math.min(MW - V.cols, cx));
  cy = Math.max(0, Math.min(MH - V.rows, cy));
  return { cx, cy };
}

// --- 絵 -------------------------------------------------------------------------

function drawHero(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const r = s * 0.34;
  ctx.fillStyle = '#FF6A8A';
  rr(ctx, -r * 0.9, r * 0.1, r * 1.8, r * 1.2, r * 0.4); ctx.fill();
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.72, 0, 7); ctx.fill();
  ctx.fillStyle = '#4A3020';
  ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.76, Math.PI * 1.02, Math.PI * 2.02); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.82, r * 0.5, 0, Math.PI, 0, true); ctx.fill();
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-r * 0.26, -r * 0.34, r * 0.1, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.26, -r * 0.34, r * 0.1, 0, 7); ctx.fill();
  ctx.restore();
}

function drawFoe(f, x, y, s) {
  const F = FOES[f.k];
  const r = s * (F.boss ? 0.44 : 0.32);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = f.hit > 0 ? '#FFFFFF' : F.col;
  if (f.k === 'bat') {
    ctx.beginPath(); ctx.ellipse(-r * 1.25, -r * 0.2, r * 0.75, r * 0.4, 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 1.25, -r * 0.2, r * 0.75, r * 0.4, -0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  } else if (f.k === 'armor') {
    rr(ctx, -r, -r, r * 2, r * 2, r * 0.3); ctx.fill();
    ctx.fillStyle = '#2A3040';
    rr(ctx, -r * 0.6, -r * 0.3, r * 1.2, r * 0.4, 2); ctx.fill();
  } else if (f.k === 'mage') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5); ctx.lineTo(r, r); ctx.lineTo(-r, r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.3, 0, 7); ctx.fill();
  } else if (f.k === 'boss') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#8A2020';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.5, -r * 0.8);
      ctx.lineTo(sg * r * 1.0, -r * 1.6);
      ctx.lineTo(sg * r * 0.1, -r * 1.0);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = f.hit > 0 ? '#FFFFFF' : F.col;
    ctx.beginPath(); ctx.ellipse(r * 1.2, r * 0.2, r * 0.6, r * 0.35, 0.4, 0, 7); ctx.fill();
  } else if (f.k === 'gob') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * r * 0.7, -r * 0.3);
      ctx.lineTo(sg * r * 1.5, -r * 0.7);
      ctx.lineTo(sg * r * 0.75, r * 0.2);
      ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.quadraticCurveTo(r, r * 0.9, 0, r * 0.9);
    ctx.quadraticCurveTo(-r, r * 0.9, -r, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.1, r * 0.14, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.1, r * 0.14, 0, 7); ctx.fill();
  // たいりょく
  if (f.hp < f.max) {
    const bw = r * 2.2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rr(ctx, -bw / 2, -r - 8, bw, 4, 2); ctx.fill();
    const k = Math.max(0, f.hp / f.max);
    ctx.fillStyle = k > 0.5 ? '#7FD86A' : k > 0.22 ? '#FFD166' : '#FF6A6A';
    rr(ctx, -bw / 2, -r - 8, bw * k, 4, 2); ctx.fill();
  }
  ctx.restore();
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  ctx.fillStyle = '#150F20';
  ctx.fillRect(0, 0, VW, VH);
  const V = view();
  const C = cam(V);

  for (let ry = 0; ry < V.rows; ry++) {
    for (let rx = 0; rx < V.cols; rx++) {
      const mx = C.cx + rx, my = C.cy + ry;
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
      if (!G.seen[my][mx]) continue;
      const x = V.x + rx * V.ts, y = V.y + ry * V.ts;
      const on = G.lit[my][mx];
      const cell = G.m[my][mx];
      if (cell === WALL) {
        ctx.fillStyle = on ? '#4A3A56' : '#2A2036';
        ctx.fillRect(x, y, V.ts, V.ts);
        ctx.fillStyle = on ? '#5A4868' : '#332944';
        ctx.fillRect(x + 1, y + 1, V.ts - 2, V.ts * 0.42);
      } else {
        ctx.fillStyle = on ? '#3A3348' : '#241E30';
        ctx.fillRect(x, y, V.ts, V.ts);
        ctx.fillStyle = on ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(x + 1, y + 1, V.ts - 2, V.ts - 2);
      }
      if (cell === STAIR) {
        ctx.fillStyle = on ? '#FFD166' : '#8A7038';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 3 + i * 3, y + V.ts - 5 - i * (V.ts - 10) / 3,
                       V.ts - 6 - i * 6, (V.ts - 10) / 3);
        }
      }
    }
  }

  // どうぐ
  for (const it of G.items) {
    if (!G.lit[it.y][it.x]) continue;
    const x = V.x + (it.x - C.cx) * V.ts, y = V.y + (it.y - C.cy) * V.ts;
    if (x < V.x - V.ts || y < V.y - V.ts) continue;
    ctx.fillStyle = ITEMS[it.k].col;
    ctx.beginPath();
    ctx.arc(x + V.ts / 2, y + V.ts / 2, V.ts * 0.24, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // てき
  for (const f of G.foes) {
    if (!G.lit[f.y][f.x]) continue;
    drawFoe(f, V.x + (f.x - C.cx) * V.ts + V.ts / 2, V.y + (f.y - C.cy) * V.ts + V.ts / 2, V.ts);
  }
  // りな。★ てきと まざって 見うしなわない ように、足もとに 光る わを つける。
  {
    const hx = V.x + (G.me.x - C.cx) * V.ts + V.ts / 2;
    const hy = V.y + (G.me.y - C.cy) * V.ts + V.ts / 2;
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = 'rgba(255,230,102,' + (0.45 + k * 0.4) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(hx, hy + V.ts * 0.28, V.ts * 0.40, 0, 7); ctx.stroke();
    drawHero(hx, hy, V.ts);
  }

  // ダメージの 数字
  for (const a of G.anim) {
    const x = V.x + (a.x - C.cx) * V.ts + V.ts / 2;
    const y = V.y + (a.y - C.cy) * V.ts + V.ts / 2 - a.t * 26;
    ctx.globalAlpha = Math.max(0, 1 - a.t / 0.8);
    ctx.fillStyle = a.me ? '#FF8FA0' : '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(String(a.n), x, y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  drawTop();
  drawPanel(V);

  if (G.over) {
    ctx.fillStyle = 'rgba(10,6,16,0.6)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FF8FA0';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'ドラゴンを たおした！' : 'ちからつきた…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  const me = G.me;
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, 8, 6, VW - 16, 38, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('ちか ' + G.depth + 'かい', 20, 25);
  ctx.fillStyle = '#C8B8E8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('レベル ' + me.lv, 108, 25);

  // たいりょくの ぼう
  const bx = 178, bw = Math.min(220, VW * 0.28);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, bx, 15, bw, 16, 8); ctx.fill();
  const k = Math.max(0, me.hp / me.max);
  ctx.fillStyle = k > 0.5 ? '#7FD86A' : k > 0.25 ? '#FFD166' : '#FF6A6A';
  rr(ctx, bx, 15, Math.max(5, bw * k), 16, 8); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(me.hp + ' / ' + me.max, bx + bw / 2, 23);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD166';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('こうげき ' + me.atk + '　まもり ' + me.def, bx + bw + 14, 25);

  drawButton(button(VW - 76, 10, 68, 28, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');
}

function drawPanel(V) {
  const x = V.x + V.w + 10;
  const w = VW - x - 10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // もちもの
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, x, 52, w, 132, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('もちもの（おすと つかう）', x + 8, 58);
  for (let i = 0; i < 8; i++) {
    const bx = x + 8 + (i % 2) * ((w - 22) / 2 + 6), by = 76 + Math.floor(i / 2) * 26;
    const k = G.me.bag[i];
    const bw = (w - 22) / 2;
    if (k) {
      const b = button(bx, by, bw, 23, () => useItem(i));
      ctx.fillStyle = ITEMS[k].col;
      rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.fillStyle = '#2A2028';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(ITEMS[k].name, bw * 0.9, 12, 'bold ');
      ctx.fillText(ITEMS[k].name, b.x + b.w / 2, b.y + 12);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.4;
      rr(ctx, bx, by, bw, 23, 6); ctx.stroke();
    }
  }

  // ログ
  ctx.fillStyle = 'rgba(30,20,44,0.75)';
  rr(ctx, x, 190, w, 88, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < G.log.length; i++) {
    ctx.fillStyle = i === G.log.length - 1 ? '#FFE066' : 'rgba(255,255,255,0.6)';
    fitFont(G.log[i], w - 16, 12);
    ctx.fillText(G.log[i], x + 8, 196 + i * 16);
  }

  // 十字ボタン
  const pad = Math.min(w, 150), px = x + (w - pad) / 2, py = VH - pad - 8;
  const c = pad / 3;
  const dirs = [[1, 0, -1, '↑'], [0, 1, 1, '←'], [2, 1, 1, '→'], [1, 2, 1, '↓']];
  const dd = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  for (let i = 0; i < 4; i++) {
    const d = dirs[i];
    const b = button(px + d[0] * c, py + d[1] * c, c - 3, c - 3, () => act(dd[i][0], dd[i][1]));
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(c * 0.45) + 'px system-ui, sans-serif';
    ctx.fillText(d[3], b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  // まん中は「まつ」
  const b = button(px + c, py + c, c - 3, c - 3, () => act(0, 0));
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(c * 0.26) + 'px system-ui, sans-serif';
  ctx.fillText('まつ', b.x + b.w / 2, b.y + b.h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#241838'); g.addColorStop(1, '#4A2A50');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('りなのふしぎダンジョン', VW * 0.46, 40, 'bold ');
  ctx.fillText('りなのふしぎダンジョン', 24, 16);
  ctx.fillStyle = '#E8C8F8';
  fitFont('1マス あるくと、てきも 1回 うごく。ちか 10かいを めざそう', VW * 0.52, 15);
  ctx.fillText('1マス あるくと、てきも 1回 うごく。ちか 10かいを めざそう', 26, 20 + fs + 4);

  for (let i = 0; i < FKEYS.length; i++) {
    drawFoe({ k: FKEYS[i], hp: 1, max: 1, hit: 0 },
            VW - 44 - (FKEYS.length - 1 - i) * 50, 44 + Math.sin(t * 2 + i) * 4, 46);
  }

  // すすみぐあい
  ctx.fillStyle = 'rgba(30,20,44,0.6)';
  rr(ctx, 24, 106, Math.min(VW - 48, 660), 96, 12); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('いちばん ふかく もぐった かい　ちか ' + save.best + ' かい', 40, 120);
  ctx.fillStyle = save.clear ? '#FFE066' : 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(save.clear ? 'ドラゴンを たおした ことが ある！（' + save.wins + '回）'
                          : 'ちか ' + FLOORS + 'かいの ドラゴンを たおすと クリア', 40, 144);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('もぐった かず ' + save.plays + '　ちからつきた かず ' + save.deaths, 40, 168);

  // はじめる ボタン
  drawButton(button(24, 224, 200, 52, () => startRun(1)),
             'ちか 1かいから', '#FFD166');
  if (save.check > 1) {
    drawButton(button(240, 224, 240, 52, () => startRun(save.check)),
               'ちか ' + save.check + 'かいから', '#8FD6FF', '#123048',
               'ふかくまで もぐった ごほうび');
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('★ 5かいごとに「その かいから はじめられる」ように なるよ', 24, 292);
  ctx.fillText('★ ちからつきても、ふかくまで もぐった ぶんは のこる', 24, 314);

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
  ctx.fillStyle = '#1E1430'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#E8C8F8';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 右下の 十字ボタン（パソコンは やじるしキー）で 1マスずつ すすむ',
    '② てきの いる ほうへ すすむと こうげき。1マス あるくと てきも 1回 うごく',
    '③ 金いろの **かいだん**に のると つぎの かいへ。ちか 10かいに ドラゴン',
    '④ おちている どうぐを ひろって、右の ボタンで つかう',
    '⑤ てきを たおすと レベルが 上がって、たいりょくが ぜんぶ もどる',
    '',
    '★ あぶなく なったら「まつ」で ようすを 見るのも 手',
    '★ コウモリは 1ターンに 2回 うごく。まほうつかいは はなれていても うつ',
    '★ よろい は かたいので、かみなりの まき が よく きく',
    '',
    'ちからつきても、5かいごとの ところから やりなおせる。',
    'さいしょから やりなおしには ならないよ',
  ];
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 50 + i * 27);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FF8FA0';
  fitFont(G.win ? 'クリア！' : 'ちからつきた…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : 'ちからつきた…', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('ちか ' + G.depth + ' かい　レベル ' + G.me.lv, VW / 2, 88);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('いちばん ふかく もぐった かい　ちか ' + save.best + ' かい', VW / 2, 122);
  if (!G.win) {
    ctx.fillStyle = '#8FD6FF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('ちか ' + save.check + ' かいから やりなおせるよ', VW / 2, 152);
  }
  ctx.textAlign = 'left';

  const bw = Math.min(180, VW * 0.24);
  drawButton(button(VW / 2 - bw - 100, VH - 60, bw, 42, () => startRun(save.check)),
             'ちか ' + save.check + 'かいから', '#FFD166');
  drawButton(button(VW / 2 - bw / 2, VH - 60, bw, 42, () => startRun(1)),
             'ちか 1かいから', '#E8D0F8');
  drawButton(button(VW / 2 + 100, VH - 60, bw, 42, () => { G.screen = 'title'; }),
             'タイトルへ', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
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

const KEYD = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  Space: [0, 0], Period: [0, 0],
};
window.addEventListener('keydown', (e) => {
  const d = KEYD[e.code];
  if (!d) return;
  e.preventDefault();
  if (G.screen === 'play') act(d[0], d[1]);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') bgmStop();
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
  ctx.fillStyle = '#1E1430'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#E8C8F8';
  ctx.fillText('ちずの よこに もちものが 出るよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
