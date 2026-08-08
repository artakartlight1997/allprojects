// ゲームの 中身。あおいが タワーを のぼり、ママが 下から 上がってくる。
//
// そうさは「左右に うごく」だけ。あしばに つくと **かってに はねる**。
// ボタンを おす タイミングを 考えなくて いいので、小学生でも すぐ あそべる。
//
// よこの いちは「タワーの まん中から」で かぞえる。だから 画面の 幅が
// かわっても タワーは いつも まん中で、むずかしさも 同じ。
//
// たての いちは「下から どれだけ 上がったか」。上が プラス。
// かく ときだけ 画面の むきに なおす（y が 下むきなので ひっくり返す）。

'use strict';

const SAVE_KEY = 'tower.v1';

const save = { clear: {}, skip: {}, best: {}, plays: 0, ending: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    for (const k of ['clear', 'skip', 'best']) {
      if (o[k] && typeof o[k] === 'object') save[k] = o[k];
    }
    if (Number.isFinite(o.plays)) save.plays = o.plays;
    if (Number.isFinite(o.ending)) save.ending = o.ending;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function clearedCount() {
  let n = 0;
  for (let i = 0; i < STAGES.length; i++) if (save.clear['s' + i]) n++;
  return n;
}
function stageOpen(i) {
  if (i === 0) return true;
  return !!save.clear['s' + (i - 1)] || !!save.skip['s' + (i - 1)];
}

// --- かず ---------------------------------------------------------------------

const GRAV = 1250;
const MOVE_A = 1900;         // 左右の 加速
const MOVE_MAX = 290;
const FRIC = 2400;
const SLIP_FRIC = 260;       // すべる あしばは ほとんど とまらない
const FALL_MAX = 720;
const AOI_W = 20, AOI_H = 52;
const PLAT_W = 84, PLAT_H = 12;
const EYE = 150;             // 画面の 下から どれくらいの ところに あおいを おくか
const HEARTS = 3;
const MAMA_SHOUT = 4.2;      // なんびょう ごとに さけぶか
const CATCH_D = 34;          // ママに これだけ 近づくと つかまる

let failStage = -1, failStreak = 0;
function assistLevel() { return Math.min(2, Math.floor(failStreak / 2)); }

const G = {
  screen: 'title', si: 0, pending: 0,
  t: 0, VW: 800, cx: 400,
  aoi: null, mama: null,
  plats: [], stars: [], items: [], friends: [], pops: [], puffs: [],
  camY: 0, topY: 0, hearts: HEARTS, got: 0, starTotal: 0,
  done: false, win: false, endT: 0, shake: 0, assist: 0,
  bubble: null, bubbleT: 0, mamaStop: 0, nearT: 0,
  boost: 0, umbrella: 0,
};

// --- タワーを 組み立てる --------------------------------------------------------
//
// たねを 面ばんごう から 作るので、同じ 面は いつも 同じ ならび。
// おぼえて うまく なれるように している。

function buildTower(si) {
  const st = STAGES[si];
  const rn = mkRng(1234 + si * 7919);
  const half = TOWER_W / 2 - PLAT_W / 2 - 6;

  // しゅるいの ふくろ（わりあいの ぶんだけ 入れて、そこから ひく）
  const bag = [];
  for (const k of Object.keys(st.kinds)) {
    for (let i = 0; i < st.kinds[k]; i++) bag.push(k);
  }

  const plats = [];
  // 一番下は タワーの はばいっぱいの ゆか。
  // これが ないと、はじめの ひとはねを ミスした だけで 下に ぬけて しまう。
  plats.push({ x: 0, y: 40, kind: 'normal', w: TOWER_W, t: 0, on: true });

  let y = 40 + st.gap;
  let prevX = 0;
  while (y < st.h + 120) {
    // はじめの 2まいは かならず ふつう。のぼりかたを おぼえる ばしょ。
    let kind = plats.length <= 2 ? 'normal' : bag[(rn() * bag.length) | 0];
    // バネが つづくと とびすぎる ので、間を あける
    if (kind === 'spring' && plats.length && plats[plats.length - 1].kind === 'spring') {
      kind = 'normal';
    }
    // よこの いちは 前の あしばから **かならず とどく** はんいに する。
    // とどかない ならびが 1つでも あると、そこで ゲームが 止まって しまう。
    //   上がる 時間 0.53秒 ＋ あしばの 高さまで おちる 時間 ≒ 0.8秒
    //   よこに うごける きょり = 290 × 0.8 ≒ 230（加速の ぶん すこし へる）
    //   あしばの はばの 半分 42 も たすと よゆうが ある
    const reach = 130;
    let x = prevX + (rn() * 2 - 1) * reach;
    x = Math.max(-half, Math.min(half, x));
    plats.push({ x, y, kind, w: PLAT_W, t: rn() * 6, on: true,
                 bx: x, sp: 40 + rn() * 40, sw: 56 + rn() * 26,
                 dir: rn() < 0.5 ? -1 : 1 });
    prevX = x;
    y += st.gap * (0.86 + rn() * 0.3);
  }

  // てっぺんの あしば（ゴール）
  plats.push({ x: 0, y: st.h + 150, kind: 'goal', w: PLAT_W * 2.2, t: 0, on: true });

  // ほし（あつめると うれしい だけ。とらなくても クリアできる）
  const stars = [];
  for (let i = 3; i < plats.length - 2; i += 3) {
    const p = plats[i];
    stars.push({ x: p.x + (rn() * 2 - 1) * 40, y: p.y + 46, got: false });
  }

  // アイテム。かさ（ゆっくり おちる）と くつ（はやく うごける）
  const items = [];
  for (let i = 6; i < plats.length - 3; i += 9) {
    items.push({ x: plats[i].x, y: plats[i].y + 40,
                 kind: rn() < 0.5 ? 'umbrella' : 'shoes', got: false });
  }

  // おともだち。タワーの あいだに 立っている。
  const friends = [];
  const fs = st.friends || [];
  fs.forEach((k, n) => {
    const at = Math.floor(plats.length * (n + 1) / (fs.length + 1));
    const p = plats[Math.max(2, Math.min(plats.length - 3, at))];
    p.kind = 'normal'; p.w = PLAT_W * 1.3;
    friends.push({ who: k, x: p.x, y: p.y, used: false, t: 0 });
  });

  return { plats, stars, items, friends };
}

function startStage(i) {
  audioStart();
  i = Math.max(0, Math.min(STAGES.length - 1, i));
  if (failStage !== i) { failStage = i; failStreak = 0; }
  const as = assistLevel();
  G.assist = as;
  const st = STAGES[i];
  G.si = i;
  G.t = 0;

  const built = buildTower(i);
  G.plats = built.plats;
  G.stars = built.stars;
  G.items = built.items;
  G.friends = built.friends;
  G.starTotal = built.stars.length;
  G.got = 0;

  G.topY = st.h + 150;
  G.aoi = { x: 0, y: 52, vx: 0, vy: HOP, face: 1, onGround: false, squash: 0, plat: null };
  // ママは 下から。てだすけが 入ると もっと 下から はじまる。
  G.mama = { x: 0, y: -260 - as * 120, vy: 0, face: 1, t: 0 };
  G.camY = 0;
  G.hearts = HEARTS + (as >= 1 ? 1 : 0);
  G.pops = []; G.puffs = [];
  G.done = false; G.win = false; G.endT = 0; G.shake = 0;
  G.bubble = null; G.bubbleT = 4.0;   // はじめの あんないが きえてから さけぶ
  G.mamaStop = 0; G.nearT = 0; G.boost = 0; G.umbrella = 0; G.shoes = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(i);
}

function pop(x, y, text, col, big) {
  G.pops.push({ x, y, text, col, t: 0, big: !!big });
  if (G.pops.length > 6) G.pops.shift();
}
function puff(x, y, col, n, sp) {
  for (let k = 0; k < (n || 6); k++) {
    const a = Math.random() * 6.283;
    G.puffs.push({ x, y, vx: Math.cos(a) * (sp || 140), vy: Math.sin(a) * (sp || 140),
                   t: 0, life: 0.35 + Math.random() * 0.3, col });
  }
  if (G.puffs.length > 140) G.puffs.splice(0, G.puffs.length - 140);
}

// --- 1 コマ -------------------------------------------------------------------

function update(dt, inp) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.t += dt;
  if (G.shake > 0) G.shake -= dt;

  if (!G.done) {
    stepPlats(dt);
    stepAoi(dt, inp);
    stepMama(dt);
    stepPickups();
    stepFriends();
  } else {
    G.endT += dt;
    if (G.endT > 1.6) G.screen = G.win ? 'clear' : 'over';
  }

  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter((p) => p.t < 1.4);
  for (const p of G.puffs) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 260 * dt; p.vx *= 0.95;
  }
  G.puffs = G.puffs.filter((p) => p.t < p.life);

  // カメラ。上がる ときは すぐ ついていき、下がる ときは ゆっくり。
  const want = G.aoi.y - EYE;
  if (want > G.camY) G.camY += (want - G.camY) * Math.min(1, dt * 12);
  else G.camY += (want - G.camY) * Math.min(1, dt * 3);
  if (G.camY < 0) G.camY = 0;
}

function stepPlats(dt) {
  const half = TOWER_W / 2 - PLAT_W / 2 - 6;
  for (const p of G.plats) {
    p.t += dt;
    if (p.kind === 'move') {
      // もとの ばしょの まわり（±sw）だけ うごく。
      // タワー ぜんたいを うろうろ させると、あしばの ならびで
      // 「かならず とどく」ように 作った いみが なくなる。
      p.x += p.dir * p.sp * dt;
      const lo = Math.max(-half, p.bx - p.sw), hi = Math.min(half, p.bx + p.sw);
      if (p.x > hi) { p.x = hi; p.dir = -1; }
      if (p.x < lo) { p.x = lo; p.dir = 1; }
    }
    if (!p.on && p.kind === 'crack') {
      p.gone = (p.gone || 0) + dt;
      // 5びょうで もどってくる。もどらないと、下に 落ちたときに
      // のる ものが なくなって どうにも できなく なる。
      if (p.gone > 5) { p.on = true; p.gone = 0; }
    }
  }
}

function stepAoi(dt, inp) {
  const a = G.aoi, st = STAGES[G.si];

  // よこ
  const maxSp = MOVE_MAX * (G.shoes > 0 ? 1.35 : 1);
  if (inp.mx) {
    a.vx += inp.mx * MOVE_A * dt;
    a.vx = Math.max(-maxSp, Math.min(maxSp, a.vx));
    a.face = inp.mx > 0 ? 1 : -1;
  } else {
    const fr = (a.plat && a.plat.kind === 'slip' && a.onGround) ? SLIP_FRIC : FRIC;
    a.vx -= Math.sign(a.vx) * Math.min(Math.abs(a.vx), fr * dt);
  }
  // よこかぜ
  // よこかぜ。つよすぎると そうさが きかなく なるので、
  // 一番 つよい 10かい目でも うごける はやさの 3わり ていどに おさえる。
  if (st.wind) a.vx += Math.sin(G.t * 0.7) * st.wind * dt * 1.1;

  // たて
  const g = GRAV * (G.umbrella > 0 && a.vy < 0 ? 0.34 : 1);
  const prevY = a.y;
  a.vy -= g * dt;
  a.vy = Math.max(-FALL_MAX, a.vy);
  a.x += a.vx * dt;
  a.y += a.vy * dt;

  // タワーの かべ。はじで はねかえる（外に 出られない）。
  const wall = TOWER_W / 2 - AOI_W / 2;
  if (a.x < -wall) { a.x = -wall; a.vx = Math.abs(a.vx) * 0.4; }
  if (a.x > wall) { a.x = wall; a.vx = -Math.abs(a.vx) * 0.4; }

  // あしばに のる（下へ おちている ときだけ。下から すりぬけられる）
  a.onGround = false;
  if (a.vy <= 0) {
    for (const p of G.plats) {
      if (!p.on) continue;
      if (Math.abs(a.x - p.x) > p.w / 2 + AOI_W * 0.35) continue;
      if (prevY < p.y - 2 || a.y > p.y + 6) continue;
      landPlat(a, p);
      break;
    }
  }
  if (a.squash > 0) a.squash = Math.max(0, a.squash - dt * 3.5);

  if (G.umbrella > 0) {
    G.umbrella -= dt;
    if (a.vy < 0) puff(a.x, a.y + 30, 'rgba(255,255,255,0.5)', 1, 30);
  }
  if (G.shoes > 0) G.shoes -= dt;

  // てっぺんに ついた？
  if (a.y >= G.topY + 10) finish(true);
}

function landPlat(a, p) {
  a.y = p.y;
  a.plat = p;
  a.onGround = true;
  a.squash = 0.35;
  if (p.kind === 'goal') { finish(true); return; }
  if (p.kind === 'spring') {
    a.vy = HOP * 1.55;
    a.squash = 0.5;
    puff(a.x, a.y, '#8FE0FF', 8, 170);
    sfxSpring();
  } else {
    a.vy = HOP;
    sfxHop();
  }
  if (p.kind === 'crack') {
    p.on = false;
    puff(p.x, p.y, '#C8A882', 8, 130);
    sfxBreak();
  }
}

function stepMama(dt) {
  const m = G.mama, st = STAGES[G.si], a = G.aoi;
  m.t += dt;

  if (G.mamaStop > 0) {
    G.mamaStop -= dt;
  } else {
    // まっすぐ 上へ。ただし はなれすぎたら すこし 早く（きんちょうが きえないように）
    const behind = a.y - m.y;
    let sp = st.mama;
    if (behind > 900) sp *= 1.45;
    else if (behind < 260) sp *= 0.82;   // 近すぎたら すこし ゆるめる（やさしさ）
    m.y += sp * dt;
  }
  // よこは あおいに ゆっくり ついてくる
  m.x += (a.x - m.x) * Math.min(1, dt * 1.1);
  m.face = a.x >= m.x ? 1 : -1;

  // さけぶ
  G.bubbleT -= dt;
  if (G.bubbleT <= 0) {
    G.bubbleT = MAMA_SHOUT;
    const i = (Math.random() * MAMA_LINES.length) | 0;
    G.bubble = { text: MAMA_LINES[i], t: 0 };
    sfxMama();
  }
  if (G.bubble) {
    G.bubble.t += dt;
    if (G.bubble.t > 2.6) G.bubble = null;
  }

  // 近づいてきた ドキドキ
  const d = a.y - m.y;
  const near = Math.max(0, Math.min(1, (420 - d) / 420));
  bgmHeat(near);
  if (near > 0.45) {
    G.nearT -= dt;
    if (G.nearT <= 0) { G.nearT = 0.5 - near * 0.28; sfxNear(); }
  }

  // つかまった。ママより 下に 落ちても つかまり（ママが ゆかの かわり）。
  if (d < CATCH_D && (Math.abs(a.x - m.x) < 90 || d < 0)) caught();
}

function caught() {
  G.hearts--;
  G.shake = 0.4;
  puff(G.aoi.x, G.aoi.y + 20, '#FF9CB8', 14, 220);
  sfxCaught();
  if (G.hearts <= 0) { finish(false); return; }
  // ハートが のこっていれば、上に にがして やりなおし
  pop(G.aoi.x, G.aoi.y + 70, 'つかまった！ あと ' + G.hearts, '#FF9CB8', true);
  G.aoi.y += 210;
  G.aoi.vy = HOP;
  G.mama.y -= 420;
  G.mamaStop = 1.2;
  G.bubble = null;
}

function stepPickups() {
  const a = G.aoi;
  for (const s of G.stars) {
    if (s.got) continue;
    if (Math.abs(a.x - s.x) > 30 || Math.abs((a.y + 26) - s.y) > 34) continue;
    s.got = true; G.got++;
    puff(s.x, s.y, '#FFE066', 8, 150);
    sfxStar();
  }
  for (const it of G.items) {
    if (it.got) continue;
    if (Math.abs(a.x - it.x) > 32 || Math.abs((a.y + 26) - it.y) > 36) continue;
    it.got = true;
    if (it.kind === 'umbrella') {
      G.umbrella = 7;
      pop(it.x, it.y + 40, 'かさ！ ゆっくり おちる', '#8FE0FF', true);
    } else {
      G.shoes = 7;
      pop(it.x, it.y + 40, 'くつ！ はやく うごける', '#A8F0B0', true);
    }
    puff(it.x, it.y, '#FFFFFF', 10, 170);
    sfxItem();
  }
}

// おともだちに 会うと たすけて くれる。
//   まさき（お兄ちゃん）… かたぐるまで すごく 高く とばす
//   パパ             … ママを 3.5びょう ひきとめる
//   りな             … ハートを 1つ くれる
const FRIEND_HELP = {
  masaki: { say: 'いくぞー！', col: '#8FD6FF' },
  papa: { say: 'ここは まかせろ！', col: '#A8E0A8' },
  rina: { say: 'あおい、これ あげる！', col: '#FFD166' },
};

function stepFriends() {
  const a = G.aoi;
  for (const f of G.friends) {
    f.t += 0.016;
    if (f.used) continue;
    if (Math.abs(a.x - f.x) > 40 || Math.abs(a.y - f.y) > 46) continue;
    f.used = true;
    const H = FRIEND_HELP[f.who];
    pop(f.x, f.y + 84, H.say, H.col, true);
    puff(f.x, f.y + 30, H.col, 12, 190);
    sfxFriend();
    if (f.who === 'masaki') {
      a.vy = HOP * 2.15;
      a.squash = 0.5;
      G.boost = 0.5;
    } else if (f.who === 'papa') {
      G.mamaStop = 3.5;
      G.mama.y -= 120;
    } else {
      G.hearts++;
    }
  }
}

// --- おわり -------------------------------------------------------------------

function finish(win) {
  if (G.done) return;
  G.done = true; G.win = win; G.endT = 0;
  bgmStop();
  if (win) {
    const key = 's' + G.si;
    save.clear[key] = 1;
    save.best[key] = Math.max(save.best[key] || 0, G.got);
    failStreak = 0;
    G.justOpened = 0;
    if (G.si === STAGES.length - 1) save.ending = 1;
    sfxTop();
  } else {
    failStreak++;
    G.justOpened = 0;
    if (failStreak >= 3 && !save.skip['s' + G.si]) {
      save.skip['s' + G.si] = 1;
      G.justOpened = 1;
    }
    sfxCaught();
  }
  storeSave();
}

// のこりの 高さ（0〜1）。上の バーで つかう。
function climbRate() {
  return Math.max(0, Math.min(1, G.aoi.y / G.topY));
}
function mamaRate() {
  return Math.max(0, Math.min(1, G.mama.y / G.topY));
}
