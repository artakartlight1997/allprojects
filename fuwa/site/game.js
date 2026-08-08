// ゲームの 中身。とぶ・うつ・あたる。
//
// 画面の 大きさが ちがっても 同じ むずかしさに なるように、
// たては いつも VH（450）として 計算して、かくときだけ 画面に 合わせて のばす。
// よこ幅だけは 画面なりに 変える（よこ長の スマホは すこし 先まで 見える）。

'use strict';

const SAVE_KEY = 'fuwa.v1';

const save = {
  star: {},          // 面ごとの さいこう（1〜3）
  skip: {},          // 何回も だめだった 面
  plays: 0,
};

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (o.star && typeof o.star === 'object') save.star = o.star;
    if (o.skip && typeof o.skip === 'object') save.skip = o.skip;
    if (Number.isFinite(o.plays)) save.plays = o.plays;
  } catch (e) {}
}
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
loadSave();

function clearedCount() {
  let n = 0;
  for (let i = 0; i < STAGES.length; i++) if ((save.star['s' + i] || 0) > 0) n++;
  return n;
}
function stageOpen(i) {
  if (i === 0) return true;
  return (save.star['s' + (i - 1)] || 0) > 0 || !!save.skip['s' + (i - 1)];
}

// --- とびかた の かず ----------------------------------------------------------
//
// 「一回 おすと ふわっと 上がる」を 出すため、おした あと しばらく
// じゅうりょくを 弱くしている（ふわっと うく 時間）。

const GRAV = 1150;          // ふだんの じゅうりょく
const FLAP = -385;          // 1回 おしたときの 上むきの 速さ
const FLOAT_T = 0.26;       // ふわっと ういている 時間
const FLOAT_G = 0.30;       // その あいだの じゅうりょくの わりあい
const VMAX = 540;           // 落ちる 速さの かぎり
const RINA_X = 150;
// あたり判定の 大きさは 見た目より 小さく する。
// 見た目どおりだと「当たってないのに あたった」に なって いやに なる。
const RINA_R = 15;
const SHOT_R = 12;
const SHOT_V = 700;         // てきが 来る前に たおせる 速さ
const SHOOT_GAP = 0.38;
const INV_T = 1.8;          // ぶつかった あと むてき の 時間

let failStage = -1, failStreak = 0;
function assistLevel() { return Math.min(2, Math.floor(failStreak / 2)); }

const G = {
  screen: 'title',       // title / howto / select / rule / play / clear / over
  si: 0, pending: 0,
  t: 0, scroll: 0, spd: 200,
  y: VH / 2, vy: 0, floatT: 0, inv: 0,
  hp: 3, maxHp: 3,
  foes: [], shots: [], eshots: [], items: [], pops: [], puffs: [],
  wi: 0, ii: 0,
  waves: null,
  boss: null,
  score: 0, kills: 0,
  shootT: 0, triple: 0,
  shake: 0,
  done: false, win: false, stars: 0,
  endT: 0,
  assist: 0,
  VW: 800,
};

function startStage(i) {
  audioStart();
  i = Math.max(0, Math.min(STAGES.length - 1, i));
  if (failStage !== i) { failStage = i; failStreak = 0; }
  const as = assistLevel();
  G.assist = as;
  const st = STAGES[i];
  G.si = i;
  G.t = 0; G.scroll = 0;
  G.spd = st.spd * (1 - as * 0.09);
  G.y = VH / 2; G.vy = 0; G.floatT = 0; G.inv = 0;
  G.maxHp = 4 + as;
  G.hp = G.maxHp;
  G.foes = []; G.shots = []; G.eshots = []; G.items = []; G.pops = []; G.puffs = [];
  G.waves = makeWaves(i);
  G.wi = 0; G.ii = 0;
  G.boss = null;
  G.score = 0; G.kills = 0;
  G.shootT = 0.25; G.triple = 0;
  G.shake = 0;
  G.done = false; G.win = false; G.stars = 0;
  G.endT = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(i);
}

function pop(x, y, text, col) {
  G.pops.push({ x, y, text, col, t: 0 });
  if (G.pops.length > 8) G.pops.shift();
}
function puff(x, y, col, n, sp) {
  for (let k = 0; k < (n || 6); k++) {
    const a = Math.random() * 6.283;
    G.puffs.push({ x, y, vx: Math.cos(a) * (sp || 120), vy: Math.sin(a) * (sp || 120),
                   t: 0, life: 0.5 + Math.random() * 0.3, col });
  }
  if (G.puffs.length > 140) G.puffs.splice(0, G.puffs.length - 140);
}

// --- そうさ -------------------------------------------------------------------

function flap() {
  if (G.screen !== 'play' || G.done) return;
  G.vy = FLAP;
  G.floatT = FLOAT_T;
  puff(RINA_X - 6, G.y + RINA_R, 'rgba(255,255,255,0.85)', 4, 70);
  sfxFlap();
}

// --- 1 コマ -------------------------------------------------------------------

function update(dt, held) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.t += dt;
  G.scroll += G.spd * dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.inv > 0) G.inv -= dt;
  if (G.triple > 0) G.triple -= dt;

  // りな
  let g = GRAV;
  if (G.floatT > 0) { G.floatT -= dt; g *= FLOAT_G; }
  // おしっぱなしの あいだは すこし だけ おされ つづける（子どもに やさしく）
  if (held && G.vy < 0) g *= 0.75;
  G.vy = Math.min(VMAX, G.vy + g * dt);
  G.y += G.vy * dt;
  if (G.y < RINA_R) { G.y = RINA_R; G.vy = Math.max(0, G.vy); }
  if (G.y > VH - RINA_R) { G.y = VH - RINA_R; G.vy = Math.min(0, G.vy); }

  // あわを うつ（かってに）
  if (!G.done) {
    G.shootT -= dt;
    if (G.shootT <= 0) {
      G.shootT += SHOOT_GAP;
      const ang = G.triple > 0 ? [-0.30, 0, 0.30] : [0];
      for (const a of ang) {
        G.shots.push({ x: RINA_X + 22, y: G.y, vx: Math.cos(a) * SHOT_V,
                       vy: Math.sin(a) * SHOT_V, r: SHOT_R });
      }
      sfxShoot();
    }
  }

  // てきを 出す
  const w = G.waves;
  while (G.wi < w.foes.length && w.foes[G.wi].t <= G.t) {
    const s = w.foes[G.wi++];
    const f = FOE[s.kind];
    G.foes.push({ kind: s.kind, x: G.VW + f.r + 10, y: s.y, y0: s.y, hp: f.hp, r: f.r,
                  vx: -(G.spd + Math.abs(f.vx)), ph: Math.random() * 6.283,
                  st: 0, shootT: f.shoot ? f.shoot * (0.6 + Math.random() * 0.6) : 0 });
  }
  while (G.ii < w.items.length && w.items[G.ii].t <= G.t) {
    const s = w.items[G.ii++];
    G.items.push({ kind: s.kind, x: G.VW + 20, y: s.y, r: 24, ph: Math.random() * 6.283 });
  }

  // ボス
  const st = STAGES[G.si];
  if (st.boss && !G.boss && G.t > st.len - 8) {
    const b = BOSS[st.boss];
    G.boss = { key: st.boss, x: G.VW + b.r + 20, y: VH / 2, hp: b.hp, max: b.hp, r: b.r,
               dir: 1, shootT: 1.4, t: 0, hurt: 0 };
    pop(G.VW * 0.5, VH * 0.3, b.name + ' が きた！', '#FFD166');
    // ボスは ここだけの しょうぶ に する。ここまでの きずは 治して あげる。
    if (G.hp < G.maxHp) {
      G.hp = G.maxHp;
      pop(RINA_X + 40, G.y - 40, 'たいりょく ぜんかい！', '#FF9CC0');
    }
    sfxBoss();
  }

  updateFoes(dt);
  updateBoss(dt);
  updateShots(dt);
  updateItems(dt);

  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter((p) => p.t < 1.6);
  for (const p of G.puffs) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= 0.96;
  }
  G.puffs = G.puffs.filter((p) => p.t < p.life);

  // おわり
  if (!G.done) {
    if (st.boss) {
      if (G.boss && G.boss.hp <= 0) finish(true);
    } else if (G.t >= st.len) finish(true);
    if (G.hp <= 0) finish(false);
  } else {
    G.endT += dt;
    if (G.endT > 1.5) G.screen = G.win ? 'clear' : 'over';
  }
}

function updateFoes(dt) {
  for (const e of G.foes) {
    const f = FOE[e.kind];
    e.st += dt;
    e.x += e.vx * dt;
    if (f.pat === 'wave') e.y = e.y0 + Math.sin(e.st * 2.1 + e.ph) * f.amp;
    else if (f.pat === 'zig') {
      const u = ((e.st * 0.55 + e.ph) % 2);
      e.y = e.y0 + (u < 1 ? u * 2 - 1 : 3 - u * 2) * f.amp * 0.5;
    }
    e.y = Math.max(e.r, Math.min(VH - e.r, e.y));
    if (f.shoot && e.x < G.VW - 40) {
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = f.shoot;
        G.eshots.push({ x: e.x - e.r, y: e.y, vx: -195, vy: 0, r: 10 });
      }
    }
    // ぶつかった？
    if (!G.done) hitCheck(e.x, e.y, e.r);
  }
  G.foes = G.foes.filter((e) => e.x > -e.r - 40 && e.hp > 0);
}

function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  const d = BOSS[b.key];
  b.t += dt;
  if (b.hurt > 0) b.hurt -= dt;
  const tx = G.VW - b.r - 50;
  if (b.x > tx) b.x = Math.max(tx, b.x - 160 * dt);
  else {
    b.y += b.dir * d.spd * dt;
    if (b.y < b.r + 10) { b.y = b.r + 10; b.dir = 1; }
    if (b.y > VH - b.r - 10) { b.y = VH - b.r - 10; b.dir = -1; }
    if (b.hp > 0) {
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = d.shoot;
        // まっすぐ 左へ うつ。ねらいうち に すると
        // 「あてるには 前に いる → かならず 当たる」で よけようが なくなる。
        const sp = 250;
        G.eshots.push({ x: b.x - b.r * 0.6, y: b.y, vx: -sp, vy: 0, r: 12 });
        if (b.hp < b.max * 0.45) {
          G.eshots.push({ x: b.x - b.r * 0.6, y: b.y - 105, vx: -sp, vy: 0, r: 11 });
          G.eshots.push({ x: b.x - b.r * 0.6, y: b.y + 105, vx: -sp, vy: 0, r: 11 });
        }
      }
    }
  }
  if (b.hp > 0 && !G.done) hitCheck(b.x, b.y, b.r * 0.86);
}

function updateShots(dt) {
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
  G.shots = G.shots.filter((s) => s.x < G.VW + 30 && s.y > -20 && s.y < VH + 20);

  for (const s of G.shots) {
    if (s.dead) continue;
    for (const e of G.foes) {
      if (e.hp <= 0) continue;
      if (Math.hypot(s.x - e.x, s.y - e.y) < s.r + e.r) {
        s.dead = 1;
        e.hp--;
        puff(s.x, s.y, 'rgba(180,230,255,0.9)', 4, 90);
        if (e.hp <= 0) {
          const f = FOE[e.kind];
          G.kills++;
          G.score += f.pts;
          puff(e.x, e.y, f.col, 10, 150);
          pop(e.x, e.y, '+' + f.pts, '#FFE066');
          sfxPop();
        }
        break;
      }
    }
    if (s.dead) continue;
    const b = G.boss;
    if (b && b.hp > 0 && Math.hypot(s.x - b.x, s.y - b.y) < s.r + b.r) {
      s.dead = 1;
      b.hp--;
      b.hurt = 0.12;
      puff(s.x, s.y, 'rgba(255,230,120,0.9)', 4, 90);
      sfxPop();
      if (b.hp <= 0) {
        G.score += 300;
        puff(b.x, b.y, BOSS[b.key].col, 30, 260);
        pop(b.x, b.y, 'やったー！', '#FFE066');
      }
    }
  }
  G.shots = G.shots.filter((s) => !s.dead);

  for (const s of G.eshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
  G.eshots = G.eshots.filter((s) => s.x > -30 && s.x < G.VW + 60 && s.y > -30 && s.y < VH + 30);
  if (!G.done) for (const s of G.eshots) {
    if (Math.hypot(s.x - RINA_X, s.y - G.y) < s.r + RINA_R) {
      if (damage()) { s.x = -999; }
    }
  }
}

function updateItems(dt) {
  for (const it of G.items) {
    it.x -= G.spd * dt;
    it.y += Math.sin(G.t * 2.4 + it.ph) * 24 * dt;
    // 近くまで 来たら すこし 吸いよせる。とれない アイテムは ないほうが いい。
    const d = Math.hypot(it.x - RINA_X, it.y - G.y);
    if (d < 200) {
      it.x += (RINA_X - it.x) / d * 130 * dt;
      it.y += (G.y - it.y) / d * 130 * dt;
    }
  }
  G.items = G.items.filter((it) => it.x > -40 && !it.got);
  for (const it of G.items) {
    if (Math.hypot(it.x - RINA_X, it.y - G.y) < it.r + RINA_R + 12) {
      it.got = 1;
      if (it.kind === 'heart') {
        G.hp = Math.min(G.maxHp + 2, G.hp + 1);
        pop(it.x, it.y, 'たいりょく＋1', '#FF9CC0');
      } else {
        G.triple = 11;
        pop(it.x, it.y, 'あわ 3ほうこう！', '#FFE066');
      }
      G.score += 30;
      puff(it.x, it.y, '#FFE066', 10, 140);
      sfxItem();
    }
  }
}

function hitCheck(x, y, r) {
  if (Math.hypot(x - RINA_X, y - G.y) < r + RINA_R) damage();
}

function damage() {
  if (G.inv > 0 || G.done) return false;
  G.hp--;
  G.inv = INV_T;
  G.shake = 0.35;
  puff(RINA_X, G.y, '#FF8080', 12, 170);
  pop(RINA_X, G.y - 30, 'いたい！', '#FF9C9C');
  sfxHurt();
  return true;
}

function finish(win) {
  G.done = true;
  G.win = win;
  G.endT = 0;
  bgmStop();
  if (win) {
    G.stars = G.hp >= G.maxHp ? 3 : G.hp >= 2 ? 2 : 1;
    const k = 's' + G.si;
    if ((save.star[k] || 0) < G.stars) save.star[k] = G.stars;
    failStreak = 0;
    storeSave();
  } else {
    failStreak++;
    G.justOpened = 0;
    if (failStreak >= 3 && !save.skip['s' + G.si]) {
      save.skip['s' + G.si] = 1;
      G.justOpened = 1;
    }
    storeSave();
  }
  sfxClear(win);
}

// のこりの ながさ（0〜1）
function progress() {
  const st = STAGES[G.si];
  if (st.boss && G.boss) return 1;
  return Math.max(0, Math.min(1, G.t / st.len));
}
