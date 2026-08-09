// カエルわたりの なかみ。
//
// ★ 車や 丸太は「x が 小数の 帯」。左右に ずっと 流れつづける。
//   画面の 外に 出たら、反対がわに もどして くりかえし つかう。
// ★ カエルは ますに 乗って いる が、丸太の 上に いる ときは
//   丸太と いっしょに 小数で ながされる。だから x は 小数で 持つ。

'use strict';

const SAVE_KEY = 'aoi-frog-v1';

const save = loadSave();

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return { hi: o.hi || 0, open: o.open || 1, clear: o.clear || {} };
  } catch (e) {
    return { hi: 0, open: 1, clear: {} };
  }
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const G = {
  screen: 'title',
  stage: 0, S: null,
  lanes: [],          // y ごとの 帯（y=1〜5 川 / y=7〜11 道）
  HOMES: [],          // この めんで つかう おうちの x
  frog: null,
  homes: [],          // うまった おうち
  lives: LIVES,
  score: 0,
  left: 0,            // のこり じかん
  best: 0,            // その回に いちばん 上まで 行った y
  over: false, win: false,
  dead: 0, deadKind: '',
  msg: '', msgT: 0,
  t: 0,
  ready: 0,
};

function startStage(i) {
  G.stage = i;
  G.S = STAGES[i];
  buildLanes();
  G.HOMES = HOME_SETS[G.S.homes];
  G.homes = G.HOMES.map(() => false);
  G.lives = LIVES;
  G.score = 0;
  G.over = false; G.win = false;
  G.screen = 'play';
  newFrog();
  bgmStart(i);
  say('おうちを ' + G.HOMES.length + 'つ うめよう！');
}

function buildLanes() {
  G.lanes = [];
  for (let y = 0; y < FH; y++) G.lanes.push(null);
  for (let j = 0; j < 5; j++) {
    const r = G.S.river[j];
    G.lanes[1 + j] = makeLane(r, 'river');
    const c = G.S.road[j];
    G.lanes[7 + j] = makeLane(c, 'road');
  }
}

function makeLane(cfg, zone) {
  const items = [];
  const period = cfg.len + cfg.gap;
  const n = Math.ceil((FW + period * 2) / period);
  for (let i = 0; i < n; i++) {
    items.push({ x: i * period - cfg.len, w: cfg.len, kind: cfg.kind,
                 look: (i * 3) % CARS.length, sink: 0, phase: Math.random() * 6 });
  }
  return { sp: cfg.sp, zone: zone, kind: cfg.kind, items: items, span: n * period };
}

function newFrog() {
  G.frog = { x: (FW / 2) | 0, y: FH - 1, hop: 0, dir: 0 };
  G.left = G.S.sec;
  G.best = FH - 1;
  G.ready = 0.7;
  G.dead = 0; G.deadKind = '';
}

function say(s) { G.msg = s; G.msgT = 2.2; }

// --- そうさ ---------------------------------------------------------------------

function hop(dx, dy) {
  if (G.screen !== 'play' || G.over || G.dead > 0 || G.ready > 0) return;
  const f = G.frog;
  const nx = Math.round(f.x) + dx, ny = f.y + dy;
  if (nx < 0 || nx >= FW) return;
  if (ny < 0 || ny >= FH) return;
  if (ny === 0) {
    // おうちの ならびだけ 入れる
    const hi = G.HOMES.indexOf(nx);
    if (hi < 0) { sfxNg(); return; }
    if (G.homes[hi]) { sfxNg(); say('そこは もう いっぱい'); return; }
    f.x = nx; f.y = 0;
    enterHome(hi);
    return;
  }
  f.x = nx; f.y = ny;
  f.hop = 0.14;
  f.dir = dy < 0 ? 0 : dy > 0 ? 2 : (dx > 0 ? 1 : 3);
  if (ny < G.best) { G.best = ny; G.score += 10; }
  sfxHop();
  checkNow();
}

function enterHome(hi) {
  G.homes[hi] = true;
  const bonus = Math.max(0, Math.round(G.left) * 5);
  G.score += 100 + bonus;
  sfxHome();
  say('おうちに 入った！ ボーナス ' + bonus);
  if (G.homes.every((h) => h)) {
    G.over = true; G.win = true;
    save.clear[G.stage] = true;
    save.open = Math.max(save.open, Math.min(STAGES.length, G.stage + 2));
    save.hi = Math.max(save.hi, G.score);
    storeSave();
    bgmStop();
    sfxClear(true);
    return;
  }
  newFrog();
}

// --- はんてい ---------------------------------------------------------------------

// その 帯の うえに 乗って いる ものを かえす
function rideAt(y, x) {
  const L = G.lanes[y];
  if (!L) return null;
  for (const it of L.items) {
    if (it.sink > 1) continue;                    // しずんで いる カメ
    if (x + 0.5 >= it.x && x + 0.5 <= it.x + it.w) return it;
  }
  return null;
}

function checkNow() {
  const f = G.frog;
  if (G.dead > 0 || G.over) return;
  const y = f.y;
  if (y >= 7 && y <= 11) {
    const hit = rideAt(y, f.x);
    if (hit) { die('car'); return; }
  } else if (y >= 1 && y <= 5) {
    const on = rideAt(y, f.x);
    if (!on) { die('water'); return; }
  }
}

function die(kind) {
  G.dead = 1.2;
  G.deadKind = kind;
  G.lives--;
  bgmStop();
  sfxDead(kind);
  say(kind === 'car' ? '車に あたった！' : kind === 'time' ? '時間ぎれ！' : '川に おちた！');
  if (G.lives <= 0) {
    G.over = true; G.win = false;
    save.hi = Math.max(save.hi, G.score);
    storeSave();
  }
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.screen !== 'play') { bgmPump(); return; }

  // 帯は いつでも 流れる（やられて いる あいだも）
  for (let y = 0; y < FH; y++) {
    const L = G.lanes[y];
    if (!L) continue;
    for (const it of L.items) {
      it.x += L.sp * dt;
      if (L.sp > 0 && it.x > FW + 1) it.x -= L.span;
      if (L.sp < 0 && it.x + it.w < -1) it.x += L.span;
      if (it.kind === 'turtle' && G.S.sink) {
        // ★ カメは 6びょう しゅうきで しずむ（2びょうだけ 消える）
        // ★ しずむ 前に「もぐりかけ」を 1.4びょう 見せる。
        //   いきなり 消えると 何が おきたか 分からない。
        it.phase += dt;
        const p = it.phase % 6;
        it.sink = p > 4.8 ? 2 : p > 3.4 ? 1 : 0;
      }
    }
  }

  if (G.over) { bgmPump(); return; }
  if (G.dead > 0) {
    G.dead -= dt;
    if (G.dead <= 0 && !G.over) newFrog();
    bgmPump();
    return;
  }
  if (G.ready > 0) { G.ready -= dt; bgmPump(); return; }

  const f = G.frog;
  if (f.hop > 0) f.hop -= dt;

  // 丸太の 上なら いっしょに ながれる
  if (f.y >= 1 && f.y <= 5) {
    const on = rideAt(f.y, f.x);
    if (on) {
      const L = G.lanes[f.y];
      f.x += L.sp * dt;
      // ★ はしまで ながされても すぐには 落とさない。ばんめんの 中に とどめる。
      //   （本家は アウトだが、小さい子には きびしすぎる。
      //     丸太が 先へ 行って しまえば けっきょく 川に おちるので、
      //     「はやく つぎへ うつる」たいせつさは のこる）
      if (f.x < 0) f.x = 0;
      if (f.x > FW - 1) f.x = FW - 1;
    } else { die('water'); return; }
  } else if (f.y >= 7 && f.y <= 11) {
    if (rideAt(f.y, f.x)) { die('car'); return; }
  }

  G.left -= dt;
  if (G.left <= 0) { die('time'); return; }

  bgmHeat(G.left < 8 ? 1 : 0);
  bgmPump();
}
