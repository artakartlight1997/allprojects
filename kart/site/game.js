// カートの うごきと レースの すすみかた。
//
// ★ そうさは 「左を おす／右を おす」だけ。アクセルは じどう。
//   小さい子でも すぐ 走れる ように、ブレーキも ギアも 出さない。
//
// ★ ドリフト：同じ むきに ずっと まがっていると 火花が たまって、
//   ゆびを はなした しゅんかんに ダッシュ。
//   「ずっと おしっぱなし」でも 走れるが、じょうずに はなすと はやい。

'use strict';

const SAVE_KEY = 'kart.v1';

const save = { clear: [], best: {}, diff: 1, fails: {}, who: 0, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (Number.isFinite(o.diff)) save.diff = Math.max(0, Math.min(2, o.diff | 0));
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (Number.isFinite(o.who)) save.who = o.who | 0;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

// あそべる コースは「クリアした つぎまで」。
// 3回 まけたら つぎも あけて、つまずいた ままに ならない ように する。
function opened(i) {
  if (i === 0) return true;
  if (save.clear[i - 1]) return true;
  return (save.fails['s' + (i - 1)] || 0) >= 3;
}

const DIFFS = [
  { key: 'e', name: 'やさしい', col: '#A8E0A8', ai: 0.82, cv: 0.55, item: 0.7, band: 0.55,
    about: 'はじめてでも 3いに なれる' },
  { key: 'n', name: 'ふつう',   col: '#8FD6FF', ai: 0.99, cv: 0.38, item: 1.0, band: 0.26,
    about: 'ちょうど よい つよさ' },
  { key: 'h', name: 'つよい',   col: '#FF9C5A', ai: 1.14, cv: 0.22, item: 1.6, band: 0.02,
    about: 'ぬかれたら もう 追いつけない' },
];
function diffNow() { return DIFFS[Math.max(0, Math.min(2, save.diff | 0))]; }

// --- カートの もちぬし ------------------------------------------------------------

const DRIVERS = [
  { key: 'masaki', name: 'まさき', col: '#4A9CE8', top: 1.00, acc: 1.00, grip: 1.00 },
  { key: 'rina',   name: 'りな',   col: '#FF6A8A', top: 0.97, acc: 1.06, grip: 1.05 },
  { key: 'aoi',    name: 'あおい', col: '#5AC87A', top: 0.98, acc: 1.03, grip: 1.03 },
  { key: 'papa',   name: 'パパ',   col: '#FFB03A', top: 1.04, acc: 0.94, grip: 0.94 },
  { key: 'mama',   name: 'ママ',   col: '#C86AA8', top: 1.01, acc: 0.99, grip: 1.01 },
];

// --- はしる ちから ---------------------------------------------------------------

const MAXS = 300;        // 道の 上での さいこう そくど
const ACC = 250;         // かそく
const BRK = 420;         // はやすぎる ときに もどる 力
const TURN = 2.45;       // まがる はやさ（ラジアン/びょう）
const GRASS = 0.54;      // 草の 上での さいこう そくど（わりあい）
const POOL = 0.62;       // みずたまりの 上
const BOOST = 1.48;      // ダッシュ中の さいこう そくど
const BOOST_T = 1.25;    // ダッシュの ながさ
const PAD_T = 0.9;       // かそくパッドの ながさ
const SPIN_T = 1.05;     // ぶつかって くるくる まわる 時間
const R = 16;            // カートの 大きさ

const G = {
  screen: 'title',
  stage: 0,
  T: null,
  karts: [],
  me: 0,
  t: 0,
  phase: 'count',   // count → race → done
  ph: 0,
  bananas: [],
  shells: [],
  order: [],
  finished: 0,
  place: -1,
  best: false,
  shake: 0,
};

function newKart(i, isMe, drv) {
  return {
    i, isMe, drv,
    x: 0, y: 0, ang: 0, spd: 0,
    slide: 0,          // よこすべり（見た目と ドリフトに つかう）
    hint: 0, u: 0, lap: 0, prevU: 0, done: false, doneT: 0,
    steer: 0, lastSteer: 0, driftT: 0, driftDir: 0,
    boostT: 0, spinT: 0, item: 0, itemT: 0,
    grassT: 0, onGrass: false, place: 1,
    // CPU 用
    aiOff: 0, aiOffT: 0, aiUseT: 0,
  };
}

function startStage(i) {
  audioStart();
  engStart();
  G.stage = Math.max(0, Math.min(COURSES.length - 1, i));
  G.T = buildTrack(COURSES[G.stage]);
  G.karts = [];
  G.bananas = [];
  G.shells = [];
  G.finished = 0;
  G.place = -1;
  G.best = false;
  G.shake = 0;
  G.phase = 'count';
  G.ph = 0;
  G.t = 0;

  // スタートの ならびかた。まん中の 線の 上に よこ 2れつ。
  const others = DRIVERS.filter((d, k) => k !== (save.who | 0));
  for (let k = 0; k < 4; k++) {
    const drv = k === 0 ? DRIVERS[save.who | 0] : others[(k - 1) % others.length];
    const f = newKart(k, k === 0, drv);
    const u = -0.010 - Math.floor(k / 2) * 0.0085;
    const p = mk(G.T, u, (k % 2 === 0 ? -1 : 1) * G.T.hw * 0.42, 0);
    f.x = p.x; f.y = p.y;
    const q = mk(G.T, u + 0.004, 0, 0);
    f.ang = Math.atan2(q.y - p.y, q.x - p.x);
    const near = nearestOn(G.T, f.x, f.y);
    f.hint = near.i; f.u = near.u; f.prevU = near.u;
    // ★ スタート位置は ゴール線の **てまえ**（u が 0.99 あたり）。
    //   すぐに 線を こえるので、そこで lap が 0 に なる ように -1 から はじめる。
    //   0 から はじめると 1しゅう目を ただで もらって しまい、
    //   「3しゅう」と 書いてあるのに 2しゅうで おわる。
    f.lap = -1;
    G.karts.push(f);
  }
  G.me = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.ph += dt;
  G.shake = Math.max(0, G.shake - dt * 3);

  if (G.phase === 'count') {
    const was = Math.ceil(3.2 - (G.ph - dt));
    const now = Math.ceil(3.2 - G.ph);
    if (now !== was && now >= 0 && now <= 3) sfxCount(now);
    if (G.ph >= 3.2) { G.phase = 'race'; G.ph = 0; }
    // カウント中は うごかない。エンジンだけ ふかす。
    engSet(G.ph / 3.2 * 0.5, 0, true);
    return;
  }

  if (G.phase === 'race') G.t += dt;

  for (const f of G.karts) {
    if (f.done) { f.spd *= Math.max(0, 1 - dt * 1.6); moveKart(f, dt); continue; }
    if (f.isMe) driveMe(f, dt); else driveAI(f, dt);
    moveKart(f, dt);
    lapCheck(f);
  }
  hitEachOther();
  updateShells(dt);
  rankAll();

  const me = G.karts[G.me];
  engSet(Math.min(1, me.spd / (MAXS * BOOST)), Math.min(1, Math.abs(me.slide) / 120 + (me.onGrass ? 0.5 : 0)),
         !me.done);
  bgmHeat(me.lap >= G.T.laps - 1 ? 1 : 0);

  if (G.phase === 'race' && me.done) { G.phase = 'done'; G.ph = 0; endRace(); }
  if (G.phase === 'done' && G.ph > 2.2 && G.screen === 'play') {
    bgmStop(); engStop();
    G.screen = 'result';
  }
}

// --- 人の そうさ -----------------------------------------------------------------

function driveMe(f, dt) {
  f.steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (G.phase !== 'race') { f.steer = 0; return; }
  if (input.useItem) { input.useItem = false; useItem(f); }
}

// --- CPU -------------------------------------------------------------------------
//
// ★ CPU も 人と 同じ しくみで 走る（steer を きめて moveKart に わたす だけ）。
//   ワープさせたり、レールの 上を すべらせたり しない。

function driveAI(f, dt) {
  if (G.phase !== 'race') { f.steer = 0; return; }
  const T = G.T, D = diffNow();
  const skill = D.ai * (1 - f.i * 0.035);       // うしろの CPU ほど 少し よわい

  // ときどき ねらう ばしょを ずらす（ぴったり 同じ 線を 走ると つまらない）
  f.aiOffT -= dt;
  if (f.aiOffT <= 0) {
    f.aiOffT = 0.7 + Math.random() * 1.3;
    f.aiOff = (Math.random() - 0.5) * T.hw * 1.1 * (1.3 - skill);
  }

  // 先を 見る きょり。はやいほど 遠くを 見る。
  const look = 90 + f.spd * 0.42;
  const ahead = mk(T, f.u + look / T.len, f.aiOff, 0);
  // アイテムの はこが 近くに あれば すこし よる
  let tx = ahead.x, ty = ahead.y;
  for (const b of T.boxes) {
    if (!b.on) continue;
    const du = ((b.u - f.u) % 1 + 1) % 1;
    if (du > 0.001 && du < look / T.len * 1.4) { tx = b.x; ty = b.y; break; }
  }
  // みずたまりは よける
  for (const p of T.pools) {
    const du = ((p.u - f.u) % 1 + 1) % 1;
    if (du > 0 && du < look / T.len) {
      const side = p.off >= 0 ? -1 : 1;
      const q = mk(T, p.u, p.off + side * (p.r + 22), 0);
      tx = q.x; ty = q.y;
      break;
    }
  }

  const want = Math.atan2(ty - f.y, tx - f.x);
  let d = want - f.ang;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;

  // ★ 「ちょっと ずれたら すぐ 反対に きる」を やると、ハンドルが
  //   ぶるぶる して ドリフトが 1回も たまらない。
  //   いちど きったら、まっすぐに もどる まで **同じ むきで にぎり つづける**。
  const keep = f.steer !== 0 && Math.sign(d) === f.steer;
  if (keep) { /* そのまま */ }
  else if (Math.abs(d) < 0.03) f.steer = 0;
  else if (Math.abs(d) > 0.09 || f.steer === 0) f.steer = d > 0 ? 1 : -1;

  // かどの きつさで スピードを おとす
  const ci = Math.floor((((f.u + look / T.len) % 1) + 1) % 1 * T.n) % T.n;
  const cv = T.curve[ci];

  // ★ はなれすぎ ないように、まえに いる CPU は 少し ゆっくり、
  //   うしろの CPU は 少し はやく する（ゴムひもで つないだ ような 動き）。
  //   これが ないと 1回 草に 出ただけで もう 追いつけず、
  //   小さい子が レースを あきらめて しまう。
  const me = G.karts[G.me];
  let gap = (f.lap + f.u) - (me.lap + me.u);
  gap = Math.max(-0.28, Math.min(0.28, gap));
  const band = 1 - gap * D.band;

  f.aiMax = Math.min(MAXS * 1.02, MAXS * f.drv.top * skill * band * (1 - cv * D.cv));

  // ★ かどが おわりそうで、火花が たまっていたら はなす → ダッシュ。
  //   これを しないと CPU は ずっと にぎった ままで 一度も ダッシュしない。
  //   つよい CPU ほど 長く にぎって、大きい ダッシュを もらう。
  const rel = 0.30 + skill * 0.62;
  if (f.driftT > rel && cv < 0.30 && skill > 0.84) f.steer = 0;

  // アイテムを つかう
  f.aiUseT -= dt;
  if (f.item && f.aiUseT <= 0) {
    f.aiUseT = 0.3 + Math.random() * 1.2 / D.item;
    if (f.item === 1 && cv < 0.22) useItem(f);          // ダッシュは まっすぐで
    else if (f.item === 2 && Math.random() < 0.5) useItem(f);
    else if (f.item === 3) useItem(f);
  }
}

// --- カートを うごかす -------------------------------------------------------------

function moveKart(f, dt) {
  const T = G.T;
  const near = nearestOn(T, f.x, f.y, f.hint);
  f.hint = near.i;
  const off = Math.abs(near.lat);
  const wasGrass = f.onGrass;
  f.onGrass = off > T.hw;

  // みずたまりの 上か
  let inPool = false;
  for (const p of T.pools) {
    if ((f.x - p.x) * (f.x - p.x) + (f.y - p.y) * (f.y - p.y) < (p.r + R * 0.6) * (p.r + R * 0.6)) {
      inPool = true; break;
    }
  }

  if (f.onGrass && !wasGrass && f.spd > 90) { if (f.isMe) sfxGrass(); f.grassT = 0.2; }

  // ── さいこう そくど
  let top = (f.aiMax !== undefined && !f.isMe ? f.aiMax : MAXS * f.drv.top);
  if (f.isMe) top *= assistTop();
  if (f.boostT > 0) top = MAXS * f.drv.top * BOOST;
  if (f.onGrass) top *= GRASS;
  else if (inPool) top *= POOL;
  if (G.phase !== 'race' || f.spinT > 0) top = 0;

  // ── かそく／げんそく
  if (f.spd < top) f.spd = Math.min(top, f.spd + ACC * f.drv.acc * (f.boostT > 0 ? 2.2 : 1) * dt);
  else f.spd = Math.max(top, f.spd - BRK * dt);
  f.boostT = Math.max(0, f.boostT - dt);

  // ── まがる
  if (f.spinT > 0) {
    f.spinT -= dt;
    f.ang += dt * 13;
    f.driftT = 0;
  } else {
    // とまっている ときは まがれない（じっさいの 車と 同じ）
    const grip = Math.min(1, f.spd / 70);
    // ★ はやいほど まがりにくい（アンダーステア）。
    //   これが ないと ぜんぶの かどを アクセル全開の まま まがれて しまい、
    //   ドリフトを おぼえる いみが なくなる。
    const fast = 1 - 0.34 * Math.min(1, f.spd / MAXS);
    // ★ ドリフト中は タイヤが よく かかる。だから「まがれない かど」は
    //   ドリフトで まがる。ためた ぶん ダッシュも つく、という ごほうび。
    const dgrip = f.driftT > 0.15 ? 1.40 : 1;
    f.ang += f.steer * TURN * f.drv.grip * grip * fast * dgrip * (f.onGrass ? 0.72 : 1) * dt;

    // ── ドリフト。同じ むきに まがりつづけると 火花が たまる。
    if (f.steer !== 0 && f.spd > MAXS * 0.55 && f.steer === f.driftDir) {
      f.driftT += dt;
      f.slide += -f.steer * f.spd * 0.55 * dt;
    } else if (f.steer !== 0) {
      f.driftDir = f.steer; f.driftT = 0;
    } else {
      // はなした しゅんかん。たまっていたら ダッシュ。
      if (f.driftT > 0.55) {
        f.boostT = Math.max(f.boostT, Math.min(1.0, f.driftT * 0.55));
        if (f.isMe) sfxDash();
      }
      f.driftT = 0; f.driftDir = 0;
    }
  }
  f.slide -= f.slide * Math.min(1, dt * 5.5);

  // ── すすむ
  const vx = Math.cos(f.ang) * f.spd - Math.sin(f.ang) * f.slide;
  const vy = Math.sin(f.ang) * f.spd + Math.cos(f.ang) * f.slide;
  f.x += vx * dt;
  f.y += vy * dt;

  // ── コースから 出すぎない ように、そとがわの かべで おしもどす
  const n2 = nearestOn(T, f.x, f.y, f.hint);
  f.hint = n2.i;
  const lim = T.hw + 150;
  if (Math.abs(n2.lat) > lim) {
    const d = G.T.dir[n2.i];
    const push = (Math.abs(n2.lat) - lim) * (n2.lat > 0 ? 1 : -1);
    f.x += d[1] * push;
    f.y -= d[0] * push;
    f.spd *= 0.9;
  }

  // ── アイテムの はこ・かそくパッド・バナナ
  if (G.phase === 'race' && !f.done) pickups(f, dt);
}

function pickups(f, dt) {
  const T = G.T;
  for (const b of T.boxes) {
    if (!b.on) continue;
    if ((f.x - b.x) * (f.x - b.x) + (f.y - b.y) * (f.y - b.y) < (b.r + R) * (b.r + R)) {
      b.on = false; b.back = 3.2;
      if (!f.item) {
        f.item = rollItem(f);
        if (f.isMe) sfxBox();
      }
    }
  }
  for (const p of T.pads) {
    if ((f.x - p.x) * (f.x - p.x) + (f.y - p.y) * (f.y - p.y) < (p.r + R) * (p.r + R)) {
      if (f.boostT < PAD_T) {
        f.boostT = PAD_T;
        if (f.isMe) sfxDash();
      }
    }
  }
  for (const b of G.bananas) {
    if (b.t > 0.6 && (f.x - b.x) * (f.x - b.x) + (f.y - b.y) * (f.y - b.y) < (14 + R) * (14 + R)) {
      b.dead = true;
      spin(f);
    }
  }
}

// はこが 消えた まま だと、うしろの 人が 1こも とれない。少し したら もどす。
function boxesBack(dt) {
  for (const b of G.T.boxes) {
    if (b.on) continue;
    b.back -= dt;
    if (b.back <= 0) b.on = true;
  }
}

// うしろの 人ほど よい アイテムが 出る（マリオカートと 同じ かんがえ）
function rollItem(f) {
  const p = f.place;
  const r = Math.random();
  if (p <= 1) return r < 0.62 ? 2 : 1;            // 1い は バナナ が 多い
  if (p === 2) return r < 0.40 ? 2 : (r < 0.80 ? 1 : 3);
  return r < 0.22 ? 2 : (r < 0.58 ? 1 : 3);       // びり は こうら が 出やすい
}

function useItem(f) {
  if (!f.item || f.spinT > 0) return;
  const it = f.item;
  f.item = 0;
  if (it === 1) {
    f.boostT = Math.max(f.boostT, BOOST_T);
    if (f.isMe) sfxDash();
  } else if (it === 2) {
    const bx = f.x - Math.cos(f.ang) * 34, by = f.y - Math.sin(f.ang) * 34;
    G.bananas.push({ x: bx, y: by, t: 0, dead: false });
    if (f.isMe) sfxDrop();
  } else if (it === 3) {
    // まえに いる いちばん 近い 人を ねらう
    let tgt = null, bd = 9;
    for (const q of G.karts) {
      if (q === f || q.done) continue;
      const d = (q.lap + q.u) - (f.lap + f.u);
      if (d > 0 && d < bd) { bd = d; tgt = q; }
    }
    G.shells.push({ x: f.x, y: f.y, u: f.u, hint: f.hint, tgt, t: 0, from: f });
    if (f.isMe) sfxShell();
  }
}

function updateShells(dt) {
  for (const s of G.shells) {
    s.t += dt;
    const T = G.T;
    // まん中の 線に そって まえへ すすむ
    s.u += (520 * dt) / T.len;
    const want = s.tgt ? mk(T, s.tgt.u, 0, 0) : mk(T, s.u, 0, 0);
    const p = mk(T, s.u, 0, 0);
    const gx = s.tgt ? (p.x * 0.6 + want.x * 0.4) : p.x;
    const gy = s.tgt ? (p.y * 0.6 + want.y * 0.4) : p.y;
    s.x += (gx - s.x) * Math.min(1, dt * 9);
    s.y += (gy - s.y) * Math.min(1, dt * 9);
    for (const q of G.karts) {
      if (q === s.from || q.done) continue;
      if ((q.x - s.x) * (q.x - s.x) + (q.y - s.y) * (q.y - s.y) < (12 + R) * (12 + R)) {
        spin(q); s.dead = true;
      }
    }
    if (s.t > 6) s.dead = true;
  }
  G.shells = G.shells.filter((s) => !s.dead);
  for (const b of G.bananas) b.t += dt;
  G.bananas = G.bananas.filter((b) => !b.dead && b.t < 25);
  boxesBack(dt);
}

function spin(f) {
  if (f.spinT > 0) return;
  f.spinT = SPIN_T;
  f.spd *= 0.28;
  f.boostT = 0;
  f.driftT = 0;
  if (f.isMe) { sfxSpin(); G.shake = 1; }
}

// カートどうしが かさならない ように、そっと おしのける
function hitEachOther() {
  for (let a = 0; a < G.karts.length; a++) {
    for (let b = a + 1; b < G.karts.length; b++) {
      const p = G.karts[a], q = G.karts[b];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > R * 2 || d < 0.001) continue;
      const nx = dx / d, ny = dy / d;
      const push = (R * 2 - d) / 2;
      p.x -= nx * push; p.y -= ny * push;
      q.x += nx * push; q.y += ny * push;
      p.spd *= 0.96; q.spd *= 0.96;
      p.slide -= nx * 26; q.slide += nx * 26;
    }
  }
}

// --- しゅう回 と じゅんい -----------------------------------------------------------

function lapCheck(f) {
  const near = nearestOn(G.T, f.x, f.y, f.hint);
  f.u = near.u;
  const d = f.u - f.prevU;
  if (d < -0.5) {
    f.lap++;
    if (f.isMe && f.lap > 0 && f.lap < G.T.laps) sfxLap();
    if (f.lap >= G.T.laps && !f.done) {
      f.done = true;
      f.doneT = G.t;
      G.finished++;
      f.finPlace = G.finished;
    }
  } else if (d > 0.5) {
    f.lap--;   // うしろむきに スタート線を こえた
  }
  f.prevU = f.u;
}

function rankAll() {
  const arr = G.karts.slice();
  arr.sort((a, b) => {
    if (a.done !== b.done) return a.done ? -1 : 1;
    if (a.done && b.done) return a.finPlace - b.finPlace;
    return (b.lap + b.u) - (a.lap + a.u);
  });
  for (let k = 0; k < arr.length; k++) arr[k].place = k + 1;
  G.order = arr;
}

function endRace() {
  const me = G.karts[G.me];
  G.place = me.finPlace || me.place;
  const key = 's' + G.stage;
  if (G.place <= 3) {
    save.clear[G.stage] = true;
    const b = save.best[key];
    if (!b || me.doneT < b) { save.best[key] = Math.round(me.doneT * 100) / 100; G.best = true; }
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxGoal(G.place === 1);
}

// 3回 まけると、じぶんの カートが 少し はやく なる
function assistLevel() {
  return Math.min(2, Math.floor((save.fails['s' + G.stage] || 0) / 3));
}
function assistTop() { return 1 + assistLevel() * 0.045; }

// のこり時間 ではなく「じゅんい と しゅう回」で 見せる ための 文字
function lapText() {
  const me = G.karts[G.me];
  return Math.max(1, Math.min(G.T.laps, me.lap + 1)) + '/' + G.T.laps;
}
