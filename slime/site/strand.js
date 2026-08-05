// のばしたときの ひも。
//
// 三角形を のばすのでは スライムに見えないので、ひもを 16この ふしに分けて
// ほんとうに たらしている。
//   ・おもりが かかるので まんなかが 下に たれる（べちょっと）
//   ・ゆびを 動かすと 少し おくれて ついてくる（とろっと）
//   ・ふしとふしの あいだの「かさ」は 決まっているので、
//     のばした ところほど 細くなる（＝ くびれる）
//   ・ひっぱると たまから 中身が 流れ出して ひもに入る。たまは やせる
//   ・細くなりすぎた ところで ちぎれて、しずくが とぶ
//
// ゆっくり ひっぱると 中身が 流れて 太さが もどるので よくのびる。
// いっきに ひっぱると 流れが 間にあわず 細くなって ちぎれる。
// 本物のスライムと 同じ。

'use strict';

const STRAND_N = 16;

// つまんだ ところの ふち。まわりが へこんでいれば それも ついてくる
function anchorPoint(b, ang) {
  const n = b.pts.length;
  const t = (((ang / (Math.PI * 2)) % 1) + 1) % 1 * n;
  const i = Math.floor(t), f = t - i;
  const off = b.pts[i % n].off * (1 - f) + b.pts[(i + 1) % n].off * f;
  const r = (b.r + off) * 0.84;
  return { x: b.x + Math.cos(ang) * r * b.sx, y: b.y + Math.sin(ang) * r * b.sy };
}

// ang ＝ たまの どこを つまんだか。ひもは そこから 生える
function makeStrand(b, ang, px, py, p) {
  const nodes = [];
  const a0 = anchorPoint(b, ang);
  const L0 = Math.max(b.r * 0.5, Math.hypot(px - a0.x, py - a0.y));
  for (let i = 0; i < STRAND_N; i++) {
    const t = i / (STRAND_N - 1);
    const x = a0.x + (px - a0.x) * t, y = a0.y + (py - a0.y) * t;
    nodes.push({ x, y, ox: x, oy: y });
  }
  const vol = L0 * b.r * 0.75;
  // ねもとほど 太い。中身は たまから 流れてくるので 自然と こうなる
  const w = [];
  let wsum = 0;
  for (let i = 0; i < STRAND_N - 1; i++) {
    const v = 1 - 0.74 * (i / (STRAND_N - 2));
    w.push(v); wsum += v;
  }
  for (let i = 0; i < w.length; i++) w[i] /= wsum;
  const seg0 = L0 / (STRAND_N - 1);
  const rad = w.map((v) => vol * v / (2 * Math.max(2, seg0)));
  // V ＝ ふしと ふしの あいだに 入っている 中身の りょう。
  // これが 本物の 中身で、太さは V ÷ 長さ から 出す。
  // V は ひもの中を 流れて 動く（strandFlow）
  const V = w.map((v) => vol * v);
  return { nodes, ang, L0, vol, vol0: vol, len: L0, seg: [], rad, w, V,
           broken: -1, fade: 1, rel: 0, dead: false, drops: [] };
}

function strandStep(s, b, px, py, p, dt, held) {
  const N = s.nodes, n = N.length;
  const dd = Math.min(0.032, dt);
  const grav = 2000, damp = 0.90;
  const pinEnd = held && s.broken < 0;

  for (let i = 1; i < n; i++) {
    if (i === n - 1 && pinEnd) continue;
    const q = N[i];
    const vx = (q.x - q.ox) * damp, vy = (q.y - q.oy) * damp;
    q.ox = q.x; q.oy = q.y;
    q.x += vx; q.y += vy + grav * dd * dd;
    // つくえの上に たまる。ずるずる すべって 止まる
    if (s.floor && q.y > s.floor) {
      q.y = s.floor;
      q.ox = q.x - (q.x - q.ox) * 0.55;
      q.oy = q.y;
    }
  }
  const a0 = anchorPoint(b, s.ang);        // つまんだ ところに くっついたまま
  N[0].x = a0.x; N[0].y = a0.y; N[0].ox = a0.x; N[0].oy = a0.y;
  if (pinEnd) {
    const e = N[n - 1];
    e.ox = e.x; e.oy = e.y;        // ゆびの はやさを ひもに つたえる
    e.x = px; e.y = py;
  }

  // ふしの あいだを つなぎとめる。ちぢむのは 自由（＝ たれる）
  // くりかえしを 少なめにしておくと、ちからが じわっと つたわる。
  // ひもが かたい棒ではなく とろっとした 流れものに見える
  const segRest = s.L0 / (n - 1);
  for (let it = 0; it < 3; it++) {
    for (let i = 0; i < n - 1; i++) {
      if (i === s.broken) continue;
      const a = N[i], c = N[i + 1];
      const dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6 || d <= segRest) continue;
      const ma = i === 0 ? 0 : 1;
      const mc = (i + 1 === n - 1 && pinEnd) ? 0 : 1;
      const tot = ma + mc;
      if (!tot) continue;
      const corr = (d - segRest) / d * 0.55;
      if (ma) { a.x += dx * corr * (ma / tot); a.y += dy * corr * (ma / tot); }
      if (mc) { c.x -= dx * corr * (mc / tot); c.y -= dy * corr * (mc / tot); }
    }
  }

  // 長さと 太さ。かさは 決まっているので、のびた ところほど 細い
  s.len = 0;
  s.seg.length = 0;
  for (let i = 0; i < n - 1; i++) {
    const d = Math.hypot(N[i + 1].x - N[i].x, N[i + 1].y - N[i].y);
    s.seg.push(d);
    if (i !== s.broken) s.len += d;
  }
  // 中身が ひもの中を 流れる
  strandFlow(s, b, p, dd);

  // 太さは いっきには 変わらない。よくのびるスライムほど 細くなるのが おそい。
  // だから ゆっくり ひっぱれば どれも のびるし、いっきに ひっぱると
  // のびないスライムだけ ついてこられずに ちぎれる
  const thin = Math.min(1, (4.5 + (1 - p.stretch) * 26) * dd);
  for (let i = 0; i < n - 1; i++) {
    const target = s.V[i] / (2 * Math.max(2, s.seg[i]));
    s.rad[i] += (target - s.rad[i]) * thin;
  }

  if (pinEnd) {
    // ひっぱると たまから 中身が 流れ出す。よくのびるスライムほど よく流れる
    const tension = Math.max(0, (s.len - s.L0) / Math.max(1, s.L0));
    // ひっぱると たまから 中身が 出てくる。入り口は ねもと なので
    // ねもとの ほうから じわじわ ふとって、先へ 流れていく
    const add = Math.min(1.2, tension * 4) * (0.24 + p.stretch * 1.8)
                * b.r * b.r * 0.62 * dd;
    // もとの すぼまり方に そって 配る（w は ぜんぶ たすと 1）。
    // ねもとに どっと 入れると そこだけ こぶになって あばれる
    for (let i = 0; i < s.V.length; i++) s.V[i] += add * s.w[i];
    s.vol += add;
    // のびた 長さに だんだん なじむ（よくのびるスライムほど 早く なじむ）
    s.L0 += (s.len - s.L0) * Math.min(1, (0.35 + p.stretch * 2.6) * dd);

    // 細くなりすぎたら そこで ちぎれる
    // くびれが ここまで 細くなったら 切れる。
    // 細くなる きっかけは 上の strandFlow が 作っている
    const rBreak = b.r * Math.max(0.010, 0.052 - p.stretch * 0.040);
    let mi = -1, mr = 1e9;
    for (let i = 1; i < n - 3; i++) if (s.rad[i] < mr) { mr = s.rad[i]; mi = i; }
    if (mi >= 0 && mr < rBreak) {
      s.broken = mi;
      for (let k = 0; k < 7; k++) {
        s.drops.push({ x: N[mi + 1].x, y: N[mi + 1].y,
                       vx: (k - 3) * 40 + (k % 2 ? 22 : -22),
                       vy: -70 - k * 18,
                       r: b.r * (0.07 + (k % 3) * 0.035), life: 1.4 });
      }
    }
  } else {
    // はなしたら（か ちぎれたら）ちぢんで たまに もどる。
    // おもりが かかっているので 完全には ちぢみきらない。
    // すこし たったら すーっと 消して かたづける
    s.rel += dt;
    s.L0 += (b.r * 0.3 - s.L0) * Math.min(1, 9 * dd);
    const k = Math.max(0, 1 - 2.8 * dd);       // たまへ すいこまれて 帰る
    for (let i = 0; i < s.V.length; i++) s.V[i] *= k;
    s.vol *= k;
    if (s.rel > 0.75) s.fade -= dt * 2.2;
  }
  if (s.broken >= 0) s.fade -= dt * 0.9;
  if (s.fade <= 0 || (!held && s.len < b.r * 1.4)) s.dead = true;

  for (let i = s.drops.length - 1; i >= 0; i--) {
    const d = s.drops[i];
    d.vy += 1400 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
    if (s.floor && d.y > s.floor) { d.y = s.floor; d.vy = 0; d.vx *= 0.6; }
    if (d.life <= 0) s.drops.splice(i, 1);
  }
}

// ひもの中を 中身が 流れる。ここが「まっすぐ のびない」理由。
//
// ① 表面張力。細い ところほど 中の 圧が 高い（1÷半径）。
//    だから 中身は 細い ところから 太い ところへ 逃げていって、
//    細い ところは もっと 細く、太い ところは もっと 太くなる。
//    ほうっておくと ひもは ひとりでに 数珠つなぎに くびれて、
//    いちばん 細い ところで 切れる。
//    （プラトー・レイリー不安定。水道の水が つぶつぶに なるのと同じ）
// ② おもり。中身は 下へ 下へ 流れていくので、たれた ところが ふとる。
//
// ねばりが 強い（よくのびる）スライムほど 流れが おそいので、
// くびれが できるまでに 時間がかかる ＝ 長く のびる。
function strandFlow(s, b, p, dd) {
  const n = s.V.length;
  const unit = b.r * b.r;
  // ねばりが 強いほど 流れが おそい。よくのびるスライムは ここが 25倍 おそく、
  // だから くびれが できるまでに 時間がかかって 長く のびる
  const visc = Math.pow(1 - p.stretch, 2);      // 0＝とろとろ 1＝さらさら
  const mob = 0.0006 + visc * 0.010;            // 表面張力での 流れやすさ
  const drain = 0.02 + visc * 0.08;             // 下へ たれる 流れやすさ
  for (let i = 0; i < n - 1; i++) {
    const ra = Math.max(0.05, s.rad[i] / b.r);
    const rb = Math.max(0.05, s.rad[i + 1] / b.r);
    // 細い→太い（圧の 高いほうから 低いほうへ）
    let q = mob * (1 / ra - 1 / rb);
    // 下へ
    q += drain * (s.nodes[i + 2].y - s.nodes[i].y) / (2 * b.r);
    q = Math.max(-2.5, Math.min(2.5, q)) * unit * dd;
    // 1回で 出しすぎない（数字が あばれないように）
    const m = q > 0 ? Math.min(q, s.V[i] * 0.04)
                    : Math.max(q, -s.V[i + 1] * 0.04);
    s.V[i] -= m; s.V[i + 1] += m;
  }
  s.vol = 0;
  for (let i = 0; i < n; i++) {
    if (s.V[i] < 0) s.V[i] = 0;
    s.vol += s.V[i];
  }
}

function drawStrand(c, s, p, b) {
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, s.fade));
  const n = s.nodes.length;
  if (s.broken < 0) {
    strandPiece(c, s, p, b, 0, n - 1);
  } else {
    strandPiece(c, s, p, b, 0, s.broken);
    strandPiece(c, s, p, b, s.broken + 1, n - 1);
  }
  for (const d of s.drops) {
    c.fillStyle = rgbCss(p.rgb);
    c.beginPath();
    c.ellipse(d.x, d.y, d.r, d.r * 1.25, 0, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.3, 0, 7);
    c.fill();
  }
  c.restore();
}

function strandPiece(c, s, p, b, a, z) {
  if (z - a < 1) return;
  const N = s.nodes;
  const L = [], R = [];
  let ltx = 1, lty = 0;
  for (let i = a; i <= z; i++) {
    const q = N[i];
    const pv = N[Math.max(a, i - 1)], nx = N[Math.min(z, i + 1)];
    let tx = nx.x - pv.x, ty = nx.y - pv.y;
    const tl = Math.hypot(tx, ty);
    // ふしが かさなると 向きが 決まらず、とがった ゴミが 出る。
    // そういう ときは 1つ前の 向きを つかう
    if (tl < 0.6) { tx = ltx; ty = lty; }
    else { tx /= tl; ty /= tl; ltx = tx; lty = ty; }
    let r = i === a ? s.rad[a] : i >= z ? s.rad[z - 1]
                                        : (s.rad[i - 1] + s.rad[i]) / 2;
    if (i === 0) r = Math.max(r, b.r * 0.5);        // ねもとは たまに つながる
    // 先っぽは とがらせる。切り口も 少し すぼめる
    const tip = z - i;
    if (tip < 3) r *= 0.34 + 0.22 * tip;
    r = Math.max(b.r * 0.012, Math.min(b.r * 0.55, r));
    L.push([q.x - ty * r, q.y + tx * r]);
    R.push([q.x + ty * r, q.y - tx * r]);
  }
  R.reverse();
  c.beginPath();
  smoothSide(c, L, false);
  smoothSide(c, R, true);
  c.closePath();
  const g = c.createLinearGradient(N[a].x, N[a].y - b.r, N[z].x, N[z].y + b.r);
  g.addColorStop(0, rgbCss(shade(p.rgb, 0.1)));
  g.addColorStop(0.5, rgbCss(p.rgb));
  g.addColorStop(1, rgbCss(shade(p.rgb, -0.18)));
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = rgbCss(shade(p.rgb, -0.3), 0.55);
  c.lineWidth = Math.max(1, b.r * 0.018);
  c.stroke();

  // ひもの つや
  c.save();
  c.clip();
  c.globalAlpha = 0.3 + p.gloss * 0.35;
  c.strokeStyle = rgbCss(shade(p.rgb, 0.62));
  c.lineWidth = Math.max(1, b.r * 0.05);
  c.beginPath();
  for (let i = a; i <= z; i++) {
    const q = N[i];
    const pv = N[Math.max(a, i - 1)], nx = N[Math.min(z, i + 1)];
    let tx = nx.x - pv.x, ty = nx.y - pv.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const r = (i === a ? s.rad[a] : i >= z ? s.rad[z - 1]
                                           : (s.rad[i - 1] + s.rad[i]) / 2) * 0.42;
    const x = q.x - ty * r, y = q.y + tx * r;
    if (i === a) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}

function smoothSide(c, pts, cont) {
  if (cont) c.lineTo(pts[0][0], pts[0][1]);
  else c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    c.quadraticCurveTo(pts[i][0], pts[i][1],
                       (pts[i][0] + pts[i + 1][0]) / 2,
                       (pts[i][1] + pts[i + 1][1]) / 2);
  }
  const e = pts[pts.length - 1];
  c.lineTo(e[0], e[1]);
}
