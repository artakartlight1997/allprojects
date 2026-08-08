// 面（ミニゲーム）の 中身。リズムの ならびと、絵の かきかた。
//
// リズムは 8分音符の ますめを 文字で 書く。1小節 = 8文字。
//   'o' … きみが たたく    'c' … パパが たたく（お手本）    '.' … なし
// 文字の いちが そのまま 拍に なる（i 文字め = i/2 拍）。
//
// おてほんの メロディは この ならびから 作る。だから
// 「曲に 合わせて たたく」と かならず 曲が できあがる。

'use strict';

// --- 絵の どうぐ ---------------------------------------------------------------

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
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
    if (ctx.measureText(text).width <= maxW || fs <= 8) break;
    fs = Math.max(8, Math.floor(fs * 0.9));
  }
  return fs;
}

const RINA = { skin: '#F6CFAC', hair: '#5A3A26', body: '#F06A9C', leg: '#4A6ACF', pig: true };
const PAPA = { skin: '#EAC29C', hair: '#2E2A28', body: '#3E7ACF', leg: '#3A3A44' };
const ROBO = { skin: '#CFE0F0', hair: '#8FA8C8', body: '#E85C8A', leg: '#5A6478', robot: true };

// 正面むきの ちびキャラ。
// o.arm  … うでを ひらく 角度。0=下ろす / 1.6=よこ / 2.6=ばんざい
//          （左は -arm、右は +arm2 の むき。だから 正の 数ほど 外に ひらく）
// o.squash … しゃがみ
// o.face … 'n' ふつう / 'h' うれしい / 'x' しっぱい / 'o' かけ声
function chibi(x, y, s, o) {
  const sq = o.squash || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 2, s * 0.42, s * 0.13, 0, 0, 7); ctx.fill();
  ctx.scale(1 + sq * 0.18, 1 - sq * 0.22);

  // あし
  ctx.fillStyle = o.leg;
  const lg = s * 0.30;
  rr(ctx, -s * 0.26, -lg, s * 0.20, lg, s * 0.06); ctx.fill();
  rr(ctx, s * 0.06, -lg, s * 0.20, lg, s * 0.06); ctx.fill();

  // からだ
  const by = -lg - s * 0.42;
  ctx.fillStyle = o.body;
  rr(ctx, -s * 0.30, by, s * 0.60, s * 0.44, o.robot ? s * 0.06 : s * 0.16); ctx.fill();

  // うで
  const a = o.arm || 0;
  ctx.strokeStyle = o.skin;
  ctx.lineWidth = s * 0.13;
  ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    const ang = (o.arm2 !== undefined && sgn > 0 ? o.arm2 : a) * sgn;
    ctx.beginPath();
    ctx.moveTo(sgn * s * 0.28, by + s * 0.1);
    ctx.lineTo(sgn * s * 0.28 + Math.sin(ang) * s * 0.40,
               by + s * 0.1 + Math.cos(ang) * s * 0.34);
    ctx.stroke();
  }

  // あたま
  const hy = by - s * 0.28;
  ctx.fillStyle = o.skin;
  if (o.robot) { rr(ctx, -s * 0.28, hy - s * 0.28, s * 0.56, s * 0.56, s * 0.1); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, hy, s * 0.30, 0, 7); ctx.fill(); }
  ctx.fillStyle = o.hair;
  if (o.robot) {
    rr(ctx, -s * 0.30, hy - s * 0.30, s * 0.60, s * 0.16, s * 0.06); ctx.fill();
    ctx.fillRect(-s * 0.03, hy - s * 0.46, s * 0.06, s * 0.16);
    ctx.beginPath(); ctx.arc(0, hy - s * 0.48, s * 0.06, 0, 7); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, hy - s * 0.03, s * 0.30, Math.PI, 0); ctx.fill();
    ctx.fillRect(-s * 0.30, hy - s * 0.06, s * 0.60, s * 0.08);
    if (o.pig) {
      ctx.beginPath(); ctx.arc(-s * 0.31, hy + s * 0.02, s * 0.11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.31, hy + s * 0.02, s * 0.11, 0, 7); ctx.fill();
    }
  }

  // かお
  const f = o.face || 'n';
  ctx.fillStyle = '#33313E';
  const ey = hy + s * 0.04;
  if (f === 'h') {
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sgn * s * 0.11, ey + s * 0.02, s * 0.055, Math.PI, 0, true);
      ctx.lineWidth = s * 0.035; ctx.strokeStyle = '#33313E'; ctx.stroke();
    }
  } else if (f === 'x') {
    ctx.lineWidth = s * 0.035; ctx.strokeStyle = '#33313E';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * s * 0.11 - s * 0.05, ey - s * 0.05);
      ctx.lineTo(sgn * s * 0.11 + s * 0.05, ey + s * 0.05);
      ctx.moveTo(sgn * s * 0.11 + s * 0.05, ey - s * 0.05);
      ctx.lineTo(sgn * s * 0.11 - s * 0.05, ey + s * 0.05);
      ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.arc(-s * 0.11, ey, s * 0.045, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.11, ey, s * 0.045, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#C4506A';
  if (f === 'o') {
    ctx.beginPath(); ctx.ellipse(0, hy + s * 0.15, s * 0.07, s * 0.09, 0, 0, 7); ctx.fill();
  } else {
    rr(ctx, -s * 0.06, hy + s * 0.13, s * 0.12, s * 0.03, s * 0.015); ctx.fill();
  }
  ctx.restore();
}

// --- リズムの ならびを 作る -----------------------------------------------------

function barNotes(bar, s, g) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== 'o' && ch !== 'c') continue;
    out.push({ b: bar * 4 + i * 0.5, i, k: ch === 'c' ? 'call' : 'tap', g });
  }
  return out;
}

// 面ぜんぶ の ならび。intro 小節ぶん あけてから ならべる。
function makeNotes(st) {
  let out = [];
  st.pats.forEach((s, i) => { out = out.concat(barNotes(st.intro + i, s, st.gi)); });
  return decorate(out, st);
}

// 音の 高さ・お知らせ音・もぐらの あな を 決める
function decorate(notes, st) {
  let n3 = 0;
  for (const n of notes) {
    const g = STAGES[n.g];
    n.p = g.root + g.pitch[n.i % g.pitch.length];
    n.pre = !!g.pre && n.k === 'tap';
    n.gd = g.guide !== false && n.k === 'tap';
    n.lane = (n3++) % 3;
    n.res = '';
  }
  return notes;
}

// --- ミニゲーム ----------------------------------------------------------------
//
// draw(v) の v は { beat, notes, hitT, missT, poseI }。
// ぜんぶ beat から 計算するので、コマ落ちしても 絵と 音が ずれない。

const STAGES = [];

function bg(a, b) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function floor(y, col) {
  ctx.fillStyle = col;
  ctx.fillRect(0, y, W, H - y);
}

// ぱっと 出る 星
function burst(x, y, r, t, col) {
  const a = Math.max(0, 1 - t);
  if (a <= 0) return;
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2, r * 0.12 * a);
  ctx.globalAlpha = a;
  for (let i = 0; i < 6; i++) {
    const ang = i * 1.047 + t;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r * (0.4 + t), y + Math.sin(ang) * r * (0.4 + t));
    ctx.lineTo(x + Math.cos(ang) * r * (0.9 + t * 1.4), y + Math.sin(ang) * r * (0.9 + t * 1.4));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ===== 1 ねこパンチ =============================================================

STAGES.push({
  gi: 0,
  key: 'neko',
  name: 'ねこパンチ',
  desc: 'とんでくる まりを ビートで パンチ',
  col: '#F0864A',
  bpm: 104, intro: 2, root: 72,
  pitch: [0, 2, 4, 5, 7, 5, 4, 2],
  drum: 'basic', prog: [0, 0, 5, 7], min: [2],
  hit: 'punch',
  pre: true,
  pats: [
    'o...o...', 'o...o...', 'o.o.o.o.', 'o...o...',
    'o...oo..', 'o.o.o.o.', 'oo..oo..', 'o.......',
    'o...o...', 'o.o.o.o.', 'o..oo...', 'o.o.....',
    'oo.oo...', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    bg('#FFD9A8', '#F2A05C');
    const gy = H * 0.74;
    floor(gy, '#8C5A38');
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, gy + i * H * 0.05, W, H * 0.016);

    const s = H * 0.34, px = W * 0.15, fist = px + s * 0.78;
    // まり（2拍 かけて とんでくる）
    for (const n of v.notes) {
      if (n.g !== 0) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.7) continue;
      const x = fist + (d / 2) * (W + H * 0.2 - fist);
      const y = gy - s * 0.62 - Math.sin(Math.max(0, Math.min(1, 1 - d / 2)) * Math.PI) * H * 0.06;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(fist, y, H * 0.09, (-d) * 1.8, '#FFF0A0');
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#9E9E9E' : '#E8465C';
      ctx.beginPath(); ctx.arc(x, y, H * 0.055, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(2, H * 0.007);
      ctx.beginPath();
      ctx.arc(x, y, H * 0.055, v.beat * 2, v.beat * 2 + 2.2);
      ctx.stroke();
    }

    const punch = Math.max(0, 1 - (v.beat - v.hitB) * 3.5);
    chibi(px, gy, s, Object.assign({}, RINA, {
      arm: 0.35, arm2: 1.05 + punch * 0.55,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : punch > 0.3 ? 'o' : 'n',
      squash: punch * 0.25,
    }));
  },
});

// ===== 2 なわとび ===============================================================

STAGES.push({
  gi: 1,
  key: 'nawa',
  name: 'なわとび',
  desc: 'なわが 下に きたら ジャンプ',
  col: '#4FB0D8',
  bpm: 116, intro: 2, root: 71,
  pitch: [0, 4, 7, 4, 9, 7, 5, 4],
  drum: 'disco', prog: [0, 7, 5, 7], min: [],
  hit: 'jump',
  pre: false,
  pats: [
    'o.o.o.o.', 'o.o.o.o.', 'o.o.o.o.', 'o.o.o.o.',
    'o.o.o.o.', 'o.o.o.o.', 'o.o.oo..', 'o.o.o.o.',
    'o.o.o.o.', 'o.o.oo..', 'o.o.o.o.', 'oo..oo..',
    'o.o.o.o.', 'o.o.oo..', 'oo..oo..', 'o.......',
  ],
  draw(v) {
    bg('#BFE8F6', '#63B4D8');
    const gy = H * 0.78;
    floor(gy, '#6EC46A');
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, gy, W, H * 0.012);

    const cx = W / 2, s = H * 0.30;
    // なわ。つぎの 音 で ちょうど 下に くるように まわす。
    let prev = v.beat - 4, next = v.beat + 4;
    for (const n of v.notes) {
      if (n.g !== 1) continue;
      if (n.b <= v.beat && n.b > prev) prev = n.b;
      if (n.b > v.beat && n.b < next) next = n.b;
    }
    const u = next > prev ? (v.beat - prev) / (next - prev) : 0;
    const ang = u * Math.PI * 2 - Math.PI / 2;
    const rx = H * 0.30, ry = H * 0.30;
    ctx.strokeStyle = '#D8483C'; ctx.lineWidth = Math.max(3, H * 0.012);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a2 = -Math.PI / 2 + (i / 24) * Math.PI * 2;
      const rr2 = 1 + Math.cos(a2 - ang) * 0.06;
      const x = cx + Math.cos(a2) * rx * rr2 * 1.25;
      const y = gy - ry + Math.sin(a2) * ry * rr2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // なわの 手もと
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rx * 1.25, gy - ry + Math.sin(ang) * ry,
                             H * 0.022, 0, 7); ctx.fill();

    // ジャンプ
    const jt = (v.beat - v.hitB) / 0.62;
    const jump = jt >= 0 && jt <= 1 ? Math.sin(jt * Math.PI) * H * 0.14 : 0;
    const pre = Math.max(0, Math.min(1, 1 - (next - v.beat) * 4));
    chibi(cx, gy - jump, s, Object.assign({}, RINA, {
      arm: 1.35 + jump / H * 1.6,
      squash: jump > 0 ? 0 : pre * 0.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : jump > 0 ? 'o' : 'n',
    }));
  },
});

// ===== 3 もぐらポカポカ =========================================================

STAGES.push({
  gi: 2,
  key: 'mogura',
  name: 'もぐらポカポカ',
  desc: 'あなから 出た もぐらを たたく',
  col: '#8FBE4A',
  bpm: 126, intro: 2, root: 74,
  pitch: [0, 3, 5, 7, 10, 7, 5, 3],
  drum: 'funk', prog: [0, 3, 5, 7], min: [0, 1, 2, 3],
  hit: 'pop',
  pre: true,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o...o.o.',
    'o.o.o.o.', 'o...oo..', 'o.o.o.o.', 'o.......',
    'o..o..o.', 'o...o...', 'o.o.o.o.', 'oo..o...',
    'o..o..o.', 'o.o.o.o.', 'oo.oo.o.', 'o.......',
  ],
  draw(v) {
    bg('#CFE8A8', '#7FA84A');
    const gy = H * 0.70;
    floor(gy, '#7A5C3A');

    const lx = [W * 0.26, W * 0.5, W * 0.74];
    const hr = H * 0.10;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#3E2C1C';
      ctx.beginPath(); ctx.ellipse(lx[i], gy + H * 0.03, hr, hr * 0.42, 0, 0, 7); ctx.fill();
    }
    for (const n of v.notes) {
      if (n.g !== 2) continue;
      const d = n.b - v.beat;
      if (d > 1.1 || d < -0.9) continue;
      // -0.9拍で 顔を 出して、0拍で いちばん 上、そのあと ひっこむ
      let up = d > 0 ? 1 - Math.min(1, d / 0.9) : 1 - Math.min(1, (-d) / 0.7);
      up = Math.max(0, up);
      if (n.res && d < 0) {
        burst(lx[n.lane], gy - H * 0.08, H * 0.08, (-d) * 2, '#FFF0A0');
        if (n.res !== 'miss') continue;
      }
      const y = gy + H * 0.02 - up * H * 0.14;
      ctx.save();
      ctx.beginPath(); ctx.rect(lx[n.lane] - hr, 0, hr * 2, gy + H * 0.03); ctx.clip();
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : '#A9743E';
      ctx.beginPath(); ctx.arc(lx[n.lane], y, H * 0.072, 0, 7); ctx.fill();
      ctx.fillStyle = '#F0C8A0';
      ctx.beginPath(); ctx.ellipse(lx[n.lane], y + H * 0.026, H * 0.03, H * 0.022, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2A2028';
      ctx.beginPath(); ctx.arc(lx[n.lane] - H * 0.026, y - H * 0.012, H * 0.011, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(lx[n.lane] + H * 0.026, y - H * 0.012, H * 0.011, 0, 7); ctx.fill();
      ctx.restore();
    }

    const swing = Math.max(0, 1 - (v.beat - v.hitB) * 4);
    // ハンマー。たたいた あなの 上に ふり下ろす。
    const hx = lx[Math.max(0, Math.min(2, v.hitLane))];
    if (swing > 0) {
      const ang = -1.0 + (1 - swing) * 1.0;
      ctx.save();
      ctx.translate(hx, gy - H * 0.10);
      ctx.rotate(ang);
      ctx.strokeStyle = '#8C5A2C'; ctx.lineWidth = H * 0.022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -H * 0.22); ctx.stroke();
      ctx.fillStyle = '#D8544A';
      rr(ctx, -H * 0.075, -H * 0.30, H * 0.15, H * 0.085, H * 0.02); ctx.fill();
      ctx.restore();
    }
    chibi(W * 0.93, H * 0.99, H * 0.24, Object.assign({}, RINA, {
      arm: 1.2 + swing * 1.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swing > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 4 まねっこ たいこ ========================================================

const CALL_PAIRS = [
  'o...o...', 'o...o...', 'o.o.o...', 'o...oo..',
  'o.o.o.o.', 'oo..o...', 'o..oo.o.', 'oo.o.o..',
];

STAGES.push({
  gi: 3,
  key: 'mane',
  name: 'まねっこ たいこ',
  desc: 'パパの リズムを よく きいて まねる',
  col: '#D8564A',
  bpm: 112, intro: 2, root: 69,
  pitch: [0, 0, 0, 0, 0, 0, 0, 0],
  drum: 'taiko', prog: [0, 0, 5, 5], min: [],
  hit: 'taiko',
  pre: false, guide: false,
  pats: (function () {
    const out = [];
    for (const p of CALL_PAIRS) { out.push(p.replace(/o/g, 'c')); out.push(p); }
    return out;
  })(),
  draw(v) {
    bg('#FFE0C4', '#E88A6A');
    const gy = H * 0.80;
    floor(gy, '#B0603C');

    const bar = Math.floor(v.beat / 4);
    const mine = ((bar - 2) % 2) === 1 && v.beat >= 8;

    const s = H * 0.30, dy = gy;
    for (const [cx, who, isMine] of [[W * 0.28, PAPA, false], [W * 0.72, RINA, true]]) {
      const last = isMine ? v.hitB : v.callB;
      const sw = Math.max(0, Math.min(1, 1 - (v.beat - last) * 4));
      const tr = H * 0.115;
      // 人が うしろ、たいこが 手まえ
      chibi(cx, dy, s, Object.assign({}, who, {
        arm: 1.15 + sw * 1.15,
        face: !isMine && sw > 0.3 ? 'o'
            : isMine && v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x'
            : isMine && mine ? 'h' : 'n',
      }));
      ctx.fillStyle = '#8C3A2C';
      rr(ctx, cx - tr, dy - tr * 1.15, tr * 2, tr * 1.15, tr * 0.22); ctx.fill();
      ctx.fillStyle = sw > 0.2 ? '#FFF6D0' : '#F0E0C0';
      ctx.beginPath();
      ctx.ellipse(cx, dy - tr * 1.15, tr * (1 + sw * 0.07), tr * 0.4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5E2418'; ctx.lineWidth = Math.max(2, tr * 0.08);
      ctx.beginPath();
      ctx.ellipse(cx, dy - tr * 1.15, tr, tr * 0.4, 0, 0, 7); ctx.stroke();
      if (sw > 0) burst(cx, dy - tr * 1.2, tr * 1.1, 1 - sw, '#FFD166');
    }

    // いまは きく ばん？ たたく ばん？（下に 出す。上は 文字と ぶつかる）
    ctx.fillStyle = mine ? 'rgba(255,209,102,0.94)' : 'rgba(60,50,80,0.6)';
    const bw = W * 0.36, bh = H * 0.11;
    rr(ctx, W / 2 - bw / 2, H * 0.85, bw, bh, 12); ctx.fill();
    ctx.fillStyle = mine ? '#4A3208' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = v.beat < 8 ? 'よく きいてね' : mine ? 'きみの ばん！' : 'パパの ばん';
    fitFont(lab, bw * 0.86, bh * 0.6, 'bold ');
    ctx.fillText(lab, W / 2, H * 0.85 + bh / 2);
    ctx.textAlign = 'left';
  },
});

// ===== 5 ロボダンス =============================================================

STAGES.push({
  gi: 4,
  key: 'robo',
  name: 'ロボダンス',
  desc: 'うらびょうし も ある。ポーズを きめろ',
  col: '#9B6AE0',
  bpm: 120, intro: 2, root: 76,
  pitch: [0, -3, 2, -5, 4, -1, 2, -3],
  drum: 'march', prog: [0, 5, 3, 7], min: [0, 2],
  hit: 'robo',
  pre: false,
  pats: [
    'o...o...', 'o...o...', 'o.o.o.o.', '..o...o.',
    'o.o.o.o.', '..o...o.', 'o..o..o.', 'o.......',
    '.o.o.o.o', 'o.o.o.o.', '.o.o.o.o', 'o.......',
    'o..o..o.', '.o.o.o.o', 'oo..oo..', 'o.......',
  ],
  draw(v) {
    bg('#2A1E4A', '#5A3A8C');
    // ゆかの ライト
    const gy = H * 0.80;
    for (let i = 0; i < 6; i++) {
      const on = (Math.floor(v.beat) + i) % 3 === 0;
      ctx.fillStyle = on ? 'rgba(255,120,200,0.55)' : 'rgba(255,255,255,0.10)';
      ctx.fillRect(W * (i / 6), gy, W / 6 - 2, H - gy);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, gy - H * 0.008, W, H * 0.008);

    // つぎの 音の 目じるし（ちいさい 玉が よこから 近づく）
    const cx = W / 2;
    for (const n of v.notes) {
      if (n.g !== 4) continue;
      const d = n.b - v.beat;
      if (d > 2 || d < -0.35) continue;
      const x = cx + (d / 2) * W * 0.46;
      const a = d < 0 ? Math.max(0, 1 + d * 3) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = n.res === 'miss' ? '#8E8E9E' : (n.i % 2 ? '#7FE0C0' : '#FFD166');
      ctx.beginPath(); ctx.arc(x, H * 0.30, H * 0.034, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ここに 来たら たたく、の 目じるし
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, cx - H * 0.045, H * 0.235, H * 0.09, H * 0.13, H * 0.02); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(3, H * 0.008);
    ctx.beginPath();
    ctx.moveTo(cx, H * 0.235); ctx.lineTo(cx, H * 0.365); ctx.stroke();

    const sw = Math.max(0, 1 - (v.beat - v.hitB) * 3);
    const pose = v.poseI % 4;
    chibi(cx, gy + H * 0.14, H * 0.32, Object.assign({}, ROBO, {
      arm: [1.5, 0.4, 2.4, 1.0][pose] + sw * 0.3,
      arm2: [0.4, 1.5, 1.0, 2.4][pose],
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'n',
      squash: sw * 0.2,
    }));
  },
});

// ===== 6 リミックス =============================================================
//
// 4小節ずつ 前の 面が つぎつぎ 出てくる。リズム天国 の おたのしみ。

const REMIX_SEG = [
  { g: 0, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.o.o...'] },
  { g: 1, pats: ['o.o.o.o.', 'o.o.o.o.', 'o.o.oo..', 'o.o.o.o.'] },
  { g: 2, pats: ['o...o...', 'o.o.o...', 'o..o..o.', 'o.o.o.o.'] },
  { g: 3, pats: ['o...o...', 'o.o.o...', 'o...oo..', 'oo..o...'] },
  { g: 4, pats: ['o.o.o.o.', '.o.o.o.o', 'o..o..o.', 'o.......'] },
  { g: 0, pats: ['oo..oo..', 'o.o.o.o.', 'o..oo...', 'o.......'] },
];

STAGES.push({
  gi: 5,
  key: 'remix',
  name: 'リミックス',
  desc: 'ぜんぶが つぎつぎ 出てくる さいごの 面',
  col: '#F0C020',
  bpm: 124, intro: 2, root: 72,
  pitch: [0, 2, 4, 7, 9, 7, 4, 2],
  drum: 'funk', prog: [0, 5, 3, 7], min: [2],
  hit: 'pop',
  pre: true,
  remix: true,
  pats: (function () {
    const out = [];
    for (const s of REMIX_SEG) for (const p of s.pats) out.push(p);
    return out;
  })(),
  segAt(bar) {
    const i = Math.floor((bar - 2) / 4);
    return REMIX_SEG[Math.max(0, Math.min(REMIX_SEG.length - 1, i))].g;
  },
  draw(v) {
    const g = this.segAt(Math.floor(v.beat / 4));
    // その 面の 絵を そのまま つかう。音符だけ 付けかえる。
    const sub = STAGES[g];
    const saved = [];
    for (const n of v.notes) { saved.push(n.g); n.g = g; }
    sub.draw.call(sub, v);
    let i = 0;
    for (const n of v.notes) n.g = saved[i++];
    // どの ミニゲームか 出す
    ctx.fillStyle = 'rgba(20,14,34,0.55)';
    const bw = W * 0.3, bh = H * 0.085;
    rr(ctx, W - bw - H * 0.03, H * 0.14, bw, bh, 10); ctx.fill();
    ctx.fillStyle = sub.col;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitFont(sub.name, bw * 0.88, bh * 0.6, 'bold ');
    ctx.fillText(sub.name, W - bw / 2 - H * 0.03, H * 0.14 + bh / 2);
    ctx.textAlign = 'left';
  },
});

// リミックスの 音符は、その ときの ミニゲームの ものに する
STAGES[5].fixNotes = function (notes) {
  for (const n of notes) {
    const g = this.segAt(Math.floor(n.b / 4));
    n.hit = STAGES[g].hit;
    n.pre = !!STAGES[g].pre;
  }
  return notes;
};
