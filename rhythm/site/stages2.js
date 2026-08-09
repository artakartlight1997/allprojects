// 11面から 50面。ワールド 2〜5。
//
// 書きかたは stages.js と 同じ。1小節 = 8文字。
//   'o' きみが たたく  'c' お手本  's' かけ声  'h' 1拍ながおし  'H' 2拍ながおし
//
// 絵の どうぐ（rr / chibi / bg / floor / burst / fitFont）は stages.js の ものを つかう。

'use strict';

// --- この ファイルで つかう 絵の どうぐ -------------------------------------------

// 「ここで たたく」の わ。近づくほど 光る。
function ring(x, y, r, near, col) {
  ctx.fillStyle = 'rgba(255,220,90,' + (0.12 + near * 0.5) + ')';
  ctx.beginPath(); ctx.arc(x, y, r * (1 + near * 0.16), 0, 7); ctx.fill();
  ctx.strokeStyle = col || 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
}

// つぎの 音符まで あと どれくらい か（0=まだ先 1=いま）
function nearness(v, G, k) {
  let d = 9;
  for (const n of v.notes) {
    if (n.g !== G || n.res) continue;
    if (n.b >= v.beat && n.b - v.beat < d) d = n.b - v.beat;
  }
  return Math.max(0, Math.min(1, 1 - d * (k || 2.5)));
}

function hills(gy, c1, c2) {
  for (const [dy, c, w] of [[0.10, c1, 0.62], [0.03, c2, 0.44]]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-W * 0.1, gy);
    ctx.quadraticCurveTo(W * (0.5 - w * 0.5), gy - H * (0.22 + dy), W * 0.5, gy);
    ctx.quadraticCurveTo(W * (0.5 + w * 0.5), gy - H * (0.26 + dy), W * 1.1, gy);
    ctx.closePath(); ctx.fill();
  }
}

function starfield(t, n) {
  for (let i = 0; i < (n || 26); i++) {
    const x = ((i * 173 + t * 6) % (W + 40)) - 20;
    const y = H * (0.05 + ((i * 61) % 68) / 100);
    const tw = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.6 + i));
    ctx.fillStyle = 'rgba(255,255,255,' + tw + ')';
    ctx.beginPath(); ctx.arc(x, y, H * (i % 5 === 0 ? 0.006 : 0.0035), 0, 7); ctx.fill();
  }
}

function star5(x, y, r, col, rot) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (rot || 0) + i * Math.PI / 5 - Math.PI / 2;
    const rr2 = i % 2 ? r * 0.44 : r;
    const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

function frogChar(x, y, s, o) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(0, 2, s * 0.40, s * 0.11, 0, 0, 7); ctx.fill();
  const sq = o.squash || 0;
  ctx.scale(1 + sq * 0.22, 1 - sq * 0.22);
  ctx.strokeStyle = '#4AA84E'; ctx.lineWidth = s * 0.10; ctx.lineCap = 'round';
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sg * s * 0.20, -s * 0.22);
    ctx.lineTo(sg * s * 0.38, -s * 0.03 - (o.jump ? s * 0.22 : 0));
    ctx.stroke();
  }
  ctx.fillStyle = '#5FC060';
  ctx.beginPath(); ctx.ellipse(0, -s * 0.32, s * 0.36, s * 0.30, 0, 0, 7); ctx.fill();
  for (const sg of [-1, 1]) {
    ctx.fillStyle = '#EAFBE8';
    ctx.beginPath(); ctx.arc(sg * s * 0.17, -s * 0.62, s * 0.13, 0, 7); ctx.fill();
    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath(); ctx.arc(sg * s * 0.17, -s * 0.62, s * 0.06, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#2A6A3A'; ctx.lineWidth = s * 0.035;
  ctx.beginPath(); ctx.arc(0, -s * 0.36, s * 0.17, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
}

function ghostChar(x, y, s, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#EFEAFF';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, Math.PI, 0);
  ctx.lineTo(x + s * 0.5, y + s * 0.45);
  for (let i = 0; i < 3; i++) {
    ctx.quadraticCurveTo(x + s * (0.33 - i * 0.33), y + s * 0.72,
                         x + s * (0.17 - i * 0.33), y + s * 0.45);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4A3A6A';
  ctx.beginPath(); ctx.arc(x - s * 0.17, y - s * 0.06, s * 0.08, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + s * 0.17, y - s * 0.06, s * 0.08, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.17, s * 0.09, s * 0.11, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

// よびかけ と こたえ の 面を 作る（お手本 1小節 → まねる 1小節）
function callPats(pairs) {
  const out = [];
  for (const p of pairs) { out.push(p.replace(/o/g, 'c')); out.push(p); }
  return out;
}

// 前に 出た ミニゲームの「2」を 作る。絵は そのまま、リズムだけ 新しい。
function mkVariant(baseKey, o) {
  const base = STAGES.find((s) => s.key === baseKey);
  return Object.assign({}, base, o);
}

// ===== 11 カエルとび =============================================================

STAGES.push({
  gi: 10, key: 'frog', name: 'カエルとび',
  desc: 'はすの葉に とびうつる',
  rule: 'はすの葉が 足もとに きたら タップ！ 1拍まえに「ポコ」と 鳴るよ',
  col: '#5FC08A',
  bpm: 100, intro: 2, root: 72,
  pitch: [0, 4, 7, 9, 7, 4, 2, 0],
  drum: 'basic', prog: [0, 5, 7, 5], min: [],
  hit: 'splash', pre: true,
  pats: [
    'o...o...', 'o...o...', 'o...o...', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o...oo..', 'o.......',
    'o.o.o.o.', 'o...o...', 'o..o..o.', 'o.o.o.o.',
    'o...oo..', 'o.o.o.o.', 'o.o.o...', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#CFEFF6', '#8FD0EC');
    const gy = H * 0.70, fx = W * 0.26;
    ctx.fillStyle = '#3E9AC0'; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 6; i++) {
      const x = (((i * 140 - v.beat * 26) % (W + 140)) + W + 140) % (W + 140) - 70;
      rr(ctx, x, gy + H * (0.05 + (i % 3) * 0.07), W * 0.16, H * 0.012, 6); ctx.fill();
    }
    hills(gy, 'rgba(120,190,140,0.55)', 'rgba(90,160,110,0.7)');

    const near = nearness(v, G, 3);
    // いま のっている 葉
    ctx.fillStyle = '#3E9440';
    ctx.beginPath(); ctx.ellipse(fx, gy + H * 0.03, H * 0.115, H * 0.038, 0, 0, 7); ctx.fill();
    ring(fx, gy + H * 0.03, H * 0.085, near);

    // はすの葉が 右から ながれてくる
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.8) continue;
      const x = fx + (d / 2) * (W - fx + H * 0.2);
      const y = gy + H * 0.03;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(fx, y - H * 0.04, H * 0.09, (-d) * 1.8, '#CFFFE0');
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#8E9E92' : '#4EA84E';
      ctx.beginPath(); ctx.ellipse(x, y, H * 0.115, H * 0.038, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(20,60,30,0.45)';
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + H * 0.115, y - H * 0.016);
      ctx.lineTo(x + H * 0.115, y + H * 0.016); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F0A0C8';
      ctx.beginPath(); ctx.arc(x - H * 0.055, y - H * 0.030, H * 0.020, 0, 7); ctx.fill();
    }

    const jt = (v.beat - v.hitB + 0.12) / 0.7;
    const jump = jt >= 0 && jt <= 1 ? Math.sin(jt * Math.PI) * H * 0.16 : 0;
    frogChar(fx, gy + H * 0.02 - jump, H * 0.22,
             { jump: jump > 0, squash: jump > 0 ? 0 : near * 0.4 });
    // きしべの あし（かざり）
    ctx.strokeStyle = '#4E8A4A'; ctx.lineWidth = Math.max(2, H * 0.007); ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = W * (0.86 + i * 0.035);
      ctx.beginPath();
      ctx.moveTo(x, gy + H * 0.16);
      ctx.lineTo(x + Math.sin(v.beat + i) * H * 0.012, gy - H * 0.10 - (i % 2) * H * 0.04);
      ctx.stroke();
      ctx.fillStyle = '#7A5A3A';
      rr(ctx, x - H * 0.010, gy - H * 0.12 - (i % 2) * H * 0.04, H * 0.020, H * 0.05, H * 0.010);
      ctx.fill();
    }
  },
});

// ===== 12 ちょうちょ あみ ========================================================

STAGES.push({
  gi: 11, key: 'chou', name: 'ちょうちょ あみ',
  desc: 'とんできた ちょうを あみで つかまえる',
  rule: 'ちょうちょが あみの わに 入ったら タップ！',
  col: '#E0A0E8',
  bpm: 112, intro: 2, root: 76,
  pitch: [0, 2, 5, 7, 9, 7, 5, 2],
  drum: 'disco', prog: [0, 5, 3, 7], min: [2],
  hit: 'pop', pre: false,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o...o.o.',
    'o.o.o.o.', 'o...oo..', 'o.o.o.o.', 'o.......',
    'o..o..o.', 'o.o.o.o.', 'o..o..o.', 'oo..o...',
    'o.o.o.o.', 'o.o.oo..', 'o.o.o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#E8F6C8', '#A8D86A');
    const gy = H * 0.84;
    floor(gy, '#6EB84A');
    // 花ばたけ
    for (let i = 0; i < 10; i++) {
      const x = W * (0.03 + i * 0.105), y = gy + H * (0.02 + (i % 3) * 0.035);
      ctx.fillStyle = ['#F06A9C', '#FFD166', '#FFFFFF'][i % 3];
      for (let k = 0; k < 5; k++) {
        const a = k * 1.257;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * H * 0.014, y + Math.sin(a) * H * 0.014, H * 0.012, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#F0D060';
      ctx.beginPath(); ctx.arc(x, y, H * 0.010, 0, 7); ctx.fill();
    }

    const nx = W * 0.26, ny = H * 0.40;
    const near = nearness(v, G, 3);
    // ちょうちょ（ふわふわ 上下しながら 右から）
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.6) continue;
      const x = nx + (d / 2) * (W - nx + H * 0.2);
      const y = ny + Math.sin(d * 3.1 + n.i) * H * 0.07;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(nx, ny, H * 0.09, (-d) * 1.8, '#FFF0FF');
        continue;
      }
      const flap = 0.4 + 0.6 * Math.abs(Math.sin(v.beat * 6 + n.i));
      ctx.fillStyle = n.res === 'miss' ? '#9E9EA8' : (n.i % 2 ? '#F0A0E0' : '#FFC966');
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + sg * H * 0.028 * flap, y, H * 0.030 * flap, H * 0.034, sg * 0.4, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = '#5A4A3A';
      ctx.beginPath(); ctx.ellipse(x, y, H * 0.009, H * 0.028, 0, 0, 7); ctx.fill();
    }
    // あみ
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(-0.3 + sw * 0.9);
    ring(0, 0, H * 0.085, near, '#FFFFFF');
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * H * 0.03, -H * 0.08); ctx.lineTo(i * H * 0.03, H * 0.08);
      ctx.stroke();
    }
    ctx.strokeStyle = '#A0703A'; ctx.lineWidth = Math.max(3, H * 0.014);
    ctx.beginPath(); ctx.moveTo(0, H * 0.085); ctx.lineTo(0, H * 0.30); ctx.stroke();
    ctx.restore();
    chibi(nx - W * 0.02, gy + H * 0.04, H * 0.30, Object.assign({}, RINA, {
      arm: 2.2 + sw * 0.3, arm2: 0.6,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 13 くだもの キャッチ ======================================================

STAGES.push({
  gi: 12, key: 'fruit', name: 'くだもの キャッチ',
  desc: '木から おちる くだものを かごで うける',
  rule: 'くだものが かごに とどいたら タップ！ 1拍まえに 音が 鳴るよ',
  col: '#F0704A',
  bpm: 116, intro: 2, root: 74,
  pitch: [0, 4, 7, 4, 9, 7, 4, 2],
  drum: 'funk', prog: [0, 0, 5, 7], min: [],
  hit: 'pop', pre: true,
  pats: [
    'o...o...', 'o...o...', 'o.o.o.o.', 'o...o...',
    'oo..oo..', 'o.o.o.o.', 'o..oo...', 'o.......',
    'o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o..o..o.',
    'oo.oo...', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#FFE9C0', '#F0B070');
    const gy = H * 0.86;
    floor(gy, '#8FA84A');
    // 木
    ctx.fillStyle = '#7A5030';
    ctx.fillRect(W * 0.63, H * 0.30, W * 0.05, H * 0.30);
    ctx.fillStyle = '#4E9A4E';
    for (const [dx, dy, r] of [[-0.08, 0.05, 0.13], [0.08, 0.05, 0.13], [0, 0, 0.16]]) {
      ctx.beginPath(); ctx.arc(W * (0.655 + dx), H * (0.26 + dy), H * r, 0, 7); ctx.fill();
    }

    const cx = W * 0.28, cy = gy - H * 0.10;   // かごの ふち（むねの 前で かかえる）
    const near = nearness(v, G, 3);
    // くだものが 上から おちてくる
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.0 || d < -0.6) continue;
      const sx = W * (0.58 + (n.i % 4) * 0.05);
      const u = Math.max(0, Math.min(1.2, 1 - d / 2));
      const x = sx + (cx - sx) * u;
      const y = H * 0.36 + (cy - H * 0.36) * (u * u);
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(cx, cy, H * 0.08, (-d) * 1.8, '#FFF0A0');
        continue;
      }
      const col = ['#E8465C', '#FFB020', '#B060D0', '#60C060'][n.i % 4];
      ctx.fillStyle = n.res === 'miss' ? '#9E9E9E' : col;
      ctx.beginPath(); ctx.arc(x, y, H * 0.040, 0, 7); ctx.fill();
      ctx.strokeStyle = '#4A7A3A'; ctx.lineWidth = Math.max(2, H * 0.006);
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.038); ctx.lineTo(x + H * 0.02, y - H * 0.062); ctx.stroke();
    }

    ring(cx, cy, H * 0.085, near);
    // りな → かご の じゅんばんで 描く（かごを 手まえに 見せる）
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(cx, gy + H * 0.06, H * 0.26, Object.assign({}, RINA, {
      arm: 1.7, arm2: 1.7, squash: sw * 0.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
    ctx.fillStyle = '#C88A46';
    ctx.beginPath();
    ctx.moveTo(cx - H * 0.10, cy);
    ctx.lineTo(cx + H * 0.10, cy);
    ctx.lineTo(cx + H * 0.07, cy + H * 0.10);
    ctx.lineTo(cx - H * 0.07, cy + H * 0.10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,0.5)'; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - H * 0.10, cy + H * 0.025 * i);
      ctx.lineTo(cx + H * 0.10, cy + H * 0.025 * i);
      ctx.stroke();
    }
  },
});

// ===== 14 ロケット はっしゃ ======================================================
//
// ながおし。おして エンジンを ためて、カウントが 0 に なったら はなす。

STAGES.push({
  gi: 13, key: 'rocket', name: 'ロケット はっしゃ',
  desc: 'おして ためて、線で はなす',
  rule: 'ロケットに 火が ついたら おしっぱなし。ゲージが 上まで きたら はなす！',
  col: '#F0C020',
  bpm: 100, intro: 2, root: 72,
  pitch: [0, 0, 4, 4, 7, 7, 9, 9],
  drum: 'march', prog: [0, 5, 7, 5], min: [],
  hit: 'boom', pre: false,
  pats: [
    '..h.....', '..h.....', '....H...', '..h...h.',
    '..h...h.', '....H...', '..h...h.', '......H.',
    '..h...h.', '....H...', '..h...h.', '..h...h.',
    '....H...', '..h...h.', '......H.', '..h.....',
  ],
  draw(v) {
    const G = this.gi;
    bg('#1E2A50', '#5A78B0');
    starfield(v.beat * 0.4, 18);
    const gy = H * 0.80;
    floor(gy, '#3A4260');
    ctx.fillStyle = '#59627E';
    rr(ctx, W * 0.36, gy - H * 0.03, W * 0.28, H * 0.04, 8); ctx.fill();

    const rx = W * 0.50, base = gy - H * 0.03;
    let cur = null;
    for (const n of v.notes) {
      if (n.g !== G || n.k !== 'hold') continue;
      if (v.beat >= n.hb - 1.2 && v.beat <= n.b + 0.6) cur = n;
    }
    // ゲージ（どこまで ためたか）
    const gx = W * 0.66, gh = H * 0.40, gyy = H * 0.26;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, gx, gyy, W * 0.05, gh, 10); ctx.fill();
    let t = 0;
    if (cur) t = Math.max(0, Math.min(1, (v.beat - cur.hb) / (cur.b - cur.hb)));
    ctx.fillStyle = t >= 1 ? '#FF7A5A' : '#FFD166';
    rr(ctx, gx, gyy + gh * (1 - t), W * 0.05, gh * t, 10); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(3, H * 0.008);
    ctx.beginPath();
    ctx.moveTo(gx - W * 0.02, gyy); ctx.lineTo(gx + W * 0.09, gyy); ctx.stroke();
    ctx.fillStyle = t >= 1 ? '#FFE066' : 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    fitFont('ここで はなす！', W * 0.22, H * 0.045, 'bold ');
    ctx.fillText('ここで はなす！', gx + W * 0.10, gyy);
    ctx.textAlign = 'left';

    // ロケット。はなすと とんでいく
    let fly = 0, flame = 0;
    if (cur) {
      flame = cur.held ? 0.4 + t * 0.8 : (v.beat > cur.hb ? 0.2 : 0);
      if (cur.res && v.beat > cur.b) fly = Math.min(1, (v.beat - cur.b) * 0.9);
    }
    const ry = base - fly * H * 0.9;
    ctx.save();
    ctx.translate(rx, ry);
    if (flame > 0.05) {
      ctx.fillStyle = 'rgba(255,180,60,0.9)';
      ctx.beginPath();
      ctx.moveTo(-H * 0.035, 0);
      ctx.lineTo(0, H * (0.06 + flame * 0.10) * (0.8 + Math.abs(Math.sin(v.beat * 20)) * 0.4));
      ctx.lineTo(H * 0.035, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#EEF3FA';
    ctx.beginPath();
    ctx.moveTo(0, -H * 0.26);
    ctx.quadraticCurveTo(H * 0.06, -H * 0.14, H * 0.05, 0);
    ctx.lineTo(-H * 0.05, 0);
    ctx.quadraticCurveTo(-H * 0.06, -H * 0.14, 0, -H * 0.26);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E8465C';
    ctx.beginPath(); ctx.moveTo(-H * 0.05, 0); ctx.lineTo(-H * 0.09, H * 0.01);
    ctx.lineTo(-H * 0.05, -H * 0.06); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(H * 0.05, 0); ctx.lineTo(H * 0.09, H * 0.01);
    ctx.lineTo(H * 0.05, -H * 0.06); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7FC8F0';
    ctx.beginPath(); ctx.arc(0, -H * 0.15, H * 0.028, 0, 7); ctx.fill();
    ctx.restore();
    if (cur && cur.res && cur.res !== 'miss' && v.beat > cur.b && v.beat < cur.b + 0.8) {
      burst(rx, base, H * 0.12, (v.beat - cur.b) * 1.6, '#FFD0A0');
    }

    chibi(W * 0.14, gy + H * 0.02, H * 0.26, Object.assign({}, RINA, {
      arm: v.holding ? 2.4 : 1.4, arm2: v.holding ? 2.4 : 1.4,
      squash: v.holding ? 0.2 : 0,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : v.holding ? 'o' : 'h',
    }));
    if (v.holding) {
      ctx.fillStyle = 'rgba(255,209,102,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('おしっぱなし！', W * 0.32, H * 0.055, 'bold ');
      ctx.fillText('おしっぱなし！', W * 0.30, H * 0.22);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 15 やまびこ ==============================================================

STAGES.push({
  gi: 14, key: 'yama', name: 'やまびこ',
  desc: 'パパの「ヤッホー」を まねする',
  rule: 'パパが 1小節 さけぶ → つぎの 1小節で 同じ リズムで さけぶ',
  col: '#7AC0E0',
  bpm: 108, intro: 2, root: 72,
  pitch: [0, 7, 4, 7, 0, 7, 4, 7],
  drum: 'soft', prog: [0, 5, 3, 7], min: [2],
  hit: 'shout', pre: false,
  pats: callPats([
    'o...o...', 'o...o...', 'o.o.o...', 'o...oo..',
    'o.o.o.o.', 'oo..o...', 'o..o..o.', 'o.o.oo..',
  ]),
  draw(v) {
    bg('#CFE8FA', '#8FBEE0');
    const gy = H * 0.86;
    hills(gy, '#7A9AB0', '#5A7A94');
    floor(gy, '#6E9A5A');

    const bar = Math.floor(v.beat / 4);
    const mine = ((bar - 2) % 2) === 1 && v.beat >= 8;
    const px = W * 0.80, rx = W * 0.22;

    // 声の わ（ひろがる 円）
    for (const [x, last, col] of [[px, v.callB, 'rgba(255,255,255,0.55)'],
                                  [rx, v.hitB, 'rgba(255,220,120,0.65)']]) {
      const t = v.beat - last;
      if (t >= 0 && t < 1.4) {
        for (let i = 0; i < 3; i++) {
          const u = t / 1.4 + i * 0.16;
          if (u > 1) continue;
          ctx.strokeStyle = col;
          ctx.globalAlpha = Math.max(0, 1 - u);
          ctx.lineWidth = Math.max(2, H * 0.008);
          ctx.beginPath(); ctx.arc(x, gy - H * 0.30, H * 0.05 + u * H * 0.30, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    const swA = Math.max(0, Math.min(1, 1 - (v.beat - v.callB) * 4));
    const swR = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(px, gy, H * 0.30, Object.assign({}, PAPA, {
      arm: 1.6 + swA * 1.0, arm2: 1.6 + swA * 1.0, face: swA > 0.3 ? 'o' : 'n',
    }));
    chibi(rx, gy, H * 0.30, Object.assign({}, RINA, {
      arm: 1.6 + swR * 1.0, arm2: 1.6 + swR * 1.0,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swR > 0.3 ? 'o' : 'h',
    }));

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (swA > 0.2) {
      ctx.fillStyle = '#FFFFFF';
      fitFont('ヤッホー', W * 0.24, H * 0.06, 'bold ');
      ctx.fillText('ヤッホー', px, gy - H * 0.46);
    }
    if (swR > 0.2) {
      ctx.fillStyle = '#FFE066';
      fitFont('ヤッホー', W * 0.24, H * 0.06, 'bold ');
      ctx.fillText('ヤッホー', rx, gy - H * 0.46);
    }
    ctx.fillStyle = mine ? 'rgba(255,209,102,0.94)' : 'rgba(60,50,80,0.6)';
    const bw = W * 0.36, bh = H * 0.11;
    rr(ctx, W / 2 - bw / 2, H * 0.85, bw, bh, 12); ctx.fill();
    ctx.fillStyle = mine ? '#4A3208' : '#FFFFFF';
    const lab = v.beat < 8 ? 'よく きいてね' : mine ? 'きみの ばん！' : 'パパの ばん';
    fitFont(lab, bw * 0.86, bh * 0.6, 'bold ');
    ctx.fillText(lab, W / 2, H * 0.85 + bh / 2);
    ctx.textAlign = 'left';
  },
});

// ===== 16 しゃぼん玉 ============================================================

STAGES.push({
  gi: 15, key: 'shabon', name: 'しゃぼん玉',
  desc: '上がってきた 玉を パチンと わる',
  rule: 'しゃぼん玉が 上の わに 入ったら タップ！ 出る ところは 3つ',
  col: '#7FD0E8',
  bpm: 118, intro: 2, root: 79,
  pitch: [0, 2, 4, 7, 9, 7, 4, 2],
  drum: 'latin', prog: [0, 5, 3, 7], min: [1],
  hit: 'bubble', pre: false,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o.o.o.o.',
    'o...o.o.', 'o.o.o.o.', 'o..o..o.', 'o.......',
    'o.o.o.o.', 'oo..o...', 'o.o.o.o.', 'o..o..o.',
    'o.o.oo..', 'o.o.o.o.', 'oo..oo..', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#DCF2FA', '#8FC8E0');
    const gy = H * 0.84;
    floor(gy, '#6ABAD0');
    const lx = [W * 0.28, W * 0.5, W * 0.72];
    const ty = H * 0.26;
    // わ（ここで わる）
    const near = nearness(v, G, 3);
    for (let i = 0; i < 3; i++) ring(lx[i], ty, H * 0.062, near * 0.7);
    // ふく人
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#C0A070';
      ctx.fillRect(lx[i] - H * 0.006, gy - H * 0.10, H * 0.012, H * 0.10);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(2, H * 0.006);
      ctx.beginPath(); ctx.arc(lx[i], gy - H * 0.12, H * 0.026, 0, 7); ctx.stroke();
    }
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.0 || d < -0.6) continue;
      const x = lx[n.lane];
      const u = Math.max(0, Math.min(1.1, 1 - d / 2));
      const y = gy - H * 0.14 + (ty - gy + H * 0.14) * u;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(x, ty, H * 0.075, (-d) * 2.2, '#DFF6FF');
        continue;
      }
      const r = H * 0.052;
      const wob = Math.sin(v.beat * 5 + n.i) * H * 0.006;
      ctx.fillStyle = n.res === 'miss' ? 'rgba(180,180,180,0.5)' : 'rgba(200,240,255,0.55)';
      ctx.beginPath(); ctx.arc(x + wob, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(2, H * 0.005);
      ctx.beginPath(); ctx.arc(x + wob, y, r, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(x + wob - r * 0.35, y - r * 0.35, r * 0.18, 0, 7); ctx.fill();
    }
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(W * 0.88, gy + H * 0.06, H * 0.26, Object.assign({}, RINA, {
      arm: 1.2 + sw * 1.4, arm2: 0.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 17・18 ワールド1の つづき（2） =============================================

STAGES.push(mkVariant('neko', {
  gi: 16, key: 'neko2', name: 'ねこパンチ 2',
  desc: 'まりが 速くなった',
  rule: 'まりが とんできたら タップ！ 前より 速いよ',
  col: '#E86A3A', bpm: 120,
  pats: [
    'o...o...', 'o.o.o.o.', 'oo..o.o.', 'o.o.o...',
    'o.o.o.o.', 'oo.oo...', 'o.o.o.o.', 'o.......',
    'o.o.o.o.', 'oo..o.o.', 'o.o.oo..', 'o.o.o.o.',
    'oo.oo...', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
}));

STAGES.push(mkVariant('nawa', {
  gi: 17, key: 'nawa2', name: 'なわとび 2',
  desc: 'なわが 速くなった',
  rule: 'なわが 足もとに きたら タップ！ 前より 速く まわるよ',
  col: '#3E98C8', bpm: 116,
  pats: [
    'o...o...', 'o.o.o.o.', 'o...o...', 'o.o.o.o.',
    'o.o.o.o.', 'o...o...', 'o.o.o.o.', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o.o.o.o.', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o.o.o.o.', 'o.......',
  ],
}));

// ===== 19・20 リミックス 3・4 ====================================================

const REMIX3_SEG = [
  { g: 10, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.o.o...'] },
  { g: 11, pats: ['o.o.o.o.', 'o...o.o.', 'o..o..o.', 'o.o.o.o.'] },
  { g: 12, pats: ['o...o...', 'oo..oo..', 'o.o.o.o.', 'o.......'] },
  { g: 15, pats: ['o.o.o.o.', 'o..o..o.', 'o.o.o.o.', 'o.......'] },
  { g: 0, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.......'] },
  { g: 2, pats: ['o..o..o.', 'o.o.o.o.', 'oo..o.o.', 'o.......'] },
];

const REMIX4_SEG = [
  { g: 14, pats: ['c...c...', 'o...o...', 'c.o.c...', 'o.o.o...'] },
  { g: 1, pats: ['o...o...', 'o.o.o.o.', 'o.o.o.o.', 'o.......'] },
  { g: 13, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 11, pats: ['o.o.o.o.', 'o..o..o.', 'o.o.oo..', 'o.......'] },
  { g: 10, pats: ['o...o...', 'o.o.o.o.', 'o..o..o.', 'o.......'] },
  { g: 15, pats: ['o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......'] },
];

STAGES.push(mkRemix(18, 'remix3', 'リミックス 3',
  'ワールド2の ミニゲームが つぎつぎ', '#F0A020', 122, 72, REMIX3_SEG));
STAGES.push(mkRemix(19, 'remix4', 'リミックス 4',
  'ながおしも まねっこも 出てくる', '#F07A5A', 126, 74, REMIX4_SEG));

// ===== 21 トースト ポン =========================================================

STAGES.push({
  gi: 20, key: 'toast', name: 'トースト ポン',
  desc: 'とび出した パンを おさらで うける',
  rule: 'レバーが 下まで きて パンが とび出したら タップ！',
  col: '#E8A040',
  bpm: 110, intro: 2, root: 74,
  pitch: [0, 2, 4, 5, 7, 5, 4, 2],
  drum: 'basic', prog: [0, 5, 3, 7], min: [2],
  hit: 'bell', pre: true,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o...o.o.',
    'o.o.o.o.', 'o...oo..', 'o.o.o.o.', 'o.......',
    'o..o..o.', 'o.o.o.o.', 'oo..o...', 'o.o.o.o.',
    'o..oo...', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#FFF0D8', '#E8C090');
    const gy = H * 0.70;
    ctx.fillStyle = '#C89A6A'; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, gy, W, H * 0.008);
    // まどと たな
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, W * 0.06, H * 0.12, W * 0.20, H * 0.24, 10); ctx.fill();

    const tx = W * 0.44, ty = gy;
    const rfoot = gy + H * 0.14, rs = H * 0.28;
    const plate = rfoot - rs * 0.66;             // おさらの たかさ（かまえた 手の 上）
    // トースター
    ctx.fillStyle = '#B0483A';
    rr(ctx, tx - W * 0.10, ty - H * 0.20, W * 0.20, H * 0.20, 12); ctx.fill();
    ctx.fillStyle = '#3A2A28';
    rr(ctx, tx - W * 0.06, ty - H * 0.205, W * 0.12, H * 0.022, 5); ctx.fill();

    // レバー（つぎの 音まで あと どれくらい か）。みぞの 中を 下がっていく。
    let d0 = 9;
    for (const n of v.notes) {
      if (n.g !== G || n.res) continue;
      if (n.b >= v.beat && n.b - v.beat < d0) d0 = n.b - v.beat;
    }
    const lv = Math.max(0, Math.min(1, 1 - d0 / 2));
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    rr(ctx, tx + W * 0.083, ty - H * 0.19, W * 0.034, H * 0.17, 5); ctx.fill();
    ctx.fillStyle = lv > 0.85 ? '#FFE066' : '#E0D0C0';
    rr(ctx, tx + W * 0.080, ty - H * 0.185 + lv * H * 0.13, W * 0.040, H * 0.035, 5); ctx.fill();

    // とび出した パン
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 0.05 || d < -0.9) continue;
      const u = Math.max(0, Math.min(1, (-d) / 0.6));
      const y = ty - H * 0.22 + (plate - ty + H * 0.22) * u - Math.sin(u * Math.PI) * H * 0.20;
      const x = tx + u * (W * 0.28);
      if (n.res && n.res !== 'miss' && -d > 0.05) {
        burst(tx + W * 0.28, plate, H * 0.09, (-d) * 1.6, '#FFE0A0');
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#A09080' : '#F0C060';
      rr(ctx, x - H * 0.045, y - H * 0.05, H * 0.09, H * 0.10, H * 0.02); ctx.fill();
      ctx.fillStyle = '#C88A30';
      rr(ctx, x - H * 0.045, y - H * 0.05, H * 0.09, H * 0.018, H * 0.01); ctx.fill();
    }
    ring(tx, ty - H * 0.28, H * 0.055, lv);

    // おさらを かまえる りな（おさらは 手の 上）
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    const px = tx + W * 0.28;
    chibi(px, rfoot, rs, Object.assign({}, RINA, {
      arm: 1.9, arm2: 1.9, squash: sw * 0.18,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(px, plate + sw * H * 0.012, H * 0.090, H * 0.026, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(px, plate + sw * H * 0.012, H * 0.058, H * 0.016, 0, 0, 7); ctx.fill();
  },
});

// ===== 22 そうじき ==============================================================

STAGES.push({
  gi: 21, key: 'souji', name: 'そうじき',
  desc: 'おして ゴミを すいこむ',
  rule: 'ゴミの 前で おしっぱなし。ゴミが ぜんぶ 消えたら はなす！',
  col: '#8AC0A0',
  bpm: 104, intro: 2, root: 71,
  pitch: [0, 0, 5, 5, 7, 7, 4, 4],
  drum: 'rock', prog: [0, 3, 5, 7], min: [0, 1],
  hit: 'vacuum', pre: false,
  pats: [
    '..h.....', '..h.....', '..h...h.', '....H...',
    '..h...h.', '..h...h.', '....H...', '..h.....',
    '..h...h.', '....H...', '..h...h.', '..h...h.',
    '....H...', '..h...h.', '..h...h.', '..h.....',
  ],
  draw(v) {
    const G = this.gi;
    bg('#FFF4E0', '#E0C8A8');
    const gy = H * 0.76;
    floor(gy, '#B08A5A');
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    for (let i = 0; i < 8; i++) ctx.fillRect(W * (i / 8), gy, W * 0.008, H - gy);

    const sx = W * 0.34;                       // すいこみ口
    for (const n of v.notes) {
      if (n.g !== G || n.k !== 'hold') continue;
      const len = n.b - n.hb;
      const d = n.b - v.beat;
      if (d > len + 2.5 || d < -0.8) continue;
      const t = Math.max(0, Math.min(1, (v.beat - n.hb) / len));
      const x = n.held || v.beat > n.hb ? sx + (1 - t) * W * 0.18 + W * 0.10
                                        : sx + (d / (len + 2.5)) * (W - sx);
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(sx, gy - H * 0.02, H * 0.09, (-d) * 1.6, '#FFF4C0');
        continue;
      }
      // ゴミの 山。すいこむ ほど 小さくなる
      const k = n.held ? 1 - t : 1;
      const sz = H * 0.075 * Math.max(0.1, k);
      ctx.fillStyle = n.res === 'miss' ? '#9E9E9E' : '#B0A080';
      ctx.beginPath();
      ctx.moveTo(x - sz, gy);
      ctx.quadraticCurveTo(x, gy - sz * 1.6, x + sz, gy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(x - sz * 0.3, gy - sz * 0.5, sz * 0.16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + sz * 0.35, gy - sz * 0.35, sz * 0.12, 0, 7); ctx.fill();
      if (n.held) {
        ctx.strokeStyle = '#FFD166'; ctx.lineWidth = Math.max(3, H * 0.010);
        ctx.beginPath();
        ctx.arc(x, gy - H * 0.14, H * 0.05, -Math.PI / 2, -Math.PI / 2 + t * 6.283);
        ctx.stroke();
      }
    }

    // そうじき
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 3));
    ctx.fillStyle = '#4A7A9A';
    rr(ctx, sx - W * 0.11, gy - H * 0.13, W * 0.13, H * 0.12, 10); ctx.fill();
    ctx.strokeStyle = '#4A7A9A'; ctx.lineWidth = Math.max(4, H * 0.016); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - W * 0.05, gy - H * 0.12);
    ctx.quadraticCurveTo(sx, gy - H * 0.10, sx - W * 0.005, gy - H * 0.02);
    ctx.stroke();
    ctx.fillStyle = v.holding ? 'rgba(255,209,102,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(sx, gy - H * 0.045);
    ctx.lineTo(sx + W * 0.07, gy - H * 0.11);
    ctx.lineTo(sx + W * 0.07, gy + H * 0.01);
    ctx.closePath(); ctx.fill();

    chibi(W * 0.16, gy + H * 0.02, H * 0.30, Object.assign({}, RINA, {
      arm: v.holding ? 1.9 : 1.5, arm2: v.holding ? 1.9 : 1.5,
      squash: v.holding ? 0.14 : 0,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
    if (v.holding) {
      ctx.fillStyle = 'rgba(255,209,102,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('おしっぱなし！', W * 0.32, H * 0.055, 'bold ');
      ctx.fillText('おしっぱなし！', W * 0.30, H * 0.22);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 23 ノック =================================================================

STAGES.push({
  gi: 22, key: 'knock', name: 'ノック',
  desc: 'ドアの むこうの リズムを まねる',
  rule: 'パパが 1小節 ノック → つぎの 1小節で 同じ リズムで ノック！',
  col: '#C08A5A',
  bpm: 116, intro: 2, root: 69,
  pitch: [0, 0, 0, 0, 0, 0, 0, 0],
  drum: 'taiko', prog: [0, 0, 5, 5], min: [],
  hit: 'wood', pre: false, guide: false,
  pats: callPats([
    'o...o...', 'o.o.o...', 'o...oo..', 'oo..o...',
    'o.o.o.o.', 'o..oo.o.', 'oo.o.o..', 'o.o.oo..',
  ]),
  draw(v) {
    bg('#3A2E28', '#6A5040');
    const gy = H * 0.90;
    floor(gy, '#4A382C');
    // ドア
    const dx = W / 2, dw = W * 0.26, dh = H * 0.66;
    ctx.fillStyle = '#8A5A34';
    rr(ctx, dx - dw / 2, gy - dh, dw, dh, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,16,0.7)'; ctx.lineWidth = 3;
    rr(ctx, dx - dw * 0.36, gy - dh * 0.92, dw * 0.72, dh * 0.34, 6); ctx.stroke();
    rr(ctx, dx - dw * 0.36, gy - dh * 0.54, dw * 0.72, dh * 0.40, 6); ctx.stroke();
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.arc(dx + dw * 0.34, gy - dh * 0.42, H * 0.020, 0, 7); ctx.fill();

    const bar = Math.floor(v.beat / 4);
    const mine = ((bar - 2) % 2) === 1 && v.beat >= 8;
    // ノックの ゆれ
    for (const [last, col, side] of [[v.callB, 'rgba(255,255,255,0.5)', -1],
                                     [v.hitB, 'rgba(255,209,102,0.7)', 1]]) {
      const t = v.beat - last;
      if (t < 0 || t > 1) continue;
      ctx.strokeStyle = col;
      ctx.globalAlpha = Math.max(0, 1 - t * 1.6);
      ctx.lineWidth = Math.max(2, H * 0.008);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(dx, gy - dh * 0.6, H * (0.06 + i * 0.05) + t * H * 0.10,
                side > 0 ? 0.6 : Math.PI + 0.6, side > 0 ? Math.PI - 0.6 : -0.6, side < 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const swA = Math.max(0, Math.min(1, 1 - (v.beat - v.callB) * 5));
    const swR = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 5));
    chibi(W * 0.22, gy, H * 0.30, Object.assign({}, RINA, {
      arm: 0.4, arm2: 1.4 + swR * 1.1,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swR > 0.3 ? 'o' : mine ? 'h' : 'n',
    }));
    ctx.globalAlpha = 0.5;
    chibi(W * 0.78, gy, H * 0.30, Object.assign({}, PAPA, {
      arm: 1.4 + swA * 1.1, arm2: 0.4, face: swA > 0.3 ? 'o' : 'n',
    }));
    ctx.globalAlpha = 1;

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

// ===== 24 かいてん ずし ==========================================================

STAGES.push({
  gi: 23, key: 'sushi', name: 'かいてん ずし',
  desc: 'ながれてきた おすしを とる',
  rule: 'おさらが 目の前の しるしに きたら タップ！',
  col: '#E85C6A',
  bpm: 112, intro: 2, root: 76,
  pitch: [0, 2, 4, 2, 7, 5, 4, 2],
  drum: 'disco', prog: [0, 5, 7, 5], min: [],
  hit: 'bell', pre: false,
  pats: [
    'o...o...', 'o.o.o...', 'o...o.o.', 'o.o.o.o.',
    'o..o..o.', 'o.o.o.o.', 'oo..o...', 'o.......',
    'o.o.o.o.', 'o..o..o.', 'o.o.oo..', 'o.o.o.o.',
    'oo..o.o.', 'o.o.o.o.', 'o..o..o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#FFF0E0', '#E8C8A0');
    const by = H * 0.52, cx = W * 0.30;
    floor(H * 0.86, '#B07A4A');
    // ベルト
    ctx.fillStyle = '#3A6A5A';
    ctx.fillRect(0, by, W, H * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let i = 0; i < 14; i++) {
      const x = (((i * 90 - v.beat * 62) % (W + 90)) + W + 90) % (W + 90) - 45;
      ctx.fillRect(x, by, 20, H * 0.12);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, by, W, H * 0.010);

    // 目の前の しるし
    const near = nearness(v, G, 3);
    ctx.strokeStyle = 'rgba(255,209,102,' + (0.4 + near * 0.5) + ')';
    ctx.lineWidth = Math.max(3, H * 0.009);
    ctx.setLineDash([H * 0.03, H * 0.02]);
    ctx.beginPath(); ctx.moveTo(cx, H * 0.30); ctx.lineTo(cx, by + H * 0.12); ctx.stroke();
    ctx.setLineDash([]);

    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.7) continue;
      const x = cx + (d / 2) * (W - cx + H * 0.2);
      const y = by + H * 0.012;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(cx, y - H * 0.04, H * 0.08, (-d) * 1.8, '#FFF0A0');
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#9E9E9E' : ['#FFFFFF', '#F0E0D0', '#D8E8F0'][n.i % 3];
      ctx.beginPath(); ctx.ellipse(x, y, H * 0.062, H * 0.020, 0, 0, 7); ctx.fill();
      // おすし
      ctx.fillStyle = '#FBF6EE';
      rr(ctx, x - H * 0.036, y - H * 0.036, H * 0.072, H * 0.036, H * 0.012); ctx.fill();
      ctx.fillStyle = ['#F0645A', '#F0A030', '#E8B0C0', '#7AC080'][n.i % 4];
      rr(ctx, x - H * 0.042, y - H * 0.052, H * 0.084, H * 0.024, H * 0.010); ctx.fill();
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(cx, H * 0.90, H * 0.34, Object.assign({}, RINA, {
      arm: 0.4, arm2: 1.4 + sw * 1.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
    chibi(W * 0.72, H * 0.90, H * 0.30, Object.assign({}, PAPA, {
      arm: 0.5, arm2: 0.9 + sw * 0.4, face: 'h',
    }));
  },
});

// ===== 25 ねこピアノ =============================================================

STAGES.push({
  gi: 24, key: 'piano', name: 'ねこピアノ',
  desc: 'ねこが おす けんばんを 見る',
  rule: 'ねこの 手が けんばんに つく しゅんかん タップ！ けんばんは 3つ',
  col: '#B08AE0',
  bpm: 120, intro: 2, root: 72,
  pitch: [0, 4, 7, 12, 7, 4, 2, 0],
  drum: 'latin', prog: [0, 5, 3, 7], min: [2],
  hit: 'piano', pre: false,
  pats: [
    'o...o...', 'o.o.o.o.', 'o...o.o.', 'o.o.o.o.',
    'oo..o...', 'o.o.o.o.', 'o..o..o.', 'o.......',
    'o.o.o.o.', 'oo..oo..', 'o.o.o.o.', 'o..o..o.',
    'o.o.o.o.', 'oo..o.o.', 'o.o.oo..', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#2E2444', '#5A4A80');
    const ky = H * 0.62, kh = H * 0.30;
    const lx = [W * 0.24, W * 0.5, W * 0.76];
    const kw = W * 0.20;
    // けんばん
    for (let i = 0; i < 3; i++) {
      let press = 0;
      for (const n of v.notes) {
        if (n.g !== G || n.lane !== i) continue;
        const d = v.beat - n.b;
        if (d >= 0 && d < 0.4 && n.res && n.res !== 'miss') press = Math.max(press, 1 - d / 0.4);
      }
      ctx.fillStyle = press > 0 ? '#FFE9A0' : '#F4F0F8';
      rr(ctx, lx[i] - kw / 2, ky + press * H * 0.012, kw, kh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,60,0.4)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2A2038';
      rr(ctx, lx[i] + kw * 0.30, ky, kw * 0.16, kh * 0.55, 4); ctx.fill();
    }
    // ねこの 手が 上から おりてくる
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 1.6 || d < -0.5) continue;
      const x = lx[n.lane];
      const u = Math.max(0, Math.min(1, 1 - d / 1.6));
      const y = H * 0.14 + (ky - H * 0.16) * u;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(x, ky, H * 0.07, (-d) * 2.4, '#FFF0C0');
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#9E9E9E' : '#F0C070';
      ctx.beginPath(); ctx.arc(x, y, H * 0.052, 0, 7); ctx.fill();
      ctx.fillStyle = '#F8DCA8';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.arc(x + k * H * 0.030, y + H * 0.040, H * 0.014, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#E8A0B0';
      ctx.beginPath(); ctx.ellipse(x, y + H * 0.012, H * 0.020, H * 0.016, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, ky - H * 0.012, W, H * 0.010);
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(W * 0.90, H * 0.99, H * 0.22, Object.assign({}, RINA, {
      arm: 1.2 + sw * 1.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 26 はとどけい ============================================================

STAGES.push({
  gi: 25, key: 'tokei', name: 'はとどけい',
  desc: 'とりが 出たら タップ。ふりこが 目じるし',
  rule: 'とりが とびら から 出たら タップ！ ふりこが 拍を おしえてくれる',
  col: '#8AA8D8',
  bpm: 96, intro: 2, root: 74,
  pitch: [0, 4, 7, 4, 9, 7, 5, 4],
  drum: 'soft', prog: [0, 5, 3, 7], min: [2],
  hit: 'bell', pre: false,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o...o...',
    'o.o.o.o.', 'o...o...', 'o.o.o.o.', 'o.......',
    'o...oo..', 'o.o.o.o.', 'o...o.o.', 'o.o.o...',
    'o.o.o.o.', 'o..o..o.', 'o.o.o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#F0E8D8', '#C8B898');
    const cx = W / 2, cy = H * 0.50;
    // とけいの 本体
    ctx.fillStyle = '#7A4A2A';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.17, cy + H * 0.20);
    ctx.lineTo(cx - W * 0.17, cy - H * 0.14);
    ctx.lineTo(cx, cy - H * 0.30);
    ctx.lineTo(cx + W * 0.17, cy - H * 0.14);
    ctx.lineTo(cx + W * 0.17, cy + H * 0.20);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F6EEDC';
    ctx.beginPath(); ctx.arc(cx, cy + H * 0.02, H * 0.13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5A3A20'; ctx.lineWidth = Math.max(2, H * 0.007);
    ctx.beginPath(); ctx.arc(cx, cy + H * 0.02, H * 0.13, 0, 7); ctx.stroke();
    // はり（拍で まわる）
    for (const [len, sp, wdt] of [[0.09, 1, 0.010], [0.11, 0.25, 0.006]]) {
      const a = v.beat * sp * Math.PI / 2 - Math.PI / 2;
      ctx.strokeStyle = '#3A2A1A'; ctx.lineWidth = Math.max(2, H * wdt);
      ctx.beginPath();
      ctx.moveTo(cx, cy + H * 0.02);
      ctx.lineTo(cx + Math.cos(a) * H * len, cy + H * 0.02 + Math.sin(a) * H * len);
      ctx.stroke();
    }
    // ふりこ（メトロノーム）
    const sw2 = Math.sin(v.beat * Math.PI) * 0.5;
    ctx.save();
    ctx.translate(cx, cy + H * 0.20);
    ctx.rotate(sw2);
    ctx.strokeStyle = '#C8A050'; ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, H * 0.22); ctx.stroke();
    ctx.fillStyle = '#E8C060';
    ctx.beginPath(); ctx.arc(0, H * 0.23, H * 0.032, 0, 7); ctx.fill();
    ctx.restore();

    // とびら と とり
    const dy = cy - H * 0.20;
    let out = 0, miss = 0;
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 0.7 || d < -0.7) continue;
      const u = d > 0 ? 1 - Math.min(1, d / 0.7) : 1 - Math.min(1, (-d) / 0.7);
      out = Math.max(out, u);
      if (n.res === 'miss') miss = 1;
    }
    ctx.fillStyle = '#5A3A20';
    rr(ctx, cx - W * 0.055, dy - H * 0.045, W * 0.11, H * 0.09, 4); ctx.fill();
    ctx.save();
    ctx.translate(cx - W * 0.055, dy - H * 0.045);
    ctx.rotate(-out * 1.2);
    ctx.fillStyle = '#8A5A34';
    rr(ctx, 0, 0, W * 0.055, H * 0.09, 3); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx + W * 0.055, dy - H * 0.045);
    ctx.rotate(out * 1.2);
    ctx.fillStyle = '#8A5A34';
    rr(ctx, -W * 0.055, 0, W * 0.055, H * 0.09, 3); ctx.fill();
    ctx.restore();
    if (out > 0.02) {
      const bx = cx + out * W * 0.02, by2 = dy - out * H * 0.03;
      ctx.fillStyle = miss ? '#9E9E9E' : '#F0D060';
      ctx.beginPath(); ctx.ellipse(bx, by2, H * 0.075 * out, H * 0.058 * out, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8804A';
      ctx.beginPath();
      ctx.moveTo(bx + H * 0.065 * out, by2);
      ctx.lineTo(bx + H * 0.120 * out, by2 + H * 0.012 * out);
      ctx.lineTo(bx + H * 0.065 * out, by2 + H * 0.022 * out);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2A2028';
      ctx.beginPath(); ctx.arc(bx + H * 0.030 * out, by2 - H * 0.012 * out, H * 0.011 * out, 0, 7);
      ctx.fill();
    }
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    if (sw > 0) burst(cx, dy, H * 0.10, 1 - sw, '#FFF0A0');
    chibi(W * 0.87, H * 0.97, H * 0.26, Object.assign({}, RINA, {
      arm: 1.2 + sw * 1.3,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 27・28 ワールド1の つづき（2） =============================================

STAGES.push(mkVariant('mogura', {
  gi: 26, key: 'mogura2', name: 'もぐらポカポカ 2',
  desc: 'もぐらが すばやくなった',
  rule: 'もぐらが 顔を 出したら タップ！ 前より 速いよ',
  col: '#6EA83A', bpm: 132,
  pats: [
    'o...o...', 'o.o.o.o.', 'o..o..o.', 'o.o.o.o.',
    'oo..o.o.', 'o.o.o.o.', 'o..oo.o.', 'o.......',
    'o.o.o.o.', 'oo.oo...', 'o.o.o.o.', 'o..o..o.',
    'oo..o.o.', 'o.o.o.o.', 'oo.oo.o.', 'o.......',
  ],
}));

STAGES.push(mkVariant('rally', {
  gi: 27, key: 'rally2', name: 'ピンポン ラリー 2',
  desc: 'ラリーが 速くなった',
  rule: 'パパが 打った 玉が きたら タップ！ ラリーが 長くなるよ',
  col: '#3EA87A', bpm: 132,
  pats: [
    'c...o...', 'c.o.c.o.', 'cocococo', 'c...o...',
    'c.o.c.o.', 'cocococo', 'c.o.c.o.', 'c...o...',
    'cocococo', 'c.o.c.o.', 'cocococo', 'c...o...',
    'c.o.c.o.', 'cocococo', 'cocococo', 'c...o...',
  ],
}));

// ===== 29・30 リミックス 5・6 ====================================================

const REMIX5_SEG = [
  { g: 20, pats: ['o...o...', 'o.o.o...', 'o...o.o.', 'o.......'] },
  { g: 23, pats: ['o.o.o.o.', 'o..o..o.', 'o.o.o.o.', 'o.......'] },
  { g: 24, pats: ['o.o.o.o.', 'oo..o...', 'o.o.o.o.', 'o.......'] },
  { g: 25, pats: ['o...o...', 'o.o.o...', 'o.o.o.o.', 'o.......'] },
  { g: 12, pats: ['o...o...', 'oo..oo..', 'o.o.o.o.', 'o.......'] },
  { g: 7, pats: ['..o...o.', '..o...s.', 'o.o.o.o.', '......s.'] },
];

const REMIX6_SEG = [
  { g: 22, pats: ['c...c...', 'o...o...', 'c.o.c...', 'o.o.o...'] },
  { g: 21, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 6, pats: ['c...o...', 'c.o.c.o.', 'cocococo', 'c...o...'] },
  { g: 16, pats: ['o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......'] },
  { g: 24, pats: ['o.o.o.o.', 'o..o..o.', 'oo..o.o.', 'o.......'] },
  { g: 15, pats: ['o.o.o.o.', 'o.o.oo..', 'o.o.o.o.', 'o.......'] },
  { g: 20, pats: ['o..o..o.', 'o.o.o.o.', 'oo..o...', 'o.......'] },
];

STAGES.push(mkRemix(28, 'remix5', 'リミックス 5',
  'ワールド3の ミニゲームが つぎつぎ', '#F0C020', 128, 74, REMIX5_SEG));
STAGES.push(mkRemix(29, 'remix6', 'リミックス 6',
  'まねっこ・ながおし・ラリー ぜんぶ', '#E86A8A', 132, 72, REMIX6_SEG));

// ===== 31 まほうの つえ ==========================================================

STAGES.push({
  gi: 30, key: 'mahou', name: 'まほうの つえ',
  desc: 'おして まほうを ためる',
  rule: 'つえが 光ったら おしっぱなし。まほうが 玉に なったら はなす！',
  col: '#A87AE8',
  bpm: 100, intro: 2, root: 76,
  pitch: [0, 0, 5, 5, 7, 7, 12, 12],
  drum: 'soft', prog: [0, 3, 5, 7], min: [0, 1, 2, 3],
  hit: 'magic', pre: false,
  pats: [
    '..h.....', '..h.....', '..h...h.', '....H...',
    '..h...h.', '....H...', '..h...h.', '..h...h.',
    '....H...', '..h...h.', '......H.', '..h...h.',
    '....H...', '..h...h.', '..h...h.', '..h.....',
  ],
  draw(v) {
    const G = this.gi;
    bg('#1A1436', '#3E2A62');
    starfield(v.beat * 0.5, 22);
    const gy = H * 0.84;
    floor(gy, '#241A3E');
    // 森の 木
    for (let i = 0; i < 5; i++) {
      const x = W * (0.06 + i * 0.22);
      ctx.fillStyle = 'rgba(30,22,54,0.9)';
      ctx.beginPath();
      ctx.moveTo(x - W * 0.05, gy);
      ctx.lineTo(x, gy - H * (0.26 + (i % 3) * 0.05));
      ctx.lineTo(x + W * 0.05, gy);
      ctx.closePath(); ctx.fill();
    }

    const wx = W * 0.34, wy = H * 0.42;         // つえの さき
    let cur = null;
    for (const n of v.notes) {
      if (n.g !== G || n.k !== 'hold') continue;
      if (v.beat >= n.hb - 1.2 && v.beat <= n.b + 0.8) cur = n;
    }
    let t = 0;
    if (cur) t = Math.max(0, Math.min(1, (v.beat - cur.hb) / (cur.b - cur.hb)));
    // ためる わ
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = Math.max(3, H * 0.012);
    ctx.beginPath(); ctx.arc(wx, wy, H * 0.12, 0, 7); ctx.stroke();
    if (cur && v.beat > cur.hb - 0.6) {
      ctx.strokeStyle = t >= 1 ? '#FFE066' : '#C0A0FF';
      ctx.lineWidth = Math.max(4, H * 0.016);
      ctx.beginPath();
      ctx.arc(wx, wy, H * 0.12, -Math.PI / 2, -Math.PI / 2 + Math.min(1, t) * 6.283);
      ctx.stroke();
      const r = H * (0.02 + t * 0.06);
      star5(wx, wy, r, t >= 1 ? '#FFE066' : '#D8B8FF', v.beat * 1.5);
      for (let i = 0; i < 5; i++) {
        const a = v.beat * 2 + i * 1.257;
        star5(wx + Math.cos(a) * H * 0.12, wy + Math.sin(a) * H * 0.12,
              H * 0.012 * (0.4 + t), 'rgba(255,240,180,0.8)', a);
      }
    }
    // はなつと 玉が とんでいく
    for (const n of v.notes) {
      if (n.g !== G || !n.res || n.res === 'miss') continue;
      const d = v.beat - n.b;
      if (d < 0 || d > 1.2) continue;
      const x = wx + d * W * 0.42, y = wy - d * H * 0.20;
      star5(x, y, H * 0.05 * (1 - d / 1.4), '#FFE9A0', v.beat * 3);
      if (d < 0.5) burst(wx, wy, H * 0.10, d * 2, '#E0C8FF');
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 3));
    chibi(W * 0.20, gy + H * 0.04, H * 0.32, Object.assign({}, RINA, {
      body: '#6A4AA8', arm: 0.4, arm2: 2.3,
      squash: v.holding ? 0.16 : 0,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : v.holding ? 'o' : sw > 0.3 ? 'o' : 'h',
    }));
    ctx.strokeStyle = '#C8A060'; ctx.lineWidth = Math.max(3, H * 0.012); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.24, gy - H * 0.18); ctx.lineTo(wx, wy); ctx.stroke();
    if (v.holding) {
      ctx.fillStyle = 'rgba(255,209,102,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('おしっぱなし！', W * 0.32, H * 0.055, 'bold ');
      ctx.fillText('おしっぱなし！', W * 0.70, H * 0.20);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 32 おばけ たいじ ==========================================================

STAGES.push({
  gi: 31, key: 'obake', name: 'おばけ たいじ',
  desc: 'まどから 出た おばけを たいじ',
  rule: 'おばけが まどから 出たら タップ！ まどは 3つ あるよ',
  col: '#7A6AD0',
  bpm: 124, intro: 2, root: 74,
  pitch: [0, 3, 5, 7, 10, 7, 5, 3],
  drum: 'rock', prog: [0, 3, 5, 3], min: [0, 1, 2, 3],
  hit: 'pop', pre: true,
  pats: [
    'o...o...', 'o.o.o...', 'o.o.o.o.', 'o...o.o.',
    'o.o.o.o.', 'oo..o...', 'o..o..o.', 'o.......',
    'o.o.o.o.', 'o..oo...', 'o.o.o.o.', 'oo..o.o.',
    'o..o..o.', 'o.o.o.o.', 'oo..oo..', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#151030', '#3A2A54');
    starfield(v.beat * 0.3, 16);
    const gy = H * 0.88;
    floor(gy, '#1E1838');
    // やしき
    ctx.fillStyle = '#2E2450';
    rr(ctx, W * 0.12, H * 0.28, W * 0.76, H * 0.60, 10); ctx.fill();
    ctx.fillStyle = '#241C42';
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.30);
    ctx.lineTo(W * 0.5, H * 0.10);
    ctx.lineTo(W * 0.92, H * 0.30);
    ctx.closePath(); ctx.fill();
    // つき
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.beginPath(); ctx.arc(W * 0.88, H * 0.14, H * 0.05, 0, 7); ctx.fill();

    const lx = [W * 0.28, W * 0.5, W * 0.72];
    const wy = H * 0.50;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#0E0A22';
      rr(ctx, lx[i] - W * 0.075, wy - H * 0.13, W * 0.15, H * 0.26, 8); ctx.fill();
      ctx.strokeStyle = '#5A4A80'; ctx.lineWidth = Math.max(2, H * 0.006); ctx.stroke();
    }
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 1.1 || d < -0.8) continue;
      const x = lx[n.lane];
      let up = d > 0 ? 1 - Math.min(1, d / 0.9) : 1 - Math.min(1, (-d) / 0.6);
      up = Math.max(0, up);
      if (n.res && d < 0) {
        burst(x, wy - H * 0.06, H * 0.09, (-d) * 2, '#D8D0FF');
        if (n.res !== 'miss') continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx[n.lane] - W * 0.075, 0, W * 0.15, wy + H * 0.13); ctx.clip();
      ctx.globalAlpha = n.res === 'miss' ? 0.4 : 1;
      ghostChar(x, wy + H * 0.10 - up * H * 0.18, H * 0.15, 0.92);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    const hx = lx[Math.max(0, Math.min(2, v.hitLane))];
    if (sw > 0) {
      ctx.strokeStyle = 'rgba(255,230,120,' + sw + ')';
      ctx.lineWidth = Math.max(3, H * 0.014);
      ctx.beginPath();
      ctx.moveTo(W * 0.5, gy - H * 0.02); ctx.lineTo(hx, wy); ctx.stroke();
    }
    chibi(W * 0.5, gy + H * 0.10, H * 0.24, Object.assign({}, RINA, {
      arm: 1.4 + sw * 1.2, arm2: 1.4 + sw * 1.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'n',
    }));
  },
});

// ===== 33 まじょの じゅもん ======================================================

STAGES.push({
  gi: 32, key: 'jumon', name: 'まじょの じゅもん',
  desc: 'まじょの じゅもんを おぼえて となえる',
  rule: 'まじょが 1小節 となえる → つぎの 1小節で 同じ リズムで となえる',
  col: '#C060B0',
  bpm: 118, intro: 2, root: 73,
  pitch: [0, 0, 0, 0, 0, 0, 0, 0],
  drum: 'taiko', prog: [0, 3, 5, 3], min: [0, 1, 2, 3],
  hit: 'magic', pre: false, guide: false,
  pats: callPats([
    'o...o...', 'o.o.o...', 'o...oo..', 'o.o.o.o.',
    'oo..o.o.', 'o..oo.o.', 'o.o.oo..', 'oo.o.o..',
  ]),
  draw(v) {
    bg('#2A1040', '#5A2A6A');
    starfield(v.beat * 0.4, 14);
    const gy = H * 0.88;
    floor(gy, '#1E0E2E');
    // なべ
    ctx.fillStyle = '#3A3040';
    ctx.beginPath();
    ctx.ellipse(W / 2, gy - H * 0.06, W * 0.10, H * 0.06, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(140,255,180,0.6)';
    ctx.beginPath();
    ctx.ellipse(W / 2, gy - H * 0.10, W * 0.085, H * 0.028, 0, 0, 7); ctx.fill();

    const bar = Math.floor(v.beat / 4);
    const mine = ((bar - 2) % 2) === 1 && v.beat >= 8;
    const swA = Math.max(0, Math.min(1, 1 - (v.beat - v.callB) * 5));
    const swR = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 5));
    // じゅもんの 星
    for (const [x, last, col] of [[W * 0.76, v.callB, '#C0A0FF'], [W * 0.24, v.hitB, '#FFE066']]) {
      const t = v.beat - last;
      if (t < 0 || t > 1.2) continue;
      for (let i = 0; i < 4; i++) {
        const a = -1.2 - i * 0.5;
        const r = H * (0.10 + t * 0.22);
        ctx.globalAlpha = Math.max(0, 1 - t);
        star5(x + Math.cos(a) * r, gy - H * 0.30 + Math.sin(a) * r, H * 0.022, col, t * 4 + i);
        ctx.globalAlpha = 1;
      }
    }
    chibi(W * 0.76, gy, H * 0.32, Object.assign({}, PAPA, {
      body: '#4A2A70', hair: '#1A1020', arm: 2.2 + swA * 0.4, arm2: 0.4,
      face: swA > 0.3 ? 'o' : 'n',
    }));
    chibi(W * 0.24, gy, H * 0.32, Object.assign({}, RINA, {
      body: '#8A4AB0', arm: 0.4, arm2: 2.2 + swR * 0.4,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swR > 0.3 ? 'o' : mine ? 'h' : 'n',
    }));

    ctx.fillStyle = mine ? 'rgba(255,209,102,0.94)' : 'rgba(60,50,80,0.6)';
    const bw = W * 0.36, bh = H * 0.11;
    rr(ctx, W / 2 - bw / 2, H * 0.85, bw, bh, 12); ctx.fill();
    ctx.fillStyle = mine ? '#4A3208' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = v.beat < 8 ? 'よく きいてね' : mine ? 'きみの ばん！' : 'まじょの ばん';
    fitFont(lab, bw * 0.86, bh * 0.6, 'bold ');
    ctx.fillText(lab, W / 2, H * 0.85 + bh / 2);
    ctx.textAlign = 'left';
  },
});

// ===== 34 ほしふり ==============================================================

STAGES.push({
  gi: 33, key: 'hoshi', name: 'ほしふり',
  desc: 'おちてくる 星を うけとめる',
  rule: '星が わの ところに きたら タップ！ ななめに おちてくるよ',
  col: '#F0D060',
  bpm: 126, intro: 2, root: 79,
  pitch: [0, 2, 4, 7, 9, 7, 4, 2],
  drum: 'disco', prog: [0, 5, 3, 7], min: [2],
  hit: 'magic', pre: false,
  pats: [
    'o...o...', 'o.o.o...', 'o.o.o.o.', 'o...o.o.',
    'o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......',
    'o..o..o.', 'o.o.o.o.', 'oo..oo..', 'o.o.o.o.',
    'o.o.oo..', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#101A44', '#3A3A8C');
    starfield(v.beat * 0.6, 30);
    const gy = H * 0.86;
    floor(gy, '#1A2050');
    hills(gy, 'rgba(40,50,110,0.9)', 'rgba(28,34,80,0.95)');

    const cx = W * 0.32, cy = gy - H * 0.14;
    const near = nearness(v, G, 3);
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.0 || d < -0.6) continue;
      const u = Math.max(0, Math.min(1.15, 1 - d / 2));
      const sx = W * 0.98, sy = -H * 0.10;
      const x = sx + (cx - sx) * u, y = sy + (cy - sy) * u;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(cx, cy, H * 0.09, (-d) * 2, '#FFF0C0');
        continue;
      }
      // しっぽ
      ctx.strokeStyle = 'rgba(255,240,180,0.35)';
      ctx.lineWidth = Math.max(2, H * 0.008);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + (sx - cx) * 0.12, y + (sy - cy) * 0.12); ctx.stroke();
      star5(x, y, H * 0.040, n.res === 'miss' ? '#9E9E9E' : '#FFE066', v.beat * 2 + n.i);
    }
    ring(cx, cy, H * 0.080, near);

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(cx, gy + H * 0.04, H * 0.32, Object.assign({}, RINA, {
      arm: 2.4, arm2: 2.4, squash: sw * 0.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
  },
});

// ===== 35 ドラゴン ジャンプ ======================================================

STAGES.push({
  gi: 34, key: 'dragon', name: 'ドラゴン ジャンプ',
  desc: 'はばたいて 岩を こえる',
  rule: '岩が 目の前に きたら タップ！ ドラゴンが はばたいて とびこえる',
  col: '#E86A4A',
  bpm: 108, intro: 2, root: 72,
  pitch: [0, 4, 7, 4, 9, 7, 5, 4],
  drum: 'march', prog: [0, 5, 7, 5], min: [0],
  hit: 'boing', pre: true,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o...o.o.',
    'o.o.o.o.', 'o...oo..', 'o.o.o.o.', 'o.......',
    'o..o..o.', 'o.o.o.o.', 'o...oo..', 'o.o.o.o.',
    'o..o..o.', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#FFD0A0', '#F09060');
    const gy = H * 0.78;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(W * 0.16, H * 0.18, H * 0.06, 0, 7); ctx.fill();
    floor(gy, '#8A5A3A');
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 10; i++) {
      const x = (((i * 120 - v.beat * 40) % (W + 120)) + W + 120) % (W + 120) - 60;
      ctx.fillRect(x, gy + H * 0.04, W * 0.08, H * 0.008);
    }

    const dx = W * 0.28;
    const jt = (v.beat - v.hitB + 0.15) / 0.85;
    const jump = jt >= 0 && jt <= 1 ? Math.sin(jt * Math.PI) * H * 0.20 : 0;
    const dy = gy - H * 0.09 - jump;

    // 岩
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.8) continue;
      const x = dx + (d / 2) * (W - dx + H * 0.2);
      if (n.res && d < 0 && n.res !== 'miss') continue;
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : '#6A5A4A';
      ctx.beginPath();
      ctx.moveTo(x - H * 0.06, gy);
      ctx.lineTo(x - H * 0.03, gy - H * 0.10);
      ctx.lineTo(x + H * 0.02, gy - H * 0.12);
      ctx.lineTo(x + H * 0.06, gy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(x - H * 0.01, gy - H * 0.07, H * 0.014, 0, 7); ctx.fill();
    }

    // ドラゴン
    const flap = Math.max(0, 1 - (v.beat - v.hitB) * 3);
    ctx.fillStyle = '#4EA84E';
    ctx.beginPath();
    ctx.ellipse(dx, dy, H * 0.13, H * 0.075, 0, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(dx + H * 0.13, dy - H * 0.05, H * 0.06, H * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3A8A3A';
    ctx.beginPath();
    ctx.moveTo(dx - H * 0.02, dy - H * 0.05);
    ctx.quadraticCurveTo(dx - H * 0.10, dy - H * (0.10 + flap * 0.16), dx - H * 0.18, dy - H * 0.02);
    ctx.quadraticCurveTo(dx - H * 0.10, dy - H * 0.02, dx - H * 0.02, dy - H * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4EA84E'; ctx.lineWidth = Math.max(3, H * 0.012); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dx - H * 0.12, dy);
    ctx.quadraticCurveTo(dx - H * 0.22, dy + H * 0.02, dx - H * 0.24, dy - H * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#2A2028';
    ctx.beginPath(); ctx.arc(dx + H * 0.15, dy - H * 0.065, H * 0.010, 0, 7); ctx.fill();
    if (flap > 0.5) {
      ctx.fillStyle = 'rgba(255,180,60,0.85)';
      ctx.beginPath();
      ctx.moveTo(dx + H * 0.19, dy - H * 0.04);
      ctx.lineTo(dx + H * 0.30, dy - H * 0.02);
      ctx.lineTo(dx + H * 0.19, dy);
      ctx.closePath(); ctx.fill();
    }
    chibi(dx - H * 0.02, dy - H * 0.05, H * 0.20, Object.assign({}, RINA, {
      arm: 2.2, arm2: 2.2, face: jump > 0 ? 'o' : 'h',
    }));
  },
});

// ===== 36 はなび ================================================================

STAGES.push({
  gi: 35, key: 'hanabi', name: 'はなび',
  desc: '上がった たまを ひらかせる',
  rule: 'はなびの たまが 上の 線に きたら タップ！ ドンと ひらくよ',
  col: '#F0608A',
  bpm: 120, intro: 2, root: 76,
  pitch: [0, 4, 7, 12, 9, 7, 4, 2],
  drum: 'funk', prog: [0, 5, 3, 7], min: [1],
  hit: 'boom', pre: false,
  pats: [
    'o...o...', 'o...o...', 'o.o.o...', 'o.o.o.o.',
    'o...oo..', 'o.o.o.o.', 'o..o..o.', 'o.......',
    'o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o..oo...',
    'o.o.o.o.', 'oo..oo..', 'o.o.o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#0E1230', '#2A2A5A');
    starfield(v.beat * 0.2, 20);
    const gy = H * 0.88;
    floor(gy, '#141838');
    // かわ
    ctx.fillStyle = 'rgba(120,160,255,0.16)';
    ctx.fillRect(0, gy, W, H - gy);

    const ty = H * 0.26;
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.setLineDash([H * 0.02, H * 0.02]);
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
    ctx.setLineDash([]);

    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      const x = W * (0.18 + (n.i % 5) * 0.16);
      if (d <= 0 && d > -1.6 && n.res && n.res !== 'miss') {
        // ひらいた はなび
        const u = (-d) / 1.6;
        const col = ['#FFE066', '#FF7ABF', '#7FE0C0', '#A8C8FF', '#FFB070'][n.i % 5];
        ctx.globalAlpha = Math.max(0, 1 - u);
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, H * 0.007);
        for (let i = 0; i < 12; i++) {
          const a = i * 0.5236;
          const r0 = H * 0.02 + u * H * 0.18, r1 = H * 0.03 + u * H * 0.26;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r0, ty + Math.sin(a) * r0);
          ctx.lineTo(x + Math.cos(a) * r1, ty + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      if (d > 2.0 || d < 0) continue;
      const u = Math.max(0, Math.min(1, 1 - d / 2));
      const y = gy - u * (gy - ty);
      ctx.strokeStyle = 'rgba(255,200,120,0.5)';
      ctx.lineWidth = Math.max(2, H * 0.006);
      ctx.beginPath(); ctx.moveTo(x, y + H * 0.05); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : '#FFD166';
      ctx.beginPath(); ctx.arc(x, y, H * 0.022, 0, 7); ctx.fill();
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    for (let i = 0; i < 3; i++) {
      chibi(W * (0.30 + i * 0.20), gy + H * 0.10, H * 0.20,
            Object.assign({}, i === 1 ? RINA : PAPA, {
              body: ['#3E7ACF', '#F06A9C', '#59B07A'][i],
              arm: 1.8 + sw * 0.8, arm2: 1.8 + sw * 0.8, face: sw > 0.3 ? 'o' : 'h',
            }));
    }
  },
});

// ===== 37・38 ワールド1の つづき（2） =============================================

STAGES.push(mkVariant('robo', {
  gi: 36, key: 'robo2', name: 'ロボダンス 2',
  desc: 'うら拍が もっと ふえた',
  rule: '玉が まん中の 線に きたら タップ！ うら拍だらけ だよ',
  col: '#7A4AD0', bpm: 132,
  pats: [
    'o.o.o.o.', '..o...o.', 'o.o.o.o.', '.o.o.o.o',
    'o..o..o.', '.o.o.o.o', 'o.o.o.o.', 'o.......',
    '.o.o.o.o', 'o.o.o.o.', '..o.o.o.', '.o.o.o.o',
    'o..o..o.', '.o.o.o.o', 'oo..oo..', 'o.......',
  ],
}));

STAGES.push(mkVariant('idol', {
  gi: 37, key: 'idol2', name: 'りなアイドル 2',
  desc: 'かけ声が ふえた',
  rule: '玉が 線に きたら タップ！ ピンクの 玉は「キャー！」だよ',
  col: '#E04A9C', bpm: 136,
  pats: [
    '..o...o.', '..o.o.s.', '..o.o.o.', '..o.o.s.',
    'o.o.o.o.', '..o.o.s.', 'o.o.o.o.', '..o.o.s.',
    '..o.o.o.', 'o.o.o.s.', 'o.o.o.o.', '..o.o.s.',
    'o.o.o.o.', 'o.o.o.s.', 'o.o.o.oo', '......s.',
  ],
}));

// ===== 39・40 リミックス 7・8 ====================================================

const REMIX7_SEG = [
  { g: 33, pats: ['o...o...', 'o.o.o...', 'o.o.o.o.', 'o.......'] },
  { g: 31, pats: ['o.o.o.o.', 'oo..o...', 'o..o..o.', 'o.......'] },
  { g: 34, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.......'] },
  { g: 35, pats: ['o.o.o.o.', 'o..o..o.', 'o.o.o.o.', 'o.......'] },
  { g: 30, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 33, pats: ['o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......'] },
];

const REMIX8_SEG = [
  { g: 32, pats: ['c...c...', 'o...o...', 'c.o.c.o.', 'o.o.o.o.'] },
  { g: 36, pats: ['.o.o.o.o', 'o.o.o.o.', '..o...o.', 'o.......'] },
  { g: 37, pats: ['..o...o.', '..o.o.s.', 'o.o.o.o.', '......s.'] },
  { g: 31, pats: ['o.o.o.o.', 'o..oo...', 'o.o.o.o.', 'o.......'] },
  { g: 34, pats: ['o..o..o.', 'o.o.o.o.', 'oo..o.o.', 'o.......'] },
  { g: 35, pats: ['o.o.o.o.', 'oo..oo..', 'o.o.o.o.', 'o.......'] },
  { g: 26, pats: ['o.o.o.o.', 'oo..o.o.', 'o..o..o.', 'o.......'] },
];

STAGES.push(mkRemix(38, 'remix7', 'リミックス 7',
  'まほうの もりの ミニゲーム', '#B070E8', 130, 76, REMIX7_SEG));
STAGES.push(mkRemix(39, 'remix8', 'リミックス 8',
  'じゅもんも ダンスも かけ声も', '#E85CA0', 134, 74, REMIX8_SEG));

// ===== 41 UFO かんさつ ==========================================================

STAGES.push({
  gi: 40, key: 'ufo', name: 'UFO かんさつ',
  desc: 'まん中に きた UFO を うつす',
  rule: 'UFO が まん中の わに 入ったら タップ！ シャッターの おと が するよ',
  col: '#5AD0C0',
  bpm: 116, intro: 2, root: 74,
  pitch: [0, 5, 7, 10, 7, 5, 3, 0],
  drum: 'rock', prog: [0, 5, 3, 7], min: [0, 2],
  hit: 'beam', pre: false,
  pats: [
    'o...o...', 'o.o.o...', 'o.o.o.o.', 'o...o.o.',
    'o.o.o.o.', 'oo..o.o.', 'o..o..o.', 'o.......',
    'o.o.o.o.', 'o..o..o.', 'oo..oo..', 'o.o.o.o.',
    'o.o.oo..', 'o.o.o.o.', 'oo..o.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#0A1030', '#1E2A5A');
    starfield(v.beat * 0.5, 34);
    const gy = H * 0.86;
    floor(gy, '#101838');
    hills(gy, 'rgba(30,40,90,0.9)', 'rgba(20,26,64,0.95)');

    const cx = W / 2, cy = H * 0.38;
    const near = nearness(v, G, 3);
    ring(cx, cy, H * 0.10, near, 'rgba(120,255,220,0.85)');
    ctx.strokeStyle = 'rgba(120,255,220,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - H * 0.14, cy); ctx.lineTo(cx + H * 0.14, cy);
    ctx.moveTo(cx, cy - H * 0.14); ctx.lineTo(cx, cy + H * 0.14);
    ctx.stroke();

    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.2 || d < -0.7) continue;
      const dir = n.i % 2 ? 1 : -1;
      const x = cx + dir * (d / 2) * (W * 0.62);
      const y = cy + Math.sin(d * 2.2 + n.i) * H * 0.05;
      if (n.res && d < 0) {
        if (n.res !== 'miss') {
          ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 0.5 + d * 1.6) + ')';
          ctx.fillRect(0, 0, W, H);
          burst(cx, cy, H * 0.11, (-d) * 2, '#B0FFE8');
        }
        continue;
      }
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : '#9AA8C0';
      ctx.beginPath(); ctx.ellipse(x, y, H * 0.075, H * 0.024, 0, 0, 7); ctx.fill();
      ctx.fillStyle = n.res === 'miss' ? '#A0A0A0' : '#7FE0C0';
      ctx.beginPath(); ctx.arc(x, y - H * 0.012, H * 0.034, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(x + i * H * 0.040, y + H * 0.010, H * 0.008, 0, 7); ctx.fill();
      }
    }

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 4));
    chibi(W * 0.16, gy + H * 0.08, H * 0.30, Object.assign({}, RINA, {
      arm: 2.2, arm2: 2.2,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'h',
    }));
    ctx.fillStyle = sw > 0.3 ? '#FFF0A0' : '#3A4258';
    rr(ctx, W * 0.16 - H * 0.045, gy - H * 0.20, H * 0.09, H * 0.06, 6); ctx.fill();
  },
});

// ===== 42 わくせい ジャンプ ======================================================

STAGES.push({
  gi: 41, key: 'wakusei', name: 'わくせい ジャンプ',
  desc: '星から 星へ ふわりと とぶ',
  rule: 'つぎの 星が 足もとに きたら タップ！ ふわっと とぶよ',
  col: '#8AA0F0',
  bpm: 104, intro: 2, root: 72,
  pitch: [0, 5, 9, 5, 12, 9, 7, 5],
  drum: 'soft', prog: [0, 5, 3, 7], min: [1, 3],
  hit: 'boing', pre: true,
  pats: [
    'o...o...', 'o...o...', 'o...o...', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o...o...', 'o.......',
    'o.o.o.o.', 'o...o...', 'o..o..o.', 'o.o.o.o.',
    'o...o...', 'o.o.o.o.', 'o.o.o...', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#150E38', '#332A72');
    starfield(v.beat * 0.7, 36);
    const py = H * 0.66;
    const px = W * 0.28;

    const near = nearness(v, G, 3);
    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 2.4 || d < -0.9) continue;
      const x = px + (d / 2) * (W - px + H * 0.3);
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(px, py + H * 0.02, H * 0.10, (-d) * 1.6, '#C8D8FF');
        continue;
      }
      const r = H * 0.075;
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : ['#E88A5A', '#7AC0E8', '#C8A0E8', '#8AD8A0'][n.i % 4];
      ctx.beginPath(); ctx.arc(x, py + r * 0.8, r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(x - r * 0.3, py + r * 0.5, r * 0.35, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = Math.max(2, H * 0.005);
      ctx.beginPath(); ctx.ellipse(x, py + r * 0.8, r * 1.5, r * 0.36, 0.25, 0, 7); ctx.stroke();
    }
    ring(px, py, H * 0.055, near);

    const jt = (v.beat - v.hitB + 0.2) / 1.1;              // うちゅうは ゆっくり とぶ
    const jump = jt >= 0 && jt <= 1 ? Math.sin(jt * Math.PI) * H * 0.24 : 0;
    chibi(px, py - jump, H * 0.28, Object.assign({}, RINA, {
      body: '#D8D8E8', arm: 1.6 + (jump / H) * 2.4, arm2: 1.6 + (jump / H) * 2.4,
      squash: jump > 0 ? 0 : near * 0.35,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : jump > 0 ? 'o' : 'h',
    }));
    // ヘルメット
    ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath();
    ctx.arc(px, py - jump - H * 0.195, H * 0.058, 0, 7); ctx.stroke();
  },
});

// ===== 43 うちゅうじん ==========================================================

STAGES.push({
  gi: 42, key: 'alien', name: 'うちゅうじん',
  desc: 'ひかりの あいずを まねする',
  rule: 'うちゅうじんが 1小節 光る → つぎの 1小節で 同じ リズムで 光らせる',
  col: '#7FE0A0',
  bpm: 124, intro: 2, root: 76,
  pitch: [0, 0, 0, 0, 0, 0, 0, 0],
  drum: 'taiko', prog: [0, 5, 3, 7], min: [0, 2],
  hit: 'beam', pre: false, guide: false,
  pats: callPats([
    'o...o...', 'o.o.o...', 'o...oo..', 'o.o.o.o.',
    'oo..o.o.', 'o..oo.o.', 'oo.o.o..', 'o.o.oo..',
  ]),
  draw(v) {
    bg('#08122E', '#1A2C58');
    starfield(v.beat * 0.4, 30);
    const gy = H * 0.88;
    floor(gy, '#101C3A');

    const bar = Math.floor(v.beat / 4);
    const mine = ((bar - 2) % 2) === 1 && v.beat >= 8;
    const swA = Math.max(0, Math.min(1, 1 - (v.beat - v.callB) * 5));
    const swR = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 5));

    // うちゅうじんの えんばん
    const ax = W * 0.76, ay = H * 0.44;
    ctx.fillStyle = 'rgba(120,255,180,' + (0.10 + swA * 0.35) + ')';
    ctx.beginPath();
    ctx.moveTo(ax - H * 0.09, ay);
    ctx.lineTo(ax + H * 0.09, ay);
    ctx.lineTo(ax + H * 0.20, gy);
    ctx.lineTo(ax - H * 0.20, gy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8A98B0';
    ctx.beginPath(); ctx.ellipse(ax, ay, H * 0.13, H * 0.040, 0, 0, 7); ctx.fill();
    ctx.fillStyle = swA > 0.3 ? '#FFF0A0' : '#7FE0C0';
    ctx.beginPath(); ctx.arc(ax, ay - H * 0.02, H * 0.055, Math.PI, 0); ctx.fill();

    // りなの ライト
    const rx = W * 0.24;
    ctx.fillStyle = 'rgba(255,230,120,' + (0.08 + swR * 0.4) + ')';
    ctx.beginPath();
    ctx.moveTo(rx - H * 0.04, gy - H * 0.24);
    ctx.lineTo(rx + H * 0.04, gy - H * 0.24);
    ctx.lineTo(rx + H * 0.16, H * 0.10);
    ctx.lineTo(rx - H * 0.16, H * 0.10);
    ctx.closePath(); ctx.fill();
    chibi(rx, gy, H * 0.30, Object.assign({}, RINA, {
      arm: 2.4, arm2: 2.4,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : swR > 0.3 ? 'o' : mine ? 'h' : 'n',
    }));

    ctx.fillStyle = mine ? 'rgba(255,209,102,0.94)' : 'rgba(60,50,80,0.6)';
    const bw = W * 0.36, bh = H * 0.11;
    rr(ctx, W / 2 - bw / 2, H * 0.85, bw, bh, 12); ctx.fill();
    ctx.fillStyle = mine ? '#4A3208' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = v.beat < 8 ? 'よく 見ててね' : mine ? 'きみの ばん！' : 'うちゅうじんの ばん';
    fitFont(lab, bw * 0.86, bh * 0.6, 'bold ');
    ctx.fillText(lab, W / 2, H * 0.85 + bh / 2);
    ctx.textAlign = 'left';
  },
});

// ===== 44 ワープ ゲート =========================================================

STAGES.push({
  gi: 43, key: 'warp', name: 'ワープ ゲート',
  desc: 'おして ためて、ゲートで はなす',
  rule: 'ゲートが 見えたら おしっぱなし。まん中に きたら はなす！',
  col: '#6A8AE8',
  bpm: 112, intro: 2, root: 74,
  pitch: [0, 0, 7, 7, 9, 9, 12, 12],
  drum: 'drive', prog: [0, 5, 3, 7], min: [0, 2],
  hit: 'magic', pre: false,
  pats: [
    '..h.....', '..h.....', '..h...h.', '....H...',
    '..h...h.', '..h...h.', '....H...', '......H.',
    '..h...h.', '....H...', '..h...h.', '..h...h.',
    '....H...', '..h...h.', '......H.', '..h.....',
  ],
  draw(v) {
    const G = this.gi;
    bg('#0A0E2A', '#2A2A66');
    // ワープ中の 星
    for (let i = 0; i < 26; i++) {
      const sp = 1 + (i % 5) * 0.6;
      const x = W - (((i * 137 + v.beat * 120 * sp) % (W + 60)));
      const y = H * (0.06 + ((i * 53) % 84) / 100);
      ctx.strokeStyle = 'rgba(180,200,255,' + (0.2 + (i % 3) * 0.2) + ')';
      ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + H * 0.05 * sp, y); ctx.stroke();
    }

    const sx = W * 0.30, sy = H * 0.56;
    let cur = null;
    for (const n of v.notes) {
      if (n.g !== G || n.k !== 'hold') continue;
      if (v.beat >= n.hb - 2.4 && v.beat <= n.b + 0.6) cur = n;
    }
    // ゲートが 近づいてくる
    if (cur) {
      const len = cur.b - cur.hb;
      const d = cur.b - v.beat;
      const u = Math.max(0, Math.min(1.1, 1 - d / (len + 2)));
      const gx = sx + (1 - u) * (W - sx + H * 0.3);
      const r = H * (0.06 + u * 0.16);
      ctx.strokeStyle = cur.held ? '#FFD166' : 'rgba(160,200,255,0.8)';
      ctx.lineWidth = Math.max(4, H * 0.018);
      ctx.beginPath(); ctx.ellipse(gx, sy, r * 0.6, r, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,220,255,0.35)';
      ctx.lineWidth = Math.max(2, H * 0.008);
      ctx.beginPath(); ctx.ellipse(gx, sy, r * 0.4, r * 0.7, 0, 0, 7); ctx.stroke();
      const t = Math.max(0, Math.min(1, (v.beat - cur.hb) / len));
      if (v.beat > cur.hb - 0.5) {
        ctx.strokeStyle = t >= 1 ? '#FFE066' : '#7FC8FF';
        ctx.lineWidth = Math.max(4, H * 0.016);
        ctx.beginPath();
        ctx.arc(sx, sy, H * 0.13, -Math.PI / 2, -Math.PI / 2 + Math.min(1, t) * 6.283);
        ctx.stroke();
      }
      if (cur.res && cur.res !== 'miss' && v.beat > cur.b && v.beat < cur.b + 0.9) {
        burst(sx, sy, H * 0.14, (v.beat - cur.b) * 1.4, '#C8E0FF');
      }
    }

    // うちゅうせん
    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 3));
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#DCE4F4';
    ctx.beginPath();
    ctx.moveTo(H * 0.13, 0);
    ctx.quadraticCurveTo(0, -H * 0.055, -H * 0.10, -H * 0.02);
    ctx.quadraticCurveTo(0, H * 0.055, H * 0.13, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7FC8F0';
    ctx.beginPath(); ctx.ellipse(H * 0.03, -H * 0.012, H * 0.030, H * 0.020, 0, 0, 7); ctx.fill();
    if (v.holding || sw > 0.2) {
      ctx.fillStyle = 'rgba(255,180,80,0.9)';
      ctx.beginPath();
      ctx.moveTo(-H * 0.10, -H * 0.02);
      ctx.lineTo(-H * (0.16 + (v.holding ? 0.10 : 0)), 0);
      ctx.lineTo(-H * 0.10, H * 0.012);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    chibi(W * 0.82, H * 0.90, H * 0.24, Object.assign({}, RINA, {
      arm: v.holding ? 2.3 : 1.5, arm2: v.holding ? 2.3 : 1.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : v.holding ? 'o' : 'h',
    }));
    if (v.holding) {
      ctx.fillStyle = 'rgba(255,209,102,0.95)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitFont('おしっぱなし！', W * 0.32, H * 0.055, 'bold ');
      ctx.fillText('おしっぱなし！', W * 0.30, H * 0.20);
      ctx.textAlign = 'left';
    }
  },
});

// ===== 45 すいせい ラッシュ ======================================================

STAGES.push({
  gi: 44, key: 'comet', name: 'すいせい ラッシュ',
  desc: 'いちばん 速い。すいせいを はじく',
  rule: 'すいせいが わに きたら タップ！ とても 速いよ',
  col: '#F06080',
  bpm: 140, intro: 2, root: 79,
  pitch: [0, 2, 3, 5, 7, 5, 3, 2],
  drum: 'drive', prog: [0, 3, 5, 7], min: [0, 1, 2, 3],
  hit: 'beam', pre: false,
  pats: [
    'o...o...', 'o.o.o.o.', 'o.o.o.o.', 'o..o..o.',
    'o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......',
    'o.o.o.o.', 'oo.oo...', 'o.o.o.o.', 'o..o..o.',
    'oo..o.o.', 'o.o.o.o.', 'oo.oo.o.', 'o.......',
  ],
  draw(v) {
    const G = this.gi;
    bg('#1A0A2A', '#4A1A44');
    starfield(v.beat * 1.2, 40);
    const cx = W * 0.34, cy = H * 0.44;
    const near = nearness(v, G, 4);

    for (const n of v.notes) {
      if (n.g !== G) continue;
      const d = n.b - v.beat;
      if (d > 1.6 || d < -0.5) continue;
      const u = Math.max(0, Math.min(1.1, 1 - d / 1.6));
      const sx = W * 1.05, sy = -H * 0.15;
      const x = sx + (cx - sx) * u, y = sy + (cy - sy) * u;
      if (n.res && d < 0) {
        if (n.res !== 'miss') burst(cx, cy, H * 0.10, (-d) * 2.4, '#FFC0D0');
        continue;
      }
      ctx.strokeStyle = 'rgba(255,160,200,0.45)';
      ctx.lineWidth = Math.max(3, H * 0.012);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (sx - cx) * 0.18, y + (sy - cy) * 0.18);
      ctx.stroke();
      ctx.fillStyle = n.res === 'miss' ? '#8E8E8E' : '#FF9EC0';
      ctx.beginPath(); ctx.arc(x, y, H * 0.034, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(x - H * 0.008, y - H * 0.008, H * 0.014, 0, 7); ctx.fill();
    }
    ring(cx, cy, H * 0.075, near, 'rgba(255,180,210,0.9)');

    const sw = Math.max(0, Math.min(1, 1 - (v.beat - v.hitB) * 5));
    chibi(cx - W * 0.02, H * 1.02, H * 0.26, Object.assign({}, RINA, {
      body: '#D8D8E8', arm: 1.0 + sw * 1.5, arm2: 0.5,
      face: v.missB > v.hitB && v.beat - v.missB < 0.8 ? 'x' : sw > 0.3 ? 'o' : 'n',
    }));
  },
});

// ===== 46・47 ワールド1の つづき（2） =============================================

STAGES.push(mkVariant('neji', {
  gi: 45, key: 'neji2', name: 'ねじまき ロボ 2',
  desc: 'ベルトが 速くなった',
  rule: 'ロボが 近づいたら おしっぱなし。線に きたら はなす！ 前より 速いよ',
  col: '#3E90B8', bpm: 124,
  pats: [
    '..h.....', '..h...h.', '....H...', '..h...h.',
    '..h...h.', '....H...', '..h...h.', '......H.',
    '..h...h.', '..h...h.', '....H...', '..h...h.',
    '......H.', '..h...h.', '....H...', '..h.....',
  ],
}));

STAGES.push(mkVariant('mane', {
  gi: 46, key: 'mane2', name: 'まねっこ たいこ 2',
  desc: 'リズムが むずかしくなった',
  rule: 'パパが 1小節 たたく → つぎの 1小節で 同じ リズムを まねる。長いよ',
  col: '#B0402A', bpm: 128,
  pats: callPats([
    'o.o.o...', 'o..oo.o.', 'oo.o.o..', 'o.o.oo..',
    'oo..o.o.', 'o.oo.o..', 'o..o.oo.', 'oo.o.oo.',
  ]),
}));

// ===== 48・49・50 さいごの リミックス =============================================

const REMIX9_SEG = [
  { g: 40, pats: ['o...o...', 'o.o.o.o.', 'o..o..o.', 'o.......'] },
  { g: 41, pats: ['o...o...', 'o...o...', 'o.o.o.o.', 'o.......'] },
  { g: 44, pats: ['o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......'] },
  { g: 43, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 40, pats: ['o.o.o.o.', 'o..o..o.', 'oo..oo..', 'o.......'] },
  { g: 44, pats: ['o.o.o.o.', 'oo.oo...', 'o.o.o.o.', 'o.......'] },
];

const REMIX10_SEG = [
  { g: 42, pats: ['c.o.c...', 'o.o.o...', 'c...cc..', 'o...oo..'] },
  { g: 45, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 36, pats: ['.o.o.o.o', 'o.o.o.o.', '..o...o.', 'o.......'] },
  { g: 27, pats: ['c.o.c.o.', 'cocococo', 'c.o.c.o.', 'c...o...'] },
  { g: 37, pats: ['..o.o.o.', 'o.o.o.s.', 'o.o.o.o.', '......s.'] },
  { g: 41, pats: ['o...o...', 'o.o.o.o.', 'o...o...', 'o.......'] },
  { g: 44, pats: ['o.o.o.o.', 'oo..o.o.', 'o.o.o.o.', 'o.......'] },
];

// さいごは ぜんぶの ワールドから。8つ ならぶ。
const FINAL_SEG = [
  { g: 0, pats: ['o...o...', 'o.o.o.o.', 'o...oo..', 'o.......'] },
  { g: 10, pats: ['o.o.o.o.', 'o...o...', 'o..o..o.', 'o.......'] },
  { g: 24, pats: ['o.o.o.o.', 'oo..o...', 'o.o.o.o.', 'o.......'] },
  { g: 33, pats: ['o...o...', 'o.o.o.o.', 'oo..o.o.', 'o.......'] },
  { g: 30, pats: ['..h...h.', '....H...', '..h...h.', '..h.....'] },
  { g: 6, pats: ['c...o...', 'c.o.c.o.', 'cocococo', 'c...o...'] },
  { g: 37, pats: ['..o...o.', '..o.o.s.', 'o.o.o.o.', '......s.'] },
  { g: 44, pats: ['o.o.o.o.', 'o..o..o.', 'oo..o.o.', 'o.......'] },
];

STAGES.push(mkRemix(47, 'remix9', 'リミックス 9',
  'うちゅうの ミニゲームが つぎつぎ', '#5AC0E0', 134, 74, REMIX9_SEG));
STAGES.push(mkRemix(48, 'remix10', 'リミックス 10',
  'まねっこも ながおしも ラリーも', '#F0904A', 138, 72, REMIX10_SEG));
STAGES.push(mkRemix(49, 'final', 'さいごの リミックス',
  'ぜんぶの ワールドから。いちばん 長い', '#FFD166', 140, 76, FINAL_SEG));

// ===== ワールド ==================================================================
//
// 10面ずつ 5つの ワールド。ミニゲームえらび の 画面は これで ページに 分ける。

const WORLDS = [
  { name: 'ワールド 1  はじまり', col: '#F0864A', from: 0, to: 9 },
  { name: 'ワールド 2  おそと', col: '#5FC08A', from: 10, to: 19 },
  { name: 'ワールド 3  おうち', col: '#E8A040', from: 20, to: 29 },
  { name: 'ワールド 4  まほうの もり', col: '#A87AE8', from: 30, to: 39 },
  { name: 'ワールド 5  うちゅう', col: '#5AD0C0', from: 40, to: 49 },
];

function worldOf(i) {
  for (let w = 0; w < WORLDS.length; w++) if (i >= WORLDS[w].from && i <= WORLDS[w].to) return w;
  return 0;
}
