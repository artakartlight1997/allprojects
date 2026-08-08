// よこ に すすむ シューティング。
//
// ★ 画面は よこ長 なので、たてに すすむ シューティングだと 上下が
//   すぐ 画面の 外に なる。**左から 右へ すすむ** 形に した。
//   自分の 船は 左、てきは 右から くる。
//
// ★ たまは じどうで 出る。小学生が「うごかす」と「うつ」を 同時に
//   するのは むずかしいので、**ゆびで なぞる だけ**で あそべるように した。
//
// ★ めんの さいごに ボス。4めん・7めん・10めん のボスは **リナパパ**。
//   メガネの ちょいぽちゃが 円ばんに のって 出てくる。

'use strict';

// 版ばんごう。index.html の ?v= と 同じ 数字に する。
const GAME_VER = 4;

const VH = 450;

const SAVE_KEY = 'shooter.v1';

// seen … 一度でも 出会った ボス。会うまでは 選ぶ画面で「？」に する。
const save = { clear: [], best: {}, fails: {}, plays: 0, seen: {} };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(o.clear)) save.clear = o.clear.map((x) => !!x);
    if (o.best && typeof o.best === 'object') save.best = o.best;
    if (o.fails && typeof o.fails === 'object') save.fails = o.fails;
    if (o.seen && typeof o.seen === 'object') save.seen = o.seen;
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
// 3回 だめだと やさしく なる
function assistLevel(i) { return Math.min(3, Math.floor((save.fails['s' + i] || 0) / 3)); }
function extraHP() { return assistLevel(G.stage); }              // ライフが ふえる
function foeBulMul() { return [1, 0.90, 0.80, 0.70][assistLevel(G.stage)]; }  // てきの たまが おそく
function foeHpMul() { return [1, 0.92, 0.84, 0.74][assistLevel(G.stage)]; }

// --- てきの しゅるい ---------------------------------------------------------------

// ★ 小さくて 分からない と 言われたので 1.4倍に した。
// ★ さらに「パロディウス風」に して、敵を ぜんぶ **へんな 生き物**に した。
//   かっこいい 宇宙船だらけ より、ペンギンや モアイが 飛んでくる 方が
//   小学生には ウケる。
const FOES = {
  //                 大きさ  かたさ  点     うつ
  zako:  { r: 19, hp: 1, pt: 100, shoot: 0,    col: '#F4F0FA', name: 'ペンギン' },
  wave:  { r: 19, hp: 1, pt: 140, shoot: 0,    col: '#FF8FBB', name: 'タコ' },
  dive:  { r: 20, hp: 2, pt: 220, shoot: 0,    col: '#FFC0CB', name: 'とびブタ' },
  turret:{ r: 23, hp: 4, pt: 320, shoot: 1.5,  col: '#B0A89C', name: 'モアイ' },
  rock:  { r: 28, hp: 8, pt: 260, shoot: 0,    col: '#F7E6A8', name: 'プリン' },
  gunner:{ r: 22, hp: 3, pt: 380, shoot: 1.05, col: '#FFD166', name: 'ネコ' },
};

// ボス
const BOSSES = {
  moai: { r: 54, hp: 78,  pt: 3000, name: 'モアイ大王' },
  cat:  { r: 58, hp: 118, pt: 5000, name: 'デカネコ' },
  papa: { r: 56, hp: 108, pt: 6000, name: 'リナパパ' },
};

// --- めん -------------------------------------------------------------------------

function wv(t, k, n, gap, y, spd) { return { t, k, n, gap, y, spd }; }

// めんの なみを 作る。だんだん 数と はやさが ふえる。
function makeWaves(st) {
  const w = [];
  const hard = 1 + st * 0.10;
  let t = 1.2;
  const rows = 4 + Math.min(6, Math.floor(st * 0.8));
  for (let i = 0; i < rows; i++) {
    const n = 3 + ((st + i) % 3) + Math.floor(st / 3);
    const y = 0.20 + ((i * 0.27 + st * 0.11) % 0.6);
    const spd = (98 + st * 8) * hard * (0.9 + (i % 3) * 0.12);
    let k = 'zako';
    if (i % 4 === 1) k = 'wave';
    else if (i % 4 === 2) k = st >= 1 ? 'dive' : 'zako';
    else if (i % 4 === 3) k = st >= 2 ? 'turret' : 'wave';
    w.push(wv(t, k, n, 0.42, y, spd));
    // ★ そらの てきだけ を つづけると にげ場が なくなるので、
    //   ときどき 上下 はんたいの なみを かさねる。
    if (i % 3 === 2) w.push(wv(t + 0.6, 'zako', n, 0.36, 1 - y, spd * 1.05));
    if (st >= 4 && i % 5 === 4) w.push(wv(t + 0.3, 'rock', 2, 1.1, 0.5, 70 + st * 3));
    if (st >= 5 && i % 4 === 0) w.push(wv(t + 0.9, 'gunner', 2, 0.9, y + 0.15, 80 + st * 3));
    if (st >= 6 && i % 3 === 1) w.push(wv(t + 1.5, 'turret', 2, 0.8, 1 - y, 90 + st * 4));
    t += 3.4 - Math.min(1.4, st * 0.13);
  }
  return w;
}

// ★ めんの 名前に ボスの 名前を 出さない。
//   選ぶ画面で ラスボスが 分かって しまうと、出てきた ときの
//   おどろきが なくなる（「ドン引き」と 言われた）。
const S_NAMES = [
  '1. 出発だペンギン', '2. タコ大群', '3. モアイの砲台', '4. 未知の影',
  '5. プリンの帯', '6. ネコが狙う', '7. 再びあの影', '8. 弾の雨',
  '9. ブタ突進ラッシュ', '10. 最後の影',
];
const S_BOSS = ['moai', 'moai', 'cat', 'papa', 'moai', 'cat', 'papa', 'cat', 'moai', 'papa'];

const STAGES = S_NAMES.map((name, i) => ({
  name, boss: S_BOSS[i], bossHp: 1 + i * 0.15, waves: makeWaves(i),
}));

// --- じょうたい -------------------------------------------------------------------

const G = {
  screen: 'title',
  stage: 0,
  S: null,
  px: 90, py: 225,
  tx: 90, ty: 225,     // 船の 行き先（ゆびで ひっぱると ここが うごく）
  fingerX: null, fingerY: 0,
  hp: 3, maxhp: 3,
  pw: 1,               // たまの つよさ 1〜4
  shield: 0,
  inv: 0,              // やられた あと 少しの あいだ 無てき
  fire: 0,
  shots: [], ebul: [], foes: [], items: [], puffs: [],
  trail: [], opts: [],   // ★ オプション（船の とおった みちを ついてくる 玉）
  bells: [],             // ★ ベル。うつと 色が 変わる（パロディウスの あれ）
  boss: null, bossIn: 0,
  intro: 0,          // ボス とうじょうの えんしゅつ の のこり時間
  wi: 0, pend: [],     // つぎに 出す なみ
  t: 0, score: 0,
  over: false, win: false, endT: 0,
  shake: 0,
  msg: '', msgT: 0,
};

function startStage(i) {
  audioStart();
  G.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  G.S = STAGES[G.stage];
  G.px = 90; G.py = 225; G.tx = 90; G.ty = 225;
  G.fingerX = null;
  G.maxhp = 3 + extraHP();
  G.hp = G.maxhp;
  // ★ はじめから 2。1本だと ボスに とどく まえに やられて つまらない。
  G.pw = assistLevel(G.stage) >= 2 ? 3 : 2;
  G.shield = 0;
  G.inv = 1.0;
  G.fire = 0;
  G.shots = []; G.ebul = []; G.foes = []; G.items = []; G.puffs = [];
  G.trail = []; G.opts = []; G.bells = [];
  G.boss = null; G.bossIn = 0;
  G.intro = 0;
  G.wi = 0; G.pend = [];
  G.t = 0; G.score = 0;
  G.over = false; G.win = false; G.endT = 0;
  G.shake = 0;
  G.msg = ''; G.msgT = 0;
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(G.stage);
}

function say(s) { G.msg = s; G.msgT = 2.4; }

// --- てきを 出す -------------------------------------------------------------------

function fieldW() { return typeof VW === 'number' ? VW : 800; }

function addFoe(k, x, y, spd) {
  const F = FOES[k];
  G.foes.push({
    k, x, y, r: F.r, hp: Math.max(1, Math.round(F.hp * foeHpMul())),
    spd, t: Math.random() * 6, y0: y, cd: 0.6 + Math.random() * F.shoot, hit: 0,
  });
}

function pumpWaves(dt) {
  const S = G.S;
  while (G.wi < S.waves.length && S.waves[G.wi].t <= G.t) {
    const w = S.waves[G.wi++];
    for (let i = 0; i < w.n; i++) {
      G.pend.push({ at: G.t + i * w.gap, k: w.k, y: w.y, spd: w.spd });
    }
  }
  for (let i = G.pend.length - 1; i >= 0; i--) {
    const p = G.pend[i];
    if (p.at <= G.t) {
      addFoe(p.k, fieldW() + 30, 44 + p.y * (VH - 80), p.spd);
      G.pend.splice(i, 1);
    }
  }
}

function spawnBoss() {
  const b = BOSSES[G.S.boss];
  G.boss = {
    k: G.S.boss, x: fieldW() + 70, y: VH / 2, r: b.r,
    hp: Math.round(b.hp * G.S.bossHp * foeHpMul()),
    max: Math.round(b.hp * G.S.bossHp * foeHpMul()),
    t: 0, cd: 1.4, ph: 0, hit: 0,
  };
  G.bossIn = 1;
  // ★ とうじょう の えんしゅつ。ここの あいだは たまも 出ないし
  //   ボスも 動かない。名前が 出て、それから 戦いが 始まる。
  G.intro = 2.6;
  G.ebul = [];
  save.seen[G.S.boss] = true;
  storeSave();
  if (G.S.boss === 'papa') sfxPapa(); else sfxBossIn();
  bgmHeat(1);
}

// --- たま ---------------------------------------------------------------------------

function optCount() { return G.pw >= 4 ? 2 : G.pw >= 3 ? 1 : 0; }

function shoot() {
  const x = G.px + 16, y = G.py;
  const v = 430;
  const add = (vy, dmg) => G.shots.push({ x, y, vx: v, vy, r: 6, dmg: dmg || 1, t: 0 });
  if (G.pw <= 1) add(0);
  else if (G.pw === 2) { G.shots.push({ x, y: y - 8, vx: v, vy: 0, r: 6, dmg: 1, t: 0 });
                         G.shots.push({ x, y: y + 8, vx: v, vy: 0, r: 6, dmg: 1, t: 0 }); }
  else if (G.pw === 3) { add(0, 2); add(-120); add(120); }
  else { add(0, 3); add(-140); add(140); G.shots.push({ x: G.px - 16, y, vx: -300, vy: 0, r: 6, dmg: 1, t: 0 }); }
  // ★ オプションも いっしょに うつ
  for (const o of G.opts) {
    G.shots.push({ x: o.x + 12, y: o.y, vx: v, vy: 0, r: 5, dmg: 1, t: 0 });
  }
  sfxShot();
}

function efire(x, y, sp, ang) {
  const s = sp * foeBulMul();
  G.ebul.push({ x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, r: 8, t: 0 });
}

function aimAt(x, y) { return Math.atan2(G.py - y, G.px - x); }

// --- あたり ---------------------------------------------------------------------------

function hit(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, r = a.r + b.r;
  return dx * dx + dy * dy < r * r;
}

function puff(x, y, col, n) {
  for (let i = 0; i < (n || 8); i++) {
    const a = Math.random() * 7, s = 40 + Math.random() * 140;
    G.puffs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.4 + Math.random() * 0.4, col });
  }
}

// ベルの 色と こうか（うつ たびに 次の 色へ）
const BELL = [
  { col: '#F4ECF7', name: '白いベル', txt: '1000点！' },
  { col: '#8FD6FF', name: '青いベル', txt: 'バリア！' },
  { col: '#FF8FA0', name: '赤いベル', txt: '画面ぜんぶに ドカン！' },
  { col: '#A8F0B0', name: '緑のベル', txt: 'ライフ かいふく！' },
];

function dropItem(x, y) {
  const r = Math.random();
  let k = null;
  if (r < 0.15) k = 'pw';
  else if (r < 0.21) k = 'hp';
  else if (r < 0.27) k = 'sh';
  else if (r < 0.40) {
    // ★ ベル。ふわふわ ういている。うつと 色が 変わる。
    G.bells.push({ x, y, vx: -46, vy: -18, c: 0, t: 0, r: 14 });
    return;
  }
  if (!k) return;
  G.items.push({ k, x, y, vx: -70, t: 0, r: 12 });
}

function takeBell(b) {
  const B = BELL[b.c];
  if (b.c === 0) G.score += 1000;
  else if (b.c === 1) { G.shield = 8; }
  else if (b.c === 2) {
    // 画面じゅうの てきに ダメージ
    for (const f of G.foes) { f.hp -= 3; f.hit = 1; }
    for (let i = G.foes.length - 1; i >= 0; i--) {
      if (G.foes[i].hp <= 0) {
        G.score += FOES[G.foes[i].k].pt;
        puff(G.foes[i].x, G.foes[i].y, FOES[G.foes[i].k].col, 10);
        G.foes.splice(i, 1);
      }
    }
    G.ebul = [];
    if (G.boss) { G.boss.hp -= 6; G.boss.hit = 1; }
    G.shake = 1;
  } else { G.hp = Math.min(G.maxhp, G.hp + 1); }
  G.score += 300;
  say(B.txt);
  sfxItem();
}

function takeItem(it) {
  if (it.k === 'pw') { G.pw = Math.min(4, G.pw + 1); say('たまが つよく なった！'); }
  else if (it.k === 'hp') { G.hp = Math.min(G.maxhp, G.hp + 1); say('ライフ かいふく！'); }
  else { G.shield = 6; say('バリア！'); }
  G.score += 150;
  sfxItem();
}

function hurt() {
  if (G.inv > 0 || G.over) return;
  if (G.shield > 0) { G.shield = 0; G.inv = 0.8; sfxGuard(); puff(G.px, G.py, '#8FD6FF', 14); return; }
  G.hp--;
  G.inv = 1.6;
  G.shake = 1;
  G.pw = Math.max(2, G.pw - 1);
  puff(G.px, G.py, '#FF8FA0', 16);
  sfxHurt();
  if (G.hp <= 0) finish(false);
}

// --- 1コマ ----------------------------------------------------------------------------

function update(dt) {
  if (G.screen !== 'play') return;
  bgmPump();
  G.shake = Math.max(0, G.shake - dt * 3);
  G.msgT = Math.max(0, G.msgT - dt);
  for (const p of G.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
  G.puffs = G.puffs.filter((p) => p.t < p.life);

  if (G.over) {
    G.endT += dt;
    if (G.endT > 1.8) { bgmStop(); G.screen = 'result'; }
    return;
  }

  // ★ とうじょう の えんしゅつ中。船だけ 動かせる。
  if (G.intro > 0) {
    G.intro -= dt;
    G.inv = Math.max(G.inv, 0.4);
    const W3 = fieldW();
    G.tx = Math.max(24, Math.min(W3 - 24, G.tx));
    G.ty = Math.max(44, Math.min(VH - 20, G.ty));
    G.px += (G.tx - G.px) * Math.min(1, dt * 22);
    G.py += (G.ty - G.py) * Math.min(1, dt * 22);
    if (G.intro <= 0) say(BOSSES[G.S.boss].name + ' あらわれた！');
    return;
  }

  G.t += dt;
  G.inv = Math.max(0, G.inv - dt);
  G.shield = Math.max(0, G.shield - dt);
  if (G.bossIn > 0) G.bossIn = Math.max(0, G.bossIn - dt * 0.7);

  // 船（ゆびの ところへ すーっと よる）
  const W2 = fieldW();
  G.tx = Math.max(24, Math.min(W2 - 24, G.tx));
  G.ty = Math.max(44, Math.min(VH - 20, G.ty));
  G.px += (G.tx - G.px) * Math.min(1, dt * 22);
  G.py += (G.ty - G.py) * Math.min(1, dt * 22);

  // ★ オプション。船の とおった みちを おくれて ついてくる。
  G.trail.unshift({ x: G.px, y: G.py });
  if (G.trail.length > 90) G.trail.length = 90;
  const nOpt = optCount();
  while (G.opts.length < nOpt) G.opts.push({ x: G.px, y: G.py });
  while (G.opts.length > nOpt) G.opts.pop();
  for (let i = 0; i < G.opts.length; i++) {
    const t2 = G.trail[Math.min(G.trail.length - 1, 16 + i * 16)];
    if (t2) { G.opts[i].x = t2.x; G.opts[i].y = t2.y; }
  }

  // うつ
  G.fire -= dt;
  if (G.fire <= 0) { shoot(); G.fire = 0.14; }

  // なみ
  if (!G.boss) {
    pumpWaves(dt);
    const done = G.wi >= G.S.waves.length && !G.pend.length && !G.foes.length;
    if (done) spawnBoss();
  }

  // じぶんの たま
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt; }
  G.shots = G.shots.filter((s) => s.x > -20 && s.x < W2 + 20 && s.y > -20 && s.y < VH + 20);

  // てき
  for (const f of G.foes) {
    f.t += dt;
    f.hit = Math.max(0, f.hit - dt * 6);
    if (f.k === 'wave') { f.x -= f.spd * dt; f.y = f.y0 + Math.sin(f.t * 2.6) * 52; }
    else if (f.k === 'dive') {
      f.x -= f.spd * dt;
      f.y += Math.sign(G.py - f.y) * Math.min(72, Math.abs(G.py - f.y) * 2.4) * dt;
    } else if (f.k === 'gunner') {
      f.x -= f.spd * dt * (f.x > W2 * 0.6 ? 1 : 0.25);
      f.y += Math.sin(f.t * 1.6) * 30 * dt;
    } else { f.x -= f.spd * dt; }
    f.y = Math.max(30, Math.min(VH - 14, f.y));
    const F = FOES[f.k];
    if (F.shoot) {
      f.cd -= dt;
      if (f.cd <= 0 && f.x < W2 - 10) {
        f.cd = F.shoot * (0.8 + Math.random() * 0.5);
        efire(f.x, f.y, 152 + G.stage * 5, aimAt(f.x, f.y));
        if (f.k === 'gunner' && G.stage >= 6) {
          efire(f.x, f.y, 150, aimAt(f.x, f.y) + 0.25);
          efire(f.x, f.y, 150, aimAt(f.x, f.y) - 0.25);
        }
      }
    }
  }
  G.foes = G.foes.filter((f) => f.x > -40);

  // ボス
  if (G.boss) updateBoss(dt);

  // てきの たま
  for (const b of G.ebul) { b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt; }
  G.ebul = G.ebul.filter((b) => b.x > -20 && b.x < W2 + 20 && b.y > -20 && b.y < VH + 20);

  // アイテム
  for (const it of G.items) { it.x += it.vx * dt; it.t += dt; it.y += Math.sin(it.t * 3) * 24 * dt; }
  G.items = G.items.filter((it) => it.x > -30);

  // ベル（ふわふわ ういて、うつと はねる）
  for (const b of G.bells) {
    b.t += dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 26 * dt;                 // ゆっくり 落ちる
    if (b.y > VH - 24) { b.y = VH - 24; b.vy = -Math.abs(b.vy) * 0.6 - 20; }
    if (b.y < 46) { b.y = 46; b.vy = Math.abs(b.vy); }
    b.vx += (-46 - b.vx) * dt;
  }
  G.bells = G.bells.filter((b) => b.x > -34);

  collide();
}

function updateBoss(dt) {
  const b = G.boss;
  b.t += dt;
  b.hit = Math.max(0, b.hit - dt * 6);
  const W2 = fieldW();
  const homeX = W2 - 90;
  if (b.x > homeX) { b.x -= 90 * dt; return; }
  b.y = VH / 2 + Math.sin(b.t * 0.9) * (VH * 0.30);
  b.cd -= dt;
  const wild = b.hp < b.max * 0.4 ? 1 : 0;
  if (b.cd <= 0) {
    const sp = 138 + G.stage * 6 + wild * 26;
    if (b.k === 'moai') {
      b.cd = 1.5 - wild * 0.4;
      for (let i = -2; i <= 2; i++) efire(b.x - 20, b.y, sp, Math.PI + i * 0.22);
    } else if (b.k === 'cat') {
      b.cd = 1.15 - wild * 0.35;
      b.ph++;
      if (b.ph % 2) { for (let i = 0; i < 8; i++) efire(b.x, b.y, sp * 0.8, i * (Math.PI / 4) + b.t); }
      else { for (let i = -1; i <= 1; i++) efire(b.x - 20, b.y + i * 26, sp * 1.1, aimAt(b.x, b.y + i * 26)); }
    } else {
      // ★ リナパパ。ケーキを ばらまいて、ときどき メガネ ビーム。
      b.cd = 1.3 - wild * 0.4;
      b.ph++;
      if (b.ph % 3 === 0) {
        // ★ ねらいうちの ちらしは 5本まで。7本だと よけ場が なくなる。
        for (let i = -2; i <= 2; i++) efire(b.x - 20, b.y, sp * 1.15, aimAt(b.x, b.y) + i * 0.18);
      } else {
        for (let i = 0; i < 5; i++) {
          efire(b.x - 20, b.y - 30 + i * 15, sp * (0.7 + i * 0.08), Math.PI + Math.sin(b.t + i) * 0.3);
        }
      }
    }
  }
}

function collide() {
  const W2 = fieldW();
  // じぶんの たま → てき
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    let gone = false;
    for (let j = G.foes.length - 1; j >= 0; j--) {
      const f = G.foes[j];
      if (!hit(s, f)) continue;
      f.hp -= s.dmg; f.hit = 1;
      G.shots.splice(i, 1); gone = true;
      if (f.hp <= 0) {
        G.score += FOES[f.k].pt;
        puff(f.x, f.y, FOES[f.k].col, 10);
        dropItem(f.x, f.y);
        sfxBoom(false);
        G.foes.splice(j, 1);
      }
      break;
    }
    if (gone) continue;
    let belled = false;
    for (const bl of G.bells) {
      if (!hit(s, bl)) continue;
      // ★ ベルは こわれない。色が 次に 変わって 上に はねる。
      bl.c = (bl.c + 1) % BELL.length;
      bl.vy = -90;
      bl.vx = 40;
      G.shots.splice(i, 1);
      sfxGuard();
      belled = true;
      break;
    }
    if (belled) continue;
    const b = G.boss;
    if (b && b.x < W2 + 40 && hit(s, b)) {
      b.hp -= s.dmg; b.hit = 1;
      G.shots.splice(i, 1);
      if (b.hp <= 0) {
        G.score += BOSSES[b.k].pt;
        puff(b.x, b.y, '#FFD166', 40);
        sfxBossDown();
        G.boss = null;
        G.shake = 1;
        finish(true);
      }
    }
  }
  // てき・たま → じぶん
  // ★ てきを 大きく した ぶん、船の あたり はんていは 小さく する。
  const me = { x: G.px, y: G.py, r: 9 };
  for (let i = G.ebul.length - 1; i >= 0; i--) {
    if (hit(G.ebul[i], me)) { G.ebul.splice(i, 1); hurt(); }
  }
  for (const f of G.foes) if (hit(f, me)) { hurt(); f.hp = 0; puff(f.x, f.y, FOES[f.k].col, 8); }
  G.foes = G.foes.filter((f) => f.hp > 0);
  if (G.boss && hit(G.boss, me)) hurt();
  for (let i = G.items.length - 1; i >= 0; i--) {
    if (hit(G.items[i], { x: G.px, y: G.py, r: 18 })) { takeItem(G.items[i]); G.items.splice(i, 1); }
  }
  for (let i = G.bells.length - 1; i >= 0; i--) {
    if (hit(G.bells[i], { x: G.px, y: G.py, r: 16 })) { takeBell(G.bells[i]); G.bells.splice(i, 1); }
  }
}

function finish(win) {
  if (G.over) return;
  G.over = true;
  G.win = win;
  G.endT = 0;
  const key = 's' + G.stage;
  if (win) {
    save.clear[G.stage] = true;
    save.best[key] = Math.max(save.best[key] || 0, G.score);
  } else {
    save.fails[key] = (save.fails[key] || 0) + 1;
  }
  storeSave();
  sfxEnd(win);
}
