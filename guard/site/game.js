// ぼうえいの ルール。
//
// てきは みちの まん中を つないだ 線の 上を すすむ。
// 「あと どれだけ すすんだか（u）」だけ もっていれば、
//   ・いま どこに いるか
//   ・どの てきが いちばん 先に いるか（＝ねらう べき てき）
//   ・きちに ついたか
// が ぜんぶ 出せる。ますを 1つずつ たどる 必要は ない。

'use strict';

const SAVE_KEY = 'guard.v1';

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
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}
// 3回 まけると おかねと ライフが ふえる（3だんかい）
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function yenBonus() { return 1 + assistLevel(G.stage) * 0.20; }
function lifeBonus() { return assistLevel(G.stage) * 4; }

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  path: [],       // みちの マス
  onPath: null,   // その マスが みちか
  foes: [],
  towers: [],     // { c, r, k, lv, cool, ang }
  shots: [],
  booms: [],
  yen: 0,
  life: 0,
  wave: 0,        // いま 何なみ目（0 から）
  spawn: [],      // これから 出す てき
  waveOn: false,
  restT: 0,       // つぎの なみ までの 時間
  t: 0,
  over: false, win: false,
  sel: null,      // えらんだ とう
  pick: null,     // これから おく とうの しゅるい
  flash: '', flashT: 0,
  speed: 1,
};

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.path = MAPS[G.S.map];
  G.onPath = [];
  for (let r = 0; r < GH; r++) G.onPath.push(new Array(GW).fill(false));
  for (const [c, r] of G.path) {
    if (r >= 0 && r < GH && c >= 0 && c < GW) G.onPath[r][c] = true;
  }
  G.foes = []; G.towers = []; G.shots = []; G.booms = [];
  G.yen = Math.round(G.S.yen * yenBonus());
  G.life = G.S.life + lifeBonus();
  G.wave = 0;
  G.spawn = [];
  G.waveOn = false;
  G.restT = 6;
  G.t = 0;
  G.over = false; G.win = false;
  G.sel = null; G.pick = null;
  G.flash = ''; G.flashT = 0;
  G.speed = 1;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

// みちの う（0〜1）から じっさいの ばしょ
function atU(u) {
  const n = G.path.length - 1;
  const f = Math.max(0, Math.min(n, u * n));
  const i = Math.min(n - 1, Math.floor(f));
  const s = f - i;
  const a = G.path[i], b = G.path[i + 1];
  return { c: a[0] + (b[0] - a[0]) * s, r: a[1] + (b[1] - a[1]) * s };
}

// 1マスすすむ のに かかる う
function uPerCell() { return 1 / (G.path.length - 1); }

// --- なみ ------------------------------------------------------------------------

function beginWave() {
  const w = G.S.waves[G.wave];
  G.spawn = [];
  let hasBoss = false;
  for (const part of w) {
    for (let k = 0; k < part.n; k++) {
      G.spawn.push({ f: part.f, at: k * part.gap + (part.f === 'boss' ? 0.5 : 0) });
      if (part.f === 'boss') hasBoss = true;
    }
  }
  G.spawn.sort((a, b) => a.at - b.at);
  G.waveOn = true;
  G.t = 0;
  if (hasBoss) sfxBoss(); else sfxWave(G.wave);
  bgmHeat(hasBoss ? 1 : 0);
}

function newFoe(k) {
  const F = FOES[k];
  // なみが すすむ ほど 少し つよく なる（同じ なみの くりかえしを ふせぐ）
  const up = 1 + G.wave * 0.07;
  return { k, hp: F.hp * up, max: F.hp * up, u: 0, slow: 0, dead: false, hitT: 0 };
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt0) {
  if (G.screen !== 'play') return;
  bgmPump();
  const dt = dt0 * G.speed;
  G.flashT = Math.max(0, G.flashT - dt0);

  if (G.over) {
    G.t += dt0;
    if (G.t > 1.8) { bgmStop(); G.screen = 'result'; }
    return;
  }

  G.t += dt;

  // ── なみの あいだ
  if (!G.waveOn) {
    G.restT -= dt;
    if (G.restT <= 0) beginWave();
  } else {
    // ── てきを 出す
    while (G.spawn.length && G.spawn[0].at <= G.t) {
      G.foes.push(newFoe(G.spawn.shift().f));
    }
  }

  // ── てきが すすむ
  const up = uPerCell();
  for (const f of G.foes) {
    if (f.dead) continue;
    f.hitT = Math.max(0, f.hitT - dt);
    const sl = f.slow > 0 ? (1 - f.slow) : 1;
    f.slow = Math.max(0, f.slow - dt * 0.55);
    f.u += FOES[f.k].spd * sl * up * dt;
    if (f.u >= 1) {
      f.dead = true;
      G.life -= FOES[f.k].dmg;
      sfxLeak();
      G.flash = 'きちに 入られた！'; G.flashT = 1.2;
      if (G.life <= 0) { G.life = 0; finish(false); return; }
    }
  }

  // ── とうが うつ
  for (const t of G.towers) {
    t.cool -= dt;
    if (t.cool > 0) continue;
    const T = TOWERS[t.k];
    const rng = tRange(t);
    // いちばん 先に いる てきを ねらう（きちに ちかい ほど あぶない）
    let best = null, bu = -1;
    for (const f of G.foes) {
      if (f.dead) continue;
      if (FOES[f.k].air && !T.air) continue;
      const p = atU(f.u);
      const d = Math.hypot(p.c - t.c, p.r - t.r);
      if (d > rng) continue;
      if (f.u > bu) { bu = f.u; best = f; }
    }
    if (!best) continue;
    t.cool = tRate(t);
    const p = atU(best.u);
    t.ang = Math.atan2(p.r - t.r, p.c - t.c);
    G.shots.push({ x: t.c, y: t.r, tx: p.c, ty: p.r, t: 0, k: t.k, tw: t, foe: best });
    sfxShot(t.k);
  }

  // ── たまが とぶ
  for (const s of G.shots) {
    s.t += dt * (s.k === 'laser' ? 9 : 6);
    if (s.t >= 1) {
      s.done = true;
      hit(s.tw, s.foe, s.tx, s.ty);
    }
  }
  G.shots = G.shots.filter((s) => !s.done);
  for (const b of G.booms) b.t += dt;
  G.booms = G.booms.filter((b) => b.t < 0.34);

  // ── たおれた てきを かたづける
  const alive = [];
  for (const f of G.foes) {
    if (f.dead && f.hp > 0) continue;      // きちに 入った
    if (f.hp <= 0 && !f.paid) {
      f.paid = true;
      G.yen += Math.round(FOES[f.k].yen * (1 + G.wave * 0.05));
      sfxDie();
      continue;
    }
    if (!f.dead) alive.push(f);
  }
  G.foes = alive;

  // ── なみが おわったか
  if (G.waveOn && !G.spawn.length && !G.foes.length) {
    G.waveOn = false;
    G.wave++;
    bgmHeat(0);
    if (G.wave >= G.S.waves.length) { finish(true); return; }
    G.restT = 8;
    G.yen += 40 + G.wave * 10;      // なみを しのいだ ごほうび
  }
}

function hit(tw, foe, tx, ty) {
  const T = TOWERS[tw.k];
  const dm = tDmg(tw);
  if (T.splash) {
    G.booms.push({ x: tx, y: ty, r: T.splash, t: 0 });
    sfxBoom();
    for (const f of G.foes) {
      if (f.dead || f.hp <= 0) continue;
      if (FOES[f.k].air && !T.air) continue;
      const p = atU(f.u);
      const d = Math.hypot(p.c - tx, p.r - ty);
      if (d > T.splash) continue;
      f.hp -= dm * (d < T.splash * 0.5 ? 1 : 0.6);
      f.hitT = 0.12;
    }
    return;
  }
  if (!foe || foe.dead || foe.hp <= 0) return;
  foe.hp -= dm;
  foe.hitT = 0.12;
  if (T.slow) foe.slow = Math.max(foe.slow, T.slow);
}

// --- そうさ ---------------------------------------------------------------------

function canPlace(c, r) {
  if (c < 0 || r < 0 || c >= GW || r >= GH) return false;
  if (G.onPath[r][c]) return false;
  return !G.towers.some((t) => t.c === c && t.r === r);
}

function place(c, r, k) {
  if (G.over) return false;
  if (!canPlace(c, r)) { sfxNo(); G.flash = 'そこには おけないよ'; G.flashT = 1.0; return false; }
  const cost = TOWERS[k].cost;
  if (G.yen < cost) { sfxNo(); G.flash = 'おかねが たりない'; G.flashT = 1.0; return false; }
  G.yen -= cost;
  G.towers.push({ c, r, k, lv: 1, cool: 0, ang: 0 });
  sfxPlace();
  return true;
}

function upgrade(t) {
  if (G.over || !t) return false;
  if (t.lv >= 3) { sfxNo(); G.flash = 'もう いちばん つよいよ'; G.flashT = 1.0; return false; }
  const c = upCost(t);
  if (G.yen < c) { sfxNo(); G.flash = 'おかねが たりない'; G.flashT = 1.0; return false; }
  G.yen -= c;
  t.lv++;
  sfxUp();
  return true;
}

// つぎの なみを 早く よぶ（早いほど ごほうびが 多い）
function callNow() {
  if (G.over || G.waveOn) return;
  G.yen += Math.round(G.restT * 6);
  G.restT = 0;
}

function finish(win) {
  if (G.over) return;
  G.over = true;
  G.win = win;
  G.t = 0;
  const key = 's' + G.stage;
  if (win) {
    save.clear[G.stage] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.life);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  bgmHeat(0);
  sfxEnd(win);
}

function waveText() {
  return Math.min(G.S.waves.length, G.wave + 1) + ' / ' + G.S.waves.length;
}
