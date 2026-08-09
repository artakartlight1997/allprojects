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

// 'o' たたく / 'c' お手本 / 's' さけぶ（見ためだけ ちがう たたく）
// 'h' 1拍 ながおしして ここで はなす / 'H' 2拍 ながおし
function barNotes(bar, s, g) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('ocsh H'.indexOf(ch) < 0 || ch === ' ') continue;
    const b = bar * 4 + i * 0.5;
    const n = { b, i, g, k: 'tap' };
    if (ch === 'c') n.k = 'call';
    else if (ch === 's') n.kk = 'shout';
    else if (ch === 'h') { n.k = 'hold'; n.hb = b - 1; }
    else if (ch === 'H') { n.k = 'hold'; n.hb = b - 2; }
    out.push(n);
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
    n.preAt = g.preAt === undefined ? 1 : g.preAt;
    n.preKind = g.preKind || '';
    n.gd = g.guide !== false && n.k === 'tap';
    if (n.kk === 'shout') n.hit = 'shout';
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
  rule: 'まりが とんできたら タップ！ 1拍まえに「ヒュー」と 鳴るよ',
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
    const G = this.gi;
    bg('#FFD9A8', '#F2A05C');
    const gy = H * 0.74;
    floor(gy, '#8C5A38');
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, gy + i * H * 0.05, W, H * 0.016);

    const s = H * 0.34, px = W * 0.15, fist = px + s * 0.78;
    // まり（2拍 かけて とんでくる）
    for (const n of v.notes) {
      if (n.g !== G) continue;
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
  desc: 'なわが 足もとに きたら ジャンプ',
  rule: 'なわが 足もとに きたら タップ！ なわの 下の しるしを 見ててね',
  col: '#4FB0D8',
  bpm: 108, intro: 2, root: 71,
  pitch: [0, 4, 7, 4, 9, 7, 5, 4],
  drum: 'disco', prog: [0, 7, 5, 7], min: [],
  hit: 'jump',
  pre: true, preAt: 0.5, preKind: 'swish',
  // 音符の あいだが なわの 1まわり。だから ならびを 見れば
  // 「ゆっくり まわる 小節」「ふつうの 小節」が そのまま わかる。
  //
  // 8分の ペア（'oo..'）は 入れない。なわの 速さが 小節の とちゅうで
  // 2ばいに なって、いきなり むずかしくなるため。
  pats: [
    'o...o...', 'o...o...', 'o...o...', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o...o...', 'o.o.o.o.',
    'o.o.o.o.', 'o...o...', 'o.o.o.o.', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o.o.o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#BFE8F6', '#63B4D8');
    const gy = H * 0.82;                     // ゆか
    floor(gy, '#6EC46A');
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, gy, W, H * 0.012);

    const cx = W / 2;
    const hx = W * 0.18, hx2 = W * 0.82;     // まわす人の 手
    const hy = gy - H * 0.34;

    // なわが つぎに 足もとへ 来るのは いつか
    let prev = v.beat - 2, next = v.beat + 2;
    for (const n of v.notes) {
      if (n.g !== G) continue;
      if (n.b <= v.beat && n.b > prev) prev = n.b;
      if (n.b > v.beat && n.b < next) next = n.b;
    }
    const u = next > prev ? (v.beat - prev) / (next - prev) : 0;   // 0→1 で 1まわり
    // u=0 …… 足もと（ここで とぶ）  u=0.5 …… 頭の上
    const midY = hy + (gy - hy) * Math.cos(u * Math.PI * 2);
    const near = Math.max(0, Math.min(1, 1 - (next - v.beat) * 3));  // 来るぞ！

    // 足もとの しるし。なわが 近づくほど 光る。
    ctx.fillStyle = 'rgba(255,220,90,' + (0.20 + near * 0.65) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, gy + H * 0.008, H * (0.11 + near * 0.05), H * (0.026 + near * 0.012), 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath();
    ctx.ellipse(cx, gy + H * 0.008, H * 0.11, H * 0.026, 0, 0, 7); ctx.stroke();

    // なわ。手から 手へ たれ下がる ひとすじ。
    // 下がってくる あいだは 手まえ、上がって いく あいだは うしろ。
    const drawRope = () => {
      const ctrlY = 2 * midY - hy;
      ctx.strokeStyle = midY > hy ? '#E8483C' : 'rgba(190,60,50,0.75)';
      ctx.lineWidth = Math.max(4, H * (0.014 + near * 0.008));
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(cx, ctrlY, hx2, hy);
      ctx.stroke();
    };
    const front = midY > hy;                 // 手の たかさより 下＝手まえ
    if (!front) drawRope();

    // まわす 2人。なわを 持つ ほうの うでを 上げる。
    const s2 = H * 0.30;
    const turn = u * Math.PI * 2;
    const up = 2.05 + Math.sin(turn) * 0.28;
    for (const [x, col, inner] of [[hx - W * 0.055, '#3E7ACF', 'r'],
                                   [hx2 + W * 0.055, '#59B07A', 'l']]) {
      chibi(x, gy, s2, Object.assign({}, PAPA, {
        body: col,
        arm: inner === 'l' ? up : 0.3,
        arm2: inner === 'r' ? up : 0.3,
        face: 'h',
      }));
    }

    // りな。とぶ 直前は しゃがみ、たたいた しゅんかんに もう 空中に いる。
    const jt = (v.beat - v.hitB + 0.18) / 0.78;
    const jump = jt >= 0 && jt <= 1 ? Math.sin(jt * Math.PI) * H * 0.17 : 0;
    chibi(cx, gy - jump, H * 0.32, Object.assign({}, RINA, {
      arm: 0.5 + (jump / H) * 3.5,
      squash: jump > 0 ? 0 : near * 0.45,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : jump > 0 ? 'o' : 'n',
    }));

    if (front) drawRope();

    // なわの 手もと
    ctx.fillStyle = '#FFD166';
    for (const x of [hx, hx2]) {
      ctx.beginPath(); ctx.arc(x, hy, H * 0.020, 0, 7); ctx.fill();
    }
  },
});

// ===== 3 もぐらポカポカ =========================================================

STAGES.push({
  gi: 2,
  key: 'mogura',
  name: 'もぐらポカポカ',
  desc: 'あなから 出た もぐらを たたく',
  rule: 'もぐらが あなから 顔を 出したら タップ！ あなは 3つ あるよ',
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
    const G = this.gi;
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
      if (n.g !== G) continue;
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
  rule: 'パパが 1小節 たたく → つぎの 1小節で 同じ リズムを まねる',
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
  rule: '玉が まん中の 線に きたら タップ！ うら拍（ずれた ところ）も あるよ',
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
    const G = this.gi;
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
      if (n.g !== G) continue;
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

// ===== 6 ねじまき ロボ ==========================================================
//
// リズム天国の「ロボット工場」みたいな ながおし。
// おして、上がっていく 音が てっぺんに ついたら はなす。

STAGES.push({
  gi: 5,
  key: 'neji',
  name: 'ねじまき ロボ',
  desc: 'おして、音が 上がりきったら はなす',
  rule: 'ロボが 近づいたら おしっぱなし。音が 上がりきって 線に きたら はなす',
  col: '#59A8C8',
  bpm: 108, intro: 2, root: 74,
  pitch: [0, 0, 5, 5, 7, 7, 9, 9],
  drum: 'march', prog: [0, 5, 7, 5], min: [],
  hit: 'screw',
  pre: false,
  pats: [
    '..h.....', '..h.....', '..h...h.', '..h...h.',
    '....H...', '..h...h.', '..h...h.', '....H...',
    '..h...h.', '..h...h.', '....H...', '..h...h.',
    '..h...h.', '....H...', '..h...h.', '..h.....',
  ],
  draw(v) {
    const G = this.gi;
    bg('#DCE8F0', '#7E97AE');
    const by = H * 0.62;                       // ベルトの 上の 面
    const cx = W * 0.56;                       // ここで はなす
    ctx.fillStyle = '#4A5468';
    ctx.fillRect(0, by, W, H * 0.10);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 16; i++) {
      const x = ((i * 76 - v.beat * 70) % (W + 76) + W + 76) % (W + 76) - 38;
      ctx.fillRect(x, by, 24, H * 0.10);
    }
    floor(by + H * 0.10, '#39415A');

    // 「ここで はなす」の しるし
    ctx.strokeStyle = 'rgba(255,209,102,0.9)';
    ctx.lineWidth = Math.max(3, H * 0.009);
    ctx.setLineDash([H * 0.03, H * 0.022]);
    ctx.beginPath(); ctx.moveTo(cx, H * 0.20); ctx.lineTo(cx, by); ctx.stroke();
    ctx.setLineDash([]);

    const hr = H * 0.075;
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const len = n.b - n.hb;
      const d = n.b - v.beat;
      if (d > len + 2.5 || d < -0.9) continue;
      const x = cx + (d / (len + 2.5)) * (W - cx + H * 0.2);
      const y = by - hr;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(cx, y, hr * 1.5, (-d) * 1.5, '#FFF0A0');
        continue;
      }
      // ロボの あたま
      ctx.fillStyle = n.res === 'miss' ? '#9AA0AA' : '#EEF3FA';
      rr(ctx, x - hr, y - hr, hr * 2, hr * 2, hr * 0.32); ctx.fill();
      ctx.fillStyle = '#B6C2D2';
      rr(ctx, x - hr, y + hr * 0.5, hr * 2, hr * 0.5, hr * 0.16); ctx.fill();
      ctx.fillStyle = '#2A3242';
      ctx.beginPath(); ctx.arc(x - hr * 0.34, y - hr * 0.1, hr * 0.15, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + hr * 0.34, y - hr * 0.1, hr * 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#7A8698';
      rr(ctx, x - hr * 0.3, y + hr * 0.24, hr * 0.6, hr * 0.12, hr * 0.06); ctx.fill();

      // ねじ。おしている あいだ まわって、しまり ぐあいが 輪で わかる
      const t = Math.max(0, Math.min(1, (v.beat - n.hb) / len));
      const sy = y - hr * 1.35;
      ctx.save();
      ctx.translate(x, sy);
      ctx.rotate(n.held ? t * 26 : 0);
      ctx.fillStyle = '#AEB8C8';
      rr(ctx, -hr * 0.42, -hr * 0.14, hr * 0.84, hr * 0.28, hr * 0.07); ctx.fill();
      rr(ctx, -hr * 0.14, -hr * 0.42, hr * 0.28, hr * 0.84, hr * 0.07); ctx.fill();
      ctx.restore();
      if (t > 0 && t < 1.02 && d > -0.2) {
        ctx.strokeStyle = n.held ? '#FFD166' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = Math.max(3, H * 0.012);
        ctx.beginPath();
        ctx.arc(x, sy, hr * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.min(1, t) * 6.283);
        ctx.stroke();
      }
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 3));
    chibi(W * 0.14, by + H * 0.10, H * 0.30, Object.assign({}, RINA, {
      arm: v.holding ? 2.3 : 1.5 - sw * 0.4, arm2: v.holding ? 2.3 : 1.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
      squash: v.holding ? 0.18 : 0,
    }));
    if (v.holding) {
      ctx.fillStyle = 'rgba(255,209,102,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('おしっぱなし！', W * 0.35, H * 0.055, 'bold ');
      ctx.fillText('おしっぱなし！', W * 0.30, H * 0.20);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 7 ピンポン ラリー ========================================================
//
// リズム天国の「リズムラリー」みたいに、あいてが 打ったら 打ちかえす。

STAGES.push({
  gi: 6,
  key: 'rally',
  name: 'ピンポン ラリー',
  desc: 'あいてが 打ったら 打ちかえす',
  rule: 'パパが 打った 玉が じぶんの ところに きたら タップ！',
  col: '#4FC08A',
  bpm: 120, intro: 2, root: 76,
  pitch: [0, 2, 4, 2, 5, 4, 2, 0],
  drum: 'disco', prog: [0, 0, 5, 7], min: [],
  hit: 'ball',
  pre: false,
  pats: [
    'c...o...', 'c...o...', 'c.o.c.o.', 'c.o.c.o.',
    'c...o...', 'c.o.c.o.', 'cocococo', 'c...o...',
    'c.o.c.o.', 'c.o.c.o.', 'cocococo', 'c...o...',
    'c.o.c.o.', 'cocococo', 'cocococo', 'c...o...',
  ],
  draw(v) {
    const G = this.gi;
    bg('#CFF0E0', '#3E9A7A');
    const gy = H * 0.92;                       // ゆか
    const ty = H * 0.60;                       // だいの 上の 面
    floor(gy, '#2A6A52');

    const px = W * 0.14, mx = W * 0.86;
    // たっきゅうだい
    ctx.fillStyle = '#2E7A5A';
    rr(ctx, W * 0.20, ty, W * 0.60, H * 0.035, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(W * 0.20, ty + H * 0.014, W * 0.60, 3);
    ctx.fillStyle = '#1E5A3E';
    ctx.fillRect(W * 0.26, ty + H * 0.035, H * 0.018, gy - ty - H * 0.035);
    ctx.fillRect(W * 0.74 - H * 0.018, ty + H * 0.035, H * 0.018, gy - ty - H * 0.035);
    // ネット
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(W / 2 - 1.5, ty - H * 0.055, 3, H * 0.055);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, W / 2 - W * 0.05, ty - H * 0.05, W * 0.10, H * 0.05, 3); ctx.fill();

    // 玉。1つ前の 音符から つぎの 音符へ とぶ
    let prev = null, next = null;
    for (const n of v.notes) {
      if (n.g !== G) continue;
      if (n.b <= v.beat && (!prev || n.b > prev.b)) prev = n;
      if (n.b > v.beat && (!next || n.b < next.b)) next = n;
    }
    if (next) {
      const from = prev ? (prev.k === 'call' ? mx : px) : mx;
      const to = next.k === 'call' ? mx : px;
      const b0 = prev ? prev.b : next.b - 2;
      const u = Math.max(0, Math.min(1, (v.beat - b0) / (next.b - b0)));
      const bx = from + (to - from) * u;
      const byy = ty - H * 0.05 - Math.sin(u * Math.PI) * H * 0.20;
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(bx, ty + H * 0.01, H * 0.026, H * 0.008, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFD166';
      ctx.beginPath(); ctx.arc(bx, byy, H * 0.030, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(bx - H * 0.010, byy - H * 0.010, H * 0.010, 0, 7); ctx.fill();
    }

    const s2 = H * 0.34;
    const swA = Math.max(0, Math.min(1, 1 - (v.beat - v.callB) * 4));
    const swR = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    // ラケットを 持つ うでを だいの ほうへ ふる
    chibi(mx, gy, s2, Object.assign({}, PAPA, {
      arm: 0.4, arm2: -0.6 - swA * 1.0, face: swA > 0.3 ? 'o' : 'n',
    }));
    chibi(px, gy, s2, Object.assign({}, RINA, {
      arm: -0.6 - swR * 1.0, arm2: 0.4,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swR > 0.3 ? 'o' : 'h',
    }));
    // ラケット
    for (const [x, sw, col, dir] of [[px, swR, '#E8465C', 1], [mx, swA, '#3E7ACF', -1]]) {
      ctx.save();
      ctx.translate(x + dir * s2 * 0.52, gy - s2 * 0.82);
      ctx.rotate(dir * (0.9 - sw * 1.5));
      ctx.strokeStyle = '#7A5030'; ctx.lineWidth = Math.max(3, H * 0.011);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, H * 0.045); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -H * 0.022, H * 0.030, H * 0.040, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  },
});

// ===== 8 りなアイドル ===========================================================
//
// リズム天国の「ファンクラブ」みたいに、手びょうしと かけ声。

STAGES.push({
  gi: 7,
  key: 'idol',
  name: 'りなアイドル',
  desc: '手びょうし と「キャー！」',
  rule: '玉が まん中の 線に きたら タップ！ ピンクの 玉は「キャー！」',
  col: '#F06AB0',
  bpm: 128, intro: 2, root: 79,
  pitch: [0, 0, 3, 3, 5, 5, 7, 7],
  drum: 'disco', prog: [0, 9, 5, 7], min: [1],
  hit: 'clap',
  pre: false,
  pats: [
    '..o...o.', '..o...s.', '..o...o.', '..o.o.s.',
    '..o...o.', '..o...s.', 'o.o.o.o.', '..o.o.s.',
    '..o...o.', 'o.o.o.s.', '..o.o.o.', '..o.o.s.',
    'o.o.o.o.', '..o.o.s.', 'o.o.o.oo', '......s.',
  ],
  draw(v) {
    const G = this.gi;
    bg('#3A1E4E', '#B0407A');
    const gy = H * 0.86;
    // ステージの あかり
    for (let i = 0; i < 5; i++) {
      const on = (Math.floor(v.beat * 2) + i) % 4 < 2;
      const x = W * (0.1 + i * 0.2);
      const g2 = ctx.createRadialGradient(x, 0, 10, x, 0, H * 0.9);
      g2.addColorStop(0, on ? 'rgba(255,200,120,0.30)' : 'rgba(160,140,255,0.14)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(x - W * 0.16, 0, W * 0.32, H);
    }
    floor(gy, '#2A1030');
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, gy, W, H * 0.01);

    // ファン（3人）。たたくと 手が 上がる
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    for (let i = 0; i < 3; i++) {
      chibi(W * (0.16 + i * 0.13), gy + H * 0.10, H * 0.17,
            Object.assign({}, PAPA, { body: ['#E0A040', '#40A0C0', '#A060D0'][i],
                                      arm: 1.4 + sw * 1.1, face: sw > 0.3 ? 'o' : 'h' }));
    }
    // りな（アイドル）
    const shout = v.shoutB !== undefined && v.beat - v.shoutB < 0.7 && v.beat >= v.shoutB;
    const jump = shout ? Math.sin(Math.max(0, (v.beat - v.shoutB)) / 0.7 * Math.PI) * H * 0.12 : 0;
    chibi(W * 0.72, gy - jump, H * 0.34, Object.assign({}, RINA, {
      arm: 1.5 + sw * 1.2, arm2: 2.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));

    // つぎに 来るのは 手びょうし？ かけ声？
    for (const n of v.notes) {
      if (n.g !== G || n.res) continue;
      const d = n.b - v.beat;
      if (d < 0 || d > 2) continue;
      const a = Math.max(0, 1 - d / 2);
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = n.kk === 'shout' ? '#FF7ABF' : '#FFE066';
      const x = W / 2 + (d / 2) * W * 0.4;
      ctx.beginPath(); ctx.arc(x, H * 0.30, H * 0.028, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(3, H * 0.008);
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.24); ctx.lineTo(W / 2, H * 0.36); ctx.stroke();
    if (shout) {
      ctx.fillStyle = '#FFB0D8';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('キャー！', W * 0.3, H * 0.09, 'bold ');
      ctx.fillText('キャー！', W * 0.72, gy - jump - H * 0.42);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 9・10 リミックス ==========================================================
//
// リズム天国の おたのしみ。4小節ずつ 前の ミニゲームが つぎつぎ 出てくる。

const REMIX1_SEG = [
  { g: 0, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.o.o...'] },
  { g: 1, pats: ['o.o.o.o.', 'o.o.o.o.', 'o.o.oo..', 'o.o.o.o.'] },
  { g: 2, pats: ['o...o...', 'o.o.o...', 'o..o..o.', 'o.o.o.o.'] },
  { g: 3, pats: ['o...o...', 'o.o.o...', 'o...oo..', 'oo..o...'] },
  { g: 4, pats: ['o.o.o.o.', '.o.o.o.o', 'o..o..o.', 'o.......'] },
  { g: 0, pats: ['oo..oo..', 'o.o.o.o.', 'o..oo...', 'o.......'] },
];

const REMIX2_SEG = [
  { g: 7, pats: ['..o...o.', '..o...s.', '..o.o.o.', '..o.o.s.'] },
  { g: 6, pats: ['c...o...', 'c.o.c.o.', 'c.o.c.o.', 'c...o...'] },
  { g: 5, pats: ['..h...h.', '..h...h.', '....H...', '..h.....'] },
  { g: 0, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.......'] },
  { g: 2, pats: ['o...o...', 'o.o.o...', 'o..o..o.', 'o.......'] },
  { g: 6, pats: ['c.o.c.o.', 'cocococo', 'c.o.c.o.', 'c...o...'] },
  { g: 7, pats: ['..o...o.', 'o.o.o.s.', '..o.o.o.', '......s.'] },
];

function mkRemix(gi, key, name, desc, col, bpm, root, segs) {
  const pats = [];
  for (const sg of segs) for (const p of sg.pats) pats.push(p);
  return {
    gi, key, name, desc, col,
    rule: 'いままでの ミニゲームが 4小節ずつ つぎつぎ 出てくる。よく 見てね',
    bpm, intro: 2, root,
    pitch: [0, 2, 4, 7, 9, 7, 4, 2],
    drum: 'funk', prog: [0, 5, 3, 7], min: [2],
    hit: 'pop', pre: true, remix: true,
    segs, pats,
    segAt(bar) {
      const i = Math.floor((bar - 2) / 4);
      return this.segs[Math.max(0, Math.min(this.segs.length - 1, i))].g;
    },
    // 音符は その ときの ミニゲームの ものに する
    fixNotes(notes) {
      for (const n of notes) {
        const g = this.segAt(Math.floor(n.b / 4));
        const sub = STAGES[g];
        n.hit = n.kk === 'shout' ? 'shout' : sub.hit;
        n.pre = !!sub.pre && n.k === 'tap';
        n.preAt = sub.preAt === undefined ? 1 : sub.preAt;
        n.preKind = sub.preKind || '';
      }
      return notes;
    },
    draw(v) {
      const g = this.segAt(Math.floor(v.beat / 4));
      const sub = STAGES[g];
      // その ミニゲームの 絵を そのまま つかう。音符だけ 付けかえる。
      const saved = [];
      for (const n of v.notes) { saved.push(n.g); n.g = g; }
      sub.draw.call(sub, v);
      let i = 0;
      for (const n of v.notes) n.g = saved[i++];
      // どの ミニゲームか 出す
      ctx.fillStyle = 'rgba(20,14,34,0.6)';
      const bw = W * 0.28, bh = H * 0.08;
      rr(ctx, W - bw - H * 0.03, H * 0.115, bw, bh, 10); ctx.fill();
      ctx.fillStyle = sub.col;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont(sub.name, bw * 0.88, bh * 0.58, 'bold ');
      ctx.fillText(sub.name, W - bw / 2 - H * 0.03, H * 0.115 + bh / 2);
      ctx.textAlign = 'left';
    },
  };
}

STAGES.push(mkRemix(8, 'remix', 'リミックス 1',
  'はじめの 5つが つぎつぎ 出てくる', '#F0C020', 124, 72, REMIX1_SEG));
STAGES.push(mkRemix(9, 'remix2', 'リミックス 2',
  'ぜんぶ 出てくる さいごの 面', '#FF7A5A', 128, 74, REMIX2_SEG));
