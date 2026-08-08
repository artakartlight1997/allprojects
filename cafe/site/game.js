// お店の うごき。
//
// 1日の ながれ：
//   お客さんが 来る → いすに すわる → たのむ（1〜2品）
//   → こちらは 料理ボタンを おして 作る（時間が かかる）
//   → できた 料理は カウンターに ならぶ
//   → お客さんを タップ → その人の たのんだ ものが カウンターに あれば わたす
//   → ぜんぶ そろえば お会計。まだ にこにこの うちなら チップ
// 待てなく なると 帰って しまう（お金に ならない）。

'use strict';

const SAVE_KEY = 'cafe.v1';

const save = { clear: [], best: {}, fails: {}, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['d' + (i - 1)] || 0) >= 3;
}

// 3回 しっぱいすると やさしく なる。
//   ・お客さんが 待てる 時間が のびる
//   ・目標が さがる
// 3・6・9回 と 3だんかい。さいごの 日で ずっと 止まったままに ならない ように、
// 9回で かなり やさしく なる。
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['d' + i] || 0) / 3)); }
function waitMul() { return [1, 1.18, 1.36, 1.62][assistLevel(G.day)]; }
function goalMul() { return [1, 0.90, 0.80, 0.66][assistLevel(G.day)]; }

const G = {
  screen: 'title',
  day: 0,
  D: null,
  t: 0,
  money: 0,
  goal: 0,
  guests: [],     // いすに すわっている お客さん
  counter: [],    // できあがって ならんでいる 料理
  cooking: [],    // いま 作っている 料理
  nextIn: 0,
  served: 0, left: 0, tips: 0,
  over: false, win: false,
  flash: null, flashT: 0,
  pop: [],        // 「+300円」などの ふきだし
  hurried: false,
};

let guestSeq = 0;

function startDay(i) {
  audioStart();
  G.day = Math.max(0, Math.min(DAYS.length - 1, i));
  G.D = DAYS[G.day];
  G.t = 0;
  G.money = 0;
  G.goal = Math.round(G.D.goal * goalMul() / 100) * 100;
  G.guests = [];
  G.counter = [];
  G.cooking = [];
  G.nextIn = 0.8;
  G.served = 0; G.left = 0; G.tips = 0;
  G.over = false; G.win = false;
  G.pop = [];
  G.hurried = false;
  guestSeq = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.day);
}

// お客さんを 1人 つくる
function newGuest(seat) {
  const D = G.D;
  const r = Math.random();
  const n = r < (D.three || 0) ? 3 : (r < (D.three || 0) + D.two ? 2 : 1);
  const want = [];
  for (let k = 0; k < n; k++) {
    want.push(D.dishes[(Math.random() * D.dishes.length) | 0]);
  }
  return {
    id: ++guestSeq,
    seat,
    animal: ANIMALS[(Math.random() * ANIMALS.length) | 0],
    want,
    got: want.map(() => false),
    wait: D.wait * waitMul(),
    left: D.wait * waitMul(),
    inT: 0,
    outT: -1,
    paid: 0,
    mood: 1,
  };
}

function freeSeat() {
  for (let s = 0; s < G.D.seats; s++) {
    if (!G.guests.some((g) => g.seat === s && g.outT < 0)) return s;
  }
  return -1;
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.flashT = Math.max(0, G.flashT - dt);

  for (const p of G.pop) { p.t += dt; p.y -= dt * 26; }
  G.pop = G.pop.filter((p) => p.t < 1.3);

  if (G.over) {
    // お店を しめた あと、けっかへ
    G.t += dt;
    if (G.t > 2.0) { bgmStop(); G.screen = 'result'; }
    return;
  }

  G.t += dt;
  const D = G.D;
  const rest = D.len - G.t;
  bgmHeat(rest < 20 ? 1 : 0);
  if (!G.hurried && rest <= 10) { G.hurried = true; sfxHurry(); }

  // ── お客さんが 来る
  if (rest > 6) {
    G.nextIn -= dt;
    if (G.nextIn <= 0) {
      const s = freeSeat();
      if (s >= 0) {
        G.guests.push(newGuest(s));
        sfxBell();
        G.nextIn = D.every * (0.75 + Math.random() * 0.5);
      } else {
        G.nextIn = 0.6;      // いすが あくまで まつ
      }
    }
  }

  // ── お客さんの 待ち時間
  for (const g of G.guests) {
    g.inT += dt;
    if (g.outT >= 0) { g.outT += dt; continue; }
    g.left -= dt;
    g.mood = Math.max(0, g.left / g.wait);
    if (g.left <= 0) {
      g.outT = 0;
      g.angry = true;
      G.left++;
      sfxLeave();
      G.flash = 'おこって かえっちゃった…'; G.flashT = 1.4;
    }
  }
  G.guests = G.guests.filter((g) => g.outT < 1.2);

  // ── 作っている 料理
  for (const c of G.cooking) {
    c.t += dt;
    if (c.t >= c.time && !c.done) {
      c.done = true;
      if (G.counter.length < SLOTS) {
        G.counter.push({ key: c.key, t: 0 });
        sfxReady();
      } else {
        // カウンターが いっぱい。あふれた ぶんは まつ
        c.wait = true;
        c.t = c.time;
        c.done = false;
      }
    }
  }
  // いっぱいで まっていた ものを 出す
  for (const c of G.cooking) {
    if (c.wait && G.counter.length < SLOTS) {
      c.wait = false; c.done = true;
      G.counter.push({ key: c.key, t: 0 });
      sfxReady();
    }
  }
  G.cooking = G.cooking.filter((c) => !c.done);
  for (const q of G.counter) q.t += dt;

  // ── 店じまい
  if (G.t >= D.len && !G.over) closeShop();
}

function closeShop() {
  G.over = true;
  G.t = 0;
  G.win = G.money >= G.goal;
  const key = 'd' + G.day;
  if (G.win) {
    save.clear[G.day] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.money);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxDay(G.win);
}

// --- そうさ ---------------------------------------------------------------------

// 料理ボタンを おした
function cook(key) {
  if (G.screen !== 'play' || G.over) return;
  const d = dishOf(key);
  if (!d) return;
  // 作っている ぶん ＋ ならんでいる ぶんが いっぱいなら 作れない
  if (G.cooking.length + G.counter.length >= SLOTS) { sfxNo();
    G.flash = 'カウンターが いっぱい！'; G.flashT = 1.0; return; }
  G.cooking.push({ key, t: 0, time: d.time, done: false, wait: false });
  sfxCook();
}

// お客さんを タップ → わたせる ものを わたす
function serve(g) {
  if (G.screen !== 'play' || G.over || g.outT >= 0) return;
  let gave = 0;
  for (let k = 0; k < g.want.length; k++) {
    if (g.got[k]) continue;
    const idx = G.counter.findIndex((q) => q.key === g.want[k]);
    if (idx < 0) continue;
    G.counter.splice(idx, 1);
    g.got[k] = true;
    gave++;
  }
  if (!gave) { sfxNo(); return; }
  sfxServe(gave);
  if (g.got.every(Boolean)) {
    // お会計。まだ にこにこ なら チップ。
    let yen = 0;
    for (const k of g.want) yen += dishOf(k).yen;
    const tip = g.mood > 0.6 ? Math.round(yen * 0.3 / 10) * 10
              : g.mood > 0.35 ? Math.round(yen * 0.1 / 10) * 10 : 0;
    g.paid = yen + tip;
    G.money += g.paid;
    G.tips += tip;
    G.served++;
    g.outT = 0;
    G.pop.push({ x: 0, y: 0, seat: g.seat, yen: g.paid, tip, t: 0 });
    if (tip > 0) sfxTip();
  }
}

// あと どれくらいか（0〜1）
function dayLeft() { return Math.max(0, 1 - G.t / G.D.len); }
