// 絵を 描く どうぐ。画像ファイルは 1まいも つかわず、ぜんぶ その場で 描く。
//
// ★ きょうだい 4人は「まるい 顔＋大きな 目＋ほっぺ」の かわいい かたち。
//   色だけ かえて 4人ぶん 作る。かみがたを すこし 変えて 見わけられる ように。

'use strict';

function rr(x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

// きょうだいの 顔。s は 顔の 半径。
//   mood: 'happy' | 'ng'
//   4人は かみがた と かぶりもので 見わける。
//     りな…ツインテール＋リボン ／ まさき…キャップ
//     あおい…おだんご＋ヘアバンド ／ ゆい…おかっぱ＋リボン
function drawKid(k, x, y, s, mood, t) {
  const K = KIDS[k];
  y += Math.sin((t || 0) * 4 + k) * s * 0.05;

  // うしろがみ
  ctx.fillStyle = K.hair;
  if (k === 0) {
    circle(x - s * 1.02, y + s * 0.25, s * 0.44); ctx.fill();
    circle(x + s * 1.02, y + s * 0.25, s * 0.44); ctx.fill();
    circle(x - s * 0.86, y + s * 0.72, s * 0.30); ctx.fill();
    circle(x + s * 0.86, y + s * 0.72, s * 0.30); ctx.fill();
  } else if (k === 2) {
    circle(x, y - s * 1.18, s * 0.42); ctx.fill();     // おだんご
  } else if (k === 3) {
    rr(x - s * 1.06, y - s * 0.2, s * 2.12, s * 1.0, s * 0.3); ctx.fill();   // おかっぱ
  }
  circle(x, y - s * 0.04, s * 1.10); ctx.fill();

  // 顔
  ctx.fillStyle = '#FFE0C8';
  circle(x, y, s); ctx.fill();

  // まえがみ
  ctx.fillStyle = K.hair;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.14, s * 0.99, Math.PI * 1.04, Math.PI * 1.96);
  ctx.closePath(); ctx.fill();

  // 目
  const ey = y + s * 0.12, ex = s * 0.38;
  if (mood === 'ng') {
    ctx.strokeStyle = '#3A2A2A'; ctx.lineWidth = Math.max(2, s * 0.11); ctx.lineCap = 'round';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sg * ex - s * 0.15, ey - s * 0.13);
      ctx.lineTo(x + sg * ex + s * 0.15, ey + s * 0.13);
      ctx.moveTo(x + sg * ex + s * 0.15, ey - s * 0.13);
      ctx.lineTo(x + sg * ex - s * 0.15, ey + s * 0.13);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#2A2028';
    for (const sg of [-1, 1]) { circle(x + sg * ex, ey, s * 0.17); ctx.fill(); }
    ctx.fillStyle = '#FFFFFF';
    for (const sg of [-1, 1]) { circle(x + sg * ex - s * 0.05, ey - s * 0.06, s * 0.07); ctx.fill(); }
  }

  // ほっぺ
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.63, y + s * 0.32, s * 0.16); ctx.fill(); }

  // 口
  ctx.strokeStyle = '#B4485E'; ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'ng') ctx.arc(x, y + s * 0.64, s * 0.20, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y + s * 0.38, s * 0.26, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // かぶりもの
  ctx.fillStyle = K.col;
  if (k === 1) {
    // キャップ（あたまの まるみ ＋ 前の つば）
    ctx.beginPath();
    ctx.arc(x, y - s * 0.16, s * 1.0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    rr(x - s * 1.02, y - s * 0.22, s * 2.04, s * 0.20, s * 0.10); ctx.fill();
    rr(x + s * 0.55, y - s * 0.20, s * 0.86, s * 0.17, s * 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(x, y - s * 1.12, s * 0.11); ctx.fill();
  } else if (k === 2) {
    // ヘアバンド
    ctx.beginPath();
    ctx.arc(x, y - s * 0.10, s * 1.04, Math.PI * 1.10, Math.PI * 1.90);
    ctx.lineWidth = Math.max(2, s * 0.20);
    ctx.strokeStyle = K.col; ctx.stroke();
  } else {
    // リボン
    ctx.beginPath();
    ctx.moveTo(x + s * 0.80, y - s * 0.78);
    ctx.lineTo(x + s * 1.22, y - s * 0.98);
    ctx.lineTo(x + s * 1.22, y - s * 0.54);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.80, y - s * 0.78);
    ctx.lineTo(x + s * 0.40, y - s * 0.98);
    ctx.lineTo(x + s * 0.40, y - s * 0.54);
    ctx.closePath(); ctx.fill();
    circle(x + s * 0.80, y - s * 0.78, s * 0.15); ctx.fill();
  }
}

// 小さい かおアイコン（ライフ表示用）
function drawKidIcon(k, x, y, s, alive) {
  ctx.save();
  if (!alive) ctx.globalAlpha = 0.22;
  drawKid(k, x, y, s, alive ? 'happy' : 'ng', 0);
  ctx.restore();
}

// ラスボス「パパロボ」。メガネの ちょいぽちゃ パパが ロボに 乗って いる。
function drawPapa(x, y, s, hurt, t) {
  const sh = Math.sin((t || 0) * 3) * s * 0.06;
  y += sh;
  // ロボの からだ
  ctx.fillStyle = hurt > 0 ? '#FF9090' : '#7A88A8';
  rr(x - s * 1.15, y + s * 0.25, s * 2.3, s * 1.35, s * 0.25); ctx.fill();
  ctx.fillStyle = '#4A5670';
  rr(x - s * 1.5, y + s * 0.45, s * 0.4, s * 0.9, s * 0.15); ctx.fill();
  rr(x + s * 1.1, y + s * 0.45, s * 0.4, s * 0.9, s * 0.15); ctx.fill();
  // コックピット
  ctx.fillStyle = 'rgba(180,230,255,0.5)';
  circle(x, y - s * 0.05, s * 0.95); ctx.fill();
  // パパの 顔
  ctx.fillStyle = '#FFD8B8';
  circle(x, y, s * 0.66); ctx.fill();
  ctx.fillStyle = '#3A2A20';
  ctx.beginPath(); ctx.arc(x, y - s * 0.12, s * 0.66, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
  // メガネ
  ctx.strokeStyle = '#2A2A32'; ctx.lineWidth = Math.max(2, s * 0.07);
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.27, y + s * 0.04, s * 0.20); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x - s * 0.07, y + s * 0.04); ctx.lineTo(x + s * 0.07, y + s * 0.04); ctx.stroke();
  ctx.fillStyle = '#2A2028';
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.27, y + s * 0.04, s * 0.08); ctx.fill(); }
  // 口ひげ
  ctx.fillStyle = '#3A2A20';
  rr(x - s * 0.22, y + s * 0.28, s * 0.44, s * 0.11, s * 0.05); ctx.fill();
}

// ふきだし
function bubble(text, x, y, w, size) {
  const h = size * 2.0;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  rr(x - w / 2, y - h / 2, w, h, h * 0.4); ctx.fill();
  ctx.fillStyle = '#2A2438';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// 大きな みだし文字（かげ つき）
function bigText(s, x, y, size, col, shadow, align) {
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  if (shadow !== null) {
    ctx.fillStyle = shadow || 'rgba(0,0,0,0.42)';
    ctx.fillText(s, x + size * 0.06, y + size * 0.07);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

// 文字が はこに 入る 大きさを さがす
function fitSize(text, maxW, start) {
  let fs = start;
  for (let i = 0; i < 20; i++) {
    ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
    if (ctx.measureText(text).width <= maxW || fs <= 8) break;
    fs = Math.max(8, Math.floor(fs * 0.92));
  }
  return fs;
}
