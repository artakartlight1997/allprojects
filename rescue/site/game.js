// ものの うごき（かんたんな 物理）と、ゲームの すすみかた。
//
// ★ つみきは ぜんぶ **まわらない しかく**。
//   まわる ものを 正しく ぶつけるのは むずかしく、少し まちがえるだけで
//   すり抜けたり ぶるぶる ふるえたり する。まわさない と きめる だけで、
//   「かさなりを おしのける」→「はやさを うつす」の 2つで すむ。
//
// ★ 1コマを 4回に わけて 計算する（サブステップ）。
//   たまは とても はやいので、1回だと つみきを 飛びこえて しまう。

'use strict';

const SAVE_KEY = 'rescue.v1';

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
// 3回 だめだと たまが 2つ ふえる（3だんかい、さいだい +6）
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function extraShots() { return assistLevel(G.stage) * 2; }

const GRAV = 1500;
const SUB = 4;              // 1コマを 何回に わけるか
const SLING = { x: 116, y: 300 };   // ゴムの ばしょ
const MAXPULL = 92;
const POWER = 13.0;         // ひっぱり 1px あたりの はやさ

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  boxes: [],
  ball: null,
  shots: 0,
  saved: 0, need: 0,
  aim: null,        // ひっぱっている ばしょ
  t: 0,
  settle: 0,        // うごきが 止まってからの 時間
  over: false, win: false,
  bits: [],         // こわれた かけら
  pops: [],         // たすけた どうぶつ
  next: 0,          // つぎの たまの ばんごう
};

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.boxes = [];
  G.saved = 0;
  G.need = 0;
  for (let r = 0; r < CH; r++) {
    const row = G.S.rows[r];
    for (let c = 0; c < CW; c++) {
      const ch = row[c];
      if (!ch || ch === '.') continue;
      const m = MAT[ch];
      if (!m) continue;
      G.boxes.push({
        x: BX + c * CS, y: GY - (CH - r) * CS,
        w: CS, h: CS, vx: 0, vy: 0,
        k: ch, hp: m.hp, max: m.hp, m: m.dens,
        hit: 0, dead: false,
      });
      if (ch === 'c') G.need++;
    }
  }
  G.shots = G.S.shots + extraShots();
  G.ball = null;
  G.aim = null;
  G.t = 0;
  G.settle = 0;
  G.over = false; G.win = false;
  G.bits = []; G.pops = [];
  G.next = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

function ballKind() {
  const list = G.S.balls;
  return BALLS.find((b) => b.key === list[Math.min(list.length - 1, G.next)]) || BALLS[0];
}

// --- ひっぱって うつ ---------------------------------------------------------------

function aimStart(x, y) {
  if (G.over || G.ball || G.shots <= 0) return;
  G.aim = { x, y };
}
function aimMove(x, y) {
  if (!G.aim) return;
  const dx = x - SLING.x, dy = y - SLING.y;
  const d = Math.hypot(dx, dy);
  const k = d > MAXPULL ? MAXPULL / d : 1;
  G.aim = { x: SLING.x + dx * k, y: SLING.y + dy * k };
}
function aimEnd() {
  if (!G.aim) return;
  const dx = SLING.x - G.aim.x, dy = SLING.y - G.aim.y;
  const d = Math.hypot(dx, dy);
  G.aim = null;
  if (d < 12) return;            // ちょっとしか ひいて いない → うたない
  const B = ballKind();
  G.ball = {
    px: undefined, py: undefined, rest: 0,
    x: SLING.x, y: SLING.y, r: B.r,
    vx: dx * POWER * B.pow, vy: dy * POWER * B.pow,
    mass: B.mass, kind: B, life: 0, hits: 0,
  };
  G.shots--;
  G.next++;
  sfxShoot();
}

// --- 1コマ ----------------------------------------------------------------------

function update(dt0) {
  if (G.screen !== 'play') return;
  bgmPump();
  const dt = Math.min(0.030, dt0);
  G.t += dt;

  for (const b of G.bits) { b.t += dt; b.vy += GRAV * dt * 0.6; b.x += b.vx * dt; b.y += b.vy * dt; }
  G.bits = G.bits.filter((b) => b.t < 0.9);
  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter((p) => p.t < 1.4);

  if (G.over) {
    G.settle += dt;
    if (G.settle > 1.6) { bgmStop(); G.screen = 'result'; }
    return;
  }

  const h = dt / SUB;
  for (let s = 0; s < SUB; s++) step(h);

  // ── うごきが 止まったか
  let moving = !!G.ball;
  for (const b of G.boxes) {
    if (Math.abs(b.vx) > 6 || Math.abs(b.vy) > 6) { moving = true; break; }
  }
  if (moving) G.settle = 0; else G.settle += dt;

  if (G.saved >= G.need) { finish(true); return; }
  if (!G.ball && G.shots <= 0 && G.settle > 1.0) { finish(false); return; }
}

function step(h) {
  // ── たま
  if (G.ball) {
    const b = G.ball;
    b.life += h;
    b.vy += GRAV * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    // じめん
    if (b.y + b.r > GY) {
      b.y = GY - b.r;
      b.vy = -b.vy * 0.32;
      b.vx *= 0.78;
      if (Math.abs(b.vy) < 60) b.vy = 0;
    }
    // かべ
    if (b.x - b.r < 0) { b.x = b.r; b.vx = -b.vx * 0.4; }
    // つみきに あたる
    for (const q of G.boxes) {
      if (q.dead) continue;
      hitBox(b, q);
    }
    // ── おわり
    // ★ まえは「じめんの 上で おそくなったら」しか 見ていなかったので、
    //   つみきの 上や すきまに はさまった たまが 9びょう 消えず、
    //   その あいだ つぎの たまが うてなかった（「たまがスタック」）。
    //   いまは **どこに いても** ほとんど 動かなく なったら 消す。
    const moved = Math.hypot(b.x - (b.px === undefined ? b.x : b.px),
                             b.y - (b.py === undefined ? b.y : b.py));
    b.px = b.x; b.py = b.y;
    if (moved < 0.8) b.rest = (b.rest || 0) + h; else b.rest = 0;
    const slow = Math.abs(b.vx) < 26 && Math.abs(b.vy) < 26;
    if (b.x > 900 || b.y > 700 || b.rest > 0.7 ||
        (slow && b.life > 0.7) || b.life > 5) {
      G.ball = null;
      if (G.shots <= 0 && G.saved < G.need) sfxMiss();
    }
  }

  // ── つみき
  for (const q of G.boxes) {
    if (q.dead) continue;
    q.vy += GRAV * h;
    q.x += q.vx * h;
    q.y += q.vy * h;
    q.hit = Math.max(0, q.hit - h * 4);
    if (q.y + q.h > GY) {
      const hitv = q.vy;
      q.y = GY - q.h;
      if (hitv > 340) damage(q, (hitv - 340) * 0.10, true);
      q.vy = -q.vy * 0.12;
      if (Math.abs(q.vy) < 40) q.vy = 0;
      q.vx *= 0.80;
      if (Math.abs(q.vx) < 8) q.vx = 0;
    }
    if (q.x < -40 || q.x > 900 || q.y > 700) q.dead = true;
  }

  // ── つみき どうし（2回 まわして きちんと つみあがる ように）
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < G.boxes.length; i++) {
      const a = G.boxes[i];
      if (a.dead) continue;
      for (let j = i + 1; j < G.boxes.length; j++) {
        const b = G.boxes[j];
        if (b.dead) continue;
        boxBox(a, b);
      }
    }
  }
  G.boxes = G.boxes.filter((q) => !q.dead);
}

// まるい たま と しかく
function hitBox(b, q) {
  const cx = Math.max(q.x, Math.min(b.x, q.x + q.w));
  const cy = Math.max(q.y, Math.min(b.y, q.y + q.h));
  const dx = b.x - cx, dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > b.r * b.r) return;
  const d = Math.sqrt(d2) || 0.0001;
  let nx = dx / d, ny = dy / d;
  if (d2 < 0.0001) {
    // まん中に めりこんだ ときは、いちばん 近い めんへ 出す
    nx = 0; ny = -1;
  }
  const push = b.r - d;
  const rel = Math.hypot(b.vx - q.vx, b.vy - q.vy);
  // つみきを おす（おもさで きき目が かわる）
  const share = Math.min(0.85, b.mass / (b.mass + q.m * 1.6));
  b.x += nx * push * (1 - share);
  b.y += ny * push * (1 - share);
  q.x -= nx * push * share;
  q.y -= ny * push * share;
  // はやさを うつす
  const vn = (b.vx - q.vx) * nx + (b.vy - q.vy) * ny;
  if (vn < 0) {
    const e = 0.30;
    const imp = -(1 + e) * vn * share;
    b.vx += nx * imp;
    b.vy += ny * imp;
    q.vx -= nx * imp * (b.mass / Math.max(0.3, q.m)) * 0.55;
    q.vy -= ny * imp * (b.mass / Math.max(0.3, q.m)) * 0.55;
    if (rel > 120) {
      damage(q, (rel - 120) * 0.085 * b.mass, true);
      b.hits++;
      sfxBump(Math.min(1, rel / 900));
    }
  }
}

// しかく どうし
function boxBox(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (ox <= 0) return;
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (oy <= 0) return;
  const ma = a.m, mb = b.m, tot = ma + mb;
  const rel = Math.hypot(a.vx - b.vx, a.vy - b.vy);
  if (ox < oy) {
    const s = (a.x < b.x) ? -1 : 1;
    a.x += s * ox * (mb / tot);
    b.x -= s * ox * (ma / tot);
    const t2 = a.vx; a.vx = b.vx * 0.5 + t2 * 0.2; b.vx = t2 * 0.5 + b.vx * 0.2;
  } else {
    const s = (a.y < b.y) ? -1 : 1;
    a.y += s * oy * (mb / tot);
    b.y -= s * oy * (ma / tot);
    // 上に のっている ほうは 止める（つみあがる ため）
    if (s < 0) { if (a.vy > 0) a.vy = 0; if (b.vy < 0) b.vy = 0; }
    else { if (b.vy > 0) b.vy = 0; if (a.vy < 0) a.vy = 0; }
    a.vx *= 0.94; b.vx *= 0.94;
  }
  if (rel > 260) {
    damage(a, (rel - 260) * 0.05 * b.m, false);
    damage(b, (rel - 260) * 0.05 * a.m, false);
  }
}

function damage(q, amount, loud) {
  if (q.dead || amount <= 0) return;
  q.hp -= amount;
  q.hit = 1;
  if (q.hp > 0) return;
  q.dead = true;
  // かけら
  for (let i = 0; i < 7; i++) {
    G.bits.push({
      x: q.x + Math.random() * q.w, y: q.y + Math.random() * q.h,
      vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200,
      k: q.k, t: 0,
    });
  }
  if (q.k === 'c') {
    G.saved++;
    G.pops.push({ x: q.x + q.w / 2, y: q.y + q.h / 2, t: 0 });
    sfxSave();
  } else if (loud) {
    if (q.k === 'w') sfxWood();
    else if (q.k === 'i') sfxIce();
    else sfxStone();
  }
}

function finish(win) {
  if (G.over) return;
  G.over = true;
  G.win = win;
  G.settle = 0;
  const key = 's' + G.stage;
  if (win) {
    save.clear[G.stage] = true;
    const left = G.shots;
    save.best[key] = Math.max(save.best[key] || 0, left);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxEnd(win);
}
