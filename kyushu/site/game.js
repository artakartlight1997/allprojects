// あそびの すすみかた。
//
// ★ まちがえても へらない。「もう一回 やって みて」で 何回でも やりなおせる。
//   おぼえる ための ゲームなので、まちがいを ばつに しない。
//   そのかわり「1回で できたか」を 星で のこす。

'use strict';

const SAVE_KEY = 'kyushu.v1';

const save = { clear: [], star: {}, best: {}, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.star && typeof o.star === 'object') save.star = o.star;
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function opened(i) { return i === 0 || !!save.clear[i - 1]; }

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  list: [],        // つかう 県
  placed: [],      // はめ おわった key
  bag: [],         // まだ はめて いない key
  hold: null,      // ひっぱっている かけら
  ask: null,       // 「どこ？」と きかれている 県
  miss: 0,
  t: 0,
  left: 0,
  over: false, win: false, endT: 0,
  flash: '', flashT: 0, flashCol: '#FFFFFF',
  shake: null,
  glow: null, glowT: 0,
};

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.list = PREFS.slice(0, G.S.use);
  G.placed = [];
  G.bag = [];
  G.hold = null;
  G.ask = null;
  G.miss = 0;
  G.t = 0;
  G.left = G.S.sec || 0;
  G.over = false; G.win = false;
  G.endT = 0;
  G.flash = ''; G.flashT = 0;
  G.glow = null; G.glowT = 0;
  G.askDone = [];

  const m = G.S.mode;
  if (m === 'fit' || m === 'fit2' || m === 'time') {
    G.bag = shuffled(G.list.map((p) => p.key));
  } else {
    // learn / name … ぜんぶ はめた ところから はじめて、名まえを きく
    G.placed = G.list.map((p) => p.key);
    nextAsk();
  }
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

function shuffled(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = b[i]; b[i] = b[j]; b[j] = t;
  }
  return b;
}

function prefOf(k) { return PREFS.find((p) => p.key === k); }

// つぎに きく 県を きめる（まだ きいて いない ものから）
function nextAsk() {
  const done = G.askDone || (G.askDone = []);
  const rest = G.list.filter((p) => done.indexOf(p.key) < 0);
  if (!rest.length) { finish(true); return; }
  G.ask = rest[(Math.random() * rest.length) | 0];
}

// --- はめる ---------------------------------------------------------------------

function takePiece(k) {
  if (G.over) return;
  if (G.bag.indexOf(k) < 0) return;
  G.hold = { k, x: 0, y: 0 };
  sfxTake();
}

// はなした ところが 正しい ばしょか
function dropAt(mx, my) {
  if (!G.hold) return;
  const p = prefOf(G.hold.k);
  const k = G.hold.k;
  G.hold = null;
  // ★ 形の中でなくても 目じるしの 近くなら はまる（細い半島でも 置ける）
  if (nearPref(p, mx, my)) {
    G.bag = G.bag.filter((q) => q !== k);
    G.placed.push(k);
    G.glow = k; G.glowT = 0.7;
    sfxFit();
    say(p.name + 'けん！ ' + p.about, '#A8F0B0');
    if (!G.bag.length) finish(true);
  } else {
    G.miss++;
    sfxMiss();
    // どこが 正しいか 少しだけ 教える（おぼえる ための ゲームなので）
    const c = centroid(p);
    G.shake = { k, t: 0 };
    say(p.name + 'けんは ' + hintWord(c) + ' だよ', '#FFC0C0');
  }
}

function hintWord(c) {
  const B = bounds(PREFS.slice(0, 7));
  const fx = (c.x - B.x0) / (B.x1 - B.x0);
  const fy = (c.y - B.y0) / (B.y1 - B.y0);
  const ns = fy < 0.30 ? '北' : fy > 0.62 ? '南' : 'まん中';
  const ew = fx < 0.36 ? '西' : fx > 0.62 ? '東' : '';
  return ns + (ew ? 'の' + ew : 'のほう');
}

// --- 名まえ あて -----------------------------------------------------------------

function tapMap(mx, my) {
  if (G.over || !G.ask) return;
  const hit = G.list.find((p) => G.placed.indexOf(p.key) >= 0 && hitPref(p, mx, my));
  if (!hit) return;
  if (hit.key === G.ask.key) {
    G.askDone.push(hit.key);
    G.glow = hit.key; G.glowT = 0.7;
    sfxRight();
    say('せいかい！ ' + hit.name + 'けん。' + hit.about, '#A8F0B0');
    nextAsk();
  } else {
    G.miss++;
    sfxWrong();
    G.shake = { k: hit.key, t: 0 };
    say('そこは ' + hit.name + 'けん。' + G.ask.name + 'は ' +
        hintWord(centroid(G.ask)) + ' だよ', '#FFC0C0');
  }
}

function say(s, col) {
  G.flash = s; G.flashT = 3.0; G.flashCol = col || '#FFFFFF';
}

// --- おわり ---------------------------------------------------------------------

function finish(win) {
  if (G.over) return;
  G.over = true;
  G.win = win;
  const key = 's' + G.stage;
  if (win) {
    save.clear[G.stage] = true;
    // 星は まちがえた 数で きまる（0まちがい で 3つ）
    const st = G.miss === 0 ? 3 : G.miss <= 2 ? 2 : 1;
    save.star[key] = Math.max(save.star[key] || 0, st);
    if (G.S.sec) {
      const used = Math.round((G.S.sec - G.left) * 10) / 10;
      if (!save.best[key] || used < save.best[key]) save.best[key] = used;
    }
    sfxClear(G.miss === 0);
  }
  storeSave();
  bgmStop();
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.t += dt;
  G.flashT = Math.max(0, G.flashT - dt);
  G.glowT = Math.max(0, G.glowT - dt);
  if (G.shake) { G.shake.t += dt; if (G.shake.t > 0.5) G.shake = null; }

  if (G.over) {
    // ★ G.t は「はじめてからの 時間」なので、これで はかると
    //   おわった しゅんかんに もう 1.4 を こえていて、けっかへ すぐ とんで しまう。
    G.endT += dt;
    if (G.endT > 1.4) G.screen = 'result';
    return;
  }
  if (G.S.sec) {
    const was = Math.ceil(G.left);
    G.left -= dt;
    if (G.left <= 10 && Math.ceil(G.left) !== was) sfxTick();
    bgmHeat(G.left < 15 ? 1 : 0);
    if (G.left <= 0) { G.left = 0; finish(false); }
  }
}

function starOf(i) { return save.star['s' + i] || 0; }
