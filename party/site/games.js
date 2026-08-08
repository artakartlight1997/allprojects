// 5この ミニゲーム。ぜんぶ「じぶんの ボタンを おす だけ」。
//
// 4人が 1だいの まわりに すわって あそぶので、
//   ・そうさは **1人 1つの ボタン** だけ（ゆびが ぶつからない）
//   ・まん中に 出す ものは **むきの ない 絵**（まる・色・わっか）だけに する。
//     文字は むきが あるので、それぞれの 人の ばしょに その人の むきで かく。
//
// each ゲームは つぎの かたちで 書く：
//   name  … なまえ
//   how   … あそびかた（1行）
//   len   … なんびょうで おわるか（0 なら じぶんで きめる）
//   start(G)          … はじめる ときに 1回
//   step(G, dt)       … 1コマ ごと
//   press(G, i)       … i ばんの 人が ボタンを おした
//   release(G, i)     … はなした（つかう ゲームだけ）
//   score(G)          … その ラウンドの てんすう（人ごとの はいれつ）

'use strict';

// VH は chars.js で きめている

// てんすうの つけかた：1い 3てん、2い 2てん、3い 1てん、4い 0てん
function rankPoints(vals, bigIsBetter) {
  const n = vals.length;
  const idx = vals.map((v, i) => i);
  idx.sort((a, b) => (bigIsBetter ? vals[b] - vals[a] : vals[a] - vals[b]));
  const pts = new Array(n).fill(0);
  const table = [3, 2, 1, 0];
  let place = 0;
  for (let k = 0; k < n; k++) {
    if (k > 0 && vals[idx[k]] !== vals[idx[k - 1]]) place = k;
    pts[idx[k]] = table[Math.min(3, place)];
  }
  return pts;
}

const MINIS = [
  // ① はやおし。まん中が 光ったら、いちばん 早く おした 人の かち。
  {
    key: 'react', name: 'はやおし', col: '#FF6A6A',
    how: 'まん中が ひかったら すぐ おす！ フライングは まけ',
    len: 0,
    start(G) {
      G.m = { phase: 'wait', t: 0, wait: 1.4 + Math.random() * 2.6,
              got: G.who.map(() => -1), foul: G.who.map(() => false) };
    },
    step(G, dt) {
      const m = G.m;
      m.t += dt;
      if (m.phase === 'wait' && m.t >= m.wait) { m.phase = 'go'; m.t = 0; sfxGo(); }
      // ぜんいん おしたか、3びょう すぎたら おわり
      if (m.phase === 'go') {
        const done = G.who.every((_, i) => m.got[i] >= 0 || m.foul[i]);
        if (done || m.t > 3) return true;
      }
      if (m.phase === 'wait' && m.t > 9) return true;
      return false;
    },
    press(G, i) {
      const m = G.m;
      if (m.phase === 'wait') {
        if (!m.foul[i]) { m.foul[i] = true; sfxBad(); }
        return;
      }
      if (m.got[i] < 0) { m.got[i] = m.t; sfxTap(i); }
    },
    score(G) {
      const m = G.m;
      // フライング・おさなかった 人は いちばん おそい あつかい
      const v = G.who.map((_, i) => (m.foul[i] || m.got[i] < 0) ? 99 : m.got[i]);
      return rankPoints(v, false);
    },
  },

  // ② れんだ。5びょうで なんかい おせるか。
  {
    key: 'mash', name: 'れんだ', col: '#FFB03A',
    how: '5びょうで できるだけ たくさん おす！',
    len: 5,
    start(G) { G.m = { n: G.who.map(() => 0) }; },
    step() { return false; },
    press(G, i) { G.m.n[i]++; sfxTap(i); },
    score(G) { return rankPoints(G.m.n, true); },
  },

  // ③ ぴったり。わっかが 小さく なって、消える しゅんかんに おす。
  {
    key: 'timing', name: 'ぴったり', col: '#5AC8E8',
    how: 'わっかが きえる しゅんかんに おす！',
    len: 0,
    start(G) {
      G.m = { t: 0, at: 2.6 + Math.random() * 1.6, err: G.who.map(() => 99) };
    },
    step(G, dt) {
      G.m.t += dt;
      if (G.m.t > G.m.at + 1.2) return true;
      return false;
    },
    press(G, i) {
      const m = G.m;
      if (m.err[i] < 99) return;
      m.err[i] = Math.abs(m.t - m.at);
      if (m.err[i] < 0.12) sfxGood(); else sfxTap(i);
    },
    score(G) { return rankPoints(G.m.err, false); },
  },

  // ④ いろあわせ。まん中が じぶんの 色に なった ときだけ おす。
  {
    key: 'color', name: 'いろあわせ', col: '#8ED66A',
    how: 'まん中が **じぶんの 色** の ときだけ おす！ ちがったら −1',
    len: 12,
    start(G) {
      G.m = { t: 0, cur: -1, next: 0.9, live: false, cue: 0, pt: G.who.map(() => 0),
              hit: G.who.map(() => false) };
    },
    step(G, dt) {
      const m = G.m;
      m.t += dt;
      if (m.t >= m.next) {
        m.t = 0;
        m.next = 0.75 + Math.random() * 0.7;
        m.cur = (Math.random() * G.who.length) | 0;
        m.live = true;
        m.cue++;          // CPU が「あたらしい 色に なった」と 気づく ための ばんごう
        for (let i = 0; i < G.who.length; i++) m.hit[i] = false;
      }
      // 見せる 時間が すぎたら もう おせない
      if (m.live && m.t > 0.62) m.live = false;
      return false;
    },
    press(G, i) {
      const m = G.m;
      if (m.hit[i]) return;
      m.hit[i] = true;
      if (m.live && m.cur === i) { m.pt[i]++; sfxGood(); }
      else { m.pt[i]--; sfxBad(); }
    },
    score(G) { return rankPoints(G.m.pt, true); },
  },

  // ⑤ ながおし。おしっぱなしに して、わっかが 出たら すぐ はなす。
  {
    key: 'hold', name: 'ながおし', col: '#C88AE8',
    how: 'ずっと おしておく → まん中が 光ったら すぐ はなす！',
    len: 0,
    start(G) {
      G.m = { phase: 'ready', t: 0, wait: 2.0 + Math.random() * 2.4,
              down: G.who.map(() => false), got: G.who.map(() => -1),
              foul: G.who.map(() => false) };
    },
    step(G, dt) {
      const m = G.m;
      m.t += dt;
      if (m.phase === 'ready') {
        // ぜんいん おしたら はじまる（10びょう まっても はじめる）
        if (G.who.every((_, i) => m.down[i]) || m.t > 10) {
          m.phase = 'wait'; m.t = 0;
        }
        return false;
      }
      if (m.phase === 'wait' && m.t >= m.wait) { m.phase = 'go'; m.t = 0; sfxGo(); }
      if (m.phase === 'go') {
        const done = G.who.every((_, i) => m.got[i] >= 0 || m.foul[i] || !m.down[i]);
        if (done || m.t > 3) return true;
      }
      return false;
    },
    press(G, i) { G.m.down[i] = true; },
    release(G, i) {
      const m = G.m;
      m.down[i] = false;
      if (m.phase === 'wait') { if (!m.foul[i]) { m.foul[i] = true; sfxBad(); } return; }
      if (m.phase === 'go' && m.got[i] < 0) { m.got[i] = m.t; sfxTap(i); }
    },
    score(G) {
      const m = G.m;
      const v = G.who.map((_, i) => (m.foul[i] || m.got[i] < 0) ? 99 : m.got[i]);
      return rankPoints(v, false);
    },
  },
];

// --- CPU -----------------------------------------------------------------------
//
// ★ CPU も 人と まったく 同じ playerDown / playerUp を つかって おす。
//   中で こっそり 点を 足したり しない。だから
//   「CPU だけ ずるを している」ことに ならないし、
//   人と CPU が まざっても てんすうの つけかたを 分けなくて よい。
//
// つよさは 3だんかい。はんのう時間・ばらつき・ミスの おおさ が かわる。

const CPU_LV = [
  // よわい … 小さい子でも かてる くらい
  { rt: 0.44, jit: 0.15, mash: 5.2, sig: 0.100, foul: 0.14, wrong: 0.10, name: 'よわい' },
  // ふつう … はんのう 0.3びょう くらいの 人と いい しょうぶに なる
  { rt: 0.31, jit: 0.10, mash: 6.9, sig: 0.058, foul: 0.07, wrong: 0.05, name: 'ふつう' },
  // つよい … かなり 手ごわい
  { rt: 0.20, jit: 0.05, mash: 9.2, sig: 0.028, foul: 0.02, wrong: 0.015, name: 'つよい' },
];

function cpuLv() { return CPU_LV[Math.max(0, Math.min(2, save.cpuLv | 0))]; }

// ふつうの ばらつき（正規分布っぽく する ため 3つ たして 3で わる）
function jitter() { return (Math.random() + Math.random() + Math.random()) / 1.5 - 1; }

function cpuPlan(G, i) {
  const L = cpuLv();
  const rt = () => Math.max(0.08, L.rt + jitter() * L.jit);
  const k = G.mini.key;
  if (k === 'react') {
    return { rt: rt(), foulAt: Math.random() < L.foul ? 0.3 + Math.random() * 1.6 : -1 };
  }
  if (k === 'mash') {
    return { rate: L.mash * (0.88 + Math.random() * 0.24), acc: Math.random() };
  }
  if (k === 'timing') {
    return { err: jitter() * L.sig * 1.6 };
  }
  if (k === 'color') {
    return { rt: rt() * 1.1, cue: -1, wrongAt: -1 };
  }
  if (k === 'hold') {
    return { pressAt: 0.2 + Math.random() * 1.1, rt: rt(),
             foulAt: Math.random() < L.foul ? 0.4 + Math.random() * 1.4 : -1 };
  }
  return {};
}

function cpuThink(G, i, dt) {
  const m = G.m, c = G.cz[i], k = G.mini.key;
  if (!m || !c) return;

  if (k === 'react') {
    if (m.phase === 'wait') {
      if (c.foulAt >= 0 && m.t >= c.foulAt) { c.foulAt = -1; playerDown(i); playerUp(i); }
    } else if (m.phase === 'go') {
      if (m.got[i] < 0 && !m.foul[i] && m.t >= c.rt) { playerDown(i); playerUp(i); }
    }
    return;
  }

  if (k === 'mash') {
    c.acc += dt * c.rate;
    while (c.acc >= 1) { c.acc -= 1; playerDown(i); playerUp(i); }
    return;
  }

  if (k === 'timing') {
    if (m.err[i] > 90 && m.t >= m.at + c.err) { playerDown(i); playerUp(i); }
    return;
  }

  if (k === 'color') {
    if (!m.live) return;
    if (c.cue !== m.cue) {
      // あたらしい 色に なった。じぶんの 色 でなければ、たまに まちがえる。
      c.cue = m.cue;
      const L = cpuLv();
      c.wrongAt = (m.cur !== i && Math.random() < L.wrong)
        ? 0.10 + Math.random() * 0.28 : -1;
    }
    if (m.hit[i]) return;
    if (m.cur === i) { if (m.t >= c.rt) { playerDown(i); playerUp(i); } }
    else if (c.wrongAt >= 0 && m.t >= c.wrongAt) { c.wrongAt = -1; playerDown(i); playerUp(i); }
    return;
  }

  if (k === 'hold') {
    if (m.phase === 'ready') {
      if (!m.down[i] && m.t >= c.pressAt) playerDown(i);
    } else if (m.phase === 'wait') {
      if (c.foulAt >= 0 && m.t >= c.foulAt && m.down[i]) { c.foulAt = -1; playerUp(i); }
    } else if (m.phase === 'go') {
      if (m.down[i] && m.t >= c.rt) playerUp(i);
    }
  }
}
