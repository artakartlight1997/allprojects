// ゲームの すすめかた。ミニゲームを つぎつぎ 出して いく 司会の やくわり。

'use strict';

const G = {
  screen: 'title',
  t: 0,
  // 1回の あそび
  n: 0,             // 何本 やったか
  clears: 0,        // 何本 クリアしたか
  score: 0,
  level: 0,
  alive: [true, true, true, true],
  // いまの ミニゲーム
  M: null,          // ミニゲームの ていぎ
  g: null,          // その 中みの じょうたい
  P: { lv: 0, spd: 1 },
  time: 0, timeMax: 0,
  phase: '',        // 'call' | 'play' | 'judge' | 'speed' | 'boss'
  phaseT: 0,
  lastOk: false,
  lastKey: '',
  hostK: 0,
  over: false,
  msg: '',
};

function levelPack() {
  const L = LEVELS[Math.min(G.level, LEVELS.length - 1)];
  return { lv: L.lv, spd: L.spd, sec: L.sec };
}

function aliveCount() { return G.alive.filter((a) => a).length; }

function startRun() {
  G.n = 0; G.clears = 0; G.score = 0; G.level = 0;
  G.alive = [true, true, true, true];
  G.over = false; G.msg = '';
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(0);
  nextMicro();
}

function pickMicro() {
  const boss = ((G.n + 1) % BOSS_EVERY) === 0;
  if (boss) return mBoss;
  let m = null;
  for (let i = 0; i < 12; i++) {
    m = MICRO[Math.floor(Math.random() * MICRO.length)];
    if (m.key !== G.lastKey) break;
  }
  return m;
}

function nextMicro() {
  const L = levelPack();
  G.M = pickMicro();
  G.lastKey = G.M.key;
  G.P = { lv: L.lv, spd: L.spd };
  G.g = {};
  G.M.init(G.g, G.P);
  G.timeMax = G.M.boss ? 13 : L.sec;
  G.time = G.timeMax;
  G.hostK = G.M.boss ? 0 : G.M.host;
  G.phase = 'call';
  G.phaseT = G.M.boss ? 1.5 : 0.85;
  if (G.M.boss) sfxBoss(); else sfxCall();
}

function finishMicro(ok) {
  G.phase = 'judge';
  G.phaseT = ok ? 0.6 : 0.9;
  G.lastOk = ok;
  G.n++;
  if (ok) {
    G.clears++;
    G.score += (G.M.boss ? 1000 : 100) * (G.level + 1);
    if (G.M.boss) sfxBossDown(); else sfxWin();
  } else {
    // うしろの 子から 1人 ぬける
    for (let i = G.alive.length - 1; i >= 0; i--) {
      if (G.alive[i]) { G.alive[i] = false; G.msg = KIDS[i].name + ' が こうたい！'; break; }
    }
    sfxMiss();
  }
}

function afterJudge() {
  if (aliveCount() <= 0) {
    G.over = true;
    G.screen = 'over';
    bgmStop();
    sfxOver();
    if (G.score > save.hi) save.hi = G.score;
    if (G.clears > save.best) save.best = G.clears;
    storeSave();
    return;
  }
  if (G.clears > 0 && G.clears % UP_EVERY === 0 && G.clears / UP_EVERY > G.level) {
    G.level = Math.min(LEVELS.length - 1, G.clears / UP_EVERY);
    G.phase = 'speed';
    G.phaseT = 1.1;
    bgmHeat(Math.min(1, G.level / 4));
    sfxSpeed();
    return;
  }
  nextMicro();
}

function update(dt) {
  G.t += dt;
  bgmPump();
  if (G.screen !== 'play') return;

  if (G.phase === 'call') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) { G.phase = 'play'; IN.taps.length = 0; }
    return;
  }
  if (G.phase === 'judge') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) afterJudge();
    return;
  }
  if (G.phase === 'speed') {
    G.phaseT -= dt;
    if (G.phaseT <= 0) nextMicro();
    return;
  }

  // あそんで いる さいちゅう
  G.M.update(G.g, dt, IN, G.P);
  if (G.g.ok) { finishMicro(true); return; }
  if (G.g.ng) { finishMicro(false); return; }
  G.time -= dt;
  if (G.time <= 0) finishMicro(G.M.mode === 'survive');
}
