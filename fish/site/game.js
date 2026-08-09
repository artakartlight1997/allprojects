// つりの ながれ。
//
//   なげる → まつ → うきが しずむ → あわせる → ひきあい → つれた／にげられた
//
// ★ 「ひきあい」は、上下に うごく さかなに 自分の ぼうを かさねると
//   ゲージが たまる しくみ。おしっぱなしで 上がり、はなすと 下がる。
//   ボタンが 1つだけ なので 小さい子でも すぐ わかる。

'use strict';

const SAVE_KEY = 'yui-fish-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      open: o.open || 1,           // どこまで 行ける か
      clear: o.clear || {},        // クリアした つりば
      zukan: o.zukan || {},        // { さかなの key: いちばん 大きかった cm }
      count: o.count || {},        // つった 数
      pt: o.pt || 0,               // ぜんぶの てんすう
    };
  } catch (e) {
    return { open: 1, clear: {}, zukan: {}, count: {}, pt: 0 };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function rodLevel() {
  const n = Object.keys(save.clear).length;
  return Math.min(RODS.length - 1, Math.floor(n / 3));
}

const G = {
  screen: 'title',   // title / howto / zukan / play / result
  spot: 0, S: null,
  phase: 'idle',     // idle=なげる前 / wait=まっている / bite=しずんだ / fight=ひきあい / got / miss
  t: 0,
  waitT: 0, biteT: 0,
  got: 0,            // この つりばで つった 数
  miss: 0,
  fish: null,        // いま かかって いる さかな
  cm: 0,
  fy: 0.5, fv: 0,    // さかなの ばしょと はやさ（0〜1）
  fTarget: 0.5, fT: 0,
  by: 0.5, bv: 0,    // ぼう（プレイヤー）
  hold: false,
  gauge: 0.35,
  msg: '', msgT: 0,
  splash: [],
  caught: null,      // 「つれた！」で 見せる さかな
  showT: 0,
  result: null,
  best: null,        // その回の いちばん
};

function startSpot(i) {
  G.spot = i;
  G.S = SPOTS[i];
  G.screen = 'play';
  G.phase = 'idle';
  G.got = 0; G.miss = 0;
  G.fish = null; G.caught = null; G.result = null; G.best = null;
  G.msg = ''; G.msgT = 0;
  G.splash.length = 0;
  say('画面を タップして なげよう');
  bgmStart(i);
}

function say(s) { G.msg = s; G.msgT = 2.6; }

function splash(x, y, n) {
  for (let i = 0; i < (n || 8); i++) {
    G.splash.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 160,
      vy: -60 - Math.random() * 120,
      t: 0, life: 0.5 + Math.random() * 0.4,
    });
  }
}

// --- どの さかなが かかるか -----------------------------------------------------

function pickFish() {
  const list = G.S.fish.slice();
  // ごみも たまに まざる
  if (Math.random() < 0.10) list.push(Math.random() < 0.5 ? 'boot' : 'can');
  let sum = 0;
  const w = list.map((k) => { sum += FISH_OF[k].rare; return sum; });
  const r = Math.random() * sum;
  for (let i = 0; i < list.length; i++) if (r <= w[i]) return FISH_OF[list[i]];
  return FISH_OF[list[0]];
}

function sizeOf(f) {
  // 大きさは 下ほど 出やすい（大物は うれしい）
  const k = Math.pow(Math.random(), 1.8);
  return Math.round(f.cm[0] + (f.cm[1] - f.cm[0]) * k);
}

// --- そうさ ---------------------------------------------------------------------

function press() {
  if (G.phase === 'idle') { cast(); return; }
  if (G.phase === 'wait') {
    // はやすぎ
    G.phase = 'idle';
    G.miss++;
    say('はやすぎ！ うきが しずんでから タップ');
    sfxNg();
    return;
  }
  if (G.phase === 'bite') { hook(); return; }
  if (G.phase === 'fight') { G.hold = true; return; }
  if (G.phase === 'got' || G.phase === 'miss') { G.phase = 'idle'; say('つぎを なげよう'); }
}

function release() { G.hold = false; }

function cast() {
  G.phase = 'wait';
  G.waitT = 0.9 + Math.random() * 3.2;
  splash(0, 0, 6);
  say('うきが しずむまで まとう…');
  sfxCast();
}

function hook() {
  const f = pickFish();
  G.fish = f;
  G.cm = sizeOf(f);
  G.phase = 'fight';
  G.fy = 0.5; G.fv = 0; G.fTarget = 0.5; G.fT = 0;
  G.by = 0.5; G.bv = 0; G.hold = false;
  G.gauge = 0.34;
  say(f.nushi ? 'なにか 大きいのが かかった！' : 'かかった！ ぼうを 重ねて！');
  sfxHook();
}

// --- ひきあい -------------------------------------------------------------------

function barH() { return RODS[rodLevel()].bar; }

function fightStep(dt) {
  const f = G.fish;
  // さかなの うごき：ときどき 行き先を 変えて そこへ 向かう
  G.fT -= dt;
  if (G.fT <= 0) {
    G.fT = 0.35 + Math.random() * 0.8 / f.move;
    G.fTarget = Math.random();
  }
  const acc = (G.fTarget - G.fy) * 5.5 * f.move;
  G.fv += acc * dt;
  G.fv *= Math.pow(0.02, dt);
  G.fy += G.fv * dt;
  if (G.fy < 0) { G.fy = 0; G.fv = 0; }
  if (G.fy > 1) { G.fy = 1; G.fv = 0; }

  // ぼう：おしっぱなしで 上がり、はなすと 下がる
  G.bv += (G.hold ? -1.35 : 1.15) * dt;
  G.bv *= Math.pow(0.06, dt);
  G.by += G.bv * dt;
  const h = barH();
  if (G.by < h / 2) { G.by = h / 2; G.bv = Math.max(0, G.bv); }
  if (G.by > 1 - h / 2) { G.by = 1 - h / 2; G.bv = Math.min(0, G.bv); }

  // 重なって いれば ゲージが たまる
  const on = Math.abs(G.fy - G.by) < h / 2;
  const speed = 0.42 / f.hp;
  G.gauge += (on ? speed : -speed * 0.62) * dt;
  if (on && Math.random() < dt * 6) splash(0, 0, 1);

  if (G.gauge >= 1) { land(); return; }
  if (G.gauge <= 0) { escaped(); return; }
}

function land() {
  const f = G.fish;
  G.phase = 'got';
  G.showT = 0;
  G.caught = { f: f, cm: G.cm };
  const pt = Math.round(f.pt * (0.7 + G.cm / f.cm[1] * 0.6));
  save.pt += pt;
  save.count[f.k] = (save.count[f.k] || 0) + 1;
  if (!save.zukan[f.k] || G.cm > save.zukan[f.k]) save.zukan[f.k] = G.cm;
  if (!f.junk) G.got++;
  if (!G.best || G.cm > G.best.cm) G.best = { f: f, cm: G.cm };
  storeSave();
  splash(0, 0, 16);
  if (f.nushi) sfxNushi(); else if (f.junk) sfxJunk(); else sfxGet();
  say(f.junk ? f.name + '…だった' : f.name + ' ' + G.cm + 'cm！ ' + pt + 'てん');

  if (G.got >= G.S.need) {
    save.clear[G.spot] = true;
    save.open = Math.max(save.open, Math.min(SPOTS.length, G.spot + 2));
    storeSave();
    G.result = { win: true, got: G.got, miss: G.miss, best: G.best };
  }
}

function escaped() {
  G.phase = 'miss';
  G.showT = 0;
  G.miss++;
  say('にげられた…');
  sfxNg();
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  for (let i = G.splash.length - 1; i >= 0; i--) {
    const s = G.splash[i];
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 420 * dt;
    if (s.t > s.life) G.splash.splice(i, 1);
  }

  if (G.screen !== 'play') { bgmPump(); return; }

  if (G.phase === 'wait') {
    G.waitT -= dt;
    if (G.waitT <= 0) {
      G.phase = 'bite';
      // ★ あわせられる 時間。小さい子は 手が おそいので、はじめの つりばは 長く。
      //   ここが みじかいと「1ぴきも つれない」に なって しまう。
      G.biteT = 1.80 - G.spot * 0.07;
      sfxBite();
      say('いまだ！ タップ！');
    }
  } else if (G.phase === 'bite') {
    G.biteT -= dt;
    if (G.biteT <= 0) {
      G.phase = 'idle';
      G.miss++;
      say('にげられた… つぎは はやく タップ');
      sfxNg();
    }
  } else if (G.phase === 'fight') {
    fightStep(dt);
    bgmHeat(1);
  } else if (G.phase === 'got' || G.phase === 'miss') {
    G.showT += dt;
    if (G.showT > 1.9) {
      if (G.result) { G.screen = 'result'; bgmStop(); sfxClear(G.miss === 0); }
      else { G.phase = 'idle'; say('つぎを なげよう'); }
    }
  }
  if (G.phase !== 'fight') bgmHeat(0);
  bgmPump();
}
