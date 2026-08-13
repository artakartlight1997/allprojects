// エイトくんの うちゅう要塞
//
// ★ 1980年代の よこスクロールシューティング（グラディウス）が 下じき。
//   いちばんの あじは **パワーアップベルト**。
//   ・カプセルを とると 下の ベルトの 光が 1つ 右へ すすむ
//   ・「パワーアップ」ボタンを おすと、いま 光って いる ものが 手に 入る
//   ・すぐ とるか、がまんして 先の つよい ものを ねらうか を えらべる
//   これが ある だけで、ただ うつだけの ゲームが「かんがえる」ゲームに なる。
//
//   スピード → ミサイル → ダブル → レーザー → オプション → バリア
//
// ★ オプションは じぶんの うごいた 道を あとから ついてくる（本家と おなじ）。
//   2つ まで つく。オプションも いっしょに うつので 火力が 一気に あがる。
//
// ★ やられると パワーが ぜんぶ 消える（本家と おなじ きびしさ）。
//   ただし ちいさい 子には つらいので、**とちゅうから やりなおせる**。
//
// ★ そうさ … 左の スティック（画面の どこでも）で うごく。
//   たまは おしっぱなしで 出つづける ので、うつ ボタンは いらない。
//   右の ボタンは「パワーアップ」だけ。

'use strict';

const GAME_VER = 1;
const HUD = 30;

// パワーアップの ならび
const POWERS = [
  { key: 'SPD', name: 'スピード', col: '#8AD8F0' },
  { key: 'MIS', name: 'ミサイル', col: '#FFD24A' },
  { key: 'DBL', name: 'ダブル', col: '#9AE86A' },
  { key: 'LAS', name: 'レーザー', col: '#FF6FA8' },
  { key: 'OPT', name: 'オプション', col: '#C8A8F0' },
  { key: 'BAR', name: 'バリア', col: '#FF9A6A' },
];

const STAGES = [
  { name: 'はっしん', len: 30, foe: 0.9, spd: 1.00, boss: 'CORE', sky: ['#0A1030', '#1E2A5E'] },
  { name: 'いん石たい', len: 32, foe: 1.0, spd: 1.05, boss: 'ROCK', sky: ['#1A1024', '#4A2A3E'] },
  { name: 'ようさい 外かべ', len: 34, foe: 1.1, spd: 1.10, boss: 'CORE', sky: ['#08202A', '#1A4A56'] },
  { name: 'レーザーの ろうか', len: 36, foe: 1.2, spd: 1.15, boss: 'TWIN', sky: ['#201030', '#4A2078'] },
  { name: 'ほのおの エンジン', len: 38, foe: 1.3, spd: 1.20, boss: 'ROCK', sky: ['#2A1008', '#6E2A18'] },
  { name: 'こうそく つうろ', len: 40, foe: 1.4, spd: 1.30, boss: 'TWIN', sky: ['#08182A', '#1A3A6E'] },
  { name: 'てきの ぼかん', len: 42, foe: 1.5, spd: 1.35, boss: 'CORE', sky: ['#241028', '#5A2A52'] },
  { name: 'さいごの コア', len: 46, foe: 1.7, spd: 1.40, boss: 'BOSS', sky: ['#100818', '#3A1050'] },
];

const SAVE_KEY = 'space.save.v1';
const save = { clear: {}, best: {}, plays: 0, kills: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (s.best && typeof s.best === 'object') save.best = s.best;
  if (Number.isFinite(s.plays)) save.plays = s.plays;
  if (Number.isFinite(s.kills)) save.kills = s.kills;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- じょうたい ---------------------------------------------------------------------

const G = {
  screen: 'title', t: 0,
  si: 0, st: null, rnd: null,
  ship: null, shots: [], foes: [], bolts: [], pops: [], stars: [], parts: [], caps: [],
  wave: 0, waveT: 0, dist: 0, boss: null, groupSeen: [],
  lives: 3, score: 0, kills: 0,
  over: false, win: false, deadT: 0, clearT: 0,
  msg: '', msgT: 0, shake: 0, checkWave: 0,
};

function newShip(keepPower) {
  const p = G.ship;
  return {
    x: VW * 0.16, y: VH * 0.5, vx: 0, vy: 0,
    r: 9, invT: 2.4, fireT: 0,      // ★ あたり はんいは 見た目より 小さめ
    meter: keepPower && p ? p.meter : 0,
    spd: keepPower && p ? p.spd : 0,
    mis: keepPower && p ? p.mis : false,
    dbl: keepPower && p ? p.dbl : false,
    las: keepPower && p ? p.las : false,
    opt: keepPower && p ? p.opt : 0,
    bar: keepPower && p ? p.bar : 0,
    trail: [],
  };
}

function startStage(i) {
  audioStart();
  G.si = i; G.st = STAGES[i];
  G.rnd = rng(0x5A17 + i * 3571);
  G.lives = 3; G.score = 0; G.kills = 0;
  G.over = false; G.win = false;
  G.checkWave = 0;
  G.screen = 'play';
  G.stars = [];
  for (let k = 0; k < 90; k++) {
    G.stars.push({ x: Math.random() * VW, y: Math.random() * VH,
                   z: 0.3 + Math.random() * 1.4 });
  }
  resetRun(false);
  save.plays++; storeSave();
  G.msg = 'カプセルを とって「パワーアップ」！'; G.msgT = 2.6;
}

function resetRun(keepPower) {
  G.ship = newShip(keepPower);
  G.shots = []; G.foes = []; G.bolts = []; G.pops = []; G.parts = []; G.caps = [];
  G.boss = null;
  G.groupSeen = [];
  G.wave = G.checkWave;
  G.waveT = 1.2;
  G.dist = G.wave;
  G.deadT = 0; G.clearT = 0;
}

// --- おと ---------------------------------------------------------------------------

function sfxPew() { if (A.ctx) { const t = anow(); tone(t, 92, 0.05, 0.055, 'square', null, 80); } }
function sfxLaser() { if (A.ctx) { const t = anow(); tone(t, 96, 0.07, 0.05, 'sawtooth', null, 86); nz(t, 0.05, 0.03, 3000, 9000); } }
function sfxBoom() { if (A.ctx) { const t = anow(); nz(t, 0.16, 0.16, 200, 3000); tone(t, 48, 0.12, 0.09, 'triangle', null, 36); } }
function sfxCap() { if (A.ctx) bleep(anow(), [84, 91], 0.04, 0.07, 0.10); }
function sfxPow() { if (A.ctx) { const t = anow(); bleep(t, [72, 79, 84, 91], 0.045, 0.10, 0.13); nz(t, 0.06, 0.05, 4000, 10000); } }
function sfxHitFoe() { if (A.ctx) { const t = anow(); nz(t, 0.05, 0.08, 1500, 6000); } }
function sfxDie() { if (A.ctx) { const t = anow(); bleep(t, [72, 64, 57, 50, 43], 0.09, 0.16, 0.14); nz(t + 0.3, 0.5, 0.12, 100, 1200); } }
function sfxWin() { if (A.ctx) { const t = anow(); bleep(t, [72, 76, 79, 84, 88, 91, 96], 0.07, 0.16, 0.14); kick(t, 0.7); kick(t + 0.4, 0.7); } }

// --- てきを 出す ---------------------------------------------------------------------
//
// ★ 「へび」「かべ」「まわりこみ」など、パターンを まぜて 出す。
//   グラディウスと おなじで、へびを ぜんぶ たおすと カプセルが 出る。

function spawnWave(n) {
  const st = G.st, rnd = G.rnd;
  const kind = n % 5;
  const grp = 'g' + n;
  const spd = 172 * st.spd;
  if (kind === 0) {
    // へび（ななめに つらなって 入ってくる）→ ぜんぶ たおすと カプセル
    const y0 = VH * (0.20 + rnd() * 0.55);
    const dir = rnd() < 0.5 ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      G.foes.push(mkFoe('SNAKE', VW + 40 + i * 46, y0 + dir * i * 26, -spd * 0.9, 0, grp));
    }
  } else if (kind === 1) {
    // かべ（たてに ならぶ。すきまを ぬける）
    // ★ すきまは 2つぶん あける。1つだと ほとんど 通れなかった。
    const gap = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < 5; i++) {
      if (i === gap || i === gap + 1) continue;
      G.foes.push(mkFoe('WALL', VW + 40, VH * (0.16 + i * 0.17), -spd * 0.7, 0, ''));
    }
  } else if (kind === 2) {
    // まわりこみ（上下から 入って 弾を うつ）
    for (let i = 0; i < 3; i++) {
      const top = rnd() < 0.5;
      G.foes.push(mkFoe('DIVE', VW + 40 + i * 60, top ? -20 : VH + 20,
                        -spd * 0.8, top ? spd * 0.5 : -spd * 0.5, ''));
    }
  } else if (kind === 3) {
    // ほうだい（下の 地面に へばりつく。たまを うつ）
    for (let i = 0; i < 2; i++) {
      G.foes.push(mkFoe('TURRET', VW + 40 + i * 130, VH - 40, -spd * 0.6, 0, ''));
    }
    const y0 = VH * (0.2 + rnd() * 0.4);
    for (let i = 0; i < 3; i++) {
      G.foes.push(mkFoe('SNAKE', VW + 200 + i * 44, y0, -spd * 0.9, 0, 'h' + n));
    }
  } else {
    // にじゅうへび（上と 下から）
    for (let s2 = 0; s2 < 2; s2++) {
      const y0 = s2 ? VH * 0.24 : VH * 0.72;
      for (let i = 0; i < 3; i++) {
        G.foes.push(mkFoe('SNAKE', VW + 40 + i * 44, y0, -spd * 0.9, 0, 's' + n + '_' + s2));
      }
    }
  }
}

// カプセルの もとに なる「かたまり」を おぼえて おく
function noteGroups() {
  const seen = {};
  for (const f of G.foes) {
    if (!f.grp || seen[f.grp]) continue;
    seen[f.grp] = true;
    if (!G.groupSeen.some((g) => g.id === f.grp)) {
      G.groupSeen.push({ id: f.grp, x: f.x, y: f.y, done: false });
    }
  }
}

function mkFoe(kind, x, y, vx, vy, grp) {
  const hp = kind === 'WALL' ? 2 : kind === 'TURRET' ? 3 : 1;
  // ★ 「キャラが 単調」と 言われて 絵を こまかく したので 少し 大きく した
  //   （14→17 / かべ 17→20）。ただし **ぶつかる はんい(hr)は 前のまま**。
  //   大きくしたら 8めんが クリアできなく なった ので、
  //   「たまは 当てやすく、ぶつかりは やさしいまま」に した。
  return { kind: kind, x: x, y: y, vx: vx, vy: vy,
           r: kind === 'WALL' ? 20 : 17, hr: kind === 'WALL' ? 17 : 14,
           hp: hp, t: Math.random() * 3, grp: grp, fireT: 0.8 + Math.random() * 1.2, alive: true };
}

function spawnBoss() {
  const st = G.st;
  // ★ たいりょくが 少なすぎて 1びょうで たおせて しまった ので 大きくした
  const hp = st.boss === 'BOSS' ? 170 : st.boss === 'TWIN' ? 110 : 80;
  G.boss = {
    kind: st.boss, x: VW + 120, y: VH * 0.5, vy: 30, hp: hp, maxHp: hp,
    t: 0, fireT: 1.2, hurt: 0, coreOpen: 0, phase: 0,
  };
  G.msg = 'ボス とうじょう！'; G.msgT = 2.0;
}

// --- こうしん -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.shake > 0) G.shake -= dt;
  for (const s of G.stars) {
    s.x -= s.z * 90 * dt;
    if (s.x < -2) { s.x = VW + 2; s.y = Math.random() * VH; }
  }
  if (G.screen !== 'play') { IN.taps.length = 0; return; }

  if (G.clearT > 0) {
    G.clearT -= dt;
    if (G.clearT <= 0) {
      G.over = true; G.win = true;
      const k = 's' + G.si;
      save.clear[k] = true;
      if ((save.best[k] || 0) < G.score) save.best[k] = G.score;
      storeSave();
    }
    stepThings(dt);
    IN.taps.length = 0;
    return;
  }
  if (G.deadT > 0) {
    G.deadT -= dt;
    if (G.deadT <= 0) {
      if (G.lives <= 0) { G.over = true; G.win = false; sfxOver(); }
      else resetRun(false);
    }
    stepThings(dt);
    IN.taps.length = 0;
    return;
  }
  if (G.over) { IN.taps.length = 0; return; }

  // ★ 「パワー」ボタンは 絵は かいて いたのに、ゆびで おした ときに
  //   どこにも つながって いなかった（キーボードだけ 動いて いた）。
  //   スマホでは オプションも バリアも ぜったいに 出せない バグ。
  if (IN.fireTap) { usePower(); IN.fireTap = false; }

  updateShip(dt);
  stepThings(dt);
  pickCaps();
  updateFoes(dt);
  if (G.boss) updateBoss(dt);

  // つぎの てきの かたまり
  if (!G.boss) {
    G.waveT -= dt;
    if (G.waveT <= 0) {
      if (G.wave >= G.st.len) {
        if (G.foes.length === 0) spawnBoss();
        G.waveT = 0.5;
      } else {
        spawnWave(G.wave);
        noteGroups();
        G.wave++;
        G.dist = G.wave;
        // ★ てきが 出る かんかく。せますぎると 画面が てきで うまって
        //   よけられなく なる（ロボットで 30びょうで 3回 やられた）。
        G.waveT = Math.max(1.35, 2.6 - G.st.foe * 0.55);
        // とちゅうの 目じるし
        // ★ 6かたまり ごとに 目じるし。12ごとだと 1回も とどかず、
        //   死ぬ たびに はじめから に なって いた。
        if (G.wave % 6 === 0) G.checkWave = G.wave;
      }
    }
  }
  IN.taps.length = 0;
}

function stepThings(dt) {
  for (const s of G.shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
  G.shots = G.shots.filter((s) => s.x < VW + 40 && s.x > -40 && s.y > -30 && s.y < VH + 30);
  for (const b of G.bolts) { b.x += b.vx * dt; b.y += b.vy * dt; }
  G.bolts = G.bolts.filter((b) => b.x > -30 && b.x < VW + 30 && b.y > -30 && b.y < VH + 30);
  for (const c of G.caps) { c.x += c.vx * dt; c.t += dt; }
  G.caps = G.caps.filter((c) => c.x > -30);
  for (const q of G.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  G.parts = G.parts.filter((q) => q.t < 0.7);
  for (const q of G.pops) q.t += dt;
  G.pops = G.pops.filter((q) => q.t < 0.9);
}

function updateShip(dt) {
  const p = G.ship;
  if (p.invT > 0) p.invT -= dt;
  const base = 210 + p.spd * 62;
  let mx = 0, my = 0;
  if (IN.hold) { mx = IN.ax; my = IN.ay; }
  if (KEYS.ArrowLeft) mx = -1;
  if (KEYS.ArrowRight) mx = 1;
  if (KEYS.ArrowUp) my = -1;
  if (KEYS.ArrowDown) my = 1;
  p.x = clamp(p.x + mx * base * dt, 18, VW - 26);
  p.y = clamp(p.y + my * base * dt, HUD + 18, VH - 46);

  // オプションの ための「通った 道」
  p.trail.push({ x: p.x, y: p.y });
  if (p.trail.length > 90) p.trail.shift();

  // たまは じどうで 出つづける
  p.fireT -= dt;
  const rate = p.las ? 0.13 : 0.16;
  if (p.fireT <= 0) {
    p.fireT = rate;
    fireFrom(p.x + 16, p.y);
    for (let i = 1; i <= p.opt; i++) {
      const o = optPos(i);
      if (o) fireFrom(o.x + 10, o.y);
    }
    if (p.las) sfxLaser(); else sfxPew();
  }
}

function fireFrom(x, y) {
  const p = G.ship;
  if (p.las) {
    G.shots.push({ x: x, y: y, vx: 1150, vy: 0, r: 6, dmg: 2, laser: true });
  } else {
    G.shots.push({ x: x, y: y, vx: 800, vy: 0, r: 5, dmg: 1 });
  }
  if (p.dbl) G.shots.push({ x: x, y: y, vx: 560, vy: -560, r: 5, dmg: 1 });
  if (p.mis) G.shots.push({ x: x, y: y + 6, vx: 380, vy: 250, r: 5, dmg: 2, mis: true });
}

function optPos(i) {
  const p = G.ship;
  const back = i * 22;
  const idx = p.trail.length - 1 - back;
  return idx >= 0 ? p.trail[idx] : null;
}

function usePower() {
  const p = G.ship;
  if (!p || G.deadT > 0 || G.over) return;
  if (p.meter <= 0) return;
  const k = POWERS[p.meter - 1].key;
  if (k === 'SPD') { if (p.spd >= 4) return; p.spd++; }
  else if (k === 'MIS') { if (p.mis) return; p.mis = true; }
  else if (k === 'DBL') { if (p.dbl) return; p.dbl = true; p.las = false; }
  else if (k === 'LAS') { if (p.las) return; p.las = true; p.dbl = false; }
  else if (k === 'OPT') { if (p.opt >= 2) return; p.opt++; }
  else if (k === 'BAR') { p.bar = 3; }
  p.meter = 0;
  G.pops.push({ x: p.x, y: p.y - 26, text: POWERS.find((q) => q.key === k).name + '！', t: 0, col: '#FFD24A' });
  sfxPow();
}

function updateFoes(dt) {
  const p = G.ship;
  for (const f of G.foes) {
    if (!f.alive) continue;
    f.t += dt;
    if (f.kind === 'SNAKE') {
      f.x += f.vx * dt;
      f.y += Math.sin(f.t * 3.2) * 70 * dt;
    } else if (f.kind === 'WALL') {
      f.x += f.vx * dt;
    } else if (f.kind === 'DIVE') {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y > VH * 0.34 && f.y < VH * 0.7) f.vy *= 0.94;
      f.fireT -= dt;
      if (f.fireT <= 0 && f.x < VW) { f.fireT = 2.8 / G.st.foe; shootAt(f); }
    } else if (f.kind === 'TURRET') {
      f.x += f.vx * dt;
      f.fireT -= dt;
      if (f.fireT <= 0 && f.x < VW - 10) { f.fireT = 2.4 / G.st.foe; shootAt(f); }
    }
    if (f.x < -40) f.alive = false;

    // ぶつかった か
    if (p.invT <= 0 && Math.hypot(f.x - p.x, f.y - p.y) < (f.hr || f.r) + p.r) {
      hitShip(); return;
    }
    // じぶんの たまが あたった か
    for (const s of G.shots) {
      if (s.dead) continue;
      if (Math.hypot(f.x - s.x, f.y - s.y) < f.r + s.r) {
        f.hp -= s.dmg;
        if (!s.laser) s.dead = true;
        sfxHitFoe();
        if (f.hp <= 0) killFoe(f);
        break;
      }
    }
  }
  G.shots = G.shots.filter((s) => !s.dead);
  const before = G.foes.length;
  G.foes = G.foes.filter((f) => f.alive);
  if (before !== G.foes.length) checkGroups();

  // てきの たま
  for (const b of G.bolts) {
    if (p.invT > 0) break;
    if (Math.hypot(b.x - p.x, b.y - p.y) < 6 + p.r) { hitShip(); return; }
  }
}

function shootAt(f) {
  const p = G.ship;
  const a = Math.atan2(p.y - f.y, p.x - f.x);
  const sp = 160 + G.st.spd * 45;
  G.bolts.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
}

function killFoe(f) {
  f.alive = false;
  // ★ カプセルは「へびを ぜんぶ たおす」でしか 出さないと、
  //   ロボットで 何十回 あそんでも 1こも 手に 入らなかった。
  //   ゲームの いちばんの あじ（パワーアップ）が つかえないので、
  //   ときどき ふつうの てきからも 出す ように した。
  if (!f.grp && Math.random() < 0.14) {
    G.caps.push({ x: f.x, y: f.y, vx: -110, t: 0 });
    sfxCap();
  }
  G.score += f.kind === 'TURRET' ? 300 : f.kind === 'WALL' ? 150 : 100;
  G.kills++; save.kills++;
  boom(f.x, f.y, f.kind === 'WALL' ? '#8AD8F0' : '#FFD24A');
  sfxBoom();
}

// へびを ぜんぶ たおしたら カプセルが 出る
function checkGroups() {
  const left = {};
  for (const f of G.foes) if (f.grp) left[f.grp] = (left[f.grp] || 0) + 1;
  for (const g of G.groupSeen) {
    if (!left[g.id]) {
      // すでに 出した か
      if (!g.done) {
        g.done = true;
        G.caps.push({ x: g.x, y: g.y, vx: -110, t: 0 });
        sfxCap();
      }
    }
  }
}

function boom(x, y, col) {
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, col: col });
  }
  G.shake = Math.max(G.shake, 0.12);
}

function hitShip() {
  const p = G.ship;
  if (p.bar > 0) {
    p.bar--; p.invT = 0.9;
    boom(p.x, p.y, '#FF9A6A');
    sfxHitFoe();
    return;
  }
  G.lives--;
  G.deadT = 1.6;
  boom(p.x, p.y, '#FF6F8A');
  G.shake = 0.45;
  sfxDie();
}

function updateBoss(dt) {
  const b = G.boss, p = G.ship;
  b.t += dt;
  if (b.hurt > 0) b.hurt -= dt;
  if (b.x > VW - 130) b.x -= 90 * dt;
  else {
    b.y += b.vy * dt;
    if (b.y < HUD + 70) { b.y = HUD + 70; b.vy = Math.abs(b.vy); }
    if (b.y > VH - 70) { b.y = VH - 70; b.vy = -Math.abs(b.vy); }
  }
  b.fireT -= dt;
  if (b.fireT <= 0 && b.x < VW) {
    const hurtK = 1 - b.hp / b.maxHp;
    b.fireT = Math.max(0.42, 1.15 - hurtK * 0.6);
    const sp = 200 + G.st.spd * 50;
    if (b.kind === 'TWIN') {
      for (const dy of [-34, 34]) {
        const a = Math.atan2(p.y - (b.y + dy), p.x - b.x);
        G.bolts.push({ x: b.x - 40, y: b.y + dy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
    } else if (b.kind === 'ROCK') {
      for (let i = -2; i <= 2; i++) {
        G.bolts.push({ x: b.x - 40, y: b.y, vx: -sp, vy: i * 62 });
      }
    } else {
      const a = Math.atan2(p.y - b.y, p.x - b.x);
      for (let i = -1; i <= 1; i++) {
        G.bolts.push({ x: b.x - 40, y: b.y,
                       vx: Math.cos(a + i * 0.22) * sp, vy: Math.sin(a + i * 0.22) * sp });
      }
      if (b.kind === 'BOSS' && b.hp < b.maxHp * 0.5) {
        for (let i = 0; i < 8; i++) {
          const aa = (i / 8) * Math.PI * 2;
          G.bolts.push({ x: b.x, y: b.y, vx: Math.cos(aa) * sp * 0.7, vy: Math.sin(aa) * sp * 0.7 });
        }
      }
    }
  }
  // あたり（コアは 左はしの まる）
  const cx = b.x - 34, cy = b.y;
  for (const s of G.shots) {
    if (s.dead) continue;
    if (Math.hypot(cx - s.x, cy - s.y) < 36 + s.r) {
      b.hp -= s.dmg; b.hurt = 0.12;
      if (!s.laser) s.dead = true;
      sfxHitFoe();
      if (b.hp <= 0) {
        boom(b.x, b.y, '#FFD24A'); boom(b.x - 30, b.y - 20, '#FF6F8A');
        G.score += 5000;
        G.boss = null;
        G.clearT = 2.2;
        G.shake = 0.6;
        sfxWin();
        return;
      }
    } else if (s.x > b.x - 60 && s.x < b.x + 60 && Math.abs(s.y - b.y) < 62) {
      // からだは はじく
      if (!s.laser) s.dead = true;
    }
  }
  G.shots = G.shots.filter((s) => !s.dead);
  if (p.invT <= 0 && Math.abs(p.x - b.x) < 58 && Math.abs(p.y - b.y) < 62) hitShip();
}

// カプセルを ひろう
function pickCaps() {
  const p = G.ship;
  for (const c of G.caps) {
    if (c.got) continue;
    if (Math.hypot(c.x - p.x, c.y - p.y) < 22 + p.r) {
      c.got = true;
      p.meter = Math.min(POWERS.length, p.meter + 1);
      G.score += 100;
      sfxCap();
    }
  }
  G.caps = G.caps.filter((c) => !c.got);
}

// キーボード
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyZ') { audioStart(); usePower(); }
});

// --- え ------------------------------------------------------------------------------

function drawShip(x, y, s, inv) {
  ctx.save();
  if (inv) ctx.globalAlpha = 0.45 + Math.sin(G.t * 30) * 0.4;
  // ふきだす ほのお
  ctx.fillStyle = '#FF9A3A';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.9, y);
  ctx.lineTo(x - s * (1.3 + Math.random() * 0.5), y - s * 0.16);
  ctx.lineTo(x - s * (1.3 + Math.random() * 0.5), y + s * 0.16);
  ctx.closePath(); ctx.fill();
  // 本体
  ctx.fillStyle = '#E8ECF4';
  ctx.beginPath();
  ctx.moveTo(x + s * 1.3, y);
  ctx.lineTo(x - s * 0.5, y - s * 0.52);
  ctx.lineTo(x - s * 0.9, y - s * 0.2);
  ctx.lineTo(x - s * 0.9, y + s * 0.2);
  ctx.lineTo(x - s * 0.5, y + s * 0.52);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4AA0E0';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y);
  ctx.lineTo(x - s * 0.2, y - s * 0.26);
  ctx.lineTo(x - s * 0.2, y + s * 0.26);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFD24A';
  circle(x + s * 0.1, y, s * 0.15); ctx.fill();
  ctx.restore();
}

// --- てきの 絵 ------------------------------------------------------------------------
//
// ★ 「キャラが 単調すぎて おもしろく ない」と 言われた ので 作りなおした。
//   まる・しかく だけ だった ものを、はねや エンジンの ひかり、まわる 目、
//   うごく パーツを つけて、しゅるいごとに はっきり ちがう かたちに した。
//   むれ（へび）の 中でも 1ぴきずつ 色が すこし ちがう。

function drawFoe(f) {
  const s = f.r;
  const x = f.x, y = f.y, t = f.t;
  const hurt = f.hp < (f.kind === 'WALL' ? 2 : f.kind === 'TURRET' ? 3 : 1);

  if (f.kind === 'WALL') {
    // ★ そうこうブロック。パネルの すじと リベット、まわりに 力ばの ゆらぎ
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(t * 6) * 0.12;
    ctx.strokeStyle = '#6AE0FF'; ctx.lineWidth = 3;
    rr(x - s * 1.15, y - s * 1.15, s * 2.3, s * 2.3, s * 0.4); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = hurt ? '#A85A5A' : '#7A8AA8';
    rr(x - s, y - s, s * 2, s * 2, s * 0.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(x - s, y - s, s * 2, s * 0.5, s * 0.22); ctx.fill();
    ctx.strokeStyle = '#3A4A68'; ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.9, y); ctx.lineTo(x + s * 0.9, y);
    ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x, y + s * 0.9);
    ctx.stroke();
    ctx.fillStyle = '#2A3450';
    for (const sg of [-1, 1]) for (const sg2 of [-1, 1]) {
      circle(x + sg * s * 0.72, y + sg2 * s * 0.72, s * 0.13); ctx.fill();
    }
    ctx.fillStyle = '#FFD24A';
    circle(x, y, s * 0.22 + Math.sin(t * 8) * s * 0.05); ctx.fill();

  } else if (f.kind === 'TURRET') {
    // ★ 地面の ほうだい。だいざ＋まわる ほうしん＋けいこくランプ
    const a = Math.atan2((G.ship ? G.ship.y : y) - y, (G.ship ? G.ship.x : x) - x);
    ctx.fillStyle = hurt ? '#A85A5A' : '#6A5A48';
    rr(x - s * 1.15, y - s * 0.2, s * 2.3, s * 1.4, s * 0.2); ctx.fill();
    ctx.fillStyle = '#8A7A58';
    rr(x - s * 1.15, y - s * 0.2, s * 2.3, s * 0.32, s * 0.14); ctx.fill();
    // ほうしん
    ctx.save();
    ctx.translate(x, y - s * 0.25);
    ctx.rotate(a);
    ctx.fillStyle = '#3A2A1A';
    rr(0, -s * 0.22, s * 1.5, s * 0.44, s * 0.14); ctx.fill();
    ctx.fillStyle = '#C8A060';
    rr(s * 1.1, -s * 0.28, s * 0.35, s * 0.56, s * 0.1); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#C8A060';
    circle(x, y - s * 0.25, s * 0.55); ctx.fill();
    ctx.fillStyle = '#5A4A30';
    circle(x, y - s * 0.25, s * 0.30); ctx.fill();
    ctx.fillStyle = f.fireT < 0.4 ? '#FF5A5A' : '#3A6A4A';
    circle(x - s * 0.8, y + s * 0.45, s * 0.16); ctx.fill();

  } else if (f.kind === 'DIVE') {
    // ★ まわりこんで くる「ガ」。はねが はばたく
    const fl = Math.sin(t * 16);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(200,106,224,0.55)';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.6, sg * s * (1.5 + fl * 0.5), s * 0.5, sg * s * (1.1 + fl * 0.4));
      ctx.quadraticCurveTo(s * 0.3, sg * s * 0.3, 0, 0);
      ctx.fill();
    }
    ctx.fillStyle = hurt ? '#FFAAAA' : '#C86AE0';
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.lineTo(s * 0.3, -s * 0.55);
    ctx.lineTo(s * 1.1, 0);
    ctx.lineTo(s * 0.3, s * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFE066';
    circle(s * 0.2, 0, s * 0.30 + Math.sin(t * 10) * s * 0.06); ctx.fill();
    ctx.fillStyle = '#2A1030';
    circle(s * 0.2, 0, s * 0.13); ctx.fill();
    // エンジンの ほのお
    ctx.fillStyle = 'rgba(255,150,90,0.7)';
    ctx.beginPath();
    ctx.moveTo(-s * 1.05, -s * 0.2);
    ctx.lineTo(-s * (1.5 + Math.random() * 0.5), 0);
    ctx.lineTo(-s * 1.05, s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();

  } else {
    // ★ むれ（へび）の こまかい 戦とうき。しっぽの ひかり・目が うごく
    const tone2 = ((Math.round(x / 46) % 3) + 3) % 3;
    const body = hurt ? '#FFAAAA' : ['#7AE8C8', '#7ACFE8', '#9AE87A'][tone2];
    ctx.save();
    ctx.translate(x, y);
    // エンジン
    ctx.fillStyle = 'rgba(120,240,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.24);
    ctx.lineTo(s * (1.3 + Math.random() * 0.5), 0);
    ctx.lineTo(s * 0.7, s * 0.24);
    ctx.closePath(); ctx.fill();
    // はね
    ctx.fillStyle = '#3A8A80';
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.2); ctx.lineTo(s * 0.9, -s * 0.95); ctx.lineTo(s * 0.9, -s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.2); ctx.lineTo(s * 0.9, s * 0.95); ctx.lineTo(s * 0.9, s * 0.2);
    ctx.closePath(); ctx.fill();
    // 本体
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-s * 1.15, 0);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.85, s * 0.9, -s * 0.42);
    ctx.lineTo(s * 0.9, s * 0.42);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.85, -s * 1.15, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath();
    ctx.moveTo(-s * 1.0, -s * 0.08);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.6, s * 0.7, -s * 0.32);
    ctx.lineTo(s * 0.7, -s * 0.12);
    ctx.fill();
    // 目
    ctx.fillStyle = '#1E5A56';
    circle(-s * 0.35, 0, s * 0.40); ctx.fill();
    ctx.fillStyle = '#EAFFFF';
    circle(-s * 0.45 + Math.sin(t * 3) * s * 0.06, -s * 0.06, s * 0.17); ctx.fill();
    ctx.fillStyle = '#12303A';
    circle(-s * 0.48 + Math.sin(t * 3) * s * 0.06, -s * 0.06, s * 0.08); ctx.fill();
    ctx.restore();
  }
}

// --- ボスの 絵 ------------------------------------------------------------------------
//
// ★ 4しゅるい あるのに ぜんぶ おなじ 絵に なって いた（これが いちばんの
//   「単調」の もと）。しゅるいごとに まったく ちがう かたちに した。
//   ・CORE … まわる わっかの コアステーション
//   ・ROCK … クレーターだらけの いわの ようさい
//   ・TWIN … 2つの ポッドが 電気で つながって いる
//   ・BOSS … つばさと 大ほうの ある 大せんかん
//   どれも 弱点の コアは 左がわ（b.x - 34）に ある。

function drawBoss(b) {
  const hurt = b.hurt > 0;
  const t = b.t;
  const main = hurt ? '#FFFFFF' : '#5A6A8A';
  const dark = hurt ? '#FFEEEE' : '#3A4A68';

  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.kind === 'CORE') {
    // まわる わっか
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(t * (i ? -0.7 : 0.9));
      ctx.strokeStyle = hurt ? '#FFF' : (i ? '#6AE0FF' : '#8A9AB8');
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 72 - i * 14, 30 - i * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = main;
    circle(0, 0, 46); ctx.fill();
    ctx.fillStyle = dark;
    circle(0, 0, 34); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = t * 0.6 + i * Math.PI / 3;
      ctx.fillStyle = '#8A9AB8';
      rr(Math.cos(a) * 40 - 6, Math.sin(a) * 40 - 6, 12, 12, 3); ctx.fill();
    }

  } else if (b.kind === 'ROCK') {
    // いわの ようさい（ごつごつ）
    ctx.fillStyle = hurt ? '#FFF' : '#7A6A5A';
    ctx.beginPath();
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2;
      const r = 58 * (0.82 + ((i * 37) % 11) / 42);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 1.12);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.12);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (const [cx2, cy2, rr2] of [[18, -26, 13], [30, 18, 10], [-6, 34, 9], [8, 6, 7]]) {
      circle(cx2, cy2, rr2); ctx.fill();
    }
    ctx.fillStyle = hurt ? '#FFF' : '#FF8A3A';   // わきでる ようがん
    for (let i = 0; i < 3; i++) {
      const a = t * 1.2 + i * 2.1;
      circle(Math.cos(a) * 34, Math.sin(a) * 30, 6 + Math.sin(t * 7 + i) * 2); ctx.fill();
    }

  } else if (b.kind === 'TWIN') {
    // 2つの ポッド＋あいだの 電気
    ctx.strokeStyle = 'rgba(140,220,255,' + (0.4 + Math.sin(t * 14) * 0.3).toFixed(2) + ')';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const yy = -40 + i * 13.3;
      ctx.lineTo(6 + Math.sin(t * 20 + i) * 9, yy);
    }
    ctx.stroke();
    for (const dy of [-40, 40]) {
      ctx.fillStyle = main;
      rr(-26, dy - 24, 62, 48, 12); ctx.fill();
      ctx.fillStyle = dark;
      rr(-14, dy - 14, 40, 28, 8); ctx.fill();
      ctx.fillStyle = hurt ? '#FFF' : '#FF9A5A';
      circle(-2, dy, 8 + Math.sin(t * 9 + dy) * 2); ctx.fill();
      // ほうだい
      ctx.fillStyle = '#8A9AB8';
      rr(-48, dy - 8, 24, 16, 4); ctx.fill();
    }

  } else {
    // 大せんかん
    ctx.fillStyle = dark;                       // つばさ
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(10, sg * 20);
      ctx.lineTo(56, sg * 78);
      ctx.lineTo(-10, sg * 74);
      ctx.lineTo(-24, sg * 26);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = main;                       // 本体
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.lineTo(-16, -58);
    ctx.lineTo(46, -44);
    ctx.lineTo(56, 0);
    ctx.lineTo(46, 44);
    ctx.lineTo(-16, 58);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    rr(-6, -34, 46, 68, 10); ctx.fill();
    // 大ほう
    ctx.fillStyle = '#8A9AB8';
    for (const dy of [-44, 44]) { rr(-58, dy - 9, 30, 18, 5); ctx.fill(); }
    // エンジン
    ctx.fillStyle = 'rgba(120,200,255,0.8)';
    for (const dy of [-18, 18]) {
      ctx.beginPath();
      ctx.moveTo(52, dy - 8);
      ctx.lineTo(52 + 22 + Math.random() * 12, dy);
      ctx.lineTo(52, dy + 8);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = hurt ? '#FFF' : '#FFD24A';
    for (let i = 0; i < 4; i++) { circle(10 + i * 10, -50 + (i % 2) * 100, 4); ctx.fill(); }
  }
  ctx.restore();

  // コア（ここを ねらう）。どの ボスも 左がわ
  const k = 0.6 + Math.sin(G.t * 8) * 0.4;
  ctx.fillStyle = 'rgba(255,120,120,' + (0.3 + k * 0.3) + ')';
  circle(b.x - 34, b.y, 34); ctx.fill();
  ctx.fillStyle = hurt ? '#FFF' : '#FF5A5A';
  circle(b.x - 34, b.y, 22); ctx.fill();
  ctx.fillStyle = '#FFD24A';
  circle(b.x - 34, b.y, 10 * k + 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  circle(b.x - 34, b.y, 26 + Math.sin(G.t * 5) * 3); ctx.stroke();

  // たいりょく
  const w = 180, x0 = VW / 2 - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(x0, HUD + 6, w, 10, 5); ctx.fill();
  ctx.fillStyle = '#FF6F8A';
  rr(x0 + 1, HUD + 7, (w - 2) * clamp(b.hp / b.maxHp, 0, 1), 8, 4); ctx.fill();
  bigText('ボス', x0 - 24, HUD + 11, 13, '#FFB0C8', null);
}

function drawMeter() {
  const p = G.ship;
  const n = POWERS.length;
  const bw = Math.min(96, (VW - 40) / n), bh = 26;
  const x0 = VW / 2 - (n * bw) / 2, y0 = VH - bh - 8;
  for (let i = 0; i < n; i++) {
    const on = p.meter === i + 1;
    const have = (POWERS[i].key === 'SPD' && p.spd > 0) ||
      (POWERS[i].key === 'MIS' && p.mis) || (POWERS[i].key === 'DBL' && p.dbl) ||
      (POWERS[i].key === 'LAS' && p.las) || (POWERS[i].key === 'OPT' && p.opt > 0) ||
      (POWERS[i].key === 'BAR' && p.bar > 0);
    ctx.fillStyle = on ? POWERS[i].col : have ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.42)';
    rr(x0 + i * bw + 1, y0, bw - 2, bh, 5); ctx.fill();
    if (on) {
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
      rr(x0 + i * bw + 1, y0, bw - 2, bh, 5); ctx.stroke();
    }
    bigText(POWERS[i].name, x0 + i * bw + bw / 2, y0 + bh / 2,
            fitSize(POWERS[i].name, bw - 8, 13), on ? '#241C34' : '#CFD8F0', null);
  }
}

function drawPlay() {
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * G.shake, (Math.random() - 0.5) * 8 * G.shake);
  const th = G.st.sky;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th[0]); g.addColorStop(1, th[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  for (const s of G.stars) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + s.z * 0.4) + ')';
    ctx.fillRect(s.x, s.y, s.z * 2, s.z * 1.4);
  }

  // カプセル
  for (const c of G.caps) {
    const k = 0.7 + Math.sin(c.t * 9) * 0.3;
    ctx.fillStyle = 'rgba(255,214,74,' + (0.3 * k) + ')';
    circle(c.x, c.y, 22); ctx.fill();
    ctx.fillStyle = '#FFD24A';
    rr(c.x - 13, c.y - 9, 26, 18, 7); ctx.fill();
    ctx.fillStyle = '#3A2A10';
    bigText('P', c.x, c.y, 15, '#3A2A10', null);
  }

  for (const f of G.foes) if (f.alive) drawFoe(f);
  if (G.boss) drawBoss(G.boss);

  // たま
  for (const s of G.shots) {
    if (s.laser) {
      ctx.fillStyle = '#FF6FA8';
      rr(s.x - 26, s.y - 2.5, 52, 5, 2.5); ctx.fill();
    } else if (s.mis) {
      ctx.fillStyle = '#FFD24A';
      rr(s.x - 6, s.y - 3, 12, 6, 3); ctx.fill();
    } else {
      ctx.fillStyle = '#DFF6FF';
      rr(s.x - 8, s.y - 2, 16, 4, 2); ctx.fill();
    }
  }
  for (const b of G.bolts) {
    ctx.fillStyle = '#FF7A5A';
    circle(b.x, b.y, 6); ctx.fill();
    ctx.fillStyle = '#FFE066';
    circle(b.x, b.y, 3); ctx.fill();
  }

  const p = G.ship;
  if (G.deadT <= 0) {
    // オプション
    for (let i = 1; i <= p.opt; i++) {
      const o = optPos(i);
      if (!o) continue;
      ctx.fillStyle = '#C8A8F0';
      circle(o.x, o.y, 8); ctx.fill();
      ctx.fillStyle = '#FFF';
      circle(o.x, o.y, 4); ctx.fill();
    }
    drawShip(p.x, p.y, 17, p.invT > 0);
    if (p.bar > 0) {
      ctx.strokeStyle = 'rgba(255,154,106,' + (0.5 + Math.sin(G.t * 8) * 0.3) + ')';
      ctx.lineWidth = 3;
      circle(p.x, p.y, 26); ctx.stroke();
      bigText(String(p.bar), p.x, p.y - 34, 13, '#FF9A6A', null);
    }
  }

  for (const q of G.parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.7);
    ctx.fillStyle = q.col;
    circle(q.x, q.y, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / 0.9);
    bigText(q.text, q.x, q.y - q.t * 30, 18, q.col);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawHud();
  drawMeter();
  drawStick();
  drawFire('パワー', '#FFD24A');

  if (G.msgT > 0) {
    ctx.globalAlpha = clamp(G.msgT * 1.2, 0, 1);
    bigText(G.msg, VW / 2, VH * 0.26, 24, '#FFF6C8');
    ctx.globalAlpha = 1;
  }

  if (G.over) {
    drawResult(G.win, G.win ? 'ステージ クリア！' : 'ゲームオーバー',
      ['スコア ' + G.score + '　たおした かず ' + G.kills,
       G.win ? G.st.name + ' を こえた！' : 'のこり 0 で おわり'],
      [{ label: 'もういちど', on: () => startStage(G.si) },
       G.win && G.si + 1 < STAGES.length
         ? { label: 'つぎの ステージ', on: () => startStage(G.si + 1), col: '#8AF0B0' }
         : { label: 'ステージを えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' },
       { label: 'えらぶ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(4,8,24,0.6)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFF6C8';
  ctx.fillText('スコア ' + G.score, 10, HUD / 2);
  ctx.fillText('のこり ' + G.lives, 130, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = '#CFD8F0';
  const p = G.ship;
  if (p) {
    let tx = 'スピード' + p.spd;
    if (p.mis) tx += '  ミサイル';
    if (p.dbl) tx += '  ダブル';
    if (p.las) tx += '  レーザー';
    if (p.opt) tx += '  オプション' + p.opt;
    if (p.bar) tx += '  バリア' + p.bar;
    ctx.fillText(tx, 210, HUD / 2);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8AE8FF';
  ctx.fillText(G.st.name + '  ' + Math.round(clamp(G.dist / G.st.len, 0, 1) * 100) + '%',
               VW - 10, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#0A1030'); g.addColorStop(1, '#2A1A5E');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  for (const s of G.stars) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + s.z * 0.4) + ')';
    ctx.fillRect(s.x, s.y, s.z * 2, s.z * 1.4);
  }
  drawShip(VW * 0.12, VH * 0.62, 20, false);
  bigText('エイトくんの', VW / 2, 32, 20, '#8AE8FF', null);
  bigText('うちゅう要塞', VW / 2, 66, fitSize('うちゅう要塞', VW * 0.4, 42), '#FFF6C8');
  bigText('カプセルを あつめて、すきな パワーを えらんで つよく なれ！',
          VW / 2, 100, fitSize('カプセルを あつめて、すきな パワーを えらんで つよく なれ！', VW * 0.86, 16),
          '#CFD8F0', null);

  const names = STAGES.map((s) => s.name);
  const clear = STAGES.map((s, i) => !!save.clear['s' + i]);
  const y = stagePicker(STAGES.length, STAGES.length, clear, names, 122, startStage, '#FFD24A');

  const sw = Math.min(160, VW * 0.19);
  drawButton(button(VW / 2 - sw - 8, y + 8, sw, 40, () => { G.screen = 'howto'; }), 'あそびかた', '#A8C8F0');
  drawButton(button(VW / 2 + 8, y + 8, sw, 40, () => { audioStart(); sfxTest(); }), '♪ おと', '#A8C8F0');
  bigText('あそんだ かず ' + save.plays + '　たおした かず ' + save.kills,
          VW / 2, VH - 14, 14, 'rgba(200,220,255,0.8)', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200,220,255,0.45)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  ctx.fillStyle = '#0A1030';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 34, 26, '#FFF6C8');
  const lines = [
    '① たまは じどうで 出る。左の スティックで よけながら すすむ',
    '② てきの「へび」を ぜんぶ たおすと カプセル（P）が 出る',
    '③ カプセルを とると 下の ベルトの 光が 1つ 右へ すすむ',
    '④ 右の「パワーアップ」を おすと、いま 光って いる ものが 手に 入る',
    '⑤ すぐ とる？ がまんして 先の つよい ものを ねらう？ ここが うでの 見せどころ',
    '⑥ オプションは じぶんの 通った 道を ついてくる。いっしょに うって くれる',
    '⑦ やられると パワーは ぜんぶ 消える。でも とちゅうから やりなおせる',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 72 + i * 28, fitSize(s, VW * 0.92, 16), '#CFD8F0', null));
  // ベルトの みほん
  const n = POWERS.length, bw = Math.min(96, (VW - 40) / n);
  const x0 = VW / 2 - (n * bw) / 2;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i === 2 ? POWERS[i].col : 'rgba(0,0,0,0.42)';
    rr(x0 + i * bw + 1, VH - 96, bw - 2, 24, 5); ctx.fill();
    bigText(POWERS[i].name, x0 + i * bw + bw / 2, VH - 84,
            fitSize(POWERS[i].name, bw - 8, 13), i === 2 ? '#241C34' : '#CFD8F0', null);
  }
  const bw2 = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw2 / 2, VH - 52, bw2, 40, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
