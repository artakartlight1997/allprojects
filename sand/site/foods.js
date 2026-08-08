// サンドイッチの ざいりょう 15こ。絵は ぜんぶ ここで かく（画像ファイルなし）。
//
// かくのは「ゲームの 中の 大きさ」。たては VH = 450 に きめて、
// あとで 画面の 大きさへ まとめて のばす。どの スマホでも 同じ 見た目。

'use strict';

const VH = 450;

// h … サンドイッチに つんだ ときの あつさ
const FOODS = {
  bread:   { name: 'パン',        col: '#E8B870', h: 22, kind: 'bread' },
  butter:  { name: 'バター',      col: '#FFE9A0', h: 5,  kind: 'flat' },
  lettuce: { name: 'レタス',      col: '#8FD86A', h: 14, kind: 'frill' },
  tomato:  { name: 'トマト',      col: '#F0604A', h: 11, kind: 'round' },
  cheese:  { name: 'チーズ',      col: '#FFD24A', h: 8,  kind: 'flat' },
  ham:     { name: 'ハム',        col: '#F5A0A8', h: 9,  kind: 'wave' },
  egg:     { name: 'たまご',      col: '#FFF0C0', h: 15, kind: 'egg' },
  cucumber:{ name: 'きゅうり',    col: '#7ECB6A', h: 8,  kind: 'round' },
  chicken: { name: 'チキン',      col: '#D8A868', h: 14, kind: 'chunk' },
  bacon:   { name: 'ベーコン',    col: '#E07A62', h: 8,  kind: 'wave' },
  avocado: { name: 'アボカド',    col: '#9CC46A', h: 12, kind: 'chunk' },
  tuna:    { name: 'ツナ',        col: '#F0D8B0', h: 12, kind: 'chunk' },
  onion:   { name: 'たまねぎ',    col: '#F2E4F0', h: 7,  kind: 'ring' },
  mayo:    { name: 'マヨネーズ',  col: '#FFFBEA', h: 5,  kind: 'zigzag' },
  jam:     { name: 'いちごジャム', col: '#E0405A', h: 6,  kind: 'flat' },
};

function rr3(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// ざいりょうを 1まい かく。x,y は まん中の 上のはし、w は はば。
function drawFood(ctx, key, x, y, w, t) {
  const f = FOODS[key];
  const h = f.h;
  ctx.save();
  ctx.translate(x, y);
  if (f.kind === 'bread') {
    ctx.fillStyle = '#C89050';
    rr3(ctx, -w / 2, 0, w, h, 7); ctx.fill();
    ctx.fillStyle = '#F6E2BE';
    rr3(ctx, -w / 2 + 4, 3, w - 8, h - 7, 5); ctx.fill();
    // ゴマ
    ctx.fillStyle = 'rgba(180,140,80,0.7)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(-w / 2 + 12 + i * (w - 24) / 4, 5, 2.2, 1.4, 0.4, 0, 7); ctx.fill();
    }
  } else if (f.kind === 'frill') {
    // レタス。ふちが もこもこ。
    ctx.fillStyle = f.col;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h);
    for (let i = 0; i <= 10; i++) {
      const px = -w / 2 + (w * i) / 10;
      const py = 2 + Math.sin(i * 1.9 + (t || 0)) * 5;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w / 2, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, h - 3);
    for (let i = 0; i <= 8; i++) {
      ctx.lineTo(-w / 2 + 6 + ((w - 12) * i) / 8, 7 + Math.sin(i * 1.7) * 3);
    }
    ctx.lineTo(w / 2 - 6, h - 3); ctx.closePath(); ctx.fill();
  } else if (f.kind === 'round') {
    // まるい きりみを ならべる
    const n = Math.max(2, Math.round(w / 34));
    for (let i = 0; i < n; i++) {
      const cx2 = -w / 2 + (w * (i + 0.5)) / n;
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.ellipse(cx2, h / 2, w / n / 2 - 1, h / 2 + 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = key === 'tomato' ? 'rgba(255,190,170,0.8)' : 'rgba(230,255,210,0.85)';
      ctx.beginPath(); ctx.ellipse(cx2, h / 2, w / n / 2 - 5, h / 2 - 1.5, 0, 0, 7); ctx.fill();
      if (key === 'cucumber') {
        ctx.fillStyle = 'rgba(120,190,100,0.6)';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(cx2 - 3 + k * 3, h / 2, 1.1, 0, 7); ctx.fill();
        }
      }
    }
  } else if (f.kind === 'wave') {
    ctx.fillStyle = f.col;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    for (let i = 0; i <= 12; i++) {
      ctx.lineTo(-w / 2 + (w * i) / 12, Math.sin(i * 1.1) * 3);
    }
    for (let i = 12; i >= 0; i--) {
      ctx.lineTo(-w / 2 + (w * i) / 12, h + Math.sin(i * 1.1) * 3);
    }
    ctx.closePath(); ctx.fill();
    if (key === 'bacon') {
      ctx.fillStyle = 'rgba(255,230,220,0.75)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2, h * 0.3 + i * 2);
        for (let k = 0; k <= 12; k++) {
          ctx.lineTo(-w / 2 + (w * k) / 12, h * 0.3 + Math.sin(k * 1.1 + i) * 3);
        }
        ctx.lineTo(w / 2, h * 0.45 + i * 2); ctx.closePath(); ctx.fill();
      }
    }
  } else if (f.kind === 'egg') {
    ctx.fillStyle = f.col;
    rr3(ctx, -w / 2, 0, w, h, 6); ctx.fill();
    ctx.fillStyle = '#FFC63A';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-w / 4 + i * (w / 4), h / 2, 7, 5, 0.2 * i, 0, 7); ctx.fill();
    }
  } else if (f.kind === 'chunk') {
    const n = Math.max(3, Math.round(w / 26));
    for (let i = 0; i < n; i++) {
      const cx2 = -w / 2 + (w * (i + 0.5)) / n;
      ctx.fillStyle = f.col;
      rr3(ctx, cx2 - w / n / 2 + 2, 1, w / n - 4, h - 2, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      rr3(ctx, cx2 - w / n / 2 + 4, 3, w / n - 12, 3, 2); ctx.fill();
    }
  } else if (f.kind === 'ring') {
    ctx.strokeStyle = f.col; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const cx2 = -w / 2 + (w * (i + 0.5)) / 4;
      ctx.beginPath(); ctx.ellipse(cx2, h / 2, w / 12, h / 2, 0, 0, 7); ctx.stroke();
    }
  } else if (f.kind === 'zigzag') {
    // マヨネーズは しろい ので、そのままだと しろい 上で 見えない。
    // まわりに うすい 色の ふちを つける。
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      ctx.lineTo(-w / 2 + 4 + ((w - 8) * i) / 14, i % 2 ? 1 : h - 1);
    }
    ctx.strokeStyle = '#E0C88A'; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = f.col; ctx.lineWidth = 5; ctx.stroke();
  } else {
    ctx.fillStyle = f.col;
    rr3(ctx, -w / 2 + 3, 0, w - 6, h, 3); ctx.fill();
    if (key === 'jam') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(-w / 3 + i * (w / 4.5), h / 2, 2, 0, 7); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// つみあげた サンドイッチを かく。keys は 下から 上への じゅんばん。
// y は 一番下の 高さ。もどり値は 一番上の 高さ。
function drawSandwich(ctx, keys, x, y, w, t, upto) {
  let cur = y;
  const n = upto === undefined ? keys.length : upto;
  for (let i = 0; i < n && i < keys.length; i++) {
    const f = FOODS[keys[i]];
    cur -= f.h;
    drawFood(ctx, keys[i], x, cur, w, t);
  }
  return cur;
}

function sandHeight(keys, upto) {
  let h = 0;
  const n = upto === undefined ? keys.length : upto;
  for (let i = 0; i < n && i < keys.length; i++) h += FOODS[keys[i]].h;
  return h;
}

// ちいさい まる アイコン（けっか画面や せんたく画面 用）
function drawFoodChip(ctx, key, x, y, r) {
  const f = FOODS[key];
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 2, 0, 7); ctx.clip();
  // うすい ざいりょう（バターや マヨネーズ）は そのままだと
  // まるの 中で 1本の 線に しか 見えない。たてに のばして 見やすく する。
  const sc = Math.min(3.4, Math.max(1, (r * 1.15) / f.h));
  ctx.translate(x, y);
  ctx.scale(1, sc);
  drawFood(ctx, key, 0, -f.h / 2, r * 1.7, 0);
  ctx.restore();
}
