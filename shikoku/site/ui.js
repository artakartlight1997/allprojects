// 画面・そうさ・メインループ。
//
// 大きく「地図」と「まだ はめて いない かけら」の 2つ。
// かけらを ひっぱって 地図の 上で はなす。

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

// --- 地図の ばしょ ---------------------------------------------------------------

function mapBox() {
  // ★ その面で つかう 県だけで 大きさを 合わせる。
  //   いつも 沖縄まで 入れて 計算すると、沖縄を つかわない 面で
  //   九州が 小さく なって しまう。
  const B = bounds(G.list && G.list.length ? G.list : PREFS);
  // かけらの たなが 出ている ときだけ 右を あける
  const needTray = G.bag && G.bag.length;
  const left = 20, right = VW - (needTray ? 210 : 20);
  const top = 46, bot = VH - 50;
  const aw = right - left, ah = bot - top;
  const w0 = B.x1 - B.x0, h0 = B.y1 - B.y0;
  // ★ まわる めんでは たてと よこが 入れかわる。
  //   まわす まえの 大きさで あわせると、まわした とたん はみ出す。
  const spin = G.S && G.S.spin;
  const s = spin ? Math.min(aw, ah) / Math.max(w0, h0)
                 : Math.min(aw / w0, ah / h0);
  const w = w0 * s, h = h0 * s;
  const ox = left + (aw - w) / 2 - B.x0 * s;
  const oy = top + (ah - h) / 2 - B.y0 * s;
  return { s, ox, oy, w, h, x: left + (aw - w) / 2, y: top + (ah - h) / 2, B };
}
function m2s(M, x, y) { return { x: M.ox + x * M.s, y: M.oy + y * M.s }; }
// ★ 地図が まわって いる ときは、さわった ところを **ぎゃくに まわして** から
//   地図の ざひょうに なおす。そうしないと ずれた ところを おした ことに なる。
function s2m(M, x, y) {
  if (G.spin) {
    const c = mapCenter(M);
    const a = -G.spin;
    const dx = x - c.x, dy = y - c.y;
    x = c.x + dx * Math.cos(a) - dy * Math.sin(a);
    y = c.y + dx * Math.sin(a) + dy * Math.cos(a);
  }
  return { x: (x - M.ox) / M.s, y: (y - M.oy) / M.s };
}
// 地図の 回転を 画面ざひょうに あてはめる（字を まっすぐ かく ため）
function rotPt(M, x, y) {
  if (!G.spin) return { x, y };
  const c = mapCenter(M), a = G.spin;
  const dx = x - c.x, dy = y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a),
           y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}
function mapCenter(M) {
  const B = M.B;
  return m2s(M, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2);
}

function polyPath(M, poly, dx, dy, sc) {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const p = m2s(M, poly[i][0], poly[i][1]);
    const x = (dx || 0) + (sc ? (p.x - (dx || 0)) : p.x) * 1, y = (dy || 0) + p.y;
    ctx[i ? 'lineTo' : 'moveTo'](p.x + (dx || 0), p.y + (dy || 0));
  }
  ctx.closePath();
}

function drawPref(M, p, mode, dx, dy) {
  const all = [p.poly].concat(p.isles || []);
  for (const poly of all) {
    polyPath(M, poly, dx, dy);
    if (mode === 'hole') {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = p.col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,40,60,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

// --- あそんでいる 画面 ------------------------------------------------------------

function drawPlay(t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2A5A7A'); g.addColorStop(1, '#1E3A56');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // うみの なみ
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = 30 + i * 30;
    ctx.beginPath();
    for (let x = 0; x < VW; x += 22) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + t + i) * 3);
    }
    ctx.stroke();
  }

  const M = mapBox();
  const labels = [];

  ctx.save();
  if (G.spin) {
    const c = mapCenter(M);
    ctx.translate(c.x, c.y);
    ctx.rotate(G.spin);
    ctx.translate(-c.x, -c.y);
  }

  // まだの ところ（かげ）
  const showHole = G.S.mode !== 'fit2' || G.S.hint;
  for (const p of G.list) {
    if (G.placed.indexOf(p.key) >= 0) continue;
    if (G.S.mode === 'fit2' && !G.S.hint) continue;
    drawPref(M, p, 'hole');
  }
  // かげ なしの ときは 九州ぜんたいの ふちだけ 出す
  if (G.S.mode === 'fit2' && !G.S.hint) {
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
    for (const p of G.list) {
      const all = [p.poly].concat(p.isles || []);
      for (const poly of all) { polyPath(M, poly); ctx.stroke(); }
    }
  }

  // はめ おわった ところ
  for (const p of G.list) {
    if (G.placed.indexOf(p.key) < 0) continue;
    let dx = 0;
    if (G.shake && G.shake.k === p.key) dx = Math.sin(G.shake.t * 40) * 5;
    drawPref(M, p, 'fill', dx, 0);
    // 名まえ（★ まわして いる ときも 字は まっすぐ かく。
    //   まわした 字は 小学生には 読めない）
    const c = centroid(p);
    const s = m2s(M, c.x, c.y);
    labels.push({ p, x: s.x + dx, y: s.y });
    if (G.glow === p.key && G.glowT > 0) {
      ctx.strokeStyle = 'rgba(255,230,102,' + G.glowT + ')';
      ctx.lineWidth = 5;
      const all = [p.poly].concat(p.isles || []);
      for (const poly of all) { polyPath(M, poly); ctx.stroke(); }
    }
  }


  ctx.restore();   // 地図の 回転 ここまで

  // 名まえは まっすぐ かく（地図が まわって いても 字は まわさない）
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  for (const L of labels) {
    const showName = G.S.mode !== 'name' || G.askDone.indexOf(L.p.key) >= 0;
    if (!showName) continue;
    const q = rotPt(M, L.x, L.y);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = 'rgba(20,30,44,0.85)'; ctx.lineWidth = 3.5;
    ctx.strokeText(L.p.name, q.x, q.y);
    ctx.fillText(L.p.name, q.x, q.y);
  }
  ctx.textAlign = 'left';

  // ★ 北の やじるしは 画面の きまった ところに 出す。
  //   地図と いっしょに うごかすと、まわった とき 地図の 上に かさなって しまう。
  {
    const cx = 44, cy = 82;
    ctx.fillStyle = 'rgba(10,26,44,0.6)';
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(G.spin || 0);
    ctx.fillStyle = '#FF8FA0';
    ctx.beginPath();
    ctx.moveTo(0, -17); ctx.lineTo(7, 4); ctx.lineTo(0, 0); ctx.lineTo(-7, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, 17); ctx.lineTo(7, 4); ctx.lineTo(0, 0); ctx.lineTo(-7, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.save(); ctx.translate(0, -22); ctx.rotate(-(G.spin || 0));
    ctx.fillText('北', 0, 0);
    ctx.restore();
    ctx.restore();
    ctx.textAlign = 'left';
  }

  drawTop();
  drawTray(M, t);

  // ひっぱっている かけら
  if (G.hold) {
    const p = prefOf(G.hold.k);
    const c = centroid(p);
    const s = m2s(M, c.x, c.y);
    ctx.globalAlpha = 0.85;
    drawPref(M, p, 'fill', G.hold.x - s.x, G.hold.y - s.y);
    ctx.globalAlpha = 1;
  }

  // おしらせ
  if (G.flashT > 0) {
    ctx.globalAlpha = Math.min(1, G.flashT * 1.6);
    ctx.fillStyle = 'rgba(10,20,34,0.82)';
    rr(ctx, 20, VH - 44, VW - 40, 32, 8); ctx.fill();
    ctx.fillStyle = G.flashCol;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(G.flash, VW - 60, 17, 'bold ');
    ctx.fillText(G.flash, VW / 2, VH - 28);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    ctx.fillStyle = 'rgba(10,20,34,0.5)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText(G.win ? 'できた！' : '時間切れ…', VW / 2, VH * 0.45);
    ctx.textAlign = 'left';
  }
}

function drawTop() {
  ctx.fillStyle = 'rgba(10,26,44,0.7)';
  rr(ctx, 8, 6, VW - 16, 34, 10); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  fitFont(G.S.name, VW * 0.26, 16, 'bold ');
  ctx.fillText(G.S.name, 20, 23);

  if (G.ask) {
    ctx.fillStyle = '#FFE066';
    ctx.textAlign = 'center';
    fitFont(askText(), VW * 0.36, 20, 'bold ');
    ctx.fillText(askText(), VW * 0.52, 23);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('のこり ' + G.bag.length + ' こ', VW * 0.52, 23);
  }
  ctx.textAlign = 'right';
  if (G.S.sec) {
    ctx.fillStyle = G.left < 15 ? '#FF8FA0' : '#8FD6FF';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(Math.ceil(G.left) + 'びょう', VW - 96, 23);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('まちがい ' + G.miss, VW - 96, 23);
  }
  ctx.textAlign = 'left';
  drawButton(button(VW - 86, 10, 78, 26, () => { bgmStop(); G.screen = 'title'; }),
             'めんを えらぶ', 'rgba(255,255,255,0.85)');
}

// まだ はめて いない かけらを 右に ならべる
function drawTray(M, t) {
  if (!G.bag.length) return;
  const x0 = M.x + M.w + 30;
  const w = VW - x0 - 16;
  ctx.fillStyle = 'rgba(10,26,44,0.5)';
  rr(ctx, x0 - 10, 48, w + 16, VH - 106, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('ここから ひっぱってね', x0 - 2, 54);

  const cols = Math.max(1, Math.floor(w / 84));
  for (let i = 0; i < G.bag.length; i++) {
    const p = prefOf(G.bag[i]);
    const bx = x0 + (i % cols) * 84, by = 74 + Math.floor(i / cols) * 62;
    const b = button(bx, by, 78, 56, null);
    b.piece = p.key;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    // 小さい かたち
    const all = [p.poly].concat(p.isles || []);
    const c = centroid(p);
    const sc = 0.62;
    ctx.save();
    ctx.translate(bx + 24, by + 28);
    ctx.scale(sc, sc);
    ctx.translate(-(M.ox + c.x * M.s), -(M.oy + c.y * M.s));
    for (const poly of all) {
      polyPath(M, poly);
      ctx.fillStyle = p.col; ctx.fill();
      ctx.strokeStyle = 'rgba(30,40,60,0.5)'; ctx.lineWidth = 2 / sc; ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fitFont(p.name, 30, 13, 'bold ');
    ctx.fillText(p.name, bx + 44, by + 28);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E3A56'); g.addColorStop(1, '#3A6A7A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('りなのしこくツアー', VW * 0.44, 38, 'bold ');
  ctx.fillText('りなのしこくツアー', 24, 16);
  ctx.fillStyle = '#C8F0FF';
  fitFont('地図が まわる ！ 「北がわ」で おぼえないと とけないよ', VW * 0.50, 15);
  ctx.fillText('地図が まわる ！ 「北がわ」で おぼえないと とけないよ', 26, 20 + fs + 4);

  // 見本の 地図
  {
    const B = bounds(PREFS);
    const h = 250, s = h / (B.y1 - B.y0);
    const ox = VW - 40 - (B.x1 - B.x0) * s - B.x0 * s, oy = 96 - B.y0 * s;
    const M = { s, ox, oy };
    for (const p of PREFS) {
      const all = [p.poly].concat(p.isles || []);
      for (const poly of all) {
        polyPath(M, poly);
        ctx.fillStyle = p.col; ctx.fill();
        ctx.strokeStyle = 'rgba(20,30,44,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }

  // 10めん（5 × 2）
  const cw = Math.min(96, (VW * 0.56 - 24) / 5), chh = 62;
  for (let i = 0; i < STAGES.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 116 + Math.floor(i / 5) * (chh + 10);
    const op = opened(i), st = starOf(i);
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? (st ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.13)')
                       : 'rgba(255,255,255,0.06)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = st ? '#FFE066' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = st ? 3 : 1.5; ctx.stroke();
    if (op) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + (cw - 8) / 2, cyp + 5);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      const md = { learn: 'みる', fit: 'はめる', fit2: 'かげなし', name: 'なまえ',
                   item: 'おつかい', where: 'ばしょ', time: 'タイム' };
      ctx.fillText(md[STAGES[i].mode], cxp + (cw - 8) / 2, cyp + 24);
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('★'.repeat(st) + '☆'.repeat(3 - st), cxp + (cw - 8) / 2, cyp + 40);
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
  ctx.fillText('★ まちがえても へらないよ。なんど でも やりなおせる', 24, 116 + 2 * (chh + 10) + 8);
  ctx.fillText('★ 1回も まちがえずに できたら ★★★', 24, 116 + 2 * (chh + 10) + 30);

  drawButton(button(VW - 150, 12, 138, 30, () => { location.href = '/allprojects/'; }),
             '≡ ゲームをえらぶ', 'rgba(255,255,255,0.9)', '#33304A');
  drawButton(button(24, VH - 42, 106, 30, () => { G.screen = 'howto'; }),
             'あそびかた', '#E8D0F8');
  drawButton(button(138, VH - 42, 96, 30, () => { sfxTest(); }),
             '♪ 音', 'rgba(255,255,255,0.85)');

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  fitFont('v' + GAME_VER, 60, 13, 'bold ');
  ctx.fillText('v' + GAME_VER, VW - 14, VH - 6);
  ctx.textAlign = 'left';
}

function drawHowto() {
  ctx.fillStyle = '#16283C'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#C8F0FF';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    '① 「うどんを とどけて！」のように 言われたら、その けんを タップ',
    '② 「形を はめる」めんは、右の かけらを ひっぱって 地図に はめる',
    '',
    '★ 7めん目から「地図が まわる」！ 画面の どこに あるか だけを',
    '　 おぼえて いると、まわった とたんに わからなく なる。',
    '　 「香川は 北がわ」「高知は 南がわ」で おぼえよう（北の やじるしを 見てね）',
    '',
    '★ まちがえても へらない。ヒントが 出るよ',
    '★ 1回も まちがえずに できると ★★★',
    '',
    '四国は 4つの けん。北に 香川（うどん）、東に 徳島（すだち）、',
    '西に 愛媛（みかん）、南に 高知（かつお）。',
  ];

  ctx.fillStyle = '#E8F4FA';
  lines.forEach((s, i) => {
    fitFont(s, VW * 0.94, 16);
    ctx.fillText(s, 24, 52 + i * 27);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = G.win ? '#FFE066' : '#FFAFAF';
  fitFont(G.win ? 'クリア！' : '時間切れ…', VW * 0.5, 42, 'bold ');
  ctx.fillText(G.win ? 'クリア！' : '時間切れ…', VW / 2, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(G.S.name, VW / 2, 84);
  const st = G.win ? (G.miss === 0 ? 3 : G.miss <= 2 ? 2 : 1) : 0;
  ctx.fillStyle = '#FFE066';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('★'.repeat(st) + '☆'.repeat(3 - st), VW / 2, 116);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('まちがい ' + G.miss + ' かい', VW / 2, 172);
  if (G.S.sec && G.win) {
    ctx.fillText('かかった 時間 ' + Math.round((G.S.sec - G.left) * 10) / 10 + 'びょう', VW / 2, 196);
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(160, VW * 0.22);
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
    if (b && b.piece) { takePiece(b.piece); G.hold.x = x; G.hold.y = y; dragging = true; return; }
    if (b && b.on) { b.on(); return; }
    if (G.ask) {
      const M = mapBox();
      const m = s2m(M, x, y);
      tapMap(m.x, m.y);
    }
    return;
  }
  const b = hitBtn(px, py);
  if (b && b.on) b.on();
}
function move(px, py) {
  if (!dragging || !G.hold) return;
  G.hold.x = px / SC; G.hold.y = py / SC;
}
function up() {
  if (!dragging) return;
  dragging = false;
  if (!G.hold) return;
  const M = mapBox();
  const m = s2m(M, G.hold.x, G.hold.y);
  dropAt(m.x, m.y);
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
  ctx.fillStyle = '#16283C'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#C8F0FF';
  ctx.fillText('地図の よこに かけらが ならぶよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
