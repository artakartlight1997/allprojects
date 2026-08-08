// ゲームの 中身。うごく・たたく・ふっとぶ。
//
// スマブラと 同じ かんがえかた:
//   ・たいりょくでは なく **ダメージ％**。たまるほど 遠くまで ふっとぶ
//   ・画面の 外（ブラストゾーン）に 出たら 1ストック へる
//   ・のこりストックが 0 に なった ほうの まけ
//
// よこの いちは「ステージの まん中から」で かぞえる。だから 画面の 幅が
// かわっても ステージは いつも まん中で、むずかしさも 同じ。

'use strict';

const SAVE_KEY = 'smash.v1';

const save = { clear: {}, skip: {}, plays: 0 };

function loadSave() {
  try {
    const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (o.clear && typeof o.clear === 'object') save.clear = o.clear;
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
  for (let i = 0; i < STAGES.length; i++) if (save.clear['s' + i]) n++;
  return n;
}
function stageOpen(i) {
  if (i === 0) return true;
  return !!save.clear['s' + (i - 1)] || !!save.skip['s' + (i - 1)];
}

// --- かず ---------------------------------------------------------------------

const GRAV = 1900;
const FALL_MAX = 760;
const ACC_G = 2600, ACC_A = 1700, FRIC = 2400;
const KB_DRAG = 1.6;        // ふっとんでいる あいだの ブレーキ
const BLAST_X = 495;        // ここより 外へ 出たら KO
const BLAST_TOP = -230;
const BLAST_BOT = VH + 300;   // 下は 深めに。もどってくる 時間を あげる
const RESPAWN_T = 1.1;
const SPAWN_INV = 2.4;
const JUMPS = 3;              // ゆかで 1 + 空中で 2。おちても もどりやすい
const TIME_LIMIT = 90;        // びょう。時間切れは ストックの おおい ほうの かち

// こうげき。hit は「いつ あたり判定が 出るか」（びょう）
const ATK = {
  jab:   { dur: 0.30, hit: [0.05, 0.15], dmg: 5,  kb: 100, kbs: 6.4, rx: 30, ry: 26,
           ox: 24, ang: 0.52 },
  smash: { dur: 0.56, hit: [0.15, 0.30], dmg: 15, kb: 285, kbs: 13.0, rx: 46, ry: 34,
           ox: 38, ang: 0.72 },
  air:   { dur: 0.42, hit: [0.07, 0.24], dmg: 8,  kb: 160, kbs: 8.4, rx: 36, ry: 32,
           ox: 26, ang: 0.62 },
};

let failStage = -1, failStreak = 0;
function assistLevel() { return Math.min(2, Math.floor(failStreak / 2)); }

const G = {
  screen: 'title', si: 0, pending: 0,
  t: 0, VW: 800, cx: 400,
  fighters: [], shots: [], pops: [], puffs: [],
  plats: [], gim: null,
  done: false, win: false, endT: 0, timeL: TIME_LIMIT,
  shake: 0, assist: 0,
  slow: 0,               // KO の あと ちょっと スローに する
};

function mkFighter(charKey, isPlayer, stocks, aiSkill) {
  return {
    char: charKey, player: !!isPlayer, ai: aiSkill || 0,
    x: 0, y: 0, vx: 0, vy: 0, face: 1,
    onGround: false, jumps: JUMPS, dmg: 0, stocks,
    atk: null, cool: 0, hitstun: 0, inv: SPAWN_INV, respawnT: 0,
    charging: false, chargeT: 0, spCool: 0, spT: 0, spKind: '',
    dropT: 0, squash: 0, aiT: 0, aiAim: 0, dead: false,
  };
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
  G.plats = st.plats.map((p) => Object.assign({}, p, { bx: p.x, by: p.y, on: true, fall: 0 }));
  G.gim = { t: 0, phase: 'idle', warn: 0, act: 0, val: 0, bolts: [], lava: VH + 200 };
  G.shots = []; G.pops = []; G.puffs = [];
  G.done = false; G.win = false; G.endT = 0; G.shake = 0; G.slow = 0;
  G.timeL = TIME_LIMIT;

  const me = mkFighter('masaki', true, 3 + as, 0);
  me.x = -110; me.y = 100; me.face = 1;
  G.fighters = [me];
  st.foes.forEach((k, n) => {
    const f = mkFighter(k, false, Math.max(1, st.foeStocks - (as >= 2 ? 1 : 0)),
                        Math.max(0.2, st.ai - as * 0.12));
    f.x = 110 + n * 90; f.y = 100; f.face = -1;
    G.fighters.push(f);
  });
  G.screen = 'play';
  save.plays++;
  storeSave();
  bgmStart(i);
  sfxSpawn();
}

function pop(x, y, text, col, big) {
  // おなじ ころに 出た おおきい 文字は かさならない ように ずらす
  if (big) for (const q of G.pops) if (q.big && q.t < 0.6) y -= 34;
  G.pops.push({ x, y, text, col, t: 0, big: !!big });
  if (G.pops.length > 8) G.pops.shift();
}
function puff(x, y, col, n, sp) {
  for (let k = 0; k < (n || 6); k++) {
    const a = Math.random() * 6.283;
    G.puffs.push({ x, y, vx: Math.cos(a) * (sp || 150), vy: Math.sin(a) * (sp || 150),
                   t: 0, life: 0.4 + Math.random() * 0.35, col });
  }
  if (G.puffs.length > 160) G.puffs.splice(0, G.puffs.length - 160);
}

// --- あしば --------------------------------------------------------------------

function landOn(f, prevBottom) {
  // 上から おりてきた ときだけ のる（下から すりぬけられる）
  if (f.vy < 0) return;
  for (const p of G.plats) {
    if (!p.on) continue;
    if (f.x < p.x - 8 || f.x > p.x + p.w + 8) continue;
    if (prevBottom <= p.y + 2 && f.y >= p.y) {
      if (p.thru && f.dropT > 0) continue;
      f.y = p.y;
      f.vy = 0;
      if (!f.onGround) {
        f.onGround = true;
        f.jumps = JUMPS;
        f.squash = 0.35;
        puff(f.x, f.y, 'rgba(255,255,255,0.6)', 3, 60);
      }
      f.plat = p;
      return true;
    }
  }
  return false;
}

// ゆかより 下に いて、ステージからも 外に 出ている とき だけ はたらく。
// 上に むかって 帰ろうと している あいだは 落ちる 速さも ゆるめる。
function pullBack(f, dt) {
  if (f.y < 360) return;
  const half = stageHalf();
  const out = Math.abs(f.x) - half;
  if (out < -20) return;
  f.vx += (f.x > 0 ? -1 : 1) * 340 * dt;
  if (f.vy > 300) f.vy -= (f.vy - 300) * Math.min(1, dt * 2.0);
}

function overPlat(f) {
  for (const p of G.plats) {
    if (!p.on) continue;
    if (f.x >= p.x - 8 && f.x <= p.x + p.w + 8 && Math.abs(f.y - p.y) < 3) return p;
  }
  return null;
}

// --- 1 コマ -------------------------------------------------------------------

function update(dt, inp) {
  if (G.screen !== 'play') return;
  bgmPump();
  if (G.slow > 0) { G.slow -= dt; dt *= 0.45; }
  G.t += dt;
  if (G.shake > 0) G.shake -= dt;

  updateGimmick(dt);

  for (const f of G.fighters) {
    if (f.stocks <= 0) continue;
    if (f.respawnT > 0) {
      f.respawnT -= dt;
      if (f.respawnT <= 0) {
        f.x = 0; f.y = 60; f.vx = 0; f.vy = 0;
        f.dmg = 0; f.inv = SPAWN_INV; f.hitstun = 0; f.atk = null;
        f.onGround = false; f.jumps = JUMPS;
        sfxSpawn();
      }
      continue;
    }
    const c = CHARS[f.char];
    const cmd = f.player ? inp : aiThink(f, dt);
    stepFighter(f, c, cmd, dt);
  }

  updateShots(dt);

  for (const p of G.pops) p.t += dt;
  G.pops = G.pops.filter((p) => p.t < 1.5);
  for (const p of G.puffs) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vx *= 0.95;
  }
  G.puffs = G.puffs.filter((p) => p.t < p.life);

  // しょうぶ が ついたか
  if (!G.done) {
    G.timeL -= dt;
    const me = G.fighters[0];
    const foesLeft = G.fighters.slice(1).some((f) => f.stocks > 0);
    if (!foesLeft) finish(true);
    else if (me.stocks <= 0) finish(false);
    else if (G.timeL <= 0) { G.timeL = 0; finish(timeWin()); }
  } else {
    G.endT += dt;
    if (G.endT > 1.8) G.screen = G.win ? 'clear' : 'over';
  }
}

function stepFighter(f, c, cmd, dt) {
  if (f.inv > 0) f.inv -= dt;
  if (f.cool > 0) f.cool -= dt;
  if (f.spCool > 0) f.spCool -= dt;
  if (f.dropT > 0) f.dropT -= dt;
  if (f.squash > 0) f.squash = Math.max(0, f.squash - dt * 3);
  const grav = GRAV * (STAGES[G.si].gim === 'lowg' ? 0.58 : 1);

  // ふっとび中は そうさ できない
  if (f.hitstun > 0) {
    f.hitstun -= dt;
    f.vx *= Math.exp(-KB_DRAG * dt);
    f.vy = Math.min(FALL_MAX, f.vy + grav * 0.8 * dt);
  } else {
    // よこ
    const acc = f.onGround ? ACC_G : ACC_A;
    const spd = c.spd * (f.onGround ? 1 : 0.92);
    if (f.atk && f.onGround) {
      // こうげき中は 足が とまる
      f.vx -= Math.sign(f.vx) * Math.min(Math.abs(f.vx), FRIC * dt);
    } else if (cmd.mx) {
      f.vx += cmd.mx * acc * dt;
      f.vx = Math.max(-spd, Math.min(spd, f.vx));
      if (!f.atk) f.face = cmd.mx > 0 ? 1 : -1;
    } else if (f.onGround) {
      f.vx -= Math.sign(f.vx) * Math.min(Math.abs(f.vx), FRIC * dt);
    }
    // ジャンプ
    if (cmd.jump && f.jumps > 0 && !f.spT) {
      f.vy = -(f.jumps === JUMPS ? c.jump : c.jump * 0.92);
      f.jumps--;
      f.onGround = false;
      f.squash = -0.3;
      sfxJump();
    }
    // すりぬけて おりる
    if (cmd.down && f.onGround && f.plat && f.plat.thru) {
      f.dropT = 0.22; f.onGround = false; f.y += 3;
    }
    // 早く おちる
    if (cmd.down && !f.onGround && f.vy > 0) f.vy = Math.max(f.vy, 620);
    f.vy = Math.min(FALL_MAX, f.vy + grav * dt);
  }

  // かぜ・ベルト の しかけ
  applyGimForce(f, dt);

  // ステージの 下に 落ちたら、まん中へ そっと ひっぱる。
  // ここが ないと「もどれずに 落ちる」だけで まけて つまらない。
  pullBack(f, dt);

  // こうげき
  stepAttack(f, c, cmd, dt);

  // ひっさつ
  stepSpecial(f, c, cmd, dt);

  // うごかす
  const prevBottom = f.y;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  if (f.onGround) {
    const p = overPlat(f);
    if (!p) f.onGround = false; else f.plat = p;
  }
  if (!f.onGround) landOn(f, prevBottom);

  // ブラストゾーン
  if (Math.abs(f.x) > BLAST_X || f.y > BLAST_BOT || f.y < BLAST_TOP) koFighter(f);
}

// --- こうげき ------------------------------------------------------------------

function stepAttack(f, c, cmd, dt) {
  if (f.atk) {
    const a = f.atk;
    const A2 = ATK[a.kind];
    a.t += dt;
    if (a.t >= A2.hit[0] && a.t <= A2.hit[1] && !a.done) {
      hitScan(f, a);
    }
    if (a.t >= A2.dur) f.atk = null;
    return;
  }
  if (f.hitstun > 0 || f.cool > 0 || f.spT > 0) return;

  // ためる（スマッシュ）
  if (cmd.atkHold && f.onGround) {
    f.charging = true;
    f.chargeT = Math.min(1.0, f.chargeT + dt);
    if (Math.floor(f.chargeT * 8) !== Math.floor((f.chargeT - dt) * 8)) {
      sfxCharge(Math.floor(f.chargeT * 8));
      puff(f.x, f.y - 30, '#FFD166', 2, 60);
    }
    return;
  }
  if (f.charging && !cmd.atkHold) {
    // はなした → ためた ぶん つよい スマッシュ
    const ch = f.chargeT;
    f.charging = false; f.chargeT = 0;
    if (ch > 0.16) {
      startAttack(f, 'smash', 1 + ch * 0.85);
      return;
    }
    startAttack(f, f.onGround ? 'jab' : 'air', 1);
    return;
  }
  if (cmd.atk) startAttack(f, f.onGround ? 'jab' : 'air', 1);
}

function startAttack(f, kind, mul) {
  f.atk = { kind, t: 0, mul, done: false, hit: [] };
  f.cool = ATK[kind].dur + 0.10;
  if (kind === 'smash') { sfxSmash(); G.shake = Math.max(G.shake, 0.14); }
  else sfxJab();
}

function hitScan(f, a) {
  const A2 = ATK[a.kind];
  const c = CHARS[f.char];
  const hx = f.x + f.face * A2.ox;
  const hy = f.y - charH(c) * 0.5;
  for (const o of G.fighters) {
    if (o === f || o.stocks <= 0 || o.respawnT > 0 || o.inv > 0) continue;
    if (a.hit.indexOf(o) >= 0) continue;
    const oy = o.y - charH(CHARS[o.char]) * 0.5;
    if (Math.abs(o.x - hx) > A2.rx + charW(CHARS[o.char]) * 0.5) continue;
    if (Math.abs(oy - hy) > A2.ry + charH(CHARS[o.char]) * 0.4) continue;
    a.hit.push(o);
    const mul = a.mul * c.atk;
    applyHit(o, f, A2.dmg * mul, (A2.kb + o.dmg * A2.kbs) * mul, A2.ang, f.face);
  }
}

// dmgAdd … ふえる ％  kb … ふっとぶ 強さ  ang … 角度（ラジアン、上むき）
function applyHit(o, from, dmgAdd, kb, ang, dir) {
  const w = CHARS[o.char].weight;
  o.dmg += dmgAdd;
  const k = kb / w;
  o.vx = Math.cos(ang) * k * dir;
  o.vy = -Math.sin(ang) * k;
  // ふっとび中は うごけない。ながすぎると「なにも できずに 落ちて まけ」に
  // なって つまらないので、みじかめに する。
  o.hitstun = Math.min(0.50, 0.08 + k * 0.00035);
  o.inv = 0.02;
  o.atk = null; o.charging = false; o.chargeT = 0; o.spT = 0;
  o.onGround = false;
  const big = k > 520;
  G.shake = Math.max(G.shake, big ? 0.26 : 0.10);
  if (big) G.slow = 0.16;
  puff(o.x, o.y - 24, big ? '#FFD166' : '#FFFFFF', big ? 12 : 6, big ? 240 : 130);
  pop(o.x, o.y - 52, Math.round(o.dmg) + '%', big ? '#FFD166' : '#FFFFFF', big);
  sfxHit(big);
}

function koFighter(f) {
  f.stocks--;
  f.dead = f.stocks <= 0;
  f.respawnT = f.dead ? 99 : RESPAWN_T;
  f.vx = 0; f.vy = 0; f.atk = null; f.hitstun = 0;
  G.shake = Math.max(G.shake, 0.3);
  G.slow = 0.2;
  puff(Math.max(-BLAST_X, Math.min(BLAST_X, f.x)),
       Math.max(0, Math.min(VH, f.y)), '#FFE066', 18, 300);
  pop(Math.max(-330, Math.min(330, f.x)), Math.max(76, Math.min(VH - 160, f.y)),
      CHARS[f.char].name + ' を ふっとばした！', '#FFD166', true);
  sfxKO();
}

// --- ひっさつ ------------------------------------------------------------------

function stepSpecial(f, c, cmd, dt) {
  if (f.spT > 0) {
    f.spT -= dt;
    if (f.spKind === 'dash') {
      f.vx = f.face * 620;
      spHitScan(f, 40, 8 * c.atk, 190, 0.55);
    } else if (f.spKind === 'beam') {
      if (f.spT < 0.36) spHitScan(f, 160, 14 * c.atk, 240, 0.42, 0.02);
    } else if (f.spKind === 'bomb') {
      f.vy = 900;
      if (f.onGround) {
        f.spT = 0;
        G.shake = Math.max(G.shake, 0.25);
        puff(f.x, f.y, '#E8A050', 14, 220);
        for (const o of G.fighters) {
          if (o === f || o.stocks <= 0 || o.respawnT > 0 || o.inv > 0) continue;
          if (Math.abs(o.x - f.x) < 84 && Math.abs(o.y - f.y) < 70) {
            applyHit(o, f, 12 * c.atk, (215 + o.dmg * 6.8), 1.0, Math.sign(o.x - f.x) || 1);
          }
        }
        sfxSmash();
      }
    }
    return;
  }
  if (!cmd.sp || f.spCool > 0 || f.hitstun > 0 || f.atk) return;
  f.spCool = 1.5;
  const up = cmd.my < -0.4;
  // 上を おしながら なら かならず「ふっかつジャンプ」
  if (up || c.sp === 'up') {
    f.vy = -(c.jump * 1.55);
    f.jumps = Math.max(f.jumps, 1);
    f.onGround = false;
    f.spKind = ''; f.spT = 0;
    puff(f.x, f.y, '#A8E0FF', 8, 170);
    sfxJump();
    spHitScan(f, 26, 6 * c.atk, 150, 1.1);
    return;
  }
  f.spKind = c.sp;
  if (c.sp === 'shot') {
    shoot(f, f.face * (c.shotFast ? 560 : 430), 0, 5 * c.atk, 130, '#8FD6FF');
    f.spT = 0; sfxShot();
  } else if (c.sp === 'dash') {
    f.spT = 0.32; sfxSmash();
  } else if (c.sp === 'bomb') {
    if (f.onGround) { f.vy = -420; f.onGround = false; }
    f.spT = 1.2; sfxJump();
  } else if (c.sp === 'tele') {
    const o = nearestFoe(f);
    if (o) { f.x = o.x - Math.sign(o.x - f.x) * 60; f.face = Math.sign(o.x - f.x) || 1; }
    f.spT = 0;
    puff(f.x, f.y - 20, '#B0A0FF', 10, 190);
    sfxShot();
  } else if (c.sp === 'beam') {
    f.spT = 0.72; sfxCharge(6);
  } else if (c.sp === 'magic') {
    for (const a of [-0.42, 0, 0.42]) {
      shoot(f, f.face * Math.cos(a) * 380, Math.sin(a) * 380, 5 * c.atk, 130, '#C89CFF');
    }
    f.spT = 0; sfxShot();
  } else if (c.sp === 'clone') {
    shoot(f, f.face * 470, -40, 6 * c.atk, 140, '#5A5A78');
    shoot(f, f.face * 470, 40, 6 * c.atk, 140, '#5A5A78');
    f.spT = 0; sfxShot();
  } else {
    f.spT = 0;
  }
}

// ひっさつの あたり判定（じぶんの 前）
function spHitScan(f, reach, dmg, kb, ang, rate) {
  const c = CHARS[f.char];
  const hx = f.x + f.face * (reach * 0.6);
  const hy = f.y - charH(c) * 0.5;
  for (const o of G.fighters) {
    if (o === f || o.stocks <= 0 || o.respawnT > 0 || o.inv > 0) continue;
    if (Math.abs(o.x - hx) > reach) continue;
    if (Math.abs((o.y - charH(CHARS[o.char]) * 0.5) - hy) > 44) continue;
    applyHit(o, f, dmg, kb + o.dmg * 7.5, ang, f.face);
  }
}

function shoot(f, vx, vy, dmg, kb, col) {
  const c = CHARS[f.char];
  G.shots.push({ x: f.x + f.face * 22, y: f.y - charH(c) * 0.55, vx, vy,
                 dmg, kb, col, r: 10, from: f, t: 0 });
}

function updateShots(dt) {
  for (const s of G.shots) {
    s.t += dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    for (const o of G.fighters) {
      if (o === s.from || o.stocks <= 0 || o.respawnT > 0 || o.inv > 0) continue;
      if (Math.abs(o.x - s.x) > 22 + charW(CHARS[o.char]) * 0.5) continue;
      if (Math.abs((o.y - charH(CHARS[o.char]) * 0.5) - s.y) > 30) continue;
      applyHit(o, s.from, s.dmg, s.kb + o.dmg * 5.2, 0.5, Math.sign(s.vx) || 1);
      s.dead = 1;
      puff(s.x, s.y, s.col, 5, 120);
      break;
    }
  }
  G.shots = G.shots.filter((s) => !s.dead && s.t < 2.4 && Math.abs(s.x) < BLAST_X + 60);
}

function nearestFoe(f) {
  let best = null, bd = 1e9;
  for (const o of G.fighters) {
    if (o === f || o.stocks <= 0 || o.respawnT > 0) continue;
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// --- しかけ（ギミック）----------------------------------------------------------

function updateGimmick(dt) {
  const st = STAGES[G.si], g = G.gim;
  g.t += dt;
  const kind = st.gim;

  if (kind === 'move') {
    for (let i = 0; i < G.plats.length; i++) {
      const p = G.plats[i];
      if (!p.thru) continue;
      const nx = p.bx + Math.sin(g.t * 0.85 + i) * 95;
      const dx = nx - p.x;
      // のっている 人を いっしょに はこぶ。これが ないと あしばだけ
      // すべって いって、なにも して いないのに 落ちる。
      for (const f of G.fighters) {
        if (f.stocks > 0 && f.onGround && f.plat === p) f.x += dx;
      }
      p.x = nx;
    }
  } else if (kind === 'fall' || kind === 'king') {
    for (const p of G.plats) {
      if (!p.thru) continue;
      const stood = G.fighters.some((f) => f.stocks > 0 && f.onGround && f.plat === p);
      if (p.on && stood) p.fall += dt;
      if (!p.on) {
        p.fall -= dt;
        if (p.fall <= 0) { p.on = true; p.fall = 0; p.y = p.by; }
      } else if (p.fall > 1.2) {
        p.on = false; p.fall = 3.0;
        puff(p.x + p.w / 2, p.y, '#C0A080', 8, 150);
      }
    }
  } else if (kind === 'wind') {
    if (g.phase === 'idle' && g.t > 5.5) { g.phase = 'warn'; g.t = 0;
      g.val = Math.random() < 0.5 ? -1 : 1; sfxGimmick(); }
    else if (g.phase === 'warn' && g.t > 1.3) { g.phase = 'act'; g.t = 0; }
    else if (g.phase === 'act' && g.t > 1.8) { g.phase = 'idle'; g.t = 0; }
  } else if (kind === 'lava') {
    if (g.phase === 'idle' && g.t > 7.5) { g.phase = 'warn'; g.t = 0; sfxGimmick(); }
    else if (g.phase === 'warn' && g.t > 1.4) { g.phase = 'act'; g.t = 0; }
    else if (g.phase === 'act' && g.t > 2.6) { g.phase = 'idle'; g.t = 0; }
    // ゆかの 上まで 来る。だから 上の あしばへ にげる ひつようが ある。
    const tgt = g.phase === 'act' ? VH - 172 : VH + 200;
    g.lava += (tgt - g.lava) * Math.min(1, dt * 3.2);
    if (g.phase === 'act') {
      for (const f of G.fighters) {
        if (f.stocks <= 0 || f.respawnT > 0 || f.inv > 0) continue;
        if (f.y > g.lava) gimHit(f, 12, 330 + f.dmg * 8, 1.35);
      }
    }
  } else if (kind === 'elec') {
    if (g.phase === 'idle' && g.t > 4.0) { g.phase = 'warn'; g.t = 0; g.val = (Math.random() * 3) | 0; }
    else if (g.phase === 'warn' && g.t > 1.0) { g.phase = 'act'; g.t = 0; sfxGimmick(); }
    else if (g.phase === 'act' && g.t > 1.1) { g.phase = 'idle'; g.t = 0; }
    if (g.phase === 'act') {
      const p = G.plats.filter((q) => !q.thru)[g.val];
      if (p) for (const f of G.fighters) {
        if (f.stocks <= 0 || f.respawnT > 0 || f.inv > 0 || !f.onGround) continue;
        if (f.x > p.x - 6 && f.x < p.x + p.w + 6 && Math.abs(f.y - p.y) < 6) {
          gimHit(f, 9, 235 + f.dmg * 6.0, 1.25);
        }
      }
    }
  } else if (kind === 'belt') {
    // 5びょう ごとに 流れる むきが かわる。ひょうじも これを 見て 出す。
    if (g.phase === 'idle') { g.phase = 'act'; g.val = 1; g.t = 0; }
    else if (g.t > 3.5) { g.val = -g.val; g.t = 0; sfxGimmick(); }
  } else if (kind === 'fog') {
    if (g.phase === 'idle' && g.t > 4.5) { g.phase = 'act'; g.t = 0; }
    else if (g.phase === 'act' && g.t > 1.8) { g.phase = 'idle'; g.t = 0; }
    for (const p of G.plats) if (p.thru) p.on = g.phase !== 'act';
  }

  if (kind === 'king') {
    if (g.phase === 'idle' && g.t > 4.5) {
      g.phase = 'warn'; g.t = 0;
      g.val = (Math.random() * 2 - 1) * 300;
      sfxGimmick();
    } else if (g.phase === 'warn' && g.t > 1.1) {
      g.phase = 'act'; g.t = 0;
      G.shake = Math.max(G.shake, 0.3);
      for (const f of G.fighters) {
        if (f.stocks <= 0 || f.respawnT > 0 || f.inv > 0) continue;
        if (Math.abs(f.x - g.val) < 52) {
          gimHit(f, 14, 360 + f.dmg * 9, 1.3, Math.sign(f.x - g.val) || 1);
        }
      }
    } else if (g.phase === 'act' && g.t > 0.5) { g.phase = 'idle'; g.t = 0; }
  }
}

// しかけに あたった とき。あたった あとは しばらく むてきに して、
// 1コマごとに 何回も あたって いっきに ふきとぶ のを ふせぐ。
function gimHit(f, dmg, kb, ang, dir) {
  applyHit(f, f, dmg, kb, ang, dir || Math.sign(f.vx) || 1);
  f.inv = 0.85;
  G.shake = Math.max(G.shake, 0.16);
}

function applyGimForce(f, dt) {
  const st = STAGES[G.si], g = G.gim;
  if (st.gim === 'wind' && g.phase === 'act') {
    // つよいけど、はやさに 上限を つける。これが ないと なにも できずに
    // 画面の 外まで もっていかれる。
    f.vx += g.val * 245 * dt;
    f.vx = Math.max(-360, Math.min(360, f.vx));
  } else if (st.gim === 'belt' && f.onGround && f.plat) {
    // ながされるが、あしばの はしより 外へは おしださない。
    // 「立っていただけで 落ちた」は くやしいだけで たのしくない。
    const nx = f.x + (g.val || 1) * 78 * dt;
    if (nx > f.plat.x + 6 && nx < f.plat.x + f.plat.w - 6) f.x = nx;
  }
}

// --- コンピューター ------------------------------------------------------------

function aiThink(f, dt) {
  f.aiT -= dt;
  const o = G.fighters[0].stocks > 0 ? G.fighters[0] : null;
  const cmd = { mx: 0, my: 0, jump: false, down: false, atk: false, atkHold: false, sp: false };
  if (!o || o.respawnT > 0) { f.aiCmd = cmd; return cmd; }

  if (f.aiT > 0 && f.aiCmd) {
    // 「おしっぱなし」の ものは そのまま つづける
    const c2 = Object.assign({}, f.aiCmd);
    c2.jump = false; c2.atk = false; c2.sp = false;
    return c2;
  }
  f.aiT = 0.16 - f.ai * 0.07;

  const dx = o.x - f.x, dy = o.y - f.y;
  const adx = Math.abs(dx);
  const half = stageHalf();

  // ステージの 外なら もどる（ふっとばされた あと）
  if (Math.abs(f.x) > half + 20 || f.y > VH - 60) {
    cmd.mx = f.x > 0 ? -1 : 1;
    cmd.my = -1;
    // ジャンプは「上がっていない とき」だけ。れんだ すると 空中ジャンプを
    // ぜんぶ 使いきって、そのまま 落ちて しまう。
    if (f.y > 300 && f.vy > -60) {
      if (f.jumps > 0) cmd.jump = true;
      else if (f.spCool <= 0) cmd.sp = true;
    }
    f.aiCmd = cmd;
    return cmd;
  }

  // ちかづく
  if (adx > 46) cmd.mx = dx > 0 ? 1 : -1;
  else if (adx < 26) cmd.mx = dx > 0 ? -1 : 1;

  // 上に いたら ジャンプ
  if (dy < -46 && Math.random() < 0.3 + f.ai * 0.4) cmd.jump = true;
  // あなに 落ちない ように
  if (f.onGround && !aheadSafe(f, cmd.mx)) { cmd.jump = true; }

  // こうげき
  if (adx < 52 && Math.abs(dy) < 44) {
    const r = Math.random();
    if (r < 0.22 + f.ai * 0.35) cmd.atk = true;
    else if (r < 0.30 + f.ai * 0.42) { cmd.atkHold = true; f.aiHold = 0.5; }
  } else if (adx > 110 && adx < 420 && Math.abs(dy) < 70 && f.spCool <= 0) {
    if (Math.random() < 0.35 + f.ai * 0.45) cmd.sp = true;
  }
  // たまに よける
  if (o.atk && adx < 90 && Math.random() < f.ai * 0.5) {
    cmd.mx = dx > 0 ? -1 : 1; cmd.jump = Math.random() < 0.5;
  }
  f.aiCmd = cmd;
  return cmd;
}

// つぎの 一歩の 先に あしばが あるか
function aheadSafe(f, mx) {
  if (!mx) return true;
  const nx = f.x + mx * 34;
  for (const p of G.plats) {
    if (!p.on || p.thru) continue;
    if (nx > p.x - 4 && nx < p.x + p.w + 4 && Math.abs(f.y - p.y) < 8) return true;
  }
  return false;
}

function stageHalf() {
  let lo = 0, hi = 0;
  for (const p of G.plats) {
    if (p.thru || !p.on) continue;
    lo = Math.min(lo, p.x); hi = Math.max(hi, p.x + p.w);
  }
  return Math.max(120, Math.max(-lo, hi));
}

// --- おわり -------------------------------------------------------------------

// 時間切れの はんてい：ストックが おおい ほう。おなじなら ダメージが 少ない ほう。
function timeWin() {
  const me = G.fighters[0];
  const foes = G.fighters.slice(1).filter((f) => f.stocks > 0);
  const fs = foes.reduce((a, f) => a + f.stocks, 0);
  if (me.stocks !== fs) return me.stocks > fs;
  const fd = foes.reduce((a, f) => Math.min(a, f.dmg), 999);
  return me.dmg <= fd;
}

function finish(win) {
  G.done = true; G.win = win; G.endT = 0;
  bgmStop();
  if (win) {
    save.clear['s' + G.si] = Math.max(save.clear['s' + G.si] || 0, G.fighters[0].stocks);
    failStreak = 0;
    G.justOpened = 0;
  } else {
    failStreak++;
    G.justOpened = 0;
    if (failStreak >= 3 && !save.skip['s' + G.si]) {
      save.skip['s' + G.si] = 1;
      G.justOpened = 1;
    }
  }
  storeSave();
  sfxEnd(win);
}
