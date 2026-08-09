// ミニゲームの ぜんぶ。1本 数びょうで おわる。
//
// ★ 中みは 0〜1 の ざひょうで 書く。X(u) で よこ、Y(v) で たて、
//   R(k) で 大きさに なおす。こうすると どんな 画面でも 形が くずれない。
//
// ★ うごかす ものは ぜんぶ「ゆびを 置いた ところへ 近づく」。
//   小さい子でも まよわない ように、そうさは 2つだけ に そろえた。
//     ・さわって うごかす
//     ・タップする
//
// それぞれの ミニゲームは
//   init(g, P)          はじめの じゅんび（P.lv むずかしさ 0..2 / P.spd 速さ）
//   update(g, dt, IN, P) まいコマ。g.ok = true で せいこう、g.ng = true で しっぱい
//   draw(g, t)          え
// を もつ。mode が 'survive' の ものは、じかん切れ＝せいこう。

'use strict';

function follow(cur, to, dt, k) { return cur + (to - cur) * Math.min(1, dt * (k || 11)); }

// ★ うごく ものの 速さ。P.spd を そのまま かけると 上の レベルで
//   ひとの 手では まにあわない 速さに なるので、6わり だけ ひびかせる。
function sp2(P) { return 1 + (P.spd - 1) * 0.6; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hit(u, v, cu, cv, r) {
  const dx = (u - cu) * S.w, dy = (v - cv) * S.h;
  return dx * dx + dy * dy <= (r * S.h) * (r * S.h);
}

// ★ よこ(u)と たて(v)は 目もりの 大きさが ちがう（はこが よこ長 だから）。
//   あたり はんていを u の まま くらべると、見た目より ずっと 大きな
//   はんいで ぶつかって しまう。よこの ずれは かならず たての たんいに
//   なおして から くらべる。
function toH(du) { return du * S.w / S.h; }

// --- 1. たべる（にょろにょろ より） ------------------------------------------------
const mEat = {
  key: 'eat', name: 'たべる', hint: 'さわって うごかそう', host: 2, mode: 'clear',
  init(g, P) {
    g.u = 0.2; g.v = 0.5;
    g.fu = 0.55 + Math.random() * 0.35; g.fv = 0.2 + Math.random() * 0.6;
    g.tail = [];
    g.sp = 1.0 + P.lv * 0.3;
  },
  update(g, dt, IN, P) {
    if (IN.down) { g.u = follow(g.u, IN.u, dt, 7 * g.sp); g.v = follow(g.v, IN.v, dt, 7 * g.sp); }
    g.tail.unshift({ u: g.u, v: g.v });
    if (g.tail.length > 14) g.tail.pop();
    if (hit(g.u, g.v, g.fu, g.fv, 0.09)) g.ok = true;
  },
  draw(g) {
    for (let i = g.tail.length - 1; i >= 0; i--) {
      const p = g.tail[i];
      ctx.fillStyle = i % 2 ? '#3AA84A' : '#57D06A';
      circle(X(p.u), Y(p.v), R(0.055 * (1 - i / 22))); ctx.fill();
    }
    ctx.fillStyle = '#E24B4B';
    circle(X(g.fu), Y(g.fv), R(0.055)); ctx.fill();
    ctx.fillStyle = '#2E7A32';
    ctx.fillRect(X(g.fu) - R(0.008), Y(g.fv) - R(0.085), R(0.016), R(0.035));
    ctx.fillStyle = '#8CF08C';
    circle(X(g.u), Y(g.v), R(0.075)); ctx.fill();
    ctx.fillStyle = '#123';
    circle(X(g.u) - R(0.026), Y(g.v) - R(0.015), R(0.014)); ctx.fill();
    circle(X(g.u) + R(0.026), Y(g.v) - R(0.015), R(0.014)); ctx.fill();
  },
};

// --- 2. たたく（モグラたたき より） ------------------------------------------------
const mMole = {
  key: 'mole', name: 'たたく', hint: 'ぜんぶ たたけ！', host: 1, mode: 'clear',
  init(g, P) {
    g.n = 3 + P.lv;
    g.hole = [];
    for (let i = 0; i < 6; i++) g.hole.push({ u: 0.16 + (i % 3) * 0.34, v: 0.30 + Math.floor(i / 3) * 0.38, up: 0, hitT: 0 });
    const idx = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, g.n);
    g.plan = idx.map((h, i) => ({ h: h, t: i * (0.30 / P.spd) }));
    g.left = g.n; g.t = 0;
  },
  update(g, dt, IN, P) {
    g.t += dt;
    for (const p of g.plan) if (!p.on && g.t >= p.t) { p.on = true; g.hole[p.h].up = 1; }
    for (const h of g.hole) if (h.hitT > 0) h.hitT -= dt;
    for (const tp of IN.taps) {
      for (const h of g.hole) {
        if (h.up === 1 && hit(tp.u, tp.v, h.u, h.v - 0.06, 0.13)) {
          h.up = 2; h.hitT = 0.25; g.left--; sfxHit();
          if (g.left <= 0) g.ok = true;
        }
      }
    }
  },
  draw(g) {
    for (const h of g.hole) {
      ctx.fillStyle = '#5A3A22';
      ctx.beginPath();
      ctx.ellipse(X(h.u), Y(h.v), R(0.115), R(0.05), 0, 0, Math.PI * 2);
      ctx.fill();
      if (h.up === 1 || h.hitT > 0) {
        const y = Y(h.v) - R(h.up === 1 ? 0.085 : 0.04);
        ctx.fillStyle = h.up === 2 ? '#C08A62' : '#9B6B44';
        circle(X(h.u), y, R(0.085)); ctx.fill();
        ctx.fillStyle = '#2A1A12';
        circle(X(h.u) - R(0.03), y - R(0.01), R(0.014)); ctx.fill();
        circle(X(h.u) + R(0.03), y - R(0.01), R(0.014)); ctx.fill();
        ctx.fillStyle = '#F5B8C8';
        circle(X(h.u), y + R(0.03), R(0.02)); ctx.fill();
      }
    }
  },
};

// --- 3. よける（カエルわたり より） ------------------------------------------------
const mDodge = {
  key: 'dodge', name: 'わたる', hint: 'さわって 上へ！', host: 2, mode: 'clear',
  init(g, P) {
    g.u = 0.5; g.v = 0.92;
    // ★ 車の れつは 2れつだけ。あいだに ちゃんと「休める しま」を つくる。
    //   れつを ふやすと 休む ばしょが なくなって、うんまかせに なって しまう。
    g.rows = [0.32, 0.72];
    g.cars = [];
    for (let i = 0; i < g.rows.length; i++) {
      const dir = i % 2 ? 1 : -1;
      const per = 1 + (P.lv >= 1 ? 1 : 0);
      for (let j = 0; j < per; j++) {
        g.cars.push({ v: g.rows[i], u: (Math.random() + j / per) % 1, d: dir,
                      s: (0.30 + i * 0.06 + P.lv * 0.05) * sp2(P) });
      }
    }
  },
  update(g, dt, IN, P) {
    if (IN.down) { g.u = follow(g.u, IN.u, dt, 9); g.v = follow(g.v, IN.v, dt, 9); }
    g.v = clamp(g.v, 0.06, 0.94); g.u = clamp(g.u, 0.04, 0.96);
    for (const c of g.cars) {
      c.u += c.d * c.s * dt;
      if (c.u > 1.2) c.u = -0.2;
      if (c.u < -0.2) c.u = 1.2;
      if (Math.abs(g.v - c.v) < 0.055 + 0.050 && Math.abs(toH(g.u - c.u)) < 0.10 + 0.050) g.ng = true;
    }
    if (g.v < 0.10) g.ok = true;
  },
  draw(g) {
    ctx.fillStyle = '#2A6B3A'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    // 車の れつ（くろい 道）と、休める みどりの しま
    ctx.fillStyle = '#3A3A4A';
    for (const rv of g.rows) ctx.fillRect(X(0), Y(rv - 0.13), S.w, R(0.26));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, R(0.008));
    ctx.setLineDash([R(0.05), R(0.05)]);
    for (const rv of g.rows) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(rv)); ctx.lineTo(X(1), Y(rv)); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,214,74,0.30)';
    ctx.fillRect(X(0), Y(0), S.w, R(0.10));
    for (const c of g.cars) {
      ctx.fillStyle = c.d > 0 ? '#E0566E' : '#F0A0C8';
      rr(X(c.u) - R(0.10), Y(c.v) - R(0.055), R(0.20), R(0.11), R(0.03)); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      rr(X(c.u) - R(0.04), Y(c.v) - R(0.035), R(0.08), R(0.045), R(0.015)); ctx.fill();
    }
    ctx.fillStyle = '#5AD05A';
    circle(X(g.u), Y(g.v), R(0.062)); ctx.fill();
    ctx.fillStyle = '#123';
    circle(X(g.u) - R(0.024), Y(g.v) - R(0.018), R(0.013)); ctx.fill();
    circle(X(g.u) + R(0.024), Y(g.v) - R(0.018), R(0.013)); ctx.fill();
  },
};

// --- 4. つる（つり より） ---------------------------------------------------------
const mFish = {
  key: 'fish', name: 'つる', hint: 'しずんだら タップ！', host: 3, mode: 'clear',
  init(g, P) {
    g.wait = 0.7 + Math.random() * (1.0 - P.lv * 0.15);
    g.win = 0.90 - P.lv * 0.16;      // つれる あいだ
    g.t = 0; g.bite = false; g.done = false;
  },
  update(g, dt, IN, P) {
    g.t += dt;
    if (!g.bite && g.t >= g.wait) g.bite = true;
    if (g.bite && g.t > g.wait + g.win) g.bite = false;
    if (IN.taps.length) {
      if (g.bite) g.ok = true;
      else g.ng = true;
    }
  },
  draw(g) {
    ctx.fillStyle = '#2E6EA8'; ctx.fillRect(X(0), Y(0.42), S.w, R(0.58));
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = Math.max(1, R(0.01));
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0.5 + i * 0.1));
      ctx.lineTo(X(1), Y(0.5 + i * 0.1));
      ctx.stroke();
    }
    const bv = g.bite ? 0.52 : 0.40 + Math.sin(g.t * 3) * 0.012;
    ctx.strokeStyle = '#DDD'; ctx.lineWidth = Math.max(1, R(0.01));
    ctx.beginPath(); ctx.moveTo(X(0.5), Y(0.05)); ctx.lineTo(X(0.5), Y(bv)); ctx.stroke();
    ctx.fillStyle = g.bite ? '#FF4A4A' : '#FFF';
    circle(X(0.5), Y(bv), R(0.055)); ctx.fill();
    ctx.fillStyle = g.bite ? '#FFF' : '#FF4A4A';
    ctx.beginPath();
    ctx.arc(X(0.5), Y(bv), R(0.055), 0, Math.PI); ctx.fill();
    if (g.bite) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(2, R(0.012));
      circle(X(0.5), Y(bv), R(0.10 + Math.sin(g.t * 22) * 0.012)); ctx.stroke();
    }
  },
};

// --- 5. みがく（おそうじ より） ----------------------------------------------------
const mClean = {
  key: 'clean', name: 'みがく', hint: 'こすって けそう', host: 0, mode: 'clear',
  init(g, P) {
    g.sp = [];
    const n = 2 + P.lv;
    for (let i = 0; i < n; i++) {
      g.sp.push({ u: 0.2 + Math.random() * 0.6, v: 0.25 + Math.random() * 0.5, hp: 1 });
    }
  },
  update(g, dt, IN, P) {
    if (IN.down) {
      for (const s of g.sp) {
        if (s.hp > 0 && hit(IN.u, IN.v, s.u, s.v, 0.12)) s.hp -= dt * (2.2 + P.lv * 0.4);
      }
    }
    if (g.sp.every((s) => s.hp <= 0)) g.ok = true;
  },
  draw(g) {
    ctx.fillStyle = '#DCE6EE'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(X(i / 6), Y(0)); ctx.lineTo(X(i / 6), Y(1)); ctx.stroke();
    }
    for (const s of g.sp) {
      if (s.hp <= 0) continue;
      ctx.globalAlpha = Math.max(0.15, s.hp);
      ctx.fillStyle = '#5C7A3A';
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        circle(X(s.u) + Math.cos(a) * R(0.055), Y(s.v) + Math.sin(a) * R(0.055), R(0.045)); ctx.fill();
      }
      circle(X(s.u), Y(s.v), R(0.06)); ctx.fill();
      ctx.globalAlpha = 1;
    }
  },
};

// --- 6. うつ（シューティング より） ------------------------------------------------
const mShoot = {
  key: 'shoot', name: 'うつ', hint: 'てきを タップ', host: 1, mode: 'clear',
  init(g, P) {
    g.e = [];
    const n = 3 + (P.lv >= 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      g.e.push({ u: 0.25 + i * 0.18, v: 0.25 + Math.random() * 0.5,
                 ph: Math.random() * 6, sp: (0.9 + P.lv * 0.3) * sp2(P), alive: true, boom: 0 });
    }
    g.left = n; g.t = 0;
  },
  update(g, dt, IN, P) {
    g.t += dt;
    for (const e of g.e) {
      e.v += Math.sin(g.t * e.sp + e.ph) * dt * 0.35;
      e.v = clamp(e.v, 0.12, 0.88);
      if (e.boom > 0) e.boom -= dt;
    }
    for (const tp of IN.taps) {
      for (const e of g.e) {
        if (e.alive && hit(tp.u, tp.v, e.u, e.v, 0.11)) {
          e.alive = false; e.boom = 0.3; g.left--; sfxHit();
          if (g.left <= 0) g.ok = true;
        }
      }
    }
  },
  draw(g) {
    ctx.fillStyle = '#0E1230'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(X((i * 0.137 + g.t * 0.05) % 1), Y((i * 0.371) % 1), 2, 2);
    }
    for (const e of g.e) {
      if (e.boom > 0) {
        ctx.fillStyle = 'rgba(255,200,80,' + (e.boom / 0.3) + ')';
        circle(X(e.u), Y(e.v), R(0.10 * (1.4 - e.boom / 0.3))); ctx.fill();
      }
      if (!e.alive) continue;
      ctx.fillStyle = '#B44AF0';
      circle(X(e.u), Y(e.v), R(0.075)); ctx.fill();
      ctx.fillStyle = '#F0E0FF';
      circle(X(e.u) - R(0.026), Y(e.v) - R(0.01), R(0.018)); ctx.fill();
      circle(X(e.u) + R(0.026), Y(e.v) - R(0.01), R(0.018)); ctx.fill();
      ctx.fillStyle = '#6A2A9A';
      rr(X(e.u) - R(0.075), Y(e.v) + R(0.05), R(0.15), R(0.03), R(0.015)); ctx.fill();
    }
  },
};

// --- 7. とぶ（ふわふわふわりな より） ----------------------------------------------
const mFlap = {
  key: 'flap', name: 'とぶ', hint: 'タップで ふわっと', host: 0, mode: 'survive',
  init(g, P) {
    g.v = 0.5; g.vy = 0; g.t = 0;
    g.wall = [];
    for (let i = 0; i < 3; i++) g.wall.push({ u: 1.15 + i * 0.72, gap: 0.28 + Math.random() * 0.44 });
    g.sp = (0.40 + P.lv * 0.07) * sp2(P);
  },
  update(g, dt, IN, P) {
    g.t += dt;
    if (IN.taps.length) { g.vy = -0.85; sfxFlap(); }
    g.vy += dt * 2.3;
    g.v += g.vy * dt;
    if (g.v > 0.95) { g.v = 0.95; g.vy = 0; }
    if (g.v < 0.05) { g.v = 0.05; g.vy = 0; }
    for (const w of g.wall) {
      w.u -= g.sp * dt;
      if (Math.abs(w.u - 0.25) < 0.055 && Math.abs(g.v - w.gap) > 0.20) g.ng = true;
    }
  },
  draw(g) {
    ctx.fillStyle = '#8ED8F0'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 4; i++) {
      const u = ((i * 0.31 - g.t * 0.04) % 1.2 + 1.2) % 1.2 - 0.1;
      circle(X(u), Y(0.15 + i * 0.09), R(0.06)); ctx.fill();
      circle(X(u) + R(0.05), Y(0.15 + i * 0.09), R(0.045)); ctx.fill();
    }
    for (const w of g.wall) {
      if (w.u < -0.2 || w.u > 1.3) continue;
      ctx.fillStyle = '#3A9A5A';
      ctx.fillRect(X(w.u) - R(0.05), Y(0), R(0.10), R(w.gap - 0.20));
      ctx.fillRect(X(w.u) - R(0.05), Y(w.gap + 0.20), R(0.10), R(1 - w.gap - 0.20) + 4);
    }
    ctx.fillStyle = '#FF6FA8';
    circle(X(0.25), Y(g.v), R(0.065)); ctx.fill();
    ctx.fillStyle = '#FFF';
    circle(X(0.25) + R(0.02), Y(g.v) - R(0.015), R(0.018)); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath();
    ctx.moveTo(X(0.25) + R(0.06), Y(g.v));
    ctx.lineTo(X(0.25) + R(0.10), Y(g.v) - R(0.02));
    ctx.lineTo(X(0.25) + R(0.10), Y(g.v) + R(0.02));
    ctx.closePath(); ctx.fill();
  },
};

// --- 8. とめる（カートレース より） ------------------------------------------------
const mStop = {
  key: 'stop', name: 'とめる', hint: 'みどりで タップ', host: 1, mode: 'clear',
  init(g, P) {
    g.p = 0; g.d = 1;
    g.sp = (0.72 + P.lv * 0.20) * sp2(P);
    g.w = 0.17 - P.lv * 0.022;
    g.c = 0.30 + Math.random() * 0.40;
  },
  update(g, dt, IN, P) {
    g.p += g.d * g.sp * dt;
    if (g.p > 1) { g.p = 1; g.d = -1; }
    if (g.p < 0) { g.p = 0; g.d = 1; }
    if (IN.taps.length) {
      if (Math.abs(g.p - g.c) <= g.w / 2) g.ok = true; else g.ng = true;
    }
  },
  draw(g) {
    const y = Y(0.5), h = R(0.16);
    ctx.fillStyle = '#26304A';
    rr(X(0.06), y - h / 2, S.w * 0.88, h, h * 0.3); ctx.fill();
    ctx.fillStyle = '#3ADB7A';
    ctx.fillRect(X(0.06 + 0.88 * (g.c - g.w / 2)), y - h / 2, S.w * 0.88 * g.w, h);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(X(0.06 + 0.88 * g.p) - R(0.012), y - h * 0.75, R(0.024), h * 1.5);
    bigText('ピタッ！', X(0.5), Y(0.22), Math.round(R(0.13)), '#FFF');
  },
};

// --- 9. こたえる（クイズ） ---------------------------------------------------------
const QUIZ = [
  { q: '7 × 8 = ?', a: ['54', '56', '48'], c: 1 },
  { q: '96 ÷ 8 = ?', a: ['12', '14', '11'], c: 0 },
  { q: '「博多」の 読みは？', a: ['はかた', 'はくた', 'ばくた'], c: 0 },
  { q: '日本で いちばん 高い 山は？', a: ['富士山', '白山', '立山'], c: 0 },
  { q: '四国に ない 県は？', a: ['香川', '高知', '大分'], c: 2 },
  { q: '九州に ある 県は？', a: ['徳島', '宮崎', '島根'], c: 1 },
  { q: '1年は 何日？', a: ['355日', '365日', '375日'], c: 1 },
  { q: '「快晴」の 読みは？', a: ['かいせい', 'かいしょう', 'けいせい'], c: 0 },
  { q: '三角形の 角の 合計は？', a: ['180度', '360度', '90度'], c: 0 },
  { q: 'water は 日本語で？', a: ['火', '水', '風'], c: 1 },
];
const mQuiz = {
  key: 'quiz', name: 'こたえる', hint: 'ただしい ほうを タップ', host: 0, mode: 'clear',
  init(g, P) {
    g.q = QUIZ[Math.floor(Math.random() * QUIZ.length)];
    g.ord = [0, 1, 2].sort(() => Math.random() - 0.5);
  },
  update(g, dt, IN, P) {
    for (const tp of IN.taps) {
      for (let i = 0; i < 3; i++) {
        const u = 0.18 + i * 0.32;
        if (Math.abs(toH(tp.u - u)) < 0.145 && Math.abs(tp.v - 0.68) < 0.125) {
          if (g.ord[i] === g.q.c) g.ok = true; else g.ng = true;
        }
      }
    }
  },
  draw(g) {
    ctx.fillStyle = '#221C3A'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    const fs = fitSize(g.q.q, S.w * 0.86, Math.round(R(0.15)));
    bigText(g.q.q, X(0.5), Y(0.28), fs, '#FFF');
    for (let i = 0; i < 3; i++) {
      const u = 0.18 + i * 0.32, txt = g.q.a[g.ord[i]];
      ctx.fillStyle = ['#FF6FA8', '#4A9BFF', '#48D8A0'][i];
      rr(X(u) - R(0.135), Y(0.68) - R(0.115), R(0.27), R(0.23), R(0.05)); ctx.fill();
      const f2 = fitSize(txt, R(0.24), Math.round(R(0.105)));
      bigText(txt, X(u), Y(0.68), f2, '#20182E', null);
    }
  },
};

// --- 10. うけとめる（ハッピータワー／サンドイッチ より） ----------------------------
const mCatch = {
  key: 'catch', name: 'うけとめる', hint: 'さわって おさらを うごかす', host: 3, mode: 'clear',
  init(g, P) {
    g.u = 0.5;
    g.need = 2 + (P.lv >= 2 ? 1 : 0);
    g.got = 0;
    g.it = [];
    for (let i = 0; i < g.need; i++) {
      g.it.push({ u: 0.15 + Math.random() * 0.7, v: -0.15 - i * 0.55,
                  s: (0.55 + P.lv * 0.12) * sp2(P), k: i % 3, live: true });
    }
  },
  update(g, dt, IN, P) {
    if (IN.down) g.u = follow(g.u, IN.u, dt, 12);
    g.u = clamp(g.u, 0.08, 0.92);
    for (const it of g.it) {
      if (!it.live) continue;
      it.v += it.s * dt;
      if (it.v > 0.80 && it.v < 0.92 && Math.abs(toH(it.u - g.u)) < 0.14 + 0.05) {
        it.live = false; g.got++; sfxHit();
        if (g.got >= g.need) g.ok = true;
      } else if (it.v > 1.05) { it.live = false; g.ng = true; }
    }
  },
  draw(g) {
    ctx.fillStyle = '#2A2440'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    for (const it of g.it) {
      if (!it.live) continue;
      ctx.fillStyle = ['#FFD24A', '#FF8A5A', '#8AE06A'][it.k];
      circle(X(it.u), Y(it.v), R(0.062)); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      circle(X(it.u) - R(0.02), Y(it.v) - R(0.02), R(0.018)); ctx.fill();
    }
    ctx.fillStyle = '#E8E8F0';
    rr(X(g.u) - R(0.14), Y(0.86), R(0.28), R(0.07), R(0.03)); ctx.fill();
    ctx.fillStyle = '#B8B8C8';
    rr(X(g.u) - R(0.04), Y(0.93), R(0.08), R(0.05), R(0.02)); ctx.fill();
  },
};

// --- 11. リズム（りなりなリズム より） ---------------------------------------------
const mRhythm = {
  key: 'rhythm', name: 'リズム', hint: 'わが かさなったら タップ', host: 0, mode: 'clear',
  init(g, P) {
    g.beat = 0.80 / P.spd;
    g.n = 3;
    g.t = 0; g.i = 0; g.hits = 0; g.flash = 0;
  },
  update(g, dt, IN, P) {
    g.t += dt;
    const target = 0.55 + g.i * g.beat;
    if (IN.taps.length && g.i < g.n) {
      if (Math.abs(g.t - target) < 0.20) {
        g.hits++; g.i++; g.flash = 0.2; sfxHit();
        if (g.hits >= g.n) g.ok = true;
      } else { g.ng = true; }
    }
    if (g.i < g.n && g.t > target + 0.22) g.ng = true;
    if (g.flash > 0) g.flash -= dt;
  },
  draw(g) {
    ctx.fillStyle = '#301E44'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    for (let i = 0; i < g.n; i++) {
      const u = 0.5 + (i - (g.n - 1) / 2) * 0.20;
      const done = i < g.i;
      ctx.strokeStyle = done ? '#48D8A0' : '#FFF';
      ctx.lineWidth = Math.max(2, R(0.014));
      circle(X(u), Y(0.5), R(0.10)); ctx.stroke();
      if (!done) {
        const target = 0.55 + i * g.beat;
        const k = clamp((target - g.t) / g.beat, 0, 1.6);
        if (k < 1.6) {
          ctx.strokeStyle = 'rgba(255,214,74,0.9)';
          ctx.lineWidth = Math.max(2, R(0.012));
          circle(X(u), Y(0.5), R(0.10 + k * 0.13)); ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#48D8A0';
        circle(X(u), Y(0.5), R(0.06)); ctx.fill();
      }
    }
    if (g.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (g.flash * 1.4) + ')';
      ctx.fillRect(X(0), Y(0), S.w, S.h);
    }
  },
};

// --- 12. つむ（ハッピータワー より） ------------------------------------------------
const mStack = {
  key: 'stack', name: 'つむ', hint: 'まん中で タップ', host: 2, mode: 'clear',
  init(g, P) {
    g.u = 0.5; g.d = 1;
    g.sp = (0.62 + P.lv * 0.18) * sp2(P);
    g.base = 0.5;
    g.w = 0.16 - P.lv * 0.028;
    g.drop = null;
  },
  update(g, dt, IN, P) {
    if (g.drop) {
      g.drop.v += dt * 2.2;
      if (g.drop.v >= 0.70) {
        if (Math.abs(toH(g.drop.u - g.base)) < g.w * 0.95) g.ok = true; else g.ng = true;
      }
      return;
    }
    g.u += g.d * g.sp * dt;
    if (g.u > 0.88) { g.u = 0.88; g.d = -1; }
    if (g.u < 0.12) { g.u = 0.12; g.d = 1; }
    if (IN.taps.length) g.drop = { u: g.u, v: 0.24 };
  },
  draw(g) {
    ctx.fillStyle = '#1E2A3A'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    ctx.fillStyle = '#8A6A4A';
    rr(X(g.base) - R(g.w), Y(0.74), R(g.w * 2), R(0.13), R(0.02)); ctx.fill();
    ctx.fillStyle = '#6A4A2A';
    rr(X(g.base) - R(g.w * 1.1), Y(0.87), R(g.w * 2.2), R(0.10), R(0.02)); ctx.fill();
    const b = g.drop || { u: g.u, v: 0.24 };
    ctx.fillStyle = '#FFC63A';
    rr(X(b.u) - R(g.w), Y(b.v) - R(0.06), R(g.w * 2), R(0.12), R(0.02)); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(X(b.u) - R(g.w), Y(b.v) - R(0.06), R(g.w * 2), R(0.03), R(0.015)); ctx.fill();
  },
};

// --- ボス：パパロボ ---------------------------------------------------------------
const mBoss = {
  key: 'boss', name: 'パパロボ', hint: 'よけて タップ！', host: 0, mode: 'clear',
  boss: true,
  init(g, P) {
    g.hp = 4 + P.lv; g.hpMax = g.hp;
    g.u = 0.5; g.v = 0.86;
    g.pu = 0.5; g.pd = 1;
    g.slime = [];
    g.t = 0; g.next = 0.5; g.hurt = 0;
    g.sp = (0.45 + P.lv * 0.10) * sp2(P);
  },
  update(g, dt, IN, P) {
    g.t += dt;
    if (g.hurt > 0) g.hurt -= dt;
    g.pu += g.pd * 0.30 * sp2(P) * dt;
    if (g.pu > 0.80) { g.pu = 0.80; g.pd = -1; }
    if (g.pu < 0.20) { g.pu = 0.20; g.pd = 1; }
    if (IN.down) { g.u = follow(g.u, IN.u, dt, 11); g.v = follow(g.v, IN.v, dt, 11); }
    g.u = clamp(g.u, 0.05, 0.95); g.v = clamp(g.v, 0.05, 0.95);

    g.next -= dt;
    if (g.next <= 0) {
      g.next = 0.44 / sp2(P);
      g.slime.push({ u: g.pu + (Math.random() - 0.5) * 0.3, v: 0.38, big: Math.random() < 0.28,
                     s: g.sp * (0.9 + Math.random() * 0.5) });
    }
    for (const s of g.slime) {
      if (!s.live && s.live !== undefined) continue;
      s.v += s.s * dt;
      const r = s.big ? 0.085 : 0.055;
      if (Math.abs(toH(s.u - g.u)) < r + 0.050 && Math.abs(s.v - g.v) < r + 0.050) g.ng = true;
    }
    g.slime = g.slime.filter((s) => s.v < 1.2);

    for (const tp of IN.taps) {
      if (hit(tp.u, tp.v, g.pu, 0.26, 0.18)) {
        g.hp--; g.hurt = 0.22; sfxHit();
        if (g.hp <= 0) g.ok = true;
      }
    }
  },
  draw(g) {
    ctx.fillStyle = '#1A1030'; ctx.fillRect(X(0), Y(0), S.w, S.h);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(X((i * 0.173 + g.t * 0.03) % 1), Y((i * 0.311) % 1), 2, 2);
    }
    // たいりょく（いちばん 上の はし。パパと 重ならない ように 先に 描く）
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    rr(X(0.06), Y(0.015), S.w * 0.88, R(0.035), R(0.018)); ctx.fill();
    ctx.fillStyle = '#FF5A7A';
    rr(X(0.06), Y(0.015), S.w * 0.88 * (g.hp / g.hpMax), R(0.035), R(0.018)); ctx.fill();
    drawPapa(X(g.pu), Y(0.26), R(0.17), g.hurt, g.t);
    for (const s of g.slime) {
      const r = s.big ? 0.085 : 0.055;
      ctx.fillStyle = s.big ? '#7AE06A' : '#B8E86A';
      circle(X(s.u), Y(s.v), R(r)); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      circle(X(s.u) - R(r * 0.35), Y(s.v) - R(r * 0.35), R(r * 0.3)); ctx.fill();
    }
    drawKid(0, X(g.u), Y(g.v), R(0.055), 'happy', g.t);
  },
};

const MICRO = [mEat, mMole, mDodge, mFish, mClean, mShoot, mFlap, mStop, mQuiz, mCatch, mRhythm, mStack];
