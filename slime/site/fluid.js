// 本物の 粒子流体。PBF（Position Based Fluids, Macklin & Müller 2013）。
//
// スライムを 380この つぶで あらわす。つぶには「ここは こう動く」という
// 決めごとを 書いていない。書いてあるのは 1つだけ:
//
//   「まわりの こみぐあいを いつも 同じに たもつ」（＝ 縮まない液体）
//
// これを くりかえし 解くだけで、たれる・のびる・くびれる・ちぎれる・
// つくえに 広がる が ぜんぶ ひとりでに 出てくる。
// 「ちぎれた」も 判定を 書いていない。つぶの つながりが 切れただけ。
//
// ねばり（XSPH）を 材料から 決めているので、よくのびるスライムは
// つぶが おたがいを 強く 引きずって 長い糸になり、
// さらさらなら すぐ つぶつぶに 分かれて 落ちる。

'use strict';

const FL_N = 760;          // つぶの数
const FL_MAXNB = 48;       // 1つぶが 見る ご近所の 数の 上限
const FL_MAXSPR = 26;      // 1つぶから 出る バネの 数の 上限
const FL_ITER = 3;         // こみぐあいを 直す 回数
const FL_D0 = 0.42;        // つぶ同士の ふだんの 間かく（h＝1 として）

// 2次元の カーネル（h＝1）
const FL_POLY6 = 4 / Math.PI;
const FL_SPIKY = 30 / Math.PI;
function w6(r2) { const t = 1 - r2; return t > 0 ? FL_POLY6 * t * t * t : 0; }
function wsp(r) { const t = 1 - r; return t > 0 ? FL_SPIKY * t * t : 0; }

// 人工圧力（つぶが かたまりすぎるのを 防ぎ、表面張力っぽさを 出す）
const FL_SCORR_Q = w6(0.2 * 0.2);

function makeFluid(cx, cy, rpx) {
  const n = FL_N;
  // 円に つめる ときの 半径（つぶ 1こが d0×d0 を 受けもつ）
  const rs = Math.sqrt(n * FL_D0 * FL_D0 / Math.PI);
  const f = {
    n, scale: rpx / rs, rs,
    x: new Float64Array(n), y: new Float64Array(n),
    vx: new Float64Array(n), vy: new Float64Array(n),
    px: new Float64Array(n), py: new Float64Array(n),
    lam: new Float64Array(n), rho: new Float64Array(n),
    dx: new Float64Array(n), dy: new Float64Array(n),
    held: new Uint8Array(n), hx: new Float64Array(n), hy: new Float64Array(n),
    ohx: new Float64Array(n), ohy: new Float64Array(n),   // ゆびからの ずれ
    // つぶ同士を つなぐ「バネ」。スライムが 形を たもつのは これのおかげ
    sj: new Int32Array(n * FL_MAXSPR), sl: new Float32Array(n * FL_MAXSPR),
    sn: new Int32Array(n), sprT: 0,
    root: new Int32Array(n),
    nb: new Int32Array(n * FL_MAXNB), nbn: new Int32Array(n),
    cell: null, cellStart: null, order: null, gw: 0, gh: 0,
    gx0: 0, gy0: 0,
    rho0: 1, ox: cx, oy: cy,          // ox,oy ＝ しみゅの原点（画面の どこか）
    floor: 0, left: 0, right: 0, top: 0,
  };
  // 六角づめに 近い ならべ方で 円に つめる
  let k = 0;
  const step = FL_D0;
  const rows = Math.ceil(rs * 2 / (step * 0.866)) + 2;
  outer:
  for (let r = -rows; r <= rows; r++) {
    const yy = r * step * 0.866;
    const off = (r & 1) ? step * 0.5 : 0;
    for (let cq = -rows; cq <= rows; cq++) {
      const xx = cq * step + off;
      if (xx * xx + yy * yy > rs * rs) continue;
      if (k >= n) break outer;
      f.x[k] = xx; f.y[k] = yy;
      k++;
    }
  }
  // つめ足りなければ 中心近くに ばらまく（見た目に 出ない ていど）
  for (; k < n; k++) {
    const a = k * 2.39996, rr = rs * Math.sqrt((k % 40) / 40) * 0.5;
    f.x[k] = Math.cos(a) * rr; f.y[k] = Math.sin(a) * rr;
  }
  buildGrid(f, f.x, f.y);
  computeDensity(f, f.x, f.y);
  // ふだんの こみぐあい ＝ 中の ほうの つぶの 値
  let mx = 0;
  for (let i = 0; i < n; i++) if (f.rho[i] > mx) mx = f.rho[i];
  f.rho0 = mx;
  addSprings(f, f.x, f.y);
  return f;
}

// --- バネ（ここが「スライムらしさ」の ほんたい）----------------------------
//
// 水は ほうっておくと ぺたんと 広がる。スライムが 広がらないのは、
// 液体なのに ゴムのような 性質も もっているから（粘弾性）。
// そこで つぶ同士を バネで つなぐ。ただし ふつうの バネではなく:
//
//   ・のばした まま しばらく すると、その長さが「ふだんの長さ」に なる
//     （＝ 形を おぼえなおす。だから ゆっくり ひっぱれば どこまでも のびる）
//   ・のびきった バネは 消える（＝ ちぎれる）
//   ・近づいた つぶには 新しく バネが できる（＝ くっついて もどる）
//
// これが Clavet ら の 粘弾性流体モデル。スライムや どろ の ために 作られた もの。

function addSprings(f, X, Y) {
  const n = f.n;
  for (let i = 0; i < n; i++) {
    if (f.sn[i] >= FL_MAXSPR) continue;
    const nbase = i * FL_MAXNB, cnt = f.nbn[i], sbase = i * FL_MAXSPR;
    for (let t = 0; t < cnt; t++) {
      const j = f.nb[nbase + t];
      if (j <= i) continue;
      const ddx = X[i] - X[j], ddy = Y[i] - Y[j];
      const r2 = ddx * ddx + ddy * ddy;
      if (r2 > 0.36) continue;              // 十分 近い ものだけ つなぐ
      let has = false;
      for (let q = 0; q < f.sn[i]; q++) {
        if (f.sj[sbase + q] === j) { has = true; break; }
      }
      if (has) continue;
      if (f.sn[i] >= FL_MAXSPR) break;
      f.sj[sbase + f.sn[i]] = j;
      f.sl[sbase + f.sn[i]] = Math.sqrt(r2);
      f.sn[i]++;
    }
  }
}

function applySprings(f, X, Y, dt, mat) {
  const n = f.n;
  const k = mat.kspr, alpha = mat.plast, gam = mat.yieldR;
  const dt2 = dt * dt;
  for (let i = 0; i < n; i++) {
    const base = i * FL_MAXSPR, cnt = f.sn[i];
    let w = 0;
    for (let t = 0; t < cnt; t++) {
      const j = f.sj[base + t];
      let L = f.sl[base + t];
      const ddx = X[j] - X[i], ddy = Y[j] - Y[i];
      const r = Math.sqrt(ddx * ddx + ddy * ddy);
      if (r > 1 || r < 1e-9) continue;      // はなれすぎた → 消える（ちぎれる）
      // ふだんの長さを いまの長さへ にじり寄せる（形を おぼえなおす）
      const d = gam * L;
      if (r > L + d) L += dt * alpha * (r - L - d);
      else if (r < L - d) L -= dt * alpha * (L - d - r);
      if (L > 1) continue;                  // のびきった → 消える
      const D = dt2 * k * (1 - L) * (L - r) / r;
      const hx = ddx * D * 0.5, hy = ddy * D * 0.5;
      X[i] -= hx; Y[i] -= hy;
      X[j] += hx; Y[j] += hy;
      f.sj[base + w] = j; f.sl[base + w] = L; w++;
    }
    f.sn[i] = w;
  }
}

// --- ご近所さがし（マス目に 分けて さがす）--------------------------------

function buildGrid(f, X, Y) {
  const n = f.n;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    if (X[i] < x0) x0 = X[i]; if (X[i] > x1) x1 = X[i];
    if (Y[i] < y0) y0 = Y[i]; if (Y[i] > y1) y1 = Y[i];
  }
  const gw = Math.max(1, Math.min(512, Math.ceil(x1 - x0) + 3));
  const gh = Math.max(1, Math.min(512, Math.ceil(y1 - y0) + 3));
  const cells = gw * gh;
  if (!f.cellStart || f.cellStart.length < cells + 1) {
    f.cellStart = new Int32Array(cells + 1);
    f.order = new Int32Array(n);
    f.cell = new Int32Array(n);
  }
  f.gw = gw; f.gh = gh; f.gx0 = x0 - 1; f.gy0 = y0 - 1;
  const cs = f.cellStart;
  cs.fill(0, 0, cells + 1);
  for (let i = 0; i < n; i++) {
    let cx = (X[i] - f.gx0) | 0, cy = (Y[i] - f.gy0) | 0;
    if (cx < 0) cx = 0; if (cx >= gw) cx = gw - 1;
    if (cy < 0) cy = 0; if (cy >= gh) cy = gh - 1;
    const c = cy * gw + cx;
    f.cell[i] = c;
    cs[c + 1]++;
  }
  for (let c = 0; c < cells; c++) cs[c + 1] += cs[c];
  const fill = new Int32Array(cells);
  for (let i = 0; i < n; i++) {
    const c = f.cell[i];
    f.order[cs[c] + fill[c]] = i;
    fill[c]++;
  }
}

function findNeighbors(f, X, Y) {
  const n = f.n, gw = f.gw, gh = f.gh, cs = f.cellStart, ord = f.order;
  for (let i = 0; i < n; i++) {
    let cnt = 0;
    const base = i * FL_MAXNB;
    let cx = (X[i] - f.gx0) | 0, cy = (Y[i] - f.gy0) | 0;
    if (cx < 0) cx = 0; if (cx >= gw) cx = gw - 1;
    if (cy < 0) cy = 0; if (cy >= gh) cy = gh - 1;
    for (let oy = -1; oy <= 1; oy++) {
      const yy = cy + oy;
      if (yy < 0 || yy >= gh) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const xx = cx + ox;
        if (xx < 0 || xx >= gw) continue;
        const c = yy * gw + xx;
        for (let t = cs[c]; t < cs[c + 1]; t++) {
          const j = ord[t];
          if (j === i) continue;
          const ddx = X[i] - X[j], ddy = Y[i] - Y[j];
          if (ddx * ddx + ddy * ddy >= 1) continue;
          if (cnt >= FL_MAXNB) { t = cs[c + 1]; oy = 2; ox = 2; break; }
          f.nb[base + cnt] = j; cnt++;
        }
      }
    }
    f.nbn[i] = cnt;
  }
}

function computeDensity(f, X, Y) {
  findNeighbors(f, X, Y);
  const n = f.n;
  for (let i = 0; i < n; i++) {
    let r = w6(0);
    const base = i * FL_MAXNB, cnt = f.nbn[i];
    for (let t = 0; t < cnt; t++) {
      const j = f.nb[base + t];
      const ddx = X[i] - X[j], ddy = Y[i] - Y[j];
      r += w6(ddx * ddx + ddy * ddy);
    }
    f.rho[i] = r;
  }
}

// --- 1 ステップ -----------------------------------------------------------
//
// mat: { visc, coh, scorr } ＝ 材料から 決まる ねばり・くっつき・はじけ
function fluidStep(f, dt, mat, grav) {
  const n = f.n, X = f.px, Y = f.py;
  const g = grav === undefined ? 60 : grav;

  for (let i = 0; i < n; i++) {
    f.vy[i] += g * dt;
    X[i] = f.x[i] + f.vx[i] * dt;
    Y[i] = f.y[i] + f.vy[i] * dt;
  }
  // つまんでいる つぶは ゆびの ところへ 引っぱる
  for (let i = 0; i < n; i++) {
    if (!f.held[i]) continue;
    X[i] += (f.hx[i] - X[i]) * 0.30;
    Y[i] += (f.hy[i] - Y[i]) * 0.30;
  }

  buildGrid(f, X, Y);
  findNeighbors(f, X, Y);
  // 新しく くっついた ところに バネを 足す（毎回でなくてよい）
  f.sprT++;
  if ((f.sprT & 3) === 0) addSprings(f, X, Y);
  applySprings(f, X, Y, dt, mat);

  // eps は 0わり よけ。大きすぎると 直しが 弱くなって
  // 液体が すかすかに つぶれ、水たまりのように 広がってしまう
  const rho0 = f.rho0, eps = 0.05;
  for (let it = 0; it < FL_ITER; it++) {
    // こみぐあい と λ
    for (let i = 0; i < n; i++) {
      let rho = w6(0), sg = 0, gxs = 0, gys = 0;
      const base = i * FL_MAXNB, cnt = f.nbn[i];
      for (let t = 0; t < cnt; t++) {
        const j = f.nb[base + t];
        const ddx = X[i] - X[j], ddy = Y[i] - Y[j];
        const r2 = ddx * ddx + ddy * ddy;
        if (r2 >= 1) continue;
        rho += w6(r2);
        const r = Math.sqrt(r2);
        if (r < 1e-6) continue;
        const s = wsp(r) / r / rho0;
        const gx = -s * ddx, gy = -s * ddy;
        gxs += gx; gys += gy;
        sg += gx * gx + gy * gy;
      }
      f.rho[i] = rho;
      sg += gxs * gxs + gys * gys;
      const C = rho / rho0 - 1;
      f.lam[i] = -C / (sg + eps);
    }
    // ずらす量
    for (let i = 0; i < n; i++) {
      let ax = 0, ay = 0;
      const base = i * FL_MAXNB, cnt = f.nbn[i];
      const li = f.lam[i];
      for (let t = 0; t < cnt; t++) {
        const j = f.nb[base + t];
        const ddx = X[i] - X[j], ddy = Y[i] - Y[j];
        const r2 = ddx * ddx + ddy * ddy;
        if (r2 >= 1) continue;
        const r = Math.sqrt(r2);
        if (r < 1e-6) continue;
        // 人工圧力。かたまりすぎを ほどいて 表面を つくる
        const q = w6(r2) / FL_SCORR_Q;
        const sc = -mat.scorr * q * q * q * q;
        const s = wsp(r) / r;
        ax += (li + f.lam[j] + sc) * -s * ddx;
        ay += (li + f.lam[j] + sc) * -s * ddy;
      }
      f.dx[i] = ax / rho0; f.dy[i] = ay / rho0;
    }
    for (let i = 0; i < n; i++) {
      X[i] += f.dx[i]; Y[i] += f.dy[i];
      if (f.held[i]) {
        X[i] += (f.hx[i] - X[i]) * 0.18;
        Y[i] += (f.hy[i] - Y[i]) * 0.18;
      }
      // かべ と つくえ。つくえでは 横すべりを 少し 止める（まさつ）
      if (Y[i] > f.floor) {
        Y[i] = f.floor;
        X[i] += (f.x[i] - X[i]) * 0.22;
      }
      if (Y[i] < f.top) Y[i] = f.top;
      if (X[i] < f.left) X[i] = f.left;
      if (X[i] > f.right) X[i] = f.right;
    }
  }

  const inv = 1 / dt;
  for (let i = 0; i < n; i++) {
    f.vx[i] = (X[i] - f.x[i]) * inv;
    f.vy[i] = (Y[i] - f.y[i]) * inv;
    f.x[i] = X[i]; f.y[i] = Y[i];
  }

  // ねばり（XSPH）。まわりの つぶと 速さを そろえる。
  // ここが 大きいほど おたがいを 引きずるので 長い糸になる
  const visc = mat.visc, coh = mat.coh;
  for (let i = 0; i < n; i++) {
    let ax = 0, ay = 0, cx = 0, cy = 0, ws = 0;
    const base = i * FL_MAXNB, cnt = f.nbn[i];
    for (let t = 0; t < cnt; t++) {
      const j = f.nb[base + t];
      const ddx = f.x[i] - f.x[j], ddy = f.y[i] - f.y[j];
      const r2 = ddx * ddx + ddy * ddy;
      if (r2 >= 1) continue;
      const w = w6(r2);
      ws += w;
      ax += (f.vx[j] - f.vx[i]) * w;
      ay += (f.vy[j] - f.vy[i]) * w;
      cx -= ddx * w; cy -= ddy * w;      // くっつく力（表面張力のかわり）
    }
    // まわりの 速さの「重みつき平均」に どれだけ 寄せるか。
    // 1 に 近いほど まわりと そろって うごく ＝ ねばりが 強い
    const k = ws > 1e-6 ? visc / ws : 0;
    f.dx[i] = ax * k + cx * coh * dt;
    f.dy[i] = ay * k + cy * coh * dt;
  }
  for (let i = 0; i < n; i++) { f.vx[i] += f.dx[i]; f.vy[i] += f.dy[i]; }
}

// --- つまむ ---------------------------------------------------------------

function fluidGrab(f, sx, sy, rad) {
  const ux = (sx - f.ox) / f.scale, uy = (sy - f.oy) / f.scale;
  const r = rad / f.scale;
  let got = 0;
  for (let i = 0; i < f.n; i++) {
    const ddx = f.x[i] - ux, ddy = f.y[i] - uy;
    if (ddx * ddx + ddy * ddy > r * r) continue;
    f.held[i] = 1;
    f.ohx[i] = f.x[i] - ux; f.ohy[i] = f.y[i] - uy;  // ゆびからの ずれを おぼえる
    f.hx[i] = f.x[i]; f.hy[i] = f.y[i];
    got++;
  }
  return got;
}

// ゆびが 動いたら、つまんだ つぶの 行き先を つけかえる。
// つまんだ ときの ならびを たもつので、ひとかたまりで ついてくる
function fluidHold(f, sx, sy) {
  const ux = (sx - f.ox) / f.scale, uy = (sy - f.oy) / f.scale;
  for (let i = 0; i < f.n; i++) {
    if (!f.held[i]) continue;
    f.hx[i] = ux + f.ohx[i];
    f.hy[i] = uy + f.ohy[i];
  }
}

function fluidRelease(f) { f.held.fill(0); }

// --- つながり（ちぎれたかを 見る）------------------------------------------
//
// 近い つぶ同士を つないでいって、ひとつながりの かたまりを 見つける。
// つまんだ つぶが いちばん 大きい かたまりと 別に なったら「ちぎれた」。

function findRoot(root, i) {
  while (root[i] !== i) { root[i] = root[root[i]]; i = root[i]; }
  return i;
}

function fluidComponents(f, link) {
  const n = f.n, root = f.root;
  for (let i = 0; i < n; i++) root[i] = i;
  const lim = link * link;
  for (let i = 0; i < n; i++) {
    const base = i * FL_MAXNB, cnt = f.nbn[i];
    for (let t = 0; t < cnt; t++) {
      const j = f.nb[base + t];
      if (j < i) continue;
      const ddx = f.x[i] - f.x[j], ddy = f.y[i] - f.y[j];
      if (ddx * ddx + ddy * ddy > lim) continue;
      const ra = findRoot(root, i), rb = findRoot(root, j);
      if (ra !== rb) root[ra] = rb;
    }
  }
  for (let i = 0; i < n; i++) root[i] = findRoot(root, i);
  return root;
}

// --- 描く（メタボール）-----------------------------------------------------
//
// つぶを そのまま 丸で 描くと つぶつぶに 見えてしまう。
// 小さい カンバスに ぼかして 描いて、こさが ある ところだけを
// 「中身」と する。これで なめらかな 液体の ふちが 出る。

const flCv = document.createElement('canvas');
const flCx = flCv.getContext('2d', { willReadFrequently: true });

function drawFluid(c, f, p, vw, vh) {
  const S = 0.34;
  const w = Math.max(8, Math.round(vw * S)), h = Math.max(8, Math.round(vh * S));
  if (flCv.width !== w || flCv.height !== h) { flCv.width = w; flCv.height = h; }
  flCx.clearRect(0, 0, w, h);
  flCx.globalCompositeOperation = 'lighter';
  const rr = f.scale * 0.95 * S;
  for (let i = 0; i < f.n; i++) {
    const x = (f.ox + f.x[i] * f.scale) * S, y = (f.oy + f.y[i] * f.scale) * S;
    if (x < -rr || y < -rr || x > w + rr || y > h + rr) continue;
    const g = flCx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    flCx.fillStyle = g;
    flCx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  flCx.globalCompositeOperation = 'source-over';

  const img = flCx.getImageData(0, 0, w, h);
  const d = img.data;
  const base = p.rgb, lo = shade(base, -0.32), hi = shade(base, 0.30);
  // ふちを すぱっと 切ると、あとで 引きのばした ときに かくかくに 見える。
  // 外がわの ひとにぎりだけ すきとおらせて なめらかな ふちにする
  const T = 116, T2 = 74, T3 = 26;
  for (let k = 3; k < d.length; k += 4) {
    const a = d[k];
    if (a >= T) {
      d[k - 3] = base[0]; d[k - 2] = base[1]; d[k - 1] = base[2]; d[k] = 255;
    } else if (a >= T2) {                    // ふち（こい色）
      const t = (a - T2) / (T - T2);
      d[k - 3] = lo[0] + (base[0] - lo[0]) * t;
      d[k - 2] = lo[1] + (base[1] - lo[1]) * t;
      d[k - 1] = lo[2] + (base[2] - lo[2]) * t;
      d[k] = 255;
    } else if (a >= T3) {                    // いちばん外＝だんだん すきとおる
      d[k - 3] = lo[0]; d[k - 2] = lo[1]; d[k - 1] = lo[2];
      d[k] = Math.round(255 * (a - T3) / (T2 - T3));
    } else { d[k] = 0; }
  }
  flCx.putImageData(img, 0, 0);
  c.save();
  c.imageSmoothingEnabled = true;
  c.drawImage(flCv, 0, 0, w, h, 0, 0, vw, vh);
  c.restore();
  return hi;
}
