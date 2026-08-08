// 画面・そうさ・メインループ。
//
// カメラは カートに くっついて **いっしょに まわる**。
// じぶんの カートは いつも 上を むいているので、「左を おす → 左に まがる」が
// ずっと 同じ。地図の むきが 変わらない やりかただと、下に むかって 走るとき
// 左右が さかさまに 感じて、小さい子には むずかしい。

'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const VH = 450;
let W = 0, H = 0, SC = 1, VW = 800;

const ZOOM = 0.70;   // カメラの ひきぐあい（小さいほど 遠くまで 見える）

const ui = { buttons: [] };
const input = { left: false, right: false, useItem: false };

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

// --- カートの 絵 -----------------------------------------------------------------

function drawKart(f, t) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.ang + Math.PI / 2);
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  rr(ctx, -13, -15, 26, 32, 8); ctx.fill();
  ctx.translate(-1.5, -2.5);
  // タイヤ
  ctx.fillStyle = '#22202A';
  rr(ctx, -15, -13, 7, 11, 3); ctx.fill();
  rr(ctx, 8, -13, 7, 11, 3); ctx.fill();
  rr(ctx, -16, 4, 8, 12, 3); ctx.fill();
  rr(ctx, 8, 4, 8, 12, 3); ctx.fill();
  // からだ
  ctx.fillStyle = f.drv.col;
  rr(ctx, -11, -15, 22, 31, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  rr(ctx, -8, -13, 16, 8, 4); ctx.fill();
  // ヘルメット
  ctx.fillStyle = '#F6CFAC';
  ctx.beginPath(); ctx.arc(0, 2, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2028';
  ctx.beginPath(); ctx.arc(0, 2, 6.5, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ドリフトの 火花。たまるほど 色が かわる。
  if (f.driftT > 0.2 && f.spinT <= 0) {
    const k = Math.min(1, f.driftT / 1.0);
    const col = f.driftT > 0.55 ? (f.driftT > 0.9 ? '#FF8FD0' : '#FFD166') : '#8FD6FF';
    for (let i = 0; i < 5; i++) {
      const a = f.ang + Math.PI + (Math.random() - 0.5) * 0.9;
      const d = 16 + Math.random() * 16 * k;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 1.5 + Math.random() * 2.5 * k, 0, 7);
      ctx.fill();
    }
  }
  // ダッシュ中の 火
  if (f.boostT > 0) {
    for (let i = 0; i < 4; i++) {
      const a = f.ang + Math.PI + (Math.random() - 0.5) * 0.5;
      const d = 14 + Math.random() * 26;
      ctx.fillStyle = i % 2 ? '#FFE066' : '#FF9C5A';
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 2 + Math.random() * 3, 0, 7);
      ctx.fill();
    }
  }
  // 草を はしると 土けむり
  if (f.onGrass && f.spd > 60) {
    for (let i = 0; i < 2; i++) {
      const a = f.ang + Math.PI + (Math.random() - 0.5) * 1.2;
      const d = 12 + Math.random() * 20;
      ctx.fillStyle = 'rgba(230,225,200,0.5)';
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 2 + Math.random() * 4, 0, 7);
      ctx.fill();
    }
  }
}

// --- レースの 画面 ---------------------------------------------------------------

function drawPlay(t) {
  const T = G.T, th = THEMES[T.def.theme], me = G.karts[G.me];
  ctx.fillStyle = th.grass;
  ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  const sh = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 9 : 0;
  ctx.translate(VW / 2 + sh, VH * 0.68 + sh);
  // ★ 1:1 で かくと 目の まえしか 見えず、つぎの かどが 来てから 気づく。
  //   すこし ひいて（ZOOM）、先の かどが 見える ように する。
  ctx.scale(ZOOM, ZOOM);
  ctx.rotate(-me.ang - Math.PI / 2);
  ctx.translate(-me.x, -me.y);

  const VR = 700 / ZOOM;   // 見えている はんい（ざっくり）

  // 草の もよう（同じ ばしょに 出す ため 座標から きめる）
  ctx.fillStyle = th.grass2;
  const gx0 = Math.floor((me.x - VR) / 90) * 90, gy0 = Math.floor((me.y - VR) / 90) * 90;
  for (let x = gx0; x < me.x + VR; x += 90) {
    for (let y = gy0; y < me.y + VR; y += 90) {
      ctx.beginPath(); ctx.arc(x + 30, y + 45, 17, 0, 7); ctx.fill();
    }
  }

  // 道
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(T.pts[0][0], T.pts[0][1]);
  for (let i = 1; i < T.n; i++) ctx.lineTo(T.pts[i][0], T.pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = th.edge; ctx.lineWidth = T.hw * 2 + 10; ctx.stroke();
  ctx.strokeStyle = th.road; ctx.lineWidth = T.hw * 2; ctx.stroke();
  // まん中の 白い 点線
  ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 3;
  ctx.setLineDash([16, 22]); ctx.stroke(); ctx.setLineDash([]);

  // かざり
  for (const d of T.deco) {
    if (Math.abs(d.x - me.x) > VR || Math.abs(d.y - me.y) > VR) continue;
    ctx.fillStyle = th.deco;
    if (d.k < 0.6) {
      ctx.beginPath(); ctx.arc(d.x, d.y, 13 * d.s, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(d.x + 3, d.y + 4, 9 * d.s, 0, 7); ctx.fill();
    } else {
      rr(ctx, d.x - 9 * d.s, d.y - 9 * d.s, 18 * d.s, 18 * d.s, 4); ctx.fill();
    }
  }

  // みずたまり
  for (const p of T.pools) {
    ctx.fillStyle = 'rgba(120,190,230,0.55)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.8, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // かそくパッド
  for (const p of T.pads) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const i = Math.floor(p.u * T.n) % T.n;
    ctx.rotate(Math.atan2(T.dir[i][1], T.dir[i][0]));
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ((t * 6 + k) % 3 < 1.5) ? '#FFE066' : '#FF9C5A';
      ctx.beginPath();
      ctx.moveTo(-16 + k * 13, -18); ctx.lineTo(-4 + k * 13, 0); ctx.lineTo(-16 + k * 13, 18);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // スタート／ゴールの 線
  {
    const i0 = 0;
    const p = T.pts[i0], d = T.dir[i0];
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(Math.atan2(d[1], d[0]));
    for (let k = -Math.floor(T.hw / 11); k < T.hw / 11; k++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = ((k + j) % 2 === 0) ? '#FFFFFF' : '#2A2028';
        ctx.fillRect(-11 + j * 11, k * 11, 11, 11);
      }
    }
    ctx.restore();
  }

  // アイテムの はこ
  for (const b of T.boxes) {
    if (!b.on) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(t * 1.8);
    ctx.fillStyle = '#FFD166';
    rr(ctx, -11, -11, 22, 22, 6); ctx.fill();
    ctx.strokeStyle = '#B98A20'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
    ctx.restore();
  }

  // バナナ
  for (const b of G.bananas) {
    ctx.fillStyle = '#F0D040';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, 11, 7, Math.sin(b.t) * 0.4, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#A88A20'; ctx.lineWidth = 2; ctx.stroke();
  }
  // こうら
  for (const s of G.shells) {
    ctx.fillStyle = '#5AC87A';
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.stroke();
  }

  // カート（じぶんは いちばん 上に）
  for (const f of G.karts) if (!f.isMe) drawKart(f, t);
  drawKart(me, t);
  // ★ どれが じぶんか ひと目で わかる ように、頭の 上に しるしを つける。
  //   4だいが かたまると 色だけでは 見わけられない。
  ctx.save();
  ctx.translate(me.x, me.y);
  ctx.rotate(me.ang + Math.PI / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
  const bob = Math.sin(t * 6) * 2;
  ctx.beginPath();
  ctx.moveTo(0, -30 + bob); ctx.lineTo(9, -42 + bob); ctx.lineTo(-9, -42 + bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();

  drawHud(t);
}

function drawHud(t) {
  const me = G.karts[G.me];
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  // じゅんい
  ctx.fillStyle = 'rgba(20,12,34,0.55)';
  rr(ctx, 12, 10, 96, 54, 12); ctx.fill();
  ctx.fillStyle = ['#FFE066', '#D8D8E8', '#E8A868', '#FFFFFF'][me.place - 1] || '#FFFFFF';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(String(me.place), 24, 18);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('い', 52, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('しゅう ' + lapText(), 12, 70);

  // 時間
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(G.t.toFixed(2), VW - 14, 14);
  const bk = save.best['s' + G.stage];
  if (bk) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('ベスト ' + bk.toFixed(2), VW - 14, 36);
  }
  ctx.textAlign = 'left';

  // ミニ地図
  drawMap(VW - 96, 56, 84);

  // アイテム
  const ib = { x: VW / 2 - 40, y: VH - 92, w: 80, h: 80 };
  ctx.fillStyle = me.item ? 'rgba(255,209,102,0.92)' : 'rgba(255,255,255,0.16)';
  ctx.beginPath(); ctx.arc(ib.x + 40, ib.y + 40, 38, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.stroke();
  if (me.item === 1) {
    ctx.fillStyle = '#C84A20';
    ctx.beginPath();
    ctx.moveTo(ib.x + 30, ib.y + 20); ctx.lineTo(ib.x + 54, ib.y + 38);
    ctx.lineTo(ib.x + 38, ib.y + 38); ctx.lineTo(ib.x + 50, ib.y + 60);
    ctx.lineTo(ib.x + 26, ib.y + 42); ctx.lineTo(ib.x + 42, ib.y + 42);
    ctx.closePath(); ctx.fill();
  } else if (me.item === 2) {
    ctx.fillStyle = '#8A6A10';
    ctx.beginPath(); ctx.ellipse(ib.x + 40, ib.y + 40, 20, 12, -0.5, 0, 7); ctx.fill();
  } else if (me.item === 3) {
    ctx.fillStyle = '#3AA85A';
    ctx.beginPath(); ctx.arc(ib.x + 40, ib.y + 40, 18, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke();
  }

  // 左右の ボタン（見えるように うすく 出す）
  ctx.fillStyle = input.left ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)';
  rr(ctx, 10, VH - 92, 96, 80, 18); ctx.fill();
  ctx.fillStyle = input.right ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)';
  rr(ctx, VW - 106, VH - 92, 96, 80, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [bx, dir] of [[58, -1], [VW - 58, 1]]) {
    ctx.beginPath();
    ctx.moveTo(bx + dir * 14, VH - 52);
    ctx.lineTo(bx - dir * 8, VH - 68);
    ctx.lineTo(bx - dir * 8, VH - 36);
    ctx.closePath(); ctx.fill();
  }

  // ★ ぎゃくそう・道から 出た とき の あんない。
  //   小さい子は 一度 くるっと まわると どっちへ 行くのか わからなくなる。
  //   つぎに むかう ばしょへ 大きな やじるしを 出す。
  if (G.phase === 'race' && !me.done) {
    const T = G.T;
    const nx = mk(T, me.u + 150 / T.len, 0, 0);
    let d = Math.atan2(nx.y - me.y, nx.x - me.x) - me.ang;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const lost = Math.abs(d) > 1.15;
    if (lost || (me.onGrass && Math.abs(d) > 0.55)) {
      const back = Math.abs(d) > 2.0;
      ctx.save();
      ctx.translate(VW / 2, VH * 0.30);
      ctx.rotate(d);
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 9);
      ctx.fillStyle = back ? '#FF6A6A' : '#FFE066';
      ctx.beginPath();
      ctx.moveTo(0, -42); ctx.lineTo(30, 6); ctx.lineTo(12, 6);
      ctx.lineTo(12, 40); ctx.lineTo(-12, 40); ctx.lineTo(-12, 6); ctx.lineTo(-30, 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      if (back) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 9);
        ctx.fillStyle = '#FF6A6A';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillText('ぎゃくそう！', VW / 2, VH * 0.30 + 74);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.globalAlpha = 1;
      }
    }
  }

  // カウントダウン
  if (G.phase === 'count') {
    const left = Math.max(0, Math.ceil(3.2 - G.ph));
    ctx.fillStyle = 'rgba(20,12,34,0.45)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (left > 0) {
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 96px system-ui, sans-serif';
      ctx.fillText(String(left), VW / 2, VH * 0.42);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(G.T.def.name, VW / 2, VH * 0.62);
    } else {
      ctx.fillStyle = '#A8F0B0';
      ctx.font = 'bold 76px system-ui, sans-serif';
      ctx.fillText('スタート！', VW / 2, VH * 0.42);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ゴールした しゅんかん
  if (G.phase === 'done') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(20,12,34,0.35)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = G.place === 1 ? '#FFE066' : '#FFFFFF';
    ctx.font = 'bold 68px system-ui, sans-serif';
    ctx.fillText(G.place + 'い！', VW / 2, VH * 0.44);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
}

// ミニ地図。コース ぜんたいを 小さく かいて、みんなの ばしょを 点で 出す。
function drawMap(cx, cy, size) {
  const T = G.T;
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const p of T.pts) {
    if (p[0] < mnx) mnx = p[0];
    if (p[0] > mxx) mxx = p[0];
    if (p[1] < mny) mny = p[1];
    if (p[1] > mxy) mxy = p[1];
  }
  const s = size / Math.max(mxx - mnx, mxy - mny);
  const ox = cx - (mnx + mxx) / 2 * s, oy = cy - (mny + mxy) / 2 * s;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(T.pts[0][0] * s + ox, T.pts[0][1] * s + oy);
  for (let i = 1; i < T.n; i++) ctx.lineTo(T.pts[i][0] * s + ox, T.pts[i][1] * s + oy);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
  for (const f of G.karts) {
    ctx.fillStyle = f.drv.col;
    ctx.beginPath(); ctx.arc(f.x * s + ox, f.y * s + oy, f.isMe ? 4.5 : 3.2, 0, 7); ctx.fill();
    if (f.isMe) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6; ctx.stroke(); }
  }
  ctx.restore();
}

// --- タイトル -------------------------------------------------------------------

function bg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1E2A4A'); g.addColorStop(1, '#4A2A5A');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

function drawTitle(t) {
  bg();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  const fs = fitFont('まさきのカートレース', VW * 0.46, 42, 'bold ');
  ctx.fillText('まさきのカートレース', 24, 16);
  ctx.fillStyle = '#FFD9F0';
  fitFont('左右を おして はしる。ドリフトを ためて ダッシュ！', VW * 0.52, 15);
  ctx.fillText('左右を おして はしる。ドリフトを ためて ダッシュ！', 26, 20 + fs + 4);

  // つよさ
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('つよさ', 24, 84);
  for (let k = 0; k < DIFFS.length; k++) {
    const on = save.diff === k;
    const b = button(86 + k * 78, 78, 72, 26, () => { save.diff = k; storeSave(); });
    ctx.fillStyle = on ? DIFFS[k].col : 'rgba(255,255,255,0.16)';
    rr(ctx, b.x, b.y, b.w, b.h, 7); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = on ? 2 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#22304A' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(DIFFS[k].name, b.w * 0.86, 14, 'bold ');
    ctx.fillText(DIFFS[k].name, b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(diffNow().about, 86 + 3 * 78 + 8, 84);

  // だれで はしるか
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('カート', 24, 118);
  for (let k = 0; k < DRIVERS.length; k++) {
    const on = (save.who | 0) === k;
    const b = button(86 + k * 60, 112, 54, 26, () => { save.who = k; storeSave(); });
    ctx.fillStyle = on ? DRIVERS[k].col : 'rgba(255,255,255,0.16)';
    rr(ctx, b.x, b.y, b.w, b.h, 7); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = on ? 2 : 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(DRIVERS[k].name, b.w * 0.86, 13, 'bold ');
    ctx.fillText(DRIVERS[k].name, b.x + b.w / 2, b.y + b.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // コース（5 × 2）
  const cw = Math.min(96, (VW - 48) / 5), chh = 62;
  for (let i = 0; i < COURSES.length; i++) {
    const cxp = 24 + (i % 5) * cw, cyp = 154 + Math.floor(i / 5) * (chh + 10);
    const op = opened(i), cl = save.clear[i];
    const th = THEMES[COURSES[i].theme];
    if (op) button(cxp, cyp, cw - 8, chh, () => startStage(i));
    ctx.fillStyle = op ? th.grass : 'rgba(255,255,255,0.08)';
    rr(ctx, cxp, cyp, cw - 8, chh, 10); ctx.fill();
    ctx.strokeStyle = cl ? '#FFE066' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = cl ? 3 : 1.5; ctx.stroke();
    if (op) {
      // コースの かたちを 小さく
      const T2 = { pts: smooth(COURSES[i].ctrl, 4) };
      let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
      for (const p of T2.pts) {
        if (p[0] < mnx) mnx = p[0];
        if (p[0] > mxx) mxx = p[0];
        if (p[1] < mny) mny = p[1];
        if (p[1] > mxy) mxy = p[1];
      }
      const s = 30 / Math.max(mxx - mnx, mxy - mny);
      const ox = cxp + (cw - 8) / 2 - (mnx + mxx) / 2 * s, oy = cyp + 27 - (mny + mxy) / 2 * s;
      ctx.beginPath();
      ctx.moveTo(T2.pts[0][0] * s + ox, T2.pts[0][1] * s + oy);
      for (let k = 1; k < T2.pts.length; k++) ctx.lineTo(T2.pts[k][0] * s + ox, T2.pts[k][1] * s + oy);
      ctx.closePath();
      ctx.strokeStyle = th.road; ctx.lineWidth = 5;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(String(i + 1), cxp + 7, cyp + 3);
      const bk = save.best['s' + i];
      if (bk) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(bk.toFixed(2), cxp + (cw - 8) / 2, cyp + chh - 14);
      }
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('カギ', cxp + (cw - 8) / 2, cyp + chh / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }
  }

  // 下が あいているので、コツを 出しておく
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('コース ぜんぶで ' + COURSES.length + '。3しゅう まわって 3い までに 入れば クリア', 24, 300);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('同じ むきに まがりつづける → 火花が たまる → ゆびを はなすと ダッシュ！', 24, 322);
  const done = save.clear.filter(Boolean).length;
  ctx.fillText('クリアした コース ' + done + ' / ' + COURSES.length, 24, 344);

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
  ctx.fillStyle = '#1E2A4A'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD9F0';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('あそびかた', 24, 14);
  const lines = [
    'アクセルは じどう。画面の 左はしを おすと 左、右はしを おすと 右に まがる',
    '',
    '★ ドリフト … 同じ むきに まがりつづけると 火花が たまる。',
    '　　 青 → きいろ → ピンク の じゅんに 大きく なって、',
    '　　 ゆびを はなした しゅんかんに ダッシュ！',
    '',
    '★ ? の はこ … とると アイテムが 出る。まん中の まるを おすと つかう',
    '　　 いなずま＝ダッシュ／バナナ＝うしろに おく／みどりの たま＝まえの 人に あてる',
    '',
    '★ 草の 上は おそい。みずたまりも すべって おそい',
    '★ オレンジの やじるし（かそくパッド）を ふむと ダッシュ',
    '',
    '3しゅう まわって **3い までに** 入れば クリア。3回 まけたら つぎの コースも あく',
    'パソコンは ← → か A D、スペースで アイテム',
  ];
  ctx.fillStyle = '#F0E4F8';
  lines.forEach((s, i) => {
    fitFont(s.replace(/\*\*/g, ''), VW * 0.94, 16);
    ctx.fillText(s.replace(/\*\*/g, ''), 24, 52 + i * 26);
  });
  drawButton(button(VW - 120, 12, 104, 34, () => { G.screen = 'title'; }), 'もどる', '#FFD166');
}

function drawResult(t) {
  bg();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const win = G.place <= 3;
  ctx.fillStyle = win ? '#FFE066' : '#FFAFAF';
  fitFont(win ? 'クリア！' : 'ざんねん…', VW * 0.5, 42, 'bold ');
  ctx.fillText(win ? 'クリア！' : 'ざんねん…', VW / 2, 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(G.T.def.name + '　' + G.place + 'い　' + G.karts[G.me].doneT.toFixed(2) + 'びょう',
               VW / 2, 66);
  if (G.best) {
    ctx.fillStyle = '#A8F0B0';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('ベスト こうしん！', VW / 2, 90);
  }

  // ぜんいんの じゅんい
  const arr = G.order;
  for (let k = 0; k < arr.length; k++) {
    const f = arr[k];
    const y = 118 + k * 42;
    ctx.fillStyle = f.isMe ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
    rr(ctx, VW / 2 - 190, y, 380, 36, 10); ctx.fill();
    ctx.fillStyle = ['#FFE066', '#D8D8E8', '#E8A868', 'rgba(255,255,255,0.6)'][k];
    ctx.textAlign = 'left';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText((k + 1) + 'い', VW / 2 - 176, y + 8);
    ctx.fillStyle = f.drv.col;
    ctx.beginPath(); ctx.arc(VW / 2 - 120, y + 18, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(f.drv.name + (f.isMe ? '（じぶん）' : ''), VW / 2 - 100, y + 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(f.done ? f.doneT.toFixed(2) + 'びょう' : 'まだ そうこう中', VW / 2 + 176, y + 11);
    ctx.textAlign = 'center';
  }
  ctx.textAlign = 'left';

  const nxt = G.stage + 1;
  const bw = Math.min(150, VW * 0.22);
  drawButton(button(VW / 2 - bw - 100, VH - 48, bw, 38, () => startStage(G.stage)),
             'もう一度', '#E8D0F8');
  if (nxt < COURSES.length && opened(nxt)) {
    drawButton(button(VW / 2 - bw / 2, VH - 48, bw, 38, () => startStage(nxt)),
               'つぎの コース', '#FFD166');
  }
  drawButton(button(VW / 2 + 100, VH - 48, bw, 38, () => { G.screen = 'title'; }),
             'コースえらび', 'rgba(255,255,255,0.85)');
}

// --- そうさ ---------------------------------------------------------------------

const touchRole = {};   // touch の id → 'L' / 'R' / 'I'

function roleAt(px, py) {
  const x = px / SC, y = py / SC;
  // まん中の まる（アイテム）を さきに 見る
  const dx = x - VW / 2, dy = y - (VH - 52);
  if (dx * dx + dy * dy < 46 * 46) return 'I';
  return x < VW / 2 ? 'L' : 'R';
}

function down(id, px, py) {
  audioStart();
  if (G.screen !== 'play') {
    const b = hitBtn(px, py);
    if (b) b.on();
    return;
  }
  const r = roleAt(px, py);
  touchRole[id] = r;
  if (r === 'L') input.left = true;
  else if (r === 'R') input.right = true;
  else input.useItem = true;
}

function up(id) {
  const r = touchRole[id];
  if (r === undefined) return;
  delete touchRole[id];
  let l = false, rr2 = false;
  for (const k in touchRole) {
    if (touchRole[k] === 'L') l = true;
    if (touchRole[k] === 'R') rr2 = true;
  }
  input.left = l; input.right = rr2;
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
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  down('m', e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => up('m'));

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); input.left = true; }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); input.right = true; }
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) input.useItem = true; }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.screen === 'play') { bgmStop(); engStop(); G.screen = 'title'; }
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
  ctx.fillStyle = '#1E2A4A'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(W * 0.07) + 'px system-ui, sans-serif';
  ctx.fillText('よこ向きにしてね', W / 2, H * 0.45);
  ctx.font = Math.round(W * 0.045) + 'px system-ui, sans-serif';
  ctx.fillStyle = '#FFD9F0';
  ctx.fillText('レースは よこ向きの ほうが 見やすいよ', W / 2, H * 0.56);
  ctx.textAlign = 'left';
  ctx.setTransform(dpr * SC, 0, 0, dpr * SC, 0, 0);
}

layout();
requestAnimationFrame(frame);
