// リナパパの ぐるぐるひこうき
//
// ★ 1982年ごろの「まわりが ぜんぶ 空。どっちへでも 飛べる」たたかいゲームが もと。
//   画面は ずっと パパの ひこうきが まん中。まわりの 空が ぐるぐる 動く。
//
// ★ そうさ（気もちよさの ために）
//     ・左がわ … スティックを たおした むきへ ゆっくり まがる（きゅうに 曲がらない）
//     ・たまは じどうで 出る。ねらう ことだけ かんがえれば よい
//     ・右がわ … どこを おしても「バリア」。まわりの たまを ぜんぶ 消す（3回）
//
// ★ おとしもの
//   パラシュートで 下りて くる 4人（りな・まさき・あおい・ゆい）を たすけると
//   てんすう。4人 たすけると のこりが 1つ ふえる。

'use strict';

const GAME_VER = 1;
const HUD = 26;

const P_SPD = 196;           // ひこうきの はやさ
const P_TURN = 5.0;          // 1びょうに 曲がれる おおきさ
const P_R = 15;
const SHOT_SPD = 430, SHOT_GAP = 0.19;
const E_SHOT = 170;
const SPAWN_R = 560;         // てきが 出て くる きょり

const STAGES = [
  { name: 'あさの空', sky: ['#7EC8F0', '#D8F0FF'], cloud: '#FFFFFF', need: 12, esp: 100, ehp: 1, boss: 18 },
  { name: 'ひるの空', sky: ['#4FA8E8', '#BFE6FA'], cloud: '#FFFFFF', need: 14, esp: 108, ehp: 1, boss: 21 },
  { name: 'ゆうやけ', sky: ['#E06A50', '#FFD08A'], cloud: '#FFE0C0', need: 16, esp: 116, ehp: 1, boss: 24 },
  { name: 'よぞら', sky: ['#16204A', '#3A4E86'], cloud: '#8898C8', need: 18, esp: 124, ehp: 2, boss: 27 },
  { name: 'あらし', sky: ['#3A4054', '#7C8598'], cloud: '#C8CEDC', need: 20, esp: 132, ehp: 2, boss: 30 },
  { name: 'オーロラ', sky: ['#0E2A3A', '#2E7A72'], cloud: '#9EE8D0', need: 22, esp: 140, ehp: 2, boss: 34 },
  { name: 'せいそう圏', sky: ['#101838', '#4A3A78'], cloud: '#B8A8E8', need: 24, esp: 148, ehp: 3, boss: 38 },
  { name: 'うちゅう', sky: ['#05060F', '#1A1440'], cloud: '#6A6A9A', need: 26, esp: 156, ehp: 3, boss: 42 },
];

const KIDS = [
  { name: 'りな', col: '#FF6FA8', hair: '#4A2B1E' },
  { name: 'まさき', col: '#4A9BFF', hair: '#241A14' },
  { name: 'あおい', col: '#48D8A0', hair: '#3A2418' },
  { name: 'ゆい', col: '#FFC63A', hair: '#503323' },
];

const SAVE_KEY = 'sky.save.v1';
const save = { open: 1, clear: {}, hi: 0, saved: 0, plays: 0 };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (typeof s.open === 'number') save.open = Math.max(1, Math.min(STAGES.length, s.open));
  if (s.clear && typeof s.clear === 'object') save.clear = s.clear;
  if (typeof s.hi === 'number') save.hi = s.hi;
  if (typeof s.saved === 'number') save.saved = s.saved;
  if (typeof s.plays === 'number') save.plays = s.plays;
} catch (e) {}
function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  screen: 'title', t: 0, stage: 0,
  me: null, foes: [], shots: [], eshots: [], kids: [], pops: [],
  kills: 0, need: 0, boss: null, bombs: 3, lives: 3, score: 0, rescued: 0,
  over: false, won: false, ready: 0, inv: 0, shotT: 0, spawnT: 0, kidT: 0, flash: 0,
  msg: '', msgT: 0,
};

// --- きほんの けいさん --------------------------------------------------------------

function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function sx(o) { return VW / 2 + (o.x - G.me.x); }
function sy(o) { return VH / 2 + (o.y - G.me.y); }
function onScreen(o, m) {
  m = m || 60;
  const x = sx(o), y = sy(o);
  return x > -m && x < VW + m && y > -m - VOY && y < VH + VOB + m;
}

function say(s) { G.msg = s; G.msgT = 1.3; }

// --- はじめる -----------------------------------------------------------------------

function startStage(n) {
  const S = STAGES[n];
  G.stage = n;
  G.me = { x: 0, y: 0, a: -Math.PI / 2, want: -Math.PI / 2 };
  G.foes = []; G.shots = []; G.eshots = []; G.kids = []; G.pops = [];
  G.kills = 0; G.need = S.need; G.boss = null;
  G.bombs = 3; G.lives = 5; G.score = 0; G.rescued = 0;
  G.over = false; G.won = false; G.ready = 1.2; G.inv = 2;
  G.shotT = 0; G.spawnT = 0.6; G.kidT = 4; G.flash = 0;
  G.screen = 'play';
  save.plays++; storeSave();
  bgmStart(n); bgmHeat(0.3);
}

// --- てき --------------------------------------------------------------------------

function spawnFoe() {
  const S = STAGES[G.stage];
  const a = Math.random() * Math.PI * 2;
  const d = SPAWN_R * (0.8 + Math.random() * 0.3);
  const x = G.me.x + Math.cos(a) * d, y = G.me.y + Math.sin(a) * d;
  G.foes.push({
    x: x, y: y, a: Math.atan2(G.me.y - y, G.me.x - x),
    sp: S.esp * (0.85 + Math.random() * 0.3),
    hp: S.ehp, cool: 2.0 + Math.random() * 2.2,
    col: ['#FF7A8A', '#C88AF0', '#FFC63A', '#7ADCB0'][Math.floor(Math.random() * 4)],
    t: Math.random() * 4, pass: 0,
  });
}
function spawnKid() {
  const a = Math.random() * Math.PI * 2;
  const d = 260 + Math.random() * 200;
  const k = Math.floor(Math.random() * KIDS.length);
  G.kids.push({ x: G.me.x + Math.cos(a) * d, y: G.me.y + Math.sin(a) * d, k: k, t: 0, life: 22 });
}
function spawnBoss() {
  const S = STAGES[G.stage];
  const a = Math.random() * Math.PI * 2;
  G.boss = {
    x: G.me.x + Math.cos(a) * 420, y: G.me.y + Math.sin(a) * 420,
    a: 0, hp: S.boss, max: S.boss, cool: 1.4, spawn: 3, t: 0, hit: 0,
  };
  say('でかいのが 来た！');
  bgmHeat(1);
  if (A.ctx) { const t = anow(); bleep(t, [48, 43, 48, 55], 0.14, 0.24, 0.18); nz(t, 0.6, 0.16, 60, 700); }
}

function boom(x, y, col, n) {
  G.pops.push({ x: x, y: y, t: 0.5, col: col, n: n || 8 });
}

function hitMe(why) {
  if (G.inv > 0 || G.over || G.won) return;
  G.lives--;
  G.inv = 2.6;
  G.flash = 0.3;
  boom(G.me.x, G.me.y, '#FFD24A', 14);
  sfxDead();
  say(why);
  if (G.lives <= 0) {
    G.over = true;
    bgmStop(); sfxOver();
    if (G.score > save.hi) save.hi = G.score;
    storeSave();
  }
}

function useBomb() {
  if (G.bombs <= 0 || G.ready > 0 || G.over || G.won) return;
  G.bombs--;
  G.flash = 0.35;
  for (const s of G.eshots) boom(s.x, s.y, '#FFF', 4);
  G.eshots.length = 0;
  for (const f of G.foes) {
    if (Math.hypot(f.x - G.me.x, f.y - G.me.y) < 300) {
      f.hp = 0; boom(f.x, f.y, f.col, 10); G.score += 100; G.kills++;
    }
  }
  G.foes = G.foes.filter((f) => f.hp > 0);
  sfxPop();
  if (A.ctx) { const t = anow(); nz(t, 0.5, 0.3, 80, 2400); bleep(t, [72, 79, 84], 0.05, 0.2, 0.14); }
}

// --- まいコマ -----------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.msgT > 0) G.msgT -= dt;
  if (G.flash > 0) G.flash -= dt;
  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t -= dt;
    if (G.pops[i].t <= 0) G.pops.splice(i, 1);
  }
  if (G.screen !== 'play' || G.over || G.won) return;
  if (G.ready > 0) { G.ready -= dt; return; }

  const S = STAGES[G.stage];
  const me = G.me;
  if (G.inv > 0) G.inv -= dt;

  // むき
  let want = null;
  if (IN.hold && Math.hypot(IN.ax, IN.ay) > 0.28) want = Math.atan2(IN.ay, IN.ax);
  const kd = keyDir();
  if (kd === 'l') want = Math.PI;
  if (kd === 'r') want = 0;
  if (kd === 'u') want = -Math.PI / 2;
  if (kd === 'd') want = Math.PI / 2;
  if (want !== null) {
    const d = angDiff(me.a, want);
    me.a += clamp(d, -P_TURN * dt, P_TURN * dt);
  }
  me.x += Math.cos(me.a) * P_SPD * dt;
  me.y += Math.sin(me.a) * P_SPD * dt;

  if (IN.fireTap || (KEYS.Space && !G.ks)) useBomb();
  G.ks = KEYS.Space;

  // たまは じどう
  G.shotT -= dt;
  if (G.shotT <= 0) {
    G.shotT = SHOT_GAP;
    G.shots.push({ x: me.x + Math.cos(me.a) * 18, y: me.y + Math.sin(me.a) * 18, a: me.a, t: 1.5 });
    if (A.ctx) tone(anow(), 92, 0.04, 0.05, 'square', null, 78);
  }

  // てき を 出す
  if (!G.boss) {
    G.spawnT -= dt;
    const maxF = 2 + Math.floor(G.stage / 2);
    if (G.spawnT <= 0 && G.foes.length < maxF) {
      G.spawnT = 1.8 - Math.min(0.7, G.stage * 0.08);
      spawnFoe();
    }
  } else {
    G.boss.spawn -= dt;
    if (G.boss.spawn <= 0 && G.foes.length < 2) { G.boss.spawn = 4.5; spawnFoe(); }
  }
  G.kidT -= dt;
  if (G.kidT <= 0 && G.kids.length < 2) { G.kidT = 7 + Math.random() * 6; spawnKid(); }

  // たま
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.x += Math.cos(s.a) * SHOT_SPD * dt;
    s.y += Math.sin(s.a) * SHOT_SPD * dt;
    s.t -= dt;
    if (s.t <= 0) G.shots.splice(i, 1);
  }
  for (let i = G.eshots.length - 1; i >= 0; i--) {
    const s = G.eshots[i];
    s.x += Math.cos(s.a) * E_SHOT * dt;
    s.y += Math.sin(s.a) * E_SHOT * dt;
    s.t -= dt;
    if (s.t <= 0) { G.eshots.splice(i, 1); continue; }
    if (Math.hypot(s.x - me.x, s.y - me.y) < P_R + 5) {
      G.eshots.splice(i, 1);
      hitMe('たまに あたった！');
      if (G.over) return;
    }
  }

  // てきの 動き
  for (let i = G.foes.length - 1; i >= 0; i--) {
    const f = G.foes[i];
    f.t += dt;
    const to = Math.atan2(me.y - f.y, me.x - f.x);
    // ★ 近づいたら しばらく まっすぐ 飛びぬける。
    //   ずっと おいかけて くると「かならず ぶつかる」ので、
    //   むかしの ゲームと 同じで、すれちがってから 大まわりして もどる。
    if (f.pass > 0) f.pass -= dt;
    else f.a += clamp(angDiff(f.a, to), -1.5 * dt, 1.5 * dt);
    f.x += Math.cos(f.a) * f.sp * dt;
    f.y += Math.sin(f.a) * f.sp * dt;
    const dist = Math.hypot(f.x - me.x, f.y - me.y);
    if (dist < 110 && f.pass <= 0) f.pass = 1.3;
    if (dist > SPAWN_R * 1.8) { G.foes.splice(i, 1); continue; }
    f.cool -= dt;
    if (f.cool <= 0 && dist < 340 && Math.abs(angDiff(f.a, to)) < 0.5) {
      f.cool = 2.4 + Math.random() * 2.0;
      G.eshots.push({ x: f.x, y: f.y, a: to, t: 3 });
      if (A.ctx) tone(anow(), 64, 0.06, 0.05, 'square', null, 52);
    }
    if (dist < P_R + 9) {
      f.hp = 0; boom(f.x, f.y, f.col, 10);
      G.foes.splice(i, 1);
      hitMe('ぶつかった！');
      if (G.over) return;
      continue;
    }
    // こちらの たま
    for (let k = G.shots.length - 1; k >= 0; k--) {
      const s = G.shots[k];
      if (Math.hypot(s.x - f.x, s.y - f.y) > 21) continue;
      G.shots.splice(k, 1);
      f.hp--;
      if (f.hp <= 0) {
        boom(f.x, f.y, f.col, 10);
        G.foes.splice(i, 1);
        G.score += 100; G.kills++;
        sfxHit();
      } else if (A.ctx) tone(anow(), 70, 0.04, 0.05, 'square');
      break;
    }
  }

  // ボス
  if (!G.boss && G.kills >= G.need) spawnBoss();
  if (G.boss) {
    const b = G.boss;
    b.t += dt;
    if (b.hit > 0) b.hit -= dt;
    const to = Math.atan2(me.y - b.y, me.x - b.x);
    const dist = Math.hypot(b.x - me.x, b.y - me.y);
    b.a += clamp(angDiff(b.a, to), -1.1 * dt, 1.1 * dt);
    const sp = dist > 380 ? 70 : dist < 190 ? -55 : 10;
    b.x += Math.cos(b.a) * sp * dt;
    b.y += Math.sin(b.a) * sp * dt;
    b.cool -= dt;
    if (b.cool <= 0) {
      b.cool = 1.9;
      for (let k = -1; k <= 1; k++) {
        G.eshots.push({ x: b.x, y: b.y, a: to + k * 0.30, t: 3.4 });
      }
      if (A.ctx) { const t = anow(); tone(t, 50, 0.12, 0.08, 'square', null, 40); nz(t, 0.14, 0.10, 200, 1600); }
    }
    if (dist < P_R + 26) hitMe('ボスに ぶつかった！');
    if (G.over) return;
    for (let k = G.shots.length - 1; k >= 0; k--) {
      const s = G.shots[k];
      if (Math.hypot(s.x - b.x, s.y - b.y) > 56) continue;
      G.shots.splice(k, 1);
      b.hp--; b.hit = 0.1;
      boom(s.x, s.y, '#FFD24A', 3);
      if (A.ctx) tone(anow(), 74, 0.03, 0.05, 'square');
      if (b.hp <= 0) {
        for (let n = 0; n < 6; n++) {
          boom(b.x + (Math.random() * 2 - 1) * 40, b.y + (Math.random() * 2 - 1) * 40, '#FFD24A', 12);
        }
        G.boss = null;
        G.score += 2000 + G.lives * 300 + G.bombs * 100;
        G.won = true;
        save.clear[G.stage] = true;
        if (G.stage + 1 >= save.open) save.open = Math.min(STAGES.length, G.stage + 2);
        if (G.score > save.hi) save.hi = G.score;
        storeSave();
        bgmStop(); sfxClear(true);
        return;
      }
      break;
    }
  }

  // たすける 子
  for (let i = G.kids.length - 1; i >= 0; i--) {
    const k = G.kids[i];
    k.t += dt; k.life -= dt;
    k.y += 26 * dt;
    k.x += Math.sin(k.t * 1.4) * 14 * dt;
    if (k.life <= 0) { G.kids.splice(i, 1); continue; }
    if (Math.hypot(k.x - me.x, k.y - me.y) < P_R + 18) {
      G.kids.splice(i, 1);
      G.rescued++; save.saved++;
      G.score += 300;
      sfxGet();
      if (G.rescued % 4 === 0) { G.lives++; say('4人 たすけた！ のこりが ふえた'); sfxClear(false); }
      else say(KIDS[k.k].name + 'を たすけた！');
    }
  }
}

// --- 絵 -----------------------------------------------------------------------------

function drawSky() {
  const S = STAGES[G.stage];
  const g = ctx.createLinearGradient(0, -VOY, 0, VH + VOB);
  g.addColorStop(0, S.sky[0]); g.addColorStop(1, S.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);

  // くも（とおくと 近くで 2そう）
  for (const [step, par, alpha, sc] of [[260, 0.35, 0.35, 0.6], [190, 0.8, 0.55, 1]]) {
    const ox = G.me.x * par, oy = G.me.y * par;
    const i0 = Math.floor((ox - VW) / step), i1 = Math.floor((ox + VW) / step);
    const j0 = Math.floor((oy - VH) / step), j1 = Math.floor((oy + VH) / step);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const h = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);
        const fx = (h % 1) * step * 0.7, fy = ((h * 7) % 1) * step * 0.7;
        const wx = i * step + fx - ox + VW / 2;
        const wy = j * step + fy - oy + VH / 2;
        if (wx < -140 || wx > VW + 140 || wy < -140 || wy > VH + 140) continue;
        const r = (16 + (h * 13 % 1) * 20) * sc;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = S.cloud;
        circle(wx, wy, r); ctx.fill();
        circle(wx + r * 0.85, wy + r * 0.18, r * 0.72); ctx.fill();
        circle(wx - r * 0.8, wy + r * 0.2, r * 0.6); ctx.fill();
        circle(wx + r * 0.1, wy - r * 0.5, r * 0.62); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawPlane(x, y, a, col, s, foe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  // かげ
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(-s * 0.9 + 2, -s * 0.34 + 3, s * 1.9, s * 0.68, s * 0.3); ctx.fill();
  // つばさ
  ctx.fillStyle = foe ? '#5A4A6A' : '#3A5A88';
  rr(-s * 0.28, -s * 1.05, s * 0.56, s * 2.1, s * 0.2); ctx.fill();
  // どうたい
  ctx.fillStyle = col;
  rr(-s * 0.95, -s * 0.34, s * 1.9, s * 0.68, s * 0.32); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  rr(-s * 0.95, -s * 0.34, s * 1.9, s * 0.26, s * 0.14); ctx.fill();
  // はな
  ctx.fillStyle = '#F0E8D0';
  circle(s * 0.95, 0, s * 0.22); ctx.fill();
  // プロペラ
  ctx.strokeStyle = 'rgba(240,240,255,0.6)';
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  const pw = s * 0.6 * (0.4 + 0.6 * Math.abs(Math.sin(G.t * 40)));
  ctx.beginPath(); ctx.moveTo(s * 1.05, -pw); ctx.lineTo(s * 1.05, pw); ctx.stroke();
  // しっぽ
  ctx.fillStyle = foe ? '#5A4A6A' : '#3A5A88';
  ctx.beginPath();
  ctx.moveTo(-s * 0.95, 0); ctx.lineTo(-s * 1.35, -s * 0.5); ctx.lineTo(-s * 1.35, s * 0.5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawMeHead(x, y) {
  const s = 9;
  ctx.fillStyle = '#FFD8B8';
  circle(x, y - 2, s); ctx.fill();
  ctx.fillStyle = '#8A5A2A';
  ctx.beginPath(); ctx.arc(x, y - 3, s, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2A2A32'; ctx.lineWidth = 1.4;
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.4, y - 1, s * 0.3); ctx.stroke(); }
  ctx.fillStyle = '#2A2028';
  for (const sg of [-1, 1]) { circle(x + sg * s * 0.4, y - 1, s * 0.13); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  circle(x - s * 0.75, y + s * 0.3, s * 0.2); ctx.fill();
  circle(x + s * 0.75, y + s * 0.3, s * 0.2); ctx.fill();
}

function drawKid(x, y, k, t) {
  const K = KIDS[k];
  const sw = Math.sin(t * 1.6) * 4;
  // パラシュート
  ctx.fillStyle = K.col;
  ctx.beginPath();
  ctx.arc(x + sw, y - 30, 24, Math.PI, Math.PI * 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + sw - 22, y - 30); ctx.lineTo(x, y - 8);
  ctx.moveTo(x + sw + 22, y - 30); ctx.lineTo(x, y - 8);
  ctx.stroke();
  // 子ども
  ctx.fillStyle = K.hair;
  circle(x, y - 2, 11); ctx.fill();
  ctx.fillStyle = '#FFE0C8';
  circle(x, y, 9); ctx.fill();
  ctx.fillStyle = K.hair;
  ctx.beginPath(); ctx.arc(x, y - 1.5, 9, Math.PI * 1.04, Math.PI * 1.96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A2028';
  circle(x - 3.4, y + 1, 1.6); ctx.fill();
  circle(x + 3.4, y + 1, 1.6); ctx.fill();
  ctx.fillStyle = K.col;
  rr(x - 8, y + 8, 16, 10, 4); ctx.fill();
}

function drawBoss(b) {
  const x = sx(b), y = sy(b);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.a);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(4, 6, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = b.hit > 0 ? '#FFF' : '#6A5A8A';
  ctx.beginPath(); ctx.ellipse(0, 0, 56, 28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath(); ctx.ellipse(-6, -9, 42, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3A3050';
  rr(-24, 16, 48, 16, 7); ctx.fill();
  ctx.fillStyle = '#FFD24A';
  for (let i = -2; i <= 2; i++) { circle(i * 15, 24, 3.6); ctx.fill(); }
  ctx.fillStyle = '#E8544A';
  circle(48, 0, 9); ctx.fill();
  ctx.restore();
  // かおを 上むきに
  ctx.fillStyle = '#2A2028';
  circle(x - 12, y - 4, 5); ctx.fill();
  circle(x + 12, y - 4, 5); ctx.fill();
  ctx.fillStyle = '#FFF';
  circle(x - 13.5, y - 5.5, 1.8); ctx.fill();
  circle(x + 10.5, y - 5.5, 1.8); ctx.fill();
  // たいりょく
  const bw = 120;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(x - bw / 2, y - 48, bw, 9, 4); ctx.fill();
  ctx.fillStyle = '#FF6FA8';
  rr(x - bw / 2, y - 48, bw * clamp(b.hp / b.max, 0, 1), 9, 4); ctx.fill();
}

function drawPlay() {
  const S = STAGES[G.stage];
  drawSky();

  // たすける 子
  for (const k of G.kids) if (onScreen(k, 80)) drawKid(sx(k), sy(k), k.k, k.t);

  // てきの たま
  for (const s of G.eshots) {
    if (!onScreen(s, 20)) continue;
    ctx.fillStyle = '#FF8A5A';
    circle(sx(s), sy(s), 5.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    circle(sx(s) - 1.4, sy(s) - 1.4, 2.2); ctx.fill();
  }
  // こちらの たま
  for (const s of G.shots) {
    if (!onScreen(s, 20)) continue;
    ctx.strokeStyle = '#FFF2A0'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx(s), sy(s));
    ctx.lineTo(sx(s) - Math.cos(s.a) * 12, sy(s) - Math.sin(s.a) * 12);
    ctx.stroke();
  }

  for (const f of G.foes) if (onScreen(f, 50)) drawPlane(sx(f), sy(f), f.a, f.col, 18, true);
  if (G.boss) drawBoss(G.boss);

  // パパ
  if (G.inv <= 0 || Math.sin(G.t * 26) > 0) {
    drawPlane(VW / 2, VH / 2, G.me.a, '#E8543A', 23, false);
    drawMeHead(VW / 2, VH / 2);
  }

  for (const p of G.pops) {
    const a = clamp(p.t / 0.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    for (let k = 0; k < p.n; k++) {
      const an = k / p.n * Math.PI * 2;
      const r = (1 - a) * 44;
      circle(sx(p) + Math.cos(an) * r, sy(p) + Math.sin(an) * r, 5 * a + 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 画面の そとの てきを ふちで しらせる
  for (const f of G.foes) {
    if (onScreen(f, 20)) continue;
    const dx = f.x - G.me.x, dy = f.y - G.me.y;
    const a = Math.atan2(dy, dx);
    const rx = VW / 2 - 20, ry = VH / 2 - 20;
    const k = Math.min(rx / Math.max(1e-3, Math.abs(Math.cos(a))), ry / Math.max(1e-3, Math.abs(Math.sin(a))));
    const px = VW / 2 + Math.cos(a) * k, py = VH / 2 + Math.sin(a) * k;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = f.col;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(G.flash * 1.6, 0, 0.65) + ')';
    ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  }

  drawStick();
  drawFire('バリア' + G.bombs, '#8AD8F0');
  drawHud();

  if (G.ready > 0) bigText(S.name + '　スタート！', VW / 2, VH * 0.34, 32, '#FFF2C0');
  if (G.msgT > 0) {
    ctx.globalAlpha = Math.min(1, G.msgT * 2.2);
    bigText(G.msg, VW / 2, HUD + 34, 22, '#FFF2C0');
    ctx.globalAlpha = 1;
  }
  if (G.won) {
    const last = G.stage >= STAGES.length - 1;
    drawResult(true, last ? 'ぜんぶ クリア！' : 'クリア！',
      ['スコア ' + G.score + '　たすけた ' + G.rescued + '人',
       last ? 'うちゅうまで 行った！ すごい！' : 'つぎの 空へ'],
      last ? [{ label: 'タイトルへ', on: () => { G.screen = 'title'; } }]
           : [{ label: 'つぎへ', on: () => startStage(G.stage + 1) },
              { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
  if (G.over) {
    drawResult(false, 'ゲームオーバー',
      ['スコア ' + G.score + '　たおした ' + G.kills,
       S.name + 'で おちた'],
      [{ label: 'もういちど', on: () => startStage(G.stage) },
       { label: 'タイトルへ', on: () => { G.screen = 'title'; }, col: '#8AD8F0' }]);
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(-VW, -VOY - 4, VW * 3, HUD + VOY + 4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFD24A';
  ctx.fillText(STAGES[G.stage].name, 10, HUD / 2);
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#E8F0FF';
  ctx.fillText('スコア ' + G.score, 96, HUD / 2);
  ctx.fillText(G.boss ? 'ボスと たたかい中！' : 'あと ' + Math.max(0, G.need - G.kills) + 'たいで ボス',
               200, HUD / 2);
  ctx.textAlign = 'right';
  ctx.fillText('のこり ' + G.lives + '　たすけた ' + G.rescued, VW - 12, HUD / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}

function drawTitle() {
  G.me = G.me || { x: 0, y: 0, a: 0 };
  const S = STAGES[0];
  const g = ctx.createLinearGradient(0, -VOY, 0, VH + VOB);
  g.addColorStop(0, '#2A3A78'); g.addColorStop(1, '#8AC8F0');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('リナパパの', VW / 2, 40, 22, '#FFF2C0');
  bigText('ぐるぐるひこうき', VW / 2, 78, fitSize('ぐるぐるひこうき', VW * 0.6, 46), '#FFD24A');
  bigText('どっちへでも 飛べる 空。てきを たおして ボスを やっつけろ', VW / 2, 118, 16, '#F0F8FF', null);
  bigText('左で むきを かえる（たまは じどう）／右で バリア', VW / 2, 142, 15, '#DCE8FF', null);
  drawPlane(VW * 0.12, 120, Math.sin(G.t * 0.6) * 0.5, '#E8543A', 23, false);
  drawMeHead(VW * 0.12, 120);
  drawKid(VW * 0.88, 108, Math.floor(G.t / 2) % 4, G.t);
  const y = stagePicker(STAGES.length, save.open, save.clear, STAGES.map((s) => s.name), 168,
                        (i) => startStage(i), '#FFD24A');
  const sw = Math.min(150, VW * 0.18);
  drawButton(button(VW / 2 - sw - 8, y + 10, sw, 36, () => { G.screen = 'howto'; }), 'あそびかた', '#C8E8FF');
  drawButton(button(VW / 2 + 8, y + 10, sw, 36, () => sfxTest()), '♪ おと', '#C8E8FF');
  bigText('ハイスコア ' + save.hi + '　これまでに ' + save.saved + '人 たすけた',
          VW / 2, VH - 18, 14, '#FFF2C0', null);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText('v' + GAME_VER, 10, VH - 16);
}

function drawHowto() {
  const g = ctx.createLinearGradient(0, -VOY, 0, VH + VOB);
  g.addColorStop(0, '#2A3A78'); g.addColorStop(1, '#8AC8F0');
  ctx.fillStyle = g;
  ctx.fillRect(-VW, -VOY - 4, VW * 3, VH + VOY + VOB + 8);
  bigText('あそびかた', VW / 2, 40, 28, '#FFD24A');
  const lines = [
    '① ひこうきは いつも まん中。左の スティックで 行きたい むきに たおす',
    '② きゅうには 曲がらない。まわりこむ ように 飛ぶと あたらない',
    '③ たまは じどうで 出る。ねらう ことだけ かんがえよう',
    '④ 画面の ふちの 小さな やじるしは、そとに いる てきの ばしょ',
    '⑤ パラシュートの 子を たすけると てんすう。4人で のこりが 1つ ふえる',
  ];
  lines.forEach((s, i) => bigText(s, VW / 2, 90 + i * 34, fitSize(s, VW * 0.88, 17), '#0E1E3A', null));
  const bw = Math.min(180, VW * 0.22);
  drawButton(button(VW / 2 - bw / 2, VH - 62, bw, 42, () => { G.screen = 'title'; }), 'もどる', '#FFD24A');
}

function draw() {
  if (G.screen === 'title') drawTitle();
  else if (G.screen === 'howto') drawHowto();
  else drawPlay();
}

arcadeStart({ update: update, draw: draw, zone: 'split' });
