// ボウルの中の 絵の具。
//
// 中身を 120 この「つぶ」であらわす。つぶ 1こ 1こが
// 「自分と同じ中身で ボウルを いっぱいにしたら 何色になるか」を持っている。
// ぜんぶの平均が いまの配合そのものになるようにしてあるので、
// かきまぜて 全部おなじになったとき、できあがりの色と ぴったり合う。
//
// 大事なのは「かってには まざらない」こと。入れた絵の具は そこに
// とどまっていて、ゆびで かきまぜたところ だけ まざる。
// だから「あお の となりに きいろ を たらして、まぜたら みどりになった」
// が 目で見える。

'use strict';

const BATH_N = 120;
const TINT_KEYS = ['red', 'yellow', 'blue', 'white', 'black', 'foam'];

// つぶを ぼかして描くための 小さいカンバス。
// 小さく描いて 大きく引きのばすと、それだけで きれいに にじむ。
const bathCv = document.createElement('canvas');
bathCv.width = 72; bathCv.height = 72;
const bathCx = bathCv.getContext('2d');

function makeBath() {
  const pts = [];
  for (let i = 0; i < BATH_N; i++) {
    // ひまわりの種のならびかた。まんべんなく ちらばる
    const a = i * 2.39996, r = Math.sqrt((i + 0.5) / BATH_N);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0,
               t: [0, 0, 0, 0, 0, 0], agit: 0, rgb: [236, 240, 245] });
  }
  return { pts, mixed: 0, effort: 0, spoon: null, spoonT: 0, drops: [] };
}

function tintRgb(t) {
  return mixColor({ red: t[0], yellow: t[1], blue: t[2],
                    white: t[3], black: t[4], foam: t[5] });
}

// かさから 中身の広がりを出す。少ないと 底に たまっている
function bathScale(volume) {
  return 0.20 + 0.80 * Math.min(1, Math.sqrt(Math.max(0, volume) / 60));
}

// (ux,uy) は 中身を 半径1の円と見たときの 場所。
// 入れた分だけ そこの つぶに 足す。合計は かならず amount * つぶの数 になる
// ので、ぜんぶの平均は いつも 実際の配合と一致する。
function bathPour(bath, key, amount, ux, uy) {
  const k = TINT_KEYS.indexOf(key);
  if (k < 0 || amount <= 0) return;   // のり・水・ホウ砂水などは 色がつかない
  const R = 0.30;
  const w = new Array(bath.pts.length);
  let sum = 0;
  for (let i = 0; i < bath.pts.length; i++) {
    const p = bath.pts[i];
    const d = Math.hypot(p.x - ux, p.y - uy);
    const v = d < R ? (1 - d / R) * (1 - d / R) : 0;
    w[i] = v; sum += v;
  }
  if (sum < 1e-6) {                    // はじっこ なら いちばん近い つぶへ
    let bi = 0, bd = 1e9;
    for (let i = 0; i < bath.pts.length; i++) {
      const d = Math.hypot(bath.pts[i].x - ux, bath.pts[i].y - uy);
      if (d < bd) { bd = d; bi = i; }
    }
    w[bi] = 1; sum = 1;
  }
  const total = amount * bath.pts.length;
  for (let i = 0; i < bath.pts.length; i++) {
    if (w[i] <= 0) continue;
    bath.pts[i].t[k] += total * w[i] / sum;
    bath.pts[i].agit = Math.max(bath.pts[i].agit, 0.3);  // たらすと すこし にじむ
  }
}

// ゆびで かきまぜる。dx,dy は このあいだに 動いた分
function bathStir(bath, ux, uy, dx, dy) {
  bath.spoon = { x: ux, y: uy }; bath.spoonT = 0.25;
  const sp = Math.min(0.3, Math.hypot(dx, dy));
  bath.effort = Math.min(200, bath.effort + sp * 34);
  const R = 0.38;
  for (const p of bath.pts) {
    const ddx = p.x - ux, ddy = p.y - uy;
    const d = Math.hypot(ddx, ddy);
    if (d >= R) continue;
    const w = 1 - d / R;
    p.vx += dx * w * 9; p.vy += dy * w * 9;      // ゆびに ついてくる
    if (d > 1e-4) {                               // へらの ぶんだけ よける
      p.vx += ddx / d * w * sp * 5;
      p.vy += ddy / d * w * sp * 5;
    }
    p.agit = Math.min(1, p.agit + w * sp * 7);
  }
}

function bathUpdate(bath, dt) {
  const pts = bath.pts, n = pts.length;
  bath.spoonT -= dt;
  if (bath.spoonT <= 0) bath.spoon = null;

  for (const p of pts) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    const k = Math.min(1, 3.6 * dt);
    p.vx -= p.vx * k; p.vy -= p.vy * k;
    p.agit = Math.max(0, p.agit - dt * 1.1);
    const d = Math.hypot(p.x, p.y);
    if (d > 1) { p.x /= d; p.y /= d; p.vx *= 0.2; p.vy *= 0.2; }
  }

  // つぶ同士。おしのけ合って ちらばり、
  // かきまぜたところ だけ 色を わけあう。
  //
  // 色が うつる はんい（MIXR）は おしのける はんい（SEP）より 広くとる。
  // つぶは だいたい SEP くらいの 間かくで ならぶので、同じにすると
  // となり同士が ちょうど はんいの ふちに来てしまい、いつまでも まざらない。
  const SEP = 0.17, MIXR = 0.30;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    for (let j = i + 1; j < n; j++) {
      const b = pts[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > MIXR * MIXR || d2 < 1e-9) continue;
      const d = Math.sqrt(d2);
      if (d < SEP) {
        const f = (SEP - d) / SEP * 2.2 * dt / d;
        a.vx -= dx * f; a.vy -= dy * f;
        b.vx += dx * f; b.vy += dy * f;
      }
      // 色の わけあい。おたがい 同じだけ やりとりするので
      // 全体の量は 変わらない（＝ できあがりの色は ずれない）
      const mk = Math.min(0.5, (a.agit + b.agit) * 0.5 * (1 - d / MIXR) * dt * 11);
      if (mk > 0.0004) {
        for (let k = 0; k < 6; k++) {
          const av = a.t[k], bv = b.t[k];
          a.t[k] = av + (bv - av) * mk;
          b.t[k] = bv + (av - bv) * mk;
        }
      }
    }
  }

  for (const p of pts) p.rgb = tintRgb(p.t);

  // どれくらい 均一になったか
  const mean = [0, 0, 0, 0, 0, 0];
  for (const p of pts) for (let k = 0; k < 6; k++) mean[k] += p.t[k] / n;
  let mag = 0, dev = 0;
  for (let k = 0; k < 6; k++) mag += mean[k];
  for (const p of pts) for (let k = 0; k < 6; k++) dev += Math.abs(p.t[k] - mean[k]) / n;
  const even = mag < 0.5 ? 1 : Math.max(0, Math.min(1, 1 - dev / (mag * 1.15)));
  // 色がそろっていても、まぜた手ごたえが なければ「まぜた」ことにしない
  bath.mixed = Math.min(even, Math.min(1, bath.effort / 90));

  // したたる しずく
  for (let i = bath.drops.length - 1; i >= 0; i--) {
    const d = bath.drops[i];
    d.vy += 2600 * dt; d.y += d.vy * dt; d.life -= dt;
    if (d.life <= 0) bath.drops.splice(i, 1);
  }
}

function bathDrop(bath, x, y, col, life) {
  if (bath.drops.length > 40) return;
  bath.drops.push({ x, y, vy: 60, col, r: 0, life: life });
}

// 中身を 小さいカンバスに 描いて、それを 引きのばして 使う
function bathImage(bath, baseRgb) {
  const S = bathCv.width;
  bathCx.clearRect(0, 0, S, S);
  bathCx.fillStyle = rgbCss(baseRgb);
  bathCx.beginPath();
  bathCx.arc(S / 2, S / 2, S / 2, 0, 7);
  bathCx.fill();
  const r = S * 0.13;
  for (const p of bath.pts) {
    bathCx.fillStyle = rgbCss(p.rgb, 0.55);
    bathCx.beginPath();
    bathCx.arc(S / 2 + p.x * S / 2, S / 2 + p.y * S / 2, r, 0, 7);
    bathCx.fill();
  }
  return bathCv;
}

// できあがりに のこす しま模様の色。まぜ足りないと スライムに 出る
function bathMarble(bath) {
  const out = [];
  for (let i = 0; i < 5; i++) {
    const p = bath.pts[Math.floor(i * bath.pts.length / 5)];
    out.push([p.rgb[0], p.rgb[1], p.rgb[2], p.x, p.y]);
  }
  return out;
}
