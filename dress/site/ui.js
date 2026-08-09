// 画面・そうさ・メインループ。
//
// キャラクターは「体 → ふく → かみ → かざり」の 順に かさねて 描く。
// この 順で かかないと、ふくが かみの 上に 出て しまう。

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
  rr(ctx, b.x, b.y, b.w, b.h, Math.min(14, b.h * 0.28)); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = textCol || '#3A2038';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = fitFont(label, b.w * 0.88, b.h * (sub ? 0.34 : 0.44), 'bold ');
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - (sub ? fs * 0.5 : 0));
  if (sub) {
    ctx.fillStyle = 'rgba(58,32,56,0.72)';
    fitFont(sub, b.w * 0.9, b.h * 0.26);
    ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + fs * 0.85);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function hitBtn(px, py) {
  const x = px / SC, y = py / SC;
  for (let i = ui.buttons.length - 1; i >= 0; i--) {
    const b = ui.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// --- キャラクター ------------------------------------------------------------------

// s = 身長（画面の ピクセル）。(x, y) は 足もと。
// ★ 中の 絵は 頭の てっぺんが -150、足もとが 0。だから 155 で わると
//   s が そのまま 身長に なる。
function drawGirl(x, y, s, p, t) {
  const u = s / 155;
  const bob = Math.sin(t * 1.8) * u * 1.4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(u, u);

  const hair = HAIR[p.hair], hairC = HAIR_PAL[p.hairCol] || hair.col;
  const wear = WEAR[p.wear], wearC = PALETTE[p.wearCol] || wear.col;
  const shoes = SHOES[p.shoes], shoesC = PALETTE[p.shoesCol] || shoes.col;
  const item = ITEM[p.item], itemC = PALETTE[p.itemCol] || item.col;

  // うしろがみ。★ 頭は y=-104 に あるので、その まわりに 出す。
  //   前は 体の 高さに あって、はねの ように 見えて いた。
  ctx.fillStyle = hairC;
  if (hair.k === 'long') {
    ctx.beginPath(); ctx.ellipse(0, -92, 27, 40, 0, 0, 7); ctx.fill();
  } else if (hair.k === 'curl') {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(-22 + i * 11, -80 + (i % 2) * 7, 11, 0, 7); ctx.fill();
    }
  } else if (hair.k === 'twin') {
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(sg * 30, -104, 10, 24, sg * 0.25, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sg * 26, -120, 7, 0, 7); ctx.fill();
    }
  } else if (hair.k === 'pony') {
    ctx.beginPath(); ctx.ellipse(26, -100, 9, 24, -0.35, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(22, -118, 7, 0, 7); ctx.fill();
  }

  // あし
  ctx.strokeStyle = '#F6CFAC'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sg * 8, -26); ctx.lineTo(sg * 9, -8); ctx.stroke();
  }
  // くつ
  ctx.fillStyle = shoesC;
  for (const sg of [-1, 1]) {
    if (shoes.k === 'boots' || shoes.k === 'winter') {
      rr(ctx, sg * 9 - 8, -26, 16, 26, 5); ctx.fill();
    } else if (shoes.k === 'sandal') {
      rr(ctx, sg * 9 - 9, -7, 18, 6, 3); ctx.fill();
      ctx.strokeStyle = shoesC; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sg * 9 - 6, -8); ctx.lineTo(sg * 9 + 5, -16); ctx.stroke();
    } else {
      rr(ctx, sg * 9 - 9, -11, 19, 11, 5); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60,40,60,0.3)'; ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // ふく
  ctx.fillStyle = wearC;
  ctx.strokeStyle = 'rgba(60,30,55,0.32)'; ctx.lineWidth = 2.2;
  if (wear.k === 'dress' || wear.k === 'party' || wear.k === 'kimono') {
    ctx.beginPath();
    ctx.moveTo(-16, -76);
    ctx.lineTo(16, -76);
    ctx.lineTo(wear.k === 'party' ? 42 : 30, -26);
    ctx.quadraticCurveTo(0, -18, wear.k === 'party' ? -42 : -30, -26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (wear.k === 'kimono') {                  // おび
      ctx.fillStyle = '#FFD166';
      rr(ctx, -20, -56, 40, 9, 3); ctx.fill();
    }
    if (wear.k === 'party') {                   // きらきら
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(-22 + i * 11, -38 + (i % 2) * 6, 2.6, 0, 7); ctx.fill();
      }
    }
  } else if (wear.k === 'coat' || wear.k === 'raincoat') {
    rr(ctx, -22, -78, 44, 46, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, -3, -78, 6, 46, 3); ctx.fill();
    if (wear.k === 'raincoat') {                // フード
      ctx.fillStyle = wearC;
      ctx.beginPath(); ctx.arc(0, -80, 20, Math.PI, 0); ctx.fill();
    }
  } else {
    rr(ctx, -19, -76, 38, 40, 7); ctx.fill(); ctx.stroke();
    if (wear.k === 'jersey') {
      ctx.strokeStyle = '#FF7A6A'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-19, -62); ctx.lineTo(19, -62); ctx.stroke();
    }
    if (wear.k === 'sweater') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-19, -68 + i * 10); ctx.lineTo(19, -68 + i * 10); ctx.stroke();
      }
    }
    // スカート
    ctx.fillStyle = wearC;
    ctx.beginPath();
    ctx.moveTo(-19, -40); ctx.lineTo(19, -40); ctx.lineTo(26, -24);
    ctx.quadraticCurveTo(0, -18, -26, -24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,55,0.32)'; ctx.lineWidth = 2.2; ctx.stroke();
  }

  // うで
  ctx.strokeStyle = '#F6CFAC'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-18, -70); ctx.lineTo(-27, -44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -70); ctx.lineTo(27, -44); ctx.stroke();
  ctx.lineCap = 'butt';

  // マフラー（ふくの 上）
  if (item.k === 'muffler') {
    ctx.fillStyle = itemC;
    rr(ctx, -20, -84, 40, 11, 5); ctx.fill();
    rr(ctx, 6, -80, 10, 26, 4); ctx.fill();
  }

  // かお
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, -104, 24, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,100,90,0.3)'; ctx.lineWidth = 1.6; ctx.stroke();
  // 目
  ctx.fillStyle = '#3A2A34';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * 8, -104, 3.4, 4.8, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.arc(sg * 8 - 1.2, -106, 1.4, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,140,160,0.5)';
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * 15, -98, 5, 3.4, 0, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#8A5A48'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -97, 4.5, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.lineCap = 'butt';

  // まえがみ
  ctx.fillStyle = hairC;
  ctx.beginPath(); ctx.arc(0, -110, 25, Math.PI * 1.0, Math.PI * 2.0); ctx.fill();
  if (hair.k === 'short' || hair.k === 'bob') {
    ctx.beginPath(); ctx.ellipse(-22, -102, 7, 14, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, -102, 7, 14, -0.2, 0, 7); ctx.fill();
  }
  if (hair.k === 'bob' || hair.k === 'long' || hair.k === 'curl') {
    ctx.beginPath(); ctx.ellipse(-23, -96, 8, 18, 0.15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(23, -96, 8, 18, -0.15, 0, 7); ctx.fill();
  }

  // あたまの かざり
  if (item.k === 'ribbon') {
    ctx.fillStyle = itemC;
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(16 + sg * 8, -126, 8, 6, sg * 0.5, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(16, -126, 3.4, 0, 7); ctx.fill();
  } else if (item.k === 'cap') {
    ctx.fillStyle = itemC;
    ctx.beginPath(); ctx.arc(0, -122, 24, Math.PI, 0); ctx.fill();
    rr(ctx, 0, -124, 34, 7, 3); ctx.fill();
  } else if (item.k === 'straw') {
    ctx.fillStyle = itemC;
    ctx.beginPath(); ctx.ellipse(0, -122, 40, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -126, 20, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FF7A6A';
    rr(ctx, -20, -126, 40, 5, 2); ctx.fill();
  } else if (item.k === 'crown') {
    ctx.fillStyle = itemC;
    ctx.beginPath();
    ctx.moveTo(-18, -124);
    ctx.lineTo(-12, -140); ctx.lineTo(-6, -128); ctx.lineTo(0, -144);
    ctx.lineTo(6, -128); ctx.lineTo(12, -140); ctx.lineTo(18, -124);
    ctx.closePath(); ctx.fill();
  } else if (item.k === 'umbrella') {
    ctx.strokeStyle = '#8A6A5A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(34, -48); ctx.lineTo(34, -104); ctx.stroke();
    ctx.fillStyle = itemC;
    ctx.beginPath(); ctx.arc(34, -104, 30, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(34, -104); ctx.lineTo(34 + i * 14, -104 + Math.abs(i) * 3 + 8); ctx.stroke();
    }
  }
  ctx.restore();
}

// --- はいけい ---------------------------------------------------------------------

function drawBack(bi, t) {
  const B = BACK[bi] || BACK[0];
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, B.sky[0]); g.addColorStop(1, B.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (B.k === 'night') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 30; i++) {
      const x = ((i * 173) % (VW - 20)) + 10, y = ((i * 97) % 260) + 10;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + i));
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF3C8';
    ctx.beginPath(); ctx.arc(VW - 80, 70, 26, 0, 7); ctx.fill();
  } else if (B.k === 'park') {
    ctx.fillStyle = '#7FC96A';
    ctx.fillRect(0, VH - 90, VW, 90);
    ctx.fillStyle = '#4A8A3A';
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * (VW / 4);
      ctx.beginPath(); ctx.arc(x, VH - 150, 34, 0, 7); ctx.fill();
      ctx.fillStyle = '#8A5A3A';
      ctx.fillRect(x - 6, VH - 130, 12, 46);
      ctx.fillStyle = '#4A8A3A';
    }
  } else if (B.k === 'sea') {
    ctx.fillStyle = '#2A8AC0';
    ctx.fillRect(0, VH - 120, VW, 120);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, VH - 100 + i * 24 + Math.sin(x * 0.05 + t * 1.6 + i) * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#F0E0B0';
    ctx.fillRect(0, VH - 40, VW, 40);
  } else if (B.k === 'snow') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, VH - 80, VW, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 149 + t * 18) % (VW + 20)) - 10;
      const y = ((i * 83 + t * 42) % VH);
      ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#E8B8CC';
    ctx.fillRect(0, VH - 100, VW, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    rr(ctx, 40, 50, 120, 90, 10); ctx.fill();
    rr(ctx, VW - 170, 50, 120, 90, 10); ctx.fill();
  }
}

// --- あそんでいる 画面 -----------------------------------------------------------

const TABS = [
  ['hair', 'かみ'], ['wear', 'ふく'], ['shoes', 'くつ'], ['item', 'かざり'], ['back', 'ばしょ'],
];

function drawPlay(t) {
  const p = G.pick;
  drawBack(p.back, t);

  // キャラクター
  const gx = VW * 0.30, gy = VH - 42;
  drawGirl(gx, gy, Math.min(320, VH * 0.78), p, t);

  // きらきら
  for (const s of G.sparkle) {
    ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
    ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(gx + s.x, gy - 120 + s.y, 3.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawPanel(t);
  drawTop();
}

function drawPanel(t) {
  const x = Math.max(VW * 0.52, VW - 380), w = VW - x - 12;
  ctx.fillStyle = 'rgba(58,32,56,0.75)';
  rr(ctx, x, 44, w, VH - 100, 14); ctx.fill();

  // タブ
  const tw = (w - 16) / TABS.length;
  for (let i = 0; i < TABS.length; i++) {
    const b = button(x + 8 + i * tw, 52, tw - 4, 28, ((k) => () => { G.tab = k; sfxTap(); })(TABS[i][0]));
    ctx.fillStyle = G.tab === TABS[i][0] ? '#FF8FBB' : 'rgba(255,255,255,0.15)';
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.fillStyle = G.tab === TABS[i][0] ? '#3A2038' : 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(TABS[i][1], b.w - 6, 14, 'bold ');
    ctx.fillText(TABS[i][1], b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // なかみ
  const list = curList(G.tab);
  const cur = curIndex(G.tab);
  const cols = w > 300 ? 3 : 2;
  const cw = (w - 20) / cols, chh = 46;
  for (let i = 0; i < list.length; i++) {
    const bx = x + 10 + (i % cols) * cw, by = 90 + Math.floor(i / cols) * (chh + 6);
    const b = button(bx, by, cw - 6, chh, ((k) => () => setIndex(G.tab, k))(i));
    ctx.fillStyle = i === cur ? '#FFD166' : 'rgba(255,255,255,0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 9); ctx.fill();
    ctx.fillStyle = i === cur ? '#3A2038' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(list[i].name, b.w - 10, 14, 'bold ');
    ctx.fillText(list[i].name, b.x + b.w / 2, b.y + b.h / 2 - 6);
    if (list[i].tags && list[i].tags.length) {
      ctx.fillStyle = i === cur ? 'rgba(58,32,56,0.75)' : 'rgba(255,255,255,0.6)';
      fitFont(list[i].tags.join('・'), b.w - 10, 10);
      ctx.fillText(list[i].tags.join('・'), b.x + b.w / 2, b.y + b.h / 2 + 11);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // 色
  if (G.tab !== 'back') {
    const cy = 90 + Math.ceil(list.length / cols) * (chh + 6) + 8;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('いろ', x + 12, cy);
    const ccur = curColIndex(G.tab);
    const pal = G.tab === 'hair' ? HAIR_PAL : PALETTE;
    const sw = Math.min(30, (w - 24) / pal.length);
    for (let i = 0; i < pal.length; i++) {
      const b = button(x + 12 + i * (sw + 2), cy + 16, sw, sw, ((k) => () => setCol(G.tab, k))(i));
      ctx.fillStyle = pal[i];
      rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
      ctx.strokeStyle = i === ccur ? '#FFFFFF' : 'rgba(0,0,0,0.25)';
      ctx.lineWidth = i === ccur ? 3 : 1.5;
      rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.stroke();
    }
  }

  drawButton(button(x + 10, VH - 100, w - 20, 34, () => finish()),
             G.mode === 'free' ? 'この コーデを おぼえる' : 'かんせい！', '#8FF0C0');
}

function drawTop() {
  ctx.fillStyle = 'rgba(58,32,56,0.7)';
  rr(ctx, 8, 6, VW - 16, 32, 10); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const title = G.mode === 'free' ? 'じゆうモード' : G.Q.name;
  fitFont(title, VW * 0.26, 16, 'bold ');
  ctx.fillText(title, 20, 22);
  if (G.mode === 'quest') {
    ctx.fillStyle = '#FFE066';
    fitFont('ほしい かんじ … ' + G.Q.want.join('・'), VW * 0.38, 15, 'bold ');
    ctx.fillText('ほしい かんじ … ' + G.Q.want.join('・'), VW * 0.30, 22);
  }
  ctx.textBaseline = 'top';
  drawButton(button(VW - 96, 8, 88, 28, () => { bgmStop(); G.screen = 'title'; }),
             'やめる', 'rgba(255,255,255,0.85)');

  if (G.msgT > 0 && G.msg) {
    ctx.globalAlpha = Math.min(1, G.msgT * 1.6);
    const fs = fitFont(G.msg, VW * 0.44, 16, 'bold ');
    const w = ctx.measureText(G.msg).width + 28;
    ctx.fillStyle = 'rgba(58,32,56,0.82)';
    rr(ctx, 16, VH - 50, Math.min(w, VW * 0.5), 34, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    ctx.fillText(G.msg, 30, VH - 33);
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
  }
}

// --- けっか ----------------------------------------------------------------------

function drawResult(t) {
  const R = G.result;
  drawBack(G.pick.back, t);
  ctx.fillStyle = 'rgba(58,32,56,0.55)';
  ctx.fillRect(0, 0, VW, VH);
  drawGirl(VW * 0.28, VH - 40, Math.min(320, VH * 0.78), G.pick, t);
  for (const s of G.sparkle) {
    ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
    ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(VW * 0.28 + s.x, VH - 160 + s.y, 3.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  const x = VW * 0.52;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  fitFont(G.Q.name, VW * 0.42, 24, 'bold ');
  ctx.fillText(G.Q.name, x, 30);
  // 星
  for (let i = 0; i < 3; i++) {
    const on = i < R.star;
    ctx.fillStyle = on ? '#FFE066' : 'rgba(255,255,255,0.25)';
    const cx = x + 26 + i * 56, cy = 96;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 24;
      ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('ほしかった かんじ … ' + R.want.join('・'), x, 140);
  ctx.fillStyle = '#8FF0C0';
  ctx.fillText('えらべた … ' + (R.hit.length ? R.hit.join('・') : 'なし'), x, 166);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  fitFont('コーデの かんじ … ' + (R.got.length ? R.got.join('・') : 'とくに なし'), VW * 0.44, 14);
  ctx.fillText('コーデの かんじ … ' + (R.got.length ? R.got.join('・') : 'とくに なし'), x, 192);
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(R.star === 3 ? 'ばっちり！ よく 考えたね' :
               R.star === 2 ? 'いいね！ もう ひとつ 合わせられるかも' :
               'うーん、この ばしょに 合う ふくを さがして みよう', x, 224);

  // ★ 3つ ならべても はみ出さない はばに する
  const avail = VW - x - 12;
  const bw = Math.min(150, (avail - 20) / 3);
  const nx = G.quest + 1;
  if (nx < QUESTS.length) {
    drawButton(button(x, VH - 60, bw, 42, () => startQuest(nx)), 'つぎの お題', '#FFD166');
  }
  drawButton(button(x + bw + 10, VH - 60, bw, 42, () => startQuest(G.quest)), 'もう一度', '#8FD6FF');
  drawButton(button(x + (bw + 10) * 2, VH - 60, bw, 42, () => { G.screen = 'title'; }),
             'えらぶ', 'rgba(255,255,255,0.85)');
}

// --- タイトル --------------------------------------------------------------------

function drawTitle(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#6A2E52'); g.addColorStop(1, '#3A2038');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  const demo = { hair: (Math.floor(t / 2) % HAIR.length), hairCol: 0,
                 wear: (Math.floor(t / 1.5) % WEAR.length), wearCol: (Math.floor(t / 3) % PALETTE.length),
                 shoes: (Math.floor(t / 2.5) % SHOES.length), shoesCol: 5,
                 item: (Math.floor(t / 1.8) % ITEM.length), itemCol: 1, back: 0 };
  drawGirl(VW - 130, VH - 30, 300, demo, t);

  let y = 16;
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('ゆいのきせかえサロン', VW * 0.44, 40, 'bold ');
  ctx.fillText('ゆいのきせかえサロン', 24, y);
  y += fs + 8;
  ctx.fillStyle = '#FFE8F4';
  const ss = fitFont('すきに 着せかえよう。お題に 合わせると 星が もらえる', VW * 0.5, 15);
  ctx.fillText('すきに 着せかえよう。お題に 合わせると 星が もらえる', 26, y);
  y += ss + 14;

  drawButton(button(24, y, 210, 46, () => startFree()), 'じゆうモード', '#FFD166', '#3A2038', 'すきに 着せかえる');
  y += 58;

  const cols = 2;
  const cw = Math.min(210, (VW * 0.6 - 24 - 10) / cols), chh = 42;
  for (let i = 0; i < QUESTS.length; i++) {
    const x = 24 + (i % cols) * (cw + 10), yy = y + Math.floor(i / cols) * (chh + 6);
    if (yy + chh > VH - 50) break;
    const open = i < save.open;
    const b = button(x, yy, cw, chh, open ? () => startQuest(i) : null);
    ctx.fillStyle = open ? (save.star[i] ? '#8FF0C0' : '#FF9FC0') : 'rgba(255,255,255,0.14)';
    rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.fillStyle = open ? '#3A2038' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fitFont(open ? QUESTS[i].name : '？？？', cw - 60, 14, 'bold ');
    ctx.fillText(open ? QUESTS[i].name : '？？？', b.x + 10, b.y + b.h / 2);
    if (open) {
      const st = save.star[i] || 0;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#FFB000';
      ctx.textAlign = 'right';
      ctx.fillText('★'.repeat(st) + '☆'.repeat(3 - st), b.x + cw - 8, b.y + b.h / 2);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  drawButton(button(VW - 236, VH - 42, 108, 30, () => { G.screen = 'howto'; }), 'あそびかた', '#E8D0F8');
  drawButton(button(VW - 120, VH - 42, 100, 30, () => { sfxTest(); }), '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'bottom';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('v' + GAME_VER, 24, VH - 8);
  ctx.textBaseline = 'top';
}

function drawHowto(t) {
  ctx.fillStyle = '#3A2038'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#FFE8F4';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 右の「かみ・ふく・くつ・かざり・ばしょ」から えらぶ',
    '② 下の 色を おすと 色が 変わる',
    '③ お題モードは、その ばしょに 合う ふくを えらぶと 星が ふえる',
  ].concat(TIPS);
  ctx.fillStyle = '#FFF0F8';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.62, 15);
    ctx.fillText(s, 24, 52 + i * 26);
  });
  drawGirl(VW - 110, VH - 30, 280, { hair: 2, hairCol: 0, wear: 2, wearCol: 4, shoes: 2, shoesCol: 0, item: 4, itemCol: 1, back: 0 }, t);
  drawButton(button(VW - 250, 12, 100, 32, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

// --- そうさ ----------------------------------------------------------------------

function tapAt(px, py) {
  audioStart();
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const t = e.changedTouches[0];
  tapAt(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('mousedown', (e) => {
  const r = canvas.getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});

// --- メインループ ----------------------------------------------------------------

let last = 0, tsec = 0;

function frame(ms) {
  const now = ms / 1000;
  let dt = last ? now - last : 0;
  last = now;
  dt = Math.min(0.05, dt);
  tsec += dt;

  update(dt);

  ui.buttons = [];
  if (G.screen === 'title') drawTitle(tsec);
  else if (G.screen === 'howto') drawHowto(tsec);
  else if (G.screen === 'result') drawResult(tsec);
  else drawPlay(tsec);

  requestAnimationFrame(frame);
}

layout();
requestAnimationFrame(frame);
